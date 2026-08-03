"use client";
import { defaultCategories, defaultSettings, demoCountdowns } from "./data";
import type {
  AppSettings,
  BackupFile,
  Category,
  Countdown,
  CountdownInput,
} from "./types";
import { normalizeLegacyRepeatRule } from "./recurrence";
import { incompleteStatusFor } from "./date";
import { getNextOccurrence } from "./recurrence";
import { createId } from "./id";
import { normalizeCategory, sortCategories } from "./categories";
const keys = {
  countdowns: "countdown-app.countdowns",
  categories: "countdown-app.categories",
  settings: "countdown-app.settings",
  seeded: "countdown-app.seeded",
};
const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = <T>(key: string, value: T) =>
  localStorage.setItem(key, JSON.stringify(value));
const normalizeCountdown = (value: Countdown): Countdown => ({
  ...value,
  recurrence: normalizeLegacyRepeatRule(value.repeat, value.recurrence),
});
const normalizeCountdowns = (values: Countdown[]) =>
  values.map(normalizeCountdown);
export const categoryRepository = {
  list: () => sortCategories(read(keys.categories, defaultCategories)),
  save: (item: Category) => {
    const normalized = normalizeCategory(item);
    const all = categoryRepository.list();
    write(
      keys.categories,
      all.some((x) => x.id === normalized.id)
        ? all.map((x) => (x.id === normalized.id ? normalized : x))
        : [...all, normalized],
    );
  },
  remove: (id: string) =>
    write(
      keys.categories,
      categoryRepository.list().filter((x) => x.id !== id),
    ),
};
export const countdownRepository = {
  list: () => normalizeCountdowns(read<Countdown[]>(keys.countdowns, [])),
  get: (id: string) => countdownRepository.list().find((x) => x.id === id),
  save: (input: CountdownInput, id?: string) => {
    const old = id ? countdownRepository.get(id) : undefined;
    const item: Countdown = {
      ...input,
      recurrence: normalizeLegacyRepeatRule(input.repeat, input.recurrence),
      id: old?.id ?? createId(),
      status: old?.status ?? "upcoming",
      createdAt: old?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = countdownRepository.list();
    write(
      keys.countdowns,
      old ? all.map((x) => (x.id === id ? item : x)) : [...all, item],
    );
    return item;
  },
  patch: (id: string, updates: Partial<Countdown>) => {
    const item = countdownRepository.get(id);
    if (!item) return;
    write(
      keys.countdowns,
      countdownRepository
        .list()
        .map((x) =>
          x.id === id
            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
            : x,
        ),
    );
  },
  complete: (id: string) => {
    const all = countdownRepository.list();
    const item = all.find((value) => value.id === id);
    if (!item || item.status === "completed")
      return {
        item,
        next: item?.nextOccurrenceId
          ? all.find((value) => value.id === item.nextOccurrenceId)
          : undefined,
      };
    const now = new Date().toISOString();
    let next: Countdown | undefined;
    let nextOccurrenceId = item.nextOccurrenceId;
    const nextDate = getNextOccurrence(item.dueAt, item.recurrence);
    if (item.recurrence.enabled && !nextOccurrenceId && nextDate) {
      nextOccurrenceId = createId();
      next = {
        ...item,
        id: nextOccurrenceId,
        dueAt: nextDate.toISOString(),
        status: incompleteStatusFor({ dueAt: nextDate.toISOString() }),
        completedAt: undefined,
        archivedAt: undefined,
        sourceOccurrenceId: item.id,
        seriesId: item.seriesId ?? item.id,
        nextOccurrenceId: undefined,
        createdAt: now,
        updatedAt: now,
      };
    }
    const completed: Countdown = {
      ...item,
      status: "completed",
      completedAt: now,
      nextOccurrenceId,
      updatedAt: now,
    };
    write(keys.countdowns, [
      ...all.map((value) => (value.id === id ? completed : value)),
      ...(next ? [next] : []),
    ]);
    return { item: completed, next };
  },
  undoCompletion: (id: string) => {
    const item = countdownRepository.get(id);
    if (!item) return;
    const restored = incompleteStatusFor(item);
    countdownRepository.patch(id, { status: restored, completedAt: undefined });
  },
  stopRepeating: (id: string) => {
    const item = countdownRepository.get(id);
    if (!item) return;
    const stoppedAt = new Date().toISOString();
    write(
      keys.countdowns,
      countdownRepository.list().map((value) =>
        value.id === id || value.id === item.nextOccurrenceId
          ? {
              ...value,
              recurrence: { ...value.recurrence, enabled: false },
              repeat: "never" as const,
              recurrenceStoppedAt: stoppedAt,
              updatedAt: stoppedAt,
            }
          : value,
      ),
    );
  },
  remove: (id: string) =>
    write(
      keys.countdowns,
      countdownRepository.list().filter((x) => x.id !== id),
    ),
  seed: () => {
    if (
      process.env.NODE_ENV === "development" &&
      !localStorage.getItem(keys.seeded) &&
      !countdownRepository.list().length
    ) {
      write(keys.countdowns, demoCountdowns());
      localStorage.setItem(keys.seeded, "true");
    }
  },
};
export const settingsRepository = {
  get: () => read(keys.settings, defaultSettings),
  save: (updates: Partial<AppSettings>) =>
    write(keys.settings, { ...settingsRepository.get(), ...updates }),
};
export const backupService = {
  make: (): BackupFile => ({
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    countdowns: countdownRepository.list(),
    categories: categoryRepository.list(),
    settings: settingsRepository.get(),
  }),
  valid: (value: unknown): value is BackupFile =>
    Boolean(
      value &&
      typeof value === "object" &&
      [1, 2, 3].includes((value as BackupFile).schemaVersion) &&
      Array.isArray((value as BackupFile).countdowns) &&
      Array.isArray((value as BackupFile).categories) &&
      (value as BackupFile).settings,
    ),
  restore: (data: BackupFile, mode: "merge" | "replace") => {
    const importedCountdowns = normalizeCountdowns(data.countdowns);
    if (mode === "replace") {
      write(keys.countdowns, importedCountdowns);
      write(keys.categories, sortCategories(data.categories));
    } else {
      const current = countdownRepository.list();
      write(keys.countdowns, [
        ...current.filter(
          (x) => !importedCountdowns.some((y) => y.id === x.id),
        ),
        ...importedCountdowns,
      ]);
      const cats = categoryRepository.list();
      write(keys.categories, [
        ...cats.filter((x) => !data.categories.some((y) => y.id === x.id)),
        ...data.categories.map(normalizeCategory),
      ]);
    }
    settingsRepository.save(data.settings);
  },
  clear: () => {
    localStorage.removeItem(keys.countdowns);
    localStorage.removeItem(keys.categories);
    localStorage.removeItem(keys.settings);
    localStorage.removeItem(keys.seeded);
  },
};

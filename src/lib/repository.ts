"use client";
import { defaultCategories, defaultSettings, demoCountdowns } from "./data";
import type {
  AppSettings,
  BackupFile,
  Category,
  Countdown,
  CountdownInput,
} from "./types";
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
export const categoryRepository = {
  list: () => read(keys.categories, defaultCategories),
  save: (item: Category) => {
    const all = categoryRepository.list();
    write(
      keys.categories,
      all.some((x) => x.id === item.id)
        ? all.map((x) => (x.id === item.id ? item : x))
        : [...all, item],
    );
  },
  remove: (id: string) =>
    write(
      keys.categories,
      categoryRepository.list().filter((x) => x.id !== id),
    ),
};
export const countdownRepository = {
  list: () => read<Countdown[]>(keys.countdowns, []),
  get: (id: string) => countdownRepository.list().find((x) => x.id === id),
  save: (input: CountdownInput, id?: string) => {
    const old = id ? countdownRepository.get(id) : undefined;
    const item: Countdown = {
      ...input,
      id: old?.id ?? crypto.randomUUID(),
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
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    countdowns: countdownRepository.list(),
    categories: categoryRepository.list(),
    settings: settingsRepository.get(),
  }),
  valid: (value: unknown): value is BackupFile =>
    Boolean(
      value &&
      typeof value === "object" &&
      (value as BackupFile).schemaVersion === 1 &&
      Array.isArray((value as BackupFile).countdowns) &&
      Array.isArray((value as BackupFile).categories) &&
      (value as BackupFile).settings,
    ),
  restore: (data: BackupFile, mode: "merge" | "replace") => {
    if (mode === "replace") {
      write(keys.countdowns, data.countdowns);
      write(keys.categories, data.categories);
    } else {
      const current = countdownRepository.list();
      write(keys.countdowns, [
        ...current.filter((x) => !data.countdowns.some((y) => y.id === x.id)),
        ...data.countdowns,
      ]);
      const cats = categoryRepository.list();
      write(keys.categories, [
        ...cats.filter((x) => !data.categories.some((y) => y.id === x.id)),
        ...data.categories,
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

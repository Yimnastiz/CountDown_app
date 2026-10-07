"use client";
import { defaultCategories, defaultSettings, demoCountdowns } from "./data";
import { dueDateKey, getLocalDateKey, incompleteStatusFor } from "./date";
import { createId } from "./id";
import { normalizeCategory, sortCategories } from "./categories";
import { disabledRecurrence, normalizeLegacyRepeatRule } from "./recurrence";
import { isReminderTime, normalizeReminderTime } from "./reminders";
import type {
  AppSettings,
  BackupFile,
  Category,
  Countdown,
  CountdownInput,
  RecurrenceException,
  RecurrenceExceptionStatus,
} from "./types";

const keys = {
  countdowns: "countdown-app.countdowns",
  categories: "countdown-app.categories",
  settings: "countdown-app.settings",
  seeded: "countdown-app.seeded",
};
const changeEvent = "countdown-app:changed";
type StoreKey = keyof typeof keys;

const safeStorage = () =>
  typeof localStorage === "undefined" ? undefined : localStorage;
const emit = (key: StoreKey) => {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(changeEvent, { detail: key }));
};
const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = safeStorage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = <T>(key: StoreKey, value: T) => {
  const storage = safeStorage();
  if (!storage)
    throw new Error("Local storage is unavailable in this browser.");
  storage.setItem(keys[key], JSON.stringify(value));
  emit(key);
};

export const subscribeToStorage = (listener: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (Object.values(keys).includes(event.key ?? "")) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, listener);
  };
};

const validExceptionStatus = (
  value: unknown,
): value is RecurrenceExceptionStatus =>
  value === "completed" || value === "skipped" || value === "cancelled";
const normalizeException = (
  value: unknown,
): RecurrenceException | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<RecurrenceException>;
  if (
    typeof source.occurrenceDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(source.occurrenceDate) ||
    !validExceptionStatus(source.status)
  )
    return undefined;
  return {
    occurrenceDate: source.occurrenceDate,
    occurrenceKey:
      typeof source.occurrenceKey === "string" ? source.occurrenceKey : "",
    status: source.status,
    completedAt:
      typeof source.completedAt === "string" ? source.completedAt : undefined,
    updatedAt:
      typeof source.updatedAt === "string"
        ? source.updatedAt
        : new Date().toISOString(),
  };
};
const normalizeCountdown = (value: Countdown): Countdown => {
  const recurrence = normalizeLegacyRepeatRule(value.repeat, value.recurrence);
  const exceptions = (value.recurrenceExceptions ?? [])
    .map(normalizeException)
    .filter((item): item is RecurrenceException => Boolean(item));
  const legacyCompleted =
    recurrence.enabled && value.status === "completed"
      ? [
          {
            occurrenceKey: `${value.id}:${dueDateKey(value)}`,
            occurrenceDate: dueDateKey(value),
            status: "completed" as const,
            completedAt: value.completedAt,
            updatedAt: value.updatedAt,
          },
        ]
      : [];
  return {
    ...value,
    dueDate: value.allDay ? (value.dueDate ?? dueDateKey(value)) : undefined,
    recurrence,
    recurrenceExceptions: [...exceptions, ...legacyCompleted].filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) => candidate.occurrenceDate === item.occurrenceDate,
        ) === index,
    ),
    status: recurrence.enabled ? "upcoming" : value.status,
  };
};

const normalizeCountdowns = (values: Countdown[]) => {
  const normalized = values.map(normalizeCountdown);
  const roots = normalized.filter(
    (item) => !item.sourceOccurrenceId && item.recurrence.enabled,
  );
  const rootById = new Map(roots.map((item) => [item.id, item]));
  for (const legacy of normalized.filter((item) => item.sourceOccurrenceId)) {
    const root = rootById.get(
      legacy.seriesId ?? legacy.sourceOccurrenceId ?? "",
    );
    if (root && legacy.status === "completed") {
      const occurrenceDate = dueDateKey(legacy);
      if (
        !root.recurrenceExceptions?.some(
          (item) => item.occurrenceDate === occurrenceDate,
        )
      ) {
        root.recurrenceExceptions = [
          ...(root.recurrenceExceptions ?? []),
          {
            occurrenceKey: `${root.id}:${occurrenceDate}`,
            occurrenceDate,
            status: "completed",
            completedAt: legacy.completedAt,
            updatedAt: legacy.updatedAt,
          },
        ];
      }
    }
  }
  return [
    ...roots,
    ...normalized.filter(
      (item) => !item.sourceOccurrenceId && !item.recurrence.enabled,
    ),
  ];
};

const rawCountdowns = () => read<Countdown[]>(keys.countdowns, []);
const rootFor = (id: string) => countdownRepository.get(id);
const setException = (
  series: Countdown,
  occurrenceDate: string,
  status: RecurrenceExceptionStatus,
  completedAt?: string,
) => {
  const now = new Date().toISOString();
  const exception: RecurrenceException = {
    occurrenceKey: `${series.id}:${occurrenceDate}`,
    occurrenceDate,
    status,
    completedAt,
    updatedAt: now,
  };
  return [
    ...(series.recurrenceExceptions ?? []).filter(
      (item) => item.occurrenceDate !== occurrenceDate,
    ),
    exception,
  ].sort((left, right) =>
    left.occurrenceDate.localeCompare(right.occurrenceDate),
  );
};

export const categoryRepository = {
  list: () => sortCategories(read(keys.categories, defaultCategories)),
  save: (item: Category) => {
    const normalized = normalizeCategory(item);
    const all = categoryRepository.list();
    write(
      "categories",
      all.some((item) => item.id === normalized.id)
        ? all.map((item) => (item.id === normalized.id ? normalized : item))
        : [...all, normalized],
    );
  },
  remove: (id: string) =>
    write(
      "categories",
      categoryRepository.list().filter((item) => item.id !== id),
    ),
};

export const countdownRepository = {
  list: () => normalizeCountdowns(rawCountdowns()),
  get: (id: string) =>
    countdownRepository.list().find((item) => item.id === id),
  save: (input: CountdownInput, id?: string) => {
    const old = id ? rootFor(id) : undefined;
    const all = countdownRepository.list();
    const item: Countdown = {
      ...input,
      id: old?.id ?? createId(),
      dueDate: input.allDay ? (input.dueDate ?? dueDateKey(input)) : undefined,
      recurrence: normalizeLegacyRepeatRule(input.repeat, input.recurrence),
      recurrenceExceptions:
        old?.recurrenceExceptions ?? input.recurrenceExceptions ?? [],
      status: old?.status ?? "upcoming",
      createdAt: old?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    write(
      "countdowns",
      old
        ? all.map((value) => (value.id === id ? item : value))
        : [...all, item],
    );
    return item;
  },
  patch: (id: string, updates: Partial<Countdown>) => {
    const item = rootFor(id);
    if (!item) return;
    write(
      "countdowns",
      countdownRepository
        .list()
        .map((value) =>
          value.id === id
            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
            : value,
        ),
    );
  },
  completeSingleCountdown: (id: string) => {
    const item = rootFor(id);
    if (!item) return;
    countdownRepository.patch(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  },
  undoSingleCountdown: (id: string) => {
    const item = rootFor(id);
    if (!item) return;
    countdownRepository.patch(id, {
      status: incompleteStatusFor(item),
      completedAt: undefined,
    });
  },
  completeRecurringOccurrence: (id: string, occurrenceDate: string) => {
    const item = rootFor(id);
    if (!item || !item.recurrence.enabled) return;
    countdownRepository.patch(id, {
      recurrenceExceptions: setException(
        item,
        occurrenceDate,
        "completed",
        new Date().toISOString(),
      ),
    });
  },
  undoRecurringOccurrence: (id: string, occurrenceDate: string) => {
    const item = rootFor(id);
    if (!item) return;
    countdownRepository.patch(id, {
      recurrenceExceptions: (item.recurrenceExceptions ?? []).filter(
        (exception) =>
          !(
            exception.occurrenceDate === occurrenceDate &&
            exception.status === "completed"
          ),
      ),
    });
  },
  complete: (id: string, occurrenceDate?: string) => {
    const item = rootFor(id);
    if (!item) return;
    if (item.recurrence.enabled) {
      countdownRepository.completeRecurringOccurrence(
        id,
        occurrenceDate ?? dueDateKey(item),
      );
    } else countdownRepository.completeSingleCountdown(id);
  },
  undoCompletion: (id: string, occurrenceDate?: string) => {
    const item = rootFor(id);
    if (!item) return;
    if (item.recurrence.enabled) {
      countdownRepository.undoRecurringOccurrence(
        id,
        occurrenceDate ?? dueDateKey(item),
      );
    } else countdownRepository.undoSingleCountdown(id);
  },
  stopRepeating: (id: string, occurrenceDate?: string) => {
    const item = rootFor(id);
    if (!item) return;
    countdownRepository.patch(id, {
      recurrenceStoppedAt: occurrenceDate ?? getLocalDateKey(new Date()),
    });
  },
  clearCompletedHistory: () => {
    write(
      "countdowns",
      countdownRepository
        .list()
        .filter(
          (item) =>
            item.recurrence.enabled ||
            (item.status !== "completed" && item.status !== "archived"),
        )
        .map((item) =>
          item.recurrence.enabled
            ? {
                ...item,
                recurrenceExceptions: (item.recurrenceExceptions ?? []).filter(
                  (exception) => exception.status !== "completed",
                ),
              }
            : item,
        ),
    );
  },
  remove: (id: string) =>
    write(
      "countdowns",
      countdownRepository.list().filter((item) => item.id !== id),
    ),
  seed: () => {
    const storage = safeStorage();
    if (
      process.env.NODE_ENV === "development" &&
      storage &&
      !storage.getItem(keys.seeded) &&
      !countdownRepository.list().length
    ) {
      write("countdowns", demoCountdowns());
      storage.setItem(keys.seeded, "true");
    }
  },
};

export const settingsRepository = {
  get: () => {
    const settings = {
      ...defaultSettings,
      ...read(keys.settings, defaultSettings),
    };
    return {
      ...settings,
      defaultReminderTime: normalizeReminderTime(settings.defaultReminderTime),
    };
  },
  save: (updates: Partial<AppSettings>) => {
    if (
      "defaultReminderTime" in updates &&
      !isReminderTime(updates.defaultReminderTime)
    )
      return;
    write("settings", { ...settingsRepository.get(), ...updates });
  },
};

type ValidationResult =
  { ok: true; data: BackupFile } | { ok: false; error: string };
const themes = [
  "system",
  "retro-green",
  "retro-light",
  "retro-dark",
  "pastel-pink",
  "sky-blue",
  "lavender",
];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const validDate = (value: unknown) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));
const validateBackup = (value: unknown): ValidationResult => {
  if (!isRecord(value)) return { ok: false, error: "backup must be an object" };
  if (![1, 2, 3, 4].includes(value.schemaVersion as number))
    return { ok: false, error: "schemaVersion is unsupported" };
  if (!validDate(value.exportedAt))
    return { ok: false, error: "exportedAt must be a valid timestamp" };
  if (
    !Array.isArray(value.countdowns) ||
    !Array.isArray(value.categories) ||
    !isRecord(value.settings)
  )
    return {
      ok: false,
      error: "countdowns, categories, and settings are required",
    };
  const ids = new Set<string>();
  for (let index = 0; index < value.countdowns.length; index += 1) {
    const item = value.countdowns[index];
    if (!isRecord(item) || typeof item.id !== "string" || !item.id)
      return {
        ok: false,
        error: `countdowns[${index}].id must be a non-empty string`,
      };
    if (ids.has(item.id))
      return { ok: false, error: `countdowns[${index}].id is duplicated` };
    ids.add(item.id);
    if (
      typeof item.title !== "string" ||
      typeof item.dueAt !== "string" ||
      typeof item.allDay !== "boolean"
    )
      return {
        ok: false,
        error: `countdowns[${index}] has invalid required fields`,
      };
    if (
      !Array.isArray(item.reminderDays) ||
      item.reminderDays.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 3650,
      )
    )
      return {
        ok: false,
        error: `countdowns[${index}].reminderDays is invalid`,
      };
    if (
      item.recurrence &&
      (!isRecord(item.recurrence) ||
        (item.recurrence.enabled === true &&
          (!Number.isInteger(item.recurrence.interval) ||
            (item.recurrence.interval as number) < 1 ||
            !["day", "week", "month", "year"].includes(
              item.recurrence.frequency as string,
            ))))
    ) {
      return { ok: false, error: `countdowns[${index}].recurrence is invalid` };
    }
    const recurrence = normalizeLegacyRepeatRule(
      item.repeat as Countdown["repeat"],
      item.recurrence as Partial<Countdown["recurrence"]>,
    );
    if (
      recurrence.enabled &&
      (!Number.isInteger(recurrence.interval) || recurrence.interval < 1)
    )
      return {
        ok: false,
        error: `countdowns[${index}].recurrence.interval must be at least 1`,
      };
  }
  const categoryIds = new Set<string>();
  for (let index = 0; index < value.categories.length; index += 1) {
    const item = value.categories[index];
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      typeof item.name !== "string" ||
      typeof item.color !== "string"
    )
      return { ok: false, error: `categories[${index}] is invalid` };
    if (categoryIds.has(item.id))
      return { ok: false, error: `categories[${index}].id is duplicated` };
    categoryIds.add(item.id);
  }
  const settings = value.settings;
  if (
    !themes.includes(settings.theme as string) ||
    !Array.isArray(settings.defaultReminderDays) ||
    settings.defaultReminderDays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 3650,
    ) ||
    (settings.defaultReminderTime !== undefined &&
      !isReminderTime(settings.defaultReminderTime))
  )
    return { ok: false, error: "settings is invalid" };
  return { ok: true, data: value as unknown as BackupFile };
};

export const backupService = {
  make: (): BackupFile => ({
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
    countdowns: countdownRepository.list(),
    categories: categoryRepository.list(),
    settings: settingsRepository.get(),
  }),
  validate: validateBackup,
  valid: (value: unknown): value is BackupFile => validateBackup(value).ok,
  restore: (data: BackupFile, mode: "merge" | "replace") => {
    const validated = validateBackup(data);
    if (!validated.ok) throw new Error(validated.error);
    const incoming = normalizeCountdowns(validated.data.countdowns);
    const incomingCategories = validated.data.categories.map(normalizeCategory);
    const current = {
      countdowns: rawCountdowns(),
      categories: read(keys.categories, defaultCategories),
      settings: settingsRepository.get(),
    };
    const next =
      mode === "replace"
        ? {
            countdowns: incoming,
            categories: sortCategories(incomingCategories),
            settings: { ...defaultSettings, ...validated.data.settings },
          }
        : {
            countdowns: [
              ...countdownRepository
                .list()
                .filter(
                  (item) => !incoming.some((other) => other.id === item.id),
                ),
              ...incoming,
            ],
            categories: [
              ...categoryRepository
                .list()
                .filter(
                  (item) =>
                    !incomingCategories.some((other) => other.id === item.id),
                ),
              ...incomingCategories,
            ],
            settings: {
              ...settingsRepository.get(),
              ...validated.data.settings,
            },
          };
    try {
      write("countdowns", next.countdowns);
      write("categories", next.categories);
      write("settings", next.settings);
      if (countdownRepository.list().length !== next.countdowns.length)
        throw new Error("Verification failed after import.");
    } catch (error) {
      try {
        write("countdowns", current.countdowns);
        write("categories", current.categories);
        write("settings", current.settings);
      } catch {
        // Preserve the original failure; browser storage is unavailable.
      }
      throw error;
    }
  },
  clear: () => {
    const storage = safeStorage();
    if (!storage) return;
    Object.values(keys).forEach((key) => storage.removeItem(key));
    emit("countdowns");
  },
};

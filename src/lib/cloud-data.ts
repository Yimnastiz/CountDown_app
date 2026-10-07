import { defaultSettings } from "./data";
import { normalizeCategory, sortCategories } from "./categories";
import { normalizeReminderTime } from "./reminders";
import type { AppSettings, Category, Countdown } from "./types";

export type CloudData = {
  countdowns: Countdown[];
  categories: Category[];
  settings: AppSettings;
};

type CloudCountdownRow = Record<string, unknown>;
type CloudCategoryRow = Record<string, unknown>;

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asArray = <T>(value: unknown, fallback: T[]): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

export const countdownToRow = (item: Countdown, userId: string) => ({
  user_id: userId,
  id: item.id,
  title: item.title,
  description: item.description ?? null,
  due_at: item.dueAt,
  due_date: item.dueDate ?? null,
  all_day: item.allDay,
  category_id: item.categoryId ?? null,
  reminder_days: item.reminderDays,
  repeat: item.repeat ?? null,
  recurrence: item.recurrence,
  important: item.important,
  notes: item.notes ?? null,
  status: item.status,
  completed_at: item.completedAt ?? null,
  archived_at: item.archivedAt ?? null,
  recurrence_stopped_at: item.recurrenceStoppedAt ?? null,
  recurrence_exceptions: item.recurrenceExceptions ?? [],
  created_at: item.createdAt,
  updated_at: item.updatedAt,
});

export const countdownFromRow = (row: CloudCountdownRow): Countdown => ({
  id: asString(row.id),
  title: asString(row.title),
  description:
    typeof row.description === "string" ? row.description : undefined,
  dueAt: asString(row.due_at),
  dueDate: typeof row.due_date === "string" ? row.due_date : undefined,
  allDay: row.all_day === true,
  categoryId: typeof row.category_id === "string" ? row.category_id : undefined,
  reminderDays: asArray<number>(row.reminder_days, []),
  repeat:
    typeof row.repeat === "string"
      ? (row.repeat as Countdown["repeat"])
      : undefined,
  recurrence: (row.recurrence as Countdown["recurrence"]) ?? {
    enabled: false,
    interval: 1,
    frequency: "day",
    end: { type: "never" },
  },
  important: row.important === true,
  notes: typeof row.notes === "string" ? row.notes : undefined,
  status: asString(row.status) as Countdown["status"],
  completedAt:
    typeof row.completed_at === "string" ? row.completed_at : undefined,
  archivedAt: typeof row.archived_at === "string" ? row.archived_at : undefined,
  recurrenceStoppedAt:
    typeof row.recurrence_stopped_at === "string"
      ? row.recurrence_stopped_at
      : undefined,
  recurrenceExceptions: asArray(row.recurrence_exceptions, []),
  createdAt: asString(row.created_at),
  updatedAt: asString(row.updated_at),
});

export const categoryToRow = (item: Category, userId: string) => ({
  user_id: userId,
  id: item.id,
  name: item.name,
  icon: item.icon,
  color: item.color,
  is_default: item.isDefault,
  kind: item.kind ?? null,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
});

export const categoryFromRow = (row: CloudCategoryRow): Category =>
  normalizeCategory({
    id: asString(row.id),
    name: asString(row.name),
    icon: asString(row.icon),
    color: asString(row.color),
    isDefault: row.is_default === true,
    kind:
      typeof row.kind === "string" ? (row.kind as Category["kind"]) : undefined,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  });

export const accountSettingsFromRow = (
  row: Record<string, unknown> | null,
  local: AppSettings,
): AppSettings => ({
  ...local,
  ...(row
    ? {
        defaultReminderDays: asArray<number>(
          row.default_reminder_days,
          defaultSettings.defaultReminderDays,
        ),
        defaultReminderTime: normalizeReminderTime(row.default_reminder_time),
        theme:
          typeof row.theme === "string"
            ? (row.theme as AppSettings["theme"])
            : defaultSettings.theme,
      }
    : {}),
});

export const sortCloudData = (data: CloudData): CloudData => ({
  ...data,
  countdowns: [...data.countdowns].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  ),
  categories: sortCategories(data.categories),
});

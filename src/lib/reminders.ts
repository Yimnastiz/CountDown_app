export const quickReminderDays = [0, 1];
export const reminderTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isReminderTime = (value: unknown): value is string =>
  typeof value === "string" && reminderTimePattern.test(value);
export const normalizeReminderTime = (value: unknown) =>
  isReminderTime(value) ? value : "09:00";
export const normalizeReminderDays = (days: number[]) =>
  Array.from(
    new Set(
      days.filter(
        (value) => Number.isInteger(value) && value >= 0 && value <= 3650,
      ),
    ),
  ).sort((a, b) => a - b);
export const toggleReminderDay = (days: number[], value: number) =>
  normalizeReminderDays(
    days.includes(value)
      ? days.filter((day) => day !== value)
      : [...days, value],
  );

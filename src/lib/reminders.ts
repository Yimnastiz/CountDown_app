export const quickReminderDays = [0, 1];
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

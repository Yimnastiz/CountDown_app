export const quickReminderDays = [0, 1, 3, 7, 14, 30];
export const normalizeReminderDays = (days: number[]) =>
  Array.from(
    new Set(days.filter((value) => Number.isInteger(value) && value >= 0)),
  ).sort((a, b) => a - b);
export const toggleReminderDay = (days: number[], value: number) =>
  normalizeReminderDays(
    days.includes(value)
      ? days.filter((day) => day !== value)
      : [...days, value],
  );

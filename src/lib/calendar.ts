import { isWeekend } from "date-fns";
import { isValid, parse } from "date-fns";
import type { Countdown } from "./types";
export const isWeekendDate = (date: Date) => isWeekend(date);
export function sortCalendarDayItems(items: Countdown[]): Countdown[] {
  return [...items].sort(
    (a, b) =>
      Number(b.important) - Number(a.important) ||
      Number(b.allDay) - Number(a.allDay) ||
      Number(a.status === "completed") - Number(b.status === "completed") ||
      +new Date(a.dueAt) - +new Date(b.dueAt),
  );
}
export function parseLocalDateParam(
  value: string | undefined,
  fallback: Date,
): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = parse(value, "yyyy-MM-dd", new Date(2000, 0, 1));
  return isValid(parsed) &&
    `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` ===
      value
    ? parsed
    : fallback;
}
export const monthFromSelection = (year: number, monthIndex: number) =>
  new Date(year, monthIndex, 1, 12);

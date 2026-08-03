import {
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  isSameDay,
  isToday,
  isValid,
  parse,
  parseISO,
  set,
  startOfDay,
} from "date-fns";
import type { Countdown, CountdownStatus } from "./types";

export const asDate = (value: string) => parseISO(value);

/** Parses an ISO date without the UTC interpretation of `new Date("YYYY-MM-DD")`. */
export function parseLocalDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date(2000, 0, 1));
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value
    ? parsed
    : undefined;
}

export const getLocalDateKey = (value: Date | string) =>
  format(typeof value === "string" ? parseISO(value) : value, "yyyy-MM-dd");
export const formatLocalDate = getLocalDateKey;
export const compareLocalDate = (left: string, right: string) =>
  left.localeCompare(right);

export function combineLocalDateAndTime(
  date: string,
  timeSource: string,
): Date {
  const localDate = parseLocalDate(date);
  const source = parseISO(timeSource);
  if (!localDate || !isValid(source)) return source;
  return set(localDate, {
    hours: source.getHours(),
    minutes: source.getMinutes(),
    seconds: source.getSeconds(),
    milliseconds: source.getMilliseconds(),
  });
}

export const dueDateKey = (item: Pick<Countdown, "dueAt" | "dueDate">) =>
  item.dueDate ?? getLocalDateKey(item.dueAt);
export const dateForCountdown = (item: Pick<Countdown, "dueAt" | "dueDate">) =>
  item.dueDate
    ? (parseLocalDate(item.dueDate) ?? asDate(item.dueAt))
    : asDate(item.dueAt);

export function incompleteStatusFor(
  item: Pick<Countdown, "dueAt" | "dueDate">,
): Exclude<CountdownStatus, "completed" | "archived"> {
  const date = dateForCountdown(item);
  if (isToday(date)) return "due-today";
  return date < startOfDay(new Date()) ? "overdue" : "upcoming";
}

export function statusFor(item: Countdown): CountdownStatus {
  if (item.status === "completed" || item.status === "archived") {
    return item.status;
  }
  return incompleteStatusFor(item);
}

export function timeLeft(item: Countdown) {
  const date = dateForCountdown(item);
  const days = differenceInCalendarDays(
    startOfDay(date),
    startOfDay(new Date()),
  );
  if (statusFor(item) === "overdue") return `${Math.abs(days)}d overdue`;
  if (days === 0) {
    return item.allDay
      ? "Due today"
      : formatDistanceStrict(date, new Date(), { addSuffix: true });
  }
  return `${days} days left`;
}

export const formatDue = (value: string, allDay = false, dueDate?: string) => {
  const date = dueDate
    ? (parseLocalDate(dueDate) ?? asDate(value))
    : asDate(value);
  return format(
    date,
    allDay ? "EEE, d MMM yyyy" : "EEE, d MMM yyyy 'at' HH:mm",
  );
};
export const byDue = (a: Countdown, b: Countdown) =>
  +dateForCountdown(a) - +dateForCountdown(b);
export const sameDate = (a: string, b: Date) => isSameDay(asDate(a), b);

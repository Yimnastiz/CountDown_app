import {
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import type { Countdown, CountdownStatus } from "./types";
export const asDate = (value: string) => parseISO(value);
export function incompleteStatusFor(
  item: Pick<Countdown, "dueAt">,
): Exclude<CountdownStatus, "completed" | "archived"> {
  const date = asDate(item.dueAt);
  if (isToday(date)) return "due-today";
  return date < startOfDay(new Date()) ? "overdue" : "upcoming";
}
export function statusFor(item: Countdown): CountdownStatus {
  if (item.status === "completed" || item.status === "archived")
    return item.status;
  return incompleteStatusFor(item);
}
export function timeLeft(item: Countdown) {
  const date = asDate(item.dueAt);
  const days = differenceInCalendarDays(
    startOfDay(date),
    startOfDay(new Date()),
  );
  if (statusFor(item) === "overdue") return `${Math.abs(days)}d overdue`;
  if (days === 0)
    return item.allDay
      ? "Due today"
      : formatDistanceStrict(date, new Date(), { addSuffix: true });
  if (days <= 7) return `${days} days left`;
  return `${days} days left`;
}
export const formatDue = (value: string, allDay = false) =>
  format(asDate(value), allDay ? "EEE, d MMM yyyy" : "EEE, d MMM yyyy · HH:mm");
export const byDue = (a: Countdown, b: Countdown) =>
  +asDate(a.dueAt) - +asDate(b.dueAt);
export const sameDate = (a: string, b: Date) => isSameDay(asDate(a), b);

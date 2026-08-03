import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";
import { getLocalDateKey, parseLocalDate } from "./date";
import type { RecurrenceFrequency, RecurrenceRule, RepeatType } from "./types";

export const disabledRecurrence: RecurrenceRule = {
  enabled: false,
  interval: 1,
  frequency: "day",
  end: { type: "never" },
};

export function normalizeLegacyRepeatRule(
  repeat?: RepeatType,
  rule?: Partial<RecurrenceRule>,
): RecurrenceRule {
  if (
    rule &&
    typeof rule.enabled === "boolean" &&
    ["day", "week", "month", "year"].includes(rule.frequency ?? "") &&
    Number.isInteger(rule.interval)
  ) {
    return {
      enabled: rule.enabled,
      interval: Math.max(1, Math.min(999, rule.interval ?? 1)),
      frequency: rule.frequency as RecurrenceFrequency,
      end: rule.end?.type ? rule.end : { type: "never" },
    };
  }
  const frequency: Record<
    Exclude<RepeatType, "never" | "custom">,
    RecurrenceFrequency
  > = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    yearly: "year",
  };
  if (!repeat || repeat === "never" || repeat === "custom")
    return disabledRecurrence;
  return {
    enabled: true,
    interval: 1,
    frequency: frequency[repeat],
    end: { type: "never" },
  };
}

export function validateRecurrenceRule(
  rule: RecurrenceRule,
): string | undefined {
  if (!rule.enabled) return undefined;
  if (
    !Number.isInteger(rule.interval) ||
    rule.interval < 1 ||
    rule.interval > 999
  ) {
    return "Repeat interval must be a whole number from 1 to 999.";
  }
  if (
    rule.end.type === "on-date" &&
    (!rule.end.date || !parseLocalDate(rule.end.date))
  ) {
    return "Choose a valid repeat end date.";
  }
  if (
    rule.end.type === "after-occurrences" &&
    (!Number.isInteger(rule.end.occurrences) || (rule.end.occurrences ?? 0) < 1)
  ) {
    return "Repeat occurrences must be at least 1.";
  }
  return undefined;
}

function addInterval(source: Date, rule: RecurrenceRule, amount = 1): Date {
  const interval = rule.interval * amount;
  if (rule.frequency === "day") return addDays(source, interval);
  if (rule.frequency === "week") return addWeeks(source, interval);
  if (rule.frequency === "month") return addMonths(source, interval);
  return addYears(source, interval);
}

export function getNextOccurrence(
  dueAt: string,
  rule: RecurrenceRule,
  completedOccurrences = 0,
): Date | undefined {
  if (!rule.enabled || validateRecurrenceRule(rule)) return undefined;
  if (
    rule.end.type === "after-occurrences" &&
    completedOccurrences >= (rule.end.occurrences ?? 0)
  )
    return undefined;
  const next = addInterval(parseISO(dueAt), rule);
  const end =
    rule.end.type === "on-date"
      ? parseLocalDate(rule.end.date ?? "")
      : undefined;
  return end && getLocalDateKey(next) > getLocalDateKey(end) ? undefined : next;
}

export function formatRecurrenceRule(rule: RecurrenceRule): string {
  if (!rule.enabled) return "Does not repeat";
  const unit = rule.frequency;
  return `Every ${rule.interval} ${unit}${rule.interval === 1 ? "" : "s"}`;
}

export function getOccurrenceKey(
  seriesId: string,
  occurrenceDate: string | Date,
): string {
  return `${seriesId}:${typeof occurrenceDate === "string" ? occurrenceDate : getLocalDateKey(occurrenceDate)}`;
}

function approximateStartIndex(
  start: Date,
  rangeStart: Date,
  rule: RecurrenceRule,
) {
  const difference =
    rule.frequency === "day"
      ? differenceInCalendarDays(rangeStart, start)
      : rule.frequency === "week"
        ? Math.floor(differenceInCalendarDays(rangeStart, start) / 7)
        : rule.frequency === "month"
          ? differenceInCalendarMonths(rangeStart, start)
          : differenceInCalendarYears(rangeStart, start);
  return Math.max(0, Math.floor(difference / rule.interval) - 1);
}

export function getOccurrencesInRange(
  startAt: string,
  rangeStart: Date,
  rangeEnd: Date,
  rule: RecurrenceRule,
  stoppedAt?: string,
): Date[] {
  if (
    !rule.enabled ||
    validateRecurrenceRule(rule) ||
    isAfter(rangeStart, rangeEnd)
  )
    return [];
  const start = parseISO(startAt);
  const maxResults = 500;
  let index = approximateStartIndex(start, rangeStart, rule);
  let current = addInterval(start, rule, index);
  while (index > 0 && isAfter(current, rangeStart)) {
    index -= 1;
    current = addInterval(start, rule, index);
  }
  const results: Date[] = [];
  const stoppedDate = stoppedAt ? getLocalDateKey(stoppedAt) : undefined;
  const endDate = rule.end.type === "on-date" ? rule.end.date : undefined;
  while (!isAfter(current, rangeEnd) && results.length < maxResults) {
    const currentDate = getLocalDateKey(current);
    if (endDate && currentDate > endDate) break;
    if (stoppedDate && currentDate > stoppedDate) break;
    if (
      rule.end.type === "after-occurrences" &&
      index >= (rule.end.occurrences ?? 0)
    )
      break;
    if (!isBefore(current, rangeStart)) results.push(current);
    index += 1;
    current = addInterval(start, rule, index);
  }
  return results;
}

export function getNextOccurrences(
  startAt: string,
  fromDate: Date,
  rule: RecurrenceRule,
  limit = 12,
  stoppedAt?: string,
) {
  const horizon = addYears(fromDate, 10);
  return getOccurrencesInRange(
    startAt,
    fromDate,
    horizon,
    rule,
    stoppedAt,
  ).slice(0, Math.max(0, limit));
}

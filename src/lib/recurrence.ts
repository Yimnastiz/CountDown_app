import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  isAfter,
  parseISO,
} from "date-fns";
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
    rule.frequency &&
    Number.isInteger(rule.interval)
  ) {
    return {
      enabled: rule.enabled,
      interval: Math.max(1, Math.min(999, rule.interval ?? 1)),
      frequency: rule.frequency,
      end: rule.end?.type ? rule.end : { type: "never" },
    };
  }
  const frequency: Record<
    Exclude<RepeatType, "never" | "custom">,
    RecurrenceFrequency
  > = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };
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
  )
    return "Repeat interval must be a whole number from 1 to 999.";
  if (
    rule.end.type === "on-date" &&
    (!rule.end.date || Number.isNaN(+parseISO(rule.end.date)))
  )
    return "Choose a valid repeat end date.";
  if (
    rule.end.type === "after-occurrences" &&
    (!Number.isInteger(rule.end.occurrences) || (rule.end.occurrences ?? 0) < 1)
  )
    return "Repeat occurrences must be at least 1.";
  return undefined;
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
  const source = parseISO(dueAt);
  const next =
    rule.frequency === "day"
      ? addDays(source, rule.interval)
      : rule.frequency === "week"
        ? addWeeks(source, rule.interval)
        : rule.frequency === "month"
          ? addMonths(source, rule.interval)
          : addYears(source, rule.interval);
  if (
    rule.end.type === "on-date" &&
    rule.end.date &&
    isAfter(next, parseISO(rule.end.date))
  )
    return undefined;
  return next;
}

export function formatRecurrenceRule(rule: RecurrenceRule): string {
  if (!rule.enabled) return "Does not repeat";
  const unit =
    rule.frequency === "day"
      ? "day"
      : rule.frequency === "week"
        ? "week"
        : rule.frequency === "month"
          ? "month"
          : "year";
  return `Every ${rule.interval} ${unit}${rule.interval === 1 ? "" : "s"}`;
}

import { subDays } from "date-fns";
import { dueDateKey, getLocalDateKey, parseLocalDate } from "./date";
import { occurrenceException, resolveOccurrence } from "./occurrences";
import { getOccurrenceKey, getOccurrencesInRange } from "./recurrence";
import { isReminderTime, normalizeReminderDays } from "./reminders";
import { timeInTimeZone, zonedDateTimeToDate } from "./timezone";
import type { Countdown, ReminderSchedule } from "./types";

export type ReminderScheduleInput = {
  countdowns: Countdown[];
  rangeStart: Date;
  rangeEnd: Date;
  reminderTime: string;
  timezone: string;
};

export const getReminderScheduleKey = (
  schedule: Pick<
    ReminderSchedule,
    "countdownId" | "occurrenceKey" | "reminderDaysBefore" | "scheduledFor"
  >,
) =>
  `${schedule.countdownId}:${schedule.occurrenceKey}:${schedule.reminderDaysBefore}:${schedule.scheduledFor}`;

const inRange = (date: string, start: string, end: string) =>
  date >= start && date <= end;

export function buildReminderSchedules({
  countdowns,
  rangeStart,
  rangeEnd,
  reminderTime,
  timezone,
}: ReminderScheduleInput): ReminderSchedule[] {
  if (!isReminderTime(reminderTime) || rangeStart > rangeEnd) return [];
  const start = getLocalDateKey(rangeStart);
  const end = getLocalDateKey(rangeEnd);
  const occurrences = countdowns.flatMap((countdown) => {
    if (countdown.sourceOccurrenceId) return [];
    if (!countdown.recurrence.enabled) return [countdown];
    return getOccurrencesInRange(
      countdown.dueAt,
      rangeStart,
      rangeEnd,
      countdown.recurrence,
      countdown.recurrenceStoppedAt,
    ).map((date) => resolveOccurrence(countdown, getLocalDateKey(date)));
  });
  const unique = new Map<string, ReminderSchedule>();
  for (const occurrence of occurrences) {
    const targetDate = dueDateKey(occurrence);
    const countdownId = occurrence.seriesId ?? occurrence.id;
    const series =
      countdowns.find((item) => item.id === countdownId) ?? occurrence;
    if (
      !inRange(targetDate, start, end) ||
      occurrence.status === "completed" ||
      occurrence.status === "archived" ||
      occurrenceException(series, targetDate)
    )
      continue;
    const target = parseLocalDate(targetDate);
    if (!target) continue;
    const occurrenceKey = getOccurrenceKey(countdownId, targetDate);
    for (const reminderDaysBefore of normalizeReminderDays(
      occurrence.reminderDays,
    )) {
      const reminderDate = getLocalDateKey(subDays(target, reminderDaysBefore));
      const time = occurrence.allDay
        ? reminderTime
        : timeInTimeZone(new Date(occurrence.dueAt), timezone);
      const scheduled = zonedDateTimeToDate(reminderDate, time, timezone);
      if (!scheduled) continue;
      const draft = {
        countdownId,
        occurrenceKey,
        title: occurrence.title,
        targetDate,
        reminderDaysBefore,
        scheduledFor: scheduled.toISOString(),
        timezone,
      };
      const schedule: ReminderSchedule = {
        ...draft,
        key: getReminderScheduleKey(draft),
      };
      unique.set(schedule.key, schedule);
    }
  }
  return Array.from(unique.values()).sort((left, right) =>
    left.scheduledFor.localeCompare(right.scheduledFor),
  );
}

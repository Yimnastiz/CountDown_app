import { addDays } from "date-fns";
import { buildReminderSchedules } from "./reminder-schedule";
import type { Countdown, ReminderSchedule } from "./types";

/** Jobs are replenished on sync; STEP 6 can extend this window over time. */
export const reminderJobHorizonDays = 90;

export type ReminderJobDraft = Pick<
  ReminderSchedule,
  | "key"
  | "countdownId"
  | "occurrenceKey"
  | "title"
  | "targetDate"
  | "reminderDaysBefore"
  | "scheduledFor"
  | "timezone"
> & { isRecurring: boolean };

export function buildReminderJobDrafts({
  countdowns,
  reminderTime,
  timezone,
  now = new Date(),
}: {
  countdowns: Countdown[];
  reminderTime: string;
  timezone: string;
  now?: Date;
}): ReminderJobDraft[] {
  const schedules = buildReminderSchedules({
    countdowns,
    rangeStart: now,
    rangeEnd: addDays(now, reminderJobHorizonDays),
    reminderTime,
    timezone,
  });
  return schedules
    .filter((schedule) => new Date(schedule.scheduledFor) >= now)
    .map((schedule) => ({
      ...schedule,
      isRecurring:
        countdowns.find((item) => item.id === schedule.countdownId)?.recurrence
          .enabled ?? false,
    }));
}

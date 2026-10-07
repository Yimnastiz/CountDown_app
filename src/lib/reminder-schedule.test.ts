import { describe, expect, it } from "vitest";
import {
  buildReminderSchedules,
  getReminderScheduleKey,
} from "./reminder-schedule";
import { parseLocalDate } from "./date";
import type { Countdown } from "./types";

const countdown = (overrides: Partial<Countdown> = {}): Countdown => ({
  id: "vehicle",
  title: "Vehicle tax",
  dueAt: "2026-12-10T02:00:00.000Z",
  dueDate: "2026-12-10",
  allDay: true,
  reminderDays: [0, 1],
  recurrence: {
    enabled: false,
    interval: 1,
    frequency: "day",
    end: { type: "never" },
  },
  important: false,
  status: "upcoming",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});
const schedules = (
  items: Countdown[],
  start = "2026-12-01",
  end = "2026-12-31",
) =>
  buildReminderSchedules({
    countdowns: items,
    rangeStart: new Date(`${start}T00:00:00.000Z`),
    rangeEnd: new Date(`${end}T23:59:59.999Z`),
    reminderTime: "09:00",
    timezone: "Asia/Bangkok",
  });

describe("reminder schedules", () => {
  it("builds same-day, one-day-before, multiple, and custom reminders at the all-day time", () => {
    const result = schedules([countdown({ reminderDays: [30, 7, 1, 0, 13] })]);
    expect(result.map((item) => item.scheduledFor)).toEqual([
      "2026-11-10T02:00:00.000Z",
      "2026-11-27T02:00:00.000Z",
      "2026-12-03T02:00:00.000Z",
      "2026-12-09T02:00:00.000Z",
      "2026-12-10T02:00:00.000Z",
    ]);
  });
  it("uses a deterministic idempotency key", () => {
    const [schedule] = schedules([countdown({ reminderDays: [0] })]);
    expect(schedule.key).toBe(getReminderScheduleKey(schedule));
    expect(schedules([countdown({ reminderDays: [0] })])[0].key).toBe(
      schedule.key,
    );
  });
  it("preserves the stored due-time semantics for timed countdowns", () => {
    const timed = countdown({
      allDay: false,
      dueDate: undefined,
      dueAt: "2026-12-10T15:30:00.000Z", // 22:30 in Asia/Bangkok
      reminderDays: [1],
    });
    expect(schedules([timed])[0].scheduledFor).toBe("2026-12-09T15:30:00.000Z");
  });
  it("builds bounded virtual recurring occurrences and ignores exceptions and stopped dates", () => {
    const recurring = countdown({
      id: "exercise",
      dueDate: "2026-12-01",
      dueAt: "2026-12-01T02:00:00.000Z",
      reminderDays: [0],
      recurrence: {
        enabled: true,
        interval: 2,
        frequency: "day",
        end: { type: "never" },
      },
      recurrenceExceptions: [
        {
          occurrenceKey: "exercise:2026-12-03",
          occurrenceDate: "2026-12-03",
          status: "completed",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          occurrenceKey: "exercise:2026-12-05",
          occurrenceDate: "2026-12-05",
          status: "skipped",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          occurrenceKey: "exercise:2026-12-07",
          occurrenceDate: "2026-12-07",
          status: "cancelled",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      recurrenceStoppedAt: "2026-12-09",
    });
    expect(schedules([recurring]).map((item) => item.targetDate)).toEqual([
      "2026-12-01",
      "2026-12-09",
    ]);
  });
  it("keeps date-only parsing on the stated calendar date", () => {
    expect(parseLocalDate("2026-12-10")?.getDate()).toBe(10);
  });
});

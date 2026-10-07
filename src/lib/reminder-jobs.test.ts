import { describe, expect, it } from "vitest";
import {
  buildReminderJobDrafts,
  reminderJobHorizonDays,
} from "./reminder-jobs";
import type { Countdown } from "./types";

const countdown = (overrides: Partial<Countdown> = {}): Countdown => ({
  id: "series",
  title: "Renewal",
  dueAt: "2026-01-02T02:00:00.000Z",
  dueDate: "2026-01-02",
  allDay: true,
  reminderDays: [0],
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

describe("reminder jobs", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("maps existing schedules to deterministic future job drafts", () => {
    const [job] = buildReminderJobDrafts({
      countdowns: [countdown()],
      reminderTime: "09:00",
      timezone: "Asia/Bangkok",
      now,
    });
    expect(job.key).toBe("series:series:2026-01-02:0:2026-01-02T02:00:00.000Z");
    expect(job.scheduledFor).toBe("2026-01-02T02:00:00.000Z");
  });

  it("keeps recurring jobs bounded and excludes skipped occurrences", () => {
    const jobs = buildReminderJobDrafts({
      countdowns: [
        countdown({
          recurrence: {
            enabled: true,
            interval: 1,
            frequency: "day",
            end: { type: "never" },
          },
          recurrenceExceptions: [
            {
              occurrenceKey: "series:2026-01-03",
              occurrenceDate: "2026-01-03",
              status: "skipped",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ],
      reminderTime: "09:00",
      timezone: "Asia/Bangkok",
      now,
    });
    expect(jobs.length).toBeLessThanOrEqual(reminderJobHorizonDays);
    expect(jobs.length).toBeGreaterThan(1);
    expect(jobs.some((job) => job.targetDate === "2026-01-03")).toBe(false);
  });

  it("changes keys after an edit and removes jobs while a countdown is complete", () => {
    const input = {
      reminderTime: "09:00",
      timezone: "Asia/Bangkok",
      now,
    };
    const [original] = buildReminderJobDrafts({
      ...input,
      countdowns: [countdown()],
    });
    const [edited] = buildReminderJobDrafts({
      ...input,
      countdowns: [
        countdown({
          dueAt: "2026-01-04T02:00:00.000Z",
          dueDate: "2026-01-04",
        }),
      ],
    });
    expect(edited.key).not.toBe(original.key);
    expect(
      buildReminderJobDrafts({
        ...input,
        countdowns: [countdown({ status: "completed" })],
      }),
    ).toEqual([]);
  });
});

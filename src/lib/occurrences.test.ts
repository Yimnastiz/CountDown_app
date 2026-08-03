import { describe, expect, it } from "vitest";
import {
  getCompletedHistory,
  getVirtualOccurrencesInRange,
  resolveOccurrence,
} from "./occurrences";
import type { Countdown } from "./types";

const recurring: Countdown = {
  id: "exercise",
  title: "Exercise",
  dueAt: "2026-08-03T12:00:00.000Z",
  allDay: true,
  reminderDays: [],
  recurrence: {
    enabled: true,
    interval: 2,
    frequency: "day",
    end: { type: "never" },
  },
  important: false,
  status: "upcoming",
  createdAt: "2026-08-03T12:00:00.000Z",
  updatedAt: "2026-08-03T12:00:00.000Z",
};

describe("virtual occurrences", () => {
  it("shows each requested recurring date immediately with deterministic IDs", () => {
    const occurrences = getVirtualOccurrencesInRange(
      [recurring],
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-10T23:59:59.000Z"),
    );
    expect(occurrences.map((item) => item.dueAt.slice(0, 10))).toEqual([
      "2026-08-03",
      "2026-08-05",
      "2026-08-07",
      "2026-08-09",
    ]);
    expect(occurrences.every((item) => item.isVirtualOccurrence)).toBe(true);
  });
  it("does not generate future dates after a series is stopped", () => {
    expect(
      getVirtualOccurrencesInRange(
        [{ ...recurring, recurrenceStoppedAt: "2026-08-03" }],
        new Date("2026-08-04T00:00:00.000Z"),
        new Date("2026-08-10T23:59:59.000Z"),
      ),
    ).toEqual([]);
  });
  it("completes one occurrence without affecting the next occurrence", () => {
    const series = {
      ...recurring,
      recurrenceExceptions: [
        {
          occurrenceKey: "exercise:2026-08-05",
          occurrenceDate: "2026-08-05",
          status: "completed" as const,
          completedAt: "2026-08-05T14:00:00.000Z",
          updatedAt: "2026-08-05T14:00:00.000Z",
        },
      ],
    };
    expect(resolveOccurrence(series, "2026-08-05").status).toBe("completed");
    expect(resolveOccurrence(series, "2026-08-07").status).not.toBe(
      "completed",
    );
    expect(getCompletedHistory([series])[0].id).toBe("exercise:2026-08-05");
  });
});

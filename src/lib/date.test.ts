import { describe, expect, it } from "vitest";
import { incompleteStatusFor, statusFor } from "./date";
import type { Countdown } from "./types";
const item = (
  dueAt: string,
  status: Countdown["status"] = "upcoming",
): Countdown => ({
  id: "x",
  title: "x",
  dueAt,
  allDay: true,
  reminderDays: [],
  recurrence: {
    enabled: false,
    interval: 1,
    frequency: "day",
    end: { type: "never" },
  },
  important: false,
  status,
  createdAt: dueAt,
  updatedAt: dueAt,
});
describe("status", () => {
  it("keeps completed status", () =>
    expect(statusFor(item("2030-01-01T12:00:00.000Z", "completed"))).toBe(
      "completed",
    ));
  it("returns overdue for a past incomplete item", () =>
    expect(statusFor(item("2020-01-01T12:00:00.000Z"))).toBe("overdue"));
  it("restores a completed past item to overdue", () =>
    expect(
      incompleteStatusFor(item("2020-01-01T12:00:00.000Z", "completed")),
    ).toBe("overdue"));
  it("restores a completed item due today to due-today", () =>
    expect(
      incompleteStatusFor(item(new Date().toISOString(), "completed")),
    ).toBe("due-today"));
});

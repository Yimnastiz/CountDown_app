import { describe, expect, it } from "vitest";
import {
  isWeekendDate,
  monthFromSelection,
  parseLocalDateParam,
  sortCalendarDayItems,
} from "./calendar";
import type { Countdown } from "./types";
describe("calendar weekends", () => {
  it("detects weekends from the actual date", () => {
    expect(isWeekendDate(new Date("2026-08-08T12:00:00"))).toBe(true);
    expect(isWeekendDate(new Date("2026-08-10T12:00:00"))).toBe(false);
  });
  it("sorts important and all-day items before normal timed items", () => {
    const base = (
      id: string,
      important: boolean,
      allDay: boolean,
      hour: number,
    ): Countdown => ({
      id,
      title: id,
      dueAt: new Date(2026, 7, 13, hour).toISOString(),
      allDay,
      reminderDays: [],
      recurrence: {
        enabled: false,
        interval: 1,
        frequency: "day",
        end: { type: "never" },
      },
      important,
      status: "upcoming",
      createdAt: "",
      updatedAt: "",
    });
    const sorted = sortCalendarDayItems([
      base("normal", false, false, 8),
      base("important-late", true, false, 12),
      base("important-all-day", true, true, 12),
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      "important-all-day",
      "important-late",
      "normal",
    ]);
  });
  it("parses ISO local dates without a UTC shift and rejects invalid input", () => {
    expect(
      parseLocalDateParam("2026-08-13", new Date(2020, 0, 1)).getDate(),
    ).toBe(13);
    expect(
      parseLocalDateParam("2026-02-31", new Date(2020, 0, 1)).getFullYear(),
    ).toBe(2020);
  });
  it("jumps directly to a distant month", () => {
    const date = monthFromSelection(2032, 11);
    expect([date.getFullYear(), date.getMonth()]).toEqual([2032, 11]);
  });
});

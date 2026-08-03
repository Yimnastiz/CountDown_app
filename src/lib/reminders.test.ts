import { describe, expect, it } from "vitest";
import { normalizeReminderDays, toggleReminderDay } from "./reminders";
describe("reminders", () => {
  it("sorts and removes duplicate days", () =>
    expect(normalizeReminderDays([7, 0, 7, 1])).toEqual([0, 1, 7]));
  it("toggles a selected reminder", () =>
    expect(toggleReminderDay([1, 7], 1)).toEqual([7]));
  it("adds a custom reminder in order", () =>
    expect(toggleReminderDay([1, 7], 3)).toEqual([1, 3, 7]));
});

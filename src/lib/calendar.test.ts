import { describe, expect, it } from "vitest";
import { isWeekendDate } from "./calendar";
describe("calendar weekends", () => {
  it("detects weekends from the actual date", () => {
    expect(isWeekendDate(new Date("2026-08-08T12:00:00"))).toBe(true);
    expect(isWeekendDate(new Date("2026-08-10T12:00:00"))).toBe(false);
  });
});

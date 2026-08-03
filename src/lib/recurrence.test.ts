import { describe, expect, it } from "vitest";
import {
  getNextOccurrence,
  getOccurrencesInRange,
  normalizeLegacyRepeatRule,
} from "./recurrence";
describe("recurrence", () => {
  it("moves every 2 days", () =>
    expect(
      getNextOccurrence("2026-01-10T12:00:00.000Z", {
        enabled: true,
        interval: 2,
        frequency: "day",
        end: { type: "never" },
      })?.toISOString(),
    ).toContain("2026-01-12"));
  it("moves every 6 weeks", () =>
    expect(
      getNextOccurrence("2026-01-10T12:00:00.000Z", {
        enabled: true,
        interval: 6,
        frequency: "week",
        end: { type: "never" },
      })?.toISOString(),
    ).toContain("2026-02-21"));
  it("clamps 31st when adding three months", () =>
    expect(
      getNextOccurrence("2026-01-31T12:00:00.000Z", {
        enabled: true,
        interval: 3,
        frequency: "month",
        end: { type: "never" },
      })?.toISOString(),
    ).toContain("2026-04-30"));
  it("handles leap years when adding five years", () =>
    expect(
      getNextOccurrence("2024-02-29T12:00:00.000Z", {
        enabled: true,
        interval: 5,
        frequency: "year",
        end: { type: "never" },
      })?.toISOString(),
    ).toContain("2029-02-28"));
  it("migrates legacy rules", () =>
    expect(normalizeLegacyRepeatRule("weekly")).toMatchObject({
      enabled: true,
      interval: 1,
      frequency: "week",
    }));
  it("generates only requested every-two-day occurrences", () => {
    const dates = getOccurrencesInRange(
      "2026-08-03T12:00:00.000Z",
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-08-10T23:59:59.000Z"),
      { enabled: true, interval: 2, frequency: "day", end: { type: "never" } },
    );
    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-08-03",
      "2026-08-05",
      "2026-08-07",
      "2026-08-09",
    ]);
  });
  it("crosses a year boundary without expanding storage", () => {
    const dates = getOccurrencesInRange(
      "2026-12-31T12:00:00.000Z",
      new Date("2027-01-01T00:00:00.000Z"),
      new Date("2027-01-10T23:59:59.000Z"),
      { enabled: true, interval: 3, frequency: "day", end: { type: "never" } },
    );
    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2027-01-03",
      "2027-01-06",
      "2027-01-09",
    ]);
  });
});

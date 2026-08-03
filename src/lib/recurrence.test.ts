import { describe, expect, it } from "vitest";
import { getNextOccurrence, normalizeLegacyRepeatRule } from "./recurrence";
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
});

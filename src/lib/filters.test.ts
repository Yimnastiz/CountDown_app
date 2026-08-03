import { describe, expect, it } from "vitest";
import { DEFAULT_FILTER_PANEL_OPEN, filterCountdowns } from "./filters";
import type { Countdown } from "./types";
const base = (
  id: string,
  categoryId: string,
  important: boolean,
): Countdown => ({
  id,
  title: id,
  dueAt: "2030-01-01T12:00:00.000Z",
  allDay: true,
  categoryId,
  reminderDays: [],
  recurrence: {
    enabled: false,
    interval: 1,
    frequency: "day",
    end: { type: "never" },
  },
  important,
  status: "upcoming",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
describe("dashboard filters", () => {
  it("starts collapsed", () => expect(DEFAULT_FILTER_PANEL_OPEN).toBe(false));
  const items = [
    base("vehicle", "vehicle", true),
    base("health", "health", false),
    base("education", "education", true),
  ];
  it("filters one category", () =>
    expect(
      filterCountdowns(items, {
        categoryIds: ["vehicle"],
        importance: "all",
      }).map((x) => x.id),
    ).toEqual(["vehicle"]));
  it("uses OR for categories", () =>
    expect(
      filterCountdowns(items, {
        categoryIds: ["vehicle", "health"],
        importance: "all",
      }),
    ).toHaveLength(2));
  it("combines category and importance", () =>
    expect(
      filterCountdowns(items, {
        categoryIds: ["health"],
        importance: "important",
      }),
    ).toHaveLength(0));
});

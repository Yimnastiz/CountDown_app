import { describe, expect, it } from "vitest";
import { defaultSettings } from "./data";
import { buildMigrationPlan } from "./cloud-migration";
import type { CloudData } from "./cloud-data";
import type { Category, Countdown } from "./types";

const category = (id: string, name = "Personal"): Category => ({
  id,
  name,
  icon: "heart",
  color: "#d65d8e",
  isDefault: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
const countdown = (id: string, categoryId = "personal"): Countdown => ({
  id,
  title: "Renew vehicle tax",
  dueAt: "2026-12-10T02:00:00.000Z",
  dueDate: "2026-12-10",
  allDay: true,
  categoryId,
  reminderDays: [30, 7, 1, 0],
  recurrence: {
    enabled: true,
    interval: 1,
    frequency: "year",
    end: { type: "never" },
  },
  recurrenceExceptions: [
    {
      occurrenceKey: `${id}:2026-12-10`,
      occurrenceDate: "2026-12-10",
      status: "completed",
      updatedAt: "2026-12-10T03:00:00.000Z",
    },
  ],
  important: true,
  status: "upcoming",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
const data = (countdowns: Countdown[], categories: Category[]): CloudData => ({
  countdowns,
  categories,
  settings: defaultSettings,
});

describe("safe local cloud migration", () => {
  it("imports stable IDs and is idempotent while preserving recurrence exceptions", () => {
    const local = data([countdown("countdown-a")], [category("personal")]);
    const first = buildMigrationPlan(data([], []), local);
    expect(first.countdowns[0].id).toBe("countdown-a");
    expect(first.countdowns[0].recurrenceExceptions).toEqual(
      local.countdowns[0].recurrenceExceptions,
    );
    const second = buildMigrationPlan(
      data(first.countdowns, first.categories),
      local,
    );
    expect(second.countdowns).toEqual([]);
    expect(second.categories).toEqual([]);
  });

  it("preserves both records when equal IDs have materially different content", () => {
    const cloud = data(
      [countdown("same", "personal")],
      [category("personal", "Personal")],
    );
    const local = data(
      [countdown("same", "personal")],
      [category("personal", "Different category")],
    );
    local.countdowns[0].title = "Different countdown";
    const plan = buildMigrationPlan(cloud, local);
    expect(plan.conflicts).toBe(2);
    expect(plan.categories[0].id).toMatch(/^personal~import-/);
    expect(plan.countdowns[0].id).toMatch(/^same~import-/);
    expect(plan.countdowns[0].categoryId).toBe(plan.categories[0].id);
    const retry = buildMigrationPlan(
      data(
        [...cloud.countdowns, ...plan.countdowns],
        [...cloud.categories, ...plan.categories],
      ),
      local,
    );
    expect(retry.countdowns).toEqual([]);
    expect(retry.categories).toEqual([]);
  });

  it("does not duplicate matching records that only differ by timestamps", () => {
    const cloudCategory = category("personal");
    const localCategory = {
      ...category("personal"),
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z",
    };
    const cloudCountdown = countdown("same");
    const localCountdown = {
      ...countdown("same"),
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z",
    };

    const plan = buildMigrationPlan(
      data([cloudCountdown], [cloudCategory]),
      data([localCountdown], [localCategory]),
    );

    expect(plan.conflicts).toBe(0);
    expect(plan.countdowns).toEqual([]);
    expect(plan.categories).toEqual([]);
  });
});

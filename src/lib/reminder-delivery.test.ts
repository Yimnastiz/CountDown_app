import { describe, expect, it } from "vitest";
import {
  pushFailureKind,
  reminderNotificationPayload,
} from "./reminder-delivery";

describe("reminder delivery helpers", () => {
  const job = {
    id: "job",
    countdown_id: "series",
    occurrence_key: "series:2026-12-10",
    title: "Vehicle tax",
    target_date: "2026-12-10",
    reminder_days_before: 1,
    is_recurring: true,
  };
  it("creates a minimal recurring deep-link payload", () => {
    expect(reminderNotificationPayload(job)).toEqual({
      title: "COUNT//DOWN",
      body: "Vehicle tax is due in 1 day.",
      url: "/countdowns/series?occurrence=2026-12-10",
    });
  });
  it("distinguishes due-today and permanent failures", () => {
    expect(
      reminderNotificationPayload({ ...job, reminder_days_before: 0 }).body,
    ).toBe("Vehicle tax is due today.");
    expect(pushFailureKind({ statusCode: 410 })).toBe("permanent");
    expect(pushFailureKind({ statusCode: 503 })).toBe("temporary");
  });
  it("uses the plain detail route for a non-recurring countdown", () => {
    expect(
      reminderNotificationPayload({ ...job, is_recurring: false }).url,
    ).toBe("/countdowns/series");
  });
});

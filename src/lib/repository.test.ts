import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  backupService,
  categoryRepository,
  countdownRepository,
  settingsRepository,
} from "./repository";
import type { CountdownInput } from "./types";
const originalCrypto = globalThis.crypto;
const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});
const input = (enabled = true): CountdownInput => ({
  title: "Repeat",
  dueAt: "2026-01-10T12:00:00.000Z",
  allDay: true,
  reminderDays: [],
  repeat: enabled ? "custom" : "never",
  recurrence: {
    enabled,
    interval: 2,
    frequency: "day",
    end: { type: "never" },
  },
  important: false,
});
beforeEach(() => {
  values.clear();
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: originalCrypto,
  });
});
afterAll(() =>
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: originalCrypto,
  }),
);
describe("countdown repository", () => {
  it("persists the selected sidebar mode", () => {
    settingsRepository.save({ sidebarMode: "collapsed" });
    expect(settingsRepository.get().sidebarMode).toBe("collapsed");
  });
  it("creates a countdown when randomUUID is unavailable", () => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) =>
          globalThis.crypto ? bytes : bytes,
      },
    });
    const saved = countdownRepository.save(input(false));
    expect(saved.id).not.toBe("");
  });
  it("creates exactly one next occurrence when completed repeatedly", () => {
    const saved = countdownRepository.save(input());
    countdownRepository.complete(saved.id);
    countdownRepository.complete(saved.id);
    const items = countdownRepository.list();
    expect(items).toHaveLength(2);
    expect(
      items.find((item) => item.sourceOccurrenceId === saved.id)?.dueAt,
    ).toContain("2026-01-12");
  });
  it("does not create a next occurrence after stopping recurrence", () => {
    const saved = countdownRepository.save(input());
    countdownRepository.stopRepeating(saved.id);
    countdownRepository.complete(saved.id);
    expect(countdownRepository.list()).toHaveLength(1);
  });
  it("exports and imports recurrence, icons, and new themes", () => {
    const saved = countdownRepository.save({
      ...input(),
      recurrence: {
        enabled: true,
        interval: 3,
        frequency: "month",
        end: { type: "never" },
      },
    });
    categoryRepository.save({
      id: "imported",
      name: "Imported",
      icon: "unknown-icon",
      color: "#123456",
      isDefault: false,
      createdAt: "",
      updatedAt: "",
    });
    settingsRepository.save({ theme: "lavender" });
    const backup = backupService.make();
    expect(
      backup.countdowns.find((item) => item.id === saved.id)?.recurrence
        .interval,
    ).toBe(3);
    backupService.restore(backup, "replace");
    expect(
      categoryRepository.list().find((item) => item.id === "imported")?.icon,
    ).toBe("shapes");
    expect(settingsRepository.get().theme).toBe("lavender");
  });
});

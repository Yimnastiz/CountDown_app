"use client";

import { deviceInstallStorageKey, isValidDeviceId } from "./auth-utils";

export function getDeviceInstallationId(userId: string) {
  // A shared browser installation may sign in to separate accounts. Keep their
  // device records distinct instead of ever attempting to reassign one record.
  const storageKey = `${deviceInstallStorageKey}.${userId}`;
  const current = localStorage.getItem(storageKey);
  if (isValidDeviceId(current)) return current;
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : (() => {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (value) =>
          value.toString(16).padStart(2, "0"),
        ).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      })();
  localStorage.setItem(storageKey, id);
  return id;
}

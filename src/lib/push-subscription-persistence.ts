"use client";

import { getDeviceInstallationId } from "./device-installation";

type PersistedSubscription = PushSubscriptionJSON | null;

const request = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok)
    throw new Error(result.error ?? "Push registration could not be saved.");
};

export async function persistPushSubscription(
  userId: string,
  subscription: PersistedSubscription,
) {
  const deviceId = getDeviceInstallationId(userId);
  await request("/api/devices/current", { deviceId });
  await request("/api/push/subscription", { deviceId, subscription });
}

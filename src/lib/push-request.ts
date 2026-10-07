export interface TestPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

export type TestPushRequest = { subscription: TestPushSubscription };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const isBase64Url = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= maxLength &&
  /^[A-Za-z0-9_-]+={0,2}$/.test(value);

export function parseTestPushRequest(value: unknown): TestPushRequest | null {
  if (!isRecord(value) || !isRecord(value.subscription)) return null;
  const subscription = value.subscription;
  if (
    typeof subscription.endpoint !== "string" ||
    subscription.endpoint.length > 4096 ||
    !isRecord(subscription.keys) ||
    !isBase64Url(subscription.keys.p256dh, 256) ||
    !isBase64Url(subscription.keys.auth, 128) ||
    (subscription.expirationTime !== undefined &&
      subscription.expirationTime !== null &&
      typeof subscription.expirationTime !== "number")
  )
    return null;
  try {
    if (new URL(subscription.endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return {
    subscription: {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime as number | null | undefined,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    },
  };
}

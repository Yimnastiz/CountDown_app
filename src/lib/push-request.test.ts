import { describe, expect, it } from "vitest";
import { parseTestPushRequest } from "./push-request";

const valid = {
  subscription: {
    endpoint: "https://push.example.test/subscription/123",
    expirationTime: null,
    keys: { p256dh: "abc_DEF-123", auth: "auth_123" },
  },
};

describe("test push request validation", () => {
  it("accepts the required PushSubscription shape", () => {
    expect(parseTestPushRequest(valid)).toEqual(valid);
  });

  it("rejects non-HTTPS endpoints and missing keys", () => {
    expect(
      parseTestPushRequest({
        ...valid,
        subscription: {
          ...valid.subscription,
          endpoint: "http://example.test",
        },
      }),
    ).toBeNull();
    expect(
      parseTestPushRequest({
        subscription: { endpoint: "https://example.test", keys: {} },
      }),
    ).toBeNull();
  });
});

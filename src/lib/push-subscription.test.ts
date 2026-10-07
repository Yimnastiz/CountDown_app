import { describe, expect, it } from "vitest";
import {
  PushSubscriptionError,
  urlBase64ToUint8Array,
} from "./push-subscription";

describe("VAPID public key conversion", () => {
  it("converts an unpadded URL-safe base64 key", () => {
    const bytes = Uint8Array.from({ length: 65 }, (_, index) => index);
    const encoded = btoa(
      Array.from(bytes, (value) => String.fromCharCode(value)).join(""),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(urlBase64ToUint8Array(encoded)).toEqual(bytes);
  });

  it("rejects malformed or incorrectly sized keys", () => {
    expect(() => urlBase64ToUint8Array("not+a+vapid+key")).toThrow(
      PushSubscriptionError,
    );
    expect(() => urlBase64ToUint8Array("YWJj")).toThrow(
      "The VAPID public key is invalid.",
    );
  });
});

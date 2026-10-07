import { describe, expect, it } from "vitest";
import { parseDeviceRegistration, safeAuthRedirect } from "./auth-utils";

describe("authentication helpers", () => {
  it("keeps OAuth redirects inside the app", () => {
    expect(safeAuthRedirect("/settings?tab=account")).toBe(
      "/settings?tab=account",
    );
    expect(safeAuthRedirect("https://attacker.example")).toBe("/");
    expect(safeAuthRedirect("//attacker.example")).toBe("/");
  });

  it("accepts only a UUID device installation identifier", () => {
    expect(
      parseDeviceRegistration({
        deviceId: "d9428888-122b-11e1-b85c-61cd3cbb3210",
      }),
    ).toEqual({ deviceId: "d9428888-122b-11e1-b85c-61cd3cbb3210" });
    expect(parseDeviceRegistration({ userId: "another-user" })).toBeNull();
    expect(parseDeviceRegistration({ deviceId: "not-a-uuid" })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  canRequestNotificationPermission,
  notificationStatus,
} from "./notifications";
describe("notifications", () => {
  it("does not request denied permission again", () =>
    expect(canRequestNotificationPermission("denied")).toBe(false));
  it("reports insecure origins truthfully", () =>
    expect(
      notificationStatus({
        secure: false,
        standalone: false,
        notification: true,
        serviceWorker: false,
        pushManager: false,
        permission: "default",
      }),
    ).toBe("Requires HTTPS"));
  it("distinguishes permission from an active subscription", () => {
    const base = {
      secure: true,
      standalone: true,
      notification: true,
      serviceWorker: true,
      pushManager: true,
      permission: "granted" as const,
      vapidConfigured: true,
    };
    expect(notificationStatus(base)).toBe("Ready to subscribe");
    expect(notificationStatus({ ...base, subscribed: true })).toBe(
      "Subscribed",
    );
  });
});

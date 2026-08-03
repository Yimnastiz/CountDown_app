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
});

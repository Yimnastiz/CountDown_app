import { getCurrentPushSubscription } from "./push-subscription";

export interface NotificationDiagnostics {
  secure: boolean;
  standalone: boolean;
  notification: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  permission: NotificationPermission | "unsupported";
  ios?: boolean;
  vapidConfigured?: boolean;
  subscribed?: boolean;
}
export function notificationStatus(
  diagnostics: NotificationDiagnostics,
): string {
  if (!diagnostics.notification) return "Unsupported";
  if (!diagnostics.secure) return "Requires HTTPS";
  if (!diagnostics.standalone && diagnostics.ios)
    return "Requires installation";
  if (diagnostics.permission === "denied") return "Denied";
  if (!diagnostics.serviceWorker || !diagnostics.pushManager)
    return "Unsupported";
  if (!diagnostics.vapidConfigured) return "Not configured";
  if (diagnostics.subscribed) return "Subscribed";
  if (diagnostics.permission === "default") return "Permission required";
  return "Ready to subscribe";
}
export const canRequestNotificationPermission = (
  permission: NotificationPermission | "unsupported",
) => permission === "default";

export async function getNotificationDiagnostics(
  vapidConfigured: boolean,
): Promise<NotificationDiagnostics> {
  const notification = "Notification" in window;
  const permission = notification ? Notification.permission : "unsupported";
  const serviceWorker = "serviceWorker" in navigator;
  const pushManager = "PushManager" in window;
  let subscribed = false;
  if (serviceWorker && pushManager) {
    try {
      subscribed = Boolean(await getCurrentPushSubscription());
    } catch {
      // Diagnostics remain available if registration inspection fails.
    }
  }
  return {
    secure: window.isSecureContext,
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    notification,
    serviceWorker,
    pushManager,
    permission,
    ios: /iPhone|iPad|iPod/.test(navigator.userAgent),
    vapidConfigured,
    subscribed,
  };
}

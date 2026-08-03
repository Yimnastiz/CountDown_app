export interface NotificationDiagnostics {
  secure: boolean;
  standalone: boolean;
  notification: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  permission: NotificationPermission | "unsupported";
}
export function notificationStatus(
  diagnostics: NotificationDiagnostics,
): string {
  if (!diagnostics.notification) return "Unsupported";
  if (!diagnostics.secure) return "Requires HTTPS";
  if (
    !diagnostics.standalone &&
    /iPhone|iPad|iPod/.test(
      typeof navigator === "undefined" ? "" : navigator.userAgent,
    )
  )
    return "Requires installation";
  if (diagnostics.permission === "denied") return "Denied";
  if (diagnostics.permission === "default") return "Not requested";
  if (!diagnostics.serviceWorker || !diagnostics.pushManager)
    return "Permission allowed, delivery not configured";
  return "Permission allowed, delivery not configured";
}
export const canRequestNotificationPermission = (
  permission: NotificationPermission | "unsupported",
) => permission === "default";

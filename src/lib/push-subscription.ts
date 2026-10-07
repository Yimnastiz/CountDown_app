export class PushSubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushSubscriptionError";
  }
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value))
    throw new PushSubscriptionError("The VAPID public key is invalid.");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const decoded = atob(
      (value + padding).replace(/-/g, "+").replace(/_/g, "/"),
    );
    const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
    for (let index = 0; index < decoded.length; index += 1)
      bytes[index] = decoded.charCodeAt(index);
    if (bytes.length !== 65)
      throw new PushSubscriptionError("The VAPID public key is invalid.");
    return bytes;
  } catch (error) {
    if (error instanceof PushSubscriptionError) throw error;
    throw new PushSubscriptionError("The VAPID public key is invalid.");
  }
}

export function supportsWebPush() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function getCurrentPushSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration?.pushManager.getSubscription() ?? null;
}

async function activeServiceWorkerRegistration() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration)
    throw new PushSubscriptionError(
      "The service worker is not ready. Reload the installed app and try again.",
    );
  if (registration.active) return registration;
  return navigator.serviceWorker.ready;
}

/** Requests permission only when called from an explicit user action. */
export async function subscribeToPush(vapidPublicKey: string) {
  if (!window.isSecureContext)
    throw new PushSubscriptionError("Push notifications require HTTPS.");
  if (!("Notification" in window))
    throw new PushSubscriptionError(
      "Notifications are not supported in this browser.",
    );
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    throw new PushSubscriptionError(
      "Web Push is not supported in this browser.",
    );
  if (!vapidPublicKey)
    throw new PushSubscriptionError(
      "Push notifications are not configured on this deployment.",
    );

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const registration = await activeServiceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission === "denied")
    throw new PushSubscriptionError(
      "Notification permission is denied. Enable it in iPhone Settings.",
    );
  if (permission !== "granted")
    throw new PushSubscriptionError("Notification permission was not granted.");

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (error) {
    if (error instanceof PushSubscriptionError) throw error;
    throw new PushSubscriptionError(
      "The push subscription could not be created. Check the VAPID configuration and try again.",
    );
  }
}

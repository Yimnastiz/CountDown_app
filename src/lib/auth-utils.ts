export const deviceInstallStorageKey = "countdown-app.device-install-id";

export const isValidDeviceId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export function safeAuthRedirect(value: string | null, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  return value;
}

export const parseDeviceRegistration = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const deviceId = (value as { deviceId?: unknown }).deviceId;
  return isValidDeviceId(deviceId) ? { deviceId } : null;
};

import { NextResponse } from "next/server";
import { isValidDeviceId } from "@/lib/auth-utils";
import { parseTestPushRequest } from "@/lib/push-request";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 16 * 1024;

const response = (error: string, status: number) =>
  NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return response("This request is not allowed.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response("Expected a JSON request.", 415);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES)
    return response("The request is too large.", 413);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return response("The request body is invalid.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return response("The request body is invalid.", 400);
  const { deviceId, subscription } = value as {
    deviceId?: unknown;
    subscription?: unknown;
  };
  if (!isValidDeviceId(deviceId)) return response("Invalid device.", 400);
  const parsed = parseTestPushRequest({ subscription });
  if (subscription !== null && !parsed)
    return response("The push subscription is invalid.", 400);
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return response("Sign in is required.", 401);
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id")
      .eq("id", deviceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (deviceError || !device) return response("Unknown device.", 403);

    if (!parsed) {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("device_id", deviceId);
      if (error)
        return response("Push registration could not be removed.", 500);
      return NextResponse.json({ ok: true, registered: false });
    }

    const { data: endpointOwner, error: endpointError } = await supabase
      .from("push_subscriptions")
      .select("id, device_id")
      .eq("endpoint", parsed.subscription.endpoint)
      .maybeSingle();
    if (endpointError)
      return response("Push registration could not be saved.", 500);
    if (endpointOwner && endpointOwner.device_id !== deviceId) {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", endpointOwner.id)
        .eq("user_id", user.id);
      if (error) return response("Push registration could not be saved.", 500);
    }
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        device_id: deviceId,
        endpoint: parsed.subscription.endpoint,
        p256dh: parsed.subscription.keys.p256dh,
        auth: parsed.subscription.keys.auth,
        expiration_time: parsed.subscription.expirationTime ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );
    if (error) return response("Push registration could not be saved.", 500);
    return NextResponse.json({ ok: true, registered: true });
  } catch {
    return response("Account services are unavailable.", 503);
  }
}

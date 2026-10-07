import { NextResponse } from "next/server";
import { parseDeviceRegistration } from "@/lib/auth-utils";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 1024;

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin)
    return NextResponse.json(
      { error: "This request is not allowed." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json(
      { error: "Expected a JSON request." },
      { status: 415 },
    );
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES)
    return NextResponse.json(
      { error: "The request is too large." },
      { status: 413 },
    );
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "The request body is invalid." },
      { status: 400 },
    );
  }
  const parsed = parseDeviceRegistration(data);
  if (!parsed)
    return NextResponse.json(
      { error: "The device identifier is invalid." },
      { status: 400 },
    );
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user)
      return NextResponse.json(
        { error: "Sign in is required." },
        { status: 401 },
      );
    const { error } = await supabase.from("devices").upsert(
      {
        id: parsed.deviceId,
        user_id: user.id,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error)
      return NextResponse.json(
        { error: "The device could not be registered." },
        { status: 500 },
      );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Account services are unavailable." },
      { status: 503 },
    );
  }
}

import { NextResponse } from "next/server";
import webPush from "web-push";
import { parseTestPushRequest } from "@/lib/push-request";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 16 * 1024;

const response = (message: string, status: number) =>
  NextResponse.json({ ok: false, error: message }, { status });

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  if (request.headers.get("origin") !== requestOrigin)
    return response("This request is not allowed.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response("Expected a JSON request.", 415);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES)
    return response("The request is too large.", 413);

  let raw = "";
  try {
    raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES)
      return response("The request is too large.", 413);
  } catch {
    return response("The request could not be read.", 400);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return response("The request body is invalid.", 400);
  }
  const parsed = parseTestPushRequest(value);
  if (!parsed) return response("The push subscription is invalid.", 400);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject)
    return response("Web Push is not configured on this deployment.", 503);

  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    await webPush.sendNotification(
      parsed.subscription,
      JSON.stringify({
        title: "COUNT//DOWN",
        body: "การแจ้งเตือนพร้อมใช้งานแล้ว",
        url: "/settings",
      }),
      { TTL: 60 },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "statusCode" in error
        ? Number(error.statusCode)
        : undefined;
    if (statusCode === 404 || statusCode === 410)
      return response(
        "This push subscription has expired. Enable push notifications again.",
        410,
      );
    if (!statusCode)
      return response("The server's Web Push configuration is invalid.", 503);
    return response("The test notification could not be sent.", 502);
  }
}

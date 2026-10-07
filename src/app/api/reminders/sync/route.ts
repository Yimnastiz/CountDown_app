import { NextResponse } from "next/server";
import { defaultSettings } from "@/lib/data";
import { accountSettingsFromRow, countdownFromRow } from "@/lib/cloud-data";
import { buildReminderJobDrafts } from "@/lib/reminder-jobs";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/timezone";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 1024;

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
  let timezone: unknown;
  try {
    timezone = (JSON.parse(raw) as { timezone?: unknown }).timezone;
  } catch {
    return response("The request body is invalid.", 400);
  }
  if (!isValidTimeZone(timezone)) return response("Invalid timezone.", 400);

  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return response("Sign in is required.", 401);
    const [countdowns, settings, existing] = await Promise.all([
      supabase.from("countdowns").select("*").order("created_at"),
      supabase.from("user_settings").select("*").maybeSingle(),
      supabase
        .from("reminder_jobs")
        .select("id, schedule_key, status")
        .eq("user_id", user.id),
    ]);
    if (countdowns.error || settings.error || existing.error)
      return response("Reminder jobs could not be synchronized.", 500);

    const accountSettings = accountSettingsFromRow(
      settings.data,
      defaultSettings,
    );
    const drafts = buildReminderJobDrafts({
      countdowns: (countdowns.data ?? []).map(countdownFromRow),
      reminderTime: accountSettings.defaultReminderTime,
      timezone,
    });
    const current = new Map(
      (existing.data ?? []).map((job) => [job.schedule_key, job]),
    );
    const desiredKeys = new Set(drafts.map((job) => job.key));
    const cancelled = (existing.data ?? []).filter(
      (job) =>
        (job.status === "pending" || job.status === "processing") &&
        !desiredKeys.has(job.schedule_key),
    );
    const toSave = drafts.filter((job) => {
      const status = current.get(job.key)?.status;
      return status !== "sent" && status !== "processing";
    });
    const now = new Date().toISOString();
    const [cancelledResults, saved] = await Promise.all([
      Promise.all(
        cancelled.map((job) =>
          supabase
            .from("reminder_jobs")
            .update({ status: "cancelled", cancelled_at: now })
            .eq("id", job.id)
            .eq("user_id", user.id),
        ),
      ),
      toSave.length
        ? supabase.from("reminder_jobs").upsert(
            toSave.map((job) => ({
              user_id: user.id,
              schedule_key: job.key,
              countdown_id: job.countdownId,
              occurrence_key: job.occurrenceKey,
              title: job.title,
              target_date: job.targetDate,
              reminder_days_before: job.reminderDaysBefore,
              scheduled_for: job.scheduledFor,
              timezone: job.timezone,
              is_recurring: job.isRecurring,
              status: "pending",
              cancelled_at: null,
            })),
            { onConflict: "user_id,schedule_key" },
          )
        : Promise.resolve({ error: null }),
    ]);
    if (cancelledResults.some(({ error }) => error) || saved.error)
      return response("Reminder jobs could not be synchronized.", 500);
    return NextResponse.json({ ok: true, pending: drafts.length });
  } catch {
    return response("Account services are unavailable.", 503);
  }
}

import { NextResponse } from "next/server";
import webPush from "web-push";
import {
  pushFailureKind,
  reminderNotificationPayload,
  type DeliveryJob,
} from "@/lib/reminder-delivery";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;
const BATCH_SIZE = 20;

type ClaimedJob = DeliveryJob & {
  user_id: string;
  claim_token: string;
};
type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};
type Delivery = {
  subscription_id: string;
  status: string;
  attempt_count: number;
};

const cronAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
};

const finalize = async (
  admin: ReturnType<typeof createSupabaseAdminClient>,
  job: ClaimedJob,
  status: "pending" | "sent",
) =>
  admin
    .from("reminder_jobs")
    .update({
      status,
      claim_token: null,
      claimed_at: null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", job.id)
    .eq("status", "processing")
    .eq("claim_token", job.claim_token);

export async function GET(request: Request) {
  if (!cronAuthorized(request))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject)
    return NextResponse.json(
      { error: "Web Push is not configured." },
      { status: 503 },
    );

  try {
    const admin = createSupabaseAdminClient();
    const claimToken = crypto.randomUUID();
    const { data, error } = await admin.rpc("claim_due_reminder_jobs", {
      p_claim_token: claimToken,
      p_limit: BATCH_SIZE,
    });
    if (error)
      return NextResponse.json(
        { error: "Reminder jobs could not be claimed." },
        { status: 500 },
      );
    const jobs = (data ?? []) as ClaimedJob[];
    webPush.setVapidDetails(subject, publicKey, privateKey);
    const totals = {
      claimed: jobs.length,
      finalized: 0,
      pushes: 0,
      removed: 0,
      temporaryFailures: 0,
    };

    for (const job of jobs) {
      const [
        { data: subscriptions, error: subscriptionsError },
        { data: saved, error: savedError },
      ] = await Promise.all([
        admin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", job.user_id),
        admin
          .from("reminder_job_deliveries")
          .select("subscription_id, status, attempt_count")
          .eq("job_id", job.id),
      ]);
      if (subscriptionsError || savedError) {
        await finalize(admin, job, "pending");
        totals.temporaryFailures += 1;
        continue;
      }
      const deliveries = new Map(
        ((saved ?? []) as Delivery[]).map((delivery) => [
          delivery.subscription_id,
          delivery,
        ]),
      );
      let temporaryFailure = false;
      for (const subscription of (subscriptions ?? []) as Subscription[]) {
        const previous = deliveries.get(subscription.id);
        if (
          previous?.status === "sent" ||
          previous?.status === "permanent_failure"
        )
          continue;
        const attemptCount = (previous?.attempt_count ?? 0) + 1;
        const attemptedAt = new Date().toISOString();
        const { error: trackingError } = await admin
          .from("reminder_job_deliveries")
          .upsert(
            {
              job_id: job.id,
              user_id: job.user_id,
              subscription_id: subscription.id,
              status: "pending",
              attempt_count: attemptCount,
              last_attempt_at: attemptedAt,
            },
            { onConflict: "job_id,subscription_id" },
          );
        if (trackingError) {
          temporaryFailure = true;
          continue;
        }
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(reminderNotificationPayload(job)),
            { TTL: 60 },
          );
          const { error: sentError } = await admin
            .from("reminder_job_deliveries")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("job_id", job.id)
            .eq("subscription_id", subscription.id);
          if (sentError) temporaryFailure = true;
          else totals.pushes += 1;
        } catch (cause) {
          if (pushFailureKind(cause) === "permanent") {
            await Promise.all([
              admin
                .from("reminder_job_deliveries")
                .update({ status: "permanent_failure" })
                .eq("job_id", job.id)
                .eq("subscription_id", subscription.id),
              admin
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id)
                .eq("user_id", job.user_id),
            ]);
            totals.removed += 1;
          } else {
            temporaryFailure = true;
            totals.temporaryFailures += 1;
          }
        }
      }
      const { error: finalizeError } = await finalize(
        admin,
        job,
        temporaryFailure ? "pending" : "sent",
      );
      if (!finalizeError && !temporaryFailure) totals.finalized += 1;
    }
    console.info("reminder delivery", totals);
    return NextResponse.json({ ok: true, ...totals });
  } catch {
    return NextResponse.json(
      { error: "Reminder delivery is unavailable." },
      { status: 503 },
    );
  }
}

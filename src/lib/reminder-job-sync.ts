"use client";

export async function syncReminderJobs(timezone: string) {
  const response = await fetch("/api/reminders/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timezone }),
  });
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error ?? "Reminder jobs could not be synchronized.");
}

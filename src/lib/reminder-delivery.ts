export type DeliveryJob = {
  id: string;
  countdown_id: string;
  occurrence_key: string;
  title: string;
  target_date: string;
  reminder_days_before: number;
  is_recurring: boolean;
};

export const reminderNotificationPayload = (job: DeliveryJob) => {
  const occurrenceDate = job.occurrence_key.split(":").at(-1);
  const url =
    job.is_recurring && occurrenceDate
      ? `/countdowns/${encodeURIComponent(job.countdown_id)}?occurrence=${encodeURIComponent(occurrenceDate)}`
      : `/countdowns/${encodeURIComponent(job.countdown_id)}`;
  const body =
    job.reminder_days_before === 0
      ? `${job.title} is due today.`
      : `${job.title} is due in ${job.reminder_days_before} day${job.reminder_days_before === 1 ? "" : "s"}.`;
  return { title: "COUNT//DOWN", body, url };
};

export const pushFailureKind = (error: unknown) => {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number(error.statusCode)
      : undefined;
  if (statusCode === 404 || statusCode === 410) return "permanent";
  return "temporary";
};

"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CircleCheck,
  Copy,
  Pencil,
  Repeat2,
  RotateCcw,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/shell";
import {
  CategoryBadge,
  ConfirmDialog,
  CountdownBadge,
  EmptyState,
  PixelButton,
  PixelCard,
} from "@/components/ui";
import { formatDue, statusFor, timeLeft } from "@/lib/date";
import { formatRecurrenceRule } from "@/lib/recurrence";
import {
  isOccurrenceInSeries,
  occurrenceDateFor,
  resolveOccurrence,
} from "@/lib/occurrences";
import { useAppData } from "@/components/app-data";
import type { Category, Countdown, CountdownInput } from "@/lib/types";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const occurrence = useSearchParams().get("occurrence");
  const router = useRouter();
  const {
    countdowns,
    categories: cats,
    complete,
    undoCompletion,
    removeCountdown,
    stopRepeating,
    saveCountdown,
  } = useAppData();
  const series = countdowns.find((item) => item.id === id) ?? null;
  const [confirm, setConfirm] = useState(false);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const [savingCompletion, setSavingCompletion] = useState(false);

  if (!series) {
    return <Missing title="Countdown not found" href="/" />;
  }
  const validOccurrence =
    !occurrence ||
    (series.recurrence.enabled &&
      /^\d{4}-\d{2}-\d{2}$/.test(occurrence) &&
      isOccurrenceInSeries(series, occurrence));
  if (!validOccurrence)
    return <Missing title="Occurrence not found" href={`/countdowns/${id}`} />;

  const item = occurrence ? resolveOccurrence(series, occurrence) : series;
  const status = statusFor(item);
  const updateCompletion = async (undo = false) => {
    if (savingCompletion) return;
    setSavingCompletion(true);
    try {
      if (undo) {
        await undoCompletion(series.id, occurrence ?? undefined);
        setNotice("Completion undone. This occurrence is active again.");
      } else {
        await complete(series.id, occurrence ?? undefined);
        setNotice("Marked as completed.");
      }
    } catch {
      setNotice("We could not save that change. Please try again.");
    } finally {
      setSavingCompletion(false);
    }
  };
  const share = async () => {
    const text = `${item.title} — ${formatDue(item.dueAt, item.allDay, item.dueDate)}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice("Countdown copied to clipboard.");
      }
    } catch {
      setNotice("Share was cancelled or unavailable.");
    }
  };
  const duplicate = async () => {
    const {
      id: _id,
      status: _status,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      completedAt: _completedAt,
      archivedAt: _archivedAt,
      seriesId: _seriesId,
      sourceOccurrenceId: _sourceOccurrenceId,
      nextOccurrenceId: _nextOccurrenceId,
      recurrenceStoppedAt: _recurrenceStoppedAt,
      recurrenceExceptions: _recurrenceExceptions,
      isVirtualOccurrence: _isVirtualOccurrence,
      ...input
    } = series;
    try {
      const copy = await saveCountdown({
        ...input,
        title: `${series.title} (copy)`,
        recurrenceExceptions: [],
      } as CountdownInput);
      router.push(`/countdowns/${copy.id}`);
    } catch {
      setNotice("We could not duplicate this countdown. Please try again.");
    }
  };

  return (
    <AppShell
      title="Countdown"
      back
      actions={
        <Link
          href={`/countdowns/${id}/edit`}
          className="icon-button"
          aria-label="Edit recurring series"
        >
          <Pencil aria-hidden="true" />
        </Link>
      }
    >
      <PixelCard className="detail-hero">
        <CountdownBadge status={status} />
        <b className="detail-number">{timeLeft(item)}</b>
        <h2>
          {item.important && (
            <Star size={20} fill="currentColor" aria-label="Important" />
          )}
          {item.title}
        </h2>
        <p>{formatDue(item.dueAt, item.allDay, item.dueDate)}</p>
        {occurrence && (
          <p className="muted">
            Recurring occurrence · {occurrenceDateFor(item)}
          </p>
        )}
        <CategoryBadge
          category={cats.find((category) => category.id === item.categoryId)}
        />
      </PixelCard>
      <PixelCard className="detail-info">
        <dl>
          <dt>Description</dt>
          <dd>{item.description || "No description"}</dd>
          <dt>Reminder</dt>
          <dd>
            {item.reminderDays.length
              ? `${item.reminderDays.join(", ")} days before`
              : "No reminder"}
          </dd>
          <dt>Repeat</dt>
          <dd>
            {formatRecurrenceRule(series.recurrence)}
            {series.recurrenceStoppedAt ? " (stopped)" : ""}
          </dd>
          <dt>Created</dt>
          <dd>{formatDue(series.createdAt)}</dd>
          <dt>Updated</dt>
          <dd>{formatDue(series.updatedAt)}</dd>
          {item.notes && (
            <>
              <dt>Notes</dt>
              <dd>{item.notes}</dd>
            </>
          )}
        </dl>
      </PixelCard>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="action-grid">
        <PixelButton
          disabled={savingCompletion}
          onClick={() => updateCompletion(status === "completed")}
        >
          {status === "completed" ? (
            <RotateCcw size={17} aria-hidden="true" />
          ) : (
            <CircleCheck size={17} aria-hidden="true" />
          )}
          {savingCompletion
            ? "Saving…"
            : status === "completed"
              ? "Mark as incomplete"
              : "Mark as completed"}
        </PixelButton>
        <Link className="pixel-link" href={`/countdowns/${id}/edit`}>
          Edit series
        </Link>
        <PixelButton onClick={share}>
          <Share2 size={17} aria-hidden="true" />
          Share / Copy
        </PixelButton>
        <PixelButton onClick={() => void duplicate()}>
          <Copy size={17} aria-hidden="true" />
          Duplicate
        </PixelButton>
        {series.recurrence.enabled && !series.recurrenceStoppedAt && (
          <PixelButton onClick={() => setStopConfirm(true)}>
            <Repeat2 size={17} aria-hidden="true" />
            Stop repeating
          </PixelButton>
        )}
        <PixelButton className="danger" onClick={() => setConfirm(true)}>
          <Trash2 size={17} aria-hidden="true" />
          Delete
        </PixelButton>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this countdown?"
        danger
        confirmText="Delete"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          void removeCountdown(id)
            .then(() => router.push("/"))
            .catch(() => setNotice("We could not delete this countdown."));
        }}
      >
        This will permanently remove <strong>{series.title}</strong>. You cannot
        undo this action.
      </ConfirmDialog>
      <ConfirmDialog
        open={stopConfirm}
        title="Stop this recurring series?"
        confirmText="Stop repeating"
        onClose={() => setStopConfirm(false)}
        onConfirm={() => {
          void stopRepeating(id, occurrence ?? occurrenceDateFor(item))
            .then(() => {
              setNotice("Repeating stopped. Past history was kept.");
              setStopConfirm(false);
            })
            .catch(() => setNotice("We could not stop repeating."));
        }}
      >
        Past occurrences and completed history will remain. Future occurrences
        after this date will no longer appear.
      </ConfirmDialog>
    </AppShell>
  );
}

function Missing({ title, href }: { title: string; href: string }) {
  return (
    <AppShell title="Countdown" back>
      <EmptyState title={title}>
        This link no longer points to a valid countdown.
        <Link className="pixel-link" href={href}>
          Back to dashboard
        </Link>
      </EmptyState>
    </AppShell>
  );
}

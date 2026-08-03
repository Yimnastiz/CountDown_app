"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CircleCheck,
  Copy,
  Pencil,
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
import { categoryRepository, countdownRepository } from "@/lib/repository";
import type { Category, Countdown, CountdownInput } from "@/lib/types";
export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Countdown | null | undefined>();
  const [cats, setCats] = useState<Category[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const [savingCompletion, setSavingCompletion] = useState(false);
  useEffect(() => {
    setItem(countdownRepository.get(id) ?? null);
    setCats(categoryRepository.list());
  }, [id]);
  if (item === undefined) return null;
  if (!item)
    return (
      <AppShell title="Countdown" back>
        <EmptyState title="Countdown not found">
          This link no longer points to a countdown.
          <Link className="pixel-link" href="/">
            Back to dashboard
          </Link>
        </EmptyState>
      </AppShell>
    );
  const status = statusFor(item);
  const updateCompletion = (undo = false) => {
    if (savingCompletion) return;
    setSavingCompletion(true);
    if (undo) {
      countdownRepository.undoCompletion(id);
      setNotice("Completion undone. The countdown is active again.");
    } else {
      countdownRepository.complete(id);
      setNotice("Marked as completed.");
    }
    setItem(countdownRepository.get(id) ?? null);
    setSavingCompletion(false);
  };
  const share = async () => {
    const text = `${item.title} — ${formatDue(item.dueAt, item.allDay)}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice("Countdown copied to clipboard.");
      }
    } catch {
      setNotice("Share was cancelled.");
    }
  };
  const duplicate = () => {
    const {
      id: _id,
      status: _status,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      completedAt: _completedAt,
      archivedAt: _archivedAt,
      ...input
    } = item;
    const copy = countdownRepository.save({
      ...input,
      title: `${item.title} (copy)`,
    } as CountdownInput);
    router.push(`/countdowns/${copy.id}`);
  };
  return (
    <AppShell
      title="Countdown"
      back
      actions={
        <Link
          href={`/countdowns/${id}/edit`}
          className="icon-button"
          aria-label="Edit countdown"
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
        <p>{formatDue(item.dueAt, item.allDay)}</p>
        <CategoryBadge category={cats.find((c) => c.id === item.categoryId)} />
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
          <dd>{formatRecurrenceRule(item.recurrence)}</dd>
          <dt>Created</dt>
          <dd>{formatDue(item.createdAt)}</dd>
          <dt>Updated</dt>
          <dd>{formatDue(item.updatedAt)}</dd>
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
        {status !== "completed" ? (
          <PixelButton
            disabled={savingCompletion}
            onClick={() => updateCompletion()}
          >
            <CircleCheck size={17} aria-hidden="true" />
            {savingCompletion ? "Saving…" : "Mark as completed"}
          </PixelButton>
        ) : (
          <PixelButton
            disabled={savingCompletion}
            onClick={() => updateCompletion(true)}
          >
            <RotateCcw size={17} aria-hidden="true" />
            {savingCompletion ? "Saving…" : "Mark as incomplete"}
          </PixelButton>
        )}
        <Link className="pixel-link" href={`/countdowns/${id}/edit`}>
          Edit
        </Link>
        <PixelButton onClick={share}>
          <Share2 size={17} aria-hidden="true" />
          Share / Copy
        </PixelButton>
        <PixelButton onClick={duplicate}>
          <Copy size={17} aria-hidden="true" />
          Duplicate
        </PixelButton>
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
          countdownRepository.remove(id);
          router.push("/");
        }}
      >
        This will permanently remove <strong>{item.title}</strong>. You cannot
        undo this action.
      </ConfirmDialog>
    </AppShell>
  );
}

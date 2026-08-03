"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Copy, Pencil, Share2, Trash2 } from "lucide-react";
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
import { categoryRepository, countdownRepository } from "@/lib/repository";
import type { Category, Countdown } from "@/lib/types";
export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Countdown | null | undefined>();
  const [cats, setCats] = useState<Category[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
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
  const complete = () => {
    countdownRepository.patch(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    setItem(countdownRepository.get(id) ?? null);
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
          <Pencil />
        </Link>
      }
    >
      <PixelCard className="detail-hero">
        <CountdownBadge status={status} />
        <b className="detail-number">{timeLeft(item)}</b>
        <h2>
          {item.important && "★ "}
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
          <dd>{item.repeat}</dd>
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
        {status !== "completed" && (
          <PixelButton onClick={complete}>Mark completed</PixelButton>
        )}
        <Link className="pixel-link" href={`/countdowns/${id}/edit`}>
          Edit
        </Link>
        <PixelButton onClick={share}>
          <Share2 size={17} /> Share / Copy
        </PixelButton>
        <PixelButton
          onClick={() => {
            const copy = countdownRepository.save({
              ...item,
              title: `${item.title} (copy)`,
              dueAt: item.dueAt,
              status: undefined,
            } as unknown as import("@/lib/types").CountdownInput);
            router.push(`/countdowns/${copy.id}`);
          }}
        >
          <Copy size={17} /> Duplicate
        </PixelButton>
        <PixelButton className="danger" onClick={() => setConfirm(true)}>
          <Trash2 size={17} /> Delete
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

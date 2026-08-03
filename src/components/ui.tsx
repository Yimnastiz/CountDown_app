"use client";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { AlertTriangle, CalendarDays, ChevronRight, X } from "lucide-react";
import type { Category, Countdown, CountdownStatus } from "@/lib/types";
import { formatDue, statusFor, timeLeft } from "@/lib/date";
export function PixelButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`pixel-button ${className}`} {...props}>
      {children}
    </button>
  );
}
export function PixelCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`pixel-card ${className}`}>{children}</section>;
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <PixelCard className="empty">
      <CalendarDays size={30} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </PixelCard>
  );
}
export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
export function CategoryBadge({ category }: { category?: Category }) {
  return (
    <span
      className="category-badge"
      style={
        {
          "--badge": category?.color ?? "var(--secondary)",
        } as React.CSSProperties
      }
    >
      {category?.icon ?? "Tag"} · {category?.name ?? "Uncategorised"}
    </span>
  );
}
export function CountdownBadge({ status }: { status: CountdownStatus }) {
  const text: Record<CountdownStatus, string> = {
    upcoming: "Upcoming",
    "due-today": "Due today",
    overdue: "Overdue",
    completed: "Completed",
    archived: "Archived",
  };
  return (
    <span className={`countdown-badge ${status}`}>
      {status === "overdue" && <AlertTriangle size={13} />} {text[status]}
    </span>
  );
}
export function CountdownCard({
  item,
  categories,
  onOpen,
}: {
  item: Countdown;
  categories: Category[];
  onOpen: () => void;
}) {
  const status = statusFor(item);
  return (
    <button className="countdown-card" onClick={onOpen}>
      <div>
        <strong>
          {item.important && "★ "}
          {item.title}
        </strong>
        <span>{formatDue(item.dueAt, item.allDay)}</span>
        <CategoryBadge
          category={categories.find((x) => x.id === item.categoryId)}
        />
      </div>
      <div className="card-right">
        <CountdownBadge status={status} />
        <b>{timeLeft(item)}</b>
        <ChevronRight size={18} />
      </div>
    </button>
  );
}
export function ConfirmDialog({
  open,
  title,
  children,
  confirmText = "Confirm",
  onConfirm,
  onClose,
  danger = false,
  requireText,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  requireText?: string;
}) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <button
          className="icon-button close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
        <h2 id="dialog-title">{title}</h2>
        <div>{children}</div>
        {requireText ? (
          <ConfirmTyped
            value={requireText}
            onConfirm={onConfirm}
            onClose={onClose}
            danger={danger}
            confirmText={confirmText}
          />
        ) : (
          <div className="dialog-actions">
            <PixelButton onClick={onClose}>Cancel</PixelButton>
            <PixelButton className={danger ? "danger" : ""} onClick={onConfirm}>
              {confirmText}
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
function ConfirmTyped({
  value,
  onConfirm,
  onClose,
  danger,
  confirmText,
}: {
  value: string;
  onConfirm: () => void;
  onClose: () => void;
  danger: boolean;
  confirmText: string;
}) {
  const [typed, setTyped] = require("react").useState("");
  return (
    <>
      <input
        aria-label={`Type ${value} to confirm`}
        value={typed}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setTyped(e.target.value)
        }
        placeholder={`Type ${value}`}
      />
      <div className="dialog-actions">
        <PixelButton onClick={onClose}>Cancel</PixelButton>
        <PixelButton
          disabled={typed !== value}
          className={danger ? "danger" : ""}
          onClick={onConfirm}
        >
          {confirmText}
        </PixelButton>
      </div>
    </>
  );
}
export function ThemePreview({ theme }: { theme: string }) {
  return (
    <span
      className={`theme-preview ${theme}`}
      aria-label={`${theme} theme preview`}
    >
      <i />
      <i />
      <i />
    </span>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

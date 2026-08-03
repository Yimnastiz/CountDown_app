"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Repeat2 } from "lucide-react";
import { AppShell } from "./shell";
import { FormField, PixelButton, PixelCard } from "./ui";
import {
  categoryRepository,
  countdownRepository,
  settingsRepository,
} from "@/lib/repository";
import type {
  Category,
  Countdown,
  CountdownInput,
  RepeatType,
} from "@/lib/types";
import { disabledRecurrence, validateRecurrenceRule } from "@/lib/recurrence";
const repeats: RepeatType[] = [
  "never",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];
export function CountdownForm({ existing }: { existing?: Countdown }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initial = existing ?? {
    title: "",
    description: "",
    dueAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    allDay: true,
    categoryId: "personal",
    reminderDays: [7, 1],
    repeat: "never" as RepeatType,
    recurrence: disabledRecurrence,
    important: false,
    notes: "",
  };
  const [form, setForm] = useState(initial);
  const change = (key: keyof typeof form, value: string | boolean | number[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  useEffect(() => {
    setCategories(categoryRepository.list());
    if (!existing)
      setForm((x) => ({
        ...x,
        reminderDays: settingsRepository.get().defaultReminderDays,
      }));
  }, [existing]);
  const repeatChoice = !form.recurrence.enabled
    ? "never"
    : form.repeat === "custom" || form.recurrence.interval !== 1
      ? "custom"
      : form.recurrence.frequency === "day"
        ? "daily"
        : form.recurrence.frequency === "week"
          ? "weekly"
          : form.recurrence.frequency === "month"
            ? "monthly"
            : "yearly";
  const setRepeat = (value: RepeatType) => {
    if (value === "never") {
      setForm((prev) => ({
        ...prev,
        repeat: value,
        recurrence: disabledRecurrence,
      }));
      return;
    }
    if (value === "custom") {
      setForm((prev) => ({
        ...prev,
        repeat: "custom",
        recurrence: prev.recurrence.enabled
          ? prev.recurrence
          : {
              enabled: true,
              interval: 2,
              frequency: "week",
              end: { type: "never" },
            },
      }));
      return;
    }
    const frequency =
      value === "daily"
        ? "day"
        : value === "weekly"
          ? "week"
          : value === "monthly"
            ? "month"
            : "year";
    setForm((prev) => ({
      ...prev,
      repeat: value,
      recurrence: {
        enabled: true,
        interval: 1,
        frequency,
        end: { type: "never" },
      },
    }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const recurrenceError = validateRecurrenceRule(form.recurrence);
    if (!form.title.trim() || !form.dueAt || recurrenceError) {
      setError(recurrenceError ?? "Please add a title and due date.");
      return;
    }
    setBusy(true);
    const due = form.allDay
      ? `${form.dueAt.slice(0, 10)}T12:00:00`
      : form.dueAt;
    const saved = countdownRepository.save(
      {
        ...form,
        title: form.title.trim(),
        dueAt: new Date(due).toISOString(),
      } as CountdownInput,
      existing?.id,
    );
    router.push(`/countdowns/${saved.id}`);
  };
  return (
    <AppShell title={existing ? "Edit countdown" : "Add countdown"} back>
      <form onSubmit={submit} className="form-layout">
        <PixelCard>
          <div className="form-grid">
            <FormField
              label="Title"
              error={
                !form.title.trim() && error ? "Title is required." : undefined
              }
            >
              <input
                id="title"
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
                required
                placeholder="e.g. Renew vehicle tax"
              />
            </FormField>
            <FormField
              label="Due date"
              error={!form.dueAt && error ? "Due date is required." : undefined}
            >
              <input
                id="due-date"
                type={form.allDay ? "date" : "datetime-local"}
                value={
                  form.allDay
                    ? form.dueAt.slice(0, 10)
                    : form.dueAt.slice(0, 16)
                }
                onChange={(e) => change("dueAt", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Description">
              <input
                id="description"
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
                placeholder="Optional short detail"
              />
            </FormField>
            <FormField label="Category">
              <select
                id="category"
                value={form.categoryId}
                onChange={(e) => change("categoryId", e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} · {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Reminder days before">
              <input
                id="reminder-days-before"
                type="text"
                inputMode="numeric"
                value={form.reminderDays.join(", ")}
                onChange={(e) =>
                  change(
                    "reminderDays",
                    e.target.value
                      .split(",")
                      .map((n) => Number(n.trim()))
                      .filter((n) => Number.isFinite(n) && n >= 0),
                  )
                }
                aria-describedby="reminder-help"
              />
              <small id="reminder-help">
                Separate days with commas, for example 7, 1.
              </small>
            </FormField>
            <FormField label="Repeat">
              <select
                id="repeat"
                value={repeatChoice}
                onChange={(e) => setRepeat(e.target.value as RepeatType)}
              >
                {repeats.map((r) => (
                  <option key={r} value={r}>
                    {r === "never"
                      ? "Does not repeat"
                      : r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>
            {repeatChoice === "custom" && (
              <div
                className="custom-recurrence"
                aria-labelledby="repeat-custom-label"
              >
                <span id="repeat-custom-label">
                  <Repeat2 size={16} aria-hidden="true" /> Repeat every
                </span>
                <input
                  aria-label="Repeat interval"
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  value={form.recurrence.interval}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recurrence: {
                        ...prev.recurrence,
                        interval: Number(e.target.value),
                      },
                    }))
                  }
                />
                <select
                  aria-label="Repeat frequency"
                  value={form.recurrence.frequency}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recurrence: {
                        ...prev.recurrence,
                        frequency: e.target.value as
                          "day" | "week" | "month" | "year",
                      },
                    }))
                  }
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                <small>{`Every ${form.recurrence.interval} ${form.recurrence.frequency}${form.recurrence.interval === 1 ? "" : "s"}`}</small>
              </div>
            )}
            <FormField label="Notes">
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => change("notes", e.target.value)}
                placeholder="Optional private notes"
                rows={3}
              />
            </FormField>
          </div>
          <div className="toggle-row">
            <label>
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => change("allDay", e.target.checked)}
              />{" "}
              All-day event
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.important}
                onChange={(e) => change("important", e.target.checked)}
              />{" "}
              Mark as important
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </PixelCard>
        <div className="form-actions">
          <PixelButton type="button" onClick={() => router.back()}>
            Cancel
          </PixelButton>
          <PixelButton type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save countdown"}
          </PixelButton>
        </div>
      </form>
    </AppShell>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Repeat2, X } from "lucide-react";
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
import { parseLocalDateParam } from "@/lib/calendar";
const repeats: RepeatType[] = [
  "never",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];
const quickReminders = [0, 1, 3, 7, 14, 30];
const labelForReminder = (days: number) =>
  days === 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"} before`;
type FormMode = "page" | "modal";
export function CountdownForm({
  existing,
  prefillDate,
  mode = "page",
  onSaved,
  onCancel,
}: {
  existing?: Countdown;
  prefillDate?: string;
  mode?: FormMode;
  onSaved?: (item: Countdown) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customReminder, setCustomReminder] = useState("");
  const initial = useMemo(
    () =>
      existing ?? {
        title: "",
        description: "",
        dueAt: format(
          parseLocalDateParam(prefillDate, new Date()),
          "yyyy-MM-dd'T'HH:mm",
        ),
        allDay: true,
        categoryId: "personal",
        reminderDays: [7, 1],
        repeat: "never" as RepeatType,
        recurrence: disabledRecurrence,
        important: false,
        notes: "",
      },
    [existing, prefillDate],
  );
  const [form, setForm] = useState(initial);
  useEffect(() => {
    setCategories(categoryRepository.list());
    if (!existing)
      setForm((current) => ({
        ...current,
        reminderDays: settingsRepository.get().defaultReminderDays,
      }));
  }, [existing]);
  const change = (key: keyof typeof form, value: string | boolean | number[]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const reminders = Array.from(new Set(form.reminderDays))
    .filter((value) => Number.isInteger(value) && value >= 0)
    .sort((a, b) => a - b);
  const toggleReminder = (days: number) =>
    change(
      "reminderDays",
      reminders.includes(days)
        ? reminders.filter((value) => value !== days)
        : [...reminders, days],
    );
  const addCustom = () => {
    const days = Number(customReminder);
    if (!Number.isInteger(days) || days < 0) {
      setError("Custom reminder must be a whole number of 0 or more days.");
      return;
    }
    change(
      "reminderDays",
      reminders.includes(days) ? reminders : [...reminders, days],
    );
    setCustomReminder("");
    setShowCustom(false);
    setError("");
  };
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
      setForm((current) => ({
        ...current,
        repeat: value,
        recurrence: disabledRecurrence,
      }));
      return;
    }
    if (value === "custom") {
      setForm((current) => ({
        ...current,
        repeat: "custom",
        recurrence: current.recurrence.enabled
          ? current.recurrence
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
    setForm((current) => ({
      ...current,
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
        reminderDays: reminders,
        dueAt: new Date(due).toISOString(),
      } as CountdownInput,
      existing?.id,
    );
    if (onSaved) onSaved(saved);
    else router.push(`/countdowns/${saved.id}`);
  };
  const content = (
    <form onSubmit={submit} className={`form-layout form-${mode}`}>
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
              autoFocus={mode === "modal"}
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
              className="date-input"
              type={form.allDay ? "date" : "datetime-local"}
              value={
                form.allDay ? form.dueAt.slice(0, 10) : form.dueAt.slice(0, 16)
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
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="field reminder-field">
            <span>Reminder days before</span>
            <div
              className="reminder-chips"
              role="group"
              aria-label="Quick reminder days"
            >
              {quickReminders.map((days) => (
                <button
                  type="button"
                  key={days}
                  aria-pressed={reminders.includes(days)}
                  className={reminders.includes(days) ? "selected" : ""}
                  onClick={() => toggleReminder(days)}
                >
                  {reminders.includes(days) && (
                    <X size={14} aria-hidden="true" />
                  )}
                  {labelForReminder(days)}
                </button>
              ))}
              <button
                type="button"
                className="custom-reminder-trigger"
                onClick={() => setShowCustom((open) => !open)}
              >
                <Plus size={16} aria-hidden="true" />
                Custom
              </button>
            </div>
            {showCustom && (
              <div className="custom-reminder">
                <input
                  aria-label="Custom reminder days"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={customReminder}
                  onChange={(e) => setCustomReminder(e.target.value)}
                  placeholder="Days"
                />
                <PixelButton type="button" onClick={addCustom}>
                  Add
                </PixelButton>
              </div>
            )}
            <div className="chosen-reminders">
              {reminders
                .filter((days) => !quickReminders.includes(days))
                .map((days) => (
                  <button
                    type="button"
                    key={days}
                    onClick={() => toggleReminder(days)}
                    aria-label={`Remove ${labelForReminder(days)}`}
                  >
                    <X size={14} aria-hidden="true" />
                    {labelForReminder(days)}
                  </button>
                ))}
            </div>
          </div>
          <FormField label="Repeat">
            <select
              id="repeat"
              value={repeatChoice}
              onChange={(e) => setRepeat(e.target.value as RepeatType)}
            >
              {repeats.map((repeat) => (
                <option key={repeat} value={repeat}>
                  {repeat === "never"
                    ? "Does not repeat"
                    : repeat[0].toUpperCase() + repeat.slice(1)}
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
                <Repeat2 size={16} aria-hidden="true" />
                Repeat every
              </span>
              <input
                aria-label="Repeat interval"
                type="number"
                min="1"
                max="999"
                step="1"
                value={form.recurrence.interval}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    recurrence: {
                      ...current.recurrence,
                      interval: Number(e.target.value),
                    },
                  }))
                }
              />
              <select
                aria-label="Repeat frequency"
                value={form.recurrence.frequency}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    recurrence: {
                      ...current.recurrence,
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
            />
            All-day event
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.important}
              onChange={(e) => change("important", e.target.checked)}
            />
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
        <PixelButton type="button" onClick={onCancel ?? (() => router.back())}>
          Cancel
        </PixelButton>
        <PixelButton type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save countdown"}
        </PixelButton>
      </div>
    </form>
  );
  return mode === "modal" ? (
    content
  ) : (
    <AppShell title={existing ? "Edit countdown" : "Add countdown"} back>
      {content}
    </AppShell>
  );
}

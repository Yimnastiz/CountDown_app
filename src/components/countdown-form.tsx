"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, Repeat2 } from "lucide-react";
import { AppShell } from "./shell";
import { FormField, PixelButton, PixelCard } from "./ui";
import { useAppData } from "@/components/app-data";
import type {
  Category,
  Countdown,
  CountdownInput,
  RepeatType,
} from "@/lib/types";
import { disabledRecurrence, validateRecurrenceRule } from "@/lib/recurrence";
import { parseLocalDateParam } from "@/lib/calendar";
import { CategoryIcon } from "@/lib/icons";
import { ReminderSelector } from "./reminder-selector";
import { normalizeReminderDays } from "@/lib/reminders";
const repeats: RepeatType[] = [
  "never",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];
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
  const { categories, settings, saveCountdown } = useAppData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
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
        reminderDays: [1],
        repeat: "never" as RepeatType,
        recurrence: disabledRecurrence,
        important: false,
        notes: "",
      },
    [existing, prefillDate],
  );
  const [form, setForm] = useState(initial);
  useEffect(() => {
    if (!existing)
      setForm((current) => ({
        ...current,
        reminderDays: settings.defaultReminderDays,
      }));
  }, [existing, settings.defaultReminderDays]);
  const change = (key: keyof typeof form, value: string | boolean | number[]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const reminders = normalizeReminderDays(form.reminderDays);
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
  const submit = async (event: React.FormEvent) => {
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
    try {
      const saved = await saveCountdown(
        {
          ...form,
          title: form.title.trim(),
          reminderDays: reminders,
          dueDate: form.allDay ? form.dueAt.slice(0, 10) : undefined,
          dueAt: new Date(due).toISOString(),
        } as CountdownInput,
        existing?.id,
      );
      if (onSaved) onSaved(saved);
      else router.push(`/countdowns/${saved.id}`);
    } catch {
      setError("Could not save this countdown. Please try again.");
      setBusy(false);
    }
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
          <div className="field category-field">
            <span>Category</span>
            <div className="category-select">
              <button
                type="button"
                className="category-select-trigger"
                aria-haspopup="listbox"
                aria-expanded={categoryOpen}
                aria-controls="category-options"
                onClick={() => setCategoryOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setCategoryOpen(false);
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    const index = categories.findIndex(
                      (category) => category.id === form.categoryId,
                    );
                    const next =
                      categories[
                        (index +
                          (event.key === "ArrowDown"
                            ? 1
                            : categories.length - 1)) %
                          categories.length
                      ];
                    if (next) change("categoryId", next.id);
                  }
                }}
              >
                <CategoryIcon
                  name={
                    categories.find(
                      (category) => category.id === form.categoryId,
                    )?.icon
                  }
                  size={18}
                />
                <span>
                  {categories.find(
                    (category) => category.id === form.categoryId,
                  )?.name ?? "Choose category"}
                </span>
                <ChevronDown
                  className="category-select-chevron"
                  size={18}
                  aria-hidden="true"
                />
              </button>
              {categoryOpen && (
                <div
                  id="category-options"
                  className="category-select-options"
                  role="listbox"
                  aria-label="Category"
                >
                  {categories.map((category) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={category.id === form.categoryId}
                      key={category.id}
                      onClick={() => {
                        change("categoryId", category.id);
                        setCategoryOpen(false);
                      }}
                    >
                      <CategoryIcon name={category.icon} size={18} />
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <ReminderSelector
            value={reminders}
            onChange={(reminderDays) => change("reminderDays", reminderDays)}
          />
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

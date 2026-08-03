"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PixelButton } from "./ui";
import { normalizeReminderDays, toggleReminderDay } from "@/lib/reminders";

const quickDays = [0, 1];
const label = (days: number) =>
  days === 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"} before`;

export function ReminderSelector({
  value,
  onChange,
  label: fieldLabel = "Reminder days before",
}: {
  value: number[];
  onChange: (days: number[]) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const days = normalizeReminderDays(value);
  const add = () => {
    const next = Number(custom);
    if (!Number.isInteger(next) || next < 0 || next > 3650) {
      setError("Enter a whole number from 0 to 3650.");
      return;
    }
    onChange(normalizeReminderDays([...days, next]));
    setCustom("");
    setError("");
    setOpen(false);
  };
  return (
    <div className="field reminder-field">
      <span>{fieldLabel}</span>
      <div className="reminder-chips" role="group" aria-label={fieldLabel}>
        {quickDays.map((day) => (
          <button
            type="button"
            key={day}
            aria-pressed={days.includes(day)}
            className={days.includes(day) ? "selected" : ""}
            onClick={() => onChange(toggleReminderDay(days, day))}
          >
            {days.includes(day) && <X size={14} aria-hidden="true" />}
            {label(day)}
          </button>
        ))}
        <button
          type="button"
          className="custom-reminder-trigger"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Plus size={16} aria-hidden="true" />
          Custom
        </button>
      </div>
      {open && (
        <div className="custom-reminder">
          <input
            aria-label="Custom reminder days"
            type="number"
            inputMode="numeric"
            min="0"
            max="3650"
            step="1"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Days"
          />
          <PixelButton type="button" onClick={add}>
            Add
          </PixelButton>
        </div>
      )}
      {error && <small role="alert">{error}</small>}
      <div className="chosen-reminders">
        {days
          .filter((day) => !quickDays.includes(day))
          .map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => onChange(toggleReminderDay(days, day))}
              aria-label={`Remove ${label(day)}`}
            >
              <X size={14} aria-hidden="true" />
              {label(day)}
            </button>
          ))}
      </div>
    </div>
  );
}

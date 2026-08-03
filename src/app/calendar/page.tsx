"use client";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AppShell } from "@/components/shell";
import { CountdownForm } from "@/components/countdown-form";
import {
  CountdownCard,
  EmptyState,
  PixelButton,
  PixelCard,
} from "@/components/ui";
import { categoryRepository, countdownRepository } from "@/lib/repository";
import { sameDate, statusFor } from "@/lib/date";
import {
  isWeekendDate,
  monthFromSelection,
  sortCalendarDayItems,
} from "@/lib/calendar";
import type { Category, Countdown } from "@/lib/types";
import { occurrenceDateFor, withVirtualOccurrences } from "@/lib/occurrences";
export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [items, setItems] = useState<Countdown[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  const formDialog = useRef<HTMLElement>(null);
  useEffect(() => {
    setItems(countdownRepository.list());
    setCats(categoryRepository.list());
  }, []);
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );
  const displayItems = useMemo(
    () => withVirtualOccurrences(items, days[0], days[days.length - 1]),
    [items, days],
  );
  const agenda = sortCalendarDayItems(
    displayItems.filter(
      (i) => sameDate(i.dueAt, selected) && statusFor(i) !== "archived",
    ),
  );
  const closeForm = () => {
    setFormOpen(false);
    requestAnimationFrame(() => addButton.current?.focus());
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && formOpen) closeForm();
    };
    window.addEventListener("keydown", closeOnEscape);
    document.body.classList.toggle("modal-open", formOpen);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("modal-open");
    };
  }, [formOpen]);
  useEffect(() => {
    if (!formOpen) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !formDialog.current) return;
      const focusable = Array.from(
        formDialog.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => window.removeEventListener("keydown", trapFocus);
  }, [formOpen]);
  return (
    <AppShell title="Calendar">
      <div className="calendar-layout">
        <PixelCard className="calendar-card">
          <div className="calendar-controls">
            <PixelButton
              aria-label="Previous month"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft aria-hidden="true" />
            </PixelButton>
            <button
              className="month-year-button"
              aria-haspopup="dialog"
              onClick={() => {
                setPickerYear(month.getFullYear());
                setPickerMonth(month.getMonth());
                setPickerOpen(true);
              }}
            >
              {format(month, "MMMM yyyy")}
            </button>
            <PixelButton
              aria-label="Next month"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </PixelButton>
            <PixelButton
              className="today-button"
              onClick={() => {
                setMonth(new Date());
                setSelected(new Date());
              }}
            >
              Today
            </PixelButton>
          </div>
          <div className="weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (name, index) => (
                <span key={name} className={index >= 5 ? "weekend" : ""}>
                  {name}
                </span>
              ),
            )}
          </div>
          <div className="month-grid">
            {days.map((day) => {
              const dayItems = displayItems.filter(
                (i) => sameDate(i.dueAt, day) && statusFor(i) !== "completed",
              );
              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelected(day)}
                  className={`${!isSameMonth(day, month) ? "other-month " : ""}${isSameDay(day, selected) ? "selected " : ""}${isWeekendDate(day) ? "weekend" : ""}`}
                  aria-label={`Select ${format(day, "d MMMM")}`}
                >
                  <span>{format(day, "d")}</span>
                  {dayItems.length > 0 && (
                    <i aria-label={`${dayItems.length} events`} />
                  )}
                </button>
              );
            })}
          </div>
        </PixelCard>
        <section className="agenda">
          <div className="section-heading">
            <h2>{format(selected, "EEE, d MMM")}</h2>
            <button
              ref={addButton}
              className="pixel-button small-link"
              onClick={() => setFormOpen(true)}
            >
              Add
            </button>
          </div>
          {agenda.length ? (
            <div className="list">
              {agenda.map((i) => (
                <CountdownCard
                  key={i.id}
                  item={i}
                  categories={cats}
                  onOpen={() =>
                    location.assign(
                      i.isVirtualOccurrence
                        ? `/countdowns/${i.seriesId}?occurrence=${occurrenceDateFor(i)}`
                        : `/countdowns/${i.id}`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing due this day">
              Pick another date or add a countdown.
              <PixelButton onClick={() => setFormOpen(true)}>
                Add countdown
              </PixelButton>
            </EmptyState>
          )}
          {items.filter((i) => statusFor(i) === "overdue").length > 0 && (
            <p className="overdue-note">
              Overdue: {items.filter((i) => statusFor(i) === "overdue").length}{" "}
              item(s) remain.
            </p>
          )}
        </section>
      </div>
      {pickerOpen && (
        <div className="dialog-backdrop">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="month-year-title"
          >
            <h2 id="month-year-title">Choose month and year</h2>
            <div className="month-year-fields">
              <label className="field">
                Month
                <select
                  autoFocus
                  value={pickerMonth}
                  onChange={(e) => setPickerMonth(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, index) => (
                    <option value={index} key={index}>
                      {format(new Date(2020, index, 1), "MMMM")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Year (พ.ศ.)
                <select
                  value={pickerYear}
                  onChange={(e) => setPickerYear(Number(e.target.value))}
                >
                  {Array.from(
                    { length: 71 },
                    (_, index) => new Date().getFullYear() - 20 + index,
                  ).map((year) => (
                    <option value={year} key={year}>
                      {year + 543}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="dialog-actions">
              <PixelButton onClick={() => setPickerOpen(false)}>
                Cancel
              </PixelButton>
              <PixelButton
                onClick={() => {
                  const next = monthFromSelection(pickerYear, pickerMonth);
                  setMonth(next);
                  setSelected(next);
                  setPickerOpen(false);
                }}
              >
                Go to month
              </PixelButton>
            </div>
          </div>
        </div>
      )}
      {formOpen && (
        <div
          className="dialog-backdrop calendar-form-backdrop"
          role="presentation"
        >
          <section
            ref={formDialog}
            className="dialog calendar-form-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Add countdown"
          >
            <button
              className="icon-button close"
              aria-label="Close add countdown"
              onClick={closeForm}
            >
              <X aria-hidden="true" />
            </button>
            <h2>Add countdown</h2>
            <CountdownForm
              mode="modal"
              prefillDate={format(selected, "yyyy-MM-dd")}
              onCancel={closeForm}
              onSaved={() => {
                setItems(countdownRepository.list());
                setFeedback("Countdown added to the calendar.");
                closeForm();
              }}
            />
          </section>
        </div>
      )}
      {feedback && (
        <p className="calendar-feedback" role="status">
          {feedback}
        </p>
      )}
    </AppShell>
  );
}

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
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/shell";
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
export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [items, setItems] = useState<Countdown[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
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
  const agenda = sortCalendarDayItems(
    items.filter(
      (i) => sameDate(i.dueAt, selected) && statusFor(i) !== "archived",
    ),
  );
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
              const dayItems = items.filter(
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
            <Link
              className="pixel-link small-link"
              href={`/countdowns/new?date=${format(selected, "yyyy-MM-dd")}`}
            >
              Add
            </Link>
          </div>
          {agenda.length ? (
            <div className="list">
              {agenda.map((i) => (
                <CountdownCard
                  key={i.id}
                  item={i}
                  categories={cats}
                  onOpen={() => location.assign(`/countdowns/${i.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing due this day">
              Pick another date or add a countdown.
              <Link
                className="pixel-link"
                href={`/countdowns/new?date=${format(selected, "yyyy-MM-dd")}`}
              >
                Add countdown
              </Link>
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
    </AppShell>
  );
}

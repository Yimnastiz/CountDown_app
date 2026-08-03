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
import { byDue, sameDate, statusFor } from "@/lib/date";
import { isWeekendDate } from "@/lib/calendar";
import type { Category, Countdown } from "@/lib/types";
export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [items, setItems] = useState<Countdown[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
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
  const agenda = items
    .filter((i) => sameDate(i.dueAt, selected) && statusFor(i) !== "archived")
    .sort(byDue);
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
            <h2>{format(month, "MMMM yyyy")}</h2>
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
    </AppShell>
  );
}

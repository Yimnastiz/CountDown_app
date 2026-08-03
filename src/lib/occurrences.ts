import { isSameDay } from "date-fns";
import {
  combineLocalDateAndTime,
  dueDateKey,
  getLocalDateKey,
  incompleteStatusFor,
} from "./date";
import { getOccurrenceKey, getOccurrencesInRange } from "./recurrence";
import type { Countdown, RecurrenceException } from "./types";

export function resolveOccurrence(
  series: Countdown,
  occurrenceDate: string,
): Countdown {
  const exception = series.recurrenceExceptions?.find(
    (item) => item.occurrenceDate === occurrenceDate,
  );
  const dueAt = combineLocalDateAndTime(
    occurrenceDate,
    series.dueAt,
  ).toISOString();
  const status =
    exception?.status === "completed"
      ? "completed"
      : exception?.status === "cancelled"
        ? "archived"
        : incompleteStatusFor({
            dueAt,
            dueDate: series.allDay ? occurrenceDate : undefined,
          });
  return {
    ...series,
    id: getOccurrenceKey(series.id, occurrenceDate),
    seriesId: series.id,
    sourceOccurrenceId: series.id,
    dueDate: series.allDay ? occurrenceDate : undefined,
    dueAt,
    status,
    completedAt: exception?.completedAt,
    isVirtualOccurrence: true,
  };
}

export function occurrenceException(
  series: Countdown,
  occurrenceDate: string,
): RecurrenceException | undefined {
  return series.recurrenceExceptions?.find(
    (item) => item.occurrenceDate === occurrenceDate,
  );
}

export function getVirtualOccurrencesInRange(
  items: Countdown[],
  rangeStart: Date,
  rangeEnd: Date,
): Countdown[] {
  return items
    .filter((item) => item.recurrence.enabled && !item.sourceOccurrenceId)
    .flatMap((series) =>
      getOccurrencesInRange(
        series.dueAt,
        rangeStart,
        rangeEnd,
        series.recurrence,
        series.recurrenceStoppedAt,
      ).map((date) => resolveOccurrence(series, getLocalDateKey(date))),
    );
}

/** The only occurrence projection used by Dashboard and Calendar. */
export function withVirtualOccurrences(
  items: Countdown[],
  rangeStart: Date,
  rangeEnd: Date,
): Countdown[] {
  return [
    ...items.filter(
      (item) => !item.recurrence.enabled && !item.sourceOccurrenceId,
    ),
    ...getVirtualOccurrencesInRange(items, rangeStart, rangeEnd),
  ];
}

export function isOccurrenceInSeries(
  series: Countdown,
  occurrenceDate: string,
) {
  const target = new Date(
    combineLocalDateAndTime(occurrenceDate, series.dueAt).getTime(),
  );
  return getOccurrencesInRange(
    series.dueAt,
    target,
    target,
    series.recurrence,
    series.recurrenceStoppedAt,
  ).some((date) => isSameDay(date, target));
}

export function getCompletedHistory(items: Countdown[]): Countdown[] {
  const singles = items.filter(
    (item) =>
      !item.recurrence.enabled &&
      !item.sourceOccurrenceId &&
      (item.status === "completed" || item.status === "archived"),
  );
  const recurring = items
    .filter((item) => item.recurrence.enabled && !item.sourceOccurrenceId)
    .flatMap((series) =>
      (series.recurrenceExceptions ?? [])
        .filter((item) => item.status === "completed")
        .map((item) => resolveOccurrence(series, item.occurrenceDate)),
    );
  return [...singles, ...recurring];
}

export const occurrenceDateFor = (item: Countdown) => dueDateKey(item);

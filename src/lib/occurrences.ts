import { format } from "date-fns";
import { incompleteStatusFor } from "./date";
import { getOccurrenceKey, getOccurrencesInRange } from "./recurrence";
import type { Countdown } from "./types";

export function getVirtualOccurrencesInRange(
  items: Countdown[],
  rangeStart: Date,
  rangeEnd: Date,
): Countdown[] {
  const existing = new Set(
    items.map(
      (item) =>
        `${item.seriesId ?? item.id}:${format(new Date(item.dueAt), "yyyy-MM-dd")}`,
    ),
  );
  return items
    .filter(
      (item) =>
        item.recurrence.enabled &&
        !item.sourceOccurrenceId &&
        !item.recurrenceStoppedAt,
    )
    .flatMap((item) => {
      const seriesId = item.seriesId ?? item.id;
      return getOccurrencesInRange(
        item.dueAt,
        rangeStart,
        rangeEnd,
        item.recurrence,
        item.recurrenceStoppedAt,
      )
        .filter(
          (date) => !existing.has(`${seriesId}:${format(date, "yyyy-MM-dd")}`),
        )
        .map((date) => ({
          ...item,
          id: getOccurrenceKey(seriesId, date),
          seriesId,
          sourceOccurrenceId: item.id,
          dueAt: date.toISOString(),
          status: incompleteStatusFor({ dueAt: date.toISOString() }),
          completedAt: undefined,
          nextOccurrenceId: undefined,
          isVirtualOccurrence: true,
        }));
    });
}

export function withVirtualOccurrences(
  items: Countdown[],
  rangeStart: Date,
  rangeEnd: Date,
): Countdown[] {
  return [
    ...items,
    ...getVirtualOccurrencesInRange(items, rangeStart, rangeEnd),
  ];
}

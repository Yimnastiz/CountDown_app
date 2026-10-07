/** Returns the browser's IANA zone, with UTC as a safe portable fallback. */
export function getBrowserTimeZone(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) {
      new Intl.DateTimeFormat("en-US", { timeZone }).format();
      return timeZone;
    }
  } catch {
    // Some privacy-focused browsers can omit or reject the zone.
  }
  return "UTC";
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};
const zonedParts = (date: Date, timeZone: string): ZonedParts => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
};

/** Converts a local calendar date and clock time in an IANA zone to an instant. */
export function zonedDateTimeToDate(
  date: string,
  time: string,
  timeZone: string,
): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !clock) return undefined;
  const [year, month, day, hour, minute] = [
    ...match.slice(1),
    ...clock.slice(1),
  ].map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  try {
    let instant = utcGuess;
    for (let index = 0; index < 2; index += 1) {
      const inZone = zonedParts(new Date(instant), timeZone);
      const offset =
        Date.UTC(
          inZone.year,
          inZone.month - 1,
          inZone.day,
          inZone.hour,
          inZone.minute,
        ) - instant;
      instant = utcGuess - offset;
    }
    return new Date(instant);
  } catch {
    return undefined;
  }
}

export const timeInTimeZone = (date: Date, timeZone: string) => {
  const { hour, minute } = zonedParts(date, timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

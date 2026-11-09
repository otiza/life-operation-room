export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

type ZonedDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

/** UTC instant for a wall-clock time interpreted in `timeZone`. */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const parts = getZonedParts(new Date(utcGuessMs), timeZone);
  const asIfUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    millisecond,
  );
  return new Date(utcGuessMs - (asIfUtcMs - utcGuessMs));
}

export type DayBounds = {
  startOfToday: Date;
  startOfTomorrow: Date;
};

/** Calendar day bounds for `now` in an IANA timezone (exclusive end via startOfTomorrow). */
export function getDayBoundsInTimeZone(now: Date, timeZone: string): DayBounds {
  const parts = getZonedParts(now, timeZone);
  const startOfToday = zonedWallTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, 0, timeZone);
  const midday = zonedWallTimeToUtc(parts.year, parts.month, parts.day, 12, 0, 0, 0, timeZone);
  const nextCalendar = getZonedParts(new Date(midday.getTime() + 24 * 60 * 60 * 1000), timeZone);
  const startOfTomorrow = zonedWallTimeToUtc(
    nextCalendar.year,
    nextCalendar.month,
    nextCalendar.day,
    0,
    0,
    0,
    0,
    timeZone,
  );
  return { startOfToday, startOfTomorrow };
}

export function calendarDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

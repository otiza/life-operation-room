import { DateTime } from 'luxon';

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
  const dt = DateTime.fromJSDate(date, { zone: timeZone });
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: dt.hour,
    minute: dt.minute,
    second: dt.second,
  };
}

/**
 * UTC instant for a wall-clock time interpreted in `timeZone`.
 * Nonexistent times (spring-forward gap) shift forward.
 * Ambiguous times (fall-back) use the first (earlier) occurrence.
 * A second correction pass refines the offset near transitions.
 */
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
  let dt = DateTime.fromObject(
    { year, month, day, hour, minute, second, millisecond },
    { zone: timeZone },
  );

  if (!dt.isValid) {
    // Gap: add wall duration from start of day so Luxon lands after the jump.
    dt = DateTime.fromObject(
      { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: timeZone },
    ).plus({ hours: hour, minutes: minute, seconds: second, milliseconds: millisecond });
    return dt.toJSDate();
  }

  // Ambiguous fold: if one hour earlier still shows the same wall clock, prefer that (first) occurrence.
  const earlier = dt.minus({ hours: 1 });
  const earlierLocal = earlier.setZone(timeZone);
  if (
    earlierLocal.year === year &&
    earlierLocal.month === month &&
    earlierLocal.day === day &&
    earlierLocal.hour === hour &&
    earlierLocal.minute === minute &&
    earlierLocal.second === second
  ) {
    dt = earlier;
  }

  // Second correction pass against observed wall-clock parts.
  let utcMs = dt.toMillis();
  for (let pass = 0; pass < 2; pass++) {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === hour &&
      parts.minute === minute &&
      parts.second === second
    ) {
      break;
    }
    const asIfUtcMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      millisecond,
    );
    const wallAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
    utcMs -= asIfUtcMs - wallAsUtcMs;
  }
  return new Date(utcMs);
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

/** Wall-clock → UTC using Luxon `DateTime.fromObject` (gap → forward, fold → earlier). */
export function luxonWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  return zonedWallTimeToUtc(year, month, day, hour, minute, second, millisecond, timeZone);
}

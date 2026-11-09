import { Injectable } from '@nestjs/common';
import { calendarDateKeyInTimeZone } from '@erp-tiza/shared';
import { DateTime } from 'luxon';
import rrulePkg from 'rrule';
import type { CalendarEvent, CalendarEventException } from '../db/schema.js';

const { RRule, rrulestr } = rrulePkg;
type RRuleInstance = InstanceType<typeof RRule>;

function wallTimeToUtc(
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
    dt = DateTime.fromObject(
      { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
      { zone: timeZone },
    ).plus({ hours: hour, minutes: minute, seconds: second, milliseconds: millisecond });
    return dt.toJSDate();
  }
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
    return earlier.toJSDate();
  }
  return dt.toJSDate();
}

export type ExpandedOccurrence = {
  eventId: string;
  occurrenceStart: Date;
  startAt: Date | null;
  endAt: Date | null;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  title: string;
  description: string | null;
  location: string | null;
  timezone: string;
  color: string | null;
  isRecurring: boolean;
  cancelled: boolean;
};

function getZonedParts(date: Date, timeZone: string) {
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

function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

function dateKeyToFloatingDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function floatingDateToKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function durationMs(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

function allDayDurationDays(startDate: string, endDate: string): number {
  const start = dateKeyToFloatingDate(startDate).getTime();
  const end = dateKeyToFloatingDate(endDate).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

@Injectable()
export class RecurrenceService {
  expandEvent(
    event: CalendarEvent,
    exceptions: CalendarEventException[],
    rangeFrom: Date,
    rangeTo: Date,
  ): ExpandedOccurrence[] {
    if (!event.rrule) {
      return this.singleOccurrence(event, rangeFrom, rangeTo);
    }
    const exceptionByStart = new Map(
      exceptions.map((item) => [item.originalOccurrenceStart.toISOString(), item]),
    );

    if (event.isAllDay) {
      return this.expandAllDay(event, exceptionByStart, rangeFrom, rangeTo);
    }
    return this.expandTimed(event, exceptionByStart, rangeFrom, rangeTo);
  }

  /** Build RRULE string with UNTIL just before occurrenceStart (exclusive). */
  untilBeforeOccurrence(rrule: string, occurrenceStart: Date, timeZone: string, isAllDay: boolean): string {
    const until = new Date(occurrenceStart.getTime() - 1000);
    const untilUtc = isAllDay
      ? this.formatUntilAllDay(until)
      : this.formatUntilTimed(until, timeZone);
    const cleaned = rrule
      .split(';')
      .filter((part) => !part.toUpperCase().startsWith('UNTIL=') && !part.toUpperCase().startsWith('COUNT='))
      .join(';');
    return `${cleaned};UNTIL=${untilUtc}`;
  }

  private singleOccurrence(
    event: CalendarEvent,
    rangeFrom: Date,
    rangeTo: Date,
  ): ExpandedOccurrence[] {
    if (event.isAllDay) {
      if (!event.startDate || !event.endDate) return [];
      const startKey = event.startDate;
      const endKey = event.endDate;
      const rangeStartKey = calendarDateKeyInTimeZone(rangeFrom, event.timezone);
      const rangeEndKey = calendarDateKeyInTimeZone(rangeTo, event.timezone);
      if (endKey <= rangeStartKey || startKey >= rangeEndKey) return [];
      return [
        {
          eventId: event.id,
          occurrenceStart: dateKeyToFloatingDate(startKey),
          startAt: null,
          endAt: null,
          startDate: startKey,
          endDate: endKey,
          isAllDay: true,
          title: event.title,
          description: event.description,
          location: event.location,
          timezone: event.timezone,
          color: event.color,
          isRecurring: false,
          cancelled: false,
        },
      ];
    }
    if (!event.startAt || !event.endAt) return [];
    if (event.endAt <= rangeFrom || event.startAt >= rangeTo) return [];
    return [
      {
        eventId: event.id,
        occurrenceStart: event.startAt,
        startAt: event.startAt,
        endAt: event.endAt,
        startDate: null,
        endDate: null,
        isAllDay: false,
        title: event.title,
        description: event.description,
        location: event.location,
        timezone: event.timezone,
        color: event.color,
        isRecurring: false,
        cancelled: false,
      },
    ];
  }

  private expandTimed(
    event: CalendarEvent,
    exceptionByStart: Map<string, CalendarEventException>,
    rangeFrom: Date,
    rangeTo: Date,
  ): ExpandedOccurrence[] {
    if (!event.startAt || !event.endAt || !event.rrule) return [];
    const tz = event.timezone;
    const startParts = getZonedParts(event.startAt, tz);
    const dtstartFloating = new Date(
      Date.UTC(startParts.year, startParts.month - 1, startParts.day, startParts.hour, startParts.minute, startParts.second),
    );
    const length = durationMs(event.startAt, event.endAt);
    const rule = this.parseRule(event.rrule, dtstartFloating);

    const rangeStartParts = getZonedParts(rangeFrom, tz);
    const rangeEndParts = getZonedParts(rangeTo, tz);
    const betweenStart = new Date(
      Date.UTC(rangeStartParts.year, rangeStartParts.month - 1, rangeStartParts.day, 0, 0, 0),
    );
    const betweenEnd = new Date(
      Date.UTC(rangeEndParts.year, rangeEndParts.month - 1, rangeEndParts.day, 23, 59, 59),
    );

    const floatingOccurrences = rule.between(betweenStart, betweenEnd, true);
    const results: ExpandedOccurrence[] = [];

    for (const floating of floatingOccurrences) {
      const occurrenceUtc = wallTimeToUtc(
        floating.getUTCFullYear(),
        floating.getUTCMonth() + 1,
        floating.getUTCDate(),
        floating.getUTCHours(),
        floating.getUTCMinutes(),
        floating.getUTCSeconds(),
        0,
        tz,
      );
      const endUtc = new Date(occurrenceUtc.getTime() + length);
      if (endUtc <= rangeFrom || occurrenceUtc >= rangeTo) continue;

      const exception = exceptionByStart.get(occurrenceUtc.toISOString());
      if (exception?.cancelled) continue;

      if (exception && !exception.cancelled) {
        results.push(this.occurrenceFromException(event, exception, occurrenceUtc, true));
        continue;
      }

      results.push({
        eventId: event.id,
        occurrenceStart: occurrenceUtc,
        startAt: occurrenceUtc,
        endAt: endUtc,
        startDate: null,
        endDate: null,
        isAllDay: false,
        title: event.title,
        description: event.description,
        location: event.location,
        timezone: event.timezone,
        color: event.color,
        isRecurring: true,
        cancelled: false,
      });
    }
    return results;
  }

  private expandAllDay(
    event: CalendarEvent,
    exceptionByStart: Map<string, CalendarEventException>,
    rangeFrom: Date,
    rangeTo: Date,
  ): ExpandedOccurrence[] {
    if (!event.startDate || !event.endDate || !event.rrule) return [];
    const days = allDayDurationDays(event.startDate, event.endDate);
    const dtstartFloating = dateKeyToFloatingDate(event.startDate);
    const rule = this.parseRule(event.rrule, dtstartFloating);

    const rangeStartKey = calendarDateKeyInTimeZone(rangeFrom, event.timezone);
    const rangeEndKey = calendarDateKeyInTimeZone(rangeTo, event.timezone);
    const betweenStart = dateKeyToFloatingDate(addCalendarDays(rangeStartKey, -days));
    const betweenEnd = dateKeyToFloatingDate(addCalendarDays(rangeEndKey, 1));

    const floatingOccurrences = rule.between(betweenStart, betweenEnd, true);
    const results: ExpandedOccurrence[] = [];

    for (const floating of floatingOccurrences) {
      const startKey = floatingDateToKey(floating);
      const endKey = addCalendarDays(startKey, days);
      if (endKey <= rangeStartKey || startKey >= rangeEndKey) continue;

      const occurrenceStart = dateKeyToFloatingDate(startKey);
      const exception = exceptionByStart.get(occurrenceStart.toISOString());
      if (exception?.cancelled) continue;

      if (exception && !exception.cancelled) {
        results.push(this.occurrenceFromException(event, exception, occurrenceStart, true));
        continue;
      }

      results.push({
        eventId: event.id,
        occurrenceStart,
        startAt: null,
        endAt: null,
        startDate: startKey,
        endDate: endKey,
        isAllDay: true,
        title: event.title,
        description: event.description,
        location: event.location,
        timezone: event.timezone,
        color: event.color,
        isRecurring: true,
        cancelled: false,
      });
    }
    return results;
  }

  private occurrenceFromException(
    event: CalendarEvent,
    exception: CalendarEventException,
    occurrenceStart: Date,
    isRecurring: boolean,
  ): ExpandedOccurrence {
    const isAllDay = exception.isAllDay ?? event.isAllDay;
    return {
      eventId: event.id,
      occurrenceStart,
      startAt: isAllDay ? null : (exception.startAt ?? event.startAt),
      endAt: isAllDay ? null : (exception.endAt ?? event.endAt),
      startDate: isAllDay ? (exception.startDate ?? event.startDate) : null,
      endDate: isAllDay ? (exception.endDate ?? event.endDate) : null,
      isAllDay,
      title: exception.title ?? event.title,
      description: exception.description !== undefined ? exception.description : event.description,
      location: exception.location !== undefined ? exception.location : event.location,
      timezone: exception.timezone ?? event.timezone,
      color: event.color,
      isRecurring,
      cancelled: false,
    };
  }

  private parseRule(rrule: string, dtstart: Date): RRuleInstance {
    const text = rrule.toUpperCase().startsWith('RRULE:') ? rrule : `RRULE:${rrule}`;
    const parsed = rrulestr(text, { dtstart }) as RRuleInstance | { rrules: () => RRuleInstance[] };
    if (parsed instanceof RRule) return parsed;
    const first = parsed.rrules()[0];
    if (!first) throw new Error('Invalid rrule');
    return first;
  }

  private formatUntilTimed(until: Date, timeZone: string): string {
    const parts = getZonedParts(until, timeZone);
    return `${parts.year}${String(parts.month).padStart(2, '0')}${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}${String(parts.minute).padStart(2, '0')}${String(parts.second).padStart(2, '0')}Z`;
  }

  private formatUntilAllDay(until: Date): string {
    return `${until.getUTCFullYear()}${String(until.getUTCMonth() + 1).padStart(2, '0')}${String(until.getUTCDate()).padStart(2, '0')}`;
  }
}

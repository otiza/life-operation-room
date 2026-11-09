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

  /**
   * End a series just before `occurrenceStart`.
   * Timed UNTIL is a true UTC instant (`YYYYMMDDTHHMMSSZ`).
   * All-day UNTIL is a DATE value (day before the occurrence date).
   * COUNT is stripped (replaced by UNTIL).
   */
  untilBeforeOccurrence(rrule: string, occurrenceStart: Date, _timeZone: string, isAllDay: boolean): string {
    const untilValue = isAllDay
      ? this.formatUntilAllDay(new Date(occurrenceStart.getTime() - 24 * 60 * 60 * 1000))
      : this.formatUntilUtcInstant(new Date(occurrenceStart.getTime() - 1000));
    const cleaned = this.stripRruleParts(rrule, ['UNTIL', 'COUNT']);
    return `${cleaned};UNTIL=${untilValue}`;
  }

  /** Remaining COUNT for a series split at `occurrenceStart` (inclusive of that occurrence). */
  remainingCountAfterSplit(
    rrule: string,
    seriesStart: Date,
    occurrenceStart: Date,
    timeZone: string,
    isAllDay: boolean,
  ): number | null {
    const count = this.parseCount(rrule);
    if (count == null) return null;
    const elapsed = this.countOccurrencesBefore(
      this.stripRruleParts(rrule, ['UNTIL']),
      seriesStart,
      occurrenceStart,
      timeZone,
      isAllDay,
    );
    return Math.max(count - elapsed, 1);
  }

  withCount(rrule: string, count: number): string {
    const cleaned = this.stripRruleParts(rrule, ['UNTIL', 'COUNT']);
    return `${cleaned};COUNT=${count}`;
  }

  parseCount(rrule: string): number | null {
    const match = rrule.toUpperCase().match(/(?:^|;)COUNT=(\d+)/);
    return match ? Number(match[1]) : null;
  }

  parseUntilUtc(rrule: string): Date | null {
    const match = rrule.toUpperCase().match(/(?:^|;)UNTIL=([0-9TZX]+)/);
    if (!match) return null;
    const raw = match[1];
    if (raw.length === 8) {
      const year = Number(raw.slice(0, 4));
      const month = Number(raw.slice(4, 6));
      const day = Number(raw.slice(6, 8));
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    }
    const normalized = raw.endsWith('Z') ? raw : `${raw}Z`;
    const iso = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}T${normalized.slice(9, 11)}:${normalized.slice(11, 13)}:${normalized.slice(13, 15)}Z`;
    return new Date(iso);
  }

  stripRruleParts(rrule: string, keys: string[]): string {
    const upperKeys = new Set(keys.map((key) => key.toUpperCase()));
    return rrule
      .replace(/^RRULE:/i, '')
      .split(';')
      .filter((part) => {
        const key = part.split('=')[0]?.toUpperCase();
        return key && !upperKeys.has(key);
      })
      .join(';');
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

    const rangeStartParts = getZonedParts(rangeFrom, tz);
    const rangeEndParts = getZonedParts(rangeTo, tz);
    const betweenStart = new Date(
      Date.UTC(rangeStartParts.year, rangeStartParts.month - 1, rangeStartParts.day, 0, 0, 0),
    );
    const betweenEnd = new Date(
      Date.UTC(rangeEndParts.year, rangeEndParts.month - 1, rangeEndParts.day, 23, 59, 59),
    );

    const untilUtc = this.parseUntilUtc(event.rrule);
    const ruleText = this.stripRruleParts(event.rrule, ['UNTIL']);
    const expandRule = this.parseRule(ruleText, dtstartFloating);
    const floatingOccurrences = expandRule.between(betweenStart, betweenEnd, true);
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
      if (untilUtc && occurrenceUtc.getTime() > untilUtc.getTime()) continue;
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
    const untilUtc = this.parseUntilUtc(event.rrule);
    const rule = this.parseRule(this.stripRruleParts(event.rrule, ['UNTIL']), dtstartFloating);

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
      if (untilUtc && occurrenceStart.getTime() > untilUtc.getTime()) continue;
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

  private countOccurrencesBefore(
    rrule: string,
    seriesStart: Date,
    occurrenceStart: Date,
    timeZone: string,
    isAllDay: boolean,
  ): number {
    if (isAllDay) {
      const startKey = calendarDateKeyInTimeZone(seriesStart, 'UTC');
      const endKey = calendarDateKeyInTimeZone(occurrenceStart, 'UTC');
      const dtstart = dateKeyToFloatingDate(startKey);
      const rule = this.parseRule(this.stripRruleParts(rrule, ['UNTIL']), dtstart);
      const untilFloating = dateKeyToFloatingDate(endKey);
      return rule
        .between(dtstart, untilFloating, true)
        .filter((item) => item.getTime() < untilFloating.getTime()).length;
    }
    const startParts = getZonedParts(seriesStart, timeZone);
    const dtstart = new Date(
      Date.UTC(
        startParts.year,
        startParts.month - 1,
        startParts.day,
        startParts.hour,
        startParts.minute,
        startParts.second,
      ),
    );
    const rule = this.parseRule(this.stripRruleParts(rrule, ['UNTIL']), dtstart);
    const endParts = getZonedParts(occurrenceStart, timeZone);
    const untilFloating = new Date(
      Date.UTC(
        endParts.year,
        endParts.month - 1,
        endParts.day,
        endParts.hour,
        endParts.minute,
        endParts.second,
      ),
    );
    return rule
      .between(dtstart, untilFloating, true)
      .filter((item) => item.getTime() < untilFloating.getTime()).length;
  }

  private parseRule(rrule: string, dtstart: Date): RRuleInstance {
    const text = rrule.toUpperCase().startsWith('RRULE:') ? rrule : `RRULE:${rrule}`;
    const parsed = rrulestr(text, { dtstart }) as RRuleInstance | { rrules: () => RRuleInstance[] };
    if (parsed instanceof RRule) return parsed;
    const first = parsed.rrules()[0];
    if (!first) throw new Error('Invalid rrule');
    return first;
  }

  private formatUntilUtcInstant(until: Date): string {
    return until.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  private formatUntilAllDay(until: Date): string {
    return `${until.getUTCFullYear()}${String(until.getUTCMonth() + 1).padStart(2, '0')}${String(until.getUTCDate()).padStart(2, '0')}`;
  }
}

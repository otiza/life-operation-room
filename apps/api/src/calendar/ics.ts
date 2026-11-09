import { DateTime } from 'luxon';
import type { CalendarEvent, CalendarEventException } from '../db/schema.js';

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return parts.join('\r\n');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatDateKey(dateKey: string): string {
  return dateKey.replace(/-/g, '');
}

function formatLocalStamp(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat("yyyyMMdd'T'HHmmss");
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`;
}

function vtimeZoneBlock(timeZone: string): string[] {
  const now = DateTime.now().setZone(timeZone);
  const winter = DateTime.fromObject({ year: now.year, month: 1, day: 15 }, { zone: timeZone });
  const summer = DateTime.fromObject({ year: now.year, month: 7, day: 15 }, { zone: timeZone });
  const standardOffset = winter.offset;
  const daylightOffset = summer.offset;
  const lines = ['BEGIN:VTIMEZONE', `TZID:${timeZone}`, `X-LIC-LOCATION:${timeZone}`];
  if (standardOffset === daylightOffset) {
    lines.push(
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      `TZOFFSETFROM:${formatOffset(standardOffset)}`,
      `TZOFFSETTO:${formatOffset(standardOffset)}`,
      'TZNAME:STD',
      'END:STANDARD',
    );
  } else {
    lines.push(
      'BEGIN:DAYLIGHT',
      'DTSTART:19700329T020000',
      `TZOFFSETFROM:${formatOffset(standardOffset)}`,
      `TZOFFSETTO:${formatOffset(daylightOffset)}`,
      'TZNAME:DAYLIGHT',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'DTSTART:19701025T030000',
      `TZOFFSETFROM:${formatOffset(daylightOffset)}`,
      `TZOFFSETTO:${formatOffset(standardOffset)}`,
      'TZNAME:STANDARD',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
    );
  }
  lines.push('END:VTIMEZONE');
  return lines;
}

function masterEventLines(event: CalendarEvent, exceptions: CalendarEventException[]): string[] {
  const lines: string[] = ['BEGIN:VEVENT', `UID:${event.id}@tiza-calendar`];
  lines.push(`DTSTAMP:${formatUtcStamp(event.updatedAt)}`);
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);

  if (event.isAllDay && event.startDate && event.endDate) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateKey(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateKey(event.endDate)}`);
  } else if (event.startAt && event.endAt) {
    lines.push(`DTSTART;TZID=${event.timezone}:${formatLocalStamp(event.startAt, event.timezone)}`);
    lines.push(`DTEND;TZID=${event.timezone}:${formatLocalStamp(event.endAt, event.timezone)}`);
  }

  if (event.rrule) {
    const rule = event.rrule.toUpperCase().startsWith('RRULE:') ? event.rrule.slice(6) : event.rrule;
    lines.push(`RRULE:${rule}`);
  }

  const cancelled = exceptions.filter((item) => item.cancelled);
  for (const exception of cancelled) {
    if (event.isAllDay) {
      const dateKey = DateTime.fromJSDate(exception.originalOccurrenceStart, { zone: 'utc' }).toFormat('yyyyMMdd');
      lines.push(`EXDATE;VALUE=DATE:${dateKey}`);
    } else {
      lines.push(
        `EXDATE;TZID=${event.timezone}:${formatLocalStamp(exception.originalOccurrenceStart, event.timezone)}`,
      );
    }
  }

  lines.push('END:VEVENT');
  return lines;
}

function overrideEventLines(event: CalendarEvent, exception: CalendarEventException): string[] {
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${event.id}@tiza-calendar`,
    `DTSTAMP:${formatUtcStamp(exception.updatedAt)}`,
    `SUMMARY:${escapeText(exception.title ?? event.title)}`,
  ];
  if ((exception.description ?? event.description) != null) {
    lines.push(`DESCRIPTION:${escapeText((exception.description ?? event.description) as string)}`);
  }
  if ((exception.location ?? event.location) != null) {
    lines.push(`LOCATION:${escapeText((exception.location ?? event.location) as string)}`);
  }

  const isAllDay = exception.isAllDay ?? event.isAllDay;
  if (isAllDay) {
    lines.push(
      `RECURRENCE-ID;VALUE=DATE:${DateTime.fromJSDate(exception.originalOccurrenceStart, { zone: 'utc' }).toFormat('yyyyMMdd')}`,
    );
    const startDate = exception.startDate ?? event.startDate;
    const endDate = exception.endDate ?? event.endDate;
    if (startDate) lines.push(`DTSTART;VALUE=DATE:${formatDateKey(startDate)}`);
    if (endDate) lines.push(`DTEND;VALUE=DATE:${formatDateKey(endDate)}`);
  } else {
    const tz = exception.timezone ?? event.timezone;
    lines.push(`RECURRENCE-ID;TZID=${tz}:${formatLocalStamp(exception.originalOccurrenceStart, tz)}`);
    const startAt = exception.startAt ?? event.startAt;
    const endAt = exception.endAt ?? event.endAt;
    if (startAt) lines.push(`DTSTART;TZID=${tz}:${formatLocalStamp(startAt, tz)}`);
    if (endAt) lines.push(`DTEND;TZID=${tz}:${formatLocalStamp(endAt, tz)}`);
  }

  lines.push('END:VEVENT');
  return lines;
}

export function serializeIcsCalendar(
  events: Array<{ event: CalendarEvent; exceptions: CalendarEventException[] }>,
  calendarName: string,
): string {
  const zones = new Set(
    events
      .filter((item) => !item.event.isAllDay)
      .map((item) => item.event.timezone)
      .filter(Boolean),
  );
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tiza//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const zone of zones) {
    lines.push(...vtimeZoneBlock(zone));
  }
  for (const item of events) {
    lines.push(...masterEventLines(item.event, item.exceptions));
    for (const exception of item.exceptions.filter((row) => !row.cancelled)) {
      lines.push(...overrideEventLines(item.event, exception));
    }
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

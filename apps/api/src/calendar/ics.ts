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

function eventLines(
  event: CalendarEvent,
  exceptions: CalendarEventException[],
): string[] {
  const lines: string[] = ['BEGIN:VEVENT', `UID:${event.id}@tiza-calendar`];
  lines.push(`DTSTAMP:${formatUtcStamp(event.updatedAt)}`);
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);

  if (event.isAllDay && event.startDate && event.endDate) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateKey(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateKey(event.endDate)}`);
  } else if (event.startAt && event.endAt) {
    lines.push(`DTSTART:${formatUtcStamp(event.startAt)}`);
    lines.push(`DTEND:${formatUtcStamp(event.endAt)}`);
  }

  if (event.rrule) {
    const rule = event.rrule.toUpperCase().startsWith('RRULE:') ? event.rrule.slice(6) : event.rrule;
    lines.push(`RRULE:${rule}`);
  }

  for (const exception of exceptions) {
    if (exception.cancelled) {
      lines.push(`EXDATE:${formatUtcStamp(exception.originalOccurrenceStart)}`);
    }
  }

  lines.push('END:VEVENT');
  return lines;
}

export function serializeIcsCalendar(
  events: Array<{ event: CalendarEvent; exceptions: CalendarEventException[] }>,
  calendarName: string,
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tiza//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const item of events) {
    lines.push(...eventLines(item.event, item.exceptions));
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

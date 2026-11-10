import { toIso } from '../common/utils/crypto.js';
import type { CalendarEvent } from '../db/schema.js';

export function calendarEventToDto(event: CalendarEvent) {
  return {
    id: event.id,
    workspaceId: event.workspaceId,
    title: event.title,
    description: event.description,
    location: event.location,
    isAllDay: event.isAllDay,
    startAt: toIso(event.startAt),
    endAt: toIso(event.endAt),
    startDate: event.startDate,
    endDate: event.endDate,
    timezone: event.timezone,
    rrule: event.rrule,
    kind: event.kind as 'event' | 'time_block',
    color: event.color,
    source: event.source,
    externalId: event.externalId,
    createdByUserId: event.createdByUserId,
    deletedAt: toIso(event.deletedAt),
    createdAt: toIso(event.createdAt)!,
    updatedAt: toIso(event.updatedAt)!,
  };
}

export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

import type {
  CalendarEventDto,
  CalendarIcsTokenCreated,
  CalendarIcsTokenStatus,
  CalendarOccurrence,
  CalendarSettings,
  CreateCalendarEventInput,
  CreateTimeBlockInput,
  DeleteCalendarEventInput,
  UpdateCalendarEventInput,
  UpdateCalendarSettingsInput,
} from '@erp-tiza/shared';
import { api } from '../../lib/api';

export type CalendarEvent = CalendarEventDto;
export type CalendarOccurrenceDto = CalendarOccurrence;

export function viewerTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function getCalendarSettings(workspaceId: string) {
  return api<{ settings: CalendarSettings }>(`/workspaces/${workspaceId}/calendar/settings`);
}

export async function updateCalendarSettings(workspaceId: string, input: UpdateCalendarSettingsInput) {
  return api<{ settings: CalendarSettings }>(`/workspaces/${workspaceId}/calendar/settings`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function listCalendarEvents(workspaceId: string, from: string, to: string, tz?: string) {
  const params = new URLSearchParams({
    from,
    to,
    tz: tz ?? viewerTimeZone(),
  });
  return api<{ events: CalendarOccurrenceDto[] }>(
    `/workspaces/${workspaceId}/calendar/events?${params.toString()}`,
  );
}

export async function createCalendarEvent(workspaceId: string, input: CreateCalendarEventInput) {
  return api<{ event: CalendarEvent }>(`/workspaces/${workspaceId}/calendar/events`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCalendarEvent(
  workspaceId: string,
  eventId: string,
  input: UpdateCalendarEventInput,
) {
  return api<{ event: CalendarEvent }>(`/workspaces/${workspaceId}/calendar/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteCalendarEvent(
  workspaceId: string,
  eventId: string,
  input: DeleteCalendarEventInput = { scope: 'all' },
) {
  return api<{ ok: boolean }>(`/workspaces/${workspaceId}/calendar/events/${eventId}`, {
    method: 'DELETE',
    body: JSON.stringify(input),
  });
}

export async function restoreCalendarEvent(workspaceId: string, eventId: string) {
  return api<{ event: CalendarEvent }>(
    `/workspaces/${workspaceId}/calendar/events/${eventId}/restore`,
    { method: 'POST' },
  );
}

export async function createTimeBlock(workspaceId: string, input: CreateTimeBlockInput) {
  return api<{ event: CalendarEvent }>(`/workspaces/${workspaceId}/calendar/time-blocks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getIcsTokenStatus(workspaceId: string) {
  return api<{ status: CalendarIcsTokenStatus }>(`/workspaces/${workspaceId}/calendar/ics-token`);
}

export async function regenerateIcsToken(workspaceId: string) {
  return api<{ token: CalendarIcsTokenCreated }>(
    `/workspaces/${workspaceId}/calendar/ics-token/regenerate`,
    { method: 'POST' },
  );
}

export async function revokeIcsToken(workspaceId: string) {
  return api<{ ok: boolean }>(`/workspaces/${workspaceId}/calendar/ics-token/revoke`, {
    method: 'POST',
  });
}

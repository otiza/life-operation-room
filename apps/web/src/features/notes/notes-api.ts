import type { Note, PromoteChecklistLineInput, PromoteChecklistLineResult, UpdateNoteBodyInput } from '@erp-tiza/shared';
import { api } from '../../lib/api';
import { viewerTimeZone } from '../calendar/calendar-api';

export type { Note };

export async function getTodayNote(workspaceId: string, tz?: string) {
  const params = new URLSearchParams({ tz: tz ?? viewerTimeZone() });
  return api<{ note: Note }>(`/workspaces/${workspaceId}/notes/today?${params.toString()}`);
}

export async function getNoteByDay(workspaceId: string, day: string, tz?: string) {
  const params = new URLSearchParams({ tz: tz ?? viewerTimeZone() });
  return api<{ note: Note }>(
    `/workspaces/${workspaceId}/notes/by-day/${day}?${params.toString()}`,
  );
}

export async function updateNoteBody(workspaceId: string, noteId: string, input: UpdateNoteBodyInput) {
  return api<{ note: Note }>(`/workspaces/${workspaceId}/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function promoteChecklistLine(
  workspaceId: string,
  noteId: string,
  input: PromoteChecklistLineInput,
) {
  return api<PromoteChecklistLineResult>(`/workspaces/${workspaceId}/notes/${noteId}/promote`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

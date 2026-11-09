import type {
  CreateTaskInput,
  ListTasksQueryInput,
  ReorderTasksInput,
  TaskDto,
  TaskSettings,
  UpdateTaskInput,
  UpdateTaskSettingsInput,
} from '@erp-tiza/shared';
import { api } from '../../lib/api';

export type Task = TaskDto;

export async function getTaskSettings(workspaceId: string) {
  return api<{ settings: TaskSettings }>(`/workspaces/${workspaceId}/tasks/settings`);
}

export async function updateTaskSettings(workspaceId: string, input: UpdateTaskSettingsInput) {
  return api<{ settings: TaskSettings }>(`/workspaces/${workspaceId}/tasks/settings`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function listTasks(workspaceId: string, query: ListTasksQueryInput = {}) {
  const params = new URLSearchParams();
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.status) params.set('status', query.status);
  if (query.assignee) params.set('assignee', query.assignee);
  if (query.due) params.set('due', query.due);
  if (query.view) params.set('view', query.view);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  params.set('tz', query.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return api<{ tasks: Task[] }>(`/workspaces/${workspaceId}/tasks${suffix}`);
}

export type ProjectTaskCount = { total: number; open: number };

export type TaskViewCounts = {
  inbox: number;
  today: number;
  upcoming: number;
  anytime: number;
  someday: number;
  logbook: number;
};

export async function countsByProject(workspaceId: string) {
  return api<{ counts: Record<string, ProjectTaskCount> }>(
    `/workspaces/${workspaceId}/tasks/counts-by-project`,
  );
}

export async function taskCounts(workspaceId: string, tz?: string) {
  const params = new URLSearchParams();
  params.set('tz', tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  return api<{ counts: { views: TaskViewCounts; projects: Record<string, ProjectTaskCount> } }>(
    `/workspaces/${workspaceId}/tasks/counts?${params.toString()}`,
  );
}

export async function getTask(workspaceId: string, taskId: string) {
  return api<{ task: Task }>(`/workspaces/${workspaceId}/tasks/${taskId}`);
}

export async function createTask(workspaceId: string, input: CreateTaskInput) {
  return api<{ task: Task }>(`/workspaces/${workspaceId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateTask(workspaceId: string, taskId: string, input: UpdateTaskInput) {
  return api<{ task: Task }>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function reorderTasks(workspaceId: string, input: ReorderTasksInput) {
  return api<{ tasks: Task[] }>(`/workspaces/${workspaceId}/tasks/reorder`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteTask(workspaceId: string, taskId: string) {
  return api<{ ok: boolean }>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function restoreTask(workspaceId: string, taskId: string) {
  return api<{ task: Task }>(`/workspaces/${workspaceId}/tasks/${taskId}/restore`, {
    method: 'POST',
  });
}

import type {
  CreateTaskInput,
  ListTasksQuery,
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

export async function listTasks(workspaceId: string, query: ListTasksQuery = {}) {
  const params = new URLSearchParams();
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.status) params.set('status', query.status);
  if (query.assignee) params.set('assignee', query.assignee);
  if (query.due) params.set('due', query.due);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return api<{ tasks: Task[] }>(`/workspaces/${workspaceId}/tasks${suffix}`);
}

export type ProjectTaskCount = { total: number; open: number };

export async function countsByProject(workspaceId: string) {
  return api<{ counts: Record<string, ProjectTaskCount> }>(
    `/workspaces/${workspaceId}/tasks/counts-by-project`,
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

export async function deleteTask(workspaceId: string, taskId: string) {
  return api<{ ok: boolean }>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

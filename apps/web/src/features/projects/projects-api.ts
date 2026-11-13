import type { CreateProjectInput, ProjectDto, UpdateProjectInput } from '@life-room/shared';
import { api } from '../../lib/api';

export type Project = ProjectDto;

export async function listProjects(workspaceId: string) {
  return api<{ projects: Project[] }>(`/workspaces/${workspaceId}/projects`);
}

export async function getProject(workspaceId: string, projectId: string) {
  return api<{ project: Project }>(`/workspaces/${workspaceId}/projects/${projectId}`);
}

export async function createProject(workspaceId: string, input: CreateProjectInput) {
  return api<{ project: Project }>(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  return api<{ project: Project }>(`/workspaces/${workspaceId}/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteProject(workspaceId: string, projectId: string) {
  return api<{ ok: boolean }>(`/workspaces/${workspaceId}/projects/${projectId}`, {
    method: 'DELETE',
  });
}

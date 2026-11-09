import { api } from '../../lib/api';
import type { Workspace } from '../auth/auth-api';

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string | null;
  name?: string | null;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  status: 'invited' | 'active';
  inviteToken?: string | null;
  createdAt: string;
};

export async function listWorkspaces() {
  return api<{ workspaces: Workspace[] }>('/workspaces');
}

export async function createWorkspace(name: string) {
  return api<{ workspace: Workspace }>('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getWorkspace(id: string) {
  return api<{ workspace: Workspace }>(`/workspaces/${id}`);
}

export async function listMembers(workspaceId: string) {
  return api<{ members: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`);
}

export async function inviteMember(
  workspaceId: string,
  input: { email: string; role?: 'admin' | 'member' | 'guest' },
) {
  return api<{ member: WorkspaceMember }>(`/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function acceptInvite(token: string) {
  return api<{ member: WorkspaceMember; workspace: Workspace | null }>(`/invites/${token}/accept`, {
    method: 'POST',
  });
}

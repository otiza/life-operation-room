import { api } from '../../lib/api';

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  kind: 'personal' | 'shared';
  ownerUserId: string;
  createdAt: string;
};

export async function signup(input: { email: string; password: string; name: string }) {
  return api<{ user: User; personalWorkspace: Workspace }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function login(input: { email: string; password: string }) {
  return api<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout() {
  return api<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export async function me() {
  return api<{ user: User }>('/auth/me');
}

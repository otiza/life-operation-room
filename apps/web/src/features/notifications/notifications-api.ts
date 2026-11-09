import { api } from '../../lib/api';

export type Notification = {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export async function listNotifications() {
  return api<{ notifications: Notification[] }>('/notifications');
}

export async function markNotificationRead(id: string) {
  return api<{ notification: Notification }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

import type { AppManifest } from '@erp-tiza/shared';
import { api } from '../../lib/api';

export type WorkspaceApp = {
  workspaceId: string;
  appKey: string;
  installedAt: string;
  config: Record<string, unknown>;
  manifest: AppManifest;
};

export async function getCatalog() {
  return api<{ apps: AppManifest[] }>('/apps/catalog');
}

export async function listInstalledApps(workspaceId: string) {
  return api<{ apps: WorkspaceApp[] }>(`/workspaces/${workspaceId}/apps`);
}

export async function installApp(workspaceId: string, appKey: string) {
  return api<{ app: WorkspaceApp }>(`/workspaces/${workspaceId}/apps/install`, {
    method: 'POST',
    body: JSON.stringify({ appKey }),
  });
}

export async function uninstallApp(workspaceId: string, appKey: string) {
  return api<{ ok: boolean }>(`/workspaces/${workspaceId}/apps/${appKey}`, {
    method: 'DELETE',
  });
}

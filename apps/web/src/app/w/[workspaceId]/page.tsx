'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listInstalledApps } from '../../../features/apps/apps-api';
import { getWorkspace } from '../../../features/workspaces/workspaces-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { PageContainer, PageHeader } from '../../../components/layout/page-container';
import { useEffect } from 'react';
import { useShellStore } from '../../../features/shell/shell-store';

export default function WorkspaceHomePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const setCurrentWorkspaceId = useShellStore((state) => state.setCurrentWorkspaceId);

  useEffect(() => {
    setCurrentWorkspaceId(workspaceId);
  }, [workspaceId, setCurrentWorkspaceId]);

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });
  const appsQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });

  return (
    <PageContainer>
      <PageHeader
        title={workspaceQuery.data?.workspace.name ?? 'Workspace'}
        description="Install the apps you need. Each app is a mini-module that can interconnect later."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Installed apps</CardTitle>
            <CardDescription>
              {(appsQuery.data?.apps.length ?? 0) === 0
                ? 'Nothing installed yet.'
                : `${appsQuery.data?.apps.length} app(s) ready in this workspace.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(appsQuery.data?.apps ?? []).map((app) => (
              <Link
                key={app.appKey}
                href={`/w/${workspaceId}/${app.appKey}`}
                className="block min-h-11 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-accent"
              >
                {app.manifest.name}
              </Link>
            ))}
            <Link
              href={`/w/${workspaceId}/apps`}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-muted px-4 text-sm font-medium text-foreground hover:bg-accent sm:w-auto"
            >
              Open marketplace
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collaborate</CardTitle>
            <CardDescription>
              Personal workspaces stay private. Create a shared workspace to invite people.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/w/${workspaceId}/settings`}
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent sm:w-auto"
            >
              Members & invites
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

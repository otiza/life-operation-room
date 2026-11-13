'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCatalog, installApp, listInstalledApps, uninstallApp } from '../../../../features/apps/apps-api';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Dialog } from '../../../../components/ui/dialog';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';
import { useMemo, useState } from 'react';
import { ApiError } from '../../../../lib/api';

const CATEGORY_ORDER = [
  'productivity',
  'finance',
  'social',
  'learning',
  'career',
  'health',
  'ai',
] as const;

export default function MarketplacePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const queryClient = useQueryClient();
  const [uninstallTarget, setUninstallTarget] = useState<{ key: string; name: string } | null>(null);

  const catalogQuery = useQuery({ queryKey: ['catalog'], queryFn: getCatalog });
  const installedQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });

  const installedKeys = useMemo(
    () => new Set((installedQuery.data?.apps ?? []).map((app) => app.appKey)),
    [installedQuery.data],
  );

  const installMutation = useMutation({
    mutationFn: (appKey: string) => installApp(workspaceId, appKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['installed-apps', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (appKey: string) => uninstallApp(workspaceId, appKey),
    onSuccess: async () => {
      setUninstallTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['installed-apps', workspaceId] });
    },
  });

  const grouped = useMemo(() => {
    const apps = catalogQuery.data?.apps ?? [];
    return CATEGORY_ORDER.map((category) => ({
      category,
      apps: apps.filter((app) => app.category === category),
    })).filter((group) => group.apps.length > 0);
  }, [catalogQuery.data]);

  return (
    <PageContainer size="xl" className="space-y-8">
      <PageHeader
        title="App marketplace"
        description="Install what you need. Dependencies are enforced the Odoo way."
      />
      {(installMutation.error || uninstallMutation.error) && (
        <p className="text-sm text-destructive">
          {(installMutation.error || uninstallMutation.error) instanceof ApiError
            ? ((installMutation.error || uninstallMutation.error) as ApiError).message
            : 'Action failed'}
        </p>
      )}
      {grouped.map((group) => (
        <section key={group.category} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.apps.map((app) => {
              const installed = installedKeys.has(app.key);
              return (
                <Card key={app.key}>
                  <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle>{app.name}</CardTitle>
                        <CardDescription>{app.description}</CardDescription>
                      </div>
                      {installed && <Badge className="w-fit shrink-0">installed</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                      {app.dependsOn.length
                        ? `Depends on: ${app.dependsOn.join(', ')}`
                        : 'No dependencies'}
                    </div>
                    {installed ? (
                      <Button
                        variant="outline"
                        className="h-11 w-full sm:h-9 sm:w-auto"
                        disabled={uninstallMutation.isPending}
                        onClick={() => setUninstallTarget({ key: app.key, name: app.name })}
                      >
                        Uninstall
                      </Button>
                    ) : (
                      <Button
                        className="h-11 w-full sm:h-9 sm:w-auto"
                        disabled={installMutation.isPending}
                        onClick={() => installMutation.mutate(app.key)}
                      >
                        Install
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      <Dialog open={Boolean(uninstallTarget)} onClose={() => setUninstallTarget(null)}>
        <div className="space-y-4 p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Uninstall {uninstallTarget?.name}?</h2>
            <p className="text-sm text-muted-foreground">
              Your data is kept. Reinstalling this app will restore access to it.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11 sm:h-9" onClick={() => setUninstallTarget(null)}>
              Cancel
            </Button>
            <Button
              className="h-11 sm:h-9"
              disabled={!uninstallTarget || uninstallMutation.isPending}
              onClick={() => uninstallTarget && uninstallMutation.mutate(uninstallTarget.key)}
            >
              Uninstall
            </Button>
          </div>
        </div>
      </Dialog>
    </PageContainer>
  );
}

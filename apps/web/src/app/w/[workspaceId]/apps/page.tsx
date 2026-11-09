'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCatalog, installApp, listInstalledApps, uninstallApp } from '../../../../features/apps/apps-api';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';
import { useMemo } from 'react';
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
        <p className="text-sm text-red-600">
          {(installMutation.error || uninstallMutation.error) instanceof ApiError
            ? ((installMutation.error || uninstallMutation.error) as ApiError).message
            : 'Action failed'}
        </p>
      )}
      {grouped.map((group) => (
        <section key={group.category} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
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
                      <Badge className="w-fit shrink-0">
                        {app.status === 'coming_soon' ? 'coming soon' : 'available'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-zinc-500">
                      {app.dependsOn.length
                        ? `Depends on: ${app.dependsOn.join(', ')}`
                        : 'No dependencies'}
                    </div>
                    {installed ? (
                      <Button
                        variant="outline"
                        className="h-11 w-full sm:h-9 sm:w-auto"
                        disabled={uninstallMutation.isPending}
                        onClick={() => uninstallMutation.mutate(app.key)}
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
    </PageContainer>
  );
}

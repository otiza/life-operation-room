'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCatalog, installApp, listInstalledApps, uninstallApp } from '../../../../features/apps/apps-api';
import { AppIcon } from '../../../../features/apps/app-icon';
import { Button } from '../../../../components/ui/button';
import { RowList } from '../../../../components/ui/row-list';
import { SectionHeading } from '../../../../components/ui/section-heading';
import { Dialog } from '../../../../components/ui/dialog';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';
import { useMemo, useState } from 'react';
import { ApiError } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';

const CATEGORY_ORDER = [
  'productivity',
  'finance',
  'social',
  'learning',
  'career',
  'health',
  'ai',
] as const;

const CATEGORY_LABEL: Record<(typeof CATEGORY_ORDER)[number], string> = {
  productivity: 'Productivity',
  finance: 'Money',
  social: 'People',
  learning: 'Learning',
  career: 'Work',
  health: 'Health',
  ai: 'Assistants',
};

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
    <PageContainer className="space-y-8">
      <PageHeader
        title="Apps"
        description="Add the apps you need. Some apps need another one first."
      />
      {(installMutation.error || uninstallMutation.error) && (
        <p className="text-sm text-destructive">
          {(installMutation.error || uninstallMutation.error) instanceof ApiError
            ? ((installMutation.error || uninstallMutation.error) as ApiError).message
            : 'Action failed'}
        </p>
      )}
      {grouped.map((group) => (
        <section key={group.category} className="space-y-2" aria-labelledby={`category-${group.category}`}>
          <SectionHeading id={`category-${group.category}`} title={CATEGORY_LABEL[group.category]} />
          <RowList>
            {group.apps.map((app, index) => {
              const installed = installedKeys.has(app.key);
              const needs = app.dependsOn
                .map((key) => catalogQuery.data?.apps.find((other) => other.key === key)?.name ?? key)
                .join(' and ');
              return (
                <li
                  key={app.key}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 sm:px-4',
                    index > 0 && 'border-t border-border',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <AppIcon name={app.nav.icon} appKey={app.key} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-sm font-medium text-foreground">{app.name}</h3>
                        {installed ? <span className="text-meta text-muted-foreground">Installed</span> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                      {needs ? <p className="text-meta text-muted-foreground">Needs {needs}</p> : null}
                    </div>
                  </div>
                  {installed ? (
                    <Button
                      variant="ghost"
                      className="h-11 shrink-0 px-3 text-muted-foreground sm:h-9"
                      disabled={uninstallMutation.isPending}
                      onClick={() => setUninstallTarget({ key: app.key, name: app.name })}
                    >
                      Uninstall
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-11 shrink-0 sm:h-9"
                      disabled={installMutation.isPending}
                      onClick={() => installMutation.mutate(app.key)}
                    >
                      Install
                    </Button>
                  )}
                </li>
              );
            })}
          </RowList>
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

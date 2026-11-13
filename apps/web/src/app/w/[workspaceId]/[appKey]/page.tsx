'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCatalog, listInstalledApps } from '../../../../features/apps/apps-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { PageContainer } from '../../../../components/layout/page-container';

export default function AppPlaceholderPage() {
  const params = useParams<{ workspaceId: string; appKey: string }>();
  const { workspaceId, appKey } = params;

  const catalogQuery = useQuery({ queryKey: ['catalog'], queryFn: getCatalog });
  const installedQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });

  const manifest = catalogQuery.data?.apps.find((app) => app.key === appKey);
  const installed = installedQuery.data?.apps.some((app) => app.appKey === appKey);

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{manifest?.name ?? appKey}</CardTitle>
            <Badge className="w-fit">
              {manifest?.status === 'coming_soon' ? 'coming soon' : 'available'}
            </Badge>
          </div>
          <CardDescription>{manifest?.description ?? 'Mini-app placeholder'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!installed ? (
            <p className="text-sm text-muted-foreground">
              This app is not installed in the current workspace.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Shell route is ready. Full feature UI ships when this mini-app is implemented.
            </p>
          )}
          <div className="text-xs text-muted-foreground">
            Category: {manifest?.category ?? '—'} · capabilities:{' '}
            {(manifest?.capabilities ?? []).join(', ') || 'none'}
          </div>
          <Link
            href={`/w/${workspaceId}/apps`}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-muted px-4 text-sm font-medium text-foreground hover:bg-accent sm:w-auto"
          >
            Back to marketplace
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { getIcsTokenStatus, regenerateIcsToken, revokeIcsToken } from './calendar-api';

type IcsSettingsProps = {
  workspaceId: string;
};

export function IcsSettings({ workspaceId }: IcsSettingsProps) {
  const queryClient = useQueryClient();
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null);
  const statusQuery = useQuery({
    queryKey: ['calendar-ics', workspaceId],
    queryFn: () => getIcsTokenStatus(workspaceId),
  });
  const regenerateMutation = useMutation({
    mutationFn: () => regenerateIcsToken(workspaceId),
    onSuccess: (data) => {
      const origin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      setRevealedUrl(`${origin}${data.token.urlPath}`);
      void queryClient.invalidateQueries({ queryKey: ['calendar-ics', workspaceId] });
    },
  });
  const revokeMutation = useMutation({
    mutationFn: () => revokeIcsToken(workspaceId),
    onSuccess: () => {
      setRevealedUrl(null);
      void queryClient.invalidateQueries({ queryKey: ['calendar-ics', workspaceId] });
    },
  });

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-medium">ICS subscription</h2>
        <p className="text-sm text-muted-foreground">
          Read-only feed for Google or Apple Calendar. The token is shown once when regenerated.
        </p>
      </div>
      <p className="text-sm">
        Status:{' '}
        {statusQuery.data?.status.exists
          ? `Active since ${new Date(statusQuery.data.status.createdAt!).toLocaleString()}`
          : 'No active feed'}
      </p>
      {revealedUrl ? (
        <code className="block break-all rounded-md bg-muted p-2 text-xs">{revealedUrl}</code>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending}>
          {statusQuery.data?.status.exists ? 'Regenerate URL' : 'Create URL'}
        </Button>
        {statusQuery.data?.status.exists ? (
          <Button variant="outline" onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending}>
            Revoke
          </Button>
        ) : null}
      </div>
    </section>
  );
}

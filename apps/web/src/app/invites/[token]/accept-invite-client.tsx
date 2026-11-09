'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { acceptInvite } from '../../../features/workspaces/workspaces-api';
import { useShellStore } from '../../../features/shell/shell-store';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { ApiError } from '../../../lib/api';
import { useState } from 'react';

export function AcceptInviteClient() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const setCurrentWorkspaceId = useShellStore((state) => state.setCurrentWorkspaceId);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => acceptInvite(params.token),
    onSuccess: (result) => {
      if (result.workspace) {
        setCurrentWorkspaceId(result.workspace.id);
        router.replace(`/w/${result.workspace.id}`);
      } else {
        router.replace('/w');
      }
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not accept invite');
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invite</CardTitle>
          <CardDescription>Join the shared workspace you were invited to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Accepting…' : 'Accept invite'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

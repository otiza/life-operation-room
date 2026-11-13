'use client';

import { FormEvent, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWorkspace,
  inviteMember,
  listMembers,
} from '../../../../features/workspaces/workspaces-api';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';
import { ApiError } from '../../../../lib/api';

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });
  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteMember(workspaceId, { email, role: 'member' }),
    onSuccess: async (result) => {
      setEmail('');
      setError(null);
      const token = result.member.inviteToken;
      setMessage(
        token
          ? `Invite created. Share accept link: /invites/${token}`
          : 'Invite created.',
      );
      await queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : 'Invite failed');
    },
  });

  function onInvite(event: FormEvent) {
    event.preventDefault();
    inviteMutation.mutate();
  }

  const workspace = workspaceQuery.data?.workspace;

  return (
    <PageContainer>
      <PageHeader
        title="Workspace settings"
        description="Members and invites for this workspace."
      />
      <Card>
        <CardHeader>
          <CardTitle className="break-words">{workspace?.name}</CardTitle>
          <CardDescription className="break-all">
            Kind: {workspace?.kind ?? '…'} · slug: {workspace?.slug ?? '…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace?.kind === 'personal' ? (
            <p className="text-sm text-muted-foreground">
              Personal workspaces are private. Create a shared workspace from the sidebar to invite
              collaborators.
            </p>
          ) : (
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onInvite}>
              <Input
                type="email"
                className="h-11"
                placeholder="person@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button className="h-11 w-full sm:w-auto" disabled={inviteMutation.isPending}>
                Invite
              </Button>
            </form>
          )}
          {message && <p className="break-all text-sm text-success">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            {(membersQuery.data?.members ?? []).map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{member.email}</div>
                  <div className="text-xs text-muted-foreground">{member.role}</div>
                </div>
                <Badge className="w-fit">{member.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

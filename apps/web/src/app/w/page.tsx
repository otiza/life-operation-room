'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { listWorkspaces } from '../../features/workspaces/workspaces-api';
import { useShellStore } from '../../features/shell/shell-store';

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const currentWorkspaceId = useShellStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspaceId = useShellStore((state) => state.setCurrentWorkspaceId);
  const workspacesQuery = useQuery({ queryKey: ['workspaces'], queryFn: listWorkspaces });

  useEffect(() => {
    const workspaces = workspacesQuery.data?.workspaces ?? [];
    if (!workspaces.length) return;
    const target =
      (currentWorkspaceId && workspaces.find((w) => w.id === currentWorkspaceId)?.id) ||
      workspaces.find((w) => w.kind === 'personal')?.id ||
      workspaces[0].id;
    setCurrentWorkspaceId(target);
    router.replace(`/w/${target}`);
  }, [workspacesQuery.data, currentWorkspaceId, router, setCurrentWorkspaceId]);

  return <div className="text-sm text-muted-foreground">Opening workspace…</div>;
}

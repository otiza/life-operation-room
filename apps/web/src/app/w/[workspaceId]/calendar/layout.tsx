'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { me } from '../../../../features/auth/auth-api';
import { listMembers } from '../../../../features/workspaces/workspaces-api';
import { cn } from '../../../../lib/utils';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ workspaceId: string }>();
  const pathname = usePathname();
  const workspaceId = params.workspaceId;
  const base = `/w/${workspaceId}/calendar`;
  const isSettings = pathname.startsWith(`${base}/settings`);
  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });
  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
  });
  const myRole = (membersQuery.data?.members ?? []).find(
    (member) => member.userId === meQuery.data?.user.id && member.status === 'active',
  )?.role;
  const canManageSettings = myRole === 'owner' || myRole === 'admin';

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 border-b border-border">
        <Link
          href={base}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            !isSettings
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Calendar
        </Link>
        {canManageSettings ? (
          <Link
            href={`${base}/settings`}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isSettings
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            Settings
          </Link>
        ) : null}
      </nav>
      {children}
    </div>
  );
}

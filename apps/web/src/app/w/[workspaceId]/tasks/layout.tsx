'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '../../../../lib/utils';

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ workspaceId: string }>();
  const pathname = usePathname();
  const workspaceId = params.workspaceId;
  const base = `/w/${workspaceId}/tasks`;
  const isSettings = pathname.startsWith(`${base}/settings`);

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 border-b border-zinc-200">
        <Link
          href={base}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            !isSettings
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800',
          )}
        >
          Tasks
        </Link>
        <Link
          href={`${base}/settings`}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            isSettings
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800',
          )}
        >
          Settings
        </Link>
      </nav>
      {children}
    </div>
  );
}

import { Suspense } from 'react';
import { AppShell } from '../../features/shell/app-shell';
import { Skeleton } from '../../components/ui/skeleton';

function ShellFallback() {
  return (
    <div className="flex min-h-dvh bg-background" aria-busy="true" aria-label="Loading">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Skeleton className="mb-6 h-7 w-28" />
        <Skeleton className="mb-3 h-10 w-full" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-4/5" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <div className="space-y-3 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Settings,
  Store,
  X,
} from 'lucide-react';
import { logout, me } from '../auth/auth-api';
import { listInstalledApps } from '../apps/apps-api';
import { listNotifications, markNotificationRead } from '../notifications/notifications-api';
import { useNotificationsSocket } from '../notifications/use-notifications-socket';
import { createWorkspace, listWorkspaces } from '../workspaces/workspaces-api';
import { useShellStore } from './shell-store';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { useEffect, useMemo, useState } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const {
    currentWorkspaceId,
    setCurrentWorkspaceId,
    mobileNavOpen,
    setMobileNavOpen,
    notificationsOpen,
    setNotificationsOpen,
    hasHydrated,
  } = useShellStore();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: me,
  });
  useNotificationsSocket(Boolean(meQuery.data));

  useEffect(() => {
    if (meQuery.isError) {
      router.replace('/login');
    }
  }, [meQuery.isError, router]);

  useEffect(() => {
    setMobileNavOpen(false);
    setNotificationsOpen(false);
  }, [pathname, setMobileNavOpen, setNotificationsOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen, setMobileNavOpen]);

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
    enabled: Boolean(meQuery.data) && hasHydrated,
  });

  useEffect(() => {
    if (!hasHydrated) return;
    const workspaces = workspacesQuery.data?.workspaces ?? [];
    if (!workspaces.length) return;
    if (!currentWorkspaceId || !workspaces.some((w) => w.id === currentWorkspaceId)) {
      const personal = workspaces.find((w) => w.kind === 'personal') ?? workspaces[0];
      setCurrentWorkspaceId(personal.id);
    }
  }, [hasHydrated, workspacesQuery.data, currentWorkspaceId, setCurrentWorkspaceId]);

  const appsQuery = useQuery({
    queryKey: ['installed-apps', currentWorkspaceId],
    queryFn: () => listInstalledApps(currentWorkspaceId!),
    enabled: Boolean(currentWorkspaceId) && hasHydrated,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    enabled: Boolean(meQuery.data),
    refetchInterval: 20_000,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: () => createWorkspace(newWorkspaceName.trim()),
    onSuccess: async (result) => {
      setNewWorkspaceName('');
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setCurrentWorkspaceId(result.workspace.id);
      setMobileNavOpen(false);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });

  const unreadCount = useMemo(
    () => notificationsQuery.data?.notifications.filter((n) => !n.readAt).length ?? 0,
    [notificationsQuery.data],
  );

  const currentWorkspace = workspacesQuery.data?.workspaces.find((w) => w.id === currentWorkspaceId);

  if (!hasHydrated || meQuery.isLoading || !meQuery.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  const sidebar = (
    <>
      <div className="border-b border-zinc-200 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">ERP Tiza</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">Life manager</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="space-y-2 border-b border-zinc-200 px-3 py-3">
        <label className="px-1 text-xs font-medium text-zinc-500" htmlFor="workspace-switcher">
          Workspace
        </label>
        <select
          id="workspace-switcher"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
          value={currentWorkspaceId ?? ''}
          onChange={(event) => {
            setCurrentWorkspaceId(event.target.value);
            setMobileNavOpen(false);
          }}
        >
          {(workspacesQuery.data?.workspaces ?? []).map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name} ({workspace.kind})
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            className="h-11 w-full min-w-0 rounded-md border border-zinc-200 px-2 text-sm"
            placeholder="New shared workspace"
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
          />
          <Button
            size="icon"
            variant="secondary"
            className="h-11 w-11 shrink-0"
            aria-label="Create shared workspace"
            disabled={!newWorkspaceName.trim() || createWorkspaceMutation.isPending}
            onClick={() => createWorkspaceMutation.mutate()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Workspace">
        <ShellNavLink href={`/w/${currentWorkspaceId}`} active={pathname === `/w/${currentWorkspaceId}`}>
          <LayoutGrid className="h-4 w-4 shrink-0" />
          Home
        </ShellNavLink>
        <ShellNavLink
          href={`/w/${currentWorkspaceId}/apps`}
          active={pathname?.includes('/apps') ?? false}
        >
          <Store className="h-4 w-4 shrink-0" />
          Marketplace
        </ShellNavLink>
        <ShellNavLink
          href={`/w/${currentWorkspaceId}/settings`}
          active={pathname?.includes('/settings') ?? false}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </ShellNavLink>
        <div className="px-2 pt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Installed apps
        </div>
        {(appsQuery.data?.apps ?? []).length === 0 && (
          <p className="px-3 py-2 text-xs text-zinc-500">No apps installed yet.</p>
        )}
        {(appsQuery.data?.apps ?? []).map((app) => {
          const href = `/w/${currentWorkspaceId}/${app.appKey}`;
          return (
            <ShellNavLink key={app.appKey} href={href} active={pathname === href}>
              {app.manifest.nav.label}
            </ShellNavLink>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-3">
        <div className="mb-2 truncate text-sm font-medium">{meQuery.data.user.name}</div>
        <div className="mb-3 truncate text-xs text-zinc-500">{meQuery.data.user.email}</div>
        <Button variant="outline" className="h-11 w-full" onClick={() => logoutMutation.mutate()}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-[radial-gradient(circle_at_top_left,_#f4f7fb,_#eef2f7_45%,_#e8edf5)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200/80 bg-white/80 backdrop-blur md:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          className={cn(
            'absolute inset-0 bg-zinc-950/40 transition-opacity',
            mobileNavOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Close navigation overlay"
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-white shadow-xl transition-transform duration-200 ease-out',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          {sidebar}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/80 px-3 py-2.5 backdrop-blur sm:px-4 md:px-6 md:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 md:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-zinc-900">
                {currentWorkspace?.name ?? 'Workspace'}
              </div>
              <div className="hidden text-xs text-zinc-500 sm:block">Modular life OS shell</div>
            </div>
          </div>
          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 rounded-full bg-zinc-900 px-1.5 text-[10px] leading-4 text-white">
                {unreadCount}
              </span>
            )}
            {notificationsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
                <div className="mb-2 text-sm font-semibold">Notifications</div>
                <div className="max-h-[min(20rem,50vh)] space-y-2 overflow-y-auto">
                  {(notificationsQuery.data?.notifications ?? []).length === 0 && (
                    <p className="text-xs text-zinc-500">Nothing yet.</p>
                  )}
                  {(notificationsQuery.data?.notifications ?? []).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-lg border border-zinc-100 p-3 text-left hover:bg-zinc-50"
                      onClick={async () => {
                        if (!notification.readAt) {
                          await markNotificationRead(notification.id);
                          await queryClient.invalidateQueries({ queryKey: ['notifications'] });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{notification.title}</div>
                        {!notification.readAt && <Badge>new</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{notification.body}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto px-3 py-4 sm:px-4 sm:py-5 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function ShellNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100',
        active && 'bg-zinc-900 text-white hover:bg-zinc-900',
      )}
    >
      {children}
    </Link>
  );
}

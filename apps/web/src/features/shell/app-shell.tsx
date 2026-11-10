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
  type LucideIcon,
} from 'lucide-react';
import { logout, me } from '../auth/auth-api';
import { listInstalledApps } from '../apps/apps-api';
import { listNotifications, markNotificationRead } from '../notifications/notifications-api';
import { useNotificationsSocket } from '../notifications/use-notifications-socket';
import { createWorkspace, listWorkspaces } from '../workspaces/workspaces-api';
import { useShellStore } from './shell-store';
import { TaskQuickAddDialog } from '../tasks/task-quick-add-dialog';
import { ShellCommandPalette } from './command-palette';
import { ShortcutsSheet } from './shortcuts-sheet';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ThemeToggle } from '../../components/theme-toggle';
import { isTypingTarget } from '../../lib/keyboard';
import { cn } from '../../lib/utils';
import { useEffect, useMemo, useState } from 'react';
import * as lucideIcons from 'lucide-react';

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
    quickAddOpen,
    quickAddDefaults,
    openQuickAdd,
    closeQuickAdd,
    hasHydrated,
  } = useShellStore();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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

  const tasksInstalled = (appsQuery.data?.apps ?? []).some((app) => app.appKey === 'tasks');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.key !== 'q' && event.key !== 'Q') return;
      if (!tasksInstalled || !currentWorkspaceId) return;
      event.preventDefault();
      openQuickAdd(quickAddDefaultsFromPath(pathname));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentWorkspaceId, openQuickAdd, pathname, tasksInstalled]);

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
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const sidebar = (
    <>
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-page-title text-sidebar-foreground">Life room</div>
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
      <div className="space-y-2 border-b border-sidebar-border px-3 py-3">
        <label className="px-1 text-xs font-medium text-muted-foreground" htmlFor="workspace-switcher">
          Workspace
        </label>
        <select
          id="workspace-switcher"
          className="h-11 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground"
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
            className="h-11 w-full min-w-0 rounded-md border border-input bg-card px-2 text-sm"
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
        <div className="px-2 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Installed apps
        </div>
        {(appsQuery.data?.apps ?? []).length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">No apps installed yet.</p>
        )}
        {(appsQuery.data?.apps ?? []).map((app) => {
          const href = `/w/${currentWorkspaceId}/${app.appKey}`;
          return (
            <ShellNavLink key={app.appKey} href={href} active={pathname === href}>
              <ManifestIcon name={app.manifest.nav.icon} />
              {app.manifest.nav.label}
            </ShellNavLink>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 truncate text-sm font-medium">{meQuery.data.user.name}</div>
        <div className="mb-3 truncate text-xs text-muted-foreground">{meQuery.data.user.email}</div>
        <ThemeToggle className="mb-3" />
        <Button variant="outline" className="h-11 w-full" onClick={() => logoutMutation.mutate()}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
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
            'absolute inset-0 bg-foreground/40 transition-opacity',
            mobileNavOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Close navigation overlay"
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out',
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/80 px-3 py-2.5 backdrop-blur sm:px-4 md:px-6 md:py-3">
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
              <div className="truncate text-sm font-medium text-foreground">
                {currentWorkspace?.name ?? 'Workspace'}
              </div>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            {tasksInstalled && currentWorkspaceId ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label="New task"
                onClick={() => openQuickAdd(quickAddDefaultsFromPath(pathname))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
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
              <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground">
                {unreadCount}
              </span>
            )}
            {notificationsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card p-3 shadow-lg">
                <div className="mb-2 text-sm font-semibold">Notifications</div>
                <div className="max-h-[min(20rem,50vh)] space-y-2 overflow-y-auto">
                  {(notificationsQuery.data?.notifications ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nothing yet.</p>
                  )}
                  {(notificationsQuery.data?.notifications ?? []).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-lg border border-border p-3 text-left hover:bg-accent"
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
                      <div className="mt-1 text-xs text-muted-foreground">{notification.body}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto px-3 py-4 sm:px-4 sm:py-5 md:p-6">{children}</main>
      </div>
      {tasksInstalled && currentWorkspaceId && quickAddOpen ? (
        <TaskQuickAddDialog
          key="quick-add"
          workspaceId={currentWorkspaceId}
          open={quickAddOpen}
          onClose={closeQuickAdd}
          defaults={quickAddDefaults}
        />
      ) : null}
      <ShellCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        installedAppKeys={(appsQuery.data?.apps ?? []).map((app) => app.appKey)}
      />
      <ShortcutsSheet
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        installedAppKeys={(appsQuery.data?.apps ?? []).map((app) => app.appKey)}
      />
    </div>
  );
}

function quickAddDefaultsFromPath(pathname: string) {
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  if (projectMatch?.[1]) return { projectId: projectMatch[1] };
  if (typeof window !== 'undefined' && pathname.includes('/tasks')) {
    const view = new URLSearchParams(window.location.search).get('view') ?? 'today';
    if (view === 'today') return { whenDate: new Date().toISOString().slice(0, 10) };
  }
  return {};
}

function ManifestIcon({ name }: { name: string }) {
  const icons = lucideIcons as unknown as Record<string, LucideIcon | undefined>;
  const Icon = icons[name];
  if (!Icon) return <span className="h-4 w-4 shrink-0" />;
  return <Icon className="h-4 w-4 shrink-0" />;
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
        'flex min-h-11 items-center gap-2 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent',
        active && 'bg-primary text-primary-foreground hover:bg-primary',
      )}
    >
      {children}
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ChevronDown,
  ListChecks,
  Menu as MenuIcon,
  Plus,
  Search,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import { logout, me } from '../auth/auth-api';
import { listInstalledApps } from '../apps/apps-api';
import { listNotifications, markNotificationRead } from '../notifications/notifications-api';
import { useNotificationsSocket } from '../notifications/use-notifications-socket';
import type { TaskView } from '@life-room/shared';
import { createWorkspace, listWorkspaces } from '../workspaces/workspaces-api';
import { getProject, listProjects } from '../projects/projects-api';
import { taskCounts } from '../tasks/tasks-api';
import { taskCountsQueryKey } from '../tasks/task-counts';
import { TasksNav } from '../tasks/tasks-nav';
import { useShellStore } from './shell-store';
import { TaskQuickAddDialog } from '../tasks/task-quick-add-dialog';
import { ShellCommandPalette } from './command-palette';
import type { ShellCommand } from './command-registry';
import { ShortcutsSheet } from './shortcuts-sheet';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Menu } from '../../components/ui/menu';
import { Skeleton } from '../../components/ui/skeleton';
import { Logo } from '../../components/brand/logo';
import { ProfileMenu } from './profile-menu';
import { isTypingTarget } from '../../lib/keyboard';
import { cn } from '../../lib/utils';
import { useEffect, useId, useMemo, useState } from 'react';
import * as lucideIcons from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const createWorkspaceTitleId = useId();

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

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
  const shellCommands = useMemo<ShellCommand[]>(() => {
    if (!currentWorkspaceId) return [];
    const commands: ShellCommand[] = [
      {
        id: 'shell.home',
        appKey: 'home',
        label: 'Go to Today',
        keywords: 'home today',
        run: () => router.push(`/w/${currentWorkspaceId}`),
      },
    ];
    if (tasksInstalled) {
      commands.push({
        id: 'shell.review',
        appKey: 'home',
        label: 'Review your day',
        keywords: 'shutdown plan tomorrow reflect close day',
        run: () => router.push(`/w/${currentWorkspaceId}/review`),
      });
    }
    return commands;
  }, [currentWorkspaceId, router, tasksInstalled]);
  const calendarInstalled = (appsQuery.data?.apps ?? []).some((app) => app.appKey === 'calendar');
  const projectsInstalled = (appsQuery.data?.apps ?? []).some((app) => app.appKey === 'projects');
  const projectIdFromPath = pathname?.match(/\/projects\/([^/]+)/)?.[1] ?? null;
  const tasksPathActive =
    Boolean(pathname?.includes('/tasks')) || Boolean(pathname?.includes('/projects'));
  const activeTaskView =
    (searchParams.get('view') as TaskView | null) ??
    (pathname?.includes('/tasks') && !pathname?.includes('/tasks/settings') ? 'today' : null);

  const projectQuery = useQuery({
    queryKey: ['project', currentWorkspaceId, projectIdFromPath],
    queryFn: () => getProject(currentWorkspaceId!, projectIdFromPath!),
    enabled: Boolean(currentWorkspaceId && projectIdFromPath && hasHydrated),
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', currentWorkspaceId],
    queryFn: () => listProjects(currentWorkspaceId!),
    enabled: Boolean(currentWorkspaceId) && projectsInstalled && hasHydrated,
  });
  const taskCountsQuery = useQuery({
    queryKey: taskCountsQueryKey(currentWorkspaceId ?? ''),
    queryFn: () => taskCounts(currentWorkspaceId!),
    enabled: Boolean(currentWorkspaceId) && tasksInstalled && hasHydrated,
  });

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
      setCreateWorkspaceOpen(false);
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
  const breadcrumb = useMemo(
    () =>
      deriveShellBreadcrumb({
        pathname: pathname ?? '',
        workspaceId: currentWorkspaceId,
        searchParams,
        projectName: projectQuery.data?.project.name,
        apps: appsQuery.data?.apps ?? [],
      }),
    [appsQuery.data?.apps, currentWorkspaceId, pathname, projectQuery.data?.project.name, searchParams],
  );

  if (!hasHydrated || meQuery.isLoading || !meQuery.data) {
    return (
      <div className="flex min-h-dvh bg-background" aria-busy="true" aria-label="Loading">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
          <Skeleton className="mb-6 h-7 w-28" />
          <Skeleton className="mb-3 h-10 w-full" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
          <div className="space-y-3 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="mt-6 h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const workspaceMenuItems = [
    ...(workspacesQuery.data?.workspaces ?? []).map((workspace) => ({
      id: workspace.id,
      label:
        workspace.id === currentWorkspaceId ? `✓ ${workspace.name}` : workspace.name,
      onSelect: () => {
        setCurrentWorkspaceId(workspace.id);
        setMobileNavOpen(false);
      },
    })),
    {
      id: 'create-workspace',
      label: 'Create workspace…',
      onSelect: () => {
        setNewWorkspaceName('');
        setCreateWorkspaceOpen(true);
      },
    },
  ];

  const closeMobileNav = () => setMobileNavOpen(false);
  const installedApps = appsQuery.data?.apps ?? [];

  const sidebar = (
    <>
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <Link
          href={`/w/${currentWorkspaceId}`}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={closeMobileNav}
        >
          <Logo />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Close navigation"
          onClick={closeMobileNav}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="px-3 pb-2">
        <Menu
          aria-label="Switch workspace"
          className="w-full"
          align="stretch"
          triggerClassName="h-10 w-full justify-between gap-2 rounded-md border border-sidebar-border px-3 text-sm text-foreground hover:bg-sidebar-accent"
          trigger={
            <>
              <span className="min-w-0 flex-1 truncate text-left">
                {currentWorkspace?.name ?? 'Workspace'}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          }
          items={workspaceMenuItems}
        />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3" aria-label="Workspace">
        <ShellNavGroup>Day</ShellNavGroup>
        <ShellNavLink
          href={`/w/${currentWorkspaceId}`}
          active={pathname === `/w/${currentWorkspaceId}`}
          onNavigate={closeMobileNav}
        >
          <Sun className="h-4 w-4 shrink-0" />
          Today
        </ShellNavLink>
        {tasksInstalled ? (
          <ShellNavLink
            href={`/w/${currentWorkspaceId}/review`}
            active={pathname === `/w/${currentWorkspaceId}/review`}
            onNavigate={closeMobileNav}
          >
            <ListChecks className="h-4 w-4 shrink-0" />
            Review day
          </ShellNavLink>
        ) : null}
        <ShellNavGroup>Apps</ShellNavGroup>
        {installedApps.length === 0 && (
          <Link
            href={`/w/${currentWorkspaceId}/apps`}
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={closeMobileNav}
          >
            No apps yet. Add apps
          </Link>
        )}
        {installedApps.map((app) => {
          if (app.appKey === 'projects' && tasksInstalled) return null;
          const href = `/w/${currentWorkspaceId}/${app.appKey}`;
          if (app.appKey === 'tasks') {
            return (
              <div key={app.appKey} className="space-y-0.5">
                <ShellNavLink href={`${href}?view=today`} active={tasksPathActive} onNavigate={closeMobileNav}>
                  <ManifestIcon name={app.manifest.nav.icon} className={appTintClass(app.appKey)} />
                  {app.manifest.nav.label}
                </ShellNavLink>
                <TasksNav
                  variant="shell"
                  workspaceId={currentWorkspaceId!}
                  activeView={projectIdFromPath ? null : activeTaskView}
                  activeProjectId={projectIdFromPath}
                  views={taskCountsQuery.data?.counts.views}
                  projects={projectsQuery.data?.projects ?? []}
                  projectCounts={taskCountsQuery.data?.counts.projects}
                />
              </div>
            );
          }
          return (
            <ShellNavLink
              key={app.appKey}
              href={href}
              active={pathname === href || (pathname?.startsWith(`${href}/`) ?? false)}
              onNavigate={closeMobileNav}
            >
              <ManifestIcon name={app.manifest.nav.icon} className={appTintClass(app.appKey)} />
              {app.manifest.nav.label}
            </ShellNavLink>
          );
        })}
      </nav>
      <div className="p-2">
        <ProfileMenu
          name={meQuery.data.user.name}
          email={meQuery.data.user.email}
          workspaceId={currentWorkspaceId!}
          onNavigate={closeMobileNav}
          onLogout={() => logoutMutation.mutate()}
        />
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
        <header
          className={cn(
            'sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-3 py-2.5 backdrop-blur transition-colors sm:px-4 md:px-6 md:py-3',
            scrolled ? 'border-border bg-background/85' : 'border-transparent bg-background',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 md:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                {breadcrumb.map((item, index) => {
                  const isLast = index === breadcrumb.length - 1;
                  return (
                    <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                      {index > 0 ? <span aria-hidden="true">›</span> : null}
                      {item.href && !isLast ? (
                        <Link
                          href={item.href}
                          className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span
                          className={isLast ? 'font-medium text-foreground' : undefined}
                          aria-current={isLast ? 'page' : undefined}
                        >
                          {item.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Search and commands"
              onClick={() => setPaletteOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
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
          calendarInstalled={calendarInstalled}
        />
      ) : null}
      <ShellCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        installedAppKeys={(appsQuery.data?.apps ?? []).map((app) => app.appKey)}
        extraCommands={shellCommands}
      />
      <ShortcutsSheet
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        installedAppKeys={(appsQuery.data?.apps ?? []).map((app) => app.appKey)}
        manualHref={currentWorkspaceId ? `/w/${currentWorkspaceId}/docs/start` : undefined}
      />
      <Dialog
        open={createWorkspaceOpen}
        onClose={() => {
          if (createWorkspaceMutation.isPending) return;
          setCreateWorkspaceOpen(false);
        }}
        aria-labelledby={createWorkspaceTitleId}
      >
        <form
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newWorkspaceName.trim() || createWorkspaceMutation.isPending) return;
            createWorkspaceMutation.mutate();
          }}
        >
          <div className="space-y-1">
            <h2 id={createWorkspaceTitleId} className="text-base font-semibold text-foreground">
              Create workspace
            </h2>
            <p className="text-sm text-muted-foreground">
              Shared workspaces let you invite people and collaborate.
            </p>
          </div>
          <Input
            data-autofocus
            placeholder="Workspace name"
            value={newWorkspaceName}
            onChange={(event) => setNewWorkspaceName(event.target.value)}
            aria-label="Workspace name"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={createWorkspaceMutation.isPending}
              onClick={() => setCreateWorkspaceOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newWorkspaceName.trim() || createWorkspaceMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>
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

function ManifestIcon({ name, className }: { name: string; className?: string }) {
  const icons = lucideIcons as unknown as Record<string, LucideIcon | undefined>;
  const Icon = icons[name];
  if (!Icon) return <span className="h-4 w-4 shrink-0" />;
  return <Icon className={cn('h-4 w-4 shrink-0', className)} />;
}

/** Each app's quiet signature tint, used only for its nav icon. */
function appTintClass(appKey: string) {
  switch (appKey) {
    case 'tasks':
      return 'text-app-tasks';
    case 'calendar':
      return 'text-app-calendar';
    case 'notes':
      return 'text-app-notes';
    case 'projects':
      return 'text-app-projects';
    default:
      return 'text-muted-foreground';
  }
}

function ShellNavGroup({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground">{children}</div>;
}

/** Top-level nav: soft tint plus a 2px terracotta marker when active. Nested views use weight only. */
function ShellNavLink({
  href,
  active,
  children,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        'relative flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active &&
          'bg-nav-active font-medium text-foreground hover:bg-nav-active before:absolute before:inset-y-2 before:-left-2 before:w-0.5 before:rounded-full before:bg-nav-marker',
      )}
    >
      {children}
    </Link>
  );
}

type BreadcrumbItem = { label: string; href?: string };

function deriveShellBreadcrumb({
  pathname,
  workspaceId,
  searchParams,
  projectName,
  apps,
}: {
  pathname: string;
  workspaceId: string | null;
  searchParams: URLSearchParams;
  projectName?: string;
  apps: Array<{ appKey: string; manifest: { nav: { label: string }; name: string } }>;
}): BreadcrumbItem[] {
  const base = workspaceId ? `/w/${workspaceId}` : '';
  if (!workspaceId || !pathname.startsWith(base)) return [{ label: 'Today' }];

  const rest = pathname.slice(base.length).replace(/^\//, '');
  if (!rest) return [{ label: 'Today' }];

  const [segment, ...tail] = rest.split('/');
  if (segment === 'settings') return [{ label: 'Settings' }];
  if (segment === 'review') return [{ label: 'Review day' }];
  if (segment === 'apps') return [{ label: 'Apps' }];
  if (segment === 'docs') {
    return [{ label: 'Manual' }];
  }
  if (segment === 'calendar') {
    if (tail[0] === 'settings') {
      return [
        { label: 'Calendar', href: `${base}/calendar` },
        { label: 'Settings' },
      ];
    }
    return [{ label: 'Calendar' }];
  }
  if (segment === 'tasks') {
    if (tail[0] === 'settings') {
      return [
        { label: 'Tasks', href: `${base}/tasks?view=today` },
        { label: 'Settings' },
      ];
    }
    const view = searchParams.get('view') ?? 'today';
    const viewLabel =
      view === 'inbox'
        ? 'Inbox'
        : view === 'upcoming'
          ? 'Upcoming'
          : view === 'anytime'
            ? 'Anytime'
            : view === 'someday'
              ? 'Someday'
              : view === 'logbook'
                ? 'Logbook'
                : 'Today';
    return [
      { label: 'Tasks', href: `${base}/tasks?view=today` },
      { label: viewLabel },
    ];
  }
  if (segment === 'projects') {
    if (!tail[0]) return [{ label: 'Projects' }];
    return [
      { label: 'Projects', href: `${base}/projects` },
      { label: projectName ?? 'Project' },
    ];
  }

  const installed = apps.find((app) => app.appKey === segment);
  if (installed) return [{ label: installed.manifest.nav.label || installed.manifest.name }];

  const title = segment.charAt(0).toUpperCase() + segment.slice(1);
  return [{ label: title }];
}

'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List as ListIcon, Plus, X } from 'lucide-react';
import type { TaskSettings } from '@erp-tiza/shared';
import { createTask, getTaskSettings, listTasks, reorderTasks, updateTask, type Task } from './tasks-api';
import {
  defaultTaskSettings,
  enabledStatuses,
  formatDueAtShort,
  isDoneStatus,
  isDueToday,
  isOverdue,
  priorityColor,
  statusLabel,
} from './task-status';
import { TasksBoard, type TaskBoardMove } from './tasks-board';
import { TaskEditForm } from './task-edit-form';
import { listProjects, type Project } from '../projects/projects-api';
import { listInstalledApps } from '../apps/apps-api';
import { listMembers, getWorkspace } from '../workspaces/workspaces-api';
import { me } from '../auth/auth-api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { PageContainer, PageHeader } from '../../components/layout/page-container';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

type Scope = 'all' | 'today';
type LayoutMode = 'list' | 'board';

type UndoAction =
  | { kind: 'delete'; task: Task; label: string }
  | { kind: 'move'; previous: { id: string; status: string; position: number }[]; label: string };

const selectClass =
  'h-11 w-full rounded-lg border border-border bg-card px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-auto sm:text-sm';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function TasksWorkspace({
  workspaceId,
  lockedProjectId,
  header,
}: {
  workspaceId: string;
  lockedProjectId?: string;
  header?: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const composerRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const basePath = lockedProjectId
    ? `/w/${workspaceId}/projects/${lockedProjectId}`
    : `/w/${workspaceId}/tasks`;

  const scope: Scope = searchParams.get('scope') === 'today' ? 'today' : 'all';
  const layout: LayoutMode = searchParams.get('view') === 'board' ? 'board' : 'list';
  const filterProjectId = lockedProjectId || searchParams.get('projectId') || undefined;
  const assignee = searchParams.get('assignee') === 'me' ? 'me' : undefined;
  const showDone = searchParams.get('done') === '1';
  const selectedTaskId = searchParams.get('taskId');
  const urlQuery = searchParams.get('q') ?? '';

  const [composerTitle, setComposerTitle] = useState('');
  const [composerProjectId, setComposerProjectId] = useState('');
  const [searchText, setSearchText] = useState(urlQuery);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const installedQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });
  const tasksInstalled = installedQuery.data?.apps.some((app) => app.appKey === 'tasks');
  const projectsInstalled = installedQuery.data?.apps.some((app) => app.appKey === 'projects');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });
  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });
  const settingsQuery = useQuery({
    queryKey: ['task-settings', workspaceId],
    queryFn: () => getTaskSettings(workspaceId),
    enabled: Boolean(tasksInstalled),
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => listProjects(workspaceId),
    enabled: Boolean(projectsInstalled),
  });
  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
    enabled: Boolean(tasksInstalled),
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', workspaceId, { projectId: lockedProjectId }],
    queryFn: () => listTasks(workspaceId, lockedProjectId ? { projectId: lockedProjectId } : {}),
    enabled: Boolean(tasksInstalled),
  });

  const settings: TaskSettings = settingsQuery.data?.settings ?? defaultTaskSettings();
  const statusOptions = enabledStatuses(settings);
  const projects = projectsQuery.data?.projects ?? [];
  const activeProjects = projects.filter((project) => project.status === 'active');
  const inboxProject = activeProjects.find((project) => project.name === 'Inbox') ?? activeProjects[0];
  const defaultComposerProject = lockedProjectId || composerProjectId || inboxProject?.id || '';

  useEffect(() => {
    if (tasksInstalled) composerRef.current?.focus();
  }, [tasksInstalled]);

  useEffect(() => {
    setSearchText(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextQuery = searchText.trim();
      if (nextQuery === urlQuery) return;
      replaceParams((params) => {
        if (!nextQuery) params.delete('q');
        else params.set('q', nextQuery);
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [searchText, urlQuery]);

  useEffect(() => {
    if (!undo) return;
    const handle = window.setTimeout(() => setUndo(null), 5000);
    return () => window.clearTimeout(handle);
  }, [undo]);

  const createMutation = useMutation({
    mutationFn: (input: { title: string; projectId: string; status?: string }) =>
      createTask(workspaceId, input),
    onSuccess: async (_task, variables) => {
      if (!variables.status) {
        setComposerTitle('');
        composerRef.current?.focus();
      }
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not create task');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, nextStatus }: { taskId: string; nextStatus: string }) =>
      updateTask(workspaceId, taskId, { status: nextStatus }),
    onMutate: async ({ taskId, nextStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previous = queryClient.getQueriesData<{ tasks: Task[] }>({ queryKey: ['tasks', workspaceId] });
      queryClient.setQueriesData<{ tasks: Task[] }>({ queryKey: ['tasks', workspaceId] }, (current) => {
        if (!current) return current;
        return {
          tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: (moves: TaskBoardMove[]) => reorderTasks(workspaceId, { moves }),
    onMutate: async (moves) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previous = queryClient.getQueriesData<{ tasks: Task[] }>({ queryKey: ['tasks', workspaceId] });
      const byId = new Map(moves.map((move) => [move.taskId, move]));
      queryClient.setQueriesData<{ tasks: Task[] }>({ queryKey: ['tasks', workspaceId] }, (current) => {
        if (!current) return current;
        return {
          tasks: current.tasks.map((task) => {
            const move = byId.get(task.id);
            return move ? { ...task, status: move.status, position: move.position } : task;
          }),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
  });

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const query = next.toString();
    router.replace(query ? `${basePath}?${query}` : basePath);
  }

  function setScope(nextScope: Scope) {
    replaceParams((params) => {
      if (nextScope === 'all') params.delete('scope');
      else params.set('scope', nextScope);
    });
  }

  function setLayout(nextLayout: LayoutMode) {
    replaceParams((params) => {
      if (nextLayout === 'list') params.delete('view');
      else params.set('view', nextLayout);
    });
  }

  function openTask(taskId: string) {
    replaceParams((params) => params.set('taskId', taskId));
  }

  function closeTask() {
    replaceParams((params) => params.delete('taskId'));
  }

  function memberLabel(userId: string | null) {
    if (!userId) return 'Unassigned';
    if (userId === meQuery.data?.user.id) return meQuery.data.user.name || 'Me';
    const member = (membersQuery.data?.members ?? []).find((item) => item.userId === userId);
    return member?.name?.trim() || member?.email || 'Member';
  }

  function projectName(id: string) {
    return projects.find((project) => project.id === id)?.name ?? 'Project';
  }

  const visibleTasks = useMemo(() => {
    const rows = tasksQuery.data?.tasks ?? [];
    const needle = searchText.trim().toLowerCase();
    return rows.filter((task) => {
      if (filterProjectId && task.projectId !== filterProjectId) return false;
      if (assignee === 'me' && task.assigneeUserId !== meQuery.data?.user.id) return false;
      if (needle && !task.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [assignee, filterProjectId, meQuery.data?.user.id, searchText, tasksQuery.data?.tasks]);

  const todayTasks = visibleTasks.filter(
    (task) => !isDoneStatus(settings, task.status) && (isOverdue(task.dueAt, task.status, settings) || isDueToday(task.dueAt)),
  );
  const scopedTasks = scope === 'today' ? todayTasks : visibleTasks;
  const isProjectList = Boolean(lockedProjectId) && scope === 'all';
  const listedTasks = isProjectList
    ? scopedTasks.filter((task) => !isDoneStatus(settings, task.status))
    : scope === 'all' && !showDone
      ? scopedTasks.filter((task) => !isDoneStatus(settings, task.status))
      : scopedTasks;
  const completedTasks = isProjectList
    ? scopedTasks.filter((task) => isDoneStatus(settings, task.status))
    : [];
  const boardTasks = scope === 'today' ? todayTasks : visibleTasks;
  const groups = groupTasks(listedTasks, {
    by: lockedProjectId ? 'status' : 'project',
    projects,
    settings,
  });
  const openCount = visibleTasks.filter((task) => !isDoneStatus(settings, task.status)).length;
  const isBoard = layout === 'board';
  const hasSearch = searchText.trim().length > 0;
  const navigableTaskIds = useMemo(() => listedTasks.map((task) => task.id), [listedTasks]);

  useEffect(() => {
    if (!focusedTaskId) return;
    if (!navigableTaskIds.includes(focusedTaskId)) setFocusedTaskId(null);
  }, [focusedTaskId, navigableTaskIds]);

  useEffect(() => {
    if (!focusedTaskId) return;
    document.querySelector(`[data-task-id="${focusedTaskId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focusedTaskId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedTaskId) return;
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (event.key === 'c' && !isTypingTarget(event.target)) {
        event.preventDefault();
        composerRef.current?.focus();
        return;
      }
      if (isBoard || isTypingTarget(event.target) || navigableTaskIds.length === 0) return;
      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault();
        const currentIndex = focusedTaskId ? navigableTaskIds.indexOf(focusedTaskId) : -1;
        const nextIndex =
          currentIndex < 0
            ? event.key === 'j'
              ? 0
              : navigableTaskIds.length - 1
            : Math.min(navigableTaskIds.length - 1, Math.max(0, currentIndex + (event.key === 'j' ? 1 : -1)));
        setFocusedTaskId(navigableTaskIds[nextIndex] ?? null);
        return;
      }
      if (event.key === 'Enter' && focusedTaskId) {
        event.preventDefault();
        openTask(focusedTaskId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedTaskId, isBoard, navigableTaskIds, selectedTaskId]);

  function moveTasks(moves: TaskBoardMove[]) {
    const previous = moves
      .map((move) => {
        const task = (tasksQuery.data?.tasks ?? []).find((item) => item.id === move.taskId);
        return task ? { id: task.id, status: task.status, position: task.position } : null;
      })
      .filter((item): item is { id: string; status: string; position: number } => Boolean(item));
    if (previous.length) setUndo({ kind: 'move', previous, label: 'Task moved' });
    moveMutation.mutate(moves);
  }

  async function runUndo() {
    if (!undo) return;
    const action = undo;
    setUndo(null);
    if (action.kind === 'delete') {
      await createTask(workspaceId, {
        title: action.task.title,
        description: action.task.description,
        projectId: action.task.projectId,
        status: action.task.status,
        priority: action.task.priority,
        dueAt: action.task.dueAt,
        assigneeUserId: action.task.assigneeUserId,
      });
    } else {
      await reorderTasks(workspaceId, {
        moves: action.previous.map((item) => ({
          taskId: item.id,
          status: item.status,
          position: item.position,
        })),
      });
    }
    await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!composerTitle.trim() || !defaultComposerProject) return;
    createMutation.mutate({ title: composerTitle.trim(), projectId: defaultComposerProject });
  }

  if (installedQuery.isLoading) {
    return (
      <PageContainer size="full">
        <PageHeader title="Tasks" description="Loading…" />
      </PageContainer>
    );
  }

  if (!tasksInstalled) {
    return (
      <PageContainer size="md">
        {header}
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Tasks is not installed. Install Projects first, then Tasks, from the marketplace.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="full" className={cn(isBoard && 'max-w-none')}>
      {header ?? (
        <PageHeader
          title="Tasks"
          description={
            workspaceQuery.data?.workspace.kind === 'personal'
              ? 'Open work across your projects.'
              : 'Shared work across projects.'
          }
        />
      )}

      <form
        className="flex flex-col gap-2 rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring sm:flex-row sm:items-center"
        onSubmit={onCreate}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Plus className="ml-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={composerRef}
            className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:h-9 sm:text-sm"
            placeholder="Add a task…"
            value={composerTitle}
            onChange={(event) => setComposerTitle(event.target.value)}
          />
        </div>
        {lockedProjectId ? null : (
          <select
            className={cn(selectClass, 'sm:min-w-36')}
            value={defaultComposerProject}
            onChange={(event) => setComposerProjectId(event.target.value)}
            aria-label="Project for new task"
          >
            {activeProjects.length === 0 ? <option value="">No projects</option> : null}
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
        <Button
          size="sm"
          className="h-11 shrink-0 sm:h-9"
          disabled={createMutation.isPending || !defaultComposerProject || !composerTitle.trim()}
        >
          Add
        </Button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          <ScopeButton active={scope === 'all'} onClick={() => setScope('all')}>
            All
          </ScopeButton>
          <ScopeButton active={scope === 'today'} onClick={() => setScope('today')}>
            Today
          </ScopeButton>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          <ScopeButton active={!isBoard} onClick={() => setLayout('list')}>
            <ListIcon className="h-3.5 w-3.5" />
            List
          </ScopeButton>
          <ScopeButton active={isBoard} onClick={() => setLayout('board')}>
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </ScopeButton>
        </div>
        <Input
          ref={searchRef}
          className="h-11 w-full sm:h-9 sm:w-44"
          placeholder="Search tasks"
          aria-label="Search tasks"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        {lockedProjectId ? null : (
          <select
            className={selectClass}
            value={searchParams.get('projectId') ?? ''}
            onChange={(event) =>
              replaceParams((params) => {
                if (!event.target.value) params.delete('projectId');
                else params.set('projectId', event.target.value);
              })
            }
            aria-label="Filter by project"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
        <select
          className={selectClass}
          value={assignee ?? ''}
          onChange={(event) =>
            replaceParams((params) => {
              if (!event.target.value) params.delete('assignee');
              else params.set('assignee', event.target.value);
            })
          }
          aria-label="Filter by assignee"
        >
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
        </select>
        {!lockedProjectId && scope === 'all' && !isBoard ? (
          <button
            type="button"
            className="h-11 px-2 text-sm text-muted-foreground hover:text-foreground sm:h-9"
            onClick={() =>
              replaceParams((params) => {
                if (showDone) params.delete('done');
                else params.set('done', '1');
              })
            }
          >
            {showDone ? 'Hide done' : 'Show done'}
          </button>
        ) : null}
        {!tasksQuery.isLoading && visibleTasks.length > 0 ? (
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{openCount} open</span>
        ) : null}
      </div>

      {tasksQuery.isLoading || settingsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : tasksQuery.isError ? (
        <p className="text-sm text-red-600">
          {tasksQuery.error instanceof ApiError ? tasksQuery.error.message : 'Failed to load tasks'}
        </p>
      ) : (isBoard ? boardTasks : listedTasks).length === 0 && completedTasks.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-base font-semibold text-foreground">
              {hasSearch
                ? 'No matches'
                : scope === 'today'
                  ? 'Nothing due today'
                  : 'Your list is clear'}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasSearch ? 'Try another title.' : 'Type above and press Enter.'}
            </p>
          </CardContent>
        </Card>
      ) : isBoard ? (
        <TasksBoard
          tasks={boardTasks}
          settings={settings}
          projectName={projectName}
          memberLabel={memberLabel}
          onMove={moveTasks}
          onOpenTask={openTask}
          onCreate={
            defaultComposerProject
              ? (status, title) =>
                  createMutation.mutate({ title, projectId: defaultComposerProject, status })
              : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
              <TaskRows
                tasks={group.tasks}
                settings={settings}
                showProject={!lockedProjectId && group.key.startsWith('status:')}
                focusedTaskId={focusedTaskId}
                projectName={projectName}
                memberLabel={memberLabel}
                onOpen={openTask}
                onFocusTask={setFocusedTaskId}
                onToggleDone={(task) => {
                  const fallbackOpen = statusOptions.find((item) => !item.isDone)?.key ?? task.status;
                  const doneStatus = settings.statuses.find((item) => item.isDone && item.enabled)?.key ?? task.status;
                  const done = isDoneStatus(settings, task.status);
                  statusMutation.mutate({
                    taskId: task.id,
                    nextStatus: done ? fallbackOpen : doneStatus,
                  });
                }}
              />
            </section>
          ))}
          {completedTasks.length > 0 ? (
            <section className="space-y-2">
              <button
                type="button"
                className="text-sm font-semibold text-foreground"
                aria-expanded={completedOpen}
                onClick={() => setCompletedOpen((open) => !open)}
              >
                Completed · {completedTasks.length}
              </button>
              {completedOpen ? (
                <TaskRows
                  tasks={completedTasks}
                  settings={settings}
                  showProject={false}
                  focusedTaskId={focusedTaskId}
                  projectName={projectName}
                  memberLabel={memberLabel}
                  onOpen={openTask}
                  onFocusTask={setFocusedTaskId}
                  onToggleDone={(task) => {
                    const fallbackOpen = statusOptions.find((item) => !item.isDone)?.key ?? task.status;
                    statusMutation.mutate({ taskId: task.id, nextStatus: fallbackOpen });
                  }}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      )}

      <Dialog open={Boolean(selectedTaskId)} onClose={closeTask} className="sm:max-w-xl">
        <div className="flex items-center justify-end border-b border-border px-3 py-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={closeTask}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {selectedTaskId ? (
          <TaskEditForm
            workspaceId={workspaceId}
            taskId={selectedTaskId}
            settings={settings}
            onDeleted={(task) => {
              closeTask();
              setUndo({ kind: 'delete', task, label: `Deleted “${task.title}”` });
            }}
          />
        ) : null}
      </Dialog>
      {undo ? (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
          <span>{undo.label}</span>
          <button type="button" className="font-semibold underline" onClick={() => void runUndo()}>
            Undo
          </button>
        </div>
      ) : null}
    </PageContainer>
  );
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TaskRows({
  tasks,
  settings,
  showProject,
  focusedTaskId,
  projectName,
  memberLabel,
  onOpen,
  onFocusTask,
  onToggleDone,
}: {
  tasks: Task[];
  settings: TaskSettings;
  showProject: boolean;
  focusedTaskId: string | null;
  projectName: (id: string) => string;
  memberLabel: (userId: string | null) => string;
  onOpen: (taskId: string) => void;
  onFocusTask: (taskId: string) => void;
  onToggleDone: (task: Task) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {tasks.map((task, index) => {
        const overdue = isOverdue(task.dueAt, task.status, settings);
        const done = isDoneStatus(settings, task.status);
        const dueLabel = formatDueAtShort(task.dueAt);
        const accent = priorityColor(settings, task.priority);
        const showAccent = task.priority !== 'none';
        const focused = focusedTaskId === task.id;
        return (
          <div
            key={task.id}
            data-task-id={task.id}
            className={cn(
              'group relative flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted sm:px-4',
              index > 0 && 'border-t border-border',
              overdue && 'bg-red-50/30 hover:bg-red-50/50',
              focused && 'bg-accent',
              done && 'opacity-70',
            )}
          >
            {showAccent ? (
              <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} aria-hidden />
            ) : null}
            <button
              type="button"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-border text-transparent hover:border-foreground/40',
              )}
              aria-label={done ? 'Mark as open' : 'Mark as done'}
              onClick={(event) => {
                event.stopPropagation();
                onToggleDone(task);
              }}
            >
              ✓
            </button>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onOpen(task.id)}
              onFocus={() => onFocusTask(task.id)}
            >
              <p className={cn('truncate text-sm font-medium text-foreground', done && 'text-muted-foreground line-through')}>
                {task.title}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span>{statusLabel(settings, task.status)}</span>
                {showProject ? (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate">{projectName(task.projectId)}</span>
                  </>
                ) : null}
                {task.assigneeUserId ? (
                  <>
                    <span className="text-border">·</span>
                    <span>{memberLabel(task.assigneeUserId)}</span>
                  </>
                ) : null}
              </div>
            </button>
            {dueLabel ? (
              <span className={cn('shrink-0 text-xs', overdue ? 'font-medium text-red-600' : 'text-muted-foreground')}>
                {dueLabel}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function groupTasks(
  tasks: Task[],
  options: { by: 'project' | 'status'; projects: Project[]; settings: TaskSettings },
) {
  if (options.by === 'status') {
    const statuses = enabledStatuses(options.settings);
    const groups = statuses.map((status) => ({
      key: `status:${status.key}`,
      label: status.label,
      tasks: tasks.filter((task) => task.status === status.key),
    }));
    const known = new Set(statuses.map((status) => status.key));
    const extras = tasks.filter((task) => !known.has(task.status));
    if (extras.length) groups.push({ key: 'status:other', label: 'Other', tasks: extras });
    return groups.filter((group) => group.tasks.length > 0);
  }
  const byProject = new Map<string, Task[]>();
  for (const task of tasks) {
    const list = byProject.get(task.projectId) ?? [];
    list.push(task);
    byProject.set(task.projectId, list);
  }
  return [...byProject.entries()].map(([projectId, projectTasks]) => ({
    key: projectId,
    label: options.projects.find((project) => project.id === projectId)?.name ?? 'Project',
    tasks: projectTasks,
  }));
}

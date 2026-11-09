'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List as ListIcon, Plus, X } from 'lucide-react';
import type { ListTasksQuery, TaskSettings } from '@erp-tiza/shared';
import {
  createTask,
  getTaskSettings,
  listTasks,
  updateTask,
  type Task,
} from '../../../../features/tasks/tasks-api';
import {
  defaultTaskSettings,
  enabledStatuses,
  formatDueAtShort,
  isDoneStatus,
  isOverdue,
  priorityColor,
} from '../../../../features/tasks/task-status';
import { TasksBoard, type TaskBoardMove } from '../../../../features/tasks/tasks-board';
import { TaskEditForm } from '../../../../features/tasks/task-edit-form';
import { listProjects } from '../../../../features/projects/projects-api';
import { listInstalledApps } from '../../../../features/apps/apps-api';
import { listMembers, getWorkspace } from '../../../../features/workspaces/workspaces-api';
import { me } from '../../../../features/auth/auth-api';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Card, CardContent } from '../../../../components/ui/card';
import { Dialog } from '../../../../components/ui/dialog';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';
import { ApiError } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';

type ViewMode = 'list' | 'board';

const selectClass =
  'h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-400';

const statusSelectClass =
  'h-8 max-w-[9.5rem] cursor-pointer rounded-md border-0 bg-zinc-100 px-2 text-xs font-medium text-zinc-700 outline-none hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-400';

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <PageContainer size="xl">
          <PageHeader title="Tasks" description="Loading…" />
        </PageContainer>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const composerRef = useRef<HTMLInputElement>(null);

  const view = (searchParams.get('view') as ViewMode) || 'list';
  const projectId = searchParams.get('projectId') || undefined;
  const status = searchParams.get('status') || undefined;
  const assignee = (searchParams.get('assignee') as ListTasksQuery['assignee']) || undefined;
  const due = (searchParams.get('due') as ListTasksQuery['due']) || undefined;
  const selectedTaskId = searchParams.get('taskId');

  const filters: ListTasksQuery = useMemo(
    () => ({ projectId, status, assignee, due }),
    [projectId, status, assignee, due],
  );
  const hasFilters = Boolean(projectId || status || assignee || due);

  const [composerTitle, setComposerTitle] = useState('');
  const [composerProjectId, setComposerProjectId] = useState('');
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
    queryKey: ['tasks', workspaceId, filters],
    queryFn: () => listTasks(workspaceId, filters),
    enabled: Boolean(tasksInstalled),
  });

  const settings: TaskSettings = settingsQuery.data?.settings ?? defaultTaskSettings();
  const statusOptions = enabledStatuses(settings);
  const doneKeys = new Set(settings.statuses.filter((item) => item.isDone).map((item) => item.key));

  const activeProjects = (projectsQuery.data?.projects ?? []).filter(
    (project) => project.status === 'active',
  );

  const defaultComposerProject =
    composerProjectId ||
    projectId ||
    activeProjects.find((project) => project.name === 'Inbox')?.id ||
    activeProjects[0]?.id ||
    '';

  useEffect(() => {
    if (tasksInstalled) composerRef.current?.focus();
  }, [tasksInstalled]);

  const createMutation = useMutation({
    mutationFn: () =>
      createTask(workspaceId, {
        title: composerTitle.trim(),
        projectId: defaultComposerProject,
      }),
    onSuccess: async () => {
      setComposerTitle('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      composerRef.current?.focus();
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
      const previous = queryClient.getQueriesData<{ tasks: Task[] }>({
        queryKey: ['tasks', workspaceId],
      });
      queryClient.setQueriesData<{ tasks: Task[] }>({ queryKey: ['tasks', workspaceId] }, (current) => {
        if (!current) return current;
        return {
          tasks: current.tasks.map((task) =>
            task.id === taskId ? { ...task, status: nextStatus } : task,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: (moves: TaskBoardMove[]) =>
      Promise.all(
        moves.map((move) =>
          updateTask(workspaceId, move.taskId, { status: move.status, position: move.position }),
        ),
      ),
    onMutate: async (moves) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previous = queryClient.getQueriesData<{ tasks: Task[] }>({
        queryKey: ['tasks', workspaceId],
      });
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
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.replace(`/w/${workspaceId}/tasks?${next.toString()}`);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    if (view === 'board') next.set('view', 'board');
    if (selectedTaskId) next.set('taskId', selectedTaskId);
    router.replace(`/w/${workspaceId}/tasks${next.toString() ? `?${next}` : ''}`);
  }

  function setViewMode(nextView: ViewMode) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextView === 'list') next.delete('view');
    else next.set('view', nextView);
    if (nextView === 'board') next.delete('status');
    router.replace(`/w/${workspaceId}/tasks?${next.toString()}`);
  }

  function openTask(taskId: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('taskId', taskId);
    router.push(`/w/${workspaceId}/tasks?${next.toString()}`);
  }

  function closeTask() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('taskId');
    router.replace(`/w/${workspaceId}/tasks${next.toString() ? `?${next}` : ''}`);
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!composerTitle.trim() || !defaultComposerProject) return;
    createMutation.mutate();
  }

  function memberLabel(userId: string | null) {
    if (!userId) return 'Unassigned';
    if (userId === meQuery.data?.user.id) return 'Me';
    const member = (membersQuery.data?.members ?? []).find((item) => item.userId === userId);
    return member?.email ?? 'Member';
  }

  function projectName(id: string) {
    return (projectsQuery.data?.projects ?? []).find((project) => project.id === id)?.name ?? 'Project';
  }

  if (installedQuery.isLoading) {
    return (
      <PageContainer size="xl">
        <PageHeader title="Tasks" description="Loading…" />
      </PageContainer>
    );
  }

  if (!tasksInstalled) {
    return (
      <PageContainer size="md">
        <PageHeader title="Tasks" description="Track to-dos across projects." />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-zinc-600">
              Tasks is not installed. Install Projects first, then Tasks.
            </p>
            <Link
              href={`/w/${workspaceId}/apps`}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white sm:w-auto"
            >
              Open marketplace
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const tasks = tasksQuery.data?.tasks ?? [];
  const openCount = tasks.filter((task) => !doneKeys.has(task.status)).length;
  const isBoard = view === 'board';

  return (
    <PageContainer size="xl" className={cn('space-y-4', isBoard && 'max-w-none')}>
      <PageHeader
        title="Tasks"
        description={
          workspaceQuery.data?.workspace.kind === 'personal'
            ? 'Capture fast, organize by project, stay on top of due dates.'
            : 'Shared work with assignees, filters, and a board.'
        }
        actions={
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
                !isBoard ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
              )}
              onClick={() => setViewMode('list')}
              aria-pressed={!isBoard}
            >
              <ListIcon className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
                isBoard ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
              )}
              onClick={() => setViewMode('board')}
              aria-pressed={isBoard}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
          </div>
        }
      />

      <form
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-zinc-300"
        onSubmit={onCreate}
      >
        <Plus className="ml-1.5 h-4 w-4 shrink-0 text-zinc-400" />
        <Input
          ref={composerRef}
          className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          placeholder="Add a task…"
          value={composerTitle}
          onChange={(event) => setComposerTitle(event.target.value)}
        />
        <select
          className={cn(selectClass, 'hidden w-auto min-w-28 sm:block')}
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
        <Button
          size="sm"
          className="h-9 shrink-0"
          disabled={createMutation.isPending || !defaultComposerProject || !composerTitle.trim()}
        >
          Add
        </Button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={cn(selectClass, 'w-auto min-w-36')}
          value={projectId ?? ''}
          onChange={(event) => setFilter('projectId', event.target.value)}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {(projectsQuery.data?.projects ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          className={cn(selectClass, 'w-auto min-w-32')}
          value={assignee ?? ''}
          onChange={(event) => setFilter('assignee', event.target.value)}
          aria-label="Filter by assignee"
        >
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
        </select>
        {!isBoard ? (
          <select
            className={cn(selectClass, 'w-auto min-w-32')}
            value={status ?? ''}
            onChange={(event) => setFilter('status', event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {statusOptions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className={cn(selectClass, 'w-auto min-w-32')}
          value={due ?? ''}
          onChange={(event) => setFilter('due', event.target.value)}
          aria-label="Filter by due date"
        >
          <option value="">Any due</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="none">No due date</option>
        </select>
        {hasFilters ? (
          <button
            type="button"
            className="h-9 px-2 text-sm text-zinc-500 hover:text-zinc-800"
            onClick={clearFilters}
          >
            Clear
          </button>
        ) : null}
        {!tasksQuery.isLoading && tasks.length > 0 ? (
          <span className="ml-auto text-xs tabular-nums text-zinc-400">
            {openCount} open · {tasks.length} shown
          </span>
        ) : null}
      </div>

      {tasksQuery.isLoading || settingsQuery.isLoading ? (
        <p className="text-sm text-zinc-500">Loading tasks…</p>
      ) : tasksQuery.isError ? (
        <p className="text-sm text-red-600">
          {tasksQuery.error instanceof ApiError ? tasksQuery.error.message : 'Failed to load tasks'}
        </p>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-base font-semibold text-zinc-900">
              {hasFilters ? 'No matches' : 'Your list is clear'}
            </p>
            <p className="mx-auto max-w-md text-sm text-zinc-500">
              {hasFilters
                ? 'Try clearing filters, or add a task that fits this view.'
                : 'Type above and press Enter. Use projects to group work; assign people in shared workspaces.'}
            </p>
            {hasFilters ? (
              <Button variant="outline" className="h-10" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button className="h-10" onClick={() => composerRef.current?.focus()}>
                Focus composer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isBoard ? (
        <TasksBoard
          tasks={tasks}
          settings={settings}
          projectName={projectName}
          memberLabel={memberLabel}
          onMove={(moves) => moveMutation.mutate(moves)}
          onOpenTask={openTask}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {tasks.map((task, index) => {
            const overdue = isOverdue(task.dueAt, task.status, settings);
            const done = isDoneStatus(settings, task.status);
            const dueLabel = formatDueAtShort(task.dueAt);
            const accent = priorityColor(settings, task.priority);
            const showAccent = task.priority !== 'none';
            const rowStatuses = [...statusOptions];
            if (!rowStatuses.some((item) => item.key === task.status)) {
              const orphan = settings.statuses.find((item) => item.key === task.status);
              if (orphan) rowStatuses.push(orphan);
            }
            return (
              <div
                key={task.id}
                className={cn(
                  'group relative flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-zinc-50 sm:px-4',
                  index > 0 && 'border-t border-zinc-100',
                  overdue && 'bg-red-50/30 hover:bg-red-50/50',
                  done && 'opacity-70',
                )}
                onClick={() => openTask(task.id)}
              >
                {showAccent ? (
                  <span
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ backgroundColor: accent }}
                    title={`Priority: ${task.priority}`}
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors',
                    done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-zinc-300 text-transparent hover:border-zinc-500 group-hover:border-zinc-400',
                  )}
                  aria-label={done ? 'Mark as open' : 'Mark as done'}
                  onClick={(event) => {
                    event.stopPropagation();
                    const fallbackOpen =
                      statusOptions.find((item) => !item.isDone)?.key ?? statusOptions[0]?.key;
                    const doneStatus =
                      settings.statuses.find((item) => item.isDone && item.enabled)?.key ??
                      settings.statuses.find((item) => item.isDone)?.key;
                    statusMutation.mutate({
                      taskId: task.id,
                      nextStatus: done
                        ? fallbackOpen ?? task.status
                        : doneStatus ?? task.status,
                    });
                  }}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-medium text-zinc-900',
                      done && 'text-zinc-500 line-through',
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500">
                    <span className="truncate">{projectName(task.projectId)}</span>
                    {task.assigneeUserId ? (
                      <>
                        <span className="text-zinc-300">·</span>
                        <span>{memberLabel(task.assigneeUserId)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {dueLabel ? (
                    <span
                      className={cn(
                        'hidden text-xs sm:inline',
                        overdue ? 'font-medium text-red-600' : 'text-zinc-500',
                      )}
                    >
                      {dueLabel}
                    </span>
                  ) : null}
                  <select
                    className={statusSelectClass}
                    value={task.status}
                    aria-label={`Status for ${task.title}`}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      statusMutation.mutate({
                        taskId: task.id,
                        nextStatus: event.target.value,
                      });
                    }}
                  >
                    {rowStatuses.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(selectedTaskId)} onClose={closeTask}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Edit task</h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
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
            onDeleted={closeTask}
          />
        ) : null}
      </Dialog>
    </PageContainer>
  );
}

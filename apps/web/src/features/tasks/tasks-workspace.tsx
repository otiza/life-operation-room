'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, X } from 'lucide-react';
import type { TaskView } from '@erp-tiza/shared';
import { parseTaskQuickAdd } from '@erp-tiza/shared';
import {
  createTask,
  deleteTask,
  reorderTasks,
  restoreTask,
  updateTask,
  type Task,
} from './tasks-api';
import {
  dueLocalFromDateInput,
  dueLocalOnDay,
  isDoneStatus,
} from './task-status';
import { TaskEditForm } from './task-edit-form';
import { emptyStateCopy } from './tasks-nav';
import { Card, CardContent } from '../../components/ui/card';
import { Sheet } from '../../components/ui/sheet';
import { Skeleton, SkeletonText } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import { PageContainer, PageHeader } from '../../components/layout/page-container';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';
import { registerAppCommands } from '../shell/command-registry';
import { useShellStore } from '../shell/shell-store';
import type { TaskBoardMove } from './tasks-board';
import { groupByKey, groupTasks } from './task-group-utils';
import { TasksActionPickers } from './tasks-action-pickers';
import { TasksComposer } from './tasks-composer';
import { TasksFiltersBar } from './tasks-filters-bar';
import { TasksListSection } from './tasks-list-section';
import { useTaskKeyboardShortcuts } from './use-task-keyboard-shortcuts';
import { useTaskSelection } from './use-task-selection';
import { useTasksQuery } from './use-tasks-query';

type UndoAction =
  | { kind: 'delete'; task: Task; label: string }
  | { kind: 'complete'; task: Task; previousStatus: string; label: string }
  | { kind: 'move'; previous: { id: string; status: string; position: number }[]; label: string };

export function TasksWorkspace({
  workspaceId,
  lockedProjectId,
  header,
}: {
  workspaceId: string;
  lockedProjectId?: string;
  header?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const composerRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const {
    router,
    smartView,
    layout,
    filterProjectId,
    assignee,
    showDone,
    selectedTaskId,
    urlQuery,
    replaceParams,
    setLayout,
    openTask,
    closeTask,
  } = useTaskSelection(workspaceId, lockedProjectId);
  const {
    installedQuery,
    tasksInstalled,
    meQuery,
    workspaceQuery,
    membersQuery,
    tasksQuery,
    tasksListLoading,
    settings,
    statusOptions,
    projects,
    activeProjects,
  } = useTasksQuery(workspaceId, lockedProjectId, smartView);

  const [composerTitle, setComposerTitle] = useState('');
  const [composerProjectId, setComposerProjectId] = useState<string | 'inbox'>('inbox');
  const [searchText, setSearchText] = useState(urlQuery);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'status' | 'priority' | 'due' | 'when' | 'move' | 'assignee'>(null);
  const [pendingCompleteIds, setPendingCompleteIds] = useState<Set<string>>(new Set());
  const pendingTimers = useRef<Map<string, number>>(new Map());
  const undoRef = useRef<UndoAction | null>(null);
  const taskActionsRef = useRef<{
    toggleComplete: (task: Task) => void;
    deleteTaskAndUndo: (task: Task) => void | Promise<void>;
  }>({
    toggleComplete: () => undefined,
    deleteTaskAndUndo: () => undefined,
  });
  const { toast } = useToast();
  const openQuickAdd = useShellStore((state) => state.openQuickAdd);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const defaultComposerProjectId =
    lockedProjectId || (composerProjectId === 'inbox' ? null : composerProjectId || null);
  const defaultWhenDate = smartView === 'today' ? new Date().toISOString().slice(0, 10) : undefined;

  useEffect(() => {
    if (tasksInstalled) composerRef.current?.focus();
  }, [tasksInstalled]);

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

  const createMutation = useMutation({
    mutationFn: (input: {
      title: string;
      projectId?: string | null;
      status?: string;
      whenDate?: string | null;
    }) => createTask(workspaceId, input),
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

  function clearPendingComplete(taskId: string) {
    const timer = pendingTimers.current.get(taskId);
    if (timer) window.clearTimeout(timer);
    pendingTimers.current.delete(taskId);
    setPendingCompleteIds((current) => {
      const next = new Set(current);
      next.delete(taskId);
      return next;
    });
  }

  function toggleComplete(task: Task) {
    const done = isDoneStatus(settings, task.status);
    const fallbackOpen = statusOptions.find((item) => !item.isDone)?.key ?? task.status;
    const doneStatus = settings.statuses.find((item) => item.isDone && item.enabled)?.key ?? task.status;
    if (done || pendingCompleteIds.has(task.id)) {
      clearPendingComplete(task.id);
      statusMutation.mutate({ taskId: task.id, nextStatus: fallbackOpen });
      return;
    }
    if (prefersReducedMotion || smartView === 'logbook') {
      statusMutation.mutate({ taskId: task.id, nextStatus: doneStatus });
      return;
    }
    setPendingCompleteIds((current) => new Set(current).add(task.id));
    const timer = window.setTimeout(() => {
      statusMutation.mutate({ taskId: task.id, nextStatus: doneStatus });
      showUndo({
        kind: 'complete',
        task,
        previousStatus: task.status,
        label: `Completed “${task.title}”`,
      });
      clearPendingComplete(task.id);
    }, 1500);
    pendingTimers.current.set(task.id, timer);
  }

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

  function memberLabel(userId: string | null) {
    if (!userId) return 'Unassigned';
    if (userId === meQuery.data?.user.id) return meQuery.data.user.name || 'Me';
    const member = (membersQuery.data?.members ?? []).find((item) => item.userId === userId);
    return member?.name?.trim() || member?.email || 'Member';
  }

  function projectName(id: string | null) {
    if (!id) return 'Inbox';
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
  }, [assignee, filterProjectId, meQuery.data?.user, searchText, tasksQuery.data?.tasks]);

  const isProjectList = Boolean(lockedProjectId);
  const listedTasks = isProjectList
    ? visibleTasks.filter((task) => !isDoneStatus(settings, task.status) || pendingCompleteIds.has(task.id))
    : smartView === 'logbook'
      ? visibleTasks
      : smartView
        ? visibleTasks.filter((task) => !isDoneStatus(settings, task.status) || pendingCompleteIds.has(task.id))
        : !showDone
          ? visibleTasks.filter((task) => !isDoneStatus(settings, task.status) || pendingCompleteIds.has(task.id))
          : visibleTasks;
  const completedTasks = isProjectList
    ? visibleTasks.filter((task) => isDoneStatus(settings, task.status))
    : [];
  const boardTasks = listedTasks;
  const groups =
    smartView === 'today'
      ? [
          {
            key: 'today',
            label: 'Today',
            tasks: listedTasks.filter((task) => task.section !== 'evening'),
          },
          {
            key: 'evening',
            label: 'This Evening',
            tasks: listedTasks.filter((task) => task.section === 'evening'),
          },
        ].filter((group) => group.tasks.length > 0)
      : smartView === 'upcoming'
        ? groupByKey(listedTasks)
        : groupTasks(listedTasks, {
            by: lockedProjectId ? 'status' : 'project',
            projects,
            settings,
          });
  const openCount = listedTasks.filter((task) => !isDoneStatus(settings, task.status)).length;
  const isBoard = layout === 'board' && smartView !== 'logbook' && smartView !== 'upcoming';
  const hasSearch = searchText.trim().length > 0;
  const navigableTaskIds = useMemo(() => listedTasks.map((task) => task.id), [listedTasks]);
  const emptyCopy = emptyStateCopy(smartView ?? 'project');

  const safeFocusedTaskId =
    focusedTaskId && navigableTaskIds.includes(focusedTaskId) ? focusedTaskId : null;

  useEffect(() => {
    if (!safeFocusedTaskId) return;
    document.querySelector(`[data-task-id="${safeFocusedTaskId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [safeFocusedTaskId]);

  const selectedOrFocusedId = selectedTaskId ?? safeFocusedTaskId;
  const activeTask = listedTasks.find((task) => task.id === selectedOrFocusedId) ?? null;

  async function deleteTaskAndUndo(task: Task) {
    await deleteTask(workspaceId, task.id);
    showUndo({ kind: 'delete', task, label: `Deleted “${task.title}”` });
    if (selectedTaskId === task.id) closeTask();
    await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
  }

  useEffect(() => {
    taskActionsRef.current.toggleComplete = toggleComplete;
    taskActionsRef.current.deleteTaskAndUndo = deleteTaskAndUndo;
  });

  useEffect(() => {
    function focusTaskByDelta(delta: 1 | -1) {
      if (isBoard || navigableTaskIds.length === 0) return;
      const currentIndex = safeFocusedTaskId ? navigableTaskIds.indexOf(safeFocusedTaskId) : -1;
      const nextIndex =
        currentIndex < 0
          ? delta > 0
            ? 0
            : navigableTaskIds.length - 1
          : Math.min(navigableTaskIds.length - 1, Math.max(0, currentIndex + delta));
      const nextId = navigableTaskIds[nextIndex] ?? null;
      setFocusedTaskId(nextId);
      if (selectedTaskId && nextId) openTask(nextId);
    }
    return registerAppCommands('tasks', () => [
      {
        id: 'tasks-new',
        appKey: 'tasks',
        label: 'New task',
        keywords: 'create add capture',
        shortcut: 'q',
        run: () => openQuickAdd(smartView === 'today' ? { whenDate: new Date().toISOString().slice(0, 10) } : {}),
      },
      {
        id: 'tasks-search',
        appKey: 'tasks',
        label: 'Focus search',
        keywords: 'search find filter',
        shortcut: '/',
        run: () => {
          searchRef.current?.focus();
          searchRef.current?.select();
        },
      },
      {
        id: 'tasks-next',
        appKey: 'tasks',
        label: 'Next task',
        keywords: 'down navigate',
        shortcut: 'j',
        run: () => focusTaskByDelta(1),
      },
      {
        id: 'tasks-prev',
        appKey: 'tasks',
        label: 'Previous task',
        keywords: 'up navigate',
        shortcut: 'k',
        run: () => focusTaskByDelta(-1),
      },
      {
        id: 'tasks-status',
        appKey: 'tasks',
        label: 'Change status',
        keywords: 'status',
        shortcut: 's',
        run: () => {
          if (activeTask) setPicker('status');
        },
      },
      {
        id: 'tasks-priority',
        appKey: 'tasks',
        label: 'Change priority',
        keywords: 'priority',
        shortcut: 'p',
        run: () => {
          if (activeTask) setPicker('priority');
        },
      },
      {
        id: 'tasks-due',
        appKey: 'tasks',
        label: 'Set due date',
        keywords: 'due date',
        shortcut: 'd',
        run: () => {
          if (activeTask) setPicker('due');
        },
      },
      {
        id: 'tasks-when',
        appKey: 'tasks',
        label: 'Set when',
        keywords: 'when schedule',
        shortcut: 'w',
        run: () => {
          if (activeTask) setPicker('when');
        },
      },
      {
        id: 'tasks-move',
        appKey: 'tasks',
        label: 'Move to project',
        keywords: 'move project',
        shortcut: 'm',
        run: () => {
          if (activeTask) setPicker('move');
        },
      },
      {
        id: 'tasks-assign',
        appKey: 'tasks',
        label: 'Assign',
        keywords: 'assignee assign',
        shortcut: 'a',
        run: () => {
          if (activeTask) setPicker('assignee');
        },
      },
      {
        id: 'tasks-complete',
        appKey: 'tasks',
        label: 'Toggle complete',
        keywords: 'done complete',
        shortcut: 'x',
        run: () => {
          if (activeTask) taskActionsRef.current.toggleComplete(activeTask);
        },
      },
      {
        id: 'tasks-edit',
        appKey: 'tasks',
        label: 'Edit task',
        keywords: 'edit open',
        shortcut: 'e',
        run: () => {
          if (activeTask) openTask(activeTask.id);
        },
      },
      {
        id: 'tasks-delete',
        appKey: 'tasks',
        label: 'Delete task',
        keywords: 'delete remove',
        shortcut: 'Backspace',
        run: () => {
          if (activeTask) void taskActionsRef.current.deleteTaskAndUndo(activeTask);
        },
      },
      ...(['inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook'] as TaskView[]).map((view) => ({
        id: `tasks-view-${view}`,
        appKey: 'tasks',
        label: `Go to ${view}`,
        keywords: view,
        run: () => router.push(`/w/${workspaceId}/tasks?view=${view}`),
      })),
      ...activeProjects.map((project) => ({
        id: `tasks-project-${project.id}`,
        appKey: 'tasks',
        label: `Go to ${project.name}`,
        keywords: `project ${project.name}`,
        run: () => router.push(`/w/${workspaceId}/projects/${project.id}`),
      })),
    ]);
  }, [
    activeProjects,
    activeTask,
    isBoard,
    navigableTaskIds,
    openQuickAdd,
    openTask,
    router,
    safeFocusedTaskId,
    selectedTaskId,
    smartView,
    workspaceId,
  ]);

  useTaskKeyboardShortcuts({
    isBoard,
    navigableTaskIds,
    safeFocusedTaskId,
    selectedTaskId,
    activeTask,
    searchRef,
    setFocusedTaskId,
    setPicker,
    openTask,
    toggleComplete,
    deleteTaskAndUndo,
  });

  async function applyPickerValue(value: string) {
    if (!activeTask || !picker) return;
    if (picker === 'status') {
      statusMutation.mutate({ taskId: activeTask.id, nextStatus: value });
    } else if (picker === 'priority') {
      await updateTask(workspaceId, activeTask.id, { priority: value });
    } else if (picker === 'move') {
      await updateTask(workspaceId, activeTask.id, { projectId: value || null });
    } else if (picker === 'assignee') {
      await updateTask(workspaceId, activeTask.id, { assigneeUserId: value || null });
    } else if (picker === 'when') {
      if (value === 'clear') {
        await updateTask(workspaceId, activeTask.id, { whenDate: null, whenEvening: false, isSomeday: false });
      } else if (value === 'someday') {
        await updateTask(workspaceId, activeTask.id, { isSomeday: true });
      } else if (value === 'evening') {
        await updateTask(workspaceId, activeTask.id, {
          whenDate: new Date().toISOString().slice(0, 10),
          whenEvening: true,
        });
      } else if (value === 'today') {
        await updateTask(workspaceId, activeTask.id, {
          whenDate: new Date().toISOString().slice(0, 10),
          whenEvening: false,
        });
      } else if (value === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await updateTask(workspaceId, activeTask.id, {
          whenDate: tomorrow.toISOString().slice(0, 10),
          whenEvening: false,
        });
      } else {
        const parsed = parseTaskQuickAdd(value, {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (parsed.whenDate) {
          await updateTask(workspaceId, activeTask.id, {
            whenDate: parsed.whenDate,
            whenEvening: parsed.whenEvening,
          });
        }
      }
    } else if (picker === 'due') {
      if (value === 'clear') {
        await updateTask(workspaceId, activeTask.id, { dueAt: null });
      } else if (value === 'today') {
        await updateTask(workspaceId, activeTask.id, { dueAt: dueLocalOnDay(0) });
      } else if (value === 'tomorrow') {
        await updateTask(workspaceId, activeTask.id, { dueAt: dueLocalOnDay(1) });
      } else {
        const parsed = parseTaskQuickAdd(`due ${value}`, {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (parsed.dueAt) {
          await updateTask(workspaceId, activeTask.id, { dueAt: parsed.dueAt });
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          await updateTask(workspaceId, activeTask.id, { dueAt: dueLocalFromDateInput(value) });
        }
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
    setPicker(null);
  }

  function moveTasks(moves: TaskBoardMove[]) {
    const previous = moves
      .map((move) => {
        const task = (tasksQuery.data?.tasks ?? []).find((item) => item.id === move.taskId);
        return task ? { id: task.id, status: task.status, position: task.position } : null;
      })
      .filter((item): item is { id: string; status: string; position: number } => Boolean(item));
    if (previous.length) showUndo({ kind: 'move', previous, label: 'Task moved' });
    moveMutation.mutate(moves);
  }

  async function runUndoLogic(action: UndoAction) {
    if (action.kind === 'delete') {
      await restoreTask(workspaceId, action.task.id);
    } else if (action.kind === 'complete') {
      await updateTask(workspaceId, action.task.id, { status: action.previousStatus });
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

  function showUndo(action: UndoAction) {
    undoRef.current = action;
    toast({
      title: action.label,
      actionLabel: 'Undo',
      onAction: () => {
        const pending = undoRef.current;
        if (!pending) return;
        undoRef.current = null;
        void runUndoLogic(pending);
      },
    });
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!composerTitle.trim()) return;
    createMutation.mutate({
      title: composerTitle.trim(),
      projectId: defaultComposerProjectId,
      whenDate: defaultWhenDate ?? null,
    });
  }

  const showAssignee = workspaceQuery.data?.workspace.kind !== 'personal';

  if (installedQuery.isLoading) {
    return (
      <PageContainer size="full">
        <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
          <Skeleton className="h-8 w-40" />
          <SkeletonText lines={2} />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
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

  const viewTitle =
    smartView === 'inbox'
      ? 'Inbox'
      : smartView === 'today'
        ? 'Today'
        : smartView === 'upcoming'
          ? 'Upcoming'
          : smartView === 'anytime'
            ? 'Anytime'
            : smartView === 'someday'
              ? 'Someday'
              : smartView === 'logbook'
                ? 'Logbook'
                : 'Tasks';

  return (
    <PageContainer size="full" className={cn(isBoard && 'max-w-none')}>
      {header ?? (
        <PageHeader
          title={viewTitle}
          description={
            workspaceQuery.data?.workspace.kind === 'personal'
              ? 'Capture and finish personal work.'
              : 'Shared work across projects.'
          }
          actions={
            <Link
              href={`/w/${workspaceId}/tasks/settings`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Tasks settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          }
        />
      )}

      <div className="min-w-0 space-y-4">
        <TasksComposer
          composerRef={composerRef}
          composerTitle={composerTitle}
          setComposerTitle={setComposerTitle}
          composerProjectId={composerProjectId}
          setComposerProjectId={setComposerProjectId}
          lockedProjectId={lockedProjectId}
          activeProjects={activeProjects}
          isPending={createMutation.isPending}
          error={error}
          onSubmit={onCreate}
        />

        <TasksFiltersBar
          smartView={smartView}
          isBoard={isBoard}
          setLayout={setLayout}
          searchRef={searchRef}
          searchText={searchText}
          setSearchText={setSearchText}
          assignee={assignee}
          replaceParams={replaceParams}
          isLoading={tasksListLoading}
          listedCount={listedTasks.length}
          openCount={openCount}
          showAssigneeFilter={showAssignee}
        />

        <TasksListSection
          tasksQueryIsLoading={tasksListLoading}
          settingsQueryIsLoading={false}
          tasksQueryIsError={tasksQuery.isError}
          tasksQueryError={tasksQuery.error}
          isBoard={isBoard}
          boardTasks={boardTasks}
          listedTasks={listedTasks}
          completedTasks={completedTasks}
          hasSearch={hasSearch}
          emptyCopy={emptyCopy}
          settings={settings}
          projectName={projectName}
          memberLabel={memberLabel}
          showAssignee={showAssignee}
          onMove={moveTasks}
          onOpenTask={openTask}
          onCreate={(status, title) =>
            createMutation.mutate({
              title,
              projectId: defaultComposerProjectId,
              status,
              whenDate: defaultWhenDate ?? null,
            })
          }
          onAddTask={() =>
            openQuickAdd({
              ...(lockedProjectId ? { projectId: lockedProjectId } : {}),
              ...(smartView === 'today' ? { whenDate: new Date().toISOString().slice(0, 10) } : {}),
            })
          }
          groups={groups}
          lockedProjectId={lockedProjectId}
          smartView={smartView}
          safeFocusedTaskId={safeFocusedTaskId}
          pendingCompleteIds={pendingCompleteIds}
          onFocusTask={setFocusedTaskId}
          onToggleDone={toggleComplete}
          completedOpen={completedOpen}
          setCompletedOpen={setCompletedOpen}
        />
      </div>

      <Sheet open={Boolean(selectedTaskId)} onClose={closeTask} modal={false}>
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
            showAssignee={showAssignee}
            onDeleted={(task) => {
              closeTask();
              showUndo({ kind: 'delete', task, label: `Deleted “${task.title}”` });
            }}
          />
        ) : null}
      </Sheet>
      <TasksActionPickers
        picker={picker}
        setPicker={setPicker}
        settings={settings}
        activeProjects={activeProjects}
        members={membersQuery.data?.members ?? []}
        onSelect={(value) => void applyPickerValue(value)}
      />
    </PageContainer>
  );
}

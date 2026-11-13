'use client';

import type { TaskSettings, TaskView } from '@life-room/shared';
import { ApiError } from '../../lib/api';
import { EmptyState } from '../../components/ui/empty-state';
import { SkeletonRow } from '../../components/ui/skeleton';
import { TasksBoard, type TaskBoardMove } from './tasks-board';
import { TaskRows } from './task-rows';
import type { Task } from './tasks-api';

type TaskGroup = { key: string; label: string; tasks: Task[] };

export function TasksListSection({
  tasksQueryIsLoading,
  settingsQueryIsLoading,
  tasksQueryIsError,
  tasksQueryError,
  isBoard,
  boardTasks,
  listedTasks,
  completedTasks,
  hasSearch,
  emptyCopy,
  settings,
  projectName,
  memberLabel,
  showAssignee = true,
  onMove,
  onOpenTask,
  onCreate,
  onAddTask,
  groups,
  lockedProjectId,
  smartView,
  safeFocusedTaskId,
  pendingCompleteIds,
  onFocusTask,
  onToggleDone,
  completedOpen,
  setCompletedOpen,
}: {
  tasksQueryIsLoading: boolean;
  settingsQueryIsLoading: boolean;
  tasksQueryIsError: boolean;
  tasksQueryError: unknown;
  isBoard: boolean;
  boardTasks: Task[];
  listedTasks: Task[];
  completedTasks: Task[];
  hasSearch: boolean;
  emptyCopy: { title: string; body: string };
  settings: TaskSettings;
  projectName: (id: string | null) => string;
  memberLabel: (userId: string | null) => string;
  showAssignee?: boolean;
  onMove: (moves: TaskBoardMove[]) => void;
  onOpenTask: (taskId: string) => void;
  onCreate: (status: string, title: string) => void;
  onAddTask?: () => void;
  groups: TaskGroup[];
  lockedProjectId?: string;
  smartView: TaskView | null;
  safeFocusedTaskId: string | null;
  pendingCompleteIds: Set<string>;
  onFocusTask: (taskId: string) => void;
  onToggleDone: (task: Task) => void;
  completedOpen: boolean;
  setCompletedOpen: (updater: (open: boolean) => boolean) => void;
}) {
  if (tasksQueryIsLoading || settingsQueryIsLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow className="hidden sm:flex" />
      </div>
    );
  }
  if (tasksQueryIsError) {
    return (
      <p className="text-sm text-destructive">
        {tasksQueryError instanceof ApiError ? tasksQueryError.message : 'Failed to load tasks'}
      </p>
    );
  }
  if ((isBoard ? boardTasks : listedTasks).length === 0 && completedTasks.length === 0) {
    return (
      <EmptyState
        title={hasSearch ? 'No matches' : emptyCopy.title}
        description={hasSearch ? 'Try another title.' : emptyCopy.body}
        primaryAction={
          !hasSearch && onAddTask
            ? { label: 'Add task', onClick: onAddTask }
            : undefined
        }
      />
    );
  }
  if (isBoard) {
    return (
      <TasksBoard
        tasks={boardTasks}
        settings={settings}
        projectName={projectName}
        memberLabel={memberLabel}
        showAssignee={showAssignee}
        onMove={onMove}
        onOpenTask={onOpenTask}
        onCreate={onCreate}
      />
    );
  }
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
          <TaskRows
            tasks={group.tasks}
            settings={settings}
            showProject={!lockedProjectId && (group.key.startsWith('status:') || Boolean(smartView))}
            showAssignee={showAssignee}
            focusedTaskId={safeFocusedTaskId}
            pendingCompleteIds={pendingCompleteIds}
            projectName={projectName}
            memberLabel={memberLabel}
            onOpen={onOpenTask}
            onFocusTask={onFocusTask}
            onToggleDone={onToggleDone}
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
              showAssignee={showAssignee}
              focusedTaskId={safeFocusedTaskId}
              pendingCompleteIds={pendingCompleteIds}
              projectName={projectName}
              memberLabel={memberLabel}
              onOpen={onOpenTask}
              onFocusTask={onFocusTask}
              onToggleDone={onToggleDone}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

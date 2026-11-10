'use client';

import type { TaskSettings, TaskView } from '@erp-tiza/shared';
import { ApiError } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
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
  onMove,
  onOpenTask,
  onCreate,
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
  onMove: (moves: TaskBoardMove[]) => void;
  onOpenTask: (taskId: string) => void;
  onCreate: (status: string, title: string) => void;
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
    return <p className="text-sm text-muted-foreground">Loading tasks…</p>;
  }
  if (tasksQueryIsError) {
    return (
      <p className="text-sm text-red-600">
        {tasksQueryError instanceof ApiError ? tasksQueryError.message : 'Failed to load tasks'}
      </p>
    );
  }
  if ((isBoard ? boardTasks : listedTasks).length === 0 && completedTasks.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 py-10 text-center">
          <p className="text-base font-semibold text-foreground">
            {hasSearch ? 'No matches' : emptyCopy.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasSearch ? 'Try another title.' : emptyCopy.body}
          </p>
        </CardContent>
      </Card>
    );
  }
  if (isBoard) {
    return (
      <TasksBoard
        tasks={boardTasks}
        settings={settings}
        projectName={projectName}
        memberLabel={memberLabel}
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

'use client';

import type { TaskSettings } from '@erp-tiza/shared';
import type { Task } from './tasks-api';
import { TaskDateChips } from './task-date-chips';
import { isDoneStatus, isOverdue, priorityColor, statusLabel } from './task-status';
import { cn } from '../../lib/utils';

export function ScopeButton({
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

export function TaskRows({
  tasks,
  settings,
  showProject,
  focusedTaskId,
  pendingCompleteIds,
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
  pendingCompleteIds: Set<string>;
  projectName: (id: string | null) => string;
  memberLabel: (userId: string | null) => string;
  onOpen: (taskId: string) => void;
  onFocusTask: (taskId: string) => void;
  onToggleDone: (task: Task) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {tasks.map((task, index) => {
        const overdue = isOverdue(task.dueAt, task.status, settings);
        const pending = pendingCompleteIds.has(task.id);
        const done = isDoneStatus(settings, task.status) || pending;
        const accent = priorityColor(settings, task.priority);
        const showAccent = task.priority !== 'none';
        const focused = focusedTaskId === task.id;
        return (
          <div
            key={task.id}
            data-task-id={task.id}
            className={cn(
              'group relative flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted sm:px-4 motion-safe:transition-all motion-safe:duration-300',
              index > 0 && 'border-t border-border',
              overdue && 'bg-red-50/30 hover:bg-red-50/50',
              focused && 'bg-accent',
              done && 'opacity-70',
              pending && 'motion-safe:translate-x-1 motion-safe:opacity-40',
            )}
          >
            {showAccent ? (
              <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} aria-hidden />
            ) : null}
            <button
              type="button"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] motion-safe:transition-colors',
                done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-border text-transparent hover:border-foreground/40',
                pending && 'motion-safe:scale-110',
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
            <TaskDateChips
              className="shrink-0"
              whenDate={task.whenDate}
              whenEvening={task.whenEvening}
              isSomeday={task.isSomeday}
              dueAt={task.dueAt}
              overdue={overdue}
            />
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { Fragment } from 'react';
import { Flag } from 'lucide-react';
import { describeTaskRecurrence, type TaskSettings } from '@life-room/shared';
import type { Task } from './tasks-api';
import { TaskDateChips } from './task-date-chips';
import { isDoneStatus, isOverdue, priorityColor, priorityLabel, statusLabel } from './task-status';
import { RowList } from '../../components/ui/row-list';
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

function isDefaultTodoStatus(settings: TaskSettings, statusKey: string) {
  if (statusKey === 'todo') return true;
  const label = statusLabel(settings, statusKey).trim().toLowerCase();
  return label === 'to do' || label === 'todo';
}

export function TaskRows({
  tasks,
  settings,
  showProject,
  showAssignee = true,
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
  showAssignee?: boolean;
  focusedTaskId: string | null;
  pendingCompleteIds: Set<string>;
  projectName: (id: string | null) => string;
  memberLabel: (userId: string | null) => string;
  onOpen: (taskId: string) => void;
  onFocusTask: (taskId: string) => void;
  onToggleDone: (task: Task) => void;
}) {
  return (
    <RowList as="div">
      {tasks.map((task, index) => {
        const overdue = isOverdue(task.dueAt, task.status, settings);
        const pending = pendingCompleteIds.has(task.id);
        const done = isDoneStatus(settings, task.status) || pending;
        const accent = priorityColor(settings, task.priority);
        const showPriority = task.priority !== 'none';
        const priorityName = priorityLabel(settings, task.priority);
        const focused = focusedTaskId === task.id;
        const showStatus = !isDefaultTodoStatus(settings, task.status);
        const metaItems: { key: string; node: React.ReactNode }[] = [];
        if (showStatus) metaItems.push({ key: 'status', node: statusLabel(settings, task.status) });
        if (showProject && task.projectId) {
          metaItems.push({
            key: 'project',
            node: <span className="truncate">{projectName(task.projectId)}</span>,
          });
        }
        if (showAssignee && task.assigneeUserId) {
          metaItems.push({ key: 'assignee', node: memberLabel(task.assigneeUserId) });
        }
        if (task.recurrenceRrule) {
          const repeatLabel = describeTaskRecurrence(task.recurrenceRrule);
          if (repeatLabel) metaItems.push({ key: 'repeat', node: repeatLabel });
        }
        if (showPriority) {
          metaItems.push({
            key: 'priority',
            node: (
              <span className="inline-flex items-center gap-1" style={{ color: accent }}>
                <Flag className="h-3 w-3" aria-hidden />
                {priorityName}
              </span>
            ),
          });
        }
        return (
          <div
            key={task.id}
            data-task-id={task.id}
            className={cn(
              'group relative flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/60 sm:px-4 motion-safe:transition-all motion-safe:duration-300',
              index > 0 && 'border-t border-border',
              overdue && 'bg-danger-soft/40 hover:bg-danger-soft/60',
              focused && 'bg-accent',
              done && 'opacity-70',
              pending && 'motion-safe:translate-x-1 motion-safe:opacity-40',
            )}
          >
            {showPriority ? (
              <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} aria-hidden />
            ) : null}
            <button
              type="button"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] motion-safe:transition-colors',
                done
                  ? 'border-success bg-success text-success-foreground'
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
              {metaItems.length > 0 ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  {metaItems.map((item, itemIndex) => (
                    <Fragment key={item.key}>
                      {itemIndex > 0 ? <span className="text-border">·</span> : null}
                      {item.node}
                    </Fragment>
                  ))}
                </div>
              ) : null}
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
    </RowList>
  );
}

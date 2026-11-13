'use client';

import Link from 'next/link';
import { describeTaskRecurrence } from '@life-room/shared';
import { Moon, MoreHorizontal } from 'lucide-react';
import { Menu } from '../../components/ui/menu';
import { Button } from '../../components/ui/button';
import { SkeletonRow } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { cn } from '../../lib/utils';
import type { Task } from '../tasks/tasks-api';
import { isOverdue, taskDateChips } from '../tasks/task-status';
import { decisionDisabled, isCarriedOver, type TodayDecision } from './today-decisions';
import { useTodayDecisions } from './use-today-decisions';

type TodayTaskListProps = {
  workspaceId: string;
  tasks: Task[];
  todayKey: string;
  timeZone: string;
  loading: boolean;
};

export function TodayTaskList({ workspaceId, tasks, todayKey, timeZone, loading }: TodayTaskListProps) {
  const decisions = useTodayDecisions({ workspaceId, todayKey, timeZone });
  const carriedOver = tasks.filter((task) => isCarriedOver(task.whenDate, todayKey));
  const dayTasks = tasks.filter((task) => !task.whenEvening);
  const eveningTasks = tasks.filter((task) => task.whenEvening);

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nothing left for today"
        description="Capture something with the composer above, or press q."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Mark what you finished, or move what does not belong on today. A deadline keeps a task here.
        </p>
        {carriedOver.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 sm:h-9"
            onClick={() => {
              void decisions.decideMany(carriedOver, 'tomorrow');
            }}
          >
            Move carried over to tomorrow
          </Button>
        ) : null}
      </div>
      {dayTasks.length > 0 ? (
        <TaskRowList
          workspaceId={workspaceId}
          tasks={dayTasks}
          todayKey={todayKey}
          decisions={decisions}
        />
      ) : null}
      {eveningTasks.length > 0 ? (
        <div className="space-y-2 pt-2">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Moon className="h-3.5 w-3.5" aria-hidden />
            This evening
          </h3>
          <TaskRowList
            workspaceId={workspaceId}
            tasks={eveningTasks}
            todayKey={todayKey}
            decisions={decisions}
            hideEveningLabel
          />
        </div>
      ) : null}
    </div>
  );
}

type Decisions = ReturnType<typeof useTodayDecisions>;

export function TaskRowList({
  workspaceId,
  tasks,
  todayKey,
  decisions,
  inlineActions = false,
  hideEveningLabel = false,
}: {
  workspaceId: string;
  tasks: Task[];
  todayKey: string;
  decisions: Decisions;
  /** Show the scheduling decisions as buttons on the row instead of a menu (daily review). */
  inlineActions?: boolean;
  /** The list already sits under a "This evening" heading. */
  hideEveningLabel?: boolean;
}) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-card">
      {tasks.map((task, index) => (
        <TodayTaskRow
          key={task.id}
          workspaceId={workspaceId}
          task={task}
          todayKey={todayKey}
          busy={decisions.isBusy(task.id)}
          doneDisabled={decisions.doneDisabled}
          showDivider={index > 0}
          inlineActions={inlineActions}
          hideEveningLabel={hideEveningLabel}
          onDecide={(decision) => {
            void decisions.decide(task, decision);
          }}
        />
      ))}
    </ul>
  );
}

function dueMetaLabel(label: string) {
  const lower = label.toLowerCase();
  if (lower === 'today' || lower === 'tomorrow' || lower === 'yesterday') return `Due ${lower}`;
  return `Due ${label}`;
}

const SCHEDULE_DECISIONS: Array<{ id: Exclude<TodayDecision, 'done'>; label: string; inline: boolean }> = [
  { id: 'tomorrow', label: 'Tomorrow', inline: true },
  { id: 'evening', label: 'This evening', inline: false },
  { id: 'not_today', label: 'Not today', inline: true },
  { id: 'someday', label: 'Someday', inline: true },
];

function TodayTaskRow({
  workspaceId,
  task,
  todayKey,
  busy,
  doneDisabled,
  showDivider,
  inlineActions,
  hideEveningLabel,
  onDecide,
}: {
  workspaceId: string;
  task: Task;
  todayKey: string;
  busy: boolean;
  doneDisabled: boolean;
  showDivider: boolean;
  inlineActions: boolean;
  hideEveningLabel: boolean;
  onDecide: (decision: TodayDecision) => void;
}) {
  const carriedOver = isCarriedOver(task.whenDate, todayKey);
  const overdue = isOverdue(task.dueAt, task.status);
  const dateLabels = taskDateChips({
    whenDate: task.whenDate,
    whenEvening: task.whenEvening,
    isSomeday: task.isSomeday,
    dueAt: task.dueAt,
  })
    .filter(
      (chip) =>
        !(chip.kind === 'when' && (chip.label === 'Today' || (hideEveningLabel && chip.label === 'This evening'))),
    )
    .map((chip) => (chip.kind === 'due' ? dueMetaLabel(chip.label) : chip.label));
  const repeatLabel = task.recurrenceRrule ? describeTaskRecurrence(task.recurrenceRrule) : null;
  const meta = [carriedOver ? 'Carried over' : null, repeatLabel, ...dateLabels].filter(Boolean);
  const inline = SCHEDULE_DECISIONS.filter((item) => inlineActions && item.inline);
  const menuItems = SCHEDULE_DECISIONS.filter((item) => !inlineActions || !item.inline);

  return (
    <li className={cn(showDivider && 'border-t border-border', overdue && 'bg-danger-soft/40')}>
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-2 py-2 sm:flex-nowrap sm:gap-3 sm:px-3">
        <button
          type="button"
          className="group flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label={`Mark ${task.title} done`}
          disabled={busy || doneDisabled}
          onClick={() => onDecide('done')}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-transparent group-hover:border-primary group-hover:text-primary">
            ✓
          </span>
        </button>
        <Link
          href={`/w/${workspaceId}/tasks?view=today&task=${task.id}`}
          className="min-w-0 flex-1 py-1"
        >
          <span className="block truncate text-sm text-foreground">{task.title}</span>
          {meta.length > 0 ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta.join(' · ')}</span>
          ) : null}
        </Link>
        {inline.length > 0 ? (
          <div className="flex w-full shrink-0 justify-end gap-1 pl-11 sm:w-auto sm:pl-0">
            {inline.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                disabled={busy || decisionDisabled(item.id, task, todayKey)}
                aria-label={`${item.label}: ${task.title}`}
                onClick={() => onDecide(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        ) : null}
        <Menu
          align="end"
          aria-label={`Decisions for ${task.title}`}
          triggerClassName="h-11 w-11 text-muted-foreground hover:bg-accent hover:text-foreground"
          trigger={
            <>
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              <span className="sr-only">Decide</span>
            </>
          }
          items={menuItems.map((item) => ({
            id: item.id,
            label: item.label,
            disabled: busy || decisionDisabled(item.id, task, todayKey),
            onSelect: () => onDecide(item.id),
          }))}
        />
      </div>
    </li>
  );
}

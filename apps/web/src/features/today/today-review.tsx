'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { describeTaskRecurrence, getDayBoundsInTimeZone, type UpdateTaskInput } from '@erp-tiza/shared';
import { MoreHorizontal } from 'lucide-react';
import { Menu } from '../../components/ui/menu';
import { Button } from '../../components/ui/button';
import { SkeletonRow } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import { EmptyState } from '../../components/ui/empty-state';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';
import { getTaskSettings, updateTask, type Task } from '../tasks/tasks-api';
import { isOverdue, taskDateChips } from '../tasks/task-status';
import {
  carriedOverMoveFeedback,
  decisionDisabled,
  decisionFeedback,
  decisionLeavesToday,
  decisionPatch,
  enabledDoneStatusKey,
  isCarriedOver,
  type TodayDecision,
} from './today-decisions';

type TodayTaskListProps = {
  workspaceId: string;
  tasks: Task[];
  todayKey: string;
  timeZone: string;
  loading: boolean;
};

export function TodayTaskList({ workspaceId, tasks, todayKey, timeZone, loading }: TodayTaskListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const busyTaskIds = useRef(new Set<string>());
  const [busySnapshot, setBusySnapshot] = useState<ReadonlySet<string>>(new Set());
  const settingsQuery = useQuery({
    queryKey: ['task-settings', workspaceId],
    queryFn: () => getTaskSettings(workspaceId),
  });
  const settings = settingsQuery.data?.settings;
  const doneStatusKey = enabledDoneStatusKey(settings);
  const startOfTomorrow = getDayBoundsInTimeZone(new Date(), timeZone).startOfTomorrow;
  const carriedOver = tasks.filter((task) => isCarriedOver(task.whenDate, todayKey));

  function setBusy(taskId: string, busy: boolean) {
    if (busy) busyTaskIds.current.add(taskId);
    else busyTaskIds.current.delete(taskId);
    setBusySnapshot(new Set(busyTaskIds.current));
  }

  async function refreshTasks() {
    await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });
  }

  async function undoTask(taskId: string, previous: UpdateTaskInput) {
    try {
      await updateTask(workspaceId, taskId, previous);
      await refreshTasks();
    } catch (error) {
      toast({ title: error instanceof ApiError ? error.message : 'Could not undo' });
    }
  }

  async function applyPatch(task: Task, patch: UpdateTaskInput, feedback: { title: string; description?: string }) {
    if (busyTaskIds.current.has(task.id)) return;
    setBusy(task.id, true);
    const previous: UpdateTaskInput = {
      status: task.status,
      whenDate: task.whenDate,
      whenEvening: task.whenEvening,
      isSomeday: task.isSomeday,
    };
    try {
      await updateTask(workspaceId, task.id, patch);
      await refreshTasks();
      toast({
        title: feedback.title,
        description: feedback.description,
        actionLabel: 'Undo',
        onAction: () => {
          void undoTask(task.id, previous);
        },
      });
    } catch (error) {
      toast({ title: error instanceof ApiError ? error.message : 'Could not update the task' });
    } finally {
      setBusy(task.id, false);
    }
  }

  async function applyDecision(task: Task, decision: TodayDecision) {
    if (decision === 'done') {
      if (!doneStatusKey) return;
      const feedback = decisionFeedback('done', false);
      await applyPatch(task, { status: doneStatusKey }, feedback);
      return;
    }
    const staysBecauseDue = !decisionLeavesToday(decision, task, startOfTomorrow);
    await applyPatch(task, decisionPatch(decision, todayKey), decisionFeedback(decision, staysBecauseDue));
  }

  async function moveCarriedOverToTomorrow() {
    const pending = carriedOver.filter((task) => !busyTaskIds.current.has(task.id));
    if (pending.length === 0) return;
    for (const task of pending) setBusy(task.id, true);
    const previousById = pending.map((task) => ({
      id: task.id,
      previous: {
        status: task.status,
        whenDate: task.whenDate,
        whenEvening: task.whenEvening,
        isSomeday: task.isSomeday,
      } satisfies UpdateTaskInput,
    }));
    let stayedBecauseDueCount = 0;
    try {
      for (const task of pending) {
        if (!decisionLeavesToday('tomorrow', task, startOfTomorrow)) stayedBecauseDueCount += 1;
        await updateTask(workspaceId, task.id, decisionPatch('tomorrow', todayKey));
      }
      await refreshTasks();
      const feedback = carriedOverMoveFeedback(pending.length, stayedBecauseDueCount);
      toast({
        title: feedback.title,
        description: feedback.description,
        actionLabel: 'Undo',
        onAction: () => {
          void (async () => {
            try {
              for (const item of previousById) await updateTask(workspaceId, item.id, item.previous);
              await refreshTasks();
            } catch (error) {
              toast({ title: error instanceof ApiError ? error.message : 'Could not undo' });
            }
          })();
        },
      });
    } catch (error) {
      toast({ title: error instanceof ApiError ? error.message : 'Could not move carried-over tasks' });
      await refreshTasks();
    } finally {
      for (const task of pending) setBusy(task.id, false);
    }
  }

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
        title="Nothing for today"
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
              void moveCarriedOverToTomorrow();
            }}
          >
            Move carried over to tomorrow
          </Button>
        ) : null}
      </div>
      <ul className="overflow-hidden rounded-xl border border-border bg-card">
        {tasks.map((task, index) => (
          <TodayTaskRow
            key={task.id}
            workspaceId={workspaceId}
            task={task}
            todayKey={todayKey}
            busy={busySnapshot.has(task.id)}
            doneDisabled={!doneStatusKey || settingsQuery.isLoading}
            showDivider={index > 0}
            onDecide={(decision) => {
              void applyDecision(task, decision);
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function dueMetaLabel(label: string) {
  const lower = label.toLowerCase();
  if (lower === 'today' || lower === 'tomorrow' || lower === 'yesterday') return `Due ${lower}`;
  return `Due ${label}`;
}

function TodayTaskRow({
  workspaceId,
  task,
  todayKey,
  busy,
  doneDisabled,
  showDivider,
  onDecide,
}: {
  workspaceId: string;
  task: Task;
  todayKey: string;
  busy: boolean;
  doneDisabled: boolean;
  showDivider: boolean;
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
    .filter((chip) => !(chip.kind === 'when' && chip.label === 'Today'))
    .map((chip) => (chip.kind === 'due' ? dueMetaLabel(chip.label) : chip.label));
  const repeatLabel = task.recurrenceRrule ? describeTaskRecurrence(task.recurrenceRrule) : null;
  const meta = [carriedOver ? 'Carried over' : null, repeatLabel, ...dateLabels].filter(Boolean);

  return (
    <li className={cn(showDivider && 'border-t border-border', overdue && 'bg-danger-soft/40')}>
      <div className="flex min-h-11 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3">
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label={`Mark ${task.title} done`}
          disabled={busy || doneDisabled}
          onClick={() => onDecide('done')}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-transparent hover:border-foreground/40">
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
          items={[
            {
              id: 'tomorrow',
              label: 'Tomorrow',
              disabled: busy || decisionDisabled('tomorrow', task, todayKey),
              onSelect: () => onDecide('tomorrow'),
            },
            {
              id: 'evening',
              label: 'This evening',
              disabled: busy || decisionDisabled('evening', task, todayKey),
              onSelect: () => onDecide('evening'),
            },
            {
              id: 'not_today',
              label: 'Not today',
              disabled: busy || decisionDisabled('not_today', task, todayKey),
              onSelect: () => onDecide('not_today'),
            },
            {
              id: 'someday',
              label: 'Someday',
              disabled: busy || decisionDisabled('someday', task, todayKey),
              onSelect: () => onDecide('someday'),
            },
          ]}
        />
      </div>
    </li>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDayBoundsInTimeZone, type UpdateTaskInput } from '@life-room/shared';
import { useToast } from '../../components/ui/toast';
import { ApiError } from '../../lib/api';
import { getTaskSettings, updateTask, type Task } from '../tasks/tasks-api';
import {
  bulkDecisionFeedback,
  decisionFeedback,
  decisionLeavesToday,
  decisionPatch,
  enabledDoneStatusKey,
  type TodayDecision,
} from './today-decisions';

function snapshot(task: Task): UpdateTaskInput {
  return {
    status: task.status,
    whenDate: task.whenDate,
    whenEvening: task.whenEvening,
    isSomeday: task.isSomeday,
  };
}

/**
 * Today decisions (done, tomorrow, evening, not today, someday) with undo toasts.
 * Shared by the workspace home and the daily review so both behave the same.
 */
export function useTodayDecisions({
  workspaceId,
  todayKey,
  timeZone,
}: {
  workspaceId: string;
  todayKey: string;
  timeZone: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const busyTaskIds = useRef(new Set<string>());
  const [busySnapshot, setBusySnapshot] = useState<ReadonlySet<string>>(new Set());
  const settingsQuery = useQuery({
    queryKey: ['task-settings', workspaceId],
    queryFn: () => getTaskSettings(workspaceId),
  });
  const doneStatusKey = enabledDoneStatusKey(settingsQuery.data?.settings);
  const startOfTomorrow = getDayBoundsInTimeZone(new Date(), timeZone).startOfTomorrow;

  function setBusy(taskIds: string[], busy: boolean) {
    for (const id of taskIds) {
      if (busy) busyTaskIds.current.add(id);
      else busyTaskIds.current.delete(id);
    }
    setBusySnapshot(new Set(busyTaskIds.current));
  }

  async function refreshTasks() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] }),
    ]);
  }

  function patchFor(decision: TodayDecision): UpdateTaskInput | null {
    if (decision === 'done') return doneStatusKey ? { status: doneStatusKey } : null;
    return decisionPatch(decision, todayKey);
  }

  async function restore(previous: Array<{ id: string; previous: UpdateTaskInput }>) {
    try {
      for (const item of previous) await updateTask(workspaceId, item.id, item.previous);
      await refreshTasks();
    } catch (error) {
      toast({ title: error instanceof ApiError ? error.message : 'Could not undo' });
    }
  }

  async function decide(task: Task, decision: TodayDecision) {
    if (busyTaskIds.current.has(task.id)) return;
    const patch = patchFor(decision);
    if (!patch) return;
    setBusy([task.id], true);
    const previous = [{ id: task.id, previous: snapshot(task) }];
    const staysBecauseDue = !decisionLeavesToday(decision, task, startOfTomorrow);
    try {
      await updateTask(workspaceId, task.id, patch);
      await refreshTasks();
      const feedback = decisionFeedback(decision, staysBecauseDue);
      toast({
        title: feedback.title,
        description: feedback.description,
        actionLabel: 'Undo',
        onAction: () => {
          void restore(previous);
        },
      });
    } catch (error) {
      toast({ title: error instanceof ApiError ? error.message : 'Could not update the task' });
    } finally {
      setBusy([task.id], false);
    }
  }

  /** Applies one scheduling decision to many tasks with a single undo. */
  async function decideMany(tasks: Task[], decision: Exclude<TodayDecision, 'done' | 'evening'>) {
    const pending = tasks.filter((task) => !busyTaskIds.current.has(task.id));
    if (pending.length === 0) return;
    const patch = decisionPatch(decision, todayKey);
    const ids = pending.map((task) => task.id);
    setBusy(ids, true);
    const previous = pending.map((task) => ({ id: task.id, previous: snapshot(task) }));
    let stayedBecauseDueCount = 0;
    try {
      for (const task of pending) {
        if (!decisionLeavesToday(decision, task, startOfTomorrow)) stayedBecauseDueCount += 1;
        await updateTask(workspaceId, task.id, patch);
      }
      await refreshTasks();
      const feedback = bulkDecisionFeedback(decision, pending.length, stayedBecauseDueCount);
      toast({
        title: feedback.title,
        description: feedback.description,
        actionLabel: 'Undo',
        onAction: () => {
          void restore(previous);
        },
      });
    } catch (error) {
      toast({ title: error instanceof ApiError ? error.message : 'Could not move the tasks' });
      await refreshTasks();
    } finally {
      setBusy(ids, false);
    }
  }

  return {
    decide,
    decideMany,
    isBusy: (taskId: string) => busySnapshot.has(taskId),
    doneDisabled: !doneStatusKey || settingsQuery.isLoading,
  };
}

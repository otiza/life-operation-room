import type { TaskSettings, UpdateTaskInput } from '@life-room/shared';

export type TodayDecision = 'done' | 'tomorrow' | 'evening' | 'not_today' | 'someday';

export type TodayDecisionTask = {
  whenDate: string | null;
  whenEvening: boolean;
  isSomeday: boolean;
  dueAt: string | null;
};

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function addCalendarDays(dateKey: string, dayCount: number) {
  const match = DATE_KEY.exec(dateKey);
  if (!match) throw new Error('Expected a YYYY-MM-DD date');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayCount));
  const nextYear = shifted.getUTCFullYear();
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(shifted.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function isCarriedOver(whenDate: string | null, todayKey: string) {
  return Boolean(whenDate && whenDate < todayKey);
}

export function dueKeepsTaskOnToday(dueAt: string | null, startOfTomorrow: Date) {
  if (!dueAt) return false;
  const dueTime = new Date(dueAt).getTime();
  if (Number.isNaN(dueTime)) return false;
  return dueTime < startOfTomorrow.getTime();
}

export function enabledDoneStatusKey(settings: TaskSettings | null | undefined) {
  return (
    settings?.statuses.find((status) => status.enabled && status.isDone && status.key !== 'cancelled')?.key ??
    null
  );
}

/** Scheduling decisions. Done is a status change and is applied separately. */
export function decisionPatch(decision: Exclude<TodayDecision, 'done'>, todayKey: string): UpdateTaskInput {
  if (decision === 'tomorrow') {
    return { whenDate: addCalendarDays(todayKey, 1), whenEvening: false, isSomeday: false };
  }
  if (decision === 'evening') {
    return { whenDate: todayKey, whenEvening: true, isSomeday: false };
  }
  if (decision === 'someday') return { isSomeday: true };
  return { whenDate: null, whenEvening: false, isSomeday: false };
}

export function decisionDisabled(decision: Exclude<TodayDecision, 'done'>, task: TodayDecisionTask, todayKey: string) {
  if (decision === 'evening') return task.whenDate === todayKey && task.whenEvening;
  if (decision === 'not_today') return task.whenDate == null && !task.isSomeday;
  if (decision === 'someday') return task.isSomeday;
  return false;
}

export function decisionLeavesToday(decision: TodayDecision, task: Pick<TodayDecisionTask, 'dueAt'>, startOfTomorrow: Date) {
  if (decision === 'done') return true;
  if (decision === 'evening') return false;
  return !dueKeepsTaskOnToday(task.dueAt, startOfTomorrow);
}

export function decisionFeedback(decision: TodayDecision, staysBecauseDue: boolean) {
  if (decision === 'done') return { title: 'Marked done' };
  if (decision === 'evening') return { title: 'Moved to this evening' };
  if (decision === 'someday') {
    return staysBecauseDue
      ? { title: 'Parked in Someday', description: 'It stays on today because it is due.' }
      : { title: 'Parked in Someday' };
  }
  if (decision === 'tomorrow') {
    return staysBecauseDue
      ? { title: 'Planned for tomorrow', description: 'It stays on today because it is due.' }
      : { title: 'Planned for tomorrow' };
  }
  return staysBecauseDue
    ? { title: 'Taken off the plan', description: 'It stays on today because it is due.' }
    : { title: 'Taken off today' };
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

/** Toast copy when one scheduling decision is applied to several tasks at once. */
export function bulkDecisionFeedback(
  decision: Exclude<TodayDecision, 'done' | 'evening'>,
  movedCount: number,
  stayedBecauseDueCount: number,
) {
  const tasks = plural(movedCount, 'task', 'tasks');
  const title =
    decision === 'tomorrow'
      ? `Moved ${tasks} to tomorrow`
      : decision === 'someday'
        ? `Parked ${tasks} in Someday`
        : `Took ${tasks} off today`;
  if (stayedBecauseDueCount === 0) return { title };
  const description =
    stayedBecauseDueCount === 1
      ? '1 stays on today because it is due.'
      : `${stayedBecauseDueCount} stay on today because they are due.`;
  return { title, description };
}

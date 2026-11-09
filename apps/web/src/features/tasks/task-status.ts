import {
  DEFAULT_TASK_SETTINGS,
  getDayBoundsInTimeZone,
  type TaskPriorityOption,
  type TaskSettings,
  type TaskStatusOption,
} from '@erp-tiza/shared';

function clientTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatDueAt(dueAt: string | null) {
  if (!dueAt) return null;
  return new Date(dueAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDueAtShort(dueAt: string | null) {
  if (!dueAt) return null;
  const timeZone = clientTimeZone();
  const due = new Date(dueAt);
  const { startOfToday, startOfTomorrow } = getDayBoundsInTimeZone(new Date(), timeZone);
  if (due >= startOfToday && due < startOfTomorrow) return 'Today';
  if (due >= startOfTomorrow) {
    const dayAfter = getDayBoundsInTimeZone(startOfTomorrow, timeZone).startOfTomorrow;
    if (due < dayAfter) return 'Tomorrow';
  }
  const { startOfToday: startOfYesterday } = getDayBoundsInTimeZone(
    new Date(startOfToday.getTime() - 12 * 60 * 60 * 1000),
    timeZone,
  );
  if (due >= startOfYesterday && due < startOfToday) return 'Yesterday';
  return due.toLocaleDateString(undefined, { timeZone, month: 'short', day: 'numeric' });
}

export function isDueToday(dueAt: string | null) {
  if (!dueAt) return false;
  const timeZone = clientTimeZone();
  const { startOfToday, startOfTomorrow } = getDayBoundsInTimeZone(new Date(), timeZone);
  const due = new Date(dueAt);
  return due >= startOfToday && due < startOfTomorrow;
}

export function assigneeInitials(label: string) {
  if (label === 'Unassigned') return '?';
  if (label === 'Me') return 'Me';
  const local = label.split('@')[0] ?? label;
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

export function enabledStatuses(settings: TaskSettings) {
  return sortByOrder(settings.statuses.filter((item) => item.enabled));
}

export function enabledPriorities(settings: TaskSettings) {
  return sortByOrder(settings.priorities.filter((item) => item.enabled));
}

export function findStatus(settings: TaskSettings, key: string): TaskStatusOption | undefined {
  return settings.statuses.find((item) => item.key === key);
}

export function findPriority(settings: TaskSettings, key: string): TaskPriorityOption | undefined {
  return settings.priorities.find((item) => item.key === key);
}

export function isDoneStatus(settings: TaskSettings, statusKey: string) {
  return Boolean(findStatus(settings, statusKey)?.isDone);
}

export function isOverdue(dueAt: string | null, statusKey: string, settings?: TaskSettings) {
  if (!dueAt) return false;
  if (settings ? isDoneStatus(settings, statusKey) : statusKey === 'done' || statusKey === 'cancelled') {
    return false;
  }
  const { startOfToday } = getDayBoundsInTimeZone(new Date(), clientTimeZone());
  return new Date(dueAt) < startOfToday;
}

export function priorityColor(settings: TaskSettings, key: string) {
  return findPriority(settings, key)?.color ?? '#e4e4e7';
}

export function statusColor(settings: TaskSettings, key: string) {
  return findStatus(settings, key)?.color ?? '#a1a1aa';
}

export function statusLabel(settings: TaskSettings, key: string) {
  return findStatus(settings, key)?.label ?? key;
}

export function priorityLabel(settings: TaskSettings, key: string) {
  return findPriority(settings, key)?.label ?? key;
}

export function defaultTaskSettings(): TaskSettings {
  return structuredClone(DEFAULT_TASK_SETTINGS);
}

export function dueLocalOnDay(dayOffset: number) {
  const day = new Date();
  day.setDate(day.getDate() + dayOffset);
  day.setHours(18, 0, 0, 0);
  return toDatetimeLocalValue(day.toISOString());
}

export function dueLocalFromDateInput(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  return toDatetimeLocalValue(new Date(year, month - 1, day, 18, 0, 0, 0).toISOString());
}

export function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function slugifyKey(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  if (!base) return 'item';
  return /^[a-z]/.test(base) ? base.slice(0, 64) : `s_${base}`.slice(0, 64);
}

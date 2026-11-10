import type { CalendarView } from '@erp-tiza/shared';

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date, weekStartsOn: number): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(start, -diff);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function rangeForView(
  view: CalendarView,
  anchor: Date,
  weekStartsOn: number,
): { from: Date; to: Date; days: Date[] } {
  if (view === 'day') {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1), days: [from] };
  }
  if (view === 'week' || view === 'agenda') {
    const from = startOfWeek(anchor, weekStartsOn);
    const days = Array.from({ length: 7 }, (_, index) => addDays(from, index));
    return { from, to: addDays(from, 7), days };
  }
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return { from: gridStart, to: addDays(gridStart, 42), days };
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Locale-aware clock time (hour + minute); never hardcode 12h/24h. */
export function formatClockTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatRangeTitle(view: CalendarView, anchor: Date, days: Date[]): string {
  if (view === 'day') {
    return anchor.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (view === 'month') {
    return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const start = days[0] ?? anchor;
  const end = days[days.length - 1] ?? anchor;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const month = start.toLocaleDateString(undefined, { month: 'short' });
    return `${month} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }
  if (sameYear) {
    const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${startLabel} – ${endLabel}, ${start.getFullYear()}`;
  }
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return startOfDay(next);
}

export function shiftAnchorForView(view: CalendarView, anchor: Date, direction: -1 | 1): Date {
  if (view === 'month') return addMonths(anchor, direction);
  if (view === 'week' || view === 'agenda') return addDays(anchor, direction * 7);
  return addDays(anchor, direction);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function snapToQuarterHour(date: Date): Date {
  const next = new Date(date);
  const minutes = next.getMinutes();
  const snapped = Math.round(minutes / 15) * 15;
  next.setMinutes(snapped, 0, 0);
  return next;
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export const CALENDAR_HOUR_HEIGHT = 56;

export function snapMinute(minute: number): number {
  return Math.round(minute / 15) * 15;
}

export function shiftIsoByDays(iso: string, dayDelta: number): string {
  const next = new Date(iso);
  next.setDate(next.getDate() + dayDelta);
  return next.toISOString();
}

export function shiftDateKey(dateKey: string, dayDelta: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return toDateKey(addDays(new Date(year, month - 1, day), dayDelta));
}

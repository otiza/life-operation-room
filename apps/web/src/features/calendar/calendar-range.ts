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

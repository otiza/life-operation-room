import type { CalendarOccurrenceDto } from '../calendar-api';
import { minutesSinceMidnight } from '../calendar-range';

export type LaidOutEvent = {
  occurrence: CalendarOccurrenceDto;
  column: number;
  columnCount: number;
  topMinutes: number;
  bottomMinutes: number;
};

export function layoutTimedEvents(events: CalendarOccurrenceDto[]): LaidOutEvent[] {
  const timed = events
    .filter((item) => !item.isAllDay && item.startAt && item.endAt && item.kind !== 'due_chip')
    .map((occurrence) => {
      const start = new Date(occurrence.startAt!);
      const end = new Date(occurrence.endAt!);
      return {
        occurrence,
        topMinutes: minutesSinceMidnight(start),
        bottomMinutes: Math.max(minutesSinceMidnight(end), minutesSinceMidnight(start) + 15),
      };
    })
    .sort((a, b) => a.topMinutes - b.topMinutes || a.bottomMinutes - b.bottomMinutes);

  const active: Array<{ bottomMinutes: number; column: number }> = [];
  const result: LaidOutEvent[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const columnCount = Math.max(...cluster.map((_, index) => {
      // recompute columns within cluster already assigned below
      return result[result.length - cluster.length + index]?.column ?? 0;
    }), 0) + 1;
    for (let index = result.length - cluster.length; index < result.length; index += 1) {
      result[index].columnCount = columnCount;
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of timed) {
    if (cluster.length && item.topMinutes >= clusterEnd) flush();
    active.splice(0, active.length, ...active.filter((slot) => slot.bottomMinutes > item.topMinutes));
    const used = new Set(active.map((slot) => slot.column));
    let column = 0;
    while (used.has(column)) column += 1;
    active.push({ bottomMinutes: item.bottomMinutes, column });
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.bottomMinutes);
    result.push({
      occurrence: item.occurrence,
      column,
      columnCount: 1,
      topMinutes: item.topMinutes,
      bottomMinutes: item.bottomMinutes,
    });
  }
  flush();

  // Fix column counts per overlapping group more carefully
  for (let i = 0; i < result.length; i += 1) {
    const current = result[i];
    let maxCol = current.column;
    for (let j = 0; j < result.length; j += 1) {
      const other = result[j];
      if (other.topMinutes < current.bottomMinutes && other.bottomMinutes > current.topMinutes) {
        maxCol = Math.max(maxCol, other.column);
      }
    }
    const columnCount = maxCol + 1;
    for (let j = 0; j < result.length; j += 1) {
      const other = result[j];
      if (other.topMinutes < current.bottomMinutes && other.bottomMinutes > current.topMinutes) {
        other.columnCount = Math.max(other.columnCount, columnCount);
      }
    }
  }

  return result;
}

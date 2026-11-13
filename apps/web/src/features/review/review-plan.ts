import { normalizeNoteMarkdown, parseNoteMarkdown, serializeNoteMarkdown } from '@life-room/shared';

/** Working window used to estimate free time. Not a setting yet; shown in the UI so it is not hidden. */
export const WORK_WINDOW = { startHour: 9, endHour: 18 } as const;

export type TimedInterval = { startAt: string | null; endAt: string | null; isAllDay: boolean; kind: string };

/**
 * Minutes inside [windowStart, windowEnd) covered by timed events and task time blocks.
 * Overlaps are merged so a double-booked hour counts once. All-day items and due chips are ignored.
 */
export function busyMinutesInWindow(items: TimedInterval[], windowStart: Date, windowEnd: Date) {
  const lo = windowStart.getTime();
  const hi = windowEnd.getTime();
  const ranges = items
    .filter((item) => !item.isAllDay && item.kind !== 'due_chip' && item.startAt && item.endAt)
    .map((item) => [
      Math.max(lo, new Date(item.startAt as string).getTime()),
      Math.min(hi, new Date(item.endAt as string).getTime()),
    ] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let currentStart = -1;
  let currentEnd = -1;
  for (const [start, end] of ranges) {
    if (start > currentEnd) {
      if (currentEnd > currentStart) total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    } else {
      currentEnd = Math.max(currentEnd, end);
    }
  }
  if (currentEnd > currentStart) total += currentEnd - currentStart;
  return Math.round(total / 60_000);
}

export type DayLoad = 'empty' | 'light' | 'balanced' | 'heavy';

/**
 * Rough read of a planned day without time estimates: compares how many tasks are planned
 * with how many free hours the calendar leaves. One task per free hour is the "full" line.
 */
export function dayLoad(taskCount: number, freeMinutes: number): DayLoad {
  if (taskCount === 0) return 'empty';
  const freeHours = freeMinutes / 60;
  if (freeHours < 1 || taskCount > freeHours) return 'heavy';
  if (taskCount <= freeHours / 3) return 'light';
  return 'balanced';
}

export function dayLoadCopy(load: DayLoad) {
  if (load === 'empty') return 'Nothing planned yet. Pick one thing that would make tomorrow good.';
  if (load === 'light') return 'Light day. There is room if something comes up.';
  if (load === 'balanced') return 'Balanced. The plan fits around your calendar.';
  return 'Heavy. More tasks than free hours. Consider moving one or two.';
}

export function formatMinutes(minutes: number) {
  if (minutes <= 0) return '0 h';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Prefix that marks the review paragraph inside a daily note. */
export const REVIEW_PREFIX = 'Day review: ';

/** The reflection saved for this day, without the prefix, or an empty string. */
export function extractReviewText(body: string) {
  const block = parseNoteMarkdown(normalizeNoteMarkdown(body)).find(
    (item) => item.type === 'paragraph' && item.text.startsWith(REVIEW_PREFIX),
  );
  return block && block.type === 'paragraph' ? block.text.slice(REVIEW_PREFIX.length) : '';
}

/**
 * Writes the reflection into the daily note as one paragraph. Replaces an earlier review paragraph
 * so reviewing twice does not duplicate it; an empty reflection removes it. Other content is kept.
 */
export function upsertReviewText(body: string, text: string) {
  const reflection = text.trim().replace(/\n{2,}/g, '\n');
  const blocks = parseNoteMarkdown(normalizeNoteMarkdown(body));
  const index = blocks.findIndex((item) => item.type === 'paragraph' && item.text.startsWith(REVIEW_PREFIX));
  const next = { type: 'paragraph' as const, text: `${REVIEW_PREFIX}${reflection}` };
  if (index >= 0) {
    if (reflection) blocks[index] = next;
    else blocks.splice(index, 1);
  } else if (reflection) {
    blocks.push(next);
  }
  return serializeNoteMarkdown(blocks);
}

const STORAGE_PREFIX = 'life-room-review';
export const DAY_CLOSED_EVENT = 'life-room:day-closed';

/** Per-viewer "day closed" marker. Browser storage can be unavailable; failures are ignored. */
export function readDayClosed(workspaceId: string, dayKey: string) {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}:${workspaceId}:${dayKey}`) === 'closed';
  } catch {
    return false;
  }
}

export function writeDayClosed(workspaceId: string, dayKey: string, closed: boolean) {
  try {
    const key = `${STORAGE_PREFIX}:${workspaceId}:${dayKey}`;
    if (closed) window.localStorage.setItem(key, 'closed');
    else window.localStorage.removeItem(key);
  } catch {
    // Private mode or blocked storage: the review still works, it just is not remembered.
  }
  window.dispatchEvent(new Event(DAY_CLOSED_EVENT));
}

/** Evening nudge on the home: from 17:00 local time until the day is closed. */
export function shouldSuggestReview(now: Date, closed: boolean) {
  return !closed && now.getHours() >= 17;
}

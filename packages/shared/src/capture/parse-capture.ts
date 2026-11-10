import { parseQuickAdd, type QuickAddParseResult } from '../calendar/quick-add.js';
import { parseTaskQuickAdd, type ParseTaskQuickAddOptions, type TaskQuickAddResult } from '../tasks/quick-add.js';

export type CaptureKind = 'task' | 'event';

export type CaptureParseResult = {
  kind: CaptureKind;
  text: string;
  task: TaskQuickAddResult;
  event: QuickAddParseResult;
};

const TASK_PREFIX_RE = /^(?:todo|task)\b[:\s-]*/i;
const EVENT_PREFIX_RE = /^event\b[:\s-]*/i;
const TASK_SIGNAL_RE = /(?:#\S|!(?:[1-4]|[a-z][a-z0-9_]*)\b|\bsomeday\b|\b(?:due|by)\s+)/i;
const CLOCK_RE = /\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d|noon|midnight)\b/i;
const AT_HOUR_RE = /\bat\s+\d{1,2}(?::\d{2})?\b/i;

function hasClockTime(text: string) {
  return CLOCK_RE.test(text) || AT_HOUR_RE.test(text);
}

/** "at 5" means 5 in the afternoon. "5am", "17:00", and "noon" stay as written. */
function preferAfternoon(event: QuickAddParseResult, source: string): QuickAddParseResult {
  if (!event.start || event.isAllDay) return event;
  if (/\d\s*(?:am|pm)\b/i.test(source) || /\b(?:noon|midnight)\b/i.test(source)) return event;
  if (/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/.test(source)) return event;
  const hour = event.start.getHours();
  if (hour < 1 || hour > 7) return event;
  const shift = 12 * 60 * 60 * 1000;
  return {
    ...event,
    start: new Date(event.start.getTime() + shift),
    end: event.end ? new Date(event.end.getTime() + shift) : null,
  };
}

export type ParseCaptureOptions = ParseTaskQuickAddOptions & {
  /** When false, a clock time stays a task. Use this if Calendar is not installed. */
  allowEvents?: boolean;
};

/** One sentence becomes a task or a calendar event. */
export function parseCapture(input: string, options: ParseCaptureOptions = {}): CaptureParseResult {
  const allowEvents = options.allowEvents !== false;
  let text = input.trim();
  let forced: CaptureKind | null = null;
  if (TASK_PREFIX_RE.test(text)) {
    forced = 'task';
    text = text.replace(TASK_PREFIX_RE, '').trim();
  } else if (EVENT_PREFIX_RE.test(text)) {
    forced = 'event';
    text = text.replace(EVENT_PREFIX_RE, '').trim();
  }
  const task = parseTaskQuickAdd(text, options);
  const event = preferAfternoon(parseQuickAdd(text, options.referenceDate), text);
  let kind: CaptureKind = 'task';
  if (forced === 'task' || !allowEvents) kind = 'task';
  else if (forced === 'event') kind = 'event';
  else if (TASK_SIGNAL_RE.test(text)) kind = 'task';
  else if (hasClockTime(text) && event.start && !event.isAllDay) kind = 'event';
  return { kind, text, task, event };
}

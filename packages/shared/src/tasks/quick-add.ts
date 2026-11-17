import * as chrono from 'chrono-node';
import { calendarDateKeyInTimeZone, zonedWallTimeToUtc } from '../utils/timezone.js';
import { taskRecurrenceFromPhrase } from './recurrence.js';

export type TaskQuickAddProject = { id: string; name: string };
export type TaskQuickAddPriority = { key: string; order: number; enabled: boolean };

export type TaskQuickAddTokenKind =
  | 'project'
  | 'when'
  | 'due'
  | 'time'
  | 'priority'
  | 'someday'
  | 'repeat'
  | 'warning';

export type TaskQuickAddToken = {
  kind: TaskQuickAddTokenKind;
  text: string;
  start: number;
  end: number;
  label: string;
};

export type TaskQuickAddResult = {
  title: string;
  projectId: string | null;
  projectName: string | null;
  unknownProject: string | null;
  whenDate: string | null;
  whenEvening: boolean;
  isSomeday: boolean;
  dueAt: string | null;
  /** When to ping. Set whenever the text names a clock time ("5pm", "at 17:00", "in 2 hours"). */
  remindAt: string | null;
  priority: string | null;
  tokens: TaskQuickAddToken[];
  /** Human label such as "Every Monday", or "every" when the phrase is not a supported rule. */
  recurrenceHint: string | null;
  recurrenceRrule: string | null;
};

export type ParseTaskQuickAddOptions = {
  referenceDate?: Date;
  timeZone?: string;
  projects?: TaskQuickAddProject[];
  priorities?: TaskQuickAddPriority[];
};

const EVERY_HINT_RE = /\bevery\b/i;

function emptyResult(title = ''): TaskQuickAddResult {
  return {
    title,
    projectId: null,
    projectName: null,
    unknownProject: null,
    whenDate: null,
    whenEvening: false,
    isSomeday: false,
    dueAt: null,
    remindAt: null,
    priority: null,
    tokens: [],
    recurrenceHint: null,
    recurrenceRrule: null,
  };
}

function addDaysKey(dateKey: string, days: number, timeZone: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = zonedWallTimeToUtc(year, month, day, 12, 0, 0, 0, timeZone);
  const shifted = new Date(utc.getTime() + days * 24 * 60 * 60 * 1000);
  return calendarDateKeyInTimeZone(shifted, timeZone);
}

const WEEKDAY_ALIAS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function nextWeekdayDateKey(
  rawDay: string,
  todayKey: string,
  timeZone: string,
  referenceDate: Date,
): string {
  const target = WEEKDAY_ALIAS[rawDay.toLowerCase()] ?? 0;
  const weekdayNow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(referenceDate),
  );
  let delta = (target - weekdayNow + 7) % 7;
  if (delta === 0) delta = 7;
  return addDaysKey(todayKey, delta, timeZone);
}

function matchProject(name: string, projects: TaskQuickAddProject[]) {
  const needle = name.toLowerCase();
  const exact = projects.find((project) => project.name.toLowerCase() === needle);
  if (exact) return exact;
  const prefixes = projects.filter((project) => project.name.toLowerCase().startsWith(needle));
  if (prefixes.length === 1) return prefixes[0];
  const includes = projects.filter((project) => project.name.toLowerCase().includes(needle));
  if (includes.length === 1) return includes[0];
  return null;
}

function enabledRankedPriorities(priorities: TaskQuickAddPriority[]) {
  return priorities
    .filter((item) => item.enabled && item.key !== 'none')
    .sort((a, b) => a.order - b.order);
}

function stripRange(text: string, start: number, end: number) {
  return `${text.slice(0, start)} ${text.slice(end)}`.replace(/\s+/g, ' ').trim();
}

function findFirst(re: RegExp, text: string) {
  const flags = re.flags.includes('i') ? 'i' : '';
  const match = new RegExp(re.source, flags).exec(text);
  return match;
}

type ClockMatch = { hour: number; minute: number; explicit: boolean; text: string; index: number };
type RelativeMatch = { ms: number; text: string; index: number };

const CLOCK_PATTERNS: Array<{ re: RegExp; read: (m: RegExpExecArray) => { hour: number; minute: number; explicit: boolean } | null }> = [
  {
    re: /\b(?:at\s+)?(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i,
    read: (m) => {
      let hour = Number(m[1]);
      if (hour < 1 || hour > 12) return null;
      const pm = m[3]!.toLowerCase() === 'pm';
      if (hour === 12) hour = pm ? 12 : 0;
      else if (pm) hour += 12;
      return { hour, minute: Number(m[2] ?? 0), explicit: true };
    },
  },
  {
    re: /\b(?:at\s+)?([01]?\d|2[0-3])[:h]([0-5]\d)\b/i,
    read: (m) => ({ hour: Number(m[1]), minute: Number(m[2]), explicit: Number(m[1]) >= 13 || m[1]!.startsWith('0') }),
  },
  {
    re: /\b(?:at\s+)?(noon|midnight)\b/i,
    read: (m) => ({ hour: m[1]!.toLowerCase() === 'noon' ? 12 : 0, minute: 0, explicit: true }),
  },
  {
    re: /\bat\s+(\d{1,2})\b(?![:\d]|\s*(?:%|st\b|nd\b|rd\b|th\b))/i,
    read: (m) => {
      const hour = Number(m[1]);
      return hour <= 23 ? { hour, minute: 0, explicit: hour >= 13 } : null;
    },
  },
];

function findClock(text: string): ClockMatch | null {
  let best: ClockMatch | null = null;
  for (const pattern of CLOCK_PATTERNS) {
    const m = pattern.re.exec(text);
    if (!m) continue;
    const value = pattern.read(m);
    if (!value) continue;
    if (!best || m.index < best.index) best = { ...value, text: m[0], index: m.index };
  }
  return best;
}

const RELATIVE_RE = /\bin\s+(\d+(?:\.\d+)?|an?|half an)\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i;

function findRelative(text: string): RelativeMatch | null {
  const m = RELATIVE_RE.exec(text);
  if (!m) return null;
  const raw = m[1]!.toLowerCase();
  const amount = raw === 'half an' ? 0.5 : raw === 'a' || raw === 'an' ? 1 : Number(raw);
  const unit = m[2]!.toLowerCase();
  const minutes = unit.startsWith('h') ? amount * 60 : amount;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return { ms: Math.round(minutes * 60_000), text: m[0], index: m.index };
}

function wallTime(dateKey: string, hour: number, minute: number, timeZone: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return zonedWallTimeToUtc(year, month, day, hour, minute, 0, 0, timeZone);
}

function formatClockLabel(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** chrono reads dates in the machine's timezone; rebuild the wall time in the user's. */
function chronoInTimeZone(components: chrono.ParsedComponents, timeZone: string) {
  const hasTime = components.isCertain('hour');
  const year = components.get('year')!;
  const month = components.get('month')!;
  const day = components.get('day')!;
  const hour = hasTime ? components.get('hour') ?? 12 : 12;
  const minute = hasTime ? components.get('minute') ?? 0 : 0;
  return { date: zonedWallTimeToUtc(year, month, day, hour, minute, 0, 0, timeZone), hasTime };
}

/** Parse Tasks natural-language quick add. Calendar `parseQuickAdd` is unchanged. */
export function parseTaskQuickAdd(input: string, options: ParseTaskQuickAddOptions = {}): TaskQuickAddResult {
  const referenceDate = options.referenceDate ?? new Date();
  const timeZone = options.timeZone ?? 'UTC';
  const projects = options.projects ?? [];
  const priorities = options.priorities ?? [];
  const original = input;
  let working = input.trim();
  if (!working) return emptyResult();

  const tokens: TaskQuickAddToken[] = [];
  const result = emptyResult();

  // Projects (#name) — strip known ones; keep unknown in title with a warning token.
  const projectRe = /#([^\s#]+)/g;
  let projectMatch: RegExpExecArray | null;
  const projectHits: Array<{ match: RegExpExecArray; found: TaskQuickAddProject | null }> = [];
  while ((projectMatch = projectRe.exec(working)) !== null) {
    projectHits.push({ match: projectMatch, found: matchProject(projectMatch[1], projects) });
  }
  for (const hit of [...projectHits].reverse()) {
    const start = hit.match.index ?? 0;
    const end = start + hit.match[0].length;
    if (hit.found) {
      result.projectId = hit.found.id;
      result.projectName = hit.found.name;
      tokens.push({ kind: 'project', text: hit.match[0], start, end, label: `#${hit.found.name}` });
      working = stripRange(working, start, end);
    } else {
      result.unknownProject = hit.match[1];
      tokens.push({
        kind: 'warning',
        text: hit.match[0],
        start,
        end,
        label: `Unknown #${hit.match[1]}`,
      });
    }
  }

  // Priority !1-!4 or !key
  const ranked = enabledRankedPriorities(priorities);
  const priorityMatch = findFirst(/!(?:([1-4])|([a-z][a-z0-9_]*))\b/i, working);
  if (priorityMatch && priorityMatch.index !== undefined) {
    const numeric = priorityMatch[1];
    const key = priorityMatch[2]?.toLowerCase();
    let priorityKey: string | null = null;
    if (numeric) priorityKey = ranked[Number(numeric) - 1]?.key ?? null;
    else if (key) priorityKey = priorities.find((item) => item.enabled && item.key === key)?.key ?? null;
    if (priorityKey) {
      result.priority = priorityKey;
      const start = priorityMatch.index;
      const end = start + priorityMatch[0].length;
      tokens.push({ kind: 'priority', text: priorityMatch[0], start, end, label: `!${priorityKey}` });
      working = stripRange(working, start, end);
    }
  }

  // Someday
  const somedayMatch = findFirst(/\bsomeday\b/i, working);
  if (somedayMatch && somedayMatch.index !== undefined) {
    result.isSomeday = true;
    result.whenDate = null;
    result.whenEvening = false;
    const start = somedayMatch.index;
    const end = start + somedayMatch[0].length;
    tokens.push({ kind: 'someday', text: somedayMatch[0], start, end, label: 'Someday' });
    working = stripRange(working, start, end);
  }

  // Due / by … (before when, so "tomorrow due friday" can set both)
  const dueMatch = findFirst(/\b(?:due|by)\s+(.+)$/i, working);
  if (dueMatch && dueMatch.index !== undefined) {
    const dueText = dueMatch[1].trim();
    const chronoResults = chrono.parse(dueText, referenceDate, { forwardDate: true });
    if (chronoResults[0]) {
      const due = chronoInTimeZone(chronoResults[0].start, timeZone);
      result.dueAt = due.date.toISOString();
      if (due.hasTime) result.remindAt = result.dueAt;
      const start = dueMatch.index;
      const end = start + dueMatch[0].length;
      tokens.push({ kind: 'due', text: dueMatch[0], start, end, label: `due ${dueText}` });
      working = stripRange(working, start, end);
    }
  }

  // Clock time ("5pm", "at 17:00", "noon") or relative ("in 2 hours"): a time means a reminder.
  let clock: ClockMatch | null = null;
  let relative: RelativeMatch | null = null;
  if (!result.dueAt && !result.isSomeday) {
    relative = findRelative(working);
    if (relative) {
      working = stripRange(working, relative.index, relative.index + relative.text.length);
    } else {
      clock = findClock(working);
      if (clock) working = stripRange(working, clock.index, clock.index + clock.text.length);
    }
  }

  const todayKey = calendarDateKeyInTimeZone(referenceDate, timeZone);
  const weekdayToday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(
    new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(referenceDate),
  );

  if (!result.isSomeday) {
    const recurrence = taskRecurrenceFromPhrase(working, todayKey, weekdayToday < 0 ? 0 : weekdayToday);
    if (recurrence) {
      result.recurrenceRrule = recurrence.rrule;
      result.recurrenceHint = recurrence.label;
      result.whenDate = recurrence.whenDate;
      result.whenEvening = recurrence.whenEvening;
      const start = recurrence.matchText ? working.toLowerCase().indexOf(recurrence.matchText.toLowerCase()) : 0;
      tokens.push({
        kind: 'repeat',
        text: recurrence.matchText,
        start: Math.max(start, 0),
        end: Math.max(start, 0) + recurrence.matchText.length,
        label: recurrence.label,
      });
      working = recurrence.remaining;
    }
  }
  if (!result.recurrenceRrule && EVERY_HINT_RE.test(working)) result.recurrenceHint = 'every';

  if (!result.isSomeday && !result.recurrenceRrule) {
    const tonightMatch = findFirst(/\b(tonight|this evening)\b/i, working);
    if (tonightMatch && tonightMatch.index !== undefined) {
      result.whenDate = todayKey;
      result.whenEvening = true;
      const start = tonightMatch.index;
      const end = start + tonightMatch[0].length;
      tokens.push({ kind: 'when', text: tonightMatch[0], start, end, label: 'This evening' });
      working = stripRange(working, start, end);
    } else {
      const todayMatch = findFirst(/\btoday\b/i, working);
      if (todayMatch && todayMatch.index !== undefined) {
        result.whenDate = todayKey;
        result.whenEvening = false;
        const start = todayMatch.index;
        const end = start + todayMatch[0].length;
        tokens.push({ kind: 'when', text: todayMatch[0], start, end, label: 'Today' });
        working = stripRange(working, start, end);
      } else {
        const tomorrowMatch = findFirst(/\btomorrow\b/i, working);
        if (tomorrowMatch && tomorrowMatch.index !== undefined) {
          result.whenDate = addDaysKey(todayKey, 1, timeZone);
          result.whenEvening = false;
          const start = tomorrowMatch.index;
          const end = start + tomorrowMatch[0].length;
          tokens.push({ kind: 'when', text: tomorrowMatch[0], start, end, label: 'Tomorrow' });
          working = stripRange(working, start, end);
        } else {
          const nextWeekdayMatch = findFirst(
            /\bnext\s+(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
            working,
          );
          if (nextWeekdayMatch && nextWeekdayMatch.index !== undefined) {
            const whenDate = nextWeekdayDateKey(nextWeekdayMatch[1], todayKey, timeZone, referenceDate);
            result.whenDate = whenDate;
            result.whenEvening = false;
            const start = nextWeekdayMatch.index;
            const end = start + nextWeekdayMatch[0].length;
            tokens.push({ kind: 'when', text: nextWeekdayMatch[0], start, end, label: whenDate });
            working = stripRange(working, start, end);
          } else if (!result.whenDate && !EVERY_HINT_RE.test(working)) {
            // Skip chrono when "every …" is present so recurrence words stay in the title.
            const chronoResults = chrono.parse(working, referenceDate, { forwardDate: true });
            if (chronoResults[0]) {
              const primary = chronoResults[0];
              const whenDate = calendarDateKeyInTimeZone(primary.start.date(), timeZone);
              result.whenDate = whenDate;
              result.whenEvening = false;
              tokens.push({
                kind: 'when',
                text: primary.text,
                start: primary.index,
                end: primary.index + primary.text.length,
                label: whenDate,
              });
              working = `${working.slice(0, primary.index)} ${working.slice(primary.index + primary.text.length)}`
                .replace(/\s+/g, ' ')
                .trim();
            }
          }
        }
      }
    }
  }

  if (relative) {
    const due = new Date(referenceDate.getTime() + relative.ms);
    result.dueAt = due.toISOString();
    result.remindAt = result.dueAt;
    result.whenDate = calendarDateKeyInTimeZone(due, timeZone);
    result.whenEvening = false;
    tokens.push({ kind: 'time', text: relative.text, start: 0, end: 0, label: relative.text.trim() });
  } else if (clock) {
    let hour = clock.hour;
    // "at 5" means 5 in the afternoon; "tonight at 8" means 20:00. "5am" and "05:00" stay as written.
    if (!clock.explicit && hour < 12 && (result.whenEvening ? hour >= 1 : hour >= 1 && hour <= 7)) hour += 12;
    let dateKey = result.whenDate ?? todayKey;
    let due = wallTime(dateKey, hour, clock.minute, timeZone);
    if (!result.whenDate && !result.recurrenceRrule && due.getTime() <= referenceDate.getTime()) {
      dateKey = addDaysKey(todayKey, 1, timeZone);
      due = wallTime(dateKey, hour, clock.minute, timeZone);
    }
    result.whenDate = dateKey;
    result.dueAt = due.toISOString();
    result.remindAt = result.dueAt;
    tokens.push({ kind: 'time', text: clock.text, start: 0, end: 0, label: formatClockLabel(hour, clock.minute) });
  }

  result.title = working.replace(/^[\s\-–,]+|[\s\-–,]+$/g, '').trim() || original.trim();
  result.tokens = tokens.map((token) => {
    const index = original.toLowerCase().indexOf(token.text.toLowerCase());
    if (index < 0) return token;
    return { ...token, start: index, end: index + token.text.length };
  });
  return result;
}

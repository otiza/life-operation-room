import * as chrono from 'chrono-node';
import { calendarDateKeyInTimeZone, zonedWallTimeToUtc } from '../utils/timezone.js';

export type TaskQuickAddProject = { id: string; name: string };
export type TaskQuickAddPriority = { key: string; order: number; enabled: boolean };

export type TaskQuickAddTokenKind =
  | 'project'
  | 'when'
  | 'due'
  | 'priority'
  | 'someday'
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
  priority: string | null;
  tokens: TaskQuickAddToken[];
  /** Extension point: recurrence words stay in the title for now. */
  recurrenceHint: string | null;
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
    priority: null,
    tokens: [],
    recurrenceHint: null,
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
  result.recurrenceHint = EVERY_HINT_RE.test(working) ? 'every' : null;

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
      result.dueAt = chronoResults[0].start.date().toISOString();
      const start = dueMatch.index;
      const end = start + dueMatch[0].length;
      tokens.push({ kind: 'due', text: dueMatch[0], start, end, label: `due ${dueText}` });
      working = stripRange(working, start, end);
    }
  }

  const todayKey = calendarDateKeyInTimeZone(referenceDate, timeZone);

  if (!result.isSomeday) {
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

  result.title = working.replace(/^[\s\-–,]+|[\s\-–,]+$/g, '').trim() || original.trim();
  result.tokens = tokens.map((token) => {
    const index = original.toLowerCase().indexOf(token.text.toLowerCase());
    if (index < 0) return token;
    return { ...token, start: index, end: index + token.text.length };
  });
  return result;
}

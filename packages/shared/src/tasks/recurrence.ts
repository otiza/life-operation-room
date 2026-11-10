const RRULE_DAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
const DAY_NAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const WEEKDAY_WORD: Record<string, number> = {
  mon: 0,
  monday: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  wed: 2,
  wednesday: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  fri: 4,
  friday: 4,
  sat: 5,
  saturday: 5,
  sun: 6,
  sunday: 6,
};

const EVERY_MORNING_RE = /\bevery\s+morning\b/i;
const EVERY_EVENING_RE = /\bevery\s+(?:evening|night)\b/i;
const EVERY_WEEKDAY_RE = /\bevery\s+weekdays?\b/i;
const EVERY_NAMED_DAY_RE =
  /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)s?\b/i;
const EVERY_WEEK_RE = /\bevery\s+(\d+\s+)?weeks?\b/i;
const EVERY_DAY_RE = /\bevery\s+(\d+\s+)?days?\b/i;

export type ParsedTaskRrule = {
  freq: 'DAILY' | 'WEEKLY';
  interval: number;
  byWeekday: number[];
  whenHint: 'morning' | 'evening' | null;
};

export type TaskRecurrencePhrase = {
  rrule: string;
  label: string;
  whenDate: string;
  whenEvening: boolean;
  matchText: string;
  remaining: string;
};

function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
}

function weekdayMon0(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const javascriptWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (javascriptWeekday + 6) % 7;
}

function weekIndex(dateKey: string): number {
  const mondayEpoch = Date.UTC(2020, 0, 6);
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor((Date.UTC(year, month - 1, day) - mondayEpoch) / (7 * 86_400_000));
}

function stripMatch(text: string, match: RegExpMatchArray): string {
  if (match.index === undefined) return text;
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`.replace(/\s+/g, ' ').trim();
}

function weekdayName(day: number): string {
  return DAY_NAME[day] ?? 'day';
}

export function parseTaskRrule(rrule: string): ParsedTaskRrule | null {
  const parts = rrule.split(';').filter(Boolean);
  if (!parts.length) return null;
  let freq: 'DAILY' | 'WEEKLY' | null = null;
  let interval = 1;
  const byWeekday: number[] = [];
  let whenHint: 'morning' | 'evening' | null = null;
  for (const part of parts) {
    const separator = part.indexOf('=');
    if (separator <= 0) return null;
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (key === 'FREQ' && (value === 'DAILY' || value === 'WEEKLY')) freq = value;
    else if (key === 'INTERVAL' && /^[1-9]\d*$/.test(value) && Number(value) <= 99) interval = Number(value);
    else if (key === 'BYDAY') {
      for (const day of value.split(',')) {
        const index = RRULE_DAY.indexOf(day as (typeof RRULE_DAY)[number]);
        if (index < 0) return null;
        byWeekday.push(index);
      }
    } else if (key === 'X-WHEN' && (value === 'MORNING' || value === 'EVENING')) {
      whenHint = value === 'MORNING' ? 'morning' : 'evening';
    } else return null;
  }
  if (!freq) return null;
  if (freq === 'DAILY' && byWeekday.length > 0) return null;
  return { freq, interval, byWeekday, whenHint };
}

export function isSupportedTaskRrule(rrule: string): boolean {
  return parseTaskRrule(rrule) !== null;
}

export function describeTaskRecurrence(rrule: string): string | null {
  const parsed = parseTaskRrule(rrule);
  if (!parsed) return null;
  if (parsed.whenHint === 'morning') return 'Every morning';
  if (parsed.whenHint === 'evening') return 'Every evening';
  if (parsed.freq === 'DAILY') {
    return parsed.interval === 1 ? 'Every day' : `Every ${parsed.interval} days`;
  }
  const weekdays = parsed.byWeekday;
  const isWeekdays =
    weekdays.length === 5 && [0, 1, 2, 3, 4].every((day) => weekdays.includes(day));
  if (isWeekdays && parsed.interval === 1) return 'Every weekday';
  if (weekdays.length === 1 && parsed.interval === 1) return `Every ${weekdayName(weekdays[0]!)}`;
  if (weekdays.length > 1 && parsed.interval === 1) {
    return `Every ${weekdays.map((day) => weekdayName(day)).join(', ')}`;
  }
  return parsed.interval === 1 ? 'Every week' : `Every ${parsed.interval} weeks`;
}

/** Next calendar date strictly after `afterDateKey`. */
export function nextTaskOccurrenceDateKey(rrule: string, afterDateKey: string): string | null {
  const parsed = parseTaskRrule(rrule);
  if (!parsed || !/^\d{4}-\d{2}-\d{2}$/.test(afterDateKey)) return null;
  if (parsed.freq === 'DAILY') return addCalendarDays(afterDateKey, parsed.interval);
  if (parsed.byWeekday.length === 0) return addCalendarDays(afterDateKey, 7 * parsed.interval);
  const anchorWeek = weekIndex(afterDateKey);
  const searchLimit = 7 * parsed.interval + 7;
  for (let offset = 1; offset <= searchLimit; offset += 1) {
    const candidate = addCalendarDays(afterDateKey, offset);
    if (!parsed.byWeekday.includes(weekdayMon0(candidate))) continue;
    const weekDelta = weekIndex(candidate) - anchorWeek;
    if (weekDelta % parsed.interval === 0) return candidate;
  }
  return null;
}

function phraseResult(
  match: RegExpMatchArray,
  text: string,
  rrule: string,
  whenDate: string,
  whenEvening: boolean,
): TaskRecurrencePhrase | null {
  const label = describeTaskRecurrence(rrule);
  if (!label) return null;
  return {
    rrule,
    label,
    whenDate,
    whenEvening,
    matchText: match[0],
    remaining: stripMatch(text, match),
  };
}

export function taskRecurrenceFromPhrase(
  text: string,
  todayKey: string,
  weekdayToday: number,
): TaskRecurrencePhrase | null {
  const morning = text.match(EVERY_MORNING_RE);
  if (morning) return phraseResult(morning, text, 'FREQ=DAILY;X-WHEN=MORNING', todayKey, false);
  const evening = text.match(EVERY_EVENING_RE);
  if (evening) return phraseResult(evening, text, 'FREQ=DAILY;X-WHEN=EVENING', todayKey, true);
  const weekdays = text.match(EVERY_WEEKDAY_RE);
  if (weekdays) {
    const whenDate = weekdayToday <= 4 ? todayKey : addCalendarDays(todayKey, (7 - weekdayToday) % 7 || 7);
    return phraseResult(weekdays, text, 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', whenDate, false);
  }
  const namedDay = text.match(EVERY_NAMED_DAY_RE);
  if (namedDay) {
    const target = WEEKDAY_WORD[namedDay[1].toLowerCase()];
    if (target === undefined) return null;
    const delta = (target - weekdayToday + 7) % 7;
    const whenDate = addCalendarDays(todayKey, delta);
    return phraseResult(namedDay, text, `FREQ=WEEKLY;BYDAY=${RRULE_DAY[target]}`, whenDate, false);
  }
  const week = text.match(EVERY_WEEK_RE);
  if (week) {
    const interval = week[1] ? Number(week[1].trim()) : 1;
    const rrule = interval === 1 ? 'FREQ=WEEKLY' : `FREQ=WEEKLY;INTERVAL=${interval}`;
    return phraseResult(week, text, rrule, todayKey, false);
  }
  const day = text.match(EVERY_DAY_RE);
  if (day) {
    const interval = day[1] ? Number(day[1].trim()) : 1;
    const rrule = interval === 1 ? 'FREQ=DAILY' : `FREQ=DAILY;INTERVAL=${interval}`;
    return phraseResult(day, text, rrule, todayKey, false);
  }
  return null;
}

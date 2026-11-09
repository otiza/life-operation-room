import * as chrono from 'chrono-node';

export type QuickAddRecurrence =
  | { freq: 'daily'; interval: number }
  | { freq: 'weekly'; interval: number; byWeekday?: number[] }
  | { freq: 'weekdays' };

export type QuickAddParseResult = {
  title: string;
  start: Date | null;
  end: Date | null;
  isAllDay: boolean;
  location: string | null;
  durationMinutes: number | null;
  recurrence: QuickAddRecurrence | null;
  rrule: string | null;
  residualText: string;
};

const DURATION_RE = /\bfor\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\b/i;
const LOCATION_RE = /\bat\s+(?!\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b)(.+?)(?=\s+every\b|$)/i;
const EVERY_WEEKDAY_RE = /\bevery\s+weekday(s)?\b/i;
const EVERY_DAY_RE = /\bevery\s+(\d+\s+)?days?\b/i;
const EVERY_WEEK_RE = /\bevery\s+(\d+\s+)?weeks?\b/i;
const EVERY_NAMED_DAY_RE =
  /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/i;

const WEEKDAY_MAP: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const RRULE_WEEKDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

function parseDurationMinutes(match: RegExpMatchArray): number {
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('h')) return amount * 60;
  return amount;
}

function stripMatch(text: string, match: RegExpMatchArray | null): string {
  if (!match || match.index === undefined) return text;
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`.replace(/\s+/g, ' ').trim();
}

function recurrenceToRrule(recurrence: QuickAddRecurrence): string {
  if (recurrence.freq === 'daily') {
    return recurrence.interval === 1 ? 'FREQ=DAILY' : `FREQ=DAILY;INTERVAL=${recurrence.interval}`;
  }
  if (recurrence.freq === 'weekdays') {
    return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
  }
  const intervalPart = recurrence.interval === 1 ? '' : `;INTERVAL=${recurrence.interval}`;
  if (recurrence.byWeekday && recurrence.byWeekday.length > 0) {
    const days = recurrence.byWeekday.map((day) => RRULE_WEEKDAY[day]).join(',');
    return `FREQ=WEEKLY${intervalPart};BYDAY=${days}`;
  }
  return `FREQ=WEEKLY${intervalPart}`;
}

function parseRecurrence(text: string): { recurrence: QuickAddRecurrence | null; remaining: string } {
  const weekdayMatch = text.match(EVERY_WEEKDAY_RE);
  if (weekdayMatch) {
    return { recurrence: { freq: 'weekdays' }, remaining: stripMatch(text, weekdayMatch) };
  }
  const namedDayMatch = text.match(EVERY_NAMED_DAY_RE);
  if (namedDayMatch) {
    const day = WEEKDAY_MAP[namedDayMatch[1].toLowerCase()];
    return {
      recurrence: { freq: 'weekly', interval: 1, byWeekday: [day] },
      remaining: stripMatch(text, namedDayMatch),
    };
  }
  const weekMatch = text.match(EVERY_WEEK_RE);
  if (weekMatch) {
    const interval = weekMatch[1] ? Number(weekMatch[1].trim()) : 1;
    return { recurrence: { freq: 'weekly', interval }, remaining: stripMatch(text, weekMatch) };
  }
  const dayMatch = text.match(EVERY_DAY_RE);
  if (dayMatch) {
    const interval = dayMatch[1] ? Number(dayMatch[1].trim()) : 1;
    return { recurrence: { freq: 'daily', interval }, remaining: stripMatch(text, dayMatch) };
  }
  return { recurrence: null, remaining: text };
}

/** Parse a Fantastical-style natural-language event string. */
export function parseQuickAdd(input: string, referenceDate: Date = new Date()): QuickAddParseResult {
  let working = input.trim();
  if (!working) {
    return {
      title: '',
      start: null,
      end: null,
      isAllDay: false,
      location: null,
      durationMinutes: null,
      recurrence: null,
      rrule: null,
      residualText: '',
    };
  }

  let location: string | null = null;
  const locationMatch = working.match(LOCATION_RE);
  if (locationMatch) {
    location = locationMatch[1].trim().replace(/[.,;]+$/, '');
    working = stripMatch(working, locationMatch);
  }

  let durationMinutes: number | null = null;
  const durationMatch = working.match(DURATION_RE);
  if (durationMatch) {
    durationMinutes = parseDurationMinutes(durationMatch);
    working = stripMatch(working, durationMatch);
  }

  const { recurrence, remaining } = parseRecurrence(working);
  working = remaining;

  const chronoResults = chrono.parse(working, referenceDate, { forwardDate: true });
  let start: Date | null = null;
  let end: Date | null = null;
  let isAllDay = false;
  let titleSource = working;

  if (chronoResults.length > 0) {
    const primary = chronoResults[0];
    start = primary.start.date();
    const hasTime =
      primary.start.isCertain('hour') ||
      primary.start.isCertain('minute') ||
      primary.start.isCertain('second');
    isAllDay = !hasTime;
    if (primary.end) {
      end = primary.end.date();
    } else if (durationMinutes != null && start) {
      end = new Date(start.getTime() + durationMinutes * 60_000);
    } else if (start && !isAllDay) {
      end = new Date(start.getTime() + 60 * 60_000);
    } else if (start && isAllDay) {
      const nextDay = new Date(start);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      end = nextDay;
    }
    titleSource = `${working.slice(0, primary.index)} ${working.slice(primary.index + primary.text.length)}`
      .replace(/\s+/g, ' ')
      .trim();
  } else if (durationMinutes != null) {
    // Duration without a date is ignored for start/end; keep as hint only.
  }

  const title = titleSource.replace(/^[\s\-–,]+|[\s\-–,]+$/g, '').trim() || working.trim() || input.trim();
  const rrule = recurrence ? recurrenceToRrule(recurrence) : null;

  return {
    title,
    start,
    end,
    isAllDay,
    location,
    durationMinutes,
    recurrence,
    rrule,
    residualText: titleSource,
  };
}

import { describe, expect, it } from 'vitest';
import { parseTaskQuickAdd } from './quick-add.js';

const PROJECTS = [
  { id: 'p-home', name: 'Home' },
  { id: 'p-work', name: 'Work' },
  { id: 'p-errands', name: 'Errands' },
];

const PRIORITIES = [
  { key: 'none', order: 0, enabled: true },
  { key: 'low', order: 1, enabled: true },
  { key: 'medium', order: 2, enabled: true },
  { key: 'high', order: 3, enabled: true },
  { key: 'urgent', order: 4, enabled: true },
];

const REF = new Date('2026-11-09T10:00:00Z'); // Monday
const TZ = 'UTC';

function parse(input: string, overrides: Parameters<typeof parseTaskQuickAdd>[1] = {}) {
  return parseTaskQuickAdd(input, {
    referenceDate: REF,
    timeZone: TZ,
    projects: PROJECTS,
    priorities: PRIORITIES,
    ...overrides,
  });
}

describe('parseTaskQuickAdd', () => {
  it('parses a plain title', () => {
    expect(parse('Buy milk').title).toBe('Buy milk');
  });

  it('parses today as when_date', () => {
    const result = parse('Ship docs today');
    expect(result.whenDate).toBe('2026-11-09');
    expect(result.whenEvening).toBe(false);
    expect(result.title).toBe('Ship docs');
  });

  it('parses tonight as when evening', () => {
    const result = parse('Call mom tonight');
    expect(result.whenDate).toBe('2026-11-09');
    expect(result.whenEvening).toBe(true);
    expect(result.title).toBe('Call mom');
  });

  it('parses this evening as when evening', () => {
    const result = parse('Cook this evening');
    expect(result.whenEvening).toBe(true);
    expect(result.whenDate).toBe('2026-11-09');
  });

  it('parses tomorrow', () => {
    const result = parse('Run tomorrow');
    expect(result.whenDate).toBe('2026-11-10');
    expect(result.title).toBe('Run');
  });

  it('parses next fri', () => {
    const result = parse('Demo next fri');
    expect(result.whenDate).toBe('2026-11-13');
    expect(result.title).toBe('Demo');
  });

  it('parses in 3 days', () => {
    const result = parse('Follow up in 3 days');
    expect(result.whenDate).toBe('2026-11-12');
  });

  it('parses jan 12 as when', () => {
    const result = parse('Tax forms jan 12');
    expect(result.whenDate).toBe('2027-01-12');
  });

  it('parses someday and clears when', () => {
    const result = parse('Learn Mandarin someday');
    expect(result.isSomeday).toBe(true);
    expect(result.whenDate).toBeNull();
    expect(result.title).toBe('Learn Mandarin');
  });

  it('parses due fri', () => {
    const result = parse('Submit report due fri');
    expect(result.dueAt).toBeTruthy();
    expect(new Date(result.dueAt!).toISOString().startsWith('2026-11-13')).toBe(true);
    expect(result.title).toBe('Submit report');
  });

  it('parses by friday', () => {
    const result = parse('Invoice by friday');
    expect(result.dueAt).toBeTruthy();
  });

  it('parses due jan 12 5pm', () => {
    const result = parse('File taxes due jan 12 5pm');
    expect(result.dueAt).toBeTruthy();
    expect(result.title.toLowerCase()).toContain('file taxes');
  });

  it('matches #project case-insensitively', () => {
    const result = parse('Clean garage #home');
    expect(result.projectId).toBe('p-home');
    expect(result.projectName).toBe('Home');
    expect(result.title).toBe('Clean garage');
  });

  it('fuzzy prefix matches project names', () => {
    const result = parse('Buy stamps #err');
    expect(result.projectId).toBe('p-errands');
  });

  it('keeps unknown #project in title and warns', () => {
    const result = parse('Idea #moonbase');
    expect(result.projectId).toBeNull();
    expect(result.unknownProject).toBe('moonbase');
    expect(result.title).toContain('#moonbase');
    expect(result.tokens.some((token) => token.kind === 'warning')).toBe(true);
  });

  it('maps !1 to first enabled non-none priority', () => {
    expect(parse('Urgent bug !1').priority).toBe('low');
  });

  it('maps !2 !3 !4 by configured order', () => {
    expect(parse('Thing !2').priority).toBe('medium');
    expect(parse('Thing !3').priority).toBe('high');
    expect(parse('Thing !4').priority).toBe('urgent');
  });

  it('accepts !priority key', () => {
    expect(parse('Ship !urgent').priority).toBe('urgent');
  });

  it('turns every monday into a weekly task', () => {
    const result = parse('Water plants every monday');
    expect(result.title).toBe('Water plants');
    expect(result.recurrenceRrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(result.recurrenceHint).toBe('Every Monday');
    expect(result.whenDate).toBe('2026-11-09');
  });

  it('turns every morning into a daily task on today', () => {
    const result = parse('Take meds every morning');
    expect(result.title).toBe('Take meds');
    expect(result.recurrenceRrule).toBe('FREQ=DAILY;X-WHEN=MORNING');
    expect(result.whenEvening).toBe(false);
    expect(result.whenDate).toBe('2026-11-09');
  });

  it('turns every evening into this evening and a daily rule', () => {
    const result = parse('Journal every evening');
    expect(result.whenEvening).toBe(true);
    expect(result.recurrenceRrule).toBe('FREQ=DAILY;X-WHEN=EVENING');
    expect(result.title).toBe('Journal');
  });

  it('leaves an unsupported every phrase in the title', () => {
    const result = parse('Water plants every blue moon');
    expect(result.title.toLowerCase()).toContain('every blue moon');
    expect(result.recurrenceRrule).toBeNull();
    expect(result.recurrenceHint).toBe('every');
  });

  it('keeps friday dinner in title when tonight already set when', () => {
    const result = parse('Call mom tonight about friday dinner');
    expect(result.whenEvening).toBe(true);
    expect(result.whenDate).toBe('2026-11-09');
    expect(result.title.toLowerCase()).toContain('about friday dinner');
  });

  it('combines project when due and priority', () => {
    const result = parse('Ship docs #work tomorrow due fri !2');
    expect(result.projectId).toBe('p-work');
    expect(result.whenDate).toBe('2026-11-10');
    expect(result.dueAt).toBeTruthy();
    expect(result.priority).toBe('medium');
    expect(result.title).toBe('Ship docs');
  });

  it('someday wins over a leftover date word after strip order', () => {
    const result = parse('Garden someday');
    expect(result.isSomeday).toBe(true);
    expect(result.whenDate).toBeNull();
  });

  it('emits highlight tokens for recognized pieces', () => {
    const result = parse('Pay rent #home today !1');
    expect(result.tokens.some((token) => token.kind === 'project')).toBe(true);
    expect(result.tokens.some((token) => token.kind === 'when')).toBe(true);
    expect(result.tokens.some((token) => token.kind === 'priority')).toBe(true);
  });

  it('handles empty input', () => {
    expect(parse('').title).toBe('');
  });

  it('trims punctuation from title edges', () => {
    expect(parse('  - Hello today -  ').title).toBe('Hello');
  });

  it('is timezone sensitive near midnight for today', () => {
    const nearMidnight = new Date('2026-11-09T23:30:00Z');
    const paris = parse('Ship today', {
      referenceDate: nearMidnight,
      timeZone: 'Europe/Paris',
    });
    const utc = parse('Ship today', {
      referenceDate: nearMidnight,
      timeZone: 'UTC',
    });
    expect(paris.whenDate).toBe('2026-11-10');
    expect(utc.whenDate).toBe('2026-11-09');
  });

  it('is timezone sensitive near midnight for tomorrow', () => {
    const nearMidnight = new Date('2026-11-09T23:30:00Z');
    const paris = parse('Ship tomorrow', {
      referenceDate: nearMidnight,
      timeZone: 'Europe/Paris',
    });
    expect(paris.whenDate).toBe('2026-11-11');
  });

  it('does not auto-create projects', () => {
    const result = parse('Task #brandnew');
    expect(result.projectId).toBeNull();
    expect(result.unknownProject).toBe('brandnew');
  });

  it('prefers exact project match over prefix', () => {
    const projects = [
      ...PROJECTS,
      { id: 'p-homework', name: 'Homework' },
    ];
    const result = parse('Study #home', { projects });
    expect(result.projectId).toBe('p-home');
  });

  it('ignores disabled priorities for bang numbers', () => {
    const priorities = [
      { key: 'none', order: 0, enabled: true },
      { key: 'low', order: 1, enabled: false },
      { key: 'medium', order: 2, enabled: true },
      { key: 'high', order: 3, enabled: true },
    ];
    expect(parse('Thing !1', { priorities }).priority).toBe('medium');
  });

  it('parses Work project with mixed case hash', () => {
    expect(parse('Meet #WORK').projectId).toBe('p-work');
  });

  it('supports due and when together', () => {
    const result = parse('Draft tomorrow due next monday');
    expect(result.whenDate).toBe('2026-11-10');
    expect(result.dueAt).toBeTruthy();
  });
});

describe('parseTaskQuickAdd clock times and reminders', () => {
  it.each([
    ['print documents tomorrow 5pm', '2026-11-10', '2026-11-10T17:00:00.000Z'],
    ['print documents tomorrow at 17:00', '2026-11-10', '2026-11-10T17:00:00.000Z'],
    ['print documents 17h30', '2026-11-09', '2026-11-09T17:30:00.000Z'],
    ['print documents at 5', '2026-11-09', '2026-11-09T17:00:00.000Z'],
    ['print documents friday 9am', '2026-11-13', '2026-11-13T09:00:00.000Z'],
    ['print documents at noon', '2026-11-09', '2026-11-09T12:00:00.000Z'],
  ])('%s', (input, whenDate, dueAt) => {
    const result = parse(input);
    expect(result.title).toBe('print documents');
    expect(result.whenDate).toBe(whenDate);
    expect(result.dueAt).toBe(dueAt);
    expect(result.remindAt).toBe(dueAt);
  });

  it('moves a time that already passed today to tomorrow', () => {
    const result = parse('Stretch at 9am');
    expect(result.whenDate).toBe('2026-11-10');
    expect(result.dueAt).toBe('2026-11-10T09:00:00.000Z');
  });

  it('reads tonight at 8 as 20:00 in the evening', () => {
    const result = parse('Call mom tonight at 8');
    expect(result.title).toBe('Call mom');
    expect(result.whenEvening).toBe(true);
    expect(result.dueAt).toBe('2026-11-09T20:00:00.000Z');
  });

  it('reads relative times', () => {
    expect(parse('Take pills in 2 hours').dueAt).toBe('2026-11-09T12:00:00.000Z');
    expect(parse('Check oven in 30 min').dueAt).toBe('2026-11-09T10:30:00.000Z');
    expect(parse('Check oven in 30 min').title).toBe('Check oven');
  });

  it('builds the wall time in the given timezone', () => {
    const result = parse('Print tomorrow 5pm', { timeZone: 'Europe/Paris' });
    expect(result.dueAt).toBe('2026-11-10T16:00:00.000Z');
    expect(parse('Print due tomorrow 5pm', { timeZone: 'America/New_York' }).dueAt).toBe('2026-11-10T22:00:00.000Z');
  });

  it('sets a reminder for due with a time, but not for a bare due date', () => {
    expect(parse('File taxes due friday 5pm').remindAt).toBe('2026-11-13T17:00:00.000Z');
    expect(parse('File taxes due friday').remindAt).toBeNull();
  });

  it('keeps plain numbers in the title', () => {
    const result = parse('Buy 3 apples');
    expect(result.title).toBe('Buy 3 apples');
    expect(result.remindAt).toBeNull();
  });

  it('puts the first occurrence of a repeating task at its time', () => {
    const result = parse('Gym every monday at 7am');
    expect(result.recurrenceRrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(result.title).toBe('Gym');
    expect(result.remindAt).toBeTruthy();
  });

  it('shows the time as a chip', () => {
    expect(parse('print documents tomorrow 5pm').tokens.map((token) => token.label)).toContain('17:00');
  });
});

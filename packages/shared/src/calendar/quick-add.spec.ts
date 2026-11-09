import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from './quick-add.js';

const REF = new Date('2026-11-09T10:00:00Z'); // Monday

describe('parseQuickAdd', () => {
  it('parses lunch with day time duration location and weekly recurrence', () => {
    const result = parseQuickAdd('Lunch with Sam fri 1pm for 90m at Café Kitsuné every week', REF);
    expect(result.title.toLowerCase()).toContain('lunch');
    expect(result.start).not.toBeNull();
    expect(result.start!.getUTCDay()).toBe(5);
    expect(result.durationMinutes).toBe(90);
    expect(result.end!.getTime() - result.start!.getTime()).toBe(90 * 60_000);
    expect(result.location).toBe('Café Kitsuné');
    expect(result.rrule).toBe('FREQ=WEEKLY');
  });

  it('parses plain title with no datetime', () => {
    const result = parseQuickAdd('Team sync notes', REF);
    expect(result.title).toBe('Team sync notes');
    expect(result.start).toBeNull();
    expect(result.rrule).toBeNull();
  });

  it('parses tomorrow at 3pm', () => {
    const result = parseQuickAdd('Dentist tomorrow at 3pm', REF);
    expect(result.title.toLowerCase()).toContain('dentist');
    expect(result.start).not.toBeNull();
    expect(result.isAllDay).toBe(false);
  });

  it('parses today 9am for 2h', () => {
    const result = parseQuickAdd('Deep work today 9am for 2h', REF);
    expect(result.durationMinutes).toBe(120);
    expect(result.end!.getTime() - result.start!.getTime()).toBe(120 * 60_000);
  });

  it('parses for 45 minutes', () => {
    const result = parseQuickAdd('Standup mon 10am for 45 minutes', REF);
    expect(result.durationMinutes).toBe(45);
  });

  it('parses for 1 hour', () => {
    const result = parseQuickAdd('Call mom sat 4pm for 1 hour', REF);
    expect(result.durationMinutes).toBe(60);
  });

  it('parses location at office', () => {
    const result = parseQuickAdd('Interview tue 2pm at Office HQ', REF);
    expect(result.location).toBe('Office HQ');
  });

  it('parses every day', () => {
    const result = parseQuickAdd('Meditate every day 7am', REF);
    expect(result.rrule).toBe('FREQ=DAILY');
  });

  it('parses every 2 days', () => {
    const result = parseQuickAdd('Water plants every 2 days 8am', REF);
    expect(result.rrule).toBe('FREQ=DAILY;INTERVAL=2');
  });

  it('parses every week', () => {
    const result = parseQuickAdd('Grocery run every week sat 10am', REF);
    expect(result.rrule).toBe('FREQ=WEEKLY');
  });

  it('parses every 2 weeks', () => {
    const result = parseQuickAdd('Haircut every 2 weeks fri 5pm', REF);
    expect(result.rrule).toBe('FREQ=WEEKLY;INTERVAL=2');
  });

  it('parses every weekday', () => {
    const result = parseQuickAdd('Commute every weekday 8am', REF);
    expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
  });

  it('parses every monday', () => {
    const result = parseQuickAdd('Planning every monday 9am', REF);
    expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
  });

  it('parses every friday', () => {
    const result = parseQuickAdd('Demo every friday 4pm', REF);
    expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=FR');
  });

  it('treats date-only as all-day', () => {
    const result = parseQuickAdd('Holiday next friday', REF);
    expect(result.start).not.toBeNull();
    expect(result.isAllDay).toBe(true);
  });

  it('parses next monday 10:30', () => {
    const result = parseQuickAdd('Kickoff next monday 10:30', REF);
    expect(result.isAllDay).toBe(false);
    expect(result.start).not.toBeNull();
  });

  it('defaults timed end to 60 minutes when no duration', () => {
    const result = parseQuickAdd('Coffee wed 11am', REF);
    expect(result.end!.getTime() - result.start!.getTime()).toBe(60 * 60_000);
  });

  it('keeps location when recurrence follows', () => {
    const result = parseQuickAdd('Yoga thu 6pm at Studio every week', REF);
    expect(result.location).toBe('Studio');
    expect(result.rrule).toBe('FREQ=WEEKLY');
  });

  it('handles empty input', () => {
    const result = parseQuickAdd('   ', REF);
    expect(result.title).toBe('');
    expect(result.start).toBeNull();
  });

  it('strips trailing punctuation from location', () => {
    const result = parseQuickAdd('Dinner fri 8pm at Chez Nous.', REF);
    expect(result.location).toBe('Chez Nous');
  });

  it('parses for 30m shorthand', () => {
    const result = parseQuickAdd('Quick chat today 2pm for 30m', REF);
    expect(result.durationMinutes).toBe(30);
  });

  it('title is residual unparsed text', () => {
    const result = parseQuickAdd('Ship release notes fri 5pm', REF);
    expect(result.title.toLowerCase()).toMatch(/ship|release|notes/);
    expect(result.title.toLowerCase()).not.toContain('fri');
  });
});

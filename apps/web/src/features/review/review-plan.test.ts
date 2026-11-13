import { describe, expect, it } from 'vitest';
import {
  busyMinutesInWindow,
  dayLoad,
  extractReviewText,
  formatMinutes,
  shouldSuggestReview,
  upsertReviewText,
} from './review-plan';

const windowStart = new Date('2026-11-14T09:00:00.000Z');
const windowEnd = new Date('2026-11-14T18:00:00.000Z');

function timed(start: string, end: string, kind = 'event') {
  return { startAt: `2026-11-14T${start}:00.000Z`, endAt: `2026-11-14T${end}:00.000Z`, isAllDay: false, kind };
}

describe('busyMinutesInWindow', () => {
  it('sums events and task blocks inside the window', () => {
    expect(busyMinutesInWindow([timed('10:00', '11:00'), timed('14:00', '14:30', 'time_block')], windowStart, windowEnd)).toBe(90);
  });

  it('merges overlapping items so double booking counts once', () => {
    expect(busyMinutesInWindow([timed('10:00', '12:00'), timed('11:00', '13:00')], windowStart, windowEnd)).toBe(180);
  });

  it('clips items that start before or end after the window', () => {
    expect(busyMinutesInWindow([timed('07:00', '10:00'), timed('17:30', '20:00')], windowStart, windowEnd)).toBe(90);
  });

  it('ignores all-day items and due chips', () => {
    expect(
      busyMinutesInWindow(
        [
          { startAt: null, endAt: null, isAllDay: true, kind: 'event' },
          timed('10:00', '11:00', 'due_chip'),
        ],
        windowStart,
        windowEnd,
      ),
    ).toBe(0);
  });
});

describe('dayLoad', () => {
  it('reads empty, light, balanced, and heavy days', () => {
    expect(dayLoad(0, 540)).toBe('empty');
    expect(dayLoad(2, 540)).toBe('light');
    expect(dayLoad(5, 540)).toBe('balanced');
    expect(dayLoad(10, 540)).toBe('heavy');
  });

  it('is heavy when the calendar leaves less than an hour', () => {
    expect(dayLoad(1, 45)).toBe('heavy');
  });
});

describe('formatMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatMinutes(0)).toBe('0 h');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(150)).toBe('2 h 30 min');
  });
});

describe('review paragraph in the daily note', () => {
  it('appends the reflection after existing content', () => {
    const body = 'Morning thoughts\n\n- [ ] Buy milk';
    const next = upsertReviewText(body, 'Shipped the review page.');
    expect(next).toBe('Morning thoughts\n\n- [ ] Buy milk\n\nDay review: Shipped the review page.');
    expect(extractReviewText(next)).toBe('Shipped the review page.');
  });

  it('replaces an earlier reflection instead of duplicating it', () => {
    const once = upsertReviewText('', 'First pass');
    const twice = upsertReviewText(once, 'Second pass');
    expect(twice).toBe('Day review: Second pass');
  });

  it('removes the paragraph when the reflection is cleared', () => {
    const body = upsertReviewText('Keep me', 'Temporary');
    expect(upsertReviewText(body, '   ')).toBe('Keep me');
  });

  it('keeps checklist task links intact', () => {
    const body = '- [x] Call bank <!--tiza-task:11111111-2222-3333-4444-555555555555-->';
    expect(upsertReviewText(body, 'Done')).toContain('<!--tiza-task:11111111-2222-3333-4444-555555555555-->');
  });
});

describe('shouldSuggestReview', () => {
  it('suggests from 17:00 until the day is closed', () => {
    expect(shouldSuggestReview(new Date(2026, 10, 13, 16, 59), false)).toBe(false);
    expect(shouldSuggestReview(new Date(2026, 10, 13, 17, 0), false)).toBe(true);
    expect(shouldSuggestReview(new Date(2026, 10, 13, 21, 0), true)).toBe(false);
  });
});

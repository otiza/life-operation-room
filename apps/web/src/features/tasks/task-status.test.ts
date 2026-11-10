import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDueAtShort, formatWhenDateShort, taskDateChips } from './task-status';

describe('when vs due date chips', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T12:00:00.000Z'));
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'UTC',
    } as Intl.ResolvedDateTimeFormatOptions);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps when and due labels distinct for today/tomorrow mismatch', () => {
    expect(formatWhenDateShort('2026-11-10', false)).toBe('Today');
    expect(formatDueAtShort('2026-11-11T18:00:00.000Z')).toBe('Tomorrow');

    const chips = taskDateChips({
      whenDate: '2026-11-10',
      whenEvening: false,
      dueAt: '2026-11-11T18:00:00.000Z',
    });
    expect(chips).toEqual([
      { kind: 'when', label: 'Today' },
      { kind: 'due', label: 'Tomorrow' },
    ]);
    expect(chips[0].label).not.toBe(chips[1].label);
  });

  it('labels this evening when whenEvening is set', () => {
    expect(formatWhenDateShort('2026-11-10', true)).toBe('This evening');
  });
});

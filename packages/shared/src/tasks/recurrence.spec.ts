import { describe, expect, it } from 'vitest';
import { describeTaskRecurrence, nextTaskOccurrenceDateKey } from './recurrence.js';

describe('nextTaskOccurrenceDateKey', () => {
  it('steps a daily rule by one day', () => {
    expect(nextTaskOccurrenceDateKey('FREQ=DAILY', '2026-11-09')).toBe('2026-11-10');
  });

  it('steps every morning the same way as every day', () => {
    expect(nextTaskOccurrenceDateKey('FREQ=DAILY;X-WHEN=MORNING', '2026-11-09')).toBe('2026-11-10');
    expect(describeTaskRecurrence('FREQ=DAILY;X-WHEN=MORNING')).toBe('Every morning');
  });

  it('steps a weekday rule from Friday onto Monday', () => {
    expect(nextTaskOccurrenceDateKey('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-11-13')).toBe('2026-11-16');
  });

  it('steps every Monday onto the next Monday', () => {
    expect(nextTaskOccurrenceDateKey('FREQ=WEEKLY;BYDAY=MO', '2026-11-09')).toBe('2026-11-16');
  });

  it('steps every two weeks by fourteen days', () => {
    expect(nextTaskOccurrenceDateKey('FREQ=WEEKLY;INTERVAL=2', '2026-11-09')).toBe('2026-11-23');
  });
});

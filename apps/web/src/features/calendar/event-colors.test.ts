import { describe, expect, it } from 'vitest';
import { eventColorFor } from './event-colors';

describe('eventColorFor', () => {
  it('maps swatch keys to theme tokens', () => {
    expect(eventColorFor({ color: 'event-3' })).toBe('var(--event-3)');
  });

  it('keeps an older stored CSS colour as is', () => {
    expect(eventColorFor({ color: '#3366ff' })).toBe('#3366ff');
  });

  it('defaults to the Calendar tint, and task time to the Tasks tint', () => {
    expect(eventColorFor({ color: null, kind: 'event' })).toBe('var(--app-calendar)');
    expect(eventColorFor({ color: null, kind: 'time_block' })).toBe('var(--app-tasks)');
  });
});

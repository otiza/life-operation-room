import { describe, expect, it } from 'vitest';
import { minuteFromDropPosition } from './drop-time.js';

describe('minuteFromDropPosition', () => {
  it('computes snapped minutes from translated rect top relative to the column', () => {
    expect(
      minuteFromDropPosition({
        translatedTop: 100 + 56,
        columnTop: 100,
        gridStartMinute: 8 * 60,
        hourHeight: 56,
      }),
    ).toBe(8 * 60 + 60);

    expect(
      minuteFromDropPosition({
        translatedTop: 100 + 14,
        columnTop: 100,
        gridStartMinute: 480,
        hourHeight: 56,
      }),
    ).toBe(480 + 15);
  });

  it('clamps negative offsets to the grid start', () => {
    expect(
      minuteFromDropPosition({
        translatedTop: 50,
        columnTop: 100,
        gridStartMinute: 480,
        hourHeight: 56,
      }),
    ).toBe(480);
  });
});

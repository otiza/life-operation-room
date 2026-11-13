import { describe, expect, it } from 'vitest';
import { greetingFor, pointOnArc, sunArcPosition } from './sun-arc';

const at = (hours: number, minutes = 0) => new Date(2026, 10, 13, hours, minutes);

describe('sunArcPosition', () => {
  it('sits at the start before the window opens', () => {
    expect(sunArcPosition(at(7, 30))).toEqual({ fraction: 0, phase: 'before' });
  });

  it('moves through the 09:00 to 18:00 window', () => {
    expect(sunArcPosition(at(9))).toEqual({ fraction: 0, phase: 'during' });
    expect(sunArcPosition(at(13, 30))).toEqual({ fraction: 0.5, phase: 'during' });
    expect(sunArcPosition(at(10, 35)).fraction).toBeCloseTo(95 / 540);
  });

  it('sits at the end once the window has closed', () => {
    expect(sunArcPosition(at(18))).toEqual({ fraction: 1, phase: 'after' });
    expect(sunArcPosition(at(22, 15))).toEqual({ fraction: 1, phase: 'after' });
  });
});

describe('pointOnArc', () => {
  it('runs from the left end over the top to the right end', () => {
    const start = pointOnArc(0, 100, 90, 80);
    const top = pointOnArc(0.5, 100, 90, 80);
    const end = pointOnArc(1, 100, 90, 80);
    expect(start.x).toBeCloseTo(20);
    expect(start.y).toBeCloseTo(90);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(10);
    expect(end.x).toBeCloseTo(180);
    expect(end.y).toBeCloseTo(90);
  });
});

describe('greetingFor', () => {
  it('follows the time of day', () => {
    expect(greetingFor(at(8))).toBe('Good morning');
    expect(greetingFor(at(14))).toBe('Good afternoon');
    expect(greetingFor(at(20))).toBe('Good evening');
    expect(greetingFor(at(2))).toBe('Good evening');
  });
});

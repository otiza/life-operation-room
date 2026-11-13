import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { getDayBoundsForDateKey, zonedWallTimeToUtc } from './timezone.js';

function wallInZone(isoUtc: string, zone: string) {
  return DateTime.fromISO(isoUtc, { zone: 'utc' }).setZone(zone);
}

describe('zonedWallTimeToUtc', () => {
  it('converts 01:30 Europe/Paris on 2026-03-29 (before spring gap)', () => {
    const utc = zonedWallTimeToUtc(2026, 3, 29, 1, 30, 0, 0, 'Europe/Paris');
    expect(utc.toISOString()).toBe('2026-03-29T00:30:00.000Z');
    const local = wallInZone(utc.toISOString(), 'Europe/Paris');
    expect(local.hour).toBe(1);
    expect(local.minute).toBe(30);
  });

  it('shifts nonexistent 02:30 Europe/Paris on 2026-03-29 forward past the gap', () => {
    const utc = zonedWallTimeToUtc(2026, 3, 29, 2, 30, 0, 0, 'Europe/Paris');
    const local = wallInZone(utc.toISOString(), 'Europe/Paris');
    expect(local.hour).toBe(3);
    expect(local.minute).toBe(30);
  });

  it('converts 01:30 Europe/Paris on 2026-10-25', () => {
    const utc = zonedWallTimeToUtc(2026, 10, 25, 1, 30, 0, 0, 'Europe/Paris');
    expect(utc.toISOString()).toBe('2026-10-24T23:30:00.000Z');
    const local = wallInZone(utc.toISOString(), 'Europe/Paris');
    expect(local.hour).toBe(1);
    expect(local.minute).toBe(30);
  });

  it('uses the first occurrence for ambiguous 02:30 Europe/Paris on 2026-10-25', () => {
    const utc = zonedWallTimeToUtc(2026, 10, 25, 2, 30, 0, 0, 'Europe/Paris');
    // First (DST) occurrence is UTC+2 → 00:30Z
    expect(utc.toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('converts 03:00 America/New_York on 2026-11-01', () => {
    const utc = zonedWallTimeToUtc(2026, 11, 1, 3, 0, 0, 0, 'America/New_York');
    const local = wallInZone(utc.toISOString(), 'America/New_York');
    expect(local.hour).toBe(3);
    expect(local.minute).toBe(0);
    expect(utc.toISOString()).toBe('2026-11-01T08:00:00.000Z');
  });

  it('converts 01:00 Pacific/Auckland on 2026-04-05', () => {
    const utc = zonedWallTimeToUtc(2026, 4, 5, 1, 0, 0, 0, 'Pacific/Auckland');
    const local = wallInZone(utc.toISOString(), 'Pacific/Auckland');
    expect(local.hour).toBe(1);
    expect(utc.toISOString()).toBe('2026-04-04T12:00:00.000Z');
  });

  it('converts 01:00 Pacific/Auckland on 2026-09-27', () => {
    const utc = zonedWallTimeToUtc(2026, 9, 27, 1, 0, 0, 0, 'Pacific/Auckland');
    const local = wallInZone(utc.toISOString(), 'Pacific/Auckland');
    expect(local.hour).toBe(1);
    expect(utc.toISOString()).toBe('2026-09-26T13:00:00.000Z');
  });
});

describe('getDayBoundsForDateKey', () => {
  it('returns local midnight to midnight for a plain day', () => {
    const bounds = getDayBoundsForDateKey('2026-11-13', 'Europe/Paris');
    expect(bounds.startOfToday.toISOString()).toBe('2026-11-12T23:00:00.000Z');
    expect(bounds.startOfTomorrow.toISOString()).toBe('2026-11-13T23:00:00.000Z');
  });

  it('spans 25 hours on the autumn DST change', () => {
    const bounds = getDayBoundsForDateKey('2026-10-25', 'Europe/Paris');
    expect(bounds.startOfToday.toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(bounds.startOfTomorrow.toISOString()).toBe('2026-10-25T23:00:00.000Z');
  });

  it('rejects a non-date key', () => {
    expect(() => getDayBoundsForDateKey('tomorrow', 'UTC')).toThrow();
  });
});

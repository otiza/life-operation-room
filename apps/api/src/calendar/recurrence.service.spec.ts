import { describe, expect, it } from 'vitest';
import { zonedWallTimeToUtc } from '@erp-tiza/shared';
import type { CalendarEvent, CalendarEventException } from '../db/schema.js';
import { RecurrenceService } from './recurrence.service.js';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    workspaceId: '22222222-2222-2222-2222-222222222222',
    title: 'Standup',
    description: null,
    location: null,
    startAt: zonedWallTimeToUtc(2026, 3, 2, 9, 0, 0, 0, 'Europe/Paris'),
    endAt: zonedWallTimeToUtc(2026, 3, 2, 9, 30, 0, 0, 'Europe/Paris'),
    startDate: null,
    endDate: null,
    isAllDay: false,
    timezone: 'Europe/Paris',
    rrule: 'FREQ=WEEKLY;BYDAY=MO',
    kind: 'event',
    color: null,
    createdByUserId: '33333333-3333-3333-3333-333333333333',
    source: 'local',
    externalId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RecurrenceService', () => {
  const service = new RecurrenceService();

  it('keeps weekly 09:00 Europe/Paris across spring DST', () => {
    const event = makeEvent();
    const from = new Date('2026-03-20T00:00:00Z');
    const to = new Date('2026-04-06T00:00:00Z');
    const occurrences = service.expandEvent(event, [], from, to);
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    for (const occurrence of occurrences) {
      const parisHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(occurrence.startAt!);
      expect(parisHour).toBe('09');
    }
  });

  it('keeps weekly 09:00 Europe/Paris across autumn DST', () => {
    const event = makeEvent({
      startAt: zonedWallTimeToUtc(2026, 10, 5, 9, 0, 0, 0, 'Europe/Paris'),
      endAt: zonedWallTimeToUtc(2026, 10, 5, 9, 30, 0, 0, 'Europe/Paris'),
    });
    const from = new Date('2026-10-20T00:00:00Z');
    const to = new Date('2026-11-03T00:00:00Z');
    const occurrences = service.expandEvent(event, [], from, to);
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    for (const occurrence of occurrences) {
      const parisHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(occurrence.startAt!);
      expect(parisHour).toBe('09');
    }
  });

  it('applies cancelled exception for this occurrence', () => {
    const event = makeEvent();
    const target = zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris');
    const exceptions: CalendarEventException[] = [
      {
        id: '44444444-4444-4444-4444-444444444444',
        eventId: event.id,
        workspaceId: event.workspaceId,
        originalOccurrenceStart: target,
        cancelled: true,
        title: null,
        description: null,
        location: null,
        startAt: null,
        endAt: null,
        startDate: null,
        endDate: null,
        isAllDay: null,
        timezone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const from = new Date('2026-03-20T00:00:00Z');
    const to = new Date('2026-03-30T00:00:00Z');
    const occurrences = service.expandEvent(event, exceptions, from, to);
    expect(occurrences.some((item) => item.occurrenceStart.toISOString() === target.toISOString())).toBe(
      false,
    );
  });

  it('applies override exception for this occurrence', () => {
    const event = makeEvent();
    const target = zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris');
    const movedStart = zonedWallTimeToUtc(2026, 3, 23, 11, 0, 0, 0, 'Europe/Paris');
    const movedEnd = zonedWallTimeToUtc(2026, 3, 23, 11, 30, 0, 0, 'Europe/Paris');
    const exceptions: CalendarEventException[] = [
      {
        id: '55555555-5555-5555-5555-555555555555',
        eventId: event.id,
        workspaceId: event.workspaceId,
        originalOccurrenceStart: target,
        cancelled: false,
        title: 'Moved standup',
        description: null,
        location: null,
        startAt: movedStart,
        endAt: movedEnd,
        startDate: null,
        endDate: null,
        isAllDay: false,
        timezone: 'Europe/Paris',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const from = new Date('2026-03-20T00:00:00Z');
    const to = new Date('2026-03-30T00:00:00Z');
    const occurrences = service.expandEvent(event, exceptions, from, to);
    const overridden = occurrences.find((item) => item.title === 'Moved standup');
    expect(overridden).toBeTruthy();
    expect(overridden!.startAt!.toISOString()).toBe(movedStart.toISOString());
  });

  it('does not shift all-day events across timezones', () => {
    const event = makeEvent({
      title: 'Holiday',
      isAllDay: true,
      startAt: null,
      endAt: null,
      startDate: '2026-07-04',
      endDate: '2026-07-05',
      rrule: null,
      timezone: 'America/Los_Angeles',
    });
    const from = new Date('2026-07-01T00:00:00Z');
    const to = new Date('2026-07-10T00:00:00Z');
    const occurrences = service.expandEvent(event, [], from, to);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].startDate).toBe('2026-07-04');
    expect(occurrences[0].endDate).toBe('2026-07-05');
  });

  it('stores UNTIL as a true UTC instant for following edits', () => {
    const occurrence = zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris');
    const until = service.untilBeforeOccurrence('FREQ=WEEKLY;BYDAY=MO;COUNT=10', occurrence, 'Europe/Paris', false);
    expect(until).toContain('FREQ=WEEKLY');
    expect(until).toMatch(/UNTIL=\d{8}T\d{6}Z/);
    expect(until).not.toContain('COUNT=');
    const untilDate = service.parseUntilUtc(until)!;
    expect(untilDate.getTime()).toBe(occurrence.getTime() - 1000);
  });

  it('computes remaining COUNT for a following split', () => {
    const seriesStart = zonedWallTimeToUtc(2026, 3, 2, 9, 0, 0, 0, 'Europe/Paris');
    const occurrence = zonedWallTimeToUtc(2026, 3, 16, 9, 0, 0, 0, 'Europe/Paris');
    const remaining = service.remainingCountAfterSplit(
      'FREQ=WEEKLY;BYDAY=MO;COUNT=5',
      seriesStart,
      occurrence,
      'Europe/Paris',
      false,
    );
    expect(remaining).toBe(3);
    expect(service.withCount('FREQ=WEEKLY;BYDAY=MO', remaining!)).toBe('FREQ=WEEKLY;BYDAY=MO;COUNT=3');
  });

  it('stops expansion after a UTC UNTIL while keeping floating wall times', () => {
    const event = makeEvent({
      startAt: zonedWallTimeToUtc(2026, 3, 2, 9, 0, 0, 0, 'Europe/Paris'),
      endAt: zonedWallTimeToUtc(2026, 3, 2, 9, 30, 0, 0, 'Europe/Paris'),
      rrule: service.untilBeforeOccurrence(
        'FREQ=WEEKLY;BYDAY=MO',
        zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris'),
        'Europe/Paris',
        false,
      ),
    });
    const occurrences = service.expandEvent(
      event,
      [],
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-04-01T00:00:00Z'),
    );
    expect(occurrences).toHaveLength(3);
    expect(
      occurrences.every((item) => item.startAt!.getTime() < zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris').getTime()),
    ).toBe(true);
  });

  it('keeps daily 01:30 Europe/Paris across spring and autumn DST', () => {
    const event = makeEvent({
      title: 'Nightly',
      startAt: zonedWallTimeToUtc(2026, 3, 28, 1, 30, 0, 0, 'Europe/Paris'),
      endAt: zonedWallTimeToUtc(2026, 3, 28, 2, 0, 0, 0, 'Europe/Paris'),
      rrule: 'FREQ=DAILY',
      timezone: 'Europe/Paris',
    });
    const spring = service.expandEvent(event, [], new Date('2026-03-28T00:00:00Z'), new Date('2026-03-31T00:00:00Z'));
    const autumn = service.expandEvent(event, [], new Date('2026-10-24T00:00:00Z'), new Date('2026-10-27T00:00:00Z'));
    for (const occurrence of [...spring, ...autumn]) {
      const hour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(occurrence.startAt!);
      expect(hour).toBe('01:30');
    }
    expect(spring.some((item) => item.startAt!.toISOString().startsWith('2026-03-29'))).toBe(true);
    expect(autumn.some((item) => item.startAt!.toISOString().startsWith('2026-10-25') || item.startAt!.toISOString().startsWith('2026-10-24'))).toBe(true);
  });

  it('keeps daily 03:00 America/New_York across 2026-11-01', () => {
    const event = makeEvent({
      title: 'US nightly',
      startAt: zonedWallTimeToUtc(2026, 10, 31, 3, 0, 0, 0, 'America/New_York'),
      endAt: zonedWallTimeToUtc(2026, 10, 31, 3, 30, 0, 0, 'America/New_York'),
      rrule: 'FREQ=DAILY',
      timezone: 'America/New_York',
    });
    const occurrences = service.expandEvent(
      event,
      [],
      new Date('2026-10-31T00:00:00Z'),
      new Date('2026-11-03T00:00:00Z'),
    );
    for (const occurrence of occurrences) {
      const hour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(occurrence.startAt!);
      expect(hour).toBe('03:00');
    }
    expect(occurrences.some((item) => {
      const local = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(item.startAt!);
      return local === '2026-11-01';
    })).toBe(true);
  });

  it('keeps daily 01:00 Pacific/Auckland across April and September transitions', () => {
    const event = makeEvent({
      title: 'NZ nightly',
      startAt: zonedWallTimeToUtc(2026, 4, 4, 1, 0, 0, 0, 'Pacific/Auckland'),
      endAt: zonedWallTimeToUtc(2026, 4, 4, 1, 30, 0, 0, 'Pacific/Auckland'),
      rrule: 'FREQ=DAILY',
      timezone: 'Pacific/Auckland',
    });
    const april = service.expandEvent(event, [], new Date('2026-04-03T00:00:00Z'), new Date('2026-04-07T00:00:00Z'));
    const septemberEvent = makeEvent({
      title: 'NZ nightly',
      startAt: zonedWallTimeToUtc(2026, 9, 26, 1, 0, 0, 0, 'Pacific/Auckland'),
      endAt: zonedWallTimeToUtc(2026, 9, 26, 1, 30, 0, 0, 'Pacific/Auckland'),
      rrule: 'FREQ=DAILY',
      timezone: 'Pacific/Auckland',
    });
    const september = service.expandEvent(
      septemberEvent,
      [],
      new Date('2026-09-25T00:00:00Z'),
      new Date('2026-09-29T00:00:00Z'),
    );
    for (const occurrence of [...april, ...september]) {
      const hour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Pacific/Auckland',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(occurrence.startAt!);
      expect(hour).toBe('01:00');
    }
    expect(april.some((item) => {
      const local = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(item.startAt!);
      return local === '2026-04-05';
    })).toBe(true);
    expect(september.some((item) => {
      const local = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(item.startAt!);
      return local === '2026-09-27';
    })).toBe(true);
  });
});

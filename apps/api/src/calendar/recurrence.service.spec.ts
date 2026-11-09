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

  it('builds UNTIL before occurrence for following edits', () => {
    const occurrence = zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris');
    const until = service.untilBeforeOccurrence('FREQ=WEEKLY;BYDAY=MO', occurrence, 'Europe/Paris', false);
    expect(until).toContain('FREQ=WEEKLY');
    expect(until).toContain('UNTIL=');
    expect(until).not.toContain('COUNT=');
  });
});

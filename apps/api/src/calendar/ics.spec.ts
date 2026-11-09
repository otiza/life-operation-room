import { describe, expect, it } from 'vitest';
import ical from 'node-ical';
import { zonedWallTimeToUtc } from '@erp-tiza/shared';
import type { CalendarEvent, CalendarEventException } from '../db/schema.js';
import { serializeIcsCalendar } from './ics.js';
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

describe('serializeIcsCalendar', () => {
  it('emits TZID local times, VTIMEZONE, and parses with node-ical for a DST weekly event', () => {
    const ics = serializeIcsCalendar([{ event: makeEvent(), exceptions: [] }], 'Tiza Calendar');
    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(ics).toContain('TZID:Europe/Paris');
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20260302T090000');
    expect(ics).toContain('DTEND;TZID=Europe/Paris:20260302T093000');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');

    const parsed = ical.sync.parseICS(ics);
    const vevents = Object.values(parsed).filter((item) => item?.type === 'VEVENT');
    expect(vevents.length).toBeGreaterThanOrEqual(1);
    expect((vevents[0] as { summary?: string }).summary).toBe('Standup');
  });

  it('emits EXDATE in the event TZID and modified exceptions as RECURRENCE-ID VEVENTs', () => {
    const event = makeEvent();
    const cancelledAt = zonedWallTimeToUtc(2026, 3, 16, 9, 0, 0, 0, 'Europe/Paris');
    const overriddenAt = zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris');
    const exceptions: CalendarEventException[] = [
      {
        id: '44444444-4444-4444-4444-444444444444',
        eventId: event.id,
        workspaceId: event.workspaceId,
        originalOccurrenceStart: cancelledAt,
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
      {
        id: '55555555-5555-5555-5555-555555555555',
        eventId: event.id,
        workspaceId: event.workspaceId,
        originalOccurrenceStart: overriddenAt,
        cancelled: false,
        title: 'Moved standup',
        description: null,
        location: null,
        startAt: zonedWallTimeToUtc(2026, 3, 23, 11, 0, 0, 0, 'Europe/Paris'),
        endAt: zonedWallTimeToUtc(2026, 3, 23, 11, 30, 0, 0, 'Europe/Paris'),
        startDate: null,
        endDate: null,
        isAllDay: false,
        timezone: 'Europe/Paris',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const ics = serializeIcsCalendar([{ event, exceptions }], 'Tiza Calendar');
    expect(ics).toContain('EXDATE;TZID=Europe/Paris:20260316T090000');
    expect(ics).toContain('RECURRENCE-ID;TZID=Europe/Paris:20260323T090000');
    expect(ics).toContain('SUMMARY:Moved standup');

    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    const parsed = ical.sync.parseICS(ics);
    const vevents = Object.values(parsed).filter((item) => item?.type === 'VEVENT');
    // Same UID + RECURRENCE-ID is folded by many parsers; content must still parse.
    expect(vevents.length).toBeGreaterThanOrEqual(1);
  });

  it('emits all-day EXDATE as VALUE=DATE and validates a this-and-following UNTIL split', () => {
    const recurrence = new RecurrenceService();
    const splitAt = zonedWallTimeToUtc(2026, 3, 23, 9, 0, 0, 0, 'Europe/Paris');
    const original = makeEvent({
      rrule: recurrence.untilBeforeOccurrence('FREQ=WEEKLY;BYDAY=MO', splitAt, 'Europe/Paris', false),
    });
    const following = makeEvent({
      id: '66666666-6666-6666-6666-666666666666',
      startAt: splitAt,
      endAt: zonedWallTimeToUtc(2026, 3, 23, 9, 30, 0, 0, 'Europe/Paris'),
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      title: 'Standup continued',
    });
    const ics = serializeIcsCalendar(
      [
        { event: original, exceptions: [] },
        { event: following, exceptions: [] },
      ],
      'Tiza Calendar',
    );
    expect(ics).toMatch(/UNTIL=\d{8}T\d{6}Z/);
    const parsed = ical.sync.parseICS(ics);
    const vevents = Object.values(parsed).filter((item) => item?.type === 'VEVENT');
    expect(vevents).toHaveLength(2);

    const allDay = makeEvent({
      isAllDay: true,
      startAt: null,
      endAt: null,
      startDate: '2026-07-04',
      endDate: '2026-07-05',
      rrule: 'FREQ=YEARLY',
      timezone: 'UTC',
    });
    const allDayIcs = serializeIcsCalendar(
      [
        {
          event: allDay,
          exceptions: [
            {
              id: '77777777-7777-7777-7777-777777777777',
              eventId: allDay.id,
              workspaceId: allDay.workspaceId,
              originalOccurrenceStart: new Date('2027-07-04T00:00:00.000Z'),
              cancelled: true,
              title: null,
              description: null,
              location: null,
              startAt: null,
              endAt: null,
              startDate: null,
              endDate: null,
              isAllDay: true,
              timezone: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
      'Tiza Calendar',
    );
    expect(allDayIcs).toContain('EXDATE;VALUE=DATE:20270704');
    expect(allDayIcs).toContain('DTSTART;VALUE=DATE:20260704');
  });
});

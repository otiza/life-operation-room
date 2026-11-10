import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarSeriesService } from './calendar-series.service.js';
import { CalendarService } from './calendar.service.js';
import { RecurrenceService } from './recurrence.service.js';

function buildCalendarService(deps: {
  db: unknown;
  appsService?: unknown;
  linksService?: unknown;
  taskReferencesService?: unknown;
}) {
  const recurrence = new RecurrenceService();
  const series = new CalendarSeriesService(deps.db as never, recurrence);
  const linksService =
    deps.linksService ?? { create: vi.fn(), listBySource: vi.fn(), listByTarget: vi.fn() };
  const taskReferencesService =
    deps.taskReferencesService ?? {
      assertTaskInWorkspace: vi.fn(),
      findTaskInWorkspace: vi.fn(),
      listDueInRange: vi.fn(),
      setWhenDate: vi.fn(),
    };
  const appsService = deps.appsService ?? { assertInstalled: vi.fn(), updateConfig: vi.fn() };
  return new CalendarService(
    deps.db as never,
    appsService as never,
    linksService as never,
    taskReferencesService as never,
    recurrence,
    series,
  );
}

describe('CalendarService time blocks', () => {
  let service: CalendarService;
  let taskReferencesService: {
    assertTaskInWorkspace: ReturnType<typeof vi.fn>;
    findTaskInWorkspace: ReturnType<typeof vi.fn>;
    listDueInRange: ReturnType<typeof vi.fn>;
    setWhenDate: ReturnType<typeof vi.fn>;
  };
  let linksService: { create: ReturnType<typeof vi.fn>; listBySource: ReturnType<typeof vi.fn>; listByTarget: ReturnType<typeof vi.fn> };
  let appsService: { assertInstalled: ReturnType<typeof vi.fn>; updateConfig: ReturnType<typeof vi.fn> };
  let db: { insert: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    taskReferencesService = {
      assertTaskInWorkspace: vi.fn(),
      findTaskInWorkspace: vi.fn(),
      listDueInRange: vi.fn(),
      setWhenDate: vi.fn(async () => undefined),
    };
    linksService = {
      create: vi.fn(async () => ({ id: 'link' })),
      listBySource: vi.fn(async () => []),
      listByTarget: vi.fn(async () => []),
    };
    appsService = {
      assertInstalled: vi.fn(async () => ({ config: {} })),
      updateConfig: vi.fn(),
    };
    const insertReturning = vi.fn(async () => [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        workspaceId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        title: 'Write docs',
        description: null,
        location: null,
        isAllDay: false,
        startAt: new Date('2026-11-10T10:00:00Z'),
        endAt: new Date('2026-11-10T11:00:00Z'),
        startDate: null,
        endDate: null,
        timezone: 'UTC',
        rrule: null,
        kind: 'time_block',
        color: null,
        createdByUserId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        source: 'local',
        externalId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    db = {
      insert: vi.fn(() => ({ values: () => ({ returning: insertReturning }) })),
      select: vi.fn(),
      update: vi.fn(),
    };
    service = buildCalendarService({ db, appsService, linksService, taskReferencesService });
  });

  it('rejects creating a time block for a task outside the workspace', async () => {
    taskReferencesService.assertTaskInWorkspace.mockRejectedValue(
      new NotFoundException('Task not found in workspace'),
    );
    await expect(
      service.createTimeBlock(
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } as never,
        {
          taskId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          start: '2026-11-10T10:00:00.000Z',
          end: '2026-11-10T11:00:00.000Z',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(linksService.create).not.toHaveBeenCalled();
  });

  it('creates a time block and cross-app link for an in-workspace task', async () => {
    taskReferencesService.assertTaskInWorkspace.mockResolvedValue({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      title: 'Write docs',
      status: 'todo',
      projectId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      dueAt: null,
    });
    const event = await service.createTimeBlock(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } as never,
      {
        taskId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        start: '2026-11-10T10:00:00.000Z',
        end: '2026-11-10T11:00:00.000Z',
      },
    );
    expect(event.kind).toBe('time_block');
    expect(event.title).toBe('Write docs');
    expect(linksService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceApp: 'calendar',
        targetApp: 'tasks',
        targetRef: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        linkType: 'time_block',
      }),
    );
    expect(taskReferencesService.setWhenDate).toHaveBeenCalledWith(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      '2026-11-10',
    );
  });
});

describe('CalendarService recurrence mutations', () => {
  const workspaceId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const userId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const eventId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const newEventId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  function masterEvent(overrides: Record<string, unknown> = {}) {
    return {
      id: eventId,
      workspaceId,
      title: 'Standup',
      description: null,
      location: null,
      isAllDay: false,
      startAt: new Date('2026-03-02T08:00:00.000Z'),
      endAt: new Date('2026-03-02T08:30:00.000Z'),
      startDate: null,
      endDate: null,
      timezone: 'Europe/Paris',
      rrule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=5',
      kind: 'event',
      color: null,
      createdByUserId: userId,
      source: 'local',
      externalId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it('splits following in one transaction, converts COUNT, and moves later exceptions', async () => {
    const occurrenceStart = new Date('2026-03-16T08:00:00.000Z');
    const movedException = {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      eventId,
      workspaceId,
      originalOccurrenceStart: new Date('2026-03-23T08:00:00.000Z'),
      cancelled: false,
    };
    const updates: Array<Record<string, unknown>> = [];
    const tx = {
      update: vi.fn((table: { name?: string } | unknown) => {
        void table;
        const builder = {
          set: vi.fn((values: Record<string, unknown>) => {
            updates.push(values);
            return builder;
          }),
          where: vi.fn(async () => undefined),
          returning: vi.fn(async () => [masterEvent({ id: newEventId, rrule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=3' })]),
        };
        return builder;
      }),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [
            masterEvent({
              id: newEventId,
              startAt: occurrenceStart,
              rrule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=3',
            }),
          ]),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => [movedException]),
        })),
      })),
    };
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => [masterEvent()]),
        })),
      })),
      transaction: vi.fn(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx)),
      insert: vi.fn(),
      update: vi.fn(),
    };
    const service = buildCalendarService({ db });

    const result = await service.update(workspaceId, eventId, { id: userId } as never, {
      scope: 'following',
      occurrenceStart: occurrenceStart.toISOString(),
      title: 'Standup continued',
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(newEventId);
    expect(result.rrule).toContain('COUNT=3');
    expect(updates.some((item) => typeof item.rrule === 'string' && String(item.rrule).includes('UNTIL='))).toBe(
      true,
    );
    expect(updates.some((item) => item.eventId === newEventId)).toBe(true);
  });

  it('shifts exception keys by the start delta on an all edit', async () => {
    const oldStart = new Date('2026-03-02T08:00:00.000Z');
    const newStart = new Date('2026-03-02T09:00:00.000Z');
    const exception = {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      eventId,
      workspaceId,
      originalOccurrenceStart: new Date('2026-03-09T08:00:00.000Z'),
      startAt: new Date('2026-03-09T08:00:00.000Z'),
      endAt: new Date('2026-03-09T08:30:00.000Z'),
      cancelled: false,
    };
    const exceptionUpdates: Array<Record<string, unknown>> = [];
    const tx = {
      update: vi.fn(() => {
        const builder = {
          set: vi.fn((values: Record<string, unknown>) => {
            exceptionUpdates.push(values);
            return builder;
          }),
          where: vi.fn(() => builder),
          returning: vi.fn(async () => [
            masterEvent({ startAt: newStart, endAt: new Date('2026-03-02T09:30:00.000Z') }),
          ]),
        };
        return builder;
      }),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => [exception]),
        })),
      })),
      insert: vi.fn(),
    };
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => [masterEvent({ startAt: oldStart })]),
        })),
      })),
      transaction: vi.fn(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx)),
      insert: vi.fn(),
      update: vi.fn(),
    };
    const service = buildCalendarService({ db });

    await service.update(workspaceId, eventId, { id: userId } as never, {
      scope: 'all',
      startAt: newStart.toISOString(),
      endAt: new Date('2026-03-02T09:30:00.000Z').toISOString(),
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    const shifted = exceptionUpdates.find((item) => item.originalOccurrenceStart instanceof Date);
    expect(shifted).toBeTruthy();
    expect((shifted!.originalOccurrenceStart as Date).toISOString()).toBe('2026-03-09T09:00:00.000Z');
  });
});

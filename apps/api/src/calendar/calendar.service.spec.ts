import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from './calendar.service.js';
import { RecurrenceService } from './recurrence.service.js';

describe('CalendarService time blocks', () => {
  let service: CalendarService;
  let taskReferencesService: {
    assertTaskInWorkspace: ReturnType<typeof vi.fn>;
    findTaskInWorkspace: ReturnType<typeof vi.fn>;
    listDueInRange: ReturnType<typeof vi.fn>;
  };
  let linksService: { create: ReturnType<typeof vi.fn>; listBySource: ReturnType<typeof vi.fn>; listByTarget: ReturnType<typeof vi.fn> };
  let appsService: { assertInstalled: ReturnType<typeof vi.fn>; updateConfig: ReturnType<typeof vi.fn> };
  let db: { insert: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    taskReferencesService = {
      assertTaskInWorkspace: vi.fn(),
      findTaskInWorkspace: vi.fn(),
      listDueInRange: vi.fn(),
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
    service = new CalendarService(
      db as never,
      appsService as never,
      linksService as never,
      taskReferencesService as never,
      new RecurrenceService(),
    );
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
  });
});

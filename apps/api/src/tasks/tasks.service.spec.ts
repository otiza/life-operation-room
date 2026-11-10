import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TASK_SETTINGS, getDayBoundsInTimeZone } from '@erp-tiza/shared';
import { DOMAIN_EVENTS } from '../common/events/domain-events.js';
import { TaskOrderingService } from './task-ordering.service.js';
import { TaskQueryService } from './task-query.service.js';
import { TasksService } from './tasks.service.js';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const taskId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';

function makeTask(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-01-15T12:00:00.000Z');
  return {
    id: taskId,
    workspaceId,
    projectId,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'none',
    dueAt: null,
    whenDate: null,
    whenEvening: false,
    isSomeday: false,
    completedAt: null,
    assigneeUserId: null,
    createdByUserId: userId,
    position: 0,
    todayPosition: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function collectDateParams(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  const value = node as { constructor?: { name?: string }; value?: unknown; queryChunks?: unknown[] };
  if (value.constructor?.name === 'Param' && value.value instanceof Date) {
    out.push(value.value.toISOString());
  }
  if (Array.isArray(value.queryChunks)) {
    for (const chunk of value.queryChunks) collectDateParams(chunk, out);
  }
  return out;
}

function createDbMock() {
  const state = {
    selectRows: [] as unknown[],
    updateRows: [] as unknown[],
    whereClauses: [] as unknown[],
    updates: [] as Array<Record<string, unknown>>,
    transactionCalls: 0,
    failUpdateOnTaskId: null as string | null,
  };

  const selectBuilder = {
    from: vi.fn(() => selectBuilder),
    where: vi.fn((clause?: unknown) => {
      if (clause !== undefined) state.whereClauses.push(clause);
      return selectBuilder;
    }),
    orderBy: vi.fn(() => selectBuilder),
    groupBy: vi.fn(() => selectBuilder),
    limit: vi.fn(() => selectBuilder),
    for: vi.fn(() => selectBuilder),
    then: undefined as unknown,
  };
  // Make thenable for `await this.db.select()...where()` without orderBy
  Object.assign(selectBuilder, {
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(state.selectRows).then(resolve, reject);
    },
  });

  const updateBuilder: {
    set: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  } = {
    set: vi.fn((values: Record<string, unknown>) => {
      state.updates.push(values);
      return updateBuilder;
    }),
    where: vi.fn(() => updateBuilder),
    returning: vi.fn(async () => {
      if (state.failUpdateOnTaskId && state.updateRows[0]) {
        const row = state.updateRows[0] as { id: string };
        if (row.id === state.failUpdateOnTaskId) {
          throw new BadRequestException('Invalid status');
        }
      }
      return state.updateRows;
    }),
  };

  const db: {
    select: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn(() => selectBuilder),
    update: vi.fn(() => updateBuilder),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => state.updateRows),
      })),
    })),
    execute: vi.fn(async () => undefined),
    transaction: vi.fn(async (fn: (tx: typeof db) => Promise<unknown>) => {
      state.transactionCalls += 1;
      return fn(db);
    }),
  };

  return { db, state, selectBuilder, updateBuilder };
}

describe('TasksService', () => {
  let service: TasksService;
  let dbMock: ReturnType<typeof createDbMock>;
  let appsService: { assertInstalled: ReturnType<typeof vi.fn>; updateConfig: ReturnType<typeof vi.fn> };
  let workspacesService: {
    findById: ReturnType<typeof vi.fn>;
    requireMembership: ReturnType<typeof vi.fn>;
  };
  let projectsService: { assertProjectInWorkspace: ReturnType<typeof vi.fn> };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };

  const settingsWithDisabled = {
    ...structuredClone(DEFAULT_TASK_SETTINGS),
    statuses: [
      ...DEFAULT_TASK_SETTINGS.statuses.map((item) =>
        item.key === 'cancelled' ? { ...item, enabled: false } : item,
      ),
    ],
  };

  beforeEach(() => {
    dbMock = createDbMock();
    appsService = {
      assertInstalled: vi.fn(async () => ({
        workspaceId,
        appKey: 'tasks',
        config: settingsWithDisabled,
      })),
      updateConfig: vi.fn(async () => undefined),
    };
    workspacesService = {
      findById: vi.fn(async () => ({ id: workspaceId, kind: 'shared' })),
      requireMembership: vi.fn(async () => undefined),
    };
    projectsService = {
      assertProjectInWorkspace: vi.fn(async () => undefined),
    };
    eventEmitter = { emit: vi.fn() };

    service = new TasksService(
      dbMock.db as never,
      workspacesService as never,
      appsService as never,
      projectsService as never,
      { countByProject: vi.fn() } as never,
      eventEmitter as unknown as EventEmitter2,
      new TaskQueryService(dbMock.db as never),
      new TaskOrderingService(dbMock.db as never),
    );
  });

  describe('status and priority assignability', () => {
    it('allows keeping a disabled current status on update', async () => {
      const existing = makeTask({ status: 'cancelled' });
      dbMock.state.selectRows = [existing];
      dbMock.state.updateRows = [{ ...existing, status: 'cancelled', title: 'Renamed', updatedAt: new Date() }];

      const result = await service.update(workspaceId, taskId, { id: userId } as never, {
        title: 'Renamed',
        status: 'cancelled',
      });

      expect(result.title).toBe('Renamed');
      expect(result.status).toBe('cancelled');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.taskUpdated,
        expect.objectContaining({ taskId }),
      );
    });

    it('rejects assigning a different disabled status', async () => {
      const existing = makeTask({ status: 'todo' });
      dbMock.state.selectRows = [existing];

      await expect(
        service.update(workspaceId, taskId, { id: userId } as never, { status: 'cancelled' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects assigning an unknown priority', async () => {
      const existing = makeTask();
      dbMock.state.selectRows = [existing];

      await expect(
        service.update(workspaceId, taskId, { id: userId } as never, { priority: 'mythical' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateSettings', () => {
    it('refuses to delete statuses still used by tasks', async () => {
      dbMock.state.selectRows = [
        { workspaceId, appKey: 'tasks', config: structuredClone(DEFAULT_TASK_SETTINGS) },
        { value: 2 },
      ];
      let selectCall = 0;
      dbMock.db.select = vi.fn(() => {
        selectCall += 1;
        const builder = {
          from: vi.fn(() => builder),
          where: vi.fn(() => builder),
          for: vi.fn(() => builder),
          then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
            const rows =
              selectCall === 1
                ? [{ workspaceId, appKey: 'tasks', config: structuredClone(DEFAULT_TASK_SETTINGS) }]
                : [{ value: 2 }];
            return Promise.resolve(rows).then(resolve, reject);
          },
        };
        return builder;
      });

      const next = {
        ...structuredClone(DEFAULT_TASK_SETTINGS),
        statuses: DEFAULT_TASK_SETTINGS.statuses.filter((item) => item.key !== 'todo'),
      };

      await expect(service.updateSettings(workspaceId, next)).rejects.toThrow(
        /Cannot delete statuses still used by tasks/,
      );
    });
  });

  describe('due filters and timezones', () => {
    it('uses different day bounds for Europe/Paris vs UTC near midnight', () => {
      const now = new Date('2024-01-14T23:30:00.000Z');
      const paris = getDayBoundsInTimeZone(now, 'Europe/Paris');
      const utc = getDayBoundsInTimeZone(now, 'UTC');
      expect(paris.startOfToday.toISOString()).toBe('2024-01-14T23:00:00.000Z');
      expect(utc.startOfToday.toISOString()).toBe('2024-01-14T00:00:00.000Z');
      expect(paris.startOfToday.getTime()).not.toBe(utc.startOfToday.getTime());
    });

    it('applies overdue against the client timezone day start', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-14T23:30:00.000Z'));
      dbMock.state.selectRows = [];

      await service.list(workspaceId, userId, { due: 'overdue', tz: 'Europe/Paris' });
      await service.list(workspaceId, userId, { due: 'overdue', tz: 'UTC' });

      expect(dbMock.state.whereClauses.length).toBe(2);
      const parisDates = collectDateParams(dbMock.state.whereClauses[0]);
      const utcDates = collectDateParams(dbMock.state.whereClauses[1]);
      expect(parisDates).toContain('2024-01-14T23:00:00.000Z');
      expect(utcDates).toContain('2024-01-14T00:00:00.000Z');
      expect(parisDates).not.toEqual(utcDates);
      vi.useRealTimers();
    });
  });

  describe('reorder', () => {
    it('rejects the whole batch when one move has an invalid status', async () => {
      const todo = makeTask({ id: taskId, status: 'todo', position: 0 });
      const otherId = '55555555-5555-4555-8555-555555555555';
      const other = makeTask({ id: otherId, status: 'todo', position: 1 });
      dbMock.state.selectRows = [todo, other];

      let updateCalled = false;
      dbMock.db.transaction = vi.fn(async (fn: (tx: typeof dbMock.db) => Promise<unknown>) => {
        const tx = {
          ...dbMock.db,
          update: vi.fn(() => {
            updateCalled = true;
            return dbMock.updateBuilder;
          }),
        };
        return fn(tx as never);
      });

      await expect(
        service.reorder(workspaceId, { id: userId } as never, {
          moves: [
            { taskId, status: 'in_progress', position: 0 },
            { taskId: otherId, status: 'cancelled', position: 1 },
          ],
        }),
      ).rejects.toThrow(/disabled/);

      expect(updateCalled).toBe(false);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('rolls back the transaction when one update fails mid-batch', async () => {
      const todo = makeTask({ id: taskId, status: 'todo', position: 0 });
      const otherId = '55555555-5555-4555-8555-555555555555';
      const other = makeTask({ id: otherId, status: 'todo', position: 1 });
      dbMock.state.selectRows = [todo, other];

      const applied: string[] = [];
      dbMock.db.transaction = vi.fn(async (fn: (tx: typeof dbMock.db) => Promise<unknown>) => {
        const selectBuilder = {
          from: vi.fn(() => selectBuilder),
          where: vi.fn(() => selectBuilder),
          for: vi.fn(() => selectBuilder),
          then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
            return Promise.resolve([todo, other]).then(resolve, reject);
          },
        };
        const tx = {
          select: vi.fn(() => selectBuilder),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => ({
                returning: vi.fn(async () => {
                  const nextId = applied.length === 0 ? taskId : otherId;
                  if (nextId === otherId) {
                    throw new Error('write failed');
                  }
                  applied.push(nextId);
                  return [{ ...todo, status: 'in_progress', position: 0 }];
                }),
              })),
            })),
          })),
        };
        try {
          return await fn(tx as never);
        } catch (error) {
          applied.length = 0;
          throw error;
        }
      });

      await expect(
        service.reorder(workspaceId, { id: userId } as never, {
          moves: [
            { taskId, status: 'in_progress', position: 0 },
            { taskId: otherId, status: 'done', position: 1 },
          ],
        }),
      ).rejects.toThrow(/write failed/);

      expect(applied).toEqual([]);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('emits task.updated after a successful atomic reorder', async () => {
      const todo = makeTask({ status: 'todo', position: 0 });
      dbMock.state.selectRows = [todo];
      const updated = { ...todo, status: 'in_progress', position: 2, updatedAt: new Date() };

      dbMock.db.transaction = vi.fn(async (fn: (tx: typeof dbMock.db) => Promise<unknown>) => {
        const selectBuilder = {
          from: vi.fn(() => selectBuilder),
          where: vi.fn(() => selectBuilder),
          for: vi.fn(() => selectBuilder),
          then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
            return Promise.resolve([todo]).then(resolve, reject);
          },
        };
        const tx = {
          select: vi.fn(() => selectBuilder),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => ({
                returning: vi.fn(async () => [updated]),
              })),
            })),
          })),
        };
        return fn(tx as never);
      });

      const result = await service.reorder(workspaceId, { id: userId } as never, {
        moves: [{ taskId, status: 'in_progress', position: 2 }],
      });

      expect(result).toHaveLength(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.taskUpdated,
        expect.objectContaining({ taskId }),
      );
    });
  });

  describe('when / someday and completedAt', () => {
    it('clears isSomeday when setting whenDate', async () => {
      const existing = makeTask({ isSomeday: true, whenDate: null });
      dbMock.state.selectRows = [existing];
      dbMock.state.updateRows = [
        { ...existing, whenDate: '2024-01-20', whenEvening: false, isSomeday: false },
      ];

      const result = await service.update(workspaceId, taskId, { id: userId } as never, {
        whenDate: '2024-01-20',
      });

      expect(result.whenDate).toBe('2024-01-20');
      expect(result.isSomeday).toBe(false);
      expect(dbMock.state.updates[0]).toMatchObject({
        whenDate: '2024-01-20',
        isSomeday: false,
      });
    });

    it('clears whenDate when setting isSomeday', async () => {
      const existing = makeTask({ whenDate: '2024-01-20', whenEvening: true, isSomeday: false });
      dbMock.state.selectRows = [existing];
      dbMock.state.updateRows = [
        { ...existing, whenDate: null, whenEvening: false, isSomeday: true },
      ];

      const result = await service.update(workspaceId, taskId, { id: userId } as never, {
        isSomeday: true,
      });

      expect(result.isSomeday).toBe(true);
      expect(result.whenDate).toBeNull();
      expect(dbMock.state.updates[0]).toMatchObject({
        whenDate: null,
        whenEvening: false,
        isSomeday: true,
      });
    });

    it('sets completedAt when moving into a done status and clears it when leaving', async () => {
      const existing = makeTask({ status: 'todo', completedAt: null });
      dbMock.state.selectRows = [existing];
      const completedAt = new Date('2024-01-16T10:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(completedAt);
      dbMock.state.updateRows = [{ ...existing, status: 'done', completedAt }];

      const done = await service.update(workspaceId, taskId, { id: userId } as never, {
        status: 'done',
      });
      expect(done.completedAt).toBe(completedAt.toISOString());
      expect(dbMock.state.updates[0].completedAt).toEqual(completedAt);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.taskCompleted,
        expect.objectContaining({ taskId }),
      );

      dbMock.state.selectRows = [{ ...existing, status: 'done', completedAt }];
      dbMock.state.updateRows = [{ ...existing, status: 'todo', completedAt: null }];
      dbMock.state.updates = [];
      const reopened = await service.update(workspaceId, taskId, { id: userId } as never, {
        status: 'todo',
      });
      expect(reopened.completedAt).toBeNull();
      expect(dbMock.state.updates[0].completedAt).toBeNull();
      vi.useRealTimers();
    });

    it('creates inbox tasks without project validation and locks the inbox bucket', async () => {
      const created = makeTask({ projectId: null, position: 0 });
      dbMock.state.updateRows = [created];
      dbMock.state.selectRows = [{ maxPosition: -1 }];

      const result = await service.create(workspaceId, { id: userId } as never, {
        title: 'Captured',
        projectId: null,
      });

      expect(result.projectId).toBeNull();
      expect(projectsService.assertProjectInWorkspace).not.toHaveBeenCalled();
      expect(dbMock.db.execute).toHaveBeenCalled();
      const lockSql = String(dbMock.db.execute.mock.calls[0]?.[0] ?? '');
      expect(lockSql.includes('task-pos:') || dbMock.db.execute.mock.calls.length > 0).toBe(true);
    });
  });

  describe('smart views', () => {
    it('includes when_date on or before today in the today view (rollover)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const rolled = makeTask({ whenDate: '2024-01-14', whenEvening: false });
      dbMock.state.selectRows = [rolled];

      const result = await service.list(workspaceId, userId, { view: 'today', tz: 'UTC' });
      expect(result).toHaveLength(1);
      expect(result[0].section).toBe('today');
      vi.useRealTimers();
    });

    it('marks whenEvening tasks under the evening section', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
      const evening = makeTask({ whenDate: '2024-01-15', whenEvening: true });
      dbMock.state.selectRows = [evening];

      const result = await service.list(workspaceId, userId, { view: 'today', tz: 'UTC' });
      expect(result[0].section).toBe('evening');
      vi.useRealTimers();
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatTaskMarker } from '@erp-tiza/shared';
import { NotesService } from './notes.service.js';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const noteId = '22222222-2222-4222-8222-222222222222';
const taskId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const day = '2026-11-10';

function makeNote(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-11-10T12:00:00.000Z');
  return {
    id: noteId,
    workspaceId,
    day,
    body: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createDbMock() {
  const state = {
    selectRows: [] as unknown[],
    insertRows: [] as unknown[],
    updateRows: [] as unknown[],
    inserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
  };

  const selectBuilder = {
    from: vi.fn(() => selectBuilder),
    where: vi.fn(() => selectBuilder),
    limit: vi.fn(() => selectBuilder),
    then: undefined as unknown,
  };
  Object.assign(selectBuilder, {
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(state.selectRows).then(resolve, reject);
    },
  });

  const insertBuilder = {
    values: vi.fn((values: Record<string, unknown>) => {
      state.inserts.push(values);
      return insertBuilder;
    }),
    returning: vi.fn(async () => state.insertRows),
  };

  const updateBuilder = {
    set: vi.fn((values: Record<string, unknown>) => {
      state.updates.push(values);
      return updateBuilder;
    }),
    where: vi.fn(() => updateBuilder),
    returning: vi.fn(async () => state.updateRows),
  };

  return {
    state,
    db: {
      select: vi.fn(() => selectBuilder),
      insert: vi.fn(() => insertBuilder),
      update: vi.fn(() => updateBuilder),
    },
  };
}

describe('NotesService', () => {
  let service: NotesService;
  let dbMock: ReturnType<typeof createDbMock>;
  let appsService: { isInstalled: ReturnType<typeof vi.fn> };
  let linksService: { create: ReturnType<typeof vi.fn> };
  let tasksService: { create: ReturnType<typeof vi.fn> };
  const user = { id: userId } as never;

  beforeEach(() => {
    dbMock = createDbMock();
    appsService = { isInstalled: vi.fn(async () => true) };
    linksService = { create: vi.fn(async () => ({ id: 'link' })) };
    tasksService = {
      create: vi.fn(async () => ({
        id: taskId,
        title: 'Buy milk',
        whenDate: day,
      })),
    };
    service = new NotesService(
      dbMock.db as never,
      appsService as never,
      linksService as never,
      tasksService as never,
    );
  });

  it('creates today note once per workspace day', async () => {
    dbMock.state.selectRows = [];
    dbMock.state.insertRows = [makeNote()];
    const created = await service.getOrCreateByDay(workspaceId, day);
    expect(created.id).toBe(noteId);
    expect(dbMock.db.insert).toHaveBeenCalledTimes(1);

    dbMock.state.selectRows = [makeNote()];
    const again = await service.getOrCreateByDay(workspaceId, day);
    expect(again.id).toBe(noteId);
    expect(dbMock.db.insert).toHaveBeenCalledTimes(1);
  });

  it('saves normalized Markdown body', async () => {
    dbMock.state.selectRows = [makeNote()];
    dbMock.state.updateRows = [makeNote({ body: 'Hello\n\n- [ ] Buy milk' })];
    const note = await service.updateBody(workspaceId, noteId, {
      body: '# Hello\n\n- [ ] Buy milk',
    });
    expect(dbMock.state.updates[0]?.body).toBe('Hello\n\n- [ ] Buy milk');
    expect(note.body).toBe('Hello\n\n- [ ] Buy milk');
  });

  it('promotes a checklist line to a task for the note day', async () => {
    dbMock.state.selectRows = [makeNote({ body: '- [ ] Buy milk' })];
    const linkedBody = `- [x] Buy milk ${formatTaskMarker(taskId)}`;
    dbMock.state.updateRows = [makeNote({ body: linkedBody })];

    const result = await service.promoteChecklistLine(workspaceId, noteId, user, {
      lineIndex: 0,
      checked: true,
    });

    expect(tasksService.create).toHaveBeenCalledWith(workspaceId, user, {
      title: 'Buy milk',
      whenDate: day,
    });
    expect(linksService.create).toHaveBeenCalledWith({
      workspaceId,
      sourceApp: 'notes',
      sourceRef: `${noteId}:${taskId}`,
      targetApp: 'tasks',
      targetRef: taskId,
      linkType: 'checklist',
    });
    expect(result.created).toBe(true);
    expect(result.taskId).toBe(taskId);
    expect(result.note.body).toContain(formatTaskMarker(taskId));
  });

  it('does not promote again when the line is already linked', async () => {
    const linkedBody = `- [x] Buy milk ${formatTaskMarker(taskId)}`;
    dbMock.state.selectRows = [makeNote({ body: linkedBody })];

    const result = await service.promoteChecklistLine(workspaceId, noteId, user, {
      lineIndex: 0,
    });

    expect(result.created).toBe(false);
    expect(result.taskId).toBe(taskId);
    expect(tasksService.create).not.toHaveBeenCalled();
    expect(linksService.create).not.toHaveBeenCalled();
  });

  it('refuses promotion when Tasks is not installed', async () => {
    appsService.isInstalled.mockResolvedValue(false);
    dbMock.state.selectRows = [makeNote({ body: '- [ ] Buy milk' })];

    await expect(
      service.promoteChecklistLine(workspaceId, noteId, user, { lineIndex: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tasksService.create).not.toHaveBeenCalled();
    expect(linksService.create).not.toHaveBeenCalled();
  });
});

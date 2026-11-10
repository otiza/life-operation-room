import { describe, expect, it } from 'vitest';
import { scheduledTaskIdsFromOccurrences } from './scheduled-tasks';

describe('scheduledTaskIdsFromOccurrences', () => {
  it('treats all-day time blocks as scheduled even when startAt is null', () => {
    const ids = scheduledTaskIdsFromOccurrences([
      {
        kind: 'time_block',
        isAllDay: true,
        startAt: null,
        task: { taskId: 'task-all-day', deleted: false },
      },
    ]);
    expect(ids.has('task-all-day')).toBe(true);
  });

  it('treats past timed time blocks as scheduled', () => {
    const ids = scheduledTaskIdsFromOccurrences([
      {
        kind: 'time_block',
        isAllDay: false,
        startAt: '2020-01-01T10:00:00.000Z',
        task: { taskId: 'task-past', deleted: false },
      },
    ]);
    expect(ids.has('task-past')).toBe(true);
  });

  it('does not treat due chips as scheduled (no time_block / cross-app link)', () => {
    const ids = scheduledTaskIdsFromOccurrences([
      {
        kind: 'due_chip',
        isAllDay: true,
        startAt: null,
        task: { taskId: 'task-due', deleted: false },
      },
    ]);
    expect(ids.has('task-due')).toBe(false);
  });

  it('ignores deleted linked tasks', () => {
    const ids = scheduledTaskIdsFromOccurrences([
      {
        kind: 'time_block',
        startAt: '2026-11-10T10:00:00.000Z',
        task: { taskId: 'task-gone', deleted: true },
      },
    ]);
    expect(ids.size).toBe(0);
  });
});

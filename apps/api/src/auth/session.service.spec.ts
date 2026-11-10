import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service.js';

describe('SessionService.deleteExpired', () => {
  let sessionService: SessionService;
  let deleteWhere: ReturnType<typeof vi.fn>;
  let deleteReturning: ReturnType<typeof vi.fn>;
  let db: { delete: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    deleteReturning = vi.fn(async () => [{ id: 's1' }, { id: 's2' }]);
    deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
    db = {
      delete: vi.fn(() => ({ where: deleteWhere })),
    };
    sessionService = new SessionService(db as never, { findById: vi.fn() } as never);
  });

  it('deletes sessions whose expires_at is at or before now', async () => {
    const now = new Date('2024-06-01T12:00:00.000Z');
    const removed = await sessionService.deleteExpired(now);

    expect(removed).toBe(2);
    expect(db.delete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();
    expect(deleteReturning).toHaveBeenCalled();
  });

  it('returns 0 when no expired sessions exist', async () => {
    deleteReturning.mockResolvedValueOnce([]);
    const removed = await sessionService.deleteExpired(new Date('2024-06-01T12:00:00.000Z'));
    expect(removed).toBe(0);
  });
});

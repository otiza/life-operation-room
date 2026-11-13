import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../db/schema.js';
import { AppsService } from './apps.service.js';

describe('AppsService catalog', () => {
  const service = new AppsService({} as never, { emitAsync: vi.fn() } as never);

  it('lists only available apps', () => {
    const catalog = service.getCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((app) => app.status === 'available')).toBe(true);
    expect(catalog.map((app) => app.key)).not.toContain('costs');
  });

  it('rejects installing a coming-soon app', async () => {
    await expect(
      service.install('ws-1', { id: 'u-1' } as User, { appKey: 'costs' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

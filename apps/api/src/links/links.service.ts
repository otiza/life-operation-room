import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { crossAppLinks } from '../db/schema.js';
import { toIso } from '../common/utils/crypto.js';

@Injectable()
export class LinksService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async list(workspaceId: string) {
    const rows = await this.db
      .select()
      .from(crossAppLinks)
      .where(eq(crossAppLinks.workspaceId, workspaceId));
    return rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspaceId,
      sourceApp: row.sourceApp,
      sourceRef: row.sourceRef,
      targetApp: row.targetApp,
      targetRef: row.targetRef,
      linkType: row.linkType,
      createdAt: toIso(row.createdAt)!,
    }));
  }
}

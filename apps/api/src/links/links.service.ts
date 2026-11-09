import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { crossAppLinks } from '../db/schema.js';
import { toIso } from '../common/utils/crypto.js';

export type CreateCrossAppLinkInput = {
  workspaceId: string;
  sourceApp: string;
  sourceRef: string;
  targetApp: string;
  targetRef: string;
  linkType: string;
};

@Injectable()
export class LinksService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async list(workspaceId: string) {
    const rows = await this.db
      .select()
      .from(crossAppLinks)
      .where(eq(crossAppLinks.workspaceId, workspaceId));
    return rows.map((row) => this.toDto(row));
  }

  async listBySource(workspaceId: string, sourceApp: string, linkType?: string) {
    const conditions = [
      eq(crossAppLinks.workspaceId, workspaceId),
      eq(crossAppLinks.sourceApp, sourceApp),
    ];
    if (linkType) conditions.push(eq(crossAppLinks.linkType, linkType));
    const rows = await this.db.select().from(crossAppLinks).where(and(...conditions));
    return rows.map((row) => this.toDto(row));
  }

  async listByTarget(workspaceId: string, targetApp: string, targetRef: string, linkType?: string) {
    const conditions = [
      eq(crossAppLinks.workspaceId, workspaceId),
      eq(crossAppLinks.targetApp, targetApp),
      eq(crossAppLinks.targetRef, targetRef),
    ];
    if (linkType) conditions.push(eq(crossAppLinks.linkType, linkType));
    const rows = await this.db.select().from(crossAppLinks).where(and(...conditions));
    return rows.map((row) => this.toDto(row));
  }

  async create(input: CreateCrossAppLinkInput) {
    const [row] = await this.db
      .insert(crossAppLinks)
      .values({
        workspaceId: input.workspaceId,
        sourceApp: input.sourceApp,
        sourceRef: input.sourceRef,
        targetApp: input.targetApp,
        targetRef: input.targetRef,
        linkType: input.linkType,
      })
      .returning();
    return this.toDto(row);
  }

  async deleteBySource(workspaceId: string, sourceApp: string, sourceRef: string) {
    await this.db
      .delete(crossAppLinks)
      .where(
        and(
          eq(crossAppLinks.workspaceId, workspaceId),
          eq(crossAppLinks.sourceApp, sourceApp),
          eq(crossAppLinks.sourceRef, sourceRef),
        ),
      );
    return { ok: true };
  }

  async deleteByPair(
    workspaceId: string,
    sourceApp: string,
    sourceRef: string,
    targetApp: string,
    targetRef: string,
  ) {
    await this.db
      .delete(crossAppLinks)
      .where(
        and(
          eq(crossAppLinks.workspaceId, workspaceId),
          eq(crossAppLinks.sourceApp, sourceApp),
          eq(crossAppLinks.sourceRef, sourceRef),
          eq(crossAppLinks.targetApp, targetApp),
          eq(crossAppLinks.targetRef, targetRef),
        ),
      );
    return { ok: true };
  }

  private toDto(row: typeof crossAppLinks.$inferSelect) {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      sourceApp: row.sourceApp,
      sourceRef: row.sourceRef,
      targetApp: row.targetApp,
      targetRef: row.targetRef,
      linkType: row.linkType,
      createdAt: toIso(row.createdAt)!,
    };
  }
}

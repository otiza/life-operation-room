import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tasks } from '../db/schema.js';

/** Narrow tasks-owned queries other apps may call without importing the tasks table. */
@Injectable()
export class TaskReferencesService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async countByProject(workspaceId: string, projectId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.projectId, projectId),
          isNull(tasks.deletedAt),
        ),
      );
    return Number(row?.value ?? 0);
  }
}

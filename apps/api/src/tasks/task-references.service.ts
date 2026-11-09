import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, eq, gte, isNull, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tasks } from '../db/schema.js';
import { toIso } from '../common/utils/crypto.js';

export type TaskReference = {
  id: string;
  title: string;
  status: string;
  projectId: string;
  dueAt: string | null;
};

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

  async assertTaskInWorkspace(workspaceId: string, taskId: string): Promise<TaskReference> {
    const [row] = await this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        projectId: tasks.projectId,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.workspaceId, workspaceId),
          isNull(tasks.deletedAt),
        ),
      );
    if (!row) throw new NotFoundException('Task not found in workspace');
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      projectId: row.projectId,
      dueAt: toIso(row.dueAt),
    };
  }

  async findTaskInWorkspace(workspaceId: string, taskId: string): Promise<TaskReference | null> {
    const [row] = await this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        projectId: tasks.projectId,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)));
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      projectId: row.projectId,
      dueAt: toIso(row.dueAt),
    };
  }

  async listDueInRange(workspaceId: string, from: Date, to: Date): Promise<TaskReference[]> {
    const rows = await this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        projectId: tasks.projectId,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          isNull(tasks.deletedAt),
          gte(tasks.dueAt, from),
          lt(tasks.dueAt, to),
        ),
      );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      projectId: row.projectId,
      dueAt: toIso(row.dueAt),
    }));
  }
}

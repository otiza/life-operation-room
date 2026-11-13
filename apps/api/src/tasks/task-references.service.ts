import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DEFAULT_TASK_SETTINGS, taskSettingsSchema } from '@life-room/shared';
import { tasks, workspaceApps } from '../db/schema.js';
import { toIso } from '../common/utils/crypto.js';

export type TaskReference = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  dueAt: string | null;
  isDone: boolean;
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
    const task = await this.findTaskInWorkspace(workspaceId, taskId);
    if (!task) throw new NotFoundException('Task not found in workspace');
    return task;
  }

  async findTaskInWorkspace(workspaceId: string, taskId: string): Promise<TaskReference | null> {
    const map = await this.findTasksInWorkspace(workspaceId, [taskId]);
    return map.get(taskId) ?? null;
  }

  async findTasksInWorkspace(
    workspaceId: string,
    taskIds: string[],
  ): Promise<Map<string, TaskReference>> {
    const uniqueIds = [...new Set(taskIds.filter(Boolean))];
    const result = new Map<string, TaskReference>();
    if (!uniqueIds.length) return result;
    const doneKeys = await this.doneStatusKeys(workspaceId);
    const rows = await this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        projectId: tasks.projectId,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), inArray(tasks.id, uniqueIds), isNull(tasks.deletedAt)));
    for (const row of rows) {
      result.set(row.id, {
        id: row.id,
        title: row.title,
        status: row.status,
        projectId: row.projectId,
        dueAt: toIso(row.dueAt),
        isDone: doneKeys.has(row.status),
      });
    }
    return result;
  }

  async listDueInRange(workspaceId: string, from: Date, to: Date): Promise<TaskReference[]> {
    const doneKeys = await this.doneStatusKeys(workspaceId);
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
      isDone: doneKeys.has(row.status),
    }));
  }

  /** Align the task plan date with a calendar time block. */
  async setWhenDate(workspaceId: string, taskId: string, whenDate: string): Promise<void> {
    await this.db
      .update(tasks)
      .set({
        whenDate,
        whenEvening: false,
        isSomeday: false,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)));
  }

  private async doneStatusKeys(workspaceId: string): Promise<Set<string>> {
    const [installed] = await this.db
      .select({ config: workspaceApps.config })
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, 'tasks')));
    const parsed = taskSettingsSchema.safeParse(installed?.config ?? {});
    const statuses = parsed.success
      ? parsed.data.statuses
      : taskSettingsSchema.parse(structuredClone(DEFAULT_TASK_SETTINGS)).statuses;
    return new Set(
      statuses
        .map((item) =>
          item.key === 'cancelled' && item.isDone === undefined ? { ...item, isDone: true } : item,
        )
        .filter((item) => item.isDone)
        .map((item) => item.key),
    );
  }
}

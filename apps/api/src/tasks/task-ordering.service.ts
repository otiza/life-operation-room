import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, inArray, isNull, max, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ReorderTasksInput, TaskSettings } from '@erp-tiza/shared';
import { tasks, type Task } from '../db/schema.js';

@Injectable()
export class TaskOrderingService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async lockProjectPositions(
    tx: NodePgDatabase,
    workspaceId: string,
    projectId: string | null,
  ) {
    const bucket = projectId ?? 'inbox';
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`task-pos:${workspaceId}:${bucket}`}))`,
    );
  }

  async nextPositionInProject(
    tx: NodePgDatabase,
    workspaceId: string,
    projectId: string | null,
  ) {
    const projectCondition =
      projectId === null ? isNull(tasks.projectId) : eq(tasks.projectId, projectId);
    const [positionRow] = await tx
      .select({ maxPosition: max(tasks.position) })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), projectCondition));
    return (positionRow?.maxPosition ?? -1) + 1;
  }

  async reorder(
    workspaceId: string,
    input: ReorderTasksInput,
    settings: TaskSettings,
    assertAssignableStatus: (status: string, currentStatus?: string) => void,
  ): Promise<Array<{ before: Task; after: Task }>> {
    const taskIds = input.moves.map((move) => move.taskId);
    if (new Set(taskIds).size !== taskIds.length) {
      throw new BadRequestException('Duplicate task ids in moves');
    }

    return this.db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspaceId),
            inArray(tasks.id, taskIds),
            isNull(tasks.deletedAt),
          ),
        )
        .for('update');
      if (existingRows.length !== taskIds.length) {
        throw new NotFoundException('One or more tasks were not found');
      }
      const byId = new Map(existingRows.map((row) => [row.id, row]));
      for (const move of input.moves) {
        const existing = byId.get(move.taskId)!;
        if (move.status !== undefined) {
          assertAssignableStatus(move.status, existing.status);
        }
      }

      const results: Array<{ before: Task; after: Task }> = [];
      for (const move of input.moves) {
        const before = byId.get(move.taskId)!;
        const nextStatus = move.status ?? before.status;
        const nextPosition = move.position ?? before.position;
        const nextTodayPosition =
          move.todayPosition !== undefined ? move.todayPosition : before.todayPosition;
        if (
          before.status === nextStatus &&
          before.position === nextPosition &&
          before.todayPosition === nextTodayPosition
        ) {
          continue;
        }
        const nextIsDone = Boolean(settings.statuses.find((item) => item.key === nextStatus)?.isDone);
        const previousIsDone = Boolean(
          settings.statuses.find((item) => item.key === before.status)?.isDone,
        );
        let completedAt = before.completedAt;
        if (nextIsDone && !previousIsDone) completedAt = new Date();
        if (!nextIsDone && previousIsDone) completedAt = null;
        const [after] = await tx
          .update(tasks)
          .set({
            status: nextStatus,
            position: nextPosition,
            ...(move.todayPosition !== undefined ? { todayPosition: move.todayPosition } : {}),
            completedAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tasks.id, move.taskId),
              eq(tasks.workspaceId, workspaceId),
              isNull(tasks.deletedAt),
            ),
          )
          .returning();
        if (!after) throw new NotFoundException('Task not found');
        results.push({ before, after });
      }
      return results;
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, notInArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  calendarDateKeyInTimeZone,
  getDayBoundsInTimeZone,
  type ListTasksQuery,
} from '@erp-tiza/shared';
import { tasks, type Task } from '../db/schema.js';

export type TaskQueryRow = {
  task: Task;
  section?: 'today' | 'evening';
  groupKey?: string;
};

@Injectable()
export class TaskQueryService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async list(workspaceId: string, userId: string, query: ListTasksQuery, doneKeys: string[]): Promise<Task[]> {
    const limit = query.limit ?? 100;
    const conditions = [eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)];
    if (query.projectId) conditions.push(eq(tasks.projectId, query.projectId));
    if (query.status) conditions.push(eq(tasks.status, query.status));
    if (query.assignee === 'me') conditions.push(eq(tasks.assigneeUserId, userId));
    if (query.due) {
      const { startOfToday, startOfTomorrow } = getDayBoundsInTimeZone(new Date(), query.tz);
      if (query.due === 'none') {
        conditions.push(isNull(tasks.dueAt));
      } else if (query.due === 'overdue') {
        if (doneKeys.length) {
          conditions.push(and(lt(tasks.dueAt, startOfToday), notInArray(tasks.status, doneKeys))!);
        } else {
          conditions.push(lt(tasks.dueAt, startOfToday));
        }
      } else if (query.due === 'today') {
        conditions.push(and(gte(tasks.dueAt, startOfToday), lt(tasks.dueAt, startOfTomorrow))!);
      } else if (query.due === 'upcoming') {
        conditions.push(gte(tasks.dueAt, startOfTomorrow));
      }
    }
    return this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.position), asc(tasks.createdAt))
      .limit(limit);
  }

  async listByView(
    workspaceId: string,
    userId: string,
    query: ListTasksQuery,
    doneKeys: string[],
  ): Promise<TaskQueryRow[]> {
    const now = new Date();
    const { startOfTomorrow } = getDayBoundsInTimeZone(now, query.tz);
    const todayKey = calendarDateKeyInTimeZone(now, query.tz);
    const openConditions = [
      eq(tasks.workspaceId, workspaceId),
      isNull(tasks.deletedAt),
      ...(doneKeys.length ? [notInArray(tasks.status, doneKeys)] : []),
    ];
    if (query.assignee === 'me') openConditions.push(eq(tasks.assigneeUserId, userId));

    const limit = query.limit ?? 100;

    if (query.view === 'inbox') {
      const rows = await this.db
        .select()
        .from(tasks)
        .where(and(...openConditions, isNull(tasks.projectId), isNull(tasks.whenDate), eq(tasks.isSomeday, false)))
        .orderBy(asc(tasks.position), asc(tasks.createdAt))
        .limit(limit);
      return rows.map((task) => ({ task }));
    }

    if (query.view === 'today') {
      const whenDueOrOverdue = or(
        and(isNotNull(tasks.whenDate), lte(tasks.whenDate, todayKey)),
        and(isNotNull(tasks.dueAt), lt(tasks.dueAt, startOfTomorrow)),
      )!;
      const rows = await this.db
        .select()
        .from(tasks)
        .where(and(...openConditions, whenDueOrOverdue))
        .orderBy(asc(tasks.todayPosition), asc(tasks.position), asc(tasks.createdAt))
        .limit(limit);
      return rows.map((task) => ({ task, section: task.whenEvening ? 'evening' as const : 'today' as const }));
    }

    if (query.view === 'upcoming') {
      const rows = await this.db
        .select()
        .from(tasks)
        .where(
          and(
            ...openConditions,
            or(
              and(isNotNull(tasks.whenDate), sql`${tasks.whenDate} > ${todayKey}`),
              and(isNull(tasks.whenDate), isNotNull(tasks.dueAt), gte(tasks.dueAt, startOfTomorrow)),
            )!,
          ),
        )
        .orderBy(asc(tasks.whenDate), asc(tasks.dueAt), asc(tasks.position))
        .limit(limit);
      return rows.map((task) => {
        const groupKey = task.whenDate
          ? String(task.whenDate)
          : task.dueAt
            ? calendarDateKeyInTimeZone(task.dueAt, query.tz)
            : todayKey;
        return { task, groupKey };
      });
    }

    if (query.view === 'anytime') {
      const rows = await this.db
        .select()
        .from(tasks)
        .where(
          and(
            ...openConditions,
            isNotNull(tasks.projectId),
            isNull(tasks.whenDate),
            eq(tasks.isSomeday, false),
          ),
        )
        .orderBy(asc(tasks.position), asc(tasks.createdAt))
        .limit(limit);
      return rows.map((task) => ({ task }));
    }

    if (query.view === 'someday') {
      const rows = await this.db
        .select()
        .from(tasks)
        .where(and(...openConditions, eq(tasks.isSomeday, true)))
        .orderBy(asc(tasks.position), asc(tasks.createdAt))
        .limit(limit);
      return rows.map((task) => ({ task }));
    }

    const conditions = [
      eq(tasks.workspaceId, workspaceId),
      isNull(tasks.deletedAt),
      ...(doneKeys.length
        ? [or(isNotNull(tasks.completedAt), inArray(tasks.status, doneKeys))!]
        : [isNotNull(tasks.completedAt)]),
    ];
    if (query.cursor) conditions.push(lt(tasks.completedAt, new Date(query.cursor)));
    if (query.assignee === 'me') conditions.push(eq(tasks.assigneeUserId, userId));
    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.completedAt), desc(tasks.updatedAt))
      .limit(limit);
    return rows.map((task) => ({ task }));
  }
}

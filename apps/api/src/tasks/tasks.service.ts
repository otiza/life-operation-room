import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, max, notInArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DEFAULT_TASK_SETTINGS,
  calendarDateKeyInTimeZone,
  getDayBoundsInTimeZone,
  taskSettingsSchema,
  type CreateTaskInput,
  type ListTasksQuery,
  type ReorderTasksInput,
  type TaskSettings,
  type UpdateTaskInput,
  type UpdateTaskSettingsInput,
} from '@erp-tiza/shared';
import { tasks, workspaceApps, type Task, type User } from '../db/schema.js';
import {
  DOMAIN_EVENTS,
  type AppInstalledEvent,
  type TaskDomainEvent,
} from '../common/events/domain-events.js';
import { toIso } from '../common/utils/crypto.js';
import { AppsService } from '../apps/apps.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import { TaskReferencesService } from './task-references.service.js';

const READ_ROLES = ['owner', 'admin', 'member', 'guest'] as const;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly workspacesService: WorkspacesService,
    private readonly appsService: AppsService,
    private readonly projectsService: ProjectsService,
    private readonly taskReferencesService: TaskReferencesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getSettings(workspaceId: string): Promise<TaskSettings> {
    const row = await this.appsService.assertInstalled(workspaceId, 'tasks');
    return this.resolveSettingsFromConfig(workspaceId, row.config);
  }

  async updateSettings(workspaceId: string, input: UpdateTaskSettingsInput): Promise<TaskSettings> {
    const settings = taskSettingsSchema.parse(input);
    this.assertUniqueKeys(settings);

    return this.db.transaction(async (tx) => {
      const [installed] = await tx
        .select()
        .from(workspaceApps)
        .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, 'tasks')))
        .for('update');
      if (!installed) {
        throw new BadRequestException(`App tasks is not installed in this workspace`);
      }

      const previous = this.resolveSettingsFromConfig(workspaceId, installed.config, false);
      const removedStatusKeys = previous.statuses
        .map((item) => item.key)
        .filter((key) => !settings.statuses.some((item) => item.key === key));
      const removedPriorityKeys = previous.priorities
        .map((item) => item.key)
        .filter((key) => !settings.priorities.some((item) => item.key === key));

      if (removedStatusKeys.length) {
        const [row] = await tx
          .select({ value: count() })
          .from(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              inArray(tasks.status, removedStatusKeys),
              isNull(tasks.deletedAt),
            ),
          );
        if (Number(row?.value ?? 0) > 0) {
          throw new BadRequestException(
            `Cannot delete statuses still used by tasks: ${removedStatusKeys.join(', ')}`,
          );
        }
      }
      if (removedPriorityKeys.length) {
        const [row] = await tx
          .select({ value: count() })
          .from(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              inArray(tasks.priority, removedPriorityKeys),
              isNull(tasks.deletedAt),
            ),
          );
        if (Number(row?.value ?? 0) > 0) {
          throw new BadRequestException(
            `Cannot delete priorities still used by tasks: ${removedPriorityKeys.join(', ')}`,
          );
        }
      }

      await tx
        .update(workspaceApps)
        .set({ config: { ...installed.config, ...settings } })
        .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, 'tasks')));
      return settings;
    });
  }

  async list(workspaceId: string, userId: string, query: ListTasksQuery) {
    const settings = await this.getSettings(workspaceId);
    const doneKeys = settings.statuses.filter((item) => item.isDone).map((item) => item.key);
    if (query.view) {
      return this.listByView(workspaceId, userId, query, doneKeys);
    }
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
    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.position), asc(tasks.createdAt));
    return rows.map((row) => this.toDto(row));
  }

  async listByView(workspaceId: string, userId: string, query: ListTasksQuery, doneKeys: string[]) {
    const now = new Date();
    const { startOfToday, startOfTomorrow } = getDayBoundsInTimeZone(now, query.tz);
    const todayKey = calendarDateKeyInTimeZone(now, query.tz);
    const openConditions = [
      eq(tasks.workspaceId, workspaceId),
      isNull(tasks.deletedAt),
      ...(doneKeys.length ? [notInArray(tasks.status, doneKeys)] : []),
    ];
    if (query.assignee === 'me') openConditions.push(eq(tasks.assigneeUserId, userId));

    if (query.view === 'inbox') {
      const rows = await this.db
        .select()
        .from(tasks)
        .where(and(...openConditions, isNull(tasks.projectId), isNull(tasks.whenDate), eq(tasks.isSomeday, false)))
        .orderBy(asc(tasks.position), asc(tasks.createdAt));
      return rows.map((row) => this.toDto(row));
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
        .orderBy(asc(tasks.todayPosition), asc(tasks.position), asc(tasks.createdAt));
      return rows.map((row) => this.toDto(row, { section: row.whenEvening ? 'evening' : 'today' }));
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
        .orderBy(asc(tasks.whenDate), asc(tasks.dueAt), asc(tasks.position));
      return rows.map((row) => {
        const groupKey = row.whenDate
          ? String(row.whenDate)
          : row.dueAt
            ? calendarDateKeyInTimeZone(row.dueAt, query.tz)
            : todayKey;
        return this.toDto(row, { groupKey });
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
        .orderBy(asc(tasks.position), asc(tasks.createdAt));
      return rows.map((row) => this.toDto(row));
    }

    if (query.view === 'someday') {
      const rows = await this.db
        .select()
        .from(tasks)
        .where(and(...openConditions, eq(tasks.isSomeday, true)))
        .orderBy(asc(tasks.position), asc(tasks.createdAt));
      return rows.map((row) => this.toDto(row));
    }

    // logbook
    const limit = query.limit ?? 50;
    const conditions = [
      eq(tasks.workspaceId, workspaceId),
      isNull(tasks.deletedAt),
      isNotNull(tasks.completedAt),
    ];
    if (query.cursor) conditions.push(lt(tasks.completedAt, new Date(query.cursor)));
    if (query.assignee === 'me') conditions.push(eq(tasks.assigneeUserId, userId));
    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.completedAt), desc(tasks.updatedAt))
      .limit(limit);
    return rows.map((row) => this.toDto(row));
  }

  async get(workspaceId: string, taskId: string) {
    const task = await this.findInWorkspace(workspaceId, taskId);
    return this.toDto(task);
  }

  countByProject(workspaceId: string, projectId: string): Promise<number> {
    return this.taskReferencesService.countByProject(workspaceId, projectId);
  }

  async countsByProject(workspaceId: string) {
    const settings = await this.getSettings(workspaceId);
    const doneKeys = new Set(settings.statuses.filter((item) => item.isDone).map((item) => item.key));
    const rows = await this.db
      .select({ projectId: tasks.projectId, status: tasks.status, value: count() })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)))
      .groupBy(tasks.projectId, tasks.status);
    const counts: Record<string, { total: number; open: number }> = {};
    for (const row of rows) {
      const key = row.projectId ?? 'inbox';
      const current = counts[key] ?? { total: 0, open: 0 };
      const value = Number(row.value);
      current.total += value;
      if (!doneKeys.has(row.status)) current.open += value;
      counts[key] = current;
    }
    return counts;
  }

  async create(workspaceId: string, user: User, input: CreateTaskInput) {
    const projectId = input.projectId ?? null;
    if (projectId) {
      await this.projectsService.assertProjectInWorkspace(workspaceId, projectId);
    }
    const settings = await this.getSettings(workspaceId);
    const defaultStatus =
      settings.statuses.find((item) => item.enabled)?.key ?? settings.statuses[0]?.key ?? 'todo';
    const defaultPriority =
      settings.priorities.find((item) => item.key === 'none' && item.enabled)?.key ??
      settings.priorities.find((item) => item.enabled)?.key ??
      settings.priorities[0]?.key ??
      'none';
    const status = input.status ?? defaultStatus;
    const priority = input.priority ?? defaultPriority;
    this.assertAssignableStatus(settings, status);
    this.assertAssignablePriority(settings, priority);
    const whenFields = this.resolveWhenFields({
      whenDate: input.whenDate,
      whenEvening: input.whenEvening,
      isSomeday: input.isSomeday,
    });
    const workspace = await this.workspacesService.findById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    const assigneeUserId =
      input.assigneeUserId !== undefined
        ? input.assigneeUserId
        : workspace.kind === 'personal'
          ? user.id
          : null;
    if (assigneeUserId) {
      await this.workspacesService.requireMembership(workspaceId, assigneeUserId, [...READ_ROLES]);
    }
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    const isDone = Boolean(settings.statuses.find((item) => item.key === status)?.isDone);
    const row = await this.db.transaction(async (tx) => {
      await this.lockProjectPositions(tx, workspaceId, projectId);
      const nextPosition = await this.nextPositionInProject(tx, workspaceId, projectId);
      const [created] = await tx
        .insert(tasks)
        .values({
          workspaceId,
          projectId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          status,
          priority,
          dueAt,
          whenDate: whenFields.whenDate,
          whenEvening: whenFields.whenEvening,
          isSomeday: whenFields.isSomeday,
          completedAt: isDone ? new Date() : null,
          assigneeUserId,
          createdByUserId: user.id,
          position: nextPosition,
        })
        .returning();
      return created;
    });
    const dto = this.toDto(row);
    this.emitTaskEvent(DOMAIN_EVENTS.taskUpdated, dto, user.id);
    if (dueAt) this.emitTaskEvent(DOMAIN_EVENTS.taskScheduled, dto, user.id);
    if (isDone) this.emitTaskEvent(DOMAIN_EVENTS.taskCompleted, dto, user.id);
    if (assigneeUserId && assigneeUserId !== user.id) {
      this.emitTaskEvent(DOMAIN_EVENTS.taskAssigned, dto, user.id, {
        previousAssigneeUserId: null,
      });
    }
    return dto;
  }

  async update(workspaceId: string, taskId: string, user: User, input: UpdateTaskInput) {
    const existing = await this.findInWorkspace(workspaceId, taskId);
    const settings = await this.getSettings(workspaceId);
    if (input.status !== undefined) this.assertAssignableStatus(settings, input.status, existing.status);
    if (input.priority !== undefined) {
      this.assertAssignablePriority(settings, input.priority, existing.priority);
    }
    if (input.projectId) {
      await this.projectsService.assertProjectInWorkspace(workspaceId, input.projectId);
    }
    if (input.assigneeUserId) {
      await this.workspacesService.requireMembership(workspaceId, input.assigneeUserId, [
        ...READ_ROLES,
      ]);
    }
    const previousDueAt = existing.dueAt;
    const previousAssigneeUserId = existing.assigneeUserId;
    const nextDueAt =
      input.dueAt === undefined
        ? previousDueAt
        : input.dueAt === null
          ? null
          : new Date(input.dueAt);
    const projectChanged =
      input.projectId !== undefined && input.projectId !== existing.projectId;
    const whenTouched =
      input.whenDate !== undefined || input.isSomeday !== undefined || input.whenEvening !== undefined;
    const whenFields = this.resolveWhenFields({
      whenDate: input.whenDate !== undefined ? input.whenDate : existing.whenDate,
      whenEvening: input.whenEvening !== undefined ? input.whenEvening : existing.whenEvening,
      isSomeday: input.isSomeday !== undefined ? input.isSomeday : existing.isSomeday,
      preferWhen: input.whenDate !== undefined,
      preferSomeday: input.isSomeday !== undefined && input.whenDate === undefined,
    }, whenTouched);
    const nextStatus = input.status ?? existing.status;
    const nextIsDone = Boolean(settings.statuses.find((item) => item.key === nextStatus)?.isDone);
    const previousIsDone = Boolean(
      settings.statuses.find((item) => item.key === existing.status)?.isDone,
    );
    let completedAt = existing.completedAt;
    if (nextIsDone && !previousIsDone) completedAt = new Date();
    if (!nextIsDone && previousIsDone) completedAt = null;
    const row = await this.db.transaction(async (tx) => {
      let nextPosition = input.position;
      if (projectChanged) {
        await this.lockProjectPositions(tx, workspaceId, input.projectId ?? null);
        nextPosition = await this.nextPositionInProject(tx, workspaceId, input.projectId ?? null);
      }
      const [updated] = await tx
        .update(tasks)
        .set({
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.dueAt !== undefined ? { dueAt: nextDueAt } : {}),
          ...(input.assigneeUserId !== undefined ? { assigneeUserId: input.assigneeUserId } : {}),
          ...(input.whenDate !== undefined || input.isSomeday !== undefined || input.whenEvening !== undefined
            ? {
                whenDate: whenFields.whenDate,
                whenEvening: whenFields.whenEvening,
                isSomeday: whenFields.isSomeday,
              }
            : {}),
          ...(input.todayPosition !== undefined ? { todayPosition: input.todayPosition } : {}),
          ...(input.status !== undefined || nextIsDone !== previousIsDone ? { completedAt } : {}),
          ...(projectChanged || input.position !== undefined ? { position: nextPosition } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
        .returning();
      if (!updated) throw new NotFoundException('Task not found');
      return updated;
    });
    const dto = this.toDto(row);
    this.emitTaskEvent(DOMAIN_EVENTS.taskUpdated, dto, user.id, {
      previousAssigneeUserId,
      previousDueAt: toIso(previousDueAt),
    });
    if (nextIsDone && !previousIsDone) {
      this.emitTaskEvent(DOMAIN_EVENTS.taskCompleted, dto, user.id);
    }
    const hadDue = Boolean(previousDueAt);
    const hasDue = Boolean(row.dueAt);
    if (!hadDue && hasDue) this.emitTaskEvent(DOMAIN_EVENTS.taskScheduled, dto, user.id);
    if (hadDue && !hasDue) this.emitTaskEvent(DOMAIN_EVENTS.taskUnscheduled, dto, user.id);
    if (hadDue && hasDue && previousDueAt?.getTime() !== row.dueAt?.getTime()) {
      this.emitTaskEvent(DOMAIN_EVENTS.taskScheduled, dto, user.id, {
        previousDueAt: toIso(previousDueAt),
      });
    }
    if (
      input.assigneeUserId !== undefined &&
      input.assigneeUserId !== previousAssigneeUserId &&
      input.assigneeUserId &&
      input.assigneeUserId !== user.id
    ) {
      this.emitTaskEvent(DOMAIN_EVENTS.taskAssigned, dto, user.id, {
        previousAssigneeUserId,
      });
    }
    return dto;
  }

  async remove(workspaceId: string, taskId: string, user: User) {
    const existing = await this.findInWorkspace(workspaceId, taskId);
    await this.db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)),
      );
    this.emitTaskEvent(DOMAIN_EVENTS.taskDeleted, this.toDto(existing), user.id);
    return { ok: true };
  }

  async restore(workspaceId: string, taskId: string, user: User) {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId), isNotNull(tasks.deletedAt)),
      );
    if (!task) throw new NotFoundException('Task not found');
    const [row] = await this.db
      .update(tasks)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .returning();
    if (!row) throw new NotFoundException('Task not found');
    const dto = this.toDto(row);
    this.emitTaskEvent(DOMAIN_EVENTS.taskRestored, dto, user.id);
    return dto;
  }

  async reorder(workspaceId: string, user: User, input: ReorderTasksInput) {
    const settings = await this.getSettings(workspaceId);
    const taskIds = input.moves.map((move) => move.taskId);
    if (new Set(taskIds).size !== taskIds.length) {
      throw new BadRequestException('Duplicate task ids in moves');
    }

    const changed = await this.db.transaction(async (tx) => {
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
          this.assertAssignableStatus(settings, move.status, existing.status);
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

    const dtos = changed.map(({ before, after }) => {
      const dto = this.toDto(after);
      this.emitTaskEvent(DOMAIN_EVENTS.taskUpdated, dto, user.id, {
        previousAssigneeUserId: before.assigneeUserId,
        previousDueAt: toIso(before.dueAt),
      });
      const nextIsDone = Boolean(settings.statuses.find((item) => item.key === after.status)?.isDone);
      const previousIsDone = Boolean(
        settings.statuses.find((item) => item.key === before.status)?.isDone,
      );
      if (nextIsDone && !previousIsDone) {
        this.emitTaskEvent(DOMAIN_EVENTS.taskCompleted, dto, user.id);
      }
      return dto;
    });
    return dtos;
  }

  @OnEvent(DOMAIN_EVENTS.appInstalled)
  async onAppInstalled(event: AppInstalledEvent) {
    if (event.appKey !== 'tasks') return;
    const installed = await this.appsService.assertInstalled(event.workspaceId, 'tasks');
    if (taskSettingsSchema.safeParse(installed.config).success) return;
    await this.appsService.updateConfig(event.workspaceId, 'tasks', {
      ...structuredClone(DEFAULT_TASK_SETTINGS),
      ...installed.config,
    });
  }

  // Tasks intentionally keep rows on app.uninstalled so reinstall restores data.
  // AppInstalledGuard still blocks all task routes while the app is uninstalled.

  @OnEvent(DOMAIN_EVENTS.taskScheduled)
  onTaskScheduled(event: TaskDomainEvent) {
    this.logger.debug(`task.scheduled ${event.taskId} dueAt=${event.dueAt}`);
  }

  @OnEvent(DOMAIN_EVENTS.taskUpdated)
  onTaskUpdated(event: TaskDomainEvent) {
    this.logger.debug(`task.updated ${event.taskId}`);
  }

  @OnEvent(DOMAIN_EVENTS.taskCompleted)
  onTaskCompleted(event: TaskDomainEvent) {
    this.logger.debug(`task.completed ${event.taskId}`);
  }

  @OnEvent(DOMAIN_EVENTS.taskUnscheduled)
  onTaskUnscheduled(event: TaskDomainEvent) {
    this.logger.debug(`task.unscheduled ${event.taskId}`);
  }

  private resolveSettingsFromConfig(
    workspaceId: string,
    config: Record<string, unknown>,
    warnOnInvalid = true,
  ): TaskSettings {
    const parsed = taskSettingsSchema.safeParse(config);
    if (parsed.success) return parsed.data;
    const merged = { ...structuredClone(DEFAULT_TASK_SETTINGS), ...config };
    const mergedParsed = taskSettingsSchema.safeParse(merged);
    if (warnOnInvalid) {
      this.logger.warn(
        `Invalid tasks config for workspace ${workspaceId}; returning in-memory defaults`,
      );
    }
    return mergedParsed.success ? mergedParsed.data : structuredClone(DEFAULT_TASK_SETTINGS);
  }

  private assertUniqueKeys(settings: TaskSettings) {
    const statusKeys = settings.statuses.map((item) => item.key);
    const priorityKeys = settings.priorities.map((item) => item.key);
    if (new Set(statusKeys).size !== statusKeys.length) {
      throw new BadRequestException('Status keys must be unique');
    }
    if (new Set(priorityKeys).size !== priorityKeys.length) {
      throw new BadRequestException('Priority keys must be unique');
    }
  }

  private assertAssignableStatus(
    settings: TaskSettings,
    status: string,
    currentStatus?: string,
  ) {
    const option = settings.statuses.find((item) => item.key === status);
    if (!option) throw new BadRequestException(`Unknown status: ${status}`);
    if (!option.enabled && status !== currentStatus) {
      throw new BadRequestException(`Status "${status}" is disabled`);
    }
  }

  private assertAssignablePriority(
    settings: TaskSettings,
    priority: string,
    currentPriority?: string,
  ) {
    const option = settings.priorities.find((item) => item.key === priority);
    if (!option) throw new BadRequestException(`Unknown priority: ${priority}`);
    if (!option.enabled && priority !== currentPriority) {
      throw new BadRequestException(`Priority "${priority}" is disabled`);
    }
  }

  private async findInWorkspace(workspaceId: string, taskId: string): Promise<Task> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)),
      );
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private resolveWhenFields(
    input: {
      whenDate?: string | null;
      whenEvening?: boolean | null;
      isSomeday?: boolean | null;
      preferWhen?: boolean;
      preferSomeday?: boolean;
    },
    apply = true,
  ) {
    if (!apply) {
      return {
        whenDate: input.whenDate ?? null,
        whenEvening: Boolean(input.whenEvening),
        isSomeday: Boolean(input.isSomeday),
      };
    }
    if (input.preferSomeday || (input.isSomeday && !input.preferWhen)) {
      return { whenDate: null, whenEvening: false, isSomeday: true };
    }
    if (input.preferWhen || input.whenDate) {
      return {
        whenDate: input.whenDate ?? null,
        whenEvening: Boolean(input.whenEvening),
        isSomeday: false,
      };
    }
    return {
      whenDate: null,
      whenEvening: Boolean(input.whenEvening),
      isSomeday: false,
    };
  }

  private async lockProjectPositions(
    tx: NodePgDatabase,
    workspaceId: string,
    projectId: string | null,
  ) {
    const bucket = projectId ?? 'inbox';
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`task-pos:${workspaceId}:${bucket}`}))`,
    );
  }

  private async nextPositionInProject(
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

  private emitTaskEvent(
    eventName: string,
    dto: ReturnType<TasksService['toDto']>,
    actorUserId: string,
    extra?: Partial<Pick<TaskDomainEvent, 'previousAssigneeUserId' | 'previousDueAt'>>,
  ) {
    const payload: TaskDomainEvent = {
      workspaceId: dto.workspaceId,
      taskId: dto.id,
      projectId: dto.projectId,
      title: dto.title,
      status: dto.status,
      dueAt: dto.dueAt,
      assigneeUserIds: dto.assigneeUserId ? [dto.assigneeUserId] : [],
      actorUserId,
      previousAssigneeUserId: extra?.previousAssigneeUserId,
      previousDueAt: extra?.previousDueAt,
    };
    this.eventEmitter.emit(eventName, payload);
  }

  toDto(task: Task, extra?: { section?: 'today' | 'evening'; groupKey?: string }) {
    return {
      id: task.id,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: toIso(task.dueAt),
      whenDate: task.whenDate ? String(task.whenDate) : null,
      whenEvening: Boolean(task.whenEvening),
      isSomeday: Boolean(task.isSomeday),
      completedAt: toIso(task.completedAt),
      assigneeUserId: task.assigneeUserId,
      createdByUserId: task.createdByUserId,
      position: task.position,
      todayPosition: task.todayPosition ?? null,
      ...(extra?.section ? { section: extra.section } : {}),
      ...(extra?.groupKey ? { groupKey: extra.groupKey } : {}),
      createdAt: toIso(task.createdAt)!,
      updatedAt: toIso(task.updatedAt)!,
    };
  }
}

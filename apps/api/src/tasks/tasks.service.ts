import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DEFAULT_TASK_SETTINGS,
  nextTaskOccurrenceDateKey,
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
import { TaskOrderingService } from './task-ordering.service.js';
import { TaskQueryService } from './task-query.service.js';
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
    private readonly taskQueryService: TaskQueryService,
    private readonly taskOrderingService: TaskOrderingService,
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
      const rows = await this.taskQueryService.listByView(workspaceId, userId, query, doneKeys);
      return rows.map(({ task, section, groupKey }) => this.toDto(task, { section, groupKey }));
    }
    const rows = await this.taskQueryService.list(workspaceId, userId, query, doneKeys);
    return rows.map((row) => this.toDto(row));
  }

  async listByView(workspaceId: string, userId: string, query: ListTasksQuery, doneKeys: string[]) {
    const rows = await this.taskQueryService.listByView(workspaceId, userId, query, doneKeys);
    return rows.map(({ task, section, groupKey }) => this.toDto(task, { section, groupKey }));
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

  async counts(workspaceId: string, tz: string) {
    const settings = await this.getSettings(workspaceId);
    const doneKeys = settings.statuses.filter((item) => item.isDone).map((item) => item.key);
    const projects = await this.countsByProject(workspaceId);
    const views = {
      inbox: (await this.listByView(workspaceId, '', { view: 'inbox', tz }, doneKeys)).length,
      today: (await this.listByView(workspaceId, '', { view: 'today', tz }, doneKeys)).length,
      upcoming: (await this.listByView(workspaceId, '', { view: 'upcoming', tz }, doneKeys)).length,
      anytime: (await this.listByView(workspaceId, '', { view: 'anytime', tz }, doneKeys)).length,
      someday: (await this.listByView(workspaceId, '', { view: 'someday', tz }, doneKeys)).length,
      logbook: 0,
    };
    return { views, projects };
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
      await this.assertAssigneeIsMember(workspaceId, assigneeUserId);
    }
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    const isDone = Boolean(settings.statuses.find((item) => item.key === status)?.isDone);
    const row = await this.db.transaction(async (tx) => {
      await this.taskOrderingService.lockProjectPositions(tx, workspaceId, projectId);
      const nextPosition = await this.taskOrderingService.nextPositionInProject(tx, workspaceId, projectId);
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
          recurrenceRrule: this.normalizeRecurrence(input.recurrenceRrule),
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
      await this.assertAssigneeIsMember(workspaceId, input.assigneeUserId);
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
    const nextRecurrence =
      input.recurrenceRrule === undefined
        ? existing.recurrenceRrule
        : this.normalizeRecurrence(input.recurrenceRrule);
    const shouldSpawnNext =
      Boolean(nextRecurrence) && nextIsDone && !previousIsDone && nextStatus !== 'cancelled';
    const row = await this.db.transaction(async (tx) => {
      let nextPosition = input.position;
      if (projectChanged) {
        await this.taskOrderingService.lockProjectPositions(tx, workspaceId, input.projectId ?? null);
        nextPosition = await this.taskOrderingService.nextPositionInProject(tx, workspaceId, input.projectId ?? null);
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
          ...(input.recurrenceRrule !== undefined ? { recurrenceRrule: nextRecurrence } : {}),
          ...(input.status !== undefined || nextIsDone !== previousIsDone ? { completedAt } : {}),
          ...(projectChanged || input.position !== undefined ? { position: nextPosition } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
        .returning();
      if (!updated) throw new NotFoundException('Task not found');
      const spawned = shouldSpawnNext
        ? await this.insertNextOccurrence(tx, updated, nextRecurrence!, existing.status)
        : null;
      return { updated, spawned };
    });
    const dto = this.toDto(row.updated);
    if (row.spawned) {
      this.emitTaskEvent(DOMAIN_EVENTS.taskUpdated, this.toDto(row.spawned), user.id);
    }
    this.emitTaskEvent(DOMAIN_EVENTS.taskUpdated, dto, user.id, {
      previousAssigneeUserId,
      previousDueAt: toIso(previousDueAt),
    });
    if (nextIsDone && !previousIsDone) {
      this.emitTaskEvent(DOMAIN_EVENTS.taskCompleted, dto, user.id);
    }
    const hadDue = Boolean(previousDueAt);
    const hasDue = Boolean(row.updated.dueAt);
    if (!hadDue && hasDue) this.emitTaskEvent(DOMAIN_EVENTS.taskScheduled, dto, user.id);
    if (hadDue && !hasDue) this.emitTaskEvent(DOMAIN_EVENTS.taskUnscheduled, dto, user.id);
    if (hadDue && hasDue && previousDueAt?.getTime() !== row.updated.dueAt?.getTime()) {
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
    const changed = await this.taskOrderingService.reorder(
      workspaceId,
      input,
      settings,
      (status, currentStatus) => this.assertAssignableStatus(settings, status, currentStatus),
    );

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
    for (const { before, after } of changed) {
      const nextIsDone = Boolean(settings.statuses.find((item) => item.key === after.status)?.isDone);
      const previousIsDone = Boolean(settings.statuses.find((item) => item.key === before.status)?.isDone);
      if (!nextIsDone || previousIsDone || after.status === 'cancelled' || !after.recurrenceRrule) continue;
      const spawned = await this.db.transaction(async (tx) =>
        this.insertNextOccurrence(tx, after, after.recurrenceRrule!, before.status),
      );
      if (spawned) this.emitTaskEvent(DOMAIN_EVENTS.taskUpdated, this.toDto(spawned), user.id);
    }
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
    if (parsed.success) return this.normalizeClosedStatuses(parsed.data);
    const merged = { ...structuredClone(DEFAULT_TASK_SETTINGS), ...config };
    const mergedParsed = taskSettingsSchema.safeParse(merged);
    if (warnOnInvalid) {
      this.logger.warn(
        `Invalid tasks config for workspace ${workspaceId}; returning in-memory defaults`,
      );
    }
    const fallback = mergedParsed.success ? mergedParsed.data : structuredClone(DEFAULT_TASK_SETTINGS);
    return this.normalizeClosedStatuses(fallback);
  }

  /** Treat cancelled as closed when workspaces still store the pre-isDone default. */
  private normalizeClosedStatuses(settings: TaskSettings): TaskSettings {
    let changed = false;
    const statuses = settings.statuses.map((item) => {
      if (item.key === 'cancelled' && item.isDone === undefined) {
        changed = true;
        return { ...item, isDone: true };
      }
      return item;
    });
    return changed ? { ...settings, statuses } : settings;
  }

  private async assertAssigneeIsMember(workspaceId: string, assigneeUserId: string) {
    const member = await this.workspacesService.findActiveMember(workspaceId, assigneeUserId);
    if (!member || !(READ_ROLES as readonly string[]).includes(member.role)) {
      throw new BadRequestException('Assignee must be an active workspace member');
    }
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

  private normalizeRecurrence(value: string | null | undefined) {
    if (value == null || value === '') return null;
    return value;
  }

  private async insertNextOccurrence(
    tx: NodePgDatabase,
    completed: Task,
    rrule: string,
    openStatus: string,
  ) {
    const planned = completed.whenDate ? String(completed.whenDate).slice(0, 10) : null;
    const completedKey = (completed.completedAt ?? new Date()).toISOString().slice(0, 10);
    const anchor = planned && planned > completedKey ? planned : completedKey;
    const whenDate = nextTaskOccurrenceDateKey(rrule, anchor);
    if (!whenDate) return null;
    await this.taskOrderingService.lockProjectPositions(tx, completed.workspaceId, completed.projectId);
    const position = await this.taskOrderingService.nextPositionInProject(
      tx,
      completed.workspaceId,
      completed.projectId,
    );
    const [created] = await tx
      .insert(tasks)
      .values({
        workspaceId: completed.workspaceId,
        projectId: completed.projectId,
        title: completed.title,
        description: completed.description,
        status: openStatus,
        priority: completed.priority,
        dueAt: null,
        whenDate,
        whenEvening: completed.whenEvening,
        isSomeday: false,
        recurrenceRrule: rrule,
        completedAt: null,
        assigneeUserId: completed.assigneeUserId,
        createdByUserId: completed.createdByUserId,
        position,
      })
      .returning();
    return created ?? null;
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
      recurrenceRrule: task.recurrenceRrule ?? null,
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

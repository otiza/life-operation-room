import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, inArray, isNotNull, isNull, lte, or, sql, gte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DEFAULT_CALENDAR_SETTINGS,
  calendarDateKeyInTimeZone,
  calendarSettingsSchema,
  type CreateCalendarEventInput,
  type CreateTimeBlockInput,
  type CalendarSettings,
  type DeleteCalendarEventInput,
  type ListCalendarEventsQuery,
  type UndoCalendarDeleteInput,
  type UpdateCalendarEventInput,
  type UpdateCalendarSettingsInput,
} from '@life-room/shared';
import {
  calendarEventExceptions,
  calendarEvents,
  calendarFeedTokens,
  workspaceApps,
  workspaceMembers,
  type User,
} from '../db/schema.js';
import {
  DOMAIN_EVENTS,
  type AppInstalledEvent,
  type MemberRemovedEvent,
} from '../common/events/domain-events.js';
import { createSessionToken, hashToken, toIso } from '../common/utils/crypto.js';
import { AppsService } from '../apps/apps.service.js';
import { LinksService } from '../links/links.service.js';
import { TaskReferencesService } from '../tasks/task-references.service.js';
import { addCalendarDays, calendarEventToDto } from './calendar-mappers.js';
import { CalendarSeriesService } from './calendar-series.service.js';
import { serializeIcsCalendar } from './ics.js';
import { RecurrenceService } from './recurrence.service.js';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly appsService: AppsService,
    private readonly linksService: LinksService,
    private readonly taskReferencesService: TaskReferencesService,
    private readonly recurrenceService: RecurrenceService,
    private readonly seriesService: CalendarSeriesService,
  ) {}

  async getSettings(workspaceId: string): Promise<CalendarSettings> {
    const row = await this.appsService.assertInstalled(workspaceId, 'calendar');
    return this.resolveSettings(row.config);
  }

  async updateSettings(workspaceId: string, input: UpdateCalendarSettingsInput): Promise<CalendarSettings> {
    const current = await this.getSettings(workspaceId);
    const next = calendarSettingsSchema.parse({ ...current, ...input });
    await this.appsService.updateConfig(workspaceId, 'calendar', next);
    return next;
  }

  async listOccurrences(workspaceId: string, query: ListCalendarEventsQuery) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const masters = await this.loadMastersInRange(workspaceId, from, to);
    const masterIds = masters.map((row) => row.id);
    const exceptions = masterIds.length
      ? await this.db
          .select()
          .from(calendarEventExceptions)
          .where(
            and(
              eq(calendarEventExceptions.workspaceId, workspaceId),
              inArray(calendarEventExceptions.eventId, masterIds),
            ),
          )
      : [];
    const exceptionsByEvent = new Map<string, typeof exceptions>();
    for (const item of exceptions) {
      const list = exceptionsByEvent.get(item.eventId) ?? [];
      list.push(item);
      exceptionsByEvent.set(item.eventId, list);
    }

    const timeBlockLinks = await this.linksService.listBySource(workspaceId, 'calendar', 'time_block');
    const taskIdByEventId = new Map(
      timeBlockLinks.map((link) => [link.sourceRef, link.targetRef] as const),
    );
    const linkedTaskIds = [...new Set([...taskIdByEventId.values()])];
    const tasksById = await this.taskReferencesService.findTasksInWorkspace(workspaceId, linkedTaskIds);

    const occurrences = [];
    for (const master of masters) {
      let expanded;
      try {
        expanded = this.recurrenceService.expandEvent(
          master,
          exceptionsByEvent.get(master.id) ?? [],
          from,
          to,
        );
      } catch (error) {
        this.logger.warn(
          `Skipping calendar event ${master.id}: invalid recurrence (${error instanceof Error ? error.message : 'unknown'})`,
        );
        continue;
      }
      for (const item of expanded) {
        if (item.cancelled) continue;
        const taskId = taskIdByEventId.get(item.eventId);
        let taskAnnotation:
          | { taskId: string; status: string | null; deleted: boolean; isDone: boolean }
          | undefined;
        if (taskId) {
          const task = tasksById.get(taskId);
          taskAnnotation = task
            ? { taskId, status: task.status, deleted: false, isDone: task.isDone }
            : { taskId, status: null, deleted: true, isDone: false };
        }
        occurrences.push({
          eventId: item.eventId,
          occurrenceStart: item.isAllDay
            ? calendarDateKeyInTimeZone(item.occurrenceStart, 'UTC')
            : item.occurrenceStart.toISOString(),
          isRecurring: item.isRecurring,
          title: item.title,
          description: item.description,
          location: item.location,
          isAllDay: item.isAllDay,
          startAt: toIso(item.startAt),
          endAt: toIso(item.endAt),
          startDate: item.startDate,
          endDate: item.endDate,
          timezone: item.timezone,
          rrule: master.rrule,
          kind: master.kind as 'event' | 'time_block',
          color: item.color,
          source: master.source,
          externalId: master.externalId,
          createdByUserId: master.createdByUserId,
          ...(taskAnnotation ? { task: taskAnnotation } : {}),
        });
      }
    }

    if (await this.isTasksInstalled(workspaceId)) {
      const dueTasks = await this.taskReferencesService.listDueInRange(workspaceId, from, to);
      for (const task of dueTasks) {
        if (!task.dueAt) continue;
        const dueDate = calendarDateKeyInTimeZone(new Date(task.dueAt), query.tz);
        const nextDate = addCalendarDays(dueDate, 1);
        occurrences.push({
          eventId: task.id,
          occurrenceStart: dueDate,
          isRecurring: false,
          title: task.title,
          description: null,
          location: null,
          isAllDay: true,
          startAt: null,
          endAt: null,
          startDate: dueDate,
          endDate: nextDate,
          timezone: query.tz,
          rrule: null,
          kind: 'due_chip' as const,
          color: null,
          source: 'tasks',
          externalId: null,
          createdByUserId: null,
          task: { taskId: task.id, status: task.status, deleted: false, isDone: task.isDone },
        });
      }
    }

    occurrences.sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
    return occurrences;
  }

  async create(workspaceId: string, user: User, input: CreateCalendarEventInput) {
    this.assertTiming(input);
    this.assertRrule(input.rrule);
    const [row] = await this.db
      .insert(calendarEvents)
      .values({
        workspaceId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        isAllDay: input.isAllDay,
        startAt: input.isAllDay ? null : new Date(input.startAt),
        endAt: input.isAllDay ? null : new Date(input.endAt),
        startDate: input.isAllDay ? input.startDate : null,
        endDate: input.isAllDay ? input.endDate : null,
        timezone: input.timezone,
        rrule: input.rrule ?? null,
        kind: input.kind ?? 'event',
        color: input.color ?? null,
        createdByUserId: user.id,
        source: 'local',
      })
      .returning();
    return calendarEventToDto(row);
  }

  async update(workspaceId: string, eventId: string, user: User, input: UpdateCalendarEventInput) {
    const event = await this.findActive(workspaceId, eventId);
    const scope = input.scope ?? 'all';
    if (input.rrule !== undefined) this.assertRrule(input.rrule);

    if (!event.rrule || scope === 'all') {
      return this.seriesService.patchMaster(workspaceId, event, input);
    }

    if (!input.occurrenceStart) {
      throw new BadRequestException('occurrenceStart is required for this/following scope');
    }
    const occurrenceStart = new Date(input.occurrenceStart);

    if (scope === 'this') {
      await this.seriesService.upsertException(workspaceId, event, occurrenceStart, {
        cancelled: false,
        title: input.title,
        description: input.description,
        location: input.location,
        timezone: input.timezone,
        isAllDay: input.isAllDay,
        startAt: input.startAt === undefined ? undefined : input.startAt ? new Date(input.startAt) : null,
        endAt: input.endAt === undefined ? undefined : input.endAt ? new Date(input.endAt) : null,
        startDate: input.startDate === undefined ? undefined : input.startDate,
        endDate: input.endDate === undefined ? undefined : input.endDate,
      });
      return calendarEventToDto(event);
    }

    return this.seriesService.splitFollowing(workspaceId, event, user, input, occurrenceStart);
  }

  async remove(workspaceId: string, eventId: string, input: DeleteCalendarEventInput) {
    const event = await this.findActive(workspaceId, eventId);
    const scope = input.scope ?? 'all';

    if (!event.rrule || scope === 'all') {
      await this.db
        .update(calendarEvents)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.workspaceId, workspaceId)));
      return { ok: true, undo: { kind: 'soft_delete' as const, eventId } };
    }

    if (!input.occurrenceStart) {
      throw new BadRequestException('occurrenceStart is required for this/following scope');
    }
    const occurrenceStart = new Date(input.occurrenceStart);

    if (scope === 'this') {
      await this.seriesService.upsertException(workspaceId, event, occurrenceStart, { cancelled: true });
      return {
        ok: true,
        undo: {
          kind: 'cancel_exception' as const,
          eventId,
          occurrenceStart: occurrenceStart.toISOString(),
        },
      };
    }

    const previousRrule = event.rrule;
    const untilRrule = this.recurrenceService.untilBeforeOccurrence(
      event.rrule,
      occurrenceStart,
      event.timezone,
      event.isAllDay,
    );
    await this.db
      .update(calendarEvents)
      .set({ rrule: untilRrule, updatedAt: new Date() })
      .where(and(eq(calendarEvents.id, event.id), eq(calendarEvents.workspaceId, workspaceId)));
    return {
      ok: true,
      undo: { kind: 'rrule_truncate' as const, eventId, previousRrule },
    };
  }

  async restore(workspaceId: string, eventId: string) {
    const [event] = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, eventId),
          eq(calendarEvents.workspaceId, workspaceId),
          isNotNull(calendarEvents.deletedAt),
        ),
      );
    if (!event) throw new NotFoundException('Event not found');
    const [row] = await this.db
      .update(calendarEvents)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.workspaceId, workspaceId)))
      .returning();
    if (!row) throw new NotFoundException('Event not found');
    return calendarEventToDto(row);
  }

  async undoDelete(workspaceId: string, input: UndoCalendarDeleteInput) {
    if (input.kind === 'soft_delete') {
      return { event: await this.restore(workspaceId, input.eventId) };
    }
    if (input.kind === 'cancel_exception') {
      const occurrenceStart = new Date(input.occurrenceStart);
      const [existing] = await this.db
        .select()
        .from(calendarEventExceptions)
        .where(
          and(
            eq(calendarEventExceptions.workspaceId, workspaceId),
            eq(calendarEventExceptions.eventId, input.eventId),
            eq(calendarEventExceptions.originalOccurrenceStart, occurrenceStart),
            eq(calendarEventExceptions.cancelled, true),
          ),
        );
      if (!existing) throw new NotFoundException('Cancellation exception not found');
      const hasOverrides =
        existing.title != null ||
        existing.description != null ||
        existing.location != null ||
        existing.startAt != null ||
        existing.endAt != null ||
        existing.startDate != null ||
        existing.endDate != null;
      if (hasOverrides) {
        await this.db
          .update(calendarEventExceptions)
          .set({ cancelled: false, updatedAt: new Date() })
          .where(eq(calendarEventExceptions.id, existing.id));
      } else {
        await this.db.delete(calendarEventExceptions).where(eq(calendarEventExceptions.id, existing.id));
      }
      return { ok: true };
    }
    const [row] = await this.db
      .update(calendarEvents)
      .set({ rrule: input.previousRrule, updatedAt: new Date() })
      .where(
        and(
          eq(calendarEvents.id, input.eventId),
          eq(calendarEvents.workspaceId, workspaceId),
          isNull(calendarEvents.deletedAt),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException('Event not found');
    return { event: calendarEventToDto(row) };
  }

  async createTimeBlock(workspaceId: string, user: User, input: CreateTimeBlockInput) {
    const task = await this.taskReferencesService.assertTaskInWorkspace(workspaceId, input.taskId);
    const timezone = input.timezone ?? 'UTC';
    const event = await this.create(workspaceId, user, {
      title: task.title,
      description: null,
      location: null,
      isAllDay: false,
      startAt: input.start,
      endAt: input.end,
      timezone,
      kind: 'time_block',
      rrule: null,
      color: null,
    });
    await this.linksService.create({
      workspaceId,
      sourceApp: 'calendar',
      sourceRef: event.id,
      targetApp: 'tasks',
      targetRef: task.id,
      linkType: 'time_block',
    });
    const whenDate = calendarDateKeyInTimeZone(new Date(input.start), timezone);
    await this.taskReferencesService.setWhenDate(workspaceId, task.id, whenDate);
    return event;
  }

  async getIcsTokenStatus(workspaceId: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(calendarFeedTokens)
      .where(
        and(
          eq(calendarFeedTokens.workspaceId, workspaceId),
          eq(calendarFeedTokens.userId, userId),
          isNull(calendarFeedTokens.revokedAt),
        ),
      );
    return {
      exists: Boolean(row),
      createdAt: row ? toIso(row.createdAt) : null,
    };
  }

  async regenerateIcsToken(workspaceId: string, userId: string) {
    await this.db
      .update(calendarFeedTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(calendarFeedTokens.workspaceId, workspaceId),
          eq(calendarFeedTokens.userId, userId),
          isNull(calendarFeedTokens.revokedAt),
        ),
      );
    const token = createSessionToken();
    const [row] = await this.db
      .insert(calendarFeedTokens)
      .values({
        workspaceId,
        userId,
        tokenHash: hashToken(token),
      })
      .returning();
    return {
      token,
      urlPath: `/calendar/ics/${token}.ics`,
      createdAt: toIso(row.createdAt)!,
    };
  }

  async revokeIcsToken(workspaceId: string, userId: string) {
    await this.db
      .update(calendarFeedTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(calendarFeedTokens.workspaceId, workspaceId),
          eq(calendarFeedTokens.userId, userId),
          isNull(calendarFeedTokens.revokedAt),
        ),
      );
    return { ok: true };
  }

  async renderIcsFeed(rawToken: string): Promise<string> {
    const token = rawToken.replace(/\.ics$/i, '');
    const [row] = await this.db
      .select()
      .from(calendarFeedTokens)
      .where(and(eq(calendarFeedTokens.tokenHash, hashToken(token)), isNull(calendarFeedTokens.revokedAt)));
    if (!row) throw new UnauthorizedException('Invalid or revoked calendar feed token');

    const [member] = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, row.workspaceId),
          eq(workspaceMembers.userId, row.userId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
    const [installed] = await this.db
      .select({ id: workspaceApps.id })
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, row.workspaceId), eq(workspaceApps.appKey, 'calendar')));
    if (!member || !installed) throw new NotFoundException();

    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const masters = await this.loadMastersInRange(row.workspaceId, from, to);
    const masterIds = masters.map((item) => item.id);
    const exceptions = masterIds.length
      ? await this.db
          .select()
          .from(calendarEventExceptions)
          .where(inArray(calendarEventExceptions.eventId, masterIds))
      : [];
    const byEvent = new Map<string, typeof exceptions>();
    for (const item of exceptions) {
      const list = byEvent.get(item.eventId) ?? [];
      list.push(item);
      byEvent.set(item.eventId, list);
    }
    return serializeIcsCalendar(
      masters.map((event) => ({ event, exceptions: byEvent.get(event.id) ?? [] })),
      'Life Room Calendar',
    );
  }

  @OnEvent(DOMAIN_EVENTS.memberRemoved)
  async onMemberRemoved(event: MemberRemovedEvent) {
    await this.db
      .update(calendarFeedTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(calendarFeedTokens.workspaceId, event.workspaceId),
          eq(calendarFeedTokens.userId, event.userId),
          isNull(calendarFeedTokens.revokedAt),
        ),
      );
  }

  @OnEvent(DOMAIN_EVENTS.appInstalled)
  async onAppInstalled(event: AppInstalledEvent) {
    if (event.appKey !== 'calendar') return;
    const [installed] = await this.db
      .select()
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, event.workspaceId), eq(workspaceApps.appKey, 'calendar')));
    if (!installed) return;
    const parsed = calendarSettingsSchema.safeParse(installed.config);
    if (parsed.success) return;
    await this.appsService.updateConfig(event.workspaceId, 'calendar', DEFAULT_CALENDAR_SETTINGS);
  }


  private async loadMastersInRange(workspaceId: string, from: Date, to: Date) {
    const fromDate = calendarDateKeyInTimeZone(from, 'UTC');
    const toDate = calendarDateKeyInTimeZone(to, 'UTC');
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.workspaceId, workspaceId),
          isNull(calendarEvents.deletedAt),
          or(
            and(
              eq(calendarEvents.isAllDay, false),
              or(
                isNotNull(calendarEvents.rrule),
                and(
                  isNotNull(calendarEvents.startAt),
                  isNotNull(calendarEvents.endAt),
                  lte(calendarEvents.startAt, to),
                  gte(calendarEvents.endAt, from),
                ),
              ),
            ),
            and(
              eq(calendarEvents.isAllDay, true),
              or(
                isNotNull(calendarEvents.rrule),
                and(
                  isNotNull(calendarEvents.startDate),
                  isNotNull(calendarEvents.endDate),
                  sql`${calendarEvents.startDate} < ${toDate}`,
                  sql`${calendarEvents.endDate} > ${fromDate}`,
                ),
              ),
            ),
          ),
        ),
      );
    return rows.filter((event) => {
      if (!event.rrule) return true;
      if (event.isAllDay) {
        if (event.startDate && event.startDate >= toDate) return false;
      } else if (event.startAt && event.startAt.getTime() > to.getTime()) {
        return false;
      }
      const until = this.recurrenceService.parseUntilUtc(event.rrule);
      if (until && until.getTime() < from.getTime()) return false;
      return true;
    });
  }

  private async findActive(workspaceId: string, eventId: string) {
    const [event] = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, eventId),
          eq(calendarEvents.workspaceId, workspaceId),
          isNull(calendarEvents.deletedAt),
        ),
      );
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private assertTiming(input: CreateCalendarEventInput) {
    if (input.isAllDay) {
      if (input.endDate <= input.startDate) {
        throw new BadRequestException('endDate must be after startDate');
      }
      return;
    }
    if (input.endAt <= input.startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
  }

  private assertRrule(rrule: string | null | undefined) {
    if (rrule == null || rrule === '') return;
    try {
      this.recurrenceService.assertValidRrule(rrule);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? `Invalid rrule: ${error.message}` : 'Invalid rrule',
      );
    }
  }

  private resolveSettings(config: Record<string, unknown>): CalendarSettings {
    const parsed = calendarSettingsSchema.safeParse(config);
    if (parsed.success) return parsed.data;
    this.logger.warn('Invalid calendar settings in workspace_apps.config; using defaults');
    return { ...DEFAULT_CALENDAR_SETTINGS };
  }

  private async isTasksInstalled(workspaceId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: workspaceApps.id })
      .from(workspaceApps)
      .where(and(eq(workspaceApps.workspaceId, workspaceId), eq(workspaceApps.appKey, 'tasks')));
    return Boolean(row);
  }

  toDto(event: Parameters<typeof calendarEventToDto>[0]) {
    return calendarEventToDto(event);
  }
}

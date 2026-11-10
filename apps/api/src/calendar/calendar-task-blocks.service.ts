import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CreateTimeBlockInput } from '@erp-tiza/shared';
import { calendarEvents, type User } from '../db/schema.js';
import { DOMAIN_EVENTS, type TaskDomainEvent } from '../common/events/domain-events.js';
import { LinksService } from '../links/links.service.js';
import { TaskReferencesService } from '../tasks/task-references.service.js';
import { CalendarService } from './calendar.service.js';

@Injectable()
export class CalendarTaskBlocksService {
  private readonly logger = new Logger(CalendarTaskBlocksService.name);

  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly linksService: LinksService,
    private readonly taskReferencesService: TaskReferencesService,
    @Inject(forwardRef(() => CalendarService))
    private readonly calendarService: CalendarService,
  ) {}

  async createTimeBlock(workspaceId: string, user: User, input: CreateTimeBlockInput) {
    const task = await this.taskReferencesService.assertTaskInWorkspace(workspaceId, input.taskId);
    const event = await this.calendarService.create(workspaceId, user, {
      title: task.title,
      description: null,
      location: null,
      isAllDay: false,
      startAt: input.start,
      endAt: input.end,
      timezone: 'UTC',
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
    return event;
  }

  @OnEvent(DOMAIN_EVENTS.taskUpdated)
  async onTaskUpdated(event: TaskDomainEvent) {
    const links = await this.linksService.listByTarget(
      event.workspaceId,
      'tasks',
      event.taskId,
      'time_block',
    );
    for (const link of links) {
      await this.db
        .update(calendarEvents)
        .set({ title: event.title, updatedAt: new Date() })
        .where(
          and(
            eq(calendarEvents.id, link.sourceRef),
            eq(calendarEvents.workspaceId, event.workspaceId),
            eq(calendarEvents.kind, 'time_block'),
            isNull(calendarEvents.deletedAt),
          ),
        );
    }
  }

  @OnEvent(DOMAIN_EVENTS.taskDeleted)
  onTaskDeleted(event: TaskDomainEvent) {
    this.logger.debug(`task.deleted ${event.taskId} — linked time blocks kept`);
  }

  @OnEvent(DOMAIN_EVENTS.taskRestored)
  onTaskRestored(event: TaskDomainEvent) {
    this.logger.debug(`task.restored ${event.taskId}`);
  }

  @OnEvent(DOMAIN_EVENTS.taskCompleted)
  onTaskCompleted(event: TaskDomainEvent) {
    this.logger.debug(`task.completed ${event.taskId}`);
  }
}

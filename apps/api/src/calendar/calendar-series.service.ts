import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, gte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  calendarDateKeyInTimeZone,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from '@erp-tiza/shared';
import { calendarEventExceptions, calendarEvents, type CalendarEvent, type User } from '../db/schema.js';
import { addCalendarDays, calendarEventToDto } from './calendar-mappers.js';
import { RecurrenceService } from './recurrence.service.js';

@Injectable()
export class CalendarSeriesService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly recurrenceService: RecurrenceService,
  ) {}

  async patchMaster(workspaceId: string, event: CalendarEvent, input: UpdateCalendarEventInput) {
    const isAllDay = input.isAllDay ?? event.isAllDay;
    const nextStartAt = isAllDay
      ? null
      : input.startAt
        ? new Date(input.startAt)
        : event.startAt;
    const startDeltaMs =
      !isAllDay && event.startAt && nextStartAt
        ? nextStartAt.getTime() - event.startAt.getTime()
        : 0;

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(calendarEvents)
        .set({
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
          ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.rrule !== undefined ? { rrule: input.rrule } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          isAllDay,
          startAt: nextStartAt,
          endAt: isAllDay ? null : input.endAt ? new Date(input.endAt) : event.endAt,
          startDate: isAllDay ? (input.startDate ?? event.startDate) : null,
          endDate: isAllDay ? (input.endDate ?? event.endDate) : null,
          updatedAt: new Date(),
        })
        .where(and(eq(calendarEvents.id, event.id), eq(calendarEvents.workspaceId, workspaceId)))
        .returning();
      if (!row) throw new NotFoundException('Event not found');

      if (startDeltaMs !== 0) {
        const exceptions = await tx
          .select()
          .from(calendarEventExceptions)
          .where(eq(calendarEventExceptions.eventId, event.id));
        for (const exception of exceptions) {
          await tx
            .update(calendarEventExceptions)
            .set({
              originalOccurrenceStart: new Date(
                exception.originalOccurrenceStart.getTime() + startDeltaMs,
              ),
              startAt: exception.startAt
                ? new Date(exception.startAt.getTime() + startDeltaMs)
                : exception.startAt,
              endAt: exception.endAt
                ? new Date(exception.endAt.getTime() + startDeltaMs)
                : exception.endAt,
              updatedAt: new Date(),
            })
            .where(eq(calendarEventExceptions.id, exception.id));
        }
      }
      return calendarEventToDto(row);
    });
  }

  async splitFollowing(
    workspaceId: string,
    event: CalendarEvent,
    user: User,
    input: UpdateCalendarEventInput,
    occurrenceStart: Date,
  ) {
    if (!event.rrule) throw new BadRequestException('Event is not recurring');
    const untilRrule = this.recurrenceService.untilBeforeOccurrence(
      event.rrule,
      occurrenceStart,
      event.timezone,
      event.isAllDay,
    );
    const createInput = this.buildCreateFromPatch(event, input, occurrenceStart);
    const seriesStart = event.isAllDay
      ? new Date(`${event.startDate}T00:00:00.000Z`)
      : event.startAt!;
    const remaining = this.recurrenceService.remainingCountAfterSplit(
      event.rrule,
      seriesStart,
      occurrenceStart,
      event.timezone,
      event.isAllDay,
    );
    if (remaining != null && createInput.rrule) {
      createInput.rrule = this.recurrenceService.withCount(createInput.rrule, remaining);
    }

    return this.db.transaction(async (tx) => {
      await tx
        .update(calendarEvents)
        .set({ rrule: untilRrule, updatedAt: new Date() })
        .where(and(eq(calendarEvents.id, event.id), eq(calendarEvents.workspaceId, workspaceId)));

      const [created] = await tx
        .insert(calendarEvents)
        .values({
          workspaceId,
          title: createInput.title.trim(),
          description: createInput.description?.trim() || null,
          location: createInput.location?.trim() || null,
          isAllDay: createInput.isAllDay,
          startAt: createInput.isAllDay ? null : new Date(createInput.startAt),
          endAt: createInput.isAllDay ? null : new Date(createInput.endAt),
          startDate: createInput.isAllDay ? createInput.startDate : null,
          endDate: createInput.isAllDay ? createInput.endDate : null,
          timezone: createInput.timezone,
          rrule: createInput.rrule ?? null,
          kind: createInput.kind ?? 'event',
          color: createInput.color ?? null,
          createdByUserId: user.id,
          source: 'local',
        })
        .returning();

      const exceptions = await tx
        .select()
        .from(calendarEventExceptions)
        .where(
          and(
            eq(calendarEventExceptions.eventId, event.id),
            eq(calendarEventExceptions.workspaceId, workspaceId),
            gte(calendarEventExceptions.originalOccurrenceStart, occurrenceStart),
          ),
        );
      for (const exception of exceptions) {
        await tx
          .update(calendarEventExceptions)
          .set({ eventId: created.id, updatedAt: new Date() })
          .where(eq(calendarEventExceptions.id, exception.id));
      }
      return calendarEventToDto(created);
    });
  }

  async upsertException(
    workspaceId: string,
    event: CalendarEvent,
    occurrenceStart: Date,
    patch: {
      cancelled: boolean;
      title?: string;
      description?: string | null;
      location?: string | null;
      timezone?: string;
      isAllDay?: boolean;
      startAt?: Date | null;
      endAt?: Date | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) {
    const [existing] = await this.db
      .select()
      .from(calendarEventExceptions)
      .where(
        and(
          eq(calendarEventExceptions.eventId, event.id),
          eq(calendarEventExceptions.originalOccurrenceStart, occurrenceStart),
        ),
      );
    if (existing) {
      await this.db
        .update(calendarEventExceptions)
        .set({
          cancelled: patch.cancelled,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.location !== undefined ? { location: patch.location } : {}),
          ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
          ...(patch.isAllDay !== undefined ? { isAllDay: patch.isAllDay } : {}),
          ...(patch.startAt !== undefined ? { startAt: patch.startAt } : {}),
          ...(patch.endAt !== undefined ? { endAt: patch.endAt } : {}),
          ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
          ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
          updatedAt: new Date(),
        })
        .where(eq(calendarEventExceptions.id, existing.id));
      return;
    }
    await this.db.insert(calendarEventExceptions).values({
      eventId: event.id,
      workspaceId,
      originalOccurrenceStart: occurrenceStart,
      cancelled: patch.cancelled,
      title: patch.title ?? null,
      description: patch.description ?? null,
      location: patch.location ?? null,
      timezone: patch.timezone ?? null,
      isAllDay: patch.isAllDay ?? null,
      startAt: patch.startAt ?? null,
      endAt: patch.endAt ?? null,
      startDate: patch.startDate ?? null,
      endDate: patch.endDate ?? null,
    });
  }

  buildCreateFromPatch(
    event: CalendarEvent,
    input: UpdateCalendarEventInput,
    occurrenceStart: Date,
  ): CreateCalendarEventInput {
    const isAllDay = input.isAllDay ?? event.isAllDay;
    const title = input.title ?? event.title;
    const timezone = input.timezone ?? event.timezone;
    const rrule = input.rrule === undefined ? event.rrule : input.rrule;
    if (isAllDay) {
      const startDate =
        input.startDate ??
        (event.isAllDay ? event.startDate! : calendarDateKeyInTimeZone(occurrenceStart, timezone));
      const endDate =
        input.endDate ??
        (event.isAllDay
          ? event.endDate!
          : addCalendarDays(calendarDateKeyInTimeZone(occurrenceStart, timezone), 1));
      return {
        title,
        description: input.description === undefined ? event.description : input.description,
        location: input.location === undefined ? event.location : input.location,
        isAllDay: true,
        startDate,
        endDate,
        timezone,
        rrule,
        kind: event.kind === 'time_block' ? 'time_block' : 'event',
        color: input.color === undefined ? event.color : input.color,
      };
    }
    const startAt = input.startAt ?? occurrenceStart.toISOString();
    const duration =
      event.startAt && event.endAt ? event.endAt.getTime() - event.startAt.getTime() : 60 * 60_000;
    const endAt = input.endAt ?? new Date(new Date(startAt).getTime() + duration).toISOString();
    return {
      title,
      description: input.description === undefined ? event.description : input.description,
      location: input.location === undefined ? event.location : input.location,
      isAllDay: false,
      startAt,
      endAt,
      timezone,
      rrule,
      kind: event.kind === 'time_block' ? 'time_block' : 'event',
      color: input.color === undefined ? event.color : input.color,
    };
  }
}

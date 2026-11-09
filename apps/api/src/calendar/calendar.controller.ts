import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createCalendarEventSchema,
  createTimeBlockSchema,
  deleteCalendarEventSchema,
  listCalendarEventsQuerySchema,
  undoCalendarDeleteSchema,
  updateCalendarEventSchema,
  updateCalendarSettingsSchema,
} from '@erp-tiza/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { AppInstalledGuard, InstalledApp } from '../common/guards/app-installed.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  WORKSPACE_ADMIN_ROLES,
  WORKSPACE_READ_ROLES,
  WORKSPACE_WRITE_ROLES,
  WorkspaceAccessGuard,
  WorkspaceRoles,
} from '../common/guards/workspace-access.guard.js';
import type { User } from '../db/schema.js';
import { CalendarService } from './calendar.service.js';

@Controller()
@UseGuards(AuthGuard, WorkspaceAccessGuard, AppInstalledGuard)
@InstalledApp('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('workspaces/:id/calendar/settings')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async getSettings(@Param('id') workspaceId: string) {
    const settings = await this.calendarService.getSettings(workspaceId);
    return { settings };
  }

  @Patch('workspaces/:id/calendar/settings')
  @WorkspaceRoles(WORKSPACE_ADMIN_ROLES)
  async updateSettings(@Param('id') workspaceId: string, @Body() body: unknown) {
    const input = updateCalendarSettingsSchema.parse(body);
    const settings = await this.calendarService.updateSettings(workspaceId, input);
    return { settings };
  }

  @Get('workspaces/:id/calendar/events')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async list(
    @Param('id') workspaceId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = listCalendarEventsQuerySchema.parse({
      from: query.from,
      to: query.to,
      tz: query.tz || undefined,
    });
    const events = await this.calendarService.listOccurrences(workspaceId, filters);
    return { events };
  }

  @Post('workspaces/:id/calendar/events')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async create(@CurrentUser() user: User, @Param('id') workspaceId: string, @Body() body: unknown) {
    const input = createCalendarEventSchema.parse(body);
    const event = await this.calendarService.create(workspaceId, user, input);
    return { event };
  }

  @Patch('workspaces/:id/calendar/events/:eventId')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async update(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() body: unknown,
  ) {
    const input = updateCalendarEventSchema.parse(body);
    const event = await this.calendarService.update(workspaceId, eventId, user, input);
    return { event };
  }

  @Delete('workspaces/:id/calendar/events/:eventId')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async remove(
    @Param('id') workspaceId: string,
    @Param('eventId') eventId: string,
    @Query() query: Record<string, string | undefined>,
    @Body() body: unknown,
  ) {
    const input = deleteCalendarEventSchema.parse({
      ...(typeof body === 'object' && body ? body : {}),
      scope: query.scope || (body as { scope?: string } | null)?.scope,
      occurrenceStart: query.occurrenceStart || (body as { occurrenceStart?: string } | null)?.occurrenceStart,
    });
    return this.calendarService.remove(workspaceId, eventId, input);
  }

  @Post('workspaces/:id/calendar/events/:eventId/restore')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async restore(@Param('id') workspaceId: string, @Param('eventId') eventId: string) {
    const event = await this.calendarService.restore(workspaceId, eventId);
    return { event };
  }

  @Post('workspaces/:id/calendar/events/:eventId/undo-delete')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async undoDelete(
    @Param('id') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() body: unknown,
  ) {
    const input = undoCalendarDeleteSchema.parse({
      ...(typeof body === 'object' && body ? body : {}),
      eventId,
    });
    return this.calendarService.undoDelete(workspaceId, input);
  }

  @Post('workspaces/:id/calendar/time-blocks')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async createTimeBlock(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = createTimeBlockSchema.parse(body);
    const event = await this.calendarService.createTimeBlock(workspaceId, user, input);
    return { event };
  }

  @Get('workspaces/:id/calendar/ics-token')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async icsTokenStatus(@CurrentUser() user: User, @Param('id') workspaceId: string) {
    const status = await this.calendarService.getIcsTokenStatus(workspaceId, user.id);
    return { status };
  }

  @Post('workspaces/:id/calendar/ics-token/regenerate')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async regenerateIcsToken(@CurrentUser() user: User, @Param('id') workspaceId: string) {
    const token = await this.calendarService.regenerateIcsToken(workspaceId, user.id);
    return { token };
  }

  @Post('workspaces/:id/calendar/ics-token/revoke')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async revokeIcsToken(@CurrentUser() user: User, @Param('id') workspaceId: string) {
    return this.calendarService.revokeIcsToken(workspaceId, user.id);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  noteByDayParamsSchema,
  noteDayQuerySchema,
  promoteChecklistLineSchema,
  updateNoteBodySchema,
} from '@erp-tiza/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { AppInstalledGuard, InstalledApp } from '../common/guards/app-installed.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  WORKSPACE_READ_ROLES,
  WORKSPACE_WRITE_ROLES,
  WorkspaceAccessGuard,
  WorkspaceRoles,
} from '../common/guards/workspace-access.guard.js';
import type { User } from '../db/schema.js';
import { NotesService } from './notes.service.js';

@Controller()
@UseGuards(AuthGuard, WorkspaceAccessGuard, AppInstalledGuard)
@InstalledApp('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('workspaces/:id/notes/today')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async today(
    @Param('id') workspaceId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = noteDayQuerySchema.parse({ tz: query.tz || undefined });
    const note = await this.notesService.getOrCreateToday(workspaceId, filters.tz);
    return { note };
  }

  @Get('workspaces/:id/notes/by-day/:day')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async byDay(
    @Param('id') workspaceId: string,
    @Param('day') dayParam: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const { day } = noteByDayParamsSchema.parse({ day: dayParam });
    noteDayQuerySchema.parse({ tz: query.tz || undefined });
    const note = await this.notesService.getOrCreateByDay(workspaceId, day);
    return { note };
  }

  @Patch('workspaces/:id/notes/:noteId')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async update(
    @Param('id') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
  ) {
    const input = updateNoteBodySchema.parse(body);
    const note = await this.notesService.updateBody(workspaceId, noteId, input);
    return { note };
  }

  @Post('workspaces/:id/notes/:noteId/promote')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async promote(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
  ) {
    const input = promoteChecklistLineSchema.parse(body);
    return this.notesService.promoteChecklistLine(workspaceId, noteId, user, input);
  }
}

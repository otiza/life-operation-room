import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createTaskSchema,
  listTasksQuerySchema,
  reorderTasksSchema,
  updateTaskSchema,
  updateTaskSettingsSchema,
} from '@life-room/shared';
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
import { TasksService } from './tasks.service.js';

@Controller()
@UseGuards(AuthGuard, WorkspaceAccessGuard, AppInstalledGuard)
@InstalledApp('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('workspaces/:id/tasks/settings')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async getSettings(@Param('id') workspaceId: string) {
    const settings = await this.tasksService.getSettings(workspaceId);
    return { settings };
  }

  @Patch('workspaces/:id/tasks/settings')
  @WorkspaceRoles(WORKSPACE_ADMIN_ROLES)
  async updateSettings(@Param('id') workspaceId: string, @Body() body: unknown) {
    const input = updateTaskSettingsSchema.parse(body);
    const settings = await this.tasksService.updateSettings(workspaceId, input);
    return { settings };
  }

  @Get('workspaces/:id/tasks/counts-by-project')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async countsByProject(@Param('id') workspaceId: string) {
    const counts = await this.tasksService.countsByProject(workspaceId);
    return { counts };
  }

  @Get('workspaces/:id/tasks/counts')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async counts(
    @Param('id') workspaceId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const tz = listTasksQuerySchema.parse({ tz: query.tz || undefined }).tz;
    const counts = await this.tasksService.counts(workspaceId, tz);
    return { counts };
  }

  @Get('workspaces/:id/tasks')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async list(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = listTasksQuerySchema.parse({
      projectId: query.projectId || undefined,
      status: query.status || undefined,
      assignee: query.assignee || undefined,
      due: query.due || undefined,
      view: query.view || undefined,
      cursor: query.cursor || undefined,
      limit: query.limit || undefined,
      tz: query.tz || undefined,
    });
    const tasks = await this.tasksService.list(workspaceId, user.id, filters);
    return { tasks };
  }

  @Post('workspaces/:id/tasks')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async create(@CurrentUser() user: User, @Param('id') workspaceId: string, @Body() body: unknown) {
    const input = createTaskSchema.parse(body);
    const task = await this.tasksService.create(workspaceId, user, input);
    return { task };
  }

  @Post('workspaces/:id/tasks/reorder')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async reorder(@CurrentUser() user: User, @Param('id') workspaceId: string, @Body() body: unknown) {
    const input = reorderTasksSchema.parse(body);
    const tasks = await this.tasksService.reorder(workspaceId, user, input);
    return { tasks };
  }

  @Get('workspaces/:id/tasks/:taskId')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async get(@Param('id') workspaceId: string, @Param('taskId') taskId: string) {
    const task = await this.tasksService.get(workspaceId, taskId);
    return { task };
  }

  @Patch('workspaces/:id/tasks/:taskId')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async update(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    const input = updateTaskSchema.parse(body);
    const task = await this.tasksService.update(workspaceId, taskId, user, input);
    return { task };
  }

  @Delete('workspaces/:id/tasks/:taskId')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async remove(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.remove(workspaceId, taskId, user);
  }

  @Post('workspaces/:id/tasks/:taskId/restore')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async restore(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    const task = await this.tasksService.restore(workspaceId, taskId, user);
    return { task };
  }
}

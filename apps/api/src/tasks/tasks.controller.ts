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
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  updateTaskSettingsSchema,
} from '@erp-tiza/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { User } from '../db/schema.js';
import { TasksService } from './tasks.service.js';

@Controller()
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('workspaces/:id/tasks/settings')
  async getSettings(@CurrentUser() user: User, @Param('id') workspaceId: string) {
    const settings = await this.tasksService.getSettings(workspaceId, user.id);
    return { settings };
  }

  @Patch('workspaces/:id/tasks/settings')
  async updateSettings(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = updateTaskSettingsSchema.parse(body);
    const settings = await this.tasksService.updateSettings(workspaceId, user, input);
    return { settings };
  }

  @Get('workspaces/:id/tasks/counts-by-project')
  async countsByProject(@CurrentUser() user: User, @Param('id') workspaceId: string) {
    const counts = await this.tasksService.countsByProject(workspaceId, user.id);
    return { counts };
  }

  @Get('workspaces/:id/tasks')
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
    });
    const tasks = await this.tasksService.list(workspaceId, user.id, filters);
    return { tasks };
  }

  @Post('workspaces/:id/tasks')
  async create(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = createTaskSchema.parse(body);
    const task = await this.tasksService.create(workspaceId, user, input);
    return { task };
  }

  @Get('workspaces/:id/tasks/:taskId')
  async get(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    const task = await this.tasksService.get(workspaceId, taskId, user.id);
    return { task };
  }

  @Patch('workspaces/:id/tasks/:taskId')
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
  async remove(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.remove(workspaceId, taskId, user);
  }
}

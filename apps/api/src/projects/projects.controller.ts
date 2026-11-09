import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { createProjectSchema, updateProjectSchema } from '@erp-tiza/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { User } from '../db/schema.js';
import { ProjectsService } from './projects.service.js';

@Controller()
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('workspaces/:id/projects')
  async list(@CurrentUser() user: User, @Param('id') workspaceId: string) {
    const projects = await this.projectsService.list(workspaceId, user.id);
    return { projects };
  }

  @Post('workspaces/:id/projects')
  async create(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = createProjectSchema.parse(body);
    const project = await this.projectsService.create(workspaceId, user, input);
    return { project };
  }

  @Get('workspaces/:id/projects/:projectId')
  async get(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    const project = await this.projectsService.get(workspaceId, projectId, user.id);
    return { project };
  }

  @Patch('workspaces/:id/projects/:projectId')
  async update(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    const input = updateProjectSchema.parse(body);
    const project = await this.projectsService.update(workspaceId, projectId, user, input);
    return { project };
  }

  @Delete('workspaces/:id/projects/:projectId')
  async remove(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.remove(workspaceId, projectId, user);
  }
}

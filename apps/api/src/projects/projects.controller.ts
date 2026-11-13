import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createProjectSchema, updateProjectSchema } from '@life-room/shared';
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
import { ProjectsService } from './projects.service.js';

@Controller()
@UseGuards(AuthGuard, WorkspaceAccessGuard, AppInstalledGuard)
@InstalledApp('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('workspaces/:id/projects')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async list(@Param('id') workspaceId: string) {
    const projects = await this.projectsService.list(workspaceId);
    return { projects };
  }

  @Post('workspaces/:id/projects')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async create(@CurrentUser() user: User, @Param('id') workspaceId: string, @Body() body: unknown) {
    const input = createProjectSchema.parse(body);
    const project = await this.projectsService.create(workspaceId, user, input);
    return { project };
  }

  @Get('workspaces/:id/projects/:projectId')
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async get(@Param('id') workspaceId: string, @Param('projectId') projectId: string) {
    const project = await this.projectsService.get(workspaceId, projectId);
    return { project };
  }

  @Patch('workspaces/:id/projects/:projectId')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async update(
    @Param('id') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    const input = updateProjectSchema.parse(body);
    const project = await this.projectsService.update(workspaceId, projectId, input);
    return { project };
  }

  @Delete('workspaces/:id/projects/:projectId')
  @WorkspaceRoles(WORKSPACE_WRITE_ROLES)
  async remove(@Param('id') workspaceId: string, @Param('projectId') projectId: string) {
    return this.projectsService.remove(workspaceId, projectId);
  }
}

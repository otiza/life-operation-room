import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { installAppSchema } from '@erp-tiza/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  WORKSPACE_ADMIN_ROLES,
  WORKSPACE_READ_ROLES,
  WorkspaceAccessGuard,
  WorkspaceRoles,
} from '../common/guards/workspace-access.guard.js';
import type { User } from '../db/schema.js';
import { AppsService } from './apps.service.js';

@Controller()
@UseGuards(AuthGuard)
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get('apps/catalog')
  catalog() {
    return { apps: this.appsService.getCatalog() };
  }

  @Get('workspaces/:id/apps')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async list(@Param('id') workspaceId: string) {
    const apps = await this.appsService.listInstalled(workspaceId);
    return { apps };
  }

  @Post('workspaces/:id/apps/install')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WORKSPACE_ADMIN_ROLES)
  async install(@CurrentUser() user: User, @Param('id') workspaceId: string, @Body() body: unknown) {
    const input = installAppSchema.parse(body);
    const app = await this.appsService.install(workspaceId, user, input);
    return { app };
  }

  @Delete('workspaces/:id/apps/:appKey')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WORKSPACE_ADMIN_ROLES)
  async uninstall(
    @CurrentUser() user: User,
    @Param('id') workspaceId: string,
    @Param('appKey') appKey: string,
  ) {
    return this.appsService.uninstall(workspaceId, user, appKey);
  }
}

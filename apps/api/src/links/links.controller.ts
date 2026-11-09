import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import {
  WORKSPACE_READ_ROLES,
  WorkspaceAccessGuard,
  WorkspaceRoles,
} from '../common/guards/workspace-access.guard.js';
import { LinksService } from './links.service.js';

@Controller('workspaces/:id/links')
@UseGuards(AuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles(WORKSPACE_READ_ROLES)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get()
  async list(@Param('id') workspaceId: string) {
    const links = await this.linksService.list(workspaceId);
    return { links };
  }
}

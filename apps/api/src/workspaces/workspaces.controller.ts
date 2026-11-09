import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createWorkspaceSchema, inviteMemberSchema } from '@erp-tiza/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  WORKSPACE_ADMIN_ROLES,
  WORKSPACE_READ_ROLES,
  WorkspaceAccessGuard,
  WorkspaceRoles,
} from '../common/guards/workspace-access.guard.js';
import type { User } from '../db/schema.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { WorkspacesService } from './workspaces.service.js';

@Controller()
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('workspaces')
  async list(@CurrentUser() user: User) {
    const items = await this.workspacesService.listForUser(user.id);
    return { workspaces: items.map((item) => this.workspacesService.toDto(item)) };
  }

  @Post('workspaces')
  async create(@CurrentUser() user: User, @Body() body: unknown) {
    const input = createWorkspaceSchema.parse(body);
    const workspace = await this.workspacesService.createSharedWorkspace(user, input);
    return { workspace: this.workspacesService.toDto(workspace) };
  }

  @Get('workspaces/:id')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async get(@Param('id') id: string) {
    const workspace = await this.workspacesService.getForUser(id);
    return { workspace: this.workspacesService.toDto(workspace) };
  }

  @Get('workspaces/:id/members')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WORKSPACE_READ_ROLES)
  async members(@Param('id') id: string) {
    const members = await this.workspacesService.listMembers(id);
    return { members };
  }

  @Post('workspaces/:id/invites')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WORKSPACE_ADMIN_ROLES)
  async invite(@CurrentUser() user: User, @Param('id') id: string, @Body() body: unknown) {
    const input = inviteMemberSchema.parse(body);
    const member = await this.workspacesService.inviteMember(id, user, input);
    return { member };
  }

  @Delete('workspaces/:id/members/:memberId')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles(WORKSPACE_ADMIN_ROLES)
  async removeMember(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(id, memberId, user);
  }

  @Post('invites/:token/accept')
  async accept(@CurrentUser() user: User, @Param('token') token: string) {
    return this.workspacesService.acceptInvite(token, user);
  }
}

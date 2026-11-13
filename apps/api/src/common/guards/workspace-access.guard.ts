import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '@life-room/shared';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator.js';
import { WorkspacesService } from '../../workspaces/workspaces.service.js';

export const WORKSPACE_READ_ROLES = ['owner', 'admin', 'member', 'guest'] as const satisfies readonly MemberRole[];
export const WORKSPACE_WRITE_ROLES = ['owner', 'admin', 'member'] as const satisfies readonly MemberRole[];
export const WORKSPACE_ADMIN_ROLES = ['owner', 'admin'] as const satisfies readonly MemberRole[];

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';

export const WorkspaceRoles = (roles: readonly MemberRole[]) => SetMetadata(WORKSPACE_ROLES_KEY, roles);

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<readonly MemberRole[] | undefined>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) {
      throw new ForbiddenException('Workspace access is not configured for this route');
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const workspaceId = request.params?.id;
    if (!request.user || typeof workspaceId !== 'string' || !workspaceId) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }
    await this.workspacesService.requireMembership(workspaceId, request.user.id, [...roles]);
    return true;
  }
}

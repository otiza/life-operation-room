import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator.js';
import { AppsService } from '../../apps/apps.service.js';

export const INSTALLED_APP_KEY = 'installedApp';

export const InstalledApp = (appKey: string) => SetMetadata(INSTALLED_APP_KEY, appKey);

@Injectable()
export class AppInstalledGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly appsService: AppsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const appKey = this.reflector.getAllAndOverride<string | undefined>(INSTALLED_APP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!appKey) {
      throw new ForbiddenException('Installed app is not configured for this route');
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const workspaceId = request.params?.id;
    if (typeof workspaceId !== 'string' || !workspaceId) {
      throw new ForbiddenException('Workspace is required');
    }
    await this.appsService.assertInstalled(workspaceId, appKey);
    return true;
  }
}

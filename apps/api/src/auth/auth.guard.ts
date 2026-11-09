import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/decorators/current-user.decorator.js';
import { SESSION_COOKIE, SessionService } from './session.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    const user = await this.sessionService.resolveUserFromSessionToken(token);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    request.user = user;
    return true;
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [UsersModule, forwardRef(() => WorkspacesModule), forwardRef(() => NotificationsModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, SessionService],
  exports: [AuthService, AuthGuard, SessionService],
})
export class AuthModule {}

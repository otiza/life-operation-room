import { Module } from '@nestjs/common';
import { AppInstalledGuard } from '../common/guards/app-installed.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { AppsController } from './apps.controller.js';
import { AppsService } from './apps.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [AppsController],
  providers: [AppsService, AppInstalledGuard],
  exports: [AppsService, AppInstalledGuard],
})
export class AppsModule {}

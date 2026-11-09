import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { AppsController } from './apps.controller.js';
import { AppsService } from './apps.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}

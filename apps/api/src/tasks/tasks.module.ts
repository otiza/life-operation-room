import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AppsModule } from '../apps/apps.module.js';
import { ProjectReferencesModule } from '../projects/project-references.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { TaskOrderingService } from './task-ordering.service.js';
import { TaskQueryService } from './task-query.service.js';
import { TaskReferencesModule } from './task-references.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule, AppsModule, ProjectReferencesModule, TaskReferencesModule],
  controllers: [TasksController],
  providers: [TasksService, TaskQueryService, TaskOrderingService],
  exports: [TasksService],
})
export class TasksModule {}

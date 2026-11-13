import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AppsModule } from '../apps/apps.module.js';
import { LinksModule } from '../links/links.module.js';
import { TaskCommandsModule } from '../tasks/task-commands.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule, AppsModule, LinksModule, TaskCommandsModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}

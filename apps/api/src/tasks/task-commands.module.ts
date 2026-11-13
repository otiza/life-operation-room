import { Module } from '@nestjs/common';
import { TaskCommandsService } from './task-commands.service.js';
import { TasksModule } from './tasks.module.js';

@Module({
  imports: [TasksModule],
  providers: [TaskCommandsService],
  exports: [TaskCommandsService],
})
export class TaskCommandsModule {}

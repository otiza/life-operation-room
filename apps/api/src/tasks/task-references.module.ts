import { Module } from '@nestjs/common';
import { TaskReferencesService } from './task-references.service.js';

@Module({
  providers: [TaskReferencesService],
  exports: [TaskReferencesService],
})
export class TaskReferencesModule {}

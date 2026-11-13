import { Module } from '@nestjs/common';
import { ProjectReferencesService } from './project-references.service.js';

@Module({
  providers: [ProjectReferencesService],
  exports: [ProjectReferencesService],
})
export class ProjectReferencesModule {}

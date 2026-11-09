import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AppsModule } from '../apps/apps.module.js';
import { LinksModule } from '../links/links.module.js';
import { TaskReferencesModule } from '../tasks/task-references.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarIcsController } from './calendar-ics.controller.js';
import { CalendarService } from './calendar.service.js';
import { RecurrenceService } from './recurrence.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule, AppsModule, LinksModule, TaskReferencesModule],
  controllers: [CalendarController, CalendarIcsController],
  providers: [CalendarService, RecurrenceService],
  exports: [CalendarService],
})
export class CalendarModule {}

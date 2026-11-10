import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AppsModule } from '../apps/apps.module.js';
import { LinksModule } from '../links/links.module.js';
import { TaskReferencesModule } from '../tasks/task-references.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarIcsController } from './calendar-ics.controller.js';
import { CalendarSeriesService } from './calendar-series.service.js';
import { CalendarService } from './calendar.service.js';
import { CalendarTaskBlocksService } from './calendar-task-blocks.service.js';
import { RecurrenceService } from './recurrence.service.js';

@Module({
  imports: [AuthModule, WorkspacesModule, AppsModule, LinksModule, TaskReferencesModule],
  controllers: [CalendarController, CalendarIcsController],
  providers: [CalendarService, CalendarSeriesService, CalendarTaskBlocksService, RecurrenceService],
  exports: [CalendarService],
})
export class CalendarModule {}

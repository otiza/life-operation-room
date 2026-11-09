import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { User } from '../db/schema.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: User) {
    const items = await this.notificationsService.listForUser(user.id);
    return { notifications: items };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: User, @Param('id') id: string) {
    const notification = await this.notificationsService.markRead(user.id, id);
    return { notification };
  }
}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { User } from '../db/schema.js';
import { LinksService } from './links.service.js';

@Controller('workspaces/:id/links')
@UseGuards(AuthGuard)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get()
  async list(@CurrentUser() user: User, @Param('id') workspaceId: string) {
    const links = await this.linksService.list(workspaceId, user.id);
    return { links };
  }
}

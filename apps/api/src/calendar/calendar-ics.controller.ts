import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CalendarService } from './calendar.service.js';

@Controller()
export class CalendarIcsController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendar/ics/:token')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async feed(@Param('token') token: string, @Res() res: Response) {
    const body = await this.calendarService.renderIcsFeed(token);
    res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');
    res.send(body);
  }
}

import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { loginSchema, signupSchema, updateAppearanceSchema } from '@life-room/shared';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { User } from '../db/schema.js';
import { UsersService } from '../users/users.service.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE } from './session.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async signup(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const input = signupSchema.parse(body);
    const result = await this.authService.signup(input);
    this.setSessionCookie(response, result.sessionToken);
    return {
      user: result.user,
      personalWorkspace: result.personalWorkspace,
    };
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const input = loginSchema.parse(body);
    const result = await this.authService.login(input);
    this.setSessionCookie(response, result.sessionToken);
    return { user: result.user };
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
    await this.authService.logout(token);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return { user: this.usersService.toDto(user) };
  }

  /** Theme, texture strength and focus mode for the signed-in user. Partial updates. */
  @Patch('me/appearance')
  @UseGuards(AuthGuard)
  async updateAppearance(@CurrentUser() user: User, @Body() body: unknown) {
    const input = updateAppearanceSchema.parse(body);
    return { appearance: await this.usersService.updateAppearance(user.id, input) };
  }

  private setSessionCookie(response: Response, sessionToken: string) {
    const secure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    response.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}

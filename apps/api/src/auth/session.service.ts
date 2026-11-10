import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, gt, lte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sessions } from '../db/schema.js';
import { createSessionToken, hashToken } from '../common/utils/crypto.js';
import { UsersService } from '../users/users.service.js';

const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'tiza_session';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly usersService: UsersService,
  ) {}

  async createSession(userId: string): Promise<string> {
    const token = createSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
    await this.db.insert(sessions).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });
    return token;
  }

  async destroySession(sessionToken: string | undefined) {
    if (!sessionToken) return;
    await this.db.delete(sessions).where(eq(sessions.tokenHash, hashToken(sessionToken)));
  }

  async deleteExpired(now = new Date()): Promise<number> {
    const deleted = await this.db
      .delete(sessions)
      .where(lte(sessions.expiresAt, now))
      .returning({ id: sessions.id });
    return deleted.length;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    const removed = await this.deleteExpired();
    if (removed > 0) {
      this.logger.log(`Deleted ${removed} expired session(s)`);
    }
  }

  async resolveUserFromSessionToken(sessionToken: string | undefined) {
    if (!sessionToken) return undefined;
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, hashToken(sessionToken)), gt(sessions.expiresAt, new Date())));
    if (!row) return undefined;
    return this.usersService.findById(row.userId);
  }
}

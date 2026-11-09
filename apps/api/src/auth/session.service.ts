import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, gt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sessions } from '../db/schema.js';
import { createSessionToken, hashToken } from '../common/utils/crypto.js';
import { UsersService } from '../users/users.service.js';

const SESSION_DAYS = 30;
export const SESSION_COOKIE = 'tiza_session';

@Injectable()
export class SessionService {
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

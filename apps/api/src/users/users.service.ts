import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, type NewUser, type User } from '../db/schema.js';
import { toIso } from '../common/utils/crypto.js';

@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async create(data: Omit<NewUser, 'id' | 'createdAt'>, tx: NodePgDatabase = this.db): Promise<User> {
    const [created] = await tx
      .insert(users)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return created;
  }

  toDto(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: toIso(user.createdAt)!,
    };
  }
}

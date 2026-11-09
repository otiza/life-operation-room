import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { notifications, users } from '../db/schema.js';
import { DOMAIN_EVENTS, type MemberInvitedEvent } from '../common/events/domain-events.js';
import { toIso } from '../common/utils/crypto.js';
import { NotificationsGateway } from './notifications.gateway.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly gateway: NotificationsGateway,
  ) {}

  async listForUser(userId: string) {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return rows.map((row) => this.toDto(row));
  }

  async markRead(userId: string, notificationId: string) {
    const [row] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();
    if (!row) throw new NotFoundException('Notification not found');
    return this.toDto(row);
  }

  async create(input: {
    userId: string;
    workspaceId?: string | null;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }) {
    const [row] = await this.db
      .insert(notifications)
      .values({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload ?? {},
      })
      .returning();
    const dto = this.toDto(row);
    this.gateway.emitToUser(input.userId, 'notification.created', dto);
    return dto;
  }

  @OnEvent(DOMAIN_EVENTS.memberInvited)
  async onMemberInvited(event: MemberInvitedEvent) {
    let targetUserId = event.inviteeUserId;
    if (!targetUserId) {
      const [user] = await this.db.select().from(users).where(eq(users.email, event.inviteeEmail));
      targetUserId = user?.id ?? null;
    }
    if (!targetUserId) return;
    await this.create({
      userId: targetUserId,
      workspaceId: event.workspaceId,
      type: DOMAIN_EVENTS.memberInvited,
      title: 'Workspace invite',
      body: `You were invited to ${event.workspaceName} as ${event.role}.`,
      payload: {
        inviteToken: event.inviteToken,
        workspaceId: event.workspaceId,
        role: event.role,
      },
    });
  }

  @OnEvent(DOMAIN_EVENTS.appInstalled)
  async onAppInstalled(event: { workspaceId: string; appKey: string; installedByUserId: string }) {
    await this.create({
      userId: event.installedByUserId,
      workspaceId: event.workspaceId,
      type: DOMAIN_EVENTS.appInstalled,
      title: 'App installed',
      body: `${event.appKey} is now available in this workspace.`,
      payload: { appKey: event.appKey },
    });
  }

  toDto(row: typeof notifications.$inferSelect) {
    return {
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      type: row.type,
      title: row.title,
      body: row.body,
      payload: row.payload ?? {},
      readAt: toIso(row.readAt),
      createdAt: toIso(row.createdAt)!,
    };
  }
}

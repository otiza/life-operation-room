import { ConflictException, Inject, Injectable, UnauthorizedException, forwardRef } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { LoginInput, SignupInput } from '@erp-tiza/shared';
import { workspaceMembers, workspaces } from '../db/schema.js';
import { hashPassword, verifyPassword } from '../common/utils/crypto.js';
import { UsersService } from '../users/users.service.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async signup(input: SignupInput) {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.usersService.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    const personalWorkspace = await this.workspacesService.createPersonalWorkspace(user);
    await this.claimPendingInvites(user);
    const sessionToken = await this.sessionService.createSession(user.id);
    return {
      user: this.usersService.toDto(user),
      personalWorkspace: this.workspacesService.toDto(personalWorkspace),
      sessionToken,
    };
  }

  async login(input: LoginInput) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const sessionToken = await this.sessionService.createSession(user.id);
    return {
      user: this.usersService.toDto(user),
      sessionToken,
    };
  }

  async logout(sessionToken: string | undefined) {
    await this.sessionService.destroySession(sessionToken);
  }

  private async claimPendingInvites(user: { id: string; email: string; name: string }) {
    const pending = await this.db
      .select({
        member: workspaceMembers,
        workspace: workspaces,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(eq(workspaceMembers.email, user.email.toLowerCase()), eq(workspaceMembers.status, 'invited')));
    for (const row of pending) {
      await this.db
        .update(workspaceMembers)
        .set({ userId: user.id })
        .where(eq(workspaceMembers.id, row.member.id));
      await this.notificationsService.create({
        userId: user.id,
        workspaceId: row.workspace.id,
        type: 'member.invited',
        title: 'Workspace invite',
        body: `You were invited to ${row.workspace.name} as ${row.member.role}.`,
        payload: {
          inviteToken: row.member.inviteToken,
          workspaceId: row.workspace.id,
          role: row.member.role,
        },
      });
    }
  }
}

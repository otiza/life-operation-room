import { ConflictException, Inject, Injectable, UnauthorizedException, forwardRef } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { LoginInput, SignupInput } from '@life-room/shared';
import { workspaceMembers, workspaces } from '../db/schema.js';
import { hashPassword, verifyPassword } from '../common/utils/crypto.js';
import { isEmailUniqueViolation } from '../common/utils/db-errors.js';
import { UsersService } from '../users/users.service.js';
import { WorkspacesService } from '../workspaces/workspaces.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SessionService } from './session.service.js';

type ClaimedInvite = {
  workspaceId: string;
  workspaceName: string;
  role: string;
  inviteToken: string | null;
};

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
    let user;
    let personalWorkspace;
    let claimedInvites: ClaimedInvite[];
    try {
      const result = await this.db.transaction(async (tx) => {
        const createdUser = await this.usersService.create(
          { email: input.email, name: input.name, passwordHash },
          tx,
        );
        const workspace = await this.workspacesService.createPersonalWorkspace(createdUser, tx);
        const invites = await this.claimPendingInvites(createdUser, tx);
        return { user: createdUser, personalWorkspace: workspace, claimedInvites: invites };
      });
      user = result.user;
      personalWorkspace = result.personalWorkspace;
      claimedInvites = result.claimedInvites;
    } catch (error) {
      if (isEmailUniqueViolation(error)) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }

    const sessionToken = await this.sessionService.createSession(user.id);
    for (const invite of claimedInvites) {
      await this.notificationsService.create({
        userId: user.id,
        workspaceId: invite.workspaceId,
        type: 'member.invited',
        title: 'Workspace invite',
        body: `You were invited to ${invite.workspaceName} as ${invite.role}.`,
        payload: {
          inviteToken: invite.inviteToken,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      });
    }
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

  private async claimPendingInvites(
    user: { id: string; email: string; name: string },
    tx: NodePgDatabase = this.db,
  ): Promise<ClaimedInvite[]> {
    const pending = await tx
      .select({
        member: workspaceMembers,
        workspace: workspaces,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(eq(workspaceMembers.email, user.email.toLowerCase()), eq(workspaceMembers.status, 'invited')));
    const claimed: ClaimedInvite[] = [];
    for (const row of pending) {
      await tx
        .update(workspaceMembers)
        .set({ userId: user.id })
        .where(eq(workspaceMembers.id, row.member.id));
      claimed.push({
        workspaceId: row.workspace.id,
        workspaceName: row.workspace.name,
        role: row.member.role,
        inviteToken: row.member.inviteToken,
      });
    }
    return claimed;
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CreateWorkspaceInput, InviteMemberInput, MemberRole } from '@erp-tiza/shared';
import { users, workspaceMembers, workspaces, type User, type Workspace, type WorkspaceMember } from '../db/schema.js';
import { createInviteToken, slugify, toIso } from '../common/utils/crypto.js';
import { DOMAIN_EVENTS, type MemberInvitedEvent, type MemberRemovedEvent } from '../common/events/domain-events.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPersonalWorkspace(user: User): Promise<Workspace> {
    return this.db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: `${user.name}'s space`,
          slug: slugify(`personal-${user.name}`),
          kind: 'personal',
          ownerUserId: user.id,
        })
        .returning();
      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        email: user.email,
        role: 'owner',
        status: 'active',
      });
      return workspace;
    });
  }

  async createSharedWorkspace(user: User, input: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(workspaces)
        .values({
          name: input.name,
          slug: slugify(input.name),
          kind: 'shared',
          ownerUserId: user.id,
        })
        .returning();
      await tx.insert(workspaceMembers).values({
        workspaceId: created.id,
        userId: user.id,
        email: user.email,
        role: 'owner',
        status: 'active',
      });
      return created;
    });
    this.eventEmitter.emit(DOMAIN_EVENTS.workspaceCreated, {
      workspaceId: workspace.id,
      kind: workspace.kind,
      ownerUserId: user.id,
    });
    return workspace;
  }

  async listForUser(userId: string): Promise<Workspace[]> {
    const rows = await this.db
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, 'active')));
    return rows.map((row) => row.workspace);
  }

  async getForUser(workspaceId: string): Promise<Workspace> {
    const workspace = await this.findById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async findById(id: string): Promise<Workspace | undefined> {
    const [workspace] = await this.db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async listMembers(workspaceId: string) {
    const rows = await this.db
      .select({ member: workspaceMembers, name: users.name })
      .from(workspaceMembers)
      .leftJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    return rows.map((row) => this.memberToDto(row.member, false, row.name));
  }

  async inviteMember(workspaceId: string, invitedBy: User, input: InviteMemberInput) {
    const workspace = await this.findById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.kind === 'personal') {
      throw new BadRequestException('Cannot invite members to a personal workspace');
    }
    const email = input.email.toLowerCase();
    const existing = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.email, email)));
    if (existing[0]) {
      throw new BadRequestException('User already invited or is a member');
    }
    const invitee = await this.usersService.findByEmail(email);
    const inviteToken = createInviteToken();
    const [member] = await this.db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId: invitee?.id ?? null,
        email,
        role: input.role,
        status: 'invited',
        inviteToken,
      })
      .returning();
    const event: MemberInvitedEvent = {
      workspaceId,
      workspaceName: workspace.name,
      inviteeEmail: email,
      inviteeUserId: invitee?.id ?? null,
      invitedByUserId: invitedBy.id,
      inviteToken,
      role: input.role,
    };
    this.eventEmitter.emit(DOMAIN_EVENTS.memberInvited, event);
    return this.memberToDto(member, true);
  }

  async removeMember(workspaceId: string, memberId: string, actor: User) {
    const workspace = await this.findById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    const [member] = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.id, memberId)));
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'owner' || member.userId === workspace.ownerUserId) {
      throw new BadRequestException('Cannot remove the workspace owner');
    }
    if (!member.userId) {
      await this.db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));
      return { ok: true };
    }
    await this.db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId));
    const event: MemberRemovedEvent = {
      workspaceId,
      userId: member.userId,
      removedByUserId: actor.id,
      memberId: member.id,
    };
    this.eventEmitter.emit(DOMAIN_EVENTS.memberRemoved, event);
    return { ok: true };
  }

  async acceptInvite(token: string, user: User) {
    const [invite] = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.inviteToken, token), eq(workspaceMembers.status, 'invited')));
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.email !== user.email.toLowerCase()) {
      throw new ForbiddenException('Invite email does not match your account');
    }
    const [updated] = await this.db
      .update(workspaceMembers)
      .set({
        status: 'active',
        userId: user.id,
        inviteToken: null,
      })
      .where(eq(workspaceMembers.id, invite.id))
      .returning();
    const workspace = await this.findById(updated.workspaceId);
    return {
      member: this.memberToDto(updated),
      workspace: workspace ? this.toDto(workspace) : null,
    };
  }

  async requireMembership(
    workspaceId: string,
    userId: string,
    allowedRoles: MemberRole[],
  ): Promise<WorkspaceMember> {
    const [member] = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.status, 'active'),
          eq(workspaceMembers.userId, userId),
        ),
      );
    if (!member || !allowedRoles.includes(member.role as MemberRole)) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }
    return member;
  }

  toDto(workspace: Workspace) {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      kind: workspace.kind,
      ownerUserId: workspace.ownerUserId,
      createdAt: toIso(workspace.createdAt)!,
    };
  }

  memberToDto(member: WorkspaceMember, includeToken = false, name: string | null = null) {
    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      name,
      email: member.email,
      role: member.role,
      status: member.status,
      inviteToken: includeToken ? member.inviteToken : null,
      createdAt: toIso(member.createdAt)!,
    };
  }
}

import { z } from 'zod';

export const workspaceKindSchema = z.enum(['personal', 'shared']);
export const memberRoleSchema = z.enum(['owner', 'admin', 'member', 'guest']);
export const memberStatusSchema = z.enum(['invited', 'active']);

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: memberRoleSchema.exclude(['owner']).default('member'),
});

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  kind: workspaceKindSchema,
  ownerUserId: z.string().uuid(),
  createdAt: z.string(),
});

export const workspaceMemberSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  email: z.string().email(),
  role: memberRoleSchema,
  status: memberStatusSchema,
  inviteToken: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type WorkspaceDto = z.infer<typeof workspaceSchema>;
export type WorkspaceMemberDto = z.infer<typeof workspaceMemberSchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;

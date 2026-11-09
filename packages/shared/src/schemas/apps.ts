import { z } from 'zod';
import { appManifestSchema } from '../apps/types.js';

export const installAppSchema = z.object({
  appKey: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const workspaceAppSchema = z.object({
  workspaceId: z.string().uuid(),
  appKey: z.string(),
  installedAt: z.string(),
  config: z.record(z.string(), z.unknown()),
  manifest: appManifestSchema,
});

export type InstallAppInput = z.infer<typeof installAppSchema>;
export type WorkspaceAppDto = z.infer<typeof workspaceAppSchema>;

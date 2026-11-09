import { z } from 'zod';

export const appCategorySchema = z.enum([
  'productivity',
  'learning',
  'career',
  'health',
  'social',
  'finance',
  'ai',
]);

export const appCapabilitySchema = z.enum(['ai', 'files', 'integrations', 'goals']);

export const appStatusSchema = z.enum(['available', 'coming_soon']);

export const appManifestSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  version: z.string(),
  category: appCategorySchema,
  dependsOn: z.array(z.string()),
  permissions: z.array(z.string()),
  capabilities: z.array(appCapabilitySchema),
  nav: z.object({
    label: z.string(),
    href: z.string(),
    icon: z.string(),
  }),
  backendModule: z.string(),
  status: appStatusSchema,
});

export type AppCategory = z.infer<typeof appCategorySchema>;
export type AppCapability = z.infer<typeof appCapabilitySchema>;
export type AppStatus = z.infer<typeof appStatusSchema>;
export type AppManifest = z.infer<typeof appManifestSchema>;

import { z } from 'zod';

/*
  Appearance: the room a person works in (docs/plans/THEMES-PLAN.md). Stored per user.
  THEME_IDS lists the themes users may pick; the web registry (apps/web/src/themes) must define each one.
*/
export const THEME_IDS = ['paper', 'atelier', 'dot', 'blueprint', 'studio'] as const;

export const themeIdSchema = z.enum(THEME_IDS);

export const appearanceSchema = z.object({
  theme: themeIdSchema,
  /** Texture strength 0–1; null keeps the theme's own default. */
  strength: z.number().min(0).max(1).nullable(),
  /** Focus mode: textures and motion off, palette and type kept. */
  focus: z.boolean(),
});

export const updateAppearanceSchema = appearanceSchema.partial().strict();

export const DEFAULT_APPEARANCE: Appearance = { theme: 'paper', strength: null, focus: false };

/** Read stored appearance defensively: unknown or removed themes fall back to the default. */
export function parseAppearance(value: unknown): Appearance {
  const result = appearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, ...(typeof value === 'object' && value ? value : {}) });
  return result.success ? result.data : DEFAULT_APPEARANCE;
}

export type ThemeId = z.infer<typeof themeIdSchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type UpdateAppearanceInput = z.infer<typeof updateAppearanceSchema>;

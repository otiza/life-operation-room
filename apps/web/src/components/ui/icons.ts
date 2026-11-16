/*
  The one place the app gets its icons from. Today every skin uses lucide's line icons.
  The pixel and ASCII skins (THEMES-PLAN PR 7) swap glyphs here, so features never import
  `lucide-react` directly — ESLint enforces it.
*/
export * from 'lucide-react';
export type { LucideIcon } from 'lucide-react';

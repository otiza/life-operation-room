/*
  The theme registry: the single source of truth for every theme.
  app/themes.generated.css and docs/themes/*.DESIGN.md are generated from it:
    pnpm --filter web themes:build
  A test fails when the generated files are stale.
*/
import { paperPalette } from './palettes';
import type { ThemeDefinition, ThemeMode, TokenMap } from './types';

const plex = 'IBM Plex Sans';
const literata = 'Literata';

export const paperTheme: ThemeDefinition = {
  id: 'paper',
  name: 'Paper',
  description:
    'The original Life Room: warm cream paper, a terracotta accent, Literata for the voice and IBM Plex Sans for controls.',
  palette: paperPalette,
  layers: { canvas: 'plain', pattern: 'none', grain: 'none', surface: 'paper' },
  typography: {
    display: { fontFamily: literata, fontSize: '2.5rem', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em' },
    pageTitle: { fontFamily: literata, fontSize: '1.625rem', fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.02em' },
    sectionTitle: { fontFamily: literata, fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35 },
    body: { fontFamily: plex, fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: plex, fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'circle', divider: 'solid', chip: 'pill' },
  strength: 0.5,
};

/** Paper is the default: it owns `:root` / `.dark`; every other theme overrides under `html[data-theme=…]`. */
export const DEFAULT_THEME_ID = 'paper';

export const THEMES: readonly ThemeDefinition[] = [paperTheme];

export function getTheme(id: string): ThemeDefinition | undefined {
  return THEMES.find((theme) => theme.id === id);
}

/**
 * The data-* attributes that select a theme's layers and detail tokens. Set on <html>;
 * all theme CSS keys off them. (Mode stays the `.dark` class from next-themes.)
 */
export function themeAttributes(theme: ThemeDefinition) {
  return {
    'data-theme': theme.id,
    'data-canvas': theme.layers.canvas,
    'data-pattern': theme.layers.pattern,
    'data-grain': theme.layers.grain,
    'data-surface': theme.layers.surface,
    'data-skin': theme.skin,
    'data-cb': theme.details.checkbox,
    'data-divider': theme.details.divider,
    'data-chip': theme.details.chip,
  } as const;
}

/** The full token map of a theme in one mode (dark = light + dark overrides). */
export function resolveTokens(theme: ThemeDefinition, mode: ThemeMode): TokenMap {
  return mode === 'light' ? { ...theme.palette.light } : { ...theme.palette.light, ...theme.palette.dark };
}

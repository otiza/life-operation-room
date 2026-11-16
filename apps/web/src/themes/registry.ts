/*
  The theme registry: the single source of truth for every theme.
  app/themes.generated.css and docs/themes/*.DESIGN.md are generated from it:
    pnpm --filter web themes:build
  A test fails when the generated files are stale.
*/
import { arcadePalette, blueprintPalette, decoPalette, feltPalette, inkPalette, paperPalette, terminalPalette, thermalPalette } from './palettes';
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
    display: { fontFamily: literata, fontSize: '2.5rem', fluid: 'clamp(1.875rem, 1.4rem + 2vw, 2.5rem)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em' },
    pageTitle: { fontFamily: literata, fontSize: '1.625rem', fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.02em' },
    sectionTitle: { fontFamily: literata, fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35 },
    body: { fontFamily: plex, fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: plex, fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'circle', divider: 'solid', chip: 'tag' },
  strength: 0.5,
};

/*
  Texture themes (THEMES-PLAN PR 3–4). Registered for the Theme lab; users can pick them once Appearance ships (PR 5).
*/

export const atelierTheme: ThemeDefinition = {
  id: 'atelier',
  name: 'Atelier',
  description: 'A print shop: Paper colours with a halftone wash fading in from the corner, light noise, and no boxes.',
  palette: paperPalette,
  layers: { canvas: 'plain', pattern: 'halftone', grain: 'noise', surface: 'flat' },
  typography: {
    display: { fontFamily: 'Fraunces', fontSize: '3rem', fluid: 'clamp(2rem, 1.5rem + 2.4vw, 3rem)', fontWeight: 650, lineHeight: 1.05, letterSpacing: '-0.03em', fontVariation: '"SOFT" 100, "opsz" 144' },
    pageTitle: { fontFamily: 'Fraunces', fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', fontVariation: '"SOFT" 100' },
    sectionTitle: { fontFamily: 'Fraunces', fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, fontVariation: '"SOFT" 100' },
    body: { fontFamily: 'Work Sans', fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: 'Work Sans', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'square', divider: 'dotted', chip: 'tag' },
  strength: 0.5,
};

export const dotTheme: ThemeDefinition = {
  id: 'dot',
  name: 'Dot',
  description: 'A dot-grid notebook: monochrome paper with the terracotta accent. The quietest room.',
  palette: inkPalette,
  layers: { canvas: 'plain', pattern: 'dots', grain: 'none', surface: 'flat' },
  typography: {
    display: { fontFamily: 'Instrument Serif', fontSize: '3.25rem', fluid: 'clamp(2.25rem, 1.6rem + 2.8vw, 3.25rem)', fontWeight: 400, lineHeight: 1.02, letterSpacing: '-0.02em' },
    pageTitle: { fontFamily: 'Instrument Serif', fontSize: '2rem', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.01em' },
    sectionTitle: { fontFamily: 'Instrument Serif', fontSize: '1.5rem', fontWeight: 400, lineHeight: 1.2, fontStyle: 'italic' },
    body: { fontFamily: 'Inter', fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: 'Inter', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'square', divider: 'dotted', chip: 'pill' },
  strength: 0.55,
};

export const blueprintTheme: ThemeDefinition = {
  id: 'blueprint',
  name: 'Blueprint',
  description: 'A drafting table: a major and minor grid, square corners, dashed rules. Dark mode is the classic blue sheet.',
  palette: blueprintPalette,
  layers: { canvas: 'plain', pattern: 'grid', grain: 'noise', surface: 'flat' },
  typography: {
    display: { fontFamily: 'JetBrains Mono', fontSize: '2.375rem', fluid: 'clamp(1.625rem, 1.2rem + 1.8vw, 2.375rem)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.045em' },
    pageTitle: { fontFamily: 'JetBrains Mono', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.03em' },
    sectionTitle: { fontFamily: 'JetBrains Mono', fontSize: '0.8125rem', fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.16em', textTransform: 'uppercase' },
    body: { fontFamily: 'IBM Plex Sans Condensed', fontSize: '1rem', fontWeight: 400, lineHeight: 1.45 },
    meta: { fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'drafting',
  details: { checkbox: 'square', divider: 'dashed', chip: 'square' },
  strength: 0.55,
};

export const studioTheme: ThemeDefinition = {
  id: 'studio',
  name: 'Studio',
  description: 'Wool felt: sage in light, billiard green with brass in dark. Paper cards sit on it; rules are stitched.',
  palette: feltPalette,
  layers: { canvas: 'plain', pattern: 'none', grain: 'felt', surface: 'paper' },
  typography: {
    display: { fontFamily: 'Young Serif', fontSize: '2.75rem', fluid: 'clamp(1.875rem, 1.4rem + 2vw, 2.75rem)', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.015em' },
    pageTitle: { fontFamily: 'Young Serif', fontSize: '1.75rem', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.01em' },
    sectionTitle: { fontFamily: 'Young Serif', fontSize: '1.25rem', fontWeight: 400, lineHeight: 1.3 },
    body: { fontFamily: 'Figtree', fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: 'Figtree', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'rounded', divider: 'stitch', chip: 'pill' },
  strength: 0.7,
};

/** Paper is the default: it owns `:root` / `.dark`; every other theme overrides under `html[data-theme=…]`. */
export const DEFAULT_THEME_ID = 'paper';

/* Glass and skin themes (THEMES-PLAN PR 6–7). */

export const thermalTheme: ThemeDefinition = {
  id: 'thermal',
  name: 'Thermal',
  description: 'A grainy heat map: warm blobs drift slowly behind frosted glass. Big poster type.',
  palette: thermalPalette,
  layers: { canvas: 'gradient', pattern: 'none', grain: 'noise', surface: 'frosted' },
  typography: {
    display: { fontFamily: 'Syne', fontSize: '3rem', fluid: 'clamp(2rem, 1.4rem + 2.6vw, 3rem)', fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.04em' },
    pageTitle: { fontFamily: 'Syne', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' },
    sectionTitle: { fontFamily: 'Syne', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.015em' },
    body: { fontFamily: 'DM Sans', fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: 'DM Sans', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'circle', divider: 'solid', chip: 'pill' },
  strength: 0.75,
};

export const flutedTheme: ThemeDefinition = {
  id: 'fluted',
  name: 'Fluted',
  description: 'Art deco: emerald and brass behind ribbed glass, Bodoni italics, diamond checkboxes and double rules.',
  palette: decoPalette,
  layers: { canvas: 'gradient', pattern: 'none', grain: 'noise', surface: 'fluted' },
  typography: {
    display: { fontFamily: 'Bodoni Moda', fontSize: '3rem', fluid: 'clamp(2rem, 1.4rem + 2.6vw, 3rem)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.01em', fontStyle: 'italic', fontVariation: '"opsz" 28' },
    pageTitle: { fontFamily: 'Bodoni Moda', fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.15, fontStyle: 'italic', fontVariation: '"opsz" 28' },
    sectionTitle: { fontFamily: 'Bodoni Moda', fontSize: '1.375rem', fontWeight: 500, lineHeight: 1.2, fontStyle: 'italic', fontVariation: '"opsz" 28' },
    body: { fontFamily: 'Jost', fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: 'Jost', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'diamond', divider: 'double', chip: 'square' },
  strength: 0.55,
};

export const mosaicTheme: ThemeDefinition = {
  id: 'mosaic',
  name: 'Mosaic',
  description: 'Large tiles with grout lines in the Paper colours, seen through frosted glass. Heavy grotesque type.',
  palette: paperPalette,
  layers: { canvas: 'tiles', pattern: 'none', grain: 'noise', surface: 'frosted' },
  typography: {
    display: { fontFamily: 'Bricolage Grotesque', fontSize: '3rem', fluid: 'clamp(2rem, 1.4rem + 2.6vw, 3rem)', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.05em', fontVariation: '"opsz" 96' },
    pageTitle: { fontFamily: 'Bricolage Grotesque', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.03em' },
    sectionTitle: { fontFamily: 'Bricolage Grotesque', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
    body: { fontFamily: 'Bricolage Grotesque', fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: 'Bricolage Grotesque', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'classic',
  details: { checkbox: 'rounded', divider: 'solid', chip: 'tag' },
  strength: 0.45,
};

export const arcadeTheme: ThemeDefinition = {
  id: 'arcade',
  name: 'Arcade',
  description: 'Pixel art: a pixel mosaic, pixel type, notched borders and square checkboxes. Mint on indigo in dark.',
  palette: arcadePalette,
  layers: { canvas: 'mosaic', pattern: 'none', grain: 'none', surface: 'paper' },
  typography: {
    display: { fontFamily: 'Pixelify Sans', fontSize: '2.75rem', fluid: 'clamp(1.75rem, 1.3rem + 2vw, 2.75rem)', fontWeight: 600, lineHeight: 1.05 },
    pageTitle: { fontFamily: 'Pixelify Sans', fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.15 },
    sectionTitle: { fontFamily: 'Pixelify Sans', fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.2 },
    body: { fontFamily: 'IBM Plex Mono', fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    meta: { fontFamily: 'IBM Plex Mono', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'pixel',
  details: { checkbox: 'square', divider: 'dotted', chip: 'square' },
  strength: 0.5,
};

export const terminalTheme: ThemeDefinition = {
  id: 'terminal',
  name: 'Terminal',
  description: 'ASCII art: a character-drawn sun and hills, scanlines, double-line panels, [x] checkboxes and a blinking cursor.',
  palette: terminalPalette,
  layers: { canvas: 'ascii', pattern: 'scanlines', grain: 'none', surface: 'paper' },
  typography: {
    display: { fontFamily: 'JetBrains Mono', fontSize: '2.375rem', fluid: 'clamp(1.5rem, 1.1rem + 1.8vw, 2.375rem)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em' },
    pageTitle: { fontFamily: 'JetBrains Mono', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    sectionTitle: { fontFamily: 'JetBrains Mono', fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.4 },
    body: { fontFamily: 'JetBrains Mono', fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.55 },
    meta: { fontFamily: 'JetBrains Mono', fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4 },
  },
  skin: 'ascii',
  details: { checkbox: 'square', divider: 'dashed', chip: 'square' },
  strength: 0.55,
};

export const THEMES: readonly ThemeDefinition[] = [
  paperTheme, atelierTheme, dotTheme, blueprintTheme, studioTheme, thermalTheme, flutedTheme, mosaicTheme, arcadeTheme, terminalTheme,
];

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

/*
  A theme is data: a palette plus layer slots and detail tokens. Layout never changes between themes.
  See docs/plans/THEMES-PLAN.md and docs/DESIGN.md (Themes).
*/

/** CSS custom properties without the leading "--" (plus "color-scheme"), mapped to CSS values. */
export type TokenMap = Record<string, string>;

/** Light is complete; dark lists only the tokens that change in dark mode. */
export interface Palette {
  light: TokenMap;
  dark: TokenMap;
}

export type Canvas = 'plain' | 'gradient' | 'mosaic' | 'tiles' | 'ascii';
export type Pattern = 'none' | 'grid' | 'dots' | 'halftone' | 'scanlines';
export type Grain = 'none' | 'noise' | 'paper' | 'felt';
export type Surface = 'paper' | 'flat' | 'frosted' | 'fluted';
export type Skin = 'classic' | 'drafting' | 'pixel' | 'ascii';
export type CheckboxShape = 'circle' | 'square' | 'rounded' | 'diamond';
export type DividerStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'stitch';
export type ChipShape = 'pill' | 'tag' | 'square';

export interface TypeStyle {
  /** A family from themes/fonts.ts (by name). */
  fontFamily: string;
  /** Largest size as a CSS length (rem); also what DESIGN.md reports. */
  fontSize: string;
  /** Optional fluid size for CSS, e.g. `clamp(1.875rem, 1.4rem + 2vw, 2.5rem)`. */
  fluid?: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase';
  /** font-variation-settings, e.g. `"SOFT" 100, "opsz" 144`. */
  fontVariation?: string;
}

/**
 * The theme's type pairing. Drives the text utilities (text-display, text-page-title,
 * text-section-title, text-body, text-meta), font-heading / font-sans, and the generated DESIGN.md.
 */
export interface Typography {
  display: TypeStyle;
  pageTitle: TypeStyle;
  sectionTitle: TypeStyle;
  body: TypeStyle;
  meta: TypeStyle;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  /** One or two sentences: what the room feels like. */
  description: string;
  palette: Palette;
  layers: { canvas: Canvas; pattern: Pattern; grain: Grain; surface: Surface };
  typography: Typography;
  skin: Skin;
  details: { checkbox: CheckboxShape; divider: DividerStyle; chip: ChipShape };
  /** Texture strength, 0–1. */
  strength: number;
}

export type ThemeMode = 'light' | 'dark';

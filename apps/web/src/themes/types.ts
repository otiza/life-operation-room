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
  fontFamily: string;
  /** CSS length; rem preferred. */
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
}

/**
 * Type pairing. Until the type slot ships (THEMES-PLAN PR 4), these describe what the
 * text utilities in globals.css render; they feed the generated DESIGN.md.
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

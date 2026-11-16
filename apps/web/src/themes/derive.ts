/*
  Build a complete palette from a few seed colours per mode.
  Categorical colours (events, priority, app tints) turn only the hue at one lightness + chroma per palette,
  so any mix looks related and always belongs to the theme. The contrast test checks the result.
*/
import type { Palette, TokenMap } from './types';

/** [lightness 0–1, chroma, hue°] */
export type L_C_H = [number, number, number];

export interface PaletteSeed {
  background: L_C_H;
  foreground: L_C_H;
  /** Muted text (metadata, labels). */
  mutedText: L_C_H;
  /** Cards, popovers, inputs. */
  surface: L_C_H;
  sidebar: L_C_H;
  border: L_C_H;
  /** A quiet tint for secondary buttons and muted fills. */
  quiet: L_C_H;
  primary: L_C_H;
  onPrimary: L_C_H;
  /** Soft tint: active nav, hover, accent. */
  soft: L_C_H;
  /** Lightness and chroma for events and priorities. */
  hues: { l: number; c: number };
  /** Lightness and chroma for app tints (text-like: needs 4.5:1), and the lightness of their soft backgrounds. */
  apps: { l: number; c: number; softL: number };
  /** Notes writing surface; defaults to the surface colour. */
  paper?: L_C_H;
  /** Three colours for painted canvases (gradient blobs, mosaic tiles). Default: tints of soft and primary. */
  canvas?: [L_C_H, L_C_H, L_C_H];
}

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
export const oklch = ([l, c, h]: L_C_H) => `oklch(${fmt(l)} ${fmt(c)} ${fmt(h)})`;

const EVENT_HUES = [45, 85, 125, 165, 205, 250, 295, 340];

/** Shared non-colour tokens (same as Paper): radius, density, shadow scale, done-mark shape. */
const SHAPE: TokenMap = {
  radius: '0.875rem',
  'density-row': '2.75rem',
  'density-pad-x': '1rem',
  'density-pad-y': '0.75rem',
  'elevation-flat': 'none',
  'elevation-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'elevation-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'elevation-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'elevation-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  'elevation-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  'check-radius': 'calc(infinity * 1px)',
};

function canvasTokens(seed: PaletteSeed): TokenMap {
  const [a, b, c] = seed.canvas ?? [seed.soft, seed.quiet, [seed.soft[0], seed.soft[1], seed.primary[2]] as L_C_H];
  return { 'canvas-1': oklch(a), 'canvas-2': oklch(b), 'canvas-3': oklch(c) };
}

function modeTokens(seed: PaletteSeed, mode: 'light' | 'dark'): TokenMap {
  const dark = mode === 'dark';
  const { l: hl, c: hc } = seed.hues;
  const { l: al, c: ac, softL } = seed.apps;
  const status = (lLight: number, lDark: number, c: number, h: number): L_C_H => [dark ? lDark : lLight, c, h];
  const onStatus = (h: number): L_C_H => (dark ? [0.2, 0.03, h] : [0.99, 0.01, h]);
  const t: TokenMap = {
    'color-scheme': mode,
    background: oklch(seed.background),
    foreground: oklch(seed.foreground),
    card: oklch(seed.surface),
    'card-foreground': oklch(seed.foreground),
    popover: oklch(seed.surface),
    'popover-foreground': oklch(seed.foreground),
    primary: oklch(seed.primary),
    'primary-foreground': oklch(seed.onPrimary),
    secondary: oklch(seed.quiet),
    'secondary-foreground': oklch(seed.foreground),
    muted: oklch(seed.quiet),
    'muted-foreground': oklch(seed.mutedText),
    accent: oklch(seed.soft),
    'accent-foreground': oklch(seed.foreground),
    destructive: oklch(status(0.55, 0.65, 0.18, 25)),
    'destructive-foreground': oklch(onStatus(25)),
    success: oklch(status(0.52, 0.7, 0.12, 155)),
    'success-foreground': oklch(onStatus(155)),
    warning: oklch(status(0.72, 0.78, 0.13, 78)),
    'warning-foreground': oklch(dark ? [0.22, 0.04, 55] : [0.28, 0.05, 55]),
    border: oklch(seed.border),
    input: oklch(seed.border),
    ring: oklch(seed.primary),
    sidebar: oklch(seed.sidebar),
    'sidebar-foreground': oklch(seed.foreground),
    'sidebar-accent': oklch(seed.soft),
    'sidebar-accent-foreground': oklch(seed.foreground),
    'sidebar-border': oklch(seed.border),
    'sidebar-ring': oklch(seed.primary),
    'priority-urgent': oklch([hl, hc + 0.08, 25]),
    'priority-high': oklch([hl, hc + 0.04, 45]),
    'priority-medium': oklch([hl, hc + 0.02, 78]),
    'priority-low': oklch([hl, hc, 230]),
    'priority-none': oklch(seed.border),
    ...Object.fromEntries(EVENT_HUES.map((h, i) => [`event-${i + 1}`, oklch([hl, hc, h])])),
    'app-tasks': oklch([al, ac + 0.03, seed.primary[2]]),
    'app-tasks-soft': oklch([softL, 0.03, seed.primary[2]]),
    'app-calendar': oklch([al, ac, 150]),
    'app-calendar-soft': oklch([softL, 0.03, 150]),
    'app-notes': oklch([al, ac, 78]),
    'app-notes-soft': oklch([softL, 0.03, 78]),
    'app-projects': oklch([al, ac, 250]),
    'app-projects-soft': oklch([softL, 0.03, 250]),
    'nav-active-bg': oklch(seed.soft),
    'nav-active-marker': oklch(seed.primary),
    paper: oklch(seed.paper ?? seed.surface),
    'paper-foreground': oklch(seed.foreground),
    'elevation-raised': dark
      ? '0 1px 2px oklch(0 0 0 / 0.35), 0 1px 3px oklch(0 0 0 / 0.25)'
      : '0 1px 2px oklch(0.3 0.02 50 / 0.06), 0 1px 3px oklch(0.3 0.02 50 / 0.08)',
    'elevation-overlay': dark
      ? '0 12px 32px oklch(0 0 0 / 0.45), 0 4px 12px oklch(0 0 0 / 0.3)'
      : '0 8px 24px oklch(0.3 0.02 50 / 0.14), 0 2px 6px oklch(0.3 0.02 50 / 0.08)',
    'danger-soft': oklch(dark ? [seed.background[0] + 0.12, 0.06, 25] : [0.95, 0.03, 25]),
    'danger-soft-foreground': oklch(dark ? [0.85, 0.08, 25] : [0.48, 0.16, 25]),
    'success-soft': oklch(dark ? [seed.background[0] + 0.12, 0.05, 155] : [0.95, 0.03, 155]),
    'success-soft-foreground': oklch(dark ? [0.85, 0.08, 155] : [0.4, 0.1, 155]),
    ...canvasTokens(seed),
  };
  return dark ? t : { ...t, ...SHAPE };
}

export function buildPalette(seeds: { light: PaletteSeed; dark: PaletteSeed }): Palette {
  return { light: modeTokens(seeds.light, 'light'), dark: modeTokens(seeds.dark, 'dark') };
}

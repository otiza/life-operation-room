/*
  Palettes: the colour (and colour-bearing) tokens of each theme, per mode.
  Keys are CSS custom properties without the leading "--" ("color-scheme" is the one plain property).
  Light is complete; dark lists only what changes. Generated CSS lives in app/themes.generated.css.
*/
import { buildPalette } from './derive';
import type { Palette } from './types';

/** Paper: the original Life Room palette (warm cream, terracotta, Literata + Plex). */
export const paperPalette: Palette = {
  light: {
    'color-scheme': 'light',
    'background': 'oklch(0.975 0.008 70)',
    'foreground': 'oklch(0.24 0.02 50)',
    'card': 'oklch(0.995 0.004 70)',
    'card-foreground': 'oklch(0.24 0.02 50)',
    'popover': 'oklch(0.995 0.004 70)',
    'popover-foreground': 'oklch(0.24 0.02 50)',
    'primary': 'oklch(0.55 0.12 45)',
    'primary-foreground': 'oklch(0.99 0.01 70)',
    'secondary': 'oklch(0.95 0.012 70)',
    'secondary-foreground': 'oklch(0.32 0.03 50)',
    'muted': 'oklch(0.95 0.01 70)',
    'muted-foreground': 'oklch(0.45 0.02 55)',
    'accent': 'oklch(0.94 0.02 50)',
    'accent-foreground': 'oklch(0.3 0.04 45)',
    'destructive': 'oklch(0.55 0.18 25)',
    'destructive-foreground': 'oklch(0.99 0.01 70)',
    'success': 'oklch(0.52 0.12 155)',
    'success-foreground': 'oklch(0.99 0.01 155)',
    'warning': 'oklch(0.72 0.14 75)',
    'warning-foreground': 'oklch(0.28 0.05 55)',
    'border': 'oklch(0.9 0.012 70)',
    'input': 'oklch(0.9 0.012 70)',
    'ring': 'oklch(0.55 0.12 45)',
    'radius': '0.875rem',
    'sidebar': 'oklch(0.985 0.006 70)',
    'sidebar-foreground': 'oklch(0.28 0.02 50)',
    'sidebar-accent': 'oklch(0.95 0.02 50)',
    'sidebar-accent-foreground': 'oklch(0.24 0.02 50)',
    'sidebar-border': 'oklch(0.9 0.012 70)',
    'sidebar-ring': 'oklch(0.55 0.12 45)',
    'priority-urgent': 'oklch(0.55 0.2 25)',
    'priority-high': 'oklch(0.62 0.16 45)',
    'priority-medium': 'oklch(0.72 0.14 75)',
    'priority-low': 'oklch(0.62 0.1 230)',
    'priority-none': 'oklch(0.88 0.01 70)',
    'event-1': 'oklch(0.62 0.11 45)',
    'event-2': 'oklch(0.62 0.11 85)',
    'event-3': 'oklch(0.62 0.11 125)',
    'event-4': 'oklch(0.62 0.11 165)',
    'event-5': 'oklch(0.62 0.11 205)',
    'event-6': 'oklch(0.62 0.11 250)',
    'event-7': 'oklch(0.62 0.11 295)',
    'event-8': 'oklch(0.62 0.11 340)',
    'app-tasks': 'oklch(0.53 0.12 42)',
    'app-tasks-soft': 'oklch(0.945 0.03 42)',
    'app-calendar': 'oklch(0.5 0.08 150)',
    'app-calendar-soft': 'oklch(0.945 0.03 150)',
    'app-notes': 'oklch(0.52 0.1 78)',
    'app-notes-soft': 'oklch(0.945 0.03 78)',
    'app-projects': 'oklch(0.5 0.06 250)',
    'app-projects-soft': 'oklch(0.945 0.03 250)',
    'nav-active-bg': 'oklch(0.945 0.03 45)',
    'nav-active-marker': 'oklch(0.55 0.12 45)',
    'paper': 'oklch(0.988 0.012 82)',
    'paper-foreground': 'oklch(0.26 0.02 55)',
    'elevation-flat': 'none',
    'elevation-raised': '0 1px 2px oklch(0.3 0.02 50 / 0.06), 0 1px 3px oklch(0.3 0.02 50 / 0.08)',
    'elevation-overlay': '0 8px 24px oklch(0.3 0.02 50 / 0.14), 0 2px 6px oklch(0.3 0.02 50 / 0.08)',
    'density-row': '2.75rem',
    'density-pad-x': '1rem',
    'density-pad-y': '0.75rem',
    'danger-soft': 'oklch(0.95 0.03 25)',
    'danger-soft-foreground': 'oklch(0.48 0.16 25)',
    'success-soft': 'oklch(0.95 0.03 155)',
    'success-soft-foreground': 'oklch(0.4 0.1 155)',
    // Tailwind's shadow scale as theme tokens (Paper keeps Tailwind's defaults exactly).
    'elevation-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    'elevation-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    'elevation-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    'elevation-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    'elevation-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    // Detail token: the shape of the done mark (data-cb). Paper: circle (same as rounded-full).
    'check-radius': 'calc(infinity * 1px)',
    // Painted canvases (Mosaic tiles reuse Paper's colours).
    'canvas-1': 'oklch(0.86 0.08 45)',
    'canvas-2': 'oklch(0.9 0.07 85)',
    'canvas-3': 'oklch(0.88 0.05 150)',
  },
  dark: {
    'color-scheme': 'dark',
    'background': 'oklch(0.18 0.015 50)',
    'foreground': 'oklch(0.94 0.01 70)',
    'card': 'oklch(0.22 0.016 50)',
    'card-foreground': 'oklch(0.94 0.01 70)',
    'popover': 'oklch(0.22 0.016 50)',
    'popover-foreground': 'oklch(0.94 0.01 70)',
    'primary': 'oklch(0.72 0.12 50)',
    'primary-foreground': 'oklch(0.2 0.03 45)',
    'secondary': 'oklch(0.28 0.02 50)',
    'secondary-foreground': 'oklch(0.92 0.01 70)',
    'muted': 'oklch(0.28 0.018 50)',
    'muted-foreground': 'oklch(0.72 0.02 65)',
    'accent': 'oklch(0.3 0.03 45)',
    'accent-foreground': 'oklch(0.94 0.01 70)',
    'destructive': 'oklch(0.65 0.18 25)',
    // Dark text on the light red: white on oklch(0.65 0.18 25) was 3.3:1.
    'destructive-foreground': 'oklch(0.2 0.03 25)',
    'success': 'oklch(0.7 0.12 155)',
    'success-foreground': 'oklch(0.18 0.03 155)',
    'warning': 'oklch(0.78 0.12 80)',
    'warning-foreground': 'oklch(0.22 0.04 55)',
    'border': 'oklch(0.32 0.02 50)',
    'input': 'oklch(0.32 0.02 50)',
    'ring': 'oklch(0.72 0.12 50)',
    'sidebar': 'oklch(0.16 0.014 50)',
    'sidebar-foreground': 'oklch(0.92 0.01 70)',
    'sidebar-accent': 'oklch(0.26 0.025 45)',
    'sidebar-accent-foreground': 'oklch(0.94 0.01 70)',
    'sidebar-border': 'oklch(0.3 0.02 50)',
    'sidebar-ring': 'oklch(0.72 0.12 50)',
    'priority-urgent': 'oklch(0.7 0.18 25)',
    'priority-high': 'oklch(0.72 0.14 50)',
    'priority-medium': 'oklch(0.78 0.12 80)',
    'priority-low': 'oklch(0.72 0.1 230)',
    'priority-none': 'oklch(0.4 0.02 50)',
    'event-1': 'oklch(0.72 0.1 45)',
    'event-2': 'oklch(0.72 0.1 85)',
    'event-3': 'oklch(0.72 0.1 125)',
    'event-4': 'oklch(0.72 0.1 165)',
    'event-5': 'oklch(0.72 0.1 205)',
    'event-6': 'oklch(0.72 0.1 250)',
    'event-7': 'oklch(0.72 0.1 295)',
    'event-8': 'oklch(0.72 0.1 340)',
    'app-tasks': 'oklch(0.74 0.11 48)',
    'app-tasks-soft': 'oklch(0.28 0.04 48)',
    'app-calendar': 'oklch(0.75 0.08 150)',
    'app-calendar-soft': 'oklch(0.28 0.04 150)',
    'app-notes': 'oklch(0.78 0.1 82)',
    'app-notes-soft': 'oklch(0.28 0.04 82)',
    'app-projects': 'oklch(0.75 0.06 250)',
    'app-projects-soft': 'oklch(0.28 0.04 250)',
    'nav-active-bg': 'oklch(0.27 0.035 45)',
    'nav-active-marker': 'oklch(0.72 0.12 50)',
    'paper': 'oklch(0.205 0.014 60)',
    'paper-foreground': 'oklch(0.92 0.012 75)',
    'elevation-flat': 'none',
    'elevation-raised': '0 1px 2px oklch(0 0 0 / 0.35), 0 1px 3px oklch(0 0 0 / 0.25)',
    'elevation-overlay': '0 12px 32px oklch(0 0 0 / 0.45), 0 4px 12px oklch(0 0 0 / 0.3)',
    'danger-soft': 'oklch(0.3 0.06 25)',
    'danger-soft-foreground': 'oklch(0.85 0.08 25)',
    'success-soft': 'oklch(0.3 0.05 155)',
    'success-soft-foreground': 'oklch(0.85 0.08 155)',
    'canvas-1': 'oklch(0.36 0.09 40)',
    'canvas-2': 'oklch(0.31 0.07 75)',
    'canvas-3': 'oklch(0.28 0.05 160)',
  },
};

/** Ink: monochrome paper with the terracotta accent (Dot). */
export const inkPalette: Palette = buildPalette({
  light: {
    background: [0.985, 0, 0], foreground: [0.2, 0, 0], mutedText: [0.46, 0, 0], surface: [1, 0, 0],
    sidebar: [0.975, 0, 0], border: [0.9, 0, 0], quiet: [0.955, 0, 0], primary: [0.53, 0.13, 45],
    onPrimary: [0.99, 0, 0], soft: [0.95, 0.015, 45], hues: { l: 0.6, c: 0.08 }, apps: { l: 0.5, c: 0.06, softL: 0.95 },
  },
  dark: {
    background: [0.15, 0, 0], foreground: [0.95, 0, 0], mutedText: [0.74, 0, 0], surface: [0.19, 0, 0],
    sidebar: [0.13, 0, 0], border: [0.3, 0, 0], quiet: [0.24, 0, 0], primary: [0.73, 0.13, 50],
    onPrimary: [0.15, 0, 0], soft: [0.26, 0.03, 45], hues: { l: 0.74, c: 0.08 }, apps: { l: 0.76, c: 0.06, softL: 0.26 },
  },
});

/** Blueprint: whiteprint in light, the classic blue sheet in dark. */
export const blueprintPalette: Palette = buildPalette({
  light: {
    background: [0.972, 0.012, 240], foreground: [0.3, 0.09, 258], mutedText: [0.46, 0.07, 255], surface: [0.988, 0.008, 240],
    sidebar: [0.962, 0.016, 240], border: [0.86, 0.04, 248], quiet: [0.94, 0.025, 245], primary: [0.5, 0.16, 258],
    onPrimary: [0.98, 0.01, 240], soft: [0.93, 0.04, 248], hues: { l: 0.56, c: 0.12 }, apps: { l: 0.48, c: 0.09, softL: 0.93 },
  },
  dark: {
    background: [0.34, 0.1, 260], foreground: [0.97, 0.012, 240], mutedText: [0.86, 0.045, 240], surface: [0.38, 0.1, 260],
    sidebar: [0.31, 0.095, 260], border: [0.52, 0.08, 255], quiet: [0.42, 0.09, 260], primary: [0.88, 0.09, 210],
    onPrimary: [0.3, 0.1, 260], soft: [0.43, 0.1, 258], hues: { l: 0.86, c: 0.09 }, apps: { l: 0.88, c: 0.08, softL: 0.45 },
  },
});

/** Felt: sage wool in light, billiard green with brass in dark (Studio). */
export const feltPalette: Palette = buildPalette({
  light: {
    background: [0.925, 0.022, 130], foreground: [0.24, 0.035, 150], mutedText: [0.42, 0.035, 150], surface: [0.97, 0.012, 110],
    sidebar: [0.905, 0.026, 135], border: [0.84, 0.03, 135], quiet: [0.9, 0.03, 130], primary: [0.5, 0.12, 42],
    onPrimary: [0.99, 0.01, 70], soft: [0.89, 0.04, 135], hues: { l: 0.52, c: 0.09 }, apps: { l: 0.44, c: 0.08, softL: 0.89 },
  },
  dark: {
    background: [0.28, 0.045, 160], foreground: [0.95, 0.012, 100], mutedText: [0.82, 0.03, 120], surface: [0.32, 0.045, 160],
    sidebar: [0.25, 0.04, 160], border: [0.42, 0.045, 160], quiet: [0.35, 0.045, 160], primary: [0.8, 0.12, 75],
    onPrimary: [0.22, 0.03, 160], soft: [0.37, 0.05, 160], hues: { l: 0.82, c: 0.09 }, apps: { l: 0.84, c: 0.08, softL: 0.38 },
  },
});

/** Thermal: heat-map oranges and pinks (light), embers on plum (dark). */
export const thermalPalette: Palette = buildPalette({
  light: {
    background: [0.965, 0.02, 60], foreground: [0.24, 0.04, 30], mutedText: [0.44, 0.05, 35], surface: [0.99, 0.01, 60],
    sidebar: [0.98, 0.012, 60], border: [0.87, 0.03, 50], quiet: [0.94, 0.03, 50], primary: [0.53, 0.18, 32],
    onPrimary: [0.99, 0.01, 60], soft: [0.93, 0.05, 40], hues: { l: 0.58, c: 0.15 }, apps: { l: 0.48, c: 0.12, softL: 0.93 },
    canvas: [[0.78, 0.16, 38], [0.78, 0.14, 350], [0.88, 0.13, 88]],
  },
  dark: {
    background: [0.17, 0.03, 300], foreground: [0.96, 0.01, 60], mutedText: [0.78, 0.04, 40], surface: [0.22, 0.04, 300],
    sidebar: [0.15, 0.03, 300], border: [0.36, 0.05, 310], quiet: [0.26, 0.04, 300], primary: [0.76, 0.16, 48],
    onPrimary: [0.18, 0.03, 300], soft: [0.3, 0.07, 30], hues: { l: 0.76, c: 0.14 }, apps: { l: 0.78, c: 0.11, softL: 0.3 },
    canvas: [[0.5, 0.2, 32], [0.42, 0.2, 345], [0.36, 0.17, 290]],
  },
});

/** Deco: ivory and emerald (light), emerald and brass (dark) — Fluted. */
export const decoPalette: Palette = buildPalette({
  light: {
    background: [0.965, 0.014, 90], foreground: [0.23, 0.04, 170], mutedText: [0.42, 0.04, 170], surface: [0.985, 0.01, 90],
    sidebar: [0.955, 0.016, 90], border: [0.84, 0.03, 120], quiet: [0.93, 0.02, 120], primary: [0.45, 0.09, 165],
    onPrimary: [0.98, 0.01, 90], soft: [0.92, 0.035, 165], hues: { l: 0.55, c: 0.09 }, apps: { l: 0.46, c: 0.08, softL: 0.92 },
    canvas: [[0.72, 0.1, 165], [0.84, 0.12, 85], [0.78, 0.07, 200]],
  },
  dark: {
    background: [0.17, 0.03, 170], foreground: [0.95, 0.02, 90], mutedText: [0.79, 0.04, 100], surface: [0.21, 0.035, 170],
    sidebar: [0.15, 0.03, 170], border: [0.36, 0.05, 165], quiet: [0.25, 0.04, 170], primary: [0.8, 0.12, 85],
    onPrimary: [0.17, 0.03, 170], soft: [0.28, 0.05, 165], hues: { l: 0.76, c: 0.1 }, apps: { l: 0.8, c: 0.09, softL: 0.28 },
    canvas: [[0.42, 0.1, 165], [0.5, 0.11, 85], [0.32, 0.07, 200]],
  },
});

/** Arcade: pale screen and magenta (light), mint on indigo (dark). */
export const arcadePalette: Palette = buildPalette({
  light: {
    background: [0.955, 0.025, 105], foreground: [0.26, 0.07, 285], mutedText: [0.42, 0.07, 285], surface: [0.99, 0.012, 105],
    sidebar: [0.97, 0.02, 105], border: [0.8, 0.04, 285], quiet: [0.93, 0.03, 105], primary: [0.52, 0.21, 352],
    onPrimary: [0.99, 0.01, 105], soft: [0.92, 0.06, 340], hues: { l: 0.56, c: 0.19 }, apps: { l: 0.46, c: 0.14, softL: 0.92 },
    canvas: [[0.88, 0.09, 200], [0.86, 0.11, 340], [0.92, 0.12, 105]],
  },
  dark: {
    background: [0.17, 0.045, 285], foreground: [0.95, 0.04, 145], mutedText: [0.78, 0.07, 160], surface: [0.21, 0.055, 285],
    sidebar: [0.15, 0.04, 285], border: [0.45, 0.1, 160], quiet: [0.25, 0.06, 285], primary: [0.83, 0.19, 145],
    onPrimary: [0.17, 0.045, 285], soft: [0.28, 0.08, 150], hues: { l: 0.82, c: 0.16 }, apps: { l: 0.84, c: 0.13, softL: 0.28 },
    canvas: [[0.32, 0.13, 285], [0.3, 0.11, 205], [0.27, 0.13, 335]],
  },
});

/** Terminal: dot-matrix printout (light), green phosphor with amber (dark). */
export const terminalPalette: Palette = buildPalette({
  light: {
    background: [0.968, 0.014, 95], foreground: [0.22, 0.012, 250], mutedText: [0.42, 0.015, 250], surface: [0.985, 0.01, 95],
    sidebar: [0.95, 0.02, 100], border: [0.55, 0.012, 250], quiet: [0.93, 0.02, 100], primary: [0.45, 0.12, 150],
    onPrimary: [0.98, 0.01, 95], soft: [0.91, 0.045, 150], hues: { l: 0.5, c: 0.11 }, apps: { l: 0.44, c: 0.1, softL: 0.91 },
  },
  dark: {
    background: [0.15, 0.02, 150], foreground: [0.9, 0.17, 145], mutedText: [0.76, 0.12, 145], surface: [0.18, 0.025, 150],
    sidebar: [0.13, 0.02, 150], border: [0.55, 0.11, 145], quiet: [0.22, 0.03, 150], primary: [0.83, 0.15, 78],
    onPrimary: [0.15, 0.02, 150], soft: [0.25, 0.05, 145], hues: { l: 0.84, c: 0.14 }, apps: { l: 0.84, c: 0.12, softL: 0.25 },
  },
});

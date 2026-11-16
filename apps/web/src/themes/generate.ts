/*
  Generators: registry → CSS tokens and one DESIGN.md per theme and mode (Google's DESIGN.md format, alpha).
  Pure functions; generated.test.ts compares their output with the committed files and rewrites them
  when run with UPDATE_THEMES=1 (`pnpm --filter web themes:build`).
*/
import { parseOklch, toHex } from './color';
import { fontStack, FONTS } from './fonts';
import { DEFAULT_THEME_ID, resolveTokens } from './registry';
import type { ThemeDefinition, ThemeMode, TokenMap, TypeStyle } from './types';

const HEADER = `/*
  GENERATED from src/themes/registry.ts — do not edit by hand.
  Run \`pnpm --filter web themes:build\` after changing a theme.
*/`;

function declarations(tokens: TokenMap) {
  return Object.entries(tokens)
    .map(([key, value]) => (key === 'color-scheme' ? `  color-scheme: ${value};` : `  --${key}: ${value};`))
    .join('\n');
}

/** Type tokens read by the text utilities in globals.css (all mode-independent). */
export function typeTokens(theme: ThemeDefinition): TokenMap {
  const t = theme.typography;
  const style = (prefix: string, s: TypeStyle): TokenMap => ({
    [`type-${prefix}-size`]: s.fluid ?? s.fontSize,
    [`type-${prefix}-weight`]: String(s.fontWeight),
    [`type-${prefix}-leading`]: String(s.lineHeight),
    [`type-${prefix}-tracking`]: s.letterSpacing ?? 'normal',
    [`type-${prefix}-style`]: s.fontStyle ?? 'normal',
    [`type-${prefix}-transform`]: s.textTransform ?? 'none',
    [`type-${prefix}-variation`]: s.fontVariation ?? 'normal',
  });
  return {
    'font-display': fontStack(t.display.fontFamily),
    'font-heading': fontStack(t.pageTitle.fontFamily),
    'font-section': fontStack(t.sectionTitle.fontFamily),
    'font-body': fontStack(t.body.fontFamily),
    'font-meta': fontStack(t.meta.fontFamily),
    'font-mono': fontStack(FONTS.jetbrains.name),
    ...style('display', t.display),
    ...style('title', t.pageTitle),
    ...style('section', t.sectionTitle),
    ...style('body', t.body),
    ...style('meta', t.meta),
  };
}

export function generateThemesCss(themes: readonly ThemeDefinition[]) {
  const blocks = themes.map((theme) => {
    const isDefault = theme.id === DEFAULT_THEME_ID;
    const light = isDefault ? ':root' : `html[data-theme="${theme.id}"]`;
    const dark = isDefault ? '.dark' : `html[data-theme="${theme.id}"].dark`;
    const lightTokens = { ...theme.palette.light, 'texture-strength': String(theme.strength), ...typeTokens(theme) };
    return `/* ${theme.name} */\n${light} {\n${declarations(lightTokens)}\n}\n\n${dark} {\n${declarations(theme.palette.dark)}\n}`;
  });
  return `${HEADER}\n\n${blocks.join('\n\n')}\n`;
}

/* ───────────────────────────── DESIGN.md ───────────────────────────── */

/** Colour tokens exported to DESIGN.md; every one is referenced by a component below. */
const COLOR_TOKENS = [
  'primary', 'primary-foreground', 'background', 'foreground', 'muted-foreground', 'card', 'card-foreground',
  'sidebar', 'sidebar-foreground', 'border', 'nav-active-bg', 'paper', 'paper-foreground',
  'destructive', 'destructive-foreground', 'success', 'success-foreground', 'warning', 'warning-foreground',
  'event-1', 'event-2', 'event-3', 'event-4', 'event-5', 'event-6', 'event-7', 'event-8',
  'app-tasks', 'app-tasks-soft', 'app-calendar', 'app-calendar-soft', 'app-notes', 'app-notes-soft',
  'app-projects', 'app-projects-soft', 'priority-urgent', 'priority-high', 'priority-medium', 'priority-low',
] as const;

type Component = Partial<Record<'backgroundColor' | 'textColor' | 'typography' | 'rounded' | 'height' | 'width', string>>;

const COMPONENTS: Record<string, Component> = {
  page: { backgroundColor: '{colors.background}', textColor: '{colors.foreground}', typography: '{typography.body}' },
  'page-meta': { backgroundColor: '{colors.background}', textColor: '{colors.muted-foreground}', typography: '{typography.meta}' },
  card: { backgroundColor: '{colors.card}', textColor: '{colors.card-foreground}', rounded: '{rounded.lg}' },
  'card-meta': { backgroundColor: '{colors.card}', textColor: '{colors.muted-foreground}' },
  sidebar: { backgroundColor: '{colors.sidebar}', textColor: '{colors.sidebar-foreground}', width: '{spacing.sidebar}' },
  'sidebar-meta': { backgroundColor: '{colors.sidebar}', textColor: '{colors.muted-foreground}' },
  'nav-item-active': { backgroundColor: '{colors.nav-active-bg}', textColor: '{colors.foreground}', rounded: '{rounded.md}' },
  'button-primary': { backgroundColor: '{colors.primary}', textColor: '{colors.primary-foreground}', rounded: '{rounded.md}', height: '{spacing.row}' },
  'button-destructive': { backgroundColor: '{colors.destructive}', textColor: '{colors.destructive-foreground}', rounded: '{rounded.md}' },
  'badge-success': { backgroundColor: '{colors.success}', textColor: '{colors.success-foreground}', rounded: '{rounded.full}' },
  'badge-warning': { backgroundColor: '{colors.warning}', textColor: '{colors.warning-foreground}', rounded: '{rounded.full}' },
  'paper-surface': { backgroundColor: '{colors.paper}', textColor: '{colors.paper-foreground}' },
  'masthead-date': { textColor: '{colors.foreground}', typography: '{typography.display}' },
  'page-title': { textColor: '{colors.foreground}', typography: '{typography.page-title}' },
  'section-heading': { textColor: '{colors.foreground}', typography: '{typography.section-title}' },
  'task-row': { height: '{spacing.row}', typography: '{typography.body}' },
  divider: { backgroundColor: '{colors.border}' },
  'app-chip-tasks': { backgroundColor: '{colors.app-tasks-soft}', textColor: '{colors.app-tasks}' },
  'app-chip-calendar': { backgroundColor: '{colors.app-calendar-soft}', textColor: '{colors.app-calendar}' },
  'app-chip-notes': { backgroundColor: '{colors.app-notes-soft}', textColor: '{colors.app-notes}' },
  'app-chip-projects': { backgroundColor: '{colors.app-projects-soft}', textColor: '{colors.app-projects}' },
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`event-block-${i + 1}`, { backgroundColor: `{colors.event-${i + 1}}` }])),
  ...Object.fromEntries(['urgent', 'high', 'medium', 'low'].map((p) => [`priority-${p}`, { backgroundColor: `{colors.priority-${p}}` }])),
};

function hex(tokens: TokenMap, key: string) {
  const parsed = tokens[key] ? parseOklch(tokens[key]) : null;
  if (!parsed) throw new Error(`Token --${key} is missing or not a plain oklch() colour`);
  return toHex(parsed);
}

function typeYaml(name: string, style: TypeStyle) {
  return [
    `  ${name}:`,
    `    fontFamily: "${style.fontFamily}"`,
    `    fontSize: ${style.fontSize}`,
    `    fontWeight: ${style.fontWeight}`,
    `    lineHeight: ${style.lineHeight}`,
    ...(style.letterSpacing ? [`    letterSpacing: ${style.letterSpacing}`] : []),
  ].join('\n');
}

function remToPx(value: string) {
  return value.endsWith('rem') ? `${Math.round(parseFloat(value) * 16)}px` : value;
}

export function generateDesignMd(theme: ThemeDefinition, mode: ThemeMode) {
  const tokens = resolveTokens(theme, mode);
  const radius = remToPx(tokens.radius ?? '0.875rem');
  const r = parseFloat(radius);
  const t = theme.typography;
  const components = Object.entries(COMPONENTS)
    .map(([name, props]) => `  ${name}:\n${Object.entries(props).map(([k, v]) => `    ${k}: "${v}"`).join('\n')}`)
    .join('\n');

  const frontMatter = `---
version: alpha
name: "Life Room — ${theme.name} (${mode})"
description: "${theme.description.replace(/"/g, "'")}"
colors:
${COLOR_TOKENS.map((key) => `  ${key}: "${hex(tokens, key)}"`).join('\n')}
typography:
${typeYaml('display', t.display)}
${typeYaml('page-title', t.pageTitle)}
${typeYaml('section-title', t.sectionTitle)}
${typeYaml('body', t.body)}
${typeYaml('meta', t.meta)}
rounded:
  none: 0px
  sm: ${Math.max(0, r - 4)}px
  md: ${Math.max(0, r - 2)}px
  lg: ${r}px
  xl: ${r + 4}px
  full: 9999px
spacing:
  unit: 4px
  row: ${remToPx(tokens['density-row'] ?? '2.75rem')}
  gutter: 16px
  reading: 760px
  sidebar: 236px
components:
${components}
---`;

  const { canvas, pattern, grain, surface } = theme.layers;
  const body = `
## Overview

${theme.description}

Life Room is a calm daily planner: the day is the hero. Every theme shares one layout — sidebar, a reading column of about 760px, the Home masthead — and changes only the room: palette, texture, material, type and small component shapes.

| Slot | Value |
|---|---|
| Canvas | ${canvas} |
| Pattern | ${pattern} |
| Grain | ${grain} |
| Surface | ${surface} |
| Skin | ${theme.skin} |
| Checkbox · divider · chip | ${theme.details.checkbox} · ${theme.details.divider} · ${theme.details.chip} |

## Colors

- **Primary** (\`{colors.primary}\`): the one thing that matters now — the main action of a view, **Now**, progress, done checkboxes. Navigation uses a soft tint (\`{colors.nav-active-bg}\`) and a thin marker, never a primary fill.
- **Background / foreground**: body text is at least 7:1; muted text (\`{colors.muted-foreground}\`) at least 5.5:1 on the canvas, cards and the sidebar.
- **Event colours** (\`event-1…8\`) share one lightness and chroma; only the hue turns. They are shapes, at least 3:1 against the canvas.
- **App tints** (\`app-*\`) mark an app's icon, nav marker and small labels. Never large fills.

## Typography

- Display (Home date): ${t.display.fontFamily} ${t.display.fontWeight}, ${t.display.fontSize}.
- Page and section titles: ${t.pageTitle.fontFamily}.
- Body, controls and metadata: ${t.body.fontFamily}.
- Sentence case everywhere; no all-caps eyebrows.

## Layout

One reading width (about 760px) for lists and writing; full width only for the calendar grid and the task board. 4px base unit, ${remToPx(tokens['density-row'] ?? '2.75rem')} minimum row height, 16px phone gutter.

## Elevation & Depth

Surface material: **${surface}**. Lists sit on the canvas with hairline dividers; cards only for what floats (dialogs, sheets, popovers, calendar blocks, board cards). Three elevations: flat, raised, overlay.

## Shapes

Base radius ${r}px. Checkboxes are **${theme.details.checkbox}**, dividers **${theme.details.divider}**, chips **${theme.details.chip}**.

## Components

Components declare a role — page, card, floating surface, chrome, reading content, meta — and the theme decides how that role looks. One primary button per view.

## Do's and Don'ts

- Do use token references everywhere; never inline colours, fonts or radii.
- Do keep small text off busy textures (the engine masks textures out of the reading column).
- Don't fill navigation with the primary colour.
- Don't use raw Tailwind palette classes (\`text-red-600\`, \`bg-emerald-500\`, …).
`;
  return `${frontMatter}\n${body}`;
}

import { describe, expect, it } from 'vitest';
import { contrast, parseOklch, type Oklch } from '../themes/color';
import { THEMES, resolveTokens } from '../themes/registry';

/*
  Checks the contrast rules in docs/DESIGN.md against every theme in the registry, in light and dark.
  Body text needs 7:1, muted text 5.5:1, other text 4.5:1 (WCAG AA). Event colours are shapes and need 3:1.
*/

const BODY_PAIRS: [string, string][] = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['sidebar-foreground', 'sidebar'],
  ['paper-foreground', 'paper'],
];

const MUTED_PAIRS: [string, string][] = [
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'sidebar'],
  ['muted-foreground', 'paper'],
];

const TEXT_PAIRS: [string, string][] = [
  ['primary-foreground', 'primary'],
  ['primary', 'background'],
  ['foreground', 'nav-active-bg'],
  ['app-tasks', 'background'],
  ['app-tasks', 'app-tasks-soft'],
  ['app-calendar', 'background'],
  ['app-calendar', 'app-calendar-soft'],
  ['app-notes', 'background'],
  ['app-notes', 'app-notes-soft'],
  ['app-projects', 'background'],
  ['app-projects', 'app-projects-soft'],
];

const cases = THEMES.flatMap((theme) =>
  (['light', 'dark'] as const).map((mode) => {
    const tokens = resolveTokens(theme, mode);
    const colors: Record<string, Oklch> = {};
    for (const [key, value] of Object.entries(tokens)) {
      const parsed = parseOklch(value);
      if (parsed) colors[key] = parsed;
    }
    return [`${theme.id} (${mode})`, colors] as const;
  }),
);

describe.each(cases)('%s tokens', (_name, theme) => {
  const ratio = (fg: string, bg: string) => {
    expect(theme[fg], fg).toBeDefined();
    expect(theme[bg], bg).toBeDefined();
    return contrast(theme[fg], theme[bg]);
  };

  it.each(BODY_PAIRS)('body text %s on %s reaches 7:1', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(7);
  });

  it.each(MUTED_PAIRS)('muted text %s on %s reaches 5.5:1', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(5.5);
  });

  it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('event colours reach 3:1 against the canvas and share one lightness', () => {
    const events = Array.from({ length: 8 }, (_, index) => theme[`event-${index + 1}`]);
    for (const event of events) expect(contrast(event, theme.background)).toBeGreaterThanOrEqual(3);
    expect(new Set(events.map(([L, C]) => `${L} ${C}`)).size).toBe(1);
  });
});

describe('registry', () => {
  it('has unique theme ids', () => {
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
  });

  it('every theme defines the same tokens as the default theme', () => {
    const required = Object.keys(THEMES[0].palette.light);
    for (const theme of THEMES) {
      expect(Object.keys(theme.palette.light).sort(), theme.id).toEqual([...required].sort());
    }
  });
});

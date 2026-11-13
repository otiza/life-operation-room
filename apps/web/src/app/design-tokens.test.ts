import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
  Checks the contrast rules in docs/DESIGN.md against the real tokens in globals.css,
  in both themes. Text pairs need 4.5:1 (WCAG AA). Event colours are shapes and need 3:1.
*/

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing ${selector} block`);
  return css.slice(start, css.indexOf('\n}', start));
}

type Oklch = [number, number, number];

function tokens(selector: string): Record<string, Oklch> {
  const out: Record<string, Oklch> = {};
  for (const match of block(selector).matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    out[match[1]] = [Number(match[2]), Number(match[3]), Number(match[4])];
  }
  return out;
}

function luminance([L, C, h]: Oklch) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(x: Oklch, y: Oklch) {
  const a = luminance(x);
  const b = luminance(y);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ['foreground', 'background'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
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
  ['paper-foreground', 'paper'],
  ['muted-foreground', 'paper'],
];

const light = tokens(':root');
const dark = { ...light, ...tokens('.dark') };

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme tokens', (_name, theme) => {
  it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(theme[fg], fg).toBeDefined();
    expect(theme[bg], bg).toBeDefined();
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it('event colours reach 3:1 against the canvas and share one lightness', () => {
    const events = Array.from({ length: 8 }, (_, index) => theme[`event-${index + 1}`]);
    for (const event of events) expect(contrast(event, theme.background)).toBeGreaterThanOrEqual(3);
    expect(new Set(events.map(([L, C]) => `${L} ${C}`)).size).toBe(1);
  });
});

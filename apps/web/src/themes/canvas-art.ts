/*
  Painted canvases, generated once into static SVGs (public/themes/canvas-<theme>-<mode>.svg) from the theme's own
  colours — nothing is drawn in the browser. Mosaic: a pixel grid; tiles: big tiles with grout lines; ascii: a
  character-drawn sun and hills. generated.test.ts keeps the files in sync with the registry.
*/
import { parseOklch, toHex } from './color';
import { resolveTokens } from './registry';
import type { ThemeDefinition, ThemeMode } from './types';

const hex = (value: string) => toHex(parseOklch(value)!);

function rgb(h: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t)) as [number, number, number];
}
const toCss = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Colours of a cell: the background blended toward three blobs, quantised to 5 steps so cells read as pixels. */
function cellColours(theme: ThemeDefinition, mode: ThemeMode, cols: number, rows: number, strength: number) {
  const t = resolveTokens(theme, mode);
  const bg = rgb(hex(t.background));
  const blobs: [number, number, [number, number, number]][] = [
    [0.1, 0.1, rgb(hex(t['canvas-1']))],
    [0.9, 0.15, rgb(hex(t['canvas-2']))],
    [0.6, 1, rgb(hex(t['canvas-3']))],
    [0.3, 0.7, rgb(hex(t['canvas-2']))],
  ];
  const accent = rgb(hex(t.primary));
  const random = rng(17);
  const q = (v: number) => Math.max(0, Math.min(1, Math.round(v * 5) / 5));
  const grid: string[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: string[] = [];
    for (let x = 0; x < cols; x++) {
      let c = bg;
      for (const [bx, by, colour] of blobs) {
        const d = Math.hypot(x / cols - bx, (y / rows - by) * 1.2);
        const k = q(1 - d * 1.55 + (random() - 0.5) * 0.35);
        if (k > 0) c = mix(c, colour, k * strength);
      }
      if (random() < 0.012) c = mix(c, accent, 0.45);
      row.push(toCss(c));
    }
    grid.push(row);
  }
  return grid;
}

function mosaicSvg(theme: ThemeDefinition, mode: ThemeMode) {
  const cols = 56;
  const rows = 38;
  const grid = cellColours(theme, mode, cols, rows, 0.7);
  let rects = '';
  grid.forEach((row, y) => {
    // Merge runs of the same colour into one rect.
    let start = 0;
    for (let x = 1; x <= cols; x++) {
      if (x === cols || row[x] !== row[start]) {
        rects += `<rect x="${start}" y="${y}" width="${x - start}" height="1" fill="${row[start]}"/>`;
        start = x;
      }
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">${rects}</svg>\n`;
}

function tilesSvg(theme: ThemeDefinition, mode: ThemeMode) {
  const cols = 26;
  const rows = 18;
  const size = 12;
  const grid = cellColours(theme, mode, cols, rows, 0.85);
  const grout = hex(resolveTokens(theme, mode).border);
  let rects = `<rect width="${cols * size}" height="${rows * size}" fill="${grout}"/>`;
  grid.forEach((row, y) => row.forEach((fill, x) => {
    rects += `<rect x="${x * size + 1}" y="${y * size + 1}" width="${size - 1}" height="${size - 1}" fill="${fill}"/>`;
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * size} ${rows * size}" preserveAspectRatio="xMidYMid slice">${rects}</svg>\n`;
}

function asciiSvg(theme: ThemeDefinition, mode: ThemeMode) {
  const ramp = ' .·:-=+*#%@';
  const cols = 200;
  const rows = 80;
  const random = rng(7);
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const u = x / cols;
      const v = y / rows;
      const d = Math.hypot((u - 0.94) * 2.2, (v - 0.2) * 1.1);
      const sun = Math.max(0, 1 - d * 4.2) * 1.4;
      const halo = Math.max(0, 0.5 - d) * 0.7 * (0.6 + 0.4 * Math.sin(Math.atan2(v - 0.2, u - 0.94) * 14));
      const horizon = 0.8 + 0.05 * Math.sin(u * 7.5) + 0.025 * Math.sin(u * 19 + 1.3);
      const hill = v > horizon ? 0.3 + (v - horizon) * 2.4 : 0;
      const value = Math.min(1, Math.max(0, Math.max(sun + halo, hill) + (random() - 0.5) * 0.14));
      line += ramp[Math.floor(value * (ramp.length - 1))];
    }
    lines.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  }
  const ink = hex(resolveTokens(theme, mode).foreground);
  const text = lines.map((line, i) => `<text x="0" y="${(i + 1) * 14}" xml:space="preserve">${line}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * 7.2} ${rows * 14}" preserveAspectRatio="xMidYMid slice" font-family="ui-monospace, Menlo, monospace" font-size="12" fill="${ink}" opacity="0.55">${text}</svg>\n`;
}

/** The canvas art files a theme needs, keyed by public path. */
export function canvasArt(theme: ThemeDefinition): Record<string, string> {
  const draw = { mosaic: mosaicSvg, tiles: tilesSvg, ascii: asciiSvg }[theme.layers.canvas as 'mosaic' | 'tiles' | 'ascii'];
  if (!draw) return {};
  return Object.fromEntries((['light', 'dark'] as const).map((mode) => [canvasPath(theme.id, mode), draw(theme, mode)]));
}

export const canvasPath = (themeId: string, mode: ThemeMode) => `/themes/canvas-${themeId}-${mode}.svg`;

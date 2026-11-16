/*
  Font families the themes may use. Each is loaded with next/font in app/layout.tsx under the CSS
  variable named here; only Paper's are preloaded. A face is downloaded only when the active theme uses it.
  A theme names families by `name`; the generator turns that into a full font stack.
*/

export interface FontFamily {
  /** The family name as themes refer to it (and as Google Fonts names it). */
  name: string;
  /** CSS variable set by next/font on <html>. */
  variable: string;
  fallback: string;
}

const SERIF = 'ui-serif, Georgia, serif';
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export const FONTS = {
  literata: { name: 'Literata', variable: '--font-literata', fallback: SERIF },
  plex: { name: 'IBM Plex Sans', variable: '--font-plex', fallback: SANS },
  jetbrains: { name: 'JetBrains Mono', variable: '--font-jetbrains', fallback: MONO },
  fraunces: { name: 'Fraunces', variable: '--font-fraunces', fallback: SERIF },
  workSans: { name: 'Work Sans', variable: '--font-work-sans', fallback: SANS },
  instrumentSerif: { name: 'Instrument Serif', variable: '--font-instrument-serif', fallback: SERIF },
  inter: { name: 'Inter', variable: '--font-inter', fallback: SANS },
  plexCondensed: { name: 'IBM Plex Sans Condensed', variable: '--font-plex-condensed', fallback: SANS },
  plexMono: { name: 'IBM Plex Mono', variable: '--font-plex-mono', fallback: MONO },
  youngSerif: { name: 'Young Serif', variable: '--font-young-serif', fallback: SERIF },
  figtree: { name: 'Figtree', variable: '--font-figtree', fallback: SANS },
} as const satisfies Record<string, FontFamily>;

const BY_NAME = new Map<string, FontFamily>(Object.values(FONTS).map((font) => [font.name, font]));

/** `var(--font-literata), "Literata", ui-serif, Georgia, serif` */
export function fontStack(name: string) {
  const font = BY_NAME.get(name);
  if (!font) throw new Error(`Unknown font family "${name}" — add it to themes/fonts.ts and app/layout.tsx`);
  return `var(${font.variable}), "${font.name}", ${font.fallback}`;
}

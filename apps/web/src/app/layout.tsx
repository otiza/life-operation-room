import type { Metadata } from 'next';
import {
  Bodoni_Moda,
  Bricolage_Grotesque,
  DM_Sans,
  Figtree,
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Condensed,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Jost,
  Literata,
  Pixelify_Sans,
  Syne,
  Work_Sans,
  Young_Serif,
} from 'next/font/google';
import { Providers } from '../components/providers';
import { AppearanceBootScript } from '../features/appearance/appearance-boot-script';
import { DEFAULT_THEME_ID, getTheme, themeAttributes } from '../themes/registry';
import './globals.css';

/*
  Font families for every registered theme (see src/themes/fonts.ts for the variable names).
  Paper's three are preloaded; the rest are declared with preload: false, so the browser only
  downloads a face when the active theme actually uses it.
*/
const plex = IBM_Plex_Sans({ variable: '--font-plex', subsets: ['latin'], weight: ['400', '500', '600'] });
const literata = Literata({ variable: '--font-literata', subsets: ['latin'], weight: ['500', '600', '700'] });
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'], weight: ['400', '500', '700'] });

// next/font needs literal options (no spreads or shared objects).
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], preload: false, display: 'swap', axes: ['SOFT', 'opsz'] });
const workSans = Work_Sans({ variable: '--font-work-sans', subsets: ['latin'], preload: false, display: 'swap' });
const instrumentSerif = Instrument_Serif({ variable: '--font-instrument-serif', subsets: ['latin'], preload: false, display: 'swap', weight: '400', style: ['normal', 'italic'] });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'], preload: false, display: 'swap' });
const plexCondensed = IBM_Plex_Sans_Condensed({ variable: '--font-plex-condensed', subsets: ['latin'], preload: false, display: 'swap', weight: ['400', '500', '600'] });
const plexMono = IBM_Plex_Mono({ variable: '--font-plex-mono', subsets: ['latin'], preload: false, display: 'swap', weight: ['400', '500'] });
const youngSerif = Young_Serif({ variable: '--font-young-serif', subsets: ['latin'], preload: false, display: 'swap', weight: '400' });
const figtree = Figtree({ variable: '--font-figtree', subsets: ['latin'], preload: false, display: 'swap' });
const syne = Syne({ variable: '--font-syne', subsets: ['latin'], preload: false, display: 'swap' });
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'], preload: false, display: 'swap' });
const bodoni = Bodoni_Moda({ variable: '--font-bodoni', subsets: ['latin'], preload: false, display: 'swap', style: ['normal', 'italic'], axes: ['opsz'] });
const jost = Jost({ variable: '--font-jost', subsets: ['latin'], preload: false, display: 'swap' });
const bricolage = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'], preload: false, display: 'swap', axes: ['opsz'] });
const pixelify = Pixelify_Sans({ variable: '--font-pixelify', subsets: ['latin'], preload: false, display: 'swap' });

const fontVariables = [plex, literata, jetbrains, fraunces, workSans, instrumentSerif, inter, plexCondensed, plexMono, youngSerif, figtree, syne, dmSans, bodoni, jost, bricolage, pixelify]
  .map((font) => font.variable)
  .join(' ');

export const metadata: Metadata = {
  title: 'Life Room',
  description: 'Modular life manager shell',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
      // Server render uses the default theme; AppearanceBootScript swaps in the person's theme before first paint.
      {...themeAttributes(getTheme(DEFAULT_THEME_ID)!)}
      data-focus="off"
    >
      <head>
        <AppearanceBootScript />
      </head>
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

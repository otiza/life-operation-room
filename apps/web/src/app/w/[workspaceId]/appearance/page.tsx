'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PageContainer, PageHeader } from '../../../../components/layout/page-container';
import { ThemeToggle } from '../../../../components/theme-toggle';
import { Button } from '../../../../components/ui/button';
import { CheckMark } from '../../../../components/ui/check-mark';
import { SectionHeading } from '../../../../components/ui/section-heading';
import { Skeleton } from '../../../../components/ui/skeleton';
import { applyAppearance, hasTexture, SELECTABLE_THEMES } from '../../../../features/appearance/appearance';
import { useAppearance } from '../../../../features/appearance/use-appearance';
import { cn } from '../../../../lib/utils';
import { fontStack } from '../../../../themes/fonts';
import { getTheme, resolveTokens } from '../../../../themes/registry';
import type { ThemeDefinition } from '../../../../themes/types';

const LAYER_LABEL: Record<string, string> = {
  none: '',
  plain: '',
  grid: 'Grid',
  dots: 'Dot grid',
  halftone: 'Halftone',
  scanlines: 'Scanlines',
  noise: 'grain',
  paper: 'paper grain',
  felt: 'felt',
};

function textureLabel(theme: ThemeDefinition) {
  const parts = [LAYER_LABEL[theme.layers.pattern], LAYER_LABEL[theme.layers.grain]].filter(Boolean);
  if (parts.length === 0) return 'No texture';
  const label = parts.join(' · ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** A small, self-contained picture of a theme in the current mode: its canvas, a card, the accent and its type. */
function ThemePreview({ theme, mode }: { theme: ThemeDefinition; mode: 'light' | 'dark' }) {
  const tokens = resolveTokens(theme, mode);
  const style = {
    '--preview-bg': tokens.background,
    '--preview-fg': tokens.foreground,
    '--preview-muted': tokens['muted-foreground'],
    '--preview-surface': tokens.card,
    '--preview-border': tokens.border,
    '--preview-primary': tokens.primary,
    '--preview-display': fontStack(theme.typography.display.fontFamily),
    '--preview-body': fontStack(theme.typography.body.fontFamily),
  } as CSSProperties;
  return (
    <div className="theme-preview flex h-28 flex-col justify-between rounded-lg p-3" style={style} aria-hidden>
      <span className="theme-preview-display text-2xl leading-none">Monday</span>
      <div className="theme-preview-card flex items-center gap-2 rounded-md px-2 py-1.5">
        <span className="theme-preview-accent h-3 w-3 shrink-0 rounded-full" />
        <span className="theme-preview-body truncate text-xs">Pick the five hero themes</span>
        <span className="theme-preview-muted theme-preview-body ml-auto text-[10px]">Today</span>
      </div>
    </div>
  );
}

export default function AppearancePage() {
  const { appearance, loaded, update, saving, failed } = useAppearance();
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
  const current = getTheme(appearance.theme) ?? SELECTABLE_THEMES[0];
  const [strength, setStrength] = useState<number | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const shownStrength = strength ?? appearance.strength ?? current.strength;

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  function changeStrength(value: number) {
    setStrength(value);
    applyAppearance({ ...appearance, strength: value });
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      update({ strength: value });
      setStrength(null);
    }, 400);
  }

  return (
    <PageContainer>
      <PageHeader title="Appearance" description="Choose the room you work in. It follows you to every device you sign in on." />

      <section className="space-y-3" aria-labelledby="appearance-theme">
        <SectionHeading id="appearance-theme" title="Theme" meta={saving ? 'Saving…' : failed ? 'Could not save. Try again.' : undefined} />
        {!loaded ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {SELECTABLE_THEMES.map((theme) => (
              <Skeleton key={theme.id} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div role="radiogroup" aria-labelledby="appearance-theme" className="grid gap-3 sm:grid-cols-2">
            {SELECTABLE_THEMES.map((theme) => {
              const selected = theme.id === current.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setStrength(null);
                    update({ theme: theme.id as typeof appearance.theme, strength: null });
                  }}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border surface-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground/30',
                  )}
                >
                  <ThemePreview theme={theme} mode={mode} />
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{theme.name}</span>
                      <span className="mt-0.5 block text-meta text-muted-foreground">{textureLabel(theme)}</span>
                    </span>
                    {selected ? <CheckMark checked /> : null}
                  </span>
                  <span className="text-meta text-muted-foreground">{theme.description}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="appearance-mode">
        <SectionHeading id="appearance-mode" title="Light or dark" />
        <ThemeToggle className="max-w-sm" />
      </section>

      <section className="space-y-3" aria-labelledby="appearance-texture">
        <SectionHeading id="appearance-texture" title="Texture" />
        {hasTexture(current.id) ? (
          <div className="flex max-w-sm flex-wrap items-center gap-3">
            <label className="flex flex-1 items-center gap-3 text-sm">
              <span className="shrink-0">Strength</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={shownStrength}
                onChange={(event) => changeStrength(Number(event.target.value))}
                className="w-full accent-primary"
                aria-valuetext={`${Math.round(shownStrength * 100)} percent`}
              />
            </label>
            {appearance.strength !== null ? (
              <Button variant="ghost" size="sm" onClick={() => update({ strength: null })}>
                Use the theme’s default
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{current.name} has no texture.</p>
        )}
        <p className="text-meta text-muted-foreground">Texture always stays out from under lists and writing.</p>
      </section>

      <section className="space-y-3" aria-labelledby="appearance-focus">
        <SectionHeading id="appearance-focus" title="Focus mode" />
        <div className="flex max-w-xl items-start justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Hide textures and keep only the theme’s colours and type. Press <kbd className="rounded border border-border px-1 font-mono text-xs">f</kbd> anywhere to switch.
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={appearance.focus}
            aria-label="Focus mode"
            onClick={() => update({ focus: !appearance.focus })}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              appearance.focus ? 'bg-primary' : 'bg-muted ring-1 ring-inset ring-border',
            )}
          >
            <span
              className={cn(
                'absolute left-0 top-0.5 h-5 w-5 rounded-full surface-control shadow-sm transition-transform',
                appearance.focus ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      </section>
    </PageContainer>
  );
}

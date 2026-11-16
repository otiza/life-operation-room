/*
  Appearance on the client (THEMES-PLAN PR 5): apply a person's theme, texture strength and focus mode to <html>,
  and keep a local copy so the boot script (appearance-boot-script.tsx) can apply it before the first paint.
  The server (users.appearance) is the source of truth; the shell re-applies it whenever /auth/me loads.
*/
import { THEME_IDS, type Appearance, type UpdateAppearanceInput } from '@life-room/shared';
import { api } from '../../lib/api';
import { DEFAULT_THEME_ID, getTheme, themeAttributes, THEMES } from '../../themes/registry';

export const APPEARANCE_STORAGE_KEY = 'lr-appearance';
/** Development only: the Theme lab and `?theme=` preview any registered theme without saving it. */
export const DEV_THEME_KEY = 'lr-dev-theme';

/** Themes a person can pick (THEME_IDS in @life-room/shared), in registry order. */
export const SELECTABLE_THEMES = THEMES.filter((theme) => (THEME_IDS as readonly string[]).includes(theme.id));

function devThemeId(): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  try {
    return localStorage.getItem(DEV_THEME_KEY);
  } catch {
    return null;
  }
}

export function applyAppearance(appearance: Appearance) {
  const theme = getTheme(devThemeId() ?? appearance.theme) ?? getTheme(DEFAULT_THEME_ID)!;
  const html = document.documentElement;
  for (const [name, value] of Object.entries(themeAttributes(theme))) html.setAttribute(name, value);
  if (appearance.strength === null) html.style.removeProperty('--texture-strength');
  else html.style.setProperty('--texture-strength', String(appearance.strength));
  html.setAttribute('data-focus', appearance.focus ? 'on' : 'off');
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Private mode: it still applies for this page.
  }
}

export function updateAppearance(patch: UpdateAppearanceInput) {
  return api<{ appearance: Appearance }>('/auth/me/appearance', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** Does this theme draw any texture (so a strength slider means something)? */
export function hasTexture(themeId: string) {
  const theme = getTheme(themeId);
  if (!theme) return false;
  const { canvas, pattern, grain } = theme.layers;
  return canvas !== 'plain' || pattern !== 'none' || grain !== 'none';
}

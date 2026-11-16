'use client';

import { useEffect } from 'react';

/*
  Development only (THEMES-PLAN PR 3): pick any registered theme with `?theme=<id>` on any page.
  The choice is remembered in localStorage until Appearance (PR 5) stores it per user.
  Rendered by Providers only when NODE_ENV !== 'production'.
*/
export const DEV_THEME_KEY = 'lr-dev-theme';

export async function applyDevTheme(id: string) {
  const { getTheme, themeAttributes, DEFAULT_THEME_ID } = await import('../themes/registry');
  const theme = getTheme(id) ?? getTheme(DEFAULT_THEME_ID)!;
  for (const [name, value] of Object.entries(themeAttributes(theme))) {
    document.documentElement.setAttribute(name, value);
  }
  try {
    localStorage.setItem(DEV_THEME_KEY, theme.id);
  } catch {
    // Private mode: the theme still applies for this page.
  }
}

export function DevThemeOverride() {
  useEffect(() => {
    let id: string | null = new URLSearchParams(window.location.search).get('theme');
    if (!id) {
      try {
        id = localStorage.getItem(DEV_THEME_KEY);
      } catch {
        id = null;
      }
    }
    if (id) void applyDevTheme(id);
  }, []);
  return null;
}

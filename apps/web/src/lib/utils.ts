import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
  Teach tailwind-merge the theme utilities from globals.css, so `cn('surface-card', 'bg-muted')`
  resolves like two background classes (last one wins) instead of keeping both.
*/
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'bg-color': [{ surface: ['card', 'floating', 'chrome', 'control'] }],
      rounded: [{ rounded: ['check'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

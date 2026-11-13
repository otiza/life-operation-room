import * as lucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Each app's quiet signature tint. Only for its icon, nav marker and small labels. */
export function appTintClass(appKey: string) {
  switch (appKey) {
    case 'tasks':
      return 'text-app-tasks';
    case 'calendar':
      return 'text-app-calendar';
    case 'notes':
      return 'text-app-notes';
    case 'projects':
      return 'text-app-projects';
    default:
      return 'text-muted-foreground';
  }
}

/** The icon named in an app manifest (`manifest.nav.icon`), in the app's tint. */
export function AppIcon({ name, appKey, className }: { name: string; appKey: string; className?: string }) {
  const icons = lucideIcons as unknown as Record<string, LucideIcon | undefined>;
  const Icon = icons[name];
  if (!Icon) return <span className={cn('h-4 w-4 shrink-0', className)} aria-hidden />;
  return <Icon className={cn('h-4 w-4 shrink-0', appTintClass(appKey), className)} aria-hidden />;
}

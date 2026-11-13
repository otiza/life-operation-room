'use client';

import Link from 'next/link';
import { BookOpen, ChevronsUpDown, LogOut, Plus, Settings } from 'lucide-react';
import { Menu } from '../../components/ui/menu';
import { ThemeToggle } from '../../components/theme-toggle';

const itemClass =
  'flex min-h-10 w-full items-center gap-2.5 rounded-sm px-2.5 text-left text-sm text-popover-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent';

/**
 * The one profile button at the bottom of the sidebar. Everything that is not
 * part of the day (settings, manual, adding apps, theme, logging out) lives here.
 */
export function ProfileMenu({
  name,
  email,
  workspaceId,
  onNavigate,
  onLogout,
}: {
  name: string;
  email: string;
  workspaceId: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const initial = (name || email).trim().charAt(0).toUpperCase() || '?';
  const base = `/w/${workspaceId}`;
  const links = [
    { href: `${base}/settings`, label: 'Settings', icon: Settings },
    { href: `${base}/docs/start`, label: 'Manual', icon: BookOpen },
    { href: `${base}/apps`, label: 'Add apps', icon: Plus },
  ];

  return (
    <Menu
      aria-label="Profile"
      triggerAriaLabel={`Profile menu for ${name || email}`}
      side="top"
      align="stretch"
      className="w-full"
      triggerClassName="min-h-11 w-full justify-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent"
      trigger={
        <>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-tasks-soft text-xs font-semibold text-app-tasks"
            aria-hidden
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{name || email}</span>
            {name ? <span className="block truncate text-meta text-muted-foreground">{email}</span> : null}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </>
      }
    >
      <div className="grid gap-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} role="menuitem" className={itemClass} onClick={onNavigate}>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {link.label}
            </Link>
          );
        })}
        <div className="my-1 border-t border-border" role="separator" />
        <div className="px-1 py-1">
          <ThemeToggle />
        </div>
        <div className="my-1 border-t border-border" role="separator" />
        <button type="button" role="menuitem" className={itemClass} onClick={onLogout}>
          <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          Log out
        </button>
      </div>
    </Menu>
  );
}

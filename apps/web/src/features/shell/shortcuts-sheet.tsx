'use client';

import Link from 'next/link';
import { Dialog } from '../../components/ui/dialog';
import { listRegisteredShortcuts } from './command-registry';

const SHELL_SHORTCUTS = [
  { id: 'shell-palette', label: 'Command palette', shortcut: '⌘K' },
  { id: 'shell-help', label: 'Keyboard shortcuts', shortcut: '?' },
];

export function ShortcutsSheet({
  open,
  onClose,
  installedAppKeys,
  manualHref,
}: {
  open: boolean;
  onClose: () => void;
  installedAppKeys: string[];
  manualHref?: string;
}) {
  const appShortcuts = listRegisteredShortcuts(installedAppKeys);
  const rows = [...SHELL_SHORTCUTS, ...appShortcuts];

  return (
    <Dialog open={open} onClose={onClose} className="sm:max-w-md" aria-labelledby="shortcuts-title">
      <div className="space-y-3 p-4">
        <h2 id="shortcuts-title" className="text-section-title text-foreground">
          Keyboard shortcuts
        </h2>
        <ul className="space-y-2">
          {rows.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{item.shortcut}</kbd>
            </li>
          ))}
        </ul>
        {manualHref ? (
          <Link href={manualHref} onClick={onClose} className="inline-flex text-sm text-foreground underline-offset-4 hover:underline">
            Open the manual
          </Link>
        ) : null}
      </div>
    </Dialog>
  );
}

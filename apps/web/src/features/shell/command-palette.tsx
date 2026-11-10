'use client';

import { useMemo, useState } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { listRegisteredCommands, type ShellCommand } from './command-registry';

export function ShellCommandPalette({
  open,
  onClose,
  installedAppKeys,
  extraCommands = [],
  onCalendarDate,
}: {
  open: boolean;
  onClose: () => void;
  installedAppKeys: string[];
  extraCommands?: ShellCommand[];
  /** When calendar is installed, YYYY-MM-DD in the query jumps to that day. */
  onCalendarDate?: (date: Date) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="sm:max-w-lg" aria-labelledby="command-palette-title">
      {open ? (
        <PaletteBody
          key="open"
          onClose={onClose}
          installedAppKeys={installedAppKeys}
          extraCommands={extraCommands}
          onCalendarDate={installedAppKeys.includes('calendar') ? onCalendarDate : undefined}
        />
      ) : null}
    </Dialog>
  );
}

function PaletteBody({
  onClose,
  installedAppKeys,
  extraCommands,
  onCalendarDate,
}: {
  onClose: () => void;
  installedAppKeys: string[];
  extraCommands: ShellCommand[];
  onCalendarDate?: (date: Date) => void;
}) {
  const [query, setQuery] = useState('');
  const commands = useMemo(
    () => [...listRegisteredCommands(installedAppKeys), ...extraCommands],
    [extraCommands, installedAppKeys],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        (item.keywords ?? '').toLowerCase().includes(needle),
    );
  }, [commands, query]);

  return (
    <div className="space-y-3 p-4">
      <h2 id="command-palette-title" className="text-section-title text-foreground">
        Command palette
      </h2>
      <Input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={
          onCalendarDate ? 'Search commands or type a date (YYYY-MM-DD)' : 'Search commands…'
        }
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          const dateMatch = query.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
          if (dateMatch && onCalendarDate) {
            onCalendarDate(new Date(`${dateMatch[1]}T12:00:00`));
            onClose();
            return;
          }
          if (filtered[0]) {
            filtered[0].run();
            onClose();
          }
        }}
      />
      <ul className="max-h-64 space-y-1 overflow-auto">
        {filtered.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                item.run();
                onClose();
              }}
            >
              <span>{item.label}</span>
              {item.shortcut ? (
                <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {item.shortcut}
                </kbd>
              ) : (
                <span className="ml-2 text-xs text-muted-foreground">{item.appKey}</span>
              )}
            </button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
        ) : null}
      </ul>
    </div>
  );
}

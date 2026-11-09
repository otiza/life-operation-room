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
}: {
  open: boolean;
  onClose: () => void;
  installedAppKeys: string[];
  extraCommands?: ShellCommand[];
}) {
  return (
    <Dialog open={open} onClose={onClose} className="sm:max-w-lg">
      {open ? (
        <PaletteBody
          key="open"
          onClose={onClose}
          installedAppKeys={installedAppKeys}
          extraCommands={extraCommands}
        />
      ) : null}
    </Dialog>
  );
}

function PaletteBody({
  onClose,
  installedAppKeys,
  extraCommands,
}: {
  onClose: () => void;
  installedAppKeys: string[];
  extraCommands: ShellCommand[];
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
      <h2 className="text-base font-medium">Command palette</h2>
      <Input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search commands…"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && filtered[0]) {
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
              <span className="ml-2 text-xs text-muted-foreground">{item.appKey}</span>
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

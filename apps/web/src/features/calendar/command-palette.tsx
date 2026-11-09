'use client';

import { useMemo, useState } from 'react';
import type { CalendarView } from '@erp-tiza/shared';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

export type CalendarCommand =
  | { type: 'new-event' }
  | { type: 'today' }
  | { type: 'view'; view: CalendarView }
  | { type: 'toggle-sidebar' }
  | { type: 'go-date'; date: Date };

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommand: (command: CalendarCommand) => void;
};

const ACTIONS: Array<{ id: string; label: string; command: CalendarCommand; keywords: string }> = [
  { id: 'new', label: 'New event', command: { type: 'new-event' }, keywords: 'new create event' },
  { id: 'today', label: 'Jump to today', command: { type: 'today' }, keywords: 'today now' },
  { id: 'day', label: 'Day view', command: { type: 'view', view: 'day' }, keywords: 'day' },
  { id: 'week', label: 'Week view', command: { type: 'view', view: 'week' }, keywords: 'week' },
  { id: 'month', label: 'Month view', command: { type: 'view', view: 'month' }, keywords: 'month' },
  { id: 'agenda', label: 'Agenda view', command: { type: 'view', view: 'agenda' }, keywords: 'agenda list' },
  { id: 'sidebar', label: 'Toggle task sidebar', command: { type: 'toggle-sidebar' }, keywords: 'tasks sidebar' },
];

function PaletteBody({
  onOpenChange,
  onCommand,
}: {
  onOpenChange: (open: boolean) => void;
  onCommand: (command: CalendarCommand) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ACTIONS;
    return ACTIONS.filter((item) => item.label.toLowerCase().includes(needle) || item.keywords.includes(needle));
  }, [query]);

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-base font-medium">Command palette</h2>
      <Input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search actions or type a date (YYYY-MM-DD)"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            const dateMatch = query.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
            if (dateMatch) {
              onCommand({ type: 'go-date', date: new Date(`${dateMatch[1]}T12:00:00`) });
              onOpenChange(false);
              return;
            }
            if (filtered[0]) {
              onCommand(filtered[0].command);
              onOpenChange(false);
            }
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
                onCommand(item.command);
                onOpenChange(false);
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CommandPalette({ open, onOpenChange, onCommand }: CommandPaletteProps) {
  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} className="sm:max-w-lg">
      {open ? <PaletteBody key="open" onOpenChange={onOpenChange} onCommand={onCommand} /> : null}
    </Dialog>
  );
}

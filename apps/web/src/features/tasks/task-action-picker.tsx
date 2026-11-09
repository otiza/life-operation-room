'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

export type PickerOption = { value: string; label: string };

export function TaskActionPicker({
  open,
  title,
  options,
  onSelect,
  onClose,
  allowFreeText,
}: {
  open: boolean;
  title: string;
  options: PickerOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
  allowFreeText?: boolean;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((item) => item.label.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const handle = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(handle);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} className="sm:max-w-sm">
      <div className="space-y-3 p-4">
        <h2 className="text-sm font-medium">{title}</h2>
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type to filter…"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              if (filtered[0]) {
                onSelect(filtered[0].value);
                onClose();
              } else if (allowFreeText && query.trim()) {
                onSelect(query.trim());
                onClose();
              }
            }
          }}
        />
        <ul className="max-h-56 space-y-1 overflow-auto">
          {filtered.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

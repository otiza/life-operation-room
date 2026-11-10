'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function PropertyField({
  label,
  value,
  icon,
  onClick,
  className,
  disabled,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left transition-colors',
        'hover:border-border hover:bg-accent/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
    >
      {icon ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-sm text-foreground">{value || '—'}</span>
      </span>
    </button>
  );
}

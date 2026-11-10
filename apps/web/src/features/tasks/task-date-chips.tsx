'use client';

import { CalendarDays, Flag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { taskDateChips, type TaskDateChip } from './task-status';

export function TaskDateChips({
  whenDate,
  whenEvening,
  isSomeday,
  dueAt,
  overdue,
  className,
  compact,
}: {
  whenDate: string | null;
  whenEvening?: boolean;
  isSomeday?: boolean;
  dueAt: string | null;
  overdue?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const chips = taskDateChips({ whenDate, whenEvening, isSomeday, dueAt });
  if (chips.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((chip) => (
        <DateChip key={`${chip.kind}-${chip.label}`} chip={chip} overdue={overdue} compact={compact} />
      ))}
    </div>
  );
}

function DateChip({
  chip,
  overdue,
  compact,
}: {
  chip: TaskDateChip;
  overdue?: boolean;
  compact?: boolean;
}) {
  const Icon = chip.kind === 'when' ? CalendarDays : Flag;
  const label = chip.kind === 'when' ? `When: ${chip.label}` : chip.label;
  const danger = chip.kind === 'due' && overdue;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        compact && 'rounded-md px-1.5 py-0.5 font-medium',
        compact && !danger && 'bg-muted text-muted-foreground',
        danger && (compact ? 'bg-red-100 font-medium text-red-700' : 'font-medium text-red-600'),
        !compact && !danger && 'text-muted-foreground',
      )}
      title={chip.kind === 'when' ? 'When' : 'Deadline'}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

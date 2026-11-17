'use client';

import { Bell, CalendarDays, Flag } from '../../components/ui/icons';
import { cn } from '../../lib/utils';
import { taskDateChips, type TaskDateChip } from './task-status';

export function TaskDateChips({
  whenDate,
  whenEvening,
  isSomeday,
  dueAt,
  remindAt,
  remindedAt,
  overdue,
  className,
  compact,
}: {
  whenDate: string | null;
  whenEvening?: boolean;
  isSomeday?: boolean;
  dueAt: string | null;
  remindAt?: string | null;
  remindedAt?: string | null;
  overdue?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const chips = taskDateChips({ whenDate, whenEvening, isSomeday, dueAt, remindAt, remindedAt });
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
  const Icon = chip.kind === 'when' ? CalendarDays : chip.kind === 'remind' ? Bell : Flag;
  const danger = chip.kind !== 'when' && overdue;
  const name = chip.kind === 'when' ? 'When' : chip.kind === 'remind' ? 'Reminder' : 'Deadline';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        compact && 'rounded-md px-1.5 py-0.5 font-medium',
        compact && !danger && 'bg-muted text-muted-foreground',
        danger && (compact ? 'bg-danger-soft font-medium text-danger-soft-foreground' : 'font-medium text-destructive'),
        !compact && !danger && 'text-muted-foreground',
      )}
      title={name}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span>
        <span className="sr-only">{name}: </span>
        {chip.label}
      </span>
    </span>
  );
}

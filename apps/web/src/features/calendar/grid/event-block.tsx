'use client';

import type { CalendarOccurrenceDto } from '../calendar-api';
import { cn } from '../../../lib/utils';

type EventBlockProps = {
  occurrence: CalendarOccurrenceDto;
  style?: React.CSSProperties;
  compact?: boolean;
  onClick?: () => void;
};

export function EventBlock({ occurrence, style, compact, onClick }: EventBlockProps) {
  const isDueChip = occurrence.kind === 'due_chip';
  const isDone = occurrence.task?.status === 'done';
  const isDeleted = occurrence.task?.deleted;
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'absolute left-0 right-0 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-xs shadow-sm transition hover:brightness-95',
        isDueChip
          ? 'border-dashed border-border bg-muted/60 text-muted-foreground'
          : 'border-primary/20 bg-primary/15 text-foreground',
        isDone && 'text-muted-foreground line-through opacity-70',
        isDeleted && 'italic opacity-60',
        compact && 'static relative mb-1',
      )}
    >
      <div className="truncate font-medium">
        {isDeleted ? `${occurrence.title} (task deleted)` : occurrence.title}
      </div>
      {!compact && !occurrence.isAllDay && occurrence.startAt ? (
        <div className="truncate text-[10px] text-muted-foreground">
          {new Date(occurrence.startAt).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      ) : null}
    </button>
  );
}

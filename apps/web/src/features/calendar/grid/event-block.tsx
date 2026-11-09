'use client';

import { useDraggable } from '@dnd-kit/core';
import type { CalendarOccurrenceDto } from '../calendar-api';
import { cn } from '../../../lib/utils';

type EventBlockProps = {
  occurrence: CalendarOccurrenceDto;
  style?: React.CSSProperties;
  compact?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  onClick?: () => void;
  onMovePointerDown?: (event: React.PointerEvent) => void;
  onResizePointerDown?: (event: React.PointerEvent) => void;
};

export function EventBlock({
  occurrence,
  style,
  compact,
  draggable,
  resizable,
  onClick,
  onMovePointerDown,
  onResizePointerDown,
}: EventBlockProps) {
  const isDueChip = occurrence.kind === 'due_chip';
  const isDone = Boolean(occurrence.task?.isDone);
  const isDeleted = occurrence.task?.deleted;
  const canInteract = occurrence.kind !== 'due_chip';
  const drag = useDraggable({
    id: `event:${occurrence.eventId}:${occurrence.occurrenceStart}`,
    data: { occurrence, kind: 'calendar-event' },
    disabled: !draggable || !canInteract,
  });

  return (
    <button
      type="button"
      ref={draggable ? drag.setNodeRef : undefined}
      {...(draggable ? drag.listeners : {})}
      {...(draggable ? drag.attributes : {})}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerDown={(event) => {
        if (!canInteract || !onMovePointerDown || draggable) return;
        onMovePointerDown(event);
      }}
      style={{
        ...style,
        ...(draggable && drag.transform
          ? { transform: `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)`, zIndex: 20 }
          : null),
      }}
      className={cn(
        'absolute left-0 right-0 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-xs shadow-sm transition hover:brightness-95',
        isDueChip
          ? 'border-dashed border-border bg-muted/60 text-muted-foreground'
          : 'border-primary/20 bg-primary/15 text-foreground',
        isDone && 'text-muted-foreground line-through opacity-70',
        isDeleted && 'italic opacity-60',
        compact && 'static relative mb-1',
        drag.isDragging && 'opacity-70',
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
      {resizable && canInteract && !occurrence.isAllDay ? (
        <span
          role="presentation"
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
          onPointerDown={(event) => {
            event.stopPropagation();
            onResizePointerDown?.(event);
          }}
        />
      ) : null}
    </button>
  );
}

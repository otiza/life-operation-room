'use client';

import { useDroppable } from '@dnd-kit/core';
import type { CalendarOccurrenceDto } from '../calendar-api';
import { toDateKey } from '../calendar-range';
import { EventBlock } from './event-block';
import { cn } from '../../../lib/utils';

type MonthGridProps = {
  days: Date[];
  anchor: Date;
  events: CalendarOccurrenceDto[];
  onSelectOccurrence: (occurrence: CalendarOccurrenceDto) => void;
  onSelectDay: (day: Date) => void;
};

function DroppableMonthDay({
  day,
  inMonth,
  isToday,
  children,
  onSelectDay,
}: {
  day: Date;
  inMonth: boolean;
  isToday: boolean;
  children: React.ReactNode;
  onSelectDay: (day: Date) => void;
}) {
  const dateKey = toDateKey(day);
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateKey}`,
    data: { dateKey, kind: 'month-day' },
  });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelectDay(day)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelectDay(day);
      }}
      className={cn(
        'min-h-24 border-b border-r border-border p-1 text-left hover:bg-muted/40',
        isToday && 'bg-primary/5',
        isOver && 'bg-accent/40',
      )}
    >
      <div
        className={cn(
          'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
          inMonth ? 'text-foreground' : 'text-muted-foreground',
          isToday && 'bg-primary text-primary-foreground',
        )}
      >
        {day.getDate()}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function MonthGrid({ days, anchor, events, onSelectOccurrence, onSelectDay }: MonthGridProps) {
  const month = anchor.getMonth();
  const todayKey = toDateKey(new Date());
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border text-center text-xs text-muted-foreground">
        {days.slice(0, 7).map((day) => (
          <div key={day.toISOString()} className="px-2 py-2">
            {day.toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayEvents = events.filter((item) => {
            if (item.isAllDay && item.startDate) {
              return item.startDate <= key && (item.endDate ?? item.startDate) > key;
            }
            if (!item.startAt) return false;
            return toDateKey(new Date(item.startAt)) === key;
          }).slice(0, 3);
          return (
            <DroppableMonthDay
              key={day.toISOString()}
              day={day}
              inMonth={day.getMonth() === month}
              isToday={key === todayKey}
              onSelectDay={onSelectDay}
            >
              {dayEvents.map((occurrence) => (
                <EventBlock
                  key={`${occurrence.eventId}-${occurrence.occurrenceStart}`}
                  occurrence={occurrence}
                  compact
                  draggable={occurrence.kind !== 'due_chip'}
                  onClick={() => onSelectOccurrence(occurrence)}
                />
              ))}
            </DroppableMonthDay>
          );
        })}
      </div>
    </div>
  );
}

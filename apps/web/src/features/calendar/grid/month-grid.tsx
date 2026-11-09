'use client';

import type { CalendarOccurrenceDto } from '../calendar-api';
import { toDateKey } from '../calendar-range';
import { EventBlock } from './event-block';

type MonthGridProps = {
  days: Date[];
  anchor: Date;
  events: CalendarOccurrenceDto[];
  onSelectOccurrence: (occurrence: CalendarOccurrenceDto) => void;
  onSelectDay: (day: Date) => void;
};

export function MonthGrid({ days, anchor, events, onSelectOccurrence, onSelectDay }: MonthGridProps) {
  const month = anchor.getMonth();
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
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className="min-h-24 border-b border-r border-border p-1 text-left hover:bg-muted/40"
            >
              <div className={`mb-1 text-xs ${day.getMonth() === month ? 'text-foreground' : 'text-muted-foreground'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.map((occurrence) => (
                  <EventBlock
                    key={`${occurrence.eventId}-${occurrence.occurrenceStart}`}
                    occurrence={occurrence}
                    compact
                    onClick={() => onSelectOccurrence(occurrence)}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import type { CalendarOccurrenceDto } from '../calendar-api';
import { formatDayLabel, toDateKey } from '../calendar-range';
import { EventBlock } from './event-block';

type AgendaListProps = {
  days: Date[];
  events: CalendarOccurrenceDto[];
  onSelectOccurrence: (occurrence: CalendarOccurrenceDto) => void;
};

export function AgendaList({ days, events, onSelectOccurrence }: AgendaListProps) {
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = events
          .filter((item) => {
            if (item.isAllDay && item.startDate) {
              return item.startDate <= key && (item.endDate ?? item.startDate) > key;
            }
            if (!item.startAt) return false;
            return toDateKey(new Date(item.startAt)) === key;
          })
          .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
        return (
          <section key={day.toISOString()} className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-2 text-sm font-medium">{formatDayLabel(day)}</h2>
            {dayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events</p>
            ) : (
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
            )}
          </section>
        );
      })}
    </div>
  );
}

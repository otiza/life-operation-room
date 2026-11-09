'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CalendarOccurrenceDto } from '../calendar-api';
import { minutesSinceMidnight, toDateKey } from '../calendar-range';
import { EventBlock } from './event-block';
import { layoutTimedEvents } from './overlap';

const HOUR_HEIGHT = 56;

type TimeGridProps = {
  days: Date[];
  events: CalendarOccurrenceDto[];
  workingHours: { startMinute: number; endMinute: number };
  secondaryTimeZone: string | null;
  onSelectOccurrence: (occurrence: CalendarOccurrenceDto) => void;
  onEmptySlotClick: (day: Date, minute: number) => void;
};

function DroppableDayColumn({
  day,
  gridStartMinute,
  hours,
  children,
  onEmptySlotClick,
  isToday,
  nowMinutes,
  totalMinutes,
}: {
  day: Date;
  gridStartMinute: number;
  hours: number[];
  children: React.ReactNode;
  onEmptySlotClick: (day: Date, minute: number) => void;
  isToday: boolean;
  nowMinutes: number;
  totalMinutes: number;
}) {
  const dateKey = toDateKey(day);
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${dateKey}:${gridStartMinute}`,
    data: { dateKey, gridStartMinute },
  });
  return (
    <div
      ref={setNodeRef}
      className={`relative border-l border-border ${isOver ? 'bg-accent/40' : ''}`}
      style={{ height: hours.length * HOUR_HEIGHT }}
      onClick={(event) => {
        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        const y = event.clientY - rect.top;
        const minute = gridStartMinute + Math.round(y / (HOUR_HEIGHT / 60) / 15) * 15;
        onEmptySlotClick(day, minute);
      }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border/60"
          style={{ top: (hour * 60 - gridStartMinute) * (HOUR_HEIGHT / 60) }}
        />
      ))}
      {isToday && nowMinutes >= gridStartMinute && nowMinutes <= gridStartMinute + totalMinutes ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
          style={{ top: (nowMinutes - gridStartMinute) * (HOUR_HEIGHT / 60) }}
        />
      ) : null}
      {children}
    </div>
  );
}

export function TimeGrid({
  days,
  events,
  workingHours,
  secondaryTimeZone,
  onSelectOccurrence,
  onEmptySlotClick,
}: TimeGridProps) {
  const now = new Date();
  const nowMinutes = minutesSinceMidnight(now);
  const hours = useMemo(() => {
    const startHour = Math.floor(workingHours.startMinute / 60);
    const endHour = Math.ceil(workingHours.endMinute / 60);
    return Array.from({ length: Math.max(endHour - startHour, 1) }, (_, index) => startHour + index);
  }, [workingHours]);

  const gridStartMinute = hours[0] * 60;
  const totalMinutes = hours.length * 60;

  return (
    <div className="overflow-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-border" />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-b border-l border-border px-2 py-2 text-center text-sm">
            <div className="font-medium">
              {day.toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div className="text-muted-foreground">{day.getDate()}</div>
          </div>
        ))}

        <div className="relative border-b border-border px-1 py-1">
          <div className="text-[10px] text-muted-foreground">All day</div>
        </div>
        {days.map((day) => {
          const key = toDateKey(day);
          const allDay = events.filter(
            (item) => item.isAllDay && item.startDate && item.startDate <= key && (item.endDate ?? item.startDate) > key,
          );
          return (
            <div key={`allday-${day.toISOString()}`} className="min-h-10 space-y-1 border-b border-l border-border p-1">
              {allDay.map((occurrence) => (
                <EventBlock
                  key={`${occurrence.eventId}-${occurrence.occurrenceStart}`}
                  occurrence={occurrence}
                  compact
                  onClick={() => onSelectOccurrence(occurrence)}
                />
              ))}
            </div>
          );
        })}

        <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-1 text-[10px] text-muted-foreground"
              style={{ top: (hour * 60 - gridStartMinute) * (HOUR_HEIGHT / 60) - 6 }}
            >
              {String(hour).padStart(2, '0')}:00
              {secondaryTimeZone ? (
                <div className="text-[9px] opacity-70">
                  {new Date(new Date().setHours(hour, 0, 0, 0)).toLocaleTimeString(undefined, {
                    timeZone: secondaryTimeZone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = toDateKey(day);
          const dayEvents = events.filter((item) => {
            if (item.isAllDay || !item.startAt) return false;
            return toDateKey(new Date(item.startAt)) === key;
          });
          const laidOut = layoutTimedEvents(dayEvents);
          const isToday = toDateKey(now) === key;
          return (
            <DroppableDayColumn
              key={`col-${day.toISOString()}`}
              day={day}
              gridStartMinute={gridStartMinute}
              hours={hours}
              onEmptySlotClick={onEmptySlotClick}
              isToday={isToday}
              nowMinutes={nowMinutes}
              totalMinutes={totalMinutes}
            >
              {laidOut.map((item) => {
                const width = 100 / item.columnCount;
                return (
                  <EventBlock
                    key={`${item.occurrence.eventId}-${item.occurrence.occurrenceStart}`}
                    occurrence={item.occurrence}
                    onClick={() => onSelectOccurrence(item.occurrence)}
                    style={{
                      top: (item.topMinutes - gridStartMinute) * (HOUR_HEIGHT / 60),
                      height: Math.max((item.bottomMinutes - item.topMinutes) * (HOUR_HEIGHT / 60), 18),
                      left: `${item.column * width}%`,
                      width: `calc(${width}% - 4px)`,
                      position: 'absolute',
                    }}
                  />
                );
              })}
            </DroppableDayColumn>
          );
        })}
      </div>
    </div>
  );
}

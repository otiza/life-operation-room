'use client';

import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { CalendarOccurrenceDto } from '../calendar-api';
import {
  CALENDAR_HOUR_HEIGHT,
  formatClockTime,
  minutesSinceMidnight,
  snapMinute,
  toDateKey,
} from '../calendar-range';
import { EventBlock } from './event-block';
import { layoutTimedEvents } from './overlap';
import { cn } from '../../../lib/utils';

export type TimedOccurrenceChange = {
  occurrence: CalendarOccurrenceDto;
  startAt: string;
  endAt: string;
};

type TimeGridProps = {
  days: Date[];
  events: CalendarOccurrenceDto[];
  workingHours: { startMinute: number; endMinute: number };
  secondaryTimeZone: string | null;
  onSelectOccurrence: (occurrence: CalendarOccurrenceDto) => void;
  onEmptySlotClick: (day: Date, minute: number) => void;
  onTimedOccurrenceChange?: (change: TimedOccurrenceChange) => void;
};

function AllDayDropCell({
  dateKey,
  isToday,
  children,
}: {
  dateKey: string;
  isToday?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateKey}`,
    data: { dateKey, kind: 'all-day' },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-10 space-y-1 border-b border-l border-border p-1',
        isToday && 'bg-app-calendar-soft/30',
        isOver && 'bg-accent/40',
      )}
    >
      {children}
    </div>
  );
}

function DroppableDayColumn({
  day,
  gridStartMinute,
  hours,
  children,
  onEmptySlotClick,
  isToday,
  showNowLine,
  nowMinutes,
  totalMinutes,
}: {
  day: Date;
  gridStartMinute: number;
  hours: number[];
  children: React.ReactNode;
  onEmptySlotClick: (day: Date, minute: number) => void;
  isToday: boolean;
  /** The visible range includes today: draw the now-line across every column. */
  showNowLine: boolean;
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
      data-date-key={dateKey}
      className={cn(
        'relative border-l border-border',
        isToday && 'bg-app-calendar-soft/30',
        isOver && 'bg-accent/40',
      )}
      style={{ height: hours.length * CALENDAR_HOUR_HEIGHT }}
      onClick={(event) => {
        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        const y = event.clientY - rect.top;
        const minute = gridStartMinute + Math.round(y / (CALENDAR_HOUR_HEIGHT / 60) / 15) * 15;
        onEmptySlotClick(day, minute);
      }}
    >
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border/60"
          style={{ top: (hour * 60 - gridStartMinute) * (CALENDAR_HOUR_HEIGHT / 60) }}
        />
      ))}
      {showNowLine && nowMinutes >= gridStartMinute && nowMinutes <= gridStartMinute + totalMinutes ? (
        <div
          data-testid={isToday ? 'calendar-now-line' : undefined}
          className={cn(
            'pointer-events-none absolute inset-x-0 z-10 border-t border-primary/40',
            isToday && 'border-t-2 border-primary',
          )}
          style={{ top: (nowMinutes - gridStartMinute) * (CALENDAR_HOUR_HEIGHT / 60) }}
        >
          {isToday ? (
            <span className="absolute -left-1.5 -top-[7px] h-3 w-3 rounded-full bg-primary" aria-hidden />
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

type DragState =
  | {
      mode: 'move' | 'resize';
      occurrence: CalendarOccurrenceDto;
      day: Date;
      originClientY: number;
      originStartMinutes: number;
      originEndMinutes: number;
      previewStartMinutes: number;
      previewEndMinutes: number;
    }
  | null;

export function TimeGrid({
  days,
  events,
  workingHours,
  secondaryTimeZone,
  onSelectOccurrence,
  onEmptySlotClick,
  onTimedOccurrenceChange,
}: TimeGridProps) {
  const now = new Date();
  const nowMinutes = minutesSinceMidnight(now);
  const rangeHasToday = days.some((day) => toDateKey(day) === toDateKey(now));
  const [drag, setDrag] = useState<DragState>(null);
  const hours = useMemo(() => {
    const startHour = Math.floor(workingHours.startMinute / 60);
    const endHour = Math.ceil(workingHours.endMinute / 60);
    return Array.from({ length: Math.max(endHour - startHour, 1) }, (_, index) => startHour + index);
  }, [workingHours]);

  const gridStartMinute = hours[0] * 60;
  const totalMinutes = hours.length * 60;

  function occurrenceStyle(
    occurrence: CalendarOccurrenceDto,
    layout: { topMinutes: number; bottomMinutes: number; column: number; columnCount: number },
  ) {
    const preview =
      drag &&
      drag.occurrence.eventId === occurrence.eventId &&
      drag.occurrence.occurrenceStart === occurrence.occurrenceStart
        ? drag
        : null;
    const topMinutes = preview?.previewStartMinutes ?? layout.topMinutes;
    const bottomMinutes = preview?.previewEndMinutes ?? layout.bottomMinutes;
    const width = 100 / layout.columnCount;
    return {
      top: (topMinutes - gridStartMinute) * (CALENDAR_HOUR_HEIGHT / 60),
      height: Math.max((bottomMinutes - topMinutes) * (CALENDAR_HOUR_HEIGHT / 60), 18),
      left: `${layout.column * width}%`,
      width: `calc(${width}% - 4px)`,
      position: 'absolute' as const,
      zIndex: preview ? 30 : undefined,
    };
  }

  function beginDrag(
    mode: 'move' | 'resize',
    occurrence: CalendarOccurrenceDto,
    day: Date,
    event: React.PointerEvent,
  ) {
    if (!occurrence.startAt || !occurrence.endAt || !onTimedOccurrenceChange) return;
    event.preventDefault();
    event.stopPropagation();
    const originStartMinutes = minutesSinceMidnight(new Date(occurrence.startAt));
    const originEndMinutes = minutesSinceMidnight(new Date(occurrence.endAt));
    const pointerId = event.pointerId;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture?.(pointerId);

    setDrag({
      mode,
      occurrence,
      day,
      originClientY: event.clientY,
      originStartMinutes,
      originEndMinutes,
      previewStartMinutes: originStartMinutes,
      previewEndMinutes: originEndMinutes,
    });

    const onMove = (moveEvent: PointerEvent) => {
      const deltaMinutes = snapMinute(
        (moveEvent.clientY - event.clientY) / (CALENDAR_HOUR_HEIGHT / 60),
      );
      setDrag((current) => {
        if (!current) return current;
        if (current.mode === 'move') {
          const duration = current.originEndMinutes - current.originStartMinutes;
          const nextStart = snapMinute(
            Math.max(gridStartMinute, Math.min(gridStartMinute + totalMinutes - duration, current.originStartMinutes + deltaMinutes)),
          );
          return {
            ...current,
            previewStartMinutes: nextStart,
            previewEndMinutes: nextStart + duration,
          };
        }
        const nextEnd = snapMinute(
          Math.max(current.originStartMinutes + 15, current.originEndMinutes + deltaMinutes),
        );
        return { ...current, previewEndMinutes: nextEnd };
      });
    };

    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const deltaMinutes = snapMinute(
        (upEvent.clientY - event.clientY) / (CALENDAR_HOUR_HEIGHT / 60),
      );
      const duration = originEndMinutes - originStartMinutes;
      let nextStart = originStartMinutes;
      let nextEnd = originEndMinutes;
      if (mode === 'move') {
        nextStart = snapMinute(
          Math.max(gridStartMinute, Math.min(gridStartMinute + totalMinutes - duration, originStartMinutes + deltaMinutes)),
        );
        nextEnd = nextStart + duration;
      } else {
        nextEnd = snapMinute(Math.max(originStartMinutes + 15, originEndMinutes + deltaMinutes));
      }
      let targetDay = day;
      if (mode === 'move') {
        const under = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const dateKey = under?.closest('[data-date-key]')?.getAttribute('data-date-key');
        if (dateKey) {
          const [year, month, dayNumber] = dateKey.split('-').map(Number);
          targetDay = new Date(year, month - 1, dayNumber);
        }
      }
      setDrag(null);
      const sameDay = toDateKey(targetDay) === toDateKey(day);
      if (sameDay && nextStart === originStartMinutes && nextEnd === originEndMinutes) return;
      const start = new Date(targetDay);
      start.setHours(Math.floor(nextStart / 60), nextStart % 60, 0, 0);
      const end = new Date(targetDay);
      end.setHours(Math.floor(nextEnd / 60), nextEnd % 60, 0, 0);
      onTimedOccurrenceChange({
        occurrence,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="overflow-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-border" />
        {days.map((day) => {
          const isToday = toDateKey(now) === toDateKey(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-b border-l border-border px-2 py-2 text-center text-sm',
                isToday && 'bg-app-calendar-soft/30',
              )}
            >
              <div className={cn('font-medium', isToday && 'text-primary')}>
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}

        <div className="relative border-b border-border px-1 py-1">
          <div className="text-[10px] text-muted-foreground">All day</div>
        </div>
        {days.map((day) => {
          const key = toDateKey(day);
          const allDay = events.filter(
            (item) => item.isAllDay && item.startDate && item.startDate <= key && (item.endDate ?? item.startDate) > key,
          );
          return (
            <AllDayDropCell key={`allday-${day.toISOString()}`} dateKey={key} isToday={toDateKey(now) === key}>
              {allDay.map((occurrence) => (
                <EventBlock
                  key={`${occurrence.eventId}-${occurrence.occurrenceStart}`}
                  occurrence={occurrence}
                  compact
                  draggable={occurrence.kind !== 'due_chip'}
                  onClick={() => onSelectOccurrence(occurrence)}
                />
              ))}
            </AllDayDropCell>
          );
        })}

        <div className="relative" style={{ height: hours.length * CALENDAR_HOUR_HEIGHT }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute right-1 text-[10px] text-muted-foreground"
              style={{ top: (hour * 60 - gridStartMinute) * (CALENDAR_HOUR_HEIGHT / 60) - 6 }}
            >
              {formatClockTime(new Date(new Date().setHours(hour, 0, 0, 0)))}
              {secondaryTimeZone ? (
                <div className="text-[9px] opacity-70">
                  {formatClockTime(new Date(new Date().setHours(hour, 0, 0, 0)), secondaryTimeZone)}
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
              showNowLine={rangeHasToday}
              nowMinutes={nowMinutes}
              totalMinutes={totalMinutes}
            >
              {laidOut.map((item) => (
                <EventBlock
                  key={`${item.occurrence.eventId}-${item.occurrence.occurrenceStart}`}
                  occurrence={item.occurrence}
                  resizable
                  onClick={() => onSelectOccurrence(item.occurrence)}
                  onMovePointerDown={(event) => beginDrag('move', item.occurrence, day, event)}
                  onResizePointerDown={(event) => beginDrag('resize', item.occurrence, day, event)}
                  style={occurrenceStyle(item.occurrence, item)}
                />
              ))}
            </DroppableDayColumn>
          );
        })}
      </div>
    </div>
  );
}

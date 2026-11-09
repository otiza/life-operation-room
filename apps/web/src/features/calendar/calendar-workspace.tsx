'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { minuteFromDropPosition, type CalendarMutationScope, type CalendarView } from '@erp-tiza/shared';
import { PageContainer, PageHeader } from '../../components/layout/page-container';
import { Button } from '../../components/ui/button';
import { listInstalledApps } from '../apps/apps-api';
import { listProjects } from '../projects/projects-api';
import { listTasks, updateTask } from '../tasks/tasks-api';
import {
  createCalendarEvent,
  createTimeBlock,
  deleteCalendarEvent,
  listCalendarEvents,
  restoreCalendarEvent,
  updateCalendarEvent,
  getCalendarSettings,
  type CalendarOccurrenceDto,
  viewerTimeZone,
} from './calendar-api';
import {
  addDays,
  CALENDAR_HOUR_HEIGHT,
  rangeForView,
  shiftDateKey,
  shiftIsoByDays,
  snapToQuarterHour,
  startOfDay,
  toDateKey,
} from './calendar-range';
import { AgendaList } from './grid/agenda-list';
import { MonthGrid } from './grid/month-grid';
import { TimeGrid } from './grid/time-grid';
import { QuickAdd, type QuickAddDraft } from './quick-add';
import { CommandPalette, type CalendarCommand } from './command-palette';
import { TaskSidebar } from './task-sidebar';
import { EventEditor, type EventEditorSaveInput } from './event-editor';
import { ScopePrompt } from './scope-prompt';

type MovePrevious = {
  startAt: string | null;
  endAt: string | null;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  timezone: string;
};

type UndoAction =
  | { kind: 'delete'; eventId: string; label: string }
  | {
      kind: 'move';
      eventId: string;
      scope: CalendarMutationScope;
      occurrenceStart?: string;
      previous: MovePrevious;
      label: string;
    };

type PendingMove = {
  occurrence: CalendarOccurrenceDto;
  next: MovePrevious;
  label: string;
};

type CalendarWorkspaceProps = {
  workspaceId: string;
};

function occurrenceStartPayload(occurrence: CalendarOccurrenceDto) {
  if (!occurrence.isRecurring) return undefined;
  return occurrence.isAllDay
    ? `${occurrence.occurrenceStart}T00:00:00.000Z`
    : occurrence.occurrenceStart;
}

function previousFromOccurrence(occurrence: CalendarOccurrenceDto): MovePrevious {
  return {
    startAt: occurrence.startAt,
    endAt: occurrence.endAt,
    startDate: occurrence.startDate,
    endDate: occurrence.endDate,
    isAllDay: occurrence.isAllDay,
    timezone: occurrence.timezone,
  };
}

export function CalendarWorkspace({ workspaceId }: CalendarWorkspaceProps) {
  const queryClient = useQueryClient();
  const installedQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });
  const calendarInstalled = (installedQuery.data?.apps ?? []).some((app) => app.appKey === 'calendar');
  const tasksInstalled = (installedQuery.data?.apps ?? []).some((app) => app.appKey === 'tasks');
  const projectsInstalled = (installedQuery.data?.apps ?? []).some((app) => app.appKey === 'projects');

  const settingsQuery = useQuery({
    queryKey: ['calendar-settings', workspaceId],
    queryFn: () => getCalendarSettings(workspaceId),
    enabled: calendarInstalled,
  });
  const settings = settingsQuery.data?.settings;
  const weekStartsOn = settings?.weekStartsOn ?? 1;

  const [viewOverride, setViewOverride] = useState<CalendarView | null>(null);
  const view = viewOverride ?? settings?.defaultView ?? 'week';
  const setView = (next: CalendarView) => setViewOverride(next);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarOccurrenceDto | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 5000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const range = useMemo(() => rangeForView(view, anchor, weekStartsOn), [view, anchor, weekStartsOn]);
  const tz = viewerTimeZone();
  const eventsQueryKey = ['calendar-events', workspaceId, range.from.toISOString(), range.to.toISOString(), tz] as const;

  const eventsQuery = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () => listCalendarEvents(workspaceId, range.from.toISOString(), range.to.toISOString(), tz),
    enabled: calendarInstalled,
  });
  const events = useMemo(() => eventsQuery.data?.events ?? [], [eventsQuery.data?.events]);

  const tasksQuery = useQuery({
    queryKey: ['tasks', workspaceId, {}],
    queryFn: () => listTasks(workspaceId, { tz }),
    enabled: calendarInstalled && tasksInstalled,
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => listProjects(workspaceId),
    enabled: calendarInstalled && projectsInstalled,
  });

  const blockedTaskIds = useMemo(() => {
    const now = Date.now();
    const ids = new Set<string>();
    for (const occurrence of events) {
      if (occurrence.kind !== 'time_block' || !occurrence.task || occurrence.task.deleted) continue;
      if (occurrence.startAt && new Date(occurrence.startAt).getTime() >= now) {
        ids.add(occurrence.task.taskId);
      }
    }
    return ids;
  }, [events]);

  const projectsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const project of projectsQuery.data?.projects ?? []) map[project.id] = project.name;
    return map;
  }, [projectsQuery.data?.projects]);

  const invalidateEvents = () =>
    queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });

  const createMutation = useMutation({
    mutationFn: (draft: QuickAddDraft) => {
      if (draft.isAllDay && draft.startDate && draft.endDate) {
        return createCalendarEvent(workspaceId, {
          title: draft.title,
          location: draft.location,
          isAllDay: true,
          startDate: draft.startDate,
          endDate: draft.endDate,
          timezone: draft.timezone,
          rrule: draft.rrule,
          kind: 'event',
        });
      }
      if (!draft.startAt || !draft.endAt) throw new Error('Missing start/end');
      return createCalendarEvent(workspaceId, {
        title: draft.title,
        location: draft.location,
        isAllDay: false,
        startAt: draft.startAt,
        endAt: draft.endAt,
        timezone: draft.timezone,
        rrule: draft.rrule,
        kind: 'event',
      });
    },
    onSettled: invalidateEvents,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey || editorOpen || paletteOpen) return;
      if (event.key === 'd') setView('day');
      if (event.key === 'w') setView('week');
      if (event.key === 'm') setView('month');
      if (event.key === 'a') setView('agenda');
      if (event.key === 't') setAnchor(startOfDay(new Date()));
      if (event.key === 'j' || event.key === 'ArrowRight') setAnchor((value) => addDays(value, view === 'month' ? 7 : 1));
      if (event.key === 'k' || event.key === 'ArrowLeft') setAnchor((value) => addDays(value, view === 'month' ? -7 : -1));
      if (event.key === 'n') setPaletteOpen(true);
      if (event.key === 'e' && selected) setEditorOpen(true);
      if (event.key === 'Backspace' && selected && selected.kind !== 'due_chip') {
        event.preventDefault();
        void handleDelete(selected, 'all');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  async function handleDelete(occurrence: CalendarOccurrenceDto, scope: CalendarMutationScope) {
    await deleteCalendarEvent(workspaceId, occurrence.eventId, {
      scope,
      occurrenceStart: occurrenceStartPayload(occurrence),
    });
    setUndo({ kind: 'delete', eventId: occurrence.eventId, label: `Deleted “${occurrence.title}”` });
    setSelected(null);
    await invalidateEvents();
  }

  async function applyOccurrenceChange(
    occurrence: CalendarOccurrenceDto,
    next: MovePrevious,
    scope: CalendarMutationScope,
    label: string,
  ) {
    const previous = previousFromOccurrence(occurrence);
    const snapshot = queryClient.getQueryData(eventsQueryKey);
    queryClient.setQueryData(eventsQueryKey, (current: { events: CalendarOccurrenceDto[] } | undefined) => {
      if (!current) return current;
      return {
        events: current.events.map((item) =>
          item.eventId === occurrence.eventId && item.occurrenceStart === occurrence.occurrenceStart
            ? { ...item, ...next }
            : item,
        ),
      };
    });
    try {
      const response = await updateCalendarEvent(workspaceId, occurrence.eventId, {
        scope,
        occurrenceStart: occurrenceStartPayload(occurrence),
        isAllDay: next.isAllDay,
        timezone: next.timezone,
        startAt: next.startAt ?? undefined,
        endAt: next.endAt ?? undefined,
        startDate: next.startDate ?? undefined,
        endDate: next.endDate ?? undefined,
      });
      setUndo({
        kind: 'move',
        eventId: response.event.id,
        scope: scope === 'following' ? 'all' : scope,
        occurrenceStart: scope === 'this' ? occurrenceStartPayload(occurrence) : undefined,
        previous,
        label,
      });
    } catch (error) {
      queryClient.setQueryData(eventsQueryKey, snapshot);
      throw error;
    } finally {
      await invalidateEvents();
    }
  }

  function requestOccurrenceChange(
    occurrence: CalendarOccurrenceDto,
    next: MovePrevious,
    label: string,
  ) {
    if (occurrence.isRecurring) {
      setPendingMove({ occurrence, next, label });
      return;
    }
    void applyOccurrenceChange(occurrence, next, 'all', label);
  }

  async function handleCommand(command: CalendarCommand) {
    if (command.type === 'new-event') setPaletteOpen(false);
    if (command.type === 'today') setAnchor(startOfDay(new Date()));
    if (command.type === 'view') setView(command.view);
    if (command.type === 'toggle-sidebar') setSidebarOpen((value) => !value);
    if (command.type === 'go-date') setAnchor(startOfDay(command.date));
  }

  async function onDragEnd(event: DragEndEvent) {
    const activeOccurrence = event.active.data.current?.occurrence as CalendarOccurrenceDto | undefined;
    if (activeOccurrence && event.over) {
      const overId = event.over.id.toString();
      if (overId.startsWith('day:')) {
        const targetDateKey = overId.slice(4);
        const sourceDateKey = activeOccurrence.isAllDay
          ? activeOccurrence.startDate ?? activeOccurrence.occurrenceStart.slice(0, 10)
          : activeOccurrence.startAt
            ? toDateKey(new Date(activeOccurrence.startAt))
            : null;
        if (!sourceDateKey || sourceDateKey === targetDateKey) return;
        const [sourceY, sourceM, sourceD] = sourceDateKey.split('-').map(Number);
        const [targetY, targetM, targetD] = targetDateKey.split('-').map(Number);
        const dayDelta = Math.round(
          (new Date(targetY, targetM - 1, targetD).getTime() -
            new Date(sourceY, sourceM - 1, sourceD).getTime()) /
            86_400_000,
        );
        if (activeOccurrence.isAllDay && activeOccurrence.startDate && activeOccurrence.endDate) {
          requestOccurrenceChange(
            activeOccurrence,
            {
              ...previousFromOccurrence(activeOccurrence),
              startDate: shiftDateKey(activeOccurrence.startDate, dayDelta),
              endDate: shiftDateKey(activeOccurrence.endDate, dayDelta),
            },
            `Moved “${activeOccurrence.title}”`,
          );
        } else if (activeOccurrence.startAt && activeOccurrence.endAt) {
          requestOccurrenceChange(
            activeOccurrence,
            {
              ...previousFromOccurrence(activeOccurrence),
              startAt: shiftIsoByDays(activeOccurrence.startAt, dayDelta),
              endAt: shiftIsoByDays(activeOccurrence.endAt, dayDelta),
            },
            `Moved “${activeOccurrence.title}”`,
          );
        }
        return;
      }
    }

    const taskId = event.active.data.current?.taskId as string | undefined;
    if (!taskId || !event.over) return;
    const overId = event.over.id.toString();
    if (!overId.startsWith('slot:')) return;
    const [, dateKey, minuteRaw] = overId.split(':');
    const gridStartMinute = Number(minuteRaw);
    const [year, month, day] = dateKey.split('-').map(Number);
    const translatedTop =
      event.active.rect.current.translated?.top ??
      (event.active.rect.current.initial
        ? event.active.rect.current.initial.top + event.delta.y
        : event.over.rect.top);
    const minute = minuteFromDropPosition({
      translatedTop,
      columnTop: event.over.rect.top,
      gridStartMinute,
      hourHeight: CALENDAR_HOUR_HEIGHT,
    });
    const start = snapToQuarterHour(new Date(year, month - 1, day, Math.floor(minute / 60), minute % 60));
    const duration = (settings?.defaultEventDurationMinutes ?? 60) * 60_000;
    const end = new Date(start.getTime() + duration);
    await createTimeBlock(workspaceId, {
      taskId,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    await invalidateEvents();
  }

  if (installedQuery.isLoading) {
    return (
      <PageContainer size="full">
        <PageHeader title="Calendar" description="Loading…" />
      </PageContainer>
    );
  }

  if (!calendarInstalled) {
    return (
      <PageContainer size="full">
        <PageHeader
          title="Calendar"
          description="Install Calendar from the marketplace to plan your days."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="full">
      <PageHeader
        title="Calendar"
        description="Day, week, month, and agenda — keyboard-first."
        actions={
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month', 'agenda'] as CalendarView[]).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={view === item ? 'default' : 'outline'}
                onClick={() => setView(item)}
              >
                {item}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setAnchor(startOfDay(new Date()))}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAnchor((value) => addDays(value, view === 'month' ? -7 : -1))}>
              Prev
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAnchor((value) => addDays(value, view === 'month' ? 7 : 1))}>
              Next
            </Button>
            {tasksInstalled ? (
              <Button size="sm" variant="outline" onClick={() => setSidebarOpen((value) => !value)}>
                Tasks
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-3">
        <QuickAdd
          onSubmit={async (draft) => {
            await createMutation.mutateAsync(draft);
          }}
        />
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="min-w-0 flex-1">
            {view === 'month' ? (
              <MonthGrid
                days={range.days}
                anchor={anchor}
                events={events}
                onSelectOccurrence={(occurrence) => {
                  setSelected(occurrence);
                  setEditorOpen(true);
                }}
                onSelectDay={(day) => {
                  setAnchor(startOfDay(day));
                  setView('day');
                }}
              />
            ) : null}
            {view === 'agenda' ? (
              <AgendaList
                days={range.days}
                events={events}
                onSelectOccurrence={(occurrence) => {
                  setSelected(occurrence);
                  setEditorOpen(true);
                }}
              />
            ) : null}
            {view === 'day' || view === 'week' ? (
              <TimeGrid
                days={view === 'day' ? [anchor] : range.days}
                events={events}
                workingHours={settings?.workingHours ?? { startMinute: 8 * 60, endMinute: 20 * 60 }}
                secondaryTimeZone={settings?.secondaryTimeZone ?? null}
                onSelectOccurrence={(occurrence) => {
                  setSelected(occurrence);
                  setEditorOpen(true);
                }}
                onTimedOccurrenceChange={({ occurrence, startAt, endAt }) => {
                  requestOccurrenceChange(
                    occurrence,
                    { ...previousFromOccurrence(occurrence), startAt, endAt, isAllDay: false },
                    `Moved “${occurrence.title}”`,
                  );
                }}
                onEmptySlotClick={async (day, minute) => {
                  const start = new Date(day);
                  start.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
                  const snapped = snapToQuarterHour(start);
                  const end = new Date(
                    snapped.getTime() + (settings?.defaultEventDurationMinutes ?? 60) * 60_000,
                  );
                  await createCalendarEvent(workspaceId, {
                    title: 'New event',
                    isAllDay: false,
                    startAt: snapped.toISOString(),
                    endAt: end.toISOString(),
                    timezone: tz,
                    kind: 'event',
                  });
                  await invalidateEvents();
                }}
              />
            ) : null}
          </div>
          {tasksInstalled && sidebarOpen ? (
            <TaskSidebar
              tasks={tasksQuery.data?.tasks ?? []}
              projectsById={projectsById}
              blockedTaskIds={blockedTaskIds}
            />
          ) : null}
        </div>
      </DndContext>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onCommand={handleCommand} />
      <EventEditor
        occurrence={selected}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={async (input: EventEditorSaveInput) => {
          if (!selected || selected.kind === 'due_chip') return;
          const next: MovePrevious = {
            startAt: input.startAt,
            endAt: input.endAt,
            startDate: input.startDate,
            endDate: input.endDate,
            isAllDay: input.isAllDay,
            timezone: input.timezone,
          };
          const previous = previousFromOccurrence(selected);
          await updateCalendarEvent(workspaceId, selected.eventId, {
            title: input.title,
            location: input.location,
            scope: input.scope,
            occurrenceStart: occurrenceStartPayload(selected),
            isAllDay: input.isAllDay,
            timezone: input.timezone,
            startAt: input.startAt ?? undefined,
            endAt: input.endAt ?? undefined,
            startDate: input.startDate ?? undefined,
            endDate: input.endDate ?? undefined,
          });
          const timesChanged =
            previous.startAt !== next.startAt ||
            previous.endAt !== next.endAt ||
            previous.startDate !== next.startDate ||
            previous.endDate !== next.endDate ||
            previous.isAllDay !== next.isAllDay ||
            previous.timezone !== next.timezone;
          if (timesChanged) {
            setUndo({
              kind: 'move',
              eventId: selected.eventId,
              scope: input.scope === 'following' ? 'all' : input.scope,
              occurrenceStart: input.scope === 'this' ? occurrenceStartPayload(selected) : undefined,
              previous,
              label: `Updated “${selected.title}”`,
            });
          }
          await invalidateEvents();
        }}
        onDelete={async (scope) => {
          if (!selected) return;
          await handleDelete(selected, scope);
        }}
        onCompleteTask={
          selected?.task && !selected.task.deleted
            ? async () => {
                await updateTask(workspaceId, selected.task!.taskId, { status: 'done' });
                await invalidateEvents();
                await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
                setEditorOpen(false);
              }
            : undefined
        }
      />

      <ScopePrompt
        open={Boolean(pendingMove)}
        title="Move recurring event"
        onOpenChange={(open) => {
          if (!open) setPendingMove(null);
        }}
        onSelect={(scope) => {
          if (!pendingMove) return;
          const { occurrence, next, label } = pendingMove;
          setPendingMove(null);
          void applyOccurrenceChange(occurrence, next, scope, label);
        }}
      />

      {undo ? (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-popover px-4 py-2 text-sm shadow-lg">
          <span>{undo.label}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (undo.kind === 'delete') {
                await restoreCalendarEvent(workspaceId, undo.eventId);
              }
              if (undo.kind === 'move') {
                await updateCalendarEvent(workspaceId, undo.eventId, {
                  scope: undo.scope,
                  occurrenceStart: undo.occurrenceStart,
                  isAllDay: undo.previous.isAllDay,
                  timezone: undo.previous.timezone,
                  startAt: undo.previous.startAt ?? undefined,
                  endAt: undo.previous.endAt ?? undefined,
                  startDate: undo.previous.startDate ?? undefined,
                  endDate: undo.previous.endDate ?? undefined,
                });
              }
              setUndo(null);
              await invalidateEvents();
            }}
          >
            Undo
          </Button>
        </div>
      ) : null}
    </PageContainer>
  );
}

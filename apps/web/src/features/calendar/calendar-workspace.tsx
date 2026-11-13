'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  minuteFromDropPosition,
  type CalendarDeleteUndo,
  type CalendarMutationScope,
  type CalendarView,
} from '@life-room/shared';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { PageContainer, PageHeader } from '../../components/layout/page-container';
import { Button } from '../../components/ui/button';
import { SegmentedControl } from '../../components/ui/segmented-control';
import { Skeleton } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import { listInstalledApps } from '../apps/apps-api';
import { listProjects } from '../projects/projects-api';
import { listTasks, updateTask } from '../tasks/tasks-api';
import {
  createCalendarEvent,
  createTimeBlock,
  deleteCalendarEvent,
  listCalendarEvents,
  undoCalendarDelete,
  updateCalendarEvent,
  getCalendarSettings,
  type CalendarOccurrenceDto,
  viewerTimeZone,
} from './calendar-api';
import {
  CALENDAR_HOUR_HEIGHT,
  formatRangeTitle,
  rangeForView,
  shiftAnchorForView,
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
import { TaskSidebar } from './task-sidebar';
import { EventEditor, type EventEditorSaveInput } from './event-editor';
import { ScopePrompt } from './scope-prompt';
import { scheduledTaskIdsFromOccurrences } from './scheduled-tasks';
import { registerAppCommands } from '../shell/command-registry';

const VIEW_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
] as const;

type MovePrevious = {
  startAt: string | null;
  endAt: string | null;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  timezone: string;
};

type UndoAction =
  | { kind: 'delete'; undo: CalendarDeleteUndo; label: string }
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
  const [selected, setSelected] = useState<CalendarOccurrenceDto | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarOccurrenceDto | null>(null);
  const undoRef = useRef<UndoAction | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  // Unscheduled = no calendar time_block / cross-app link. Due chips do not count.
  const blockedTaskIds = useMemo(() => scheduledTaskIdsFromOccurrences(events), [events]);

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

  function focusQuickAdd() {
    quickAddRef.current?.focus();
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;
      if (typing || event.metaKey || event.ctrlKey || event.altKey || editorOpen) return;
      if (event.key === 'd') setView('day');
      if (event.key === 'w') setView('week');
      if (event.key === 'm') setView('month');
      if (event.key === 'a') setView('agenda');
      if (event.key === 't') setAnchor(startOfDay(new Date()));
      if (event.key === 'j' || event.key === 'ArrowRight') setAnchor((value) => shiftAnchorForView(view, value, 1));
      if (event.key === 'k' || event.key === 'ArrowLeft') setAnchor((value) => shiftAnchorForView(view, value, -1));
      if (event.key === 'n') {
        event.preventDefault();
        focusQuickAdd();
      }
      if (event.key === 'e' && selected) setEditorOpen(true);
      if (event.key === 'Backspace' && selected && selected.kind !== 'due_chip') {
        event.preventDefault();
        if (selected.isRecurring) setPendingDelete(selected);
        else void handleDelete(selected, 'all');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  function showUndo(action: UndoAction) {
    undoRef.current = action;
    toast({
      title: action.label,
      actionLabel: 'Undo',
      onAction: () => {
        const pending = undoRef.current;
        if (!pending) return;
        undoRef.current = null;
        void runUndoLogic(pending);
      },
    });
  }

  async function runUndoLogic(action: UndoAction) {
    if (action.kind === 'delete') {
      await undoCalendarDelete(workspaceId, action.undo);
    } else {
      await updateCalendarEvent(workspaceId, action.eventId, {
        scope: action.scope,
        occurrenceStart: action.occurrenceStart,
        isAllDay: action.previous.isAllDay,
        timezone: action.previous.timezone,
        startAt: action.previous.startAt ?? undefined,
        endAt: action.previous.endAt ?? undefined,
        startDate: action.previous.startDate ?? undefined,
        endDate: action.previous.endDate ?? undefined,
      });
    }
    await invalidateEvents();
  }

  async function handleDelete(occurrence: CalendarOccurrenceDto, scope: CalendarMutationScope) {
    const result = await deleteCalendarEvent(workspaceId, occurrence.eventId, {
      scope,
      occurrenceStart: occurrenceStartPayload(occurrence),
    });
    showUndo({ kind: 'delete', undo: result.undo, label: `Deleted “${occurrence.title}”` });
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
      showUndo({
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

  useEffect(() => {
    return registerAppCommands('calendar', () => [
      {
        id: 'calendar-new',
        appKey: 'calendar',
        label: 'New event',
        keywords: 'create event',
        shortcut: 'n',
        run: () => focusQuickAdd(),
      },
      {
        id: 'calendar-today',
        appKey: 'calendar',
        label: 'Jump to today',
        keywords: 'today',
        shortcut: 't',
        run: () => setAnchor(startOfDay(new Date())),
      },
      {
        id: 'calendar-day',
        appKey: 'calendar',
        label: 'Day view',
        keywords: 'day',
        shortcut: 'd',
        run: () => setView('day'),
      },
      {
        id: 'calendar-week',
        appKey: 'calendar',
        label: 'Week view',
        keywords: 'week',
        shortcut: 'w',
        run: () => setView('week'),
      },
      {
        id: 'calendar-month',
        appKey: 'calendar',
        label: 'Month view',
        keywords: 'month',
        shortcut: 'm',
        run: () => setView('month'),
      },
      {
        id: 'calendar-agenda',
        appKey: 'calendar',
        label: 'Agenda view',
        keywords: 'agenda',
        shortcut: 'a',
        run: () => setView('agenda'),
      },
      {
        id: 'calendar-sidebar',
        appKey: 'calendar',
        label: 'Toggle task sidebar',
        keywords: 'tasks sidebar',
        run: () => setSidebarOpen((value) => !value),
      },
    ]);
  }, []);

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
      timezone: tz,
    });
    await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    await invalidateEvents();
  }

  if (installedQuery.isLoading) {
    return (
      <PageContainer size="full">
        <PageHeader title="Calendar" />
        <div className="space-y-3" aria-busy="true" aria-label="Loading calendar">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="ml-auto h-9 w-64" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[28rem] w-full rounded-xl" />
        </div>
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

  const rangeTitle = formatRangeTitle(view, anchor, range.days);

  return (
    <PageContainer size="full">
      <PageHeader
        title="Calendar"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                aria-label="Previous"
                onClick={() => setAnchor((value) => shiftAnchorForView(view, value, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-[10rem] px-1 text-center text-sm font-medium tabular-nums sm:min-w-[12rem]">
                {rangeTitle}
              </h2>
              <Button
                size="icon"
                variant="outline"
                aria-label="Next"
                onClick={() => setAnchor((value) => shiftAnchorForView(view, value, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAnchor(startOfDay(new Date()))}>
                Today
              </Button>
            </div>
            <SegmentedControl
              aria-label="Calendar view"
              options={[...VIEW_OPTIONS]}
              value={view}
              onChange={(next) => setView(next as CalendarView)}
            />
            {tasksInstalled ? (
              <Button size="sm" variant="outline" onClick={() => setSidebarOpen((value) => !value)}>
                Tasks
              </Button>
            ) : null}
            <Link
              href={`/w/${workspaceId}/calendar/settings`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Calendar settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="mb-3">
        <QuickAdd
          inputRef={quickAddRef}
          onSubmit={async (draft) => {
            await createMutation.mutateAsync(draft);
          }}
        />
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="min-w-0 flex-1">
            {eventsQuery.isLoading || settingsQuery.isLoading ? (
              <div aria-busy="true" aria-label="Loading calendar events">
                <Skeleton className="h-[28rem] w-full rounded-xl" />
              </div>
            ) : null}
            {!eventsQuery.isLoading && !settingsQuery.isLoading && view === 'month' ? (
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
            {!eventsQuery.isLoading && !settingsQuery.isLoading && view === 'agenda' ? (
              <AgendaList
                days={range.days}
                events={events}
                onSelectOccurrence={(occurrence) => {
                  setSelected(occurrence);
                  setEditorOpen(true);
                }}
              />
            ) : null}
            {!eventsQuery.isLoading && !settingsQuery.isLoading && (view === 'day' || view === 'week') ? (
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
            color: input.color,
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
            showUndo({
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

      <ScopePrompt
        open={Boolean(pendingDelete)}
        title="Delete recurring event"
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onSelect={(scope) => {
          if (!pendingDelete) return;
          const occurrence = pendingDelete;
          setPendingDelete(null);
          void handleDelete(occurrence, scope);
        }}
      />
    </PageContainer>
  );
}

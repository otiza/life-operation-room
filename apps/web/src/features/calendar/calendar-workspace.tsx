'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { CalendarMutationScope, CalendarView } from '@erp-tiza/shared';
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
import { addDays, rangeForView, snapToQuarterHour, startOfDay } from './calendar-range';
import { AgendaList } from './grid/agenda-list';
import { MonthGrid } from './grid/month-grid';
import { TimeGrid } from './grid/time-grid';
import { QuickAdd, type QuickAddDraft } from './quick-add';
import { CommandPalette, type CalendarCommand } from './command-palette';
import { TaskSidebar } from './task-sidebar';
import { EventEditor } from './event-editor';

type UndoAction =
  | { kind: 'delete'; eventId: string; label: string }
  | {
      kind: 'move';
      eventId: string;
      previous: { startAt: string; endAt: string };
      label: string;
    };

type CalendarWorkspaceProps = {
  workspaceId: string;
};

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

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 5000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const range = useMemo(() => rangeForView(view, anchor, weekStartsOn), [view, anchor, weekStartsOn]);
  const tz = viewerTimeZone();

  const eventsQuery = useQuery({
    queryKey: ['calendar-events', workspaceId, range.from.toISOString(), range.to.toISOString(), tz],
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
      occurrenceStart: occurrence.isRecurring
        ? occurrence.isAllDay
          ? `${occurrence.occurrenceStart}T00:00:00.000Z`
          : occurrence.occurrenceStart
        : undefined,
    });
    setUndo({ kind: 'delete', eventId: occurrence.eventId, label: `Deleted “${occurrence.title}”` });
    setSelected(null);
    await invalidateEvents();
  }

  async function handleCommand(command: CalendarCommand) {
    if (command.type === 'new-event') setPaletteOpen(false);
    if (command.type === 'today') setAnchor(startOfDay(new Date()));
    if (command.type === 'view') setView(command.view);
    if (command.type === 'toggle-sidebar') setSidebarOpen((value) => !value);
    if (command.type === 'go-date') setAnchor(startOfDay(command.date));
  }

  async function onDragEnd(event: DragEndEvent) {
    const taskId = event.active.data.current?.taskId as string | undefined;
    if (!taskId || !event.over) return;
    const overId = event.over.id.toString();
    if (!overId.startsWith('slot:')) return;
    const [, dateKey, minuteRaw] = overId.split(':');
    const gridStartMinute = Number(minuteRaw);
    const [year, month, day] = dateKey.split('-').map(Number);
    const pointerY = event.activatorEvent && 'clientY' in event.activatorEvent
      ? Number((event.activatorEvent as PointerEvent).clientY)
      : undefined;
    const overRect = event.over.rect;
    const offsetY = pointerY != null ? pointerY - overRect.top : 0;
    const minuteFromTop = Math.round(offsetY / (56 / 60) / 15) * 15;
    const minute = Math.max(gridStartMinute, gridStartMinute + minuteFromTop);
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
        onSave={async ({ title, location, scope }) => {
          if (!selected || selected.kind === 'due_chip') return;
          await updateCalendarEvent(workspaceId, selected.eventId, {
            title,
            location,
            scope,
            occurrenceStart: selected.isRecurring
              ? selected.isAllDay
                ? `${selected.occurrenceStart}T00:00:00.000Z`
                : selected.occurrenceStart
              : undefined,
          });
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
                  startAt: undo.previous.startAt,
                  endAt: undo.previous.endAt,
                  scope: 'all',
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

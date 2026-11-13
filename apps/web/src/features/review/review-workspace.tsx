'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarDateKeyInTimeZone, getDayBoundsForDateKey, zonedWallTimeToUtc } from '@life-room/shared';
import { Check, CheckCircle2, Moon, Sunrise } from 'lucide-react';
import { PageContainer, PageHeader } from '../../components/layout/page-container';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Input } from '../../components/ui/input';
import { SkeletonRow } from '../../components/ui/skeleton';
import { useToast } from '../../components/ui/toast';
import { ApiError } from '../../lib/api';
import { RowList } from '../../components/ui/row-list';
import { cn } from '../../lib/utils';
import { listInstalledApps } from '../apps/apps-api';
import { listCalendarEvents, viewerTimeZone, type CalendarOccurrenceDto } from '../calendar/calendar-api';
import { getTodayNote, updateNoteBody } from '../notes/notes-api';
import { useShellStore } from '../shell/shell-store';
import { createTask, listTasks, type Task } from '../tasks/tasks-api';
import { addCalendarDays } from '../today/today-decisions';
import { TaskRowList } from '../today/today-review';
import { useTodayDecisions } from '../today/use-today-decisions';
import {
  WORK_WINDOW,
  busyMinutesInWindow,
  dayLoad,
  dayLoadCopy,
  extractReviewText,
  formatMinutes,
  upsertReviewText,
} from './review-plan';
import { useDayClosed } from './use-day-closed';

function timeLabel(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Wall-clock hour on a given day in the viewer's timezone, as an absolute Date. */
function hourOn(dayKey: string, hour: number, timeZone: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return zonedWallTimeToUtc(year, month, day, hour, 0, 0, 0, timeZone);
}

export function ReviewWorkspace({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const setCurrentWorkspaceId = useShellStore((state) => state.setCurrentWorkspaceId);
  useEffect(() => {
    setCurrentWorkspaceId(workspaceId);
  }, [workspaceId, setCurrentWorkspaceId]);

  const timeZone = viewerTimeZone();
  const todayKey = useMemo(() => calendarDateKeyInTimeZone(new Date(), timeZone), [timeZone]);
  const tomorrowKey = addCalendarDays(todayKey, 1);
  const [closed, setClosed] = useDayClosed(workspaceId, todayKey);

  const appsQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });
  const installed = new Set((appsQuery.data?.apps ?? []).map((app) => app.appKey));
  const tasksInstalled = installed.has('tasks');
  const calendarInstalled = installed.has('calendar');
  const notesInstalled = installed.has('notes');

  const doneQuery = useQuery({
    queryKey: ['tasks', workspaceId, { view: 'logbook', completedOn: todayKey, tz: timeZone }],
    queryFn: () => listTasks(workspaceId, { view: 'logbook', completedOn: todayKey, tz: timeZone }),
    enabled: tasksInstalled,
  });
  const openQuery = useQuery({
    queryKey: ['tasks', workspaceId, { view: 'today', tz: timeZone }],
    queryFn: () => listTasks(workspaceId, { view: 'today', tz: timeZone }),
    enabled: tasksInstalled,
  });
  const upcomingQuery = useQuery({
    queryKey: ['tasks', workspaceId, { view: 'upcoming', tz: timeZone }],
    queryFn: () => listTasks(workspaceId, { view: 'upcoming', tz: timeZone }),
    enabled: tasksInstalled,
  });
  const tomorrowBounds = getDayBoundsForDateKey(tomorrowKey, timeZone);
  const tomorrowEventsQuery = useQuery({
    queryKey: [
      'calendar-events',
      workspaceId,
      tomorrowBounds.startOfToday.toISOString(),
      tomorrowBounds.startOfTomorrow.toISOString(),
      timeZone,
    ],
    queryFn: () =>
      listCalendarEvents(
        workspaceId,
        tomorrowBounds.startOfToday.toISOString(),
        tomorrowBounds.startOfTomorrow.toISOString(),
        timeZone,
      ),
    enabled: calendarInstalled,
  });

  const done = doneQuery.data?.tasks ?? [];
  const open = openQuery.data?.tasks ?? [];
  const tomorrowTasks = (upcomingQuery.data?.tasks ?? []).filter((task) => task.groupKey === tomorrowKey);
  const tomorrowEvents = useMemo(
    () =>
      [...(tomorrowEventsQuery.data?.events ?? [])]
        .filter((item) => item.kind !== 'due_chip')
        .sort((a, b) => {
          if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
          return a.occurrenceStart.localeCompare(b.occurrenceStart);
        }),
    [tomorrowEventsQuery.data?.events],
  );
  const windowStart = hourOn(tomorrowKey, WORK_WINDOW.startHour, timeZone);
  const windowEnd = hourOn(tomorrowKey, WORK_WINDOW.endHour, timeZone);
  const windowMinutes = (WORK_WINDOW.endHour - WORK_WINDOW.startHour) * 60;
  const busyMinutes = busyMinutesInWindow(tomorrowEvents, windowStart, windowEnd);
  const freeMinutes = Math.max(0, windowMinutes - busyMinutes);
  const load = dayLoad(tomorrowTasks.length, freeMinutes);

  const decisions = useTodayDecisions({ workspaceId, todayKey, timeZone });
  const { toast } = useToast();

  function closeDay() {
    setClosed(true);
    toast({ title: 'Day closed', description: 'See you tomorrow.' });
    router.push(`/w/${workspaceId}`);
  }

  function reopenDay() {
    setClosed(false);
  }

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (appsQuery.isSuccess && !tasksInstalled) {
    return (
      <PageContainer>
        <PageHeader title="Review your day" description={todayLabel} />
        <EmptyState
          title="Tasks is not installed"
          description="The daily review works on your tasks. Install Tasks to use it."
          primaryAction={{ label: 'Open marketplace', onClick: () => router.push(`/w/${workspaceId}/apps`) }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="pb-16">
      <PageHeader
        title="Review your day"
        description={todayLabel}
        actions={
          <Button type="button" variant="outline" onClick={() => router.push(`/w/${workspaceId}`)}>
            Back to Today
          </Button>
        }
      />

      <dl className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Day summary">
        <SummaryTile label="Done today" value={doneQuery.isLoading ? '–' : String(done.length)} tone="success" />
        <SummaryTile label="Still open" value={openQuery.isLoading ? '–' : String(open.length)} />
        <SummaryTile
          label="Planned tomorrow"
          value={upcomingQuery.isLoading ? '–' : String(tomorrowTasks.length)}
        />
      </dl>

      <ReviewStep number={1} title="What got done">
        {doneQuery.isLoading ? (
          <SkeletonRow />
        ) : done.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Nothing marked done today. That happens; the next step is where the day gets decided.
          </p>
        ) : (
          <RowList>
            {done.map((task, index) => (
              <DoneRow key={task.id} task={task} workspaceId={workspaceId} showDivider={index > 0} />
            ))}
          </RowList>
        )}
      </ReviewStep>

      <ReviewStep
        number={2}
        title="Decide what is still open"
        description="Give each task a place. Anything you skip stays on today, and a deadline keeps a task here."
        action={
          open.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void decisions.decideMany(open, 'tomorrow');
              }}
            >
              Move all to tomorrow
            </Button>
          ) : null
        }
      >
        {openQuery.isLoading ? (
          <SkeletonRow />
        ) : open.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Nothing left open on today.
          </p>
        ) : (
          <TaskRowList
            workspaceId={workspaceId}
            tasks={open}
            todayKey={todayKey}
            decisions={decisions}
            inlineActions
          />
        )}
      </ReviewStep>

      <ReviewStep
        number={3}
        title="Reflect"
        description="One or two lines. It is saved to today's note so you can find it later."
      >
        {notesInstalled ? (
          <ReflectionEditor workspaceId={workspaceId} timeZone={timeZone} />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            Install Notes to keep a short reflection with each day.{' '}
            <Link href={`/w/${workspaceId}/apps`} className="text-foreground underline underline-offset-2">
              Open marketplace
            </Link>
          </p>
        )}
      </ReviewStep>

      <ReviewStep number={4} title="Look at tomorrow" description={tomorrowLabel(tomorrowKey)}>
        <div className="space-y-4">
          {calendarInstalled ? (
            <DayStrip
              events={tomorrowEvents}
              windowStart={windowStart}
              windowEnd={windowEnd}
              busyMinutes={busyMinutes}
              freeMinutes={freeMinutes}
            />
          ) : null}
          <p
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              load === 'heavy' ? 'bg-danger-soft text-danger-soft-foreground' : 'bg-muted text-muted-foreground',
            )}
            data-testid="tomorrow-load"
          >
            {dayLoadCopy(load)}
          </p>
          {tomorrowTasks.length > 0 ? (
            <ul className="space-y-1">
              {tomorrowTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <Link
                    href={`/w/${workspaceId}/tasks?view=upcoming&task=${task.id}`}
                    className="min-w-0 truncate text-foreground hover:underline"
                  >
                    {task.title}
                  </Link>
                  {task.whenEvening ? <Moon className="h-3.5 w-3.5 text-muted-foreground" aria-label="Evening" /> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <TomorrowComposer workspaceId={workspaceId} tomorrowKey={tomorrowKey} />
        </div>
      </ReviewStep>

      <div className="flex flex-col items-start gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {closed ? (
          <>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
              Today is closed.
            </p>
            <Button type="button" variant="ghost" onClick={reopenDay}>
              Reopen today
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Done deciding? Close the day and stop planning.</p>
            <Button type="button" onClick={closeDay}>
              <Sunrise className="mr-2 h-4 w-4" aria-hidden />
              Close the day
            </Button>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function tomorrowLabel(tomorrowKey: string) {
  const [year, month, day] = tomorrowKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="border-l-2 border-border py-1 pl-3 sm:pl-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 text-2xl font-semibold tabular-nums text-foreground', tone === 'success' && 'text-success')}>
        {value}
      </dd>
    </div>
  );
}

function ReviewStep({
  number,
  title,
  description,
  action,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = `review-step-${number}`;
  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
            aria-hidden
          >
            {number}
          </span>
          <div>
            <h2 id={headingId} className="text-section-title text-foreground">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="sm:pl-9">{children}</div>
    </section>
  );
}

function DoneRow({ task, workspaceId, showDivider }: { task: Task; workspaceId: string; showDivider: boolean }) {
  return (
    <li className={cn(showDivider && 'border-t border-border')}>
      <Link
        href={`/w/${workspaceId}/tasks?view=logbook&task=${task.id}`}
        className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm hover:bg-accent sm:px-4"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="h-3 w-3" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{task.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{timeLabel(task.completedAt)}</span>
      </Link>
    </li>
  );
}

/** Tomorrow's working window as a strip: busy blocks over a free background (Google Calendar day, flattened). */
function DayStrip({
  events,
  windowStart,
  windowEnd,
  busyMinutes,
  freeMinutes,
}: {
  events: CalendarOccurrenceDto[];
  windowStart: Date;
  windowEnd: Date;
  busyMinutes: number;
  freeMinutes: number;
}) {
  const span = windowEnd.getTime() - windowStart.getTime();
  const timed = events.filter((item) => !item.isAllDay && item.startAt && item.endAt);
  const allDay = events.filter((item) => item.isAllDay);
  const hours = Array.from(
    { length: WORK_WINDOW.endHour - WORK_WINDOW.startHour + 1 },
    (_, index) => WORK_WINDOW.startHour + index,
  );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-foreground">
          <span className="font-medium">{formatMinutes(freeMinutes)}</span> free
          <span className="text-muted-foreground"> · {formatMinutes(busyMinutes)} booked</span>
        </span>
        <span className="text-xs text-muted-foreground">
          Between {WORK_WINDOW.startHour}:00 and {WORK_WINDOW.endHour}:00
        </span>
      </div>
      <div
        className="relative h-9 overflow-hidden rounded-md border border-border bg-success-soft/40"
        role="img"
        aria-label={`Tomorrow: ${formatMinutes(busyMinutes)} booked, ${formatMinutes(freeMinutes)} free`}
      >
        {timed.map((item) => {
          const start = Math.max(windowStart.getTime(), new Date(item.startAt as string).getTime());
          const end = Math.min(windowEnd.getTime(), new Date(item.endAt as string).getTime());
          if (end <= start) return null;
          return (
            <div
              key={`${item.eventId}-${item.occurrenceStart}`}
              className={cn(
                'absolute inset-y-0 border-x border-card px-1 text-[10px] leading-9 text-primary-foreground',
                item.kind === 'time_block' ? 'bg-primary/60' : 'bg-primary',
              )}
              style={{
                left: `${((start - windowStart.getTime()) / span) * 100}%`,
                width: `${((end - start) / span) * 100}%`,
              }}
              title={`${timeLabel(item.startAt)} ${item.title}`}
            >
              <span className="block truncate">{item.title}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden>
        {hours.map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>
      {timed.length > 0 || allDay.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {[...allDay, ...timed].map((item) => (
            <li key={`${item.eventId}-${item.occurrenceStart}-row`} className="flex gap-3">
              <span className="w-16 shrink-0 text-xs leading-5 text-muted-foreground">
                {item.isAllDay ? 'All day' : timeLabel(item.startAt)}
              </span>
              <span className="min-w-0 truncate text-foreground">{item.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No events tomorrow.</p>
      )}
    </div>
  );
}

function ReflectionEditor({ workspaceId, timeZone }: { workspaceId: string; timeZone: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const noteQuery = useQuery({
    queryKey: ['notes', workspaceId, 'today', timeZone],
    queryFn: () => getTodayNote(workspaceId, timeZone),
  });
  const note = noteQuery.data?.note;
  const saved = note ? extractReviewText(note.body) : '';
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? saved;

  const save = useMutation({
    mutationFn: async (text: string) => {
      if (!note) throw new Error('Note not loaded');
      return updateNoteBody(workspaceId, note.id, { body: upsertReviewText(note.body, text) });
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['notes', workspaceId, 'today', timeZone], result);
      setDraft(null);
      toast({ title: 'Saved to today’s note' });
    },
    onError: (error) => {
      toast({ title: error instanceof ApiError ? error.message : 'Could not save the reflection' });
    },
  });

  if (noteQuery.isLoading) return <SkeletonRow />;

  const dirty = draft !== null && draft.trim() !== saved.trim();
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty) save.mutate(value);
      }}
    >
      <textarea
        className="min-h-24 w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        placeholder="What went well? What got in the way? What matters most tomorrow?"
        aria-label="Reflection for today"
        value={value}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && dirty) {
            event.preventDefault();
            save.mutate(value);
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <Link href={`/w/${workspaceId}/notes`} className="text-xs text-muted-foreground hover:text-foreground">
          Open today’s note
        </Link>
        <Button type="submit" size="sm" variant="outline" disabled={!dirty || save.isPending}>
          {saved && !dirty ? 'Saved' : 'Save reflection'}
        </Button>
      </div>
    </form>
  );
}

function TomorrowComposer({ workspaceId, tomorrowKey }: { workspaceId: string; tomorrowKey: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const create = useMutation({
    mutationFn: (value: string) => createTask(workspaceId, { title: value, whenDate: tomorrowKey }),
    onSuccess: async () => {
      setTitle('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] }),
      ]);
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value || create.isPending) return;
    create.mutate(value);
  }

  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <Input
        placeholder="Add a task for tomorrow…"
        aria-label="Add a task for tomorrow"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Button type="submit" variant="outline" disabled={!title.trim() || create.isPending}>
        Add
      </Button>
    </form>
  );
}

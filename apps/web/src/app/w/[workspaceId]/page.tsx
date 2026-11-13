'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarDateKeyInTimeZone } from '@life-room/shared';
import { listInstalledApps } from '../../../features/apps/apps-api';
import { listCalendarEvents, viewerTimeZone } from '../../../features/calendar/calendar-api';
import { addDays, startOfDay } from '../../../features/calendar/calendar-range';
import { useShellStore } from '../../../features/shell/shell-store';
import { createTask, listTasks } from '../../../features/tasks/tasks-api';
import { TodayTaskList } from '../../../features/today/today-review';
import { TodayMasthead, type MastheadNext } from '../../../features/today/masthead';
import { me } from '../../../features/auth/auth-api';
import { shouldSuggestReview } from '../../../features/review/review-plan';
import { useDayClosed } from '../../../features/review/use-day-closed';
import { PageContainer } from '../../../components/layout/page-container';
import { Button } from '../../../components/ui/button';
import { RowList } from '../../../components/ui/row-list';
import { SectionHeading } from '../../../components/ui/section-heading';
import { EmptyState } from '../../../components/ui/empty-state';
import { Input } from '../../../components/ui/input';
import { Skeleton, SkeletonRow } from '../../../components/ui/skeleton';
import { cn } from '../../../lib/utils';
import { CheckCircle2 } from 'lucide-react';

export default function WorkspaceHomePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const setCurrentWorkspaceId = useShellStore((state) => state.setCurrentWorkspaceId);
  const openQuickAdd = useShellStore((state) => state.openQuickAdd);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setCurrentWorkspaceId(workspaceId);
  }, [workspaceId, setCurrentWorkspaceId]);

  const timeZone = viewerTimeZone();
  const todayKey = useMemo(() => calendarDateKeyInTimeZone(new Date(), timeZone), [timeZone]);
  const todayRange = useMemo(() => {
    const from = startOfDay(new Date());
    return { from: from.toISOString(), to: addDays(from, 1).toISOString() };
  }, []);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });

  const appsQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });

  const installedKeys = useMemo(
    () => new Set((appsQuery.data?.apps ?? []).map((app) => app.appKey)),
    [appsQuery.data?.apps],
  );
  const tasksInstalled = installedKeys.has('tasks');
  const calendarInstalled = installedKeys.has('calendar');
  const notesInstalled = installedKeys.has('notes');

  const tasksQuery = useQuery({
    queryKey: ['tasks', workspaceId, { view: 'today', tz: timeZone }],
    queryFn: () => listTasks(workspaceId, { view: 'today', tz: timeZone }),
    enabled: tasksInstalled,
  });

  const doneTodayQuery = useQuery({
    queryKey: ['tasks', workspaceId, { view: 'logbook', completedOn: todayKey, tz: timeZone }],
    queryFn: () => listTasks(workspaceId, { view: 'logbook', completedOn: todayKey, tz: timeZone }),
    enabled: tasksInstalled,
  });

  const [dayClosed] = useDayClosed(workspaceId, todayKey);

  const calendarQuery = useQuery({
    queryKey: ['calendar-events', workspaceId, todayRange.from, todayRange.to, timeZone],
    queryFn: () => listCalendarEvents(workspaceId, todayRange.from, todayRange.to, timeZone),
    enabled: calendarInstalled,
  });

  const createTodayTask = useMutation({
    mutationFn: (title: string) =>
      createTask(workspaceId, {
        title,
        whenDate: todayKey,
      }),
    onSuccess: async () => {
      setComposerTitle('');
      setComposerError(null);
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
    },
    onError: () => {
      setComposerError('Could not create task');
    },
  });

  const appsLoading = appsQuery.isLoading;

  const tasks = tasksQuery.data?.tasks ?? [];
  const doneCount = doneTodayQuery.data?.tasks.length ?? 0;
  const plannedCount = doneCount + tasks.length;
  const reviewHref = `/w/${workspaceId}/review`;
  const showReviewNudge =
    tasksInstalled && !tasksQuery.isLoading && shouldSuggestReview(now, dayClosed);
  const occurrences = useMemo(() => {
    const items = calendarQuery.data?.events ?? [];
    return [...items].sort((a, b) => {
      if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
      return a.occurrenceStart.localeCompare(b.occurrenceStart);
    });
  }, [calendarQuery.data?.events]);

  function onComposerSubmit(event: FormEvent) {
    event.preventDefault();
    const title = composerTitle.trim();
    if (!title || createTodayTask.isPending) return;
    createTodayTask.mutate(title);
  }

  function formatOccurrenceTime(occurrence: (typeof occurrences)[number]) {
    if (occurrence.isAllDay) return 'All day';
    if (!occurrence.startAt) return '';
    return new Date(occurrence.startAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function occurrenceHref(occurrence: (typeof occurrences)[number]) {
    if (occurrence.task?.taskId && !occurrence.task.deleted) {
      return `/w/${workspaceId}/tasks?view=today&task=${occurrence.task.taskId}`;
    }
    return `/w/${workspaceId}/calendar`;
  }

  const nowMs = now.getTime();
  const nextTimedIndex = occurrences.findIndex(
    (occurrence) => !occurrence.isAllDay && occurrence.startAt && new Date(occurrence.startAt).getTime() > nowMs,
  );

  function occurrencePhase(occurrence: (typeof occurrences)[number], index: number) {
    if (occurrence.isAllDay || !occurrence.startAt) return 'allday' as const;
    const start = new Date(occurrence.startAt).getTime();
    const end = occurrence.endAt ? new Date(occurrence.endAt).getTime() : start;
    if (end <= nowMs) return 'past' as const;
    if (start <= nowMs) return 'now' as const;
    return index === nextTimedIndex ? ('next' as const) : ('later' as const);
  }

  function minutesUntil(iso: string) {
    const minutes = Math.round((new Date(iso).getTime() - nowMs) / 60_000);
    if (minutes < 60) return `in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `in ${hours} h ${rest} min` : `in ${hours} h`;
  }

  function formatClock(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  const currentOccurrence = occurrences.find(
    (occurrence, index) => occurrencePhase(occurrence, index) === 'now' && occurrence.kind !== 'due_chip',
  );
  const nextOccurrence = nextTimedIndex >= 0 ? occurrences[nextTimedIndex] : undefined;
  const mastheadNext: MastheadNext = currentOccurrence
    ? {
        kind: 'now',
        title: currentOccurrence.title,
        until: currentOccurrence.endAt ? formatClock(currentOccurrence.endAt) : '',
      }
    : nextOccurrence?.startAt
      ? {
          kind: 'next',
          title: nextOccurrence.title,
          at: formatClock(nextOccurrence.startAt),
          relative: minutesUntil(nextOccurrence.startAt),
        }
      : { kind: 'none' };

  function kindLabel(occurrence: (typeof occurrences)[number]) {
    if (occurrence.kind === 'time_block') return 'Task block';
    if (occurrence.kind === 'due_chip') return 'Due';
    return 'Event';
  }

  return (
    <PageContainer>
      <TodayMasthead
        now={now}
        name={meQuery.data?.user.name}
        next={calendarInstalled && !calendarQuery.isLoading ? mastheadNext : undefined}
        progress={tasksInstalled && plannedCount > 0 ? { done: doneCount, planned: plannedCount } : undefined}
        actions={
          notesInstalled || tasksInstalled ? (
            <div className="flex flex-wrap items-center gap-2">
              {notesInstalled ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/w/${workspaceId}/notes`)}
                >
                  {"Today's note"}
                </Button>
              ) : null}
              {tasksInstalled ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openQuickAdd({ whenDate: todayKey })}
                >
                  Quick add
                </Button>
              ) : null}
              {tasksInstalled ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(reviewHref)}
                  aria-label={dayClosed ? 'Day closed. Open the review' : 'Review day'}
                >
                  {dayClosed ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4 text-success" aria-hidden />
                      Day closed
                    </>
                  ) : (
                    'Review day'
                  )}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {appsLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading today">
          <Skeleton className="h-12 w-full max-w-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {showReviewNudge ? (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Time to wrap up the day</p>
                <p className="text-sm text-muted-foreground">
                  {doneCount} done, {tasks.length} still open. Decide what moves, then close the day.
                </p>
              </div>
              <Button type="button" className="shrink-0" onClick={() => router.push(reviewHref)}>
                Review day
              </Button>
            </div>
          ) : null}
          {tasksInstalled ? (
            <section className="space-y-3">
              <form
                className="flex flex-col gap-2 rounded-lg border border-border bg-card px-2 py-1.5 transition-shadow focus-within:border-ring/50 has-[input:not(:placeholder-shown)]:ring-2 has-[input:not(:placeholder-shown)]:ring-ring sm:flex-row sm:items-center"
                onSubmit={onComposerSubmit}
              >
                <Input
                  className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0 sm:h-9"
                  placeholder="Add a task for today…"
                  value={composerTitle}
                  onChange={(event) => setComposerTitle(event.target.value)}
                  aria-label="Add a task for today"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-11 shrink-0 sm:h-9"
                  disabled={createTodayTask.isPending || !composerTitle.trim()}
                >
                  Add
                </Button>
              </form>
              {composerError ? <p className="text-sm text-destructive">{composerError}</p> : null}
            </section>
          ) : (
            <EmptyState
              title="Tasks is not installed"
              description="Install Tasks to plan and track what is due today."
              primaryAction={{
                label: 'Open marketplace',
                onClick: () => router.push(`/w/${workspaceId}/apps`),
              }}
            />
          )}

          <section className="space-y-3">
            <SectionHeading
              title="Calendar"
              action={calendarInstalled ? { label: 'Open calendar', href: `/w/${workspaceId}/calendar` } : undefined}
            />
            {!calendarInstalled ? (
              <EmptyState
                title="Calendar is not installed"
                description="Install Calendar to see today’s events and task blocks here."
                primaryAction={{
                  label: 'Open marketplace',
                  onClick: () => router.push(`/w/${workspaceId}/apps`),
                }}
              />
            ) : calendarQuery.isLoading ? (
              <div className="space-y-2" aria-busy="true">
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : occurrences.length === 0 ? (
              <EmptyState
                title="No events today"
                description="Your day is free on the calendar."
              />
            ) : (
              <RowList>
                {occurrences.map((occurrence, index) => {
                  const phase = occurrencePhase(occurrence, index);
                  return (
                    <li
                      key={`${occurrence.eventId}-${occurrence.occurrenceStart}`}
                      className={cn(
                        'relative',
                        index > 0 && 'border-t border-border',
                        phase === 'now' && 'bg-primary/10',
                      )}
                    >
                      {phase === 'now' || phase === 'next' ? (
                        <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />
                      ) : null}
                      <Link
                        href={occurrenceHref(occurrence)}
                        className={cn(
                          'flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 sm:px-4',
                          phase === 'past' && 'opacity-50',
                        )}
                      >
                        <span className="w-16 shrink-0 text-xs text-muted-foreground">
                          {formatOccurrenceTime(occurrence)}
                        </span>
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-foreground',
                            phase === 'past' && 'line-through decoration-muted-foreground/60',
                          )}
                        >
                          {occurrence.title}
                          {occurrence.task?.deleted ? ' (task deleted)' : ''}
                        </span>
                        {phase === 'now' ? (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                            Now
                          </span>
                        ) : phase === 'next' && occurrence.startAt ? (
                          <span className="shrink-0 rounded-full border border-primary/50 px-2 py-0.5 text-[11px] text-primary">
                            Next · {minutesUntil(occurrence.startAt)}
                          </span>
                        ) : null}
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {kindLabel(occurrence)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </RowList>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeading
              title="Tasks"
              meta={tasksInstalled && tasks.length > 0 ? `${tasks.length} left` : undefined}
              action={tasksInstalled ? { label: 'Open tasks', href: `/w/${workspaceId}/tasks?view=today` } : undefined}
            />
            {tasksInstalled ? (
              <TodayTaskList
                workspaceId={workspaceId}
                tasks={tasks}
                todayKey={todayKey}
                timeZone={timeZone}
                loading={tasksQuery.isLoading}
              />
            ) : null}
          </section>
        </div>
      )}
    </PageContainer>
  );
}

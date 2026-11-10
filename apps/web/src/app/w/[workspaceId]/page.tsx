'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarDateKeyInTimeZone } from '@erp-tiza/shared';
import { listInstalledApps } from '../../../features/apps/apps-api';
import { listCalendarEvents, viewerTimeZone } from '../../../features/calendar/calendar-api';
import { addDays, startOfDay } from '../../../features/calendar/calendar-range';
import { useShellStore } from '../../../features/shell/shell-store';
import { createTask, listTasks } from '../../../features/tasks/tasks-api';
import { TodayTaskList } from '../../../features/today/today-review';
import { PageContainer, PageHeader } from '../../../components/layout/page-container';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';
import { Input } from '../../../components/ui/input';
import { Skeleton, SkeletonRow } from '../../../components/ui/skeleton';
import { cn } from '../../../lib/utils';

export default function WorkspaceHomePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const setCurrentWorkspaceId = useShellStore((state) => state.setCurrentWorkspaceId);
  const openQuickAdd = useShellStore((state) => state.openQuickAdd);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentWorkspaceId(workspaceId);
  }, [workspaceId, setCurrentWorkspaceId]);

  const timeZone = viewerTimeZone();
  const todayKey = useMemo(() => calendarDateKeyInTimeZone(new Date(), timeZone), [timeZone]);
  const todayRange = useMemo(() => {
    const from = startOfDay(new Date());
    return { from: from.toISOString(), to: addDays(from, 1).toISOString() };
  }, []);

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
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const tasks = tasksQuery.data?.tasks ?? [];
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

  function kindLabel(occurrence: (typeof occurrences)[number]) {
    if (occurrence.kind === 'time_block') return 'Task block';
    if (occurrence.kind === 'due_chip') return 'Due';
    return 'Event';
  }

  return (
    <PageContainer size="full">
      <PageHeader
        title="Today"
        description={todayLabel}
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
          {tasksInstalled ? (
            <section className="space-y-3">
              <form
                className="flex flex-col gap-2 rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring sm:flex-row sm:items-center"
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Calendar</h2>
              {calendarInstalled ? (
                <Link
                  href={`/w/${workspaceId}/calendar`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Open Calendar
                </Link>
              ) : null}
            </div>
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
              <ul className="overflow-hidden rounded-xl border border-border bg-card">
                {occurrences.map((occurrence, index) => (
                  <li
                    key={`${occurrence.eventId}-${occurrence.occurrenceStart}`}
                    className={cn(index > 0 && 'border-t border-border')}
                  >
                    <Link
                      href={occurrenceHref(occurrence)}
                      className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent sm:px-4"
                    >
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">
                        {formatOccurrenceTime(occurrence)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {occurrence.title}
                        {occurrence.task?.deleted ? ' (task deleted)' : ''}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {kindLabel(occurrence)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
              {tasksInstalled ? (
                <Link
                  href={`/w/${workspaceId}/tasks?view=today`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Open Tasks
                </Link>
              ) : null}
            </div>
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

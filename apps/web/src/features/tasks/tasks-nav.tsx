'use client';

import Link from 'next/link';
import {
  Archive,
  CalendarDays,
  Inbox,
  Layers,
  Moon,
  Sun,
} from 'lucide-react';
import type { TaskView } from '@erp-tiza/shared';
import type { Project } from '../projects/projects-api';
import type { ProjectTaskCount, TaskViewCounts } from './tasks-api';
import { cn } from '../../lib/utils';

const SMART_VIEWS: { key: TaskView; label: string; icon: typeof Inbox }[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarDays },
  { key: 'anytime', label: 'Anytime', icon: Layers },
  { key: 'someday', label: 'Someday', icon: Moon },
  { key: 'logbook', label: 'Logbook', icon: Archive },
];

export function TasksNav({
  workspaceId,
  activeView,
  activeProjectId,
  views,
  projects,
  projectCounts,
}: {
  workspaceId: string;
  activeView?: TaskView | null;
  activeProjectId?: string | null;
  views?: TaskViewCounts;
  projects: Project[];
  projectCounts?: Record<string, ProjectTaskCount>;
}) {
  const base = `/w/${workspaceId}/tasks`;
  const activeProjects = projects.filter((project) => project.status === 'active');

  return (
    <nav className="flex w-full shrink-0 flex-col gap-4 md:w-52">
      <div className="space-y-0.5">
        {SMART_VIEWS.map((item) => {
          const Icon = item.icon;
          const count = views?.[item.key] ?? 0;
          const href = `${base}?view=${item.key}`;
          const active = activeView === item.key && !activeProjectId;
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                'flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {count > 0 ? (
                <span className={cn('tabular-nums text-xs', active ? 'opacity-90' : 'text-muted-foreground')}>
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
      {activeProjects.length > 0 ? (
        <div className="space-y-0.5">
          <p className="px-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Projects
          </p>
          {activeProjects.map((project) => {
            const open = projectCounts?.[project.id]?.open ?? 0;
            const href = `/w/${workspaceId}/projects/${project.id}`;
            const active = activeProjectId === project.id;
            return (
              <Link
                key={project.id}
                href={href}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {open > 0 ? (
                  <span className={cn('tabular-nums text-xs', active ? 'opacity-90' : 'text-muted-foreground')}>
                    {open}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}

export function emptyStateCopy(view: TaskView | 'project'): { title: string; body: string } {
  switch (view) {
    case 'inbox':
      return { title: 'Inbox zero', body: 'Press q to capture something new.' };
    case 'today':
      return { title: 'Nothing for today', body: 'Plan a task with w, or press q to add one.' };
    case 'upcoming':
      return { title: 'Nothing upcoming', body: 'Set a when date to see work on the horizon.' };
    case 'anytime':
      return { title: 'No anytime tasks', body: 'Tasks in a project without a when date land here.' };
    case 'someday':
      return { title: 'Someday is empty', body: 'Park ideas here until you are ready.' };
    case 'logbook':
      return { title: 'No completed tasks yet', body: 'Finished work will appear here.' };
    default:
      return { title: 'Your list is clear', body: 'Press q to add a task.' };
  }
}

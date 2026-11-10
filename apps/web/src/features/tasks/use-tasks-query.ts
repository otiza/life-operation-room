'use client';

import { useQuery } from '@tanstack/react-query';
import type { TaskSettings, TaskView } from '@erp-tiza/shared';
import { listInstalledApps } from '../apps/apps-api';
import { me } from '../auth/auth-api';
import { listProjects } from '../projects/projects-api';
import { getWorkspace, listMembers } from '../workspaces/workspaces-api';
import { getTaskSettings, listTasks, taskCounts } from './tasks-api';
import { taskCountsQueryKey } from './task-counts';
import { defaultTaskSettings, enabledStatuses } from './task-status';

export function useTasksQuery(workspaceId: string, lockedProjectId: string | undefined, smartView: TaskView | null) {
  const installedQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });
  const tasksInstalled = installedQuery.data?.apps.some((app) => app.appKey === 'tasks');
  const projectsInstalled = installedQuery.data?.apps.some((app) => app.appKey === 'projects');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });
  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
  });
  const settingsQuery = useQuery({
    queryKey: ['task-settings', workspaceId],
    queryFn: () => getTaskSettings(workspaceId),
    enabled: Boolean(tasksInstalled),
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => listProjects(workspaceId),
    enabled: Boolean(projectsInstalled),
  });
  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
    enabled: Boolean(tasksInstalled),
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', workspaceId, { projectId: lockedProjectId, view: smartView }],
    queryFn: () =>
      listTasks(
        workspaceId,
        lockedProjectId
          ? { projectId: lockedProjectId }
          : smartView
            ? { view: smartView }
            : {},
      ),
    enabled: Boolean(tasksInstalled),
  });
  const countsQuery = useQuery({
    queryKey: taskCountsQueryKey(workspaceId),
    queryFn: () => taskCounts(workspaceId),
    enabled: Boolean(tasksInstalled),
  });

  const settings: TaskSettings = settingsQuery.data?.settings ?? defaultTaskSettings();
  const statusOptions = enabledStatuses(settings);
  const projects = projectsQuery.data?.projects ?? [];
  const activeProjects = projects.filter((project) => project.status === 'active');
  // Avoid flashing the empty state before we know Tasks is installed / the list has loaded.
  const tasksListLoading =
    installedQuery.isLoading || (Boolean(tasksInstalled) && (tasksQuery.isLoading || settingsQuery.isLoading));

  return {
    installedQuery,
    tasksInstalled,
    projectsInstalled,
    meQuery,
    workspaceQuery,
    settingsQuery,
    projectsQuery,
    membersQuery,
    tasksQuery,
    countsQuery,
    tasksListLoading,
    settings,
    statusOptions,
    projects,
    activeProjects,
  };
}

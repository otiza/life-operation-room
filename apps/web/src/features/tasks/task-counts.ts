import type { ProjectTaskCount, TaskViewCounts } from './tasks-api';

/** Shared React Query key for GET /tasks/counts (views + projects). */
export function taskCountsQueryKey(workspaceId: string) {
  return ['task-counts', workspaceId] as const;
}

export type UnifiedTaskCounts = {
  views: TaskViewCounts;
  projects: Record<string, ProjectTaskCount>;
};

/** Read per-project stats from the unified /tasks/counts payload. */
export function projectStatsFromUnifiedCounts(
  counts: UnifiedTaskCounts | undefined,
  projectId: string,
): ProjectTaskCount {
  return counts?.projects[projectId] ?? { total: 0, open: 0 };
}

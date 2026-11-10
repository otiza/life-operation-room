'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { TaskView } from '@erp-tiza/shared';

export type LayoutMode = 'list' | 'board';

const SMART_VIEWS = new Set<TaskView>(['inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook']);

export function useTaskSelection(workspaceId: string, lockedProjectId?: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const basePath = lockedProjectId
    ? `/w/${workspaceId}/projects/${lockedProjectId}`
    : `/w/${workspaceId}/tasks`;

  const viewParam = searchParams.get('view');
  const smartView: TaskView | null = lockedProjectId
    ? null
    : SMART_VIEWS.has(viewParam as TaskView)
      ? (viewParam as TaskView)
      : 'today';
  const layout: LayoutMode =
    searchParams.get('layout') === 'board' || searchParams.get('view') === 'board' ? 'board' : 'list';
  const filterProjectId = lockedProjectId || searchParams.get('projectId') || undefined;
  const assignee: 'me' | undefined = searchParams.get('assignee') === 'me' ? 'me' : undefined;
  const showDone = searchParams.get('done') === '1';
  const selectedTaskId = searchParams.get('task') ?? searchParams.get('taskId');
  const urlQuery = searchParams.get('q') ?? '';

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const query = next.toString();
    router.replace(query ? `${basePath}?${query}` : basePath);
  }

  function setLayout(nextLayout: LayoutMode) {
    replaceParams((params) => {
      params.delete('view');
      if (smartView) params.set('view', smartView);
      if (nextLayout === 'list') params.delete('layout');
      else params.set('layout', nextLayout);
      if (params.get('view') === 'board') params.delete('view');
    });
  }

  function openTask(taskId: string) {
    replaceParams((params) => {
      params.set('task', taskId);
      params.delete('taskId');
    });
  }

  function closeTask() {
    replaceParams((params) => {
      params.delete('task');
      params.delete('taskId');
    });
  }

  return {
    router,
    basePath,
    smartView,
    layout,
    filterProjectId,
    assignee,
    showDone,
    selectedTaskId,
    urlQuery,
    searchParams,
    replaceParams,
    setLayout,
    openTask,
    closeTask,
  };
}

import { describe, expect, it } from 'vitest';
import { projectStatsFromUnifiedCounts, taskCountsQueryKey } from './task-counts';

describe('task counts cache shape', () => {
  it('uses one query key for the unified /tasks/counts payload', () => {
    expect(taskCountsQueryKey('ws-1')).toEqual(['task-counts', 'ws-1']);
  });

  it('reads project open/total from counts.projects (not the flat counts-by-project shape)', () => {
    const counts = {
      views: { inbox: 0, today: 1, upcoming: 0, anytime: 0, someday: 0, logbook: 0 },
      projects: {
        'project-test': { total: 1, open: 1 },
      },
    };
    // Bug repro: treating the nested payload as flat yields 0 open · 0 tasks.
    const flatMistaken = (counts as Record<string, unknown>)['project-test'] as
      | { open: number; total: number }
      | undefined;
    expect(flatMistaken).toBeUndefined();

    expect(projectStatsFromUnifiedCounts(counts, 'project-test')).toEqual({ total: 1, open: 1 });
    expect(projectStatsFromUnifiedCounts(counts, 'missing')).toEqual({ total: 0, open: 0 });
  });
});

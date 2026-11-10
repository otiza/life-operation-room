'use client';

import type { RefObject } from 'react';
import type { TaskView } from '@erp-tiza/shared';
import { Input } from '../../components/ui/input';
import { SegmentedControl } from '../../components/ui/segmented-control';
import { selectClass } from './tasks-composer';
import type { LayoutMode } from './use-task-selection';

export function TasksFiltersBar({
  smartView,
  isBoard,
  setLayout,
  searchRef,
  searchText,
  setSearchText,
  assignee,
  replaceParams,
  isLoading,
  listedCount,
  openCount,
  showAssigneeFilter = true,
}: {
  smartView: TaskView | null;
  isBoard: boolean;
  setLayout: (layout: LayoutMode) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  searchText: string;
  setSearchText: (value: string) => void;
  assignee: 'me' | undefined;
  replaceParams: (mutate: (params: URLSearchParams) => void) => void;
  isLoading: boolean;
  listedCount: number;
  openCount: number;
  showAssigneeFilter?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {smartView !== 'logbook' && smartView !== 'upcoming' ? (
        <SegmentedControl
          aria-label="Layout"
          value={isBoard ? 'board' : 'list'}
          onChange={(value) => setLayout(value as LayoutMode)}
          options={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
          ]}
        />
      ) : null}
      <Input
        ref={searchRef}
        className="h-11 w-full sm:h-9 sm:w-44"
        placeholder="Search tasks"
        aria-label="Search tasks"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />
      {showAssigneeFilter ? (
        <select
          className={selectClass}
          value={assignee ?? ''}
          onChange={(event) =>
            replaceParams((params) => {
              if (!event.target.value) params.delete('assignee');
              else params.set('assignee', event.target.value);
            })
          }
          aria-label="Filter by assignee"
        >
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
        </select>
      ) : null}
      {!isLoading && listedCount > 0 ? (
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{openCount} open</span>
      ) : null}
    </div>
  );
}

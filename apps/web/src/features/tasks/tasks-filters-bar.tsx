'use client';

import type { RefObject } from 'react';
import { LayoutGrid, List as ListIcon } from 'lucide-react';
import type { TaskView } from '@erp-tiza/shared';
import { Input } from '../../components/ui/input';
import { ScopeButton } from './task-rows';
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
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {smartView !== 'logbook' && smartView !== 'upcoming' ? (
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
          <ScopeButton active={!isBoard} onClick={() => setLayout('list')}>
            <ListIcon className="h-3.5 w-3.5" />
            List
          </ScopeButton>
          <ScopeButton active={isBoard} onClick={() => setLayout('board')}>
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </ScopeButton>
        </div>
      ) : null}
      <Input
        ref={searchRef}
        className="h-11 w-full sm:h-9 sm:w-44"
        placeholder="Search tasks"
        aria-label="Search tasks"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />
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
      {!isLoading && listedCount > 0 ? (
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{openCount} open</span>
      ) : null}
    </div>
  );
}

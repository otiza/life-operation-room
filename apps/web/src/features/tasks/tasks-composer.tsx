'use client';

import { FormEvent, type RefObject } from 'react';
import { Plus } from 'lucide-react';
import type { Project } from '../projects/projects-api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';

export const selectClass =
  'h-11 w-full rounded-lg border border-border bg-card px-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-auto sm:text-sm';

export function TasksComposer({
  composerRef,
  composerTitle,
  setComposerTitle,
  composerProjectId,
  setComposerProjectId,
  lockedProjectId,
  activeProjects,
  isPending,
  error,
  onSubmit,
}: {
  composerRef: RefObject<HTMLInputElement | null>;
  composerTitle: string;
  setComposerTitle: (value: string) => void;
  composerProjectId: string | 'inbox';
  setComposerProjectId: (value: string | 'inbox') => void;
  lockedProjectId?: string;
  activeProjects: Project[];
  isPending: boolean;
  error: string | null;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <>
      <form
        className="flex flex-col gap-2 rounded-lg border border-border bg-card px-2 py-1.5 transition-shadow focus-within:border-ring/50 has-[input:not(:placeholder-shown)]:ring-2 has-[input:not(:placeholder-shown)]:ring-ring sm:flex-row sm:items-center"
        onSubmit={onSubmit}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Plus className="ml-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={composerRef}
            className="h-11 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 sm:h-9 sm:text-sm"
            placeholder="Add a task…"
            value={composerTitle}
            onChange={(event) => setComposerTitle(event.target.value)}
          />
        </div>
        {lockedProjectId ? null : (
          <select
            className={cn(selectClass, 'sm:min-w-36')}
            value={composerProjectId}
            onChange={(event) => setComposerProjectId(event.target.value as string | 'inbox')}
            aria-label="Project for new task"
          >
            <option value="inbox">Inbox</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" className="h-11 shrink-0 sm:h-9" disabled={isPending || !composerTitle.trim()}>
          Add
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  );
}

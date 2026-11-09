'use client';

import { FormEvent, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseTaskQuickAdd, type TaskQuickAddResult, type TaskQuickAddToken } from '@erp-tiza/shared';
import { createTask } from './tasks-api';
import { getTaskSettings } from './tasks-api';
import { defaultTaskSettings } from './task-status';
import { listProjects } from '../projects/projects-api';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

export type QuickAddDefaults = {
  projectId?: string | null;
  whenDate?: string | null;
};

function chipRemovable(token: TaskQuickAddToken) {
  return token.kind !== 'warning';
}

export function TaskQuickAddDialog({
  workspaceId,
  open,
  onClose,
  defaults,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  defaults?: QuickAddDefaults;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => listProjects(workspaceId),
    enabled: open,
  });
  const settingsQuery = useQuery({
    queryKey: ['task-settings', workspaceId],
    queryFn: () => getTaskSettings(workspaceId),
    enabled: open,
  });

  const projects = projectsQuery.data?.projects ?? [];
  const settings = settingsQuery.data?.settings ?? defaultTaskSettings();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const parsed: TaskQuickAddResult = useMemo(
    () =>
      parseTaskQuickAdd(text, {
        timeZone,
        projects: projects.map((project) => ({ id: project.id, name: project.name })),
        priorities: settings.priorities,
      }),
    [projects, settings.priorities, text, timeZone],
  );

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(handle);
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      createTask(workspaceId, {
        title: parsed.title || text.trim(),
        projectId: parsed.projectId ?? defaults?.projectId ?? null,
        whenDate: parsed.whenDate ?? (parsed.isSomeday ? null : defaults?.whenDate ?? null),
        whenEvening: parsed.whenEvening,
        isSomeday: parsed.isSomeday,
        dueAt: parsed.dueAt,
        priority: parsed.priority ?? undefined,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
      if (keepOpen) {
        setText('');
        setKeepOpen(false);
        inputRef.current?.focus();
      } else {
        onClose();
      }
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not create task');
    },
  });

  function removeToken(token: TaskQuickAddToken) {
    setText((current) => `${current.slice(0, token.start)}${current.slice(token.end)}`.replace(/\s+/g, ' ').trim());
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!parsed.title.trim() && !text.trim()) return;
    createMutation.mutate();
  }

  const chips = parsed.tokens.filter((token) => token.kind !== 'warning' || parsed.unknownProject);

  return (
    <Dialog open={open} onClose={onClose} className="sm:max-w-xl">
      <form className="space-y-3 p-4" onSubmit={onSubmit}>
        <div>
          <h2 className="text-base font-semibold text-foreground">New task</h2>
          <p className="text-xs text-muted-foreground">
            Try “Call mom tonight #home !2” — Enter to add, Shift+Enter to add another.
          </p>
        </div>
        <div className="relative rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
          <HighlightedInput
            ref={inputRef}
            value={text}
            tokens={parsed.tokens}
            onChange={setText}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && text === '' && chips.length) {
                event.preventDefault();
                removeToken(chips[chips.length - 1]!);
                return;
              }
              if (event.key === 'Enter' && (event.shiftKey || event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setKeepOpen(true);
                if (parsed.title.trim() || text.trim()) createMutation.mutate();
              }
            }}
          />
        </div>
        {chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((token) => (
              <button
                key={`${token.kind}-${token.start}-${token.text}`}
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                  token.kind === 'warning'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-secondary text-foreground',
                )}
                onClick={() => chipRemovable(token) && removeToken(token)}
              >
                {token.label}
                {chipRemovable(token) ? <span aria-hidden>×</span> : null}
              </button>
            ))}
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || !(parsed.title.trim() || text.trim())}>
            Add task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const HighlightedInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    tokens: TaskQuickAddToken[];
    onChange: (value: string) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  }
>(function HighlightedInput({ value, tokens, onChange, onKeyDown }, ref) {
  const ranges = tokens
    .filter((token) => token.kind !== 'warning')
    .map((token) => ({ start: token.start, end: token.end, kind: token.kind }));

  return (
    <div className="relative min-h-11">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words text-base text-transparent sm:text-sm"
      >
        {renderHighlight(value, ranges)}
      </div>
      <input
        ref={ref}
        className="relative z-10 w-full bg-transparent text-base text-foreground outline-none sm:text-sm"
        value={value}
        placeholder="Task title with #project, tonight, due fri, !1…"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Quick add task"
      />
    </div>
  );
});

function renderHighlight(
  value: string,
  ranges: Array<{ start: number; end: number; kind: string }>,
) {
  if (!value) return null;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const range of sorted) {
    if (range.start < cursor || range.start >= value.length) continue;
    if (range.start > cursor) parts.push(<span key={`t-${cursor}`}>{value.slice(cursor, range.start)}</span>);
    parts.push(
      <mark
        key={`h-${range.start}`}
        className="rounded-sm bg-accent text-transparent"
      >
        {value.slice(range.start, Math.min(range.end, value.length))}
      </mark>,
    );
    cursor = Math.min(range.end, value.length);
  }
  if (cursor < value.length) parts.push(<span key={`t-end`}>{value.slice(cursor)}</span>);
  return parts;
}

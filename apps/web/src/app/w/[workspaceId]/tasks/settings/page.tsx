'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { TaskPriorityOption, TaskSettings, TaskStatusOption } from '@erp-tiza/shared';
import { getTaskSettings, updateTaskSettings } from '../../../../../features/tasks/tasks-api';
import { defaultTaskSettings, slugifyKey, sortByOrder } from '../../../../../features/tasks/task-status';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { PageContainer, PageHeader } from '../../../../../components/layout/page-container';
import { ApiError } from '../../../../../lib/api';
import { cn } from '../../../../../lib/utils';

export default function TasksSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TaskSettings>(defaultTaskSettings());
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['task-settings', workspaceId],
    queryFn: () => getTaskSettings(workspaceId),
  });

  useEffect(() => {
    if (settingsQuery.data?.settings) setDraft(settingsQuery.data.settings);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTaskSettings(workspaceId, {
        statuses: sortByOrder(draft.statuses).map((item, order) => ({ ...item, order })),
        priorities: sortByOrder(draft.priorities).map((item, order) => ({ ...item, order })),
      }),
    onSuccess: async (result) => {
      setError(null);
      setDraft(result.settings);
      await queryClient.invalidateQueries({ queryKey: ['task-settings', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not save settings');
    },
  });

  function updateStatus(key: string, patch: Partial<TaskStatusOption>) {
    setDraft((current) => ({
      ...current,
      statuses: current.statuses.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function updatePriority(key: string, patch: Partial<TaskPriorityOption>) {
    setDraft((current) => ({
      ...current,
      priorities: current.priorities.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    }));
  }

  function moveStatus(key: string, direction: -1 | 1) {
    setDraft((current) => ({
      ...current,
      statuses: reorder(current.statuses, key, direction),
    }));
  }

  function movePriority(key: string, direction: -1 | 1) {
    setDraft((current) => ({
      ...current,
      priorities: reorder(current.priorities, key, direction),
    }));
  }

  function addStatus() {
    setDraft((current) => {
      const label = `Status ${current.statuses.length + 1}`;
      let key = slugifyKey(label);
      const existing = new Set(current.statuses.map((item) => item.key));
      let suffix = 1;
      while (existing.has(key)) {
        key = `${slugifyKey(label)}_${suffix}`;
        suffix += 1;
      }
      return {
        ...current,
        statuses: [
          ...current.statuses,
          {
            key,
            label,
            color: '#a1a1aa',
            order: current.statuses.length,
            enabled: true,
          },
        ],
      };
    });
  }

  function addPriority() {
    setDraft((current) => {
      const label = `Priority ${current.priorities.length + 1}`;
      let key = slugifyKey(label);
      const existing = new Set(current.priorities.map((item) => item.key));
      let suffix = 1;
      while (existing.has(key)) {
        key = `${slugifyKey(label)}_${suffix}`;
        suffix += 1;
      }
      return {
        ...current,
        priorities: [
          ...current.priorities,
          {
            key,
            label,
            color: '#38bdf8',
            order: current.priorities.length,
            enabled: true,
          },
        ],
      };
    });
  }

  function removeStatus(key: string) {
    setDraft((current) => ({
      ...current,
      statuses: current.statuses.filter((item) => item.key !== key),
    }));
  }

  function removePriority(key: string) {
    setDraft((current) => ({
      ...current,
      priorities: current.priorities.filter((item) => item.key !== key),
    }));
  }

  if (settingsQuery.isLoading) {
    return (
      <PageContainer size="lg">
        <PageHeader title="Settings" description="Loading…" />
      </PageContainer>
    );
  }

  const statuses = sortByOrder(draft.statuses);
  const priorities = sortByOrder(draft.priorities);

  return (
    <PageContainer size="lg">
      <PageHeader
        title="Settings"
        description="Customize statuses, priorities, and colors for this workspace. More options can land here later."
        actions={
          <Button
            className="h-10"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        }
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Statuses</h2>
            <p className="text-xs text-zinc-500">Board columns follow enabled statuses in this order.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addStatus}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {statuses.map((item, index) => (
            <div
              key={item.key}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-center"
            >
              <input
                type="color"
                value={normalizeColorInput(item.color)}
                onChange={(event) => updateStatus(item.key, { color: event.target.value })}
                className="h-9 w-10 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
                aria-label={`Color for ${item.label}`}
              />
              <Input
                className="h-9"
                value={item.label}
                onChange={(event) => updateStatus(item.key, { label: event.target.value })}
              />
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(event) => updateStatus(item.key, { enabled: event.target.checked })}
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={Boolean(item.isDone)}
                  onChange={(event) => updateStatus(item.key, { isDone: event.target.checked })}
                />
                Done
              </label>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={index === 0}
                  onClick={() => moveStatus(item.key, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={index === statuses.length - 1}
                  onClick={() => moveStatus(item.key, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-600 hover:text-red-700"
                  disabled={statuses.length <= 1}
                  onClick={() => removeStatus(item.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Priorities</h2>
            <p className="text-xs text-zinc-500">Colors show as the accent on task rows and cards.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPriority}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {priorities.map((item, index) => (
            <div
              key={item.key}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-center"
            >
              <input
                type="color"
                value={normalizeColorInput(item.color)}
                onChange={(event) => updatePriority(item.key, { color: event.target.value })}
                className="h-9 w-10 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
                aria-label={`Color for ${item.label}`}
              />
              <Input
                className="h-9"
                value={item.label}
                onChange={(event) => updatePriority(item.key, { label: event.target.value })}
              />
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(event) => updatePriority(item.key, { enabled: event.target.checked })}
                />
                Enabled
              </label>
              <span
                className={cn('hidden h-6 w-1 rounded-full sm:block')}
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={index === 0}
                  onClick={() => movePriority(item.key, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={index === priorities.length - 1}
                  onClick={() => movePriority(item.key, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-600 hover:text-red-700"
                  disabled={priorities.length <= 1}
                  onClick={() => removePriority(item.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

function reorder<T extends { key: string; order: number }>(
  items: T[],
  key: string,
  direction: -1 | 1,
) {
  const sorted = sortByOrder(items);
  const index = sorted.findIndex((item) => item.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) return items;
  const next = [...sorted];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next.map((item, order) => ({ ...item, order }));
}

function normalizeColorInput(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, a, b, c] = color;
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return '#a1a1aa';
}

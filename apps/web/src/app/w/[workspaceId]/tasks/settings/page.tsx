'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { TaskPriorityOption, TaskSettings, TaskStatusOption } from '@erp-tiza/shared';
import { me } from '../../../../../features/auth/auth-api';
import { getTaskSettings, updateTaskSettings } from '../../../../../features/tasks/tasks-api';
import { defaultTaskSettings, slugifyKey, sortByOrder } from '../../../../../features/tasks/task-status';
import { listMembers } from '../../../../../features/workspaces/workspaces-api';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Skeleton, SkeletonText } from '../../../../../components/ui/skeleton';
import { PageContainer, PageHeader } from '../../../../../components/layout/page-container';
import { ApiError } from '../../../../../lib/api';
import { cn } from '../../../../../lib/utils';

export default function TasksSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TaskSettings>(defaultTaskSettings());
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: me });
  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
  });
  const myRole = (membersQuery.data?.members ?? []).find(
    (member) => member.userId === meQuery.data?.user.id && member.status === 'active',
  )?.role;
  const canManageSettings = myRole === 'owner' || myRole === 'admin';

  const settingsQuery = useQuery({
    queryKey: ['task-settings', workspaceId],
    queryFn: () => getTaskSettings(workspaceId),
  });

  useEffect(() => {
    if (!settingsQuery.data?.settings || dirtyRef.current) return;
    const next = settingsQuery.data.settings;
    hydratedRef.current = JSON.stringify(next);
    setDraft(next);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (next: TaskSettings) =>
      updateTaskSettings(workspaceId, {
        statuses: sortByOrder(next.statuses).map((item, order) => ({ ...item, order })),
        priorities: sortByOrder(next.priorities).map((item, order) => ({ ...item, order })),
      }),
    onSuccess: async (result) => {
      dirtyRef.current = false;
      setError(null);
      hydratedRef.current = JSON.stringify(result.settings);
      setDraft(result.settings);
      queryClient.setQueryData(['task-settings', workspaceId], result);
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
    onError: (err: unknown) => {
      dirtyRef.current = false;
      const previous = settingsQuery.data?.settings;
      if (previous) {
        hydratedRef.current = JSON.stringify(previous);
        setDraft(structuredClone(previous));
      }
      setError(err instanceof ApiError ? err.message : 'Could not save settings');
    },
  });

  useEffect(() => {
    if (!canManageSettings || !settingsQuery.isSuccess) return;
    const serialized = JSON.stringify(draft);
    if (hydratedRef.current === serialized) {
      hydratedRef.current = null;
      return;
    }
    dirtyRef.current = true;
    const handle = window.setTimeout(() => saveMutation.mutate(draftRef.current), 500);
    return () => window.clearTimeout(handle);
  }, [canManageSettings, draft, settingsQuery.isSuccess]);

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

  if (settingsQuery.isLoading || membersQuery.isLoading || meQuery.isLoading) {
    return (
      <PageContainer size="full">
        <div className="space-y-4" aria-busy="true" aria-label="Loading settings">
          <Skeleton className="h-8 w-40" />
          <SkeletonText lines={2} />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!canManageSettings) {
    return (
      <PageContainer size="full">
        <PageHeader
          title="Settings"
          description="Only workspace owners and admins can edit task statuses and priorities."
        />
      </PageContainer>
    );
  }

  const statuses = sortByOrder(draft.statuses);
  const priorities = sortByOrder(draft.priorities);

  return (
    <PageContainer size="full">
      <PageHeader
        title="Settings"
        description="Board columns and priority colors for this workspace."
        actions={
          <p className="text-xs text-muted-foreground">{saveMutation.isPending ? 'Saving…' : 'Saved'}</p>
        }
      />
      {error ? (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{error}</p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Statuses</h2>
            <p className="text-xs text-muted-foreground">Drag to set the board order.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={addStatus}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <OptionList
          items={statuses}
          onReorder={(activeKey, overKey) =>
            setDraft((current) => ({ ...current, statuses: reorderKeys(current.statuses, activeKey, overKey) }))
          }
        >
          {(item) => (
            <OptionFields
              label={item.label}
              color={item.color}
              placeholder="Status"
              onLabel={(label) => updateStatus(item.key, { label })}
              onColor={(color) => updateStatus(item.key, { color })}
              onRemove={() => removeStatus(item.key)}
              removeDisabled={statuses.length <= 1}
            >
              <Switch
                checked={item.enabled}
                label="On board"
                onChange={(enabled) => updateStatus(item.key, { enabled })}
              />
              <Switch
                checked={Boolean(item.isDone)}
                label="Completed"
                onChange={(isDone) => updateStatus(item.key, { isDone })}
              />
            </OptionFields>
          )}
        </OptionList>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Priorities</h2>
            <p className="text-xs text-muted-foreground">Drag to set the order. The color is the card accent.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={addPriority}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <OptionList
          items={priorities}
          onReorder={(activeKey, overKey) =>
            setDraft((current) => ({ ...current, priorities: reorderKeys(current.priorities, activeKey, overKey) }))
          }
        >
          {(item) => (
            <OptionFields
              label={item.label}
              color={item.color}
              placeholder="Priority"
              onLabel={(label) => updatePriority(item.key, { label })}
              onColor={(color) => updatePriority(item.key, { color })}
              onRemove={() => removePriority(item.key)}
              removeDisabled={priorities.length <= 1}
            >
              <Switch
                checked={item.enabled}
                label="On board"
                onChange={(enabled) => updatePriority(item.key, { enabled })}
              />
            </OptionFields>
          )}
        </OptionList>
      </section>
    </PageContainer>
  );
}

function reorderKeys<T extends { key: string; order: number }>(items: T[], activeKey: string, overKey: string) {
  const sorted = sortByOrder(items);
  const oldIndex = sorted.findIndex((item) => item.key === activeKey);
  const newIndex = sorted.findIndex((item) => item.key === overKey);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return items;
  return arrayMove(sorted, oldIndex, newIndex).map((item, order) => ({ ...item, order }));
}

function OptionList<T extends { key: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[];
  onReorder: (activeKey: string, overKey: string) => void;
  children: (item: T) => ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    onReorder(String(event.active.id), String(event.over.id));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item, index) => (
            <SortableRow key={item.key} id={item.key} divided={index > 0}>
              {children(item)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, divided, children }: { id: string; divided?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'flex items-start gap-1 bg-card px-2 py-2.5 sm:items-center',
        divided && 'border-t border-border',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <div
        ref={setActivatorNodeRef}
        className="mt-1 inline-flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-border hover:bg-accent hover:text-muted-foreground active:cursor-grabbing sm:mt-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function OptionFields({
  label,
  color,
  placeholder,
  onLabel,
  onColor,
  onRemove,
  removeDisabled,
  children,
}: {
  label: string;
  color: string;
  placeholder: string;
  onLabel: (label: string) => void;
  onColor: (color: string) => void;
  onRemove: () => void;
  removeDisabled: boolean;
  children: ReactNode;
}) {
  const swatch = normalizeColorInput(color);
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <label
          className="relative h-7 w-7 shrink-0 cursor-pointer rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: swatch }}
        >
          <span className="sr-only">Color for {label || placeholder}</span>
          <input
            type="color"
            value={swatch}
            onChange={(event) => onColor(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <Input
          className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
          value={label}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => onLabel(event.target.value)}
        />
        <span
          className="hidden h-6 max-w-24 shrink-0 items-center truncate rounded-full px-2 text-xs font-medium sm:inline-flex"
          style={{ backgroundColor: `${swatch}22`, color: swatch }}
        >
          {label || placeholder}
        </span>
      </div>
      <div className="flex items-center gap-1 pl-9 sm:pl-0">
        {children}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-danger-soft hover:text-destructive"
          disabled={removeDisabled}
          aria-label={`Remove ${label || placeholder}`}
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-1.5 text-xs text-muted-foreground hover:bg-accent"
    >
      <span className={cn('relative h-4 w-7 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-secondary')}>
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-popover transition-transform',
            checked ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </span>
      {label}
    </button>
  );
}

function normalizeColorInput(color: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, a, b, c] = color;
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return '#a1a1aa';
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calendarDateKeyInTimeZone, describeTaskRecurrence, type TaskSettings } from '@erp-tiza/shared';
import { CalendarDays, Flag, FolderKanban, CircleDot, UserRound } from 'lucide-react';
import { deleteTask, getTask, updateTask, type Task } from './tasks-api';
import {
  dueLocalFromDateInput,
  dueLocalOnDay,
  enabledPriorities,
  enabledStatuses,
  findPriority,
  findStatus,
  formatDueAtShort,
  formatWhenDateShort,
  fromDatetimeLocalValue,
  priorityLabel,
  statusLabel,
  toDatetimeLocalValue,
} from './task-status';
import { listProjects } from '../projects/projects-api';
import { listMembers } from '../workspaces/workspaces-api';
import { Button } from '../../components/ui/button';
import { PropertyField } from '../../components/ui/property-field';
import { Skeleton, SkeletonText } from '../../components/ui/skeleton';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

type Draft = {
  title: string;
  description: string;
  projectId: string;
  status: string;
  priority: string;
  dueLocal: string;
  whenDate: string;
  whenEvening: boolean;
  isSomeday: boolean;
  assigneeUserId: string;
};

function draftFromTask(task: {
  title: string;
  description: string | null;
  projectId: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  whenDate: string | null;
  whenEvening: boolean;
  isSomeday: boolean;
  assigneeUserId: string | null;
}): Draft {
  return {
    title: task.title,
    description: task.description ?? '',
    projectId: task.projectId ?? '',
    status: task.status,
    priority: task.priority,
    dueLocal: toDatetimeLocalValue(task.dueAt),
    whenDate: task.whenDate ?? '',
    whenEvening: task.whenEvening,
    isSomeday: task.isSomeday,
    assigneeUserId: task.assigneeUserId ?? '',
  };
}

function sameDraft(left: Draft, right: Draft) {
  return (
    left.title === right.title &&
    left.description === right.description &&
    left.projectId === right.projectId &&
    left.status === right.status &&
    left.priority === right.priority &&
    left.dueLocal === right.dueLocal &&
    left.whenDate === right.whenDate &&
    left.whenEvening === right.whenEvening &&
    left.isSomeday === right.isSomeday &&
    left.assigneeUserId === right.assigneeUserId
  );
}

function todayDateKey() {
  return calendarDateKeyInTimeZone(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
}

function tomorrowDateKey() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return calendarDateKeyInTimeZone(tomorrow, timeZone);
}

export function TaskEditForm({
  workspaceId,
  taskId,
  settings,
  showAssignee = true,
  onDeleted,
}: {
  workspaceId: string;
  taskId: string;
  settings: TaskSettings;
  showAssignee?: boolean;
  onDeleted?: (task: Task) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const draftRef = useRef<Draft | null>(null);
  const hydratedDraftRef = useRef<string | null>(null);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const taskQuery = useQuery({
    queryKey: ['task', workspaceId, taskId],
    queryFn: () => getTask(workspaceId, taskId),
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => listProjects(workspaceId),
  });
  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers(workspaceId),
  });

  useEffect(() => {
    const task = taskQuery.data?.task;
    if (!task || dirtyRef.current) return;
    const next = draftFromTask(task);
    hydratedDraftRef.current = JSON.stringify(next);
    setDraft(next);
  }, [taskQuery.data]);

  const stopRepeatMutation = useMutation({
    mutationFn: () => updateTask(workspaceId, taskId, { recurrenceRrule: null }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['task', workspaceId, taskId] });
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not stop repeating');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (next: Draft) =>
      updateTask(workspaceId, taskId, {
        title: next.title.trim(),
        description: next.description.trim() || null,
        projectId: next.projectId || null,
        status: next.status,
        priority: next.priority,
        dueAt: fromDatetimeLocalValue(next.dueLocal),
        whenDate: next.isSomeday ? null : next.whenDate || null,
        whenEvening: next.isSomeday ? false : next.whenEvening,
        isSomeday: next.isSomeday,
        assigneeUserId: next.assigneeUserId || null,
      }),
    onSuccess: async (_result, saved) => {
      if (draftRef.current && sameDraft(draftRef.current, saved)) dirtyRef.current = false;
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['task', workspaceId, taskId] });
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not save task');
    },
  });

  useEffect(() => {
    if (!draft) return;
    const serialized = JSON.stringify(draft);
    if (hydratedDraftRef.current === serialized) {
      hydratedDraftRef.current = null;
      return;
    }
    if (!draft.title.trim()) return;
    dirtyRef.current = true;
    const handle = window.setTimeout(() => {
      const next = draftRef.current;
      if (!next?.title.trim()) return;
      saveMutation.mutate(next);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(workspaceId, taskId),
    onSuccess: async () => {
      const task = taskQuery.data?.task;
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['task-counts', workspaceId] });
      if (task) onDeleted?.(task);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not delete task');
    },
  });

  if (taskQuery.isLoading || !draft) {
    return (
      <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading task">
        <Skeleton className="h-7 w-3/5" />
        <SkeletonText lines={3} />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-4/5" />
      </div>
    );
  }

  if (taskQuery.isError || !taskQuery.data?.task) {
    return (
      <p className="p-6 text-sm text-destructive">
        {taskQuery.error instanceof ApiError ? taskQuery.error.message : 'Task not found'}
      </p>
    );
  }

  const activeMembers = (membersQuery.data?.members ?? []).filter(
    (member) => member.status === 'active' && member.userId,
  );
  const statusOptions = enabledStatuses(settings);
  const priorityOptions = enabledPriorities(settings);
  const currentStatus = findStatus(settings, draft.status);
  const currentPriority = findPriority(settings, draft.priority);
  if (currentStatus && !statusOptions.some((item) => item.key === currentStatus.key)) {
    statusOptions.push(currentStatus);
  }
  if (currentPriority && !priorityOptions.some((item) => item.key === currentPriority.key)) {
    priorityOptions.push(currentPriority);
  }
  const projects = projectsQuery.data?.projects ?? [];
  const projectName = draft.projectId
    ? projects.find((project) => project.id === draft.projectId)?.name ?? 'Project'
    : 'Inbox';
  const assigneeLabel =
    activeMembers.find((member) => member.userId === draft.assigneeUserId)?.name?.trim() ||
    activeMembers.find((member) => member.userId === draft.assigneeUserId)?.email ||
    'Unassigned';
  const dueLabel = formatDueAtShort(fromDatetimeLocalValue(draft.dueLocal)) ?? 'None';
  const whenLabel = draft.isSomeday
    ? 'Someday'
    : formatWhenDateShort(draft.whenDate || null, draft.whenEvening) ?? 'None';

  function patch(partial: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
    setOpenMenu(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <input
          className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          value={draft.title}
          aria-label="Title"
          placeholder="Task title"
          onChange={(event) => patch({ title: event.target.value })}
        />
        <textarea
          className="min-h-28 w-full resize-y bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Add details…"
          value={draft.description}
          aria-label="Description"
          onChange={(event) => patch({ description: event.target.value })}
        />
        {taskQuery.data?.task.recurrenceRrule ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {describeTaskRecurrence(taskQuery.data.task.recurrenceRrule) ?? 'Repeats'}
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={stopRepeatMutation.isPending}
              onClick={() => stopRepeatMutation.mutate()}
            >
              Stop repeating
            </Button>
          </div>
        ) : null}
        <div className="space-y-1">
          <PropertyMenu
            menuKey="status"
            openKey={openMenu}
            setOpenKey={setOpenMenu}
            label="Status"
            value={statusLabel(settings, draft.status)}
            icon={<CircleDot className="h-4 w-4" />}
            options={statusOptions.map((item) => ({ value: item.key, label: item.label }))}
            onSelect={(value) => patch({ status: value })}
          />
          <PropertyMenu
            menuKey="priority"
            openKey={openMenu}
            setOpenKey={setOpenMenu}
            label="Priority"
            value={priorityLabel(settings, draft.priority)}
            icon={<Flag className="h-4 w-4" />}
            options={priorityOptions.map((item) => ({ value: item.key, label: item.label }))}
            onSelect={(value) => patch({ priority: value })}
          />
          <PropertyMenu
            menuKey="project"
            openKey={openMenu}
            setOpenKey={setOpenMenu}
            label="Project"
            value={projectName}
            icon={<FolderKanban className="h-4 w-4" />}
            options={[
              { value: '', label: 'Inbox' },
              ...projects.map((project) => ({
                value: project.id,
                label: project.status === 'archived' ? `${project.name} (archived)` : project.name,
              })),
            ]}
            onSelect={(value) => patch({ projectId: value })}
          />
          {showAssignee ? (
            <PropertyMenu
              menuKey="assignee"
              openKey={openMenu}
              setOpenKey={setOpenMenu}
              label="Assignee"
              value={assigneeLabel}
              icon={<UserRound className="h-4 w-4" />}
              options={[
                { value: '', label: 'Unassigned' },
                ...activeMembers.map((member) => ({
                  value: member.userId!,
                  label: member.name?.trim() || member.email,
                })),
              ]}
              onSelect={(value) => patch({ assigneeUserId: value })}
            />
          ) : null}
          <DueMenu
            open={openMenu === 'when'}
            setOpen={(next) => setOpenMenu(next ? 'when' : null)}
            label="When"
            value={whenLabel}
            icon={<CalendarDays className="h-4 w-4" />}
            dateValue={draft.whenDate}
            onToday={() => patch({ whenDate: todayDateKey(), whenEvening: false, isSomeday: false })}
            onTomorrow={() => patch({ whenDate: tomorrowDateKey(), whenEvening: false, isSomeday: false })}
            onClear={() => patch({ whenDate: '', whenEvening: false, isSomeday: false })}
            onPickDate={(value) => patch({ whenDate: value, whenEvening: false, isSomeday: false })}
            extraActions={
              <>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => patch({ whenDate: todayDateKey(), whenEvening: true, isSomeday: false })}
                >
                  This evening
                </button>
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => patch({ whenDate: '', whenEvening: false, isSomeday: true })}
                >
                  Someday
                </button>
              </>
            }
          />
          <DueMenu
            open={openMenu === 'due'}
            setOpen={(next) => setOpenMenu(next ? 'due' : null)}
            label="Deadline"
            value={dueLabel}
            icon={<Flag className="h-4 w-4" />}
            dateValue={draft.dueLocal.slice(0, 10)}
            onToday={() => patch({ dueLocal: dueLocalOnDay(0) })}
            onTomorrow={() => patch({ dueLocal: dueLocalOnDay(1) })}
            onClear={() => patch({ dueLocal: '' })}
            onPickDate={(value) => patch({ dueLocal: dueLocalFromDateInput(value) })}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <p className="text-xs text-muted-foreground">
          {saveMutation.isPending ? 'Saving…' : 'Saved'}
        </p>
      </div>
      <div className={cn('flex items-center justify-between gap-2 border-t border-border px-5 py-4')}>
        {confirmDelete ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">Delete this task?</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="h-11" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-destructive hover:bg-danger-soft hover:text-danger-soft-foreground"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

type MenuBox = { top: number; left: number; maxHeight: number; minWidth: number };

function placeMenu(button: HTMLButtonElement): MenuBox {
  const rect = button.getBoundingClientRect();
  const gap = 6;
  const margin = 8;
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const openBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
  const maxHeight = Math.max(140, Math.min(320, (openBelow ? spaceBelow : spaceAbove) - gap));
  const top = openBelow ? rect.bottom + gap : Math.max(margin, rect.top - gap - maxHeight);
  const minWidth = Math.max(rect.width, 220);
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - minWidth - margin);
  return { top, left, maxHeight, minWidth };
}

function DueMenu({
  open,
  setOpen,
  label,
  value,
  icon,
  dateValue,
  onToday,
  onTomorrow,
  onClear,
  onPickDate,
  extraActions,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  label: string;
  value: string;
  icon: ReactNode;
  dateValue: string;
  onToday: () => void;
  onTomorrow: () => void;
  onClear: () => void;
  onPickDate: (value: string) => void;
  extraActions?: ReactNode;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<MenuBox | null>(null);

  useEffect(() => {
    if (!open || !fieldRef.current) return;
    const button = fieldRef.current.querySelector('button');
    if (!button) return;
    function place() {
      setBox(placeMenu(button as HTMLButtonElement));
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (fieldRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, setOpen]);

  return (
    <>
      <div ref={fieldRef}>
        <PropertyField label={label} value={value} icon={icon} onClick={() => setOpen(!open)} />
      </div>
      {open && box
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
              style={{ top: box.top, left: box.left, maxHeight: box.maxHeight, minWidth: box.minWidth }}
            >
              <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent" onClick={onToday}>
                Today
              </button>
              <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent" onClick={onTomorrow}>
                Tomorrow
              </button>
              {extraActions}
              <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent" onClick={onClear}>
                Clear
              </button>
              <label className="block px-3 py-2 text-sm text-foreground">
                Pick a day
                <input
                  type="date"
                  className="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm"
                  value={dateValue}
                  onChange={(event) => {
                    if (event.target.value) onPickDate(event.target.value);
                  }}
                />
              </label>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function PropertyMenu({
  menuKey,
  openKey,
  setOpenKey,
  label,
  value,
  icon,
  options,
  onSelect,
}: {
  menuKey: string;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  label: string;
  value: string;
  icon: ReactNode;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<MenuBox | null>(null);
  const open = openKey === menuKey;

  useEffect(() => {
    if (!open || !fieldRef.current) return;
    const button = fieldRef.current.querySelector('button');
    if (!button) return;
    function place() {
      setBox(placeMenu(button as HTMLButtonElement));
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (fieldRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpenKey(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, setOpenKey]);

  return (
    <>
      <div ref={fieldRef}>
        <PropertyField
          label={label}
          value={value}
          icon={icon}
          onClick={() => setOpenKey(open ? null : menuKey)}
        />
      </div>
      {open && box
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              className="fixed z-[80] overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg"
              style={{ top: box.top, left: box.left, maxHeight: box.maxHeight, minWidth: box.minWidth }}
            >
              {options.map((option) => (
                <button
                  key={`${menuKey}-${option.value}`}
                  type="button"
                  className="block w-full px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent"
                  onClick={() => onSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flag, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskSettings } from '@erp-tiza/shared';
import type { Task } from './tasks-api';
import { TaskDateChips } from './task-date-chips';
import {
  assigneeInitials,
  enabledStatuses,
  isDoneStatus,
  isOverdue,
  priorityColor,
  priorityLabel,
  statusColor,
  statusLabel,
} from './task-status';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

type BoardColumns = Record<string, Task[]>;

function buildColumns(tasks: Task[], statusKeys: string[]): BoardColumns {
  const columns = Object.fromEntries(statusKeys.map((status) => [status, [] as Task[]])) as BoardColumns;
  for (const task of [...tasks].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))) {
    if (!columns[task.status]) columns[task.status] = [];
    columns[task.status].push(task);
  }
  return columns;
}

function findContainer(columns: BoardColumns, id: string, statusKeys: string[]): string | null {
  if (statusKeys.includes(id)) return id;
  if (id in columns) return id;
  for (const status of Object.keys(columns)) {
    if (columns[status].some((task) => task.id === id)) return status;
  }
  return null;
}

export type TaskBoardMove = { taskId: string; status: string; position: number };

export function TasksBoard({
  tasks,
  settings,
  projectName,
  memberLabel,
  showAssignee = true,
  onMove,
  onOpenTask,
  onCreate,
}: {
  tasks: Task[];
  settings: TaskSettings;
  projectName: (projectId: string | null) => string;
  memberLabel: (userId: string | null) => string;
  showAssignee?: boolean;
  onMove: (moves: TaskBoardMove[]) => void;
  onOpenTask: (taskId: string) => void;
  onCreate?: (status: string, title: string) => void;
}) {
  const statusOptions = useMemo(() => enabledStatuses(settings), [settings]);
  const cancelledOption = statusOptions.find((item) => item.key === 'cancelled');
  const [showCancelled, setShowCancelled] = useState(false);
  const visibleStatuses = useMemo(
    () => statusOptions.filter((item) => item.key !== 'cancelled' || showCancelled),
    [showCancelled, statusOptions],
  );
  const statusKeys = useMemo(() => visibleStatuses.map((item) => item.key), [visibleStatuses]);
  const serverColumns = useMemo(() => buildColumns(tasks, statusKeys), [tasks, statusKeys]);
  const [draftColumns, setDraftColumns] = useState<BoardColumns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const columns = draftColumns ?? serverColumns;
  const columnsRef = useRef(columns);
  const suppressClickRef = useRef(false);
  const cancelledCount = useMemo(
    () => tasks.filter((task) => task.status === 'cancelled').length,
    [tasks],
  );
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const statusKeySet = useMemo(() => new Set(statusKeys), [statusKeys]);
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerHits = pointerWithin(args);
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
    const cardHits = hits.filter((hit) => !statusKeySet.has(String(hit.id)));
    if (cardHits.length > 0) return cardHits;
    if (hits.length > 0) return hits;
    return closestCenter(args);
  }, [statusKeySet]);

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    for (const status of Object.keys(columns)) {
      const found = columns[status].find((task) => task.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, columns]);

  function handleDragStart(event: DragStartEvent) {
    suppressClickRef.current = true;
    setDraftColumns(serverColumns);
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    setDraftColumns((current) => {
      const base = current ?? serverColumns;
      const activeContainer = findContainer(base, String(active.id), statusKeys);
      const overContainer = findContainer(base, String(over.id), statusKeys);
      if (!activeContainer || !overContainer || activeContainer === overContainer) return base;
      const sourceItems = [...base[activeContainer]];
      const targetItems = [...(base[overContainer] ?? [])];
      const activeIndex = sourceItems.findIndex((task) => task.id === active.id);
      if (activeIndex < 0) return base;
      const [moved] = sourceItems.splice(activeIndex, 1);
      const overIndex = targetItems.findIndex((task) => task.id === over.id);
      const insertIndex = overIndex >= 0 ? overIndex : targetItems.length;
      targetItems.splice(insertIndex, 0, { ...moved, status: overContainer });
      return {
        ...base,
        [activeContainer]: sourceItems,
        [overContainer]: targetItems,
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    if (!over) {
      setDraftColumns(null);
      return;
    }

    let nextColumns = columnsRef.current;
    const activeContainer = findContainer(nextColumns, String(active.id), statusKeys);
    const overContainer = findContainer(nextColumns, String(over.id), statusKeys);
    if (!activeContainer || !overContainer) {
      setDraftColumns(null);
      return;
    }

    if (activeContainer === overContainer) {
      const items = nextColumns[activeContainer];
      const oldIndex = items.findIndex((task) => task.id === active.id);
      const newIndex = items.findIndex((task) => task.id === over.id);
      if (oldIndex < 0) {
        setDraftColumns(null);
        return;
      }
      const reordered =
        newIndex < 0 || oldIndex === newIndex ? items : arrayMove(items, oldIndex, newIndex);
      nextColumns = { ...nextColumns, [activeContainer]: reordered };
      setDraftColumns(nextColumns);
    }

    const statusesToSync =
      activeContainer === overContainer ? [overContainer] : [activeContainer, overContainer];
    const moves: TaskBoardMove[] = [];
    for (const status of statusesToSync) {
      (nextColumns[status] ?? []).forEach((task, position) => {
        const original = tasks.find((item) => item.id === task.id);
        if (!original) return;
        if (original.status === status && original.position === position) return;
        moves.push({ taskId: task.id, status, position });
      });
    }
    setDraftColumns(null);
    if (moves.length > 0) onMove(moves);
  }

  function handleDragCancel() {
    setActiveId(null);
    setDraftColumns(null);
  }

  return (
    <div className="space-y-3">
      {cancelledOption ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={showCancelled}
            onClick={() => setShowCancelled((value) => !value)}
          >
            {showCancelled ? 'Hide cancelled' : `Show cancelled${cancelledCount ? ` (${cancelledCount})` : ''}`}
          </Button>
        </div>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex w-max max-w-full items-start gap-3 overflow-x-auto pb-2">
          {visibleStatuses.map((status) => (
            <BoardColumn
              key={status.key}
              statusKey={status.key}
              label={status.label}
              color={status.color}
              tasks={columns[status.key] ?? []}
              settings={settings}
              projectName={projectName}
              memberLabel={memberLabel}
              showAssignee={showAssignee}
              onOpenTask={onOpenTask}
              onCreate={onCreate}
              shouldSuppressClick={() => suppressClickRef.current}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 140, easing: 'ease-out' }}>
          {activeTask ? (
            <TaskCardContent
              task={activeTask}
              settings={settings}
              projectLabel={projectName(activeTask.projectId)}
              assigneeLabel={memberLabel(activeTask.assigneeUserId)}
              showAssignee={showAssignee}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function BoardColumn({
  statusKey,
  label,
  color,
  tasks,
  settings,
  projectName,
  memberLabel,
  showAssignee,
  onOpenTask,
  onCreate,
  shouldSuppressClick,
}: {
  statusKey: string;
  label: string;
  color: string;
  tasks: Task[];
  settings: TaskSettings;
  projectName: (projectId: string | null) => string;
  memberLabel: (userId: string | null) => string;
  showAssignee: boolean;
  onOpenTask: (taskId: string) => void;
  onCreate?: (status: string, title: string) => void;
  shouldSuppressClick: () => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statusKey });
  const isEmpty = tasks.length === 0;
  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-[min(18.5rem,82vw)] shrink-0 flex-col rounded-2xl border bg-muted/90 transition-colors',
        isEmpty ? 'self-start' : 'min-h-[12rem]',
        isOver ? 'border-ring bg-muted/90 ring-1 ring-ring' : 'border-border/80',
      )}
    >
      <header className="sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl bg-muted/95 px-3 py-3 backdrop-blur">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span className="ml-auto rounded-md bg-secondary/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-2 pb-3 pt-0.5">
          {onCreate ? <ColumnComposer onCreate={(title) => onCreate(statusKey, title)} /> : null}
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              settings={settings}
              projectLabel={projectName(task.projectId)}
              assigneeLabel={memberLabel(task.assigneeUserId)}
              showAssignee={showAssignee}
              onOpenTask={onOpenTask}
              shouldSuppressClick={shouldSuppressClick}
            />
          ))}
          {isEmpty ? (
            <div
              className={cn(
                'rounded-xl border border-dashed px-3 py-3 text-center text-xs',
                isOver ? 'border-ring text-muted-foreground' : 'border-border text-muted-foreground',
              )}
            >
              Drop here
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableTaskCard({
  task,
  settings,
  projectLabel,
  assigneeLabel,
  showAssignee,
  onOpenTask,
  shouldSuppressClick,
}: {
  task: Task;
  settings: TaskSettings;
  projectLabel: string;
  assigneeLabel: string;
  showAssignee: boolean;
  onOpenTask: (taskId: string) => void;
  shouldSuppressClick: () => boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } = useSortable({
    id: task.id,
    animateLayoutChanges: ({ isSorting: sorting, wasDragging }) => (sorting || wasDragging ? false : true),
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isSorting ? undefined : transition,
      }}
      className={cn('touch-none', isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (shouldSuppressClick()) return;
        onOpenTask(task.id);
      }}
    >
      <TaskCardContent
        task={task}
        settings={settings}
        projectLabel={projectLabel}
        assigneeLabel={assigneeLabel}
        showAssignee={showAssignee}
      />
    </div>
  );
}

function TaskCardContent({
  task,
  settings,
  projectLabel,
  assigneeLabel,
  showAssignee,
  dragging,
}: {
  task: Task;
  settings: TaskSettings;
  projectLabel: string;
  assigneeLabel: string;
  showAssignee: boolean;
  dragging?: boolean;
}) {
  const overdue = isOverdue(task.dueAt, task.status, settings);
  const initials = assigneeInitials(assigneeLabel);
  const accent = priorityColor(settings, task.priority);
  const priorityName = priorityLabel(settings, task.priority);
  const showPriority = task.priority !== 'none';
  const done = isDoneStatus(settings, task.status);

  return (
    <article
      className={cn(
        'group relative cursor-grab rounded-xl border border-border/90 bg-card p-3 shadow-sm active:cursor-grabbing',
        'hover:border-border hover:shadow-md',
        overdue && 'border-destructive/40 bg-danger-soft/50',
        dragging && 'shadow-xl ring-2 ring-ring',
        done && 'opacity-80',
      )}
    >
      {showPriority ? (
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      ) : null}
      <div className={cn('flex items-start gap-1.5', showPriority && 'pl-1.5')}>
        <span className="mt-0.5 flex h-5 w-4 shrink-0 items-center justify-center text-border" aria-hidden>
          <GripVertical className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-foreground">{task.title}</p>
      </div>
      <div className={cn('mt-2.5 flex items-center gap-2', showPriority && 'pl-2')}>
        <span className="min-w-0 truncate text-[11px] text-muted-foreground">{projectLabel}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {showPriority ? (
            <span
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              <Flag className="h-3 w-3" aria-hidden />
              {priorityName}
            </span>
          ) : null}
          <TaskDateChips
            compact
            whenDate={task.whenDate}
            whenEvening={task.whenEvening}
            isSomeday={task.isSomeday}
            dueAt={task.dueAt}
            overdue={overdue}
          />
          {showAssignee ? (
            <span
              title={assigneeLabel}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold',
                assigneeLabel === 'Unassigned'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              {initials}
            </span>
          ) : null}
        </div>
      </div>
      <span className="sr-only">{statusLabel(settings, task.status)}</span>
      <span className="sr-only" style={{ color: statusColor(settings, task.status) }} />
    </article>
  );
}

function ColumnComposer({ onCreate }: { onCreate: (title: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const next = title.trim();
        if (!next) return;
        onCreate(next);
        setTitle('');
      }}
    >
      <input
        className="h-9 w-full rounded-lg border border-dashed border-border bg-card px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        placeholder="Add task"
        value={title}
        aria-label="Add task"
        onChange={(event) => setTitle(event.target.value)}
      />
    </form>
  );
}

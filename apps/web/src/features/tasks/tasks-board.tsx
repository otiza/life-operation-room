'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
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
import {
  assigneeInitials,
  enabledStatuses,
  formatDueAtShort,
  isDoneStatus,
  isOverdue,
  priorityColor,
  statusColor,
  statusLabel,
} from './task-status';
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
  onMove,
  onOpenTask,
}: {
  tasks: Task[];
  settings: TaskSettings;
  projectName: (projectId: string) => string;
  memberLabel: (userId: string | null) => string;
  onMove: (moves: TaskBoardMove[]) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const statusOptions = enabledStatuses(settings);
  const statusKeys = statusOptions.map((item) => item.key);
  const [columns, setColumns] = useState(() => buildColumns(tasks, statusKeys));
  const [activeId, setActiveId] = useState<string | null>(null);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setColumns(buildColumns(tasks, statusKeys));
  }, [tasks, statusKeys.join('|')]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

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
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    setColumns((current) => {
      const activeContainer = findContainer(current, String(active.id), statusKeys);
      const overContainer = findContainer(current, String(over.id), statusKeys);
      if (!activeContainer || !overContainer || activeContainer === overContainer) return current;
      const sourceItems = [...current[activeContainer]];
      const targetItems = [...(current[overContainer] ?? [])];
      const activeIndex = sourceItems.findIndex((task) => task.id === active.id);
      if (activeIndex < 0) return current;
      const [moved] = sourceItems.splice(activeIndex, 1);
      const overIndex = targetItems.findIndex((task) => task.id === over.id);
      const insertIndex = overIndex >= 0 ? overIndex : targetItems.length;
      targetItems.splice(insertIndex, 0, { ...moved, status: overContainer });
      return {
        ...current,
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
      setColumns(buildColumns(tasks, statusKeys));
      return;
    }

    let nextColumns = columnsRef.current;
    const activeContainer = findContainer(nextColumns, String(active.id), statusKeys);
    const overContainer = findContainer(nextColumns, String(over.id), statusKeys);
    if (!activeContainer || !overContainer) {
      setColumns(buildColumns(tasks, statusKeys));
      return;
    }

    if (activeContainer === overContainer) {
      const items = nextColumns[activeContainer];
      const oldIndex = items.findIndex((task) => task.id === active.id);
      const newIndex = items.findIndex((task) => task.id === over.id);
      if (oldIndex < 0) return;
      const reordered =
        newIndex < 0 || oldIndex === newIndex ? items : arrayMove(items, oldIndex, newIndex);
      nextColumns = { ...nextColumns, [activeContainer]: reordered };
      setColumns(nextColumns);
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
    if (moves.length > 0) onMove(moves);
  }

  function handleDragCancel() {
    setActiveId(null);
    setColumns(buildColumns(tasks, statusKeys));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-[min(70vh,52rem)] gap-3 overflow-x-auto pb-2">
        {statusOptions.map((status) => (
          <BoardColumn
            key={status.key}
            statusKey={status.key}
            label={status.label}
            color={status.color}
            tasks={columns[status.key] ?? []}
            settings={settings}
            projectName={projectName}
            memberLabel={memberLabel}
            onOpenTask={onOpenTask}
            shouldSuppressClick={() => suppressClickRef.current}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72 rotate-[1.5deg] opacity-95 shadow-xl">
            <TaskCardContent
              task={activeTask}
              settings={settings}
              projectLabel={projectName(activeTask.projectId)}
              assigneeLabel={memberLabel(activeTask.assigneeUserId)}
              dragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
  onOpenTask,
  shouldSuppressClick,
}: {
  statusKey: string;
  label: string;
  color: string;
  tasks: Task[];
  settings: TaskSettings;
  projectName: (projectId: string) => string;
  memberLabel: (userId: string | null) => string;
  onOpenTask: (taskId: string) => void;
  shouldSuppressClick: () => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statusKey });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-[min(18.5rem,82vw)] shrink-0 flex-col rounded-2xl border bg-zinc-50/90 transition-colors',
        isOver ? 'border-zinc-400 bg-zinc-100/90 ring-1 ring-zinc-300' : 'border-zinc-200/80',
      )}
    >
      <header className="sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl bg-zinc-50/95 px-3 py-3 backdrop-blur">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-sm font-semibold text-zinc-800">{label}</h2>
        <span className="ml-auto rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 px-2 pb-3 pt-0.5">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              settings={settings}
              projectLabel={projectName(task.projectId)}
              assigneeLabel={memberLabel(task.assigneeUserId)}
              onOpenTask={onOpenTask}
              shouldSuppressClick={shouldSuppressClick}
            />
          ))}
          {tasks.length === 0 ? (
            <div
              className={cn(
                'flex flex-1 items-center justify-center rounded-xl border border-dashed px-3 py-10 text-center text-xs',
                isOver ? 'border-zinc-400 text-zinc-600' : 'border-zinc-200 text-zinc-400',
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
  onOpenTask,
  shouldSuppressClick,
}: {
  task: Task;
  settings: TaskSettings;
  projectLabel: string;
  assigneeLabel: string;
  onOpenTask: (taskId: string) => void;
  shouldSuppressClick: () => boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && 'opacity-30')}
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
      />
    </div>
  );
}

function TaskCardContent({
  task,
  settings,
  projectLabel,
  assigneeLabel,
  dragging,
}: {
  task: Task;
  settings: TaskSettings;
  projectLabel: string;
  assigneeLabel: string;
  dragging?: boolean;
}) {
  const overdue = isOverdue(task.dueAt, task.status, settings);
  const dueLabel = formatDueAtShort(task.dueAt);
  const initials = assigneeInitials(assigneeLabel);
  const accent = priorityColor(settings, task.priority);
  const showAccent = task.priority !== 'none';
  const done = isDoneStatus(settings, task.status);

  return (
    <article
      className={cn(
        'group relative cursor-grab rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm active:cursor-grabbing',
        'hover:border-zinc-300 hover:shadow-md',
        overdue && 'border-red-200 bg-red-50/40',
        dragging && 'cursor-grabbing shadow-xl ring-2 ring-zinc-300',
        done && 'opacity-80',
      )}
    >
      {showAccent ? (
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      ) : null}
      <p className={cn('break-words pl-1 text-sm font-medium leading-snug text-zinc-900', showAccent && 'pl-2')}>
        {task.title}
      </p>
      <div className={cn('mt-2.5 flex items-center gap-2', showAccent && 'pl-2')}>
        <span className="min-w-0 truncate text-[11px] text-zinc-500">{projectLabel}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {dueLabel ? (
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                overdue ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600',
              )}
            >
              {dueLabel}
            </span>
          ) : null}
          <span
            title={assigneeLabel}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold',
              assigneeLabel === 'Unassigned'
                ? 'bg-zinc-100 text-zinc-400'
                : 'bg-zinc-900 text-white',
            )}
          >
            {initials}
          </span>
        </div>
      </div>
      <span className="sr-only">{statusLabel(settings, task.status)}</span>
      <span className="sr-only" style={{ color: statusColor(settings, task.status) }} />
    </article>
  );
}

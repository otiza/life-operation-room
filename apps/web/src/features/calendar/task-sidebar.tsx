'use client';

import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../tasks/tasks-api';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';

type TaskSidebarProps = {
  tasks: Task[];
  projectsById: Record<string, string>;
  blockedTaskIds: Set<string>;
};

function DraggableTask({ task, projectName }: { task: Task; projectName: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { taskId: task.id, title: task.title },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab rounded-md border border-border bg-background px-2 py-2 text-sm active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
    >
      <div className="font-medium">{task.title}</div>
      <div className="text-xs text-muted-foreground">{projectName}</div>
    </div>
  );
}

export function TaskSidebar({ tasks, projectsById, blockedTaskIds }: TaskSidebarProps) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const open = tasks.filter((task) => !blockedTaskIds.has(task.id) && task.status !== 'done' && task.status !== 'cancelled');
    const filtered = open.filter((task) => task.title.toLowerCase().includes(query.trim().toLowerCase()));
    const map = new Map<string, Task[]>();
    for (const task of filtered) {
      const list = map.get(task.projectId) ?? [];
      list.push(task);
      map.set(task.projectId, list);
    }
    return [...map.entries()];
  }, [tasks, blockedTaskIds, query]);

  return (
    <aside className="flex h-full w-full flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:w-72">
      <div>
        <h2 className="text-sm font-medium">Unscheduled tasks</h2>
        <p className="text-xs text-muted-foreground">Drag onto the grid to time-block</p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />
      <div className="min-h-0 flex-1 space-y-4 overflow-auto">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches</p>
        ) : (
          groups.map(([projectId, projectTasks]) => (
            <div key={projectId} className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {projectsById[projectId] ?? 'Project'}
              </div>
              {projectTasks.map((task) => (
                <DraggableTask key={task.id} task={task} projectName={projectsById[projectId] ?? 'Project'} />
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

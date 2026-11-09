'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaskSettings } from '@erp-tiza/shared';
import { deleteTask, getTask, updateTask } from './tasks-api';
import {
  enabledPriorities,
  enabledStatuses,
  findPriority,
  findStatus,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from './task-status';
import { listProjects } from '../projects/projects-api';
import { listMembers } from '../workspaces/workspaces-api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

const selectClass =
  'h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 sm:h-10 sm:text-sm';

export function TaskEditForm({
  workspaceId,
  taskId,
  settings,
  onDeleted,
  onSaved,
}: {
  workspaceId: string;
  taskId: string;
  settings: TaskSettings;
  onDeleted?: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setProjectId(task.projectId);
    setStatus(task.status);
    setPriority(task.priority);
    setDueLocal(toDatetimeLocalValue(task.dueAt));
    setAssigneeUserId(task.assigneeUserId ?? '');
  }, [taskQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTask(workspaceId, taskId, {
        title: title.trim(),
        description: description.trim() || null,
        projectId,
        status,
        priority,
        dueAt: fromDatetimeLocalValue(dueLocal),
        assigneeUserId: assigneeUserId || null,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['task', workspaceId, taskId] });
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      onSaved?.();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not save task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(workspaceId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
      onDeleted?.();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not delete task');
    },
  });

  function onSave(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !projectId) return;
    saveMutation.mutate();
  }

  if (taskQuery.isLoading) {
    return <p className="p-6 text-sm text-zinc-500">Loading task…</p>;
  }

  if (taskQuery.isError || !taskQuery.data?.task) {
    return (
      <p className="p-6 text-sm text-red-600">
        {taskQuery.error instanceof ApiError ? taskQuery.error.message : 'Task not found'}
      </p>
    );
  }

  const activeMembers = (membersQuery.data?.members ?? []).filter(
    (member) => member.status === 'active' && member.userId,
  );
  const statusOptions = enabledStatuses(settings);
  const priorityOptions = enabledPriorities(settings);
  const currentStatus = findStatus(settings, status);
  const currentPriority = findPriority(settings, priority);
  if (currentStatus && !statusOptions.some((item) => item.key === currentStatus.key)) {
    statusOptions.push(currentStatus);
  }
  if (currentPriority && !priorityOptions.some((item) => item.key === currentPriority.key)) {
    priorityOptions.push(currentPriority);
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSave}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">Title</span>
          <Input
            className="h-11 text-base font-medium"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-500">Description</span>
          <textarea
            className="min-h-28 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400 sm:text-sm"
            placeholder="Add details…"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">Project</span>
            <select
              className={selectClass}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              required
            >
              {(projectsQuery.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                  {project.status === 'archived' ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">Assignee</span>
            <select
              className={selectClass}
              value={assigneeUserId}
              onChange={(event) => setAssigneeUserId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.userId!}>
                  {member.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">Status</span>
            <select
              className={selectClass}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statusOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-500">Priority</span>
            <select
              className={selectClass}
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {priorityOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-zinc-500">Due</span>
            <Input
              type="datetime-local"
              className="h-11"
              value={dueLocal}
              onChange={(event) => setDueLocal(event.target.value)}
            />
          </label>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
      <div className={cn('flex flex-col gap-2 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:justify-between')}>
        <Button className="h-11 w-full sm:w-auto" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm('Delete this task?')) deleteMutation.mutate();
          }}
        >
          Delete
        </Button>
      </div>
    </form>
  );
}

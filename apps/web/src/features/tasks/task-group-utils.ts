import type { TaskSettings } from '@erp-tiza/shared';
import type { Project } from '../projects/projects-api';
import type { Task } from './tasks-api';
import { enabledStatuses } from './task-status';

export function groupTasks(
  tasks: Task[],
  options: { by: 'project' | 'status'; projects: Project[]; settings: TaskSettings },
) {
  if (options.by === 'status') {
    const statuses = enabledStatuses(options.settings);
    const groups = statuses.map((status) => ({
      key: `status:${status.key}`,
      label: status.label,
      tasks: tasks.filter((task) => task.status === status.key),
    }));
    const known = new Set(statuses.map((status) => status.key));
    const extras = tasks.filter((task) => !known.has(task.status));
    if (extras.length) groups.push({ key: 'status:other', label: 'Other', tasks: extras });
    return groups.filter((group) => group.tasks.length > 0);
  }
  const byProject = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.projectId ?? 'inbox';
    const list = byProject.get(key) ?? [];
    list.push(task);
    byProject.set(key, list);
  }
  return [...byProject.entries()].map(([projectId, projectTasks]) => ({
    key: projectId,
    label:
      projectId === 'inbox'
        ? 'Inbox'
        : options.projects.find((project) => project.id === projectId)?.name ?? 'Project',
    tasks: projectTasks,
  }));
}

export function groupByKey(tasks: Task[]) {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.groupKey ?? task.whenDate ?? 'later';
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, groupedTasks]) => ({
    key,
    label: key,
    tasks: groupedTasks,
  }));
}

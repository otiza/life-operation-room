'use client';

import type { TaskSettings } from '@erp-tiza/shared';
import { Dialog } from '../../components/ui/dialog';
import { TASK_SHORTCUTS } from '../../lib/keyboard';
import { TaskActionPicker } from './task-action-picker';
import { enabledPriorities, enabledStatuses } from './task-status';
import type { Project } from '../projects/projects-api';

type PickerKind = 'status' | 'priority' | 'due' | 'when' | 'move' | 'assignee';

type MemberRow = {
  userId: string | null;
  status: string;
  name?: string | null;
  email: string;
};

export function TasksActionPickers({
  picker,
  setPicker,
  settings,
  activeProjects,
  members,
  onSelect,
  shortcutsOpen,
  setShortcutsOpen,
}: {
  picker: PickerKind | null;
  setPicker: (picker: PickerKind | null) => void;
  settings: TaskSettings;
  activeProjects: Project[];
  members: MemberRow[];
  onSelect: (value: string) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}) {
  return (
    <>
      <TaskActionPicker
        open={picker === 'status'}
        title="Status"
        options={enabledStatuses(settings).map((item) => ({ value: item.key, label: item.label }))}
        onSelect={onSelect}
        onClose={() => setPicker(null)}
      />
      <TaskActionPicker
        open={picker === 'priority'}
        title="Priority"
        options={enabledPriorities(settings).map((item) => ({ value: item.key, label: item.label }))}
        onSelect={onSelect}
        onClose={() => setPicker(null)}
      />
      <TaskActionPicker
        open={picker === 'move'}
        title="Move to project"
        options={[
          { value: '', label: 'Inbox' },
          ...activeProjects.map((project) => ({ value: project.id, label: project.name })),
        ]}
        onSelect={onSelect}
        onClose={() => setPicker(null)}
      />
      <TaskActionPicker
        open={picker === 'assignee'}
        title="Assignee"
        options={[
          { value: '', label: 'Unassigned' },
          ...members
            .filter((member) => member.status === 'active' && member.userId)
            .map((member) => ({
              value: member.userId!,
              label: member.name?.trim() || member.email,
            })),
        ]}
        onSelect={onSelect}
        onClose={() => setPicker(null)}
      />
      <TaskActionPicker
        open={picker === 'when'}
        title="When"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'evening', label: 'This evening' },
          { value: 'tomorrow', label: 'Tomorrow' },
          { value: 'someday', label: 'Someday' },
          { value: 'clear', label: 'Clear' },
        ]}
        allowFreeText
        onSelect={onSelect}
        onClose={() => setPicker(null)}
      />
      <TaskActionPicker
        open={picker === 'due'}
        title="Due"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'tomorrow', label: 'Tomorrow' },
          { value: 'clear', label: 'Clear' },
        ]}
        allowFreeText
        onSelect={onSelect}
        onClose={() => setPicker(null)}
      />
      <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} className="sm:max-w-md">
        <div className="space-y-3 p-4">
          <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
          <ul className="space-y-2">
            {TASK_SHORTCUTS.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.description}</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{item.label}</kbd>
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
    </>
  );
}

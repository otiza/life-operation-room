export function isTypingTarget(target: EventTarget | null) {
  if (!target || !(target instanceof Element)) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  const editable = el.closest?.('[contenteditable=""], [contenteditable="true"]');
  return Boolean(el.isContentEditable) || Boolean(editable);
}

export function isBrowserReservedShortcut(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey)) return false;
  const key = event.key.toLowerCase();
  return ['r', 't', 'n', 'w', 'l', 'p', 's', 'c', 'v', 'x', 'a', 'z', 'y', 'f', '+', '-', '='].includes(key);
}

export type ShortcutDefinition = {
  key: string;
  label: string;
  description: string;
};

export const TASK_SHORTCUTS: ShortcutDefinition[] = [
  { key: 'q', label: 'q', description: 'New task' },
  { key: 'j / k', label: 'j / k', description: 'Move selection' },
  { key: 's', label: 's', description: 'Change status' },
  { key: 'p', label: 'p', description: 'Change priority' },
  { key: 'd', label: 'd', description: 'Set due date' },
  { key: 'w', label: 'w', description: 'Set when' },
  { key: 'm', label: 'm', description: 'Move to project' },
  { key: 'a', label: 'a', description: 'Assign' },
  { key: 'x', label: 'x', description: 'Toggle complete' },
  { key: 'e', label: 'e', description: 'Edit title' },
  { key: 'Backspace', label: 'Backspace', description: 'Delete task' },
  { key: '?', label: '?', description: 'Show shortcuts' },
  { key: 'Cmd/Ctrl+K', label: 'Cmd/Ctrl+K', description: 'Command palette' },
];

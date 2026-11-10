'use client';

import { useEffect, type RefObject } from 'react';
import type { Task } from './tasks-api';
import { isTypingTarget } from '../../lib/keyboard';

type PickerKind = 'status' | 'priority' | 'due' | 'when' | 'move' | 'assignee';

export function useTaskKeyboardShortcuts(options: {
  isBoard: boolean;
  navigableTaskIds: string[];
  safeFocusedTaskId: string | null;
  selectedTaskId: string | null;
  activeTask: Task | null;
  searchRef: RefObject<HTMLInputElement | null>;
  setFocusedTaskId: (taskId: string | null) => void;
  setPicker: (picker: PickerKind | null) => void;
  openTask: (taskId: string) => void;
  toggleComplete: (task: Task) => void;
  deleteTaskAndUndo: (task: Task) => void | Promise<void>;
}) {
  const {
    isBoard,
    navigableTaskIds,
    safeFocusedTaskId,
    selectedTaskId,
    activeTask,
    searchRef,
    setFocusedTaskId,
    setPicker,
    openTask,
    toggleComplete,
    deleteTaskAndUndo,
  } = options;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (event.key === 'j' || event.key === 'k') {
        if (isBoard || navigableTaskIds.length === 0) return;
        event.preventDefault();
        const currentIndex = safeFocusedTaskId ? navigableTaskIds.indexOf(safeFocusedTaskId) : -1;
        const nextIndex =
          currentIndex < 0
            ? event.key === 'j'
              ? 0
              : navigableTaskIds.length - 1
            : Math.min(navigableTaskIds.length - 1, Math.max(0, currentIndex + (event.key === 'j' ? 1 : -1)));
        const nextId = navigableTaskIds[nextIndex] ?? null;
        setFocusedTaskId(nextId);
        if (selectedTaskId && nextId) openTask(nextId);
        return;
      }
      if (event.key === 'Enter' && safeFocusedTaskId && !selectedTaskId) {
        event.preventDefault();
        openTask(safeFocusedTaskId);
        return;
      }
      if (!activeTask) return;
      if (event.key === 's') {
        event.preventDefault();
        setPicker('status');
      } else if (event.key === 'p') {
        event.preventDefault();
        setPicker('priority');
      } else if (event.key === 'd') {
        event.preventDefault();
        setPicker('due');
      } else if (event.key === 'w') {
        event.preventDefault();
        setPicker('when');
      } else if (event.key === 'm') {
        event.preventDefault();
        setPicker('move');
      } else if (event.key === 'a') {
        event.preventDefault();
        setPicker('assignee');
      } else if (event.key === 'x') {
        event.preventDefault();
        toggleComplete(activeTask);
      } else if (event.key === 'e') {
        event.preventDefault();
        openTask(activeTask.id);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        void deleteTaskAndUndo(activeTask);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTask,
    deleteTaskAndUndo,
    isBoard,
    navigableTaskIds,
    openTask,
    safeFocusedTaskId,
    searchRef,
    selectedTaskId,
    setFocusedTaskId,
    setPicker,
    toggleComplete,
  ]);
}

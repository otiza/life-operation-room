'use client';

import {
  parseTaskQuickAdd,
  type CreateTaskInput,
  type TaskQuickAddPriority,
  type TaskQuickAddProject,
} from '@life-room/shared';
import { Bell, CalendarDays, Flag, Repeat } from '../../components/ui/icons';
import { formatDayAndClock } from './task-status';

type QuickTaskContext = {
  /** Where the task lands when the text names no day (e.g. today on Home, tomorrow in Review). */
  defaultWhenDate?: string | null;
  defaultProjectId?: string | null;
  projects?: TaskQuickAddProject[];
  priorities?: TaskQuickAddPriority[];
};

function parse(text: string, context: QuickTaskContext) {
  return parseTaskQuickAdd(text, {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    projects: context.projects,
    priorities: context.priorities,
  });
}

/** Every "Add a task…" box reads dates the same way: "print documents tomorrow 5pm" gets a day, a time and a reminder. */
export function taskInputFromText(text: string, context: QuickTaskContext = {}): CreateTaskInput {
  const parsed = parse(text, context);
  return {
    title: parsed.title || text.trim(),
    projectId: parsed.projectId ?? context.defaultProjectId ?? null,
    whenDate: parsed.whenDate ?? (parsed.isSomeday ? null : context.defaultWhenDate ?? null),
    whenEvening: parsed.whenEvening,
    isSomeday: parsed.isSomeday,
    dueAt: parsed.dueAt,
    remindAt: parsed.remindAt,
    priority: parsed.priority ?? undefined,
    recurrenceRrule: parsed.recurrenceRrule,
  };
}

/** One quiet line under a composer showing what the text will become, so nobody has to know the syntax. */
export function QuickTaskPreview({ text, context = {} }: { text: string; context?: QuickTaskContext }) {
  if (!text.trim()) return null;
  const parsed = parse(text, context);
  const parts: Array<{ key: string; icon: typeof Bell; label: string }> = [];
  if (parsed.remindAt) {
    parts.push({ key: 'remind', icon: Bell, label: `Reminder ${formatDayAndClock(parsed.remindAt)}` });
  } else if (parsed.whenDate || parsed.isSomeday) {
    const when = parsed.tokens.find((token) => token.kind === 'when' || token.kind === 'someday');
    if (when) parts.push({ key: 'when', icon: CalendarDays, label: when.label });
  }
  if (parsed.dueAt && !parsed.remindAt) parts.push({ key: 'due', icon: Flag, label: `Due ${formatDayAndClock(parsed.dueAt)}` });
  if (parsed.recurrenceHint) parts.push({ key: 'repeat', icon: Repeat, label: parsed.recurrenceHint });
  if (parts.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-3 px-1 text-xs text-muted-foreground" aria-live="polite">
      {parts.map(({ key, icon: Icon, label }) => (
        <span key={key} className="inline-flex items-center gap-1">
          <Icon className="h-3 w-3" aria-hidden />
          {label}
        </span>
      ))}
    </p>
  );
}

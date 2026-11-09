'use client';

import { useState } from 'react';
import type { CalendarMutationScope } from '@erp-tiza/shared';
import type { CalendarOccurrenceDto } from './calendar-api';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

export type EventEditorSaveInput = {
  title: string;
  location: string | null;
  scope: CalendarMutationScope;
  isAllDay: boolean;
  timezone: string;
  startAt: string | null;
  endAt: string | null;
  startDate: string | null;
  endDate: string | null;
};

type EventEditorProps = {
  occurrence: CalendarOccurrenceDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: EventEditorSaveInput) => Promise<void>;
  onDelete: (scope: CalendarMutationScope) => Promise<void>;
  onCompleteTask?: () => Promise<void>;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EventEditorForm({
  occurrence,
  onOpenChange,
  onSave,
  onDelete,
  onCompleteTask,
}: {
  occurrence: CalendarOccurrenceDto;
  onOpenChange: (open: boolean) => void;
  onSave: EventEditorProps['onSave'];
  onDelete: EventEditorProps['onDelete'];
  onCompleteTask?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(occurrence.title);
  const [location, setLocation] = useState(occurrence.location ?? '');
  const [scope, setScope] = useState<CalendarMutationScope>('all');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isAllDay, setIsAllDay] = useState(occurrence.isAllDay);
  const [timezone, setTimezone] = useState(occurrence.timezone);
  const [startAtLocal, setStartAtLocal] = useState(toLocalInputValue(occurrence.startAt));
  const [endAtLocal, setEndAtLocal] = useState(toLocalInputValue(occurrence.endAt));
  const [startDate, setStartDate] = useState(occurrence.startDate ?? '');
  const [endDate, setEndDate] = useState(occurrence.endDate ?? '');

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-base font-medium">
        {occurrence.kind === 'due_chip' ? 'Task due' : 'Edit event'}
      </h2>
      <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={occurrence.kind === 'due_chip'} />
      <Input
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        placeholder="Location"
        disabled={occurrence.kind === 'due_chip'}
      />
      {occurrence.kind !== 'due_chip' ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAllDay} onChange={(event) => setIsAllDay(event.target.checked)} />
            All day
          </label>
          {isAllDay ? (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input type="datetime-local" value={startAtLocal} onChange={(event) => setStartAtLocal(event.target.value)} />
              <Input type="datetime-local" value={endAtLocal} onChange={(event) => setEndAtLocal(event.target.value)} />
            </div>
          )}
          <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Timezone" />
        </>
      ) : null}
      {occurrence.isRecurring ? (
        <select
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={scope}
          onChange={(event) => setScope(event.target.value as CalendarMutationScope)}
        >
          <option value="this">This occurrence</option>
          <option value="following">This and following</option>
          <option value="all">All occurrences</option>
        </select>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {occurrence.kind !== 'due_chip' ? (
          <Button
            onClick={async () => {
              await onSave({
                title,
                location: location.trim() || null,
                scope,
                isAllDay,
                timezone,
                startAt: isAllDay || !startAtLocal ? null : new Date(startAtLocal).toISOString(),
                endAt: isAllDay || !endAtLocal ? null : new Date(endAtLocal).toISOString(),
                startDate: isAllDay ? startDate || null : null,
                endDate: isAllDay ? endDate || null : null,
              });
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        ) : null}
        {occurrence.kind === 'time_block' && occurrence.task && !occurrence.task.deleted && onCompleteTask ? (
          <Button variant="secondary" onClick={() => onCompleteTask()}>
            Complete task
          </Button>
        ) : null}
        {occurrence.kind !== 'due_chip' ? (
          confirmDelete ? (
            <Button
              variant="destructive"
              onClick={async () => {
                await onDelete(scope);
                onOpenChange(false);
              }}
            >
              Confirm delete
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}

export function EventEditor({
  occurrence,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onCompleteTask,
}: EventEditorProps) {
  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      {occurrence ? (
        <EventEditorForm
          key={`${occurrence.eventId}-${occurrence.occurrenceStart}`}
          occurrence={occurrence}
          onOpenChange={onOpenChange}
          onSave={onSave}
          onDelete={onDelete}
          onCompleteTask={onCompleteTask}
        />
      ) : null}
    </Dialog>
  );
}

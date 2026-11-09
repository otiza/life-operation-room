'use client';

import { useMemo, useState } from 'react';
import { parseQuickAdd } from '@erp-tiza/shared';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { viewerTimeZone } from './calendar-api';

export type QuickAddDraft = {
  title: string;
  isAllDay: boolean;
  startAt: string | null;
  endAt: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  rrule: string | null;
  timezone: string;
};

type QuickAddProps = {
  onSubmit: (draft: QuickAddDraft) => Promise<void> | void;
};

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function QuickAdd({ onSubmit }: QuickAddProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  const draft: QuickAddDraft | null = useMemo(() => {
    if (!parsed.title) return null;
    const timezone = viewerTimeZone();
    if (!parsed.start) {
      return {
        title: parsed.title,
        isAllDay: false,
        startAt: null,
        endAt: null,
        startDate: null,
        endDate: null,
        location: parsed.location,
        rrule: parsed.rrule,
        timezone,
      };
    }
    if (parsed.isAllDay) {
      const startDate = toDateKey(parsed.start);
      const endDate = parsed.end ? toDateKey(parsed.end) : toDateKey(new Date(parsed.start.getTime() + 86400000));
      return {
        title: parsed.title,
        isAllDay: true,
        startAt: null,
        endAt: null,
        startDate,
        endDate: endDate <= startDate ? toDateKey(new Date(parsed.start.getTime() + 86400000)) : endDate,
        location: parsed.location,
        rrule: parsed.rrule,
        timezone,
      };
    }
    return {
      title: parsed.title,
      isAllDay: false,
      startAt: parsed.start.toISOString(),
      endAt: (parsed.end ?? new Date(parsed.start.getTime() + 60 * 60_000)).toISOString(),
      startDate: null,
      endDate: null,
      location: parsed.location,
      rrule: parsed.rrule,
      timezone,
    };
  }, [parsed]);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder='Quick add: "Lunch with Sam fri 1pm for 90m at Café Kitsuné every week"'
        onKeyDown={async (event) => {
          if (event.key === 'Enter' && (draft?.startAt || (draft?.isAllDay && draft.startDate))) {
            event.preventDefault();
            setSaving(true);
            try {
              await onSubmit(draft!);
              setText('');
            } finally {
              setSaving(false);
            }
          }
        }}
      />
      {draft ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-2 py-1 text-foreground">{draft.title}</span>
          {draft.isAllDay && draft.startDate ? <span>{draft.startDate}</span> : null}
          {!draft.isAllDay && draft.startAt ? (
            <span>
              {new Date(draft.startAt).toLocaleString(undefined, {
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {draft.endAt
                ? ` – ${new Date(draft.endAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                : ''}
            </span>
          ) : null}
          {draft.location ? <span>at {draft.location}</span> : null}
          {draft.rrule ? <span>{draft.rrule}</span> : null}
          <Button
            size="sm"
            disabled={saving || (!draft.startAt && !draft.startDate)}
            onClick={async () => {
              if (!draft.startAt && !draft.startDate) return;
              setSaving(true);
              try {
                await onSubmit(draft);
                setText('');
              } finally {
                setSaving(false);
              }
            }}
          >
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}

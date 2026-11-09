'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CalendarSettings, CalendarView } from '@erp-tiza/shared';
import { PageContainer, PageHeader } from '../../../../../components/layout/page-container';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { getCalendarSettings, updateCalendarSettings } from '../../../../../features/calendar/calendar-api';
import { IcsSettings } from '../../../../../features/calendar/ics-settings';
import { listInstalledApps } from '../../../../../features/apps/apps-api';

function SettingsForm({
  workspaceId,
  initial,
}: {
  workspaceId: string;
  initial: CalendarSettings;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const saveMutation = useMutation({
    mutationFn: (input: CalendarSettings) => updateCalendarSettings(workspaceId, input),
    onSuccess: (data) => {
      setDraft(data.settings);
      queryClient.setQueryData(['calendar-settings', workspaceId], data);
    },
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <label className="block space-y-1 text-sm">
          <span>Week starts on</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3"
            value={draft.weekStartsOn}
            onChange={(event) => setDraft({ ...draft, weekStartsOn: Number(event.target.value) })}
          >
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={6}>Saturday</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Default view</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3"
            value={draft.defaultView}
            onChange={(event) => setDraft({ ...draft, defaultView: event.target.value as CalendarView })}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="agenda">Agenda</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Default event duration (minutes)</span>
          <Input
            type="number"
            value={draft.defaultEventDurationMinutes}
            onChange={(event) =>
              setDraft({ ...draft, defaultEventDurationMinutes: Number(event.target.value) })
            }
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Working hours start (minute of day)</span>
          <Input
            type="number"
            value={draft.workingHours.startMinute}
            onChange={(event) =>
              setDraft({
                ...draft,
                workingHours: { ...draft.workingHours, startMinute: Number(event.target.value) },
              })
            }
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Working hours end (minute of day)</span>
          <Input
            type="number"
            value={draft.workingHours.endMinute}
            onChange={(event) =>
              setDraft({
                ...draft,
                workingHours: { ...draft.workingHours, endMinute: Number(event.target.value) },
              })
            }
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Secondary timezone (IANA, optional)</span>
          <Input
            value={draft.secondaryTimeZone ?? ''}
            placeholder="America/New_York"
            onChange={(event) =>
              setDraft({
                ...draft,
                secondaryTimeZone: event.target.value.trim() || null,
              })
            }
          />
        </label>
        <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
          Save settings
        </Button>
      </section>
      <IcsSettings workspaceId={workspaceId} />
    </div>
  );
}

export default function CalendarSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const installedQuery = useQuery({
    queryKey: ['installed-apps', workspaceId],
    queryFn: () => listInstalledApps(workspaceId),
  });
  const calendarInstalled = (installedQuery.data?.apps ?? []).some((app) => app.appKey === 'calendar');
  const settingsQuery = useQuery({
    queryKey: ['calendar-settings', workspaceId],
    queryFn: () => getCalendarSettings(workspaceId),
    enabled: calendarInstalled,
  });

  if (!calendarInstalled) {
    return (
      <PageContainer>
        <PageHeader title="Calendar settings" description="Install Calendar first." />
      </PageContainer>
    );
  }

  if (!settingsQuery.data?.settings) {
    return (
      <PageContainer>
        <PageHeader title="Calendar settings" description="Loading…" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Calendar settings" description="Workspace defaults for views and working hours." />
      <SettingsForm
        key={JSON.stringify(settingsQuery.data.settings)}
        workspaceId={workspaceId}
        initial={settingsQuery.data.settings}
      />
    </PageContainer>
  );
}

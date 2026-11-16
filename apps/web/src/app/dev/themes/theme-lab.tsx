'use client';

import { useTheme } from 'next-themes';
import { useState, useSyncExternalStore } from 'react';
import { applyDevTheme } from '../../../components/dev-theme-override';
import { PageContainer } from '../../../components/layout/page-container';
import { RoomBackdrop } from '../../../components/room-backdrop';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { CheckMark } from '../../../components/ui/check-mark';
import { EmptyState } from '../../../components/ui/empty-state';
import { CalendarDays, Moon, Sun } from '../../../components/ui/icons';
import { Input } from '../../../components/ui/input';
import { ProgressMeter } from '../../../components/ui/progress-meter';
import { RowList } from '../../../components/ui/row-list';
import { SectionHeading } from '../../../components/ui/section-heading';
import { SegmentedControl } from '../../../components/ui/segmented-control';
import { cn } from '../../../lib/utils';
import { THEMES } from '../../../themes/registry';

const ROWS = [
  { title: 'Write the themes plan', meta: 'Life Room', done: true },
  { title: 'Call the bank about the transfer', meta: '', done: true },
  { title: 'Pick the five hero themes', meta: 'Life Room · Today', done: false },
  { title: 'Groceries for the weekend', meta: 'This evening', done: false },
];

/** The active theme is whatever <html data-theme> says; follow it. */
function subscribeToThemeAttribute(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

export function ThemeLab() {
  const { resolvedTheme, setTheme } = useTheme();
  const themeId = useSyncExternalStore(subscribeToThemeAttribute, () => document.documentElement.dataset.theme ?? 'paper', () => 'paper');
  const [view, setView] = useState('list');

  function pick(id: string) {
    void applyDevTheme(id);
  }

  return (
    <div className="isolate flex min-h-dvh bg-background text-foreground">
      <RoomBackdrop />
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-sidebar-border surface-chrome p-3 text-sidebar-foreground md:flex">
        <p className="px-2 pb-2 text-meta text-muted-foreground">Theme lab · development only</p>
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => pick(theme.id)}
            aria-pressed={theme.id === themeId}
            className={cn(
              'relative rounded-md px-3 py-2 text-left text-sm',
              theme.id === themeId ? 'bg-nav-active font-medium' : 'hover:bg-sidebar-accent',
            )}
          >
            {theme.name}
            <span className="block text-meta text-muted-foreground">
              {theme.layers.pattern !== 'none' ? theme.layers.pattern : theme.layers.grain} · {theme.layers.surface}
            </span>
          </button>
        ))}
      </aside>

      <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:p-6">
        <PageContainer>
          <div className="flex flex-wrap items-center gap-2 md:hidden">
            {THEMES.map((theme) => (
              <Button key={theme.id} size="sm" variant={theme.id === themeId ? 'default' : 'outline'} onClick={() => pick(theme.id)}>
                {theme.name}
              </Button>
            ))}
          </div>

          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Good morning, Sam</p>
              <h1 className="text-display">Monday, 16 November</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
              {resolvedTheme === 'dark' ? <Sun className="mr-1.5 h-4 w-4" aria-hidden /> : <Moon className="mr-1.5 h-4 w-4" aria-hidden />}
              {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </header>

          <div className="flex flex-wrap items-center gap-6">
            <div className="min-w-48 flex-1">
              <p className="text-meta text-muted-foreground">Progress</p>
              <p className="font-heading text-xl font-medium">2 of 4 done</p>
              <ProgressMeter className="mt-2 max-w-48" value={2} max={4} label="Tasks done today" />
            </div>
            <SegmentedControl
              aria-label="View"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'List' },
                { value: 'board', label: 'Board' },
              ]}
            />
          </div>

          <Input placeholder="Add a task for today…" aria-label="Add a task for today" />

          <section className="space-y-2">
            <SectionHeading title="Tasks" meta="2 of 4 done" />
            <RowList>
              {ROWS.map((row, index) => (
                <li key={row.title} className={cn('flex min-h-11 items-center gap-3 px-3 py-2 sm:px-4', index > 0 && 'border-t border-border')}>
                  <CheckMark checked={row.done} hover="subtle" />
                  <span className={cn('min-w-0 flex-1 truncate text-sm', row.done && 'text-muted-foreground line-through')}>{row.title}</span>
                  {row.meta ? <span className="text-meta text-muted-foreground">{row.meta}</span> : null}
                </li>
              ))}
            </RowList>
          </section>

          <section className="space-y-2">
            <SectionHeading title="Calendar" meta="3 events" />
            <RowList>
              {[
                ['09:30', 'Standup', 'bg-event-5'],
                ['11:00', 'Design review: themes', 'bg-event-1'],
                ['17:30', 'Climbing', 'bg-event-3'],
              ].map(([time, title, color], index) => (
                <li key={title} className={cn('flex min-h-11 items-center gap-3 px-3 py-2 sm:px-4', index > 0 && 'border-t border-border')}>
                  <span className="w-12 text-meta tabular-nums text-muted-foreground">{time}</span>
                  <span className={cn('h-6 w-1 rounded-full', color)} aria-hidden />
                  <span className="text-sm">{title}</span>
                </li>
              ))}
            </RowList>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-app-calendar" aria-hidden /> A card
              </CardTitle>
              <CardDescription>Cards are for what floats or groups settings.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Delete</Button>
              <Badge>Badge</Badge>
              <Badge className="bg-danger-soft text-danger-soft-foreground">Overdue</Badge>
            </CardContent>
          </Card>

          <EmptyState title="Nothing planned for tomorrow" description="Pick a task or two now so tomorrow starts easy." primaryAction={{ label: 'Plan tomorrow', onClick: () => undefined }} />
        </PageContainer>
      </main>
    </div>
  );
}

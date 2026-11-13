'use client';

import { WORK_WINDOW } from '../review/review-plan';
import { greetingFor, pointOnArc, sunArcPosition } from './sun-arc';
import { cn } from '../../lib/utils';

export type MastheadNext =
  | { kind: 'now'; title: string; until: string }
  | { kind: 'next'; title: string; at: string; relative: string }
  | { kind: 'none' };

const pad = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function SunArc({ now }: { now: Date }) {
  const { fraction, phase } = sunArcPosition(now);
  const cx = 120;
  const cy = 104;
  const r = 86;
  const sun = pointOnArc(fraction, cx, cy, r);
  const left = pointOnArc(0, cx, cy, r);
  const right = pointOnArc(1, cx, cy, r);
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const label =
    phase === 'before'
      ? `Before the ${pad(WORK_WINDOW.startHour)} to ${pad(WORK_WINDOW.endHour)} window`
      : phase === 'after'
        ? `The ${pad(WORK_WINDOW.startHour)} to ${pad(WORK_WINDOW.endHour)} window has closed`
        : `${Math.round(fraction * 100)} percent through the ${pad(WORK_WINDOW.startHour)} to ${pad(WORK_WINDOW.endHour)} window`;
  // Keep the time label inside the drawing near both ends.
  const labelX = Math.min(Math.max(sun.x, 36), 204);

  return (
    <svg
      viewBox="0 0 240 128"
      className="h-auto w-full max-w-60 shrink-0"
      role="img"
      aria-label={label}
      data-testid="sun-arc"
      data-fraction={fraction.toFixed(3)}
    >
      <path
        d={`M${left.x} ${cy} A${r} ${r} 0 0 1 ${right.x} ${cy}`}
        fill="none"
        stroke="var(--border)"
        strokeWidth="2"
        strokeDasharray="2 5"
        strokeLinecap="round"
      />
      {fraction > 0 ? (
        <path
          d={`M${left.x} ${cy} A${r} ${r} 0 0 1 ${sun.x.toFixed(2)} ${sun.y.toFixed(2)}`}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : null}
      <path d={`M8 ${cy} H232`} stroke="var(--muted-foreground)" strokeOpacity="0.45" strokeWidth="1.5" />
      <circle cx={sun.x} cy={sun.y} r="12" fill="var(--primary)" fillOpacity="0.15" />
      <circle cx={sun.x} cy={sun.y} r="6.5" fill="var(--primary)" />
      <text x={left.x} y="123" textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
        {pad(WORK_WINDOW.startHour)}
      </text>
      <text x={right.x} y="123" textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
        {pad(WORK_WINDOW.endHour)}
      </text>
      <text
        x={labelX}
        y={Math.max(sun.y - 18, 12)}
        textAnchor="middle"
        className="fill-foreground text-[12px] font-semibold tabular-nums"
      >
        {time}
      </text>
    </svg>
  );
}

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <div className="text-meta font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

/**
 * The top of Home: the date, a greeting, the sun arc over the work window,
 * what is next, and how far the day has come. On a phone it keeps only the
 * date and the next event.
 */
export function TodayMasthead({
  now,
  name,
  next,
  progress,
  actions,
}: {
  now: Date;
  name?: string;
  /** Omitted when Calendar is not installed. */
  next?: MastheadNext;
  /** Omitted when Tasks is not installed or nothing is planned. */
  progress?: { done: number; planned: number };
  actions?: React.ReactNode;
}) {
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = name?.trim().split(/\s+/)[0];
  const percent = progress && progress.planned > 0 ? Math.round((progress.done / progress.planned) * 100) : 0;

  const nextNode =
    next?.kind === 'now' ? (
      <>
        <div className="line-clamp-2 font-heading text-xl font-medium text-foreground">{next.title}</div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-primary">Now</span> · until {next.until}
        </div>
      </>
    ) : next?.kind === 'next' ? (
      <>
        <div className="line-clamp-2 font-heading text-xl font-medium text-foreground">{next.title}</div>
        <div className="text-sm tabular-nums text-muted-foreground">
          {next.at} · <span className="font-medium text-primary">{next.relative}</span>
        </div>
      </>
    ) : next ? (
      <div className="font-heading text-xl font-medium text-muted-foreground">Nothing else today</div>
    ) : null;

  return (
    <header className="space-y-5 border-b border-border pb-6" data-testid="today-masthead">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-display text-foreground">{date}</h1>
          <p className="mt-1 font-heading text-lg italic text-muted-foreground">
            {greetingFor(now)}
            {firstName ? `, ${firstName}` : ''}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {next || progress ? (
        <div className="grid items-end gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
          <div className="hidden sm:block">
            <SunArc now={now} />
          </div>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {nextNode ? (
              <Fact label={next?.kind === 'now' ? 'Happening now' : 'Next up'}>
                <div data-testid="masthead-next">{nextNode}</div>
              </Fact>
            ) : null}
            {progress && progress.planned > 0 ? (
              <Fact label="Progress" className="hidden sm:block">
                <div className="font-heading text-xl font-medium tabular-nums text-foreground">
                  {progress.done} of {progress.planned} done
                </div>
                <div
                  className="mt-2 h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Tasks done today"
                  aria-valuemin={0}
                  aria-valuemax={progress.planned}
                  aria-valuenow={progress.done}
                >
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
                </div>
              </Fact>
            ) : null}
          </div>
        </div>
      ) : null}
      {/* Intention slot: the Notes plan fills this with today's intention line. */}
    </header>
  );
}

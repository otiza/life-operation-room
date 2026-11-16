import { cn } from '../../lib/utils';

/*
  A thin progress bar in the primary colour ("this matters"). Skins restyle it later
  (segmented for pixel, [###····] for ASCII — THEMES-PLAN PR 7) without touching callers.
*/
export function ProgressMeter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  /** Accessible name, e.g. "Tasks done today". */
  label: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      {/* The ASCII skin shows progress as text, e.g. [###·····]; other skins hide it. */}
      <div className="progress-ascii" aria-hidden>
        [{'#'.repeat(Math.round((percent / 100) * 8))}{'·'.repeat(8 - Math.round((percent / 100) * 8))}]
      </div>
    </div>
  );
}

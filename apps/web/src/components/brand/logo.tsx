import { cn } from '../../lib/utils';

/**
 * The Life Room mark ("Day arc"): a horizon with the sun partway along its arc.
 * Lines follow `currentColor`; the sun uses the accent, so it works in both themes.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('h-6 w-6 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M6.5 23a9.5 9.5 0 0 1 19 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3.5 26.5h25" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="10.3" cy="15.4" r="3.6" fill="var(--primary)" />
    </svg>
  );
}

/** Mark plus the Literata wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <LogoMark />
      <span className="font-heading text-lg font-semibold tracking-tight">Life Room</span>
    </span>
  );
}

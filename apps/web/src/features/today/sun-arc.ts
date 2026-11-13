import { WORK_WINDOW } from '../review/review-plan';

export type SunArcPhase = 'before' | 'during' | 'after';

/**
 * How far `now` is through the work window, in local time.
 * `fraction` is clamped to 0..1: before the window the sun sits at the start, after it at the end.
 */
export function sunArcPosition(now: Date, window: { startHour: number; endHour: number } = WORK_WINDOW) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = window.startHour * 60;
  const end = window.endHour * 60;
  const phase: SunArcPhase = minutes < start ? 'before' : minutes >= end ? 'after' : 'during';
  const fraction = Math.min(1, Math.max(0, (minutes - start) / (end - start)));
  return { fraction, phase };
}

/**
 * The point on a half circle (center cx, cy; radius r) for a fraction of the way
 * from the left end (0) over the top to the right end (1). SVG y grows downward.
 */
export function pointOnArc(fraction: number, cx: number, cy: number, r: number) {
  const angle = Math.PI * (1 - fraction);
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

export function greetingFor(now: Date) {
  const hour = now.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Event colours. A stored colour is either one of the 8 swatch keys ("event-1"…"event-8",
 * which follow the theme) or, for older events, any CSS colour, used as is.
 * Events without a colour use the Calendar tint; task time uses the Tasks tint.
 */
export const EVENT_SWATCHES = [
  { key: 'event-1', label: 'Terracotta' },
  { key: 'event-2', label: 'Ochre' },
  { key: 'event-3', label: 'Olive' },
  { key: 'event-4', label: 'Sage' },
  { key: 'event-5', label: 'Teal' },
  { key: 'event-6', label: 'Slate blue' },
  { key: 'event-7', label: 'Violet' },
  { key: 'event-8', label: 'Rose' },
] as const;

export type EventSwatchKey = (typeof EVENT_SWATCHES)[number]['key'];

export function isSwatchKey(color: string | null | undefined): color is EventSwatchKey {
  return EVENT_SWATCHES.some((swatch) => swatch.key === color);
}

export function eventColorFor(occurrence: { color?: string | null; kind?: string }) {
  const { color } = occurrence;
  if (isSwatchKey(color)) return `var(--${color})`;
  if (color) return color;
  if (occurrence.kind === 'time_block') return 'var(--app-tasks)';
  return 'var(--app-calendar)';
}

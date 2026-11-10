const EVENT_TOKENS = [
  'var(--event-1)',
  'var(--event-2)',
  'var(--event-3)',
  'var(--event-4)',
  'var(--event-5)',
  'var(--event-6)',
  'var(--event-7)',
  'var(--event-8)',
] as const;

export function eventColorFor(occurrence: { eventId: string; color?: string | null }) {
  if (occurrence.color) return occurrence.color;
  let hash = 0;
  for (let index = 0; index < occurrence.eventId.length; index += 1) {
    hash = (hash + occurrence.eventId.charCodeAt(index) * (index + 1)) % EVENT_TOKENS.length;
  }
  return EVENT_TOKENS[hash] ?? EVENT_TOKENS[0];
}

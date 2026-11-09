/** Convert a drag drop Y position into a grid minute (15-minute snap). */
export function minuteFromDropPosition(input: {
  translatedTop: number;
  columnTop: number;
  gridStartMinute: number;
  hourHeight: number;
  maxOffsetMinutes?: number;
}): number {
  const pixelsPerMinute = input.hourHeight / 60;
  const offsetY = input.translatedTop - input.columnTop;
  const rawMinutes = offsetY / pixelsPerMinute;
  const snapped = Math.round(rawMinutes / 15) * 15;
  const clamped = Math.max(0, input.maxOffsetMinutes != null ? Math.min(snapped, input.maxOffsetMinutes) : snapped);
  return input.gridStartMinute + clamped;
}

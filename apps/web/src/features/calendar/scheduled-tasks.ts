/** A task is scheduled when it has a non-deleted calendar time_block (cross-app link). Due chips do not count. */
export type OccurrenceForSchedule = {
  kind: string;
  isAllDay?: boolean;
  startAt?: string | null;
  task?: { taskId: string; deleted: boolean } | null;
};

export function scheduledTaskIdsFromOccurrences(occurrences: OccurrenceForSchedule[]): Set<string> {
  const ids = new Set<string>();
  for (const occurrence of occurrences) {
    if (occurrence.kind !== 'time_block' || !occurrence.task || occurrence.task.deleted) continue;
    ids.add(occurrence.task.taskId);
  }
  return ids;
}

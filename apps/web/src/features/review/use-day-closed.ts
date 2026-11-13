'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { DAY_CLOSED_EVENT, readDayClosed, writeDayClosed } from './review-plan';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(DAY_CLOSED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(DAY_CLOSED_EVENT, onChange);
  };
}

/** Whether the viewer closed this day in the review. Stays in sync across tabs and pages. */
export function useDayClosed(workspaceId: string, dayKey: string) {
  const closed = useSyncExternalStore(
    subscribe,
    () => readDayClosed(workspaceId, dayKey),
    () => false,
  );
  const setClosed = useCallback(
    (next: boolean) => writeDayClosed(workspaceId, dayKey, next),
    [workspaceId, dayKey],
  );
  return [closed, setClosed] as const;
}

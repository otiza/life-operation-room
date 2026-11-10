'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export type ToastOptions = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type ToastItem = ToastOptions & { id: string };

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 2;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissOne = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const dismiss = useCallback(() => {
    setItems((prev) => {
      for (const item of prev) {
        const timer = timersRef.current.get(item.id);
        if (timer) {
          clearTimeout(timer);
          timersRef.current.delete(item.id);
        }
      }
      return [];
    });
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = { ...options, id };
      setItems((prev) => {
        const next = [...prev, item].slice(-MAX_VISIBLE);
        for (const dropped of prev.slice(0, Math.max(0, prev.length + 1 - MAX_VISIBLE))) {
          const timer = timersRef.current.get(dropped.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(dropped.id);
          }
        }
        return next;
      });
      const duration = options.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        const timer = setTimeout(() => dismissOne(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismissOne],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismissOne(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      role="status"
      aria-labelledby={titleId}
      aria-describedby={item.description ? descriptionId : undefined}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg',
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p id={titleId} className="text-sm font-medium">
          {item.title}
        </p>
        {item.description ? (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {item.actionLabel && item.onAction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              item.onAction?.();
              onDismiss();
            }}
          >
            {item.actionLabel}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" aria-label="Dismiss" onClick={onDismiss}>
          <span aria-hidden="true">×</span>
        </Button>
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Sheet({
  open,
  onClose,
  children,
  className,
  modal = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** When false, no dim overlay and body scroll stays unlocked so list shortcuts keep working. */
  modal?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    if (!modal) {
      return () => document.removeEventListener('keydown', onKeyDown);
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, modal]);

  if (!open) return null;

  return (
    <div className={cn('fixed inset-0 z-50 flex justify-end', !modal && 'pointer-events-none')}>
      {modal ? (
        <button
          type="button"
          aria-label="Close panel"
          className="absolute inset-0 bg-foreground/40 transition-opacity"
          onClick={onClose}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal={modal}
        className={cn(
          'relative z-10 flex h-full w-full flex-col overflow-hidden border-l border-border bg-card text-card-foreground shadow-2xl sm:max-w-md md:max-w-lg',
          !modal && 'pointer-events-auto',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

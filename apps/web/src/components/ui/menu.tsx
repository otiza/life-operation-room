'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/utils';

export type MenuItem = {
  id: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

/**
 * Lightweight dropdown menu (no Radix).
 * Pass label/icon content as `trigger` — avoid nesting another <button>.
 * Or pass a ready-made control via `trigger` string/node and style with className on items.
 */
export function Menu({
  trigger,
  items,
  children,
  align = 'start',
  side = 'bottom',
  className,
  triggerClassName,
  panelClassName,
  triggerAriaLabel,
  'aria-label': ariaLabel = 'Menu',
}: {
  trigger: ReactNode;
  items?: MenuItem[];
  /** Custom panel content; if provided, items are ignored */
  children?: ReactNode;
  align?: 'start' | 'end' | 'stretch';
  /** Open below the trigger (default) or above it, e.g. at the bottom of the sidebar. */
  side?: 'bottom' | 'top';
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  /** Accessible name for the trigger when its visible content is not enough. */
  triggerAriaLabel?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onDocumentKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [open]);

  function firstEnabledIndex() {
    if (!items?.length) return 0;
    const index = items.findIndex((item) => !item.disabled);
    return index >= 0 ? index : 0;
  }

  function openMenu() {
    const index = firstEnabledIndex();
    setActiveIndex(index);
    setOpen(true);
    queueMicrotask(() => itemRefs.current[index]?.focus());
  }

  function closeAndReturnFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveActive(delta: number) {
    if (!items?.length) return;
    let next = activeIndex;
    for (let step = 0; step < items.length; step += 1) {
      next = (next + delta + items.length) % items.length;
      if (!items[next]?.disabled) break;
    }
    setActiveIndex(next);
    itemRefs.current[next]?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!items?.length) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAndReturnFocus();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const first = items.findIndex((item) => !item.disabled);
      if (first >= 0) {
        setActiveIndex(first);
        itemRefs.current[first]?.focus();
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      for (let index = items.length - 1; index >= 0; index -= 1) {
        if (!items[index]?.disabled) {
          setActiveIndex(index);
          itemRefs.current[index]?.focus();
          break;
        }
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) {
        item.onSelect?.();
        closeAndReturnFocus();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndReturnFocus();
    }
  }

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-label={triggerAriaLabel}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
          triggerClassName,
        )}
        onClick={() => {
          if (open) closeAndReturnFocus();
          else openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          tabIndex={-1}
          className={cn(
            'absolute z-50 min-w-[10rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay outline-none',
            side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
            align === 'end' ? 'right-0' : align === 'stretch' ? 'inset-x-0' : 'left-0',
            panelClassName,
          )}
          onKeyDown={onMenuKeyDown}
          onClick={(event) => {
            // Custom panel content: picking any menu item (link or button) closes the menu.
            if (children && (event.target as Element).closest('[role="menuitem"]')) setOpen(false);
          }}
        >
          {children
            ? children
            : items?.map((item, index) => (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  tabIndex={activeIndex === index ? 0 : -1}
                  className={cn(
                    'flex w-full cursor-pointer items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none transition-colors',
                    'focus-visible:bg-accent focus-visible:text-accent-foreground',
                    'hover:bg-accent hover:text-accent-foreground',
                    'disabled:pointer-events-none disabled:opacity-50',
                    item.destructive && 'text-destructive focus-visible:text-destructive hover:text-destructive',
                  )}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onSelect?.();
                    closeAndReturnFocus();
                  }}
                  onMouseEnter={() => {
                    if (!item.disabled) setActiveIndex(index);
                  }}
                >
                  {item.label}
                </button>
              ))}
        </div>
      ) : null}
    </div>
  );
}

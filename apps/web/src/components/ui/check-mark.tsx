import { Check } from './icons';
import { cn } from '../../lib/utils';

/*
  The one "done" mark of Life Room: task rows, Home, Review.
  Its shape comes from the theme (`rounded-check` → --check-radius; Paper = circle), so a theme can turn
  every checkbox square or diamond in one place. Skins swap the glyph later (THEMES-PLAN PR 7).
*/

export interface CheckMarkOptions {
  checked?: boolean;
  /**
   * How an open mark reacts to the pointer:
   * - `subtle`: its own border darkens on hover (a toggle in a list row).
   * - `group-primary`: border and tick turn primary when the parent `.group` is hovered (a "mark done" action).
   * - `none`: static (a record of something already done).
   */
  hover?: 'subtle' | 'group-primary' | 'none';
  /** Tick glyph size; `icon` draws the tick as an icon, on a borderless mark. */
  glyph?: 'xs' | 'tiny' | 'icon';
  className?: string;
}

/** Classes for an element that *is* the mark (e.g. the toggle button in a task row). */
export function checkMarkClassName({ checked = false, hover = 'none', glyph = 'xs', className }: CheckMarkOptions = {}) {
  return cn(
    'flex h-5 w-5 shrink-0 items-center justify-center rounded-check',
    glyph === 'tiny' && 'text-[10px]',
    glyph === 'xs' && 'text-xs',
    checked
      ? cn(glyph !== 'icon' && 'border border-success', 'bg-success text-success-foreground')
      : 'border border-border text-transparent',
    !checked && hover === 'subtle' && 'hover:border-foreground/40',
    !checked && hover === 'group-primary' && 'group-hover:border-primary group-hover:text-primary',
    className,
  );
}

/** A presentational mark (put it inside a button or link that carries the label). */
export function CheckMark(options: CheckMarkOptions) {
  return (
    <span className={checkMarkClassName(options)} aria-hidden>
      {options.glyph === 'icon' ? <Check className="h-3 w-3" aria-hidden /> : '✓'}
    </span>
  );
}

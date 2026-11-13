import { cn } from '../../lib/utils';

/**
 * Lists sit on the canvas, not in a box. Each row brings its own hairline divider
 * (`border-t` from the second row), a hover tint, and a 44px minimum height.
 * The negative margin lines row text up with the section heading while the
 * hover tint reaches past it.
 */
export const rowListClass = '-mx-3 sm:-mx-4';

export function RowList({
  as: Tag = 'ul',
  className,
  children,
  ...rest
}: {
  as?: 'ul' | 'ol' | 'div';
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag className={cn(rowListClass, className)} {...rest}>
      {children}
    </Tag>
  );
}

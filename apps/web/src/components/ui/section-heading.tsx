import Link from 'next/link';
import { cn } from '../../lib/utils';

/**
 * The one section heading: Literata title, optional meta (count, progress)
 * next to it, and an optional quiet link or control on the right.
 */
export function SectionHeading({
  title,
  id,
  meta,
  action,
  as: Tag = 'h2',
  className,
}: {
  title: React.ReactNode;
  id?: string;
  /** Small text or element after the title, such as a count. */
  meta?: React.ReactNode;
  /** A link ({ label, href }) or any element, aligned right. */
  action?: { label: string; href: string } | React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  const actionNode =
    action && typeof action === 'object' && 'href' in action && 'label' in action ? (
      <Link
        href={action.href}
        className="shrink-0 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {action.label}
      </Link>
    ) : (
      (action as React.ReactNode)
    );

  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <Tag id={id} className="text-section-title text-foreground">
          {title}
        </Tag>
        {meta ? <div className="text-meta tabular-nums text-muted-foreground">{meta}</div> : null}
      </div>
      {actionNode ?? null}
    </div>
  );
}

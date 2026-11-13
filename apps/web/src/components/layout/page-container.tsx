import Link from 'next/link';
import { cn } from '../../lib/utils';

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * Max width. `reading` (about 760px) is the default for lists and writing.
   * `full` is only for the calendar grid and the task board; `lg` for the marketplace and Manual.
   */
  size?: 'reading' | 'lg' | 'full';
};

const sizeClass = {
  reading: 'max-w-[47.5rem]',
  lg: 'max-w-6xl',
  full: 'max-w-none',
} as const;

/**
 * Standard page wrapper for shell + mini-app screens.
 * Mobile-first padding; grows comfortably on larger breakpoints.
 */
export function PageContainer({ children, className, size = 'reading' }: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6', sizeClass[size], className)}>
      {children}
    </div>
  );
}

export type PageBreadcrumbItem = {
  label: string;
  href?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** ReactNode trail, or array of {label, href?} */
  breadcrumb?: React.ReactNode | PageBreadcrumbItem[];
}) {
  const breadcrumbNode = Array.isArray(breadcrumb) ? (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumb.map((item, index) => {
          const isLast = index === breadcrumb.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true" className="text-border">/</span> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-foreground' : undefined} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  ) : breadcrumb ? (
    <div className="mb-2">{breadcrumb}</div>
  ) : null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumbNode}
        <h1 className="text-page-title text-foreground">{title}</h1>
        {description ? <p className="text-body mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

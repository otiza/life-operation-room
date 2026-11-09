import { cn } from '../../lib/utils';

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  /** max width token — default content width for shell pages */
  size?: 'md' | 'lg' | 'xl' | 'full';
};

const sizeClass = {
  md: 'max-w-3xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
} as const;

/**
 * Standard page wrapper for shell + mini-app screens.
 * Mobile-first padding; grows comfortably on larger breakpoints.
 */
export function PageContainer({ children, className, size = 'lg' }: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6', sizeClass[size], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

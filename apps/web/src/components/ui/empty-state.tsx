import { cn } from '../../lib/utils';
import { Button } from './button';

export function EmptyState({
  title,
  description,
  hint,
  primaryAction,
  secondaryAction,
  className,
}: {
  title: string;
  description?: string;
  /** Alias for description */
  hint?: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}) {
  const body = description ?? hint;

  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 sm:items-center sm:px-8 sm:text-center',
        className,
      )}
    >
      <div className="max-w-md space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      </div>
      {primaryAction || secondaryAction ? (
        <div className="flex flex-wrap items-center gap-2">
          {primaryAction ? (
            <Button type="button" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button type="button" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

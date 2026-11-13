'use client';

import type { CalendarMutationScope } from '@life-room/shared';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';

type ScopePromptProps = {
  open: boolean;
  title?: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (scope: CalendarMutationScope) => void;
};

export function ScopePrompt({ open, title = 'Apply to', onOpenChange, onSelect }: ScopePromptProps) {
  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      <div className="space-y-3 p-4">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">This event is part of a series.</p>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onSelect('this');
              onOpenChange(false);
            }}
          >
            This occurrence
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onSelect('following');
              onOpenChange(false);
            }}
          >
            This and following
          </Button>
          <Button
            onClick={() => {
              onSelect('all');
              onOpenChange(false);
            }}
          >
            All occurrences
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

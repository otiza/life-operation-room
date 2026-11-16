import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('treats surface roles as backgrounds', () => {
    expect(cn('surface-card p-4', 'bg-muted')).toBe('p-4 bg-muted');
    expect(cn('bg-muted', 'surface-floating')).toBe('surface-floating');
  });

  it('treats rounded-check as a radius', () => {
    expect(cn('rounded-full', 'rounded-check')).toBe('rounded-check');
  });
});

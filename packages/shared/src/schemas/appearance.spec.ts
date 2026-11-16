import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, parseAppearance, updateAppearanceSchema } from './appearance.js';

describe('parseAppearance', () => {
  it('fills missing fields from the default', () => {
    expect(parseAppearance({ theme: 'dot' })).toEqual({ theme: 'dot', strength: null, focus: false });
  });

  it('falls back to the default for unknown themes or broken values', () => {
    expect(parseAppearance({ theme: 'retired-theme' })).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance({ strength: 5 })).toEqual(DEFAULT_APPEARANCE);
  });
});

describe('updateAppearanceSchema', () => {
  it('accepts partial changes and rejects unknown keys', () => {
    expect(updateAppearanceSchema.parse({ focus: true })).toEqual({ focus: true });
    expect(() => updateAppearanceSchema.parse({ layout: 'grid' })).toThrow();
  });
});

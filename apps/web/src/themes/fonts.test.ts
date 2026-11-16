import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONTS } from './fonts';
import { THEMES } from './registry';

const layout = readFileSync(join(__dirname, '../app/layout.tsx'), 'utf8');

describe('theme fonts', () => {
  it.each(Object.values(FONTS))('$name is loaded by next/font as $variable', ({ variable }) => {
    expect(layout).toContain(`variable: '${variable}'`);
  });

  it('every family a theme uses is in the font catalogue', () => {
    const known = new Set<string>(Object.values(FONTS).map((font) => font.name));
    for (const theme of THEMES) {
      for (const style of Object.values(theme.typography)) expect(known, `${theme.id}: ${style.fontFamily}`).toContain(style.fontFamily);
    }
  });
});

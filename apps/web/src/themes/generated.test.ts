import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateDesignMd, generateThemesCss } from './generate';
import { THEMES } from './registry';

/*
  The generated files must match the registry.
  To regenerate after changing a theme: pnpm --filter web themes:build  (sets UPDATE_THEMES=1).
*/

const update = process.env.UPDATE_THEMES === '1';
const cssPath = join(__dirname, '../app/themes.generated.css');
const docsDir = join(__dirname, '../../../../docs/themes');

const expectedDocs = new Map<string, string>(
  THEMES.flatMap((theme) =>
    (['light', 'dark'] as const).map((mode) => [`${theme.id}.${mode}.DESIGN.md`, generateDesignMd(theme, mode)] as const),
  ),
);

function check(path: string, expected: string) {
  if (update) {
    writeFileSync(path, expected);
    return;
  }
  expect(existsSync(path), `${path} is missing — run pnpm --filter web themes:build`).toBe(true);
  expect(readFileSync(path, 'utf8'), `${path} is stale — run pnpm --filter web themes:build`).toBe(expected);
}

describe('generated theme files', () => {
  it('themes.generated.css matches the registry', () => {
    check(cssPath, generateThemesCss(THEMES));
  });

  it('docs/themes has one DESIGN.md per theme and mode, all up to date', () => {
    if (update) mkdirSync(docsDir, { recursive: true });
    for (const [file, content] of expectedDocs) check(join(docsDir, file), content);
    const extra = readdirSync(docsDir).filter((file) => file.endsWith('.DESIGN.md') && !expectedDocs.has(file));
    expect(extra, 'DESIGN.md files for themes that no longer exist').toEqual([]);
  });
});

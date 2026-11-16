import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
  Themes can only restyle what goes through tokens. UI code must not hard-code colours,
  font families or shadows (docs/DESIGN.md → Themes). Use semantic tokens, the text utilities,
  the surface roles and the shadow scale instead.
*/

const SRC = join(__dirname, '..');

const RULES: { name: string; pattern: RegExp }[] = [
  { name: 'hex colour', pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'colour function', pattern: /\b(?:oklch|rgba?|hsla?)\(/ },
  { name: 'font family', pattern: /fontFamily|\bfont-\[/ },
  { name: 'arbitrary shadow', pattern: /\bshadow-\[/ },
];

/** User-editable data, not UI chrome: default colours offered for new task statuses and priorities. */
const ALLOWED: { file: string; line: RegExp }[] = [
  { file: 'app/w/[workspaceId]/tasks/settings/page.tsx', line: /^\s*color: '#[0-9a-f]{6}',$/ },
  { file: 'app/w/[workspaceId]/tasks/settings/page.tsx', line: /^\s*return '#[0-9a-f]{6}';$/ },
];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('UI code uses tokens, not literals', () => {
  it.each(RULES)('no $name in .tsx files', ({ pattern }) => {
    const offenders: string[] = [];
    for (const path of tsxFiles(SRC)) {
      const file = relative(SRC, path);
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!pattern.test(line)) return;
          if (ALLOWED.some((allowed) => allowed.file === file && allowed.line.test(line))) return;
          offenders.push(`${file}:${index + 1}  ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Enforces the mini-app boundary rules from docs/ARCHITECTURE.md §4.3 / §4.5:
 * - An app may import another app's code only through its ports (`*-references.*`, `*-commands.*`).
 * - An app may import only its own tables from db/schema (plus shell tables).
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Mini-app directory → tables that app owns in db/schema.ts. */
const APP_TABLES: Record<string, string[]> = {
  projects: ['projects'],
  tasks: ['tasks'],
  calendar: ['calendarEvents', 'calendarEventExceptions', 'calendarFeedTokens'],
  notes: ['notes'],
};
const APPS = Object.keys(APP_TABLES);
const ALL_APP_TABLES = new Set(Object.values(APP_TABLES).flat());
const PORT_FILE = /^(?:[\w-]+-references|[\w-]+-commands)\.(?:service|module)\.js$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return name.endsWith('.ts') && !/\.(spec|e2e-spec)\.ts$/.test(name) ? [full] : [];
  });
}

type ImportStmt = { names: string[]; specifier: string };

function imports(source: string): ImportStmt[] {
  const result: ImportStmt[] = [];
  const re = /import\s+(type\s+)?([\s\S]*?)\s+from\s+'([^']+)'/g;
  for (const match of source.matchAll(re)) {
    if (match[1]) continue; // type-only imports carry no runtime coupling
    const clause = match[2] ?? '';
    const braces = clause.match(/\{([\s\S]*)\}/);
    const names = braces
      ? braces[1]!
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part && !part.startsWith('type '))
          .map((part) => part.split(/\s+as\s+/)[0]!.trim())
      : [];
    result.push({ names, specifier: match[3]! });
  }
  return result;
}

const violations: string[] = [];
for (const app of APPS) {
  for (const file of walk(join(SRC, app))) {
    const rel = relative(SRC, file);
    for (const { names, specifier } of imports(readFileSync(file, 'utf8'))) {
      const other = specifier.match(/^\.\.\/([\w-]+)\/([^/]+)$/);
      if (other && APPS.includes(other[1]!) && other[1] !== app && !PORT_FILE.test(other[2]!)) {
        violations.push(`${rel}: imports ${specifier} (use that app's *-references / *-commands port)`);
      }
      if (/(^|\/)db\/schema\.js$/.test(specifier)) {
        for (const name of names) {
          if (ALL_APP_TABLES.has(name) && !APP_TABLES[app]!.includes(name)) {
            violations.push(`${rel}: imports table ${name} owned by another app`);
          }
        }
      }
    }
  }
}

describe('mini-app boundaries', () => {
  it('apps only reach other apps through ports and own only their tables', () => {
    expect(violations).toEqual([]);
  });

  it('detects the apps it is meant to guard', () => {
    for (const app of APPS) expect(walk(join(SRC, app)).length).toBeGreaterThan(0);
  });
});

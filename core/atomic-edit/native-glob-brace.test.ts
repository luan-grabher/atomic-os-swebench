import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { nativeGlob, nativeGrep } from './native-bridge.js';
import { matchesGlob } from './server-helpers-glob.js';

// Regression: brace expansion `{a,b}` in atomic_glob (`pattern`) and atomic_grep
// (`glob`). Before the fix, `globToRe` escaped `{`/`}` into the literals `\{`/`\}`
// with no expansion step, so a brace pattern silently matched 0 files.

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-brace-'));
  fs.writeFileSync(path.join(dir, 'a.ts'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(dir, 'b.tsx'), 'export const b = 2;\n');
  fs.writeFileSync(path.join(dir, 'c.js'), 'export const c = 3;\n');
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('nativeGlob brace expansion', () => {
  it('baseline (no brace) matches', async () => {
    expect((await nativeGlob({ pattern: '**/*.ts', path: dir })).totalMatches).toBe(1);
  });

  it('expands a multi-option brace {ts,tsx}', async () => {
    expect((await nativeGlob({ pattern: '**/*.{ts,tsx}', path: dir })).totalMatches).toBe(2);
  });

  it('expands a single-option brace {ts}', async () => {
    expect((await nativeGlob({ pattern: '**/*.{ts}', path: dir })).totalMatches).toBe(1);
  });

  it('a non-matching brace still yields 0', async () => {
    expect((await nativeGlob({ pattern: '**/*.{md,json}', path: dir })).totalMatches).toBe(0);
  });
});

describe('nativeGrep glob brace expansion', () => {
  it('searches files matched by a brace glob', async () => {
    const res = await nativeGrep({ pattern: 'export', path: dir, glob: '**/*.{ts,tsx}' });
    expect(res.filesSearched).toBe(2);
    expect(res.totalMatches).toBe(2);
  });
});

describe('matchesGlob brace expansion (parallel copy)', () => {
  it('matches both brace options', () => {
    expect(matchesGlob('**/*.{ts,tsx}', 'src/a.ts')).toBe(true);
    expect(matchesGlob('**/*.{ts,tsx}', 'src/b.tsx')).toBe(true);
    expect(matchesGlob('**/*.{ts,tsx}', 'src/c.js')).toBe(false);
  });

  it('matches a single-option brace', () => {
    expect(matchesGlob('*.{ts}', 'a.ts')).toBe(true);
  });
});

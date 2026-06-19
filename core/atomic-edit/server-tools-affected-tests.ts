/**
 * server-tools-affected-tests.ts — #9 intelligent test discovery.
 *
 * After editing N files, Atomic knows exactly which modules + exported symbols
 * changed. This maps that to the test files that EXERCISE them (by import path or
 * by symbol reference), so a session can run only the relevant tests instead of
 * `npm test` and hope. Read-only analysis — never writes, never runs the tests.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveSafeTarget } from './guard.js';
import { ok, fail } from './server-helpers-result.js';

const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.git', '.atomic', 'coverage', '.vitest', 'build',
  'out', '.next', 'dist-lkg', 'dist.broken-last', '.cache', 'node-compile-cache',
]);

function isTestFile(rel: string): boolean {
  const b = rel.split('/').pop() ?? rel;
  if (/(?:\.|^)(?:test|spec)\.[mc]?[jt]sx?$/.test(b)) return true;
  if (/^test_.+\.py$/.test(b) || /_test\.py$/.test(b)) return true;
  if ((rel.includes('/__tests__/') || rel.includes('/tests/')) && /\.[mc]?[jt]sx?$|\.py$/.test(b)) return true;
  return false;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Exported symbol names declared in a source file (TS/JS heuristic). */
export function exportedSymbols(content: string): string[] {
  const syms = new Set<string>();
  const decl = /export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(content)) !== null) syms.add(m[1]);
  const named = /export\s*(?:type\s*)?\{([^}]*)\}/g;
  while ((m = named.exec(content)) !== null) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) syms.add(name);
    }
  }
  return [...syms];
}

function moduleName(rel: string): string {
  return (rel.split('/').pop() ?? rel).replace(/\.[^.]+$/, '');
}

function walkFiles(root: string, cap = 20000): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0 && out.length < cap) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.name.startsWith('.atomic')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

export interface AffectedTest {
  test: string;
  reasons: string[];
}

/**
 * Find test files that exercise the changed files — by importing their module
 * path OR referencing one of their exported symbols. Pure over (root, changed).
 */
export function findAffectedTests(
  root: string,
  changedFiles: string[],
  extraSymbols: string[] = [],
): AffectedTest[] {
  const modules = new Set<string>();
  const symbols = new Set<string>(extraSymbols.filter((s) => s.length >= 3));
  for (const cf of changedFiles) {
    modules.add(moduleName(cf));
    try {
      const content = fs.readFileSync(path.join(root, cf), 'utf8');
      for (const s of exportedSymbols(content)) if (s.length >= 3) symbols.add(s);
    } catch { /* deleted/renamed changed file — module-name match still applies */ }
  }
  const changedSet = new Set(changedFiles.map((c) => c.replaceAll('\\', '/')));
  const moduleRes = [...modules].map((mn) => ({
    mn,
    re: new RegExp(`(?:from|require\\(|import)\\s*['"][^'"]*\\b${escapeRe(mn)}(?:\\.[A-Za-z]+)?['"]`),
  }));
  const symbolRes = [...symbols].map((s) => ({ s, re: new RegExp(`\\b${escapeRe(s)}\\b`) }));

  const results: AffectedTest[] = [];
  for (const abs of walkFiles(root)) {
    const rel = path.relative(root, abs).replaceAll('\\', '/');
    if (!isTestFile(rel) || changedSet.has(rel)) continue;
    let content: string;
    try { content = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    const reasons: string[] = [];
    for (const { mn, re } of moduleRes) {
      if (re.test(content)) { reasons.push(`imports module '${mn}'`); break; }
    }
    for (const { s, re } of symbolRes) {
      if (reasons.length >= 5) break;
      if (re.test(content)) reasons.push(`references symbol '${s}'`);
    }
    if (reasons.length > 0) results.push({ test: rel, reasons: [...new Set(reasons)] });
  }
  return results.sort((a, b) => a.test.localeCompare(b.test));
}

export function registerToolsAffectedTests(server: McpServer): void {
  server.registerTool(
    'atomic_affected_tests',
    {
      title: 'Discover the tests that exercise the changed files (read-only)',
      description:
        'Given the files you just edited (changedFiles), returns the test files that EXERCISE them — by ' +
        'importing their module path or referencing one of their exported symbols. The competitive edge over ' +
        '`npm test and hope`: run only the relevant tests. Read-only — never writes, never runs tests. Pass the ' +
        'list to your test runner (which atomic_exec now admits for local dev tools).',
      inputSchema: {
        changedFiles: z
          .array(z.string())
          .min(1)
          .describe('repo-relative paths of the files that changed'),
        symbols: z
          .array(z.string())
          .optional()
          .describe('extra symbol names to match (in addition to the changed files’ exported symbols)'),
      },
    },
    async (a) => {
      try {
        const { absPath, relPath } = resolveSafeTarget(a.changedFiles[0]);
        const root = absPath.slice(0, absPath.length - relPath.length).replace(/\/$/, '');
        const affected = findAffectedTests(root, a.changedFiles, a.symbols ?? []);
        return ok({
          changedFiles: a.changedFiles,
          affectedTestCount: affected.length,
          affectedTests: affected,
          note:
            affected.length === 0
              ? 'no test references found — the change may be untested, or tests reference it indirectly'
              : `run only these ${affected.length} test file(s) instead of the whole suite`,
        });
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
    },
  );
}

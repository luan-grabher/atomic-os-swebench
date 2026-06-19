import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  shellPath,
  nearestPackageRelPath,
} from './server-helpers-io.js';

export function runPostEditVerify(
  relPath: string,
  absPath: string,
  repoRoot: string,
  verify: string,
): { kind: string; command: string; passed: boolean; summary: string } | null {
  const pkg = nearestPackageRelPath(repoRoot, relPath);
  if (!pkg) return null;
  if (verify === 'typecheck') {
    // A bare `tsc --noEmit` in a directory without a tsconfig.json prints the
    // CLI help and exits non-zero — a false negative. Find the nearest
    // tsconfig.json from the file's dir up to repoRoot and pass it with -p;
    // skip honestly (n/a) when no project config exists.
    let tsconfig: string | null = null;
    let dir = path.dirname(absPath);
    const stop = path.resolve(repoRoot);
    for (;;) {
      const candidate = path.join(dir, 'tsconfig.json');
      if (fs.existsSync(candidate)) {
        tsconfig = candidate;
        break;
      }
      if (path.resolve(dir) === stop) break;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (!tsconfig) {
      return {
        kind: 'typecheck',
        command: 'typecheck',
        passed: true,
        summary: `skipped: no tsconfig.json from ${pkg} up to repo root (typecheck n/a here)`,
      };
    }
    const rel = path.relative(repoRoot, tsconfig) || tsconfig;
    // #1 — argv-array spawnSync (shell: false) instead of execSync(string): the
    // tsconfig path is interpolated, so a string-shell command was a shell-injection
    // surface via a crafted path. No shell => no injection. status===0 is the pass
    // signal (no throw-on-nonzero), so a real tsc error reports its diagnostics.
    const r = childProcess.spawnSync('npx', ['tsc', '--noEmit', '-p', tsconfig], {
      cwd: path.dirname(tsconfig),
      timeout: 60000,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: false,
    });
    if (r.error) {
      return { kind: 'typecheck', command: `tsc --noEmit -p ${rel}`, passed: false, summary: `typecheck could not run: ${r.error.message}`.slice(0, 500) };
    }
    if (r.status === 0) {
      return { kind: 'typecheck', command: `tsc --noEmit -p ${rel}`, passed: true, summary: 'TypeScript typecheck passed' };
    }
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.toString();
    return { kind: 'typecheck', command: `tsc --noEmit -p ${rel}`, passed: false, summary: out.slice(0, 500) };
  }

  if (verify === 'lint') {
    // #1 — argv-array spawnSync (shell: false): absPath was interpolated into a shell
    // string (injection surface). eslint --format json prints JSON to stdout even when
    // it exits non-zero on lint errors, so we parse stdout regardless of status — which
    // also fixes the prior bug where real lint errors reported "execution failed".
    const r = childProcess.spawnSync('npx', ['eslint', absPath, '--format', 'json'], {
      timeout: 30000,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: false,
    });
    if (r.error) {
      return { kind: 'lint', command: `eslint ${relPath}`, passed: false, summary: `ESLint could not run: ${r.error.message}`.slice(0, 300) };
    }
    try {
      type EslintFileResult = { errorCount: number; warningCount: number };
      const issues = JSON.parse((r.stdout ?? '').toString()) as EslintFileResult[];
      const errorCount = issues.reduce((sum: number, f: EslintFileResult) => sum + f.errorCount, 0);
      const warningCount = issues.reduce((sum: number, f: EslintFileResult) => sum + f.warningCount, 0);
      return {
        kind: 'lint',
        command: `eslint ${relPath}`,
        passed: errorCount === 0,
        summary: `${errorCount} errors, ${warningCount} warnings`,
      };
    } catch {
      return { kind: 'lint', command: `eslint ${relPath}`, passed: false, summary: 'ESLint produced no parseable JSON output' };
    }
  }

  return null;
}

export function packageVerificationPlan(
  repoRoot: string,
  cwdRelPath: string,
  allowedPaths: string[],
): { packageRelPath: string; commands: string[] } {
  const candidates = [...allowedPaths, cwdRelPath].filter(Boolean);
  const packageRelPath =
    candidates
      .map((candidate) => nearestPackageRelPath(repoRoot, candidate))
      .find((candidate): candidate is string => Boolean(candidate)) ?? '.';
  const prefix = packageRelPath !== '.' ? `npm --prefix ${shellPath(packageRelPath)}` : 'npm';
  return {
    packageRelPath,
    commands: [
      `${prefix} run lint:check`,
      `${prefix} run typecheck`,
      `${prefix} test`,
      `${prefix} run build`,
    ],
  };
}

export function unusedSymbolFromLintMessage(message?: string): string | undefined {
  return message?.match(
    /'([^']+)' is (?:assigned a value but never used|defined but never used)/,
  )?.[1];
}


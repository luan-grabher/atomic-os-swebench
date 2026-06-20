import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

let selfExpansionAdmissionDepth = 0;

export function withSelfExpansionAdmission<T>(fn: () => T): T {
  selfExpansionAdmissionDepth += 1;
  try {
    return fn();
  } finally {
    selfExpansionAdmissionDepth -= 1;
  }
}

function normalizeRel(rel: string): string {
  return rel.split(path.sep).join('/').replace(/^\.\//, '');
}

function isEphemeralAtomicFixture(rel: string): boolean {
  const base = path.basename(rel);
  return (
    base.startsWith('.smoke-') ||
    base.startsWith('.audit-') ||
    base.startsWith('.atomic-edit.') ||
    rel.includes('/.smoke-') ||
    rel.includes('/.audit-') ||
    rel.includes('/.positive-byte-sessions/') ||
    rel.includes('/dist/')
  );
}

/**
 * Detect the atomic-edit source tree itself — the directory holding the
 * running server's `package.json` (name "atomic-edit-mcp"). This is the
 * canonical "self": the atomic-edit code, independent of which workspace
 * the MCP is currently operating on (REPO_ROOT).
 *
 * Closing the self-application gap: an atomic-edit MCP must be able to
 * edit its own source through atomic_expand_self, not just the historical
 * `{repoRoot}/scripts/mcp/atomic-edit/**` layout. Real deployments live at
 * varying paths (here: atomic-os-swebench/core/atomic-edit). Detecting the
 * source root by walking up from this compiled module is location-
 * independent: works under tsx (source) and node (dist).
 *
 * Memoized on first call. Returns null only if the package.json chain is
 * broken — in which case self-expansion falls back to the legacy path-only
 * admission (no regression).
 */
let cachedSelfSourceRoot: string | null | undefined;
function atomicEditSourceRoot(): string | null {
  if (cachedSelfSourceRoot !== undefined) return cachedSelfSourceRoot;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const pj = path.join(dir, 'package.json');
    try {
      if (fs.existsSync(pj)) {
        const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
        // Identity-by-marker, NOT by a drifting package name. The published
        // binary name `atomic-edit-mcp` (the `bin` key) is the stable identity
        // of the atomic-edit source package and survives package renames (the
        // repo-unification renamed `name` to "atomic-os", which silently broke
        // the old name-only check and disabled self-expansion entirely). We
        // still accept the historical/explicit names as a belt-and-suspenders.
        const isAtomicEditPackage =
          (j && (j.name === 'atomic-edit-mcp' || j.name === 'atomic-os')) ||
          (j && j.bin && typeof j.bin === 'object' && Boolean(j.bin['atomic-edit-mcp']));
        if (isAtomicEditPackage) {
          cachedSelfSourceRoot = dir;
          return dir;
        }
      }
    } catch {
      // malformed package.json — keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  cachedSelfSourceRoot = null;
  return null;
}

/**
 * Legacy / canonical admission: paths under {repoRoot}/scripts/mcp/atomic-edit/.
 * Still accepted so existing harnesses and tests that mirror the original
 * layout continue to work unchanged.
 */
function admitsUnderLegacyScriptsPath(repoRoot: string, absPath: string): boolean {
  const rel = normalizeRel(path.relative(repoRoot, absPath));
  return rel.startsWith('scripts/mcp/atomic-edit/') && !isEphemeralAtomicFixture(rel);
}

/**
 * Self-application admission: paths under the atomic-edit source tree itself
 * (the running server's package root). Admission is symmetric to the legacy
 * path — same ephemeral-fixture exclusion, same write firewall — just rooted
 * at the real source location. This is what lets the MCP modify its own code
 * from any deployment path.
 */
function admitsUnderSelfSourceRoot(absPath: string): boolean {
  const selfRoot = atomicEditSourceRoot();
  if (!selfRoot) return false;
  const rel = normalizeRel(path.relative(selfRoot, absPath));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false;
  return !isEphemeralAtomicFixture(rel);
}

export function isAtomicSelfExpansionPath(repoRoot: string, absPath: string): boolean {
  return admitsUnderLegacyScriptsPath(repoRoot, absPath) || admitsUnderSelfSourceRoot(absPath);
}

export function atomicSelfSourceRoot(): string | null {
  return atomicEditSourceRoot();
}

export function assertSelfExpansionAdmission(repoRoot: string, absPath: string, nextContent: string): void {
  if (!isAtomicSelfExpansionPath(repoRoot, absPath)) return;
  let before: string | null = null;
  try {
    before = fs.existsSync(absPath) && fs.statSync(absPath).isFile() ? fs.readFileSync(absPath, 'utf8') : null;
  } catch {
    before = null;
  }
  if (before === nextContent) return;
  if (selfExpansionAdmissionDepth > 0) return;
  const rel = normalizeRel(path.relative(repoRoot, absPath));
  throw new Error(
    `refused (self-expansion admission): ${rel} is part of atomic-edit itself. ` +
      `Expanding the atomic MCP is allowed only through atomic_expand_self, which wraps the write in ` +
      `self-expansion admission and requires proof commands before the expansion can stand. ` +
      `Use atomic_expand_self to execute the closed loop: atomic executes the computation, or atomic first ` +
      `implements the missing computation inside atomic under proof.`,
  );
}


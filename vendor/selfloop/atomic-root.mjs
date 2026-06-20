/**
 * atomic-root.mjs — single source of truth for WHERE the atomic substrate lives.
 *
 * WAVE K convergence: the selfloop (P0-P8) and coglang substrate used to assume a
 * kloel-style nested layout (`<repoRoot>/scripts/mcp/atomic-edit/...`) and imported the
 * hypothesis-generator from a `vendor/mcp/atomic-edit/` sibling that does NOT exist in
 * this unified package. Both now resolve to ONE canonical atomic-edit:
 *
 *   /Users/danielpenin/atomic-os-swebench/core/atomic-edit   (flat layout)
 *
 * Override with the env var ATOMIC_EDIT_REPO_ROOT (already honored by every entrypoint).
 *
 * HONEST SCOPE: this only wires the emergent loop to one atomic substrate. It makes no
 * claim about cognition or AGI — the "emergence" here is the measured weak-emergence
 * selfloop, nothing stronger.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // vendor/selfloop

// Canonical flat atomic-edit inside this package: vendor/selfloop -> vendor -> pkg -> core/atomic-edit
const CANONICAL_ATOMIC_EDIT = path.resolve(HERE, '..', '..', 'core', 'atomic-edit');

/**
 * Resolve the atomic-edit substrate root.
 * Priority: explicit arg > ATOMIC_EDIT_REPO_ROOT env > canonical package atomic-edit.
 * Never silently falls back to process.cwd() — the whole point of convergence is ONE place.
 */
export function resolveAtomicRoot(explicit) {
  return explicit || process.env.ATOMIC_EDIT_REPO_ROOT || CANONICAL_ATOMIC_EDIT;
}

/**
 * Resolve the gates directory under a given root, layout-agnostic.
 * Supports both the flat package layout (`<root>/gates`) and the legacy kloel-nested
 * layout (`<root>/scripts/mcp/atomic-edit/gates`). Returns the first that exists; if
 * neither exists yet, returns the flat path (the package's actual shape).
 */
export function resolveGatesDir(root) {
  const flat = path.join(root, 'gates');
  const nested = path.join(root, 'scripts', 'mcp', 'atomic-edit', 'gates');
  try { if (fs.existsSync(flat)) return flat; } catch { /* ignore */ }
  try { if (fs.existsSync(nested)) return nested; } catch { /* ignore */ }
  return flat;
}

/**
 * Path to a gate file RELATIVE to the git repo root, for `git log` ctime lookups.
 * Mirrors resolveGatesDir's layout detection but returns a repo-relative string.
 */
export function gateRelPath(root, file) {
  const flat = path.join(root, 'gates');
  try { if (fs.existsSync(flat)) return path.join('gates', file); } catch { /* ignore */ }
  return path.join('scripts', 'mcp', 'atomic-edit', 'gates', file);
}

export { CANONICAL_ATOMIC_EDIT };

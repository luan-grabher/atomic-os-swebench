/**
 * engine-undo.ts — Per-operation undo/redo via chain-hash walker.
 *
 * The AtomicEditTrace already forms a tamper-evident chain (chainHashOf).
 * This module walks the ledger backward/forward, restoring exact byte states
 * operation by operation. Zero new infrastructure — it reuses the existing
 * .atomic/traces/ JSON files.
 *
 * Undo: load all traces for a file, find the one matching current content,
 *       restore the BEFORE state, delete the trace (operation undone).
 * Redo: replay the NEXT trace in the chain from the current state.
 *
 * Verifiable: each step's chainHash is recomputed and must match.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { chainHashOf } from './trace.js';
import type { AtomicEditTrace } from './trace.js';
import { snapshotText, type EditSnapshot } from './engine-proof-reexec.js';

export interface UndoResult {
  undone: boolean;
  operationId: string;
  operator: string;
  file: string;
  restoredChars: number;
}

export interface RedoResult {
  redone: boolean;
  operationId: string;
  operator: string;
  file: string;
}

function tracesDir(repoRoot: string): string {
  let d = path.join(repoRoot, '.atomic', 'traces');
  if (!fs.existsSync(d)) d = path.join(repoRoot, 'traces');
  return d;
}

function loadTrace(repoRoot: string, id: string): AtomicEditTrace | null {
  const dir = tracesDir(repoRoot);
  const p = path.join(dir, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function deleteTrace(repoRoot: string, id: string): void {
  const p = path.join(tracesDir(repoRoot), `${id}.json`);
  try { fs.unlinkSync(p); } catch {}
}

/**
 * Load the before/after content snapshot a trace points at. Current traces carry a
 * repo-relative `snapshotPath` (.atomic/snapshots/<op>.snap.json) rather than inline
 * content; the EditSnapshot there is content-addressed (beforeSha256/afterSha256) and read
 * through `snapshotText()` (handles both legacy raw and gzip-base64 encodings). Returns null
 * for preview/legacy traces with no snapshot — undo/redo then degrades to "nothing to restore".
 */
function loadSnapshot(repoRoot: string, trace: AtomicEditTrace): EditSnapshot | null {
  if (!trace.snapshotPath) return null;
  const p = path.isAbsolute(trace.snapshotPath) ? trace.snapshotPath : path.join(repoRoot, trace.snapshotPath);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as EditSnapshot; } catch { return null; }
}

function snapshotSide(snap: EditSnapshot | null, side: 'before' | 'after'): string {
  if (!snap) return '';
  try { return snapshotText(snap, side); } catch { return ''; }
}

/**
 * Undo the last operation on a file. Finds the trace whose `afterSha256`
 * matches the file's current content, restores the `before` snapshot,
 * and removes the trace from the ledger.
 */
export function undoLast(repoRoot: string, file: string): UndoResult | null {
  const absPath = path.isAbsolute(file) ? file : path.join(repoRoot, file);
  if (!fs.existsSync(absPath)) return null;

  const currentContent = fs.readFileSync(absPath, 'utf8');
  const crypto = require('node:crypto');
  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');

  const dir = tracesDir(repoRoot);
  if (!fs.existsSync(dir)) return null;

  // Find the trace whose afterSha256 matches current content
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse();
  for (const f of files) {
    const trace = loadTrace(repoRoot, f.replace('.json', ''));
    if (!trace) continue;
    if (trace.afterSha256 !== currentHash) continue;

    const relPath = trace.file;
    const absTarget = path.isAbsolute(relPath) ? relPath : path.join(repoRoot, relPath);
    const snap = loadSnapshot(repoRoot, trace);
    const beforeContent = snapshotSide(snap, 'before');
    if (!beforeContent) continue;

    // Verify chain integrity
    const expectedHash = chainHashOf(trace.parentSha256, trace.afterSha256, trace.gateVerdict);
    if (expectedHash !== trace.chainHash) continue;

    // Restore before state
    fs.writeFileSync(absTarget, beforeContent, 'utf8');

    // Verify restoration against the snapshot's content-addressed before-hash
    const restoredHash = crypto.createHash('sha256').update(beforeContent).digest('hex');
    if (restoredHash !== (snap?.beforeSha256 ?? '')) {
      // Restoration failed — revert
      fs.writeFileSync(absTarget, currentContent, 'utf8');
      return null;
    }

    deleteTrace(repoRoot, trace.operationId);
    return {
      undone: true,
      operationId: trace.operationId,
      operator: trace.operator,
      file: relPath,
      restoredChars: beforeContent.length,
    };
  }

  return null;
}

/**
 * Redo: find the next trace in the chain whose beforeSha256 matches
 * the current content, apply the after state.
 */
export function redoNext(repoRoot: string, file: string): RedoResult | null {
  const absPath = path.isAbsolute(file) ? file : path.join(repoRoot, file);
  if (!fs.existsSync(absPath)) return null;

  const currentContent = fs.readFileSync(absPath, 'utf8');
  const crypto = require('node:crypto');
  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');

  const dir = tracesDir(repoRoot);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  for (const f of files) {
    const trace = loadTrace(repoRoot, f.replace('.json', ''));
    if (!trace) continue;
    const snap = loadSnapshot(repoRoot, trace);
    if (!snap || snap.beforeSha256 !== currentHash) continue;

    const relPath = trace.file;
    const absTarget = path.isAbsolute(relPath) ? relPath : path.join(repoRoot, relPath);
    const afterContent = snapshotSide(snap, 'after');
    if (!afterContent) continue;

    const expectedHash = chainHashOf(trace.parentSha256, trace.afterSha256, trace.gateVerdict);
    if (expectedHash !== trace.chainHash) continue;

    fs.writeFileSync(absTarget, afterContent, 'utf8');
    return {
      redone: true,
      operationId: trace.operationId,
      operator: trace.operator,
      file: relPath,
    };
  }

  return null;
}

/**
 * Generate a conventional commit message from an operation trace.
 */
export function commitMessageFromTrace(trace: AtomicEditTrace): string {
  const type = trace.operator.startsWith('atomic_rename') ? 'refactor' :
               trace.operator.includes('delete') || trace.operator.includes('remove') ? 'chore' :
               trace.operator.includes('create') ? 'feat' :
               'fix';
  const file = trace.file.split('/').pop() ?? trace.file;
  const expansion = trace.metrics?.expansionFactorAvoided ?? 1;
  const scope = expansion > 1 ? ` (${expansion}x sub-line)` : '';
  return `${type}: ${trace.operator.replace('atomic_', '')} ${file}${scope}`;
}

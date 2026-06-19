/**
 * emergence-feed.ts — LIVE emergence collection (PARADIGM PART D.6 wiring).
 *
 * Today the emergence observatory (O1–O5, evolution/emergence-observatory.mjs) only ever
 * sees the self-evolution harness's seed data — normal agent operations feed it NOTHING.
 * This module closes that gap: EVERY atomic write funnels through atomicWrite (the single
 * byte-floor chokepoint), which calls recordEmergenceEvent here, appending a tamper-evident,
 * hash-chained record to `.atomic/emergence-feed.jsonl`. The observatory then reads a REAL
 * corpus that grows with every operation by every agent — the bridge from "instrumented on
 * synthetic data" to "fed by real usage".
 *
 * FAIL-SAFE BY CONSTRUCTION: recordEmergenceEvent catches everything and NEVER throws into
 * the write path. A feed failure must never block or corrupt an edit. The feed is written
 * with direct fs.appendFileSync (NOT atomicWrite) so it can never recurse through the floor.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

export interface EmergenceEvent {
  v: 1;
  kind: 'edit' | 'wall-hit';
  ts: number;
  agent: string;
  op: string;
  file: string;
  diff?: string;
  invariantId?: string;
  locus?: { file: string; region?: string };
  previousSha: string | null;
  recordSha: string;
}

function feedPaths(repoRoot: string): { jsonl: string; head: string; dir: string } {
  const dir = path.join(repoRoot, '.atomic');
  return { jsonl: path.join(dir, 'emergence-feed.jsonl'), head: path.join(dir, 'emergence-feed.head'), dir };
}

/** Best-effort agent identity for O2 (agent-niche) — friction routing keys by this. */
function currentAgent(): string {
  const a =
    process.env.ATOMIC_AGENT ||
    process.env.ATOMIC_AGENT_ID ||
    process.env.ATOMIC_CLIENT ||
    process.env.CLAUDECODE && 'claude-code' ||
    'host';
  return String(a).slice(0, 64);
}

/** Bounded normalized diff: lines present in `after` but not in `before` (added/changed). For O1. */
export function diffSignature(before: string, after: string): string {
  const b = new Set(before.split('\n'));
  const changed: string[] = [];
  for (const line of after.split('\n')) {
    if (!b.has(line)) changed.push(line);
    if (changed.length >= 200) break;
  }
  return changed.join('\n').slice(0, 2000);
}

/** Skip feed noise: Atomic's own bookkeeping writes are not agent edits. */
function isFeedExempt(relPath: string): boolean {
  const p = relPath.replaceAll('\\', '/');
  return p.startsWith('.atomic/') || p.includes('/.atomic/') || p.endsWith('.tmp') || p.includes('/node_modules/') || p.startsWith('dist/') || p.includes('/dist/');
}

/**
 * Append a real, hash-chained emergence event. FAIL-SAFE: returns the recordSha on success
 * or null on ANY failure / exemption (never throws into the caller's write path).
 */
export function recordEmergenceEvent(input: {
  repoRoot: string;
  kind: 'edit' | 'wall-hit';
  op: string;
  file: string;
  before?: string;
  after?: string;
  invariantId?: string;
  locus?: { file: string; region?: string };
  ts?: number;
}): string | null {
  try {
    if (isFeedExempt(input.file)) return null;
    const { jsonl, head, dir } = feedPaths(input.repoRoot);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let prev: string | null = null;
    try {
      if (fs.existsSync(head)) prev = fs.readFileSync(head, 'utf8').trim() || null;
    } catch {
      prev = null;
    }
    const body: Record<string, unknown> = {
      v: 1,
      kind: input.kind,
      ts: input.ts ?? Date.now(),
      agent: currentAgent(),
      op: input.op,
      file: input.file,
    };
    if (input.kind === 'edit') body.diff = diffSignature(input.before ?? '', input.after ?? '');
    if (input.invariantId) body.invariantId = input.invariantId;
    if (input.locus) body.locus = input.locus;
    const recordSha = sha256(JSON.stringify({ event: body, previousSha: prev }));
    fs.appendFileSync(jsonl, JSON.stringify({ ...body, previousSha: prev, recordSha }) + '\n');
    fs.writeFileSync(head, recordSha + '\n');
    return recordSha;
  } catch {
    return null; // a feed failure must NEVER block or corrupt a write
  }
}

export function readEmergenceFeed(repoRoot: string): EmergenceEvent[] {
  try {
    const { jsonl } = feedPaths(repoRoot);
    if (!fs.existsSync(jsonl)) return [];
    return fs
      .readFileSync(jsonl, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as EmergenceEvent);
  } catch {
    return [];
  }
}

/** Verify the feed's hash chain is intact (tamper-evident, third-party recomputable). */
export function verifyFeedChain(
  records: EmergenceEvent[],
): { ok: boolean; error?: string; headSha: string | null; count: number } {
  let chain: string | null = null;
  for (const r of records) {
    const { previousSha, recordSha, ...body } = r;
    if ((previousSha ?? null) !== (chain ?? null)) return { ok: false, error: 'previousSha break', headSha: chain, count: records.length };
    if (sha256(JSON.stringify({ event: body, previousSha: chain })) !== recordSha) {
      return { ok: false, error: 'recordSha mismatch', headSha: chain, count: records.length };
    }
    chain = recordSha;
  }
  return { ok: true, headSha: chain, count: records.length };
}

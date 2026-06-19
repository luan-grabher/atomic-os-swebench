#!/usr/bin/env node
/**
 * origin.mjs — P1 of the honest self-improvement roadmap: AUTHORSHIP AUDITABILITY.
 *
 * The whole point of a self-improvement loop is being able to tell, honestly and verifiably,
 * what the SYSTEM authored by itself from what an AGENT (human/LLM) authored. Without that,
 * "the system improved itself" is unfalsifiable. This is the missing F2 instrumentation the
 * emergence-report flagged as "not yet instrumented".
 *
 * It records, per admitted candidate, WHO AUTHORED THE BYTES (not who submitted them):
 *   - 'agent:<name>'      — the content was written by a human/LLM agent
 *   - 'autonomous:<module>' — the content was synthesized by the system's own generator
 *                            (e.g. autonomous-evolution.mjs's synthesizeCouplingGate, which is
 *                            deterministic, corpus-derived, NO LLM in the loop)
 *
 * Append-only, hash-chained, recomputable. lookupOrigin defaults to 'agent:unknown' for any
 * candidate NOT recorded — the honest conservative default (assume agent unless proven self).
 * F2 (self-authored admission) = an admitted candidate whose origin starts with 'autonomous:'.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

export const ORIGIN_LEDGER_REL = '.atomic/candidate-origin.jsonl';
const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
const canonical = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
};

function readLedger(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

/** Record the authorship origin of one admitted candidate. Hash-chained, append-only. */
export function recordOrigin(repoRoot, { candidateId, origin, authoredBy, evidence }) {
  if (!candidateId || typeof candidateId !== 'string') throw new Error('origin: candidateId required');
  if (!/^(agent|autonomous):/.test(String(origin || ''))) throw new Error('origin must start with "agent:" or "autonomous:"');
  const file = path.join(repoRoot, ORIGIN_LEDGER_REL);
  const prior = readLedger(file);
  const previousRecordSha256 = prior.length ? prior[prior.length - 1].recordSha256 : null;
  const body = {
    kind: 'atomic-candidate-origin',
    schemaVersion: 1,
    candidateId,
    origin,
    authoredBy: authoredBy ?? null,
    evidence: evidence ?? null,
    previousRecordSha256,
  };
  const record = { ...body, recordSha256: sha256(canonical(body)) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

/** Origin of a candidate, or the honest conservative default 'agent:unknown' if unrecorded. */
export function lookupOrigin(repoRoot, candidateId) {
  const file = path.join(repoRoot, ORIGIN_LEDGER_REL);
  const recs = readLedger(file).filter((r) => r.candidateId === candidateId);
  return recs.length ? recs[recs.length - 1].origin : 'agent:unknown';
}

/** Re-derive the hash chain (tamper-evidence + third-party recomputability). */
export function verifyOriginLedger(repoRoot) {
  const file = path.join(repoRoot, ORIGIN_LEDGER_REL);
  if (!fs.existsSync(file)) return { ok: true, records: 0 };
  const recs = readLedger(file);
  let prev = null;
  for (const r of recs) {
    if ((r.previousRecordSha256 ?? null) !== (prev ?? null)) return { ok: false, error: 'previousRecordSha256 break', at: r.recordSha256 };
    const { recordSha256, ...body } = r;
    if (sha256(canonical(body)) !== recordSha256) return { ok: false, error: 'recordSha256 mismatch', at: recordSha256 };
    prev = recordSha256;
  }
  return { ok: true, records: recs.length, autonomous: recs.filter((r) => r.origin.startsWith('autonomous:')).length };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(verifyOriginLedger(repoRoot), null, 2));
}

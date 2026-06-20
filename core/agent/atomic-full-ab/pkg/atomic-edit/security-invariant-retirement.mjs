/**
 * security-invariant-retirement — audited garbage collection for the security
 * monotonicity ratchet.
 *
 * The ratchet (security-invariants.mjs) is one-way: counts only grow, behavior
 * fixture ids only accrue. That is correct against SILENT weakening, but it has
 * no honest path to remove an invariant that is provably DEAD (e.g. a deny rule
 * or fixture that protects a file which no longer exists). This module is that
 * path, designed so it can never become a silent weakening:
 *
 *   1. Every retirement is an append-only, hash-chained ledger record. A broken
 *      or tampered chain disables ALL exemptions and forces a refusal.
 *   2. Every retirement carries a MACHINE-VERIFIABLE nullity proof. Prose alone
 *      is never enough; the evidence is rechecked against the live repo on every
 *      run. An invalid proof disables ALL exemptions and forces a refusal.
 *   3. The monotonic quantity is redefined as (live + retired). Retiring one
 *      proven-null invariant keeps (live + retired) constant, so the accountable
 *      security surface never drops. Retirements accrue forever, like fixtures.
 *
 * Supported nullity kinds:
 *   - 'absent-path-target': the retired target references a repo path that does
 *     not exist anywhere under the repo root (it protects nothing).
 *   - 'duplicate-regex': an identical live regex source still exists in the same
 *     invariant file, so removing this one preserves coverage exactly.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stableValue(value[k])]));
}
function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

const MIN_PROOF_CHARS = 40;

/** Canonical hash of a record: every field EXCEPT recordSha256, stable-ordered. */
export function retirementRecordHash(record) {
  const { recordSha256, ...rest } = record;
  return sha256(stableJson(rest));
}

/** Build the next record for an append (chains onto the prior head). */
export function buildRetirementRecord(prevHead, fields) {
  const base = {
    seq: prevHead ? prevHead.seq + 1 : 1,
    kind: fields.kind,
    key: fields.key,
    target: fields.target,
    file: fields.file,
    nullityKind: fields.nullityKind,
    nullityProof: fields.nullityProof,
    evidence: fields.evidence ?? {},
    prevSha256: prevHead ? prevHead.recordSha256 : null,
  };
  return { ...base, recordSha256: retirementRecordHash(base) };
}

/**
 * Read + verify the append-only chain. Returns { records, chainOk, error }.
 * A single bad line invalidates the whole chain (fail-closed).
 */
export function readRetirements(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { records: [], chainOk: true, error: null };
  }
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const records = [];
  let prev = null;
  for (let i = 0; i < lines.length; i++) {
    let rec;
    try {
      rec = JSON.parse(lines[i]);
    } catch {
      return { records, chainOk: false, error: `line ${i + 1}: invalid JSON` };
    }
    const expectPrev = prev ? prev.recordSha256 : null;
    if ((rec.prevSha256 ?? null) !== expectPrev) {
      return { records, chainOk: false, error: `line ${i + 1}: broken chain (prevSha256 mismatch)` };
    }
    if (rec.recordSha256 !== retirementRecordHash(rec)) {
      return { records, chainOk: false, error: `line ${i + 1}: recordSha256 mismatch (tampered)` };
    }
    records.push(rec);
    prev = rec;
  }
  return { records, chainOk: true, error: null };
}

function countLiteralOccurrences(haystack, needle) {
  if (!needle) return 0;
  let n = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    n += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return n;
}

/**
 * Machine-recheck one retirement's nullity proof against the live repo.
 * ctx = { repoRoot, readInvariantSource(file) -> string }.
 */
export function verifyNullity(record, ctx) {
  if (typeof record.nullityProof !== 'string' || record.nullityProof.length < MIN_PROOF_CHARS) {
    return { ok: false, reason: `nullityProof missing or < ${MIN_PROOF_CHARS} chars` };
  }
  if (record.kind !== 'count' && record.kind !== 'fixture') {
    return { ok: false, reason: `unknown retirement kind: ${record.kind}` };
  }
  const ev = record.evidence ?? {};
  switch (record.nullityKind) {
    case 'absent-path-target': {
      if (typeof ev.path !== 'string' || !ev.path) return { ok: false, reason: 'evidence.path required' };
      if (typeof ev.referenceText !== 'string' || !ev.referenceText.includes(ev.path)) {
        return { ok: false, reason: 'evidence.referenceText must contain the absent path' };
      }
      const abs = path.join(ctx.repoRoot, ev.path);
      if (fs.existsSync(abs)) return { ok: false, reason: `evidence.path still exists: ${ev.path}` };
      return { ok: true, reason: 'target references a path absent from the repo' };
    }
    case 'duplicate-regex': {
      if (typeof ev.regexSource !== 'string' || !ev.regexSource) return { ok: false, reason: 'evidence.regexSource required' };
      const src = ctx.readInvariantSource(record.file || '');
      const occ = countLiteralOccurrences(src, ev.regexSource);
      if (occ < 1) return { ok: false, reason: 'no live duplicate preserves coverage of the retired regex' };
      return { ok: true, reason: 'a live duplicate regex preserves coverage' };
    }
    default:
      return { ok: false, reason: `unknown nullityKind: ${record.nullityKind}` };
  }
}

/**
 * Classify a validated chain into per-key exemptions. THROWS if the chain is
 * broken/tampered or any record fails its nullity recheck (fail-closed: a bad
 * ledger must never silently grant exemptions).
 */
export function classifyRetirements(file, ctx) {
  const { records, chainOk, error } = readRetirements(file);
  if (!chainOk) {
    throw new Error(`refused (retirement ledger): ${error}. A broken/tampered retirement chain disables all exemptions.`);
  }
  const countRetired = {};
  const fixtureRetired = {};
  const invalid = [];
  for (const rec of records) {
    const v = verifyNullity(rec, ctx);
    if (!v.ok) {
      invalid.push({ seq: rec.seq, key: rec.key, target: rec.target, reason: v.reason });
      continue;
    }
    if (rec.kind === 'count') {
      countRetired[rec.key] = (countRetired[rec.key] || 0) + 1;
    } else {
      (fixtureRetired[rec.key] = fixtureRetired[rec.key] || new Set()).add(rec.target);
    }
  }
  if (invalid.length) {
    const detail = invalid.map((i) => `seq ${i.seq} (${i.key}/${i.target}): ${i.reason}`).join('; ');
    throw new Error(`refused (retirement ledger): ${invalid.length} retirement(s) failed nullity recheck — ${detail}.`);
  }
  return { records, countRetired, fixtureRetired };
}

#!/usr/bin/env node
/**
 * security-invariant-retirement.proof — proves the audited GC path for the
 * security monotonicity ratchet can never become a silent weakening:
 *   - append-only hash chain detects tampering and breaks;
 *   - machine-verifiable nullity proofs (absent-path-target, duplicate-regex)
 *     are rechecked against the live repo; prose alone never suffices;
 *   - classifyRetirements is fail-closed: a broken chain or any invalid proof
 *     refuses ALL exemptions.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildRetirementRecord,
  readRetirements,
  verifyNullity,
  classifyRetirements,
  retirementRecordHash,
} from '../security-invariant-retirement.mjs';

const json = process.argv.includes('--json');
const results = [];
let pass = 0, fail = 0;
const ck = (name, ok, detail = {}) => { ok ? pass++ : fail++; results.push({ name, ok: Boolean(ok), detail }); };

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sir-proof-'));
fs.writeFileSync(path.join(repo, 'present.ts'), 'x');
fs.writeFileSync(path.join(repo, 'server-tools-exec.ts'),
  'const FORBIDDEN = [\n  { re: /alpha/ },\n  { re: /dup/ },\n  { re: /dup/ },\n];\n');
const ctx = {
  repoRoot: repo,
  readInvariantSource: (f) => { try { return fs.readFileSync(path.join(repo, f), 'utf8'); } catch { return ''; } },
};
const led = path.join(repo, 'led.jsonl');
const writeChain = (file, recs) => fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n');

const rFixture = buildRetirementRecord(null, {
  kind: 'fixture', key: 'forbiddenExecLaws', target: 'dead-fixture', file: 'server-tools-exec.ts',
  nullityKind: 'absent-path-target',
  nullityProof: 'the protected file scripts/ghost/dead.ts no longer exists anywhere in the repository tree',
  evidence: { path: 'scripts/ghost/dead.ts', referenceText: 'chmod 777 scripts/ghost/dead.ts' },
});
const rCount = buildRetirementRecord(rFixture, {
  kind: 'count', key: 'forbiddenExecLaws', target: 'dup-regex', file: 'server-tools-exec.ts',
  nullityKind: 'duplicate-regex',
  nullityProof: 'an identical live regex /dup/ remains in FORBIDDEN so removing the duplicate preserves coverage',
  evidence: { regexSource: '/dup/' },
});
writeChain(led, [rFixture, rCount]);

// chain integrity
{ const r = readRetirements(path.join(repo, 'absent.jsonl')); ck('missing-ledger-empty-chainok', r.chainOk && r.records.length === 0); }
{ const r = readRetirements(led); ck('valid-chain-verifies', r.chainOk && r.records.length === 2, { error: r.error }); }
{ const bad = { ...rFixture, target: 'mutated' }; writeChain(led + '.t', [bad]); const r = readRetirements(led + '.t'); ck('tamper-detected', !r.chainOk && /tampered/.test(r.error || ''), { error: r.error }); }
{
  const a = buildRetirementRecord(null, { kind: 'count', key: 'k', target: 't', file: 'server-tools-exec.ts', nullityKind: 'duplicate-regex', nullityProof: 'x'.repeat(40), evidence: { regexSource: '/dup/' } });
  const b = { ...buildRetirementRecord(a, { kind: 'count', key: 'k', target: 't2', file: 'server-tools-exec.ts', nullityKind: 'duplicate-regex', nullityProof: 'x'.repeat(40), evidence: { regexSource: '/dup/' } }), prevSha256: 'deadbeef' };
  b.recordSha256 = retirementRecordHash(b);
  writeChain(led + '.b', [a, b]);
  const r = readRetirements(led + '.b');
  ck('broken-chain-detected', !r.chainOk && /broken chain/.test(r.error || ''), { error: r.error });
}

// nullity verification
ck('absent-path-valid-when-absent', verifyNullity(rFixture, ctx).ok);
{
  const rec = buildRetirementRecord(null, { kind: 'fixture', key: 'forbiddenExecLaws', target: 'x', file: 'server-tools-exec.ts', nullityKind: 'absent-path-target', nullityProof: 'should fail because present.ts exists in the repo root tree', evidence: { path: 'present.ts', referenceText: 'chmod 777 present.ts' } });
  ck('absent-path-refused-when-present', !verifyNullity(rec, ctx).ok);
}
ck('duplicate-regex-valid-when-dup', verifyNullity(rCount, ctx).ok);
{
  const rec = buildRetirementRecord(null, { kind: 'count', key: 'forbiddenExecLaws', target: 'x', file: 'server-tools-exec.ts', nullityKind: 'duplicate-regex', nullityProof: 'no such regex exists so coverage is not preserved by any live duplicate', evidence: { regexSource: '/not-in-source/' } });
  ck('duplicate-regex-refused-when-absent', !verifyNullity(rec, ctx).ok);
}
{
  const rec = buildRetirementRecord(null, { kind: 'count', key: 'k', target: 't', file: 'server-tools-exec.ts', nullityKind: 'duplicate-regex', nullityProof: 'too short', evidence: { regexSource: '/dup/' } });
  ck('short-proof-refused', !verifyNullity(rec, ctx).ok);
}
{
  const rec = buildRetirementRecord(null, { kind: 'count', key: 'k', target: 't', file: 'server-tools-exec.ts', nullityKind: 'made-up-kind', nullityProof: 'x'.repeat(40), evidence: {} });
  ck('unknown-nullity-kind-refused', !verifyNullity(rec, ctx).ok);
}

// classify fail-closed
{
  const c = classifyRetirements(led, ctx);
  ck('classify-grants-count-exemption', (c.countRetired.forbiddenExecLaws || 0) === 1);
  ck('classify-grants-fixture-exemption', Boolean(c.fixtureRetired.forbiddenExecLaws && c.fixtureRetired.forbiddenExecLaws.has('dead-fixture')));
}
{ let threw = false; try { classifyRetirements(led + '.b', ctx); } catch { threw = true; } ck('classify-throws-on-broken-chain', threw); }
{
  const rec = buildRetirementRecord(null, { kind: 'fixture', key: 'forbiddenExecLaws', target: 'x', file: 'server-tools-exec.ts', nullityKind: 'absent-path-target', nullityProof: 'invalid because present.ts exists; the whole ledger must be rejected fail-closed', evidence: { path: 'present.ts', referenceText: 'chmod 777 present.ts' } });
  writeChain(led + '.inv', [rec]);
  let threw = false; try { classifyRetirements(led + '.inv', ctx); } catch { threw = true; }
  ck('classify-throws-on-invalid-nullity', threw);
}

const ok = fail === 0;
if (json) process.stdout.write(JSON.stringify({ ok, pass, fail, results }) + '\n');
else { for (const r of results) process.stdout.write(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}\n`); process.stdout.write(`\n${pass} passed, ${fail} failed\n`); }
process.exit(ok ? 0 : 1);

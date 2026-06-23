#!/usr/bin/env node
/**
 * record-completeness.proof.mjs — PARADIGM PART D A-G7: the Engineering Record Completeness theorem holds.
 *
 *   RC1 COMPLETE      — when every persisted write has a matching trace, the record is complete.
 *   RC2 GAP DETECTED  — a write with NO trace is detected (discriminating — completeness can go RED).
 *   RC3 CHAIN-INTACT  — a gap-free parentSha256→chainHash trace chain is verified intact.
 *   RC4 CHAIN BREAK   — a broken chain link is detected at its exact index (discriminating).
 *   RC5 THEOREM       — proven := COMPLETE ∧ CHAIN-INTACT; fails if EITHER half fails.
 *
 * Pure: in-memory; belongs in the mandatory lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const R = await import(path.join(root, 'record-completeness.mjs'));
const { missingTraces, firstChainGap, recordCompleteness } = R;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// a gap-free chain: parent[i] == chainHash[i-1]
const writes = [
  { writeId: 'w1', afterSha256: 'sha-A' },
  { writeId: 'w2', afterSha256: 'sha-B' },
  { writeId: 'w3', afterSha256: 'sha-C' },
];
const tracesIntact = [
  { operationId: 'o1', afterSha256: 'sha-A', parentSha256: null, chainHash: 'h1' },
  { operationId: 'o2', afterSha256: 'sha-B', parentSha256: 'h1', chainHash: 'h2' },
  { operationId: 'o3', afterSha256: 'sha-C', parentSha256: 'h2', chainHash: 'h3' },
];

// ── RC1: COMPLETE ──
check('RC1: every persisted write has a matching trace → no missing records', missingTraces(writes, tracesIntact).length === 0, {});

// ── RC2: GAP DETECTED — a write with no trace ──
const writesPlusUntraced = [...writes, { writeId: 'w4-silent', afterSha256: 'sha-D-untraced' }];
check('RC2: a write with NO trace is DETECTED (discriminating — a silent write reds completeness)',
  missingTraces(writesPlusUntraced, tracesIntact).includes('w4-silent'), { missing: missingTraces(writesPlusUntraced, tracesIntact) });

// ── RC3: CHAIN-INTACT ──
check('RC3: a gap-free parentSha256→chainHash chain verifies intact', firstChainGap(tracesIntact) === -1, {});

// ── RC4: CHAIN BREAK detected ──
const tracesBroken = [
  { operationId: 'o1', afterSha256: 'sha-A', parentSha256: null, chainHash: 'h1' },
  { operationId: 'o2', afterSha256: 'sha-B', parentSha256: 'WRONG', chainHash: 'h2' }, // gap here (index 1)
  { operationId: 'o3', afterSha256: 'sha-C', parentSha256: 'h2', chainHash: 'h3' },
];
check('RC4: a broken chain link is DETECTED at its exact index (discriminating)', firstChainGap(tracesBroken) === 1, { firstGap: firstChainGap(tracesBroken) });

// ── RC5: THE THEOREM ──
const proven = recordCompleteness(writes, tracesIntact);
check('RC5: THEOREM — complete ∧ chain-intact ⇒ the record is PROVABLY complete (no silent write)', proven.proven === true, { proven });
const brokenComplete = recordCompleteness(writesPlusUntraced, tracesBroken);
check('RC5: THEOREM fails if EITHER half fails (missing write OR chain gap)', brokenComplete.proven === false && brokenComplete.complete === false && brokenComplete.chainIntact === false, { brokenComplete });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

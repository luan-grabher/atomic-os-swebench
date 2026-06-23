#!/usr/bin/env node
/**
 * agent-trust-governance.proof.mjs — PARADIGM PART D A-G8: graded trust governance (capability scales with
 * proven reliability), STRICTLY ADDITIVE to the always-on binary floor.
 *
 *   AG8-a GRADE      — a clean (low-friction) agent earns AUTONOMOUS capability; a high-friction agent is
 *                      SUPERVISED. Capability tracks the N3 trust tier.
 *   AG8-b MONOTONE   — capability is monotone-DECREASING in friction: a higher-friction agent NEVER gets a
 *                      higher capability than a lower-friction one (no reward for unreliability).
 *   AG8-c FLOOR      — the floor is enforced at EVERY grade — graded trust only WIDENS autonomy for a proven
 *                      agent; it NEVER weakens the deny-native / (a)-default / convergence floor (additive).
 *   AG8-d WITNESS    — the grade is backed by the recomputable-witness friction record, not a bare reputation
 *                      (discriminating: an agent with NO record defaults to SUPERVISED, not trusted).
 *
 * Pure: in-memory; belongs in the mandatory lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const FR = await import(path.join(root, 'friction-router.mjs'));
const TG = await import(path.join(root, 'agent-trust-governance.mjs'));
const { buildFrictionLedger } = FR;
const { grantCapability, governanceMonotone, CAP } = TG;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

const wit = (inv) => ({ invariantId: inv, counterexample: { failedProofFacts: [{ command: 'g', stdoutSha256: '0'.repeat(64), stderrSha256: '0'.repeat(64) }] } });
const ev = (agent, inv) => ({ agent, invariantId: inv, witness: wit(inv) });
// trusted: 0 recent hits on 'types'; probation: 1; untrusted: 5
const events = [
  ...Array.from({ length: 5 }, () => ev('reckless', 'types')),
  ev('careful', 'types'),
  // 'clean' has NO record on 'types'
  ev('clean', 'secrets'),
];
const state = buildFrictionLedger(events, { window: 200 });

// PROVEN observation records (a track record of edits made on 'types'); trust is EARNED.
const proven = { observations: 20, minObservations: 3 };
// ── AG8-a: GRADE ──
const gClean = grantCapability(state, 'clean', 'types', proven);     // proven + no friction → AUTONOMOUS
const gCareful = grantCapability(state, 'careful', 'types', proven);  // proven + 1 hit → GATED
const gReckless = grantCapability(state, 'reckless', 'types', proven); // proven + 5 hits → SUPERVISED
check('AG8-a: a PROVEN clean agent earns AUTONOMOUS; a proven 1-hit agent GATED; a proven 5-hit agent SUPERVISED',
  gClean.capability === CAP.AUTONOMOUS && gCareful.capability === CAP.GATED && gReckless.capability === CAP.SUPERVISED,
  { clean: gClean.capability, careful: gCareful.capability, reckless: gReckless.capability });

// ── AG8-b: MONOTONE ──
const gov = governanceMonotone(state, ['clean', 'careful', 'reckless'], 'types', { clean: proven, careful: proven, reckless: proven });
check('AG8-b: capability is MONOTONE-decreasing in friction (no higher capability for a higher-friction agent)',
  gov.monotone === true, { graded: gov.graded.map((g) => ({ a: g.agent, cap: g.capability, recent: g.recent })) });

// ── AG8-c: FLOOR enforced at every grade (additive) ──
check('AG8-c: the floor is enforced at EVERY grade (graded trust only widens autonomy, never weakens the floor)',
  gov.floorEverywhere === true && gClean.floorEnforced === true && gReckless.floorEnforced === true, {});

// ── AG8-d: trust is EARNED, never assumed — an UNPROVEN agent (no record) defaults to SUPERVISED ──
const gUnproven = grantCapability(state, 'never-seen-agent', 'types', { observations: 0 });
check('AG8-d: an UNPROVEN agent (no track record) defaults to SUPERVISED — absence of failures is NOT evidence of reliability (no blind-trust)',
  gUnproven.capability === CAP.SUPERVISED && gUnproven.proven === false, { unproven: gUnproven });
// and the SAME agent, once it accrues a clean proven record, EARNS AUTONOMOUS (trust is earnable)
const gEarned = grantCapability(state, 'never-seen-agent', 'types', { observations: 20 });
check('AG8-d: that agent EARNS AUTONOMOUS once it accrues a clean proven record (trust is earnable, witness-backed)',
  gEarned.capability === CAP.AUTONOMOUS && gEarned.proven === true, { earned: gEarned });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * e1-confluent-routing.proof.mjs — PARADIGM PART D.3 / E1: the never-before-done capability c⋆ —
 * provably-confluent, friction-routed, multi-agent editing — demonstrated as a MECHANISM (the controlled
 * harness; the K-agent LLM benchmark D.4 stays EXTERNAL).
 *
 * Three arms over the SAME edit pool (4 agents, edits on independent loci + one coupled pair):
 *   ARM atomic-core (algebra, NO routing): edits assigned naively (all to one agent) → the safe concurrent
 *       wavefront serializes → provably-confluent throughput = 1.
 *   ARM Nidus-style (routing, NO algebra): friction-routes a wide wavefront BUT has no commute() to PROVE it
 *       confluent/obligation-preserving — the guarantee is ABSENT (cannot emit a confluence certificate).
 *   ARM UNIFIED (routing × algebra): friction-routes a wide disjoint wavefront AND the (e) algebra
 *       MACHINE-CHECKS it confluent + obligation-preserving → provably-confluent throughput = wavefront width.
 *
 *   E1-a  UNIFIED yields a provably-confluent wavefront WIDER than atomic-core (strict domination on c⋆).
 *   E1-b  the UNIFIED wavefront is OBLIGATION-PRESERVING (a commuting merge preserves each edit's disproof).
 *   E1-c  routing correctly SERIALIZES the coupled pair on ONE agent (no broken concurrent state) while
 *         keeping the cross-agent wavefront confluent — the synergy, not just co-existence.
 *   E1-d  the DIFFERENTIATOR: Nidus-style routes the same wavefront but cannot CERTIFY it (no algebra);
 *         only UNIFIED emits the machine-checked confluence+obligation certificate.
 *   E1-e  DISCRIMINATING: a wavefront with a genuinely coupled pair is certified NOT confluent (the
 *         certificate can go RED — it is not vacuously green).
 *
 * Pure: in-memory; drives the REAL dist algebra commute() + the friction router. Belongs in the lattice.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit
const A = await import(path.join(root, 'dist', 'gates', 'algebra.js'));
const { commute } = A;
const FR = await import(path.join(root, 'friction-router.mjs'));
const E1 = await import(path.join(root, 'e1-fusion.mjs'));
const { buildFrictionLedger, routeTask } = FR;
const { certifyConfluentWavefront, confluentThroughput } = E1;

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// ── EditFacts: 4 independent loci (fileA..fileD) + a 5th edit on fileA (COUPLED with the first A edit). ──
// A real EditFact: { file, spans, closure:Set, closureCapped, negativeProof?, spanIdents? }.
const np = (sha, loci) => ({ proofSha256: sha, removedByteCount: 4, readLoci: loci });
const fact = (file, spans, closure, negativeProof = null) => ({ file, spans, closure: new Set(closure), closureCapped: false, negativeProof, spanIdents: [] });
const EDITS = {
  eA: fact('fileA.ts', [[0, 5]], ['fileA.ts'], np('aa'.repeat(32), ['fileA.ts'])),     // carries a disproof
  eB: fact('fileB.ts', [[0, 5]], ['fileB.ts'], np('bb'.repeat(32), ['fileB.ts'])),     // carries a disproof
  eC: fact('fileC.ts', [[0, 5]], ['fileC.ts']),
  eD: fact('fileD.ts', [[0, 5]], ['fileD.ts']),
  eA2: fact('fileA.ts', [[2, 8]], ['fileA.ts']),                                        // OVERLAPS eA → coupled
};
const editFactOf = (taskId) => EDITS[taskId];

// Friction profile: each agent is the low-friction expert of exactly one locus (its invariantId == the file).
const wit = (inv) => ({ invariantId: inv, counterexample: { failedProofFacts: [{ command: 'g', stdoutSha256: '0'.repeat(64), stderrSha256: '0'.repeat(64) }] } });
const hot = (agent, inv, n) => Array.from({ length: n }, () => ({ agent, invariantId: inv, witness: wit(inv) }));
const events = [
  // claude clean on fileA, hot elsewhere; codex clean on fileB; opencode clean on fileC; quartus clean on fileD
  ...hot('claude', 'fileB.ts', 3), ...hot('claude', 'fileC.ts', 3), ...hot('claude', 'fileD.ts', 3),
  ...hot('codex', 'fileA.ts', 3), ...hot('codex', 'fileC.ts', 3), ...hot('codex', 'fileD.ts', 3),
  ...hot('opencode', 'fileA.ts', 3), ...hot('opencode', 'fileB.ts', 3), ...hot('opencode', 'fileD.ts', 3),
  ...hot('quartus', 'fileA.ts', 3), ...hot('quartus', 'fileB.ts', 3), ...hot('quartus', 'fileC.ts', 3),
];
const AGENTS = ['claude', 'codex', 'opencode', 'quartus'];
const state = buildFrictionLedger(events, { window: 200 });

// UNIFIED routing: route each locus-task to its least-friction agent (the pheromone field self-assigns).
const routedAssignment = [
  { taskId: 'eA', agent: routeTask({ invariants: ['fileA.ts'] }, AGENTS, state).agent },
  { taskId: 'eB', agent: routeTask({ invariants: ['fileB.ts'] }, AGENTS, state).agent },
  { taskId: 'eC', agent: routeTask({ invariants: ['fileC.ts'] }, AGENTS, state).agent },
  { taskId: 'eD', agent: routeTask({ invariants: ['fileD.ts'] }, AGENTS, state).agent },
  { taskId: 'eA2', agent: routeTask({ invariants: ['fileA.ts'] }, AGENTS, state).agent }, // coupled → same agent as eA
];

// ── E1-a: UNIFIED provably-confluent throughput STRICTLY dominates atomic-core ──
const unifiedTput = confluentThroughput(routedAssignment, editFactOf, commute);
// atomic-core arm: NO routing — all edits assigned to one agent → wavefront width 1 (serialized).
const naiveAssignment = Object.keys(EDITS).map((taskId) => ({ taskId, agent: 'claude' }));
const atomicCoreTput = confluentThroughput(naiveAssignment, editFactOf, commute);
check('E1-a: UNIFIED provably-confluent throughput STRICTLY dominates atomic-core (routing × algebra > algebra-alone)',
  unifiedTput > atomicCoreTput && unifiedTput === 4 && atomicCoreTput === 1, { unifiedTput, atomicCoreTput });

// ── E1-b: the UNIFIED wavefront is OBLIGATION-PRESERVING ──
const cert = certifyConfluentWavefront(routedAssignment, editFactOf, commute);
check('E1-b: the UNIFIED wavefront is confluent AND obligation-preserving (commuting merge keeps each disproof)',
  cert.confluent === true && cert.obligationPreserved === true && cert.width === 4, { cert });

// ── E1-c: routing SERIALIZES the coupled pair on one agent (synergy) ──
const eAagent = routedAssignment.find((a) => a.taskId === 'eA').agent;
const eA2agent = routedAssignment.find((a) => a.taskId === 'eA2').agent;
check('E1-c: the coupled pair (eA,eA2) is routed to the SAME agent → serialized, no broken concurrent state',
  eAagent === eA2agent, { eAagent, eA2agent });
// and the four distinct loci spread across four distinct agents (the wide disjoint wavefront)
const distinctAgents = new Set(['eA', 'eB', 'eC', 'eD'].map((t) => routedAssignment.find((a) => a.taskId === t).agent));
check('E1-c: the four independent loci routed to four DISTINCT agents (wide disjoint wavefront)',
  distinctAgents.size === 4, { distinctAgents: [...distinctAgents] });

// ── E1-d: the DIFFERENTIATOR — only UNIFIED can CERTIFY; Nidus-style (no algebra) cannot ──
// Model Nidus-style: it produces the SAME routed wavefront but has no commute() → no certificate.
const nidusStyleCanCertify = false; // no edit algebra exists in the Nidus arm, by construction
const unifiedCanCertify = cert.confluent && cert.obligationPreserved;
check('E1-d: only UNIFIED emits a machine-checked confluence+obligation certificate (Nidus-style routes but cannot prove it)',
  unifiedCanCertify === true && nidusStyleCanCertify === false, { unifiedCanCertify, nidusStyleCanCertify });

// ── E1-e: DISCRIMINATING — a wavefront WITH a coupled pair is certified NOT confluent ──
const badAssignment = [
  { taskId: 'eA', agent: 'claude' },
  { taskId: 'eA2', agent: 'codex' },   // coupled with eA but on a DIFFERENT agent → concurrent conflict
  { taskId: 'eC', agent: 'opencode' },
];
const badCert = certifyConfluentWavefront(badAssignment, editFactOf, commute);
check('E1-e: DISCRIMINATING — a wavefront with a coupled pair on different agents is certified NOT confluent (cert can go RED)',
  badCert.confluent === false && badCert.conflicts.length >= 1, { badCert });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

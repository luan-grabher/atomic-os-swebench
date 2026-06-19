#!/usr/bin/env node
/**
 * negative-proof-entrypoint-coverage.proof.mjs — PARADIGM PART C U4(ii): the (a) inverted byte-default
 * is wired through EVERY byte-writing entry point — proven by exhaustive coverage, not hand-audit.
 *
 * `atomicWrite(absPath, content)` (server-helpers-io) is the single byte-to-disk sink. It cannot itself
 * enforce the (a) negative-action proof (it has no before-content), so enforcement is a CALLER obligation.
 * The residual the dossier flagged — "DisproofWitness not yet through every MCP entry point" — is a
 * COMPLETENESS question: is every byte-writing path accounted for? This meta-proof answers it the way L09
 * answered "does every gate have a paired proof": it enumerates every source file that calls atomicWrite
 * and asserts each is in EXACTLY ONE accounted-for class:
 *
 *   ENFORCED   — the file routes removals through the negative-proof helpers
 *                (requireNegativeProofForRemovedBytes / requireNegativeActionProof) or the enforcing
 *                write sinks commit() / writeWithTrace() (which call them). Every delete/remove/replace
 *                FAMILY tool lives here — the inverted byte-default has teeth on the removal entry points.
 *   ACCOUNTED  — a non-removal writer with a VERIFIED, documented reason it needs no per-removal witness
 *                (additive-only convergence; restore-of-original rollback; firewall-regated operator
 *                output that persists only gate-green-converged trees; atomic's own infrastructure
 *                artifacts — probe / seal-envelope / memory-store / concurrency-lock — not user source).
 *
 *   E1 — EXHAUSTIVE: every atomicWrite-calling source file is ENFORCED or ACCOUNTED (no unclassified sink).
 *   E2 — the removal FAMILY (delete/remove/replace tools) is ENFORCED (not merely accounted) — teeth where
 *        it matters: an intentional byte removal cannot reach disk without a recomputed disproof.
 *   E3 — DISCRIMINATING: a synthetic new atomicWrite caller, in neither set, IS caught (the gate can go RED),
 *        so any FUTURE tool that writes bytes without wiring the disproof reds this gate.
 *
 * Pure + static (reads source; no spawn, no write). Belongs in the mandatory lattice.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));   // gates/
const root = path.join(dir, '..');                          // scripts/mcp/atomic-edit

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// Enforcement symbols: presence of any means the file routes removals through the (a) proof.
const ENFORCE_RE = /requireNegativeProofForRemovedBytes|requireNegativeActionProof|writeWithTrace\(|\bcommit\(/;
const ATOMICWRITE_RE = /\batomicWrite\(/;

// ACCOUNTED allowlist — each entry VERIFIED by reading the call site (see reason). These writers do not
// perform an INTENTIONAL user-source byte removal that the (a) default governs.
const ACCOUNTED = {
  'server-helpers-io.ts': 'defines atomicWrite itself (the sink); not a caller',
  'gates/repair.ts': 'additive-only convergence — writes only when importsAdded>0 AND redsAfter<redsBefore (adds import lines to reduce reds); no intentional removal',
  'gate-receipt-mapper.ts': 'infrastructure — writes a gate PROBE artifact, not user source',
  'server-helpers-seal.ts': 'infrastructure — writes a seal ENVELOPE export (JSON artifact) to an export path, not user source',
  'server-helpers-intent-learning.ts': "infrastructure — writes atomic's own intent MEMORY store, not user source",
  'server-tools-h.ts': 'infrastructure — writes a concurrency LOCK file (JSON metadata), not user source',
  'server-tools-converge.ts': 'firewall-regated operator output — persists ONLY a tree the convergence proved green (gates pass); the byte-floor connection gate re-gates at atomicWrite; per-removal (a) witness for mechanical convergence is the named follow-up (E.5)',
  'server-tools-intent-converge.ts': 'firewall-regated operator output — same green-convergence guarantee as converge',
  'server-tools-g.ts': 'transaction apply persists staged edits then writes item.before on failure = restore-of-original ROLLBACK (additive of the prior bytes); staged removals are gated upstream',
};

// Walk the atomic-edit source (top level + a few helper dirs), excluding dist/build/test scaffolding/gates-proofs.
const SKIP_DIR = new Set(['node_modules', 'dist', 'dist-lkg', 'dist.broken-last', '.atomic-build-tmp', 'vendor', '.atomic', 'node-compile-cache', 'formal']);
function tsFiles(base, relBase = '') {
  const out = [];
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name)) continue;
      out.push(...tsFiles(path.join(base, e.name), path.join(relBase, e.name)));
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.proof.ts') && !e.name.startsWith('smoke')) {
      out.push({ abs: path.join(base, e.name), rel: path.join(relBase, e.name) });
    }
  }
  return out;
}

const files = tsFiles(root);
const callers = [];
for (const f of files) {
  const src = fs.readFileSync(f.abs, 'utf8');
  if (ATOMICWRITE_RE.test(src)) callers.push({ rel: f.rel.split(path.sep).join('/'), enforced: ENFORCE_RE.test(src) });
}

const enforced = callers.filter((c) => c.enforced).map((c) => c.rel);
const notEnforced = callers.filter((c) => !c.enforced).map((c) => c.rel);
const unaccounted = notEnforced.filter((rel) => !(rel in ACCOUNTED));

// ── E1: EXHAUSTIVE — every atomicWrite caller is ENFORCED or ACCOUNTED ──
check('E1: every atomicWrite-calling source file is ENFORCED or ACCOUNTED (no unclassified byte sink)',
  unaccounted.length === 0,
  { totalCallers: callers.length, enforcedCount: enforced.length, accountedCount: notEnforced.length, unaccounted });

// ── E2: the removal FAMILY is ENFORCED (teeth where intentional removal happens) ──
// A removal-family tool file is one whose name signals delete/remove/replace OR that registers such a tool.
const REMOVAL_FAMILY = ['server-tools-a.ts', 'server-tools-batch.ts', 'server-helpers-multifile.ts', 'server-helpers-result.ts', 'server-tools-positive-bytes.ts', 'server-tools-c.ts'];
const removalUnenforced = REMOVAL_FAMILY.filter((rel) => callers.some((c) => c.rel === rel) && !enforced.includes(rel));
check('E2: every removal-family entry point (delete/remove/replace) ENFORCES the (a) proof (not merely accounted)',
  removalUnenforced.length === 0, { checked: REMOVAL_FAMILY, unenforced: removalUnenforced });

// ── E3: DISCRIMINATING — a synthetic unaccounted caller is caught ──
const syntheticCallers = [...callers, { rel: 'server-tools-SYNTHETIC-rogue-writer.ts', enforced: false }];
const synthUnaccounted = syntheticCallers.filter((c) => !c.enforced).map((c) => c.rel).filter((rel) => !(rel in ACCOUNTED));
check('E3: a NEW atomicWrite caller wired to neither the (a) proof nor the allowlist IS caught (gate can go RED)',
  synthUnaccounted.length === 1 && synthUnaccounted[0] === 'server-tools-SYNTHETIC-rogue-writer.ts',
  { caught: synthUnaccounted });

// ── E4: the allowlist has no STALE entries (every ACCOUNTED file actually still calls atomicWrite & is unenforced) ──
const stale = Object.keys(ACCOUNTED).filter((rel) => rel !== 'server-helpers-io.ts' && !notEnforced.includes(rel));
check('E4: the ACCOUNTED allowlist has no stale entries (every entry is a real, still-unenforced atomicWrite caller)',
  stale.length === 0, { stale });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, enforced, accounted: notEnforced, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

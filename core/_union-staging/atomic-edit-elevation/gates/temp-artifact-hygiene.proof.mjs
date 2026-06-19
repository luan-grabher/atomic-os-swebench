#!/usr/bin/env node
/**
 * temp-artifact-hygiene.proof.mjs — PARADIGM L03: a gate run leaves ZERO stray artifacts in the tree.
 *
 * Gates have historically leaked `.smoke-*`, `atomic-type-gate-*`, `atomic-rt-proof-*`, content-hash
 * dirs, and `*.tmp` into the SOURCE tree on abnormal exit — pollution the byte-floor is blind to because
 * it inspects file CONTENT, not the file SET. This proof snapshots the source dir's entry set, runs a
 * representative battery of gates, and asserts the entry set is unchanged (modulo gitignored temp).
 *
 *   H1 — a battery of gate runs introduces ZERO new tree entries (the hygiene invariant).
 *   H2 — DISCRIMINATING: a synthetic stray file IS detected as a new artifact (the check can go red).
 *   H3 — every known litter CLASS is gitignored (so even an out-of-band leak never reaches git).
 *
 * Pure-ish: spawns the cheap gate battery; self-cleans its own canary. Belongs in the mandatory lattice.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const dir = path.dirname(fileURLToPath(import.meta.url));    // gates/
const root = path.join(dir, '..');                           // scripts/mcp/atomic-edit

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// Snapshot the SOURCE entry set (top-level of atomic-edit + gates/), excluding the always-churning dirs.
const SKIP = new Set(['node_modules', 'dist', 'dist-lkg', 'dist.broken-last', '.atomic-build-tmp', 'vendor', '.atomic', 'node-compile-cache']);
function snapshot() {
  const set = new Set();
  for (const base of [root, dir]) {
    for (const e of fs.readdirSync(base)) {
      if (base === root && SKIP.has(e)) continue;
      set.add(path.relative(root, path.join(base, e)));
    }
  }
  return set;
}

const before = snapshot();

// ── H1: a battery of gate runs introduces ZERO new tree entries ───────────────
const battery = ['structural-lint-gate', 'type-soundness-gate', 'public-contract-gate', 'converge-symbol-mutation', 'closure-meta-gate', 'coverage-ratchet'];
for (const g of battery) {
  try { execSync(`node ${path.join(dir, g + '.proof.mjs')} --json`, { cwd: root, stdio: 'ignore', timeout: 60000 }); } catch { /* a gate going red is fine; we only test hygiene */ }
}
const afterBattery = snapshot();
const leaked = [...afterBattery].filter((e) => !before.has(e));
check('H1: a battery of gate runs introduces ZERO new tree entries', leaked.length === 0, { battery: battery.length, leaked });

// ── H2: DISCRIMINATING — a synthetic stray IS detected ────────────────────────
const canary = path.join(root, '.hygiene-canary-leak.tmp');
fs.writeFileSync(canary, 'stray');
const afterCanary = snapshot();
const detected = [...afterCanary].filter((e) => !before.has(e)).includes('.hygiene-canary-leak.tmp');
fs.rmSync(canary, { force: true });
check('H2: a synthetic stray artifact IS detected (hygiene check can go RED)', detected, { canary: '.hygiene-canary-leak.tmp' });

// ── H3: every known litter CLASS is gitignored ────────────────────────────────
const litterSamples = [
  'atomic-rt-proof-XXXXXX', 'converge-symbol-mutation-proof-XXXXXX', 'readcode-source-batchnext-root-XXXXXX',
  'tmpdir-check.tmp', '.smoke-fixture.123.ts', 'atomic-type-gate-XXXXXX', '.proof-XXXXXX',
];
const notIgnored = [];
for (const s of litterSamples) {
  // create the path, ask git, remove
  const p = path.join(root, s);
  let ignored = false;
  try {
    fs.writeFileSync(p, '');
    execSync(`git check-ignore ${JSON.stringify(s)}`, { cwd: root, stdio: 'ignore' });
    ignored = true;
  } catch { ignored = false; } finally { try { fs.rmSync(p, { force: true }); } catch { /* */ } }
  if (!ignored) notIgnored.push(s);
}
check('H3: every known litter class is gitignored (out-of-band leaks never reach git)', notIgnored.length === 0, { notIgnored });

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

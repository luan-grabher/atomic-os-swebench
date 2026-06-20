#!/usr/bin/env node
import { exec, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, '..', '..');
const env = { ...process.env, ATOMIC_EDIT_REPO_ROOT: repoRoot };
const ALG = path.join(repoRoot, 'formal', 'atomic-algebra');
const ELAN_LEAN = path.join(os.homedir(), '.elan', 'bin', 'lean');
const has = (t) => { try { execSync('command -v ' + t, { stdio: 'ignore' }); return true; } catch { return false; } };
const HAVE_PY = has('python3');
const LEAN_BIN = has('lean') ? 'lean' : (fs.existsSync(ELAN_LEAN) ? ELAN_LEAN : null);
const CHECKS = [
  { prop: 'build', cmd: 'node build.mjs', seq: true },
  { prop: 'P2', cmd: 'node gates/byte-floor-language-soundness.proof.mjs --json' },
  { prop: 'P3', cmd: 'node gates/resource-lifetime.proof.mjs --json && node gates/fd-socket-lifetime.proof.mjs --json' },
  { prop: 'P3b', cmd: 'node gates/temp-artifact-hygiene.proof.mjs --json' },
  { prop: 'P3c', cmd: 'node gates/per-gate-soundness-completeness.proof.mjs --json' },
  { prop: 'P4', cmd: 'node gates/closure-meta-gate.proof.mjs --json' },
  { prop: 'P-agent', cmd: 'node gates/agent-independence.proof.mjs --json' },
  { prop: 'P5+P6', cmd: 'node gates/coverage-ratchet.proof.mjs --json' },
  { prop: 'lattice', cmd: 'node gates/self-expansion-validator-lattice.proof.mjs --json' },
  { prop: 'sc-sync', cmd: 'node gates/supply-chain-resolver-sync.proof.mjs --json' },
  { prop: 'P7-alg', cmd: 'node gates/algebra.proof.mjs && node gates/algebra-refinement.proof.mjs' },
  { prop: 'P7-z3', cmd: 'python3 "' + path.join(ALG, 'confluence_z3.py') + '"', skip: !HAVE_PY },
  { prop: 'P7-lean', cmd: 'cd "' + ALG + '" && "' + (LEAN_BIN || 'lean') + '" NwayConfluence.lean', skip: !LEAN_BIN },
  { prop: 'P8', cmd: 'node gates/negative-proof-teeth.proof.mjs' },
  { prop: 'P9+P10', cmd: 'node gates/truth-funnel.proof.mjs --json' },
  { prop: 'H-fixes', cmd: 'node gates/session-fixes-regression.proof.mjs' },
  { prop: 'P1', cmd: 'node smoke.mjs' },
];
function runCmd(cmd) {
  return new Promise(resolve => {
    const t0 = Date.now();
    exec(cmd, { cwd: dir, env, timeout: 300000 }, (err) => resolve({ ok: !err, ms: Date.now() - t0 }));
  });
}
async function main() {
  const t0 = Date.now();
  console.log('PARALLEL PARADIGM VERIFY');
  const build = CHECKS.find(c => c.seq);
  process.stdout.write('build ... ');
  const br = await runCmd(build.cmd);
  console.log(br.ok ? 'GREEN' : 'RED');
  if (!br.ok) process.exit(1);
  console.log('Running ' + (CHECKS.length - 1) + ' gates in parallel...');
  const rest = CHECKS.filter(c => !c.seq);
  const results = await Promise.all(rest.map(async c => ({ ...c, ...(c.skip ? { ok: null, ms: 0, skipped: true } : await runCmd(c.cmd)) })));
  let green = 1, red = 0, skipped = 0;
  for (const r of results) {
    if (r.skipped) { skipped++; console.log('SKIP ' + r.prop); continue; }
    console.log((r.ok ? 'GREEN' : 'RED ') + ' ' + r.prop.padEnd(10) + ' (' + r.ms + 'ms)');
    r.ok ? green++ : red++;
  }
  console.log(green + '/' + (green + red) + ' green' + (skipped ? ', ' + skipped + ' skipped' : '') + (red === 0 ? ' ALL DISCHARGED' : ' INCOMPLETE'));
  process.exit(red > 0 ? 1 : 0);
}
main();

// emergence-live-feed.proof.mjs — adversarial gate for the LIVE emergence collection (PART D.6 wiring).
// PROVES the bridge from "observatory runs on synthetic data" to "observatory FED by real usage":
//   (1) recordEmergenceEvent appends a real, hash-chained record per operation;
//   (2) the chain VERIFIES (third-party recomputable) and a TAMPERED record BREAKS it (discriminating);
//   (3) the CANONICAL observatory consumes the REAL fed feed:
//       O1 noveltyIndex distinguishes a repeated diff (~0) from a novel one (high) on live data;
//       O5 anomalyResidual chains over the live events and verifyResidualChain confirms it;
//   (4) recordEmergenceEvent is FAIL-SAFE (bad root -> null, never throws) and EXEMPTS .atomic bookkeeping.
import { recordEmergenceEvent, readEmergenceFeed, verifyFeedChain } from '../dist/emergence-feed.js';
import { noveltyIndex, anomalyResidual, verifyResidualChain } from '../emergence-observatory.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'emfeed-'));

const s1 = recordEmergenceEvent({ repoRoot: root, kind: 'edit', op: 'atomicWrite', file: 'a.ts', before: '', after: 'alpha alpha alpha\n' });
const s2 = recordEmergenceEvent({ repoRoot: root, kind: 'edit', op: 'atomicWrite', file: 'b.ts', before: '', after: 'alpha alpha alpha\n' });
const s3 = recordEmergenceEvent({ repoRoot: root, kind: 'edit', op: 'atomicWrite', file: 'c.ts', before: '', after: 'zeta omega kappa lambda\n' });
check('records appended (hash returned each time)', !!s1 && !!s2 && !!s3);
const feed = readEmergenceFeed(root);
check('feed has 3 real records', feed.length === 3);
check('records are chained', feed[0].previousSha === null && feed[1].previousSha === s1 && feed[2].previousSha === s2);

check('verifyFeedChain ok on intact feed', verifyFeedChain(feed).ok === true);
const tampered = JSON.parse(JSON.stringify(feed)); tampered[1].diff = 'FORGED';
check('DISCRIMINATING: tampered record breaks the chain', verifyFeedChain(tampered).ok === false);

const diffSeq = feed.filter((r) => r.kind === 'edit').map((r) => r.diff);
const nov = noveltyIndex(diffSeq);
check('O1 noveltyIndex computes a real series over live diffs', Array.isArray(nov.series) && nov.series.length === 2);
check('O1: repeated diff ~0 novelty', nov.series[0] < 0.2);
check('O1: novel diff high novelty (>0.5)', nov.series[1] > 0.5);
const res = anomalyResidual(feed, (ev) => ev.kind === 'edit' && (ev.diff || '').includes('alpha'));
check('O5 anomalyResidual flags the unpredicted event', res.residual.length === 1);
check('O5 residual chain verifies', verifyResidualChain(res.residual).ok === true);

let threw = false; let nullOnBad = null;
try { nullOnBad = recordEmergenceEvent({ repoRoot: '/proc/nonexistent-\0-bad', kind: 'edit', op: 'x', file: 'y.ts', before: '', after: 'z' }); } catch { threw = true; }
check('FAIL-SAFE: bad root returns null, never throws', threw === false && nullOnBad === null);
check('EXEMPT: .atomic bookkeeping write not recorded', recordEmergenceEvent({ repoRoot: root, kind: 'edit', op: 'x', file: '.atomic/trace.json', before: '', after: 'q' }) === null);

fs.rmSync(root, { recursive: true, force: true });

if (json) {
  console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'emergence-live-feed' }));
} else {
  console.log(failures === 0 ? '\nOK — emergence-live-feed proof (0 failures)' : `\nFAIL — emergence-live-feed proof (${failures} failure(s))`);
}
process.exit(failures === 0 ? 0 : 1);

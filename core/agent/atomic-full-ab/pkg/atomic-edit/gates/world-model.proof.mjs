// world-model.proof.mjs — adversarial gate for Phase 4 (predict) + recursive observatory.
// PROVES predict ranks the consequents of one antecedent and ignores others; recursiveNovelty
// reads the OWN decision stream and reports ~0 novelty for identical decisions (honest no-change
// on static corpus) but > 0 when a structurally-new decision appears; missing ledger -> empty.
import { predict, recursiveNovelty } from '../world-model.mjs';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

const report = { candidates: [
  { antecedent: 'X', consequent: 'Y', holdoutConfidence: 1.0, lift: 5, informative: true },
  { antecedent: 'X', consequent: 'Z', holdoutConfidence: 0.9, lift: 3, informative: true },
  { antecedent: 'Q', consequent: 'W', holdoutConfidence: 1.0, lift: 2, informative: true },
] };
const p = predict(report, 'X');
check('predict returns the antecedent consequents ranked by holdout (Y first)', p.predicts.length === 2 && p.predicts[0].consequent === 'Y');
check('predict ignores other antecedents (no W)', !p.predicts.some((x) => x.consequent === 'W'));
check('predict on unknown antecedent -> empty', predict(report, 'NONE').predicts.length === 0);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wm-'));
try {
  const dir = path.join(tmp, '.atomic'); fs.mkdirSync(dir, { recursive: true });
  const lf = path.join(dir, 'hypothesis-ledger.jsonl');
  const rec = (ti) => JSON.stringify({ kind: 'atomic-hypothesis-proposal', topInformative: ti }) + String.fromCharCode(10);
  fs.writeFileSync(lf, rec([{ antecedent: 'A', consequent: 'B' }]) + rec([{ antecedent: 'A', consequent: 'B' }]));
  let rn = recursiveNovelty(tmp);
  check('recursiveNovelty: identical decisions -> ~0 novelty (honest no-change)', rn.records === 2 && rn.series.length === 1 && rn.series[0] === 0);
  fs.appendFileSync(lf, rec([{ antecedent: 'P', consequent: 'Q' }, { antecedent: 'R', consequent: 'S' }]));
  rn = recursiveNovelty(tmp);
  check('recursiveNovelty: a structurally-new decision raises novelty > 0', rn.series.length === 2 && rn.series[1] > 0);
  check('recursiveNovelty: missing ledger -> empty (no fabrication)', recursiveNovelty('/nonexistent-wm-xyz-987').records === 0);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (json) console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'world-model' }));
else console.log(failures === 0 ? '\nOK — world-model proof (0 failures)' : `\nFAIL — world-model proof (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);

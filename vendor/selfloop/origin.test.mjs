// origin.test.mjs — proves the authorship-origin ledger (P1): hash-chained, recomputable,
// honest default (agent:unknown), and F2-enabling (distinguishes autonomous-authored admissions).
import { recordOrigin, lookupOrigin, verifyOriginLedger, ORIGIN_LEDGER_REL } from './origin.mjs';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

let pass = 0; let fail = 0;
const check = (n, c) => { if (c) { pass += 1; console.log('  PASS  ' + n); } else { fail += 1; console.log('  FAIL  ' + n); } };

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'origin-'));
try {
  // unrecorded candidate -> honest conservative default.
  check('unrecorded candidate defaults to agent:unknown', lookupOrigin(root, 'cX') === 'agent:unknown');

  const r1 = recordOrigin(root, { candidateId: 'cAuto', origin: 'autonomous:autonomous-evolution.mjs', authoredBy: 'synthesizeCouplingGate' });
  const r2 = recordOrigin(root, { candidateId: 'cAgent', origin: 'agent:claude-code' });
  check('first record has null previousRecordSha256', r1.previousRecordSha256 === null);
  check('chain links (r2.prev = r1.recordSha256)', r2.previousRecordSha256 === r1.recordSha256);
  check('lookup returns autonomous origin', lookupOrigin(root, 'cAuto') === 'autonomous:autonomous-evolution.mjs');
  check('lookup returns agent origin', lookupOrigin(root, 'cAgent') === 'agent:claude-code');

  const v = verifyOriginLedger(root);
  check('ledger verifies + counts 1 autonomous', v.ok === true && v.records === 2 && v.autonomous === 1);

  // tamper detection
  const f = path.join(root, ORIGIN_LEDGER_REL);
  fs.appendFileSync(f, JSON.stringify({ kind: 'atomic-candidate-origin', candidateId: 'evil', origin: 'autonomous:forged', previousRecordSha256: 'WRONG', recordSha256: 'x' }) + '\n');
  check('tampered chain detected', verifyOriginLedger(root).ok === false);

  // discriminating: a bad origin prefix is refused (no silent mislabel).
  let threw = false; try { recordOrigin(root, { candidateId: 'cBad', origin: 'magic' }); } catch { threw = true; }
  check('invalid origin prefix refused', threw);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(fail === 0 ? `\nOK — origin ledger (${pass} pass, 0 fail)` : `\nFAIL — origin (${fail} failure(s))`);
process.exit(fail === 0 ? 0 : 1);

/**
 * unjudged-lens-negative.proof.mjs -- proves the reader (runLens) ABOLISHES the unjudged third
 * state: a domain the gates could not prove positive is folded into an UNPROVEN red (negative),
 * and the report exposes NO unjudged / unjudgedEvidence bucket. Doctrine: prove positive or it is
 * negative -- the tool cannot report 'could not prove' as a separate ok state.
 * Run: node gates/unjudged-lens-negative.proof.mjs
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runLens } from '../dist/gates/lens.js';

let pass = 0;
let fail = 0;
const check = (name, cond) => { if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', name); } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-unjudged-lens-'));
// A .ts file with NO reachable tsconfig => the type-soundness gate cannot decide (was 'unjudged').
fs.writeFileSync(path.join(tmp, 'a.ts'), 'export const x: number = 1;\n');
const r = await runLens(tmp, '.');
check('reader exposes NO unjudged third-state bucket', Array.isArray(r.unjudged) && r.unjudged.length === 0);
check('reader exposes NO unjudgedEvidence bucket', Array.isArray(r.unjudgedEvidence) && r.unjudgedEvidence.length === 0);
check('an unprovable domain is folded into an UNPROVEN red (negative)', r.reds.some((x) => /UNPROVEN/.test(x.fact)));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nUNJUDGED-LENS-NEGATIVE ${pass}/${pass + fail}`);
if (fail) process.exit(1);

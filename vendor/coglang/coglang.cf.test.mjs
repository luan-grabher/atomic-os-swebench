// coglang.cf.test.mjs — proves the `counterfactual` primitive: sandboxed hypothetical
// evaluation that NEVER mutates the real state. Additive test (uncertainty/goal/self elsewhere).
import { run } from './coglang.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
let pass = 0; let fail = 0;
const check = (n, c) => { if (c) { pass += 1; console.log('  PASS  ' + n); } else { fail += 1; console.log('  FAIL  ' + n); } };

const r = run(fs.readFileSync(path.join(dir, 'examples', 'counterfactual.cog'), 'utf8'));
const lines = r.output.split('\n');

// plan: a(0.9~0.9) * 0.8 -> 0.72 ~ 0.900
check('real plan keeps real confidence (0.72 ~ 0.900)', lines[0] === '0.72 ~ 0.900');
// counterfactual a=0.9~0.5: 0.72 ~ 0.500 — confidence reflects the hypothetical world
check('counterfactual re-derives under hypothesis (0.72 ~ 0.500)', lines[1] === '0.72 ~ 0.500');
// the REAL a is untouched (0.9 ~ 0.900), proving the sandbox did not leak
check('real state UNCHANGED after counterfactual (a = 0.9 ~ 0.900)', lines[2] === '0.9 ~ 0.900');

// programmatic: counterfactual returns the hypothetical value, env stays real.
const r2 = run('let x = 1 ~ 0.9\nlet y = counterfactual x = 1 ~ 0.2 in x\nprint y\nprint x');
const l2 = r2.output.split('\n');
check('cf value carries hypothetical confidence (1 ~ 0.200)', l2[0] === '1 ~ 0.200');
check('binding x unchanged by cf (1 ~ 0.900)', l2[1] === '1 ~ 0.900');
check('env has real x, not the hypothetical', r2.env.x.conf === 0.9);

console.log(fail === 0 ? `\nOK — coglang counterfactual (${pass} pass, 0 fail)` : `\nFAIL — coglang counterfactual (${fail} failure(s))`);
process.exit(fail === 0 ? 0 : 1);

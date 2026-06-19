// coglang.test.mjs — proves CogLang v0 actually runs and its cognitive primitives have
// real, honest semantics (confidence propagation + confidence-gated goals).
import { run, GOAL_CONFIDENCE_FLOOR } from './coglang.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
let pass = 0; let fail = 0;
const check = (n, c) => { if (c) { pass += 1; console.log('  PASS  ' + n); } else { fail += 1; console.log('  FAIL  ' + n); } };

const res = run(fs.readFileSync(path.join(dir, 'examples', 'hello.cog'), 'utf8'));

// uncertainty<T>: 0.9*0.8 = 0.72 value, 0.95*0.80 = 0.76 confidence — propagation is real.
check('uncertainty propagates confidence (value 0.72 ~ conf 0.760)', res.output.includes('0.72 ~ 0.760'));
check('confidence decays through a third multiply (0.608)', res.output.includes('0.608'));
// goal: met ONLY when evidence clears the confidence floor — honest, not boolean-blind.
check('confident goal (0.76 >= floor) is MET', /"trust the fused estimate": MET/.test(res.output));
check('under-confident goal (0.608 < floor) is unmet', /"trust the weak estimate": unmet/.test(res.output));
const weak = res.goals.find((g) => g.name === 'trust the weak estimate');
check('weak goal confidence below floor', weak && weak.confidence < GOAL_CONFIDENCE_FLOOR);
check('exactly two goals recorded', res.goals.length === 2);

// discriminating: a malformed program is refused, not silently mis-run.
let threw = false; try { run('let x = '); } catch { threw = true; }
check('malformed program throws (no silent garbage)', threw);

console.log(fail === 0 ? `\nOK — coglang v0 (${pass} pass, 0 fail)` : `\nFAIL — coglang v0 (${fail} failure(s))`);
process.exit(fail === 0 ? 0 : 1);

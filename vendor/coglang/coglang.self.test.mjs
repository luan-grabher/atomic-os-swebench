// coglang.self.test.mjs — proves the `self` primitive (self-model): a CogLang program reading
// its OWN live state with honest semantics. Additive to coglang.test.mjs (uncertainty + goal).
import { run } from './coglang.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
let pass = 0; let fail = 0;
const check = (n, c) => { if (c) { pass += 1; console.log('  PASS  ' + n); } else { fail += 1; console.log('  FAIL  ' + n); } };

const s = run(fs.readFileSync(path.join(dir, 'examples', 'self.cog'), 'utf8'));

check('self.met counts only goals above the floor (1 of 2)', s.goals.filter((g) => g.met).length === 1);
check('self.confidence = mean of binding confidences (0.700)', s.output.includes('0.7'));
check('self evaluated against LIVE state (an unmet goal is present)', /unmet/.test(s.output));
check('self.goals printed as a plain count (1)', s.output.split('\n').includes('1'));

// discriminating: an unknown self field is refused, never faked.
let threw = false; try { run('print self.nonsense'); } catch { threw = true; }
check('unknown self field refused (honest, not fabricated)', threw);

// self reflects the moment: querying self.goals before any goal returns 0.
const z = run('print self.goals');
check('self.goals is 0 before any goal is declared', z.output.trim() === '0');

console.log(fail === 0 ? `\nOK — coglang self primitive (${pass} pass, 0 fail)` : `\nFAIL — coglang self (${fail} failure(s))`);
process.exit(fail === 0 ? 0 : 1);

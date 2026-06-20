/**
 * lens-skip-honesty.proof.mjs -- proves the atomic_lens reader is HONEST about coverage: it
 * surfaces `skipped`, the non-TS/JS code files in scope its gates cannot analyze, so a GREEN
 * result never silently implies coverage of CSS/HTML/SQL/shell bytes it never read.
 * Run: node gates/lens-skip-honesty.proof.mjs
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { enumerateSkipped } from '../dist/server-tools-lens.js';

let pass = 0;
let fail = 0;
const check = (name, cond) => { if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', name); } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-lens-skip-'));
fs.writeFileSync(path.join(tmp, 'foo.ts'), 'export const x = 1;\n');
fs.writeFileSync(path.join(tmp, 'a.css'), '.a{color:red}\n');
fs.writeFileSync(path.join(tmp, 'q.sql'), 'SELECT 1;\n');
fs.writeFileSync(path.join(tmp, 'page.html'), '<div></div>\n');
fs.writeFileSync(path.join(tmp, 'go.sh'), 'echo hi\n');

const skipped = enumerateSkipped(tmp, '.');
check('counts the 4 non-TS/JS code files (css/sql/html/sh)', skipped.length === 4);
check('does NOT count the .ts source file', !skipped.some((f) => f.endsWith('.ts')));
check('lists the css/sql/html/sh files', ['a.css', 'q.sql', 'page.html', 'go.sh'].every((f) => skipped.includes(f)));

const single = enumerateSkipped(tmp, 'a.css');
check('single .css scope is honest: skipped 1 (explicit, not silent)', single.length === 1 && single[0] === 'a.css');

const tsOnly = enumerateSkipped(tmp, 'foo.ts');
check('a TS-only scope has 0 skipped', tsOnly.length === 0);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nLENS-SKIP-HONESTY ${pass}/${pass + fail}`);
if (fail) process.exit(1);

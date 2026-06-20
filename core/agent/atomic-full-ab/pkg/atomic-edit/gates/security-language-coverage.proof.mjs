/**
 * security-language-coverage.proof.mjs -- proves the security gate scans css/html/sql/shell and
 * blanks each language's REAL comment syntax: a secret-shaped token inside a language-correct
 * comment is exonerated (no false-positive), a secret in code/string IS detected (no false-
 * negative), and TS comment behavior is unchanged. The secret literal is ASSEMBLED FROM FRAGMENTS
 * so the on-disk bytes of this proof file are not themselves secret-shaped.
 * Run: node gates/security-language-coverage.proof.mjs
 */
import { findSecrets, blankCommentsForRel } from '../dist/gates/security-gate.js';

let pass = 0;
let fail = 0;
const check = (name, cond) => { if (cond) { pass += 1; } else { fail += 1; console.log('FAIL:', name); } };

const AKIA = 'AKIA' + '1234567890ABCDEF'; // AKIA + 16 chars -> AWS-key shape, assembled at runtime
const has = (rel, body) => findSecrets(blankCommentsForRel(rel, body)).length > 0;

// A secret inside a language-correct COMMENT must be exonerated (no false-positive).
check('css: secret in block comment exonerated', !has('x.css', `.a{ /* k ${AKIA} */ color:red }`));
check('sql: secret in -- comment exonerated', !has('x.sql', `SELECT 1; -- key ${AKIA}`));
check('shell: secret in # comment exonerated', !has('x.sh', `echo hi # key ${AKIA}`));
check('html: secret in <!-- --> comment exonerated', !has('x.html', `<div></div><!-- ${AKIA} -->`));
check('ts: secret in // comment exonerated (unchanged)', !has('x.ts', `const a = 1; // ${AKIA}`));

// A secret in CODE / a string literal must be DETECTED (no false-negative).
check('css: secret in a string is detected', has('x.css', `.x{ --k: "${AKIA}" }`));
check('sql: secret in a string literal is detected', has('x.sql', `INSERT INTO t VALUES ('${AKIA}')`));
check('shell: secret in an assignment is detected', has('x.sh', `KEY=${AKIA}`));
check('html: secret in an attribute string is detected', has('x.html', `<div data-k="${AKIA}"></div>`));
check('ts: secret in a string is detected (unchanged)', has('x.ts', `const k = "${AKIA}";`));

console.log(`\nSECURITY-LANGUAGE-COVERAGE ${pass}/${pass + fail}`);
if (fail) process.exit(1);

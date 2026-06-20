// insert-remove-property.proof.mjs — adversarial gate for #8 object-literal property primitives.
// PROVES: universalInsertProperty / universalRemoveProperty produce SYNTACTICALLY VALID results for the
// common object-literal shapes (first-prop insert, after-anchor insert, remove with separator repair),
// and DISCRIMINATE (not-found throws, ambiguity throws). validate() is the soundness backstop — every
// result carries a validation verdict, and a malformed edit is refused by the write pipeline, never written.
import { universalInsertProperty, universalRemoveProperty } from '../dist/engine-universal.js';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }
function throws(fn) { try { fn(); return false; } catch { return true; } }

// insert as first property
let r = universalInsertProperty('x.ts', 'const o = {\n  a: 1,\n  b: 2,\n};\n', 'c', '3');
check('insert first-prop: valid + has c: 3', r.validation.ok && r.newText.includes('c: 3'));
// insert after an anchor property (inline object)
r = universalInsertProperty('x.ts', 'const o = { a: 1, b: 2 };\n', 'z', '9', 'a');
check('insert after anchor: valid + has z: 9 + keeps a/b', r.validation.ok && r.newText.includes('z: 9') && r.newText.includes('a: 1') && r.newText.includes('b: 2'));
// JSON object (colon style), insert after anchor
r = universalInsertProperty('cfg.json', '{\n  "a": 1,\n  "b": 2\n}\n', '"c"', '3', 'b');
check('insert into JSON after anchor: valid + has c', r.validation.ok && r.newText.includes('"c": 3'));

// remove middle property, repair separators
r = universalRemoveProperty('x.ts', 'const o = {\n  a: 1,\n  b: 2,\n  c: 3,\n};\n', 'b');
check('remove b: valid + b gone + a/c kept', r.validation.ok && !/\bb\s*:\s*2/.test(r.newText) && r.newText.includes('a: 1') && r.newText.includes('c: 3'));
// remove last property (no dangling comma before })
r = universalRemoveProperty('x.ts', 'const o = { a: 1, b: 2 };\n', 'b');
check('remove last: valid + no trailing comma', r.validation.ok && !/,\s*}/.test(r.newText) && r.newText.includes('a: 1'));

// DISCRIMINATING — not found + ambiguity refuse
check('remove not-found throws', throws(() => universalRemoveProperty('x.ts', 'const o = { a: 1 };\n', 'zzz')));
check('remove ambiguous throws', throws(() => universalRemoveProperty('x.ts', 'const o = { a: 1 };\nconst p = { a: 2 };\n', 'a')));
check('insert bad anchor throws', throws(() => universalInsertProperty('x.ts', 'const o = { a: 1 };\n', 'z', '9', 'nope')));

if (json) {
  console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'insert-remove-property' }));
} else {
  console.log(failures === 0 ? '\nOK — insert-remove-property proof (0 failures)' : `\nFAIL — insert-remove-property proof (${failures} failure(s))`);
}
process.exit(failures === 0 ? 0 : 1);

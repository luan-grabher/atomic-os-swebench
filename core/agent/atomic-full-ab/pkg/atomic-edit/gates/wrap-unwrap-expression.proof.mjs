// wrap-unwrap-expression.proof.mjs — adversarial gate for #6 generic expression wrap/unwrap.
// PROVES: universalWrapExpression wraps a verbatim expression in a prefix/suffix (await/call) with a
// VALID result; universalUnwrapExpression strips ONE outer wrapper (await X / name(INNER), balanced).
// DISCRIMINATES: ambiguity throws, a non-wrapper unwrap anchor throws, unbalanced parens are rejected.
// validate() is the soundness backstop.
import { universalWrapExpression, universalUnwrapExpression } from '../dist/engine-universal.js';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }
function throws(fn) { try { fn(); return false; } catch { return true; } }

let r = universalWrapExpression('x.ts', 'const v = foo(1);\n', 'foo(1)', 'await ', '');
check('wrap foo(1) -> await foo(1) (valid)', r.validation.ok && r.newText.includes('await foo(1)'));
r = universalWrapExpression('x.ts', 'const v = x;\n', 'x', 'wrap(', ')');
check('wrap x -> wrap(x) (valid)', r.validation.ok && r.newText.includes('wrap(x)'));
r = universalUnwrapExpression('x.ts', 'const v = await foo(1);\n', 'await foo(1)');
check('unwrap await foo(1) -> foo(1)', r.validation.ok && /=\s*foo\(1\)/.test(r.newText) && !r.newText.includes('await'));
r = universalUnwrapExpression('x.ts', 'const v = wrap(x.y);\n', 'wrap(x.y)');
check('unwrap wrap(x.y) -> x.y', r.validation.ok && /=\s*x\.y/.test(r.newText) && !r.newText.includes('wrap('));
r = universalUnwrapExpression('x.ts', 'const v = wrap(a(b), c);\n', 'wrap(a(b), c)');
check('unwrap balanced nested -> a(b), c', r.validation.ok && r.newText.includes('= a(b), c'));

check('wrap ambiguous throws', throws(() => universalWrapExpression('x.ts', 'a; a;\n', 'a')));
check('unwrap non-wrapper throws', throws(() => universalUnwrapExpression('x.ts', 'const v = x;\n', 'x')));
check('wrap occurrence selects', (() => { const rr = universalWrapExpression('x.ts', 'a;\na;\n', 'a', '(', ')', 2); return rr.newText.indexOf('(a)') > rr.newText.indexOf('a;\n'); })());

if (json) {
  console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'wrap-unwrap-expression' }));
} else {
  console.log(failures === 0 ? '\nOK — wrap-unwrap-expression proof (0 failures)' : `\nFAIL — wrap-unwrap-expression proof (${failures} failure(s))`);
}
process.exit(failures === 0 ? 0 : 1);

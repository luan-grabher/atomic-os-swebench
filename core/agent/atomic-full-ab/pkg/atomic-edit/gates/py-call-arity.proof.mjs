#!/usr/bin/env node
/**
 * gates/py-call-arity.proof.mjs — adversarial proof for PY-CALL-ARITY (sound spec).
 *
 * RED only when real: a kwarg the resolved in-file def cannot accept (unknown keyword → TypeError).
 * GREEN only when safe: valid kwarg · **kwargs sink · ambiguous (2 defs) · method call · imported name ·
 * non-Python. Soundness > completeness (L06). Discriminating: reaches RED and GREEN on the same shape.
 */
const gate = (await import('../dist/gates/py-call-arity.js')).default;

function ctxFor(rel, code) {
  const overlay = new Map([[rel, code]]);
  return { repoRoot: '/tmp', overlay, changedFiles: [rel], readFile: (r) => (overlay.has(r) ? overlay.get(r) : null), resolveFile: (r) => r };
}
const judge = (rel, code) => gate.run(ctxFor(rel, code));
const results = [];
const rec = (name, ok, detail) => results.push({ name, ok, detail });
async function expect(name, rel, code, wantGreen, wantMinReds = 0) {
  const r = await judge(rel, code);
  const ok = r.green === wantGreen && (wantGreen ? r.reds.length === 0 : r.reds.length >= wantMinReds);
  rec(name, ok, { green: r.green, reds: r.reds.length, sample: r.reds[0]?.fact?.slice(0, 80) });
}

rec('gate id + kind', gate.name === 'py-call-arity' && gate.kind === 'static', { name: gate.name });

// RED only when real
await expect('unknown keyword on resolved def → RED', 'a.py',
  `def f(a, b):\n    return a + b\n\nf(x=1)\n`, false, 1);
await expect('unknown keyword nested inside another call → RED', 'a.py',
  `def f(a):\n    return a\n\nprint(f(zz=1))\n`, false, 1);

// GREEN only when safe (no false positives)
await expect('valid keyword (param exists) → GREEN', 'a.py',
  `def f(a, b):\n    return a\n\nf(a=1, b=2)\n`, true);
await expect('**kwargs sink accepts any keyword → GREEN', 'a.py',
  `def f(a, **kw):\n    return a\n\nf(x=1)\n`, true);
await expect('ambiguous (two defs same name) → GREEN', 'a.py',
  `def f(a):\n    return a\n\ndef f(b):\n    return b\n\nf(x=1)\n`, true);
await expect('method call (unknown receiver) → GREEN', 'a.py',
  `def f(a):\n    return a\n\nobj.f(x=1)\n`, true);
await expect('imported name shadowing → GREEN', 'a.py',
  `from m import f\n\ndef f(a):\n    return a\n\nf(x=1)\n`, true);
await expect('class constructor (not a def) → GREEN', 'a.py',
  `class C:\n    def __init__(self, a):\n        self.a = a\n\nC(x=1)\n`, true);
await expect('non-Python file → GREEN/notApplicable', 'a.ts', `f({x: 1})\n`, true);

// discriminating
const red = await judge('a.py', `def f(a):\n    return a\n\nf(zz=1)\n`);
const green = await judge('a.py', `def f(a):\n    return a\n\nf(a=1)\n`);
rec('discriminating: reaches RED and GREEN (not vacuous)', red.green === false && green.green === true, { red: red.green, green: green.green });

const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, passCount: results.filter((r) => r.ok).length, totalCount: results.length, results }, null, 2));
process.exit(ok ? 0 : 1);

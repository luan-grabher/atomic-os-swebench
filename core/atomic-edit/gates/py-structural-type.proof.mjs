#!/usr/bin/env node
/**
 * gates/py-structural-type.proof.mjs — adversarial proof (sound spec, scope A).
 * RED: len(x)/x[k] on an instance of a base-less in-repo class lacking __len__/__getitem__.
 * GREEN (no false positives): dunder present · class HAS bases (MRO unknown) · not an in-repo class ·
 * reassigned · ambiguous (2 classes same name) · non-Python. Discriminating.
 */
const gate = (await import('../dist/gates/py-structural-type.js')).default;
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
rec('gate id + kind', gate.name === 'py-structural-type' && gate.kind === 'static', { name: gate.name });

// RED only when real
await expect('len(x) on base-less class w/o __len__ → RED', 'a.py',
  `class C:\n    pass\n\ndef f():\n    x = C()\n    return len(x)\n`, false, 1);
await expect('x[k] on base-less class w/o __getitem__ → RED', 'a.py',
  `class C:\n    pass\n\ndef f():\n    x = C()\n    return x[0]\n`, false, 1);

// GREEN only when safe (no false positives)
await expect('__len__ present → GREEN', 'a.py',
  `class C:\n    def __len__(self):\n        return 0\n\ndef f():\n    x = C()\n    return len(x)\n`, true);
await expect('__getitem__ present → GREEN', 'a.py',
  `class C:\n    def __getitem__(self, k):\n        return k\n\ndef f():\n    x = C()\n    return x[0]\n`, true);
await expect('class HAS bases (MRO unknown) → GREEN', 'a.py',
  `class C(Base):\n    pass\n\ndef f():\n    x = C()\n    return len(x)\n`, true);
await expect('not an in-repo class → GREEN', 'a.py',
  `from m import C\n\ndef f():\n    x = C()\n    return len(x)\n`, true);
await expect('reassigned before op → GREEN', 'a.py',
  `class C:\n    pass\n\ndef f():\n    x = C()\n    x = []\n    return len(x)\n`, true);
await expect('ambiguous (two classes same name) → GREEN', 'a.py',
  `class C:\n    pass\n\nclass C:\n    def __len__(self):\n        return 0\n\ndef f():\n    x = C()\n    return len(x)\n`, true);
await expect('non-Python file → GREEN/notApplicable', 'a.ts', `const x = new C(); x.length;\n`, true);

// discriminating
const red = await judge('a.py', `class C:\n    pass\n\ndef f():\n    x = C()\n    return len(x)\n`);
const green = await judge('a.py', `class C:\n    def __len__(self):\n        return 1\n\ndef f():\n    x = C()\n    return len(x)\n`);
rec('discriminating: reaches RED and GREEN (not vacuous)', red.green === false && green.green === true, { red: red.green, green: green.green });

const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, passCount: results.filter((r) => r.ok).length, totalCount: results.length, results }, null, 2));
process.exit(ok ? 0 : 1);

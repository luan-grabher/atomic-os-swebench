#!/usr/bin/env node
/**
 * gates/py-undef-name.proof.mjs — adversarial proof for PY-UNDEF-NAME (sound spec).
 * RED: a free name used but bound nowhere / not builtin / not imported (a real NameError, e.g. a typo).
 * GREEN (the soundness controls — NO false positives): builtins, every binding form (assignment, def,
 * class, param, for, with-as, except-as, comprehension, walrus, closure), attribute access, keyword-arg
 * names, imports, f-string of a defined var, decorators, escape-hatches (skip), non-Python. Discriminating.
 */
const gate = (await import('../dist/gates/py-undef-name.js')).default;
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
  rec(name, ok, { green: r.green, reds: r.reds.length, sample: r.reds[0]?.fact?.slice(0, 70) });
}
rec('gate id + kind', gate.name === 'py-undef-name' && gate.kind === 'static', { name: gate.name });

// RED only when real
await expect('typo: name used, never defined → RED', 'a.py', `def f(cotm):\n    return cothm\n`, false, 1);
await expect('undefined call target → RED', 'a.py', `def f():\n    return notdefined()\n`, false, 1);

// GREEN — the soundness controls (no false positives)
await expect('builtins → GREEN', 'a.py', `def f(xs):\n    return len(list(enumerate(xs)))\n`, true);
await expect('assignment binding → GREEN', 'a.py', `def f():\n    x = 1\n    return x\n`, true);
await expect('param + for + range → GREEN', 'a.py', `def f(n):\n    for i in range(n):\n        print(i)\n`, true);
await expect('with-as + except-as → GREEN', 'a.py', `def f():\n    try:\n        with open('p') as fh:\n            return fh.read()\n    except OSError as e:\n        return str(e)\n`, true);
await expect('comprehension + walrus → GREEN', 'a.py', `def compute():\n    return 1\n\ndef f():\n    xs = [y for y in range(3)]\n    if (n := compute()) > 0:\n        return n\n    return xs\n`, true);
await expect('attribute access is not a free name → GREEN', 'a.py', `import os\n\ndef f():\n    return os.path.join('a', 'b')\n`, true);
await expect('keyword-arg name is not a free name → GREEN', 'a.py', `def f():\n    return dict(unknownkw=1)\n`, true);
await expect('imports → GREEN', 'a.py', `import os\nfrom sys import argv as av\n\ndef f():\n    return (os, av)\n`, true);
await expect('closure over enclosing binding → GREEN', 'a.py', `def outer():\n    x = 1\n    def inner():\n        return x\n    return inner\n`, true);
await expect('f-string of a defined var → GREEN', 'a.py', `def f():\n    name = 'a'\n    return f"hi {name}"\n`, true);
await expect('decorator (defined) → GREEN', 'a.py', `def deco(g):\n    return g\n\n@deco\ndef f():\n    return 1\n`, true);
await expect('class attr + self → GREEN', 'a.py', `class C:\n    attr = 1\n    def m(self):\n        return self.attr\n`, true);
await expect('escape hatch (star import) → abstain GREEN', 'a.py', `from m import *\n\ndef f():\n    return anything\n`, true);
await expect('escape hatch (global) → abstain GREEN', 'a.py', `g = 0\n\ndef f():\n    global g\n    g = whatever_dynamic\n`, true);
await expect('non-Python file → GREEN/notApplicable', 'a.ts', `return cothm;\n`, true);

// discriminating
const red = await judge('a.py', `def f():\n    return zzundefined\n`);
const green = await judge('a.py', `def f():\n    zzundefined = 1\n    return zzundefined\n`);
rec('discriminating: reaches RED and GREEN (not vacuous)', red.green === false && green.green === true, { red: red.green, green: green.green });

const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, passCount: results.filter((r) => r.ok).length, totalCount: results.length, results }, null, 2));
process.exit(ok ? 0 : 1);

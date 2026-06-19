#!/usr/bin/env node
/**
 * gates/py-strict-null.proof.mjs — adversarial proof for PY-STRICT-NULL (sound spec).
 *
 * Proves BOTH directions on the REAL compiled gate (dist/gates/py-strict-null.js):
 *   • RED only when real — an unguarded deref of a re.match/search/fullmatch Optional (django-15498 shape).
 *   • GREEN only when safe — guarded cases AND no-false-positive controls (re.findall is a list; a non-`re`
 *     receiver; a None-check that isn't a deref; non-Python files). Soundness > completeness (L06).
 * Discriminating: the gate provably reaches BOTH red and green on the same shape (not vacuous).
 */
const gate = (await import('../dist/gates/py-strict-null.js')).default;

function ctxFor(rel, code) {
  const overlay = new Map([[rel, code]]);
  return {
    repoRoot: '/tmp',
    overlay,
    changedFiles: [rel],
    readFile: (r) => (overlay.has(r) ? overlay.get(r) : null),
    resolveFile: (r) => r,
  };
}
const judge = (rel, code) => gate.run(ctxFor(rel, code));

const results = [];
const rec = (name, ok, detail) => results.push({ name, ok, detail });
async function expect(name, rel, code, wantGreen, wantMinReds = 0) {
  const r = await judge(rel, code);
  const ok = r.green === wantGreen && (wantGreen ? r.reds.length === 0 : r.reds.length >= wantMinReds);
  rec(name, ok, { green: r.green, reds: r.reds.length, wantGreen, wantMinReds, sample: r.reds[0]?.fact?.slice(0, 70) });
}

// ── contract ──
rec('gate id is py-strict-null', gate.name === 'py-strict-null', { name: gate.name });
rec('gate kind is static', gate.kind === 'static', { kind: gate.kind });
rec('gate exposes appliesTo + run', typeof gate.appliesTo === 'function' && typeof gate.run === 'function', {});

// ── RED only when real ──
await expect('django-15498: unguarded re.match deref → RED', 'a.py',
  `import re\ndef f(s):\n    matches = re.match(r'x', s)\n    return matches[1]\n`, false, 1);
await expect('unguarded re.search .group → RED', 'a.py',
  `import re\ndef f(s):\n    m = re.search(r'x', s)\n    return m.group(1)\n`, false, 1);
await expect('unguarded re.fullmatch subscript → RED', 'a.py',
  `import re\ndef f(s):\n    mm = re.fullmatch(r'x', s)\n    return mm[0]\n`, false, 1);

// ── GREEN only when safe (guards) ──
await expect('guarded by `if v:` → GREEN', 'a.py',
  `import re\ndef f(s):\n    matches = re.match(r'x', s)\n    if matches:\n        return matches[1]\n    return None\n`, true);
await expect('guarded by early `if v is None: return` → GREEN', 'a.py',
  `import re\ndef f(s):\n    m = re.match(r'x', s)\n    if m is None:\n        return None\n    return m.group(1)\n`, true);
await expect('None-check, not a deref → GREEN', 'a.py',
  `import re\ndef f(s):\n    m = re.match(r'x', s)\n    return m is not None\n`, true);

// ── GREEN: no false positives (soundness) ──
await expect('SOUND: re.findall is a list (never None) → GREEN', 'a.py',
  `import re\ndef f(s):\n    nums = re.findall(r'x', s)\n    return nums[0]\n`, true);
await expect('SOUND: non-`re` receiver .match() → GREEN', 'a.py',
  `def f(obj, x):\n    m = obj.match(x)\n    return m.group(1)\n`, true);
await expect('SOUND: reassigned var → GREEN', 'a.py',
  `import re\ndef f(s):\n    m = re.match(r'x', s)\n    m = fallback()\n    return m.group(1)\n`, true);
await expect('non-Python file → GREEN/notApplicable', 'a.ts',
  `const m = re.match(x);\nreturn m[1];\n`, true);

// ── discriminating: not vacuous ──
const red = await judge('a.py', `import re\ndef f(s):\n    m = re.match(r'x', s)\n    return m[1]\n`);
const green = await judge('a.py', `import re\ndef f(s):\n    m = re.match(r'x', s)\n    if m:\n        return m[1]\n`);
rec('discriminating: reaches RED and GREEN on the same shape (not vacuous)',
  red.green === false && green.green === true, { red: red.green, green: green.green });

const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, passCount: results.filter((r) => r.ok).length, totalCount: results.length, results }, null, 2));
process.exit(ok ? 0 : 1);

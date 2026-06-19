#!/usr/bin/env node
/**
 * lang-supply-chain.proof.mjs — PARADIGM L07: a REAL present-vs-dangling supply-chain fact per language.
 *
 * Proves that the resolver (lang-supply-chain.mjs) gives Go/Rust/Python/Java the SAME kind of fact
 * node_modules gives JS: stdlib/declared = present (GREEN, never refused), undeclared-non-stdlib =
 * dangling (RED), no-manifest = unjudged (honest abstention, never a false dangling).
 */
import { resolveDependency, PY_STDLIB } from '../lang-supply-chain.mjs';
import { execSync } from 'node:child_process';

const jsonMode = process.argv.includes('--json');
let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail) => {
  const ok = Boolean(cond); ok ? (pass += 1) : (fail += 1);
  results.push({ name, ok, detail });
  if (!jsonMode) console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${name}`);
};

// [lang, stdlibImport, declaredImport, undeclaredImport, ctx]
const cases = [
  ['go', 'strings', 'github.com/pkg/errors', 'github.com/evil/not-required',
    { goMod: 'module x\n\nrequire (\n\tgithub.com/pkg/errors v0.9.1\n)\n' }],
  ['rust', 'std::collections::HashMap', 'serde::Serialize', 'malware_crate::run',
    { cargoToml: '[package]\nname="x"\n\n[dependencies]\nserde = "1.0"\n' }],
  ['python', 'os', 'requests', 'totally_not_installed_pkg',
    { requirements: 'requests==2.31.0\nflask>=2.0\n' }],
  ['java', 'java.util.List', 'org.apache.commons.lang3.StringUtils', 'com.evil.bad.Thing',
    { maven: '<dependency><groupId>org.apache.commons</groupId><artifactId>commons-lang3</artifactId></dependency>' }],
];

for (const [lang, stdImp, declImp, badImp, ctx] of cases) {
  check(`L07-${lang}/present-stdlib: a stdlib/builtin import is PRESENT (never refused)`,
    resolveDependency(lang, stdImp, ctx) === 'present', { lang, spec: stdImp, verdict: resolveDependency(lang, stdImp, ctx) });
  check(`L07-${lang}/present-declared: a manifest-declared dependency is PRESENT`,
    resolveDependency(lang, declImp, ctx) === 'present', { lang, spec: declImp, verdict: resolveDependency(lang, declImp, ctx) });
  check(`L07-${lang}/dangling: an undeclared non-stdlib import is DANGLING (real red, RED-pre/GREEN-post discriminator)`,
    resolveDependency(lang, badImp, ctx) === 'dangling', { lang, spec: badImp, verdict: resolveDependency(lang, badImp, ctx) });
}

// honest abstention: no manifest → unjudged for an external import (never a false dangling)
check('L07-unjudged: an external import with NO manifest is unjudged (honest abstention, not a false dangling)',
  resolveDependency('go', 'github.com/x/y', {}) === 'unjudged' &&
  resolveDependency('rust', 'serde::X', {}) === 'unjudged' &&
  resolveDependency('python', 'requests', {}) === 'unjudged',
  { go: resolveDependency('go', 'github.com/x/y', {}), rust: resolveDependency('rust', 'serde::X', {}), py: resolveDependency('python', 'requests', {}) });

// ── U4(iv): EXHAUSTIVE-STDLIB lock — the soundness pre-condition for any floor-wiring ──
// With a manifest PRESENT (so the resolver would otherwise judge), EVERY Python stdlib module must
// resolve 'present' — no valid stdlib import is ever a false 'dangling'. The strongest form: assert the
// LIVE runtime's sys.stdlib_module_names ⊆ PY_STDLIB (exhaustive for the running Python). If python3 is
// absent, fall back to a hardcoded regression sample of the modules that USED to false-positive.
const manifestCtx = { requirements: 'requests==2.31.0\nflask>=2.0\n' };
{
  let runtimeNames = null;
  try {
    const out = execSync('python3 -c "import sys,json; print(json.dumps([n for n in sys.stdlib_module_names if not n.startswith(chr(95))]))"',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 });
    runtimeNames = JSON.parse(out.trim());
  } catch { runtimeNames = null; }

  if (Array.isArray(runtimeNames) && runtimeNames.length > 0) {
    const uncovered = runtimeNames.filter((n) => !PY_STDLIB.has(n));
    check(`L07-exhaustive-stdlib: live runtime sys.stdlib_module_names (${runtimeNames.length}) ⊆ PY_STDLIB (zero uncovered → no false dangling on any valid stdlib import)`,
      uncovered.length === 0, { runtimeCount: runtimeNames.length, setSize: PY_STDLIB.size, uncovered });
    // and each one actually resolves 'present' WITH a manifest present (the end-to-end guarantee)
    const mis = runtimeNames.filter((n) => resolveDependency('python', n, manifestCtx) !== 'present');
    check('L07-exhaustive-stdlib: every live stdlib module resolves PRESENT even with a manifest (end-to-end)',
      mis.length === 0, { misjudged: mis.slice(0, 20), misCount: mis.length });
  } else {
    // python3 absent — regression sample (the exact modules that false-positived before the exhaustive set)
    const sample = ['secrets', 'ipaddress', 'decimal', 'uuid', 'statistics', 'zoneinfo', 'tomllib', 'graphlib', 'dataclasses', 'contextvars', 'selectors', 'ssl', 'importlib'];
    const mis = sample.filter((n) => resolveDependency('python', n, manifestCtx) !== 'present');
    check('L07-exhaustive-stdlib (python3 absent — regression sample): the formerly-false-positive stdlib modules all resolve PRESENT',
      mis.length === 0, { sample, misjudged: mis });
  }
}

// ── U4(iv): LOCAL/relative/sibling resolution lock (the second floor-wiring pre-condition) ──
const localCtx = { requirements: 'requests==2.31.0\n', localModules: new Set(['myutils', 'mypkg']) };
check('L07-local/py-relative: a relative import (from . / from .x) is PRESENT (intra-package, never dangling)',
  resolveDependency('python', '.', localCtx) === 'present' && resolveDependency('python', '.helpers', localCtx) === 'present',
  { dot: resolveDependency('python', '.', localCtx), rel: resolveDependency('python', '.helpers', localCtx) });
check('L07-local/py-sibling: a sibling module (declared local) is PRESENT, while a genuine undeclared external is still DANGLING (discriminating)',
  resolveDependency('python', 'myutils', localCtx) === 'present' && resolveDependency('python', 'badpkg', localCtx) === 'dangling',
  { sibling: resolveDependency('python', 'myutils', localCtx), external: resolveDependency('python', 'badpkg', localCtx) });
check('L07-local/rust: crate::/self::/super:: and a crate-internal mod are PRESENT, a foreign crate is DANGLING',
  resolveDependency('rust', 'crate::foo', { cargoToml: '[dependencies]\nserde = "1"\n' }) === 'present' &&
  resolveDependency('rust', 'super::bar', { cargoToml: '[dependencies]\nserde = "1"\n' }) === 'present' &&
  resolveDependency('rust', 'internal_mod::x', { cargoToml: '[dependencies]\nserde = "1"\n', localModules: ['internal_mod'] }) === 'present' &&
  resolveDependency('rust', 'evil::thing', { cargoToml: '[dependencies]\nserde = "1"\n' }) === 'dangling',
  {});

if (jsonMode) console.log(JSON.stringify({ ok: fail === 0, pass, fail, results }, null, 2));
else console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

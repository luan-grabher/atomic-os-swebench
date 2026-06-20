// bundler-resolution.proof.mjs — adversarial gate for moduleResolution bundler/node16 +
// allowImportingTsExtensions support in the connection gate's candidate resolver (#2, #3).
// PROVES (positive): extensionless and explicit modern-TS specifiers (.mts/.cts/.mjs/.cjs/.jsx)
// produce the right source candidates, so valid cross-module imports resolve instead of being
// falsely reddened (which forced a bash bypass). DISCRIMINATING: a .js specifier does NOT
// spuriously map to .mts (the rewrite is per-extension, not a blanket).
import { candidatesForSpecifier as cands } from '../dist/connection-gate.js';
import path from 'node:path';

const json = process.argv.includes('--json');
let failures = 0;
function check(name, cond) {
  const ok = !!cond;
  if (!ok) failures += 1;
  if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
}
const idx = (base, f) => cands(base).includes(path.join(base, f));

// extensionless → modern TS extensions
check('extensionless -> .mts', cands('/x/types').includes('/x/types.mts'));
check('extensionless -> .cts', cands('/x/types').includes('/x/types.cts'));
check('extensionless -> .ts (regression)', cands('/x/types').includes('/x/types.ts'));
// index variants
check('index.mts', idx('/x/mod', 'index.mts'));
check('index.mjs', idx('/x/mod', 'index.mjs'));
check('index.jsx', idx('/x/mod', 'index.jsx'));
check('index.ts (regression)', idx('/x/mod', 'index.ts'));
// allowImportingTsExtensions: explicit specifier → TS source
check('.mjs specifier -> .mts source', cands('/x/types.mjs').includes('/x/types.mts'));
check('.cjs specifier -> .cts source', cands('/x/types.cjs').includes('/x/types.cts'));
check('.jsx specifier -> .tsx source', cands('/x/comp.jsx').includes('/x/comp.tsx'));
check('.js specifier -> .ts source (regression)', cands('/x/types.js').includes('/x/types.ts'));
// DISCRIMINATING — rewrite is per-extension, not blanket
check('.js specifier does NOT map to .mts', !cands('/x/types.js').includes('/x/types.mts'));
check('.cjs specifier does NOT map to .ts', !cands('/x/types.cjs').includes('/x/types.ts'));

if (json) {
  console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'bundler-resolution' }));
} else {
  console.log(failures === 0 ? '\nOK — bundler-resolution proof (0 failures)' : `\nFAIL — bundler-resolution proof (${failures} failure(s))`);
}
process.exit(failures === 0 ? 0 : 1);

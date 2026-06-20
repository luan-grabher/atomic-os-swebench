// create-with-imports.proof.mjs — adversarial gate for atomic_create_file's imports[] composite (#4).
// PROVES: create + N imports composes into ONE syntax-validated write (named/alias/default/
// side-effect/type-only/combined forms), AND is identity when no imports are given (discriminating —
// a naive impl would inject a spurious header or blank line).
import { composeWithImports } from '../dist/server-tools-a-3.js';

const json = process.argv.includes('--json');
let failures = 0;
function check(name, cond) {
  const ok = !!cond;
  if (!ok) failures += 1;
  if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

check('named import', composeWithImports('export const x=1;\n', [{ module: './types', name: 'Schema' }]).startsWith("import { Schema } from './types';\n\n"));
check('aliased import', composeWithImports('x', [{ module: './t', name: 'A', alias: 'B' }]).includes("import { A as B } from './t';"));
check('default import', composeWithImports('x', [{ module: 'react', default: 'React' }]).includes("import React from 'react';"));
check('side-effect import', composeWithImports('x', [{ module: './poly' }]).includes("import './poly';"));
check('type-only import', composeWithImports('x', [{ module: './t', name: 'T', typeOnly: true }]).includes("import type { T } from './t';"));
check('default+named combined', composeWithImports('x', [{ module: 'm', default: 'D', name: 'N' }]).includes("import D, { N } from 'm';"));

const multi = composeWithImports('const body=1;\n', [{ module: 'a', name: 'A' }, { module: 'b', name: 'B' }]);
check('multiple imports ordered', multi.indexOf("from 'a'") < multi.indexOf("from 'b'"));
check('blank line separates imports from body', multi.includes("from 'b';\n\nconst body=1;"));

// DISCRIMINATING — no/empty imports must be identity (no spurious header)
check('no imports => identity', composeWithImports('const x=1;\n') === 'const x=1;\n');
check('empty imports => identity', composeWithImports('const x=1;\n', []) === 'const x=1;\n');

if (json) {
  console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'create-with-imports' }));
} else {
  console.log(failures === 0 ? '\nOK — create-with-imports proof (0 failures)' : `\nFAIL — create-with-imports proof (${failures} failure(s))`);
}
process.exit(failures === 0 ? 0 : 1);

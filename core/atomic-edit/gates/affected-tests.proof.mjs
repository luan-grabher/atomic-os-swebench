// affected-tests.proof.mjs — adversarial gate for #9 intelligent test discovery.
// PROVES (positive): findAffectedTests maps changed files to the tests that exercise them,
// both by import-path AND by exported-symbol reference. exportedSymbols extracts decls + named.
// DISCRIMINATING: an unrelated test (no import of the module, no reference to its symbols) is
// NOT flagged — a naive "all tests" or substring impl would fail this.
import { findAffectedTests, exportedSymbols } from '../dist/server-tools-affected-tests.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const json = process.argv.includes('--json');
let failures = 0;
function check(n, c) { const ok = !!c; if (!ok) failures += 1; if (!json) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`); }

// exportedSymbols unit
const sx = exportedSymbols("export const WidgetThing = 1;\nexport function helperFn(){}\nexport type Foo = number;\nexport { Bar as Baz };\n");
check('exportedSymbols: const/function/type', sx.includes('WidgetThing') && sx.includes('helperFn') && sx.includes('Foo'));
check('exportedSymbols: named (pre-alias)', sx.includes('Bar'));

// isolated fixture
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'affected-'));
fs.mkdirSync(path.join(root, 'src'), { recursive: true });
fs.mkdirSync(path.join(root, 'test'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'mymod.ts'), "export const WidgetThing = 42;\nexport function compute(){ return WidgetThing; }\n");
fs.writeFileSync(path.join(root, 'test', 'mymod.test.ts'), "import { compute } from '../src/mymod';\nit('x', () => { compute(); });\n");
fs.writeFileSync(path.join(root, 'test', 'symbol.test.ts'), "// references WidgetThing by name, not via the module path\nconst x = WidgetThing;\n");
fs.writeFileSync(path.join(root, 'test', 'other.test.ts'), "import { unrelated } from '../src/elsewhere';\nit('y', () => { unrelated(); });\n");

const aff = findAffectedTests(root, ['src/mymod.ts']);
const names = aff.map((a) => a.test);
check('finds test importing the module', names.includes('test/mymod.test.ts'));
check('finds test referencing an exported symbol', names.includes('test/symbol.test.ts'));
check('DISCRIMINATING: unrelated test NOT flagged', !names.includes('test/other.test.ts'));
check('records a reason', (aff.find((a) => a.test === 'test/mymod.test.ts')?.reasons ?? []).length > 0);

fs.rmSync(root, { recursive: true, force: true });

if (json) {
  console.log(JSON.stringify({ ok: failures === 0, failures, gate: 'affected-tests' }));
} else {
  console.log(failures === 0 ? '\nOK — affected-tests proof (0 failures)' : `\nFAIL — affected-tests proof (${failures} failure(s))`);
}
process.exit(failures === 0 ? 0 : 1);

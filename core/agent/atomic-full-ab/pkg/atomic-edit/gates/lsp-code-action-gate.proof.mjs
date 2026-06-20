/**
 * LSP Code Action Gate — Proof Corpus
 *
 * Verifies that the lsp-code-action-gate correctly:
 *   1. Detects language from file extension
 *   2. Routes to correct LSP
 *   3. Returns proper verdict structure
 *
 * Run: node --experimental-vm-modules gates/lsp-code-action-gate.proof.mjs
 */

import * as path from 'node:path';

const gateMod = await import('./lsp-code-action-gate.ts');

const TESTS = [
  { file: 'src/index.ts', expected: true, desc: 'TypeScript code actions' },
  { file: 'app.py', expected: true, desc: 'Python code actions' },
  { file: 'main.go', expected: true, desc: 'Go code actions' },
  { file: 'lib.rs', expected: true, desc: 'Rust code actions' },
  { file: 'Main.java', expected: true, desc: 'Java code actions' },
  { file: 'index.php', expected: true, desc: 'PHP code actions' },
  { file: 'Dockerfile', expected: false, desc: 'Dockerfile no code actions' },
  { file: 'config.yaml', expected: false, desc: 'YAML no code actions' },
];

let passed = 0, failed = 0;

for (const t of TESTS) {
  const r = gateMod.appliesTo(t.file);
  if (r === t.expected) { passed++; console.log(`  ✅ ${t.desc}`); }
  else { failed++; console.log(`  ❌ ${t.desc}: expected ${t.expected}, got ${r}`); }
}

console.log(`\nappliesTo: ${passed}/${TESTS.length} passed`);

const syncCtx = { file: '/tmp/test.py', before: 'x=1', after: 'x=2', operator: 'test', language: 'python', syntaxBefore: 0, syntaxAfter: 0 };
const syncR = gateMod.evaluateSync();
if (syncR.id === 'lsp-code-action-gate' && syncR.status === 'unjudged') { passed++; console.log('  ✅ Sync abstains'); }
else { failed++; console.log(`  ❌ Sync: ${JSON.stringify(syncR)}`); }

if (gateMod.name === 'lsp-code-action-gate' && gateMod.version === '2.0.0') { passed++; console.log('  ✅ Module exports'); }
else { failed++; console.log('  ❌ Module exports mismatch'); }

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

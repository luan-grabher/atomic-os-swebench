/**
 * LSP Completion Gate — Proof Corpus
 *
 * Verifies that the lsp-completion-gate correctly:
 *   1. Detects language from file extension
 *   2. Routes to correct LSP
 *   3. Returns proper verdict structure
 *
 * Run: node --experimental-vm-modules gates/lsp-completion-gate.proof.mjs
 */

import * as path from 'node:path';

const gateMod = await import('./lsp-completion-gate.ts');

const TESTS = [
  { file: 'src/index.ts', expected: true, desc: 'TypeScript completion' },
  { file: 'app.py', expected: true, desc: 'Python completion' },
  { file: 'main.go', expected: true, desc: 'Go completion' },
  { file: 'lib.rs', expected: true, desc: 'Rust completion' },
  { file: 'script.sh', expected: true, desc: 'Bash completion' },
  { file: 'data.json', expected: true, desc: 'JSON completion' },
  { file: 'style.css', expected: true, desc: 'CSS completion' },
  { file: 'index.html', expected: true, desc: 'HTML completion' },
  { file: 'config.yaml', expected: false, desc: 'YAML no completion' },
  { file: 'image.png', expected: false, desc: 'PNG no completion' },
];

let passed = 0, failed = 0;

for (const t of TESTS) {
  const r = gateMod.appliesTo(t.file);
  if (r === t.expected) { passed++; console.log(`  ✅ ${t.desc}`); }
  else { failed++; console.log(`  ❌ ${t.desc}: expected ${t.expected}, got ${r}`); }
}

console.log(`\nappliesTo: ${passed}/${TESTS.length} passed`);

const syncCtx = { file: '/tmp/test.py', before: 'x=1', after: 'x=2', operator: 'test', language: 'python', syntaxBefore: 0, syntaxAfter: 0 };
const syncR = gateMod.evaluateSync(syncCtx);
if (syncR.id === 'lsp-completion-gate' && syncR.status === 'unjudged') { passed++; console.log('  ✅ Sync abstains'); }
else { failed++; console.log(`  ❌ Sync: ${JSON.stringify(syncR)}`); }

if (gateMod.name === 'lsp-completion-gate' && gateMod.version === '1.0.0') { passed++; console.log('  ✅ Module exports'); }
else { failed++; console.log('  ❌ Module exports mismatch'); }

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

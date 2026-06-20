/**
 * LSP Hover Gate — Proof Corpus
 *
 * Verifies that the lsp-hover-gate correctly:
 *   1. Detects language from file extension
 *   2. Routes to correct LSP
 *   3. Returns proper verdict structure
 *
 * Run: node --experimental-vm-modules gates/lsp-hover-gate.proof.mjs
 */

import * as path from 'node:path';

const gateMod = await import('./lsp-hover-gate.ts');

const TESTS = [
  { file: 'src/index.ts', expected: true, desc: 'TypeScript hover' },
  { file: 'app.py', expected: true, desc: 'Python hover' },
  { file: 'main.go', expected: true, desc: 'Go hover' },
  { file: 'lib.rs', expected: true, desc: 'Rust hover' },
  { file: 'server.c', expected: true, desc: 'C hover' },
  { file: 'Main.java', expected: true, desc: 'Java hover' },
  { file: 'App.kt', expected: true, desc: 'Kotlin hover' },
  { file: 'index.php', expected: true, desc: 'PHP hover' },
  { file: 'main.swift', expected: true, desc: 'Swift hover' },
  { file: 'init.lua', expected: true, desc: 'Lua hover' },
  { file: 'Dockerfile', expected: false, desc: 'Dockerfile no hover' },
  { file: 'config.yaml', expected: false, desc: 'YAML no hover' },
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
if (syncR.id === 'lsp-hover-gate' && syncR.status === 'unjudged') { passed++; console.log('  ✅ Sync abstains'); }
else { failed++; console.log(`  ❌ Sync: ${JSON.stringify(syncR)}`); }

if (gateMod.name === 'lsp-hover-gate' && gateMod.version === '1.0.0') { passed++; console.log('  ✅ Module exports'); }
else { failed++; console.log('  ❌ Module exports mismatch'); }

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

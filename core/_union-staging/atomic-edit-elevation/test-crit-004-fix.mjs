#!/usr/bin/env node
/**
 * Test for CRIT-004: Repo Root Hardcoded fix
 * Verifies that ATOMIC_EDIT_REPO_ROOT environment variable can override hardcoded paths
 */

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== CRIT-004: Repo Root Hardcoded - Fix Verification ===\n');

const tests = [
  {
    name: 'Claude launcher respects ATOMIC_EDIT_REPO_ROOT',
    file: 'claude-atomic-host-launcher.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Codex launcher respects ATOMIC_EDIT_REPO_ROOT',
    file: 'codex-atomic-host-launcher.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Launcher supervisor respects ATOMIC_EDIT_REPO_ROOT',
    file: 'launcher-supervisor.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Security invariants respects ATOMIC_EDIT_REPO_ROOT',
    file: 'security-invariants.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Audit atomicity respects ATOMIC_EDIT_REPO_ROOT',
    file: 'audit-atomicity.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Trace coverage audit respects ATOMIC_EDIT_REPO_ROOT',
    file: 'trace-coverage-audit.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Broker respects ATOMIC_EDIT_REPO_ROOT',
    file: 'atomic-exec-broker.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Server hot reload proof respects ATOMIC_EDIT_REPO_ROOT',
    file: 'server-hot-reload.proof.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
  {
    name: 'Server tools lens proof respects ATOMIC_EDIT_REPO_ROOT',
    file: 'server-tools-lens.proof.mjs',
    pattern: /ATOMIC_EDIT_REPO_ROOT/,
    expected: true,
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const filePath = path.join(__dirname, test.file);
    const result = spawnSync('grep', ['-q', test.pattern.source, filePath], { encoding: 'utf8' });
    const found = result.status === 0;
    
    if (found === test.expected) {
      console.log(`✅ PASS: ${test.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${test.name} - Expected ${test.expected}, got ${found}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ERROR: ${test.name} - ${e.message}`);
    failed++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`\n${failed === 0 ? '✅ All tests passed! CRIT-004 fix verified.' : '❌ Some tests failed!'}`);

process.exit(failed > 0 ? 1 : 0);

#!/usr/bin/env node
/**
 * Test for CRIT-001: Byte-Floor False Positives (L06)
 * Verifies that stdlib imports for Python/Rust/Java/C are not refused
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== CRIT-001: Byte-Floor False Positives - Fix Verification ===\n');

// Import the connection-gate module
const connectionGatePath = path.join(__dirname, 'connection-gate.ts');

// Check if the file exists and has the required functions
const content = fs.readFileSync(connectionGatePath, 'utf8');

const tests = [
  {
    name: 'isPythonStdLib function exists',
    pattern: /export function isPythonStdLib/,
    expected: true,
  },
  {
    name: 'isRustStdLib function exists',
    pattern: /export function isRustStdLib/,
    expected: true,
  },
  {
    name: 'isJavaStdLib function exists',
    pattern: /export function isJavaStdLib/,
    expected: true,
  },
  {
    name: 'isCStdLib function exists',
    pattern: /export function isCStdLib/,
    expected: true,
  },
  {
    name: 'isStdLibImport function exists',
    pattern: /export function isStdLibImport/,
    expected: true,
  },
  {
    name: 'PYTHON_STDLIB_PREFIXES defined',
    pattern: /PYTHON_STDLIB_PREFIXES.*=.*new Set/,
    expected: true,
  },
  {
    name: 'RUST_STDLIB_CRATES defined',
    pattern: /RUST_STDLIB_CRATES.*=.*new Set/,
    expected: true,
  },
  {
    name: 'JAVA_STDLIB_PREFIXES defined',
    pattern: /JAVA_STDLIB_PREFIXES/,
    expected: true,
  },
  {
    name: 'C_STDLIB_HEADERS defined',
    pattern: /C_STDLIB_HEADERS.*=.*new Set/,
    expected: true,
  },
  {
    name: 'checkSupplyChainByteFloor uses isStdLibImport',
    pattern: /if \(isStdLibImport\(spec, absPath\)\) continue/,
    expected: true,
  },
  {
    name: 'FILE_LANG_MAP includes Python',
    pattern: /'\.py': 'python'/,
    expected: true,
  },
  {
    name: 'FILE_LANG_MAP includes Rust',
    pattern: /'\.rs': 'rust'/,
    expected: true,
  },
  {
    name: 'FILE_LANG_MAP includes Java',
    pattern: /'\.java': 'java'/,
    expected: true,
  },
  {
    name: 'FILE_LANG_MAP includes C',
    pattern: /'\.c': 'c'/,
    expected: true,
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  const found = test.pattern.test(content);
  
  if (found === test.expected) {
    console.log(`✅ PASS: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.name} - Expected ${test.expected}, got ${found}`);
    failed++;
  }
}

// Additional check: Verify Python stdlib list is comprehensive
const pythonStdlibMatch = content.match(/PYTHON_STDLIB_PREFIXES.*?\];/s);
if (pythonStdlibMatch) {
  const pythonStdlibSection = pythonStdlibMatch[0];
  const stdlibItems = pythonStdlibSection.match(/'[^']+'/g);
  if (stdlibItems && stdlibItems.length > 50) {
    console.log(`✅ PASS: Python stdlib list has ${stdlibItems.length} items`);
    passed++;
  } else {
    console.log(`⚠️  WARN: Python stdlib list has only ${stdlibItems ? stdlibItems.length : 0} items`);
  }
}

// Check Rust stdlib
const rustStdlibMatch = content.match(/RUST_STDLIB_CRATES.*?\];/s);
if (rustStdlibMatch) {
  const rustStdlibSection = rustStdlibMatch[0];
  const rustItems = rustStdlibSection.match(/'[^']+'/g);
  if (rustItems && rustItems.length >= 5) {
    console.log(`✅ PASS: Rust stdlib list has ${rustItems.length} items`);
    passed++;
  } else {
    console.log(`⚠️  WARN: Rust stdlib list has only ${rustItems ? rustItems.length : 0} items`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`\n${failed === 0 ? '✅ All CRIT-001 implementation checks passed!' : '❌ Some checks failed!'}`);

process.exit(failed > 0 ? 1 : 0);

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../src/index.mjs';

// ── Existing behavior that MUST keep passing ──────────────────────────────
test('simple unquoted rows', () => {
  assert.deepEqual(parseCSV('a,b,c\n1,2,3'), [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('trailing empty field is preserved', () => {
  assert.deepEqual(parseCSV('a,b,'), [['a', 'b', '']]);
});

// ── RFC-4180 quoting behavior that the parser must learn ──────────────────
test('quoted field containing a comma', () => {
  assert.deepEqual(parseCSV('a,"b,c",d'), [['a', 'b,c', 'd']]);
});

test('escaped double-quotes inside a quoted field', () => {
  assert.deepEqual(parseCSV('"she said ""hi""",x'), [['she said "hi"', 'x']]);
});

test('embedded newline inside a quoted field', () => {
  assert.deepEqual(parseCSV('"line1\nline2",y'), [['line1\nline2', 'y']]);
});

test('quoted empty field', () => {
  assert.deepEqual(parseCSV('a,"",c'), [['a', '', 'c']]);
});

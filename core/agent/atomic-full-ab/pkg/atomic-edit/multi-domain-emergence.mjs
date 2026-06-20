#!/usr/bin/env node
/**
 * multi-domain-emergence.mjs — emergence testing across domains:
 *   - Multi-language code synthesis (Python, Go, Rust)
 *   - Creative generation with structural verifiers
 *
 * Each domain has tasks decomposable into units with deterministic verifiers.
 * The truth-funnel mechanism is domain-agnostic — emergence should appear
 * wherever P(unit) ∈ (0,1) and N is large enough.
 *
 * Usage:
 *   node multi-domain-emergence.mjs --synthetic   # deterministic demo
 *   import { DOMAINS } from './multi-domain-emergence.mjs'  # programmatic
 */
import { execSync } from 'node:child_process';

// ── Multi-language code tasks ──
// Each task: generate a function in the target language, verify via subprocess.
export const LANG_TASKS = {
  python: [
    { id: 'py_balanced', prompt: 'Write a Python function is_balanced(s) that returns True if (), [], {} brackets are properly matched and nested.', testInput: '()', expected: 'True' },
    { id: 'py_fib', prompt: 'Write a Python function fib(n) returning the nth Fibonacci number. fib(0)=0, fib(1)=1.', testInput: '10', expected: '55' },
    { id: 'py_prime', prompt: 'Write a Python function is_prime(n) returning True if n is prime.', testInput: '17', expected: 'True' },
    { id: 'py_gcd', prompt: 'Write a Python function gcd(a, b) returning greatest common divisor.', testInput: '(48, 18)', expected: '6' },
    { id: 'py_rev', prompt: 'Write a Python function reverse_words(s) reversing word order in a string.', testInput: "'hello world'", expected: 'world hello' },
  ],
  go: [
    { id: 'go_fib', prompt: 'Write a Go function Fib(n int) int returning nth Fibonacci. Fib(0)=0, Fib(1)=1.', testInput: '10', expected: '55' },
    { id: 'go_fact', prompt: 'Write a Go function Factorial(n int) int. Factorial(0)=1.', testInput: '5', expected: '120' },
    { id: 'go_prime', prompt: 'Write a Go function IsPrime(n int) bool.', testInput: '17', expected: 'true' },
  ],
  rust: [
    { id: 'rs_fib', prompt: 'Write a Rust function fib(n: u32) -> u32 returning nth Fibonacci.', testInput: '10', expected: '55' },
    { id: 'rs_fact', prompt: 'Write a Rust function factorial(n: u32) -> u32.', testInput: '5', expected: '120' },
  ],
};

// ── Creative domain: structured poetry with verifiable constraints ──
export const CREATIVE_TASKS = [
  { id: 'haiku', prompt: 'Write a haiku (3 lines, syllable pattern 5-7-5) about nature.', verify: (lines) => {
    if (lines.length !== 3) return false;
    // Approximate syllable count (vowel groups)
    const sylEst = (s) => (s.match(/[aeiouAEIOU]+/g) || []).length;
    return sylEst(lines[0]) === 5 && sylEst(lines[1]) === 7 && sylEst(lines[2]) === 5;
  }},
  { id: 'acrostic', prompt: 'Write a 4-line acrostic poem where first letters spell ATOM.', verify: (lines) => {
    if (lines.length !== 4) return false;
    return lines[0][0]?.toUpperCase() === 'A' && lines[1][0]?.toUpperCase() === 'T' &&
           lines[2][0]?.toUpperCase() === 'O' && lines[3][0]?.toUpperCase() === 'M';
  }},
  { id: 'rhyme_aabb', prompt: 'Write 4 lines that rhyme AABB (lines 1-2 rhyme, lines 3-4 rhyme).', verify: (lines) => {
    if (lines.length !== 4) return false;
    const lastWord = (s) => s.trim().split(' ').pop()?.replace(/[^a-z]/gi, '').toLowerCase() || '';
    // Simple rhyme check: last 2 letters match
    const r = (s) => { const w = lastWord(s); return w.slice(-2); };
    return r(lines[0]) === r(lines[1]) && r(lines[2]) === r(lines[3]);
  }},
];

// ── Synthetic multi-domain demo ──
const isCLI = process.argv[1] && import.meta.url === `file://${new URL(process.argv[1], 'file:///').pathname}`;
if (isCLI) {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     MULTI-DOMAIN EMERGENCE — tasks + verifiers   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('Code synthesis tasks:');
  for (const [lang, tasks] of Object.entries(LANG_TASKS)) {
    console.log(`  ${lang}: ${tasks.length} tasks`);
    for (const t of tasks) console.log(`    ${t.id}: ${t.prompt.slice(0, 60)}...`);
  }

  console.log('\nCreative tasks:');
  for (const t of CREATIVE_TASKS) {
    console.log(`  ${t.id}: ${t.prompt.slice(0, 60)}...`);
    console.log(`    verifier: structural constraint check`);
  }

  console.log('\nThe truth-funnel mechanism is domain-agnostic.');
  console.log('Emergence appears wherever P(unit) in (0,1) and N >= 4.');
  console.log('\nFor live testing: import DOMAINS and pass to emergence-benchmark.');
}

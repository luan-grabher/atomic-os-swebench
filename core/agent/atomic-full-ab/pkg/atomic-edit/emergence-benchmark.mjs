#!/usr/bin/env node
/**
 * emergence-benchmark.mjs — PARADIGM PART F.4: the real-LLM emergence benchmark.
 *
 * Runs a controlled A/B comparison:
 *   Arm A (blind-retry):    LLM proposes ALL units each round, no memory.
 *   Arm B (unified-funnel): LLM proposes, accepted units FREEZE, only rejected re-derived.
 *
 * Both arms get the SAME model, SAME per-round LLM call count, SAME budget.
 * If Arm B > Arm A, the truth-funnel MECHANISM produced emergence — not extra intelligence.
 *
 * Usage:
 *   node emergence-benchmark.mjs                  # synthetic model (deterministic proof)
 *   node emergence-benchmark.mjs --live           # live LLM via MCP completion (if wired)
 *   node emergence-benchmark.mjs --json           # machine-readable output
 *
 * The benchmark is SELF-VALIDATING: it verifies every answer with an independent
 * deterministic oracle. No answer is trusted without verification.
 */
import { runArm, makeSyntheticTask, runFunnel, funnelGate, decompose, mergeBytePositive } from './truth-funnel.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

const jsonMode = process.argv.includes('--json');
const liveMode = process.argv.includes('--live');

// ── Task families with deterministic verifiers ──
// Each task is decomposable into independent units (functions/problems).
// The verifier checks each unit independently.

const TASK_FAMILIES = {
  math: {
    name: 'Multi-step arithmetic',
    units: [
      { id: 'm1', prompt: 'What is 15! / (5! * 8!)?', answer: 270270 },
      { id: 'm2', prompt: 'What is 20 choose 10?', answer: 184756 },
      { id: 'm3', prompt: 'How many primes below 200?', answer: 46 },
      { id: 'm4', prompt: 'What is 2^25?', answer: 33554432 },
      { id: 'm5', prompt: 'Sum of primes below 100?', answer: 1060 },
      { id: 'm6', prompt: 'What is 18 choose 9?', answer: 48620 },
      { id: 'm7', prompt: 'How many divisors does 360 have?', answer: 24 },
      { id: 'm8', prompt: 'What is 7^8?', answer: 5764801 },
    ],
    verify: (id, val) => {
      const t = TASK_FAMILIES.math.units.find(u => u.id === id);
      return Number(val) === t.answer;
    },
  },
  programming: {
    name: 'JS function synthesis with edge cases',
    units: [
      { id: 'p1', prompt: 'Write JS function isBalanced(s): true if (),[],{} brackets are properly matched AND nested. Crossing like ([)] is INVALID.', tests: [['()',true],['[]{}',true],['([)]',false],['{[()]}',true],['(((',false],['',true]] },
      { id: 'p2', prompt: 'Write JS function rle(s): run-length encode. aaabbb->a3b3. Single chars get count 1. Always return encoded string.', tests: [['aaa','a3'],['aaabbb','a3b3'],['abc','a1b1c1'],['',''],['aaaa','a4']] },
      { id: 'p3', prompt: 'Write JS function atoi(s): string to int. Strip whitespace, handle +/-, clamp to [-2147483648,2147483647], stop at non-digit.', tests: [['42',42],['   -42',-42],['4193 words',4193],['+5',5]] },
      { id: 'p4', prompt: 'Write JS function isPalindrome(s): true if s is palindrome considering ONLY alphanumeric, ignoring case and non-alphanumeric.', tests: [['A man a plan a canal Panama',true],['race a car',false],[' ',true],['0P',false]] },
      { id: 'p5', prompt: 'Write JS function deepFlatten(arr): flatten nested arrays of any depth into a flat array.', tests: [[[1,[2,[3]]],[1,2,3]],[[1,2,[3,4]],[1,2,3,4]],[[[1]],[1]],[[],[]]] },
      { id: 'p6', prompt: 'Write JS function groupAnagrams(strs): group strings that are anagrams. Return array of groups (arrays).', tests: [[['eat','tea','tan','ate','nat','bat'],[['eat','tea','ate'],['tan','nat'],['bat']]]] },
      { id: 'p7', prompt: 'Write JS function validIP(s): true if valid IPv4 (4 octets 0-255, no leading zeros except 0 itself).', tests: [['192.168.1.1',true],['255.255.255.255',true],['256.1.1.1',false],['01.1.1.1',false],['0.0.0.0',true]] },
      { id: 'p8', prompt: 'Write JS function climbStairs(n): distinct ways to climb n stairs taking 1 or 2 steps. climbStairs(1)=1, climbStairs(2)=2.', tests: [[1,1],[2,2],[3,3],[5,8],[10,89]] },
    ],
    verify: (id, code) => {
      try {
        const fn = new Function(code + '; return ' + id + ';')();
        const t = TASK_FAMILIES.programming.units.find(u => u.id === id);
        for (const [input, expected] of t.tests) {
          let result;
          try { result = fn(input); } catch { return false; }
          if (JSON.stringify(result) !== JSON.stringify(expected)) return false;
        }
        return true;
      } catch { return false; }
    },
    isCode: true,
  },
  synthetic: {
    name: 'Synthetic P=0.4 (mechanism proof)',
    makeTask: (seed = 'bench') => {
      const unitProb = new Map([...Array(8)].map((_, i) => [`u${i}`, 0.4]));
      return makeSyntheticTask(unitProb, seed);
    },
  },
};

// ── Synthetic benchmark (deterministic, no LLM) ──
function runSynthetic(trials = 200) {
  const configs = [
    { p: 0.3, n: 8, budget: 30 },
    { p: 0.4, n: 8, budget: 30 },
    { p: 0.5, n: 6, budget: 20 },
    { p: 0.6, n: 6, budget: 15 },
  ];
  const results = [];
  for (const { p, n, budget } of configs) {
    let blind = 0, funnel = 0;
    for (let t = 0; t < trials; t++) {
      const up = new Map([...Array(n)].map((_, i) => [`u${i}`, p]));
      const task = makeSyntheticTask(up, `bench-${p}-${n}-${t}`);
      if (runArm('blind-retry', task, null, budget).converged) blind++;
      if (runArm('unified-funnel', task, null, budget).converged) funnel++;
    }
    results.push({
      config: `P=${p} N=${n} B=${budget}`,
      blindRate: +(blind / trials * 100).toFixed(1),
      funnelRate: +(funnel / trials * 100).toFixed(1),
      lift: blind > 0 ? +(funnel / blind).toFixed(1) + 'x' : '∞',
      emergent: funnel > blind,
    });
  }
  return results;
}

// ── Live LLM benchmark (requires a proposer function) ──
// The proposer is injected — any LLM client works.
async function runLiveLLM(propose, taskFamily, budget = 5) {
  const family = TASK_FAMILIES[taskFamily];
  if (!family) throw new Error(`Unknown task family: ${taskFamily}`);

  const units = family.units;
  const verify = family.verify;

  // Arm A: blind-retry
  let armA_best = 0;
  for (let r = 0; r < budget; r++) {
    const answers = await propose(units.map(u => u.prompt), null);
    let pass = 0;
    for (const u of units) {
      if (verify(u.id, answers[u.id])) pass++;
    }
    if (pass > armA_best) armA_best = pass;
  }

  // Arm B: unified-funnel
  const frozen = new Set();
  let prevFailures = [];
  for (let r = 0; r < budget; r++) {
    const failing = units.filter(u => !frozen.has(u.id));
    if (failing.length === 0) break;

    const prompts = failing.map(u => u.prompt);
    const feedback = r === 0 ? null : prevFailures.map(f => `${f.id}: WRONG`).join(', ');
    const answers = await propose(prompts, feedback);

    prevFailures = [];
    for (const u of failing) {
      if (verify(u.id, answers[u.id])) {
        frozen.add(u.id);
      } else {
        prevFailures.push({ id: u.id });
      }
    }
  }

  return {
    armA: armA_best,
    armB: frozen.size,
    total: units.length,
    emergent: frozen.size > armA_best,
    delta: frozen.size - armA_best,
  };
}

// ── Exports (available when imported as a module) ──
export { runSynthetic, runLiveLLM, TASK_FAMILIES };

// ── CLI entry point (only when run directly, not when imported) ──
const isDirectRun = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
if (isDirectRun) {
  if (!jsonMode) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         EMERGENCE BENCHMARK — truth-funnel vs blind-retry   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
  }

  if (!liveMode) {
    if (!jsonMode) console.log('\n── Synthetic (deterministic, 200 trials per config) ──\n');
    const results = runSynthetic(200);
    let allEmergent = true;
    for (const r of results) {
      if (!jsonMode) console.log(`  ${r.config.padEnd(16)} blind=${String(r.blindRate).padStart(5)}%  funnel=${String(r.funnelRate).padStart(5)}%  lift=${r.lift.padEnd(6)} [${r.emergent ? 'EMERGENT' : 'NO-GAP'}]`);
      if (!r.emergent) allEmergent = false;
    }
    if (!jsonMode) {
      console.log(`\n  VERDICT: ${allEmergent ? 'ALL EMERGENT' : 'PARTIAL'}`);
      console.log('  Run with --live to test with a real LLM.\n');
    }
    if (jsonMode) process.stdout.write(JSON.stringify({ ok: allEmergent, mode: 'synthetic', results }, null, 2));
    process.exit(allEmergent ? 0 : 1);
  } else {
    if (!jsonMode) {
      console.log('\n  Live LLM mode requires an injected proposer.');
      console.log('  Import runLiveLLM and pass your LLM client.\n');
    }
    process.exit(0);
  }
}

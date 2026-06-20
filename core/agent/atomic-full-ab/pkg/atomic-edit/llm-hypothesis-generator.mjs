#!/usr/bin/env node
/**
 * llm-hypothesis-generator.mjs — Darwin-Gödel with an LLM in the loop.
 *
 * The existing autonomous-evolution.mjs mines couplings STATISTICALLY from
 * the corpus. This module adds an LLM layer: after statistical mining, the
 * LLM FORMULATES a causal hypothesis about WHY the coupling exists.
 *
 * The LLM doesn't decide what to synthesize — the statistical miner does that.
 * The LLM provides CAUSAL UNDERSTANDING: it explains the coupling, predicts
 * related couplings, and suggests invariant names.
 *
 * This is the "Gödel" half: the system doesn't just PATTERN-MATCH its failures,
 * it UNDERSTANDS them (to the extent the LLM can provide understanding).
 *
 * Usage:
 *   import { generateCausalHypothesis } from './llm-hypothesis-generator.mjs';
 *   const hypothesis = await generateCausalHypothesis(coupling, propose);
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.ATOMIC_EDIT_REPO_ROOT || path.resolve(here, '..', '..', '..', 'core', 'atomic-edit');

/**
 * Read recent corpus failures for context.
 */
function readRecentFailures(count = 10) {
  const file = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-count).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

/**
 * Generate a causal hypothesis about a coupling using an LLM.
 * @param {Object} coupling  { antecedent, consequent, lift, holdoutConfidence }
 * @param {(prompt) => Promise<string>} propose  LLM completion function
 * @returns {Promise<{hypothesis, predictedRelated, suggestedName}>}
 */
export async function generateCausalHypothesis(coupling, propose) {
  const failures = readRecentFailures(5);
  const failureSummary = failures.map(f => `- ${f.invariantId}: ${f.counterexample?.reason || 'unknown'}`).join('\n');

  const prompt = `You are analyzing a code verification system's failure patterns.

The system discovered a STATISTICAL COUPLING in its own failure history:
  When "${coupling.antecedent}" fails, "${coupling.consequent}" also tends to fail.
  Statistical lift: ${coupling.lift}x (held-out confidence: ${coupling.holdoutConfidence})

Recent failures in the system:
${failureSummary}

Answer these questions:
1. WHY does this coupling exist? What is the causal mechanism?
2. What OTHER couplings would you predict from this mechanism?
3. What would you name an invariant that captures this coupling?

Respond as JSON: {"hypothesis": "...", "predictedRelated": ["...", "..."], "suggestedName": "..."}`;

  try {
    const response = await propose(prompt);
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    return {
      hypothesis: parsed.hypothesis || 'No hypothesis generated',
      predictedRelated: parsed.predictedRelated || [],
      suggestedName: parsed.suggestedName || 'auto-coupling',
    };
  } catch {
    return { hypothesis: 'LLM hypothesis generation failed', predictedRelated: [], suggestedName: 'auto-coupling' };
  }
}

// CLI
const isCLI = process.argv[1] && import.meta.url === `file://${new URL(process.argv[1], 'file:///').pathname}`;
if (isCLI) {
  console.log('LLM Hypothesis Generator');
  console.log('Import generateCausalHypothesis() and pass a coupling + LLM proposer.');
  console.log('\nThe LLM provides CAUSAL UNDERSTANDING of statistical couplings.');
  console.log('The statistical miner still decides what to synthesize.');
  console.log('The LLM explains WHY, predicts RELATED couplings, and names invariants.');
}

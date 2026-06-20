#!/usr/bin/env node
/**
 * friction-integration.mjs — wires the friction router into the autonomous loop.
 *
 * Reads the disproof corpus, builds wall events per (agent, invariant), constructs
 * the friction ledger, and demonstrates stigmergic task routing.
 *
 * The friction router closes atomic's coordination gap: agents self-route to
 * invariants where they have the LEAST accumulated friction (highest trust).
 * The pheromone is a RECOMPUTABLE DISPROOF WITNESS, not a bare counter.
 *
 * Usage:
 *   node friction-integration.mjs                    # show friction state + routing
 *   node friction-integration.mjs --route <invariant>  # route a task to best agent
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFrictionLedger, frictionFor, trustTier, routeTask, routeBatch, verifyPheromone } from './friction-router.mjs';
import * as crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.ATOMIC_EDIT_REPO_ROOT || path.resolve(here, '..', '..', '..', 'core', 'atomic-edit');
const corpusFile = path.join(repoRoot, '.atomic', 'disproof-corpus.jsonl');

function readCorpus() {
  if (!fs.existsSync(corpusFile)) return [];
  return fs.readFileSync(corpusFile, 'utf8').trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// Simulated agent pool (in production, these would be real Codex/Claude/OpenCode agents)
const AGENTS = ['claude', 'codex', 'opencode'];

function buildWallEvents(records) {
  // Derive wall events from corpus: each record is a failure by an "agent" on an invariant
  // The agent is derived from the record's source (deterministic hash → agent pool)
  // agent derived from recordSha256 hash
  return records.map((r, i) => {
    const hash = crypto.createHash('sha256').update(r.recordSha256 || String(i)).digest('hex');
    const agent = AGENTS[parseInt(hash.slice(0, 1), 16) % AGENTS.length];
    const invariantId = r.invariantId || `unknown-${i}`;
    return { agent, invariantId, seq: r.generation || i, witness: r.counterexample };
  });
}

function main() {
  const records = readCorpus();
  if (records.length === 0) {
    console.log('No corpus records found. Run corpus-accumulator first.');
    process.exit(0);
  }

  const events = buildWallEvents(records);
  const state = buildFrictionLedger(events);

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     FRICTION ROUTER — stigmergic coordination    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Corpus: ${records.length} records → ${events.length} wall events`);
  console.log(`Agents: ${AGENTS.join(', ')}\n`);

  // Show friction per agent per invariant (top 5)
  console.log('Friction summary (top invariants):');
  const invariantSet = new Set(events.map(e => e.invariantId));
  for (const invariant of [...invariantSet].slice(0, 5)) {
    const shortName = invariant.replace('node ', '').replace(' --json', '').replace('gates/', '').slice(0, 40);
    const frictions = AGENTS.map(a => {
      const f = frictionFor(state, a, invariant);
      const tier = trustTier(state, a, invariant);
      return `${a}:${f.hits}h/${tier}`;
    });
    console.log(`  ${shortName.padEnd(42)} ${frictions.join('  ')}`);
  }

  // Route a batch of tasks
  console.log('\nTask routing (stigmergic — each task goes to least-friction agent):');
  const tasks = [...invariantSet].slice(0, 8).map(inv => ({ invariantIds: [inv] }));
  const assignment = routeBatch(tasks, AGENTS, state);
  for (let i = 0; i < assignment.length; i++) {
    const inv = tasks[i].invariantIds[0].replace('node ', '').replace(' --json', '').replace('gates/', '').slice(0, 35);
    console.log(`  ${inv.padEnd(37)} → agent:${assignment[i].agent}`);
  }

  // Verify pheromone integrity (forgery-refused)
  const sampleWitness = events.find(e => e.witness);
  if (sampleWitness) {
    const digest = crypto.createHash('sha256').update(JSON.stringify({ invariantId: sampleWitness.invariantId, facts: [] })).digest('hex');
    const pheromone = { witness: sampleWitness.witness, digest: crypto.createHash('sha256').update(JSON.stringify({ invariantId: sampleWitness.invariantId, facts: [] })).digest('hex') };
    console.log(`\nPheromone verification: ${verifyPheromone(pheromone) ? 'VALID' : 'FORGED (refused)'}`);
  }

  console.log('\nThe pheromone field routes tasks to specialized agents.');
  console.log('No central orchestrator decides — the stigmergic field does.');
}

main();

#!/usr/bin/env node
/**
 * continuous-emergence-loop.mjs — driver that runs the autonomous evolution
 * pipeline periodically and records each cycle to the emergence feed.
 *
 * Each cycle:
 *   1. hypothesis-generator.mjs  — mine corpus for new coupling invariants
 *   2. autonomous-evolution.mjs  — synthesize a self-contained proof gate from
 *                                  the strongest held-out-validated coupling
 *   3. emergence-observatory.mjs — measure deviation signals (novelty / niche /
 *                                  topology / meta-laws) and append residuals
 *
 * Output: appends one JSONL entry per cycle to
 *   {repoRoot}/.atomic/emergence-feed.jsonl
 * with kind 'cycle', the proposals synthesized, the observatory residuals, and
 * the wallclock duration. Safe to run concurrently with the MCP — every step
 * is read-only on the corpus and emits proposals; admission through the full
 * self-expansion lattice remains the judge of whether to apply them.
 *
 * Designed to be invoked by a launchd timer (see
 * continuous-emergence-loop.plist). Also runnable directly:
 *   node continuous-emergence-loop.mjs [--once]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
// Default the loop root to the atomic-edit source tree itself (where the
// disproof corpus, lesson rules, and emergence feed already live). Override
// with ATOMIC_EDIT_REPO_ROOT to point at a different workspace (e.g. /kloel
// when invoked by launchd for the live MCP's repoRoot).
const repoRoot = process.env.ATOMIC_EDIT_REPO_ROOT || here;
const feedPath = path.join(repoRoot, '.atomic', 'emergence-feed.jsonl');
const logDir = path.join(repoRoot, '.atomic', 'emergence-logs');
fs.mkdirSync(logDir, { recursive: true });

const once = process.argv.includes('--once');
const cycleMs = once ? 0 : 2 * 60 * 60 * 1000; // 2 hours between cycles

function ts() { return Date.now(); }
function iso() { return new Date().toISOString(); }
function appendFeed(record) {
  fs.appendFileSync(feedPath, JSON.stringify({ v: 1, ts: ts(), ...record }) + '\n');
}
function runScript(name) {
  const t0 = Date.now();
  const logFile = path.join(logDir, name + '-' + iso().replace(/[:.]/g, '-') + '.log');
  const res = spawnSync(process.execPath, [path.join(here, name + '.mjs')], {
    cwd: here,
    encoding: 'utf8',
    timeout: 5 * 60 * 1000,
    env: { ...process.env, ATOMIC_EDIT_REPO_ROOT: repoRoot },
  });
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  let parsed = null;
  try { parsed = JSON.parse(stdout); } catch { /* not JSON */ }
  try { fs.writeFileSync(logFile, `=== ${name} ${iso()} ===\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`); } catch {}
  return { name, ok: res.status === 0, durationMs: Date.now() - t0, parsed, stdoutHead: stdout.slice(0, 240), stderrHead: stderr.slice(0, 240), logFile };
}

async function cycle() {
  const cycleStart = ts();
  const steps = [];
  for (const s of ['../atomic-edit-evolution/corpus-accumulator', 'hypothesis-generator', 'autonomous-evolution', 'emergence-observatory']) {
    const r = runScript(s);
    steps.push(r);
    if (!r.ok) {
      appendFeed({ kind: 'cycle-error', atStep: s, cycleStart, durationMs: Date.now() - cycleStart, step: r });
      return false;
    }
  }
  appendFeed({
    kind: 'cycle',
    cycleStart,
    durationMs: Date.now() - cycleStart,
    steps: steps.map((s) => ({ name: s.name, ok: s.ok, durationMs: s.durationMs, parsed: s.parsed })),
  });
  return true;
}

async function main() {
  // initial marker so the feed shows the loop is alive even if cycle has no proposals
  appendFeed({ kind: 'loop-start', once, intervalMs: cycleMs, pid: process.pid });
  if (once) {
    await cycle();
    appendFeed({ kind: 'loop-end', reason: 'once' });
    return;
  }
  // periodic mode: run, sleep, repeat. launchd StartInterval also wakes us,
  // but if invoked directly we self-schedule so a single process owns the loop.
  for (;;) {
    try { await cycle(); } catch (e) {
      appendFeed({ kind: 'cycle-crash', error: e?.message ?? String(e) });
    }
    await new Promise((r) => setTimeout(r, cycleMs));
  }
}

main().catch((e) => { console.error('continuous-emergence-loop crashed:', e); process.exit(1); });

/**
 * machine-lifetime-census.mjs — PARADIGM L15: a MACHINE-WIDE lifetime supervisor primitive.
 *
 * The parent-death reaper (L02) bounds ONE host stack: a broker self-reaps when ITS owner dies. But the
 * concurrent-surgery hazard is MACHINE-WIDE — K agent host stacks (Claude/Codex/OpenCode across projects)
 * editing trees at once. This module gives the machine-wide view + enforcement the reaper cannot: census
 * every atomic process across ALL hosts, sum resource use, and find/reap the ppid=1 ORPHANS (the only
 * unbounded term — live stacks are bounded by K, orphans are not).
 *
 * Pure read via `ps`; `reapOrphans` only SIGKILLs ppid=1 processes matching the pattern (never a live-parented
 * one). ps-absent → honest empty census (never a false "0 orphans").
 */
import { execSync } from 'node:child_process';

const ATOMIC_RE = /atomic-exec-broker\.mjs|launcher-supervisor\.mjs|lsp-router\.mjs/;

export function psRows() {
  let out;
  try { out = execSync('ps -axo pid,ppid,rss,command', { encoding: 'utf8' }); }
  catch { return null; } // ps unavailable → honest "cannot judge"
  return out.split('\n').slice(1)
    .map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/))
    .filter(Boolean)
    .map((m) => ({ pid: +m[1], ppid: +m[2], rssKB: +m[3], cmd: m[4] }));
}

/**
 * Machine-wide census of atomic lifetime. pattern defaults to the atomic broker/supervisor/router set.
 * @returns {{ available:boolean, procs:number, totalRssMB:number, orphans:number[], hostStacks:number } }
 */
export function census(pattern = ATOMIC_RE) {
  const rows = psRows();
  if (rows === null) return { available: false, procs: 0, totalRssMB: 0, orphans: [], hostStacks: 0 };
  const live = new Set(rows.map((r) => r.pid));
  const matched = rows.filter((r) => pattern.test(r.cmd));
  const orphans = matched.filter((r) => r.ppid === 1 || !live.has(r.ppid)).map((r) => r.pid);
  const supervisors = matched.filter((r) => /launcher-supervisor\.mjs/.test(r.cmd) && r.ppid !== 1 && live.has(r.ppid));
  const totalRssMB = Math.round(matched.reduce((s, r) => s + r.rssKB, 0) / 1024);
  return { available: true, procs: matched.length, totalRssMB, orphans, hostStacks: supervisors.length };
}

/** Reap (SIGKILL) every ppid=1 / dead-parented orphan matching the pattern. Returns reaped pids. */
export function reapOrphans(pattern = ATOMIC_RE) {
  const { orphans } = census(pattern);
  const reaped = [];
  for (const pid of orphans) { try { process.kill(pid, 'SIGKILL'); reaped.push(pid); } catch { /* gone */ } }
  return reaped;
}

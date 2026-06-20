#!/usr/bin/env node
/**
 * Atomic Process Watchdog
 * Ensures that orphaned tsserver, language servers, and atomic helper processes
 * are actively reaped if their parent process dies, solving L21 (process-leak debt).
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

const WATCH_COMM_NAMES = ['tsserver', 'typescript-language-server', 'node', 'atomic-write-broker'];

function getProcessTree() {
  try {
    const out = execSync('ps -eo pid,ppid,comm', { encoding: 'utf8' });
    const lines = out.trim().split('\n').slice(1);
    const processes = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parseInt(parts[0], 10),
        ppid: parseInt(parts[1], 10),
        comm: parts.slice(2).join(' ')
      };
    });
    return processes;
  } catch {
    return [];
  }
}

function reapOrphans() {
  const procs = getProcessTree();
  let reaped = 0;

  for (const p of procs) {
    if (p.ppid === 1) { // Orphaned process attached to init
      const isTarget = WATCH_COMM_NAMES.some(name => p.comm.includes(name) || p.comm.endsWith(name));
      if (isTarget) {
        try {
          process.kill(p.pid, 'SIGKILL');
          reaped++;
        } catch {
          // Process may have already exited
        }
      }
    }
  }

  return reaped;
}

if (process.argv.includes('--run-once')) {
  const reaped = reapOrphans();
  console.log(`[atomic-watchdog] Reaped ${reaped} orphaned process(es).`);
  process.exit(0);
} else {
  console.log('[atomic-watchdog] Starting daemon to reap orphaned processes...');
  setInterval(() => {
    const reaped = reapOrphans();
    if (reaped > 0) {
      console.log(`[atomic-watchdog] Reaped ${reaped} orphaned process(es).`);
    }
  }, 60000); // Check every 60 seconds
}

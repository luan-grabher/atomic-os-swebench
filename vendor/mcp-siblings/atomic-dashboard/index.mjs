import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the repository root (assuming it's 3 levels up from this script)
const repoRoot = path.resolve(__dirname, '../../../');
const atomicDir = path.join(repoRoot, '.atomic');
const locksFile = path.join(atomicDir, 'swarm-locks-ledger.jsonl');
const tasksFile = path.join(atomicDir, 'swarm-tasks-ledger.jsonl');
const sentinelFile = path.join(atomicDir, 'sentinel-events-ledger.jsonl');
const memoryFile = path.join(atomicDir, 'semantic-memory-ledger.jsonl');
const osExecFile = path.join(atomicDir, 'os-exec-ledger.jsonl');
const swarmFetchFile = path.join(atomicDir, 'swarm-fetch-ledger.jsonl');
const swarmBatchFile = path.join(atomicDir, 'swarm-batch-ledger.jsonl');

// GAP-13: Detect TTY vs piped output
const isTTY = !!process.stdout.isTTY;

// Terminal colors
const _colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  
  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

// When piped (non-TTY), all color codes resolve to empty strings
const colors = new Proxy(_colors, {
  get(target, prop) {
    return isTTY ? target[prop] : '';
  }
});

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').filter(line => line.trim() !== '').map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    return [];
  }
}

function computeActiveLocks(ledger) {
  const locks = new Map();
  ledger.forEach(entry => {
    const key = entry.resource || entry.lockId || entry.id;
    if (key) {
      locks.set(key, entry);
    }
  });
  return Array.from(locks.values()).filter(l => 
    l.action !== 'release' && 
    l.status !== 'released' &&
    l.event !== 'release'
  );
}

function computeActiveTasks(ledger) {
  const tasks = new Map();
  ledger.forEach(entry => {
    const key = entry.taskId || entry.id;
    if (key) {
      tasks.set(key, entry);
    }
  });
  return Array.from(tasks.values()).filter(t => 
    t.status !== 'completed' && 
    t.status !== 'failed' && 
    t.action !== 'complete' &&
    t.event !== 'complete'
  );
}

function render() {
  // Read all ledgers
  const locksLedger = readJsonl(locksFile);
  const tasksLedger = readJsonl(tasksFile);
  const sentinelLedger = readJsonl(sentinelFile);
  const memoryLedger = readJsonl(memoryFile);
  const osExecLedger = readJsonl(osExecFile);
  const swarmFetchLedger = readJsonl(swarmFetchFile);
  const swarmBatchLedger = readJsonl(swarmBatchFile);

  const activeLocks = computeActiveLocks(locksLedger);
  const activeTasks = computeActiveTasks(tasksLedger);

  const recentLocks = locksLedger.slice(-5);
  const recentTasks = tasksLedger.slice(-5);

  // GAP-13: Only clear screen when running in a TTY
  if (isTTY) {
    console.clear();
  }

  console.log(`${colors.bgCyan}${colors.fgBlack}${colors.bright}   ATOMIC ECOSYSTEM REAL-TIME DASHBOARD   ${colors.reset}`);
  console.log(`${colors.dim}Monitoring: ${atomicDir}${colors.reset}\n`);

  // ── STATUS SUMMARY (all 7 ledgers) ──
  console.log(`${colors.bright}STATUS SUMMARY:${colors.reset}`);

  const ledgerStatus = (file, ledger, label, activeCount) => {
    if (!fs.existsSync(file)) {
      return `${colors.fgYellow}Waiting for ledger... (0 entries)${colors.reset}`;
    }
    const active = activeCount !== undefined ? `Active: ${activeCount}, ` : '';
    return `${colors.fgGreen}${active}Total: ${ledger.length}${colors.reset}`;
  };

  console.log(`- Swarm Locks    : ${ledgerStatus(locksFile, locksLedger, 'Locks', activeLocks.length)}`);
  console.log(`- Swarm Tasks    : ${ledgerStatus(tasksFile, tasksLedger, 'Tasks', activeTasks.length)}`);
  console.log(`- Sentinel Events: ${ledgerStatus(sentinelFile, sentinelLedger, 'Sentinel')}`);
  console.log(`- Semantic Memory: ${ledgerStatus(memoryFile, memoryLedger, 'Memory')}`);
  console.log(`- OS Exec Audit  : ${ledgerStatus(osExecFile, osExecLedger, 'OsExec')}`);
  console.log(`- Swarm Fetch    : ${ledgerStatus(swarmFetchFile, swarmFetchLedger, 'Fetch')}`);
  console.log(`- Swarm Batch    : ${ledgerStatus(swarmBatchFile, swarmBatchLedger, 'Batch')}`);
  console.log('');

  // ── ACTIVE SWARM LOCKS ──
  console.log(`${colors.bgBlue}${colors.fgWhite}${colors.bright}  ACTIVE SWARM LOCKS  ${colors.reset}`);
  if (activeLocks.length === 0) {
    console.log(`${colors.dim}No active locks.${colors.reset}`);
  } else {
    activeLocks.forEach((lock, i) => {
      const summary = JSON.stringify(lock).substring(0, 120);
      console.log(`  ${colors.fgCyan}•${colors.reset} ${summary}...`);
    });
  }
  console.log('');

  // ── ACTIVE SWARM TASKS ──
  console.log(`${colors.bgMagenta}${colors.fgWhite}${colors.bright}  ACTIVE SWARM TASKS  ${colors.reset}`);
  if (activeTasks.length === 0) {
    console.log(`${colors.dim}No active tasks.${colors.reset}`);
  } else {
    activeTasks.forEach((task, i) => {
      const summary = JSON.stringify(task).substring(0, 120);
      console.log(`  ${colors.fgMagenta}•${colors.reset} ${summary}...`);
    });
  }
  console.log('');

  // ── SENTINEL EVENTS (last 3) ──
  console.log(`${colors.bgBlack}${colors.fgRed}${colors.bright}  SENTINEL EVENTS  ${colors.reset}`);
  if (sentinelLedger.length === 0) {
    console.log(`${colors.dim}No sentinel events.${colors.reset}`);
  } else {
    sentinelLedger.slice(-3).forEach(entry => {
      const ts = entry.timestamp || '';
      const evt = entry.event || entry.type || entry.action || 'unknown';
      const detail = entry.message || entry.detail || entry.reason || JSON.stringify(entry).substring(0, 80);
      console.log(`  ${colors.fgRed}▸${colors.reset} ${colors.dim}${ts}${colors.reset} [${evt}] ${detail}`);
    });
  }
  console.log('');

  // ── SEMANTIC MEMORY (last 3) ──
  console.log(`${colors.bgBlack}${colors.fgGreen}${colors.bright}  SEMANTIC MEMORY  ${colors.reset}`);
  if (memoryLedger.length === 0) {
    console.log(`${colors.dim}No memory entries.${colors.reset}`);
  } else {
    memoryLedger.slice(-3).forEach(entry => {
      const ts = entry.timestamp || '';
      const key = entry.key || entry.id || 'n/a';
      const content = entry.content || entry.value || entry.summary || JSON.stringify(entry).substring(0, 80);
      console.log(`  ${colors.fgGreen}▸${colors.reset} ${colors.dim}${ts}${colors.reset} [${key}] ${String(content).substring(0, 90)}`);
    });
  }
  console.log('');

  // ── OS EXEC AUDIT (last 3) ──
  console.log(`${colors.bgBlack}${colors.fgYellow}${colors.bright}  OS EXEC AUDIT  ${colors.reset}`);
  if (osExecLedger.length === 0) {
    console.log(`${colors.dim}No exec entries.${colors.reset}`);
  } else {
    osExecLedger.slice(-3).forEach(entry => {
      const ts = entry.timestamp || '';
      const cmd = entry.command || entry.cmd || entry.script || 'n/a';
      const exit = entry.exitCode !== undefined ? ` exit=${entry.exitCode}` : '';
      console.log(`  ${colors.fgYellow}▸${colors.reset} ${colors.dim}${ts}${colors.reset} ${cmd}${exit}`);
    });
  }
  console.log('');

  // ── SWARM NETWORK (fetch + batch counts) ──
  console.log(`${colors.bgBlack}${colors.fgCyan}${colors.bright}  SWARM NETWORK  ${colors.reset}`);
  console.log(`  Fetch requests : ${colors.fgCyan}${swarmFetchLedger.length}${colors.reset}`);
  console.log(`  Batch jobs     : ${colors.fgCyan}${swarmBatchLedger.length}${colors.reset}`);
  if (swarmFetchLedger.length > 0) {
    const last = swarmFetchLedger[swarmFetchLedger.length - 1];
    console.log(`  Last fetch     : ${colors.dim}${last.url || last.target || JSON.stringify(last).substring(0, 80)}${colors.reset}`);
  }
  if (swarmBatchLedger.length > 0) {
    const last = swarmBatchLedger[swarmBatchLedger.length - 1];
    console.log(`  Last batch     : ${colors.dim}${last.id || last.name || JSON.stringify(last).substring(0, 80)}${colors.reset}`);
  }
  console.log('');

  // ── RECENT ACTIVITY ──
  console.log(`${colors.bright}RECENT ACTIVITY:${colors.reset}`);
  const recentActivity = [...recentLocks, ...recentTasks]
    .sort((a, b) => (new Date(a.timestamp || 0) - new Date(b.timestamp || 0)))
    .slice(-5);

  if (recentActivity.length === 0) {
    console.log(`${colors.dim}No recent activity.${colors.reset}`);
  } else {
    recentActivity.forEach(entry => {
      const isLock = !!(entry.resource || entry.lockId);
      const prefix = isLock ? `${colors.fgBlue}[LOCK]${colors.reset}` : `${colors.fgMagenta}[TASK]${colors.reset}`;
      console.log(`  ${prefix} ${JSON.stringify(entry).substring(0, 100)}...`);
    });
  }

  console.log('\n' + `${colors.dim}Press Ctrl+C to exit. Refreshing every 1 second...${colors.reset}`);
}

// Initial render
render();

// Refresh loop
setInterval(render, 1000);

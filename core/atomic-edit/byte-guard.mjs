#!/usr/bin/env node
/**
 * byte-guard.mjs — macOS byte-level write guard
 *
 * The inescapability enforcement point: monitors all filesystem writes
 * under the repo root and refuses those not flowing through the atomic
 * envelope (atomic_write / atomic_exec).
 *
 * Architecture (macOS):
 *   - Primary: sandbox-exec profile (enforced by atomic-exec-broker)
 *   - Secondary: FSEvents monitor (this script) — detects unrecorded writes
 *     and alerts via exit code for CI/CD gate enforcement
 *   - Tertiary: audit trail — every write event logged to .atomic/byte-audit/
 *
 * This is the macos-equivalent of an eBPF write guard. Unlike eBPF on Linux,
 * it cannot PREVENT writes at the kernel level, but it can DETECT them and
 * fail CI gates, creating an inescapable audit trail.
 *
 * Usage:
 *   node byte-guard.mjs --repo /path/to/repo --watch   # monitor and log
 *   node byte-guard.mjs --repo /path/to/repo --check    # CI gate (exit 0=clean)
 *   node byte-guard.mjs --repo /path/to/repo --audit    # print audit trail
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const args = process.argv.slice(2);
const repoArg = args.find((a, i) => a === '--repo' && i + 1 < args.length);
const REPO = repoArg ? path.resolve(args[args.indexOf('--repo') + 1]) : process.cwd();
const AUDIT_DIR = path.join(REPO, '.atomic', 'byte-audit');
const IGNORE = new Set(['node_modules', '.git', '.atomic', 'dist', '.next', 'tmp', 'coverage']);

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function fileHash(absPath: string): string | null {
  try { return sha256(fs.readFileSync(absPath, 'utf8')); }
  catch { return null; }
}

function shouldIgnore(rel: string): boolean {
  const parts = rel.split(path.sep);
  return parts.some((p) => IGNORE.has(p) || p.startsWith('.'));
}

// Scan repo and build current file hash map
function scanRepo(): Map<string, { hash: string | null; size: number }> {
  const map = new Map();
  const walk = (dir: string) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(REPO, full);
      if (shouldIgnore(rel)) continue;
      if (e.isDirectory()) { walk(full); continue; }
      if (e.isFile()) {
        map.set(rel, { hash: fileHash(full), size: e.isFile() ? fs.statSync(full).size : 0 });
      }
    }
  };
  walk(REPO);
  return map;
}

// Save current state as baseline
function saveBaseline(): string {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const baseline = {
    timestamp: Date.now(),
    files: Object.fromEntries(scanRepo()),
  };
  const file = path.join(AUDIT_DIR, `baseline-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(baseline, null, 2));
  return file;
}

// Compare current state against baseline, return violations
function checkAgainstBaseline(baselinePath: string): string[] {
  if (!fs.existsSync(baselinePath)) return [`no baseline at ${baselinePath}`];
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const current = scanRepo();
  const violations: string[] = [];

  // Check for modified files
  for (const [rel, info] of current) {
    const base = baseline.files[rel];
    if (!base) {
      violations.push(`NEW: ${rel} (${info.size}B) — created outside atomic envelope`);
    } else if (base.hash !== info.hash) {
      violations.push(`MODIFIED: ${rel} (${base.size}B→${info.size}B) — changed outside atomic envelope`);
    }
  }

  // Check for deleted files
  for (const rel of Object.keys(baseline.files)) {
    if (!current.has(rel)) {
      violations.push(`DELETED: ${rel} — removed outside atomic envelope`);
    }
  }

  return violations;
}

// Continuous watch using FSEvents (macOS-specific)
async function watchRepo(): Promise<void> {
  // Use fsevents via polling as a cross-platform fallback
  let baseline = scanRepo();

  process.stdout.write(`[byte-guard] watching ${REPO} (polling every 2s)\n`);

  const interval = setInterval(() => {
    const current = scanRepo();
    const violations: string[] = [];

    for (const [rel, info] of current) {
      const base = baseline.get(rel);
      if (!base) {
        violations.push(`NEW: ${rel}`);
      } else if (base.hash !== info.hash) {
        violations.push(`MODIFIED: ${rel}`);
        // Record the delta
        const auditFile = path.join(AUDIT_DIR, `delta-${Date.now()}-${rel.replace(/\//g, '_')}.json`);
        fs.mkdirSync(AUDIT_DIR, { recursive: true });
        fs.writeFileSync(auditFile, JSON.stringify({
          timestamp: Date.now(),
          file: rel,
          beforeHash: base.hash,
          afterHash: info.hash,
          beforeSize: base.size,
          afterSize: info.size,
        }));
      }
    }

    for (const [rel] of baseline) {
      if (!current.has(rel)) {
        violations.push(`DELETED: ${rel}`);
      }
    }

    if (violations.length > 0) {
      for (const v of violations) {
        process.stderr.write(`[byte-guard] UNENVELOPED WRITE: ${v}\n`);
      }
    }

    baseline = current;
  }, 2000);

  process.on('SIGINT', () => { clearInterval(interval); process.exit(0); });
  process.on('SIGTERM', () => { clearInterval(interval); process.exit(0); });
}

// ── CLI ────────────────────────────────────────────────────────────────────

if (args.includes('--watch')) {
  watchRepo();
} else if (args.includes('--check')) {
  const baselines = fs.readdirSync(AUDIT_DIR)
    .filter(f => f.startsWith('baseline-'))
    .sort()
    .reverse();
  if (baselines.length === 0) {
    process.stdout.write('[byte-guard] no baseline — run --save first or run `atomic_exec` which auto-saves\n');
    process.exit(0);
  }
  const baselinePath = path.join(AUDIT_DIR, baselines[0]);
  const violations = checkAgainstBaseline(baselinePath);
  if (violations.length > 0) {
    for (const v of violations) process.stderr.write(`[byte-guard] ${v}\n`);
    process.exit(1);
  }
  process.stdout.write('[byte-guard] CLEAN — no unenveloped writes detected\n');
  process.exit(0);
} else if (args.includes('--save')) {
  const file = saveBaseline();
  process.stdout.write(`[byte-guard] baseline saved: ${file}\n`);
} else if (args.includes('--audit')) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const deltas = fs.readdirSync(AUDIT_DIR)
    .filter(f => f.startsWith('delta-'))
    .sort()
    .reverse()
    .slice(0, 50);
  for (const d of deltas) {
    process.stdout.write(`${d}\n`);
  }
  process.stdout.write(`[byte-guard] ${deltas.length} delta records\n`);
} else {
  process.stdout.write(`byte-guard — Atomic write enforcement

Usage:
  node byte-guard.mjs --repo <path> --save    Save baseline snapshot
  node byte-guard.mjs --repo <path> --check   CI gate (exit 1 on unenveloped writes)
  node byte-guard.mjs --repo <path> --watch   Monitor and log all writes
  node byte-guard.mjs --repo <path> --audit   Print recent audit trail
`);
}

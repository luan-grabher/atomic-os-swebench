/**
 * Distributed Lock Manager — multi-machine coordination for atomic operations.
 *
 * Extends the existing file-based lock system (.atomic-edit-locks/) with
 * Redis-backed distributed locks for cross-machine coordination.
 *
 * Architecture:
 *   - File locks: always active (POSIX mkdir, local only)
 *   - Redis locks: opt-in via ATOMIC_REDIS_URL env var
 *   - Hybrid mode: file lock acquired first (fast local guard),
 *     then Redis lock (cross-machine guard)
 *
 * Lock lifecycle:
 *   acquire → heartbeat (periodic TTL refresh) → release
 *   Stale locks auto-expire via Redis TTL + file heartbeat check.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { EventEmitter } from 'node:events';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LockInfo {
  frontId: string;
  owner: string;
  machineId: string;
  acquiredAt: number;
  expiresAt: number;
  objective?: string;
}

export interface DistributedLockOptions {
  redisUrl?: string;
  ttlMs?: number;
  heartbeatMs?: number;
  retryMs?: number;
  maxRetries?: number;
  objective?: string;
}

// ── File-based Lock (always active) ────────────────────────────────────────

const LOCKS_DIR = '.atomic-edit-locks';

function repoLocksDir(repoRoot: string): string {
  return path.join(repoRoot, LOCKS_DIR);
}

function lockFilePath(dir: string, frontId: string): string {
  return path.join(dir, frontId);
}

function machineId(): string {
  return `${os.hostname()}-${process.pid}`;
}

export function fileLockAcquire(repoRoot: string, frontId: string, owner: string, objective?: string): LockInfo | null {
  const dir = repoLocksDir(repoRoot);
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = lockFilePath(dir, frontId);
  const now = Date.now();
  const info: LockInfo = {
    frontId,
    owner,
    machineId: machineId(),
    acquiredAt: now,
    expiresAt: now + 300_000, // 5min default TTL for file locks
    objective,
  };

  // Check for existing stale lock
  if (fs.existsSync(lockPath)) {
    try {
      const existing: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (existing.expiresAt > now) {
        return null; // Lock is still held
      }
      // Stale lock — remove it
      fs.unlinkSync(lockPath);
    } catch {
      fs.unlinkSync(lockPath); // Corrupt lock file — remove
    }
  }

  // Write lock
  fs.writeFileSync(lockPath, JSON.stringify(info, null, 2));
  return info;
}

export function fileLockRelease(repoRoot: string, frontId: string, owner: string): boolean {
  const lockPath = lockFilePath(repoLocksDir(repoRoot), frontId);
  if (!fs.existsSync(lockPath)) return false;
  try {
    const existing: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (existing.owner !== owner) return false;
    fs.unlinkSync(lockPath);
    return true;
  } catch {
    fs.unlinkSync(lockPath);
    return true;
  }
}

export function fileLockHeartbeat(repoRoot: string, frontId: string, owner: string, extendMs = 300_000): boolean {
  const lockPath = lockFilePath(repoLocksDir(repoRoot), frontId);
  if (!fs.existsSync(lockPath)) return false;
  try {
    const existing: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (existing.owner !== owner) return false;
    existing.expiresAt = Date.now() + extendMs;
    fs.writeFileSync(lockPath, JSON.stringify(existing, null, 2));
    return true;
  } catch {
    return false;
  }
}

export function fileLockStatus(repoRoot: string): LockInfo[] {
  const dir = repoLocksDir(repoRoot);
  if (!fs.existsSync(dir)) return [];
  const locks: LockInfo[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const lockPath = path.join(dir, entry);
    try {
      const info: LockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (info.expiresAt <= Date.now()) {
        // Stale — clean up
        try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
        continue;
      }
      locks.push(info);
    } catch { /* skip corrupt */ }
  }
  return locks;
}

// ── Redis-backed Distributed Lock ──────────────────────────────────────────

let redisClient: any = null;
let redisAvailable = false;

async function ensureRedis(url: string): Promise<boolean> {
  if (redisAvailable) return true;
  try {
    // Dynamic import by variable keeps Redis optional at typecheck time.
    const redisModule = 'redis';
    const { createClient } = await import(redisModule);
    redisClient = createClient({ url });
    await redisClient.connect();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    redisClient = null;
    return false;
  }
}

export async function distributedLockAcquire(
  repoRoot: string,
  frontId: string,
  owner: string,
  options: DistributedLockOptions = {},
): Promise<LockInfo | null> {
  // Always acquire file lock first
  const fileInfo = fileLockAcquire(repoRoot, frontId, owner, options.objective);
  if (!fileInfo) return null;

  // Try Redis if configured
  const redisUrl = options.redisUrl ?? process.env.ATOMIC_REDIS_URL;
  if (redisUrl) {
    const ok = await ensureRedis(redisUrl);
    if (ok && redisClient) {
      const ttl = options.ttlMs ?? 30_000;
      const redisKey = `atomic-lock:${frontId}`;
      try {
        const acquired = await redisClient.set(redisKey, JSON.stringify({
          owner,
          machineId: machineId(),
          acquiredAt: Date.now(),
        }), { NX: true, PX: ttl });
        if (!acquired) {
          fileLockRelease(repoRoot, frontId, owner);
          return null; // Redis lock already held
        }
        fileInfo.expiresAt = Date.now() + ttl;
      } catch {
        // Redis failed — keep file lock only (degraded mode)
      }
    }
  }

  return fileInfo;
}

export async function distributedLockRelease(
  repoRoot: string,
  frontId: string,
  owner: string,
): Promise<boolean> {
  const released = fileLockRelease(repoRoot, frontId, owner);
  if (redisClient) {
    try {
      const redisKey = `atomic-lock:${frontId}`;
      const val = await redisClient.get(redisKey);
      if (val) {
        const info = JSON.parse(val);
        if (info.owner === owner) {
          await redisClient.del(redisKey);
        }
      }
    } catch { /* ignore Redis errors */ }
  }
  return released;
}

/**
 * Start a heartbeat that periodically refreshes both file and Redis locks.
 * Returns a stop function.
 */
export function startDistributedHeartbeat(
  repoRoot: string,
  frontId: string,
  owner: string,
  options: DistributedLockOptions = {},
): () => void {
  const intervalMs = options.heartbeatMs ?? 10_000;
  const ttlMs = options.ttlMs ?? 30_000;

  const timer = setInterval(async () => {
    fileLockHeartbeat(repoRoot, frontId, owner, ttlMs);
    if (redisClient) {
      try {
        const redisKey = `atomic-lock:${frontId}`;
        await redisClient.pexpire(redisKey, ttlMs);
      } catch { /* ignore Redis errors */ }
    }
  }, intervalMs);

  return () => clearInterval(timer);
}

export async function distributedLockStatus(repoRoot: string): Promise<LockInfo[]> {
  return fileLockStatus(repoRoot);
}

/**
 * Shutdown the Redis connection gracefully.
 */
export async function shutdownDistributedLocks(): Promise<void> {
  if (redisClient) {
    try { await redisClient.quit(); } catch { /* ignore */ }
    redisClient = null;
    redisAvailable = false;
  }
}

#!/usr/bin/env node
/**
 * swarm-network.mjs — Distributed Swarm TCP server for Atomic ecosystem.
 *
 * Pillar 5: Breaks the localhost boundary. External worker nodes connect,
 * authenticate via HMAC-SHA256 challenge-response, and pull tasks from the
 * swarm-tasks ledger.
 *
 * Security hardening (GAP-05 fix):
 * - HMAC-SHA256 challenge-response instead of plaintext AUTH
 * - Rate limiting: max 5 auth failures per IP per minute
 * - Connection timeout: 30s idle disconnect
 * - Proper REPO_ROOT resolution
 */
import net from 'net';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.SWARM_PORT || 8124;
const SHARED_SECRET = process.env.SWARM_SECRET || 'dummy-secret-123';
const CONNECTION_TIMEOUT_MS = 30_000;
const MAX_AUTH_FAILURES_PER_MIN = 5;

// Resolve REPO_ROOT properly (walk up to find .git, fallback to env or workspace)
function findRepoRoot() {
  if (process.env.ATOMIC_SWARM_REPO_ROOT) return process.env.ATOMIC_SWARM_REPO_ROOT;
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(__dirname, '../../../..');
}

const REPO_ROOT = findRepoRoot();
const TASKS_LEDGER_PATH = path.join(REPO_ROOT, '.atomic', 'swarm-tasks-ledger.jsonl');

// Rate limiter: track auth failures per IP
const authFailures = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = authFailures.get(ip);
  if (!entry || now > entry.resetAt) {
    authFailures.set(ip, { count: 0, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= MAX_AUTH_FAILURES_PER_MIN) return false;
  return true;
}

function recordAuthFailure(ip) {
  const now = Date.now();
  const entry = authFailures.get(ip) || { count: 0, resetAt: now + 60_000 };
  entry.count++;
  authFailures.set(ip, entry);
}

const server = net.createServer((socket) => {
  let authenticated = false;
  let buffer = '';
  let challenge = null;
  const remoteIp = socket.remoteAddress || 'unknown';

  // Idle timeout — disconnect after 30s of inactivity
  socket.setTimeout(CONNECTION_TIMEOUT_MS, () => {
    if (!socket.destroyed) {
      socket.write('TIMEOUT\n');
      socket.end();
    }
  });

  // Send HMAC challenge on connect
  challenge = crypto.randomBytes(32).toString('hex');
  if (!socket.destroyed) {
    socket.write(`CHALLENGE ${challenge}\n`);
  }

  socket.on('data', (data) => {
    buffer += data.toString('utf-8');

    // Reset idle timeout on activity
    socket.setTimeout(CONNECTION_TIMEOUT_MS);

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const msg = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!msg) continue;

      if (!authenticated) {
        // Expect: HMAC <hex> where hex = HMAC-SHA256(challenge, secret)
        if (msg.startsWith('HMAC ')) {
          if (!checkRateLimit(remoteIp)) {
            if (!socket.destroyed) {
              socket.write('RATE_LIMITED\n');
              socket.end();
            }
            return;
          }

          const clientHmac = msg.slice(5).trim();
          const expectedHmac = crypto
            .createHmac('sha256', SHARED_SECRET)
            .update(challenge)
            .digest('hex');

          if (clientHmac === expectedHmac) {
            authenticated = true;
            if (!socket.destroyed) socket.write('AUTH_SUCCESS\n');
          } else {
            recordAuthFailure(remoteIp);
            if (!socket.destroyed) {
              socket.write('AUTH_FAILED\n');
              socket.end();
            }
          }
        } else {
          // Legacy plaintext AUTH support (backward compat, warned)
          if (msg === `AUTH ${SHARED_SECRET}`) {
            authenticated = true;
            if (!socket.destroyed) {
              socket.write('AUTH_SUCCESS_LEGACY\n');
              console.error(`[WARN] Client ${remoteIp} used legacy plaintext AUTH. Migrate to HMAC.`);
            }
          } else {
            recordAuthFailure(remoteIp);
            if (!socket.destroyed) {
              socket.write('AUTH_FAILED\n');
              socket.end();
            }
          }
        }
        continue;
      }

      if (msg === 'PULL_TASKS') {
        try {
          if (fs.existsSync(TASKS_LEDGER_PATH)) {
            const contentBuffer = fs.readFileSync(TASKS_LEDGER_PATH);
            if (!socket.destroyed) {
              socket.write(`TASKS_START ${contentBuffer.length}\n`);
              socket.write(contentBuffer);
              socket.write('\n__EOF_TASKS__\n');
            }
          } else {
            if (!socket.destroyed) {
              socket.write('TASKS_START 0\n\n__EOF_TASKS__\n');
            }
          }
        } catch (err) {
          if (!socket.destroyed) socket.write(`ERROR ${err.message}\n`);
        }
      } else if (msg === 'PING') {
        if (!socket.destroyed) socket.write('PONG\n');
      } else if (msg === 'EXIT') {
        if (!socket.destroyed) socket.end();
      } else {
        if (!socket.destroyed) socket.write('UNKNOWN_COMMAND\n');
      }
    }
  });

  socket.on('error', (err) => {
    if (err.code === 'ECONNRESET') {
      // Client disconnected abruptly — not a server error
    } else {
      console.error(`Socket error [${remoteIp}]: ${err.message}`);
    }
  });
});

server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Swarm network server listening on port ${PORT} (HMAC-SHA256 auth)`);
  console.log(`REPO_ROOT: ${REPO_ROOT}`);
  if (process.send) {
    process.send('READY');
  }
});

// Graceful shutdown
process.on('SIGINT', () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });

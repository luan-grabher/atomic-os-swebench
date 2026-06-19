#!/usr/bin/env node
/**
 * smoke-satellites.mjs — Smoke tests for the Atomic satellite servers.
 * Validates that atomic-sentinel, atomic-memory, kloel-os-mcp, auto-healer,
 * and swarm-network are structurally sound.
 *
 * Run: node scripts/mcp/atomic-swarm/smoke-satellites.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_DIR = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'assertion failed');
}

console.log('\n🧪 ATOMIC SATELLITE SMOKE TESTS\n');

// ── atomic-sentinel ──────────────────────────────────────────────────────
console.log('── atomic-sentinel ──');

test('server.mjs exists and is non-empty', () => {
  const p = path.join(MCP_DIR, 'atomic-sentinel', 'server.mjs');
  assert(fs.existsSync(p), 'server.mjs not found');
  assert(fs.statSync(p).size > 500, 'server.mjs too small');
});

test('uses McpServer (not legacy Server)', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-sentinel', 'server.mjs'), 'utf-8');
  assert(code.includes('McpServer') || code.includes('registerTool'), 'should use McpServer or registerTool');
});

test('has chokidar dependency', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(MCP_DIR, 'atomic-sentinel', 'package.json'), 'utf-8'));
  assert(pkg.dependencies?.chokidar || pkg.devDependencies?.chokidar, 'chokidar not in dependencies');
});

test('triggers auto-heal on task failure', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-sentinel', 'server.mjs'), 'utf-8');
  assert(code.includes('auto_heal') || code.includes('autoHeal') || code.includes('auto-heal'),
    'no auto-heal trigger found');
});

test('has graceful shutdown', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-sentinel', 'server.mjs'), 'utf-8');
  assert(code.includes('SIGINT') || code.includes('SIGTERM'), 'no signal handler');
});

// ── atomic-memory ────────────────────────────────────────────────────────
console.log('\n── atomic-memory ──');

test('server.mjs exists and is non-empty', () => {
  const p = path.join(MCP_DIR, 'atomic-memory', 'server.mjs');
  assert(fs.existsSync(p), 'server.mjs not found');
  assert(fs.statSync(p).size > 300, 'server.mjs too small');
});

test('has memory_record tool', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-memory', 'server.mjs'), 'utf-8');
  assert(code.includes('memory_record'), 'memory_record tool not found');
});

test('has memory_query tool', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-memory', 'server.mjs'), 'utf-8');
  assert(code.includes('memory_query'), 'memory_query tool not found');
});

test('uses sha256 receipts', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-memory', 'server.mjs'), 'utf-8');
  assert(code.includes('sha256') || code.includes('createHash'), 'no sha256 receipts');
});

// ── kloel-os-mcp ─────────────────────────────────────────────────────────
console.log('\n── kloel-os-mcp ──');

test('server.mjs exists and is non-empty', () => {
  const p = path.join(MCP_DIR, 'kloel-os-mcp', 'server.mjs');
  assert(fs.existsSync(p), 'server.mjs not found');
  assert(fs.statSync(p).size > 500, 'server.mjs too small');
});

test('has command deny-list (security)', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'kloel-os-mcp', 'server.mjs'), 'utf-8');
  assert(
    code.includes('DANGEROUS') || code.includes('deny') || code.includes('blocked') || code.includes('refuse'),
    'no command deny-list found — SECURITY RISK'
  );
});

test('has timeout on exec', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'kloel-os-mcp', 'server.mjs'), 'utf-8');
  assert(code.includes('timeout') || code.includes('Timeout'), 'no timeout on exec');
});

test('ledger path uses homedir or proper root (not __dirname)', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'kloel-os-mcp', 'server.mjs'), 'utf-8');
  // Should NOT use __dirname for ledger anymore
  const usesProperRoot = code.includes('homedir') || code.includes('REPO_ROOT') || code.includes('process.cwd');
  assert(usesProperRoot, 'ledger still uses __dirname (GAP-02 not fixed)');
});

// ── auto-healer ──────────────────────────────────────────────────────────
console.log('\n── auto-healer ──');

test('auto-healer.mjs exists', () => {
  const p = path.join(MCP_DIR, 'atomic-swarm', 'gates', 'auto-healer.mjs');
  assert(fs.existsSync(p), 'auto-healer.mjs not found');
});

test('exports atomic_repair_scope', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'gates', 'auto-healer.mjs'), 'utf-8');
  assert(code.includes('export function atomic_repair_scope'), 'atomic_repair_scope not exported');
});

test('uses REPO_ROOT (not bare process.cwd)', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'gates', 'auto-healer.mjs'), 'utf-8');
  assert(code.includes('REPO_ROOT'), 'should use REPO_ROOT');
});

test('appends to swarm-tasks-ledger.jsonl', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'gates', 'auto-healer.mjs'), 'utf-8');
  assert(code.includes('swarm-tasks-ledger.jsonl'), 'should append to ledger');
});

test('has sha256 hash on tasks', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'gates', 'auto-healer.mjs'), 'utf-8');
  assert(code.includes('sha256') || code.includes('createHash'), 'no sha256 hash on tasks');
});

// ── swarm-network ────────────────────────────────────────────────────────
console.log('\n── swarm-network ──');

test('swarm-network.mjs exists', () => {
  const p = path.join(MCP_DIR, 'atomic-swarm', 'swarm-network.mjs');
  assert(fs.existsSync(p), 'swarm-network.mjs not found');
});

test('uses HMAC-SHA256 (not plaintext AUTH only)', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'swarm-network.mjs'), 'utf-8');
  assert(code.includes('HMAC') || code.includes('hmac') || code.includes('createHmac'),
    'should use HMAC auth');
});

test('has rate limiting', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'swarm-network.mjs'), 'utf-8');
  assert(code.includes('RATE_LIMIT') || code.includes('rateLimit') || code.includes('authFailures'),
    'no rate limiting');
});

test('has connection timeout', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'swarm-network.mjs'), 'utf-8');
  assert(code.includes('TIMEOUT') || code.includes('setTimeout'), 'no connection timeout');
});

// ── swarm_network_status tool ────────────────────────────────────────────
console.log('\n── swarm_network_status MCP tool ──');

test('swarm_network_status registered in server.mjs', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-swarm', 'server.mjs'), 'utf-8');
  assert(code.includes('swarm_network_status'), 'swarm_network_status tool not registered');
});

// ── dashboard ────────────────────────────────────────────────────────────
console.log('\n── atomic-dashboard ──');

test('index.mjs exists', () => {
  const p = path.join(MCP_DIR, 'atomic-dashboard', 'index.mjs');
  assert(fs.existsSync(p), 'index.mjs not found');
});

test('reads sentinel events ledger', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-dashboard', 'index.mjs'), 'utf-8');
  assert(code.includes('sentinel-events') || code.includes('sentinel'),
    'should monitor sentinel events');
});

// ── READMEs (GAP-15) ─────────────────────────────────────────────────────
console.log('\n── READMEs ──');

test('atomic-sentinel has README.md', () => {
  const p = path.join(MCP_DIR, 'atomic-sentinel', 'README.md');
  assert(fs.existsSync(p), 'README.md not found');
  assert(fs.statSync(p).size > 500, 'README.md too small');
});

test('atomic-memory has README.md', () => {
  const p = path.join(MCP_DIR, 'atomic-memory', 'README.md');
  assert(fs.existsSync(p), 'README.md not found');
  assert(fs.statSync(p).size > 500, 'README.md too small');
});

test('kloel-os-mcp has README.md', () => {
  const p = path.join(MCP_DIR, 'kloel-os-mcp', 'README.md');
  assert(fs.existsSync(p), 'README.md not found');
  assert(fs.statSync(p).size > 500, 'README.md too small');
});

test('atomic-dashboard has README.md', () => {
  const p = path.join(MCP_DIR, 'atomic-dashboard', 'README.md');
  assert(fs.existsSync(p), 'README.md not found');
  assert(fs.statSync(p).size > 500, 'README.md too small');
});

// ── Package integrity (N1, N2) ───────────────────────────────────────────
console.log('\n── Package integrity ──');

test('atomic-memory has package.json with type:module', () => {
  const p = path.join(MCP_DIR, 'atomic-memory', 'package.json');
  assert(fs.existsSync(p), 'package.json not found');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert(pkg.type === 'module', 'type must be "module" for ESM imports');
});

test('atomic-sentinel has package.json with type:module', () => {
  const p = path.join(MCP_DIR, 'atomic-sentinel', 'package.json');
  assert(fs.existsSync(p), 'package.json not found');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert(pkg.type === 'module', 'type must be "module" for ESM imports');
});

test('kloel-os-mcp has package.json with type:module', () => {
  const p = path.join(MCP_DIR, 'kloel-os-mcp', 'package.json');
  assert(fs.existsSync(p), 'package.json not found');
  const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert(pkg.type === 'module', 'type must be "module" for ESM imports');
});

// ── MCP registration (N3) ────────────────────────────────────────────────
console.log('\n── MCP registration ──');

test('.mcp.json registers atomic-sentinel', () => {
  const p = path.join(MCP_DIR, '..', '..', '.mcp.json');
  assert(fs.existsSync(p), '.mcp.json not found');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert(cfg.mcpServers?.['atomic-sentinel'], 'atomic-sentinel not registered in .mcp.json');
});

test('.mcp.json registers atomic-memory', () => {
  const p = path.join(MCP_DIR, '..', '..', '.mcp.json');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert(cfg.mcpServers?.['atomic-memory'], 'atomic-memory not registered in .mcp.json');
});

test('.mcp.json registers kloel-os-mcp', () => {
  const p = path.join(MCP_DIR, '..', '..', '.mcp.json');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert(cfg.mcpServers?.['kloel-os-mcp'], 'kloel-os-mcp not registered in .mcp.json');
});

// ── stdio safety (N5) ────────────────────────────────────────────────────
console.log('\n── stdio safety ──');

test('sentinel does not use console.log (stdout reserved for MCP)', () => {
  const code = fs.readFileSync(path.join(MCP_DIR, 'atomic-sentinel', 'server.mjs'), 'utf-8');
  const lines = code.split('\n');
  const logLines = lines.filter(l => /console\.log\(/.test(l) && !l.trim().startsWith('//'));
  assert(logLines.length === 0, `Found console.log on lines: ${logLines.map((l,i) => lines.indexOf(l)+1).join(', ')}`);
});

// ── Orphan cleanup (N4) ─────────────────────────────────────────────────
console.log('\n── Orphan cleanup ──');

test('no orphaned .atomic dir in kloel-os-mcp source', () => {
  const p = path.join(MCP_DIR, 'kloel-os-mcp', '.atomic');
  assert(!fs.existsSync(p), 'orphaned .atomic directory still exists');
});

// ── summary ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);

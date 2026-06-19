#!/usr/bin/env node
/**
 * Proves README evidence stays synchronized with the live MCP/tool and gate inventory.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const jsonMode = process.argv.includes('--json');
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(sourceDir, '..', '..', '..');
const readmePath = path.join(sourceDir, 'README.md');
const compiledServer = path.join(sourceDir, 'dist', 'server.js');
const expectedSmokeEvidence = '47 passed, 0 failed';

function record(results, name, ok, detail = {}) {
  results.push({ name, ok: Boolean(ok), detail });
}

function gateInventory() {
  const gatesDir = path.join(sourceDir, 'gates');
  const entries = fs.readdirSync(gatesDir).filter((entry) => fs.statSync(path.join(gatesDir, entry)).isFile());
  const proofFiles = entries.filter((entry) => entry.endsWith('.proof.ts') || entry.endsWith('.proof.mjs') || entry.endsWith('.proof.js'));
  return { gatesDir, proofFileCount: proofFiles.length, totalGateFileCount: entries.length };
}

async function readToolCount() {
  if (!fs.existsSync(compiledServer)) return { ok: false, toolCount: 0, reason: 'compiled server missing', compiledServer };
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [compiledServer],
    cwd: repoRoot,
    stderr: 'pipe',
    env: {
      ...process.env,
      ATOMIC_EDIT_MCP_SELF_HOSTED: '1',
      ATOMIC_EDIT_ALLOW_SELF_HOSTED: '1',
      ATOMIC_EDIT_REPO_ROOT: repoRoot,
      ATOMIC_WORKSPACE_ROOT: repoRoot,
      ATOMIC_EDIT_ALLOWED_ROOTS: '',
    },
  });
  const client = new Client({ name: 'atomic-doc-honesty-proof', version: '1.0.0' });
  try {
    await client.connect(transport);
    const tools = (await client.listTools()).tools;
    return { ok: true, toolCount: tools.length };
  } catch (error) {
    return { ok: false, toolCount: 0, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    try { await client.close(); } catch {}
  }
}

async function main() {
  const results = [];
  const readme = fs.readFileSync(readmePath, 'utf8');
  const toolEvidence = await readToolCount();
  const inventory = gateInventory();
  const heading = readme.match(/^## Tools \((\d+)\)$/m);

  record(
    results,
    'README tool count matches live MCP list_tools count',
    toolEvidence.ok && heading && Number(heading[1]) === toolEvidence.toolCount,
    { headingToolCount: heading ? Number(heading[1]) : null, ...toolEvidence },
  );

  const staleNeedles = [
    'npx tsx scripts/mcp/atomic-edit/smoke.ts',
    'node scripts/mcp/atomic-edit/dist/smoke.js',
    '83 tests',
    '257 tests',
    '210 gate proofs',
  ];
  record(
    results,
    'README verify block names current evidence and does not cite stale smoke/proof numbers',
    readme.includes('node scripts/mcp/atomic-edit/smoke.mjs') &&
      readme.includes(expectedSmokeEvidence) &&
      staleNeedles.every((needle) => !readme.includes(needle)),
    {
      hasCurrentSmokeCommand: readme.includes('node scripts/mcp/atomic-edit/smoke.mjs'),
      hasCurrentSmokeEvidence: readme.includes(expectedSmokeEvidence),
      staleNeedlesPresent: staleNeedles.filter((needle) => readme.includes(needle)),
    },
  );

  record(
    results,
    'README proof inventory matches filesystem counts',
    readme.includes(`**${inventory.proofFileCount} proof entrypoints**`) &&
      readme.includes(`**${inventory.totalGateFileCount} total gate files**`),
    inventory,
  );

  record(
    results,
    'README exposes this doc-honesty gate as part of the real evidence path',
    readme.includes('node scripts/mcp/atomic-edit/gates/doc-honesty.proof.mjs --json'),
    { hasDocHonestyCommand: readme.includes('node scripts/mcp/atomic-edit/gates/doc-honesty.proof.mjs --json') },
  );

  record(
    results,
    'README exposes the public package Vitest proof path',
    readme.includes('node scripts/mcp/atomic-edit/gates/vitest-package-suite.proof.mjs --json'),
    { hasVitestProofCommand: readme.includes('node scripts/mcp/atomic-edit/gates/vitest-package-suite.proof.mjs --json') },
  );

  record(
    results,
    'README exposes the multi-language supply-chain resolver proof path',
    readme.includes('node scripts/mcp/atomic-edit/gates/multilang-supply-chain-resolver.proof.mjs --json'),
    {
      hasMultilangSupplyChainProofCommand: readme.includes(
        'node scripts/mcp/atomic-edit/gates/multilang-supply-chain-resolver.proof.mjs --json',
      ),
    },
  );

  const ok = results.every((result) => result.ok);
  const payload = { ok, results };
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    for (const result of results) {
      process.stdout.write(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}\n`);
      if (!result.ok) process.stdout.write(`${JSON.stringify(result.detail, null, 2)}\n`);
    }
  }
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  const payload = { ok: false, error: error instanceof Error ? error.message : String(error) };
  process.stdout.write(jsonMode ? `${JSON.stringify(payload, null, 2)}\n` : `${payload.error}\n`);
  process.exit(1);
});

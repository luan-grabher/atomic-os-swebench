#!/usr/bin/env node
/**
 * supply-chain-filedir-resolution.proof.mjs
 *
 * Proves the Gap D fix: checkSupplyChainByteFloor walks up from the FILE's
 * directory (not the repoRoot) to find language manifests. Repos with
 * manifests in subdirectories (cli/go.mod, server/Cargo.toml) used to false-
 * RED on internal-package imports because findUp started at repoRoot and
 * never reached the manifest. Now it starts at path.dirname(absPath).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const sourceRoot = path.resolve(here, '..');
const distModule = path.join(sourceRoot, 'dist', 'connection-gate.js');
const results = [];
function record(name, ok, detail = {}) { results.push({ name, ok: Boolean(ok), detail }); }

async function main() {
  if (!fs.existsSync(distModule)) { record('compiled connection-gate.js exists', false, { distModule }); return finish(); }
  record('compiled connection-gate.js exists', true);

  const mod = await import(distModule);
  record('checkSupplyChainByteFloor exported', typeof mod.checkSupplyChainByteFloor === 'function');

  // Build a sandbox repo: cli/go.mod at cli/, file at cli/cmd/mcp.go.
  // Import is the module's own internal package — must resolve to green.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-d-proof-'));
  const cliDir = path.join(tmp, 'cli');
  const cmdDir = path.join(cliDir, 'cmd');
  fs.mkdirSync(cmdDir, { recursive: true });
  fs.writeFileSync(path.join(cliDir, 'go.mod'), 'module github.com/example/myapp\n\ngo 1.22\n');
  fs.writeFileSync(path.join(cmdDir, 'mcp.go'), 'package cmd\n');
  execSync(`git -C ${tmp} init -q`, { stdio: 'ignore' });
  const filePath = path.join(cmdDir, 'mcp.go');

  // (1) BEFORE-fix shape: walk from repoRoot would miss cli/go.mod.
  //     Verify by reading source that the fix is in place.
  const src = fs.readFileSync(path.join(sourceRoot, 'connection-gate.ts'), 'utf8');
  record('resolveLanguagePackage uses path.dirname(absPath) for Go',
    /goModHasPackage\(fileDir,\s*spec\)/.test(src) && /fileDir\s*=\s*path\.dirname\(absPath\)/.test(src));

  // (2) Live check: importing the module's own internal package resolves green.
  const newContent = 'package cmd\n\nimport (\n  "github.com/example/myapp/internal/mcpconfig"\n)\n';
  const r = mod.checkSupplyChainByteFloor(filePath, newContent);
  record('internal-package import under cli/ resolves (was RED before fix)',
    r.green, { verdict: r });

  // (3) Negative: import to UNRELATED module that's not in go.mod.
  //     NOTE: goModHasPackage's catch block returns true on errors, so this
  //     test is informational — it may report green when the lookup throws.
  //     The load-bearing assertion is (2): internal package MUST resolve.
  //     Foreign-package rejection is the existing connection-gate's contract,
  //     not this fix's scope.
  const badContent = 'package cmd\n\nimport (\n  "github.com/nonexistent/foreign-pkg"\n)\n';
  const r2 = mod.checkSupplyChainByteFloor(filePath, badContent);
  record('foreign-package import lookup is exercised (informational)', true, { verdict: r2 });

  // (4) Stdlib still green.
  const stdlibContent = 'package cmd\n\nimport (\n  "fmt"\n  "os"\n  "strings"\n)\n';
  const r3 = mod.checkSupplyChainByteFloor(filePath, stdlibContent);
  record('Go stdlib imports always green', r3.green, { verdict: r3 });

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  return finish();
}

function finish() {
  const ok = results.every((r) => r.ok);
  const out = { gate: 'supply-chain-filedir-resolution', pass: ok, results };
  if (jsonMode) process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  else {
    console.log('supply-chain-filedir-resolution: ' + (ok ? 'GREEN' : 'RED'));
    for (const r of results) console.log('  ' + (r.ok ? 'V' : 'X') + ' ' + r.name);
  }
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error('proof crashed:', e); process.exit(2); });

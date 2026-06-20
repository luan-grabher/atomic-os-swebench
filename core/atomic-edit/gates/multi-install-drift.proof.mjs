#!/usr/bin/env node
/**
 * multi-install-drift.proof.mjs
 *
 * Detects drift between the blessed atomic-edit source tree and any other
 * atomic-edit installation on the host. Multiple installs are a silent source
 * of truth divergence: a stale copy in .gemini/, Sites/, Obsidian/, or a
 * tenant repo can shadow the canonical server if MCP config or a skill points
 * at it. This gate fails (RED) if any sibling install's package.json version
 * or server-tools file count diverges from the blessed tree.
 *
 * Read-only: only stats + reads package.json + lists files. No mutation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const jsonMode = process.argv.includes('--json');
const here = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const blessedRoot = path.resolve(here, '..');
const hostRoot = path.resolve(blessedRoot, '..', '..', '..');

const candidateDirs = [
  path.join(hostRoot, '.gemini', 'antigravity-cli', 'mcp', 'atomic-edit'),
  path.join(hostRoot, 'Sites', 'claude', 'skills', 'atomic-edit'),
  path.join(hostRoot, 'Documents', 'Obsidian Vault', 'Kloel', 'scripts', 'mcp', 'atomic-edit'),
  path.join(hostRoot, 'atomic-os-swebench', 'vendor', 'tool-deployments', 'gemini-antigravity-mcp', 'atomic-edit'),
];

function readBlessed() {
  const pkgPath = path.join(blessedRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const serverToolsFiles = fs.readdirSync(blessedRoot)
    .filter((f) => /^server-tools-.*\.ts$/.test(f)).length;
  return { version: pkg.version, serverToolsFiles, pkgPath };
}

function fingerprint(dir) {
  if (!fs.existsSync(dir)) return { exists: false };
  const pkgPath = path.join(dir, 'package.json');
  let version = null;
  if (fs.existsSync(pkgPath)) {
    try { version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version; } catch {}
  }
  let serverToolsFiles = 0;
  try {
    serverToolsFiles = fs.readdirSync(dir).filter((f) => /^server-tools-.*\.ts$/.test(f)).length;
  } catch {}
  const hasDist = fs.existsSync(path.join(dir, 'dist', 'server.js')) || fs.existsSync(path.join(dir, 'dist'));
  const hasSkillMd = fs.existsSync(path.join(dir, 'SKILL.md'));
  return { exists: true, version, serverToolsFiles, hasDist, hasSkillMd, pkgPath };
}

function main() {
  const blessed = readBlessed();
  const results = [];
  const siblings = [];
  for (const dir of candidateDirs) {
    const fp = fingerprint(dir);
    if (!fp.exists) continue;
    siblings.push({ dir, ...fp });
    const isStub = fp.hasSkillMd && !fp.hasDist && fp.serverToolsFiles === 0;
    let ok;
    let reason;
    if (isStub) {
      ok = true;
      reason = 'skill stub (SKILL.md only) — not a competing install';
    } else if (fp.version && fp.version !== blessed.version) {
      ok = false;
      reason = `version drift: sibling=${fp.version} blessed=${blessed.version}`;
    } else if (!fp.version && fp.serverToolsFiles > 0 && fp.serverToolsFiles !== blessed.serverToolsFiles) {
      ok = false;
      reason = `server-tools file count drift: sibling=${fp.serverToolsFiles} blessed=${blessed.serverToolsFiles}`;
    } else {
      ok = true;
      reason = `matches blessed v${blessed.version} (server-tools files: ${fp.serverToolsFiles})`;
    }
    results.push({
      name: `sibling install ${dir} stays in sync with blessed source`,
      ok,
      detail: { ...fp, blessedVersion: blessed.version, blessedServerToolsFiles: blessed.serverToolsFiles, reason },
    });
  }

  results.push({
    name: 'sibling install audit completed (informational)',
    ok: true,
    detail: { siblingCount: siblings.length, realInstalls: siblings.filter((s) => !s.hasSkillMd || s.hasDist).length },
  });

  const allOk = results.every((r) => r.ok);
  const out = {
    gate: 'multi-install-drift',
    pass: allOk,
    blessed: { root: blessedRoot, ...blessed },
    siblings,
    results,
  };
  if (jsonMode) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    console.log(`multi-install-drift: ${allOk ? 'GREEN' : 'RED'}`);
    for (const r of results) {
      console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`);
      if (!r.ok) console.log(`      → ${r.detail.reason}`);
    }
  }
  process.exit(allOk ? 0 : 1);
}

main();

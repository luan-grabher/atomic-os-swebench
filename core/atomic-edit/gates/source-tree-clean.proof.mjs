#!/usr/bin/env node
/**
 * source-tree-clean.proof.mjs
 *
 * Regression gate: the blessed atomic-edit source root must NOT accumulate
 * orphan trash between gate runs. Patterns banned at the root:
 *   - 32-hex-char directories (snapshot / sandbox / lock leftovers)
 *   - .smoke-fixture.* files (one-shot smoke artifacts that should self-clean)
 *   - .external-runtime-denial-* directories
 *   - .atomic-build-tmp / atomic-edit-dist-* / dist.broken-last build temps
 *     (dist-lkg is the only allowed dist backup)
 *
 * Read-only: only readdir + stat. No mutation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const jsonMode = process.argv.includes('--json');
const here = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const root = path.resolve(here, '..');

const bannedDirPatterns = [
  /^[0-9a-f]{32}$/,
  /^\.external-runtime-denial-/,
  /^\.atomic-build-tmp$/,
  /^atomic-edit-dist-/,
  /^dist\.broken-last$/,
];
const bannedFilePatterns = [
  /^\.smoke-fixture\./,
];
const allowedBackupDirs = new Set(['dist-lkg']);

function main() {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const offenders = [];
  for (const ent of entries) {
    if (allowedBackupDirs.has(ent.name)) continue;
    if (ent.isDirectory()) {
      if (bannedDirPatterns.some((p) => p.test(ent.name))) {
        offenders.push({ name: ent.name, kind: 'dir', reason: 'matches banned dir pattern' });
      }
    } else if (ent.isFile()) {
      if (bannedFilePatterns.some((p) => p.test(ent.name))) {
        offenders.push({ name: ent.name, kind: 'file', reason: 'matches banned file pattern' });
      }
    }
  }

  const ok = offenders.length === 0;
  const out = {
    gate: 'source-tree-clean',
    pass: ok,
    root,
    offenderCount: offenders.length,
    offenders,
  };
  if (jsonMode) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    console.log(`source-tree-clean: ${ok ? 'GREEN' : 'RED'} (${offenders.length} offenders)`);
    for (const o of offenders) console.log(`  ✗ ${o.kind} ${o.name} — ${o.reason}`);
  }
  process.exit(ok ? 0 : 1);
}

main();

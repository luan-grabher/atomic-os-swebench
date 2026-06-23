#!/usr/bin/env node
/**
 * PROOF — Tier-B effect snapshot has an HONEST ceiling (no silent corruption,
 * no silent under-coverage). Unprovable ≡ uncovered.
 *
 * Before this gate, captureEffectSnapshot read every file as utf8 (corrupting a
 * binary on restore) and silently skipped >maxFileBytes / unreadable files
 * WITHOUT setting limitReached — so assertCompleteEffectSnapshot waved through a
 * "complete" snapshot that had actually missed/garbled in-scope bytes, letting
 * atomic_exec claim a byte-exact reversal it could not deliver. Now any file the
 * snapshot cannot faithfully hold flips limitReached, so the diff/rollback is
 * REFUSED rather than performed on corrupt/partial state.
 *
 * Falsifiable: drop the limitReached flips (binary/oversize/unstat) and the
 * incomplete-snapshot assertions flip and this exits 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  captureEffectSnapshot,
  assertCompleteEffectSnapshot,
} from '../dist/server-helpers-effect.js';

const jsonMode = process.argv.includes('--json');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = path.join(root, `.effect-honest-ceiling-${process.pid}-${Date.now()}`);

let failures = 0;
const results = [];
const expect = (cond, name) => {
  results.push({ name, ok: !!cond });
  if (!cond) failures++;
};
const refuses = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};
const reset = () => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  fs.mkdirSync(fixtureRoot, { recursive: true });
};

try {
  // 1) text-only -> COMPLETE
  reset();
  fs.writeFileSync(path.join(fixtureRoot, 'a.txt'), 'hello\n');
  fs.writeFileSync(path.join(fixtureRoot, 'b.ts'), 'export const x = 1;\n');
  let snap = captureEffectSnapshot(fixtureRoot);
  expect(snap.limitReached === false, 'text-only snapshot is COMPLETE (limitReached false)');
  expect(
    !refuses(() => assertCompleteEffectSnapshot(snap, 'diff')),
    'a complete snapshot does NOT refuse',
  );

  // 2) binary (non-utf8) -> INCOMPLETE, refuses, never stored as a corrupt string
  reset();
  fs.writeFileSync(path.join(fixtureRoot, 'a.txt'), 'hello\n');
  fs.writeFileSync(path.join(fixtureRoot, 'bin.dat'), Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x81]));
  snap = captureEffectSnapshot(fixtureRoot);
  expect(
    snap.limitReached === true,
    'a binary file makes the snapshot INCOMPLETE (no silent utf8 corruption)',
  );
  expect(
    refuses(() => assertCompleteEffectSnapshot(snap, 'rollback')),
    'an incomplete snapshot REFUSES byte-exact rollback',
  );
  expect(!snap.files.has('bin.dat'), 'the binary file is NOT stored as a (corrupt) string');

  // 3) oversized (> maxFileBytes) -> INCOMPLETE (was a silent skip)
  reset();
  fs.writeFileSync(path.join(fixtureRoot, 'big.txt'), 'x'.repeat(50));
  snap = captureEffectSnapshot(fixtureRoot, { maxFileBytes: 10 });
  expect(
    snap.limitReached === true,
    'an oversized file makes the snapshot INCOMPLETE (was a silent skip)',
  );

  // 4) self-evolution harness temp payloads are scratch, not coverage poison
  reset();
  fs.writeFileSync(path.join(fixtureRoot, 'tracked.txt'), 'real\n');
  fs.writeFileSync(path.join(fixtureRoot, '.self-evolution-harness-input.123.json'), 'x'.repeat(50));
  fs.writeFileSync(path.join(fixtureRoot, '.self-evolution-harness-output.123.json'), 'y'.repeat(50));
  snap = captureEffectSnapshot(fixtureRoot, { maxFiles: 2, maxFileBytes: 10 });
  expect(
    snap.limitReached === false,
    'self-evolution harness temp files are scratch and do not make the snapshot UNJUDGED',
  );
  expect(
    snap.files.size === 1 && snap.files.has('tracked.txt'),
    'scratch-heavy self-evolution payloads do not crowd out real tracked bytes',
  );

  // 5) generated proof/build scratch directories are not byte-coverage poison
  reset();
  fs.writeFileSync(path.join(fixtureRoot, 'tracked.txt'), 'real\n');
  for (const dir of ['atomic-exec', '.atomic-closure-cache', 'dist-lkg', 'dist.broken-last', '.atomic-build-tmp']) {
    const nested = path.join(fixtureRoot, dir, 'nested');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'big.bin'), Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x81]));
    fs.writeFileSync(path.join(nested, 'big.txt'), 'z'.repeat(50));
  }
  snap = captureEffectSnapshot(fixtureRoot, { maxFiles: 2, maxFileBytes: 10 });
  expect(
    snap.limitReached === false,
    'generated proof/build scratch dirs do not make the snapshot UNJUDGED',
  );
  expect(
    snap.files.size === 1 && snap.files.has('tracked.txt'),
    'scratch dirs do not crowd out real tracked bytes',
  );
} catch (error) {
  expect(false, `threw: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

if (jsonMode) {
  console.log(JSON.stringify({ proof: 'effect-snapshot-honest-ceiling', ok: failures === 0, results }));
} else {
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}`);
  console.log(failures === 0 ? 'PROOF PASS' : `PROOF FAIL (${failures} assertion(s) failed)`);
}
process.exit(failures === 0 ? 0 : 1);

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { makeContext } from './contract.js';
import artifactHygieneGate from './artifact-hygiene-gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} - ${msg}`);
  if (!cond) failures += 1;
};

async function main() {
  const testDir = path.join(REPO_ROOT, 'scripts', 'mcp', 'atomic-edit', '.proof-artifact-hygiene');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const cleanFileRel = path.join('scripts', 'mcp', 'atomic-edit', '.proof-artifact-hygiene', 'clean.ts');
  const cleanAbs = path.join(REPO_ROOT, cleanFileRel);
  fs.writeFileSync(cleanAbs, 'export const x = 1;\n');

  // ---------------------------------------------------------------- GREEN case
  const greenCtx = makeContext(REPO_ROOT, new Map(), [cleanFileRel]);
  const greenRes = await artifactHygieneGate.run(greenCtx);
  ok(greenRes.green === true, 'GREEN: gate is green when no artifacts leak');
  ok(greenRes.reds.length === 0, 'GREEN: zero reds');

  // ---------------------------------------------------------------- RED case
  // Create a leaked file matching the pattern .smoke-*
  const leakedAbs = path.join(testDir, '.smoke-leaked-123.ts');
  fs.writeFileSync(leakedAbs, 'export const y = 2;\n');

  const redCtx = makeContext(REPO_ROOT, new Map(), [cleanFileRel]);
  const redRes = await artifactHygieneGate.run(redCtx);
  ok(redRes.green === false, 'RED: gate is NOT green when an artifact leaks');
  ok(redRes.reds.length === 1, 'RED: emitted exactly 1 GateRed for the leak');
  if (redRes.reds.length > 0) {
    ok(redRes.reds[0].fact.includes('.smoke-leaked-123.ts'), 'RED: fact names the leaked artifact');
    ok(redRes.reds[0].file === cleanFileRel, 'RED: mapped to the modified file in the directory');
  }

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });

  // -------------------------------------------------------------------- verdict
  if (failures === 0) {
    console.log('PROOF PASS');
    process.exit(0);
  } else {
    console.log(`PROOF FAIL (${failures} assertion(s) failed)`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  console.log('PROOF FAIL (threw)');
  process.exit(1);
});

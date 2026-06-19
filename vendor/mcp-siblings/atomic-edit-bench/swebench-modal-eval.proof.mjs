#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const modalPath = path.join(here, 'swebench-modal-eval.mjs');
assert.equal(fs.existsSync(modalPath), true, 'swebench-modal-eval.mjs must exist');

const modalEval = await import(pathToFileURL(modalPath).href);
const { buildModalEvalArgs, validateModalEvalRequest, planModalEval } = modalEval;

assert.deepEqual(
  buildModalEvalArgs({
    datasetName: 'princeton-nlp/SWE-bench_Verified',
    split: 'test',
    predictionsPath: 'gold',
    runId: 'atomic-modal-gold-smoke',
    maxWorkers: 1,
    timeout: 120,
    instanceIds: ['astropy__astropy-12907'],
  }),
  [
    '-m',
    'swebench.harness.run_evaluation',
    '--dataset_name',
    'princeton-nlp/SWE-bench_Verified',
    '--split',
    'test',
    '--predictions_path',
    'gold',
    '--max_workers',
    '1',
    '--run_id',
    'atomic-modal-gold-smoke',
    '--modal',
    'true',
    '--timeout',
    '120',
    '--instance_ids',
    'astropy__astropy-12907',
  ],
);

const dryPlan = planModalEval({
  dryRun: true,
  pythonBin: '/opt/homebrew/opt/python@3.14/bin/python3.14',
  predictionsPath: 'gold',
  runId: 'atomic-modal-gold-smoke',
  instanceIds: ['astropy__astropy-12907'],
  preflight: { ready: { sweBenchVerified: true }, blockers: [] },
});
assert.equal(dryPlan.ok, true);
assert.equal(dryPlan.willSpawn, false);
assert.equal(dryPlan.command.startsWith('"/opt/homebrew/opt/python@3.14/bin/python3.14" -m swebench.harness.run_evaluation'), true);
assert.equal(dryPlan.command.includes('--modal true'), true);

const missingPredictions = validateModalEvalRequest({ predictionsPath: 'missing.json' });
assert.equal(missingPredictions.ok, false);
assert.match(missingPredictions.blockers.join('\n'), /predictions file does not exist/);

const tempDir = fs.mkdtempSync(path.join('/tmp', 'atomic-swebench-modal-proof-'));
const predictionsPath = path.join(tempDir, 'predictions.json');
fs.writeFileSync(predictionsPath, JSON.stringify([
  { instance_id: 'astropy__astropy-12907', model_patch: 'diff --git a/x.py b/x.py\n', model_name_or_path: 'atomic-test' },
]));
const spawnPlan = planModalEval({
  predictionsPath,
  pythonBin: '/bin/echo',
  preflight: { ready: { sweBenchVerified: true }, blockers: [] },
});
assert.equal(spawnPlan.ok, true);
assert.equal(spawnPlan.willSpawn, true);
assert.match(spawnPlan.command, /predictions\.json/);

console.log(JSON.stringify({ ok: true, proof: 'swebench-modal-eval', checked: 5 }, null, 2));

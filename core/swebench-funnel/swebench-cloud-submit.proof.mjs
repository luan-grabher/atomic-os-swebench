#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const submitPath = path.join(here, 'swebench-cloud-submit.mjs');
assert.equal(fs.existsSync(submitPath), true, 'swebench-cloud-submit.mjs must exist');

const submit = await import(pathToFileURL(submitPath).href);
const { buildSubmitArgs, validateSubmitRequest, planCloudSubmit } = submit;

assert.deepEqual(
  buildSubmitArgs({ subset: 'swe-bench_verified', split: 'test', predictionsPath: 'artifacts/preds.json', runId: 'atomic-sota-verified' }),
  ['submit', 'swe-bench_verified', 'test', '--predictions_path', 'artifacts/preds.json', '--run_id', 'atomic-sota-verified'],
);

const missingPredictions = validateSubmitRequest({ predictionsPath: 'missing.json', sbCliBin: '/bin/echo', env: { SWEBENCH_API_KEY: 'set' } });
assert.equal(missingPredictions.ok, false);
assert.match(missingPredictions.blockers.join('\n'), /predictions file does not exist/);

const tempDir = fs.mkdtempSync(path.join('/tmp', 'atomic-sb-submit-proof-'));
const invalidPredictionsPath = path.join(tempDir, 'predictions.json');
fs.writeFileSync(invalidPredictionsPath, '{"instance_id":"x"}\n{"instance_id":"y"}\n');
const invalidPredictions = validateSubmitRequest({ predictionsPath: invalidPredictionsPath, sbCliBin: '/bin/echo', env: { SWEBENCH_API_KEY: 'set' } });
assert.equal(invalidPredictions.ok, false);
assert.match(invalidPredictions.blockers.join('\n'), /not valid sb-cli JSON/);

const dryPlan = planCloudSubmit({
  dryRun: true,
  predictionsPath: 'artifacts/preds.json',
  runId: 'atomic-sota-verified',
  sbCliBin: '/tmp/atomic-sb-cli-venv311/bin/sb-cli',
  preflight: { ready: { sweBenchVerified: true }, blockers: [] },
});
assert.equal(dryPlan.ok, true);
assert.equal(dryPlan.command.includes('sb-cli submit swe-bench_verified test'), true);
assert.equal(dryPlan.willSpawn, false);

console.log(JSON.stringify({ ok: true, proof: 'swebench-cloud-submit', checked: 4 }, null, 2));

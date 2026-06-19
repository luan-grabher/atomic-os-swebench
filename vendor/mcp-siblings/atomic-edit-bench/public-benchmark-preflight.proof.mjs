#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const preflightPath = path.join(here, 'public-benchmark-preflight.mjs');
assert.equal(fs.existsSync(preflightPath), true, 'public-benchmark-preflight.mjs must exist');

const preflight = await import(pathToFileURL(preflightPath).href);
const { evaluatePreflight, fixture } = preflight;

const blocked = evaluatePreflight(fixture('blocked-host'));
assert.equal(blocked.ok, true);
assert.equal(blocked.ready.sweBenchVerified, false);
assert.equal(blocked.ready.aiderPolyglot, false);
assert.match(blocked.blockers.join('\n'), /requires at least 120 GiB free/);
assert.match(blocked.blockers.join('\n'), /requires at least one model API key/);

const ready = evaluatePreflight(fixture('ready-host'));
assert.equal(ready.ready.sweBenchVerified, true);
assert.equal(ready.ready.aiderPolyglot, true);
assert.equal(ready.blockers.length, 0);
assert.equal(ready.commands.sweBenchVerified.includes('python -m swebench.harness.run_evaluation'), true);
assert.equal(ready.commands.aiderPolyglot.includes('aider-polyglot-deepseek-batch-runner.mjs'), true);

const macArm = evaluatePreflight(fixture('mac-arm-ready-host'));
assert.equal(macArm.ready.sweBenchVerified, true);
assert.match(macArm.commands.sweBenchVerified, /--namespace ''/);

const cloud = evaluatePreflight(fixture('cloud-ready-host'));
assert.equal(cloud.ready.sweBenchVerified, true);
assert.equal(cloud.ready.aiderPolyglot, true);
assert.match(cloud.commands.sweBenchVerified, /sb-cli submit/);
assert.match(cloud.commands.aiderPolyglot, /remote runner/);

const deepseekCloud = evaluatePreflight({ ...fixture('cloud-ready-host'), apiKeys: ['DEEPSEEK_API_KEY'] });
assert.equal(deepseekCloud.ready.sweBenchVerified, true);
assert.equal(deepseekCloud.host.modelKeyPresent, true);

const modalReady = evaluatePreflight({
  executionMode: 'cloud',
  pythonVersion: 'Python 3.11.8',
  apiKeys: ['DEEPSEEK_API_KEY'],
  modalAuth: true,
  modalInstalled: true,
  modalHarnessInstalled: true,
  remoteRunner: true,
});
assert.equal(modalReady.ready.sweBenchVerified, true);
assert.match(modalReady.commands.sweBenchVerified, /python -m swebench\.harness\.run_evaluation/);
assert.match(modalReady.commands.sweBenchVerified, /--modal true/);
assert.equal(modalReady.commands.sweBenchVerified.includes('modal_eval.run_modal'), false);

const modalReadyCustomPython = evaluatePreflight({
  executionMode: 'cloud',
  pythonVersion: 'Python 3.11.8',
  apiKeys: ['DEEPSEEK_API_KEY'],
  modalAuth: true,
  modalInstalled: true,
  modalHarnessInstalled: true,
  remoteRunner: true,
  swebenchPythonBin: '/opt/homebrew/opt/python@3.14/bin/python3.14',
});
assert.equal(
  modalReadyCustomPython.commands.sweBenchVerified.startsWith('/opt/homebrew/opt/python@3.14/bin/python3.14 -m swebench.harness.run_evaluation'),
  true,
);

const modalWithoutHarness = evaluatePreflight({
  executionMode: 'cloud',
  pythonVersion: 'Python 3.11.8',
  apiKeys: ['DEEPSEEK_API_KEY'],
  modalAuth: true,
  modalInstalled: true,
  modalHarnessInstalled: false,
  remoteRunner: true,
});
assert.equal(modalWithoutHarness.ready.sweBenchVerified, false);
assert.match(modalWithoutHarness.benchmarkBlockers.sweBenchVerified.join('\n'), /swebench Python harness/);

console.log(JSON.stringify({ ok: true, proof: 'public-benchmark-preflight', checked: 8 }, null, 2));

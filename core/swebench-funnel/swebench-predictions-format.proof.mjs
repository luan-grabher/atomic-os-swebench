#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const validatorPath = path.join(here, 'swebench-predictions-format.mjs');
assert.equal(fs.existsSync(validatorPath), true, 'swebench-predictions-format.mjs must exist');

const validator = await import(pathToFileURL(validatorPath).href);
const { validatePredictionsObject, parseAndValidatePredictionsText } = validator;

const listOk = validatePredictionsObject([
  { instance_id: 'sympy__sympy-20590', model_patch: 'diff --git a/x.py b/x.py\n', model_name_or_path: 'atomic-test' },
]);
assert.equal(listOk.ok, true);
assert.equal(listOk.format, 'list');

const dictOk = validatePredictionsObject({
  'sympy__sympy-20590': { model_patch: 'diff --git a/x.py b/x.py\n', model_name_or_path: 'atomic-test' },
});
assert.equal(dictOk.ok, true);
assert.equal(dictOk.format, 'dict');

const missingPatch = validatePredictionsObject([
  { instance_id: 'sympy__sympy-20590', model_patch: '', model_name_or_path: 'atomic-test' },
]);
assert.equal(missingPatch.ok, false);
assert.match(missingPatch.errors.join('\n'), /model_patch/);

const jsonlBad = parseAndValidatePredictionsText('{"instance_id":"a__b-1","model_patch":"diff --git a/a b/a\\n","model_name_or_path":"atomic"}\n{"instance_id":"a__b-2","model_patch":"diff --git a/b b/b\\n","model_name_or_path":"atomic"}\n');
assert.equal(jsonlBad.ok, false);
assert.match(jsonlBad.errors.join('\n'), /valid JSON object or array/);

console.log(JSON.stringify({ ok: true, proof: 'swebench-predictions-format', checked: 4 }, null, 2));

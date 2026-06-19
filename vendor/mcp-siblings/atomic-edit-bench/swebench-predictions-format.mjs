#!/usr/bin/env node
import * as fs from 'node:fs';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validatePredictionEntry(entry, label) {
  const errors = [];
  if (!isObject(entry)) return [`${label} must be an object`];
  if (!nonEmptyString(entry.model_patch)) errors.push(`${label}.model_patch must be a non-empty string`);
  if (!nonEmptyString(entry.model_name_or_path)) errors.push(`${label}.model_name_or_path must be a non-empty string`);
  return errors;
}

export function validatePredictionsObject(value) {
  const errors = [];
  if (Array.isArray(value)) {
    if (value.length === 0) errors.push('prediction list must not be empty');
    for (let i = 0; i < value.length; i += 1) {
      const entry = value[i];
      if (!isObject(entry)) {
        errors.push(`prediction[${i}] must be an object`);
        continue;
      }
      if (!nonEmptyString(entry.instance_id)) errors.push(`prediction[${i}].instance_id must be a non-empty string`);
      errors.push(...validatePredictionEntry(entry, `prediction[${i}]`));
    }
    return { ok: errors.length === 0, format: 'list', count: value.length, errors };
  }
  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) errors.push('prediction dictionary must not be empty');
    for (const [instanceId, entry] of entries) {
      if (!nonEmptyString(instanceId)) errors.push('prediction dictionary keys must be non-empty instance ids');
      errors.push(...validatePredictionEntry(entry, `prediction[${instanceId}]`));
    }
    return { ok: errors.length === 0, format: 'dict', count: entries.length, errors };
  }
  return { ok: false, format: 'unknown', count: 0, errors: ['predictions must be a JSON object or array'] };
}

export function parseAndValidatePredictionsText(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text));
  } catch (error) {
    return {
      ok: false,
      format: 'invalid-json',
      count: 0,
      errors: ['predictions must be a valid JSON object or array: ' + String(error.message || error)],
    };
  }
  return validatePredictionsObject(parsed);
}

export function validatePredictionsFile(file) {
  try {
    return parseAndValidatePredictionsText(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { ok: false, format: 'missing', count: 0, errors: ['cannot read predictions file: ' + String(error.message || error)] };
  }
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('usage: node swebench-predictions-format.mjs <predictions.json>\n');
    process.exit(2);
  }
  const result = await validatePredictionsFile(file);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}

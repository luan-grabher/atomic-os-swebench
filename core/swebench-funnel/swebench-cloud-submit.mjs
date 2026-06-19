#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { collectHostPreflight } from './public-benchmark-preflight.mjs';
import { validatePredictionsFile } from './swebench-predictions-format.mjs';

export const DEFAULT_SUBSET = 'swe-bench_verified';
export const DEFAULT_SPLIT = 'test';
export const DEFAULT_RUN_ID = 'atomic-sota-verified';
export const DEFAULT_PREDICTIONS = 'artifacts/atomic-swe-bench-verified/predictions.json';

function shellQuote(value) {
  const s = String(value);
  return /^[A-Za-z0-9_./:=+-]+$/.test(s) ? s : JSON.stringify(s);
}

function existingFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

export function buildSubmitArgs(input = {}) {
  return [
    'submit',
    input.subset ?? DEFAULT_SUBSET,
    input.split ?? DEFAULT_SPLIT,
    '--predictions_path',
    input.predictionsPath ?? DEFAULT_PREDICTIONS,
    '--run_id',
    input.runId ?? DEFAULT_RUN_ID,
  ];
}

export function validateSubmitRequest(input = {}) {
  const blockers = [];
  const predictionsPath = input.predictionsPath ?? DEFAULT_PREDICTIONS;
  const sbCliBin = input.sbCliBin ?? input.env?.SB_CLI_BIN ?? 'sb-cli';
  const env = input.env ?? process.env;
  if (!existingFile(predictionsPath)) blockers.push(`predictions file does not exist: ${predictionsPath}`);
  else {
    const predictions = validatePredictionsFile(predictionsPath);
    if (!predictions.ok) blockers.push(`predictions file is not valid sb-cli JSON: ${predictions.errors.join('; ')}`);
  }
  if (!existingFile(sbCliBin) && !input.assumePathLookup) blockers.push(`sb-cli binary is not an explicit file: ${sbCliBin}`);
  if (!env.SWEBENCH_API_KEY && !env.SB_API_KEY) blockers.push('SWEBENCH_API_KEY is required for sb-cli submit');
  return {
    ok: blockers.length === 0,
    blockers,
    predictionsPath,
    sbCliBin,
  };
}

export function planCloudSubmit(input = {}) {
  const predictionsPath = input.predictionsPath ?? DEFAULT_PREDICTIONS;
  const runId = input.runId ?? DEFAULT_RUN_ID;
  const subset = input.subset ?? DEFAULT_SUBSET;
  const split = input.split ?? DEFAULT_SPLIT;
  const sbCliBin = input.sbCliBin ?? input.env?.SB_CLI_BIN ?? 'sb-cli';
  const preflight = input.preflight ?? collectHostPreflight(input.env ?? process.env, 'cloud');
  const args = buildSubmitArgs({ subset, split, predictionsPath, runId });
  const command = [sbCliBin, ...args].map(shellQuote).join(' ');
  if (input.dryRun) {
    return { ok: true, dryRun: true, willSpawn: false, command, args, preflight };
  }
  const validation = validateSubmitRequest({ predictionsPath, sbCliBin, env: input.env ?? process.env });
  const blockers = [...(preflight.ready?.sweBenchVerified ? [] : preflight.benchmarkBlockers?.sweBenchVerified ?? preflight.blockers ?? []), ...validation.blockers];
  return {
    ok: blockers.length === 0,
    dryRun: false,
    willSpawn: blockers.length === 0,
    command,
    args,
    preflight,
    blockers: [...new Set(blockers)],
  };
}

function parseArgv(argv) {
  const out = { dryRun: argv.includes('--dry-run') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--predictions') out.predictionsPath = argv[++i];
    else if (arg === '--run-id') out.runId = argv[++i];
    else if (arg === '--sb-cli-bin') out.sbCliBin = argv[++i];
    else if (arg === '--subset') out.subset = argv[++i];
    else if (arg === '--split') out.split = argv[++i];
  }
  return out;
}

export function runCli(argv = [], env = process.env) {
  const options = parseArgv(argv);
  const plan = planCloudSubmit({ ...options, env });
  if (!plan.willSpawn) return plan;
  const res = childProcess.spawnSync(options.sbCliBin ?? env.SB_CLI_BIN ?? 'sb-cli', plan.args, {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 24 * 60 * 60 * 1000,
  });
  return {
    ...plan,
    spawned: true,
    status: res.status,
    signal: res.signal,
    stdout: res.stdout,
    stderr: res.stderr,
    ok: res.status === 0,
  };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const result = runCli(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}

#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import { collectHostPreflight } from './public-benchmark-preflight.mjs';
import { validatePredictionsFile } from './swebench-predictions-format.mjs';

export const DEFAULT_DATASET = 'princeton-nlp/SWE-bench_Verified';
export const DEFAULT_SPLIT = 'test';
export const DEFAULT_RUN_ID = 'atomic-sota-verified';
export const DEFAULT_PREDICTIONS = 'artifacts/atomic-swe-bench-verified/predictions.json';
export const DEFAULT_MAX_WORKERS = 1;

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

function positiveInteger(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function normalizeInstanceIds(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

export function buildModalEvalArgs(input = {}) {
  const args = [
    '-m',
    'swebench.harness.run_evaluation',
    '--dataset_name',
    input.datasetName ?? DEFAULT_DATASET,
    '--split',
    input.split ?? DEFAULT_SPLIT,
    '--predictions_path',
    input.predictionsPath ?? DEFAULT_PREDICTIONS,
    '--max_workers',
    String(positiveInteger(input.maxWorkers, DEFAULT_MAX_WORKERS)),
    '--run_id',
    input.runId ?? DEFAULT_RUN_ID,
    '--modal',
    'true',
  ];
  const timeout = positiveInteger(input.timeout, null);
  if (timeout) args.push('--timeout', String(timeout));
  const instanceIds = normalizeInstanceIds(input.instanceIds);
  if (instanceIds.length > 0) args.push('--instance_ids', ...instanceIds);
  return args;
}

export function validateModalEvalRequest(input = {}) {
  const blockers = [];
  const predictionsPath = input.predictionsPath ?? DEFAULT_PREDICTIONS;
  if (predictionsPath !== 'gold') {
    if (!existingFile(predictionsPath)) blockers.push(`predictions file does not exist: ${predictionsPath}`);
    else {
      const predictions = validatePredictionsFile(predictionsPath);
      if (!predictions.ok) blockers.push(`predictions file is not valid SWE-bench JSON: ${predictions.errors.join('; ')}`);
    }
  }
  return {
    ok: blockers.length === 0,
    blockers,
    predictionsPath,
  };
}

export function planModalEval(input = {}) {
  const env = input.env ?? process.env;
  const pythonBin = input.pythonBin ?? env.SWEBENCH_PYTHON_BIN ?? 'python';
  const args = buildModalEvalArgs(input);
  const command = [pythonBin, ...args].map(shellQuote).join(' ');
  const preflight = input.preflight ?? collectHostPreflight(env, 'cloud');
  const validation = validateModalEvalRequest(input);
  const preflightBlockers = preflight.ready?.sweBenchVerified ? [] : preflight.benchmarkBlockers?.sweBenchVerified ?? preflight.blockers ?? [];
  const blockers = [...new Set([...preflightBlockers, ...validation.blockers])];
  return {
    ok: blockers.length === 0,
    dryRun: Boolean(input.dryRun),
    willSpawn: !input.dryRun && blockers.length === 0,
    command,
    pythonBin,
    args,
    preflight,
    blockers,
    predictionsPath: validation.predictionsPath,
  };
}

function parseArgv(argv) {
  const out = { dryRun: argv.includes('--dry-run') };
  const instanceIds = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--predictions') out.predictionsPath = argv[++i];
    else if (arg === '--python-bin') out.pythonBin = argv[++i];
    else if (arg === '--run-id') out.runId = argv[++i];
    else if (arg === '--dataset') out.datasetName = argv[++i];
    else if (arg === '--split') out.split = argv[++i];
    else if (arg === '--max-workers') out.maxWorkers = Number(argv[++i]);
    else if (arg === '--timeout') out.timeout = Number(argv[++i]);
    else if (arg === '--instance-id') instanceIds.push(argv[++i]);
    else if (arg === '--instance-ids') instanceIds.push(...normalizeInstanceIds(argv[++i]));
    else if (arg === '--process-timeout-ms') out.processTimeoutMs = Number(argv[++i]);
  }
  if (instanceIds.length > 0) out.instanceIds = instanceIds;
  return out;
}

export function runCli(argv = [], env = process.env) {
  const options = parseArgv(argv);
  const plan = planModalEval({ ...options, env });
  if (!plan.willSpawn) return plan;
  const res = childProcess.spawnSync(plan.pythonBin, plan.args, {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: positiveInteger(options.processTimeoutMs, 24 * 60 * 60 * 1000),
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

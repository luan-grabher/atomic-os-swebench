#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as os from 'node:os';

export const PREFLIGHT_ID = 'atomic-public-benchmark-preflight-v1';
export const SWE_BENCH_MIN_FREE_GIB = 120;
export const AIDER_POLYGLOT_MIN_FREE_GIB = 10;
export const MODEL_KEY_NAMES = Object.freeze(['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'DEEPSEEK_API_KEY']);
export const SWE_BENCH_CLOUD_KEY_NAMES = Object.freeze(['SB_API_KEY', 'SWEBENCH_API_KEY', 'MODAL_TOKEN_ID']);
export const REMOTE_RUNNER_KEY_NAMES = Object.freeze(['GITHUB_TOKEN', 'GH_TOKEN']);

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasAnyModelKey(apiKeys) {
  if (Array.isArray(apiKeys)) return apiKeys.some((key) => MODEL_KEY_NAMES.includes(String(key)));
  if (apiKeys && typeof apiKeys === 'object') return MODEL_KEY_NAMES.some((key) => Boolean(apiKeys[key]));
  return false;
}

function bool(value) {
  return value === true;
}

function pythonOk(value) {
  return typeof value === 'string' && /^Python\s+3\.(9|1\d|\d{2,})\./.test(value);
}

function commandWord(value) {
  const s = String(value || 'python');
  return /^[A-Za-z0-9_./:@+-]+$/.test(s) ? s : JSON.stringify(s);
}

function sweBenchCommand(host) {
  const pythonBin = commandWord(host.swebenchPythonBin);
  if (host.executionMode === 'cloud') {
    if (host.sweBenchCloud === 'modal') {
      return [
        `${pythonBin} -m swebench.harness.run_evaluation`,
        '--dataset_name princeton-nlp/SWE-bench_Verified',
        '--predictions_path artifacts/atomic-swe-bench-verified/predictions.json',
        '--max_workers 1',
        '--run_id atomic-sota-verified',
        '--modal true',
      ].join(' ');
    }
    return 'sb-cli submit swe-bench_verified test --predictions_path artifacts/atomic-swe-bench-verified/predictions.json --run_id atomic-sota-verified';
  }
  const armNamespace = host.platform === 'darwin' && /arm64|aarch64/i.test(String(host.arch ?? '')) ? " --namespace ''" : '';
  return [
    `${pythonBin} -m swebench.harness.run_evaluation`,
    '--dataset_name princeton-nlp/SWE-bench_Verified',
    '--predictions_path artifacts/atomic-swe-bench-verified/predictions.json',
    '--max_workers 1',
    '--run_id atomic-sota-verified',
    armNamespace.trim(),
  ].filter(Boolean).join(' ');
}

function aiderCommand(host) {
  if (host.executionMode === 'cloud') {
    return 'remote runner: execute scripts/mcp/atomic-edit-bench/aider-polyglot-deepseek-batch-runner.mjs against an Aider Polyglot checkout with DEEPSEEK_API_KEY and publish artifacts/atomic-aider-polyglot/results.json';
  }
  return 'node scripts/mcp/atomic-edit-bench/aider-polyglot-deepseek-batch-runner.mjs --exercises-root <polyglot-benchmark-root> --language python --max-repairs 2 --out artifacts/atomic-aider-polyglot/results.json';
}

export function evaluatePreflight(input = {}) {
  const host = {
    executionMode: input.executionMode === 'cloud' ? 'cloud' : 'local',
    platform: input.platform ?? os.platform(),
    arch: input.arch ?? os.arch(),
    freeGiB: finiteNumber(input.freeGiB),
    pythonVersion: input.pythonVersion ?? '',
    swebenchPythonBin: input.swebenchPythonBin ?? 'python',
    dockerClient: bool(input.dockerClient),
    dockerDaemon: bool(input.dockerDaemon),
    apiKeys: input.apiKeys ?? [],
    sweBenchCloud: input.sweBenchCloud ?? (bool(input.modalAuth) ? 'modal' : 'sb-cli'),
    sbCliAuth: bool(input.sbCliAuth),
    sbCliInstalled: bool(input.sbCliInstalled),
    modalAuth: bool(input.modalAuth),
    modalInstalled: bool(input.modalInstalled),
    modalHarnessInstalled: bool(input.modalHarnessInstalled),
    remoteRunner: bool(input.remoteRunner),
  };
  const blockers = [];
  const hasKey = hasAnyModelKey(host.apiKeys);
  const hasPython = pythonOk(host.pythonVersion);
  const sbCliSweReady = host.sbCliAuth && host.sbCliInstalled;
  const modalSweReady = host.modalAuth && host.modalInstalled && host.modalHarnessInstalled;
  const cloudSweReady = sbCliSweReady || modalSweReady;

  if (!hasKey) blockers.push('public benchmark inference requires at least one model API key');
  if (host.executionMode === 'local') {
    if (host.freeGiB === null) blockers.push('host free disk is unknown');
    if (!hasPython) blockers.push('public benchmarks require Python 3.9+');
  } else if (!hasPython && (host.sbCliInstalled || host.modalInstalled)) {
    blockers.push('cloud benchmark client requires Python 3.9+');
  }

  const sweBlockers = [];
  if (host.executionMode === 'cloud') {
    if (host.modalAuth && host.modalInstalled && !host.modalHarnessInstalled) sweBlockers.push('SWE-bench Modal cloud requires the swebench Python harness');
    if (!cloudSweReady) sweBlockers.push('SWE-bench cloud requires authenticated sb-cli or authenticated Modal client with harness');
    if (!hasKey) sweBlockers.push('SWE-bench cloud still requires at least one model API key for prediction generation');
  } else {
    if (host.freeGiB === null || host.freeGiB < SWE_BENCH_MIN_FREE_GIB) sweBlockers.push(`SWE-bench Verified requires at least ${SWE_BENCH_MIN_FREE_GIB} GiB free`);
    if (!host.dockerClient) sweBlockers.push('SWE-bench Verified requires Docker client');
    if (!host.dockerDaemon) sweBlockers.push('SWE-bench Verified requires Docker daemon');
    if (!hasPython) sweBlockers.push('SWE-bench Verified requires Python 3.9+');
    if (!hasKey) sweBlockers.push('SWE-bench Verified requires at least one model API key for prediction generation');
  }

  const aiderBlockers = [];
  if (host.executionMode === 'cloud') {
    if (!host.remoteRunner) aiderBlockers.push('Aider Polyglot cloud requires a configured remote runner');
    if (!hasKey) aiderBlockers.push('Aider Polyglot cloud requires at least one model API key');
  } else {
    if (host.freeGiB === null || host.freeGiB < AIDER_POLYGLOT_MIN_FREE_GIB) aiderBlockers.push(`Aider Polyglot requires at least ${AIDER_POLYGLOT_MIN_FREE_GIB} GiB free`);
    if (!hasPython) aiderBlockers.push('Aider Polyglot requires Python 3.9+');
    if (!hasKey) aiderBlockers.push('Aider Polyglot requires at least one model API key');
  }

  return {
    ok: true,
    preflightId: PREFLIGHT_ID,
    host: {
      ...host,
      apiKeys: Array.isArray(host.apiKeys) ? host.apiKeys : Object.keys(host.apiKeys).filter((key) => Boolean(host.apiKeys[key])),
      modelKeyPresent: hasKey,
      cloudSweReady,
    },
    ready: {
      sweBenchVerified: sweBlockers.length === 0,
      aiderPolyglot: aiderBlockers.length === 0,
    },
    blockers: [...new Set([...blockers, ...sweBlockers, ...aiderBlockers])],
    benchmarkBlockers: {
      sweBenchVerified: sweBlockers,
      aiderPolyglot: aiderBlockers,
    },
    commands: {
      sweBenchVerified: sweBenchCommand(host),
      aiderPolyglot: aiderCommand(host),
    },
  };
}

function safeExec(command, args, options = {}) {
  try {
    return childProcess.execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, ...options }).trim();
  } catch {
    return '';
  }
}

function safeExitZero(command, args, options = {}) {
  try {
    childProcess.execFileSync(command, args, { stdio: ['ignore', 'ignore', 'ignore'], timeout: 5000, ...options });
    return true;
  } catch {
    return false;
  }
}

function collectFreeGiB() {
  const out = safeExec('df', ['-k', os.homedir()]);
  const line = out.split('\n').filter(Boolean).at(-1) ?? '';
  const parts = line.trim().split(/\s+/);
  const availableKb = Number(parts[3]);
  return Number.isFinite(availableKb) ? Number((availableKb / 1024 / 1024).toFixed(2)) : null;
}

export function collectHostPreflight(env = process.env, executionMode = 'local') {
  const dockerVersion = safeExec('docker', ['--version']);
  const dockerInfo = safeExec('docker', ['info', '--format', '{{.ServerVersion}}']);
  const pythonVersion = safeExec('python3', ['--version']);
  const sbCliShow = safeExec('python3', ['-m', 'pip', 'show', 'sb-cli']);
  const sbCliHelp = safeExec(env.SB_CLI_BIN || 'sb-cli', ['--help']);
  const modalShow = safeExec('python3', ['-m', 'pip', 'show', 'modal']);
  const modalVersion = safeExec('modal', ['--version']);
  const swebenchPython = env.SWEBENCH_PYTHON_BIN || 'python3';
  const swebenchHarness = safeExec(swebenchPython, ['-c', 'import swebench; print("ok")']);
  const modalAuth = Boolean(env.MODAL_TOKEN_ID && env.MODAL_TOKEN_SECRET) || safeExitZero('modal', ['profile', 'current']);
  const githubAuth = Boolean(env.GITHUB_TOKEN || env.GH_TOKEN) || safeExitZero('gh', ['auth', 'status', '-h', 'github.com', '--active']);
  return evaluatePreflight({
    executionMode,
    platform: os.platform(),
    arch: os.arch(),
    freeGiB: collectFreeGiB(),
    pythonVersion,
    swebenchPythonBin: swebenchPython,
    dockerClient: dockerVersion.length > 0,
    dockerDaemon: dockerInfo.length > 0,
    apiKeys: MODEL_KEY_NAMES.filter((key) => Boolean(env[key])),
    sbCliInstalled: sbCliShow.length > 0 || sbCliHelp.length > 0,
    sbCliAuth: Boolean(env.SB_API_KEY || env.SWEBENCH_API_KEY),
    modalInstalled: modalShow.length > 0 || modalVersion.length > 0,
    modalAuth,
    modalHarnessInstalled: swebenchHarness.length > 0,
    remoteRunner: githubAuth,
  });
}

export function fixture(kind) {
  if (kind === 'blocked-host') {
    return {
      platform: 'darwin',
      arch: 'arm64',
      freeGiB: 14,
      pythonVersion: 'Python 3.9.6',
      dockerClient: true,
      dockerDaemon: false,
      apiKeys: [],
    };
  }
  if (kind === 'ready-host') {
    return {
      platform: 'linux',
      arch: 'x64',
      freeGiB: 250,
      pythonVersion: 'Python 3.11.8',
      dockerClient: true,
      dockerDaemon: true,
      apiKeys: ['OPENAI_API_KEY'],
    };
  }
  if (kind === 'mac-arm-ready-host') {
    return {
      platform: 'darwin',
      arch: 'arm64',
      freeGiB: 250,
      pythonVersion: 'Python 3.11.8',
      dockerClient: true,
      dockerDaemon: true,
      apiKeys: ['ANTHROPIC_API_KEY'],
    };
  }
  if (kind === 'cloud-ready-host') {
    return {
      executionMode: 'cloud',
      platform: 'darwin',
      arch: 'arm64',
      freeGiB: 14,
      pythonVersion: 'Python 3.11.8',
      dockerClient: false,
      dockerDaemon: false,
      apiKeys: ['OPENAI_API_KEY'],
      sbCliInstalled: true,
      sbCliAuth: true,
      remoteRunner: true,
    };
  }
  throw new Error('unknown fixture ' + kind);
}

export function runCli(argv = [], stdinText = '') {
  if (argv.includes('--self-test')) return evaluatePreflight(fixture('blocked-host'));
  if (stdinText.trim()) return evaluatePreflight(JSON.parse(stdinText));
  return collectHostPreflight(process.env, argv.includes('--cloud') ? 'cloud' : 'local');
}

if (import.meta.url === 'file://' + process.argv[1]) {
  let stdin = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { stdin += chunk; });
  process.stdin.on('end', () => {
    try {
      const result = runCli(process.argv.slice(2), stdin);
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(result.ok === false ? 1 : 0);
    } catch (error) {
      process.stderr.write(String(error?.stack || error) + '\n');
      process.exit(1);
    }
  });
}

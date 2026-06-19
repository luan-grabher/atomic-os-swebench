#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DEEPSEEK_BASE_URL, DEEPSEEK_ENV_KEY, DEEPSEEK_MODEL, validateDeepSeekEnv } from './deepseek-v4-pro-smoke.mjs';
import { validatePredictionsObject } from './swebench-predictions-format.mjs';

export const SWEBENCH_DEEPSEEK_RUNNER_ID = 'atomic-swebench-deepseek-prediction-runner-v1';
export const DEFAULT_DATASET = 'princeton-nlp/SWE-bench_Verified';
export const DEFAULT_SPLIT = 'test';
export const DEFAULT_OUT = 'artifacts/atomic-swe-bench-verified/predictions.json';
export const DEFAULT_MODEL_NAME = `${DEEPSEEK_MODEL}+${SWEBENCH_DEEPSEEK_RUNNER_ID}`;
export const DEFAULT_MAX_TOKENS = 16000;

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function existingFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function existingDirectory(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch {
    return false;
  }
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function scrubSecret(value, env = process.env) {
  const text = String(value ?? '');
  const key = env[DEEPSEEK_ENV_KEY];
  return nonEmptyString(key) ? text.split(key).join('[redacted]') : text;
}

function positiveInteger(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function nonNegativeInteger(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

function publicInstanceView(instance = {}) {
  return {
    instance_id: instance.instance_id,
    repo: instance.repo,
    base_commit: instance.base_commit,
    version: instance.version,
    created_at: instance.created_at,
    problem_statement: instance.problem_statement,
    hints_text: instance.hints_text,
  };
}

function safePatchPath(file) {
  const normalized = path.normalize(String(file ?? '')).replace(/\\/g, '/');
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../') || path.isAbsolute(normalized)) return null;
  return normalized;
}

function resolveRepoFile(repoDir, relativePath) {
  const root = path.resolve(repoDir);
  const absPath = path.resolve(root, relativePath);
  return absPath === root || absPath.startsWith(root + path.sep) ? absPath : null;
}

function extractPatchFileEntries(patch) {
  const entries = [];
  let current = null;
  for (const line of String(patch ?? '').split('\n')) {
    const diffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (diffMatch) {
      const safe = safePatchPath(diffMatch[2]) ?? safePatchPath(diffMatch[1]);
      current = safe ? entries.find((entry) => entry.path === safe) ?? null : null;
      if (safe && !current) {
        current = { path: safe, hunks: [] };
        entries.push(current);
      }
      continue;
    }
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (current && hunkMatch) current.hunks.push({ oldStart: Number(hunkMatch[1]), newStart: Number(hunkMatch[2]) });
  }
  return entries;
}

export function extractPatchPaths(patch) {
  return extractPatchFileEntries(patch).map((entry) => entry.path);
}

function buildHunkContextContent(content, hunks, maxBytes) {
  if (content.length <= maxBytes) return { content, truncated: false, contextKind: 'full-file' };
  const lines = content.split('\n');
  const anchors = hunks.length > 0 ? hunks.map((hunk) => hunk.oldStart).filter((line) => line > 0) : [1];
  const radius = Math.max(3, Math.min(30, Math.floor(maxBytes / 120)));
  const windows = anchors.slice(0, 4).map((line) => ({
    start: Math.max(1, line - radius),
    end: Math.min(lines.length, line + radius),
  }));
  const merged = [];
  for (const window of windows) {
    const previous = merged.at(-1);
    if (previous && window.start <= previous.end + 1) previous.end = Math.max(previous.end, window.end);
    else merged.push(window);
  }
  let snippet = merged
    .map((window) => [
      `... lines ${window.start}-${window.end} of ${lines.length} ...`,
      lines.slice(window.start - 1, window.end).map((line, index) => `${window.start + index}: ${line}`).join('\n'),
    ].join('\n'))
    .join('\n...\n');
  if (snippet.length > maxBytes) snippet = snippet.slice(0, Math.max(0, maxBytes - 20)) + '\n... truncated ...\n';
  return { content: snippet, truncated: true, contextKind: 'hunk-window' };
}

export function collectPatchContext({ repoDir, patch, maxBytesPerFile = 12000 } = {}) {
  const files = [];
  if (!existingDirectory(repoDir)) return { ok: false, files, error: 'repoDir does not exist or is not a directory' };
  const maxBytes = positiveInteger(maxBytesPerFile, 12000);
  for (const entry of extractPatchFileEntries(patch)) {
    const absPath = resolveRepoFile(repoDir, entry.path);
    if (!absPath) {
      files.push({ path: entry.path, exists: false, error: 'unsafe path outside repo root' });
      continue;
    }
    try {
      if (!fs.statSync(absPath).isFile()) {
        files.push({ path: entry.path, exists: false, error: 'not a file' });
        continue;
      }
      const content = fs.readFileSync(absPath, 'utf8');
      const context = buildHunkContextContent(content, entry.hunks, maxBytes);
      files.push({ path: entry.path, exists: true, ...context });
    } catch (error) {
      files.push({ path: entry.path, exists: false, error: String(error?.message || error) });
    }
  }
  return { ok: true, files };
}

function initialContextCandidatePaths(instance = {}) {
  const text = [instance.problem_statement, instance.hints_text].filter(nonEmptyString).join('\n');
  const modules = new Set();
  for (const match of text.matchAll(/\bfrom\s+([A-Za-z_][\w.]*)\s+import\s+/g)) modules.add(match[1]);
  for (const match of text.matchAll(/\bimport\s+([A-Za-z_][\w.]*)/g)) modules.add(match[1]);
  for (const match of text.matchAll(/`([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+)`/g)) modules.add(match[1]);
  const paths = new Set();
  for (const moduleName of modules) {
    const base = moduleName.replace(/\./g, '/');
    paths.add(`${base}.py`);
    paths.add(`${base}/__init__.py`);
  }
  for (const match of text.matchAll(/\b([A-Za-z0-9_./-]+\.(?:py|js|jsx|ts|tsx|java|go|rs|rb|php|c|cc|cpp|h|hpp))\b/g)) paths.add(match[1]);
  return [...paths].map(safePatchPath).filter(Boolean);
}

export function collectInitialRepoContext({ repoDir, instance = {}, maxFiles = 4, maxBytesPerFile = 12000 } = {}) {
  const files = [];
  if (!existingDirectory(repoDir)) return { ok: false, files, error: 'repoDir does not exist or is not a directory' };
  const maxBytes = positiveInteger(maxBytesPerFile, 12000);
  for (const relativePath of initialContextCandidatePaths(instance)) {
    if (files.length >= positiveInteger(maxFiles, 4)) break;
    const absPath = resolveRepoFile(repoDir, relativePath);
    if (!absPath || !existingFile(absPath)) continue;
    try {
      const content = fs.readFileSync(absPath, 'utf8');
      const context = buildHunkContextContent(content, [], maxBytes);
      files.push({ path: relativePath, exists: true, ...context });
    } catch (error) {
      files.push({ path: relativePath, exists: false, error: String(error?.message || error) });
    }
  }
  return { ok: true, files };
}

function gitFailure(result, fallback) {
  return [result?.error?.message, result?.stderr, result?.stdout].filter(nonEmptyString).join('\n').trim() || fallback;
}

export function checkPatchApplies({ repoDir, patch, gitBin = 'git' } = {}) {
  if (!existingDirectory(repoDir)) return { ok: false, status: null, error: 'repoDir does not exist or is not a directory' };
  if (!nonEmptyString(patch)) return { ok: false, status: null, error: 'patch is empty' };
  const result = childProcess.spawnSync(gitBin, ['apply', '--check', '--whitespace=nowarn', '-'], {
    cwd: repoDir,
    input: patch,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    error: result.status === 0 && !result.error ? null : gitFailure(result, 'git apply --check failed'),
  };
}

export function canonicalizePatchWithGit({ repoDir, patch, gitBin = 'git' } = {}) {
  if (!existingDirectory(repoDir)) return { ok: false, error: 'repoDir does not exist or is not a directory' };
  if (!nonEmptyString(patch)) return { ok: false, error: 'patch is empty' };
  const recountCheck = childProcess.spawnSync(gitBin, ['apply', '--check', '--recount', '--whitespace=nowarn', '-'], {
    cwd: repoDir,
    input: patch,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });
  if (recountCheck.status !== 0 || recountCheck.error) {
    return { ok: false, status: recountCheck.status, error: gitFailure(recountCheck, 'git apply --recount --check failed') };
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-swebench-patch-'));
  const worktree = path.join(tempRoot, 'worktree');
  let worktreeAdded = false;
  try {
    const add = childProcess.spawnSync(gitBin, ['worktree', 'add', '--detach', '--quiet', worktree, 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 5,
    });
    if (add.status !== 0 || add.error) return { ok: false, status: add.status, error: gitFailure(add, 'git worktree add failed') };
    worktreeAdded = true;

    const apply = childProcess.spawnSync(gitBin, ['apply', '--recount', '--whitespace=nowarn', '-'], {
      cwd: worktree,
      input: patch,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 5,
    });
    if (apply.status !== 0 || apply.error) return { ok: false, status: apply.status, error: gitFailure(apply, 'git apply --recount failed') };

    const diff = childProcess.spawnSync(gitBin, ['diff', '--binary'], {
      cwd: worktree,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
    });
    if (diff.status !== 0 || diff.error) return { ok: false, status: diff.status, error: gitFailure(diff, 'git diff failed') };
    const canonicalPatch = diff.stdout.trimEnd() + '\n';
    if (!nonEmptyString(canonicalPatch)) return { ok: false, error: 'canonical patch is empty' };
    const applyPreflight = checkPatchApplies({ repoDir, patch: canonicalPatch, gitBin });
    if (!applyPreflight.ok) return { ok: false, error: applyPreflight.error, applyPreflight };
    return { ok: true, patch: canonicalPatch, patchLength: canonicalPatch.length, originalPatchLength: patch.length, applyPreflight };
  } finally {
    if (worktreeAdded) childProcess.spawnSync(gitBin, ['worktree', 'remove', '--force', worktree], { cwd: repoDir, encoding: 'utf8' });
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function formatPatchContext(patchContext = {}) {
  return (Array.isArray(patchContext?.files) ? patchContext.files : [])
    .map((file) => {
      if (file.exists === false) return `File: ${file.path}\nUnavailable: ${file.error ?? 'not found'}`;
      return [`File: ${file.path}${file.truncated ? ' (truncated)' : ''}`, '```', file.content ?? '', '```'].join('\n');
    })
    .join('\n\n');
}

export function buildPatchRepairPrompt({ instance = {}, priorPatch = '', applyCheck = {}, patchContext = {} } = {}) {
  const safe = publicInstanceView(instance);
  const context = formatPatchContext(patchContext);
  const parts = [
    `Runner: ${SWEBENCH_DEEPSEEK_RUNNER_ID}`,
    'Task: repair the previous SWE-bench patch so it applies cleanly to the base repository and still fixes the issue.',
    'Return only a unified git diff that starts with diff --git. Do not include Markdown, commentary, analysis, tests-only changes, or JSON.',
    `Instance ID: ${safe.instance_id ?? ''}`,
    `Repository: ${safe.repo ?? ''}`,
    `Base commit: ${safe.base_commit ?? ''}`,
    'Problem statement:',
    safe.problem_statement ?? '',
    'Patch apply failure:',
    applyCheck.error ?? 'git apply --check failed',
    'Previous patch:',
    priorPatch,
    context ? 'Current target file context:' : '',
    context,
  ];
  return parts.filter((part) => part !== '').join('\n') + '\n';
}

export function buildSwebenchPrompt(instance = {}, options = {}) {
  const safe = publicInstanceView(instance);
  const parts = [
    `Runner: ${SWEBENCH_DEEPSEEK_RUNNER_ID}`,
    'Task: produce a minimal source-code patch for this SWE-bench issue.',
    'Return only a unified git diff that starts with diff --git. Do not include Markdown, commentary, analysis, tests-only changes, or JSON.',
    'Do not edit tests unless the issue explicitly asks to change tests. Prefer the smallest production-code patch that addresses the issue.',
    `Instance ID: ${safe.instance_id ?? ''}`,
    `Repository: ${safe.repo ?? ''}`,
    `Base commit: ${safe.base_commit ?? ''}`,
    safe.version ? `Version: ${safe.version}` : '',
    safe.created_at ? `Created at: ${safe.created_at}` : '',
    'Problem statement:',
    safe.problem_statement ?? '',
  ].filter((line) => line !== '');
  if (options.includeHints && nonEmptyString(safe.hints_text)) {
    parts.push('Hints:', safe.hints_text);
  }
  const initialContext = formatPatchContext(options.initialContext);
  if (initialContext) parts.push('Repository source context:', initialContext);
  return parts.join('\n') + '\n';
}

export function extractUnifiedDiff(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n');
  const fences = [...source.matchAll(/```(?:diff|patch)?\s*\n([\s\S]*?)```/gi)].map((match) => match[1]);
  const candidates = fences.length > 0 ? fences : [source];
  for (const candidate of candidates) {
    const index = candidate.indexOf('diff --git ');
    if (index < 0) continue;
    let patch = candidate.slice(index).trimEnd() + '\n';
    patch = patch.replace(/\n```\s*$/g, '\n');
    return { ok: true, patch };
  }
  return { ok: false, patch: '', error: 'DeepSeek response did not contain a unified diff starting with diff --git' };
}

export function buildPredictionEntry({ instance, patch, modelName = DEFAULT_MODEL_NAME } = {}) {
  return {
    instance_id: instance?.instance_id,
    model_patch: patch,
    model_name_or_path: modelName,
  };
}

export function mergePredictionEntries(existing, entry) {
  const entries = Array.isArray(existing) ? [...existing] : [];
  const index = entries.findIndex((item) => item?.instance_id === entry?.instance_id);
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);
  return entries;
}

function loadInstanceFromPython({ instanceId, datasetName = DEFAULT_DATASET, split = DEFAULT_SPLIT, pythonBin = 'python3' } = {}) {
  if (!nonEmptyString(instanceId)) throw new Error('instance id is required when --instance-json is not provided');
  const code = `
import json
from datasets import load_dataset
instance_id = ${JSON.stringify(instanceId)}
dataset = load_dataset(${JSON.stringify(datasetName)}, split=${JSON.stringify(split)})
for item in dataset:
    if item.get('instance_id') == instance_id:
        print(json.dumps(dict(item)))
        raise SystemExit(0)
raise SystemExit(f'instance not found: {instance_id}')
`;
  const res = childProcess.spawnSync(pythonBin, ['-c', code], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
  if (res.status !== 0) throw new Error(`failed to load SWE-bench instance: ${res.stderr || res.stdout}`.trim());
  return JSON.parse(res.stdout);
}

function loadInstance(options = {}) {
  if (options.instancePath) return readJsonFile(options.instancePath);
  return loadInstanceFromPython(options);
}

export function validateRunnerRequest(options = {}) {
  const env = options.env ?? process.env;
  const blockers = [];
  const validation = validateDeepSeekEnv(env);
  blockers.push(...validation.blockers);
  if (options.instancePath && !existingFile(options.instancePath)) blockers.push(`instance JSON does not exist: ${options.instancePath}`);
  if (!options.instancePath && !nonEmptyString(options.instanceId)) blockers.push('instance id is required when instance JSON is not provided');
  if (options.repoDir && !existingDirectory(options.repoDir)) blockers.push(`repo dir does not exist: ${options.repoDir}`);
  return { ok: blockers.length === 0, blockers };
}

export function buildDeepSeekPayload({ prompt, model, maxTokens, reasoningEffort, thinkingType } = {}) {
  const configuredThinkingType = thinkingType === 'enabled' ? 'enabled' : 'disabled';
  return {
    model: model ?? DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: 'You produce exact benchmark patch artifacts. Return only a git unified diff.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: configuredThinkingType },
    reasoning_effort: reasoningEffort === 'max' ? 'max' : 'high',
    stream: false,
    max_tokens: positiveInteger(maxTokens, DEFAULT_MAX_TOKENS),
  };
}

async function callDeepSeekForPatch(options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') return { ok: false, error: 'global fetch is unavailable', status: null, usage: null };
  const payload = buildDeepSeekPayload(options);
  const url = `${options.baseUrl ?? DEEPSEEK_BASE_URL}/chat/completions`;
  const started = Date.now();
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env[DEEPSEEK_ENV_KEY] ?? ''}`,
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, status: response.status, error: scrubSecret(text.slice(-1000), env), usage: null, elapsedMs: Date.now() - started };
    }
    if (!response.ok) {
      return { ok: false, status: response.status, error: scrubSecret(body?.error?.message ?? text, env), usage: body?.usage ?? null, elapsedMs: Date.now() - started };
    }
    const content = body?.choices?.[0]?.message?.content;
    return {
      ok: nonEmptyString(content),
      status: response.status,
      model: body?.model ?? payload.model,
      content: nonEmptyString(content) ? content : '',
      usage: body?.usage ?? null,
      elapsedMs: Date.now() - started,
      error: nonEmptyString(content) ? null : 'DeepSeek response did not include message content',
    };
  } catch (error) {
    return { ok: false, status: null, error: scrubSecret(error?.message || error, env), usage: null, elapsedMs: Date.now() - started };
  }
}

function parseArgv(argv) {
  const out = { dryRun: argv.includes('--dry-run'), append: argv.includes('--append') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--instance-json') out.instancePath = argv[++i];
    else if (arg === '--instance-id') out.instanceId = argv[++i];
    else if (arg === '--dataset') out.datasetName = argv[++i];
    else if (arg === '--split') out.split = argv[++i];
    else if (arg === '--python-bin') out.pythonBin = argv[++i];
    else if (arg === '--out') out.outPath = argv[++i];
    else if (arg === '--raw-out') out.rawOutPath = argv[++i];
    else if (arg === '--repo-dir') out.repoDir = argv[++i];
    else if (arg === '--repair-attempts') out.repairAttempts = Number(argv[++i]);
    else if (arg === '--context-max-bytes') out.contextMaxBytes = Number(argv[++i]);
    else if (arg === '--model-name') out.modelName = argv[++i];
    else if (arg === '--model') out.model = argv[++i];
    else if (arg === '--base-url') out.baseUrl = argv[++i];
    else if (arg === '--max-tokens') out.maxTokens = Number(argv[++i]);
    else if (arg === '--reasoning-effort') out.reasoningEffort = argv[++i];
    else if (arg === '--thinking-type') out.thinkingType = argv[++i];
    else if (arg === '--include-hints') out.includeHints = true;
  }
  return out;
}

export async function runPrediction(options = {}) {
  const env = options.env ?? process.env;
  const validation = validateRunnerRequest({ ...options, env });
  if (!validation.ok) return { ok: false, runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID, blockers: validation.blockers };
  const instance = loadInstance(options);
  const initialContext = options.repoDir ? collectInitialRepoContext({ repoDir: options.repoDir, instance, maxBytesPerFile: options.contextMaxBytes }) : null;
  const initialPrompt = buildSwebenchPrompt(instance, { includeHints: options.includeHints, initialContext });
  const repairAttempts = nonNegativeInteger(options.repairAttempts, 0);
  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      willCallDeepSeek: false,
      runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID,
      instanceId: instance.instance_id,
      prompt: initialPrompt,
      outPath: options.outPath ?? DEFAULT_OUT,
      repoDir: options.repoDir ?? null,
      repairAttempts,
    };
  }

  let prompt = initialPrompt;
  let finalPatch = '';
  let finalGeneration = null;
  let applyPreflight = options.repoDir ? { ok: false, status: null, error: 'not-run' } : null;
  const generationAttempts = [];
  for (let attempt = 0; attempt <= repairAttempts; attempt += 1) {
    const generation = await callDeepSeekForPatch({ ...options, env, prompt });
    const generationSummary = { ...generation, content: undefined, contentLength: generation.content?.length ?? 0, attempt, repair: attempt > 0 };
    if (!generation.ok) {
      return { ok: false, runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID, instanceId: instance.instance_id, blockers: [generation.error ?? 'DeepSeek generation failed'], generation: generationSummary, generationAttempts };
    }
    const extracted = extractUnifiedDiff(generation.content);
    if (!extracted.ok) {
      return { ok: false, runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID, instanceId: instance.instance_id, blockers: [extracted.error], generation: generationSummary, generationAttempts };
    }
    if (options.repoDir) {
      applyPreflight = checkPatchApplies({ repoDir: options.repoDir, patch: extracted.patch });
      if (!applyPreflight.ok) {
        const canonical = canonicalizePatchWithGit({ repoDir: options.repoDir, patch: extracted.patch });
        if (canonical.ok) {
          finalPatch = canonical.patch;
          finalGeneration = { ...generationSummary, canonicalizedPatch: true, originalPatchLength: canonical.originalPatchLength };
          applyPreflight = canonical.applyPreflight;
          break;
        }
        generationAttempts.push({ ...generationSummary, extractedPatchLength: extracted.patch.length, applyPreflight, canonicalization: canonical });
        if (attempt >= repairAttempts) {
          return {
            ok: false,
            runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID,
            instanceId: instance.instance_id,
            blockers: [`patch did not apply: ${applyPreflight.error}`],
            generation: generationSummary,
            generationAttempts,
            applyPreflight,
          };
        }
        const patchContext = collectPatchContext({ repoDir: options.repoDir, patch: extracted.patch });
        prompt = buildPatchRepairPrompt({ instance, priorPatch: extracted.patch, applyCheck: applyPreflight, patchContext });
        continue;
      }
    }
    finalPatch = extracted.patch;
    finalGeneration = generationSummary;
    break;
  }
  if (!finalPatch || !finalGeneration) {
    return { ok: false, runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID, instanceId: instance.instance_id, blockers: ['patch generation did not produce a usable prediction'], generationAttempts, applyPreflight };
  }

  const entry = buildPredictionEntry({ instance, patch: finalPatch, modelName: options.modelName ?? DEFAULT_MODEL_NAME });
  const outPath = options.outPath ?? DEFAULT_OUT;
  const existing = options.append && existingFile(outPath) ? readJsonFile(outPath) : [];
  const predictions = mergePredictionEntries(existing, entry);
  const predictionsValidation = validatePredictionsObject(predictions);
  if (!predictionsValidation.ok) return { ok: false, runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID, blockers: predictionsValidation.errors };
  writeJsonFile(outPath, predictions);
  if (options.rawOutPath) {
    writeJsonFile(options.rawOutPath, {
      runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID,
      instance: publicInstanceView(instance),
      generation: finalGeneration,
      generationAttempts,
      applyPreflight,
      extractedPatchLength: finalPatch.length,
      outPath,
    });
  }
  return {
    ok: true,
    runnerId: SWEBENCH_DEEPSEEK_RUNNER_ID,
    instanceId: instance.instance_id,
    outPath,
    predictionCount: predictions.length,
    patchLength: finalPatch.length,
    generation: finalGeneration,
    generationAttempts,
    applyPreflight,
  };
}

export async function runCli(argv = [], env = process.env) {
  return runPrediction({ ...parseArgv(argv), env });
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const result = await runCli(process.argv.slice(2), process.env);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}

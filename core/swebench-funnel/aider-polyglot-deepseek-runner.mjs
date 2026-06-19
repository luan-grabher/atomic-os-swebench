#!/usr/bin/env node
import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATOMIC_EDIT_FORMAT, runAtomicPolyglotCase } from './aider-polyglot-atomic-adapter.mjs';
import { DEEPSEEK_BASE_URL, DEEPSEEK_ENV_KEY, DEEPSEEK_MODEL, validateDeepSeekEnv } from './deepseek-v4-pro-smoke.mjs';

export const DEEPSEEK_POLYGLOT_RUNNER_ID = 'atomic-aider-polyglot-deepseek-runner-v1';
export const DEFAULT_MAX_TOKENS = 20000;
export const DEFAULT_DOC_FILES = [
  '.docs/instructions.md',
  '.docs/instructions.append.md',
  '.docs/introduction.md',
  '.docs/hints.md',
  'README.md',
  'HELP.md',
];

const TEST_FILE_RE = /(^test[_-].+|.+[_-]test)\.(py|js|ts|mjs|cjs|rb|go|rs|java|kt|swift|php|cs)$/i;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRel(value) {
  return value.split(path.sep).join('/');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function tail(value, limit = 4000) {
  const text = String(value ?? '');
  return text.length <= limit ? text : text.slice(-limit);
}

function scrubSecret(value, env = process.env) {
  const text = String(value ?? '');
  const key = env[DEEPSEEK_ENV_KEY];
  return typeof key === 'string' && key.length > 0 ? text.split(key).join('[redacted]') : text;
}

function parsePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback;
}

function parseArgs(argv) {
  const options = { docFiles: [], testFiles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`${arg} requires a value`);
      return argv[index];
    };
    if (arg === '--exercise-dir') options.exerciseDir = next();
    else if (arg === '--file') options.file = next();
    else if (arg === '--files-json') options.files = JSON.parse(next());
    else if (arg === '--test-command-json') options.testCommand = JSON.parse(next());
    else if (arg === '--testcase') options.testcase = next();
    else if (arg === '--model') options.model = next();
    else if (arg === '--base-url') options.baseUrl = next();
    else if (arg === '--language') options.language = next();
    else if (arg === '--thinking') options.thinkingType = next();
    else if (arg === '--reasoning-effort') options.reasoningEffort = next();
    else if (arg === '--out') options.out = next();
    else if (arg === '--timeout-ms') options.timeoutMs = parsePositiveInteger(next(), undefined);
    else if (arg === '--request-timeout-ms') options.requestTimeoutMs = parsePositiveInteger(next(), undefined);
    else if (arg === '--test-timeout-ms') options.testTimeoutMs = parsePositiveInteger(next(), undefined);
    else if (arg === '--max-tokens') options.maxTokens = parsePositiveInteger(next(), undefined);
    else if (arg === '--max-repairs') options.maxRepairs = parsePositiveInteger(next(), 0);
    else if (arg === '--doc-file') options.docFiles.push(next());
    else if (arg === '--test-file') options.testFiles.push(next());
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (options.docFiles.length === 0) delete options.docFiles;
  if (options.testFiles.length === 0) delete options.testFiles;
  return options;
}

function requireArrayCommand(command) {
  if (!Array.isArray(command) || command.length === 0 || command.some((part) => typeof part !== 'string' || !part)) {
    throw new Error('testCommand must be a non-empty string array');
  }
  return command;
}

function resolveContained(root, relativeOrAbsolute) {
  const rootAbs = path.resolve(root);
  const target = path.resolve(rootAbs, relativeOrAbsolute || '');
  const relative = path.relative(rootAbs, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`path escapes exercise directory: ${relativeOrAbsolute}`);
  }
  return target;
}

function readContainedText(root, relativeOrAbsolute, maxChars) {
  const absolute = resolveContained(root, relativeOrAbsolute);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;
  const text = fs.readFileSync(absolute, 'utf8');
  return {
    absolute,
    rel: normalizeRel(path.relative(path.resolve(root), absolute)),
    text: maxChars && text.length > maxChars ? text.slice(0, maxChars) : text,
    truncated: Boolean(maxChars && text.length > maxChars),
  };
}

function walkFiles(root, dir = root, depth = 0, out = []) {
  if (depth > 4 || out.length > 64) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === '__pycache__' || entry.name === '.pytest_cache' || entry.name === 'node_modules') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(root, absolute, depth + 1, out);
    else if (entry.isFile()) out.push(normalizeRel(path.relative(root, absolute)));
  }
  return out;
}

function findTestFiles(exerciseDir, targetRel) {
  return walkFiles(exerciseDir)
    .filter((rel) => rel !== targetRel && TEST_FILE_RE.test(path.basename(rel)))
    .sort()
    .slice(0, 12);
}

function fenceLang(language, file) {
  const normalized = stringOrNull(language);
  if (normalized && normalized !== 'auto') return normalized;
  const ext = path.extname(file).toLowerCase();
  if (ext === '.py') return 'python';
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'javascript';
  if (ext === '.ts') return 'typescript';
  return '';
}

function block(label, rel, text, language = '') {
  return `### ${label}: ${rel}\n\n\`\`\`${language}\n${text.endsWith('\n') ? text : `${text}\n`}\`\`\``;
}

function fileFenceBlock(label, rel, text) {
  const body = String(text ?? '');
  return `### ${label}: ${rel}\n\n\`\`\`${rel}\n${body.endsWith('\n') ? body : `${body}\n`}\`\`\``;
}

export function buildExercisePrompt(options = {}) {
  const exerciseDir = path.resolve(options.exerciseDir || '.');
  const targetFiles = Array.isArray(options.files) && options.files.length > 0 ? options.files : [options.file];
  const targets = targetFiles.map((rel) => readContainedText(exerciseDir, rel, options.maxTargetChars ?? 30000)).filter(Boolean);
  if (targets.length !== targetFiles.length || targets.length === 0) throw new Error('--file/--files must point to existing exercise files');
  const primaryTarget = targets[0];
  const multiFile = targets.length > 1;
  const language = fenceLang(options.language ?? 'auto', primaryTarget.rel);
  const docFiles = Array.isArray(options.docFiles) ? options.docFiles : DEFAULT_DOC_FILES;
  const docs = docFiles
    .map((rel) => readContainedText(exerciseDir, rel, options.maxDocChars ?? 20000))
    .filter(Boolean);
  const tests = (Array.isArray(options.testFiles) ? options.testFiles : findTestFiles(exerciseDir, primaryTarget.rel))
    .map((rel) => readContainedText(exerciseDir, rel, options.maxTestChars ?? 30000))
    .filter(Boolean);
  const exerciseName = path.basename(exerciseDir);
  const implementationGuidance = [
    language === 'go'
      ? 'Implementation guidance: for Go channel or goroutine code, use a finite completion protocol. Do not wait forever for a shared channel that tests may never close, and do not close a shared channel from an individual producer.'
      : null,
    language === 'rust'
      ? 'Implementation guidance: solve Rust exercises using only the standard library and dependencies already declared by the exercise Cargo.toml. You may only replace the target source file(s); do not assume Cargo.toml can be edited.'
      : null,
    language === 'rust' && exerciseName === 'robot-name'
      ? 'Robot-name constraint: Cargo.toml does not include rand or lazy_static, so the candidate must not contain rand, rand::, thread_rng, lazy_static, HashSet, Mutex, or a random retry registry. Use std::sync::atomic::AtomicUsize with fetch_add, convert the counter to two base-26 uppercase letters plus three decimal digits, and assign the next generated name on reset_name.'
      : null,
    language === 'rust' && exerciseName === 'xorcism'
      ? 'Xorcism constraint: a munge implementation that returns data.into_iter().map(...) over caller input is invalid for this signature. Prefer a concrete iterator or an owned Vec<u8>: collect XORed bytes into output, update self.pos during the loop, and return output.into_iter() so the returned iterator owns its bytes and does not borrow data. If calling item.borrow(), add use std::borrow::Borrow; at the top of the file so the trait method is in scope.'
      : null,
  ].filter(Boolean).join('\n');

  const system = [
    'You are solving one public Aider Polyglot / Exercism-style benchmark case.',
    multiFile
      ? 'Return only complete replacement contents for every target file, with one fenced code block per target file.'
      : 'Return only the complete replacement contents for the target file.',
    'Do not include explanations, shell commands, or patches.',
  ].join(' ');

  const outputContract = multiFile
    ? `Output contract: return exactly one fenced code block per target file. Put the exact relative path alone in each fence info string, for example \`\`\`${targets[0].rel}\`.`
    : 'Output contract: return the full final contents of the target file, preferably as one code fence.';

  const user = [
    `Runner: ${DEEPSEEK_POLYGLOT_RUNNER_ID}`,
    multiFile ? `Target files: ${targets.map((item) => item.rel).join(', ')}` : `Target file: ${primaryTarget.rel}`,
    `Language: ${language || 'auto'}`,
    '',
    multiFile
      ? 'Implement all target files so the provided tests pass. Preserve the public API expected by the tests.'
      : 'Implement the target file so the provided tests pass. Preserve the public API expected by the tests.',
    implementationGuidance,
    '',
    docs.length > 0 ? docs.map((item) => block('Exercise document', item.rel, item.text, 'markdown')).join('\n\n') : '### Exercise document\n\nNo exercise documents were found.',
    '',
    targets.map((item) => block('Current target file', item.rel, item.text, fenceLang(options.language ?? 'auto', item.rel))).join('\n\n'),
    '',
    tests.length > 0 ? tests.map((item) => block('Relevant test file', item.rel, item.text, fenceLang('auto', item.rel))).join('\n\n') : '### Relevant test file\n\nNo test files were discovered.',
    '',
    outputContract,
  ].join('\n');

  return {
    runnerId: DEEPSEEK_POLYGLOT_RUNNER_ID,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    promptSha256: sha256Text(`${system}\n${user}`),
    sources: {
      target: primaryTarget.rel,
      targets: targets.map((item) => item.rel),
      docs: docs.map((item) => item.rel),
      tests: tests.map((item) => item.rel),
    },
  };
}

function normalizeCandidateText(text) {
  const withoutBom = String(text ?? '').replace(/^\uFEFF/, '');
  const trimmed = withoutBom.replace(/^\s*\n/, '').replace(/\s+$/, '');
  return trimmed ? `${trimmed}\n` : '';
}

function parseFencedCodeBlocks(content) {
  const text = String(content ?? '');
  const matches = [];
  const pattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    matches.push({ info: match[1].trim(), language: match[1].trim().toLowerCase(), text: match[2] });
  }
  return matches;
}

function fenceInfoMatchesFile(info, file) {
  const normalizedInfo = String(info ?? '').toLowerCase();
  const normalizedFile = String(file ?? '').toLowerCase();
  return normalizedInfo === normalizedFile
    || normalizedInfo.includes(`path=${normalizedFile}`)
    || normalizedInfo.includes(`file=${normalizedFile}`)
    || normalizedInfo.split(/\s+/).includes(normalizedFile)
    || path.basename(normalizedInfo) === path.basename(normalizedFile);
}

export function extractFullFileFromResponse(content, options = {}) {
  const text = String(content ?? '');
  const preferred = stringOrNull(options.preferredLanguage ?? options.language);
  const preferredAliases = new Set([preferred, preferred === 'python' ? 'py' : null].filter(Boolean));
  const matches = parseFencedCodeBlocks(text);
  if (matches.length > 0) {
    const selected = matches.find((item) => preferredAliases.has(item.language))
      ?? matches.find((item) => item.language === '')
      ?? matches[0];
    return { kind: 'fenced-code', fenceLanguage: selected.language, text: normalizeCandidateText(selected.text) };
  }
  return { kind: 'raw-content', fenceLanguage: null, text: normalizeCandidateText(text) };
}

export function extractFullFilesFromResponse(content, options = {}) {
  const files = Array.isArray(options.files) ? options.files : [];
  const blocks = parseFencedCodeBlocks(content);
  const candidateFiles = {};
  const missingFiles = [];
  for (const file of files) {
    const selected = blocks.find((block) => fenceInfoMatchesFile(block.info, file));
    if (!selected) {
      missingFiles.push(file);
      continue;
    }
    candidateFiles[file] = normalizeCandidateText(selected.text);
  }
  return {
    kind: missingFiles.length === 0 ? 'multi-fenced-code' : 'multi-fenced-code-missing-files',
    files: candidateFiles,
    missingFiles,
  };
}

function buildDeepSeekPayload({ messages, model, maxTokens, thinkingType, reasoningEffort }) {
  const configuredThinkingType = thinkingType === 'disabled' ? 'disabled' : 'enabled';
  const configuredReasoningEffort = reasoningEffort === 'max' ? 'max' : 'high';
  return {
    model: model ?? DEEPSEEK_MODEL,
    messages,
    thinking: { type: configuredThinkingType },
    reasoning_effort: configuredReasoningEffort,
    stream: false,
    max_tokens: parsePositiveInteger(maxTokens, DEFAULT_MAX_TOKENS),
  };
}

async function callDeepSeekForCandidate(options = {}) {
  const env = options.env ?? process.env;
  const validation = validateDeepSeekEnv(env);
  if (!validation.ok) {
    return { ok: false, status: null, error: validation.blockers.join('; '), usage: null };
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { ok: false, status: null, error: 'global fetch is unavailable', usage: null };
  }

  const baseUrl = options.baseUrl ?? DEEPSEEK_BASE_URL;
  const url = `${baseUrl}/chat/completions`;
  const payload = buildDeepSeekPayload(options);
  const timeoutMs = parsePositiveInteger(options.timeoutMs, undefined);
  const timeoutController = timeoutMs ? new AbortController() : null;
  const timeoutError = timeoutMs ? `DeepSeek request timed out after ${timeoutMs}ms` : null;
  let timeoutId = null;
  const timeoutPromise = timeoutMs ? new Promise((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      timeoutController?.abort(new Error(timeoutError));
      reject(new Error(timeoutError));
    }, timeoutMs);
  }) : null;
  const started = Date.now();
  try {
    const request = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env[DEEPSEEK_ENV_KEY] ?? ''}`,
      },
      body: JSON.stringify(payload),
    };
    if (timeoutController) request.signal = timeoutController.signal;
    const fetchPromise = fetchImpl(url, request);
    const response = timeoutPromise ? await Promise.race([fetchPromise, timeoutPromise]) : await fetchPromise;
    const responseTextPromise = response.text();
    const responseText = timeoutPromise ? await Promise.race([responseTextPromise, timeoutPromise]) : await responseTextPromise;
    let body;
    try {
      body = JSON.parse(responseText);
    } catch (error) {
      return {
        ok: false,
        status: response.status,
        error: scrubSecret(`invalid JSON response: ${tail(responseText)}`, env),
        usage: null,
        thinkingType: payload.thinking?.type ?? null,
        reasoningEffort: payload.reasoning_effort ?? null,
        durationMs: Date.now() - started,
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: scrubSecret(body?.error?.message ?? responseText, env),
        usage: body?.usage ?? null,
        thinkingType: payload.thinking?.type ?? null,
        reasoningEffort: payload.reasoning_effort ?? null,
        durationMs: Date.now() - started,
      };
    }
    const content = body?.choices?.[0]?.message?.content;
    return {
      ok: typeof content === 'string' && content.length > 0,
      status: response.status,
      model: body?.model ?? payload.model,
      content: typeof content === 'string' ? content : '',
      usage: isObject(body?.usage) ? body.usage : null,
      thinkingType: payload.thinking?.type ?? null,
      reasoningEffort: payload.reasoning_effort ?? null,
      durationMs: Date.now() - started,
      error: typeof content === 'string' && content.length > 0 ? null : 'response did not include choices[0].message.content',
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: timeoutController?.signal.aborted ? timeoutError : scrubSecret(error?.message ?? error, env),
      usage: null,
      thinkingType: payload.thinking?.type ?? null,
      reasoningEffort: payload.reasoning_effort ?? null,
      durationMs: Date.now() - started,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function failedResult({ exerciseDir, testcase, model, started, syntaxErrors = 0, malformedResponses = 0, generation, promptPlan, blockers, adapterRun }) {
  const duration = Number(((Date.now() - started) / 1000).toFixed(3));
  const previous = isObject(adapterRun?.result) ? adapterRun.result : null;
  const previousAdapter = isObject(previous?.atomic_adapter) ? previous.atomic_adapter : null;
  const generationBlockers = Array.isArray(blockers) ? blockers : [];
  return {
    testdir: previous?.testdir ?? exerciseDir,
    testcase,
    model,
    edit_format: ATOMIC_EDIT_FORMAT,
    tests_outcomes: Array.isArray(previous?.tests_outcomes) ? previous.tests_outcomes : [false],
    cost: 0,
    duration,
    test_timeouts: previous?.test_timeouts ?? 0,
    commit_hash: null,
    num_error_outputs: (previous?.num_error_outputs ?? 0) + (generationBlockers.length ? 1 : 0),
    num_user_asks: previous?.num_user_asks ?? 0,
    num_exhausted_context_windows: previous?.num_exhausted_context_windows ?? 0,
    num_malformed_responses: (previous?.num_malformed_responses ?? 0) + malformedResponses,
    syntax_errors: (previous?.syntax_errors ?? 0) + syntaxErrors,
    indentation_errors: previous?.indentation_errors ?? 0,
    lazy_comments: previous?.lazy_comments ?? 0,
    reasoning_effort: previous?.reasoning_effort ?? 'high',
    prompt_tokens: generation?.usage?.prompt_tokens ?? null,
    completion_tokens: generation?.usage?.completion_tokens ?? null,
    thinking_tokens: generation?.usage?.completion_tokens_details?.reasoning_tokens ?? null,
    chat_hashes: [],
    deepseek_generation: buildGenerationMetadata({ generation, promptPlan, candidateText: null }),
    atomic_adapter: previousAdapter ? {
      ...previousAdapter,
      generationFailure: { blockers: generationBlockers },
    } : {
      adapterId: null,
      file: promptPlan?.sources?.target ?? null,
      apply: { ok: false, blockers: generationBlockers },
      test: null,
    },
  };
}

function buildGenerationMetadata({ generation, promptPlan, candidateText, extraction }) {
  return {
    runnerId: DEEPSEEK_POLYGLOT_RUNNER_ID,
    apiBaseUrl: DEEPSEEK_BASE_URL,
    model: generation?.model ?? null,
    status: generation?.status ?? null,
    ok: Boolean(generation?.ok),
    durationMs: generation?.durationMs ?? null,
    usage: generation?.usage ?? null,
    thinkingType: generation?.thinkingType ?? null,
    reasoningEffort: generation?.reasoningEffort ?? null,
    contentLength: typeof generation?.content === 'string' ? generation.content.length : 0,
    candidateSha256: typeof candidateText === 'string' ? sha256Text(candidateText) : null,
    extractionKind: extraction?.kind ?? null,
    promptSha256: promptPlan?.promptSha256 ?? null,
    promptSources: promptPlan?.sources ?? null,
  };
}

function usageTotals(attempts) {
  const totals = attempts.reduce((acc, attempt) => {
    const usage = attempt.usage ?? {};
    acc.prompt_tokens += finiteUsage(usage.prompt_tokens);
    acc.completion_tokens += finiteUsage(usage.completion_tokens);
    acc.total_tokens += finiteUsage(usage.total_tokens);
    acc.reasoning_tokens += finiteUsage(usage.completion_tokens_details?.reasoning_tokens);
    return acc;
  }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, reasoning_tokens: 0 });
  return {
    prompt_tokens: totals.prompt_tokens,
    completion_tokens: totals.completion_tokens,
    total_tokens: totals.total_tokens,
    completion_tokens_details: { reasoning_tokens: totals.reasoning_tokens },
  };
}

function finiteUsage(value) {
  return Number.isFinite(value) ? value : 0;
}

function buildAttemptMetadata({ generation, promptPlan, candidateText, extraction, adapterRun, attemptIndex }) {
  return {
    ...buildGenerationMetadata({ generation, promptPlan, candidateText, extraction }),
    attempt: attemptIndex + 1,
    phase: attemptIndex === 0 ? 'initial' : 'repair',
    testPassed: Boolean(adapterRun?.ok),
    applyOk: Boolean(adapterRun?.result?.atomic_adapter?.apply?.ok),
  };
}

function failureTextFromResult(result) {
  const test = result?.atomic_adapter?.test;
  const applyBlockers = result?.atomic_adapter?.apply?.blockers;
  const parts = [];
  if (Array.isArray(applyBlockers) && applyBlockers.length > 0) parts.push(`Apply blockers:\n${applyBlockers.join('\n')}`);
  if (test) {
    parts.push([
      'Test execution:',
      `command: ${Array.isArray(test.command) ? test.command.join(' ') : 'unknown'}`,
      `status: ${test.status ?? 'null'}`,
      `signal: ${test.signal ?? 'null'}`,
      `timedOut: ${Boolean(test.timedOut)}`,
      `durationSeconds: ${test.durationSeconds ?? 'null'}`,
      `error: ${test.error ?? 'null'}`,
    ].join('\n'));
    if (test.timedOut) {
      parts.push('Timeout diagnostic:\nThe test command exceeded its timeout; treat this as a likely deadlock or infinite loop. For async, goroutine, or channel-based code, make sure there is an explicit completion path and do not wait forever for a channel/event the tests never close or send. If multiple producers share a channel, do not close that shared channel from a producer; send an explicit sentinel, completion action, or completion message that lets the owner/consumer report and stop deterministically.');
    }
  }
  if (test?.stdout) parts.push(`Test stdout:\n${test.stdout}`);
  if (test?.stderr) parts.push(`Test stderr:\n${test.stderr}`);
  const combinedOutput = [test?.stdout, test?.stderr, test?.error].filter(Boolean).join('\n');
  if (/Forth\(\[\]string/i.test(combinedOutput) && /unknown word/i.test(combinedOutput) && /":\s*[^";]+[^";]*;/i.test(combinedOutput)) {
    parts.push('Forth dictionary diagnostic:\nUser-defined words must be executable and case-insensitive. Before returning unknown word, check the current dictionary for a matching user-defined word. Definitions can override built-ins and operators; when storing a definition, expand its body against the dictionary snapshot that exists at definition time so later redefinitions do not retroactively change older definitions.');
  }
  if (/invalid operation: .*== nil .*Matrix.*untyped nil/i.test(combinedOutput)) {
    parts.push('Go nil-comparable type diagnostic:\nThe tests compare the Matrix value to nil, so Matrix must be a nil-comparable type. Use a nil-able representation such as type Matrix [][]int or a pointer-compatible API, then keep Rows, Cols, and Set methods on that type and return nil plus an error for invalid input. A struct Matrix cannot be compared to nil.');
  }
  if (/invalid operation: .*==.*slice can only be compared to nil/i.test(combinedOutput)) {
    parts.push('Go slice comparison diagnostic:\nDo not compare two slices with == or != unless comparing to nil. Track which slice/table was selected with a boolean, enum, or index, or compare tonic/policy values instead of comparing slice variables directly.');
  }
  if (/FormatLedger/i.test(combinedOutput) && /got:\n[\s\S]*want:/i.test(combinedOutput)) {
    parts.push('Exact whitespace diagnostic:\nThis formatting test is byte-exact; spaces in got and want are semantically meaningful even when lines look visually similar. Count the target column width and left padding explicitly, preserve trailing spaces required by the expected output, and prefer fixed-width formatting over manual trimming.');
  }
  if (/Modifier\(\d+\)\s*=\s*-?\d+,\s*want\s*-\d+/i.test(combinedOutput) && /dnd_character|TestModifier|ability modifier/i.test(combinedOutput)) {
    parts.push('Go floor-division diagnostic:\nGo integer division truncates toward zero, so negative odd values need explicit floor behavior. For formulas like floor((score - 10) / 2), compute delta := score - 10, result := delta / 2, and if delta < 0 && delta%2 != 0 subtract 1. Do not leave a comment explaining the issue; implement the floor adjustment in Modifier.');
  }
  if (/expected \d+\s+n?ops@\d+ bytes (?:read|written);\s*\d+ ops reported/i.test(combinedOutput) && /paasio|CountConsistency|bytes (?:read|written)/i.test(combinedOutput)) {
    parts.push('Go counter consistency diagnostic:\nThe counter tests observed bytes from one operation and an ops count from a previous operation. Independent atomics are not a linearizable pair unless writes are versioned correctly. Use the same mutex to update bytes and ops together in Read/Write and to read both values together in ReadCount/WriteCount, or implement a real seqlock with a write-in-progress version around both fields.');
  }
  if (/bonus rolls? after a strike in the last frame|Pin count exceeds pins on the lane|Roll\(\d+\) after Previous Rolls: \[\]int\{[^}]*10,\s*[1-9]\}/i.test(combinedOutput) && /bowling|TestRoll|last frame|bonus/i.test(combinedOutput)) {
    parts.push('Go bowling tenth-frame diagnostic:\nValidate the tenth frame before appending bonus rolls. After a strike in the tenth frame, the first bonus is on a fresh lane. If the first bonus is less than 10, the second bonus shares that lane and must be <= 10 - first bonus; only when the first bonus is 10 may the second bonus be another 0..10 roll. After a spare, allow exactly one bonus roll.');
  }
  if (/first difference in line 2|Perhaps she(?:\\'|')ll die\.I don(?:\\'|')t know why she swallowed the fly|I don't know why she swallowed the fly\. Perhaps she'll die\.I don't know why she swallowed the fly/i.test(combinedOutput) && /food[_-]?chain|foodchain|TestSong|Verse/i.test(combinedOutput)) {
    parts.push('Go food-chain refrain diagnostic:\nVerse(1) should contain the fly refrain exactly once: intro line plus the fly comment, then stop. For later verses, append the catch chain and then append the fly refrain once after the loop. Do not write animals[1].comment before and after the loop for verse 1, and keep line breaks between sentence lines.');
  }
  if (/undefined reference to .*<[^>]+>::|undefined reference to .*std::|collect2: error: ld returned 1 exit status/i.test(combinedOutput) && /template|circular_buffer|<int>|<std::string>|std::__cxx11/i.test(combinedOutput)) {
    parts.push('C++ template visibility diagnostic:\nTemplate method bodies must be visible at instantiation time. For templated classes, put constructor and member function definitions in the header, or include an implementation file from the header; do not leave template method bodies only in a .cpp unless you explicitly instantiate every tested type. Undefined references for circular_buffer<T>::read/write/clear/overwrite mean the linker cannot see those template definitions.');
  }
  if (/binary[_-]search[_-]tree|can_sort|binary-search-tree/i.test(combinedOutput) && /expected\s*==\s*actual|with expansion|\{[^}]*,\s*[^}]*\}\s*==\s*\{[^}]*\}/i.test(combinedOutput)) {
    parts.push('C++ binary-search-tree traversal diagnostic:\nThe sorted data result must be a full in-order traversal of the entire tree: recursively visit left subtree, current node, then right subtree, preserving duplicate insertions according to the exercise rule. If output contains only the first or leftmost node, the iterator/traversal is stopping early or not descending both subtrees. Build begin/end from a complete traversal or implement an iterator stack that advances through every node.');
  }
  if (/chan receive/i.test(combinedOutput) && /Room3/.test(combinedOutput)) {
    parts.push('Go channel diagnostic:\nThe stack shows Room3 blocked on a channel receive. If the tests never close the action channel, do not use for range action as the stop condition. Use a finite receive or finite completion protocol: consume each sentinel/completion action and send the report once the expected producers or scripts are done. Do not ignore completion messages.');
  }
  if (/Got \d+ messages, want 1/i.test(combinedOutput) && /undefined command/i.test(combinedOutput)) {
    parts.push('Duplicate validation diagnostic:\nThe tests expected exactly one log message for the bad script. Do not log per character after the first undefined command. Log the undefined-command error once per script, then stop processing or suppress further invalid-command logs for that script.');
  }
  if (/Got \d+ messages, want 1/i.test(combinedOutput) && /without a name/i.test(combinedOutput)) {
    parts.push('Duplicate invalid-robot diagnostic:\nThe tests expected exactly one log message for a robot without a name. Do not log the same invalid robot both in the robot producer and in the room validator. Choose one owner for that validation, still send or consume completion so the room can report deterministically.');
  }
  if (/TestBadRobot/i.test(combinedOutput) && /unknown robot/i.test(combinedOutput) && /chan receive/i.test(combinedOutput)) {
    parts.push('Unknown robot diagnostic:\nAfter logging an unknown robot action, mark that unknown script/producer complete too. A script from an unknown robot should not keep Room3 waiting for a valid robot or for the action channel to close; consume its completion path and still report.');
  }
  if (/unresolved import `[^`]+`|cannot find (?:module or )?crate `[^`]+`|use of unresolved module or unlinked crate/i.test(combinedOutput)) {
    parts.push('Rust dependency diagnostic:\nDo not introduce a new external crate unless it is already declared in the exercise Cargo.toml. You may only replace the target source file(s), so solve with the Rust standard library or dependencies already present in the project. If the missing crate came from the candidate, remove that import and implement the behavior locally.');
  }
  if (/duplicate definitions for `[^`]+`/i.test(combinedOutput) && /pre_implemented\.rs/i.test(combinedOutput)) {
    parts.push('Rust preimplemented-method diagnostic:\nA sibling pre_implemented.rs file already defines some methods. Do not duplicate those method names in lib.rs; keep only the missing public API required by the tests and call the provided implementation where appropriate.');
  }
  if (/E0311|may not live long enough|closure may outlive the current function/i.test(combinedOutput)) {
    parts.push('Rust lifetime diagnostic:\nDo not force callbacks or iterators to be static unless the tests require ownership. Prefer lifetimes tied to self or to the input data, add explicit lifetime bounds when returning impl Iterator, or collect borrowed input into owned values before returning an iterator that captures self.');
  }
  if (/no method named `borrow`.*trait `Borrow`.*not in scope|trait `Borrow` which provides `borrow` is implemented but not in scope/is.test(combinedOutput)) {
    parts.push('Rust Borrow trait diagnostic:\nThe candidate calls item.borrow(), but trait methods only work when the trait is imported. Add `use std::borrow::Borrow;` at the top of src/lib.rs, or avoid calling borrow() entirely. Keeping only a fully qualified bound such as Data::Item: std::borrow::Borrow<u8> is not enough to bring the method into scope.');
  }
  if (/function requires argument type to outlive `'static`|closure may outlive the current function/i.test(combinedOutput) && /add_callback|callback/i.test(combinedOutput)) {
    parts.push('React callback lifetime diagnostic:\nThe tests pass callbacks that borrow local CallbackRecorder values, so add_callback must not require F: \'static and callbacks must not be stored as Box<dyn FnMut(T) + \'static>. Parameterize Reactor as Reactor<\'a, T>, store callbacks as Box<dyn FnMut(T) + \'a>, and define add_callback with F: FnMut(T) + \'a. It is fine for compute functions to use Box<dyn Fn(&[T]) -> T + \'static> with create_compute<F: Fn(&[T]) -> T + \'static>; do not apply that \'static bound to callbacks.');
  }
  if (/rand::|unresolved import `rand`|cannot find (?:module or )?crate `rand`/i.test(combinedOutput)) {
    parts.push('Rust no-rand diagnostic:\nThe exercise does not provide the rand crate, and you cannot edit Cargo.toml. The next candidate is invalid if it contains the substrings rand, rand::, use rand, thread_rng, gen::<, HashSet, or a random retry registry. For robot-name, use a monotonic static AtomicUsize only: let id = NEXT.fetch_add(1, Ordering::SeqCst); letters = (id / 1000) % 676, digits = id % 1000, then format two uppercase base-26 letters plus three digits. reset_name just assigns the next generated name.');
  }
  if (/munge<Data>|IntoIterator>::IntoIter.*may not live long enough|associated type .*IntoIter.*valid for the anonymous lifetime/i.test(combinedOutput)) {
    parts.push('Xorcism iterator diagnostic:\nThe next candidate is invalid if munge contains data.into_iter().map, a second data.into_iter(), or old attempted code left below the fixed code. Do not return a lazy map over data.into_iter(). In munge, create let mut output = Vec::new(); then for item in data { let b = *item.borrow(); let k = self.key[self.pos % self.key.len()]; self.pos += 1; output.push(b ^ k); } and finally return output.into_iter(). The returned iterator must own its bytes and must not borrow the caller input iterator.');
  }
  if (/expected item, found `\{`/i.test(combinedOutput) && /"hint"\s*:\s*"File content/i.test(combinedOutput)) {
    parts.push('Rust JSON-output diagnostic:\nThe previous candidate was a JSON/hint object, not Rust source. Do not return metadata such as {"result":"","hint":...}. Return only the complete Rust source file, keep it concise, and avoid copying tests or long fixtures into src/lib.rs.');
  }
  if (parts.length === 0) parts.push('The previous candidate did not pass, but no test output was captured. Re-check the tests and target behavior.');
  return tail(parts.join('\n\n'), 8000);
}

function buildRepairPromptPlan({ basePromptPlan, candidateText, candidateFiles, adapterResult, language, targetRel, attemptNumber }) {
  const failureText = failureTextFromResult(adapterResult);
  const system = basePromptPlan.messages[0];
  const originalUser = basePromptPlan.messages.find((message) => message.role === 'user')?.content ?? '';
  const previousCandidate = isObject(candidateFiles)
    ? Object.entries(candidateFiles).map(([rel, text]) => fileFenceBlock('Previous candidate file', rel, text)).join('\n\n')
    : block('Previous candidate', targetRel, candidateText, language);
  const repairUser = [
    originalUser,
    '',
    `## Repair attempt ${attemptNumber}`,
    '',
    'Previous candidate failed the benchmark tests. Return corrected complete replacement file(s) only. Do not repeat an identical failing candidate. Do not leave placeholders, empty strings, or TODO stubs when the failure output exposes expected behavior; a direct deterministic implementation is acceptable.',
    '',
    previousCandidate,
    '',
    `### Test failure output\n\n\`\`\`text\n${failureText.endsWith('\n') ? failureText : `${failureText}\n`}\`\`\``,
  ].join('\n');
  return {
    ...basePromptPlan,
    messages: [system, { role: 'user', content: repairUser }],
    promptSha256: sha256Text(`${system.content}\n${repairUser}`),
  };
}

function buildMalformedResponsePromptPlan({ basePromptPlan, generation, missingFiles = [], attemptNumber }) {
  const system = basePromptPlan.messages[0];
  const originalUser = basePromptPlan.messages.find((message) => message.role === 'user')?.content ?? '';
  const usage = generation?.usage ? JSON.stringify(generation.usage) : 'unavailable';
  const missing = missingFiles.length > 0
    ? `Missing required replacement file(s): ${missingFiles.join(', ')}`
    : 'The API response did not include usable replacement file content.';
  const retryUser = [
    originalUser,
    '',
    `## Generation retry ${attemptNumber}`,
    '',
    missing,
    `Previous response usage: ${usage}`,
    'Return only the required complete replacement file(s). Keep the answer concise and put code in the requested file-path fences.',
  ].join('\n');
  return {
    ...basePromptPlan,
    messages: [system, { role: 'user', content: retryUser }],
    promptSha256: sha256Text(`${system.content}\n${retryUser}`),
  };
}


function writeResult(out, result) {
  if (!out) return;
  const target = path.resolve(out);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
}

export async function runDeepSeekAtomicPolyglotCase(options = {}) {
  const exerciseDir = path.resolve(options.exerciseDir || '.');
  const requestedFiles = Array.isArray(options.files) && options.files.length > 0 ? options.files : [options.file];
  const promptPlan = buildExercisePrompt({ ...options, files: requestedFiles });
  const targetFiles = promptPlan.sources.targets?.length ? promptPlan.sources.targets : requestedFiles;
  const multiFile = targetFiles.length > 1;
  const testcase = stringOrNull(options.testcase) ?? path.basename(exerciseDir);
  const requestedModel = stringOrNull(options.model) ?? DEEPSEEK_MODEL;
  const started = Date.now();
  const maxRepairs = parsePositiveInteger(options.maxRepairs, 0);
  const requestTimeoutMs = parsePositiveInteger(options.requestTimeoutMs, options.timeoutMs);
  const testTimeoutMs = parsePositiveInteger(options.testTimeoutMs, options.timeoutMs);
  requireArrayCommand(options.testCommand);

  let activePromptPlan = promptPlan;
  let adapterRun = null;
  let finalGeneration = null;
  let finalExtraction = null;
  let finalCandidateText = '';
  let malformedResponses = 0;
  const attempts = [];

  for (let attemptIndex = 0; attemptIndex <= maxRepairs; attemptIndex += 1) {
    const generation = await callDeepSeekForCandidate({
      env: options.env ?? process.env,
      fetchImpl: options.fetchImpl,
      baseUrl: options.baseUrl ?? DEEPSEEK_BASE_URL,
      model: requestedModel,
      messages: activePromptPlan.messages,
      maxTokens: options.maxTokens,
      thinkingType: options.thinkingType,
      reasoningEffort: options.reasoningEffort,
      timeoutMs: requestTimeoutMs,
    });
    finalGeneration = generation;
    if (!generation.ok) {
      malformedResponses += 1;
      if (generation.error === 'response did not include choices[0].message.content' && attemptIndex < maxRepairs) {
        activePromptPlan = buildMalformedResponsePromptPlan({
          basePromptPlan: promptPlan,
          generation,
          attemptNumber: attemptIndex + 1,
        });
        continue;
      }
      const blockers = [generation.error ?? 'DeepSeek generation failed'];
      const result = failedResult({ exerciseDir, testcase, model: requestedModel, started, generation, promptPlan: activePromptPlan, blockers, malformedResponses, adapterRun });
      result.deepseek_generation = {
        ...result.deepseek_generation,
        attempts,
        malformedResponses,
        repairAttempts: Math.max(0, attempts.length - 1),
      };
      writeResult(options.out, result);
      return { ok: false, runnerId: DEEPSEEK_POLYGLOT_RUNNER_ID, result, blockers };
    }

    const extraction = multiFile
      ? extractFullFilesFromResponse(generation.content, { files: targetFiles, language: options.language })
      : extractFullFileFromResponse(generation.content, { language: options.language });
    finalExtraction = extraction;
    const candidateForMetadata = multiFile ? JSON.stringify(extraction.files ?? {}) : extraction.text;
    finalCandidateText = candidateForMetadata;
    const missingFiles = multiFile ? (extraction.missingFiles ?? []) : [];
    if (multiFile ? missingFiles.length > 0 : !extraction.text) {
      malformedResponses += 1;
      if (attemptIndex < maxRepairs) {
        activePromptPlan = buildMalformedResponsePromptPlan({
          basePromptPlan: promptPlan,
          generation,
          missingFiles,
          attemptNumber: attemptIndex + 1,
        });
        continue;
      }
      const blockers = multiFile
        ? [`DeepSeek response missing replacement file(s): ${missingFiles.join(', ')}`]
        : ['DeepSeek response did not include replacement file content'];
      const result = failedResult({ exerciseDir, testcase, model: generation.model ?? requestedModel, started, generation, promptPlan: activePromptPlan, blockers, malformedResponses, adapterRun });
      result.deepseek_generation = {
        ...result.deepseek_generation,
        attempts,
        malformedResponses,
        repairAttempts: Math.max(0, attempts.length - 1),
      };
      writeResult(options.out, result);
      return { ok: false, runnerId: DEEPSEEK_POLYGLOT_RUNNER_ID, result, blockers };
    }

    adapterRun = runAtomicPolyglotCase({
      exerciseDir,
      file: options.file ?? targetFiles[0],
      files: targetFiles,
      candidateText: multiFile ? undefined : extraction.text,
      candidateFiles: multiFile ? extraction.files : undefined,
      testcase,
      model: generation.model ?? requestedModel,
      testCommand: options.testCommand,
      timeoutMs: testTimeoutMs,
      language: options.language ?? 'auto',
      pythonBin: options.pythonBin,
    });
    attempts.push(buildAttemptMetadata({
      generation,
      promptPlan: activePromptPlan,
      candidateText: candidateForMetadata,
      extraction,
      adapterRun,
      attemptIndex,
    }));

    if (adapterRun.ok || attemptIndex >= maxRepairs) break;
    activePromptPlan = buildRepairPromptPlan({
      basePromptPlan: promptPlan,
      candidateText: candidateForMetadata,
      candidateFiles: multiFile ? extraction.files : undefined,
      adapterResult: adapterRun.result,
      language: options.language ?? 'auto',
      targetRel: multiFile ? targetFiles.join(', ') : promptPlan.sources.target,
      attemptNumber: attemptIndex + 1,
    });
  }

  const usage = usageTotals(attempts);
  const finalMetadata = {
    ...(attempts.at(-1) ?? buildGenerationMetadata({ generation: finalGeneration, promptPlan: activePromptPlan, candidateText: finalCandidateText, extraction: finalExtraction })),
    usage,
    attempts,
    malformedResponses,
    repairAttempts: Math.max(0, attempts.length - 1),
  };
  const result = {
    ...adapterRun.result,
    duration: Number(((Date.now() - started) / 1000).toFixed(3)),
    num_malformed_responses: (adapterRun.result.num_malformed_responses ?? 0) + malformedResponses,
    reasoning_effort: 'high',
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    thinking_tokens: usage.completion_tokens_details.reasoning_tokens,
    deepseek_generation: finalMetadata,
  };
  writeResult(options.out, result);
  return { ...adapterRun, runnerId: DEEPSEEK_POLYGLOT_RUNNER_ID, result, generation: result.deepseek_generation };
}

export async function runCli(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (!options.exerciseDir) throw new Error('--exercise-dir is required');
  if (!options.file) throw new Error('--file is required');
  if (!options.testCommand) throw new Error('--test-command-json is required');
  return runDeepSeekAtomicPolyglotCase({ ...options, env });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    const run = await runCli(process.argv.slice(2), process.env);
    console.log(JSON.stringify({ ok: run.ok, runnerId: DEEPSEEK_POLYGLOT_RUNNER_ID, resultFile: process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null }, null, 2));
    process.exitCode = run.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message ?? error);
    process.exitCode = 1;
  }
}

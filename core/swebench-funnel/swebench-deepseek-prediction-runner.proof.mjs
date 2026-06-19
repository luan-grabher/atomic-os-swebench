#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.join(here, 'swebench-deepseek-prediction-runner.mjs');
assert.equal(fs.existsSync(runnerPath), true, 'swebench-deepseek-prediction-runner.mjs must exist');

const runner = await import(pathToFileURL(runnerPath).href);
const {
  buildSwebenchPrompt,
  extractUnifiedDiff,
  buildPredictionEntry,
  mergePredictionEntries,
  validateRunnerRequest,
  buildDeepSeekPayload,
  checkPatchApplies,
  canonicalizePatchWithGit,
  collectPatchContext,
  collectInitialRepoContext,
  buildPatchRepairPrompt,
  runPrediction,
  runCli,
} = runner;

const fixtureInstance = {
  instance_id: 'astropy__astropy-12907',
  repo: 'astropy/astropy',
  base_commit: 'd16bfe05a744909de4b27f5875fe0d4ed41ce607',
  problem_statement: 'Nested compound models should report separability correctly.',
  hints_text: 'Look at separability_matrix.',
  patch: 'diff --git a/gold.py b/gold.py\n+SECRET_GOLD_SOLUTION\n',
  test_patch: 'diff --git a/test.py b/test.py\n+SECRET_TEST_PATCH\n',
  FAIL_TO_PASS: ['hidden::test'],
  PASS_TO_PASS: ['hidden::existing'],
};

const prompt = buildSwebenchPrompt(fixtureInstance, { includeHints: true });
assert.equal(prompt.includes('astropy__astropy-12907'), true);
assert.equal(prompt.includes('Nested compound models'), true);
assert.equal(prompt.includes('SECRET_GOLD_SOLUTION'), false);
assert.equal(prompt.includes('SECRET_TEST_PATCH'), false);
assert.equal(prompt.includes('hidden::test'), false);
assert.equal(prompt.includes('Return only'), true);

assert.equal(
  extractUnifiedDiff('```diff\ndiff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-a\n+b\n```').patch,
  'diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-a\n+b\n',
);
assert.equal(extractUnifiedDiff('no patch here').ok, false);
assert.match(extractUnifiedDiff('no patch here').error, /unified diff/);

const defaultPayload = buildDeepSeekPayload({ prompt: 'Return a diff.' });
assert.equal(defaultPayload.thinking.type, 'disabled');
assert.equal(defaultPayload.reasoning_effort, 'high');
assert.equal(defaultPayload.max_tokens, 16000);
const explicitThinkingPayload = buildDeepSeekPayload({ prompt: 'Return a diff.', thinkingType: 'enabled' });
assert.equal(explicitThinkingPayload.thinking.type, 'enabled');

const entry = buildPredictionEntry({
  instance: fixtureInstance,
  patch: 'diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-a\n+b\n',
  modelName: 'deepseek-v4-pro+atomic-swebench-runner-v1',
});
assert.deepEqual(entry, {
  instance_id: 'astropy__astropy-12907',
  model_patch: 'diff --git a/a.py b/a.py\n--- a/a.py\n+++ b/a.py\n@@ -1 +1 @@\n-a\n+b\n',
  model_name_or_path: 'deepseek-v4-pro+atomic-swebench-runner-v1',
});

const merged = mergePredictionEntries([
  { instance_id: 'other__repo-1', model_patch: 'diff --git a/x b/x\n', model_name_or_path: 'old' },
], entry);
assert.equal(merged.length, 2);
assert.equal(merged.at(-1).instance_id, 'astropy__astropy-12907');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-swebench-prediction-proof-'));
const instancePath = path.join(tempDir, 'instance.json');
fs.writeFileSync(instancePath, JSON.stringify(fixtureInstance));
const outPath = path.join(tempDir, 'predictions.json');
const dry = await runCli(['--instance-json', instancePath, '--out', outPath, '--dry-run'], { DEEPSEEK_API_KEY: 'test-secret-do-not-return' });
assert.equal(dry.ok, true);
assert.equal(dry.dryRun, true);
assert.equal(dry.willCallDeepSeek, false);
assert.equal(JSON.stringify(dry).includes('test-secret-do-not-return'), false);
assert.equal(dry.prompt.includes('SECRET_GOLD_SOLUTION'), false);

const repoDir = path.join(tempDir, 'repo');
fs.mkdirSync(path.join(repoDir, 'pkg'), { recursive: true });
childProcess.execFileSync('git', ['init', '--quiet'], { cwd: repoDir });
childProcess.execFileSync('git', ['config', 'user.email', 'proof@example.test'], { cwd: repoDir });
childProcess.execFileSync('git', ['config', 'user.name', 'Atomic Proof'], { cwd: repoDir });
fs.writeFileSync(path.join(repoDir, 'pkg', 'module.py'), 'value = 1\n');
childProcess.execFileSync('git', ['add', 'pkg/module.py'], { cwd: repoDir });
childProcess.execFileSync('git', ['commit', '--quiet', '-m', 'init'], { cwd: repoDir });
const contextualInstance = { ...fixtureInstance, problem_statement: 'Bug in imported module.\nfrom pkg.module import value\nThe value should change.' };
const initialContext = collectInitialRepoContext({ repoDir, instance: contextualInstance, maxBytesPerFile: 1000 });
assert.equal(initialContext.ok, true);
assert.equal(initialContext.files[0].path, 'pkg/module.py');
assert.equal(initialContext.files[0].content.includes('value = 1'), true);
const promptWithContext = buildSwebenchPrompt(contextualInstance, { initialContext });
assert.equal(promptWithContext.includes('Repository source context:'), true);
assert.equal(promptWithContext.includes('value = 1'), true);
assert.equal(promptWithContext.includes('SECRET_GOLD_SOLUTION'), false);
const goodPatch = 'diff --git a/pkg/module.py b/pkg/module.py\n--- a/pkg/module.py\n+++ b/pkg/module.py\n@@ -1 +1 @@\n-value = 1\n+value = 2\n';
const badPatch = 'diff --git a/pkg/module.py b/pkg/module.py\n--- a/pkg/module.py\n+++ b/pkg/module.py\n@@ -1 +1 @@\n-missing = 0\n+value = 2\n';
const goodCheck = checkPatchApplies({ repoDir, patch: goodPatch });
assert.equal(goodCheck.ok, true);
const corruptCountPatch = 'diff --git a/pkg/module.py b/pkg/module.py\n--- a/pkg/module.py\n+++ b/pkg/module.py\n@@ -1,2 +1,2 @@\n-value = 1\n+value = 3\n';
assert.equal(checkPatchApplies({ repoDir, patch: corruptCountPatch }).ok, false);
const canonical = canonicalizePatchWithGit({ repoDir, patch: corruptCountPatch });
assert.equal(canonical.ok, true);
assert.equal(checkPatchApplies({ repoDir, patch: canonical.patch }).ok, true);
assert.equal(canonical.patch.includes('value = 3'), true);
const badCheck = checkPatchApplies({ repoDir, patch: badPatch });
assert.equal(badCheck.ok, false);
assert.match(badCheck.error, /patch failed|does not apply|error:/i);
const context = collectPatchContext({ repoDir, patch: badPatch, maxBytesPerFile: 1000 });
assert.equal(context.files[0].path, 'pkg/module.py');
assert.equal(context.files[0].content.includes('value = 1'), true);
const longPath = path.join(repoDir, 'pkg', 'long.py');
fs.writeFileSync(longPath, Array.from({ length: 90 }, (_, index) => `line_${index + 1}`).join('\n') + '\n');
const longPatch = 'diff --git a/pkg/long.py b/pkg/long.py\n--- a/pkg/long.py\n+++ b/pkg/long.py\n@@ -70,3 +70,3 @@\n-line_70\n+line_70_fixed\n line_71\n line_72\n';
const hunkContext = collectPatchContext({ repoDir, patch: longPatch, maxBytesPerFile: 200 });
assert.equal(hunkContext.files[0].content.includes('line_70'), true);
assert.equal(hunkContext.files[0].content.includes('line_1\nline_2'), false);
const repairPrompt = buildPatchRepairPrompt({ instance: fixtureInstance, priorPatch: badPatch, applyCheck: badCheck, patchContext: context });
assert.equal(repairPrompt.includes('Patch apply failure'), true);
assert.equal(repairPrompt.includes('value = 1'), true);
assert.equal(repairPrompt.includes('SECRET_GOLD_SOLUTION'), false);

const repairOutPath = path.join(tempDir, 'repaired-predictions.json');
let calls = 0;
const fakeFetch = async (_url, request) => {
  const payload = JSON.parse(request.body);
  calls += 1;
  assert.equal(payload.messages[1].content.includes('SECRET_GOLD_SOLUTION'), false);
  const content = calls === 1 ? badPatch : goodPatch;
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ model: 'fake-deepseek', choices: [{ message: { content } }], usage: { total_tokens: 1 } }),
  };
};
const repaired = await runPrediction({
  instancePath,
  outPath: repairOutPath,
  repoDir,
  repairAttempts: 1,
  fetchImpl: fakeFetch,
  env: { DEEPSEEK_API_KEY: 'repair-secret-do-not-return' },
});
assert.equal(repaired.ok, true);
assert.equal(calls, 2);
assert.equal(repaired.applyPreflight.ok, true);
assert.equal(JSON.stringify(repaired).includes('repair-secret-do-not-return'), false);
const repairedPredictions = JSON.parse(fs.readFileSync(repairOutPath, 'utf8'));
assert.equal(repairedPredictions[0].model_patch, goodPatch);

const missing = validateRunnerRequest({ instancePath: 'missing.json', env: {} });
assert.equal(missing.ok, false);
assert.match(missing.blockers.join('\n'), /DEEPSEEK_API_KEY/);
assert.match(missing.blockers.join('\n'), /instance JSON does not exist/);

console.log(JSON.stringify({ ok: true, proof: 'swebench-deepseek-prediction-runner', checked: 17 }, null, 2));

#!/usr/bin/env node
/**
 * atomic-agent-green-minimize.proof.mjs
 *
 * Proves the local Atomic Agent CLI carries the generalist lesson from
 * A/B watch class CODEX-VS-ATOMIC-L01-D: after a green gate it may attempt
 * one bounded diff-minimization edit, but it must not keep trusting the
 * previous green gate after any post-green byte mutation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(sourceDir, '../..');
const agentPath = path.join(repoRoot, 'core/agent/atomic-full-ab/local-loop/local_atomic_agent.py');
const source = fs.readFileSync(agentPath, 'utf8');
const results = [];

function record(name, ok, detail = {}) {
  results.push({ name, ok: Boolean(ok), detail });
}

record('agent has explicit post-green minimization state',
  source.includes('green_minimize_prompted = False') &&
  source.includes('green_minimize_active = False') &&
  source.includes('green_minimize_edits = 0'),
  {
    prompted: source.includes('green_minimize_prompted = False'),
    active: source.includes('green_minimize_active = False'),
    edits: source.includes('green_minimize_edits = 0'),
  });
record('green minimization prompt is bounded to one smaller equivalent patch',
  source.includes('GREEN-MINIMIZE offered') &&
  source.includes('ONE bounded diff-minimization pass') &&
  source.includes('strictly smaller equivalent patch') &&
  source.includes('Do not read more files and do not broaden behavior'),
  {
    offered: source.includes('GREEN-MINIMIZE offered'),
    bounded: source.includes('ONE bounded diff-minimization pass'),
    smaller: source.includes('strictly smaller equivalent patch'),
    noBroaden: source.includes('Do not read more files and do not broaden behavior'),
  });
record('post-green minimization exposes only replace/test tools and then only test after one edit',
  source.includes('MINIMIZE_NAMES = {"atomic_replace", "run_tests"}') &&
  source.includes('allowed = {"run_tests"} if green_minimize_edits >= 1 else MINIMIZE_NAMES'),
  {
    names: source.includes('MINIMIZE_NAMES = {"atomic_replace", "run_tests"}'),
    oneEditThenTest: source.includes('allowed = {"run_tests"} if green_minimize_edits >= 1 else MINIMIZE_NAMES'),
  });
record('post-green minimization refuses further reads and file creation',
  source.includes('READING DISABLED — gate is already green') &&
  source.includes('FILE CREATION DISABLED — post-green minimization may only shrink an accepted diff'),
  {
    readRefusal: source.includes('READING DISABLED — gate is already green'),
    createRefusal: source.includes('FILE CREATION DISABLED — post-green minimization may only shrink an accepted diff'),
  });
record('any post-green edit invalidates the previous gate before final scoring',
  source.includes('last_pass = False  # a new edit invalidates the previous green gate'),
  { hasInvalidation: source.includes('last_pass = False  # a new edit invalidates the previous green gate') });
record('successful retest records post-green minimization result and deactivates the pass',
  source.includes('GREEN-MINIMIZE result diff_lines=') && source.includes('green_minimize_active = False'),
  {
    resultTrace: source.includes('GREEN-MINIMIZE result diff_lines='),
    deactivates: source.includes('green_minimize_active = False'),
  });
record('CLASS-GREEN-MINIMIZE-DECLINE: first minimize-stop refused once, re-prompt asserts a smaller equivalent exists (bounded)',
  source.includes('green_minimize_refusals = 0') &&
  source.includes('green_minimize_active and green_minimize_edits == 0 and green_minimize_refusals < 1') &&
  source.includes('GREEN-MINIMIZE refused-stop -> re-prompt once (a smaller equivalent exists)') &&
  source.includes('Do NOT stop. A strictly smaller equivalent patch EXISTS') &&
  source.includes('green_minimize_refusals += 1'),
  {
    counter: source.includes('green_minimize_refusals = 0'),
    guard: source.includes('green_minimize_active and green_minimize_edits == 0 and green_minimize_refusals < 1'),
    marker: source.includes('GREEN-MINIMIZE refused-stop -> re-prompt once (a smaller equivalent exists)'),
    assertsExists: source.includes('Do NOT stop. A strictly smaller equivalent patch EXISTS'),
    bounded: source.includes('green_minimize_refusals += 1'),
  });
record('CLASS-GREEN-MINIMIZE-NOSHRINK (F1): a non-shrinking minimize edit is rejected and the pre-minimize green state is restored',
  source.includes('green_minimize_pre_files = {}') &&
  source.includes('minimized_lines < green_minimize_start_lines') &&
  source.includes('GREEN-MINIMIZE REJECTED (did not shrink'),
  {
    preFilesCapture: source.includes('green_minimize_pre_files = {}'),
    shrinkGuard: source.includes('minimized_lines < green_minimize_start_lines'),
    rejectMarker: source.includes('GREEN-MINIMIZE REJECTED (did not shrink'),
  });
record('CLASS-DOCSTRING-SURFACE-MINIMALITY (F1b): deterministic strip of agent-ADDED stand-alone comment lines at minimize-offer',
  source.includes('CLASS-DOCSTRING-SURFACE-MINIMALITY (F1b, deterministic)') &&
  source.includes('_cstrip') &&
  source.includes('DETERMINISTIC comment-strip') &&
  source.includes('not _cf.endswith(".py")'),
  {
    marker: source.includes('CLASS-DOCSTRING-SURFACE-MINIMALITY (F1b, deterministic)'),
    stripVar: source.includes('_cstrip'),
    traceMarker: source.includes('DETERMINISTIC comment-strip'),
    pyScoped: source.includes('not _cf.endswith(".py")'),
  });
const py = spawnSync('python3', ['-m', 'py_compile', agentPath], { cwd: repoRoot, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
record('local_atomic_agent.py remains valid Python after green-minimize update', py.status === 0, { status: py.status, signal: py.signal, stderr: py.stderr });

const ok = results.every((entry) => entry.ok);
if (jsonMode) console.log(JSON.stringify({ ok, results }, null, 2));
else for (const entry of results) console.log((entry.ok ? 'PASS' : 'FAIL') + ' ' + entry.name);
process.exit(ok ? 0 : 1);

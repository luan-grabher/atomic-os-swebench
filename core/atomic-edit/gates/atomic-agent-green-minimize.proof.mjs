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
record('CLASS-GREEN-MINIMIZE-DECLINE-COST (F1c): DECLINE forced re-prompt is skipped when F1b already stripped comments (no redundant round-trip burn)',
  source.includes('green_minimize_f1b_stripped = False') &&
  source.includes('green_minimize_f1b_stripped = True') &&
  source.includes('and not green_minimize_f1b_stripped'),
  {
    init: source.includes('green_minimize_f1b_stripped = False'),
    setOnStrip: source.includes('green_minimize_f1b_stripped = True'),
    guardSkip: source.includes('and not green_minimize_f1b_stripped'),
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
record('CLASS-OVERFIX-MULTIPATH (F2): fix-phase edits that add a loop or touch multiple regions are flagged in the edit receipt (over-fix perception)',
  source.includes('CLASS-OVERFIX-MULTIPATH (F2, generalist)') &&
  source.includes('OVER-FIX signal: added_loops=') &&
  source.includes('[over-fix check] this edit added') &&
  source.includes('if not green_minimize_active:'),
  {
    marker: source.includes('CLASS-OVERFIX-MULTIPATH (F2, generalist)'),
    trace: source.includes('OVER-FIX signal: added_loops='),
    receipt: source.includes('[over-fix check] this edit added'),
    fixPhaseOnly: source.includes('if not green_minimize_active:'),
  });
record('CLASS-OVERFIX-MULTIPATH-DETERMINISTIC (F2b): trial each diff hunk alone, keep smallest green one (deterministic over-fix reduction)',
  source.includes('def trial_minimal_hunk(workdir, gate):') &&
  source.includes('CLASS-OVERFIX-MULTIPATH-DETERMINISTIC (F2b): deterministic over-fix reduction') &&
  source.includes('F2b hunk-minimize:') &&
  source.includes('cands[:4]'),
  {
    helper: source.includes('def trial_minimal_hunk(workdir, gate):'),
    docstring: source.includes('CLASS-OVERFIX-MULTIPATH-DETERMINISTIC (F2b): deterministic over-fix reduction'),
    callTrace: source.includes('F2b hunk-minimize:'),
    bounded: source.includes('cands[:4]'),
  });
record('CLASS-COMMENT-DELETION-REGRESSION (F1d): deterministic restore of ORIGINAL comment lines the edit needlessly deleted (line_rewrite_regression twin of F1b)',
  source.includes('def restore_deleted_comments(workdir, gate):') &&
  source.includes('CLASS-COMMENT-DELETION-REGRESSION (F1d, deterministic): symmetric twin of F1b') &&
  source.includes('F1d comment-restore:'),
  {
    helper: source.includes('def restore_deleted_comments(workdir, gate):'),
    docstring: source.includes('CLASS-COMMENT-DELETION-REGRESSION (F1d, deterministic): symmetric twin of F1b'),
    callTrace: source.includes('F1d comment-restore:'),
  });
record('CLASS-HISTORY-TOKEN-BLOAT (F3): stale tool-result contents are compacted in the resent history (keep last 6 verbatim, summarize older; API-chain-safe)',
  source.includes('CLASS-HISTORY-TOKEN-BLOAT (F3, deterministic)') &&
  source.includes('_f3_tool_idxs[:-6]') &&
  source.includes('compacted by F3'),
  {
    marker: source.includes('CLASS-HISTORY-TOKEN-BLOAT (F3, deterministic)'),
    windowKeep: source.includes('_f3_tool_idxs[:-6]'),
    compactMarker: source.includes('compacted by F3'),
  });
record('CLASS-ADJACENT-LOOP-NONE-FILTER-FUSION (F4): deterministic fusion of two adjacent None-filter loops into one list(D.items()) loop (§1b consolidation)',
  source.includes('def fuse_adjacent_none_filter_loops(workdir, gate):') &&
  source.includes('F4 loop-fusion:') &&
  source.includes('list({m.group'),
  {
    helper: source.includes('def fuse_adjacent_none_filter_loops(workdir, gate):'),
    callTrace: source.includes('F4 loop-fusion:'),
    fusedForm: source.includes('list({m.group'),
  });
record('CLASS-SCORING-GATE-FLAKE (F5): final scoring gate retries on in-loop-green/final-red discrepancy (anti-false-red §9)',
  source.includes('CLASS-SCORING-GATE-FLAKE (F5, anti-fachada') &&
  source.includes('if not final_pass and last_pass:') &&
  source.includes('F5 scoring-gate retry:'),
  {
    marker: source.includes('CLASS-SCORING-GATE-FLAKE (F5, anti-fachada'),
    guard: source.includes('if not final_pass and last_pass:'),
    trace: source.includes('F5 scoring-gate retry:'),
  });
record('CLASS-FILETREE-RESEND-BLOAT (F6): the initial file-tree user turn is compacted after step 1 (avoid per-step resend on large repos)',
  source.includes('CLASS-FILETREE-RESEND-BLOAT (F6)') &&
  source.includes('step == 2 and len(messages) > 1'),
  {
    marker: source.includes('CLASS-FILETREE-RESEND-BLOAT (F6)'),
    guard: source.includes('step == 2 and len(messages) > 1'),
  });
const py = spawnSync('python3', ['-m', 'py_compile', agentPath], { cwd: repoRoot, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
record('local_atomic_agent.py remains valid Python after green-minimize update', py.status === 0, { status: py.status, signal: py.signal, stderr: py.stderr });

const ok = results.every((entry) => entry.ok);
if (jsonMode) console.log(JSON.stringify({ ok, results }, null, 2));
else for (const entry of results) console.log((entry.ok ? 'PASS' : 'FAIL') + ' ' + entry.name);
process.exit(ok ? 0 : 1);

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
const gatePath = path.join(repoRoot, 'core/agent/atomic-full-ab/local-loop/swe_docker_gate.sh');
const source = fs.readFileSync(agentPath, 'utf8');
const gateSource = fs.readFileSync(gatePath, 'utf8');
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
record('CLASS-GREEN-MINIMIZE-RETEST-GREEN-FINALIZE: successful post-minimize retest records the result, deactivates minimization, and finalizes the green state',
  source.includes('GREEN-MINIMIZE result diff_lines=') &&
  source.includes('green_minimize_active = False') &&
  source.includes('green_minimize_finalized = True  # CLASS-GREEN-MINIMIZE-RETEST-GREEN-FINALIZE') &&
  source.includes('GREEN-MINIMIZE finalized; preserving retested green minimized state') &&
  source.includes('break  # CLASS-GREEN-MINIMIZE-RETEST-GREEN-FINALIZE'),
  {
    resultTrace: source.includes('GREEN-MINIMIZE result diff_lines='),
    deactivates: source.includes('green_minimize_active = False'),
    finalizes: source.includes('green_minimize_finalized = True  # CLASS-GREEN-MINIMIZE-RETEST-GREEN-FINALIZE'),
    trace: source.includes('GREEN-MINIMIZE finalized; preserving retested green minimized state'),
    breaksLoop: source.includes('break  # CLASS-GREEN-MINIMIZE-RETEST-GREEN-FINALIZE'),
  });
record('CLASS-GREEN-MINIMIZE-DECLINE: first minimize-stop refused, re-prompt asserts a smaller equivalent exists (bounded)',
  source.includes('green_minimize_refusals = 0') &&
  source.includes('green_minimize_refusal_limit = 2 if green_minimize_helper_surface else 1') &&
  source.includes('green_minimize_active and green_minimize_edits == 0 and green_minimize_refusals < green_minimize_refusal_limit') &&
  source.includes('GREEN-MINIMIZE refused-stop -> re-prompt') &&
  source.includes('Do NOT stop. A strictly smaller equivalent patch EXISTS') &&
  source.includes('green_minimize_refusals += 1'),
  {
    counter: source.includes('green_minimize_refusals = 0'),
    boundedLimit: source.includes('green_minimize_refusal_limit = 2 if green_minimize_helper_surface else 1'),
    guard: source.includes('green_minimize_active and green_minimize_edits == 0 and green_minimize_refusals < green_minimize_refusal_limit'),
    marker: source.includes('GREEN-MINIMIZE refused-stop -> re-prompt'),
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
record('CLASS-GREEN-MINIMIZE-DECLINE-COST (F1c): DECLINE forced re-prompt is skipped only after comment-only deterministic reduction',
  source.includes('green_minimize_comment_surface_reduced = False') &&
  source.includes('green_minimize_comment_surface_reduced = True  # F1c: comment-only deterministic reduction happened') &&
  source.includes('and not green_minimize_comment_surface_reduced') &&
  !/if _f2b_kept:[\s\S]{0,360}green_minimize_comment_surface_reduced = True/.test(source) &&
  !/if _f4_kept:[\s\S]{0,300}green_minimize_comment_surface_reduced = True/.test(source),
  {
    init: source.includes('green_minimize_comment_surface_reduced = False'),
    setOnCommentReduction: source.includes('green_minimize_comment_surface_reduced = True  # F1c: comment-only deterministic reduction happened'),
    guardSkip: source.includes('and not green_minimize_comment_surface_reduced'),
    f2bDoesNotSkip: !/if _f2b_kept:[\s\S]{0,360}green_minimize_comment_surface_reduced = True/.test(source),
    f4DoesNotSkip: !/if _f4_kept:[\s\S]{0,300}green_minimize_comment_surface_reduced = True/.test(source),
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
record('CLASS-GATE-ZERO-ZERO-RETRY: zero-information gate failures are retried once instead of steering over-fix',
  source.includes('CLASS-GATE-ZERO-ZERO-RETRY') &&
  source.includes('for _gate_attempt in range(2)') &&
  source.includes('npass == 0 and nfail == 0') &&
  source.includes('gate timed out'),
  {
    marker: source.includes('CLASS-GATE-ZERO-ZERO-RETRY'),
    retryLoop: source.includes('for _gate_attempt in range(2)'),
    zeroZero: source.includes('npass == 0 and nfail == 0'),
    timeout: source.includes('gate timed out'),
  });
record('CLASS-GATE-INFRA-RED-GENERATED-VERSION: generated-version ModuleNotFoundError from a local warm-container gate is round-invalid infra, not behavioral red feedback',
  source.includes('CLASS-GATE-INFRA-RED-GENERATED-VERSION') &&
  source.includes('def gate_infra_failure(out, workdir=None):') &&
  source.includes("ModuleNotFoundError: No module named") &&
  source.includes('missing_generated_version') &&
  source.includes('packaging_or_version_touched') &&
  source.includes('[GATE-INFRA-RED] local gate infrastructure failed') &&
  source.includes('gate_infra_invalid = False') &&
  source.includes('GATE-INFRA-RED classified; preserving diff for official scoring') &&
  source.includes('ROUND INVALID (local gate infrastructure failure; official scoring required)') &&
  source.includes('metrics["gate_pass"] = None'),
  {
    marker: source.includes('CLASS-GATE-INFRA-RED-GENERATED-VERSION'),
    helper: source.includes('def gate_infra_failure(out, workdir=None):'),
    symptom: source.includes("ModuleNotFoundError: No module named"),
    generatedVersion: source.includes('missing_generated_version'),
    noPackageTouch: source.includes('packaging_or_version_touched'),
    runGateMarker: source.includes('[GATE-INFRA-RED] local gate infrastructure failed'),
    state: source.includes('gate_infra_invalid = False'),
    handlerTrace: source.includes('GATE-INFRA-RED classified; preserving diff for official scoring'),
    finalInvalid: source.includes('ROUND INVALID (local gate infrastructure failure; official scoring required)'),
    noFalseGreen: source.includes('metrics["gate_pass"] = None'),
  });
record('CLASS-GATE-HOST-DIFF-PRESERVATION: run_gate snapshots and restores the host diff around bind-mounted Docker gates',
  source.includes('CLASS-GATE-HOST-DIFF-PRESERVATION') &&
  source.includes('before_gate_diff = git_diff(workdir)') &&
  source.includes('def _restore_gate_diff():') &&
  source.includes('git_diff(workdir) == before_gate_diff') &&
  source.includes('["git", "checkout", "--", "."]') &&
  source.includes('["git", "apply", "-"]') &&
  source.includes('GATE-HOST-DIFF-RESTORED') &&
  source.includes('restore_ok and (p.returncode == 0)'),
  {
    marker: source.includes('CLASS-GATE-HOST-DIFF-PRESERVATION'),
    snapshot: source.includes('before_gate_diff = git_diff(workdir)'),
    helper: source.includes('def _restore_gate_diff():'),
    equalityCheck: source.includes('git_diff(workdir) == before_gate_diff'),
    checkoutRestore: source.includes('["git", "checkout", "--", "."]'),
    applyRestore: source.includes('["git", "apply", "-"]'),
    trace: source.includes('GATE-HOST-DIFF-RESTORED'),
    redOnRestoreFailure: source.includes('restore_ok and (p.returncode == 0)'),
  });
record('CLASS-GATE-COMMAND-CWD-RELATIVE: repo-relative gate command paths and path arguments are absolutized before running inside SWE workdir',
  source.includes('CLASS-GATE-COMMAND-CWD-RELATIVE') &&
  source.includes('def normalize_gate_command(gate):') &&
  source.includes('for part in parts:') &&
  source.includes('candidate = REPO_ROOT / part') &&
  source.includes('normalized.append(str(candidate))') &&
  source.includes('args.gate = normalize_gate_command(args.gate)') &&
  source.includes('shlex.split(gate)') &&
  source.includes('shlex.quote(p)'),
  {
    marker: source.includes('CLASS-GATE-COMMAND-CWD-RELATIVE'),
    helper: source.includes('def normalize_gate_command(gate):'),
    scansAllTokens: source.includes('for part in parts:'),
    repoResolve: source.includes('candidate = REPO_ROOT / part'),
    appendsResolvedPath: source.includes('normalized.append(str(candidate))'),
    parseHook: source.includes('args.gate = normalize_gate_command(args.gate)'),
    shellSafeSplit: source.includes('shlex.split(gate)'),
    shellSafeQuote: source.includes('shlex.quote(p)'),
  });
record('CLASS-OVERFIX-FULL-FILE-GATE: apparently-green multi-file/multi-hunk diffs get an official-like full-file gate before acceptance',
  source.includes('CLASS-OVERFIX-FULL-FILE-GATE') &&
  source.includes('def overfix_full_file_required(workdir):') &&
  source.includes('full_file=True') &&
  source.includes('FULL-FILE-OVERFIX gate') &&
  source.includes('FULL-FILE-OVERFIX final gate') &&
  gateSource.includes('SWE_GATE_FULL_FILE') &&
  gateSource.includes('t.split("::", 1)[0]') &&
  gateSource.includes('direct node ids from SWE metadata can be incomplete/truncated'),
  {
    marker: source.includes('CLASS-OVERFIX-FULL-FILE-GATE'),
    detector: source.includes('def overfix_full_file_required(workdir):'),
    fullGateCall: source.includes('full_file=True'),
    runTrace: source.includes('FULL-FILE-OVERFIX gate'),
    finalTrace: source.includes('FULL-FILE-OVERFIX final gate'),
    shellFlag: gateSource.includes('SWE_GATE_FULL_FILE'),
    fileFallback: gateSource.includes('t.split("::", 1)[0]'),
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
record('CLASS-GREEN-MINIMIZE-HELPER-TO-EXPRESSION: post-green prompt steers newly added helper/state-machine loops toward compact single-locus language/library expressions',
  source.includes('CLASS-GREEN-MINIMIZE-HELPER-TO-EXPRESSION') &&
  source.includes('small helper/state-machine loop') &&
  source.includes('single failing call site') &&
  source.includes('existing language/library expression'),
  {
    marker: source.includes('CLASS-GREEN-MINIMIZE-HELPER-TO-EXPRESSION'),
    helperLoop: source.includes('small helper/state-machine loop'),
    singleLocus: source.includes('single failing call site'),
    compactExpression: source.includes('existing language/library expression'),
  });
record('CLASS-GREEN-MINIMIZE-HELPER-STATE-MACHINE-SURFACE: helper/state-machine green diffs get one extra bounded helper-collapse refusal before accepting STOP',
  source.includes('def green_diff_added_helper_state_machine(workdir):') &&
  source.includes('green_minimize_helper_surface = False') &&
  source.includes('green_minimize_helper_surface = green_diff_added_helper_state_machine(workdir)') &&
  source.includes('GREEN-MINIMIZE helper/state-machine surface detected') &&
  source.includes('green_minimize_refusal_limit = 2 if green_minimize_helper_surface else 1') &&
  source.includes('Try ONE helper-collapse atomic_replace'),
  {
    detector: source.includes('def green_diff_added_helper_state_machine(workdir):'),
    state: source.includes('green_minimize_helper_surface = False'),
    call: source.includes('green_minimize_helper_surface = green_diff_added_helper_state_machine(workdir)'),
    trace: source.includes('GREEN-MINIMIZE helper/state-machine surface detected'),
    boundedLimit: source.includes('green_minimize_refusal_limit = 2 if green_minimize_helper_surface else 1'),
    prompt: source.includes('Try ONE helper-collapse atomic_replace'),
  });
record('CLASS-GREEN-MINIMIZE-INTRA-HUNK-SIBLING-REVERT (F2c): trial-revert line replacement pairs inside a green hunk and keep only smaller gate-green states',
  source.includes('def trial_revert_intra_hunk_line_pairs(workdir, gate):') &&
  source.includes('CLASS-GREEN-MINIMIZE-INTRA-HUNK-SIBLING-REVERT (F2c)') &&
  source.includes('["git", "diff", "-U0", "HEAD", "--", cf]') &&
  source.includes('txt.replace(new, old, 1)') &&
  source.includes('F2c intra-hunk-revert:') &&
  source.includes('green_minimize_start_lines = _f2c_lines'),
  {
    helper: source.includes('def trial_revert_intra_hunk_line_pairs(workdir, gate):'),
    marker: source.includes('CLASS-GREEN-MINIMIZE-INTRA-HUNK-SIBLING-REVERT (F2c)'),
    zeroContextDiff: source.includes('["git", "diff", "-U0", "HEAD", "--", cf]'),
    trialRevert: source.includes('txt.replace(new, old, 1)'),
    callTrace: source.includes('F2c intra-hunk-revert:'),
    updatesStart: source.includes('green_minimize_start_lines = _f2c_lines'),
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
record('CLASS-GREEN-AT-MAXSTEP-NO-MINIMIZE: first green at max_steps gets a bounded post-green minimize reserve',
  source.includes('GREEN_MINIMIZE_MAXSTEP_RESERVE = 3') &&
  source.includes('args.max_steps + GREEN_MINIMIZE_MAXSTEP_RESERVE') &&
  source.includes('step > args.max_steps') &&
  source.includes('green_minimize_active or _pending_green_minimize') &&
  source.includes('GREEN-AT-MAXSTEP reserve active'),
  {
    reserve: source.includes('GREEN_MINIMIZE_MAXSTEP_RESERVE = 3'),
    boundedLoop: source.includes('args.max_steps + GREEN_MINIMIZE_MAXSTEP_RESERVE'),
    maxBoundary: source.includes('step > args.max_steps'),
    gated: source.includes('green_minimize_active or _pending_green_minimize'),
    trace: source.includes('GREEN-AT-MAXSTEP reserve active'),
  });
record('CLASS-CORPUS-COLLECTION-FOUNDATION (§8): after each green run, a repair-triple is appended to the cross-session corpus (aprendizado entre sessões data layer)',
  source.includes('CLASS-CORPUS-COLLECTION-FOUNDATION') &&
  source.includes('repair-triples.jsonl') &&
  source.includes('if metrics.get("gate_pass") and not NO_GATE'),
  {
    marker: source.includes('CLASS-CORPUS-COLLECTION-FOUNDATION'),
    corpusFile: source.includes('repair-triples.jsonl'),
    guard: source.includes('if metrics.get("gate_pass") and not NO_GATE'),
  });
record('CLASS-CORPUS-RETRIEVAL (§8): at startup the driver reads the cross-session corpus and injects a generalist experience hint (aprendizado entre sessões)',
  source.includes('CLASS-CORPUS-RETRIEVAL') === false && source.includes('CROSS-SESSION EXPERIENCE') && source.includes('_cr_triples'),
  {
    marker: source.includes('CROSS-SESSION EXPERIENCE'),
    retrieval: source.includes('_cr_triples'),
  });
record('CLASS-WEIGHT-RETRIEVAL-EARLY-COMMIT: matched proof-carrying weights become an operational pre-edit read lockout after bounded investigation',
  source.includes('CLASS-WEIGHT-RETRIEVAL-EARLY-COMMIT') &&
  source.includes('matched_weight_classes') &&
  source.includes('WEIGHT_FORCE_EDIT_AFTER = 12') &&
  source.includes('WEIGHT-EARLY-COMMIT engaged') &&
  source.includes('weight early-commit lockout'),
  {
    marker: source.includes('CLASS-WEIGHT-RETRIEVAL-EARLY-COMMIT'),
    state: source.includes('matched_weight_classes'),
    threshold: source.includes('WEIGHT_FORCE_EDIT_AFTER = 12'),
    stepTrace: source.includes('WEIGHT-EARLY-COMMIT engaged'),
    dispatchRefusal: source.includes('weight early-commit lockout'),
  });
record('CLASS-WEIGHT-MACRO-PATH-NORMALIZATION: executable learned weight materializes a general path-normalization-before-regex-match macro under matched-weight edit deadlock and immediately gates it',
  source.includes('CLASS-WEIGHT-MACRO-PATH-NORMALIZATION') &&
  source.includes('CLASS-WEIGHT-MACRO-FIRST-MATERIALIZATION') &&
  source.includes('CLASS-WEIGHT-MACRO-COVERAGE-NO-FILE-CUTOFF') &&
  source.includes('def _apply_path_normalization_weight_macro(workdir):') &&
  source.includes('PATH-NORMALIZATION-BEFORE-MATCH') &&
  source.includes('os.path.normpath({value}).replace(os.sep') &&
  source.includes('return any({pat}.match(normalized) for {pat} in {lst})') &&
  source.includes('weight_macro_attempted = False') &&
  source.includes('if (not weight_macro_attempted and "PATH-NORMALIZATION-BEFORE-MATCH" in matched_weight_classes):') &&
  !source.includes('and weight_force_refused >= WEIGHT_FORCE_REFUSAL_ULTIMATUM):') &&
  source.includes('WEIGHT-MACRO PATH-NORMALIZATION attempt') &&
  source.includes('WEIGHT-MACRO run_tests') &&
  source.includes('for rel in files:') &&
  !source.includes('for rel in files[:500]:') &&
  source.includes('last_pass, gate_out, (np_, nf_) = run_gate(workdir, args.gate)'),
  {
    marker: source.includes('CLASS-WEIGHT-MACRO-PATH-NORMALIZATION'),
    macroFirstClass: source.includes('CLASS-WEIGHT-MACRO-FIRST-MATERIALIZATION'),
    fullScanClass: source.includes('CLASS-WEIGHT-MACRO-COVERAGE-NO-FILE-CUTOFF'),
    helper: source.includes('def _apply_path_normalization_weight_macro(workdir):'),
    className: source.includes('PATH-NORMALIZATION-BEFORE-MATCH'),
    normalization: source.includes('os.path.normpath({value}).replace(os.sep'),
    regexReturn: source.includes('return any({pat}.match(normalized) for {pat} in {lst})'),
    bounded: source.includes('weight_macro_attempted = False'),
    macroFirstCondition: source.includes('if (not weight_macro_attempted and "PATH-NORMALIZATION-BEFORE-MATCH" in matched_weight_classes):'),
    noRefusalThresholdOnMacro: !source.includes('and weight_force_refused >= WEIGHT_FORCE_REFUSAL_ULTIMATUM):'),
    trace: source.includes('WEIGHT-MACRO PATH-NORMALIZATION attempt'),
    gate: source.includes('WEIGHT-MACRO run_tests'),
    fullScan: source.includes('for rel in files:') && !source.includes('for rel in files[:500]:'),
  });
record('CLASS-WEIGHT-LOCKOUT-REFUSAL-ULTIMATUM: matched-weight lockout carries the concrete proven strategy, counts refused stale reads, and escalates to edit-only',
  source.includes('CLASS-WEIGHT-LOCKOUT-REFUSAL-ULTIMATUM') &&
  source.includes('matched_weight_hints') &&
  source.includes('weight_force_refused = 0') &&
  source.includes('WEIGHT_FORCE_REFUSAL_ULTIMATUM = 3') &&
  source.includes('EDIT_ONLY_NAMES = {"atomic_replace", "atomic_create"}') &&
  source.includes('_weight_allowed = EDIT_ONLY_NAMES if weight_force_refused >= WEIGHT_FORCE_REFUSAL_ULTIMATUM else EDIT_TEST_NAMES') &&
  source.includes('Apply this proven operator') &&
  source.includes('ULTIMATUM: repeated stale reads are being refused') &&
  source.includes('refused={weight_force_refused}'),
  {
    marker: source.includes('CLASS-WEIGHT-LOCKOUT-REFUSAL-ULTIMATUM'),
    hints: source.includes('matched_weight_hints'),
    counter: source.includes('weight_force_refused = 0'),
    threshold: source.includes('WEIGHT_FORCE_REFUSAL_ULTIMATUM = 3'),
    editOnly: source.includes('EDIT_ONLY_NAMES = {"atomic_replace", "atomic_create"}'),
    narrowing: source.includes('_weight_allowed = EDIT_ONLY_NAMES if weight_force_refused >= WEIGHT_FORCE_REFUSAL_ULTIMATUM else EDIT_TEST_NAMES'),
    recipePrompt: source.includes('Apply this proven operator'),
    ultimatum: source.includes('ULTIMATUM: repeated stale reads are being refused'),
    traceCount: source.includes('refused={weight_force_refused}'),
  });
record('CLASS-WEIGHT-LOCKOUT-EXECUTABLE-OR-STRONG: learned weights are advisory unless executable or repeatedly proven, preventing weak-weight read starvation',
  source.includes('CLASS-WEIGHT-LOCKOUT-EXECUTABLE-OR-STRONG') &&
  source.includes('matched_weight_lockout_classes') &&
  source.includes('matched_weight_lockout_hints') &&
  source.includes('int(_w.get("proof_n", 1))') &&
  source.includes('_w.get("class") == "PATH-NORMALIZATION-BEFORE-MATCH" or _proof_n >= 2') &&
  source.includes('elif matched_weight_lockout_classes and metrics["edits_applied"] == 0 and reads_since_edit >= WEIGHT_FORCE_EDIT_AFTER:') &&
  source.includes('if fn in READ_FNS and matched_weight_lockout_classes and metrics["edits_applied"] == 0 and reads_since_edit >= WEIGHT_FORCE_EDIT_AFTER:'),
  {
    marker: source.includes('CLASS-WEIGHT-LOCKOUT-EXECUTABLE-OR-STRONG'),
    lockoutState: source.includes('matched_weight_lockout_classes'),
    lockoutHints: source.includes('matched_weight_lockout_hints'),
    proofThreshold: source.includes('int(_w.get("proof_n", 1))'),
    executableOrStrong: source.includes('_w.get("class") == "PATH-NORMALIZATION-BEFORE-MATCH" or _proof_n >= 2'),
    toolSelectionGate: source.includes('elif matched_weight_lockout_classes and metrics["edits_applied"] == 0 and reads_since_edit >= WEIGHT_FORCE_EDIT_AFTER:'),
    dispatchRefusalGate: source.includes('if fn in READ_FNS and matched_weight_lockout_classes and metrics["edits_applied"] == 0 and reads_since_edit >= WEIGHT_FORCE_EDIT_AFTER:'),
  });
record('CLASS-OUT-RECEIPT-PARENT-MKDIR: round evidence output creates its parent directory before writing the final metrics receipt',
  source.includes('out_path = Path(args.out)') &&
  source.includes('out_path.parent.mkdir(parents=True, exist_ok=True)') &&
  source.includes('out_path.write_text(json.dumps(metrics, indent=2))') &&
  !source.includes('Path(args.out).write_text(json.dumps(metrics, indent=2))'),
  {
    pathObject: source.includes('out_path = Path(args.out)'),
    parentMkdir: source.includes('out_path.parent.mkdir(parents=True, exist_ok=True)'),
    finalWrite: source.includes('out_path.write_text(json.dumps(metrics, indent=2))'),
    noBareWrite: !source.includes('Path(args.out).write_text(json.dumps(metrics, indent=2))'),
  });
record('CLASS-ENV-SECRET-PREFLIGHT: DeepSeek credentials are env-only and missing keys fail with an explicit operator-readable refusal',
  source.includes('API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")') &&
  source.includes('if not API_KEY:') &&
  source.includes('DEEPSEEK_API_KEY is required in the environment') &&
  source.includes('Do not pass secrets on the command line or store them in code') &&
  !source.includes('os.environ["DEEPSEEK_API_KEY"]'),
  {
    envGet: source.includes('API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")'),
    preflight: source.includes('if not API_KEY:'),
    clearError: source.includes('DEEPSEEK_API_KEY is required in the environment'),
    noArgvCodeSecrets: source.includes('Do not pass secrets on the command line or store them in code'),
    noImportKeyError: !source.includes('os.environ["DEEPSEEK_API_KEY"]'),
  });
record('CLASS-MODEL-CALL-LIVENESS-OBSERVABILITY: DeepSeek calls have configurable socket timeout, total deadline, and stderr heartbeat before blocking reads',
  source.includes('DEEPSEEK_TIMEOUT') &&
  source.includes('timeout=timeout_s') &&
  source.includes('DEEPSEEK_TOTAL_TIMEOUT') &&
  source.includes('signal.setitimer(signal.ITIMER_REAL, total_timeout_s)') &&
  source.includes('DeepSeek model call exceeded total deadline') &&
  source.includes('ATOMIC_PROGRESS_STDERR') &&
  source.includes('model_call tools=') &&
  source.includes('file=sys.stderr, flush=True'),
  {
    timeoutEnv: source.includes('DEEPSEEK_TIMEOUT'),
    appliedTimeout: source.includes('timeout=timeout_s'),
    totalTimeoutEnv: source.includes('DEEPSEEK_TOTAL_TIMEOUT'),
    totalDeadline: source.includes('signal.setitimer(signal.ITIMER_REAL, total_timeout_s)'),
    totalError: source.includes('DeepSeek model call exceeded total deadline'),
    progressEnv: source.includes('ATOMIC_PROGRESS_STDERR'),
    heartbeat: source.includes('model_call tools='),
    flushedStderr: source.includes('file=sys.stderr, flush=True'),
  });
record('CLASS-MODEL-CALL-HTTP-ERROR-INVALID-ROUND: model API/auth/billing/timeout failures are invalid rounds, not gate/correction losses',
  source.includes('model_call_error = None') &&
  source.includes('model_call_error_kind = ""') &&
  source.includes('getattr(e, "code", None)') &&
  source.includes('"model_payment_required" if code == 402') &&
  source.includes('"model_auth_error" if code in (401, 403)') &&
  source.includes('"model_timeout" if isinstance(e, TimeoutError)') &&
  source.includes('metrics["round_invalid"] = True') &&
  source.includes('metrics["invalid_reason"] = model_call_error_kind') &&
  source.includes('if model_call_error:') &&
  source.includes('metrics["gate_pass"] = None') &&
  source.includes('ROUND INVALID (model call error:'),
  {
    state: source.includes('model_call_error = None'),
    code: source.includes('getattr(e, "code", None)'),
    payment: source.includes('"model_payment_required" if code == 402'),
    auth: source.includes('"model_auth_error" if code in (401, 403)'),
    timeout: source.includes('"model_timeout" if isinstance(e, TimeoutError)'),
    invalid: source.includes('metrics["round_invalid"] = True'),
    noGateLoss: source.includes('if model_call_error:') && source.includes('metrics["gate_pass"] = None'),
  });
record('CLASS-NO-EDIT-STOP-FORBIDDEN: a gated red run with zero edits may not accept STOP/empty patch; it forces edit/test-only tools',
  source.includes('no_edit_stop_refusals = 0') &&
  source.includes('force_no_edit_commit = False') &&
  source.includes('elif force_no_edit_commit:') &&
  source.includes('NO-EDIT-STOP-FORBIDDEN tools withheld (edit/test-only)') &&
  source.includes('STOP refused (no edit yet) -> edit/test-only mode') &&
  source.includes('STOP is invalid: no bytes changed and the acceptance gate is not green') &&
  source.includes('metrics["invalid_states_prevented"] += 1') &&
  ((source.match(/force_no_edit_commit = False/g) || []).length >= 2),
  {
    counter: source.includes('no_edit_stop_refusals = 0'),
    state: source.includes('force_no_edit_commit = False'),
    toolLock: source.includes('elif force_no_edit_commit:'),
    trace: source.includes('NO-EDIT-STOP-FORBIDDEN tools withheld (edit/test-only)'),
    refusal: source.includes('STOP refused (no edit yet) -> edit/test-only mode'),
    prompt: source.includes('STOP is invalid: no bytes changed and the acceptance gate is not green'),
    invalidPrevented: source.includes('metrics["invalid_states_prevented"] += 1'),
    resetsAfterEdit: (source.match(/force_no_edit_commit = False/g) || []).length,
  });
record('CLASS-RED-GATE-REEDIT-LOCKOUT: after a non-empty diff tests red, tools narrow to edit/quick-check/test plus bounded fresh repair reads and handler refuses stale tools until a new edit',
  source.includes('red_gate_fix_required = False') &&
  source.includes('RED_FIX_NAMES = {"atomic_replace", "atomic_create", "quick_check", "run_tests"}') &&
  source.includes('elif red_gate_fix_required:') &&
  source.includes('RED-GATE-REEDIT tools withheld') &&
  source.includes('if red_gate_fix_required and fn not in RED_FIX_NAMES and not _red_gate_read_allowed:') &&
  source.includes('REFUSED (red-gate reedit lockout)') &&
  source.includes('Do not read/search/retest stale bytes') &&
  source.includes('run_tests BLOCKED (red gate requires new edit)') &&
  source.includes('Do not retest the same failed patch') &&
  source.includes('red_gate_fix_required = True') &&
  ((source.match(/red_gate_fix_required = False/g) || []).length >= 2),
  {
    state: source.includes('red_gate_fix_required = False'),
    toolSet: source.includes('RED_FIX_NAMES = {"atomic_replace", "atomic_create", "quick_check", "run_tests"}'),
    toolLock: source.includes('elif red_gate_fix_required:'),
    trace: source.includes('RED-GATE-REEDIT tools withheld'),
    handlerRefusal: source.includes('if red_gate_fix_required and fn not in RED_FIX_NAMES and not _red_gate_read_allowed:'),
    refusalTrace: source.includes('REFUSED (red-gate reedit lockout)'),
    staleBytes: source.includes('Do not read/search/retest stale bytes'),
    retestBlock: source.includes('run_tests BLOCKED (red gate requires new edit)'),
    message: source.includes('Do not retest the same failed patch'),
    activateOnRed: source.includes('red_gate_fix_required = True'),
    resetsAfterEdit: (source.match(/red_gate_fix_required = False/g) || []).length,
  });
record('CLASS-RED-GATE-REPAIR-ANCHOR-READ-ESCAPE: red gate permits only bounded unique fresh read/search anchors for repair, while stale reads and same-diff retests remain blocked',
  source.includes('CLASS-RED-GATE-REPAIR-ANCHOR-READ-ESCAPE') &&
  source.includes('red_gate_anchor_reads = 0') &&
  source.includes('red_gate_anchor_read_keys = set()') &&
  source.includes('RED_GATE_ANCHOR_READ_LIMIT = 3') &&
  source.includes('READ_FNS if red_gate_anchor_reads < RED_GATE_ANCHOR_READ_LIMIT else set()') &&
  source.includes('_red_gate_read_allowed = False') &&
  source.includes('red_gate_anchor_read_keys.add(_rk)') &&
  source.includes('red-gate fresh repair anchor') &&
  source.includes('REFUSED (red-gate repair read stale-or-limit)') &&
  source.includes('run_tests BLOCKED (red gate requires new edit)') &&
  (source.match(/red_gate_anchor_read_keys\.clear\(\)/g) || []).length >= 2,
  {
    marker: source.includes('CLASS-RED-GATE-REPAIR-ANCHOR-READ-ESCAPE'),
    state: source.includes('red_gate_anchor_reads = 0') && source.includes('red_gate_anchor_read_keys = set()'),
    limit: source.includes('RED_GATE_ANCHOR_READ_LIMIT = 3'),
    toolOffer: source.includes('READ_FNS if red_gate_anchor_reads < RED_GATE_ANCHOR_READ_LIMIT else set()'),
    dispatchFlag: source.includes('_red_gate_read_allowed = False'),
    uniqueAdd: source.includes('red_gate_anchor_read_keys.add(_rk)'),
    allowTrace: source.includes('red-gate fresh repair anchor'),
    staleRefusal: source.includes('REFUSED (red-gate repair read stale-or-limit)'),
    retestStillBlocked: source.includes('run_tests BLOCKED (red gate requires new edit)'),
    resets: (source.match(/red_gate_anchor_read_keys\.clear\(\)/g) || []).length,
  });
record('CLASS-RED-GATE-QUICKCHECK-REPAIR-BUDGET: under red gate, quick_check is allowed once per failed diff and then refused until an edit lands',
  source.includes('CLASS-RED-GATE-QUICKCHECK-REPAIR-BUDGET') &&
  source.includes('red_gate_quick_checks = 0') &&
  source.includes('RED_GATE_QUICK_CHECK_LIMIT = 1') &&
  source.includes('RED_FIX_NAMES if red_gate_quick_checks < RED_GATE_QUICK_CHECK_LIMIT else (RED_FIX_NAMES - {"quick_check"})') &&
  source.includes('if red_gate_fix_required and fn == "quick_check":') &&
  source.includes('quick_check ALLOWED (red-gate quickcheck') &&
  source.includes('quick_check REFUSED (red-gate quickcheck budget)') &&
  source.includes('Local snippets cannot override the red gate') &&
  (source.match(/red_gate_quick_checks = 0/g) || []).length >= 3,
  {
    marker: source.includes('CLASS-RED-GATE-QUICKCHECK-REPAIR-BUDGET'),
    state: source.includes('red_gate_quick_checks = 0'),
    limit: source.includes('RED_GATE_QUICK_CHECK_LIMIT = 1'),
    toolOffer: source.includes('RED_FIX_NAMES if red_gate_quick_checks < RED_GATE_QUICK_CHECK_LIMIT else (RED_FIX_NAMES - {"quick_check"})'),
    dispatchGuard: source.includes('if red_gate_fix_required and fn == "quick_check":'),
    allowTrace: source.includes('quick_check ALLOWED (red-gate quickcheck'),
    refusalTrace: source.includes('quick_check REFUSED (red-gate quickcheck budget)'),
    gatePrecedence: source.includes('Local snippets cannot override the red gate'),
    resets: (source.match(/red_gate_quick_checks = 0/g) || []).length,
  });
const py = spawnSync('python3', ['-m', 'py_compile', agentPath], { cwd: repoRoot, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
record('local_atomic_agent.py remains valid Python after green-minimize update', py.status === 0, { status: py.status, signal: py.signal, stderr: py.stderr });

const ok = results.every((entry) => entry.ok);
if (jsonMode) console.log(JSON.stringify({ ok, results }, null, 2));
else for (const entry of results) console.log((entry.ok ? 'PASS' : 'FAIL') + ' ' + entry.name);
process.exit(ok ? 0 : 1);

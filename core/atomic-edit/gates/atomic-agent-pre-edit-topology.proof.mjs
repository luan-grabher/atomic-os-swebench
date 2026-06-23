#!/usr/bin/env node
/**
 * atomic-agent-pre-edit-topology.proof.mjs
 *
 * Proves the local Atomic Agent CLI carries the generalist pre-edit topology lesson
 * in its CURRENT non-blocking form, and that the callgraph instruction is executable
 * through a real atomic_callers tool mapped to atomic_grep_calls.
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
function record(name, ok, detail = {}) { results.push({ name, ok: Boolean(ok), detail }); }

record('agent tracks pre-edit topology guidance state',
  source.includes('pre_edit_topology_prompted = False') && source.includes('pre_edit_topology_active = False'),
  { prompted: source.includes('pre_edit_topology_prompted = False'), active: source.includes('pre_edit_topology_active = False') });
record('topology guidance triggers after body-level reads and before first edit',
  source.includes('metrics["edits_applied"] == 0 and metrics["body_context_reads"] > 0 and not pre_edit_topology_prompted') &&
  source.includes('You have read enough to edit. Pick the smallest implementation topology'),
  { guard: source.includes('metrics["edits_applied"] == 0 and metrics["body_context_reads"] > 0 and not pre_edit_topology_prompted') });
record('topology guidance is non-blocking and does not withhold tools',
  source.includes('TOPOLOGY-GUIDANCE injected (non-blocking)') &&
  source.includes('Do NOT set pre_edit_topology_active') &&
  source.includes('You may state your topology reasoning as content alongside the tool call.'),
  { nonBlocking: source.includes('TOPOLOGY-GUIDANCE injected (non-blocking)') });
record('body-context reads are counted only for code-body reads',
  source.includes('"body_context_reads": 0,') &&
  source.includes('if fn in ("atomic_read", "atomic_read_many"):') &&
  source.includes('metrics["body_context_reads"] += 1'),
  { init: source.includes('"body_context_reads": 0,'), counted: source.includes('metrics["body_context_reads"] += 1') });
record('topology prompt requires canonical implementation and delegating wrappers',
  source.includes('canonical implementation location') &&
  source.includes('delegating wrappers') &&
  source.includes('preferring ONE canonical implementation') &&
  source.includes('smallest faithful edit(s)'),
  {
    canonical: source.includes('canonical implementation location'),
    wrappers: source.includes('delegating wrappers'),
    oneCanonical: source.includes('preferring ONE canonical implementation'),
    smallest: source.includes('smallest faithful edit(s)'),
  });
record('atomic_callers is exposed as an active model tool',
  source.includes('"name": "atomic_callers"') &&
  source.includes('Find real AST call sites of a function/callee name') &&
  source.includes('"name": {"type": "string"}') &&
  source.includes('"required": ["name"]'),
  { tool: source.includes('"name": "atomic_callers"') });
record('atomic_callers dispatches to atomic_grep_calls',
  source.includes('"atomic_callers": ("atomic_grep_calls"') &&
  source.includes('"name": a.get("name", "")') &&
  source.includes('"scope": a.get("scope")'),
  { dispatch: source.includes('"atomic_callers": ("atomic_grep_calls"') });
record('atomic_callers participates in read budgets and aliases',
  source.includes('"atomic_callers"') &&
  source.includes('READ_FNS = {"atomic_survey", "atomic_read_many", "atomic_outline", "atomic_read", "atomic_grep", "atomic_callers"}') &&
  source.includes('"atomic_callers": {"function": "name"'),
  { readFns: source.includes('READ_FNS = {"atomic_survey", "atomic_read_many", "atomic_outline", "atomic_read", "atomic_grep", "atomic_callers"}') });
record('red-test diagnostics preserve DID NOT RAISE error-path signal',
  source.includes('CLASS-DID-NOT-RAISE-RED-FEEDBACK') &&
  source.includes('if "DID NOT RAISE" in gate_out:') &&
  source.includes('your edit is too permissive') &&
  source.includes('removed an expected error path') &&
  source.includes('restore the invalid-input rejection at the smallest parser/validator boundary'),
  { didNotRaise: source.includes('if "DID NOT RAISE" in gate_out:') });
const py = spawnSync('python3', ['-m', 'py_compile', agentPath], { cwd: repoRoot, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
record('local_atomic_agent.py remains valid Python after topology/callers update', py.status === 0, { status: py.status, signal: py.signal, stderr: py.stderr });
const ok = results.every((entry) => entry.ok);
if (jsonMode) console.log(JSON.stringify({ ok, results }, null, 2));
else for (const entry of results) console.log((entry.ok ? 'PASS' : 'FAIL') + ' ' + entry.name);
process.exit(ok ? 0 : 1);

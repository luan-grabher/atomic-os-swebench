#!/usr/bin/env node
/**
 * atomic-agent-final-merge-canonicity.proof.mjs
 *
 * Proves the local Atomic Agent CLI carries the R022 generalist lesson:
 * for merge/default-composition/update helpers, preserve override precedence by
 * reasoning over the final merged representation unless source identity is an
 * explicit part of the contract. The counterexample was a patch that deleted a
 * key when either source input had None; the canonical class deletes only when
 * the final merged value is None.
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

function hasFinalMergeInstruction(text) {
  const required = [
    'final merged representation',
    'source identity is explicitly part of the contract',
    'preserve override precedence',
    'filter by final value',
    'not by independently scanning input sources',
  ];
  return {
    ok: required.every((needle) => text.includes(needle)),
    required: Object.fromEntries(required.map((needle) => [needle, text.includes(needle)])),
  };
}

const losingAtomicPatch = [
  'merged_setting = OrderedDict(to_key_val_list(session_setting))',
  'merged_setting.update(to_key_val_list(request_setting))',
  '',
  '# Remove keys that are set to None from either request or session settings.',
  'for key, value in request_setting.items():',
  '    if value is None and key in merged_setting:',
  '        del merged_setting[key]',
  'for key, value in session_setting.items():',
  '    if value is None and key in merged_setting:',
  '        del merged_setting[key]',
].join('\n');

const canonicalFinalValuePatch = [
  'merged_setting = OrderedDict(to_key_val_list(session_setting))',
  'merged_setting.update(to_key_val_list(request_setting))',
  '',
  '# Remove keys that are set to None.',
  'none_keys = [k for (k, v) in merged_setting.items() if v is None]',
  'for key in none_keys:',
  '    del merged_setting[key]',
].join('\n');

function scansSourceInputsForDeletion(text) {
  const sourceLoop = /for\s+\w+\s*,\s*\w+\s+in\s+(?:request_setting|session_setting)\.items\(\):[\s\S]{0,220}del\s+merged_setting\[\w+\]/g;
  const matches = [...text.matchAll(sourceLoop)].length;
  return matches >= 1 && text.includes('request_setting.items()') && text.includes('session_setting.items()');
}

function filtersByFinalMergedValue(text) {
  const listLoop = /for\s+\w+\s*,\s*\w+\s+in\s+list\(merged_setting\.items\(\)\):[\s\S]{0,200}if\s+\w+\s+is\s+None:[\s\S]{0,140}del\s+merged_setting\[\w+\]/;
  const stagedKeys = /\w+\s*=\s*\[[\s\S]{0,160}for\s+\([^\)]*\)\s+in\s+merged_setting\.items\(\)[\s\S]{0,80}if\s+\w+\s+is\s+None[\s\S]{0,160}for\s+\w+\s+in\s+\w+:[\s\S]{0,120}del\s+merged_setting\[\w+\]/;
  return listLoop.test(text) || stagedKeys.test(text);
}

const instruction = hasFinalMergeInstruction(source);
record('agent prompt carries final-merged-value merge/update canonicality instruction', instruction.ok, instruction.required);
record('classifier catches the R022 source-input deletion counterexample', scansSourceInputsForDeletion(losingAtomicPatch), {});
record('classifier does not accept the R022 source-input deletion as final-value canonical', !filtersByFinalMergedValue(losingAtomicPatch), {});
record('classifier accepts a canonical final-merged-value deletion patch', filtersByFinalMergedValue(canonicalFinalValuePatch), {});
record('canonical final-value patch is not classified as source-input deletion', !scansSourceInputsForDeletion(canonicalFinalValuePatch), {});

const py = spawnSync('python3', ['-m', 'py_compile', agentPath], { cwd: repoRoot, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
record('local_atomic_agent.py remains valid Python', py.status === 0, { status: py.status, signal: py.signal, stderr: py.stderr });

const ok = results.every((entry) => entry.ok);
if (jsonMode) console.log(JSON.stringify({ ok, results }, null, 2));
else for (const entry of results) console.log((entry.ok ? 'PASS ' : 'FAIL ') + entry.name);
process.exit(ok ? 0 : 1);

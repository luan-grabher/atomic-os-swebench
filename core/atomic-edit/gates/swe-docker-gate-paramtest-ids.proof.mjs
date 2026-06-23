#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd(), '../..');
const gatePath = path.join(repoRoot, 'core/agent/atomic-full-ab/local-loop/swe_docker_gate.sh');
const metaPath = path.join(repoRoot, 'core/agent/atomic-full-ab/local-loop/tasks/SWE-pylint-dev__pylint-8898/meta.json');
const src = fs.readFileSync(gatePath, 'utf8');
let pass = 0;
let fail = 0;
const results = [];
function check(name, ok, detail = {}) {
  results.push({ name, ok, detail });
  if (ok) pass += 1; else fail += 1;
}

const syntax = spawnSync('bash', ['-n', gatePath], { encoding: 'utf8' });
check('swe_docker_gate.sh is syntactically valid bash', syntax.status === 0, { status: syntax.status, stderr: syntax.stderr.slice(0, 200) });
check('gate uses Python shlex.quote for pytest node ids', src.includes('import json,sys,re,shlex') && src.includes('shlex.quote(t)'), {});
check('gate no longer uses brittle Bash single-quote replacement', !src.includes('esc=${l//'), {});
check('gate drops bracket-unbalanced malformed node ids', src.includes("t.count('[') != t.count(']')"), {});
check('CLASS-GATE-EXCEPTION-COUNT-FAILURES marker is present', src.includes('CLASS-GATE-EXCEPTION-COUNT-FAILURES'), {});
check('gate counts failed/error/exception summary categories', src.includes('failed|failures|error|errors|exception|exceptions'), {});
check('gate sums all failure categories instead of taking the first category only', src.includes("awk '{s += $1} END {print s+0}'") && !src.includes('grep -oE "[0-9]+ (failed|error)" | grep -oE "[0-9]+" | head -1'), {});
function summedFailureCount(text) {
  return Array.from(text.matchAll(/[0-9]+ (failed|failures|error|errors|exception|exceptions)/g))
    .reduce((sum, match) => sum + Number(match[0].split(' ')[0]), 0);
}
check('failure parser counts exceptions as failures', summedFailureCount('91 passed, 1 failed, 4 expected to fail, 4 exceptions,') === 5, {});
check('failure parser keeps clean summaries at zero failures', summedFailureCount('92 passed') === 0, {});

const render = spawnSync('python3', ['-', metaPath, '18'], {
  encoding: 'utf8',
  input: `import json,sys,re,shlex\nm=json.load(open(sys.argv[1])); n=int(sys.argv[2])\ndef ok(t):\n    t=t.strip()\n    if not t or re.match(r'^\\[\\d+%\\]$', t): return False\n    if t.count('[') != t.count(']'): return False\n    return ('::' in t) or t.endswith('.py')\nprint(' '.join(shlex.quote(t) for t in (m['FAIL_TO_PASS'] + m['PASS_TO_PASS'][:n]) if ok(t)))\n`,
});
check('target renderer runs on pylint-8898 metadata', render.status === 0, { status: render.status, stderr: render.stderr.slice(0, 200) });
const renderedTargets = render.stdout.trim();
const split = spawnSync('bash', ['-lc', `set -- ${renderedTargets}; printf '%s\\n' "$@"`], { encoding: 'utf8' });
const args = split.stdout.trim().split('\n').filter(Boolean);
check('rendered target list is nonempty', renderedTargets.length > 0, {});
check('quoted target list can be shell-split', split.status === 0, { status: split.status, stderr: split.stderr.slice(0, 200) });
check('quoted comma node id survives shell splitting as one argument', args.includes('tests/config/test_config.py::test_csv_regex_comma_in_quantifier[foo,bar-expected1]'), { args: args.filter(a => a.includes('test_csv_regex_comma_in_quantifier')) });
check('malformed truncated node id is filtered out', !args.includes('tests/config/test_config.py::test_csv_regex_comma_in_quantifier[foo,'), { args: args.filter(a => a.includes('test_csv_regex_comma_in_quantifier')) });

const ok = fail === 0;
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ok, pass, fail, results }, null, 2));
} else {
  console.log(`SWE-DOCKER-GATE-PARAMTEST-IDS ${pass}/${pass + fail}`);
  for (const r of results) if (!r.ok) console.log('FAIL:', r.name, JSON.stringify(r.detail));
}
if (!ok) process.exit(1);

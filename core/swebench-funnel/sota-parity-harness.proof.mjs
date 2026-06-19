#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const harnessPath = path.join(here, 'sota-parity-harness.mjs');
assert.equal(fs.existsSync(harnessPath), true, 'sota-parity-harness.mjs must exist');

const harness = await import(pathToFileURL(harnessPath).href);
const { evaluateSotaParity, fixture, runCli } = harness;
const futureNow = '2026-06-16T20:00:00.000Z';

const empty = evaluateSotaParity({ now: futureNow, publicRuns: [], localEvidence: fixture('local-human-eval-lift') });
assert.equal(empty.ok, true);
assert.equal(empty.claims.fixedModelLift.allowed, true);
assert.equal(empty.claims.absolutePublicSota.allowed, false);
assert.match(empty.claims.absolutePublicSota.blockers.join('\n'), /missing public benchmark result: swe-bench-verified/);
assert.equal(empty.claims.rawLeaderboardClaim.allowed, false);

const withBaselines = evaluateSotaParity({
  now: futureNow,
  publicRuns: [
    {
      benchmarkId: 'aider-polyglot',
      atomicScore: 89,
      artifactUrl: 'https://example.invalid/atomic/aider-polyglot/run.json',
      evaluator: 'official-or-reproducible-harness',
      observedAt: '2026-06-15T00:00:00.000Z',
    },
  ],
  baselineSnapshot: {
    baselines: [
      { benchmarkId: 'aider-polyglot', currentLeaderScore: 88, leaderboardUrl: 'https://aider.chat/docs/leaderboards/' },
      { benchmarkId: 'swe-bench-verified', currentLeaderScore: 79.2, leaderboardUrl: 'https://www.swebench.com/index.html' },
    ],
  },
});
assert.equal(withBaselines.publicBenchmarks[0].status, 'wins-current-leader');
assert.equal(withBaselines.sotaBaselines.length, 2);
assert.equal(withBaselines.nextRuns.find((entry) => entry.benchmarkId === 'swe-bench-verified').target.currentLeaderScore, 79.2);

const stale = evaluateSotaParity({
  now: futureNow,
  publicRuns: [
    {
      benchmarkId: 'swe-bench-verified',
      atomicScore: 96,
      currentLeaderScore: 95,
      leaderboardUrl: 'https://www.swebench.com/',
      artifactUrl: 'https://example.invalid/artifact.json',
      evaluator: 'official',
      observedAt: '2026-03-01T00:00:00.000Z',
    },
  ],
});
assert.equal(stale.claims.absolutePublicSota.allowed, false);
assert.match(stale.claims.absolutePublicSota.blockers.join('\n'), /stale public benchmark result/);

const full = evaluateSotaParity({
  now: futureNow,
  publicRuns: fixture('complete-winning-public-runs'),
  localEvidence: fixture('local-human-eval-lift'),
});
assert.equal(full.claims.absolutePublicSota.allowed, true);
assert.equal(full.claims.interfaceLift.allowed, true);
assert.equal(full.publicBenchmarks.every((entry) => entry.status === 'wins-current-leader'), true);

const losing = evaluateSotaParity({
  now: futureNow,
  publicRuns: fixture('complete-losing-public-runs'),
});
assert.equal(losing.claims.absolutePublicSota.allowed, false);
assert.match(losing.claims.absolutePublicSota.blockers.join('\n'), /does not beat current leader/);

const cliPayload = runCli(['--self-test', '--json'], '');
assert.equal(cliPayload.ok, true);
assert.equal(cliPayload.claims.absolutePublicSota.allowed, false);
const persisted = JSON.parse(fs.readFileSync(path.join(here, 'sota-parity-current.json'), 'utf8'));
assert.deepEqual(persisted, cliPayload);

console.log(JSON.stringify({ ok: true, proof: 'sota-parity-harness', checked: 6 }, null, 2));

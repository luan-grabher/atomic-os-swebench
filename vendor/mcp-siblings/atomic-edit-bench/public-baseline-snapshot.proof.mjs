#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.join(here, 'public-baseline-snapshot.mjs');
const snapshotter = await import(pathToFileURL(snapshotPath).href);
const { parseAiderLeaderboard, parseSwebenchLeaderboard, buildSnapshot, runCli } = snapshotter;

const aiderHtml = `
<ul>
  <li><strong>Dirname :</strong> 2026-01-01--slow</li>
  <li><strong>Test cases :</strong> 225</li>
  <li><strong>Model :</strong> slow-model</li>
  <li><strong>Edit format :</strong> whole</li>
  <li><strong>Pass rate 1 :</strong> 10.0</li>
  <li><strong>Pass rate 2 :</strong> 60.0</li>
  <li><strong>Pass num 1 :</strong> 22</li>
  <li><strong>Pass num 2 :</strong> 135</li>
</ul>
<ul>
  <li><strong>Dirname :</strong> 2026-02-01--leader</li>
  <li><strong>Test cases :</strong> 225</li>
  <li><strong>Model :</strong> leader-model</li>
  <li><strong>Edit format :</strong> diff</li>
  <li><strong>Pass rate 1 :</strong> 52.0</li>
  <li><strong>Pass rate 2 :</strong> 88.0</li>
  <li><strong>Pass num 1 :</strong> 117</li>
  <li><strong>Pass num 2 :</strong> 198</li>
</ul>`;
const aider = parseAiderLeaderboard(aiderHtml);
assert.equal(aider.ok, true);
assert.equal(aider.leader.model, 'leader-model');
assert.equal(aider.leader.passRate2Pct, 88.0);
assert.equal(aider.leader.passNum2, 198);

const sweHtml = `<script type="application/json" id="leaderboard-data">${JSON.stringify([
  { name: 'Lite', results: [{ name: 'lite-agent', resolved: 99.0 }] },
  { name: 'Verified', results: [
    { name: 'agent-a', resolved: 79.2, date: '2025-12-15', folder: 'verified-a', site: 'https://example.invalid/a' },
    { name: 'agent-b', resolved: 76.8, date: '2026-02-17', folder: 'verified-b', site: 'https://example.invalid/b' }
  ] }
])}</script>`;
const swe = parseSwebenchLeaderboard(sweHtml);
assert.equal(swe.ok, true);
assert.equal(swe.leader.name, 'agent-a');
assert.equal(swe.leader.resolvedPct, 79.2);
assert.equal(swe.leader.folder, 'verified-a');

const snapshot = buildSnapshot({ aiderHtml, sweHtml, fetchedAt: '2026-06-16T22:10:00.000Z' });
assert.equal(snapshot.ok, true);
assert.equal(snapshot.baselines.length, 2);
assert.equal(snapshot.baselines[0].benchmarkId, 'aider-polyglot');
assert.equal(snapshot.baselines[0].currentLeaderScore, 88.0);
assert.equal(snapshot.baselines[1].benchmarkId, 'swe-bench-verified');
assert.equal(snapshot.baselines[1].currentLeaderScore, 79.2);

const cli = runCli(['--from-fixture', '--json'], '');
assert.equal(cli.ok, true);
assert.equal(cli.baselines.length, 2);

console.log(JSON.stringify({ ok: true, proof: 'public-baseline-snapshot', checked: 4 }, null, 2));

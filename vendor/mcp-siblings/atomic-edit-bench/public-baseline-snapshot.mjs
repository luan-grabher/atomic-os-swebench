#!/usr/bin/env node
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SNAPSHOT_ID = 'atomic-public-baseline-snapshot-v1';
export const AIDER_LEADERBOARD_URL = 'https://aider.chat/docs/leaderboards/';
export const SWEBENCH_LEADERBOARD_URL = 'https://www.swebench.com/index.html';

function stripHtml(value) {
  return String(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function parseArgs(argv) {
  const options = { json: false, fromFixture: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--from-fixture') {
      options.fromFixture = true;
    } else if (arg === '--aider-file') {
      options.aiderFile = argv[++index];
    } else if (arg === '--swebench-file') {
      options.swebenchFile = argv[++index];
    } else if (arg === '--fetched-at') {
      options.fetchedAt = argv[++index];
    } else if (arg === '--out') {
      options.out = argv[++index];
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

export function parseAiderLeaderboard(html) {
  const text = stripHtml(html);
  const entries = [];
  const entryRe = /Dirname\s*:\s*(.*?)\s+Test cases\s*:\s*(\d+)\s+Model\s*:\s*(.*?)\s+Edit format\s*:\s*(.*?)\s+(?:Commit hash\s*:\s*.*?\s+)?(?:Reasoning effort\s*:\s*.*?\s+)?(?:Thinking tokens\s*:\s*.*?\s+)?Pass rate 1\s*:\s*([\d.]+)\s+Pass rate 2\s*:\s*([\d.]+)\s+Pass num 1\s*:\s*(\d+)\s+Pass num 2\s*:\s*(\d+)/g;
  let match;
  while ((match = entryRe.exec(text)) !== null) {
    const passRate2Pct = numberOrNull(match[6]);
    if (passRate2Pct === null) continue;
    entries.push({
      dirname: match[1].trim(),
      testCases: integerOrNull(match[2]),
      model: match[3].trim(),
      editFormat: match[4].trim(),
      passRate1Pct: numberOrNull(match[5]),
      passRate2Pct,
      passNum1: integerOrNull(match[7]),
      passNum2: integerOrNull(match[8]),
    });
  }
  entries.sort((a, b) => b.passRate2Pct - a.passRate2Pct || (b.passNum2 ?? 0) - (a.passNum2 ?? 0));
  if (entries.length === 0) {
    return { ok: false, benchmarkId: 'aider-polyglot', blockers: ['could not parse Aider leaderboard entries'] };
  }
  return { ok: true, benchmarkId: 'aider-polyglot', metric: 'pass_rate_2_pct', url: AIDER_LEADERBOARD_URL, leader: entries[0], parsedEntries: entries.length };
}

export function parseSwebenchLeaderboard(html) {
  const match = String(html).match(/<script\s+type="application\/json"\s+id="leaderboard-data">\s*([\s\S]*?)\s*<\/script>/i);
  if (!match) return { ok: false, benchmarkId: 'swe-bench-verified', blockers: ['could not find SWE-bench leaderboard-data JSON'] };
  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch (error) {
    return { ok: false, benchmarkId: 'swe-bench-verified', blockers: ['could not parse SWE-bench leaderboard-data JSON: ' + String(error.message || error)] };
  }
  const verified = Array.isArray(parsed) ? parsed.find((entry) => entry?.name === 'Verified') : null;
  const results = Array.isArray(verified?.results) ? verified.results : [];
  const entries = results
    .filter((entry) => Number.isFinite(entry?.resolved))
    .map((entry) => ({
      name: String(entry.name ?? 'unknown'),
      resolvedPct: Number(entry.resolved),
      date: entry.date ?? null,
      folder: entry.folder ?? null,
      site: entry.site ?? null,
      tags: entry.tags ?? null,
      cost: Number.isFinite(entry.cost) ? entry.cost : null,
    }))
    .sort((a, b) => b.resolvedPct - a.resolvedPct);
  if (entries.length === 0) {
    return { ok: false, benchmarkId: 'swe-bench-verified', blockers: ['could not find numeric Verified results in SWE-bench data'] };
  }
  return { ok: true, benchmarkId: 'swe-bench-verified', metric: 'resolved_pct', url: SWEBENCH_LEADERBOARD_URL, leader: entries[0], parsedEntries: entries.length };
}

function baselineFromAider(parsed) {
  return {
    benchmarkId: 'aider-polyglot',
    metric: parsed.metric,
    higherIsBetter: true,
    currentLeaderScore: parsed.leader.passRate2Pct,
    leaderboardUrl: parsed.url,
    evaluator: 'official Aider leaderboard',
    leader: parsed.leader,
    parsedEntries: parsed.parsedEntries,
  };
}

function baselineFromSwebench(parsed) {
  return {
    benchmarkId: 'swe-bench-verified',
    metric: parsed.metric,
    higherIsBetter: true,
    currentLeaderScore: parsed.leader.resolvedPct,
    leaderboardUrl: parsed.url,
    evaluator: 'official SWE-bench leaderboard',
    leader: parsed.leader,
    parsedEntries: parsed.parsedEntries,
  };
}

export function fixtureHtml() {
  const aiderHtml = `
  <ul><li><strong>Dirname :</strong> slow</li><li><strong>Test cases :</strong> 225</li><li><strong>Model :</strong> slow-model</li><li><strong>Edit format :</strong> whole</li><li><strong>Pass rate 1 :</strong> 10.0</li><li><strong>Pass rate 2 :</strong> 60.0</li><li><strong>Pass num 1 :</strong> 22</li><li><strong>Pass num 2 :</strong> 135</li></ul>
  <ul><li><strong>Dirname :</strong> leader</li><li><strong>Test cases :</strong> 225</li><li><strong>Model :</strong> leader-model</li><li><strong>Edit format :</strong> diff</li><li><strong>Pass rate 1 :</strong> 52.0</li><li><strong>Pass rate 2 :</strong> 88.0</li><li><strong>Pass num 1 :</strong> 117</li><li><strong>Pass num 2 :</strong> 198</li></ul>`;
  const sweHtml = `<script type="application/json" id="leaderboard-data">${JSON.stringify([
    { name: 'Lite', results: [{ name: 'lite-agent', resolved: 99.0 }] },
    { name: 'Verified', results: [
      { name: 'agent-a', resolved: 79.2, date: '2025-12-15', folder: 'verified-a', site: 'https://example.invalid/a' },
      { name: 'agent-b', resolved: 76.8, date: '2026-02-17', folder: 'verified-b', site: 'https://example.invalid/b' }
    ] }
  ])}</script>`;
  return { aiderHtml, sweHtml };
}

export function buildSnapshot({ aiderHtml, sweHtml, fetchedAt = new Date().toISOString() } = {}) {
  const aider = parseAiderLeaderboard(aiderHtml ?? '');
  const swebench = parseSwebenchLeaderboard(sweHtml ?? '');
  const blockers = [];
  if (!aider.ok) blockers.push(...aider.blockers);
  if (!swebench.ok) blockers.push(...swebench.blockers);
  const baselines = [];
  if (aider.ok) baselines.push(baselineFromAider(aider));
  if (swebench.ok) baselines.push(baselineFromSwebench(swebench));
  return {
    ok: blockers.length === 0,
    snapshotId: SNAPSHOT_ID,
    fetchedAt,
    sources: {
      aiderPolyglot: AIDER_LEADERBOARD_URL,
      sweBenchVerified: SWEBENCH_LEADERBOARD_URL,
    },
    baselines,
    blockers,
  };
}

export function runCli(argv = [], stdinText = '') {
  const options = parseArgs(argv);
  let html;
  if (options.fromFixture) {
    html = fixtureHtml();
  } else {
    if (!options.aiderFile || !options.swebenchFile) throw new Error('runCli requires --from-fixture or both --aider-file and --swebench-file');
    html = {
      aiderHtml: fs.readFileSync(options.aiderFile, 'utf8'),
      sweHtml: fs.readFileSync(options.swebenchFile, 'utf8'),
    };
  }
  const payload = buildSnapshot({ ...html, fetchedAt: options.fetchedAt ?? 'fixture' });
  if (options.out) fs.writeFileSync(options.out, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { accept: 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  return response.text();
}

export async function runCliAsync(argv = []) {
  const options = parseArgs(argv);
  if (options.fromFixture || options.aiderFile || options.swebenchFile) return runCli(argv, '');
  const [aiderHtml, sweHtml] = await Promise.all([fetchText(AIDER_LEADERBOARD_URL), fetchText(SWEBENCH_LEADERBOARD_URL)]);
  const payload = buildSnapshot({ aiderHtml, sweHtml, fetchedAt: options.fetchedAt ?? new Date().toISOString() });
  if (options.out) fs.writeFileSync(options.out, JSON.stringify(payload, null, 2) + '\n');
  return payload;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const payload = await runCliAsync(process.argv.slice(2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.ok ? 0 : 1);
}

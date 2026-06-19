#!/usr/bin/env node
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

export const HARNESS_ID = 'atomic-sota-parity-harness-v1';
export const DEFAULT_FRESHNESS_DAYS = 45;

export const PUBLIC_BENCHMARKS = Object.freeze([
  {
    benchmarkId: 'swe-bench-verified',
    name: 'SWE-bench Verified',
    publicUrl: 'https://www.swebench.com/',
    metric: 'resolved_pct',
    higherIsBetter: true,
    requiredForAbsolutePublicSota: true,
  },
  {
    benchmarkId: 'aider-polyglot',
    name: 'Aider Polyglot',
    publicUrl: 'https://aider.chat/docs/leaderboards/',
    metric: 'pass_pct',
    higherIsBetter: true,
    requiredForAbsolutePublicSota: true,
  },
  {
    benchmarkId: 'codestruct-style-fixed-model-delta',
    name: 'CodeStruct-style fixed-model interface delta',
    publicUrl: 'https://arxiv.org/abs/2604.05407',
    metric: 'fixed_model_lift_pp',
    higherIsBetter: true,
    requiredForAbsolutePublicSota: false,
  },
]);

const REQUIRED_PUBLIC_IDS = PUBLIC_BENCHMARKS
  .filter((entry) => entry.requiredForAbsolutePublicSota)
  .map((entry) => entry.benchmarkId);

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function daysBetween(nowIso, thenIso) {
  const now = Date.parse(nowIso);
  const then = Date.parse(thenIso);
  if (!Number.isFinite(now) || !Number.isFinite(then)) return Infinity;
  return Math.max(0, (now - then) / (24 * 60 * 60 * 1000));
}

function benchmarkSpec(id) {
  return PUBLIC_BENCHMARKS.find((entry) => entry.benchmarkId === id) ?? null;
}

function classifyPublicRun(rawRun, nowIso, freshnessDays) {
  const run = isObject(rawRun) ? rawRun : {};
  const benchmarkId = String(run.benchmarkId ?? '');
  const spec = benchmarkSpec(benchmarkId);
  const blockers = [];
  if (!spec) blockers.push(`unknown public benchmark: ${benchmarkId || '(missing id)'}`);
  const atomicScore = finiteNumber(run.atomicScore);
  const currentLeaderScore = finiteNumber(run.currentLeaderScore);
  if (atomicScore === null) blockers.push(`missing numeric atomicScore for ${benchmarkId}`);
  if (currentLeaderScore === null) blockers.push(`missing numeric currentLeaderScore for ${benchmarkId}`);
  if (!isHttpUrl(run.leaderboardUrl)) blockers.push(`missing public leaderboardUrl for ${benchmarkId}`);
  if (!isHttpUrl(run.artifactUrl)) blockers.push(`missing public artifactUrl for ${benchmarkId}`);
  if (typeof run.evaluator !== 'string' || run.evaluator.trim().length === 0) blockers.push(`missing evaluator for ${benchmarkId}`);
  if (!Number.isFinite(Date.parse(String(run.observedAt ?? '')))) blockers.push(`missing observedAt for ${benchmarkId}`);
  const ageDays = daysBetween(nowIso, String(run.observedAt ?? ''));
  if (ageDays > freshnessDays) blockers.push(`stale public benchmark result: ${benchmarkId} observed ${Math.round(ageDays)} days ago`);

  let wins = false;
  if (spec && atomicScore !== null && currentLeaderScore !== null) {
    wins = spec.higherIsBetter ? atomicScore > currentLeaderScore : atomicScore < currentLeaderScore;
    if (!wins) blockers.push(`${benchmarkId} does not beat current leader (${atomicScore} vs ${currentLeaderScore})`);
  }

  const status = blockers.length === 0 && wins ? 'wins-current-leader' : 'not-established';
  return {
    benchmarkId,
    name: spec?.name ?? benchmarkId,
    metric: spec?.metric ?? null,
    status,
    wins,
    atomicScore,
    currentLeaderScore,
    observedAt: run.observedAt ?? null,
    ageDays: Number.isFinite(ageDays) ? Number(ageDays.toFixed(2)) : null,
    leaderboardUrl: run.leaderboardUrl ?? null,
    artifactUrl: run.artifactUrl ?? null,
    evaluator: run.evaluator ?? null,
    blockers,
  };
}

function evaluateFixedModelLift(localEvidence) {
  const evidence = isObject(localEvidence) ? localEvidence : {};
  const fixed = isObject(evidence.fixedModelLift) ? evidence.fixedModelLift : evidence;
  const baselinePassed = finiteNumber(fixed.baselinePassed);
  const proofPassed = finiteNumber(fixed.proofPassed);
  const total = finiteNumber(fixed.total);
  const sameFixedModel = fixed.sameFixedModel === true;
  const feedbackDerived = fixed.feedbackDerived === true;
  const packageValid = fixed.packageValid !== false;
  const repairBound = fixed.repairBound !== false;
  const liftCount = baselinePassed !== null && proofPassed !== null ? proofPassed - baselinePassed : null;
  const liftPct = liftCount !== null && total ? (100 * liftCount) / total : null;
  const blockers = [];
  if (!sameFixedModel) blockers.push('fixed-model lift requires sameFixedModel=true');
  if (baselinePassed === null || proofPassed === null || total === null) blockers.push('fixed-model lift requires baselinePassed, proofPassed, total');
  if (liftCount !== null && liftCount <= 0) blockers.push('proof arm does not beat baseline arm');
  if (!packageValid) blockers.push('proof feedback package is not valid');
  if (!repairBound) blockers.push('repair prompt is not digest-bound');
  const allowed = blockers.length === 0;
  return {
    allowed,
    verdict: allowed ? 'established' : 'not-established',
    sameFixedModel,
    feedbackDerived,
    baselinePassed,
    proofPassed,
    total,
    liftCount,
    liftPct: liftPct === null ? null : Number(liftPct.toFixed(3)),
    blockers,
  };
}

function claimBlockersForRequired(publicBenchmarks) {
  const byId = new Map(publicBenchmarks.map((entry) => [entry.benchmarkId, entry]));
  const blockers = [];
  for (const id of REQUIRED_PUBLIC_IDS) {
    const entry = byId.get(id);
    if (!entry) {
      blockers.push(`missing public benchmark result: ${id}`);
      continue;
    }
    blockers.push(...entry.blockers);
  }
  return blockers;
}

export function evaluateSotaParity(input = {}) {
  const now = String(input.now ?? new Date().toISOString());
  const freshnessDays = Number(input.freshnessDays ?? DEFAULT_FRESHNESS_DAYS);
  const sotaBaselines = asArray(input.baselineSnapshot?.baselines ?? input.sotaBaselines).filter(isObject);
  const baselineById = new Map(sotaBaselines.map((baseline) => [baseline.benchmarkId, baseline]));
  const publicBenchmarks = asArray(input.publicRuns).map((run) => {
    if (!isObject(run)) return classifyPublicRun(run, now, freshnessDays);
    const baseline = baselineById.get(run.benchmarkId);
    const hydratedRun = baseline
      ? {
          ...run,
          currentLeaderScore: finiteNumber(run.currentLeaderScore) ?? finiteNumber(baseline.currentLeaderScore),
          leaderboardUrl: run.leaderboardUrl ?? baseline.leaderboardUrl,
        }
      : run;
    return classifyPublicRun(hydratedRun, now, freshnessDays);
  });
  const fixedModelLift = evaluateFixedModelLift(input.localEvidence);
  const absoluteBlockers = claimBlockersForRequired(publicBenchmarks);
  const absolutePublicSota = {
    allowed: absoluteBlockers.length === 0,
    verdict: absoluteBlockers.length === 0 ? 'established' : 'not-established',
    blockers: absoluteBlockers,
    requiredBenchmarks: REQUIRED_PUBLIC_IDS,
  };
  const interfaceLift = {
    allowed: fixedModelLift.allowed || publicBenchmarks.some((entry) => entry.status === 'wins-current-leader'),
    verdict: fixedModelLift.allowed || publicBenchmarks.some((entry) => entry.status === 'wins-current-leader') ? 'established' : 'not-established',
    blockers: fixedModelLift.allowed ? [] : ['no fixed-model lift or winning public interface run supplied'],
  };
  const rawLeaderboardClaim = {
    allowed: false,
    verdict: 'not-established',
    blockers: [
      'Atomic local lift is tool-augmented evidence; raw leaderboard claims require official public benchmark submission artifacts.',
    ],
  };
  const claims = {
    fixedModelLift,
    interfaceLift,
    absolutePublicSota,
    rawLeaderboardClaim,
  };
  const nextRuns = absolutePublicSota.allowed
    ? []
    : REQUIRED_PUBLIC_IDS
        .filter((id) => !publicBenchmarks.some((entry) => entry.benchmarkId === id))
        .map((id) => {
          const target = baselineById.get(id);
          return target ? { benchmarkId: id, reason: 'missing public result', target } : { benchmarkId: id, reason: 'missing public result' };
        });
  return {
    ok: true,
    harnessId: HARNESS_ID,
    reportSha256: sha256Text(JSON.stringify({ publicBenchmarks, claims, sotaBaselines })),
    now,
    freshnessDays,
    publicBenchmarks,
    sotaBaselines,
    claims,
    benchmarkRegistry: PUBLIC_BENCHMARKS,
    nextRuns,
  };
}

export function fixture(kind) {
  if (kind === 'local-human-eval-lift') {
    return {
      fixedModelLift: {
        benchmarkId: 'human-eval-lift-v1',
        modelId: 'claude-3-5-haiku-fixed',
        baselinePassed: 140,
        proofPassed: 154,
        total: 164,
        sameFixedModel: true,
        feedbackDerived: true,
        packageValid: true,
        repairBound: true,
        evidenceUrl: 'docs/evidence/darwin-godel-humaneval-v1.md',
      },
    };
  }
  if (kind === 'complete-winning-public-runs') {
    return [
      {
        benchmarkId: 'swe-bench-verified',
        atomicScore: 96,
        currentLeaderScore: 95,
        leaderboardUrl: 'https://www.swebench.com/',
        artifactUrl: 'https://example.invalid/atomic/swe-bench-verified/run.json',
        evaluator: 'official-or-reproducible-harness',
        observedAt: '2026-06-15T00:00:00.000Z',
      },
      {
        benchmarkId: 'aider-polyglot',
        atomicScore: 91,
        currentLeaderScore: 90,
        leaderboardUrl: 'https://aider.chat/docs/leaderboards/',
        artifactUrl: 'https://example.invalid/atomic/aider-polyglot/run.json',
        evaluator: 'official-or-reproducible-harness',
        observedAt: '2026-06-15T00:00:00.000Z',
      },
    ];
  }
  if (kind === 'complete-losing-public-runs') {
    return [
      {
        benchmarkId: 'swe-bench-verified',
        atomicScore: 90,
        currentLeaderScore: 95,
        leaderboardUrl: 'https://www.swebench.com/',
        artifactUrl: 'https://example.invalid/atomic/swe-bench-verified/run.json',
        evaluator: 'official-or-reproducible-harness',
        observedAt: '2026-06-15T00:00:00.000Z',
      },
      {
        benchmarkId: 'aider-polyglot',
        atomicScore: 91,
        currentLeaderScore: 90,
        leaderboardUrl: 'https://aider.chat/docs/leaderboards/',
        artifactUrl: 'https://example.invalid/atomic/aider-polyglot/run.json',
        evaluator: 'official-or-reproducible-harness',
        observedAt: '2026-06-15T00:00:00.000Z',
      },
    ];
  }
  if (kind === 'input-template') {
    return {
      now: new Date().toISOString(),
      publicRuns: [
        {
          benchmarkId: 'swe-bench-verified',
          atomicScore: null,
          currentLeaderScore: null,
          leaderboardUrl: 'https://www.swebench.com/',
          artifactUrl: 'https://example.com/replace-with-public-run-artifact.json',
          evaluator: 'official-or-reproducible-harness',
          observedAt: new Date().toISOString(),
        },
      ],
      localEvidence: fixture('local-human-eval-lift'),
    };
  }
  throw new Error('unknown fixture ' + kind);
}

export function runCli(argv = [], stdinText = '') {
  const baselineIndex = argv.indexOf('--baseline-snapshot');
  const baselineSnapshot = baselineIndex >= 0 ? JSON.parse(fs.readFileSync(argv[baselineIndex + 1], 'utf8')) : undefined;
  if (argv.includes('--self-test')) {
    return evaluateSotaParity({ now: '2026-06-16T20:00:00.000Z', publicRuns: [], localEvidence: fixture('local-human-eval-lift'), baselineSnapshot });
  }
  if (argv.includes('--print-template')) {
    return fixture('input-template');
  }
  const payload = stdinText.trim() ? JSON.parse(stdinText) : fixture('input-template');
  return evaluateSotaParity({ ...payload, baselineSnapshot: payload.baselineSnapshot ?? baselineSnapshot });
}

if (import.meta.url === 'file://' + process.argv[1]) {
  let stdin = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { stdin += chunk; });
  process.stdin.on('end', () => {
    try {
      const result = runCli(process.argv.slice(2), stdin);
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(result.ok === false ? 1 : 0);
    } catch (error) {
      process.stderr.write(String(error?.stack || error) + '\n');
      process.exit(1);
    }
  });
}

#!/usr/bin/env node
/**
 * criticality.mjs — Arm A of the swarm's top-ranked proposal (self-organized-criticality lens):
 * a CALIBRATION-WITNESS order parameter on the engine's own action stream (the exec-ledger).
 *
 * THE IDEA (creative, falsifiable, not yet wired into the judge):
 * Strong/open-ended adaptive dynamics are hypothesized to coincide with a system self-tuning to
 * CRITICALITY — the edge of a phase transition where perturbations propagate scale-free. The weak
 * emergence we already have is static-stream novelty/anomaly COUNTING (O1/O5). Criticality is a
 * collective DYNAMICAL regime — categorically different. We measure three order parameters over the
 * time-ordered exec-ledger:
 *   sigma  = branching ratio  P(fail | prev fail) / P(fail | prev ok)   (1.0 = critical edge)
 *   tail   = avalanche-size distribution: power-law (scale-free) vs exponential (characteristic scale)
 *   xi     = correlation length: decay scale of the failure-failure autocorrelation
 *
 * HONESTY (pre-registered):
 *  - This script measures the AGENT-DRIVEN ledger. That sigma is the WEAK / mechanical regime
 *    (human+agent retry clustering). It is the CALIBRATION WITNESS that proves the machinery, NOT
 *    an emergence claim. The STRONG target (F5) is the AUTONOMOUS-authored subset self-tuning to
 *    criticality — and that subset is NOT COMPUTABLE today (exec-ledger rows carry no authoring
 *    origin). We report that gap honestly instead of faking the strong signal.
 *  - The swarm surfaced a magnitude discrepancy (sigma 1.31 @ failRate 0.52 vs 5.96 @ 0.17). We
 *    FREEZE ONE methodology here and report it, so the number is recomputable and not cherry-picked:
 *      FAIL label   = (exitCode !== 0) || (rolledBack === true)   [matches exec-risk/exec-guard]
 *      population   = ledger rows with a numeric exitCode, in append (time) order
 *      sigma        = P(fail|prevfail)/P(fail|prevok) over consecutive pairs
 *    Both prior numbers differed only by label/population choice; this freezes both.
 *  - Goodhart vector (named): a fixed-count retry loop manufactures supercritical sigma with a
 *    CHARACTERISTIC scale -> it fails the power-law tail test. That is why the tail test exists.
 *
 * CPU-only, deterministic (seeded LCG shuffle). Recompute: node criticality.mjs <repoRoot>
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHUFFLES = 200;
const SEED = 0x9e3779b9;

function loadSeq(repoRoot) {
  const file = path.join(repoRoot, '.atomic', 'exec-ledger.jsonl');
  if (!fs.existsSync(file)) return { rows: [], seq: [] };
  const rows = [];
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = l.trim(); if (!t) continue;
    try { const o = JSON.parse(t); if (o && typeof o.exitCode === 'number') rows.push(o); } catch { /* skip */ }
  }
  rows.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0)); // append/time order
  const seq = rows.map((r) => ((r.exitCode !== 0 || r.rolledBack === true) ? 1 : 0));
  return { rows, seq };
}

// branching ratio sigma over consecutive pairs.
function sigma(seq) {
  let ff = 0; let nf = 0; let fo = 0; let no = 0;
  for (let i = 1; i < seq.length; i += 1) {
    const prev = seq[i - 1]; const cur = seq[i];
    if (prev === 1) { nf += 1; if (cur === 1) ff += 1; } else { no += 1; if (cur === 1) fo += 1; }
  }
  const pFF = nf ? ff / nf : 0; const pFO = no ? fo / no : 0;
  return pFO > 0 ? pFF / pFO : NaN;
}

// seeded LCG -> Fisher-Yates shuffle (deterministic).
function makeRng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; }; }
function shuffled(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

function shuffleNull(seq) {
  const rng = makeRng(SEED);
  const vals = [];
  for (let k = 0; k < SHUFFLES; k += 1) { const s = sigma(shuffled(seq, rng)); if (Number.isFinite(s)) vals.push(s); }
  vals.sort((a, b) => a - b);
  const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const lo = vals[Math.floor(vals.length * 0.025)]; const hi = vals[Math.floor(vals.length * 0.975)];
  return { mean: Number(mean.toFixed(4)), ci: [Number((lo ?? NaN).toFixed(4)), Number((hi ?? NaN).toFixed(4))], n: vals.length };
}

// avalanche sizes = maximal runs of consecutive failures.
function avalanches(seq) {
  const sizes = []; let run = 0;
  for (const x of seq) { if (x === 1) run += 1; else if (run > 0) { sizes.push(run); run = 0; } }
  if (run > 0) sizes.push(run);
  return sizes;
}

// zeta(a) for a>1 via partial sum + Euler-Maclaurin tail.
function zeta(a, N = 10000) { let s = 0; for (let k = 1; k <= N; k += 1) s += k ** -a; s += (N ** (1 - a)) / (a - 1); return s; }

// power-law vs exponential (geometric) on avalanche sizes (smin=1). Returns LLR (>0 => power-law preferred).
function tailTest(sizes) {
  const n = sizes.length;
  if (n < 10) return { n, verdict: 'underpowered', llr: null, alpha: null, note: 'too few avalanches (<10) for a tail verdict' };
  const mean = sizes.reduce((a, b) => a + b, 0) / n;
  // geometric MLE: q = 1/mean (sizes>=1). logL = sum[(s-1)ln(1-q)+ln q]
  const q = 1 / mean; const logExp = sizes.reduce((a, s) => a + (s - 1) * Math.log(1 - q) + Math.log(q), 0);
  // discrete power-law MLE (smin=1): alpha = 1 + n / sum(ln(s/0.5))
  const sumLn = sizes.reduce((a, s) => a + Math.log(s / 0.5), 0);
  const alpha = 1 + n / sumLn; const Z = zeta(alpha);
  const logPl = sizes.reduce((a, s) => a - alpha * Math.log(s) - Math.log(Z), 0);
  const llr = logPl - logExp;
  return { n, alpha: Number(alpha.toFixed(3)), llr: Number(llr.toFixed(2)), verdict: llr > 0 ? 'power-law preferred (scale-free)' : 'exponential preferred (characteristic scale)' };
}

// correlation length xi: fit acf(lag) ~ exp(-lag/xi) by linear regression of ln(acf) on lag.
function correlationLength(seq) {
  const n = seq.length; if (n < 50) return { xi: null, note: 'too short' };
  const mean = seq.reduce((a, b) => a + b, 0) / n;
  const varr = seq.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n; if (varr === 0) return { xi: null, note: 'no variance' };
  const maxLag = Math.min(50, Math.floor(n / 10));
  const xs = []; const ys = [];
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let c = 0; for (let i = 0; i + lag < n; i += 1) c += (seq[i] - mean) * (seq[i + lag] - mean);
    const acf = c / ((n - lag) * varr);
    if (acf > 0.01) { xs.push(lag); ys.push(Math.log(acf)); }
  }
  if (xs.length < 3) return { xi: null, note: 'acf decays too fast to fit (xi < ~1; short-range)' };
  const m = xs.length; const mx = xs.reduce((a, b) => a + b, 0) / m; const my = ys.reduce((a, b) => a + b, 0) / m;
  let sxy = 0; let sxx = 0; for (let i = 0; i < m; i += 1) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const slope = sxy / sxx; const xi = slope < 0 ? -1 / slope : null;
  return { xi: xi === null ? null : Number(xi.toFixed(2)), lagsFit: m };
}

export function evaluateCriticality(repoRoot) {
  const { rows, seq } = loadSeq(repoRoot);
  if (seq.length < 100) return { error: 'too few exec rows', rows: seq.length };
  const failRate = Number((seq.reduce((a, b) => a + b, 0) / seq.length).toFixed(4));
  const s = Number(sigma(seq).toFixed(4));
  const nul = shuffleNull(seq);
  const supercritical = Number.isFinite(s) && s > nul.ci[1];
  const av = avalanches(seq);
  const tail = tailTest(av);
  const xi = correlationLength(seq);

  // The STRONG target needs the autonomous-authored exec subset. It does not exist:
  const hasOrigin = rows.some((r) => typeof r.origin === 'string' || typeof r.authoredBy === 'string');

  return {
    population: seq.length,
    failLabel: '(exitCode!==0)||rolledBack',
    failRate,
    sigma: s,
    shuffleNull: nul,
    supercritical,
    calibrationWitness: supercritical
      ? `PASS: sigma=${s} is supercritical, OUTSIDE the shuffle-null 95% CI [${nul.ci[0]}, ${nul.ci[1]}] -> the order-parameter machinery is sound on real data.`
      : `FAIL clause(1): sigma=${s} is NOT outside the shuffle-null CI [${nul.ci[0]}, ${nul.ci[1]}] -> machinery/signal does not reproduce.`,
    avalanches: { count: av.length, maxSize: av.length ? Math.max(...av) : 0, tail },
    correlationLength: xi,
    autonomousSubset: {
      computable: hasOrigin,
      note: hasOrigin
        ? 'origin field present — autonomous-subset sigma can be computed (proceed to Arm B / F5)'
        : 'NOT COMPUTABLE: exec-ledger rows carry NO authoring-origin field. The STRONG signal (autonomous subset self-tuning to criticality) cannot be measured. This is the named instrumentation gap — F5 correctly cannot fire. Add origin tagging at the ledger write chokepoint (Arm B, gated via expand_self) before any strong claim.',
    },
    honestVerdict:
      'Arm A calibration only. The measured sigma is the WEAK/mechanical regime (agent + retry clustering), NOT an emergence claim. '
      + (tail.verdict && String(tail.verdict).startsWith('exponential')
        ? 'Avalanche tail is EXPONENTIAL (characteristic scale) — consistent with mechanical retry/burst clustering, NOT scale-free self-organized criticality. '
        : (tail.verdict === 'power-law preferred (scale-free)'
          ? 'Avalanche tail prefers power-law — interesting, but on the AGENT-driven stream this is still weak/mechanical and must be re-checked on the autonomous subset (which does not exist yet). '
          : 'Avalanche tail underpowered. '))
      + 'Strong F5 emergence is BLOCKED-PENDING-INSTRUMENTATION (no autonomous-exec subset). emergence-report must stay SILENT. No candidate.',
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = process.argv[2] || process.env.ATOMIC_EDIT_REPO_ROOT || process.cwd();
  console.log(JSON.stringify(evaluateCriticality(repoRoot), null, 2));
}

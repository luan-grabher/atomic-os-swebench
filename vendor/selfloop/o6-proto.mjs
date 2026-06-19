#!/usr/bin/env node
// o6-proto.mjs — LOCAL prototype to verify the O6 criticality math + synthetic fixtures BEFORE
// porting into the gated emergence-observatory.mjs / emergence-report.mjs / proof via expand_self.
// Confirms: retry-loop (fixed-size bursts) is EXPONENTIAL -> F5 SILENT; heavy-tailed avalanches are
// POWER-LAW + supercritical + sustained -> F5 FIRES; empty subset -> SILENT.

export function branchingRatio(seq) {
  let ff = 0, nf = 0, fo = 0, no = 0;
  for (let i = 1; i < seq.length; i += 1) {
    if (seq[i - 1] === 1) { nf += 1; if (seq[i] === 1) ff += 1; }
    else { no += 1; if (seq[i] === 1) fo += 1; }
  }
  const pFF = nf ? ff / nf : 0, pFO = no ? fo / no : 0;
  return pFO > 0 ? pFF / pFO : NaN;
}
export function sigmaShuffleNull(seq, shuffles = 200, seed = 0x9e3779b9) {
  let s = seed >>> 0; const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
  const vals = [];
  for (let k = 0; k < shuffles; k += 1) {
    const a = seq.slice();
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    const v = branchingRatio(a); if (Number.isFinite(v)) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN;
  return { mean, ciLow: vals[Math.floor(vals.length * 0.025)] ?? NaN, ciHigh: vals[Math.floor(vals.length * 0.975)] ?? NaN, n: vals.length };
}
export function avalancheSizes(seq) {
  const sizes = []; let run = 0;
  for (const x of seq) { if (x === 1) run += 1; else if (run > 0) { sizes.push(run); run = 0; } }
  if (run > 0) sizes.push(run);
  return sizes;
}
function zetaApprox(a, N = 10000) { let s = 0; for (let k = 1; k <= N; k += 1) s += k ** -a; return s + (N ** (1 - a)) / (a - 1); }
export function avalancheTailLLR(sizes) {
  const n = sizes.length;
  if (n < 10) return { n, llr: null, alpha: null, prefersPowerLaw: false, note: 'underpowered (<10)' };
  const mean = sizes.reduce((a, b) => a + b, 0) / n;
  const q = 1 / mean; const logExp = sizes.reduce((a, x) => a + (x - 1) * Math.log(1 - q) + Math.log(q), 0);
  const sumLn = sizes.reduce((a, x) => a + Math.log(x / 0.5), 0);
  const alpha = 1 + n / sumLn; const Z = zetaApprox(alpha);
  const logPl = sizes.reduce((a, x) => a - alpha * Math.log(x) - Math.log(Z), 0);
  const llr = logPl - logExp;
  return { n, alpha, llr, prefersPowerLaw: llr > 0 };
}
export const O6_FROZEN = { nMin: 200, sigmaSupercritical: 1.15, windows: 3, windowMin: 50 };
export function criticalitySignal(seq, frozen = O6_FROZEN) {
  const n = seq.length;
  const sigma = branchingRatio(seq);
  const nul = sigmaShuffleNull(seq);
  const tail = avalancheTailLLR(avalancheSizes(seq));
  let windowsOk = false;
  if (n >= frozen.windows * frozen.windowMin) {
    const w = Math.floor(n / frozen.windows); windowsOk = true;
    for (let i = 0; i < frozen.windows; i += 1) {
      const sub = seq.slice(i * w, (i + 1) * w);
      const sv = branchingRatio(sub);
      if (!(Number.isFinite(sv) && sv >= frozen.sigmaSupercritical)) { windowsOk = false; break; }
    }
  }
  const powered = n >= frozen.nMin;
  const supercritical = Number.isFinite(sigma) && sigma >= frozen.sigmaSupercritical && Number.isFinite(nul.ciHigh) && sigma > nul.ciHigh;
  const critical = powered && supercritical && tail.prefersPowerLaw && windowsOk;
  return { n, sigma, shuffleNull: nul, tail, powered, supercritical, windowsOk, critical };
}

// ── synthetic fixtures ──
const SEP = 5; // ok-run separator: long ok stretches keep P(fail|prevok) low -> sigma can exceed 1.
const pushOks = (arr, k) => { for (let i = 0; i < k; i += 1) arr.push(0); };
// CRITICAL: heavy-tailed avalanche sizes (power-law-ish), separated by ok-runs. Repeated to fill 3 windows.
function criticalStream() {
  const block = [];
  const sizes = [];
  for (let i = 0; i < 40; i += 1) sizes.push(1);
  for (let i = 0; i < 20; i += 1) sizes.push(2);
  for (let i = 0; i < 10; i += 1) sizes.push(4);
  for (let i = 0; i < 5; i += 1) sizes.push(8);
  for (let i = 0; i < 3; i += 1) sizes.push(16);
  sizes.push(32); sizes.push(48);
  for (const s of sizes) { for (let k = 0; k < s; k += 1) block.push(1); pushOks(block, SEP); }
  return block.concat(block).concat(block); // 3x for sustained windows
}
// RETRY-LOOP: fixed-size bursts (characteristic scale = exponential tail), separated by ok-runs.
function retryStream() {
  const block = [];
  for (let i = 0; i < 80; i += 1) { block.push(1, 1, 1, 1); pushOks(block, SEP); }
  return block;
}

const crit = criticalitySignal(criticalStream());
const retry = criticalitySignal(retryStream());
const empty = criticalitySignal([]);
console.log('CRITICAL  :', JSON.stringify({ n: crit.n, sigma: Number(crit.sigma.toFixed(3)), nullHi: Number(crit.shuffleNull.ciHigh.toFixed(3)), llr: Number(crit.tail.llr.toFixed(2)), powerLaw: crit.tail.prefersPowerLaw, windowsOk: crit.windowsOk, supercritical: crit.supercritical, FIRES: crit.critical }));
console.log('RETRY-LOOP:', JSON.stringify({ n: retry.n, sigma: Number(retry.sigma.toFixed(3)), nullHi: Number(retry.shuffleNull.ciHigh.toFixed(3)), llr: Number(retry.tail.llr.toFixed(2)), powerLaw: retry.tail.prefersPowerLaw, windowsOk: retry.windowsOk, supercritical: retry.supercritical, FIRES: retry.critical }));
console.log('EMPTY     :', JSON.stringify({ n: empty.n, FIRES: empty.critical }));
console.log('\nEXPECT: CRITICAL FIRES=true, RETRY-LOOP FIRES=false, EMPTY FIRES=false');
const pass = crit.critical === true && retry.critical === false && empty.critical === false;
console.log(pass ? 'PROTO PASS — math is sound, safe to port via expand_self' : 'PROTO FAIL — fix before porting');
process.exit(pass ? 0 : 1);

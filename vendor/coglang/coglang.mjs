#!/usr/bin/env node
/**
 * coglang.mjs — CogLang v0.2: a small REAL language whose first-class types are COGNITIVE.
 *
 * HONEST SCOPE: the verified SUBSTRATE's increments. THREE of the eight cognitive primitives
 * now exist as genuine language features with real semantics:
 *   - uncertainty<T>: every number carries a confidence in [0,1]; arithmetic PROPAGATES
 *     confidence multiplicatively (a derived quantity is never more certain than its inputs).
 *   - goal: a declared objective MET only when its evidence clears a confidence floor.
 *   - self: the program reads its OWN live state (self.goals / self.met / self.confidence) —
 *     genuine self-reference, the "self-model" primitive, computed from the running program.
 * It is NOT AGI and makes NO cognition claim. It proves the CogLang path is real, runnable,
 * and buildable under Atomic's verification. Remaining primitives (counterfactual, explore,
 * memory, attention, abstract) are future increments — named honestly, not faked.
 *
 * Grammar (v0.2):
 *   program := stmt*
 *   stmt    := 'let' IDENT '=' expr | 'print' expr | 'goal' STRING 'when' expr
 *   expr    := add
 *   add     := mul (('+'|'-') mul)*
 *   mul     := tilde (('*'|'/') tilde)*
 *   tilde   := primary ('~' primary)?            # value ~ confidence -> uncertainty
 *   primary := NUMBER | STRING | 'true' | 'false' | IDENT | 'self' '.' IDENT | '(' expr ')'
 */

export const GOAL_CONFIDENCE_FLOOR = 0.7;

function lex(src) {
  const toks = [];
  const kw = new Set(['let', 'print', 'goal', 'when', 'true', 'false', 'self', 'counterfactual', 'in']);
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '#') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') { i += 1; continue; }
    if (ch === '"') {
      let j = i + 1; let s = '';
      while (j < src.length && src[j] !== '"') { s += src[j]; j += 1; }
      if (src[j] !== '"') throw new Error('coglang: unterminated string');
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i; let s = '';
      while (j < src.length && /[0-9.]/.test(src[j])) { s += src[j]; j += 1; }
      toks.push({ t: 'num', v: parseFloat(s) }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i; let s = '';
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) { s += src[j]; j += 1; }
      toks.push(kw.has(s) ? { t: s } : { t: 'ident', v: s }); i = j; continue;
    }
    if ('+-*/~=().'.includes(ch)) { toks.push({ t: ch }); i += 1; continue; }
    throw new Error('coglang: unexpected char ' + JSON.stringify(ch));
  }
  toks.push({ t: 'eof' });
  return toks;
}

function parse(toks) {
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expect = (t) => { const k = next(); if (k.t !== t) throw new Error(`coglang: expected ${t}, got ${k.t}`); return k; };
  function program() { const out = []; while (peek().t !== 'eof') out.push(stmt()); return out; }
  function stmt() {
    const k = peek();
    if (k.t === 'let') { next(); const name = expect('ident').v; expect('='); return { k: 'let', name, expr: expr() }; }
    if (k.t === 'print') { next(); return { k: 'print', expr: expr() }; }
    if (k.t === 'goal') { next(); const name = expect('str').v; expect('when'); return { k: 'goal', name, expr: expr() }; }
    throw new Error('coglang: unexpected statement ' + k.t);
  }
  function expr() {
    if (peek().t === 'counterfactual') {
      next();
      const name = expect('ident').v; expect('=');
      const val = expr(); expect('in'); const body = expr();
      return { k: 'cf', name, val, body };
    }
    return add();
  }
  function add() { let l = mul(); while (peek().t === '+' || peek().t === '-') { const op = next().t; l = { k: 'bin', op, l, r: mul() }; } return l; }
  function mul() { let l = tilde(); while (peek().t === '*' || peek().t === '/') { const op = next().t; l = { k: 'bin', op, l, r: tilde() }; } return l; }
  function tilde() { const l = primary(); if (peek().t === '~') { next(); return { k: 'unc', value: l, conf: primary() }; } return l; }
  function primary() {
    const k = next();
    if (k.t === 'num') return { k: 'num', v: k.v };
    if (k.t === 'str') return { k: 'str', v: k.v };
    if (k.t === 'true') return { k: 'num', v: 1 };
    if (k.t === 'false') return { k: 'num', v: 0 };
    if (k.t === 'ident') return { k: 'var', name: k.v };
    if (k.t === 'self') { expect('.'); const field = expect('ident').v; return { k: 'selfref', field }; }
    if (k.t === '(') { const e = expr(); expect(')'); return e; }
    throw new Error('coglang: unexpected token in expression: ' + k.t);
  }
  return program();
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const U = (value, conf = 1) => ({ value, conf: clamp01(conf) });
const round = (x) => Math.round(x * 1e6) / 1e6;

// `state` = { env, goals } — the program's live self. selfref reflects it AT EVALUATION TIME.
function evalNode(n, state) {
  const env = state.env;
  switch (n.k) {
    case 'num': return U(n.v, 1);
    case 'str': return { str: n.v };
    case 'var': { if (!(n.name in env)) throw new Error('coglang: undefined variable ' + n.name); return env[n.name]; }
    case 'unc': { const v = evalNode(n.value, state); const c = evalNode(n.conf, state); return U(v.value, c.value); }
    case 'bin': {
      const a = evalNode(n.l, state); const b = evalNode(n.r, state);
      const conf = (a.conf ?? 1) * (b.conf ?? 1); // confidence propagates multiplicatively
      let v;
      if (n.op === '+') v = a.value + b.value;
      else if (n.op === '-') v = a.value - b.value;
      else if (n.op === '*') v = a.value * b.value;
      else v = a.value / b.value;
      return U(v, conf);
    }
    case 'selfref': {
      // self-model: the program reading its own live state.
      if (n.field === 'goals') return U(state.goals.length, 1);
      if (n.field === 'met') return U(state.goals.filter((g) => g.met).length, 1);
      if (n.field === 'confidence') {
        const confs = Object.values(env).filter((x) => x && typeof x === 'object' && x.conf !== undefined).map((x) => x.conf);
        return U(confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 1, 1);
      }
      throw new Error('coglang: unknown self field ' + n.field + ' (known: goals, met, confidence)');
    }
    case 'cf': {
      // counterfactual: evaluate `body` under a HYPOTHETICAL override of `name`, in a sandbox
      // env, then discard it — the real program state is NEVER mutated. Genuine "what if X were Y".
      const hyp = evalNode(n.val, state);
      const sandbox = { env: { ...state.env, [n.name]: hyp }, goals: state.goals };
      return evalNode(n.body, sandbox);
    }
    default: throw new Error('coglang: cannot evaluate node ' + n.k);
  }
}

function fmt(val) {
  if (val.str !== undefined) return JSON.stringify(val.str);
  if (val.conf >= 0.9999) return String(round(val.value));
  return `${round(val.value)} ~ ${val.conf.toFixed(3)}`;
}

/** Run a CogLang program. Pure: returns { output, goals, env } — no side effects. */
export function run(src) {
  const out = []; const state = { env: {}, goals: [] };
  for (const s of parse(lex(src))) {
    if (s.k === 'let') { state.env[s.name] = evalNode(s.expr, state); }
    else if (s.k === 'print') { out.push(fmt(evalNode(s.expr, state))); }
    else if (s.k === 'goal') {
      const v = evalNode(s.expr, state);
      const met = v.value !== 0 && (v.conf ?? 1) >= GOAL_CONFIDENCE_FLOOR;
      state.goals.push({ name: s.name, met, confidence: v.conf ?? 1 });
      out.push(`goal ${JSON.stringify(s.name)}: ${met ? 'MET' : 'unmet'} (confidence ${(v.conf ?? 1).toFixed(3)}, floor ${GOAL_CONFIDENCE_FLOOR})`);
    }
  }
  return { output: out.join('\n'), goals: state.goals, env: state.env };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('node:fs');
  const file = process.argv[2];
  if (!file) { console.error('usage: coglang.mjs <file.cog>'); process.exit(2); }
  console.log(run(fs.readFileSync(file, 'utf8')).output);
}

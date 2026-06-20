/**
 * gates/py-call-arity.ts — PY-CALL-ARITY: sound unknown-keyword-argument detector.
 *
 * Catches a decidable SWE-bench Python crash class: calling an in-file function with a keyword the
 * function does not accept (TypeError: unexpected keyword argument) — e.g. sklearn-10297 / sympy-21171
 * shape. DECIDABLE iff the callee resolves to exactly ONE top-level `def` in the same file that has no
 * `**kwargs` sink — then a kwarg whose name is not a parameter is unambiguously a runtime TypeError.
 *
 * SOUNDNESS over completeness (L06 — a write-gate that false-positives is worse than none). It flags ONLY:
 *   - callee is a BARE identifier `f(...)` (not `obj.f(...)` — receiver type is unknown), AND
 *   - exactly ONE top-level (non-class, non-decorated) `def f` exists in the file, AND
 *   - that def has NO `**kwargs` param, AND
 *   - the name is NOT also imported (no import shadowing ambiguity), AND
 *   - a top-level kwarg `k=...` of the call has `k` not among the def's parameter names.
 * Everything else (methods, decorated/overloaded defs, **kwargs sinks, *-unpacked calls, imported names)
 * is a named MISS, never a false alarm.
 *
 * NAMED false-negatives: over-arity (too many positionals — defaults/self make it subtler, deferred);
 * method-call arity; cross-file/imported callees; decorator-altered signatures. Engine: tree-sitter-python.
 */
import type { GateContext, GateModule, GateRed, GateResult } from './contract.js';
import { astNodes } from '../native-bridge.js';
import { langOf } from './perception.js';

const PYTHON_RE = /\.py$/;

interface N { type: string; text: string; byteStart: number; byteEnd: number; line: number; column: number; name?: string; }

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseParams(paramsText: string): { names: Set<string>; hasKwargs: boolean } {
  const inner = paramsText.replace(/^\s*\(/, '').replace(/\)\s*$/, '');
  const names = new Set<string>();
  let hasKwargs = false;
  for (let p of splitTopLevel(inner)) {
    p = p.trim();
    if (!p) continue;
    if (p.startsWith('**')) { hasKwargs = true; continue; }
    if (p.startsWith('*')) continue; // *args or bare * kw-only marker — not a named positional
    const m = /^([A-Za-z_]\w*)/.exec(p);
    if (m) names.add(m[1]);
  }
  return { names, hasKwargs };
}

const pyCallArityGate: GateModule = {
  name: 'py-call-arity',
  kind: 'static',

  appliesTo(rel: string): boolean {
    return PYTHON_RE.test(rel) && langOf(rel) === 'python';
  },

  async run(ctx: GateContext): Promise<GateResult> {
    const reds: GateRed[] = [];
    const files = ctx.changedFiles.length > 0 ? ctx.changedFiles : Array.from(ctx.overlay.keys());
    let applicable = false;

    for (const rel of files) {
      if (!this.appliesTo(rel)) continue;
      applicable = true;
      const content = ctx.overlay.get(rel) ?? ctx.readFile(rel);
      if (!content) continue;

      const nodes = (await astNodes(content, 'python')) as N[] | null;
      if (!nodes || nodes.length === 0) {
        return { gate: this.name, green: false, reds: [], unjudged: true, unjudgedReason: 'tree-sitter-python grammar not available' };
      }

      const classRanges = nodes.filter((n) => n.type === 'class_definition').map((c) => [c.byteStart, c.byteEnd] as [number, number]);
      const inClass = (pos: number) => classRanges.some(([a, b]) => a <= pos && pos < b);
      const paramsNodes = nodes.filter((n) => n.type === 'parameters');
      const funcDefs = nodes.filter((n) => n.type === 'function_definition');

      // imported names (any import of `x` makes a bare `x(...)` ambiguous → skip)
      const imported = new Set<string>();
      for (const n of nodes) {
        if (n.type === 'import_statement' || n.type === 'import_from_statement') {
          for (const m of n.text.matchAll(/(?:import|,|\bas)\s+([A-Za-z_]\w*)/g)) imported.add(m[1]);
        }
      }

      // index top-level (non-class, non-decorated) defs by name; keep only unambiguous (exactly 1)
      const byName = new Map<string, { names: Set<string>; hasKwargs: boolean } | null>();
      const lines = content.split('\n');
      for (const def of funcDefs) {
        const name = def.name;
        if (!name) continue;
        if (inClass(def.byteStart)) continue; // method — receiver/self unknown, skip
        // decorated? the immediately-preceding non-blank line starts with '@'
        let li = def.line - 2;
        while (li >= 0 && lines[li].trim() === '') li--;
        if (li >= 0 && lines[li].trim().startsWith('@')) continue;
        // the def's own parameters node = smallest-byteStart parameters within the def range
        const ps = paramsNodes
          .filter((p) => p.byteStart > def.byteStart && p.byteEnd <= def.byteEnd)
          .sort((a, b) => a.byteStart - b.byteStart)[0];
        if (!ps) continue;
        const parsed = parseParams(ps.text);
        byName.set(name, byName.has(name) ? null : parsed); // 2nd def with same name → null = ambiguous
      }

      // a call is the SMALLEST call node containing each keyword_argument (handles nesting)
      const calls = nodes.filter((n) => n.type === 'call');
      const kwargs = nodes.filter((n) => n.type === 'keyword_argument');
      for (const kw of kwargs) {
        const enclosing = calls
          .filter((c) => c.byteStart <= kw.byteStart && kw.byteEnd <= c.byteEnd)
          .sort((a, b) => (a.byteEnd - a.byteStart) - (b.byteEnd - b.byteStart))[0]; // SMALLEST = the direct call
        if (!enclosing) continue;
        const calleeMatch = /^([A-Za-z_]\w*)\s*\(/.exec(enclosing.text); // BARE identifier callee only
        if (!calleeMatch) continue;
        const callee = calleeMatch[1];
        if (imported.has(callee)) continue; // import shadowing → ambiguous
        const def = byName.get(callee);
        if (!def) continue; // unknown, ambiguous, or **kwargs-unresolved
        if (def.hasKwargs) continue; // accepts any keyword
        const kwName = /^([A-Za-z_]\w*)\s*=(?!=)/.exec(kw.text)?.[1];
        if (!kwName) continue;
        if (!def.names.has(kwName)) {
          reds.push({
            file: rel,
            locus: `L${kw.line}:${kw.column}`,
            fact: `call \`${callee}(…)\` passes unknown keyword \`${kwName}\` — \`def ${callee}\` has no such parameter and no **kwargs (TypeError at runtime)`,
          });
        }
      }
    }

    return {
      gate: this.name,
      green: reds.length === 0,
      reds,
      note: reds.length > 0 ? `${reds.length} unknown-keyword call(s)` : 'no unknown-keyword calls',
      notApplicable: !applicable,
    };
  },
};

export default pyCallArityGate;

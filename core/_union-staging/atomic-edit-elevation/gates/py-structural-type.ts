/**
 * gates/py-structural-type.ts — PY-STRUCTURAL-TYPE (scope A: missing protocol dunder).
 *
 * Catches a decidable TypeError class (sklearn-13439 shape): a builtin protocol op applied to an instance
 * of an in-repo class that lacks the required dunder — `len(x)` with no `__len__`, `x[k]` with no
 * `__getitem__`.
 *
 * SOUNDNESS over completeness (L06). It flags ONLY when ALL hold:
 *   - `x = C(...)` assigns x DIRECTLY from an in-repo class C (a class_definition in this file), AND
 *   - C has NO base classes (header `class C:` or `class C(object):`) — so no dunder can be INHERITED
 *     via an unresolved MRO, AND
 *   - C's body defines NO `__len__` (for len) / `__getitem__` (for subscript) — methods are OVER-collected
 *     (any def name inside C, incl. nested) so we only ever UNDER-flag, never falsely flag, AND
 *   - x is not reassigned before the op, same scope.
 * Subclasses, indirect/aliased instances, dynamically-set dunders, `__getattr__` fallbacks → named MISSES,
 * never false alarms. Engine: tree-sitter-python.
 */
import type { GateContext, GateModule, GateRed, GateResult } from './contract.js';
import { astNodes } from '../native-bridge.js';
import { langOf } from './perception.js';

const PYTHON_RE = /\.py$/;
interface N { type: string; text: string; byteStart: number; byteEnd: number; line: number; column: number; name?: string; }

const pyStructuralTypeGate: GateModule = {
  name: 'py-structural-type',
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

      const funcs = nodes.filter((n) => n.type === 'function_definition');
      const classes = nodes.filter((n) => n.type === 'class_definition');
      const assigns = nodes.filter((n) => n.type === 'assignment');
      const calls = nodes.filter((n) => n.type === 'call');
      const subs = nodes.filter((n) => n.type === 'subscript');

      // qualifying in-repo classes: NO base classes; collect their (over-approximated) method names.
      const classDunders = new Map<string, Set<string>>();
      for (const c of classes) {
        const header = /^class\s+([A-Za-z_]\w*)\s*(\([^)]*\))?\s*:/.exec(c.text);
        if (!header || !header[1]) continue;
        const name = header[1];
        const bases = (header[2] ?? '').replace(/[()\s]/g, '');
        if (bases !== '' && bases !== 'object') continue; // has real bases → MRO unknown → skip
        const methods = new Set<string>();
        for (const f of funcs) {
          if (f.byteStart > c.byteStart && f.byteEnd <= c.byteEnd && f.name) methods.add(f.name);
        }
        classDunders.set(name, classDunders.has(name) ? new Set([...(classDunders.get(name) as Set<string>), ...methods, '__ambiguous__']) : methods);
      }

      const scopeOf = (pos: number): [number, number] => {
        let best: [number, number] = [0, content.length];
        let bestLen = Number.POSITIVE_INFINITY;
        for (const f of funcs) {
          if (f.byteStart <= pos && pos < f.byteEnd && f.byteEnd - f.byteStart < bestLen) { bestLen = f.byteEnd - f.byteStart; best = [f.byteStart, f.byteEnd]; }
        }
        return best;
      };

      // instances: x = C(...) for a qualifying class C
      for (const a of assigns) {
        const m = /^\s*([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*\(/.exec(a.text);
        if (!m) continue;
        const [, v, cls] = m;
        const dunders = classDunders.get(cls);
        if (!dunders || dunders.has('__ambiguous__')) continue; // not in-repo, ambiguous, or based class
        const [s0, s1] = scopeOf(a.byteStart);
        const reassigned = assigns.some((a2) => a2 !== a && a2.byteStart > a.byteStart && a2.byteStart >= s0 && a2.byteStart < s1 && new RegExp(`^\\s*${v}\\s*=`).test(a2.text));
        if (reassigned) continue;
        const inScopeAfter = (n: N) => n.byteStart > a.byteEnd && n.byteStart >= s0 && n.byteStart < s1;

        if (!dunders.has('__len__')) {
          const lenHit = calls.find((c) => inScopeAfter(c) && new RegExp(`^len\\s*\\(\\s*${v}\\s*\\)`).test(c.text));
          if (lenHit) reds.push({ file: rel, locus: `L${lenHit.line}:${lenHit.column}`, fact: `len(${v}) but \`${cls}\` (no bases) defines no __len__ (TypeError: object has no len())` });
        }
        if (!dunders.has('__getitem__')) {
          const subHit = subs.find((d) => inScopeAfter(d) && new RegExp(`^${v}\\s*\\[`).test(d.text));
          if (subHit) reds.push({ file: rel, locus: `L${subHit.line}:${subHit.column}`, fact: `${v}[…] but \`${cls}\` (no bases) defines no __getitem__ (TypeError: object is not subscriptable)` });
        }
      }
    }

    return {
      gate: this.name,
      green: reds.length === 0,
      reds,
      note: reds.length > 0 ? `${reds.length} missing-dunder protocol op(s)` : 'no missing-dunder protocol ops',
      notApplicable: !applicable,
    };
  },
};

export default pyStructuralTypeGate;

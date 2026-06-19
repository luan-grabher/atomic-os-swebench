/**
 * gates/py-strict-null.ts — PY-STRICT-NULL: a SOUND, conservative None-deref guard.
 *
 * Prevents the canonical SWE-bench Python crash (django-15498):
 *     matches = re.match(pattern, text)   # re.match -> Optional[Match]
 *     return matches[1]                   # AttributeError/TypeError if matches is None
 *
 * SOUNDNESS over completeness (the L06 lesson: a write-gate that false-positives is worse than none).
 * It flags ONLY the unambiguous case: a variable assigned DIRECTLY from `re.match` / `re.search` /
 * `re.fullmatch` (receiver is literally the `re` module, which ALWAYS returns Optional[Match]), then
 * dereferenced (`v[...]` or `v.attr`) within the same scope with NO guard in between. Guards are
 * over-approximated (ANY if/assert/while/boolean/comparison mentioning `v` before the deref counts) and
 * any reassignment of `v` cancels the obligation — both bias toward GREEN, so a valid edit is never refused.
 *
 * NAMED false-negatives (honest, per PARADIGM-ELEVATION.md I.2.1.1 / H.4):
 *   - `<obj>.match(...)` on a non-`re` receiver (could be anything) — not flagged.
 *   - compiled-pattern `p = re.compile(...); p.match(...)` — not flagged (receiver is a var).
 *   - `dict.get(k)` Optional-deref — OUT (needs default-arg analysis); param-None / list-element-None — OUT.
 * These are MISSES, never false alarms. The engine: the universal tree-sitter-python AST (native-bridge).
 */
import type { GateContext, GateModule, GateRed, GateResult } from './contract.js';
import { astNodes } from '../native-bridge.js';
import { langOf } from './perception.js';

const PYTHON_RE = /\.py$/;
// `v = re.match(...)` / `re.search(...)` / `re.fullmatch(...)` — receiver literally `re`.
const RE_OPTIONAL_ASSIGN = /^\s*([A-Za-z_]\w*)\s*=\s*re\.(?:match|search|fullmatch)\s*\(/;

interface N { type: string; text: string; byteStart: number; byteEnd: number; line: number; column: number; }

const pyStrictNullGate: GateModule = {
  name: 'py-strict-null',
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
      const assigns = nodes.filter((n) => n.type === 'assignment');
      const derefs = nodes.filter((n) => n.type === 'subscript' || n.type === 'attribute');
      const guards = nodes.filter((n) =>
        n.type === 'if_statement' || n.type === 'assert_statement' || n.type === 'while_statement' ||
        n.type === 'conditional_expression' || n.type === 'comparison_operator' || n.type === 'boolean_operator');

      // smallest enclosing function range, else module [0, len]
      const scopeOf = (pos: number): [number, number] => {
        let best: [number, number] = [0, content.length];
        let bestLen = Number.POSITIVE_INFINITY;
        for (const f of funcs) {
          if (f.byteStart <= pos && pos < f.byteEnd && f.byteEnd - f.byteStart < bestLen) {
            bestLen = f.byteEnd - f.byteStart;
            best = [f.byteStart, f.byteEnd];
          }
        }
        return best;
      };
      const mentions = (v: string, txt: string): boolean => new RegExp(`(?:^|[^\\w.])${v}(?![\\w])`).test(txt);
      const isObjOf = (v: string, txt: string): boolean => new RegExp(`^${v}\\s*[\\[.]`).test(txt);

      for (const a of assigns) {
        const m = RE_OPTIONAL_ASSIGN.exec(a.text);
        if (!m) continue;
        const v = m[1];
        const [s0, s1] = scopeOf(a.byteStart);

        const vDerefs = derefs
          .filter((d) => d.byteStart >= a.byteEnd && d.byteStart >= s0 && d.byteStart < s1 && isObjOf(v, d.text))
          .sort((x, y) => x.byteStart - y.byteStart);
        if (vDerefs.length === 0) continue;
        const firstDeref = vDerefs[0];

        // reassignment of v before the deref → no longer the Optional (sound skip)
        const reassigned = assigns.some((a2) =>
          a2 !== a && a2.byteStart > a.byteStart && a2.byteStart < firstDeref.byteStart &&
          a2.byteStart >= s0 && a2.byteStart < s1 && new RegExp(`^\\s*${v}\\s*=`).test(a2.text));
        if (reassigned) continue;

        // ANY guard mentioning v before the deref → guarded (over-approximate → never a false positive)
        const guarded = guards.some((g) =>
          g.byteStart >= a.byteEnd && g.byteStart <= firstDeref.byteStart &&
          g.byteStart >= s0 && g.byteStart < s1 && mentions(v, g.text));
        if (guarded) continue;

        reds.push({
          file: rel,
          locus: `L${firstDeref.line}:${firstDeref.column}`,
          fact: `unguarded deref of \`${v}\` (assigned from re.match/search/fullmatch → Optional[Match]); guard with \`if ${v} is None: ...\` / \`if ${v}:\` before \`${firstDeref.text.slice(0, 48)}\``,
        });
      }
    }

    return {
      gate: this.name,
      green: reds.length === 0,
      reds,
      note: reds.length > 0 ? `${reds.length} unguarded re-Optional deref(s)` : 'no unguarded re-Optional deref',
      notApplicable: !applicable,
    };
  },
};

export default pyStrictNullGate;

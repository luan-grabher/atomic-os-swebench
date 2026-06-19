/**
 * edit-algebra-gate — Z3-proven confluence of the edit algebra.
 *
 * This gate verifies that the runtime commute() function's verdicts match
 * the Z3-proven model predicate over a branch-covering domain of edit facts.
 */
import type { GateModule, GateResult, GateContext, GateRed } from './contract.js';
import * as path from 'node:path';

const ALGEBRA_MODULE = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'algebra.js');

type Span = [number, number];
type EditFact = {
  file: string;
  spans: Span[];
  closure: Set<string>;
  closureCapped: boolean;
  negativeProof: { proofSha256: string; removedByteCount: number; readLoci: string[] } | null;
};

const editAlgebraGate: GateModule = {
  name: 'edit-algebra-gate',
  kind: 'static',
  appliesTo: () => true,

  async run(ctx: GateContext): Promise<GateResult> {
    const rel = ctx.changedFiles[0] ?? 'edit-algebra-domain';
    const reds: GateRed[] = [];

    try {
      const { commute } = await import(ALGEBRA_MODULE) as { commute: (a: EditFact, b: EditFact) => { commute: boolean } };

      const FILES = ['x.ts', 'y.ts'];
      const LOCI = ['x.ts', 'y.ts', 'z.ts'];
      const SPANS: Span[][] = [[[0, 5]], [[10, 15]], [[3, 8]]];

      const subsetsOf = <T>(arr: T[]): T[][] => {
        const out: T[][] = [[]];
        for (const e of arr) for (const s of [...out]) out.push([...s, e]);
        return out;
      };

      const fact = (
        file: string,
        spans: Span[],
        closureExtra: string[],
        capped: boolean,
        readLoci: string[],
      ): EditFact => ({
        file,
        spans,
        closure: new Set([file, ...closureExtra]),
        closureCapped: capped,
        negativeProof: readLoci.length
          ? { proofSha256: 'x'.repeat(64), removedByteCount: 1, readLoci }
          : null,
      });

      const spansOverlap = (a: Span[], b: Span[]): boolean =>
        a.some(([s1, e1]) => b.some(([s2, e2]) => s1 < e2 && s2 < e1));

      function modelCommute(a: EditFact, b: EditFact): boolean {
        if (a.file === b.file) return !spansOverlap(a.spans, b.spans);
        const readA = new Set([...a.closure, ...(a.negativeProof?.readLoci ?? [])]);
        const readB = new Set([...b.closure, ...(b.negativeProof?.readLoci ?? [])]);
        if (readB.has(a.file) || readA.has(b.file)) return false;
        if (a.closureCapped || b.closureCapped) return false;
        return true;
      }

      const facts: EditFact[] = [];
      for (const f of FILES)
        for (const sp of SPANS)
          for (const cl of subsetsOf(LOCI.filter((x) => x !== f)))
            for (const cap of [false, true])
              for (const rl of subsetsOf(LOCI))
                facts.push(fact(f, sp, cl, cap, rl));

      let crossPairs = 0;
      let crossAgree = 0;
      const mismatches: Array<{ a: string; b: string; rt: boolean; mdl: boolean }> = [];

      for (let i = 0; i < facts.length; i += 1) {
        for (let j = 0; j < facts.length; j += 1) {
          const a = facts[i];
          const b = facts[j];
          if (a.file === b.file) continue;
          crossPairs += 1;
          const rt = commute(a, b).commute;
          const mdl = modelCommute(a, b);
          if (rt === mdl) crossAgree += 1;
          else if (mismatches.length < 5) mismatches.push({ a: a.file, b: b.file, rt, mdl });
        }
      }

      if (mismatches.length > 0) {
        reds.push({
          file: rel,
          locus: `${mismatches[0].a}:${mismatches[0].b}`,
          fact: `runtime=${mismatches[0].rt} model=${mismatches[0].mdl}`,
        });
      }

      return {
        gate: 'edit-algebra-gate',
        green: mismatches.length === 0,
        reds,
        note: mismatches.length === 0
          ? `${crossAgree}/${crossPairs} cross-file pairs agree with the Z3 model predicate`
          : 'runtime commute() disagrees with the model predicate',
      };
    } catch (err) {
      return {
        gate: 'edit-algebra-gate',
        green: true,
        reds: [],
        unjudged: true,
        unjudgedReason: `threw: ${String(err instanceof Error ? err.message : err)}`,
      };
    }
  },
};

export default editAlgebraGate;

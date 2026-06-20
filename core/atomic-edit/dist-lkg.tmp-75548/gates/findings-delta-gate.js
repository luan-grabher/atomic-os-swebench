import { langOf } from './perception.js';
import { astNodes } from '../native-bridge.js';
/** Source files where the pure-text JS/TS lint subset applies. */
const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
/**
 * The type-aware rule frontier — DOCUMENTED so the ceiling is explicit and the
 * effect gate (eslint apply→run→revert) knows exactly what it inherits. Grounded
 * 1:1 against backend.sarif's rule histogram. These need the type checker; this
 * static gate refuses to emit them.
 */
export const TYPE_AWARE_DEFERRED = new Set([
    '@typescript-eslint/no-unsafe-assignment',
    '@typescript-eslint/no-unsafe-member-access',
    '@typescript-eslint/no-unsafe-call',
    '@typescript-eslint/no-unsafe-return',
    '@typescript-eslint/no-unsafe-argument',
    '@typescript-eslint/unbound-method',
    '@typescript-eslint/no-base-to-string',
    '@typescript-eslint/require-await',
    '@typescript-eslint/no-floating-promises',
    '@typescript-eslint/await-thenable',
    '@typescript-eslint/restrict-template-expressions',
    '@typescript-eslint/no-redundant-type-constituents',
]);
/**
 * The pure-fn single-file analyzer. A conservative, deterministic slice of the
 * non-type-aware eslint rule family — each a property of the AST node stream
 * alone, with NO config, NO resolver, NO cross-file lookup. Returns one Finding
 * per hit. Reads through the real tree-sitter parse (`astNodes`), so a token
 * inside a regex/string/comment is the regex/string/comment node it really is,
 * never the construct it textually resembles.
 *
 * Implemented (real eslint rules, AST-decidable):
 *   • no-debugger        — a real `debugger_statement` node.
 *   • no-duplicate-case  — two `switch_case` siblings (same switch_body) with the
 *                          same non-default label text.
 * The set is intentionally small and exact: every hit is a finding a human eslint
 * run also raises, so a RED is never a false positive.
 *
 * Returns null when no grammar is available for the file's language → the caller
 * marks the file unjudged rather than guessing.
 */
async function analyzePureText(content, rel) {
    const lang = langOf(rel);
    const nodes = await astNodes(content, lang, new Set(['debugger_statement', 'switch_body', 'switch_case']));
    if (nodes === null)
        return null; // no grammar → undecidable, caller → unjudged
    const findings = [];
    // no-debugger: a real `debugger_statement` node (never a `debugger` token that
    // lives inside a regex/string/comment — those are different node types).
    for (const n of nodes) {
        if (n.type === 'debugger_statement') {
            findings.push({
                ruleId: 'no-debugger',
                message: "Unexpected 'debugger' statement.",
                line: n.line,
                col: n.column,
            });
        }
    }
    // no-duplicate-case: within each switch, two `case <same-label>:` siblings.
    // The flat node list has no parent pointers, so we scope each `switch_case` to
    // its INNERMOST containing `switch_body` (smallest byte span that contains it);
    // that is the correct per-switch grouping even under nested switches. `default:`
    // has no label and is never a duplicate-case finding.
    const bodies = nodes.filter((n) => n.type === 'switch_body');
    const cases = nodes.filter((n) => n.type === 'switch_case');
    const seenByBody = new Map();
    // Stable order: by byte position, so "the second identical label" is the dup.
    cases.sort((a, b) => a.byteStart - b.byteStart);
    for (const c of cases) {
        const label = caseLabel(c.text);
        if (label === null)
            continue; // `default:` — not a case label
        const body = innermostContaining(bodies, c.byteStart, c.byteEnd);
        const bodyKey = body ? `${body.byteStart}-${body.byteEnd}` : 'noBody';
        let seen = seenByBody.get(bodyKey);
        if (!seen) {
            seen = new Set();
            seenByBody.set(bodyKey, seen);
        }
        if (seen.has(label)) {
            findings.push({
                ruleId: 'no-duplicate-case',
                message: 'Duplicate case label.',
                line: c.line,
                col: c.column,
            });
        }
        seen.add(label);
    }
    return findings;
}
/** The label text of a `switch_case` node (`case <label>:` → `<label>`), or null
 * for a `default:` clause. Read from the real node text, which (being a code
 * node) cannot be a comment or unrelated string. */
function caseLabel(caseText) {
    const t = caseText.trimStart();
    if (/^default\b/.test(t))
        return null;
    const after = t.slice(t.indexOf('case') + 'case'.length);
    // the clause-terminating colon, NOT a ':' inside a string/template literal
    // (`case 'message:new':` must key on `'message:new'`, not truncate at the inner colon)
    let q = '';
    for (let i = 0; i < after.length; i += 1) {
        const c = after[i];
        if (q) {
            if (c === '\\')
                i += 1;
            else if (c === q)
                q = '';
            continue;
        }
        if (c === "'" || c === '"' || c === '`')
            q = c;
        else if (c === ':')
            return after.slice(0, i).trim();
    }
    return after.trim();
}
/** The smallest-span node in `bodies` whose byte range contains [start,end). */
function innermostContaining(bodies, start, end) {
    let best = null;
    for (const b of bodies) {
        if (b.byteStart <= start && end <= b.byteEnd) {
            if (!best || b.byteEnd - b.byteStart < best.byteEnd - best.byteStart)
                best = b;
        }
    }
    return best;
}
/** Stable identity of a finding for set-membership: rule + message (NOT line —
 * a finding that merely shifts lines is the same finding, so we key on what it
 * IS, scoped per file). Matches the SARIF (where=file, which-rule, verdict)
 * identity minus the volatile region. */
function findingKey(f) {
    return `${f.ruleId}::${f.message}`;
}
/** Multiset of finding-keys → count, so introducing a SECOND identical finding
 * (e.g. a new duplicate-case) is still detected as a delta. */
function keyCounts(findings) {
    const m = new Map();
    for (const f of findings)
        m.set(findingKey(f), (m.get(findingKey(f)) ?? 0) + 1);
    return m;
}
/**
 * The fact, over the context. For each changed source file, run the pure-text
 * analyzer on the candidate AND on the prior content, and red iff the candidate
 * raises a finding-key MORE times than the prior did (a NEW finding). Same
 * NEW-only delta semantics as the connection byte floor. A file whose grammar is
 * unavailable (analyzer returns null) is not counted toward judged-ness.
 */
async function runFindingsDelta(ctx) {
    const reds = [];
    let judgedAny = false;
    for (const rel of ctx.changedFiles) {
        if (!SOURCE_RE.test(rel))
            continue;
        const candidate = ctx.overlay.get(rel.replaceAll('\\', '/')) ?? ctx.readFile(rel);
        if (candidate == null)
            continue;
        // prior bytes = pre-write content (write direction) / '' (lens direction).
        // If the file is new there is no prior, so every finding is new.
        const prior = ctx.priorOf(rel);
        const afterFindings = await analyzePureText(candidate, rel);
        if (afterFindings === null)
            continue; // no grammar → cannot judge this file
        const beforeFindings = await analyzePureText(prior, rel);
        judgedAny = true;
        const before = keyCounts(beforeFindings ?? []);
        const after = keyCounts(afterFindings);
        // Pre-index the candidate findings so the NEW-occurrence locus is exact.
        const byKey = new Map();
        for (const f of afterFindings) {
            const arr = byKey.get(findingKey(f));
            if (arr)
                arr.push(f);
            else
                byKey.set(findingKey(f), [f]);
        }
        for (const [key, afterN] of after) {
            const beforeN = before.get(key) ?? 0;
            if (afterN <= beforeN)
                continue; // not this write's claim — pre-existing
            // locate the NEW occurrence(s) precisely: a delta of +N means the last N
            // instances appeared in this write.
            const all = byKey.get(key) ?? [];
            const newOnes = all.slice(Math.max(0, all.length - (afterN - beforeN)));
            for (const f of newOnes) {
                reds.push({
                    file: rel,
                    locus: `L${f.line}:${f.col}`,
                    fact: `${f.ruleId}: ${f.message}`,
                });
            }
        }
    }
    // If no source file was judgeable from the bytes we have (none matched, or
    // every match lacked a grammar), say so honestly rather than claim green.
    if (!judgedAny) {
        return {
            gate: 'findings-delta',
            green: true,
            reds: [],
            unjudged: true,
            note: 'no judgeable source file in the change set (pure-text subset has nothing to assert)',
        };
    }
    return {
        gate: 'findings-delta',
        green: reds.length === 0,
        reds,
        note: 'no write may INTRODUCE a new pure-text single-file lint finding (NEW-only delta vs prior bytes); ' +
            'type-aware rules deferred to the effect gate',
    };
}
const findingsDeltaGate = {
    name: 'findings-delta',
    kind: 'static',
    appliesTo: (rel) => SOURCE_RE.test(rel),
    run: runFindingsDelta,
};
export default findingsDeltaGate;

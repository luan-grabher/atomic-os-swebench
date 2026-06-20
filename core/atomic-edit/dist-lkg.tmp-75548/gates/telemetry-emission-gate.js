import { calls } from './perception.js';
const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
/**
 * Known telemetry-emission verbs. Grouped only for documentation; the set is the
 * contracted edges: a structured log, a span open, a metric mutation, an event
 * emission. (Grounded against backend/src: logger.warn/error/log/debug dominate;
 * metrics.service uses Counter.inc / Histogram.observe.)
 */
const EMIT_VERBS = new Set([
    // structured logging (NestJS Logger / StructuredLogger / pino / winston)
    'log', 'error', 'warn', 'debug', 'verbose', 'fatal', 'info', 'trace',
    // metrics (prom-client Counter/Histogram/Gauge, statsd, otel meter)
    'inc', 'add', 'record', 'observe', 'increment', 'decrement', 'gauge', 'timing', 'count', 'set',
    // tracing (OpenTelemetry tracer)
    'startSpan', 'startActiveSpan',
    // event spine (EventEmitter2 / Nest event bus)
    'emit', 'emitAsync',
]);
/**
 * Is `<handle>` declared somewhere in this file? Byte-floor resolution of the same
 * fact lsp_definition would answer. Accepts the forms that actually declare a
 * member handle in this codebase:
 *   - class field:        `private readonly logger = new Logger(...)`  →  `logger =`
 *   - typed field:        `private httpCounter: Counter;`              →  `httpCounter:`
 *   - assigned in ctor:   `this.httpCounter = new Counter(...)`        →  `this.httpCounter =`
 *   - constructor param:  `constructor(private readonly tracer: Tracer)`→ `tracer:` inside ()
 * A declaration is any of: `this.<h> =`, a field/param `<h>:` or `<h> =` at member
 * position. We over-accept declaration forms on purpose — the gate must never
 * RED a real handle (no false dead-wire); it only REDs a handle with no plausible
 * declaration anywhere in the file.
 */
function handleDeclaredInFile(handle, content) {
    const h = handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // `this.<h> =` — assigned as a member (covers ctor assignment + lazy init)
    if (new RegExp(String.raw `\bthis\.${h}\s*[=:]`).test(content))
        return true;
    // field or constructor-parameter declaration: `<h>:` or `<h> =` or `<h>!:`
    // require it to look like a declaration (preceded by a modifier, `(`, `,`,
    // newline, or `{` — i.e. member/param position, not a property *access*).
    if (new RegExp(String.raw `(?:private|protected|public|readonly|static|declare|[,({)]|^|\n)\s*(?:readonly\s+)?${h}\s*[!?]?\s*[:=]`, 'm').test(content)) {
        return true;
    }
    // get/set accessor: `get <h>(` / `set <h>(` — a getter is a real member declaration
    if (new RegExp(String.raw `\b(?:get|set)\s+${h}\s*\(`).test(content))
        return true;
    return false;
}
/**
 * Parse a whole member callee into a telemetry emission iff it is exactly
 * `this.<handle>.<verb>` with <verb> a known telemetry verb. Anchoring on a single
 * member segment between `this.` and the verb mirrors the prior gate's shape
 * (`\bthis\.<h>\.<verb>`): a bare `logger.warn` (imported/global handle) or a nested
 * `this.a.b.record` is out of scope — not a single-member handle we can prove
 * declared-or-not in one file. Returns null when the callee is not such an emission.
 */
function asEmission(c) {
    const parts = c.callee.split('.');
    if (parts.length !== 3)
        return null; // exactly this.<handle>.<verb>
    if (parts[0] !== 'this')
        return null; // member anchored on `this.`
    const handle = parts[1];
    const verb = parts[2];
    if (!/^[A-Za-z_$][\w$]*$/.test(handle))
        return null;
    if (!EMIT_VERBS.has(verb))
        return null;
    return { handle, callee: c.callee, line: c.line };
}
/**
 * Extract every `this.<handle>.<verb>` telemetry emission from `content`, via the
 * perception organ (real `call_expression` nodes — token-correct). Returns null when
 * the grammar is unavailable so the caller degrades to unjudged.
 */
async function emissionsOf(content, rel) {
    const found = await calls(content, rel);
    if (found === null)
        return null;
    const out = [];
    for (const c of found) {
        const e = asEmission(c);
        if (e)
            out.push(e);
    }
    return out;
}
const telemetryEmissionGate = {
    name: 'telemetry-emission',
    kind: 'static',
    appliesTo(rel) {
        return SOURCE_RE.test(rel);
    },
    async run(ctx) {
        const reds = [];
        let sawAnyEmission = false;
        let sawUnjudgedSource = false;
        const note = 'every this.<handle>.<telemetry-verb>() emits through a handle declared in the same file (could-emit, not did-emit)';
        for (const rel of ctx.changedFiles) {
            if (!SOURCE_RE.test(rel))
                continue;
            const content = ctx.readFile(rel);
            if (content === null)
                continue;
            const emissions = await emissionsOf(content, rel);
            if (emissions === null) {
                sawUnjudgedSource = true;
                continue; // no grammar → cannot decide this file (unjudged)
            }
            if (emissions.length === 0)
                continue;
            // Write-direction claim narrowing: only emission callees absent from the
            // prior content are this write's claim. A pre-existing dangling emitter in a
            // legacy file never blocks an unrelated edit (mirrors connection-gate
            // NEW-wire-only law). priorOf is '' in the lens (read) direction, so every
            // emission is judged absolutely there. The prior is parsed through the SAME
            // perception organ, so the delta key is token-correct on both sides.
            const prior = ctx.priorOf(rel);
            let priorCallees = null;
            if (prior !== '' && prior !== content) {
                const priorEmissions = await emissionsOf(prior, rel);
                if (priorEmissions !== null)
                    priorCallees = new Set(priorEmissions.map((e) => e.callee));
            }
            for (const e of emissions) {
                if (priorCallees && priorCallees.has(e.callee))
                    continue; // unchanged emitter — not this write's claim
                sawAnyEmission = true;
                if (!handleDeclaredInFile(e.handle, content)) {
                    reds.push({
                        file: rel,
                        locus: `L${e.line}`,
                        fact: `telemetry emission \`this.${e.handle}.…()\` names handle \`${e.handle}\`, which has no declaration in this file — dead telemetry wire (no emitter can flow)`,
                    });
                }
            }
        }
        // No NEW telemetry emission anywhere in the judged set → no fact to assert.
        // If every changed source was perceivable, that is explicit non-applicability.
        // A file whose grammar was unavailable still makes the empty run unjudged.
        if (!sawAnyEmission && reds.length === 0) {
            return sawUnjudgedSource
                ? { gate: this.name, green: true, reds: [], note, unjudged: true }
                : { gate: this.name, green: true, reds: [], note, notApplicable: true };
        }
        return { gate: this.name, green: reds.length === 0, reds, note };
    },
};
export default telemetryEmissionGate;

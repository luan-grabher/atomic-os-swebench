export const meta = {
  name: 'lens-full-codebase',
  description: 'Run the atomic lens over 100% of the source (6 top-level areas in parallel: backend/src, frontend/src, worker, scripts, tools, e2e), and classify every red as a REAL bug vs a false-positive pattern, to answer "does the lens work on the complete 1M+ LOC codebase".',
  phases: [{ title: 'Scan areas' }],
};

const LENS = 'node /Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit/dist/gates/lens.js';

const areas = [
  { name: 'backend/src', files: 3316, big: true },
  { name: 'frontend/src', files: 1420, big: true },
  { name: 'scripts', files: 919, big: true },
  { name: 'worker', files: 274, big: false },
  { name: 'tools', files: 68, big: false },
  { name: 'e2e', files: 54, big: false },
];

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['area', 'scannedFiles', 'totalReds', 'realBugs', 'fpGroups', 'unjudgedGates', 'wallSeconds', 'completed', 'notes'],
  properties: {
    area: { type: 'string' },
    scannedFiles: { type: 'number', description: 'sum of "scanned N source file(s)" across every lens run you did for this area' },
    totalReds: { type: 'number' },
    realBugs: {
      type: 'array',
      description: 'reds that are GENUINE problems (a real dangling wire / unbound name / dead handler / orphan / dangling dep), confirmed by reading the source line',
      items: {
        type: 'object', additionalProperties: false,
        required: ['gate', 'file', 'locus', 'fact', 'whyReal'],
        properties: { gate: { type: 'string' }, file: { type: 'string' }, locus: { type: 'string' }, fact: { type: 'string' }, whyReal: { type: 'string' } },
      },
    },
    fpGroups: {
      type: 'array',
      description: 'false-positive reds grouped by ROOT CAUSE pattern (e.g. "ambient global X not in KNOWN_GLOBALS", "framework-magic registration", "alias import"), each with a count and an example + the precise fix',
      items: {
        type: 'object', additionalProperties: false,
        required: ['pattern', 'gate', 'count', 'example', 'rootFix'],
        properties: { pattern: { type: 'string' }, gate: { type: 'string' }, count: { type: 'number' }, example: { type: 'string' }, rootFix: { type: 'string' } },
      },
    },
    unjudgedGates: { type: 'array', items: { type: 'string' } },
    wallSeconds: { type: 'number' },
    completed: { type: 'boolean', description: 'true if you scanned 100% of this area (every immediate subdir + top-level files)' },
    notes: { type: 'string' },
  },
};

phase('Scan areas');

const results = await parallel(areas.map((a) => () => agent(
  `Run the ATOMIC LENS over 100% of the source area **${a.name}** (~${a.files} files) and CLASSIFY every red it emits as a REAL bug vs a false-positive pattern.\n\n` +
  `THE LENS: \`${LENS} <scopeDir>\`. It prints "ATOMIC LENS — scanned N source file(s)...", then "gates ran:", "unjudged (honest):", then either "GREEN ..." or "K RED(s):" followed by lines of the form "  [gate] path:locus — fact". It uses tree-sitter + ts-morph so a single run over a very large dir can be slow / memory-heavy.\n\n` +
  `HOW TO COVER 100% RELIABLY (anti-hang): do NOT run one lens over the whole ${a.files}-file area if it is big — instead enumerate the immediate children and run the lens PER child so each invocation stays small and fast:\n` +
  `  - \`find ${a.name} -maxdepth 1 -mindepth 1 -type d\` → run \`${LENS} <eachSubdir>\` (each recurses its subtree);\n` +
  `  - also catch the area's TOP-LEVEL files (those directly in ${a.name}, not in a subdir): collect them and, if any source files exist there, scan them by running the lens on a tiny temp scope OR note them — do NOT skip them silently.\n` +
  `  - SUM "scanned N" across all your runs → that is scannedFiles; the union of files scanned MUST equal 100% of the area's .ts/.tsx/.js/.jsx/.mjs/.cjs files (excluding *.proof.ts which the lens skips). Verify with \`find ${a.name} \\( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \\) -not -name '*.proof.ts' | wc -l\` and reconcile; if you fell short, scan the missed subdirs. Set completed=true ONLY if the union covers 100%.\n\n` +
  `CLASSIFY each distinct red: open the cited file at the cited locus (sed -n) and decide — is it a GENUINE problem (real dangling import/dep, real unbound name, real dead UI handler, real orphan, real new lint finding) → add to realBugs with whyReal; OR a FALSE POSITIVE (the lens guessing) → group it under fpGroups by its ROOT CAUSE with the precise rootFix (e.g. "binding: ambient global 'X' missing from KNOWN_GLOBALS — add it"; "binding: destructuring-rename key"; "reachability: file reached only via a tsconfig path alias the static graph can't see"; "contract-edge: Next.js /api proxy path"). Count duplicates per pattern. Reds from reachability/contract-edge that are 'unjudged' are NOT reds — only count actual RED lines.\n\n` +
  `Use Bash to run the lens and sed/grep to inspect source. Be exhaustive and honest: every red is either a real bug (name it) or an FP with a named root fix (group it). Report exact numbers — this is the evidence for whether the lens works on the complete codebase.`,
  { label: `scan:${a.name}`, phase: 'Scan areas', schema: SCHEMA, agentType: 'general-purpose' },
)));

const ok = results.filter(Boolean);
const totalScanned = ok.reduce((s, r) => s + (r.scannedFiles || 0), 0);
const totalReds = ok.reduce((s, r) => s + (r.totalReds || 0), 0);
const totalReal = ok.reduce((s, r) => s + (r.realBugs?.length || 0), 0);
const totalFp = ok.reduce((s, r) => s + (r.fpGroups?.reduce((x, g) => x + (g.count || 0), 0) || 0), 0);
return {
  areas: ok,
  rollup: { areasScanned: ok.length, totalScanned, totalReds, totalRealBugs: totalReal, totalFalsePositives: totalFp },
};

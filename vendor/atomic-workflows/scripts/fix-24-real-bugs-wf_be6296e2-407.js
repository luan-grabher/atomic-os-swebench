export const meta = {
  name: 'fix-24-real-bugs',
  description: 'Fix the 24 real decomposition-without-imports bugs the lens found in scripts/ dev tooling — each part-file references node builtins / sibling-part exports / module constants WITHOUT importing them (ESM export* does not inject scope), crashing with ReferenceError. Add the correct imports per file; verify each file goes lens-GREEN.',
  phases: [{ title: 'Fix imports' }],
};

const LENS = 'node /Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit/dist/gates/lens.js';

const groups = [
  { name: 'orchestration-top', dir: 'scripts/orchestration',
    files: ['hud-orchestrator-helpers.mjs', 'hubs-generator-helpers.mjs', 'hubs-generator-dag.mjs', 'phase-tags-helpers.mjs', 'hud-orchestrator-steps.mjs'] },
  { name: 'hud-audit-parts', dir: 'scripts/orchestration/__parts__',
    files: ['hud-audit.categories-a.mjs', 'hud-audit.categories-b.mjs', 'hud-audit.categories-c.mjs', 'hud-audit.helpers.mjs', 'hud-audit.orphans.mjs'] },
  { name: 'obsidian-content', dir: 'scripts/__parts__',
    files: ['obsidian-mirror-daemon-content-extract.mjs', 'obsidian-mirror-daemon-content-facts.mjs', 'obsidian-mirror-daemon-content-domain.mjs', 'obsidian-mirror-daemon-content-index.mjs', 'obsidian-mirror-daemon-content-build.mjs'] },
  { name: 'obsidian-indexes', dir: 'scripts/__parts__',
    files: ['obsidian-mirror-daemon-indexes-domain-write.mjs', 'obsidian-mirror-daemon-indexes-legacy-overlays.mjs', 'obsidian-mirror-daemon-indexes-machine.mjs', 'obsidian-mirror-daemon-indexes-camera.mjs', 'obsidian-mirror-daemon-indexes-domain-pages.mjs', 'obsidian-mirror-daemon-indexes-diagnostics.mjs', 'obsidian-mirror-daemon-indexes-persistence.mjs'] },
  { name: 'daemon-and-backup', dir: 'scripts',
    files: ['backup/db-backup.mjs', 'obsidian-mirror-daemon.mjs'] },
];

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['group', 'filesFixed', 'allGreen', 'notes'],
  properties: {
    group: { type: 'string' },
    filesFixed: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['file', 'missingNames', 'importsAdded', 'nowGreen'],
        properties: {
          file: { type: 'string' },
          missingNames: { type: 'array', items: { type: 'string' }, description: 'the unbound names the lens flagged' },
          importsAdded: { type: 'array', items: { type: 'string' }, description: 'the exact import lines you added, with the resolved source module for each name' },
          nowGreen: { type: 'boolean', description: 'the file goes lens-GREEN (binding gate: every name now binds) after the fix' },
        },
      },
    },
    allGreen: { type: 'boolean' },
    notes: { type: 'string', description: 'anything that did NOT resolve cleanly (a name with no findable export, a circular-import risk, a file that was actually already fine)' },
  },
};

phase('Fix imports');

const results = await parallel(groups.map((g) => () => agent(
  `Fix the REAL "decomposition-without-imports" bugs in these files (the atomic lens found them; they crash with ReferenceError). You OWN exactly these files (edit ONLY these): ${g.files.map((f) => `${g.dir}/${f}`).join(', ')}.\n\n` +
  `THE DEFECT: each file was split out of a parent module 'for line budget' and references node builtins (createHash, existsSync, spawnSync, join, relative, statSync, writeFileSync, formatISO, …), module CONSTANTS (REPO_ROOT, MIRROR_ROOT, PHASE_NAMES, DAG_MODULES, IGNORE_SEGMENTS, …), and SIBLING-PART exports (addVisualFact, visualFactKey, writeGeneratedNote, findOrphans, …) WITHOUT importing them — relying on the false belief that an ESM \`export *\` barrel injects sibling exports into each part's lexical scope (it does NOT). So every such name is genuinely unbound → ReferenceError at runtime.\n\n` +
  `FIX EACH FILE:\n` +
  `1. Run the lens to get the exact unbound names for your file: \`${LENS} ${g.dir}\` (read the [binding] reds whose path is one of YOUR files). (For scripts/__parts__ which is shared, only act on YOUR listed files.)\n` +
  `2. For EACH unbound name, find where it is defined/exported (it is one of: a node builtin → import from 'node:fs'/'node:path'/'node:crypto'/'node:child_process'/etc.; a CONSTANT → grep the sibling part files + the parent module for \`export const <NAME>\` / \`const <NAME>\`; a HELPER/function → grep the sibling parts for \`export function <NAME>\` / \`export const <NAME>\`). Use \`grep -rn "export .*\\b<NAME>\\b" ${g.dir} scripts/__parts__ scripts/orchestration\` and the parent monolith (e.g. scripts/obsidian-mirror-daemon.mjs, scripts/orchestration/hud-orchestrator.mjs, hubs-generator.mjs, phase-tags-emitter.mjs) to locate each.\n` +
  `3. Add the minimal correct import statements at the TOP of the file, via mcp__atomic-edit__atomic_edit / atomic_insert_before_anchor. Group node-builtins into one \`import { … } from 'node:fs'\` etc.; sibling exports into \`import { … } from './<sibling-part>.js'\`; constants from their defining module. Match the file's existing import style (ESM, .js extensions). Resolve every relative import (the byte floor refuses dangling ones).\n` +
  `4. VERIFY: re-run \`${LENS} ${g.dir}\` and confirm YOUR file now emits ZERO binding reds (every name binds). nowGreen=true ONLY when the lens shows no [binding] red for that file. Do NOT execute the daemon/orchestrator (side effects) — the lens binding-GREEN IS the proof the ReferenceError is fixed (all names now resolve to a declaration/import/global).\n\n` +
  `MUTATE ONLY via mcp__atomic-edit__* (native Write/Edit + shell heredocs BANNED). Touch ONLY your listed files. If a name genuinely has no findable export anywhere (a real dead reference, not a missing import), do NOT invent one — report it in notes as an unresolved dead reference. Be exact: report each file, its missing names, the precise imports you added (with the source module), and whether it is now lens-GREEN.`,
  { label: `fix:${g.name}`, phase: 'Fix imports', schema: SCHEMA, agentType: 'general-purpose' },
)));

const ok = results.filter(Boolean);
const totalFiles = ok.reduce((s, r) => s + (r.filesFixed?.length || 0), 0);
const allGreen = ok.every((r) => r.allGreen);
return { groups: ok, rollup: { groupsDone: ok.length, totalFilesFixed: totalFiles, allGreen } };

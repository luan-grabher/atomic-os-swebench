export const meta = {
  name: 'atomic-phase3-map',
  description: 'Read-only: map safe injection points to back lang-bridge validation + engine-universal locating with the native engine, and the atomic_transaction dedup delta',
  phases: [
    { title: 'Map', detail: 'parallel readers over lang-bridge validate flow, engine-universal locators, atomic_transaction vs applyMultiFilePlan' },
    { title: 'Harden', detail: 'adversarial review of the Phase-3 plan for parser-disagreement / contract-break / perf' },
  ],
}

const OURS = '/Users/danielpenin/whatsapp_saas/scripts/mcp/atomic-edit'

const FINDING = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    facts: { type: 'array', items: { type: 'string' } },
    injection_points: { type: 'array', items: { type: 'string' }, description: 'exact file:line + how to change it minimally and safely' },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'facts', 'injection_points', 'risks'],
}

phase('Map')

const map = await parallel([
  () => agent(`READ-ONLY. Map how validation works in our atomic-edit MCP at ${OURS} so I can back it with the native pi-natives engine (in-process tree-sitter, 75 langs) instead of the python3-subprocess path, WITHOUT breaking the contract.
Read fully: lang-bridge.ts (validateLanguage + the tree-sitter subprocess bridge) and engine.ts (the validate() function lines ~128-200, ValidationResult).
Answer: (1) exact signature + return contract of validateLanguage and how engine.validate() consumes it. (2) the CRITICAL "-1 == no real parser -> fall to structural" contract — where is it, what depends on it. (3) for native-backed validation we need a parse-ERROR-COUNT for (content, lang): does the native API give a content-based parse? (astGrep takes a path/glob, not raw content — so we'd write content to a temp file then astGrep and read parseErrors, OR is there a better call?). Propose the EXACT minimal change to lang-bridge.validateLanguage that uses native parse-error count when available and preserves the -1/structural fallback + validates before+after on the SAME parser. (4) every caller of validateLanguage / what reads ValidationResult.language.`,
    { label: 'map:validation', phase: 'Map', schema: FINDING }),

  () => agent(`READ-ONLY. Map engine-universal.ts in our atomic-edit MCP at ${OURS} and decide if backing its LOCATORS with the native engine is worth it + safe.
Read engine-universal.ts (universalReplaceLiteral / universalReplacePropertyValue / universalRenamePropertyKey) and grep their callers in server-tools-*.ts.
Answer: (1) each function's signature + what it returns (the locate-then-splice shape the callers expect). (2) which use regex/char-walk vs which could use native astGrep to LOCATE the span. (3) the EXACT minimal injection (when native available, locate via astGrep, else current). (4) the byte(UTF-8)->UTF-16 conversion concern. (5) honest risk: is this worth doing or is the regex path fine? Recommend.`,
    { label: 'map:locators', phase: 'Map', schema: FINDING }),

  () => agent(`READ-ONLY. Map the delta to refactor atomic_transaction (server-tools-f.ts) to delegate to the extracted applyMultiFilePlan (server-helpers-multifile.ts) WITHOUT breaking its smoke.
Read: the atomic_transaction handler in server-tools-f.ts, server-helpers-multifile.ts (applyMultiFilePlan), and smoke-part-b-multi-tx.ts.
Answer: (1) the exact input atomic_transaction accepts and how it builds TextEditSpec[] per file. (2) what smoke-part-b-multi-tx.ts asserts — every exact string/field it checks in the response (so the refactor must preserve them). (3) the precise diff: convert the plan input to MultiFileEntry[] and call applyMultiFilePlan; note ANY payload-shape differences between the current handler's success/preview return and applyMultiFilePlan's return that would break the smoke. (4) verdict: safe to refactor, or leave duplicated?`,
    { label: 'map:dedup', phase: 'Map', schema: FINDING }),
])

phase('Harden')

const spec = map.filter(Boolean).map((m, i) => `### Finding ${i + 1}: ${m.summary}\nFACTS:\n- ${m.facts.join('\n- ')}\nINJECTION:\n- ${m.injection_points.join('\n- ')}\nRISKS:\n- ${m.risks.join('\n- ')}`).join('\n\n')

const hardened = await agent(`Adversarial reviewer. Below is a plan to (A) back lang-bridge validation with native tree-sitter parse-error counts, (B) optionally back engine-universal locators with native astGrep, (C) dedup atomic_transaction onto applyMultiFilePlan.

Attack it. Where does it break or regress?
- Native parser vs python tree-sitter vs gofmt/rustc DISAGREEMENT: if before is validated by parserX and after by parserY the before/after error-count delta is meaningless. Does the plan guarantee same-parser before+after? What if native parses a lang that the old path rejected (or vice versa) — does a previously-refused edit now pass, or a previously-passing edit now fail?
- Perf: writing content to a temp file + astGrep on EVERY validate() call (every edit) — acceptable, or a regression vs in-process? Is there a non-temp-file parse?
- The -1/structural contract: any path where native returns 0 errors for genuinely broken code (so a real syntax break passes)?
- Dedup: any smoke assertion that applyMultiFilePlan's payload would break.
Return the hardened, ordered, minimal Phase-3 plan with each risk's mitigation, and an explicit list of what to NOT do (leave alone). Be brutal.

MAPPING:
${spec}`,
  { label: 'harden:adversarial', phase: 'Harden' })

return { mappings: map.filter(Boolean), hardened_plan: hardened }
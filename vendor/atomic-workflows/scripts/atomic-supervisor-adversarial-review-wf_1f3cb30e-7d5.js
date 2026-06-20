export const meta = {
  name: 'atomic-supervisor-adversarial-review',
  description: 'Adversarial multi-lens review of the new atomic-edit MCP immortality chain',
  phases: [
    { title: 'Review', detail: 'parallel skeptic lenses over supervisor/bootstrap' },
    { title: 'Verify', detail: 'adversarially verify each finding against the code' },
  ],
}

const FILES = `
- /Users/danielpenin/kloel/scripts/mcp/atomic-edit/launcher-supervisor.mjs  (the supervisor: stdio relay, handshake replay, recovery ladder, rescue mode, integrity sweeps, LKG snapshots)
- /Users/danielpenin/kloel/scripts/mcp/atomic-edit-mcp-launcher.sh          (registered bootstrap: node resolve, blessed restore, exec supervisor)
- /Users/danielpenin/kloel/scripts/mcp/atomic-edit-mcp-launcher-impl.sh     (impl: strict admission, broker checks, build/freshness, exec server — owned by another agent, context only)
- /Users/danielpenin/kloel/scripts/mcp/atomic-edit/gates/launcher-immortality.proof.mjs (the proof gate)
`

const CONTEXT = `
System: an MCP stdio server chain used by 4 hosts (Claude Code, Codex, OpenCode, oh-my-pi).
Hosts spawn 'bash atomic-edit-mcp-launcher.sh' and speak newline-delimited JSON-RPC on stdio.
The supervisor relays stdio between host and the real server child, caches the initialize
handshake, and on child death respawns through a ladder (impl → blessed-restored impl →
dist-lkg direct serve → internal rescue responder), replaying initialize + in-flight requests.
Design contracts that MUST hold:
1. Deliberate refusal exits 78/79/80 propagate to the host ONLY pre-initialize; after a session
   exists they become recovery.
2. stdout carries ONLY valid JSON-RPC lines (non-JSON child output is dropped).
3. Integrity sweep restores parse-broken (or shebang-less) launcher files from launcher-blessed/,
   but never reverts merely-different (parseable) files outside the impl-restored ladder stage.
4. Blessing (copy current chain to launcher-blessed/ + snapshot dist→dist-lkg) happens only after
   a real initialize answer from a real server (not rescue, not lkg stage for dist snapshot).
5. Multiple supervisors run concurrently (one per host session) against the same files.
`

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'file', 'detail', 'severity'],
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          detail: { type: 'string', description: 'concrete failure scenario: exact sequence of events that triggers the bug' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['isReal', 'reasoning'],
  properties: {
    isReal: { type: 'boolean', description: 'true only if the failure scenario is actually reachable in the current code' },
    reasoning: { type: 'string' },
    suggestedFix: { type: 'string' },
  },
}

const LENSES = [
  { key: 'relay-correctness', prompt: `You are a hostile protocol reviewer. Read these files:${FILES}\nContext:${CONTEXT}\nHunt ONLY for bugs in the stdio relay and handshake replay of launcher-supervisor.mjs: lost/duplicated/reordered JSON-RPC messages, wrong suppression of the replayed initialize response, pending-request leaks, partial-line handling across child restarts, requests arriving during a respawn window, host notifications mishandled, id collisions between replay and live traffic. For each bug give the EXACT event sequence. Return only findings you can trace through real code paths with line numbers.` },
  { key: 'races-and-locks', prompt: `You are a concurrency skeptic. Read these files:${FILES}\nContext:${CONTEXT}\nHunt ONLY for race conditions: multiple supervisors (different host sessions) blessing/restoring/LKG-snapshotting the same files concurrently; the withDistLock spin-wait correctness (it busy-spins the event loop — what does that block?); dist restore racing a build by another session's impl; integrity sweep racing a developer's legitimate edit mid-write; state-file collisions. Concrete interleavings only, with line numbers.` },
  { key: 'lifecycle-reliability', prompt: `You are a reliability engineer trying to wedge the system. Read these files:${FILES}\nContext:${CONTEXT}\nHunt ONLY for lifecycle bugs in launcher-supervisor.mjs: timer leaks across respawns, the 150ms exit-grace race (what if the child writes stderr AFTER the grace?), boot watchdog interactions with the ladder, respawn-budget window edge cases, EPIPE during shutdown, stdin EOF while a respawn is in flight, the rescue auto-retry timer after recovery, zombie broker children (lkgBrokerChild) accumulating across ladder stages, supervisor exits that strand the lkg broker. Concrete sequences with line numbers.` },
  { key: 'armor-bypass', prompt: `You are an adversarial agent trying to make the MCP go DOWN despite the armor. Read these files:${FILES}\nContext:${CONTEXT}\nFind concrete agent actions (file edits, deletions, chmods, process kills) that still kill the MCP for a host session or brick the NEXT session: e.g. corrupting files the integrity sweep does not cover (dist-freshness.mjs? atomic-exec-broker.mjs? node_modules?), making blessed copies themselves bad, breaking the bootstrap while no supervisor is alive, defeating bashScriptHealthy with parseable-but-fatal content in a way the ladder does not catch, filling dist-lkg with a broken snapshot. For each: exact action + why the armor misses it.` },
]

phase('Review')
const results = await pipeline(
  LENSES,
  (l) => agent(l.prompt, { label: `review:${l.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  (review, lens) => parallel((review?.findings ?? []).map((f) => () =>
    agent(
      `You are verifying a code-review finding adversarially. Default to isReal=false unless the exact failure sequence is reachable in the CURRENT code. Read the cited file(s) yourself:\n${FILES}\nContext:${CONTEXT}\nFinding from lens "${lens.key}": ${JSON.stringify(f)}\nTrace the claimed sequence through the actual code. If any step is impossible, mark isReal=false and say which step. If real, give the minimal fix.`,
      { label: `verify:${f.title.slice(0, 40)}`, phase: 'Verify', schema: VERDICT_SCHEMA },
    ).then((v) => ({ ...f, lens: lens.key, verdict: v }))
  )),
)

const all = results.filter(Boolean).flat().filter(Boolean)
const confirmed = all.filter((f) => f.verdict?.isReal)
log(`${all.length} findings raised, ${confirmed.length} confirmed real`)
return { confirmed, rejected: all.filter((f) => !f.verdict?.isReal).map((f) => ({ title: f.title, why: f.verdict?.reasoning?.slice(0, 200) })) }
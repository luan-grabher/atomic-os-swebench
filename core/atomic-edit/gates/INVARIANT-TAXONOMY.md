# The Closed Taxonomy of Tree-Health Invariants (PARADIGM L01)

**Why this document is the difference between a synthesis and a paradigm.** A growing pile of
useful gates is an *engineering synthesis* — impressive, but you can never say what it *guarantees*,
only what it *happens to check today*. A **closed taxonomy** is a *theory*: it names the exhaustive
set of dimensions along which "a healthy tree" is defined, so the claim *"broken states are
unrepresentable"* becomes falsifiable rather than rhetorical. This file is that theory. The machine
form is [`invariant-taxonomy.json`](invariant-taxonomy.json) (single source of truth, consumed by
the **closure meta-gate**, L05); this is the human view.

## The closure principle

1. **Every dimension is named.** The set below is the *complete* definition of tree-health for
   atomic. Not "some gates"; *these classes*.
2. **Closure is enforced, not asserted.** The closure meta-gate (L05) reds any write that touches a
   dimension **not** in this set, or that lands in a class whose gate is missing/disabled — turning
   "the taxonomy is closed" from a promise into a runtime check.
3. **Growth is monotonic (L17/L18).** The set only ever *grows*, and only by admitting a new class
   **with a discriminating gate**, proven to strictly increase coverage without regressing any prior
   class. `resource-lifetime` (L02) is the canonical first such admission.
4. **Honesty over completeness.** A class is marked `partial` (gate exists but scope is narrower than
   the definition) or `out-of-scope` (with a reason) rather than silently omitted. A `partial` is a
   *named debt*, not a hidden hole.

## Directions

- **write** — per-edit delta: refuse the red *before* the bytes land (the byte-floor).
- **read** — whole-repo lens: report the red over the entire tree (orphan census).
- **dynamic** — runs code (compiler / tests / property checks) to judge.
- **runtime** — observes live process / resource lifetime (the class static gates are blind to).

## The taxonomy

| Class | What it guarantees | Direction | Status | Enforcing gate(s) |
|---|---|---|---|---|
| **syntax** | file parses in its grammar after the edit | write | ✅ enforced | byte-floor `engine.validate`, `structural-lint-gate` |
| **types** | no NEW type error (delta); repo type-clean under tsconfig | write | ✅ enforced | `type-soundness-gate`, `repo-typecheck-gate`, `lsp-semantic-gate` |
| **relative-connection** | no dangling intra-repo wire (import/ref/re-export/export) | write/read | ✅ enforced | `contract-edge-gate`, `binding-gate`, `reexport-symbol-gate`, `public-contract-gate`, `reachability-gate` |
| **supply-chain** | imported external dep actually exists | write | ⚠️ partial | `supply-chain-gate` — JS judged; non-JS unjudged (→ **L07**) |
| **secrets** | no plaintext secret/credential/key written | write | ✅ enforced | `security-gate`, `security-invariants.mjs` |
| **iac-refs** | IaC service/role/resource names resolve | write | ✅ enforced | `iac-reference-gate` |
| **config-refs** | referenced config keys exist | write | ✅ enforced | `config-key-gate` |
| **schema-refs** | Prisma/ORM model & field refs resolve | write | ✅ enforced | `prisma-reference-gate` |
| **render-conformance** | rendered output conforms to its contract | write | ✅ enforced | `render-conformance-gate` |
| **telemetry-emission** | declared telemetry is actually emitted | write | ✅ enforced | `telemetry-emission-gate` |
| **behavior-contract** | declared pre/post behavior holds | dynamic | ✅ enforced | `behavior-contract-gate` |
| **findings-delta** | no NEW findings introduced vs prior tree | write | ✅ enforced | `findings-delta-gate` |
| **formal-property** | declared algebraic/closure properties survive | dynamic | ✅ enforced | `formal-gate`, `property-gate`, `algebra.proof`, `closure-universal.proof` |
| **test-execution** | the touched surface's tests still pass | dynamic | ✅ enforced | `test-execution-gate` |
| **convergence** | the edit reaches a fixed point | dynamic | ✅ enforced | `probe-convergence-gate`, `converge-operator.proof`, `deterministic-harness` |
| **idempotency** | applying the op twice yields the same bytes | dynamic | ⚠️ partial | folded into `converge-operator` + `lint-fix-gate` (no standalone gate) |
| **concurrency-lock** | concurrent edits serialized; no lost-update | runtime | ✅ enforced | `atomic-product-locks.proof`, `server-helpers-product-locks` |
| **resource-lifetime** | no orphaned child process on abnormal owner death | runtime | ✅ enforced | `resource-lifetime.proof` (RT-REAP/RT-DETECT), `parent-death-reaper` |
| **fd-socket-lifetime** | no orphaned fd / socket / lock endpoint | runtime | ⚠️ partial | broker shutdown removes socket; explicit proof is **L04** |
| **temp-artifact** | a gate run leaves ZERO stray tree artifacts | runtime | ⚠️ partial | `resource-lifetime.proof` RT-CLEAN seed; tree-wide hygiene gate is **L03** |

## Deliberately out of scope (with reasons)

- **runtime-performance** — a slower-but-correct tree is still *healthy*; throughput regressions are
  measured by the benchmark harness, not the convergence floor. Conflating them would make the floor
  refuse correct edits, breaking the "law, not heuristic" property.
- **semantic-intent-correctness** — whether a well-formed change does what the human *meant* is not
  statically provable. atomic proves the change is well-formed and non-regressing, and surfaces intent
  for human judgment via `product_intent_contract` / `truth_receipt` rather than faking a guarantee.

## Open class-level debts (named, not hidden)

`supply-chain` (non-JS → L07), `fd-socket-lifetime` (explicit proof → L04), `temp-artifact`
(tree-wide hygiene gate → L03), `idempotency` (standalone gate vs folded). Each is a `partial` with a
roadmap pointer — the taxonomy is *closed* (every dimension is named) even where a class is not yet
*fully* enforced.

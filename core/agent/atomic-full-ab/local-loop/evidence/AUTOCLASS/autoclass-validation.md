# MECHANICAL AUTOCLASS (Phase 1) — validation by number (golds, no LLM, no Docker)

## Feasibility: mechanical class-formation IS possible on SWE-bench-Verified
Scan of ALL 500 golds: 34 structural clusters with K>=3 exist (file-basename + func-morpheme).
The earlier "K=0" was an artifact of my 25-instance local subset; the full dataset HAS class-redundancy
(django/sphinx dominate: ('compiler.py','sql')=5, ('expressions.py','sql')=5, ('__init__.py','members')=5, ...).

## weights_autoclass.py forms classes MECHANICALLY (removes the model-partition dependence)
The deepest disk-verified dependence was the CLASS PARTITION (weights_admit.py:155 = "the label the MODEL assigns").
weights_autoclass.autoclass() forms the class BOTTOM-UP by structural-locus collision (shared file-basename AND
shared name-morpheme) over PROVEN resolutions' edited_units — "same class" is now a deterministic function of the
golds, NOT a model verdict. capture_structural_operator() emits a name-agnostic operator (file-basenames + morphemes,
NO specific function names).

## Results
- django compiler.py/sql K=5: autoclass -> 1 cluster, invariant {compiler.py,'sql'}. Leave-one-out structural match 5/5.
- django deletion.py/delete K=3: autoclass -> 1 cluster, invariant {deletion.py,'delete'}. Leave-one-out 3/3.
- PRECISION (compiler.py/sql operator vs all 500): 5/5 matched, 0 false-includes = precision 1.00 (class-specific, NOT generic).

## HONEST scope (what is + isn't proven)
- PROVEN: class formed mechanically (no model label); operator name-agnostic to EXACT names; precision 1.0; structural
  self-consistency leave-one-out (partly tautological — held-out was clustered-in by the same invariant).
- NOT proven: (1) the invariant is still LEXICAL morpheme ('sql' from names), one rung short of pure tree-sitter
  AST-node-type signature (true name-vocabulary-agnosticism); (2) STRUCTURAL match != RESOLUTION LIFT — whether routing
  the model to {compiler.py,'sql'} actually RAISES resolved-rate on a held-out django instance is the next G2 (needs the
  django workspaces built + v4-flash runs). This removes the model-PARTITION dependence at the mechanism level; the lift
  is the pending number.

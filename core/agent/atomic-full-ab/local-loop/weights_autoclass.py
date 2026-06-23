"""weights_autoclass.py — MECHANICAL class formation (Phase 1 of STRUCT-NAV/AUTOCLASS).

The disk-verified deepest dependence of the substrate is the CLASS PARTITION: weights_admit keys
absorption on the class label "the model assigns" (weights_admit.py:155). This module removes that
dependence: it forms classes BOTTOM-UP from the STRUCTURE of PROVEN resolutions (edited_units recovered
deterministically from the gold/green diff), so "same class" becomes a CHECKABLE structural fact, not a
model verdict. Pure, deterministic, CPU, no LLM.

HONEST SCOPE (the abstraction axis): the structural-locus key below is lexical-morpheme + file-basename +
edit-shape. That is a one-time, class-AGNOSTIC inductive bias (a fixed feature alphabet), far weaker than a
per-class name list a strong model authors. It is "reduced from per-class strong abstraction to a per-substrate
structural prior", NOT "removed". A purer version would key on the full tree-sitter AST node-type histogram of
the edited subtree; morphemes are the cheap first cut.
"""
import re


def _morphemes(name):
    """snake_case / camelCase name -> set of >=3-char morpheme tokens (the lexical shape, name-fragment level)."""
    if not name:
        return frozenset()
    parts = re.split(r"[_\W]+", re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name))
    return frozenset(t.lower() for t in parts if len(t) >= 3)


def edited_units_from_diff(diff):
    """Deterministic recovery of (file, enclosing_symbol) from a unified diff's hunk-header function context."""
    out = []
    cur = None
    for l in diff.splitlines():
        if l.startswith("diff --git "):
            mf = re.search(r" b/(.+)$", l)
            cur = mf.group(1) if mf else None
        elif l.startswith("@@") and cur and cur.endswith(".py"):
            hm = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)", l)
            if hm:
                fn = re.search(r"(?:def|class)\s+([A-Za-z_]\w*)", hm.group(2))
                out.append({"file": cur, "basename": cur.rsplit("/", 1)[-1],
                            "enclosing": fn.group(1) if fn else None})
    return out


def structural_locus_key(edited_units):
    """The checkable structural identity of a resolution: shared (file-basename, func-morphemes)."""
    basenames = frozenset(u["basename"] for u in edited_units)
    morphs = frozenset().union(*[_morphemes(u["enclosing"]) for u in edited_units]) if edited_units else frozenset()
    return {"basenames": basenames, "morphemes": morphs}


def autoclass(resolutions):
    """resolutions: [{id, edited_units}]. Group by structural-locus COLLISION (shared basename AND shared
    morpheme). Returns clusters: [{members:[ids], invariant:{basenames,morphemes}}]. A class is a structural
    fact here, not a model label. Union-find over pairwise collisions; the invariant is the INTERSECTION."""
    keys = {r["id"]: structural_locus_key(r["edited_units"]) for r in resolutions}
    ids = list(keys)
    parent = {i: i for i in ids}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def collide(a, b):
        ka, kb = keys[a], keys[b]
        return bool(ka["basenames"] & kb["basenames"]) and bool(ka["morphemes"] & kb["morphemes"])

    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if collide(ids[i], ids[j]):
                parent[find(ids[i])] = find(ids[j])

    groups = {}
    for i in ids:
        groups.setdefault(find(i), []).append(i)
    clusters = []
    for members in groups.values():
        if len(members) < 2:
            continue
        inv_b = frozenset.intersection(*[keys[m]["basenames"] for m in members])
        inv_m = frozenset.intersection(*[keys[m]["morphemes"] for m in members])
        clusters.append({"members": sorted(members),
                         "invariant": {"basenames": sorted(inv_b), "morphemes": sorted(inv_m)}})
    return clusters


def capture_structural_operator(cluster_members_units):
    """Emit a NAME-AGNOSTIC structural operator from the cluster's invariant intersection. cluster_members_units:
    [edited_units, ...] for the CAPTURE instances only (held-out excluded). The operator carries NO specific
    function names — only the shared file-basename(s) and morpheme(s) — so it is name-agnostic by construction."""
    keys = [structural_locus_key(u) for u in cluster_members_units]
    inv_b = sorted(frozenset.intersection(*[k["basenames"] for k in keys])) if keys else []
    inv_m = sorted(frozenset.intersection(*[k["morphemes"] for k in keys])) if keys else []
    return {"op": "locate_decision_predicate_structural",
            "file_basenames": inv_b,
            "name_morphemes": inv_m,
            "top_k": 3, "read_lines": 50}


def operator_matches(op, held_out_units):
    """Falsifiable structural-generalization check: does the mechanically-captured operator's invariant match
    the HELD-OUT instance's locus? (Would it route the model to the right file + name-shape it never saw.)"""
    k = structural_locus_key(held_out_units)
    file_hit = bool(set(op["file_basenames"]) & k["basenames"])
    morph_hit = bool(set(op["name_morphemes"]) & k["morphemes"])
    return {"file_hit": file_hit, "morph_hit": morph_hit, "matches": file_hit and morph_hit}

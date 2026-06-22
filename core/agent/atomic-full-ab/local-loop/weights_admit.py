#!/usr/bin/env python3
"""Proof-carrying WEIGHT ADMISSION engine — the operator-as-compressor mechanics (deterministic, CPU, no LLM).

A weight is a generalized resolution operator: {class, trigger, strategy, instances:[...], proof_n}.
The corpus of operators IS the weight bank. This engine implements the three operator laws from the doctrine,
each as a DETERMINISTIC, checkable rule (no model needed to run/verify them):

  LAW 1 — capture N, not one:   a resolution whose ESSENCE matches an existing operator is ABSORBED into it
                                (instance appended, proof_n++), never duplicated.
  LAW 2 — born under necessity: a NEW operator is created ONLY when no existing operator absorbs the resolution
                                (no class/trigger match) — minimality at the meta level.
  LAW 3 — monotonic fidelity:   any operator self-update must keep EVERY already-captured instance still matching
                                (trigger covers it) — compressing more can never drop an essence already held.

"Essence match" here is the deterministic proxy the substrate can check on CPU: same class label, OR the new
resolution's signal text is covered by an existing operator's trigger (the trigger is the operator's recall index).
Semantic re-compression of the strategy text (merging two surface-different solutions into a tighter operator) is the
LLM-assisted step layered ON TOP — but admission/necessity/fidelity are provable without any model, which is the point.
"""
import json, os, re, sys


def load(path):
    return [json.loads(l) for l in open(path)] if os.path.exists(path) else []


def save(path, weights):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        for w in weights:
            f.write(json.dumps(w) + "\n")
    os.replace(tmp, path)


def _covers(operator, signal):
    """Does this operator's trigger recall (cover) this signal text? The deterministic essence-match proxy."""
    trig = operator.get("trigger")
    return bool(trig) and re.search(trig, signal or "", re.I) is not None


def admit(resolution, weights):
    """LAW 1 + LAW 2. resolution = {class, trigger, strategy, instance, signal}.
    Each captured instance is stored as {id, signal} so fidelity is a CONCRETE per-instance battery (LAW 3).
    Returns (action, weights) where action in {'absorbed', 'created'}. Pure function of (resolution, weights)."""
    cls = resolution["class"]
    signal = resolution.get("signal", resolution.get("instance", ""))
    rec = {"id": resolution.get("instance", ""), "signal": signal}
    # LAW 1 essence-match is by CLASS LABEL (the semantic identity the model assigns) — NOT trigger overlap. The
    # trigger is a RETRIEVAL index (recall), not an essence identity: two distinct-essence operators (e.g. navigation
    # vs path-normalization) can share trigger tokens, and absorbing on overlap would wrongly merge them. Absorb only
    # on same class; a new class label = a new operator (necessity, LAW 2). Semantic same-essence-different-class
    # merging is the MODEL's job (it re-tags or proposes a compression), verified by admit_merge under proof-of-gain.
    for w in weights:
        if w["class"] == cls:
            insts = w.setdefault("instances", [])
            if rec["id"] and rec["id"] not in [i.get("id") if isinstance(i, dict) else i for i in insts]:
                insts.append(rec)
                w["proof_n"] = len(insts)            # proof_n grows with captured solutions (LAW 1)
            return "absorbed", weights               # never duplicate
    # LAW 2: necessity — no operator absorbs it → create a new one
    new = {"class": cls, "trigger": resolution.get("trigger", ""), "strategy": resolution["strategy"],
           "instances": [rec] if rec["id"] else [], "proof_n": 1 if rec["id"] else 0}
    weights.append(new)
    return "created", weights


def _signals(operator):
    """Every captured instance's recall signal (handles legacy string instances + new {id,signal} dicts)."""
    out = []
    for i in operator.get("instances", []):
        out.append(i.get("signal", "") if isinstance(i, dict) else str(i))
    return [s for s in out if s]


def verify_fidelity(weights):
    """LAW 3 (concrete battery) — every captured instance's RECALL SIGNAL must still match its operator's trigger.
    Returns (ok, failures). A captured essence the operator can no longer recall = fidelity regression = REJECT."""
    failures = []
    for w in weights:
        trig = w.get("trigger")
        if not trig:
            continue
        for sig in _signals(w):
            if not re.search(trig, sig, re.I):
                failures.append({"class": w["class"], "lost_signal": sig})
    return (len(failures) == 0), failures


def self_improve(operator, new_strategy=None, new_trigger=None):
    """Re-formalize an operator to compress more — ADMITTED ONLY UNDER PROOF OF GAIN, on a COPY first (atomicity):
    (a) total description shorter or equal (−consumption: strategy and/or trigger), AND (b) the new trigger STILL
    recalls every captured signal (monotonic fidelity — concrete battery). Mutates operator ONLY if proven; else
    returns the rejection reason and leaves it untouched. Never weakens."""
    cand_strategy = new_strategy if new_strategy is not None else operator["strategy"]
    cand_trigger = new_trigger if new_trigger is not None else operator.get("trigger", "")
    old_len = len(operator["strategy"]) + len(operator.get("trigger", ""))
    new_len = len(cand_strategy) + len(cand_trigger)
    if new_len > old_len:
        return False, f"rejected: larger description ({new_len} > {old_len}) — no consumption gain"
    # fidelity battery: candidate trigger must still recall every captured signal
    for sig in _signals(operator):
        if cand_trigger and not re.search(cand_trigger, sig, re.I):
            return False, f"rejected: fidelity regression — candidate no longer recalls signal {sig!r}"
    operator["strategy"], operator["trigger"] = cand_strategy, cand_trigger
    return True, f"admitted: description −{old_len - new_len} chars, fidelity preserved over {operator['proof_n']} instance(s)"


def compression_candidates(weights, min_shared=2):
    """Detect operator clusters that SHARE ESSENCE (overlapping trigger tokens) — merge candidates (deterministic).
    Returns list of index-lists. The substrate proposes a merge only for these; necessity (LAW 2) keeps the rest split."""
    toks = [set(re.split(r"[|]", w.get("trigger", ""))) - {""} for w in weights]
    clusters, used = [], set()
    for i in range(len(weights)):
        if i in used:
            continue
        grp = [i]
        for j in range(i + 1, len(weights)):
            if j in used:
                continue
            if len(toks[i] & toks[j]) >= min_shared:
                grp.append(j); used.add(j)
        if len(grp) > 1:
            used.add(i); clusters.append(grp)
    return clusters


def admit_merge(members, meta_strategy, meta_trigger, meta_class, weights):
    """LAW 1 at the META level (poucos operadores, cada um cobrindo muito): replace N essence-sharing operators with
    ONE — ADMITTED ONLY UNDER PROOF OF GAIN: (a) the meta's description is SMALLER than the members' combined, AND
    (b) the meta's trigger STILL recalls EVERY captured signal of EVERY member (monotonic fidelity). Atomic: verifies
    on a candidate before mutating. Returns (admitted, proof_or_reason, new_weights)."""
    old_desc = sum(len(m["strategy"]) + len(m.get("trigger", "")) for m in members)
    new_desc = len(meta_strategy) + len(meta_trigger)
    if new_desc >= old_desc:
        return False, f"rejected: not smaller ({new_desc} >= {old_desc})", weights
    all_sigs = [s for m in members for s in _signals(m)]
    for s in all_sigs:
        if not re.search(meta_trigger, s, re.I):
            return False, f"rejected: fidelity regression — meta no longer recalls {s!r}", weights
    insts = [i for m in members for i in m.get("instances", [])]
    meta = {"class": meta_class, "trigger": meta_trigger, "strategy": meta_strategy,
            "instances": insts, "proof_n": len(insts), "absorbed": [m["class"] for m in members]}
    kept = [w for w in weights if w not in members]
    kept.append(meta)
    pct = 100 * (old_desc - new_desc) // old_desc
    return True, f"admitted: {len(members)} operators -> 1, description -{old_desc - new_desc} chars ({pct}% smaller), fidelity preserved over {len(all_sigs)} signal(s)", kept


# ----- deterministic self-test (no LLM) -----
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--selftest":
        W = load(os.path.join(os.path.dirname(__file__), ".corpus", "weights.jsonl"))
        n0 = len(W)
        # LAW 1: a 2nd cross-file instance (different repo, same essence) ABSORBS, not duplicates — signal stored
        _, W = admit({"class": "CROSS-FILE-ROOT-CAUSE-VIA-DECISION-PREDICATE", "trigger": "ignore|filter",
                      "strategy": "(same essence)", "instance": "django-discover-excludes",
                      "signal": "files not excluded by filter recursively"}, W)
        absorbed = (len(W) == n0)
        op = next(w for w in W if w["class"] == "CROSS-FILE-ROOT-CAUSE-VIA-DECISION-PREDICATE")
        # LAW 2: a genuinely new class (no trigger match) CREATES under necessity
        _, W = admit({"class": "OFF-BY-ONE-BOUNDARY", "trigger": "boundary|fencepost|len.?1|inclusive",
                      "strategy": "check inclusive vs exclusive bounds at the edge index",
                      "instance": "numpy-slice-edge", "signal": "slice drops last boundary element"}, W)
        created = (len(W) == n0 + 1)
        # LAW 3 / proof-of-gain: a SHORTER strategy is admitted; a LONGER one rejected (description size)
        ok_short, r1 = self_improve(op, new_strategy=op["strategy"][: max(40, len(op["strategy"]) - 50)])
        ok_long, r2 = self_improve(op, new_strategy=op["strategy"] + " ... extra verbiage that adds length")
        # LAW 3 CONCRETE BATTERY: a trigger re-formalization that DROPS a captured signal is REJECTED (fidelity),
        # even though it is SHORTER. The django instance's signal "files not excluded by filter recursively" must
        # still be recalled — a trigger of just "ignore" (shorter) no longer matches it → must reject.
        ok_break, r3 = self_improve(op, new_trigger="ignore")   # shorter but drops the 'filter' signal → reject
        # and a trigger that stays faithful (covers all signals) + shorter is admitted
        ok_keep, r4 = self_improve(op, new_trigger="ignore|filter|exclud")
        fid_ok, fails = verify_fidelity(W)
        print("LAW1 absorb (2nd same-essence → no new operator):", absorbed, "| operator now holds", op["proof_n"], "instance(s)")
        print("LAW2 necessity (new class → new operator):       ", created)
        print("LAW3 proof-of-gain (shorter strategy admitted):  ", ok_short, "|", r1[:55])
        print("LAW3 proof-of-gain (longer strategy rejected):   ", (not ok_long), "|", r2[:55])
        print("LAW3 BATTERY (trigger dropping a signal REJECTED):", (not ok_break), "|", r3[:60])
        print("LAW3 BATTERY (faithful shorter trigger admitted): ", ok_keep, "|", r4[:55])
        print("monotonic fidelity intact (concrete per-signal):  ", fid_ok, "" if fid_ok else fails)

        # ---- COMPRESSION LAW (meta-minimality): N essence-sharing operators -> 1, smaller, fidelity preserved ----
        B = load(os.path.join(os.path.dirname(__file__), ".corpus", "weights.jsonl"))
        upstream = {"CROSS-FILE-ROOT-CAUSE-VIA-DECISION-PREDICATE": "ignore-paths not excluded recursively by the filter predicate",
                    "FIX-AT-WRITE-SITE-NOT-READ-SITE": "marks read are stale because stored wrong at the registration site",
                    "DISPATCH-HANDLER-LIVES-IN-REGISTRY-FILE": "is_subset wrong for a type because its dispatch handler is missing"}
        for w in B:
            if w["class"] in upstream:
                w["instances"] = [{"id": w["class"].lower(), "signal": upstream[w["class"]]}]; w["proof_n"] = 1
        members = [w for w in B if w["class"] in upstream]
        meta_trigger = ("ignore|filter|exclud|discover|path|recursiv|match|skip|mark|attribute|store|inherit|mro|"
                        "registr|stale|propagat|dispatch|singledispatch|overload|generic|handler|visitor")
        meta_strategy = ("The bug's ROOT is usually NOT where the wrong behavior is OBSERVED — it is UPSTREAM, at the "
                         "site that DECIDES, STORES, or REGISTERS the behavior. Trace from symptom to that site and fix "
                         "there: (a) wrong filter/discovery -> a DECISION PREDICATE (is_X/should_Y/_ignore), often in "
                         "another file; (b) a value wrong at READ time -> the WRITE/STORE/REGISTER site, so it is right "
                         "for ALL readers; (c) a type wrong in a dispatched generic -> the HANDLER that registers that "
                         "type. Use atomic_callers/atomic_grep to reach the site; fix the small decision, not the symptom.")
        cands = compression_candidates(B)
        merged_ok, mproof, _ = admit_merge(members, meta_strategy, meta_trigger, "ROOT-IS-UPSTREAM-OF-SYMPTOM", B)
        print("COMPRESSION detect (essence-sharing cluster found):", any(len(c) >= 3 for c in cands))
        print("COMPRESSION admit (3 operators -> 1, proof-of-gain):", merged_ok, "|", mproof[:62])
        print("ALL LAWS HOLD:", absorbed and created and ok_short and (not ok_long) and (not ok_break) and ok_keep and fid_ok and merged_ok)

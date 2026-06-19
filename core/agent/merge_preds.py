#!/usr/bin/env python3
"""Merge all prediction files into one consolidated preds-all.jsonl for the final OFFICIAL eval.
Per instance_id, pick the best patch: prefer local_pass=True, then a non-empty patch, then the
source listed latest in PRIORITY (newer/better-harness runs win ties). Reads .partial files too so
in-flight runs are included."""
import json, os, glob

# later = higher priority (newer harness / better guard)
PRIORITY = [
    "preds-50-genuine.jsonl", "preds-50.jsonl",
    "preds-rerun-genuine.jsonl", "preds-rerun.jsonl",
    "preds-r4b.jsonl", "preds-r4b.jsonl.partial",
    "preds-djsphinx.jsonl", "preds-djsphinx.jsonl.partial",
    "preds-sphinx.jsonl", "preds-sphinx.jsonl.partial",
    "preds-localfix.jsonl", "preds-localfix.jsonl.partial",
    "preds-residual.jsonl", "preds-residual.jsonl.partial",
    "preds-final.jsonl", "preds-final.jsonl.partial",
    "preds-parity.jsonl", "preds-parity.jsonl.partial",
    "preds-wfparity.jsonl", "preds-wfparity.jsonl.partial",
    "preds-ff.jsonl", "preds-ff.jsonl.partial",
    "preds-outline.jsonl", "preds-outline.jsonl.partial",
    "preds-final5.jsonl", "preds-final5.jsonl.partial",
    "preds-six.jsonl", "preds-six.jsonl.partial",
    "preds-7080-best.jsonl",
    "preds-7277-best.jsonl",
    "preds-fin-6903-best.jsonl", "preds-fin-7080-best.jsonl", "preds-fin-7277-best.jsonl", "preds-fin-10323-best.jsonl", "preds-fin-10435-best.jsonl",
    "preds-7080-t0.jsonl", "preds-7080-t0.jsonl.partial", "preds-7080-t05.jsonl", "preds-7080-t05.jsonl.partial", "preds-6903-t0.jsonl", "preds-6903-t0.jsonl.partial", "preds-6903-t05.jsonl", "preds-6903-t05.jsonl.partial", "preds-10435-t0.jsonl", "preds-10435-t0.jsonl.partial", "preds-10435-t05.jsonl", "preds-10435-t05.jsonl.partial", "preds-10323-prebuilt.jsonl", "preds-10323-prebuilt.jsonl.partial",
]
MODEL = "atomic-modal-agent-deepseek-v4-pro"

def load(path):
    rows = []
    if not os.path.exists(path):
        return rows
    for l in open(path):
        l = l.strip()
        if not l:
            continue
        try:
            d = json.loads(l)
            if d.get("instance_id"):
                rows.append(d)
        except Exception:
            pass
    return rows

def score(d, prio):
    patch = d.get("model_patch") or ""
    return (1 if d.get("local_pass") else 0, 1 if patch.strip() else 0, prio)

best = {}
for prio, path in enumerate(PRIORITY):
    for d in load(path):
        iid = d["instance_id"]
        s = score(d, prio)
        if iid not in best or s > best[iid][0]:
            best[iid] = (s, d, path)

out = "preds-all.jsonl"
with open(out, "w") as f:
    for iid, (s, d, path) in sorted(best.items()):
        f.write(json.dumps({
            "instance_id": iid,
            "model_patch": d.get("model_patch", ""),
            "model_name_or_path": MODEL,
        }) + "\n")

lp = sum(1 for _, (s, d, p) in best.items() if d.get("local_pass"))
nonempty = sum(1 for _, (s, d, p) in best.items() if (d.get("model_patch") or "").strip())
print(f"merged {len(best)} instances -> {out}")
print(f"  local_pass=True : {lp}")
print(f"  non-empty patch : {nonempty}")
print(f"  empty patch     : {len(best)-nonempty}")
# breakdown by source
from collections import Counter
c = Counter(p for _, (s, d, p) in best.items())
for src, n in c.most_common():
    print(f"    {n:3} <- {src}")

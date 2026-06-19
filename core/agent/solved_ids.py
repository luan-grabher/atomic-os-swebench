#!/usr/bin/env python3
"""Print instance_ids already SOLVED (local_pass=True) OR already attempted-with-nonempty-patch,
scanning every preds-*.jsonl / .partial / .detail in cwd. Drives two-pass resume: subtract this
set from the full 500 to get the unresolved set the next (more expensive) pass should target.

  python3 solved_ids.py --solved   > solved.txt    # local_pass=True only (true wins)
  python3 solved_ids.py --attempted > attempted.txt # any non-empty patch (don't re-run pass-1)
Then:  comm -23 <(sort all500.txt) <(sort solved.txt) > unresolved.txt
"""
import json, glob, sys, os

mode = "--solved" if "--solved" in sys.argv or len(sys.argv) == 1 else "--attempted"

def rows(path):
    if path.endswith(".detail"):
        try:
            for d in json.load(open(path)):
                yield d
        except Exception:
            return
    else:
        for l in open(path, errors="ignore"):
            l = l.strip()
            if not l:
                continue
            try:
                yield json.loads(l)
            except Exception:
                pass

hit = set()
for path in glob.glob("preds-*.jsonl") + glob.glob("preds-*.jsonl.partial") + glob.glob("preds-*.jsonl.detail"):
    if not os.path.exists(path):
        continue
    for d in rows(path):
        iid = d.get("instance_id")
        if not iid:
            continue
        if mode == "--solved":
            if d.get("local_pass"):
                hit.add(iid)
        else:  # --attempted
            if (d.get("model_patch") or "").strip():
                hit.add(iid)

for iid in sorted(hit):
    print(iid)

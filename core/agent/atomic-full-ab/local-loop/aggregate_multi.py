#!/usr/bin/env python3
"""
aggregate_multi.py — aggregate multi-sample atomic runs (median + min-max range) vs the frozen native
baseline. Separates representation signal from DeepSeek exploration variance (the measurement-fidelity fix).

Usage: python3 aggregate_multi.py evidence/<tag> [--baseline native_baseline_suite.json]
"""
import json, os, sys, re, argparse, statistics

def short_id(task):
    m = re.search(r"SWE-([^/]+)/PROBLEM", task or "")
    return m.group(1) if m else ""

def calls(d): return sum(d.get("tool_calls", {}).values())

def friction(d):
    msgs = d.get("messages", [])
    dsml = sum(1 for m in msgs if m.get("role")=="assistant" and "DSML" in (m.get("content") or ""))
    wrong = sum(1 for m in msgs if m.get("role")=="tool" and "not a regular file" in (m.get("content") or ""))
    return dsml, wrong

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--baseline", default="native_baseline_suite.json")
    a = ap.parse_args()
    base = {}
    if os.path.exists(a.baseline):
        base = json.load(open(a.baseline)).get("instances", {})
    # group sample files by instance
    byinst = {}
    for fn in sorted(os.listdir(a.dir)):
        if not fn.endswith(".json"): continue
        if "__atomic" not in fn: continue
        d = json.load(open(os.path.join(a.dir, fn)))
        iid = short_id(d.get("task","")) or fn.split("__atomic")[0]
        byinst.setdefault(iid, []).append(d)
    print(f"\n{'instance':<22}{'n':>3}{'calls(med)':>11}{'range':>9}{'native':>8}{'winner':>9}{'edits':>7}{'DSML':>6}{'wrongP':>8}")
    tot_med = 0; tot_nat = 0; wins=0; losses=0; ties=0
    for iid in sorted(byinst):
        runs = byinst[iid]
        cs = sorted(calls(d) for d in runs)
        med = statistics.median(cs)
        edits = statistics.median(d.get("edits_applied",0) for d in runs)
        frs = [friction(d) for d in runs]
        dsml = sum(x[0] for x in frs); wrong = sum(x[1] for x in frs)
        short = iid.split("__")[-1] if "__" in iid else iid
        bkey = next((k for k in base if k in iid or iid.endswith(k)), None)
        nat = base.get(bkey,{}).get("tool_uses") if bkey else None
        win = "?" if nat is None else ("ATOMIC" if med < nat else ("native" if med > nat else "tie"))
        if nat is not None:
            tot_med += med; tot_nat += nat
            if med < nat: wins+=1
            elif med > nat: losses+=1
            else: ties+=1
        rng = f"{cs[0]}-{cs[-1]}"
        print(f"{short:<22}{len(runs):>3}{med:>11}{rng:>9}{str(nat):>8}{win:>9}{edits:>7}{dsml:>6}{wrong:>8}")
    print(f"{'TOTAL(median sum)':<22}{'':>3}{tot_med:>11}{'':>9}{tot_nat:>8}"
          f"{('ATOMIC' if tot_med<tot_nat else 'native' if tot_med>tot_nat else 'tie'):>9}")
    print(f"\nper-instance: ATOMIC wins {wins}, native wins {losses}, ties {ties}  "
          f"(median tool-calls; lower=better; DSML+wrongP should be 0 = walls demolished)")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""coupling_cover_z3.py - PARADIGM Phase 2: provably-MINIMAL invariant cover via z3 Optimize.

Reads JSON {"couplings": [[antecedent, consequent], ...]} on stdin (the held-out-validated
informative couplings the hypothesis generator mined). Models a minimum set-cover: choose the
fewest CONSEQUENT invariants such that every distinct ANTECEDENT wall-hit is covered by at
least one chosen consequent it is coupled with. z3 Optimize proves minimality (unlike the
greedy planner, which is only near-optimal). Prints JSON and exits 0 on a proven optimum.

This is a genuine z3 value-add: the OPTIMALITY GUARANTEE the greedy heuristic cannot give.
"""
import sys
import json

try:
    from z3 import Bool, Optimize, Or, If, Sum, sat
except Exception as e:  # z3 not importable -> honest ABSENT, never a faked optimum
    print(json.dumps({"status": "ABSENT", "detail": "z3 python module unavailable: %s" % e}))
    sys.exit(2)


def main():
    data = json.load(sys.stdin)
    couplings = data.get("couplings", [])
    cons = sorted({c for _, c in couplings})
    ants = sorted({a for a, _ in couplings})
    covers = {c: {a for a, cc in couplings if cc == c} for c in cons}
    if not ants:
        print(json.dumps({"status": "EMPTY", "optimal": [], "size": 0, "universe": 0, "optimal_proven": True}))
        sys.exit(0)
    sel = {c: Bool("sel_%d" % i) for i, c in enumerate(cons)}
    opt = Optimize()
    for a in ants:
        opt.add(Or([sel[c] for c in cons if a in covers[c]]))
    opt.minimize(Sum([If(sel[c], 1, 0) for c in cons]))
    if opt.check() == sat:
        m = opt.model()
        chosen = [c for c in cons if m[sel[c]]]
        print(json.dumps({"status": "PROVEN", "optimal": chosen, "size": len(chosen),
                          "universe": len(ants), "optimal_proven": True}))
        sys.exit(0)
    print(json.dumps({"status": "UNSAT", "optimal": None, "reason": "no cover exists"}))
    sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""WAVE C2 de-risk: prove node-in-sandbox + governed-edit + no-proof refusal on ONE real prebuilt
swebench image (astropy-12907). Reuses the harness's own _atomic_provision + sb_atomic_str_replace
so it is a faithful rehearsal of the ON arm. Boots ONE sandbox, measures conda-install latency,
applies one GOVERNED additive edit (admitted) and one byte-REMOVING edit WITHOUT proof (must be
REFUSED). Terminates the sandbox. Prints a JSON report."""
import os, time, json
os.environ.setdefault("USE_PREBUILT", "1")
os.environ["ATOMIC"] = "on"
import modal
from swebench.harness.test_spec.test_spec import make_test_spec
from datasets import load_dataset

import swe_modal_agent as H  # reuse the EXACT harness functions

IID = "astropy__astropy-12907"

def main():
    rep = {"iid": IID}
    ds = load_dataset("princeton-nlp/SWE-bench_Verified", split="test")
    inst = next(dict(r) for r in ds if r["instance_id"] == IID)
    ts = make_test_spec(inst)
    img = H.build_instance_image(ts)
    sb = None
    t_boot = time.time()
    try:
        sb = modal.Sandbox.create("sleep", "infinity", image=img, app=H.APP, timeout=1800, cpu=2, memory=4096)
        rep["boot_s"] = round(time.time() - t_boot, 1)
        # node already present? then conda-install is skipped; measure provisioning end-to-end.
        nb_pre, _ = H.sbexec(sb, "command -v node || true")
        rep["node_pre_present"] = bool((nb_pre or "").strip())
        t_prov = time.time()
        node_bin = H._atomic_provision(sb, IID)   # conda install + bundle stage + selftest
        rep["provision_s"] = round(time.time() - t_prov, 1)
        rep["node_bin"] = node_bin
        ver, _ = H.sbexec(sb, f"{node_bin} --version 2>&1 || true")
        rep["node_version"] = ver.strip()

        # Make a throwaway target python file in /testbed (NOT a real source file).
        H.sb_write(sb, "/testbed/_derisk.py", "def f(x):\n    y = x + 1\n    return y\n")

        # (A) ADDITIVE governed edit — pure addition, no proof needed → must be ADMITTED.
        addit = H.sb_atomic_str_replace(
            sb, node_bin, "/testbed/_derisk.py",
            old="    return y\n",
            new="    y = y * 2  # governed-additive\n    return y\n",
            proof="", block_files=[])
        rep["edit_additive_result"] = addit
        rep["edit_additive_admitted"] = addit.startswith("OK")

        # (B) BYTE-REMOVING edit WITHOUT proof — must be REFUSED (NEGATIVE_BYTES governance).
        remov = H.sb_atomic_str_replace(
            sb, node_bin, "/testbed/_derisk.py",
            old="    y = x + 1\n",
            new="    y=x+1\n",          # strictly fewer bytes, no proof
            proof="", block_files=[])
        rep["edit_removal_noproof_result"] = remov
        rep["edit_removal_refused"] = remov.startswith("REFUSED")
        rep["edit_removal_is_negbytes"] = "governance" in remov.lower() and "remove" in remov.lower()

        # (C) same removal WITH a proof — should now be ADMITTED (proves the governance is a real gate,
        #     not a blanket block). Re-read current file state first since (A) changed it.
        remov_ok = H.sb_atomic_str_replace(
            sb, node_bin, "/testbed/_derisk.py",
            old="    y = x + 1\n",
            new="    y=x+1\n",
            proof="whitespace normalization of a dead-equivalent assignment; removed bytes are pure formatting",
            block_files=[])
        rep["edit_removal_withproof_result"] = remov_ok
        rep["edit_removal_withproof_admitted"] = remov_ok.startswith("OK")
    finally:
        if sb is not None:
            try: sb.terminate()
            except Exception: pass
        rep["total_wall_s"] = round(time.time() - t_boot, 1)
    print("DERISK_REPORT " + json.dumps(rep, indent=2))

if __name__ == "__main__":
    main()

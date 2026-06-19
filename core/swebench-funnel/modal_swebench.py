"""
modal_swebench.py — atomic ON/OFF on the SWE-bench family, per-instance truth funnel on Modal.

For each (instance, mode) one Modal container spins a modal.Sandbox FROM THE OFFICIAL per-instance image
(docker.io/swebench/sweb.eval.x86_64.<id>:latest — has /testbed @ base_commit + the `testbed` conda env) and:

  - mode 'baseline' (atomic OFF): ONE DeepSeek shot → extract patch → return it. Today's score.
  - mode 'atomic'   (atomic ON):  the truth funnel (PART F). The model first writes a REPRODUCTION test from
                                  the PUBLIC problem statement (self-derived). Then it iterates the patch
                                  byte-positively against the HONEST visible signal — a PASS_TO_PASS regression
                                  sample + that self-test — with GRANULAR feedback (which visible tests fail).
                                  FAIL_TO_PASS (the hidden target) is NEVER run here — the driver does not even
                                  pass it into the container; it is scored ONLY afterward by the official
                                  harness. This is what makes the delta(ON,OFF) irrefutable, not a loophole.

The delta = resolved(atomic preds) − resolved(baseline preds), same model + budget, computed by the OFFICIAL
`swebench.harness.run_evaluation` over the two predictions.json this writes. The funnel only changes GENERATION.

Honest limits (logged, not hidden): the in-loop visible-test parser reads pytest `-rA` summary lines, so the
SMOKE is restricted to pytest repos (the FINAL FAIL_TO_PASS scoring via the official harness handles all repo
types, so the headline number is not limited by this). A SWE-bench answer is a monolithic patch → the funnel's
byte-positive answer-unit freeze does not apply; only granular feedback survives (per-hunk freeze = dossier N1).

Run (validate ONE instance baseline first — cheapest real check of the sandbox/image/test plumbing):
  modal run modal_swebench.py --dataset princeton-nlp/SWE-bench_Lite --n 1 --modes baseline --budget 1
  modal run modal_swebench.py --dataset princeton-nlp/SWE-bench_Lite --n 10 --modes baseline,atomic --budget 6
"""
import json
import os
import re
import time
import urllib.request
import urllib.error
import modal

app = modal.App("atomic-swebench-funnel")
driver_image = modal.Image.debian_slim(python_version="3.11")  # the function itself only needs stdlib + modal

MODEL = "deepseek-v4-pro"
ENDPOINT = "https://api.deepseek.com/chat/completions"
SELFTEST_PATH = "test_atomic_repro.py"
# official eval-script activation pattern (two-step): source the base, then `conda activate testbed`.
ENV_PREFIX = "source /opt/miniconda3/bin/activate 2>/dev/null && conda activate testbed 2>/dev/null; "


# ─────────────────────────── DeepSeek proposer (same proven client as modal_funnel.py) ───────────────────────────
def deepseek_chat(messages, max_tokens=None, temperature=0.6, max_retries=6):
    # v4-pro is a REASONING model (CoT in reasoning_content, answer in content). A max_tokens cap that the CoT
    # exhausts leaves content EMPTY (finish_reason=length). Per operator: token budget is UNLIMITED — omit
    # max_tokens entirely so the model uses its full output capacity (only set it if a caller explicitly caps).
    key = os.environ["DEEPSEEK_API_KEY"]
    payload = {"model": MODEL, "messages": messages, "temperature": temperature}
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    body = json.dumps(payload).encode()
    last = None
    for attempt in range(max_retries + 1):
        req = urllib.request.Request(ENDPOINT, data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                d = json.loads(r.read())
                u = d.get("usage", {})
                ch = d["choices"][0]
                return ch["message"].get("content", "") or "", u.get("prompt_tokens", 0), u.get("completion_tokens", 0), ch.get("finish_reason", "")
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429 or e.code >= 500:
                try: e.read()
                except Exception: pass
                time.sleep(min(2 * 2 ** attempt, 30)); continue
            raise
        except Exception as e:
            last = e
            time.sleep(min(2 * 2 ** attempt, 30))
    raise last or RuntimeError("deepseek failed")


def extract_diff(text):
    t = text or ""
    # if the model fenced the diff (```diff ... ``` / ```patch ... ```), unwrap the fence body first
    m = re.search(r"```(?:diff|patch)?\s*([\s\S]*?)```", t, re.I)
    if m and ("diff --git" in m.group(1) or "\n--- " in ("\n" + m.group(1))):
        t = m.group(1)
    i = t.find("diff --git ")
    if i >= 0:
        return t[i:].strip() + "\n"
    # fallback: a bare unified diff that starts at the first '--- ' file header
    j = t.find("--- ")
    if j >= 0 and "+++ " in t[j:]:
        return t[j:].strip() + "\n"
    return ""


def extract_code_block(text):
    m = re.search(r"```(?:python)?\s*([\s\S]*?)```", text, re.I)
    return (m.group(1) if m else "").strip()


# ─────────────────────────── prompts ───────────────────────────
def patch_prompt(inst, prior, rejected):
    base = (
        f"You are fixing a bug in the {inst['repo']} repository.\n\n"
        f"<issue>\n{inst['problem_statement']}\n</issue>\n\n"
        "Produce the SMALLEST production-code patch that fixes the issue. Do NOT edit tests. "
        "Return ONLY a unified git diff that starts with 'diff --git'."
    )
    msgs = [{"role": "user", "content": base}]
    if prior and rejected:
        msgs.append({"role": "assistant", "content": prior})
        lines = "\n".join(f"  - {r}" for r in rejected)
        msgs.append({"role": "user", "content":
            f"After your patch these VISIBLE tests still fail:\n{lines}\n"
            "Revise the unified diff so they pass WITHOUT breaking any currently-passing test. "
            "Return ONLY the corrected unified git diff."})
    return msgs


def selftest_prompt(inst):
    return [{"role": "user", "content":
        f"You are reproducing a bug in {inst['repo']} so a fix can be verified.\n\n"
        f"<issue>\n{inst['problem_statement']}\n</issue>\n\n"
        f"Write a self-contained pytest file (it will be saved as {SELFTEST_PATH} at the repo root) with one or "
        "more test functions that FAIL on the current buggy code and PASS once the issue is fixed. Use only the "
        "public API described in the issue. Return ONLY the python code in a ```python block."}]


# ─────────────────────────── pytest -rA parsing (parser-independent; nodeids match PASS_TO_PASS) ──────────────────
def parse_pytest(out):
    res = {}
    for line in out.splitlines():
        m = re.match(r"(PASSED|FAILED|ERROR)\s+(\S+)", line.strip())
        if m:
            res[m.group(2)] = "pass" if m.group(1) == "PASSED" else "fail"
    return res


# ─────────────────────────── sandbox helpers ───────────────────────────
def sh(sb, cmd, timeout=600):
    p = sb.exec("bash", "-c", cmd, timeout=timeout)
    out = p.stdout.read()
    err = p.stderr.read()
    p.wait()
    return out, err, p.returncode


def write_file(sb, path, content):
    with sb.open(path, "w") as f:
        f.write(content)


def apply_and_test(sb, patch, selftest_code, p2p_ids, test_cmd):
    """Reset /testbed to base, (re)write the self-test, apply the candidate patch, run ONLY visible tests."""
    sh(sb, "cd /testbed && git checkout -- . && git clean -fdq -e " + SELFTEST_PATH)
    if selftest_code:
        write_file(sb, f"/testbed/{SELFTEST_PATH}", selftest_code)
    write_file(sb, "/tmp/cand.diff", patch)
    # apply: git apply first, then patch --fuzz fallback (mirrors the official harness)
    _, _, rc = sh(sb, "cd /testbed && git apply -v /tmp/cand.diff || patch --batch --fuzz=5 -p1 -i /tmp/cand.diff")
    applied = rc == 0
    if not applied:
        return False, {}
    ids = " ".join(p2p_ids + ([SELFTEST_PATH] if selftest_code else []))
    out, err, _ = sh(sb, f"cd /testbed && {ENV_PREFIX} {test_cmd} {ids} 2>&1")
    verdicts = parse_pytest(out + "\n" + err)
    results = {}
    for tid in p2p_ids:
        results[tid] = verdicts.get(tid, "fail")
    if selftest_code:
        st = [v for k, v in verdicts.items() if k.startswith(SELFTEST_PATH)]
        results["selftest::" + SELFTEST_PATH] = "pass" if (st and all(v == "pass" for v in st)) else "fail"
    return True, results


# ─────────────────────────── the funnel for one instance ───────────────────────────
@app.function(image=driver_image, secrets=[modal.Secret.from_name("deepseek-funnel")], timeout=5400, retries=1, max_containers=400)
def run_instance(job):
    inst, mode, budget = job["inst"], job["mode"], job["budget"]
    image_key, test_cmd, p2p = job["image_key"], job["test_cmd"], job["p2p"]
    pin = pout = 0

    if mode == "baseline":
        # OFF arm: one shot, no testbed needed (no in-loop testing) — skip the per-instance image pull entirely.
        content, a, b, _fr = deepseek_chat(patch_prompt(inst, None, None))
        pin += a; pout += b
        return {"instance_id": inst["instance_id"], "mode": mode, "patch": extract_diff(content),
                "converged": None, "iterations": 1, "pin": pin, "pout": pout}

    # atomic ON: needs the official per-instance image to run the visible tests
    img = modal.Image.from_registry(f"docker.io/swebench/{image_key}")
    sb = modal.Sandbox.create("sleep", "infinity", app=app, image=img, timeout=5000, cpu=2.0, memory=4096)
    try:
        # self-derived reproduction test first
        st_content, a, b, _fr = deepseek_chat(selftest_prompt(inst)); pin += a; pout += b  # unlimited budget
        selftest_code = extract_code_block(st_content)
        units = list(p2p) + (["selftest::" + SELFTEST_PATH] if selftest_code else [])

        prior, rejected, patch = "", None, ""
        converged, iters = False, 0
        debug = []
        for it in range(budget):
            iters = it + 1
            content, a, b, fr = deepseek_chat(patch_prompt(inst, prior, rejected)); pin += a; pout += b
            cand = extract_diff(content)
            if not cand:
                debug.append({"it": iters, "noDiff": True, "finish": fr, "compTok": b, "rawHead": (content or "")[:220]})
                rejected = units; continue
            patch = cand
            applied, results = apply_and_test(sb, patch, selftest_code, list(p2p), test_cmd)
            n_pass = sum(1 for u in p2p if results.get(u) == "pass")
            debug.append({"it": iters, "applied": applied, "p2pPass": n_pass, "p2pTotal": len(p2p),
                          "selftest": results.get("selftest::" + SELFTEST_PATH), "patchChars": len(patch)})
            if not applied:
                prior, rejected = patch, units; continue  # patch did not apply → all visible rejected
            rej = [u for u in units if results.get(u) != "pass"]
            if not rej:
                converged = True; break
            prior, rejected = patch, rej  # GRANULAR feedback — which visible tests still fail (never FAIL_TO_PASS)
        return {"instance_id": inst["instance_id"], "mode": mode, "patch": patch,
                "converged": converged, "iterations": iters, "selftest": bool(selftest_code),
                "selftestHead": (selftest_code or "")[:240], "debug": debug, "pin": pin, "pout": pout}
    finally:
        try: sb.terminate()
        except Exception: pass


# ─────────────────────────── driver ───────────────────────────
@app.local_entrypoint()
def main(dataset: str = "princeton-nlp/SWE-bench_Lite", split: str = "test", n: int = 10,
         modes: str = "baseline,atomic", budget: int = 6, p2p: int = 5):
    from datasets import load_dataset
    from swebench.harness.constants import MAP_REPO_VERSION_TO_SPECS

    ds = load_dataset(dataset, split=split)
    mode_list = [m.strip() for m in modes.split(",") if m.strip()]
    jobs, skipped = [], 0
    for r in ds:
        spec = MAP_REPO_VERSION_TO_SPECS.get(r["repo"], {}).get(str(r.get("version")), {})
        test_cmd = spec.get("test_cmd", "")
        if "pytest" not in test_cmd:  # smoke is pytest-only (parser-independent -rA); logged, not silent
            skipped += 1; continue
        p2p_ids = json.loads(r["PASS_TO_PASS"])[:p2p]
        inst = {"instance_id": r["instance_id"], "repo": r["repo"], "problem_statement": r["problem_statement"]}
        # Docker Hub repo names can't carry '__'; swebench publishes per-instance images with '__' -> '_1776_'.
        image_key = f"sweb.eval.x86_64.{r['instance_id'].replace('__', '_1776_')}:latest"
        for m in mode_list:
            jobs.append({"inst": inst, "mode": m, "budget": (1 if m == "baseline" else budget),
                         "image_key": image_key, "test_cmd": test_cmd, "p2p": p2p_ids})
        if len([1 for j in jobs if j["mode"] == mode_list[0]]) >= n:
            break

    n_inst = len({j["inst"]["instance_id"] for j in jobs})
    print(f"{dataset}: {n_inst} pytest instances x {len(mode_list)} modes = {len(jobs)} jobs "
          f"(skipped {skipped} non-pytest), budget={budget}, model={MODEL} — fanning out on Modal…")
    t0 = time.time()
    results = list(run_instance.map(jobs, order_outputs=False))
    elapsed = time.time() - t0

    pin = sum(r.get("pin", 0) for r in results if r)
    pout = sum(r.get("pout", 0) for r in results if r)
    usd = pin * 0.435 / 1e6 + pout * 0.87 / 1e6
    # write one official predictions.json per mode (scoring is the official harness's job, run separately)
    for m in mode_list:
        preds = {}
        for r in results:
            if r and r["mode"] == m:
                preds[r["instance_id"]] = {"instance_id": r["instance_id"],
                    "model_name_or_path": f"atomic-{m}-deepseek-v4-pro", "model_patch": r.get("patch", "")}
        path = f"swebench-{m}-predictions.json"
        json.dump(preds, open(path, "w"), indent=2)
        conv = sum(1 for r in results if r and r["mode"] == m and r.get("converged"))
        print(f"  [{m}] wrote {len(preds)} predictions -> {path} (visible-converged: {conv})")
    meta = {"dataset": dataset, "split": split, "model": MODEL, "instances": n_inst, "modes": mode_list,
            "budget": budget, "p2pSample": p2p, "skippedNonPytest": skipped, "wallSeconds": elapsed,
            "cost": {"promptTokens": pin, "completionTokens": pout, "usd": usd}, "results": results}
    json.dump(meta, open("swebench-funnel-meta.json", "w"), indent=2)
    print(f"  cost ~${usd:.2f} | {elapsed:.0f}s -> swebench-funnel-meta.json")
    print("  NEXT (the honest delta): score BOTH predictions with the official harness —")
    print("    node swebench-modal-eval.mjs --predictions swebench-baseline-predictions.json --dataset " + dataset)
    print("    node swebench-modal-eval.mjs --predictions swebench-atomic-predictions.json   --dataset " + dataset)
    print("  delta = resolved(atomic) - resolved(baseline) = the 100%-attributable atomic lift.")

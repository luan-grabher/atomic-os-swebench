"""
modal_funnel.py — PARADIGM PART F.4 layer-2 on MODAL: the universal truth funnel benchmark, fanned out to
hundreds of parallel cloud workers with DeepSeek V4 Pro as the proposer.

Each Modal container runs ONE (task, arm) job: propose with DeepSeek → verify deterministically → funnel
(freeze accepted / re-derive rejected) until the verifier accepts or budget exhausts. Modal gives both the
massive parallelism (DeepSeek allows ~500 concurrent) AND safe isolated execution of LLM-generated code
(disposable containers). v4-pro everywhere (per operator); the funnel is the atomic contribution measured.

Run:
  modal run modal_funnel.py --bench humaneval --budget 6
  modal run modal_funnel.py --bench arc1 --budget 6
  modal run modal_funnel.py --bench arc2 --budget 6
"""
import json
import os
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
import modal

app = modal.App("atomic-truth-funnel")
image = modal.Image.debian_slim(python_version="3.11")

MODEL = "deepseek-v4-pro"
ENDPOINT = "https://api.deepseek.com/chat/completions"
ARMS = ["first-attempt", "blind-retry", "scalar-funnel", "unified-funnel"]


# ─────────────────────────── DeepSeek proposer ───────────────────────────
def deepseek_chat(messages, max_tokens=4096, temperature=0.7, max_retries=6):
    key = os.environ["DEEPSEEK_API_KEY"]
    body = json.dumps({"model": MODEL, "messages": messages, "max_tokens": max_tokens, "temperature": temperature}).encode()
    last = None
    for attempt in range(max_retries + 1):
        req = urllib.request.Request(ENDPOINT, data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.loads(r.read())
                u = d.get("usage", {})
                return d["choices"][0]["message"].get("content", "") or "", u.get("prompt_tokens", 0), u.get("completion_tokens", 0)
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


def extract_code(content):
    import re
    m = re.search(r"```(?:python)?\s*([\s\S]*?)```", content, re.I)
    return (m.group(1) if m else content).strip()


def run_py(code, stdin="", timeout=10):
    """Run python code in an isolated subprocess (inside the disposable Modal container). Returns (stdout, stderr, ok)."""
    with tempfile.TemporaryDirectory() as tmp:
        try:
            r = subprocess.run(["python3", "-c", code], input=stdin, capture_output=True, text=True, timeout=timeout, cwd=tmp, env={"PATH": os.environ["PATH"]})
            return r.stdout, r.stderr, r.returncode == 0
        except subprocess.TimeoutExpired:
            return "", "timeout", False
        except Exception as e:
            return "", str(e), False


# ─────────────────────────── verifiers ───────────────────────────
def verify_humaneval(task, completion):
    code = f"{completion}\n\n{task['test']}\n\ncheck({task['entry_point']})\nprint('__PASS__')\n"
    out, err, ok = run_py(code, timeout=12)
    if "__PASS__" in out and ok:
        return True, ""
    return False, "\n".join(err.strip().split("\n")[-4:])[:600]


def he_prompt(task, feedback):
    base = f"Complete the following Python function. Return ONLY the complete function definition (def ...), no explanation, no markdown.\n\n{task['prompt']}"
    if not feedback:
        return [{"role": "user", "content": base}]
    return [
        {"role": "user", "content": base},
        {"role": "assistant", "content": feedback["code"]},
        {"role": "user", "content": f"That attempt FAILED the hidden tests:\n{feedback['detail']}\nFix ONLY what is wrong and return the corrected complete function (def ...)."},
    ]


def grid_str(g):
    return "\n".join(" ".join(str(c) for c in row) for row in g)


def arc_prompt(task, feedback):
    s = ("You are solving an ARC puzzle. Infer the transformation rule from the input->output examples and write a "
         "Python function `def transform(grid):` mapping any input grid (list of lists of ints 0-9) to its output grid. "
         "Return ONLY the function code (def transform...), no explanation, no markdown.\n\n")
    for i, p in enumerate(task["train"]):
        s += f"Example {i+1} INPUT:\n{grid_str(p['input'])}\nExample {i+1} OUTPUT:\n{grid_str(p['output'])}\n\n"
    s += f"Test INPUT (your transform must handle it):\n{grid_str(task['test'][0]['input'])}\n\nWrite transform(grid)."
    msgs = [{"role": "user", "content": s}]
    if feedback:
        msgs.append({"role": "assistant", "content": feedback["code"]})
        msgs.append({"role": "user", "content": f"Your transform was WRONG on these training examples:\n{feedback['detail']}\nFix the rule and return the corrected complete transform(grid)."})
    return msgs


def run_arc_program(completion, grids):
    code = (completion + "\n\nimport json,sys\n_in=json.loads(sys.stdin.read())\n_o=[]\nfor g in _in:\n"
            "    try:\n        r=transform(g)\n        _o.append(r if isinstance(r,list) else {'__e__':'non-list'})\n"
            "    except Exception as e:\n        _o.append({'__e__':str(e)[:100]})\nprint(json.dumps(_o))\n")
    out, err, ok = run_py(code, stdin=json.dumps(grids), timeout=8)
    if not ok:
        return [{"__e__": "exec"} for _ in grids]
    try:
        return json.loads(out)
    except Exception:
        return [{"__e__": "bad"} for _ in grids]


def verify_arc_train(task, completion):
    outs = run_arc_program(completion, [p["input"] for p in task["train"]])
    passc, fails = 0, []
    for i, p in enumerate(task["train"]):
        if outs[i] == p["output"]:
            passc += 1
        else:
            fails.append(f"Example {i+1}: got {json.dumps(outs[i])[:120]}, expected {json.dumps(p['output'])[:120]}")
    return passc == len(task["train"]), passc, "\n".join(fails)[:800]


def check_arc_test(task, completion):
    out = run_arc_program(completion, [task["test"][0]["input"]])[0]
    return out == task["test"][0]["output"]


# ─────────────────────────── the funnel (one arm) ───────────────────────────
def run_arm(bench, arm, task, budget, temp):
    max_attempts = 1 if arm == "first-attempt" else budget
    feedback = None
    best = {"code": None, "pass": -1}
    pin = pout = 0
    for attempt in range(1, max_attempts + 1):
        fb = None
        if attempt > 1:
            if arm == "unified-funnel":
                fb = feedback
            elif arm == "scalar-funnel":
                fb = {"code": feedback["code"], "detail": "the tests failed."}
            # blind-retry: fb stays None
        msgs = (he_prompt if bench == "humaneval" else arc_prompt)(task, fb)
        try:
            content, a, b = deepseek_chat(msgs, max_tokens=(3072 if bench == "humaneval" else 4096), temperature=temp)
            pin += a; pout += b
        except Exception:
            return {"solved": False, "attempts": attempt, "pin": pin, "pout": pout}
        code = extract_code(content)
        if bench == "humaneval":
            ok, detail = verify_humaneval(task, code)
            if ok:
                return {"solved": True, "attempts": attempt, "pin": pin, "pout": pout}
            feedback = {"code": code, "detail": detail}
        else:
            allpass, passc, detail = verify_arc_train(task, code)
            if passc > best["pass"]:
                best = {"code": code, "pass": passc}
            if allpass:
                return {"solved": check_arc_test(task, code), "attempts": attempt, "pin": pin, "pout": pout, "trainSolved": True}
            feedback = {"code": code, "detail": detail}
    solved = check_arc_test(task, best["code"]) if (bench != "humaneval" and best["code"]) else False
    return {"solved": solved, "attempts": max_attempts, "pin": pin, "pout": pout}


@app.function(image=image, secrets=[modal.Secret.from_name("deepseek-funnel")], timeout=1200, retries=1, max_containers=400)
def run_job(job):
    r = run_arm(job["bench"], job["arm"], job["task"], job["budget"], job["temp"])
    return {"taskId": job["taskId"], "arm": job["arm"], **r}


def _load_tasks(bench, datadir, n):
    if bench == "humaneval":
        rows = [json.loads(l) for l in open(datadir).read().splitlines() if l.strip()]
        return [{"taskId": r["task_id"], "task": r} for r in rows[:n]]
    # arc1 / arc2
    import os as _os
    files = sorted(f for f in _os.listdir(datadir) if f.endswith(".json"))[:n]
    out = []
    for f in files:
        d = json.load(open(_os.path.join(datadir, f)))
        out.append({"taskId": f.replace(".json", ""), "task": {"train": d["train"], "test": d["test"]}})
    return out


@app.local_entrypoint()
def main(bench: str = "humaneval", n: int = 100000, budget: int = 6, temp: float = 0.7, datadir: str = ""):
    if not datadir:
        datadir = {"humaneval": "/tmp/HumanEval.jsonl", "arc1": "/tmp/arc1/data/evaluation", "arc2": "/tmp/arc2/data/evaluation"}[bench]
    bkey = "humaneval" if bench == "humaneval" else "arc"
    tasks = _load_tasks(bench, datadir, n)
    jobs = [{"bench": bkey, "arm": arm, "task": t["task"], "taskId": t["taskId"], "budget": budget, "temp": temp}
            for t in tasks for arm in ARMS]
    print(f"{bench}: {len(tasks)} tasks x {len(ARMS)} arms = {len(jobs)} jobs, budget={budget}, model={MODEL} — fanning out on Modal…")
    t0 = time.time()
    results = list(run_job.map(jobs, order_outputs=False))
    elapsed = time.time() - t0

    by_arm = {}
    pin = pout = 0
    for arm in ARMS:
        rs = [r for r in results if r and r["arm"] == arm]
        solved = sum(1 for r in rs if r.get("solved"))
        by_arm[arm] = {"solveRate": solved / len(tasks), "solved": solved, "total": len(tasks)}
    for r in results:
        pin += r.get("pin", 0); pout += r.get("pout", 0)
    usd = pin * 0.435 / 1e6 + pout * 0.87 / 1e6
    fa, uf, br = by_arm["first-attempt"]["solveRate"], by_arm["unified-funnel"]["solveRate"], by_arm["blind-retry"]["solveRate"]
    summary = {"benchmark": bench, "model": MODEL, "tasks": len(tasks), "budget": budget, "byArm": by_arm,
               "headline": {"firstAttempt": fa, "unifiedFunnel": uf, "liftOverFirstAttempt_pp": (uf - fa) * 100, "liftOverBlindRetry_pp": (uf - br) * 100},
               "cost": {"promptTokens": pin, "completionTokens": pout, "usd": usd}, "wallSeconds": elapsed}
    out_path = f"funnel-{bench}-modal-result.json"
    json.dump({"summary": summary, "results": results}, open(out_path, "w"), indent=2)
    print("\n=== RESULT (" + bench + ", " + MODEL + ") ===")
    for arm in ARMS:
        print(f"  {arm:<15} {by_arm[arm]['solveRate']*100:.1f}% ({by_arm[arm]['solved']}/{len(tasks)})")
    print(f"  HEADLINE: unified {uf*100:.1f}% vs first-attempt {fa*100:.1f}% -> +{(uf-fa)*100:.1f}pp (vs blind +{(uf-br)*100:.1f}pp)")
    print(f"  cost ~${usd:.2f} | {elapsed:.0f}s | -> {out_path}")

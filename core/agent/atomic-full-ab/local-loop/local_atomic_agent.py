#!/usr/bin/env python3
"""
local_atomic_agent.py — the ATOMIC arm of the local self-vs-self A/B.

Brain: DeepSeek V4 Pro (tool-calling, runs locally via the DeepSeek API).
Hands: 100% atomic — every read/search/edit/create goes through the canonical
       core/atomic-edit/atomic-call.mjs (the atomic envelope: pre-disk validation,
       governed deletes, structural edits). The ONLY non-atomic action is the
       acceptance gate `run_tests`, which is IDENTICAL to the native arm's gate
       (so the comparison stays commensurable).

It solves a task IN PLACE inside a local working directory (a git repo), then the
orchestrator scores it by the same binary gate and reads the git diff.

Usage:
  DEEPSEEK_API_KEY=... python3 local_atomic_agent.py \
      --workdir /tmp/loop/L01/atomic --task /path/TASK.md \
      --gate 'node --test' --out /tmp/loop/L01/atomic_result.json [--max-steps 60]

The result JSON records EVERYTHING (loop manual step 3): gate pass, steps, per-tool
call counts, edits applied, invalid-states-prevented (governed refusals = a GOOD
atomic property), reads, diff surface (lines), tokens, wall time, and a transcript.
"""
import json, os, re, sys, time, argparse, subprocess, urllib.request
from pathlib import Path

API_KEY = os.environ["DEEPSEEK_API_KEY"]
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")
NODE = os.environ.get("ATOMIC_NODE_BIN", "node")
ATOMIC_CALL = os.environ.get(
    "ATOMIC_CALL",
    str(Path(__file__).resolve().parents[3] / "atomic-edit" / "atomic-call.mjs"),
)

# ── DeepSeek client (reasoning model: content may be empty when tool_calls present) ──
def deepseek(messages, tools):
    body = json.dumps({"model": MODEL, "messages": messages, "tools": tools,
                       "temperature": float(os.environ.get("DEEPSEEK_TEMP", "0")),
                       "max_tokens": 4000}).encode()
    req = urllib.request.Request("https://api.deepseek.com/v1/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                d = json.loads(r.read())
                return d["choices"][0]["message"], d.get("usage", {})
        except Exception as e:
            if attempt == 4:
                raise
            time.sleep(3 * (attempt + 1))


# ── atomic hands: dispatch one tool through atomic-call against the local workdir ──
# NOTE: atomic-call.mjs blanks ATOMIC_WORKSPACE_ROOT, so relative paths resolve against the WRONG
# root (the host repo). We absolutize every path/file arg against the workdir → unambiguous resolution
# AND a hard jail (combined with ATOMIC_EDIT_ALLOWED_ROOTS=workdir the agent can't touch the host repo).
def _absolutize(workdir, args):
    out = dict(args)
    for k in ("file", "path"):
        v = out.get(k)
        if isinstance(v, str) and v and not os.path.isabs(v):
            out[k] = str(Path(workdir) / v)
    if isinstance(out.get("cwd"), str) and out["cwd"] and not os.path.isabs(out["cwd"]):
        out["cwd"] = str(Path(workdir) / out["cwd"])
    if isinstance(out.get("items"), list):  # batch read: absolutize each item's path
        out["items"] = [
            ({**it, "path": str(Path(workdir) / it["path"])}
             if isinstance(it, dict) and isinstance(it.get("path"), str) and not os.path.isabs(it["path"])
             else it)
            for it in out["items"]
        ]
    return out


def atomic_call(workdir, tool, args):
    args = _absolutize(workdir, args)
    if tool == "code_outline_batch" and not args.get("cwd"):  # glob is workdir-relative
        args["cwd"] = workdir
    env = {**os.environ, "ATOMIC_DISABLE_HOT_RELOAD": "1",
           "ATOMIC_WORKSPACE_ROOT": workdir, "ATOMIC_DECLARED_WORKSPACE_ROOT": workdir,
           "ATOMIC_EDIT_ALLOWED_ROOTS": workdir}
    try:
        p = subprocess.run([NODE, ATOMIC_CALL, tool, json.dumps(args)], cwd=workdir,
                           env=env, capture_output=True, text=True, timeout=150)
    except subprocess.TimeoutExpired:
        return "(atomic-call timed out)", False
    out = (p.stdout or "").strip()
    err = (p.stderr or "").strip()
    ok = p.returncode == 0 and not err
    body = out if out else (err or "(empty)")
    if err and out:
        body = out + "\n[stderr] " + err
    return body[:6000], ok


def git_diff(workdir):
    p = subprocess.run(["git", "diff", "HEAD"], cwd=workdir, capture_output=True, text=True)
    return p.stdout


def diff_lines(d):
    return sum(1 for l in d.splitlines()
               if (l.startswith("+") or l.startswith("-")) and not l.startswith(("+++", "---")))


def run_gate(workdir, gate):
    try:
        p = subprocess.run(gate, cwd=workdir, shell=True, capture_output=True, text=True, timeout=180)
    except subprocess.TimeoutExpired:
        return False, "(gate timed out)", (0, 0)
    out = (p.stdout or "") + "\n" + (p.stderr or "")
    m_pass = re.search(r"#\s*pass\s+(\d+)", out)
    m_fail = re.search(r"#\s*fail\s+(\d+)", out)
    m_tests = re.search(r"#\s*tests\s+(\d+)", out)
    npass = int(m_pass.group(1)) if m_pass else 0
    nfail = int(m_fail.group(1)) if m_fail else 0
    ntests = int(m_tests.group(1)) if m_tests else 0
    allpass = (p.returncode == 0) and ntests > 0 and nfail == 0
    return allpass, out, (npass, nfail)


TOOLS = [
    {"type": "function", "function": {"name": "atomic_survey",
        "description": "Outline EVERY file matching a glob in ONE call (signature map, no bodies). Use this FIRST to map a codebase region — do NOT outline files one at a time. e.g. glob 'src/*.mjs' or 'src/**/*.py'.",
        "parameters": {"type": "object", "properties": {"glob": {"type": "string"}}, "required": ["glob"]}}},
    {"type": "function", "function": {"name": "atomic_read_many",
        "description": "Read SEVERAL files (or symbols) in ONE call. `items` is a list of {path, selector?} — selector optional, to read just one symbol. PREFER this over reading files one by one.",
        "parameters": {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"path": {"type": "string"}, "selector": {"type": "string"}}, "required": ["path"]}}}, "required": ["items"]}}},
    {"type": "function", "function": {"name": "atomic_outline",
        "description": "Structural map of a SINGLE source file. Prefer atomic_survey for multiple files. `file` = path relative to the repo root.",
        "parameters": {"type": "object", "properties": {"file": {"type": "string"}}, "required": ["file"]}}},
    {"type": "function", "function": {"name": "atomic_read",
        "description": "Read code from a SINGLE file. Prefer atomic_read_many for several. `path` = file. Optionally `selector` (a symbol) or `maxFullChars` (whole file). Returns the code body.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "selector": {"type": "string"}, "maxFullChars": {"type": "integer"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "atomic_grep",
        "description": "Search the repo for a regex. Scope with `path` (file or dir) and `glob`. Returns file:line matches.",
        "parameters": {"type": "object", "properties": {"pattern": {"type": "string"}, "path": {"type": "string"}, "glob": {"type": "string"}, "contextAfter": {"type": "integer"}}, "required": ["pattern"]}}},
    {"type": "function", "function": {"name": "atomic_replace",
        "description": "Atomic GOVERNED edit: in `file`, replace the EXACT unique text `oldText` with `newText`. Pre-disk validated (invalid states are never written). If your edit REMOVES or shortens code you MUST pass `proofOfIncorrectness` (>=20 chars: why the removed bytes are wrong/dead). Make minimal, faithful edits.",
        "parameters": {"type": "object", "properties": {"file": {"type": "string"}, "oldText": {"type": "string"}, "newText": {"type": "string"}, "proofOfIncorrectness": {"type": "string"}}, "required": ["file", "oldText", "newText"]}}},
    {"type": "function", "function": {"name": "atomic_create",
        "description": "Create a file with `content`. Pass overwrite:true to replace an existing file wholesale.",
        "parameters": {"type": "object", "properties": {"file": {"type": "string"}, "content": {"type": "string"}, "overwrite": {"type": "boolean"}}, "required": ["file", "content"]}}},
    {"type": "function", "function": {"name": "run_tests",
        "description": "Run the test suite (the binary acceptance gate). Call after edits to verify. Returns pass/fail counts and failing output. When all tests pass, STOP (reply without any tool call).",
        "parameters": {"type": "object", "properties": {}}}},
]

DISPATCH = {
    "atomic_survey": ("code_outline_batch", lambda a: {"glob": a.get("glob", "")}),
    "atomic_read_many": ("code_readcode_batch", lambda a: {k: v for k, v in {"items": a.get("items", []), "maxFullCharsPerFile": a.get("maxFullCharsPerFile")}.items() if v not in (None,)}),
    "atomic_outline": ("code_outline", lambda a: {"file": a.get("file", "")}),
    "atomic_read": ("code_readcode", lambda a: {k: v for k, v in {"path": a.get("path", ""), "selector": a.get("selector"), "maxFullChars": a.get("maxFullChars")}.items() if v not in (None, "")}),
    "atomic_grep": ("atomic_grep", lambda a: {k: v for k, v in {"pattern": a.get("pattern", ""), "path": a.get("path"), "glob": a.get("glob"), "contextAfter": a.get("contextAfter")}.items() if v not in (None, "")}),
    "atomic_replace": ("atomic_replace_text", lambda a: {k: v for k, v in {"file": a.get("file", ""), "oldText": a.get("oldText", ""), "newText": a.get("newText", ""), "proofOfIncorrectness": a.get("proofOfIncorrectness")}.items() if v not in (None,)}),
    "atomic_create": ("atomic_create_file", lambda a: {k: v for k, v in {"file": a.get("file", ""), "content": a.get("content", ""), "overwrite": a.get("overwrite")}.items() if v not in (None,)}),
}

REFUSAL_MARKERS = ("error", "❌", "invalid", "not found", "not unique", "validation")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--task", required=True)
    ap.add_argument("--gate", default="node --test")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-steps", type=int, default=60)
    args = ap.parse_args()

    workdir = str(Path(args.workdir).resolve())
    task = Path(args.task).read_text()
    tree = subprocess.run(["git", "ls-files"], cwd=workdir, capture_output=True, text=True).stdout

    metrics = {"arm": "atomic-cli-deepseek-v4-pro", "task": args.task, "workdir": workdir,
               "steps": 0, "tool_calls": {}, "edits_applied": 0, "invalid_states_prevented": 0,
               "reads": 0, "run_tests_calls": 0, "tokens": 0, "gate_pass": False,
               "diff_lines": 0, "wall_s": 0.0, "transcript": []}
    t0 = time.time()

    system = (
        "You are the Atomic-CLI coding agent. You solve a software task by editing a real repository, "
        "using ONLY atomic tools for every read, search, and edit, plus run_tests to verify. You have no "
        "other tools. Be efficient with calls: to understand the code, FIRST call atomic_survey(glob) once "
        "to outline the whole region, then atomic_read_many(items) to read all the relevant files in ONE "
        "call — do NOT read files one at a time. Then make minimal faithful edits with atomic_replace / "
        "atomic_create (supply proofOfIncorrectness when you remove code), then run_tests. Iterate until "
        "run_tests is fully green, then STOP by replying with a short summary and NO tool call. Paths are "
        "relative to the repo root."
    )
    user = f"# Repository files\n{tree}\n\n# Your task\n{task}\n\nBegin. Use atomic tools only."
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]

    last_pass = False
    reads_since_edit = 0
    empties = 0

    for step in range(1, args.max_steps + 1):
        metrics["steps"] = step
        try:
            msg, usage = deepseek(messages, TOOLS)
        except Exception as e:
            metrics["transcript"].append(f"s{step} DEEPSEEK-ERROR {str(e)[:200]}")
            break
        metrics["tokens"] += int(usage.get("total_tokens", 0) or 0)
        calls = msg.get("tool_calls") or []
        clean = {"role": "assistant", "content": msg.get("content") or ""}
        if calls:
            clean["tool_calls"] = calls
        messages.append(clean)
        if msg.get("content"):
            metrics["transcript"].append(f"s{step} SAY: {' '.join(msg['content'].split())[:200]}")

        if not calls:
            empties += 1
            if last_pass:
                metrics["transcript"].append(f"s{step} DONE (no tool call, gate green)")
                break
            if empties >= 3:
                metrics["transcript"].append(f"s{step} STOP (gave up, gate not green)")
                break
            messages.append({"role": "user", "content": "Tests are not green yet. Do NOT stop — make a minimal fix with atomic_replace/atomic_create and call run_tests."})
            continue
        empties = 0

        for c in calls:
            fn = c["function"]["name"]
            try:
                a = json.loads(c["function"]["arguments"] or "{}")
            except Exception:
                a = {}
            metrics["tool_calls"][fn] = metrics["tool_calls"].get(fn, 0) + 1

            if fn == "run_tests":
                metrics["run_tests_calls"] += 1
                d_before = git_diff(workdir)
                if not d_before.strip():
                    res = ("Working tree is unmodified (empty diff). run_tests only verifies; the target "
                           "still fails. Make your atomic edit FIRST, then run_tests.")
                else:
                    last_pass, gate_out, (np_, nf_) = run_gate(workdir, args.gate)
                    res = f"pass={np_} fail={nf_} all_green={last_pass}\n" + gate_out[-1500:]
                    if last_pass:
                        reads_since_edit = 0
                metrics["transcript"].append(f"s{step} run_tests -> {res.splitlines()[0][:120]}")
            elif fn in DISPATCH:
                tool, mapper = DISPATCH[fn]
                if fn in ("atomic_read", "atomic_outline", "atomic_grep", "atomic_survey", "atomic_read_many"):
                    metrics["reads"] += 1
                    reads_since_edit += 1
                before = git_diff(workdir)
                res, ok = atomic_call(workdir, tool, mapper(a))
                after = git_diff(workdir)
                if fn in ("atomic_replace", "atomic_create"):
                    if after != before:
                        metrics["edits_applied"] += 1
                        reads_since_edit = 0
                    elif any(m in res.lower() for m in REFUSAL_MARKERS):
                        metrics["invalid_states_prevented"] += 1
                metrics["transcript"].append(f"s{step} {fn}({json.dumps(a)[:90]}) -> {res.splitlines()[0][:120] if res else '(empty)'}")
            else:
                res = f"Unknown tool {fn}. Use only the atomic tools."
            messages.append({"role": "tool", "tool_call_id": c["id"], "content": res})

        # light read-loop steer (NO blind lockout — keep it honest; looping is a measured class)
        if reads_since_edit and reads_since_edit % 6 == 0:
            messages.append({"role": "user", "content": "You have read a lot without editing. You likely have enough context — make the edit now with atomic_replace/atomic_create, then run_tests."})

    # final scoring (authoritative) + diff
    final_pass, _, _ = run_gate(workdir, args.gate)
    metrics["gate_pass"] = final_pass
    d = git_diff(workdir)
    metrics["diff_lines"] = diff_lines(d)
    metrics["wall_s"] = round(time.time() - t0, 1)
    Path(args.out).write_text(json.dumps(metrics, indent=2))
    print(f"ATOMIC DONE gate_pass={final_pass} steps={metrics['steps']} edits={metrics['edits_applied']} "
          f"reads={metrics['reads']} invalid_prevented={metrics['invalid_states_prevented']} "
          f"diff_lines={metrics['diff_lines']} tokens={metrics['tokens']} wall={metrics['wall_s']}s")


if __name__ == "__main__":
    main()

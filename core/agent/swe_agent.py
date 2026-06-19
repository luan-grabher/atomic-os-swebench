#!/usr/bin/env python3
"""
Atomic AGENTIC loop for one SWE-bench instance — the REAL test of the thesis:
give a fixed model tools + test feedback + iteration so it resolves bugs it
cannot one-shot.

Tools given to DeepSeek (function-calling):
  - grep(pattern)              : ripgrep-ish search in the repo
  - read_file(path, start, end): read real bytes (ground truth)
  - str_replace(path, old, new): ATOMIC edit — old must match EXACTLY & uniquely,
                                 result must be syntactically valid (else REFUSED)
  - run_tests()                : run the instance's FAIL_TO_PASS tests, return output

Loop: model calls tools, we execute, feed results back, until run_tests passes
(resolved) or the step budget runs out. Final patch = git diff vs base_commit.

ON (atomic): str_replace validates (exact match + syntax) — broken edits refused.
This is the agentic scaffold; the baseline (no loop / no validation) is the prior smoke.

Usage: ENV with DEEPSEEK_API_KEY; repo already checked out + deps installed at REPO_DIR.
  python3 swe_agent.py --instance <id> --repo-dir <path> --max-steps 14
"""
import json, os, re, subprocess, argparse, urllib.request
from pathlib import Path

API_KEY = os.environ["DEEPSEEK_API_KEY"]
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")


def deepseek(messages, tools):
    body = json.dumps({"model": MODEL, "messages": messages, "tools": tools,
                       "temperature": 0, "max_tokens": 4000}).encode()
    req = urllib.request.Request("https://api.deepseek.com/v1/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())["choices"][0]["message"]


TOOLS = [
    {"type": "function", "function": {"name": "grep", "description": "Search the repo for a regex/string. Returns matching file:line: content.",
        "parameters": {"type": "object", "properties": {"pattern": {"type": "string"}}, "required": ["pattern"]}}},
    {"type": "function", "function": {"name": "read_file", "description": "Read a file (optionally a line range start..end, 1-indexed). Returns numbered lines.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "start": {"type": "integer"}, "end": {"type": "integer"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "str_replace", "description": "ATOMIC edit: replace the EXACT unique text `old` with `new` in file `path`. Fails if `old` is not found, not unique, or the result is not valid Python syntax. Use this for ALL edits.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "old": {"type": "string"}, "new": {"type": "string"}}, "required": ["path", "old", "new"]}}},
    {"type": "function", "function": {"name": "run_tests", "description": "Run the failing tests that must pass. Returns pass/fail + output. Call this after edits to check progress.",
        "parameters": {"type": "object", "properties": {}}}},
]


class Repo:
    def __init__(self, root, test_cmd, block=None):
        self.root = Path(root)
        self.test_cmd = test_cmd
        self.block = [b for b in (block or []) if b]  # path substrings hidden from the agent (anti-leak)

    def _blocked(self, path):
        return any(b in str(path) for b in self.block)

    def grep(self, pattern):
        r = subprocess.run(["grep", "-rn", "--include=*.py", "--exclude-dir=.venv",
                            "--exclude-dir=.git", "--exclude-dir=node_modules", "--exclude-dir=build",
                            "--exclude-dir=site-packages", "-E", pattern, "."],
                           cwd=self.root, capture_output=True, text=True, timeout=30)
        out = [l for l in r.stdout.strip().split("\n") if l and not self._blocked(l.split(":")[0])][:40]
        return "\n".join(out) if out else "(no matches)"

    def read_file(self, path, start=None, end=None):
        if self._blocked(path):
            return "REFUSED: that file is hidden (test/eval file)."
        fp = self.root / path
        if not fp.exists():
            return f"ERROR: no such file {path}"
        lines = fp.read_text(errors="replace").split("\n")
        s = max(1, start or 1); e = min(len(lines), end or len(lines))
        if e - s > 200:
            e = s + 200
        return "\n".join(f"{i}| {lines[i-1]}" for i in range(s, e + 1))

    def str_replace(self, path, old, new):
        if self._blocked(path):
            return "REFUSED: cannot edit a hidden test/eval file."
        fp = self.root / path
        if not fp.exists():
            return f"REFUSED: no such file {path}"
        content = fp.read_text()
        n = content.count(old)
        if n == 0:
            return "REFUSED: `old` text not found (must match the file EXACTLY, including indentation)."
        if n > 1:
            return f"REFUSED: `old` text is not unique ({n} occurrences). Include more surrounding context."
        candidate = content.replace(old, new)
        if path.endswith(".py"):
            try:
                compile(candidate, path, "exec")
            except SyntaxError as ex:
                return f"REFUSED (atomic syntax guard): edit would break syntax: {ex}"
        fp.write_text(candidate)
        return "OK: edit applied and syntax-validated."

    def run_tests(self):
        r = subprocess.run(self.test_cmd, cwd=self.root, capture_output=True, text=True, timeout=600, shell=True)
        out = (r.stdout + "\n" + r.stderr)[-4000:]
        passed = r.returncode == 0
        return passed, f"EXIT={r.returncode} {'PASS' if passed else 'FAIL'}\n{out}"


def run_agent(instance_id, repo_dir, test_cmd, issue, max_steps, block=None):
    repo = Repo(repo_dir, test_cmd, block=block)
    sys_prompt = (
        "You are an expert engineer fixing a real bug in a Python repo, graded by a hidden test. "
        "Be decisive and FAST. The issue usually names the file/line. Within 1-3 steps, locate the exact "
        "buggy code with grep/read_file in the PROJECT SOURCE ONLY — NEVER read third-party, site-packages, "
        ".venv, or vendored code. Then make the minimal fix with str_replace (the atomic editor validates "
        "syntax) and IMMEDIATELY call run_tests. If it still fails, read the failure, adjust, run_tests again. "
        "Always prefer editing+testing over browsing. Your step budget is limited — do not waste it."
    )
    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": f"Bug / issue to fix:\n\n{issue[:6000]}\n\nFix it so the failing tests pass. Start by locating the relevant code."},
    ]
    # INFINITE agent loop (OpenCode/Claude-Code pattern): run until the model returns a
    # final answer with NO tool calls. `max_steps` is only a HIGH runaway-billing safety cap.
    step = 0
    last_pass = False
    empty_replies = 0
    while True:  # NO CAP — terminate only on tests-pass (success) or a model that truly gave up
        step += 1
        msg = deepseek(messages, TOOLS)
        messages.append(msg)
        calls = msg.get("tool_calls") or []
        if not calls:
            empty_replies += 1
            if last_pass:
                break  # model is done and tests are green
            if empty_replies >= 12:
                break  # model refused to act 12 times in a row — genuinely stuck, not a step cap
            messages.append({"role": "user", "content":
                "You returned no tool call, but the failing tests are NOT yet confirmed passing. "
                "Do NOT stop. Call run_tests; if it fails, read the failure, fix with str_replace, "
                "and run_tests again. Keep iterating until run_tests passes."})
            continue
        empty_replies = 0
        for call in calls:
            fn = call["function"]["name"]
            try:
                args = json.loads(call["function"]["arguments"] or "{}")
            except Exception:
                args = {}
            if fn == "grep":
                res = repo.grep(args.get("pattern", ""))
            elif fn == "read_file":
                res = repo.read_file(args.get("path", ""), args.get("start"), args.get("end"))
            elif fn == "str_replace":
                res = repo.str_replace(args.get("path", ""), args.get("old", ""), args.get("new", ""))
            elif fn == "run_tests":
                passed, res = repo.run_tests()
                last_pass = passed
                print(f"  [step {step}] run_tests -> {'PASS' if passed else 'fail'}")
            else:
                res = f"unknown tool {fn}"
            if fn != "run_tests":
                print(f"  [step {step}] {fn}({str(args)[:80]}) -> {str(res)[:80]}")
            messages.append({"role": "tool", "tool_call_id": call["id"], "content": str(res)[:3000]})
        if last_pass:
            break  # tests green — success, stop iterating
    diff = subprocess.run(["git", "diff", "HEAD", "--", "."], cwd=repo.root, capture_output=True, text=True).stdout
    return last_pass, diff, step


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance", required=True)
    ap.add_argument("--repo-dir", required=True)
    ap.add_argument("--test-cmd", required=True)
    ap.add_argument("--issue-file", required=True)
    ap.add_argument("--max-steps", type=int, default=14)
    ap.add_argument("--block", default="", help="comma-separated path substrings to hide from the agent")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    issue = Path(args.issue_file).read_text()
    block = [b.strip() for b in args.block.split(",") if b.strip()]
    resolved, diff, steps = run_agent(args.instance, args.repo_dir, args.test_cmd, issue, args.max_steps, block=block)
    print(f"\n=== {args.instance}: local_tests_pass={resolved} steps={steps} patch_len={len(diff)} ===")
    if args.out:
        Path(args.out).write_text(json.dumps({"instance_id": args.instance, "model_patch": diff,
                                              "model_name_or_path": "atomic-agent-deepseek-v4-pro", "local_pass": resolved}) + "\n")


if __name__ == "__main__":
    main()

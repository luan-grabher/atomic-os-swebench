#!/usr/bin/env python3
"""acq.py — clean atomic-only hands for a same-model (Claude) ATOMIC arm.

Fixes ac.sh's shell-quoting fragility: reads the JSON tool-args from STDIN (use a quoted heredoc so the
shell never touches the JSON), and reuses the PROVEN local_atomic_agent.atomic_call (absolutizes paths to
the workdir + jails to it — no repo-root path-resolution gotcha). The atomic-Claude arm must use ONLY this
for code reads/searches/edits — NEVER native Read/Edit/Write/Grep/Glob.

Usage (robust, no quoting):
    python3 acq.py <workdir> <tool> <<'JSON'
    {"path": "requests/sessions.py", "selector": "merge_setting"}
    JSON

Tools (same wrapped surface as the DeepSeek arm, for commensurability):
    atomic_survey      {"glob": "pylint/**/*.py"}                      # outline many files (sym@Lline)
    atomic_read_many   {"items": [{"path": "...", "selector": "..."}]} # read several symbols/files
    atomic_read        {"path": "...", "selector": "name"}             # one symbol  (or)
    atomic_read        {"path": "...", "startLine": N, "endLine": M}   # exact line range  (or omit -> body)
    atomic_grep        {"pattern": "re", "path": "...", "glob": "..."} # search
    atomic_replace     {"file": "...", "oldText": "...", "newText": "...", "proofOfIncorrectness": "..."}
    atomic_create      {"file": "...", "content": "..."}
Paths are relative to the repo root (auto-absolutized to <workdir>). Output = the same lean perception the
DeepSeek arm gets (compaction + edit-correction apply). Exit 0 always; read the JSON/text result on stdout.
"""
import os, sys, json
os.environ.setdefault("DEEPSEEK_API_KEY", "unused-for-atomic-call")
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
import local_atomic_agent as A

WRAP = {  # wrapped name -> (engine tool, arg-mapper) — mirrors local_atomic_agent.DISPATCH for commensurability
    "atomic_survey": ("code_outline_batch", lambda a: {"glob": a.get("glob", "")}),
    "atomic_read_many": ("code_readcode_batch", lambda a: {k: v for k, v in {"items": a.get("items", [])}.items() if v}),
    "atomic_outline": ("code_outline", lambda a: {"file": a.get("file", "")}),
    "atomic_read": ("code_readcode", lambda a: {k: v for k, v in {"path": a.get("path", ""), "selector": a.get("selector"), "maxFullChars": a.get("maxFullChars")}.items() if v not in (None, "")}),
    "atomic_grep": ("atomic_grep", lambda a: {k: v for k, v in {"pattern": a.get("pattern", ""), "path": a.get("path"), "glob": a.get("glob"), "contextAfter": a.get("contextAfter")}.items() if v not in (None, "")}),
    "atomic_replace": ("atomic_replace_text", lambda a: {k: v for k, v in {"file": a.get("file", ""), "oldText": a.get("oldText", ""), "newText": a.get("newText", ""), "proofOfIncorrectness": a.get("proofOfIncorrectness")}.items() if v not in (None,)}),
    "atomic_create": ("atomic_create_file", lambda a: {k: v for k, v in {"file": a.get("file", ""), "content": a.get("content", ""), "overwrite": a.get("overwrite")}.items() if v not in (None,)}),
}

def main():
    if len(sys.argv) < 3:
        print("usage: python3 acq.py <workdir> <tool>  (JSON args on stdin)"); sys.exit(2)
    workdir = os.path.abspath(sys.argv[1]); tool = sys.argv[2]
    raw = sys.stdin.read().strip()
    try:
        args = json.loads(raw) if raw else {}
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"bad JSON on stdin: {e}"})); sys.exit(0)
    # line-range read routes to atomic_read_file (the engine's true line reader), mirroring the DeepSeek arm
    if tool == "atomic_read" and (args.get("startLine") or args.get("endLine")):
        call_args = {"file": args.get("path", ""), "includeContent": True}
        if args.get("startLine"): call_args["startLine"] = args["startLine"]
        if args.get("endLine"): call_args["endLine"] = args["endLine"]
        res, ok = A.atomic_call(workdir, "atomic_read_file", call_args)
    elif tool in WRAP:
        engine, mapper = WRAP[tool]
        res, ok = A.atomic_call(workdir, engine, mapper(args))
    else:
        res, ok = A.atomic_call(workdir, tool, args)  # raw engine tool passthrough
    print(res)

if __name__ == "__main__":
    main()

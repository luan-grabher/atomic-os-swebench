"""atomic_full_arm.py — the ATOMIC=full arm of the SWE-bench A/B.

The existing swe_modal_agent ON arm ("governed") routes ONE tool (str_replace) through the slim
headless editor. The FULL arm instead exposes the COMPLETE atomic MCP tool surface (the real
dist/server.js, 120+ tools) to the model and dispatches every atomic tool one-shot via
atomic-call.mjs inside the Modal sandbox against /testbed. This is what makes the A/B a test of
the COMPLETE atomic-as-agent, not just a governed string replace.

Honest A/B framing: the FULL arm changes the WHOLE tool surface (not a single isolated variable
like the governed arm). So FULL-vs-OFF answers "does the complete atomic toolbox help the agent
solve SWE-bench tasks?" — exactly the question the user asked. run_tests stays byte-identical
across arms (it is the verifier and must never differ).

This module is import-only helpers; swe_modal_agent wires them in when ATOMIC_MODE=full.
"""
import json
import base64
import shlex
import subprocess
from pathlib import Path

# Curated COMPLETE editing/analysis toolbox surfaced to the model. These are the atomic tools that
# matter for fixing a bug in a Python repo. We deliberately exclude tools irrelevant to SWE-bench
# code-editing (chrome_devtools_*, codex_config_*, positive_bytes_*, atomic_expand_self/self_evolution
# — atomic editing ITS OWN tree, calendar/dashboard siblings, etc.). Excluding them is documented, not
# hidden: see EXCLUDED_RATIONALE. The point is a usable-but-complete toolbox, not 123 schemas of noise.
FULL_TOOL_ALLOWLIST = [
    # read / locate / analyze
    "code_readcode", "code_outline", "code_read_symbol",
    "atomic_read_file", "atomic_grep", "atomic_glob", "atomic_locate",
    "atomic_outline", "atomic_ast_search", "atomic_grep_calls", "atomic_affected_tests",
    # structural edit (the distinctive atomic powers)
    "atomic_replace_text", "atomic_replace_range", "atomic_replace_body",
    "atomic_insert_at", "atomic_insert_before_anchor", "atomic_insert_after_anchor",
    "atomic_delete_range", "atomic_ast_rewrite", "atomic_edit", "atomic_create_file",
    "atomic_change_signature", "atomic_rename_symbol",
    # transactional / convergent / proof governance
    "atomic_converge", "atomic_transaction",
    "atomic_session_begin", "atomic_session_commit", "atomic_session_rollback",
    "atomic_prove", "atomic_lens",
]

# Denylist (the ONLY tools withheld from the agent) — grounded by the 123-tool mastery sweep.
# Everything else (117 of 123) is exposed: the agent uses the TOTALITY of the code-relevant atomic.
DENY_TOOLS = {
    "chrome_devtools_call", "chrome_devtools_list_tools", "chrome_devtools_reset",  # need a live browser
    "atomic_expand_self", "atomic_self_evolution",                                   # edit atomic's OWN tree
    "atomic_positive_bytes_begin", "atomic_positive_bytes_commit",                   # session blocked under /testbed
    "atomic_positive_bytes_abort",
}

# INTENT arm — the FAITHFUL representation of the atomic principle ("declare intention at the highest
# faithful level; the byte is the floor, NEVER the agent's steering wheel"). The model edits by stating
# WHAT the code should be via the single unified intention operator atomic_converge (which compiles the
# intent to the minimal validated byte mutation, preserves the rest, proves the delta). It does NOT hand
# the model 115 byte-level mutation tools as the wheel (that was the infidelity that made the FULL arm
# lose). A tight, high-altitude surface: one intention-editor + read/locate + run_tests.
INTENT_TOOLS = [
    "atomic_converge",                                              # the intention->minimal-mutation envelope
    "code_readcode", "code_outline", "code_read_symbol",            # read/understand
    "atomic_grep", "atomic_locate", "atomic_outline",              # find
]

EXCLUDED_RATIONALE = (
    "Excluded from the agent surface (still PRESENT in the package, just not offered as tools): "
    "chrome_devtools_* (browser), codex_config_* (host config), positive_bytes_* (byte ledger), "
    "atomic_expand_self/atomic_self_evolution (atomic editing its OWN source, not /testbed), "
    "sibling-MCP tools (memory/dashboard/sentinel). None are code-fix tools for an arbitrary repo."
)


def build_full_tool_catalog(atomic_dir, include_run_tests=True, timeout=25, only=None):
    """Start the COMPLETE local MCP (dist/server.js), read its real tools/list, and convert the
    allowlisted tools into DeepSeek function schemas (MCP inputSchema IS json-schema => passthrough).
    Returns (tools_list, tool_name_set). Falls back to a minimal hardcoded set if the probe fails."""
    atomic_dir = str(Path(atomic_dir).resolve())
    probe = (
        "import json,subprocess,sys,os\n"
        "p=subprocess.Popen(['node','dist/server.js'],cwd=os.environ['AD'],"
        "stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,"
        "universal_newlines=True,env={**os.environ,'ATOMIC_WORKSPACE_ROOT':'/tmp'})\n"
        "p.stdin.write(json.dumps({'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'cat','version':'0'}}})+chr(10))\n"
        "p.stdin.write(json.dumps({'jsonrpc':'2.0','id':2,'method':'tools/list','params':{}})+chr(10))\n"
        "p.stdin.flush()\n"
        "import time\nbuf=''\nt0=time.time()\n"
        "while time.time()-t0<20:\n"
        "  line=p.stdout.readline()\n"
        "  if not line: break\n"
        "  buf+=line\n"
        "  try:\n"
        "    j=json.loads(line)\n"
        "    if j.get('id')==2 and j.get('result',{}).get('tools'):\n"
        "      print(json.dumps(j['result']['tools'])); break\n"
        "  except Exception: pass\n"
        "p.kill()\n"
    )
    tools_raw = []
    try:
        b64 = base64.b64encode(probe.encode()).decode()
        r = subprocess.run(
            ["python3", "-c", f"import base64,os;os.environ['AD']={json.dumps(atomic_dir)};exec(base64.b64decode('{b64}').decode())"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, universal_newlines=True, timeout=timeout)
        line = (r.stdout or "").strip().splitlines()[-1] if r.stdout.strip() else "[]"
        tools_raw = json.loads(line)
    except Exception:
        tools_raw = []

    # TOTALITY by denylist (not a curated allowlist): expose EVERY live tool the agent could use,
    # excluding only the empirically-inapplicable ones (123-tool mastery sweep: chrome needs a live
    # browser; expand_self/self_evolution edit atomic's OWN tree, not /testbed; the positive-bytes
    # session is blocked by the self-expansion guard in a /testbed context). New tools added to the
    # engine are auto-included — the agent's surface tracks the canonical atomic, no manual allowlist.
    out = []
    chosen = []
    onlySet = set(only) if only else None
    for t in tools_raw:
        name = t.get("name")
        if not name or name in DENY_TOOLS:
            continue
        if onlySet is not None and name not in onlySet:
            continue  # INTENT arm: expose only the high-altitude intention surface
        params = t.get("inputSchema") or {"type": "object", "properties": {}}
        out.append({"type": "function", "function": {
            "name": name,
            "description": (t.get("description") or name)[:1024],
            "parameters": params,
        }})
        chosen.append(name)

    if not out:
        # Fallback: a minimal but real atomic edit/read set so the FULL arm still functions if the
        # probe could not start the local server (e.g. wrong cwd). These mirror the engine's schemas.
        out = _FALLBACK_TOOLS
        chosen = [t["function"]["name"] for t in out]

    if include_run_tests:
        out.append({"type": "function", "function": {
            "name": "run_tests",
            "description": "Run the failing+regression tests. Returns pass/fail + output. Call after edits.",
            "parameters": {"type": "object", "properties": {}},
        }})
    return out, set(chosen)


_FALLBACK_TOOLS = [
    {"type": "function", "function": {"name": "atomic_grep",
        "description": "Search the repo for a regex (file:line:content).",
        "parameters": {"type": "object", "properties": {"pattern": {"type": "string"}, "path": {"type": "string"}}, "required": ["pattern"]}}},
    {"type": "function", "function": {"name": "code_readcode",
        "description": "Read a source file (numbered lines).",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "atomic_outline",
        "description": "Structural map of a file: classes/functions with line ranges.",
        "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}}},
    {"type": "function", "function": {"name": "atomic_replace_text",
        "description": "Governed atomic edit: replace unique verbatim `oldText` with `newText`. Byte-removing edits require `proofOfIncorrectness` (>=20 chars).",
        "parameters": {"type": "object", "properties": {"file": {"type": "string"}, "oldText": {"type": "string"}, "newText": {"type": "string"}, "proofOfIncorrectness": {"type": "string"}}, "required": ["file", "oldText", "newText"]}}},
]


def atomic_full_provision(sb, iid, sbexec, log, full_bundle_path, conda, sandbox_dir="/root/atomic-edit"):
    """Stage the COMPLETE atomic bundle (dist + node_modules) into the sandbox and guarantee node.
    Mirrors _atomic_provision but uses atomic-call.mjs (full MCP) as the dispatch entrypoint and a
    full-MCP selftest (tools/call atomic_replace_text). Aborts loudly on failure (never silently
    falls back to OFF — that would corrupt A/B attribution). Returns the node binary path."""
    nb, _ = sbexec(sb, "command -v node || true")
    nb = (nb or "").strip().splitlines()[0].strip() if nb else ""
    if not nb:
        log(iid, "atomic-full: node not on PATH — installing nodejs via conda-forge")
        _o, _ = sbexec(sb, f"{conda} && conda install -y -c conda-forge nodejs >/dev/null 2>&1; "
                           "command -v node || echo /opt/miniconda3/envs/testbed/bin/node", timeout=900)
        nb = (_o or "").strip().splitlines()[-1].strip()
    ver, _ = sbexec(sb, f"{shlex.quote(nb)} --version 2>&1 || true")
    if not (ver or "").strip().startswith("v"):
        raise RuntimeError(f"ATOMIC_FULL_PROVISION: no usable node in sandbox (got {ver!r})")
    data = Path(full_bundle_path).read_bytes()
    with sb.open("/tmp/atomic-full-bundle.tgz", "wb") as f:
        f.write(data)
    sbexec(sb, f"rm -rf {sandbox_dir} && mkdir -p /root && tar -xzf /tmp/atomic-full-bundle.tgz -C /root", timeout=600)
    # the bundle may unpack to /root/atomic-edit/ (preferred) — normalize if it unpacked to a nested name
    chk, _ = sbexec(sb, f"test -f {sandbox_dir}/dist/server.js && echo OK || echo NO")
    if "OK" not in chk:
        found, _ = sbexec(sb, "ls -d /root/*/dist/server.js 2>/dev/null | head -1")
        found = (found or "").strip()
        if found:
            parent = found[:-len("/dist/server.js")]
            sbexec(sb, f"rm -rf {sandbox_dir}; ln -s {shlex.quote(parent)} {sandbox_dir}")
            chk, _ = sbexec(sb, f"test -f {sandbox_dir}/dist/server.js && echo OK || echo NO")
    if "OK" not in chk:
        raise RuntimeError("ATOMIC_FULL_PROVISION: dist/server.js not found in unpacked full bundle")
    # full-MCP selftest: a purely-additive governed edit on a throwaway file via atomic-call.mjs
    st = (
        "import json,subprocess,os\n"
        "os.makedirs('/tmp/_afw',exist_ok=True)\n"
        "open('/tmp/_afw/m.py','w').write('def f(x):\\n    return x + 1\\n')\n"
        "args=json.dumps({'file':'/tmp/_afw/m.py','oldText':'return x + 1','newText':'return x + 1  # full selftest'})\n"
        f"env={{**os.environ,'ATOMIC_WORKSPACE_ROOT':'/tmp/_afw','ATOMIC_EDIT_ALLOWED_ROOTS':'/tmp/_afw','ATOMIC_DISABLE_HOT_RELOAD':'1'}}\n"
        f"r=subprocess.run([{json.dumps(nb)},'{sandbox_dir}/atomic-call.mjs','atomic_replace_text',args],"
        "stdout=subprocess.PIPE,stderr=subprocess.PIPE,universal_newlines=True,env=env)\n"
        "out=(r.stdout or '')\n"
        # robust: parse ok from ANY json line (atomic-call may print a diff-preview after the JSON),
        # and also accept the ground truth: the file actually got the edit.
        "ok=False\n"
        "for ln in out.splitlines():\n"
        "  s=ln.strip()\n"
        "  if s.startswith('{') and '\\\"ok\\\"' in s:\n"
        "    try:\n"
        "      if json.loads(s).get('ok') is True: ok=True; break\n"
        "    except Exception: pass\n"
        "if not ok and 'full selftest' in open('/tmp/_afw/m.py').read(): ok=True\n"
        "print('SELFTEST_OK' if ok else ('SELFTEST_FAIL '+out[-300:]+(r.stderr or '')[-200:]))\n"
    )
    b64 = base64.b64encode(st.encode()).decode()
    out, _ = sbexec(sb, f"python3 -c \"import base64;exec(base64.b64decode('{b64}').decode())\"", timeout=120)
    if 'SELFTEST_OK' not in out:
        raise RuntimeError(f"ATOMIC_FULL_PROVISION: full-MCP selftest failed in sandbox: {out[:400]}")
    log(iid, f"atomic-full: node {ver.strip()} ready; COMPLETE MCP bundle staged + full-call selftest GREEN")
    return nb


def sb_atomic_call(sb, sbexec, node_bin, tool, args, sandbox_dir="/root/atomic-edit", workspace="/testbed"):
    """Dispatch ANY atomic MCP tool one-shot via atomic-call.mjs inside the sandbox, against the
    /testbed workspace. Normalizes file paths to absolute /testbed/... and injects the edit-root jail
    env. Returns a compact string result (OK-prefixed when an edit landed, for the agent contract)."""
    a = dict(args or {})
    for key in ("file", "path", "target"):
        v = a.get(key)
        if isinstance(v, str) and v and not v.startswith("/"):
            a[key] = workspace.rstrip("/") + "/" + v.lstrip("/")
    driver = (
        "import json,subprocess,os,sys\n"
        "d=json.loads(sys.stdin.read())\n"
        f"env={{**os.environ,'ATOMIC_WORKSPACE_ROOT':{json.dumps(workspace)},'ATOMIC_EDIT_ALLOWED_ROOTS':{json.dumps(workspace)},'ATOMIC_DISABLE_HOT_RELOAD':'1'}}\n"
        "r=subprocess.run([d['node'],d['cli'],d['tool'],json.dumps(d['args'])],"
        "stdout=subprocess.PIPE,stderr=subprocess.PIPE,universal_newlines=True,env=env)\n"
        "raw_out=(r.stdout or '')\n"
        # strip the engine's stderr banner; keep tool content. JSON tool results carry ok/error;
        # read/analysis tools (code_readcode/outline/grep) return plain text — pass it through
        # cleanly and generously (head-biased, ~3000 chars) so the FULL arm reads code as well as
        # the OFF arm does (fair A/B), not a scary truncated 'unparsed' blurb.
        "out=raw_out.strip()\n"
        "lines=[l for l in out.splitlines() if l.strip().startswith('{') and '\\\"ok\\\"' in l]\n"
        "v=None\n"
        "for ln in reversed(lines):\n"
        "  try: v=json.loads(ln.strip()); break\n"
        "  except Exception: pass\n"
        "if v is not None:\n"
        "  ok=v.get('ok')\n"
        "  if ok is True: print('OK: '+json.dumps(v)[:1500])\n"
        "  elif ok is False: print('REFUSED/ERROR: '+str(v.get('error') or v.get('reason') or json.dumps(v))[:1200])\n"
        "  else: print('RESULT: '+json.dumps(v)[:1500])\n"
        "else:\n"
        "  body=out if len(out)<=3000 else out[:3000]+'\\n...[truncated]'\n"
        "  print(body or '(no output)')\n"
    )
    payload = json.dumps({"node": node_bin, "cli": f"{sandbox_dir}/atomic-call.mjs", "tool": tool, "args": a})
    b64 = base64.b64encode(driver.encode()).decode()
    pl = payload.replace("'", "'\\''")
    out, _ = sbexec(sb, f"printf '%s' '{pl}' | python3 -c \"import base64;exec(base64.b64decode('{b64}').decode())\"", timeout=300)
    return out.strip() or "(no output)"

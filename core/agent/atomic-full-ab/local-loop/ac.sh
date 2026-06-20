#!/usr/bin/env bash
# ac.sh — atomic-only hands for a same-model (Claude) ATOMIC arm.
# Usage: ac.sh <workdir> <tool> '<json-args>'
# Dispatches one atomic-call tool against <workdir>, jailed to it. This is the ONLY way the atomic-Claude
# arm may read/search/edit/create — it must NOT use native Read/Edit/Write/Grep/Glob for code.
# Tools: atomic_grep, code_outline_batch, code_readcode, atomic_read_file (line range: file,startLine,endLine,includeContent),
#        atomic_replace_text (file,oldText,newText[,proofOfIncorrectness]), atomic_create_file (file,content).
set -uo pipefail
WD="$(cd "$1" && pwd)"; TOOL="$2"; ARGS="${3:-{}}"
AC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../atomic-edit" && pwd)/atomic-call.mjs"
# absolutize file/path/cwd args against the workdir (atomic-call blanks the workspace root)
ARGS="$(WD="$WD" python3 - "$ARGS" <<'PY'
import json,os,sys
wd=os.environ["WD"]
try: a=json.loads(sys.argv[1])
except Exception: a={"path":sys.argv[1]}
def ab(p): return p if os.path.isabs(p) else os.path.join(wd,p)
for k in ("file","path","cwd"):
    if isinstance(a.get(k),str) and a[k] and not os.path.isabs(a[k]): a[k]=ab(a[k])
if isinstance(a.get("items"),list):
    a["items"]=[{**it,"path":ab(it["path"])} if isinstance(it,dict) and isinstance(it.get("path"),str) else it for it in a["items"]]
if "glob" in a and not a.get("cwd"): a["cwd"]=wd
print(json.dumps(a))
PY
)"
ATOMIC_DISABLE_HOT_RELOAD=1 ATOMIC_WORKSPACE_ROOT="$WD" ATOMIC_DECLARED_WORKSPACE_ROOT="$WD" \
  ATOMIC_EDIT_ALLOWED_ROOTS="$WD" node "$AC" "$TOOL" "$ARGS" 2>&1

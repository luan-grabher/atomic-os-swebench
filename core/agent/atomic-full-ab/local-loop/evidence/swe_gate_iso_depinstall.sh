#!/usr/bin/env bash
# swe_gate_iso.sh <workdir> <taskdir> — clobber-immune feedback gate (canonical is omp-co-edited). Robust:
# command-substitution + here-string (no process-sub+heredoc fragility); handles BOTH test-id formats:
#  - NODE-ID repos (path::test[param]) → shlex.quote each id (CLASS-GATE-PARAMTEST-IDS, R043).
#  - BARE-NAME repos (sympy: test_Eq) → run the test FILE(s) from the test_patch with `-k "n1 or n2 ..."`
#    (CLASS-GATE-BARE-TEST-NAMES, R048). Drops malformed/unbalanced-bracket ids.
set -uo pipefail
WD="$1"; TD="$2"
CONT="${SWE_CONTAINER:?set SWE_CONTAINER}"
META="$TD/meta.json"; TP="$TD/.gold/test_patch.diff"
CENV="${SWE_CONDA_ENV:-testbed}"

TARGET_ARGS="$(python3 - "$META" "${SWE_P2P_SAMPLE:-15}" "$TP" <<'PY'
import json,sys,re,shlex
m=json.load(open(sys.argv[1])); n=int(sys.argv[2]); tp=sys.argv[3] if len(sys.argv)>3 else ''
def keep(t):
    t=t.strip()
    if not t or re.match(r'^\[\d+%\]$', t): return False
    if t.count('[') != t.count(']'): return False
    return True
ids=[t.strip() for t in (m["FAIL_TO_PASS"] + m["PASS_TO_PASS"][:n]) if keep(t)]
nodeids=[t for t in ids if ('::' in t or t.endswith('.py'))]
bare=[t for t in ids if t not in nodeids and re.match(r'^[A-Za-z_]\w*$', t)]
if nodeids:
    print(' '.join(shlex.quote(t) for t in nodeids))
elif bare:
    files=[]
    try:
        for l in open(tp):
            if l.startswith('+++ b/') and l.rstrip().endswith('.py'):
                files.append(l[6:].strip())
    except Exception:
        pass
    files=sorted(set(files))
    if files:
        # Run the test FILE(s) whole — NO -k. The sympy bin/test -k is a substring filter (no a-or-b); pytest -k
        # works but running the whole F2P file is a valid stricter gate that works for BOTH runners.
        print(' '.join(shlex.quote(f) for f in files))
PY
)"
# count targets for the marker (node ids OR bare-name -k terms)
ntargets=$(python3 - "$META" "${SWE_P2P_SAMPLE:-15}" <<'PY'
import json,sys,re
m=json.load(open(sys.argv[1])); n=int(sys.argv[2])
c=sum(1 for t in (m["FAIL_TO_PASS"]+m["PASS_TO_PASS"][:n]) if t.strip() and t.count('[')==t.count(']') and not re.match(r'^\[\d+%\]$',t.strip()))
print(c)
PY
)

diff="$(cd "$WD" && git diff HEAD)"
if [ -z "$diff" ]; then echo "(empty diff — make an edit first, then test)"; echo "# tests 0"; echo "# pass 0"; echo "# fail 1"; exit 1; fi
if [ -z "${TARGET_ARGS// }" ]; then echo "GATE_UNSUPPORTED: could not build test targets"; echo "# tests 0"; echo "# pass 0"; echo "# fail 1"; exit 2; fi
docker inspect "$CONT" >/dev/null 2>&1 || { echo "INFRA_FAIL: no container $CONT"; echo "# tests ${ntargets}"; echo "# pass 0"; echo "# fail 1"; exit 2; }

tmpd="$(mktemp -d)"; printf '%s\n' "$diff" > "$tmpd/arm.diff"; cp "$TP" "$tmpd/test.diff" 2>/dev/null || : > "$tmpd/test.diff"
docker cp "$tmpd/arm.diff" "$CONT":/tmp/arm.diff >/dev/null 2>&1
docker cp "$tmpd/test.diff" "$CONT":/tmp/test.diff >/dev/null 2>&1
rm -rf "$tmpd"

out="$(docker exec "$CONT" bash -lc "
cd /testbed || exit 9
git checkout -- . >/dev/null 2>&1; git clean -fdq >/dev/null 2>&1 || true
# CLASS-GATE-ARM-APPLY-STRICT (CRITICAL gate bug): strict 'git apply' (no fallback) FALSE-FAILED the arm's diff on
# context shift from multi-edit diffs → ARM_PATCH_FAILED → false pass=0 → the model thrashed/reverted thinking its
# (valid) edit was wrong (pytest-10356 gate-ON: 6 of 11 run_tests were ARM_PATCH_FAILED — I'd misread this as a
# 'model-synthesis ceiling'). Robust apply: try --3way, then plain, then patch -p1; only fail if ALL miss.
git apply --3way /tmp/arm.diff 2>/tmp/aerr || git apply /tmp/arm.diff 2>>/tmp/aerr || git apply -C1 /tmp/arm.diff 2>>/tmp/aerr || patch -p1 --fuzz=3 < /tmp/arm.diff 2>>/tmp/aerr || { echo ARM_PATCH_FAILED; sed -n '1,5p' /tmp/aerr; git checkout -- . >/dev/null 2>&1; exit 3; }
git apply /tmp/test.diff >/dev/null 2>&1 || git apply --3way /tmp/test.diff >/dev/null 2>&1 || true
source /opt/miniconda3/bin/activate $CENV >/dev/null 2>&1 || source activate $CENV >/dev/null 2>&1 || true
# CLASS-GATE-NATIVE-RUNNER (R051): auto-detect runner — pytest if available, else bin/test (no pytest in testbed).
if python -m pytest --version >/dev/null 2>&1; then RUNNER='python -m pytest -p no:cacheprovider -q'
elif [ -f bin/test ]; then RUNNER='python bin/test'
else RUNNER='python -m pytest -q'; fi
_o=\"\$(\$RUNNER $TARGET_ARGS 2>&1)\"; rc=\$?
# CLASS-GATE-DEP-INSTALL (R052, generalist): the official eval installs a fix's NEW deps; replicate so an appdirs-style
# new-import fix is not FALSE-FAILED by the gate (which caused atomic to flail on pylint-4661). On 'No module named X',
# pip-install X once and retry — a FAITHFUL gate (only a real test failure should be red, never a missing-dep artifact).
_miss=\$(printf '%s' \"\$_o\" | grep -oE \"No module named '[^']+'\" | head -1 | tr -d \"'\" | awk '{print \$NF}')
if [ -n \"\$_miss\" ]; then pip install \"\$_miss\" -q >/dev/null 2>&1 && { _o=\"\$(\$RUNNER $TARGET_ARGS 2>&1)\"; rc=\$?; }; fi
printf '%s\n' \"\$_o\" | tail -15
git checkout -- . >/dev/null 2>&1; git clean -fdq >/dev/null 2>&1 || true
exit \$rc
")"
rc=$?
echo "$out" | grep -vE '^\s*$' | tail -12
passed=$(echo "$out" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" | head -1); passed=${passed:-0}
failed=$(echo "$out" | grep -oE "[0-9]+ (failed|error)" | grep -oE "[0-9]+" | head -1); failed=${failed:-0}
if [ "$rc" -ne 0 ] && [ "$failed" -eq 0 ]; then failed=1; fi
echo "# tests ${ntargets}"
echo "# pass ${passed}"
echo "# fail ${failed}"
exit $rc

#!/usr/bin/env bash
# swe_docker_gate.sh <workdir> <taskdir> — TEST-FEEDBACK gate via a WARM container of the instance image.
#
# Faithful env (the instance's own conda env), fast (container stays warm across calls). Per call:
#   1. copy the arm's CURRENT source diff + the hidden test_patch into the container
#   2. reset /testbed, apply arm diff, apply test_patch (adds the F2P test), run F2P+P2P sample
#   3. reset /testbed (leave the warm container pristine for the next call)
# The arm never sees/edits the tests (no leak); the arm's host working tree is untouched.
# Emits node-style markers (# tests/# pass/# fail) parsed by local_atomic_agent.py; exit = pytest rc.
#
# Env: SWE_CONTAINER (warm container name, required), SWE_P2P_SAMPLE (default 15), SWE_CONDA_ENV (testbed)
set -uo pipefail
WD="$1"; TD="$2"
CONT="${SWE_CONTAINER:?set SWE_CONTAINER}"
META="$TD/meta.json"; TP="$TD/.gold/test_patch.diff"
CENV="${SWE_CONDA_ENV:-testbed}"

# CLASS-GATE-PARAMTEST-IDS (R043, generalist): parametrized pytest node ids contain commas/brackets/spaces
# (e.g. test_csv_regex_comma_in_quantifier[foo, bar]). The old code space-joined them into $TARGETS and passed
# it UNQUOTED to remote pytest, so bash word-split the id ('...[foo,') and produced fake "not found" feedback.
# Render each target with Python shlex.quote instead of hand-rolled Bash escaping, then count the quoted ids.
TARGETS=""
ntargets=0
while IFS= read -r quoted; do
  [ -z "$quoted" ] && continue
  TARGETS="$TARGETS $quoted"
  ntargets=$((ntargets+1))
done < <(python3 - "$META" "${SWE_P2P_SAMPLE:-15}" <<'PY'
import json,sys,re,shlex
m=json.load(open(sys.argv[1])); n=int(sys.argv[2])
# Keep only real pytest node ids; drop dataset junk like "[100%]" progress artifacts in PASS_TO_PASS.
def ok(t):
    t=t.strip()
    if not t or re.match(r'^\[\d+%\]$', t): return False
    # CLASS-GATE-PARAMTEST-IDS (R043): the SWE-bench dataset's P2P list can contain a MALFORMED/truncated
    # parametrized node id (pylint-8898: 'test_csv_regex_comma_in_quantifier[foo,' — a CSV-split fragment with
    # an unbalanced '['). Such an id is not a real test, so pytest reports "not found" and the gate lies.
    # Drop ids whose brackets are unbalanced (the official harness is robust to this; our cmdline gate must be too).
    if t.count('[') != t.count(']'): return False
    return ("::" in t) or t.endswith(".py")
print("\n".join(shlex.quote(t) for t in (m["FAIL_TO_PASS"] + m["PASS_TO_PASS"][:n]) if ok(t)))
PY
)

infra_fail() {
  msg="$1"
  rc="${2:-2}"
  echo "INFRA_FAIL: $msg"
  echo "# tests ${ntargets:-0}"
  echo "# pass 0"
  echo "# fail 1"
  exit "$rc"
}

diff="$(cd "$WD" && git diff HEAD)"
if [ -z "$diff" ]; then echo "(empty diff — make an edit first, then test)"; echo "# tests 0"; echo "# pass 0"; echo "# fail 1"; exit 1; fi

if ! docker inspect "$CONT" >/dev/null 2>&1; then
  infra_fail "container '$CONT' does not exist" 2
fi
if [ "$(docker inspect -f '{{.State.Running}}' "$CONT" 2>/dev/null || true)" != "true" ]; then
  infra_fail "container '$CONT' is not running" 2
fi

tmpd="$(mktemp -d)"; printf '%s\n' "$diff" > "$tmpd/arm.diff"; cp "$TP" "$tmpd/test.diff" 2>/dev/null || : > "$tmpd/test.diff"
docker cp "$tmpd/arm.diff" "$CONT":/tmp/arm.diff >/dev/null 2>&1 || { rm -rf "$tmpd"; infra_fail "failed to copy arm diff into container '$CONT'" 2; }
docker cp "$tmpd/test.diff" "$CONT":/tmp/test.diff >/dev/null 2>&1 || { rm -rf "$tmpd"; infra_fail "failed to copy test diff into container '$CONT'" 2; }
rm -rf "$tmpd"

out="$(docker exec "$CONT" bash -lc "
cd /testbed || exit 9
git checkout -- . >/dev/null 2>&1; git clean -fdq >/dev/null 2>&1 || true
git apply /tmp/arm.diff 2>/tmp/aerr || { echo ARM_PATCH_FAILED; sed -n '1,5p' /tmp/aerr; git checkout -- . >/dev/null 2>&1; exit 3; }
git apply /tmp/test.diff >/dev/null 2>&1 || git apply --3way /tmp/test.diff >/dev/null 2>&1 || true
source /opt/miniconda3/bin/activate $CENV >/dev/null 2>&1 || source activate $CENV >/dev/null 2>&1 || true
python -m pytest -p no:cacheprovider -q $TARGETS 2>&1 | tail -12
rc=\${PIPESTATUS[0]}
git checkout -- . >/dev/null 2>&1; git clean -fdq >/dev/null 2>&1 || true
exit \$rc
")"
rc=$?
echo "$out" | grep -vE '^\s*$' | tail -10
passed=$(echo "$out" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" | head -1); passed=${passed:-0}
failed=$(echo "$out" | grep -oE "[0-9]+ (failed|error)" | grep -oE "[0-9]+" | head -1); failed=${failed:-0}
if [ "$rc" -ne 0 ] && [ "$failed" -eq 0 ]; then failed=1; fi
echo "# tests ${ntargets}"
echo "# pass ${passed}"
echo "# fail ${failed}"
exit $rc

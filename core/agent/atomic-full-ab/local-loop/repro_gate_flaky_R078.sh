#!/usr/bin/env bash
# Reproduce-first for CLASS-FLAKY-LOCAL-GATE-NONDETERMINISM (doctrine gap #9).
# Apply R078's known-green gold strip_accents fix to a fresh scikit-15100 workdir + container,
# then run swe_gate_iso.sh N times on the IDENTICAL diff. If verdicts differ -> flaky gate confirmed.
set -uo pipefail
HERE="/Users/danielpenin/atomic-os-swebench/core/agent/atomic-full-ab/local-loop"
cd "$HERE"
ID=scikit-learn__scikit-learn-15100
TD="$HERE/tasks/SWE-$ID"
PRISTINE="/private/tmp/swe/suite/$ID/pristine"
WD="/private/tmp/swe/repro/gateflaky/$ID"
CONT="scikit15100_gateflaky_repro"
N=5

rm -rf "$WD"; mkdir -p "$(dirname "$WD")"; cp -R "$PRISTINE" "$WD"
git -C "$WD" reset --hard -q HEAD; git -C "$WD" clean -fdq

# Extract R078's exact final_diff (the s7-green gold fix) and apply it
python3 -c "import json;open('/tmp/r078_green.patch','w').write(json.load(open('$HERE/evidence/R078/${ID}__atomic_gateON.json'))['final_diff'])"
git -C "$WD" apply /tmp/r078_green.patch && echo "applied green diff OK" || { echo "APPLY FAILED"; exit 2; }
echo "=== diff in workdir ==="; git -C "$WD" --no-pager diff --stat HEAD

IMG=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -iE "sweb.*scikit.*15100" | head -1)
docker rm -f "$CONT" >/dev/null 2>&1
docker run -d --name "$CONT" "$IMG" tail -f /dev/null >/dev/null 2>&1
echo "container $CONT from $IMG"

echo "=== running swe_gate_iso.sh ${N}x on the IDENTICAL green diff ==="
for i in $(seq 1 $N); do
  out=$(env SWE_CONTAINER=$CONT SWE_P2P_SAMPLE=8 bash /private/tmp/swe/iso-driver-claude/swe_gate_iso.sh "$WD" "$TD" 2>&1)
  verdict=$(printf '%s\n' "$out" | grep -aE "# (tests|pass|fail)" | tr '\n' ' ')
  green=$(printf '%s\n' "$out" | grep -aqE "# fail 0" && echo GREEN || echo RED)
  echo "run $i: $green   [$verdict]"
done
docker rm -f "$CONT" >/dev/null 2>&1
echo "=== repro done ==="

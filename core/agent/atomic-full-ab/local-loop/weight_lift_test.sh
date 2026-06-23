#!/usr/bin/env bash
# Clean weak-model WEIGHT-LIFT test (N-sampled resolution RATES, official scoring) — the directive's decisive experiment.
# Built ready-to-fire; self-gates on DeepSeek balance so it only runs when funded. Honest by construction:
#   - WEAK model = DeepSeek one-shot (NO_GATE), whose pylint-7080 baseline is RELIABLY 0 edits (a clean failing baseline,
#     unlike native Claude whose gap is exploration-variance — see the CONFOUND finding in R022-R023-CLAUDE-FINDINGS.md).
#   - Compares RATES over N samples (not single runs) → controls the variance that confounded the native-Claude test.
#   - arms: (A) baseline NO weight, (B) WITH weights injected (ATOMIC_WEIGHTS_FILE). Same model, weight the only variable.
#   - every sample scored on the OFFICIAL SWE-bench harness. No fake green; the number is the resolution rate per arm.
# Usage:  bash weight_lift_test.sh [N] [INSTANCE]    (defaults N=5, INSTANCE=pylint-dev__pylint-7080)
set -uo pipefail
cd "$(dirname "$0")"
N="${1:-5}"
ID="${2:-pylint-dev__pylint-7080}"
LOOP="$PWD"; ISO=/private/tmp/swe/iso-driver-claude/laa_iso.py
ACALL=/Users/danielpenin/atomic-os-swebench/core/atomic-edit/atomic-call.mjs
WEIGHTS="$LOOP/.corpus/weights.jsonl"
TD="$LOOP/tasks/SWE-$ID"
source /tmp/.atomic_creds.sh
export DEEPSEEK_MODEL=deepseek-v4-pro ATOMIC_CALL="$ACALL"

# --- self-gate on funds: refuse to run (and make no claim) if DeepSeek is broke ---
avail=$(curl -s -m 15 https://api.deepseek.com/user/balance -H "Authorization: Bearer $DEEPSEEK_API_KEY" 2>/dev/null \
        | python3 -c "import sys,json;print(json.load(sys.stdin).get('is_available'))" 2>/dev/null)
if [ "$avail" != "True" ]; then echo "BLOCKED: DeepSeek not funded (is_available=$avail) — cannot run, no claim made."; exit 3; fi

ensure_setup () { ls -d /private/tmp/swe/suite/$ID/pristine >/dev/null 2>&1 || python3 swe_suite_setup.py "$ID" >/dev/null 2>&1; }
ensure_setup
mkdir -p evidence/NLIFT/clean

run_arm () { # $1=arm(base|weight) $2=sample-index
  local arm="$1" i="$2"
  local wd="/private/tmp/swe/round/CLEAN/${ID}_${arm}_${i}/atomic"
  rm -rf "$wd"; mkdir -p "$(dirname "$wd")"; cp -R /private/tmp/swe/suite/$ID/pristine "$wd"
  git -C "$wd" reset --hard -q HEAD; git -C "$wd" clean -fdq
  if [ "$arm" = "weight" ]; then export ATOMIC_WEIGHTS_FILE="$WEIGHTS"; else unset ATOMIC_WEIGHTS_FILE; fi
  local out="/tmp/clean_${arm}_${i}.json"
  python3 "$ISO" --workdir "$wd" --task "$TD/PROBLEM.md" --gate NONE --out "$out" --max-steps 60 >/dev/null 2>&1
  local pred="evidence/NLIFT/clean/pred_${arm}_${i}.jsonl"
  python3 -c "
import json,subprocess
d=subprocess.run(['git','-C','$wd','diff','HEAD'],capture_output=True,text=True).stdout
json.dump({'instance_id':'$ID','model_name_or_path':'clean-${arm}-$i','model_patch':d}, open('$pred','w')); open('$pred','a').write(chr(10))
" 2>/dev/null
  python3 -m swebench.harness.run_evaluation --dataset_name princeton-nlp/SWE-bench_Verified \
    --predictions_path "$pred" --run_id "clean_${arm}_${i}" --max_workers 1 --cache_level instance >/tmp/clean_${arm}_${i}.log 2>&1
  grep -qE 'Instances resolved: 1' /tmp/clean_${arm}_${i}.log && echo 1 || echo 0
}

echo "CLEAN WEIGHT-LIFT TEST  instance=$ID  N=$N  (weak model = DeepSeek one-shot; weight = only variable)"
base=0; wgt=0
for i in $(seq 1 "$N"); do
  b=$(run_arm base "$i");   base=$((base + b)); echo "  sample $i  baseline=$b"
  w=$(run_arm weight "$i"); wgt=$((wgt + w));   echo "  sample $i  weight=$w"
done
echo ""
echo "=== RESULT (official, N=$N) ==="
echo "  baseline (no weight): $base/$N resolved"
echo "  with weight:          $wgt/$N resolved"
echo "  LIFT (with - base):   $((wgt - base))/$N   [positive => the weight lifts the weak model on this class]"
echo "Honest: a single +1 within N is noise; a consistent gap across N (and replicated) is the claim. Don't fake."

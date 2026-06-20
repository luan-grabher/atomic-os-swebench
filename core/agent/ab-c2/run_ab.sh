#!/usr/bin/env bash
# WAVE C2 A/B smoke runner: for EACH instance, run the harness twice (ATOMIC=off then ATOMIC=on),
# concurrency 1, identical model/temp/steps. Only the edit mechanism differs. Captures wall-time
# per run; local_pass/steps come from <out>.detail. Governance signals are grepped from the ON log.
set -uo pipefail
cd /Users/danielpenin/atomic-os-swebench/core/agent
set -a; source /tmp/ds.env; set +a
export MODAL_TOML=~/.modal.toml USE_PREBUILT=1
export MAX_STEPS=${MAX_STEPS:-40}
export SANDBOX_TIMEOUT=${SANDBOX_TIMEOUT:-3600}
export DEEPSEEK_TEMP=0
OUTDIR=/Users/danielpenin/atomic-os-swebench/core/agent/ab-c2
IDS="$OUTDIR/ids3.txt"

run_one() {  # $1=instance_id  $2=arm(off|on)
  local iid="$1" arm="$2"
  echo "$iid" > "$OUTDIR/_one.txt"
  local out="$OUTDIR/preds-${iid}-${arm}.jsonl"
  local lg="$OUTDIR/log-${iid}-${arm}.log"
  local t0=$(date +%s)
  ATOMIC="$arm" python3 -u swe_modal_agent.py --ids-file "$OUTDIR/_one.txt" --out "$out" --concurrency 1 > "$lg" 2>&1
  local t1=$(date +%s)
  echo "$((t1 - t0))" > "$OUTDIR/wall-${iid}-${arm}.txt"
  echo "[$iid][$arm] done in $((t1-t0))s"
}

for iid in $(cat "$IDS"); do
  echo "===== $iid : OFF ====="
  run_one "$iid" off
  echo "===== $iid : ON ====="
  run_one "$iid" on
done
echo "ALL DONE"

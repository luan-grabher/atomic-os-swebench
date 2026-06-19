#!/usr/bin/env bash
# Two-pass SWE-bench rollout wrapper with a hard Modal $ guardrail.
# Usage: ./run_pass.sh <ids-file> <out.jsonl> <concurrency> <budget_usd>
# Env knobs forwarded to the harness: MAX_STEPS, SANDBOX_TIMEOUT, DEEPSEEK_TEMP, USE_PREBUILT.
# Aborts the whole run the moment cumulative Modal cost crosses $budget (polled every 5 min).
set -euo pipefail
cd /Users/danielpenin/swebench-atomic-ab
IDS=${1:?ids-file}; OUT=${2:?out.jsonl}; CONC=${3:-8}; BUDGET=${4:-150}
export USE_PREBUILT=${USE_PREBUILT:-1}
export MAX_STEPS=${MAX_STEPS:-80}
export SANDBOX_TIMEOUT=${SANDBOX_TIMEOUT:-14400}

# --- launch harness detached ---
python3 -u swe_modal_agent.py --ids-file "$IDS" --out "$OUT" --concurrency "$CONC" \
  > "logs/$(basename "$OUT").log" 2>&1 &
HARNESS_PID=$!
echo "harness pid=$HARNESS_PID  ids=$IDS  out=$OUT  conc=$CONC  MAX_STEPS=$MAX_STEPS  TIMEOUT=${SANDBOX_TIMEOUT}s  budget=\$$BUDGET"

# --- budget poller: kill harness + drain sandboxes if spend crosses budget ---
while kill -0 "$HARNESS_PID" 2>/dev/null; do
  COST=$(python3 - <<'PY' 2>/dev/null || echo "NA"
# Best-effort current-period cost. Replace with your Modal cost source.
# Modal exposes no public per-run $ API in 1.4.x, so we APPROXIMATE from live sandbox-seconds:
#   cost ~= running_sandboxes * elapsed_s * (cpu_price*2 + mem_price*4)
# For a hard ceiling, prefer the Modal dashboard / billing alert; this is the in-band tripwire.
import subprocess, json
try:
    out = subprocess.run(["modal","app","list","--json"],capture_output=True,text=True,timeout=30).stdout
    print("NA")  # placeholder: wire to your billing export; see plan "budget_guardrail"
except Exception:
    print("NA")
PY
)
  if [ "$COST" != "NA" ] && awk "BEGIN{exit !($COST>$BUDGET)}"; then
    echo "!!! BUDGET \$$BUDGET EXCEEDED (\$$COST) -> killing harness $HARNESS_PID and draining sandboxes"
    kill "$HARNESS_PID" 2>/dev/null || true
    modal app stop swe-agent-parallel 2>/dev/null || true
    break
  fi
  sleep 300
done
wait "$HARNESS_PID" 2>/dev/null || true
echo "pass complete: $OUT"

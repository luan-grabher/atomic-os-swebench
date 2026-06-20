#!/usr/bin/env bash
# run-ab.sh — the UNIFIED, self-propagating A/B entry point.
#
# Single source of truth: core/atomic-edit (git master). This script REBUILDS the FULL bundle from
# that canonical source on every run, so ANY improvement an agent commits to core/atomic-edit (via
# atomic_expand_self or a direct edit) automatically flows into the benchmark — no stale snapshot.
#
# Usage: bash run-ab.sh <ids-file> [run_id]
#   ARMS env (default "off full") selects which arms to run.
#   Requires DEEPSEEK_API_KEY + a Modal token in the environment.
#   Eval requires Docker running (official swebench harness). If Docker is down it stops after
#   producing predictions and tells you to start it — it never fakes a resolved verdict.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(cd "$HERE/.." && pwd)"
IDS="${1:?usage: run-ab.sh <ids-file> [run_id]}"
RUN_ID="${2:-ab-$(cat "$IDS" | wc -l | tr -d ' ')task}"
ARMS="${ARMS:-off full}"

echo "== [1/4] rebuild FULL bundle from canonical core/atomic-edit (propagation) =="
bash "$HERE/rebuild-bundle.sh"

export DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-deepseek-v4-pro}"
export ATOMIC_FULL_BUNDLE="$AGENT_DIR/atomic-full-bundle.tgz"
export ATOMIC_EDIT_SRC="$(cd "$AGENT_DIR/../atomic-edit" && pwd)"

for arm in $ARMS; do
  echo "== [2/4] agent arm: $arm =="
  ATOMIC_MODE="$arm" python3 "$AGENT_DIR/swe_modal_agent.py" \
    --ids-file "$IDS" --out "$HERE/preds-$arm-$RUN_ID.jsonl" --concurrency "${CONCURRENCY:-4}"
done

if ! docker ps >/dev/null 2>&1; then
  echo "== predictions done. Docker daemon is DOWN — official eval skipped =="
  echo "   start Docker, then: for arm in $ARMS; do bash $HERE/eval.sh $HERE/preds-\$arm-$RUN_ID.jsonl $arm-$RUN_ID; done"
  exit 0
fi

declare -A SUMMARY
for arm in $ARMS; do
  echo "== [3/4] official eval arm: $arm =="
  bash "$HERE/eval.sh" "$HERE/preds-$arm-$RUN_ID.jsonl" "$arm-$RUN_ID" || true
done

echo "== [4/4] attributable delta =="
ON_SUM=$(ls -t *full*"$RUN_ID"*.json 2>/dev/null | head -1 || true)
OFF_SUM=$(ls -t *off*"$RUN_ID"*.json 2>/dev/null | head -1 || true)
if [ -n "$ON_SUM" ] && [ -n "$OFF_SUM" ]; then
  python3 "$HERE/analyze.py" --on "$ON_SUM" --off "$OFF_SUM" --label "full-vs-off $RUN_ID"
else
  echo "   summaries not both found ($ON_SUM / $OFF_SUM); run analyze.py manually."
fi

#!/usr/bin/env bash
# eval.sh — run the OFFICIAL SWE-bench harness on a predictions jsonl for one arm.
# Usage: bash eval.sh <predictions.jsonl> <run_id>
# Env: DATASET (default princeton-nlp/SWE-bench_Verified), SPLIT (default test), MAX_WORKERS (default 4).
# Never fakes a result: if the swebench harness is not importable, it exits non-zero with guidance.
set -euo pipefail

PREDS="${1:?usage: eval.sh <predictions.jsonl> <run_id>}"
RUN_ID="${2:?usage: eval.sh <predictions.jsonl> <run_id>}"
DATASET="${DATASET:-princeton-nlp/SWE-bench_Verified}"
SPLIT="${SPLIT:-test}"
MAX_WORKERS="${MAX_WORKERS:-4}"

if [ ! -f "$PREDS" ]; then echo "eval.sh: predictions file not found: $PREDS" >&2; exit 2; fi

if ! python3 -c "import swebench" >/dev/null 2>&1; then
  echo "eval.sh: the official SWE-bench harness is not importable." >&2
  echo "  Install it:  pip install swebench" >&2
  echo "  or from source:  pip install -e /path/to/SWE-bench" >&2
  echo "  (refusing to fabricate a result without the real evaluator)" >&2
  exit 2
fi

# the harness writes <model_name_or_path>.<run_id>.json in CWD; derive + announce it
MODEL=$(python3 - "$PREDS" <<'PY'
import json,sys
with open(sys.argv[1]) as f:
    for line in f:
        line=line.strip()
        if line:
            print(json.loads(line).get("model_name_or_path","model")); break
PY
)
echo "eval.sh: running official harness | dataset=$DATASET split=$SPLIT workers=$MAX_WORKERS run_id=$RUN_ID"
echo "eval.sh: summary will be written to: ${MODEL}.${RUN_ID}.json"

python3 -m swebench.harness.run_evaluation \
  --dataset_name "$DATASET" --split "$SPLIT" \
  --predictions_path "$PREDS" --max_workers "$MAX_WORKERS" \
  --run_id "$RUN_ID"

echo "eval.sh: done. summary: ${MODEL}.${RUN_ID}.json"

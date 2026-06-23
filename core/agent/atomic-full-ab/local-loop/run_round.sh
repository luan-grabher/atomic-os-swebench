#!/usr/bin/env bash
# run_round.sh <instance_id> <rtag> <img_grep>
# Generic Atomic-only gate-ON round, CANONICAL driver (seq593+ live). Official scoring after.
set -uo pipefail
ID="$1"; RTAG="$2"; IMGGREP="$3"
HERE="/Users/danielpenin/atomic-os-swebench/core/agent/atomic-full-ab/local-loop"
cd "$HERE"
source /tmp/.atomic_creds.sh 2>/dev/null || true
export DEEPSEEK_MODEL=deepseek-v4-pro
export DEEPSEEK_TIMEOUT=120

TD="$HERE/tasks/SWE-$ID"
PRISTINE="/private/tmp/swe/suite/$ID/pristine"
WD="/private/tmp/swe/round/$RTAG/$ID/atomic"
CONT="$(echo ${ID}_${RTAG}_atomic | tr -c 'A-Za-z0-9_' '_')"
OUTDIR="$HERE/evidence/$RTAG"
OUT="$OUTDIR/${ID}__atomic_gateON.json"
PRED="$OUTDIR/${ID}__atomic_gateON.pred.jsonl"
LOG="$OUTDIR/${ID}__atomic_gateON.log"

mkdir -p "$OUTDIR" "$(dirname "$WD")"
[ -d "$PRISTINE/.git" ] || { echo "$RTAG FATAL: no pristine $PRISTINE"; exit 2; }
[ -f "$TD/PROBLEM.md" ] || { echo "$RTAG FATAL: no task $TD/PROBLEM.md"; exit 2; }
rm -rf "$WD"; cp -R "$PRISTINE" "$WD"
git -C "$WD" reset --hard -q HEAD; git -C "$WD" clean -fdq

IMG=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -iE "$IMGGREP" | head -1)
[ -z "$IMG" ] && { echo "$RTAG FATAL: no image matching $IMGGREP"; exit 9; }
docker rm -f "$CONT" >/dev/null 2>&1
docker run -d --name "$CONT" "$IMG" tail -f /dev/null >/dev/null 2>&1
echo "$RTAG ATOMIC(gate-ON) $ID START $(date +%H:%M:%S) img=$IMG cont=$CONT" | tee "$LOG"

python3 "$HERE/local_atomic_agent.py" --workdir "$WD" --task "$TD/PROBLEM.md" \
  --gate "env SWE_CONTAINER=$CONT SWE_P2P_SAMPLE=8 bash /private/tmp/swe/iso-driver-claude/swe_gate_iso.sh $WD $TD" \
  --out "$OUT" --max-steps 70 >>"$LOG" 2>&1
echo "$RTAG agent done $(date +%H:%M:%S)" | tee -a "$LOG"

python3 -c "
import json,re
d=json.load(open('$OUT'))
diff=d.get('final_diff') or ''
open('$PRED','w').write(json.dumps({'instance_id':'$ID','model_name_or_path':'atomic-gateON','model_patch':diff})+chr(10))
print('$RTAG gate_pass',d.get('gate_pass'),'edits',d.get('edits_applied'),'steps',d.get('steps'),'reads',d.get('reads'),'tokens',d.get('tokens'),'diff_lines',d.get('diff_lines'),'files',sorted(set(re.findall(r'\+\+\+ b/(\S+)',diff))))
" | tee -a "$LOG"

echo "$RTAG OFFICIAL scoring START $(date +%H:%M:%S)" | tee -a "$LOG"
python3 -m swebench.harness.run_evaluation --dataset_name princeton-nlp/SWE-bench_Verified \
  --predictions_path "$PRED" --run_id ${RTAG}_$(echo $ID|tr -c 'A-Za-z0-9' '_')_atomic --max_workers 1 --cache_level instance \
  >>"$LOG" 2>&1
echo "$RTAG OFFICIAL: $(grep -iE 'Instances resolved|Instances unresolved' "$LOG" | tail -2)" | tee -a "$LOG"
docker rm -f "$CONT" >/dev/null 2>&1
echo "$RTAG DONE $(date +%H:%M:%S)" | tee -a "$LOG"

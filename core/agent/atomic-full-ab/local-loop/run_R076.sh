#!/usr/bin/env bash
# R076 — Atomic-only on sympy__sympy-20438, gate-ON, CANONICAL driver (has seq593 weight-lockout fix).
# Validates seq593 removes weak-weight read-starvation (R075 = 0 edits / empty patch).
# Compares against FROZEN native baseline Cicero (do NOT rerun native).
set -uo pipefail
HERE="/Users/danielpenin/atomic-os-swebench/core/agent/atomic-full-ab/local-loop"
cd "$HERE"
source /tmp/.atomic_creds.sh 2>/dev/null || true
export DEEPSEEK_MODEL=deepseek-v4-pro
export DEEPSEEK_TIMEOUT=120

ID=sympy__sympy-20438
RTAG=R076
TD="$HERE/tasks/SWE-$ID"
PRISTINE="/private/tmp/swe/suite/$ID/pristine"
WD="/private/tmp/swe/round/$RTAG/sympy20438/atomic"
CONT="sympy20438_r076_atomic"
OUTDIR="$HERE/evidence/$RTAG"
OUT="$OUTDIR/${ID}__atomic_gateON.json"
PRED="$OUTDIR/${ID}__atomic_gateON.pred.jsonl"
LOG="$OUTDIR/${ID}__atomic_gateON.log"

mkdir -p "$OUTDIR" "$(dirname "$WD")"
[ -d "$PRISTINE/.git" ] || { echo "R076 FATAL: no pristine $PRISTINE"; exit 2; }
rm -rf "$WD"; cp -R "$PRISTINE" "$WD"
git -C "$WD" reset --hard -q HEAD; git -C "$WD" clean -fdq

IMG=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -iE "sweb.*sympy.*20438" | head -1)
[ -z "$IMG" ] && { echo "R076 FATAL: no image for sympy-20438"; exit 9; }
docker rm -f "$CONT" >/dev/null 2>&1
docker run -d --name "$CONT" "$IMG" tail -f /dev/null >/dev/null 2>&1
echo "R076 ATOMIC(gate-ON) $ID START $(date +%H:%M:%S) img=$IMG cont=$CONT" | tee "$LOG"

python3 "$HERE/local_atomic_agent.py" --workdir "$WD" --task "$TD/PROBLEM.md" \
  --gate "env SWE_CONTAINER=$CONT SWE_P2P_SAMPLE=8 bash /private/tmp/swe/iso-driver-claude/swe_gate_iso.sh $WD $TD" \
  --out "$OUT" --max-steps 70 >>"$LOG" 2>&1
echo "R076 agent done $(date +%H:%M:%S)" | tee -a "$LOG"

# Build prediction + report edits/files
python3 -c "
import json,re
d=json.load(open('$OUT'))
diff=d.get('final_diff') or ''
open('$PRED','w').write(json.dumps({'instance_id':'$ID','model_name_or_path':'atomic-gateON','model_patch':diff})+chr(10))
print('ATOMIC R076 gate_pass',d.get('gate_pass'),'edits',d.get('edits_applied'),'steps',d.get('steps'),'reads',d.get('reads'),'tokens',d.get('tokens'),'diff_lines',d.get('diff_lines'),'files',sorted(set(re.findall(r'\+\+\+ b/(\S+)',diff))))
" | tee -a "$LOG"

# Official scoring (x86 forced)
echo "R076 OFFICIAL scoring START $(date +%H:%M:%S)" | tee -a "$LOG"
python3 -m swebench.harness.run_evaluation --dataset_name princeton-nlp/SWE-bench_Verified \
  --predictions_path "$PRED" --run_id ${RTAG}_sympy20438_atomic --max_workers 1 --cache_level instance \
  >>"$LOG" 2>&1
echo "R076 OFFICIAL: $(grep -iE 'Instances resolved|resolved:' "$LOG" | tail -2)" | tee -a "$LOG"
docker rm -f "$CONT" >/dev/null 2>&1
echo "R076 DONE $(date +%H:%M:%S)" | tee -a "$LOG"

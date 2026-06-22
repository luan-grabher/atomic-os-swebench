#!/usr/bin/env bash
# gen_ab_atomic_script.sh <instance_id> [iso_path] — emit a CORRECT atomic gate-ON A/B script for any SWE-bench instance.
# Prevents the 2 self-inflicted harness bugs caught in the 2026-06-22 A/B session:
#   BUG-1 (gate-broken): scripts sed'd from a pylint template kept grep "sweb.*pylint.*<id>" → empty IMG for sympy/sklearn
#         → no container → INFRA_FAIL → atomic's gate-ON (its core advantage) was OFF. FIX: derive repo from the instance ID.
#   BUG-2 (path collision): re-runs reused json/run_id/container paths → overwrote each other → unreadable results.
#         FIX: every path keyed by the FULL sanitized instance id (+ optional suffix) = always unique.
# Usage:  bash gen_ab_atomic_script.sh sympy__sympy-16597 [/private/tmp/swe/iso-driver-claude/laa_iso.py] > /tmp/run.sh
set -euo pipefail
ID="${1:?usage: gen_ab_atomic_script.sh <instance_id> [iso_path] [suffix]}"
ISO="${2:-/private/tmp/swe/iso-driver-claude/laa_iso.py}"
SUF="${3:-$(date +%s 2>/dev/null || echo run)}"   # unique suffix; pass an explicit one for reproducibility

# derive the REPO grep token from the instance id (the bug was hardcoding 'pylint'):
#   sympy__sympy-16597 -> sympy ;  pylint-dev__pylint-8898 -> pylint ;  scikit-learn__scikit-learn-12682 -> scikit
case "$ID" in
  scikit*|*scikit-learn*) REPO="scikit" ;;
  pylint*)                REPO="pylint" ;;
  sympy*)                 REPO="sympy" ;;
  django*)                REPO="django" ;;
  astropy*)               REPO="astropy" ;;
  *)  REPO="$(printf '%s' "$ID" | sed -E 's/__.*//; s/[-_].*//')" ;;   # generic: token before __ / first sep
esac
NUM="$(printf '%s' "$ID" | grep -oE '[0-9]+$')"
KEY="$(printf '%s' "${ID}_${SUF}" | tr -c 'A-Za-z0-9' '_')"
CONT="c_${KEY}"; JSON="/tmp/ab_${KEY}.json"; OFF="ab_${KEY}_off"; PRED="evidence/AB/pred_${KEY}.jsonl"; OFFLOG="/tmp/ab_${KEY}_off.log"

cat <<SCRIPT
#!/usr/bin/env bash
# AUTO-GENERATED (gen_ab_atomic_script.sh) for $ID — correct repo grep + unique paths
set -uo pipefail
cd "\$(dirname "\$0")" 2>/dev/null || cd "$PWD"
source /tmp/.atomic_creds.sh 2>/dev/null || true
export DEEPSEEK_MODEL=deepseek-v4-pro
ID=$ID; TD="\$PWD/tasks/SWE-\$ID"
ls -d /private/tmp/swe/suite/\$ID/pristine >/dev/null 2>&1 || python3 swe_suite_setup.py "\$ID" >/dev/null 2>&1
WD="/private/tmp/swe/round/AB/${KEY}/atomic"; rm -rf "\$WD"; mkdir -p "\$(dirname "\$WD")"
cp -R /private/tmp/swe/suite/\$ID/pristine "\$WD"; git -C "\$WD" reset --hard -q HEAD; git -C "\$WD" clean -fdq
IMG=\$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -iE "sweb.*${REPO}.*${NUM}" | head -1)
[ -z "\$IMG" ] && { echo "AB-ATOMIC FATAL: no image for ${REPO}.*${NUM} (\$ID)"; exit 9; }
docker rm -f $CONT >/dev/null 2>&1; docker run -d --name $CONT "\$IMG" tail -f /dev/null >/dev/null 2>&1
echo "AB-ATOMIC(gate-ON) \$ID START \$(date +%H:%M:%S) img=\$IMG cont=$CONT"
python3 $ISO --workdir "\$WD" --task "\$TD/PROBLEM.md" \\
  --gate "env SWE_CONTAINER=$CONT SWE_P2P_SAMPLE=8 bash /private/tmp/swe/iso-driver-claude/swe_gate_iso.sh \$WD \$TD" \\
  --out $JSON --max-steps 70
python3 -c "import json,re;d=json.load(open('$JSON'));diff=d.get('final_diff') or '';open('$PRED','w').write(json.dumps({'instance_id':'\$ID','model_name_or_path':'atomic-gateON','model_patch':diff})+chr(10));print('ATOMIC gate_pass',d.get('gate_pass'),'edits',d['edits_applied'],'steps',d['steps'],'files',sorted(set(re.findall(r'\\\\+\\\\+\\\\+ b/(\\\\S+)',diff))))"
python3 -m swebench.harness.run_evaluation --dataset_name princeton-nlp/SWE-bench_Verified --predictions_path $PRED --run_id $OFF --max_workers 1 --cache_level instance > $OFFLOG 2>&1
echo "AB-ATOMIC OFFICIAL \$ID: \$(grep -iE 'Instances resolved' $OFFLOG | tail -1)"
docker rm -f $CONT >/dev/null 2>&1
SCRIPT

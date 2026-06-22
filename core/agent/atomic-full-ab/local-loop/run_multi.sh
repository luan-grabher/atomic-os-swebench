#!/usr/bin/env bash
# run_multi.sh — multi-sample the DeepSeek-atomic suite to separate representation signal from model variance.
# Runs each instance N times (fresh workdir each), writes evidence/<tag>/<instance>__atomic_<k>.json.
# Usage: ./run_multi.sh <tag> <N>
set -uo pipefail
TAG="${1:-Rmulti}"; N="${2:-3}"
HERE="$(cd "$(dirname "$0")" && pwd)"
IDS=(psf__requests-1921 pytest-dev__pytest-7982 pytest-dev__pytest-5262 pylint-dev__pylint-7080 pallets__flask-5014)
OUTDIR="${HERE}/evidence/${TAG}"; mkdir -p "$OUTDIR"
for k in $(seq 1 "$N"); do
  for IID in "${IDS[@]}"; do
    PRISTINE="/tmp/swe/suite/${IID}/pristine"
    TASK="${HERE}/tasks/SWE-${IID}/PROBLEM.md"
    WD="/tmp/swe/round/${TAG}/${IID}_s${k}/atomic"
    OUT="${OUTDIR}/${IID}__atomic_s${k}.json"
    [ -d "$PRISTINE/.git" ] || { echo "NO PRISTINE $IID" >&2; continue; }
    rm -rf "$WD"; mkdir -p "$(dirname "$WD")"; cp -R "$PRISTINE" "$WD"
    git -C "$WD" reset --hard --quiet HEAD; git -C "$WD" clean -fdq
    echo "==== ${TAG} sample ${k} ${IID} $(date +%T) ===="
    python3 "${HERE}/local_atomic_agent.py" --workdir "$WD" --task "$TASK" --gate NONE --out "$OUT" --max-steps 60 2>&1 | grep 'ATOMIC DONE' || echo "(no DONE line)"
  done
done
echo "==== MULTI ${TAG} (N=${N}) COMPLETE $(date +%T) ===="

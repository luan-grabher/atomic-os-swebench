#!/usr/bin/env bash
# Live fiscalization of all 50 instances at once.
LOG=/Users/danielpenin/logs/swe-r3.log
IDS=/Users/danielpenin/swebench-atomic-ab/ids50.txt
echo "================= LIVE $(date +%H:%M:%S) ================="
running=0; passed=0; donec=0; wait=0
while read -r iid; do
  [ -z "$iid" ] && continue
  last=$(grep -F "[$iid]" "$LOG" 2>/dev/null | tail -1)
  short=$(echo "$last" | sed "s/.*\[$iid\] //" | cut -c1-46)
  if echo "$last" | grep -q "done step"; then
    donec=$((donec+1))
    if echo "$last" | grep -q "local_pass=True"; then passed=$((passed+1)); st="✅PASS"; else st="❌fail"; fi
  elif [ -n "$last" ]; then running=$((running+1)); st="…run "
  else st="·wait"; wait=$((wait+1)); fi
  printf "%-32s %s %s\n" "${iid:0:32}" "$st" "$short"
done < "$IDS"
echo "------ running:$running  ✅local-pass:$passed  done:$donec  waiting:$wait ------"

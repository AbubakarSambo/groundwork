#!/bin/bash
# The API's Gemini client stops working after a few hundred sustained calls while
# the process itself stays healthy, so the run is done in chunks with a fresh API
# between them. Resume-safe: completed check-ins are skipped.
cd "$(dirname "$0")/.."
for chunk in 1 2 3 4 5 6; do
  DONE=$(psql -d "$(cat /tmp/jdb.txt)" -t -A -c "select count(*) from check_ins where status='COMPLETED' and session_number=12;" 2>/dev/null)
  if [ "$DONE" = "5" ]; then echo "CHUNKS: all 12 sessions complete"; break; fi
  echo "=== chunk $chunk: restarting API ==="
  pkill -f "start:dev" 2>/dev/null; lsof -ti :3000 2>/dev/null | xargs -r kill -9; sleep 3
  nohup npm run start:dev > /tmp/j-api.log 2>&1 &
  for i in $(seq 1 40); do
    sleep 2
    curl -s -o /dev/null http://localhost:3000/health && break
  done
  echo "=== chunk $chunk: running journey ==="
  npx ts-node -T journey/run.ts 2>&1 | grep -vE "^prisma:" | grep -E "SESSION|AI turns|report:|board:|BLOCKER|DONE|resuming"
done
echo "CHUNKED RUN FINISHED"
psql -d "$(cat /tmp/jdb.txt)" -t -c "select session_number, count(*) from check_ins where status='COMPLETED' group by 1 order by 1;"

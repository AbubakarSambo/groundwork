#!/bin/bash
# Make one copy of the test bed: the five organisations on a fresh local database.
#   journey/sweep/reset.sh a      (or b)
#
# If gw_sweep_<copy> is not there, it is made. If it is there with organisations in it, it is NOT
# deleted: it is renamed to gw_sweep_old_<copy>_<date and time> and a new one is made. Nothing is ever
# removed, so a run that went wrong can still be looked at, and you remove old ones yourself when you
# like. Stop the copy's API first (bed.sh down): a database in use cannot be renamed.
#
# Only a database called gw_sweep_<name> on this computer is ever touched.
set -euo pipefail
cd "$(dirname "$0")/../.."
COPY="${1:-${SWEEP:-a}}"
DB="gw_sweep_${COPY}"
case "$DB" in gw_sweep_[a-z0-9_]*) ;; *) echo "Refusing: $DB" >&2; exit 1;; esac
USER_NAME="${PGUSER:-$(whoami)}"
URL="${SWEEP_DATABASE_URL:-postgresql://${USER_NAME}@localhost:5432/${DB}?schema=public}"
if psql -d postgres -Atc "select 1 from pg_database where datname='${DB}'" | grep -q 1; then
  if [ "$(psql -d "$DB" -Atc 'select count(*) from organizations' 2>/dev/null || echo 0)" != "0" ]; then
    OLD="gw_sweep_old_${COPY}_$(date +%Y%m%d_%H%M%S)"
    if ! psql -d postgres -v ON_ERROR_STOP=1 -qc "ALTER DATABASE ${DB} RENAME TO ${OLD}" 2>/dev/null; then
      echo "${DB} is in use. Stop this copy's API first:  SWEEP=${COPY} journey/sweep/bed.sh down" >&2
      exit 2
    fi
    echo "The old ${DB} is kept as ${OLD}."
    [ -f "journey/sweep/logs/${DB}.log" ] && mv "journey/sweep/logs/${DB}.log" "journey/sweep/logs/${OLD}.log"
    createdb "$DB"
  fi
else
  createdb "$DB"
fi
rm -f "journey/sweep/logs/${DB}.clock" "journey/sweep/logs/${DB}.mark"
DATABASE_URL="$URL" npx prisma migrate deploy 2>&1 | tail -1
SWEEP="$COPY" DATABASE_URL="$URL" npx ts-node -T journey/sweep/seed.ts "$URL"

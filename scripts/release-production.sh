#!/usr/bin/env bash
# RELEASE TO PRODUCTION, IN ONE SCRIPT (Hafsah, 5 November 2026).
#
# Run it twice. The first time is before you click Merge on #414; the second time is after production has deployed.
#
#   PRODUCTION_DATABASE_URL='postgresql://…' ./scripts/release-production.sh
#
# Each run:
#   1. backs up the production database to releases/<date-time>/production.dump (pg_dump, custom format), and stops if that fails;
#   2. runs four read-only queries (inside READ ONLY transactions) and saves their answers in the same folder;
#   3. runs #410's cleanup as a dry run and saves what it would change;
#   4. asks "Apply the cleanup? (yes/no)". Only "yes" applies it. Anything else stops, with nothing changed.
#
# You can stop it at any point (Ctrl-C). Before step 4 nothing on production is changed at all. The only thing it ever removes is what
# the cleanup is for: record lines written from a lead's setup words copied into her first check-in (and, on newer data, those copied
# messages are marked as setup). The database address is never printed or saved.
set -euo pipefail

URL="${PRODUCTION_DATABASE_URL:-${1:-}}"
if [ -z "$URL" ]; then
  echo "Give the production database address: PRODUCTION_DATABASE_URL='postgresql://…' $0" >&2
  exit 1
fi
for tool in pg_dump psql npx; do
  command -v "$tool" >/dev/null || { echo "This needs $tool on this computer. Install it, then run again. Nothing was changed." >&2; exit 1; }
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y-%m-%d-%H%M)"
OUT="$ROOT/releases/$STAMP"
mkdir -p "$OUT"
echo "Everything from this run is saved in $OUT"
echo

# 1. THE BACKUP. Nothing else runs without it.
echo "1 of 4. Backing up the production database (this can take a few minutes)…"
if ! pg_dump --format=custom --no-owner --file="$OUT/production.dump" "$URL"; then
  echo "The backup did not finish, so nothing else was done. If it says the server version is newer, install a matching pg_dump and run again." >&2
  exit 1
fi
echo "   Backup saved: $OUT/production.dump ($(du -h "$OUT/production.dump" | cut -f1))."
echo

# 2. FOUR READ-ONLY QUERIES. Each runs in its own READ ONLY transaction; one that cannot run yet (an older schema before the deploy)
#    says so in its file and the others still run.
echo "2 of 4. Running the four read-only queries…"
run_query() {
  local name="$1" sql="$2"
  if psql "$URL" -X -q -v ON_ERROR_STOP=1 -P pager=off -c "BEGIN READ ONLY;" -c "$sql" -c "ROLLBACK;" > "$OUT/$name.txt" 2>&1; then
    echo "   $name: $(grep -oE '\([0-9]+ rows?\)' "$OUT/$name.txt" | tail -1 | tr -d '()'), saved."
  else
    echo "   $name: could not run yet (saved the reason in $name.txt). Run the script again after the deploy."
  fi
}

run_query "1-organisations-with-the-old-switches-off" "
SELECT o.name, o.direct_morning_on, o.release_1b_tabs_on,
  (SELECT count(*) FROM grounds g WHERE g.organization_id = o.id) AS check_ins
FROM organizations o
WHERE NOT o.direct_morning_on OR NOT o.release_1b_tabs_on
ORDER BY o.name;"

run_query "2-members-whatsapp-cannot-match" "
WITH members AS (
  SELECT DISTINCT g.organization_id, u.id AS uid, lower(u.email) AS email, u.phone_number
  FROM ground_participants gp
  JOIN grounds g ON g.id = gp.ground_id
  JOIN users u ON u.id = gp.user_id AND u.deleted_at IS NULL
  WHERE gp.left_at IS NULL),
roster AS (
  SELECT organization_id, linked_user_id, lower(email) AS email, phone, active
  FROM people WHERE coalesce(phone,'') <> '')
SELECT o.name, count(*) AS members,
  count(*) FILTER (WHERE coalesce(m.phone_number,'') = '' AND NOT EXISTS (
    SELECT 1 FROM roster r WHERE r.organization_id = m.organization_id AND r.active
      AND (r.linked_user_id = m.uid OR r.email = m.email))) AS no_number_anywhere,
  count(*) FILTER (WHERE m.phone_number !~ '^\+?[0-9]+$') AS number_in_an_odd_form
FROM members m JOIN organizations o ON o.id = m.organization_id
GROUP BY o.name ORDER BY no_number_anywhere DESC, o.name;"

run_query "3-deals-built-from-a-leads-first-check-in" "
SELECT o.name, count(*) AS deals_from_a_leads_session_1
FROM work_items w
JOIN record_entries r ON r.id = w.source_entry_id
JOIN check_ins c ON c.id = r.check_in_id AND c.session_number = 1
JOIN ground_participants gp ON gp.id = c.participant_id AND gp.\"partyType\" = 'INITIATOR'
JOIN grounds g ON g.id = c.ground_id
JOIN organizations o ON o.id = g.organization_id
GROUP BY o.name ORDER BY o.name;"

run_query "4-who-the-free-trial-would-remind" "
SELECT o.name, o.free_until AS free_month_ends,
  o.free_plan IS NOT NULL AS gets_the_emails,
  (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL AND u.is_active AND u.email IS NOT NULL
     AND u.role IN ('ADMIN','LEAD')) AS admins_and_leads_told
FROM organizations o
WHERE o.free_until IS NOT NULL
  AND (o.free_trial_started_at IS NOT NULL OR o.free_month_of_release_at IS NOT NULL)
  AND o.subscription_status IS NULL AND o.care_fee_status <> 'ACTIVE'
ORDER BY o.free_until;"
echo

# 3. THE CLEANUP, AS A DRY RUN. It changes nothing without --yes.
CLEANUP="scripts/setup-words-copied-into-the-leads-first-check-in.ts"
echo "3 of 4. #410's cleanup, as a dry run (nothing is changed)…"
cd "$ROOT/api"
if ! DATABASE_URL="$URL" npx ts-node -P tsconfig.json --transpile-only "$CLEANUP" > "$OUT/cleanup-dry-run.txt" 2>&1; then
  echo "   The dry run did not finish (the reason is in cleanup-dry-run.txt). Nothing was changed. Run the script again after the deploy." >&2
  exit 1
fi
tail -n 1 "$OUT/cleanup-dry-run.txt" | sed 's/^/   /'
echo "   The full list is in $OUT/cleanup-dry-run.txt. Read it before you answer."
echo
echo "   If production has not deployed #414 yet, answer no, click Merge on #414, and run this script again once it has."
echo

# 4. ONE QUESTION. Only "yes" applies the cleanup.
read -r -p "4 of 4. Apply the cleanup? (yes/no) " answer
if [ "$answer" != "yes" ]; then
  echo "Nothing was changed. The backup and the answers are in $OUT."
  exit 0
fi
DATABASE_URL="$URL" npx ts-node -P tsconfig.json --transpile-only "$CLEANUP" --yes > "$OUT/cleanup-applied.txt" 2>&1
tail -n 1 "$OUT/cleanup-applied.txt"
echo "The cleanup is applied. What it changed is in $OUT/cleanup-applied.txt, and the backup taken just before is $OUT/production.dump."

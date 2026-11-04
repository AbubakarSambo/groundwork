<!-- ABUBAKAR START -->
## For Abubakar: production in three steps (5 November 2026)

You need the production database address and a checkout of staging, with `npm install` done in `api/` and `pg_dump` and `psql` installed. First merge the small pull request that adds the script into staging (link below), so #414 carries it.

1. **Before you click Merge, run the script up to the dry run:**
   `cd groundwork && git checkout staging && git pull && PRODUCTION_DATABASE_URL='<production address>' ./scripts/release-production.sh`
   It takes a dated backup, runs four read-only queries and shows the cleanup's dry run. When it asks "Apply the cleanup? (yes/no)", type **no**. Send Hafsah the folder it names (`releases/<date-time>/`), without `production.dump`.
2. **Click Merge on #414** (https://github.com/AbubakarSambo/groundwork/pull/414) and let production deploy. The API's start applies the migrations.
3. **Run the same command again, and type yes.** It takes a fresh backup, shows the dry run again and then applies #410's cleanup. **This is urgent:** until it runs, old setup words copied into leads' first check-ins can still be read by their teams.

You can stop the script at any point. Nothing changes on production until you type yes, and the backup is taken first every time.

Everything else (the free trial, the daily email, the checks) is on Hafsah's list.
<!-- ABUBAKAR END -->

# What Abubakar needs

Written 19 November 2026, for Abubakar, who merges Groundwork into staging and production and deploys it.

How this was made. Every fact below was taken from the repository (the `wip/combined` copy, with `origin/staging` and `origin/main` as they are on this computer) or from the documents named beside it. Nothing was guessed. Where a fact could not be confirmed, it is marked **to confirm**, and the reason is given. No secret, key, token or database address is written anywhere in this file. Only the names of settings are given.

Two things you should know before you start.

1. **The documents and the git history disagree about production.** The documents of 19 November (`docs/everything-on-the-list.md`) say that #352 is not merged, that #362 and #364 are waiting, and that #414 is still to be clicked. Git on this computer says that #352, #362, #364, #414 and #418 are all already inside `main`. A read-only check of the real remote, made while writing this (`git ls-remote`), says `main` is still the same commit as on this computer (`4b6d869dd`, the merge of #418, dated 7 November). So the history says these were merged. Whether production was then deployed from `main`, and whether the cleanup script was run with "yes", is not written anywhere. This is **to confirm**, and it decides which steps in section 1 you still have to do.
2. **Staging has moved on since the last copy on this computer.** The remote check shows `staging` at commit `9c21d9545`. This computer only knows staging as `bd75ebbf1` (7 November). The newer commits are not here, so anything this file says about "what is on staging" is as of 7 November. This is **to confirm** against live staging, especially for migration `20261107090000_whom_a_line_is_about_and_how_it_stands`, which is not in the 7 November copy of staging.

---

## 0. Urgent: Rhea's pilot (25 November 2026)

Seen on the Rhea pilot review call on 25 November. Rhea signed up for the free trial but is held to 5 people. Clinton cannot add his team, two people invited by email have not joined, and nobody gets check-ins on WhatsApp.

1. **Put Rhea on 20 people for a month, today.** On production, open Admin, then Free runs. Enter the email of Rhea's admin, choose the plan Small Team (up to 20 people), one month, and press the button. Rhea has already signed up, so it applies to their organisation at once. The screen picks Growth by default, so change it to Small Team or leave Growth if they may go over 20.
2. **Check the free-trial switch on production.** Admin, System, Pricing: the free trial must be on, for 20 people and one month. While it is off, nobody who signs up gets the trial and everyone lands on the 5-person plan.
3. **Resend the invites.** On each Rhea check-in, People and setup, press "Resend invite" for everyone marked "Not joined yet". People added while the plan was full were never sent anything.
4. **WhatsApp templates.** Groundwork cannot write first on WhatsApp until Meta approves the templates and their names are in `WHATSAPP_APPROVED_TEMPLATES` on production. Kennedy has the full list to submit (the document "Groundwork WhatsApp templates", from Hafsah). The first two to submit are `groundwork_first_contact` and `groundwork_checkin_open_v2`. Each name goes into the setting, separated by commas, only once Meta shows it as approved. Then restart the API.
5. **Merge #449 into staging, then to production** (https://github.com/AbubakarSambo/groundwork/pull/449, branch `release-26-nov-free-trial`). Every team gets the free month whatever its size, with no limit on people during the month and WhatsApp free for up to 20 of them. Its migration, `20261126090000_every_organisation_gets_the_free_month_for_any_size`, runs on deploy: every organisation that is not paying (Rhea included) gets at least a month from that day on Small Team, and paying ones are not touched. Nothing to switch on. Take a backup of the database first, as always. Once it is on production, step 1 is no longer needed for anyone.
6. **Then merge #451 into staging, then to production** (https://github.com/AbubakarSambo/groundwork/pull/451, branch `release-26-nov-seats`). It is built on #449, so merge #449 first. No migration and nothing to switch on.
   - A seat is taken when an admin says yes. People a lead adds from outside can check in at once, and an admin has a week to let them in.
   - Reminders to people who have not joined carry their invitation link. Before, the link went to a sign-in page they had no sign-in for, which is likely why Rhea's people never joined.
   - Targets waiting for a lead's yes show at the top of the check-in again.
   - Added 27 November, **not yet tested; hold the merge until Hafsah says they are**:
     - someone waiting for an admin who opens the board is told why it is closed;
     - a lead who is not an admin no longer sees the seat line when adding people;
     - an admin can approve a waiting check-in by saying "approve it" in Ask.
7. **Then #454, once Hafsah says it is tested** (https://github.com/AbubakarSambo/groundwork/pull/454, branch `release-27-nov-setup-and-journey-fixes`). It is built on staging, separate from #449 and #451, with no conflicts with staging as of 27 November. No migration and nothing to switch on.
   - **Setting up a check-in by talking:**
     - "set up a check-in" starts a set-up, even when the lead already has a check-in open;
     - people named from the organisation's list are found with their email addresses;
     - "not sure" at the say-back gets an answer, and "cancel" stops a "which check-in" question.
   - **Ask's new name:** "[first name]'s assistant", with "Helps you navigate your [organisation] Desk" under it, as in Hafsah's standards.
   - **Smaller fixes:**
     - no more "One said" on boards;
     - a full sentence for "Do this first";
     - the screen waits for the end-of-check-in card instead of saying it failed;
     - a stylesheet fix.

**Merge order: #449, then #451, then #454.** #454 can also go on its own, because it does not depend on the other two.

---

## 0B. The executive-office pilot (Halden, a pseudonym): 26 November 2026

The pilot client is called **Halden** everywhere, and its executive **Ebele Dagogo Tamuno**. Please never write the real names in a branch, a pull request, a commit or the code.

1. **#452 is merged into staging** (thank you). Email works like WhatsApp, and files are read as their cells.
   - **Migration:** `20261126180000_a_tracker_row_says_its_sheet` adds a nullable `sheet` column on `payment_tracker_lines`. It runs on deploy.
   - **Prompt rows:** if staging stores `PromptVersion` rows for `scenario.pulse_check.*`, refresh them from the code.
2. **#455 is open, and please hold the merge** (https://github.com/AbubakarSambo/groundwork/pull/455, branch `release-26-nov-halden-reports`).
   - **What it is:** reports followed row by row, the owner asked first, a three-bucket weekly brief with a PDF, deck changes, and the pseudonym in the code.
   - **Why hold:** it is product code only. Its tests, the full suites and the real-model replay come next, in their own PR.
   - **Once that PR is in:**
     - Take a backup.
     - Migration `20261126220000_a_report_row_is_kept` runs on deploy. It adds a new `report_rows` table and a nullable `her_bucket` column on `register_notes`.
     - Refresh the stored prompt row `reports.on-request.work-out-a-workbook` if staging has one.
     - Nothing to switch on.
3. **Two branches carry the client's real name and should be deleted.** Hafsah's rules do not let Claude delete branches, so please do it.
   - On your repository: #452's own branch (the one whose name starts `release-26-nov-` and ends `-email-and-cells`). #452 is merged, so it is safe to delete.
   - On Hafsah's copy (`hafsahjumare-lgtm/groundwork-wip`): the `wip/...-streams` branch named after the client. Hafsah can delete this one.
   - #452's squash commit message on staging also names the client. It cannot be changed without a force-push, so leave it.
4. **WhatsApp templates for the pilot.** The weekly line to the executive, the threshold alert, the question to an owner and the daily prompt need Meta-approved templates before Groundwork can write first. Until they are approved and in `WHATSAPP_APPROVED_TEMPLATES`, those messages go by email. The wording comes from Hafsah's template list.
5. **Nothing to deploy for #455 until Hafsah says it has passed.**

## 1. One-page summary: what to do, and in what order

### 1A. The existing production steps (5 November), kept word for word

<!-- ABUBAKAR START -->
## For Abubakar: production in three steps (5 November 2026)

You need the production database address and a checkout of staging, with `npm install` done in `api/` and `pg_dump` and `psql` installed. The script is already on staging and in #414.

1. **Before you click Merge, run the script up to the dry run:**
   `cd groundwork && git checkout staging && git pull && PRODUCTION_DATABASE_URL='<production address>' ./scripts/release-production.sh`
   It takes a dated backup, runs four read-only queries and shows the cleanup's dry run. When it asks "Apply the cleanup? (yes/no)", type **no**. Send Hafsah the folder it names (`releases/<date-time>/`), without `production.dump`.
2. **Click Merge on #414** (https://github.com/AbubakarSambo/groundwork/pull/414) and let production deploy. The API's start applies the migrations.
3. **Run the same command again, and type yes.** It takes a fresh backup, shows the dry run again and then applies #410's cleanup. **This is urgent:** until it runs, old setup words copied into leads' first check-ins can still be read by their teams.

You can stop the script at any point. Nothing changes on production until you type yes, and the backup is taken first every time.

Everything else (the free trial, the daily email, the checks) is on Hafsah's list.
<!-- ABUBAKAR END -->

What the git history adds to that note. #414 (staging into main) shows as merged on 4 November at 22:25, before the note was written on 5 November. The script itself arrived in #416 on 5 November and is inside `main` now (`scripts/release-production.sh`). So step 2 may already be done. Step 3 (the cleanup with "yes") is urgent and **to confirm**: ask whoever ran it, or look for a `releases/<date-time>/cleanup-applied.txt` file on the computer that ran it. The `releases/` folder is ignored by git, so it is not in the repository.

What the script does, from reading it. It makes a backup with `pg_dump` and stops if that fails. It runs four read-only queries (organisations whose old switches are off, members whose WhatsApp number cannot be matched, deals built from a lead's first check-in, and who the free trial would remind). It runs the cleanup `api/scripts/setup-words-copied-into-the-leads-first-check-in.ts` as a dry run. It changes data only if you type exactly "yes". The database address is never printed or saved.

### 1B. The order for the new release (everything built since staging)

Where the new work stands. The combined branch `wip/combined` holds 317 commits and 2,081 files more than the 7 November copy of staging. It is the integration branch (`mine/wip/integration`) plus four more branches merged in. Nothing from it has been opened as a pull request, because Hafsah's standing rule is: no pull requests or merges until she agrees. So **there are no pull request numbers for it yet.** The order below is the order the work has to go in, and the rules for the pull requests.

1. **Confirm the state** (the two points at the top of this file) and read sections 2, 4, 5 and 6 before touching anything.
2. **Prepare the hosting** (section 2 and section 6). The setting names that must exist are in section 2. The ones people forget are `SETTINGS_ENCRYPTION_KEY`, `PUBLIC_API_URL`, `WHATSAPP_APPROVED_TEMPLATES`, `NODE_ENV`, `FRONTEND_URL`, `STRIPE_CALLBACK_URL` and `TRUST_PROXY_HOPS`, and Node 24.
3. **Take a backup of each database you are about to migrate** and write down the time. The standing rollback rule (`docs/deploy.md`, top) is: restore the backup and the old code together, never the code alone.
4. **Merge the product-only pull requests into staging, in this order.** Hafsah's rule (CLAUDE.md, "Release batches") is that pull requests contain the product only: product code, migrations and the product's own tests. They must never contain the test harness, the judged-run tooling, scoring, plans, status files, standards, issue lists or other notes. The slices follow the order in which the branches were built (`docs/combined-status.md`):
   1. the integration base (it carries migration 2 below, and probably migration 1; which branch carries migration 1 is **to confirm**);
   2. the second-batch overnight work (it carries migration 4 below);
   3. chat is king (no migration);
   4. the memory system (it carries migration 3 below);
   5. the rest of the list (no migration);
   6. design surgery (no migration, one new stylesheet `client/src/styles/design-rules.css`).
   How many pull requests these become, and their numbers, is not decided: **to confirm with Hafsah.** Merge them one at a time and let each deploy on staging before the next.
5. **Migrations.** The API applies them by itself when it starts (see section 1C). Keep the migration timestamps in order across the pull requests (see the caution in 1C).
6. **After staging has deployed:** refresh the three stored prompt rows (section 4), run the smoke checks (section 8), and send Hafsah the result.
7. **Production.** Only after Hafsah has seen staging and agreed. Use the same pull request order into `main`, and the three-step script in 1A for the cleanup. Do not change any switch (section 5) on the same day as the migrations.

### 1C. The migrations newer than staging

Found by comparing the migration folders of `wip/combined` with `origin/staging` (7 November copy). There are four. The folder name must be exactly as written. There are 413 migration folders in all on the combined branch. Every one of these four is add-only: each creates new tables or adds new empty columns, and none changes or deletes existing data or needs a backfill. None of them uses `IF NOT EXISTS`, so none should be applied by hand and then applied again by the API.

| Order | Folder name | What it does | Add-only and safe? |
| --- | --- | --- | --- |
| 1 | `20261107090000_whom_a_line_is_about_and_how_it_stands` | Adds two empty columns to `record_entries` (`about_participant_id` and `standing`) and one index on `about_participant_id`. | Add-only. Every older row stays empty in the new columns. Caution: the index is built without the "concurrent" option, so writes to `record_entries` wait while it builds. The size of that table on production is not known, so how long it takes is **to confirm**. Not in the 7 November copy of staging, so **to confirm** whether live staging already ran it. |
| 2 | `20261118120000_what_a_person_said_against_a_target` | Creates the table `ground_objective_said` (what a person said they did against a target) with a unique index, an index and two cascading links to `ground_objectives` and `ground_participants`. | Add-only. Starts empty. Name it in the release notes (CLAUDE.md and the lists ask for this). |
| 3 | `20261119100000_memory_files` | Creates the table `memory_files` (versioned memory books for each organisation, team, person and project), two indexes and one cascading link to `organizations`. | Add-only. Starts empty. It is filled by the writer after each assessment and by a weekly job. |
| 4 | `20261119120000_organization_pauses_kept_so_a_paid_again_organisation_is_not_counted_again` | Creates the table `organization_pauses` (the stretches when Groundwork was paused for an organisation) and one index. | Add-only, nothing to backfill. An organisation with no row reads exactly as before. |

Cautions about the migrations.

- **Order across pull requests.** Migration 4 (`…119120000`) is built by the second-batch branch, but migration 3 (`…119100000`, the memory files) is built by the memory branch and sorts earlier by name. If the pull request with number 4 is merged and deployed first, migration 3 would arrive later with an older name. Whether `prisma migrate deploy` accepts an older-named pending migration after a newer one is applied was not proved here, so it is **to confirm** on a copy. The simplest way to avoid the question is to merge in timestamp order, or to put both in one pull request.
- **Two older folders share one timestamp.** `20261102120000_four_weeks_after_a_free_trial` and `20261102120000_twice_a_week`. This is not caused by the new work, and the migration order guard passes with it (`docs/combined-status.md`).
- **Main's migration `20260923200000_reopen_every_check_in_that_ran_out_of_time`.** On our branch and on staging it contains only `SELECT 1;`, by decision 54 (29 September): a migration must never reopen existing check-ins. The old version of the file set every stalled check-in back to active and gave it 30 more days. **Confirm that production already ran main's own version** (the one that did the reopening), so nothing is reopened or run twice. Source: `docs/morning-report.md` (15 October), `docs/staging-compatibility.md` and `docs/deploy.md`.
- **Prisma applies these at start.** The API's start command (in `api/railway.toml`) is `npx prisma migrate resolve --rolled-back 20260627000000_contributor_code_system 2>/dev/null; npx prisma migrate deploy && node dist/main`. If a migration fails, the API does not start.
- **How to check afterwards.** `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10;` must show all four with a finish time and none failed.

---

## 2. Environment variables, full table

How this list was built. It comes from `grep -rhoE "process\.env\.[A-Z0-9_]+"` over `api/src`, `api/prisma` and `client/src` in the combined worktree (52 names), plus every `import.meta.env` name in the client, plus the settings the code reads in other ways (`env.NAME` with an environment passed in, `config.get('NAME')` and `process.env[...]`), plus the example files `api/.env.example` and `client/.env.example`. The setup that a production start enforces comes from `assertProductionConfig` in `api/src/main.ts` and from `api/src/config/configuration.ts`.

**New since staging.** The same search was run over the 7 November copy of staging and over the combined branch. **No setting name was added or removed by the new work.** (Only noise names `MODE` and `TZ` differ, and they are not settings.) The example files `api/.env.example` and `client/.env.example` are also unchanged. This is as of the 7 November copy of staging, so it is **to confirm** against live staging. The column "New since staging" is therefore "No" for every row.

**What a production start refuses to do.** With `NODE_ENV=production`, the API will not start unless all of these are true: `JWT_SECRET` is set and not the old default; `CORS_ORIGINS` is set; `DATABASE_URL` is set; `BILLING_ENABLED` is exactly `true`; `STRIPE_SECRET_KEY` is set; `STRIPE_WEBHOOK_SECRET` is set; `GOOGLE_SERVICE_ACCOUNT_JSON` is set; `EMAIL_SENDS_FOR_REAL` is exactly `true`; and `RESEND_API_KEY` is a real key (a placeholder starting `re_...`, or `re_test`, is refused). Separately, `configuration.ts` throws as soon as it loads in production if `FRONTEND_URL` or `STRIPE_CALLBACK_URL` is missing. Those two are not in the boot check's list, so a document that lists only the boot check misses them. It also refuses to start if a preview or experimental Gemini model is named, because such a model is outside Google's data processing terms (`a-preview-model-has-no-data-terms.ts`), and it refuses to start if `GROUNDWORK_MODEL_STAND_IN` is set in production.

Key for the table. "Secret" means treat it like a password and never write it in a document or chat. "Service" is where it is read: **api** (the Railway service), **client** (a build-time setting for the Vercel build), **cron** (read by the API's scheduled jobs, which run inside the same API process; there is no separate cron service in the repository), or **ci** (GitHub Actions).

### 2A. The API (rows 1 to 50)

| # | Name | What it does | Service | Required? | Default if unset | If missing or wrong |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `NODE_ENV` | Says which kind of environment this is. | api | Required in production: must be exactly `production`. | `development`. | If it is `development` the API listens only on 127.0.0.1, so nobody can reach a hosted API. Any other value or none listens on every address and skips the production checks. If it is unset in production, none of the refusals in this section run. |
| 2 | `PORT` | The port the API listens on. | api | Optional (the host normally sets it). | `3000`. | The host's own routing may fail if it does not match. |
| 3 | `DATABASE_URL` | The PostgreSQL connection address (secret). | api | Required. | None. | Production refuses to start. Migrations cannot run. |
| 4 | `JWT_SECRET` | Signs every sign-in token (secret). | api | Required, in every environment. | None. | The API refuses to start (`the-jwt-secret.ts`). Changing it signs everybody out once. |
| 5 | `JWT_EXPIRES_IN` | How long a sign-in lasts. | api | Optional. | `7d`. | People are signed out after that time. |
| 6 | `CORS_ORIGINS` | Comma-separated list of web addresses allowed to call the API. | api | Required in production (no wildcard allowed). | None. | Production refuses to start. A wrong list makes the web app's calls fail in the browser. |
| 7 | `FRONTEND_URL` | The web app's address. It is used in emails, sign-in links and sign-in redirects. | api | Required in production. | `http://localhost:5173`. | The API throws on load in production. A wrong value puts wrong links into emails. |
| 8 | `PUBLIC_API_URL` | The API's public address without `/api/v1`, for example the production API address. Not a secret. | api | Optional but needed for WhatsApp setup and one-click unsubscribe. | None. | The Connections page cannot show the full WhatsApp callback address, and mail has no one-click unsubscribe, only a link to a page. Set it before release (`docs/deploy.md`, section 3). The 15 October note names `https://api.myground.work` for production. |
| 9 | `BILLING_ENABLED` | Turns the paywall on. | api | Required in production: exactly `true`. | Unset means the paywall is off. | Production refuses to start unless it is `true`. |
| 10 | `STRIPE_SECRET_KEY` | Stripe's secret key (secret). Test or live depends on the key, see section 5. | api | Required in production. | None. | Production refuses to start. |
| 11 | `STRIPE_PUBLISHABLE_KEY` | Stripe's publishable key. | api | Optional as far as the boot check goes. | None. | Read only in configuration; **to confirm** whether any page needs it. |
| 12 | `STRIPE_WEBHOOK_SECRET` | Verifies Stripe's calls to the webhook (secret). | api | Required in production. | None. | Production refuses to start, because webhooks would be unverified. The webhook is `POST /api/v1/billing/webhook` (checked in `billing.controller.ts`), so that is the address to give Stripe. |
| 13 | `STRIPE_CALLBACK_URL` | Where Stripe sends people back to, the web app's billing page. | api | Required in production. | `http://localhost:5173/billing/callback`. | The API throws on load in production. A wrong value sends people to the wrong place after paying. |
| 14 | `EMAIL_SENDS_FOR_REAL` | Lets mail leave the building. | api | Required in production: exactly `true`. Must not be `true` on staging or any copy that holds test data. | Off. | In production the API refuses to start unless it is `true`. Off means mail is only logged (and sent to a local mail catcher, which does not exist in production). |
| 15 | `RESEND_API_KEY` | The Resend key (secret). | api | Required in production and must be real. | Empty. | A placeholder or `re_test` is refused at boot in production. |
| 16 | `RESEND_FROM_EMAIL` | The "from" address of every email. | api | Optional. | `Groundwork <noreply@myground.work>`. | The sending domain must be verified with Resend, or mail will not deliver. |
| 17 | `RESEND_WEBHOOK_SECRET` | Signs Resend's webhook (secret). | api | Needed for delivery tracking and inbound mail. | Empty. | The webhook `POST /api/v1/webhooks/resend` fails closed: no delivery tracking and no inbound mail. |
| 18 | `GOOGLE_SERVICE_ACCOUNT_JSON` | The Gemini (Vertex) service account as one line of JSON (secret). This is how the code reads the model credential. | api | Required in production. | None. | Production refuses to start. At start the code writes it to a temporary file and points `GOOGLE_APPLICATION_CREDENTIALS` at it. If it is unset outside production, the code looks for `credentials/service-account.json` in the working folder. |
| 19 | `GOOGLE_APPLICATION_CREDENTIALS` | Set by the code itself from row 18. Do not set it. | api | No. | Set by the code. | Setting it yourself is overwritten at start. |
| 20 | `GEMINI_PROJECT_ID` | The Google Cloud project for the model. | api | Optional. | A built-in default project (see `configuration.ts`). | A wrong project or an account that cannot use the models makes every conversation and report fail. |
| 21 | `GEMINI_LOCATION` | The Vertex region. | api | Optional. | `us-central1`. | If that region times out from the host, set `global` (`docs/release-questions.md`, question 5). **To confirm** which one production uses. |
| 22 | `GEMINI_MODEL` | The model for reports, synthesis and extraction. | api | Optional. | `gemini-2.5-pro`. | A preview or experimental model name makes the API refuse to start. |
| 23 | `GEMINI_CONVERSATION_MODEL` | The fast model a person talks to. | api | Optional. | `gemini-2.5-flash`. | Same refusal for preview models. |
| 24 | `GEMINI_MAX_TOKENS` | Answer length cap. | api | Optional. | `8192`. | The code floors any lower value to 8192, so a stale low value does no harm. |
| 25 | `GOOGLE_CLIENT_ID` | Google sign-in. | api | Optional. | Empty. | Both 25 and 26 must be set or the "Sign in with Google" and "Sign up with Google" buttons are hidden everywhere. |
| 26 | `GOOGLE_CLIENT_SECRET` | Google sign-in secret (secret). | api | Optional. | Empty. | See row 25. |
| 27 | `GOOGLE_CALLBACK_URL` | Where Google sends people back to. It should be `<PUBLIC_API_URL>/api/v1/auth/google/callback` and must be one of the authorised redirects of the Google client. | api | Optional. | `http://localhost:3000/api/v1/auth/google/callback`. | Google sign-in fails if it does not match. |
| 28 | `WHATSAPP_ACCESS_TOKEN` | Lets Groundwork send from its WhatsApp number (secret). | api | Optional. | None. | WhatsApp is off unless both this and row 29 are set. They can also be saved sealed in the back office (row 35). |
| 29 | `WHATSAPP_PHONE_NUMBER_ID` | Meta's id for Groundwork's number. | api | Optional. | None. | See row 28. |
| 30 | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | A phrase Meta sends back once to prove the address (secret). | api | Needed to connect the webhook. | None. | Meta's subscribe step fails. It must be the same string typed into Meta. |
| 31 | `WHATSAPP_APP_SECRET` | Meta signs every inbound message with this (secret). | api | Needed for inbound WhatsApp. | None. | Inbound WhatsApp is dead by design: verification fails closed. |
| 32 | `WHATSAPP_APPROVED_TEMPLATES` | Comma-separated names of the templates Meta has approved. See section 3. | api | Optional but needed to write first on WhatsApp. | Empty. | Groundwork sends nothing outside the 24-hour window and records each as not sent with the reason (some messages then go by email instead). |
| 33 | `WHATSAPP_DISPLAY_NUMBER` | Groundwork's WhatsApp number as people read it. Display only. | api | Optional. | None. | The Connections page says "Groundwork's WhatsApp number" with no number. |
| 34 | `WHATSAPP_GRAPH_BASE_URL` | Meta's Graph API address. Only a test sets it. | api | No. | Meta's own address. | **Must be unset in production.** If set, WhatsApp messages would go to that address instead of Meta. |
| 35 | `SETTINGS_ENCRYPTION_KEY` | The key that seals secrets typed into the back-office WhatsApp page (secret). 32 bytes in base64 or hex, or any string of at least 32 characters. Make one with `openssl rand -base64 32`. Use a different key on each environment. | api | Needed before Hafsah saves WhatsApp details in the back office. | None. | The API starts, but the page at `/admin/whatsapp` cannot save a secret and says so, and WhatsApp uses the server's own `WHATSAPP_*` settings. A key shorter than 32 characters is refused. **Never change it after secrets are saved**: every saved secret becomes unreadable and must be typed again. |
| 36 | `TRUST_PROXY_HOPS` | How many proxies stand between visitors and the API. | api | Recommended in production. | `1` in production, `0` elsewhere. Values are 0 to 5; anything else is ignored. | If a content network such as Cloudflare also sits in front and this stays at 1, everybody behind it can share one sign-in allowance. In production with it unset, the API logs one warning at start. **To confirm** the real number (release question 10d). |
| 37 | `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` | One-time promotion of an address to platform admin, only if no platform admin exists yet. | api | Optional. | None. | If it is set and no platform admin exists, **anyone who signs up with that address becomes platform admin at the next restart** (`SECURITY-FOR-ABUBAKAR.md`). Check it is not set, or that a platform admin already exists. |
| 38 | `DELIVERY_ALERT_EMAIL` | The address that gets the 7:30 Nairobi daily delivery alert. Not a secret. | api / cron | Optional. | Empty. | With neither this nor the back-office setting "Daily delivery alert" set, the alert is never sent. A saved back-office address wins over this. |
| 39 | `CONTRIBUTOR_CODES` | Comma-separated activation codes. | api | Optional. | Empty. | No code is recognised ("Code not recognised."). |
| 40 | `DOCS_OPEN` | `true` leaves the API reference at `/api/docs` open. | api | No. | Closed. | Leave it unset in production. Unset means the reference opens only with a one-hour key from an organisation's Connect page. |
| 41 | `LOGIN_RATE_LIMIT` | Sign-in attempts allowed per minute. | api | Optional. | `10`. | A very low value locks people out. |
| 42 | `CONTEXT_ENABLED` | The Context feature. | api | No. | On unless the value is exactly `false`. | **Do not set it to `false`.** It switches off the whole context feature (`docs/deploy.md`, section 4). |
| 43 | `CONFIDENCE_ENABLED` | The confidence read in reports. | api | Optional. | Off unless exactly `true`. | **To confirm:** `api/.env.example` shows it as `true`, but the code's default is off, so production's value may differ from what the example suggests. |
| 44 | `OBJECTIVES_ENABLED` | Objectives and baseline per person. | api | Optional. | Off unless exactly `true`. | Off means the old behaviour. |
| 45 | `POST_REPORT_GUIDE_ENABLED` | The "Before you talk to them" guide after a report (one extra Gemini call per person). | api | Optional. | Off unless exactly `true`. | **To confirm:** the example file shows `true` while the code default is off. |
| 46 | `WORKSPACE_WEBHOOK_EXTRA_HOST` | An extra allowed host for Slack or Teams notices. | api | No. | None. | Ignored in production (the code returns nothing when `NODE_ENV` is production). |
| 47 | `GW_LEAN_CONVERSATION` | The lean conversation proposal. **Must be off.** | api | No. | Off. | Never set it on a real database. The code only honours `1` when `NODE_ENV` is `development` and the database name starts `gw_sweep_`, so it is inert on a real database, but it must still not be set (decisions doc, cycle 12). |
| 48 | `GROUNDWORK_MODEL_STAND_IN` | A fixed-question stand-in for the model, for local browser tests only. | api | No. | Off. | If set in production the API refuses to start. Only the value `fixed-questions` is accepted. |
| 49 | `GW_WEBHOOK_ANSWERS_FIRST` | Test suites only: makes the WhatsApp webhook answer before the work is done. | api | No. | Unset. | Only changes behaviour inside the test suites. |
| 50 | `MAIL_CATCHER_PORT` | Port of a local mail catcher for a test bed. | api | No. | `1025`. | Only used when mail is not sent for real. **The mail catcher must not exist in production**, and in production `EMAIL_SENDS_FOR_REAL=true` already stops this path. |

### 2B. The client (rows 51 to 56)

These are read at build time by Vite. They go into the Vercel project's build settings, not into the API's settings.

| # | Name | What it does | Service | Required? | Default if unset | If missing or wrong |
| --- | --- | --- | --- | --- | --- | --- |
| 51 | `VITE_API_URL` | The API's address for the browser. | client | Required for any build that is not served with a same-origin proxy. | Empty, meaning the page calls `/api/v1` on its own address (the Vite dev proxy). | A hosted build with it unset calls its own address and every API call fails. The value for staging and production is **to confirm** (Vercel settings are not in the repository). |
| 52 | `VITE_APP_URL` | Where invitation links point. | client | Optional. | The page's own address. | Wrong value puts wrong addresses into copied links. |
| 53 | `VITE_MARKETING_URL` | Where the logo sends people (the marketing site). | client | Optional. | Decided in `client/src/lib/marketing.ts`; it is not carried across environments (a staging build does not send people to production). | The logo goes to the wrong place. Not in `client/.env.example`. |
| 54 | `VITE_PUBLIC_POSTHOG_KEY` | PostHog analytics key. | client | Optional. | Empty. | Unset means analytics is not started. Session recording and element autocapture are off in the code either way. |
| 55 | `VITE_PUBLIC_POSTHOG_HOST` | PostHog's address. | client | Optional. | Empty. | Unused when row 54 is unset. |
| 56 | `VITE_PROXY_TARGET` | Dev-only: where the Vite dev server proxies the API. | client | No. | `http://127.0.0.1:3000`. | Development only. |

### 2C. Names that appear in code but must not be set on a hosted environment

These nine are listed so that nobody is surprised by them. They are test or print switches, or names in the example file that the code does not read.

| # | Name | What it is |
| --- | --- | --- |
| 57 | `JEST_WORKER_ID` | Set by the test runner. Never set it. |
| 58 | `PRINT_TABLE` | A print switch for a local run. Never set it. |
| 59 | `PRINT_THE_ALERT` | A print switch for the delivery alert in tests. Never set it. |
| 60 | `PRINT_THE_APPROVER_TABLE` | A print switch for tests. Never set it. |
| 61 | `SHOW_YODA` | A print switch for the wording guard in tests. Never set it. |
| 62 | `WRITE_FIXTURE` | Writes a test fixture. Never set it. |
| 63 | `ANTHROPIC_API_KEY` | In `api/.env.example` only. The search found no code that reads it, so it has no effect. **To confirm** before removing it from any host. |
| 64 | `ANTHROPIC_MODEL` | Same as row 63. |
| 65 | `ANTHROPIC_MAX_TOKENS` | Same as row 63. |

That is **65 names in all**: 56 that the services read (50 API, 6 client) and 9 test-only or unused.

### 2D. Hosting and CI settings (not environment variables of the services)

| What | Where | Detail |
| --- | --- | --- |
| API build and start | `api/railway.toml` | Builder NIXPACKS. Build command `npm run build && npx prisma generate`. Start command `npx prisma migrate resolve --rolled-back 20260627000000_contributor_code_system 2>/dev/null; npx prisma migrate deploy && node dist/main`. Health check path `/health`. Restart on failure, at most 3 times. |
| Health addresses | `api/src/main.ts` | `/health`, `/health/ai` and `/health/mail` answer at the root, outside `/api/v1`. |
| Client build and deploy | `client/vercel.json` | Vite. Builds `dist`. Every address is rewritten to `index.html`. Git deployments are enabled only for `main` and `staging`. |
| Marketing site | `marketing/vercel.json` | Astro. |
| Node and npm | `api/package.json`, `client/package.json` | `engines`: Node `24.x`, npm `10.x`. The GitHub workflows in `.github/workflows/` still use Node 20 in every job (see section 6). |
| GitHub Actions secrets read | `.github/workflows/` | `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (staging and preview deploys), and `GEMINI_PROJECT_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` (the paused persona suites). Names only. |
| Webhook addresses | the controllers | Stripe: `POST /api/v1/billing/webhook`. Resend: `POST /api/v1/webhooks/resend`. WhatsApp, Groundwork's own number: `<PUBLIC_API_URL>/api/v1/webhooks/whatsapp`. WhatsApp, an organisation's own number: `<PUBLIC_API_URL>/api/v1/webhooks/whatsapp/<organisation id>`. |
| One job copy | the API | Every daily, weekly and hourly job claims its time slot in one database row (`job.<name>.ran_for`) before it runs, so it runs once even with two copies of the API (`api/src/modules/prisma/once-across-copies.ts`). The new weekly memory rebuild (`memory.cron.ts`) uses the same claim. The jobs that run every 15 or 30 minutes, and every minute, still rely on a database advisory lock only (see `docs/deploy.md`, section 7). With one instance that is fine. With more than one, tell Hafsah (release question 8). |

---

## 3. WhatsApp

### 3A. What was and was not changed in the templates

**No WhatsApp template was added, changed or renamed by the new work.** This was checked by comparing `wip/combined` with the 7 November copy of staging. `docs/whatsapp-templates.md` has no difference. In `api/src/modules/whatsapp/a-message-outside-the-window.ts` the only difference is seven added lines that name a new kind of message, `missed-check-ins`, and put it in the list of messages Groundwork starts. It has no template, so nothing needs approving. This follows Hafsah's standing rule of 14 October: never change, rename or add to approved templates; anything needing different words goes in normal messages inside 24 hours, or by email.

### 3B. The templates the code can use (24 names)

The code holds 24 template names (`THE_NAMES_WE_MAY_USE`). The words of each are in `docs/whatsapp-templates.md`; submit them exactly as written there (category Utility, language English). The list `docs/whatsapp-settings.md` still says "16 names", which is older than the code, so use the table below.

| Name | What it is for |
| --- | --- |
| `checkin_open` | A check-in has opened. Says "about five minutes". Hafsah's eight (decision 83). |
| `checkin_due_tomorrow` | A check-in is due tomorrow. |
| `checkin_opens_soon` | A check-in opens in an hour. |
| `checkin_closes_soon` | A check-in closes in an hour. Says "Five minutes now". Nothing in Groundwork closes at a set hour today, so it is not sent yet. |
| `checkin_overdue` | A check-in is overdue and still open. |
| `checkin_team_almost_in` | At least half the team has checked in, to someone who has not. |
| `checkin_your_view_matters` | Fewer than half have checked in, or a check-in about one person. Says "about five minutes". |
| `lead_daily_summary` | The lead's one message of the day. The documents disagree: `docs/whatsapp-settings.md` says Meta will refuse it because it ends with a blank, while `docs/whatsapp-templates.md` says it was changed on 7 October to end in words. Which body was submitted is **to confirm**. |
| `groundwork_report_ready` | A person's own report is ready. |
| `groundwork_request_waiting` | A leave, hours or spending request is waiting for an approver. |
| `groundwork_requests_waiting` | Everything waiting for an approver, said once. |
| `groundwork_request_decided` | A person is told their request was approved or declined. |
| `groundwork_request_decided_with_reason` | The same, with the reason the decider gave. Until approved it goes by email. |
| `groundwork_review_started` | A review waits for the person. |
| `groundwork_review_decided` | The person is told their review is decided. |
| `anchor_weekly_insight` | The lead's weekly insight on an anchor check-in. |
| `anchor_checkin_follow_up` | The anchor's nudge, with the person's own promise. |
| `groundwork_first_contact` | The first message ever sent to a number. It names the organisation and ends "Not you? Reply STOP." Until it is approved, no first message goes to any number. |
| `groundwork_checkin_open_v2` | Replaces `checkin_open`, saying "about ten minutes" (19 October). |
| `groundwork_checkin_thanks` | A thank-you after an answer (19 October). |
| `groundwork_your_report_ready` | A person's own report is ready (19 October). |
| `groundwork_promise_due` | A promise is due (19 October). |
| `groundwork_checkin_closes_soon_v2` | Replaces `checkin_closes_soon`, saying "about ten minutes" (21 October). |
| `groundwork_checkin_your_view_matters_v2` | Replaces `checkin_your_view_matters`, saying "about ten minutes" (4 November). |

Not to be submitted. The three appeal templates `groundwork_review_appeal_waiting`, `groundwork_review_appeal_needs_admin` and `groundwork_review_appeal_decided` were withdrawn by decision 124, item 4: an appeal is told by email and in the app only. `groundwork_request_question`, `groundwork_leave_told_to_hr`, `groundwork_first_question` and `groundwork_since_you_last_wrote` are written in the document as proposals and are not in the code, so do not list them.

### 3C. What `WHATSAPP_APPROVED_TEMPLATES` must contain

It must hold exactly the names, from the 24 above, that show as **Active** in Meta's WhatsApp Manager, separated by commas, and nothing else. Groundwork uses a name only when it is in this list. The list is read at start, so the API must be restarted after a change.

Which names are approved today is **to confirm** in WhatsApp Manager. The documents disagree: `docs/release-status.md` (29 October) says two were already submitted (`checkin_open` and `checkin_your_view_matters`); `docs/release-questions.md` (question 10a) says `checkin_open`, `checkin_closes_soon` and `checkin_your_view_matters` are approved; `docs/issues-next.md` row 14 says those three are approved and the "about ten minutes" ones are waiting. The 15 October note says the list on Railway was still to be set. Until the setting is right, nothing goes outside the 24-hour window.

The six "ten minutes" names (`groundwork_checkin_open_v2`, `groundwork_checkin_thanks`, `groundwork_your_report_ready`, `groundwork_promise_due`, `groundwork_checkin_closes_soon_v2`, `groundwork_checkin_your_view_matters_v2`) still need submitting if they have not been. Once one is approved and listed, the older name it replaces stops being used. Leave the older name approved in Meta, but unused.

### 3D. The 24-hour window

- **Inside 24 hours of the person's last message to Groundwork,** Groundwork sends the same words as an ordinary message. No template is used.
- **Outside the window,** a message that Groundwork starts goes only as an approved, listed template. If its name is not in the list, it is recorded as not sent, with the reason. Some messages then go by email instead.
- **Rules that hold for every message Groundwork starts:** at most one routine message a day (two on a day a check-in opens); nothing from 8 in the evening to 7 in the morning in the organisation's own time zone (a held message is sent by a job every 15 minutes); "Not now" stops anything more that day; "STOP" stops everything until the person writes START.
- **The new missed-check-ins notice.** When a person who uses WhatsApp has missed two check-ins in a row, and they last wrote to Groundwork less than 24 hours ago, and no opening went to them today, the notice goes now, as a normal message with the same words as Today. It goes once. It is a kind of message (`missed-check-ins`), not a template, so nothing needs approving. Outside the 24 hours, nothing is sent: it waits for the first reply after the person next writes, as before. Source: `docs/roadmap-status.md` and `decisions-taken-for-hafsah.md` row B2-7.
- **The pause line.** When an organisation's check-ins are paused, the line "Check-ins are paused until your organisation chooses a plan, so no check-in is open here or in the app." goes as a free reply on every message the person writes (row 5). Every other held sentence is still said once in 24 hours.
- **A greeting or thanks as a first message.** The model writes a few words back, said before the session line and the first question. It is a normal message (row 12). No template is touched.

### 3E. Templates that would need Meta re-approval but have deliberately not been changed

- **F34.** The thank-you template (`groundwork_checkin_thanks`) says "You will hear here when the team's report is ready to read." The copy audit found that false where people are unnamed to each other or where the lead holds the report. The better words are "Thank you, {{1}}. Your answer for {{2}} is in." Not changed: it needs re-approval by Meta.
- **F35.** `checkin_open`, `checkin_closes_soon` and `checkin_your_view_matters` say "five minutes" while everything else says "about ten minutes". Not changed: they need re-approval, or the six "ten minutes" names above must be approved and listed so they are used instead.

Sources: `docs/copy-audit-15-nov.md`, `docs/issues-next.md` (N47), `docs/whatsapp-templates.md`.

### 3F. WhatsApp provider keys and webhook address

- The keys are rows 28 to 35 of the table in section 2. How to find each one in Meta's tools is in `docs/whatsapp-settings.md`. The access token must be a permanent system-user token, not the 24-hour temporary one.
- **Webhook address (Groundwork's own number):** `<PUBLIC_API_URL>/api/v1/webhooks/whatsapp`. In Meta: the app, WhatsApp, Configuration, Webhook, Edit. Type the same verify token as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, and subscribe to **messages**. The API must already be running with its settings before Meta checks the address.
- **Staging's address** (from the 15 October note): `https://groundwork-staging-16ca.up.railway.app/api/v1/webhooks/whatsapp`. **Warning from the same note:** one Meta app sends one number's messages to one address. If Meta is pointed at staging, production's WhatsApp stops. Staging needs its own test number.
- Hafsah's staff can instead save the number, its ids and the three secrets at `/admin/whatsapp` (needs `SETTINGS_ENCRYPTION_KEY`); those saved values are used first, field by field.
- Two switches decide whether a client gets WhatsApp: the platform's `whatsapp_enabled` setting, and each organisation's `whatsapp_add_on_on`. Both must be on.

---

## 4. Stored prompt rows to refresh on real databases

**The rule.** A prompt stored in the database (table `prompt_versions`, shown at Admin, System, Prompts, served by `/prompts`) overrides the file. A start never replaces a version somebody activated by hand. So after the release, on each real database, three keys must be checked and, where a stored version is active, made to run the file's new words. Nothing here changes by itself. Source: the "Release step" section of `docs/decisions-taken-for-hafsah.md` (cycle 12) and `docs/deploy.md`, section 6.

| Key | Why it must be refreshed | Where the new words are | Does a start refresh it? |
| --- | --- | --- | --- |
| `ask.understand-the-message` | Ask now reads two more kinds of message: "thanks" and "finished" (and "agreement"). Without the new words, a "Thank you" after finishing is not read as thanks (row 4). | `UNDERSTAND` prompt, read by `api/src/modules/assistant/ask-understands-with-the-model.ts` | No. It is not in the start-up list (`SEED_PROMPTS`). It runs from the file only where no stored row exists. |
| `assessment` | The assessment prompt changed this cycle. | `THE_ASSESSMENT_PROMPT` in `api/src/modules/conversation/the-assessment.ts` | No. Same as above. |
| `system` | The engine rules now tell the model never to say what colleagues said (row 6). | `ENGINE_RULES` in `api/src/modules/conversation/prompt-library.ts` | Yes, a start adds the file's words as a version and activates it, **unless** a version was activated by hand, in which case the new words wait beside it as inactive. |

`report_synthesis` is **unchanged** this cycle. The report writer's new note about periods (row 14) is added in code after whatever version is stored, so there is nothing to refresh for it.

The lean conversation is not a stored row. It runs from the file only where `GW_LEAN_CONVERSATION=1` is set, and it must not be set on real databases. Nothing to refresh; check the setting is off (row 47). A new prompt key `memory.pick-the-books` is read through the prompt store by the librarian, but it is not in the start-up list, so the file's words run and there is nothing to refresh (**to confirm**: no stored row exists for it).

**How, exactly.** Only a platform admin can do this.

1. List what is stored: in the database, `SELECT key, version, is_active, activated_at, activated_by, summary FROM prompt_versions WHERE key IN ('ask.understand-the-message','assessment','system') ORDER BY key, version;`. If a key has no row at all, nothing needs doing for it: the file runs.
2. Where a stored version is active, open Admin, System, Prompts (the address `/prompts` goes to `/admin/prompts`). Create a new version of the key with the file's text (the controller offers "create a version", inactive until activated, and "activate"; no "deactivate" route exists, so **to confirm** whether the screen offers one), then activate it. Activating by hand records your user id, so a later start will never replace it.
3. **Prove it ran.** Each report records `reports.prompt_version_id`, and each assessment records the prompt it ran from (it reads `file:assessment@<hash>` when it ran from the file). After the next report and assessment, check both name the version you activated. The query for reports is in `docs/deploy.md`, section 6.

---

## 5. Switches and settings that need a decision at production

Do not change any of these on the same day as the migrations. None of the decisions below is Abubakar's alone: they are Hafsah's, unless stated.

| Switch | Where it lives | State to expect and what to do |
| --- | --- | --- |
| **Free trial** | Settings row `pricing.freeTrial` (Admin, System, Pricing). | Hafsah's decision (`everything-on-the-list.md`, list B item 12; `decisions-taken-for-hafsah.md` row 3). The documents do not say it is on. Row 3 asks Hafsah to check that Admin, System, Pricing has it switched on for the release; the 4 October release steps (`docs/deploy.md`, step 13a) said to switch it on only after a read-only check, and the 15 October note says the new pricing and one-month trial show only once it is on. Never write the row as a bare `{"on": true}`: it must carry `onSince` (use the admin route `PATCH /api/v1/admin/pricing/free-trial` or the statements in `docs/deploy.md`, "Switching billing on at release"). It also starts the WhatsApp add-on rules, the four-week grace and pause (`pricing.trialGrace`, which does nothing while the trial is off), and the free-month emails. Free-month reminder and "it has ended" emails are **not built**. Do not switch it without Hafsah's word. |
| **Plan and billing's new parts** | `release.planAndBillingNewParts` | Off until the trial is switched on, together with it. |
| **Billing in test or live** | Stripe keys (rows 10 to 13) and `BILLING_ENABLED` | Production will not start without a Stripe key and webhook secret, and `BILLING_ENABLED=true`. The documents say Stripe stays in test mode until Hafsah says otherwise (`docs/deploy.md`, "Switching billing on at release"), and that it was proved only against a mock because no Stripe test key was on Hafsah's computer. Whether the production keys are test or live keys is **to confirm** with Hafsah; the add-on's Stripe prices are created in test mode only until she says. |
| **Learning flags** | Code constants, not settings: `PROPOSE_PROMPT_CHANGES` (in `api/src/modules/learning/a-prompt-proposal.ts`) and `APPLY_LEARNED_WEIGHTS` (in `api/src/modules/learning/a-suggested-weight.ts`) | **Both are `false` in the combined code** (checked). They cannot be changed by a setting or an environment variable. Changing them is a code change that needs Hafsah (row M10: only after the 24 scenarios run with the weights and the scorer says nothing dropped). Leave them. |
| **The lean conversation** | `GW_LEAN_CONVERSATION` | Must be off (row 47). |
| **Context** | `CONTEXT_ENABLED` | Leave unset. Never `false`. |
| **WhatsApp, platform switch** | `whatsapp_enabled` | Off unless somebody switched it on. Switch on only after Meta approves templates and a test message arrives. |
| **WhatsApp, each organisation** | `organizations.whatsapp_add_on_on` | Off for every organisation unless an admin turned it on. |
| **Per-organisation release switches** | Admin, Orgs (and `api/scripts/*.ts` with `--yes`) | `release_1_sales_board_on`, `release_1b_tabs_on`, `release_2_collections_on`, `release_3_invoices_on`, `invoices_after_a_sale_on`, `release_4_teams_on`, `release_5_projects_on`, `release_6_direction_on`, `release_7_people_on`, `release_8_situations_on`, `release_9_policy_on`, `direct_morning_on`, `person_judgements_on`. A release 3 to 9 switch reaches nobody until it is turned on. The order for the two named clients is in `docs/release-status.md` (28 October, "Switches, for when it is ready"). `direct_morning_on` and `person_judgements_on` are changed with `api/scripts/the-direct-morning.ts <id> on --yes` and `api/scripts/the-person-judgements.ts <id> off --yes`. |
| **Pause and trial grace** | `pricing.trialGrace` | Does nothing while `pricing.freeTrial` is off. It carries the four weeks and the emails; its 4-week clock starts at the latest of the free month's end and the moment the trial is switched on. Before switching the trial on, run the read-only query in `docs/deploy.md` ("Four weeks after a free trial") and send Hafsah the list. |
| **Daily delivery alert** | `delivery_alert_email` in the back office, or `DELIVERY_ALERT_EMAIL` | Off until an address is set. Hafsah's list. |
| **Daily usage summary** | `daily_usage_summary` | On by default at 8 in the morning Lagos time, to the back-office roster. |
| **Coaching** | `coaching_live` | A missing row means coaching is on. Only a row set to `false` turns it off. |
| **Release (hidden) settings** | `release.boardKindsOffered`, `release.contextInAskGroundwork`, `release.oldContextChat`, `release.anchorScenario`, `release.whatsappHalfwayMessages`, `release.requestOfferInTheCheckIn` | Read in one file (`what-is-hidden-at-release.ts`); a missing row reads as the default listed in `docs/deploy.md`, "Hidden at release". |

---

## 6. Infrastructure

- **Railway (the API).** Settings are in `api/railway.toml` (section 2D). A migration that fails stops the API starting. The staging API on Railway has not always redeployed by itself after a merge (15 October note); on 17 October it had not redeployed since 14 October (`docs/release-plan.md`, Part 5). Whether that is still true is **to confirm**. **Staging's API may need to be redeployed by hand after each merge.**
- **Node 24.** Both `package.json` files say Node `24.x` and npm `10.x`. The host must run Node 24 (the 15 October note lists it as a setting to check). The GitHub workflows use Node 20 in every job, so CI runs on a different Node from the one the packages ask for. This difference is **to confirm** as acceptable.
- **GitHub Actions budget.** On 17 October the Actions budget was used up, so "Staging Deploy (Vercel)" and every check failed, and staging's screens were stale (`docs/release-plan.md`, Part 5; repeated in `docs/release-status.md`). Later notes show checks running on #417, so it may be fixed; **to confirm**. Three persona workflows (`overnight`, `persona-gate`, `persona-tests`) are paused on purpose since 7 September because their artifacts filled the repository's storage; they can still be run by hand.
- **Staging API redeploy and staging WhatsApp.** Staging's WhatsApp needs `SETTINGS_ENCRYPTION_KEY`, `WHATSAPP_APPROVED_TEMPLATES`, `PUBLIC_API_URL` and automatic deploys (`release-plan.md`, Part 5). Staging must not send real mail, and a staging database must not hold live keys.
- **Hafsah's Railway invite.** Listed as an open blocker on 17 October (`release-plan.md`, Part 5). Whether she now has access is **to confirm**.
- **Main's migration `20260923200000_reopen_every_check_in_that_ran_out_of_time`.** See section 1C: it is `SELECT 1` on staging; confirm production ran main's version.
- **Cloudflare.** `docs/edge-protection-cloudflare.md` says that on 10 September 2026 it was not done: DNS is at GoDaddy and the app points straight at Vercel. It is a one-day job. Whether it has since been done is **to confirm**.
- **Mail catcher.** There is none in production. In production `EMAIL_SENDS_FOR_REAL=true` and a real `RESEND_API_KEY` are required to start, and the catcher path is reached only when mail is not sent for real.
- **One run of the scheduled jobs.** Daily, weekly and hourly jobs claim their slot in a database row, so two copies of the API run each once. The 15-minute, 30-minute and every-minute jobs rely on an advisory lock; with pooled connections, a lock can be released on a different connection. If the API runs on more than one copy, tell Hafsah (release question 8). If the instance sleeps when idle, jobs are missed while it sleeps.
- **Resource questions still open** (`release-questions.md`, 9): the API's memory, any request timeout, the database connection limit and the Gemini quota. If memory is small, `READERS_WARMED_TOGETHER` in `api/src/modules/reports/reports.service.ts` can be lowered from four to two.

---

## 7. Open pull requests and what each needs

Statuses come from the documents named. Where git on this computer says something different, it is stated, and the answer is **to confirm**.

| PR | What it is | Status in the documents | What it needs from Abubakar |
| --- | --- | --- | --- |
| **#352** | `release-production-1015` into `main`: the production release of 15 October, 3,441 files, 86 new migrations at the time. | `docs/everything-on-the-list.md` (19 November): "Not merged." `docs/morning-report.md` (15 October): NOT merged; Abubakar merges after the backup. **Git says it was merged into `main`.** | Confirm whether production was deployed from `main` after it. If it was not, nothing from 15 October has reached production. The 15 October list: the backup, the Railway settings (section 2), then merge, then the four one-off scripts, each with its confirmation (section 11). |
| **#362** | `hotfix-whatsapp-opening-prod`: the WhatsApp opening goes to saved numbers again, plus a guard so main's WhatsApp tests pass. | "Waiting for production after a backup" (19 November). Git: inside `main`. | Confirm it is deployed. Note: it does not fix the Drop Access silence (`release-status.md`, 21 October). |
| **#364** | `hotfix-coaching-prod`: the Pulse check coaching fix. | Same as #362. Git: inside `main`. | Same. 23 WhatsApp spec files fail on that branch with or without the work, because main has a change (#360) without #362's guard. |
| **#410** | The setup-words fix: old setup words copied into a lead's first check-in could be read by the team. | Merged into staging on 4 November. Its cleanup must run on production (step 3 of 1A) and is **urgent**. | Run the cleanup with "yes" if it has not been run. |
| **#414** | `staging` into `main` (4 November). | `release-status.md` (7 November): staging was merged into main as #414. `abubakar.md` (5 November): still to click Merge. Git: merged on 4 November at 22:25. | Confirm production deployed. |
| **#417** | Fixes staging's failing tests at their cause (16 client suites and 33 API suites). It includes the real fix for team members losing the team's counts since #410, a double save on People and setup, and six weekend-dependent WhatsApp specs. | `release-status.md` (7 November): "Not merged; Abubakar merges." The `main` merge #418 (7 November) contains the commits "Get the client guard suite green again" and later; whether #417 itself is what merged is **to confirm**. | Confirm it is in staging and main. |
| **#419** | `hotfix-team-skip`: a name with no email never stops the save, and the other kinds of check-in are reachable inside setup; the kind picked in setup is named in quotes. Client only, 8 files. | `everything-on-the-list.md`: "PR #419 open, not merged by us; waiting." Git: branch `origin/hotfix-team-skip` is two commits on top of staging of 7 November (`73f0b669c`, `0d5f1da1f`). | Merge it into staging when ready; it is not part of our combined branch. |

Also in `docs/everything-on-the-list.md` (list B item 17): whether `wip/sync-ticks-to-staging` goes to staging is a Hafsah decision.

---

## 8. What changed for people, and what to check after deploy

### 8A. What changed for people (from `decisions-taken-for-hafsah.md`, `docs/combined-status.md`, `docs/chat-is-king-status.md`, `docs/memory-system-steps-1-3-for-hafsah.md`, `docs/roadmap-status.md`)

- **Pricing page.** It no longer shows a free plan until the server has said what is free, and it names the free month where one is on (rows 3 and 11).
- **Ask** answers "Thank you" with "You're welcome." and no menu (row 4), and offers role-fitted starters and a plain answer to "What can you do?" (chat is king, row 15).
- **WhatsApp.** The pause line goes on every message in a pause (row 5). A first greeting or thanks gets a few words back (row 12). The missed-check-ins notice can now go inside the 24 hours (B2-7).
- **Reports.** A person is never told what colleagues said (row 6). The writer attributes a view only to people who joined or contributed (row 8). A weekly aim is not set against a monthly figure as a disagreement (row 14). A number a person corrects is the number from then on (row 15).
- **Counts.** Rounds in a pause are left out of the Reports list's count, Over time, My work and the people count (row 7). One person's "finished" count comes from one owner (R-1). A person who left is still "A colleague" and never named (R-3). Over time shows the round's lead-in after the count (row 13). Nameless people are counted in Today (R-7).
- **People and setup.** People names invited people who have no account and says when there are more people than the plan covers; each person on the save list shows their number (R-5). The tab is "References and resources" (B2-5).
- **Sign-in.** A first visit on a new address no longer says "You were signed out because you had been away" (R-4).
- **Chat is king.** Leads can start a check-in from one sentence and see their roster named (row 16). Admins can set up and switch suites by chat, be guided through connecting a platform (the address is never typed in chat), read the role map, and get quarterly or annual reports from allowed sources (chat-is-king rows 12 and 13).
- **Memory system, steps 1 to 3.** Memory files are stored in `memory_files` and read through a librarian by the assistant. Routes `GET /memory/catalogue`, `GET /memory/book?path=…` and `GET /memory/pull?question=…` are new. A person's wellbeing and what was said against the person who runs a check-in are in no file for anybody.
- **Learning, stage 1.** Learning stays inside each organisation and changes no behaviour. Weights and prompt self-learning stay off (M10).
- **Design.** One new stylesheet, `client/src/styles/design-rules.css`, loaded last (DS-16). A single main button on People (DS-20). The focus ring is softer but visible (DS-21).
- **Not changed.** The typed finish on the web still needs the button (row 2). "Check-in 8 of 12" against "9 check-ins" still counts differently (row 10).

### 8B. A short smoke checklist a person can follow

Run it on staging first, with a test organisation made for the purpose (never a customer's), and with at least three people on one check-in.

**Before anyone reads anything (database and API).**
1. `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10;` shows the four new migrations finished.
2. `/health` answers `ok`. The API log has no "Refusing to start" line.
3. `SELECT to_regclass('ground_objective_said'), to_regclass('memory_files'), to_regclass('organization_pauses');` returns three names, not empty values.
4. `SELECT key, value FROM platform_settings WHERE key IN ('pricing.freeTrial','whatsapp_enabled','release.planAndBillingNewParts');` shows what Hafsah agreed (section 5).
5. The prompt versions in section 4 are the ones you meant.

**On the web (desktop and phone width).**
1. Open the sign-in page. Choose "Email me a sign-in link". The mail arrives once, from the real sender, and the link opens Today.
2. Open the pricing page. It shows plans and prices and no free line until it has loaded; once it has, it matches the app.
3. Open Today as the lead, then as a team member. The team's counts show for the member. The same check-in is not listed twice.
4. Open the check-in, answer, and press finish. The end card still asks for "That's right, finish". Close it.
5. Open People and setup. Each person shows a phone number; the save list shows numbers too. Save changes once and check it does not save twice.
6. Open Ask. Type "Thank you." The answer is "You're welcome." with no menu. Type "What can you do?" and read the list.
7. Open the board and the reports list. The counts agree between the board, the list and My work.
8. Open `GET /memory/catalogue` signed in as a lead. It lists books. As a member it lists fewer, and none of another person's file.

**On WhatsApp (needs an approved number and the platform switch on).**
1. Write "Hi" as a first message from a test number. A few words come back before the first question.
2. Write twice more in a paused organisation. The pause line is the reply each time.
3. For a person who has missed two check-ins and wrote in the last 24 hours, check the missed-check-ins notice arrives once as a normal message and no template is used.
4. For a person who last wrote more than 24 hours ago, check the opening goes only if its template name is in `WHATSAPP_APPROVED_TEMPLATES`, and otherwise is recorded as not sent.
5. Reply STOP, then START, and check both.

**By email.**
1. Check the opening email arrives once per person per opening, with working links, and only one channel per opening.
2. Check no email goes from staging to a real person (staging must have `EMAIL_SENDS_FOR_REAL` off).
3. Check the lead's morning summary arrives, and that the daily delivery alert (if an address is set) comes only on a day something did not go out.

---

## 9. Scratch databases and housekeeping

- **Scratch databases on Hafsah's computer** that the safety guard stops us dropping, so they must be dropped by hand (`everything-on-the-list.md`, list B item 25): `gw_sweep_zzclock`, `gw_sweep_e2e6_proof`, `gw_sweep_e2e7_proof`, `gw_sweep_a`, about 18 databases whose names start `gw_speed`, and `gw_loop_round33` to `gw_loop_round36`. Other local databases named in the documents: `gw_release_check` (`release-status.md`, 21 October), `gw_pw9_1786222102` and `gw_trial_grace_28` (`docs/deploy.md`). None is on staging or production.
- **The `releases/` folder** made by `release-production.sh` is ignored by git. It holds `production.dump`, which is a full copy of production. Keep it off shared drives and never send it; send Hafsah the folder without `production.dump`.
- **Shared node_modules.** In the combined worktree, `api/node_modules` and `client/node_modules` are links to `groundwork-integration`. The generated Prisma client there now matches the combined schema (two extra tables). Rerun `prisma generate` if you use the integration worktree for anything else.
- **Remove the example values.** `api/.env.example` still lists `ANTHROPIC_*` names the code does not read (section 2C).
- **Hidden files.** `docs/staging-test.html`, `quality-check.html`, `journeys.html`, `journey-preview/` and the zip `docs/groundwork-next-plan-files_1.zip` are untracked on Hafsah's working branch and must never go into a pull request.

---

## 10. Known failing specs that are not ours

These fail on the base commit too, or fail for reasons older than the new work, so they should not be blamed on it (`everything-on-the-list.md` list A, `decisions-taken-for-hafsah.md`, `docs/roadmap-status.md`, `docs/memory-learning-status.md`).

- `the-partner-is-told-a-fee-note-fell-due`
- `every-door-that-adds-a-person-asks-the-same-things`
- `one-set-a-password-email-for-two-invitations`
- `item-18`
- `a-work-plan-on-the-board` (session against check-in wording)
- The four David specs (`your-team-person-by-person…`, `the-direct-morning-as-grace…`, `the-morning-says-only…`, `the-weekly-letter-reads-the-record-as-grace…`): they pin an old reading; waiting on Hafsah's decision (row R-9).
- `a-number-with-a-name-on-it`
- `what-round-15-found-in-the-sales-numbers`: the only known failing spec that may be a real loss of a line (row R-10).
- `grounds.service`
- `what-it-is-the-type`
- Client: `every-colour-has-to-exist`, `the-kits-look-holds`, `a-guide-you-are-told-to-send-can-be-sent`, and six failures in `src/pages/grounds` and `src/pages/today` (row DS-22).
- Billing: `billing/four-weeks-after-a-free-trial-then-a-pause.spec.ts` ("paused: a check-in opening on WhatsApp is held") fails on the untouched tip. `billing/extra-seats-and-whatsapp-per-person.spec.ts` failed once under heavy load and was not re-run on an untouched tip.
- `a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts` fails on 30 older specs.
- The results section of `docs/combined-status.md` is empty ("See the results section below" has nothing below it). The result of running the specs on the combined branch is therefore **to confirm**. The document records that `tsc --noEmit` is clean for the API and the client, `prisma generate` ran, and the schema and migration guards pass.

---

## 11. Anything else in the documents addressed to, or waiting on, Abubakar

| Source file | What it asks of Abubakar |
| --- | --- |
| `SECURITY-FOR-ABUBAKAR.md` (checked 8 September) | **(1)** `api/.env.bak` was committed on 31 July, with the API's signing secret and a database address, in a public repository, reachable from many branches. The note says the signing secret on the host was identical to the one in the file. **Rotate `JWT_SECRET`** (it signs everybody out once), and confirm the deployed database address is not the exposed one. Deleting the file does not fix it. Whether this has been done is **to confirm**. **(2)** Check that `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` is not set, or that a platform admin already exists. **(3)** A sweep before launch: secrets in git history, privilege-granting settings, endpoints that trust a token's claims, and what exists before an email is verified. **(4)** A join link plus any address signed in as that person: marked fixed on 7 September. |
| `docs/release-questions.md`, Part 1 | Sixteen questions for the person who deploys: 1 database state against the migrations, 2 the backup, 3 how the API is released and which branch its host follows, 4 `NODE_ENV`, 5 Gemini region and permissions, 6 Resend and whether staging sends for real, 7 Stripe and whether the free trial goes on, 8 scheduled jobs and one copy, 9 memory and timeouts, 10 which WhatsApp templates are approved, 10a new "ten minutes" templates, 10a-2 quiet-hours table and job (`scheduled_whatsapp_messages`, `held-for-the-night.cron.ts`, lock 920015), time zone of each organisation, 10b `PUBLIC_API_URL` and `WHATSAPP_DISPLAY_NUMBER`, 10c `SETTINGS_ENCRYPTION_KEY`, 10d proxy hops, 11 whether anyone changed a prompt in production, 12 to 12d the four one-off scripts, 13 which history goes first, 14 scenario packs, 15 running the two existing-clients checks on a copy of the live data, 16 which release switches. The questions were written on 4 to 19 October; many may be answered by the #352 release. **To confirm** which are still open. |
| `docs/deploy.md` | The release-night list, migration table, settings table, switch table, one-off scripts and the rule on rollback (restore the backup and the old code together). Dated 1 to 5 October and updated to 2 November. The scripts to run once after migrations, each with a dry run first and the host name typed back: `api/journey/stamp-said-word-for-word.ts`, `bring-the-checkability-read-up-to-date.ts`, `give-each-check-in-its-kind-of-work.ts` (before the next one), `bring-a-check-in-up-to-date.ts`. Never run the other scripts in `api/journey/`, `api/setup-runs.ts`, `api/audit-seed.ts`, `api/audit-ground.ts`, `api/prisma/seed.ts`. |
| `docs/whatsapp-settings.md` | Each WhatsApp setting, where to find its value in Meta, the webhook and the back-office steps. Says 16 template names; the code has 24. |
| `docs/whatsapp-templates.md` | "For Abubakar to submit": the four of 19 October, the one of 21 October, the one of 4 November. |
| `docs/morning-report.md` (15 October, "Needs Abubakar") | The backup, the Railway settings (`SETTINGS_ENCRYPTION_KEY`, `WHATSAPP_APPROVED_TEMPLATES`, `PUBLIC_API_URL`, `NODE_ENV`, Node 24), then merge #352; the four one-off scripts after; confirm production already ran main's `20260923200000`; staging WhatsApp settings and Meta's webhook; Railway has not always redeployed staging's API. |
| `docs/release-status.md` (21 October production list) | Backup, then two read-only checks (does Drop Access have a `whatsapp_connections` row, and what is its check-in's `kind_of_work`; if the connection row exists, Disconnect it, do not just switch it off). Merge `hotfix-whatsapp-silence-prod`, then `release-production-1021` (#386 to #399, 10 add-only migrations then). The daily alert address. The switches the day after. The five WhatsApp templates. A note that adding someone on day seven moved a check-in from ACTIVE back to AWAITING_PARTIES, the status billing reads, which "Abubakar may want to look" at. Whether all of this was done is **to confirm**. |
| `docs/release-status.md` (28 October) | The five pull requests planned from `wip/systemic` and the template mismatch for Abubakar's Meta submission ("five minutes" against "ten minutes"). |
| `docs/edge-protection-cloudflare.md` | Steps to put Cloudflare in front (not done on 10 September). |
| `docs/staging-compatibility.md` | The staging migration that was changed on our side (`20260923200000…`), and the 20 staging commits kept. |
| `docs/existing-users.md`, `docs/handover/impact-on-existing-users.md` | The two checks of existing clients (`existing-clients-compare.ts`, `existing-clients-check.ts`) that need a copy of the live data. Read every FAULT, LEAK, ASK, WHERE and SCHEDULE line. |
| `docs/handover/abubakar.md` | A copy of the three-step note in 1A, which first asked for the small script pull request to be merged so that #414 carries the script. |
| `docs/ready-to-deploy.md` | **Out of date:** it still says migration `20260923200000` reopens check-ins and that scenario packs are switched on by hand. Neither is true now. |
| `docs/pull-request.md` and `docs/pr-1.md` | Per-pull-request "Before you merge" lists. Read them for the pull request you are merging. |
| `docs/deploy.md`, "Organisations over their plan" | A read-only query to run once on the live database to list organisations over their plan's seats, and send the result to Hafsah. |
| `docs/deploy.md`, "Four weeks after a free trial, then a pause" | A read-only query that lists who would be reached before the trial is switched on. |
| `docs/deploy.md`, "The daily usage summary" | A read-only query to check who the daily usage email goes to. |
| `api/docs/AUTH-DECISIONS.md` | Mentions Abubakar; not read for this file. **To confirm** whether it holds anything he must do. |
| `docs/guard-change-proposal.md`, `docs/standards.md`, `docs/roadmap.md`, `docs/THE-FULL-LIST.md`, `docs/CODEBASE_AUDIT.md`, `docs/anchor-scenario-plan.md`, `docs/screens-handover.md`, `docs/morning-report-ui.md`, `docs/fix-plan-16-nov.md`, `docs/decisions-merged.md`, `groundwork_local_test/PRODUCT_DECISION_scenario_prompt_systems.md` | They mention Abubakar but were not read in full for this file. **To confirm** that none holds a step for him. |

---

## 12. "Missed before": what the existing `abubakar.md` did not mention

1. Four migrations newer than staging, with exact folder names (section 1C), and the caution about the index on `record_entries` and about migration order across pull requests.
2. The full environment-variable list (section 2). The old note listed none.
3. What a production start refuses (nine conditions), and that `FRONTEND_URL` and `STRIPE_CALLBACK_URL` are required in production by a different check that is not in that list.
4. `SETTINGS_ENCRYPTION_KEY`, `PUBLIC_API_URL`, `WHATSAPP_APPROVED_TEMPLATES`, `NODE_ENV` and `TRUST_PROXY_HOPS`, and Node 24.
5. The three stored prompt rows to refresh, and how (section 4), and that two of them are not refreshed by a start.
6. `GW_LEAN_CONVERSATION` must be off, and `GROUNDWORK_MODEL_STAND_IN` and `WHATSAPP_GRAPH_BASE_URL` must be unset.
7. `PROPOSE_PROMPT_CHANGES` and `APPLY_LEARNED_WEIGHTS` are code constants, both `false`, not settings.
8. The free trial is Hafsah's decision, not part of the deploy, and how it must be written (`onSince`).
9. The 24 template names, which are approved, which need submitting, the withdrawn and the not-wired ones, and F34 and F35 (section 3).
10. The documents and git disagree on #352, #362, #364, #414 and #417 (top of this file and section 7).
11. #419 (`hotfix-team-skip`) is open and waiting.
12. The four one-off scripts from the 15 October release, and whether they ran.
13. The security note: the signing secret in the repository's history, and the platform-admin bootstrap setting.
14. The weekly memory rebuild is a new scheduled job, and the once-across-copies requirement and its exceptions for short jobs.
15. The workflows use Node 20 while the packages ask for Node 24.
16. Main's `20260923200000` check.
17. Two older migrations share the timestamp `20261102120000`.
18. `api/.env.example` shows `CONFIDENCE_ENABLED` and `POST_REPORT_GUIDE_ENABLED` as `true`, while the code default for both is off.
19. The staging WhatsApp warning: one Meta app sends one number's messages to one address.
20. The webhook addresses for Stripe, Resend and WhatsApp (Groundwork's own and each organisation's), and the health addresses.
21. `docs/whatsapp-settings.md` says 16 template names; the code has 24.
22. Cloudflare is not in front (as of 10 September), and three persona workflows are paused.
23. The daily delivery alert address, the daily usage summary and the trial-grace emails.
24. The per-organisation switches and the two scripts that change them for named clients.
25. `docs/combined-status.md` has no results section, so the spec results on the combined branch are not recorded.
26. Live staging is ahead of the local copy (`9c21d9545`).
27. The rollback rule: restore the backup and the code together.
28. The two existing-clients checks need a copy of the live data and have not been run on it.
29. `docs/ready-to-deploy.md` is out of date.
30. The `releases/` folder holds a full database dump and is ignored by git.

---

## Decisions that need Hafsah before release (rows in `docs/decisions-taken-for-hafsah.md`)

Every row there was taken as "the safest choice that keeps existing users unchanged", and the document says to confirm or change them in one go. The row numbers 11 to 19 are used twice in that file: once for the pricing and finishing rows 11 to 15 near the top, and once for the "chat is king" rows 11 to 19 further down. They are told apart below by name.

**Needs a decision, because the recommendation asks for one.**

| Row | The decision |
| --- | --- |
| 2 | Typed finish on the web: does the server's "ends on its own" or the approved button flow stand (seven approved page specs pin the button)? |
| 3 | Is the free trial switched on for the release (Admin, System, Pricing)? This decides what Abubakar does in section 5. |
| 10 | Is the first conversation check-in 1 everywhere, or not counted as a check-in anywhere (she recommends the second)? |
| B2-1 | Streaming replies sentence by sentence and correcting openly, against B-092's decision to hold the draft: build later with a live run? |
| B2-3 | Drop the unused column and rule 5 later, in a later add-only migration? |
| B2-4 | Confirm `roleAsDescribed` is "Their role here" and that setup's strategy and notes reach the team only when shared. |
| B2-9, B2-10, B2-11 | What "near a decision" means, whether records stage 2 or the golden set goes first, and who may set an owner. |
| R-9 | The four David specs: is an unopened round evidence that coaching failed? |
| R-10 | Look at the missing lines in `what-round-15-found-in-the-sales-numbers`. |
| DS-16 | Does the design brief override the 24 October order to copy the prototype's stylesheet? |
| DS-17, DS-18, DS-19 | Which remaining design items to do next; a "what went well" line on Today; one card per person. |
| DS-22 | Are the older failing client specs or the code out of date? |
| 11 (chat is king: who may read a person's history) | Who is responsible for whom; this is a privacy question. |
| 13 (chat is king: connecting by chat) | Whether connection is finished entirely in chat, which needs a way to take a secret that is not stored. |
| 14 (chat is king: role map) | Whether admins may assign roles in Groundwork at all. |
| 16 (chat is king: check-in from one sentence) | Who may invite people who are not on the roster. |
| 17 (chat is king: sign-up by chat) | Whether a stranger's first message creates only a held setup, and whether the web order changes to match. |
| 19 (chat is king: history for a manager or HR) | Whether a manager reads the My work page or only the report; this is a privacy rule change. |
| M1, M7, M8 | Read the learning spec; when to wire memory into check-ins and into the board. |
| M10 | When, if ever, learned weights go on (only after the 24 scenarios and the scorer). |

**Confirm only ("Keep").** Rows 1, 4, 5, 6, 7, 8, 9 (replaced by 12), 11 (pricing page), 12, 13, 14, 15, B2-2, B2-5, B2-7, B2-8, R-1 to R-8, DS-20, DS-21, chat-is-king rows 12 and 15 and 18, and M2 to M6, M9 and M11.

**Release steps from that file that fall to Abubakar.** Row 4 and row 6 need the stored prompt rows refreshed (section 4). B2-8 needs the migration `20261119120000_organization_pauses_kept_so_a_paid_again_organisation_is_not_counted_again` named in the release notes. The "Release step" section lists the five prompt points (section 4 of this file).

**Other release decisions, from `docs/everything-on-the-list.md`, list B.** Item 12 (the free trial at production; the free-month reminder and ended emails are not built), item 17 (`wip/sync-ticks-to-staging`), item 21 (the copy audit: F2, F10 and F21 are privacy decisions; F34 and F35 need Meta re-approval), item 23 (the release-plan decisions), and item 25 (dropping scratch databases by hand).

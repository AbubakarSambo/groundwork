# The release questions

> **Rollback, always (decision 90):** restore the database backup and the old code together, never the code alone. Migration 8 dropped a column, so the old code cannot read the new database.

Written on 1 October 2026, on branch `wip/plain-reports`, for the person who deploys Groundwork and owns its infrastructure. Checked again on 4 October 2026 against decisions 78 to 91: a question that a decision has answered is marked "Answered" with its decision, and the questions that tonight's work raised are added (12d, 15 and 16, and Part 2). Each question says why it matters and what we would do for each answer. How the release itself runs is in `docs/deploy.md`.

Nothing here has been done. Nothing was pushed, deployed or changed on any hosted database to write it.

---

## The update of 14 October

1. **Migration 97 writes one value into every existing organisation:** one free month of WhatsApp from the day it runs. Please confirm this is wanted on the live data. Hafsah decided it on 13 October.
2. **When the free month ends,** WhatsApp stops for an organisation that has not added it to its subscription. Nothing is charged automatically. The admin reads "WhatsApp is free until …" on Plan and billing.

## Part 1. Questions for the person who deploys

### 1. What state are the hosted databases in, against these migrations?

This branch adds 81 migrations after `20260923140000_what_we_have_so_far`, the last one on the remote `main` (the full list is in `docs/deploy.md`, section 2).

**Why it matters.** The API applies every waiting migration by itself when it starts (`prisma migrate deploy` in `api/railway.toml`). If a hosted database is not at `20260923140000_what_we_have_so_far`, or has a migration marked as failed, the API will not start after the release.

**Please tell us,** for the preview database and for production: the last row in `_prisma_migrations`, and whether any row has no `finished_at`.

| Answer | What we would do |
| --- | --- |
| Both are at `20260923140000_what_we_have_so_far`, with nothing failed. | Go ahead as written. |
| One is behind. | Release the remote `main` to it first, so it catches up on its own, then this. |
| One has a failed row. | Find out which and why before anything else. Nothing on this branch fixes it. |
| One already has some of the 81 (for example, somebody applied them by hand). | Compare the rows by name. Prisma skips what is recorded. A file that changed after it was applied (`20260923200000_reopen_every_check_in_that_ran_out_of_time`, which is now empty) would need checking by hand, because the old version reopened check-ins. |

### 2. Is a backup taken before the migrations, and who takes it?

**Why it matters.** One migration deletes a column (`check_ins.next_commitment`), and several fill in or change existing rows: the pattern rows (twice), who arrived through the open link, each report's released sessions, the prices and the trial's months in `pricing_plans` and `platform_settings`, and three columns of `time_weeks` that may now be empty. The full list is in `docs/deploy.md`, section 2, and the rollback rule at the top of this file says what to do if something goes wrong. None of them can be undone by a later migration. And because the API migrates the database the moment it starts, the backup has to be taken before the host picks up the new code.

| Answer | What we would do |
| --- | --- |
| The host takes automatic backups we can restore to a point in time. | Note the time just before the release, and check the restore works on the preview database once. |
| Backups are manual. | Take one by hand, right before the release, for each database. |
| There is no backup. | Do not release until there is one. |

Before the release, please also run this on each database. It must say 0, because the column it checks is about to be deleted: `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;`

### 3. How is the API released, and which branch does its host follow?

**Why it matters.** The repository says what the screens do (they are published when `main` or the other long-lived branch changes), but which branch the API's host follows is set in the host's dashboard, not in the repository. Releasing the screens without the API, or the other way round, would break the pages: the screens on this branch call routes the old API does not have.

| Answer | What we would do |
| --- | --- |
| The API follows the same branch as the screens. | Join this branch to that branch once, at a time agreed with Hafsah, with the backup taken first. |
| The API is released by hand. | Release the API first, check it starts and the migrations finished, then let the screens follow. |
| Something else. | Write the steps into `docs/deploy.md` before the release. |

### 4. Does any hosted environment set `NODE_ENV=development`?

**Why it matters.** On this branch the API listens only on 127.0.0.1 when `NODE_ENV` is exactly `development` (`api/src/the-address-the-api-listens-on.ts`). A hosted API with that value would start, and then nobody could reach it. Production with `NODE_ENV=production` is not affected.

| Answer | What we would do |
| --- | --- |
| No, every hosted environment uses `production` or another value. | Nothing. |
| Yes, the preview environment does. | Change that environment's value to something else, such as `staging` or `preview`, before the release, or we change the rule so it narrows only on a laptop. |

### 5. The model: which region, and is the service account allowed to use it?

The product uses Gemini through Google Cloud (`GEMINI_PROJECT_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`). The code defaults to the region `us-central1` (`GEMINI_LOCATION`), the model `gemini-2.5-pro` for reports and `gemini-2.5-flash` for the conversation.

**Why it matters.** From this Mac the `us-central1` address timed out all week, so every local run used the `global` address, set only on the commands started here. The hosted API may be fine on `us-central1`, but nobody has checked it this week. This release also adds more model calls: the report now runs some calls side by side, and there are new nightly jobs (question 8).

**Please tell us** which `GEMINI_LOCATION` the hosted API uses, and whether its service account can call both models there.

| Answer | What we would do |
| --- | --- |
| `us-central1`, and it answers from the host. | Leave it. |
| It times out from the host as well. | Set `GEMINI_LOCATION=global` on the host. Nothing in the code needs to change. |
| A different project or account. | Check that it can reach both models before the release, with one test call from the host. |

### 6. Email: is Resend ready to send for real, and only from production?

**Why it matters.** This release adds new emails: a warning before a check-in runs out of time, a check-in that was reopened, somebody asking for more time, somebody waiting for an admin, somebody let in, a report that is ready, and the team update when everyone has answered. Production refuses to start unless `EMAIL_SENDS_FOR_REAL=true` and `RESEND_API_KEY` is a real key. No test, and no scenario run, sends a real email.

| Answer | What we would do |
| --- | --- |
| Production sends for real, and the preview environment does not. | Nothing. |
| The preview environment also sends for real. | Switch it off there before the release, because the first night's warning job would email real people from test data. |
| The sending domain is not verified with Resend yet. | Production will not deliver mail. Verify it first. |

### 7. Stripe billing: what state is it in? (Partly answered by decision 78)

**Answered:** the trial is one month and stays off until Hafsah switches it on, and the add-on's Stripe prices are made in test mode only (decision 78, items 1 and 4). **Still to answer:** whether Stripe is wired on the hosts, and whether any live key is on the preview environment.

As far as we know, Stripe is not wired yet and there are no paying subscribers. Production refuses to start without `BILLING_ENABLED=true`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. This release adds the free trial (off by default), an invoice list for admins, and a seat count that leaves guests out.

Decision 78 adds two things here. The free trial is now one month (the setting's months, written by migration `20261002160000_whatsapp_is_a_paid_add_on`, with its switch left off). And WhatsApp becomes a paid add-on, about 80% of each plan's price, with a monthly message limit per plan, both stored in `pricing_plans` and editable at Admin, System, Pricing. While the trial's switch is off, the add-on is never charged and no message is held; only the monthly limit applies. Once the switch is on, an organisation past its trial that pays and has turned WhatsApp on has the add-on as a second line on its Stripe subscription. **The add-on's Stripe prices are created in test mode only until Hafsah says otherwise**; the migration creates nothing in Stripe.

**Why it matters.** The free trial, once switched on, stops the free plan for organisations created after that moment. If it were switched on while Stripe cannot take a payment, new teams could not start.

| Answer | What we would do |
| --- | --- |
| Stripe is not wired. | Leave the free trial off (`pricing.freeTrial` absent or `on: false`). Billing behaves exactly as today. |
| Stripe is wired, with live keys. | Still leave the free trial off at release. Switch it on later, on Hafsah's word, after one test payment. |
| Stripe is wired in test mode only. | Make sure no live key is on the preview environment, and leave the trial off. |
| Somebody wants to switch the trial on. | Not on release day, and only on Hafsah's word. Switching it on also starts charging the WhatsApp add-on to organisations past their trial that turned it on, and holding WhatsApp for those that did not. Run one test-mode payment with the add-on first. |

### 8. Background jobs: can the host run them, and once only?

This branch adds or changes these scheduled jobs (all times UTC):

| Job | When | What it does | Model calls? |
| --- | --- | --- | --- |
| Warn before a check-in runs out of time (`grounds.cron.ts`) | 02:00 daily | One email to whoever runs a check-in that is close to its end, once per check-in. | No |
| The company-wide picture (`the-company-picture.service.ts`) | 03:30 daily, and when a check-in completes | Rebuilds an organisation's picture only when its record changed. | Yes, one per change |
| Role gap notes (`the-role-gap-notes.service.ts`) | 03:45 daily, and when a check-in completes | Writes why a job nobody owns matters, only when the record changed. | Yes, one per change |
| Self-learning counts (`learning.cron.ts`) | 03:00 daily | Recounts the signals. | No |
| Reviews that fall due (`the-reviews-proposed.cron.ts`) | 06:30 daily | Proposes a review when one falls due; never starts one. | No |
| The WhatsApp add-on's Stripe lines (`whatsapp-add-on.service.ts`) | 01:00 daily | Adds the add-on to the Stripe subscription of an organisation whose trial has ended and which turned WhatsApp on, and removes it where it should no longer be charged. Does nothing while the trial's switch is off, or with no Stripe key. | No |
| A request that waits too long is passed on (`a-request-waits-too-long.cron.ts`) | 07:00 daily | Passes a leave, hours or spending request on to the next person when the admin has set a number of working days. Does nothing for an organisation that set no number. | No |
| Reviews coming up (`reviews-coming-up.cron.ts`) | 07:00 daily | Emails a manager once per review that falls due within 14 days. | No |
| Reports left behind (`reports.service.ts`) | 35 minutes past every hour | Writes a report again when more people have answered than it read. Old reports are skipped. | Yes, one report per case |

**Why it matters.** On the first night, nothing is stored yet for the company picture or the role gap notes, so each runs once for every organisation that has the records it reads. Since decision 74 they run one organisation at a time, with a pause after each one that called the model. The warning job emails only about check-ins that reach their last week after the release; anything already there at release gets no email. Each daily, weekly and hourly job runs once even if the API runs on more than one instance.

| Answer | What we would do |
| --- | --- |
| One instance, always on. | Nothing. Read the logs the morning after. |
| More than one instance. | Nothing more is needed for the daily, weekly and hourly jobs: since decision 74 each claims its time slot in one database row before it runs, so it runs once across copies (`api/src/modules/prisma/once-across-copies.ts`). The jobs that run every 15 or 30 minutes still rely on an advisory lock, which with pooled connections can be released on a different connection; tell us, and we move them to the same claim. |
| The instance sleeps when idle. | The jobs will be missed while it sleeps. Tell us, and we decide whether that matters. |

### 9. Memory and timeouts for reports that run many model calls side by side (week 25)

A report for a team now runs three independent model calls together, and after it is released it prepares each reader's version four at a time instead of one after another. The conversation prompt alone is about 118,000 characters. A report is written after a check-in comes in; opening a page never starts one.

**Why it matters.** On a small instance, several large model calls at once can run out of memory or hit the model's rate limit. The model client waits and tries again on a "too many requests" answer, twice. Separately, adding a person to a check-in runs in one database transaction limited to 5 seconds; on a busy local run it once took 6.8 seconds and was refused.

**Please tell us** the API's memory, any request timeout the host or its proxy applies, the database's connection limit, and the Gemini quota for the project.

| Answer | What we would do |
| --- | --- |
| At least 1 GB, with a quota well above a few calls a second. | Release as is, and watch the first large team's report. |
| Smaller, or a tight quota. | Lower `READERS_WARMED_TOGETHER` in `api/src/modules/reports/reports.service.ts` from four to two before release. It changes only how long the lead waits. |
| The database is slow under load. | Raise the 5-second transaction limit for adding a person, or move that step out of the transaction. |

### 10. WhatsApp: are any templates approved? (The decision to ship it is answered)

**Answered:** WhatsApp is part of this release, for the paid client and the two existing clients on the same terms (decisions 81, 88 and 90), with the templates written in `docs/whatsapp-templates.md` (decisions 82 and 83) and the add-on and limits as decision 78 says. **Still to answer:** which of the 13 templates Meta has approved. `WHATSAPP_APPROVED_TEMPLATES` is empty as far as we know, so Groundwork cannot write first to anyone on WhatsApp, and the first contact has to be email. The full list of settings and templates is in `docs/whatsapp-settings.md`. A client's WhatsApp needs two switches: the platform's (`whatsapp_enabled`) and the organisation's add-on.

| Answer | What we would do |
| --- | --- |
| None approved. | Leave WhatsApp off (`whatsapp_enabled` not `true`). Nothing changes. Note that `lead_daily_summary` as written will be refused by Meta (see Part 2). |
| Approved, and WhatsApp switched on. | Each organisation's messages are counted per calendar month (`whatsapp_monthly_use`), and at its plan's limit nothing more goes by WhatsApp until the next month; its admins are emailed once. The limits are a proposal until Hafsah answers. |
| Some approved. | List them in `WHATSAPP_APPROVED_TEMPLATES` on the host, and switch WhatsApp on later, on Hafsah's word, not on release day. |

### 10a. For Abubakar: submit new WhatsApp templates that say "about ten minutes" (Hafsah, 18 October)

The Meta-approved templates `checkin_open`, `checkin_closes_soon` and `checkin_your_view_matters` say a check-in takes "five minutes". Hafsah's rule is "about ten minutes", and the approved templates are never changed. **To do:** submit new templates, with new names, whose words say "about ten minutes", and tell Hafsah when Meta approves them. Until then the approved ones go out unchanged.

### 10a-2. For Abubakar: Release 1, pull request 5 (19 October)

1. **A new table and a new scheduled job.** `scheduled_whatsapp_messages` holds a WhatsApp message Groundwork starts in quiet hours (after 8 in the evening and before 7 in the morning, where the organisation is), and `held-for-the-night.cron.ts` sends it at 7, every fifteen minutes, under its own lock (920015). Can the host run one more fifteen-minute job, once only, as it runs the held mail? If the job does not run, nothing is lost: the rows wait, and the message is in the app.
2. **Which time zone is an organisation in?** Quiet hours read the organisation's named zone, else where most of its people's numbers are, else Lagos. An organisation with no zone and no numbers is read in Lagos time. Please say if any live organisation should have its zone set first.
3. **The lead's morning summary goes at 9 in Lagos time**, and routine mail to somebody who runs a check-in now waits until half an hour after it (08:30 UTC) and goes only if the summary did not. A lead in a zone far from Lagos would have that mail held into her afternoon. Is 9 in Lagos right for the live leads, or should the summary's hour be each organisation's?
4. **For Hafsah: "runs out in 7 days" stays its own email.** On Drop Access it was folded into the lead's summary as a risk. It is the only warning before a check-in is stalled, and the summary's lines can be cut for room, so this pull request keeps it as an email of its own for every organisation (it no longer holds the summary back). Should it fold into the summary once the summary is sure to carry it?
5. **For Hafsah: what applies to every organisation.** The pull request lists, in `docs/pull-request.md`, what every organisation reads differently whatever the switch says: her standing rules (one channel per opening, quiet hours ending at 7 where the organisation is, one routine message a day with the lead's summary as hers, "about ten minutes") and the corrections of things that were untrue. Everything else new is behind Release 1's switch. Please confirm the list.
6. **Submit the four new WhatsApp templates, then list them (Hafsah, 19 October).** In Meta Business Manager, open WhatsApp Manager, then Message templates, then Create template, and submit the four in `docs/whatsapp-templates.md`, "The four new templates of 19 October": `groundwork_checkin_open_v2`, `groundwork_checkin_thanks`, `groundwork_your_report_ready` and `groundwork_promise_due`. Category Utility, language English, each body and its samples exactly as written there. Once Meta approves one, add its name to `WHATSAPP_APPROVED_TEMPLATES` on production (and on staging, once staging WhatsApp is set up). Groundwork uses a template only when its name is in that list. Until then, a message WhatsApp cannot take goes by email instead. Once `groundwork_checkin_open_v2` is approved and listed, `checkin_open` stops being used for new openings: leave it approved in Meta, but unused. Will you submit them, and tell Hafsah when each one is approved?

### 10b. WhatsApp on the Connections page: the API's public address, and Groundwork's own number

Two new settings, neither a secret, both optional (see `docs/deploy.md`, section 3).

- **`PUBLIC_API_URL`.** What is the API's public address on each hosted environment, without `/api/v1`? An organisation's admin pastes `<that address>/api/v1/webhooks/whatsapp/<organisation id>` into Meta to connect its own number. Without it, the page says the address will be known once Groundwork is hosted.
- **`WHATSAPP_DISPLAY_NUMBER`.** What is Groundwork's own WhatsApp number, as people should read it (for example `+44 7700 900123`)? It is shown to an organisation using Groundwork's number. Without it, the page says "Groundwork's WhatsApp number" with no number.

| Answer | What we would do |
| --- | --- |
| Both known. | Set both on the host. Nothing else changes; neither changes what is sent. |
| Not yet. | Leave them unset. The page says so in a sentence, and nothing breaks. |

### 10c. `SETTINGS_ENCRYPTION_KEY`: Abubakar must add it before release

Groundwork staff now set Groundwork's own WhatsApp number, its IDs and its three secrets (access token, app secret, verify token) on the back-office page `/admin/whatsapp`. The secrets are stored encrypted, with a key the API reads from the server setting `SETTINGS_ENCRYPTION_KEY`. **Abubakar must add it to the API's settings on each hosted environment before release.**

How to create it: on any computer, run `openssl rand -base64 32` and paste the result into the host's settings for the API. It must be at least 32 characters (or 32 bytes written in base64 or hex). It is a secret, so it never goes in the code, a document or a chat. Use a different key on each environment, and do not change it later, because a changed key means every saved secret has to be typed in again.

| Answer | What we would do |
| --- | --- |
| Added before release. | Hafsah saves the WhatsApp details on `/admin/whatsapp` and switches WhatsApp on there. WhatsApp then uses the saved details, with the server's `WHATSAPP_*` settings only as a fallback for a field nothing was saved for. |
| Not added. | Nothing breaks. The page cannot save secrets and says so, and WhatsApp keeps using the server's `WHATSAPP_*` settings, as before. |

### 10d. How many proxies sit in front of the live API?

The API now counts each visitor by their own address in its rate limits (known issue B10). To do that it has to know how many proxies stand in front of it, for example the host's load balancer, plus a content network like Cloudflare. It reads that number from the server setting `TRUST_PROXY_HOPS`. Unset, it assumes 1 in production. When the API starts in production without the setting, it writes a warning in the log once and carries on.

**Please tell us** how many proxies sit in front of the live API, and of the preview API.

| Answer | What we would do |
| --- | --- |
| One. | Nothing to set. Setting `TRUST_PROXY_HOPS=1` quietens the warning. |
| More than one. | Set `TRUST_PROXY_HOPS` to that number before release. If it is left at 1, everybody who comes through the same content network may share one allowance, so five sign-ins a minute could be refused for several people at once. |
| None (the API is reached directly). | Set `TRUST_PROXY_HOPS=0`, so a made-up header is never believed. |

### 11. Has anybody changed a prompt in production through `/prompts`?

**Why it matters.** Since decision 74, a start never replaces a version somebody activated by hand: it adds the code's new words as an inactive version beside it. It still creates and activates new versions of the changed keys, and the 4 new ones, where the active version is one a start put there. Before this release nothing recorded who activated a version, so a version activated by hand before release, and labelled "Seeded on deploy", cannot be told apart and would be replaced.

| Answer | What we would do |
| --- | --- |
| No. | Nothing. |
| Yes. | Send us the key and the words. We put them into the code first, so nothing is lost. |

### 12. How should the one-off script for people's own words run on a hosted database?

After the migrations, every existing record line and commitment is marked "not the person's exact words" until `api/journey/stamp-said-word-for-word.ts` runs. Until it does, existing reports lose their quotation marks and some quoted sentences are dropped. Since decision 74 the script can run on a hosted database, but only when whoever runs the release adds `--hosted-database`: on its own that is a dry run that prints what would change; with `--write` it also asks for the database's host name to be typed back, and writes nothing unless it matches. The engine work never runs it on anything but its own machine.

| Answer | What we would do |
| --- | --- |
| Run it through a tunnel, so the hosted database looks local. | Run it once on each database right after the migrations, and check one existing report has its quotation marks back. |
| No tunnel is possible. | Run it with `--hosted-database` first, read the dry run, then with `--hosted-database --write`, typing the host name back. |
| Do not run it. | Old reports keep working, without quotation marks. New check-ins are not affected. Hafsah decides if that is acceptable. |

### 12b. How should the one-off script that brings the checkability read up to date run on a hosted database? (request 103)

Sessions read before 29 September undercount how checkable each person's own answers were, so their Done page and session report say a date or a wait was "not picked up" when it was said. `api/journey/bring-the-checkability-read-up-to-date.ts` raises those reads (never lowers one, never changes anybody's words), and is a release step only whoever runs the release may take, with explicit confirmation: `--hosted-database` alone is a dry run that prints what would change; with `--write` it asks for the database's host name to be typed back and writes nothing unless it matches. The engine work never runs it on anything but its own machine.

| Answer | What we would do |
| --- | --- |
| Run it, once on each database, after the migrations and after the word-for-word script. | Read the dry run, then run it with `--hosted-database --write`, typing the host name back, and check one person's Done page from before 29 September. |
| Do not run it. | Sessions read before 29 September keep undercounting on the person's own Done page and report. New check-ins are not affected. Hafsah decides if that is acceptable. |

### 12c. How should the one-off script that brings each check-in's record up to today's rules run on a hosted database? (request 117)

Rows written before a fix to how the engine writes them stay as they were, because nothing rewrites a stored row when a board is opened (decision 7). On "Sales team, Q3" that meant a false "Met", one aim kept as three targets, the team's aim with no number, "You are waiting on themselves", and two deals the lead was never asked about. `api/journey/bring-a-check-in-up-to-date.ts` reads each check-in's stored rows again under today's rules and changes only those rows. It asks nothing of anybody, calls no model and never changes anybody's words. It is a release step only whoever runs the release may take, with explicit confirmation: `--hosted-database` alone is a dry run that prints each change in a sentence; with `--write` it asks for the database's host name to be typed back and writes nothing unless it matches. The engine work never runs it on anything but its own machine.

| Answer | What we would do |
| --- | --- |
| Run it, once on each database, after the migrations and after the two scripts above. | Read the dry run, check a few of its sentences against the boards they name, then run it with `--hosted-database --write`, typing the host name back. |
| Run it on one check-in at a time. | Add `--check-in <id>` to both runs. |
| Do not run it. | Check-ins written before the fixes keep their old rows until the lead corrects them on the board. New check-ins are not affected. Hafsah decides if that is acceptable. |

### 12d. How should the one-off script that gives each existing check-in its kind of work run on a hosted database? (decision 91, item 1)

A check-in made before the eleven kinds of work existed has none, and decision 91 says existing check-ins move to the new boards. `api/journey/give-each-check-in-its-kind-of-work.ts` gives each one the kind that fits, using the same reading a new check-in gets at setup. It calls the model once per check-in, with no randomness, and keeps every answer in a file so a second run costs nothing. It writes only the kind, never a word, schedule, session or report, and it reopens, emails and stalls nothing. A check-in it cannot place keeps its board and is listed. `--hosted-database` alone is a dry run; with `--write` it asks for the host name to be typed back.

| Answer | What we would do |
| --- | --- |
| Run it, once on each database, after the migrations and before the script in 12c. | Read the dry run and the list of check-ins it cannot place, then run it with `--hosted-database --write`. |
| The model cannot be reached from where it is run. | Run it where it can, with the database address of the host. Nothing is written without the typed host name. |
| Do not run it. | Existing check-ins keep the board their situation gives them, and decision 91 is not met for them. Hafsah decides. |

### 13. Which of the two histories goes first?

This branch was started before pull requests 295 to 317 reached the remote `main`. Their changes are all on this branch under other commit hashes, but the two histories have not been joined. The release needs one join of this branch onto the remote `main`, and whoever does it should expect conflicts in files both sides touched. `docs/ready-to-deploy.md` also asked whether an earlier pull request of Hafsah's had been taken in first.

| Answer | What we would do |
| --- | --- |
| Join this branch onto the remote `main` on a new branch, and test there. | Run every test and one full scenario run on the joined code before anything is released. |
| Release from this branch as it is. | Not advised: the remote `main` would no longer be what is live. |

### 14. Are the scenario packs meant to be switched on by hand?

`docs/ready-to-deploy.md` says the 50 scenario packs "run from the database, not from the files" and are switched on by hand (decision 20). The code does not work that way: the packs are among the keys written on every start (question 11), so 21 changed packs become active at release.

| Answer | What we would do |
| --- | --- |
| Writing them on start is fine. | Nothing; we correct `docs/ready-to-deploy.md`. |
| They must be switched on by hand. | This is Hafsah's decision. We would take the packs out of the start-up list, so the release leaves the hosted packs as they are. |

### 15. Can the two checks of existing clients be run on a copy of the live data?

`api/journey/existing-clients-compare.ts` (the old code against the new on existing check-ins) and `api/journey/existing-clients-check.ts` (what each reader is served, and whether scheduled check-ins carry on) have passed on the local test database. They both only read. The steps are in `docs/existing-users.md` sections 5 and 7. They need a copy of the live data and access that only Hafsah can give.

| Answer | What we would do |
| --- | --- |
| A copy is available. | Run both, read every FAULT, LEAK, ASK, WHERE and SCHEDULE line, and fix what they show before release. |
| No copy is available. | Release with only the local proof, which Hafsah must accept in writing. |

### 16. Which release switches should be turned on, and when?

Four things are hidden from anything new at release, and nothing an existing client uses is hidden (decisions 88 and 90): boards for kinds of work beyond sales and project (`release.boardKindsOffered`), the Context tab's move to Ask Groundwork (`release.contextInAskGroundwork`), Plan and billing's new parts (`release.planAndBillingNewParts`), and the back office rebuild, which was not built. Decision 91 says each other kind is offered as soon as the screens workspace marks its board done. Each is one row in `platform_settings` and needs no deploy to change (`docs/deploy.md`, "Hidden at release").

| Answer | What we would do |
| --- | --- |
| Release with the defaults. | Nothing to set. |
| Turn one on at release. | Write its row after the migrations and the scripts, and never on the day the migrations run. |

---

## Part 2. Hafsah's open items, and which of them block the release

These come from `docs/morning-report.md` and `docs/existing-users.md`, under "Decided for Hafsah to confirm" and "Needs Hafsah". Items that were later answered are marked with the decision that answered them, and are not asked again.

### These block the release until Hafsah answers

| Item | Why it blocks |
| --- | --- |
| **A total can give a number away.** "Yours is 21, of 270 across ten people" gives a colleague's number away when only two people have one. | Still open in the report. It tightens a privacy rule, so it needs her yes. |
| **The yes or no list in `docs/privacy-restrictions-for-hafsah.md`** (the restrictions that came from a choice by Claude, decision 86). | Nothing is changed until she answers, and a restriction she does not want must come out before release. |
| **Joining this branch with the live main line, and the combined run** (questions 13 and 3). | Only she can allow the join. |
| **The two checks of existing clients on a copy of the live data** (question 15). | They prove the new build on existing data (decision 90). |
| **The one-off scripts** (questions 12, 12b, 12c and 12d). | Without them, existing reports lose their quotation marks, existing check-ins have no kind, and old rows keep their old faults. |
| **Replacing `docs/decisions.md` with `docs/decisions-merged.md`.** | The engine follows the merged file, and the protected file is out of date. Hafsah does this herself. |
| **The "picture" count in "proof asked for".** | The one number in the last scenario run that is not level with the baseline. |
| **`lead_daily_summary` ends with a blank, so Meta will refuse it** (`docs/whatsapp-templates.md`). | The lead's daily summary outside the 24 hours does not go until a version is approved. Inside the 24 hours it goes as an ordinary message. |

### Answered, and no longer asked

- **Item 13, the lead's setup brief quoted into a participant's check-in:** never quoted, may guide the conversation (decision 75, item 13).
- **Item 14, one person's circumstances reaching another where people do not see each other:** never reach another (decision 75, item 14). A sentence about the organisation's process that names nobody is allowed (decision 89, item 2).
- **The four suites files the one-rule test flags:** excused (decision 89, item 1).
- **Patterns:** never switched off. The person reads one first and whoever runs the check-in reads it after (decisions 74 and 86).
- **Coaching is on where no setting row exists:** confirmed (decision 74).
- **The 30 "decided as the safer choice" items:** Hafsah said yes to all 49 items in the morning report except the ones decision 75 lists. So these now stand, with these changes: item 17 (all five target kinds are built), item 24 (an undecided suggestion keeps its facts, marked if the person has recovered), item 25 (probation and first-90-days check-ins are evaluation check-ins), item 29 (a company rule said in setup is offered once to keep), and items 2, 5, 13 and 14 as above. Items 1 to 12, 15, 16, 23, 26 to 28 and 30 stand as written. Decision 86 then reversed the patterns, counts and figures ones (86, items 1 to 3).
- **The existing-clients plan:** WhatsApp for existing clients is no longer held until they turn it on; they get the whole new build on the same terms (decision 90). The new WhatsApp jobs still send only for an organisation whose add-on is on.
- **`gw_review_run26` and its dump:** stay until after release (decision 89, item 3).
- **The order and scope of the work, and which boards:** decisions 79, 81, 87, 88 and 91.

### New, raised by the existing-clients work and the last scenario runs (do not block, but she should decide)

1. **A participant's board shows only their own words and the lead's under "who owns what"** (about 154 sentences on existing check-ins). The old board showed every colleague's success definition word for word. Which way should a participant's board read? (`docs/existing-users.md`, "Decided for Hafsah to confirm".)
2. **A participant of an existing check-in now reads only the released sessions,** and 411 sentences of later sessions wait for the lead (migration 70). Should the lead release them, or the migration release them all?
3. **Leads of existing check-ins who have a say-back waiting (21 on the local database) get their next message read by the model,** where the old code read it with rules. Not tested here for want of a model.
4. **A label in a sentence the model writes into the agreements, and the outcome "The new person leaves the role."** on an onboarding board (request 123, item 8). Left for her.
5. **"Where this is heading" is deliberately not built for evaluation check-ins** (decision 6). It waits for her to confirm.
6. **The commit of her guard version 2 (`e4a51793`) was refused at push time,** so nothing has been pushed since. She can push it herself, or allow it.
7. **`docs/ready-to-deploy.md` is out of date.** The safety check refused the edit earlier, so it still says migration `20260923200000` reopens check-ins (it now does nothing) and that scenario packs are switched on by hand (question 14). Hafsah can make that edit, or say how it should be worded.

From the earlier "Needs Hafsah" lists, still open and not blocking:
- Switching off the old context chat. It stays on, which is safe, until Hafsah says.
- Requests 17 (f), 17 (g) and 28 (b) from the screens workspace.
- Deal stages (Contacted, Need, Pitched and so on): the engine has none, so that part of the weekly report is not built.
- Who may mark somebody else's to-do as done.
- Week 0's next step (the recommendation is option 2).

### Release 1B, pull request 2 of 3: References and resources (19 October)

These do not block the pull request, which is off for every organisation, but each should be answered before the switch is turned on for a real client.

1. **The lead's People note does not reach that person's own check-in yet: it waits for Hafsah.** Hafsah's spec and her brief of 18 October say the check-in "reads the lead's People note for the person it's talking to". Decision 32 (27 September) said a lead's private notes about a person never reach the model in that person's own session. A privacy rule changes only on her word, so the code is built as narrowly as both allow (only notes written in the new People section, only in that one person's own check-in, never the lead's, never quoted) and held off by one line, `THE_PEOPLE_NOTES_REACH_THEIR_OWN_CHECK_IN`, which is off. Until she says yes, the People notes stay on the page and the page says "Their check-ins do not use them yet." Should the check-in read them?
2. **Suggested from your check-ins.** Nothing yet picks a rule or guideline out of the lead's own check-in. The section shows a plan's proposals still waiting for her instead. Should the lead's check-in offer what she says as a rule, the way the prototype draws it?
3. **Questions and answers, and Ask about this work.** Ask does not keep the questions asked about one check-in, does not answer only from this page with its source, and does not send an unanswered question to the lead. The button opens Ask set to this check-in; the section says nobody has asked yet. Build these in Ask?
4. **A document a team member shares in a check-in** is filed as evidence where it is proof. It is not yet put on the lead's board for her to decide whether to add it to Documents. Should it be?

### Release 1B, pull request 3 of 3: My work (19 October)

These do not block the pull request, which is off for every organisation, but each should be answered before the switch is turned on for a real client.

1. **The lead's note for a person is not on that person's own My work yet: it waits for Hafsah.** The spec puts "the lead's note for this person (from People)" under Coaching, and the B7 pictures show it to the person ("Grace’s note for you"). References and resources says People is "Never shown to the person", and decision 32 keeps a lead's private notes about a person away from that person. A privacy rule changes only on her word, so the lead reads her own note on the person's page ("Your note for Mercy") and the person does not, held off by one line, `THE_LEADS_NOTE_SHOWS_ON_THEIR_OWN_MY_WORK`, which is off. Should the person read the lead's "Help them with" line on their own My work?
2. **Two behaviours cannot yet be read as fully as the spec asks.** Handling blockers counts blockers raised and how many say what was tried first (the record keeps what was tried, not who cleared a blocker or how long it was felt before it was raised). Working on the right things reads Needs work only from a customer who has stopped answering and is still being chased, or a confirmed pattern about busy work; nothing yet reads lead fit or the team's own "stop after three calls" rule, so it never reads Strength, and reads "Not enough yet" otherwise. Helping your team reads Strength from colleagues' credit and never Needs work. Build these readings, or keep them as they are?
3. **Two "Keep doing" lines are ours.** The pictures have no Keep doing line for Handling blockers or Working on the right things, so "Trying one thing yourself before you raise a blocker." and "Spending your time where it counts." were written from the spec's strength lines. Keep them, or give the words?
4. **Your reports, one line each.** A person's own report has no one-line summary stored, so each line is the person's own first sentence from that check-in, in quotes. Is that right, or should each report get a one-line summary?


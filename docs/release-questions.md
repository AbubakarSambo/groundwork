# The release questions

Written on 1 October 2026, on branch `wip/plain-reports`, for the person who deploys Groundwork and owns its infrastructure. Each question says why it matters and what we would do for each answer. How the release itself runs is in `docs/deploy.md`.

Nothing here has been done. Nothing was pushed, deployed or changed on any hosted database to write it.

---

## Part 1. Questions for the person who deploys

### 1. What state are the hosted databases in, against these migrations?

This branch adds 67 migrations after `20260923140000_what_we_have_so_far`, the last one on the remote `main` (the full list is in `docs/deploy.md`, section 2).

**Why it matters.** The API applies every waiting migration by itself when it starts (`prisma migrate deploy` in `api/railway.toml`). If a hosted database is not at `20260923140000_what_we_have_so_far`, or has a migration marked as failed, the API will not start after the release.

**Please tell us,** for the preview database and for production: the last row in `_prisma_migrations`, and whether any row has no `finished_at`.

| Answer | What we would do |
| --- | --- |
| Both are at `20260923140000_what_we_have_so_far`, with nothing failed. | Go ahead as written. |
| One is behind. | Release the remote `main` to it first, so it catches up on its own, then this. |
| One has a failed row. | Find out which and why before anything else. Nothing on this branch fixes it. |
| One already has some of the 67 (for example, somebody applied them by hand). | Compare the rows by name. Prisma skips what is recorded. A file that changed after it was applied (`20260923200000_reopen_every_check_in_that_ran_out_of_time`, which is now empty) would need checking by hand, because the old version reopened check-ins. |

### 2. Is a backup taken before the migrations, and who takes it?

**Why it matters.** One migration deletes a column (`check_ins.next_commitment`), and three fill in existing rows (`pattern_detections` twice, `ground_participants` once). None of them can be undone by a later migration. And because the API migrates the database the moment it starts, the backup has to be taken before the host picks up the new code.

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

### 7. Stripe billing: what state is it in?

As far as we know, Stripe is not wired yet and there are no paying subscribers. Production refuses to start without `BILLING_ENABLED=true`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. This release adds the free trial (off by default), an invoice list for admins, and a seat count that leaves guests out.

**Why it matters.** The free trial, once switched on, stops the free plan for organisations created after that moment. If it were switched on while Stripe cannot take a payment, new teams could not start.

| Answer | What we would do |
| --- | --- |
| Stripe is not wired. | Leave the free trial off (`pricing.freeTrial` absent or `on: false`). Billing behaves exactly as today. |
| Stripe is wired, with live keys. | Still leave the free trial off at release. Switch it on later, on Hafsah's word, after one test payment. |
| Stripe is wired in test mode only. | Make sure no live key is on the preview environment, and leave the trial off. |

### 8. Background jobs: can the host run them, and once only?

This branch adds or changes these scheduled jobs (all times UTC):

| Job | When | What it does | Model calls? |
| --- | --- | --- | --- |
| Warn before a check-in runs out of time (`grounds.cron.ts`) | 02:00 daily | One email to whoever runs a check-in that is close to its end, once per check-in. | No |
| The company-wide picture (`the-company-picture.service.ts`) | 03:30 daily, and when a check-in completes | Rebuilds an organisation's picture only when its record changed. | Yes, one per change |
| Role gap notes (`the-role-gap-notes.service.ts`) | 03:45 daily, and when a check-in completes | Writes why a job nobody owns matters, only when the record changed. | Yes, one per change |
| Self-learning counts (`learning.cron.ts`) | 03:00 daily | Recounts the signals. | No |
| Reviews that fall due (`the-reviews-proposed.cron.ts`) | 06:30 daily | Proposes a review when one falls due; never starts one. | No |
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

### 10. WhatsApp: are any templates approved?

`WHATSAPP_APPROVED_TEMPLATES` is empty as far as we know, so Groundwork cannot write first to anyone on WhatsApp; the first contact has to be email. This release adds when a WhatsApp connection's webhook was verified, and nothing else that needs a template.

| Answer | What we would do |
| --- | --- |
| None approved. | Leave WhatsApp off (`whatsapp_enabled` not `true`). Nothing changes. |
| Some approved. | List them in `WHATSAPP_APPROVED_TEMPLATES` on the host, and switch WhatsApp on later, on Hafsah's word, not on release day. |

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

---

## Part 2. Hafsah's open items, and which of them block the release

These come from `docs/morning-report.md`, under "Decided for Hafsah to confirm" and "Needs Hafsah". Items that were later answered are left out.

### These block the release until Hafsah answers

| Item | Why it blocks |
| --- | --- |
| **Item 13: may the lead's setup brief be quoted into a participant's own check-in?** It is today, in three scenarios. | It is a privacy question, and the rules say a change to privacy waits for Hafsah. |
| **Item 14: in a cohort check-in where people do not see each other, should one person's circumstances reach another?** Loans does it today. | The same. |
| **A total can give a number away.** "Yours is 21, of 270 across ten people" gives a colleague's number away when only two people have one. | Still open in the report. It tightens a privacy rule, so it needs her yes. |
| **The one-off script for people's own words** (Part 1, question 12). | Without it, existing reports lose their quotation marks. |
| **Replacing `docs/decisions.md` with `docs/decisions-merged.md`.** | The engine now follows the merged file, and the protected file is out of date. Hafsah does this herself. |

### Decided since (decision 74), and no longer blocking

- **Patterns are never switched off.** While steadiness is under 8 in 10, a setting (`patterns.reach`, set to `PERSON_ONLY`) makes a pattern reach only the person it is about, with their answer box, never the lead or an admin. A platform admin widens it with `PATCH /admin/pattern-reach`.
- **Coaching is on where no setting row exists.** Hafsah confirmed this is correct.

### These are decided as the more private or the safer choice, and do not block

Each is written in full in the morning report. They can be confirmed after release without anyone reading something they should not.

1. Admins without access to a check-in do not see its contribution and coverage reads.
2. A performance plan, promotion or renewal set up by a lead who is not an admin waits for approval.
3. An admin still reads an appealed suggestion, because an admin decides appeals.
4. The lead does not get each person's own coaching note.
5. The Sales lead sees only the Sales steps of a blocker's chain.
6. The product proposes a review when one falls due, and never starts one by itself.
7. Leave, hours and spending are approved by the person's line manager, or an admin when there is none.
8. What the lead, the person and a colleague read when someone is away.
9. Rules a lead keeps for the organisation are given to check-ins as context and never quoted.
10. The learned weights of week 8b are counted and switched off.
11. Whether "confirmed because the lead has left" should also appear inside the person's own check-in.
12. A participant on a private check-in no longer gets the team's summary in the list, though the report page shows the released report with labels.
15. The person reviewed reads "Your check-in with" and the lead's name, instead of the lead's typed label.
16. Decision 17 wins over the lead's "people see each other" switch on a performance plan, promotion or renewal.
17. Targets carry only an aim or a limit, not the prototype's five kinds.
23. After a decision on a suggestion, the next one counts only what was settled after it.
24. A suggestion nobody has decided keeps the facts the person first read.
25. Verdicts are reached only on performance plans, promotions and renewals, as decision 6 says.
26. The board serves a forecast for team targets, saying plainly that it is not a promise.
27. "Lead actions" and "questions for the lead" are read by the lead, the admin who set the check-in up, and an organisation admin.
28. A guest from another organisation is not told a colleague's leave.
29. A company rule said while a setup question is waiting is taken as the answer, and not offered to be kept.
30. After setup, the lead's next question is answered as part of setup, until the screens say where Ask Groundwork was opened from.

And from the earlier "Needs Hafsah" lists, still open and not blocking:
- Switching off the old context chat. It stays on, which is safe, until Hafsah says.
- Requests 17 (f), 17 (g) and 28 (b) from the screens workspace.
- Deal stages (Contacted, Need, Pitched and so on): the engine has none, so that part of the weekly report is simply not built.
- Who may mark somebody else's to-do as done.
- Week 0's next step (the recommendation is option 2).
- The list of remaining engine work at the top of `docs/weekly-plan.md`, which was written but not committed.

# How to deploy the engine work

Written on 1 October 2026, on branch `wip/plain-reports`, and brought in line with decision 74 (the seven deploy risks) on 2 October 2026. This document only describes. Nothing was deployed, pushed or changed to write it, and no database was touched except reading the local test database.

**What decision 74 changed, in short:**
1. A backup is taken before release. It stays a release question for whoever runs the hosting.
2. Patterns are never switched off. The person it is about reads a pattern first, and whoever runs the check-in reads it after the person has had their turn. There is no setting for this any more (decision 86 reverses decision 74, item 2; section 4).
3. Coaching is on when there is no `coaching_live` row. That is correct and stays.
4. `NODE_ENV` stays a release question.
5. The word-for-word script has a safe way to run on a hosted database, only with a confirmation typed by whoever runs the release (section 5).
6. A start never overwrites a prompt somebody activated by hand (section 6).
7. The first night: no "time running out" email for anything that reached that point before the release, the per-organisation model calls are spread out, and every scheduled job runs once even with two copies of the API (section 7).

Joining this branch with the live main line stays a release step (section 1).

The questions that the person who deploys and owns the infrastructure must answer first are in `docs/release-questions.md`. This document is the "how"; that one is the "before you start".

---

## 1. What "since main" means here

The local `main` on this computer is old (11 August, pull request 130), so comparing with it would count work that is already live. Everything below is compared with the remote `main` (`origin/main`, last moved on 23 September at `f5c07d39`, pull request 317), which is the code that is deployed today.

- This branch has **2,080 commits** that the remote `main` does not have.
- The remote `main` has 43 commits that this branch does not have by their hash. All of them are either merge commits or changes that are already here under another hash, except two small fixes, and both of those are already in this branch's files in another form (the client test imports `describe`, `it` and `expect` from vitest, and the board declares `firstSnapshots` once). So **no work on the remote `main` is missing here**, but the two histories have not been joined. **Joining this branch with the live main line is a release step** for whoever runs the release (see the release questions, question 13): on a new branch, with every test and one full scenario run on the joined code before anything is released.
- No workflow file, no hosting setting file and no `api/package.json` changed since the remote `main`. `client/package.json` gained two packages.
- No migration that the remote `main` has was changed or removed on this branch. Every migration difference is a new file.

## 2. The database migrations, in the order they run

There are **73 new migrations** since the remote `main` (67 listed in the table below, and six added on 2 and 3 October, listed after it). They run in name order. The last one the remote `main` has is `20260923140000_what_we_have_so_far`; these come after it.

**Read this first: six of the 67 in the table do something to existing rows, and two of the four added on 2 October do too (see below). The rest only add new tables, new empty columns, new types or new indexes.**

| What happens to existing rows | Migration |
| --- | --- |
| **Deletes a column and anything in it.** `check_ins.next_commitment` is removed. The code never wrote to it, so it should be empty everywhere, but check it on each database before the migration runs: `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;` must say 0. | `20260924121349_a_column_nothing_ever_wrote` |
| **Backfills.** Every pattern row that has a last period gets that period written into the new list of periods it was seen in. | `20260924121524_a_gap_no_longer_discards_a_period` |
| **Backfills.** People who came in through the open link are marked as having done so, worked out from the placeholder address the link gives them, or from a typed name with no account. | `20260924175813_how_somebody_arrived` |
| **Backfills, and starts a clock on release day.** Every pattern already seen in three or more periods gets `ready_at` set to the moment the migration runs. From then, the person it is about is shown it first (decision 62). Patterns are switched on in the code, so this is the moment patterns start reaching the person they are about. Whoever runs the check-in reads one as soon as the person has answered, three days after the person was shown it, or seven days after it was ready if the person never opened a page that shows it (decision 86). | `20260928090000_the_person_sees_their_pattern_first` |
| **Adds a settings row, only if it is not there.** It writes `suggestions.thresholds` into `platform_settings` (extra support is suggested when fewer than half of a person's commitments are kept over six periods, decision 61). If the row already exists it is left alone. This switches suggestions on, on performance plans, promotions and renewals only. | `20260930110000_the_first_threshold_for_extra_support` |
| **Changes nothing, on purpose.** This file used to reopen every stalled check-in. Hafsah decided on 29 September (decision 54) that a migration does not reopen check-ins, so the file now only says `SELECT 1;`. It stays so that the order of migrations is unchanged. `docs/ready-to-deploy.md` now says the same. | `20260923200000_reopen_every_check_in_that_ran_out_of_time` |

Every migration, in order, in one sentence each:

| # | Migration | What it does | Existing rows |
| --- | --- | --- | --- |
| 1 | `20260923150000_the_opener_for_a_link_is_written_once` | Adds a column to check-ins for the opening line of an open link, written once. | Untouched |
| 2 | `20260923160000_the_ground_the_brief_asks_us_to_cover` | Adds a column to check-ins for the subjects the brief asks to cover. | Untouched |
| 3 | `20260923170000_what_a_complete_answer_holds` | Adds a column to check-ins for what a complete answer holds. | Untouched |
| 4 | `20260923190000_a_stalled_check_in_can_be_reopened` | Adds three columns to check-ins so a stalled one remembers its status and can be reopened, and a warning is sent once. | Untouched |
| 5 | `20260923200000_reopen_every_check_in_that_ran_out_of_time` | Does nothing (see above). | Untouched |
| 6 | `20260923220000_the_judgement_and_the_table` | Adds the judgement and its table to reports, and how an answer fitted to sessions. | Untouched |
| 7 | `20260924121212_a_promise_in_a_check_in_is_a_row` | Adds the session a promise was made in, and the sessions it was said again in. | Untouched |
| 8 | `20260924121349_a_column_nothing_ever_wrote` | Removes the unused `check_ins.next_commitment` column. | **Deletes a column** |
| 9 | `20260924121524_a_gap_no_longer_discards_a_period` | Adds the list of periods a pattern was seen in. | **Backfills** |
| 10 | `20260924122147_what_the_record_shows_over_time` | Adds the record over time to reports. | Untouched |
| 11 | `20260924130755_the_remit_the_lead_typed_is_kept` | Keeps the remit the lead typed for each person. | Untouched |
| 12 | `20260924172724_a_report_says_how_many_answers_it_read` | Adds how many answers a report was built from. Old reports stay empty here, and the hourly catch-up leaves them alone. | Untouched |
| 13 | `20260924175813_how_somebody_arrived` | Adds whether a person came through the open link. | **Backfills** |
| 14 | `20260925230000_the_board_reads_the_opening` | Adds the report's opening sentence for the board. | Untouched |
| 15 | `20260926200000_what_they_said_about_their_team_size` | Adds what an organisation said about its team size. | Untouched |
| 16 | `20260926210000_waiting_for_an_admin_names_them` | Adds whether a membership request came by invitation, and when the admin was last reminded. | Untouched |
| 17 | `20260926220000_asking_for_more_time` | Adds when a person asked for more time. | Untouched |
| 18 | `20260926230000_the_welcome_card_is_read` | Adds when a user saw the welcome card. | Untouched |
| 19 | `20260927000000_joining_by_email_domain` | Adds an email domain people can join an organisation by, unique per organisation. | Untouched |
| 20 | `20260927010000_the_organisation_invite_link` | Adds an organisation invite link code, and who made it. | Untouched |
| 21 | `20260927020000_who_added_this_person` | Adds who added a person to a check-in. | Untouched |
| 22 | `20260927030000_where_they_sit` | Adds a person's level, team and line manager to their membership. | Untouched |
| 23 | `20260927040000_what_a_target_assumes` | Adds what a target assumes. | Untouched |
| 24 | `20260927050000_the_reason_for_a_decision` | Adds a reason to a resolution. | Untouched |
| 25 | `20260927060000_suggestions_and_appeals` | New table for suggestions about a person, their side and appeals. | New table |
| 26 | `20260927070000_links_between_check_ins` | Adds which check-in a dependency waits on. | Untouched |
| 27 | `20260927080000_the_suites_an_organisation_has_on` | New table for which suites an organisation has switched on (all off by default). | New table |
| 28 | `20260927090000_leave_requests` | New table for leave requests. | New table |
| 29 | `20260927100000_time_sheets` | New tables for hours, approved weeks and agreed hours. | New tables |
| 30 | `20260927110000_performance_reviews` | New table for performance reviews. | New table |
| 31 | `20260927120000_when_someone_leaves` | New tables for leaving checklists, their steps and signs of strain on a team. | New tables |
| 32 | `20260927130000_the_role_map` | New tables for role interview answers and notes about gaps in roles. | New tables |
| 33 | `20260927140000_spending_and_budgets` | New tables for spending requests and team budgets. | New tables |
| 34 | `20260927150000_customers_and_deals` | New table for where a customer stands. | New table |
| 35 | `20260927160000_equipment` | New table for equipment. | New table |
| 36 | `20260927170000_whatsapp_webhook_verified` | Adds when a WhatsApp connection's webhook was verified. | Untouched |
| 37 | `20260927180000_free_trial_started` | Adds when an organisation's free trial started. | Untouched |
| 38 | `20260927180000_record_said_word_for_word` | Adds whether a record line is the person's exact words. Every existing line starts as "no" (see section 5). | Untouched, but see section 5 |
| 39 | `20260927190000_commitment_said_word_for_word` | Adds whether a commitment, and its date, are the person's exact words. Every existing one starts as "no". | Untouched, but see section 5 |
| 40 | `20260927190000_where_they_were_going` | Adds the page a person was going to when they signed up. | Untouched |
| 41 | `20260927200000_how_they_joined` | Adds how a person joined an organisation. | Untouched |
| 42 | `20260927210000_a_waiting_google_sign_up` | Adds a Google id to a sign-up that is waiting. | Untouched |
| 43 | `20260927220000_the_browser_that_chose_the_password` | Adds a hash that ties a waiting sign-up to the browser that chose the password. | Untouched |
| 44 | `20260927230000_held_for_a_seat` | Adds whether a member is held until a seat is free. | Untouched |
| 45 | `20260927235500_what_the_lead_typed_in_setup` | New table for what the lead typed in setup. | New table |
| 46 | `20260928090000_the_person_sees_their_pattern_first` | Adds when a pattern was ready, shown to the person and answered, and the answer. | **Backfills** |
| 47 | `20260928120000_a_question_asked_word_for_word` | Adds the exact question the lead confirmed, and when. | Untouched |
| 48 | `20260928130000_suggested_answers_on_a_turn` | Adds suggested answers to a conversation turn. | Untouched |
| 49 | `20260929090000_the_end_card_on_a_turn` | Adds the end card and a record draft to a conversation turn. | Untouched |
| 50 | `20260929100000_a_line_confirmed_by_who_received_it` | Adds who confirmed a record line, and when. | Untouched |
| 51 | `20260929110000_when_a_commitment_was_settled` | Adds when a commitment was settled, and in which check-in. | Untouched |
| 52 | `20260929120000_how_a_commitment_was_settled` | Adds how a commitment was settled. | Untouched |
| 53 | `20260929130000_plan_proposals` | New table for proposals drawn from a plan. | New table |
| 54 | `20260929140000_the_kind_of_work` | Adds the kind of work and its stages to a check-in, and a new table of work items. | New table |
| 55 | `20260929150000_a_decision_about_a_person` | Adds whether a target is really a decision about one person. | Untouched |
| 56 | `20260930010000_what_the_lead_made_of_a_pattern` | Adds the lead's mark on a pattern and "we talked about it", with a new type. | Untouched |
| 57 | `20260930020000_evidence_and_a_confirmed_role` | Adds where a pattern's evidence came from, and who confirmed a person's role. | Untouched |
| 58 | `20260930100000_who_confirmed_setup_in_the_leads_place` | Adds a note when an admin confirmed setup in the lead's place. | Untouched |
| 59 | `20260930110000_the_first_threshold_for_extra_support` | Writes the first threshold for extra support into the settings, if absent. | **Adds a settings row** |
| 60 | `20260930120000_a_check_in_that_runs_until_the_lead_ends_it` | Adds whether a check-in runs until the lead ends it. | Untouched |
| 61 | `20261001090000_when_a_handoff_is_due_and_where_a_blocker_started` | Adds when a handoff is due, and a new table for where a blocker started. | New table |
| 62 | `20261001120000_the_company_picture` | New table for the company-wide picture. | New table |
| 63 | `20261001150000_role_gap_notes_rest_on_a_check_in` | Adds the check-in a role gap note rests on. | Untouched |
| 64 | `20261001170000_self_learning_counts` | New table for the self-learning counts, and where each probe came from. | New table |
| 65 | `20261001180000_the_weekly_report_sentences` | New table for the weekly report, one row per week. | New table |
| 66 | `20261001190000_organisation_memory` | New table for what the organisation keeps as memory. | New table |
| 67 | `20261001200000_a_target_is_an_aim_or_a_limit` | Adds whether a target is an aim or a limit, with a new type. | Untouched |

**Added on 2 October, after the table above was written:**

| # | Migration | What it does | Existing rows |
| --- | --- | --- | --- |
| 68 | `20261002100000_a_suggestion_says_when_the_person_caught_up` | Adds when a person caught up, on a suggestion. | Untouched |
| 69 | `20261002120000_five_kinds_of_target` | Adds three kinds of target (rate, deadline, zero) and a due date on a target. | Untouched |
| 70 | `20261002140000_each_sessions_picture_is_released_on_its_own` | Adds which sessions' team pictures are released on a report, and fills it in for existing reports from their completed sessions. | **Fills a new column on existing reports** |
| 71 | `20261002160000_whatsapp_is_a_paid_add_on` | Decision 78. Adds the WhatsApp add-on's monthly price, its cached Stripe price and the monthly WhatsApp limit on each plan, and writes the prices and limits; adds whether an organisation has turned WhatsApp on and the Stripe line that charges it; adds a new table counting each organisation's WhatsApp messages per calendar month; and writes the free trial's setting as one month, leaving its switch as it is (off unless somebody turned it on). | **Writes values into `pricing_plans` and the `pricing.freeTrial` settings row** |
| 72 | `20261003090000_a_request_asked_about_on_whatsapp_survives_a_restart` | Decision 82, item 2. Adds three empty columns to WhatsApp threads for a leave, hours or spending request waiting for the person's yes or no (its kind, its words and when it was asked), and an index on when it was asked. It was held in the API's memory, so a restart or a second copy lost it. | Untouched |
| 73 | `20261003120000_a_request_passes_through_approval_steps` | Decision 85, build step 4. Adds to each leave request, request to spend and week of hours the approval step it is on, how far down that step's list it has been passed on, since when it has waited there, and who approved each step so far, all with defaults, so every request already kept reads as step one, never passed on. On a week of hours, the approved total, who approved it and when may now be empty while the week waits at a later step. | **Allows three existing columns of `time_weeks` to be empty; no value is changed** |

The prices and limits migration 71 writes, all editable afterwards at Admin, System, Pricing (`PATCH /admin/pricing/:plan` with `whatsappAddOnCents` and `whatsappMonthlyLimit`):

| Plan | Plan price | WhatsApp add-on, a month | WhatsApp messages a month |
| --- | --- | --- | --- |
| Starter | $25 | $20 (2,000 cents) | 500 |
| Small Team | $90 | $72 (7,200 cents) | 2,000 |
| Growth | $400 | $320 (32,000 cents) | 10,000 |
| Business | $900 | $720 (72,000 cents) | 25,000 |
| Scale | $1,650 | $1,320 (132,000 cents) | 50,000 |
| Enterprise | none | none | no limit |

The limits are a proposal, used until Hafsah answers (see the morning report). Migration 71 creates nothing in Stripe. **The Stripe prices for the add-on are created in Stripe test mode only, until Hafsah says otherwise:** one is created the first time an organisation's add-on has to be charged on a plan whose add-on price has none cached, exactly as plan prices are, and a changed add-on price clears the cached one. Do not put a live Stripe key on any environment for this.

Things worth knowing about how they run:
- Columns added with a fixed default (`false`, an empty list) do not rewrite the table on Postgres 11 or later, so none of these should lock a table for long.
- The new unique indexes on existing tables (`organizations.join_domain`, `organizations.invite_link_code`) are on new columns that start empty, so they cannot fail on existing data.
- Two pairs of migrations share a timestamp (`20260927180000_*` and `20260927190000_*`). Prisma runs them in full name order, which is the order above.
- The local test database (`gw_pw9_1786222102`) has every one of them applied, up to `20261003120000_a_request_passes_through_approval_steps`.

## 3. Settings and environment variables

**Two new environment variables are read by the API since the remote `main`, and neither is a secret.** Both are optional: the API starts and works without them. The client reads the same names as before. (The client now also reads `DEV`, which Vite sets itself.)

| Name | What it is | Is it a secret? | Without it |
| --- | --- | --- | --- |
| `PUBLIC_API_URL` | The API's public address, without `/api/v1`, for example `https://api.myground.work`. The Connections page builds the WhatsApp callback address from it: `<PUBLIC_API_URL>/api/v1/webhooks/whatsapp/<organisation id>`, which an organisation's admin pastes into Meta. | No. It is an address anybody can see. | The page says the full callback address will be known once Groundwork is hosted, and gives the part after the address. |
| `WHATSAPP_DISPLAY_NUMBER` | Groundwork's own WhatsApp number as people read it, for example `+44 7700 900123`. Shown on the Connections page to an organisation that uses Groundwork's number rather than its own. Display only: sending still uses `WHATSAPP_PHONE_NUMBER_ID`. | No. It is the number people reply to. | The page says "Groundwork's WhatsApp number" without a number. |

Neither may hold a token, a key or anything from `.env` that is a secret. The WhatsApp access token, app secret and verify token are unchanged and are never served to anybody.

Two things about existing variables did change and matter at release:

| Name | What changed | Works without it? |
| --- | --- | --- |
| `NODE_ENV` | The API now listens only on 127.0.0.1 when `NODE_ENV` is exactly `development`. With any other value, or none, it listens on every address, as before. | Yes, unless a hosted environment sets it to `development`, in which case the hosted API would stop answering. See the release questions. |
| `GEMINI_LOCATION` | Unchanged in the code (default `us-central1`). Every local run this week set it to `global`, only on the commands started here, because the regional address timed out from this Mac. | The product needs the model. Which address the hosted API uses is a release question. |

For reference, the production start-up check (unchanged since the remote `main`) refuses to start with `NODE_ENV=production` unless these are set: `JWT_SECRET`, `CORS_ORIGINS`, `DATABASE_URL`, `BILLING_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `EMAIL_SENDS_FOR_REAL=true` and a real `RESEND_API_KEY`.

**New settings rows in `platform_settings`:**

| Key | Where it comes from | What it does | Works without it? |
| --- | --- | --- | --- |
| `release.time_running_out_warnings_from` | Written once by the first start of this version (decision 74, item 7). Never changed after. | The moment of the release. A check-in already in its last week, or past its end, at that moment gets no "time running out" email. | Yes. If it is missing when the warning job runs, the job writes it then. |
| `job.<name>.ran_for`, one per scheduled job | Written by each daily, weekly or hourly job when it runs (decision 74, item 7). | The time slot the job last ran for, so a second copy of the API does not run it again for the same night, week or hour. One row per job, overwritten each time. | Yes. A missing row is written by the first run. |
| `suggestions.thresholds` | Written by migration 59 if absent; an admin can change it at Admin. | Sets when extra support is suggested about a person on a performance plan, promotion or renewal. | Yes. Without the row, no suggestion is ever reached. |
| `pricing.freeTrial` | Written by migration 71 as `{"on": false, "teamsUnder": 20, "months": 1}` if absent; if present, only its months are set to 1. Switched on by an admin at Admin, System, Pricing. | Switches on the free trial for teams under 20 people for one month (decision 78), and stops the free plan for organisations created after that moment. The same switch starts decision 78's WhatsApp rules: after its trial, an organisation sends WhatsApp only with the paid add-on turned on, and is charged for it. | Yes. Without the row, or with `on: false`, the trial is off, nothing about WhatsApp is held or charged, and billing is exactly as today. |
| `job.whatsapp-add-on-lines.ran_for` | Written by the nightly WhatsApp add-on job (01:00 UTC). | The night the job last ran, so it runs once across copies. | Yes. |

**A changed default for an existing settings row:**

| Key | Before | Now |
| --- | --- | --- |
| `coaching_live` | A missing row meant coaching was **off**. | A missing row means coaching is **on** (decision 57, item 6). Only a row set to `false` turns it off. If a database has no row, coaching reaches live check-ins from the moment this release starts. |

`SETTING_DEFAULTS` (the back office settings in `api/src/modules/ops/ops-settings.service.ts`) did not change since the remote `main`.

## 4. What is switched on and off at release, and what must stay off

| Switch | Where | State at release | What to do |
| --- | --- | --- | --- |
| Learned weights (week 8b) | Code: `APPLY_LEARNED_WEIGHTS` in `api/src/modules/learning/a-suggested-weight.ts` | **Off.** The counts are kept and a weight is suggested, and nothing uses it. | Must stay off until a scenario run proves the weights and Hafsah agrees. Switching it on is a code change, not a setting. |
| Patterns served to people | Code: `PATTERNS_ARE_SERVED` in `api/src/modules/patterns/patterns-are-served.ts` | **On, and never switched off** (decisions 52, 55 and 74). Detection, storage, the periods, coaching for the person and the probes all run. | Nothing. It stays on. |
| Who reads a pattern | Code only, in `api/src/modules/patterns/who-reads-a-pattern.ts`. There is no setting and no settings row any more (decision 86). A `patterns.reach` row left in a database is not read. | The person it is about reads it first, with their answer box. Whoever runs the check-in, and the admin who set it up for them, read it after the person has had their turn: as soon as the person answers, three days after the person was shown it, or seven days after it was ready. | Nothing to set. |
| Deleting invented words from questions | Code: `DELETES_WHAT_IT_FINDS` in `api/src/modules/conversation/nothing-invented-reaches-them.ts` | **Off** (it logs only, decided 17 September). | Stays off. |
| The old context chat | No separate switch; it is part of the check-in page. | **On**, and must stay on. Hafsah decided it stays until the screens workspace confirms Ask Groundwork's screens do everything live. | Do nothing. Do not set `CONTEXT_ENABLED=false`, which would switch off the whole context feature, not only the old chat. |
| Coaching in live check-ins | Settings row `coaching_live` | **On** if the row is missing (see section 3). | Decide before release whether production has the row, and what it says. |
| Suggestions about a person | Settings row `suggestions.thresholds` | **On**, on performance plans, promotions and renewals only, from migration 59. | Nothing, unless Hafsah wants them held back at release. |
| Free trial | Settings row `pricing.freeTrial` | **Off**, one month long. | Stays off until Stripe billing is wired and tested, and Hafsah switches it on. |
| WhatsApp as a paid add-on (decision 78) | The same `pricing.freeTrial` switch; prices and limits in `pricing_plans`; each organisation's choice in `organizations.whatsapp_add_on_on` | **Not charging and not holding anything** while the trial is off. The monthly WhatsApp limit for each plan applies from release. | Nothing at release. The add-on's Stripe prices are created in test mode only until Hafsah says otherwise. |
| WhatsApp | Settings row `whatsapp_enabled`, and `WHATSAPP_APPROVED_TEMPLATES` | Unchanged; off unless someone switched it on. | Stays off until Meta approves the templates. Groundwork cannot write first on WhatsApp until then. |
| Suites (leave, hours, spending, reviews, leaving, role map, customers, equipment) | Table `organization_suites`, one row per organisation and suite | **Off** for every organisation until an admin switches a suite on. | Nothing. Each organisation chooses. |
| Real emails | `EMAIL_SENDS_FOR_REAL` | Production must say `true`; anything else must not. | Unchanged. |

**The order to switch things on, after the release is up and checked:**
1. Release with the states above. Do not change any switch on the same day as the migrations.
2. Run the checks in section 7.
3. Patterns reach the person first, then whoever runs the check-in, from release. There is nothing to set (decision 86).
4. Coaching is on where there is no `coaching_live` row. That is correct, and stays (decision 74, item 3).
5. WhatsApp, only after the templates are approved.
6. The free trial, only after Stripe is wired and tested.
7. The learned weights, last, only after a scenario run and Hafsah's yes.

## 5. Scripts that must run, and scripts that must never run in production

**Must run once on each database after the migrations: marking which record lines are people's own words.** After migrations 38 and 39, every existing record line and commitment is marked "not word for word". Until they are marked, no report can quote any of them: existing reports lose their quotation marks and some quoted sentences are dropped. New check-ins are marked as they are written, so only old data is affected. The script is `api/journey/stamp-said-word-for-word.ts`. It reads each person's own turns and sets the mark; it changes no words.

**How to run it (decision 74, item 5).** Only whoever runs the release runs it, once on each database, right after the migrations:

1. **A dry run first.** `DATABASE_URL=<the hosted database> npx ts-node -T journey/stamp-said-word-for-word.ts --hosted-database`. It reads, prints how many record lines and commitments would change, and writes nothing.
2. **Then the run that writes.** The same command with `--hosted-database --write`. It prints the same counts, then asks for the database's host name to be typed back. It writes only when the typed name is exactly the host in `DATABASE_URL`. A different name, an empty answer, or no keyboard to answer from (a pipe or a scheduled job) writes nothing.

Without `--hosted-database` it refuses any database that is not on the machine it runs on, and reads nothing. On a database on the same machine it writes by default, as it always has, and `--dry-run` only reads. It writes only the marks that change. A dry run on the local test database read 42,495 record lines and 1,626 commitments and would change none. The engine work never runs it on anything but a local database.

**Must run once on each database after the migrations: bringing the checkability read up to date (request 103).** Sessions read before 29 September keep an older read of how checkable each person's own answers were, which misses a date, a number or a document that was said, and who they were waiting on. Until the script runs, the person's Done page and session report undercount ("One date, number or document. Groundwork did not pick this up this time."). The script is `api/journey/bring-the-checkability-read-up-to-date.ts`. It writes only `specificityDimensions`, the person's own read, which is served to them alone; it only raises a part of the read and never lowers one; it never changes the overall level or anybody's words.

**How to run it (decision 74, item 5, the same as the word-for-word script).** Only whoever runs the release runs it, once on each database, after the migrations, and only with their explicit confirmation:

1. **A dry run first.** `DATABASE_URL=<the hosted database> npx ts-node -T journey/bring-the-checkability-read-up-to-date.ts --hosted-database`. It reads, prints how many check-ins would be raised and in which part, and writes nothing.
2. **Then the run that writes.** The same command with `--hosted-database --write`. It prints the same counts, then asks for the database's host name to be typed back, and writes only when the typed name is exactly the host in `DATABASE_URL`. Anything else writes nothing.

Without `--hosted-database` it refuses any database that is not on the machine it runs on. On the local test database a dry run read 6,325 check-ins and found 4,506 to raise; after the write, a second dry run found none left. The engine work never runs it on anything but a local database.

**Must run once on each database after the migrations: bringing each check-in's record up to today's rules (request 117).** Some rows were written before a fix to how the engine writes them, and nothing rewrites a stored row when a board is opened (decision 7). So "Sales team, Q3" still read "12 now, up from 0" and "Met" for an aim nobody had reached, one aim as three targets, the team's aim with no number, "You are waiting on themselves to approve ...", and two deals nobody was asked about. The script is `api/journey/bring-a-check-in-up-to-date.ts`. It reads each check-in's stored rows again under the rules the engine now writes by, and changes only those rows: a wait on oneself is taken off; a count read off a line that only said the aim goes back; the team's aim keeps the count its own name aims at ("Sign 12 shops ..."); the team's number said again as a target of its own is taken off, and its day kept on the team's aim; a person's own aim keeps its day apart from its name; a deal added on the board that somebody then said was theirs gets that claim put to the lead, who answers it on her board (decision 76, item 3). It asks nothing of anybody, calls no model, and never changes anybody's words. What only the model reads (a number somebody reported, which wait a person meant, the written report's sentences) is read again when the next check-in comes in.

**How to run it (decision 74, item 5, the same as the word-for-word script).** Only whoever runs the release runs it, once on each database, after the migrations and after the two scripts above, and only with their explicit confirmation:

1. **A dry run first.** `DATABASE_URL=<the hosted database> npx ts-node -T journey/bring-a-check-in-up-to-date.ts --hosted-database`. It reads, prints each change in a sentence ("Sales team, Q3: the target "They want us to sign 12 shops by 20 December" is the team's aim "Sign 12 shops for kitchen appliances in Nairobi" said again. It would be taken off."), lists what it leaves for the lead, and writes nothing. Add `--check-in <id>` to read one check-in only.
2. **Then the run that writes.** The same command with `--hosted-database --write`. It prints the same, then asks for the database's host name to be typed back, and writes only when the typed name is exactly the host in `DATABASE_URL`. Anything else writes nothing.

Without `--hosted-database` it refuses any database that is not on the machine it runs on. On the local test database a dry run read 1,589 check-ins and found 99 things to change (4 waits on oneself, 6 counts that were the aim, 8 team aims that keep the number in their name, 81 targets that are the team's number said again) and 6 left for the lead; it wrote nothing. The engine work never runs it on anything but a local database. The screens workspace brings its own database up to date the same way on its own machine: the dry run first, then the run without `--dry-run`.

**Must never run on a hosted database:**

| Script | Why not |
| --- | --- |
| Everything else in `api/journey/` (for example `all-24/run.ts`, `all-24/refresh.ts`, `the-suite/run.ts`, `context-chat-equivalence.ts`, `the-four-live-checks.ts`, `memory-requests-and-being-away-live.ts`, `every-line-as-served-now.ts`, `the-detector-read-twice.ts`, `pattern-steadiness.ts`) | They create test organisations, people and check-ins, make many model calls, and some delete what they made. They are the local scenario runs. |
| `api/setup-runs.ts`, `api/audit-seed.ts`, `api/audit-ground.ts` | Local test setup and audits. |
| `api/prisma/seed.ts` (`npm run prisma:seed`) | Makes a demo organisation and writes prompt versions. Not needed: the API writes the prompts itself on start (section 6). |
| `api/prisma/seed-ops.ts` (`npm run seed:ops`) and `api/prisma/seed-contributor-codes.ts` | They seed the back office and contributor codes. Unchanged since the remote `main`; run them only if the infrastructure owner already does. |
| `tools/score_run.py` and the `.py` files in `api/journey/` | They read local run files only. |

`prisma migrate deploy` does not run any seed.

## 6. The prompt versions a deploy will create or activate

**On every start, the API adds the file's words for each key, and activates them only where nobody activated a version by hand** (`onModuleInit` in `api/src/modules/prompts/prompts.service.ts`, from `SEED_PROMPTS` in `api/src/modules/conversation/prompt-library.ts`, decision 74, item 6). For each key: if the active version already matches the file, nothing happens. Otherwise the file's words are kept as a version (an older version with the same words is reused; if there is none, a new one is made with the summary "Seeded on deploy"). That version is made active only when the key has no active version, or when the active version is the seeding's own. History is kept.

**Which active versions count as the seeding's own.** `prompt_versions.activated_by` now records who activated a version: "seeded on start" when a start did it, and the platform admin's user id when it was done through `/prompts`. A version activated before this change has an empty `activated_by`; it counts as the seeding's own only when the seeding made it (summary "Seeded on deploy", or version 1 with no summary, as `prisma/seed.ts` writes it). Anything else stays active, and the start writes a sentence in its log naming the key and the version it kept.

There are 56 keys on this branch against 52 on the remote `main`. On a database that matches the remote `main`, the first start will:

- **Create and activate the first version of 4 new keys:** `blocker_trace`, `company_picture`, `customer_standing` and `think_it_through`.
- **Create and activate a new version of 23 changed keys:** `system`, `report_synthesis`, and 21 scenario packs: `contract_renewal`, `crisis_alignment`, `drift`, `new_advisor`, `new_cofounder`, `new_hire`, `new_manager`, `new_project`, `realign_team` and `role_handover` (each for both the lead and the participant), and `recognition` for the lead.
- **Leave the other 29 keys as they are.**

Two things to know:
- **A version activated by hand in production through `/prompts` stays active.** The file's words wait beside it as an inactive version, and whoever runs the release decides which to use. The one case a start cannot tell apart: before this release, nothing recorded who activated a version, so a hand re-activation of an older "Seeded on deploy" version looks like the seeding's own and is replaced. Release question 11 asks about exactly that.
- `docs/ready-to-deploy.md` says the scenario packs "run from the database, not from the files" and are switched on by hand (decision 20). The code does not work that way: the packs are among the keys written on every start. The release questions ask which is meant.

**How to check which version runs.** Each report records the version of `report_synthesis` that wrote it in `reports.prompt_version_id`. After deploy, and after the first new report:

```sql
-- Which version of each key is active, and since when.
SELECT key, version, activated_at, summary FROM prompt_versions WHERE is_active ORDER BY key;

-- Which version wrote the reports updated since the release.
SELECT pv.key, pv.version, count(*)
FROM reports r JOIN prompt_versions pv ON pv.id = r.prompt_version_id
WHERE r.updated_at > '<release time>'
GROUP BY 1, 2;
```

Every report updated after the release should name the newest `report_synthesis` version. On the local test database, the newest is `report_synthesis` version 7 and `system` version 44 (active from 09:28 on 1 October, local time). On a hosted database the numbers will be different, because they count that database's own history; what matters is that the active version's words match the file, and that new reports name it. The new tables that the model writes (suggestions, team strain signs, role answers and role gap notes, customer standings, blocker traces, the company picture) also keep a `prompt_version_id`.

## 7. The checks to run after deploy

**Before any person reads anything:**
1. `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 75;` shows all 72 new migrations finished, and none failed.
2. The API answers `/health`.
3. The active prompt versions match section 6.
4. The script in section 5 has run, and a report built after it shows quotation marks around people's words again.
5. `SELECT key, value FROM platform_settings WHERE key IN ('coaching_live', 'suggestions.thresholds', 'pricing.freeTrial', 'whatsapp_enabled');` shows what was agreed in section 4, and `pricing.freeTrial` says `"months": 1` and `"on": false`.
6. `SELECT plan, whatsapp_add_on_cents, whatsapp_monthly_limit, whatsapp_add_on_stripe_price_id FROM pricing_plans ORDER BY plan;` shows the prices and limits in section 2, and no Stripe price id yet.

**Then read what each person reads, on one test organisation made for the purpose** (never a customer's). Use a team check-in with at least three people, and one performance plan.

| Reader | What to open | What they should read, and never read |
| --- | --- | --- |
| Lead | Today, the check-in's board, the session report and the weekly report | Plain full sentences with people's names. While a report is still being written: "The report is being written with what Amani and Baraka said. It will include everyone in a few minutes." (with the real names). A target reads as a sentence, for example "Chidi Eze is keeping fuel spending to no more than 12,000." Never a rating of a person's answers, never a label such as "at risk", never a raw seven-digit number, never "All four people have answered." while the report is still being written. |
| Participant | Their own check-in, the board, their own report and the weekly report | Their own parts and the team's counts. Never a colleague's hidden target or pattern, never the lead's private notes or judgement, never a goal the lead has not told them about. On a performance plan, the person reviewed reads "Your check-in with" and the lead's first name, and never a colleague's name; where a colleague disagreed they read "A colleague described this differently." |
| Admin who is not in the check-in | The organisation's admin pages and the check-in list | They can manage the organisation, but cannot open a performance plan, promotion or renewal they were not given access to, and cannot read the contribution and coverage reads of a check-in they cannot see. |
| Guest from another organisation | Their own check-in and Ask Groundwork | Only their own check-in. Never a colleague's leave dates. Asking about the organisation gets "You are a guest here from another organisation, so Ask Groundwork can only answer questions about your own check-in. It cannot tell you about this organisation, its people or its other check-ins." |

**Watch for the first night (decision 74, item 7).**
- **The warning before a check-in runs out of time** goes only to check-ins that reach their last week after the release. The first start writes the release moment (`release.time_running_out_warnings_from`); a check-in already in its last week, or past its end, at that moment gets no email and no stamp, so it is not stalled either: it stays open until its lead ends or extends it. The start's log says from which moment warnings go out.
- **The company picture and the role gap notes** build one organisation at a time, and wait 20 seconds after each organisation that made a model call or wrote a row, so the first night's calls are spread out rather than made back to back.
- **Every daily, weekly and hourly job runs once for its time**, even with two copies of the API: each claims its slot in `job.<name>.ran_for` first, and a copy that finds the slot claimed does nothing. If the claim cannot be made, the job does not run that time, so nothing is sent twice. The jobs that run every 15 or 30 minutes (closing warnings, sessions ready, held mail, closing stale check-ins) and every minute (webhook delivery) keep their advisory lock only, and the Stripe retry is unchanged.
- Read the logs the next morning.

## 8. What each workflow and hosting setting would do when this branch reaches `main`

None of these files were changed. This is what they say.

| File | What triggers it | What it would do |
| --- | --- | --- |
| `api/railway.toml` | Whatever branch the API's hosting project is connected to. That is set in the hosting dashboard, not in the repository. | On every start: marks one old failed migration (`20260627000000_contributor_code_system`) as rolled back, then **runs `prisma migrate deploy`, which applies all 73 migrations with no backup step**, and then starts the API. If a migration fails, the API does not start, and the host retries three times. |
| `client/vercel.json` | A push to `main` or to the other long-lived branch, through the hosting provider's own link to the repository. | Builds and publishes the screens. Every other branch is switched off. |
| `.github/workflows/staging-deploy.yml` | A push to the other long-lived branch that changes `client/`. | Builds the screens with the hosting provider's command-line tool and points the fixed preview address at the new build. Not triggered by `main`. |
| `.github/workflows/preview-deploy.yml` | A pull request that changes `client/`. | Builds a preview of the screens and comments the address on the pull request. |
| `.github/workflows/tests.yml` | A pull request that changes `api/` or `client/`, and a push to `main` or the other long-lived branch. | Runs the API's type check and tests, applies every migration to an empty Postgres and checks the schema and migrations agree, and runs the client's type check and tests. It deploys nothing. |
| `.github/workflows/persona-gate.yml` | Paused; only by hand. | Starts the stack against an empty test database and runs the persona tests with the model. Deploys nothing. |
| `.github/workflows/persona-tests.yml` | Paused (it used to run on a push to `main`); only by hand. | The same, more widely. Deploys nothing. |
| `.github/workflows/overnight.yml` | Paused (it used to run every night); only by hand. | The long persona run. Deploys nothing. |

There is no `render.yaml`, `fly.toml`, `railway.json`, `Procfile` or `app.json` in the repository.

**So the one step that changes a hosted database is the API starting on its host.** Whoever releases must take the backup before the API host picks up the new code, not after.

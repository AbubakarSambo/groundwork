# How to deploy the engine work

> **Rollback, always (decision 90):** restore the database backup and the old code together, never the code alone. Migration 8 dropped a column, so the old code cannot read the new database.

Written on 1 October 2026, on branch `wip/plain-reports`, brought in line with decision 74 (the seven deploy risks) on 2 October 2026, and checked again on 4 October 2026 against every migration, every one-off script, every hidden-at-release switch and decisions 78 and 82 to 91. This document only describes. Nothing was deployed, pushed or changed to write it, and no database was touched except reading the local test database.

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

## The release night, in order

This is the one list to follow. Each step that needs whoever runs the release to confirm it says so. The sections below explain each step. Nothing on this list has been run on a hosted database.

1. **Before the night:** run the two checks of existing clients, `api/journey/existing-clients-compare.ts` and then `api/journey/existing-clients-check.ts`, on a copy of the live data, as `docs/existing-users.md` sections 5 and 7 say. Read every FAULT, LEAK, ASK, WHERE and SCHEDULE line. Release only when each one is explained. This needs access from Hafsah and has not been done.
2. **Answer the release questions** in `docs/release-questions.md`, Part 1, especially the backup (question 2) and how the two histories are joined (question 13).
3. **Join this branch with the live main line** on a new branch, and run every test and one full scenario run on the joined code (section 1). Needs Hafsah.
4. **Take the database backup** and write down the time. Run `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;` on each database. It must say 0.
5. **Set the hosted settings** the API needs (section 3, and for WhatsApp `docs/whatsapp-settings.md`). Leave the free trial off, leave `whatsapp_enabled` off, and leave all the hidden-at-release switches at their defaults.
6. **Release the API.** On its start it runs `prisma migrate deploy`, which applies all 82 new migrations (section 2), and then it adds the prompts (section 6). If a migration fails, the API does not start. Rollback is the rule at the top of this document.
7. **Check the start** (section 7, "Before any person reads anything"): the migrations finished, `/health` answers, the active prompts match.
8. **Run the word-for-word script**, `stamp-said-word-for-word.ts`: dry run first, then with `--hosted-database --write` (section 5). Needs the explicit confirmation of whoever runs the release, by typing the database's host name.
9. **Run the checkability script**, `bring-the-checkability-read-up-to-date.ts`, the same way (section 5). Needs explicit confirmation.
10. **Run `give-each-check-in-its-kind-of-work.ts`**: dry run first, then `--hosted-database --write` (section 5). It calls the model. Needs explicit confirmation. It must run before step 11.
11. **Run `bring-a-check-in-up-to-date.ts`**: dry run first, read each sentence it prints, then `--hosted-database --write` (section 5). Needs explicit confirmation.
12. **Read what each person reads** on a test organisation, and run the other checks (section 7).
13. **Switch things on one at a time, never on the day of the migrations** (section 4): WhatsApp only after Meta has approved the templates, and the other hidden-at-release switches only when Hafsah says.
13a. **Switch billing on: the one-month free trial and the WhatsApp add-on** ("Switching billing on at release", below). First run the read-only check there. Switch on only if it returns no organisation, or Hafsah has decided what happens to each one it returns. Never by a migration, because a migration cannot look first. Needs the explicit confirmation of whoever runs the release.
14. **Read the logs the next morning** (section 7, "Watch for the first night").

---

## 1. What "since main" means here

The local `main` on this computer is old (11 August, pull request 130), so comparing with it would count work that is already live. Everything below is compared with the remote `main` (`origin/main`, last moved on 23 September at `f5c07d39`, pull request 317), which is the code that is deployed today.

- This branch has **2,080 commits** that the remote `main` does not have.
- The remote `main` has 43 commits that this branch does not have by their hash. All of them are either merge commits or changes that are already here under another hash, except two small fixes, and both of those are already in this branch's files in another form (the client test imports `describe`, `it` and `expect` from vitest, and the board declares `firstSnapshots` once). So **no work on the remote `main` is missing here**, but the two histories have not been joined. **Joining this branch with the live main line is a release step** for whoever runs the release (see the release questions, question 13): on a new branch, with every test and one full scenario run on the joined code before anything is released.
- No workflow file, no hosting setting file and no `api/package.json` changed since the remote `main`. `client/package.json` gained two packages.
- No migration that the remote `main` has was changed or removed on this branch. Every migration difference is a new file.

## 2. The database migrations, in the order they run

There are **82 new migrations** since the remote `main` (67 in the first table below, and fifteen added from 2 to 4 October, in the second). Every migration folder in `api/prisma/migrations` after `20260923140000_what_we_have_so_far` is listed once, and none is missing. They run in name order. The last one the remote `main` has is `20260923140000_what_we_have_so_far`; these come after it.

**Read this first: six of the 67 in the first table do something to existing rows, and three of the fourteen added later do too (numbers 70, 71 and 73). The rest only add new tables, new empty columns, new types or new indexes.**

| What happens to existing rows | Migration |
| --- | --- |
| **Deletes a column and anything in it.** `check_ins.next_commitment` is removed. The code never wrote to it, so it should be empty everywhere, but check it on each database before the migration runs: `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;` must say 0. | `20260924121349_a_column_nothing_ever_wrote` |
| **Backfills.** Every pattern row that has a last period gets that period written into the new list of periods it was seen in. | `20260924121524_a_gap_no_longer_discards_a_period` |
| **Backfills.** People who came in through the open link are marked as having done so, worked out from the placeholder address the link gives them, or from a typed name with no account. | `20260924175813_how_somebody_arrived` |
| **Backfills, and starts a clock on release day.** Every pattern already seen in three or more periods gets `ready_at` set to the moment the migration runs. From then, the person it is about is shown it first (decision 62). Patterns are switched on in the code, so this is the moment patterns start reaching the person they are about. Whoever runs the check-in reads one as soon as the person has answered, three days after the person was shown it, or seven days after it was ready if the person never opened a page that shows it (decision 86). | `20260928090000_the_person_sees_their_pattern_first` |
| **Adds a settings row, only if it is not there.** It writes `suggestions.thresholds` into `platform_settings` (extra support is suggested when fewer than half of a person's commitments are kept over six periods, decision 61). If the row already exists it is left alone. This switches suggestions on, on performance plans, promotions and renewals only. | `20260930110000_the_first_threshold_for_extra_support` |
| **Fills a new column on existing reports.** Each existing report gets the list of sessions whose team picture is released, worked out from its completed sessions. A participant of an existing check-in now reads only the released sessions. | `20261002140000_each_sessions_picture_is_released_on_its_own` |
| **Writes values into existing rows.** Sets the WhatsApp add-on price and monthly limit on every row of `pricing_plans`, and sets the free trial's months to 1 in the `pricing.freeTrial` row, leaving its switch as it was. | `20261002160000_whatsapp_is_a_paid_add_on` |
| **Allows three existing columns to be empty.** `time_weeks` may now have no approved total, approver or approval time while a week waits at a later step. No value is changed. | `20261003120000_a_request_passes_through_approval_steps` |
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

**Added from 2 to 4 October, after the table above was written (15 migrations, numbers 68 to 82):**

| # | Migration | What it does | Existing rows |
| --- | --- | --- | --- |
| 68 | `20261002100000_a_suggestion_says_when_the_person_caught_up` | Adds when a person caught up, on a suggestion. | Untouched |
| 69 | `20261002120000_five_kinds_of_target` | Adds three kinds of target (rate, deadline, zero) and a due date on a target. | Untouched |
| 70 | `20261002140000_each_sessions_picture_is_released_on_its_own` | Adds which sessions' team pictures are released on a report, and fills it in for existing reports from their completed sessions. | **Fills a new column on existing reports** |
| 71 | `20261002160000_whatsapp_is_a_paid_add_on` | Decision 78. Adds the WhatsApp add-on's monthly price, its cached Stripe price and the monthly WhatsApp limit on each plan, and writes the prices and limits; adds whether an organisation has turned WhatsApp on and the Stripe line that charges it; adds a new table counting each organisation's WhatsApp messages per calendar month; and writes the free trial's setting as one month, leaving its switch as it is (off unless somebody turned it on). | **Writes values into `pricing_plans` and the `pricing.freeTrial` settings row** |
| 72 | `20261003090000_a_request_asked_about_on_whatsapp_survives_a_restart` | Decision 82, item 2. Adds three empty columns to WhatsApp threads for a leave, hours or spending request waiting for the person's yes or no (its kind, its words and when it was asked), and an index on when it was asked. It was held in the API's memory, so a restart or a second copy lost it. | Untouched |
| 73 | `20261003120000_a_request_passes_through_approval_steps` | Decision 85, build step 4. Adds to each leave request, request to spend and week of hours the approval step it is on, how far down that step's list it has been passed on, since when it has waited there, and who approved each step so far, all with defaults, so every request already kept reads as step one, never passed on. On a week of hours, the approved total, who approved it and when may now be empty while the week waits at a later step. | **Allows three existing columns of `time_weeks` to be empty; no value is changed** |
| 74 | `20261003140000_one_record_of_who_did_what_on_a_suite` | Decision 85, build step 5. Adds two new, empty tables: `suite_events`, one record of who asked, was told, approved each step, declined, was passed a request, and started or decided a review, with when and references to rows only; and `suite_rule_changes`, each change of a suite's rules, of who holds each duty and of the approval steps, with who changed it, when, and from what to what. | Untouched |
| 75 | `20261003160000_a_question_about_a_request_and_a_reason_for_a_decline` | Decision 85, build step 7. Adds a new, empty table `suite_questions` for a question whoever decides a leave request asks the person, and the answer; and an empty column `decline_reason` on leave requests, for the reason given with a decline, told to the person. | Untouched |
| 76 | `20261003180000_a_question_answered_on_whatsapp_during_a_check_in` | Decision 85, build step 7. Adds one empty column to WhatsApp threads, the question about the person's own request they were already asked about ("Is this your answer to Wairimu's question about your leave?"), so a reply during a check-in is asked about once only. | Untouched |
| 77 | `20261003200000_spending_rules_categories_and_evidence` | Decision 85, build step 9. Adds two columns to requests to spend: the category it is for, when an admin has named categories, and which evidence (a receipt, a quote) the spending rules asked for. Only that it is needed; no file. Both empty on every request already kept. | Untouched |
| 78 | `20261003210000_a_question_about_spending_and_a_reason_for_a_decline` | Decision 85, build step 9. Adds an empty column `decline_reason` on requests to spend, for the reason given with a decline, told to the person. A question about a request to spend goes in the existing `suite_questions` table. | Untouched |
| 79 | `20261003220000_finance_checks_codes_and_pays_a_request_to_spend` | Decision 85, build step 10. Adds six empty columns to requests to spend for finance's part after the last approval: who checked it and when, the budget line it is paid from, the receipt or quote finance has had (only that; no file), the day it was paid and who marked it. Who did each step is also kept in the existing `suite_events`. | Untouched |
| 80 | `20261003230000_time_sheet_rules_billable_entries` | Decision 85, build step 11. Adds one empty column `billable` to hours (`time_entries`): billable or not, only when the person said so of that entry. Empty means it follows the time sheet rules for its client or project, and with no rules every hour is billable. The rules themselves are kept in the existing `organization_suites` table (a `timeRules` row), so they need no table. | Untouched |
| 81 | `20261004000000_a_review_reads_the_record_and_the_person_corrects_it` | Decision 85, build step 12. Adds two empty columns to `performance_reviews`: what Groundwork understands from the record for the review's period (`record_read`, facts with ids, written once when a review starts) and the first day of that period (`record_from`); and a new, empty table `performance_review_corrections`, each line the person marks as wrong with what they say is true, kept beside the line. Reviews already started keep no record and read as before. | Untouched |
| 82 | `20261004100000_a_check_in_remembers_it_began_at_the_anchor_link` | Anchor scenario, piece 15. Adds one empty column `started_from` to `grounds`. It is written (with the word "anchor") only when a lead saves a check-in from the anchor conversation while `release.anchorScenario` is on, which is off. Every check-in that exists keeps it empty, and nothing reads it with the switch off. | Untouched |
| 83 | `20261005200000_a_free_run_is_one_month` | Every free run is one month (Hafsah, 5 October; decision 105). Changes only the default of `free_runs.months` from 3 to 1. A free run already promised or running keeps the length it was given. No data is changed. | Untouched |
| 84 | `20261005230000_a_whatsapp_send_keeps_its_message_id` | Decision 106 item 1. Adds one empty, nullable column `provider_message_id` to `whatsapp_sends` (the id Meta gave a message Groundwork sent, so a reply to an opening notice goes to the check-in the notice was about) and an index on it. Every send that exists keeps it empty, and a send that did not go has none. Nothing else changes and no data is changed. | Untouched |
| 85 | `20261006030000_a_check_in_keeps_the_anchor_situation` | Request 166. Adds one value, `HELP_TEAM_UNDERSTAND`, to the list of situations a check-in can have (`GroundScenario`), so a check-in started from the anchor link keeps its own situation instead of being saved as a project. Nothing else changes, and no existing row is changed or rewritten. | Untouched |

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
- The local test database (`gw_pw9_1786222102`) has every one of them applied (checked on 5 October: all 82), up to `20261004100000_a_check_in_remembers_it_began_at_the_anchor_link`. Migration 83, `20261005200000_a_free_run_is_one_month`, is written and not yet applied there (its default still reads 3).

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

**One new secret that Abubakar must add before release: `SETTINGS_ENCRYPTION_KEY`.** It is the key the API uses to encrypt the WhatsApp access token, app secret and verify token that Groundwork staff save on the back-office page `/admin/whatsapp`. It is a secret: it goes only into the host's settings for the API, never into the code, a document or a chat.

| Name | What it is | Is it a secret? | Without it |
| --- | --- | --- | --- |
| `SETTINGS_ENCRYPTION_KEY` | 32 bytes written in base64 or hex, or any string of at least 32 characters. Make one on any computer with `openssl rand -base64 32` and paste the result into the API's settings on the host. Use a different key on each hosted environment, and never change it once secrets are saved: a changed key means every saved secret has to be typed in again. | Yes. | The API starts and works. The back-office WhatsApp page cannot save any secret and says so in a sentence, and WhatsApp uses the server's own `WHATSAPP_*` settings, as before. A key shorter than 32 characters is refused in the same way. |

Once it is set, and once Hafsah has saved the WhatsApp details on `/admin/whatsapp` and switched WhatsApp on, WhatsApp uses the saved details first, field by field, and the server's `WHATSAPP_*` settings only for a field nothing was saved for.

For reference, the production start-up check (unchanged since the remote `main`) refuses to start with `NODE_ENV=production` unless these are set: `JWT_SECRET`, `CORS_ORIGINS`, `DATABASE_URL`, `BILLING_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `EMAIL_SENDS_FOR_REAL=true` and a real `RESEND_API_KEY`.

**New settings rows in `platform_settings`:**

| Key | Where it comes from | What it does | Works without it? |
| --- | --- | --- | --- |
| `release.time_running_out_warnings_from` | Written once by the first start of this version (decision 74, item 7). Never changed after. | The moment of the release. A check-in already in its last week, or past its end, at that moment gets no "time running out" email. | Yes. If it is missing when the warning job runs, the job writes it then. |
| `job.<name>.ran_for`, one per scheduled job | Written by each daily, weekly or hourly job when it runs (decision 74, item 7). | The time slot the job last ran for, so a second copy of the API does not run it again for the same night, week or hour. One row per job, overwritten each time. | Yes. A missing row is written by the first run. |
| `suggestions.thresholds` | Written by migration 59 if absent; an admin can change it at Admin. | Sets when extra support is suggested about a person on a performance plan, promotion or renewal. | Yes. Without the row, no suggestion is ever reached. |
| `pricing.freeTrial` | Written by migration 71 as `{"on": false, "teamsUnder": 20, "months": 1}` if absent; if present, only its months are set to 1. Switched on by an admin at Admin, System, Pricing. | Switches on the free trial for teams under 20 people for one month (decision 78), and stops the free plan for organisations created after that moment. The same switch starts decision 78's WhatsApp rules: after its trial, an organisation sends WhatsApp only with the paid add-on turned on, and is charged for it. | Yes. Without the row, or with `on: false`, the trial is off, nothing about WhatsApp is held or charged, and billing is exactly as today. |
| `whatsapp_enabled` | Set by a platform admin in the admin area (`whatsapp.service.ts`). | The platform's WhatsApp switch. Off unless somebody switched it on. Nothing is sent by WhatsApp without it, even when the credentials are set. | Yes. Missing means off. |
| `release.boardKindsOffered`, `release.contextInAskGroundwork`, `release.planAndBillingNewParts` | Written only by hand (see "Hidden at release"). | The hidden-at-release switches. | Yes. A missing or broken row reads as the default. |
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
| Free trial | Settings row `pricing.freeTrial` | **Off** when the migrations run, one month long. | Switched on in this release by step 13a, after its check ("Switching billing on at release"). |
| WhatsApp as a paid add-on (decision 78) | The same `pricing.freeTrial` switch; prices and limits in `pricing_plans`; each organisation's choice in `organizations.whatsapp_add_on_on` | **Not charging and not holding anything** while the trial is off. The monthly WhatsApp limit for each plan applies from release. | Starts with the free trial's switch, in step 13a. Its Stripe prices are created in test mode only until Hafsah says otherwise. |
| WhatsApp, the platform's switch and the credentials | Settings row `whatsapp_enabled`; `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`; `WHATSAPP_APPROVED_TEMPLATES` (the full guide is `docs/whatsapp-settings.md`) | Off unless somebody switched it on. | Stays off until Meta approves the templates. Groundwork cannot write first on WhatsApp until then. |
| WhatsApp, each organisation's add-on | `organizations.whatsapp_add_on_on`, read by `api/src/modules/whatsapp/only-where-whatsapp-is-turned-on.ts` | Off for every organisation. | The morning reminder, the reminder before a session and the lead's daily summary go only to an organisation whose add-on is on, and only while the platform's switch is on. Existing clients get WhatsApp on the same terms as the paid client (decision 90), so each turns it on in the same way. |
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

**Must run once on each database after the migrations and before bringing each check-in's record up to date: giving each existing check-in its kind of work (decision 91, item 1).** A check-in made before the kinds of work existed has none, so it would be drawn from its situation's family alone. Decision 91 says existing check-ins move to the new boards, so each one is given the kind of work that fits it. The script is `api/journey/give-each-check-in-its-kind-of-work.ts`. It uses the one reading a new check-in gets at setup, never a second one: the same prompt, the same words (what the lead called it, said about it and is working toward) and the same check that the answer is exactly one of the eleven kinds. That reading runs from the prompt in the code, not from a stored prompt version, so this does too. The model is asked with no randomness and every answer is kept in a file (`api/journey/.kind-of-work-answers.json`, or the one named with `--cache`), so running it again costs nothing and gives the same answer. It writes only `kindOfWork` and, beside it, `kindOfWorkSetBy` set to "read"; it never changes anybody's words, schedules, sessions, status or reports, and it never reopens, restarts, stalls or emails anything (decision 54). A check-in that already has a kind keeps it, a kind the lead chose is never read over, and a check-in it cannot place confidently gets no kind, keeps the board its situation gives it, and is listed. Kinds that are hidden at release may still be given here (see "Hidden at release", item 1).

**How to run it (the same guard as the other release scripts).** Only whoever runs the release runs it, once on each database, after the migrations and before `bring-a-check-in-up-to-date.ts`, and only with their explicit confirmation:

1. **A dry run first, which is also the default.** `DATABASE_URL=<the hosted database> npx ts-node -T journey/give-each-check-in-its-kind-of-work.ts --hosted-database`. It calls the model, prints how many check-ins would be given each kind, lists the ones it cannot place (add `--list-all` for every one), and writes nothing. Add `--check-in <id>` to read one check-in only.
2. **Then the run that writes.** The same command with `--hosted-database --write`. It prints the same, then asks for the database's host name to be typed back, and writes only when the typed name is exactly the host in `DATABASE_URL`. Anything else, including no keyboard, writes nothing.

Without `--hosted-database` it refuses any database that is not on the machine it runs on, and on a database on the machine it is a dry run until `--write` is added. The engine work never runs it on anything but a local database.

**Not run on a hosted database, only on a copy of the live data:** `api/journey/existing-clients-check.ts` and `api/journey/existing-clients-compare.ts`. They only read and refuse every write. The steps are in `docs/existing-users.md` sections 5 and 7, and they are step 1 of the release night.

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

**Before the release, on this computer: does the production start command work?** Run, from `api/`:

    npm run check:production-start -- --database postgresql://you@localhost:5432/your_local_db --env .env

It builds the API exactly as production does (`nest build`) in a temporary folder, never in `api/dist`. It checks that `dist/main.js` and the embed's `embed.js` and `panel.html` are there and that there is no `dist/src`. Then it starts `node dist/main` on a spare port against the local database you give it (it refuses any other), waits for `/health` to answer "ok", reads `/embed.js`, and stops the server. It writes nothing. On 5 October every test passed while `node dist/main` could not start, because three specs imported from `journey/` and the server was built to `dist/src/main.js`. `api/src/nothing-in-src-imports-from-outside-src.spec.ts` stops that cause, and this check proves the result. On `wip/release` at 5 October it printed: "node dist/main started on port 52689, /health answered "ok", /embed.js answered 200, and the server was stopped."

**Before any person reads anything:**
1. `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 90;` shows all 82 new migrations finished, and none failed.
2. The API answers `/health`.
3. The active prompt versions match section 6.
4. The scripts in section 5 have run, and a report built after them shows quotation marks around people's words again, and an existing check-in has its kind of work.
5. `SELECT key, value FROM platform_settings WHERE key IN ('coaching_live', 'suggestions.thresholds', 'pricing.freeTrial', 'whatsapp_enabled', 'release.boardKindsOffered', 'release.contextInAskGroundwork', 'release.planAndBillingNewParts');` shows what was agreed in section 4, and `pricing.freeTrial` says `"months": 1` and `"on": false` until step 13a switches it on.
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
| `api/railway.toml` | Whatever branch the API's hosting project is connected to. That is set in the hosting dashboard, not in the repository. | On every start: marks one old failed migration (`20260627000000_contributor_code_system`) as rolled back, then **runs `prisma migrate deploy`, which applies all 82 migrations with no backup step**, and then starts the API. If a migration fails, the API does not start, and the host retries three times. |
| `client/vercel.json` | A push to `main` or to the other long-lived branch, through the hosting provider's own link to the repository. | Builds and publishes the screens. Every other branch is switched off. |
| `.github/workflows/staging-deploy.yml` | A push to the other long-lived branch that changes `client/`. | Builds the screens with the hosting provider's command-line tool and points the fixed preview address at the new build. Not triggered by `main`. |
| `.github/workflows/preview-deploy.yml` | A pull request that changes `client/`. | Builds a preview of the screens and comments the address on the pull request. |
| `.github/workflows/tests.yml` | A pull request that changes `api/` or `client/`, and a push to `main` or the other long-lived branch. | Runs the API's type check and tests, applies every migration to an empty Postgres and checks the schema and migrations agree, and runs the client's type check and tests. It deploys nothing. |
| `.github/workflows/persona-gate.yml` | Paused; only by hand. | Starts the stack against an empty test database and runs the persona tests with the model. Deploys nothing. |
| `.github/workflows/persona-tests.yml` | Paused (it used to run on a push to `main`); only by hand. | The same, more widely. Deploys nothing. |
| `.github/workflows/overnight.yml` | Paused (it used to run every night); only by hand. | The long persona run. Deploys nothing. |

There is no `render.yaml`, `fly.toml`, `railway.json`, `Procfile` or `app.json` in the repository.

**So the one step that changes a hosted database is the API starting on its host.** Whoever releases must take the backup before the API host picks up the new code, not after.

## Hidden at release

The release hides six things from anything new (the table also lists two that are on by default). It hides nothing an existing client uses today (decisions 88 and 90): every setting below reads as "hidden" when its row is missing, and a check-in or organisation that already has the thing, or already uses the old way, is unchanged. Each setting is one row in the `platform_settings` table (key, JSON value). They are read in one file, `api/src/modules/admin/what-is-hidden-at-release.ts`, and a broken row reads as the default. Hafsah turns one on by writing the row (for example in the database console, with `INSERT ... ON CONFLICT (key) DO UPDATE`), and nothing needs a deploy.

| What is hidden | Setting (key) | Default | To turn it on |
| --- | --- | --- | --- |
| Boards for kinds of work nobody uses yet | `release.boardKindsOffered`, value `{"kinds": ["sales org", ...]}` | Sales, onboarding (a new hire, a new manager, a new advisor) and project. Of the eleven kinds a board can keep records for, two are offered: "sales org" and "engineering release" (the project board's tasks and releases). The other nine are hidden until the screens workspace marks their board done. | Write the row with more of the eleven names, exactly as they are spelled in `api/src/modules/board/the-kind-of-work.ts`. |
| The back office rebuild | None. | Nothing to hide. | Nothing to do. |
| The Context tab's move to Ask Groundwork | `release.contextInAskGroundwork`, value `{"on": false}` | Off. | Write `{"on": true}`. |
| Plan and billing's new parts | `release.planAndBillingNewParts`, value `{"on": false}`; and `pricing.freeTrial`, value `{"on": false, ...}` | Both off when the migrations run. | Both are switched on together in this release, by step 13a ("Switching billing on at release"), after its check. |
| The anchor scenario (a new check-in started from the anchor link) | `release.anchorScenario`, value `{"on": false}` | Off. A missing or broken row reads as off. | Write `{"on": true}`. |
| The three WhatsApp messages for somebody who stops a check-in halfway (decision 107): one reminder to carry on after three hours of quiet, the 30-minute warning, and the message when the clock closes the session | `release.whatsappHalfwayMessages`, no row needed | **On.** A missing row reads as on, `{"on": false}` switches all three off, and a row that cannot be read reads as off. Proved on 6 October by a run that drives the real close, reminder and warning sweeps for sales, onboarding, project, a performance plan, a cohort and the anchor (`docs/run-log.md`, run 8). Only a session the person was doing on WhatsApp (a message of theirs to that check-in after it began) ever gets one; never a check-in kept in the app, never a session that began before the later of 5 October 2026 and `release.time_running_out_warnings_from` (nothing at all if that row is missing), and nothing for somebody on approved leave (reminder and warning). The sender's rules hold: STOP, "Not now", the add-on, the 24 hours and one first message a day. The 48-hour close reason could not be run live before 7 October (the session would have begun before the cut-off) and is proved in a spec. | Write `{"on": false}` to take all three away. |
| The offer to ask for leave or spending from inside a check-in (anchor pieces 26 and 27) | `release.requestOfferInTheCheckIn`, no row needed | On. A missing or broken row reads as on, and `{"on": false}` switches it off. It is made only in a check-in started from the anchor link, with `release.anchorScenario` on, so nothing outside the anchor changes. Its yes opens the request's own form, which can send now (request 165: `POST /suites/leave/requests` and `POST /suites/spend/requests`). Leave and spending through Ask Groundwork and WhatsApp are unchanged. | Write `{"on": false}` to take the offer away. |

**1. Boards for kinds of work nobody uses yet.** The eleven kinds of work (sales org, engineering release, support desk, and so on) are new in this release. No existing check-in has one until that script runs, because the column did not exist. A new check-in can be given only an offered kind: the lead choosing one (`PATCH /grounds/:id/kind-of-work`) is refused with "Groundwork does not offer that kind of work yet. Choose one of these: sales org, engineering release.", and the read at setup never picks one that is not offered. The one exception is the script that gives existing check-ins their kind of work (`api/journey/give-each-check-in-its-kind-of-work.ts`, decision 91, item 1): decision 91 says existing check-ins move to the new boards, so it may give an existing check-in any of the eleven kinds, offered or not. It is a release step run once by whoever runs the release, never by the read at setup or by a lead. A check-in that already holds a kind that is not offered keeps it: the read at setup leaves it alone, the lead can save it again, its board and records are served exactly as before. The board now also carries `kindsOffered` so the dialog can list only those (a request to the screens workspace is in `docs/answers-from-engine.md`, because the dialog is in `pages/board/`, which the engine workspace does not edit). The onboarding and project boards are chosen by the situation (a new hire, a new manager, a new advisor, a new project), not by a kind, so a new check-in of those situations gets its board with or without a kind, and they are not hidden. The project board's task and release grid is the engineering kind's records, which is why that kind is offered (decision 91, item 3). Tests: `api/src/modules/admin/hidden-at-release.spec.ts`.

**2. The back office rebuild.** Checked, and not built. Compared with the live main line, `client/src/pages/admin` and `client/src/pages/ops` changed by a page background colour, a sign-out address and one unused line, and `api/src/modules/back-office` did not change at all. No new back office page or route exists, so there is nothing to hide and no setting was added (a setting that hides nothing would only suggest something is held back). `/admin` and `/ops` stay exactly as they are for Groundwork's staff.

**3. The Context tab's move to Ask Groundwork.** The old context chat on the check-in page is untouched and works as on the live main line. What is hidden is the new path into the same conversation through Ask Groundwork: the four lanes that add context, a context line, a lead's note and questions for people, and the "opened from check-in setup" door. While the setting is off, those messages are answered as any other message Ask Groundwork cannot place, and the old chat is not called. Ask Groundwork's other lanes (to-dos, documents, objectives, leave and the rest) are unchanged. Tests: the same spec, plus the three specs that prove the lanes themselves (`items-8-9-17-through-ask-groundwork.spec.ts`, `add-context-is-the-context-chat.spec.ts`, `decision-50-task-b-through-ask-groundwork.spec.ts`), which now turn the setting on in their stand-in database, because they test the new path. They were changed for that reason only.

**4. Plan and billing's new parts.** Both switches are off when the migrations run, and step 13a switches them on together after its check ("Switching billing on at release", below). Until then, the free trial stays off (`pricing.freeTrial` has `"on": false`). The WhatsApp add-on's price, trial wording, monthly use and limit (`GET /billing/whatsapp`) are served to an admin only while `release.planAndBillingNewParts` is on; while it is off, an admin reads what every other member reads, whether check-ins go by WhatsApp and why not. The seat count, the plans and prices, Stripe, invoices and activation codes are not touched, because existing clients use them. One thing to know: turning the add-on on for an organisation (`PATCH /billing/whatsapp`) still works, because it charges nothing while the trial is off and the three new WhatsApp jobs (the morning reminder, the reminder before a session, the lead's daily summary) go only to organisations that have turned it on. The Plan and billing page in the client does not call `GET /billing/whatsapp` at release.

**5. The anchor scenario.** Piece 0 of `docs/anchor-scenario-plan.md`. The switch is read in one place, `theAnchorScenarioIsOn` in `api/src/modules/admin/what-is-hidden-at-release.ts`, and every later anchor piece calls that one function. Nothing is built behind it yet, so turning it on changes nothing for any check-in, existing or new. The one thing it changes today is a field: the board sends `anchorScenarioOn` (false at release) to whoever runs the check-in, so the screens know without guessing. A person in the check-in is not sent it. Tests: `api/src/modules/admin/hidden-at-release.spec.ts` and `api/src/modules/board/the-anchor-switch-changes-nothing-yet.spec.ts`.

## Switching billing on at release

In this release the one-month free trial (`pricing.freeTrial`) and Plan and billing's new parts (`release.planAndBillingNewParts`) are switched on. The trial's switch is also the WhatsApp add-on's: from the moment it is on, decision 78's WhatsApp rules apply. Stripe stays in test mode until Hafsah says otherwise.

**Why this is a release step and not a migration.** What the switch does to an organisation that is already here depends on how that organisation stands, and a migration cannot look first. Decision 88 says the two existing clients are not charged, emailed, restarted or changed by surprise. Proved in `api/src/modules/billing/switching-billing-on-at-release.spec.ts`:

| How an existing organisation stands | What switching on does to it |
| --- | --- |
| On the free plan (it pays for nothing and has no free run) | Nothing. It keeps the free plan, because it was made before the switch went on. WhatsApp goes as today, nothing is charged, nothing is emailed, and the nightly WhatsApp sweep never reaches Stripe for it. |
| In a free run Groundwork gave it | Nothing while the run lasts. When it ends, the organisation is back on the free plan, as today. |
| It pays for a plan, and its WhatsApp add-on is off (every organisation's add-on is off after migration 71) | **A change by surprise.** From the next message, its WhatsApp messages are held and its people read "Your organisation has not turned on WhatsApp, so this check-in stays in the app." |
| It pays for a plan through Stripe, and its WhatsApp add-on is on | **A charge.** At 1am UTC the next night, the add-on is added to its Stripe subscription as a second monthly line, prorated. |
| Its admin later answers the team-size question with "fewer than 20" | It is given the one-month trial on the plan for 20 people, as a new team is. When the month ends it is back on the free plan. Nothing is charged. |

Switching on gives the trial to nobody already here: the trial is given only when somebody answers the team-size question (`the-free-trial.service.ts`, on `org.sizeSaid`), never by the switch, a nightly job or a migration. Switching on sends no email. The only billing email in decision 78 is the one to an organisation's admins when it reaches its monthly WhatsApp limit, which applies with or without the switch.

**1. The check (read only).** On the hosted database, after the migrations:

```sql
SELECT id, name, created_at, subscription_plan, subscription_status, subscription_stripe_id,
       free_until, free_plan, whatsapp_add_on_on, whatsapp_add_on_item_id
FROM organizations
WHERE (subscription_status = 'active' AND subscription_plan IS NOT NULL)
   OR whatsapp_add_on_on
   OR whatsapp_add_on_item_id IS NOT NULL
ORDER BY created_at;
```

Each row is an organisation that switching on would change: its WhatsApp held (add-on off) or a charge added (add-on on, with a Stripe subscription). If no row comes back, go on. If a row comes back, stop and ask Hafsah what happens to that organisation. The first paid client may be one of them: if it already pays and should keep WhatsApp, its admin turns the add-on on at Plan and billing, which adds $72 a month on Small Team (the price in `pricing_plans`), and that is Hafsah's decision, not the release's. On the local test database (5 October) the check returns 30 organisations, all with a plan written by hand and no Stripe subscription, so there it would hold WhatsApp for those 30 and charge nobody.

**2. Switch on.** Either as a platform admin, `PATCH /api/v1/admin/pricing/free-trial` with `{"on": true}` (it writes the moment it went on), and then the second statement below; or both statements in the database console:

```sql
BEGIN;
UPDATE platform_settings
   SET value = (value || '{"on": true}'::jsonb)
               || jsonb_build_object('onSince', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
       updated_at = now(), updated_by = 'release step'
 WHERE key = 'pricing.freeTrial' AND COALESCE((value->>'on')::boolean, false) = false;
INSERT INTO platform_settings (key, value, updated_at, updated_by)
VALUES ('release.planAndBillingNewParts', '{"on": true}'::jsonb, now(), 'release step')
ON CONFLICT (key) DO UPDATE SET value = '{"on": true}'::jsonb, updated_at = now(), updated_by = 'release step';
COMMIT;
```

Never write `pricing.freeTrial` as a bare `{"on": true}`. Without `onSince`, every organisation keeps the free plan, including a team made tomorrow, so the trial would end the free plan for nobody (proved in the same spec).

**3. The check after.** `SELECT key, value FROM platform_settings WHERE key IN ('pricing.freeTrial', 'release.planAndBillingNewParts');` shows `"on": true`, `"months": 1`, `"teamsUnder": 20` and an `onSince`, and `{"on": true}`. Run the check in step 1 again: it returns the same rows as before, and no more.

**To switch off again.** Write `"on": false` in both rows. Nothing granted is taken back: a team in its trial keeps it until it ends. A Stripe line already added for the add-on is taken off at 1am UTC the next night.

**Run on the local test database, 5 October.** Both statements ran on `gw_pw9_1786222102`. A new team, Kijani Repairs, was made by its founder, Wanjiru, who said it had fewer than 20 people. It was given one month on the Small Team plan, ending on 5 November 2026. Wanjiru, its admin, turned WhatsApp on and read that nothing is charged for WhatsApp until the trial ends. Stripe test mode could not be driven: the local environment holds only the placeholder `sk_test_...`, so creating a checkout failed with "Invalid API Key provided". A real Stripe test key in the local `api/.env` is needed for that part.

# The release to production, for Abubakar


> **Update, 15 October, 04:00 UTC.** Brought up to date with staging after #351 (the marketing build's apostrophe, one shared row, two stale pins). Five tooling tests that read working documents (tools/score_run.py, docs/pattern-names.md, docs/modules.md, a journey dump) are left out of this release, as docs/what-goes-in-a-pull-request.md requires; they stay on the working branch. Product paths equal staging's exactly.
>
> **Questions before the merge:** (1) Hafsah decides whether the free-trial switch (`pricing.freeTrial`) goes on at release; the new pricing and the one-month trial for new teams show only once it is on. (2) Main's migration `20260923200000_reopen_every_check_in…` is `SELECT 1` on staging; if production already ran main's version, those check-ins were already reopened and nothing runs twice. Please confirm. (3) The API needs Node 24.
This branch, `release-production-1015`, is made from `main` as it is today (`824b7e3b4`, 28 September). Its product files are exactly staging's as of `600849756` (15 October, after #350): `api/src`, `api/prisma`, `client/src`, `client/public`, `marketing/src`, `marketing/public`, the package and build files, the CI workflow `tests.yml`, the four one-off scripts the release runs, the existing-users check, and three notes. Nothing else changes. Merge it into `main` only after the backup below.

## Before you merge

Tick each one, in this order. The full steps are in `docs/deploy.md`, "The release night, in order".

### (a) The backup, first

- [ ] **Take a backup of the production database, and write down the time it was taken.** Nothing else happens before it: no setting, no merge, no script.
- [ ] Then, on production, `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;` must say 0 (if that column is still there).

Backup taken at: ____________________

### (b) The settings on Railway, production

Set these on the production API before the merge, so they are there when the new code starts.

- [ ] `SETTINGS_ENCRYPTION_KEY`: make it with `openssl rand -base64 32`. Use a different key for each environment, and never change it later, because a changed key means every saved WhatsApp secret has to be typed in again.
- [ ] `WHATSAPP_APPROVED_TEMPLATES`: the names of the templates Meta has approved, separated by commas (for example `checkin_reminder,lead_daily_summary`). A template not named here is never sent.
- [ ] `PUBLIC_API_URL=https://api.myground.work` (no `/api/v1`). The one-click unsubscribe in every email and the WhatsApp callback address are built from it.
- [ ] `NODE_ENV=production`. Never `development` on a hosted API: with `development` the API listens only on 127.0.0.1 and stops answering.
- [ ] `TRUST_PROXY_HOPS`: how many proxies sit in front of the API (Railway's own is 1, and a content network such as Cloudflare in front adds 1). Unset, it is 1 in production. Set it if the number is different.
- [ ] Google sign-in, with the same values as live: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (`https://api.myground.work/api/v1/auth/google/callback`, and an authorised redirect in the Google client), `GOOGLE_SERVICE_ACCOUNT_JSON`, and `FRONTEND_URL` (the client's address).
- [ ] Stripe: leave `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the other Stripe settings as they are today. They change to live keys only when Hafsah says so.
- [ ] The free trial stays off at release. `pricing.freeTrial` is written switched off by migration 71 if it is missing; do not switch it on.
- [ ] Unchanged, but checked by the production start (it refuses to start without them when `NODE_ENV=production`): `JWT_SECRET`, `CORS_ORIGINS`, `DATABASE_URL`, `BILLING_ENABLED=true`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `EMAIL_SENDS_FOR_REAL=true` and a real `RESEND_API_KEY`.
- [ ] Optional: `WHATSAPP_DISPLAY_NUMBER` (Groundwork's WhatsApp number as people read it, shown on the Connections page).
- [ ] Node: `api/package.json` asks for Node 24 (`"engines": {"node": "24.x"}`), as on staging. Make sure the production service builds with Node 24.

### (c) The migrations it will run on production's data, in order

The API runs `prisma migrate deploy` when it starts (`npm run start:prod`). If a migration fails, the API does not start; then follow the rollback rule in (e). There are **86 new migrations** since `main`'s last one (`20260924175813_how_somebody_arrived`). The number is the one `docs/deploy.md`, section 2, gives each, where they are described in full. **Ten of them change existing values or write a row (in bold).** The rest only add tables, columns, types or indexes.

| # | Migration | What it does to existing data |
| --- | --- | --- |
| 14 | `20260925230000_the_board_reads_the_opening` | Adds new columns, types or indexes only. No existing value is changed. |
| 15 | `20260926200000_what_they_said_about_their_team_size` | Adds new columns, types or indexes only. No existing value is changed. |
| 16 | `20260926210000_waiting_for_an_admin_names_them` | Adds new columns, types or indexes only. No existing value is changed. |
| 17 | `20260926220000_asking_for_more_time` | Adds new columns, types or indexes only. No existing value is changed. |
| 18 | `20260926230000_the_welcome_card_is_read` | Adds new columns, types or indexes only. No existing value is changed. |
| 19 | `20260927000000_joining_by_email_domain` | Adds new columns, types or indexes only. No existing value is changed. |
| 20 | `20260927010000_the_organisation_invite_link` | Adds new columns, types or indexes only. No existing value is changed. |
| 21 | `20260927020000_who_added_this_person` | Adds new columns, types or indexes only. No existing value is changed. |
| 22 | `20260927030000_where_they_sit` | Adds new columns, types or indexes only. No existing value is changed. |
| 23 | `20260927040000_what_a_target_assumes` | Adds new columns, types or indexes only. No existing value is changed. |
| 24 | `20260927050000_the_reason_for_a_decision` | Adds new columns, types or indexes only. No existing value is changed. |
| 25 | `20260927060000_suggestions_and_appeals` | Adds new tables only. No existing value is changed. |
| 26 | `20260927070000_links_between_check_ins` | Adds new columns, types or indexes only. No existing value is changed. |
| 27 | `20260927080000_the_suites_an_organisation_has_on` | Adds new tables only. No existing value is changed. |
| 28 | `20260927090000_leave_requests` | Adds new tables only. No existing value is changed. |
| 29 | `20260927100000_time_sheets` | Adds new tables only. No existing value is changed. |
| 30 | `20260927110000_performance_reviews` | Adds new tables only. No existing value is changed. |
| 31 | `20260927120000_when_someone_leaves` | Adds new tables only. No existing value is changed. |
| 32 | `20260927130000_the_role_map` | Adds new tables only. No existing value is changed. |
| 33 | `20260927140000_spending_and_budgets` | Adds new tables only. No existing value is changed. |
| 34 | `20260927150000_customers_and_deals` | Adds new tables only. No existing value is changed. |
| 35 | `20260927160000_equipment` | Adds new tables only. No existing value is changed. |
| 36 | `20260927170000_whatsapp_webhook_verified` | Adds new columns, types or indexes only. No existing value is changed. |
| 37 | `20260927180000_free_trial_started` | Adds new columns, types or indexes only. No existing value is changed. |
| 38 | `20260927180000_record_said_word_for_word` | Adds a word-for-word mark to record lines, `false` on every existing row until `stamp-said-word-for-word.ts` runs (script 1 below). |
| 39 | `20260927190000_commitment_said_word_for_word` | Adds a word-for-word mark to commitments, `false` on every existing row until `stamp-said-word-for-word.ts` runs (script 1 below). |
| 40 | `20260927190000_where_they_were_going` | Adds new columns, types or indexes only. No existing value is changed. |
| 41 | `20260927200000_how_they_joined` | Adds new columns, types or indexes only. No existing value is changed. |
| 42 | `20260927210000_a_waiting_google_sign_up` | Adds new columns, types or indexes only. No existing value is changed. |
| 43 | `20260927220000_the_browser_that_chose_the_password` | Adds new columns, types or indexes only. No existing value is changed. |
| 44 | `20260927230000_held_for_a_seat` | Adds new columns, types or indexes only. No existing value is changed. |
| 45 | `20260927235500_what_the_lead_typed_in_setup` | Adds new tables only. No existing value is changed. |
| 46 | `20260928090000_the_person_sees_their_pattern_first` | **Changes existing values.** Every pattern already seen in three or more periods gets `ready_at` set to the moment it runs, so from release the person it is about reads it first. |
| 47 | `20260928120000_a_question_asked_word_for_word` | Adds new columns, types or indexes only. No existing value is changed. |
| 48 | `20260928130000_suggested_answers_on_a_turn` | Adds new columns, types or indexes only. No existing value is changed. |
| 49 | `20260929090000_the_end_card_on_a_turn` | Adds new columns, types or indexes only. No existing value is changed. |
| 50 | `20260929100000_a_line_confirmed_by_who_received_it` | Adds new columns, types or indexes only. No existing value is changed. |
| 51 | `20260929110000_when_a_commitment_was_settled` | Adds new columns, types or indexes only. No existing value is changed. |
| 52 | `20260929120000_how_a_commitment_was_settled` | Adds new columns, types or indexes only. No existing value is changed. |
| 53 | `20260929130000_plan_proposals` | Adds new tables only. No existing value is changed. |
| 54 | `20260929140000_the_kind_of_work` | Adds new tables only. No existing value is changed. |
| 55 | `20260929150000_a_decision_about_a_person` | Adds new columns, types or indexes only. No existing value is changed. |
| 56 | `20260930010000_what_the_lead_made_of_a_pattern` | Adds new columns, types or indexes only. No existing value is changed. |
| 57 | `20260930020000_evidence_and_a_confirmed_role` | Adds new columns, types or indexes only. No existing value is changed. |
| 58 | `20260930100000_who_confirmed_setup_in_the_leads_place` | Adds new columns, types or indexes only. No existing value is changed. |
| 59 | `20260930110000_the_first_threshold_for_extra_support` | **Writes a row.** Adds the `suggestions.thresholds` settings row only if it is not there (extra support suggested on performance plans, promotions and renewals). |
| 60 | `20260930120000_a_check_in_that_runs_until_the_lead_ends_it` | Adds new columns, types or indexes only. No existing value is changed. |
| 61 | `20261001090000_when_a_handoff_is_due_and_where_a_blocker_started` | Adds new tables only. No existing value is changed. |
| 62 | `20261001120000_the_company_picture` | Adds new tables only. No existing value is changed. |
| 63 | `20261001150000_role_gap_notes_rest_on_a_check_in` | Adds new columns, types or indexes only. No existing value is changed. |
| 64 | `20261001170000_self_learning_counts` | Adds new tables only. No existing value is changed. |
| 65 | `20261001180000_the_weekly_report_sentences` | Adds new tables only. No existing value is changed. |
| 66 | `20261001190000_organisation_memory` | Adds new tables only. No existing value is changed. |
| 67 | `20261001200000_a_target_is_an_aim_or_a_limit` | Adds new columns, types or indexes only. No existing value is changed. |
| 68 | `20261002100000_a_suggestion_says_when_the_person_caught_up` | Adds new columns, types or indexes only. No existing value is changed. |
| 69 | `20261002120000_five_kinds_of_target` | Adds new columns, types or indexes only. No existing value is changed. |
| 70 | `20261002140000_each_sessions_picture_is_released_on_its_own` | **Changes existing values.** Fills the new `released_sessions` list on every existing report from its completed sessions; a participant then reads only released sessions. |
| 71 | `20261002160000_whatsapp_is_a_paid_add_on` | **Changes existing values.** Sets the WhatsApp add-on price and monthly limit on every `pricing_plans` row, and sets `months` to 1 in the `pricing.freeTrial` row (writing the row, switched off, if absent). Its switch is left as it was. |
| 72 | `20261003090000_a_request_asked_about_on_whatsapp_survives_a_restart` | Adds new columns, types or indexes only. No existing value is changed. |
| 73 | `20261003120000_a_request_passes_through_approval_steps` | Allows three existing `time_weeks` columns to be empty. No value is changed. |
| 74 | `20261003140000_one_record_of_who_did_what_on_a_suite` | Adds new columns, types or indexes only. No existing value is changed. |
| 75 | `20261003160000_a_question_about_a_request_and_a_reason_for_a_decline` | Adds new columns, types or indexes only. No existing value is changed. |
| 76 | `20261003180000_a_question_answered_on_whatsapp_during_a_check_in` | Adds new columns, types or indexes only. No existing value is changed. |
| 77 | `20261003200000_spending_rules_categories_and_evidence` | Adds new columns, types or indexes only. No existing value is changed. |
| 78 | `20261003210000_a_question_about_spending_and_a_reason_for_a_decline` | Adds new columns, types or indexes only. No existing value is changed. |
| 79 | `20261003220000_finance_checks_codes_and_pays_a_request_to_spend` | Adds new columns, types or indexes only. No existing value is changed. |
| 80 | `20261003230000_time_sheet_rules_billable_entries` | Adds new columns, types or indexes only. No existing value is changed. |
| 81 | `20261004000000_a_review_reads_the_record_and_the_person_corrects_it` | Adds new columns, types or indexes only. No existing value is changed. |
| 82 | `20261004100000_a_check_in_remembers_it_began_at_the_anchor_link` | Adds new columns, types or indexes only. No existing value is changed. |
| 83 | `20261005200000_a_free_run_is_one_month` | Changes the default of `free_runs.months` to 1 for new rows only. No existing value is changed. |
| 84 | `20261005230000_a_whatsapp_send_keeps_its_message_id` | Adds new columns, types or indexes only. No existing value is changed. |
| 85 | `20261006030000_a_check_in_keeps_the_anchor_situation` | Adds new columns, types or indexes only. No existing value is changed. |
| 86 | `20261006120000_use_simpler_words` | Adds new columns, types or indexes only. No existing value is changed. |
| 87 | `20261006150000_the_strategy_keeps_its_versions` | Adds new columns, types or indexes only. No existing value is changed. |
| 88 | `20261006160000_an_address_can_always_stop_the_mail` | Adds new columns, types or indexes only. No existing value is changed. |
| 89 | `20261007233000_hafsah_stays_a_platform_admin` | **Changes one value.** Sets `is_platform_admin` to true on the `hjumare@gmail.com` row, if it exists and is false. |
| 90 | `20261008100000_a_review_can_be_appealed` | Adds new columns, types or indexes only. No existing value is changed. |
| 91 | `20261009100000_an_organisation_has_a_time_zone` | Adds new columns, types or indexes only. No existing value is changed. |
| 92 | `20261010100000_a_pattern_records_which_prompt_version_read_it` | Adds new columns, types or indexes only. No existing value is changed. |
| 93 | `20261010200000_the_role_learned_in_the_first_check_in` | Adds new columns, types or indexes only. No existing value is changed. |
| 94 | `20261011100000_the_lead_checks_in_when_they_choose` | **Changes existing values.** Marks every existing check-in of a lead (the person who runs it) as optional, so a lead is never counted as missing one. |
| 95 | `20261011110000_why_they_missed_their_check_ins` | Adds new columns, types or indexes only. No existing value is changed. |
| 96 | `20261013090000_accepted_the_invitation` | **Changes existing values.** Sets `accepted_at` on every existing participant who has a sign-in and came in, or who has already answered, so nobody who took part reads as "not joined yet". |
| 97 | `20261014090000_whatsapp_is_free_for_a_month` | **Changes existing values.** Adds `organizations.whatsapp_free_until` and gives every organisation already here one free month of WhatsApp from the moment it runs. Nothing is charged. |
| 98 | `20261014150000_a_free_month_for_every_organisation_already_here` | **Changes existing values.** Gives every organisation that does not pay and has no free run going one free month on the cheapest plan that holds its people (`free_until`, `free_plan`), WhatsApp to the same day, and marks small teams as on their free trial. Paying organisations and running free months are not touched. Nothing is charged and no email is sent. |
| 99 | `20261015120000_extra_seats_and_whatsapp_per_person` | **Changes existing values.** Sets an extra seat at 500 cents and WhatsApp at 400 cents a person on the five plans, only where empty, and marks an organisation that pays the old flat WhatsApp line as keeping it. Nothing reaches Stripe. |

One migration that `main` already has was changed on staging: `20260923200000_reopen_every_check_in_that_ran_out_of_time` now only says `SELECT 1;` (Hafsah's decision 54: a migration never reopens check-ins). Where production has already run it, Prisma does not run it again. Applying `main`'s migrations first and then this branch's was tested, and passes.

### (d) The four one-off scripts, after the API has started on the new code

Run them from `api/`, in this order, each one **dry run first**, read what it prints, then the run that writes. The run that writes asks for the database's host name to be typed back, and writes only when the typed name is exactly the host in `DATABASE_URL`. Section 5 of `docs/deploy.md` explains each one.

1. [ ] `DATABASE_URL=<production> npx ts-node -T journey/stamp-said-word-for-word.ts --hosted-database`, then the same with `--hosted-database --write`. It marks which record lines and commitments are people's own words, so reports quote them again.
2. [ ] `DATABASE_URL=<production> npx ts-node -T journey/bring-the-checkability-read-up-to-date.ts --hosted-database`, then `--hosted-database --write`. It brings each person's own read of how checkable their answers were up to today's rule.
3. [ ] `DATABASE_URL=<production> npx ts-node -T journey/give-each-check-in-its-kind-of-work.ts --hosted-database`, then `--hosted-database --write`. It calls the model, and gives each existing check-in its kind of work. It must run before script 4.
4. [ ] `DATABASE_URL=<production> npx ts-node -T journey/bring-a-check-in-up-to-date.ts --hosted-database`, then `--hosted-database --write`. It prints each change in a sentence first; read them before writing.

### (e) The rollback rule

- [ ] If anything goes wrong, **restore the backup from (a) and the old code (`824b7e3b4`) together. Never roll back the code alone.** The old code cannot read the new database, and the new migrations change existing values that only the backup holds.

## What is in it, by area

- **The engine** (`api/src`): plain reports and boards, written in full sentences with people's names; the role interview in a person's first check-in; the lead's own check-in, taken when the lead chooses; missed check-ins told to the person first; claims about a colleague kept in the speaker's words until the colleague confirms; pattern steadiness; the lead's daily nudge; one routine message a day for each person.
- **Ask Groundwork**: context and resources set up by talking to Ask, each written only after a yes. The old context chat is off.
- **The suites**: leave, hours, spending and finance, reviews (with appeals), leaving, the role map, customers, equipment and to-dos. Each is off for every organisation until an admin turns it on.
- **WhatsApp** on Groundwork's own number, a free month for every organisation, and an organisation's own number as an advanced option.
- **Pricing**: a free month for every organisation already here that does not pay; extra seats and WhatsApp a person on each plan. Nothing is charged while the free trial's switch is off.
- **Privacy, enforced on the server**, each with a test: what a lead writes about a person never reaches that person; a participant never reads the lead's judgement; private documents keep their audience.
- **The screens** (`client/src`, `marketing/src`): the prototype's check-in pages, boards, You, Today, Ask, the Company page, the suites, pricing, and the first service worker (`client/public/sw.js`, which only shows `offline.html` when a page load fails).
- **The database**: 86 migrations, listed above.
- **Tests**: the API and client tests that check how the product behaves. Tests that only read source text are left out, as on staging (the 65 that `main` has are removed here; see "Files removed").

## Switches and their defaults

Each is one row in `platform_settings`, and a missing row reads as the default. `docs/deploy.md`, section 4 and "Hidden at release", has the full table.

| Switch | At release | To change it |
| --- | --- | --- |
| `pricing.freeTrial` | **Off** (written off by migration 71 if missing) | Only when Hafsah says, after the check in `docs/deploy.md`, "Switching billing on at release" |
| `release.planAndBillingNewParts` | Off | Together with the free trial, only when Hafsah says |
| `whatsapp_enabled` | Off | Only after Meta has approved the templates, and never on the day of the migrations |
| `release.anchorScenario` | On | `{ "on": false }` |
| `release.contextInAskGroundwork` | On | `{ "on": false }` |
| `release.oldContextChat` | Off | `{ "on": true }` |
| `release.whatsappHalfwayMessages` | On | `{ "on": false }` |
| `release.requestOfferInTheCheckIn` | On (only inside an anchor check-in) | `{ "on": false }` |
| `release.boardKindsOffered` | Sales and engineering only | `{ "kinds": [...] }` |
| `coaching_live` | On when the row is missing | `false` |
| `suggestions.thresholds` | Written by migration 59 if missing: on, for performance plans, promotions and renewals only | Edit at Admin |
| Suites (`organization_suites`) | Off for every organisation | Each admin turns one on |

## Files removed from `main`

Inside the product folders, staging deleted 75 files that `main` still has, and this branch follows staging:

- 65 tests that only read source text (32 in the API, 33 in the client), left out under Hafsah's rule of 11 October.
- 10 files replaced on staging: `api/src/modules/reports/the-finding-per-person.ts` (replaced by the plain reports), `client/src/components/gw/Arrival.tsx`, `GroundTabRow.tsx`, `GroundworkLogo.tsx` (used only by `Arrival.tsx`), `TheThingsYouCanConnect.tsx`, `client/src/pages/grounds/the-setup-steps-you-have-checked.ts`, `client/src/pages/org/OrgSetupPage.tsx` (replaced by `OrgNewPage.tsx`; `/org/setup` now opens `/org-new`), and three screenshots with real names in `client/public/connect/`.

Every file on `main` is already in staging's history (`main`'s tree is the same as the commit staging and `main` share, `5197f22d8`), so none of `main`'s own work is lost.

## Every result

Checked on this branch on 15 October, each on a fresh local database, with the CI's own settings (`NODE_ENV=development`, `JWT_SECRET`, `RESEND_API_KEY`).

| Check | Result |
| --- | --- |
| Type checks | The API and the client: no errors. |
| The API's tests (`npx jest --ci --testPathIgnorePatterns=/journey/`) | 2,084 of 2,089 files pass (19,502 tests pass, 8 skipped, 3 fail). The 5 files that fail read files that are not in this pull request, or read source text; none checks how the product behaves. See "Five API tests and three client tests that fail here" below. |
| The client's tests (`npx vitest run`) | 795 of 798 files pass (4,935 tests pass, 2 fail). The 3 files that fail are listed below. |
| Building as production does | The API builds and `node dist/main` starts and answers `/health` (`npm run check:production-start`). The client builds (`npm run build`). **The marketing site does not build:** `npm run build` runs `check-one-domain.mjs`, which refuses one curly apostrophe on `/pricing` ("It’s included in your free month"). Vercel runs the same command, so this must be fixed before the merge. |
| Migrations on an empty database | All 376 apply, and `prisma migrate diff --exit-code` finds no difference from `schema.prisma`. |
| Migrations on a database built from `main` | `main`'s 290 migrations applied first, a little data added (four organisations: one paying, two unpaid of 3 and 14 people, one in a free month; 23 people; 4 check-ins with 12 people and 24 sessions), then this branch's 86 applied in order with no error, and the schema matches. Every check-in and session kept its status and dates. The paying organisation and the one already in a free month were not given a free month; the two unpaid ones were (to 15 November); every organisation got WhatsApp to 15 November; the five plans got the seat and WhatsApp prices; `pricing.freeTrial` was written switched off. |
| The existing-users check (`api/journey/existing-clients-carry-on.spec.ts`) | 12 of 12, on a copy of the local test database brought up to this branch's migrations, inside a transaction that is rolled back. No check-in reopened, restarted, stalled or emailed by surprise. |
| Privacy sweep (the role interview, against this branch's API) | 27 of 27. The privacy test files are in the API suite above and pass. |
| The 24 scenarios, scored against the baseline | All 24 ran to the end against this branch's own API and a fresh database, with the real model (Gemini). The scorer's verdict: "Nothing got worse than the baseline." Every problem in what people read is at 0 (baseline 21 to 1,461 each), except one report with no judgement (baseline 8). Engine value: proof asked for 44 (baseline 42), specific detail 89 (88), blocker checked 51 (37), differences 37 (29), agreements 73 (56), per-person findings 83 (81), commitments 67 (33), central question 29 (29), judgement 28 (21), past words brought back 25 (25). Patterns found is 92 against 100: inside the scorer's 10% allowance, and within the range of earlier runs of the same code (90 to 119). Conversation: no turn asks two questions (37), jargon in turns 28 (42), in reports and boards 143 (511), 23.8 words a turn (26.4). |

**Five API tests and three client tests that fail here.** They pass on staging only because staging also holds our working files, which are not part of a pull request:

- `api/src/modules/reports/a-line-a-person-can-read.spec.ts` reads `tools/score_run.py`.
- `api/src/modules/patterns/plain-pattern-names.spec.ts` reads `docs/pattern-names.md`.
- `api/src/modules/conversation/a-long-paste-from-the-lead-has-a-better-door.spec.ts` reads `api/journey/dumps/sales.txt`.
- `client/src/pages/board/the-switchboard-g2-table.spec.ts` and `the-switchboard-decides-the-board-for-all-24-situations.spec.tsx` read `docs/modules.md`.

Three read source text, and fail on staging too:

- `api/src/common/a-month-given-away-is-cover.spec.ts` finds `isSubscribed(` in `api/src/modules/billing/whatsapp-add-on.service.ts`, where it is used to read a Stripe billing period, not to stop anybody.
- `api/src/modules/reports/the-order-is-the-order-on-screen.spec.ts` looks for the label "How checkable today’s check-in was" in the session page's source.
- `client/src/components/gw/ui/one-off-uses-only-go-down.spec.ts` counts one more one-off style class in `client/src/pages/board/TheSwitchboardsSections.tsx` (32 to 33).

## The detail, item by item

As written for the staging pull requests, for whoever reviews the change in full.

1. **Plain reports and boards.** Every report, board and check-in list is written in plain, full sentences, with people's names, and the reader is "you".
2. **The prototype's screens**: the check-in pages, the boards for each kind of work, the You board, Today, Ask Groundwork, the Company page and the suites.
3. **WhatsApp on Groundwork's own number** (decisions 82, 83, 106 and 112): check-ins, reminders, approvals and the lead's morning summary. At most one routine message a day for each person, across email and WhatsApp together. An organisation's own number is an advanced option kept out of the way.
4. **The suites** (decision 85): leave, hours, spending and finance, reviews, leaving, the role map, customers, equipment and to-dos. Each is off for every organisation until an admin turns it on.
5. **Staying in touch** (decision 109): "here is what is new" made from the person's own data, one-click opt-out with a confirmation, and a daily lead summary that is skipped when nothing changed.
6. **Privacy, enforced on the server**, each with a test. What a lead writes about a person never reaches that person. A lead in the same department does not read evaluation check-ins she is not in. A person held for a seat keeps their own answers and own report and nothing else. An email address is never shown in place of a name.
7. **Safety fixes**: only the person who runs a check-in, or an organisation admin, can resend an invitation; the scheduled jobs' lock is held on one connection; each visitor is counted by their own address in the rate limits; the WhatsApp webhook answers at once and never does a message twice.
8. **Nothing removed.** A feature-by-feature audit of live against this work (`docs/nothing-removed-audit.md` on our side) found nothing live can do that this cannot, on the server: every sign-in method including Google, every route the live client calls, every setting, email, WhatsApp message, scheduled job and staff page.
9. **Hafsah's decisions 117 to 123**, among them: the person reviewed reads the manager's words again; "your report is ready" goes at most twice for a person and a report; the server refuses an admin's set-up changes to a check-in she does not run; an admin who joins someone else's check-in reads it as a participant; organisations over their plan at release keep everyone (decision 123).
10. **The lead's daily nudge** (decision 120). Every lead, automatically, once each morning, only when something is outstanding: "Needs you", "Overdue on your team", "Risks", at most three lines each, and a link to see everything. On WhatsApp through the unchanged `lead_daily_summary` template, or by email. It is the lead's one routine message that day. For existing clients it leaves out what is more than a month old (decision 121).
11. **Participant activation and engagement**: a first insight in the report email, a Friday letter for leads, value-first follow-ups, a one-time WhatsApp welcome to anyone never reached, at most one routine message a day for each person, and the lead's sentences on Today ("From Groundwork").
12. **The anchor scenario, switched on**, through the normal entry chat, invitations, check-ins, board and reports (decision 114), with its own board sections, the month's end, and up to 20 team members besides the lead.
13. **Appealing a decided review** (decisions 113 and 118), on screen and on the server, told by email and in the app.
14. **Context and resources fully in Ask Groundwork** (decisions 50 and 129). A lead sets a check-in up by talking to Ask: a fact for everybody, a rule, a decision, a private note, a question for one person, a goal, or a document is each sorted, said back, and written only after a yes. The old context chat is off by default (a row `release.oldContextChat` of `{ "on": true }` brings it back). Proved side by side with the old chat on the real model on 10 October (34 of 35 each run).
15. **Plain sentences for every refusal and empty state**, and three restored screens (beginning the last check-in early, your own requests on Today, the request forms' way to try again).
16. **The user journey sweep's fixes**: 70 of 83 closed. The rest are prompt wording, by design, or after release.
17. **The last privacy fixes from the screens' checks**: the check-in list and the single read no longer send anyone who does not run a check-in anything built from the lead's private set-up; the check-in list follows the single read for targets, so where people see only their own targets a member reads the team's target and her own; replies arrive whole after the checks, so what a person answers is what is stored; dates are in the organisation's own time zone.
18. **Faults the checks found and fixed**, each with a test: a session the clock closed with nothing said no longer counts as answered; a member's anchor report no longer carries the lead's aims; a member no longer reads where colleagues work where people do not see each other; the board's patterns are timed on the board's own clock.
19. **The screens' deep page audit, the engine's wording, and the suites' settings.** A report, the board and the board's header no longer say nobody is waiting while a worry or a blocker is on record; a lead or a member with no finished check-in is told nothing about a session; a priority no check-in feeds is read from the counts; Ask answers "What am I missing?" and "Review my goals". Every suite's settings are served and saved, so an admin can set the days of leave a year, how often people are reviewed and a budget. Every suites route that takes an id lets in only the person, their approver and an admin.
20. **The role interview, in a person's first check-in** (decision 129): what a person is responsible for, what doing well looks like, who they depend on and who depends on them, and what usually gets in their way, one question at a time. Kept as a private row; the role map shows what the job owns only after the person's yes; they can correct it in Ask. Two stored prompts (`first_check_in_role`, `role_reading`) and one migration.
21. **Pattern steadiness** (decision 128): the detector's prompt is a stored version (`pattern_detection`), each pattern records which version read it, and a sharper wording is active. One migration.
22. **Bugs from the engine journeys and the communications check**: the check-in list is the chosen organisation's alone for someone in two organisations; "not settled yet" at the ending no longer closes the check-in; an email to a lead names the person, never an address; reminders say in one sentence what the person gets from answering (decision 131); the invitation email is in plain words; a phone number typed without its 0 is kept right. The eight submitted WhatsApp templates are pinned by a test (decision 131).
23. **The screens' link and wording fixes** (B-200 to B-238): every email, sign-in, reset, invitation and join link opened signed in, signed out, as someone else, used, expired and broken; the "yours to keep" email opens Settings at "Your data", and the lead's "report ready" link opens the report itself.
24. **Must-fixes from the final evaluation (decision 139).** The read-only admin gets no judgement and no pattern line, and no stand-in label ("Participant A") reaches anyone. Every next session opens on the check-in's own day in the organisation's time zone (B-161). Groundwork never says it sent a reminder, that someone escalated, that a target exists, or that a promise was kept unless the record holds it. A claim about a colleague stays where it showed, in the speaker's words, with a plain note beside it ("Tried: nudged Samuel on Tuesday." or "Not backed: no attempt to unblock mentioned."), and nobody is marked late, emailed as the hold-up or given a pattern on it until the colleague confirms it.
25. **The lead's own check-in (decisions 133 and 134).** Setup carries straight on into the lead's first check-in, with no question and no intro. After it, one closing message gives the real schedule ("Your team will check in every Monday, as you set it. You can change how often in setup."). After that the lead checks in when they choose: no reminders, never waited on, never counted as missed. "Check in yourself" and "Add context" sit on the check-in page and at the end of each report. A lead reading a session report is recorded. The pattern buttons ("We talked about it", right, wrong or not sure) work on the lead's view. One migration.
26. **Missed check-ins (decision 136).** After two missed in a row the person is told first, on Today and once by email, and can give a reason. After 3 of the last 4 the lead reads it in the daily nudge and on the board, with the reason beside it; then a support plan and then a formal process are suggested, and the lead decides. Approved leave and the lead's own sessions never count. One migration.
27. **The role interview never takes the place of asking for proof (decision 132).** When a person's last answer holds a claim that matters, that turn asks for proof first, and the job question comes back on the next turn.
28. **Known bugs fixed**, each with a test: one of Groundwork's own instructions reaching a lead's session; Ask's list of suggestions is one sentence; a failed open tells each reader the right thing; a member refused a page is told an admin's name; a figure keeps the unit the document gave ("5%"); and more from the engine's bug log. The ones fixed in a prompt are noted there as needing confirming when quality testing returns.

Existing clients get the whole build (decision 90). Their check-ins move to the new boards through the one-off scripts above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

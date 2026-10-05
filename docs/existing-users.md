# The two existing clients through the release

Written on 4 October 2026 on branch `wip/plain-reports`, for decision 88: the two existing clients' check-ins carry on exactly as scheduled, with nothing reopened, restarted, stalled or emailed by surprise, they lose no use case, and they get the new boards, reports, Company page and suites on their existing data.

Nobody looked at their live data to write this, and nobody may. Everything below comes from the code on the live main line (`origin/main`, pull request 317, `f5c07d39`), the code on this branch, and the local test database `gw_pw9_1786222102`. Nothing was pushed, deployed or changed on any hosted database.

## Findings (read these first)

**Finding 1 (fixed). A check-in the live main line already stalled was treated as a live one by the new nightly jobs.**
On the live main line, `STALLED` sat in the list of finished states, so every nightly job skipped a stalled check-in. It was taken out on 23 September (commit `ea4528d5`, "A state a machine puts you in needs a way out a person can use") so that a lead can reopen a stalled check-in by giving it more time (Nate Peterson's report). That is kept. The cost was that `grounds.cron.ts` still skipped only the ended states, so on release morning a stalled check-in would have got the session-ready email, the report-waiting reminder, the "opened" announcement, the WhatsApp messages and a place in the lead's summary (on the local test database, 355 people for the report reminder and 21 for WhatsApp).
The fix: one list, `A_GROUND_THE_JOBS_LEAVE_ALONE` in `api/src/modules/grounds/a-ground-that-has-ended.ts` (ended plus stalled). `grounds.cron.ts` and the lead's daily summary skip every check-in in it, exactly as the live main line did. Reopening still works, because a reopened check-in is no longer stalled and every job picks it up again. The stall sweep itself and the seven-day warning are unchanged. The check script now reads the same list. `FINDING 1` in `api/journey/existing-clients-carry-on.spec.ts` is a plain test and passes; the check on the oldest 150 check-ins now prints "No stalled check-in is picked up by the nightly jobs, as on the live main line."

**Finding 2 (fixed). Three WhatsApp jobs are new and needed no opt-in.**
The morning reminder (08:30 UTC), the reminder an hour before a session opens, and the lead's daily summary (07:00 in Lagos) did not exist on the live main line. The add-on gate in the sender (`billing/whatsapp-add-on.service.ts`) holds a message for an organisation that has not turned the add-on on only while the paid-add-on switch is on; while that switch is off it lets everything go, and its free notice ("your organisation has not turned on WhatsApp") is sent only to a person who wrote to us in the last 24 hours. So the gate did not protect an existing client. The three jobs now ask `organisationsThatTurnedWhatsAppOn` (`api/src/modules/whatsapp/only-where-whatsapp-is-turned-on.ts`) first: an organisation must have its WhatsApp add-on turned on and the platform's WhatsApp switch must be on. Otherwise nothing is sent, written down or counted, and no notice goes to anyone. `FINDING 2` is a plain test and passes. Tests: `api/src/modules/whatsapp/nothing-new-on-whatsapp-until-the-organisation-turns-it-on.spec.ts`. Two older specs gained the organisation switch in their stand-ins, because the jobs now read it.

**Finding 3 (a difference, not a fault). The live main line would stall some check-ins on the first night; this branch does not.**
A check-in that is past its end and still open would be stalled at 03:00 by the live main line, and everybody on it emailed. On this branch it stays open until its lead ends or extends it (decision 74 item 7; `grounds.cron.ts` lines 235 and 267). That is what decision 88 asks for, but it means a check-in that "would have stalled" does not. Test cases D and E show it.

**Renamed, nothing removed.** No API route was removed or renamed (554 route lines on the live main line, all still present; 688 now). No screen address was removed. Four were renamed and each keeps a redirect or the same address: `/org/setup` is now `/org-new` (redirects), `/org/integrations` is now `/settings/tools` (redirects), `/grounds` is still the address of the check-ins list, and Today is the new home after signing in, and `/stop-reminders/:token` shows a new page. Five files were deleted and replaced by newer ones (`the-finding-per-person.ts` by `the-picture-in-plain-sentences.ts`, `GroundTabRow.tsx` by `TheCheckInHeader.tsx`, `TheThingsYouCanConnect.tsx` by the Connections page, `OrgSetupPage.tsx` by the new organisation page, and a setup-steps helper).

The check in section 5 also found 12 next sessions on the local test database whose "next session" is missing. These are rows the journey test runs left behind (a person who finished session 1 and was never given session 2), not a fault in this release. On a copy of the live data the same line will say whether it happens there.

## 1. Every use case an existing client has today, and where it lives

| What they do today | Where it is in this version |
| --- | --- |
| Set up a check-in (scenario, people, cadence, length, start date, working days), invite people by email, by open link or by organisation link | Same places: `/grounds/new`, the invite emails, `/j/:code` for a link. The routes in `grounds`, `participants` and `entry` are all still there. Deferred invites (a start date in the future) still go at 06:00 UTC. |
| A schedule of sessions: each next session opens a cadence step after the last (`cadenceToDate`) | Unchanged. `conversation.service.ts` line 6649 is identical to the live main line. Proof in section 4. |
| Session emails: "your next check-in is open", reminders on day 3, 7 and 14, "who has not started" to the lead | Unchanged (`remind.service.ts`, `chasing-belongs-to-the-lead.ts`). The only change: nobody on approved leave is chased, and the suites tables are empty for them. |
| The check-in conversation, the end card, the person's own record and Done page | Same page. The conversation is the same engine with the run-26 and plain-language fixes. |
| The old context chat on the check-in page | Stays, as decided. Ask Groundwork is added beside it on `/chat`. |
| The report (shared picture, agreements, differences, central question), release to everyone, send named or anonymous | Same routes under `grounds/:id/report`. Old reports are kept as they are: the hourly catch-up skips any report written before `built_from_answers` existed (`reports.service.ts` line 7785), so nothing is rewritten. Opening a report never rebuilds it. |
| The board of a check-in | Same route `grounds/:id/board`. It now has a board per kind of work, and old check-ins have no kind of work, so they keep the board they have. |
| Patterns, coaching, concerns, the lead's private notes | Same. Patterns now reach the person first (decision 86); see section 2. Coaching is on when there is no `coaching_live` row. |
| Pausing, ending, closing, resolving a check-in; end states; feedback after closing | Same. A stalled check-in can now be reopened by its lead. |
| Disputes, clarifications, handover, organisation memory | Same modules, unchanged. |
| Documents and pasted material; the lead's brief and baseline | Same. |
| The check-ins list, Today | `/grounds` is still the list; Today (`/today`) is added and is the home after signing in. |
| Ask Groundwork (the assistant) and its history | Same module, plus its own page `/chat`. The questions stay private to the person who asked. |
| People, roles, the roster, departures | Same (`/org/members`), plus a page for one person. |
| Billing: plans, Stripe, invoices, seats, activation codes | Same. Plan prices are unchanged. New: the WhatsApp add-on prices and limits written by migration 71, a seat count that leaves guests out, and a free-trial switch that is off. |
| Emails (Resend) | Same. New emails: a warning before time runs out (only for check-ins that reach their last week after release), reopened, asking for more time, waiting for an admin. |
| WhatsApp (if switched on): opening notice, answering in WhatsApp, the report sent to the phone | Same, with the morning reminder and the lead's summary added (Finding 2). |
| The developer API, embedding, webhooks | Same routes (`public-api`, `embed`, `webhooks`). New events are added; none is removed. |
| Exports and the report to print | Same routes. |
| The back office (`/admin` for Groundwork's staff, `/ops`) | Unchanged at release (the rebuild is hidden). |
| Sign-in, Google sign-in, organisation setup, joining | Same, with the new join pages (`/welcome`, `/orgs`, `/join/waiting`). |

## 2. What they will notice

**A lead.** After signing in they land on Today, not the list (the list is one tap away). A check-in's page has a header with tabs. The board and the report read in plain full sentences with people's names, a target reads as a sentence, and a stalled check-in can be reopened. Reports and boards written before release stay as they were until something new comes in. A new lead-only Company page, You page and Suites page appear; suites are all off until an admin switches one on. Patterns: the person it is about is shown a pattern first, and the lead reads it after the person answers, three days after the person was shown it, or seven days after it was ready if the person never opened it (migration 46 starts that clock on release day for every pattern already seen three times). So the patterns a lead used to read straight away are held back for a few days after release. Nothing is emailed about this.

**A participant.** They land on Today. Their own check-in, Done page and report read the same, but better: their report and their load across check-ins are on the You page, private to them. They are never shown the lead's judgement or private notes. A pattern about them is shown to them first, with a box to answer it.

**An admin.** The same admin pages plus Suites, Connections (moved from Integrations; the old address redirects), and the Plan and billing page with the WhatsApp add-on (not charged while the trial switch is off). An admin who is not in a check-in cannot open a performance plan, promotion or renewal they were not given access to.

## 3. Which of their data each migration and script changes

There are 81 new migrations since the live main line (the deploy document's heading says 79; its table lists 81, and the folder holds 81; none was changed or removed). All are listed one by one, with a sentence each, in `docs/deploy.md` section 2, numbers 1 to 81. This is what matters for existing rows:

| # | Migration | Changes existing rows? | Can it reopen, restart, stall or email a check-in? |
| --- | --- | --- | --- |
| 1 to 4 | adds columns to check-ins and grounds (link opener, brief ground, complete answer, stalled-from status, stall dates, warning stamp) | Adds empty columns only. Existing rows read null. | No. All three stall columns are null, which is how the first night skips them. |
| 5 | `reopen_every_check_in_that_ran_out_of_time` | **No.** It says `SELECT 1;` (decision 54). | **Cannot reopen anything.** The old version of this file did, and must not be used. |
| 6 to 7, 10 to 12, 14 to 24, 26 to 37, 40 to 45, 47 to 58, 60 to 70, 72 to 81 | add empty columns or new empty tables | No existing row changes. Columns have a default or are empty. | No. |
| 8 | `a_column_nothing_ever_wrote` | **Deletes** `check_ins.next_commitment`. It is empty everywhere in code; check with `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;` which must say 0. **Cannot be undone** by a later migration. | No. But the live code selects that column, so it breaks if code is rolled back and the data is not (section 6). |
| 9 | `a_gap_no_longer_discards_a_period` | **Backfills** `pattern_detections.seen_in_sessions` from the last period seen. | No. |
| 13 | `how_somebody_arrived` | **Backfills** `ground_participants.came_through_the_link` from the placeholder address or a typed name. | No. It changes when a round counts as complete for an open link, which only affects whether a report is released, never a session date. |
| 38, 39 | word-for-word columns | Adds "not word for word" to every line and commitment. The script below sets the right value. | No. |
| 46 | `the_person_sees_their_pattern_first` | **Backfills**: `ready_at = now()` on every pattern seen in three or more periods. | No email. It starts the hold described in section 2. |
| 59 | `the_first_threshold_for_extra_support` | Adds one settings row if absent. | No. Suggestions appear only on performance plans, promotions and renewals. |
| 70 | `each_sessions_picture_is_released_on_its_own` | **Fills** `reports.released_sessions` for reports already released, with the sessions finished when they were released. Nobody gains a later session. | No. |
| 71 | `whatsapp_is_a_paid_add_on` | **Writes** prices and limits into `pricing_plans`, and `pricing.freeTrial` (months 1; the switch is left as it is, off if absent). | No. Nothing is charged while the switch is off. |
| 73 | `a_request_passes_through_approval_steps` | **Allows** three columns of `time_weeks` to be empty. No value changes. | No. The table is empty for them. |

**The scripts.** None runs by itself. All three are run once, by whoever runs the release, after the migrations, each with a dry run first and the host typed back for a hosted database:
- `api/journey/stamp-said-word-for-word.ts` sets `saidWordForWord` on record lines and commitments from the person's own turns. It changes marks only. It cannot reopen, restart, stall or email anything.
- `api/journey/bring-the-checkability-read-up-to-date.ts` raises parts of `specificityDimensions` on finished check-ins, which only the person reads. It never lowers a part, changes a level or touches words. No emails.
- `api/journey/bring-a-check-in-up-to-date.ts` takes off a wait on oneself, restores a count read off a line that only said the aim, takes off a target that is the team's number said again. It changes target and objective rows, never a date, status, person or session, and sends nothing.

Each of these also comes with the settings written when the API first starts: `release.time_running_out_warnings_from` (the release moment) and `job.<name>.ran_for` (one row per scheduled job). Neither is a check-in row.

## 4. Proof that scheduled check-ins continue unchanged

**The next session date is made by code that has not changed.** `ensureNextSession` (`conversation.service.ts` line 6471 onward) and `cadenceToDate` (line 6649) are the same as on the live main line apart from two additions that cannot affect an existing row: a stalled check-in gets no next session (it never did, it was in the finished list), and a check-in marked "runs until the lead ends it" has no planned count (the column defaults to false, migration 60). A session's `availableFrom` is only ever written when the person before it finishes, so release night rewrites none.

**No migration touches a date, a person, a status or a stamp.** See section 3. Migration 5 is empty. Nothing in the data changes is on `grounds.status`, `check_ins.status`, `check_ins.available_from`, `ground_participants.email` or any reminder stamp (`last_nudged_at`, `session_ready_notified_at`, `opened_announced_at`, `lead_told_at`).

**Reminders are the same code.** `remind.service.ts` `sendScheduledNudges` (line 226, 08:00 UTC) and the chase rule `whatToDoToday` (`chasing-belongs-to-the-lead.ts` line 46) are unchanged except that somebody on approved leave is skipped. The chase columns `chase_after_days`, `chasing_stopped`, `tell_the_lead` and `lead_told_at` are already on the live main line, so a lead's schedule carries over.

**Nothing new fires on release night for an existing live check-in (decision 74 item 7).**
- The warning before time runs out (`warnBeforeTimeRunsOut`, line 194) first reads the release moment written at the first start (`the-release-moment.ts` line 37) and skips any check-in already inside its last week or past its end (line 235). It sends nothing at all if it cannot read that moment.
- The stall sweep (`stallOverdueGrounds`, line 250) only stalls a check-in that was warned (line 267). No existing one has a warning stamp, so none is stalled, tonight or later, until its end moves out and back in.
- Every scheduled job claims its time slot first (`once-across-copies.ts`), so two copies of the API cannot send twice. The test runs the warning job twice and the second is refused.
- The other jobs that can email (deferred invites, invite expiry, session ready, reminders, feedback) have the same filters as on the live main line for every status, stalled included (Finding 1, fixed).

**The test.** `api/journey/existing-clients-carry-on.spec.ts` seeds, on the local test database inside a transaction that is always rolled back, check-ins in the shape the live main line leaves them (A mid-schedule, B open two days, C late by a day, D inside its last week, E past its end, F already stalled with a shared report), runs the data change of all 81 migrations, starts the new version, runs 15 jobs (deferred invites, warning, stall, report backstop, invite expiry, scheduled nudges, WhatsApp reminders, lead summaries, reminders, feedback, session ready, opens soon, closing warnings, stale close, and the warning a second time), with the mailer, the phone and the event bus replaced by recorders. It passes. It asserts for A to E: every column of every ground, participant and check-in is identical before and after; every status is still `ACTIVE`; no stall date, no warning stamp; every next session has the same date and no session is made; no email, no announcement; no "time running out" email for D or E; no job throws. For F it asserts the status stays `STALLED` (it does), and shows Findings 1 and 2 as expected failures. If the database is not on the machine (CI), the tests say so and pass without checking.

## 5. The check to run on staging against a copy of the live data

`api/journey/existing-clients-check.ts`. It reads only: it needs `--database <address>` and never reads `DATABASE_URL`; it refuses `--write`; it makes its connection read only at the database and proves it with a refused trial write; it refuses every write the services try and reports it as a fault; and the model, the mailer and WhatsApp are replaced by stand-ins that refuse to be called. For a hosted address it needs `--hosted-database` and the host typed back.

```
cd api
npx ts-node -T journey/existing-clients-check.ts --database <address of the COPY> --hosted-database
```
Options: `--limit <n>` for the oldest n check-ins, `--ground <id>` for one. It prints a plain summary and exits 0 when nothing needs attention, 3 when something does, 1 when it refused to run.

For every check-in it reads the board, the report and the check-in page as its lead, up to two participants and an admin who is not in it. It reports served, refused on purpose (for example "There is no report yet"), failed, and tried to write. It looks in what each reader was served for sentences from the lead's private notes, another person's own report, anybody's Ask Groundwork questions, and the names of another person's other check-ins (their load); it never prints those sentences. It checks that each finished session has a next session, that each next date follows from the cadence, and says how many people would be reminded on the next morning run, using the live rule. It also counts the stalled check-ins that the new nightly jobs would pick up (Finding 1).

**What it printed on the local test database `gw_pw9_1786222102`, on the oldest 150 of 1,692 check-ins (the full set takes about five minutes):**
```
Connected to localhost for reading only. A trial write was refused, as it must be.
Read 150 check-ins on localhost. Nothing was written, emailed or generated.
The board, the report and the check-in page were read 858 times. 809 were served, 49 were refused on purpose to a reader who may not open them, 0 failed, and 0 tried to write.
By reader: leads were served 424 of 450, participants 357 of 369, and admins 28 of 39.
Nobody was served the lead's private notes, another person's own report, a question to Ask Groundwork, or another person's load across check-ins.
12 next sessions do not follow from the schedule. They are listed below.
No stalled check-in is picked up by the nightly jobs, as on the live main line.
12 things need attention.
```
(Before the fix the same run printed 355 for the reminder that a shared report is waiting and 21 for the morning WhatsApp reminder. The 12 things are the 12 left-behind next sessions of the journey test runs, explained above.)
Every refusal was a report not written yet. Its own spec, `api/journey/existing-clients-check.spec.ts`, tests the address rules, the guard, the leak search and the schedule rule with stand-ins.

## 6. How to roll back

Rolling back is a restore, not a reverse migration, because the API runs `prisma migrate deploy` the moment it starts and nothing reverses a migration.
1. **Before release:** take a backup of each database (release question 2) and write down the time. Run `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;`, which must say 0.
2. Release the API, and check the migrations finished (deploy document section 7).
3. If something is wrong before anyone has used the new version: stop the API, restore the backup, put the old code back (the live main line `f5c07d39`), start it.
4. **Do not put only the old code back.** Migration 8 dropped `check_ins.next_commitment`, and the live code selects every column of a check-in, so it fails to read check-ins at all. Always restore the database with the old code.
5. If people have used the new version, a restore loses what they did after the backup. In that case, switch off what you can instead: nothing needs a code change except (a) the two WhatsApp jobs (leave `whatsapp_enabled` off), and (b) the free trial (leave `pricing.freeTrial.on` false).

**Cannot be undone by a migration:** 8 (a column dropped), 9, 13, 46, 59, 70 and 71 (rows filled or written; the old values were not kept) and 73 (three columns now allow empty; restoring "not empty" fails once any is empty). Everything else only adds empty columns or tables and can be dropped by hand, losing what was written there after release. A restore undoes all of them.

## 7. The old code against the new, on existing check-ins (decisions 90 and 91)

Hafsah's decision 91 sets the standard: the prototype, not the old code. The new boards and reports are the gold standard for every check-in, so an existing check-in does not keep its old board. What the check asks is that nothing the old version showed is lost anywhere in the new one, that nothing reads worse, that nothing private is newly served, and that every page is served without error.

**What it does.** `api/journey/existing-clients-compare.ts` (with `existing-clients-served.ts`, `the-read-only-guard.ts` and a spec, `existing-clients-compare.spec.ts`). It runs the same read-only serving once in a copy of the live main line and once in this code, on the same database, then compares the two files. The sample is the first eight check-ins of every kind of scenario (those with a report first), 192 check-ins across 24 kinds. For each it reads the board, the report and the check-in page as the lead, up to two participants and an admin who is not in it. It also serves every organisation's Company page and suites page to its admin, a lead and a participant, and asks Ask Groundwork the five most common questions ("What is due?", "Who is waiting on me?", "What did we agree?", "Where am I needed?", "What happened last week?") for people who already have a roster entry. It is read only in the same four ways as section 5, and the model, the mailer and WhatsApp are stand-ins that refuse to be called. A page may make only the few writes it makes by design (recording that a pattern was shown to its person, linking an invited person to their sign-in by address, and Ask Groundwork keeping a person's own question); the check does not run them, counts them, and treats any other write as a fault.

**How a sentence counts as kept.** A sentence the old version showed a reader is kept when most of its longer words and numbers appear somewhere in what the new version serves the same reader (board, report or check-in page). The place and the wording may differ.

**What it printed on `gw_pw9_1786222102` (sample of 192 check-ins, about six minutes):**
- Served: the old code served all 1,476 reads; the new code serves all 1,476, with none failed and none trying to write. The Company page was served 4,342 times and the suites page 2,902 times (1,441 refused on purpose to a reader who may not open them), with none failed.
- Private material: nobody was newly served the lead's private notes, another person's own report, a question to Ask Groundwork, or another person's load across check-ins. Six matches of a short shared phrase (for example the title "what moved this week and what is stuck") were found in the old code's pages too, so they are not new.
- Wording, with the scorer's own patterns, old then new: slot names glued to answers 1,532 then 1,091; internal labels shown (the initiator, Participant A) 18,851 then 1,001; the words "1 people" 4 then 2; text cut mid-word 103 then 84; machine table words 4 then 4. Two got worse: a sentence starting in lower case, 31 then 146 (see Finding 4), and the scorer's jargon words, 1,577 then 1,773 (see Finding 5).
- Nothing lost: the old pages held 40,427 different sentences. 37,145 are still somewhere the same reader can read. Of the 3,282 that are not, 2,016 are stock sentences the old code printed on three or more check-ins (the footnote "Generated from the check-in. Only the meeting poll is editable.", the placeholder "Everybody answered, and nothing in the written report reads as a difference or an agreement yet.", the descriptions of what a kind of role looks like), and 1,266 are about one check-in's own people, words or numbers. Of those 1,266, 1,200 are the lead's judgement that a participant no longer reads (where accounts differ, what was inferred, who has been carrying work quietly) because a participant never reads the lead's judgement; this is the privacy rule that the live main line does not have yet (commit `96df60a4`), not a loss to fix. Another 411 are the picture of a later session that a participant reads once the lead releases it. The remaining 347 are not explained and are listed under Finding 6. Ten named people were named by the old pages and are not named by the new ones.
- Ask Groundwork: of 210 questions (30 leads and 12 participants, five each), the old code answered 210. The new code answered 105 (all the participants' and nine leads' answers, with the same words except that a dash became a full stop). The other 105 were asked by 21 leads who have an unanswered say-back parked; the new code takes those to the model, which this check does not have, so they were not tested. The answers that were compared are the same from the record: "Nothing is recorded as waiting on you...", "Nothing in the record needs you this week...". "What happened last week?" and "What is due?" are answered "I cannot answer that one yet" by both the old code and the new code.
- Kinds of work: before, 1,457 of the 1,692 check-ins on this database had no kind of work. The one-off script `api/journey/give-each-check-in-its-kind-of-work.ts` (decision 91, item 1) read each one with the same reading a new check-in gets at setup, and gave 537 of them a kind. 235 already had one, so 772 now have one and 920 have none. The sentences below were counted again after that. Given, by kind: sales org 208, MarketView where next 121, engineering release 91, asset loans 59, distribution operations 40, MarketView Q4 6, trader training programme 4, a law firm matter 4, a government programme 2, founder's own check-in 1, support desk 1. Left without a kind, 920, and listed by the script with the reason: 317 are about somebody starting a role (a new hire, manager, advisor or co-founder), whose board comes from the situation and not from a kind of work; 202 have only a name from the lead and no description of the work; and 401 whose words do not clearly say one of the eleven kinds, which the reading answers with none. A first run gave 119 new-hire check-ins a training programme from one generic sentence, so those two groups are no longer read. These check-ins keep the board their situation gives them (onboarding, delivery and so on).
- The numbers after the kinds were given (same 192-check-in sample): served 1,476 of 1,476 on both sides, none failed; sentences the old code showed 40,450, still readable 37,189, not found 3,261 (before: 40,427, 37,145, 3,282); of those, 1,998 are stock sentences, 1,198 are the lead's judgement a participant no longer reads, 411 are later sessions that wait for the lead, and 345 are not explained (before: 347), of which 273 are for participants (before: 275), 42 for leads and 30 for admins. So giving the kinds did not move the unexplained sentences. The records a kind adds (deals, releases, tickets) are new rows the old board never showed, and no sentence of the old board was waiting on one. What stays without a place on the new board is what Finding 6 lists: the other people's success definitions word for word on a participant's board (about 154), the engine's per-answer notes under "What the answers say", the oldest wait on a participant's board, and the lead's probes and "ask them" lines for admins. This is still for Hafsah to decide (see "Decided for Hafsah to confirm"). Wording counts moved by a handful only (jargon 1,773, a sentence starting in lower case 146).
- Information that has no place on the new board of a kind: a kind's board keeps its own records (see `RECORDS_FOR_EACH_KIND` in `the-kind-of-work.ts`); a check-in given a kind starts with none of those records until the next check-in comes in, because the script writes the kind and nothing else, and the old sentences about deals, tickets or loans that people said stay in the report and the check-in page, which are unchanged.

**Findings from this run.**
- **Finding 4 (fixed in the second run, see above). Stored reports written with a role as the label read badly.** Three of the 943 stored over-time records on this database were written when a person's label was their job title, so the board and report say "Support manager. is waiting on the team responsible for the fix". The labels have been "Participant A" since before the live main line, so this comes from old journey-test runs, not from the release. Not fixed, because the stored text cannot be corrected without rewriting a stored report. On a copy of the live data, count them with `SELECT count(*) FROM reports WHERE over_time::text ~ '[a-z]\. is (down as|waiting on)'` (read only).
- **Finding 5. Jargon words rose a little.** The new over-time sentences use "escalating" and "alignment" ("nothing on record about escalating it"). That is the engine's own wording, which this release does not touch; the scorer counts it.
- **Finding 6. What is still not found in the new pages (347 sentences, 275 of them for participants).** The largest group (153) is the board's list of who owns what: a participant is now shown their own words and the lead's, where the old board showed every colleague's success definitions word for word. The rule allows showing what people said to the people in that check-in; the new board does not. The rest are small: the engine's per-answer notes on the board ("What the answers say", about 40), the oldest wait on a participant's board, and the lead's probes and "ask them" lines for admins. See "Decided for Hafsah to confirm".

**Decision 91, item 2, the second run (4 October, same 192 check-ins).** The 345 sentences that were not explained were read one by one, with the place each was in and the reader who lost it (the comparison can now list them: set `GW_LIST_UNEXPLAINED=<file>`). 154 are colleagues' success definitions (with Hafsah, left). The other 191 fall in the groups below. None of them was a page the new version failed to serve, and none is something a Hafsah decision let back in.
- **Group A, 115 sentences for participants: something a colleague said or is waiting on, on the old board for everybody.** Where the oldest wait, the waits and their "then", the "Unblock" decisions, the quick-read line, the answers under "What the answers say" (volumes, who they need to reach, what could be useful, what to ask next time) and the report's findings held one colleague's words, the old page showed them to everyone in the check-in. The prototype's participant board says "Only yours" (`docs/prototype/screens/B5-the-board/board-as-participant.txt`), and the same sentences are still read by the person they belong to (each is found in what that colleague is served). It is the same question as the success definitions and stays with Hafsah. Nothing was changed.
- **Group B, 47 sentences for leads and admins: the engine's reads of a person (the patterns, their "ask them" lines, the probes, the notes under "how specific", the coaching lines, "what the record shows" under a person).** Their words changed, or they are served only to whoever runs the check-in (an admin who only reads is not shown the lead's patterns, by the rule who-reads-a-pattern), or they are the rating of how specific a person was, which a lead is no longer shown. Patterns, probes and coaching are protected, so only their wording was touched (below). No place was added.
- **Group C, 5 sentences for participants: the lead's brief.** The old check-in page showed a participant the lead's own words about the check-in ("No agenda. Whatever comes up is the point."). The new page serves a participant what they are told (`toldToParticipants`), not the lead's brief, by the existing rule that the brief is the lead's own words to Groundwork. No place was added.
- **Group D, 24 sentences, the rest:** proposed goals "not yet seen by the person it is for" (the goal not told, with its person only after the lead has said it), a coaching line reworded ("This is session 3 of management work" is now "This is session 2 of 4 of this work"), and "Unblock: the follow up", which is the wait itself (it is still read as "the follow up" under "In the way"). Nothing is lost that has a place.

**What has no place on the new board, listed as decision 91 asks.** (1) Colleagues' success definitions, waits, answers and findings on a participant's board, as in Group A, until Hafsah decides. (2) The lead's brief on a participant's page. (3) The rating of how specific each person was, for a lead. (4) An admin who is not in the check-in no longer reads the patterns, the "ask them" lines or the probes of the lead. (5) The words `ESCALATE`, `ALIGNED` and the like are stored values of the end of a check-in; the screen reads their sentence, so they are not text.

**The two wording faults, put right where they are served.** (a) A sentence starting in lower case: 31 then 146 before this run, now 19. Rows stored with a job title as the person's label read "Support manager. is waiting on the team responsible for the fix..." and now read "Support manager is waiting on the team responsible for the fix...". What remains is mostly a long description used as a label ("Co-founder and CTO. Engineering, hiring and - he believes - product.") or somebody's own words. (b) Jargon: 1,577 old, 1,773 before this run, now 1,484, below the old code. "Nothing on record about escalating it" now reads "Nothing on record says anybody has chased it since."; "unescalated" and "Escalated it." are said as what happened. The words left are in people's own words, the scorer's role descriptions and the model's report text, which this run does not touch. Because "escalated" was in a probe's matching words, six lead probes ("Waiting for 21 days for ..., and has escalated.") now count as not found by the sentence match, so unexplained is 351 (273 participants, 48 leads, 30 admins) and not 345; these are the same probes, with the stored model wording unchanged. Details are in `docs/answers-from-engine.md`.

**Numbers after this run.** Served 1,476 of 1,476 on both sides, none failed. Sentences not found 3,269 (stock 2,000, the lead's judgement 1,198, later sessions 411, unexplained 351). Wording, old then now: slot names 1,532 then 1,091; internal labels 18,851 then 1,001; lower case 31 then 19; "1 people" 4 then 2; cut mid-word 103 then 84; jargon 1,577 then 1,484. Worse in: nothing.

**How to run it on staging against a copy of the live data.** Only whoever runs the release, and only on a copy.
1. Make a copy of the live data on a staging database and take its address (never the live address). Create a scratch folder outside this repository.
2. In a second folder outside the repository, add the live main line: `git worktree add --detach <folder>/old-main origin/main`. Link its `api/node_modules` entries to this repository's (link each entry; copy `node_modules/.prisma` and `node_modules/@prisma/client`), delete the line `nextCommitment String? @map("next_commitment")` from that copy of `prisma/schema.prisma` (migration 8 drops the column), and run `npx prisma generate` inside its `api` folder. This is only needed because the copy of the live data already has the new migrations.
3. From this repository's `api` folder:
```
npx ts-node -T journey/existing-clients-compare.ts --database <address of the COPY> --hosted-database --old-tree <folder>/old-main --work <scratch folder> [--per-scenario 8] [--organisations 30]
```
It asks for the host name to be typed back, as in section 5. It exits 0 when nothing needs attention, 3 when something does.
4. Read every FAULT, LEAK, ASK and WHERE line, then the summary. A WHERE line says in which part of which page a sentence went missing, and for which reader. Anything about a lead or an admin, any LEAK, and any FAULT blocks the release. The lines about participants are read against the two explained groups above.
5. Then run `api/journey/existing-clients-check.ts` as in section 5 for the schedule and the nightly jobs.

## 8. Dumps and documents (4 October)

**What was asked.** A lead can paste a long dump, or add a document, in the check-in or in Ask Groundwork. Groundwork reads it, says back what it found, and after a yes puts each piece in the right place (targets on the right people, commitments, dates, decisions, context lines, expectations, questions for people), keeps the rest as context, puts nothing on the wrong person and invents nothing.

**What exists, and what each way in does.**

| Way in | What reads it | What it can put in the right place | What it does not do |
| --- | --- | --- | --- |
| The check-in's setup chat (`POST /grounds/:id/context-chat`, then `/confirm`), and Ask Groundwork's add-context lane, which calls the same two methods (`GroundsService.contextChat` and `applyContextProposal`; Ask Groundwork's lane is off at release, `release.contextInAskGroundwork`) | `A_DUMP_PROMPT` (the reading of a paste of 400 characters or more, `grounds/a-dump-is-many-things.ts`) | Team numbers, each person's numbers and expectation, dates, ways of working, strategy, notes, what is still to decide, what is not settled, commitments (owned or not), questions for people, what is between two people, what the lead thinks of a person | Nothing is written before the yes. A name that is not on the check-in is said, not saved. |
| "From a plan" on the Context and resources page (`POST /grounds/:id/plan/proposals`, with the pasted text or a document), `grounds/a-plan-is-many-proposals*.ts` | `A_PLAN_PROMPT` | One proposal each, confirmed on its own: a goal, a role, a commitment or a rule | Does not take dates on their own, decisions, notes, expectations or questions for people (the page promises goals, roles and commitments). A goal's date is not kept, because a target has no date field. |
| A document added to a check-in (`POST /grounds/:id/documents`) | `WHAT_A_DOCUMENT_HOLDS_PROMPT`, in the background (`documents/what-a-document-holds.ts`) | Its numbers, each on the person it names, and its dates, waiting for a yes | Only numbers and dates. Decisions, rules, questions and expectations in it were not read. |
| Ask Groundwork after "I have just added the document" | Before today, the document's numbers only. **Now, for a lead who runs the check-in, the same reading as a paste.** | As for the first row, on one yes | Anybody else's own document is still read for their own numbers only. |
| The lead's own session (`POST /check-ins/:id/messages`) | The conversation, one answer at a time | Nothing stored from a dump. **Now it tells the lead once where the dump can be put on the check-in.** | The session never reads the dump into everyone's targets. |

The prompts for the dump reader, the plan reader and the document reader are passed to the model straight from the code. Nothing in the prompt store (`PromptVersion`) overrides them, so the file is the version that runs; there is no `promptVersionId` for them.

**The test.** Four long, messy dumps, written as a lead would paste them, are in `api/journey/dumps/` (`sales.txt`, `onboarding.txt`, `project.txt`, `planning.txt`), with what is true of each in `truth.json` (the people on the check-in, the people named who are not, each number and whose it is, the numbers that must not be stored, the jobs, the jobs that have no owner, the questions). `api/journey/dumps/run-dumps.mjs <dump> <way in>` runs one through one way in against the API on a local database, with the real model, and checks the rows. The runs below were on a copy of the local test database (`gw_dumps_1`, made from `gw_pw9_1786222102`) through the API on port 3005. Nothing was run on any hosted database and no email was sent. The ways in are `chat` (the setup chat), `ask` (Ask Groundwork's add-context lane, switched on in the copy only), `plan` (every proposal confirmed), `doc` (a document uploaded, its numbers read), `askdoc` (a document uploaded and "I have just added the document" said in Ask Groundwork) and `checkin` (pasted into the lead's own session).

**What is checked.** For each run: how many of the expected rows were stored on the right person ("right"), how many stored rows were on the wrong person or were not a target at all ("wrong"), how many stored rows were not in the dump ("invented"; each stored row is read against the dump by eye as well as by a word-overlap check), whether anything was written before the yes, whether the list said back is the list that was written, and whether a name that is not on the check-in was said and not given a target. The model gives a slightly different reading each time, so a missing row in one run and not the next is the model, not the code; the figures are from one run each.

**Before and after.** "Expected" counts targets, jobs and questions in `truth.json`. Before is the code of this morning (`b3a3b6e8`). After is the code on this branch.

| Dump | Way in | Expected | Right, before | Right, after | Wrong, before | Wrong, after | Invented |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sales | setup chat | 12 | 10 | 11 | 0 | 0 | 0 |
| Sales | Ask Groundwork | 12 | 10 | 12 | 0 | 0 | 0 |
| Sales | plan, confirmed | 12 | not run (rate limit) | 9 | not run | 0 | 0 |
| Sales | document | 8 numbers | 7 | 7 | 0 | 0 | 0 |
| Sales | document in Ask Groundwork | 12 | numbers only | 11 | 0 | 0 | 0 |
| Onboarding | setup chat | 8 | 8 | 8 | 0 | 0 | 0 |
| Onboarding | Ask Groundwork | 8 | not run | 8 | not run | 0 | 0 |
| Onboarding | plan, confirmed | 8 | not run | 6 | not run | 0 | 0 |
| Onboarding | document | 5 numbers | 5, and two waiting as a target of 0 | 5 | 2 (zero targets) | 1 (a discount cap of 10 kept as a limit for everyone, which the document does say) | 0 |
| Onboarding | document in Ask Groundwork | 8 | numbers only | 8 | 0 | 0 | 0 |
| Project | setup chat | 10 | 6 | 9 | 0 | 0 | 0 |
| Project | Ask Groundwork | 10 | not run | 9 | not run | 1 (a 10% contingency as a limit; the prompt now names it) | 0 |
| Project | plan, confirmed | 10 | not run | 6 | 8 (the day of a date kept as a target) | 0 | 0 |
| Project | document | 2 numbers | 2 | 1 | 1 | 0 | 0 |
| Project | document in Ask Groundwork | 10 | numbers only | 8 | 0 | 0 | 0 |
| Company planning | setup chat | 10 | 1 | 9 | 12 (every priority's number kept for the whole team, and two numbers of an owner who is not on the check-in) | 0 | 0 |
| Company planning | Ask Groundwork | 10 | not run | 9 | not run | 0 | 0 |
| Company planning | plan, confirmed | 10 | not run | 8 | not run (10 goals read as the team's) | 0 | 0 |
| Company planning | document | 9 numbers | 9, each priority twice | 9 | 10 (each also waiting for everyone) | 1 (a price increase of 6 that the document says is not settled) | 0 |
| Company planning | document in Ask Groundwork | 10 | numbers only | 9 | 0 | 0 | 0 |
| Sales | the lead's own session | nothing stored | nothing stored, no word about where to put it | nothing stored, and the lead is told where | 0 | 0 | 0 |

The rows that are missing after are the model reading a line differently on that run (a question put to Ngozi read as a job, a count of 4,200 read as part of a job, five working days read as a rule). Nothing was written before a yes in any run. No name that is not on a check-in received a target in any run after the fixes.

**Faults found, and fixed** (each commit has a test that fails on the old code):

1. **The yes wrote a second reading.** The yes read the pasted words again, and the model never reads the same words the same way twice, so the lead said yes to one list and a different list was written (the project plan said back Zainab's count and her labelling and wrote a different job for her). The reading the lead was shown is kept for six hours and is what the yes writes (`80f6036f`).
2. **A person's number was also the team's, and an owner who is not on the check-in had no place.** On the quarterly plan every priority's number was kept for the whole team as well as for its owner, so the board counted it twice; Hannah Cole's two numbers were kept for the whole team and for nobody else; Musa Bello's payment (a customer) was kept as a job for the team with no owner. A number given to a person is theirs only; what is meant for a person who is not on the check-in is said under their name and not saved (`3e8a94a3`).
3. **A credit ceiling of 35 was said back and never written.** "Q4 sales" and "credit as a share of sales" both end in "sales" and were taken for one measure. Two names are one measure only when their numbers agree (`3e8a94a3`).
4. **"Add them and I will put their part on" was refused as "already on the record".** The pasted words are now matched together with who is on the check-in (`3e8a94a3`).
5. **Dates were said back and dropped** ("They stay in this conversation and are not put on the record"). Each is now one plain sentence kept as a note everyone on the check-in can read (`970803d4`).
6. **Prompts.** An owner named beside a priority or task now gets its numbers and tasks; a customer's job is not the team's; a figure not approved is nobody's number; a count inside a job is not a target; a reserve is not a target; the lead's expectation is not the label "Owner: Amina Yusuf, Sales"; "I", "me" and "my" are not written into lines the team reads; a question put to a named person is found (`79b4c515`, `26d1d878`).
7. **A document the lead added was read for its numbers only.** In Ask Groundwork it is now read as a paste is (`342c428c`).
8. **A paste was written on the wrong check-in.** A setup chat left open on one check-in answered what the lead said next from another check-in's page (`7885af57`).
9. **A long paste in the lead's own session went nowhere and said nothing.** The lead is told once where to put it (`baa63e62`).
10. **A percentage was stored as zero.** "Under 5%" came back as 0.05 and was rounded to a limit of 0, in a paste and in a document. It is kept as 5 only where the paste says 5%, and otherwise no number is kept (`42a91eff`, `c9e2681a`).
11. **A count inside a job, and a full stop before the bracket.** "Tell the top 30 customers" was a target of 30; every job was said back as "Call every butchery in Ikeja. (by Friday 10 October)" (`26d1d878`).
12. **In a plan, the day of a date was a target.** "Racking installed by 24 October" became a target of 24 on the person who owns the racking. A dated job is now a commitment with its date (`9f602b56`).
13. **A document's numbers were waiting twice** (for the owner and for everyone) (`78cf083f`).
14. **What people are told promised a report.** "You will receive a consolidated report each time" is left out (`f832a1dc`).

**What a person reads now** (the quarterly plan, through Ask Groundwork, before the yes; Hannah Cole and Dayo Adeyemi are named in the plan and are not on the check-in):

> These are the dates you named. Everyone on this check-in will see these.
> - Price increase on 1 December.
> - Board review on 12 January.
> - Q4 ends on 31 December.
> - Hiring plan due on 15 October.
>
> One name is not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too.
> - Hannah Cole (Hires: 6; Turnover: 4; Agree 30 60 90 or quarterly plan for everyone (by 31 October); Deliver hiring plan (15 October))

and in the lead's own session, after a pasted update of 400 characters or more:

> That is a lot to read. To put the numbers, dates, decisions and questions in it on this check-in, paste it into Ask Groundwork. It will say back what it found, and nothing is saved until you say yes.

(While Ask Groundwork does not take context, it reads "paste it into the chat on this check-in's Context and resources page".)

**Open, for Hafsah.**
- A document the lead adds is read into notes everyone on the check-in can read, after the lead's yes, the same as a paste. The file itself stays as private as it was set. If a private document's contents should never become shared notes, say so and it will be restricted.
- The plan page ("From a plan") still takes only goals, roles, commitments and rules, and the page promises exactly that. Questions for people, decisions and dates come from a paste, or from a document through Ask Groundwork. Say if the plan page should take them too.
- A question the lead writes to themselves in a dump ("Amina - which accounts actually have a buying process?" when Amina is the lead) is kept as a question for the lead in their own check-in. It is not asked of anyone until the lead confirms it.
- Ask Groundwork's setup lane is off at release, so at release the way in for a dump is the setup chat on the check-in page, and a document the lead adds is read for its numbers there. Everything above through Ask Groundwork needs `release.contextInAskGroundwork` on.

## 9. Checked again on 5 October, evening

Sections 4, 5 and 7 were run again on 5 October between about 20:00 and 20:40, with the code of `wip/release` as it stood then (from `aa2f4d3c` to `42576e10`, while other work was still being committed). Everything ran on this computer only. No hosted database, live key or real email was used. The scripts' own read-only guards were on, and the model, mailer and WhatsApp were stand-ins.

**The database.** Nothing ran on `gw_pw9_1786222102`, because the API on port 3000 uses it. It was copied with `pg_dump` into a new local database, `gw_existing_oct5b`. The copy holds 1,835 check-ins, 10,940 sessions and 1,600 reports, and every migration. On 4 October there were 1,692 check-ins.

**Section 4, scheduled check-ins carry on. It passes, unchanged.** `existing-clients-carry-on.spec.ts` names `gw_pw9_1786222102` inside the file. So that it did not touch that database, a temporary copy of the spec pointed at the copy was run, then deleted. The spec in the repository was not changed. All 10 tests pass, Findings 1 and 2 included. The copy's counts were the same afterwards, because the spec rolls back.

**Section 5, the check script, oldest 150 check-ins.** It printed exactly what it printed on 4 October: 858 reads, 809 served, 49 refused on purpose, 0 failed, 0 tried to write; nothing private served; no stalled check-in picked up; the same 12 next sessions left behind by the journey runs. It also now says 255 people have a session open, and 0 would be reminded on the next morning run.

**Section 7, the old code against the new.** The section says to use `origin/main` as the old code. `origin/main` is now `824b7e3b`, 36 commits after the `f5c07d39` used on 4 October, because the live line's latest work was merged into it. So the comparison was run twice on the same copy: once against `f5c07d39`, to compare like with like, and once against `824b7e3b`.

| | 4 October | Now, old code `f5c07d39` | Now, old code `824b7e3b` |
| --- | --- | --- | --- |
| Reads served, old then new | 1,476 / 1,476 | 1,482 / 1,464 | 1,482 / 1,464 |
| Sentences the old code showed | 40,450 | 40,739 | 54,489 |
| Still readable | 37,189 | 37,028 | 50,001 |
| Not found: stock | 2,000 | 2,170 | 2,404 |
| Not found: the lead's judgement, which a participant no longer reads | 1,198 | 1,334 | 2,150 |
| Not found: later sessions waiting for the lead | 411 | 418 | 404 |
| Not explained (participants, leads, admins) | 351 (273, 48, 30) | 633 (554, 51, 28) | 922 (552, 343, 27) |
| Named people no longer named | 10 | 224 | 224 |
| Private material newly served | none | none | none |
| Ask Groundwork answered, old then new | 210 / 105 | 210 / 105 | 210 / 105 |
| Wording worse in | nothing | nothing | nothing |

On the new side the wording counts barely moved: internal labels 1,058, jargon 1,490, lower-case starts 19, text cut mid-word 84. The old side against `824b7e3b` counts far more faults (internal labels 38,151, machine table words 7,705, lower-case starts 843), because that code serves the stored record over time as it is. The Company page was served 4,781 times and the suites page 3,197 times, with none failed. There are more people on the database now.

**What moved, and why.**

1. **18 reads that used to be served are now refused (FAULT lines). It is a rule added on purpose, but it shows something about the data.** Six participants on three check-ins (`0f937d54`, `1d965e78`, `2502547e`) are marked as held for a seat (`awaiting_seat`), but they have already answered sessions. Since `39b2c296` (5 October, privacy sweep finding 3), anyone held for a seat is refused the board, the report and the check-in page with "This check-in cannot start for you yet, because there is no seat for you on the plan." On the live line they could still read all three. On this database 41 people on 20 check-ins (made on 18 and 19 September by journey runs) are held for a seat and have answered. On release, any such person at an existing client would lose every page they can read today. **This is Finding 7, for Hafsah.** Should someone who has already answered keep reading while held, or should the hold be cleared? Count them on a copy of the live data with `SELECT count(*) FROM ground_participants gp WHERE awaiting_seat AND EXISTS (SELECT 1 FROM check_ins c WHERE c.participant_id = gp.id AND c.status = 'COMPLETED')` (read only). These six people also account for 256 of the 554 unexplained participant sentences and 42 of the 224 lost names.
2. **Without those six people, the unexplained count is close to 4 October's: 377 (participants 298, leads 51, admins 28) against 351.** The largest group is the same one, colleagues' success definitions on a participant's "who owns what" (158, was about 154). The rest are in the same places as before.
3. **Named people no longer named: 224, was 10.** Besides the 42 above, 126 are in cohort check-ins (`COHORT_CHECK`). There, a participant's page now lists an aim or a thing as "You", the lead and "and 3 others", where the old page named every member of the cohort. This comes from the wall where people do not see each other (decision 75 item 14, work committed on 5 October). The other 56 are participants' boards in other check-ins: colleagues' names in "who owns what" and the waits, Group A in section 7. All of it is on purpose. Since a participant used to read these names, it belongs with the open question on Group A.
4. **Against today's `origin/main`, leads have 292 more unexplained sentences.** 288 of them are the stored record over time's pattern observations ("Upward reporting was optimistic while a major account was being lost."), on the board and the report for leads of 81 check-ins. The live line now serves those to a lead. This branch has not served stored patterns to anybody since 27 September (`overTimeAsServed` in `what-the-record-shows-over-time.ts`): a pattern reaches a page only live, through who-reads-a-pattern. This is a lead-facing difference, and section 7 says anything about a lead blocks the release until it is understood. **For Hafsah: confirm that a lead should no longer read the stored pattern lines the live line now shows them.**
5. **The rest is the database growing:** 6 more reads in the sample, 289 more sentences, and 1,023 of 1,835 check-ins with no kind of work (was 920 of 1,692). Ask Groundwork is unchanged.

**Also seen.** In the old-code run, the old code cannot read the kind-of-work column. The script catches that and carries on, as on 4 October. The temporary spec copy was deleted, and both old-code worktrees were removed.

**Left behind on this computer:** the database `gw_existing_oct5b`. `dropdb` is not allowed.

## 10. The release's final check, 6 October, just after midnight, at `2bd25a9e`

Sections 4, 5 and 7 were run again by tester A on commit `2bd25a9e`. One commit, `ca89aa5c`, landed on the branch during the run, so all three were run again in a detached worktree of `2bd25a9e`. The results were the same, line for line. Everything ran on this computer only, with the scripts' read-only guards on and the model, mailer and WhatsApp replaced by stand-ins.

**The database.** `gw_pw9_1786222102` was only read, by `pg_dump`, into a new local database, `gw_final_existing`. The copy holds 1,846 check-ins, 10,996 sessions and 1,606 reports (at 20:00 there were 1,835, 10,940 and 1,600). The copy did not yet have the newest migration, `20261005230000_a_whatsapp_send_keeps_its_message_id`, so it was applied to the copy, as release night would.

**Section 4, scheduled check-ins carry on. 9 of 10 tests pass. The one that fails is a count in the test, not the product.** A temporary copy of `existing-clients-carry-on.spec.ts` pointed at the copy was run, then deleted. The spec in the repository was not changed. The test "runs every migration since the live main line" expects 83 migrations and finds 84. The 84th is `20261005230000_a_whatsapp_send_keeps_its_message_id`, from `4e9145ea` (decision 106 item 1), which updated neither the count in the test nor the list in `docs/deploy.md`. It adds an empty column and an index, and touches no date, person, status or reminder stamp. All the tests that check what happens to existing check-ins pass: every column is the same before and after, no email, no announcement, no stall, and the stalled check-in stays stalled. Whoever owns the spec should raise the count to 84 and add the row to `docs/deploy.md`.

**Section 5, the check script, oldest 150 check-ins.** No private material was served, nothing failed, nothing tried to write, and no stalled check-in is picked up.

| | 5 October, 20:00 | Now |
| --- | --- | --- |
| Reads | 858 | 861 |
| Served | 809 | 808 |
| Refused on purpose | 49 | 53 |
| Failed, or tried to write | 0 | 0 |
| Leads, participants and admins served | 424 of 450, 357 of 369, 28 of 39 | 423 of 450, 358 of 372, 27 of 39 |
| Next sessions that do not follow from the schedule | 12, the same journey runs | 12, the same ones |
| People with a session open, and reminded on the next morning run | 255, and 0 | 253, and 0 |

Why it moved: the oldest 150 is not the same set. Since 20:00, a journey run made a check-in called "Everyone pulling the same way (last month)" (`611fd4a9`) with its start date set back to 29 August. It went into the oldest 150 and pushed another one out. It is closed, has five people and has no report, so its lead, participants and admin are refused the report with "There is no report yet", which accounts for the extra refusals. The one "Report not found" refusal, to a lead, is for "Grow the pipeline" (`5feb92d1`), a check-in with nobody in it, which was in the sample at 20:00 too.

**Section 7, the old code against the new.** The old code is `origin/main`, still `824b7e3b`, so it is compared with the right-hand column of section 9.

| | 5 October, 20:00, old code `824b7e3b` | Now, old code `824b7e3b` |
| --- | --- | --- |
| Reads served, old then new | 1,482 / 1,464 | 1,482 / 1,464 |
| Sentences the old code showed | 54,489 | 54,489 |
| Still readable | 50,001 | 50,001 |
| Not found: stock | 2,404 | 2,402 |
| Not found: the lead's judgement, which a participant no longer reads | 2,150 | 2,150 |
| Not found: later sessions waiting for the lead | 404 | 404 |
| Not explained (participants, leads, admins) | 922 (552, 343, 27) | 924 (552, 345, 27) |
| Named people no longer named | 224 | 224 |
| Private material newly served | none | none |
| Ask Groundwork answered, old then new | 210 / 105 | 210 / 105 |
| Wording worse in | nothing | nothing |
| FAULT lines | 18 | 18, the same three check-ins |

The new side's wording counts are the same as at 20:00: internal labels 1,058, jargon 1,490, lower-case starts 19, text cut mid-word 84, "1 people" 2. The Company page was served 4,812 times and the suites page 3,218 times, with none failed. That is a few more than at 20:00, because there are more people on the database.

**What moved, and why.**

1. **Two sentences for leads moved from "stock" to "not explained" (2,404 to 2,402, and 343 to 345).** They are the lead's probes. The old code writes a wait as "Waiting for 29 days for who decides". The new code writes it as "for who decides since 6 September". A sentence counts as kept when most of its longer words and numbers are found. The old code's day count goes up by one each midnight, so a probe near the line can cross it. This run started after midnight, and the probes in the list are of this kind ("Waiting for 23 days for an answer, with no escalation on record."). No page and no wording changed.
2. **The 18 FAULT lines are the same as at 20:00.** Six participants on `0f937d54`, `1d965e78` and `2502547e` are held for a seat but have already answered, and since `39b2c296` they are refused every page. On the copy, 41 people are in this state, as before. This is still Finding 7, for Hafsah.
3. **The 288 stored pattern observations for leads are still not served.** This is item 4 of section 9, still for Hafsah to confirm.
4. **The old code still cannot read the kind-of-work column.** The script catches that and carries on, as before.

So nothing got worse since 20:00. Two things were already open and still are: Finding 7 and the stored pattern lines. One new thing came in: the migration count in the section 4 test.

**Left behind on this computer:** the database `gw_final_existing`. `dropdb` is not allowed. The temporary spec copy was deleted, and the old-code worktrees were removed.

## Hafsah's decision 90 (4 October)

- Existing clients get the whole new build on the same terms as the paid client. It must work at least as well as today on their existing data (check-ins, boards, reports, Company page, suites, Ask Groundwork); the check below proves it on existing local check-ins. Nothing gets worse, no use case is lost, running check-ins carry on as scheduled, and stalled check-ins stay as the live main line leaves them, with no messages.
- **Rollback:** restore the backup and the old code together, never the code alone.

## Decided for Hafsah to confirm

- ~~Nothing new on WhatsApp reaches an existing client until that organisation turns WhatsApp on.~~ **Replaced by Hafsah's decision 90 (4 October):** existing clients get the whole new build, WhatsApp included, on the same terms as the paid client. The one rule for everybody stays: the new WhatsApp jobs send only for an organisation whose WhatsApp add-on is on, while the platform's WhatsApp switch is on (`whatsapp/only-where-whatsapp-is-turned-on.ts`). Stalled check-ins get no message of any kind.
- **Decision 91, a participant's board shows only their own words and the lead's under "who owns what".** The old board showed every colleague's success definition word for word to everybody in the check-in; the new board shows a participant their own and the lead's. Nothing was changed. I took the option closest to the prototype and to decision 86 (never add a privacy restriction that is not Hafsah's or the prototype's), but the prototype's participant board was not checked line by line. Please confirm which way a participant's board should read, because if colleagues' words should be shown, the board's service (`board.service.ts`, owned by another builder in this session) must be changed.
- **A participant of an existing check-in who read the whole report on the live main line now reads only the sessions released, and 411 sentences of later sessions wait for the lead.** This is migration 70, as already decided. Please confirm that a lead of an existing check-in should release those sessions rather than the migration releasing them all.
- **Leads of existing check-ins who have a say-back waiting (21 on this database) get their next message read by the model.** The old code read it with rules. Not tested here for want of a model; it works as for the paid client.

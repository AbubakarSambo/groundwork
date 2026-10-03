# The two existing clients through the release

Written on 4 October 2026 on branch `wip/plain-reports`, for decision 88: the two existing clients' check-ins carry on exactly as scheduled, with nothing reopened, restarted, stalled or emailed by surprise, they lose no use case, and they get the new boards, reports, Company page and suites on their existing data.

Nobody looked at their live data to write this, and nobody may. Everything below comes from the code on the live main line (`origin/main`, pull request 317, `f5c07d39`), the code on this branch, and the local test database `gw_pw9_1786222102`. Nothing was pushed, deployed or changed on any hosted database.

## Findings (read these first)

**Finding 1. A check-in the live main line already stalled is treated as a live one by the new nightly jobs. It is the one thing that would email people by surprise.**
On the live main line, `STALLED` sat in the list of finished states (`A_GROUND_IS_OVER`), so every nightly job skipped a stalled check-in. On this branch `STALLED` has its own list (`A_GROUND_HAS_STOPPED`, `api/src/modules/grounds/a-ground-that-has-ended.ts` line 38), and only the stall and warning jobs read it. The other jobs in `api/src/modules/grounds/grounds.cron.ts` still skip only `RESOLVED` and `CLOSED` (and `PAUSED` in some). So on release morning, for a check-in that is already stalled, the test shows these are done:
- each person with a session that came due after it stalled gets "your check-in is open" by email (`sendSessionReadyNotifications`, line 634);
- each person whose lead shared a report on it gets the email "your report is waiting to be shown" (`sendReminders`, line 621);
- an "opened" event is sent to the organisation's webhooks and to WhatsApp for each such session (`announceOpenedSessions`, line 877);
- the lead's morning WhatsApp summary lists it as an open check-in (`the-leads-daily-summary.ts` line 83), and people get the WhatsApp reminder "your check-in is overdue" (`sendWhatsAppReminders`, line 711);
- the invite-expiry mails (`tellThemBeforeAnInviteLapses`, line 575) and the report backstop (`synthesisBackstop`, line 1029) also include it.
On the local test database, 37 check-ins are stalled, and the check in section 5 finds 355 people who would get the report reminder and 21 who would get the WhatsApp reminder. The fix is small and sits in `grounds.cron.ts` (add the stopped list to every job that skips the finished list, or put `STALLED` back in the list those jobs read). The engine owner of the grounds files must do it; I was told not to edit them. It is a new item in `docs/release-checklist.md`. The test `FINDING 1` in `api/journey/existing-clients-carry-on.spec.ts` passes while the fault is there and turns red when it is fixed; then change `it.failing` to `it`.

**Finding 2. Two WhatsApp jobs are new and need no opt-in, so on the first morning they try every existing client that has WhatsApp on.**
The morning reminder (08:30 UTC, `sendWhatsAppReminders`) and the lead's daily summary (07:00 in Lagos, `sendTheLeadsDailySummaries`, line 794) did not exist on the live main line. For an organisation with WhatsApp on, a person with a phone number and a session that is open or late is tried on release morning; a lead with an open check-in and a phone number gets the summary. The sender holds a message outside WhatsApp's 24-hour window until Meta approves the templates (`WHATSAPP_APPROVED_TEMPLATES` is empty), so most would be recorded as not sent, but anything inside the window goes. If neither client has WhatsApp on (the setting `whatsapp_enabled` is not `true`, or the organisation has no connection), nothing is tried. Whoever releases must read that setting first. This is a new item in the release checklist. The test `FINDING 2` shows it.

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
- The other jobs that can email (deferred invites, invite expiry, session ready, reminders, feedback) have the same filters as on the live main line for every status except stalled. That exception is Finding 1.

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
Stalled check-ins that the new nightly jobs would now pick up as if they were live: 355 for the reminder that a shared report is waiting, 21 for the morning WhatsApp reminder.
```
Every refusal was a report not written yet. Its own spec, `api/journey/existing-clients-check.spec.ts`, tests the address rules, the guard, the leak search and the schedule rule with stand-ins.

## 6. How to roll back

Rolling back is a restore, not a reverse migration, because the API runs `prisma migrate deploy` the moment it starts and nothing reverses a migration.
1. **Before release:** take a backup of each database (release question 2) and write down the time. Run `SELECT count(*) FROM check_ins WHERE next_commitment IS NOT NULL;`, which must say 0.
2. Release the API, and check the migrations finished (deploy document section 7).
3. If something is wrong before anyone has used the new version: stop the API, restore the backup, put the old code back (the live main line `f5c07d39`), start it.
4. **Do not put only the old code back.** Migration 8 dropped `check_ins.next_commitment`, and the live code selects every column of a check-in, so it fails to read check-ins at all. Always restore the database with the old code.
5. If people have used the new version, a restore loses what they did after the backup. In that case, switch off what you can instead: nothing needs a code change except (a) the two WhatsApp jobs (leave `whatsapp_enabled` off), and (b) the free trial (leave `pricing.freeTrial.on` false).

**Cannot be undone by a migration:** 8 (a column dropped), 9, 13, 46, 59, 70 and 71 (rows filled or written; the old values were not kept) and 73 (three columns now allow empty; restoring "not empty" fails once any is empty). Everything else only adds empty columns or tables and can be dropped by hand, losing what was written there after release. A restore undoes all of them.

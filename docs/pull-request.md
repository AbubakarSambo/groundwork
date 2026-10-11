# The release, for Abubakar

This replaces pull requests #324 and `groundwork-next-release`. It is made from your base as it is today (`59533562`, which already holds #322 and your seven commits of 6 October), and it holds only what the live product needs: product code, migrations, the tests that check how the product behaves, and three notes. It comes as two pull requests, merged in this order:

1. **The engine** (`api/`): the server, its migrations, its tests, the one-off scripts the release night runs, and these notes.
2. **The screens** (`client/` and `marketing/`): the screens, their tests and the browser tests. They call the engine's new routes, so merge the engine first.

## Before you merge

Tick each one before merging. The full steps are in `docs/deploy.md`, "The release night, in order".

- [ ] **Take a backup of the database first**, and write down the time. Nothing else happens before it.
- [ ] **How many proxies sit in front of the live API** (for example a load balancer, plus a content network like Cloudflare)? If more than one, set `TRUST_PROXY_HOPS` to that number (the default assumes 1). The API writes one warning in its log at start while this is unset, and starts anyway.
- [ ] **`SETTINGS_ENCRYPTION_KEY` is set** on each hosted environment, made with `openssl rand -base64 32`, a different one for each environment, and never changed later.
- [ ] **`NODE_ENV=production`** is set on production.
- [ ] **Which Node runs the API and the client.** Your commit "fix: node" asks for Node 24; the build and the production start pass on Node 20 and on Node 24. Please say which the hosts run.
- [ ] **Google sign-in:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on the hosted API with the same values as live, `GOOGLE_CALLBACK_URL` is the API's address plus `/api/v1/auth/google/callback` and is an authorised redirect in the Google client, and `FRONTEND_URL` is the client's address.
- [ ] **Staff access:** on the real database, `hjumare@gmail.com` has an account and `is_platform_admin` reads true after the migrations (migration `20261007233000_hafsah_stays_a_platform_admin` sets it, but cannot create the account).
- [ ] **Eleven new migrations, in order.** The API applies them itself when it starts (`prisma migrate deploy`); if one fails, the API does not start. Each is described in `docs/deploy.md`, section 2, numbers 85 to 95. They add columns, tables or one value, except two that write values: `20261007233000_hafsah_stays_a_platform_admin` (one row) and `20261011100000_the_lead_checks_in_when_they_choose` (marks each lead's own existing check-ins as optional, so a lead is never counted as missing one).
- [ ] **The four one-off scripts run in this order**, each as a dry run first and then with `--hosted-database --write`, from `api/journey/`:
  1. `stamp-said-word-for-word.ts`
  2. `bring-the-checkability-read-up-to-date.ts`
  3. `give-each-check-in-its-kind-of-work.ts` (it calls the model, and must run before the next one)
  4. `bring-a-check-in-up-to-date.ts`
- [ ] **A new system prompt switches on for every organisation when the API starts.** To switch back, a platform admin activates the previous `system` version at `/prompts`; see `docs/deploy.md`, section 6.
- [ ] **Abubakar: run one read-only query on the live data and send the result to Hafsah:** how many organisations are over their plan's limit, and by how much. Nobody existing loses anything (decision 123). The query is in `docs/deploy.md`, "Organisations over their plan".
- [ ] **WhatsApp:** no new templates (decision 124). `lead_daily_summary` must be approved by Meta for the lead's daily nudge to go on WhatsApp outside the 24 hours; until then it goes by email.
- [ ] **Three switches change their default** (see "Switches"). Nothing needs writing for them; to switch any back, write the row shown.
- [ ] **The product's first service worker is in this release.** `client/public/sw.js` acts only on page loads that fail, and then shows `offline.html`; it caches and changes nothing else.
- [ ] **The rollback rule:** restore the database backup and the old code together, never the code alone.

## What is in it

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

## Switches

Each is one row in `platform_settings`, and a missing row reads as the default below. The full table is `docs/deploy.md`, section 4.

| Switch | At release | To switch back |
| --- | --- | --- |
| `release.anchorScenario` | **On** | `{ "on": false }` |
| `release.contextInAskGroundwork` | **On** | `{ "on": false }` |
| `release.oldContextChat` | **Off** (the old context chat on the check-in page is closed and points to Ask) | `{ "on": true }` |
| `release.planAndBillingNewParts` | Off | |
| `release.boardKindsOffered` | Sales and engineering only | |

## Every result

Hafsah stopped quality testing on 11 October until after the release, so the last changes were checked by their own tests and the minimum checks only.

| Check | Result |
| --- | --- |
| Each change's own tests (11 October) | Every new test fails without its change, and the touched test files pass. Both typechecks are clean. |
| Privacy (11 October) | The privacy test files pass (one expectation was changed on purpose: the lead is no longer counted as waiting). The role interview's privacy sweep on a test copy: 27 of 27. |
| Existing users (11 October) | The carry-on check on a local copy, rolled back: every existing check-in's next session stays on the date it already had, with no double week (decision 135). The only change to existing rows is each lead's own check-ins marked optional. |
| The new setup flow, walked in a browser (11 October) | Setup goes straight into the lead's first check-in; "every Monday" is saved as Monday; the closing message gives the real day and "in setup" opens setup; the lead's first check-in counts; "Check in yourself" and "Add context" show, and a participant sees neither. |
| A missed check-ins case (11 October) | The person reads the notice on Today and by email after two; the lead reads it in the daily nudge and on the board after 3 of 4; the lead's own skipped sessions produce nothing. |
| Earlier, 10 October | The whole API suite (19,498) and client suite (5,005) passed; the production start passed; all migrations applied on an empty database and on one built to live's schema with every existing row unchanged; browser journeys, the communications check and two full privacy sweeps passed. |

## Old tests this removes

Hafsah's rule (11 October): tests already on the base that only read source text, mirror the prototype or belong to our testing machinery, and that fail against this release's code even with the CI's own settings (`JWT_SECRET`, `RESEND_API_KEY`, `NODE_ENV=development`, an empty database with every migration applied), are removed here rather than kept failing. Tests that still pass are left untouched. Behaviour tests that failed were brought up to date, never removed. The existing-users check (`api/journey/existing-clients-carry-on.spec.ts`) is kept and updated to today's migrations.

The API's 64 removed tests, each reading source text only:

- `api/src/a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts`
- `api/src/common/guards/a-public-route-still-knows-who-is-signed-in.spec.ts`
- `api/src/modules/a-check-that-can-never-be-true.spec.ts`
- `api/src/modules/assistant/nothing-leaves-without-a-yes.spec.ts`
- `api/src/modules/assistant/what-was-said-is-what-is-kept.spec.ts`
- `api/src/modules/auth/one-answer-at-the-door.spec.ts`
- `api/src/modules/board/a-board-has-no-empty-line.spec.ts`
- `api/src/modules/board/a-pattern-says-what-to-ask.spec.ts`
- `api/src/modules/board/no-board-is-not-a-permission-problem.spec.ts`
- `api/src/modules/conversation/a-colleagues-target-is-not-given-to-your-check-in.spec.ts`
- `api/src/modules/conversation/a-line-somebody-unsaid-counts-toward-nothing.spec.ts`
- `api/src/modules/conversation/a-period-is-not-a-day.spec.ts`
- `api/src/modules/conversation/a-request-offered-in-the-check-in.spec.ts`
- `api/src/modules/conversation/ideas-from-the-team.spec.ts`
- `api/src/modules/conversation/the-card-and-the-pack-are-one-product.spec.ts`
- `api/src/modules/conversation/the-chasing-belongs-to-the-lead.spec.ts`
- `api/src/modules/conversation/the-close-says-what-comes-next.spec.ts`
- `api/src/modules/conversation/the-engine-knows-the-target.spec.ts`
- `api/src/modules/conversation/the-streamed-route-is-the-plain-route.spec.ts`
- `api/src/modules/detectors/a-week-is-not-a-league-table.spec.ts`
- `api/src/modules/documents/the-context-page-keeps-its-promises.spec.ts`
- `api/src/modules/documents/what-a-document-holds.spec.ts`
- `api/src/modules/email/a-reminder-does-not-quote-what-you-wrote.spec.ts`
- `api/src/modules/email/every-message-has-a-plain-text-part.spec.ts`
- `api/src/modules/email/nothing-goes-out-that-was-turned-off.spec.ts`
- `api/src/modules/email/one-report-one-message.spec.ts`
- `api/src/modules/email/the-stop-link-stops-every-engine.spec.ts`
- `api/src/modules/email/what-groundwork-is.spec.ts`
- `api/src/modules/entry/the-role-question-comes-last.spec.ts`
- `api/src/modules/grounds/a-lead-reads-what-they-run.spec.ts`
- `api/src/modules/grounds/a-note-the-team-can-read.spec.ts`
- `api/src/modules/grounds/a-start-date-can-be-changed-until-it-matters.spec.ts`
- `api/src/modules/grounds/added-but-waiting-for-a-seat.spec.ts`
- `api/src/modules/grounds/an-admin-of-this-org-runs-the-ground.spec.ts`
- `api/src/modules/grounds/an-invite-waits-for-the-first-day.spec.ts`
- `api/src/modules/grounds/an-objective-nobody-has-seen.spec.ts`
- `api/src/modules/grounds/covering-for-a-lead-means-steering-it.spec.ts`
- `api/src/modules/grounds/every-way-a-check-in-completes-closes-its-round.spec.ts`
- `api/src/modules/grounds/lead-confirmation-not-skipped.spec.ts`
- `api/src/modules/grounds/not-invited-yet-says-why.spec.ts`
- `api/src/modules/grounds/one-count-of-who-is-in-this-round.spec.ts`
- `api/src/modules/grounds/one-note-shared-on-purpose.spec.ts`
- `api/src/modules/grounds/setting-up-is-not-testifying.spec.ts`
- `api/src/modules/grounds/setup-admin-can-add.spec.ts`
- `api/src/modules/grounds/somebody-can-try-it-alone.spec.ts`
- `api/src/modules/grounds/specificity-belongs-to-the-person.spec.ts`
- `api/src/modules/grounds/the-context-chat-can-close-what-it-opens.spec.ts`
- `api/src/modules/grounds/the-count-matches-the-report.spec.ts`
- `api/src/modules/grounds/the-read-is-the-same-on-both-pages.spec.ts`
- `api/src/modules/grounds/the-setup-chat-goes-through-the-boundary.spec.ts`
- `api/src/modules/grounds/the-weekend-can-be-said-later.spec.ts`
- `api/src/modules/grounds/there-is-no-round-after-the-last.spec.ts`
- `api/src/modules/public-api/their-number-stays-theirs.spec.ts`
- `api/src/modules/reports/a-report-link-opens-the-report.spec.ts`
- `api/src/modules/reports/a-report-that-does-not-contradict-itself.spec.ts`
- `api/src/modules/reports/an-org-admin-reads-with-the-lead-s-eyes.spec.ts`
- `api/src/modules/reports/n-of-m-is-computed-once.spec.ts`
- `api/src/modules/reports/the-lead-is-told-who-by-name.spec.ts`
- `api/src/modules/reports/the-session-report-is-readable.spec.ts`
- `api/src/modules/reports/why-there-is-no-report-yet.spec.ts`
- `api/src/modules/resolution/the-lead-decides-a-persons-role.spec.ts`
- `api/src/modules/whatsapp/a-check-in-left-halfway.spec.ts`
- `api/src/modules/whatsapp/there-is-one-way-in-from-whatsapp.spec.ts`
- `api/src/nothing-in-here-is-wired-to-nothing.spec.ts`

**Already on the base, not changed here:** the "Migrations match the schema" check reports one index on `leaving_checklists` whose name Postgres shortens (`..._last_day_key` from migration `20260927120000_when_someone_leaves`). It is on the base already and this release does not touch it.

## Still to come, after the release

Pushing harder in conversations, the managers' and admin tests, re-running the evaluation's profiles, decision 132's 24-scenario run, and next month's work (reviews with ratings, finance batches) are in Hafsah's roadmap.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

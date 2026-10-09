# The next release, for Abubakar

This builds on pull request #324 (`wip/release-322`). Merge #324 first; this one adds the work since.

## Before you merge

Tick each one before merging. The full steps are in `docs/deploy.md`, "The release night, in order".

- [ ] **#324 is merged first.** This branch contains it.
- [ ] **Take a backup of the database first**, and write down the time.
- [ ] **Two new migrations**, both only adding empty columns: `20261008100000_a_review_can_be_appealed` (nine on `performance_reviews`) and `20261009100000_an_organisation_has_a_time_zone` (`time_zone` on `organizations`). The API applies them itself when it starts. Checked on a database built to live's schema with client rows: every existing row unchanged.
- [ ] **The settings from #324 are still in place:** `SETTINGS_ENCRYPTION_KEY`, `TRUST_PROXY_HOPS` (if more than one proxy), `NODE_ENV=production`, the Google client id and secret with `GOOGLE_CALLBACK_URL`, and `FRONTEND_URL`.
- [ ] **Abubakar: run one read-only query on the live data and send the result to Hafsah:** how many organisations are over their plan's limit, and by how much. Nobody existing loses anything (decision 123); Hafsah wants to talk to them. The query is in `docs/deploy.md`, "Organisations over their plan".
- [ ] **WhatsApp:** no new templates (decision 124). `lead_daily_summary` must be approved by Meta for the lead's daily nudge to go on WhatsApp outside the 24 hours; until then it goes by email. Review appeals are told by email and in the app only.
- [ ] **Two switches change their default** (see "Switches"). Nothing needs writing for them; to switch any back, write the row shown.
- [ ] **The product's first service worker is in this release.** `client/public/sw.js` acts only on page loads that fail, and then shows `offline.html`; it caches and changes nothing else. How to turn it off is in `docs/deploy-notes-screens.md`. The optional `Cache-Control` header for `/sw.js` described there is not added.
- [ ] **The rollback rule:** restore the database backup and the old code together, never the code alone.

## What is in it

1. **The lead's daily nudge** (decision 120). Every lead, automatically, once each morning, only when something is outstanding: "Needs you", "Overdue on your team", "Risks", at most three lines each, and a link to see everything. On WhatsApp through the unchanged `lead_daily_summary` template, or by email. It is the lead's one routine message that day and takes the place of the other morning messages. For existing clients it leaves out what is more than a month old (decision 121).
2. **Participant activation and engagement** (`docs/participant-activation-spec.md`, `docs/engagement-spec.md`): a first insight in the report email, a Friday letter for leads, value-first follow-ups, a one-time WhatsApp welcome to anyone never reached, at most one routine message a day for each person, and the lead's sentences on Today ("From Groundwork").
3. **The anchor scenario, switched on**, through the normal entry chat, invitations, check-ins, board and reports (decision 114), with its own board sections, the month's end, and up to 20 team members besides the lead.
4. **Appealing a decided review** (decisions 113 and 118), on screen and on the server, told by email and in the app.
5. **Ask points to the Context and resources page, and the old context chat stays on there** (decision 124). Ask cannot yet take a document or file a typed fact, so it no longer says it can. The line under its name and its welcome now read "To add context or a document, open the check-in's Context and resources page.", said only to someone who may add context, and the starter "Add a document or some context to my check-in." is gone. Moving Context fully into Ask is the next round.
6. **Plain sentences for every refusal and empty state**, and the three restored screens (beginning the last check-in early, your own requests on Today, the request forms' way to try again).
7. **The user journey sweep's fixes** (`docs/bug-log-engine.md`): 70 of 83 closed. The rest are prompt wording, by design, or after release.
8. **Hafsah's decisions 117 to 123**, among them: the person reviewed reads the manager's words again (D16); "your report is ready" at most twice; the narrowings from the nothing-removed audit (decision 119, H3 to H11, with the server refusing an admin's set-up changes to a check-in she does not run); an admin who joins someone else's check-in reads it as a participant; organisations over their plan at release keep everyone (decision 123).
9. **The last privacy fix** (screens' B-091 and B-013): the check-in list and the single read no longer send anyone who does not run a check-in the subjects to cover, what a complete answer holds, or the link opener, all built from the lead's private set-up. Also from the screens' walk (request 208): replies arrive whole after the checks, so what a person answers is what is stored; dates in the organisation's own time zone; someone on the organisation's own address is no longer called an outsider, and the admin's Today says they are waiting.
10. **The check-in list follows the single read for targets** (screens' request 209, B-114). Where people see only their own targets, `GET /grounds` gave a member every person's number with the row naming each person, while the check-in's own read gave her only hers. The list now uses the same function: the lead and whoever runs the check-in read every share; a member, and an admin who joined someone else's, read the team's target and their own; where everybody sees every target, everyone reads all. Checked in Today, You, the invitation page, Ask, the reports and the board: they already used the rule. The public API works from the organisation's own key and WhatsApp serves no targets.
11. **Faults the checks found and fixed**, each with a test: a session the clock closed with nothing said no longer counts as answered; a member's anchor report no longer carries the lead's aims; a member no longer reads where colleagues work where people do not see each other; the board's patterns are timed on the board's own clock; and others listed in `docs/run-log.md`.

## Switches

Each is one row in `platform_settings`; the full table is `docs/deploy.md`, section 4.

| Switch | Now | To switch back |
| --- | --- | --- |
| `release.anchorScenario` | **On** | `{ "on": false }` |
| `release.contextInAskGroundwork` | **On** | `{ "on": false }` |
| Everything else | As in #324 | |

## Every result

All from 9 October, on the final commit of this branch.

| Check | Result |
| --- | --- |
| API tests | All 19,317 pass, in 1,979 suites (2 skipped on purpose: live journeys). |
| Client tests | All 4,893 pass, in 743 files. |
| Typechecks | The API and the client are clean. |
| Production start | Passes: it builds, starts, `/health` says ok, `/embed.js` answers. |
| Migrations | All 368 apply on an empty database. On a database built to live's schema with client rows in eleven tables, our 7 apply and every existing row is unchanged. |
| Browser journeys | Sign-up (a blank organisation name gets the trial) and sign-in, Google up to Google's own screen, People and Plan and billing, the lead's set-up, a member joining and checking in (replies arriving whole, in the app and on WhatsApp), leave and spending, a review and its appeal, Ask and the old context chat, the Company page, and Today. |
| The anchor | Walked end to end with the real model from the normal entry chat; the set-up saves the end the lead was shown. |
| Privacy | After B-114, on the test bed: on "Sales team, Q4", set so people see only their own targets, the list and the single read gave Amani the team's 100 and her 3 and nothing else, gave the lead and an admin all five, and Amani's You page named only her own. Before that, two full sweeps (28 readers across three organisations), then a sweep of every changed piece (13 reader cases on the check-in list and read, the waiting line, the time-zone route): no reader can open anything they should not. |
| Existing users | The carry-on check passes 12 of 12, run again after the screens' latest was merged. On the clock: nobody existing gets more than one routine message a day, nobody existing is held for a seat, nothing is lost (turns, reports, people and aims identical before and after), and dates are in the organisation's day. |
| 24-scenario run (on this release's engine, two runs) | Every problem 0; the scorer's verdict on the second run is "Nothing got worse than the baseline". Patterns found 89 and 94 against 100, within the run-to-run spread (97, 96, 89, 94). Judgement accuracy 18 right, 6 partly, 0 missed. Adversarial set 33 of 34. |

## Still being polished, for the pull request after

- Prompt wording: the anchor's set-up summary once said "your cash" against the approved line; a few check-in questions repeat or ask about someone already in the check-in; "Last time Baraka says…" attributes a person's own words to the lead on WhatsApp. Each needs a prompt change and a run.
- The admin's list of appeals waiting, and the person's appeal card on Today (the screens).
- Pattern steadiness and a fresh measure of judgement accuracy, and the larger pieces (links between check-ins, the role interview, setting up from a plan, guests in Ask, strategy history), on `wip/next`.

## Needs Hafsah

1. Check-in replies now appear whole after the checks rather than typing out word by word (B-092). Say if you want the typing effect back with a different fix.
2. The live-data query for organisations over their plan goes to Abubakar (in the checklist above).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

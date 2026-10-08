# The next release, for Abubakar

This builds on pull request #324 (`wip/release-322`). Merge #324 first; this one adds the work since.

## Before you merge

Tick each one before merging. The full steps are in `docs/deploy.md`, "The release night, in order".

- [ ] **#324 is merged first.** This branch contains it.
- [ ] **Take a backup of the database first**, and write down the time.
- [ ] **One new migration**, `20261008100000_a_review_can_be_appealed`: nine empty columns on `performance_reviews`, nothing else. The API applies it itself when it starts.
- [ ] **The settings from #324 are still in place:** `SETTINGS_ENCRYPTION_KEY`, `TRUST_PROXY_HOPS` (if more than one proxy), `NODE_ENV=production`, the Google client id and secret with `GOOGLE_CALLBACK_URL`, and `FRONTEND_URL`.
- [ ] **Run one read-only query on the live data and send the result to Hafsah:** how many organisations are over their plan's limit, and by how much. Nobody existing loses anything (decision 123); Hafsah wants to talk to them. The query is in `docs/deploy.md`, "Organisations over their plan".
- [ ] **WhatsApp templates:** `lead_daily_summary` must be approved by Meta for the lead's daily nudge to go on WhatsApp outside the 24 hours; until then it goes by email. The three review-appeal templates in `docs/whatsapp-templates.md` are proposals, not yet submitted; until approved, appeals are told by email.
- [ ] **Three switches change their default** (see "Switches"). Nothing needs writing for them; to switch any back, write the row shown.
- [ ] **The rollback rule:** restore the database backup and the old code together, never the code alone.

## What is in it

1. **The lead's daily nudge** (decision 120). Every lead, automatically, once each morning, only when something is outstanding: "Needs you", "Overdue on your team", "Risks", at most three lines each, and a link to see everything. On WhatsApp through the unchanged `lead_daily_summary` template, or by email. It is the lead's one routine message that day and takes the place of the other morning messages. For existing clients it leaves out what is more than a month old (decision 121).
2. **Participant activation and engagement** (`docs/participant-activation-spec.md`, `docs/engagement-spec.md`): a first insight in the report email, a Friday letter for leads, value-first follow-ups, a one-time WhatsApp welcome to anyone never reached, at most one routine message a day for each person, and the lead's sentences on Today ("From Groundwork").
3. **The anchor scenario, switched on**, through the normal entry chat, invitations, check-ins, board and reports (decision 114), with its own board sections, the month's end, and up to 20 team members besides the lead.
4. **Appealing a decided review** (decisions 113 and 118), on screen and on the server.
5. **Context and resources fully in Ask**, with the old context chat switched off.
6. **Plain sentences for every refusal and empty state**, and the three restored screens (beginning the last check-in early, your own requests on Today, the request forms' way to try again).
7. **The user journey sweep's fixes** (`docs/bug-log-engine.md`): 70 of 83 closed. The rest are prompt wording, by design, or after release.
8. **Hafsah's decisions 117 to 123**, among them: the person reviewed reads the manager's words again (D16); "your report is ready" at most twice; the narrowings from the nothing-removed audit (decision 119, H3 to H11, with the server refusing an admin's set-up changes to a check-in she does not run); an admin who joins someone else's check-in reads it as a participant; organisations over their plan at release keep everyone (decision 123).
9. **Faults the checks found and fixed**, each with a test: a session the clock closed with nothing said no longer counts as answered; a member's anchor report no longer carries the lead's aims; a member no longer reads where colleagues work where people do not see each other; and others listed in `docs/run-log.md`.

## Switches

Each is one row in `platform_settings`; the full table is `docs/deploy.md`, section 4.

| Switch | Now | To switch back |
| --- | --- | --- |
| `release.anchorScenario` | **On** | `{ "on": false }` |
| `release.contextInAskGroundwork` | **On** | `{ "on": false }` |
| `release.oldContextChat` | **Off** | `{ "on": true }` |
| Everything else | As in #324 | |

## Every result

RESULTS_PENDING

## Still being polished, for the pull request after

- Prompt wording: the anchor's set-up summary once said "your cash" against the approved line; a few check-in questions repeat or ask about someone already in the check-in; "Last time Baraka says…" attributes a person's own words to the lead on WhatsApp. Each needs a prompt change and a run.
- The admin's list of appeals waiting, and the person's appeal card on Today (the screens).
- Pattern steadiness and a fresh measure of judgement accuracy, and the larger pieces (links between check-ins, the role interview, setting up from a plan, guests in Ask, strategy history), on `wip/next`.

## Needs Hafsah

1. A team aim that does not name a person stays visible to members on ordinary check-ins (the existing rule). Confirm, or say it should be the lead's alone as in the anchor.
2. The live-data query for organisations over their plan (in the checklist above).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

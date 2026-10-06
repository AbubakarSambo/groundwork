# Known issues

Written on 6 October 2026 on `wip/release`, by the engine workspace. This is one list of every problem that has been found and not fixed. Fixed problems are left out, and each one listed here was checked against the git log or the code at `3c544349`, so a problem that a later commit fixed is not in it.

It was drawn from `docs/morning-report.md`, `docs/weekly-plan.md`, `docs/run-log.md`, `docs/run-32-review.md`, `docs/existing-users.md`, `docs/staging-compatibility.md`, `docs/release-checklist.md`, `docs/release-questions.md`, `docs/pull-request.md`, `docs/engagement-audit.md`, `docs/answers-from-engine.md`, `docs/privacy-restrictions-for-hafsah.md` and `docs/anchor-scenario-plan.md`, from the screens workspace's `docs/requests-to-engine.md` and `docs/morning-report-ui.md` on `mine/wip/prototype-ui`, and from the live line as it is on `mine/wip/live-base` (`5197f22d`). An entry marked **(screens workspace)** came from their lists.

**How to read it.** The entries are grouped by how serious they are: Privacy first, then Broken, then Wrong, then Untidy. Inside each group, problems that reach the existing users or the paid client come first. Each entry says what the problem is, where it shows up, who it affects, why it was left, and what we recommend.

- **Privacy** means somebody can read, or could read, something they should not.
- **Broken** means something does not work, or stops working, for the people it is meant for.
- **Wrong** means it works, but it says or does something untrue, misleading or against a decision.
- **Untidy** means wording, housekeeping or tooling that does not change what a person can do.

---

## Privacy

**P1. The live line stores each organisation's own WhatsApp access token and app secret as plain text.**
- Where: the WhatsApp connection table on the live line (`access_token` and `app_secret` in `schema.prisma` on `mine/wip/live-base`), and every database backup taken from it.
- Who: existing users, for any organisation that has connected its own WhatsApp number.
- Why it was left: the fix is on this branch (`94d736d6`, `6742915a`, `213b7743`, `76e303ee`). It seals both keys, but it needs the server setting `SETTINGS_ENCRYPTION_KEY` on each hosted environment before it ships. Without that setting, nobody can save a new token or secret, and Groundwork's own WhatsApp secrets cannot be saved on `/admin/whatsapp` either.
- Recommendation: Abubakar adds `SETTINGS_ENCRYPTION_KEY` (made with `openssl rand -base64 32`, one per environment, never changed later) before the release. The keys already saved are sealed on the next start. Because old backups still hold plain copies, ask each connected organisation to make a new token in Meta once the release is live.

**P4. Hidden targets are still given to the model when it writes text that other people read.**
- Where: the shared team report, the board lines and the session text. A target the lead set for one person is removed after the model writes, by a sentence-by-sentence net (`docs/weekly-plan.md`, week 0).
- Who: everyone on a check-in with hidden targets.
- Why it was left: taking the numbers out of the model's input would weaken "notices what does not add up", which is on the must-keep list, so it needs Hafsah to choose.
- Recommendation: option 2 in the morning report: give the model the gap without the number, keep the read-side net, and check with a scenario run that no engine number drops.

**P5. On an evaluation check-in, a job search and a lead's wish to let somebody go are readable by the other side.**
- Where: the report and board of a performance plan, promotion, renewal or probation. In the adversarial scenario, Tunde says "I'm actually looking for another job", which his lead reads, and Tunde reads "Dayo Ogunleye has concluded the only path forward is an exit."
- Who: people on evaluation check-ins and their leads.
- Why it was left: both follow the rule that what people say in a check-in can be shown to the people in it, and decisions 86 and 99 item 3 say no restriction is added that is not Hafsah's.
- Recommendation: Hafsah decides whether these two kinds of sentence stay private on evaluation check-ins.

**P6. An admin who is not in a check-in reads everybody's exact words on its board.**
- Where: "Who owns what" and other sections of the board, in quotation marks with names, for an organisation admin who is not in the check-in and did not set it up.
- Who: everyone in check-ins of organisations with several admins.
- Why it was left: it was already so before this work, and the wall for an admin without access (decision 60, point 4) covers only evaluation check-ins. It is Hafsah's call.
- Recommendation: Hafsah decides whether an admin outside a check-in reads people's exact words on ordinary check-ins.

**P7. (Decided, no change.) Groundwork's staff read people's outcome feedback notes word for word in the back office.**
- Decided 7 October (decision 110): Groundwork staff keep reading customers' feedback notes word for word, because those notes are sent to Groundwork. They are never linked to anybody's check-in content. No change.

**P8. An admin's To-dos board shows every person's to-dos across check-ins (screens workspace).**
- Where: the To-dos suite's board for an admin, when that suite is on.
- Who: everyone in an organisation that turns the To-dos suite on.
- Why it was left: the prototype shows the list to an admin, while the rules say each person's load across check-ins is private. The screens workspace kept it but left out to-dos from check-ins the admin may not read.
- Recommendation: Hafsah decides whether an admin sees this list at all.

**P9. "What the room is about" is stored on the check-in with full names, outside the wrapper that handles names and anonymous sharing.**
- Where: the check-in's stored room summary, served by the board and the check-in page.
- Who: everyone, wherever a check-in is shared without names.
- Why it was left: the serving rules hide other people's aims where people do not see each other, but the storage does not follow the "stored without names" rule that reports follow. It needs Hafsah's decision.
- Recommendation: store it with labels and put names in only when served, like reports.

**P10. (Decided, no change.) On a performance plan, the person reviewed sees a work record the lead added with nobody's name on it.**
- Decided 7 October (decision 110): this stays visible, as already decided. No change.

**P11. An admin who will later be added as the person reviewed can read their own plan's setup while it waits for approval.**
- Where: an evaluation check-in waiting for admin approval, which every admin of the organisation can read (decision 75 item 2).
- Who: admins who are themselves the subject of a performance plan, promotion or renewal.
- Why it was left: nothing names the person before they are added, so the wall cannot find them.
- Recommendation: let the lead name the person at setup, and wall them from the approval read.

**P12. A person's leave or spending words are kept in the database for up to ten minutes while Groundwork waits for their yes.**
- Where: the WhatsApp pending yes-or-no store (migration 72), for example "Can I take Friday off?".
- Who: the paid client and anyone on WhatsApp.
- Why it was left: the code needs the words to act on the yes. They are cleared on the answer or by the next WhatsApp message anyone sends, not by a clock.
- Recommendation: add a small nightly clean-up so nothing stays past ten minutes even when nobody writes.

**P14. (Decided, no change.) Screenshots with Hafsah's name, Coamana's CRM and real-looking check-in numbers are still in the git history (screens workspace).**
- Decided 7 October (decision 110): the screenshots stay in the history while the repository is private. No change.

---

## Broken

**B1. On the live line, a scheduled job's lock can stay held and later runs skip silently.**
- Where: `withAdvisoryLock` in `api/src/modules/prisma/prisma.service.ts` on `mine/wip/live-base`. The lock is taken and released through whichever pooled connection is free, so the release can happen on another connection and release nothing. Later runs then log "held elsewhere - skipping this run". It covers reminders, session-ready notices, the stall sweep, the auto-close, the half-hour warning, deferred invites, invite expiry, held mail, the report backstop and the Google sign-in clean-up.
- Who: existing users, today, on live.
- Why it was left: it is fixed on this branch only (`ca89aa5c`, `pg_try_advisory_xact_lock` inside one transaction).
- Recommendation: ship the release. Until then, check the live logs for "held elsewhere". If it shows, a restart clears it, or the one-file fix can go to live on its own.

**B2. Groundwork cannot write first to anybody on WhatsApp, because no template is approved.**
- Where: every message Groundwork starts outside the 24 hours: opening notices, reminders, approvals, decisions, review notices, the lead's daily summary and the first message to a number (`groundwork_first_contact`). `WHATSAPP_APPROVED_TEMPLATES` is empty. `lead_daily_summary` also ends with a blank (`docs/whatsapp-templates.md`, item 8), which Meta refuses, although decision 109 item 10 says to fix it.
- Who: the paid client first, and the existing clients once they turn WhatsApp on.
- Why it was left: only Hafsah can submit templates to Meta. The template fix was decided this morning and not yet made.
- Recommendation: reword `lead_daily_summary` to end on fixed words, fix `checkin_team_almost_in`'s blank order, then submit every template, including `groundwork_first_contact`, `groundwork_request_waiting`, `groundwork_request_decided`, `groundwork_requests_waiting`, `groundwork_review_started`, `groundwork_review_decided` and the two anchor ones. Until approval, first contact stays by email.

**B3. People held for a seat who have already answered lose every page they can read today (Finding 7).**
- Where: the board, the report and the check-in page refuse anyone with `awaiting_seat` since `39b2c296`. Today (`whatNeedsYou`) does not know about this case either.
- Who: existing users. On the local copy, 41 people on 20 check-ins. The live count is not known.
- Why it was left: it is privacy row 5, which Hafsah kept in decision 93, so the question is hers.
- Recommendation: before release, count them on a copy of the live data with the read-only query in `docs/morning-report.md`. If there are any, either let a person who has already answered keep reading, or clear their hold on release night.

**B6. The seat count: does a guest with an account take a seat? (screens workspace, request 174 item 10) Needs Hafsah.**
- Where: `api/src/common/seats.ts`, and the sentence "Your plan covers 5 people… all 5 are taken" with one person in the check-in and four guests.
- Who: existing users and the paid client.
- Two readings. The prototype (A4 people.txt, "He takes a seat"; F2, "Every person with a Groundwork account… Guests with no account don't") and the 27 September decision (`f7e2bb71`) count a guest with an account as a seat, and the code counts them again (the leave-them-out change, `172aa319`, was reverted in `f1501f86`). `docs/existing-users.md` says the count leaves guests out.
- What it changes: the seats are what an invitation is checked against and what the billing page prints, and plans are priced by team size ("Up to 20 people"). Counting guests can make a plan read as full when only a few people are staff, so a lead is told there is no room, or an organisation is nudged to the next plan sooner; leaving them out frees room and lowers what is counted.
- Why it was left: it is a pricing decision. It is in the morning report under Needs Hafsah.
- Recommendation: Hafsah decides which reading is the rule, and the other document is corrected.

**B7. The release-night steps that only Hafsah or Abubakar can take have not been taken.**
- Where: `docs/deploy.md`: our migrations on a copy of the real data after the backup; the two existing-client checks on a copy of the live data (`existing-clients-compare.ts` and `existing-clients-check.ts`); the four one-off scripts (`stamp-said-word-for-word.ts`, `bring-the-checkability-read-up-to-date.ts`, `give-each-check-in-its-kind-of-work.ts`, `bring-a-check-in-up-to-date.ts`); and step 13a, switching billing on.
- Who: existing users. Without the word-for-word script, existing reports lose their quotation marks and some quoted sentences are dropped. Without the kind-of-work script, existing check-ins keep their old boards, against decision 91.
- Why it was left: they need a copy of the live data and hosted access, which the engine workspace must not touch.
- Recommendation: run them in the order in `docs/deploy.md`, after the backup, each as a dry run first. Read every FAULT, LEAK, ASK and WHERE line before going further.

**B8. The hosted build may run out of memory, and nobody has built on Node 20.**
- Where: `npm run build` in `api/` stopped with "JavaScript heap out of memory" on the screens computer and only built with an 8 GB heap (request 172). The build also compiles every spec under `src/`. Hosting uses Node 20, and only Node 26 was available here.
- Who: everyone, on release day.
- Why it was left: found on 7 October, and Node 20 is not installed on this computer.
- Recommendation: leave the specs out of the production build (`tsconfig.build.json`), or set the heap in the build script. Build once on Node 20 before release.

**B9. Hosting questions that can stop the API or the model are still unanswered.**
- Where: `docs/release-questions.md`, questions 1 to 9. In particular, the API listens only on 127.0.0.1 when `NODE_ENV` is exactly `development`; `us-central1` timed out from this Mac all week; adding a person runs in a five-second transaction that once took 6.8 seconds; the report now runs model calls side by side; and the preview environment might send real email.
- Who: everyone, on release day.
- Why it was left: only Abubakar knows the hosted settings.
- Recommendation: Abubakar answers questions 1 to 9 before release.

**B10. Rate limits may count every visitor as one address.**
- Where: the API does not set "trust proxy", so behind the host's proxy everyone can share one address. The sign-in limit is five a minute.
- Who: everyone, on the live line too. Several people signing in at once can be refused.
- Why it was left: it is the same on live, was not changed by this work, and depends on the host's proxy.
- Recommendation: confirm the proxy hops with Abubakar and set `trust proxy` to match.

**B11. The anchor's lead gets an ordinary check-in, the wrong prompt and the wrong schedule.**
- Where: after the anchor set-up chat, both "I set this up and check in myself" and "I check in once…" open an ordinary first check-in that repeats the opening question, her answered session is saved `NOT_STARTED`, and `/grounds/:id` falls back to the project prompt (requests 167 item 2 and 168 item 3). `RECOMMENDED_CADENCE.HELP_TEAM_UNDERSTAND` is `FORTNIGHTLY` in `grounds.service.ts`, the commit plans 12 sessions and no end, and boards say "Session 1 of 12", where the anchor is one month and weekly (requests 167 item 6 and 168 item 4).
- Who: nobody today (`release.anchorScenario` is off). Every anchor lead once it is on.
- Why it was left: found on 7 October, not yet taken up.
- Recommendation: create no lead check-in for an anchor check-in, set its cadence to weekly, plan only what fits in the month, and walk it again end to end before switching the anchor on.

**B12. An anchor member's check-in still mishandles two of the offers inside it.**
- Where: "Yes, capture it" (an idea) is stored as her answer to the open baseline question, and the next turn asks "What did you understand you were meant to do?"; and with leave on, a reply can still say "I can't directly help with time off requests" when its wording slips past the filter that takes such sentences off (requests 167 item 4, 168 items 5 and 7). The payment offer's Yes closing the check-in, leave and spending being offered while that suite is off, and a reply promising to "pass that leave request to Halima" are fixed (`d2ad4ba7`).
- Who: nobody today. Every anchor member once it is on.
- Why it was left: the idea's Yes goes through the idea reading and the baseline question's own state, which is the anchor walk's (B7), and the filter is a list of sentences, so a new wording needs a new line.
- Recommendation: fix each with a test that reads the reply as the member, then walk it again.

---

## Wrong

**W1. The lead is chased about her own check-in as if she had been invited, and is never asked to add people.**
- Where: the chase email, subject "Your check-in is waiting", body "Your invitation keeps working…". Every chase has that subject, because the code that would choose one is never given the situation.
- Who: existing users and the paid client: every lead who creates a check-in and adds nobody.
- Why it was left: the engagement audit found it on 6 October; decision 109 approved the work, which has not been built yet.
- Recommendation: step 3 of the audit's sequence: when the lead is the only person, use her brief and ask her to add three people, with no "invitation" wording.

**W2. Nothing limits how many emails one person gets in a day.**
- Where: email sending (`sendEmail`, `whetherToSend`). Email and WhatsApp keep separate counts. "<Name> has checked in" goes once for each person who finishes, so an open link with fifty answers sends the lead fifty emails. The question sent after a check-in closes has no "sent" mark, so most people get it twice. The report-not-opened reminder goes every three days with no end.
- Who: existing users and the paid client.
- Why it was left: found by the engagement audit; decision 109 item 6 asks for one routine message a person a day across both channels, not built yet.
- Recommendation: step 1 of the audit's sequence: one place decides send, bundle, wait or nothing, with one daily count shared with WhatsApp.

**W3. Unsubscribing is all or nothing, cannot be undone, and is missing for most people.**
- Where: the footer link unsubscribes on arrival, from every organisation, with no way back. The link and the mail headers are added only for people with a roster row, so most people in organisations that did not import their staff have none. The Settings switch "Check-in reminders" actually silences every email Groundwork decides to send. Held email is sent later without checking the preference again. An email opt-out does not reach WhatsApp.
- Who: existing users and the paid client.
- Why it was left: found by the engagement audit; decision 109 items 4 and 5 set the rules, not built yet.
- Recommendation: step 2 of the audit's sequence: a footer link for everybody, a confirmation page on the footer link (the header's one-click stays), a way back in Settings, a Settings label that says what it covers, and a second check before held mail goes.

**W4. The lead who never opens a report is never followed up, and the email meant for that never goes.**
- Where: the lead's report reminder looks for a status that has not been written since June.
- Who: existing users and the paid client.
- Why it was left: found by the engagement audit.
- Recommendation: step 10 of the audit's sequence, built from the last report's open items.

**W5. When the clock closes an abandoned session, the lead is told the person "has checked in".**
- Where: the "<Name> has checked in on <check-in>" email, sent the same way for a session the clock closed.
- Who: existing users and the paid client: a lead cannot tell a finished check-in from an abandoned one.
- Why it was left: found by the engagement audit.
- Recommendation: say plainly that the session closed after a long quiet, with what was kept.

**W6. The report notice always says everybody has checked in.**
- Where: the round-complete report notice, which is also sent for a late answer.
- Who: existing users and the paid client.
- Why it was left: found by the engagement audit; the three other false sentences it found were fixed in `c19be919`, this one was not.
- Recommendation: say it only when everybody has, as step 5 of the audit's sequence asks.

**W7. Quiet hours hold an email only for people with a roster row.**
- Where: the email door's quiet hours (20:00 to 08:00 in the person's own time). Without a roster row, the sweeps send on a fixed UTC clock, including "ran out of time" at 03:00 UTC.
- Who: existing users, most of whom have no roster row.
- Why it was left: found by the engagement audit.
- Recommendation: fall back to the organisation's time zone when a person has no roster row.

**W8. The lead's daily WhatsApp summary is sent even when there is nothing in it.**
- Where: `the-leads-daily-summary.ts`, for example "In "Sales team, Q4", nobody has checked in yet, out of 1 person."
- Who: the paid client.
- Why it was left: decision 109 item 7 says to skip it when nothing useful happened; not built yet.
- Recommendation: skip it when nothing changed since the last one and nothing waits for the lead.

**W9. The engagement spec's other parts do not exist yet.**
- Where: `docs/engagement-audit.md`, "Exact gaps against the spec". Nothing records how far a check-in has got towards being useful; there is no test check-in; stalls are not told apart; nobody looks at a whole team stopping; no message carries a finding; participants get nothing about their own commitments or waits by email or WhatsApp; the value-first nudge exists only for anchor check-ins; and existing clients' "here's what's new" email from their own data (decision 109 item 2) is not built.
- Who: existing users and the paid client.
- Why it was left: decision 109 lifted the engine freeze this morning, and the work is queued after piece 4.
- Recommendation: follow the audit's sequence, plumbing first, and prove each journey with the tests listed in the audit, as each reader.

**W10. The judgement is right on 15 of the 24 scenarios, and its latest changes have not had a full run.**
- Where: the lead's judgement on the board and in the report. In run-oct5b, 15 were clearly right, 7 partly right and 2 missed: recognition never names the contractor, and shock names one warning sign instead of three. The two release-blocking faults of run 32 (sales and discovery) were addressed in the instruction on 5 October, but whether the model obeys is not proven. The judgement changes after `d59a8b17` were measured only on crisis, snapshot and project, where crisis and project fell from right to partly right.
- Who: every lead.
- Why it was left: a full run takes hours, and Hafsah stopped one on 5 October because the computer was slow.
- Recommendation: one full 24-scenario run on the current head, scored and read sentence by sentence, before anything else in the judgement is changed.

**W11. In the senior-hire scenario, the lead is told patterns that are about the new hire (run 32, findings 31 and 32).**
- Where: the lead's board. Patterns R2 and B9 from Amina's check-in about Tobi are told to Amina as "you", so the chief executive reads that she has a leader and is failing an expectation; the coaching line repeats it; and Tobi's aim "take ownership of client meetings" is shown as hers.
- Who: leads of new-hire check-ins.
- Why it was left: listed in `docs/run-32-review.md` for after the release.
- Recommendation: fix where a pattern's person is chosen, then re-run the seniorhire scenario.

**W12. Reports and boards still state things nobody said (run 32).**
- Where: findings 9 (the deal grid makes deals out of targets and loose phrases), 11 ("the new performance targets" treated as a person), 13, 22 and 56 ("It was 0 at the start and is 0 now" when people gave numbers, and a problem behaviour turned into an aim Daniel "set"), 16 ("You have not yet connected with the team" shown about the lead to her whole team), 26 ("Please provide the bank statements in writing" to the person waiting for them), 43 (the chief executive told to "ask the CEO"), 46 (a false "does not mention the product side"), 47 ("A colleague said Tunde helped them" in a check-in of two), 49 (a person read against the wrong kind of work), 50, 57 and 60 (an invented decision for Tomás), and 63 (a borrower reads an assessment of the programme lead, who is labelled "The loan initiator").
- Who: leads and participants.
- Why it was left: listed in `docs/run-32-review.md` for after the release.
- Recommendation: one commit each, with the scenario it came from re-run, starting with 16, 63 and 47.

**W13. Patterns are not steady from one reading to the next.**
- Where: what a person and then their lead are shown after three periods. The same conversations read twice agree 72% of the time, against the aim of 8 in 10, and only 15% of person-and-pattern findings came back between two separate runs. Since decision 86, patterns reach the lead after the person's turn.
- Who: everyone who is shown a pattern.
- Why it was left: reaching 8 in 10 needs Hafsah's decision on the four patterns that can only be judged across time (item 42); the version that judged them across periods was measured worse and reverted (`d50c7310`).
- Recommendation: measure on a longer run with more people reaching three periods, then decide item 42.

**W14. The scorer's "proof asked for" counts the word "picture", so it hides a real fall.**
- Where: `tools/score_run.py`. "Picture" is Groundwork's own word for shared understanding; in run-oct5b, 27 of the 41 matched only on it. The real requests for proof are roughly 14 now, so the fall is larger than the row shows.
- Who: everyone, because it is the measure of what must not be lost.
- Why it was left: the scorer is on the never-edit list.
- Recommendation: Hafsah decides to drop "picture" from the word list or require a concrete object, then the baseline is read again.

**W15. Existing participants now read only released sessions, and 411 sentences wait for the lead.**
- Where: migration 70 marks each released report as released up to the session finished then.
- Who: existing users who take part in a check-in.
- Why it was left: it is as decided, but whether the lead should release them or the migration should release them all is Hafsah's question.
- Recommendation: Hafsah decides before release night.

**W16. Leads no longer read the stored pattern lines the live line shows them.**
- Where: the board and report. On the local copy, leads of 81 check-ins read 288 such lines on live ("Upward reporting was optimistic while a major account was being lost."). Now a stored line is served only as `earlierRead` beside a live pattern, and the screens do not draw `earlierRead` yet.
- Who: existing leads.
- Why it was left: a lead losing something blocks the release until Hafsah confirms it.
- Recommendation: Hafsah confirms; the screens draw `earlierRead`.

**W17. A warned in-app session now closes at 12 hours of quiet, not about 23, for existing users too.**
- Where: the close sweep counts from the last real word, not from the 11-hour warning.
- Who: existing users who come back between 12 and 23 hours after their last word, who now find the session closed.
- Why it was left: it restores the decided rule, and is listed for Hafsah to confirm.
- Recommendation: confirm, or keep sessions that began before release on the old count.

**W18. Leads of existing check-ins with a say-back waiting now have their next message read by the model, untested.**
- Where: Ask Groundwork. 21 such leads on the local database; the old code read their next message with rules.
- Who: existing leads.
- Why it was left: the comparison check has no model.
- Recommendation: answer those five common questions with the model on a copy before release.

**W19. Ask Groundwork cannot answer some plain questions about a person's own work.**
- Where: "What happened last week?" and "What is due?" get "I cannot answer that one yet" (old and new code alike). "What did I say I would do?" told Esther "You have no open actions." although she had committed to take three credit files to Fatou on Monday, and "open actions" is jargon (request 170 item 7).
- Who: existing users and the paid client.
- Why it was left: the first two were already so on live; the third was found on 7 October.
- Recommendation: answer each from the person's own record, in full sentences.

**W20. The WhatsApp webhook answers Meta only after doing the work.**
- Where: the WhatsApp webhook. The first "START" took 42 to 108 seconds in local runs, and Meta resends a message when it does not get a quick answer. A repeat is answered once, so nothing doubles, but the person waits.
- Who: the paid client, and anyone on WhatsApp.
- Why it was left: it changes how the webhook works.
- Recommendation: answer Meta first, then do the work.

**W21. WhatsApp onboarding, project and anchor check-ins open with a question that does not suit them.**
- Where: "Before anything else, so this asks you the right things: are you the person this check-in is about, or somebody working alongside them?", even when the person is the only one in the check-in, and for anchor members, where the baseline should start with "What are you working on?" (request 167 item 3). The lead's description of the person makes it worse.
- Who: the paid client (onboarding and project check-ins).
- Why it was left: seen in the runs and not looked into.
- Recommendation: skip it where the answer is already known, and never for an anchor member.

**W22. Two of the halfway messages are never retried, and one is never sent on the day a check-in opens.**
- Where: the three WhatsApp halfway messages have no template, so outside the 24 hours they are recorded as not sent, and the carry-on and closed messages are not tried again. The carry-on reminder is held by the one-message-a-day rule on a day the opening notice went, so a session opened and left that day never gets one.
- Who: the paid client.
- Why it was left: decision 107 as written; the day-one gap is for Hafsah.
- Recommendation: let the carry-on reminder count as a closing message (one line in `FIRST_MESSAGES` and `OPENING_OR_CLOSING`), if Hafsah agrees.

**W23. Billing has never been tried in Stripe test mode, and a trial can be cut short.**
- Where: Stripe is not wired and the local key is a placeholder, so the free trial and the WhatsApp add-on were never run through Stripe. A team that subscribes during its free month pays from that day and loses the rest of the month. The sign-up form never asks the team's size, so a team named there is treated as under 20.
- Who: the paid client and new organisations, once the trial switch is on.
- Why it was left: wiring Stripe is Abubakar's task; the trial's end date and the size question are Hafsah's decisions.
- Recommendation: keep the trial off until one test-mode payment with card 4242 passes; give Stripe the trial's end date; ask the team size on the sign-up form.

**W24. The suites say the wrong thing about requests that were passed on or are waiting for someone away (screens workspace, request 173).**
- Where: after the 07:00 job, a passed-on request reads "It was asked for today." though it was asked seven working days ago (`waitedSays` uses `stepSince`). Boards read "It is waiting for Tobi." while Tobi and his stand-in are both away, and nobody at work can act until 07:00. Queue leave rows leave out the board's lines (days left, who else is off, the stand-in), the clash does not count another waiting request for the same days, and "Who is off" on a stand-in's leave board is scoped to the reader ("Nobody is off" while Kito is off). A decline with no reason is accepted.
- Who: the paid client, in the leave and spending suites.
- Why it was left: found on 7 October.
- Recommendation: say how long since it was asked and why it reached this person, say who it waits for and when it passes on (or pass it on at once), and fix each line with a test as the approver.

**W25. The set-up conversation can name the wrong person and change the situation (screens workspace, request 174 item 8).**
- Where: the set-up chat at `/start`. It named the wrong person, switched the situation to "Help a new manager take over", and ignored the name and dates the lead typed.
- Who: existing users and the paid client.
- Why it was left: found on 7 October.
- Recommendation: reproduce it with the same words, then keep a situation the lead chose (request 35's rule) and read typed names and dates first.

**W26. Several pages contradict themselves or promise lines they do not show (screens workspace, requests 170 and 174).**
- Where: the glance "One of the 6 rounds is done. 2 of 3 people have answered this round." (and "round" where the rule says "session"); coaching that tells people with no session "Everything in your session came from memory" and "This is session 1 of 6 of your work as managing director"; "1 worry is on record. It was not kept in the words it was said" when it was; Esther's landing "This is your session 2 of 6." beside "No check-in open right now", her report "still being written" while the board says ready, and "made no commitment" beside "You have made a commitment here"; her You page with no commitments; the end card "Below is what I wrote down… Is anything wrong?" with no lines after it; the Done page marking "What you were waiting on" and "What happens next" as not found though she said both; and the ending page offering "It is not settled yet, and it will be checked again next session." as a way to end.
- Who: existing users and the paid client.
- Why it was left: found on 7 October.
- Recommendation: fix each where the sentence is made, with a test that reads the page as that person.

**W27. Today shows a lead nothing although reports are ready and her own request waits (screens workspace, request 170 item 1).**
- Where: `GET /today` sends Tendai `needs: []` though two of his check-ins have a ready report and his spending request waits; Naomi's three ready reports are missing too.
- Who: existing users and the paid client.
- Why it was left: found on 7 October.
- Recommendation: add ready reports and the reader's own waiting requests to Today, as the prototype's "Today's report … is ready / Read it".

**W28. A resolution read labels a person "Participant B" (screens workspace, request 170 item 6).**
- Where: `confirmations` on the resolution read.
- Who: existing users.
- Why it was left: found on 7 October.
- Recommendation: serve the name through the names wrapper, never a label.

**W29. One answer says a person is worth recognising while saying nothing they said can be checked (screens workspace, request 163 item 7).**
- Where: "What to ask each person" says "Amani Wekesa put one thing on record that anyone could check later, which is worth recognising.", while the same answer's contribution says `nothingCheckable: true`.
- Who: leads.
- Why it was left: found on 6 October.
- Recommendation: read both from the same count.

**W30. The model writes labels about a person into a report's agreements.**
- Where: for example "Tobi Adewale is not yet equipped to manage commercial negotiations or renewals. Everybody agrees on this." (request 123 item 8).
- Who: people on onboarding and evaluation check-ins.
- Why it was left: it is the model's own sentence, and the engine cannot say what is missing without inventing it.
- Recommendation: tell the report prompt to say what the person lacks (the terms, the authority), never a verdict, and prove it from the report's `promptVersionId`.

**W31. Onboarding problems can count against a new person (decision 9 is not enforced).**
- Where: a verdict on a probation check-in counts commitments kept regardless.
- Who: new hires on probation.
- Why it was left: found while building decision 75; nothing in the code enforces decision 9.
- Recommendation: Hafsah confirms, then leave misses that come from onboarding gaps out of the count.

**W32. Boards still lack what the record cannot give them, or say it oddly (requests 127 to 139, 150 and 151).**
- Where: no starting state or headline on a project board with no aim (127 item 1); "they" where the writer must say who (127 item 5, 132 e); "founder or CEO work" from the detected function (127 item 6); a wait said only in a report finding is not on the board (129 item 2); incident themes, sites and stages, and a group's county and "Women" share (130 b and d, 131 item 6); a sales question on a loans check-in (133 item 1); the founder's 11 of 20 not counted into her aim (136 item 1); a goal drawn as "Point to successfully renewed contracts" (139) and "has none of their 4 shops" (151 E8), whose source is not found; and the MarketView Q4 board, which ignores the system figures ("0 of 40" while Paystack shows 31), lists no subscriptions people named, sends no headline or "What needs you", and says "will to confirm" (150).
- Who: leads and participants on those kinds of work. MarketView Q4 is hidden from new check-ins, but six existing check-ins were given that kind by the script.
- Why it was left: most have no field on record to build from; the judgement items need the prompt and a stored version together; 139 and 151 E8 are waiting for the screens to say which field carries them.
- Recommendation: for each, decide whether setup should ask for the missing field; fix 150's wording and counts before the MarketView kinds are offered.

**W33. Prototype parts that are not built.**
- Where: the Company page's Teams and History tabs, "What new people keep asking", linked organisations, "One sales goal still points to last quarter's strategy", the visit log and the per-priority figures; deal stages and what a deal must show at each stage; "By area of work"; the law firm matter line; the onboarding person's 12-week history; "Where this is heading" on a first 90 days (decision 6); the manager's hours against delivered work (against decision 10); calendar connections; the back office rebuild; example chats under "How people ask"; and the developer page's "Add your own" and "Build your own screens" (screens workspace).
- Who: various readers; none of these is something an existing user has today.
- Why it was left: each waits for a decision or was put after the release (decisions 80 and 92).
- Recommendation: Hafsah orders them after the release, one at a time.

**W34. "Ask to join" is not built (request 159).**
- Where: the "Not in this check-in" state shows only "<name> runs it and can add you."
- Who: people who may read a check-in but are not in it.
- Why it was left: it lets a person write to a check-in they are not in, which changes a privacy rule, so it needs Hafsah's yes.
- Recommendation: if Hafsah agrees, a separate `POST /grounds/:id/ask-to-join` for the person themselves only, as written in the answers file.

**W35. Who may mark someone else's to-do as done is not consistent.**
- Where: the lead can mark another person's to-do done through the context chat (`makeTheChange` in `grounds.service.ts`), while the to-do button says only its owner may move it.
- Who: leads and participants.
- Why it was left: it needs Hafsah's decision.
- Recommendation: Hafsah decides; then make both doors follow the same rule.

**W36. The platform's WhatsApp switch does not stop organisations' own numbers.**
- Where: `whatsapp_enabled` stops only Groundwork's own number.
- Who: organisations with their own number.
- Why it was left: listed for Hafsah (item 74 of the 2 October list).
- Recommendation: Hafsah decides whether the platform switch should stop every number.

**W37. The back office misses or misreads some numbers.**
- Where: the console shows no WhatsApp sends and no Ask Groundwork use; the drop-off chart stops at session 7; the "Billing active" or "Free" badge reads an old field rather than the subscription; sessions the clock closed are still counted as completed; "Check-ins this month by WhatsApp" cannot be counted because a turn does not record its channel; and the WhatsApp status card does not say whether the add-on is on.
- Who: staff only.
- Why it was left: the back office rebuild comes last.
- Recommendation: fold into the rebuild, starting with the badge and the channel field.

**W38. The anchor's wording and content are wrong in many places.**
- Where: the action lens "is done and no are still open"; the active line "4/5 active · Groundwork has not nudged the remaining 1 yet." counts the lead, who does not check in, and uses figures and a dot (it is Hafsah's own wording, decision 98, so it waits for her yes); "Groundwork recommends", ideas, people helping and the recognition sentence are empty with the seed; the idea title is served raw; "One of four people have said"; "Where this is heading" lists project endings; the reveal gives a cause the lead never gave and "Juma and The staff"; the invitation says "including your manager" and drops "Hafsah has shared what she's seeing"; "What has happened for you since this began?" in a first check-in; the member's end card says "Rehema also answers a check-in" and "Then that line counts as proven"; the end of month shows zero counts; the ended board still shows the active line (requests 163, 167 and 168). The baseline (version 2) is stored only locally and is not proven to ask all nine things before it closes.
- Who: nobody today; everyone in an anchor check-in once it is on.
- Why it was left: found on 6 and 7 October; the anchor ships off.
- Recommendation: fix each, then one real walk with a lead and two members before the switch is turned on.

**W39. "Use simpler words" raises the work words in reports when it is on, and does not reach everything.**
- Where: with the switch on, jargon in reports and boards was 45 against 22 (one run each side). The report builder's own fixed sentences have no plain form, reminders outside the 24 hours need a plainer approved template, and the embed panel's own "enough to close" sentence in `embed/static/panel.html` is unchanged.
- Who: nobody today (off by default).
- Why it was left: one run per side cannot separate the setting from chance, and a sentence asking the model to avoid those words made it worse.
- Recommendation: run each side twice more before anybody switches it on for a customer.

---

## Untidy

**U1. About 45 smaller wording faults from run 32 are still open.**
- Where: `docs/run-32-review.md`, findings 10, 12, 14, 15, 17 to 21, 23 to 25, 27 to 30, 33 to 35, 38 to 42, 44, 48, 51, 52, 54, 55, 58, 59, 61, 62, 64 and 67 to 74: for example "The renewals" with a capital, "will to track", "own own", "does you" variants, "you ... assumes", "they" for the reader, the word "account", "Clear on what was finished (session 1)", "Since then" with nothing before it, "2 piece of works" and "Deal grid" on work that is not sales. Findings 4 to 8, 36, 37, 45, 53, 65 and 66 are fixed.
- Who: leads and participants.
- Why it was left: listed for after the release.
- Recommendation: bring them under task 1.6's automatic check of what each reader is served, then fix the ones it catches.

**U2. Small wording faults on existing users' pages (screens workspace, request 174).**
- Where: "a confirmation from Rukia Rukia" (a first name stored as the full name is doubled); "Amani Wekesa said describes the start date as October 1st…"; "You and Amani Wekesa are waiting on you…"; emails with "at the same moment.." (two full stops), two "To stop these emails" lines, and three emails to the lead for one completed check-in.
- Who: existing users and the paid client.
- Why it was left: found on 7 October.
- Recommendation: fix each where it is made; bundle the lead's three emails into one (see W2).

**U3. Small wording faults in the suites (screens workspace, request 173 item 5).**
- Where: "spend KES 15,000 for …" and "on …" both used; "KES 17,000 for Safety vests" with a capital mid-sentence; "It is paid from Customer Support budget" (no "the"); digits and words mixed ("seven for leave and 26 to spend"); "Only an admin or a lead can open this board.", which is untrue now that a member who stands in can open it; and "until they decide" where the name is known.
- Who: the paid client.
- Why it was left: found on 7 October.
- Recommendation: one wording pass over the suites' sentences, read as each reader.

**U4. Emails that do not say enough.**
- Where: "Remind them" sends the admins the existing "Add a card" email, which does not say who is waiting; admins are emailed every time a paused check-in is opened, where once a day each would do; the WhatsApp limit email's subject reads "Your Groundwork plan has changed"; and the app says "about ten minutes" where the WhatsApp notice says "about five minutes".
- Who: the paid client and existing admins.
- Why it was left: the email module belongs to another builder, and the minutes need Hafsah.
- Recommendation: one email that names the person and the check-in; once a day for the paused notice; its own subject for the limit; Hafsah picks the minutes.

**U5. Context in Ask Groundwork is hidden, and the old context chat stays the way in.**
- Where: `release.contextInAskGroundwork` is off. Switching the old chat off needs the screens to open Ask from the Context and resources page, a flag the screens can read (`addsContext`, request 169, not served yet), Hafsah's switch on live, and request 92's five live checks again. The plan page's own promise still names only goals, roles and commitments, though it reads seven kinds.
- Who: leads.
- Why it was left: proved side by side on 6 October, waiting on the screens and on Hafsah.
- Recommendation: serve `addsContext` on the Ask read, then follow the steps in `docs/run-log.md`.

**U6. Decisions taken provisionally that still wait for Hafsah.**
- Where: decisions 102 (a goal a person wrote is not rewritten to "you"), 103 (two session counts worded apart) and 104 (pattern A1 reworded); quiet hours of 20:00 to 07:00 in Lagos for approvals, chosen because there were none; "they" for one named person; the ending `REACH_WITH_A_CHANGE`; the list of placeholder surnames; a headline asked without a day; the recognise threshold and whether to switch it on; the two-week window for reviews on Today; prototype fragments turned into sentences on the settings pages (screens workspace); and the twenty or so suites questions in the morning report of 2 October (for example whether a missing receipt blocks payment, whether hours can be declined, and whether a review has an appeal).
- Who: various readers.
- Why it was left: each was taken as the option closest to the prototype and her decisions, and marked for her.
- Recommendation: Hafsah goes through the list once; each is a small change either way.

**U7. The anchor's open decisions.**
- Where: `docs/anchor-scenario-plan.md`, Needs Hafsah 5 (the carrot principle against "never praises"), 6 (the softer evidence question), 12 and 13 (the new situation and no organisation first, both built provisionally) and 15 (the lead's own first check-in); and whether the anchor month is for new organisations only. The plan's own table is also out of date: pieces 14, 19, 22, 26 to 28, 30, 32 and 34 are built but not marked.
- Who: nobody today.
- Why it was left: they are Hafsah's.
- Recommendation: answer them before the anchor is switched on, and update the plan's table.

**U8. Screens left as they are (screens workspace).**
- Where: about 173 one-off style classes and the page-only families left after the clean-up; pages nobody can reach (the old report body in `ReportPage.tsx`, `CreateGroundPage`, `SaveCard.tsx`) not removed; pinned check-ins kept in the browser, so they do not follow a person; the logo takes a signed-in person to the marketing site; the floating "Feedback" button; the government, loans, matter, where-next and MarketView Q4 boards have more buttons than their prototypes; `#/system` not built; and one sentence in `client/src/pages/preview/EveryReportSideBySide.tsx` (line 300) still says "It does not quote anybody".
- Who: everyone sees some of these; most are invisible.
- Why it was left: each waits for Hafsah's call or a later clean-up.
- Recommendation: the screens workspace decides with Hafsah; the preview sentence can be changed now, as the answers file asks.

**U9. Documents that are out of date.**
- Where: `docs/ready-to-deploy.md` still says migration `20260923200000` reopens check-ins and that scenario packs are switched on by hand; `docs/decisions.md` is out of date against `docs/decisions-merged.md`; `docs/whatsapp-templates.md` and `docs/whatsapp-end-to-end.md` say a waiting approval counts as the approver's message of the day, while the code sends it at once; and the release checklist still lists three screen reviews as not done (the suites screens, the Ask chat and the Company page against the prototype).
- Who: staff only.
- Why it was left: the guard refused the edit to `ready-to-deploy.md`, `decisions.md` is protected, and the reviews were never run.
- Recommendation: Hafsah replaces `decisions.md` and corrects `ready-to-deploy.md`; the engine workspace corrects the two WhatsApp documents and runs the three reviews.

**U10. Seeds and test tools with faults.**
- Where: the suites seed (categories read from the wrong place, no currency, no leave kinds, `daysAYear` where `days` is read, requests going to the wrong approver); the Kijani seed (no owners or teams on priorities, no kind of work, no transcripts behind Esther's sessions); the hundred-person seed (a hotel under Equipment, Nadia approving her own request, a stand-in who is away, repeated first names); the company-review seed items 1 to 3 of request 161; the Sokoni Fresh anchor seed (kinds `anchor_offer` and `anchor_idea`, scenario still `REALIGN_TEAM`); the timing-sensitive test `the-report-is-written-in-parallel`; the WhatsApp script cannot read emails its own in-process jobs send; and the dumps have not been run again on the release build.
- Who: staff only.
- Why it was left: found by the screens workspace's walks; seeds are test data, not the product.
- Recommendation: fix the seeds in one pass so the next walks test the product, not the seed.

**U11. The scenario packs' improved versions are not started.**
- Where: the 50 packs were re-exported and verified, but the improved versions and the before-and-after document are not written.
- Who: staff only.
- Why it was left: they need a scored run first, and are a large piece of writing.
- Recommendation: start after the next full run.

**U12. Local databases left on this computer.**
- Where: `gw_compat_scratch`, `gw_compat_from_live_base_1313`, `gw_compat_oct5b`, `gw_final_a`, `gw_final_b`, `gw_final_existing`, `gw_existing_oct5b`, `gw_existing_6oct_a`, `gw_existing_anchor`, `gw_existing_piece2`, `gw_existing_piece3`, `gw_seed_check_158`, `gw_mv_q4_140`, `gw_browser_journeys`, `gw_browser_journeys_2`, `gw_whatsapp_journeys_d92`, `gw_dumps_d92`, `gw_wa_release`, `gw_browser_release`, `gw_wa_oct5b` to `gw_wa_oct5f`, `gw_wa_oct6b`, `gw_wa_oct6d`, `gw_simpler_words`, `gw_suites_e2e`, `gw_suites_e2e2`, `gw_anchor_walk`, `gw_engage_audit` and `gw_wa_own`.
- Who: staff only.
- Why it was left: `dropdb` is not allowed.
- Recommendation: Hafsah drops them when she likes; `gw_review_run26` stays until after release (decision 89).

---

## Count

| Seriousness | Entries |
| --- | --- |
| Privacy | 11 |
| Broken | 10 |
| Wrong | 39 |
| Untidy | 12 |
| **All** | **72** |

---

## Asked of the screens workspace

Please add anything on your side that is missing from this file, in the same shape (what, where, who, why it was left, recommendation), under the right seriousness, marked "(screens workspace)". Merged from your lists so far: requests 159, 161, 163, 167, 168, 169, 170, 172, 173 and 174 from `docs/requests-to-engine.md`, and from `docs/morning-report-ui.md` the admin's To-dos board, the screenshots in the git history, the one-off style classes, the unreachable old pages, the pinned check-ins, the logo, the Feedback button, the extra buttons on five boards, `#/system`, the developer page's two sections, the prototype fragments made into sentences, and the preview page's last old privacy sentence. Requests 1 to 158, 160, 162, 165, 166 and 171 are answered or built in `docs/answers-from-engine.md`, so they are not listed, except their open parts in W32. If anything listed here is already fixed on your side, say so and it will be taken out.

---

## Fixed on 6 and 7 October

Moved out of the list above. Each has a spec read as each person who reads it, and where it could be driven, a run on a local API (`docs/run-log.md`).

- **P2.** A person's own transcript carries nothing the lead typed about them or set up: not her description of them, her expectation of them, their invitation token, the session plan, the labels, or how their answers were rated (`d68ce7dc`, `8b03b56e`). The lead reads her own row whole; a colleague and an admin are refused. The lead's private note on whether a goal was told is served only to whoever runs the check-in (`c8d868c7`), and adding somebody already added returns an explicit shape and ignores a token a caller sends (`9e9dde61`). The live line has the same leak: it spreads the whole row.
- **P13.** In an anchor check-in the lead's own set-up (her aim, what it will cover, what a complete answer holds) is not served to a member, on the check-in page (`db145b50`) or on the board (`d8265840`), whether or not the anchor is on.
- **P3.** A total is given only when three or more people have a number, in every place one is served (`ef85ec06`, decision 110).
- **B4.** A slow reading of the lead's set-up no longer holds the save of a check-in: the save waits for it for up to twenty seconds and answers either way (`990a6640`). The screens' own open-on-load is theirs to check.
- **B5.** People a lead names while her check-in waits for an admin are held, not dropped, and invited once when an admin accepts it (`6c918a75`); and no other door writes to them first: the seat release, the 6 am sweep and the address heals leave a waiting or declined check-in alone, and the approval invites a colleague who already has an account (`009052b9`).
- **B12 (part).** A yes to an offered request never closes an anchor check-in, leave and spending are not offered while that suite is off, and no reply promises to pass a request on (`d2ad4ba7`).

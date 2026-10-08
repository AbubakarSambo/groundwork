# The engagement spec against what is built

Written 8 October 2026 on `wip/release`, starting from head `259df949`. The spec is `docs/engagement-spec.md`, Hafsah's answers are decision 109 (and decision 117 for the report-ready reminder) in `docs/decisions-merged.md`, and the audit it started from is `docs/engagement-audit.md`.

A row says BUILT only when the code that sends, serves or decides it exists on this branch and a spec in the same commit fails without it. It is not a claim that a person has read the result; the journeys in section 36 are driven on the test bed and written up in `docs/engagement-journeys-on-the-test-bed.md`. Every message goes through one door (`EmailService.sendEmail`), so the opt-out, the one routine message a day and quiet hours apply to all of it. All of it begins at the engagement moment (`engagement/the-engagement-release-moment.ts`, row `release.engagement_from`): nothing is written about a check-in that began before it, and nothing about a check-in that has stalled, ended, is held, or waits for an admin.

## Decision 109, item by item

| Item | What it says | State | Where |
| --- | --- | --- | --- |
| 1 | The engine freeze is lifted | Done | This work |
| 2 | Existing clients get the value-first and follow-up messages, starting with one "here is what is new" email | BUILT | `5be085d3`, `4bb3ffc1`, `b01ffa33`, `1afb9a44`; `engagement/heres-what-is-new.ts`, `engagement/the-engagement-release-moment.ts` |
| 3 | Names in lead subjects, to the lead only, as facts | BUILT | `176449ed`, `5f7d735c`, `d3abf532`; `email/the-leads-weekly-letter.ts`, `engagement/the-leads-subjects-carry-the-facts.ts` |
| 4 | One-click unsubscribe stays in the header, the confirmation goes on the footer link | BUILT | `adf53d68`, `1fe53cb2`; `email/unsubscribe.controller.ts`, `engagement/the-ways-to-stop-mail.ts` |
| 5 | Everyone can opt out of optional email, with the confirmation, undone in Settings, transactional mail never affected | BUILT | `adf53d68`, `1fe53cb2`; `email/nothing-goes-out-that-was-turned-off.ts` (what each mail is) |
| 6 | One routine proactive message per person per day, email and WhatsApp together | BUILT | `5d160d26`, `31e7138c`, `08a55613`; `engagement/one-routine-message-a-day.ts` |
| 7 | The daily lead summary is skipped when there is nothing useful | BUILT | `417855b9`, `15a6c4aa`, `e5329af0`; `whatsapp/the-leads-daily-summary.ts` |
| 8 | A test check-in is one where only the lead has taken part after a week, plus the anchor trial | BUILT | `5337114e`, `f08dbaed`; `engagement/a-test-check-in-moves-on.ts` |
| 9 | The 8- and 12-person tests run in a trial or paid organisation | Test setting | Section 36 journeys below |
| 10 | WhatsApp: summary template fixed, follow-up widened to every check-in from the person's own record, one daily count, STOP unchanged | BUILT | `417855b9`, `2e2af68e`, `5d160d26` |
| 117 | "Your report is ready" at most twice, then in the person's regular summary | BUILT | `e16074bc` |

## The spec, section by section

| Spec section | State | Where it is built, or what is missing |
| --- | --- | --- |
| 1. Audit what exists first | BUILT | `docs/engagement-audit.md` (`9fd28f1d`) |
| 2. A created Ground is not an activated user (the stages) | BUILT in this work | `288c9f26`; `engagement/the-activation-funnel.ts`. The stages are read from rows that already exist (no new column, no event), on the usage funnel as `activation`. |
| 3. Groundwork owns the journey to first value | PARTIAL | Each step below exists; there is no single place that reads the stage and picks the step. |
| 4. Created, no people added | BUILT | `40bd550d`, `b01ffa33`, `7d03a8cf`, `600d1953`; `engagement/the-leads-own-first-check-in.ts`, `conversation/remind.service.ts`. Email only. |
| 5. Invited, nobody responds | BUILT | `894cb45d`, `2e1e1678`, `c11cd781`; `conversation/chasing-belongs-to-the-lead.ts`: when the reminders are over. In this work, `7b506fef` and `6a4441ad`: on the first reminder day, while it happens (`engagement/waiting-on-the-people-you-invited.ts`). |
| 6. Some responded, not enough for the full picture | BUILT | `33d2f9f2`; `engagement/a-partial-picture-said-honestly.ts`, used by `reports/reports.listener.ts`. States the limit; makes no team conclusion. |
| 7. The first meaningful insight is the activation moment | BUILT in this work | `80169e01`, `701a5372` (with `9b1df81c`, `cf9f770b`, `fccebaee`, `5d692a14` for how a finding is worded); `engagement/the-first-insight.ts`. The report-ready mail carries what the picture found, as each person is served it, and "what I would do" for the lead. The "I can help you do that" line is not there, see Not built. |
| 8. Test Ground to real Ground | BUILT | `5337114e`; `engagement/a-test-check-in-moves-on.ts` |
| 9. Conversion uses what they tested | BUILT | Same file: sales, project, new hire, other. |
| 10. Lead created a Ground and disappeared | BUILT | Same as section 4: her own brief, first sentence, three people. |
| 11. Lead received a report and then disappeared | BUILT | `19fb038d`, `8b876f4a`, `5c479181`; `engagement/the-report-follow-up.ts`. A week on, one message from what changed and one suggested next check-in; in this work (`032056a3`, `56770fd9`) it also names the difference the report found and judges a next session by one that was started. |
| 12. Participants must receive value too | PARTIAL | `859c199e`, `10081ef0`, `813d836c`; `engagement/the-participants-week.ts`: a weekly email from the person's own You board. Right after a check-in, the participant is sent only the report notice. |
| 13. Subjects carry the insight | BUILT | Lead: the finding of the report, week facts, who had not checked in, who stopped, what moved. Participants: counts, no names (decision 109 item 3), with the finding in the body. |
| 14. Leads need value directly in email | BUILT | The first-insight mail, the Friday letter (`88f1aac3`), gone-quiet, follow-up, "what Groundwork is doing" (`7b506fef`) and "has checked in" mails. |
| 15. Stalled check-ins are engagement intelligence | BUILT | `6f492d08`, `0404b5f1`; `engagement/who-has-gone-quiet.ts`. Never answered and answered-before-then-quiet are told apart. No check-in is shortened. |
| 16. Seven stalled check-ins become an insight | BUILT | Same file, spread across the lead's check-ins. The contrast with "Abigail" is a position, see Needs Hafsah. |
| 17. Value first, then ask | BUILT, for the person's own record | `2e2af68e`, `ae9bae76`, `3a17ad17`, `d7e95128`; `engagement/a-follow-up-from-their-own-record.ts`: before the generic chase, an open promise of theirs (email and WhatsApp), a wait of theirs that has cleared, or one still open (email). Not used: somebody waiting on them (it is a colleague's word), and anything of a colleague's. |
| 18. Good nudging | PARTIAL | Same: the nudge repeats the person's own promise. |
| 19. Whole-team disengagement | BUILT | `who-has-gone-quiet.ts`: more than half of one check-in's people, and at least three, is one message about the team. |
| 20. "What I would do" | BUILT in this work, for the lead | In the first-insight mail (the report's own "what would settle it") and in the Friday letter (the lead's own weekly report, "for you to do next week", at most three, reason only). Not model-worded: no prompt is involved. |
| 21. Positive insight is part of engagement | PARTIAL | A plain named fact where one person did all of it (`0404b5f1`, `176449ed`). Not in the first-insight mail. |
| 22. Sales and target nudging | NOT BUILT | The board holds targets and progress, but request 118 lists faults still open on the board's target numbers (a false "Met", a headline target with no number). A message that quotes "Sales is at 54%" would repeat them. Left for after those are fixed. |
| 23. Contextual discovery of other existing Grounds | BUILT | `8b876f4a`, `5c479181`; `engagement/the-next-check-in-from-what-happened.ts`. One check-in, why, and why now only where the record gives one. |
| 24. Weekly lead email | BUILT in this work | `88f1aac3`, `5667503e`, `ef6d3abf`; `email/the-leads-weekly-letter.ts`, for every check-in still going. The seven parts are there as sentences, not headings: the finding in the subject, what moved, who did not check in and what waits, who Groundwork has reminded, what I would do (at most three), one next check-in. Nothing is sent for a quiet week. |
| 25. Weekly participant email | BUILT | `859c199e`, `10081ef0`, `1a1b9b8d`; `engagement/the-participants-week.ts` |
| 26. Do not over-email | PARTIAL | One routine message a person a day, both channels (item 6). "Bundle" is not built: three people finishing in a minute still send the lead three "has checked in" mails (they are classed as asked for, not routine). |
| 27. Opt-out for organisations not on a paid plan | BUILT, WIDER | Everyone can, paid or not (decision 109 item 5). |
| 28. Opt-out is not a one-click accident | BUILT | The footer link opens a question; only the answer stops anything. The mail program's own button stays one click (item 4). |
| 29. Explain what is lost | BUILT | Lead, participant and anyone else each read their own wording: `engagement/the-ways-to-stop-mail.ts`. |
| 30. Confirmation | BUILT | "Keep email insights" and "Turn off email insights"; screen: `client/src/pages/mail/StopMailPage.tsx`. |
| 31. Opt-out does not destroy the product | BUILT | Only mail we decide to send stops; sign-in, invitations, reports they took part in, approvals and billing keep arriving; history is untouched. |
| 32. Paid plan behaviour | BUILT | No plan rule exists for email and none was invented (decision 109 item 5). |
| 33. Email prioritisation | PARTIAL | One door decides send, hold, suppress with the reason written to `Notification`. There is no "bundle". |
| 34. Measure activation and retention | BUILT in this work | `288c9f26`: the stages, where a check-in stands now, leads who came back, and mail sent against mail stopped on purpose. Repeat use of a participant, and "stalled participant came back", are not measured, see Not built. |
| 35. Do not optimise for open rate | BUILT | Opens are ignored; nothing is built on them. |
| 36. Required journeys | See below | Driven on the test bed. |

## Section 36, by journey

| Journey | Built by | Spec that fails without it |
| --- | --- | --- |
| 1. Created, lead disappears | `40bd550d` | `engagement/the-lead-who-added-nobody.spec.ts` |
| 2. Test to real | `5337114e` | `engagement/a-test-check-in-moves-on.spec.ts` |
| 3. Invited, nobody responds | `894cb45d`, `7b506fef` | `engagement/invited-and-nobody-responded.spec.ts`, `engagement/waiting-on-the-people-you-invited.spec.ts` |
| 4. Partial participation | `33d2f9f2` | `engagement/partial-participation.spec.ts` |
| 5. First value | `80169e01`, `701a5372` | `engagement/the-first-insight.spec.ts` |
| 6. Lead disappears after report | `19fb038d`, `032056a3` | `engagement/the-report-follow-up.spec.ts`, `engagement/the-report-follow-up-names-the-difference.spec.ts` |
| 7. Seven stalled | `6f492d08`, `86b81429` | `engagement/who-has-gone-quiet.spec.ts` |
| 8. Participant has not seen value | `2e2af68e`, `3a17ad17`, `d7e95128` | `engagement/a-follow-up-for-every-check-in.spec.ts`, `engagement/a-follow-up-from-a-wait.spec.ts` |
| 9. Team disengagement | `6f492d08` | `engagement/who-has-gone-quiet.spec.ts` |
| 10. Useful participant email | `859c199e` | `engagement/the-participants-week.spec.ts` |
| 11. Email volume | `5d160d26`, `08a55613` | `engagement/one-routine-message-a-day.spec.ts`, `engagement/the-section-36-journeys-with-doubles.spec.ts` |
| 12. Contextual next Ground | `8b876f4a` | `engagement/a-next-check-in-from-what-happened.spec.ts` |
| 13 to 15. Opt-out, as a free-organisation person, a lead and a participant | `adf53d68`, `1fe53cb2` | `engagement/everyone-can-stop-the-mail-we-decide-to-send.spec.ts` |
| 16. Opted-out user | `adf53d68` | `engagement/the-section-36-journeys-with-doubles.spec.ts` |

## Built in this work

Each is one commit with a spec that fails without it. The journeys these were driven in, and what each person read, are in `docs/engagement-journeys-on-the-test-bed.md`.

| Commit | What | Files |
| --- | --- | --- |
| `615d7f0e` | The "people in this check-in, including your manager, can see what you say in it" footer is left off mail where it is not true (review appeals, the admin added after one, back-office alerts, bills, API decisions, requests, the lead's notices) | `email/what-groundwork-is.ts` |
| `80169e01`, `701a5372` | The first meaningful insight is in the report-ready mail, for the lead and for participants (spec 7) | `engagement/the-first-insight.ts`, `reports/reports.service.ts`, `email/email.service.ts` |
| `9b1df81c`, `cf9f770b`, `fccebaee`, `5d692a14` | A difference the report wrote as a sentence is said as one, in the mail and in the report's own question; a long one is not cut | `reports/what-people-said-differently-about.ts`, `engagement/the-first-insight.ts` |
| `88f1aac3`, `5667503e`, `ef6d3abf` | The Friday letter for every check-in still going, with what moved, who was reminded, what to do and one next check-in (spec 24, 20) | `email/the-leads-weekly-letter.ts`, `engagement/the-leads-own-weekly-report.ts`, `grounds/grounds.cron.ts` |
| `288c9f26` | The activation funnel and mail sent against mail stopped on purpose (spec 2, 34, 35) | `engagement/the-activation-funnel.ts`, `prompts/prompts.service.ts` |
| `032056a3`, `56770fd9` | The follow-up after a report names the difference; a session "opened" is judged by one started, not by the date of its row | `engagement/the-report-follow-up.ts`, `engagement/who-has-gone-quiet.ts` |
| `3a17ad17`, `d7e95128` | Value first for a person with a wait, and for one whose wait has cleared (spec 17) | `engagement/a-follow-up-from-their-own-record.ts` |
| `4bad777e`, `474740d8` | The lead's partial-participation counts add up when she has not answered herself (spec 6) | `engagement/a-partial-picture-said-honestly.ts`, `reports/reports.listener.ts` |
| `6d245ab7` | The record of a message is stamped by the application's clock, so the day's one-message count works when the clock is moved | `email/email.service.ts` |
| `557bf249` | Chase days count from when a session opens | `conversation/remind.service.ts` |
| `86b81429`, `77b69ed8` | The "most of a team has not answered" message keeps the positive and names no cause (spec 16, 19, 21) | `engagement/who-has-gone-quiet.ts` |
| `b496c473` | The participant's week no longer says a thing twice | `engagement/the-participants-week.ts` |
| `7b506fef`, `6a4441ad` | While invited people have not started, the lead is told what Groundwork is doing (spec 5) | `engagement/waiting-on-the-people-you-invited.ts`, `engagement/the-ways-to-stop-mail.ts` |
| `214ae28d` | The one "what is new" to an existing client's lead also says the two new things | `engagement/heres-what-is-new.ts` |
| `48c210c6` | The existing-clients carry-on check runs the engagement jobs | `api/journey/existing-clients-carry-on.spec.ts` |
| `d42f8326` | The lead's insights run before the morning's reminders | `grounds/grounds.cron.ts` |

## Not built, and why

| What | Why |
| --- | --- |
| Sales and target nudging (spec 22: "Sales is at 54%; 3 opportunities could still close the gap") | The board's target numbers still have faults listed in request 118 (a false "Met", a headline target with no number). A message that quotes them would repeat them. After those are fixed. |
| Bundling the lead's "X has checked in" mails into one (spec 26, journey 11) | They are classed as mail the lead asked for, so the day's one-message rule does not touch them, and an existing client's lead gets each one today. Folding them changes what a lead is told and when. Needs Hafsah's yes. |
| WhatsApp forms of the new messages (the first insight, the Friday letter, "what Groundwork is doing") | No Meta template is approved, and each needs wording Meta approves word for word. What WhatsApp already has: the shared daily count, the widened follow-up, the daily summary (decision 109 item 10). The report notice's blank carries the count line, not the finding. |
| "I can help you do that" (spec 7) | There is no route that opens Ask Groundwork with a question already put. Written for the screens in `docs/answers-from-engine.md`. |
| Which message brought a person back (spec 15, "stalled participant who returns after insight", and "re-engaged") | Nothing records which message an answer came from, and opens are deliberately not recorded (spec 35). It needs the link to carry its source. |
| A participant's blocker or "who is waiting on you" in a nudge | A colleague's word reaches the participant (decision 73 item 1). The You board and the weekly email already say it with their naming rule. |
| Showing the funnel | A screen: the back office usage tab. Written for the screens workspace. |
| A deep, per-person lead insight such as "Check in with James directly; his participation dropped when two commitments stalled" | It reads as a judgement of a person (CLAUDE.md, decision 11). Not built, on purpose. |

## For Hafsah

1. Bundling the "has checked in" mails (above): yes or no.
2. The Friday letter now goes, for every lead, when her team did something that week. It replaces nothing and is a mail we decide to send (the stop link stops it). An existing client's lead is told once, in "what is new". If you would rather it start only for check-ins made after the release, it is one line.
3. The participant's weekly summary and the report reminder compete for the day's one message, and the earlier one wins (the reminder, at 09:00 UTC, beats the summary at 11:15 UTC on a Thursday). The summary is the one with value. I moved the lead's insights ahead of the reminders and left the participant's summary where it was; moving it too is a change of schedule for every participant.

## Participant activation

Written 8 October 2026 on `wip/release`. The spec is `docs/participant-activation-spec.md` (Hafsah's, word for word), built as the participant half of the engagement work above and within her decisions: Groundwork's own WhatsApp number is the main one (112), at most one routine message a person a day across email and WhatsApp (109 item 6), no rankings or labels on people, existing users only ever get better, and no new WhatsApp template without her. A row says BUILT only where the code that sends, serves or decides it exists on this branch and a spec fails without it. Every message here goes through the doors the engagement work built: `EmailService.sendEmail` for mail and `WhatsAppService.sendFor` for WhatsApp, so the opt-out, the one routine message a day, quiet hours, STOP and "not now" apply to all of it.

### What was built in this piece

| Commit | What | Files |
| --- | --- | --- |
| `ec2408b5` | A phone number on record is not a person reached. Each morning, the WhatsApp reminders also ask, of every open session that has not been started, whether Groundwork has ever got a WhatsApp message through to that person's number. If not, they are sent the opening notice's own words once, as the day's one routine message and never as a second. Same template as `checkin_open`, so no new template. | `engagement/a-person-the-opening-never-reached.ts`, `grounds/grounds.cron.ts`, `whatsapp/a-message-outside-the-window.ts` |
| `e2365578` | The funnel counts people as well as check-ins: invited, reached, verified, engaged, in a habit, and where those who stopped stand. | `engagement/the-activation-funnel.ts` |
| `1482e052` | The record of a WhatsApp message is stamped by the application's clock, as the email record is, so the day's one-message count is the same count for both doors (found on the test bed). | `whatsapp/whatsapp.service.ts` |

The lead's daily nudge (decision 120) is the other half of the piece and is in the section above ("Built in this work") only by reference: `6e6827a9`, `1c5417be`, `2bcf0f81`, `58a8b317`, `da21062e`, `a3aa2a6e`; `engagement/the-leads-daily-nudge.ts`.

### Section 2, the ten bottlenecks

| Participant state | State | Where it is built, or what is missing |
| --- | --- | --- |
| Added but never invited | BUILT | The invitation goes when the person is added (`grounds/grounds.service.ts`, `addParticipant`). One that waits goes on its own: on the person's first day (`grounds.cron.ts`, `inviteJoinersWhoStartToday`), when a seat frees, and when an admin accepts the check-in. Nothing waits for the lead. Those still not invited are now counted (`stuck.notInvited`, `e2365578`). |
| Invited but not verified | PARTIAL | The reminders go on the lead's chase days, 3, 7 and 14 by default (`conversation/remind.service.ts`), with the link that signs the person in. Two days before the link lapses the person is told, and a lapsed link is a form that sends a fresh one (`participants/how-long-an-invite-lasts.ts`, `grounds.cron.ts` `tellThemBeforeAnInviteLapses`). Not built: a reminder that says what the person gains. The words of the reminder are fixed ("Your check-in for X is still open"); changing them changes every reminder to every person. |
| Email invitation ignored | BUILT, for an open session | Once WhatsApp is on for the person's organisation and they have a number, the opening notice goes when the session opens, and the catch-up goes if it never reached them (`ec2408b5`). There is no separate "day 4" switch to WhatsApp. |
| Number exists but WhatsApp was never sent | BUILT | `engagement/a-person-the-opening-never-reached.ts` (`ec2408b5`). It asks the send record, so it is true after a restart, and a welcome is for a number and not for a session: once any message has gone to the number, it is reached. Only for a session open for at least a day and at most three weeks. |
| WhatsApp message failed | PARTIAL | A message that was refused or could not go is written down with its reason (`WhatsAppSend`) and does not count as reaching the person, so the catch-up tries again the next morning (`ec2408b5`). The invitation email goes at the same time, so another channel is already open. Not built: a failure Meta reports after it accepted the message. Groundwork does not read Meta's delivery statuses (sent, delivered, read, failed) at all; that needs two columns on `WhatsAppSend` and the webhook to read them, so a migration. |
| Verified but never checked in | PARTIAL | The chase on the lead's days, and the value-first follow-up from the person's own record (`engagement/a-follow-up-from-their-own-record.ts`). Not built: a first message that asks one small question. The message is written as a proposed template, not submitted (`docs/whatsapp-templates.md`, `groundwork_first_question`). |
| Started but abandoned | PARTIAL | What they said is kept. After three hours of quiet one reminder to carry on, at eleven hours the warning, and at twelve hours the clock closes it with what was said and the report follows (`whatsapp/a-check-in-left-halfway.ts`). The reminder is on WhatsApp for a session done there, and is off at release (`release.whatsappHalfwayMessages`). Not built: carrying on days later from the exact point. A closed session is finished with what was said. |
| Completed one but never returned | PARTIAL | The next session opens with its notice; the weekly email from the person's own board (`engagement/the-participants-week.ts`); the follow-up from their own record. |
| Regular participant becoming inactive | PARTIAL | The same, and the lead is told who has gone quiet (`engagement/who-has-gone-quiet.ts`). Not built: a message to the person that recognises what they gave. |
| Repeatedly ignores messages | PARTIAL | The chase ends after the lead's last chase day and the lead is told it is hers now (`conversation/chasing-belongs-to-the-lead.ts`); each person has "stop these reminders" on the reminder, the email opt-out in Settings, and "not now" and "stop" on WhatsApp; and one routine message a day. Not built: fewer messages the more are ignored. It changes what leads rely on, so it needs Hafsah's yes. |

### Section 3, the ten strategies

| Strategy | State | Where, or why not |
| --- | --- | --- |
| A. Verification feels worthwhile, one tap | PARTIAL | One tap is built: the invitation link signs the person in with no password and no form (`MagicVerifyPage`, the join page). The benefit sentence is not, for the reason in the second row above. The spec's example calls the space private. The people in a check-in, including a manager, can read what a person says in it (CLAUDE.md, privacy), so Groundwork does not write "private". |
| B. Activate existing numbers when WhatsApp goes live | BUILT | `ec2408b5`. Sent, delivered, failed, replied and opted out: sent, failed and opted out ("stop") are kept apart in the send record; replied is the person's own message (`WhatsAppInboundMessage`); delivered is not kept, see the failed row above. |
| C. A reason to check in before asking for updates | NOT BUILT | The words are Hafsah's and need a template outside the 24 hours. Proposed, not submitted: `groundwork_first_question`. |
| D. Unfinished conversations are the re-entry point | PARTIAL | As in the abandoned row. |
| E. Personal ownership | PARTIAL | Their own promise said back (`a-follow-up-from-their-own-record.ts`, email and WhatsApp), their own board and weekly email. Not built: help to prepare for a responsibility, which is the conversation's work. |
| F. The first check-in is very easy | NOT TOUCHED | That is the conversation and its prompts, which this piece does not change. |
| G. Visible evidence that contributing matters | PARTIAL | The first-insight mail carries what the picture found (`engagement/the-first-insight.ts`). Not built: "since you raised X". Proposed, not submitted: `groundwork_since_you_last_wrote`. |
| H. Recognition without rankings | NOT BUILT, on purpose | Recognition has to name a specific thing a person did and no comparison. It needs wording from Hafsah. |
| I. Context-aware nudges | PARTIAL | The follow-up is triggered by the person's own record; the chase is on the lead's days. |
| J. Learn what motivates each person | NOT BUILT, on purpose | The spec itself says to avoid invasive profiles. Nothing here learns a person. |

### Sections 4 to 8

| Part of the spec | State | Where, or why not |
| --- | --- | --- |
| 4. The sequence, day 0 to day 14 | PARTIAL | There is no fixed sequence. The lead's chase days (3, 7, 14 by default), the opening notice and the catch-up do the work, and every one of them reads the person's current state, so each stops by itself when the person acts. |
| 5. Activation state tracking | BUILT | `theParticipantStages` in `engagement/the-activation-funnel.ts` (`e2365578`), read from rows that already exist; no new column. |
| 5. Channel readiness | BUILT | The catch-up asks each morning, so WhatsApp becoming available or a number being added is noticed the next morning (`ec2408b5`). Email is always on. |
| 5. Delivery reconciliation | PARTIAL | Email: sent, delivered, bounced and complained, from the Resend webhook (`email/resend-webhook.controller.ts`). WhatsApp: sent and failed. Delivered and read are not kept (see above). Replied is the person's own message. |
| 5. Personalised message generation | PARTIAL | From the person's own record where there is one. Nothing is written by the model. |
| 5. Conversation recovery | PARTIAL | As in the abandoned row. |
| 5. Engagement memory (which prompts were answered, ignored or found useful) | NOT BUILT | Nothing records which message a person answered, and opens are deliberately not recorded (engagement spec section 35). It needs the link to carry its source. |
| 5. Adaptive timing | NOT BUILT | The hours are fixed by the sweeps and quiet hours. Learning a person's hour is a profile of a person, which the spec warns against. |
| 5. Nudge fatigue protection | BUILT | One routine message a person a day across both doors (`engagement/one-routine-message-a-day.ts`), made true on the test bed by `1482e052`. The less-the-more-ignored rule is not built (the last row of section 2). |
| 5. Feedback and recognition | PARTIAL | As G and H. |
| 5. Self-service controls | BUILT | The stop link on a reminder, the email opt-out in Settings, "not now" and "stop" on WhatsApp. A switch in Settings for WhatsApp is a screen and a small route, written for the screens in `docs/answers-from-engine.md`. |
| 6. Reach, verification, first value, return, contribution, retention | PARTIAL | Reach, verification, first value (engaged), return and retention (in a habit, went quiet) are counted for people (`e2365578`), and the engagement mail by what became of it. Contribution (meaningful information) is not counted. Which invitation, channel or opening works best is not compared, because there are no variants to compare. The five reasons (unreachable, does not understand, sees no value, too busy, does not want to) are not told apart: nothing in the record says which. |
| 7. WhatsApp as the natural entry point | BUILT | A reply to the opening notice, or START, goes straight into that check-in (decision 106 item 1); a number is not an identity, and what a person may read is checked the same way as in the app (`whatsapp/a-phone-number-is-not-an-identity.spec.ts`). |
| 8. What to build first | | 1 BUILT (`ec2408b5`). 2 BUILT, see the second row of section 2. 3 PARTIAL. 4 PARTIAL. 5 PARTIAL. 6 PARTIAL. |

### Left, and who decides

1. The words for a first small question and for "since you raised X", and whether to submit the two proposed templates (`docs/whatsapp-templates.md`). Hafsah.
2. Whether Groundwork writes "private" to a new participant (the spec's example does). It is not true of a check-in. Hafsah.
3. Fewer messages the more are ignored. Hafsah's yes, because it changes what leads rely on.
4. Meta's delivery statuses (delivered, read, failed after accepting): a migration and the webhook. Ready to build when asked.
5. The screens: the back office usage tab shows the participant stages; Settings could hold a switch for WhatsApp; Today shows `GET /today/outstanding`. Written in `docs/answers-from-engine.md`.

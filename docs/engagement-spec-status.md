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
| 2. A created Ground is not an activated user (the stages) | NOT BUILT | Nothing records how far a check-in has got. `UsageEventType.CHECK_IN_STARTED` and `PARTICIPANT_ACCEPTED` exist in the schema and are never written. Built in this work, see "Built in this work". |
| 3. Groundwork owns the journey to first value | PARTIAL | Each step below exists; there is no single place that reads the stage and picks the step. |
| 4. Created, no people added | BUILT | `40bd550d`, `b01ffa33`, `7d03a8cf`, `600d1953`; `engagement/the-leads-own-first-check-in.ts`, `conversation/remind.service.ts`. Email only. |
| 5. Invited, nobody responds | BUILT | `894cb45d`, `2e1e1678`, `c11cd781`; `conversation/chasing-belongs-to-the-lead.ts`. Says what Groundwork did, that it has stopped, and offers words to send. |
| 6. Some responded, not enough for the full picture | BUILT | `33d2f9f2`; `engagement/a-partial-picture-said-honestly.ts`, used by `reports/reports.listener.ts`. States the limit; makes no team conclusion. |
| 7. The first meaningful insight is the activation moment | NOT BUILT (before this work) | The report-ready subject carried a count and the body carried no finding (`d3abf532` only added counts). Built in this work. |
| 8. Test Ground to real Ground | BUILT | `5337114e`; `engagement/a-test-check-in-moves-on.ts` |
| 9. Conversion uses what they tested | BUILT | Same file: sales, project, new hire, other. |
| 10. Lead created a Ground and disappeared | BUILT | Same as section 4: her own brief, first sentence, three people. |
| 11. Lead received a report and then disappeared | PARTIAL | `19fb038d`, `8b876f4a`, `5c479181`; `engagement/the-report-follow-up.ts`. A week on, one message from what changed (counts) and one suggested next check-in. It does not name the difference the report found. Built in this work. |
| 12. Participants must receive value too | PARTIAL | `859c199e`, `10081ef0`, `813d836c`; `engagement/the-participants-week.ts`: a weekly email from the person's own You board. Right after a check-in, the participant is sent only the report notice. |
| 13. Subjects carry the insight | PARTIAL | Lead: week facts, count of who checked in, who had not, who stopped, what moved. Participants: counts, no names (decision 109 item 3). The report-ready subject for the lead did not carry the finding. Built in this work. |
| 14. Leads need value directly in email | PARTIAL | The weekly letter, gone-quiet, follow-up and "has checked in" mails carry facts. Only anchor check-ins got the weekly letter. Built in this work. |
| 15. Stalled check-ins are engagement intelligence | BUILT | `6f492d08`, `0404b5f1`; `engagement/who-has-gone-quiet.ts`. Never answered and answered-before-then-quiet are told apart. No check-in is shortened. |
| 16. Seven stalled check-ins become an insight | BUILT | Same file, spread across the lead's check-ins. The contrast with "Abigail" is a position, see Needs Hafsah. |
| 17. Value first, then ask | PARTIAL | `2e2af68e`, `ae9bae76`, `a-follow-up-from-their-own-record.ts`: an open promise of the person's own is said back before the generic chase, by email and WhatsApp. A blocker the person raised, or someone waiting on them, is not used. |
| 18. Good nudging | PARTIAL | Same: the nudge repeats the person's own promise. |
| 19. Whole-team disengagement | BUILT | `who-has-gone-quiet.ts`: more than half of one check-in's people, and at least three, is one message about the team. |
| 20. "What I would do" | NOT BUILT (before this work) | Built in this work, from the report's own "what would settle it" and from the record. |
| 21. Positive insight is part of engagement | PARTIAL | A plain named fact where one person did all of it (`0404b5f1`, `176449ed`). Not in the first-insight mail. |
| 22. Sales and target nudging | NOT BUILT | The board holds targets and progress, but request 118 lists faults still open on the board's target numbers (a false "Met", a headline target with no number). A message that quotes "Sales is at 54%" would repeat them. Left for after those are fixed. |
| 23. Contextual discovery of other existing Grounds | BUILT | `8b876f4a`, `5c479181`; `engagement/the-next-check-in-from-what-happened.ts`. One check-in, why, and why now only where the record gives one. |
| 24. Weekly lead email | PARTIAL | The weekly letter (Friday, `email/the-leads-weekly-letter.ts`) is counts, anchor check-ins only. Built in this work for every lead's check-ins. |
| 25. Weekly participant email | BUILT | `859c199e`, `10081ef0`, `1a1b9b8d`; `engagement/the-participants-week.ts` |
| 26. Do not over-email | PARTIAL | One routine message a person a day, both channels (item 6). "Bundle" is not built: three people finishing in a minute still send the lead three "has checked in" mails (they are classed as asked for, not routine). |
| 27. Opt-out for organisations not on a paid plan | BUILT, WIDER | Everyone can, paid or not (decision 109 item 5). |
| 28. Opt-out is not a one-click accident | BUILT | The footer link opens a question; only the answer stops anything. The mail program's own button stays one click (item 4). |
| 29. Explain what is lost | BUILT | Lead, participant and anyone else each read their own wording: `engagement/the-ways-to-stop-mail.ts`. |
| 30. Confirmation | BUILT | "Keep email insights" and "Turn off email insights"; screen: `client/src/pages/mail/StopMailPage.tsx`. |
| 31. Opt-out does not destroy the product | BUILT | Only mail we decide to send stops; sign-in, invitations, reports they took part in, approvals and billing keep arriving; history is untouched. |
| 32. Paid plan behaviour | BUILT | No plan rule exists for email and none was invented (decision 109 item 5). |
| 33. Email prioritisation | PARTIAL | One door decides send, hold, suppress with the reason written to `Notification`. There is no "bundle". |
| 34. Measure activation and retention | NOT BUILT (before this work) | Built in this work. |
| 35. Do not optimise for open rate | BUILT | Opens are ignored; nothing is built on them. |
| 36. Required journeys | See below | Driven on the test bed. |

## Section 36, by journey

| Journey | Built by | Spec that fails without it |
| --- | --- | --- |
| 1. Created, lead disappears | `40bd550d` | `engagement/the-lead-who-added-nobody.spec.ts` |
| 2. Test to real | `5337114e` | `engagement/a-test-check-in-moves-on.spec.ts` |
| 3. Invited, nobody responds | `894cb45d` | `engagement/invited-and-nobody-responded.spec.ts` |
| 4. Partial participation | `33d2f9f2` | `engagement/partial-participation.spec.ts` |
| 5. First value | Built in this work | See "Built in this work" |
| 6. Lead disappears after report | `19fb038d` | `engagement/the-report-follow-up.spec.ts` |
| 7. Seven stalled | `6f492d08` | `engagement/who-has-gone-quiet.spec.ts` |
| 8. Participant has not seen value | `2e2af68e` | `engagement/a-follow-up-for-every-check-in.spec.ts` |
| 9. Team disengagement | `6f492d08` | `engagement/who-has-gone-quiet.spec.ts` |
| 10. Useful participant email | `859c199e` | `engagement/the-participants-week.spec.ts` |
| 11. Email volume | `5d160d26`, `08a55613` | `engagement/one-routine-message-a-day.spec.ts`, `engagement/the-section-36-journeys-with-doubles.spec.ts` |
| 12. Contextual next Ground | `8b876f4a` | `engagement/a-next-check-in-from-what-happened.spec.ts` |
| 13 to 15. Opt-out, as a free-organisation person, a lead and a participant | `adf53d68`, `1fe53cb2` | `engagement/everyone-can-stop-the-mail-we-decide-to-send.spec.ts` |
| 16. Opted-out user | `adf53d68` | `engagement/the-section-36-journeys-with-doubles.spec.ts` |

## Built in this work

(Filled in as each commit lands. See the end of this file.)

## Not built, and why

(Filled in at the end.)

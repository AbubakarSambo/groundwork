# Issues and ideas waiting for the next fix plan

Everything here waits until the current run is finished (milestone 1's smoke test and judged runs, from 3 November 2026). After the run, it is grouped by root cause into `docs/fix-plan.md`, built as one set, then run again. Only a bug that stops a run from finishing is fixed during it.

## Agreed, waiting to be built

| # | Issue | Source | Evidence |
|---|---|---|---|
| 1 | **Openers and first questions prepared in advance.** At the end of each session, prepare each person's opener and first question from the record and the session plan, and store them with a note of what they were based on. Prepare them again when something relevant changes before the next session. On open, show them straight away if nothing changed; if something did, show a plain fact line straight away and prepare the question fresh. The opener is one plain fact by name, always followed by the first question, and never stands alone. | Hafsah, 3 November night (word for word in `~/Desktop/next-steps/plan-approved.md`) | Opening a check-in takes about 7 s in model calls (session plan 4.3 s, then the opener 2.7 s), measured on bed round 35 |
| 2 | **Stream later replies sentence by sentence.** Each sentence appears once written and once it passes its quick checks (untrue facts against the record, private information, banned phrasing). The full-reply checks run at the end. If one fails, it is corrected openly in the next line ("Correction: ..."). Text already read is never rewritten. | Hafsah, 3 November night | Today the whole reply is held until its checks pass (B-092), so first words come with the full reply: 2.2 s at the median, 4.0 s at the slowest |
| 3 | **Desktop check-in and setup use the full width, like Slack.** The app's sidebar sits on the left and the conversation fills the rest of the screen, with messages flowing down it and the typing box across the bottom. Each message's text is kept to a comfortable reading width. The phone layout stays exactly as it is. | Hafsah, 3 November | Desktop shows the phone layout, a narrow column in the middle (`~/Desktop/next-steps/screens-after/*-1440.png`) |
| 3b | **Check-in opens the chat directly, like a channel in Slack.** Pressing Check-in today goes to a page with a "Check in yourself" button. Instead: if a check-in is open, its conversation is there, ready to type into; if not, the last conversation shows, with one quiet line at the bottom ("Your next check-in opens tomorrow at 8am") and the box to add something. No page in between, for leads or team members, on desktop or phone. To be done with item 3. | Hafsah, 3 November | Her use of the product |
| 4 | **The boards match the prototype and make sense at a glance.** Each board matches the prototype's layout and look, and reads in order for a busy lead: where things stand against the target, then what needs them, what's closing, and the team, with everything else folded below. Compare each board with the prototype screen by screen, with before and after screenshots. Judge it by whether a lead understands it in under a minute. | Hafsah, 3 November | Her review of the current boards |

## Found, waiting for the fix plan

| # | Issue | Source | Evidence |
|---|---|---|---|
| 5 | The read-back before a check-in closes comes from the conversation's working notes, while the end card and pages come from the close's assessment. These are two readings of the same words and can word a line differently (one source for each thing). | Claude, fix build 958ffb55a | Build note in plan-approved.md |
| 6 | Right after Send, the board says "Your full report is ready in a moment" and also shows "Your own report… Read it". | Claude, evening build | Live walk, `~/Desktop/next-steps/screens-after/send/` |
| 7 | Taking "Set the context" and "Add people" off the check-in screen undoes an older fix Hafsah asked for. The tabs still have both. | Claude, evening build f9a83cd1c | `~/Desktop/next-steps/screens-inventory.md` |
| 8 | A check-in reply mixed up dates: "On Friday, 13 November, you described the court deadline for Kasarani Foods as 13 November. What changed?" | Claude, reading the after screenshots | `~/Desktop/next-steps/screens-after/checkin-reply-390.png` |
| 9 | Specs across the whole repo that already fail on wip/plan: no-method-in-here-is-dead, nothing-in-here-is-wired-to-nothing, a-guard-that-a-comment-satisfies, engines-copy-yoda (61 lines against 35), one-date-format, a-check-that-can-never-be-true, two Ask/grounds specs, the member-recommends spec's first test, plus client specs kit 44px, answers-the-server-kept, one-word "ground", scroll-to, whatsapp-is-on, who-was-not-invited. All must pass before a pull request. | Builders, 3 November | Their reports |
| 10 | When an anonymous visitor saves, they still wait for the report. | Smoke run, round 32 | Smoke findings |
| 11 | The logo on a signed-in production screen: should it go to the marketing site or to Today? | Smoke run, round 31 | The walker reached www.myground.work from the logo |
| 12 | About 18 leftover local test databases (gw_speed* and gw_loop_round33_try to 36_try). Hafsah to drop them, because the guard blocks dropping a database. | Claude | `psql -l` |
| 13 | "About two minutes" was measured on simulated people who answer instantly (median 1.6 minutes over 519 check-ins on gw_loop_round16). A real person giving 6 to 10 replies on a phone probably takes several minutes. Only real sessions can settle it (`product.session_minutes_median`). The figure is one line in `api/src/common/how-long-a-check-in-takes.ts`. | Builder, 9792d707e | Its measurement, 3 November |
| 14 | WhatsApp templates already approved by Meta say "about five minutes" (checkin_open, checkin_closes_soon, checkin_your_view_matters), and the two waiting for approval say "about ten minutes". They are left word for word. Hafsah decides whether to resubmit them. | Builder, 9792d707e | docs/whatsapp-templates.md |
| 15 | The scenario packs in `conversation/prompt-library.ts` still tell the model "KEEP IT SHORT: about five minutes" (pulse) and "about ten minutes" (collections). These are stored prompt versions, so a change needs a promptVersionId check. They also arguably go against "no question limits". | Builder, 9792d707e | prompt-library.ts |
| 16 | The marketing site's frozen copy says "A check-in takes about ten minutes". | Builder, 9792d707e | The marketing copy |
| 17 | More specs already failing on wip/plan: one-date-format-everywhere (`patterns/the-next-step-for-each-pattern.ts` uses toLocaleDateString), the-anchor-baseline, several conversation `*-reaches-the-prompt` specs, several board specs, someone-held-for-a-seat-reads-no-report, not-invited-yet-says-why, run-3-the-letter, the-daily-delivery-alert, groundwork-recommends, and on the client OrgMembersPage. | Builder, 9792d707e | 20 api suites fail the same way on a213c9563 |
| 18 | **One voice, "I".** Groundwork switches between "I have done X" and "we have done X". It should speak as "I" everywhere: check-ins, setup, the assistant, messages, emails and screen text. Never "we" for Groundwork; "we" is only the person's own team or organisation, in their words. Now a fixed rule in standards.md, and the judges mark it from the judged runs on. | Hafsah, 3 November | Her reading of the product |

**Decided, 3 November (supersedes 13 to 16 on length):** a check-in is "about ten minutes", Hafsah's fixed decision (standards.md). It is built right after the smoke test and before the judged runs, on her instruction, as the only change allowed between them.

## From the smoke test, round 37 (wip/plan 3db0c3469, 3 November night; scores in ~/Desktop/assessment-test/runs/plan-round37-smoke/scores.json)

| # | Issue | Source | Evidence |
|---|---|---|---|
| 19 | **Setup still loops.** The lead rated it 2: "going around in circles in a setup process that never ends". After "Got them: Brian, Aisha" there was no way forward that she could see ("there is no button to finish or move forward"). A phone number she had already given was cut short. She corrected a mistake and it was not fixed. | Smoke run, round 37 | First-experience problems, screens 10 to 18 |
| 20 | Setup gives sales examples to a law firm ("Track the team's targets for the quarter"), and has filler ("It helps to keep a definition of what clear success looks like"). | Smoke run, round 37 | Screens 2 and 6 |
| 21 | The team named at setup reached the check-in for 0 of 3 people, and the scorer found no ground for them. This could be a measurement fault in the scorer. To be checked. | Smoke run, round 37 | nothingLost.teamReachedTheCheckInAtSetup |
| 22 | The board has 7 untrue lines and correctness scored 0. Examples: "Brian Otieno sent a draft that Brian Otieno knew was incomplete" (it was never sent); "This has been raised 2 times, both on 30 October"; and lines nobody said ("Wanjiru will have three days to review it before the court deadline", "call them again first thing tomorrow morning"). | Smoke run, round 37 | boardAndReports.untrueLines |
| 23 | Ask got 5 of 9 right and 0 of 2 setup questions, with 4 wrong statements. 26.5% of facts reach Ask, against 64.7% on the board. | Smoke run, round 37 | ask |
| 24 | The privacy judge counted 11 "leaks" to Brian. Most quote Brian's own words back to him, which the rules allow. The judge's own brief is too strict and needs fixing. The ones to check for real: the lead's view of a missed promise reaching Brian, and "From last session, not mentioned again" on his board. | Smoke run, round 37 | privacyAsMembersSeeIt.leaks |
| 25 | One setup reply took 26 s (first words), and building the report took a median of 237 s after the check-in. | Smoke run, round 37 | speed.md |
| 26 | Interventions: 5 offered, but 1 that did not fit. | Smoke run, round 37 | interventions |

## From the cast judged run, round 38 (wip/plan 64c14e6d1, 4 November; scores in ~/Desktop/assessment-test/runs/plan-round38/scores.json)

Headline: first experience 1, 2 and 2 (law, sales, field; average 1.7). 91% of facts said reach some page (board 66%, reports 86%, Ask 33%). 33 stated wrongly, 31 of them offered for correction and 29 corrected. Board correct 1.3 out of 10, at a glance 2.7, with 19 untrue lines. Ask got 16 of 33 right and 1 of 6 setup questions. 15 of 25 measures disagree between pages. Patterns: the lead sees 10 of 12, but 2 honest people were flagged; stored, 5 of 12 with 3 honest people flagged. 27 interventions, 1 followed up of 4 that could be. 15 times Groundwork says "we". Speed: check-in first words 3.2 s median and 10.1 s slowest, setup 1.3 s, Ask 4.0 s, nothing over 30 s. Cost: $0.68 a check-in, $0.53 a setup. No requests left this computer.

| # | Issue | Source | Evidence |
|---|---|---|---|
| 27 | **Setup repeats itself and sounds like a chatbot, for all three leads.** "It asks the same questions over and over", "It talks like a chatbot", "a simple form would be faster". It asked Ruth again about each person's targets after she said there is one programme target. "Keep a read on live work" reads as jargon, and "It helps to know what each person is working towards" sounds like teaching her her job. | Cast run, round 38 | First-experience ratings and in their words |
| 28 | **The lead's private setup notes reach a team member's board:** "I do not know what he is working on. That is what I want to find out from these check-ins." This is a privacy breach, to check in the code first. | Cast run, round 38, privacy as members see it | Law, The board |
| 29 | **Lead-only patterns and judgements reach team members:** "The same problem is raised again and never fixed", "You repeatedly state that a deal is 'basically done'…", "What you said about your work is short, which may be because…". A participant must never read the lead's judgement. | Cast run, round 38 | Sales board, field "Their own report" |
| 30 | **Another person's words on a member's page:** Mercy's "This month, hitting my sales targets means closing at least 20 unit sales" on someone else's board, and Moses's blocker in Joseph's own report. | Cast run, round 38 | Sales board, field own report |
| 31 | The privacy judge counts a person's own words shown back to them, and their own role signals, as leaks (most of the 61). The judge's brief needs the rule "what people say can be shown word for word to the people in that check-in" so the real leaks (28 to 30) stand out. | Claude, reading the leaks | privacy detail |
| 32 | **Untrue lines on boards and in check-ins:** "It was 0 at the start and is 0 now" (KES 390,000 was collected); "Joseph reports that 64 farmers were trained in Bungatira" (30); "8 so far. Mercy's target is 20" (22); "Moses is waiting on you to approve a motorbike repair" (Ruth had approved it). Also quotes stitched together from two things said. | Cast run, round 38 | boardAndReports.untrueLines |
| 33 | **Groundwork denies what was said:** "I have nothing on Safaricom House. I have not mentioned it before." and "I haven't mentioned expanding market share" (both were said in check-in 1). The memory across check-ins doesn't reach the conversation. | Cast run, round 38 | Untrue lines, sales |
| 34 | **"We" for Groundwork, 15 times,** in three sources: the attachment line "Here is the context we have from …pdf", conversation turns ("When should we expect…", "Today we are going to focus…"), and fixed page headings ("What you told us", "What we worked out from what you said", "We talked about it", "What we are aiming for"). | Cast run, round 38, one voice | oneVoice detail |
| 35 | 15 of 25 measures disagree between pages (one source for each number). | Cast run, round 38 | everyPageAgreeing |
| 36 | Ask reaches 33% of facts and answers 1 of 6 setup questions. | Cast run, round 38 | ask |
| 37 | Stored patterns catch 5 of 12 and flag 3 honest people; follow-ups on interventions are 1 of 4. | Cast run, round 38 | patterns, interventions |
| 38 | The slowest check-in first words took 10.1 s, above the 4 s fallback. | Cast run, round 38 | speed.md |

### The privacy findings traced (read only, 4 November, round 38 data)
- **28 is real, with one root cause.** The setup chat is stored as the lead's first check-in. entry.service.ts:2633 writes the setup transcript into her session-1 turns, and assess-the-conversation.ts:104-108 then tags them `check-in`. So the record writer's guard (the-record-from-the-assessment.ts:81-83) cannot tell setup words apart, and they become record lines every reader sees. This happens through `whereAgainstSuccessAsBuilt` (reports.service.ts:3260) and WhatSuccessLooksLike.tsx:214 "And what each person says it is".
  - The same path puts Grace's "We sell water filters…" on the sales boards and My work, and Ruth's setup words ("the rains in Kitgum") in the field team's shared session report.
  - There is a second way in: `whatSuccessWasSaid` (reports.service.ts:1078) reads setup facts for everyone, and `mayRead` (the-facts-on-record.ts:62) never checks `inSetup`.
  - Where to cut: setup turns are never stored as check-in turns (or are tagged `setup`), and `inSetup` facts are refused to anyone who doesn't run the check-in.
  - Other readers of the same thing: the against-success route, the session report, My work, the shared synthesis, and Ask.
  - Specs that missed it: the-record-is-written-from-the-assessment (setup modelled only as `setup`-tagged turns); what-was-said-reaches-the-report-from-the-assessments (the member is tested only before release); the evaluation-only lead's-notes spec; and the-anchor-leads-aims-stay-hers-in-the-report:61-64, which pins the leak as expected outside the anchor flow.
- **29 is not a breach.** The patterns are Kevin's own, shown to Kevin first (who-reads-a-pattern.ts rules 3 and 5). But `shown_to_person_at` stays null although they were shown, so the lead's timer in rule 5 never starts. That is a bug.
- **30, Mercy's words:** allowed by the four rules (she said them in a released check-in Kevin is in). But they are her objectives, on a check-in set to `who_sees_targets=THEIR_OWN`, beside "Only you and Grace see your share". **Needs Hafsah:** should a person's own words about their own target follow the target's privacy setting? (Request 77 kept them outside the wall on purpose.)
- **4a and 4b are not breaches.** Moses's blocker sits in the shared session report of a check-in Joseph is in. "What you said about your work is short…" is fixed text everyone gets, and its wording reads like a verdict: a wording fault.
- **31:** the privacy judge's brief needs the four rules, so it stops counting a person's own words as leaks.
- **28 on staging and production (checked read only, 4 November):** LIKELY YES. On staging (237a36837) and main (0f9308542), entry.service.ts (staging :2681, main :2600) writes the setup conversation (`dto.history`) as the lead's session-1 turns and extracts RecordEntry rows from them. reports.service.ts `whereAgainstSuccessAsBuilt` (staging :3215 `whoseLines`) then gives a member every colleague's lines from released sessions, the lead included, with no exclusion for setup. The member reads "{lead} said what success looks like in their own check-in…" (where-you-are-against-what-you-named.ts:213) above her words. `sessionReportAsBuilt` probably shows the same. No staging privacy spec covers it. None of #405 to #409 adds it. Not yet reproduced on a bed.

## From Hafsah's screenshots, 4 November (evidence in ~/Desktop/next-steps/evidence-4-november/), for the next build

The fixed rule this follows is in standards.md: no lines that explain what a page, section or feature does or how it works; no privacy notes; no pages in between. Status lines with real information stay.

| # | Issue | Source | Evidence |
|---|---|---|---|
| 39 | The board for someone who hasn't checked in shows a four-line paragraph ("The board puts what everybody said next to each other…"). It should be one line, "Check in first, then you'll see the board.", and the button. Check why the wording sweep's version isn't showing. | Hafsah, 4 November | Her screenshots |
| 40 | The top of the board: keep "Last updated on Wednesday 4 November at 9:33am." and remove the explanation after it ("The board only changes when something new comes in, such as…"). | Hafsah, 4 November | Screenshot 10.33.33 |
| 41 | My work: remove "Your own check-in. The report shows where you and the others agree, differ, and what to do next." and "Everything you've said, and what the proof shows. Only you see this page." | Hafsah, 4 November | Her screenshots |
| 42 | The Check-in tab's page in between goes ("Session 14…", "See what each person said…", "Check in yourself", "Add context", the session list). Check-in opens the conversation directly (item 3b). | Hafsah, 4 November | Her screenshots |
| 43 | **Bug:** opening a session shows a blank white page first. | Hafsah, 4 November | Screenshot 07.53.23 (/session/10, white page) |
| 44 | **Bug:** on desktop the board and other pages fill only the left half of the window, leaving the right side empty. | Hafsah, 4 November | Screenshot 10.33.33 |
| 45 | The tab still says "Context and resources"; it should be "References and resources", as decided. | Hafsah, 4 November | Screenshot 10.33.33 |
| 46 | Every explainer line and every page in between, on every page, listed for removal in the same build. The list is being made now. | Hafsah, 4 November | To follow |

## From the first experience on 8 organisations, round 39 (wip/plan bf22429c8, 4 November; ~/Desktop/first-experience/round-9/)

Ratings: clinic 1, family 1, field 1, law 1, ngo 1, sales 1, startup 2, wild 1 (average 1.1). Every lead names the same thing first: setup asks the same questions again and again, in a loop. The run took 97 minutes.

| # | Issue | Source | Evidence |
|---|---|---|---|
| 47 | **Setup loops, for all eight leads** ("kept asking me the same things over and over in a broken circle"). This is group 5 of the fix plan, and it is the largest cause of the low ratings. | First experience, round 39 | Each kind's .json, in their words |
| 48 | **Setup sometimes doesn't answer at all:** no reply came on 4 turns (sales turn 13, field turn 9, startup turn 9, wild turn 9), and 2 more took 30 to 36 s. In the startup and wild cases, 23 and 33 model calls were running at once. Something fans out calls on a setup turn. | First experience, round 39 | round-9/speed.md, the "over 30 seconds" list |
| 49 | Clinic: "I was told my people had checked in, but the system says 'no check-ins' on every screen. Then I find I have to add them myself." A status that says two things (one source for each thing). | First experience, round 39 | clinic.json |
| 50 | Reports "repeat my own words back to me", "empty report filled with useless business jargon", and "a report that tells me nothing". | First experience, round 39 | field, ngo and startup .json |
| 51 | Ask "can't even answer the most basic question about my business". | First experience, round 39 | wild.json |

# Fix plan, release batch 1, by root cause (DRAFT, 4 November 2026)

Drafted from `docs/issues-next.md` items 1 to 38, the cast run (round 38) and the smoke test (round 37). It is final only once the first-experience run (round 39) and the 120 adversarial cases have joined the list. The batch must be better than live (staging 237a36837, measured once) on every release-bar measure. Groups are in order of harm.

## 1. Setup is stored as the lead's first check-in (privacy). Closes 28 and 30.
- **Cause.**
  - `entry.service.ts:2626-2646` copies the setup chat (`dto.history`) into the lead's session-1 turns.
  - `assess-the-conversation.ts:103-108` then tags those turns `check-in`, so the guard in `the-record-from-the-assessment.ts:81-83` can't tell them from check-in words.
  - A second way in: `the-assessment.ts:239-247` makes only team, risks and private notes lead-only, and `mayRead` (`the-facts-on-record.ts:62-69`) never checks `inSetup`.
  - `mayRead` also ignores `whoSeesTargets`.
- **One fix.**
  - Delete the copy into session 1, so setup reaches the assessment only as setup.
  - Every `setup.*` section belongs to whoever runs the check-in. Targets, rules and expectations reach the team only through their own places.
  - `mayRead` honours the target setting: under THEIR_OWN, a person's words about their own target are read only by them and the lead.
  - A one-time script removes record lines already written from copied setup turns.
  - Update `the-anchor-leads-aims-stay-hers-in-the-report:61-64`, which pins the leak.
- **Proof.** Read each member's board, My work, own report, shared report, the "Against the target" band and Ask on a bed. New privacy specs cover setup words and the copied-turn path.
- **Ships to staging separately.** Staging and production most likely have the same breach.

## 2. One figure, two owners. Closes 35 and the figure lines in 22 and 32.
- **Cause.**
  - A target's progress is both the stored `groundObjective.count` (`a-measure-that-goes-down-is-still-going-well.ts:201`) and the model's `suggestedCount` (`BoardPage.tsx:4298`).
  - Reports build their own session clock inputs (`reports.service.ts:6555-6565`, compared with `this-sessions-count.ts:165-167`).
  - The client has its own fallback count (`GroundAdminPage.tsx:1827`).
- **One fix.**
  - A target's figure is read from the record, with "said" and "proven" shown as such. The stored count is used only when a person set it.
  - Reports read `theSessionAndItsCount`, and the client fallback is deleted.
- **Proof.** None of round 38's 15 disagreeing measures returns.

## 3. Words nobody said, and facts lost on the way. Closes 22 (quotes), 32 (stitched quotes), 33, 23 and 36.
- **Cause.**
  - A live check-in remembers earlier sessions only as its last 6 record lines (`conversation.service.ts:4486-4495`).
  - Ask keeps only 45 days and 40 facts per person (`a-question-is-answered-from-the-documents.ts:127, 143, 174`).
  - Quote marks go around model-written words.
- **One fix.**
  - The check-in reads the person's open items through `theFactsOnRecord`.
  - Ask drops the window, and never cuts setup facts or open items.
  - Only `saidWordForWord` facts may be shown in quote marks.
- **Proof.** No denial of something said earlier; Ask answers 6 of 6 setup questions; no quote that wasn't typed.

## 4. Honest people flagged. Closes 37 (flags).
- **Cause.**
  - Judgements made outside layer 2: missed check-ins (`missed-check-ins.ts:330-337`) count rounds on a clock that disagrees with itself.
  - Per-person PatternDetection rows.
  - The claims rule misses proof elsewhere on the record (`patterns-across-the-assessments.ts:201-223, 324`).
- **One fix.**
  - Read the instances behind each flag first.
  - Missed check-ins read the one clock and count only rounds due to that person.
  - Any proof on the record settles a claim. No threshold changes.
- **Proof.** 0 honest people flagged, with patterns caught kept at 10 of 12 or better.

## 5. Setup loops and sounds like a chatbot. Closes 19, 20, 27 and 15.
- **Cause.**
  - The model never gets setup's own reading of what is known; the panel builds it on the client (`entry.service.ts:1505-1543`).
  - Word matchers catch repeats after the fact (`asked-twice-and-told-no-twice.ts:51-60`, `entry.service.ts:1690-1700`).
  - A reason-and-example rule is copied word for word (`entry.service.ts:1076-1078`, `prompt-library.ts:689`).
  - The situation name lives in three places.
  - The packs say "KEEP IT SHORT".
- **One fix.**
  - One server reading of what setup knows, each turn. The panel shows it, and the model gets it as "known, don't ask".
  - Delete the matchers, the rule, the copies and the length lines.
  - Prove the running prompt version by its `promptVersionId`.
- **Proof.** Three leads walked in the browser: nothing asked twice, no "It helps to…", no sales examples for the law firm, phone numbers kept whole, and the walk ends on "Send N invitations".

## 6. One voice, "I". Closes 18 and 34.
- **Cause.**
  - The document line "Here is the context we have from" is written in `what-a-document-holds.ts:196` and matched by regex in `grounds.service.ts:3954` and `ContextPage.tsx:1006, 1033`.
  - Fixed headings say "we".
  - The check-in instructions let the model say "we".
- **One fix.**
  - The document line becomes one field, which the two strippers read.
  - Reword the headings.
  - Put the voice rule in the one stored system instruction.
- **Proof.** `oneVoice.groundworkSaysWe` is 0.

## 7. Agreed builds in batch 1
- **3b**, Check-in opens the chat directly.
- **3**, desktop full width, like Slack. The phone layout is unchanged.
- **1**, openers prepared in advance, which removes the roughly 7 s of opening calls and probably item 38.
- **Proof.** Screenshots at web and phone width; the opener appears with no model call.

## 8. The rest in batch 1
- 9 and 17: every spec that already fails is made to pass.
- 6: the report's state has one owner.

## Waits for batch 2
- **2**, sentence-by-sentence streaming. Every "Correction:" is an untrue line already read.
- **4**, the boards matching the prototype.
- Waits and how long they've been open.
- **5**, the read-back's second reading.
- 8, 10, 25, 26, and the follow-ups in 37.
- `shownToPersonAt`, which nothing ever writes.
- Removing the target-number matcher.
- **16**, the marketing site's copy.

## Decisions Hafsah owes
1. With setup no longer copied in, the lead has her own session 1 (decision 28). Decision 133's premise falls away. Confirm.
2. Should PatternDetection's patterns shown to the person themselves be retired too, leaving one pattern layer?
3. Item 7: should "Set the context" and "Add people" come back to the check-in screen?
4. Item 11: should the logo on a signed-in production screen go to the marketing site or to Today?
5. Item 14: should the approved "five minutes" WhatsApp templates be resubmitted?
6. Item 12: drop the leftover test databases.

## Test tooling, before the live baseline
The privacy judge's brief now follows the four rules (done 4 November, `~/Desktop/assessment-test/harness/score.ts`). Round 38 will be re-scored with it, so live and plan are counted the same way.

---

# Earlier plan (28 October 2026)


Written 28 October 2026 from the quarter test (https://claude.ai/artifact/1CxdqG5seigytMJScvkKKj). Every finding is in exactly one pattern below. No single finding inside a pattern is fixed on its own. The patterns are fixed in order of harm: wrong numbers and untrue lines (patterns 1 and 2), broken flows (3), dates (4), commitments (5), messages (6), wording (7) and phone layout (8). Each fix comes with tests that would have caught the whole pattern, and removes the one-off patches it replaces.

## 1. Numbers disagree between pages

**Findings it covers**

- Peter is "doing well" on his performance plan’s board, while the sales board shows him missing check-ins (inconsistency)
- "All five people" when the team has seven (inconsistency)
- Mercy's promises are counted two ways (inconsistency)
- Mercy's target shows 1 of 10 next to 0 sold (inconsistency)
- How many people are in Drop Access (inconsistency)
- Company says there is no strategy while Direction is full (inconsistency)
- Faith's role is known on one board and unknown on the next (inconsistency)
- Joseph is shown over target while the same page says Grace still waits for his proof (inconsistency)
- Joseph's promises: 17 of 18 kept on the check-in page, 4 done of 17 on You (inconsistency)
- Kevin's units sold go down from 51 to 21 (inconsistency)
- Njeri is told she has 0 of the November collections the report says were collected (inconsistency)
- Faith has sold nothing on one page and 2 of 7 on another (inconsistency)
- Someone who joins later starts at "session 5 of 262" (confusing)
- "Peter did ten of 29 check-ins, all on time" reads as praise for missing 19 (content)
- "1 of 5 have checked in for check-in number 43" on the lead's Today (content)

**Root cause in the code**

Every figure has a page-local recount or a stored snapshot next to a live counter, and each page queries the tables itself.
- **Promises.** My work (`board/my-work.ts` `myWorkFrom`) counts one check-in's promises after `thePromisesAsTheRecordKeepsThem` and `onePromiseOneState`. The You page (`suites/the-running-record.ts` `theRunningRecord`) re-reads raw `groundCommitment` statuses across every check-in: no said-done reading, no to-dos, no merge, and dropped ones count. `keptLately`, the client's `keptThisMonth` and `board/the-anchor-month-record.ts` each count again.
- **Sales.** The target line on You and My work reads the stored `groundObjective.count`, a snapshot written on events or by a model reading what was said (`board.listener.ts:414/:488`). The "sold" tile recounts deals by a third rule (`my-work.ts:299`). Only `theCountFromTheDeals` applies the lead's proof rule, and it has no period ("in November" counts all time).
- **Collections.** No code counts a collections aim from the bills (`countTheAimsFromTheDeals` returns early for non-sales work), so Njeri's goal stays 0 while the report counts paid bills.
- **Check-ins and sessions.** "Ten of 29" counts working days since the first session (`a-day-they-checked-in.ts`), "session 23 of 59" counts rounds, and the planned total is calendar days or working days depending on how the end was set (`session-count.ts`).
- **People.** Company counts organisation members, People and setup counts every participant who is not only managing, and "1 of 5" counts who the round waits for (`reports/how-many-have-answered.ts`). The anchor record and the cron each count again.

**The one fix at the source**

One counter per figure, in one module (`api/src/modules/record/the-counts.ts`), that every page, report, summary and message reads:
- `promisesOf(participantIds, window?)`: `onePromiseOneState` over `thePromisesAsTheRecordKeepsThem`, returning kept, not done and open. My work, You, the self-review draft, the weekly email, the anchor record and the client all read it.
- `soldOf(aim, window?)`: `theCountFromTheDeals`, with the period read from the aim ("in November"). The stored `count` is written from this, never by the model. My work's own recount is removed.
- `collectedOf(aim, window?)`: from the bills (`buildTheCollectionsBoard`'s paid group and paid day), used for a collections aim the same way.
- `checkInsOf(person, ground)`: done out of due, from `theCheckInsCounted`. The planned total comes from `howManyRoundsUpTo` on the real schedule, served to the client. The client's own formulas are removed.
- `peopleIn(ground)`: `whoIsInTheRound`. People and setup, the cron and the anchor record call it. Company keeps its own count, worded as people in the organisation.

## 2. Corrections and untrue lines that do not get fixed

**Findings it covers**

- END sent just after a check-in closes gets "I cannot answer that one yet" (bug)
- Ask refuses some corrections with "I cannot answer that one yet" (3 of 74 corrections in the quarter) (bug)
- A lead's correction in a WhatsApp check-in is dropped with "We can leave that there", without checking it (content)

**Root cause in the code**

Ask decides what a message means with text patterns (`assistant/the-router-is-deterministic.ts`). A correction is caught only by fixed words or by sharing two words with something the person wrote (`a-correction-said-in-ask.ts`). Anything else falls through to "I cannot answer that one yet". A number Groundwork worked out cannot be corrected at all, statements never reach the documents (`isAQuestion`), and on WhatsApp the model is free to say "We can leave that there" without checking anything.

**The one fix at the source**

As agreed on 27 October. Ask understands with the model: the person's message, their record, the check-in's context and their documents. Fixed rules stay only where something is approved or written (leave, spending, approvals, decisions), and the model can never pick one of those lanes.
- **Corrections in any words** go through the same check as a claim: Groundwork checks the record and the proof, and asks for proof if it is missing. Once backed, the correction is written once to the record (`recordEntry.disputedAt`, and a correction row), and every surface reads it, so it stays fixed.
- **A number Groundwork worked out** is answered with how it was counted and from what, using the counters from pattern 1. If the person is right, the cause (a missing deal, a promise marked wrongly) is corrected and the count follows everywhere.
- **Statements reach the documents** as well as questions.
- **The check-in's own prompt** carries the same rule for corrections said during a check-in.

## 3. Broken flows

**Findings it covers**

- Delete this test is offered after four people have answered (bug)
- The project board shows none of the milestones or money given at setup (bug)
- After checking in, a team member is told to "Check in first" and cannot reach the board or Add something (bug)
- The morning summary links to the wrong board (bug)
- The lead who decides a review has no Update from the record (bug)
- Joseph’s review is decided and a draft at the same time (inconsistency)
- START opens a different check-in from the one the message above it named (confusing)
- "Below is what I wrote down" with nothing below, and the answer box still open (confusing)
- "Give it more time" needs a second save far down the page (confusing)
- A team member opening Performance reviews gets a red refusal (confusing)
- Leave already under way is still waiting, and Peter is told it waits "for an admin" (confusing)
- Ending a plan or a 90 days needs an outcome, a reason, Save, then Yes, end it (confusing)
- On his review, Kevin is told five times to "say what happened in your own view", but the box for his view is hidden inside the closed "The record in full" fold (confusing)
- Peter and Faith disappear from "Start a review now" once their plan and 90 days are ended, so the plan's final review cannot be started from Reviews (confusing)

**Root cause in the code**

Several flows each stop at one step:
- The board's "check in first" gate (`board.service.ts:604`, `theyOweAnAccountFirst`) uses `getSessionProgress`'s round, which can be a newer round than the one the person just answered, so they are sent back to "Check in first" after checking in.
- END or START after a close goes to the Ask router and is shrugged at, or opens the other check-in.
- The lead's review has no "Update from the record". The person's own view is inside a closed fold. People whose plan or 90 days ended drop off "Start a review now".
- "Give it more time" and ending a plan each need a second Save or Yes far from the first press.
- A member gets a red refusal on Reviews, and "Delete this test" is still offered after people answered.

**The one fix at the source**

- The gate reads the person's own last answered round, from the calendar in pattern 4, not the newest row.
- Words said on WhatsApp after a close are read by model-led Ask (pattern 2).
- The review page gives the lead Update from the record, shows the own-view box open, and keeps whoever just finished a plan or 90 days at the top of "Start a review now".
- One press does each thing: the save sits next to the field it saves, and the end button names the outcome.
- A member's Reviews page shows their own reviews and nothing to refuse.
- "Delete this test" goes once anyone has answered.

## 4. Dates that are stale or wrong

**Findings it covers**

- The end date in When it runs reads 27 October; the same page says the check-in runs until 30 October (bug)
- A review says the direction changed on the real date, not the day it changed (bug)
- A check-in that runs "until 30 October" closes at the start of 30 October (bug)
- A weekday-only check-in tells people it is due on Saturday (bug)
- The nightly stall check ignores a check-in's end date, and the Ends field shows a date worked out from the length (bug)
- A check-in opens on Christmas Day, including for Peter, whose leave over Christmas is still waiting (bug)
- Today says a check-in is open, then lists it as the next one (inconsistency)
- When Faith’s check-in runs (inconsistency)
- Mercy is told she missed three check-ins on the day Today also says her round does not wait for her because she is on leave (inconsistency)
- Litigation team daily says it ends on 12 October, six weeks after that date, while it runs for another 318 days (inconsistency)
- The direction still says sell 120 dispensers by 30 October, three weeks after that date (confusing)
- Faith's 90 days opens "from 10pm" (confusing)

**Root cause in the code**

There is no one calendar.
- **Round dates** are computed in `grounds/the-check-ins-own-schedule.ts`, again in the client (`when-the-check-ins-land.ts`, `TheSetup.tsx`), and again for "due" (`whatsapp/what-goes-to-a-phone.ts whenItIsDue`, which adds a calendar day and so says "due Saturday").
- **The end date** is in `when-the-clock-starts.ts deadlineOf`, `heres-what-is-new.ts`, `grounds.service.ts:7435` and the client's `theEndOnTheField`, which sends a length-derived date back as `endsOn`. The stall checks select no `endsAt`.
- **Day boundaries.** `endsAt` is stored as midnight UTC, so a check-in "until 30 October" closes at the start of that day.
- **Holidays and leave.** There is no holiday list. Leave is read only once approved, and never when a session is made. The missed count ignores today's leave, and dates are formatted without the year or without the organisation's zone ("until 12 October" for 2027, "from 10pm").
- **Targets.** The direction and targets keep their "by" date as free text, and nothing asks the lead what is next once it passes.

**The one fix at the source**

One calendar module, grown from `the-check-ins-own-schedule.ts`:
- `theEndOf(ground)` returns the end of the chosen day in the organisation's zone, else the last round. The stall checks, the field, the cron and the counts all use it.
- `isADayTheyWork(person, day)` checks the organisation's working days, its public holidays and the person's leave, including leave that is waiting.
- `whenItIsDue` is replaced by `whenTheRoundCloses`.
- The client reads the end, the next opening and the counts from the API, so its own formulas are deleted.
- One formatter takes the zone and adds the year when it differs.
- A target or direction whose date has passed asks the lead what is next, on Today and in the morning summary, instead of repeating the old date.

## 5. Half-sentence to-dos and goals

**Findings it covers**

- An empty white box sits in Mercy's record on You (bug)
- Groundwork's own sentence is shown as one of Aisha's goals (bug)
- To-dos are lifted half-sentences with no name: "Need to confirm that with Mrs. Achola.", "Follow up with her then", "Confirm the best time with her" (content)
- Things people said are kept as promises word for word, even when they are not a task: "Today. I promise.", "Ask Grace today." (content)
- Kevin's goals list the same goal twice in different words (content)
- Admissions are kept as promises: "Forgot my promise to call Upper Hill again" and "I forgot my promise to call Upper Hill again" are listed as two things Peter said he would do (content)
- Goals that are not finished are marked "You have reached it" (content)

**Root cause in the code**

At least six writers turn speech into commitments, each with its own input, wording and duplicate rule.
- `writeWhatTheyPromised` reads answers without the questions they answered, so "her", "that" and "then" are never resolved.
- The "yes" path keeps the whole previous turn with no check.
- `writeTheirOwnPromises` reads Groundwork's turns too and keeps the model's sentence, which is how Aisha got Groundwork's words as a goal.
- Targets are held in two tables (PersonObjective TARGET and GroundObjective), so one goal shows twice.
- The prompt asks for "things they are in the middle of", so "I am drafting…" and "I would have to check that" become promises.
- Duplicates under three words ("Ask Grace today") are never merged, and "You have reached it" is added whenever a count reaches a target of 1.

**The one fix at the source**

One commitment-maker, grown from `writeWhatTheyPromised` and `GroundCommitment`:
- It reads question-and-answer pairs from the person's turns only, using the `isTheirs` and `notARemarkAboutUs` gates from `readTheRecord`.
- It keeps only a promise about the future, not work in progress, a hedge or a report of a miss.
- It stores who, the clear action and when, with the person's exact sentence beside it.
- It merges duplicates with `onePromiseOneState`'s rule.
- The yes path and the own-promise path go through it, and one table holds a person's own target.
- "Reached" comes from the counters in pattern 1.

## 6. Repeated and duplicate messages

**Findings it covers**

- "Thank you, your answer is in" is sent for a check-in nobody answered (bug)
- The same "your check-in is open" WhatsApp is sent twice four minutes apart (bug)
- The same question shows three times in a row on Grace's Today: "Do you want to drop a deal after 3 working days with no answer?" (bug)
- One WhatsApp message says the check-in is both still open and complete (inconsistency)
- The lead email has a sentence for a subject and a button that does not say what it does (confusing)
- Two back-office codes arrive seconds apart (confusing)
- When the model cannot be reached, WhatsApp sends the same long apology three times in 20 seconds (confusing)
- Grace has 20 things that need her, most of them months late (confusing)
- The lead is thanked for "your answer" after setting up her own check-in (content)
- Two messages in a row say the check-in is finished (content)
- The same report is announced three times by email on the same day (content)
- Two emails a day for each daily check-in (content)

**Root cause in the code**

There are two senders (email `EmailService.sendEmail` and WhatsApp `WhatsAppService.sendFor`/`sendOn`). Each one checks its record and then sends, with no unique key, and the record is written after the provider answers.
- The commonest mails (the invitation re-sent as "would like your take", the thank-you, and the answer by email) are not counted as routine, so the one-a-day rule never sees them.
- The 15-minute crons are not limited to one copy.
- A check-in closed as missed emits "completed", so it is thanked.
- Every inbound WhatsApp during an outage gets its own apology.
- The report check covers only one kind of report.
- Today's list joins each check-in's questions without merging them, and never shows which check-in an item belongs to.

**The one fix at the source**

One outbox in front of both senders:
- Insert a row with a unique key (channel, person, kind, subject, day) before the provider call. A clash means "already sent", which replaces every find-then-send.
- One routine message a day per person across both channels, invitations and thank-yous included. Security mail and approvals are exempt.
- An apology key per person per day, so one short apology goes out.
- No thank-you for a check-in closed with no answers.
- The 15-minute crons run once across copies.
- Today merges the same question across check-ins into one item that names them, and keeps older items behind one line.

## 7. Wording said differently in different places

**Findings it covers**

- How long a check-in takes, written three ways (inconsistency)
- Samuel is named by his email address, and in small letters (inconsistency)
- The lead’s morning summary changes shape from day to day (inconsistency)
- Money written with and without its currency (inconsistency)
- Faith’s check-in is named in the third person on her own Today (inconsistency)
- How often reviews happen (inconsistency)
- The invitation email shows "Sales rep" on its own in a quote box (confusing)
- Leave is "sent to an admin", with no name (confusing)
- A Direction tab called "The loop" (confusing)
- The first WhatsApp reply after START is long and mostly instructions (content)
- A report message on WhatsApp says the same sentence three times (content)
- Broken sentences in the lead’s morning summary (content)
- Email subjects are long sentences, one with work jargon (content)
- The person being asked is called "them" in their own question (content)
- "From the leave policy, Leave policy." on every rule (content)
- "Njeri is waiting on you for request": the thing waited for is missing (content)
- The week's report repeats one sentence five times, once per person: "No buying date is on record for X's open deals." (content)
- A law firm's board talks about sales: "Njeri said 18 times that something was sold, paid or signed" (content)
- At the end of her 90 days Faith reads "The person stays in the role", twice (content)
- The 90-day outcomes repeat each other and use work jargon (content)

**Root cause in the code**

Fixed lines are written in place in many files, so the same thing is said several ways:
- "ten minutes" and "five minutes"; money with and without "KES".
- A person in the third person on their own page ("Faith's work", "The person stays in the role").
- "check-in number 43", "The loop", and "sold" for a law firm.
- Long email subjects.
- A report or summary repeating one sentence per person.

**The one fix at the source**

One place for fixed lines (`api/src/modules/presentation/the-words.ts` and its client mirror served from the API). It holds:
- the length of a check-in;
- money formatting;
- the reader's own name as "you";
- the end outcomes;
- the words for each kind of work;
- email subjects.

Lines that repeat per person are joined into one sentence with the names. Copied strings are replaced by calls to it.

## 8. Phone layout

**Findings it covers**

- "Groundwork is writing" breaks in the middle of the word on a phone (bug)
- On a phone, the Direction page’s What changed shows one word per line (bug)
- On a phone, the prompts page shows the prompt one word per line (bug)
- Two links on the Company page run into one line with no space: "what it means for each teamThe policy board" (bug)
- Each staff page has its own top menu (inconsistency)
- A lone "Every session" button between Reports and Where this is heading (confusing)

**Root cause in the code**

Narrow columns in a few page templates let text wrap one word per line on a phone (Direction, the prompts page), a progress label breaks mid-word, two links render with no space, and an empty card renders when a list item has no text.

**The one fix at the source**

One fix in the shared layout components (the two-column row and the link list) so text takes the full width under 600px, and list items with no text are not rendered.

## Not in a pattern (product decisions or one-offs, left for Hafsah)

**Findings it covers**

- The first question takes 22 seconds on average to appear, and up to over a minute (confusing)
- An outside contractor is shown leave, spending and a staff performance read (confusing)
- A Groundwork staff sign-up makes a customer organisation (confusing)
- The performance plan and the 90 days boards are built like a sales team’s (confusing)

**Root cause in the code**

- An outside contractor is shown leave, spending and a staff performance read: what a contractor sees is a product decision.
- A Groundwork staff sign-up makes a customer organisation.
- The plan and 90-day boards are built like a sales team's.
- The first question takes about 22 seconds.

**The one fix at the source**

Listed for Hafsah under "Needs Hafsah". Nothing is changed without her decision.

## Status (28 October 2026)

**1. Numbers: fixed at the source.**
- Promises are read and counted once (`grounds/the-promises-counted-once.ts`) by My work, You and the self-review.
- Targets are counted when they are read (`board/an-aim-is-counted-now.ts`) by the board, the listener, My work, You and Ask: sales from the deals, in the aim's own month, and collections from the bills paid.
- People in a check-in are counted by the round's own rule (`reports/how-many-have-answered.ts whoAnswersThisCheckIn`).
- Removed: the You page's own commitment count, My work's own target number and sold recount, and the board's and the listener's inline deal counts.
- Not changed, because they are right: the session counts ("session 23 of 59" is a daily check-in's real length). Their wording moves to pattern 7.
- Moved to pattern 5: Njeri's "0 of 720,000". It was a figure she reported, saved as a target.

**2. Corrections: fixed for Ask, not yet for the check-in itself.**
- Ask reads what a message means with the model where the rules place nothing (`assistant/ask-understands-with-the-model.ts`). Only lanes that read can be chosen; the rules keep everything that writes.
- A correction in any words is checked against the person's own record (`assistant/a-correction-is-checked-like-a-claim.ts`):
  - backed, it changes the promise or takes the line off, so every page reads it;
  - not backed, it asks for the proof.
- Statements the model reads as questions or updates reach the documents.
- Kept: the old regex path (`a-correction-said-in-ask.ts`) only runs when the model gives no answer. It stays as the fallback for an outage, not as a second way.
- **Left:** a correction said during a check-in, on WhatsApp ("We can leave that there"). That is the check-in prompt, and is next.

**3. Flows: four fixed.**
- Add something stays on the board while it waits for the person's check-in.
- END, with nothing open, says so and says when the next check-in comes.
- A review in progress opens its fold, so the own-view box and Update from the record show.
- The ending reads as said to each reader. It is not yet one press.
- **To check in the two-week run, before changing anything:**
  - The lead's missing Update from the record was on a review already decided, where it is closed by design.
  - People who finished a plan or a 90 days probably move to "The next reviews" as due, rather than dropping off the list.

**4. Dates: fixed at the source.**
- Due comes from the check-in's own schedule (`whenItIsDue` reads `whenTheRoundCloses`).
- The schedule skips public holidays where the organisation is (`grounds/public-holidays.ts`). Fixed-date holidays only; Easter and the Eids are not there yet.
- A chosen end runs to the end of its day, and the stall checks read it.
- A day in another year says its year (`aDayInItsZone`).
- Nobody on leave is told about missed check-ins.
- Only a daily check-in says an opening hour.
- A direction whose day has passed asks the admin what is next, on Today.

**5. Commitments: fixed at the source.**
- One reading takes question-and-answer pairs, leaves out hedges, misses and unfinished work, and keeps a clear action beside the person's own words. This adds the new `GroundCommitment.action` column (migration `20261028120000`).
- The "yes" path goes through the same test.
- Groundwork's own sentences are never kept as someone's promise or goal (`conversation/a-promise-is-theirs-not-ours.ts`).
- A reported figure is not a target.
- A goal and its target are shown once.
- "Reached" is said only of what a counter counted.

**6. Messages: fixed at the source.**
- One outbox key is claimed before any email or WhatsApp goes (`common/the-one-outbox.ts`, migration `20261028130000`).
- Each message about the same thing goes once a day, invitations once a day per person, and one apology per half hour. Replies are held only when the same words come twice in a minute.
- No thank-you is sent for a session nobody answered.
- Today merges the same question across check-ins into one item that names them.
- **Left for Hafsah:** the two WhatsApp templates already submitted to Meta say "about five minutes", while the rest of the product says "about ten minutes". They are frozen until she resubmits them.

**7. Wording: started.**
- "About ten minutes" everywhere outside the frozen templates.
- "The 43rd check-in", not "check-in number 43".
- The ending said to the reader ("You stay in the role").
- The ending said once on the person's own page.
- Not changed, because it is the prototype's own wording: "Mercy’s work" on Mercy's own My work.

**8. Phone layout: two fixed.**
- The Company links each sit on their own line.
- The Direction "What changed" list keeps its text in one column.
- **Left:** the staff prompts page.

**Not in a pattern, for Hafsah:** what a contractor sees; a staff sign-up making an organisation; the plan and 90-day boards; how long the first question takes.

## The two-week check (weeks 14 and 15, 11 to 22 January 2027 on the test bed, real model) — 29 October 2026

The full results, finding by finding, are in ~/Desktop/quarter-test/after-fixes.html: 33 of 42 checks held.

**Held:**
- Promises are counted the same on My work and You (Kevin, Joseph and Mercy).
- Kevin's and Mercy's targets are the same on both pages.
- Corrections in any words land: Brian's, Kevin's, Aisha's and Joseph's are checked against the record and proof, and Njeri's against her payment slip.
- No weekday check-in said it was due on a weekend, and no session opened on one.
- No apology was repeated.
- No thank-you went for an unanswered session.
- None of "check-in number 43", "about 10 minutes" or "The person stays in the role" came back.
- 83 of the 116 new promises carry a clear action beside the person's words.

**Came back, and fixed by pattern since:**
- Joseph had two targets, and one of them named no measure, so You read "0 of 30" while My work counted 17. A person's own target with no measure is now counted in the team's measure, and both pages order targets alike.
- Aisha's old goal in Groundwork's words, kept before the fix, still showed. Every reader now leaves Groundwork's own sentences out.
- "Understood. We can leave that there." still followed answers. It is the repeated-question guard's line, not the correction rule; it now says "Thank you, that is noted."
- Wanjiru's morning summary went three times from the night's held queue. A held message now claims its own outbox key.
- Three emails a day about one session, and two report emails a day about one check-in. Session news is now one email a person a day, and report news one a check-in a day.
- "There is no check-in open here" went to people whose check-in was open. It is said only when nothing is open.
- A wait long over ("Aisha is waiting on you for FN-007", paid in October) was still shown. A correction the record backs can now clear the wait.
- Reopening a check-in, or giving a running one more time, opened no session. Each person's next session is now opened.
- Peter's WhatsApp went to a session of his ended plan ("This check-in is closed", twice). WhatsApp now leaves out sessions of ended check-ins, and a reply's minute slides.
- The correction check could not see check-in counts (Peter's "4 out of 14"). It is now given them.

**Not counted as failures, after checking:**
- The Litigation end date without a year: the end, 13 October 2027, is in the same year as the bed's date.
- Repeated replies to people who sent the same thing twice.

## The simplifying fixes (Hafsah, 29 October 2026, evening): remove the cause, end with less code

The re-check of 29 January to 2 February left six problems. Hafsah's rule for these: fix the design cause by simplifying. No new detectors, word filters, regular expressions or special cases. Where an old guard or patch becomes unnecessary, delete it. For each: the cause found, and the simplest change, with what it deletes. What each change actually removed is in "What the simplifying fixes removed", below, once built.

### 1. Mercy's numbers ("27 sold", "17 over your target of 10")
- **What happened.** Her My work counted 27 units: Greenfield Supermarket's 25 (a quote she gave up on) and the same one-unit sale twice ("Mama Rose" and "Mama Rose's kiosk"). It also said "your target of 10", although she had said "My target is actually 30 units, not 10".
- **Cause 1: a person's figure was built from other people's record.** Whether a deal is paid was decided by matching every proven payment line in the check-in, from anybody, to every deal by name (`thePaymentRecords` and `aPaymentRecordFor` in `a-sales-aim-is-counted-from-the-deals.ts`). Faith's Bahari Cafe customer, Mrs Achola, paid by M-Pesa; Greenfield's contact is also "Mrs Achola"; so Faith's payment paid Mercy's dropped quote.
- **Cause 2: a correction made a new item.** A person's own target goes through two paths that each decide "is this new?" by word-matching (`theAimsThatAreNew`, `theTargetItSaysAgain`). "My target is actually 30 units, not 10" matched neither, so a second target was written beside the first.
- **Change.**
  - A deal's figures come from its owner's own record only: their own lines and the proof filed on the deal. The payment lines read for a deal are its owner's.
  - The extraction model is shown the person's targets on record, by id, and says which one a number they give corrects. The product edits that row's number and keeps the old one in the check-in's audit log (who, when, from, to, their words). A new item is written only when it is new.
  - A dropped deal is not a sale.
- **Deletes.** The word-matching on the person's own target path (`theTargetItSaysAgain` and `theAimsThatAreNew` used for a person's own number). The model's id replaces them.

### 2. "Understood. We can leave that there."
- **What happened.** It came back twice in check-ins.
- **Cause.** Hafsah suspected the model is given its own old replies from earlier sessions. Traced, that is not so: the history for a turn is that check-in's own turns only (`conversation.service.ts`, the `findMany` on `checkInId` before `respond`). The phrase is in the prompt. My earlier fix added `Never answer a correction with "we can leave that there"` to `A_CORRECTION_IS_NOT_A_SCOLDING`, which goes into every check-in prompt, and an instruction that quotes the words teaches them. The 102 older turns were the product's own fixed line (`recordAndMoveOn`), already changed on 28 October.
- **Change.**
  - Delete the quoted phrase; keep the positive instruction (check the claim, say plainly what is put right, or ask what is true now).
  - Within a session, the model keeps the person's words in full and Groundwork's last two turns as written. Older Groundwork turns are given only as the question they asked, so a fixed sentence of ours is not there to copy.
  - No phrase filter.
- **Deletes.** The quoted phrase. Nothing else, because the guards against repeating within one session (`alreadyAskedTwice`, `opensByRepeatingThem`) catch behaviour inside a session, not inherited wording.

### 3. "Due tomorrow, Sunday 31 January", and 6. summaries at the weekend
- **What happened.** Brian was told Fee notes is "due tomorrow, Sunday 31 January". Leads got a morning summary on Saturdays and Sundays.
- **Cause.** A check-in can exist without its working days. `theDaysItRunsOn` sets Monday to Friday only for a daily check-in; a weekly one like Fee notes is saved with none. Each reader then makes up its own meaning for "none":
  - every day (`isAWorkingDay`, `onADayTheyWork`);
  - Monday to Friday (`who-answers-and-when.ts`, `the-direct-morning.ts`);
  - always send (the lead's summary sends unless every check-in has days and today is not one).
- **Change.**
  - One calendar per check-in, set at setup: the lead's days, Monday to Friday unless they say otherwise, for every cadence, and never empty.
  - The lead's summary goes on a day at least one of her check-ins works, and not otherwise.
  - The test database is filled in the same way (no live users).
- **Deletes.**
  - The fallbacks for empty days (`[]` read as Monday to Friday in `who-answers-and-when.ts` and `the-direct-morning.ts`).
  - The empty-days guards in the lead's summary and the daily delivery alert.
  - `workingDaysOf` turning all seven days into "none".

### 4. Faith's "complete", then "still open"
- **What happened.** On WhatsApp Faith was told "Your check-in is complete and on record". A minute later her END was answered "Your check-in for 'Sales team, Q4' is still open, so nothing was ended".
- **Cause.** A session's state lived in two places. When Groundwork closed it, the row stayed IN_PROGRESS for the 70 seconds the record took to write, and was set to COMPLETED only at the end. An in-memory map (`finishedByGroundwork` and `isBeingFinished`) told WhatsApp it was finishing. Ask read only the row.
- **Change.**
  - The row is set to COMPLETED the moment Groundwork closes the session (or the person finishes it); the record is written after, on the same row.
  - `completedAt` is stamped when the record is written, which is what the round and the report already wait for, and the completion event is sent then, as now.
  - Every reader reads the status.
- **Deletes.**
  - The `finishedByGroundwork` map and `isBeingFinished`.
  - The WhatsApp filter that read the map.
  - The in-flight wait and the error-text catch in `complete()`.
  - The duplicate close path `theirOwnWordsClosedIt`, if it is only a second way to the same close.

### 5. START opening the wrong check-in
- **What happened.** Brian's and Njeri's Tuesday WhatsApp check-ins both went to Fee notes, although START was meant to open "Litigation team daily".
- **Cause.** Routing ignored what the person was replying to. It picked a check-in by stacked rules: a remembered thread, the newest opening notice only for START, closing soonest, and "one at a time". Groundwork's own replies were not tagged with their check-in, so "the last thing we said to this person" could not be read.
- **Change.**
  - A reply belongs to the check-in of the message it answers: the replied-to message where WhatsApp gives it, otherwise the last message Groundwork sent this person about an open check-in, including Groundwork's own replies, which now carry their check-in.
  - Only when that is truly unclear (nothing sent about any open one), Groundwork asks which one.
- **Deletes.**
  - The remembered-thread routing (`remember()` and its calls).
  - The opening-notice-only branch for START.
  - The closing-soonest choice as a router.
  - `oneAtATime` as a router.
  - The thread row stays for its other jobs (Ask mode and a pending pick).

## What the simplifying fixes removed (29 October 2026, night)

**Overall.** Outside the tests, 183 lines were added and 173 removed. Counting only code, without comments, 120 were added and 110 removed. So the code is about the same size, not smaller. What changed is how many paths there are and how many places decide the same thing. Every path listed below as deleted is gone. What was added is one owner for each thing, and the model naming an item by its id where code used to match words.

**1. Mercy's numbers** (`a-sales-aim-is-counted-from-the-deals.ts`, `board.listener.ts`, `the-kind-of-work.ts`, `conversation.service.ts`, `prompt-library.ts`)
- **Changed.** A deal's payments are read from its owner's lines and the lead's, never another rep's. On the test data, Mercy's count went from 27 to 2.
- **Changed.** The model is shown every item on record by id and says which one a line is about (`sameAs`). The model is shown the person's targets by id and says which one a new number corrects (`corrects`). The product edits that target and keeps the old number in the check-in's log (`targetChanges`: who, when, from, to, their words).
- **Deleted.** The word-matching used when a check-in writes a deal (`theSameName` and `theSameCustomer` in the listener). The separate "Deals on record, with the person at each customer" list, now folded into the items list.
- **Left.** Those two matchers stay for items added by hand on the board. `theAimsThatAreNew` and `theTargetItSaysAgain` stay for numbers a lead sets for other people, where the model has no id to give.
- **Left.** One duplicate deal from before the change ("Mama Rose" and "Mama Rose's kiosk") stays on the test data. Nothing merges existing rows, so Mercy's My work reads 2 where she sold 1.
- **Dropped from the plan.** "A dropped deal is not a sale" was not needed: Greenfield was only counted because of Faith's payment.

**2. The copied phrase** (`prompt-library.ts`, new `the-conversation-so-far.ts`, `conversation.service.ts`)
- **Deleted.** The quoted phrase in the instruction about corrections.
- **Changed.** The history given to the model keeps the person's words in full and Groundwork's last two turns as written. An older Groundwork turn is given only as the question it asked.
- **Kept.** The guards against repeating within one session still catch what they catch.

**3 and 6. One calendar** (`which-days-this-team-works.ts`, `schema.prisma` plus migration `20261029120000`, `who-answers-and-when.ts`, `the-direct-morning.ts`, `the-leads-daily-nudge.ts`, `the-daily-delivery-alert.ts`)
- **Changed.**
  - No days given now means Monday to Friday for every cadence and for every reader.
  - All seven days listed means every day, no longer "nobody said".
  - The column defaults to Monday to Friday.
  - Empty rows are filled in, on the test database through the migration.
  - The lead's summary goes only on a day one of her check-ins works, in her organisation's time zone.
- **Deleted.**
  - The three "empty means Monday to Friday" fallbacks.
  - The two "only if every check-in said its days" guards.
  - The "nobody said" branches in `isAWorkingDay`, `theNextDayTheyWork`, `sayWhichDays` and `everyDayThatTheyWork`.

**4. One state for a session** (`conversation.service.ts`, `whatsapp-for-an-organisation.service.ts`)
- **Changed.** `itIsFinished` sets COMPLETED the moment a session is closed, on every path. The record's own stamp (`completedAt`) is the guard that runs the rest once.
- **Deleted.**
  - The in-memory `finishedByGroundwork` map and `isBeingFinished`.
  - The WhatsApp filter that read the map.
  - The in-flight wait and the error-text catch in `complete()`. `openTheDoor` now hands back a finished session.
  - The second close path `theirOwnWordsClosedIt`, about 20 lines.

**5. A reply belongs to what it answers** (`whatsapp-for-an-organisation.service.ts`, `several-check-ins-open.ts`)
- **Changed.** Groundwork's own replies are recorded with their check-in. A message goes to:
  1. a pick;
  2. the message replied to;
  3. the last message Groundwork sent the person about an open check-in;
  4. the only open check-in;
  5. otherwise, a question asking which one.
- **Deleted.**
  - The remembered-thread routing (`remember()` and its seven calls).
  - The opening-notice branch only for START (`theLastOpeningNoticeTo`).
  - "Closing soonest" as a router.
  - The "you have two check-ins open, let's start with" line (`oneAtATime`).
  - The three thread deletes when a session finished.
  - The "I am done" close path.
- **Kept.** The thread row, for Ask mode and a pending pick.

**Tests updated, each with its reason in the file:**
- The calendar's old "nobody said is every day" tests (5 files).
- The routing and closing tests (6 files).
- The shape of finishing (3 guarded writes instead of 2).
- A monthly session on Sunday 20 December now opens Monday the 21st.
- Four chase tests whose clock was a Sunday: their teams now say they work every day.

**Tests added:**
- `the-conversation-so-far.spec.ts`
- `one-calendar-for-each-check-in.spec.ts`

**Results.** The touched tests pass, apart from the one already failing on staging (`groundwork-recommends-for-a-team-member-is-their-own-work`). Privacy passes: 30 suites, 200 tests. Typecheck passes.

**How each fix meets the five rules in CLAUDE.md:**
1. Each fix removes a cause, not one instance of it.
2. Each deletes the paths listed above. In lines the code is about the same size, as said at the top of this section.
3. Each leaves one owner: the deal owner's record, the target row, the check-in's calendar, the session's status, and the check-in a message was about.
4. The model names items and targets by id instead of word rules deciding.
5. Each is tested across its pattern, and in the real-model re-check that follows.

## The one-day re-check after the simplifying fixes (Wednesday 3 to Monday 8 February on the test clock)

Real model, kept awake, at low priority. Kevin, Joseph, Faith and Aisha on WhatsApp, Mercy, Brian and Njeri on the web; Peter forgot, as written. Every check-in closed naturally and is COMPLETED with its record. 0 dead ends. The clock then ran through the weekend to Monday 8 February.

- Mercy's numbers: her My work counts only her own sales and her corrected target of 30.
- The copied phrase: not said in any check-in. Nobody corrected Groundwork inside a check-in that day, so this is not yet a full proof.
- The calendar and weekend summaries: no lead summary on Saturday 6 or Sunday 7 February, one each weekday. Monday's openings went once each; the copies held overnight never went.
- One session state: 0 sessions COMPLETED without their record; none told "complete" and then "still open".
- START: every WhatsApp reply went to the check-in it answered.
- The checker first said 24 of 30. All six misses were the checker: it read days in UTC, merged the days the clock skipped into one, counted messages held at night that were never sent, and counted the sign-in links the test itself asks for. Each was checked against the database.

### Fix 2 proved with corrections inside check-ins (Monday 8 February on the test clock, real model, WhatsApp)

- Joseph said Mama Pima had paid for all 15 units, with nothing in writing. Groundwork said what its record showed and asked what shows the payment. When he insisted, it moved on without agreeing, and Mama Pima stays unpaid.
- Kevin corrected Groundwork about Kilele Hotel and gave the M-Pesa code. Groundwork took it in its own words.
- The old phrase was never said. Both sessions closed COMPLETED with their records written.
- Found on the way, for the quarter to measure (not blockers):
  - The opening says "It takes about ten minutes" twice.
  - Kevin also said he had not missed two check-ins, which was not true (he answered Wednesday, not Thursday or Friday), and Groundwork agreed without checking.
  - One question showed a typed backslash: "Mwangi & Sons\' second office".

## One assessment per conversation: choosing how a conversation is recorded (Hafsah, 31 October 2026)

### Where the law firm lead's information was lost
In round 4 of the first experience she named her four people in setup, typed them into the team box with emails and numbers, and pressed Save. The check-in was created at 08:58:39 with only her on it; her four reached it at 09:04:18, only after she typed them a second time on People and setup. Two causes: Save sent a separate list rather than what was in the team box (her typing during the 20-second save went into a list nothing sent), and phone numbers were saved by a second request only one kind of save made. Her own words were kept (the setup conversation is stored as her first check-in, and LeadSetupWords keeps her messages); what was lost was everything that should have come out of them. Across rounds 3 and 4, three setups produced no check-in at all and four reached only some of the people named. The same kind of loss runs through the record as a whole (the survey is in ~/Desktop/assessment-test/today.md): about 40 separate parts pull their own bits from a conversation, and a lead's first check-in made in setup gets about 2 of them where one made in the app gets about 20.

### The four options, judged on the evidence

| | A. Today: separate parts pull their own bits | B. One full assessment per conversation, checked for completeness, read by everything, raw conversation kept | C. Notes during the conversation | D. Pages re-read the raw conversations each time |
|---|---|---|---|---|
| Nothing lost | No. Filters drop lines with only a count logged; extractors are gated by scenario and board; unresolved names are dropped; the setup path skips about 18 of them; decline emits nothing; races between fire-and-forget writers and listeners. | Yes, by construction: every message the person sent is matched to an item or marked "nothing to record" before the assessment is used. | Partly. A per-turn note exists today (CheckIn.whatWeHave) and is read by no page; it misses what is only clear by the end (a promise corrected two turns later) and a failed turn read loses that turn. | Yes for the words, but each page decides afresh what they meant, so what is "found" differs by page and by day. |
| Every page agreeing | No: promise state has two writers and two kinds of reader, "done" has five writers, target counts three, coaching four sources, specificity four measures, role three copies, two session reports. | Yes: one owner per fact per conversation; pages read it, as thePromisesOf already does for promises. | Partly: one store, but read only during the conversation today. | No: each page's own reading can differ, and opening a page would rebuild it, against the rule that opening never rebuilds. |
| Every line traceable to someone's words | Mostly (RecordEntry keeps the words), but derived rows (counts, Delivery, WorkMention) often lose the words. | Yes: every item carries the person's own words and where they said them. | Yes for what it holds. | Yes, but at a model's reading each time. |
| Speed | The close waits on about 6 awaited steps; the rest race after it. | The session closes the moment Groundwork says so; one assessment is written just after (one extraction call plus a completeness check), and readers follow. | Adds a call to every turn (already 1 per turn today). | Slow: every page view re-reads every conversation. |
| Cost per check-in | About 2N+15 to 2N+40 model calls; the same turns re-read about 18 times at close. | During the turns as now; at close, one assessment call (a second only for unmatched messages), replacing most of the 18 separate re-reads over time. | As now plus nothing saved at close. | Highest: a model read per page per view. |
| How simple it keeps the code | The most complex: about 40 writers and their reconcilers. | Simpler as readers move onto it: one writer per conversation, readers read. Built by extending what exists, not beside it. | One store, but the close still needs everything else. | Removes writers but moves the work into every page. |

### The choice: B, built by extending what already exists
B is the only option that meets all six. It is built from parts Groundwork already has, not as a new system beside them:
- **The store:** CheckIn.sessionReport, a per-session Json column that exists and is already served, but is written today only by setup. It becomes the assessment for every setup and check-in conversation. The raw turns stay in ConversationTurn as now.
- **The draft:** the per-turn note (CheckIn.whatWeHave) and the end card's single extraction (ConversationTurn.recordDraft) become the assessment's running draft and its first pass, so no new per-turn call is added.
- **The completeness check:** each person message is matched to items or marked "nothing to record", and anything unmatched is added before the assessment is used.
- **Patterns (layer 2)** extend the existing pattern reads (PatternDetection, with its three-period rule, the nearest thing to the consequence ladder) and role detection (GroundParticipant.detectedFunction), reading assessments instead of re-reading turns; each pattern names the assessments and words it rests on.
- **Interventions (layer 3)** extend the coaching state (CoachingState) and My work's seven behaviours: the next step for the person and for the lead, tracked in later assessments; warnings, plans and firing stay the lead's decision.
- **Readers move one at a time** onto the assessment (the board's records, the report, My work, Ask, References and resources, the setup outcome), each proven by the no-loss check before the next, and the separate extractors each reader replaces are deleted with it.
This is built on wip/assessment and tested with against without on the same round before anything is kept.

## Why each problem happens, and the strategy (2 November 2026)

Sources: the traced failures on the smoke runs (why-traced.md, 82 items), the false flags and missed patterns in the baseline (false-flags.md), the maps of today's Ask (today-ask-map.md) and of how a conversation is recorded (today.md), and the baseline full run's scores (runs/without-round22/scores.json). The "with" run's numbers go beside these when it has run.

## The baseline, scored with the corrected scoring (wip/regressions, 3 organisations, 9 team members, 4 check-ins each)

| Measure | Baseline |
|---|---|
| Facts people said that show up somewhere | 93% of 148 |
| On the board | 66% |
| In the reports | 90% |
| Through Ask | 13% |
| Facts stated wrongly | 21 |
| Untrue lines on the board or in reports | 13 |
| Ask answers correct | 4 of 22 (what the lead said in setup: 0 of 4) |
| Numbers that disagree between pages | 8 of 22 |
| Planted patterns caught | 6 of 12 (6 of 7 for people who had check-ins) |
| Honest people wrongly flagged | 2 of 3 controls |
| Next steps offered / fitting / followed up | 16 / 16 / 5 |
| Model calls per check-in | 65 (per setup 38) |
| First-experience rating | 2.5 (law 3, field 2, sales not rated) |
| Team reached the check-in at setup | law 2 of 3, sales 0 of 3, field 3 of 3 |


## The with-and-without result, like for like (law firm and field programme, corrected scorers)

| Measure | Without | With |
|---|---|---|
| Found somewhere the lead can see | 93% | 96% |
| On the board | 67% | 71% |
| In the reports | 89% | 86% |
| Through Ask | 13% | 37% |
| Stated wrongly | 25 | 17 |
| Untrue lines | 15 | 12 |
| Ask correct | 4 of 22 | 7 of 22 |
| Pages disagreeing | 9 of 25 | 2 of 20 |
| Patterns the lead can see | 5 of 7 | 7 of 7 |
| Honest people flagged | 2 of 2 | 2 of 2 |
| Model calls per check-in (all organisations) | 65 | 78 |

The full report, with the causes of what got worse and the seven fixes built since: https://claude.ai/artifact/3851LMQjrHPFX8sSPvkMPB

## The causes, with the numbers they explain

### 1. Each page has its own route to the information (confirmed; the main cause)
The board reads record lines, targets, waits, work items and figures, each from its own table and behind its own gate; the session report reads the record lines in about 15 places; the weekly report is written from a summary of counts and names ("Brian named Kasarani Foods, Baraka Hardware and KES"); Ask has 45 lanes, each with its own small lookup, and a documents answer that reads only record lines and targets. Whatever a route doesn't carry is missing on that page.
- Explains: 66% on the board against 90% in the reports and 13% through Ask; the setup facts that reached no page (1 of the law lead's 18) when the separate target write failed; the weekly report's empty sentences.
- On the "with" branch at first, the assessment held every fact but no page read it ("the assessment itself reaches nobody"), so it was one more copy and scored lower.

### 2. Ask decides what a question means before it reads the record (partly as suspected)
Fixed patterns place a question first (about 139 of them, plus about 30 word lists); when none matches, the model chooses only from a menu of 26 read lanes, and the chosen lane then blocks the record answer. Every lane answer in the smoke runs was wrong; both correct answers came from the record answer.
- Explains: 4 of 22 correct; "When is the Kasarani Foods filing due?" answered "Nothing is due" from the lead's own to-dos; "Tell me everything Brian told you" answered with a list of what Ask can do.

### 3. Model-written text is not tied to the record (real, smaller)
A client's promise stored as the person's own commitment; a wait's label cutting off the amount owed; "Monday 9 November", said on 13 November, stored as 2027; the page's own worked example ("300 organic chickens") stored as the lead's goal.
- Explains: part of the 21 stated wrongly and the 13 untrue lines.

### 4. The same figure is counted in more than one place (confirmed)
"Who has answered" was computed in about 35 places (the board header "2 of 4", the report index "1 of 1", the check-in page's own copy, Today's nudge "three"); the end date two ways ("19 January" and "18 January"); the weekly "100% of check-ins made" counted rows, not people.
- Explains: 8 of 22 numbers disagreeing between pages.

### 5. A failed model write is lost, not retried
Setup's record extraction and target read failed on a network error and were only logged; that lead's whole setup reached no page.

### 6. Gates drop facts
Work items are made only when a kind of work is set; figures are kept only for agreements.

### 7. The record has no place for what people say
"Twice a week, Monday and Thursday" had no value, so pages said "Every week", "Every Thursday" and "Weekly, Thursdays".

### 8. Stale copies
The report's opening count was frozen when written; one promise sat in two tables with different days.

### 9. Patterns are judged by many readers, from silence, inside a round (the false flags)
Six separate readers judge a person, each with its own threshold, often inside one round; silence is read as a finding ("nothing on record says it was raised higher"); the quiet, precise people get thin records (leading questions, early closes) and the gaps are held against them; one standing debt counted as three periods; a client's promise counted as the person's; settled items keep counting; a regex decides whether something was "taken further".
- Explains: 2 of 3 honest controls flagged (Aisha, Joseph); the quietly excellent person (David) told "Nothing David said this round can be checked yet"; weak catches resting on a generic line printed for everyone.

## The strategy (for every scenario, not this run)

1. **One source.** One assessment per conversation, checked for completeness, is the only reading of what was said. The record (record lines, targets, promises, waits, work items, figures) is written from it by one writer each. Every page, report, summary and assistant answer reads through one reader that applies who may see what. Removes: the per-page routes, the weekly summary, Ask's lane lookups, the separate target and promise reads, the duplicate promise table. Moves: facts on the board, in reports and through the assistant toward 100%; stated wrongly down.
2. **Pages show the record; the model only words it.** Every sentence on a page rests on facts in the record and names them; a sentence that rests on nothing is not shown. Removes: model-written summaries that are not tied to facts. Moves: untrue lines to zero.
3. **One count for each figure.** "Who has answered" and every other figure is computed once on the server and served; no page counts for itself. Removes: about 35 counts and the client's copy. Moves: pages disagreeing to zero.
4. **No write is lost.** Every model call that writes the record or the assessment is retried, and if it still fails it is kept as owed on the conversation and written later; pages rebuild when it lands. Moves: nothing said in setup lost.
5. **The record holds what people say.** The schedule holds days of the week; no frozen copies of figures. Moves: stated wrongly down.
6. **A map of where each kind of fact appears.** For each kind of fact (deal, fee note, task, promise, decision, wait, date, proof, target, figure, role, risk), where it appears on the board, in the reports and through the assistant. A fact with no home is a design gap (the work items without a kind of work: a section of the existing board, approved 2 November).
7. **Patterns have one owner.** Layer 2 of the assessment is the only thing that states anything about a person's behaviour: distinct items, each with its owner and its settlement, counted across the whole record, with proof from any check-in counting; anything "not on record" becomes the next check-in's question, never a flag; each pattern names its instances. Removes: the other readers (the waits and worries lines in what-to-probe, the TAKEN_ABOVE regex, the board's "nothing checkable" and "only asked about" reasons, per-transcript coaching, the detector's lead-facing lines and the chaser guard that patches them). Moves: honest people flagged to zero, quiet excellence shown, model calls down. Needs Hafsah: replacing PatternDetection's lead-facing patterns (a must-keep), retiring the chaser guard, the lead's setup notes as her side in the bias test.
8. **The assistant understands with the model** and answers from the one reader (see the assistant design). Moves: the assistant's correct answers.
9. **The test's measures are a standing check**, run on every change, with model calls per check-in reported every time (65 in the baseline) and brought down without losing quality.

## Where it stands
- Built on wip/assessment (pushed to Hafsah's copy): the one reader (theFactsOnRecord), Ask's documents answer reading it and the read-lane menu removed, the weekly and session reports reading it, the one count on the server and every screen, retries with writes owed until they land, one promise one owner, targets from the lead's assessment.
- Being built: the record written only from the assessment; twice a week; the work-items board section (gate 1). Left as is: gate 2 (changes no page).
- Not built yet: the patterns fix (needs Hafsah on the must-keep), the assistant, the Desk, email check-ins.

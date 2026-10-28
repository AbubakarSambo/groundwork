# Fix plan: by root cause, not by symptom

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

## Status

Each pattern is marked here when it is fixed, with its commit and its tests.

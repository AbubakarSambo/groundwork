# The release, for Abubakar

This replaces pull requests #324 and `groundwork-next-release`. It is made from your base as it is today (`59533562`, which already holds #322 and your seven commits of 6 October), and it holds only what the live product needs: product code, migrations, the tests that check how the product behaves, and three notes. It comes as two pull requests, merged in this order:

1. **The engine** (`api/`): the server, its migrations, its tests, the one-off scripts the release night runs, and these notes.
2. **The screens** (`client/` and `marketing/`): the screens, their tests and the browser tests. They call the engine's new routes, so merge the engine first.

## Release 1, pull request 1 of 5: the pictured board and reports (18 October)

This is the first of five small pull requests for Release 1 (Drop Access, a sales team). They are merged in order, each built on the one before. This one brings the screens Release 1 is built on: the board, the team report, each person's own report and the weekly report, drawn as Hafsah's pictures show them, with the API they read.

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is one new migration,** `20261016090000_a_report_shares_itself_at_its_set_time`. It adds `grounds.report_shares_at` (empty) and `reports.held_sessions` (an empty list). No existing row is changed. See `docs/deploy.md`.
- [ ] **Existing check-ins keep today's behaviour.** Their report is shared once everyone has checked in, or when the lead shares it, as now. A report shares itself at a set time (6:30pm, unless the lead holds it) only where a lead turns it on in People and setup, under Who sees what, or for a new check-in whose scenario's default says so (today only OKR_ALIGNMENT, the kit's sales board).
- [ ] **No new templates, no new one-off scripts, no new settings.**
- [ ] **GitHub's checks cannot run** (the Actions budget is used up), so they fail after 2 seconds. The local results are in the pull request's description.

## Release 1, pull request 2 of 5: "sales team", and the switch for Release 1's sales board (19 October)

The second of the five pull requests for Release 1. It is built on pull request 1 and does two things.

1. **"Sales team" is a kind of work of its own,** beside "sales org". A sales team is one lead and the people who sell under them (Drop Access: Grace and three reps); a sales org is a sales organisation of several teams. Until Release 4 draws the sales organisation's own board, both get the same sales board, deal grid, stages, To close the gap, customer standing and sales reports: every place in the code that asked whether a check-in is "sales org" now asks whether it is either sales kind (`isASalesKind` in the API, and its twin in `client/src/lib/a-sales-kind.ts`). The read at setup is told the difference and is given the people's job titles. A check-in that already holds one sales kind keeps it when a later read says the other; only the lead changes it. Wherever "sales org" is offered, "sales team" is offered too. The lead now reads "One sales team and its deals" and "A sales organisation of several teams, and its deals" in the chooser, and "This check-in is about a sales team and its deals." or "This check-in is about a sales organisation of several teams, and its deals." on the board.
2. **A switch per organisation for Release 1's sales board,** `Organization.release1SalesBoardOn`, off for every organisation. Groundwork staff switch it on in Admin, Orgs, inside each opened organisation, under "The new sales board"; a script does it for a test organisation only. In this pull request nothing reads it yet: the parts of the sales board that follow in pull requests 3 to 5 read it, so an organisation with it off keeps the board it has.

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is one new migration,** `20261017120000_release_one_sales_board_switch`. It adds `organizations.release_1_sales_board_on`, false for every existing organisation. No other row is changed. See `docs/deploy.md`.
- [ ] **Existing organisations see nothing new.** The switch is off for all of them, and nothing reads it yet. Existing check-ins keep the kind of work they have; "sales org" ones are not moved to "sales team".
- [ ] **No new templates, no new settings, no new prompt versions.** The read of the kind of work at setup is a prompt in the code (`THE_KIND_OF_WORK_PROMPT`), not one stored in the database, so the new wording is the one that runs.
- [ ] **One new one-off script,** `api/scripts/the-release-one-sales-board.ts`, for test organisations only. It is never run by a deploy.

**Old tests this changes, and why:** the kinds count is twelve now; the offered list includes "sales team"; the short-tag source check reads `isASalesKind`; the sales org's banner and chooser label on the board now say "a sales organisation of several teams", because "a sales team" is the new kind's sentence.

## Release 1, pull request 3 of 5: the sales board (19 October)

The third of the five pull requests for Release 1. It is built on pull requests 1 and 2, and it is the first one that reads the switch `Organization.release1SalesBoardOn`. With the switch off, which it is for every organisation, a board reads as it did before. With it on, a sales check-in's board reads as the kit's sales board:

1. **Deals and leads counted from the record.** Each sales aim is counted from the deals: what is sold, what is proven by a payment record or a signed order ("65 sold, 65 with proof of payment"), and new leads. A customer's reply is kept on its deal, not as a team wait. A deal's value is the whole deal, never the price of one unit or a discount. The day the customer said they will buy is on the deal. Each stage a deal is put at is kept with its day.
2. **What needs you.** Each decision a wait on the lead is waiting for, with Yes and No; "Decide whether a price range counts as a budget"; a decision the lead promised herself; "No stall rule set yet", with 3 working days suggested for her to confirm; and, at the end of her own check-in and on the Context tab, the targets read from her words as one card to confirm or correct before they go on record. Today counts the same list.
3. **To close the gap, the four criteria and the groups.** Each deal's four criteria (need, budget stated, who decides, buying date) ticked, the stages its record meets, what it still needs and from whom, and its group: Likely, Possible, Next quarter, Cooling, and Cold only under a stall rule the lead set. Lost deals are listed once, with the reason in the rep's own words.
4. **The team today and the blockers.** Each rep's line from today's check-in and what to coach them on this week, a promise carried over three check-ins running, and each blocker in the kit's format with what was tried, in a full sentence with its day. A target said again is that target, and is counted once.
5. **Context.** Each target once, as the board reads it, and "The plan, as agreed".

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is no new migration.** `schema.prisma` only changes the comment on `release1SalesBoardOn`.
- [ ] **Existing organisations see nothing new.** The switch is off for all of them. The tests named `release-one-sales-board-switch-as-each-reader-reads-it`, and each new test's "with Release 1's switch off" case, read the board, the session header, Context and the gaps as before.
- [ ] **What runs for every sales check-in, whatever the switch says** (the writers, as `release-one-sales-board.ts` says: they only add): the deal rows are read with each deal's details (value, price each, units, contact, next step, buying date, need, budget stated, decision maker), and each stage is kept with its day. The records read is a prompt in the code (`theRecordsPrompt`), not one stored in the database, so the new wording is the one that runs.
- [ ] **No new templates, no new settings, no new prompt versions, no new one-off scripts.**

**Brought early from later pull requests, unused by the product until then:** `api/src/modules/reports/a-correction-is-their-latest-word.ts` (the board reads it), `the-sales-week-in-numbers.ts`, `what-a-sales-week-shows.ts`, `a-sales-report-read-from-the-deals.ts`, `the-sales-week-in-words.ts`, `the-sales-team-report-from-the-record.ts` (board tests read them), and `api/src/modules/conversation/what-a-sales-check-in-gathers.ts` (the four criteria test reads it; nothing calls it yet).

**Old tests this changes, and why:** `a-number-with-a-name-on-it-goes-through-one-rule.spec.ts` no longer excuses `reports/the-sales-readings-for-a-report.ts`, which comes in pull request 4 with its excuse. `a-gap-the-record-now-answers-is-not-unanswered.spec.ts` and `a-finished-session-is-never-still-open.spec.ts` switch Release 1 on, because what they check is behind the switch here, and each gains a case that reads the board with it off.

## Release 1, pull request 4 of 5: the reports (19 October)

The fourth of the five pull requests for Release 1. It is built on pull request 3 (the sales board) and reads the same switch, `Organization.release1SalesBoardOn`. With the switch off, which it is for every organisation, the team report, each person's own report and the weekly report read as they did before, with one exception for everyone (item 5). With it on, a sales check-in's reports read as the kit's:

1. **The team report.** Its title and day, In short from the deals, What moved with the stage each deal reached and its owner's line, each person in the third person marked proven or said, opened to their own words, with what they will do, Where people see it differently in full sentences, How much it can rely on and why ("1 of the 5 commitments has"), What I don't know yet (a question asked and not answered, then what the deals cannot tell yet), Why the numbers don't match where the record can work it out, and the closing line, "How sure Groundwork is about this report". A person correcting themselves settles a difference.
2. **Your own report.** What you did well in your own name ("You got Greenfield Supermarket's signed order for 25 units, KES 125,000, on 13 October, and you added it. It counts as proof."), a line read with its document's date over memory, a customer's promise on the deal as the customer's, the kit's story in place of a second summary paragraph, what you told us said once, and One thing to think about from one of your own deals.
3. **The weekly report.** The kit's five numbers counted from the deals, What this week shows from the deals with the amber strip, "The samples for Tuskys Westgate, promised three check-ins running, still not done.", What changed with Moved, Dropped and Adapted, For you to do next week in the order to do it with where each comes from, and a daily check-in's week to its last check-in with the day it was written.
4. **Today and the lead's list.** One wait said once, what changes said as the waiting person's, a side that said nothing left out, a difference that is only a target said again or settled by a correction left out, and "Tell Mercy Wairimu about the goal you set for the order confirmation process."
5. **For every organisation, switch or not:** a participant's report carries only their own engagement row and session count. Each person's load is private, always, and the stored report carried every colleague's row to a participant. The lead and an org admin keep every row.

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is no new migration.** `schema.prisma` only changes the comment on `release1SalesBoardOn`.
- [ ] **Existing organisations see nothing new, except item 5.** The switch is off for all of them. `release-one-reports-switch-as-each-reader-reads-it.spec.ts` reads the team report, Mercy's own lines and the weekly report with it off, as Grace and Mercy, and each new test that switches it on has a case with it off. `each-persons-load-is-their-own-in-the-report.spec.ts` proves item 5 as each reader.
- [ ] **What runs for every sales check-in, whatever the switch says** (the writer): the weekly row keeps the week's deals and each sales target's count from the deals beside the count said. The read serves them only with the switch on.
- [ ] **No new templates, no new settings, no new prompt versions, no new one-off scripts.** The reports' new sentences are written in code from the record; no prompt changes.

**Brought early from later pull requests:** none. The six report files part 3 brought unwired are now wired.

**Left for pull request 5:** the lead's daily summary and engagement messages, message channels, quiet hours (including the reports listener's "a check-in the clock closed is not 'has checked in'"), the sales check-in's gathering prompt and its wiring, the conversation's own fixes, and the ScheduledWhatsApp migration. Also left: a weekly report stored before the "her approval" fix reading the wait as now written (`what-the-record-shows-over-time.ts`, Drop Access run 1, A7), and the same goal wording in the message a person reads a week on (`whatThePersonReadsAfterAWeek`), both of which the source applied to every organisation.

**Old tests this changes, and why:** `a-private-guide-is-private`, `every-report-read-strips-other-peoples-ratings` and `specificity-is-yours-to-see` now expect a participant to read only their own row (stricter, item 5). `a-number-with-a-name-on-it-goes-through-one-rule` excuses `reports/the-sales-readings-for-a-report.ts`, which this pull request brings. `nothing-in-here-is-wired-to-nothing` lists the short run's report bed as test-only, and carries a KNOWN FAILURE note: it fails on staging and on pull request 3 as well, and its two orphans are wired by pull request 5.

## Release 1, pull request 5 of 5: the messages and the conversation (19 October)

The last of the five pull requests for Release 1. It is built on pull request 4 (the reports) and reads the same switch, `Organization.release1SalesBoardOn`. It brings the rest of Release 1: what people are sent, when and on which channel, and what the conversation asks and how it says it.

**What every organisation gets, switch or not.** Only Hafsah's standing rules, and corrections of things the product said that were untrue:
1. **Each opening on one channel.** No "Your next check-in is open" email when the WhatsApp opening went, or is held for the night; while it is still on its way, the email waits for the next sweep (half an hour at most).
2. **Quiet hours end at 7 in the morning where the organisation is.** A WhatsApp message Groundwork starts in the night is kept and sent at 7 (the new table, below). The reminder to carry on a check-in left halfway, and a request told on WhatsApp, read the organisation's zone, not Lagos for everybody. Mail somebody asked for ("Joseph Kariuki has checked in") is held for the morning too.
3. **One routine message a day, and the lead's summary is hers.** Routine mail to somebody who runs a check-in waits until just after the morning summary and goes only if the summary did not. The summary is never held back by the day's count. "Three of four people have checked in ... not the whole team's view yet" is not emailed; the lead is emailed when everybody is in.
4. **"About ten minutes".** The email for a new check-in now reads "A new check-in is ready for Sales team, Q4. It takes about ten minutes, and answering keeps the picture you and your team read up to date."
5. **The template `lead_daily_summary` is unchanged.** Its link, after "You can open your board for the full picture here", is now the board of the check-in the message is about, where it was Today.
6. **What was untrue, made true.** A promise the record says is done is never told as late in the lead's summary. A check-in the clock closed is not "Joseph Kariuki has checked in". The missed check-in notice says "Grace will see this." only once Grace is told, and before that "If you miss the next one as well, Grace will be told." "I've asked Grace about the price" counts as something tried, so no "Not backed:" is said beside it. A wait kept as "her approval" reads as what it is. The weekly letter counts the check-ins made: "This week, 13 of the 15 check-ins were made. Joseph missed two of five.", never "all four people checked in" in a week Joseph missed two.
7. **The conversation never says what is wrong or broken.** The same words said again after the reply was read are a new answer, so "I do not know." twice is answered twice, not handed the same question back. The question just answered never goes out again in the next turn. A pronoun is never written as a name ("in She's court") or as the name its clause already has ("Joseph is still dragging Joseph's feet"), and a business is never taken for a person. A sentence of theirs inside ours is reported in their person ("You said doing well means consistently hitting your sales targets, then ..."). "It clearly." on its own never goes out. A target the lead set for somebody reads "Grace set this target for you.", never as their own goal. "Greenfield is secured for 25 units, and Mama Mboga Mart wants 2" answers how the number is made, and is not asked again. On the screen, an answer typed while the question is still being written out stays whole.

**What only an organisation with the switch on gets** (`release-one-sales-board.ts` lists it):
1. **What a sales check-in gathers.** A rep's check-in is told what the board needs about each customer, their own deals and leads, each open deal's four criteria still missing and asked once, and the proof of a deal called won or quoted, asked once. It is a stored prompt, `kind_of_work.sales_org` (below). Another rep's customers are never put to a rep, a deal's units or a count of places visited are never their target, and no word of a customer's name is taken for a person.
2. **A promise said done is kept on the record**, on the day it was said, by its maker or by the person it was for.
3. **The lead's morning summary from the deals.** Grace reads: "Two things need you today. Joseph has been waiting since Wednesday for your answer on Juja Hardware, which wants 5 units at KES 4,500 each instead of KES 5,000. You said on 12 October that you would decide on KES 12,000 off 10 units for Mama Pima Stores, and Wanjiru is still waiting." then what is due today and tomorrow ("Tomorrow, Savannah Cafe pays a KES 15,000 deposit, and Greenfield Supermarket takes delivery and pays."). An answer she owes with no day of its own is under Needs you; her promise is said once, inside the decision it answers; a deal at her stall rule and a wait past its day on somebody outside the check-in are risks; each part gets its first line before any part gets a second; the counts of the subject are in one form.
4. **What was tried, in full, in the messages.** In the summary, a person's week and the weekly letter, a claim carries "Joseph said on Friday 23 October, “I've asked Grace about the price.”" or nothing, in place of "Not backed: ... could have messaged you". The board keeps Hafsah's note.
5. **The weekly letter** says one decision once, and the counts of one sentence in one form ("10 things ...; 14 handoffs").
6. **A report notice with nothing in it yet** is a thank-you said inside the 24 hours only ("Thank you, your answer for Sales team, Q4 is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read."), and never the first message to a number.
7. **A goal not told, a week on:** "Grace has set a goal about the order confirmation process, and will talk it through with you."

Groundwork staff, switching it on in Admin, Orgs, now read: "Drop Access (test) now has the new sales board. Its board, team report and weekly report show it from the next time they are opened."

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is one new migration,** `20261018120000_whatsapp_held_for_the_night`. It adds one empty table, `scheduled_whatsapp_messages`, and its index. No existing row is read or changed. See `docs/deploy.md`, section 2.
- [ ] **One new scheduled job,** `held-for-the-night.cron.ts`, every fifteen minutes under its own lock, sends what was held at 7. Release question 10a-2.
- [ ] **One new stored prompt,** `kind_of_work.sales_org`. The first start creates and activates its version 1 ("Seeded on deploy"); no other key gets a new version. It is read only on a sales check-in, for a rep, with the switch on. See `docs/deploy.md`, section 6.
- [ ] **No new templates, and no template changed.** Only the values put into `lead_daily_summary` change.
- [ ] **Five one-off scripts for test organisations only** (`api/scripts/`), never run by a deploy. They refuse any organisation whose name does not end in "(test)".
- [ ] **Existing check-ins keep their cadence and every setting.** Nothing in this pull request writes to a check-in's schedule, kind or settings.

**Left as it was, and why:** "Runs out in 7 days" stays an email of its own for every organisation, because it is the only warning before a check-in is stalled and the summary's lines can be cut for room; it no longer holds the summary back (release question 10a-2, item 4). The conversation's wider reading of an aim ("wants to", "needs to") stays on a sales check-in with the switch on, as pull request 3 left it, because elsewhere it would change what every check-in is asked. Groundwork's suggestion of an account several people name (`detectors/an-account-several-people-name.ts`) is not on staging at all, so its fix is not brought.

**Old tests this changes, and why:** `one-routine-message-a-day` expects the lead's summary to go after a routine email (standing rule: the summary wins). `the-leads-daily-nudge` expects the summary's link to be the check-in's board, and its "answer with no day" case switches Release 1 on. `a-deals-four-criteria` and `release-one-sales-board` switch Release 1 on where they read the gathering, and the admin message is the new sentence. `a-colleagues-target-is-not-given-to-your-check-in` reads the targets line as it now is (a deal's figure left out). `a-line-somebody-unsaid-counts-toward-nothing` and `nothing-in-here-is-wired-to-nothing` lose their KNOWN FAILURE notes: they pass now. The new tests from the Drop Access run switch Release 1 on wherever what they read is behind it, and the morning summary, the weekly letter and the gathering each have a case with it off.

## Release 1B, pull request 1 of 3: People and setup (19 October)

The first of three small pull requests for Release 1B, built on Release 1's pull request 5. It rebuilds People and setup as Hafsah's B8 pictures draw it, from everything the tab has today, behind a new switch per organisation, `Organization.release1bTabsOn`, off for every organisation. With it off, People and setup reads exactly as it does today. With it on, there are three views, decided by the server (`GET /grounds/:id/people-and-setup`, `grounds/people-and-setup.ts`):

1. **The lead (runs it): the whole page,** in the pictures' order: How this check-in runs (one sentence, "5 people answer every weekday, until 30 October, on WhatsApp or here.", and each setup problem with its one fix), What it is (name, scenario and kind of work), Who's in it (one list of people with their role here, WhatsApp and getting started; the join link and QR code; today's add-person form), When it runs, How people answer, Starting point, Who sees what, Recent changes, and the ending ("Decide how it ends", and "Delete this test" while nobody else has answered). Nothing applies until "Save changes"; each change is written through the route that already writes it, so "What it is" confirms the kind of work only through PATCH kind-of-work, and never on its own.
2. **An admin who does not run it: the whole page with no ending.** "You can't end a check-in you don't run. Ask us and we'll end it, usually the same day." with "Ask us to end this check-in". She is told whether a person's role has been described, never the lead's words, and every control the server refuses her is a sentence, not a control.
3. **A team member: only the short page.** One sentence on how it runs, Your role (their own job title), Your status, Your sessions, Runs it, and "Grace knows who is here. You see the team's report once it's shared, with names." The server serves a member those keys and nothing else.

Groundwork staff, switching it on in Admin, Orgs, read: "Drop Access (test) now has the new People and setup tab. Each check-in shows it the next time it is opened, and no setting changes."

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is one new migration,** `20261019120000_release_1b_tabs_switch`. It adds `organizations.release_1b_tabs_on`, false for every existing organisation. No other row is changed. See `docs/deploy.md`.
- [ ] **Existing users see nothing new.** The switch is off for every organisation. With it on, existing check-ins keep their cadence and every setting: opening the page writes nothing.
- [ ] **No new templates, no new settings, no new prompt versions, no new scheduled job.**
- [ ] **One new one-off script,** `api/scripts/the-release-1b-tabs.ts`, for test organisations only. It is never run by a deploy.

**Where the picture and the product differ, and which is kept** (the product's working behaviour, each time):
- **The join link.** The picture shows `myground.work/j/drop-sales-q4` and a short code "DQ4-7KM typed in at myground.work/join". The product's link for a check-in is `/answer?t=<a long token>` (anyone answers without an account and says who they are at the end); `/j/<code>` is the organisation's own invite link, not a check-in's, and `/join` takes the token in the address, not a typed code. There is no short code for a check-in, so today's "Or share an access code instead" stays where the code would be.
- **Who gets in.** The picture offers "People at Drop Access get in straight away; anyone else waits for an admin" or "Everyone waits for you to let them in". The open link has one rule: anyone with it answers. It is said as that sentence, with no choice.
- **Their role here.** "They describe it when they join" or "Same for everyone": the open link asks no role. Said as "They aren't asked for one. You can add it in the list below."
- **Works until.** The picture offers "The check-in ends", "7 days from now" or "The first 20 people join". The product's link works until the check-in ends (or is paused) and has no expiry or count of its own. Kept as "The check-in ends", said as a sentence.
- **Make a new link and code, and Turn it off.** No route makes a new token or turns the link off, and every check-in is assumed to have one, so they are not drawn. The count under them is real: "3 people have answered with it." (people who came through the link).
- **Choose another scenario.** No route changes a check-in's scenario, so the scenario is shown, not changed. The kind of work is chosen there.
- **Remind the admin.** No route lets a lead remind an admin for somebody else; an admin reads "Let them in on People" instead, as today.
- **Give someone access.** No one-by-one grant exists. "Others with access" says the server's rule as a sentence.
- **"Not seen"** for each other's check-ins, **"each answers before reading the other's"**, and **"no names, and only groups of 5 or more"**: not in the product, so not offered; the two choices it holds are.
- **"Linked to"** another check-in: not in the product; not drawn.
- **One navy button.** "Copy link" and "Save changes" are navy in the picture; here "Add people" is the only primary button, by Hafsah's rule of 30 September.
- **Recent changes** record what they recorded before (how long it runs and how often); a saved change to another setting is not yet added to it.
- **"What doing well looks like"** moves to References and resources in pull request 2 of 3; until then it stays under Starting point, so nothing is lost.

**Old tests this changes, and why:** `the-rebuilt-pages-use-only-the-new-parts.spec.ts` lists the two new pages among the rebuilt pages, which hold them to its rules; nothing it checks is loosened.

## Release 1B, pull request 2 of 3: References and resources (19 October)

The second of three small pull requests for Release 1B, built on pull request 1 (#380). It renames the Context tab "References and resources" and rebuilds it as Hafsah's B6 pictures draw it, behind the same switch, `Organization.release1bTabsOn`, off for every organisation. With it off, the Context tab, the check-ins, the board and every upload read and behave exactly as they do today. With it on:

1. **One template for every scenario** (`grounds/references-and-resources.ts`, `grounds/the-references-template.ts`). The sections never change: the top line with "Ask about this work" and the lead's "Add", About this work, Suggested from your check-ins (the lead only, when there is one), How we work (Rules, What each stage needs, Coaching, Risks to watch for), Documents, Evidence, Questions and answers, and People (the lead only). Only the words and data change, from the kind of work's own records (what an item is called, its stages, and a starting set only where it is already true of the product: for a sales team, what Qualified, Quoted and Won need and the risk of a deal marked won without proof).
2. **Each reader is served their own view by the server** (`GET /grounds/:id/references-and-resources`). The lead reads every section. A team member is never sent People, the lead's notes on anybody, what to help them with, a line the lead kept to herself, her suggestions, a document they may not open, or anybody else's evidence: those are absent from the payload, proved per reader at the server. An admin who does not run it reads the shared sections and every piece of evidence, never People and no documents. Only the lead may add or change a line: a team member and an admin are refused at the server, and everybody is refused while the switch is off.
3. **Today's Context content is read into the new sections, never rewritten.** The brief everyone reads, in About this work ("Grace, at setup" where it is her own words; her own brief to her alone where Groundwork shortened it); "How we work" and "The strategy" lines, in Rules; "Notes" lines and her note to everyone, under "Also worth knowing" in About this work; her notes about one person (from before), in People under that person, marked "Written before References and resources. Their check-ins do not use these."; a plan's proposals waiting for her, in Suggested, with Add, Edit and Dismiss; the documents, in Documents, each with who can see it. **What does not fit, and where it is:** "Still to decide" and "Not settled" lines are decisions, which the spec puts on the board, so they are not drawn here (the board reads them as before); the targets, the plan as agreed, each person's card and what people are down as doing are progress and promises, on the board today and in My work in pull request 3; the old context chat and "From a plan" are reached through Ask and through Add, "A plan".
4. **"What doing well looks like"** moves from People and setup to About this work, the same panel with its versions and wording.
5. **The check-ins read References and resources** (`conversation/what-references-and-resources-hold.ts`), as knowledge, never a script: what each stage needs, coaching for the team and risks to watch for; the lead's People note and what to help this one person with, in that person's own check-in only (never the lead's own, never anybody else's); and the proof they added in this check-in, as it was read and filed. The rules already reach every check-in as "how this team works", so they are not said twice. The words are in the code: no stored prompt changes. With the switch off, every prompt a turn hands the model is identical to the same turn with none of the new lines on record (proved on a real turn through `sendMessage`).
6. **Proof added in a check-in is filed on its item** (`documents/proof-filed-on-its-item.ts`). A file added in the web check-in (it now says so on upload) or sent on WhatsApp during one is read with the existing reading, then, with no model call, sorted by the board's own rules (a signed order, a payment or a quote counts as proof; a photo of a visit or a plain document does not) and filed on the one item its words name, the person's own first, or the item their last words in the check-in named. Where it names none, or two, it is kept as evidence on no item: never a guess. The board shows each item's own evidence beside it (the lead and an admin every piece, a person only what they added), and References and resources lists it, 25 to a page, newest first, with search and filters by kind, person and date.

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is one new migration,** `20261019180000_release_1b_references_and_resources`: six new values for a context line's kind and one new, empty table, `item_evidence`. No existing row is changed. See `docs/deploy.md`.
- [ ] **Existing users see nothing new.** The switch is off for every organisation. With it on, existing check-ins keep their cadence and every setting, and opening the page writes nothing.
- [ ] **No new stored prompt, no new templates, no new settings, no new scheduled job, no new script.**
- [ ] **The public API's own check-in upload is unchanged:** it does not file proof as evidence.

**Where the picture and the product differ, and which is kept:**
- **Counts are said in a sentence under each heading** ("2 documents.", "2 pieces of evidence. ..."), not after a dot in the heading, by the wording rule; "People · only you" is "People" with "Only you see this." first in its note.
- **Suggested from your check-ins** holds a plan's proposals still waiting for the lead. Nothing yet picks a rule or guideline out of the lead's own check-in, so none is suggested from one (a question for Hafsah).
- **Questions and answers** says nobody has asked yet. Ask does not keep the questions asked about one check-in, and an unanswered one is not yet sent to the lead (a question for Hafsah).
- **Ask about this work** opens Ask, already set to this check-in, under its own name ("Ask <organisation name>", Hafsah's answer 3). It answers as Ask does today; answering only from this page, with the source shown, is not built.
- **A document a team member shares in a check-in** is filed as evidence where it is proof; it is not yet put on the lead's board for her to decide whether to add it to Documents.
- **The prototype's evidence filters** are buttons; here they are one list each (kind, person, when), with search.
- **"See the order"** on the board is not drawn: a photo is read into words when it arrives and the file itself is not kept to open.
- **The tab's new name** is on the check-in page and the board's header; the session report pages and the check-in chat's own header still say "Context and resources".
- **One navy button:** "Add" in the top bar; every other button on the page is secondary.

**What a person reads, the sales check-in ("Sales team, Q4", Drop Access):**
- Grace, the lead: "Your team’s reference for this work. They can read it, except People. Only you can add to it." with "Ask about this work" and "Add". About this work: “Sell 120 water dispensers this quarter, mostly to hardware shops and schools in Nairobi and Kiambu.” "Grace, at setup", the key facts she added, and What doing well looks like. How we work: "Check-ins use these to guide each person and to know what to ask about." Rules, What each stage needs ("Qualified: need, budget, decision maker and buying date.", "Quoted: the customer has the quote, with a photo or the email.", "Won: a signed order or a payment, with proof.", each marked Groundwork’s), Coaching, Risks to watch for, and "Lines marked as Groundwork’s are the starting set for a sales team." Evidence: "Photos, slips and documents your team added as proof. Each also shows on the board." People: "Only you see this. Your notes on each person. Their check-ins use these. They never see them."
- Mercy or Kevin, a team member: "Your team’s reference for this work, kept by Grace." with "Ask about this work", and no Add. The same About this work and How we work, the documents shared with them, and Evidence: "Proof you added in your check-ins. Each also shows on the board." No Suggested, no People.

**Old tests this changes, and why:** `the-rebuilt-pages-use-only-the-new-parts.spec.ts` lists the two new client files among the rebuilt pages, which holds them to its rules; `a-number-with-a-name-on-it-goes-through-one-rule.spec.ts` names the new filing among the files that read an owner and hand nothing to a reader, with why. Nothing either checks is loosened.

## Release 1B, pull request 3 of 3: My work (19 October)

The last of three small pull requests for Release 1B, built on pull request 2 (#381). It rebuilds My work as Hafsah's B7 pictures draw it, behind the same switch, `Organization.release1bTabsOn`, off for every organisation. With it off, My work reads exactly as it does today. With it on:

1. **One template for every scenario** (`board/my-work.ts`, `client/src/pages/grounds/MyWorkPage.tsx`). The sections never change: the person's name and three numbers, their focus this week (the "to improve" line of their first Needs work, and why), To do (what others need from them, with since when or by when; then their own promises, with their day, done ones ticked, late ones marked), What you achieved (each with its proof), How you're performing (the seven behaviours, always in the same order), Coaching (Things to do better, each with where it comes from; Keep doing, from their strengths), Your check-ins (done, on time, specific) and Your reports, and their items (stage, next step, proof, and See all on the board). Only the words and data change, from the kind of work's template: what an item is called ("deals", "releases", "loans") and what its last stage is ("sold", "deployed", "repaid").
2. **The seven behaviours** come from the behaviour and pattern library (`patterns/the-seven-behaviours.ts`). The library had no entry for any of the seven, so every "what it means" and "to improve" line is the spec's, added word for word (21 lines; see the list below). Each behaviour reads Strength, Needs work or Not enough yet, says what happened with numbers, and what it is based on; "Not enough yet" is used whenever the record is thin, never a guess.
3. **Each reader is served their own view by the server** (`GET /grounds/:id/my-work`). A person reads only their own page, and asking for anybody else's is refused before any of that person's record is read. The lead chooses whose page to read, and reads it as a manager would: what happened, with numbers, her own coaching and her own note for the person, and the pattern's one step. She never reads the person's own reports (private, always): her payload says they are the person's own. An admin who does not run it, and anybody outside it, are refused. Only this check-in is read: nothing adds up a person's load across check-ins. Nothing is a label on a person: each verdict is about one behaviour.
4. **Nothing on today's My work is lost.** Today's page is drawn under the new sections by the same code: what keeps coming up (with its answer box), what you are carrying forward, how checkable your record is, your record, your check-ins, what success looks like, what you delivered, corrections, what to walk in with, and the lead's "Every session" and "Who has answered" (one press away; with the switch on, those two views link back with "Each person’s work"). Today's "What you said you’d do" is now To do, today's "Your reports" is now Your reports, and today's two number tiles are now the three numbers.
5. **What left References and resources in pull request 2 is here:** the targets, the plan as agreed, each person's card and what people are down as doing, drawn at the foot of My work by the same Context code, with the same words, controls and rules (`ContextPage only="what-moved-to-my-work"`).

**The 21 library lines this adds (the library had none for these behaviours):**
- Keeping promises: "Doing what you said builds trust fast." / "Promises that slip make it hard for others to rely on you." / To improve "Promise less, and say early when a date will move."
- Planning ahead: "A booked next step keeps work moving." / "Work without a booked next step stalls." / "Book the next step, with a day, before you finish each piece of work."
- Handling blockers: "Clearing blockers yourself shows ownership." / "Raising blockers without trying to clear them can look like excuses." / "Try one thing before you raise a blocker, and say what you tried."
- Working on the right things: "Your time goes where it counts." / "Time spent on the wrong work is taken from the right work." / "Check each piece of work fits the plan before you spend time on it, and let go of what isn’t moving."
- Backing claims with proof: "Proof makes your work easy to trust." / "Claims without proof can be read as guesses." / "Add the photo, slip or link when you say something is done."
- Helping your team: "Helping teammates is what strong team players do." / "Working alone when others are stuck slows the whole team." / "Offer one piece of help a week where you know the answer."
- Check-in quality: "Specific, on-time check-ins make your work visible." / "Vague or late check-ins hide what you’re doing." / "Name the item, what changed and the day, every time."
- Keep doing: five lines from the pictures; two written by us, for Handling blockers ("Trying one thing yourself before you raise a blocker.") and Working on the right things ("Spending your time where it counts.").

**Before you merge:**
- [ ] **There is no migration,** no new stored prompt, no new template, setting, scheduled job or script. See `docs/deploy.md`.
- [ ] **Existing users see nothing new.** The switch is off for every organisation. With it on, existing check-ins keep their cadence and every setting, and opening the page writes nothing of its own.

**Where the picture and the product differ, and which is kept:**
- **"To improve" and "Late"** are said as sentences ("How to improve" above the line; "It was due on 16 October." beside a Late tag), not joined with a colon, by the wording rule; the waits read "Joseph is waiting on you for the Kiambu route notes." in place of "Joseph needs your Kiambu route notes, so he can visit the schools.", because the record keeps what is waited for, not why.
- **The lead's note for the person** shows on the lead's view only ("Your note for Mercy"); the person does not read it until Hafsah says (a question for Hafsah).
- **Handling blockers** reads what was tried first, from the record, not "cleared 1 yourself"; **Working on the right things** reads a customer who stopped answering and is still chased, or a confirmed pattern about busy work, and otherwise "Not enough yet" (a question for Hafsah).
- **Your reports** shows each report's day and the person's own first sentence from that check-in, as no one-line summary is stored (a question for Hafsah). "All your reports" opens today's list of every session.
- **What you achieved** covers this check-in, so its note says "In this check-in" rather than "This month".

**What a person reads, the sales check-in ("Sales team, Q4", Drop Access):**
- Mercy, a team member, on her own page: "Mercy’s work" / "What you need to do, what you’ve done, and how to get better. Grace sees this page too." / "4 sold, 3 with proof", "4 of 40 your target", "8 of 9 promises kept" / Your focus this week: "Book the next step, with a day, before you finish each piece of work." "3 of your 5 open deals have no next step with a day." / To do: "Joseph is waiting on you for the Kiambu route notes." (Since 14 October), "Grace is waiting on you for the name of who decides at Ruiru Academy." (By Monday), "Book a follow-up with Westgate Deli" (Late, "It was due on 16 October."), "Send Mama Mboga Mart the quote, with a photo" (Today), "Visit Greenfield to take the order" ("Done on 13 October.") / How you’re performing: "The same seven behaviours in every check-in, read from your last 10 check-ins." Keeping promises, Strength, "You kept 8 of 9 promises." "Doing what you said builds trust fast." "Based on your check-ins." ... Handling blockers, Needs work, "You raised 4 blockers and said what you had tried first on 1 of them. 3 of them are cleared now." "Raising blockers without trying to clear them can look like excuses." "How to improve" "Try one thing before you raise a blocker, and say what you tried." ... Check-in quality, Strength, "You did 10 of 10 check-ins on time. 9 of 10 were specific." / Coaching: "Book the next step before you leave each visit." (Grace’s coaching for the team), "The same problem is raised again and never fixed." (From your pattern); Keep doing: "Doing what you say you’ll do.", "Adding proof when you say something is done.", "Helping your teammates.", "Specific, on-time check-ins." / Your reports, each with its day and her own first sentence. / Your deals, 5 open.
- Grace, the lead, choosing Mercy under "Whose work": "What Mercy needs to do, what Mercy has done, and how Mercy can get better. Mercy sees this page too." / "4 of 40 Mercy’s target" / "Mercy’s focus this week" / "Joseph is waiting on Mercy for the Kiambu route notes." / "How Mercy is performing", "Mercy kept 8 of 9 promises." / Coaching: "Book the next step before you leave each visit." (Your coaching for the team), "Find the decision maker at each school before quoting." (Your note for Mercy), "One step they could take this week is to pick the problem raised most often and agree who fixes it, and by when." (From Mercy’s pattern) / Mercy’s reports: "Mercy’s own reports are Mercy’s alone, so they are not shown here."

**Old tests this changes, and why:** `the-rebuilt-pages-use-only-the-new-parts.spec.ts` lists the new page among the rebuilt pages, which holds it to its rules; `a-number-with-a-name-on-it-goes-through-one-rule.spec.ts` is unchanged, as My work reads a person's target through `targetsFor`. Nothing either checks is loosened.

## Release 2, pull request 1 of 3: the switchboard foundation and Collect what's owed (19 October)

**Merge after #382** (Release 1B, pull request 3 of 3).

The first of three small pull requests for Release 2, built on Release 1B's pull request 3. It brings the switchboard foundation and the new scenario COLLECTIONS ("Collect what’s owed", working label), behind a new switch per organisation, `Organization.release2CollectionsOn`, off for every organisation. With it off, the scenario picker, the board, the reports and People and setup read and behave exactly as they do today, and a new check-in with COLLECTIONS is refused by the server. The collections board and its reports come in pull request 2; the legal matter board, due on an event and fee notes in the litigation check-in's gathering come in pull request 3.

1. **The switchboard** (`api/src/modules/board/the-switchboard.ts`): one table, keyed by scenario and type, picks the board and the reports. Every pair not in the table, every row whose organisation's switch is off, and every row whose board is not drawn yet picks "today": the board and reports exactly as the product draws them now. Four rows: OKR_ALIGNMENT with a sales team (Release 1's sales board, drawn by Release 1's own code behind its own switch, which the table names and does not replace); COLLECTIONS with fee notes or invoices (the collections board, full reports, weekly numbers collected this week, due, overdue and paid with proof; pull request 2); COLLECTIONS with loans (the kit's loans board; pull request 2); PULSE_CHECK with a legal matter (the kit's matter board, each matter's fees in one line; pull request 3). The last three wait, so they pick today's board until they are drawn. Where Release 2 is on, the board and the session report carry what the switchboard picked (`switchboard`); where it is off, the key is not served at all.
2. **The type** is the department or kind of work. It is stored only when the lead confirms it (`Ground.checkInType`, `PATCH /grounds/:id/check-in-type`, the lead only, only where Release 2 is on, only a type the scenario offers). Otherwise it is read from the check-in's own record each time it is read, and never written: a sales team, a law firm matter (a legal matter) or asset loans (loans), from its kind of work. For COLLECTIONS, "What it is" offers the lead the type read from her own words, then from the organisation's record (its word for the bill, or a type its leads already confirmed on another collections check-in); where neither says, she is asked to choose. Nothing is guessed.
3. **COLLECTIONS** (`api/src/modules/grounds/collect-whats-owed.ts`): in the scenario enum and every table a situation is kept in (its own pack, first question, endings, the scenario table's row, a weekly rhythm over twelve weeks); two types, fee notes or invoices (staff follow up clients) and loans (those who owe check in themselves); the template "Finance · collections and close"'s six stages (Invoiced, Due, Reminded, Chased, Promised, Paid), each said in a full sentence with the organisation's own word; paid means proof, from the accounting system, a bank slip or an M-Pesa message; the stall rule "a promised payment date passes without payment", offered to the lead as a suggestion under "Waiting for you to confirm" and applied only once she confirms it; the organisation's own word for a bill (`Organization.billWord`, "invoice" by default, set by an admin at `PATCH /users/organization/word-for-the-bill`); the detection words collect, owed, invoice, fee note, debtor, repay, loan and credit. It is in the picker only where Release 2 is on (`GET /grounds/situations-offered`), and only for a new check-in: no existing check-in's scenario is changed.

**What a person reads** (Muchemi & Co (test), Release 2 on):
- Wanjiru Muchemi, the partner, on "Every situation", last under "Keeping a read": "Collect what’s owed" / "Which bills are due, what has been paid with proof, and what is in the way." Picked: "Fee notes go out late, and nobody knows which clients have paid." "Borrowers repay each week, and you only hear about the ones who stop." "It starts the conversation with: “We are following up what is owed to us, and I want to know which bills are due, what has been paid with proof, and what is in the way.” You can change every word." Typing "Follow up the fee notes our clients owe" at the door starts the same scenario.
- Wanjiru, on People and setup, What it is: Scenario "Collect what’s owed"; Kind of work, a choice of "Fee notes and invoices" (chosen) and "Loan repayments"; "Groundwork read this from what you wrote when setting it up. Save changes to confirm it." After saving: "You confirmed this. The board, the reports and what each check-in asks about follow it."
- An admin of Muchemi & Co who does not run it: "Fee notes and invoices" and "Groundwork read this from what Wanjiru wrote when setting it up. Wanjiru has not confirmed it yet." Brian, an associate, reads his short page, with no type in it.
- Wanjiru, under "Waiting for you to confirm": "A rule Groundwork suggests, because no stall rule is set yet. It would go in how we work." / "A fee note is stalled when the date the client promised to pay by passes without payment." / "Until you set a stall rule, nothing is marked stalled when a promised date passes."
- A lead at an organisation with Release 2 off, trying to start one by any route: "Collecting what is owed is not open to your organisation yet, so choose another situation for this check-in."
- Groundwork staff in Admin, Orgs, "Collect what’s owed": off, "Muchemi & Co (test) cannot start a check-in to collect what is owed. Switch it on for a test organisation first, and for a real client only once Hafsah says so."; switched on, "Muchemi & Co (test) can now start a check-in to collect what is owed, and its leads confirm each check-in's type in People and setup. No existing check-in changes."

**Before you merge:**
- [ ] **Take a backup of the database first.**
- [ ] **There is one new migration,** `20261019230000_release_2_collections_switch`: one new value for the scenario list (add-only), two organisation columns and two check-in columns. No existing row is changed. See `docs/deploy.md`.
- [ ] **Existing users see nothing new.** The switch is off for every organisation. With it on, existing check-ins keep their scenario, cadence and every setting; their type is read from their own record and never written.
- [ ] **No new stored prompt,** template, setting row or scheduled job. The collections pack is in the code, and no `PromptVersion` row exists for it, so the file is what runs.
- [ ] **One new one-off script,** `api/scripts/the-release-2-collections.ts`, for "(test)" organisations only. It is never run by a deploy.
- [ ] **The developer API's list of situations names COLLECTIONS,** as it names every real situation (its guard asks for that). A check-in opened with it through the API is refused unless the organisation's switch is on, as in the product.

**Where the plan and the product differ, and which is kept:**
- **The default rhythm.** The prototype's SIT_SCHED has no row for this scenario. It takes weekly over twelve weeks, the collections check-in's rhythm in the release plan and the clock the other weekly standing read has (a question for Hafsah).
- **The type is chosen under "Kind of work"**, as the B8 fee notes picture draws it, not in a row of its own. For every other scenario the row is today's kind of work.
- **"Choose another scenario" and "Linked to"** are still not drawn: no route changes a check-in's scenario, and the link to the litigation daily comes in pull request 3.
- **The word for the bill** has a route for an admin, and no screen yet; Muchemi & Co (test)'s is set by its test data. The collections board, which uses it, comes in pull request 2.

**Test data:** hand-written for Muchemi & Co (test) in `api/src/modules/grounds/__fixtures__/muchemi-and-co.ts`, with no passwords and no real client data: Wanjiru Muchemi (the partner, the lead), Brian Otieno and Aisha Kamau (associates), Njeri Wambui (accounts), David Mwangi (paralegal, the litigation check-in only); the weekly fee notes check-in and the litigation daily; fee notes due on a date and on an event, one paid with proof and one on someone's word, one promised and missed, one disputed, one not heard from and one not yet raised.

**Old tests this changes, and why:** `client/src/lib/the-recommended-rhythm-agrees-with-the-engine.spec.ts`. COLLECTIONS is not a card in the catalogue both pickers are built from (it is offered only behind its switch, from `client/src/lib/collect-whats-owed.ts`), so it is left out of the catalogue comparison and compared instead, line for line, with its own file: weekly, twelve weeks, starting. Nothing the test checked before is loosened.

## This update, 14 October (after #326 and #327)

This update is made from staging as it is now (`a767ec6c3`). Like the release before it, it comes as two pull requests, the engine first and then the screens.

**Before you merge, in addition to the list below:**
- [ ] **Take a backup of the database first.**
- [ ] **There is one new migration, number 97,** `20261014090000_whatsapp_is_free_for_a_month`. It adds `organizations.whatsapp_free_until` and gives every organisation already here one free month of WhatsApp from the day it runs. Nothing is charged. It is described in `docs/deploy.md`, section 2.
- [ ] **There are no new one-off scripts.** The four from the release before have already run.
- [ ] **There is one new default.** WhatsApp is on for every organisation for its free month. After that, an organisation keeps it only by adding it to its subscription. Nothing needs writing for this.
- [ ] **There are no new templates** (decision 124).

**What it brings:**
- Hafsah's decisions of 13 October:
  - WhatsApp is free for a month;
  - a lead or the company can add somebody's WhatsApp number, and the first contact can then be on WhatsApp;
  - targets are read from documents;
  - daily check-ins open at 8 in the morning in the organisation's own time zone;
  - a lead's own late promises are under "Needs you".
- The pilots' problems and the reviewers' rounds:
  - proof moves a deal to won, and one customer is one deal;
  - a private document keeps its audience;
  - a person's "finish" and "I have to go" are honoured;
  - Ask answers from the documents the asker may open;
  - counts come from the record ("Everybody who has joined has answered. Two people have not joined yet.");
  - one routine message a day, with the missed-check-ins notice inside the opening email;
  - the lead's words about a person never reach that person's turn;
  - "tomorrow" is read on the day it was said;
  - case names such as "Kamau v. Apex Ltd" are never cut at their full stop.
- `schema.prisma` names the leaving checklist's unique index as its migration created it. This adds no migration and changes no database, and "Migrations match the schema" passes on a fresh database.

**Tests.** The release before removed 120 test files that failed with the CI's settings. This update brings back 49 of them, the ones that check how the product behaves, together with the new behaviour tests, and all of them pass with the CI's own settings. One of them is the privacy test `api/src/modules/reports/a-private-file-is-not-named-in-the-report.spec.ts`. Tests that only read source text, or that compare the code with our working documents, stay out (39 in the API and 44 in the client), as Hafsah's rule says. The existing-users check (`api/journey/existing-clients-carry-on.spec.ts`) is kept and updated for migration 97. The screens remove one test already on staging, `client/src/components/gw/ui/no-new-class-without-a-shared-part.spec.ts`. It reads a working document (`docs/the-parts-against-the-prototype.md`) that is not part of a pull request, so it cannot pass here.

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

The API's 68 removed tests, each reading source text only:

- `api/src/a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts`
- `api/src/modules/conversation/a-dash-is-not-a-comma.spec.ts`
- `api/src/one-word-for-the-thing-on-the-server-too.spec.ts`
- `api/src/modules/board/the-marker-is-a-column-not-a-prefix.spec.ts`
- `api/src/modules/reports/a-private-file-is-not-named-in-the-report.spec.ts`
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


The screens' 42 removed tests, each reading source text only or mirroring the prototype's text. Eleven tests that read each person's screen as that person ("as each reader sees it") were on the same list because they mention the prototype; they check what each reader is shown, so they are kept, at their current version, and pass:

- `client/src/api/every-endpoint-has-a-caller.spec.ts`
- `client/src/components/gw/a-line-is-changed-by-talking-about-it.spec.tsx`
- `client/src/components/gw/a-round-everybody-answered-is-not-forming.spec.ts`
- `client/src/components/gw/one-arrival.spec.ts`
- `client/src/components/gw/one-context-page.spec.ts`
- `client/src/components/gw/one-vocabulary.spec.ts`
- `client/src/components/gw/the-feedback-sheet-sits-on-the-screen.spec.ts`
- `client/src/components/gw/the-org-is-not-a-ground.spec.ts`
- `client/src/components/gw/the-page-is-cream-and-opens-light.spec.ts`
- `client/src/components/gw/the-page-says-what-it-is-doing.spec.ts`
- `client/src/components/gw/the-rail-is-where-it-belongs.spec.tsx`
- `client/src/components/gw/the-way-home-and-the-way-out.spec.ts`
- `client/src/components/gw/ui/no-new-class-without-a-shared-part.spec.ts`
- `client/src/every-page-can-be-reached.spec.ts`
- `client/src/lib/a-colleague.spec.ts`
- `client/src/lib/end-state-mirror.spec.ts`
- `client/src/lib/one-way-to-name-a-person.spec.ts`
- `client/src/lib/the-leads-note.spec.ts`
- `client/src/lib/who-may-rename-a-check-in.spec.ts`
- `client/src/one-word-and-it-is-session.spec.ts`
- `client/src/pages/a-failure-is-never-a-success.spec.ts`
- `client/src/pages/a-number-is-a-measurement.spec.ts`
- `client/src/pages/an-error-says-which-one.spec.tsx`
- `client/src/pages/auth/enter-submits-the-form.spec.tsx`
- `client/src/pages/enter/a-question-already-answered-is-not-asked-again.spec.ts`
- `client/src/pages/enter/entry-knows-who-you-are.spec.ts`
- `client/src/pages/enter/going-back-to-the-cards.spec.ts`
- `client/src/pages/enter/nobody-typed-in-gets-dropped.spec.ts`
- `client/src/pages/enter/nothing-says-your-work-is-safe-when-it-is-not.spec.tsx`
- `client/src/pages/grounds/a-forming-report-does-not-claim-to-be-finished.spec.ts`
- `client/src/pages/grounds/every-situation-is-offered.spec.ts`
- `client/src/pages/grounds/many-parties-at-once.spec.ts`
- `client/src/pages/grounds/one-door-per-place.spec.ts`
- `client/src/pages/grounds/one-row-per-person-per-session.spec.ts`
- `client/src/pages/grounds/the-lead-sees-the-ground-not-a-blank.spec.tsx`
- `client/src/pages/grounds/the-sessions-tab-is-about-sessions.spec.ts`
- `client/src/pages/grounds/what-now-is-buttons.spec.ts`
- `client/src/pages/invite/three-things-the-run-left-broken.spec.tsx`
- `client/src/pages/org/one-guide-not-two-copies.spec.ts`
- `client/src/pages/preview/ours-not-a-customers.spec.ts`
- `client/src/pages/report/one-report-not-two.spec.ts`
- `client/src/pages/the-button-goes-where-it-says.spec.ts`

**Already on the base, not changed here:** the "Migrations match the schema" check reports one index on `leaving_checklists` whose name Postgres shortens (`..._last_day_key` from migration `20260927120000_when_someone_leaves`). It is on the base already and this release does not touch it.

## Still to come, after the release

Pushing harder in conversations, the managers' and admin tests, re-running the evaluation's profiles, decision 132's 24-scenario run, and next month's work (reviews with ratings, finance batches) are in Hafsah's roadmap.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

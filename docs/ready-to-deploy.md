# Ready to deploy?

**Updated on 28 September 2026, at night.** The full 24-scenario proof for task 1.6 and the deploy blockers is run-12, below. Run-13, the second full run, confirmed it.

Branch `wip/plain-reports`, at `ff318f1e` when this was last updated. It holds all of the screens workspace's work up to `185ff692` (`wip/prototype-ui`), plus the engine's work.

---

## RELEASE PLAN, AS HAFSAH DECIDED ON 28 SEPTEMBER

- **`6fe8d1fb` is a known-good point:** the engine as proven by run-16, below.
- **The screens branch is merged in every few days, so each merge stays small.** The first was on 28 September (`f0168cff`).
- **The release waits for the screens workspace's rebuild,** about one and a half to two weeks.
- **The final proof is one full run on the combined code at release.**

## KNOWN-GOOD POINT: `6fe8d1fb` (28 September 2026)

**The engine's release candidate is commit `6fe8d1fb` on `wip/plain-reports`.** From here, nothing more joins the release unless it fixes a problem the release has. The weekly improvements go out after release.

**What it rests on:**
- **Run-16**, the full run of all 24 scenarios on the streamed route, the route people use. It ran on `4d91d5ec` from 15:49 to 17:45.
  - **The checker says nothing is worse than the baseline.** "Proof asked for" is 38 against 42, inside its allowance. Every other number is at or above the baseline.
  - All 24 scenarios ran and no check-in broke. The stream fell back to the plain way 7 times, and each time the check-in carried on.
  - No turn asks two questions (37 at the baseline). Every problem count is 0.
  - All 576 quotes are word for word in the record, and every report matches the database.
  - None of the lead's private words reached an invited person, for the sixth full run in a row.
  - Jargon Groundwork brought in itself was 6 (decision 41).
  - The judgements: 22 could be tested, and I read 20 as right, which is 91%. Three of the 20 are close calls: crisis, recognition and pulse.
- **One code change since run-16, and it fixes a problem the release has:** no internal label reaches anyone (`0bad62f2`, `6fe8d1fb`). It changes only what is served, not the conversation. It was checked live on run-16's own check-ins: 85 reads of the board and the four report reads, as the lead and participants on six check-ins, with no label and no error.
- **Every test:** all 10,532 API tests pass. The client passes 3,242 of 3,244. The two that fail are the screens workspace's timing-dependent sidebar tests, as all day.

**A private file's name and a hidden target, checked live on 28 September (`d5f0e840`).** The live check found that hidden targets still reached other participants on the session report and the rounds; that is fixed, and after it only the lead read the file's name, and each person read only their own target. This fix is newer than the known-good point, and joins the release.

**Blockers 8 and 9 (the streamed route) are closed by run-16.**

## What is finished

**Privacy.** Every one of these is enforced in the backend, with tests that fail when the old code is put back.
- **A lead's private description of a person never reaches that person or anyone else.** It never appears as a label, on the board, in the person's own check-in, or in their coaching note. With no name, a person is "a colleague". When several people have no name, they are "one colleague", "another colleague" and "a third colleague", and a later mention says it is the same person. Checked in the database on a full run: no invited person read any of the lead's words about them.
- **Leads never read how a person's answers were rated.** The board no longer reads the rating at all. It says what happened, and what would change it, in plain sentences.
- **Every quote a person reads is the person's original words from the record.** It is never the model's copy. The record now marks each line when it is written, according to whether it is word for word what the person typed, and only those lines can be quoted. A checker reads every quote served in a run. On the last full run, 427 of 427 quotes were word for word. In the six test runs since then, 294 of 294 were.
- **The judgement knows who is who.** A person's name inside somebody's words ("as requested by Nadia") is read as that person's label by the model. So the judgement no longer mistakes the lead for somebody else, and quotes keep the words exactly as they were said.

**What the reports say.**
- Each person's finding now keeps the facts the record held and used to lose: how the work really runs, what somebody else did, both figures when a person gave two, and the worry with the detail in it.
- A judgement never praises a claim the record's own numbers contradict.
- Every action is something the reader does, not "Tell you to…".
- The automatic check, task 1.6. Before a report is stored, every line is read as each reader would read it. A line with a problem is rewritten once. If the rewrite still has a problem, the line is dropped.

**The conversation.**
- The date question is asked once, only about a real deadline, and in a full sentence.
- A reply is never cut down to a fragment.
- Groundwork never repeats its own hidden instructions to a person.
- An invited person is asked who they are in their first session.

**Names.** The situations have the names Hafsah chose. People's titles, such as Dr, Prof, Eng., Hon., Mrs and others, are no longer taken as first names.

## Test results

**Newest, 28 September at 05:09, on the code merged with the screens branch (`338c4dbe`): API 10,408 of 10,408 tests pass. Client: 3,215 of 3,217 pass.** The two that fail are the screens workspace's sidebar tests. Two privacy items came from the screens workspace tonight (request 43): a participant being sent other people's ratings on a forming report is fixed (`59a62cc3`). Whether the lead should be sent everyone's ratings is a question for Hafsah, in the morning report.

**Before that, at 04:45, on `f75afe50`: API 10,399 of 10,399 tests pass. Client: 3,195 of 3,198 pass.** The three that fail are all the screens workspace's sidebar tests ("Jump to", and two in "the sidebar waits for the list"). They depend on the date or the time, not on any engine change, and I have passed them to the screens workspace. The client's plain-wording check failed once tonight because of a new engine line joined with a colon. I rewrote it as two full sentences, and it passes.

On the combined code at `dd9803c8`, with all seven blockers and decisions 35 and 36 fixed: **API 10,229 of 10,229 tests pass, in 1,103 suites.** The typecheck is clean. **Client: 3,196 of 3,198 pass.** The two that fail are the screens workspace's sidebar tests. They fail even alone, although no client file has changed since `5413a8ee`, when all 3,198 passed, so they seem to depend on the date or the time. I have passed them to the screens workspace. Before that, on the combined code at `5413a8ee`:
- **API:** 10,100 of 10,100 tests pass, in 1,096 suites. The typecheck is clean.
- **Client:** 3,198 of 3,198 tests pass, in 446 files. The typecheck is clean.
- **The last full 24-scenario run (run-10):** the checker says nothing is worse than the baseline. Every quote was from the record. There were no leaks of the lead's words.
- **Task 1.6, tested on sales, seniorhire and openread, twice each:** every problem count in the scorer was 0, every quote was from the record, and the reports took no longer than before the check was added.
- **The stored report prompt is at `report_synthesis` version 7.** It now carries the rule "every verb keeps its subject". The reports from the three test runs record version 7 as their `promptVersionId`, and nothing else changed: every problem count was 0, and 260 of 260 quotes were from the record.
- **The full 24-scenario proof, run-12, on `5b01fe58`, with all the blocker fixes:**
  - **Every problem count in the scorer is 0 across all 24 scenarios, so task 1.6 is met.** Run-10 had 114 internal labels, 36 role descriptions used as names, and 2 sentences starting in lower case.
  - **No board or report carries a pattern.**
  - **No invited person read any of the lead's private words about them.** The check matched four people, and each match was that person's own words. That is two full runs in a row with none.
  - **Quotes:** 479 of 482 were word for word in the record. The other 3 were in lines built when a page is opened, which is now covered too (`4efa6a74`). Replayed over run-12's pages, it is 480 of 480.
  - **The judgements:** 18 clearly right of the 20 that could be tested and had complete reports, which is 90%.
  - **Run-13, the next full run, on `e7b9cd65`:**
    - the checker says nothing is worse than the baseline;
    - every problem count is 0 again;
    - 799 of 799 quotes are word for word from the record;
    - no board or report carries a pattern;
    - no invited person read any of the lead's private words, the third run in a row with none;
    - the judgements are 17 right of 21, or 81%, so task 1.5's bar of two runs in a row at 90% is not met yet.
  - **The checker's verdict on run-12:** it failed run-12 on three conversation numbers ("specific detail asked for", "blocker checked", and "turns asking more than one question"). Re-running the two scenarios that lost the most, twice on the same build, brought them back into the usual range. So it was variation between runs, not a change. Run-13 checks it again.

## The deploy blockers, and whether each is fixed

These came out of the capability check (`docs/capability-check.md`). Each one breaks one of Hafsah's rules as the product stands, or is something the screens show that does not work. **Nothing is deployed until all of them are fixed and proven.** All seven are fixed in code, with tests. None is yet proven on a full scenario run, which is tomorrow.

| # | Blocker | Fixed? |
| --- | --- | --- |
| 1 | Internal pattern names, such as "Blame Shifting", appear beside people's names on the lead's and the participant's board. | **Fixed (`b959934a`).** One switch, `PATTERNS_ARE_SERVED = false`, takes patterns off every board, report, record, coaching note and developer API read, for every reader. The served reports were showing them too. Detection keeps running and storing. A test opens the board as the lead, two participants and an admin, and finds no pattern anywhere; with the switch turned on, the same test finds them. The conversation still uses a pattern to choose a question, and nothing is shown. |
| 2 | A participant can read a colleague's pattern. | **Fixed**, by the same switch. |
| 3 | The lead sees a pattern before the person it is about, after one session instead of three, and the person cannot answer it. | **Fixed**, by the same switch. Patterns come back only when all four things in the switch's note are true: three periods, the person sees theirs first and can answer, the plain names are approved, and a pattern never appears beside a name. |

**Patterns now follow Hafsah's rules (`965712f5`, `9f3c9e9b`, `592bb124`, `3d070b58`, `81f03b75`), with the switch still off.**
- **Plain names only.** They come from one module, copied word for word from `docs/pattern-names.md`. No internal name reaches any screen.
- **Three periods, counted properly.** They are counted from the sessions a pattern was actually seen in. The lead had been seeing patterns after one session because the old count used a status set too early.
- **Only your own.** A participant never sees a colleague's pattern.
- **The person first.** The person sees their own pattern first, on their own record, and can say what is behind it. The lead sees it only after they answer, three days after they were shown it, or a week after it was ready if they never open it. It never waits for ever.
- **What the lead reads** is a plain sentence of what happened, how often, and the person's own answer. It sits under that person's line, as the prototype does. For example: "Problems are always put down to something outside. The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files. This came up in 3 check-ins, in sessions 1, 2 and 4. Ngozi saw this first and said what is behind it…".
- **A test** checks every page, as the lead, the person, a colleague, an admin and a guest, on every kind of check-in, with the switch on and off.

**Before the switch goes on:**
- Hafsah approves the plain names, and B5's name.
- She approves the three-day and one-week windows.
- She sees that a pattern sits under the person's line on the lead's board, as a sentence and not a label.
- The screens workspace draws the new shape, including the box where a person answers.

The coaching note still uses the pattern library's own description rather than the plain name, and that is to be fixed.
| 4 | Bank account numbers, card numbers and similar in a document are stored and sent to the model. | **Fixed (`e12cf225`).** They are hidden before any document is stored or sent to a model, on every way a document arrives: the product, the invite link, the developer API, WhatsApp, and photos and scans read by the vision model. The same goes for the context chat. A person reads, for example, "account number [account number hidden]". Amounts, dates, phone numbers and receipt numbers are left alone. A test runs a real upload of a text file and of a photo, and finds neither number in any database write or model input. **Not covered:** numbers a person types into the setup chat or into a check-in message. |
| 5 | A lead's private notes about a person reach the model in that person's own check-in, kept back only by an instruction. | **Fixed (`6feccb79`).** The notes are left out when the session is built. The instructions that told the model not to say them are deleted. A test runs a real turn for Ngozi, with "Ngozi may leave after Q4" in every place a lead's note can be, and no prompt contains it or any four words of it in a row. **For Hafsah to decide:** a question the lead wants asked of the person still reaches that person's session, because being asked is what it is for. Those lines are also marked as the lead's. |
| 6 | Ask Groundwork refuses almost everyone. Only people on an organisation's connected list of people can use it: 64 of 3,162 users in the test database. | **Fixed (`75174e28`), and tried live.** Femi, a user from the sales scenario with no entry on the list, opened Ask Groundwork and it said he could ask, with nothing written. He asked "What did we agree?" and got a real answer from his check-in. Exactly one entry was created for him, filed under "groundwork" and linked to his account. See below. |
| 7 | The board crashes for a participant when colleagues are hidden from each other. | **Fixed (`c6721519`).** On a delivery check-in with colleagues hidden, the privacy filter was handed a section that is not a list, so every participant got an error. The live code (`be8b48d9`) has the same crash. A new test opens the board in every situation, as every kind of reader, and nothing errors. |
| 8 | **(Closed by run-16.)** **The streamed route, which is the one the screen uses, did not have the plain route's safety net.** When a reply used a banned word or a management word, or asked two questions the save could not split, the plain route asked the model again and the streamed route sent it as it was. The scenario runs used the plain route, so they measured a route nobody used. | **Built (`e9301d42`), and a blocker until the next full run on the streamed route passes.** The streamed route now runs the plain route's own code; only the first draft is shown as it is written, and the reply the screen is left with is exactly the one the plain route returns and stores. Tests prove both routes end the same way. The scenario runner now uses the streamed route. |
| 9 | **(Closed by run-16.)** **The streamed route stopped a check-in when the model was slow or busy.** Found on run-15: 8 of 24 check-ins ended on "The reply could not be finished", because the stream's model call did not try again when the plain route's would have. | **Fixed (`4d91d5ec`), and a blocker until run-16 passes.** A failed stream is asked for again the plain way, with its retries. |

**One more privacy gap, found while fixing blocker 7, and fixed (`8e940c9c`).** On a board where colleagues are hidden from each other, a participant could still read colleagues' names in three places: the list of people, both ends of a handoff, and who picked a time in a poll. They now read "one colleague", "another colleague" and so on. The lead and admins still see every name. A test searches the whole board served to a participant, in every situation where colleagues are hidden. It finds no colleague's name, email, role or organisation. This also answers the screens workspace's request 19.

**Two more fixed before deployment, from Hafsah's decisions 35 and 36:**
- **Bank and card numbers typed into a check-in message or the setup chat are hidden (`608e4d40`).** The same code as for documents runs on every way typed text comes in: the check-in, the setup chat, the open link, the developer API, WhatsApp, Ask Groundwork, a person's note, a delivery and the lead's context note. It runs before anything is stored and before any model call. The stored message reads, for example, "…our Zenith Bank account number [account number hidden], and the deposit went on the company card [card number hidden]…". A quote of it shows the same placeholder, and the quote check accepts it as the person's words. A test runs a real check-in turn and the setup chat, and finds neither number in any database write or model input.
- **A guest from another organisation is never added to the host's list of people (`055b2d2e`), and can now use Ask Groundwork about their own check-in (`d2a97ffe`).** This meets decision 36. A guest is never handed to the assistant that members use, because that assistant has the whole organisation in view. Instead a guest can ask five things about the check-in they are in: what they agreed, what is stuck, what they said they would do, when their next check-in is, and what the report says. Each answer is built only from what that check-in already shows that guest: the report as they read it, and their own check-ins. They never read the lead's judgement, a colleague's finding, commitment or wait, the organisation's people, or any other check-in. A request to do something, such as adding a to-do, is refused with "You are a guest here from another organisation, so Ask Groundwork cannot do things for you here, such as adding a to-do or changing a target. It can only answer questions about your own check-in." A question about the organisation is refused with "You are a guest here from another organisation, so Ask Groundwork can only answer questions about your own check-in. It cannot tell you about this organisation, its people or its other check-ins." Nothing on the list is looked up, claimed or made for them. Their questions and answers are kept under their own account, and only they read them back.

### Ask Groundwork: what the live code does, and the fix

- **The live code (`be8b48d9`) has no Ask Groundwork for signed-in users at all.** The assistant is reached only through a customer's embedded panel or through WhatsApp. Both need the person to already be on the organisation's list of people. That list is filled only by a connected staff directory, or by someone added from inside the panel. Signing up, Google sign-up, a team invite, joining a check-in and the open link never put anyone on it.
- **So the refusal is not something that broke.** The panel's route was added on top of an assistant that was only ever built for listed people.
- **The fix, being built:** when someone asks, Groundwork finds their entry on the list. If it doesn't find one, it claims a matching unclaimed entry, or creates one.
  - **Claiming** an unclaimed entry matches only on an email address the person has confirmed, and never across organisations.
  - **A switched-off entry means a refusal**, so a person the staff directory has switched off cannot get back in.
  - **Opening the page writes nothing.** Only asking a question creates or claims the entry.
- **Built (`75174e28`).**
  - An address nobody has confirmed is refused rather than used to create an entry, because creating one from it would be the same claim by another route. Only 3 of the 3,162 test users are unconfirmed.
  - What a person reads when refused:
    - "Your organisation has switched off your place on its list of people, so Ask Groundwork cannot answer you. Ask an admin in your organisation to switch it back on."
    - "Confirm your email address first, and then Ask Groundwork can answer you. Groundwork sent you a link to confirm it when you signed up."
  - **A side effect:** people who ask will now appear on the company's list of people, and in the suites' people lists.
- **One thing to know for later.** If an organisation connects its staff directory after people have used Ask Groundwork, the directory may add a second entry for the same person. Sign-in will not merge the two. This is a follow-up, not a blocker.

## Known problems that remain, and why it is safe to deploy with them

1. **Decision 34 is not met yet: the lead does not see the exact question before it is asked of a person.** Today a lead sets a question for a person in the context chat. The lead sees a summary and confirms it: "Questions you want asked. Each one goes into that person's own check-in, asked in their own words", then who and the question in the lead's own words, then "Yes, set it". The check-in then words the question itself, live, so no exact question exists before it is asked. **No screen today shows the lead the question as Groundwork will ask it**, and none asks them to confirm that wording. **Why it is safe for now:** the lead does confirm what is to be asked, and nothing is asked that the lead did not set. What is missing is the exact wording. Building it means writing the question once, at the moment the lead confirms, showing that exact question, and asking it word for word. That is about 1 to 2 days, across the engine and the screens.
2. **A guest's Ask Groundwork answers only five kinds of question.** See the note on decision 36 above. A guest can ask what they agreed, what is stuck, what they said they would do, when their next check-in is, and what the report says. Anything else gets a plain list of those five. The answers are written by fixed rules from what the check-in already shows them, not by the model, so they are short and they never go further than the report. **Why it is safe:** nothing a guest reads comes from anywhere except their own check-in, and nothing they ask can change anything in the host organisation. Widening it, for example to answer in the model's own words, would mean giving the model only that guest's view of one check-in.
3. **The judgement is not yet right often enough to meet Hafsah's bar for task 1.5.** On the last two full runs it was right in 18 of the 20 scenarios that could be tested, then 15 of 18. The bar is two runs in a row with at least 20 testable and at least 90% right. **Why it is safe:** the judgement is a suggestion, never a decision and never a label. The lead decides. When it misses, it misses the most important point; it does not invent a charge. Rules in code stop it praising what the numbers contradict and stop it blaming anyone without an account that says so.
4. **The conversation does not always draw out a limit or a date that a person holds back.** In advisor and shock, the facts are in the simulated people's scripts, but they come out only if Groundwork asks directly, and in most runs it did not. **Why it is safe:** nothing wrong is said. The report says less than it could.
5. **For a team of nine, the report takes five to six minutes to include everyone after the last check-in.** Until then, the lead reads a report that leaves some people out. **Why it is safe:** the report is complete in the end, and nothing false is shown in the meantime. It is slow, not wrong. It should be looked at after deployment.
6. **Some reports repeat people's own jargon**, such as "pipeline" in the sales scenario. **Why it is safe:** those are the people's own words. They are never changed, as Hafsah decided.
7. **The board's own sentences, which are built when the board is opened, are not covered by the automatic check.** Neither are Groundwork's conversation turns for the pronoun check. **Why it is safe:** those sentences are built by the product from fixed wording, not written by the model. They were fixed by hand today.
8. **Two counts mix a word with a figure**, for example "Two of the 5 people have answered so far". This is a wording issue only.
9. **The 50 scenario packs run from the database, not from the files.** Editing the files does nothing until someone switches the improved versions on. This is decision 20, and it is unchanged.
10. **The praise check reads the lead's description of a person to learn their target**, because for some people that is the only place the target is written. It can only take sentences out. A test proves none of the description's words reach anything a person reads.

## What must happen before release

1. **Combine with the screens branch, and test the combined code.** This branch already holds the screens workspace's work up to `185ff692`. Any later screens work has to be merged in too, and every test run again on the result.
2. **Run the 24 scenarios on the combined code, twice**, and check that the checker reports nothing worse than the baseline and every quote comes from the record.
3. **Apply the migrations, after a backup.** There are 45 new migrations on this branch compared with `main`. See the questions for Abubakar below.
4. **Mark which record lines are the person's own words, on the real database.** After the migration `20260927180000_record_said_word_for_word`, every existing record line is marked "not word for word" until the one-off script `api/journey/stamp-said-word-for-word.ts` has run on that database. Until it runs, every quote in existing reports loses its quotation marks, and some sentences are dropped. The same goes for commitments (`20260927190000_commitment_said_word_for_word`). The script only reads people's turns and sets the mark. It changes no words.
5. **Hafsah replaces `docs/decisions.md` with `docs/decisions-merged.md`.** That file is protected, and the step is in the morning report.
6. **The screens workspace shows the board's new sentences.** The board sends a plain sentence (`says`) for each person, and what to ask next (`ask`). Since Hafsah's correction on 28 September the reason can be "nothing checkable" again, shown as "Nothing checkable" as in the prototype; the screens' list of reasons needs it added (see `docs/answers-from-engine.md`). The screens should also show the new suggested answers under each question.
7. **Abubakar's items.** Stripe billing is not wired, and there are no paying subscribers yet. The Resend email key and the WhatsApp message templates are not set up. Nothing in this work changes that.

## Questions for Abubakar

1. **How is the API hosted, and how is it released?** The safety rules here stop me reading the deploy settings, so I could not check. I know only that the screens are deployed through Vercel when something is pushed to the staging branch.
2. **How do database migrations reach staging and live, and is a backup taken first?**
3. **There are 46 new migrations. Which of them change or remove existing data?** I read every one. All but four only add new tables or new columns. The newest, `20260928130000_suggested_answers_on_a_turn` (28 September), only adds one empty column. These four change or remove something:
   - **`20260923200000_reopen_every_check_in_that_ran_out_of_time`** changes existing check-ins. Every check-in that stalled while somebody still owed a check-in is set back to active. Its stall dates are cleared, and it gets 30 more days from the day the migration runs. A check-in that already had longer keeps it. This restarts those check-ins, and possibly their billing.
   - **`20260924121349_a_column_nothing_ever_wrote`** removes a column, `check_ins.next_commitment`. Nothing in the code ever wrote to it, so it should hold no data. It would be worth confirming on the live database that it is empty before this runs.
   - **`20260924121524_a_gap_no_longer_discards_a_period`** adds a column to `pattern_detections`, then fills it for existing rows from the period each was last seen in.
   - **`20260924175813_how_somebody_arrived`** adds a column to `ground_participants`, then marks existing people who came in through the open link. It works this out from the address the link gives them, or from a typed name with no account.
   - **`20260928090000_the_person_sees_their_pattern_first`** adds four columns to `pattern_detections`, then, for every pattern already seen in three periods, sets `ready_at` to the moment the migration runs. This is decision 62: a pattern that already exists at release starts the person-first process on release day, not on the day it was last seen, so the person it is about is shown it first, as if for the first time today, and whoever runs the check-in sees it only three days after the person is shown it, or seven days after release if the person never opens a page that shows it.
4. **Hafsah's earlier pull request should be merged before this work.** Please confirm it has been, or merge it first, so this work lands on top of it.
6. **Adding a person to a check-in runs in one database transaction with a 5-second limit.** On run-15, with three parts of the run going at once on this computer, it took 6.8 seconds and was refused. Is there room on the live database for that step under load, or should the limit be raised?
5. **After the migrations, the one-off script `api/journey/stamp-said-word-for-word.ts` has to run once on each database** (see item 4 under "What must happen before release"). Who should run it, and when?

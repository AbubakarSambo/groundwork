# Ready to deploy?

**This is a draft, written on 27 September 2026, late evening. It is not finished yet.** Tomorrow's first full run is the 24-scenario proof for task 1.6. When it has run, this document is finished, with its results.

Branch `wip/plain-reports`, at `ff318f1e` when this was last updated. It holds all of the screens workspace's work up to `185ff692` (`wip/prototype-ui`), plus the engine's work.

---

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

On the combined code at `5413a8ee`:
- **API:** 10,100 of 10,100 tests pass, in 1,096 suites. The typecheck is clean.
- **Client:** 3,198 of 3,198 tests pass, in 446 files. The typecheck is clean.
- **The last full 24-scenario run (run-10):** the checker says nothing is worse than the baseline. Every quote was from the record. There were no leaks of the lead's words.
- **Task 1.6, tested on sales, seniorhire and openread, twice each:** every problem count in the scorer was 0, every quote was from the record, and the reports took no longer than before the check was added.
- **The stored report prompt is at `report_synthesis` version 7.** It now carries the rule "every verb keeps its subject". The reports from the three test runs record version 7 as their `promptVersionId`, and nothing else changed: every problem count was 0, and 260 of 260 quotes were from the record.
- **Still to come: the first full run tomorrow.** That is the proof for task 1.6 across all 24 scenarios.

## The deploy blockers, and whether each is fixed

These came out of the capability check (`docs/capability-check.md`). Each one breaks one of Hafsah's rules as the product stands, or is something the screens show that does not work. **Nothing is deployed until all of them are fixed and proven.**

| # | Blocker | Fixed? |
| --- | --- | --- |
| 1 | Internal pattern names, such as "Blame Shifting", appear beside people's names on the lead's and the participant's board. | Being fixed. Patterns will be switched off on every board, for every reader, until they are done properly. The code stays, and a test will prove no board carries a pattern. |
| 2 | A participant can read a colleague's pattern. | Being fixed, by the same switch. |
| 3 | The lead sees a pattern before the person it is about, after one session instead of three, and the person cannot answer it. | Being fixed, by the same switch. |
| 4 | Bank account numbers, card numbers and similar in a document are stored and sent to the model. | Being fixed. They will be hidden before any document is stored or sent to a model, and a test will prove it. |
| 5 | A lead's private notes about a person reach the model in that person's own check-in, kept back only by an instruction. | Being fixed. They will be left out of what that person's session is given, and a test will prove it. |
| 6 | Ask Groundwork refuses almost everyone. Only people on an organisation's connected list of people can use it: 64 of 3,162 users in the test database. | Being fixed. See below. |
| 7 | The board crashes for a participant when colleagues are hidden from each other. | Being fixed, with a test that opens every board as every kind of reader and proves none of them errors. |

### Ask Groundwork: what the live code does, and the fix

- **The live code (`be8b48d9`) has no Ask Groundwork for signed-in users at all.** The assistant is reached only through a customer's embedded panel or through WhatsApp. Both need the person to already be on the organisation's list of people. That list is filled only by a connected staff directory, or by someone added from inside the panel. Signing up, Google sign-up, a team invite, joining a check-in and the open link never put anyone on it.
- **So the refusal is not something that broke.** The panel's route was added on top of an assistant that was only ever built for listed people.
- **The fix, being built:** when someone asks, Groundwork finds their entry on the list. If it doesn't find one, it claims a matching unclaimed entry, or creates one.
  - **Claiming** an unclaimed entry matches only on an email address the person has confirmed, and never across organisations.
  - **A switched-off entry means a refusal**, so a person the staff directory has switched off cannot get back in.
  - **Opening the page writes nothing.** Only asking a question creates or claims the entry.
- **One thing to know for later.** If an organisation connects its staff directory after people have used Ask Groundwork, the directory may add a second entry for the same person. Sign-in will not merge the two. This is a follow-up, not a blocker.

## Known problems that remain, and why it is safe to deploy with them

1. **The judgement is not yet right often enough to meet Hafsah's bar for task 1.5.** On the last two full runs it was right in 18 of the 20 scenarios that could be tested, then 15 of 18. The bar is two runs in a row with at least 20 testable and at least 90% right. **Why it is safe:** the judgement is a suggestion, never a decision and never a label. The lead decides. When it misses, it misses the most important point; it does not invent a charge. Rules in code stop it praising what the numbers contradict and stop it blaming anyone without an account that says so.
2. **The conversation does not always draw out a limit or a date that a person holds back.** In advisor and shock, the facts are in the simulated people's scripts, but they come out only if Groundwork asks directly, and in most runs it did not. **Why it is safe:** nothing wrong is said. The report says less than it could.
3. **For a team of nine, the report takes five to six minutes to include everyone after the last check-in.** Until then, the lead reads a report that leaves some people out. **Why it is safe:** the report is complete in the end, and nothing false is shown in the meantime. It is slow, not wrong. It should be looked at after deployment.
4. **Some reports repeat people's own jargon**, such as "pipeline" in the sales scenario. **Why it is safe:** those are the people's own words. They are never changed, as Hafsah decided.
5. **The board's own sentences, which are built when the board is opened, are not covered by the automatic check.** Neither are Groundwork's conversation turns for the pronoun check. **Why it is safe:** those sentences are built by the product from fixed wording, not written by the model. They were fixed by hand today.
6. **Two counts mix a word with a figure**, for example "Two of the 5 people have answered so far". This is a wording issue only.
7. **The 50 scenario packs run from the database, not from the files.** Editing the files does nothing until someone switches the improved versions on. This is decision 20, and it is unchanged.
8. **The praise check reads the lead's description of a person to learn their target**, because for some people that is the only place the target is written. It can only take sentences out. A test proves none of the description's words reach anything a person reads.

## What must happen before release

1. **Combine with the screens branch, and test the combined code.** This branch already holds the screens workspace's work up to `185ff692`. Any later screens work has to be merged in too, and every test run again on the result.
2. **Run the 24 scenarios on the combined code, twice**, and check that the checker reports nothing worse than the baseline and every quote comes from the record.
3. **Apply the migrations, after a backup.** There are 45 new migrations on this branch compared with `main`. See the questions for Abubakar below.
4. **Mark which record lines are the person's own words, on the real database.** After the migration `20260927180000_record_said_word_for_word`, every existing record line is marked "not word for word" until the one-off script `api/journey/stamp-said-word-for-word.ts` has run on that database. Until it runs, every quote in existing reports loses its quotation marks, and some sentences are dropped. The same goes for commitments (`20260927190000_commitment_said_word_for_word`). The script only reads people's turns and sets the mark. It changes no words.
5. **Hafsah replaces `docs/decisions.md` with `docs/decisions-merged.md`.** That file is protected, and the step is in the morning report.
6. **The screens workspace shows the board's new sentences.** The board now sends a plain sentence (`says`) for each person, and the screen should show it in place of the coloured pill.
7. **Abubakar's items.** Stripe billing is not wired, and there are no paying subscribers yet. The Resend email key and the WhatsApp message templates are not set up. Nothing in this work changes that.

## Questions for Abubakar

1. **How is the API hosted, and how is it released?** The safety rules here stop me reading the deploy settings, so I could not check. I know only that the screens are deployed through Vercel when something is pushed to the staging branch.
2. **How do database migrations reach staging and live, and is a backup taken first?**
3. **There are 45 new migrations. Which of them change or remove existing data?** I read every one. All but four only add new tables or new columns. These four change or remove something:
   - **`20260923200000_reopen_every_check_in_that_ran_out_of_time`** changes existing check-ins. Every check-in that stalled while somebody still owed a check-in is set back to active. Its stall dates are cleared, and it gets 30 more days from the day the migration runs. A check-in that already had longer keeps it. This restarts those check-ins, and possibly their billing.
   - **`20260924121349_a_column_nothing_ever_wrote`** removes a column, `check_ins.next_commitment`. Nothing in the code ever wrote to it, so it should hold no data. It would be worth confirming on the live database that it is empty before this runs.
   - **`20260924121524_a_gap_no_longer_discards_a_period`** adds a column to `pattern_detections`, then fills it for existing rows from the period each was last seen in.
   - **`20260924175813_how_somebody_arrived`** adds a column to `ground_participants`, then marks existing people who came in through the open link. It works this out from the address the link gives them, or from a typed name with no account.
4. **Hafsah's earlier pull request should be merged before this work.** Please confirm it has been, or merge it first, so this work lands on top of it.
5. **After the migrations, the one-off script `api/journey/stamp-said-word-for-word.ts` has to run once on each database** (see item 4 under "What must happen before release"). Who should run it, and when?

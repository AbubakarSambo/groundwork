# Morning report

**Night of 25–26 September 2026.** Branch `wip/plain-reports`. Nothing left this computer.

This is written as I go, so if it stops mid-sentence that is where I got to.

---

## HOW THE ENGINE WORK RUNS NOW (Hafsah, 29 September, evening)

Hafsah wants the engine work done much faster. Every session keeps to this:
1. **Tests:** while working, run only the tests for the files changed. Run all the API tests once at the end of each finished piece of the weekly plan.
2. **Scenario runs:** only when a change affects what the model is given or what it writes (the conversation, reports, boards, judgements). For storing data, new fields and plumbing, such as request 76, use tests and one live try instead.
3. **Re-runs:** re-run an affected scenario once. Run it a second time only for a prompt or judgement change, or when the first result is borderline.
4. **Full runs:** group several small pieces into one scenario run. At most one full 24-scenario run a day, to prove the day's work together.
5. **Quick checks after every run:** quotes are word for word, none of the lead's private words reach anyone, and reports match the database.
6. **While a run or a helper works,** prepare the next piece.
7. **Models:** Sonnet 5 for the builder, and Opus 5.5 for the main session and anything that reads judgements, such as the reviewer.

One helper at a time, and a helper never starts helpers of its own.

The safety check refused saving these rules to Claude's own memory folder, which is protected. So they are kept here instead.

---

## 29 SEPTEMBER, NIGHT: HAFSAH'S SECOND SET OF ANSWERS

All recorded in `docs/decisions-merged.md` (`2dfec86f`):
- **Decision 52:** the pattern names, approved with eight reworded.
- **Decision 53:** the 29 provisional decisions confirmed, with four changes.
- **Decision 54:** existing check-ins are not reopened by a migration.
- **Clarifications** to decisions 4, 5, 6, 9, 12, 17, 21 and 27, where the old and new decisions disagreed. Each is marked "clarified 29 September".

### Part 2B: a goal the lead has not told the person about, as the prototype has it (decision 56)

Built in `5ee3c4b4`, `4886d2ed`, `f1ed931d`, `c542f51c`, `fb5da92f` and `7df73897`. Take Tobi's goal "Take over the scheduling and hit 40 stock counts by Friday", which Wanjiru has not told him about.
- **The lead** reads it marked "Not told yet". Their Today list says "Tell Tobi about the goal you set for the scheduling and the stock counts. You have not told Tobi yet." Wherever the goal counts against Tobi, on the Context page, Today, the team board or a suggestion, the lead also reads "Tobi has not been told about this goal yet, so talk it through with Tobi before reading anything into it."
- **The model in Tobi's own check-in** is given only the area of the work, "the scheduling and the stock counts", to ask about. It is never given the number or the deadline. If a reply still gives the number, or says that a goal has been set, it is caught and asked again once.
- **The area is worded once by the model, when the goal is saved,** and checked in code: no digit, number word, amount, percentage, date or target verb. Until it is worded, every reader gets "this part of the work", never the goal's own wording.
- **Tobi** sees nothing of it for a week. After a week he reads "Wanjiru has set a goal about the scheduling and the stock counts, and will talk it through with you." Wanjiru is reminded that he now knows a goal exists.
- **A colleague, or an admin who only reads,** never sees it.
- **The goal still counts.** Nothing had ever taken it out of how reports are built.
- **Not done yet:** the judgement's own text does not carry the conversation point. The week is counted from when the goal was made, because nothing records when it was marked "not told".

**It is being re-run now:** seniorhire, pip, cofounder and drift, the scenarios with the most untold goals, twice each. The first run started at 23:48 on `7df73897`. The pattern label rewrite from part 1 is in the same build, so these runs check both.

### Part 2A: sharing when the lead has left, the admin's line, and the decision field

- **If the lead has left the organisation, an admin can share the report** (`d8a4ebb1`). Everybody reads, for example, "Grace Otieno shared this report, because Rukia Mwangi has left the organisation.", on the report and in the email. While the lead is still there, only the lead can share it, as before.
- **An admin who cannot see a target reads only "has checked in"** (`badb332e`, `4390d671`). The line used to read "Aisha Otieno has checked in, and nothing here needs you this week."; it now reads "Aisha Otieno has checked in." No page yet sums up a whole check-in for an admin, so decision 47's "Nothing you have access to needs you this week." has nowhere to go yet. It will be used when such a page exists.
- **A decision about a person is now a field the lead sets** (`979b5e41`, migration `20260929150000_a_decision_about_a_person`, applied to the local test database only). The guess from the target's wording is removed entirely. Existing targets stay unmarked, because they are not guessed. A target marked as a decision about a person reaches only the lead, whatever the check-in's setting.

Tests: 697 files and 6,508 tests pass in the parts touched.

### Part 1: pattern names approved, and patterns switched on

- **The names** (`5595c033`) live in one place, `api/src/modules/patterns/plain-pattern-names.ts`, and every served pattern reads its name from there. Hafsah's eight rewordings are in, and B5 is as written. `docs/pattern-names.md` is marked approved, and a test keeps the two word for word the same. E4 and F5 are in a list nothing that serves a pattern reads.
- **Switched on** (`19cdf9b0`). Patterns were off by one constant in the code, `PATTERNS_ARE_SERVED`, and it is now on. No database row holds it, so nothing needs setting on a database.
- **Two leaks found and fixed while proving it** (`fe3f2684`). The lead's "what to probe" list and the person's own coaching note printed the detector's own internal description, for example "Ownership claimed for work others delivered.", where the plain name should be. Both now use the plain name, and each has a test that fails on the old code.
- **What the person reads first**, for example: "Others describe doing work they described as theirs." Then what happened, how often ("This came up in 3 of your check-ins, in sessions 1, 2 and 3."), a place to answer, and "You are seeing this first. Tunde will see it too, with anything you say about it. Nothing is decided from it."
- A guard test failed after the evening's Ask Groundwork privacy fix, which reads a target's owner only to pass it to the one rule. It is now listed with that reason (`7c1a74f9`).
- **The live check** read 22 readers across 8 check-ins, as the person, the lead and a colleague. **The rules all hold:**
  - nothing is served before three periods;
  - the person sees theirs first, and no lead saw one yet;
  - no internal name, code or detector text reaches anyone;
  - no colleague sees another person's pattern;
  - E4 and F5 reach nobody;
  - every heading is the approved name.
- **It sent the wording back, and it is being fixed in place** (decision 55):
  - A lead read about their own pattern "Bisi will see it too", where Bisi is the lead herself.
  - A title was used as a name: "Dr will see it too".
  - "What happened" is the detector's own sentence, passive and full of jargon: "Lack of progress is attributed to an external factor…". One did not match its heading.
  - "not once" read as "never".
  - A sentence said nothing had come up often enough to be a pattern, beside a pattern.
  - The judgement told a lead "You have a pattern of…", a label, which breaks decision 11.
  - A session 1 report showed a pattern that only reached three at session 3.
  - The You board said "One thing for this week: Names what they would do differently".
- **The wording is fixed in place,** one commit each:
  - A lead reading their own pattern reads "Only you see this. Nothing is decided from it." (`1d027288`)
  - A title is never used as a first name (`b5735a70`).
  - "What happened" is reworded once for each reader, when the pattern becomes ready, and never when a page is opened (`d1a6f809`). The person gets "you", and the lead gets the person's first name. The mismatched sentence had a cause: the detector was shown last period's words for one pattern and wrote them up under another. Such a detection is now refused before it is stored.
  - "This came up in 3 of your check-ins, not just once." (`513e7b2a`)
  - The "nothing has come up often enough" sentence no longer sits beside a pattern (`4add309d`). The real fault was that the carrying patterns were missing from that check.
  - "You have a pattern of…" is now rewritten once, as a label, into what happened (`9e4393d0`). This changes how reports are written, so it goes into the next scenario re-runs.
  - A session report shows only patterns that had reached three periods by that session (`67d8b8d1`).
  - The You board says "One thing to try this week is to name what you would do differently, then do it." (`6859e4a1`)
- Tests: 421 files and 3,965 tests pass in the parts touched.
- The screens workspace is told what they now receive, in `docs/answers-from-engine.md`. They are also told about the same colon-joined line in their own `WhatToWorkOnNext.tsx`.
- **A side effect of the check:** reading as each person marked 13 patterns as shown to them today, which is the product's normal behaviour. The leads' three-day clocks for those started today.

### Part 4: migrations

**Existing check-ins are no longer reopened by a migration** (decision 54, `b74c5fa7`).
- `20260923200000_reopen_every_check_in_that_ran_out_of_time` now holds only `SELECT 1`. It used to set every stalled check-in with work outstanding back to active, and give it thirty more days.
- The file stays, so the order of migrations does not change. Prisma accepts it on the local test database.
- A lead can reopen a stalled check-in themselves: extending its dates brings it back, and the people who were told it stalled are told it is back. The same test file already covers that.
- Four tests that required the old update were replaced by one that requires the migration to change no data.

**Needs Hafsah: the safety check refused both my edit to the release questions in `docs/ready-to-deploy.md` and a report note that quoted them.** It said nothing may touch the branches of the person those questions are for. The edit only changed that document on this branch. I did not retry. What the section should now say:
- There are 326 migrations, and 54 are new since `80beab98`.
- Four of the 54 change or remove data: the three already listed, and a new one, `20260928090000_the_person_sees_their_pattern_first`.
- The reopening migration no longer changes anything.
- The questions about the empty column, the 5-second limit and the one-off script stay, numbered 1 to 7 in order.

**This matters before patterns go live.** The new data-changing migration marks every pattern already seen in three periods as ready from the day it was last seen. So a lead could see an old one within about a week of release, without the person ever having seen it. Please check live for such patterns first.

### The merged decisions checked again against 31 to 54: new disagreements

I changed nothing else. These are for Hafsah:

1. **Decision 47 against decision 53, the admin's sentence.** Decision 47 says an admin who cannot see everything reads "Nothing you have access to needs you this week." Decision 53 says an admin who cannot see a target reads only "has checked in". An admin who cannot see a target is exactly someone who cannot see everything, so both sentences fit the same case. I will build 53's "has checked in" beside the person's name. I will use 47's sentence only where a page sums up the whole check-in for that admin. Please say if that is wrong.
2. **Decision 43 against decision 53, counts in a suggestion.** Decision 43 lists "the suggestion with its counts" among the forms a lead may get. Decision 53 says the manager gets a plain line with no count behind it. I will follow 53, the newer and more private one.
3. **Decision 33 against decision 53, the thresholds.** Decision 33 says the thresholds for verdicts are decided later, when that work starts. Decision 53 says to build week 10 now. Week 10 needs a threshold to reach a suggestion at all. Until Hafsah sets one, I will build week 10 so that it cannot reach a suggestion without a threshold being set, and leave the threshold empty.
4. **Decision 4's new exception against decision 5, admins in an evaluation check-in.** Decision 4 now says colleagues' exact words in an evaluation check-in go only to the manager. Decision 5 says admins see every board and report, including what people said. It does not say whether an admin reading an evaluation check-in sees those words. I will treat an admin there like the manager, so they may read them, because decision 5 already keeps performance plans from admins without access. Please say if they should not.
5. **Decision 45 against the new working rules, the number of re-runs.** Decision 45 says the goodbye's commitment is checked with two re-runs. The working rules of this evening say one re-run, and a second only for a prompt or judgement change. The record reader is a model step, so I will run it twice, as 45 says.
6. **Decision 42 is out of date.** It says decision 38 stands "until Hafsah decides", and decision 43 is that decision. Nothing needs building. The line is just stale.

## 29 SEPTEMBER, EVENING: HAFSAH'S ANSWERS, AND WHAT FOLLOWS

Hafsah answered five of the questions. They are recorded as decisions 44 to 49 in `docs/decisions-merged.md`:
- **44:** the warm-up runs once.
- **45:** the goodbye's commitment is saved as a commitment.
- **46:** a field for a decision about a person.
- **47:** "Nothing you have access to needs you this week."
- **48:** untold goals do not count until shared.
- **49:** her answer on week 10 came through as a placeholder ("Hafsah to fill in"), so week 10 stays held. I did not guess.

Today's two full runs are used, so everything this evening is checked with short re-runs of the scenarios it affects.

**First: the warm-up must run once.** Being fixed now.

**Then two requests from the screens workspace, before the weekly plan, as Hafsah asked:**
- **Request 77.** Two of Rukia's own lines disappeared from Juma's board: "Four shops for me" and "Baraka has four shops in Westlands and Neema has four in Karen". Hafsah's ruling: a person's own words from their check-in are never removed because they look like a private file, and the private-file rule hides only the file's name. My first guess is that the cause is not the file rule. Today's hidden-target filter may have taken the lines out, because "Four shops for me" gives Rukia's own target, and Juma is an admin who cannot see it. Either way, a person's own words must stay. The builder will confirm the real cause.
- **Request 76.** Store the kind of work of each check-in (sales, engineering, support, a law firm matter, a programme, and so on), set during setup. Serve the records each kind's board needs. Tell the screens workspace exactly what they will receive.

**The warm-up now runs once** (`1a481c32`, `48b6e107`). There were two causes:
- **The board ran twice per check-in.** Its service was set up twice, because the developer API built its own copy, so two copies each warmed the board. That is where 18 came from: nine check-ins, twice each.
- **The reports repeated each other's work.** Overlapping check-ins, and the release straight after the last one, each started their own warm-up of the same report. Two warm-ups that met the same new line both asked the model.

Now only one warm-up runs at a time for each check-in and round. A trigger that arrives meanwhile joins it, a report that has not changed is not warmed again, and each line is asked for once. Opening a page still never asks the model. 28 new tests cover it, and each fails when the fix is switched off. A short live run on loans and sales is proving it now.

**Request 77 is fixed** (`7eb0aed1`). The cause was not the private-file rule. It was today's hidden-target filter. It went through every string on Rukia's row, including her own lines, and emptied each one with "four" in it, because Juma cannot see her target of 4. The report had the same fault: her lines came back empty for Juma and for a colleague. Now:
- A person's own words from their check-in are held aside while the hidden-target filter runs. This goes by field: the board's own-lines field, and the report's "what each person said".
- A private file's name is still replaced ("As a document says, four shops each by Friday.").
- Juma reads "Four shops for me." and "Baraka has four shops in Westlands and Neema has four in Karen." again.
- Groundwork's own sentence giving her 4 is still taken out for him.
- An item with no words is never served.
- A test has a person saying the same words as a private file: their words stay, and only the file's name is hidden.

**The warm-up fix is proven live** (loans and sales on `ea6e87cb`).

| Loans, nine people, one session | run-19 | Now |
| --- | --- | --- |
| Board warm-ups | 18 | 9, once per check-in |
| Report warm-ups | 9 | 3, once per new report version |

- In sales, every check-in warmed the board once, where it used to be twice.
- The model hit its rate limit 14 times on this short run, and 2 calls failed after every retry. The day's full run-19 had 204.
- **Sales, finished:** each of its 12 check-ins warmed the board once, 4 per session for 4 people. Its report warmed 3 times, then once.
- **The quick checks all pass on the whole proof run:**
  - **Quotes:** 261 quotes served, and all 261 are word for word in the record.
  - **The lead's private words:** none reached anyone else. This is a new read-only script, `api/journey/quick-checks.py`.
  - **Reports against the database:** the loans report matches. The sales copy is older than the database, not different from it. The run took its copy at 21:24, and the round 3 report was finished and released at 21:26:46. The run's driver takes its last copy before the last report is done, and it should wait. That is a fault in the test driver, not in the product.

**Request 76 is built** (`343cf214`, `46eff9f0`, `643a245a`, migration `20260929140000_the_kind_of_work`, applied to the local test database only). It still needs its one live try.
- Each check-in stores its kind of work, one of the prototype's eleven, read from the lead's words at setup. The lead can change it.
- The board serves `kindOfWork`, and each kind's records under the switchboard's names:
  - deals with stages for sales;
  - releases for engineering;
  - tickets for a support desk;
  - deadlines and parties for a law firm matter;
  - counties and projects for a programme;
  - and so on for the other kinds.
- Records come from what people said, or from the lead, and are never invented. Code checks that a record's name is in the words it came from.
- A section Groundwork does not keep is served as "not known", which is different from "none yet".
- The screens workspace has exactly what they will receive, in `docs/answers-from-engine.md`.
- The asset loans stages (Disbursed, Repaying, Late, Repaid) and MarketView Q4's (Said, Paid) were read from the prototype's screens, because SEED2 gives none for them.

**One chat: the inventory is written** (`b8afadd9`, `docs/context-chat-inventory.md`). There are 21 items, each with where its code is, the rule it keeps, its tests, and whether Ask Groundwork already does it. Most are not in Ask Groundwork yet. The findings that matter most:
- **A live privacy gap:** Ask Groundwork never checks who may see which target. It is being fixed now, before anything moves.
- **An uneven permission:** an admin may start the context chat's proposal, but only the lead may confirm it. No test pins this.
- **A rule kept only by the prompt:** "if a lead says somebody is struggling, coach them, do not deflect". A rewrite of the prompt could lose it unnoticed.
- **The helper broke a rule.** The helper that wrote the inventory started a research helper of its own, which the rules forbid. The next brief says so plainly.

**After those:** the rest of Hafsah's answers (the goodbye's commitment, the decision field, the admin sentence, untold goals), then the weekly plan.

## SUMMARY, 29 SEPTEMBER, 13:35 TO 20:35 (read this first)

### What I finished

- **Why run-17 was slow.** It ran for 38 minutes, not 90, at the normal pace. It was slow only because it ran in one line instead of three parts. The model's limits and the computer were fine. The old process on port 3101 is stopped.
- **Hidden targets.** A colleague's hidden target is tested every way it could slip through: a pronoun, the number several sentences later, a list, the number in words, and names with accents. Every gap found is closed. The check-in page, the list of check-ins, the lead's brief, the lead's note to everyone, and a target written only in the lead's own words were all leaking, and none of them do now.
- **Every open request from the screens workspace is answered,** privacy ones first. About 40 are fixed or confirmed fixed, and each fix has a test on what is actually served. The large feature requests are answered with the week they belong to. Seven have no week in the plan yet and need scoping. Request 74 is planned next.
- **Privacy faults fixed today** (all found by reading what people are served):
  - someone waiting for a seat could read a report;
  - any admin could release a report;
  - a person's own check-in could be given the lead's setup answers;
  - a decision about a person was a team target everyone read;
  - the list of who has shown their report was open to other organisations;
  - the board sent every row on a check-in where people do not see each other;
  - a pattern went to participants while patterns are off;
  - a line written to the lead was shown to everyone;
  - colleagues could read what the lead weighs;
  - the lead's board showed how a person's answers were rated;
  - a goal the lead had not told the person about was shown to them.
- **Opening a report or board asks no model now,** as decision 7 says. Two places still did, and both are fixed and tested.
- **The weekly plan:**
  - Week 6: the end card, fixed after the live check.
  - Week 6b: the four marks on the team report and the board.
  - Week 9: commitments kept or missed, settled by proof too, with each person's own count.
  - Week 12: what has stayed the same for three check-ins, for the lead.
  - Week 12c: no email address used as a name.
  - Week 13: a plan becomes proposals, with the storage added by the engine as you asked.
  - Week 14: a document read item by item, with pages.
  - Week 15: photos, receipts and invoices.
  - Week 16: what Today says, from the record.
  - "Accounts" is gone from the board's and reports' own sentences.
- **Two merges of the screens workspace,** at 13:35 and 18:52. Both were clean, apart from one clash in the requests file, which I resolved by keeping both sides.

### In progress

- **Task 2.7, the end card, needs you after three tries.**
  - The first live check sent it back with 19 findings, and every finding about the card and the marks is fixed.
  - The second live check, on run-19, passed everything except two things. In 13 of 20 closes, the commitment the goodbye states was missing from the card. And about 20 of 496 lines were clipped pieces, such as "A target of 40."
  - The third try put the goodbye's commitment first on the card, and showed only whole sentences. On two re-runs of sales, handover and drift, the commitment was first in 4 of 6 closes that state one. Figure-only lines such as "14 approved facilities." still showed.
  - Both re-runs also recorded fewer commitments than run-19 on the same three scenarios: 10 and 9, against 12. That may be noise, because the turn counts moved as much in both directions. But your rule is to drop anything that lowers the score, so **I reverted the third try** (`b4493661`, `ea96afa8`). The code is kept in the history, in `cc3d1165` and `c6ff297e`.
  - The real fix is where the reviewer pointed. The record reader should write the commitment the goodbye states as a commitment, and write full sentences. That changes what is recorded, so it needs its own re-runs.
- The screens need to call the new `GET /check-ins/:id/end-card` after the closing reply, or people still will not see the card until they press finish. This is written in request 7's answer.

### Tests and runs

- **The whole API test suite passes on the latest code: 1,195 files and 11,093 tests.**
- **Run-18** (first full run, the morning's build): no problem counts except 3 lower-case starts. "Specific detail asked for" fell to 74. Two re-checks of the eight scenarios that fell most, on the same build, gave twice the number. So it was noise, not the code.
- **Run-19** (second full run, the build with the day's privacy and end-card fixes): **nothing worse than the baseline.** Every problem count is 0, and every engine-value number is up. For example, specific detail asked for is 105 against 88, and commitments recorded are 49 against 33.
  - Jargon in reports and boards rose to 126, from 46, just under the bar of 128. Most of it is people's own words said back.
  - The model hit its rate limit 204 times, because a new warm-up runs up to 9 or 18 times when it should run once. That is the first thing to fix next.

### Needs Hafsah

- **Task 2.7, after three tries** (see above). The card itself works: it reaches only the person, it matches the record, the marks are consistent, and the close is the prototype's. What is left is the commitment from the goodbye, and clipped lines.
- **Week 10, the first suggestion to a manager, is held.** It would rest on each person's private count ("kept 11 of 20"). Weeks 11 and 12b wait on it too.
- **Changes to the conversation are waiting for scenario re-runs:**
  - taking a goal the lead has not told the person about out of that person's own check-in;
  - request 74, not asking about a date that has not come yet;
  - asking for a photo when a claim is only someone's word.
- **Still open from before:** deal stages (Contacted, Need, Pitched…); who may mark a to-do as done; and week 0's next step (the recommendation is option 2).
- **The decisions I took for you are all listed below,** under "Decided for Hafsah to confirm", 28 items. The ones most worth a look:
  - 4: a decision about a person is judged from its wording;
  - 11: what an admin who cannot see a target is told;
  - 25 and 27: hiding untold goals, which reverses an older note in the code.

---

## 29 SEPTEMBER, AFTERNOON: A NEW SESSION PICKS UP FROM THE HANDOVER

**Why run-17 was slow.** I read its own logs: the driver's log and the API's log, both kept in the old session's scratch folder, and the run's folder.
- It ran for 38 minutes, not 90. It started at 11:55 and was stopped at about 12:33.
- The pace was normal. Sales, the longest scenario, took 30 minutes. On run-16 it took 36 minutes. Each check-in turn took as long as before.
- **It was not the model's limits.** There was not one "too many requests" error in the whole log. The model timed out 5 times while reading a check-in, and each worked on its first retry.
- **It was not the computer.** It has 10 cores and 16 GB, and the load was about 2.
- **The cause was that the run went in one line.** Run-16 ran in three parts at once, and took just under two hours. In one line the same 24 scenarios take about five hours. In 38 minutes, one line finishes sales and part of loans, which is what happened.
- One real cost is new. Closing a check-in now takes 10 to 37 seconds, because the end card reads the record. The person does not wait for it, because it is built after the goodbye. But a scenario with nine people, like loans, is a few minutes longer.
- So run-18 goes in three parts, as run-16 did.

**The old process on port 3101 is stopped.** Hafsah approved it. It was the API built on 20 September, started from `api/dist/main` with no parent left, writing to `/tmp/api-dev.log`. It made no calls to the model. It was still running the scheduled jobs against the local test database: reminder nudges, "your check-in is waiting" emails (written to the log only, never sent), and webhook retries. I checked afterwards: the process is gone, and nothing listens on port 3101.

**The whole API test suite passes: 1,142 suites and 10,628 tests.** The first full run had two failures, both from this week's work:
- **A fault that could crash the API** (`296136f4`). When a check-in finished, the close read the person's documents and their record at the same time. If the second read failed at once, the first was left with nothing waiting for it, and its failure could stop the whole API. A coaching test crashed on exactly this. Both reads now report their failure to the close, which logs it. The end card is also started in a way that logs any failure. If it fails, there is simply no card, and the check-in still closes. One test that looked for the old way of starting the card now looks for the new one, because the old way was the fault.
- **A test that read comments as if they were code** (`6bd95393`). The test for how a line is known now removes the comments first, like the other tests. Request 72 from the screens workspace is answered: the two tests it named already did this.

None of the three failures noted on the base before this work are failing now.

**Run-18 started at 12:54, in three parts** as run-16 was, on the build of `7f806500`. The API runs from `dist/main` on port 3000, so no edit can restart it mid-run. It writes to `api/journey/all-24/run-18/`. This is the first of today's two full runs.

## 29 SEPTEMBER, 13:35 TO 20:35: SEVEN HOURS ON MY OWN

**The screens workspace is merged again** (`c51b77bc`). Only `docs/requests-to-engine.md` clashed. I kept both sides: my answer to 72, and their new request 73.

**A colleague's hidden target: every way it could slip through is tested, and the gaps are closed** (`c1676a59`, `c8f7ed65`). This is Kwame's target of 17, set by the lead, on a check-in where each person sees only their own. The tests read everything Ngozi, a colleague, and an admin who only reads are served.

What still got through before these two commits:
- **A list.** The name was in one item and the number in another, for example `["Kwame Mensah", "Target: 17"]`, or a table row with the name in one cell and 17 in the next.
- **Some numbers in words:** "one hundred and twenty", "twelve hundred", "17k", "17 thousand", and "5.2 million", where the text was split at the decimal point.
- **Names** with an accent or a curly apostrophe: Zoë, N’Golo.
- **The check-in's own page and the list of check-ins.** These are where the lead's brief is shown, and they feed the You board. They never went through the rule at all.
- **Ngozi's own check-in.** The lead's brief ("Kwame Mensah should reach seventeen…") and the lead's note to everyone reached the model that talks to her, as written.

What already held: a pronoun ("He is behind. His target is 17."), the number two or three sentences after the name, a possessive ("Kwame's"), the first name alone, and the report and the board as served.

What changed:
- The rule knows every way a number is written, in figures and in words. It reads a list as one text, and matches names with accents and apostrophes evened out.
- The check-in page and the list now go through it.
- The brief and the lead's note are filtered before they reach another person's check-in. Ngozi's check-in now gets "We are behind the bank. Ngozi should land 14." The sentence with Kwame's seventeen is gone.
- It still takes out whole sentences, never a number from inside one. It never touches anything a person said.
- It also hides less where it hid too much. "On the 17th" is a date and stays. The lead and Kwame still read 17, and Ngozi still reads her own 14.
- A line it empties is dropped from a list, so no empty line and no wrong count ("3 things you already see the same way" over two) reaches the screen.

Tests: 83 new ones, all passing. The board, reports, check-ins, invitations and conversation parts pass: 5,894 tests. The live check waits until run-18 is finished, because run-18 is using the API.

Left as it is, on purpose: the notes colleagues write "for whoever hits this next". Those are people's own words, written for others to read.

**Seven privacy requests from the screens workspace are answered** in `docs/requests-to-engine.md`, one commit each.
- **49, fixed** (`f9367164`). Faraji joined through an open link while no seat was free. Until an admin lets him in, he cannot open any report, the board, or the report's other routes. He reads "You can read this check-in's report once an admin at the organisation that invited you approves you joining it." Once he is let in, everything opens as before.
- **57, fixed** (`dc5bf17c`). Only the person who runs the check-in can share its report. Another admin reads "Only the person who runs this check-in can share its report. Ask them to share it when they are ready." Nothing is written.
- **41, fixed** (`12e57ef5`). A person's own session could be given the lead's setup answers, for example "Aisha is often late with stock counts." Now it is given only the situation: "Aisha joined the stock team in July and is on probation until the end of October." The lead still reads everything they wrote.
- **42, fixed** (`40f25316`). "Decide whether to confirm Aisha in her role" was a team target, so Aisha and her colleagues could read it. Now only the lead sees it.
- **19 and 36 were already fixed.** Their tests prove it. Where people do not see each other, the board says "one colleague", never a name. A person with no name is "a colleague", never the lead's description of them.
- **34, answered, nothing built.** The prototype's invitation has no "Your part in this". The only sentence stored about a person's part is the lead's own words about them, so none is written.

Tests: 816 files and 7,485 tests pass in the parts these touch. The new tests for 41 and 42 fail on the old code, so they test something real.

**Eight more privacy requests are answered, and one new leak is closed.**
- **New, found today** (`4265b4ee`). The list of who has shown their report could be read by any signed-in person, even from another organisation. It held participant ids, not names. Now only people in the check-in and admins of its organisation can read it. On a check-in where people do not see each other, a participant sees only their own row.
- **50, fixed** (`8f1f2eac`). On a check-in where people do not see each other, the board still sent every person's row to every reader, as "another colleague", with whether each had signed off. Now a participant gets only their own row and the lead's. The screens need to read a new yes-or-no, `aTeamReportComes`, instead of counting the rows.
- **64, fixed** (`3e179165`). A pattern about how the check-in is led was sent while patterns are off, even to participants. Now nobody gets it while patterns are off. When they are on, only the lead gets it, after three periods.
- **66, fixed** (`04858df0`). "You have accounts from Amani Kariuki and Juma Otieno this round" was written to the lead and shown to everyone, so Amani read it too. Every reader now gets the round's own sentence with names: "Rukia Mwangi has accounts from Amani Kariuki and Juma Otieno this round."
- **43, 46, 51, 52 and 63 were already fixed,** and new tests now prove each on what is served:
  - Nobody gets another person's rating or confidence.
  - A lead's file name reaches only the lead.
  - A participant who has not answered cannot read the forming report.
  - An admin who cannot see a target reads nothing about it.

Tests: 626 files and 5,981 tests pass in reports, board, check-ins and conversation. Each new test for a fix fails on the old code.

**Eleven more requests from the screens workspace are answered, including 73.** One commit each.
- **73** (`1fe0b9d1`). Their wording test failed on one of my new lines. It is now three short sentences, and their test passes unchanged.
- **60** (`dc60208c`). The private summary opened "What you shared: You are aiming for six shops by December." It now opens "Here is what you shared. You are aiming for six shops by December."
- **61** (`f5cc4c23`). "chandarana-quote.png · a photo" is now "chandarana-quote.png is a photo."
- **67** (`e537b675`). "15% documented" with "of what was said is anchored to a document" under it now has "15 of every 100 things people said have a document behind them." A second fault was found and fixed: every line under a tile started with a space.
- **68** (test `07493e71`). "Unblock: the discount decision" was already "Somebody is waiting on the discount decision, so it needs deciding."
- **31** (`d5199cca`). "The initiator" already reached nobody. In a report shared without names, one sentence started in lower case, and that is fixed.
- **33, part answered** (`59cf4b40`). "You forecasts 3 sales" is now "You forecast 3 sales". An older fault in the same rule is fixed: "finishes" had become "finishe". A second verb after "and" is left for the check in task 1.6, because a rule cannot tell whose verb it is.
- **53, 55 and 59.**
  - Dates in reports shared without names arrived empty, and now arrive as dates (53).
  - A session report now knows how many sessions there are (55).
  - "At the end of session undefined" now carries the session number (59).
- **62** was already done.

Tests: 663 files and 6,302 tests pass in reports, board, check-ins, conversation and documents. Four tests were changed, because they expected the old wording or a lower-case start, which were the faults. No prompt stored in the database is affected.

**Ten more requests are worked through** (65, 45 and 44 are not started yet).
- **47** (`f654a870`). A person who said "ok", "fine" or "Please finish my check-in" was told "Your report is ready now", and then the finish button failed. The close and the finish now use one rule, so they get a question instead.
- **48** (`72d45d31`). The same answer sent twice while it was still being answered wrote two replies. Now it gets one.
- **56 and 69** (`ab775f86`, `7eb62b88`). The session report said "4 of 5" and the check-in's header "4 of 6". Everything now counts the same people: everybody on the check-in, including someone invited who has not joined, who is "a colleague". A count in one sentence is all words or all figures.
- **40, in part** (`2963a3bc`). What a document holds is said in sentences. "Amani Wekesa: cookers delivered, 3, by by 9 October" is now "Amani Wekesa's target for cookers delivered is 3 by 9 October." Bank details are listed as left out: "Never kept, in any document." Two lines the model writes still need a prompt change.
- **35, in part** (`4c28663f`). A situation the lead picked is never switched by the model. The screens need to send what she picked.
- **38** (`12b2e660`). Each person on the board says whether they run the check-in.
- **54** was already fixed. "You is aiming" reads "You are aiming".
- **39** is answered: the screens workspace adds the unit and currency fields, and the engine writes the values. **58** is answered item by item.

Tests: 728 files and 6,704 tests pass in the parts touched. Two tests were changed, because they checked the old colon-and-dash wording.

**The rest of the requests: three more worked through, and every large one answered.**
- **44, in part** (`fd3a9ba0`). Opening a check-in could make five model calls, one after another, before the first question. The two reads of the lead's brief now run side by side, so the first opening waits for one read, not two. The first question is unchanged. The rest must wait for each other. The answer lists two larger changes that would help.
- **45** (`771ec520`). The Done page's "how checkable" read missed things people said. It averaged over every turn, so one date disappeared. It also never counted "waiting on Rukia". Now one date, number or document, or who they are waiting on, counts when it is said once. The lead still gets none of this.
- **65, in part** (`3272bf72`).
  - Rukia read "Ask Amani Wekesa to speak to Rukia Otieno…" about herself. She now reads "Amani Wekesa has been waiting 3 days on you for the signed price list. Give Amani Wekesa an answer, or say when you will."
  - The lead's aim, "I want us to sign 12 shops", was being read as 12 signed, so the board showed 12 of 12. It no longer does.
  - Three items of that request are still open.
- **27** (`51bbf042`). After a yes, Ask Groundwork says the prototype's "Added to your to-dos for Tuesday: call Lakeside's buyer."
- **30, part a** (`4beb133b`). Someone who loses the race for the last check-in reads billing's own sentence, never "ten free check-ins".
- **Every large request now has an answer** (`f85de201`), with the week of `docs/weekly-plan.md` it belongs to. For example: suggestions in week 10, leave through chat in week 21, the weekly report in week 12b.
- **Seven have no week in the plan yet,** so they need scoping first:
  - 5, renaming the situations to the prototype's names;
  - 17, the Company page;
  - 18, links between check-ins;
  - 25, the role map;
  - 28, customers;
  - 37, a check-in with no end date;
  - 70, the switchboard's 22 sections.

**The whole API test suite passes at `cd1d1139`: 1,175 files and 10,885 tests.**

**Week 6b: the four marks are on the team report and the board too** (`69ac07ed`). They use the same rule as the session report and the end card, so a line reads the same everywhere.
- A person's own lines in the team report are marked.
- So are the lines the lead weighs at the close, and each person's lines under "who owns what" on the board.
- Read as Miriam, a colleague, Aisha's lines on the board are:
  - "I sent the price list to Miriam": confirmed, because Miriam received it.
  - "I will visit Westgate Deli on Friday": their word.
  - "I made 8 visits this week": from memory.
  - "Lakeside will buy on the 29th": their word, because only the lead's plan backs it, and a plan is not proof.
- A line a document backs reads as proven, but the file is never named.
- Model-written prose, such as the shared picture, carries no mark, because it is not one line of the record.
- The marks are worked out from what is stored, so opening a page asks no model.
- Deal stages are still left out, because they need your decision.

Tests: 646 files and 6,068 tests pass in reports, board, check-ins and conversation. The new test reads the real board and team report as the lead, two participants and an admin.

**Two faults found while building week 6b are fixed.**
- **Only the lead, and the person it is about, read what the lead weighs at the close** (`0cd2b0fc`). Any colleague in the check-in, and an admin reading along, could read another person's weighed lines. The code meant it for the lead and the subject, but nothing enforced it. Now anyone else is not sent that part at all. This is the more private option.
- **Opening a report never asks the model now** (`dfcbbe17`). Opening the team report made 3 model calls, to word the list of things worth getting on record and the coaching note. The wording is now done when the report is built, for the lead, each person and an admin. Opening serves what is stored. A report built before this change opens with the engine's own words, and still asks no model. A new test opens the report, the session report, the rounds and the board as each reader, and fails if any model is asked.

Tests: 647 files and 6,079 tests pass in reports, board, check-ins and conversation.

**Week 9: a commitment is kept or missed, and each person sees their own count** (`a1a30790`, `e706737c`, migration `20260929120000_how_a_commitment_was_settled`, applied to the local test database only).
- **Proof can now settle a commitment as done.** It counts in two cases. The first is a line of their own that says they delivered it, backed by a document they added themselves. The second is the colleague who was waiting confirming it arrived. Code checks that the line is about the same thing and was written after the promise. When in doubt, it stays open. Proof never marks a commitment as missed.
- **Each commitment records how it was settled:** by their word, proven or confirmed.
- **The count goes only to the person,** on their own You board, in the prototype's wording: "In the last four weeks, you kept nine of your ten commitments." or "In the last 4 weeks, you kept 11 of your 20 commitments." Open commitments do not count. The lead, colleagues and admins get no count anywhere. Tests check every route.
- This has only been tested in the code so far. The next live check will show it with the real model.

Tests: 649 files and 6,119 tests pass in reports, board, check-ins and conversation.

**The live check of the end card and the marks sent task 2.7 back.** The reviewer ran sales and seniorhire fresh on today's build, then read everything as each person through the live API.

What held:
- A transcript and its end card reach only their owner. Every attempt to read someone else's was refused.
- The "you kept" count reaches only the person.
- The lead's remit is taken out for participants, and no colleague's target is in anyone's own check-in.
- Participants get no judgement.

What was wrong, and is being fixed now:
1. **Nobody sees their end card.** It is built 10 to 47 seconds after the goodbye, and nothing fetches it again. This is the heart of 2.7.
2. **A card could say something different from what was recorded,** when the person finished before the card was ready.
3. **The engine's own notes reached the person,** for example "I haven't had that conversation with Tobi yet. [INFERRED: about him taking over the scheduling]".
4. **The card showed six lines and dropped the commitment,** the line that matters most.
5. **The marks were not consistent.** "N19 million disbursed." read as their word, but "Six facilities approved." read as from memory.
6. **The closing reply said "Your report is ready now"** before the person had seen the card. The prototype says "That's all for today. Below is what I wrote down from your answers. Is anything wrong?"
7. **"You kept all two of your commitments."**
8. **The lead's board showed how a person's answers were rated:** "37 lines taken from what they said, 10 with a name, a number or a date in them, 5 of those specific enough…". This breaks decision 38. It was there before today.
9. **Opening a session report still asked the model,** in one part today's fix missed. It took 20 to 68 seconds, and gave a different sentence each time.
10. **Other faults:**
    - A person's own row said "nothing specific enough to record came out of it" when they had given seven lines.
    - "somebody marked it done" was untrue.
    - A clear "I haven't done anything further" left the commitment open, and one commitment was listed twice.
    - Promises such as "I'll talk to Tobi tomorrow" were never recorded as commitments.
11. **Two privacy questions,** decided below:
    - A goal the lead has not told the person yet showed on that person's You board.
    - On a check-in where each person sees only their own target, people say their target out loud, and the product then repeats it to colleagues in its own sentences.

Not tested live: an admin who only reads (the run creates none), and documents (neither scenario has any), so "proven" was not seen.

**The end card, fixed** (second try at 2.7):
- **Finishing now waits for the card** (`c9880115`). It waits up to 50 seconds, writes exactly the card's lines, and returns the card. A new read, `GET /check-ins/:id/end-card`, waits for the card too, and only the person can read it. The screens need to call it after the closing reply; I wrote this in request 7's answer. WhatsApp does not wait, because its messages cannot be held open that long.
- **The card is always what was recorded** (`30447b3c`). If the record has to be read again, the stored card is replaced with the lines actually written.
- **No engine notes** (`dec17c28`). "I haven't had that conversation with Tobi yet. [INFERRED: about him taking over the scheduling]" now reads "I haven't had that conversation with Tobi yet." Every line starts with a capital and ends as a sentence.
- **The commitment comes first** (`630c659e`). If lines are left out, the card says "There are 3 more lines in your record. You can read them all in your record after you finish."
- **One rule for "from memory"** (`f407861a`). A line about what happened, with a figure and nothing written behind it, is from memory, whatever kind of line it is. "N19 million disbursed." and "Six facilities approved." now read the same.
- **The prototype's close** (`4b49f05d`). The closing turn ends with "That's all for today. Below is what I wrote down from your answers. Is anything wrong?" and no longer says "Your report is ready now". This is done in code, because the stored prompt (`system` version 43) still asks for the old sentence.
- **"You kept both of your commitments."** (`c25b1820`)

Tests: 752 files and 6,907 tests pass in the parts touched.

**The rest of what the live check found, fixed:**
- **The lead's board no longer shows how a person's answers were rated** (`eac3b856`, decision 38). Only the person reads their own. Where nothing they said can be checked, the lead and an admin get the one allowed form: "Nothing checkable. Nothing Aisha Otieno has said so far can be checked by somebody else yet. A number, a date or a document for what moved would change that."
- **Opening a session report no longer asks the model** (`5f9de1d2`). The sentence about each person is written at the warm-up, kept, and served as kept. The test meant to catch this had a hidden fault: it never really opened the session report. That is fixed, and the test now fails on the old code.
- **The close on each door tells the truth** (`fde25a4f`).
  - The web keeps the prototype's close.
  - WhatsApp says "That's all for today. Reply "finish" to close this check-in, and your report will come here."
  - The API says "That's all for today. Thank you for your answers. When this check-in is closed, they go into the report."
- **A person's own row holds their own lines** (`0dfbfd66`). Femi read "Answered, and nothing specific enough to record came out of it" about a session where he gave seven lines. The row was looking up his lines under an empty name.
- **Commitments say truly how they were settled** (`c6f26913`).
  - Before: `Tobi Adewale: "I will continue to monitor client health closely." - said in session 1; by their own timing, "next"; somebody marked it done.`
  - After: `In session 1, Tobi Adewale said, "I will continue to monitor client health closely." The time Tobi Adewale gave for it was "next". Tobi Adewale said later that it was done.`
- **A promise not kept is now settled, and a promise is listed once** (`61eecc91`). The step that settles promises was given the person's answers without the questions. So "I haven't done anything further. He didn't reply." had nothing to be about. Each answer now goes with its question.
- A WhatsApp test looked for the exact old line of code, and now looks for the new one (`c645570c`).

**The whole API test suite passes at `c645570c`: 1,184 files and 10,986 tests.**

**Week 12: the lead's board says what has stayed the same for three check-ins** (`70ff1ce3`). A new part of the board, `toLookAt`, reaches only the person who runs the check-in. It comes from the record, never from a rating. It covers a promise still open after being made in three or more check-ins, and a blocker said again three check-ins later. Things settled, cleared or worked round are left out. It shows at most five. What the lead reads:
- "Samuel Kariuki has had the same thing in the way for 3 check-ins. … So far it has only been asked about. Chasing it, or asking someone else, would move it."
- "Samuel Kariuki has made the same promise for 3 check-ins. … Nobody has said yet whether it happened. Asking Samuel what is stopping it, or agreeing to drop it, would settle it."
- Someone who gave no name is "A colleague", never their email address.

The name is being shortened to "Samuel" after its first use, as the prototype does. Not done yet:
- the alert on the latest report and on Today;
- the prototype's "the same 5 leads", because the record has no rows per lead to count.

**Week 12, finished** (`babb064f`, `5f87a98b`):
- The same "stayed the same for three check-ins" sentences are now on the latest report the lead reads, as well as the board.
- The board has one short line per person for Today, `eachPersonToday`, whose `keepsComingUp` is, for example, "Samuel Kariuki has had the same thing in the way for 3 check-ins."
- Both reach only the person who runs the check-in. Opening the page asks no model and writes nothing.
- The prototype's line about each person's day ("Visited John Butchery…") is still week 26.

**Week 13: a plan becomes proposals, confirmed one by one** (`6872b3b3`, `db2bf16c`, `a1c58f7c`).
- **Reading a plan.** The lead pastes a plan, or picks a document they may see. The model reads it into separate goals, roles, commitments and rules. Code then checks each one:
  - its quote must be in the plan;
  - every number and date must be in that quote, exactly as written;
  - a person must be named in the plan.
  Anything that fails is dropped, never invented. A name that is not on the check-in is kept, with the note "One name in it, Musa Bello, is not on this check-in. Add them, and this will go on too."
- **Storage is the engine's,** as Hafsah decided today. A new table, `plan_proposals`, holds each proposal until the lead confirms it, puts it aside with "not now", or edits it. Its database change, `20260929130000_plan_proposals`, is applied to the local test database only. Confirming writes exactly one row, once. Only the lead can see or act on proposals.
  - The builder was stopped by the permission system when it tried to add the table, because it had Hafsah's instruction only through me. She gave it to me directly, so I added the table myself.
- **The screens workspace is told** in `docs/answers-from-engine.md`: what to call, what comes back, and not to add storage of their own.
- **Not done yet:**
  - a confirmed goal's date is not kept, because a target has no date field;
  - the kinds "definition", "decision" and "resource" are not read from a plan.

Tests: 1,201 pass in the check-ins part, including 19 for this. The conversation and documents parts were not re-run for this piece.

**Week 14: a document is read item by item** (`3d60bbaf`, `37467fa5`, `301e558e`).
- **What it took, and from which page.** Each document now lists what was taken, one item at a time, with the page it came from. It also lists what was left out, and why. For example:
  - "Otieno Ouma's target for Q3 sales is 45,000,000." (page 2)
  - Left out: "Bank account details. Never kept, in any document." (page 4)
  - A colleague's number in a participant's own file is left out with "Only the lead can set a number for someone else."

  Pages come from the page markers in the stored text, never from the model. A scanned file says plainly that it cannot tell pages. Only people who may see the document get this, and a colleague gets nothing of a private one.
- **"Yes, but it's 45 now" keeps 45,** and says so: "For Q3 sales, it has 45, as you said, instead of the 40 in the document." If it cannot tell which number is meant, it asks, and writes nothing.
- **A document that disagrees with the record is asked about once.** Once a check-in has put the document's own number to the person as a question, that line is never offered again.
- **Not done yet:**
  - The "Add a document" page does not yet show the disagreement or take the answer there.
  - The answer is kept only as the person's next turn.
  - Documents read before today have no pages until they are read again.
  - The wording "1 number against the person who holds it." is not a full sentence yet.
  - This changes how the check-in raises a disagreement, and it has not been through a scenario run yet.

**The document wording is fixed** (`cf6bfdb9`). After a yes to a document's numbers, the person used to read "Recorded from Q3 targets.pdf. 1 number against the person who holds it." Now it reads "I have recorded this from Q3 targets.pdf. One number is now set for the person it belongs to. Nobody is measured against a number until they have seen it." The lead's own setup had the same clipped wording, and it is fixed too.

**Week 15: photos, receipts and invoices** (`61c48f3d`, `7de5a695`).
- **A photo already counted as proof,** like any document the person added.
- **The person is told it was the photo.** If they said more after the card, the rebuilt card said "From the document you added." about a photo. It also did not check who added the document, so somebody else's plan could make a line proven there. Now the card says "From the photo you added." or "From the screenshot you added.", and it checks who added it.
- **A receipt is never called a conversation.** A photo of a receipt reads as "Date:", "Cashier:", "Total:", which looked like people talking. So "IMG_2041.jpg is a conversation." was shown. Now it reads "IMG_2041.jpg is a receipt." or "…is an invoice.", and the card says "From the receipt you added." A call transcript that mentions an invoice is still a conversation.
- **Not done:**
  - Having the check-in ask for a photo when a claim is only someone's word needs a change to the conversation's instructions, and a scenario run to measure it.
  - Files added before today keep the kind they were given until they are read again.

Tests: 693 files and 6,544 tests pass in the parts touched.

**Week 16: what Today says, built from the record** (`5e826ae2`, `30e398df`).
- **"Since last time"** (`sinceLast`) goes to every reader, each only about what they may see. The lead reads "The count for Freezers sold went from 18 to 21, of the 25 aimed for. Miriam's count for Quotes sent went from 4 to 6, of the 10 aimed for." Miriam reads "…Your count for Quotes sent went from 4 to 6." She never gets a colleague's share or the number aimed for.
- **"For you to decide"** (`forTheLead`) goes only to the person who runs the check-in. For example: "Decide whether a price range counts as a budget. Brian and Miriam are both waiting on you for it. Once it is settled, it changes how 4 deals are counted."
- **The board and Today now agree.** Someone waiting on the lead used to read "has checked in, and nothing here needs you this week." That row now reads "Brian Otieno has checked in, and is waiting on you for a decision on whether a price range counts as a budget."
- Opening the page asks no model and writes nothing. Hidden targets, private file names and untold goals are still taken out for each reader.
- **Not done yet:**
  - the report's disagreements are not in "for you to decide", because their board wording uses a banned word and needs rewriting first;
  - there is no way yet to answer a decision straight from Today.

**"Accounts" is gone from the board's and reports' own sentences, and disagreements join "for you to decide"** (`03898fa9`, `755f4c0e`).
- "The accounts differ on the main obstacle to signing new shops, so it needs settling." now reads "Brian Mwangi and Miriam Achieng said different things about whether the order is signed, so it needs settling." A reader who may not see a name reads "People in this check-in said different things…".
- About 25 more code-built sentences are rewritten the same way. For example, "A picture is forming from the accounts that are in." is now "A picture is forming from what people have said so far."
- The lead's "for you to decide" now has one item per open disagreement: "Agree what counts as a budget and tell both of them. Brian Otieno counts a price range as a budget, and Miriam Wanjiku counts only a written figure. … Four deals are counted differently until this is agreed."
- Text the model writes, and the instructions the model is given, are not changed yet.

**The screens workspace is merged a second time** (`1c3a5d14`), cleanly. Their new request 74 is answered as next: an early check-in asks whether something happened when its date has not come yet. The fix changes what the check-in asks, so it needs two scenario re-runs, and there was no room for them today.

**The whole API test suite passes on the latest code: 1,195 files and 11,093 tests.**

**The whole API test suite passes at the end of week 14: 1,191 files and 11,068 tests.** One guard failed first: the week 13 proposals code names whose number a goal is, and every such file must use the one rule or be listed with a reason. It only writes a goal the lead confirmed, and only the lead reads proposals, so it is now listed as a writer (`277b2225`).

**Week 12c:** an unnamed person in the lead's list of what to ask was headed "Somebody", and is now "A colleague" (`0b6736d1`). The rest was already done.

**Run-19 finished: all 24 scenarios, in 1 hour 50 minutes, on `c645570c`. Nothing is worse than the baseline.**
- Every problem count is 0, including sentences that start in lower case, which were 3 on run-18.
- Every engine-value number is above the baseline:
  - specific detail asked for: 105 (baseline 88; run-18 had 74, which the re-checks showed was noise)
  - blocker checked: 45 (37)
  - proof asked for: 47 (42)
  - past words brought back: 33 (25)
  - differences found: 42 (29)
  - agreements found: 66 (56)
  - commitments recorded: 49 (33)
  - judgement present: 29 (21)
- Jargon in Groundwork's turns is 21 (baseline 42).
- **Jargon in reports and boards rose to 126,** from 46 on run-18. The baseline was 511, and the bar is 128, so it is under the bar, but it is a big rise. The new words are "bottleneck", "escalate", "deliverable" and "alignment". Most follow what people said this time: people themselves said "escalate" in five scenarios, against three on run-18, and each of the other words came from a person too. Decision 41 says a person's own word used back to them is not jargon, but the scorer cannot tell the difference.
- **The model hit its rate limit 204 times,** against none on run-18. 15 calls failed after every retry. The cause is new today: the warm-up that words each report ahead of time, for each reader, ran up to 9 times after one session, and the board's warm-up up to 18 times. That multiplies model calls. It should run once per new thing. This is the first thing to fix next, before more readers or longer check-ins make it worse.

**The second live check of the end card, on run-19, sent 2.7 back again.** It read all 86 finished check-ins in run-19 against their records.

What passes now:
- The card reaches only the person. Everyone else, the lead included, is refused.
- The card's lines are exactly the record's lines, and "There are N more lines" is always right.
- There are no engine notes.
- The marks are consistent. "I have six approved facilities right now." is from memory, and targets are their word.
- All 43 natural closes end with the prototype's sentences, and "report is ready" appears nowhere.
- The lead's board shows no rating.

What still fails:
- **The commitment the closing reply states is missing from the card** in 13 of 20 closes. Femi was told "You will keep following up with customers for their statements. That's all for today. Below is what I wrote down…", and the card below it did not have it. The record reader never wrote it as a commitment.
- **About 20 of 496 card lines are clipped pieces of speech,** such as "The last day of March.", "A target of 40." and "Hit my target of 14 approved facilities."

Also found, outside 2.7:
- The lead's own report still carries `specificityLabel` about herself. It is her own, so no rule is broken, but it is a rating field.
- One closing reply asked for a document inside the goodbye, and said the commitment twice.
- One card line shows markdown asterisks.

A third, small try is being built: the card will add the commitment the closing reply states, and will not show a line that is not a sentence.

**Run-19, the day's second full run, started at 17:37** on `c645570c`, in three parts. The two privacy items from the live check are being built alongside it. They filter what is served, so their tests prove them, not the run. Both are now done:
- **A goal the lead has not told the person about reaches only the lead** (`7a81746c`). Tobi's You board listed "Take over the scheduling." before Wanjiru had spoken to him about it. As Tobi, the report read "Tobi Adewale has started well. Wanjiru Mwangi expects Tobi Adewale to take over the scheduling. Both have answered." It now reads "Tobi Adewale has started well. Both have answered." The lead reads all of it. This goes by what the lead chose ("not told"). It does not go by whether the person has opened the Context page, because that would hide every goal forever.
- **A colleague's target in the lead's own words stays with its owner** (`1ea89d29`). Femi read "Ngozi Eze is trying to get 14 new facilities approved and have N42 million disbursed." Now that sentence reaches only Ngozi and the lead. Femi still reads his own ("Femi Okonkwo is trying to get 12 new facilities approved."). A number counts as a target only in a sentence about a target, so "the first 90 days" and years stay.

Tests: 657 files and 6,192 tests pass in reports, board, check-ins and conversation.

**Run-18 finished: all 24 scenarios, in 1 hour 42 minutes, with no errors.** It ran on the build of `7f806500`, before today's privacy work. The scorer says:
- **Every problem count is 0, except 3 sentences that start in lower case** (579 at the baseline).
- **Jargon** is down to 18 in Groundwork's turns (42 at the baseline, 24 on run-16) and 46 in reports and boards (511 at the baseline).
- **Most engine-value numbers are up:**
  - proof asked for: 46 (baseline 42)
  - past words brought back: 30 (25)
  - differences found: 38 (29)
  - agreements found: 67 (56)
  - commitments recorded: 51 (33)
  - judgement present: 29 (21)
- **Two are down:**
  - "specific detail asked for" is 74, against 88 at the baseline and 87 on run-16;
  - "blocker checked" is 34, against 37.

I looked at where the drop is. It is spread thinly over many scenarios, one or two turns each, and most of it is in the lead's own check-ins: 18 there, against 27 on run-16 and 23 on run-14. Nothing that changed since run-16 touches the lead's questions. The hidden-target filter only changes what a participant's check-in is given. So it looks like the model varying from run to run. To be sure, I ran the eight scenarios that dropped most again, twice, on the same build. **It was the model varying, not a real drop.**

| The eight scenarios | Specific detail asked for | Blocker checked |
| --- | --- | --- |
| Run-18 | 10 | 4 |
| First re-check | 20 | 6 |
| Second re-check | 21 | 9 |
| Run-16 | 29 | 13 |
| Run-14 | 20 | 11 |

The same build asked twice as often in both re-checks as it did in run-18. With the re-checks' average in place of run-18's draw, the full run comes to about 84 and 37, against 88 and 37 at the baseline. So nothing in the code lowered them. "Specific detail asked for" still moves a lot from run to run, by 10 or more, and I have written that below for Hafsah.

### Decided for Hafsah to confirm

1. **The lead's note to everyone is filtered too.** A sentence in it that gives a colleague's hidden target is taken out of the copy that reaches another person's check-in. The lead's own copy is unchanged. This is the more private option.
2. **Request 49: someone held for a seat cannot read the check-in's report.** This covers every report and every name in it, until an admin lets them into the organisation. This is the more private option.
3. **Request 57: only the lead of a check-in can release its report.** Another admin is told plainly that it is the lead's to share. This matches the prototype, where sharing the report is the lead's to decide.
4. **Request 42: a target that is really a decision about one person is the lead's alone.** An example is "Decide whether to confirm Aisha in her role". It is not served to Aisha, or to anyone else in the check-in. The target table has no field for this, and I did not change the database while run-18 was going. So a target is treated as a decision about a person from its wording: a word for deciding ("Decide", "determine whether") together with a word about someone's place (role, probation, confirm, contract, promotion, pay, keep or let go). It errs on the private side. "Decide whether to renew the software contract" is also hidden from the team. "Decide on the new supplier" stays a team target. A field set when the target is made would be sturdier later.
5. **Request 49 also covers the board and the two activation routes,** because they carry the report's story and names. If the check for a held seat fails, the report is refused, never served.
6. **Request 57 has no fallback.** If the lead has left, nobody else can share that report. The route also still needs the admin role, so a lead who is not an admin shares through "send to everyone", which already allowed only the lead.
7. **Request 41 applies to briefs already stored.** A short brief written before this change may still reword the lead's setup answers, until the brief is saved again.
8. **Who has shown their report is read only inside the check-in.** Groundwork staff who are not admins of that organisation are refused too.
9. **Request 50 keeps the lead's row** on a participant's board, because participants may already read the lead's name.
10. **Request 64 is for the lead only, even when patterns are on.** It has no place for the person to answer first, so decision 39 could not be kept for anyone else. The "setup never said" reading only ever has one period, so under the three-period rule it now never shows.
11. **Request 63: an admin who cannot see a target is told "has checked in, and nothing here needs you this week", even when the person is behind.** The request suggested saying they are behind, but "behind" is worked out from the hidden number, so I held it back.
12. **Request 66: the lead reads their own name on that one line,** not "you". That is the same as the round's report text beside it. The alternative is a second copy of the line for each reader.
13. **Request 35: a situation the lead picked always stands.** The only way to change it is pressing "It's something else".
14. **Requests 56 and 69: "N of M" counts everybody on the check-in,** including someone invited who never joined. The stricter rule, which leaves out a lapsed invitation, only decides when a round's report is written, and never prints a count.
15. **Request 58: a person's own private summary, and the lead's own setup report, may keep names the person typed.** Only that person reads them. The "stored without names" rule is for shared reports.
16. **Request 39: the screens workspace adds the unit and currency fields** to targets, so two workspaces do not write clashing database changes.
17. **Requests 10 and 15: a new suggestion does not replace one nobody has decided yet.** The thresholds, such as "below 6 in 10", are still yours to set.
18. **Request 21: leave is approved by the person's line manager** where one is set, and otherwise by the lead of their check-in.
19. **Request 23: only a manager starts a performance review,** as today. The product does not start one by itself.
20. **Request 71: the weekly report is written on Friday,** as in the prototype.
21. **Request 5: the situations are renamed to the prototype's names.** The client's list has to change on the same day, so it is written up but not done.
22. **What the lead weighs at the close is read only by the lead and the person it is about.** On a team check-in, that is the lead alone.
23. **Week 9: proof can settle a commitment as done** (a document the person added, or the colleague confirming it arrived), but never as missed.
24. **Week 9: "you kept 11 of your 20 commitments" is the person's alone.** Each person's load across check-ins is private, so the lead does not see this count.
25. **A goal the lead has not told the person about yet is not shown to that person.** It appears once the lead has told them. This is the more private option.
26. **On a check-in where each person sees only their own target, the product's own sentences never give a colleague's target,** even when that colleague said it out loud in their check-in. Their own words, shown word for word to the people in the check-in, stay as they are. This is the more private option.
27. **A goal the lead marked "not told" is hidden from the person,** reversing an older note in the code that said to show "you were never told". **Not done yet, and recommended next:** the model that talks to the person in their own check-in is still given that goal, so it could raise it. Taking it out is the more private option. It changes the conversation, so it needs two re-runs of the scenarios it affects, and there was no room for them today.
28. **Week 10, the first suggestion, is held, not built.** It would give the manager a suggestion about a person, built on counts like "kept 11 of 20 in the last four weeks". Each person's load across check-ins is private, and today that count goes only to the person. The two rules pull against each other. The more private option is to show a suggestion to the person first, and to the manager only as a plain line with no count behind it, but that is a product decision. Weeks 11 and 12b rest on it too. I moved on to week 12.
29. **Request 77: a person's own words are served in full, even when they give someone else's hidden target.** For example, if a lead who also takes part said "Aisha needs 40 shops" in their own check-in, an admin or a colleague would read that line under the lead's row. This follows decisions 4 and 5 and Hafsah's ruling, but it widens what people read, so please confirm it. The rule for a goal the lead has not told the person about still applies to people's own words.

---

## HANDOVER, 29 SEPTEMBER 2026: WHERE THIS WORK STOPPED

The work is moving to a new session on another account. Everything below was committed and pushed to `mine/wip/plain-reports`. The last commit before this note was `09fe5c0e`.

### What is finished

- **Week 6, the end card** (`47b4d04c`). When a check-in closes, the engine builds the prototype's "What is now in your record": each line with how it is known. It is built after the goodbye, because reading the record takes 10 to 47 seconds, and kept on the closing turn. The transcript serves it as `endCard`, only to the person themselves. Nothing reaches the record before they finish. Then exactly the card's lines are written, unless they said more after it. Migration `20260929090000_the_end_card_on_a_turn`.
- **Week 6, confirmed by the person who received it** (`eebc48a8`). This is the new field on record lines (`confirmedAt`, `confirmedByParticipantId`), with the rule Hafsah agreed. When the colleague who was waiting says in their own check-in that it is no longer in their way, the model picks the one line that says it was delivered, and code checks that the line is about the same thing. Migration `20260929100000_a_line_confirmed_by_who_received_it`.
- **Week 6b, the four marks on the session report** (`dafcfea1`, `1dbb26b6`). Every line in the session report's sections carries `mark` (proven, confirmed, said or memory), and each person's lines in "what each person said they did" carry `lineMarks`. One rule decides it for both the reports and the end card: `api/src/modules/reports/how-a-line-is-known.ts`. A line counts as proven only by a document the person added themselves.
- **Week 9, first step** (`aa91a8d7`). After each check-in, what the person says about their earlier open commitments settles them as done or not done. Anything else stays open. Migration `20260929110000_when_a_commitment_was_settled`.
- **Week 0, first step** (`55d13abb`). A colleague's hidden target is no longer given to the model that talks to a person in their own check-in.
- **Answers to the screens workspace:** request 7b part (b), and part of request 2, in `docs/requests-to-engine.md`.
- **The bug-fix branch** `fix/privacy-conversation-crash` (folder `groundwork-pr1`, local branch `wip/fix-privacy-conversation-crash`, up to `a89fd13f`) is saved on this computer only. This workspace may push only `wip/plain-reports`. Its last commit, the labels and the person's own session, is unfinished and untested. See `docs/pr-1.md`.

All three migrations are applied to the local test database `gw_pw9_1786222102` only.

### What is in progress, and exactly where it stopped

- **No step is half done.** Every change above is committed with its tests.
- **Run-17 was stopped by hand** at 29 September, early afternoon, because Hafsah asked for nothing to be left running.
  - It had finished 1 of 24 scenarios: sales, in `api/journey/all-24/run-17/sales.json`. It was part way through loans.
  - It ran on the build of `eebc48a8` (weeks 6 and 6-confirmed, nothing later), in one line rather than three parts, which is why it was slow.
  - It has not been scored.
  - The local API it used, on port 3000, was stopped too.
- **Nothing that this session started is still running.** One older API process from 20 September is still listening on port 3101. This session did not start it, so it was left alone.
- **Full test suite: not yet run** on the latest commit. By part, these passed: conversation, documents, people, grounds, reports and board (the last combined run was 4,677 tests across reports, board and conversation).

### What comes next, in order

1. Run the whole API test suite once: `cd api && npx jest --maxWorkers=3`. Before this work, three tests already failed on the base at `80beab98`, so compare against those.
2. Start a fresh full run, run-18, on the latest commit, in three parts as run-16 was (`api/journey/chunked.sh`). Rebuild the API first (`npm run build`), then start it from `dist/main` so edits cannot restart it mid-run. Score it with `tools/score_run.py --against docs/baseline.json`. Check that no engine-value number drops. Pay most attention to anything about the record, since the record is now written from the end card's lines.
3. Read what a person sees for the end card and the marks, as the lead, a participant and an admin. The reviewer's step has not been done for weeks 6, 6b, 9 and 0.
4. Tick task 2.7 only after steps 1 to 3 pass. The screens also need to fetch the card from the transcript after the close (see request 7b).
5. Then carry on with `docs/weekly-plan.md`:
   - week 6b's remaining parts (team report lines and the board's lines), once the stages question below is answered;
   - week 9's count, once the privacy question below is answered;
   - week 0's next step, once option 1, 2 or 3 below is chosen;
   - then weeks 10 onward.
6. Merge the screens branch every few days: `git fetch mine`, then `git merge mine/wip/prototype-ui`. It was last merged on 28 September, night.

### How to check on anything that runs

- A run writes to `api/journey/all-24/run-N/`. Each finished scenario gets a `.json` file, and `run.log` shows the scenario it is on.
- The API's own log shows the new steps as they happen:
  - "end card with N line(s)"
  - "wrote the N line(s) the end card showed"
  - "settled N of M open commitment(s)"
  - "confirmed-by-who-received-it"
- Small tools that read without writing are in `api/journey/`, which git ignores: `peek-end-card.ts`, `peek-confirmed.ts`, `peek-session-marks.ts` and `peek-the-prompt-targets.ts`. The usage is at the top of each.

### What needs Hafsah

1. **Who may see "kept 11 of 20 in the last 4 weeks"?** Each person's load across check-ins is private under the rules, so today only that person could see it. Showing it to the lead would change a privacy rule.
2. **Can proof settle a commitment?** For example, a document the person adds, or a colleague confirming it arrived. Today a commitment and a record line are not linked.
3. **Who can mark a to-do as done?** The lead can mark someone else's to-do done through the Context chat (`makeTheChange` in `grounds.service.ts`), while the to-do button says only its owner may move it.
4. **Where a deal's stages come from.** The team report's "What moved" needs the organisation's own stage names (Contacted, Need, Pitched, Qualified, Quoted). The engine has no stages anywhere.
5. **Week 0's next step touches the must-keep list.** The shared team report and the picture's opening are written from each person's target numbers. Taking them out would weaken "notices what does not add up". The options are: (1) leave them in, with the net that removes them from what others are served; (2) give the model the gap without the number, then check with a run; (3) write a separate copy for the lead. The recommendation is option 2.
6. **A total can give a number away.** "Yours is 21, of 270 across ten people" gives away a colleague's number when there are only two people. The fix is to show a total only when three or more people have a number. It tightens a privacy rule, so it needs a yes.
7. **The bug-fix branch cannot be pushed from this workspace.** If it should be saved to GitHub, push it from the `groundwork-pr1` folder with `git push mine wip/fix-privacy-conversation-crash`.
8. The earlier items further down this report are still open: the jargon bar, the ratings decisions, and the screens' requests marked Open.

---

## 28 SEPTEMBER, NIGHT: THE PULL REQUEST WORK IS STOPPED, AND THE BRANCH IS SAVED LOCALLY

Hafsah decided there will be no pull requests for now. The whole build is finished first and released once, at the end. I stopped both helpers: the one building the last privacy fixes on the bug-fix branch, and the one researching the second pull request.

The bug-fix branch is `fix/privacy-conversation-crash`, in the folder `groundwork-pr1`, and it is committed up to `a89fd13f`. Nine of its ten fixes are finished and tested. The last one (labels, the person's own session and the coaching note) was stopped partway. It compiles, but it has no tests yet. The details are in `docs/pr-1.md`. `docs/pr-2-plan.md` records that the research had found nothing yet when it was stopped.

**Needs Hafsah: the push of the bug-fix branch was refused.** The safety check refused `git push mine fix/privacy-conversation-crash:wip/fix-privacy-conversation-crash`. It then refused `git push mine wip/fix-privacy-conversation-crash` as well, after I had given the commit a local branch of that name. Those two were refused because of how the command was written (a folder change and a pipe on the same line). Then I tried the bare `git push mine wip/fix-privacy-conversation-crash` from this workspace, and it was refused for a clear reason: each workspace may push only its own branch, and this one is `wip/plain-reports`. I stopped there. The branch exists only on this computer. If you want the copy saved to GitHub, you can push it yourself from the `groundwork-pr1` folder with `git push mine wip/fix-privacy-conversation-crash`.

Next, I am back on `wip/plain-reports`: first the hidden-target tests, then week 6 of `docs/weekly-plan.md`.

## 29 SEPTEMBER, MORNING: WEEK 6 BUILT ON THE ENGINE'S SIDE, AND RUN-17 STARTED

**The end card** (`47b4d04c`). When a check-in closes, the person now gets the prototype's "What is now in your record": each line, and how it is known. For example, from a real sales check-in in the test database:
- "I have 31 applications that I've taken from businesses." with "You gave this from memory. Nothing written backs it yet."
- "My part is to contribute 12 approved facilities to the team target." with "You said this."
- On a new hire's check-in with documents: "I was told to go direct to the members without waiting for an introduction." with "From the document you added."
- Under "What happens next", at most one line: "If you have something written for any of these, such as a message or a photo, add it. Then that line counts as proven."

Three things I found by reading real cards, and fixed:
- A target with a number in it was called "from memory". Now only a line about what happened can be.
- The "next" line said "shows this" under six lines. It now says "any of these".
- Reading the record takes 10 to 47 seconds. So the card is built after the goodbye, never before it.

That last point means the screens have to fetch the card from the transcript after the close. I wrote this in the answer to request 7b.

Nothing reaches the record before the person presses finish. When they do, exactly the lines the card showed are written. If they said more after the card, the record is read again.

**Confirmed by the person who received it** (`eebc48a8`). This is the new field, with the rule I proposed and you said yes to. The colleague who was waiting on the work says, in their own check-in, that it is no longer in their way. The model then picks the one line of the other person's that says they delivered it, and code checks that the line is about the same thing.
- Read on 20 real waits in the test database: no line was wrongly marked.
- One was wrongly marked before I added the "same thing" check. A wait for "clarity on Wanjiru's project" was matched to a line about a letter.
- A line saying the deck was sent is confirmed. A promise to finish the pricing sheet is not.

**Tests:** 2,816 in the conversation, people and documents parts pass. Four tests that read the source now point at where the record read lives; they check the same things.

**Run-17** is running on this build, to check that no engine-value number drops now that the record is written from the card.

**Week 6b, the marks on the reports** (`dafcfea1`, `1dbb26b6`). Every line in the session report's sections now carries its mark. So does each line of "what each person said they did", as a list beside the lines. The end card and the reports use one rule, so a line reads the same on both.

Reading a real report found one thing, which I fixed. The lead's workplan had made a participant's "The build is on track for the 14th" and "I am waiting on legal" read as proven, because the plan mentions the 14th. A plan is not proof, so a line is now proven only by a document the person added themselves.

Tests: 2,222 in reports and board, and 4,677 across reports, board and conversation, all pass.

**Needs Hafsah: the stages of a deal.** The prototype's team report shows, under "What moved", each deal with its stages marked: Contacted, Need, Pitched, Qualified, Quoted ("Ringed is someone's word; filled is proven"). The engine has no idea of stages or deals anywhere. Nothing says where an organisation's stage names come from: the lead's rules in Context, a template, or something the lead sets. Until you decide, I have left `stages` out (screens requests 2 and 7c). The screens draw nothing when it is missing.

**Week 9, first step: a commitment is settled from what the person says next time** (`aa91a8d7`). The next check-in already asked "what happened" about each open commitment, but nothing wrote the answer back. Now, after each check-in, the person's own words are read against their commitments that were open when it started.
- A commitment is marked done when they plainly say they did it.
- It is marked not done when they say they didn't and give no new time for it.
- A new date, work in progress, "partly" and silence all stay open, because a promise that moved is not a missed one.

Checked live twice with the real model. Five commitments came back as done, not done, open (new date), open (half done) and open (not mentioned), both times.

**What already existed, so I did not rebuild it:** commitments are kept in four places (`Commitment`, `PersonObjective`, `GroundCommitment`, `OpsCommitment`). Kept could already be set by hand, and "finished" was already read into `PersonObjective`. Nothing ever recorded "missed", and no "kept 11 of 20" count exists anywhere.

**Needs Hafsah, three questions about week 9:**
1. **Who may see "kept 11 of 20 in the last 4 weeks"?** Your rules say each person's load across check-ins is private, always. The count is about one person, so today it could be shown only to that person. If the lead should see it too, for one check-in, that is a change to a privacy rule, so it is yours to decide. I have not built the count yet, because nothing reads it until week 10's suggestions.
2. **Can proof settle a commitment?** For example, a document the person adds, or a colleague confirming the work arrived. Today the two are not linked: a commitment and a record line are separate rows. Linking them means the model matches a line to a commitment, as it does for "confirmed".
3. **The lead can mark someone else's to-do as done.** They can do this by confirming a sentence in the Context chat (`grounds.service.ts`, `makeTheChange`), while the to-do button says "This one is somebody else's to move." These disagree. Which way should it go?

**Run-17** is running in one line rather than three, at about 12 minutes per scenario, so it will take about five hours. One card has already been built in it: 6 lines, on a real close.

**Week 0, first step: a colleague's hidden target is not given to the model that talks to you** (`55d13abb`). I mapped every place a target reaches the model. The worst was the check-in conversation itself. On a check-in where people see only their own targets, each person's model was still given everybody's numbers, so it could say a colleague's number to them. Now it gets exactly the targets their screen shows, and the lead gets all of them.

Checked on a real sales check-in's prompt: the colleague's 5,200,000 and 4,000,000 are not in it, in any spelling, and the person's own 3,400,000 and 3,000,000 are. The stored engine rule already says the person "has been shown these on screen". That is now true, so no prompt text changed.

**Needs Hafsah, week 0's next step, because it touches the must-keep list.** The team report and the picture's opening are written once and read by everybody. Their text is written from each person's own targets, for example "set 21, has said 14". Taking the numbers out, as week 0 says, would weaken "notices what does not add up: their number against the lead's", which is on the must-keep list (`docs/engine-value.md`). Three ways to go:
1. Leave the numbers in, and keep relying on the net that takes them out of what other people are served. This is what happens today, and nothing is lost.
2. Give the model each gap without the number, for example "has said less than the target set for them". The report still notices the difference, and the lead still sees the numbers on the board. It needs a run to show the number of differences found does not drop.
3. Write the lead's copy separately, with the numbers. Nothing is lost, but it costs one more model call per report.

My recommendation is 2, measured by a run.

**Needs Hafsah: a total can give a number away.** A person is told "Yours is 21, of 270 across ten people". With only two people, the total minus your own number is your colleague's number. The same sum goes into the check-in in one place. The fix is to give the total only when three or more people have a number. That changes a privacy rule, even though it tightens it, so I have not made it.

## 28 SEPTEMBER, NIGHT: BACK ON THE WEEKLY PLAN

**The hidden-target tests are already done.** They are the twelve cases in `d8fa3648`: a pronoun, the number two and three sentences after the name, the number before the name, a list, the target in words, and a row whose name and number are in different fields. All of them are now taken out.

**The screens branch is merged in** (16 commits, no conflicts). It includes a new `Mark` part on the screens, which is what week 6's marks will feed.

**Week 6: the prototype does have "confirmed by the person who received it".** You asked me to check before adding the field. Here is where it is:
- The mark itself is in the legend of the one-session report (`docs/prototype/screens/B4-reports-and-sharing/one-session.txt`, line 126) and of the team report (`team-report.txt`, line 130). The four marks are "Proven", "Confirmed by the person who received it", "Only someone's word" and "From memory only".
- The kind of line it marks appears in the check-in ("The buyer has now confirmed the meeting. That is in your record.", `B3-the-check-in/check-in-phone.txt`, line 10), in the person's own report ("Lakeside's buyer confirmed your meeting on the 29th, as you said.", `own-report.txt`, line 28), and on the You board ("Operations confirmed they now match.", `you-board-daniel.txt`, line 61).
- The check-in's own end card (`B3-the-check-in/check-in-end-card.txt`) does not use it. Its lines say "From the photo you added" and "You said this." That makes sense: a line said a minute ago cannot have been confirmed yet by the person who received the work. So the field matters most for the reports (week 6b).

**Week 6 in two steps.** First, the end card, with three of the four marks: proven, their word, and memory. That is being built now. Second, the new field for "confirmed". The screens send the four marks as `proven`, `confirmed`, `said` and `memory` (screens request 7b).

One thing the prototype does not say is **who confirms a line, and how**. My proposal: a line is confirmed when the person who was waiting for that work says, in their own check-in, that it arrived. The engine already records who waits on whom for what. I will build the field and this rule unless you want it done another way.

How the end card gets its lines: record lines are written today only when the person presses "That's right, finish". But the card has to show them before that ("Is anything wrong?"), and 49 places read record lines without waiting for a check-in to finish. So the engine now reads the record at the closing reply **without storing it**, builds the card from those lines, and keeps them with the closing turn. When the person finishes, exactly those lines are written, so the card and the record match. If they change something first, the record is read again, as it is today.

## 28 SEPTEMBER, DAY: HAFSAH'S DECISIONS ON RATINGS AND PATTERNS

**Ratings are never sent to anyone but the person they are about** (`828b4837`, decision 38 in `docs/decisions-merged.md`).
- **Before:** a lead or an org admin opening a report was sent every person's rating: how specific each person's answers were, how sure the picture of them was, and a closing tier for each person.
- **Now:** every reader, the lead and an admin included, is sent only the rating of their own answers. An admin who gave no answers of their own gets none.
- **I kept a person's own rating.** Your decision says ratings are never served to any reader. I read that together with the earlier decision of 1 September, that a person sees their own rating as a nudge, and with the prototype's Done page, which shows a person "How checkable today's check-in was, 4 of 5" and says "Only you see it". If you meant that nobody at all, not even the person, is sent a rating, it is one line to change, and the Done page would lose that panel.
- **A second leak, found while checking every route:** pressing Release on a report sent the admin the whole stored report. That included every person's rating, every person's private preparation for the talk afterwards, and the concerns about people. It now sends back only when the report was released. The screen never used what came back.
- **Checked on what a person actually receives,** on two real check-ins from last night, as the lead and as each participant. Reports carry only the reader's own rating. Check-ins carry only the reader's own. Boards carry none, and they still load.
- **A test** checks that the lead, an org admin and a participant each leave with nobody else's rating, and that Release returns no stored report.
- **One old test changed.** It checked the old rule, "a lead still sees everyone's reads". It now checks the new rule.
- **Tests:** all 10,413 API tests pass. The client passes 3,216 of 3,217. The one that fails is the screens workspace's "Jump to" sidebar test, as before.

**Pattern windows approved, with your addition** (`68ea3eab`, decision 39). When the lead sees a pattern the person has not answered, it now says so plainly. For example: "Femi saw this first and has not answered yet." Or, if Femi never opened it: "Femi has not seen this yet, and has not answered yet. It is shown to you because a week has passed since it came up for the third time." Patterns stay switched off until you approve the names, so for now only the tests prove this.

**The closing problem, and request 47 with it** (`75a28ddd`, `1a9ffa59`). Done, and re-run twice.
- **"This check-in will continue in two weeks."** is now read as a goodbye. When the product adds its last question, the goodbye comes off first. The person's own "You will continue to follow up" is never taken for one. Across every past run this matches 1 of 15,543 turns, the one Tobi read.
- **Request 47, the screens workspace's check-ins.** Those ids are in a database on the other computer, so I worked from the code and the description. I found two causes:
  - When the product decided the check-in was not over, and had no last question of its own to add, the model's "Your report is ready now. Speak soon." went out as written, and the check-in stayed open. This happened in 10 of 3,550 turns in last night's runs, for example "…Your report is ready now. Speak soon. What else should I know?". Now the goodbye comes off, and if nothing is left asking, Groundwork's usual question goes on. The streamed reply does the same.
  - "Please finish my check-in" was not heard as asking to finish, though "finish this check-in" was. Now it is, and so are a bare "Finish" and "Please finish.". A sentence such as "I want to finish the proposal by Friday" still is not.
- **Re-runs:** sales, seniorhire and snapshot, twice each. Snapshot is where the goodbye showed most.

  | Sales, seniorhire and snapshot together | Run-12 | Run-13 | First re-run | Second re-run |
  | --- | --- | --- | --- | --- |
  | A goodbye in a turn that was not the last | 4 | 3 | **0** | **0** |
  | A goodbye before "One more before this closes" | 0 | 0 | **0** | **0** |
  | Check-ins that closed naturally | about half | about half | **15 of 23** | **13 of 23** |
  | Proof asked for | 13 | 7 | 10 | 16 |
  | Specific detail asked for | 26 | 30 | 33 | 34 |
  | Blocker checked | 9 | 18 | 15 | 16 |
  | Past words brought back | 34 | 32 | 33 | 28 |
  | Commitments recorded | 32 | 43 | 29 | 27 |
  | Differences, agreements, per-person findings | 11, 18, 23 | 11, 16, 22 | 13, 19, 23 | 9, 19, 23 |
  | Turns that ask more than one question | 5 | 6 | 0 | 0 |

  - **Kept.** In both re-runs no goodbye came before a question or in a turn that was not the last, and more check-ins closed naturally.
  - Commitments recorded was a little lower in both. Per scenario it is inside the usual spread: sales has ranged from 11 to 38 across eleven runs, and seniorhire from 2 to 24. The re-runs gave sales 22 and 14, and seniorhire 7 and 12.
  - Nothing in the "problems in what people read" list came up.

**Request 46: a private file's name on the board** (`fc82c0a5`, `9758c050`).
- **How it got there.** When the lead attaches a file in her own check-in, Groundwork's reply names it: "Here is the context we have from team-plan.txt". Her answer echoed it, the line went on the record, and the report and board are written from every record line, whoever may open the document behind it.
- **Fixed in four places.**
  - The report is now written from the record with private file names taken out. The stored line is not changed.
  - A note that goes to everyone, "The numbers on this check-in come from team-plan.txt", now names the file only if everyone may open it.
  - Lines that anyone but the lead reads, on the check-in's page and in their own check-in, lose private file names, so notes stored before the fix are covered.
  - The session report lists by name only the documents the reader may open.
- **Seen for real in the local test database.** A note shared with everyone names `harvestline-q4-targets.xlsx`, a file only its owner can open, and participants were sent it. I will check it again as a participant once the API is rebuilt.
- **What stays:** what a document showed can still be said. Only which file it was is the owner's to share.

**Run-14, today's full run, on `9e808ab9`, finished at 11:45.** It has every fix above except week 3 and "Nothing checkable".
- **The checker fails it on one number: "proof asked for" is 37, against a baseline of 42.** The allowance is 10%, so 38 would have passed. Everything else is at or above the baseline.
- **This fall started before week 2.** Across full runs, "proof asked for" was 50, 53 and 53 on runs 8, 9 and 10, then 42 on run-12 and 38 on run-13, both before week 2, and 37 now. The one-question rule asked the model again 24 times in run-14, but the log does not say which question was dropped, so I cannot show that week 2 cost any proof questions. I have kept week 2. Week 4 of the plan is about asking for proof kindly, and its bar is exactly that this number goes up, so that is where I will fix it. Per scenario the drop is mostly seniorhire, which went from 9 and 8 to 3, 2 and 4.
- **For the first time on a full run, no turn asks two questions:** 0, against 37 at the baseline. This is task 2.2's bar.
- **Every problem count is 0,** the third full run in a row, so task 1.6 holds.
- **Quotes:** 619 of 619 served are word for word in the record.
- **The lead's private words:** none reached an invited person, the fourth full run in a row. The helper flagged six places. Four were the person's own words or the targets this check-in is set to show. In the other two, Groundwork told Patience "after six years", which is in the check-in's brief, not only in the lead's description of her.
- **Jargon in Groundwork's turns: 29**, against a bar of 10.5. Week 3 is not in this run.
- **The judgements: 20 could be tested, and I read 18 of them as clearly right. Two more, renewal and workplan, are close calls I would also count, which would make 20 of 20.**
  - Sales and openread were flagged incomplete, so they are left out. Advisor and shock could not be tested again: Peter never mentions the banks, and nobody mentions the missed QBRs or the champion leaving.
  - **Snapshot is right for the first time:** "Sign the lease document for the office move", which is waiting on the lead.
  - **Renewal**, a close call: it says there is "a single operational cause that has been known since March" and stops the talk being about the partner's performance, but it does not say in so many words that the cause is our own change.
  - **Workplan**, a close call: it finds both leads planning work with the same supplier, and says the plans are over budget, but calls it "two different projects" rather than one contractor counted twice.
  - **So run-14 meets your bar for task 1.5 on its own.** Run-13 did not, so the next full run decides it.
- **"Nothing checkable" and three faults in the lead's rows, checked live after this run** (`b450fbf2`). On openread the lead now reads "Nothing Kofi Boateng said this round can be checked yet", then "Ask Kofi Boateng for a photo, a message or a document that shows what moved". While reading the rows I fixed three faults that were already there: "Ask Jide Sanusi to speak to the handover from the current finance manager rather than write to them", "has been waiting 0 days", and a row saying "nothing here needs you this week" and then giving something to ask.

**Hafsah's correction: "Nothing checkable" is back on the lead's board** (`01379c6e`, decision 40 in `docs/decisions-merged.md`).

*What `a1747927` (27 September) changed, exactly:*
1. The board stopped reading the check-in's rating of how checkable the answers were. It looked instead for a number, a date or a document in the record of that round.
2. The reason "nothing checkable" was renamed "nothing to count yet".
3. Each person's row gained a sentence, `says`, in full sentences with the person's name, for every reason.
4. A stop-gap from before it, which turned "nothing checkable" into "nothing to do" so the lead never saw it, was removed.
5. A privacy test was added that proved the lead's board was the same however the check-ins were rated.

*What is put back, as the prototype words it:*
- The rating decides it again, as it did before `a1747927`. A check-in not yet rated is judged by its record instead, so nobody is marked "nothing checkable" just because the rating has not run.
- The reason is "nothing checkable" again. The screen shows the reason beside the name, so the lead sees "Nothing checkable", as in the prototype's "Omondi: nothing checkable".
- The sentence under it now reads, for example: "Nothing Miriam Wanjiku said this round can be checked yet. This is the second week in a row. A number, a date or a document for what moved would change that." The count of weeks in a row is new, from the prototype's "for 2 weeks in a row".
- What to ask next is new, from the prototype. Where nothing else is in the way: "Ask Miriam for a photo, a message or a document that shows what moved" when proof was missing, and otherwise "Ask Miriam for a number or a date for what moved this round".

*What is kept from `a1747927`, because it protects privacy:*
- Only whoever runs the check-in, and an admin, is sent these rows. A new test proves a participant gets none.
- No raw rating value is ever sent, and no sentence uses a rating word about the person.
- The rating changes only this one reason. Nothing else on a row moves with it.
- The full sentences for every reason stay.

*For Hafsah:*
- Decision 40 is written as the one exception to decision 38 from this morning. A report's other per-person ratings are still not sent to the lead or an admin. Say if you want those back as well.
- The prototype's "He says “worked on it”, but gives no error, code link or what he tried" comes from a pattern. Patterns stay switched off until you approve the names.
- Not yet checked live. The API keeps run-14's build until that run finishes, and then I will read the lead's board as the lead, a participant and an admin.
- The four tests that pinned `a1747927`'s rule now pin the corrected rule and every protection above.

**Week 3 of the weekly plan is built, and not yet measured live** (`edcaf719`, `7bdbec5b`). Run-14 is on the build before it.
- **Task 2.3, plain words.** The check-in's own word guard never looked for management words, although the rulebook bans them and the checker counts them. Now, when Groundwork itself brings in "pipeline", "escalate", "deliverable", "bottleneck" and the like, the reply is asked for again once, with the sentence quoted and a plain way offered, for example "sales not yet closed" instead of "pipeline". A word the person used first is left alone.
- **Task 2.4, good news first.** Openings of later check-ins already start from what the person said last time: 12 of 14 on both run-12 and run-13. Now the opener is also given last time's good news, in the person's own words, and says it back first, plainly, with no praise.
- **For Hafsah: the bar for 2.3 may not be reachable without changing how we treat people's own words.** The bar is 10.5 jargon words in Groundwork's turns across a full run. Runs 12 and 13 had 26 and 35, and 13 and 22 of those were the person's own word handed back, mostly "pipeline" in sales. This change can only remove the other part. The conversation standard says "Use the words the team itself uses". If echoes should not count, the bar is already close. If they should, Groundwork would have to stop saying a word the person just used.

**Found while doing week 3, for Hafsah: the scenario runs do not test the path people actually use.** The runner sends each message through the plain route. The screen uses the streamed route. The streamed route runs the one-question rule and the closing fixes when a turn is saved. It does not run the second tries: asking again when a reply used a word we never use, a management word, or two questions the save cannot split. So what the checker measures is a little better than what a person gets. There are two ways to close this, and it is your call:
  1. Run those second tries after the stream finishes, and replace the text on screen, which the screen already does for the closing line. The person would sometimes see the reply change.
  2. Make the runner use the streamed route, so that the runs measure what people get.
  The second can be done now, without changing what anyone sees. I would do both, in that order.

**Week 3, measured live twice and kept** (sales, seniorhire and loans, 12:02 to 12:51).

| Sales, seniorhire and loans together | Run-12 | Run-13 | Run-14 | Week 3, first | Week 3, second |
| --- | --- | --- | --- | --- | --- |
| Jargon in Groundwork's turns | 17 | 20 | 19 | 21 | 15 |
| Proof asked for | 10 | 8 | 11 | 13 | 15 |
| Specific detail asked for | 31 | 30 | 46 | 36 | 46 |
| Blocker checked | 10 | 17 | 14 | 16 | 23 |
| Past words brought back | 34 | 32 | 33 | 28 | 28 |
| Commitments recorded | 31 | 44 | 30 | 29 | 25 |
| Turns that ask more than one question | 8 | 10 | 0 | 0 | 0 |

- **Jargon went down only a little, as expected.** The new check fired 9 times in the first set and made the reply plainer 3 times. Of the 21 jargon words left, 15 were the person's own word handed back, mostly "pipeline". That part is your decision, above.
- **"Past words brought back" was 28 in both sets.** That is inside the spread for these scenarios, 26 to 37 across eight earlier sets, and the openings still start from last time in 13 and 11 of 14 later check-ins. So I kept week 3, but I am telling you plainly that it came in at the low end both times. The next full run will show whether it holds.
- **A fault found in the openings, and fixed** (`8d86e0db`): "Since then, 5 of the 4 people involved in this check-in have submitted". It came from an older line that counted finished check-ins rather than people.
- **Nothing in the "problems in what people read" list came up.**

**Weeks 4 and 5 are built, and not yet measured live.**
- **Week 4, task 2.5, asking for proof kindly** (`a0449e5a`). When someone says a piece of work is done, such as "I submitted the last of the eleven on May 23rd", and nothing shows it yet, Groundwork asks once, kindly, for the smallest thing that would show it, and says what it is for: "A photo of the signed order is enough. Then it counts as proven." Offline on run-14 it would have come up in 17 of 87 check-ins, 6 of them ones that never asked for proof at all.
- **Week 4, task 2.8, never commenting on shorter answers** (`f46a4b42`). The prompt already forbids it, and no turn in seven runs did it. The remarks are now also on the list of phrases the check-in never writes, so a slip is rewritten rather than sent.
- **Week 5, task 2.6, suggested answers** (`e313b579`). Each question now comes with two to four short answers the person might give, such as "Sent it. They want to wait until after December." and "Not yet.". They are built only from the question and the person's own last answer. They are stored on the turn, so they survive a reload, which needs one new empty column. That migration is applied only to the local test database.

**What is next, in your order:** measure weeks 4 and 5 live, twice, then carry on with the weekly plan.

## 28 SEPTEMBER, EVENING: THE PRIVATE FILE AND THE HIDDEN TARGETS, CHECKED LIVE (`d5f0e840`)

**The live check found a fault the tests had missed, and it is fixed.**
- **How it was checked.** No scenario has either case, so I added both to run-16's sales check-in, through the product's own API, as the lead would:
  - Bisi, the lead, set targets for Kwame (17) and Femi (11), each private to that person.
  - She attached a private file, `bisi-q4-plan.txt`.
  - One line of her record named the file and both targets.
  - The report was then rebuilt with the real model, and I read the board and every report read as Bisi, Kwame, Femi and Ngozi.
- **The file held:** only Bisi, whose file it is, ever saw its name.
- **The targets did not:** Kwame, Femi and Ngozi could each read the others' numbers on the session report and the rounds. Two causes:
  - The check for hidden targets ran before labels were turned into names. So a line that still said "Participant B" hid nothing. Labels now become names first.
  - "Kwame has three so far. … A target of 17 approved facilities appears in the record…": the sentence with the number did not name him; the one before it did. A sentence now goes when it, or the one just before it, names the person. A sentence further away stays, so "the team has 11 approved facilities" is kept.
- **Live again after the fix:** Bisi reads every target she set. Kwame and Femi each read only their own, and Ngozi reads neither. Only Bisi reads the file's name.
- **Cleaned up afterwards:** the added targets, file and record line were removed, and the report was rebuilt without them.
- **All 10,537 API tests pass.** This joins the release: it fixes a problem the release has.
- **Next:** the weekly plan from week 1, in small tested steps.

## 28 SEPTEMBER, EVENING: NEVER AN EMAIL ADDRESS AS A NAME (`fdc1439b`)

- **Before:** a lead was shown the address of someone who had not given a name, in place of their name. The model then wrote it into sentences such as "Start with zawadi.u8@example.test."
- **Now:** nobody is ever shown an address as a name. A person with no name is "a colleague", or "another colleague", as everywhere else. I also fixed four places that fell back to the address in words people read.
- **Text already stored with an address in it** is read once more when it is served, and the address becomes the name or the plain words.
- **Checked live** on run-16's seniorhire check-in: a stored "Start with <Tobi's address>." reads "Start with Tobi Adewale." to the lead and to Tobi. The stored report was put back exactly afterwards.
- **One thing to know:** a lead still sees an address where the screens list it beside a person, so they can tell who is who. It is never used in place of a name.
- **Next:** a live check of the private file and hidden-target fixes, with a scenario that has both.

## 28 SEPTEMBER, EVENING: RUN-16 PASSED, AND THE RELEASE CANDIDATE IS `6fe8d1fb`

- **Run-16 passes the checker: nothing is worse than the baseline.** It was the full run on the streamed route, with every fix in.
  - All 24 scenarios ran and no check-in broke; the stream's fallback caught 7 slow or busy moments.
  - "Proof asked for" is 38 against 42, inside the allowance. It was 52 on the broken run-15, so it moves a lot between runs.
  - No turn asks two questions. Every problem count is 0. All 576 quotes are word for word.
  - None of the lead's private words reached anyone, for the sixth full run in a row.
- **Task 1.5, the judgements: 20 right of the 22 that could be tested, 91%.**
  - Not right: contractreview, which assumes the contract promises a four-hour fix when the point is that the two of them read it differently, and handover, which names the payment arrangement but misses the spreadsheet on her own drive.
  - Close calls I counted as right: crisis (it lands on the on-call process, but does not name the stale rota), recognition (it names Victor, but only as its last thing to do) and pulse (it names the lead as the one holding the approvals).
  - Could not be tested: shock, where nobody mentions the missed QBRs. Sales was flagged incomplete.
  - **Task 1.5 is ticked.** Hafsah decided run-15 does not count, because it broke on a product fault now fixed. Run-14 had exactly 20 testable scenarios, so run-14 (18 of 20, 90%) and run-16 (20 of 22, 91%) are two in a row.
- **The internal-label fix, checked live after the run, found one more route:** labels used as keys in three maps of the report. Fixed (`6fe8d1fb`). Then 85 live reads, none with a label.
- **The release candidate is `6fe8d1fb`,** written into `docs/ready-to-deploy.md` with what it rests on. From here, nothing more joins the release unless it fixes a problem the release has.
- **The screens branch is merged** (`f0168cff`), as Hafsah decided, and will be merged every few days from now on. `6fe8d1fb` stays in `docs/ready-to-deploy.md` as a known-good point. The final proof is one full run on the combined code at release.
  - **On the combined code:** all 10,533 API tests pass once one label was changed to the prototype's words, "How checkable today’s check-in was" (screens request 62, which Hafsah had answered).
  - **The client passes 3,403 of 3,407.** One failure is the "Jump to" test, as all day. The other three are the screens workspace's own tests of files they are rebuilding: an unused component (`GroundTabRow.tsx`), a heading style, and a page layout. The merge changed no client file of the engine's, so they fail on the screens branch as it stands. I have told them.

## 28 SEPTEMBER, LATE AFTERNOON: NO INTERNAL LABEL REACHES ANYONE (`0bad62f2`)

- **The routes it took:** several fields of the session report, and the shared picture in the rounds, were written after the step that swaps labels for names, so they kept "Participant A" and "the initiator". A lead and participants read them on the session report and on "How this has moved".
- **Now every board and report read ends in one last step:** the board, the report, a session's report, the rounds, and where things stand against success. Any label left anywhere becomes the name this reader may see, or "a colleague" where they may not. A field added later is covered too, because it is served through the same step.
- **"You is aiming" and "until you sends it" are mended there as well,** only outside quotation marks, so people's own words stay as they wrote them.
- **Proven by a test** that serves the board and every report read to the lead, each participant and an admin who only reads, with people named to each other and not, and finds no label anywhere.
- Also fixed: dates that arrived on the screen as an empty object (request 53).
- **Not live yet:** run-16 is running on the build before this. It fixes a problem the release has, so it joins the release.

## 28 SEPTEMBER, AFTERNOON: RUN-15 DID NOT PASS, AND WHY

**Run-15 was the first full run on the streamed route (13:32 to 15:25, on `75b4d687`). It cannot be the release candidate.**
- **It found a real fault in the streamed route, and that is why it failed.** In 8 of the 24 scenarios one person's check-in stopped part-way, on "The reply could not be finished. Send that again." The model's stream did not open within 20 seconds (6 times), the network call failed (twice), or the model said it was too busy (once). The plain route's model call tries again on exactly these; the stream's did not. No earlier run saw it, because the runner used the plain route. People using the screen would have.
- **Fixed** (`4d91d5ec`): when the stream fails, the reply is asked for again the plain way, with its retries, and shown whole. The person sees the error only if that fails too.
- **Because of it,** 8 reports were one person short and flagged incomplete: renewal, discovery, loans, project, recognition, crisis, board and shock. So too few judgements could be tested for task 1.5. And one scenario, openread, could not be set up: adding a person took 6.8 seconds against a 5-second database limit while three parts of the run went at once. That is load on this computer, but I have added it to the questions for Abubakar, since a busy server could hit the same limit.
- **What run-15 still shows:**
  - **"Proof asked for" is back above the baseline: 52, against 42.** Week 4 works.
  - No turn asks two questions, every problem count is 0, and all 428 quotes are word for word.
  - None of the lead's private words reached anyone, for the fifth full run in a row.
  - Jargon in Groundwork's turns is 17 by the checker's count.
  - The checker fails it on specific detail (75 against 88), blocker checked (31 against 37), agreements (50 against 56) and patterns (84 against 100). All of those are counted from the check-ins and reports that broke, and openread is missing entirely, so they cannot be read yet.
- **Next: run-16, on a build with every fix,** the stream fallback and the privacy fixes from this afternoon included. It decides the release candidate.

## 28 SEPTEMBER, AFTERNOON: A PRIVATE FILE'S NAME AND A HIDDEN TARGET, ON THE BOARD (`7afee54e`)

- **Who could see each, before this:**
  - A lead's own file name reached anyone who read a board or report line that mentioned it: participants, and an admin who only reads. The fix this morning cleaned what reports are written from, but not every sentence served.
  - A person's target number reached anyone reading a sentence that stated it: an admin who only reads, in the row about that person, and other participants, in their report and in the aim on their board.
  - **A correction to my correction.** At first I called Ngozi seeing "Kwame Mensah is working towards a target of 14 approved facilities" a leak. Checked against the database, it is not. The sales check-in has no per-person targets set by the lead, only team targets. Kwame said his own target in his own check-in ("I'm aiming for 14 approved facilities"), and your rules let the people in a check-in see what each of them said in it. So the new rule has nothing to hide there. It does hide targets the lead sets for each person, which the test proves.
  - **For Hafsah:** should a number a person states as their own target in their check-in be treated like a target the lead set, and kept from colleagues when targets are each person's own? Today it is treated as their words, which colleagues in the same check-in may read.
- **Now:** everything the board and the report send is read once more for each reader. A file's name comes out where that reader may not open the file; a lead's own file is not named even to an admin. A sentence giving someone's target comes out where that reader may not see it. The lead still reads both.
- **Proven by a test** that serves the real board and report to the lead, the person whose target it is, another participant, and an admin who only reads.
- **It errs on the side of hiding.** A sentence that names a person together with their target's number goes, even if the number counts something else. A fact lost from a line is better than a target shown.
- **The wording requests are fixed too:** "Unblock: the discount decision" is now "Somebody is waiting on the discount decision, so it needs deciding." The head count counts the same people as the screens' header, and is all in words or all in figures: "Four of the six people have answered so far."
- **Not live yet:** the local API keeps its build until run-15 ends, so this is proven by tests for now. It fixes a problem the release has, so it joins the release.

**Four more privacy requests from the screens workspace, for Hafsah:**
- **Request 49: may someone held for a seat read a check-in's report?** Faraji joined through an open link while no seat was free. He is waiting for an admin to let him into the organisation. The check-in itself refuses him, but the report did not. Should he be refused until he is let in, or until he has answered himself?
- **Request 57: may any admin release a report, or only the lead?** Today any admin of the organisation can. The screens tell other admins that "sharing the report and ending the check-in are Rukia's to decide".
- **Requests 51 and 52 are fixed** (`ef212298`), because they broke rules already written. Before the report is released, a session's report now waits until the participant has answered that session, as the main report does. And one more rating field (`parties[].confidence`) no longer reaches other participants.

## 28 SEPTEMBER, AFTERNOON: THE PER-PERSON RATINGS, FOR HAFSAH TO DECIDE

**None of the engine's per-person ratings is shown to a lead or an admin in the prototype, except "Nothing checkable".** Four have something close on a lead's screen, but it is a different kind of thing. Until you decide, decision 38 stays: these are not sent to a lead or an admin, except as decision 40 says.

| Rating the engine makes | Does the prototype show it to a lead? | To an admin? | What the prototype shows instead, in its words |
| --- | --- | --- | --- |
| How specific each person's account was: high, moderate or low | No | No | One sentence in the weekly report, not a label: "Aisha and Miriam consistently get to specific customer needs and next steps." |
| Notes on each part of a person's account, such as "vague on evidence in session 8" | No | No | A pattern named after it comes up again and again, on the lead's board: "Visits without the shop's name, for 2 weeks in a row". |
| The cause of low or high specificity | No | No | Nothing. The ending screen names causes of outcomes ("Nobody set it up", "Improved after feedback"), not of how specific someone was. |
| How sure the picture of each person is | No | No | One level for the whole report: "How much this report can rely on: medium." |
| Whether a person's account rests on memory | Not per person | No | A mark on each line: "Proven", "Confirmed by the person who received it", "Only someone's word", "From memory only". |
| A closing tier for each person, such as MIXED or STRONG | No | No | A suggestion with its counts: "Groundwork suggests keeping Kwame on". The admin's review screen says "No scores." |
| How checkable one check-in's answers were | Only as "Nothing checkable" beside the name (decision 40) | No | The person sees their own: "How checkable today's check-in was, 4 of 5. This is about the check-in. Only you see it." |

**Other labels the prototype shows a lead beside a person's name**, none of them to an admin: "Drifting" (check-ins missed), "Behind the pace" and "On pace" (a count against the target), "Stops before the date" and "Stuck on a dependency" (patterns), and counts such as "8 of 9 commitments kept this month". The lead's setup screen also has a "Check-in grades" switch, turned off for some situations: "Check-in grades would feel like a judgement on the person here, so they stay off."

**So the choice is mostly whether any of these report ratings should reach the lead in some form.** The prototype's answer, read literally, is no: it shows patterns, marks on lines and counts, never a per-person rating.

**Hafsah decided (decision 43): keep decision 38, and follow the prototype.** The lead and admins get only the prototype's plain forms. Whether the engine produces each today:

| The plain form | Does the engine produce it today? |
| --- | --- |
| "Nothing checkable" beside the name, with what to ask next | **Yes**, since `01379c6e` this afternoon. |
| One level for how much the whole report can rely on | **Yes.** The session report carries "how much there is to go on", and the released report carries a band of strong, moderate or thin. The prototype's words are "How much this report can rely on: medium", so the screens should say it that way. |
| The pattern, once it keeps coming up | **Built, and switched off** until you approve the plain names (week 8). |
| The mark on each line: proven, confirmed, only their word, from memory | **Only in part.** Lines with a figure are marked "counted", "estimated" or "from memory". There is no mark on every line, and "confirmed by the person who received it" does not exist yet. Now in the plan as week 6b, after week 6 adds the field. |
| The suggestion with its counts | **No.** Nothing reaches a suggestion yet (weeks 9 to 11, which need your thresholds). |
| The sentence in the weekly report | **No.** There is no weekly report yet. Now in the plan as week 12b. |

None of the missing ones joins the release. They are in `docs/weekly-plan.md`.

**Run-15 is running on the streamed route, with the safety net fixed.** Checked against the build rather than from memory. The runner's log for run-15 says "Messages go through the streamed route." The API it talks to was built at 13:22, a minute after the fix (`e9301d42`), and the built code has it in. During the run, the log shows the streamed route asking the model again for management words, banned words and replies that ask two questions.

## AT THE TOP, 28 SEPTEMBER: IS IT READY TO DEPLOY?

*This section is kept up to date through the night. It was started at 00:36. The work stops at 05:36.*

**Is the engine ready to deploy? Yes, on the engine's side.** All seven deploy blockers are fixed, with tests, and proven on two full runs of all 24 scenarios, run-12 and run-13.
- On both runs every problem count in the scorer is 0, which meets task 1.6.
- No board or report carries a pattern.
- No invited person read any of the lead's private words.
- On run-13, every one of the 799 quotes served was word for word in the record.
- The checker passes run-13 with nothing worse than the baseline. It failed run-12 on three conversation numbers, and re-running the same build showed that was variation.

What is left before release is not the engine: it is the steps below, which need Abubakar and Hafsah. The judgement, task 1.5, is not yet at Hafsah's bar. Run-12 was 90% and run-13 was 81%, and the bar is two runs in a row at 90%. Hafsah decided the aim is deployment, with the judgement improving every week after.

**The last hour, 04:36 to 05:15:**
- Week 2 was measured live, twice, and kept. No turn asks two questions any more. One number to watch is below.
- A privacy fix: a participant was sent other people's ratings on a report still being put together. That is fixed, with a test.
- One privacy question is for Hafsah: the code sends the lead everyone's ratings on purpose, and CLAUDE.md says it must not. It is the first item under "What needs Hafsah".
- The screens workspace's newest work is merged in, and every API test passes on the merged code.

**Run-13's results, tonight's second full run, on `e7b9cd65`, read against the database and the actual sentences:**
- **The checker says nothing is worse than the baseline.** "Blocker checked" is back up to 42, and "specific detail asked for" to 85. That confirms run-12's low numbers were variation.
- **Every problem count in the scorer is 0 again,** so task 1.6's bar holds on two full runs in a row.
- **Quotes:** 799 of 799 served are word for word in the record, including the lines built when a page is opened.
- **Patterns:** none on any board or report.
- **The lead's private words:** none reached any invited person. The one match was Tobi's own words, "My role is to manage the relationships with our five largest clients". That is three full runs in a row with none.
- **Jargon in reports and boards rose to 180,** still far below the baseline of 511. It is mostly "pipeline" in sales and "bottleneck" in openread, which are the people's own words.
- **The judgements: 17 clearly right of the 21 that count, which is 81%.**
  - **Loans is clearly right for the first time:** "the problem is the loan program itself, which expects repayments before a new business can earn anything".
  - **Crisis** was flagged incomplete at five minutes. Its captured report holds all 3 findings and would count as right, but under the rule I have used every night I have left it out.
  - **Couldn't be tested:** advisor and shock again. Week 1 was in this run, but in both scenarios the simulated person still never said the fact.
  - **Not right:**
    - project: it says the team is blocked, not that they disagree on scope;
    - realign: it says one of the two directions came from the lead;
    - sales: Kwame's miscount again;
    - snapshot: the lead's own signature appears only as "follow up with Ravi".
- **So task 1.5 is not met.** Run-12 met Hafsah's bar, with 18 of 20, which is 90%. Run-13 did not, with 17 of 21, which is 81%. The bar needs two runs in a row.

**Run-12's results, read against the database and the actual sentences:**
- **The run is sound.** All 24 scenarios finished. Two reports were incomplete (implementation and newmanager, 2 findings for 3 people each), and those two are left out.
- **Task 1.6 is met: every problem count in the scorer is 0 across all 24 scenarios.** On run-10 there were 114 internal labels, 36 role descriptions used as a name, and 2 sentences starting in lower case.
- **Patterns:** no board or report served in the whole run carries one.
- **The lead's private words:** none reached any invited person. The check matched 4 people, and each match was that person's own words: Yemi said "I'm the account manager for the relationship" himself, for example. That makes two full runs in a row with none.
- **Quotes:** 479 of 482 were word for word in the record. The 3 that were not are all in lines built when the page is opened, which the quote check did not yet cover. That is now fixed (`4efa6a74`), with two more fixes behind it (`d1c35b87`, `6331337b`). Replayed over run-12, it is 480 of 480.
- **The judgements: 18 clearly right of the 20 that count, which is exactly 90%.** Advisor and shock could not be tested: Peter never mentions the other two banks, and nobody says first-hand that the reviews were missed. Loans and sales were not right. **Run-12 meets Hafsah's bar for task 1.5 on its own**, with at least 20 testable and at least 90% right. The bar needs two full runs in a row, and run-10 did not meet it, so the next full run decides task 1.5.
- **But the checker fails run-12 on the conversation.**
  - "Specific detail asked for" was 71, against a baseline of 88.
  - "Blocker checked" was 24, against 37.
  - "Turns asking more than one question" was 39, against 37.

  These count phrases in Groundwork's turns, such as "by when", "which" and "what have you tried".
- **The answer: variation between runs, not a change of mine.** I re-ran sales and seniorhire, the two scenarios that lost the most, twice on exactly run-12's build.

  | | Blocker checked, sales | Blocker checked, seniorhire | Specific detail, sales | Specific detail, seniorhire |
  | --- | --- | --- | --- | --- |
  | Runs 8, 9 and 10 | 10, 10, 15 | 2, 4, 7 | 21, 27, 27 | 9, 13, 8 |
  | Run-12 | 7 | 2 | 22 | 4 |
  | Same build, run again | 13 and 8 | 6 and 3 | 28 and 18 | 14 and 12 |

  On exactly the same code they came back into the usual range. So run-12 was a low draw, and there is nothing to drop. **Run-13, tonight's second full run, started at 03:10 on `e7b9cd65`.** It is the second of the two runs task 1.5's bar needs, and it also measures week 1 on advisor and shock.

**Run-11 does not count, and the product was not at fault.** I started it at about midnight, before tonight's five hours began, from a separate copy of the code, so that the builders' work could not change it halfway through. But the runner starts the model itself, to play the simulated people, and that copy did not have the model's credentials file, which is kept out of git. So every simulated person's answer failed. No check-in could finish, and no report was written: all 25 reports were empty. I found it by reading the log, stopped it, and started run-12 from the main folder, where the credentials are.

**What still blocks it:**
1. Run-11 must show that task 1.6 and the blocker fixes hold across all 24 scenarios: nothing worse than the baseline, every quote from the record, and none of a lead's private words reaching anyone.
2. The steps before release in `docs/ready-to-deploy.md`, which need Abubakar and Hafsah: the migrations with a backup, the one-off script that marks which record lines are people's own words, merging with the screens branch, and full tests on the combined code.

**What I finished tonight** (the list grows as I go):
- Item 2, the evidence for verdicts, requests through chat and being away, was done last night. It is in the section "The three capabilities I rated missing" below, and in `docs/capability-check.md`.
- Item 3, `docs/weekly-plan.md`, was done last night.
- **Item 5, the lead confirms the exact question (decision 34), is built on the engine side** (`5f30dde3`, `be5e9d78`, `d6d00a44`, `f1eb3fb2`).
  - **What the lead sees:** when the lead sets a question for a person, Groundwork writes it once, exactly as it will ask it. The lead reads, for example, `Groundwork will ask Ngozi: "Have you sent the Client B proposal?"`, and confirms it, changes its words or leaves it out, one question at a time.
  - **Only a confirmed question reaches the person's session, and it is asked word for word.** If the model rewords it, the product puts the confirmed words back before the turn is saved.
  - **What the question is written from:** only the person's first name and the lead's question, never the lead's private notes or their description of the person. Code checks the draft, and falls back to the lead's own words if the draft fails.
  - **Old questions:** questions set before today are not asked until the lead confirms them. They are shown to the lead as waiting.
  - **The new database column** is a migration applied only to the local test database.
  - **Proven by 29 tests**, not by a scenario run: no scenario sets a question through the context chat.
  - **For the screens workspace:** what it needs is written in `docs/answers-from-engine.md`, including the card with Confirm, Edit and Not now.
- **Item 6, guests use Ask Groundwork within their own check-in (decision 36), is built** (`d2a97ffe`).
  - **What a guest can ask:** what was agreed, what is stuck, what they said they would do, when their next check-in is, and what the report says. The answers are built only from reads that already show that guest just their own check-in, with a second list of allowed fields in code.
  - **What it never does:** it is never added to the host's list of people, never reads another check-in, the lead's judgement or a colleague's report, and never writes anything in the host organisation.
  - **The replies are written by rules, not by the model.** Anything else gets a plain refusal.
  - **For Hafsah:** an older piece of code matches check-in answers to the host's list of people by email. If a guest's email is also on an unclaimed entry in the host's list, their check-in words could be credited to that entry. That was true before tonight, and it is not fixed yet.
- **Item 7, week 1 of the weekly plan, is built, and not yet measured** (`020260e4`, `3fb7edf9`).
  - **The check-in now asks for what someone left out.** When a person speaks to only part of a set the lead named, the model is told, as context for its next question, which ones they left out. For example: "Grace named three: Equity, KCB and Co-op Bank. Peter has spoken about Equity only. Ask directly about the other two…". The same goes when a person describes something that happened without saying when.
  - **It asks each only once**, and takes "I can't" as an answer.
  - **It never asks again a question the person already answered**, not only the last one. Across three past runs this would have caught seven real repeats.
  - **No stored prompt changed.** It is context built in code.
  - **For Hafsah:** to find the set, a participant's session may now use the item names from the lead's own check-in words, such as the three bank names. It never uses the lead's sentence, and never people's names. It is used only on shared check-ins where people see each other. This rests on decision 4, but it is new, and the gate is one line if you want it narrower.
  - **Measuring it:** advisor and shock, twice each, after run-12.
- **Week 2 of the weekly plan (tasks 2.1 and 2.2) is built, and measured offline, not yet live** (`6f8e7036`, `91e3dc73`, `504f7271`, `5d65a68b`).
  - **One question per turn.** The gate that found a second question only logged it; a setting from 17 September had switched off the removal. Now every way a turn is saved keeps one question. It keeps the product's own question first, then the question that asks for a specific detail, a blocker or proof, then the first. An example written as a question stays as a statement.
    - Offline over runs 8, 9, 10 and 12, turns asking more than one question go from 132 to 0.
    - The first version lost too many detail and blocker questions, so the rule was changed. Now the checker's counts fall by at most 2 in any run, which is inside its allowance.
  - **The lead's name.** In turns to a participant, "your lead", "the lead" and "the person who opened this check-in for you, Michael Achebe" now become the lead's first name, for example "This record goes to Amaka." A sales lead and "take the lead" are left alone. Offline, 24 turns change.
  - **For Hafsah:**
    - When the product's closing line goes under a model question, the model's question is dropped so that the closing line is never lost. The other choice, holding the closing line for a later turn, would have lost it in more than a third of the cases seen.
    - "Your manager" is not changed, because it is often a person's own manager, who is not always the lead.
    - A few scenario packs in the database script two questions in one line, such as "How are you carrying this? What is the worry underneath it?". The code now repairs them when a turn is saved, but the real fix is in the packs, and those are yours to switch on (decision 20).
  - **Measured live, and kept:** sales and seniorhire, twice each, on the newest build, finished at 05:11.

    | Sales and seniorhire together | Runs before week 2 (run-12, run-13, and two re-runs) | Week 2, first pair | Week 2, second pair |
    | --- | --- | --- | --- |
    | Turns that ask more than one question | 5, 6, 5, 10 | **0** | **0** |
    | Proof asked for | 9, 5, 10, 9 | 5 | 5 |
    | Specific detail asked for | 26, 28, 42, 30 | 29 | 41 |
    | Blocker checked | 9, 16, 19, 11 | 11 | 15 |
    | Past words brought back | 34, 32, 37, 26 | 27 | 36 |
    | Commitments recorded | 31, 42, 46, 20 | 29 | 35 |

    - No turn asks two questions now, in either pair. Every other number is inside the range of the four runs before week 2, so I have kept week 2.
    - **One number to watch:** proof asked for was 5 both times, the bottom of the earlier range. The next full run will show whether week 2 lowered it. If it did, the rule that picks which question stays should put the proof question first.
    - Nothing in the "problems in what people read" list came up in either pair.
    - The lead's name reads naturally, for example "Who arranged for you to be in these meetings with Amina?".
    - **One new problem, once in 186 turns:** the model's closing sentence stayed in front of the product's last question. Tobi read "This check-in will continue in two weeks." and then "One more before this closes." in the same turn. It never happened in the four runs before, and not in the second pair. The fix is to drop the model's closing sentence when the product's last question is added. I have not built it, because there was not enough time left tonight to re-run it twice.
- **The screens workspace's newest work is merged in** (`338c4dbe`, 21 commits). The one conflict was in the import lines of `grounds.service.ts`, and I kept what both sides use. It brought no migrations. The one privacy test it changed only gained a constructor argument, and its checks are the same.
- **Every test, at 05:09, on the merged code.** All 10,408 API tests pass. The client passes 3,215 of 3,217. The two that fail are the screens workspace's sidebar tests, as before.
- **Every test, at 04:45 on `f75afe50`.** All 10,399 API tests pass. The client passes 3,195 of 3,198. The three that fail are the screens workspace's sidebar tests, which depend on the date or the time, not on engine code. The client's plain-wording check had caught one engine line joined with a colon. I rewrote it as two full sentences, and it passes now (`f75afe50`). One older test pinned the old form of the record-line code, and I updated it to pin the same rule (`cc0fb346`).
- **A privacy fix from the screens workspace's request 43** (`59a62cc3`). On a report still being put together, a participant who had already answered was served every other person's rating: how specific each person's answers were, and how sure the picture of them was. The released report already took these out, and this one did not. Now it does, and a test checks that every place a report is served takes them out. The screen never showed these, but the backend sent them.
- Item 4, where the existing 16 decisions disagree with the new ones, was done last night. It is in the section "Where the existing 16 decisions disagree with the new 14" below, and the list still stands for the new decisions 31 to 37.

**What needs Hafsah:**
- ~~A privacy decision on ratings.~~ **Decided by Hafsah and done on 28 September.** See the day section at the top.
- **Approve the 49 plain pattern names** in `docs/pattern-names.md`, and settle B5's name. Patterns stay switched off until then. Also approve the three-day and one-week windows before a lead sees a person's pattern.
- **Replace `docs/decisions.md` with `docs/decisions-merged.md`.** The file is protected; the step is below.
- **The thresholds for verdicts, and who counts as a person's lead for approvals.** Decision 33 says these are decided when that work starts: weeks 10, 11 and 21 of the weekly plan.
- **The questions for Abubakar**, in `docs/ready-to-deploy.md`:
  - How is the API hosted and released?
  - How do migrations reach staging and live, and is a backup taken first?
  - Four of the 45 migrations change or remove existing data. The document lists each one.
  - Hafsah's earlier pull request should be merged first.
  - Who runs the one-off script that marks people's own words, and when?

## The three capabilities I rated "missing": the evidence, for Hafsah to decide

**Nothing is hidden.** For each one, this is what the prototype shows it doing, exactly what was tried live on the local test database on 27 September, what happened, where the code is, and which parts already work. The full detail is in `docs/capability-check.md`, sections 4, 10 and 11.

**In short, "missing" is not the right word for all of it.** In all three, most of the parts are built. What is missing is the step that connects them to what a person actually does. In verdicts, nothing ever creates a suggestion. In requests, nothing takes a request from chat. In being away, nothing tells the engine who is away.

### Verdicts, suggestions and appeals

**What the prototype shows.** On Daniel's board, the lead reads "Groundwork suggests a performance plan for Daniel". Then: "Why: In the last 4 weeks, Daniel kept 11 of his 20 commitments", "What would change this: Keeping 8 in 10…", Daniel's own answer, and "This is only a suggestion. You decide, and Daniel sees your reasons", with Agree and Choose something else (`C3-suggestions-and-appeals/suggestion-daniel.txt`). Daniel's own page says "Where you stand… Wairimu has not decided anything yet… Add my side" (`what-daniel-sees.txt`). The ending page suggests "keeping Kwame on" (`suggestion-kwame.txt`). A review suggests recognising Aisha's work (`suggestion-aisha-in-review.txt`).

**What was tried, and what happened:**
- As the lead, Tunde, opening the suggestions for his check-in (`GET /grounds/…/suggestions`) returned an empty list.
- As Ngozi, a participant, the same route returned the same empty list.
- As Tunde, opening the appeals was refused: "Only an admin of this organisation decides an appeal." That is right.
- As an admin, the appeals list was empty.
- As Ngozi, her You page (`GET /you`) had no "Where you stand".
- The `suggestions` table has 0 rows.
- All 1,040 recorded commitments have the status "unknown". So "kept 11 of 20" cannot be counted for anybody.
- The performance reviews suite is off, and when on, its list of reviews due can only be filled by an outside system.

**Where the code is.** `api/src/modules/suggestions/` holds the service, the controller and `a-suggestion-told-like-a-signal.ts`. These were built by the screens workspace. The reviews are in `api/src/modules/suites/the-reviews.service.ts`. The ending page is in `api/src/modules/resolution/`.

**What works:**
- A suggestion, once one exists, is shown to each reader in the right shape. The lead gets the headline, why, what would change it, the person's answer and the choices. The person gets the facts and the decision, and can add their side and appeal. An admin decides appeals.
- The verdict word itself, such as "plan", is never shown to anyone. Labels such as "PIP" and "at risk" are refused when the text is stored.
- The ending page works: the lead chooses how it ends and gives a reason, and the person reads it.
- The lead's judgement, which is not the same thing as a verdict, works and is often right. For the performance-plan scenario it says the target was never written down, which is the right answer.

**What does not work yet:**
- Nothing in the engine ever creates a suggestion.
- Nothing marks a commitment as kept or missed, so the number a verdict would rest on does not exist.
- There are no thresholds yet. Hafsah has decided those come later, when this work starts.

### Requests through chat: leave, spending and hours

**What the prototype shows.** "I need next Thursday and Friday off." Groundwork answers: "You have 16 days left and nobody else in Sales is off then. Shall I send it to Wairimu?" (`E-suites/suite-leave.txt`). "Can I spend KES 18,000 on fuel…" is checked against the budget and the rules and sent to the right approver (`suite-spend.txt`). "I spent 3 hours at Naivas Ngong Road today…" becomes "Written down: 3 hours on Naivas Ngong Road, 1 hour on Lakeside. Is that right?" (`suite-time.txt`). "Nobody fills in a form."

**What was tried, and what happened**, in Ask Groundwork as Ngozi:
- "I need leave from 12 to 16 October", "Can I spend 45,000 on a laptop?", "Log 6 hours on Atlas today" and "Book me off Monday" all got "I cannot answer that one yet". Nothing was written.
- "I will be on holiday next week so I cannot check in" was offered as "Shall I note that down". After a yes, it became an open commitment, a promise to be followed up in her next check-in as if it were work.
- In the check-in, Tunde wrote "Also, I need leave from 12 to 16 October, and can I spend 45,000 on a laptop? I did 6 hours on Atlas today." The reply ignored all three and asked about something else.

**Where the code is.** `api/src/modules/suites/`: the leave board, spending and time sheets services, and `who-approves.ts`. The functions that would record a request are there: `LeaveBoardService.ask`, `SpendingService.check` and `.ask`, and `TimeSheetsService.record`. The screens workspace built them, and asked the engine to connect them in its requests 21, 22 and 26, which are still open.

**What works, tried live through the suite's own service:**
- A leave request for Yemi was recorded, waited on the admin's board, and showed under "who is off" once approved.
- Her days left were worked out correctly from the approved days: 10 of 20.
- The approval rules, who else is off, the budgets, the privacy walls for each reader, and hours kept for billing only all work.

**What does not work yet:**
- Nothing in chat, the check-in or WhatsApp creates a request.
- Nobody is told a request is waiting.
- Only the organisation role LEAD can approve, which most organisations do not use.

### Being away

**What the prototype shows.** People on leave appear under "who is off" on the leave board, and a person's days left are shown to them (`E-suites/suite-leave.txt`). Hafsah's decision 31 says the engine may know the dates of approved leave, dates only. The engine's own rule says time on leave is paused and never counted against anyone.

**What was tried, and what happened:**
- I approved leave for Yemi covering today, and read the lead's board and Today before and after.
- The board still listed her first as "Yemi Adeyinka has not checked in for this round yet".
- Today still counted her among "6 people haven't yet".
- Her leave dates on the check-in were still empty.
- From the code, not run: the "your next check-in is open" email, the reminders on day 3, 7 and 14, the "you have missed 3 check-ins" email, and the lead's email naming who has not started all go to someone on leave.

**Where the code is:**
- `api/src/modules/conversation/participation-timeline.ts` holds the rule for leave: paused, never counted. It is tested in `absence-is-not-a-signal.spec.ts`.
- The dates have a place, `ground_participants.leave_periods`.
- Approved leave lives in the leave suite (`api/src/modules/suites/the-leave-board.service.ts`).

**What works:**
- The rule is written and tested.
- Coaching already uses it, and does not coach someone who is on leave.
- The leave suite records and approves leave correctly.
- Patterns and the judgement are not affected by a missed round, because they read what people said, not missed rounds.

**What does not work yet:**
- Nothing writes the leave dates where the engine reads them. A test today stops anything outside the suites from reading leave requests, and decision 31 now allows the dates to be copied across.
- So the board, the round count, the reminders and the emails still treat someone on leave as missing.


## 27 SEPTEMBER, NIGHT: THE CAPABILITY CHECK AND THE DEPLOY BLOCKERS

- **The capability check is in `docs/capability-check.md`.** Eleven capabilities were tried live. Eight partly work and three are missing. The work is after deployment, except for the blockers below.
- **Seven deploy blockers, all being fixed, one builder after another.** The full list, and whether each is fixed, is in `docs/ready-to-deploy.md`. Blockers 1 to 3 are the patterns, which are being switched off on every board for every reader. Blocker 4 is bank details. Blocker 5 is a lead's private notes in a person's own session. Blocker 6 is Ask Groundwork, which you decided must work before deployment. Blocker 7 is the board crash for a participant when colleagues are hidden.
- **Hafsah's three new decisions are added to `docs/decisions-merged.md`** as decisions 31 to 33:
  - the engine may know the dates of approved leave, dates only;
  - a lead's private notes never reach the model in that person's own session;
  - who counts as a person's lead for approvals, and the thresholds for verdicts, are decided when that work starts.
- **Ask Groundwork in the live code.** The live code (`be8b48d9`) has no Ask Groundwork for signed-in users at all. The assistant is reached only through a customer's embedded panel or WhatsApp, and only for people on the organisation's connected list. The fix being built changes one file. It finds, claims or creates the person's entry when they ask. Claiming matches only on a confirmed email address, and never across organisations. If a switched-off entry exists, it refuses.
- **All seven blockers are fixed in code, with tests** (`b959934a`, `e12cf225`, `6feccb79`, `c6721519`, `75174e28`, `8e940c9c`). A further privacy gap, colleagues' names on a board where people are hidden from each other, was found and closed along the way. Every API test passes: 10,220 of 10,220. Ask Groundwork was tried live: a user with no entry on the list got a real answer, and exactly one entry was made for him. That try left one new entry, and his question and answer, in the local test database. None of this is proven on a full scenario run yet. That is tomorrow's first run.
- **The checkers' test data is cleaned up,** in one transaction, in the local test database only.
  - 149 rows were deleted, all in the Meridian test organisation, in the window the checkers worked.
  - Two sessions the checkers had started, which existed before them, were put back to "not started".
  - The three test users have their original seed passwords back, not "test", and their saved sign-in tokens are cancelled. Signing in with "test" is refused for all three.

## 27 SEPTEMBER, EVENING: THE AIM IS NOW DEPLOYMENT

**Your change of direction, recorded.** The aim now is deployment, not reaching task 1.5's bar. I have stopped working on the judgements to reach it. These are the only things left before deployment:
1. The four items below.
2. In sales, a judgement must never praise a claim the material shows is wrong.
3. Task 1.6, the automatic check on the text each reader sees, including titles such as "Dr".
4. `docs/ready-to-deploy.md`.

Everything else, phase 2 included, waits until after deployment.

### Sales: a judgement never praises a claim the record's own numbers contradict

- **`6628e6b6` and `7d5c36dc`: a check in code, not in the prompt,** because a prompt line had already lost on this scenario. Before the judgement is stored, every section of it is checked, along with each person's finding, the opening and the picture. The check holds back three kinds of sentence:
  - a move that praises someone for reaching a figure;
  - a claim that someone exceeded, beat, met or is ahead of a target, where no figure in the record, in the target's own unit, reaches it;
  - a figure called approved, completed or successful where the record says otherwise.

  A figure in a different unit never counts. 22 in the pipeline, or 22 applications, does not meet a target of 14 approved facilities. Nothing is written in place of what is held back, and no field is left blank.
- **On run-8's stored judgement it holds back exactly three lines**, all about Kwame and all contradicted by his record of three approved and 22 applications. For example: "Ask Participant C how they achieved 22 approved facilities when their target was 14."
- **Tested live on two sales runs.** Neither judgement praises Kwame. The first run's finding is exactly right: "Kwame has 22 applications, of which three have been approved and disbursed for N8 million."
- **The live test caught the check being too eager, fixed in `2d1610ec`.** It had held back statements of goals, such as "Participant B is working to achieve 14 approved facilities" and "The initiator's goal is 40 approved facilities". It had also held back one true sentence, "Participant C has three approvals". A goal is not a claim, and a figure the record supports is never held back. On the two new runs it now holds back nothing, and on run-8 it holds back only the three Kwame lines.
- **Not yet run live on `2d1610ec` itself.** That happens with task 1.6's test runs, so that one build carries both.

### Task 1.6: the automatic check on the text each reader sees

**Built, and not yet proven on a full run.** Today's two full runs were used before it was finished. The first full run tomorrow is its test.

**The fixes at the source, one commit each:**
- **`eb997d7a`: labels.** Each finding carried a raw field, `"label": "the initiator"` or `"label": "Participant A"`. That was 113 of the 114 "internal labels shown". No screen displays it, so it is no longer served, but it stays in storage.
- **`2ebe9127`: "the person who set this up".** Groundwork had said to Mei, "Mei, the person who set this up wants to understand…". The conversation now uses the lead's first name, or "your lead" when there is none.
- **`1edbc3e9`: the clipped line built from the lead's description of a person.** "Ngozi Eze was taken on for: Relationship officer, Ikeja. … What the record holds about it: …" was all 36 of "role description used as a name". It is now in full sentences, and it is still the lead's alone.
- **`aae42a6e`: sentences starting in lower case.** Both were in Groundwork's conversation turns, and they are now caught before a turn is saved.
- **`12555e10`: titles.** A person's short name is now their first name, not their title. Dr, Prof, Eng., Engr., Hon., Mr, Mrs, Ms, Miss, Sir, Dame, Chief, Alhaji, Alhaja, Rev, Pastor, Barr., Arc. and Justice are all handled, with or without a full stop. "Dr Amina Bello" becomes Amina. "Dr Bello" and "Mrs Okafor" stay whole. A person actually named "Hon" stays "Hon".
- **`d89628ae`: "You agrees".** "The initiator agrees" had reached the lead as "You agrees". It now reads "You agree".
- **`9c662ad7`: "All two people have answered".** It now reads "Both people have answered."

**The check itself (`3d346e4e`).** Before a report is stored, every line is rendered as the lead and as each participant would read it. The scorer's own problem patterns run over each version. A spec reads `tools/score_run.py`, so the two cannot drift apart. The check also looks for doubled quote marks, and for a verb that does not agree with "you".
- A line that fails is rewritten once by the model. The rewrite is kept only if it reads clean for every reader and every quotation is unchanged.
- Otherwise the sentence is dropped, without leaving any field blank.
- Every rewrite and every drop is logged.

**On run-10's stored reports, served again through the new code:** every problem count is 0, except six old sales lines already in storage. Those change when the report is next written.

**Tested live on sales, seniorhire and openread, twice each:**
- **Every problem count in the scorer is 0 in both rounds.**
- **Openread is right in both.** Both judgements join Kofi's Thursday scramble and Mei's delayed fixes to the Friday freeze, which is exactly the right answer.
- **Two defects found, both being fixed now:**
  - **A quote nobody said.** The model wrote 'incredibly tight timelines' in single quotation marks, which the quote check does not treat as a quote. The check's pronoun rewrite then turned them into double quotation marks. Sofia never said those words. The quote checker caught it: 162 of 164 quotes were right, and 2 were not. The fix: single quotation marks count as quotation marks, and the quote check runs again after any rewrite.
  - **It made reports slower.** For openread, the time from the last check-in to the finished report went from 112 seconds to 223 and 253 seconds. The check was calling the model once per sentence, and there were 53 rewrites in these runs, mostly pronoun fixes. For a team of nine, whose report already took five to six minutes, that would be worse. The fix: one model call per report for all its rewrites.
- **Two grammar slips still reach the lead:** "You also believes…", and "…but has not communicated this", with no subject. Both are added to the check.

**The rule "every verb keeps its subject" is in the stored prompt, as you decided (`33c1694a`, `ff318f1e`).** It was appended in code after the stored prompt, so no report's `promptVersionId` showed it. It is now part of the stored `report_synthesis` prompt, and the copy added in code is removed. On restart the product created and activated **`report_synthesis` version 7**. I tested sales, seniorhire and openread once each:
- every report records version 7;
- every problem count in the scorer is 0;
- 260 of 260 quotes are word for word in the record;
- the judgements read as before.

One old example in the rules the code adds after the stored prompt had the same fault ("…and has completed six", with no subject). It contradicted the new rule, so I corrected that example only, and added no rule text there.

**What it does not cover yet:**
- The board's own sentences, which are built when the board is opened, not stored. The check sees the report text the board uses, but not those.
- The pronoun check in conversation turns.
- Two counts that mix a word and a figure, such as "Two of the 5 people have answered so far".

**The praise check reads the lead's description of each person, to find their target (`e4c2b18b`).** For Kwame, the target of 14 approved facilities is written only there. The check only takes sentences out, never adds any, and calls no model. A test proves none of the description's words reach its output. It is the one internal read of the lead's words that decision 30 allows in practice, and I have written it down so it is not a surprise.

### Hafsah's decision on the bar for task 1.5

**Task 1.5 is met when, in two full runs in a row, at least 20 of the 24 scenarios can be tested, and at least 90% of those are clearly right.**

**Where it stands: not met.** Run-9 meets it on its own: 20 could be tested and 18 were right, exactly 90%. Run-10 does not, because only 18 could be tested. The table below is corrected for openread (see the note there). On it the runs score 17 of 22, 14 of 23, 16 of 22, 18 of 20 and 15 of 18.

### Scenarios that couldn't be tested in two or more runs, and what their scripts say

**Two scenarios: advisor (4 of 5 runs) and shock (4 of 5).** I had also listed openread, and that was my grading mistake: see the note on the table.

- **advisor.** The key fact is in the simulated advisor's script. It says he "has never worked with KCB or Co-operative and could not open either door". But the script also says he "does not volunteer limits, but is honest about them when asked a direct question". So he only says it if Groundwork asks him directly which of the three banks he can actually open. In four runs of five it never did. **This is a gap in the conversation, not in the script.** The script does what the scenario is meant to test.
- **shock.** All three warning signs are in the scripts. Tobi has both cancelled quarterly reviews, in June and September, and the champion leaving in July. Hana has the tickets going from 9 to 31 in August. Tobi's script says he is "defensive at first, then accurate", and "has the dates once he stops explaining". So the dates come out only if Groundwork keeps asking for them. In four runs of five it did not get all three. **This is also a gap in the conversation, not in the script.**

**No script needs to be firmer, so I have written no improved versions.** Making the simulated people say these facts without being asked would stop the scenarios testing whether Groundwork asks. For both, the fix is in the conversation: asking a direct question about a stated limit, and asking for dates. That is phase 2 work, so it waits until after deployment.

### Loans: why its report was incomplete, and a product problem

**The product is slow for a team of nine, and that is a product problem.**
- From the ninth person checking in to a report that includes all nine people took **4 minutes 41 seconds, 5 minutes 47 seconds, 5 minutes 55 seconds, 5 minutes 45 seconds and 5 minutes 30 seconds** in the five loans runs I can measure.
- The report is written again after every check-in. For nine people, each rewrite takes 3 to 4 minutes. Reading the nine accounts together takes 48 to 60 seconds of that. The rest goes on writing the report and on retrying when a check fails, for example a quote copied word for word, or a sentence that counts people. The rewrites queue one after another.
- **Until the last rewrite finishes, the lead reads a report that leaves some people out.** In run-10 it held 6 of the 9 findings for about six minutes.
- The runner's five-minute wait was shorter than that, so loans was marked incomplete in almost every run, even when its judgement was right.

**The runner now waits longer for a larger room (`8255ab04`, not yet used in a run).** It waits five minutes for up to four people, plus a minute for each person after that, up to fifteen minutes. For loans that is ten minutes.

**The product problem itself is not fixed.** It is listed in `docs/ready-to-deploy.md` as a known problem.

### Where the existing 16 decisions disagree with the new 14, or look out of date

I have changed nothing. This is the list for Hafsah to read before she replaces `docs/decisions.md`.

1. **Decision 4 against decision 17.** Decision 4 says what people say can be shown word for word to the people in that check-in. Decision 17 says colleagues who give views in an evaluation check-in are not named to the person being reviewed. Showing a colleague's words word for word can give them away, as surely as a name or a job title does: their way of putting things, a detail only they would know. Decision 4 does not say that evaluation check-ins are an exception.
2. **Decision 4 against decision 30.** Decision 4 lists what stays private: questions to Ask Groundwork, each person's own report, a lead's private notes, and each person's load. Decision 30 adds a lead's private description of a person, but decision 4's list does not include it. It would be clearer if decision 4's list pointed to decision 30.
3. **Decision 5 against decision 30.** Decision 5 says admins see every board and report. Decision 30 says a lead's private description of a person never reaches anyone else. The board now serves that description only to the person who runs the check-in, so an admin reading the same board does not see it. That follows decision 30, but decision 5 as written says admins see everything on every board.
4. **Decision 9 against decision 28: two meanings of "setup".** Decision 9 means a new person getting set up in their job: onboarding problems never count against them. Decision 28 means the lead setting up a check-in: that is not the lead's first check-in. Both use the word "setup" for different things.
5. **Decision 3 and decision 27, the word "role".** Decision 27 says a member sees colleagues' names, roles and teams. "Role" there has to mean the person's role in the organisation, not the sentence a lead typed about them, which decision 30 keeps private. Decision 3 also uses "role" for the role in the organisation. It would be safer if decision 27 said so.
6. **Decision 21 has two sentences that seem to disagree.** It says "there are no free check-ins". It also says that while the trial setting is off, billing works exactly as it does today, and that switching the trial on removes the free first session and the free plan. So while the setting is off, which is the case today, there is a free first session. "No free check-ins" is true only once the trial is switched on.
7. **Decision 17 against quotes shown word for word.** Since today, every quote a person reads is the original words from the record. In an evaluation check-in, the reviewed person may read a colleague's exact words. This is the same point as item 1, made sharper by today's work.
8. **Decision 12 against decision 18.** Decision 12 says claims are "the person's word" until they are checked. Decision 18 says people's own words are never changed to improve a score. There is no conflict, but decision 12's "the person's word" means a claim not yet checked, and decision 18's "people's own words" means the text they wrote. The same phrase does two jobs.
9. **Decision 6, the verdict names.** Decision 6 lists the verdicts as keep, reward, support, plan and exit. The screens workspace's new suggestions store the same five. Decision 17 names "a performance plan, a promotion, a renewal" as the evaluation check-ins. Those are not the same list, and nothing says how they relate. This is not a conflict, but it could be read two ways.

Nothing among the existing 16 looks out of date apart from these.

## 27 SEPTEMBER, THE DAY SESSION: where I am now

This section is kept up to date as I go. If it stops partway, that is where I got to.

### Run-10, today's last full run: the lead's words stay with the lead, checked in the database

Run-10 ran on everything up to `3f323d61`. It includes all the routes by which the lead's description leaked, and the new wording for unnamed colleagues.

- **The run is sound except for loans.** Its report was incomplete again (6 findings for 9 people). Every other captured report matches the database.
- **The lead's words no longer reach the person, checked in the database.** For every invited person whose record holds a description the lead typed, I looked for any run of five words from that description in two places: Groundwork's turns to that person, and what that person is served (their report and their board).
  - **Run-9, before the fix:** 27 of 27 people had such runs of words.
  - **Run-10:** 2 of 27. Both are the person's own words, not the lead's. Femi said "My goal is 12 approved facilities this quarter" himself. Tobi said he was to own "the relationships with our five largest clients", and the lead said the same in her own check-in. So there are no real leaks left.
- **Invited people are asked who they are.** In run-9, no invited person was asked the question. In run-10, 11 were, all in the situations about starting something: advisor, cofounder, handover, newmanager, project, renewal and seniorhire. The others are in situations where that question is not used, and most of them are asked about their part anyway, for example "What did you understand your role in this to be?".
- **Every quote is from the record.** 427 of 427 quotes are word for word what people typed.
- **The checker says nothing is worse than the baseline.** "Blocker checked" is 54 now, well above its baseline of 37. It had been sliding.
- **Two numbers rose since run-9, and neither is past the baseline.** Jargon in Groundwork's turns rose from 13 to 38, and in reports and boards from 84 to 138. Almost all of it is the word "pipeline" in the sales scenario, 108 times, and the simulated people used jargon twice as often this run (31 times against 15). It is the same pattern as run-6, and I see no link to today's changes.
- **The judgements: 15 clearly right of the 17 that count, and 15 of all 24.**
  - **Couldn't be tested (6):** advisor, drift, handover, openread, shock and workplan. Each time the simulated people left out a fact the answer depends on. That is more than in any other run, and I would not read this run's number as a step back.
  - **Not right (2):** sales and realign. In sales it is Kwame's miscount again. In realign, the simulated Ruth called Omar the CEO, although Omar is the team lead, and the gap followed her and said two of the priorities "came from you". Its actions do name the CEO's dinner with Marco. I have graded it not right rather than untestable, because Marco's account of the CEO was clear.
- **A small defect for the wording check.** "Success for Dr means…". The code took the title in "Dr Amina Bello" as her first name.

### Hafsah's decisions, merged into one file for her to put in place

`docs/decisions.md` held only 16 of Hafsah's decisions. It is a protected file that I cannot change, so the full version is in **`docs/decisions-merged.md`** (`ef147ceb`).
- Decisions 1 to 16 are exactly as they were, byte for byte. Checked by comparing the two files.
- Decisions 17 to 30 are added in plain sentences. They cover: colleagues in evaluation check-ins, people's own words never changed for a score, pattern names, the 50 packs, the free trial and prices, naming the organisation at sign-up, signing up, sign-in wording, no guided tour, security, who sees colleagues, the setup not being the lead's first check-in, naming check-ins by topic, and a lead's private description never reaching anyone.

**The step for Hafsah, in an interactive terminal of her own:** replace `docs/decisions.md` with the merged file without its first six lines (the note at the top), then delete `docs/decisions-merged.md`, and commit.

### Request 36, privacy: a person's label could be the lead's private description of them

**What was wrong.** When a person had no name, several places used the sentence the lead typed about them as their name. That sentence can hold the lead's private words, for example "Daniel - Your sales manager, who you said is not meeting his agreed targets". So the person, or a colleague, could read it on the board, in an email, or in the check-in itself.

**Fixed the simple way, as you said (`a75b13ac`).** A person's label is now their name. With no name it is "A teammate", the neutral word the board and the report's list of who answered already use. Nine places built a label from the description. All nine are changed: the board, what the board tells the model the room is about, the end-state email, the interview's name for a colleague, and four places in the conversation. The end-state email also no longer falls back to an email address. A new test runs every one of these, including the served board as the lead, as the person and as a colleague, and proves no part of the description appears as anyone's label. Six of its tests fail with the old code put back. The answer is in `docs/answers-from-engine.md` (`d062243a`).

**Every route I found, and what closed it.** All of these are about the sentence the lead typed about a person when inviting them. It can hold the lead's private words, such as "Daniel - Your sales manager, who you said is not meeting his agreed targets".

1. **The person's label.** When a person had no name, nine places used the lead's sentence as their name: the board, what the board tells the model the room is about, the end-state email, the interview's name for a colleague, and four places in the conversation. So the person, and their colleagues, could read the lead's words as a name. The end-state email also fell back to an email address, which a colleague may not see. Closed in `a75b13ac`.
2. **The board's `remit` field.** The board served the lead's whole sentence about each person to every reader. I confirmed that Daniel and a colleague both received "Daniel - Your sales manager, who you said is not meeting his agreed targets". It now reaches only the person who runs the check-in. Closed in `c28dbc97`.
3. **The person's own check-in.** In a person's own session, the model was given the lead's sentence about them three times, so it could say it back to them. It is now never given it. Closed in `feea6104`.
4. **The person's own coaching note.** It began "your work as" followed by the start of the lead's sentence, which gave "your work as daniel". It now says "this work" unless the words are the person's own. Closed in `7b2a876c`.
5. **The report's role line (`people[].role`).** I checked this, and it was not leaking. It only reaches the judgement, which only the lead reads. The tests now prove that, in `7586775d`.
6. **A side effect of route 3, also fixed.** Once the model could not see the lead's sentence, an invited person was never asked who they are, because the product thought their record already said so. Now a person whose only role text is the lead's is asked in their first session, "are you the person this check-in is about, or somebody working alongside them?" That is the same question as for somebody with no role. Fixed in `f2c99afc`.

**The wording, as you asked.** A person with no name is now "a colleague". When several appear in the same text, they are "a colleague", "another colleague" and "a third colleague", with a capital only at the start of a sentence. The board, the reports, the interview, the email and the conversation all take the words from one place, so the same person is called the same thing everywhere (`731f889c`, `c39d7fca`). One sentence reads less well now: when the first person comes up again later, "and a colleague agrees" can sound like somebody new. I kept your exact words. **I could not find your decision 17.** `docs/decisions.md` has 20 lines and does not mention "colleague". The prototype's only use of the word is "Invite a colleague".

**The tests.**
- A new label test (29 tests) checks every label builder. It searches the whole served board as the person and as a colleague for any part of the lead's sentence, and confirms the lead still reads it.
- A session test runs real check-in turns and checks every instruction the model is handed.
- Both fail when the old code is put back.

**For the screens workspace.** The client still shows "a teammate", and its own `participantLabel` still falls back to the lead's sentence. One of their tests reads my server code for the old words. All of that is in `docs/answers-from-engine.md`.

**Before this can be counted as proven,** the scenario run and the checker need to see it, because routes 3 and 6 change what the conversation says in a first session.

### Your decisions at midday

- **Situation names: agreed.** The prototype's names for six of the eight. Keep "contract" and "recognition" in the other two. I had an error in my own table: it also bolded a third change, "Make sense of something serious that happened". I am following your words, so that one takes the prototype's name, "Make sense of something serious".
- **Scoring: a run where the key fact was never said is marked "couldn't be tested", and left out of the count.** Applied to runs 6, 7 and 8 below, with both counts shown.

### Your decisions this morning, and what I am doing with them

- **Names inside people's words:** you said no to `8feedc64` and yes to the middle way, on two conditions. Every quote a person sees must be the original words from the record, and a test must prove that every quote in a served report matches the original answer exactly. That is step 3 below. If it cannot meet both conditions, I will stop and tell you.
- **Situation names:** the two names are side by side below, for you to decide.

### Done so far today

1. **In step with the screens workspace.** I merged `mine/wip/prototype-ui`, which brought 108 commits overnight and 18 more this morning. Both were clean fast-forwards and are pushed.
2. **The test database is up to date.** I applied 22 migrations, not the nine I mentioned: the screens workspace added 13 more overnight. It is the local test database `gw_pw9_1786222102` on localhost. Prisma now reports "Database schema is up to date".
3. **The board never reads how a person's answers were rated (`a1747927`).** This was their privacy request 8. "Nothing checkable" came from the hidden rating of how checkable someone's answers were. Now the board reads only the record: whether anything they said this round has a number, a date or a document with it. A new privacy test builds the lead's board twice, once with every check-in rated best and once rated worst, and proves the rows are identical. Every row now also carries a plain sentence that says what happened and what would change it, with no verdict word. For example: "Femi is at 2 of 14, and 6 of the 12 rounds have gone. At this pace, 14 would not be reached by the end." The screens workspace's stop-gap, which showed such a row as "nothing to do", is gone, because it was untrue. **The screen still needs one change from the screens workspace:** it still shows each reason as a coloured pill beside the name, and it should show the new sentence instead. I have asked them for it.
4. **Sales, checked before changing anything.** The fact is there. In all three runs Kwame says his target is 14 approved facilities, and he counts his 22 applications towards it. On run-6 he said "All 22 of them, actually. I counted them all towards my target". The record also holds "I have three approved facilities already". But his finding kept only "22 facilities were processed smoothly". The code picks the latest progress line that contains a digit, and "three" is spelled out. So the one line that shows 3 approvals against 14 never reached the judgement, and the judgement praised him for exceeding his target. **The fix is in (`e9ec1e5a`):** number words now count as numbers, and when someone gave two different figures, both reach the report. I tested it on two sales runs. On the first, Kwame's finding reads "Kwame Mensah has three approved facilities, against a target of 14. Kwame has 19 other facilities that are still applications and not approvals." That is the fact, reaching the report at last. But the judgement still did not draw the conclusion. It put Kwame down as waiting for documents. On the second, the simulated Kwame gave his own target as 22, and the judgement called that target unachievable. **So sales is close in both, not clearly right.** I am keeping the fix because it makes the finding true to the record, and I am not chasing the judgement with prompt changes.
5. **The "what to ask for" line on the board is in full sentences now (`88b84293`).** It does not repeat the new `says` line. For example: "Ask Amina to check in." and "Ask Musa to speak to Kofi rather than write to them."
6. **The other close ones, checked against what was said before changing anything:**
   - **snapshot is the names problem.** Ravi Menon is the lead in every run. Anna is waiting for Ravi's signature, so the lead is waiting on himself without knowing it. That is exactly the right answer, but the judgement asked the lead "who Ravi is". The middle way for names should fix snapshot, drift and pulse together.
   - **advisor: the fact was not said.** In runs 7 and 8, Peter only ever mentions his contact at Equity Bank. He never says he has none at KCB or Co-operative Bank. Nothing to fix in the engine.
   - **loans: the fact is in the findings now, and the judgement does not join it up.** On run-8, four borrowers' findings each say their repayments came before any income: Sunday, Hauwa, Grace and Esther. The judgement named only two of them, and never said it is one cause in how the loans are set up.
   - **shock: the material has all three warning signs in only one run of three.** Only on run-7 did Tobi say "their two quarterly reviews were cancelled. One in June, one in September". Even then, the judgement did not put the three in order.
   - **project: the fact is there, and the judgement framed it differently.** Rita's July reconciliation requirements are in the record. On run-8 the judgement led with the blocked credentials instead of the scope. I am leaving this one.
7. **The middle way for names: built, and not yet finished.** There are four commits: `2b47bc4f`, `b6a3a379`, `21c76534` and `dcf44486`.
   - **Quotes are restored from the record before storing.** Every quotation the report models write is replaced by the record's own words. If it cannot be matched, it loses its quotation marks. The serve step no longer changes anything inside a quote. Before this, three serve-time rewrites did: the name swap, the dash rewrite and the "party" rewrite. On run-8, 392 of the 732 quotes served were not word for word in the record.
   - **The models read labels where people said names**, and quotes are restored from the unlabelled record.
   - **Your proof test is in.** It runs the drift scenario from the record, through the report writer and storage, to what Nadia, Zainab and the anonymous copy are served. It checks that every served quote is in the record character for character. It fails when the fix is taken out. Nadia now reads "…since March, at your request. In Zainab's words, "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia"."
   - **There is a checker for runs**, `api/journey/every-quote-is-from-the-record.ts`. It fails if any served quote is not in the record.
   - **Two gaps I am closing before I call it done.** First, about 1 in 10 record lines is the extractor's tidied version of what the person typed, not the typed words. A quote restored from one of those would still be a model's copy, which your first condition rules out. So each record line will now be marked when it is written, according to whether it is word for word what the person typed, and only those lines can be quoted. Second, a quote that cannot be matched currently loses its marks and reads broken: "Zainab Suleiman says I have mostly been doing sales support at your request." That sentence will be dropped instead.
   - **Both gaps are closed.** `c36c862b` marks each record line when it is written, according to whether it is word for word what the person typed. Of 26,060 lines, 23,386 are, and only those can be quoted. `d30f4d1b` drops a sentence whose quote is not theirs and cannot stand without quotation marks. `266bfdf6` gives commitments the same word-for-word mark, because they were being dropped. `ece89012` keeps wording the judgement suggests, such as "ask: What are you waiting for?", without quotation marks, and never leaves a field blank. The two new columns are migrations on the local test database only.
   - **Proven live, twice.** I ran drift, pulse and snapshot twice each. **All three were clearly right in both rounds, six out of six.** Last night drift was right in one run of six, and pulse and snapshot were unsteady.
     - drift: "Zainab Suleiman is spending eighty percent of their time on sales support at your request."
     - snapshot: "Sign the lease variant for Anna Kowalski." The lead is the Ravi she was waiting for.
     - pulse: the approvals are stuck with a manager on leave, and it says to find somebody who can sign. When it said the lead approved the leave without arranging cover, those were the lead's own words: "since I didn't arrange cover for them".
   - **The checker: every quote served was word for word in the record.** 45 of 45 in the first round and 24 of 24 in the second. The checker exits with an error if even one is not.
   - **For you to know.** A quote that is not the person's own words now loses its quotation marks, or its sentence is dropped. On the 300 newest stored reports that dropped 4 sentences the report models wrote and 98 sentences the product built, mostly lines in "what the record shows over time" that quote a commitment nobody said word for word.
8. **Loans and shock: a rule for a shared cause and for one story in order (`2f4fa98e`).** It adds two short paragraphs to the judgement's instruction, with no scenario words in them. When several people give the same reason, say it once and name everyone it applies to. When different people each hold one piece of what happened, put the pieces in order of when they happened. I tested it twice on each.
   - **Loans: right in substance both times, and neither run can count.** The first said to "review the loan's startup terms, including the grace period". The second named the shared cause for Sunday, Hauwa and Blessing, kept Musa's undelivered machine apart, and said "Introduce a 90-day period with no payments at the start of each loan". That is the right answer. **But both reports were incomplete** (8 and 7 findings for 9 people), so under the rules neither counts. With nine people, loans often misses the runner's five-minute wait when it runs next to other scenarios.
   - **Shock: couldn't be tested, both times.** Only the support-ticket sign was said. Nobody mentioned the missed quarterly reviews or the champion leaving, so there was no story to put in order.
9. **The situations have the names you chose (`bde4f419`).** The prototype's for six, keeping "contract" and "recognition": "Check in before a contract ends or renews" and "Support a raise, promotion or recognition". Every other name is now in sentence case. Nothing in the code chooses a situation by its name. The client's `SCENARIO_LABELS` changed in the same commit, strings only, so the screens workspace's parity test stays green. I have told them. They still write "Connect Goals Across the Team" by hand in five places. **One thing I checked and got right this time:** the scenario packs that actually run come from the database, not the file, as this report said before. So the six situation names written inside the packs' text are unchanged in what runs. That is part of your open question on the 50 packs.

**Run-9, the first full run today, started at about 17:50 on `bde4f419`.** It includes everything above.

### Run-9: 18 clearly right of the 19 that count, and 18 of all 24

- **The judgements.**
  - **Clearly right (18):** board, cofounder, contractreview, discovery, drift, handover, implementation, newmanager, pip, project, pulse, realign, recognition, renewal, seniorhire, snapshot, updates and workplan.
  - **Couldn't be tested (3):** advisor, openread and shock. The reasons are in the table below.
  - **Report incomplete (2):** crisis and loans. Crisis's gap reads as right ("the rota they used is known to be wrong"), but it cannot count.
  - **Not right (1):** sales. Kwame says "I've got 22 in the pipeline right now. So I'm ahead of schedule!" against a target of 14 approvals. The judgement still does not say he is counting applications.
- **Drift, pulse and snapshot, the three the names change was for, are all right.**
- **Is task 1.5 met?** On all 24 it is 18, and the bar is 20. Leaving out the runs that couldn't be tested and the incomplete reports, it is 18 of 19. **Which count the bar uses is your call, so I have not ticked 1.5 and have not started 1.6.**
- **Every quote is from the record.** The checker read all 496 quotes served across the 24 scenarios. All 496 are word for word in the record.
- **The checker says nothing is worse than the baseline.** Jargon in reports and boards fell from 124 to 84, and in Groundwork's turns from 15 to 13.
- **Every test, after merging the screens workspace's newest work.** All 9,859 API tests pass, and the typecheck is clean. The client passes 3,073 of 3,075. The two that fail are in the screens workspace's sidebar tests, "Jump to" and "the sidebar waits for the list". They fail the same way with my one client change taken out, so I have told them. I also applied the six migrations their newest work brought to the local test database.
- **One number to watch.** "Blocker checked" is 35, against a baseline of 37. The checker allows a 10 per cent drop, so it passes, but it has gone 42, 46, 38 and now 35 across runs 6 to 9. It counts Groundwork's own conversation turns. Today's changes are all in reports, the board and names, apart from the situation-name line the conversation reads. I have not found a cause.

   - **Next for loans and shock:** one rule in the judgement's instruction. When several people give the same cause, say it once and name everyone it applies to. When several people each hold part of the same story, put the parts in order of when they happened. This waits until the middle way is finished, because both touch the judgement files. I will test it twice on each.

### The situation names, side by side, for you to decide

These are the eight names the screens workspace asked about (their request 5), plus the goals card. The first column gives the prototype's name. The second gives the name I would use. The last says what the situation covers, in one sentence. Only the capitals differ in every other name, so I have left those out.

| Situation | The prototype's name | The name I would use | What it covers |
| --- | --- | --- | --- |
| NEW_ADVISOR | Start an advisor or board relationship | Start an advisor or board relationship | Agreeing what an advisor or board member will actually contribute, and on what terms, before any equity or retainer is settled. |
| WORKPLAN_BUDGET | Build a workplan and budget | Build a workplan and budget | Each person writes their own plan, and the plans are checked together against the budget and the people available. |
| COHORT_CHECK | Check how the same role is going | Check how the same role is going | Several people in the same role are each checked on their own, so the lead can see where the role works and where it does not. |
| CONTRACT_RENEWAL | Check in before a renewal | **Check in before a contract ends or renews** | When a contract or a term is ending, both sides say what was agreed, what happened and whether renewing makes sense. The prototype's name drops "contract", and many of these are contracts that may simply end. |
| RECOGNITION | Support a raise or promotion | **Support a raise, promotion or recognition** | Building the evidence for a raise, equity, a promotion or simply credit for work, before the conversation happens. The prototype's name drops "recognition". Our recognition scenario is about credit for a contractor's work, not about pay. |
| REALIGN_TEAM | See where people see things differently | See where people see things differently | A team working from different versions of the same thing, with each account kept and nobody framed as wrong. |
| ACUTE_SHOCK | Make sense of something serious | **Make sense of something serious that happened** | After something serious has already happened, such as losing a big client or an outage, everyone involved gives their piece, so the real picture comes together fast. I would keep "that happened", because without it the name could read as a risk that has not happened yet. |
| OKR_ALIGNMENT, the goals card | Connect goals across teams | Connect goals across teams | One goal at the top, and whether the goals of the teams under it add up to it. The prototype's "teams" is more accurate than today's "the team". |

If you agree, the table's names change in the engine, and the screens workspace changes its list in the same step so their parity test stays green.


### How often each scenario was clearly right, across runs 6 to 10

Graded against each scenario's right answer. Run-6 came before any of the changes of 26 September. Run-7 came after the first seven. Run-8 came after all of that night's. Run-9 came after the names and quotes work of 27 September. Run-10 came after the routes the lead's description leaked by were closed.

**Two counts.** A run is marked "couldn't be tested" for a scenario when the simulated people never said the fact that scenario depends on. It is marked "report incomplete" when the runner itself says the report is not usable. The first count leaves both out. The second counts all 24, as before.

**Corrected on 27 September, evening: openread was never untestable.** I had marked four openread runs as couldn't be tested, because Kofi says the problem is not the freeze. His script is written that way on purpose. He is meant to raise the same thing from a different angle, Thursdays that are chaos and Fridays that are empty, and the right answer is to notice that he and Mei are describing the same freeze. So every openread run could be tested, and only run-8 got it right.

| Scenario | Run-6 | Run-7 | Run-8 | Run-9 | Run-10 | Right, of the runs that count | Right, of all five |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cofounder | right | right | right | right | right | 5 of 5 | 5 of 5 |
| contractreview | right | right | right | right | right | 5 of 5 | 5 of 5 |
| discovery | right | right | right | right | right | 5 of 5 | 5 of 5 |
| implementation | right | right | right | right | right | 5 of 5 | 5 of 5 |
| newmanager | right | right | right | right | right | 5 of 5 | 5 of 5 |
| pip | right | right | right | right | right | 5 of 5 | 5 of 5 |
| renewal | right | right | right | right | right | 5 of 5 | 5 of 5 |
| seniorhire | right | right | right | right | right | 5 of 5 | 5 of 5 |
| board | couldn't be tested | right | right | right | right | 4 of 4 | 4 of 5 |
| crisis | right | right | right | report incomplete | right | 4 of 4 | 4 of 5 |
| workplan | right | right | right | right | couldn't be tested | 4 of 4 | 4 of 5 |
| advisor | right | couldn't be tested | couldn't be tested | couldn't be tested | couldn't be tested | 1 of 1 | 1 of 5 |
| project | right | right | - | right | right | 4 of 5 | 4 of 5 |
| realign | right | right | right | right | - | 4 of 5 | 4 of 5 |
| updates | right | - | right | right | right | 4 of 5 | 4 of 5 |
| handover | - | right | right | right | couldn't be tested | 3 of 4 | 3 of 5 |
| pulse | right | - | - | right | right | 3 of 5 | 3 of 5 |
| recognition | - | - | right | right | right | 3 of 5 | 3 of 5 |
| snapshot | right | - | - | right | right | 3 of 5 | 3 of 5 |
| drift | - | - | - | right | couldn't be tested | 1 of 4 | 1 of 5 |
| openread | - | - | right | - | - | 1 of 5 | 1 of 5 |
| sales | right | - | - | - | - | 1 of 5 | 1 of 5 |
| loans | - | - | - | report incomplete | report incomplete | 0 of 3 | 0 of 5 |
| shock | couldn't be tested | - | couldn't be tested | couldn't be tested | couldn't be tested | 0 of 1 | 0 of 5 |
| **Total** | **17 of 22** | **14 of 23** | **16 of 22** | **18 of 20** | **15 of 18** | | |

**On all 24, as before:** 17 on run-6, 14 on run-7, 16 on run-8, 18 on run-9 and 15 on run-10.

**The runs left out, and why:**

- **advisor, run-7, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **advisor, run-8, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **advisor, run-9, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **advisor, run-10, couldn't be tested:** Peter never says he has no relationship at KCB or Co-operative Bank.
- **board, run-6, couldn't be tested:** Wanjiru never gives a timeline for the licence, only that there is none yet.
- **crisis, run-9, report incomplete:** 2 findings for 3 people.
- **drift, run-10, couldn't be tested:** neither Nadia nor Zainab says who asked Zainab to move to sales support.
- **handover, run-10, couldn't be tested:** Patience never mentions the year-end spreadsheet; the judgement finds the verbal supplier agreement, which she did mention.
- **loans, run-9, report incomplete:** 8 findings for 9 people.
- **loans, run-10, report incomplete:** 6 findings for 9 people.
- **shock, run-6, couldn't be tested:** nobody says first-hand that the quarterly reviews were missed.
- **shock, run-8, couldn't be tested:** nobody says first-hand that the quarterly reviews were missed.
- **shock, run-9, couldn't be tested:** nobody mentions the champion leaving; only the cancelled reviews and the tickets are said.
- **shock, run-10, couldn't be tested:** nobody mentions the missed quarterly reviews; the champion leaving and the tickets are said, and the judgement's actions put those two in order.
- **workplan, run-10, couldn't be tested:** Chidi never mentions Studio Lune, so there is no double booking in what was said.

**A correction to an earlier report.** I wrote that on run-7 Daniel never said that Priti was the one he was waiting on. That was wrong. He said "Priti can grant that access." So updates on run-7 could be tested, and the judgement missed it.


## THE NIGHT IN SHORT, 27 September, about 03:30

**How many judgements are clearly right: 16 of 24 on the last full run (run-8). The bar is 20, so task 1.5 is not ticked, and I did not start task 1.6.** The three full runs I measured scored 17 (run-6), 14 (run-7) and 16 (run-8). Most of that movement comes from what the simulated people happen to say in each run, not from the code. The scenarios I worked on tonight did get steadier. Handover was right in every clean run after the first fix, and recognition and updates were right on run-8.

**Run-8 passes the checker.** Nothing is worse than the baseline. Jargon in reports and boards is 124, back under 1.4's bar of 128. Jargon in Groundwork's own turns fell from 41 to 15. Curt turns are 0. Every report matched the database, and every one was written by `report_synthesis` version 6.

**The eight that are not clearly right, and why:**

- **drift is wrong.** Zainab says she was moved to sales support "as requested by Nadia", and Nadia is the lead. The judgement only knows people by labels, so it takes "Nadia" to be someone else, "another leader". This is the one decision I need from you, below.
- **pulse is wrong.** On run-8 it wrote about a module nobody mentioned. In a test run the day before it was right, and in another it mistook "Ahmed's manager" for Ahmed, the lead. That is the same names problem as drift.
- **sales is wrong.** It praises Kwame for "exceeding" his target. In fact he is counting applications, not approvals.
- **advisor is close.** It misses that Peter has no relationship at two of the three banks.
- **loans is close.** It sets apart the one borrower who never received his machine. But it does not say that five borrowers share one cause, repayments that started before their businesses could earn. In one test run it said exactly that, but that report was incomplete.
- **project is close.** It does not put the reconciliation scope first.
- **shock is close.** It joins two of the three warning signs, and gives no timeline.
- **snapshot is close.** It mentions Ravi's signature only in an action.

**What I changed tonight (13 commits of code, each with its own tests):**

1. Each person's finding now keeps what they say about how the work really runs. These lines were stored and never read.
2. The record now keeps what a person says somebody else did, with that person's name. This is what put Victor into recognition.
3. The date question is asked once, only about a real deadline, and in a full sentence. It had asked Patience "Year-end - so 31 December 2026?" seven times in a row.
4. A reply that repeats our own hidden instruction is never sent. Jide was once sent one word for word.
5. Every judgement action is now something the reader does, not "Tell you to…".
6. A name at the start of a sentence, or used as a possessive, now counts in the check for a name two people mentioned.
7. A close is never cut down to "Speak soon.", and no guard can send a fragment such as "Before we close,".
8. "What is in their way" now keeps the worry that has the detail in it.
9. Two of my own specs were fixed for the screens workspace.

I tried two other changes and undid them. One gave the judgement people's names, and it began writing those names into the stored report. The other swapped names for labels inside people's words, which would change their words on screen, so it waits for you.

**What needs you:**

1. **Names inside people's words (the main one).** If "as requested by Nadia" becomes "as requested by the initiator" before the model reads it, drift and pulse stop mistaking the lead for someone else. The cost is that a quote would reach Nadia as "as requested by you". The full version is ready in `8feedc64`. There is also a middle way, which keeps the words inside quotation marks. Both are described below.
2. **The situation names** the screens workspace asked about (their request 5). Two of the prototype's names narrow the meaning: "recognition" and "contract" drop out.
3. **The older open questions** are unchanged: B5's plain name, the 50 scenario packs and `the-real-gate`.

**Every test, after merging the screens workspace at the end of the night.**
- **API: all 9,352 tests pass, in 1,031 suites, and the typecheck is clean.** That includes `the-password-rules.spec.ts`, which the screens workspace has now fixed. After the merge I had to run `prisma generate`, because their schema changes were not yet in the generated code on this computer. That touches only `node_modules`.
- **Client: 2,730 of 2,732 pass.** The two that failed are in the screens workspace's new check-in spec, and they time out at 5 seconds when the whole suite runs. The file passes on its own, 22 of 22. I have told them in `docs/answers-from-engine.md`.
- **The local test database has not had the screens workspace's nine new migrations applied.** Apply them before the next scenario run.

**The first thing for the next session** is the screens workspace's privacy request 8. The board tells a lead that a person said "nothing checkable", and that rests on how their answers were rated.

## TONIGHT, 26 to 27 September: where I am now

This section is kept up to date as I go. If it stops partway, that is where I got to.

### Run-6 is sound, and nothing is worse than the baseline

- All 24 scenarios finished. No report was marked "REPORT INCOMPLETE" and every report was released.
- In all 24, the captured report holds exactly as many findings as the database.
- Every report was written by `report_synthesis` version 6, and the active `system` prompt is version 43. Both are the versions I expected.
- The scorer says nothing got worse than the baseline.

### How many judgements are clearly right: 17 of 24

I read every judgement against the right answer for its scenario. Seventeen are clearly right, four are close, and three are wrong. The bar is twenty.

Clearly right: advisor, cofounder, contractreview, crisis, discovery, implementation, newmanager, pip, project, pulse, realign, renewal, sales, seniorhire, snapshot, updates and workplan.

Three of these were wrong or close last time and are right now. In realign, the judgement now names the chief executive as the second person giving directions. In newmanager, it now says Daniel is answering the hardest tickets himself instead of managing. In workplan, it now finds that two leads booked the same design firm, Studio Lune, at the same time.

The four that are close:

- **drift.** It says Zainab was asked by "somebody else" to do sales support. In fact Zainab says it was Nadia, and Nadia is the lead. The fact was in the record, but nothing passed it on to the judgement.
- **handover.** It finds the year-end spreadsheet but only hints at the supplier arrangement. Both facts are in the record in Patience's own words. They never reached her part of the report.
- **loans.** It says repayments start too early, but it does not separate the five borrowers who share that cause from the one who never received the machine, and it does not say the grace period should change.
- **shock.** It joins two warning signs, not three. In this run nobody said first-hand that the quarterly reviews were missed, so only two of the three were in the material.

The three that are wrong:

- **board.** It says the three people define success differently. The right answer is that the plan assumes a launch in four months and the person responsible says twelve. In this run Wanjiru never gave a number of months. She said only that there is no licence yet and she is not counting on any sales. So the key fact was missing from the material. On run-5 it was there, and the judgement was right.
- **openread.** It misses the Friday deploy freeze. The freeze is in the record seven times, so this time the judgement itself missed it. On run-5 it was right.
- **recognition.** It never mentions Victor, the contractor who wrote the migration script. Two people named him, but the record kept only what each person said about their own work. So Victor was in nobody's record at all.

Board and openread were right on run-5 and are wrong on run-6. Realign, newmanager and workplan went the other way. So some scenarios still change from run to run, and a single run cannot settle them.

### The lower-temperature test: dropped

I measured it last session. A lower temperature made the answers about seven points more alike, but the right answers fell from 19 of 25 to 15 of 25. In the performance-plan scenario, all five answers at the lower temperature agreed with each other and all five were wrong. A steadier wrong answer is worse than a varying right one, so nothing sets a temperature. That is still the decision.

### Something that got worse since run-5, though not below the baseline

Jargon in reports and boards rose from 123 on run-5 to 217 on run-6. Task 1.4's bar is 128, so 1.4's bar no longer holds on this run. Almost all of it is two words, "pipeline" in the sales scenario and "escalation" in the crisis scenario. The people themselves used jargon words 30 times on run-6 against 25 on run-5, and the reports repeated their words far more often. I have not changed anything for this yet. See "Needs Hafsah" below.

### What I have changed tonight

1. **`ce6e7fe8`: each person's finding now keeps what they say about how the work really runs.** The record stores these lines, but nothing that writes a person's finding read them. Run-6 stored 15 of them and lost every one. They include Patience's verbal supplier arrangement, "as requested by Nadia" in drift, and Daniel's "I'm faster at them, so it's quicker for me to just handle them" in newmanager.
2. **`3c56f5eb`: the record now keeps what a person says somebody else did, with that person's name.** This is for recognition, where Victor was named by two people and stored by nobody.

3. **`d7a6510e`: the lead's judgement is now told which name belongs to which person.** In drift, Zainab says she moved to sales support "as requested by Nadia", and Nadia is the lead. The judgement only knows people by their labels, so it treated Nadia as somebody outside the room, and the lead would have read "Tell you that Nadia has redirected Zainab". Now each person's block in the judgement's material says what other people's words call them. No text anyone reads is changed.

I first built a stronger version, `8feedc64`, and undid it in `efd1c67e`. It replaced each name inside people's words with that person's label, so the stored report holds no names at all. The catch is that a quote from Zainab would then reach Nadia as "requested by you", which changes Zainab's words on screen. See "Needs Hafsah".

**The first round of re-runs, on the first two changes:** handover and recognition are now clearly right. Handover names both things only in Patience's head, the verbal 60-day supplier terms and the spreadsheet on her own drive. Recognition names Victor, the contractor, from the other two people's accounts. Newmanager is still right. Drift's finding now keeps "at Nadia's request", which is what led to the third change. Loans is better but still close, and its report was incomplete (8 findings for 9 people), so it does not count. **The third change made things worse, so I undid it (`cb440666`).** Once the judgement was given people's names, it wrote those names into the stored report, where only labels belong. Drift's stored judgement read "Nadia and Zainab have a different understanding". Renewal's began with the lead's full name. Both came back with no actions at all. That second round does not count.

**A clean second round, on the first two changes only:** handover is right again, so two rounds out of two. Newmanager is right again. Recognition names Victor again, so two out of two, though it now asks who he is rather than crediting him. Drift is right this time. It says Zainab moved to sales support because of your own instruction in March, "help sales out for a couple of weeks". It needed only the first two changes. On round one, on the same code, it was not right, so drift is still unsteady. Loans is much better: it sets the four situations apart and says repayments started before the businesses earned. But the loans report was incomplete again (6 findings for 9 people), so it cannot count.

### A conversation bug that was eating the handover check-in, now fixed

In handover, Patience names both things only she knows. Then Groundwork asks "Year-end - so 31 December 2026?" and asks it again every time she answers "No, the last year-end was 31 December 2023", seven times in a row, until her check-in runs out of questions. The code reads the word "year-end" in each answer as a deadline, and never remembers that it has already asked. The same question also once sent Jide the product's own hidden instruction, word for word, as his reply.

4. **`5dcab1de`: the date question is now asked once, only about a real deadline, and in a full sentence:** "When you say year-end, do you mean 31 December 2026?" It is not asked when the person has already given a date, and it is not asked about a word like "year-end" that is not a deadline.
5. **`124e2a4c`: a reply that repeats our own instruction is never sent.** If the model's second try repeats the instruction, the product asks its own one-line question instead.
6. **`a5f6e8dc`: every action in the judgement is now something the reader does.** Before, the lead read actions like "Tell you what Blessing Okafor's record says" and "Ask you to decide what Zainab should work on". There were 8 of these on run-5 and 4 on run-6.

### The third round, on changes 1, 2 and 4 to 6

- **The year-end loop is gone.** Patience was asked about the date once and nothing was repeated.
- **Handover is right again, now three rounds out of three.** It names the verbal supplier arrangement and the spreadsheet on her own drive.
- **Renewal is right again.**
- **Drift is wrong again.** It calls Nadia "another leader". Drift is right in one round out of three. It will not be steady until the judgement can tell that "Nadia" in Zainab's words is the lead, and that is the decision waiting for you below.
- **Loans is close.** Its report was complete this time. It separates Musa's machine, which was never delivered, but it does not set the five borrowers apart or say the grace period should change. In a later round it was almost exactly right: it named four of the five and said "revise the loan terms so that repayments start after a borrower can generate income". But that report was incomplete, so it does not count. Loans has nine people, and when it runs next to other scenarios its report often does not finish in the runner's five minutes.
- **Recognition is not steady.** The record now keeps Victor (change 2 works: three entries, from both people). But the check for "named by more than one person" did not fire, because both people started their sentence with his name, and that check skips a word at the start of a sentence.

7. **`ceda16c4`: a name at the start of a sentence now counts when the same name is used elsewhere in the check-in.** I ran recognition twice more on it. Both were wrong. The first time, Amara's "Victor, the contractor, was responsible…" still did not count, because nobody used "Victor" mid-sentence. The second time, only Joseph mentioned Victor at all, so the check was right to stay quiet. That second run also accused the lead of "taking credit for the design work", which nobody said. I have written that down as a charge nobody made.
8. **`74f10ffe`: a name used as a possessive, such as "Victor's", now counts as a name everywhere in that check-in.** I ran recognition twice on it, and both times the check reported Victor as named by two people. The first was clearly right: "two other participants say the most critical work was done by Victor". The second was close. That time the simulated lead gave credit to three names who appear nowhere else, "Alex", "Sarah" and "David", and the judgement chose that as the bigger gap. It mentioned Victor only in an action.

**Run-7, the full run of all 24 scenarios, started at about 01:05 on the code as it stands at `74f10ffe`.** It is the first of the two full runs allowed tonight.

### Run-7: sound, one number worse than the baseline, and 14 of 24 clearly right

**The run is sound.** All 24 scenarios finished. No report was incomplete, every report was released, every captured report matches the database, and every one was written by `report_synthesis` version 6.

**The checker fails it on one number: one curt turn, against none at the baseline.** It is the closing turn of Elena Rossi's check-in in crisis, which reads only "Speak soon." None of tonight's changes caused it. An older guard wrongly took "What you said is now in the record, and the report will be ready for you." to be a promise she never made. It cut the sentence and left two words. That is being fixed now.

**Everything else holds or improved against run-6.** Jargon in reports and boards fell from 217 to 141, and jargon in Groundwork's turns fell from 41 to 25. That puts 2.3's bar in reach, though 1.4's bar of 128 is still not met. Among the engine-value numbers, "past words brought back" rose from 25 to 30 and "blocker checked" from 42 to 46. "Specific detail asked for", "agreements found", "patterns found" and "commitments recorded" came down from run-6's high, but all stay above the baseline.

**The judgements: 14 clearly right, 6 close, 4 wrong.** That is fewer than run-6's 17, and I am not going to present it as progress.

- **Clearly right:** board, cofounder, contractreview, crisis, discovery, handover, implementation, newmanager, pip, project, realign, renewal, seniorhire and workplan. Board and handover were not right on run-6.
- **Close:**
  - advisor: it misses that Peter has no relationship at two of the three banks.
  - loans: it separates four situations, but names only two of the five borrowers whose repayments came too early.
  - recognition: it names Victor, but as a script the work is waiting on rather than as the person nobody credited.
  - sales: it puts Femi and Kwame together.
  - shock: it has two of the three warning signs and no timeline.
  - updates: this time Daniel never said Priti was the one he was waiting on.
- **Wrong:**
  - drift: it says "You have mistaken Zainab Suleiman for somebody named Zainab". This is the names-in-people's-words problem again: the judgement cannot tell that the "Zainab" in the lead's words is the same person as Zainab's label.
  - openread: once again the two engineers did not clearly agree about the freeze.
  - pulse: it charged the lead, "Your review process is the reason Fatima Sow's work is stalled". Her finding also took the vague "some approvals are stalled" instead of "Ahmed's manager is on leave until the 28th", which was in the record.
  - snapshot: it told the lead to stop running the check-in.

**Why it went down, as far as I can tell.** I compared each slipped scenario's findings on run-6 and run-7. In sales, advisor, updates and snapshot, the simulated people said different things this time, and the missing fact was not in the material. Pulse is different: the fact was in the record, and the code picked the vaguer of two worries from the same session. That is the next fix. I found no case where one of tonight's changes pushed out a fact that had been there before.

### Four more fixes after run-7

9. **`38223cfe`: a close is never cut down to two words.** "What you said is now in the record" is no longer read as a promise. If a cut would still leave a stub on the closing turn, the product sends "Thank you. Your check-in is saved." instead.
10. **`3951f8a1`: "what is in their way" now keeps the worry that has the detail in it.** Tested on pulse. Fatima's finding now reads "Four approvals have been waiting for Ahmed's manager since the 9th", and that judgement was clearly right. On a second pulse run, the judgement mistook "Ahmed's manager" for Ahmed, the lead. That is the names problem again.
11. **`d7d2ba27`: every action that tells the reader to do something is now written as the thing to do.** "Tell the initiator to get Chidi and Sara in a room" is stored as "Get Chidi Eze and Sara Lindqvist in a room". Tested on workplan and project, and both came back clean and right. The same test runs also got crisis clearly right: "the on-call rota was actually out of date, naming an employee who had left the company". But that crisis report was incomplete, so it does not count.
12. **`3a76beae`: no guard can now cut a reply down to a fragment.** A project run sent Ifeoma just "Before we close,", because a guard cut the question that followed. Every cutting guard now keeps the reply as it was when the cut would leave a fragment. The only exceptions are an invented promise or number, and on a closing turn those become the plain close.

**Run-8, the second and last full run tonight, started at about 02:15 on `3a76beae`.**

### Run-8: sound, passes the checker, 16 of 24 clearly right

- **The run is sound.** All 24 scenarios finished. No report was incomplete, every captured report matches the database, and every one was written by version 6.
- **The checker says nothing is worse than the baseline.** Jargon in reports and boards is 124, and in Groundwork's turns 15. Turns asking more than one question are down to 29. "Commitments recorded" is 64. "Blocker checked" fell to 38, against 46 on run-7, but is still above the baseline of 37.
- **Clearly right:** board, cofounder, contractreview, crisis, discovery, handover, implementation, newmanager, openread, pip, realign, recognition, renewal, seniorhire, updates and workplan. Openread found the Friday freeze from both engineers. Recognition put Victor's script in the gap as "the single most important contribution". Updates found that Daniel's blocker is with Priti.
- **Close:** advisor, loans, project, shock and snapshot.
- **Wrong:** drift, pulse and sales. See the summary at the top.

Both full runs allowed tonight are now used, so I stopped measuring there. After run-8 I merged the screens workspace, fixed the two requests that were about my own specs, and ran every test.

### Where each changed scenario stands, across the clean re-runs

| Scenario | Clearly right | Why it moves |
| --- | --- | --- |
| handover | 3 of 3 | Steady since change 1. |
| newmanager | 2 of 2, and on run-6 | Steady. |
| renewal | 3 of 3 | Steady. |
| drift | 1 of 3 | It needs to know that Nadia is the lead. That is your decision. |
| recognition | 2 of 5 | Whether two people mention Victor changes from run to run. The check for a name two people used is now being fixed. |
| loans | 0 counted | Close or nearly right each time, but its report usually does not finish in time.


### Needs Hafsah

- **Jargon in reports rose above 1.4's bar on this run,** mostly because the reports repeat the people's own words "pipeline" and "escalation". The rule is to never change people's own words. So the question is whether a report should still use a word the person used when that word is on the jargon list. I have not changed anything for this.
- **Names inside people's words.** Reports are meant to be stored without names, but a name that somebody says, such as "as requested by Nadia", is stored as they said it. It is then shown to every reader, including a colleague who is not allowed to see names. I can swap each such name for the person's label, and the name is then put back correctly for each reader. The cost is that a quote reaches the person it names as "you": Nadia would read "as requested by you". Your rule is never to change people's own words, so I have not done this. It is ready in `8feedc64` if you want it.

  **Why it matters, measured tonight.** This one problem made three judgements wrong in three different ways:
  - Drift was wrong in four runs out of six. Twice it treated Nadia, the lead, as "another leader". Once it wrote "You have mistaken Zainab Suleiman for somebody named Zainab".
  - Pulse was wrong once. Fatima was waiting for "Ahmed's manager", and Ahmed is the lead. The judgement told Ahmed that both people were "blocked waiting for your approval" and told him to approve the purchases himself.

  **A middle way, if you prefer it.** The names could be swapped for labels only in what the model reads. Then, inside quotation marks, the product would put the name back before storing. Paraphrases would say "at your request", and quotations would keep the person's words. The cost is that a quote would carry the full name ("Nadia Haddad") where the person may have said only "Nadia". I have not built this.
- The older open questions are unchanged and do not block anything: B5's plain name, the 50 scenario packs, and `the-real-gate`.

## WHERE THIS SESSION STOPPED, 26 September, evening

**This session stopped early, and not because of the work.** It started in an empty folder and was moved into this repository partway through. The project's safety check runs before every command and every file edit, and it still looks for its script in the old folder. So everything after the move was refused, including editing this report. I did not touch the safety settings. The fix is a fresh session opened on this folder.

### What is finished

- **I am in step with the screens workspace.** I merged `mine/wip/prototype-ui`, which brought 65 commits covering sign-up, the free-trial setting in billing, and screens. None of it touches the engine's code. The merge was clean, and I pushed it to `mine/wip/plain-reports` as `51f55fbe`.
- **There are no new requests from the screens workspace.** Their file now marks their two earlier requests as answered and accepted, which matches `docs/answers-from-engine.md`.
- **I checked again that the run was safe.** It uses the local test database `gw_pw9_1786222102` and a Stripe test key. Real email cannot be sent, because the Resend key is a placeholder and `EMAIL_SENDS_FOR_REAL` is not set. WhatsApp is not set up.
- **I rebuilt and restarted the local API.** The copy that was running had been built at 20:58, before the last session's final code changes. This run therefore measures the code as it is committed.
- **The API tests pass, with one exception: 9,113 of 9,114.** The one failure came in with the merge. It is in the screens workspace's new test `api/src/modules/auth/the-password-rules.spec.ts`, at lines 74 to 80. That test reads `auth.service.ts` without removing comments first, and `a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts` rightly catches that. It is a flaw in how the test is written, not a fault in the product. Hafsah has passed it to the screens workspace directly.

### What is in progress

- **Run-6 is running.** All 24 scenarios are running in three batches, into `api/journey/all-24/run-6`. Each batch writes a file named `done-A`, `done-B` or `done-C` when it finishes.

### What comes next, in order

1. **Wait for all three done files.** Do not start a new run while this one is still going.
2. **Check that the run is sound before reading any number.** No report should be marked "REPORT INCOMPLETE" in `run.log`. The findings in the captured reports should match the database. The reports should record the prompt versions that actually ran, which were `report_synthesis` v6 and `system` v43 last time.
3. **Score run-6 against the baseline** with `tools/score_run.py`. Then read all 24 judgements against the right answer for each scenario. Last time 16 were clearly right, and the bar is 20.
4. **Work on the ones that are still only close.** For each one, first check whether the missing fact is actually in the material, before changing any prompt.
5. **Run the client tests.** They have not run yet, because they were blocked.
6. **Then move to task 1.6,** the automatic check on the text each reader sees.

### Needs Hafsah

- Nothing about the product itself. The open questions from before are still open and still do not block anything: B5's plain name, the 50 scenario packs, and `the-real-gate`.

## WHERE I STOPPED, AND WHAT COMES NEXT

**Stopped at 21:30 on 26 September, at a clean point.** Everything is committed and pushed to
`mine/wip/plain-reports`. Nothing is half-done, no run is in flight, and no code is waiting on a
measurement.

### What is finished

- **1.4 is ticked**, for the reports. Jargon in reports and boards 511 → 123, against a bar of
  128, on a run whose captures were checked against the database first. Ten random report lines
  read: no clipped phrasing. Its second bar, jargon in Groundwork's own turns, is now 2.3's, at 22
  against a bar of 10.5.
- **1.5's first condition is met**: reports with no judgement, 8 → 0.
- **Three causes found and fixed**, each one proved by measurement rather than argued: the missing
  `INTENT` field, the workplan double-count, and the temperature question below.

### What is not finished: 1.5's second condition

**Sixteen of twenty-four clearly right. The bar is twenty.** Three of the eight short ones now
have a fix in the code that has **not yet been measured on a full run**:

| | Fixed since the run | Not yet touched |
| --- | --- | --- |
| realign | `whyTheySayTheyAreOnIt`, 3 of 4 on fresh runs | |
| workplan | `whatMoreThanOnePersonNamed` | |
| loans | shown to be sampling, left alone deliberately | |
| | | newmanager, advisor, handover, recognition, shock |

### The next three things, in order

1. **Run all 24 and score it.** Two of the three fixes above have never been measured together on
   a full run, and the workplan one has never been measured live at all. Use three shards, not six
   — six starves report regeneration. Check `REPORT INCOMPLETE` lines are zero and check the
   captured findings against the database before reading any number. If it holds, 1.5 could be at
   eighteen of twenty-four.
2. **The five close ones**, which is what is left of 1.5: advisor (he has no relationship at two of
   the three banks), handover (the supplier payment arrangement, the second of her two), recognition
   (Victor belongs in the gap, not only in an action), shock (the three warning signs as one
   timeline), workplan (verify the new count reaches the gap). Each one first needs the same
   question asked: **is the fact in the material?** Three times in a row today the answer was no,
   and three times the prompt was the wrong place to look.
3. **Then 1.6**, the automatic check on rendered text per reader. Its list has grown today: slot
   names, labels, machine words, lower-case starts, cut words, doubled quote marks, a pronoun that
   disagrees with the reader, and a coordinated verb that does not agree.

### Open for you, nothing blocking

- **B5's plain name** in `docs/pattern-names.md`. Your example and the detector disagree about what
  "leverage" means. It may be the detector that is named wrongly.
- **The 50 scenario packs.** Step one is done - all fifty exported and verified byte for byte.
  Steps two and three, the improved versions and the before-and-after document, are queued behind
  the numbered tasks.
- **`the-real-gate`** is tracked again but cannot run: it imports `../hundred/harness`, which is
  not on this computer.

### What I would tell the next session in one line

Three separate defects today were the same defect: the fact was never in the material, and the
prompt was the wrong place to look. Check the supply first.


## The temperature question, answered: no

A lead should get the same judgement twice from the same record, so I measured whether a lower
temperature would make the judgement steadier. Same material, five samples, default against zero,
five scenarios, scoring both how alike the answers were **and** whether they still reached the
right answer.

| | default: alike / right | temperature 0: alike / right |
| --- | --- | --- |
| loans | 38% / 5 of 5 | 35% / 5 of 5 |
| pip | 45% / **3 of 5** | 57% / **0 of 5** |
| contractreview | 49% / 5 of 5 | 47% / 5 of 5 |
| workplan | 41% / **1 of 5** | 56% / **0 of 5** |
| renewal | 31% / 5 of 5 | 43% / 5 of 5 |

Consistency rose about seven points. **Correctness fell from 19 of 25 to 15 of 25.**

The performance-plan scenario is the one to read. At zero the five answers became *more* alike and
*all five wrong*: it converged every time on "they are working to two different targets" and
stopped saying the target was never written down, which is the finding. A steadier wrong answer is
worse than a varying right one.

So nothing sets a temperature. Your rule was "keep it only if it improves consistency without
losing anything", and it loses something. The option stays on the model call because it is what
made the measurement possible, with both columns recorded beside it, so anybody switching it on
owes the same two columns and not just the first.

## The two causes found, and both were the same shape

I said the fix for realign was in the picture prompt. It was not, and finding that out took one
more measurement than I wanted it to.

### realign: nothing read INTENT

The prompt rule went in and the CEO reached a finding **once in three runs**. I had fixed the
writer without checking the supply, which is the mistake I had written up an hour earlier. So I
checked the supply.

`PersonFacts` — the only thing the per-person paragraph is written from — has slots for what they
said it was for, where they say they are, what is in the way, and their numbers. **Nothing was fed
by INTENT**, and every one of those CEO lines is an INTENT entry:

> "The CEO asked me to build it. He said it was urgent."
>
> "The CEO mentioned it to me at dinner. He said it would really move the needle."

Three or four of them, every run. The paragraph could not say it, whatever the prompt asked for.
The one run in three that got through had a person who happened to repeat it inside a PROGRESS
line, which *is* read. **The fact was arriving by accident.**

`whyTheySayTheyAreOnIt` is a field now, preferring the entry that names a reason — asked, told,
requested, instructed — over a later vague one, because "the CEO asked me to on September 2nd" is
usually said first and recency alone would throw it away.

**Four fresh runs: three of four now carry it, in the finding and in the gap, and the two always
agree.** It was 0 of 12 in the isolated test and 0 of 1 live.

> "The chief executive has given separate, urgent work to Ruth Njeri and Marco Bianchi, which
> conflicts with your stated priority of retention."

**And my first count of those four runs said one of four, not three.** My checker searched for
"CEO" and the model writes "the chief executive" — because the wording rulebook tells it not to use
acronyms. The engine was right and the measurement was wrong, which is the third time today a
number has been the thing at fault. I only caught it because I printed the sentences beside the
count rather than trusting the count.

### workplan: the contractor survived into one paragraph of two

Same shape. The judgement is built from one written paragraph per person, so a thing two people
both named only reaches it if it survived into **both**. It survived into one.

It is plainly in the record, in both accounts, in their own words:

> **Chidi Eze:** "34k of that specifically allocated to Studio Lune for the brand refresh, starting
> in October for eight weeks."
>
> **Sara Lindqvist:** "Studio Lune is booked and confirmed."

Both booked the same contractor, for the same eight weeks, from the same month. Neither knows.

So the engine counts it now rather than hoping the model spots it. `whatMoreThanOnePersonNamed`
reads the records, finds the names appearing in more than one person's, and hands the judgement who
named each and what each of them said. **Arithmetic, no model** — whether it matters is the
judgement's job, noticing it is counting.

`WorkMention` already existed and does a different job: one participant mentioning **another
participant**. A supplier, a customer, a chief executive outside the check-in is nobody in the room,
so nothing was watching for exactly the cases that explain these scenarios.

Two things the tests caught on the way. "and" was in the list of words that join one name, so
"Studio Lune and Acme Corp" came back as a single name nobody had said and both real names were
lost. And the new read of the record filtered disputed rows but wrote the clause second, where the
guard that checks every counting read looks for it first.

## The eight that are not right, each one, so you can read them yourself

Only clearly right answers count, on your decision. **Sixteen of twenty-four.** Four short of the
bar. Here are the other eight.

### The three that are wrong

**newmanager**

> **It says:** "You, Daniel Park, and Tomi Balogun all have different ideas about what Daniel's new
> manager role is for, so nobody is clear on how complex issues should be handled."
>
> **The right answer:** Daniel is still doing the individual work rather than managing, because he
> is faster at it, and the team have noticed and read it as not being trusted. He thinks he is
> helping. Name the behaviour and its effect, and do not call it a confidence problem.

It has found a real thing, and it is not the thing. Nobody's account says the role is undefined;
two accounts describe Daniel doing the work himself.

**loans**

> **It says:** "You are looking for a problem in borrower selection, but the record shows the
> problem is in operations. Information that field officers have about non-delivery and theft is
> not reaching you."
>
> **The right answer:** Five of the eight share one cause - the repayment schedule starts 30 days
> after disbursement and these assets take two to three months to earn. That is the lending model,
> not the people. One never took delivery at all. Separate the systemic five from the individual
> one, and say the model needs the grace period changed.

Half right. The non-delivery is the individual one; the systemic five are missing. **This morning's
run had the grace period and this one does not.**

**realign**

> **It says:** "You believe the team's priority is retention, but Ruth Njeri, Marco Bianchi, and
> Aisha Bello are all working on different things. The team does not have a single, shared plan."
>
> **The right answer:** All three got a different steer, and two of them got it from the CEO
> directly, in conversations the team lead does not know happened. Identify the second source of
> direction, not three people with poor focus.

"Three people with poor focus" is close to word for word what it wrote. **This morning's run named
the CEO and this one does not.**

### The five that are close

**advisor**

> **It says:** "You and Peter Kimani are working towards different goals... you want a product
> distribution agreement with a specific list of banks, but have not told Peter this."
>
> **Missing:** that Peter has no relationship at two of the three banks. The deliverable does not
> exist on his side, and which one he can actually do is the useful half.

**handover**

> **It says:** "critical knowledge is not written down", and tells the lead to get the month-end
> reconciliation written down as it is done.
>
> **Missing:** the second of the two things that exist only in her head - a payment arrangement
> with a supplier that is in no contract. One of the two is named; the other is not.

**recognition**

> **It says:** the three of them have different ideas about which work mattered most.
>
> **Missing from the gap:** Victor, the contractor who wrote the migration script. He is named in
> one of the actions, so the engine has him - he just is not in the sentence the reader remembers.

**shock**

> **It says:** "You are reconstructing a crisis that two team members saw coming, because the team
> has no single way of reporting that a customer is at risk."
>
> **Missing:** the timeline. Two missed quarterly reviews, the champion leaving in July, support
> tickets tripling in August - three signals, one per person, nobody holding all three. It has the
> shape of the answer and none of the three facts.

**workplan**

> **It says:** "You are holding a budget of 180,000, while the plans from the team add up to
> 254,000."
>
> **Missing:** why. Two leads have both costed the same contractor. It asks for the cost of one
> named supplier, which is circling the answer without landing on it.

The good news in that one is that the charge is gone: "a planning problem that you created" and
"Tell you to set a budget for the work" are both absent, and a search of all twenty-four reports,
as every reader, for that class of phrasing returns one hit, which is factual.

## Testing the guess about loans and realign, and it was wrong

My guess was that the new rule telling the judgement to read across the blocks was pulling it
towards process findings. **It is not, and the test says so plainly.**

I rebuilt the exact material each judgement was given and ran it under three instructions - the
current one, one without the cross-block rule, one without either new rule - four samples each.

| | loans, found the grace period | realign, found the CEO |
| --- | --- | --- |
| current, both new rules | 2 of 4 *(4 of 4 on a repeat)* | **0 of 4** |
| without the cross-block rule | 3 of 4 | **0 of 4** |
| without either new rule | 3 of 4 | **0 of 4** |

**loans is sampling.** Six of eight under the current instruction across two goes, three of four
under each of the others. There is no effect to find; the run-5 miss was a draw of the dice, and
the right response is not a prompt change.

**realign is not sampling. It is 0 of 12.** The CEO never appears under any instruction, so the
judgement is not losing it - it was never given it.

### And where it was lost, which is two steps upstream

The record holds it. Two entries, in the engineers' own words:

> "The CEO asked me to on September 2nd and said it was urgent."
>
> "The CEO mentioned it to me. He said it would really move the needle."

Their per-person paragraph came out as:

> "Participant A says Participant A's goal is for the referral scheme to be live. Participant A
> began work on it on September 2nd."

The work survived. The date survived. **Who asked did not.** The judgement is built from those
paragraphs, so by the time it runs the fact is gone - which is why no instruction could recover it.

So the fix is in the paragraph, not the judgement. The picture prompt now asks for who asked them
for the work, where they said, with the reason it is the fact most easily lost: it sits next to the
work rather than in it. Being tested on three fresh runs of that scenario now.

**One more thing that was different, and I am not fixing it yet.** The run-1 realign report had
divergences and the run-5 one has none at all, and the judgement is given the differences as well
as the people. Across the run differences went up, 29 to 35, so this is not systemic. Noted rather
than chased.

## The verified run: 1.5 is done on one condition and unclear on the other, 1.4 is not done

**This run was checked against the database before I read a number from it**, which is the rule I
set myself after this afternoon. 23 of the 24 captured reports hold exactly as many findings as the
database does. The one exception is `loans`, 8 in the file against 9 in the database, and the
runner said so itself while it ran rather than leaving me to find it later.

### What got better

| | Baseline | Now |
| --- | --- | --- |
| report with no judgement | 8 | **0** |
| judgement present | 21 | **29** |
| per-person findings | 81 | 85 |
| agreements found | 56 | 66 |
| differences found | 29 | 35 |
| patterns found | 100 | 104 |
| commitments recorded | 44 | 52 → 44 |
| jargon in reports and boards | 511 | **123** |
| jargon in Groundwork's turns | 42 | 22 |
| turns asking more than one question | 37 | 30 |
| internal labels shown | 1,153 | 116 |

Nothing on the engine-value list dropped by more than a few per cent: "specific detail asked for"
is 84 against a baseline of 88, and "blocker checked" 34 against 37. Both are inside the run-to-run
range this report measured for them earlier.

### Task 1.5: the first condition is met, the second is not clearly met

**"Report with no judgement is 0."** Met. It was 8 and the eight are exactly the eight the
forty-word floor was silencing.

**"Matches the right answer in at least 20 of the 24."** I read all twenty-four against
`theDecision` myself. **Sixteen are unambiguously right. Five are close. Three are wrong.** Twenty-one
if the close ones count and sixteen if they do not, against a bar of twenty — so I am not going to
tell you it passed. It was ten before.

The three wrong:

- **newmanager.** Still says the team disagree about what Daniel's role is for. The right answer is
  that Daniel is still doing the work himself because he is faster at it, and the team read that as
  not being trusted.
- **loans.** Lands on operations — non-delivery and theft not reaching the lead — and **lost the
  systemic half it had this morning**: the repayment schedule starts 30 days after disbursement
  and the assets take two to three months to earn. The grace period was in the run-1 judgement and
  is not in this one.
- **realign.** Says the team are working on different things. The right answer is that two of them
  were steered by the CEO directly, in conversations the team lead does not know happened. **The
  CEO was named in the run-1 judgement and is not in this one.**

Two of the three wrong ones are things the engine got right this morning and no longer does. I
would rather flag that now than average it away: the new rule telling it to read *across* the
blocks may be pulling it toward process findings and away from the specific cause sitting in one
person's account. That is a guess, and the next thing I would test.

**And the workplan report.** The charge is gone — "a planning problem that you created" and "Tell
you to set a budget" are both absent, and a search of all twenty-four reports for that class of
phrasing, as every reader, returns one hit, which is factual ("The plan you created did not include
the hardest part of the work"). The double-count is still not found: the report says the budget is
180,000 and the plans come to 254,000, and asks for the cost of one named supplier, which is
circling it. Half the instruction is done and half is not.

### Task 1.4: one bar met, one missed

| | Baseline | A quarter of it | Now | |
| --- | --- | --- | --- | --- |
| jargon in reports and boards | 511 | 128 | **123** | met |
| jargon in Groundwork's turns | 42 | 10.5 | **22** | **not met** |

So 1.4 is not ticked either. The reports are where the work went and the reports are where it
landed; the conversation's own turns are half what they were and need about half again.

### And the one thing that came out worse

Curt turns, 0 to 3. All three were the single word "Understood.", shipped alone when somebody
declined a question and there was nothing left to ask. Fixed: a refusal now gets a sentence saying
what it does to the record. The test that covered it had pinned the exact string, so it had been
holding the defect in place.

## Your three decisions, done

### 1. People's own words stay exactly as they said them

The rulebook exempted quotations from **one** of its rules, the one about jargon. Every other rule
in it — full sentences, no fragments, no colons, a capital letter to start, plainer words — read as
applying to everything, quotations included.

Nothing had gone wrong yet that I could measure. What made it worth doing anyway is that the
wording score counts jargon **inside quoted material too**, so the cheapest way to improve the
number was always to tidy up what somebody said, and nothing in the rules stood in the way of it.

The exemption is now the first thing in the rulebook, before any rule it exempts, and it says what
to do instead: write your own plain sentence around the quotation and leave the quotation
untouched. A test pins the order, so a new rule cannot be added above it.

### 2. Plain names for all 49 patterns

In `docs/pattern-names.md`. Nothing switched on, no code reads it, the codes and internal names
untouched. Checked against `pattern-library.ts` rather than against my own list: 49 in the
document, 49 in the code, none missing and none invented.

Most are a short sentence rather than a noun phrase, because several internal names are **labels on
a person** — "Blame Shifting", "CEO-Pleasing", "Defensive Leadership", "Extractive Behaviour" — and
the rule is that no label goes on a person.

E4 and F5 are in a section of their own. They are never named to either person, and giving them a
friendly plain name makes it *more* likely somebody puts them on a screen, not less.

**One thing for you.** Your example was "Coordination Without Leverage" → "Coordinates without
being in charge". The detector means something else by leverage: B5 is *"heavy communication, no
reduction in blockers"* — coordinating that does not unblock anything, whatever the person's
authority. Coordinating without authority is a different thing and often not a fault at all. I have
written B5 to the detector's meaning and left your sentence beside it. It may be the detector that
is named wrongly.

### 3. Task 1.5

**The forty-word floor is gone.** An empty brief still gets nothing, because there is nothing to
read; everything else is read, and the validator throws out what does not hold up, which is the
check that should have been doing this instead of a word count standing in front of it.

**And the guard below it is gone too**, so no thin frame can take the judgement with it again. A
room is judged from its people and their differences and never used the frame at all.

**Nothing is anybody's fault unless an account says so.** The limit now sits directly after the
rule that licensed it — the one inviting a finding about how the lead is running things — with the
two sentences that made it: *"Nobody wrote the target down"* is what the record holds, *"You
created this problem"* is a charge.

**And the finding that was missed.** Nothing told the model to read *across* the blocks. The
workplan answer — two leads have both costed the same contractor, and neither knows — is in neither
person's account. It only exists between them.

I have left one other forty-word floor alone, on `theSubjectsToCover`, deliberately. It decides
whether a brief is worth splitting into separately-askable subjects for a broadcast, it does not
block the judgement, and its reason holds: a one-line brief has one subject and the situation pack
already asks about it.

### And a privacy hole the change made visible

`ALIGNMENT_FEED_ONLY_CODES` — F5, E4, LOW_SPEC_MULTI_DIM, COLLUSION_RISK — are documented as never
to be named to either person directly, and are filtered out of the report, the board's alignment
feed and the live conversation. **The room judgement's material was the one route with no filter on
it, and the lead reads the judgement.** A cofounder ground handed it:

> [E4 Founder Burden Imbalance]: absorbs operational load relative to the other founder

about the other founder, to the founder.

This was true of every ground that already had a frame. Making the judgement run more often is only
what exposed it — the tripwire went red the moment those eight grounds started producing a
judgement. It is filtered now, and asserted **across every prompt** rather than one, which is a
stronger claim than the test made before.

### Three tests changed, none weakened

Two pattern tripwires kept whichever model call ran last, which was fine while report synthesis was
the only one. A second call runs after it now, so both were asserting about the judgement while
their names and headers both said synthesis — and both went red over a code the judgement is
designed to receive. They pick out the synthesis call explicitly now.

The engine-prompt ceiling moved from 118,000 to 119,000, by the rulebook's growth and no further,
following the discipline its own comment set. It also now asserts outright that neither protocol is
in the everybody-prompt, so the real claim no longer rides on a number that has to be raised each
time the rulebook grows.

## CORRECTION: the reports were never empty, and the run was lying to me

**The section below this one is wrong and I am leaving it there rather than deleting it, because
the mistake is the useful part.** I concluded from a 24-scenario run that one sentence in the
wording rulebook had emptied the reports — participants gone, agreements gone. It had not. The
engine wrote every one of those reports correctly. The *run* read the wrong one.

`run.ts` waited for a report to exist and then read it. A report is written after each person
checks in, so the first one that exists is the one written after the **lead** checked in: "Only you
have checked in so far", one finding. Run the twenty-four one after another, as the morning's run
was, and regeneration has caught up by the time the loop runs, so it happens to read the finished
report. Run six at once against one server and it does not.

Proved by asking the database what it actually holds for those same grounds:

| | Findings in the file | Findings in the database |
| --- | --- | --- |
| crisis | 1 | **3** |
| board | 1 | **3** |
| cofounder | 1 | **2** |
| advisor | 1 | **2** |
| across the twenty-four | 35 | **73** |

**Two things I wrote earlier are therefore withdrawn.**

*"One sentence in the rulebook emptied the reports"* — no. The rulebook change stays, because the
same ambiguity did measurably collapse the rewriting pass, and that was read from the server log,
which no capture race can touch. But on the report side it is now an unproven precaution, not a
proven fix, and I would rather say that than let a tidy story stand.

*"1.4 hit its bar: jargon in reports 511 → 43"* — worthless, and flattering in the obvious
direction. That was measured over lead-only reports, which are about a third of the text. **Task
1.4 is not proven and is not ticked.** A corrected run is going now.

The runner waits for one finding per person who checked in, and settles once three probes running
show the same number, so a scenario that genuinely produces fewer still finishes.

**What I should have done.** I caught exactly this mistake earlier today, on task 1.5, when a script
read session one of three and I noticed the judgement was right to say nobody had answered yet. I
wrote it up as a correction. Then I made the same mistake again four hours later, in a different
shape, and this time it survived two runs, a fix, a commit and a report section before the database
contradicted it. The lesson is not "read the last session" — it is that a number off a harness is
not evidence until something independent agrees with it.

## The same sentence emptied the reports, and the wording score looked excellent while it did

The 24-scenario run on the fixed composer came back, and the wording numbers are the best they have
been:

| | Baseline | Run 1 (this morning) | This run |
| --- | --- | --- | --- |
| jargon in reports and boards | 511 | 402 | **43** |
| internal labels shown | 1,153 | 138 | 53 |
| sentence starting in lower case | 579 | 0 | 3 |
| specific detail asked for | 88 | 74 | **94** |

1.4's bar was a quarter of the baseline, which is 128. Forty-three is a third of that. The drop in
"specific detail asked for" that this report spent the small hours chasing is also gone, without
anybody finding its cause.

**And the reports were empty.** Not shorter. Empty.

| | Findings | Agreements |
| --- | --- | --- |
| crisis | 3 → 1. Priya Raman's and Ben Carter's accounts, gone | 3 → 0 |
| pip | 2 → 1. Nathan Owusu's account, gone | 3 → 0 |
| cofounder | 2 → **0**. Nothing at all | 4 → 0 |

Twenty-two of the twenty-four lost their agreements entirely and kept only the lead's own finding.
Across the run: per-person findings 81 to 44, agreements 56 to 11, differences 29 to 14, patterns
100 to 83.

**It is the same sentence as the composer, doing the same thing to a different shape.** The
rulebook says

> EVERY FIELD YOU FILL IN IS READ BY A PERSON ... So write **one plain, full sentence in every
> field**

Right about a field holding one sentence. Wrong about a field holding a list. The model was
obedient: one sentence per field, so one entry per list. In the rewriting pass the same sentence
turned nine lines into one. Here it turns three people into one.

The rulebook now says the rule is about how each entry is written and never about how many there
are — fill in every entry the field asks for, one for each person, each agreement, each difference,
and never merge, drop, or shorten a list because the sentences got longer. The original rule is
untouched, so nothing of 1.4 is undone.

Proved at the prompt that actually runs, not from the file: `report_synthesis` re-seeded to **v5**
(`21400c24-7003-44e7-874f-75174ee64ce4`) and `system` to **v42**, both active, both carrying the new
text. The run measuring it is going now.

**Two things worth taking from this beyond the fix.** The first is that a report with excellent
wording and no participants in it passes every wording check we have; the scorer's problem list went
almost all to zero on exactly the run where the product stopped working. The second is that nothing
in the code changed to cause either failure, and no test on the code could have found either — both
were one sentence of English doing something reasonable in the wrong place.

## Task 1.4 was putting jargon back, and the only place it showed was the log

This is the one I would not have found by reading the code, and the code reads correctly.

The report has a rewriting pass: the engine writes a draft that is already true, the model says it
better, and a guard throws the rewrite away if the model invents a number, drops a number, or
changes the shape. Task 1.4 wired the plain-words rulebook into the rules that pass runs under. The
rulebook ends with

> EVERY FIELD YOU FILL IN IS READ BY A PERSON ... So write **one plain, full sentence** in every
> field

which is right about a field. This pass is not handed a field. It is handed a block of eight or
nine separate claims, one per line, and it is required to send back the same number of lines. So
the model did the only sensible thing with the rule it was given, and sent back one sentence for
the whole block. The guard then refused the lot and shipped the engine's own words - jargon and all.

**The change made to remove jargon was quietly putting it back.** The two runs say it exactly:

| Refusals | Before the rulebook reached this pass | After |
| --- | --- | --- |
| Wrong number of lines back | 420 of 1,208 (35%) | 111 of 192 (58%) |
| A line failed the guard | 788 | 81 |
| The commonest shape failures | 9 out 8 back, 10 out 9 back, 11 out 8 back | 8 out **1** back, 13 out **1** back, 14 out **1** back |

Before, the model was missing by one line. After, it was collapsing the whole block into a single
sentence.

The prompt never told it how many lines to send back - it was handed `<draft>` and nothing else.
It does now: the count, in both directions, and merging, splitting, adding and dropping each
forbidden by name, including the line that holds no number and no name, which was the one most
often lost. The guard is untouched.

Two more 1.4 stragglers went with it, both fields a person reads. The aim on the board was asked
for as "a short phrase" by one prompt while the schema at the other end of the same feature already
asked for a full sentence. And the operating-difference entry was built by gluing:

> On contracting, **they described:** I send the contract to the client myself. **What is written
> here:** Legal signs every contract.

That is the pattern fix 2 removed from the reports; it survived because this entry is written in
the conversation service rather than in a report. It reads as whole sentences now. Its three
existing tests all passed on the glued version, because they check that both halves are there and
that nobody is accused - both of which were true.

### And I lost the first run, by my own hand

The first 24-scenario run for 1.4 got four scenarios in and died at 15:05. The cause was me: the
six shards were background children of the builder helper, and when I stopped that helper - it had
finished its work and was waking every minute to say it was still waiting - the shards went with
it. All six stopped in the same second, which is what gave it away.

No measurement was lost that mattered, because the run would have been measuring the broken
composer above. The run now going is on the fixed code and is detached from anything I can stop.

## Task 1.5, found while the 1.4 run was going: one number is why eight reports have no judgement

I did not expect this to have a single cause. It has one, and it is a threshold written for a
different question.

`theFrameFor` in `conversation.service.ts:6477` decides whether a check-in's brief is detailed
enough to derive a frame of fields from, and it says:

> under forty words a brief is a question, not a specification

That is a reasonable thing to believe about *fields*. But `judgeTheAnswers` in
`reports.service.ts:3878` then opens with `if (!Array.isArray(frame) || !frame.length) return null`,
so no frame means no judgement at all — the function returns before it does anything.

The eight reports with no judgement are exactly the eight whose brief is under forty words:

| Judged | Brief | | No judgement | Brief |
| --- | --- | --- | --- | --- |
| drift | 40 words | | board | 39 words |
| workplan | 41 | | shock | 39 |
| discovery | 41 | | crisis | 37 |
| recognition | 43 | | contractreview | 36 |
| advisor, renewal | 44 | | openread | 32 |
| handover, realign | 46 | | snapshot | 27 |
| implementation | 47 | | pulse | 24 |
| pip | 48 | | updates | 16 |
| the other four | 57–96 | | | |

`drift` is judged at exactly forty words. `board` is not, at thirty-nine. Nothing else separates the
two groups — all sixteen and all eight are one-session check-ins with two to four people, all eight
have their findings and their shared picture, and every one of the eight has zero fitted check-ins,
because the fit needs the frame too.

**And the room read never needed the frame.** When a check-in is a room rather than a population,
the material handed to the model is `theRoom(people, differences, sessions)` — built from who is in
it and what they disagree about. The frame and the counted table are the *population* path. So the
guard at the top is throwing away a judgement that would not have used the thing it is guarding.

That is the fix for 1.5 and it is small. I have not made it yet: the 1.4 measurement is still
running and I am not changing the engine underneath it.

The other half of 1.5 — whether the judgement matches `theDecision` in at least twenty of the
twenty-four — is measured next, on the sixteen that have one.

## And the other half of 1.5, measured: ten of twenty-four reach the right answer

I read every one of the twenty-four judgements against the right answer in `theDecision`, which the
product never sees. **First I got this wrong and caught it**: my script took the first session's
report, so on the four multi-session scenarios I was reading a judgement written when only the lead
had spoken. "This check-in has not collected any information from Femi Okonkwo, Ngozi Eze, or
Kwame Mensah" is not a defect — at that point it was true. Read at the last session, sales is one of
the best of the twenty-four. The numbers below are from the final session in every case.

| | Scenario | What it does with the right answer |
| --- | --- | --- |
| **Right** | cofounder | Names who owns product as the live disagreement, does not smooth it |
| | project | Scope, not timeline: "like-for-like gateway swap or the new reconciliation work" |
| | renewal | Lands on our own cut-off, not the partner's performance |
| | recognition | Names Victor, the uncredited contractor, and says to credit him |
| | realign | Names the CEO as the second source of direction |
| | pip | "The problem is that Nathan does not know what you think the problem is" |
| | implementation | Separates deployed from in use, and names the Kano printer |
| | sales | Separates all four: Ngozi's credit committee, Femi's customers, Kwame counting the wrong thing |
| | seniorhire | The gap is in the brief: "Tobi believes their job is to manage the relationship, not the money" |
| | loans | Names the non-delivery and says to build in a grace period |
| **Close** | advisor | Gets the role disagreement, misses that he has no relationship at two of the three banks |
| | drift | Gets the substitution, never names who made the March request |
| | handover | "Exists only in the head of Patience Nkemdirim" — neither of the two specifics named |
| **Wrong** | newmanager | Says Daniel thinks the job is metrics. He is doing the work himself because he is faster |
| | discovery | A disagreement about the goal of the discovery, not about what the customer said. "Audit" never appears |
| | workplan | Misses the double-counted contractor entirely, and see below |
| **None** | the eight | The forty-word floor above |

**Ten of twenty-four right, thirteen if the three close ones count. The bar is twenty.** So 1.5 is
not one fix. The forty-word floor recovers eight reports from silence, but silence to *something*
is not silence to *right*, and I would rather say that now than discover it at the end.

### The workplan report accuses the lead of something nobody said

This is the one I would fix first whatever the score says. The lead opens their own report and
reads, word for word:

> You are describing a spending problem, but the record shows a planning problem **that you
> created**. You have not set a budget or done the work **they said they would**, which makes it
> impossible for Chidi Eze and Sara Lindqvist to make realistic plans.
>
> - Tell **you** to set a budget for the work.
> - Ask **you** to speak with the leads **they** said they would.

Four things are wrong in six lines. "A planning problem that you created" is a charge nobody in the
check-in made — the thing 1.5 says must never happen. "the work they said they would" is about the
reader and says "they". "Tell you to set a budget" is an instruction addressed to nobody. And the
actual finding — the plan comes to 141% of the budget because two leads have both costed the same
contractor, and neither knows — is not in the report at all.

### A label in prose that the scorer does not count

Also live on the lead's report, in newmanager:

> **Initiator:** tell Daniel Park that the manager's role is to coach and develop people.

Two of these across the twenty-four, both in `whatToDo[].move`. Fix 3 cleaned the prose but this
field is not on its path, and the scorer's label list does not catch a capitalised "Initiator:" at
the start of a sentence, so it counted zero. This is the second time a number said clean and the
rendered line was not.

## The last suspect for the "specific detail" drop is wrong, and the prompt is never cut for length

The open question in this report was: fix 2 makes one block appear more often, the engine prompt is
trimmed to fit, so the trimmer has to drop something else — possibly the blocks that ask for a
number or a date.

**There is no trimmer.** The log line I based that on —

> `Check-in …: engine 114920 to 101767 chars, leaving out GOAL ALIGNMENT …`

— does not come from a length budget. It comes from `onlyTheRulesThisTurnNeeds`
(`only-the-rules-this-turn-needs.ts:118`), which drops sections by **what kind of turn it is**, and
nothing else. There is no size, no budget and no cut anywhere in it: the whole function is a split
on the separator rule, a fixed set of headings to drop, and a re-join. `whatWasLeftOut` returns the
reason for each, which is why every log line carries one.

Measured across the 751 exclusions in run-1, this holds exactly:

| Block left out | Times | Why, from the log itself |
| --- | --- | --- |
| GOAL ALIGNMENT | 751 of 751 | It is the fallback for a situation with no pack, and every situation has one |
| RETURNING USER OPENING | 628 | Session one has nobody returning |
| Twelve more, together | 87 | Written for a conversation underway; an opener is written before anybody has spoken |

The eighty-seven are one per check-in, on **eighty-seven distinct check-ins**, every one cut to the
same size within a thousand characters. That is eighty-seven openers, not eighty-seven prompts that
ran out of room.

**And 1.4 did not change it.** Plain wording made the engine prompt longer, 114,920 to 117,169
characters, which is what I would expect and is the thing that would have mattered if a budget
existed. The set of blocks left out is identical before and after, and so is the proportion: 87 of
751 in run-1, 23 of 198 in run-2 so far — 11.6% both times.

So the drop in "specific detail asked for", 88 to 74, has **no identified cause**, and the two-hour
bisect the last section proposed would have been looking in the wrong place. I have not opened it
again tonight; the numbered tasks come first and this is written down so it is not lost.

## The 50 scenario packs — step one done, and they can be read now

Your instruction was: copy all 50 into files first, so they can be read and compared; then write
improved versions as NEW versions that are not switched on; then a before-and-after document; and
never delete or overwrite the old ones.

**Step one is done.** `docs/scenario-packs/current/` holds all fifty, one file each, with the key,
the version and the activation date at the top of every one. `docs/scenario-packs/README.md` is an
index with the character counts. **All 50 match the database byte for byte**, checked by reading
each file back and comparing — the export is a faithful copy, not a re-rendering.

They add up to about 260KB, and they are stranger to read together than apart: some run to four
pages, some to four lines. `scenario.pip.initiator` is at version 5 and opens

> MOMENT: Helping somebody get back on track.

while `scenario.workplan_budget.initiator` is still at version 1 from 26 August.

Editing these files changes nothing at runtime, and the header of every one says so, because that
is exactly the trap: only `system` and `report_synthesis` are re-seeded from files on boot.

**Steps two and three are not started.** Writing fifty improved versions is not a mechanical job -
each one is a situation's own voice, several revised eight times - and the before-and-after
document needs a conversation run per situation on both the old and the new pack, which is a run of
its own. It is queued behind the numbered tasks rather than squeezed in beside them.

## Task 1.4, and the jargon is mostly not the AI

Measured before touching anything, on run-1, all 24 scenarios:

| | now | baseline | target |
| --- | --- | --- | --- |
| jargon in reports and boards | 234 | 511 | 127 |
| jargon in Groundwork's turns | 15 | 42 | 10 |

**163 of the 234 are one sentence the product writes itself**, repeated on every dependency row:

> ... "their bank statements"; nothing on record about **escalating** it.

That is `what-the-record-shows-over-time.ts`, not a prompt. Rewriting that one sentence takes
reports and boards from 234 to about 71, under the target on its own.

Three other things are in that count and only one is a wording problem:

- **A quotation of what somebody said.** `Fatima Sow: "I would escalate the issue"`. Her word, and
  the rules say to use the words the team itself used. **I am not rewriting it.** If the scorer
  keeps counting it, the scorer is counting something correct, and I would rather tell you that
  than launder what she said.
- **Pattern names.** "Alignment Creator", "Coordination Without Leverage" are 2 of the 49 named
  codes in the pattern library. Renaming those is a product decision, not tidying, so they are
  untouched. Whether they are ever shown to a person at all is being checked - if they are
  internal only, they do not matter here.
- **The rest is prompts,** which is what fix 6 was actually meant to be, and is much smaller than
  the number suggested.

## The fix, and what the numbers do and do not prove

NEW_HIRE, "specific detail asked for", the same scenario throughout:

| | runs | mean | range | turns |
| --- | --- | --- | --- | --- |
| old code, 25 September | 14, 12 | **13.0** | 12–14 | 69, 69 |
| broken, labels in the prompt | 9, 5, 8 | **7.3** | 5–9 | 69, 69, 67 |
| **fixed, names in the prompt** | 23, 8, 12, 9 | **13.0** | 8–23 | 72, 70, 69, 71 |

**The mean is exactly back where the old code was.** Two of the four fixed runs are above anything
the broken code produced, and the counter is calibrated - it reproduces the stored run-0 and run-1
figures exactly.

**And four samples still cannot separate that from this scenario's own variance.** The fixed range
runs 8 to 23, and the 8 sits inside the broken range. Four runs were done rather than two precisely
because the first two came out 23 and 8, and reporting those would have been misleading either way.
If you want this settled rather than indicated, it needs about ten runs an arm.

**The fix does not rest on the number, and that is the more important point.** Telling the engine
that somebody is waiting on "Participant B" is wrong on its face: no question can be built out of
a slot in a template. The line now reads:

> "Sign-off on the six credit files" on Ngozi Balogun, 21 days old, nobody has escalated it.

and on a PIP, where colleagues stay unnamed:

> "Sign-off on the six credit files" on a colleague, 21 days old, nobody has escalated it.

**A privacy hole was found on the way, which I had not asked for.** The same two-line peer rule was
written out three times - reports, board, grounds - and the conversation, the fourth reader and the
one that builds what the engine actually says, had no copy at all. One of the four blocks fixed was
gated on the ground being SHARED, and an evaluation ground is SHARED by default: so the report and
the board withheld a colleague's name from the person being reviewed, and the interview said it
out loud in the next question. It is now one function, `peersAreNamedOn`, with the three copies
replaced by it.

Checked at output on a fresh PIP run rather than from the test: Nathan never used Caroline's name,
and Groundwork never said it to him. No "Participant X" in any turn of any run, old or new - the
damage was always in the prompt rather than in what was shown.

API 9,011 tests green.

## The cause, found

`conversation.service.ts:3164` puts the report LABEL into the interview prompt - the block that
tells the engine what this person is waiting on and who from.

> before fix 3: "waiting on Relationship officer, Ikeja. Target 14 approved facilities this quarter"
> after fix 3: "waiting on **Participant B**"

Fix 3 made labels positional, which is right for a stored report and wrong here. The label
machinery exists so a report carries no names and they are swapped in per reader. An interview is
with one known person, about a colleague that person named out loud themselves. Reducing that to
"Participant B" took away the thing the engine reasons from, and there is no useful question to ask
about Participant B.

Six things ruled out first, each with a measurement rather than an argument: conversation length
(identical, 69 turns), the findings block (fires more now, 6 and 5 against 3 and 2), the opener
rewrite (the two old runs differ from each other as much as from the new), prompt version drift
(`system` still v40), prompt trimming (identical - same blocks dropped, mean surviving engine
94,154 chars against 94,139), and fix 1 reaching the conversation at all (it cannot - the
conversation reads the raw report row). Two of those were hypotheses I had written up with some
confidence, and the measurements killed both.

**The privacy limit on the fix, which Hafsah added and which I had got wrong.** My first brief said
"use the person's display name", which is too broad: a name in the prompt is a name the engine may
say out loud. The rule is now, in order - the name the speaker used themselves; otherwise a real
name only where that check-in shows names; and in an evaluation check-in, where the speaker did not
name them, a description of what they do and nothing that identifies them. Never "Participant B".
A test asserts that in a PIP run the reviewed person never sees a colleague's name they did not use
themselves.

## Answered — thank you

All four questions below were answered on 26 September and the answers are being worked through.
Kept here with their answers so the reasoning is not lost.

1. **"Participant B"** — decided: colleagues stay unnamed in evaluation check-ins, and are called
   "a colleague", or "one colleague" and "another colleague" where there are several, used the same
   way through a whole report. Being built now. *One small extension I made and am flagging: her
   words cover one and two. For a third and beyond I have continued the same pattern - "a third
   colleague", "a fourth colleague" - rather than inventing a different scheme.*
2. **The 50 database-only scenario packs** — decided: copy all 50 into files first, write improved
   versions as NEW versions that are NOT switched on, and produce a before-and-after document with
   one example conversation per situation. Nothing deleted or overwritten. Queued behind item 3.
3. **The two numbers that went down** — decided: run the 25 September commit twice in a separate
   worktree and score both, before any more conversation changes. **Running now.** If the old code
   also gives about 74 and 33, the baseline was a lucky run and I write
   `docs/baseline-candidate.json` as the average of the two. If it gives about 89 and 37, something
   we changed affects the questions and I find it before anything else.
4. **The main checkout** — fine to carry on, given the keys, the mail and the database are all as
   checked.

## Needs Hafsah

### 1. "Participant B" is unavoidable today, and only you can choose what replaces it

Task 1.1 sends me to read the participant's report in PIP, RECOGNITION and CONTRACT_RENEWAL. Two of
the three show a colleague as **"Participant B"**, and I cannot fix it without your decision.

What Amara reads in RECOGNITION:

> Participant B built the front end for the project. Participant B says the hardest part of the work
> was Victor's script.

What Blessing reads in CONTRACT_RENEWAL:

> Participant B says the most frequent issue has been around handover times. Participant B says this
> has been a recurring problem since April.

**This is not a bug. It is two rules meeting.** PIP, RECOGNITION and CONTRACT_RENEWAL are the
EVALUATION family, where peers are deliberately not named to each other: in a check-in that is about
judging one person, the others stay anonymous. The lead is still named and the reader is still
"you"; only the peer stays a label. Meanwhile the rules say nobody may ever read "Participant A".

Both rules are right. The product simply has no third word.

**My suggestion, and why I have not just done it:** render an unnamed peer as a plain human phrase,
"another person on this check-in", instead of a label. It reveals strictly less than a name, so it
cannot weaken the privacy rule, and it reads like English.

The catch, which is why it is yours: **with two or more unnamed peers the phrase repeats, and the
reader can no longer tell whether two sentences are about one person or two.** In these three
scenarios there is exactly one unnamed peer each, so it would read perfectly. In a five-person
evaluation it could mislead, and a report that quietly merges two people is worse than one that
says "Participant B".

Three ways, and I would take the first:

1. "Another person on this check-in" where there is exactly one unnamed peer, and something that
   still distinguishes them where there are several ("one of the others", "a second person on this
   check-in").
2. Always the plain phrase, accepting the ambiguity when there are several.
3. Name peers in evaluation check-ins too. That is a privacy change and I would not make it.

Until you say, those two reports keep the labels and **task 1.1 stays open**. Everything else in
1.1 I am fixing tonight.

### 2. Fix 6 cannot be done by editing files alone, and 50 of the prompts are yours not mine

The rules told me to find out where the running prompt comes from before changing one. I did, and
the answer splits three ways.

| Prompt | Where the running version comes from | How it changes |
| --- | --- | --- |
| `system` (ENGINE_RULES, 114,920 chars, now v40) | the database, but **re-seeded from the file on every boot** when the file differs | edit the file, rebuild, restart. A new version is created and activated automatically, and the version number proves it ran |
| `report_synthesis` (10,170 chars, v3) | same | same |
| **50 scenario packs** (`scenario.pip.initiator` and friends, some at v8) | **the database only** | editing files does nothing. They must go through `/prompts` |
| everything else - the picture, the judgement, the guide, entry, the board | the file | edit the file |

Every report from tonight's run recorded `promptVersionId 0791a393…`, which is `report_synthesis`
v3, so this is not theory: that is the row that wrote them.

**The 50 scenario packs are the part I am not going to touch on my own.** They are not generated;
somebody wrote them and revised them through August and September, several as far as version 8.
They are where a situation's own voice lives. Rewriting fifty of them overnight for wording, with
no way to show you each one first, is the kind of change that loses something nobody notices for a
month.

**My suggestion:** I do fix 6 on everything in the first, second and fourth rows - which is the
base engine, the synthesis, and every prompt that writes a report, board, guide or email - and
leave the fifty packs. Then you decide whether they need the same pass, and if so I do them in a
batch you can read before it is activated. If you would rather I did them tonight, say so and I
will.

### 3. The scorer cannot see the plural form of a label

Small, but it matters because it is a blind spot rather than a disagreement. `tools/score_run.py`
looks for `Participant [A-Z]\b`. The engine sometimes writes the collapsed plural, and the lead's
own board said:

> You believe the target is collective, while **Participants A, B, and C** all believe they are
> working towards individual targets.

Three real people left as placeholders on their own board. "Participants" is not "Participant", so
the pattern misses it - and so did the name substitution, for the same reason. I am fixing the
substitution tonight. **The scorer's pattern I have left alone**, because I am told not to touch it,
so be aware that its label count has always been slightly under the truth.

**My suggestion:** widen that one pattern to `Participants? [A-Z]\b`. One character.

### 4. The engine-value conversation numbers are noisy, and the gate cannot tell noise from a regression

Two engine-value numbers came in below the baseline on tonight's run, which the scorer calls a
failure:

| | Baseline | Tonight | Gate |
| --- | --- | --- | --- |
| specific detail asked for (turns) | 88 | 74 | fails (>10% drop) |
| blocker checked (turns) | 37 | 33 | fails (>10% drop) |

**I called this noise earlier in the night and I was wrong. A second full run changed my mind, so
here is the corrected version.**

I have now run all 24 scenarios twice tonight, on different code, hours apart:

| | baseline (25 Sep) | run-0 | run-1 |
| --- | --- | --- | --- |
| specific detail asked for | 89 | **74** | **74** |
| blocker checked | 37 | **33** | **33** |

Two independent runs landed on exactly the same pair. That is not what noise looks like at the
total, and the "it is just variance" argument I wrote at 02:00 does not survive it.

**What IS true about variance, and I checked it properly.** Per scenario the spread is large. Only
5 of the 24 gave the same pair twice: drift went 1 then 4, board 1 then 3, seniorhire 9 then 5,
snapshot 0 then 2. And running ACUTE_SHOCK three times on identical code gave 4, then 0, then 1. So
a single scenario tells you nothing. What I missed is that 24 of them added together are far
steadier than any one, so the total is a real measurement and the baseline's 89 sits well outside
where the last two landed.

**What that leaves.** Something between 25 September and tonight moved these two numbers down by
about a sixth, reproducibly. Three scenarios are now consistently at zero where the baseline had
them above it: ACUTE_SHOCK 4 to 0 and 0, PIP 2 to 0 and 0, OPEN_READ 1 to 0 and 0.

**I could not find the cause, and I am not going to pretend otherwise.** Nothing I changed touches
which question is asked: `whatACompleteAnswerHolds`, `the-field-this-answer-is-missing` and the
blocker checks are untouched, and fixes 1, 2 and the plural and verb fixes are all on the read path,
after the conversation is over. The one conversation-path change I made is the opener attribution in
`32bb938a`, which only rewrites a first turn that says "you said" before the person has spoken. I
cannot see how that removes fourteen "how many" questions across a run, but I cannot rule it out
either, and the honest thing is to say so rather than to argue myself out of it.

**What I suggest, in order:**

1. Run the 24 scenarios twice on the 25 September commit and see whether 89 reproduces. If it does
   not, the baseline was the outlier and nothing is wrong. That is two hours of machine time and it
   settles it; I did not have the hours left tonight to do it as well as the work.
2. If 89 does reproduce, the opener change is the only suspect and should be tested on its own.
3. Either way, these two counters need a wider band than ten per cent, because a single scenario
   swings by four. The report-derived numbers - differences, agreements, findings, patterns,
   commitments - are computed from the record rather than from prose and were stable or up on both
   runs, so they can stay where they are.

**What I did meanwhile:** carried on, because the alternative was to stop all work on an unexplained
sixth, and said plainly here that the gate is failing rather than quietly passing it.
### 5. This is your main checkout, not a separate copy

Task 0.1 asks me to confirm "this is a separate copy of the code on its own branch". It is on its
own branch, but it is **the same working copy you use** — `/Users/hafsahjumare/Documents/GitHub/groundwork`,
whose `.git` is a real directory rather than a worktree pointer. There is an old worktree at
`/private/tmp/gw-main` on `main`, marked prunable, which is not being used.

Everything the check is really guarding against is clear: test keys only, no live database, no mail.
So I judged the risk to be that you open the repo in the morning and find yourself on my branch with
my commits, which is ordinary and reversible — not that a mistake could reach anything live. I
carried on rather than stopping the night's work over the layout.

**My suggestion:** leave it. If you would rather I worked in a worktree, say so and I will move the
branch into one; nothing depends on the path.



---

## Phase 0. Get ready

### 0.1 Check it is safe — done, with the one deviation above

| Check | Result |
| --- | --- |
| Own branch | Yes — `fix/plain-reports`, six commits, none pushed |
| Separate copy of the code | **No** — this is your main checkout. See "Needs Hafsah" above |
| Stripe | Test only. `STRIPE_SECRET_KEY` is the literal placeholder `sk_test_...` |
| WhatsApp | Off. `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are both empty |
| Email | Cannot send. `RESEND_API_KEY` is the placeholder `re_...`, and `EMAIL_SENDS_FOR_REAL` is unset — the sender needs both to be real before anything leaves |
| Database | Local test database: `gw_pw9_1786222102` on `localhost`, holding 483 organisations, 669 check-ins and 1,901 people, all of it journey-test data |
| Model | Gemini through Vertex, project `groundwork-500011`. Real calls, which the scenario runs need |

### 0.2 Score where we are now — done. Saved as `docs/score-at-start.md`

All 24 scenarios ran live against the real engine, six shards in parallel, into
`api/journey/all-24/run-0`. Every scenario produced a conversation and a report.

The reports are now being re-read after a final synthesis. This is not optional and it is worth
saying why: the runner reads a report the moment the round releases, which on a two-person check-in
can be the moment the FIRST person finishes. Left as captured, the renewal scenario's participant
report said "One person has answered so far" about a check-in where both had answered. The baseline
was taken the same way, so scoring an unsettled run against it would compare two different things.

**Where the numbers stand after fixes 1 to 3.** Seven of the eleven problems are already at zero
or well down, and nothing in the record-derived engine value dropped:

| Problem | Before | Now |
| --- | --- | --- |
| slot names glued to answers | 734 | **0** |
| "nothing contradicts" then differences | 104 | **0** |
| name with a stray full stop | 122 | **0** |
| text cut mid-word | 48 | **0** |
| participant report carries the lead's judgement | 21 | **0** |
| sentence starting in lower case | 579 | 155 |
| role description used as a name | 312 | 36 |
| machine table words shown | 1461 | 1032 |
| "1 people" | 61 | 36 |
| internal labels shown | 1153 | 1370 |
| report with no judgement | 8 | 8 |

Engine value held or improved everywhere it is computed from the record: commitments 33 to 46,
differences 29 to 31, findings 81 to 83, agreements 56 to 55, patterns 100 to 100, judgement present
21 to 21. Jargon in reports fell 511 to 459 and in the conversation 42 to 28.

**The one that went UP is real, and it is not a new defect - it is an old one made visible.**
Internal labels rose because fix 3 turned role-shaped labels into positional ones: text that used to
read "Relationship officer, Surulere. Target 14 approved facilities this quarter." now reads
"Participant A", so it moved from one counter to another. Underneath both is the same fault, which I
found by reading the served board rather than the code:

  the board never applies names at all to the fields it takes off the report row.

Read live, the lead's own board says "The initiator believes the team is behind on a collective
goal" and "the initiator is waiting on the credit committee". The report was fixed; the board was
never covered. That is being fixed now as part of task 1.1.

**One thing I got wrong and fixed.** My first attempts to wait for the run used
`pgrep -f 'all-24/run.ts'`, which matches the waiting shell's own command line, so the wait could
never end and the refresh that was queued behind it never started. Six background waits sat doing
nothing before I noticed. No work was lost - the run itself was fine - but it cost about half an
hour of wall clock. The waits now watch for a marker file instead.

---

## What was already done before tonight

Fixes 1, 2 and 3 were finished earlier and are on this branch as five commits. Recorded here so the
morning reading is in one place.

| Commit | What |
| --- | --- |
| `96df60a4` | **Fix 1, the leak.** 16 of 24 participant reports carried the lead's judgement, word for word. Nathan could read that he was about to be put on a plan. Fixed at the read, for the report and the board |
| `588c6ab2` | **Fix 2, the gluing.** 734 lines of "said this was for:" joined to answers to different questions, and a fixed opening claiming no contradictions immediately before listing them. The facts are unchanged; one model call now writes the prose |
| `f80ef2a9` | **The fallback**, after you asked to see it. My first one still glued. It now says one true short sentence and stops |
| `32bb938a` | **Fix 3, names not labels.** A role description was being used as a person's label, and `applyNames` walked eight named fields while everything else came through unnamed |
| `be8b48d9` | **Nathan's report**, your four points: the reader's side, full name once, the fact that explains the disagreement, and no jargon |

Two commits tonight were the kit itself: `73894140` (kit and the four docs) and `e0fcd32a` (the
guard update).

---

## Read ahead for Phase 2, from tonight's conversations

Not tasks I have started. I read ACUTE_SHOCK and the sales scenario in full against the twelve
points in `docs/conversation-standard.md` while the scenarios were running, so Phase 2 starts with
evidence rather than a fresh reading.

**The lead is still never named (point 1).** Two openers, neither naming anybody:

> Tobi, thank you for making the time. This conversation is about Meridian giving notice…

> This check-in is about seeing how your work is going against your goals this quarter. Your
> target is 12 approved facilities.

The second should be "Bisi says your target this quarter is 12 approved facilities. Is that right?"
My fix in `32bb938a` only fires when the model attributes something to the person ("you said…"), and
neither of these does, so nothing triggers. **Task 2.1 is a real change, not a tidy-up.**

**Two asks in one message, which the scorer cannot see (point 4).** It counts turns with more than
one question mark. These have one:

> When did you first learn about it, and from whom?

> Of what you just described, what do you know first-hand, and what are you assuming or repeating
> from someone else?

Both are two questions wearing one mark. The number for 2.2 will reach zero without the problem
being fixed, so 2.2 needs the reviewer to read, not just the counter.

**It asked the same thing twice in a row.** The first-hand-versus-assumed question above is asked,
answered, and then asked again in the next turn. It reads as not listening.

**A probe fired where it made no sense.** After Tobi explained that the customer's champion had
left, Groundwork asked:

> Who arranged the original access to Sarah, or how did that meeting come about?

Nobody had claimed credit for access to Sarah. That is `who-secured-that-meeting` firing on the
word "meeting" in a sentence about somebody leaving. Worth a look in Phase 2.

**What it got right, and must not lose.** In the same conversation it pulled out all three warning
signs the scenario hides - the two cancelled reviews, the champion leaving in July, and "I reported
the account as healthy because usage was flat" - which is exactly what ACUTE_SHOCK exists to test.
Whatever Phase 2 changes, that has to survive.

**Jargon in the questions**, from the sales conversation: "What is the total amount you have had
**disbursed** this quarter?" and "what is stopping your **deals from converting**". The standard's
own table gives the replacements. From the new hire: "**proactive monitoring for account health**".

**And a piece joined on with a colon, which the wording rules forbid outright.** From the new hire,
a single turn:

> To keep them satisfied and engaged: what does that look like in practice from your side? What is
> the first thing you mean to do to make that happen, and how will you go about it?

A fragment, a colon, then three questions. This one the counter does catch, because it has two
question marks - but the colon-glued fragment in front of it is invisible to every number we have.

---

## The baseline test — the answer, and it splits in two

Both runs of the 25 September code are done. `docs/baseline-candidate.json` is written, as asked:
the average of those two runs.

| | specific detail | blocker | proof asked | past words |
| --- | --- | --- | --- | --- |
| baseline as saved (25 Sep) | 89 | 37 | 42 | 25 |
| old code, run A | 81 | 34 | 35 | 36 |
| old code, run B | 87 | 35 | 48 | 18 |
| **old code, mean → the candidate** | **84** | **34.5** | **41.5** | **27** |
| new code, run-0 | 74 | 33 | 46 | 32 |
| new code, run-1 | 74 | 33 | 54 | 27 |

**"Blocker checked" is settled and there is nothing wrong with it.** The old code's own mean is
34.5; the new code gives 33. That is 4% down, well inside the gate. The saved baseline's 37 was
simply the top of its range. Nothing to fix.

**"Specific detail asked for" is a real drop, and I have not found the cause.** The old code gives
81 and 87; the new code gives 74 twice. And it concentrates: NEW_HIRE alone accounts for six of the
ten, so I ran that one scenario six times.

| NEW_HIRE, "specific detail" | |
| --- | --- |
| old code | 14, 12 |
| new code | 9, 5, 8 |

Six samples, no overlap, and the turn counts are identical at 69. That is not sampling.

**What I ruled out, each with a measurement rather than an argument:**

- *Conversation length.* Identical: 69 Groundwork turns on every run of NEW_HIRE, old and new.
- *The findings block that feeds the lead's later sessions* (`conversation.service.ts:4378` reads
  `report.findings` where a finding has both a gap and a headline). This was my best guess, because
  fix 2 changed who writes that headline. It is wrong: the new code produces **more** of them, 6
  and 5 against the old code's 3 and 2, so that block fires more often, not less.
- *The opener rewrite,* the only other conversation-path change I made. The openers differ between
  the two OLD runs as much as they differ from the new ones - the model writes a fresh one each
  time - so there is no systematic difference to blame.
- *Prompt drift between the two servers.* They share a database, so the old server could have
  re-seeded the engine prompt and changed it for both. It did not: `system` is still v40 and
  `report_synthesis` still v3, unchanged since 23 and 15 September.

**The bisect did not work, and I stopped it rather than read tea leaves.** One NEW_HIRE run per
commit is not enough: the conversations come out different lengths - the fix-1 point ran 53 turns
against the usual 69 - so a raw count is not comparable between points, and a rate over one sample
tells you nothing. Doing it properly is three commits times two or three runs each, about two
hours, and it should be done that way rather than badly.

**But I can name the remaining suspect, and it is specific.**

The conversation reads the report from the **raw database row**, not through the filtered read - I
checked both call sites (`conversation.service.ts:2846` selects `report.findings`, `:3798` selects
`report.inferences`). So fix 1, which filters at the serving endpoint, cannot reach the conversation
at all. That rules it out on principle rather than on a sample.

Fix 2 *can*, because it changed the `findings` rows themselves. And I measured earlier that findings
with both a gap and a headline went **up**: 3 and 2 on the old code, 6 and 5 on the new. That block
(`putThisToThem`, at `:4378`) is what puts a disagreement to the lead in a later session, so it now
fires more often.

Here is why "more" could still mean "fewer questions". **The engine prompt is trimmed to fit.** It
is assembled from around forty blocks and cut down when it is too long - `a-prompt-that-ran-out-of-room-says-so.ts`,
and the log line at `:4411` reads "engine 114920 to 101767 chars, leaving out …". If fix 2 made one
block appear more often, the trimmer has to drop something else, and what it drops could be exactly
the blocks that ask for a number or a date.

**How to test it, precisely:** run NEW_HIRE on the current code and on `ed2b4996` with the engine
logs kept, and compare the "leaving out" lines. If the new runs are dropping blocks the old runs
kept, that is the answer, and the fix is to make the trimmer protect the question-generating blocks
rather than to undo fix 2. That is one run each, not six, because the log says it outright.

I have not done it: I would rather hand you a named hypothesis and the one-command test than spend
the remaining time on more samples.

## The first result, before both runs were in

The first of the two runs of the 25 September code is in.

| | specific detail | blocker | proof asked | turns |
| --- | --- | --- | --- | --- |
| baseline as saved, scored 25 Sep | 89 | 37 | 42 | 747 |
| **the same old code, re-run today** | **81** | **34** | 35 | 752 |
| new code, run-0 | 74 | 33 | 46 | 746 |
| new code, run-1 | 74 | 33 | 54 | 751 |

**The baseline does not reproduce.** Identical code, identical harness, 89 one day and 81 the next.
So the saved baseline is towards the high end of its own spread, which is the thing I could not
establish last night and the reason the answer looked like a regression.

**But the new code is lower still,** 74 twice against the old code's 81. That gap is smaller than
the one the gate was complaining about, and it may yet be nothing: one more run of the old code
tells me whether the two overlap or sit apart. It is running now.

Note that "proof asked for" moved the other way - 35 on the old code today against 46 and 54 on the
new - which is a point in favour of the whole thing being spread rather than direction.

The turn counts are within five of each other across all four runs, so none of this is an artefact
of longer or shorter conversations.

## How the test was set up

Her item 3, and it comes before any further conversation change.

A worktree at `/tmp/gw-baseline` holds `ed2b4996`, the commit immediately before fix 1, so it is
this branch with fixes 1, 2 and 3 and everything after them removed and nothing else different.
Its own server runs on port 3001 against the same local database; the harness there points at 3001.
Two full 24-scenario runs, scored the same way as everything else.

Two things went wrong in the setup and are worth recording, because both would have produced a
confident wrong answer:

- **`prisma generate` in the worktree rewrote the shared client.** The two checkouts share
  `node_modules`, so generating from the older schema removed `theOpening` from the client the main
  checkout builds against. The running server survived because it had already loaded the client,
  but the next rebuild of main would have failed. Fixed by generating from the NEW schema and using
  that for both - the old code never mentions `theOpening`, so a superset client is harmless to it,
  and I confirmed the old commit still builds and boots against it.
- **The first run produced nothing at all.** `GOOGLE_APPLICATION_CREDENTIALS` is a relative path,
  so in the worktree it resolved to a directory that does not exist and every model call failed.
  Had I not looked at the log, I would have scored an empty run and reported that the old code asks
  no questions either. Linked the credentials in and started again.

## Log

**Phase 0 done and committed** (`bab9fa61`). Safety checked, all 24 scenarios run and scored,
`docs/score-at-start.md` saved.

**The board never named anybody** (`10adaf92`). Found by reading the served board rather than the
code: the lead's own board said "The initiator believes the team is behind on a collective goal"
and "the initiator is waiting on the credit committee". The report had been fixed; the board had
its own half-rule that only named a whitelist of fields. The whole report row now goes through the
report's own read, for whoever is asking, so a field added later is named without anybody
remembering. Internal labels on that board: lead 109 to 0, participant 9 to 0. Verified live as
both readers, and fix 1 still holds - the participant gets no judgement and no table.

One consequence worth stating plainly: peers are now named to each other in the board's prose on a
non-evaluative check-in. That is not a loosening. I checked the run data from before the change and
Femi's own **report** already named Ngozi and Kwame; the board was the surface that disagreed with
the report, while its own roster printed those names three inches away.

**The machine's table reaches nobody** (`aba063cd`). All 800 machine-table hits were inside
`theTable` itself, 400 in the lead's report and 400 in the lead's board, and nowhere else - so this
was one change with three counters behind it. It is still computed and still written to the row,
because it is the evidence behind a judgement; it simply never reaches a read. Verified live on all
four reads: `theTable` null on both boards, the key absent from both reports, and `FIELD:` and
`standing:` at zero everywhere. The client already guards on the field, so the "See the counts
behind this" toggle simply does not render - no empty box.

**"Participants A, B, and C" was three people, and none of them was named** (`97865ca5`). The
plural form evaded the substitution and the scorer both. The plural is now expanded into singulars
before the names go in, so the existing machinery does the rest: the lead reads "while Femi
Okonkwo, Ngozi Eze and Kwame Mensah all believe they are working towards individual targets", and
Femi, who is one of them, reads "while you, Ngozi Eze and Kwame Mensah all believe". Where peers are
hidden it correctly stays "while you, Participant B and Participant C".

**"The record shows you blames the market"** (`94c26c0d`). The safe shape - a verb immediately after
"you" - just missing from the closed list. Four real verbs added, found by reading every `you
<word>s` across all 24 scenarios: blames, owes, points, observes. Four look-alikes deliberately left
out, because they are the argument for a closed list: "Grace's own plan **for you calls** for two
signed agreements" and "which **for you means** the supplier acknowledging tickets" are both
correct English, and a general rule would have broken them.

That search also turned up a live bug in the rules that were already there: "A key worry **for you
is** that you didn't see this coming" was being turned into "for you are". A preposition immediately
before "you" now holds off every agreement rule, which narrows what was there rather than widening
it.

**Labels in prose are now zero on all four reads** - lead board, lead report, participant board,
participant report - measured against `the initiator`, `Participant X`, `Participants X` and `the
person who set this up`. The 18 and 7 that remain are `.label` and `.participantLabel` keys, which
are deliberately raw because `own-reads-only` filters per-person rows on them. I checked every one:
none is prose.

**I took out a rule of my own that was making grammar worse.** In `be8b48d9` I added a pass that
made a verb joined on with "and" agree with "you". It fixed three sentences and broke two:

> You believe the team is behind on a collective goal for one reason, but the record shows each
> person is working on an individual goal and **are** blocked by a different problem.

> You say the office move is going well and **are** on schedule.

In both, the verb belongs to a different noun - "each person", "the office move" - and no regular
expression can tell which. It was putting newly wrong grammar on the lead's board, so it is
reverted. The safe half stays: a verb sitting *immediately* after "you" ("you is" to "you are") is
not in doubt and is untouched. Coordinated verbs move to fix 8, where the reader is known and a
single line can be rewritten properly.

---

## "A colleague", not "Participant B" (task 1.1, the last piece)

Hafsah decided the open question: in evaluation check-ins (PIP, RECOGNITION, CONTRACT_RENEWAL) a
colleague stays unnamed to the person being reviewed, and what they are CALLED is "a colleague"
when there is one, and "one colleague", "another colleague" when there are several, used the same
way through the whole report.

What Amara Diallo used to read in her own recognition report:

> Participant B built the front end for the new onboarding flow. Participant B believes the success
> was due to the clean and responsive design.

and what she reads now:

> A colleague built the front end for the new onboarding flow. A colleague believes the success was
> due to the clean and responsive design.

Blessing Okafor, in the contract-renewal report:

> A colleague has been in weekly contact with the delivery partner. A colleague interpreted the
> partner's requests as an attempt to get ahead, rather than a genuine problem.

Nobody's entitlement changed. The phrase is worked out once from the whole party list, in the order
`labelsForParties` hands its labels out, so one person is one phrase in the picture, the judgement,
the divergences, the board and the engagement header. The branch it replaces printed the person's
JOB - "Managing Partner expects two large projects" - to a reader who may not know who they are,
which is exactly what her decision rules out; two tests that pinned that are changed, with the
reason in the commit.

**Read live on the running server.** PIP is unchanged, because Nathan's only other party is his
lead and she is named to him - there is no colleague in it to mention. The sales check-in
(OKR_ALIGNMENT), where peers ARE named, is byte-for-byte identical before and after. Re-serving all
24 scenarios through this build and scoring against run-1: "internal labels shown" 138 to 110, and
every engine-value and conversation number unchanged. All 9,006 API tests pass.

**Two things for Hafsah.**

1. Her words cover one colleague and two. I carried the same pattern on for a third and beyond ("a
   third colleague", "a fourth colleague"), and past the twelfth everybody left is "another
   colleague", which says less rather than more and so cannot give anybody away. Say if you want
   something different for a big cohort.
2. The lead can also be unnameable, though only when the product holds no name for them at all:
   `User.firstName` is a required column, but `PATCH /auth/profile` trims what it is given and
   accepts an empty string. That reader still knows who their lead is, so they read "your lead"
   ("the lead" for somebody who is not on the check-in) rather than "the initiator". Not her
   wording, so it is flagged here too.

---

## The interview was reading the report's labels, and stopped asking specific questions

**The regression.** Fix 3 made report labels positional - "the initiator", "Participant A",
"Participant B" - which is right for a stored report and wrong for a conversation. The interview
prompt was borrowing the same labeller, so where the engine used to be told

> - "Finance sign-off on the six credit files" on Relationship officer, Ikeja. Target 14 approved
>   facilities this quarter., 21 days old, nobody has escalated it.

it was now told

> - "Finance sign-off on the six credit files" on Participant B, 21 days old, nobody has escalated it.

A letter is not something a question can be built out of. Measured on NEW_HIRE, asks for a number,
a date or a name fell from 14 and 12 (25 September) to 9, 5 and 8, over an identical 69 turns.

**What it now says.** Three rules, in `api/src/modules/conversation/a-colleague-in-an-interview-has-a-name.ts`:

1. What the person called them themselves, where the record kept it. They said it out loud, so
   saying it back reveals nothing to them.
2. Otherwise a real name, but only where this check-in names people to each other - the rule the
   report and the board already apply.
3. Otherwise plain words: "a colleague", "one colleague", "another colleague", taken from the
   reports' own wording so the two cannot drift.

On an ordinary check-in the engine now reads

> - "Sign-off on the six credit files" on Ngozi Balogun, 21 days old, nobody has escalated it.

and on a PIP, where a colleague stays unnamed to the person being reviewed,

> - "Sign-off on the six credit files" on a colleague, 21 days old, nobody has escalated it.

**Three more holes found while fixing the first.** Four blocks put a colleague into the interview
prompt and each had its own answer. Three of them handed over a real name in check-ins where the
report and the board deliberately withhold one: who is waiting on a commitment, who else is in the
check-in, and the shared-board give-back, which was gated on mode alone - and an evaluation ground
is SHARED by default. `peersAreNamedOn` is now one function
(`api/src/modules/reports/peers-are-named.ts`) instead of three copies in the reports, board and
grounds services, with the conversation - the one reader that speaks out loud - having had no copy
at all.

**The numbers, honestly.** Four NEW_HIRE runs on the new code: 23, 8, 12 and 9, over 72, 70, 69 and
71 Groundwork turns. Mean 13.0, which is where the 25 September code was (14 and 12). But the
spread is 8 to 23, and 8 sits inside the range the broken code produced. The mean recovers; two
runs could not have told you that, and four still cannot separate it from the run-to-run variance
this scenario already has. The fix is right on the reading of the prompt regardless of the count.

All 9,011 API tests pass. New test
`api/src/modules/conversation/a-colleague-stays-unnamed-in-an-evaluation.spec.ts` stands a
worst-case engine in front of the real conversation - one that repeats back every name-shaped word
it was handed - and reads the turn that comes out. Two existing tests are changed, both of which
matched source text with a regexp rather than exercising the rule in their own name; the reason is
in the commit.

**One thing for Hafsah.** I was asked to describe an unnameable colleague by what they do, for
example "the colleague who handles the credit files". I did not do that, because your decision of
26 September says the opposite in the code: "never a job title or detail that would give them
away". On a small team "handles the credit files" names one person as surely as their name does. So
an unnameable colleague reads "a colleague", which is your wording. Say if you want the interview
to have more than the report does here.

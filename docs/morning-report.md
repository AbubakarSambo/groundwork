# Morning report

**Night of 25–26 September 2026.** Branch `fix/plain-reports`. Nothing left this computer.

This is written as I go, so if it stops mid-sentence that is where I got to.

---

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

### 6. The API will not start when the email key is empty

*Found by the screens workspace on 26 September 2026, while setting up the second computer.*

The example settings file, `api/.env.example`, says to leave `RESEND_API_KEY` empty. When it is
empty, the API crashes as it starts, with the error "Missing API key". The cause is
`api/src/modules/email/email.service.ts`, line 34. The email service creates a Resend client as soon
as the API starts, and Resend refuses an empty key.

This contradicts the email service itself. Its own check, `keyIsAPlaceholder()`, already treats an
empty key as "no email leaves this computer, and every send is written to the log instead". Only the
line that creates the client was never told.

**What I did for now:** on the second computer, you set `RESEND_API_KEY=re_test`. The code already
treats that value as fake and never sends with it, and `EMAIL_SENDS_FOR_REAL=false` also stops all
sending. The API now starts, and its log says that no email leaves this computer.

**My suggested fix, as its own small task:** create the Resend client only when real sending is
allowed, that is, when `canSendForReal()` is true. Otherwise leave it out, so an empty key behaves
exactly like a fake one. Add a test that the email service starts with an empty key and sends
nothing. When that is in, `re_test` is no longer needed and the key can stay empty, as the example
says.



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

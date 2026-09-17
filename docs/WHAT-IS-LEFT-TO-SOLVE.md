# Everything from 15 September, and what is left

Written at the end of the day's session. Everything below was found by running the product, most of
it in a browser or against a live model, some of it by Hafsah reading production over somebody's
shoulder in a real meeting.

Three lists: what is fixed and waiting, what is mine to do next, and what needs a decision.

---

## 0. THE ONE THAT BLOCKS JUDGING ANY OF IT

**Seven commits are on `product-only` and not on `main`, and production is running without them.**

The conversation Hafsah read in the meeting - every reply opening by handing her own answer back -
is the version from before this morning's biggest fix. Restating went from 46% of replies to 3%
this afternoon. She is judging a build that is a day behind, and so is anybody else using it.

Nothing else on this page matters as much as getting these deployed.

---

## 1. FIXED TODAY, WAITING ON DEPLOY

| What was wrong | Where it was found | Now |
|---|---|---|
| Every reply opened by repeating what she just said | Live runs, 46% of 111 replies | 3%. The instruction quotes the offending sentence back; where it still fails, that sentence is removed |
| Replies too long | Live runs, median 41 words | Median 35. Length is judged after the restatement goes, which is what made them long |
| The closing turn ran to a paragraph | Decided with Hafsah | Three sentences, 80-word backstop |
| A vague answer earned a LONGER reply | The prompt said so outright | Sixty words, same as everything else. That rule was the cause of "the responses are soo long its insane" |
| "It sounds like", "I understand", "performance" reaching people | 237 of 8,317 real turns | Checked in code on every reply. About 6% residual, all of it the designed fallback |
| "You have not seen this yet, so I want to show it to you" | Production, with the objective on screen directly above it | Gone. That was `seenBySubject` - an internal flag - read out loud |
| "My objective for this check-in ... is for you to carry 150" | Same message | The field was called MY_OBJECTIVE and the model read the possessive as its own. It is WHAT_IS_EXPECTED_OF_THEM |
| A participant could see everybody's numbers on Context | Driven as Rita | `whoSeesTargets` had two readers and the Context page was a third nobody had told |
| On a phone, pressing Send opened the feedback form | Browser at 375px | The feedback button cleared the composer; the composer wins the click either way |
| The band never said why the objectives list was short | Driven as Kunle | The line the server has always sent is rendered |
| "Say what I am seeing" on the invitation | Hafsah, reading a real invite | "Start my check-in" |
| "end of the year" and "december 1 2026" read as no date | Production - she answered with a date twice and the record said "no date agreed" | Both parse. Vague phrases still refuse |
| A question that asks you to invent a shape gave no example | Production: "what would tell you this goal has been met?" | A guard. The examples are built from that person's own words |
| The product detected 38 problems and one good thing | Reading the code after Hafsah asked | Eight positives and a third family for carrying, all stored and reportable |
| The pack stopped reaching the conversation after session one | Reading the assembly | Reaches every session, at its stage |

---

## 2. MINE TO DO NEXT

### 2.1 Numbers, dates and probing - the theme running through her feedback

This is one subject with several faces, and it is the one she keeps returning to.

| | |
|---|---|
| **A timeframe should become a date** | Done for "end of the year" and month-first dates. Still open: "this quarter", "end of Q4", "H1", "by the sprint end" - each needs either a calendar the product does not have, or a question. The rule is to ASK rather than guess, and the asking is what is missing |
| **A target should be a number, not a sentence** | Her report reads *"I am trying you sell 150 bags of tea"* under a heading that says "the objective, and your part of it". The number is in there as prose. Where the setup extracts a structured target it works - the OKR ground I built has 500/150/150/150/50 as real numbers - so this is about the check-in doing what setup does |
| **Probing for more, once a number exists** | "10,000 units" was accepted and never pressed: by when, who confirms it, what is it now. The interview asked "what would tell you it was met" and took "the money in our bank account" without asking which account, how much, or what it is today. A number with no baseline cannot be checked next time |
| **A number said in passing should be caught** | "we've sold 10000 units of tea in abuja" is a target and a place. Neither became a field |

### 2.2 The report

Her words: "the reports is useless, didnt explain disagreement or show any reason."

The report she was reading was a single-person session, where there is genuinely nothing to
disagree with - so before changing anything I want to read a two-party report where the two
accounts differ, and see what it does and does not say. The one I generated today named the
difference and why it mattered, so the question is whether that holds when the situation is
messier, or whether that was luck.

### 2.3 Smaller, and certain

| | |
|---|---|
| Rita appears as "SENIOR, CARRIES 150 A" | Her role text stands in for her name, with a letter appended to tell her apart from Kunle who has the same description. Correct mechanism, wrong output, and it reads worst in her own report |
| 3,623 record lines still carry a `[VERIFIABILITY:...]` prefix | Legacy rows from before the fix that stores them clean. The client strips it; anything else reading those rows prints it |
| The absorption codes are stored and labelled and rendered almost nowhere | They reach the board badge. A person carrying the place together should see it somewhere that matters |
| Commit returns your OLD ground if you have set one up before | A consumed draft makes a second setup return the first ground. It is the double-submit guard; whether a lead starting a genuinely new check-in hits it depends on the client resetting the draft first, which I have not verified |
| Banned phrases at about 6% | The retry improved from 2 clean in 10 to 6 in 14. Lower needs a second retry - an extra model call on affected turns |
| Over-sixty-word replies at about 7% | Same shape. Both are the designed fallback: ask once, keep the first if the second is no better |

---

## 3. NEEDS A DECISION FROM HAFSAH

| Question | Why it is hers |
|---|---|
| **Does setup count as the lead's first check-in?** | It does today - the transcript is copied in and marked complete - while the setup copy promises "then you go into your own check-in". One of the two has to change, and which one changes what a lead does in their first ten minutes |
| **"Words as numbers"** | My best reading is that a target should be captured as a number rather than left as the sentence somebody typed. If that is it, say so and I will build it. If it is something else in those screenshots, point at it |
| **A second retry on banned words and length?** | It would cut both residuals. It costs one extra model call on the affected turns, and on 6% of turns that is small - but it is a cost per conversation and that is a call about the product, not the code |
| **Deploy** | Seven commits, including the restating fix. Merging is yours |

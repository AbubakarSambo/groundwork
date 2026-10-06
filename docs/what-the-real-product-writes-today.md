# What the real product writes today

25 September 2026

## The short version

This comes from the scenario run of 25 September: all 24 situations, run from start to finish against the real engine, with 73 people and 1,407 turns of conversation. Each person had a sheet of what was true, so the product can be marked right or wrong.

**The conversations are mostly fine.** Groundwork asks one clear question at a time, in normal sentences. There are small problems: a first message that reads "…this quarter. the person who set this up said…", some jargon such as "pipeline" and "disbursed", and a few curt lines such as "That's the activity."

**The reports and boards are where the nonsense is,** and it is in all 24 scenarios. Most of it is not the AI writing badly. It is the product's own code gluing pieces together:

- People's answers are dropped into fixed slots, whether they fit or not: "Femi Okonkwo said this was for: I'll know when they tell me they have the statements ready."
- The lead is called "the initiator", in their own report.
- A table meant for the machine is shown as part of the report: "standing: THIN - only 3 people answered", "asked 4 · answered 3 · said they cannot 0".
- The report says "nothing in any single account contradicts…" and then lists the contradictions.

**Two problems are worse than wording:**

1. **Participants read the lead's private judgement,** including about themselves. Nathan, who is about to be put on a performance plan, reads: "The initiator is about to put Nathan on a formal plan for not hitting a target Nathan does not know exists."
2. **The report's main judgement is often empty or wrong.** It came back empty in 8 of 24 scenarios. In the scenario where a company's biggest customer gave notice, the right answer was to put three people's clues together into one timeline. The lead got no judgement at all.

## What goes wrong, how often, and what causes it

Counted across every sentence Groundwork wrote in all 24 scenarios: the conversations, the lead's report, the participant's report, and both boards.

| # | What goes wrong | How often | Scenarios | What causes it |
| --- | --- | --- | --- | --- |
| 1 | People's answers dropped into fixed slots, such as "said this was for:", "What they report:", "Where they say they stand now:" and "What they say is in the way:" | 734 | All 24 | **The code.** The shared picture is built by gluing slot names to whatever each person said, even when the answer was to a different question |
| 2 | "The initiator" and other internal labels shown to people. In the chat it becomes "the person who set this up said…" | 542 | All 24 | **The code and the AI.** Reports are stored with labels instead of names, and the labels are not swapped back before people read them |
| 3 | The machine's own table shown in the report: "FIELD:", "standing: THIN", "asked 4 · answered 3 · said they cannot 0", "by kind - relationship officer…" | 974 | 16 | **The code.** A table meant for the AI is sent to the screen |
| 4 | A sentence that starts in lower case, such as "…below. the initiator said…" | 201 | 20 | **The code.** A slot is filled in the middle of a sentence |
| 5 | "Nothing in any single account contradicts…", straight after which the differences are listed | 80 | 18 | **The code.** A fixed opening sentence that ignores what follows |
| 6 | Names with a stray full stop: "Peter Kimani." | 55 | 19 | **The code.** A full stop is added to a label that already ends a sentence |
| 7 | "1 people answered", "1 of 1 people have given an account" | 42 | 7 | **The code.** No singular form |
| 8 | A job description used as a name, in the middle of a sentence: "Apply the checklist from the Relationship officer, Surulere. Target 14 approved facilities this quarter. to the work of…" | 44 | 1 | **The code.** A person's whole role description is used as their label |
| 9 | Sentences cut in the middle of a word: "…that aren't e...." | Several | Several | **The code.** Text is shortened to a fixed length, without regard for words |
| 10 | **Participants read the lead's judgement,** including about themselves and their colleagues | Every participant report | All with a judgement | **The code.** The participant's report carries the same judgement as the lead's |
| 11 | The report's main judgement is empty | 8 of 24 | 8 | **The AI.** It fails to produce one, and the lead gets only the glued-together pieces |
| 12 | The board's summary repeats the same glued-together opening | Every board | All 24 | **The code.** The board copies the report's first paragraph |

**What this means.** Ten of the twelve are caused by the product's own code, one by both, and only one by the AI alone. So better instructions for the AI will not fix most of this. The code that builds the shared picture, the findings and the board summary has to change: the AI should write the whole sentence, and the code should stop gluing.

## Is it right? Three scenarios checked against the truth

Each scenario has a known right answer, which was never shown to the product.

| Scenario | The right answer | What the lead got | Verdict |
| --- | --- | --- | --- |
| **A formal performance plan** for an account manager | The target was never written down and was changed out loud twice. The plan cannot start until the expectation is on paper | "The initiator is about to put Nathan on a formal plan for not hitting a target Nathan does not know exists." | **Right in substance,** badly worded. And Nathan reads it too |
| **The biggest customer gave notice** | Each of three people held one warning sign: two missed quarterly reviews, the main contact leaving in July, and support requests tripling in August. The right answer puts them into one timeline, without blaming anyone | No judgement at all. Only the glued-together pieces, starting "Nobody has been read against anybody else's account" | **Missed.** This is exactly what Groundwork exists to do |
| **A finance manager handing over** | Two things exist only in her head: a payment arrangement with a supplier that is in no contract, and a year-end spreadsheet on her own drive | Caught the processes on her own systems. Missed the supplier arrangement. Added that the lead "is undermining the authority of the role", which nothing in the truth supports | **Half right,** plus a charge against the lead that is not true |

**What this means.** The AI's thinking is sometimes good, as in the performance plan. But when it has to put pieces from several people together, which is Groundwork's whole promise, it can miss completely. That is not a wording problem. It needs the report's instructions and the scenario tests to reward joining people's accounts, and to punish charges nobody made.

## The before set

Real lines from the run, from the sales scenario except the last, which is from the performance plan, with how each should read. The rewrites use only facts the product already had. These are the examples to give the AI, and the lines to test against.

| # | What the product wrote | How it should read |
| --- | --- | --- |
| 1 | 4 of 4 people have given an account, and nothing in any single account contradicts what that person said it was for. The accounts differ on 2 things, below. | All four people have checked in. They disagree on two things: where the work is stuck, and how many applications are open. |
| 2 | Femi Okonkwo said this was for: I'll know when they tell me they have the statements ready. Where they say they stand now: I have visited many businesses, 46 in total. What they say is in the way: Many of them are still trying to get the statements from their banks. | Femi has visited 46 businesses. Most of his applications are waiting for customers to send their bank statements. |
| 3 | Where they say they stand now: I sent it at 10:00 AM on Friday. What they say is in the way: I am waiting for a response. | Ngozi sent her file to the credit committee on Friday morning, and is waiting for their answer. |
| 4 | Apply the checklist from the Relationship officer, Surulere. Target 14 approved facilities this quarter. to the work of the other officers. | Kwame made a checklist that gets customers' documents in faster. Share it with Femi and Ngozi. |
| 5 | The initiator believes the problem is the credit committee, but for two of the three officers, the bottleneck is customers not providing documents. | You believe the credit committee is what holds sales up. For two of your three officers, the hold-up comes earlier: customers are slow to send their bank statements. |
| 6 | The initiator's pipeline count of 25 applications is also wrong; the officers are reporting a combined total of 64. | You counted 25 open applications. Your officers' own numbers add up to 64. |
| 7 | standing: THIN - only 3 people answered, which is too few to rank. asked 4 · answered 3 · said they cannot 0 · never reached 1 | Not shown to people at all. If it must be said: "Three of the four people answered this question. That is too few to compare." |
| 8 | 1 people answered this check-in. | One person has answered so far. |
| 9 | We are tracking credit sales against the target for this quarter. the person who set this up said your target is 12 approved facilities. | Bisi says your target this quarter is 12 approved facilities. Is that right? |
| 10 | …the "why" behind certain decisions that aren't e.... | The whole sentence, never cut in the middle of a word. |
| 11 | (On the board) 4 of 4 people have given an account… the initiator said this was for: We're aiming for 40 approved facilities and N120 million disbursed. | The team has 11 approved facilities so far, against a target of 40. |
| 12 | (What Nathan reads, as the person on the plan) The initiator is about to put Nathan on a formal plan for not hitting a target Nathan does not know exists. | Nathan should never read the lead's judgement. His own report says: "You were told your target was 5 renewals, and you have 6. Your manager expects 8, which has not been written down or shared with you yet." |

## How to fix it, in order

This is the first job for Claude Code, before any new screens. Otherwise the new screens will be filled with the same nonsense.

1. **Stop the leak.** A participant's report must never carry the lead's judgement. Each person gets their own report, about their own work. This is a one-day fix, and it comes first because it can hurt someone.
2. **Stop the gluing.** The shared picture, the findings and the board's summary must be written by the AI as whole, plain sentences, from the facts it already has. The code stops joining slot names such as "Where they say they stand now:" to people's answers. The fixed opening sentence ("nothing in any single account contradicts…") goes.
3. **Names, not labels.** Every label is swapped for the person's name, or "you", before anyone reads it. Nobody ever sees "the initiator" or "the person who set this up". A role description is never used as a name.
4. **Hide the machine's table.** It is for the AI, not for people.
5. **Small code fixes:** "one person", not "1 people"; no stray full stops after names; no sentence starting in lower case; never cut a sentence in the middle of a word.
6. **Plain wording in the AI's instructions.** One wording rulebook, given everywhere the AI writes something a person reads, with the before set above as examples. Every field a person reads becomes a full sentence, not "a short phrase" or "in a few words".
7. **Better judgement.** The report's instructions must push it to join people's accounts into one picture, as in the lost-customer scenario; never add a charge that nobody made; and never come back empty. If nothing yet shows a difference, it says so plainly: "So far, nobody's account disagrees with anyone else's."
8. **An automatic check, and a re-run.** Before anything is saved, a check catches slot names, labels, the machine's words, lower-case starts and cut words, and has the AI rewrite that line. Then the same 24 scenarios are run again.

**When it is good enough to build screens on:**

- None of problems 1 to 10 appear anywhere in the 24 scenarios.
- The report's judgement is present in all 24, and matches the right answer in at least 20.
- Every participant report contains only that person's own picture.

The scenario run already exists, so this can be measured the same way each time.

# Four rounds of live runs, instead of a week of real use

15 September 2026. Nineteen real check-ins driven end to end against a build of the day's code,
with a model playing the person, across eighteen scenarios at sessions 2 to 4. Four rounds, 477
replies measured. The driver is not in the repository: it lives in the session scratchpad, because
the product should not carry a harness.

Every number below was counted by the product's own guards, run over the replies afterwards.

## What it found, and what changed because of it

| Measure | Round 1 | Round 4 | Round 5 | |
|---|---|---|---|---|
| Opens by saying their answer back | **46%** | 8% | **3%** | the complaint that started this |
| Replies over sixty words | 6.3% | 9.9% | **7.1%** | and the median went 41 to 35 words |
| Two or more questions in a turn | 1 | 0 | 0 | |
| Banned words and phrases | 2 | 8 | 7 | see below |

Round 5 is after one more change: **length is now judged after the restatement has been removed,
not three guards before it.** Reading every over-long reply in round 4 showed they were all long
for the same reason - they summarised the person back before asking. Three in four were flagged as
restating outright; the fourth was a paraphrase close enough to slip the check. So the reply being
measured for length was about to lose its opening sentence anyway, and asking the model for
"shorter" in between was asking it to fix the symptom while the cause was still in the text.

### Two things my own measurements got wrong, worth stating

The runner counts any reply that does not end in a question as a "close". That is not the
product's definition - the product goes by the close marker - so the closing-turn numbers above are
unreliable and the round-5 figure that looked like a regression was my metric, not the product. The
real closes read exactly as designed: *"You will present the new process at the all-hands on May 15.
Your report is ready now, and nothing in it needs acting on today. Speak soon."*

And the restating measure counts a close's first sentence as a fault, when repeating somebody's own
commitment back to them is precisely what a close is for. So the true restating rate is a little
better than 3%.

## The thing worth knowing: a guard can be right and lose anyway

The restating guard was catching it. The log said so: **fired 75 times, and 58 of those times the
model said it back again on the retry and the first reply stood.** As a detector it worked. As an
instruction it lost four times out of five.

Reading the failures showed why. It said what not to do and left the model to find its own opening,
and the easiest opening available is the sentence it was just handed. Two changes:

1. **The instruction quotes the offending sentence back** and says what the first sentence must
   carry instead - a figure they have not seen, what their answer changes, or the question asked
   straight.
2. **Where even that fails, the sentence comes off.** The one place in this codebase where a guard
   edits the reply, and it is allowed here for a specific reason: the sentence being removed carries
   nothing the person did not just say. That is the definition of what the guard caught. It is
   narrow - only when the restatement really is the opening sentence, only when something follows
   it, only when what is left still asks them something.

46% to 6% in one round, and it held at 8% in the next.

## The bug the runs exposed that no test would have

Banned phrases went **from two to eight the moment the restating guard started succeeding**. The
ban check sat fourth of seven guards, and three guards after it can REPLACE the reply. Their
replacements were never checked against the list. The better the later guards got, the more
unchecked text reached people.

The ban check now runs last, and its own retry is checked against the guard above it so it cannot
undo it. This is not a fault any unit test would have found: every guard passed its own tests
throughout, and the fault was in the order they ran.

## What is still leaking, honestly

**Banned phrases, about 6% of replies.** The ban retry improved from two clean out of ten to six
clean out of fourteen once its instruction quoted the offending sentence, the same fix that worked
above. What remains is the designed fallback: ask once, and keep the first reply if the second is
no better, because a flawed reply beats no reply.

There is no surgical fallback for this one and that is deliberate. "It sounds like you are carrying
the weight of this" with the lead-in removed becomes "You are carrying the weight of this" - a hedge
turned into a verdict about somebody's feelings, which is the exact thing the ban exists to prevent.
A worse reply, arrived at faster.

**Replies over sixty words, about 8-10%.** Same shape: the guard fires, the retry is sometimes no
shorter, the first stands. Worth the same treatment as the two above - quote the sentence, say what
to cut - and it is the next thing to do here.

**One caveat on all of these numbers.** The people in these runs are models asked to be vague,
guarded, tired or emotional, which invites exactly the phrasing the bans catch. The rate in real
production data is lower - "it sounds like" appears in 1.5% of 8,317 real turns. These runs are
harder than life, which is what makes them useful for finding faults and unreliable as a forecast.

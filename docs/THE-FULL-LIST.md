# The full list, 15-16 September 2026

Everything from this session. Part 1 is done and waiting on a deploy. Parts 2 to 6 are the work,
each with what is wrong, what it should do instead, how I would build it, and what could go wrong.
Nothing in parts 2 to 6 is started.

---

# PART 1 - DONE, ON `product-only`, TEN COMMITS AHEAD OF `main`

Production has none of this. Every screenshot read in this session came from the old build.

| # | What | Evidence it was real |
|---|---|---|
| 1 | Opening by repeating their answer: 46% of replies to 3% | 19 live check-ins, measured four times |
| 2 | Reply length: median 41 words to 35; over-60 from 6.3% to 7% after the reorder | Same runs |
| 3 | Guard ORDER fixed twice: bans run last, length is judged after the restatement is removed | Bans went 2 to 8 the moment restating started working |
| 4 | The close is three sentences, not 140 words | Your decision |
| 5 | A vague answer gets sixty words like everything else | The rule behind "the responses are soo long its insane" |
| 6 | 237 banned words and phrases in 8,317 turns, now checked in code | Counted on every turn ever produced |
| 7 | "You have not seen this yet" - the product reading its own flag aloud | Your screenshot |
| 8 | "My objective for this check-in" - the field was called MY_OBJECTIVE | Your screenshot |
| 9 | A participant could see everybody's numbers on Context | Driven as Rita |
| 10 | The band never said why the objectives list was short | Driven as Kunle |
| 11 | On a phone, pressing Send opened the feedback form | Browser at 375px |
| 12 | "Say what I am seeing" on the invitation | Your reading |
| 13 | A question that asks you to invent a shape now shows one | "what would tell you this goal has been met?" |
| 14 | "end of the year" and "december 1 2026" read as dates | You answered with a date twice and the record said "no date agreed" |
| 15 | "End of the year - so 31 December 2026?" - the product asks when the model will not | Your ask, took three attempts |
| 16 | Positive patterns: 1 code to 8, plus a third family for carrying | 38 problems and one good thing |
| 17 | The pack reaches every session, at its stage | Was `sessionNumber === 1` only |
| 18 | The lead does her own first check-in | Your decision |
| 19 | The report is handed the arithmetic | Built, not yet the headline - see 3.1 |
| 20 | Wave 3: the everybody-prompt down 1,765 words, two protocols made conditional | No judgement removed |

---

# PART 2 - THE CHAT

## 2.1 It must notice the gap DURING session 1, not after it

**The most important item on this page.** Your session had everything needed to see the problem and
said nothing.

The objective on the check-in was 10,000 units of tea. In your own session you said "my target is
150 bags" and "they are meant to sell 50 bags each". That is a mismatch of two orders of magnitude,
visible inside one person's own conversation, against a number that was already on the screen in
front of you. The chat asked what would tell you the pricing sheet was being used.

It does not need anybody else's session to see this. The objective is on the check-in, the person's
own words are in front of it, and the gap is arithmetic.

**What it should do:** when what somebody says does not line up with the objective on record, say
so once, plainly, and ask which is right. "The check-in is aiming at 10,000 units. You have said
150 bags. Is your part 150, or is the 10,000 something else?" Never a verdict, never a score - a
question about two numbers that do not meet.

**How:** the same shape as the date fix. Code notices (the objective is on the check-in, their
number is in their words, the two do not reconcile), the prompt is told to ask, and if it will not
ask, the product asks. It is checkable: did the reply contain both numbers.

**Risk:** a person whose number genuinely is a part of a bigger whole ("I carry 150 of the 10,000")
must not be interrogated. The check is for a gap that is not explained, and it asks ONCE.

## 2.2 Who is doing what, when nobody has said

Your chat had three people named and no statement of who owns which part. That is the
`whoInvolved` answer sitting next to objectives with no owners. The chat never asked.

**What it should do:** where the objective has no owners and people have been named, ask who carries
what. Once, early, in the lead's session, because it is the lead's to answer.

## 2.3 A number said in passing must become a target

"we've sold 10000 units of tea in abuja" is a target, a place and a unit. It stayed a sentence.
Setup extracts numbers properly; the check-in does not.

**What it should do:** the same extraction the setup path runs, on check-in answers.

## 2.4 Once a number exists, press for the baseline

"10,000 units" was accepted with no follow-up: what is it now, who confirms it, by when. A number
with no baseline cannot be checked next session, which is what makes session 2 worth anything.

## 2.5 The periods still unread

"This quarter", "end of Q4", "H1" need a financial year the product does not have. It must ask
which day rather than guess, using the same question the date work now uses.

## 2.6 Coaching starts in session 1

Your words: "maybe we should start coaching from the session 1 chat?" Today the coaching block only
has something to say once there is a pattern across periods, so session 1 gets nothing. But session
1 is where somebody is most reachable and where a gap like 2.1 is cheapest to fix.

**What it should do:** session 1 coaching is not a pattern read - it is what THIS conversation has
shown in the last ten minutes: a number with no owner, a goal with no date, a target that does not
reach the objective. Say one of those, once, before the session closes.

---

# PART 3 - THE REPORTS

The plan has three layers, because "no reasoning" is three different absences.

## 3.1 The finding must be the finding

Now: *"For everybody here: the role was never clearly defined, so there is no boundary to measure
work against."* That sentence fits every check-in ever run.

In the same report, four lines further down: 10,000 units (Abubakar), 2,000 units (Sahar), 150 bags
(you). The finding was sitting in the list.

**What it should do:** where the arithmetic has something to say, that IS the finding. "Three people
have named numbers in three different units. Nobody here can tell whether they add up to the 10,000
this check-in is aiming at." The arithmetic is already built and handed to the report; this is about
making it the headline instead of a line in the middle.

## 3.2 Every difference carries its reasoning

Now: `03 WHERE THINGS STAND` contains one bullet, *"The definition of success"*. A topic. No reason,
no stake, no next step.

**What it should do:** every difference gets four things, and the report is refused without them:

1. **What the difference is**, in both people's terms - "Abubakar is counting units sold, you are
   counting bags to sell"
2. **What it rests on** - the actual lines from each person's record
3. **What is at stake** if it holds - "if this holds, the team cannot tell at Christmas whether it
   hit 10,000 or missed by 8,000"
4. **What settles it** - "agree one unit and who carries how much"

This is the "reasoning" that is missing. It is not more words - it is the four things a person needs
before they can act, and today the report gives one of them.

**How:** the synthesis schema requires all four per difference. A difference that cannot fill them
is not a difference the report should be printing.

## 3.3 The intelligence layer - what only a reader of everything can see

Three things a person cannot see from inside their own session, which is the entire justification
for this product, and none of them are in the report:

- **The parts against the whole.** Built. Needs to lead.
- **Who is carrying what nobody agreed to.** The carrying codes exist and reach almost nothing.
- **What changed since last time.** Session 1 has nothing to compare, but from session 2 the report
  should open on movement, not on a fresh read.

## 3.4 The individual report must be about you and worth reading

Now: *"Because silence is usually a stage, not a rejection, it is important to know that this kind
of sales and expansion work often faces unfair reading, which you should consider before making
assumptions about your current standing."*

Nobody speaks like that. It is about a category, not about you, and it survives being deleted.

**What it should say, from what you actually told it:** you are carrying 150 of a 10,000 objective
nobody has divided up; there is no date on the pricing sheet; nothing in your session says how the
closing gets done. Three sentences, each pointing at something on your own record.

**How:** the individual report is generated per person from their own lines plus the arithmetic.
Same rule as 3.2 - a sentence that could be said to somebody else is cut.

## 3.5 Names, not "Participant A"

And a commitment goes under commitments, not under "what everybody agrees".

## 3.6 The conversation worth having comes from their words

Now: *"What did that turn into - pipeline, conversion, sign-ups?"* in a conversation about tea in
Abuja.

## 3.7 The copy pass - the AI voice

`NOTHING ABOVE THIS`, `WHAT THIS RESTS ON`, `AGAINST WHAT GOOD LOOKS LIKE` are cryptic. The generated
sentences are worse. This is a rewrite of the report's own language into plain words.

**I will draft this and show it to you before it ships.** It is your voice and I will not guess it.

---

# PART 4 - WHAT THE PRODUCT GIVES BACK

Your words: "the give something isn't really working well here."

Today there are three give-backs - what the room already knows, where that leaves them, what is
already on record about somebody they named - and a rule that only ONE may be used per turn,
written because a lead once got all three at once and it read as a briefing.

What is wrong with them now:

1. **They are facts, not readings.** "Sixty of the hundred and fifty" is a number the person already
   knows. A reading is "sixty of a hundred and fifty with three months left, and the two biggest
   accounts have no PO".
2. **They fire rarely.** All three need data the first session does not have.
3. **One per turn is right, one per session is not.** A ten-minute conversation that gives back one
   fact has not earned anybody's time.

**What it should do:** every session gives something back at least once, and the bar is that the
person could not have said it themselves. From the arithmetic, from what is missing, from what they
said earlier in this same conversation.

---

# PART 5 - PLUMBING AND DATA

| | What | Size |
|---|---|---|
| 5.1 | Rita appears as "SENIOR, CARRIES 150 A" instead of her name | Small |
| 5.2 | 3,623 record lines carry a `[VERIFIABILITY:...]` prefix from before the fix | Small, data only |
| 5.3 | Carrying codes are stored and rendered almost nowhere | Medium |
| 5.4 | Banned phrases ~6% and long replies ~7%, both the designed fallback | One extra call per affected turn |
| 5.5 | Commit may return your OLD ground if you have set one up before | Unverified |

---

# PART 6 - DECISIONS

| | Question |
|---|---|
| 6.1 | Deploy the ten commits |
| 6.2 | Order of parts 2 and 3 - my recommendation is 2.1 first, then 3.1 and 3.2 together |
| 6.3 | Whether to spend an extra model call on 5.4 |
| 6.4 | The copy pass in 3.7 - I draft, you approve |

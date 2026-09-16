# The full list, 15-16 September 2026

Everything from this session. Part 1 is done and waiting on a deploy. Parts 2 to 7 are the work,
each with what is wrong, what it should do instead, how I would build it, and what could go wrong.

## WHERE THIS STANDS, 16 September, on `product-only` and in PR #301

Everything below is built, tested and pushed, except the three lines at the end.

| | | Where it lives now |
|---|---|---|
| 3.1 | The gap noticed during session 1 | `the-numbers-do-not-meet.ts` |
| 3.2 | Who carries which part | `who-carries-which-part.ts` |
| 3.3 | A number said in passing becomes a target | the check-in extraction, already running on completion |
| 3.4 | Press for the baseline | `a-number-with-no-starting-point.ts` |
| 3.5 | Periods with no financial year, Q4 and H1 included | `when-words-mean-a-date.ts` |
| 3.6 | The first session says one thing to do better | `what-this-session-is-missing.ts` |
| 4.1 | The finding leads with the arithmetic | `do-the-parts-add-up-to-the-whole.ts` |
| 4.2 | Every difference carries its reasoning | `the-session-report.ts`, `settledBy` |
| 4.3 | What changed since last time | `what-changed-since-last-time.ts` |
| 4.4 | The private note is about you | `what-your-own-record-says.ts` |
| 4.5 | Names, not "Participant A" | `party-labels.ts`, `each-side-gets-somebody` |
| 4.6 | The conversation from their words | `guide-sanitiser.ts`, `aboutSomethingTheySaid` |
| 2, 4.7 | The three cryptic headings, dashes, "account", "checkable" | the client, `the-four-reports.ts`, `a-dash-is-not-a-comma.spec.ts` |
| 5 | Every session gives something back | `something-they-could-not-have-said-themselves.ts` |
| 6.1 | Rita's label | not reproducible: no participant on the corpus carries a shouted role |
| 6.2 | 3,623 legacy `[VERIFIABILITY:]` lines | migration `20260916000000_the_marker_moves_out_of_the_text` |
| 6.4 | Banned ~6%, long ~7% | the designed fallback, and the opener is now held to the same bar |
| 6.5 | Commit returning an old ground | `a-second-setup-is-a-second-check-in.ts` |

STILL OPEN, and each is open for a reason rather than for want of time:

- **6.3, the carrying codes.** They are wired into the picture and the lead's list. All 28
  detections on the corpus sit at one period and the rule needs three, so nothing has surfaced yet.
  Lowering that gate is a product decision about how soon this product says somebody is carrying
  the place, and it is hers, not mine.
- **Pattern-based coaching**, which is the part that waits for three periods. Coaching itself does
  NOT wait for a pattern and never did - I said it did, and that was wrong. A step needs the same
  behaviour noticed in two distinct sessions (`SESSIONS_BEFORE_A_STEP`); a pattern only steers which
  behaviour to look at first, and is told explicitly that it is never the reason. Counted on the
  corpus: 582 coaching states, 494 with an observation, 307 with two or more, 81 holding a step.
- **The language pass on generated sentences.** The headings are plain now and the padding is gone.
  Whether a generated line sounds like a person is her ear, and the way to do it is to read real
  lines from a real run together.

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

# PART 2 - THE LANGUAGE

Her words, on reading the live product: "the language is a bit off and unclear in general", "the
tone is weird", "the language is so AI and hard to understand", and finally the one that settles
its priority - the writing sounds stupid and we need something clearer.

This sits ahead of the report's content because a report with perfect reasoning in this voice is
still one nobody reads.

## 2.1 What is actually wrong, in its own words

| Live text | What it should say |
|---|---|
| "Because silence is usually a stage, not a rejection, it is important to know that this kind of sales and expansion work often faces unfair reading, which you should consider before making assumptions about your current standing." | "Nothing in your session says how the 150 get closed. That is the gap." |
| "What decides whether the later sessions are worth anything is what you can point at." | "Next time bring one thing somebody else could open." |
| "Nothing above this has been named yet. The objectives here are being held on their own, so there is nothing to check them against." | "These goals do not sit under anything bigger. If they are meant to, say what." |
| "still open, as the written report reads it" | "1 still unsettled" |
| "Your record is building from what you are doing, not from what you are hoping for." | "You have 62 signed. What is next?" |
| "It is your baseline. I will use this when we check in on progress." | "Got it - that is the number we come back to." |
| Headings: NOTHING ABOVE THIS, AGAINST WHAT GOOD LOOKS LIKE, WHAT THIS RESTS ON, HOW MUCH THERE IS TO GO ON | What these goals serve. What each person said success is. How solid this is. How much was said. |

## 2.2 The pattern

Every bad sentence does one of two things. It **talks about a category instead of about the person**
- "this kind of work", "later sessions", "your current standing" - or it uses **words nobody says
out loud**: checkable, rests on, read against, unfair reading, surface, baseline, anchored.

## 2.3 Three rules, all testable

1. **A sentence that would be equally true of somebody else is cut.** "This kind of work often faces
   unfair reading" fails it. "You carry 150 of a 10,000 nobody has divided up" passes. This is
   checkable at generation: a sentence with no number, no name and no date from THIS record is a
   sentence about nothing.
2. **No word a person would not say to a colleague.** The list goes in code beside the other bans,
   because that is the one mechanism that has held.
3. **Headings name what is under them**, in ordinary words.

## 2.4 Where it applies

Both surfaces. The report's own written copy AND the generated sentences, and the chat's
acknowledgements - "that is the target you are working to", "it is your baseline" - which are the
same voice in a different place.

## 2.5 How this gets approved

I draft the replacement copy - headings, the standing sentences, the ban list - and show it to you
before any of it ships. It is your product's voice and I am not guessing at it.

---

# PART 3 - THE CHAT

## 3.1 It must notice the gap DURING session 1, not after it

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

## 3.2 Who is doing what, when nobody has said

Your chat had three people named and no statement of who owns which part. That is the
`whoInvolved` answer sitting next to objectives with no owners. The chat never asked.

**What it should do:** where the objective has no owners and people have been named, ask who carries
what. Once, early, in the lead's session, because it is the lead's to answer.

## 3.3 A number said in passing must become a target

"we've sold 10000 units of tea in abuja" is a target, a place and a unit. It stayed a sentence.
Setup extracts numbers properly; the check-in does not.

**What it should do:** the same extraction the setup path runs, on check-in answers.

## 3.4 Once a number exists, press for the baseline

"10,000 units" was accepted with no follow-up: what is it now, who confirms it, by when. A number
with no baseline cannot be checked next session, which is what makes session 2 worth anything.

## 3.5 The periods still unread

"This quarter", "end of Q4", "H1" need a financial year the product does not have. It must ask
which day rather than guess, using the same question the date work now uses.

## 3.6 The first session tells her one thing she could do better - and coaching cannot speak there today

Her words: "i want to chat and the first session gives me an insight into something i need to do
better in the conversation like setting the targets per person and telling them etc. This is now
gone somehow." And earlier: "maybe we should start coaching from the session 1 chat?"

**It is not gone. It was never in session 1**, and being exact about that changes what has to be
built.

The coaching machinery is live - the setting is on, 83 of 536 people carry a step - and the block
reaches a live conversation only where a step is ALREADY OUTSTANDING from an earlier session.
`nextMove` can choose a step at the end of session 1, it is written to the state, and the first
time anybody hears it is session 2. There is a deliberate guard: a step given in this session is not
asked about in this session, because that would be the coach asking about something it has not yet
said.

That guard is right and it is not the problem. The problem is that nothing else speaks in session 1,
so the first conversation - where somebody is most reachable and a gap costs least to fix - offers
nothing.

**What it should do.** Before session 1 closes, say ONE thing she could do better, from what this
conversation has just shown. Her own example is the case: she named an objective of 10,000 units and
three people, and gave nobody a number of their own. "Nobody here has a number of their own yet.
Deciding who carries how much, and telling them, is the thing to do before the next one."

**Where it comes from.** Not a pattern - there is no history in session 1 - but from what is missing
in the session in front of it, all of which is checkable in code:

- an objective with no owners, and people named
- individual numbers that do not reach the objective (the arithmetic from 4.1)
- a target with no date
- a commitment with nobody waiting on it
- nothing said that anybody else could open

**How.** The coaching read already runs at the end of every session. What is missing is a session-1
source for what to offer, drawn from the shape of THIS session rather than a history that does not
exist yet, and permission for the block to speak in the session that chose the step where there is
no earlier one to ask about first.

**Risk.** A first session that ends in a lecture. One line, at the close, about the check-in rather
than about the person, and only where something is genuinely missing. Where she has set the targets
and told people, it says nothing at all.

---

# PART 4 - THE REPORTS

The plan has three layers, because "no reasoning" is three different absences.

## 4.1 The finding must be the finding

Now: *"For everybody here: the role was never clearly defined, so there is no boundary to measure
work against."* That sentence fits every check-in ever run.

In the same report, four lines further down: 10,000 units (Abubakar), 2,000 units (Sahar), 150 bags
(you). The finding was sitting in the list.

**What it should do:** where the arithmetic has something to say, that IS the finding. "Three people
have named numbers in three different units. Nobody here can tell whether they add up to the 10,000
this check-in is aiming at." The arithmetic is already built and handed to the report; this is about
making it the headline instead of a line in the middle.

## 4.2 Every difference carries its reasoning

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

## 4.3 The intelligence layer - what only a reader of everything can see

Three things a person cannot see from inside their own session, which is the entire justification
for this product, and none of them are in the report:

- **The parts against the whole.** Built. Needs to lead.
- **Who is carrying what nobody agreed to.** The carrying codes exist and reach almost nothing.
- **What changed since last time.** Session 1 has nothing to compare, but from session 2 the report
  should open on movement, not on a fresh read.

## 4.4 The individual report must be about you and worth reading

Now: *"Because silence is usually a stage, not a rejection, it is important to know that this kind
of sales and expansion work often faces unfair reading, which you should consider before making
assumptions about your current standing."*

Nobody speaks like that. It is about a category, not about you, and it survives being deleted.

**What it should say, from what you actually told it:** you are carrying 150 of a 10,000 objective
nobody has divided up; there is no date on the pricing sheet; nothing in your session says how the
closing gets done. Three sentences, each pointing at something on your own record.

**How:** the individual report is generated per person from their own lines plus the arithmetic.
Same rule as 3.2 - a sentence that could be said to somebody else is cut.

## 4.5 Names, not "Participant A"

And a commitment goes under commitments, not under "what everybody agrees".

## 4.6 The conversation worth having comes from their words

Now: *"What did that turn into - pipeline, conversion, sign-ups?"* in a conversation about tea in
Abuja.

## 4.7 The copy pass - moved to PART 2, which is now the whole language question

`NOTHING ABOVE THIS`, `WHAT THIS RESTS ON`, `AGAINST WHAT GOOD LOOKS LIKE` are cryptic. The generated
sentences are worse. This is a rewrite of the report's own language into plain words.

**I will draft this and show it to you before it ships.** It is your voice and I will not guess it.

---

# PART 5 - WHAT THE PRODUCT GIVES BACK

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

# PART 6 - PLUMBING AND DATA

| | What | Size |
|---|---|---|
| 5.1 | Rita appears as "SENIOR, CARRIES 150 A" instead of her name | Small |
| 5.2 | 3,623 record lines carry a `[VERIFIABILITY:...]` prefix from before the fix | Small, data only |
| 5.3 | Carrying codes are stored and rendered almost nowhere | Medium |
| 5.4 | Banned phrases ~6% and long replies ~7%, both the designed fallback | One extra call per affected turn |
| 5.5 | Commit may return your OLD ground if you have set one up before | Unverified |

---

# PART 7 - DECISIONS

| | Question |
|---|---|
| 7.1 | Deploy the ten commits |
| 7.2 | Order. My recommendation: PART 2 (the language), then 3.1 and 3.6 together (the chat noticing the gap, and saying one thing she could do better before session 1 closes), then 4.1 and 4.2. The language pass makes everything after it legible |
| 7.3 | Whether to spend an extra model call on 6.4 |
| 7.4 | The language drafts in PART 2 - I write them, you approve before they ship |

# Pass 1: what is in the prompt, and where each part belongs

Measured on the live database and the live code on 15 September 2026. Every number here came
from counting, not from reading and estimating.

This replaces nothing. `phase-0-what-is-in-the-base-prompt.md` counted the named rules. This
asks a different question: for each part, is it a **shape**, a **judgement**, or a **fact**, and
is it shipped when it applies or shipped always.

---

## CORRECTION, 15 September 2026, before anybody acts on this

**The first version of this section was wrong. What it said, and what is true, are both below.**

It said the system prompt was a hand-edited database row that appeared in no diff, had no tests
and reached one environment at a time. All four are false. The prompt is `ENGINE_RULES` in
`prompt-library.ts`, 121,866 characters, byte for byte identical to the active database row. It
is seeded on every boot, it is in the repository, it shows in diffs, and fifteen specs assert on
it. A hand edit made at Admin then Prompts does not even survive a restart: the seed reactivates
the code version.

What I should have done is `grep ENGINE_RULES` before writing that it had no home in code. The
comment at `prompt-library.ts` line 17 says `system prompt = ENGINE_RULES (DB key "system")`.

**What this changes:** there is nothing to migrate, and the third decision put to Hafsah - move
the row into code or leave it hand-edited - was void. Every other finding in this document and
in pass 2 was measured directly and stands unchanged.

---

## The one number that still decides the shape of this work

| What ships on every turn | Size | Where it lives |
|---|---|---|
| `ENGINE_RULES`, seeded to the `system` row | 121,866 characters, 19,739 words | `prompt-library.ts` |
| All 33 other code blocks together | about 14,000 characters | `prompt-library.ts` |

Ninety percent of every prompt is one constant. That is still the finding: not that it is
unreviewable, but that it is enormous, says several things twice, and contradicts itself and the
code in three places.

## The test used here

| It is | Belongs in | Because |
|---|---|---|
| A **shape** or a limit: how many questions, how long, what may never be said | Code | Countable without judgement. A prompt asking politely is exactly what failed |
| A **judgement**: what is worth asking, what a good answer looks like, how to read a silence | Prompt | The model is better at this than a rule is, and it is what keeps the conversation from being a script |
| A **fact** about this check-in: the targets, who is in it, what happened last time | Context | Not a rule. It changes per person |

And one condition test: **a block that only applies sometimes should be added when it applies,
not shipped always with its condition written in prose.** That distinction is where most of the
19,739 words went.

---

## What a prompt-only ban is worth, measured

The vocabulary section bans a list of words and phrases outright. Every AI turn the product has
ever produced is on record, so this is checkable rather than arguable.

**8,317 AI turns. 237 of them carry something the prompt bans.**

| Banned | Turns carrying it |
|---|---|
| "it sounds like" | 125 |
| "performance" | 59 |
| "I understand" | 17 |
| "metric" | 13 |
| "I hear you" | 7 |
| "oversight" | 4 |
| "it seems like" | 3 |
| "staff" | 3 |
| "patterns", "cross-reference", "assess", "verdict", "score" | 6 between them |

Not historical drift: the rate holds to the current day, and two of the 36 turns produced today
carry "it sounds like" - one of them in a check-in I drove myself this afternoon.

A literal string is a shape. Prose banning it leaks at about one turn in fifty, for years, in
front of customers. This is the clearest answer in the audit to "code or prompt".

---

## The twenty zones

Word counts are exact. The verdict column says where each zone belongs under the test above.

| Words | Zone | Verdict |
|---|---|---|
| 1,042 | The two modes and the three failure origins | **Split.** The three origins are judgement and earn their place. "ALIGNMENT FEED MODE" is a second product - reading across the whole org - shipped on every turn of a one-person conversation |
| 860 | Who you sound like, and the four turns | **Prompt.** Voice is judgement and this is the part doing the most work |
| 768 | Showing an answer, and not saying theirs back | **Split.** "Show what an answer looks like" is judgement. "Do not say their answer back" is now a standing code block, so this is a second copy |
| 600 | The session steps: goals, compare, evidence | **Prompt**, but conditional: these are session-1 steps shipped into session 4 |
| 1,636 | Probing: documents, pushback, refusal, a colleague's claim | **Prompt.** Judgement, and the counts inside it (three asks, one retry) are shapes hiding in prose |
| 1,577 | Returning user, one question, timeframe, close marker | **Split.** The close marker is mechanical and already in code. "One question" is a shape stated here and enforced there |
| 744 | Overrides: human first, healthy situation, general knowledge | **Prompt.** Genuine overrides, and the first of them is the most important sentence in the file |
| 1,385 | Turn-level conduct: acknowledge, re-ask, verify, summaries | **Prompt** |
| 811 | Length, engagement, banned words, editorialising, filler | **Code.** Every rule in this zone is a count or a literal string |
| 912 | Readings and the five tones | **Prompt.** Judgement, and conditional on a reading being offered at all |
| 1,109 | Cross-reference degrees and framing | **Context.** Degrees 1 to 3 describe what data exists; the product knows which degree it is in and could ship only that one |
| 1,282 | The positives lists | **Prompt**, conditional. Eleven named lists of things to praise, all shipped every turn |
| 937 | The pattern codes and drift indicators | **Cut or move.** Codes like C3+ and B4+, several marked "alignment feed only, never name to the person" - instructions about a surface this conversation cannot reach |
| 1,021 | Live feedback, quality of delivery, the close | **Split.** The four delivery questions are judgement and good. The close length is a shape and now lives in code |
| 1,337 | The independence test and mention types | **Prompt** |
| 737 | Triggered conversations | **Conditional.** Whole protocol for a conversation the founder may run later |
| 669 | Failing relationship protocol | **Conditional.** Fires on `RELATIONSHIP_HISTORY = drifted` - a field the code already has |
| 543 | Recall session protocol | **Conditional.** Fires on `SESSION_MODE = recall` - also a field the code already has |
| 1,326 | The intake format documentation | **Context.** Documentation of the block the code builds, sat inside the prompt, free to drift from what the code emits |
| 443 | Vocabulary, banned words, product identity | **Code.** See the table above |

---

## The structural finding

Two of these zones name their own condition in prose - "drifted" and "recall" - and both
conditions are already fields the code reads and could switch on. They are shipped to everybody
anyway. Do that twenty times and you have 19,739 words.

**The model is being asked to evaluate about thirty conditions on every turn to decide which
tenth of its instructions apply.** That is what is being paid for on every message, and it is
why the rules that lose are the small ones: a two-line ban on a phrase, competing with 900
words on pattern codes.

---

## One thing to fix in customer-facing copy, separately

The prompt's answer to "what is Groundwork?" is:

> "Groundwork is a contribution intelligence layer."

That is the line a customer gets, and it is the kind of language the plain-language rule exists
to stop. The opening paragraph is the same: "organisational intelligence layer", "trust
calibration", "injection recommendations". Worth a rewrite regardless of what the audit decides.

---

## What pass 2 and pass 3 do

- **Pass 2, duplicates and neighbours.** "One question" is stated in nine places with different
  wordings and a note at line 445 trying to reconcile two of them. Same for length, for the
  close, and for what may not be said about an absent person.
- **Pass 3, dead weight.** Every zone whose surface this conversation cannot reach.
- **Pass 4 is the only one that needs you**: a single page of keep / move / merge / cut, with
  what breaks if each call is wrong.

# Pass 2 and 3: what is said twice, what contradicts itself, and what cannot reach anybody

Counted on the live `system` row and the live code, 15 September 2026. Line numbers are lines of
that row. Companion to `phase-1-every-rule-and-where-it-belongs.md`.

**Correction, same day:** pass 1 claimed the prompt was a hand-edited database row outside code.
It is `ENGINE_RULES` in `prompt-library.ts`, seeded on boot, with fifteen specs on it. See the
correction at the top of pass 1. Nothing in THIS document depended on that claim - every line
below was measured against the row and the code directly - but the third decision it produced
was void.

The headline from pass 1 was that the prompt is too long. This pass is about something worse
than length: **several rules are stated more than once, and some of the copies disagree.** A
model given two answers picks one, and which one it picks is not a decision anybody made.

---

## The conflicts, which matter more than the repeats

### 1. How long the closing turn may be

| Source | Says |
|---|---|
| The row, line 885 | "THE CLOSING TURN IS THE SHORTEST TURN OF THE SESSION. Not the longest." |
| The row, line 887 | "the close is three sentences at most, and fewer is better" |
| The code, `a-reply-is-not-an-essay.ts` | A close may run to **140 words** - more than double what any other turn gets |

The code's exemption was written for a real reason: the last turn names what now exists, with
the figures and the people in it. The row says the opposite, for an equally real reason: the
report shows them all of it anyway, so reading it back is saying the same thing twice.

They cannot both be right. The close I watched land this afternoon was **72 words and six
sentences** - inside the code's allowance, double the row's rule.

**This is the one to decide first**, because it is the last thing a person reads in a session.

### 2. How long any other turn may be

| Source | Says |
|---|---|
| The row, line 477 | "Vague submission: **longer** response: name the vague language specifically, explain what is missing" |
| The row, line 478 | "Never pad a response to seem thorough" |
| The code | 60 words, and a retry instruction that says "drop the explaining, the restating and the reasons for asking" |

The row tells the model to explain more exactly where the code tells it to explain less. Her
words on this were "the responses are soo long its insane". The rule she was complaining about
is still in the prompt, telling it to go longer.

### 3. Two copies of the banned words, and they have drifted

The ban list appears at **line 489** and again at **line 1274**. Twenty-two phrases appear in
both. The copies differ:

| Only in the first copy | Only in the second copy |
|---|---|
| "entry" | "employee", "staff", and the product identity line |

Two lists, one topic, maintained by hand, already out of step. And the leak rate measured in
pass 1 - 237 turns out of 8,317 - is what both copies together achieve.

---

## The repeats - CORRECTED, and most of them were not repeats

**The first version of this section counted keyword hits and called them duplicates. I read each
hit afterwards and most are not.** What follows is what survived reading.

| Claimed | True? | What the hits actually are |
|---|---|---|
| "One question per turn, stated in eleven places" | **No** | One canonical statement, at the ONE QUESTION RULE, and it is a good one - it names its own exception and says what is NOT two questions. The other hits use the same words for different rules: "every alignment ground is working toward one question" is about the key question of a whole check-in; "the one question" in a trigger briefing is a founder's opening line; "name the pattern, show the evidence, ask one question" is how to deliver a reading. One line does reconcile itself with the rule - "this composes with the ONE QUESTION RULE above" - and that is a useful sentence, not a duplicate |
| "A claim about an absent colleague, stated in eight places" | **No, and worse** | Five of the eight are the word "absent" meaning not delivering - "Invisible Backbone: work only noticed when absent", "equity held, delivery absent". The rule itself appears once, under A CLAIM ABOUT A COLLEAGUE IS THEIRS, NOT YOURS. I had called it the most important repeat in the file. It is not a repeat |
| "The banned words, written out twice" | **Yes** | Verified by comparing the two lists field by field; they had drifted. Now one copy plus a pointer |
| "Ask for the timeframe, six statements" | Partly | Six statements inside one section on one topic, which is a section, not six copies |
| "Never announce a save, twice" / "Do not re-ask, twice" | Small and real | Two lines each, adjacent, worth merging if that file is ever touched for another reason |

**Why I got it wrong:** I grepped for a topic, counted the lines that matched, and reported the
count as duplication without reading the matches. The same shortcut produced both errors. The
findings in this document that were checked by reading or by comparing against code - the three
conflicts, the two ban lists, the pattern codes - all stand.

## The pattern codes: 52 in the prompt, 39 in the product

`pattern-library.ts` defines the pattern codes the product can actually detect, store and
surface. The prompt carries a taxonomy of its own.

| Where | Codes |
|---|---|
| The prompt | 52 |
| The code library | 39 |
| **In the prompt and nowhere else** | **13**: A1, A2, A3, C1, C2, C3, M1, M2, M3, M4, N1, N2, N3 |

Nothing in the library is missing from the prompt, so this is one-way drift: thirteen codes the
model is told to detect and name, which the product cannot store, cannot report on and cannot
act on. They were either removed from the code and left in the row, or added to the row and
never built.

Worth saying clearly: the alignment feed is **real**. It has a service, a pattern library and
reports. `ALIGNMENT_FEED_ONLY_CODES` in the code already enforces "never name this to the
person", which is a safety rule correctly owned by code. So the taxonomy is not dead - it is
**in the wrong prompt**. A check-in conversation with one person does not need 937 words
describing codes, most of which are explicitly marked as things it must never say aloud.

---

## Pass 3: what cannot reach anybody from here

| Zone | Words | Why it cannot land |
|---|---|---|
| ALIGNMENT FEED MODE | part of 1,042 | A second mode, for reading across the whole organisation. Every turn of every one-person conversation carries the instructions for it |
| The pattern codes and drift indicators | 937 | Above. Detection is the library's job; several are marked never to be said to the person |
| The positives lists | 1,282 | Eleven named lists of things to praise, shipped in full every turn. Judgement worth keeping - but three of the eleven apply to any given conversation at most |
| Triggered conversations | 737 | A protocol for a conversation the founder may run later, outside this check-in |
| Failing relationship protocol | 669 | Fires only on `RELATIONSHIP_HISTORY = drifted`, **a field the code already reads** |
| Recall session protocol | 543 | Fires only on `SESSION_MODE = recall`, **also a field the code already reads** |
| The intake format documentation | 1,326 | Documentation of the block the code builds, kept inside the prompt where it is free to drift from what the code emits - exactly as the pattern codes did |

**5,494 words of 19,739** either describe another surface or carry their own switch in prose
while the code already holds the switch.

---

## What this means for the rebalance

The plan I would take into pass 4:

1. **Every literal ban becomes code.** One list, one place, measured. This is the change with a
   number attached to it: 237 turns.
2. **The two conditions the code already holds become conditions.** `drifted` and `recall` are
   fields. That is 1,212 words that ship only when they are true, with no judgement call at all
   and nothing to decide.
3. **The pattern taxonomy leaves the conversation prompt.** It belongs with the library that
   defines it.
4. **Each repeat collapses to its best statement.** Not the shortest - the best. The one-question
   rule at 336 is better than the ten copies of it because it names its own exception.
5. **The three conflicts get decided rather than averaged.** Close length, reply length, and
   which ban list is the real one.

None of that touches the judgement the prompt is actually for: the three failure origins, the
voice, the probes, the readings, the four delivery questions. That material is why the
conversation works, and it is not what made the prompt long.

## What pass 4 needs from you

Three decisions, and only three:

| Decision | Options |
|---|---|
| The closing turn | Three sentences, as the row says, or up to 140 words, as the code allows |
| A vague answer | Gets a longer reply, as the row says, or the same 60 words as everything else |
| ~~The `system` row~~ | ~~Into code, or stays hand-edited~~ - **void, it was always in code. See the correction above** |

The rest of the list above I can do without you, because every item is either a count, a
duplicate, or a field the code already reads.

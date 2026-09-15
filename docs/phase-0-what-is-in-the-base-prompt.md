# Phase 0: what is in the base prompt

Read on 14 September 2026, after a lead walked a live check-in and called the conversation
"absolutely terrible" and "going around in circles", and the report "a bit rude".

**Nothing has been removed. This is the list to decide from.** Hafsah's rule: nothing goes on the
strength of being long. A block leaves the prompt only when a spec already guarantees it, or when it
moves into code with a test written first. Anything that is judgement stays.

## The numbers

| | |
|---|---|
| All active prompt text | 244,164 characters |
| The base prompt (`system`), sent to every conversation | **116,527** — 48% of everything |
| Report synthesis | 8,941 |
| 22 scenario packs, combined | ~62,000, about **1,400 each** |
| Named blocks inside the base prompt | **44** |

The scenario a lead picks is about 1% of what the model is handed. That is the whole reason a
check-in does not follow the situation it was set up for.

## The two biggest blocks, checked by hand

**`ONE QUESTION RULE` — 19,081 characters, 16% of the base prompt.** Already enforced in code.
`one-question-per-turn.ts` finds a second question and drops it before anybody sees it, and the
screen runs on every reply on both the streaming and non-streaming paths. We pay 19,000 characters
on every turn of every conversation for a rule the code already guarantees.

**`BANNED WORDS AND PHRASES` — 17,780 characters.** Partly enforced in code. `outbound.ts` rewrites
"your account" to "what you said" and strips "that is now on your record" with real expressions, and
its own specs cover the two words that matter most. Whether the code covers the whole list is the
first thing Phase 0 has to answer, because these two blocks together are **32% of the base prompt.**

## Every block, largest first

The last two columns are for the review, not filled in by me. **What it is for** comes from the
comments and specs that already name the incident each block came from. **Pile** is one of: `code`
(a checkable shape, moves out with a test), `judgement` (stays), `covered` (a spec already
guarantees it), `gone` (fixed properly elsewhere since).

| Characters | Block | What it is for | Pile |
|---|---|---|---|
| 19,081 | ONE QUESTION RULE | | |
| 17,780 | BANNED WORDS AND PHRASES | | |
| 15,468 | LIVE FEEDBACK RULES | | |
| 7,468 | DO NOT SAY THEIR ANSWER BACK TO THEM BEFORE YOU ASK THE NEXT THING. | | |
| 5,565 | GROUND CHECK-IN INTAKE FORMAT | | |
| 4,920 | HOW TO KNOW WHEN THE MATERIAL IS THERE | | |
| 4,559 | EQUITY AND GOVERNANCE POSITIVES | | |
| 3,744 | FAILING RELATIONSHIP PROTOCOL | | |
| 3,410 | WHAT NEVER CROSSES REGARDLESS OF CONSENT | | |
| 3,341 | PUSHBACK RULES | | |
| 3,338 | A CLAIM ABOUT A COLLEAGUE IS THEIRS, NOT YOURS | | |
| 3,067 | THE HARDEST DIAGNOSTIC PROBLEM | | |
| 2,652 | WHO YOU SOUND LIKE | | |
| 2,624 | DO NOT COMMENT ON ENGAGEMENT | | |
| 2,457 | COORDINATION POSITIVES | | |
| 1,999 | RELATIONSHIP SIGNATURES | | |
| 1,837 | RETURNING USER OPENING | | |
| 1,434 | EQUITY AND GOVERNANCE PATTERNS | | |
| 1,223 | WHERE A QUESTION IS HARD TO ANSWER COLD, SHOW WHAT AN ANSWER LOOKS LIKE. | | |
| 1,062 | FOUR TURNS IN THIS VOICE | | |
| 1,048 | WHAT THIS FORMAT IS NOT | | |
| 955 | REFUSING TO TAKE PART, AND SUSPICION OF THE TOOL | | |
| 875 | ALIGNMENT FEED MODE | | |
| 830 | RECALL SESSION PROTOCOL | | |
| 716 | ORIGIN 3 - THE PERSON (CHARACTER) | | |
| 658 | EVIDENCE DEFINITION POSITIVES | | |
| 598 | ORIGIN 1 - THE SITUATION | | |
| 595 | OPENING - THE AGREEMENT | | |
| 580 | ORIGIN 2 - THE PERSON (SKILLS) | | |
| 572 | THE RECALL REPORT | | |
| 532 | WHAT RECALL EVIDENCE IS AND IS NOT | | |
| 524 | COMMERCIAL POSITIVES | | |
| 436 | RESPONSE LENGTH | | |
| 426 | WHAT CROSSES WITHOUT CONSENT | | |
| 419 | CONTRIBUTION CHAT MODE | | |
| 399 | COMMERCIAL PATTERNS | | |
| 384 | RELATIONSHIP POSITIVES | | |
| 330 | (opening) | | |
| 330 | PRODUCT IDENTITY | | |
| 321 | TONE FOR FAILING RELATIONSHIP SESSIONS | | |
| 302 | THREE MONTHS AGO | | |
| 280 | EVIDENCE DEFINITION IS THE STANDARD | | |
| 278 | THE OTHER SIDE | | |
| 159 | WHAT REQUIRES EXPLICIT CONSENT FROM BOTH PARTIES | | |

## What happens after this list

1. You read it and mark the piles. Nothing moves before that.
2. **Phase 1 is not a cut.** The generic goal-alignment interview stops being *sent* when the
   scenario has its own opening. Nothing is deleted, it stops competing, one line to revert.
3. **Phase 2** moves the `code` pile out, one commit and one test each, `ONE QUESTION RULE` first.
4. **Phase 3** gives every scenario pack the same skeleton: its opening, its follow-ups, its
   examples. This is where example answers belong.
5. **Phase 4** is a test that fails when the base prompt grows past a ceiling, so the next fix has to
   choose what to remove.

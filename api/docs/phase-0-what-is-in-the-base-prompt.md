# Phase 0: what is in the base prompt

Read 14 September 2026, **corrected 15 September 2026.**

## Correction, read this first

The first version of this document said the largest block was `ONE QUESTION RULE` at 19,081
characters, sixteen per cent of the base prompt, and already enforced in code. **That was wrong and
it was my error.** The heading-matcher I used missed most sub-headings, so it ran one heading
straight through eighteen unrelated rules and attributed all of them to the first.

`ONE QUESTION RULE` is **968 characters.** It is still already enforced in code by
`one-question-per-turn.ts`, so it can still go, but it is worth about one per cent, not sixteen.

Found by opening the block to check the claim before removing anything, which is the only reason it
did not become a saving somebody went looking for and could not find.

## What is actually there

| | |
|---|---|
| All active prompt text | 244,164 characters |
| The base prompt (`system`), sent to every conversation | **116,527** - 48% of everything |
| **Named rule headings inside it** | **136** |
| Largest single block | **5,024** (GOAL ALIGNMENT: the most important first con) |
| 22 situation packs, each | about 1,400 |

**There is no one big block to remove.** The base prompt is 136 rules, and the size is spread
thin:

| Size | How many |
|---|---|
| over 2,000 characters | 12 |
| 1,000 to 2,000 | 30 |
| 500 to 1,000 | 40 |
| under 500 | 54 |

That changes what the work is. It is not one bloated section: it is a hundred and thirty-six rules,
each written for a real incident, each individually defensible, sent together on every turn to
everybody. Nothing here is removable by finding the fat. Every character leaves by being either
guaranteed elsewhere or made conditional.

The largest one, `GOAL ALIGNMENT` at 5,024, is already handled: Phase 1 stops sending it whenever the
situation has its own opening, without deleting it.

## Every block, largest first

The last two columns are for the review. **What it is for** is usually written in the comments and
specs around the rule. **Pile** is one of: `code` (a checkable shape, moves out with a test first),
`conditional` (fires on a trigger, like the other twenty-nine blocks in the assembled prompt),
`always` (identity, voice, safety - stays), `covered` (a spec already guarantees it).

Hafsah's rule, unchanged: nothing goes on the strength of being long.

| Characters | Block | What it is for | Pile |
|---|---|---|---|
| 5,024 | GOAL ALIGNMENT: the most important first conversation | | |
| 4,632 | GROUND CHECK-IN INTAKE FORMAT | | |
| 3,421 | CROSS-REFERENCE DEGREES - what data is available and when | | |
| 3,386 | A CLAIM ABOUT A COLLEAGUE IS THEIRS, NOT YOURS | | |
| 3,018 | THREE-PERIOD RULE - never fire a pattern code on one data point | | |
| 2,671 | WHO YOU SOUND LIKE | | |
| 2,524 | TIMEFRAME RULE - never assume a period, ask for it, confirm it at the end | | |
| 2,481 | COORDINATION POSITIVES | | |
| 2,263 | CONTRIBUTORS ARE NOTED NOW, INVITED AFTER YOU CONFIRM - AND ALWAYS IN PARALLEL | | |
| 2,227 | FAILING RELATIONSHIP PROTOCOL | | |
| 2,054 | A SUMMARY IS NOT YET AN ANSWER - probe for what is behind it, one turn at a ti | | |
| 2,024 | RELATIONSHIP SIGNATURES | | |
| 1,889 | THE SURVIVABLE TRUTH PRINCIPLE: the design philosophy | | |
| 1,825 | CONVERSATION TRIGGERS: when to generate them | | |
| 1,794 | HUMAN FIRST RULE - overrides every probe, every pathway, every session instruc | | |
| 1,734 | PUSHBACK RULES | | |
| 1,656 | CONTRIBUTION TAXONOMY: classify every submission | | |
| 1,622 | REFUSAL RULE - exactly one retry, then record and move on gracefully. Never ba | | |
| 1,546 | CLAIMED AND EVIDENCED: named artefact, named recipient or verifier, independen | | |
| 1,537 | DEMONSTRATE YOU HEARD - never announce the save | | |
| 1,502 | CHECK-IN ENDING: record summary, not feedback summary | | |
| 1,439 | ALIGNMENT FEED: narrative briefing replaces signal dashboard | | |
| 1,428 | SESSION CLOSE MARKER - required, mechanical, never explained to the person | | |
| 1,403 | DO NOT SAY THEIR ANSWER BACK TO THEM BEFORE YOU ASK THE NEXT THING. | | |
| 1,390 | LIVE FEEDBACK RULES | | |
| 1,376 | GENERAL KNOWLEDGE RULE - the agent is not limited to work questions | | |
| 1,344 | CROSS-REFERENCE CONTRADICTION HANDLING - context not confrontation | | |
| 1,296 | WHERE A QUESTION IS HARD TO ANSWER COLD, SHOW WHAT AN ANSWER LOOKS LIKE. | | |
| 1,250 | VERIFY CLAIMS BEFORE MOVING ON - a stated fact is not yet a verified one | | |
| 1,231 | EMOTIONAL DETECTION RULE - the mediator not the therapist | | |
| 1,209 | THE HARDEST DIAGNOSTIC PROBLEM | | |
| 1,206 | BEHAVIOURAL POSITIVES: name explicitly | | |
| 1,191 | CROSS-REFERENCE FRAMING RULE - always a shared picture, never a contest | | |
| 1,111 | SENIOR HIRE ONBOARDING: first conversation is different | | |
| 1,107 | DOCUMENT PROBE - three asks before accepting nothing exists | | |
| 1,096 | IF THEY NAME AN OUTCOME RATHER THAN AN ACTION - "she needs to change it", "the | | |
| 1,094 | HEALTHY SITUATION RULE - believe them, do not manufacture tension | | |
| 1,088 | FOUR TURNS IN THIS VOICE | | |
| 1,059 | ENCOURAGING: person is doing strong work that is not visible | | |
| 1,043 | DELIVERY POSITIVES: name explicitly | | |
| 1,042 | F1. INSIGHT WITHOUT OPERATION: the most important senior hire pattern. | | |
| 1,004 | REFUSING TO TAKE PART, AND SUSPICION OF THE TOOL | | |
| 985 | QUESTION 4 - WHERE THE ROLE WAS AMBIGUOUS, WHAT DID THE PERSON DO? | | |
| 980 | RETURNING USER OPENING | | |
| 978 | TRAJECTORY FEEDBACK: surface at period transitions and after three or more imp | | |
| 968 | ONE QUESTION RULE | | |
| 962 | SIMULTANEOUS REPORT REVEAL - non-negotiable | | |
| 953 | THREE MENTION TYPES: when a colleague name appears in a submission | | |
| 939 | CONVERSATION PREP CARD: when a flagged conversation is imminent | | |
| 933 | WHEN YOU CLOSE, SAY WHAT THEY NOW HAVE. NOT WHAT YOU DISCUSSED. | | |
| 909 | THE READING RULE: how to offer a perspective on the other person | | |
| 907 | THINKING LANGUAGE: classify as advisory contribution only. | | |
| 879 | CONVERSATION QUALITY RULES: follow these on every exchange | | |
| 870 | THE NARRATION RULE - never state the other side's position as fact before hear | | |
| 846 | SOMETHING THE NEXT SESSION CAN TEST - required, and this is the one the record | | |
| 833 | WARM AND OPEN: person is declining or something has changed | | |
| 819 | NO-EDITORIALISING RULE - never comment on the situation from outside it | | |
| 789 | RECALL SESSION PROTOCOL | | |
| 773 | THE QUESTION: "What was agreed between you that was never actually said out lo | | |
| 768 | USE THE CONVERSATION SO FAR - do not re-ask what has been answered | | |
| 754 | HOW TO KNOW WHEN THE MATERIAL IS THERE | | |
| 751 | ORIGIN 3 - THE PERSON (CHARACTER) | | |
| 747 | OUTPUT LANGUAGE: classify as delivery evidence when accompanied by named recip | | |
| 742 | IN PRACTICE | | |
| 738 | EQUITY AND GOVERNANCE POSITIVES | | |
| 732 | DRIFT RECOVERY POSITIVES: name at period transitions and when three or more im | | |
| 722 | MOVEMENT POSITIVES: name explicitly | | |
| 719 | POSITIVE DRIFT SIGNALS: name these when trajectory is recovering | | |
| 658 | USE INSTEAD | | |
| 656 | WHAT THIS FORMAT IS NOT | | |
| 633 | F5. COFOUNDER BURDEN ASYMMETRY: one founder carrying disproportionate load. | | |
| 624 | ORIGIN 1 - THE SITUATION | | |
| 620 | OPENING - THE AGREEMENT | | |
| 612 | ORIGIN 2 - THE PERSON (SKILLS) | | |
| 596 | ACKNOWLEDGE BEFORE PROBE: hard rule | | |
| 591 | THE RECALL REPORT | | |
| 574 | F2. VISION EXECUTION GAP: senior person's strategy is not landing. | | |
| 574 | BANNED PHRASES - performed empathy | | |
| 568 | WHAT RECALL EVIDENCE IS AND IS NOT | | |
| 560 | BANNED WORDS AND PHRASES | | |
| 546 | COMMERCIAL POSITIVES | | |
| 524 | DEPENDENCIES - the one new thing to ask about, non-leading | | |
| 482 | BANNED PHRASES - editorialising | | |
| 480 | POSITIVE SIGNAL DETECTION: name these when you see them | | |
| 456 | WHAT CROSSES WITHOUT CONSENT | | |
| 453 | RESPONSE LENGTH | | |
| 452 | F4. RELATIONSHIP WITHOUT LEVERAGE: valued presence, no delivery acceleration. | | |
| 448 | ALIGNMENT FEED MODE | | |
| 448 | THE REFRAME MOVE: for defensive posture | | |
| 447 | THE THREE FAILURE ORIGINS: the most important diagnostic | | |
| 443 | CONTRIBUTION CHAT MODE | | |
| 425 | EQUITY AND GOVERNANCE PATTERNS | | |
| 422 | BANNED WORDS: never use these in any user-facing response | | |
| 420 | COMMERCIAL PATTERNS | | |
| 419 | F3. EQUITY COMFORT: urgency declining as position secures. | | |
| 416 | CONSENT ARCHITECTURE: what crosses, what requires consent, what never crosses | | |
| 413 | QUALITY OF DELIVERY: four questions for every named deliverable | | |
| 410 | MEETING LANGUAGE: classify as activity only. Always probe for output. | | |
| 408 | RELATIONSHIP POSITIVES | | |
| 390 | DO NOT COMMENT ON ENGAGEMENT | | |
| 361 | TONE FOR FAILING RELATIONSHIP SESSIONS | | |
| 360 | VOLUNTARY DISCLOSURE POSITIVES: highest priority | | |
| 357 | FILLER PHRASE BAN - specific phrases that produce no information | | |
| 351 | QUESTION 2 - WAS IT COMPLETE AS DEFINED BY THE DOWNSTREAM RECIPIENT? | | |
| 348 | PRODUCT IDENTITY | | |
| 337 | SOCIAL LANGUAGE: classify as Type 1 mention. Never contribution evidence. | | |
| 328 | EVIDENCE DEFINITION POSITIVES | | |
| 322 | LANGUAGE CLASSIFICATION: apply on every submission | | |
| 320 | THREE MONTHS AGO | | |
| 317 | EVIDENCE DEFINITION IS THE STANDARD | | |
| 294 | THE OTHER SIDE | | |
| 271 | SENIOR HIRE PATTERNS: detect these specifically | | |
| 245 | THE INDEPENDENCE TEST: apply to every claimed output | | |
| 240 | THE CENTRAL QUESTION: what every ground is building toward | | |
| 230 | QUESTION 3 - WAS THE QUALITY ACCEPTABLE BY THE DOWNSTREAM RECIPIENT'S ACCOUNT? | | |
| 217 | HIGH TRUST: probe directly, give specific feedback, challenge claims that do n | | |
| 209 | WHAT REQUIRES EXPLICIT CONSENT FROM BOTH PARTIES | | |
| 205 | WHAT NEVER CROSSES REGARDLESS OF CONSENT | | |
| 196 | SYSTEM WORDS - never use in responses to the person | | |
| 180 | QUESTION 1 - DID IT SHIP? | | |
| 166 | VOCABULARY: PRODUCT VOICE | | |
| 115 | DEFENSIVE: stop probing the content. Use REFRAME tone. | | |
| 109 | TONE STATES: use the one the situation calls for | | |
| 108 | INJECTION LAYER: three tiers, use as instructed | | |
| 108 | TRUST CALIBRATION: use the trust state provided | | |
| 106 | DECLINING ENGAGEMENT: do not probe content. Reference a specific unresolved th | | |
| 103 | LOW TRUST: do not probe harder. Reference something concrete from their record | | |
| 101 | ORGANISATIONAL ONTOLOGY: pattern library | | |
| 73 | DRIFT INDICATORS: early warning signals, track trajectory across periods | | |
| 64 | THE RECALL STRUCTURE - run in this order, one period at a time | | |
| 56 | HIGH ENGAGEMENT TO SILENT: departure or crisis precursor | | |
| 52 | CORROBORATION TO SILENCE: relationship drift signal | | |
| 48 | SPECIFIC TO VAGUE: trust or disengagement signal | | |
| 44 | EXECUTOR TO NARRATOR: misalignment precursor | | |
| 42 | COORDINATOR TO ABSORBER: burnout precursor | | |
| 16 | YOUR TWO MODES | | |

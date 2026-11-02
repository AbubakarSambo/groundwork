# What the engine does well, and must not lose

Making the product sound better must never make it know less. Each item below is something the current engine does well, with where it lives (from the backend contract) and how it is measured. `tools/score_run.py` measures the numbers on the 24-scenario run. **If any number drops by more than a tenth against `docs/baseline.json`, the change is rejected**, however good the wording looks.

## In the conversation

| What it does | Where it lives | How it is measured |
| --- | --- | --- |
| **Asks for proof**, and quotes the exact passage of a document that backs a line | `RecordEntry.anchoredDocumentId`, `anchoredPassage`; proof rules in `ENGINE_RULES` | "proof asked for (turns)" |
| **Brings back what people said before**: what they are owed, what they promised, what they said last time | the "owed" and "one thing back" blocks in the turn plan | "past words brought back (turns)" |
| **Asks for the specific detail**: how many, which one, what date | `whatACompleteAnswerHolds` (PLACE, THING, QUANTITY, ACTOR, COUNT, DATE, MONEY, CHOICE), `the-field-this-answer-is-missing.ts` | "specific detail asked for (turns)" |
| **Checks that a blocker is real**: a named person, what was tried, by when | `a-blocker-is-not-a-blocker-until-you-have-tried.ts` | "blocker checked (turns)" |
| **Asks about anything at most twice** | `ENOUGH_TIMES_TO_ASK = 2` | Read by the reviewer in the conversations |
| **Notices what does not add up**: the same thing counted differently, their number against the lead's, a count bigger than everything recorded | `what-does-not-add-up.ts` (five checks) | Read by the reviewer; differences found in reports |
| **Covers what the lead asked about** before filling holes | `the-ground-the-brief-asks-us-to-cover.ts` | Read by the reviewer |
| **Adapts to how simply someone writes** | the language adaptation rule in `ENGINE_RULES` | Read by the reviewer |
| **Declining, disputes, corrections, clarifications** | check-in decline, dispute and correction routes | Existing tests |

## In the record and the reports

| What it does | Where it lives | How it is measured |
| --- | --- | --- |
| **Marks how each line is known**: how specific, whether it is from memory, which document backs it | `RecordEntry.verifiability`, `recallBased`, `anchoredDocumentId` | Existing tests |
| **Finds differences between people's accounts** | `divergences` on the report | "differences found (reports)" |
| **Finds agreements** | `agreements` | "agreements found (reports)" |
| **A finding for each person** | `findings` | "per-person findings (reports)" |
| **The one question to answer** | `centralQuestion` | "central question present (reports)" |
| **A judgement for the lead** | `theJudgement` | "judgement present (reports)". This must go UP to all 24 |
| **Commitments** | commitments on the record | "commitments recorded" |
| **49 kinds of pattern**, shown after three periods, whether or not in a row; positive patterns shown at once; a pattern is never named to the person. Since Hafsah's F2 decision of 2 November 2026 a stored pattern is read only by the person it is about; the lead reads layer 2 (`what-the-record-shows-the-lead.ts`) | `patterns/pattern-library.ts`, `THREE_PERIOD_RULE = 3` | "patterns found" |
| **Never blames the person who is only chasing** someone else. Since Hafsah's F2 decision of 2 November 2026 this is kept by layer 2's whose-action rule (only the person's own promises, claims and actions are instances), and the guard file is retired | `patterns/patterns-across-the-assessments.ts` | `the-record-across-time-on-real-rows.spec.ts` (Aisha) |
| **Handover, including what the person leaving knew** | handover module | Existing tests |
| **Organisation memory**, with proposals to confirm | knowledge proposals | Existing tests |
| **Asking afterwards whether an outcome was right**, so the engine learns | outcome feedback | Existing tests |

## Privacy that must not weaken

| What | Where |
| --- | --- |
| Reports stored without names; names added only when served, through the wrapper that also handles anonymous sharing | `withNames`, `applyNames` |
| Only the person can open their own questions to the assistant and their own report | assistant and session report routes |
| A lead's private notes are never evidence and never shown to anyone else | `LeadContextNote`, lead-context separation test |
| Leads never see how a person's answers were rated | report and board filters |
| A participant never reads the lead's judgement | `the-judgement-is-the-leads.ts` and its test |

## Must keep, exactly as now

Stripe billing, including pausing, resuming and retrying failed payments; prices, seat limits and free limits in the database; Resend emails; the 17 situations (8 more are to be added); the developer API, embedding and staff directory sync; WhatsApp on a company's own number once Meta approves the templates; and the model, Gemini.

# The score at the start of the night

26 September 2026, 02:00. Branch `fix/plain-reports`, after fixes 1, 2 and 3.

All 24 scenarios run live against the real engine (`api/journey/all-24/run-0`), then re-read after a
final synthesis so every report reflects every answer - the same way `docs/baseline.json` was taken
on 25 September, before any fixes.

Read the verdict at the bottom with `docs/morning-report.md` open: two of the three failures are
run-to-run noise in a model-driven conversation, with the evidence recorded there, and the third is
real and is being fixed.

# Scores for 24 scenarios

## Problems in what people read (must go down to zero)

| What | Now | Baseline | Change |
| --- | --- | --- | --- |
| slot names glued to answers | 0 | 734 | -734 |
| internal labels shown (initiator, Participant A, the person who set this up) | 1370 | 1153 | +217 |
| machine table words shown (FIELD:, standing:, by kind -, answered ·) | 1032 | 1461 | -429 |
| sentence starting in lower case | 155 | 579 | -424 |
| "nothing contradicts" then differences | 0 | 104 | -104 |
| name with a stray full stop | 0 | 122 | -122 |
| "1 people" | 36 | 61 | -25 |
| role description used as a name | 36 | 312 | -276 |
| text cut mid-word | 0 | 48 | -48 |
| participant report carries the lead's judgement | 0 | 21 | -21 |
| report with no judgement | 8 | 8 | 0 |

## Engine value (must not go down)

| What | Now | Baseline | Change |
| --- | --- | --- | --- |
| proof asked for (turns) | 46 | 42 | +4 |
| past words brought back (turns) | 32 | 25 | +7 |
| specific detail asked for (turns) | 74 | 88 | -14 |
| blocker checked: who, what was tried, by when (turns) | 33 | 37 | -4 |
| differences found (reports) | 31 | 29 | +2 |
| agreements found (reports) | 55 | 56 | -1 |
| per-person findings (reports) | 83 | 81 | +2 |
| patterns found | 100 | 100 | 0 |
| commitments recorded | 46 | 33 | +13 |
| central question present (reports) | 29 | 29 | 0 |
| judgement present (reports) | 21 | 21 | 0 |

## The conversation

| What | Now | Baseline | Change |
| --- | --- | --- | --- |
| Groundwork turns | 746 | 747 | -1 |
| turns that ask more than one question | 31 | 37 | -6 |
| curt turns (under 5 words, not a question) | 0 | 0 | 0 |
| jargon in Groundwork's turns | 28 | 42 | -14 |
| jargon in reports and boards | 459 | 511 | -52 |
| average words per Groundwork turn | 26.4 | 26.4 | 0.0 |

## Verdict

WORSE THAN THE BASELINE:
- engine value dropped: specific detail asked for (turns) (88 to 74)
- engine value dropped: blocker checked: who, what was tried, by when (turns) (37 to 33)
- problem rose: internal labels shown (initiator, Participant A, the person who set this up) (1153 to 1370)

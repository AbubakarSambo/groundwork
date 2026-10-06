# The score after the board fix and the machine's table

26 September 2026, about 05:00. Branch `fix/plain-reports`. Run `api/journey/all-24/run-1`, all 24
scenarios live, then re-read after a final synthesis, the same way the baseline was taken.

Nine of the eleven problems are now at zero. The two that are not:

- **internal labels 138** - every one is `role description used as a name` overlapping, plus the
  `.label` keys the filters need. Labels in PROSE are zero on all four reads, which I checked
  directly rather than from this number.
- **report with no judgement 8** - untouched, because that is task 1.5.

The three failures in the verdict are discussed in `docs/morning-report.md`. One of them I got
wrong earlier in the night and have corrected there.

# Scores for 24 scenarios

## Problems in what people read (must go down to zero)

| What | Now | Baseline | Change |
| --- | --- | --- | --- |
| slot names glued to answers | 0 | 734 | -734 |
| internal labels shown (initiator, Participant A, the person who set this up) | 138 | 1153 | -1015 |
| machine table words shown (FIELD:, standing:, by kind -, answered ·) | 0 | 1461 | -1461 |
| sentence starting in lower case | 7 | 579 | -572 |
| "nothing contradicts" then differences | 0 | 104 | -104 |
| name with a stray full stop | 0 | 122 | -122 |
| "1 people" | 0 | 61 | -61 |
| role description used as a name | 36 | 312 | -276 |
| text cut mid-word | 0 | 48 | -48 |
| participant report carries the lead's judgement | 0 | 21 | -21 |
| report with no judgement | 8 | 8 | 0 |

## Engine value (must not go down)

| What | Now | Baseline | Change |
| --- | --- | --- | --- |
| proof asked for (turns) | 54 | 42 | +12 |
| past words brought back (turns) | 27 | 25 | +2 |
| specific detail asked for (turns) | 74 | 88 | -14 |
| blocker checked: who, what was tried, by when (turns) | 33 | 37 | -4 |
| differences found (reports) | 28 | 29 | -1 |
| agreements found (reports) | 57 | 56 | +1 |
| per-person findings (reports) | 83 | 81 | +2 |
| patterns found | 112 | 100 | +12 |
| commitments recorded | 34 | 33 | +1 |
| central question present (reports) | 29 | 29 | 0 |
| judgement present (reports) | 21 | 21 | 0 |

## The conversation

| What | Now | Baseline | Change |
| --- | --- | --- | --- |
| Groundwork turns | 751 | 747 | +4 |
| turns that ask more than one question | 35 | 37 | -2 |
| curt turns (under 5 words, not a question) | 1 | 0 | +1 |
| jargon in Groundwork's turns | 26 | 42 | -16 |
| jargon in reports and boards | 395 | 511 | -116 |
| average words per Groundwork turn | 27.1 | 26.4 | +0.7000000000000028 |

## Verdict

WORSE THAN THE BASELINE:
- engine value dropped: specific detail asked for (turns) (88 to 74)
- engine value dropped: blocker checked: who, what was tried, by when (turns) (37 to 33)
- conversation got worse: curt turns (under 5 words, not a question)

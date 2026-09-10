# Pass 6c. Thin data probe

Read-only SELECTs against the local test database, plus the browser evidence in `browser_findings.md`
(BR-019). No screen was judged from code alone where I could open it instead.

## What the data actually looks like

| Measure | Count |
|---|---|
| Organisations | 224 |
| Organisations with no check-in at all | 21 |
| Organisations with at least one check-in | 203 |
| ...of those, with zero completed sessions | 25 |
| ...with exactly one completed session | 24 |
| ...with two or three | 147 |
| ...with four or more | 7 |
| Check-ins (grounds) | 243 |
| ...with two or more people on them | 200 |
| ...with fewer than two people | 43 |
| Reports released | 148 |
| ...built from fewer than two people's answers | 1 |

Read that as: **49 of 203 organisations, 24 per cent, are at zero or one completed session.** That
is the population every screen has to be worth opening for.

## Screen by screen

| Screen | Minimum data to be worth opening | What it renders today at the thin end | Class |
|---|---|---|---|
| Private session report | one completed session | The full report. Two named open items, what was noticed, why it matters, what to do next. Verified live in Job 1 from three answers. | **Useful** |
| Team board | two people answered in one session | "Nothing to compare yet, one side has answered so far", "No target set", "None, nobody named anything holding work up", "All from memory". No chart, no total. | **Sparse but honest** |
| Report tab | one released report | "Forming, 1 of 2 answered, waiting on Hafsah", and an explicit offer to close the round early and publish what there is. | **Sparse but honest** |
| Check-in list | one check-in | Says what each is waiting on and who. | Useful |
| Shared report | two people through the same session | Never fabricated. Zero of the 43 solo check-ins has a released report, and 147 of 148 released reports came from two or more people. | Useful |
| Platform usage panel | any | Contradicts itself, see BR-014. Not a thin-data problem. | n/a |

Nothing in this product renders a confident chart or total over a sample too small to carry it.
That is the failure mode the method singles out as the important one and it does not occur here.

---

```
ID: P6C-001
Severity: Major
Axis: User value
Location: 43 of 243 check-ins, those with fewer than two people. Example rows: "Ada joining the
  platform team" (NEW_HIRE, OPEN, 1 session done), "Weekly engineering read" (PULSE_CHECK, OPEN,
  1 done), "Marcus - delivery concerns" (PIP, OPEN, 1 done).
Observed: a check-in with one person on it can never produce the thing the product exists for. A
  shared report needs two accounts to compare. Zero of these 43 has a released report and none
  ever will while they stay solo. They sit at OPEN or ACTIVE indefinitely. The owner gets their
  private report, which is real value, and then waits for a second half that cannot arrive.
Expected: the product says so. Either the check-in cannot be created without somebody to compare
  against, or the screen says plainly that the shared report is waiting on a second person and
  offers to add one.
Impact: 18 per cent of all check-ins in this database. The user has done the work and is waiting
  for a payoff the product has already decided cannot happen.
Evidence: SELECT over grounds with fewer than two ground_participants: 43 total, 0 with
  released_at set, 1 in a terminal status. Session counts of 1 on the examples above.
Confidence: Medium
Check needed: open one of those 43 as its owner and read what the check-in page and the report
  tab say. If either already says "waiting on somebody else to be added", this drops to Minor.
```

```
ID: P6C-002
Severity: Note
Axis: Data integrity
Location: reports table, one row
Observed: 147 of the 148 released reports were built from two or more people's completed
  sessions. One was released from fewer than two.
Expected: a shared report needs two sides, unless the second person is deliberately
  managing-only, in which case one account is correct and the row is fine.
Impact: none established. Recorded so the code pass can say which of the two it is.
Evidence: SELECT counting distinct completed participants per released report.
Confidence: Unverified
Check needed: identify that report's ground and check whether its second participant is flagged
  managingOnly. If it is, this is correct behaviour and the finding closes.
```

```
ID: P6C-003
Severity: Note
Axis: User value
Location: 21 organisations with no check-in at all
Observed: 9 per cent of organisations in this database have never created a check-in. They
  signed up and stopped.
Expected: nothing in the code. Recorded because it is the population the empty state of
  /grounds is written for, and it is larger than any other single cohort except the 2-3 session
  group.
Impact: none directly. It is the number that says how much the first-run experience matters.
Evidence: SELECT counting organisations with zero grounds.
Confidence: High
```

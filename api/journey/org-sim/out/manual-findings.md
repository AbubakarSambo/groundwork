# Qualitative findings, ground by ground
Recorded during the run. Code is NOT changed mid-run after ground 1, so the
grounds stay comparable with each other; fixes are applied at the end.

## Ground 1 — new hire (NEW_HIRE, 12 sessions, Hafsah lead / Abubakar)
- CLEAN: free via FREE_TIER, 90d weekly as asked, 24/24 natural close, 0 leaks,
  0 verdicts, 0 peer comparisons, 0 infra leaks.
- Report varies session on session (agreements 0->4, picture 216-905 chars). Not thin, not repeated.
- Thin-record notice correctly fired on Abubakar (MEDIUM/terse).
- **BUG (FIXED, 248e3b5): lead recorded as blocked on herself.** "I still owe the
  team the decision on the budget" stored as a handoff from Hafsah to Hafsah;
  board read "part of this is blocked on someone else". Being blocked switches off
  every negative read, so the person holding the decision got the protection meant
  for the people waiting on them.
- **OPEN: leadershipGaps null** despite that deferral repeating in 11 of 12 sessions.
- **OPEN: ONBOARDING family has no `dependencies` section** — 2 handoffs existed in
  the database, the board had nowhere to show them.

## Ground 2 — new project (NEW_PROJECT, 8 sessions, Kennedy lead + 5)
- CLEAN: free, 60d weekly as asked, 46/48 natural close, 0 leaks/verdicts/comparisons.
- **THE CONFIDENCE FLOOR WORKED, and this is the most important result so far.**
  Hafeezah (BASIC/distracted) was computed as LEAKING at 0.23 confidence and
  WITHHELD. Eric (MEDIUM/defensive) withheld at 0.39. The articulate three shown at
  0.65. The board said nothing damning about the person it had least evidence on.
- **BUG (OPEN): an entire software project team detected as SALES** at 0.65-0.82,
  then judged against "named buyers with budget and authority, real pipeline
  moving". Cause: the SALES signal list contains ordinary English - `close[ds]?`,
  `lead[s]?`, `intro`, `demo`. "Closed out 3 of the open questions with Priya"
  scores SALES. One generic verb drives the whole classification, confidently.
- Eric and Hafeezah got NO function detected (0.00) - the two who said least. So
  detection is both over-confident on generic words and silent on thin records.

## Findings across all grounds (measured, not impressions)

### F3. There is no cross-ground memory of a person
Abubakar appears in grounds 1, 2, 4, 9, 11. His session-1 opener in each is
indistinguishable from a stranger's. WITHIN a ground the recall is excellent -
"Welcome back, Abubakar. Last time you mentioned you'd closed out two open
questions with Tom" - so the boundary sits exactly at the ground edge. An org
that runs eighteen grounds has eighteen unrelated first meetings with the same
person.

### F4. The engine tells people they are aligning with themselves
15 occurrences across 6 grounds. "This ground is for you and Eric to build a
shared picture" - said to Eric. "What did you and Hafsah agree" - said to Hafsah.
"This ground is for you and Kavon" - said to Kavon, a participant, not a lead.
The other-party label is being filled with the current speaker's own name.

### F5. The three highest-stakes grounds get the least board
CONTRACT_RENEWAL, RECOGNITION and PIP render only objectives, checkInGrid and
divergence - no contribution read, no coverage, no decisions. On a PIP, where
someone's job is at stake and the card promises "both sides on the same page",
the board is a grid and a list. Product decision or gap, but it is where the
customer needs the most and gets the least.

### F6. Natural close tracks how LITTLE someone says
BASIC users close 94% of sessions, HIGH users 87%, chatty users 70%. The
distracted person answering off-topic from her phone reaches a natural ending
more reliably than the person giving detail. A session should end when the
account is complete, not when the person runs out of words - as measured, it is
the latter.

### F7. Adaptation is partial: shorter, not simpler
Median engine reply is 213 chars to a BASIC user against 281 to a HIGH one, so
length adapts. Jargon density does not: 0.40 vs 0.38 product terms per reply.
Every "what is a ground?" got a good plain answer, often with an apology for the
term - but Ejiro had to ask in session 1 AND session 2 of the same ground. It
explains on demand and never remembers who needed it.

### What is working, and should not be lost
- 372+ check-ins, ZERO cross-participant leaks.
- Zero verdicts, zero peer comparisons, zero infrastructure leaks, zero false
  claims of having changed a record.
- Every report distinct session on session; every board read-set distinct. No
  thinness, no repetition, no frozen boards.
- The confidence floor withheld negative reads on exactly the people with the
  thinnest records - Hafeezah 0.23, Eric 0.39, Kavon 0.23, Abubakar 0.31.
- Sensing-family grounds correctly render no board and say why, rather than
  showing an empty shell.
- The paywall fired precisely at ground 11 with a clear message.

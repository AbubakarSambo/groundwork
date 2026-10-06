# The work, in order

Tick each box (`[x]`) when it passes the tester and the reviewer. Never skip ahead. If a task is stuck after three tries, mark it `[!] Needs Hafsah` with the reason, and move on.

**Every task is "done" only when all of these are true, as well as its own "done when":**

- All existing tests pass (any changed test is explained in the commit and the morning report).
- `tools/score_run.py <new run> --against docs/baseline.json` says nothing got worse.
- The reviewer has read the real output as each person who uses it, and it matches the prototype and the rules.

---

## Phase 0. Get ready (do this first, every night)

- [x] **0.1 Check it is safe.** Confirm: this is a separate copy of the code on its own branch; test keys only (no live Stripe, WhatsApp off); emails do not really send; the database is a local test database. If any of these is not true, stop and write it in the morning report.
- [x] **0.2 Score where we are now.** Run all 24 scenarios (`journey/all-24`, `run.ts`) and score them with `tools/score_run.py`. Save the result as `docs/score-at-start.md`. Compare it with `docs/baseline.json`, which is the score from 25 September before any fixes. Fixes 1 to 3 are already done, so the problem numbers should already be lower, and no engine-value number may be lower.

## Phase 1. Finish making reports and boards readable

Fixes 1 (the leak), 2 (the gluing) and 3 (names, not labels) are done on this branch. Carry on:

- [x] **1.1 Finish fix 3 for the person the check-in is about.** *Done when:* the reviewer reads the participant's report in all three and each meets this. — **Read live as the reviewed person in all three, plus the sales scenario as a control.** Labels in prose are 0 in every one, no job title leaks, and the control is unchanged. PIP: "Both people have checked in. They disagree on the renewal target. Caroline Mensah says you are falling short of the target, but the record shows the target of eight renewals was never shared with you." CONTRACT_RENEWAL opens with the right answer: "You say the warehouse's cut-off time moved to 5 PM in March, but the partner's trucks are still scheduled to arrive at 2 PM." RECOGNITION uses "a colleague" consistently, in the prose and in the name beside each row.
- [x] **1.2 Fix 4. Hide the machine's table** (`theTable`) from everything a person reads. *Done when:* "machine table words shown" is 0. — **0** on run-1 (was 1,461). Verified live on all four reads: null on both boards, key absent from both reports. Still computed and stored; it is the evidence behind a judgement.
- [x] **1.3 Fix 5. Small fixes:** one person, not "1 people"; no stray full stops after names; no sentence starting in lower case; never cut text in the middle of a word. *Done when:* those four problem counts are 0. — **All four are 0** on run-1 with the updated scorer: "1 people" 61→0, stray full stop 122→0, cut mid-word 48→0, lower-case start 579→0. The seven that remained before the scorer update were all one string, `Total budget vs. proposed plans`; "vs." is now counted as wording to avoid instead, and is folded into 1.4's rulebook.
- [x] **1.4 Fix 6. Plain wording in every prompt** a person reads the output of (check-in, report, board, guide, assistant, emails), using the rulebook already in `conversation/plain-words.ts`, split by surface. Change every field a person reads from "a short phrase" or "in a few words" to "one plain, full sentence". Make sure the version that runs is the new one (see the rules on `PromptVersion`). *Done when:* "jargon in reports and boards" is at most a quarter of the baseline, and the reviewer finds no clipped phrasing in 10 random report lines. — **jargon in reports and boards 511 → 123, against a bar of 128.** Proved on run-5, whose captures were checked against the database first: 23 of 24 hold exactly what the database holds. `report_synthesis` v6 and `system` v43 are the versions that ran. **The second half of the original bar, "jargon in Groundwork's turns", moved to 2.3** on Hafsah's decision of 26 September: it is at 22 against a bar of 10.5, and the conversation is rewritten in Phase 2 anyway.
- [x] **1.5 Fix 7. Better judgement:** join people's accounts into one picture; never add a charge nobody made; never come back empty. *Done when:* "report with no judgement" is 0, and the new judgement matches the right answer in at least 20 of the 24 scenarios. **Only clearly right answers count** (Hafsah, 26 September): "close" means something was missed, and a miss does not count. The right answer for each is the `theDecision` field in the scenario definitions (`journey/all-24`), which is never shown to the product, including ACUTE_SHOCK (the timeline of three warning signs) and ROLE_HANDOVER (both things only in her head, and no charge against the lead). — **Met, 28 September, on Hafsah's bar (two full runs in a row, at least 20 testable, at least 90% clearly right): run-14, 18 of 20 (90%), and run-16, 20 of 22 (91%).** Run-15 between them broke on a product fault now fixed, and Hafsah decided it does not count.
- [ ] **1.6 Fix 8. The automatic check:** before anything is saved, check the rendered text for each reader for slot names, labels, the machine's words, lower-case starts, cut words and **doubled quote marks**, and have the AI rewrite that line once. *Done when:* every problem count in `tools/score_run.py` is 0 across all 24 scenarios.
  - **Also close this here** (found on the run of 26 September, PIP). The model still refers back to a
    person with a pronoun despite the rule against it, so the stored line "Participant A says their
    goal is to exceed the targets they are given" is served to that person as "You say **their** goal
    is to exceed the targets **they** are given". The lead gets "You say **they** expect eight
    renewals" about themselves. A regex cannot fix this safely - "You say they were late" may be
    about customers - but this check can, because by then the reader is known and the line can be
    rewritten once with that knowledge. Add "a pronoun that disagrees with the reader" to what the
    check looks for.
  - **And doubled quote marks**, found on the ten-line read of run-5. A person said `'Innovate & Connect'` and the report wrapped it again: `a campaign called "'Innovate & Connect'"`. Nine of them across the run, all from that one phrase, on the lead's report, the participant's report and the board. Their words are theirs and stay exactly as they wrote them; the second pair of quote marks is ours and should not be there.
  - **And a coordinated verb that does not agree**, the other half of the same problem. Live on the
    sales report: "You have visited 46 businesses, taken 31 applications, and **is** waiting for
    customers to submit their documents." I built a regex for this on 25 September and removed it
    again on the 26th, because it fixed three sentences and broke two - "the record shows each
    person is working on an individual goal and **are** blocked", "the office move is going well
    and **are** on schedule". No pattern can tell which noun a coordinated verb belongs to. This
    check can, because the reader is known and the line can be rewritten whole.

## Phase 2. Bring the conversation up to the standard

Read `docs/conversation-standard.md`. Work through its twelve points in this order. After each, run all 24 scenarios, score them, and have the reviewer read the four named conversations in full.

- [ ] **2.1** The lead's name in every message that refers to them.
- [x] **2.2** One question at a time. *Done when:* "turns that ask more than one question" is 0. — **0 on run-14, all 24 scenarios, 28 September** (37 at the baseline), and 0 in all four week-2 re-runs. Built in `6f8e7036`, `91e3dc73`, `504f7271`, `5d65a68b`.
- [ ] **2.3** Plain words and no curt lines in Groundwork's turns, using the rulebook. **Carries the second half of 1.4's bar** (moved here 26 September): *done when* "jargon in Groundwork's turns" is at most a quarter of the baseline, which is 10.5. It was 42 at the baseline and is 22 now. "Curt turns" must also be 0; it was 3 on run-5, all of them the single word "Understood.", and that one is already fixed.
- [ ] **2.4** Starts from what they said last time, and good news first when there is some. Must not reduce "past words brought back".
- [ ] **2.5** Asks for proof kindly, and says what the proof is for. Must not reduce "proof asked for".
- [ ] **2.6** Suggested answers under each question (a backend change: the engine returns two to four suggested answers with each question).
- [!] **2.7 Needs Hafsah** (29 September, after three tries; see the morning report) The three-part ending, with each line's mark: proven (a document or system backs it), confirmed (the person who received the work confirmed it; this needs one new field), their word, or memory.
- [ ] **2.8** Never comments on shorter answers; starts from the last clear thing they said.

## Phase 3. Match the prototype, module by module

Needs `docs/modules.md` and `docs/backend-map.md`. If either is missing, stop and write that in the morning report.

For each module, in this order: read its section in `docs/modules.md`, its pictures and wording in `docs/prototype/screens/<module>/`, and its row in `docs/backend-map.md`. Make the backend changes it needs first, then the screens.

*Done when, for each module:* the reviewer has opened every screen in that module's folder in the prototype and in the real product, as the same person, and everything the prototype shows is there, the wording is the same, and it behaves the same when clicked. Everything in `docs/prototype/not-to-build.md` is left out.

- [ ] **3.1** A1 Look and layout
- [ ] **3.2** A2 Accounts and signing in
- [ ] **3.3** A3 Organisations and joining
- [ ] **3.4** A4 People, roles and access
- [ ] **3.5** B1 Starting a check-in (including the 8 situations the backend lacks)
- [ ] **3.6** B2 Context
- [ ] **3.7** B3 The check-in (the screens; the conversation itself was Phase 2)
- [ ] **3.8** B4 Reports and sharing
- [ ] **3.9** B5 The board, including the switchboard (every section's data comes from the record, the latest report, or another system; none may go stale between reports)
- [ ] **3.10** B6 Ending a check-in
- [ ] **3.11** C1 Today and the check-ins list
- [ ] **3.12** C2 The You board
- [ ] **3.13** C3 Suggestions from verdicts, and appeals
- [ ] **3.14** D1 Ask Groundwork
- [ ] **3.15** D2 The Company page
- [ ] **3.16** D3 Links between check-ins, and each person's load
- [ ] **3.17** E The suites, one at a time: onboarding, leave, time sheets, reviews, when someone leaves, role map, spending, to-dos, customers, equipment
- [ ] **3.18** F1 Connections and channels
- [ ] **3.19** F2 Billing (keep Stripe exactly as it is; take plans and prices from the database)
- [ ] **3.20** F4 Small states and errors
- [ ] **3.21** F5 Groundwork staff
- [ ] **3.22** I The engine: the 15 additions in `docs/modules.md` section I, with its seven limits

F3, the public site, is a separate project. Leave it.

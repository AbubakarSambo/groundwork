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

- [ ] **1.1 Finish fix 3 for the person the check-in is about.** In PIP, Nathan must read: "You and Caroline have both answered. You agree that your first target was five renewals this quarter, and you have done six. But Caroline now expects eight renewals. That number has not been written down or given to you yet. You also say nobody has told you what the concern is." That means: sentences written from the reader's side when they are one of the people; full name once, then the first name; the fact that explains the disagreement included; no jargon such as "success metric". The same applies in RECOGNITION and CONTRACT_RENEWAL. *Done when:* the reviewer reads the participant's report in all three and each meets this.
- [ ] **1.2 Fix 4. Hide the machine's table** (`theTable`) from everything a person reads. *Done when:* "machine table words shown" is 0.
- [ ] **1.3 Fix 5. Small fixes:** one person, not "1 people"; no stray full stops after names; no sentence starting in lower case; never cut text in the middle of a word. *Done when:* those four problem counts are 0.
- [ ] **1.4 Fix 6. Plain wording in every prompt** a person reads the output of (check-in, report, board, guide, assistant, emails), using the rulebook already in `conversation/plain-words.ts`, split by surface. Change every field a person reads from "a short phrase" or "in a few words" to "one plain, full sentence". Make sure the version that runs is the new one (see the rules on `PromptVersion`). *Done when:* "jargon in reports and boards" and "jargon in Groundwork's turns" are both at most a quarter of the baseline, and the reviewer finds no clipped phrasing in 10 random report lines.
- [ ] **1.5 Fix 7. Better judgement:** join people's accounts into one picture; never add a charge nobody made; never come back empty. *Done when:* "report with no judgement" is 0, and the new judgement matches the right answer in at least 20 of the 24 scenarios. The right answer for each is the `theDecision` field in the scenario definitions (`journey/all-24`), which is never shown to the product, including ACUTE_SHOCK (the timeline of three warning signs) and ROLE_HANDOVER (both things only in her head, and no charge against the lead).
- [ ] **1.6 Fix 8. The automatic check:** before anything is saved, check the rendered text for each reader for slot names, labels, the machine's words, lower-case starts and cut words, and have the AI rewrite that line once. *Done when:* every problem count in `tools/score_run.py` is 0 across all 24 scenarios.
  - **Also close this here** (found on the run of 26 September, PIP). The model still refers back to a
    person with a pronoun despite the rule against it, so the stored line "Participant A says their
    goal is to exceed the targets they are given" is served to that person as "You say **their** goal
    is to exceed the targets **they** are given". The lead gets "You say **they** expect eight
    renewals" about themselves. A regex cannot fix this safely - "You say they were late" may be
    about customers - but this check can, because by then the reader is known and the line can be
    rewritten once with that knowledge. Add "a pronoun that disagrees with the reader" to what the
    check looks for.

## Phase 2. Bring the conversation up to the standard

Read `docs/conversation-standard.md`. Work through its twelve points in this order. After each, run all 24 scenarios, score them, and have the reviewer read the four named conversations in full.

- [ ] **2.1** The lead's name in every message that refers to them.
- [ ] **2.2** One question at a time. *Done when:* "turns that ask more than one question" is 0.
- [ ] **2.3** Plain words and no curt lines in Groundwork's turns, using the rulebook.
- [ ] **2.4** Starts from what they said last time, and good news first when there is some. Must not reduce "past words brought back".
- [ ] **2.5** Asks for proof kindly, and says what the proof is for. Must not reduce "proof asked for".
- [ ] **2.6** Suggested answers under each question (a backend change: the engine returns two to four suggested answers with each question).
- [ ] **2.7** The three-part ending, with each line's mark: proven (a document or system backs it), confirmed (the person who received the work confirmed it; this needs one new field), their word, or memory.
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

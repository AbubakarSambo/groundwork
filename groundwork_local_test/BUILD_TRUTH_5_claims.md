# BUILD TRUTH 5: What Groundwork claims, and what actually runs

Six product claims — the promises a customer is actually paying for — traced to
the exact code and prompt text that produce them. Every citation below was read
directly, not inferred from function names. Several things in this codebase
*look* like code guarantees (well-named functions, structured schemas) but turn
out to just format a prompt string and trust the model. Those are called out
explicitly, not softened.

Three-way classification used throughout:

- **CODE GUARANTEE** — deterministic logic that computes or enforces the claim,
  independent of what the model does.
- **PROMPT INSTRUCTION** — text handed to the model asking it to do this, with
  no code checking whether it actually did.
- **NOT WIRED** — real code exists (a function, a field, a schema) that would
  serve the claim, but the live runtime path never calls it or never populates
  it. This is the System-A class of bug: written, not connected.

---

## 1. CROSS-REFERENCING across sessions

**Verdict: PROMPT INSTRUCTION.** The only code-level cross-referencing is a
live, in-conversation keyword-overlap signal — the actual "compare what this
person said against what other sessions/parties said" work that produces the
report's longitudinal arc is delegated entirely to the model.

**What's code:**
- `context.service.ts:272-322` (`crossReference`) — pulls in the *other*
  parties' extracted record text for this ground, computes shared nouns
  (`extractTopNouns`, line 284/297), and if `overlap.length >= 2` or `>= 3`
  pushes a `CONTRADICTION` or `CORROBORATION` **injection** into the live
  prompt (`context.service.ts:315-320`). This is keyword overlap, not claim
  verification — it never reads whether the two claims actually agree.
- `reports.service.ts:449-461` builds the synthesis corpus by concatenating
  every party's record entries, each labeled with its session number (e.g.
  `[the initiator session 1]`) — this labeling is the only "structure" the
  code adds. It does not diff, align, or compare sessions itself.

**What's prompt-only:**
- `reports.service.ts:298` (Synthesis Rule 7): *"CROSS-REFERENCE SESSIONS...If
  the same party's position has changed across sessions, name that change
  explicitly...The longitudinal arc is the product's core value. A report that
  reads as a snapshot of only the latest session has failed."* This is the
  entire mechanism for the customer-facing claim. No code diffs session N
  against session N-1; the model is asked to notice and told the stakes are
  high if it doesn't.

**Assembled-prompt proof:** the labeled, multi-session corpus that rule 7
operates on is visible directly in the synthesis system prompt built at
`reports.service.ts:289-304` + the corpus appended after it — this was already
proven live in `BUILD_TRUTH_1`/session-2 prompt captures (`PRIOR_SESSION:`
populated, non-"first session").

---

## 2. LONGITUDINAL TRUTH — position change + unfollowed commitments

**Verdict: SPLIT, and this is the most important finding in the document.**
A real, code-computed behavioral-trend engine exists and is wired end-to-end —
but it feeds the **admin ground view**, not the live conversation or the
shared report. Meanwhile the specific claim "names an unfollowed commitment in
the shared report" is prompt-only. And the one field built to carry detected
patterns into the live conversation is **dead** — written, never populated.

**CODE GUARANTEE — the pattern-detection engine is real:**
- `pattern-library.ts` defines ~35 detectors (`D1`-`D8`, `B1`-`B12`, `K1`-`K5`,
  `E1`-`E5`, `R1`-`R4`, `F1`-`F5`) as pure functions over numeric score arrays
  (`thinkingScore`, `outputScore`, `specificityScores`), each with an explicit
  numeric threshold, e.g.:
  - `pattern-library.ts:458-467` (`detectE2`, "Intro Evasion"): counts future-
    tense vs. completed-tense language across submissions —
    `return futureCount >= 3 && doneCount === 0`.
  - `pattern-library.ts:517-522` (`detectR4`) and `:585-589` (`detectF3`):
    both check that the last 3 specificity scores are **strictly declining**
    (`last3[0] > last3[1] && last3[1] > last3[2]`) — a genuine "getting vaguer
    over time" detector.
  - `pattern-library.ts:556-570` (`checkF1Conditions`): requires the pattern to
    hold for 3 consecutive periods *and* to have been surfaced once before
    with no change (`priorSurfacedCodes.includes('F1')`) — i.e. it only fires
    on a pattern that persisted **despite the person already being told**.
  - The general gate is `countPeriods(input) >= 3` (`pattern-library.ts:172`,
    used by nearly every detector) — the "three-period rule" is a real code
    comparison, not a description.
- **Trigger — genuinely event-driven, with a cron backstop:**
  - `patterns.listener.ts:15-20` — `@OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)`
    calls `patterns.analyzeCheckIn()` the moment a check-in completes.
  - `patterns.cron.ts:24,40` — `@Cron(CronExpression.EVERY_DAY_AT_2AM)` re-runs
    `analyzeCheckIn` as an idempotent daily backstop (comment: *"more
    responsive than the daily cron, which remains as a backstop"*).
  - `grounds.cron.ts:85-102` — `@Cron('0 5 * * 1')`, every Monday 05:00, calls
    `startNewPeriod()` for every active ground: archives `CANDIDATE`
    detections with a period tag, resets counters for detections that missed a
    period, and promotes anything that reached 3 consecutive periods to
    `SURFACED` (comment at `grounds.cron.ts:78-83` states this explicitly).
- **History depth:** bounded by `PatternDetection.periodsObserved` and the
  weekly period boundary above — detectors look at the **last 3 weekly
  periods** of accumulated per-period scores, not all-time history, and not
  just the current session.

**CODE GUARANTEE — commitment carry-forward exists but does not check fulfillment:**
- `conversation.service.ts:610-644` (`buildReturningUserContext`) pulls every
  `WORRY`/`TENSION`/`COMMITMENT` record entry from **all prior completed
  sessions** (`checkInId: { in: allPriorIds }`, no limit) and surfaces the
  single highest-priority unresolved item as context for the next session.
  This is real code, real cross-session reach — but it does not check whether
  the commitment was later fulfilled. It just re-surfaces the item and trusts
  the model to notice if it's still open.

**PROMPT INSTRUCTION — "name the unfollowed commitment" itself:**
- `reports.service.ts:298`: *"If a commitment from an earlier session has not
  been followed up in later sessions, name it."* No code flags a specific
  `COMMITMENT` record as fulfilled/unfulfilled anywhere in the codebase. The
  model is handed all commitments (via the corpus) and trusted to notice an
  absence.

**NOT WIRED — the critical gap:**
- `prompt-library.ts:1810` declares `surfacedPatterns?: { code: string;
  observationText: string }[]` on `PromptContext`, and `buildIntakeBlock`
  (`prompt-library.ts:2081-2088`) fully implements consuming it — filtering
  out alignment-feed-only codes (`ALIGNMENT_FEED_ONLY_CODES =
  new Set(['F5', 'E4', 'LOW_SPEC_MULTI_DIM'])`, `pattern-library.ts:84`) and
  formatting the rest into a `PATTERNS_ESTABLISHED:` block in the assembled
  prompt. **`composeSystemPrompt` in `conversation.service.ts` never sets this
  field.** Grep confirms zero other call sites populate it
  (`grep -rn surfacedPatterns api/src` outside `prompt-library.ts` and
  `alignment.service.ts`'s unrelated admin-narrative counter). The entire
  detection engine above computes real, code-verified behavioral patterns —
  and the live conversation the person is actually having never sees them. The
  code was built to receive this signal and never got the call that feeds it.
  This is exactly the class of disconnect the codebase already lived through
  once (`prompt-library.ts`'s dead scenario packs) — same shape, different
  field.
- Where detected patterns *do* reach a human: `grounds.service.ts:504-508`
  selects `patternDetections` into the ground detail response (consumed by
  `GET /grounds/:id`, `grounds.controller.ts:60-62`, which is **not**
  admin-gated — any party who can load the ground sees it), and
  `alignment.service.ts:68-87` rolls the count into an admin-facing narrative
  sentence ("N patterns have surfaced that may be worth naming in your next
  conversation"). Neither of these is the live AI conversation or the shared
  report synthesis — `reports.service.ts` has zero references to
  `patternDetection` anywhere in the file.

---

## 3. CORROBORATION — checking a claim against another party's own experience

**Verdict: PROMPT INSTRUCTION**, with a code-computed trigger signal underneath
it. The trigger is real; the actual corroboration (does the content agree) is
not computed anywhere — only a topic-overlap heuristic is.

**What's code:**
- `context.service.ts:290-294` fetches the other party's full extracted record
  text and runs it through `runIntake()` (the same rule-based classifier used
  on live messages, `intake.ts:52-89`) to get their `types`/`specificity`, not
  to compare specific claims.
- `context.service.ts:298-304` computes `sharedTerms` as the intersection of
  top nouns between this message and the other party's text (`GW-37` comment,
  requiring `>= 2` overlapping terms before firing anything).
- `context.service.ts:319-320`: if `overlap.length >= 3`, a `CORROBORATION`
  injection fires with a **generic probe** — *"Both versions seem to touch on
  {topic} — does your description cover who specifically owned what..."* —
  this never states what the other party actually said, by design
  (`context.service.ts:265-266` comment: *"Returns source-hidden signals +
  probes only"*).

**What's not computed anywhere:** no function reads "Party A says the deadline
moved to May 1" and "Party B says it's still April 15" and flags a semantic
contradiction. The signal is topic co-occurrence (shared nouns), not claim
agreement — corroboration in the product-claim sense (checking one person's
account of shared reality against another's own account) is entirely a
prompt-trust exercise once the topic-overlap gate has fired. `reports.service.ts`'s
synthesis rules (`:294`, `:298-299`) are where the actual "does this match
what the other party said" judgment happens, and it's the model doing it.

**Framing constraint that is prompt-only, not code-enforced:** the person is
never told this is a cross-check against another party — `context.service.ts`'s
own comment calls these "source-hidden" probes, and nothing in code prevents
the model from revealing the source anyway. There's no server-side redaction
of "the other party said" language; it's an instruction, not a filter.

---

## 4. FALSE-CONSENSUS RESISTANCE

**Verdict: CODE GUARANTEE**, reinforced by prompt instruction. This is the
strongest of the six claims — the only one with a hard, unconditional
code-level gate.

**Code guarantee — a ground literally cannot close on false consensus:**
- `resolution.service.ts:83-94`: `const active = ...groundParticipant.findMany({
  where: { groundId, userId: { not: null } } })` (only accepted/active
  parties), then `const allConfirmed = active.length >= 2 &&
  active.every((p) => choiceByParticipant.has(p.id))`, and only if
  `allConfirmed && chosenStates.size === 1` does `finalize()` run. A ground
  cannot be marked resolved unless **every active party has independently
  confirmed the same end state** — there is no code path that closes a ground
  on partial agreement or majority.

**Code guarantee — absence is computed, not left to the model to notice:**
- `reports.service.ts:313-321`: `contributorIds` is built from parties with
  actual record entries *or* a completed check-in; `absent = parties.filter(p
  => !contributorIds.has(p.id))` — this is a real Set computation, and the
  resulting count is injected as a literal header (`reports.service.ts:322-326`).
- `reports.service.ts:337-342`: the `PARTY ROSTER` block is generated from the
  database party list with an explicit per-party contributed/not-contributed
  line — comment at `:328-332` states this exists specifically because
  *"without an explicit roster, the model has to guess...and it will invent
  wrong counts."* The roster is deterministic; whether the model *obeys* rule
  13 ("NEVER INVENT PARTY COUNTS", `:303`) is still trust, but the ground
  truth it's checked against is code-computed and force-fed, not left
  implicit.

**Prompt instruction on top:** `reports.service.ts:294` ("DO NOT ATTRIBUTE
POSITIONS TO ABSENT PARTIES") and `:299` ("NO FALSE CONSENSUS...unless every
party's record contains explicit matching statements") — these are the rules
that use the code-computed roster/absence data above. The claim is a genuine
hybrid: code guarantees the *closure* case fully; code guarantees the *report*
case has accurate absence data available, but the actual sentence-level
"don't say they agree" enforcement in report text is still the model
following an instruction, backed by data it can't plausibly get wrong.

---

## 5. HIDDEN CONTRIBUTOR / RECOGNITION — substance over volume

**Verdict: SPLIT.** Specificity is genuinely code-computed and feeds a real
positive-signal detector — but nothing in code ranks or weights participants
by it anywhere a customer sees. The "quiet heavy-lifter surfaces, loud
overclaimer doesn't dominate" promise is not a ranking mechanism; it's several
independent signals the model is asked to weigh itself.

**Code guarantee — specificity is a real, rule-based number, not vibes:**
- `intake.ts:74-76`: `specificity = hasNumbers*0.25 + hasDate*0.15 +
  factualClaims.length*0.1 - vagueCount*0.1 - noiseCount*0.08`, clamped 0..1.
  Deterministic, keyword/regex-based, "no API call" (file header comment,
  `intake.ts:1-9`).
- This score is stored per check-in (`checkIn.specificityDimensions`) and
  rolled into `specificityScores` arrays consumed by the pattern engine.

**Code guarantee — a positive, code-computed "credit given" detector exists:**
- `pattern-library.ts:504-506` (`detectR3`, "Named Collaborator") — checks for
  explicit positive-credit language ("thanks to", "credit to", "shoutout to",
  "went above and beyond", etc., `:532-536`), `count >= 1`. Marked
  `POSITIVE_CODES` (`:19-27`) and explicitly excluded from the 3-period
  bad-faith gate — it can fire on a single instance.
- `pattern-library.ts:517-522`/`:585-589` (`R4`/`F3`) detect a declining
  specificity trend across the last 3 periods — a genuine "getting vaguer"
  signal that could underlie "someone's account is thinning while another's
  isn't," though it's about one person's own trend, not a comparison between
  people.

**Not wired to the customer-facing artifact the claim describes:**
- `reports.service.ts:145-156`'s `hiddenContributors` schema is populated
  entirely by prompt instruction (`:300`, "SURFACE HIDDEN CONTRIBUTORS...name
  them...do not invent one") — a flat list, not sorted or weighted by
  specificity or by anything computed.
- `reports.service.ts:527-531` (per agent trace, specificity ratio per party)
  labels engagement `high`/`moderate`/`low` for display, but nothing in code
  uses this to reorder, rank, or otherwise make a low-volume/high-specificity
  contributor more prominent than a high-volume/low-specificity one anywhere
  in the report structure.
- Same `surfacedPatterns` dead-wiring documented under claim 2 applies here:
  `R3`'s positive detections and `R4`/`F3`'s trend detections are computed,
  stored, and then never reach the live conversation (`composeSystemPrompt`
  doesn't populate `surfacedPatterns`) and never reach synthesis
  (`reports.service.ts` never queries `patternDetection`). They only surface
  via the admin ground view (`grounds.service.ts:504-508`) and the aggregate
  admin narrative counter (`alignment.service.ts`).

**Bottom line on this claim:** the substance-scoring layer is real code. The
"surfaces the quiet heavy-lifter in what the customer actually reads" part of
the promise is not a ranking mechanism anywhere — it's the model being asked,
per-report, to notice a hidden contributor from raw text, with no code-level
weighting or promotion behind it.

---

## 6. THE ADVERSARIAL RESPONSE — specificity/document ask + covert cross-check

**Verdict: SPLIT — trigger is code, behavior-when-triggered is prompt.**

**Code guarantee — the evidence-ask trigger fires on real signal, every message:**
- `intake.ts` runs on every inbound message (`context.service.ts` calls it
  before context is built, per file header at `intake.ts:1-9`). It computes
  `isAdvisoryOnly`, `meetingScore`, `factualClaims` deterministically.
- `context.service.ts:190-206` (per agent trace): if `intake.isAdvisoryOnly`
  or `intake.meetingScore > 0.2`, code injects an explicit instruction into
  the prompt block telling the model to probe — e.g. "MEETING LANGUAGE - probe
  what the meeting produced." This is a real, code-computed conditional
  branch, not something the model decides to do unprompted.

**Code guarantee — the cross-check trigger fires on real signal:**
- Same `context.service.ts:315-321`/`:355-385` overlap and invisible-labour
  thresholds documented under claims 1 and 5 — `overlap.length >= 2`,
  `invisibleLabourMentions.length >= 2`. The decision to *check* is code.

**Prompt instruction, unenforced — what happens once triggered:**
- Whether the model actually asks a sharp, specific evidence question (vs. a
  soft one) is prompt language (`prompt-library.ts`'s per-scenario packs, e.g.
  PIP's `SUPPORT QUESTION`/`SUCCESS DEFINITION`, proven live in
  `BUILD_TRUTH`/the prompt-wiring tests).
- Whether the cross-check stays covert is **entirely instruction, not
  enforcement**: `context.service.ts:265-266`'s "source-hidden" comment and
  the system prompt's general non-disclosure framing are the only mechanism.
  No code redacts or blocks the model from saying "the other party mentioned
  X" if it chooses to — there is no server-side filter on the AI's output
  checking for leaked cross-party references before the reply is persisted
  (`conversation.service.ts:318-321`: `anthropic.respond()`'s return value is
  stored and returned as-is, no post-processing for this).

---

## Summary table

| # | Claim | Verdict | Real code lives at | Prompt-only part |
|---|---|---|---|---|
| 1 | Cross-referencing across sessions | Prompt instruction | `context.service.ts:272-322` (live overlap signal only) | `reports.service.ts:298` — all actual session-diffing |
| 2 | Longitudinal truth / unfollowed commitments | **Split — code engine not wired to conversation or report** | `pattern-library.ts` detectors + `patterns.listener.ts`/`patterns.cron.ts`/`grounds.cron.ts:85` triggers | `reports.service.ts:298` naming it; **`surfacedPatterns` dead field**, `prompt-library.ts:1810,2081-2088` vs `conversation.service.ts` never setting it |
| 3 | Corroboration | Prompt instruction | `context.service.ts:298-320` (topic-overlap trigger only) | actual claim-vs-claim agreement judgment, entirely model |
| 4 | False-consensus resistance | **Code guarantee** (strongest) | `resolution.service.ts:83-94` (closure gate); `reports.service.ts:313-342` (absence/roster) | sentence-level "don't say agree" still model-followed |
| 5 | Hidden contributor / recognition | Split — signal computed, not wired to ranking | `intake.ts:74-76` (specificity); `pattern-library.ts:504-506,517-522` (R3/R4) | `reports.service.ts:145-156,300` — flat list, no code ranking |
| 6 | Adversarial response | Split — trigger is code, behavior is prompt | `context.service.ts:190-206,315-385` (trigger conditions) | covert framing entirely unenforced; no output redaction |

**The one finding that should change what gets said to a customer:** claim 2's
detection engine is real and well-built — genuine thresholds, genuine event +
cron triggers, a genuine 3-period persistence rule — but its output currently
reaches only the admin ground view, never the person's own live conversation
and never the shared report. "Groundwork notices when someone keeps not
following through, in your conversation with it" is not true today; "Groundwork's
admin dashboard can show you when someone keeps not following through" is.

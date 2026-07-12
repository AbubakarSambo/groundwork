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

**Verdict: SPLIT — PROMPT/AI-JUDGMENT for the detection itself, code
guarantee only for the trigger and the surfacing gate. This is the most
corrected finding in the document (twice) — read both corrections below in
order.** A behavioral-trend engine exists and is wired end-to-end for
*triggering* and *surfacing* (event-driven, three-period gate), but for 29 of
30 bad-faith codes, what counts as a detected instance in the first place is
AI extraction + AI confirmation, not a numeric threshold — despite an
elaborate numeric-detector library sitting in the same file, unused. The
specific claim "names an unfollowed commitment in the shared report" is
prompt-only. The one field originally built to carry detected patterns into
the live conversation is dead (written, never populated) — but a *separate*,
already-live mechanism does carry them, unconditionally, and originally
stated them as verdicts rather than using them to probe (now fixed).

**CORRECTION #2 (this section was wrong a second time):** the paragraph below
originally described the bad-faith detectors (`detectD1`...`detectF5`,
`PATTERN_DETECTORS`, `detectPattern`) as the mechanism that actually decides
whether a pattern fires, with the three-period rule as "a real code
comparison, not a description." **That's true of the trigger and the
surfacing gate, but false of the detection judgment itself.** Verified via
`git grep` across the whole committed codebase: `PATTERN_DETECTORS` and
`detectPattern` (`pattern-library.ts:629,641`) have **zero references outside
their own file** — nothing ever calls the dispatcher, and nothing ever calls
`detectD1` through `detectD8`, `detectB1` through `detectB12`, `detectK1`
through `detectK5`, `detectE1`/`detectE2`/`detectE3`/`detectE5`,
`detectR1`/`detectR2`/`detectR4`, or `detectF2` through `detectF5` — 29 of the
30 bad-faith codes. Even if something did call them, most would return
`false` immediately: `patterns.service.ts:455-486` (`buildF1Input`) is the
**only** place a real `DetectionInput` gets assembled, and it only populates
`submissions`, `thinkingScore`, `outputScore`, `priorSurfacedCodes`, `config`
— never `specificityScores`, which `detectR4` and `detectF3` require
(`if (!input.specificityScores || input.specificityScores.length < 3) return
false;`). The numeric-threshold library is dead scaffolding.

**PROMPT / AI-JUDGMENT, not code guarantee — how bad-faith detection actually
works, for 29 of 30 codes:**
- `patterns.service.ts:90-95` (`analyzeCheckIn`): one AI call
  (`this.anthropic.extract(PATTERN_DETECTION_PROMPT, ...)`) reads the
  transcript + extracted record and proposes candidate `{code, observation}`
  pairs. **No numeric threshold gates this call at all** — whether `D1`
  ("False Completion Reporting"), `B4` ("Founder Backstop Dependency"), or any
  other code fires is entirely the model's judgment of the transcript.
- `patterns.service.ts:99-106` (`confirmDetection`): a **second** AI call,
  asked YES/NO, must independently confirm each candidate before it's
  written via `observe()`. Still AI judgment, not a numeric check.
- The **only** code with a real numeric backstop is `F1` — `checkF1Conditions`
  (`pattern-library.ts:574-588`) is applied as a secondary gate *after* the AI
  proposes it (`patterns.service.ts:113-118`), requiring high thinking-language
  and low output-language scores across 3 consecutive periods *and* that F1
  was already surfaced once before with no change. This is real code, but it
  narrows an AI-proposed candidate; it does not detect independently.
- `R3` ("Named Collaborator", the one positive code) is the **only** fully
  code-detected pattern with no AI in the loop at all: `detectR3`
  (`pattern-library.ts:547-560`) is a plain keyword check on the person's own
  submissions, called directly (`patterns.service.ts:80`).
- **So: of ~31 pattern codes total, 1 (`R3`) is pure code, 1 (`F1`) is
  AI-proposed-then-code-narrowed, and 29 are pure AI judgment (proposal +
  confirmation, no numeric backstop anywhere).** The elaborate
  `DetectionInput`/`thinkingScore`/`outputScore`/`specificityScores` apparatus
  in `pattern-library.ts` reads as a numeric detection layer that was either
  superseded by the AI-extraction approach and never removed, or written
  speculatively and never wired — either way, it is not what runs.

**What IS a genuine code guarantee, independent of this correction:**
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
- **The three-period surfacing gate itself** (`patterns.service.ts:154-206`,
  `observe()`'s `periodsObserved` counter and consecutive-streak reset) is
  real code — it genuinely requires the *same AI-confirmed* code to recur on
  3 consecutive periods before `SURFACED`. What's AI judgment is *whether a
  period's evidence qualifies as an instance of that code at all*; what's
  code guarantee is *counting and gating on consecutive instances once the AI
  says yes*.
- **History depth:** bounded by `PatternDetection.periodsObserved` and the
  weekly period boundary above — the three-period gate looks at the **last 3
  weekly periods**, not all-time history, and not just the current session.

**Implication for testing:** because there is no numeric backstop for 29 of
30 bad-faith codes, a behavioral persona designed to trigger e.g. `D1` cannot
be verified by checking a score computation — the only way to know whether
detection works is to run the actual AI extraction + confirmation pipeline
against realistic transcripts and check whether it correctly identifies (and
correctly declines to identify) the pattern. **Detection accuracy itself —
not just wiring — is now a required test surface**, since "the detector"
*is* the model's judgment, not a formula a persona test can reason about in
advance.

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

**CORRECTION (post-publication — the original version of this section was
wrong):** this document originally claimed detected patterns "never reach the
live conversation" and that `PromptContext.surfacedPatterns` was the only
relevant mechanism. That was incomplete. There are **two separate, unrelated
mechanisms** for the same idea, built three days apart, and the audit below
only found the dead one.

**NOT WIRED (confirmed, this part of the original claim stands):**
- `prompt-library.ts:1810` declares `surfacedPatterns?: { code: string;
  observationText: string }[]` on `PromptContext`, and `buildIntakeBlock`
  (`prompt-library.ts:2081-2088`) fully implements consuming it — filtering
  out alignment-feed-only codes (`ALIGNMENT_FEED_ONLY_CODES =
  new Set(['F5', 'E4', 'LOW_SPEC_MULTI_DIM'])`, `pattern-library.ts:84`) and
  formatting the rest into a `PATTERNS_ESTABLISHED:` block in the assembled
  prompt. `composeSystemPrompt` in `conversation.service.ts` never sets this
  field, confirmed via `git log -S"surfacedPatterns"` across the entire history
  of that file: zero hits. This scaffold (`c12dee7`, June 10) was written a
  day before the current rule-based detection engine even existed (`2895c1d`,
  June 11) — it was never finished, not disconnected.

**CODE GUARANTEE — ALREADY LIVE (this is the correction):**
`context.service.ts:245-256`, inside `ConversationContextService.build()`,
runs on **every single call**, unconditionally — it sits *outside* the
`if (latestMessage)` block (which closes at line 237), so it fires from
session 1 onward regardless of message content:
```ts
const surfacedRaw = await this.prisma.patternDetection.findMany({
  where: { participantId, status: 'SURFACED', code: { notIn: [...ALIGNMENT_FEED_ONLY_CODES] } },
  select: { code: true, observationText: true },
});
const surfaced = surfacedRaw.filter((p) => !ALIGNMENT_FEED_ONLY_CODES.has(p.code));
if (surfaced.length) {
  block += `# Patterns established across prior periods (surface as a behaviour worth naming, never a verdict on the person)\n`;
  for (const s of surfaced) block += `- ${s.observationText}\n`;
}
```
This queries **every** surfaced pattern code except the two feed-only ones
(`F5`, `E4`) — no distinction between bad-faith and positive codes, no
allowlist, nothing scoped to R3 or any subset. `build()`'s returned `block`
becomes `dynamicContext` in `composeSystemPrompt`, which is part of the final
joined prompt string every time. Introduced `bc2300e`, June 7 — three days
*before* the dead `prompt-library.ts` scaffold was even written, meaning
whoever wrote the June-10 scaffold likely didn't know this already existed.

**Verified at the string** (see the conversation prompted 2026-07-12 for the
Option D investigation): a session-1 check-in with a `SURFACED` `D1` ("False
Completion Reporting") detection produced an assembled prompt containing,
verbatim: `# Patterns established across prior periods (surface as a
behaviour worth naming, never a verdict on the person)\n- The record
describes completion without downstream confirmation.` — a bad-faith,
longitudinal, code-detected pattern, delivered to the live conversation,
unconditionally, in the person's very first session. **This was "Option C"
(negative patterns in the live conversation), already shipped, discovered by
accident while verifying an unrelated positive-only feature.**

**RESOLVED:** the distinction that mattered was STATEMENT vs PROBE, not live
vs report. Fixed directly (not left as an open decision): the live block no
longer reads `observationText` at all. It now looks up each surfaced code
against `PATTERN_PROBE_BY_CODE` (`pattern-library.ts`) — an allowlist built
from `BAD_FAITH_CODES`' own pre-existing, previously-unused `probe` field (24
of 30 bad-faith codes already had an authored follow-up question sitting
there, written for exactly this purpose, never wired). A code with no
`probe` entry is excluded from the live path by construction — it still
reaches the report unchanged. 12 codes have no sensible probe form and are
report-only: K1-K5, E1/E2/E3/E5, R1/R2/R4. F5's `probe` field is a routing
instruction, not a real question, and is explicitly excluded from the
allowlist so it can never be mistaken for one. Re-verified at the string
after the fix: the same D1 detection now produces `[PATTERN_PROBE | TIER 1]
Recommended probe: Has the team depending on this confirmed it works for
them?` in the live prompt — no code name, no observation text, no verdict —
while the report corpus still names the observation, routed through
`concernFlags` exactly as Option B already proved. Guarded by 4 tests in
`pattern-probe-not-statement.spec.ts`.

- Where detected patterns *also* reach a human: `grounds.service.ts:504-508`
  selects `patternDetections` into the ground detail response (consumed by
  `GET /grounds/:id`, `grounds.controller.ts:60-62`, which is **not**
  admin-gated — any party who can load the ground sees it), and
  `alignment.service.ts:68-87` rolls the count into an admin-facing narrative
  sentence ("N patterns have surfaced that may be worth naming in your next
  conversation"). `reports.service.ts` has zero references to
  `patternDetection` (as of this document's original writing — since amended,
  see the Option B commit).
- Separately, `context.service.ts:328-388` (Degree-3, "invisible labour")
  is a **third**, narrower and correctly-scoped mechanism: fires only at
  session 2+, only when the org-wide count of this specific participant's
  name alongside operational words is `>= 2`, and is inherently
  recipient-correct (it searches for the participant's *own* name). This one
  is deliberately conservative and does not carry the same risk as the
  unconditional block above.

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
- This score is stored per check-in (`checkIn.specificityDimensions`).
  **Correction:** it is not, in fact, rolled into a `specificityScores` array
  consumed by the pattern engine — see the claim-2 correction above.
  `buildF1Input` (the only place a `DetectionInput` is assembled) never
  populates `specificityScores`, so `detectR4`/`detectF3` (the two detectors
  that would read it) always return `false` if they were ever called, which
  they are not.

**Code guarantee — a positive, code-computed "credit given" detector exists,
but it's broken for the recipient-facing recognition claim:**
- `pattern-library.ts:504-506` (`detectR3`, "Named Collaborator") — checks for
  explicit positive-credit language ("thanks to", "credit to", "shoutout to",
  "went above and beyond", etc., `:532-536`), `count >= 1`. Marked
  `POSITIVE_CODES` (`:19-27`) and explicitly excluded from the 3-period
  bad-faith gate — it can fire on a single instance.
- **FINDING (found while scoping a live-conversation wiring attempt for this
  code, then abandoned once this surfaced):** `detectR3` scans **the
  speaker's own submissions** for credit-giving keywords — it's a check on
  who is *talking*, not who is *named*. `patterns.service.ts:77-88` then
  calls `observePositive(checkIn.groundId, checkIn.participantId, 'R3', ...)`
  — `checkIn.participantId` is the person whose check-in this is, i.e. the
  **giver** of credit, not the recipient. The stored `observationText` is
  fixed boilerplate ("The record names another person positively with
  specific evidence of their contribution.") — it never captures *who* was
  named. There is no field anywhere in this data path that records the
  credited person's identity. A code named "Named Collaborator" cannot
  actually surface to the collaborator who was named — it can only be shown,
  honestly, to the person who did the naming. Confirmed by attempting to wire
  this into the live conversation for the credited party: there is no
  `participantId` to query for. Left unfixed, per instruction — this needs a
  detection-layer change (resolving and storing the named person's identity),
  not a wiring change, and that's a separate decision.
- The correctly-scoped, correctly-attributed version of this same idea
  already exists and is already live: see the Degree-3 "invisible labour"
  mechanism documented under claim 2 above (`context.service.ts:328-388`) — it
  searches for the participant's *own* name in other parties' records, so it
  is inherently recipient-correct in a way `R3` is not.
- **Correction:** `pattern-library.ts:517-522`/`:585-589` (`R4`/`F3`) are
  written to detect a declining specificity trend across the last 3 periods,
  but per the claim-2 correction, neither is ever called and their required
  input (`specificityScores`) is never populated. This is dead code, not a
  live "getting vaguer" signal.

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
- `R3`'s positive detections (real, code-computed) never reach the live
  conversation via the dead `surfacedPatterns` scaffold (`composeSystemPrompt`
  doesn't populate it), but as of the Option B commit **do** reach the report
  via `reports.service.ts`'s pattern-evidence query — with explicit
  instructions to keep positive credit out of `concernFlags`. `R4`/`F3`
  produce nothing to reach anywhere, since they're never called. Both R3 and
  the (non-functional) R4/F3 also surface via the admin ground view
  (`grounds.service.ts:504-508`) and the aggregate admin narrative counter
  (`alignment.service.ts`).

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
| 2 | Longitudinal truth / unfollowed commitments | **PROMPT/AI-JUDGMENT for 29 of 30 bad-faith codes (detection itself is AI extraction + AI confirmation, no numeric gate); code guarantee only for the trigger (event+cron) and the 3-period surfacing counter; live conversation now probes with patterns, never states them** | `patterns.service.ts:90-106` (AI detection+confirmation); `context.service.ts:245-256` (probe-only, allowlist via `PATTERN_PROBE_BY_CODE`) - `pattern-library.ts`'s numeric detectors (`detectD1`..`detectR4`, `PATTERN_DETECTORS`, `detectPattern`) are dead, never called; separate `prompt-library.ts:1810` scaffold is also dead | `reports.service.ts:298` naming the commitment in the report; the pattern *content* itself is model judgment end to end |
| 3 | Corroboration | Prompt instruction | `context.service.ts:298-320` (topic-overlap trigger only) | actual claim-vs-claim agreement judgment, entirely model |
| 4 | False-consensus resistance | **Code guarantee** (strongest) | `resolution.service.ts:83-94` (closure gate); `reports.service.ts:313-342` (absence/roster) | sentence-level "don't say agree" still model-followed |
| 5 | Hidden contributor / recognition | Split — signal computed; R3 itself misattributed (giver, not recipient) - Degree-3 mechanism is the correct version and is live | `intake.ts:74-76` (specificity); `context.service.ts:328-388` (Degree-3, correct); `pattern-library.ts:504-506` (R3, broken - see finding) | `reports.service.ts:145-156,300` — flat list, no code ranking |
| 6 | Adversarial response | Split — trigger is code, behavior is prompt | `context.service.ts:190-206,315-385` (trigger conditions) | covert framing entirely unenforced; no output redaction |

**CORRECTED TWICE, THEN FIXED — the one finding that changed what gets said
to a customer:** the original version of this line was wrong twice over.
First wrong claim: that the detection engine's output never reached the
live conversation — it did, unconditionally, from session 1, stated as a
verdict-shaped observation, for every surfaced pattern except the two
explicitly feed-only codes. Found by accident while verifying an unrelated,
deliberately positive-only feature request. Second wrong claim: that this
engine ran on "genuine thresholds, a genuine 3-period persistence rule" for
the codes themselves. It doesn't, for 29 of 30 — see the correction above.
The three-period rule and the event/cron triggers are real code; what
qualifies as a detected instance of `D1`, `B4`, or any other bad-faith code
in the first place is the model's judgment on that period's transcript, not
a formula.

The governing rule turned out to be STATEMENT vs PROBE, not live vs report:
a detected pattern must never be *stated* to the person live, but it may
*sharpen a follow-up question* — the same shape the already-correct Degree-3
invisible-labour mechanism uses. Fixed directly: the live block now looks up
each surfaced code's pre-existing, previously-unused `probe` field
(`pattern-library.ts`'s `BAD_FAITH_CODES`) instead of reading
`observationText`. 24 of 30 bad-faith codes already had an authored question
sitting there; the other 12 have no safe question form and are excluded from
the live path by construction (report-only, unforced). Re-verified at the
string post-fix: the live prompt now carries only the sharper question,
never the pattern name or the raw observation; the report still names the
observation, tone-controlled, exactly as claim 2 always intended it to.

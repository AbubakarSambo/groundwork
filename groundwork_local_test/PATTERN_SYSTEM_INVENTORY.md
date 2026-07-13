# Behavioural Pattern Detection - System Inventory (live-vs-dead map)

Read-only map of the pattern-detection system, separate from the conversation prompt and from
BEHAVIOR_INVENTORY.md. Nothing here is fixed, guarded, or revived. Paths are `api/src/...`.
Every live-vs-dead call is proven at the call path, not the name.

Legend: **LIVE-AI** (a model call decides it, wired into a running path) - **LIVE-NUMERIC** (real
code computes it, something consumes it) - **DEAD** (defined, never reached).

---

## The throughline (what is actually true)

The pattern SYSTEM is alive; the pattern LIBRARY's numeric detectors are mostly dead. Two separate
things share the same names and the same file, and that is the trap:

1. **The detection that runs is AI-judgment**, in a dedicated offline call - `analyzeCheckIn()`
   runs `anthropic.extract(PATTERN_DETECTION_PROMPT, ...)` then a second `confirmDetection()` AI
   call, per completed check-in, on an event + a daily cron. This is LIVE and firing.
2. **The 39 numeric `detectD1..detectF5` functions + the `PATTERN_DETECTORS` registry + the
   `detectPattern()` dispatcher are DEAD** - zero call sites outside the library and its tests.
   Exactly TWO numeric functions are still called: `detectR3` (positive signal) and
   `checkF1Conditions` (F1 composite gate). Confirmed by `grep` across all of `api/src`.
3. The library's per-code `detectXX` is NOT what decides whether a code fires. The AI decides,
   using the codes' *names + signals* injected into `PATTERN_DETECTION_PROMPT`. So the code
   catalogue is live (as AI-judgment); the same-named numeric detector behind it is dead scaffolding.

This matches BUILD_TRUTH_5's earlier finding ("29 of 30 codes AI-judgment; numeric library dead")
and extends it with the full firing map below.

---

## 1. Full catalogue - every code the system claims to detect

39 lettered codes in six families (`pattern-library.ts:35-77`), plus three specials. R3 is the one
positive code; the rest are bad-faith / adversarial. "Plain terms" = what it is meant to catch.

### D-codes - delivery & output (8) - `:35-42`
| Code | Catches (plain terms) |
|---|---|
| D1 | Says it's done; the people downstream say it isn't. |
| D2 | Works in the demo, breaks in real use. |
| D3 | Quietly moves the goalposts - redefines "success" mid-stream. |
| D4 | Strategy theatre: lots of planning talk, no workplan or output. |
| D5 | UI shipped, the backend / workflow behind it isn't. |
| D6 | Only one person can run or explain the thing. |
| D7 | Timelines wildly out of proportion to the actual scope. |
| D8 | Keeps breaking after it was called "delivered". |

### B-codes - behavioural (12) - `:44-55`
| Code | Catches |
|---|---|
| B1 | Tells the CEO it's great; the team's reality says otherwise. |
| B2 | Presents with confidence, executes poorly, period after period. |
| B3 | Claims ownership of work other people did. |
| B4 | The founder keeps rescuing this exec from operational failures. |
| B5 | Endless coordination, blockers never actually reduce. |
| B6 | Researches / explores forever, never converts to a decision. |
| B7 | High burn, nothing you can attribute to it. |
| B8 | Gets hostile or blames when delivery is questioned. |
| B9 | Team names different priorities from each other and their lead. |
| B10 | Basic execution needs a meeting to move at all. |
| B11 | Failures are always someone else's / external. |
| B12 | Enterprise process in a startup (or vice-versa). |

### K-codes - commercial (5) - `:57-61`
| Code | Catches |
|---|---|
| K1 | Sales by decks/proposals, never named conversations with named buyers (role-gated to sales). |
| K2 | Finance watches the spend, never challenges the waste. |
| K3 | Flags issues repeatedly, never acts on them. |
| K4 | Inbox/admin busyness crowding out the strategic work. |
| K5 | Lists activity with no line to any goal. |

### E-codes - equity (5) - `:63-67`
| Code | Catches |
|---|---|
| E1 | Holds equity, delivery is absent across periods. |
| E2 | "I'll make the intro" forever, never completes one. |
| E3 | Present for the high-status moments, gone for execution. |
| E4 | One founder keeps absorbing the other's operational load. **(feed-only)** |
| E5 | Repeatedly asks for upside without matching contribution. |

### R-codes - relationship (4; R3 positive) - `:69-71, :22-25`
| Code | Catches |
|---|---|
| R1 | Several people name this person as the blocker; never resolves. |
| R2 | Their work reliably creates confusion for others. |
| **R3** | **POSITIVE**: names another person with specific evidence of that person's contribution. |
| R4 | Two people who used to corroborate each other stop appearing in each other's records. |

### F-codes - senior-hire composites (5) - `:73-77`
| Code | Catches |
|---|---|
| F1 | Big thinking, little output - genuine ideas, role mismatch not dishonesty. **(numeric-gated)** |
| F2 | Describes strategy confidently; the team's records show no trace of it. |
| F3 | Early check-ins sharp; later ones vague and philosophical as equity vests. |
| F4 | Team likes them; nothing they own moved materially. |
| F5 | One cofounder's record is all ops, the other's all narrative. **(feed-only)** |

### Specials
| Code | Catches | Where |
|---|---|---|
| LOW_SPEC_MULTI_DIM | 3+ specificity dimensions vague/managed in one session (admin flag). **(feed-only)** | `patterns.service.ts:127-139` |
| CONCENTRATION_RISK | One person active in 3+ grounds at once (over-extension). | `patterns.service.ts:339-397` |
| M4_PLUS | "Force multiplier": org-wide, this person is named across many others' records. | `intelligence.service.ts:230-291` |

---

## 2. Live-vs-dead at the actual call path

| Thing | Class | Proof |
|---|---|---|
| **The 37 bad-faith codes (D/B/K/E/R1-R2,R4/F) as DETECTION** | **LIVE-AI** | `analyzeCheckIn` -> `anthropic.extract(PATTERN_DETECTION_PROMPT)` (`patterns.service.ts:91-95`) + `confirmDetection` 2nd AI call. The codes reach the model as text (`pattern-library.ts:117`), schema-enum constrained (`:132`). |
| **`PATTERN_DETECTORS` registry + `detectPattern()` dispatcher** | **DEAD** | Zero references outside `pattern-library.ts` + `*.spec.ts` (grep, all `api/src`). BUILD_TRUTH_5 same finding. |
| **`detectD1..detectF5` numeric fns (37 of them)** | **DEAD** | Never called. The same-named CODE is detected by AI, not by these. |
| **`detectR3`** | **LIVE-NUMERIC** | Called `patterns.service.ts:80` - R3 positive signal, surfaces immediately. |
| **`checkF1Conditions` / `detectF1`** | **LIVE-NUMERIC** | Called `patterns.service.ts:114-115` - composite gate on an AI-flagged F1 candidate (4 conditions incl. prior-surfacing). |
| **LOW_SPEC_MULTI_DIM** | **LIVE-NUMERIC** | Rule in `analyzeCheckIn` (`patterns.service.ts:127-139`), dimension count. |
| **CONCENTRATION_RISK** | **LIVE-NUMERIC** | `detectConcentrationRisk` (`patterns.service.ts:339-397`), fired weekly (see 3). |
| **M4_PLUS force-multiplier (`detectForceMultiplier`)** | **DEAD** | Defined `intelligence.service.ts:230`; **zero callers anywhere** (grep). Writes an `M4_PLUS` upsert (`:272`) that never runs. |
| **Collusion (`detectCollusion`)** | **DEAD** | Defined `intelligence.service.ts:300`; **zero callers anywhere** (grep). The explicit collusion detector never runs. |

Net: **the adversarial detection that runs is the AI-judgment code catalogue** (D/B/K/E/R/F via
`PATTERN_DETECTION_PROMPT`), plus three live numeric backstops (R3, F1, LOW_SPEC_MULTI_DIM) and one
live org-wide rule (CONCENTRATION_RISK). **The two purpose-built adversarial detectors that sound
most like "adversarial" - force-multiplier and collusion - are both DEAD.** The whole numeric
per-code library is dead except R3 + F1.

---

## 3. Where detection happens

### Longitudinal (cross-session, over time) - WIRED AND FIRING
- **Per check-in**: `PatternsListener` `@OnEvent(CHECK_IN_COMPLETED)` (`patterns.listener.ts:16`)
  and `PatternsCron` `@Cron(EVERY_DAY_AT_2AM)` backstop (`patterns.cron.ts:24` -> `sweep()` ->
  `analyzeCheckIn`). Both registered (`patterns.module.ts:13`; `ScheduleModule.forRoot()` +
  `EventEmitterModule` in `app.module.ts`). **LIVE.**
- **Three-period rule** (a code must recur 3 *consecutive* periods to SURFACE; a gap resets to 1):
  applied inside `observe()` (`patterns.service.ts:181-205`) and promoted weekly by
  `GroundsCron` Monday 05:00 -> `startNewPeriod` -> `surfacePatterns` (`patterns.service.ts:260-327`).
  **LIVE.** Consecutive-only: week 1,2,4 does not surface (week 3 gap resets).
- **Concentration risk** (org-wide, cross-ground): `GroundsCron` Monday 05:30 ->
  `detectConcentrationRisk` (`patterns.service.ts:379`). **LIVE.**
- **Weekly org narrative**: `IntelligenceService` `@Cron('0 9 * * 1')` `weeklyLongitudinalSynthesis`
  (`intelligence.service.ts:206`) reads SURFACED rows -> AI 2-3 sentence org rollup. **LIVE.**

### Adversarial (bad-faith / gaming / collusion) - AI-judgment, and something ACTS on it
- **Decision** is AI, not numeric (see 2). Two AI calls: extract, then confirm.
- **Acts on it**: a confirmed code writes a `PatternDetection` (`observe()` `:160/:181`), which at 3
  periods becomes SURFACED and is then consumed live + in the report (see below). So detection is
  not computed into a void - it changes what the model asks and what the report flags.
- **The named "collusion" and "force-multiplier" adversarial detectors are DEAD** (see 2) - so the
  *explicit* collusion/gaming-ring detection does not run; what runs is per-person bad-faith codes.

### Cross-reference (a person's behaviour vs others') - PASSIVE, generic
- `crossReference()` (`context.service.ts:285-402`), session-2+, only if another party has a
  completed check-in. Generic keyword/noun overlap -> a CONTRADICTION or CORROBORATION **probe**
  (`:328-334`). Injects a question only; **writes nothing**. This is the same mechanism as
  BEHAVIOR_INVENTORY H3/#9. It is NOT the bespoke "how's the console" corroboration - that
  sophisticated version does not exist (generic overlap only), as already noted in BEHAVIOR_INVENTORY.

---

## 4. Guarded vs exposed

### Guarded (named specs)
| Behaviour | Spec |
|---|---|
| Surfaced pattern sharpens a live question, never states the code/observation/verdict; report separately names it; a no-probe code (K1) produces no live output | `conversation/pattern-probe-not-statement.spec.ts` |
| Surfaced patterns reach report synthesis as evidence; bad-faith (D1) -> concernFlags, positive (R3) -> not concernFlags, feed-only (E4) excluded | `reports/pattern-evidence-wiring.spec.ts` |
| Feed-only codes (F5/E4) excluded from the surfaced-pattern query (GW-07); cross-ref quality (GW-37); disclosure/crisis routing (GW-08) | `conversation/context.service.spec.ts` |

### Exposed (no test)
- The **AI detection call itself** - `analyzeCheckIn` extract + `confirmDetection`. Nothing asserts
  the prompt still enumerates the codes, or that the two-call gate holds.
- The **three-period rule** (consecutive-gap-reset, promotion to SURFACED).
- **F1 composite gate** (`checkF1Conditions`), **LOW_SPEC_MULTI_DIM**, **CONCENTRATION_RISK**.
- **The dead numeric library** (unguarded and unused - a test would pin dead code).
- **Dead collusion + force-multiplier** (`intelligence.service.ts`).
- **`PATTERN_DETECTION_PROMPT` content** - the enumeration at `:117` is the load-bearing thing that
  makes AI detection possible; nothing guards that it stays populated (a claim-verification-style
  thinning risk).

---

## 5. For the AI-judgment codes: is the detect instruction actually in the assembled prompt?

**Yes - and unlike the claim-verification rule we just fixed, it is fully present and reinforced,
because it lives in its own dedicated prompt + schema, not buried in ENGINE_RULES.**

- `PATTERN_DETECTION_PROMPT` (`pattern-library.ts:108-119`) is the *whole* system prompt for the
  detection call. It states the rules (emit only when present; pattern-level, never a verdict;
  don't infer intent; one point is not a pattern) AND injects **every** code + signal:
  `${BAD_FAITH_CODES.map(c => `- ${c.code} (${c.name}): ${c.signal}`).join('\n')}` (`:117`).
- The output schema (`PATTERN_DETECTION_SCHEMA:121-137`) constrains `code` to
  `enum: BAD_FAITH_CODES.map(c => c.code)` (`:132`) - the model cannot emit a code that isn't in
  the catalogue, and the catalogue is the same source of truth as the prompt text.
- **Crucial contrast with claim-verification**: that rule was one line inside the giant live
  ENGINE_RULES and got thinned/unreinforced in the live path. Pattern detection is the opposite:
  it is *architecturally isolated* into a separate offline AI call whose entire prompt is the
  detection instruction. It is NOT in the live conversation prompt at all - by design, the live
  model only ever receives a *sharpened probe* (`PATTERN_PROBE_BY_CODE`), never "detect a pattern".
- So the answer per your framing: the instruction IS in the assembled prompt that reaches the model
  **for the detection call** (fully, code-enumerated, schema-locked). It is deliberately absent from
  the live conversation prompt. The exposure is not thinning - it is that nothing *guards* the
  enumeration from silently emptying, and that the detection call has no behavioural tripwire.

---

## Consumption map (where a SURFACED pattern goes)

| Consumer | Path | What it does |
|---|---|---|
| Live chat | `context.service.ts:255` (SURFACED, feed-only excluded) -> `PATTERN_PROBE_BY_CODE` | Injects a sharper QUESTION under "# Sharpen these questions". Only the **25 codes with a probe** (D1-D8, B1-B12, F1-F4, R4) ever reach live chat; K/E/R1-R3 never do. |
| Report | `reports.service.ts:461` (SURFACED) | Bad-faith -> `concernFlags` via synthesis rule 10 (factual, never accusation); positive (R3) -> not a concern; E4/F5 excluded. |
| Org dashboard narrative | `intelligence.service.ts:365` | Anonymised weekly rollup, no names/codes. |
| Alignment feed (admin) | `alignment.service.ts:72` + `surfacedForGround` | Admin-only display of surfaced rows. |

---

## Decisions recorded (2026-07-13) - planning only, nothing built

### Decision 1 - GUARD THE LIVE DETECTION (yes, priority). PLAN, not built.
The AI-judgment detection is the integrity layer and is unguarded. Planned tripwires, same
discipline as the conversation suite (assert at the real artifact, prove-to-bite):

- **Enumeration tripwire (structural, CI-fast, the load-bearing one).** Assert
  `PATTERN_DETECTION_PROMPT` still contains every `BAD_FAITH_CODES` entry as `- CODE (name): signal`
  (it is built from that array at `pattern-library.ts:117`), AND that `PATTERN_DETECTION_SCHEMA`'s
  `code` enum equals `BAD_FAITH_CODES.map(c => c.code)` (`:132`). Bites the moment the enumeration
  empties or the schema drifts from the catalogue - the "silent thinning" failure mode. No model
  call needed.
- **Two-call gate + three-period rule (structural).** Assert `analyzeCheckIn` still runs
  extract -> `confirmDetection` (both AI calls) and that `observe()` only SURFACES at 3 consecutive
  periods (gap resets). Guards the shape that stops single-call false positives.
- **Behavioural proof (real model, gated/nightly, NOT in the fast suite).** Exactly the run we just
  did: a seeded managed/bad-faith record fires the right family of codes; a genuine record emits
  nothing. Keep it as a manual/nightly check because it needs Vertex creds and is nondeterministic -
  the structural tripwires are the CI guardrail; this is the periodic real-output confirmation.

### Decision 2 - ORPHANED ADVERSARIAL DETECTORS: collusion test result (read-only, real model)
Question: does the live AI-judgment path actually catch collusion, making `detectCollusion` /
`detectForceMultiplier` redundant? Ran a colluding pair (A and B mutually vouch, both claim
completion, matching framing, no independent confirmation) + a genuine control through the REAL
`PATTERN_DETECTION_PROMPT` (gemini-2.5-pro), per-party as `analyzeCheckIn` does:

- **A (colluder)** -> `D2` (completion without external confirmation) + `B3` (claimed-work inflation).
- **B (colluder)** -> `D5` (completion, no outside users) + `B1` (optimistic upward reporting) + `B5`
  (internal-alignment emphasis when asked for external outcomes).
- **Genuine control** -> nothing emitted.

**Verdict: PARTIAL - not a clean redundancy, not a clean gap.**
- AI-judgment reliably flags the collusion's *symptoms on each side*: both colluders get bad-faith
  codes for unverified completion + false alignment, on the same ground and topic. A reviewer seeing
  both parties flagged on the same claim has a strong practical collusion signal, and the
  cross-reference probe (topic overlap, session-2+) fires on top.
- BUT AI-judgment does NOT, and structurally CANNOT, detect collusion *as a cross-party pattern* -
  it analyses one party in isolation, so it never sees the mutual-vouching / two-sided-corroboration
  relationship that `detectCollusion` was built for (term overlap between the two records +
  unanchored mutual recall). Nothing automatically joins "A and B both flagged, vouching for each
  other" into a single "collusion" conclusion. That join was `detectCollusion`'s job, and it is dead.
- **So the product call is real, not cleanup:** if "both sides independently flagged" is good enough,
  the dedicated detectors are redundant -> delete. If you want collusion caught *as collusion* (a
  named cross-party signal, e.g. surfaced to the report or feed), that capability does not exist
  today and the orphaned detectors are an unbuilt feature to wire, not dead weight to remove.
  **Left for your decision. Nothing deleted or wired.**

### Decision 3 - DEAD NUMERIC LIBRARY (37 `detectXX` + `PATTERN_DETECTORS` + `detectPattern`).
Inert, harmless, misleading to readers (implies a numeric engine that doesn't run). Note for
**deletion or a one-line `DEAD - see PATTERN_SYSTEM_INVENTORY` header, low priority, later.** Keep
`detectR3` + `checkF1Conditions` (the two live ones). Not touched.

---

## Per-pattern decision surface (for when we act - NOT done here)

Once you have this map, the natural buckets:
- **Guard the live**: the AI detection call (prompt-enumeration + two-call gate), the three-period
  rule, F1 gate, LOW_SPEC_MULTI_DIM, CONCENTRATION_RISK, the SURFACED->probe and SURFACED->report
  consumption. All firing, none behaviourally tripwired.
- **Revive-or-delete the dead**: the entire numeric `PATTERN_DETECTORS` / `detectD1..detectF5` /
  `detectPattern` library (37 fns), and the two orphaned adversarial detectors
  `detectForceMultiplier` (M4_PLUS) and `detectCollusion`. Decide per item: wire it, or delete the
  scaffolding so the file stops implying a numeric engine that isn't there.
- **Behaviourally-tripwire the AI-judgment**: prove at real model output that
  `PATTERN_DETECTION_PROMPT` still fires the right code on a seeded managed-vs-genuine record (the
  analog to the claim-verification behavioural proof), and that a genuine record emits nothing.

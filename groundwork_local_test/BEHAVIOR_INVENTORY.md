# Conversation Behavior Inventory — the frozen baseline

Every conversation behavior in the product, where it lives, and whether a test guards it.
This is the checklist the tripwire suite maps to: each **⚠️ exposed** row should get a
tripwire that asserts the behavior on the **assembled prompt** or the **real detector**, and
every tripwire must be **proven to bite** (remove the rule → test goes red).

Legend: ✅ guarded (named spec) · ⚠️ exposed (no test) · 🔴 latent bug (not just exposure).

Repo paths under `api/src/...` and `client/src/...`.

---

## A. Chat rules — `ENGINE_RULES` (`modules/conversation/prompt-library.ts:55`, seeded as `'system'`, fetched every turn by `composeSystemPrompt`)

| Rule | Status |
|---|---|
| THREE FAILURE ORIGINS (situation / skills / character diagnostic) | ⚠️ |
| SURVIVABLE TRUTH PRINCIPLE (design philosophy) | ⚠️ |
| GOAL ALIGNMENT STEP 1–4 (role opening → goals → compare → evidence) | ⚠️ |
| DOCUMENT PROBE ("is it written down", three asks) — *proved it vanishes* | ⚠️ |
| EVIDENCE DEFINITION IS THE STANDARD + PUSHBACK RULES | ⚠️ |
| WILLINGNESS GATE (before tension sessions deepen) | ⚠️ |
| ONE QUESTION RULE | ⚠️ |
| HUMAN FIRST RULE (overrides every probe) | ⚠️ |
| HEALTHY SITUATION RULE (don't manufacture tension) | ⚠️ |
| GENERAL KNOWLEDGE RULE (answer the user's own questions) | ⚠️ |
| ACKNOWLEDGE BEFORE PROBE (hard rule) | ⚠️ |
| DEMONSTRATE YOU HEARD / never announce the save (the voice work) | ⚠️ |
| EMOTIONAL DETECTION (mediator, not therapist) | ⚠️ |
| NO-EDITORIALISING / BANNED WORDS / FILLER PHRASE BAN | ⚠️ |
| MULTI-CONTRIBUTOR INVITES PARALLEL (never sequential narration) | ⚠️ |
| REFRAME MOVE / READING RULE / NARRATION RULE | ⚠️ |
| CONTRIBUTION TAXONOMY (movement / coordination / absorption) | ⚠️ |
| RATIO RULE (acknowledge one, examine one, per exchange) | ⚠️ |

## B. Conversation / therapy style — tone tiers (`ENGINE_RULES`)

| | Status |
|---|---|
| TONE STATES: ENCOURAGING / CURIOUS / WARM AND OPEN / REFRAME | ⚠️ |
| TRUST CALIBRATION: HIGH / BUILDING / LOW / DECLINING / DEFENSIVE → tone routing | ⚠️ |
| POSITIVE SIGNAL DETECTION | ⚠️ |

## C. Entry-chat rules (anonymous flow — `modules/entry/entry.service.ts`, uses `ENGINE_RULES` + addendum)

| | Status |
|---|---|
| ENTRY_SESSION_ADDENDUM (`:67`) — "record-builder, not a coach; redirect advice-asks" | ⚠️ |
| FAQ_PROMPT (`:131`) — one-two plain sentences, no dashes, facts only | ⚠️ |
| ENTRY_REPORT_PROMPT + schema (`:133`) — session-1 report generation | ⚠️ (see G) |
| Scenario onboarding openers (`:249–254`) | ⚠️ |

## D. End-session detection — 🔴 LATENT BUG (four inconsistent phrase lists for the same signal)

| Detector | Where | Status |
|---|---|---|
| `detectSessionComplete` (auth chat, ~9 phrases) | `conversation.service.ts:336,342,396` | ⚠️ |
| `COMPLETION_PHRASES` (entry backend) | `entry.service.ts:450,455` | 🔴 |
| inline completion phrases (entry controller) | `entry.controller.ts:128` | 🔴 |
| `SESSION_END_PATTERNS` (entry client) | `EntryChatPage.tsx:63,354` | 🔴 |
| `isEndIntent` (user end-intent) | `EntryChatPage.tsx` | ✅ `entry-end-intent.spec.ts` |

**The bug:** the four lists don't match — e.g. *"your check-in is complete"* is in
`SESSION_END_PATTERNS` (client) but not `COMPLETION_PHRASES` (backend) or
`detectSessionComplete` (auth). The same AI closing can trigger one path and not another →
the end-session flakiness. **Fix (tracked as a task): one shared source of truth for
end-detection phrases; all four paths import it.** The tripwire must **surface the
inconsistency**, not just assert "phrases present."

## E. Scenario-pack richness (`buildScenarioPackForParty`)

| | Status |
|---|---|
| Packs **reach** the assembled prompt (disconnection guard) | ✅ `scenario-prompt-wiring.spec.ts` (15 tests) |
| Every scenario returns a non-empty pack (no default-`''` regression) | ⚠️ (extend the wiring spec) |
| Pack **content richness** — thin packs carry evidence-probing | ⚠️ **current gap** — RICH: NEW_* / DRIFT / CRISIS / RECOGNITION / PIP; THIN: OKR / WORKPLAN / PULSE / REALIGN_TEAM / BOARD / COHORT |

## F. Cross-reference / patterns / navigation

| | Status |
|---|---|
| Patterns sharpen questions, never stated live | ✅ `pattern-probe-not-statement.spec.ts` |
| Pattern evidence into report | ✅ `pattern-evidence-wiring.spec.ts` |
| Feed-only code filtering (F5/E4 never surfaced) | ✅ `context.service.spec.ts` |
| Cross-reference DEGREES 1/2/3 + framing + contradiction rules | ⚠️ |
| **CROSS-PARTY SILENT CORROBORATION** — `crossReference()` (`context.service.ts:285`, wired via `build():210`, `sessionNumber >= 2`) turns another party's completed record into a **probe for the current speaker** that tests their claim (e.g. claims-complete + other-reports-problem → "has the downstream team confirmed it works?"), rendered "behind the curtain" (`:266`). **Non-revealing property** (`GW-37`): probes must NEVER attribute a position to the other party. Real + wired + silent, but **generic keyword-overlap** (not bespoke claim-specific probes) and **PULL/session-2+-gated** (not forward-planted). | ⚠️ **exposed** (context.service.spec touches it but asserts neither the probe generation nor non-revealing) |
| Check-in read isolation / privacy | ✅ `conversation-isolation` + `privacy-isolation` |
| **Navigation — first-turn `open()`** (engine speaks first) | ⚠️ |
| **Navigation — clarification-session opener** (`isClarification` → "do NOT ask the standard opener", open on the inference) | ⚠️ |
| **Navigation — self-correction-session opener** (`isSelfCorrection` → "returning to correct session N") | ⚠️ (lock is ✅, opener ⚠️) |
| **Navigation — returning-user opener** (`buildReturningUserContext`, session 2+) | ⚠️ |
| **Navigation — end→report flow surfaces its controls** (the bug we fixed) | ⚠️ |

## G. REPORT-SYNTHESIS VOICE — a SEPARATE surface (the report's own tone/rules, not the check-in's)

| | Status |
|---|---|
| `REPORT_SYNTHESIS` prompt (`prompt-library.ts:1167`, seeded `'report_synthesis'`) | ⚠️ voice unasserted |
| SYNTHESIS RULES 1–12 (`reports.service.ts:291`) — preserve specifics, no false consensus, hidden contributors, flag concern factually, never invent party counts, etc. | ⚠️ presence unasserted (some *mechanics* are in `reports.service.spec` / `pattern-evidence-wiring`, but the rules-are-present is not) |
| `REPORT_SCHEMA` field instructions (model-facing per-field text) | ⚠️ |
| Entry report voice — `ENTRY_REPORT_PROMPT` + `whatGroundworkSaw` / `honestClose` / `alignmentStatus` (`entry.service.ts:133,159,198`) | ⚠️ |

---

## Tripwire build order (each asserts on assembled prompt / real detector; each proven to bite)
1. **DOCUMENT PROBE / evidence-probing** present for every scenario (A) — *proved it vanishes*.
2. **Pack richness** (E) — every scenario non-empty + rich-tier packs carry evidence-probing.
3. **End-detection** (D) — lock each detector's phrases **and surface the inconsistency**; consolidation is a separate fix/task.
4. **Core chat rules present** (A) — HUMAN FIRST, ACKNOWLEDGE BEFORE PROBE, GENERAL KNOWLEDGE, ONE QUESTION, DEMONSTRATE YOU HEARD, banned-words/filler.
5. **Tone / therapy** (B) — TONE STATES + TRUST CALIBRATION present.
6. **Entry-chat rules** (C) — record-builder-not-coach + FAQ mode.
7. **Report-synthesis voice** (G) — SYNTHESIS RULES + REPORT_SYNTHESIS + entry report voice present.
8. **Cross-reference framing + navigation openers** (F).
9. **CROSS-PARTY SILENT CORROBORATION** (F) — tripwire asserts: (a) `crossReference()` *generates* a probe when a claim overlaps/conflicts with another party's record, and (b) the probe is **non-revealing** — never attributes a position to the other party ("the other party says X" must never appear). Guards today's real mechanism.

## Separate BUILD (not a guard) — flagged, not scoped
The sophisticated version of cross-party corroboration — **bespoke claim-specific probes** (turn "I shipped the console" into "how are you finding the console?" that distinguishes shipped-vs-built) and **forward-planting** the probe for whenever the other party next checks in — does NOT exist today (the live version is generic keyword-overlap, PULL, session-2+-gated). That's a genuine build on top of the guarded mechanism, decided separately.

Only after the suite is green do we touch the claim-verification universal rule — with the
suite watching, so any edit that drops another behavior goes red instantly.

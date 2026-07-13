# Conversation Behavior Inventory — the frozen baseline

Every conversation behavior in the product, where it lives, and whether a test guards it.
This is the checklist the tripwire suite maps to: each **⚠️ exposed** row should get a
tripwire that asserts the behavior on the **assembled prompt** or the **real detector**, and
every tripwire must be **proven to bite** (remove the rule → test goes red).

Legend: ✅ guarded (named spec) · ⚠️ exposed (no test) · 🔴 latent bug (not just exposure).

Repo paths under `api/src/...` and `client/src/...`.

---

## Phase 1 lock status — BUILT (branch `test/behavior-tripwires`)

Three tripwire specs, **58 assertions green + 1 intentional RED (H1)**, every one proven to bite:

| Spec | Covers | Assertions |
|---|---|---|
| `conversation/behavior-preservation.spec.ts` | A chat rules · B tone/trust · E pack richness | 41 ✅ |
| `conversation/behavior-context.spec.ts` | H1 across-turns (RED) · H2 across-sessions · H3/F#9 cross-party corroboration · F-nav self-correction + returning openers | 7 ✅ / **1 🔴 H1** |
| `conversation/behavior-entry-report-end.spec.ts` | C entry rules · D end-detection (+ inconsistency surfaced) · G synthesis voice | 10 ✅ |

Every tripwire asserts on the **assembled prompt** (`ConversationService.sendMessage` capture, `buildEntrySystemPrompt`) or the **real detector** (`detectSessionComplete`, `ENTRY_COMPLETION_PHRASES`, `SYNTHESIS_RULES`), never a raw source grep. Bite-proof method: neutralise the source rule → the matching assertion reds; restore → green.

**Test-enablement source changes (safe, pure):** exported `buildEntrySystemPrompt` / `FAQ_PROMPT` / `ENTRY_SESSION_ADDENDUM` / `ENTRY_COMPLETION_PHRASES` (entry.service), extracted the inline 13 synthesis rules into an exported `SYNTHESIS_RULES` const (reports.service). No behavior changed; neighbours green (reports+entry+conversation: 134 passed).

**H1 is RED on purpose** — history reaches the model but no "do not re-ask" instruction exists yet. It documents the live re-ask bug and goes green when Phase 2 lands the fix. Not-yet-guarded: clarification-session opener (needs a report+inference fixture), client `SESSION_END_PATTERNS` (vitest, cross-runner — the 4th end-detection list, noted in D).

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

## H. CROSS-CUTTING CONTEXT PROPERTIES — "does it hold context across time and people" (not single-turn rules)

| Property | Mechanism / where | Status |
|---|---|---|
| **H1. ACROSS TURNS** (within a session) — retain what the user said, don't re-ask | Full turn history assembled into the model call (`conversation.service.ts:316,384`, `conversationTurn.findMany` no `take`/`slice`, passed as messages). Context IS carried. | 🔴 **BROKEN behavior** — there is **no "do not re-ask what's answered" instruction anywhere**, and the packs list overlapping questions → the model re-asks answered questions (seen live). Context present, behavior fails. |
| **H2. ACROSS SESSIONS** (same person over time) — returning-person continuity, not cold restart | `priorSession` (prior record entries, ≤800 chars, `composeSystemPrompt:433–462`) + `returningUserContext` (`buildReturningUserContext:599`), both in the final assembled prompt (`:590`), `sessionNumber >= 2` | ✅ wired & firing (session-2+; summarized not full transcript) · ⚠️ exposed (no test) |
| **H3. ACROSS PEOPLE** (cross-participant) — connect A's records to B's | **Live:** `crossReference()` (`context.service.ts:285`, session-2+, needs other party checked in). **Report:** `reports.service.ts:274` reads ALL parties' records (`participant:{ groundId }`) | ✅ wired & firing · ⚠️ exposed (report side partly touched by `pattern-evidence-wiring`) |

---

## Tripwire build order (each asserts on assembled prompt / real detector; each proven to bite)
1. ✅ **DOCUMENT PROBE / evidence-probing** present for every scenario (A) — *proved it vanishes*. `behavior-preservation`
2. ✅ **Pack richness** (E) — every scenario non-empty + rich-tier packs carry evidence-probing. `behavior-preservation`
3. ✅ **End-detection** (D) — locks the auth detector + **surfaces the auth-vs-entry inconsistency** (entry's `your record is here` / `[session complete]` are invisible to the auth detector); consolidation = `task_35534866`. `behavior-entry-report-end`
4. ✅ **Core chat rules present** (A) — HUMAN FIRST, ACKNOWLEDGE BEFORE PROBE, GENERAL KNOWLEDGE, ONE QUESTION, DEMONSTRATE YOU HEARD, banned-words/filler. `behavior-preservation`
5. ✅ **Tone / therapy** (B) — TONE STATES + TRUST CALIBRATION present. `behavior-preservation`
6. ✅ **Entry-chat rules** (C) — record-builder-not-coach + FAQ mode, on the assembled `buildEntrySystemPrompt`. `behavior-entry-report-end`
7. ✅ **Report-synthesis voice** (G) — all 13 SYNTHESIS RULES present via exported `SYNTHESIS_RULES`. `behavior-entry-report-end` *(entry report voice `whatGroundworkSaw`/`honestClose` still ⚠️)*
8. ✅ **Navigation openers** (F) — self-correction opener + returning-user (session-2) continuity block, on the assembled prompt. `behavior-context` *(clarification opener still ⚠️ — needs a report+inference fixture)*
9. ✅ **CROSS-PARTY SILENT CORROBORATION** (F) — asserts (a) `crossReference()` *fires* a probe on claim/record conflict (`Recommended probe:` + the CONTRADICTION template) and (b) it is **non-revealing** — the other party's verbatim record text never appears + "never quote the other party" is present. `behavior-context`
10. 🔴 **H1 ACROSS TURNS** — full prior history reaches the model (green) AND a "do not re-ask what's answered" instruction is present (**RED today** — documents the live bug; goes green in Phase 2). `behavior-context`
11. ✅ **H2 ACROSS SESSIONS** — session-2 assembled prompt contains session-1 record content; session-1 does not. `behavior-context`
12. ✅ **H3 ACROSS PEOPLE** — `crossReference()` surfaces a divergence when A's claim + B's record conflict (covered by #9). `behavior-context`

## Separate BUILD (not a guard) — flagged, not scoped
The sophisticated version of cross-party corroboration — **bespoke claim-specific probes** (turn "I shipped the console" into "how are you finding the console?" that distinguishes shipped-vs-built) and **forward-planting** the probe for whenever the other party next checks in — does NOT exist today (the live version is generic keyword-overlap, PULL, session-2+-gated). That's a genuine build on top of the guarded mechanism, decided separately.

Only after the suite is green do we touch the claim-verification universal rule — with the
suite watching, so any edit that drops another behavior goes red instantly.

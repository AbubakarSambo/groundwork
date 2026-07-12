# Morning summary — what happened overnight

## Voice-pass fixes (from BUILD_TRUTH_6b), all committed on `fix/persona-harness-ground-discovery`

| Item | Status | Commit | Proof |
|---|---|---|---|
| **FIX 1** — typography in streamed AI deltas | ✅ done | `7a83339` | Real stored em-dash turn → hyphen through `houseStyle`; guard test (streamed deltas normalized) |
| **FIX 2** — mid-sentence truncation (gemini-2.5-pro thinking) | ✅ done | `7cba0e0` | Live: same prompt `MAX_TOKENS`(truncated)@2048 → `STOP`(complete)@8192+budget |
| **FIX 3** — mangled "It's about for you" opener | ✅ closed, **no fix** | — | Verified stale live (6 openers, all well-formed). See MORNING_DECISIONS.md |
| **DECIDE 4** — record-narration → demonstrate-heard | ✅ done | (this session) | Live: 8 turns, announce-the-save tic eliminated, no "entry"; ~1/4 soft residual (non-deterministic, expected) |

Two `houseStyle`/token commits touch only `anthropic.service.ts`(+spec); DECIDE 4 touches
only `prompt-library.ts`. None touch the uncommitted D1/D2/B pile.

**Prod note (FIX 2):** the token floor is code-level (`Math.max(..., 8192)`), so prod
gets ≥8192 automatically on deploy — no prod `GEMINI_MAX_TOKENS` change required.

## Doc correction — BUILD_TRUTH_4 was factually wrong (corrected this session)

**What it said (wrong):** the scenario packs (`buildScenarioPackForParty`/`SCENARIO_PACKS`)
are dead/seed-only and never reach the live conversation; the live session-1 opener is
just the generic `PATHWAY_QUESTIONS` question.

**The truth (verified live):** the packs are **LIVE at session 1**. `buildActivePathway`
(`prompt-library.ts:~1986`) uses the pack as the primary opener whenever one exists, and
`buildScenarioPackForParty` returns a non-null pack (791–2924 chars) for **every**
scenario/party — so the pathway-question fallback never fires. Confirmed two ways: a
direct call returned packs for all six combos; six live openers asked the packs' questions
(PULSE_CHECK opened "what's going well", not pathway-20).

**Why it matters:** decisions were made on that wrong claim — notably §5's "barely
different conversations across scenarios" conclusion is overstated for session 1, since
the packs make session-1 questions genuinely scenario-specific. A CORRECTION banner is now
at the top of BUILD_TRUTH_4 §2; the original wrong text is preserved and marked SUPERSEDED
so the error is visible. This surfaced while verifying FIX 3.

## Still open / untouched (as before)

- The **26-file D1/D2/B pile** is still uncommitted — separate unfinished work, deliberately
  left alone. Not part of any fix above.
- These 4 fix commits + the doc corrections sit on `fix/persona-harness-ground-discovery`.
  Recommended path (per session discussion): cherry-pick the code fixes onto a fresh branch
  off `origin/main` for a clean PR rather than rebasing this already-merged branch.

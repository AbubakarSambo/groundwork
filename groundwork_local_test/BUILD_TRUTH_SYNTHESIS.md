# BUILD TRUTH — Synthesis

## Canonical definition of Groundwork (internal, authoritative)

> Groundwork is a system for surfacing where people genuinely align and diverge, through private, guided conversations that gather each party's own account, verify claims rather than taking them at face value, and synthesize across people and across time into a report that reflects reality, not assertion.

This is the internal grounding for the product and the behavior tripwires. It names four load-bearing capabilities the suite must protect: (1) private, guided conversations that gather each party's own account, (2) claim verification instead of face-value acceptance, (3) synthesis across people and across time, (4) a report that reflects reality, not assertion. Public and user-facing copy (the marketing page, the onboarding chats) may be narrower than this on purpose and is left unchanged. The model-facing "what is Groundwork" line in the system prompt is flagged separately, not silently rewritten.

---

**Read this first.** It is the single truthful map of this codebase, built from the six
`BUILD_TRUTH_*` documents and the verification work of this session. It does not re-derive
those documents — it consolidates and cites them, and it opens with the throughline that
every stage earned the hard way. If you are a fresh person or a fresh instance, start here,
then follow the citations into the source docs when you need depth.

---

## The throughline: five ways this codebase lies, and the one thing that doesn't

Every hard-won lesson of this effort reduces to a single warning: **the structure of the
code will tell you things that are not true.** Do not trust it. Trust only what reaches the
user.

1. **Existence isn't function.** Code can exist, be well-named, be committed, and never
   run. The scenario packs (`SCENARIO_PACKS`/`buildScenarioPackForParty`) looked authored
   and intentional; a draft of `BUILD_TRUTH_4` concluded they were dead. The numeric pattern
   detectors (`pattern-library.ts` `detectD1..detectR4`, `PATTERN_DETECTORS`) genuinely *are*
   dead — never called (BUILD_TRUTH_5 claim 2). A named function is not a running function.

2. **Detection isn't correctness.** A value being produced does not mean it reaches anyone,
   or that it's right. `postReportGuide` generates accurate per-participant coaching on every
   report release — served to nobody, rendered by no UI (FEATURE_post_report_guide.md). The
   `R3` "named collaborator" signal is computed but **misattributed** — it credits the giver,
   not the recipient (BUILD_TRUTH_5 claim 5). Output existing ≠ output correct ≠ output
   delivered.

3. **Narration isn't reality.** The AI describes doing things the code does not do. It
   narrated multi-contributor invites as sequential when they are parallel; templates intend
   one thing and the model says another (BUILD_TRUTH_6b, "template intends X, model does Y").
   What the assistant *says it did* is not evidence of what happened.

4. **A confident report isn't proof.** During this very effort, an instance "fixed" and
   "proved" a production bug (`date`→`usageDate`) that **never existed in this repo** —
   demonstrated by git archaeology. And the documentation itself carried a factual error:
   `BUILD_TRUTH_4` stated the scenario packs were disconnected; that was **wrong and
   corrected mid-effort** (2026-07-12, verified live — see its CORRECTION banner). Confidence,
   fluency, and even a written proof transcript are not verification.

5. **The only reliable verification is proving at the actual output** — the assembled prompt
   string, the rendered view, the real HTTP response, the real test run — **never the code's
   structure or a summary of it.** Every claim in the source docs that survived was proven at
   output; every one that was softened or reversed had been taken from structure.

**This is why the persona test is the right instrument.** A persona only sees what actually
reaches the user: the screen, the email, the report, the AI's real words. It cannot read a
function name and be reassured. It is therefore immune to all five lies above — it catches
the built-not-wired feature (it never appears), the misattributed value (it reads wrong on
screen), the narration divergence (it contradicts what happened), the false fix (the bug is
still there). Structure lies to a code reader; behavior cannot lie to a user. Build the
personas to push on behavior.

---

## 1. The ground loop — one session end to end *(BUILD_TRUTH_1)*

The full lifecycle, cited to file:line in the source. Six stages:

1. **Create** a ground — `POST /grounds` → `GroundsService.create` (BUILD_TRUTH_1 §1).
2. **Invite** participants — never silent; a magic-link invite + `notifiedAt` stamp (§2).
3. **Check-in / contribute** — the private, AI-guided conversation (§3).
4. **What happens to a contribution** — extraction into record entries (§4).
5. **The report** — the synthesis across parties; the one place two parties' data meet (§5).
6. **Session to session** — how the loop recurs and value is meant to compound (§6).

BUILD_TRUTH_1 is the base; docs 2–6 build on it rather than repeat it.

## 2. Org, accounts, and user types *(BUILD_TRUTH_2, BUILD_TRUTH_3)*

- **Organizations** are created in exactly five places, all in `auth.service.ts` — no
  org-creation logic exists anywhere else (BUILD_TRUTH_2 §1). What's org-scoped vs
  platform-shared, and precisely what a **cross-org participant** and their home org can see
  of each other, is the testing-critical part (BUILD_TRUTH_2).
- **User types are three independent axes** (BUILD_TRUTH_3): org role (`ADMIN`/`MEMBER`),
  the platform-admin flag, and ground-level party type (`INITIATOR`/`PARTICIPANT`). They do
  not imply each other — a MEMBER can be an INITIATOR; platform-admin is orthogonal.

## 3. Scenarios — and the correction that proves the throughline *(BUILD_TRUTH_4)*

Sixteen `GroundScenario` values (BUILD_TRUTH_4 §1). The practical question the doc answers:
do personas need to vary by scenario, or does one generalize? But its most important content
is a **self-correction that is the throughline in miniature**: a draft claimed "System A" —
the richly-written scenario packs (`SCENARIO_PACKS`/`buildScenarioPackForParty`) — was
**disconnected, never called from the live conversation**. That was **wrong**. Verified live
(2026-07-12), the packs **are live at session 1**; the "never called" conclusion had been
read from structure and comments, not from the assembled prompt. The doc carries a CORRECTION
banner saying READ THIS FIRST because decisions were made on the false version. Treat every
"this code is dead" claim as unproven until you've watched the runtime path.

## 4. The claims-and-enforcement map — **the most important section** *(BUILD_TRUTH_5)*

For each promise the product sells, is it a **CODE GUARANTEE** (deterministic logic enforces
it), a **PROMPT INSTRUCTION** (text asks the model; nothing checks it held), or **NOT WIRED**
(code exists but the runtime never calls it)? This is the map that tells personas where to
push — anywhere below that isn't "code guarantee" is where the promise can quietly fail.

| # | Claim | Verdict | Where the real code is |
|---|---|---|---|
| 1 | Cross-referencing across sessions | **PROMPT INSTRUCTION** | only a live overlap *signal* is code (`context.service.ts:272-322`); all actual session-diffing is the model (`reports.service.ts:298`) |
| 2 | Longitudinal truth / unfollowed commitments | **PROMPT / AI-JUDGMENT for 29 of 30 bad-faith codes** | detection is AI extraction + AI confirmation, **no numeric gate** (`patterns.service.ts:90-106`); code guarantee only for the event+cron trigger and the 3-period surfacing counter. The numeric detectors in `pattern-library.ts` are **dead**. |
| 3 | Corroboration | **PROMPT INSTRUCTION** | topic-overlap trigger is code (`context.service.ts:298-320`); the claim-vs-claim agreement judgment is entirely model |
| 4 | False-consensus resistance | **CODE GUARANTEE** (the strongest) | closure gate (`resolution.service.ts:83-94`) + absence/roster logic (`reports.service.ts:313-342`) |
| 5 | Hidden contributor / recognition | **SPLIT** | specificity is genuinely computed (`intake.ts:74-76`) and Degree-3 is correct and live (`context.service.ts:328-388`); but **R3 is misattributed** (credits giver not recipient — broken, `pattern-library.ts:504-506`); no code ranks substance over volume |
| 6 | Adversarial response | **SPLIT** | trigger conditions are code (`context.service.ts:190-206`); the covert-cross-check *behavior* is prompt-only, **unenforced, with no output redaction** |

**The finding that changed what gets said to a customer** (BUILD_TRUTH_5): the pattern engine's
output *reached the live conversation unconditionally from session 1, stated as a
verdict-shaped observation*, for every surfaced pattern except two feed-only codes — found by
accident while verifying an unrelated feature. It was then corrected again: the codes do **not**
run on genuine numeric thresholds (29 of 30 are model judgment on the transcript). The governing
rule that emerged — now guarded by a tripwire — is **STATEMENT vs PROBE**: a detected pattern
must never be *stated* to the person live, but it may *sharpen a follow-up question*.

## 5. The AI's actual voice *(BUILD_TRUTH_6b)*

Judged against one bar — **a calm adult guiding a teenager; plain, concrete, never sounding
like software** — against 10 real stored transcripts, not templates. It **gets a lot right**
and the hard chatbot filler holds. The defects are specific "template intends X, model does Y"
divergences (BUILD_TRUTH_6b), the narration-isn't-reality class. Assess-only; the voice PR this
session addressed several.

---

## State of the system — what this session changed

### Features shipped / hardened (PRs #25–#31)
- **#25 — AI voice:** typography normalized in streamed deltas; mid-sentence truncation fixed
  on the gemini-2.5-pro thinking model (introduced `thinkingBudget`); record-narration →
  demonstrate-heard.
- **#26 — Forming report (D1/D2):** session-progress + D2-real synthesis fields; added
  synthesis rules 9–12 (hidden contributors, concern patterns, specificity cause, party
  roster).
- **#27 — Session-ready notifications:** one-shot "your check-in is now open" for session 2+.
- **#28 — Last-admin safeguard:** can't remove/deactivate the final org admin.
- **#29 — Lead-context input:** private initiator notes that *direct and weigh* synthesis but
  never become a claim (synthesis rule 13, own store, own labelled corpus section).
- **#30 — Self-correction lock:** a participant can revise a prior session until the next one
  opens, then it locks.
- **#31 — Gate post-report-guide:** stops the per-release Gemini spend on an unwired feature
  (default off, reversible).

*(Merge status is fluid: #25–#28 merged; #29–#31 opened this session. Verify before relying.)*

### Trust boundaries now covered by tripwire tests
Org isolation (`privacy-isolation` / `GW-PRI`), **probe-not-statement**, **pattern-evidence
wiring**, **self-correction lock**, **lead-context separation**, **post-report-guide gate**.
- **Cohort/contact email privacy** — enforcement is **proven at real output this session**
  (a same-org participant cannot see another's email when the toggle is on; self and
  names/roster preserved), but its guard test and initiator UI are **not yet committed** —
  Build B is mid-flight, paused on a presence-model decision (email is currently the only
  human identifier, so "keep names" needs a data decision). Do not record it as shipped.
- **THE CRITICAL CAVEAT:** *none of these tripwires run in CI.* The repo's only PR checks are
  Vercel deploys — `tsc`/`jest`/`vitest` run **nowhere on a PR**. So every tripwire guards the
  **code** but not the **merge**: a PR that breaks one of these privacy boundaries would go
  green and merge. (Tracked: the CI-gate task.)

### Features parked, with honest specs
- **brief-critique** (FEATURE_brief_critique.md) — an AI *output* critiquing an
  under-specified opening brief. Built, accurate when it fires (rare), **wired to no UI**;
  renamed away from the misleading `leadCalibrationNote`.
- **postReportGuide** (FEATURE_post_report_guide.md) — per-participant bridge coaching.
  Generation works and is accurate, but **unwired both directions** (no display; `openingLine`
  does not feed the `PATHWAY_QUESTIONS`-driven next-session opener), so it is now **gated off**.

### Known gaps
- **No CI test gate** — the single most important infra gap; the tripwires are only as good as
  someone running them locally.
- **The Gemini token floor** — the live check-in stream and two `generateContent` calls default
  to `2048` max output tokens and truncate real model output; only `extract()` (synthesis)
  hardcodes 8192. Split-brained and prod-affecting.
- **The entry-save lesson** — a production 500 came from a missing migration
  (`email_notifications`) that **no test caught**, because there is no integration test on the
  entry-save path. Stored value ≠ deployed schema; unit mocks don't catch migration drift.

---

## Where this product is soft — the targeting list for the personas

These are the places the product's promises are least guaranteed. Push hardest here; this is
where behavior will diverge from the promise.

1. **The longitudinal promise is prompt-only** (BUILD_TRUTH_5 claim 1). No code diffs sessions;
   cross-referencing rests entirely on the model remembering and comparing. The product's core
   value — "it compounds across sessions" — is exactly the least code-backed. *Push:* return for
   session 3 and check whether the report genuinely cross-references sessions 1–2 or just
   snapshots the latest.

2. **Pattern detection has no numeric backstop** (claim 2). 29 of 30 bad-faith codes are model
   judgment on a transcript; the numeric detectors are dead code. *Push:* feed ambiguous or
   sparse records and watch for false positives, invented concerns, or a "detected" pattern the
   record doesn't support.

3. **Corroboration is entirely model agreement judgment** (claim 3). The trigger is code; the
   "do these two accounts actually agree?" call is not. *Push:* have two personas describe the
   same thing incompatibly and see if the report smooths it into false agreement.

4. **Recognition rewards presence, not substance — and R3 is misattributed** (claim 5). No code
   ranks contribution by substance; R3 credits the wrong party. *Push:* one persona high-volume
   and low-substance, another the reverse; check who the report elevates and whether credit
   lands on the right person.

5. **The adversarial cross-check is unenforced with no output redaction** (claim 6). The covert
   framing is prompt-only. *Push:* try to get the AI to reveal that it's cross-checking, or to
   leak one party's specifics into another's view.

6. **Narration can diverge from behavior** (BUILD_TRUTH_6b; the parallel-invite case). *Push:*
   watch for the AI claiming an action, sequence, or state the system didn't actually produce.

7. **Names lie about behavior — assume the wart until proven** (the whole throughline).
   `restrictExternalVisibility` hid emails from cross-org viewers only despite implying a
   general "external" control; `postReportGuide` is served but never shown; System A "looked"
   dead. *Push:* wherever a label, field, or setting names a protection, verify at the rendered
   output that the protection actually happens — don't trust the name.

---

*Sources: `BUILD_TRUTH_1_ground_loop.md`, `BUILD_TRUTH_2_org_accounts.md`,
`BUILD_TRUTH_3_user_types.md`, `BUILD_TRUTH_4_scenarios.md` (read its CORRECTION banner),
`BUILD_TRUTH_5_claims.md` (the claims map), `BUILD_TRUTH_6b_ai_voice.md`, and this session's
PRs #25–#31, tripwire specs, and the FEATURE_*.md parking specs. Every consolidated claim here
is traceable to one of those; where this session's state is still in motion (Build B, merge
status), it is flagged rather than asserted.*

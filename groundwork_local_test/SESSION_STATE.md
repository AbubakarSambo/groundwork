# Session state — where this picks up

Written at the end of a long session on `fix/persona-harness-ground-discovery` (PR #24),
so the next session can resume without re-deriving anything. Verified against actual
`git log`/`git diff` at write time, not against what was reported earlier in the
conversation — two things reported as "done" earlier in this same session turned out to
be sitting uncommitted when checked just now. Treat that as the reason this file exists.

## Shipped and pushed (verified against `origin/fix/persona-harness-ground-discovery`)

- **E1** — one-time platform-admin bootstrap via `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` — `a7dd2b3`
- **E2** — team-invite gated to ADMIN, backend + client together — `457103a`
- **E3** — `PlatformAdminGuard` on `GET /billing/admin/stats` — `b93cdfb`
- **E4** — participant-request authz (membership checks + approval actually invites) — `ac5575e`
- **E5** — duplicate join-link signs back in instead of a raw DB error — `c362531`
- **E3/E4 guard tests** — permanent tripwires for both authz holes — `52c3a93`
- **Sequential-narration fix** — AI now describes multi-contributor invites as parallel/independent, never "I'll start with X" — `21f24f4` (prompt-only, architecture was already correct — see `BUILD_TRUTH` note below)
- **WhatsApp identity + delivery** — `4e1c0ae`
- **Option B (patterns → report `concernFlags`)** — `7644438`
- **Statement-vs-probe fix for live pattern surfacing** — `8b8012e`, guarded `5690406`
- **BUILD_TRUTH_5 corrections** (x2) — `2342fdb`, `caf0598`, `0150304`
- **Branch hygiene** (schema migration, `SAFE_PARTICIPANT_SELECT` restore, 3 stale specs) — `0209352`, `ecb4185`

All of the above is real, tested, and on the remote. Nothing here needs redoing.

## Correction: two things previously reported as done are NOT committed

Found while writing this file — worth stating plainly rather than letting it recur:

- **D1 (forming report + session progress)** — reported mid-session as "end-to-end
  complete, ready to commit as its own commit." It was never actually committed. There
  is no D1 commit in `git log`. The code sits only in the dirty working tree
  (`ReportPage.tsx`, `GroundParticipantPage.tsx`).
- **D2's two real fields (`hiddenContributors`, `specificityCauses`)** — reported as
  "shipped and guarded" after being built and verified live. Also never committed. The
  only trace in committed `reports.service.ts` is a comment referencing them at line
  153/433 — the actual schema fields, synthesis rules, and `ReportPage.tsx` rendering are
  all still sitting uncommitted (`client/src/types/index.ts`, `ReportPage.tsx`,
  `reports.service.ts` all still show `M` in `git status`).

**Do not assume anything is shipped based on a prior claim in this conversation — check
`git log origin/fix/persona-harness-ground-discovery` first.** This is the same
discipline BUILD_TRUTH_5 established for product claims; it applies to my own commit
claims too now.

## Deliberately not committed (decisions pending, not oversights)

- **`postReportGuide`** — genuinely AI-generated per-participant (not hardcoded, contrary
  to an earlier premise that was checked and found wrong), but the recommendation was to
  delete it outright rather than keep it as unfinished. **Your call, still open**: delete,
  or promote to a real deliberate feature.
- **`leadCalibrationNote`** — real content, but it's coaching *about* the lead, not for
  the lead. **Your call, still open**: does the lead see it (self-coaching) or does it stay
  internal-only (shapes synthesis, never shown)? Steer given was internal-only, matching
  the same probe-not-statement boundary drawn everywhere else this session — but you
  wanted to read the actual generated text before deciding, and that hasn't happened yet.
- **`recommendedNextStep`'s dead `hrefHint`** — resolved in the D2 commit-in-waiting:
  render the text, drop the href, until `/board`/`/actions` are real routes. Not a
  decision, just not committed yet because it rides on the same uncommitted D2 files above.

## B — cross-org visibility (`restrictExternalVisibility`) — not started as a feature

Checked the actual current state while writing this file:

- **Backend enforcement exists** (`grounds.service.ts:590` — `shouldHideEmails` check;
  `:889-890` — a settable field) but **only in the uncommitted working tree**, not on any
  branch.
- **The schema default is already correct and privacy-protecting**:
  `api/prisma/schema.prisma:293` → `restrictExternalVisibility Boolean @default(true)`.
  Silence already means restricted — no default to flip, no call for you to make there.
  (This resolves the one open question the B prompt flagged as needing your decision
  before building — the default was already right.)
- **No initiator-facing UI control exists anywhere** — this is still the actual gap:
  a real privacy setting nobody can reach. B has not been started as a build task this
  session; only the pre-existing (uncommitted) backend plumbing was found while scoping it.

## The language pass — started, not finished, nothing to commit for it

`BUILD_TRUTH_6_language.md` **does not exist**. What actually happened: three research
passes were kicked off (UI text, email copy, AI conversational prompt language). The
email-copy inventory came back complete (all 32 email-sending methods in
`api/src/modules/email/email.service.ts`, subjects + bodies, quoted). The UI-text and
prompt-library passes stalled — the background agents returned meta-commentary ("I'll
report back") instead of their actual findings on first completion, were resumed, and
had not yet returned substantive results when this session needed to end. No synthesis
or judgment table was written. There is nothing to commit for the language pass.

**Next session, to finish it:** re-run or resume the UI-text and prompt-library
inventory (the email one doesn't need repeating), then do the judgment pass yourself —
rank AI conversational language first, onboarding/first-contact second, everything else
after — against the "calm adult explaining to a teenager" bar, quote-cite-rewrite table,
save as `groundwork_local_test/BUILD_TRUTH_6_language.md`.

## What's next, in order

1. **Finish D1 + D2's two real fields as a real commit(s).** They were built and verified
   live earlier this session but never landed — this is the highest-priority item since
   it's finished work sitting at risk in a dirty working tree. Isolated-worktree discipline
   as used all session: stage only D1's files, or only D2's two fields' files, verify
   build/typecheck/test in isolation, commit, push.
2. **Decide + commit `postReportGuide`** (delete vs. real feature) **and
   `leadCalibrationNote`** (read the actual generated text first, then decide
   internal-only vs. lead-visible).
3. **Build B** — the initiator-facing control for `restrictExternalVisibility` (default
   already correct, no UI yet). Prove both directions at the string, guard it, commit.
4. **Finish the language pass** — `BUILD_TRUTH_6_language.md`, per the instructions above.
5. **Synthesis** — whatever synthesis-quality pass was intended after the language pass
   (not yet scoped in this session; ask what specifically before starting).
6. **Personas** — the full persona-agent test suite against the now-hardened product,
   per `groundwork_local_test/CLAUDE.md`'s "run it as a person, not as a test suite" rule.
   This was always the destination of this branch of work.

## Two open product decisions you still owe (repeated from above, so they're not buried)

1. **`postReportGuide`**: delete it, or make it a real feature? (Steer given: delete —
   a hardcoded reason it existed is gone, the recommendation was not to keep it "to
   finish later.")
2. **`leadCalibrationNote`**: lead sees their own calibration note, or does it stay
   internal-only? (Steer given: internal-only — but read the real generated text before
   deciding; that step hasn't happened yet.)

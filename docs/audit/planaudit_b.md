# Audit of fix plan, part B

Read against the code on 10 September 2026. Every citation below was opened. The plan is broadly
honest and unusually well-evidenced — most of its diagnoses are correct at the line. The problems
are concentrated in three places: the dependency claim at the foot of the document, the metering
premise in Batch 3, and a set of existing source-order specs that several batches would break
without saying so.

Ordered by severity.

---

## A. Blocking errors — the change would not work, or would break something

### A1. Batch 3 rests on a dependency that does not exist, and would charge per message

**Plan says** (Batch 3, step 1): add `openTheDoor(checkInId, userId)` doing `loadOwnedOpenCheckIn`,
`assertGroundAcceptsInput`, the COMPLETED refusal, **and the metering claim**, then "Call it as the
first line of `open()`, `sendMessage()` and `sendMessageStream()`." It justifies this with: "The
metering claim is idempotent per `(checkInId)` — see Batch 4, which gives it the unique row it
needs — so calling it from all three is correct, not a triple charge." Effort: "Half-day, once
Batch 4 lands. Sequence Batch 4 first."

**Code says** two things that break this.

1. The metering claim is not per-check-in and is not idempotent. At
   `api/src/modules/conversation/conversation.service.ts:571-583` the guard is
   `roundAlreadyStarted` — a query for an AI turn on *another participant's* check-in at the same
   `sessionNumber`, explicitly `id: { not: checkIn.id }`. The decrement at `:1180-1183` is
   `ground.updateMany({ where: { id: groundId, sessionsBalance: { gt: 0 } }, data: { decrement: 1 } })`.
   The unit metered is **one session of the whole round, per ground**, not one check-in. Because the
   check-in's own turns are excluded from the guard, a second `open()` by the same person already
   decrements a second time today.
2. **Batch 4 creates no unique row for metering.** Its five steps are `createSessionOnce`, the
   guarded `complete()` write, `beginClosingSession`, the turn pair, and the idempotency-header
   default. None of them touches billing. The thing Batch 3 says it is waiting for is not in the
   plan at all.

Consequence as written: the first participant in a round would decrement `sessionsBalance` on
**every message**, because `roundAlreadyStarted` never becomes true for them. A ten-turn session
would consume ten of the ten free sessions.

**Plan should say:** `openTheDoor` carries the three *guards* only —
`loadOwnedOpenCheckIn`, `assertGroundAcceptsInput`, the COMPLETED refusal — and metering stays
where it is, in `open()`. If metering is to move, it needs its own step: a
`SessionMeterClaim(checkInId | groundId+sessionNumber @unique)` row, or `CheckIn.meteredAt`, added
in this batch, not deferred to a batch that does not contain it. The Batch 3 spec line "each meters
exactly once for one session" must also be rewritten — the current model deliberately meters once
per *round*, not once per check-in, and a spec asserting per-check-in metering would encode a
billing change nobody has asked for.

**Also:** the stated sequencing "Batch 4 first" is not what Batch 3 needs. What it actually needs is
Batch 1 — see A3.

### A2. Batch 3 and Batch 2 would each break an existing source-order spec, unannounced

**`api/src/modules/conversation/a-hold-must-actually-hold.spec.ts`** pins the literal body of
`sendMessage`. At `:27-29` it asserts
`bodyOf('sendMessage')` matches `/await this\.assertGroundAcceptsInput\(checkIn\.groundId\)/`, and
at `:31-35` that `loadOwnedCheckIn` appears *before* `assertGroundAcceptsInput` in that body. Its
header comment explains why: "the defect was the ABSENCE of a call, and absence is what a
behavioural test of the happy path cannot see."

Batch 3 step 1 says "Delete the three hand-rolled preambles." That deletes exactly the two strings
this spec greps for. The spec fails, and its rule — which is Batch 3's own rule — is silently lost
if somebody deletes it to get green.

**`api/src/modules/grounds/every-way-a-check-in-completes-closes-its-round.spec.ts`** asserts, per
file in `COMPLETION_SITES = [conversation.service.ts, entry.service.ts, grounds.cron.ts]`, that
`writes.length > 0` and `calls.length >= writes.length`; and at `:42-66` that the set of files
writing `status: CheckInStatus.COMPLETED` in a `data:` block is *exactly* that list.

Batch 2 step 4 moves the COMPLETED write out of `grounds.cron.ts` into `finishTheSession` in
`conversation.service.ts`. `grounds.cron.ts` then has zero writes, `expect(writes.length).toBeGreaterThan(0)`
fails, and the file-set assertion fails too. Batch 2's risk note says "let the existing specs be the
safety net" — this one is not a safety net for this change, it is a casualty of it.

**Plan should say:** both batches list the spec they invalidate and say how it is re-expressed.
For Batch 3: `a-hold-must-actually-hold.spec.ts` is rewritten to grep `openTheDoor(` in all three
bodies and to keep the ownership-ordering assertion *inside* `openTheDoor`. For Batch 2:
`every-way-a-check-in-completes-closes-its-round.spec.ts` becomes a guard that every file writing
COMPLETED calls `finishTheSession`, with the site list reduced to two.

Two further existing specs are touched and unmentioned: `every-exit-goes-through-the-guard.spec.ts:20`
greps the literal `'private async guardedReply('` (Batch 15 step 1 changes that function's return
type — safe, but the spec should be checked), and
`client/src/pages/grounds/GroundParticipantPage.formingReport.spec.tsx` tests the exact "forming"
state Batch 17 replaces.

### A3. Batch 1's own new predicate is defined and then not used, leaving three of the holes open

**Plan says** (Batch 1, step 1): add `A_GROUND_IS_HELD`, `isHeld(status)`, and
`mayChangeOnItsOwn(status) = !hasEnded(status) && !isHeld(status)`.

**Code says** `mayChangeOnItsOwn` is then never called by any of steps 2–6. Step 2 hardcodes
`[...TERMINAL, PAUSED]`, step 3 uses `hasEnded || isHeld`, and **step 4 uses `hasEnded` alone**. So
after Batch 1:

- `grounds.service.ts:2683` still writes `AWAITING_PARTIES` on a PAUSED ground when a participant
  is added (the guard added at `:2430` only catches terminal statuses) — the ground silently
  un-pauses. This is the exact bug class the batch exists to close.
- `grounds.service.ts:2981` (`activate`) writes `ACTIVE` with no status guard at all. Not in the
  plan's list of writers.
- `grounds.cron.ts:80-83` (`inviteJoinersWhoStartToday`) filters `ground: { status: { notIn: TERMINAL } }`,
  so a PAUSED ground still sends deferred invitations. Not in the plan's list.
- `autoCloseStaleCheckIns` (`grounds.cron.ts:243-303`) and `fireSessionClosingWarnings`
  (`:319`) read no ground status whatsoever, so a PAUSED ground's in-flight session is still
  auto-closed and still gets the closing warning injected. Directly contradicts the batch's own
  step-2 rationale, "A held clock does not run."

**Plan should say:** step 4 uses `mayChangeOnItsOwn`, not `hasEnded`; and the writer list is six,
not four — add `activate`, `inviteJoinersWhoStartToday`, and a `ground.status` read to the
auto-close and warning sweeps.

Also: the client has its own mirror at `client/src/lib/a-ground-that-has-ended.ts`, consumed by
`BoardPage.tsx:162` and three ground pages. `isHeld` has to be added there too or the two copies
diverge, which is the failure the original file was written to prevent.

### A4. Batch 11's "Batch 2's `AN_ANSWER` fixes this in the same place" is false

**Plan says** (Batch 11, step 2 / P4-D04): the closing-synthesis repair sweep skips grounds broken
by a decline or an auto-close, and "Batch 2's `AN_ANSWER` constant fixes this in the same place it
fixes the release rule."

**Code says** `finishClosingSynthesesThatFailed` (`api/src/modules/reports/reports.service.ts:4168-4202`)
calls neither `isSessionReadyForReport` nor `recordRoundCompletion`. It hand-rolls its own
predicate three times inline: `status: CheckInStatus.COMPLETED` at `:4173` and `:4181`, and
`accepted.every(p => p.checkIns.length > 0)` at `:4190`. Introducing `AN_ANSWER` elsewhere changes
nothing here.

Worse, step 3 proposes reusing `who-is-still-expected.ts` for this population, and `:4187-4188`
carries a comment stating the opposite rule on purpose: *"The same test synthesize() uses: every
ACCEPTED party has a completed final session. An invited party who never joined must not hold this
open."* The Batch 4 helper lifted from `isSessionReadyForReport` **does** count a live-but-unaccepted
invitee (`grounds.service.ts:4292-4297`). Unifying them reverses this documented decision.

**Plan should say:** Batch 11 step 2 edits those three inline clauses itself, and either keeps the
accepted-only population with the comment intact, or overrules the comment explicitly.

### A5. Batch 4 step 3's "the clause is already written twice" is a misread — the two clauses differ

**Plan says** (Batch 4, step 3): "the clause is already written twice, at `grounds.service.ts:4287-4297`
and `:4374-4397`; lift it into `grounds/who-is-still-expected.ts` and call it from all three."

**Code says** they are not the same clause, and each difference carries a comment.
`isSessionReadyForReport` at `:4285` includes managing-only leads at session 1:
`...(sessionNumber > 1 ? { managingOnly: false } : {})`, above a comment at `:4282-4283` — *"EVERYONE
DOES A FIRST CHECK-IN. A managing-only lead gives session 1 like everybody else… from session 2 they
have no check-in and are not waited on."* `getSessionProgress` at `:4377` uses unconditional
`managingOnly: false`, above its own comment explaining why. `recordRoundCompletion`
(`round-completion.ts:29-32`) uses a third population again: `managingOnly: false` with **no invite
clause at all**.

A single lifted helper silently changes one of these. Which one it changes decides whether a
managing-only lead can hold session 1 open forever, or whether their session-1 account stops being
waited on.

**Plan should say:** `who-is-still-expected(groundId, sessionNumber)` takes the session number and
reproduces the session-1 managing-only rule, and the plan names which of the three current
behaviours becomes canonical.

### A6. Batch 5's enum reorder changes a scale whose two consumers keep their old thresholds

**Plan says** (Batch 5, step 1): declare `SpecificityLevel` as `MANAGED | VAGUE | DIRECTIONAL | SPECIFIC`
so "the enum's own ordinal *is* the rank", and "Delete the `RANK` map at `reports.service.ts:1308`
and rank by enum position."

**Code says** the rank feeds two threshold tests the plan never mentions:
- `reports.service.ts:1311-1312`: `mean >= 2 ? 'high' : mean >= 1 ? 'moderate' : 'low'`.
- `confidence-in-the-picture.ts:42-49`, documented `@param meanLevel the mean of the scored
  dimension levels, 0-3`, then `if (meanLevel >= 2) return { band: 'well covered' }`.

Today: `{vague:0, directional:1, managed:2, specific:3}` — so `>= 2` means managed-or-better (the
bug). Under the new ordinals: MANAGED=0, VAGUE=1, DIRECTIONAL=2, SPECIFIC=3 — so `>= 2` now means
**directional-or-better**, and a ground of all-directional sessions prints "high" / "well covered".
That is a different wrong answer, not a right one.

**Plan should say:** step 1 also moves both thresholds. With the new ordering the honest cuts are
`>= 2.5 → high/well covered`, `>= 1.5 → moderate`, else low — and Batch 5 step 5's
`scoredSessions < 2` cap applies on top.

### A7. Batch 9's `PLATFORM_WHERE` cannot compile against any of the three tables

**Plan says** (Batch 9, step 1): one
`PLATFORM_WHERE = { isSetup: false, organization: { isInternal: false }, deletedAt: null }`, used by
every platform count.

**Code says**: `deletedAt` exists **once in the entire schema**, on `User` (`schema.prisma:546`).
Neither `Organization`, `Ground` nor `CheckIn` has it. `isSetup` is on `CheckIn` only
(`schema.prisma:1192`) — `Ground` has none. `CheckIn` has no direct `organization` relation; it
reaches one through `ground`.

**Plan should say:** three shaped predicates exported from one module —
`CheckIn: { isSetup: false, ground: { organization: { isInternal: false } } }`,
`Ground: { organization: { isInternal: false } }`,
`UsageEvent: { organization: { isInternal: false } }` (and decide what to do with
`UsageEvent.organizationId` being nullable at `schema.prisma:4068`) — and drop `deletedAt`, or add
soft-delete to `Organization` as its own decision.

### A8. Batch 9's session-2 cohort source is on the wrong model and is null when it matters

**Plan says** (step 4): "**Where the number should come from**: the `CheckIn` rows for session 1
joined to **their participant's** session-2 `availableFrom`."

**Code says** `availableFrom` is a column on `CheckIn` (`schema.prisma:1199`), not on
`GroundParticipant`. And it is **null for SEQUENTIAL-cadence grounds** —
`conversation.service.ts:3327` says so in a comment: the next round "is not auto-scheduled
(availableFrom stays null until triggered)". The session-2 row itself only exists once session 1
completes (`createNextIfAbsent`, `:3417`).

So the proposed denominator silently excludes every sequential ground and every ground whose
session 2 was never created — reproducing P3-016's own defect in a new place.

**Plan should say:** the join is `CheckIn(sessionNumber: 2)` for the same participant; a null
`availableFrom` means "not yet due" and drops out of the denominator, stated explicitly; and
sequential-cadence grounds are excluded from the rate with a named reason rather than by accident.

---

## B. Contradicted comments the plan does not acknowledge

### B1. Batch 4 step 2 reverses a documented race fix

**Plan says:** move the extractors and the event to *after* the guarded status write; risk is only
"an extractor that reads `checkIn.status`".

**Code says** `conversation.service.ts:3118-3120`: *"ISSUE 6: extractRecordEntries runs BEFORE the
status flips to COMPLETED so the record is populated before the status change races past it."*
That is a recorded fix for the opposite race. The plan proposes undoing it and does not mention it.

**Plan should say:** either keep the extractors before the write and make only the *event emission*
conditional on `count === 1`, or state that ISSUE 6 is being overruled and why, and amend the
comment.

### B2. Batch 2 step 1 changes a rule a docstring says is not being changed

`round-completion.ts:8-10`: *"The rule is not new and is not changed here: a round is complete when
every participant who is not managing-only has a COMPLETED check-in at that session number."*
Batch 2 step 1 changes exactly that rule to `COMPLETED | DECLINED`. It is also directly asserted by
`a-round-closes-once.spec.ts`. The change may well be right; it must be stated as a reversal, the
docstring amended, and the spec updated in the same batch.

### B3. Batch 8 step 4 reverses a sentence in the file it is editing

`reports.service.ts:1186`: *"A lifted quotation is a fault to retry on, not to withhold for."*
Batch 8 step 4 makes a lift blocking. The plan quotes the *supporting* comment at `:1095-1096`
("identifies its author as surely as a name") and not this one.

### B4. Batch 8 step 7's Slack move reverses another

`reports.service.ts:2932-2934`: *"After the emails and outside the failure count on purpose:
nobody's report is unreleased because a customer's Slack channel was archived."* The move is
defensible, but the plan presents it as an oversight being corrected rather than a decision being
reversed.

---

## C. Wrong facts that do not sink the batch

| # | Batch | Plan says | Code says |
|---|---|---|---|
| C1 | 2 | "`CheckInStatus.DECLINED` is read in three places… The board chip at `board.service.ts:517` names a case nothing produces. Either wire it or **delete the chip**." | Six non-spec readers, and `decline()` is a live endpoint that does produce it: `grounds.service.ts:4408,4416`, `board.service.ts:517`, `conversation.service.ts:5261`, `who-is-worth-nudging.ts:80` (already renders "they declined, and that is a decision rather than a delay"), `client/.../ChatPage.tsx:445`. Deleting the chip is not an option; only the wiring half of step 3 stands. Separately, `CheckIn.willingnessConfirmed` (`schema.prisma:1208`) has **zero** non-spec readers or writers — the dead column for this feature, missed by both Batch 2 and Batch 12. |
| C2 | 2 | `isSessionReadyForReport` releases once everybody has answered; "the report already names the decline". | Nothing requires **at least one COMPLETED**. If every party declines, `active.length >= 2` holds and the round releases a shared report synthesised from zero accounts. Add `completed >= 1` (arguably `>= 2`) alongside `AN_ANSWER`. |
| C3 | 2 | `synthesisBackstop`'s faults are the hardcoded `sessionNumber: 1` and the `report: { is: null }` filter. | Both true (`grounds.cron.ts:643, 672`), but the larger hole is unnamed: `:643` also filters `status: GroundStatus.ACTIVE`, and a ground only becomes ACTIVE *when a report releases*. A ground whose first release never fired sits at AWAITING_PARTIES and can never be backstopped. The proposed fix ("for each non-terminal ground") happens to cover it; the diagnosis should say so. |
| C4 | 2 | Step 6 adds `source?: 'repair'` to the event type. | The backstop currently emits **no** `source` (`grounds.cron.ts:668-673`). The plan must also say to set it there — typing the field alone changes nothing. |
| C5 | 4 | Point `beginClosingSession` at `createSessionOnce`. | `beginClosingSession` creates at `sessionNumber: (last ?? 0) + 1` (`grounds.service.ts:2967`). On a second call `last` has moved, so there is no P2002 to catch — it creates a *second* final session. `createSessionOnce` is inert here; only the step's own "check for an existing `isFinal` session" fixes it. |
| C6 | 5 | "**Every** shared report falls through to the middle branch." | `howClear` has a fourth arm at `the-session-report.ts:625`: a null level prints "has not been read yet". Should read "every report with a non-null level". |
| C7 | 5 | Step 2's replacement source: `documentedEntries / totalEntries` from `RecordEntry.recallBased` / `anchoredOrigin`. | Both exist (`schema.prisma:1314, 1317`) and are written in exactly one place — `anchorRecordToDocuments`, `conversation.service.ts:3762` — which **returns early when the participant has no documents** (`:3747`) and depends on an LLM call that is `.catch(() => null)`. So the ratio is structurally 0 for every ground without uploads, and the new "recall confidence" would measure document upload, not recall. Also `the-session-report.ts:506` counts `!recallBased && countsAsASource(e.backedBy)`, so the new mapper must use the same predicate or the two disagree again. Needs an explicit "nothing to check against" band, or step 2's own fallback (delete the column) is the honest route. |
| C8 | 7 | The tool schema at `entry.service.ts:307` "requires" nine fields; and "the client is already sending it or is not". | Eight required — `yourRole` is optional (`:314`). And the client is **not** sending it: `client/src/pages/enter/EntryChatPage.tsx:1873` sends exactly `{ alignmentStatus, whatGroundworkSaw }`. Widening the DTO alone changes nothing; the plan should name that line as required work. |
| C9 | 9 | `status = COMPLETED` is written in three places: `conversation.service.ts`, `grounds.cron.ts:286`, "and the 4 AM backstop path". | The backstop writes no status; it only re-emits. The real third writer is `entry.service.ts:1550`. That matters for Batch 2 step 4 — the anonymous-entry path is a whole population the usage-event fix currently does not reach. |
| C10 | 9 | `admin.service.ts:216` "counts **Ground** rows behind a label containing 'check-ins'". | `:216` is `ground.count()` returned as `groundsCount`; no "check-in" label attaches to it. The mislabelling is real only at `AdminPage.tsx:716`. At `admin.service.ts:216` it is duplication, not a wrong label. |
| C11 | 12 | `contributorBypass` is among the "rows only SQL can create". | It is a **column on `Organization`**, not a table. Step 3 ("drop the column") is right; the framing is loose. P7-011's "twelve non-spec call sites" for `Subject` is stale — there are 22. |
| C12 | 13 | P6-002: `cadenceStated`/`timelineStated` — "**no copy reads either**", and the gap reader "never fires". | Both are read today: `grounds.service.ts:1710, 1725, 1844-1845, 2024-2025` (which nulls `cadence` precisely so the gap reader fires), written at `:383-384, 587-588, 3439-3441`; client at `WhatThisCheckInStillNeeds.tsx:9-10, 67, 70` and `TheReportYouSawAtTheEnd.tsx:48`, pinned by two specs. Step 3 should be rewritten as *finish the remaining surfaces* (summary card and board), not "the columns are unread". This also narrows Batch 15's "with `cadenceStated` unwired there is no way to tell which" to the `/start` path only. |
| C13 | 13 | Rename `RoundCompletion.roundNumber` → `sessionNumber` as "a rename with no behaviour change". | `roundNumber` is also a **payload key** in the outbound webhook builders (`webhooks/what-a-webhook-may-carry.ts:21,29,39,54,71,79,88,95,101`) and in `common/events.ts:55`. Step 1 gives the event *names* a dual-emit window; the payload *field* gets none. Scope the rename to the DB columns, or extend the deprecation to the field. |
| C14 | 15 | The localStorage list. | Incomplete, and it misses sessionStorage entirely. Also written: `gw_entry_session` (`EntryChatPage.tsx:34`), `gw_entry_pending_commit`, `gw_privacy_seen`, `gw-board-how-to-read`, `gw_not_invited_*`; and in sessionStorage `gw_magic_type`, `gw_magic_email`, `gw-new-ground-card`, `gw-context-chat:<groundId>`, `gw-entry-session` (hyphen — a *different* key from the underscore one, worth flagging on its own). Step 4 should say "localStorage and sessionStorage". Cadence is also sent a second time at `EntryChatPage.tsx:2129`. |
| C15 | 16 | "`machine-token.guard.ts:20-22` documents this as deliberate; the other two do not." | `:18-25` is a comment about `boundToPersonExternalIds`, not about revocation lag. The guard never reads the credential row and never checks `revokedAt`. None of the three documents it, and `MachineTokenGuard` has the same defect — step 3 must include it rather than hold it up as the model. |
| C16 | 16 | **`tokenEpoch` would lock people out.** Step 1 mints the epoch in the token and rejects on mismatch. | Three places mint a user session JWT: `auth.service.ts:1250` (`generateToken`), `participants.service.ts:344`, and `entry.service.ts:1960` — the latter two call `this.jwt.sign(...)` directly and bypass `generateToken`. If they keep minting without `tokenEpoch`, every participant invite sign-in and every entry handover 401s on deploy. (This also refines step 6: those two mints emit no `via` key at all, so they yield null rather than the `'password'` default the plan describes.) Step 1 must name all three, or route the outliers through `generateToken` first. |
| C17 | 17 | The database figures (43 of 243, 147 of 148, 21 of 224). | Not checkable read-only: `api/.env` points at a Postgres instance, and there is no committed snapshot. The plan states them as verified; it should name the database and the date they were measured, since step 4 is an SQL question against that same data. |

---

## D. Dependency order

**The plan's claim** (Coverage section): "Batch 4 (transactions and unique rows) unblocks Batch 3
and Batch 2. Batch 2 unblocks Batch 11's repair sweep. Batch 8 should land before or with Batch 11…
Everything else is independent."

**Verified, corrected:**

- **4 → 3: false.** The only thing Batch 3 cites from Batch 4 is a metering unique row that Batch 4
  does not contain (A1). Batch 3's real dependency is **Batch 1**: step 2 refuses a join with
  `howItEnded(status, endStateLabel)`, and `howItEnded` returns `null` for PAUSED because `hasEnded`
  is false (`a-ground-that-has-ended.ts:24-29`). Without `isHeld`, a PAUSED ground would be joined
  with a null message. `joinConfirm` also does not select `endState` (`entry.service.ts:1882-1885`),
  so that argument is unavailable as written.
- **4 → 2: understated and the wrong way round in one respect.** Batch 2's text never references
  Batch 4. But they *do* collide: Batch 2 step 4 extracts `conversation.service.ts:3116-3245` into
  `finishTheSession`, and Batch 4 step 2 reorders that same block so the status write comes first.
  These are contradictory restructurings of one method and must be done as one piece of work, in
  one batch, with one decision about ISSUE 6 (B1).
- **4 → 6 and 4 → 11: real, and unstated.** Batch 6 step 5 and Batch 11 step 3 both consume
  `who-is-still-expected.ts`, which Batch 4 step 3 creates.
- **2 → 11: stated, but the mechanism is wrong** — see A4. Batch 11 must do its own edit.
- **1 → 3 and 1 → 11: unstated.** Batch 11's `resumeGround`-adjacent surfaces and Batch 3's join
  refusal both need `isHeld`.

**Suggested order should read:** Batch 1 → Batch 4 (with Batch 2's `finishTheSession` folded in, or
immediately after and treated as one review) → Batch 3 → Batch 6 / Batch 11 → Batch 8 with or
before 11. The rest are genuinely independent.

---

## E. Effort estimates

| Batch | Plan | Assessment |
|---|---|---|
| 3 | Half-day | Wrong once the metering row is put back where it belongs (A1). **Day.** |
| 9 | Day | Understated ~2x. Step 6 alone ("one date-range control that every query respects") threads a parameter through ~12 queries plus the client, on top of a migration, a new counting module, five route deletions, a page deletion, two specs. **Two days**, or split step 6 out. |
| 10 | Half-day | Understated >2x. ~47 date call sites across client and API, two formatter modules, a raw-SQL rewrite, and an async `OpsSettingsService` reader that a synchronous formatter has to consume (cache at boot or thread it through every render — the non-trivial part). **1.5–2 days.** |
| 1, 4, 5, 8, 11, 12, 15, 16 | Day | Reasonable. |
| 2 | More than a day | Reasonable, and correctly flagged as the riskiest. |
| 6 | More than a day | Reasonable (open-ended). |
| 7, 17 | Hours | Reasonable. |
| 13, 14 | Half-day | 14 reasonable; 13 becomes half a day only if the `roundNumber` payload key is scoped out (C13). |

---

## F. Specs

Four proposed spec names **collide with files that already exist**, which matters in a repo whose
rules are named:

- `a-decline-is-an-answer.spec.ts` — Batch 2 proposes it as new. It exists at
  `api/src/modules/grounds/a-decline-is-an-answer.spec.ts` and already asserts the decline
  behaviour at unit level. **Extend it.**
- `a-hold-is-a-hold-until-somebody-lifts-it.spec.ts` — Batch 1. The rule already has a name:
  `api/src/modules/conversation/a-hold-must-actually-hold.spec.ts`. **Extend it** (and see A2).
- `the-clock-closing-a-session-does-what-a-person-closing-it-does.spec.ts` — Batch 2. Overlaps
  `every-way-a-check-in-completes-closes-its-round.spec.ts`, which it also breaks (A2).
- `a-shared-report-needs-two-people-and-the-page-says-so.spec.ts` — Batch 17. Adjacent to
  `client/src/components/gw/a-check-in-is-not-always-two-people.spec.ts`; check whether it belongs
  there before adding a second file.

Two proposed specs would not catch what they are for:

- **Batch 10's `one-date-format-everywhere.spec.ts`** as specified greps `toLocaleDateString`/
  `toLocaleString` and fails on any call outside the formatters. There are ~14 *numeric*
  `toLocaleString()` calls in the client (e.g. `AdminPage.tsx:757`). It fails on day one and gets
  skipped. Match `toLocaleDateString|toLocaleTimeString|toLocaleString\(\s*['"]` instead.
- **Batch 5's `the-clarity-sentence-changes-with-the-score.spec.ts`** asserts "three distinct
  sentences over the four bands". A four-band implementation also passes that. Say *at least three
  distinct*, or name the expected sentence per band.

Batch 7's step 4 ("strengthen `the-report-you-read-is-kept.spec.ts`") is right, but the plan should
note it changes the spec's nature: today it is a source-text grep (asserting the
`sessionReport: dto.report` regex and the absence of `soloArtifact: JSON.stringify(dto.report)`),
not a field-by-field behavioural comparison.

Sound as proposed: Batch 6's four, Batch 9's two, Batch 11's three, Batch 12's
`a-setting-has-a-way-to-be-set.spec.ts`, Batch 14's table-driven spec, Batch 15's two, Batch 16's
three.

---

## G. Batches checked and found sound

- **Batch 10** — every one of the ~20 citations verified exact, including all ten cron timezone
  pins, the two unpinned bucket calls at `prompts.service.ts:449, 454`, the three report date
  formats, `one-email-however-many-people.ts:133` as the single pinned server formatter, and the
  `display.timezone` declaration at `ops-settings.service.ts:19, 42-44` with genuinely no reader.
  The diagnosis is the cleanest in the plan. Only the spec regex and the estimate need fixing.
- **Batch 14** — all five DTO declarations verified line by line, the panel's inline body at
  `public-api.controller.ts:302`, the WhatsApp controller's raw request at `:52-54`, all five
  entry-handler postures, and the client truncation at `EntryChatPage.tsx:1826-1829`. The
  forged-assistant-turns point is correct and load-bearing. No corrections.
- **Batch 12** — every zero-reference grep re-verified today, including the `platformSetting.upsert`
  enumeration proving `coaching_live` and `correction_window_days` have no writer, and the dead
  `POST /grounds/:id/sign-off`. Only C11's framing nits.
- **Batch 6** — every citation exact, including the `board.service.ts:552` self-block filter and
  the engine header comment at `the-session-report.ts:113-115`. One addition: step 1 deletes
  `board.service.ts:585-635`, which contains the "THE LABELS WERE QUESTIONS AND THE VALUES DID NOT
  ANSWER THEM" comment (`:591-604`) recording a live bug report — say to *move* it into
  `what-this-session-holds.ts`. Also worth noting `GroundDependency.sourceCheckInId` already exists
  (`schema.prisma:1475`), so step 3's new column is a convenience, not a necessity.
- **Batch 7** — diagnosis exact, including `forbidNonWhitelisted` being genuinely set at
  `main.ts:124-126`. Two corrections at C8.
- **Batch 17** — `active.length < 2` confirmed at `grounds.service.ts:4300`. The change is copy and
  a conditional. Only C17 and the existing `formingReport` spec.

---

## Verdict per batch

| Batch | Verdict | Why |
|---|---|---|
| 1 | **Sound with corrections** | Diagnosis correct; the fix leaves three of its own holes open (A3) and skips the client mirror. |
| 2 | **Unsound as sequenced** | The `finishTheSession` extraction collides with Batch 4 step 2 on the same method (D), breaks an existing guard spec unannounced (A2), reverses a docstring without saying so (B2), and can release an all-declined report (C2). Every individual finding is real; the batch needs restructuring, not rejecting. |
| 3 | **Unsound** | The central mechanism rests on a Batch 4 dependency that does not exist, and as written would meter per message (A1). Also breaks `a-hold-must-actually-hold.spec.ts` (A2) and depends on Batch 1, not Batch 4 (D). |
| 4 | **Sound with corrections** | Step 2 reverses a documented race fix without acknowledging it (B1); step 3 rests on a misread that two different clauses are the same clause (A5); `createSessionOnce` is inert at one of its four call sites (C5). |
| 5 | **Sound with corrections** | Diagnosis is excellent and fully verified. But the enum reorder moves a scale whose two threshold consumers are not touched (A6), and the recall-confidence replacement source is structurally empty for grounds without documents (C7). |
| 6 | **Sound** | Every claim verified. Move the deleted comment; the `sessionNumber` column is optional given `sourceCheckInId`. |
| 7 | **Sound with corrections** | The client is not already sending the wide payload (C8); eight required fields, not nine. |
| 8 | **Sound with corrections** | All eight instances verified. Two steps reverse in-file comments the plan does not quote (B3, B4). Line nits at `:358`/`:360`. |
| 9 | **Unsound** | `PLATFORM_WHERE` cannot compile against any of the three tables (A7) and the session-2 cohort source is on the wrong model and null when it matters (A8) — this is the "swap one wrong number for another" case. Plus C9, C10, and a ~2x estimate. Everything else in the batch is well evidenced. |
| 10 | **Sound with corrections** | Spec regex, and the estimate. |
| 11 | **Sound with corrections** | Step 2's stated mechanism is false — `AN_ANSWER` does not reach this sweep (A4) — and step 3's helper reuse reverses a comment at `reports.service.ts:4187-4188`. |
| 12 | **Sound** | Only framing nits. |
| 13 | **Sound with corrections** | P6-002's central claim ("no copy reads either") is false (C12), and the column rename crosses a customer-visible payload key with no deprecation (C13). |
| 14 | **Sound** | No corrections. |
| 15 | **Sound with corrections** | The key list is incomplete and omits sessionStorage (C14); cadence is sent from two places; `every-exit-goes-through-the-guard.spec.ts` pins the declaration text. |
| 16 | **Sound with corrections** | `tokenEpoch` as written would 401 every participant sign-in and entry handover, because two mint sites bypass `generateToken` (C16). `MachineTokenGuard` has the same revocation lag it is held up as the model for (C15). |
| 17 | **Sound with corrections** | Only that the database figures are unverifiable from the repo and an existing spec covers the state being replaced. |

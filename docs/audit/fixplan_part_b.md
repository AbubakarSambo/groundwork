# Fix plan, part B: state machine / lifecycle, and numbers presented as fact

Slice: every finding whose cause is a state a thing cannot leave, a transition nothing guards, or a
number shown to somebody as if it were measured. 86 findings, 17 batches.

Every claim below was read in the code on 10 September 2026 at the cited line. Nothing is proposed
against code I did not open.

Two standing facts that shape every batch:

- **Every ground in the database is ours.** There are no live customers. Reprocessing is free, no
  migration path is needed, no update banner, no backfill script that has to be safe to run twice
  against somebody's paid data. Where a batch changes how a number is computed, the answer is
  "recompute everything", not "migrate".
- **This repo names its specs as sentences.** `a-ground-that-has-ended.spec.ts`,
  `one-word-and-it-is-session.spec.ts`, `a-seat-is-a-seat-on-both-screens.spec.ts`. Every spec
  proposed below is named the same way, and is named for the rule, not the bug.

Ordering is user harm first, then blast radius, then effort.

---

## Batch 1 — A hold that is not a hold, and an ending that does not end

**Closes:** P2-005, P2-012, P2-013, P2-014, P7-013

**The one cause.** `A_GROUND_IS_OVER` in `api/src/modules/grounds/a-ground-that-has-ended.ts:18` is
the repo's single list of terminal statuses, and its own docstring is the story of a CLOSED ground
coming back to life. PAUSED was never added to any equivalent list, and three writers do not consult
the terminal list at all. Verified:

- `grounds.service.ts:4223-4226` writes `PAUSED`. `grep -rn PAUSED api/src --include="*.ts"` outside
  specs returns exactly four lines: the docstring at `:4134`, that one write, and two reads in
  `conversation.service.ts`. **Nothing transitions a ground out of PAUSED**, while the docstring at
  `:4134-4139` says "an admin can un-pause by transitioning back to the prior status" and the
  user-facing error at `conversation.service.ts:797` says "until it is resumed".
- `grounds.cron.ts:20` sets `const TERMINAL = A_GROUND_IS_OVER`, and `stallOverdueGrounds` at
  `:117-137` selects `status: { notIn: TERMINAL }` — so a paused ground is a stall candidate and is
  written `STALLED`, which is terminal and has no exit.
- `reports.listener.ts:84-87` guards the un-pause-by-release only with `hasEnded(g.status)`, which
  does not cover PAUSED, so releasing a report sets a legally-held ground back to ACTIVE.
- `grounds.service.ts:2682-2684` writes `status: AWAITING_PARTIES` guarded only by
  `!== AWAITING_LEAD`. Adding a participant resurrects a CLOSED or STALLED ground.

**The change.**

1. In `a-ground-that-has-ended.ts`, add a second exported list and predicate beside the first:
   `A_GROUND_IS_HELD = [GroundStatus.PAUSED]` and `isHeld(status)`, plus
   `mayChangeOnItsOwn(status)` = `!hasEnded(status) && !isHeld(status)`. The file already exists to
   be the one place this question is asked; it grows one more question, not a second file.
2. `grounds.cron.ts:118`: change the candidate query to `status: { notIn: [...TERMINAL, PAUSED] }`.
   A held clock does not run.
3. `reports.listener.ts:84`: change the guard to `if (hasEnded(g.status) || isHeld(g.status))`. Keep
   the log line, extend the message to say which it was.
4. `grounds.service.ts` `addParticipant`, at the pending-approval check around `:2429`: add
   `if (hasEnded(ground.status)) throw new BadRequestException('This check-in has ended. Nobody can
   be added to it.')` before the participant is created — not just before the status write, because
   the participant row itself is wrong on a finished ground.
5. Add `resumeGround(groundId, adminUserId, reason)` beside `pauseGround` in
   `grounds.service.ts:4222`. It needs to know what to go back to. `pausedAt` is stamped and the
   prior status is not, so add `Ground.pausedFromStatus GroundStatus?` and write it in `pauseGround`
   alongside `pausedAt`; `resumeGround` restores it, clears both columns, refuses on any status but
   PAUSED, and takes the same org-membership check `pauseGround` already does at `:4218-4221`.
   Wire `POST /grounds/:id/resume` next to the existing pause route and put the button on the same
   surface that shows the hold.
6. P7-013: `assertGroundAcceptsInput` at `conversation.service.ts:772-791` returns early when it
   cannot read a status, and the comment explains that failing closed broke 46 prompt-assembly
   tests with an irrelevant message. That reasoning is about test doubles, not production. Keep the
   behaviour, but make it loud: `this.logger.error` naming the groundId when a row exists and its
   status is falsy. If it never fires, the finding closes itself.

**Migration.** Yes, one column: `Ground.pausedFromStatus GroundStatus?`. No backfill — any ground
currently PAUSED has no recorded prior status, and `resumeGround` should fall back to `ACTIVE` with
a logged warning for exactly those rows.

**Data already written.** Any ground swept from PAUSED into STALLED by the 3 AM cron is wrong and
unrecoverable from the row alone. Query for grounds with `pausedAt != null AND status = 'STALLED'`
and set them back to ACTIVE by hand. It is our own data; there will be few.

**Spec.** `a-hold-is-a-hold-until-somebody-lifts-it.spec.ts` — one paused ground, run against all
four writers: the stall cron leaves it alone, releasing a report leaves it alone, adding a
participant leaves it alone, and `resumeGround` returns it to the status it was paused from.
Extend `a-ground-that-has-ended.spec.ts` with the add-participant case.

**Effort.** Day.

**Risk.** Low to medium. The stall-cron and listener changes are narrowing predicates, which can
only stop writes. The add-participant refusal is a new 4xx on a path leads use — check the client's
error rendering on `GroundAdminPage` so it says "this check-in has ended" rather than a generic
toast. The new column is additive.

---

## Batch 2 — A round that can never complete, and a completion that completes nothing

**Closes:** P2-004, P2-021, P2-022, P4-C01, P4-C02, P4-C09, P4-C11

**The one cause.** Three separate functions each decide "is this session done", and they disagree
about what a DECLINED party and an auto-closed party are. Verified:

- `getSessionProgress` (`grounds.service.ts:4404-4415`) reads
  `status: { in: [COMPLETED, DECLINED] }` and returns `declinedParticipantIds` separately. Its own
  comment at `:4329-4341` says a decline is an answer and explains that not handling it created
  permanently stuck check-ins.
- `isSessionReadyForReport` (`grounds.service.ts:4284-4308`) counts a party active on
  `userId != null` and then requires `status: COMPLETED` from each. A declined party has a userId
  and no COMPLETED row, so it returns false **for that session and every later one**.
- `recordRoundCompletion` (`grounds/round-completion.ts:40-48`) counts only COMPLETED. Same result.
- So the fix landed in one of the three places, and the admin screen now says the round is complete
  while the report never leaves "forming". No cron repairs it.

And the auto-close path is a second, unrelated definition of "completed":

- `grounds.cron.ts:284-303` writes `status: COMPLETED, completedAt` and emits `CHECK_IN_COMPLETED`,
  then calls `recordRoundCompletion`. It does not call `scoreSessionSpecificity`,
  `extractRecordEntries`, `anchorRecordToDocuments`, any of the extractors, `buildSoloArtifact`,
  `this.usage.emit(CHECK_IN_COMPLETED)`, or `ensureNextSession` — all of which `complete()` does at
  `conversation.service.ts:3197-3251`. `grep -rn ensureNextSession api/src` returns three hits: the
  definition, `conversation.service.ts:3245`, `entry.service.ts:1594`.
- The consequence chain is exact: the person who abandoned is stamped complete with an empty record,
  counted present in a report built without their content, and left with **no session N+1**, so the
  next round can never complete either.

And the two repairs that exist do not reach either case:

- `synthesisBackstop` (`grounds.cron.ts:639-684`) hardcodes `sessionNumber: 1` and filters
  `report: { is: null }`, so a failed release on session 5 of a ground that already has a session-1
  report is permanent (P4-C09).
- When it does fire, it re-emits `CHECK_IN_COMPLETED`, and `reports.listener.ts:36` calls
  `notifyAdminOnCheckIn` unconditionally — so the repair re-sends "X has checked in" (P4-C11).

**The change.**

1. **One definition of an answered party.** Add
   `api/src/modules/grounds/an-answer-includes-a-refusal.ts` exporting
   `AN_ANSWER = [CheckInStatus.COMPLETED, CheckInStatus.DECLINED]` with the docstring naming the
   frozen-round incident. Use it in `isSessionReadyForReport` (`:4304`) and in `round-completion.ts`
   (`:41`). `getSessionProgress` already agrees; point it at the constant so all three read one
   line. A round releases when everybody has answered; the report already names the decline via
   `declinedParticipantIds`, so nothing is claimed that was not said.
2. **P2-021, decline mid-session.** `decline()` at `conversation.service.ts:5008-5013` routes through
   `loadOwnedOpenCheckIn`, which permits IN_PROGRESS, and writes DECLINED with no `closedReason`,
   losing the turns already written. Two parts: write
   `closedReason: 'willingness_declined'` (the literal the schema documents at `schema.prisma:1207`),
   and when `checkIn.status === IN_PROGRESS`, run the record extraction that `complete()` runs before
   marking DECLINED — what they already said is theirs and belongs in their private record. If that
   is too much for one sitting, at minimum refuse the decline on IN_PROGRESS with a message offering
   completion instead, so no work is silently discarded.
3. **P2-022, the willingness gate.** `CheckInStatus.DECLINED` is read in three places and written in
   one. The board chip at `board.service.ts:517` names a case nothing produces. Either wire the
   willingness "no" answer to `decline()` — same call, same reason string — or delete the chip. It
   should be the wiring: the schema's own `closedReason` literal says that was the intent.
4. **P2-004 / P4-C02, the auto-close.** `autoCloseStaleCheckIns` must stop being a second completion.
   Extract the tail of `complete()` — from specificity scoring at `conversation.service.ts:3116`
   through `ensureNextSession` at `:3245` — into
   `conversation.service.ts#finishTheSession(checkInId, { by: 'the person' | 'the clock' })`, and
   call it from both. The cron's only remaining job is deciding *which* check-ins are stale. The
   `by` flag controls two things and nothing else: the record carries that the clock closed it, and
   the shared report's per-person line says so rather than presenting silence as an account.
   Also emit the usage event on this path (`this.usage.emit(UsageEventType.CHECK_IN_COMPLETED)`),
   which is the 125-row gap Batch 9 is otherwise chasing.
5. **P4-C09.** In `synthesisBackstop`, replace the hardcoded `sessionNumber: 1` and the
   `report: { is: null }` filter with: for each non-terminal ground, take the highest session number
   for which every answering party has answered, and compare it against
   `ReportRound`/`Report.releasedAt` for that session. Re-emit only where a round is answered and
   unreleased. Keep the advisory lock.
6. **P4-C11.** Add `source?: 'repair'` to `CheckInCompletedEvent` (the auto-close path already
   passes an untyped `source: 'auto-close'` at `grounds.cron.ts:297` — type it), and have
   `reports.listener.ts:36` skip `notifyAdminOnCheckIn` when `source === 'repair'`. A repair is not
   news to the admin.

**Migration.** None. `closedReason` already exists.

**Data already written.** Yes, and it matters most here. Every ground currently frozen by a decline
should be reprocessed: after the change, re-run `recordRoundCompletion` for each open round. Every
auto-closed check-in should be re-run through `finishTheSession` so its record is extracted and its
next session exists — that is a one-off script over `CheckIn` rows whose `completedAt` has no
matching `RecordEntry`. Free to do; nobody has read these.

**Spec.** `a-decline-is-an-answer.spec.ts` — a two-party ground, one declines, the round completes,
the report releases and names the decline, and the same holds on session 2.
`the-clock-closing-a-session-does-what-a-person-closing-it-does.spec.ts` — auto-close and
`complete()` leave a check-in in states that differ only in `closedReason`/source: same record
entries extracted, same specificity written, same next session created, same usage event emitted.

**Effort.** More than a day. The `finishTheSession` extraction is the bulk of it.

**Risk.** Medium-high, and this is the batch to review most carefully. Releasing rounds that were
frozen will fire report synthesis and "your report is ready" emails across a large slice of our own
data — run the reprocessing with email sending disabled. The extraction refactor touches the single
hottest method in the codebase; keep the public signature of `complete()` unchanged and let the
existing specs be the safety net.

---

## Batch 3 — The door people actually use has no lock and no meter

**Closes:** P2-003, P2-015, P4-003, P4-B06

**The one cause.** There are four ways into one conversation and the guards were added to one of
them. Verified side by side:

- `sendMessage` (`conversation.service.ts:824-829`) calls `loadOwnedOpenCheckIn`, then
  `assertGroundAcceptsInput(checkIn.groundId)`, then refuses COMPLETED.
- `sendMessageStream` (`:1178-1181`) calls `loadOwnedCheckIn` — the permissive loader — and refuses
  only COMPLETED. **No `assertGroundAcceptsInput` anywhere in the stream path.** The guard's own
  docstring at `:757-770` says "A hold that keeps accepting answers is not a hold", and the client
  posts to the stream route.
- Neither message path meters. All metering is in `open()` at `:630-660`; `sendMessage` and
  `sendMessageStream` flip NOT_STARTED to IN_PROGRESS themselves (`:1029-1030`, `:1346-1347`) with
  no billing call. A client that posts an answer without calling `open()` runs a whole session free.
- P4-003: `whatsapp.controller.ts:100-104` is the same shape one layer up — a `NOT_STARTED` check-in
  gets `open()` with the person's text dropped, and every failure is swallowed into
  `{received: true}`. The transport-specific half of this belongs to the WhatsApp slice; the half
  that belongs here is that `open()` is the only metered door and every other caller has to
  remember to knock on it first.
- P4-B06: `joinPreview`/`joinConfirm` in `entry.service.ts:1874-1964` never read `ground.status`, so
  a join link on a CLOSED ground signs somebody up and gives them a session on a finished check-in.

**The change.**

1. Make the guard unavoidable rather than remembered. Add a single private
   `conversation.service.ts#openTheDoor(checkInId, userId): Promise<CheckIn>` that does, in order:
   `loadOwnedOpenCheckIn`, `assertGroundAcceptsInput`, the COMPLETED refusal, and the metering
   claim. Call it as the first line of `open()`, `sendMessage()` and `sendMessageStream()`. Delete
   the three hand-rolled preambles. The metering claim is idempotent per `(checkInId)` — see
   Batch 4, which gives it the unique row it needs — so calling it from all three is correct, not a
   triple charge.
2. `entry.service.ts` join preview and accept: read `ground.status` and refuse with
   `howItEnded(status, endStateLabel)` from `a-ground-that-has-ended.ts:24`, which already writes
   the sentence. Both current error strings claim an expiry the token does not have; replace them
   with the real reason.
3. P4-003, the part that is not WhatsApp transport: once `openTheDoor` exists, the controller's
   `NOT_STARTED ? open() : sendMessage(text)` ternary has no reason to exist — `sendMessage` can be
   called on a NOT_STARTED check-in and will meter correctly. Collapse the ternary to a single
   `sendMessage(checkInId, userId, text)` call. The person's first message stops being discarded as
   a side effect of the guard fix. (The silent-catch half stays with the WhatsApp slice.)

**Migration.** None of its own; depends on Batch 4's unique row.

**Data already written.** Any turns recorded on a PAUSED or CLOSED ground through the stream route
are records the product told the parties could not exist. Query
`ConversationTurn` joined to grounds in a non-open status with `createdAt` after the ground's
`pausedAt`/`closedAt`, and review them by hand — there will be few, and deleting them silently
would be its own data-integrity fault.

**Spec.** `every-door-into-a-session-asks-the-same-questions.spec.ts` — a table-driven spec over
`open`, `sendMessage`, `sendMessageStream`: each refuses a PAUSED ground, a CLOSED ground, a
DECLINED check-in and a COMPLETED check-in with the same message, and each meters exactly once for
one session. `a-finished-check-in-cannot-be-joined.spec.ts` for the join path.

**Effort.** Half-day, once Batch 4 lands. Sequence Batch 4 first.

**Risk.** Low. Every change narrows what is accepted. The one thing to watch: `loadOwnedCheckIn` was
chosen for the stream path deliberately at some point; confirm no legitimate caller relies on
streaming into a DECLINED check-in (nothing does — DECLINED is absorbing at `:5261`).

---

## Batch 4 — Two of everything, because nothing is written once

**Closes:** P2-016, P2-017, P2-018, P2-028, P4-D01, P4-D02

**The one cause.** `grep -Fn 'transaction' api/src/modules/conversation/conversation.service.ts`
over 5,297 lines returns one hit and it is a comment at `:4832`. There is no `$transaction` and no
advisory lock in the conversation module, `CheckIn` has no `version` and no `updatedAt`, and every
create-if-absent is a look-then-create. Verified:

- `complete()` at `:3197-3206` has no status predicate in its `where`; the only check is the
  in-memory read at `:3014`. Two concurrent completes run all twelve extractors twice and emit
  `CHECK_IN_COMPLETED` twice, double-firing the report builder and the webhook queue.
- `clarify` (`:5069`), `correctSession` (`:5166`) and `createNextIfAbsent` (`:3417`) each compute
  `last + 1` then `create`, against `@@unique([participantId, sessionNumber])`
  (`schema.prisma:1255`), with no catch on P2002. On `createNextIfAbsent` that 500 throws out of
  `complete()` — a server error at the exact moment the person's work is being saved.
- The turn pair at `:855` / `:1017` is unwound by a hand-written
  `conversationTurn.delete(...).catch(() => undefined)` at `:1025`. If the process dies rather than
  throwing, the person's turn is orphaned with no reply.
- `beginClosingSession` (`grounds.service.ts:2943-2972`) loops over participants doing
  findFirst-then-create per person, with no transaction — a retry creates a **second final session
  per person** — and iterates `ground.participants` with no filter, so managing-only leads and
  people who never joined are each given a closing session, which then holds the closing round
  permanently unready (P4-D02).
- `IdempotencyService` (`public-api/idempotency.service.ts:9, 35`) promises in its own docstring
  that "A RETRY MUST BE INDISTINGUISHABLE FROM THE ORIGINAL CALL", is opt-in on a header, and is
  wired to 2 of roughly 40 mutating routes.

**The change.**

1. **One helper, used everywhere a session is created.**
   `conversation.service.ts#createSessionOnce(participantId, sessionNumber, data)` wraps the create
   in `try/catch` on Prisma `P2002` and, on collision, returns the existing row. Point
   `clarify`, `correctSession`, `createNextIfAbsent` and `beginClosingSession` at it. A double click
   produces one session, which is what the unique index was for.
2. **Guard the completion in the `where`, not in memory.** Change `complete()`'s write at `:3197` to
   `prisma.checkIn.updateMany({ where: { id, status: { not: COMPLETED } }, data: {...} })` and
   branch on `count === 0` — return the already-complete response instead of running the extractors
   and emitting. The extractors and the event must move *after* the winning write, not before it.
3. **`beginClosingSession`:** filter the loop to the same active-party set the release rule uses
   (`managingOnly: false` and `userId != null` or a live invite — the clause is already written
   twice, at `grounds.service.ts:4287-4297` and `:4374-4397`; lift it into
   `grounds/who-is-still-expected.ts` and call it from all three). Wrap the whole loop in
   `prisma.$transaction`. Make the route idempotent by checking for an existing `isFinal` session
   before creating.
4. **The turn pair.** Write the person's turn and the AI turn in one `$transaction` where the shape
   allows (non-streaming), and for the streaming path, where the AI turn genuinely cannot be written
   until the stream ends, keep the compensating delete but add a startup sweep that finds
   PERSON turns older than an hour with no following AI turn on the same check-in and logs them with
   a count. Silent orphans are the problem; a counter is most of the fix.
5. **P2-028:** make idempotency the default rather than the exception. In `IdempotencyService.run`,
   when no `Idempotency-Key` header is present, derive one from
   `(credentialId, method, path, sha256(body))` instead of returning `work()` unguarded, and put the
   record write and `work()` in one transaction. Add a daily prune of `IdempotencyRecord` rows older
   than 48 hours — nothing deletes them today.

**Migration.** None. Every unique index this relies on already exists.

**Data already written.** Duplicate record entries, dependencies and objectives from double
completes are already in the database. After the fix, run a dedupe over `RecordEntry` grouped by
`(checkInId, type, text)` and over `GroundDependency`/`GroundObjective` by their natural key, then
re-synthesise the affected reports. Cheap; ours.

**Spec.** `a-session-completes-once-however-many-times-you-press-it.spec.ts` — fire `complete()`
twice concurrently, assert one set of record entries and one `CHECK_IN_COMPLETED`.
`beginning-the-closing-session-twice-is-beginning-it-once.spec.ts` — call it twice, assert one final
session per answering party and none for a managing-only lead.

**Effort.** Day.

**Risk.** Medium. Moving the extractors after the guarded write changes the order of a long method;
the risk is an extractor that reads `checkIn.status` and now sees COMPLETED. Grep the twelve
extractors for status reads before reordering. The idempotency default is the riskiest single change
— a body-hash key will collide on two genuinely-intended identical calls (e.g. two identical
`POST /people` for two different people with the same name), so scope the derived key to routes that
are true upserts and leave `POST /subjects/bulk` on the explicit header.

---

## Batch 5 — One keyword count wearing five hats, and its bottom band is upside down

**Closes:** P3-001, P3-002, P3-003, P3-004, P3-011, P3-015, P3-021

**The one cause.** Every confidence and specificity label a customer reads traces to
`runIntake()` in `conversation/intake.ts:115-130` — a substring count of English keywords and five
regexes — and then that one float is mapped, ranked and banded by four functions that disagree with
each other. Verified end to end:

- `mapSpecificityLevel` (`conversation.service.ts:151-156`) returns `specific >= 0.6`,
  `directional >= 0.35`, `vague >= 0.15`, else `managed`. The report ranks
  `{ vague: 0, directional: 1, managed: 2, specific: 3 }` (`reports.service.ts:1308`). **So the
  lowest possible score maps to `managed`, which ranks 2 — above `directional` at 1.** A person who
  said almost nothing outranks a person who gave a directional answer.
- The zero-turn default at `conversation.service.ts:3468-3470` returns `level: 'vague'` (rank 0)
  while writing all five dimensions as `'managed'` (rank 2). One function, two verdicts about the
  same nothing.
- `mapRecallConfidence` (`:159-162`) takes **`avgSpecificity`** as its input — the same number,
  at `:3488`. `CheckIn.recallConfidence` is not a recall measurement; it is specificity under a
  second name, and the report presents the two as independent corroboration.
- `howClear()` (`reports/the-session-report.ts:616-633`) branches on `'HIGH'|'high'` and
  `'LOW'|'low'`. The writer only ever emits `specific|directional|vague|managed` and
  `certain|mostly_certain|uncertain`. **Every shared report falls through to the middle branch** and
  prints "What people said was specific in places and general in others" regardless of the score,
  and the recall clause at `:627-632` is always the empty string.
- `confidenceInThePicture(scoredSessions, meanLevel)` (`reports/confidence-in-the-picture.ts:42-49`)
  tests `scoredSessions` only against zero and never reads it again. One scored session and twenty
  produce the identical "well covered" sentence.
- `reports.service.ts:1304-1307` selects `specificityLevel: { not: null }` and ranks with `?? 0`, so
  a scoring failure — `scoreSessionSpecificity(...).catch(() => null)` at `:3116`, writing null at
  `:3201` — silently leaves the denominator, and if every score failed the report prints "Nothing
  has been scored here yet, so this part of the picture has not been built rather than being empty"
  about a ground where everybody answered.

**The change.** Collapse this to one enum, one rank, one writer.

1. Add `SpecificityLevel` as a real Prisma enum (`MANAGED | VAGUE | DIRECTIONAL | SPECIFIC`, declared
   in that order so the enum's own ordinal *is* the rank) and change
   `CheckIn.specificityLevel` from `String?` to that enum. Delete the `RANK` map at
   `reports.service.ts:1308` and rank by enum position. This closes P3-001 and P3-015 together: the
   inversion and the un-enumerated column are the same defect.
2. **P3-002.** Either measure recall or stop claiming it. Measure it: `RecordEntry` already carries
   `recallBased` and `anchoredOrigin`, and `the-session-report.ts:506-507` already counts them.
   Change `mapRecallConfidence` to take `documentedEntries / totalEntries` for the session, not
   `avgSpecificity`. If that cannot be done in this sitting, delete `CheckIn.recallConfidence` and
   the sentence it feeds — a number that is another number under a false name is worse than no
   number. **Where the number should come from: `RecordEntry.recallBased` / `anchoredOrigin` counts
   for that check-in.**
3. **P3-003.** Rewrite `howClear()` to switch on the enum. Three reachable sentences, one per band,
   plus the not-scored-yet case. Add the same fix to the client component that mirrors it. This is a
   fifteen-minute change that has been printing one constant sentence on every shared report.
4. **P3-004.** `scoreSessionSpecificity(...).catch(() => null)` must not be silent. Log at error with
   the checkInId, increment a counter, and — this is the important half — distinguish the two states
   in the data. Add `CheckIn.specificityScoredAt DateTime?`. "Not scored yet" is
   `specificityScoredAt == null`; "scoring failed" is `specificityScoredAt != null && level == null`.
   `confidenceInThePicture` gets a third branch that says the scoring did not run, not that nobody
   was asked.
5. **P3-011.** Make `confidenceInThePicture` actually read `scoredSessions`: cap the band at
   `partly covered` when `scoredSessions < 2`. One session is not a picture. The function already
   takes the parameter; it just has to use it.
6. **P3-021.** Nothing in the product says these labels are heuristic, and nothing says a model
   produced them either. Put the provenance in the sentence: where the report prints a confidence
   band, the sub-line should say what it was read from ("read from how much of what was said could
   be checked against a date, a number or a named piece of work"). No harm today with no customers,
   but the moment there is one, an English keyword count presented in the grammar of an assessment
   is the finding that will not survive being explained.

**Migration.** Yes — `specificityLevel` String → enum, plus `specificityScoredAt DateTime?`. The
enum change needs a data step because existing rows hold the lowercase strings.

**Data already written.** Every `specificityLevel`, every `recallConfidence`, and every report band
derived from them is wrong or meaningless. Re-run `scoreSessionSpecificity` over every COMPLETED
check-in and re-synthesise. No customer has read any of it.

**Spec.** `a-worse-session-scores-lower.spec.ts` — a property test over the four levels asserting the
rank is monotonic in the score, including the zero-turn default.
`the-clarity-sentence-changes-with-the-score.spec.ts` — assert three distinct sentences over the
four bands, which today is one sentence over all four.
`a-score-that-did-not-run-is-not-a-fact-about-the-ground.spec.ts` — a failed scorer produces the
scoring-failed sentence, not "nobody has been asked".

**Effort.** Day.

**Risk.** Low on the code, medium on the output. Every band on every report will move. That is the
point, but check a handful of re-synthesised reports by eye before running the full reprocess — the
`managed` band going from rank 2 to rank 0 will drag some reports from "well covered" to "thin",
correctly, and it should read as a truer report rather than a broken one.

---

## Batch 6 — Numbers labelled "this session" that are lifetime numbers, and one sentence with eight computations

**Closes:** P3-007, P3-008, P3-009, P3-010, P3-017

**The one cause.** Nothing owns a session-scoped count, so each surface computes its own and each
picks a different population. Verified:

- **P3-009, the session predicate that is not there.** `reports.service.ts:2059-2065` reads
  `groundObjective.findMany({ where: { groundId, target: { not: null } } })` and
  `groundDependency.count({ where: { groundId, status: 'BLOCKING' } })` — **no `sessionNumber`, no
  `clearedAt`** — and hands them to `theSessionReport` as `movedOnTargets`, `blocked`, `waiting`,
  under a page headed by a session number and a sub-line at `the-session-report.ts:421` that says
  "this session". A dependency raised in session 1 is on session 12's report as a current blocker.
  `prevCount` is `@default(0)` (`schema.prisma:1399`), so an objective never snapshotted reports its
  whole lifetime as this session's movement.
- **P3-007, two computations of four tiles.** `board.service.ts:582` takes the engine's `atAGlance`
  when it is non-empty and otherwise recomputes locally at `:585-635`. Three of the four differ:
  Movement — the engine filters `target != null` (`reports.service.ts:2060`), the fallback does not
  (`board.service.ts:589`); Blockers — the engine falls back to "n waiting", the fallback counts
  BLOCKING only; How much was said — the engine renders a percentage, the fallback renders
  `eng.coverage ?? 'unknown'`. The engine's own header comment at `the-session-report.ts:113-115`
  says the two surfaces must agree. Separately, `board.service.ts:552` drops self-blocks from the
  dependency *list* and neither tile path applies that filter, so a self-block increments Blockers
  while being invisible underneath it.
- **P3-010, one score over two populations.** `reports.service.ts:1966-1968`:
  `readableParticipantIds` is the whole ground after release or for a lead, and **just the viewer
  otherwise**; entries are read with that filter at `:1972`. But `ofPeople` at `:2118` is
  `ground.participants.filter(p => !p.managingOnly).length` — everybody. So before release, a
  participant's confidence score divides their own lines by everybody's head count, and falls as
  more people are invited. Same for the "of what was said is anchored to a document" sub-line.
- **P3-008, eight computations of "n of m answered"** over four denominators, listed in the register.
- **P3-017.** `the-session-report.ts:200-201, 213-214`: `agreed`/`stillOpen` are array lengths;
  `settled[]`/`open[]` are the same arrays through `.filter(Boolean)`. The filter shortens the list
  without changing the count, so "4 still open" can sit above a list of 2.

**The change.**

1. **Give the session count an owner.** New `api/src/modules/reports/what-this-session-holds.ts`,
   exporting one function that takes `(groundId, sessionNumber)` and returns the whole tile set:
   `{ divergences, movedOnTargets, blocked, waiting, documentedPct }`, each with the session
   predicate applied — dependencies filtered by the session they were raised in and
   `clearedAt: null`, objectives by a snapshot for that session. Call it from
   `reports.service.ts:2059` and from `board.service.ts:582` **unconditionally**, deleting the
   local recompute at `:585-635` entirely. The fallback exists because the engine sometimes returns
   nothing; the right answer to that is for the tile function to return the tiles, empty states
   included, rather than for a second implementation to guess.
2. **`GroundObjective` needs a per-session snapshot.** `prevCount @default(0)` cannot express "not
   snapshotted", so movement is unfalsifiable. Add `GroundObjectiveSnapshot(objectiveId,
   sessionNumber, count)` written at each round completion, and compute movement as
   `count(session N) - count(session N-1)`, returning null — not zero, not the lifetime total —
   when there is no N-1 row. **Where the number should come from: the difference between two
   snapshots, and nothing at all when there is only one.**
3. **`GroundDependency` needs its session.** It has no `sessionNumber`. Add one, written from the
   check-in that raised it, so "blockers this session" can mean what it says.
4. **P3-010.** Inside `howMuchThereIsToGoOn`, both terms must come from one population. Compute
   `saidInAll` over the **whole session**, not the reader's slice — the confidence score is a
   statement about the record, not about what this reader may read. The reader-scoping stays where it
   belongs, on the entries that are *rendered*. Add an assertion in the function that
   `documented <= saidInAll` and `answered <= ofPeople`.
5. **P3-008.** One function, `reports/how-many-have-answered.ts`, taking the ground and a session and
   returning `{ answered, expected, waitingOn[] }`, using the active-party clause from Batch 4
   step 3. Delete the seven other computations, including the three client-side ones — the client
   should render a number the server sent, never derive one. `OrgMembersPage.tsx:653`'s `?? 1`
   default is the clearest case: a defaulted numerator in a count presented as a fact.
6. **P3-017.** In `the-session-report.ts:200-214`, filter first and count the filtered array. Two
   lines.

**Migration.** Yes: `GroundDependency.sessionNumber Int?` and a new `GroundObjectiveSnapshot` table.

**Data already written.** Every released report's tiles are wrong. Backfill `sessionNumber` on
existing dependencies from their source check-in where one is recorded, leave null where it is not
(and treat null as "not this session"). Snapshots cannot be reconstructed for the past — report
movement as null for every session before the change, which is honest, and re-synthesise.

**Spec.** `a-blocker-from-session-one-is-not-a-blocker-in-session-twelve.spec.ts`.
`the-board-and-the-report-count-the-same-things.spec.ts` — build one ground and assert the four
tiles are identical from both surfaces, with and without an engine `atAGlance`.
`the-list-under-a-count-has-that-many-things-in-it.spec.ts`.
`n-of-m-is-computed-once.spec.ts` — a grep-style spec asserting only one module computes it, in the
style of the existing naming guards.

**Effort.** More than a day.

**Risk.** Medium. Deleting the board's fallback is the sharp edge: if the engine returns nothing on
some ground shape today, that board goes blank instead of showing computed-a-second-way tiles. Cover
that by making the tile function return explicit empty states first, and verify against a thin
ground (Batch 17 has the query for finding one).

---

## Batch 7 — The report somebody read is the report that is saved

**Closes:** P6-001

**The one cause, exactly as found.** The anonymous entry report has nine fields — the schema at
`entry.service.ts:307` requires `whatGroundworkSaw, alignmentStatus, alignmentBasis,
areasRequiringAlignment, alignmentReached, honestClose, mentionedPeople, suggestedParties,
yourRole`. `EntryReportSummaryDto` (`entry.controller.ts:114-120`) declares **two**:
`alignmentStatus` and `whatGroundworkSaw`. And the merge at `entry.service.ts:402-403` rebuilds the
report as a single-key object:

```ts
if (!merged.report && merged.reportSummary?.whatGroundworkSaw) {
  merged.report = { whatGroundworkSaw: merged.reportSummary.whatGroundworkSaw };
}
```

That one-key object is what `entry.service.ts:1624-1628` writes to `CheckIn.sessionReport`. The
controller comment at `:105-113` states the client has sent `reportSummary` rather than `report`
since commit e078b0d — so this is the path **every** real commit takes. Seven of nine fields are
shown to the person and dropped at the moment they create an account. The comment at
`entry.service.ts:1615-1623` records that "the report looks nothing like what I got at the end" was
reported four times, and `the-report-you-read-is-kept.spec.ts` is named for exactly this rule and
does not catch it.

**The change.**

1. Widen `EntryReportSummaryDto` to all nine fields, typed and validated the way the schema at
   `entry.service.ts:307` describes them — the two string arrays get `@IsArray() @IsString({each:
   true})` and an `@ArrayMaxSize`, the free text gets `@MaxLength`. Keep `alignmentStatus`'s
   `@IsIn`.
2. Replace the reconstruction at `:402-403` with a pass-through:
   `if (!merged.report && merged.reportSummary) merged.report = merged.reportSummary;`. The narrowing
   was there because the DTO was narrow; once the DTO carries the report, nothing needs rebuilding.
3. The client is already sending it or is not — check `EntryChatPage`'s commit payload and send the
   whole report object. Do not add a second field name.
4. Strengthen `the-report-you-read-is-kept.spec.ts` rather than writing a new file: it should assert
   field-by-field equality between the report the entry chat rendered and
   `CheckIn.sessionReport`, over all nine keys, so a tenth field added later fails the spec until
   it is carried.

**Migration.** None. `CheckIn.sessionReport` is Json.

**Data already written.** Yes, and it is unrecoverable — the seven dropped fields were never
persisted anywhere. Every entry-path `CheckIn.sessionReport` in the database holds one key. Nothing
to backfill; the model output is gone. The one mitigation worth doing: `sessionReport` is read
downstream at `conversation.service.ts:4930, 4940` to ground session 2, so those second sessions
were thinner than they should have been. Nobody has read them; leave them.

**Spec.** As above — extend the existing sentence-named spec. Adding a second file here would be the
wrong shape, because the rule already has a name.

**Effort.** Hours.

**Risk.** Very low. The DTO widening can only accept more; the pass-through can only store more. The
one thing to check is `forbidNonWhitelisted` on the global ValidationPipe — a field the client sends
that the DTO does not declare returns 400, which is the exact failure the comment at
`entry.controller.ts:107-113` records happening before. Enumerate the client's payload keys against
the DTO before shipping.

---

## Batch 8 — Failures that are written down as facts

**Closes:** P3-012, P3-013, P3-014, P4-C03, P4-C04, P4-C05, P4-C07, P4-C08

**The one cause.** A processing failure is caught and the product carries on presenting the result
as though it succeeded. Eight instances, all verified, all the same shape:

- `assistant/a-commitment-carries-past-the-ground.ts:59` — `} catch { return false; }` around the
  commitment upsert. No logger, no counter, no user signal. It is the one bare swallowing catch on a
  write path in `api/src/modules` with zero instrumentation, on the object the accountability
  product exists to carry.
- `documents/documents.service.ts:359` — a spreadsheet that fails to parse returns the string
  `` `[Attached: ${fileName} - could not parse spreadsheet.]` ``, and that string is persisted as
  `content` at `:311` and passed to `assessDocument` and `decideOrigin` at `:295-296`. A document
  whose whole text is an apology becomes a corroborating source.
- `JSON.parse(participant.soloArtifact)` in a `try { } catch { return null }` IIFE at
  `reports.service.ts:3577` and `:3706`, `grounds.service.ts:4519` — three copies (the register said
  four; there are three in non-spec code plus an unguarded parse at
  `conversation.service.ts:4972`, which is worse: it throws). A corrupt private record renders as no
  private record and the report proceeds as though the person wrote nothing.
- `reports.service.ts:1116-1131` — `liftedRunIn` detects an eight-word verbatim run from one
  person's private record, and it is applied **only to `sharedPicture`** and only as a retry
  trigger. The acceptance test at `:1165` is `faultsIn(secondPass).length < faults.length`, so a
  second pass that fixes a tally and keeps the lift ships; if the second pass is no better the first
  is kept, lift and all (`:1167`). `agreements`, `divergences` and `centralQuestion` are never
  scanned.
- `reports.service.ts:1188-1193` — when a severe fault survives two passes, `sharedPicture` is
  silently replaced with **the previous report row's picture**, dated today, with only a log line.
- `reports.service.ts:1057-1064` — the brevity retry calls `this.anthropic.extract` with **no
  `.catch`**, so a cosmetic length pass can throw out of a synthesis that already succeeded and the
  release never happens.
- `reports.listener.ts:89-91` — one catch around the whole release block, logging and nothing else.
  The participant sees "complete", the lead sees no report, nothing says why.
- The Slack "a report is ready" notice fires before the all-emails-failed check that leaves the
  report unreleased.

**The change.** One rule, applied eight times: **a failure either reaches a person or is counted.**

1. `a-commitment-carries-past-the-ground.ts:59` — take a logger, log at error with the
   `personObjectiveId`, and return the failure to the caller so the check-in's own "what you
   committed to" line can say it was not recorded.
2. `documents.service.ts` — a failed parse throws a `BadRequestException` to the uploader with the
   filename and the reason. It must not reach `create`. The two placeholder strings at `:358-359`
   stop being content and become the exception message.
3. `soloArtifact` — one exported helper,
   `reports/a-private-record-that-cannot-be-read.ts#readSoloArtifact(raw)`, returning
   `{ ok: true, artifact } | { ok: false }`. All four sites call it, and each renders "this private
   record could not be read" rather than nothing. Also fix the unguarded parse at
   `conversation.service.ts:4972`.
4. **P4-C03.** Run `liftedRunIn` over `agreements`, `divergences` and `centralQuestion` as well as
   `sharedPicture`, and make a lift a **blocking** fault, not a retry-scored one: change the
   acceptance at `:1165` from "fewer faults" to "no lift, and not more of anything else". If two
   passes cannot produce a lift-free picture, the field ships empty with the amendment machinery
   saying the picture did not move — the same route P4-C04 already takes for severe faults. The
   file's own comment says a long lifted phrase identifies its author as surely as a name.
5. **P4-C04.** Keep the previous-picture fallback — there genuinely is nothing better — but stop
   dating it today. Carry `sharedPictureFrom: sessionNumber` on the report row and render "this
   picture is unchanged from session N" wherever the picture appears. A picture silently re-dated is
   the reader being told something happened.
6. **P4-C05.** Add `.catch(() => null)` to the brevity retry at `:1059` and keep `result` when it
   returns null. A length pass must never destroy a synthesis.
7. **P4-C07 / P4-C08.** In `reports.listener.ts`, record the failure instead of only logging it:
   write a `Report.lastReleaseError` (text + timestamp), and have the ground page show the lead "the
   report for session N did not finish building — it will be retried" rather than nothing. Move the
   Slack send to after the all-emails-failed check.

**Migration.** Yes, small: `Report.sharedPictureFrom Int?`, `Report.lastReleaseError String?`,
`Report.lastReleaseErrorAt DateTime?`.

**Data already written.** Documents whose content is a parse-failure apology are in the database and
have been grounded on. Find them —
`SELECT id, groundId FROM ground_documents WHERE content LIKE '[Attached:%could not parse%'` — delete
them and re-synthesise the affected grounds. Reports that shipped a lifted run cannot be detected
retrospectively without re-running the detector; do that as part of the reprocess and re-synthesise
any that trip it.

**Spec.** `a-document-we-could-not-read-is-not-a-source.spec.ts`.
`nobodys-words-reach-the-shared-report-verbatim.spec.ts` — feed a private record and assert no
eight-word run appears in any of the four fields, not just `sharedPicture`.
`a-length-pass-cannot-lose-a-report.spec.ts`.
`a-private-record-that-cannot-be-read-says-so.spec.ts`.

**Effort.** Day.

**Risk.** Medium. Making a lift blocking will empty `sharedPicture` on some grounds that ship a
picture today — that is correct (the promise is on the marketing site and in the file's own comment)
but it is a visible change, so check how the report renders an empty picture before shipping. The
document-parse exception is a new 4xx on upload; verify the client shows the message.

---

## Batch 9 — The platform panel counts three different objects and calls them all check-ins

**Closes:** P3-005, P3-006, P3-016, P3-023, P6-012, P7-003, P7-004

**The one cause.** The staff console is implemented twice by two services and neither filters
anything. Verified:

- `prompts.service.ts:445-450`, one `Promise.all`, three tables:
  `totalCheckIns = checkIn.count({ where: { status: 'COMPLETED' } })`;
  `groundsCreated = ground.count()`; `usageEvents = usageEvent.groupBy({ by: ['type'] })`.
  `AdminPage.tsx:715-717` renders them as **"Check-ins completed" 484 / "Check-ins created" 243 /
  "Reports generated"**, and `:748-754` renders the event totals including "Check In Completed" 359.
  The middle tile has never counted check-ins — it counts grounds. 243 × 2 ≈ 484 is the grain
  mismatch, not a funnel.
- The 125 gap between 484 and 359 is structural: `UsageEventType.CHECK_IN_COMPLETED` is emitted only
  at `conversation.service.ts:3206`, while `status = COMPLETED` is written in three places (that
  line, `grounds.cron.ts:286`, and the 4 AM backstop path). The missing population is precisely the
  auto-closed people — the group an ops dashboard most needs. **Batch 2 step 4 closes the emission
  gap; this batch stops the label lying about what is counted.**
- None of the three queries filters `organizationId`, `deletedAt`, a demo flag, or `isSetup`.
  `schema.prisma:1189-1191` states that a setup conversation "is NOT an account and must never be
  counted as one" and that it is excluded "in six places"; `isSetup` is filtered in exactly one read
  (`grounds.service.ts:1105`) and `grep -c isSetup api/src/modules/prompts/prompts.service.ts`
  returns 0.
- `session2Rate` (`prompts.service.ts:357`) divides session-2 check-ins by session-1 check-ins with
  no cohort matching, so the denominator includes people whose session 2 is not yet due. It reads
  permanently low and cannot reach 100.
- `prompts.service.ts:386` fetches `_count: { grounds: true }` and discards it; `:394`
  `participantCounts` is computed and never read; `byScenario.pct` is computed server-side at `:191`
  while `byStatus` percentages are computed client-side at `AdminPage.tsx:639`.
- `admin.service.ts:211-234` implements the same console a second time, and `:216` counts **Ground**
  rows behind a label containing "check-ins" — the other half of P7-003. Five admin routes
  (coaching, stats, feedback, usage, grounds/:groundId) are the unused half.
- Feedback is readable through three routes; the client calls two of them from one page
  (`AdminPage.tsx:778` and `:1252`).
- `AdminPage.tsx:573, 592, 612, 629, 645` render percentages and one-decimal means with no sample
  size and no date range anywhere on the panel.

**The change.**

1. **One counting module.** `api/src/modules/prompts/what-the-platform-has-actually-done.ts`, holding
   one `PLATFORM_WHERE = { isSetup: false, organization: { isInternal: false }, deletedAt: null }`
   in the shape of `api/src/common/seats.ts` — which P3-022 confirms is the pattern that works here,
   single-sourced and pinned by a spec. Every platform count goes through it.
   `Organization.isInternal` does not exist; add it, default false, and set it true on our own orgs.
2. **Label each tile for the object it counts.** "Check-ins created" becomes "Check-ins created", and
   its number becomes `ground.count(PLATFORM_WHERE)` renamed in the payload to `groundsCreated` →
   fine as is; the *label* is the bug. Read them as: sessions completed (`CheckIn` COMPLETED),
   check-ins created (`Ground`), reports released. Three different words for three different
   objects, per Batch 13.
3. **Delete the second console.** `admin.service.ts` `getPlatformStats`, `getDashboard`,
   `getUsagePatterns`, `getCoaching`, `getFeedback` and the `AdminDashboardPage` route at
   `App.tsx:511` are the unused half of P7-003 — except `GET /admin/coaching`, which P7-005 shows is
   the screen built to make the coaching-flag decision safe. Keep that one, wire it (Batch 12), and
   delete the other four routes and the page. Delete `GET /admin/feedback` (P7-004) and pick one of
   the two live feedback reads for `AdminPage`.
4. **P3-016.** `session2Rate` becomes a matched-cohort rate: denominator is session-1 check-ins whose
   session 2 was due more than the cadence interval ago. **Where the number should come from: the
   `CheckIn` rows for session 1 joined to their participant's session-2 `availableFrom`, counting
   only those whose window has opened.** Rename it in the payload to `session2RateOfThoseDue`.
5. **P3-023.** Delete the two dead queries at `prompts.service.ts:386` and `:394`. Move the
   client-side percentage at `AdminPage.tsx:639` server-side beside `byScenario.pct`.
6. **P6-012.** Every rate on that panel renders its denominator beside it ("62% of 34"), and the
   panel carries one date-range control that every query respects. Drop the decimal place on means
   over n < 30.

**Migration.** Yes: `Organization.isInternal Boolean @default(false)`.

**Data already written.** No customer-visible data is wrong — this is a staff panel. Set `isInternal`
on our own organisations by hand after the migration; with 224 orgs in the local database and no live
customers, effectively all of them are ours, which is itself the finding P3-006 makes.

**Spec.** `a-number-on-the-platform-panel-counts-one-kind-of-thing.spec.ts` — seed a setup
conversation, an internal org and a real org, and assert each tile counts only the real one and that
no two tiles counting different tables share a noun. `a-rate-carries-its-denominator.spec.ts`.

**Effort.** Day.

**Risk.** Low. Staff-only surface, and most of the work is deletion. The one care point is deleting
`AdminDashboardPage` — confirm nobody on the team has it bookmarked as their daily read before
removing the route.

---

## Batch 10 — One clock and one date format

**Closes:** P3-018, P3-019, P3-020

**The one cause.** Every cron in the codebase pins `{ timeZone: 'UTC' }` — `grounds.cron.ts:60, 114,
169, 209, 242, 319, 378, 391, 639, 693` — and the display layer pins nothing. Verified:

- `prompts.service.ts:449` and `:454` bucket the 14-day chart with
  `toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })` and **no `timeZone`**, against
  `completedAt` values stamped in UTC. On a non-UTC server the bars shift a day relative to every
  other figure on the same screen. It is the single server-local hole in an otherwise UTC-pinned
  codebase.
- Three date formats on report surfaces alone: `en-US` (`ReportPage.tsx:1018, 1419`), `en-GB`
  (`SessionReportPage.tsx:132`), browser locale (`TheSessionsReport.tsx:322-323`). Billing emails use
  `en-US` with a bare `$`. Exactly one server formatter pins a timezone:
  `one-email-however-many-people.ts:133`.
- `ops-settings.service.ts:19, 42-44` declares `display.timezone = 'Africa/Lagos'` with a note dated
  2026-09-05 explaining that "A board dated in a timezone nobody is in makes 'today' a different day
  for the person reading it". `grep -rn "display.timezone\|displayTimezone" api/src` returns
  **only those two declaration lines**. The decision was recorded and never wired.

**The change.**

1. `api/src/common/a-date-reads-the-same-everywhere.ts` — one server formatter taking a Date and a
   purpose (`'day' | 'dayAndMonth' | 'full'`), pinned to `en-GB` and to the org's display timezone,
   defaulting to the `display.timezone` setting. One client mirror in `client/src/lib/`. Every
   `toLocaleDateString` call site in the register's table goes through one of them. Include the
   billing emails; `$` and `en-US` in one email while the product speaks `en-GB` is the same defect.
2. Wire `display.timezone`: give `OpsSettingsService` a reader, have the formatter consult it, and
   have the board and the ops surfaces date themselves in it. The setting exists and has a written
   rationale; it needs one reader.
3. The 14-day chart buckets by `timeZone: 'UTC'` — or better, buckets in SQL by
   `date_trunc('day', completed_at AT TIME ZONE 'UTC')`, which is what the raw-SQL convention in
   this repo already requires.

**Migration.** None.

**Data already written.** No stored data is wrong — every column is UTC. Only rendering changes.

**Spec.** `one-date-format-everywhere.spec.ts` in the style of `one-word-and-it-is-session.spec.ts`:
grep the client and server source for `toLocaleDateString`/`toLocaleString` and fail on any call
outside the two formatter modules. That is the shape of guard this repo already uses for vocabulary,
and it is the only shape that stops this coming back.

**Effort.** Half-day.

**Risk.** Low. Cosmetic, and the naming-guard spec makes regression loud.

---

## Batch 11 — Closing is a one-way door that says nothing, and it mails everyone

**Closes:** P4-C06, P4-C10, P4-D03, P4-D04, P4-D05, P4-D06, P4-D07

**The one cause.** The closing flow was built as a sequence of independent writes, none of which
knows the ending is irreversible. Verified:

- **P4-D03.** `grep -rn isFinal api/src client/src` outside specs returns readers everywhere and
  exactly two writers, both in `beginClosingSession` (`grounds.service.ts:2959, 2967`), both setting
  it **true**. Nothing sets it false. There is no un-close route. And the confirm dialog does not say
  it is one-way.
- **P4-D04.** A ground can reach CLOSED with no closing synthesis, and the repair sweep at
  `reports.service.ts:4167-4201` requires `participants: { some: { checkIns: { some: { isFinal: true,
  status: COMPLETED } } } }` and then `accepted.every(p => p.checkIns.length > 0)` — so it skips
  exactly the grounds broken by a decline or an auto-close, which are the ones that fail. Batch 2's
  `AN_ANSWER` constant fixes this in the same place it fixes the release rule.
- **P4-D05.** `resolution.service.ts:295-308`, the close email:
  `participants: { select: { email: true } }` — every participant row, no filter. People who
  declined and people who never joined are mailed "your check-in has closed".
- **P4-D07.** `counterPropose` (`:265-283`) mails every other active party on every call, with no
  check for whether the proposed end state changed. Re-proposing the same end state re-mails
  everybody. It also deletes every existing confirmation each time (`:245-247`).
- **P4-D06.** The resolution panel's labels change the moment a button is pressed.
- **P4-C06.** `anthropic.extract` has no timeout while `respond` has ninety seconds — and `extract`
  is what every synthesis and every extractor uses.
- **P4-C10.** The board reports a transient server error as a permission problem.

**The change.**

1. **Say it is one-way, then make it not have to be.** First, the confirm on
   `beginClosingSession` says plainly: "This starts the last session for everyone. It cannot be
   undone." Second, add `POST /grounds/:id/cancel-closing` for the lead, which sets `isFinal = false`
   on every NOT_STARTED final session and deletes any it created that has no turns. A NOT_STARTED
   session with no content is safe to withdraw; an IN_PROGRESS one is not, and the route refuses if
   any final session has been started.
2. Point the closing-synthesis repair sweep at the `AN_ANSWER` constant from Batch 2, and drop the
   `report: { isNot: null }` prefilter so a ground with no report row at all can be repaired.
3. The close email and the counter-proposal email both go to the same set: parties who actually took
   part. Reuse `who-is-still-expected.ts` from Batch 4 step 3 — and for the close specifically,
   include people who declined (they were part of it and the ending concerns them) but exclude rows
   that never accepted an invite. Encode that choice in the helper's name, not at the call site.
4. `counterPropose`: if `proposedEndState === resolution.endState`, return `buildState` without
   deleting confirmations and without sending mail. Re-stating a position is not a new proposal.
5. P4-D06: the resolution panel's labels are fixed strings chosen from the ground's end-state set at
   render, not derived from the button just pressed.
6. P4-C06: give `anthropic.extract` the same ninety-second timeout `respond` has, in
   `anthropic.service.ts`. One line, and it is the call every extractor makes.
7. P4-C10: the board's error branch distinguishes 403 from 5xx and says "we could not load this just
   now" for the latter.

**Migration.** None.

**Data already written.** Grounds closed without a closing synthesis will be picked up by the
repaired sweep on its next hourly run. Nothing to backfill.

**Spec.** `a-closing-session-can-be-called-off-before-anybody-starts-it.spec.ts`.
`the-closing-email-goes-to-the-people-who-were-in-it.spec.ts` — assert a never-joined invitee gets
none and a declined party does. `saying-the-same-thing-twice-is-not-a-new-proposal.spec.ts`.

**Effort.** Day.

**Risk.** Low-medium. The email-recipient narrowing is the one to watch: verify against a real
multi-party ground that nobody who should hear about the close is dropped. The `extract` timeout
will turn some currently-hanging synthesis calls into thrown errors — which Batch 8 step 7 now
records rather than swallows, so sequence Batch 8 first or land them together.

---

## Batch 12 — Settings and columns that nothing can write

**Closes:** P3-022, P7-005, P7-006, P7-011, P7-012

**The one cause.** A row that only SQL can create is a hardcoded constant wearing a configuration
costume, and the codebase has six of them. All re-verified today:

- `PlatformSetting` holds four keys. Two (free ground limit, free member limit) have PATCH routes
  and an editing UI; the WhatsApp toggle has a route and a switch. `coaching_live`
  (`conversation.service.ts:56`, read at `:2439` and `admin.service.ts:83`) and
  `correction_window_days` (`the-window-for-correcting-a-record.ts:28`, read at
  `reports.service.ts:1795` and `conversation.service.ts:5100`) have **readers, no writer anywhere
  in `api/src`, and no UI**. One gates a shipped conversation capability; the other sets how long
  somebody has to correct their own record.
- `grep -rn "prisma.contributorBypass" api/src` → **0** non-spec references, and the schema comment
  at `:424-426` says so itself. `patternConfig` and `retentionPolicy` → 1 non-spec reference each,
  both reads (`patterns.service.ts:643`, `departure.service.ts:34`), so both behaviours are
  permanently at their fallback. `knowledgeRetrieval`, `orgIntelligence`, `documentElsewhere` are
  written and never read.
- P7-012: `POST /grounds/:id/sign-off` (`grounds.controller.ts:584`) has no caller; the client calls
  `/grounds/:id/setup-sign-offs` (`:373-390`). Two near-identically named routes, one dead — the
  exact shape that produces a wrong fix later.
- P3-022: `SEAT_WHERE` is genuinely single-sourced and correct, and Stripe is sent
  `quantity: 1` at `billing.service.ts:508` with no quantity at all on the plan change at `:546`.
  The seat count is an in-app cap that never reaches Stripe. Probably intended flat-rate pricing —
  but it is stated nowhere, so a future reader will assume the billing page's number is what is
  charged.
- P7-011 is a correction to the map, not a defect: `Subject` is read at twelve non-spec call sites
  and the map's "nothing reads it yet" note is stale.

**The change.** Each item goes one of two ways — given a writer, or turned into a constant. No third
option.

1. `coaching_live`: give it a PATCH route beside the two that have one, and a switch on `/admin`
   next to the WhatsApp toggle. Wire `GET /admin/coaching` (kept from Batch 9 step 3) to a page, so
   the batch can be read before the switch is thrown, which is what its Swagger line at
   `admin.controller.ts:239` says it is for. This closes P6-009's mechanism as well.
2. `correction_window_days`: same PATCH route, with validation (1–90).
3. `contributorBypass`: drop the column. Its own comment says it is referenced nowhere.
4. `PatternConfig` and `RetentionPolicy`: each needs a writer or a deletion. Retention is a policy
   somebody will ask about; give it a small ops screen. Pattern configuration has no asker; make
   `patterns.service.ts:643`'s fallback the literal default in code and drop the table.
5. `KnowledgeRetrieval`, `OrgIntelligence`, `DocumentElsewhere`: written and never read. Either a
   reader lands this quarter or the writes stop. Default to stopping the writes and dropping the
   tables — they are cost with no consumer.
6. `POST /grounds/:id/sign-off`: delete the route and its service method.
7. P3-022: add one comment above `billing.service.ts:508` stating that plans are flat-rate per tier
   and the seat count is an in-app cap that is deliberately not transmitted — after confirming that
   with Hafsah, which is the register's own open question. Also decide whether platform admins
   occupy seats; today they do, with no `isPlatformAdmin` exclusion in `SEAT_WHERE`.
8. P7-011: correct `audit_map.md`'s note about `Subject`.

**Migration.** Yes: dropping `contributorBypass`, and dropping whichever tables lose their argument.
Additive nothing.

**Data already written.** None of it is read. Dropping is safe.

**Spec.** `a-setting-has-a-way-to-be-set.spec.ts` — enumerate the keys `PlatformSetting` is read for
anywhere in `api/src` and assert each has a PATCH route, in the naming-guard style. That is the spec
that stops the sixth one appearing.

**Effort.** Day, mostly because of the deletions and the pricing conversation.

**Risk.** Low on the additions, medium on the drops — confirm the zero-reference greps at the moment
of deletion rather than trusting this document, since the audit and the fix will not land the same
day.

---

## Batch 13 — One word per thing, including in the contract customers build against

**Closes:** P6-002, P7-001, P7-002

**The one cause.** The database uses the interface's word for the interface's other concept, and two
naming guards exist that explicitly exempt the place where it matters. Verified:

- The Prisma model called `CheckIn` (`schema.prisma:1177`) is **one session**, keyed by
  `sessionNumber` (`:1181`). The thing a user calls a check-in is `Ground` (`:766`).
- The counter saying which session this is has three names for the same integer:
  `CheckIn.sessionNumber`, `RoundCompletion.roundNumber` (`:1819`), `ReportRound.round` (`:4003`).
- "Round", retired from every human surface by `client/src/one-word-and-it-is-session.spec.ts`, is
  still the published name of the first webhook event: `round.completed`
  (`webhooks/events-we-can-actually-send.ts:24`), described in its own comment as "the one the
  delivery discipline hangs on". Both naming guards exempt the data model and neither reaches the
  webhook contract.
- P7-002: six models represent a human being. Each has a stated reason; recorded, not condemned.
- P6-002: `Ground.timelineStated` and `Ground.cadenceStated` (`schema.prisma:778-789`) exist
  precisely to distinguish a number the lead set from a number the product chose, and **no copy
  reads either**. `timelineDays` is not nullable and `cadence` has a default, so the gap reader's
  "ask about duration when it is absent" never fires. A lead is shown a cadence they did not set and
  cannot tell it apart from one they did.

**The change.**

1. **The webhook contract first, because it is the only part a customer builds against.** Publish
   `session.completed` alongside `round.completed`, emit both for one deprecation window, and mark
   `round.completed` deprecated in `events-we-can-actually-send.ts` and in the API docs. Extend
   `api/src/one-word-for-the-thing-on-the-server-too.spec.ts` to cover the event names, which it does
   not reach today.
2. **The column names, as a rename with no behaviour change.** `RoundCompletion.roundNumber` →
   `sessionNumber`, `ReportRound.round` → `sessionNumber`. One integer, one name. Do not rename the
   `CheckIn` model itself in this batch — that is a much larger change and the two guards already
   exempt it deliberately; instead add a docstring at `schema.prisma:1177` stating in one sentence
   that `CheckIn` is one session of a `Ground` and that `Ground` is what a user calls a check-in, so
   the next reader learns it from the schema rather than from an audit.
3. **P6-002.** Render the provenance. Wherever the cadence or the session count appears on the
   summary card and the board, read `cadenceStated`/`timelineStated` and say either "you set this"
   or "we suggested fortnightly — change it". The columns exist for this and cost nothing to read.
   And make the gap reader ask: when `cadenceStated` is false, the question it was written for is
   exactly the one worth asking.
4. P7-002 needs no code. Record the six-models note in the schema beside `Person.linkedUserId`,
   which is the documented seam, so the rule that "a constraint enforced on one is not enforced on
   the others" is visible where somebody would add the seventh.

**Migration.** Yes, two column renames. Trivial with no live customers.

**Data already written.** Nothing wrong. Webhook subscribers: none we know of; the dual emit covers
any integrator we have not been told about.

**Spec.** Extend `one-word-for-the-thing-on-the-server-too.spec.ts` to the webhook event list and to
the three names for the session integer. `a-cadence-you-did-not-choose-says-so.spec.ts`.

**Effort.** Half-day.

**Risk.** Low. The dual-emit window means no integrator breaks. The renames are mechanical.

---

## Batch 14 — Four doors into one conversation, four validation postures

**Closes:** P7-008, P7-009

**The one cause.** The same problem solved four ways, and in three of them not solved. Verified by
reading the five declarations side by side:

- App: `SendMessageDto`, `@IsString @IsNotEmpty @MaxLength(8000)` — the only one with a length cap.
- `/start`: `EntryChatDto` with `@ValidateNested` over `TurnDto`, but `TurnDto` is a bare `@IsString`
  on `role` and `content` — no `MaxLength` on content, no `ArrayMaxSize` on messages, and `role` is
  not `@IsIn(['user','assistant'])` despite the TypeScript union. The whole history is
  client-supplied and replayed to the model at `entry.service.ts:927-967`, so an anonymous caller
  can forge assistant turns.
- Panel: `@Body() dto: { message?: string }` — an inline type, so the global ValidationPipe has no
  class and is inert. The sibling route at `public-api.controller.ts:656-668` hand-checks the same
  thing, so the omission is local, not policy.
- WhatsApp: no DTO on either path; fields plucked off the raw request.
- P7-009: five public handlers on `entry.controller.ts` with five postures — `chat` and `report` have
  a DTO and a `@Throttle`, `opener` has a DTO and no throttle, `faq` has a DTO capped at 1000 and no
  throttle, `classify-intent` has neither.

**The change.** One `AMessageIntoACheckInDto` in `api/src/common/`, `@IsString @IsNotEmpty
@MaxLength(8000)`, used by all four doors. `TurnDto` gets `@IsIn(['user','assistant'])` on role,
`@MaxLength(8000)` on content, and `EntryChatDto` gets `@ArrayMaxSize` on messages. The panel route's
inline type becomes the shared DTO class. The WhatsApp handlers construct the DTO and validate it
before calling the service. `entry.controller.ts` gets one posture: every public handler has a DTO
and a `@Throttle`, with `classify-intent` getting both (its missing DTO means `description` is
unbounded today).

The forged-assistant-turns problem is the one that is not just tidiness: `/start` replays
client-supplied history to the model, so `role` validation is load-bearing, not cosmetic.

**Migration.** None.

**Data already written.** None affected.

**Spec.** `every-door-into-a-conversation-checks-the-same-things.spec.ts` — a table over the four
routes asserting each rejects an 8001-character message, an empty message, and (where history
applies) a turn with a role that is not user or assistant.

**Effort.** Half-day.

**Risk.** Low, with one thing to check: the client truncates a pasted document to 8000 characters at
`EntryChatPage.tsx:1829` and the server currently accepts the whole field. Enforcing 8000 on the
server may reject pastes that work today — confirm the client truncation happens before send on
every path, or raise the shared cap to whatever the document paste actually needs and apply it
uniformly.

---

## Batch 15 — Process memory is not state

**Closes:** P2-002, P2-010, P2-011, P2-019, P2-020

**The one cause.** Five places treat a single process, or a single browser, as if it were the system
of record. Verified:

- `entry.service.ts:1086` — `private lastReplyHadCloseMarker = false;`, set at `:1039` on every
  reply, read by the controller through `didLastReplyClose()` at `entry.controller.ts:262` and
  `:300`. `EntryService` is a default-scoped Nest singleton and `/entry/chat` is `@Public()` and
  anonymous. **One flag for the whole process, shared by every concurrent visitor.** Visitor A's
  closing reply makes visitor B's next reply report `sessionComplete: true`. The comment at
  `:1084-1085` says it "is read by the controller immediately after this call" — true per request,
  false under concurrency.
- `auth.service.ts:1145` — OAuth exchange codes in a process-local `Map` with a 60-second TTL, the
  only mutable in-memory Map in `api/src/modules`. A restart or a second instance breaks Google
  sign-in with "Invalid or expired exchange code". The file says so at `:1145-1146`.
- `app.module.ts:52` — `ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 60 }])` with no
  `storage`, so the default in-memory store. A restart resets every counter; N instances means N×60.
  It governs the OTP and public entry routes, so it is a security control.
- `client/src/stores/auth.ts:47-52` — `logout()` removes `token`, calls `clearSignedIn()` and
  `posthog.reset()`. It leaves `gw_draft_token` (a live bearer credential accepted by
  `PATCH /entry/draft`, `entry.service.ts:1745-1781`), `gw_commit_payload` and
  `gw-new-ground-draft` (both carrying colleagues' email addresses), `gw-participant-session` (an
  invite token) and `gw_magic_email` in localStorage. On a shared machine the next person inherits
  all of it.
- `client/src/stores/entry.ts:10-14` — the entry store has **no `persist` middleware** and a literal
  `sessions: 1`, while the conversation itself is persisted to `gw_entry_session`. `cadence` is
  `useState('FORTNIGHTLY')` at `EntryChatPage.tsx:1182` and is **sent** at `:1869`; after a reload it
  is the untouched literal with `cadenceChosen` false, and the server writes it as a real choice
  (`entry.service.ts:1397, 1477`). Somebody who chose weekly, reloaded, and saved gets a fortnightly
  ground and is never told.

**The change.**

1. `lastReplyHadCloseMarker` stops being instance state. `guardedReply` returns
   `{ text, closed }` and the controller reads the flag off the returned value. Delete the field and
   `didLastReplyClose()`. This is the whole fix and it is small.
2. OAuth exchange codes move to a table (`OAuthExchangeCode(code @unique, userId, expiresAt,
   consumedAt)`) with a delete-on-use and a daily prune. Change the error message to distinguish
   expired from unknown.
3. The throttler gets a shared store. If Redis is not available in this deployment, say so in a
   comment at the registration site the way `auth.service.ts:1145` does for the Map — an undocumented
   single-process assumption on a security control is the actual defect.
4. `logout()` clears an explicit allowlist-inverse: enumerate every `gw_`/`gw-` key the app writes
   (the grep in the register lists them) and remove all but the deliberate cross-session ones
   (`gw-feedback-button-position`, `gw-ob-v2`). Put the list in one module,
   `client/src/lib/what-signing-out-takes-with-it.ts`, so a new key has one place to be registered.
5. The entry store gets `persist`, and `cadence`/`cadenceChosen`/`cadenceAnchorDay` move into it
   from component state so `saveSession` carries them. Separately, and more importantly:
   `entry.service.ts:1397` must not treat an absent or unconfirmed cadence as a choice — send
   `cadenceChosen` and write `cadenceStated: false` when it is false, which is the column Batch 13
   step 3 then renders.

**Migration.** Yes: one table for OAuth codes.

**Data already written.** Grounds created through `/start` after a reload may hold a fortnightly
cadence the lead did not choose, recorded as if they had. With `cadenceStated` unwired there is no
way to tell which. Accept it — ours only — and let Batch 13 make it visible going forward.

**Spec.** `one-visitors-session-does-not-end-another-visitors.spec.ts` — two concurrent
`/entry/chat` calls, one closing, and assert the other's `sessionComplete` is false.
`signing-out-leaves-nothing-behind.spec.ts` — enumerate the keys the app writes, sign out, assert
only the deliberate ones remain.

**Effort.** Day.

**Risk.** Low. The `guardedReply` signature change touches a handful of call sites; the localStorage
sweep is additive removal. The throttler store change needs infrastructure and can ship separately
from the rest of the batch.

---

## Batch 16 — A token asserts a fact that was true when it was minted

**Closes:** P2-007, P2-008, P2-009, P2-023, P2-024, P2-025, P2-026, P2-027

**Note on ownership.** These are the auth-and-token half of Pass 2. They are in this slice because
the enumeration says "all P2-\*", but they are security findings and overlap the security slice —
whoever picks this up should reconcile with that plan before starting rather than fixing twice.

**The one cause.** Authorisation is decided from claims minted in the past, and nothing can
invalidate a claim. Verified:

- `auth.service.ts:771-782` — `resetPassword` writes `passwordHash` only. There is no session table,
  no denylist, no `tokenVersion` and no `passwordChangedAt` in the schema. Every token minted before
  the reset stays valid for its full 7 days (`auth.module.ts:20`). `jwt.strategy.ts:29-49` re-reads
  the user each request and has nothing to compare an epoch against.
- `jwt.strategy.ts:29-46` — `validate()` reads `user.organizationId` and never checks
  `organizationMembership`, while `switchOrganization` (`auth.service.ts:1221-1235`) does check it on
  the way in. Deleting a membership row alone does not remove access.
- `approved-or-machine.guard.ts:26-32` returns true on `claims.typ === 'machine'` before any query;
  `embed-session.guard.ts:35-41` takes `org` and `pid` from claims and never re-reads
  `person.active`. A revoked credential and a deactivated person keep working for up to 900 seconds.
  `machine-token.guard.ts:20-22` documents this as deliberate; the other two do not.
- `google.strategy.ts:24-30` takes `emails[0].value` and never checks `email_verified`;
  `auth.service.ts:816-823` links an unrecognised `googleId` to a matching existing account and
  forces `isEmailVerified` true at `:820`. That path mints `via: 'google'`, which walks past the
  back-office door with no emailed code.
- `auth.service.ts:1249` types `via` as `'password' | 'link' | 'google'` and **nothing ever passes
  `'link'`** — magic-link, verify-email and entry-handover all take the `'password'` default through
  `buildAuthResponse` at `:982`. And `switchOrganization` mints through `generateToken(user)` at
  `:1238`, dropping `via` back to `'password'`, so a Google-signed-in staff member loses back-office
  access on switching org with no explanation.
- `the-back-office-has-a-door.ts:27-31` matches `/^\/api\/v1\/(ops|admin)(\/|$|\?)/` against
  `req.originalUrl ?? req.url` — case-sensitive, undecoded — while Express matches case-insensitively
  on the decoded path with no `caseSensitive: true` set anywhere.
- `configuration.ts:107` falls back to the literal `"super-secret-key"`, with two further unreachable
  `|| 'fallback-secret'` literals. `assertProductionConfig` refuses to boot on it only when
  `NODE_ENV === 'production'`.

**The change.**

1. Add `User.tokenEpoch Int @default(0)`. Mint it into the token; `jwt.strategy.validate` compares
   and rejects on mismatch. `resetPassword` increments it. That is P2-008, and it is the enabling
   change for everything else here.
2. `jwt.strategy.validate` checks `organizationMembership` for the claimed org, not just
   `user.organizationId` (P2-025).
3. `ApprovedOrMachineGuard` and `EmbedSessionGuard` each do one indexed read — credential revoked?
   person active? — before returning true, or carry the same explicit comment
   `MachineTokenGuard:20-22` has. Pick one and say which (P2-026).
4. `GoogleStrategy.validate` rejects a profile whose email is not verified, and
   `findOrCreateGoogleUser` stops forcing `isEmailVerified = true` on link (P2-009). The register
   marks this Unverified pending a check on the configured OAuth client — do that check first; if the
   answer is "it can be false", this is a Blocker and jumps to Batch 1's position.
5. The door normalises before matching: lowercase and `decodeURIComponent` the path, and set
   `caseSensitive: true` on the Express app so routing and the guard agree. Run the two `curl` checks
   the register specifies before and after (P2-007).
6. `via`: pass `'link'` from the magic-link and verify-email paths, and carry `via` through
   `switchOrganization` (P2-023, P2-024). Both are one-line.
7. Delete the two dead `'fallback-secret'` literals and make the config default `undefined` rather
   than a string, so the absence is visible in every environment rather than only in production
   (P2-027).

**Migration.** Yes: `User.tokenEpoch Int @default(0)`.

**Data already written.** Nothing wrong; no live customers and no long-lived credentials that
matter.

**Spec.** `resetting-a-password-ends-the-other-sessions.spec.ts`.
`the-back-office-door-does-not-care-how-you-spell-the-path.spec.ts` — the `/ADMIN` and `/%61dmin`
cases as tests, not as a manual curl.
`removing-somebodys-membership-removes-their-access.spec.ts`.

**Effort.** Day.

**Risk.** Medium. `tokenEpoch` invalidates every token in circulation on deploy — with no customers
that costs us one re-login each. The door normalisation could over-match a legitimate path
containing "admin"; anchor the regex the same way it is anchored now.

---

## Batch 17 — A check-in with one person on it can never do what it promises

**Closes:** P6C-001, P6C-002, P6C-003

**The one cause.** 43 of 243 check-ins in the local database — 18 per cent — have fewer than two
participants. Zero of them has a released report and none ever will: a shared report needs two
accounts to compare, and `isSessionReadyForReport` (`grounds.service.ts:4300`) returns false
outright on `active.length < 2`. The owner gets their private report, which is real value, and then
waits indefinitely for a second half the product has already decided cannot arrive. Nothing on the
screen says so.

The two Notes are the context, not separate work: 147 of 148 released reports came from two or more
people (so the wall holds and nothing is fabricated), and 21 organisations of 224 have never created
a check-in at all — the population the first-run experience is written for.

**The change.** This is the smallest batch in the plan and the one a user notices first.

1. On `GroundParticipantPage` and the report tab, when the ground has fewer than two non-managing
   participants, replace the "forming" state with the truth and an action: "The shared report
   compares two accounts. Add somebody and this will build." plus the add-participant control
   inline. The condition is one query the page already has.
2. The same sentence on the check-in list row, so it is visible without opening the ground.
3. Do **not** block creating a solo check-in. The private report is genuinely useful and the lead may
   be adding people later. Say what is waiting, do not prevent it.
4. P6C-002: identify the one released report built from fewer than two completed participants and
   check whether its second participant is `managingOnly`. If it is, the behaviour is correct and the
   finding closes; if it is not, it is a release-rule hole and belongs in Batch 2. One SQL query and
   five minutes.

**Migration.** None.

**Data already written.** Nothing wrong. The 43 grounds simply start telling the truth on their next
page load.

**Spec.** `a-shared-report-needs-two-people-and-the-page-says-so.spec.ts` — a one-participant ground
renders the waiting-for-a-second-person state and the add control, not "forming".

**Effort.** Hours.

**Risk.** Very low. Copy and a conditional. The only judgement is whether to also nudge by email
after some days; do not, in this batch.

---

## Coverage

Every ID in this slice, in exactly one batch.

| ID | Batch | ID | Batch |
|---|---|---|---|
| P2-002 | 15 | P3-014 | 8 |
| P2-003 | 3 | P3-015 | 5 |
| P2-004 | 2 | P3-016 | 9 |
| P2-005 | 1 | P3-017 | 6 |
| P2-007 | 16 | P3-018 | 10 |
| P2-008 | 16 | P3-019 | 10 |
| P2-009 | 16 | P3-020 | 10 |
| P2-010 | 15 | P3-021 | 5 |
| P2-011 | 15 | P3-022 | 12 |
| P2-012 | 1 | P3-023 | 9 |
| P2-013 | 1 | P4-003 | 3 |
| P2-014 | 1 | P4-B06 | 3 |
| P2-015 | 3 | P4-C01 | 2 |
| P2-016 | 4 | P4-C02 | 2 |
| P2-017 | 4 | P4-C03 | 8 |
| P2-018 | 4 | P4-C04 | 8 |
| P2-019 | 15 | P4-C05 | 8 |
| P2-020 | 15 | P4-C06 | 11 |
| P2-021 | 2 | P4-C07 | 8 |
| P2-022 | 2 | P4-C08 | 8 |
| P2-023 | 16 | P4-C09 | 2 |
| P2-024 | 16 | P4-C10 | 11 |
| P2-025 | 16 | P4-C11 | 2 |
| P2-026 | 16 | P4-D01 | 4 |
| P2-027 | 16 | P4-D02 | 4 |
| P2-028 | 4 | P4-D03 | 11 |
| P3-001 | 5 | P4-D04 | 11 |
| P3-002 | 5 | P4-D05 | 11 |
| P3-003 | 5 | P4-D06 | 11 |
| P3-004 | 5 | P4-D07 | 11 |
| P3-005 | 9 | P6-001 | 7 |
| P3-006 | 9 | P6-002 | 13 |
| P3-007 | 6 | P6-012 | 9 |
| P3-008 | 6 | P6C-001 | 17 |
| P3-009 | 6 | P6C-002 | 17 |
| P3-010 | 6 | P6C-003 | 17 |
| P3-011 | 5 | P7-001 | 13 |
| P3-012 | 8 | P7-002 | 13 |
| P3-013 | 8 | P7-003 | 9 |
| | | P7-004 | 9 |
| | | P7-005 | 12 |
| | | P7-006 | 12 |
| | | P7-008 | 14 |
| | | P7-009 | 14 |
| | | P7-011 | 12 |
| | | P7-012 | 12 |
| | | P7-013 | 1 |

86 findings, 17 batches, none dropped and none invented.

**Suggested order to actually work in**, which is not quite the harm order because of dependencies:
Batch 4 (transactions and unique rows) unblocks Batch 3 and Batch 2. Batch 2 unblocks Batch 11's
repair sweep. Batch 8 should land before or with Batch 11 so the new `extract` timeout produces a
recorded failure rather than a swallowed one. Everything else is independent.

---

# Added 10 September 2026, by decision

## Batch 18 — A report can say the evidence is strong, because the anchoring already exists

Closes: P6B-002, and the unreachable top coverage band.

**The real cause, which the register did not find.** There are two notions of document-backing in
this codebase. One is alive and careful. The other is dead, and it is the one the ground report
uses.

The live one: a record entry carries `recallBased`, `anchoredDocumentId`, `anchoredPassage` and
`anchoredOrigin`. Entries are written with `recallBased: true`, and an anchoring pass in
`conversation.service.ts` sets it false when a line is matched to an uploaded document, storing the
document, the passage that backs it and where the document came from. The session report uses
exactly this, as `!recallBased && countsAsASource(backedBy)`, and the origin check is there so a
note the product generated cannot back a claim the product made.

The dead one: `RecordEntry.evidenceType`, an enum defaulting to `CHECK_IN`. Nothing in the
repository ever writes the two document values. There are two readers and no writers.
`documentBackedPct` counts those two values, so it is structurally zero rather than merely low. And
because `coverageBand` requires that percentage above thirty to say `strong`, the strongest band
has never been reachable by any report, whatever anybody uploads.

**The change is small, because the work is already done.**

1. `documentBackedPct` computes from the live fields, the same expression the session report uses,
   including the origin check. Not from `evidenceType`.
2. `coverageBand` then works as written, with no change to its thresholds. Confirm thirty percent
   is the right line once real reports produce real numbers; it was chosen against a figure that
   was always zero, so it has never been tested against anything.
3. `evidenceType` is then dead in earnest. Do not backfill it. Remove the two reads and the column,
   or leave the column and remove the reads, but do not leave a second answer to a question that
   already has one. This is the pattern part B batch 4 exists to stop.
4. The patterns service reads `evidenceType` the same way and has the same defect. Fix both, or
   neither is fixed.

**No migration, no backfill.** The anchoring data is already recorded on existing entries, so
reports regenerated after this change will report their real evidence for runs that already
happened.

Spec: `a-report-counts-the-anchoring-it-actually-has.spec.ts`, and a source-order spec that fails
if `documentBackedPct` is ever computed from a field with no writer.

Effort: hours for the computation. Half a day including the patterns service and removing the dead
path.
Risk: low, and it moves in the honest direction. Numbers that were always zero start being
non-zero, so any screen that reads "0% document-backed" as normal will change. That is the point.

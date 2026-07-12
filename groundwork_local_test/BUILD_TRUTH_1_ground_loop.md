# Build Truth: One Ground, End to End

This document traces the full lifecycle of a single ground — from creation through
report release and into session 2+ — with file:line citations for every factual
claim. It was written by reading the code fresh, not from memory of prior sessions.
Where the code was ambiguous or a path couldn't be confirmed, it says **UNCLEAR**
rather than guessing. Written for someone building tests who has never seen this
codebase.

Repo root for all paths below: `api/src/...` unless noted otherwise.

---

## 1. Creating a Ground

**Endpoint and authorization.** A ground is created via `POST /grounds`, handled by
`GroundsController.create()` (`modules/grounds/grounds.controller.ts:66-69`), which
calls `GroundsService.create(organizationId, userId, dto)`
(`modules/grounds/grounds.service.ts:72`). Unlike the org-roster creation route and
the `for-lead` variant (both `@Roles(Role.ADMIN)`,
`grounds.controller.ts:53-54, 72-74`), this plain `create` route carries **no**
`@Roles` decorator — any authenticated user in the org can self-initiate a ground.

**What the initiator specifies** (`modules/grounds/dto/create-ground.dto.ts`):

| Field | Required? | Notes |
|---|---|---|
| `label` | required | display name, max 200 chars (lines 25-29) |
| `scenario` | required | `GroundScenario` enum — drives the default timeline (`grounds.service.ts:15-21`) |
| `moment` | required | `GroundMoment` enum (lines 35-37) |
| `timelineDays` | optional | defaults per-scenario if omitted |
| `cadence` | optional | defaults to `FORTNIGHTLY` if omitted (`grounds.service.ts:93`) |
| `cadenceAnchorDay` | optional | anchor weekday/day-of-month; defaults `null` |
| `startsAt` | optional | when session 1 opens; if omitted, opens immediately |
| `endsAt` | optional | no new sessions scheduled after this |
| `resolutionState` | optional | pre-agreed intended outcome, max 200 chars |
| `brief` | optional | initiator's opening narrative, max 4000 chars |
| `freeParticipantCap` | optional | defaults to 4 (`grounds.service.ts:101`) |
| `contraindicationAnswers` | optional | 3 booleans for conflict-scenario screening |
| `accessCode` | optional | contributor code that can grant a free ground |

**What happens on creation, in order** — all inside one `$transaction`
(`grounds.service.ts:80-147`):

1. Billing gate: `billing.canCreateGround(organizationId, dto.accessCode)`
   (line 75) — throws before any writes if disallowed.
2. `Ground` row created: `status: OPEN` (line 97), a fresh `joinToken`
   (`crypto.randomBytes(24).toString('hex')`, line 100), `sessionsBalance: 1`
   (line 103).
3. If free via access code, a `ContributorCodeRedemption` row is created and the
   code's `sessionsUsed` incremented (lines 114-128).
4. **The initiator becomes a full party**: a `GroundParticipant` row is created
   with `partyType: INITIATOR`, `userId: initiatorId` (lines 130-138).
5. **The initiator's own first check-in is created immediately**: a `CheckIn`
   row, `sessionNumber: 1`, `status: NOT_STARTED`, `availableFrom` set from
   `dto.startsAt` or immediate (lines 140-144).
6. After commit: a contract/no-verdict object is attached to the response, a
   contraindication warning may be attached for `DRIFT`/`RECOGNITION`/
   `CRISIS_ALIGNMENT` scenarios, and a best-effort `GROUND_CREATED` usage event
   is emitted (failure swallowed, line 175).

**Confirms the key point**: the initiator is not merely an admin overseeing the
ground — they get their own `GroundParticipant` (INITIATOR) row and their own
`CheckIn` row, in the same transaction as ground creation, at the same time as
anyone else invited later.

**UNCLEAR**: the exact free-tier/access-code validation rules live inside
`billing.canCreateGround` (billing module) — not traced here since it's a billing
concern, not a ground-lifecycle one.

---

## 2. Inviting Participants

**Adding a participant** — `GroundsService.addParticipant()`
(`modules/grounds/grounds.service.ts:632-728`):

1. Only the initiator can add someone: `ground.initiatorId !== initiatorId` throws
   `ForbiddenException` (line 635).
2. **Invite token**: `crypto.randomBytes(32).toString('hex')` (line 643), with a
   **14-day expiry** (`inviteTokenExpiresAt`, line 644) — unless the entry flow
   pre-generated a token before auth, in which case that token is honored instead
   (line 643 comment).
3. **Duplicate handling**: if the email is already a participant on this ground
   with `userId` set, throws `BadRequestException('This email is already a
   participant on this ground')` (line 653). If the existing record has **no**
   `userId` (invited but never accepted), the token and expiry are refreshed and
   the invite email is re-sent (lines 654-669) — re-inviting an unaccepted email
   never errors, it just resets the clock.
4. On a genuinely new participant: a `GroundParticipant` row (`partyType:
   PARTICIPANT`, line 698) and a `CheckIn` (`sessionNumber: 1`, `NOT_STARTED`,
   line 706-708) are created in one `$transaction`, and the ground's status moves
   to `AWAITING_PARTIES` (line 710).
5. **SEQUENTIAL cadence special case**: if the ground's cadence is `SEQUENTIAL`
   and the lead (initiator) hasn't yet completed their own session 1, the new
   participant's session 1 `availableFrom` is locked to the max JS date
   (`'9999-12-31T00:00:00.000Z'`, line 689) — a sentinel meaning "not yet open,"
   distinct from `null` ("no schedule"). It's unlocked later, either when the
   lead completes session 1 (via `ensureNextSession`'s SEQUENTIAL trigger, see
   §6) or, if the participant accepts after the lead has already gone first, by
   a catch-up check in the acceptance flow itself (see below).
6. The invite email is sent via `email.sendParticipantInvite(...)` after the
   transaction commits (lines 715-728).

**Accepting an invite** — `ParticipantsService.accept()`
(`modules/participants/participants.service.ts:46-144`):

1. The token is resolved via `loadByToken()` (line 47, defined at lines 216-227),
   which throws `NotFoundException` if no participant matches the token, and —
   **only for accounts that haven't accepted yet** — throws `BadRequestException`
   if `inviteTokenExpiresAt` has passed (lines 222-225). Already-accepted
   participants skip the expiry check entirely, so their invite link keeps
   working indefinitely as a personal return-link.
2. **Note**: the class docstring says accepting will "clear the token" (line 43),
   but the actual code (lines 79-82) only ever sets `userId` on the
   `GroundParticipant` — it never nulls out `inviteToken`. This looks like a
   stale comment; the real, intentional behavior (confirmed by the comment at
   line 221, "they can always return via their link") is that the token is kept
   alive after acceptance, not cleared.
3. **Cross-org handling — the important part.** Email is looked up globally
   (`user.findUnique({ where: { email } })`, line 58). If no account exists, a
   **new** `User` is created with `organizationId: ground.organizationId` (line
   62) — i.e., a brand-new participant is provisioned inside the **initiator's**
   organization. But if a `User` with that email **already exists**, nothing about
   their `organizationId` is touched — only the `GroundParticipant.userId` link is
   set (lines 79-82). The code comment states this explicitly:
   > "Cross-org participation: user keeps their home org. The JWT carries their
   > real orgId so their own grounds remain accessible. Only the participant
   > record is linked here." (lines 75-77)

   So: a genuinely new person becomes a member of the ground's org by default: an
   existing user from a different org keeps their own org and simply gains a
   linked `GroundParticipant` row on this ground — they are never migrated.
4. If the new/existing user has no `passwordHash`, a `PASSWORD_SETUP` token is
   issued (72-hour expiry, lines 90-101) and an email sent so they can set a
   password and return later without being locked out.
5. **SEQUENTIAL catch-up**: if the ground is `SEQUENTIAL` and the lead has
   *already* completed session 1 by the time this participant accepts, their
   locked `NOT_STARTED` check-ins with a future `availableFrom` are unlocked to
   `now` right here (lines 110-119) — this is the second of two places that can
   clear the SEQUENTIAL lock (the other being the lead's own completion trigger,
   §6).
6. Returns a fresh JWT (`organizationId: user.organizationId` — the user's own
   org, not necessarily the ground's, line 128) and the participant's first
   open/in-progress check-in id (lines 123-126).

**UNCLEAR**: whether there's a hard participant cap enforced at `addParticipant`
time beyond `freeParticipantCap` (billing-related, not traced here).

### 2a. Broadcast / anonymous join-link (QR code) — a genuinely different first-contact path

Every ground carries a `joinToken`, generated at creation
(`crypto.randomBytes(24).toString('hex')`, `grounds.service.ts:100`) — this is
the code/QR link shown on the ground admin page ("anyone can check in without
creating an account first"). **It never expires** — `getJoinPreview()`
(`grounds.service.ts:342-354`) looks the ground up by `joinToken` with no expiry
check at all, only existence (line 347 throws `NotFoundException` only if no
ground matches). There is no participant cap check in this path either — nothing
in `joinCommit` (below) reads `freeParticipantCap`.

**Preview.** `EntryService.joinPreview(joinToken)`
(`modules/entry/entry.service.ts:824-827`) is a thin proxy to
`GroundsService.getJoinPreview`, returning `{ groundId, groundLabel, scenario,
initiatorName }` — enough for the client to show "You're joining [X]'s ground"
before the person commits to anything.

**Commit — `EntryService.joinCommit()`** (`entry.service.ts:829-951`), called
once the anonymous chat/entry conversation has already happened client-side and
the person is ready to save it:

1. Ground is looked up by `joinToken` (843-847) — 404 if the link is bad.
2. **If no email is given, nothing is stored at all** (849-851) — the entire
   conversation the person just had is discarded, no account, no participant
   row, no check-in. This is a real dead-end: someone can go through an entire
   anonymous check-in conversation and, if they don't give an email at the very
   end, lose it completely.
3. If an email **is** given: the email is looked up globally
   (`user.findUnique`, line 859). If no account exists, a new `User` is created
   with **`organizationId: ground.organizationId`** (line 868) — same
   org-landing behavior as the direct-invite path (§2): a brand-new person lands
   in the *ground's* org, not a fresh org of their own.
   - **Difference from the direct-invite path**: the new account is created with
     `isEmailVerified: false` (line 873), and the code comment explains why —
     "the join flow is authenticated via the joinToken (ground-scoped), not by
     proving ownership of the email address" (lines 862-865). The direct-invite
     path, by contrast, sets `isEmailVerified: true` immediately
     (`participants.service.ts:67`) because arriving via a clicked emailed link
     already proves the person controls that inbox. The join-link path can't
     make that assumption — anyone who has the link can type in any email
     address — so the account starts unverified until a normal sign-in flow
     (magic link or password setup) later confirms it.
   - If a `User` with that email **already exists**, the same cross-org rule as
     §2 applies implicitly: nothing about their `organizationId` is touched here
     either — only a new `GroundParticipant` row links them to this ground
     (lines 882-891).
4. A `GroundParticipant` row is created (`partyType: PARTICIPANT`, 882-891) —
   **and, unlike either flow in §2, there is no duplicate-email guard here.** If
   this email already has a `GroundParticipant` row on this same ground, the
   Prisma unique constraint on `[groundId, email]` (`schema.prisma:373`) will
   throw at the DB layer — `joinCommit` doesn't pre-check for this the way
   `addParticipant` does (§2, lines 649-670). **UNCLEAR precisely how that
   throw surfaces to the joining user** — no catch/friendly-error wrapper was
   found around this specific `create` call.
5. **The check-in is created already `COMPLETED`** (894-902) — `status:
   COMPLETED, completedAt: new Date()` set directly at creation, not reached via
   the normal `open()` → `sendMessage()` → `complete()` progression used by the
   direct-invite flow. This is the same shortcut discussed in §5a below, and it
   is the other concrete way a "completed" session can exist with no
   `ConversationTurn` history behind it if the person's `dto.history` array is
   empty.
6. If `dto.history` (the anonymous chat transcript) has entries, they're bulk
   inserted as `ConversationTurn` rows (905-912), and record extraction is
   kicked off — **but only as fire-and-forget** (`.then(...).catch(...)`, no
   `await`, lines 914-917) — unlike the direct check-in path, where extraction
   is deliberately `await`-ed before the status flips to `COMPLETED` (§3,
   "ISSUE 6" fix). Here the status is already `COMPLETED` *before* extraction
   even starts, so there is a real window where the check-in reads as done with
   zero `RecordEntry` rows, purely due to ordering, independent of whether
   extraction eventually succeeds.
7. If a solo report was already generated client-side during the anonymous
   chat, it's saved directly onto `soloArtifact` (920-926) — no server-side
   regeneration.
8. A password-setup email is sent if the account is new or has no password yet
   (928-940), and a JWT is issued and returned immediately (942-950) — the
   person is signed in on the spot, no separate accept-step required (contrast
   with §2's direct-invite flow, which requires a distinct "accept" action on
   the emailed link).

**Net difference from the direct-invite path (§2), in one line each:**
- **Org landing**: identical — new accounts land in the ground's org either way.
- **Email verification**: invite-accept trusts the email immediately
  (verified via the click); join-link does not (verified: false until a later
  sign-in flow confirms it).
- **Entry order**: invite-accept requires clicking a link *then* accepting *then*
  entering the check-in; join-link lets someone chat anonymously *first* and
  only attaches an identity at the very end — meaning identity is optional and
  retroactive, and skippable entirely if no email is given.
- **Data-loss risk**: unique to join-link — an entire conversation can be
  thrown away if the person doesn't supply an email at the end.
- **Duplicate-participant handling**: invite-accept explicitly handles a
  repeat invite (refreshes the token); join-link has no equivalent guard and
  will hit a raw DB constraint error on a second join attempt with the same
  email on the same ground.

---

## 3. The Check-in / Contribution

**Opening a session** — `ConversationService.open()`
(`modules/conversation/conversation.service.ts:173-285`):

- Loads the check-in via `loadOwnedCheckIn` (line 174) — see privacy mechanism
  below.
- Rejects if already `COMPLETED` (175-177), or if the ground's status isn't one
  of `OPEN`/`AWAITING_PARTIES`/`ACTIVE`/`REPORT_READY` (179-183).
- **Idempotent**: if an AI turn already exists, it's returned unchanged rather
  than calling the model twice (189-195) — closes a race, not a bug.
- On first-ever open for a session round, decrements `sessionsBalance` by one —
  described as a session-*count* gate, not a payment wall (166-171, 197-260).
- Composes the system prompt (`composeSystemPrompt`, detailed in §6) and issues a
  synthetic `<<BEGIN_CHECK_IN>>` instruction so the AI opens first (278-280).
- Persists the reply as a `ConversationTurn` (`role: AI`, line 282); flips status
  `NOT_STARTED → IN_PROGRESS`, stamps `startedAt` (line 283).

**Sending a message** — `sendMessage()` (lines 291-339, streaming variant
`sendMessageStream()` at 364-401 mirrors this):

- Ownership check again (line 292); rejects if `COMPLETED` (293-295).
- **Turn cap**: counts existing `PERSON`-role turns; throws `BadRequestException`
  at `personTurnCount >= 20` (297-302) — 20 *person* turns, not 20 total.
- Person's message persisted first (307-309); history for the model call is
  rebuilt from **only this participant's own turns**
  (`where: { checkInId: checkIn.id }`, line 316) — no cross-participant join
  exists anywhere in this path.
- If the model call fails, the just-created orphan PERSON turn is deleted before
  re-throwing (322-325).
- `detectSessionComplete()` (342-355) scans the AI's reply for fixed closing
  phrases (e.g. "here is what is now in your record") to decide whether to show
  a "Complete session" affordance client-side — this replaced an earlier
  turn-count-based auto-complete (comment, line 334); it's the AI's own closing
  language that triggers the UI hint, not a count.

**Privacy mechanism — the exact enforcement.** The class-level comment states the
rule directly: *"a party's transcript and record are NEVER loaded into the other
party's context... The only thing that crosses is the synthesised report."*
(lines 79-86). The mechanism is `loadOwnedCheckIn()` (lines 1111-1124): it loads
the `CheckIn` with its `participant` relation and throws `ForbiddenException`
unless `checkIn.participant.userId === requestingUserId` (1117-1121). Every
check-in-scoped method in this file calls it first: `getTranscript`, `getDownload`,
`open`, `sendMessage`, `sendMessageStream`, `complete`, `documentReceived`,
`decline`, `getSoloArtifact` (line numbers in the original citations: 106, 133,
174, 292, 366, 682, 966, 995, 951). Every controller route passes the
authenticated `userId` straight into these owner-scoped methods
(`modules/conversation/conversation.controller.ts:28-98`) — there is no route
that accepts an arbitrary check-in id without this check.

**What crosses the boundary.** Only the synthesized `Report` does. Report
synthesis reads `RecordEntry` rows (already-extracted, per-party structured data —
see §4), never raw `ConversationTurn` text
(`modules/reports/reports.service.ts:274-280`; a grep for `conversationTurn` in
that file turns up only auxiliary heuristics like thin-record/turn-count checks,
never content used in the synthesized text itself).

**The completion gate — exact requirement.** `complete()`
(`conversation.service.ts:681-742`):

1. Ownership check (682); rejects if already `COMPLETED` (683-685).
2. **Two-part completion-readiness gate (updated - was a raw turn count only,
   now also checks content, resolving the gap #2 flagged earlier):**
   - **Turn count**: counts `PERSON`-role turns; if fewer than 3, throws
     `BadRequestException('A few more exchanges are needed before this
     check-in can close...')`.
   - **Content substance**: sums the trimmed character length of all `PERSON`
     turns; if the total is under `MIN_SUBSTANTIVE_CHARS = 120`, throws a
     separate `BadRequestException('These answers are pretty short - the
     record needs a bit more detail...')`. This closes the exact gap
     previously flagged — three one-word replies ("yes", "ok", "fine") pass
     the turn-count check but fail this one. The 120-character threshold is a
     total across all person turns, not per-turn, and mirrors the thin-record
     character-based heuristic already used at report-synthesis time
     (`reports.service.ts` — `turnCounts`/`maxChars` logic), applied here at
     the gate itself instead of only being flagged after the fact.
   Both checks must pass; either can block completion independently, with a
   distinct error message so a persona/test can tell which one failed.
3. On passing: specificity is scored (700); `extractRecordEntries()` is run
   **synchronously, awaited**, before the status flips — the comment explicitly
   marks this ordering as a deliberate fix ("ISSUE 6", lines 702-707) so record
   population can't race past the status change.
4. Status set to `COMPLETED`, `completedAt` and specificity fields stamped
   (709-718).

**What the person gets immediately.** After the status update,
`buildSoloArtifact()` is called **fire-and-forget** —
`.catch(...)` with no `await` (lines 723-725), explicitly so "the person has
standalone value from this session without waiting on anyone else." It reads only
this participant's own `RecordEntry` rows (925-929), summarizes via
`SOLO_ARTIFACT_PROMPT`/`SOLO_ARTIFACT_SCHEMA`, and writes
`GroundParticipant.soloArtifact`/`soloArtifactAt` (940-946). Because this isn't
awaited, `complete()`'s HTTP response can return *before* the artifact write
lands — a client polling `getSoloArtifact` (950-958) immediately after may
briefly see `{ artifact: null }`. **UNCLEAR**: no "artifact ready" event is
emitted alongside `CHECK_IN_COMPLETED` — the client must poll/re-fetch to notice
when it appears.

---

## 4. What Happens to a Contribution

**Extraction.** `extractRecordEntries(checkInId, participantId)`
(`conversation.service.ts:885-916`) loads all `ConversationTurn` rows for the
check-in, concatenates them, and calls the AI with `RECORD_EXTRACTION_PROMPT` +
`RECORD_EXTRACTION_SCHEMA` (schema at lines 30-60). Called synchronously from
`complete()` before the status flips (see §3). The prompt instructs the model to
quote the person's own words, tag AI-inferred (non-stated) claims with a literal
`[INFERRED: ...]` suffix, and classify each entry by type. Each emitted entry also
carries a `verifiability` (`HIGH`/`MEDIUM`/`LOW`) — this has no dedicated DB
column yet, so it's prepended into `text` as a `[VERIFIABILITY:HIGH]`-style tag
(lines 902-913, comment explains the workaround).

**`RecordEntryType`** (`prisma/schema.prisma:94-102`):

| Type | Meaning (from the extraction prompt) |
|---|---|
| `SUCCESS_DEFINITION` | what "done"/success looks like to this person |
| `COMMITMENT` | something they or the other party agreed to deliver |
| `ASK` | a request (raise, equity, resource, decision) |
| `INTENT` | how they understood their role/the arrangement |
| `TOLERANCE` | what they will or won't accept |
| `WORRY` | what they fear will happen |
| `TENSION` | a tension they predict or already see |

**`EvidenceType`** (`prisma/schema.prisma:135-141`): `DOCUMENT_AT_AGREEMENT`,
`DOCUMENT_AFTER`, `CHECK_IN`, `ANCHORED_RECALL`, `UNANCHORED_RECALL`. This is
**not** AI-classified per entry — it's mechanical. `RecordEntry.evidenceType`
defaults to `CHECK_IN` and `extractRecordEntries` never overrides it, so
conversation-derived entries are always `CHECK_IN`. Separately,
`DocumentsService.extractAndStoreClaims()`
(`modules/documents/documents.service.ts:247-276`) runs its own extraction over an
uploaded document's text and explicitly stamps `evidenceType:
DOCUMENT_AT_AGREEMENT` and `recallBased: false` (lines 266-270). **UNCLEAR**: no
code path was found that sets `DOCUMENT_AFTER`, `ANCHORED_RECALL`, or
`UNANCHORED_RECALL` — these enum values appear reserved/unused today.

**Durability.** `ConversationTurn` rows are deleted only in one narrow case: an
orphaned PERSON turn is removed if the following AI call throws (§3). They
otherwise persist indefinitely — cascade-deleted only if their parent `CheckIn`
is deleted, never pruned by age. `RecordEntry` rows are related to `CheckIn` with
`onDelete: SetNull` (`schema.prisma:448`), so they outlive their originating
check-in even in that edge case. **Reports read exclusively from `RecordEntry`**,
never raw turns — confirmed by the corpus-building query in
`reports.service.ts:274-280`, which selects from `recordEntry`, not
`conversationTurn`.

**`recallBased` / `anchored_question_id`.** `RecordEntry.recallBased` defaults
`true`; the schema comment says `false = anchored to a document`. In practice it's
only ever explicitly set `false` by the document-claims path
(`documents.service.ts:269`); conversation-derived entries keep the default
`true`. `reports.service.ts` filters on `recallBased: false` to isolate
document-anchored `TENSION`/`WORRY` entries for special synthesis treatment.
**UNCLEAR**: no code path was found that writes `anchored_question_id`, despite
its schema comment ("which verbatim question produced this entry") — appears to
be a planned-but-unwired field.

---

## 5. The Report

**What triggers synthesis vs. release** — the bridge is
`ReportsListener.onCheckInCompleted`
(`modules/reports/reports.listener.ts:33-64`), which fires on **every**
`CHECK_IN_COMPLETED` event — i.e. every time *any single party* finishes a
session, not only when everyone's done:

```
await this.reports.synthesize(event.groundId);                       // :48
const allDone = await this.grounds.isSessionReadyForReport(...);      // :50
if (!allDone) return;                                                 // :51
```

The comment directly above states the intent: the picture "forms progressively
rather than waiting for every party" (lines 43-47). `release()` is gated
separately, only firing once `isSessionReadyForReport`
(`modules/grounds/grounds.service.ts:1041-1064`) confirms every *active* party
(accepted invite, or already completed this session number) has a `COMPLETED`
check-in for that exact session number, with at least 2 active parties required
(line 1055). Only then does the listener call `release()` and flip the ground to
`GroundStatus.ACTIVE` (listener lines 58-59).

**What's inside the `Report`** (`prisma/schema.prisma:458-475`): `id`, `groundId`
(unique — one report per ground), `sharedPicture`, `agreements` (JSON),
`divergences` (JSON — "the gap, never framed as one side being right"),
`centralQuestion`, `engagement` (JSON), `inferences` (JSON, AI-flagged
non-quoted claims), `promptVersionId`, `releasedAt` (nullable, set once for
everyone), `createdAt`.

The `engagement` blob (assembled across `reports.service.ts:575-694`) carries:
`coverage` (strong/moderate/thin), `documentBacked`, `specificitySignal` (per
party), `sessionCounts`, `documentBackedPct`, `coverageBand`,
`difficultyDisclosures`, `note` (the "not independently verified" disclosure),
`parties` (per-party detail array), `specificityNotes`, `recallNotes`,
`docStatus`, `session2Focus` (carried-over open questions for the next session),
and — added this session per the prompt-extension work —
`hiddenContributors`, `concernFlags`, `specificityCauses`, `leadCalibrationNote`.
`postReportGuides` is merged in later, after release, by
`generatePostReportGuides` (lines 1054-1057), not during `synthesize()`.

**Cross-history synthesis.** The corpus is not scoped to the current session:

```ts
const records = await this.prisma.recordEntry.findMany({
  where: { participant: { groundId } },
  include: { participant: { select: { id: true } }, checkIn: { select: { sessionNumber: true } } },
});
```
(lines 274-280) — every `RecordEntry` for every participant, across the ground's
entire history, tagged with its originating session number at corpus-build time
(line 459). Synthesis rule 7 (line 298) explicitly instructs the model to
cross-reference sessions and name position changes over time, stating "a report
that reads as a snapshot of only the latest session has failed."

**PARTY ROSTER (deterministic, recently added).** Built at
`reports.service.ts:328-342`: counts record entries per participant, then renders
one line per party stating their exact label and either "contributed N record
entries" or "checked in but has no record entries... do not describe their views,
role, or affiliation beyond this exact label," wrapped in a header stating the
exhaustive party count. Rule 13 (line 304) forces the model to treat this roster
as the sole source of truth for party count and identity, forbidding invented
counts or role names (e.g. "founder and funders") not present verbatim in the
roster. This exists because, without it, the model would guess at how many other
parties exist from context alone and fabricate wrong counts/roles — a real bug
this exact mechanism was built to fix.

### 5a. Traced in full: the empty-but-completed-session mechanism behind the hallucination

This is the exact chain that produced the "seven other invited parties" bug, with
every step cited so a persona test can reproduce it deliberately.

**Step 1 — how a session can be "completed" with zero `RecordEntry` rows.**
There are two independent ways this happens:
- **Direct check-in path** (§3): `extractRecordEntries` can legitimately return
  zero entries for a real conversation — the comment at
  `reports.service.ts:310-312` acknowledges this explicitly ("`extractRecordEntries`
  may occasionally produce zero entries for a valid session — we still credit
  the session as contributed"). The check-in still flips to `COMPLETED` regardless
  (`conversation.service.ts:709-718`).
- **Join-link path** (§2a): if `dto.history` is empty, `extractRecordEntries` is
  never even called — but the `CheckIn` row is still created with `status:
  COMPLETED` from the start (`entry.service.ts:894-902`). This is the more
  reliable way to reproduce the bug on purpose, since it doesn't depend on the
  AI extraction step happening to fail.

**Step 2 — does this session still "count"? Yes, in two separate places, and they
disagree with each other:**

- **`contributorIds`** (`reports.service.ts:317-320`) is a `Set` built from the
  union of (a) every participant with at least one `RecordEntry`, and (b) every
  participant with a `COMPLETED` check-in (`checkIn.status`, queried directly,
  no join to `RecordEntry`). A zero-entry-but-completed participant is added to
  this set via branch (b) alone. `absent` (line 321) is `parties.filter(p =>
  !contributorIds.has(p.id))` — so **this participant is never counted as
  absent**, even though they contributed no usable text.
- **`engagementParties`** (`reports.service.ts:519-532`), used to build the
  `engagement.parties` array shown in the UI: `sessions` (line 522) is
  `checkIn.count({ where: { participantId, status: COMPLETED } })` — a pure
  check-in-status count, **independent of `RecordEntry` count**. `recordEntries`
  (line 523, via `recordEntry.findMany`) is the real, separate count and **will
  correctly be 0**. Both numbers are returned side by side in the same object:
  `{ sessions: 1, recordEntries: 0, contributed: true, ... }` is a completely
  valid, real shape this code can produce.

**Step 3 — does this reach the client as something that reads like real
contribution?** Yes. `ReportPage.tsx` renders the "On record" table directly
from `engagement.parties`:
```
{p.contributed ? `${p.sessions ?? 0} session${...}` : 'not yet checked in'}
```
Since `contributed` is `true` (from `contributorIds`, which only checks
check-in status) and `sessions` is `1` (from the status-only count), a
participant who contributed **zero actual content** displays as "1 session" —
visually indistinguishable from a participant who gave a real, substantive
check-in. There is no separate visual signal for "completed but empty."
**UNCLEAR** whether the client reads `recordEntries` anywhere to catch this
case — it wasn't found wired into this specific table row.

**Step 4 — what does synthesis do with this?** Since the `corpus` sent to the AI
is built exclusively from `records` (`RecordEntry` rows, `reports.service.ts:449-461`),
a zero-entry participant contributes **no text at all** to what the model reads
— but, per Step 2, they are also not flagged in `header` as an absent party
(since `absent` never includes them). Before the PARTY ROSTER fix (§5, "recently
added"), this was the exact gap: the model would see real text from only the
genuinely-contributing parties, see no absence note naming the others, and have
no deterministic list of who else exists or how many — so it filled the gap by
inventing a headcount and role names not grounded in anything ("seven other...
founder and funders"). The roster now closes this gap directly: **every** party
appears in the roster regardless of `RecordEntry` count, explicitly labeled
"checked in but has no record entries... do not describe their views, role, or
affiliation beyond this exact label" for the zero-entry ones. This constrains
the model to the roster's exact count and labels, but it does not change Step 2
or Step 3 above — the UI-facing "1 session, contributed: true" discrepancy for
an empty session still exists independently of the synthesis fix.

**How a persona can test this deliberately**: join a ground via the broadcast
link (§2a) and submit with an empty or near-empty chat history (or complete a
direct check-in in a way that yields no extractable claims), then check (a) the
"On record" table on `ReportPage.tsx` for that party — expect it to say "1
session" rather than "not yet checked in" or anything indicating an empty
contribution, and (b) the synthesized `sharedPicture`/`divergences` text —
expect it to correctly avoid describing that party's views (post-roster-fix),
but confirm it doesn't silently omit them from the roster/count either.

**Who can see it — `get()` line by line**
(`modules/reports/reports.service.ts:836-898`):

- **(a) Non-party**: `ForbiddenException` (line 847).
- **(b) Before release, initiator/org-admin**: a locked stub — `{ id, groundId,
  createdAt, releasedAt: null, nextStep }` (`nextStep: 'release'` for the
  initiator, `'wait'` for org admin) — no content (lines 850-851).
- **(c) Before release, a participant** — the "forming" branch (852-867): returns
  the full report row plus `activated: true, forming: true` and a
  `sessionProgress` object flagging whether the requester themselves is among
  the missing parties. The surrounding comment (853-857) states this is
  deliberate: the mutual-reveal gate protects the *final* simultaneous reveal,
  not an openly-incomplete interim picture, so it doesn't apply here.
- **(d) After release — mutual reveal gate** (870-886): a non-initiator
  participant's `ReportActivation` row is checked; if missing or not
  `ACTIVATED`, only a pre-activation stub returns (no content fields). Only after
  the participant separately calls `activate()` (906-931, upserts
  `ReportActivation.status = ACTIVATED`) does a subsequent `get()` return full
  content plus `postReportGuide` and `soloArtifact` (888-897). **The initiator is
  explicitly exempt** from this second gate (line 871 comment: "they released the
  report and can always read it") — the `if (participant && !isInitiator)` guard
  at line 872 skips the check entirely for them.

This is the precise reason "released" and "visible" are two different things:
`releasedAt` being set makes the report exist and fires notifications, but each
non-initiator participant must still individually opt in before seeing content.

**What `release()` does, in order** (lines 789-825): (1) guard — already-released
is a no-op; (2) send `sendReportReady` to every participant via
`Promise.allSettled`, **before** stamping `releasedAt`, so total failure never
leaves a report marked released with nobody told (partial failure logged, not
blocking); (3) stamp `releasedAt`; (4) fire-and-forget `REPORT_RELEASED` usage
event; (5) `generatePostReportGuides` — best-effort, per-participant
`{openingLine, questionToCarry, toAcknowledge, recommendedNextStep}`, merged into
`engagement.postReportGuides`.

Separately, `onGroundActivated`
(`reports.listener.ts:66-104`) also calls `release()` for session-2+ activation
and additionally emails each participant `sendGroundActivated` to invite them
back — distinct from `sendReportReady`.

**UNCLEAR**: whether `sessionCounts` (turns) and `recordEntries`/`sessions`
counts can diverge when `extractRecordEntries` produces zero entries for a
technically-completed session — the code acknowledges this can happen
(lines 310-312) but doesn't describe how the discrepancy is reconciled
downstream.

---

## 6. Session to Session

**Prior-session context injection.** In `composeSystemPrompt`
(`conversation.service.ts:409-568`), for `sessionNumber >= 2` (line 433): all
prior `COMPLETED` check-ins for this participant are queried, ordered ascending
(434-442); up to 6 `RecordEntry` rows per prior session are pulled (line 450,
`type`/`text` only), collapsed into one line per session
(`[S{n}] (type) text | (type) text …`, stripping `[VERIFIABILITY:...]` tags), all
joined and **hard-capped at 800 characters** (line 462). This becomes
`priorSession`, passed into `buildIntakeBlock` — so session 3+ can carry
condensed context from *every* earlier session, not just the one before it,
subject to that 800-char ceiling. The most recent prior session's
`specificityDimensions` is also read to set `lowSpecificityMultiDim` when 3+
dimensions scored `vague`/`managed` (464-469).

**Returning-user protocol.** `buildReturningUserContext`
(`conversation.service.ts:576-637`), for `sessionNumber >= 2`: re-fetches all
prior completed check-ins, pulls `RecordEntry` rows across **all** of them
restricted to `WORRY`/`TENSION`/`COMMITMENT` types, ranks by priority (TENSION >
WORRY > COMMITMENT), and surfaces the top-ranked one as "the most important
unresolved item." The output is an instruction block with an explicit guard
against generic openers ("what have you been working on?") and either a push to
probe a fresh angle (if prior specificity was weak) or a direct "what's changed
since you described this" instruction. Purpose: open returning sessions on the
person's own specific record, not a cold restart.

**Report compounding.** There is exactly one `Report` row per ground
(`groundId` is `@unique`), written via `prisma.report.upsert` — a new synthesis
**replaces** the row, it doesn't create a new one. But the input corpus each time
is the ground's **entire** `RecordEntry` history (see §5), not just the newest
session — so the document is singular and overwritten, while its substance is
longitudinal by construction.

**Cadence mechanics** — `ensureNextSession`
(`conversation.service.ts:749-798`), run on every `complete()`:

- Reads `cadence`/`cadenceAnchorDay` (default `FORTNIGHTLY` if unset).
- `SEQUENTIAL` gets `ownAvailableFrom: null` — "no auto-scheduled clock"
  (lines 756-759).
- `cadenceToDate` (810-833): `DAILY` → +1 day; `MONTHLY` → +1 calendar month,
  clamped to `cadenceAnchorDay` (1-31) if set; `WEEKLY`/`FORTNIGHTLY` → +7/+14
  days, then rolled forward to the next matching weekday if `anchorDay` (0-6)
  is set.
- The next check-in is only created if it doesn't already exist and wouldn't
  fall past `ground.endsAt`.
- **SEQUENTIAL trigger** (768-797): when the *initiator* completes their own
  session, every other participant with a linked account gets their earliest
  `NOT_STARTED` check-in's `availableFrom` bumped to `now` (or a new next-session
  check-in created with `availableFrom: now` if none exists yet) — the lead
  finishing their own session is what opens the whole team's next round, with no
  calendar math involved. (This is one of the two places the SEQUENTIAL lock set
  in §2 gets cleared — the other is the accept-time catch-up.)

**Session-ready notifications.** `sendSessionReadyNotifications`
(`modules/grounds/grounds.cron.ts:285-334`) runs every 15 minutes. Each sweep
finds `CheckIn` rows with `sessionNumber > 1`, `status: NOT_STARTED`,
`sessionReadyNotifiedAt: null`, `availableFrom <= now` — deliberately covering
both the cadence-scheduled path and the SEQUENTIAL trigger path, since both only
ever set `availableFrom` (session 1 is excluded — that person already got an
invite email). For each, the participant's single most recent `RecordEntry` text
is pulled as "Last time: ..." context, sent via WhatsApp if the participant has a
phone number and WhatsApp is enabled, else email, and `sessionReadyNotifiedAt` is
stamped to prevent re-sending.

---

## Summary of open UNCLEARs

**Resolved since first draft:**
- ~~How `sessionCounts`/`contributed` vs. `recordEntries` reconcile when
  extraction yields zero entries for a completed session~~ — traced fully in
  §5a. Confirmed: `contributed: true` and `sessions: 1` can both be true
  alongside `recordEntries: 0`, and the client displays this as an
  indistinguishable-from-real "1 session." Genuinely open sub-question:
  whether `recordEntries` is read anywhere client-side to catch this case —
  not found.
- ~~The broadcast/anonymous join-link flow (`joinToken`)~~ — traced fully in
  §2a, including the org-landing behavior, the `isEmailVerified` difference
  from direct invite, the no-email data-loss path, and the missing
  duplicate-participant guard.
- ~~Whether "substantive answers" in the completion gate is enforced by
  anything beyond a raw turn count~~ — it wasn't; now fixed. `complete()`
  (§3) checks both turn count (≥3) and total person-turn character length
  (≥120 chars), so three one-word replies no longer pass. See §3 for the exact
  thresholds and error messages.

**Still open:**
- Exact free-tier/access-code validation rules (billing module internals).
- No "artifact ready" event exists for the solo artifact — clients must poll.
- `DOCUMENT_AFTER`, `ANCHORED_RECALL`, `UNANCHORED_RECALL` evidence types appear
  unused by any current code path.
- `anchored_question_id` on `RecordEntry` has no writer found.
- Precisely how a duplicate `joinCommit` on the same ground/email surfaces to
  the user (§2a) — the DB unique-constraint throw has no visible catch/friendly
  error wrapper found around it.

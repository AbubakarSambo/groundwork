# Findings: Pass 2 (sessions and state) and Pass 3 (data integrity and truth claims)

Date: 2026-09-10. Read-only audit. Paths are relative to the repository root
`/Users/hafsahjumare/Documents/GitHub/groundwork/`.

Scope note: findings already recorded in `browser_to_code.md` and `notify_to_code.md` are not
restated. Where those files said "needs code pass", the cause is recorded here and the original ID
is cited.

No exposed secret value was read or printed. No live cross-organisation data leak was found. The
plaintext WhatsApp secret columns are already recorded as NL-015 and are not re-filed.

---

## Pass 2

### Severity counts, Pass 2

| Severity | Count |
|---|---|
| Blocker | 6 |
| Major | 12 |
| Minor | 6 |
| Note | 4 |
| **Total** | **28** |

---

### P2-001

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:542-552, 634-637, 654-660, 739`
Observed: `open()` treats "an AI turn already exists" as its idempotency guard, returning early at
`:552`. The session meter then decrements at `:634-637` and increments `freeSessionsUsed` at `:659`.
The AI turn that closes the guard is not written until `:739`, after a full model round trip. The
whole metering block sits inside the open window.
Expected: The comment at `:542-545` states the guard "closes the TOCTOU window". A charge is
expected to happen once per session and only when the session actually starts.
Impact: Two concurrent opens both read no AI turn, both pass the `roundAlreadyStarted` check at
`:570-582`, and both decrement. A balance of 10 becomes 8 for one session. Separately, if the model
call or the turn write fails after `:637`, the customer is charged for a session that does not
exist, with no compensating write anywhere. `freeSessionsUsed` at `:659` is a bare increment with no
guard at all.
Evidence: `:635-636` `where: { id: checkIn.groundId, sessionsBalance: { gt: 0 } }, data: { sessionsBalance: { decrement: 1 } }`
is atomic per statement, so it prevents a negative balance and nothing more. The correct pattern is
in the same codebase at `api/src/modules/billing/billing.service.ts:465-478`, whose comment at
`:448-459` describes this exact check-then-act race for Stripe invoices.
Confidence: High

### P2-002

Severity: Blocker
Axis: Security
Location: `api/src/modules/entry/entry.service.ts:1037, 1086-1089`; `api/src/modules/entry/entry.controller.ts:260, 300`
Observed: `EntryService` is a default-scoped Nest singleton. It holds `private lastReplyHadCloseMarker`
as instance state, set at `:1039` on every reply and read by the controller through
`didLastReplyClose()` at `entry.controller.ts:262` and `:300`.
Expected: Whether a session closed is a property of one visitor's conversation.
Impact: `/entry/chat` and `/entry/chat/stream` are `@Public()` and anonymous. Two visitors chatting
concurrently share one flag. Visitor A's closing reply sets it true; visitor B's next reply is then
reported `sessionComplete: true` and B's setup ends early on somebody else's conversation. There is
one flag for the whole process.
Evidence: `:1086` `private lastReplyHadCloseMarker = false;` with a single assignment at `:1039` and
no keying by conversation, session or request. The comment at `:1037` says it "is read by the
controller immediately after this call", which is true per request and false under concurrency.
Confidence: High

### P2-003

Severity: Blocker
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:826` versus `:1178`; guard rationale at `:757-770`
Observed: The non-streaming `sendMessage` calls `assertGroundAcceptsInput` at `:826`, which refuses
input on a PAUSED, CLOSED or STALLED ground. `sendMessageStream` calls only `loadOwnedCheckIn` at
`:1178` and never calls `assertGroundAcceptsInput`.
Expected: The comment at `:757-770` states the rule plainly: "A hold that keeps accepting answers is
not a hold."
Impact: The streaming endpoint is the one the client actually posts to. A ground paused for active
legal proceedings keeps accepting and recording answers. The permissive loader at `:1178` also
allows a DECLINED check-in to keep taking streamed messages.
Evidence: The guard call appears at `:826` and nowhere in the stream path.
Confidence: High

### P2-004

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/grounds/grounds.cron.ts:243-291` versus `api/src/modules/conversation/conversation.service.ts:3116-3251`
Observed: There are two completions. `complete()` runs specificity scoring, `extractRecordEntries`,
`anchorRecordToDocuments`, the dependency/work/expectation/alignment/progress/objection extractors,
`rememberStyle`, `buildSoloArtifact`, then `ensureNextSession` at `:3245`. The 30-minute auto-close
cron writes `status: COMPLETED, completedAt: now` at `:286-287`, emits the domain event at `:289`,
and does none of the rest.
Expected: A check-in marked COMPLETED has a record extracted from it and a next session waiting.
Impact: A person who abandons at 12 hours idle is auto-completed with an empty record. That session
is then counted as COMPLETED by every reader (`grounds.service.ts:3877`, `reports.service.ts:2049`,
the board) while contributing nothing, which silently dilutes every report it appears in. And
because the cron never calls `ensureNextSession`, no session N+1 exists, so the person who abandoned
is exactly the person with nowhere to return to.
Evidence: `grep -rn ensureNextSession api/src` returns three callers only:
`conversation.service.ts:3245`, `entry.service.ts:1594`, and the definition.
Confidence: High

### P2-005

Severity: Blocker
Axis: Bug
Location: `api/src/modules/grounds/grounds.service.ts:4134-4141, 4223-4226`; `api/src/modules/conversation/conversation.service.ts:796-797`
Observed: `pauseGround` writes `status: PAUSED, pausedAt: new Date()`. No code anywhere transitions a
ground out of PAUSED. `grep -rn "PAUSED" api/src` (non-spec) returns four hits: the docstring, the one
write, and two reads.
Expected: The docstring at `:4137` claims "an admin can un-pause by transitioning back to the prior
status", and the user-facing error at `conversation.service.ts:797` says "Nothing can be added to it
until it is resumed."
Impact: Pausing is a one-way door. A ground paused for a legal hold can never be reopened, and the
product tells the user it can. `pausedAt` does not record the prior status, so the promised
transition could not be written without a schema change.
Evidence: The claim at `:4137` against the absence of any write moving status away from PAUSED.
Confidence: High

### P2-006

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/whatsapp/whatsapp.controller.ts:52, 74-77, 107-110`; `api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:42-44`
Observed: Both inbound WhatsApp routes verify the Meta HMAC correctly and fail closed
(`whatsapp.service.ts:54-71`). Neither reads `message.id`, the `wamid`. The handler reads
`message.from` and `message.text?.body` only, then swallows every error and returns 200.
Expected: Meta retries inbound delivery. A retry must not append a second turn.
Impact: A retry after a write that timed out re-enters `sendMessage` and writes a second
`ConversationTurn` into a permanent record. Returning 200 on genuine failure also means a real
failure is never retried, which is the worst of both. `InboundMessage.providerId @unique`
(`api/prisma/schema.prisma:688`) is the email model and is written only by
`api/src/modules/email/delivery.service.ts:117`; it gives WhatsApp nothing.
Evidence: `whatsapp.controller.ts:74-77` reads two fields and no id; `wamid` appears nowhere on
either route.
Confidence: High

### P2-007

Severity: Major
Axis: Security
Location: `api/src/modules/back-office/the-back-office-has-a-door.ts:27-31`; `api/src/modules/back-office/back-office-door.guard.ts:16-17`; `api/src/main.ts:74`
Observed: The door decides what to protect by matching a regex against the raw request path:
`const THE_BACK_OFFICE = /^\/api\/v1\/(ops|admin)(\/|$|\?)/`. The path comes from
`req.originalUrl ?? req.url` at `back-office-door.guard.ts:16`. The regex is case-sensitive and
operates on the undecoded URL. Express route matching is case-insensitive by default and matches on
the decoded path; no `caseSensitive: true` is set anywhere.
Expected: Every route served by the admin and ops controllers sits behind the door.
Impact: A request to `/api/v1/ADMIN/...` or `/api/v1/%61dmin/...` would be routed to the admin
controller by Express while failing the door's regex, so `mayOpen` returns
`{ open: true, because: 'not-the-back-office' }` and the emailed-code requirement is skipped
entirely. Any signed-in customer user could reach admin routes that only the door and role guards
protect.
Confidence: Unverified
Check needed: With a valid non-staff bearer token, `curl -i -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/ADMIN/usage`
and the same with `/api/v1/%61dmin/usage`. A 403 carrying `BACK_OFFICE_CODE_REQUIRED` means the door
held. Any other status, including 401/403 from a different guard or a 200, means the door was
bypassed and only the role guard remained.

### P2-008

Severity: Major
Axis: Security
Location: `api/src/modules/auth/auth.service.ts:771-782, 423`
Observed: `resetPassword` writes `passwordHash` only. There is no session table, no token denylist,
no `tokenVersion` and no `passwordChangedAt` column in `api/prisma/schema.prisma`.
Expected: Resetting a password ends other sessions. This is what a person resetting a password after
a suspected compromise believes they are doing.
Impact: Every token minted before the reset stays valid for its full 7 days
(`api/src/modules/auth/auth.module.ts:20`). The attacker keeps access; the victim has no way to
revoke it and no screen listing active sessions. This is NL-026, filed there as Minor; the absence
of any revocation mechanism at all makes it Major.
Evidence: `jwt.strategy.ts:29-49` re-reads the user each request but has nothing to compare a token
epoch against.
Confidence: High

### P2-009

Severity: Major
Axis: Security
Location: `api/src/modules/auth/auth.service.ts:816-823`; `api/src/modules/auth/strategies/google.strategy.ts:24-30`
Observed: `GoogleStrategy.validate` takes `emails[0].value` from the profile and never checks the
profile's `email_verified`. In `findOrCreateGoogleUser`, an unrecognised `googleId` whose email
matches an existing user is linked to that account and `isEmailVerified` is forced true at `:820`.
Expected: An account is linked only on a Google-verified address.
Impact: Where a Google account can carry an unverified address, signing in with it takes over the
matching existing account and, because that path mints `via: 'google'`
(`auth.service.ts:854, 887`), walks straight past the back-office door with no emailed code.
Confidence: Unverified
Check needed: Confirm with the configured OAuth client whether `profile.emails[0].verified` can ever
be false. If it can, this is a Blocker.

### P2-010

Severity: Major
Axis: Bug
Location: `api/src/modules/auth/auth.service.ts:1145-1164`
Observed: OAuth exchange codes live in `private readonly oauthCodes = new Map(...)`, a
process-local Map with a 60-second TTL. It is the only mutable in-memory Map in `api/src/modules`.
Expected: A Google sign-in that has just been redirected back completes.
Impact: A restart between the redirect and the exchange fails the sign-in with "Invalid or expired
exchange code". Behind two instances, Google sign-in breaks whenever the exchange lands on a
different instance than issued the code, which is most of the time. The file says so itself at
`:1145-1146`; it is still shipped behavior with no fallback and a misleading error message.
Confidence: High

### P2-011

Severity: Major
Axis: Security
Location: `api/src/app.module.ts:52`; `api/src/common/guards/a-sync-loop-is-not-a-browser.ts:32, 63-76`
Observed: `ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 60 }])` is registered with
no `storage` option, so Nest's default in-memory `ThrottlerStorageService` is used. The machine
override re-keys to `credential:${credential}` at a ceiling of 600/min and rides the same storage.
Expected: A rate limit is a limit.
Impact: A process restart resets every counter, so restarting is a free way to shed a limit. With N
instances the effective allowance is N x 60 per IP and N x 600 per credential. Unlike `oauthCodes`,
the single-process assumption is not written down at the call site. This governs the OTP routes and
the public entry routes, so it is a security control, not a courtesy.
Confidence: High

### P2-012

Severity: Major
Axis: Bug
Location: `api/src/modules/grounds/grounds.service.ts:2429-2436, 2682-2684`
Observed: `addParticipant` guards only against `AWAITING_APPROVAL`. The write at `:2682-2684` is
`if (ground.status !== GroundStatus.AWAITING_LEAD) { ... status: AWAITING_PARTIES }`, with no
`hasEnded` check.
Expected: A CLOSED, RESOLVED or STALLED ground is over.
Impact: Adding a participant resurrects a terminal ground into AWAITING_PARTIES. Billing, reminders
and the board all restart on a record the parties were told was finished.
Evidence: `api/src/modules/grounds/a-ground-that-has-ended.ts:18` defines the terminal set and is not
consulted here.
Confidence: High

### P2-013

Severity: Major
Axis: Bug
Location: `api/src/modules/reports/reports.listener.ts:84-87`
Observed: On report release the listener sets `status: GroundStatus.ACTIVE`, guarded only by
`hasEnded(g.status)`, which covers RESOLVED, CLOSED and STALLED. PAUSED is not in that set.
Expected: A legal hold survives a report release.
Impact: Releasing a report silently un-pauses a ground that was paused for active legal proceedings
and restarts billing. The comment directly above documents having already been bitten by this class
of bug for CLOSED, and the same fix was not extended to PAUSED.
Confidence: High

### P2-014

Severity: Major
Axis: Bug
Location: `api/src/modules/grounds/grounds.cron.ts:21, 118, 133-136`
Observed: `TERMINAL` excludes PAUSED, so the 3 AM stall cron selects paused grounds as stall
candidates at `:118` and writes `STALLED` at `:135`.
Expected: A paused ground's clock is paused.
Impact: A ground paused for a legal hold is converted, unattended, into a terminal STALLED state
which has no writer out of it. Combined with P2-005, the pause is destroyed rather than honoured.
Confidence: High

### P2-015

Severity: Major
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:1029-1030, 1346-1347` versus `:634-660`
Observed: All session metering lives in `open()`. `sendMessage` and `sendMessageStream` flip
`NOT_STARTED` to `IN_PROGRESS` themselves and contain no billing call; grep over lines 824-1100 for
`billing`, `canStartSession` and `sessionsBalance` returns nothing.
Expected: A session that runs is a session that is counted.
Impact: A client that posts an answer without first calling `open()` runs a full session free and
uncounted. The paywall is enforced on one of two entry points into the same conversation.
Confidence: High

### P2-016

Severity: Major
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:5067, 5162, 3371-3417`; `api/prisma/schema.prisma:1255`
Observed: `clarify`, `correctSession` and `createNextIfAbsent` each compute
`nextSession = last + 1` and then `create`, with no transaction and no catch on P2002. The table
carries `@@unique([participantId, sessionNumber])`.
Expected: A double click produces one session or one clear message.
Impact: Two concurrent requests produce an unhandled Prisma P2002 surfacing as a 500. On
`createNextIfAbsent` this throws out of `complete()`, so the person who just finished a session sees
a server error at the moment their work is being saved.
Confidence: High

### P2-017

Severity: Major
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:3197-3206, 3014`
Observed: `complete()` has no status guard in its `where` clause. The only check is an in-memory read
at `:3014`.
Expected: A check-in completes once.
Impact: Two concurrent completes run all twelve extractors twice and emit `CHECK_IN_COMPLETED`
twice, duplicating record entries, dependencies and objectives, and double-firing every listener
including the report builder and the outbound webhook queue.
Confidence: High

### P2-018

Severity: Major
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts` (whole file), `:855, 1017, 1025`
Observed: `grep -Fn 'transaction'` over 5,297 lines returns one hit, and it is a comment at `:4832`.
There is no `$transaction` and no advisory lock in the entire conversation module. `CheckIn` has no
`version` and no `updatedAt`. The person's turn is written at `:855`, the model is called, the AI
turn is written at `:1017`, and on a thrown error the person's turn is deleted by hand at `:1025`
with `.catch(() => undefined)`.
Expected: A turn and its reply either both land or neither does.
Impact: If the process dies rather than throwing, the person's turn is orphaned with no reply and no
compensation. The hand-rolled delete is the only unwind and it is itself best-effort.
Confidence: High

### P2-019

Severity: Major
Axis: Experience
Location: `client/src/stores/auth.ts:46-51`; `client/src/pages/entry/EntryChatPage.tsx:2111, 2113`; `client/src/lib/entry-handover.ts:61`
Observed: `logout()` clears `token`, `auth-storage-v2` and the `gw_in` cookie. Nineteen other
localStorage keys survive, including `gw_draft_token` (a live bearer credential accepted by
`PATCH /entry/draft` on its own, `api/src/modules/entry/entry.service.ts:1745-1781`),
`gw_commit_payload` and `gw-new-ground-draft` (both carrying colleagues' email addresses),
`gw-participant-session` (carrying an `inviteToken`) and `gw_magic_email`.
Expected: Signing out on a shared machine removes what the previous person left.
Impact: The next person at the same browser inherits a usable draft credential, a colleague email
list and a prior entry transcript. Only `gw-new-ground-draft` has a TTL (48h,
`client/src/lib/what-you-typed-survives-a-reload.ts:36`); the rest have neither TTL nor version tag.
Confidence: High

### P2-020

Severity: Major
Axis: Bug
Location: `client/src/stores/entry.ts:10-14`; `client/src/pages/entry/EntryChatPage.tsx:1182, 1195, 1206, 1356, 1360, 1869-1870`
Observed: This is the cause of BR-011. The anonymous entry conversation is persisted by
`saveSession` into `gw_entry_session`, but the inferred session count lives in a Zustand store
created with no `persist` middleware and a literal default of `sessions: 1`. `cadence`
(`useState('FORTNIGHTLY')` at `:1182`), `cadenceChosen` and `cadenceAnchorDay` are plain component
state and are also absent from `saveSession`.
Expected: A reload restores what the person set up.
Impact: Worse than the cosmetic reset the browser pass saw. `sessions` is display-only and is never
sent, but `cadence` is sent at `:1869`, and after a reload it is the untouched `'FORTNIGHTLY'`
literal with `cadenceChosen` false. The server then writes it as a real choice
(`api/src/modules/entry/entry.service.ts:1397, 1477`,
`cadence: (dto.cadence && cadenceMap[dto.cadence]) ? ... : Cadence.FORTNIGHTLY`). A person who chose
a weekly cadence, reloaded, and saved gets a fortnightly ground and is never told.
Confidence: High

### P2-021

Severity: Minor
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:5011-5013`
Observed: `decline()` routes through `loadOwnedOpenCheckIn`, which permits `IN_PROGRESS`. DECLINED
is absorbing (`:5261`) and nothing sets `closedReason`.
Expected: Declining is an answer to the willingness question at the start.
Impact: A person mid-session who presses decline loses the session with no path back. Their existing
turns stay in the database and are never extracted.
Confidence: High

### P2-022

Severity: Minor
Axis: Inconsistency
Location: `api/prisma/schema.prisma:158-163`; `api/src/modules/grounds/grounds.service.ts:4408-4416`; `api/src/modules/board/board.service.ts:517`
Observed: `CheckInStatus.DECLINED` is read in three places but written in exactly one
(`conversation.service.ts:5012`), reachable only from an explicit decline route.
Expected: `closedReason` carries the literal `"willingness_declined"`
(`api/prisma/schema.prisma:1207`), implying the willingness gate produces this status.
Impact: A person who answers the willingness question with no is not recorded as DECLINED by that
answer. The board chip at `board.service.ts:517` is effectively dead for the case it names.
Confidence: Medium

### P2-023

Severity: Minor
Axis: Inconsistency
Location: `api/src/modules/auth/auth.service.ts:1249`; `api/src/modules/auth/strategies/jwt.strategy.ts:12-13`
Observed: The `via` claim is typed `'password' | 'link' | 'google'`. `'link'` is never passed by any
caller. Magic-link, verify-email and entry-handover sign-ins all flow through `buildAuthResponse`
(`:982`) and take the `'password'` default.
Expected: The three declared values correspond to the three doors.
Impact: A magic-link session is indistinguishable from a password session in the token. Any future
policy keyed on `via` will silently treat a link sign-in as a password sign-in.
Confidence: High

### P2-024

Severity: Minor
Axis: Inconsistency
Location: `api/src/modules/auth/auth.service.ts:1238`
Observed: `switchOrganization` mints through `generateToken(user)` and so drops `via` back to
`'password'`.
Expected: Switching organisation does not change how you signed in.
Impact: A Google-signed-in staff member loses back-office access the moment they switch
organisation, and is asked for an emailed code with no explanation. Fails safe, so Minor.
Confidence: High

### P2-025

Severity: Minor
Axis: Bug
Location: `api/src/modules/auth/strategies/jwt.strategy.ts:29-46`
Observed: `validate()` reads `user.organizationId` from the User row and never checks
`organizationMembership`. `switchOrganization` (`auth.service.ts:1221-1235`) does check membership on
the way in.
Expected: Removing somebody's membership removes their access to that org.
Impact: Deleting the membership row alone does not change `User.organizationId`, so the removed
person keeps the old organisation active until something else rewrites the user row.
Confidence: Medium

### P2-026

Severity: Minor
Axis: Security
Location: `api/src/modules/public-api/approved-or-machine.guard.ts:26-32`; `api/src/modules/public-api/machine-token.guard.ts:99-113`; `api/src/modules/embed/embed-session.guard.ts:35-41`
Observed: Three guards decide entirely from token claims with no database read.
`ApprovedOrMachineGuard` returns true at `:29-32` on `claims.typ === 'machine'` before any query, and
takes `organizationId` from the token for the human branch. `EmbedSessionGuard` takes `org` and `pid`
from claims and never re-reads `person.active`.
Expected: Revoking a credential or deactivating a person takes effect.
Impact: A revoked machine credential and a deactivated embed person both keep working for the
remaining life of the token, up to 900 seconds. `MachineTokenGuard` documents this as deliberate at
`:20-22`; the other two do not.
Confidence: High

### P2-027

Severity: Note
Axis: Security
Location: `api/src/config/configuration.ts:107`; `api/src/modules/auth/auth.module.ts:18`; `api/src/modules/auth/strategies/jwt.strategy.ts:25`; `api/src/main.ts:18-31`
Observed: `jwt.secret` falls back to the literal `"super-secret-key"`, and two further sites add a
second fallback `|| 'fallback-secret'`, which is unreachable because the config default is always
truthy. `assertProductionConfig` at `main.ts:18` refuses to boot on that default, but only when
`NODE_ENV === 'production'` (`:19`).
Expected: Signing keys are never defaults.
Impact: Production is protected. Staging, preview and any deployment that does not set
`NODE_ENV=production` signs and verifies with a constant that is in the repository. No harm on the
production path, hence Note, but the two dead `'fallback-secret'` literals make the real default
hard to see.
Confidence: High

### P2-028

Severity: Note
Axis: Inconsistency
Location: `api/src/modules/public-api/idempotency.service.ts:9, 35, 70-78`; `api/src/modules/public-api/public-api.controller.ts:177-181, 208-213`
Observed: The module docstring promises "A RETRY MUST BE INDISTINGUISHABLE FROM THE ORIGINAL CALL."
The mechanism is opt-in on an `Idempotency-Key` header (`:35` returns `work()` when absent) and is
wired to 2 of roughly 40 mutating public-api routes. Rows are never pruned. `work()` and the record
write are not in one transaction.
Expected: The docstring's promise.
Impact: `POST /check-ins`, `POST /people`, `POST /check-ins/:id/open` and 35 others double-create on
retry. The self-documented race at `:70-78` is justified as harmless "because every endpoint behind
this is an upsert", which is true of `POST /subjects` and not of `POST /subjects/bulk`, which starts
a job.
Confidence: High

---

### State machine: CheckIn

Enum at `api/prisma/schema.prisma:158-163`. No `expiresAt`, no `abandonedAt`, no `phase`, no `step`,
no `version`, no `updatedAt`. Unique key `@@unique([participantId, sessionNumber])` at `:1255`.

| From | Input / event | To | Code | Guard on prior status |
|---|---|---|---|---|
| (none) | ground creation, add participant, join | NOT_STARTED | `grounds.service.ts:491, 615, 640, 790, 2655`; `entry.service.ts:1951` | n/a |
| (none) | completion of session N | NOT_STARTED (N+1) | `conversation.service.ts:3417` | look-then-create only, no DB guard |
| (none) | `POST /grounds/:id/clarify` | NOT_STARTED (new session) | `conversation.service.ts:5069-5077` | no |
| (none) | `POST /grounds/:id/correct-session` | NOT_STARTED (new session) | `conversation.service.ts:5166-5175` | yes, on the target (`:5117`, `:5129`) |
| NOT_STARTED | `POST /check-ins/:id/open` | IN_PROGRESS | `conversation.service.ts:747` | only not-COMPLETED (`:510`), not-DECLINED (`:5261`) |
| NOT_STARTED | `POST /check-ins/:id/messages` | IN_PROGRESS | `conversation.service.ts:1029-1030` | yes |
| NOT_STARTED | `POST .../messages/stream` | IN_PROGRESS | `conversation.service.ts:1346-1347` | yes |
| IN_PROGRESS | `POST /check-ins/:id/complete` | COMPLETED | `conversation.service.ts:3197-3206` | no guard in the `where`; in-memory read at `:3014` only |
| IN_PROGRESS | cron, 12h idle or 48h age | COMPLETED | `grounds.cron.ts:284-287`, selected `:246` | yes, in the query |
| NOT_STARTED, IN_PROGRESS | `POST /check-ins/:id/decline` | DECLINED | `conversation.service.ts:5012` | via loader `:5256-5265` |
| COMPLETED | anything | (refused) | `conversation.service.ts:5258` | yes |
| DECLINED | anything | (refused) | `conversation.service.ts:5261-5262` | yes |

COMPLETED and DECLINED are absorbing. No writer moves a CheckIn out of either.

### State machine: Ground

Enum at `api/prisma/schema.prisma:137-152`. Terminal set
`A_GROUND_IS_OVER = [RESOLVED, CLOSED, STALLED]` at
`api/src/modules/grounds/a-ground-that-has-ended.ts:18`.

| From | Input / event | To | Code | Guard on prior status |
|---|---|---|---|---|
| (none) | create | AWAITING_APPROVAL or OPEN | `grounds.service.ts:404` | n/a |
| (none) | admin creates for a lead | AWAITING_LEAD | `grounds.service.ts:442-453` | n/a |
| AWAITING_APPROVAL | admin approves | OPEN | `grounds.service.ts:3492-3494` | yes (`:3487`) |
| AWAITING_APPROVAL | admin declines | CLOSED | `grounds.service.ts:3525-3532` | yes (`:3522`) |
| AWAITING_LEAD | lead confirms | per `confirmLead` | `grounds.service.ts:721` | yes |
| any except AWAITING_LEAD | add a participant | AWAITING_PARTIES | `grounds.service.ts:2682-2684` | **no terminal guard (P2-012)** |
| any non-terminal | report released | ACTIVE | `reports.listener.ts:87` | `hasEnded` only; **PAUSED not covered (P2-013)** |
| any | admin activate | ACTIVE | `grounds.service.ts:2979-2982` | **none** |
| (none) | solo entry, zero contributors | ACTIVE | `entry.service.ts:1734` | no |
| OPEN, AWAITING_PARTIES, REPORT_READY, ACTIVE | pause | PAUSED | `grounds.service.ts:4223-4226` | yes (`:4212-4219`) |
| any non-terminal, incl. PAUSED | 3 AM cron, deadline passed | STALLED | `grounds.cron.ts:133-136` | partial; **PAUSED swept in (P2-014)** |
| non-CLOSED, non-RESOLVED | all parties confirm an end state | CLOSED | `resolution.service.ts:267-270` | yes (`:65`, `:186`) |
| PAUSED | resume | **no transition exists (P2-005)** | — | — |

Two enum values are unreachable. REPORT_READY is never written; the schema says so at `:145`.
RESOLVED is never written by any code, only read; the real resolved terminal is CLOSED.

### Undefined transitions and interruption cases

| # | State and input | What actually happens | Finding |
|---|---|---|---|
| 1 | PAUSED, admin wants to resume | No code path. Docstring claims one exists. | P2-005 |
| 2 | CLOSED / STALLED, add a participant | Resurrected to AWAITING_PARTIES. | P2-012 |
| 3 | PAUSED, report released | Silently set ACTIVE, billing restarts. | P2-013 |
| 4 | PAUSED, deadline passes | Swept to terminal STALLED. | P2-014 |
| 5 | PAUSED / CLOSED / STALLED / DECLINED, streaming message | Accepted and recorded. | P2-003 |
| 6 | NOT_STARTED with future `availableFrom`, `open()` | Opens and meters. Deliberate per `conversation.service.ts:466-470`, but the board's scheduling arithmetic and the actual gate then disagree. | Note |
| 7 | NOT_STARTED, message without `open()` | Runs free and uncounted. | P2-015 |
| 8 | IN_PROGRESS, decline | Session lost, turns orphaned, no way back. | P2-021 |
| 9 | COMPLETED by auto-close, person returns | 400, and no session N+1 exists. | P2-004 |
| 10 | Abandon midway | No expiry column. Warning at 11h, force-complete at 12h idle or 48h. Resume works until the auto-close and is impossible one second later. | P2-004 |
| 11 | Two tabs, different messages | Both persist and interleave. Mitigation is text-identity only (`conversation.service.ts:808-822`); no version, no transaction. `startedAt` can move backwards. | P2-018 |
| 12 | Network fails between steps | Person's turn deleted by hand at `:1025` on a throw; orphaned if the process dies. In `open()` the charge has no compensating path at all. | P2-001, P2-018 |
| 13 | Same request twice | Route-dependent; see P2-028. | P2-028 |
| 14 | Two people finish a round simultaneously | Safe. `round-completion.ts:50-60` is idempotent by a unique row. The one place in the flow that gets it right. | — |

---

## Pass 3

### Severity counts, Pass 3

| Severity | Count |
|---|---|
| Blocker | 4 |
| Major | 10 |
| Minor | 6 |
| Note | 3 |
| **Total** | **23** |

---

### P3-001

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:152-157`; `api/src/modules/reports/reports.service.ts:1306-1312`
Observed: The band mapper is not monotonic. `mapSpecificityLevel` returns `'specific'` at >= 0.6,
`'directional'` at >= 0.35, `'vague'` at >= 0.15, and `'managed'` below 0.15. The report then ranks
`{ vague: 0, directional: 1, managed: 2, specific: 3 }`. So the lowest possible score maps to
`'managed'`, which ranks 2, above `'vague'` at 0 and `'directional'` at 1.
Expected: A worse session scores lower.
Impact: A participant who said almost nothing scoreable is reported as more specific than one who
gave a directional answer, and their mean pulls the whole party toward `specificityLabel: 'high'`
(`:1312`) and confidence band `'well covered'`. This is a number presented as fact that is inverted
at the bottom of its range. It also runs through all five dimensions at `:3479-3483`, and through the
zero-turn default at `:3465`, which writes `'vague'` (rank 0) while its dimensions all write
`'managed'` (rank 2).
Confidence: High

### P3-002

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:3486-3489, 159-162`
Observed: `recallConfidence: mapRecallConfidence(avgSpecificity)`. Recall confidence is computed from
the specificity average. There is no recall measurement anywhere.
Expected: "How much of this was recalled versus checked against something written down" is a
different question from "how specific was it".
Impact: The report presents two readings as independent corroboration when they are one number under
two names. The user-facing sentence "Most of it was anchored to something written down"
(`api/src/modules/reports/the-session-report.ts:631`) is a claim about documentary evidence derived
from a keyword count for digits and dates. Same field written to `CheckIn.recallConfidence` and read
by the board and the report.
Confidence: High

### P3-003

Severity: Blocker
Axis: Bug
Location: `api/src/modules/reports/the-session-report.ts:616-633`; `client/src/components/gw/HowSpecificThisSessionWas.tsx:19-24`
Observed: `howClear()` branches on `'HIGH' | 'high'` and `'LOW' | 'low'`. The writer only ever emits
`specific | directional | vague | managed` and `certain | mostly_certain | uncertain`. Two
vocabularies for the same two columns.
Expected: The three clarity sentences at the foot of every shared report reflect the score, as the
comment at `:619-620` describes.
Impact: Every shared report falls through to the middle branch at `:625` and says "What people said
was specific in places and general in others" regardless of the actual score, including on a session
scored `specific` and on one scored `managed`. The recall clause at `:627-632` is always the empty
string, so recall never reaches a reader at all. The client component has the same mismatch and
renders nothing.
Confidence: High

### P3-004

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:3116`; `api/src/modules/reports/reports.service.ts:1303`; `api/src/modules/reports/confidence-in-the-picture.ts:43-49`
Observed: Scoring is called as
`await this.scoreSessionSpecificity(checkIn.id).catch(() => null)`, and a null writes
`specificityLevel: null` at `:3201`. The report then selects `specificityLevel: { not: null }`, so a
failed score silently leaves the denominator. If every score failed, `scoredSessions` is 0.
Expected: The zero branch means what its own comment says it means:
"Nobody has been asked, which is a fact about the ground."
Impact: The report then prints "Nothing has been scored here yet, so this part of the picture has
not been built rather than being empty" about a ground where people did answer and the scorer threw.
A processing failure is presented to the reader as a fact about who was asked. There is no counter,
no log at the call site and no user-visible signal.
Confidence: High

### P3-005

Severity: Major
Axis: Data integrity
Location: `client/src/pages/admin/AdminPage.tsx:715, 716, 752`; `api/src/modules/prompts/prompts.service.ts:431-442`
Observed: This is BR-014. All three numbers come from one route and three lines of one
`Promise.all`, against three different tables.

- "Check-ins completed" 484 is `prompts.service.ts:440`
  `this.prisma.checkIn.count({ where: { status: 'COMPLETED' } })`. One row per person per session.
- "Check-ins created" 243 is `prompts.service.ts:442` `this.prisma.ground.count()`. **A count of
  grounds.** The tile has never counted check-ins.
- "Check In Completed" 359 is `prompts.service.ts:436`
  `usageEvent.groupBy({ by: ['type'] })`, a count of append-only event rows.

Expected: Three tiles side by side, two of them labelled "check-ins created" and "check-ins
completed", describe the same population.
Impact: 484 against 243 is a grain mismatch, not a funnel: a ground with two participants over one
session produces two check-ins, and 243 x 2 = 486 is approximately 484. 484 against 359 is a
coverage gap: `UsageEventType.CHECK_IN_COMPLETED` is emitted in exactly one place
(`conversation.service.ts:3206`), while `status` is set to COMPLETED in three
(`grounds.cron.ts:288` auto-close, `grounds.cron.ts:672` the 4 AM backstop, and `complete()`).
Neither cron path emits a usage row, so the 125 difference is at minimum the auto-closed
population, which is precisely the people who never came back and the group an ops dashboard most
needs. The board is also read three ways at once by a viewer who has no way to tell which is which.
Confidence: High

### P3-006

Severity: Major
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:431-442`; `api/prisma/schema.prisma:1189-1192`
Observed: None of the three usage queries filters by organisation, soft-delete, or a demo flag.
None filters `isSetup`. The schema states at `:1189-1191` that a setup conversation "is NOT an
account and must never be counted as one: not in 'n of m sessions done', not in overdue" and that it
is excluded "in six places". `isSetup` is filtered in exactly one read,
`grounds.service.ts:1105`; `grep -c isSetup api/src/modules/prompts/prompts.service.ts` returns 0.
Expected: The rule the schema states.
Impact: Every platform figure, including 484, the 14-day chart, `session1Count`, `funnelBySession`,
`byStatus` and `session2Rate`, counts lead setup interviews as completed sessions, and counts every
internal and test organisation. Given no live customers yet (memory note, 9 Sep), the numbers on that
panel are close to entirely our own traffic, presented without qualification.
Confidence: High

### P3-007

Severity: Major
Axis: Inconsistency
Location: `api/src/modules/board/board.service.ts:582, 585-635`; `api/src/modules/reports/the-session-report.ts:113-115, 386`
Observed: The board's four tiles have two computation paths. The engine path wins when
`sessionShape?.atAGlance?.length` is truthy at `:582`; otherwise the board recomputes locally at
`:585-635`. Three of the four differ. Movement: the engine filters `o.target != null`
(`board.service.ts:1295`), the fallback does not (`:588`). Blockers: the engine falls back to
"n waiting" (`the-session-report.ts:434`), the fallback counts BLOCKING only (`:586`). How much was
said: the engine renders a percentage (`the-session-report.ts:445-450`), the fallback renders a word
(`:629`, `eng.coverage ?? 'unknown'`).
Expected: The engine's own header comment at `:113-115`: "Same four, computed the same way, because
two surfaces disagreeing ... is worse than one surface not saying."
Impact: The same ground shows different tile values depending on whether the report engine produced
an `atAGlance`, with nothing on screen to distinguish them. Separately, the board's dependency list
drops self-blocks at `:552` but neither tile path applies that filter, so a self-block increments
Blockers while being invisible in the list beneath it.
Confidence: High

### P3-008

Severity: Major
Axis: Inconsistency
Location: eight surfaces, listed below
Observed: The "n of m answered" sentence is computed independently in at least eight places over four
different denominators.

| Surface | Denominator |
|---|---|
| `client/src/components/gw/TheReportIsAListOfSessions.tsx:90` | all `!managingOnly`, computed client-side |
| `client/src/components/gw/TheSessionsReport.tsx:125` | `!managingOnly`, n intersected with m |
| `client/src/components/gw/SessionReportCard.tsx:334, 388-389` | same array, derived a second time |
| `client/src/components/gw/ResolutionPanel.tsx:180` | `totalActive`, and "answered" means a resolution confirmation, not a check-in |
| `api/src/modules/reports/how-much-there-is-to-go-on.ts:73` | m is `!managingOnly`, n is raw COMPLETED rows, not intersected (`reports.service.ts:2405-2406`) |
| `client/src/pages/report/ReportPage.tsx:1112` and two siblings | `!managingOnly` AND (linked user OR answered OR unexpired invite), `grounds.service.ts:4366-4398`; also uses `max(sessionNumber)` rather than the page's session |
| `client/src/pages/org/OrgMembersPage.tsx:653` | every participant row, no filter; numerator defaulted with `?? 1` |

Expected: One sentence, one computation.
Impact: Two surfaces print the same sentence about the same session from different numbers, and none
is authoritative. Which wins depends on which page the reader is on.
Confidence: High

### P3-009

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/reports.service.ts:2062-2063, 2111-2113`; `api/src/modules/reports/the-session-report.ts:421`
Observed: The Blockers count selects every `GroundDependency` on the ground with no `sessionNumber`
and no `clearedAt` predicate. `movedOnTargets` has no session predicate either, and sums
`count - prevCount` where `prevCount` is `@default(0)` (`api/prisma/schema.prisma:1399`).
Expected: The sibling tiles and the sub-line at `the-session-report.ts:421` say "this session".
Impact: A WAITING dependency raised in session 1 appears on session 12's report as a current
blocker. An objective that was never snapshotted reports its entire lifetime count as this session's
movement. Both are lifetime figures presented as session figures on a page headed by a session
number.
Confidence: High

### P3-010

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/how-much-there-is-to-go-on.ts:32, 73`; `api/src/modules/reports/reports.service.ts:1966-1974, 2118, 2129`
Observed: The confidence score mixes two populations. `saidInAll` is reader-scoped: entries are read
`where: { participantId: { in: readableParticipantIds } }`, and before release a non-lead's
`readableParticipantIds` is just themselves (`:1966-1968`). `ofPeople` in the same score covers the
whole ground (`:2118`).
Expected: The comment at `how-much-there-is-to-go-on.ts:32` describes `saidInAll` as "Everything said
this session".
Impact: Two terms of one composite score are computed over two different denominators. Before
release, a participant's confidence score is built from their own lines measured against everybody's
head count, so it falls as more people are invited. The "of what was said is anchored to a document"
sub-line (`the-session-report.ts:451`) has the same reader-scoped denominator while claiming a
whole-session one.
Confidence: High

### P3-011

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/confidence-in-the-picture.ts:42-43`
Observed: `confidenceInThePicture(scoredSessions, meanLevel)` accepts `scoredSessions` and tests it
only against zero. Nothing else in the function reads it.
Expected: Confidence in a picture rises with how much the picture rests on.
Impact: One scored session with mean 2 produces the identical band and sentence as twenty scored
sessions with mean 2: "This part of the picture is well covered". The parameter that carries the
sample size is accepted and discarded, and the reader is given a confidence statement that is blind
to how much evidence exists.
Confidence: High

### P3-012

Severity: Major
Axis: Data integrity
Location: `api/src/modules/assistant/a-commitment-carries-past-the-ground.ts:59`
Observed: `} catch { return false; }` around a commitment upsert. No logger, no counter, no user
signal.
Expected: A commitment a person made in a check-in is recorded.
Impact: The write fails and the product is silent. This is the one bare swallowing catch on a write
path in `api/src/modules` with zero instrumentation, on the object the accountability product exists
to carry.
Confidence: High

### P3-013

Severity: Major
Axis: Data integrity
Location: `api/src/modules/documents/documents.service.ts:311, 359, 520, 295-296`
Observed: A spreadsheet that fails to parse returns the string
`` `[Attached: ${fileName} - could not parse spreadsheet.]` ``, and that string is persisted as the
document's `content` and then passed to `assessDocument` and `decideOrigin`.
Expected: A failed parse is an error the uploader sees.
Impact: A document whose entire text is an apology becomes a corroborating source. The record shows a
document attached and anchored; the model grounds on a sentence about a parse failure. The uploader
is never told.
Confidence: High

### P3-014

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/reports.service.ts:3577, 3706`; `api/src/modules/grounds/grounds.service.ts:1489, 4519`
Observed: Four copies of
`(() => { try { return JSON.parse(participant.soloArtifact); } catch { return null; } })()`.
Expected: A participant's private record is either shown or reported as unreadable.
Impact: A corrupt `soloArtifact` renders as no private record at all. The participant sees an empty
section rather than an error, and the report proceeds as though they wrote nothing. Four independent
copies means a fix must be made four times.
Confidence: High

### P3-015

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/reports/reports.service.ts:1307`
Observed: `RANK[String(c.specificityLevel)] ?? 0`. `specificityLevel` is a nullable free String with
no enum backing it in the schema.
Expected: An unrecognised label is excluded, not scored.
Impact: Any value outside the four expected strings, including a capitalisation change or a value
written by a future or older build, is silently ranked 0, the worst band, and drags the mean and the
confidence label down. It compounds P3-001 and P3-003, which are both symptoms of the same
un-enumerated column.
Confidence: High

### P3-016

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:354-357`
Observed: `session2Rate = Math.round((session2Count / session1Count) * 100)`.
Expected: A rate compares matched cohorts.
Impact: The denominator includes session-1 check-ins whose session 2 is not yet due, plus `isSetup`
rows per P3-006. The figure is labelled a rate and is a ratio of two unmatched populations, so it
reads permanently low and cannot reach 100.
Confidence: High

### P3-017

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/reports/the-session-report.ts:200-201, 213-214`; `client/src/components/gw/TheSessionsReport.tsx:110-111, 254`
Observed: `agreed` and `stillOpen` are array lengths of model output. `settled[]` and `open[]` are
built from the same arrays with `.filter(Boolean)`.
Expected: The list under a count has that many items.
Impact: The filter can shorten the list without changing the count, so the page shows "4 still open"
above a list of 2, with the count and the list rendered adjacent.
Confidence: High

### P3-018

Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/report/ReportPage.tsx:1018, 1419`; `client/src/pages/report/SessionReportPage.tsx:132`; `client/src/components/gw/TheSessionsReport.tsx:322-323`; `api/src/modules/email/email.service.ts:877, 926`; `api/src/modules/reports/one-email-however-many-people.ts:133`
Observed: Three date formats on report surfaces alone: `'en-US'` ("September 10, 2026"), `'en-GB'`
("10 September"), and a bare `toLocaleDateString()` using the browser locale. Billing emails use
`'en-US'` while the rest of the product uses `'en-GB'`. Exactly one server formatter passes
`timeZone: 'UTC'` (`one-email-however-many-people.ts:133`).
Expected: One date format.
Impact: The same date reads three ways across a single report journey, and an email about it reads a
fourth. Everything not pinned to UTC renders in server-local time against UTC-stamped columns.
Confidence: High

### P3-019

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:449, 454`
Observed: The Usage tab's 14-day chart buckets by
`toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })` with no `timeZone`, against
`completedAt` values stamped in UTC. Every cron in the codebase pins `{ timeZone: 'UTC' }`
(`grounds.cron.ts:60, 114, 169, 209, 242, 319, 378, 391, 639, 693`).
Expected: The one chart on the platform panel agrees with everything else about which day a thing
happened.
Impact: On a non-UTC server the bars shift by a day relative to every other figure on the same
screen. It is the single server-local hole in an otherwise UTC-pinned codebase.
Confidence: High

### P3-020

Severity: Minor
Axis: Inconsistency
Location: `api/src/modules/ops/ops-settings.service.ts:19, 42-44`
Observed: `display.timezone` is declared with the value `Africa/Lagos` and a note dated 2026-09-05
explaining that "A board dated in a timezone nobody is in makes 'today' a different day for the
person reading it." `grep -rn "displayTimezone\|'display.timezone'" api/src` returns only the two
lines that declare it.
Expected: A decided setting has a reader.
Impact: The decision was recorded and never wired. Boards date themselves in server-local or UTC
time, which is the exact failure the note describes.
Confidence: High

### P3-021

Severity: Note
Axis: Data integrity
Location: `api/src/modules/conversation/intake.ts:115-130`
Observed: The number underneath every specificity and confidence label in the product is
`(hasNumbers ? 0.25 : 0) + (hasDate ? 0.15 : 0) + factualClaims.length * 0.1 - vagueCount * 0.1 - noiseCount * 0.08`,
where the inputs are substring matches against English keyword lists and five regexes
(`/\d+%/`, `/\d+ (days|hours|users|contracts)/`, `/confirmed by/`, `/measured in/`, `/signed/i`).
Expected: Nothing in the product claims a model produced these. Nothing states they are heuristic
either.
Impact: Every confidence band, specificity label and "well covered" sentence a customer reads is a
keyword count presented in the grammar of an assessment. It is English-only, so a session in another
language scores near zero and reads as "thin". No harm today with no live customers, hence Note, but
this is the origin of every derived label in Pass 3.
Confidence: High

### P3-022

Severity: Note
Axis: Inconsistency
Location: `api/src/common/seats.ts:32`; `api/src/modules/billing/billing.service.ts:508, 546`
Observed: The seat definition is genuinely single-sourced and correct.
`SEAT_WHERE = { isActive: true, deletedAt: null, awaitingOrgApproval: false }` is used by all five
call sites, including both the invite gate (`:330`) and the billing page number (`:785`), and is
pinned by `a-seat-is-a-seat-on-both-screens.spec.ts`. Stripe is sent
`line_items: [{ price: priceId, quantity: 1 }]` at `:508`, and the plan-change call at `:546` sends
no quantity at all.
Expected: Either seats bill, or the flat-rate intent is stated.
Impact: The seat count is an in-app cap that is never transmitted to Stripe. That is consistent with
flat per-plan pricing and is probably intended, but it is stated nowhere, so a future reader will
assume the number on the billing page is the number being charged for. Platform admins also occupy
seats; there is no `isPlatformAdmin` exclusion.
Confidence: Medium

### P3-023

Severity: Note
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:386, 390, 394, 420`; `client/src/pages/admin/AdminPage.tsx:639` versus `api/src/modules/prompts/prompts.service.ts:191`
Observed: The admin Orgs tab fetches `_count: { grounds: true }` at `:386` and discards it; the
`groupBy` at `:390` wins at `:420`. `participantCounts` at `:394` is computed and never read. On the
Drop-offs tab, `byScenario.pct` is computed server-side at `:191` while `byStatus` percentages are
computed client-side at `AdminPage.tsx:639`.
Expected: One computation per displayed value.
Impact: Two dead queries per page load, and two bars on one screen whose percentages are calculated
in two places, so they can diverge under any future change to either.
Confidence: High

---

### Number provenance

Class key: **measured** = counted from rows; **derived** = arithmetic over measured values;
**inferred** = length or content of model output; **defaulted** = a constant stands in for an absent
value; **heuristic** = keyword, regex or threshold.

| Displayed value | UI | Route / service | Computation | Table.column | Class | Finding |
|---|---|---|---|---|---|---|
| Board tile, Differences | `BoardPage.tsx:361-371` | `board.controller.ts:33` -> `board.service.ts:582` | `input.divergences.length` (`the-session-report.ts:389`) | `GroundReport.divergences` Json | inferred | P3-007 |
| Board tile, Movement | same | `board.service.ts:588` or `:1295` | `count - prevCount`, engine filters `target != null`, fallback does not | `GroundObjective.count/prevCount/target` | measured, floored by `prevCount @default(0)`, gated by regex `aNumberWasSaid()` | P3-007, P3-009 |
| Board tile, Blockers | same | `the-session-report.ts:434` or `board.service.ts:586` | count of dependencies; engine falls back to "n waiting", fallback counts BLOCKING only | `GroundDependency.status` | measured over an inferred row set | P3-007, P3-009 |
| Board tile, How much was said | same | `the-session-report.ts:445-450` or `board.service.ts:629` | engine `"${backedPct}% documented"`, fallback `eng.coverage ?? 'unknown'` | `RecordEntry.recallBased/anchoredOrigin` | derived, or a pre-banded label | P3-007 |
| Report, agreed / stillOpen | `TheSessionsReport.tsx:110-111` | `reports.controller.ts:48` | array lengths of model synthesis | `GroundReport.agreements/divergences` | inferred | P3-017 |
| Report, settled[] / open[] | `TheSessionsReport.tsx:254` | `the-session-report.ts:213-214` | same arrays, `.filter(Boolean)` | same | inferred, lossy | P3-017 |
| Report, confidence.answered / ofPeople | report header | `reports.service.ts:2129 / 2118` | counts of participants | `CheckIn`, `GroundParticipant` | measured | P3-010 |
| Report, confidence.documented / saidInAll | report header | `the-session-report.ts:506-507` | counts of entries | `RecordEntry` | measured; `countsAsASource` at `:37` returns true when origin is null | P3-010 |
| Report, commitmentsWithOwnerAndDate | report | `reports.service.ts:2126-2128` | text scan for a name plus a date | `RecordEntry.text` | heuristic | — |
| Report, confidence.score | report | `how-much-there-is-to-go-on.ts:103-105` | `coverage*45 + documented*25 + compared*15 + owned*15` | composite | heuristic | P3-010 |
| Report, confidence.band | report | `how-much-there-is-to-go-on.ts:119` | `>=67 solid, >=34 partial, else thin` | composite | heuristic threshold | — |
| Report, specificityLabel | report | `reports.service.ts:1311-1312` | `mean >= 2 high, >= 1 moderate, else low` over `RANK` | `CheckIn.specificityLevel` | heuristic, **rank order inverted** | P3-001, P3-015 |
| Report, confidence band ("well covered") | report | `confidence-in-the-picture.ts:42-66` | same `mean`, same thresholds as specificityLabel | same column | heuristic; **cannot disagree with specificityLabel**, and ignores sample size | P3-011 |
| Report, "How clear this was" sentence | shared report footer | `the-session-report.ts:616-633` | branches on `'HIGH'/'LOW'` | `CheckIn.specificityLevel/recallConfidence` | **unreachable branches; one constant sentence** | P3-003 |
| `CheckIn.specificityLevel` (the source) | — | `conversation.service.ts:3487` -> `152-157` | thresholds on `avgSpecificity` | written from `intake.ts:123-125` | heuristic keyword count | P3-021 |
| `CheckIn.recallConfidence` | — | `conversation.service.ts:3488` -> `159-162` | thresholds on **`avgSpecificity`** | same input as above | **duplicate of specificity** | P3-002 |
| "n of m answered" | eight surfaces | see P3-008 | four different denominators | `GroundParticipant`, `CheckIn` | measured over inconsistent populations | P3-008 |
| Personal confidence (High/Building/Early) | ground page | `grounds.service.ts:4487` | `confScore >= 4 High, >= 2 Building, else Early` | session count | heuristic, effectively a session counter | — |
| Function detection confidence | participant panel | `function-detection.ts:164-175`, `role-maps.ts:607-621` | prior of `0.4` hardcoded per title regex | `GroundParticipant.detectedFunctionConfidence` | defaulted constant | — |
| Billing, seats used | `BillingPage.tsx:335-337` | `billing.controller.ts:31` -> `billing.service.ts:785` | `count(SEAT_WHERE)` | `User` | measured, single-sourced, **never sent to Stripe** | P3-022 |
| Usage, "Check-ins completed" 484 | `AdminPage.tsx:715` | `prompts.service.ts:440` | `checkIn.count({ status: COMPLETED })` | `check_ins` | measured, unfiltered by org / deleted / `isSetup` | P3-005, P3-006 |
| Usage, "Check-ins created" 243 | `AdminPage.tsx:716` | `prompts.service.ts:442` | `ground.count()` | `grounds` | measured, **mislabelled: counts grounds** | P3-005 |
| Usage, "Check In Completed" 359 | `AdminPage.tsx:752` | `prompts.service.ts:436` | `usageEvent.groupBy` | `usage_events` | measured, **structurally incomplete: emitted on 1 of 3 completion paths, and double-swallowed** | P3-005 |
| Usage, 14-day chart | `AdminPage.tsx` chart | `prompts.service.ts:445-455` | day buckets, no `timeZone` | `check_ins.completedAt` | measured, bucketed in server-local time | P3-019 |
| Usage, session2Rate | admin | `prompts.service.ts:357` | `session2Count / session1Count` | `check_ins` | derived over unmatched cohorts | P3-016 |
| Ops, shareOfNewRevenue | `OpsContributionPages.tsx:103` | `ops-contribution.service.ts:296` | `revenue / attributed total` | `Decimal(x,2)` | derived; denominator excludes unattributed, **documented as deliberate** | — |

### Two sources for one value

| Value | Source A | Source B | Which wins | Deliberate? |
|---|---|---|---|---|
| The four board tiles | `the-session-report.ts:386` | `board.service.ts:585-635` | A when `atAGlance.length` (`:582`) | No. The engine comment at `:113-115` says they must agree; three of four do not. |
| "n of m answered" | `reports.service.ts:2129/2118` | six client and server sites, P3-008 | per surface | No. |
| `blocked` / `waiting` | `reports.service.ts:2062` counts raw rows | `board.service.ts:1275` counts after `dedupeDependencies` (`:207`) | per surface | No. |
| `documented` | `the-session-report.ts:384` | `the-session-report.ts:506`, identical expression twice | agree today | No, nothing enforces it. |
| Org ground count | `prompts.service.ts:386` `_count` | `prompts.service.ts:390` `groupBy` | B at `:420`; A is a dead query | No. |
| Percentage on the Drop-offs tab | `prompts.service.ts:191` server-side | `AdminPage.tsx:639` client-side | both render, on one screen | No. |
| specificityLabel vs confidence band | `reports.service.ts:1312` | `confidence-in-the-picture.ts:42` | both render | Same input and same thresholds, so they are one signal shown as two. |

### Units, currency, timezone, date format

| Surface | Format | Location |
|---|---|---|
| Report page | `en-US`, "September 10, 2026" | `ReportPage.tsx:1018, 1419` |
| Session report page | `en-GB`, "10 September" | `SessionReportPage.tsx:132` |
| Sessions report component | browser locale | `TheSessionsReport.tsx:322-323`, `SharedReportForAParty.tsx:126` |
| Admin, chat, baseline | `en-GB` | `AdminPage.tsx:691`, `GroundChat.tsx:268`, `BaselinePanel.tsx:101` |
| Prompt versioning | `en-US` | `PromptVersioningPage.tsx:109` |
| Create ground, board | undefined locale | `CreateGroundPage.tsx:457`, `BoardPage.tsx:41` |
| Billing emails | `en-US`, no `timeZone`, bare `$` | `email.service.ts:877, 926, 932` (NL-019) |
| Round digest email | `en-GB` with `timeZone: 'UTC'`, the only server formatter that pins one | `one-email-however-many-people.ts:133` |
| Every cron | `{ timeZone: 'UTC' }` | `grounds.cron.ts:60, 114, 169, ...` |
| Usage 14-day chart | server-local, unpinned | `prompts.service.ts:449, 454` (P3-019) |
| Ops boards | `Africa/Lagos` declared, never read | `ops-settings.service.ts:43` (P3-020) |
| Money, whole units | `$${total.toLocaleString()}` | `ops-contribution.service.ts:320`, `attribution-is-not-entitlement.ts:107` |
| Money, cents | `$${Math.round(c/100)}` | `an-objective-is-not-a-note.ts:106`, `OpsEverybodyPage.tsx:18` |

Two different storage units, `Decimal(x,2)` and `Int` cents, both render a bare `$`.
`BillingEvent.currency String @default("USD")` (`api/prisma/schema.prisma:3146`) is never read by any
display path, and `alignment/a-figure-is-a-value-with-a-source.ts:96` accepts a currency argument
then hardcodes `'en-US'` grouping for all of them.

### Silent data loss

| # | Location | What is lost | Finding |
|---|---|---|---|
| 1 | `assistant/a-commitment-carries-past-the-ground.ts:59` | A commitment upsert fails, nothing logged | P3-012 |
| 2 | `documents/documents.service.ts:359` | Unparsed spreadsheet persisted as an apology string, then grounded on | P3-013 |
| 3 | `conversation.service.ts:3206` + `usage/usage.service.ts:34-36` | Usage event double-swallowed; every platform counter can under-count | P3-005 |
| 4 | `knowledge/knowledge.service.ts:372` | Retrieval audit rows, the record of what the assistant was shown | Note |
| 5 | `reports.service.ts:3577, 3706`; `grounds.service.ts:1489, 4519` | A corrupt private record renders as no private record, four copies | P3-014 |
| 6 | `subjects/bulk-import.service.ts:80, 302` | An import stuck RUNNING when the ABANDONED write also fails, defeating `resumeAbandoned` | Note |
| 7 | `conversation.service.ts:3116` | Specificity scoring failure becomes "nobody has been asked" | P3-004 |

Most other swallowing catches in `api/src/modules` are deliberate, commented and correct: the
kill-switch reads at `reports.service.ts:540` and `grounds.service.ts:815`, the unique-constraint
swallow at `round-completion.ts:54`, and the per-row invite failure at `users.service.ts:257`.

---

## Unverified items, with the check that would settle each

| Finding | Check |
|---|---|
| P2-007 back-office path bypass | `curl -i -H "Authorization: Bearer <non-staff token>" http://localhost:3000/api/v1/ADMIN/usage` and the `%61dmin` variant. A 403 carrying `BACK_OFFICE_CODE_REQUIRED` means the door held. |
| P2-009 Google email verification | Confirm whether `profile.emails[0].verified` can be false for the configured OAuth client. If it can, raise to Blocker. |
| P2-025 org membership removal | Delete an `OrganizationMembership` row, then call an authenticated route with the existing token and see whether the old org is still active. |
| P3-022 flat-rate Stripe intent | Confirm with Hafsah whether plans are flat-rate per tier rather than per seat. |
| Stripe inbound webhook | No HTTP receiver was found under a `@Controller('webhooks'` prefix. Confirm where Stripe posts, and that its signature is verified. |
| `IdempotencyRecord` pruning | Confirm whether any job deletes rows; none was found. |
| `POST /people` | Confirm whether it upserts internally; a duplicate on retry is likely but was not read. |
| Board fallback tiles | Confirm whether `GroundReport.engagement.coverage` is ever written on grounds that take the fallback path, or whether that tile renders `'unknown'` in practice. |

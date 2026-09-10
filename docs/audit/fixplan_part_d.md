# Fix plan, part D: channels and notifications

Scope: every `NL-*` finding except NL-001 and NL-014 (covered elsewhere), the WhatsApp findings
`P4-F01`–`P4-F15` and `P4-003`, the embedded panel `P4-E01`–`P4-E11`, the invited-participant and
broadcast-join arrival findings, the client-facing failures of the anonymous entry flow, and the two
P6 findings about a capability that is built and cannot be switched on.

`P4-F08`, `P4-F11`, `P4-F14` and `P4-E10` do not exist in the register. Nothing has been invented to
fill them.

Every change below was checked against the code as it stands on
`fix/the-brief-is-yours-and-the-context-chat-takes-work`. Where the register's wording and the code
disagree, the code is quoted and the difference is called out.

Ordered by harm: silence first, then money spent on a message nobody receives, then blast radius.

---

## Decision 1: which inbound WhatsApp handler survives

There are two live inbound handlers, on two live routes:

| | Platform number | Organisation's own number |
|---|---|---|
| Route | `POST /webhooks/whatsapp` (`whatsapp.controller.ts:52`) | `POST /webhooks/whatsapp/:organizationId` (`whatsapp-for-an-organisation.controller.ts:96`) |
| Signature | one shared app secret from config | the organisation's own `appSecret` |
| Identity | `findUserByPhoneNumber`, **unscoped by organisation** | `whoIsWritingTo(organizationId, …)`, scoped |
| First message | **dropped** — `open()` is called with no `text` (`:100-104`) | kept, unless 12 characters or fewer |
| More than one check-in open | picks the oldest, silently | asks, as a tappable list |
| Photos, documents | not handled | on the check-in, through the documents pipeline |
| Language | English only | read once, replies translated |
| Report on finish | none | sent |
| Failure | one `catch` that logs; the person gets nothing | partly handled (see P4-F02) |

**Recommendation: keep the per-organisation handler and delete the platform one.** It is a superset
on every axis that matters, and it is the only one whose identity lookup is tenant-scoped. The
platform handler is not a fallback; it is an older, worse copy that a person can reach by messaging
a number we published.

What it costs: the platform number is the only path for an organisation with no
`WhatsAppConnection` row. Merging is therefore three things, not one:

1. `WhatsAppForAnOrganisationService.handle` takes an optional connection instead of requiring one,
   and falls back to the platform credentials for the send (`sendFor` already does this at
   `whatsapp.service.ts:159`).
2. `POST /webhooks/whatsapp` keeps its shared-secret signature check, resolves the organisation from
   the sender's number — and, finding more than one candidate, replies asking which organisation
   rather than guessing, because the current `findUserByPhoneNumber` is unscoped.
3. `whatsapp.controller.ts` loses its routing body entirely and delegates.

Roughly a day, most of it in step 2. Until it is done, every fix below has to be written twice, which
is how the two drifted in the first place.

## Decision 2: what cannot be closed without an inbox and provider access

These findings cannot be fixed, and several cannot even be confirmed, from this repository. They are
not in the batches below; they are a separate, short list of things somebody has to be given access
to do.

| Finding | What is needed |
|---|---|
| NL-029 | A staging deployment with `NODE_ENV=production` and a real Resend key, plus a seeded inbox on Gmail, Outlook, Apple and a Microsoft 365 tenant, to confirm mail leaves at all |
| NL-016 (confirm half) | The same inboxes, to measure whether adding a text part actually moves placement. The fix itself is in Batch 12 and needs nothing |
| NL-030 | The Resend dashboard, to register `POST /webhooks/resend` and to confirm `RESEND_WEBHOOK_SECRET` is set in production. Until somebody looks, the whole delivery and bounce pipeline may be inert with no signal |
| NL-013, NL-011, NL-012 (confirm half) | A Meta Business account with a WhatsApp number, a test number that is not ours, and the template-approval queue. Nothing here can tell you which templates Meta will approve or how a 24-hour-window rejection is actually shaped |
| NL-035, NL-015 | No inbox, but a decision from Hafsah about key management before encryption at rest can be written |

The DNS checks the audit lists (`dig` for SPF, DKIM, DMARC on `myground.work`) are five minutes of
somebody's time and gate nothing in code. They should be run before anything in Batch 12 ships,
because adding a `List-Unsubscribe` header to mail from an unauthenticated domain does not help.

---

## Batch 1 — Nobody who writes on WhatsApp is met with silence

**Closes:** P4-F01, P4-003, P4-F02, P4-F05, P4-F10, P4-F13, NL-012

**The change.**

`api/src/modules/whatsapp/whatsapp.controller.ts:100-108`. The `NOT_STARTED` arm calls
`this.conversation.open(openCheckIn.id, user.id)` and never passes `text`. Pass it: call `open()`,
then immediately `sendMessage(checkInId, userId, text)`, and send both replies joined — which is what
the per-organisation handler already does at
`whatsapp-for-an-organisation.service.ts:126-134`. Then the whole `catch` at `:106-108` must reply,
not only log: `err?.response?.message ?? err?.message` back to `fromNumber`, and only if that
send itself fails does it become a log line. Silence is the one outcome the channel cannot produce.

`api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:126-134`. The answer path has no
`try`. A spent balance, the answer ceiling, a paused or closed ground and an already-complete
check-in all throw `ForbiddenException`/`BadRequestException` with carefully written sentences, and
every one of them propagates to the controller's `catch` at
`whatsapp-for-an-organisation.controller.ts:107-109`, which logs and answers Meta `received: true`.
Wrap the `open` + `sendMessage` block the same way the `finish` branch at `:118-125` already is, and
`say()` the message. This is one `try/catch`, and it is the single highest-harm line in the slice.

`whatsapp.service.ts:143` (`sendMessage`) throws on a non-2xx; `:217-233` (`deliver`) returns
`false`. So the register's NL-012 wording — "`deliver` returns false … `sendFor` swallows it" — is
right about `sendFor` and wrong about the platform path, which throws into the caller. Make both
behave the same: `deliver` and `sendMessage` both return a
`{ sent: boolean; status?: number; error?: string }`, `sendFor` returns it unchanged, and every
caller that matters reads it.

**What stops us paying for a message nobody receives.** Two things, and only the second is a code
change here.

- P4-F10 and P4-F05: the reply is composed *after* the model call and the session decrement. A send
  that fails silently means we paid for the model turn and, on the report path
  (`sendTheReport`, `:165-178`), for a synthesis and up to four report polls and a translation call.
  Once `sendFor` returns a result, record it: a new `WhatsAppSend` row (`organizationId`, `phone`,
  `checkInId`, `kind`, `sentAt`, `failedAt`, `status`, `error`) written on every outbound. That row
  is what makes a paid-for-and-undelivered message findable at all; today nothing anywhere records
  it. It also gives Batch 15's bounce work somewhere to hang the WhatsApp half.
- On a failed report send, do not re-run the synthesis. `sendTheReport` re-polls
  `reports.sessionReport` up to four times with a four-second gap; a retry must read the row it
  already has. Retry the *send*, not the *report*.

P4-F13: `whatsapp-for-an-organisation.controller.ts:100-101` returns `{ received: true }` for an
unknown `organizationId` with no log and no counter. Keep the response — Meta must not retry
forever — and add one `logger.warn` plus a counter, so a customer who has pointed Meta at the wrong
URL is discoverable instead of being a silence with no evidence anywhere.

**Spec:** `a-person-on-whatsapp-is-never-answered-with-nothing.spec.ts` — a spent balance, a paused
ground, a completed check-in and a thrown model call each produce exactly one outbound text carrying
the refusal's own sentence; and the first message on a `NOT_STARTED` check-in appears in the
transcript as the person's turn.

**Effort:** day. **Risk:** low. Every change is additive — a `try`, a second call, a returned value.
The one risk is double-replying on the `NOT_STARTED` path; the spec pins the count at one outbound
per inbound.

---

## Batch 2 — One inbound handler, not two

**Closes:** P4-F15, P4-F06, P4-F07, P4-F09, P4-F12

**The change.** Decision 1 above, executed. Then, inside the surviving handler:

- P4-F06: `whatsapp-for-an-organisation.service.ts:71` says "You have no check-in open right now" to
  a roster person whose `actingAs` lookup threw at `:59-61` (the `catch` sets `userId = null`
  and moves on). That is a different fact and the person can act on it. Say which it is: no linked
  account is "This number is on your organisation's roster but is not connected to a Groundwork
  sign-in yet — ask your admin to link it."
- P4-F07: `:132` — `if (text.length <= 12) { await say(reply); return; }` throws away a short first
  message. Twelve characters covers "Not much yet", "It's blocked", "Behind again". Drop the length
  test; a short first answer is still an answer. Keep the guard only for a message that is exactly a
  greeting, matched by a list, not by a length.
- P4-F12: the register says a `finish` against a `NOT_STARTED` check-in "is written into the record
  as an answer". It is not — the ≤12 guard at `:132` returns first, so it is discarded instead.
  Both outcomes are wrong and removing the length test in P4-F07 turns the second into the first. So
  move the `finish` match at `:117` above the status test and answer honestly: "There is nothing to
  finish yet — this check-in has not started. Say something and I will open it."
- P4-F09: `pickedOne(arrived.text, open)` at `:78` runs on any text when more than one check-in is
  open, and `:81` treats any bare one-or-two-digit string as a menu pick. Answering "7" to "how many
  did you close?" switches check-in. Gate the numeric pick on the thread having just been *asked*:
  set a `pickPendingAt` on `WhatsAppThread` when the list is sent at `:88`, and accept a bare number
  only within a few minutes of it.

**Effort:** day (on top of Decision 1's day). **Risk:** medium — this is the file every WhatsApp
message goes through, and the merge moves the identity lookup. Do it behind the existing
`connection.enabled` flag, one organisation at a time.

**Spec:** `there-is-one-way-in-from-whatsapp.spec.ts` — the platform route and the organisation route
produce identical transcripts for the same inbound sequence; and
`a-number-is-not-always-a-menu-pick.spec.ts`.

---

## Batch 3 — Meta will refuse most of what we send, and we cannot tell

**Closes:** NL-013, NL-011

**The change.** No Meta message template exists anywhere in the codebase: every outbound in
`whatsapp.service.ts` is `type:'text'` (`:126-137`, `:224`) or `type:'interactive'` (`:180-186`).
Business-initiated sends outside the 24-hour customer-service window will be rejected, and with
Batch 1 not yet landed the rejection is invisible.

- Add a `template` send path to `WhatsAppService` (`type:'template'`, `name`, `language`,
  `components`), and a small registry of the three business-initiated bodies we actually send:
  session-ready, check-in-opened, report-ready. Names and copy have to go through Meta's approval
  queue — see Decision 2.
- `WhatsAppConnection.lastInboundAt` is written at
  `whatsapp-for-an-organisation.service.ts:46` and read nowhere but the admin display
  (`whatsapp.service.ts:271`). Make it a gate: a helper `insideTheServiceWindow(organizationId,
  phone)` that compares the thread's last inbound to now, and every business-initiated caller
  (`grounds.cron.ts:447-455`, the report path) picks free text or a template from its answer.
- NL-011: there is no consent field on `WhatsAppConnection` (`schema.prisma:1878-1904`) or
  `WhatsAppThread` (`:1922-1931`), and the email consent machinery
  (`wouldTheyRatherNot`, `email.service.ts:68`) is never consulted on a WhatsApp send. Add
  `whatsappConsentAt` and `whatsappStoppedAt` to `Person`, check them in `sendFor` before any
  business-initiated send, and handle STOP/UNSTOP in the inbound router — which today recognises
  only finish, complete, done and close (`whatsapp-for-an-organisation.service.ts:117`). A person
  must be able to stop this by the means the channel itself offers.

**What stops us paying for a message nobody receives.** The window check is exactly that: a
business-initiated free-text send outside 24 hours is money spent on a rejection. Check the window
*before* the model call that composes the body, not after.

**Effort:** more than a day, and it is blocked on Meta approval, not on us. **Risk:** medium. Getting
the window wrong in the safe direction (sending a template when free text would have done) costs a
fraction of a cent and reads slightly stiffer; getting it wrong the other way costs the message.

**Spec:** `a-message-outside-the-window-goes-as-a-template.spec.ts` and
`stop-means-stop-on-whatsapp-too.spec.ts`.

---

## Batch 4 — A redelivered WhatsApp message is not a second answer

**Closes:** P4-F03

**The change.** There is no idempotency on `message.id` anywhere.
`whatsapp-for-an-organisation.service.ts:42-48` reads the message and proceeds. Meta redelivers when
it does not get a 200 in time, and the finish branch holds the response through
`sendTheReport`'s four polls at four seconds each (`:161-170`) plus a translation call — comfortably
past Meta's patience.

Add a `WhatsAppInboundMessage` table keyed on `(organizationId, messageId)` with a `handledAt`.
`handle()` claims the id with a `create` inside a `try`; a unique-constraint violation means it is a
redelivery and it returns immediately. Separately, make the finish branch *not* hold the HTTP
response: acknowledge Meta, then send the report from the completion listener, which Batch 5 is
fixing anyway.

**What stops us paying for a message nobody receives.** This one is the reverse — it stops us paying
*twice* for a message somebody receives once. Each redelivery today is another model turn, another
slot against the answer ceiling, and on a `NOT_STARTED` check-in another session decrement.

**Effort:** half-day. **Risk:** low.

**Spec:** `the-same-whatsapp-message-twice-is-one-answer.spec.ts`.

---

## Batch 5 — The report reaches the channel the person was actually using

**Closes:** P4-F04

**The change.** `onCheckInCompleted` at
`whatsapp-for-an-organisation.service.ts:155-157` returns early whenever *any* `WhatsAppThread` row
exists for that check-in, reasoning that the finish handler already sent it. But a thread row is
written by `remember()` on any WhatsApp interaction (`:78`, `:85`, `:238-244`) and deleted only in
the WhatsApp finish branch (`:120`). So somebody who sends one WhatsApp message about a check-in and
then finishes it in the app or the panel gets no report on WhatsApp, ever.

Replace the thread-row test with an explicit fact: a `reportSentAt` on the check-in's WhatsApp send
record (Batch 1's `WhatsAppSend`), set by the finish branch. The listener sends unless that row
exists.

**What stops us paying for a message nobody receives.** The synthesis is already paid for by the time
this listener runs. This is the case where we paid and then decided not to deliver.

**Effort:** hours. **Risk:** low, once Batch 1's send record exists. Without it, use a boolean on
`WhatsAppThread` and do not delete the row.

**Spec:** `finishing-in-the-app-still-sends-the-report-to-the-phone.spec.ts`.

---

## Batch 6 — The panel tells the truth about what happened

**Closes:** P4-E02, P4-E01, P4-E03, P4-E04, P4-E05, P4-E06, P4-E07

**The change.** `api/src/modules/embed/static/panel.html`. Four of these are the same mistake:
`.then(function (r) { return r.ok ? r.json() : null; })` collapses every refusal into `null`, and one
call does not even check.

- P4-E02, `:225-240`. `finishCheckIn` clears `inCheckIn` and the placeholder *before* the network
  call, then maps the response and discards it. The server legitimately refuses completion on a thin
  record with a 400 carrying `canContinue: true`. Read the status: on a 400 with `canContinue`, put
  `inCheckIn` back, restore the placeholder, and print the server's own sentence. On any other
  refusal, say the check-in is still open. Never say "That is done."
- P4-E04, `:305-311`. `ask()` calls `r.json()` with no status check and hands the result to
  `render()`, which iterates `reply.blocks || []` — an empty array on a refusal body, so the panel
  prints nothing at all. The file's own comment at `:312-315` says "Never a stack trace, and never
  silence." Check `r.ok`, and on a refusal bubble the body's `message`.
- P4-E03, `:198-208`. Every non-2xx from `open()` becomes "I could not open that check-in just then.
  Try again in a moment", including the billing wall raised at
  `conversation.service.ts:622`, which cannot be fixed by trying again. Read the status and print the
  `ForbiddenException`'s message.
- P4-E05, `:213-223`. No in-flight lock on the composer (`form` submit at `:325-333` fires as often
  as the person presses return) and one failure string for a network error, the answer ceiling and a
  legal hold. Disable the input while a call is in flight, and print the server's sentence.
- P4-E06, `:218`. `if (o.sessionComplete) finishCheckIn(id)` — the panel auto-completes, and
  completion is irreversible. WhatsApp asks first
  (`whatsapp-for-an-organisation.service.ts:135`). Match it: print "That is enough to close this
  check-in. Say *finish* to complete it, or keep going", and complete only on the word.
- P4-E07, the once-daily nudge is marked used before the line reaches the person. Mark it after the
  send returns, the same rule as everything else in this batch.

**P4-E01 and what stops us paying for nothing.** `conversation.service.ts:630-639` decrements
`sessionsBalance` with an atomic `updateMany`, and the model call that produces the opener is at
`:735`, roughly a hundred lines later. The `conversationTurn.create` at `:740` and the status flip to
`IN_PROGRESS` at `:748` come after that. So a model failure leaves the balance spent and the check-in
still `NOT_STARTED` — and the next press decrements again. Through the panel, whose "Start it" chip
has no in-flight lock, five presses against a flaky model spend five sessions.

The ordering fix belongs to whoever owns NL-014 and P4-002, which are the same seam. **This batch
must not write a second, competing fix.** What is in scope here is the panel half, and it is enough
on its own to stop the multiplication: disable the chip on click, and on a refusal print the reason
rather than an invitation to press again. Flag the dependency when the batches are sequenced —
if the ordering fix lands first, this batch's panel work is pure improvement; if it does not, the
panel work caps the damage at one session instead of five.

**Effort:** day. **Risk:** low. It is one file, no build step, and every change is "read the status
you already have".

**Spec:** `the-panel-never-says-done-when-it-is-not.spec.ts` and
`a-refusal-in-the-panel-is-printed-not-swallowed.spec.ts`. The existing
`the-loader-is-a-guest-on-somebody-elses-page.spec.ts` shows the house style for asserting against
this file.

---

## Batch 7 — The panel's smaller edges

**Closes:** P4-E08, P4-E09, P4-E11

**The change.**

- P4-E11, `panel.html:123`: `parent.postMessage(…, '*')` — outbound uses a wildcard origin while
  inbound is checked at `:371` (`e.source !== parent`). The loader already knows the API origin and
  uses it correctly at `embed.js:87`. Have the loader pass its own origin in the `session` message
  and post back to that, falling back to the referrer's origin.
- P4-E09, `panel.html:101`: `setInterval(askForANewSession, ASK_AFTER_MS)` runs for ever, so an idle
  panel on a tab left open overnight asks the host for a new session every twelve minutes until the
  browser is closed. Stop after a few consecutive unanswered asks, and restart on the next user
  action.
- P4-E08: any panel session can settle another person's objective disagreement. Scope the resolution
  call to the panel session's own person, the same way `what-is-due-for-this-person.ts` already
  scopes the due list.

**Effort:** half-day. **Risk:** low, except E11, which can break a customer's install if the origin
is computed wrongly. Ship it with a wildcard fallback and a log line for one release.

**Spec:** `the-panel-talks-back-to-one-origin.spec.ts`.

---

## Batch 8 — Arriving by invitation: the person is told which wall they hit

**Closes:** P4-B02, P4-B03, P4-B05, P4-B08, P4-B09

**The change.**

- P4-B02. `JwtAuthGuard.canActivate` (`api/src/common/guards/jwt-auth.guard.ts:18-20`) returns `true`
  for a public route *before* calling `super.canActivate`, so passport never runs and `req.user` is
  always undefined. `ParticipantsController.accept` (`participants.controller.ts:53-66`) reads
  `req?.user?.id ?? req?.user?.sub ?? null` and therefore always passes `null`. The whole "resume in
  this browser" branch that the comment at `:57-61` describes is unreachable: every returning
  participant is emailed a fresh link and told this is a new device. Fix in the guard: on a public
  route, run passport anyway and swallow the failure (`handleRequest` returns `null` instead of
  throwing when the route is public), so `req.user` is populated when a session happens to exist.
  This is the one change in the batch with reach beyond the invite flow — every `@Public()` route
  gains an optional `req.user`. That is the intended behaviour and nothing currently depends on it
  being null, but it wants its own spec.
- P4-B03. `WAITING_TO_BE_LET_IN`
  (`participants/nobody-joins-your-company-by-being-invited-to-a-check-in.ts:68`) is exported and
  appears nowhere in `client/src`. A person queued for approval is signed in, sent to the check-in,
  refused by `CANNOT_CHECK_IN_YET`, and shown "This is usually a temporary issue" with a retry that
  can never work. `accept()` already knows — it sets `queuedForApproval` at
  `participants.service.ts:226`. Return it, and have `InvitePage` render `WAITING_TO_BE_LET_IN`
  instead of navigating to the check-in. (That copy uses the banned word "account" twice; rewrite it
  in the same pass — "Your sign-in is ready".)
- P4-B05. `JoinConfirmPage.tsx:35-38` calls `setAuth` with
  `{ email: '', firstName: '', lastName: '', role: 'MEMBER', organizationId: '' }` and persists it,
  with no profile refresh. Every screen that reads the auth store then believes the person has no
  organisation. Call `authApi.me()` after `confirm` and set the real user, or have `joinApi.confirm`
  return the user object the way `verifyEmail` does.
- P4-B08. `participants.service.ts:449` says "This link has already been used, or it is not a link we
  recognise." The token now deliberately survives use (`:243-251` keeps it), so "already been used"
  is no longer a state this message can be describing — the row is simply not found. Say the true
  thing: it is not a link we recognise, and here is what to do.
- P4-B09. `InvitePage.tsx:125-127` — every failure is
  `toast.error('Could not start your session. Please try again.')`. Print
  `err?.response?.data?.message` when there is one, as `JoinConfirmPage.tsx:46` already does.

**Effort:** day. **Risk:** medium, entirely because of the guard change. Everything else is copy and
one API shape.

**Spec:** `a-public-route-still-knows-who-is-signed-in.spec.ts`,
`waiting-to-be-let-in-is-a-screen-not-a-retry.spec.ts`.

---

## Batch 9 — "Not invited yet" is three different facts

**Closes:** P4-B04

**The change.** `grounds.service.ts:2647` writes
`invitedAt: startsInFuture || !waitingForASeat.room ? null : new Date()`, and the failed-send path at
`:2739` writes `invitedAt: null` a third time. Three causes — the start date is ahead, there is no
seat, the mail did not send — collapse into one boolean. `GroundAdminPage.tsx:753` reads
`!r.value?.invitedAt` and `:809` tells the lead `"${waiting} invited on the start date"`, which is
false in two of the three cases: for the seat-capped person no invite is coming until an admin makes
room, and for the failed send none is coming at all.

The row already carries the distinguishing facts: `awaitingSeat` is set at `:2632` and `emailFailed`
is returned by `addParticipant`. Return a `notInvitedBecause` of `'starts_later' | 'no_seat' |
'mail_failed'` alongside `invitedAt`, and render three sentences in `GroundAdminPage`, the third with
a Resend button (`resendInvite` already exists).

**Effort:** half-day. **Risk:** low.

**Spec:** `not-invited-yet-says-why.spec.ts`.

---

## Batch 10 — Two dead branches in the join path, one of which leaks the brief

**Closes:** P4-B10, P4-B11

**The change.** `entry.service.ts:932-956`: the `joinToken` branch of `chat()`. It is reached from
`POST /entry/chat` and `POST /entry/chat/stream`, both `@Public()`
(`entry.controller.ts:297, 246`), by anybody who puts a `joinToken` in the body. It looks the ground
up by that token and puts `ground.label`, `ground.scenario` and `ground.brief` into the system
prompt — the organiser's own brief, served to an unauthenticated caller. No caller in `client/src`
passes `joinToken` to either route any more: the join flow goes through `joinApi.confirm`
(`JoinConfirmPage.tsx:32`), and the only client `joinToken` references are the share link on
`GroundAdminPage.tsx:2538`.

Delete the branch and drop `joinToken` from `EntryChatDto`. If a broadcast-join chat is wanted again
later, it belongs behind the join-confirm session like every other check-in.

P4-B11 records that pending-join marking is ordered the safe way and does no harm. Confirmed — it
needs no change. It is listed here so it is not silently dropped, and so a later reader does not
"fix" it.

**Effort:** hours. **Risk:** low. Check the persona and journey lanes for a `joinToken` caller before
deleting.

**Spec:** `the-brief-is-not-served-to-a-stranger.spec.ts`.

---

## Batch 11 — The anonymous entry flow says what actually refused

**Closes:** P4-A02, P4-A03, P4-A04, P4-A07

**The change.**

- P4-A02. `entry.service.ts:1086` — `private lastReplyHadCloseMarker = false`, written at `:1039`
  and read by the controller at `:262` (`this.service.didLastReplyClose()`) *after* an await, on a
  singleton service serving a public unauthenticated route. Two visitors finishing within the same
  tick and one decides the other's close. Return the flag from `chat()` instead of stashing it:
  `chat()` returns `{ reply, closed }`, and `sessionCompleteFrom` takes the boolean as an argument.
  Delete the field and `didLastReplyClose`.
- P4-A03. `MagicVerifyPage.tsx:141` returns `{ kind: 'commitError' }` for every commit refusal, and
  `:450` renders one sentence: "Something went wrong saving your session. Your account is ready - go
  to your check-ins page and start again from there." The plan limit, the seat limit and "you have
  not been named as able to open check-ins" all arrive as that. The signed-in save path does the
  opposite (`EntryChatPage.tsx:2066-2072`). Carry the server's `message` on the `commitError`
  outcome and print it, keeping the generic line only for a refusal with no message. (It also uses
  the banned word "account" twice.)
- P4-A04. A merely slow concurrent commit throws `COMMIT_IN_PROGRESS` —
  `awaitConsumedDraftGround` gives up after about five seconds — and `:126-128` routes it, for
  anybody with entry intent, to `{ kind: 'noSession' }`, which renders "the session you saved isn't
  on this device and we don't have a copy of it" (`:429`) and offers "Start a new check-in"
  (`:436`), discarding a draft that is intact on the server. Separate the two: `COMMIT_IN_PROGRESS`
  gets its own outcome that says the save is still running, waits, and retries — `lastAttempt` and
  the retry button at `:453` already exist. Only `NO_ENTRY_SESSION` may reach the lost-session
  screen.
- P4-A07. `EntryChatPage.tsx:1480` — a failed entry report is
  `toast.error('We could not generate your session report. Your responses are saved.')` and nothing
  else. The toast goes and the person has no way back to it. Persist the failure on the check-in and
  render a "your report did not build — try again" state on the page, with a button that re-requests
  it. This is the same hole as NL-038, at the one moment the product has just been paid for work.

**Effort:** day. **Risk:** low. A02 changes a public route's return shape; the two callers are in
one file.

**Spec:** `one-visitors-close-is-not-anothers.spec.ts`,
`a-slow-save-is-not-a-lost-one.spec.ts`.

---

## Batch 12 — Every message carries a way out, a text part, and its own words escaped

**Closes:** NL-006, NL-016, NL-017, NL-018, NL-019, NL-023, NL-027

**The change.** All of it lands in `api/src/modules/email/email.service.ts`, and most of it in the
one chokepoint every sender passes through: `sendEmail` at `:195-256`.

- NL-016. `:249` is `this.resend.emails.send({ from: this.fromEmail, ...options })` with `to`,
  `subject`, `html` — no `text`. Generate one from the HTML in `sendEmail` (the dev branch at `:216`
  already does exactly this strip, so the code exists) and pass it. One line, 48 senders.
- NL-006. The unsubscribe link is composed only in `digestBody`
  (`nothing-lands-at-3am.ts:113-126`); no other template has one, and `sendEmail` adds no footer and
  no header. In `sendEmail`, for anything `whatThisMailIs` does not classify as "the way back in",
  append the footer and set `headers: { 'List-Unsubscribe': …, 'List-Unsubscribe-Post':
  'List-Unsubscribe=One-Click' }`. The token machinery exists; this is plumbing it into the one
  function.
- NL-017. `groundLabel`, `founderName`, `note`, `reason`, `participantEmail` and `endState` are
  interpolated raw into HTML and subjects at `:389-403`, `:448-470`, `:561-579`, `:597-627`,
  `:778-790`. Two senders already escape and prove the rule (`:721-724`, and `escapeHtml` at
  `:1105-1112`). Apply `escapeHtml` at every interpolation of a user-supplied value. The `note` on a
  participant invite at `:389` is the sharp one: free text from the inviter, inside a styled block,
  in a mail from `noreply@myground.work`.
- NL-018. The banned word, in eight places: `:132`, `:312`, `:313`, `:364`, `:378`, `:532`, `:842`,
  `:868`. One of them is the subject line of the first mail a new person ever gets. Rewrite; leave
  the product's own sense of the word (a person's account of what happened) alone. The same word
  appears in `WAITING_TO_BE_LET_IN` (Batch 8) and on `MagicVerifyPage` (Batch 11) — fix all three in
  one pass and add the word to whatever copy guard already reads literals in this file.
- NL-019. `:877`, `:925-928`, `:932` — `toLocaleDateString('en-US', …)` with no `timeZone`, and
  `$${(cents/100).toFixed(2)}` with no currency code. Format in the recipient's zone where we know
  it (the digest already resolves one) and in ISO order where we do not; print the currency.
- NL-023. `:810-822` — "A check-in in your workspace has used its free session" followed by "Every
  check-in on the free tier runs unlimited sessions and reports", under the subject "Add a card to
  continue". Rewrite to say what happened and what adding a card buys. Copy only.
- NL-027. `stop-reminders.controller.ts:38-42` returns `{ stopped: true }` and a kind sentence for an
  unknown token, by design; `round-digest.service.ts:155-157` throws 404 "That link is not valid."
  for an unknown unsubscribe token. Make unsubscribe behave like stop-reminders. Somebody trying to
  make the mail stop must never be told their link is broken; the next click is the spam button, and
  it costs every tenant on the domain.

**Effort:** day. **Risk:** low, with one exception: the escaping pass touches every template and a
missed double-escape shows up as `&amp;` in a customer's subject line. Add a golden-render spec over
all 48 senders rather than reading them.

**Spec:** `every-message-has-a-plain-text-part.spec.ts`,
`a-name-with-an-ampersand-does-not-break-the-mail.spec.ts`,
`nobody-is-told-their-unsubscribe-link-is-invalid.spec.ts`.

---

## Batch 13 — The stop link stops everything

**Closes:** NL-004, NL-024, NL-031, NL-032, NL-033, NL-034

**The change.**

- NL-004. `remindersStoppedAt` is read by `whyNotRemindThem`
  (`ignoring-it-should-be-enough.ts:57`), reachable only through `worthNudging`, whose only caller is
  the manual reminder at `remind.service.ts:137`. The scheduled sweep at `:222` does not select the
  column, and `grounds.cron.ts` never mentions it. Move the check into `sendEmail`'s
  `wouldTheyRatherNot` (`email.service.ts:68-107`) so it is answered once for every sender, the same
  argument the comment there already makes about the opt-out being honoured in three of nine senders.
- NL-024. `sendNudge` is called without a `participantId` from `remind.service.ts:186` and
  `grounds.cron.ts:551`, so `theWayToStopBeingChased` (`email.service.ts:171-193`) returns null and
  no stop link is rendered. Whether a person can stop being chased depends on which of three code
  paths chased them. Make `participantId` required on `sendNudge` and pass it from all three.
- NL-033. `EmailPreference` carries `roundDigest`, `nudges`, `quietBeforeHour`, `quietAfterHour`
  (`schema.prisma:4547-4570`) and only the digest service reads the per-type flags. Read them in
  `wouldTheyRatherNot` too, keyed off `whatThisMailIs`. There is no preference centre in the client;
  that is a screen and belongs to whoever owns the client plan — note it, do not build it here.
- NL-034. The nudge paths check `isActive` and `deletedAt` (`remind.service.ts:132, 342-346`); the
  report, resolution, billing and stall broadcasts iterate `ground.participants` or org users and do
  not (`reports.service.ts:2927`, `resolution.service.ts:305`, `grounds.cron.ts:149`). Same fix, same
  place: `wouldTheyRatherNot` refuses a deactivated or deleted user. A leaver whose address has been
  reassigned inside their old company should not receive a report.
- NL-031 is a decision, not a bug: `wouldTheyRatherNot` matches an address across every organisation
  and stops the mail if any `Person` row carries an `unsubscribedAt`, deliberately, so as not to
  reveal which tenants somebody belongs to. **Recommendation: keep it, and narrow the class** — an
  "asked for" mail (a report the person took part in) should still go, because a consultant who
  unsubscribed from one customer's digest did not ask to stop hearing about work they did for
  another. `whetherToSend` already has the two kinds; this is one more case in it.
- NL-032. `the-team-is-told.service.ts:38` classifies the internal roster alert as "we decided to
  send it" (`nothing-goes-out-that-was-turned-off.ts:129`), so an unsubscribed staff member silently
  stops receiving operational alerts, and an API-access request reaches nobody. Classify it as
  operational and exempt it from the customer-facing preference.

**Effort:** day. **Risk:** medium — this makes one function the arbiter for six kinds of suppression,
and a bug in it stops all mail rather than some. Its blast radius is also exactly why it belongs
there. Spec each rule separately.

**Spec:** `the-stop-link-stops-every-engine.spec.ts`,
`a-leaver-does-not-get-the-report.spec.ts`.

---

## Batch 14 — One clock, and one message per event

**Closes:** NL-003, NL-005, NL-020, NL-021, NL-037

**The change.**

- NL-003. `mayNotSend` (`nothing-lands-at-3am.ts:53-86`) implements quiet hours against the
  recipient's own IANA timezone and has exactly one production caller,
  `round-digest.service.ts:95`. `sendEmail` never consults it. Every other cron sends on a fixed UTC
  clock: nudges at 08:00 and 09:00, stall notices at 03:00, session-ready every fifteen minutes,
  code-expiry at midnight, feedback at 10:00. Call `mayNotSend` from `sendEmail` for every
  "we decided to send it" mail, which is what the file's name has always claimed.
- NL-020. When `mayNotSend` returns `quiet_hours` the digest loop logs and `continue`s
  (`round-digest.service.ts:95-101`): the message is dropped, not deferred. A participant whose round
  completes at 21:00 local never learns it completed. Needed before NL-003, or extending quiet hours
  to every sender silently deletes mail at scale. Add a `ScheduledEmail` row — recipient, sender,
  rendered subject and html, `notBefore` — and a sweep that sends what is due. `sendEmail` writes the
  row instead of sending when quiet hours apply.
- NL-021. Two engines send the same nudge: `remind.service.ts:222` at 08:00 UTC with the
  `whatToDoToday` policy, and `grounds.cron.ts:378` at 09:00 UTC with `NUDGE_THROTTLE_DAYS`. They
  coordinate only by the 08:00 job having stamped `lastNudgedAt` an hour earlier. Keep
  `remind.service`'s policy, which is the one that reads the lead's chase settings, and delete the
  nudge half of the 09:00 cron.
- NL-037. `grounds.cron.ts:378-380` and `:391-393` — the every-fifteen-minute session-ready job and
  the daily reminder job take the same advisory lock, `CronLock.SEND_REMINDERS`. A long session-ready
  pass overlapping 09:00 skips the day's reminders with no retry. Give them separate locks. This is a
  two-line change and should ship immediately, ahead of the rest of the batch.
- NL-005. `reports.listener.ts:110-146` handles `ground.activated` by calling `reports.release(…)`,
  which sends `sendReportReady` to every participant
  (`reports.service.ts:2925-2928`), and then sends `sendGroundActivated` to every participant-type
  party at `:140`. Two mails seconds apart announcing the same thing, pointing at
  `/grounds/:id/report` and `/grounds/:id`, neither saying which to use. Send one. Keep
  `sendReportReady` and its report link; keep `sendGroundActivated` only for the parties who are not
  already getting the report mail.

**Effort:** day and a half; the deferral queue is most of it. **Risk:** medium. A quiet-hours rule
over every sender plus a queue is the change most likely to hold mail nobody meant to hold — hence
NL-020 first, and hence a spec that asserts a held message is *sent*, not merely *not sent at 3am*.

**Spec:** the file is already called `nothing-lands-at-3am.ts`; the spec is
`nothing-lands-at-3am-and-nothing-is-lost-either.spec.ts`, plus
`one-report-one-message.spec.ts`.

---

## Batch 15 — A failure the product knows about reaches a person

**Closes:** NL-010, NL-030, NL-036, NL-038

**The change.**

- NL-010. A hard bounce *is* recorded correctly: `delivery.service.ts:130-168` writes
  `EmailDelivery.status = BOUNCED` and mirrors it onto `GroundParticipant.inviteDeliveryStatus`,
  guarding an old bounce against a newer resend. Then nothing happens. No mail to the lead who
  invited them, no alternative channel, and — the expensive part — no suppression: the send guard at
  `email.service.ts:66-107` checks preferences and never reads `inviteDeliveryStatus`, so the daily
  sweeps keep mailing a dead address and keep damaging the sending domain for every tenant. Two
  changes: `wouldTheyRatherNot` refuses an address with a recorded hard bounce and no later
  successful send; and the bounce emits an event that mails the inviting lead with a Resend-to-a-
  corrected-address action.
- NL-030. If `RESEND_WEBHOOK_SECRET` is unset in production the constructor logs a warning and every
  event is rejected (`delivery.service.ts:29-33`), so all delivery and bounce tracking is inert with
  no other signal — and NL-010 gets silently worse. Make it a startup check that reaches the
  back-office health surface, not a log line. Registering the endpoint is in Decision 2.
- NL-036. `webhooks.service.ts:343-379`: an endpoint that exhausts seven attempts is marked `DEAD`
  and the admins are mailed once per endpoint per day, but the endpoint is never deactivated, so
  every subsequent event queues, retries and dies against a receiver known to be unreachable.
  Deactivate it after the notice and say so in the mail, with a reactivate link.
- NL-038. There is no persisted notification model in `api/prisma/schema.prisma`, so a suppressed
  mail, a bounce, a quiet-hours hold, a failed WhatsApp send and a failed entry report are all
  invisible inside the product. Add a `Notification` model and write to it from `sendEmail` — every
  send, every suppression with its reason, every failure — plus the WhatsApp send record from Batch
  1. Render it later; the point of writing it now is that Batches 1, 12, 13 and 14 each produce a
  fact somebody needs and currently have nowhere to put. The screen is a client job and belongs to
  that plan.

**Effort:** day and a half. **Risk:** low, other than bounce suppression, which can stop mail to
somebody whose address was fixed. Hence "no later successful send" in the condition.

**Spec:** `a-bounced-invite-reaches-the-person-who-sent-it.spec.ts`,
`we-stop-writing-to-a-dead-address.spec.ts`.

---

## Batch 16 — Links that do not open what they promise

**Closes:** NL-002, NL-007, NL-009, NL-022, NL-028

**The change.**

- NL-002. `billing.service.ts:896` builds `${frontendUrl}/users/me/export`. There is no such route in
  `client/src/App.tsx`. The body prints the raw URL as its own link text and claims 30 days'
  validity, while the URL carries no token and no expiry — it is a plain session-gated path that does
  not exist. Every non-deleted user in a cancelling organisation gets it, which makes it the widest
  broadcast in the product. Either build the route or point at the existing export; do not send it
  until one of those is true.
- NL-022. `sendReportReady` goes to every row in `ground.participants`
  (`reports.service.ts:2927`), including people invited by address who have never set a password, and
  the link is `/grounds/:id/report`, wrapped in `RequireOrgSetup` (`App.tsx:392`). The one mail whose
  whole job is to bring somebody back lands them on a sign-in wall. Carry a single-use token on the
  link for a participant with no password, the way the invite already does, and land them on the
  report.
- NL-007. `grounds.cron.ts:543-551` passes `p.recordEntries[0]?.text` — the participant's own last
  private record entry — as `groundLabel` into `sendNudge`, rendered at `email.service.ts:620`; and
  `:426, 445, 449` puts the same text into `sendSessionReady` as `lastCheckInContext` and into the
  WhatsApp body as `Last time: "…"`. `nothing-lands-at-3am.ts:1-11` states the rule and `digestBody`
  is built to make it impossible; these two senders go around it. Remove the entry text from both.
  The reminder does not need it, and this is the product's central promise. Structural, not a prompt
  instruction: strip it at the read, in the cron's `select`.
- NL-009. `inviteTokenExpiresAt` is written at creation (14 days,
  `grounds.service.ts:631`) and at address change (90 days, `participants.service.ts:406`). No
  sender, cron or query warns before it lapses. Add a daily sweep that mails the invitee two days
  out and tells the lead when one has lapsed.
- NL-028. Two lifetimes for one kind of link, 14 days and 90. Pick 90 — `loadByToken`'s own comment
  at `participants.service.ts:455-461` already argues for it — and write it in both places. The
  invite preview route (`participants.controller.ts:44`) returns the ground label, the scenario, the
  initiator's full name and the invitee's address with no throttle decorator; add one, matching the
  other public token routes.

**Effort:** day and a half. **Risk:** low, except the tokenised report link, which creates a new
credential and should be reviewed alongside whoever owns the security slice.

**Spec:** `a-report-link-opens-the-report.spec.ts`,
`a-reminder-does-not-quote-what-you-wrote.spec.ts`.

---

## Batch 17 — The answer nobody is given

**Closes:** NL-008

**The change.** `ApiAccessService.decide` (`api-access.service.ts:155-181`) writes the status, the
decider and a mandatory note, logs one line and returns. There is no `EmailService` dependency
anywhere in the file. The code's own comment says "Somebody is going to be told no", and nothing
tells them. A customer who asked for the integration waits with no answer, or finds out their
working integration was switched off when their calls start failing — and the note that was made
mandatory *so that somebody could be told* reaches nobody.

Three senders: approved (with the next step), declined (with the note), withdrawn (with the note and
when access ends). Write the same fact to the `Notification` model from Batch 15.

**Effort:** half-day. **Risk:** low.

**Spec:** `somebody-is-told-no.spec.ts`.

---

## Batch 18 — Switch on what is already built

**Closes:** P6-006, P6-007

**The change.** Two finished subsystems that cannot be reached, both wanting a section on a page that
already exists: `client/src/pages/org/IntegrationsPage.tsx`, which today has credentials, webhooks
(`:639`) and WhatsApp (`:695`) and stops there. Confirmed by grep: neither
`integrations/embed` nor `integrations/workspace` appears anywhere in `client/src`. This closes
P6-007's "Check needed" — there is no computed URL reaching it.

- P6-006. Slack and Teams notification is wired end to end. `tell()` has five live production call
  sites — `reports.service.ts:2939`, `remind.service.ts:431`, `webhooks.listener.ts:71, 196`,
  `webhooks.service.ts:363` — and reads
  `workspaceNotifier.findMany({ where: { organizationId, enabled: true } })`
  (`workspace-notifier.service.ts:109`). The only route that can write such a row is on a controller
  with no caller, so for every organisation that query returns empty and `tell()` returns `[]`. Add
  a "Where we tell you" section: paste an incoming-webhook URL, pick Slack or Teams, test it, switch
  it off.
- P6-007. `POST /integrations/embed` (`embed-setup.controller.ts:28`) is the only writer of
  `EmbedConfig.allowedDomains` and the only issuer of the embed signing secret, and it has no client
  caller. `GET /embed.js` and `GET /embed/panel` are served, and `EmbedSessionGuard` gates on config
  nothing can create. Over 1,300 lines including a served loader, a panel page and a signing scheme,
  reachable only by writing a database row by hand — while the same page's copy at
  `IntegrationsPage.tsx:284` already promises "you can put the check-in inside your own product",
  and `:782` shows a screenshot of it. Add an "Embed the panel" section: allowed domains, placement,
  out-of-scope departments, the signing secret shown once, and the snippet to paste.

Note for sequencing: everything in Batch 6 and Batch 7 fixes a panel that no customer can currently
switch on. That is an argument for doing this batch alongside them, not for skipping their fixes —
the first customer to switch it on should not be the one who finds P4-E02.

**Effort:** day. **Risk:** low. Both are new UI over routes that exist and are already
admin-guarded and specced.

**Spec:** `the-embed-can-be-switched-on-from-the-console.spec.ts`,
`a-report-reaches-the-channel-the-team-lives-in.spec.ts`.

---

## Batch 19 — Credentials and tokens on the notification surface

**Closes:** NL-015, NL-025, NL-026, NL-035

These are security-axis findings that arrived inside the notifications slice. They are listed here
so none is dropped; the work should be sequenced with whoever owns the security plan, and NL-035 and
NL-015 need Hafsah's key-management call first (Decision 2).

- NL-015. `WhatsAppConnection.accessToken`, `appSecret` and `verifyToken` are plaintext columns
  (`schema.prisma:1889, 1891, 1893`) written raw by `connect()` (`whatsapp.service.ts:293-310`), with
  no encryption anywhere in `api/src`. `connectionFor` (`:259-273`) correctly withholds the access
  token and app secret but returns `verifyToken` in full to any organisation admin — which is
  arguably right, since the admin must paste it into Meta, but it should be a deliberate one-time
  reveal, not a field on every read. The neighbouring schema comment at `:1940-1942` argues that
  integration secrets must be hashed; this model does the opposite. Encrypt at rest.
- NL-025. `AuthService.validateToken` (`auth.service.ts:890`) returns the email address and first
  name for an unused set-password token without consuming it, so a forwarded or intercepted link
  discloses whose it is. Return only validity.
- NL-026. `resetPassword` (`auth.service.ts:759, 775-790`) consumes the token and writes the new
  password without bumping a session version or invalidating existing JWTs — so the person who reset
  because they think somebody else is in does not put them out. Add a `sessionsValidFrom` on `User`
  and check it in the JWT strategy.
- NL-035. Every emailed token is stored in plaintext except the admin OTP and the API client secret.
  All are 192–256 bits of `crypto.randomBytes`, so guessing is not the risk; a read-only database
  leak is. Store a hash and look up by hash.

**Effort:** more than a day. **Risk:** medium — NL-026 logs everybody out on deploy if
`sessionsValidFrom` defaults wrongly; NL-035 needs a migration, though per the standing note there is
no live data to migrate.

**Spec:** `a-set-password-link-does-not-say-whose-it-is.spec.ts`,
`resetting-a-password-puts-everybody-else-out.spec.ts`.

---

## Batch 20 — What only an inbox can settle

**Closes:** NL-029

**The change.** `isDev()` (`email.service.ts:54-59`) returns true whenever `NODE_ENV` is anything but
`production`, *and* whenever the Resend key is missing or a placeholder. In that mode nothing reaches
Resend: a console line, and a best-effort nodemailer relay to `127.0.0.1:1025`. A staging deployment
with real credentials and `NODE_ENV` unset silently sends nothing, and the log line is the only
evidence.

The code change is small — decide on the credential, not on `NODE_ENV`: send for real whenever a
real Resend key is configured, and log loudly at boot when the key is a placeholder in a deployed
environment. But whether staging is currently in this state cannot be answered from the repository,
which is why this batch sits with Decision 2 and should be done with the inbox work rather than
before it.

**Effort:** hours for the code; the confirmation is somebody else's access.
**Risk:** medium in one direction only — a misjudged condition starts sending real mail from a
staging environment to real addresses. Gate it on an explicit `EMAIL_SENDS_FOR_REAL=true` rather than
inferring.

**Spec:** `a-deployment-that-cannot-send-says-so-at-boot.spec.ts`.

---

## Coverage

| ID | Batch |
|---|---|
| NL-002 | 16 |
| NL-003 | 14 |
| NL-004 | 13 |
| NL-005 | 14 |
| NL-006 | 12 |
| NL-007 | 16 |
| NL-008 | 17 |
| NL-009 | 16 |
| NL-010 | 15 |
| NL-011 | 3 |
| NL-012 | 1 |
| NL-013 | 3 |
| NL-015 | 19 |
| NL-016 | 12 |
| NL-017 | 12 |
| NL-018 | 12 |
| NL-019 | 12 |
| NL-020 | 14 |
| NL-021 | 14 |
| NL-022 | 16 |
| NL-023 | 12 |
| NL-024 | 13 |
| NL-025 | 19 |
| NL-026 | 19 |
| NL-027 | 12 |
| NL-028 | 16 |
| NL-029 | 20 |
| NL-030 | 15 |
| NL-031 | 13 |
| NL-032 | 13 |
| NL-033 | 13 |
| NL-034 | 13 |
| NL-035 | 19 |
| NL-036 | 15 |
| NL-037 | 14 |
| NL-038 | 15 |
| P4-003 | 1 |
| P4-A02 | 11 |
| P4-A03 | 11 |
| P4-A04 | 11 |
| P4-A07 | 11 |
| P4-B02 | 8 |
| P4-B03 | 8 |
| P4-B04 | 9 |
| P4-B05 | 8 |
| P4-B08 | 8 |
| P4-B09 | 8 |
| P4-B10 | 10 |
| P4-B11 | 10 (confirmed, no change needed) |
| P4-E01 | 6 |
| P4-E02 | 6 |
| P4-E03 | 6 |
| P4-E04 | 6 |
| P4-E05 | 6 |
| P4-E06 | 6 |
| P4-E07 | 6 |
| P4-E08 | 7 |
| P4-E09 | 7 |
| P4-E11 | 7 |
| P4-F01 | 1 |
| P4-F02 | 1 |
| P4-F03 | 4 |
| P4-F04 | 5 |
| P4-F05 | 1 |
| P4-F06 | 2 |
| P4-F07 | 2 |
| P4-F09 | 2 |
| P4-F10 | 1 |
| P4-F12 | 2 |
| P4-F13 | 1 |
| P4-F15 | 2 |
| P6-006 | 18 |
| P6-007 | 18 |

NL-001 and NL-014 are excluded by scope. `P4-E10`, `P4-F08`, `P4-F11` and `P4-F14` do not exist in
the register. `P6-013` and `P6-014` are the same class as Batch 18 but are not named in this slice —
they belong to whoever owns the P6 unreachable-modules question.

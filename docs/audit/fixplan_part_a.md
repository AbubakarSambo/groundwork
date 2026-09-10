# Fix plan, part A: security, tenancy, metering and money

Sixteen batches covering every finding in the register whose cause is a missing fence, a missing
gate, or a charge in the wrong place. Every file and line below was read at commit `fcbc3f9`
before the change was proposed; where the register's line numbers had drifted the verified
location is given instead.

Order is user harm, then blast radius, then effort. Batches 1 to 4 are exploitable today by
somebody with no account.

---

## Batch 1 — Three public routes that act with the product's own authority

**Closes:** P0-001, P0-002, P4-A01

**What an attacker can do today, with no account and no token.**

`GET /health/email?to=anyone@anywhere` (`api/src/main.ts:192-217`) sends real mail through Resend
from `noreply@myground.work` to any address, as fast as they can issue GET requests. The route is
registered on the raw Express adapter *after* `app.get(...)`, so it is outside the global
`JwtAuthGuard`, outside `RolesGuard`, and outside the throttler — no Nest guard runs on an
`httpAdapter` route. The comment above it says "Safe to leave in: no auth bypass, no data
exposure". It is an open relay. The cost is the sending domain's reputation, which every
invitation, magic link and report notice depends on.

`GET /health/ai` (`main.ts:178-187`) is the same shape, calling `AnthropicService.healthCheck()`,
which the service documents as deliberately making a real model call. Anyone can spend our model
budget at request rate.

`POST /auth/entry-save` is `@Public()` (`auth.controller.ts:253-258`). For an address that already
has an account, the existing-user branch at `auth.service.ts:573-582` upserts that user's
`EntryDraft` with the caller's `payload` and `history`, clears `consumedAt` and `groundId`, and
**returns the freshly minted `draftToken` to the unauthenticated caller** (`:606`). The caller
keeps editing through `PATCH /entry/draft`. The same call emails the victim a magic link;
`MagicVerifyPage.tsx:220-229` commits on arrival, and `commitInner` renames the organisation from
`dto.orgName` (`entry.service.ts:1350-1355`) and invites the payload's contributors. One known
email address destroys a customer's unsubmitted session, renames their company, spends a free
check-in and sends invitations from their organisation to addresses the attacker chose.

**The change.**

- `main.ts`: delete the `/health/email` route outright — it is a diagnostic, and the same answer
  is available from the Resend dashboard. Keep `/health` (a static `ok`). Replace `/health/ai`
  with a cached read: have `AnthropicService` record the outcome and timestamp of the last real
  call made in the course of ordinary work, and have the route report that record without calling
  the model. If a synthetic probe is genuinely wanted, run it from the existing cron, not from an
  inbound request.
- `auth.service.ts` `entrySave`: in the existing-user branch, never write `payload`, `history` or
  `orgName`, and never return a `draftToken`. An unauthenticated caller naming an existing address
  gets exactly one effect: the magic link is emailed. The anonymous session they were holding is
  attached after the link is opened, from the browser that holds it, not from the request. The
  pending-signup branch (`:514-568`) is unaffected — no account exists there to overwrite.
- Return the same `{ message, email }` for both branches so the route stops telling a caller
  whether an address has an account.

**Migration / backfill:** none. Any `EntryDraft` already overwritten is unrecoverable and
undetectable; there are no live customers (`groundwork-stripe-not-wired-no-subscribers`), so
nothing needs restoring.

**Spec:** `a-health-check-does-not-send-mail.spec.ts` (asserts no route on the http adapter reaches
`resend.emails.send`, and that `/health/ai` makes no model call);
`entry-save-cannot-touch-an-account-that-already-exists.spec.ts` (existing user + payload → draft
row unchanged, no `draftToken` in the response body).

**Effort:** half a day.

**Risk:** low. `/health/ai` is read by a monitor — check whether anything alerts on it before
changing its body shape. The `entrySave` change removes a "last save wins" convenience for a
signed-out person returning on a new device with a session in hand; that person now signs in
first. Confirm no client relies on the returned `draftToken` for the existing-user case
(`EntryChatPage.tsx` currently stores it).

---

## Batch 2 — Writes and reads that name a record by its id and nothing else

**Closes:** P1-001, P1-002, P1-003, P1-004, P1-006, P1-007, P1-014, P4-001, P4-H02, P4-G01, P4-G02

One cause, eleven places: a handler resolves a row by its own id, and the organisation, the party,
or the role is asserted in a comment rather than in the query. P4-001 and P4-H02 are the same
finding as P1-003, filed three times.

**Verified specifics.**

| Where | What is missing |
|---|---|
| `reports.service.ts:1841, 1934, 2496, 3554` | `isOrgAdmin` is `ground.organizationId === requestingUserOrgId` with **no role test**. Any member of the customer's organisation passes, and `viewerIsLead` is set from it (`:1845, 3734`), so they get resolved names, `whatItRestsOn`, `whatTheRecordHolds` and the probe list. `board.service.ts:199-200` writes the same rule correctly. |
| `grounds.service.ts` `get` | `findFirst({ where: { id, organizationId } })` with no party test; the include pulls `report.sharedPicture`, `agreements`, `divergences`, objectives, participants and pattern signals. |
| `billing.service.ts:395-412` `claimFreeExtension` | `ground.update({ where: { id: groundId } })` with `groundId` straight off the body. `purchaseSession` two methods above does `findFirst({ where: { id: groundId, organizationId } })` at `:214`. |
| `patterns.service.ts:689-693` `rateAccuracy` | `patternDetection.update({ where: { id: detectionId } })`. The route is `@Roles(Role.ADMIN)` (org admin) while the doc comment one line up says "Only platform admins can rate". Ratings feed `codeAccuracySummary()`. |
| `alignment.service.ts:40-58`, `assertions.service.ts:50-53`, `agreements.service.ts:52-56, 68-81` | Four creates write `{ organizationId, groundId }` with **no read of the ground at all**. `parties.service.ts:44-49` does it right. |
| `drafts.controller.ts:29-34, 51-66` | `status`, `resolveContention` and `seed` never receive `req.panel.externalId`; `drafts.service.ts:356` resolves on `{ id, organizationId }` only. `invite` and `contribute` do pass it. |
| `a-check-in-a-customer-can-run.service.ts:446-449` | `checkIn.findUnique({ where: { id: checkInId } })` — no org, no person. Safe only because `documents.upload` re-checks two files away. |
| `public-api.controller.ts:1152, 1163` | `howTheirForecastsHaveGone` and `beforeAConversation` take `(organizationId, personExternalId)` — no `req.machine`, no `mayTouch`. A credential issued with `boundToPersonExternalIds` reads any person in the org by path. |
| `detectors.controller.ts:68-84` `GET /findings` | Reads `detectorResult` for the whole organisation with no fence, while `structuredFindings` over the same table filters through `mayTouch` (`grounds-by-api.service.ts:1013`). |

**The change.** One helper, applied everywhere. Add to `grounds` a single
`assertMaySeeGround(groundId, userId)` — the one at `grounds.service.ts:3055` already has the right
shape — and a write-side `assertGroundBelongsTo(groundId, organizationId)`. Then:

- `reports.service.ts`: at all four sites, replace the bare org comparison with the board's rule —
  load the viewer's `role` and require `role === 'ADMIN' && organizationId === ground.organizationId`.
  Keep `viewerIsLead` derived from the corrected variable.
- `grounds.service.ts` `get`: add the party test. Non-admins get their own grounds only, matching
  what `list` already does in the same file.
- `billing.service.ts` `claimFreeExtension`: resolve the ground with
  `findFirst({ where: { id: groundId, organizationId } })` first and throw `NotFoundException('Check-in not found')`, exactly as `purchaseSession` does.
- `patterns.controller.ts:31`: swap `@Roles(Role.ADMIN)` for `@UseGuards(PlatformAdminGuard)`, which
  is what the sibling `GET /patterns/accuracy` already carries and what the service comment
  demands.
- The four alignment creates: call `assertGroundBelongsTo` before the create, and take the party
  test from `parties.service.ts`. Fix `agreements.mustBeAbleToSpeakForThisSide` to read the
  initiator with an org predicate.
- `drafts.controller.ts`: pass `req.panel.externalId` on all six routes; `drafts.service.mine()`
  takes it and requires the caller be the starter or a named participant of the draft.
- `a-check-in-a-customer-can-run.service.ts:446`: scope like its sibling at `:341`.
- `public-api.controller.ts:1152, 1163`: pass `req.machine` and have both service methods call
  `mayTouch(fence, personExternalId)`, throwing `OUTSIDE_THE_FENCE`.
- `detectors.controller.ts` `findings()`: filter the rows through `mayTouch` on
  `r.personExternalId`, the same way `structuredFindings` does.

**Migration / backfill:** no schema change. Data already written is wrong in two places and worth
checking: `PatternDetection.accuracyRating` rows whose `ratedBy` user is not a platform admin
(these skew `codeAccuracySummary`, shown as fact on the prompts dashboard) — null them; and
`BillingEvent` rows of type `FREE_EXTENSION` whose `groundId` belongs to an organisation other than
the row's `organizationId` — a one-query check, likely zero rows locally.

**Spec:** `a-ground-id-is-not-a-key-to-the-organisation.spec.ts` — a table-driven spec that, for
each of the nine handlers, calls it as a member of the right org who is not a party and asserts a
throw; plus `an-org-admin-reads-with-the-lead-s-eyes.spec.ts` (exists, never sets a role) extended
to set `role: 'MEMBER'` and expect refusal.

**Effort:** one day.

**Risk:** medium, and mostly about breaking legitimate reads. The org-admin-reads-the-report path
is used — check `GroundAdminPage` and the board before tightening, because the server has
deliberately widened three things (context notes, baseline, resolution read) to org admins and this
change must not narrow those. The alignment creates are called from the panel; adding a ground
lookup adds one query per write.

---

## Batch 3 — The promise the product is sold on: raw words

**Decided by the product owner, 10 September 2026.** The route is not deleted. It paraphrases,
keeping the main point, or extracts the context. Raw words never leave the person who wrote them,
and this holds most strictly where the result can reach a report.

That changes the shape of this batch. Deleting the route was the cheap answer and it removes a
capability the lead legitimately needs, which is to understand what was said without being handed
somebody's exact sentences. What replaces it:

- The route returns a paraphrase per party, not turns. The existing screening already knows what a
  lifted run looks like; the same test decides whether a paraphrase is close enough to the original
  to count as the original.
- Anything derived this way is marked as derived where it is stored, so a later reader cannot
  mistake it for a quotation, and so the report builder can refuse to treat it as evidence.
- The paraphrase is produced once and kept, rather than regenerated per request. A paraphrase that
  changes between two readings of the same check-in is worse than no paraphrase.
- The screening runs at the read, not only at the write. This is the structural rule the codebase
  already learned twice: anything derived from a private record is stripped at the read, never
  protected by an instruction in a prompt.

Effort: this is no longer half a day. Budget two days, because it needs the paraphrase to be
generated, stored, screened and specified, and because the report path has to learn the difference
between a quotation and a paraphrase.

Spec: `a-paraphrase-is-not-a-quotation.spec.ts`, and the existing lift screening extended to run at
this read.


**Closes:** P6B-004, P6B-015, P1-005, P1-016, P6B-001, P6B-009, P6B-014

The homepage says "Leaders get the report. They cannot request an individual's check-in, and there
is no screen anywhere that shows one, including ours" (`index.astro:367`). The second half is true.
The first is not.

- `GET /grounds/:id/conversation` (`grounds.controller.ts:566-570` → `grounds.service.ts:4167-4200`)
  returns every participant's raw turns, grouped by party, with `email`, `partyType` and full
  `content`. The only gate is `initiatorId: requestingUserId`. No client calls it; it is in the
  generated API reference and any lead with a browser console can call it.
- Inside the shared synthesis prose there is no structural guard at all. `counts-accounts.ts:16-62`
  detects and warns; it never rewrites. The private guide, the manager board and name resolution
  *are* structurally enforced. The load-bearing promise rests on the model complying, which
  `guide-sanitiser.ts` itself argues is not good enough.
- `POST /documents/invite-upload?token=` is `@Public()` (`documents.controller.ts:20-27`). Verified:
  `uploadByInviteToken` (`documents.service.ts:498-535`) does a bare
  `findUnique({ where: { inviteToken: token } })` with no expiry check, and — the part that matters
  — it never calls `looksLikeAConversation` and never asks `consentConfirmed`. The authenticated
  path refuses a transcript without that confirmation (`:292-293`) and the comment there calls the
  refusal the point of the feature. Anyone holding an old invite email pushes a 10 MB meeting
  transcript onto that ground with nobody asked, and it is assessed and anchored. The credential
  also travels in the query string, so it lands in every access log on the path.
- Three written claims are broader than the code: `how-it-works.astro:89` still says raw answers
  are never shown (removed from the homepage once already for being false — the guard
  `the-site-does-not-promise-more-than-this.spec.ts:29` reads only `index.astro`);
  `prompt-library.ts:3512, 3528` instructs the model to tell a participant "what the confidence
  score is" against "Nobody is scored, ranked or watched"; `privacy-and-ai.astro:55` says staff
  "cannot access your ... underlying organizational data" while `admin.controller.ts:232-307` reads
  rosters, participant emails, check-in status and report state.

**The change.**

- Delete `GET /grounds/:id/conversation` and `grounds.service.getConversation`. Nothing calls it.
  Keep `GET /grounds/:id/my-transcript`, which is the owner's own record and is correct.
- `uploadByInviteToken`: replace the bare lookup with `participants.loadByToken(token)` (single
  source of the expiry and single-use rules, `participants.service.ts:428-466`), then run the same
  three steps the authenticated path runs — `looksLikeAConversation`, refuse with `NOT_CONFIRMED`
  when unconfirmed, and set `defaultVisibilityForUpload()`. Move the token from `@Query('token')`
  to a header or the multipart body.
- Extend the verbatim-lift screen to every released field, not only the picture: run
  `counts-accounts` over `sharedPicture`, `agreements` and `divergences` at release, and hold the
  release for review rather than warning into a log.
- Copy: remove the sentence at `how-it-works.astro:89`; widen
  `the-site-does-not-promise-more-than-this.spec.ts` to read every page under `marketing/src/pages`
  rather than `index.astro` alone. Strike the score sentence from `prompt-library.ts:3512, 3528`.
  Reword `privacy-and-ai.astro:55` to say what is true — content is walled off, and rosters,
  addresses and completion state are visible to platform staff.

**Migration / backfill:** none. Worth one query: `GroundDocument` rows whose `participantId` came
in through the invite path and whose content `looksLikeAConversation` — those were taken without
consent and should be deleted, not relabelled.

**Spec:** `a-lead-cannot-ask-for-somebody-s-words.spec.ts` (route absent, and a sweep asserting no
handler returns `conversationTurn.content` for a `participantId` other than the caller's);
`an-invite-token-cannot-smuggle-a-transcript.spec.ts`;
`the-site-does-not-promise-more-than-this.spec.ts` extended to the whole site.

**Effort:** one day.

**Risk:** low for the route deletion and the upload fix. The verbatim screen over the whole report
is the risky half — it can hold a release, so it needs a clear operator path when it fires, and it
will fire on true positives that a person then has to judge.

---

## Batch 4 — The join link is a way into an organisation

**Closes:** P4-B01, P4-B07

`entry.service.ts:1874-1962` `joinConfirm`. Verified line by line against
`participants.service.ts:155-240`, which is the invite path and does it correctly.

The invite path computes `needsApproval(...)`, sets `awaitingOrgApproval` on the new user, writes a
`MembershipRequest`, and checks the seat cap. `joinConfirm` does **none of the four**. It creates
the user with `role: 'MEMBER'` and `isEmailVerified: true`, creates the participant, creates a
session-1 check-in, and signs a token. A join link is designed to be forwarded to a cohort, so
anyone who receives a forward becomes an unapproved, unmetered member of that organisation with a
live check-in.

Separately at `:1959`: the token is signed
`{ sub, email, organizationId: user.organizationId, role: user.role }`. For somebody who already
has an account elsewhere that is their **home** organisation and their **home** role, not the one
they just joined — the membership upsert at `:1895-1902` correctly gives them `GUEST_ROLE` here and
the token then ignores it.

**The change.** Extract the approval and seat logic from `participants.service.ts:155-240` into a
shared `admitSomebodyToThisOrganisation(tx, { user, ground, invitedBy })` and call it from both.
`joinConfirm` then: computes `needsApproval` (a join link is *not* an admin adding somebody, so
`addedByAnAdminOfThisOrg` is false), sets `awaitingOrgApproval`, writes the `MembershipRequest`,
and checks the cap before creating the check-in. Sign the token with the organisation whose ground
was just joined, and with the membership role for that organisation.

**Migration / backfill:** none structural. Check for `User` rows created by `joinConfirm`
(`awaitingOrgApproval: false`, `passwordHash: null`, no `MembershipRequest`) and queue them; locally
this is likely a handful of test rows.

**Spec:** `a-forwarded-join-link-still-waits-at-the-door.spec.ts` — asserts the join path and the
invite path produce the same `awaitingOrgApproval`, the same `MembershipRequest`, and the same
refusal at the seat cap; plus a case asserting the minted token's `organizationId` is the ground's.

**Effort:** half a day.

**Risk:** medium on the token change — anything reading `organizationId` off the JWT for a
cross-org guest changes behaviour. `isASecondOrganisation` and the org switcher are the places to
check. P4-B03 (in another slice) already reports that a queued participant is signed in and then
refused with a misleading message; this batch makes that path more common, so the two should land
together or the copy fixed first.

---

## Batch 5 — The meter is spent before the thing is delivered

**Closes:** P2-001, P4-002, P4-H01, NL-014, P4-A05, P4-A06, P4-A08, P2-006

All of `conversation.service.ts` `open()`. Verified: the AI-turn idempotency guard returns at
`:550`; the balance decrement is `updateMany({ where: { id, sessionsBalance: { gt: 0 } }, data: { decrement: 1 } })` at `:633-637`; `freeSessionsUsed` increments at `:657-660`; the model is called
at `this.anthropic.respond(...)` around `:735`; and the AI turn — the only write that makes either
guard true next time — is created at `:739-747`. `sessionsBalance` is written in exactly one place
in the file. There is no try/catch around the model call, no compensating increment, and no refund
path anywhere in `billing.service.ts`.

Three consequences, all live:

1. Every model timeout, rate limit or 5xx during an opener burns a credit and leaves nothing
   behind, and the retry takes the same branch and burns another. The `roundAlreadyStarted` query
   is scoped `id: { not: checkIn.id }` (`:576`), so the person's own failed attempt never counts.
2. Two concurrent opens both see no AI turn, both pass, both decrement.
3. On WhatsApp the reply is sent through `sendFor`, which swallows a failure and returns `false`
   (`whatsapp-for-an-organisation.service.ts:134, 247`) — the credit is spent on a session whose
   first message never arrived, and nothing records that.

Alongside it, three places where work is paid for before anybody is entitled to it: `commitInner`
runs the permission gate (`entry.service.ts:1332-1340`) and the billing gate only *after* the whole
public entry chat, the check-in and the entry report have been generated (P4-A05); the ground is
created and counted before any invite is sent, so a total invite failure leaves a spent free slot
on a ground that cannot do its job (P4-A06); and the public entry routes accept an unbounded
client-supplied history — `TurnDto` is bare `@IsString()` on both fields
(`entry.controller.ts:9-18`), no `MaxLength`, no `ArrayMaxSize` — which is replayed to the model,
with no usage event written (P4-A08). And `whatsapp.controller.ts:71-77` reads `message.from` and
`message.text?.body` and never `message.id`, so a Meta retry appends a second turn and a second
charge (P2-006).

**The change.**

- Restructure `open()` into: gate → model call → **one transaction** that writes the AI turn,
  decrements the balance, increments `freeSessionsUsed` and sets the check-in `IN_PROGRESS`. Nothing
  is charged for work that did not return. This also collapses the concurrency race, because the
  decrement and the turn that guards it become one write.
- Add a `chargedAt`/`sessionCharge` marker keyed on `(groundId, sessionNumber)` so the "was this
  round already paid for" question is answered by a row rather than inferred from the presence of
  somebody else's AI turn. That is the shape `billing.service.ts:465-478` already uses for Stripe
  invoices and whose comment describes this exact check-then-act race.
- WhatsApp: only commit the charge once `sendMessage` reports the message left. Read `message.id`
  (`wamid`) and record it on the turn with a unique index, so a retry is a no-op — `InboundMessage.providerId` (`schema.prisma:688`) is the email model and gives WhatsApp nothing.
- `commitInner`: move the `mayOpen` permission answer to the top of the *public entry chat*, not the
  commit — a person who may not open a check-in here should be told before the conversation, not
  after the report. Move the emit of `CHECK_IN_COMPLETED` after the contributor loop, and make the
  free-ground count conditional on at least one invite having been posted.
- `TurnDto`: `@IsIn(['user','assistant'])` on role, `@MaxLength(8000)` on content, `@ArrayMaxSize`
  on `messages`. Write a usage event for each public entry turn.

**Migration:** yes — one table or one column for the per-round charge marker, and a unique index on
the WhatsApp provider message id. **Backfill:** balances already burned by failed openers cannot be
identified after the fact (nothing was written). With no paying customers this is free to leave;
say so rather than pretending it was reconciled.

**Spec:** `a-session-nobody-received-is-not-charged-for.spec.ts` (model throws → balance unchanged,
retry charges once); `two-people-opening-at-once-pay-once.spec.ts`;
`meta-sends-the-same-message-twice.spec.ts`.

**Effort:** more than a day. `open()` is long and the reordering touches the prompt assembly.

**Risk:** high — this is the hot path of the product. The transaction now spans the turn write and
the balance write, so a long model call must stay *outside* it. Watch for the free-tier /
subscription branch (`gate.sessionsBalance !== -1`), which must keep skipping the decrement, and the
`isSelfCorrection` exemption, which must keep being free.

---

## Batch 6 — The back office door protects a path, not a privilege, and its code is guessable

**Closes:** P1-008, P1-009, P1-011, P1-012, P1-013, P2-007, NL-001

`the-back-office-has-a-door.ts:28` is `/^\/api\/v1\/(ops|admin)(\/|$|\?)/` — a case-sensitive regex
over the undecoded path. Verified by listing every `PlatformAdminGuard` in the codebase: the door
misses `GET /billing/admin/stats` (all orgs, codes, redemptions), `POST /billing/contributor-codes`
and `contributor-codes/send-to-email`, the whole `/prompts` controller, `GET /patterns/accuracy`,
`GET /feedback`, and both `/coach` admin routes. A stolen platform-admin session reaches most of
the platform's cross-org data without ever meeting the door. Express matches case-insensitively on
the decoded path, so `/api/v1/ADMIN/...` and `/api/v1/%61dmin/...` route to the admin controller and
miss the regex (P2-007).

Both six-digit codes are `String(Math.floor(100000 + Math.random() * 900000))` —
`back-office-door.service.ts:51` and `admin.service.ts:763`. `Math.random` state is recoverable from
observed output; bcrypt-hashing a predictable input does not help. `verify` (`:69-82`) has no
attempt counter, no lockout, no invalidation on a wrong guess, and no `isStaff` re-check, against a
ten-minute window and the plain 60/min global throttle. A correct code opens the console for a
week. And `mayOpen` treats `signedInVia === 'google'` as a permanent exemption, reading it from the
JWT claim (`jwt.strategy.ts:52`) — the one field in `validate()` not re-read from the row.

**The change.**

- Stop matching on the URL. Make the door key off the privilege: have `PlatformAdminGuard` and
  `OpsCapabilityGuard` require an open pass, or mark the protected handlers with a
  `@BehindTheDoor()` decorator the guard reads via the reflector. `isTheBackOffice(path)` becomes
  `isTheBackOffice(handler)`. That closes the prefix gap and the case/encoding gap at once.
- Both code generators: `crypto.randomInt(100000, 1000000)`, the generator used for every other
  credential here (`grounds.service.ts:622`, `auth.service.ts:575`).
- `verify`: count attempts on `BackOfficePass`, clear `codeHash` after five wrong guesses, and
  re-check `isStaff` before granting the pass. Add a route-level `@Throttle({ global: ... })` on the
  verify route.
- `jwt.strategy.ts:52`: read `signedInVia` from the user row like every other field. Reconsider the
  Google exemption entirely — a second factor that a whole sign-in method skips is not a second
  factor.

**Migration:** small — an attempt counter column on `BackOfficePass`. **Backfill:** none, but revoke
every currently open pass on deploy (`expiresAt` in the past), because passes granted under the old
generator cannot be told apart from ones that were not.

**Spec:** `the-door-is-in-front-of-a-privilege-not-a-path.spec.ts` — enumerates every handler
carrying `PlatformAdminGuard` and asserts each is behind the door; plus
`a-code-that-cannot-be-guessed-and-cannot-be-hammered.spec.ts` (no `Math.random` anywhere in
credential generation; sixth wrong guess kills the code).

**Effort:** half a day.

**Risk:** medium. Getting the decorator wrong locks the team out of their own console. Ship with a
break-glass path and test the ops routes end to end, because `ops-people.service.identify()`
auto-creates the caller's `OpsPerson` on first touch and that write is on the same path.

---

## Batch 7 — Money the product takes, keeps, or refuses to give back

**Closes:** P6B-011, P6B-012, P4-H03, P4-H04, P4-H12, P4-H11, P4-008

Four separate promises broken by the same habit — the billing rule lives on one surface and not the
other.

- `cancelSubscription` (`billing.service.ts:564-577`) calls `stripe.subscriptions.cancel()`, which
  ends it **immediately** with no proration, then nulls the plan, status, stripe id and period end.
  `cancel_at_period_end` is never set. The pricing page says "your subscription ends at the close of
  the billing period. No penalties, no questions." Cancelling on day two forfeits twenty-eight paid
  days and the seats.
- `canCreateGround` (`:174-177`) counts `ground.count({ where: { organizationId } })` — every
  check-in the org has **ever** created — against the free limit. It is a lifetime counter dressed
  as a remaining allowance. An org that made forty while subscribed and then cancels gets zero free
  ones, having read "You can still run Grounds on the free plan (up to 10 total)".
- `claimFreeExtension` has no `isFreeGround` guard — verified, `purchaseSession` twenty lines above
  has exactly that guard with the message "This check-in has unlimited free sessions - nothing to
  purchase". `PostSessionPanel.tsx:51-66` offers "Add one more free session" whenever
  `!freeExtensionUsed`, with no test of whether the check-in is metered. `freeExtensionUsed` is a
  boolean with no reset, so the org's one extension is spent on a ground that never needed it and
  the person is told "Free session added".
- That same button is participant-facing while the route is `@Roles(Role.ADMIN)`
  (`billing.controller.ts:64-72`). A blocked non-admin presses it, gets "Could not claim free
  session. Try again." — which is also the message for "already used", which is permanent.
- `POST /billing/purchase-session` is live and creates a real `unit_amount: 500` Checkout
  (`billing.service.ts:224-240`). Its own annotation reads "LEGACY - per-session purchase. Sessions
  are not sold; no user-facing surface calls this." The client removed the tier
  (`client/src/api/billing.ts:221`, `PostSessionPanel.tsx:29`). A charge endpoint outside the priced
  surface.
- And there is no refund, reversal or credit anywhere in `billing.service.ts`, which is what makes
  every consumption defect above permanent from the customer's side.

**The change.**

- `cancelSubscription`: `stripe.subscriptions.update(id, { cancel_at_period_end: true })`. Keep the
  plan, status `'cancelling'`, and `subscriptionPeriodEnd` until the period-end webhook lands, then
  null them. The billing page reads that state and says when access ends.
- `canCreateGround`: count grounds created **since the current free period began** — the org's
  creation date, or the end of the last paid period — not since the beginning of time. Whatever the
  rule, the pricing page and this function must state the same one.
- `claimFreeExtension`: resolve the ground (Batch 2 adds the org predicate anyway) and refuse when
  `isFreeGround`, reusing `purchaseSession`'s sentence.
- `PostSessionPanel.tsx` and `GroundParticipantPage.tsx`: show the button only when the viewer is an
  admin **and** the ground is metered; give "already used" its own permanent message instead of "Try
  again".
- Delete `POST /billing/purchase-session` and `purchaseSession`. Existing Stripe records referencing
  it are read by the webhook branch, which stays.
- Add one credit path: an admin-only `creditSession(groundId, reason)` that increments the balance
  and writes a `BillingEvent`, so a support answer to "I was charged and got nothing" exists.

**Migration:** none for the first four. The credit path reuses `BillingEvent`.
**Backfill:** worth one query — organisations with `freeExtensionUsed: true` whose extension landed
on an `isFreeGround` ground got nothing for it; reset the flag for those.

**Spec:** `cancelling-lasts-until-the-period-ends.spec.ts`;
`the-free-plan-is-an-allowance-not-a-lifetime-tally.spec.ts`;
`a-free-check-in-has-nothing-to-extend.spec.ts`; `a-tier-we-do-not-sell-cannot-be-charged-for.spec.ts`.

**Effort:** half a day for the first five, plus half a day for the credit path.

**Risk:** low today — there are no paying subscribers, so the cancellation semantics can be changed
without a migration path. That will stop being true at the first customer, which is the argument for
doing it now.

---

## Batch 8 — The Stripe webhook is the record, and it can be lost

**Closes:** P4-H05, P4-H06, P4-H07, P4-H08, P4-H09, P4-H10

Verified in `billing.controller.ts:275-284` and `billing.service.ts:927-1000`.

- The controller calls `constructEvent` then `handleStripeEvent` with **no try/catch**. Any throw
  becomes a non-2xx; a deterministic failure sticks for ever with no operator signal (P4-H08).
- The `session_fee` branch is check-then-act: `billingEvent.findFirst({ where: { stripeInvoiceId } })`
  then a create. `stripeInvoiceId` is `@unique` (`schema.prisma:3155`), so two concurrent deliveries
  both find nothing, both create, one hits the constraint and 500s, and Stripe retries a payment
  that was processed (P4-H06).
- The `subscription` branch calls `stripe.subscriptions.retrieve(subId)` **before** the organisation
  update, unguarded. If it throws, the org is never activated, and
  `invoice.payment_succeeded` does not activate either — it emails and writes a ledger row. There is
  no reconciliation job (P4-H07).
- `checkout.sessions.create` is called with no idempotency key, so two tabs pay twice and the second
  subscription overwrites the first, orphaning a live one (P4-H09).
- `BillingCallbackPage.tsx:33-43` asserts, from URL query parameters Stripe put there, "You are now
  on the {plan} plan" and "Unlimited check-ins and unlimited sessions are now active", reads back
  nothing, and navigates away after three seconds. The redirect routinely beats the webhook (P4-H05).
- The carefully worded "billing is not set up on this deployment, no card was touched" is thrown and
  then swallowed by a generic toast (P4-H10).

**The change.**

- Wrap `handleStripeEvent` in the controller in a try/catch: log, write a `WebhookFailure` row (or
  reuse the existing dead-endpoint mechanism), alert, and return 200 so Stripe stops hammering.
  Retry from our own record, not from Stripe's.
- Replace the `session_fee` dedupe with the upsert shape already used at `:465-478` — catch P2002
  and treat it as already-processed.
- Activate the subscription from `session.metadata` first (plan and id are both there), then enrich
  from `subscriptions.retrieve` in a `.catch(() => undefined)`. Make `invoice.payment_succeeded`
  activate when the org has no `subscriptionStripeId` — a second chance rather than only an email.
- Pass `{ idempotencyKey: \`sub_${organizationId}_${plan}\` }` to `checkout.sessions.create`.
- `BillingCallbackPage`: say "Payment received. Activating..." and poll the org's own state; assert
  the plan only once the server confirms it. Surface the real message on the not-configured branch
  instead of the generic toast.

**Migration:** a small `WebhookFailure` table, or reuse whatever backs `sendWebhookEndpointDying`.
**Backfill:** none; check for organisations with a `stripeCustomerId` and no `subscriptionPlan`.

**Spec:** `a-webhook-we-cannot-handle-is-not-lost.spec.ts`;
`the-same-payment-twice-adds-one-session.spec.ts`;
`the-thank-you-page-does-not-promise-what-it-has-not-read.spec.ts`.

**Effort:** one day.

**Risk:** medium, and untestable end to end without a live Stripe account — the register records
that no live subscription exists, so this ships on the test-mode CLI and code reading. Returning 200
on a genuine failure is only safe once the failure record and the alert actually exist; build those
first.

---

## Batch 9 — Limits and validation that are decoration

**Closes:** P7-007, P7-008, P7-009, P4-A09, P1-023

Verified by grepping every `@Throttle` in `api/src`. The throttler is registered once, under the
name `global` (`app.module.ts:51`). A `@Throttle` keyed to a name that does not exist is a silent
no-op. **Five** decorators still say `default` — the register names four; the fifth is
`stop-reminders.controller.ts:32`:

| File:line | Intended | Actual |
|---|---|---|
| `whatsapp.controller.ts:53` | 120/min | 60/min (global) |
| `public-api/whatsapp-for-an-organisation.controller.ts:99` | 240/min | 60/min |
| `email/unsubscribe.controller.ts:30` | 20/min | 60/min |
| `email/resend-webhook.controller.ts:18` | 120/min | 60/min |
| `conversation/stop-reminders.controller.ts:32` | 20/min | 60/min |

The unsubscribe and stop-reminders routes are `@Public()`, take a token in the path, and their own
comments say the point of the limit is that "nothing should be able to sit and try". Nothing is
stopping anything. The two WhatsApp webhooks get a *lower* limit than intended, so legitimate Meta
traffic from one egress IP is throttled and messages are dropped.

Alongside it, one concept with four validation postures (P7-008): the app's `SendMessageDto` has
`@MaxLength(8000)`; `/start` has `TurnDto` with no cap and no `@IsIn`; the panel takes
`@Body() dto: { message?: string }`, an inline type the global `ValidationPipe` cannot see, so it is
inert; WhatsApp plucks fields off the raw request. And on one controller, five public handlers with
five postures (P7-009): `opener` (`entry.controller.ts:290`), `classify-intent` (`:312`) and `faq`
(`:318`) carry no throttle at all, while `chat`, `chat/stream` and `report` do. `POST /feedback` is
`@Public()` with no throttle of its own (P1-023).

**The change.**

- Replace `default` with `global` in all five decorators. Better: export the throttler name as a
  constant and have a spec assert no `@Throttle` names anything else.
- One `TurnDto` and one message DTO shared by all four doors: `@IsIn(['user','assistant'])`,
  `@MaxLength(8000)`, `@ArrayMaxSize` on history. Give the panel route a real DTO class. Give the
  WhatsApp handler a DTO for the fields it reads.
- Add `@Throttle({ global: ... })` to `opener`, `classify-intent`, `faq` and `POST /feedback`.

**Migration:** none. **Backfill:** none.

**Spec:** `a-limit-named-for-a-throttler-that-does-not-exist.spec.ts` — asserts every `@Throttle` in
the tree names a registered throttler, and that every `@Public()` handler carries one;
`one-door-one-rule-for-a-message.spec.ts` — asserts all four entry points reject the same
over-length message.

**Effort:** hours for the throttlers, half a day with the DTOs.

**Risk:** low, but real: turning the throttles on for the first time can start refusing traffic that
has been flowing. The WhatsApp webhooks go *up* (60 → 120/240), so those improve. Watch the
unsubscribe route on the day a digest goes out.

---

## Batch 10 — Credentials that outlive the moment they were withdrawn

**Closes:** P1-010, P4-G07, P1-015, NL-015, NL-025, NL-026, NL-035

- `MachineTokenGuard` (`machine-token.guard.ts:55-104`) verifies the signature, checks
  `claims.typ === 'machine'`, counts `apiCall` rows, and checks the scope. Verified: it never reads
  `apiCredential`, so it cannot see `revokedAt`. With `TOKEN_TTL_SECONDS = 900`, a revoked
  credential keeps working for up to fifteen minutes after an admin presses revoke, including after
  a leak is known. The guard already hits the database twice per request, so the check costs
  nothing new.
- `PATCH /entry/draft` is `@Public()`; the `pendingSignup` branch merges a 200 KB object with no
  expiry check and no consumed check. The token is 32 random bytes so it is not guessable, but a
  leaked or logged one is valid for ever. The `pendingJoin` path in the same file checks both
  (`:1877-1880`).
- `WhatsAppConnection.accessToken`, `appSecret` and `verifyToken` are plaintext columns
  (`schema.prisma:1889-1893`) and `verifyToken` is returned in full to any org admin, next to a
  comment in the adjacent schema block arguing that integration secrets must be hashed.
- Every emailed token is stored in plaintext except the admin OTP and the API client secret.
- `AuthService.validateToken` (`:890`) returns the email and first name for an unused set-password
  token, so a forwarded link discloses whose it is; and `resetPassword` (`:759, 775-790`) bumps no
  session version, so a password reset does not put out whoever the person is resetting because of.

**The change.**

- `MachineTokenGuard`: one `apiCredential.findUnique({ where: { clientId }, select: { revokedAt: true } })`, refuse when set. Cut `TOKEN_TTL_SECONDS` to 300 as defence in depth.
- `entry.service.ts` `updateDraft`: check expiry and `consumedAt` on the `pendingSignup` branch, the
  same two tests the `pendingJoin` branch already runs.
- Encrypt `accessToken` and `appSecret` at rest with a key from config; hash `verifyToken` and stop
  returning it — show it once at connection time and never again. Store emailed tokens as hashes and
  look them up by hash.
- `validateToken`: return `{ valid: true }` and nothing else. `resetPassword`: bump a
  `sessionVersion` on the user and have `jwt.strategy.validate` compare it.

**Migration:** yes — a `sessionVersion` column on `User`, and a column-type/format change for the
token columns and the WhatsApp secrets. **Backfill:** the WhatsApp secrets must be re-entered by
each connected organisation or migrated through a one-off encrypt script; existing plaintext email
tokens can simply be expired rather than converted (`no-live-users-rerun-the-corpus` applies).

**Spec:** `revoking-a-credential-stops-it-now.spec.ts`;
`a-token-that-was-used-cannot-be-used-again.spec.ts`;
`a-secret-is-not-readable-from-the-table.spec.ts`.

**Effort:** the guard and the draft checks are hours. Encryption at rest plus the session version is
more than a day.

**Risk:** medium. Bumping `sessionVersion` signs everybody out if the default is wrong. Encrypting
WhatsApp credentials breaks every live connection the moment the key rotates — decide the key
management before writing the migration.

---

## Batch 11 — A scope that does not describe what the route does

**Closes:** P4-G05

`POST /api/org/v1/findings/run` (`detectors.controller.ts:87-101`) is annotated
`@RequiresScope('findings:read')` and then runs `detectors.run(...)` and `scenarios.propose(...)`,
which writes `Recommendation` rows. Verified: the comment above it explains *why* proposal runs
where detection does, and that reasoning is sound; the scope is what is wrong. A customer who issued
a read-only credential is writing proposals with it.

**The change.** Change the annotation to `proposals:write`, which the accept and decline routes
already use. Because that will silently break integrations calling it with a read-only credential,
accept either scope for one release and log which credentials are relying on the old one, then
narrow.

**Migration / backfill:** none.

**Spec:** `a-read-scope-does-not-write.spec.ts` — asserts every handler whose declared scope ends in
`:read` performs no Prisma write, by mocking the client and failing on any create/update/delete.

**Effort:** hours (the spec is the work).

**Risk:** low, provided the grace release happens. Without it, a live integration stops.

---

## Batch 12 — The client decides who is allowed, and the server disagrees

**Closes:** P1-018, P1-019, P1-021, P1-022

Four places where the interface offers work the server will refuse.

- `ContextPage.tsx:75` sets `isLead = role === 'lead' || role === 'admin'` and offers the
  document-visibility control to that viewer; `documents.service.ts:583-590` requires
  `assertParticipant` and, for CLOSED, `initiatorId === userId`. An org admin who is not on the
  check-in presses it and is told "Only the person running this check-in can keep a document to
  themselves."
- `GroundAdminPage.tsx:482` sets `canRunThisGround = isInitiator || isOrgAdmin` and opens the whole
  admin view; several actions on it are initiator-only server-side (`setChasing`,
  `grounds.service.ts:4541`). An admin covering for an absent lead can open the page, cannot use
  parts of it, and gets no explanation of the line.
- `stores/auth.ts:54-58` `updateUser` merges into the store and touches neither the token nor the
  React Query cache, so a demoted admin keeps seeing admin lists and buttons for the rest of the page
  session and every press 403s.
- `/org/integrations` (`App.tsx:508`) carries only `RequireOrgSetup`, unlike `/org/members` at
  `:497`. The page mounts for a non-admin and renders its own refusal — the pattern
  `RequirePlatformAdmin` was written to remove, per its own comment at `App.tsx:102-105`.

**The change.** One shared `whatThisViewerMayDo(ground, viewer)` on the client, derived from what the
server actually enforces and returned by the ground endpoint rather than recomputed — the server
already knows. Render each control from its own permission, not from one `isLead` boolean. Add
`AdminsOnly` to `/org/integrations`. Have `updateUser` invalidate the query cache on a role change.

**Migration / backfill:** none.

**Spec:** `a-button-nobody-can-press-is-not-shown.spec.ts` — for each gated action, asserts the
client's predicate and the server's guard agree.

**Effort:** half a day.

**Risk:** low. The risk is over-hiding: an org admin who legitimately reads context notes, the
baseline and the resolution must keep seeing those three.

---

## Batch 13 — A number the code can only ever print as zero

**Closes:** P6B-002

`reports.service.ts:1326-1341` computes `documentBackedPct` from record entries whose
`evidenceType` is `DOCUMENT_AT_AGREEMENT` or `DOCUMENT_AFTER`. Verified by grepping `evidenceType`
across `api/src`: **four reads, zero writes** — `reports.service.ts:1326, 1337` and
`patterns.service.ts:440, 472`. The schema default is `CHECK_IN`; the previous writer was deleted
(`documents.service.ts:443-452` records that it was) and nothing replaced it. The figure is
structurally always zero. It is rendered at `GroundParticipantPage.tsx:666` and in `board.service.ts`
as "N% of it is backed by a document", it gates a capability line that can never be true, and it
permanently suppresses the strong coverage band, which requires above 30. The homepage shows four
worked reports carrying 64%, 83%, 29% and 76%. A working implementation exists at
`the-session-report.ts:384-385`, so the same promise is true on one surface and false on another.

**The change.** Restore the writer: when a document is anchored to a record entry
(`anchorAfterUpload`), set `evidenceType` to `DOCUMENT_AT_AGREEMENT` or `DOCUMENT_AFTER` by
comparing the document's `createdAt` to the agreement's. Point `reports.service.ts` at the working
implementation in `the-session-report.ts` rather than keeping two. Until the writer has run,
suppress the figure — do not print 0% as if it were measured.

**Migration:** none (the column exists). **Backfill: yes, and it matters** — every existing
`RecordEntry` backed by a document currently reads `CHECK_IN`. A one-off script that joins record
entries to `GroundDocument` on ground and time can set the value for history; every released report
that printed 0% was wrong and will change.

**Spec:** `a-percentage-that-can-only-be-zero.spec.ts` — asserts that for every enum value read
anywhere in `api/src`, some code path writes it.

**Effort:** half a day, plus the backfill script.

**Risk:** low to write, visible to ship: released reports change their numbers. With no live users
(`no-live-users-rerun-the-corpus`), reprocess rather than migrate.

---

## Batch 14 — Text somebody typed changes the structure of the mail it arrives in

**Closes:** NL-017

`email.service.ts:389-403, 448-470, 561-579, 597-627, 778-790` interpolate `groundLabel`,
`founderName`, `note`, `reason`, `participantEmail` and `endState` straight into HTML and into
subjects with no escaping. Two senders escape and prove the rule: `sendWhoHasNotStarted` (`:721-724`)
and `sendRoundDigest` through `escapeHtml` (`:1105-1112`). The `note` on a participant invite is free
text supplied by the inviter and lands inside a styled block at `:389`; the raw `dto.label` is passed
at `grounds.service.ts:655`. An inviter can put an anchor to an address they choose into a mail that
arrives from `noreply@myground.work` and looks like ours.

**The change.** Make escaping structural, not per-sender: a small tagged template (`html\`...\``)
that escapes every interpolation by default and requires an explicit `raw()` for the handful of
places that need markup. Convert all 48 senders to it. A label with an ampersand also stops
rendering as a broken sentence.

**Migration / backfill:** none.

**Spec:** `a-name-somebody-typed-cannot-change-the-email.spec.ts` — renders every sender with a
payload containing `<a href>` and asserts it appears as text.

**Effort:** half a day, mechanical.

**Risk:** low. The one thing to check is the senders that intentionally embed markup — double-escaping
them makes visibly broken mail, so convert and eyeball each.

---

## Batch 15 — A read that writes, and a price the site cannot see

**Closes:** P1-017, P6B-010

Two separate small things, both "the record and the reality drift with nobody noticing", and both a
sitting.

`ops-people.service.identify()` (`:97-125`) auto-creates an active `OpsPerson` with role CEO and the
full CEO grant set — `spend:approve`, `people:admin`, `fundraise:*` — the first time a platform admin
touches any `/ops` route, **including a GET**. It is documented and deliberate
(`a-platform-admin-is-on-the-team.ts:35-37`) and grants no privilege `isPlatformAdmin` did not
already imply, but the ops roster is meant to be the record of who is on the team, and a read should
not write one.

`pricing.service.ts:99-115`: prices and seat caps are editable at runtime and read live by the app
(`groundwork-pricing-editable-from-admin`). `marketing/src/pages/pricing.astro` hardcodes them at
build time, and the guard compares the page against a seed file reproducing the migration values,
not the live table. The first time an admin changes a price, the public site is wrong and every test
still passes.

**The change.** Make `identify()` read-only, and admit somebody to the roster from an explicit "add
to the team" action. Point the pricing guard at the live `platform_settings` rows instead of the
seed, and fail the build — or better, have the marketing page fetch prices at build from the API and
fail the build if it cannot.

**Migration / backfill:** none. Worth listing the `OpsPerson` rows created by `identify()` and
confirming each is really on the team.

**Spec:** `the-roster-is-not-written-by-a-read.spec.ts`;
`the-page-says-what-we-charge.spec.ts` (reads the live table).

**Effort:** half a day.

**Risk:** low. Making `identify()` read-only can lock a platform admin out of `/ops` if something
downstream assumes the row exists — check `OpsCapabilityGuard` first.

---

## Batch 16 — An erased account escapes the retention sweep

**Closes:** P1-020

`users.service.ts:658-666` `eraseAccount` rewrites each participant link's email to
`deleted-${link.id}@deleted`. `departure.service.ts:140-150` ages out raw conversation turns by
matching `participant.email` against the person's address. Somebody who self-erases through
`DELETE /users/me/data` before the sweep runs no longer matches it, and their raw turns are retained
past the window — the opposite of what erasing is for.

**Confidence in the register is "Unverified", and it is still unverified here** — I read both call
sites and the mismatch is real in the code, but I have not run the sweep. Before fixing: erase one
account, run `ageOutDepartedTurns` for that organisation with the window elapsed, and count the
remaining `conversationTurn` rows.

**The change.** Stop matching people by email string. `departure.service.ts` should join on
`participant.userId` (or on the participant id it already holds), which survives the rewrite. If the
email match is needed for participants with no account, keep it as a second clause rather than the
only one.

**Migration:** none. **Backfill: yes** — sweep once for turns belonging to `@deleted` participants
past the retention window; those should have gone already.

**Spec:** `erasing-an-account-does-not-hide-it-from-the-sweep.spec.ts`.

**Effort:** hours, once the check above is done.

**Risk:** low, but it deletes data — run the corrected sweep in dry-run and read the count before
letting it write.

---

## Coverage

Every ID in the slice, once.

| ID | Batch | ID | Batch |
|---|---|---|---|
| P0-001 | 1 | P4-A01 | 1 |
| P0-002 | 1 | P4-A05 | 5 |
| P1-001 | 2 | P4-A06 | 5 |
| P1-002 | 2 | P4-A08 | 5 |
| P1-003 | 2 | P4-A09 | 9 |
| P1-004 | 2 | P4-B01 | 4 |
| P1-005 | 3 | P4-B07 | 4 |
| P1-006 | 2 | P4-001 | 2 |
| P1-007 | 2 | P4-002 | 5 |
| P1-008 | 6 | P4-008 | 7 |
| P1-009 | 6 | P4-G01 | 2 |
| P1-010 | 10 | P4-G02 | 2 |
| P1-011 | 6 | P4-G05 | 11 |
| P1-012 | 6 | P4-G07 | 10 |
| P1-013 | 6 | P4-H01 | 5 |
| P1-014 | 2 | P4-H02 | 2 |
| P1-015 | 10 | P4-H03 | 7 |
| P1-016 | 3 | P4-H04 | 7 |
| P1-017 | 15 | P4-H05 | 8 |
| P1-018 | 12 | P4-H06 | 8 |
| P1-019 | 12 | P4-H07 | 8 |
| P1-020 | 16 | P4-H08 | 8 |
| P1-021 | 12 | P4-H09 | 8 |
| P1-022 | 12 | P4-H10 | 8 |
| P1-023 | 9 | P4-H11 | 7 |
| P2-001 | 5 | P4-H12 | 7 |
| P2-006 | 5 | P6B-001 | 3 |
| P2-007 | 6 | P6B-002 | 13 |
| P7-007 | 9 | P6B-004 | 3 |
| P7-008 | 9 | P6B-009 | 3 |
| P7-009 | 9 | P6B-010 | 15 |
| NL-001 | 6 | P6B-011 | 7 |
| NL-014 | 5 | P6B-012 | 7 |
| NL-015 | 10 | P6B-014 | 3 |
| NL-017 | 14 | P6B-015 | 3 |
| NL-025 | 10 | | |
| NL-026 | 10 | | |
| NL-035 | 10 | | |

**Added beyond the named list**, because the cause is security or money and they were found in the
same code: P2-007 (the door's case-sensitive regex — same fix as P1-009), P4-008 (duplicate of
P4-H11), P4-H03, P4-H04, P4-H05, P4-H07 (money findings in the billing flow), P6B-001, P6B-009,
P6B-010, P6B-014 (privacy and pricing promises), P7-008, P7-009 (validation consistency), NL-015,
NL-017, NL-025, NL-026, NL-035 (tokens and secrets), and a fifth dead `@Throttle` at
`stop-reminders.controller.ts:32` that the register does not name.

**Adjacent, deliberately not claimed here:** P2-002 / P4-A02 — `EntryService` holds
`lastReplyHadCloseMarker` as instance state on a default-scoped Nest singleton, read by the
controller after an await on a `@Public()` anonymous route, so one visitor's close decides another's.
It is a real cross-visitor security defect, but it is filed under the state machine and belongs with
whoever holds that slice. It is a one-line fix (return the flag with the reply instead of storing
it) and it should not fall between us.

---

# Added 10 September 2026, by decision

## Batch 17 — Cancelling ends at the end of the month, and pausing is offered instead

Closes: P6B-011, and replaces the copy half of P5-088.

**Decided by the product owner:** cancellation means the subscription ends at the end of the paid
period. Somebody who wants to stop paying sooner pauses instead.

**Today.** `billing.service.ts:564-577` calls `subscriptions.cancel()`, which ends the subscription
at that moment, then clears `subscriptionPlan`, `subscriptionStripeId` and `subscriptionPeriodEnd`
locally. A customer who cancels on the second day of a paid month loses the remaining days they
have already paid for. Nothing refunds them and nothing tells them. With payment live on
production this is money taken and not returned.

Pause already exists and is correct: `pauseSubscription` at `:580` sets
`pause_collection: { behavior: 'mark_uncollectible' }` and `resumeSubscription` at `:595` clears
it. Nothing needs building there. What is missing is that the person is never offered it at the
moment they are trying to stop paying.

**The change.**

1. `cancelSubscription` calls `subscriptions.update(id, { cancel_at_period_end: true })` rather
   than `cancel`. It keeps `subscriptionStripeId` and `subscriptionPeriodEnd`, and sets the status
   to a value meaning "ending on that date" rather than `cancelled`. Access continues until the
   date. The webhook that already handles subscription deletion is what finally writes `cancelled`,
   so the local record follows Stripe rather than predicting it.
2. A cancellation that is scheduled can be undone before the date, since Stripe supports it and the
   subscription is still there. The screen that shows "ending on the 30th" gets an "keep it" action.
3. The confirmation replaces `window.confirm`. It states the real consequence, which is that access
   continues until the period end and then stops, and it offers pause as the alternative in the
   same place. The existing text saying the team "will move to per-session billing" is describing a
   mode that no longer exists and must go.
4. Pause gets its own confirmation, which it does not have today, saying what pausing does to
   access and when collection resumes.

**Status values.** Check the `SubscriptionStatus` set before adding one. If a suitable value exists
it is reused; if not, this is the one schema change in the batch, and every reader of the status
must be found first, because a status nothing understands is the frozen-state bug in part B.

**Backfill.** Any organisation cancelled before this ships was ended immediately and their period
end was cleared, so the data to make them whole is in Stripe rather than here. Somebody with
dashboard access should list cancellations to date and decide whether anybody is owed time. This
cannot be answered from the repository.

Spec: `cancelling-runs-to-the-end-of-what-was-paid-for.spec.ts`, and
`stopping-early-is-a-pause-not-a-refund.spec.ts`.

Effort: half a day for the service and the webhook path, half a day for the two confirmations.
Risk: the status value. Everything else is a smaller change than what it replaces.

# Plan audit: fix plan parts A and E

Read against the working tree at `81e8bd0` (`git diff fcbc3f9..HEAD` touches `docs/audit/` only, so
every line number the plan cites is still current — the plan's provenance claim holds).

Scope: every batch in `fixplan_part_a.md` (1–16, plus the Batch 17 appended 10 September) and
`fixplan_part_e.md` (E1–E6).

---

## Cross-cutting problems

These affect several batches at once and should be settled before any of them are worked.

### X1. Five batches rest on "there are no live customers". That is retracted in this same folder.

`CORRECTION-payments.md`, recorded 10 September 2026, says: *"Payments are live on production. Every
line below changes as a result."* It is referenced from `fix_plan.md:52` as *"the one correction you
should read first"*.

Part A still leans on the withdrawn belief in five places:

| Line | What it says |
|---|---|
| `fixplan_part_a.md:58` | "there are no live customers (`groundwork-stripe-not-wired-no-subscribers`), so nothing needs restoring" |
| `:309` | "With no paying customers this is free to leave" |
| `:439` | "**Risk:** low today — there are no paying subscribers, so the cancellation semantics can be changed without a migration path" |
| `:494` | "the register records that no live subscription exists, so this ships on the test-mode CLI and code reading" |
| `:701` | "With no live users (`no-live-users-rerun-the-corpus`), reprocess rather than migrate" |

`:439` is the worst of the five: it downgrades to "low" the risk on the one finding the correction
promotes to the top of the billing work. Batch 17 gets this right (*"With payment live on production
this is money taken and not returned"*) — Batch 7 was never updated to match.

**The plan should say instead:** strike all five. Batch 7's risk is not low; Batch 8 cannot be
dismissed as untestable-because-no-subscribers; Batch 13's "reprocess rather than migrate" needs the
same production check the correction asks for. Batch 5's `:309` is defensible on its own terms
(nothing was written, so nothing is recoverable) but the reason given must change.

### X2. Two marketing edits must be removed (product-owner ruling)

`fix_plan.md:27` — *"Nothing in the marketing site or its homepage is changed by this plan… Where a
batch had a product half and a copy half, only the product half survives."* Part A was not brought
into line:

- **Batch 3**, `fixplan_part_a.md:188` — "remove the sentence at `how-it-works.astro:89`" and `:191`
  "Reword `privacy-and-ai.astro:55`". **Must be removed.**
- **Batch 15**, `:754` — "have the marketing page fetch prices at build from the API". **Must be
  removed.** (The other half of B15's pricing fix — pointing the guard at live data — is not a
  marketing edit and survives; see B15 below for why it still does not work.)

There is a consequence Batch 3 does not notice. It also proposes widening
`the-site-does-not-promise-more-than-this.spec.ts` from `index.astro` alone to *"every page under
`marketing/src/pages`"*. The sentence at `how-it-works.astro:89` ("Nobody is scored, ranked or
watched. Groundwork never shows anyone's raw answers…") is repeated verbatim at
`pricing.astro:218`. Widening the guard while being forbidden to change either page produces a red
build on day one. **The plan should say instead:** widen the guard *and* add an explicit
allowlist of the frozen sentences, each with the finding id it leaves open, so the guard catches
*new* overclaims without failing on the accepted ones.

### X3. Part E re-claims six findings Part A already closes, and closes three of them by a route that would not

Part E's preamble handles two of these honestly (*"Part A owns the missing organisation and role
predicates… the security fix ships first and this rule replaces it"* — that covers P1-001 and
P1-002). The other six are undisclosed, and three are wrong on the merits:

| ID | Part A | Part E | Verdict |
|---|---|---|---|
| P1-001, P1-002 | B2 | E1 | Disclosed overlap. Fine. |
| P6B-004 | B3 | E1 | **E1 does not close it.** P6B-004 is `GET /grounds/:id/conversation` returning raw turns (`grounds.controller.ts:566-570`). B3 deletes the route. A three-level read rule does not remove a route whose gate is already `initiatorId === requestingUserId` — the lead *is* the reader, and the lead is exactly who must not have it. Drop P6B-004 from E1's coverage. |
| P4-B07 | B4 | E4 | **Contradictory fixes, undisclosed.** See X4. |
| P4-G01, P4-G02 | B2 | E6 | Same fix described twice. E6 is the better statement of it (it correctly identifies the missing thing as the *fence*, not `req.machine`). Pick one owner. |
| P4-G05 | B11 | E6 | **E6 does not close it.** P4-G05 is a read-scope annotation on a route that writes `Recommendation` rows. A party test on machine reads has no bearing on it. Drop from E6. |
| P4-G07 | B10 | E6 | **E6 does not close it.** P4-G07 is a revoked credential still working for 15 minutes (`machine-token.guard.ts` never reads `revokedAt`). Drop from E6. |

Part A's own coverage table is internally consistent — all 73 ids, each mapped once, `Closes:` lines
and table agree. The only exception is Batch 17 (see B17), which is not in the table at all.

### X4. E4's premise is wrong: the switcher already exists and the org already comes off the token

E4 says *"Every scope is taken from the single organisation on the person's row"* and proposes to
move the organisation *"out of the person row and into the session, chosen at sign-in and
switchable, with the person's memberships as the list of what they may choose."*

Every clause of that is already built:

- `auth.controller.ts:223` `GET /auth/my-organizations`, `:233` `POST /auth/switch-organization` →
  `auth.service.ts:1220 switchOrganization`, which looks up an `OrganizationMembership`, refuses
  when absent (`:1226`), and mints a new token carrying **the membership's role, not the user's**.
- The design decision is written down at `auth.service.ts:1211-1213`: *"Every org-scoped query in
  the product reads `organizationId` off the token, so this is a new token rather than a rewrite of
  those queries."* E4 proposes the rewrite that comment declined, without citing it.
- It is pinned by `auth/switching-organisation-cannot-grant-you-anything.spec.ts`, and the client
  half is at `AppShell.tsx:667`.

Two further errors:

- **"Migration: none. Backfill: none" is wrong.** `OrganizationMembership` rows are written in only
  four non-spec places (`auth.service.ts:685`, `participants.service.ts:211`,
  `grounds.service.ts:844`, `entry.service.ts:1899`) and every one is for a *second* organisation —
  `auth.service.ts:669-671` says so: *"this is what puts the inviting company in their switcher."* A
  user's **home** organisation has no membership row. Making memberships the list of what somebody
  may choose leaves every existing user with an empty list. That is a backfill of one row per user.
- **The count is wrong.** `req.user.organizationId` appears **zero** times; the codebase uses
  `@CurrentUser()`, and `user.organizationId` appears 42 times in non-spec `api/src`.

**What the plan should say instead:** delete E4. What actually survives of P4-B07 is the narrow bug
Batch 4 already found and fixes correctly — `entry.service.ts:1959` signs
`organizationId: user.organizationId` when the membership upsert eleven lines above
(`:1894-1904`) has just given the person `GUEST_ROLE` in a *different* organisation. That is a
two-field change to one `jwt.sign` call, not a day and not "the highest risk in this part". If
anything beyond Batch 4 is wanted here, it is a spec asserting `generateToken` is never called with
an organisation the caller has no membership in.

### X5. Batch 5 and Batch 9 propose the same DTO change, independently

- B5 (`:305-307`): "`TurnDto`: `@IsIn(['user','assistant'])` on role, `@MaxLength(8000)` on content,
  `@ArrayMaxSize` on `messages`."
- B9 (`:544-546`): "One `TurnDto` and one message DTO shared by all four doors:
  `@IsIn(['user','assistant'])`, `@MaxLength(8000)`, `@ArrayMaxSize` on history."

Same file, same decorators, two batches, no cross-reference; B5 closes P4-A08 and B9 closes P7-008
on the strength of it. **The plan should say instead:** B9 owns the DTO work (it is the batch that
surveys all four doors); B5 keeps only the usage-event write, and cites B9.

---

## Part A, batch by batch

### Batch 1 — three public routes. Sound with corrections.

Verified true: `/health/email` is registered on the raw adapter (`main.ts:187-217`, adapter obtained
at `:170`) and is genuinely outside the four global guards registered at `app.module.ts:90-95` and
outside the `api/v1` prefix set at `main.ts:74`; it calls `resend.emails.send` at `:201` with an
attacker-supplied `?to=`. The quoted comment is at `main.ts:185-187`. `/health/ai` calls
`svc.healthCheck()` at `:182`. The `entrySave` existing-user branch is at `auth.service.ts:573-580`
and does clear `consumedAt` and `groundId`. `commitInner` renames the org at
`entry.service.ts:1350-1355`.

Four corrections:

1. **The plan proposes replacing `/health/ai` with a cached read. There is an incident-derived
   comment arguing exactly against that, and the plan does not cite it.** `main.ts:173-177`:
   > "A health check that never touches the model cannot tell you the model is unreachable. In a
   > live run every AI call from the running process failed for the best part of an hour while
   > /health kept returning "ok" - nothing would have alerted. This one makes a real call, and
   > returns 503 when the engine is actually down, so a monitor can see it."

   The plan's own alternative — "run it from the existing cron" — preserves the incident's lesson
   and is the right one, but it must be stated as *replacing* that comment's mechanism while
   keeping its guarantee, not as a free swap. **The plan should say instead:** move the synthetic
   probe to the cron, have the cron write the outcome, and rewrite the comment at `:173-177` to
   record why the probe moved rather than deleting it.

2. **`POST /auth/entry-save` is not ungated.** It carries `@Throttle({ global: { limit: 10, ttl:
   60000 } })` at `auth.controller.ts:256` and a validated DTO. The attack is real but it is 10/min,
   not "as fast as they can issue GET requests" — that phrase belongs only to `/health/email`.

3. **The draft token is returned at two sites, not one.** `auth.service.ts:594` and `:607` (the plan
   cites `:606`). Both must change.

4. **The "confirm no client relies on it" caveat resolves to: one does.**
   `EntryChatPage.tsx:2109-2111` stores `res.draftToken` in state and in
   `localStorage['gw_draft_token']`, and `:2124-2140` uses it for every `entryApi.patchDraft` call
   (`client/src/api/entry.ts:240`). The client does not branch on new-vs-existing. So this is not a
   check to do — it is a second half of the change: the existing-user path must stop the client from
   attempting `patchDraft`, or `patchDraft` must refuse and the page must handle it.

Also: the plan's `MagicVerifyPage.tsx` is at `client/src/pages/auth/`, not `pages/enter/`. And the
"read by a monitor" caveat on `/health/ai` is not evidenced in-repo — the route appears only in
`main.ts:178` and in `docs/audit/`; no CI, deploy or platform config references it.

**Effort:** "half a day" is right for the routes, low by roughly a half-day once the
`EntryChatPage` half is included.

**Verdict: sound with corrections.**

### Batch 2 — a ground id is not a key. Unsound as written.

Nine of the ten table rows check out with only line drift. But the batch has one blocking problem
and three wrong specifics.

**The blocking problem: the fix contradicts a spec that was written specifically to stop it, and the
plan misdescribes that spec.**

`an-org-admin-reads-with-the-lead-s-eyes.spec.ts` is not a behavioural spec that "exists, never sets
a role" and can be "extended to set `role: 'MEMBER'`". It is a **source-text** spec: it reads
`reports.service.ts` as a string (`:29-30`) and at `:46` asserts

```
expect(CODE).toMatch(/const isOrgAdmin = !isInitiator && !participant && !!requestingUserOrgId && ground\.organizationId === requestingUserOrgId/)
```

It pins the roleless expression **verbatim**. Adding a role test fails it. You cannot extend it as
described because there is no role to set.

Its header (`:4-27`) is the argument the plan must meet, and it ends:
> "This file exists so that nobody 'tightens' the names later without meeting the argument, and so
> the next person can see it was decided rather than left."

There are six more comments in `reports.service.ts` saying the same: `:3005` *"An org admin reads
with the lead's eyes; they already see the whole ground."*; `:3553` *"Org admins can read reports
for grounds in their own org (read-only, same view as initiator)."*; `:3598` *"Not `!participant` -
an org admin has no participant row and must still see it."*

The good news for the plan is that the argument and the code have drifted apart, and *that* is the
finding. The spec argues about an **org admin**. The code tests only **same organisation**, so it
admits every MEMBER. Batch 2's fix is consistent with the spec's intent and inconsistent with its
assertion.

**The plan should say instead:** state that the decision recorded in
`an-org-admin-reads-with-the-lead-s-eyes.spec.ts` is preserved, not reversed — an org ADMIN keeps
the lead's eyes; what changes is that a MEMBER stops getting them. Then, as part of the batch,
rewrite the `:46` regex to pin the *new* expression and add a paragraph to the spec header recording
that the code had been wider than the argument. Without that, Batch 2 is a red build.

Three wrong specifics:

- **`agreements.service.ts:68-81` is not one of the four unfenced writes — it is the guard.**
  `mustBeAbleToSpeakForThisSide` reads the ground at `:69-72`
  (`ground.findUnique({ where: { id: groundId }, select: { initiatorId: true } })`) and throws
  Forbidden. The plan lists it as a hole and then, in the change section, correctly says "Fix
  `agreements.mustBeAbleToSpeakForThisSide` to read the initiator with an org predicate" — which is
  a *different and smaller* change. Fix the table row: the four unfenced creates are
  `alignment.service.ts:40`, `assertions.service.ts:49-52`, `agreements.service.ts:52` and `:56`.
- **`public-api.controller.ts:1152, 1163` do pass `req.machine`.** Both carry
  `@UseGuards(MachineTokenGuard)` and read `req.machine.organizationId` (`:1160`, `:1171`). What is
  missing is the **fence** — `boundToPersonExternalIds` is never forwarded and `mayTouch` is never
  called. Part E's E6 states this correctly; Part A does not. Reword.
- **"pass `req.panel.externalId` on all six routes" overstates by half.** `drafts.controller.ts` has
  six routes (`:21, :29, :36, :44, :52, :60`), but `start` already passes it as the initiator and
  `invite`/`contribute` already pass it. Only **three** need the change: `status`, `resolve`, `seed`.
  Also `drafts.service.mine()` is at `:358`, not `:356`.

Two things the plan gets exactly right and should keep: `grounds.service.ts:3055 assertMaySeeGround`
really is the correct shape (it tests role at `:3064-3067`), and
`patterns.controller.ts:24-25` really does already carry `PlatformAdminGuard` on the sibling route
with a comment at `:14` recording that *"The guard used to be `@Roles(Role.ADMIN)`"* — the same
mistake, already fixed next door.

**Effort:** "one day" is low. Ten handlers, a table-driven spec across all of them, plus rewriting a
pinned source-text spec and its header argument. Two days is closer.

**Verdict: unsound** — it will not land as written, because of the pinned spec.

### Batch 3 — raw words. Sound with corrections.

Verified: `index.astro:367` is the quoted sentence. `GET /grounds/:id/conversation` is real
(`grounds.controller.ts:566-570` → `grounds.service.ts:4167-4200`), gated only by
`initiatorId: requestingUserId` at `:4168-4171`, returns `email`, `partyType` and full turn
`content` at `:4180-4196`, and **nothing calls it** — searched `client/`, `api/`, `e2e/`; the only
references are its own definition. `uploadByInviteToken` (`documents.service.ts:498-535`) does a
bare `findUnique` at `:505-507` with no expiry and no single-use check, calls
`decideOrigin(file, content, false)` at `:511`, never calls `looksLikeAConversation`, has no
`consentConfirmed` parameter, and writes no `visibility`. `participants.service.ts:428-466`
`loadByToken` has both checks. `defaultVisibilityForUpload()` is real
(`a-document-is-context.ts:110`). `the-site-does-not-promise-more-than-this.spec.ts:29` reads
`index.astro` alone.

The comment at `documents.service.ts:282-291` is the one that makes the case for this batch and the
plan should quote it rather than paraphrase:
> "A RECORD OF A CONVERSATION IS REFUSED UNTIL SOMEBODY CONFIRMS THE PEOPLE IN IT KNOW… Being asked
> about a strategy deck costs one click; a transcript slipping through as an ordinary document costs
> somebody else their privacy."

Corrections:

1. **The two marketing edits must be removed** (X2), and the guard-widening must ship with an
   allowlist or it breaks the build (X2).
2. **"Extend the verbatim-lift screen… and hold the release for review rather than warning into a
   log" contradicts a written decision the plan does not cite.** `counts-accounts.ts:17-21`:
   > "DETECT, DO NOT REWRITE. … quietly altering a claim inside an accountability record is far
   > worse than a badly phrased one. So this reports; a human decides."

   Read narrowly the plan agrees with this (it proposes *holding for review*, not rewriting). But it
   should say so explicitly and against that comment, because "run `counts-accounts` over
   `sharedPicture`, `agreements` and `divergences` at release" is exactly the widening the comment's
   author scoped out. **The plan should say instead:** widen the *detection* to all three fields,
   keep detection-not-rewriting, and name the operator path (the batch already flags this as the
   risky half — good).
3. **`prompt-library.ts:3512` is a near-match, not the quoted phrase.** `:3528` contains "what the
   confidence score is"; `:3512` is a differently-worded variant that also instructs on the
   confidence score. Both need striking; the citation should not claim identical text.
4. **`privacy-and-ai.astro:55` overclaims less than the plan says.** `admin.controller.ts:305`'s own
   summary is a deliberate carve-out: *"Never conversation content, record-entry text, report
   content, lead notes, documents, or participant-request reason text."* Staff see metadata,
   rosters and usage — not content. Since the copy fix is struck anyway (X2), this matters only for
   the register: record it as a metadata-visibility overclaim, not content access.

**Effort:** one day is right for the route deletion and the upload fix; the release-time screen is
its own half-day plus the operator path.

**Verdict: sound with corrections.**

### Batch 4 — the join link. Sound with corrections.

Every negative claim about `joinConfirm` (`entry.service.ts:1874-1962`) is true: no `needsApproval`,
no `awaitingOrgApproval`, no `MembershipRequest`, no seat cap; user created `role: 'MEMBER'`,
`isEmailVerified: true` at `:1906-1917`; token signed at `:1959` with `user.organizationId` and
`user.role`. `participants.service.ts:155-240` does all four, with `addedByAnAdminOfThisOrg` at
`:175-176`. There is **no** comment defending the frictionlessness — the only doc comment
(`:1864-1873`) justifies `isEmailVerified: true` and nothing else, and `:1887-1890` calls this path
*"the third of the three paths that skipped it"*, which supports the batch.

Corrections:

- **The membership upsert applies only to pre-existing users.** `:1894-1904` is guarded by
  `isASecondOrganisation(...)`. A brand-new user gets `organizationId: ground.organizationId`
  directly and **no membership row at all**. So the plan's token fix ("sign with the membership role
  for that organisation") has no membership to read for the new-user case. **The plan should say
  instead:** for a new user the ground's organisation *is* their home organisation and `MEMBER` is
  correct; the fix applies to the pre-existing-user branch only. As written it would throw or sign
  null for the common case.
- **`isASecondOrganisation` does not read the JWT.** It is a pure two-string compare
  (`joining-a-second-organisation.ts:32-33`) and both call sites pass a value read from the
  database. The risk paragraph's "anything reading `organizationId` off the JWT for a cross-org
  guest" should name `switchOrganization` and `jwt.strategy.ts:42` instead. Note `jwt.strategy.ts:42`
  re-reads `organizationId` from the **user row**, not the claim — so a mis-signed token is
  self-correcting on the next request, which lowers this batch's risk from "medium" to low.
- Two specs pin `isASecondOrganisation`, one of them on call *ordering*
  (`a-guest-is-not-an-admin-here.spec.ts:64`). Any reordering in `joinConfirm` must keep it.

**Effort:** half a day is right.

**Verdict: sound with corrections.**

### Batch 5 — the meter is spent before the thing is delivered. Sound with corrections.

The metering analysis is correct in every particular: guard returns at `:550`, decrement at
`:633-636` with the `count === 0` throw at `:637`, `freeSessionsUsed` at `:655-660`,
`anthropic.respond` at `:733`, AI turn at `:739`, `roundAlreadyStarted` scoped `id: {not: …}` at
`:577`, `sessionsBalance` written in exactly one place, no `$transaction` anywhere in
`conversation.service.ts`, no refund path in `billing.service.ts`, `TurnDto` bare at
`entry.controller.ts:9-12`, `whatsapp.controller.ts:77-78` reads `from` and `text?.body` and never
`message.id`, `InboundMessage.providerId` at `schema.prisma:688`.

Useful addition the plan misses: **the try/catch pattern it wants already exists in the same file.**
`sendMessage()` (`:868-1025`) and the streaming variant (`:1216-1358`) both wrap the model call and
delete the person's turn on failure. `open()` is the outlier. That makes this a smaller and
better-precedented change than "restructure `open()`" implies, and it should be cited.

Corrections:

1. **The `commitInner` claim is false as stated, and contradicts a comment.** The plan says
   *"`commitInner` runs the permission gate (`entry.service.ts:1332-1340`) and the billing gate only
   **after** the whole public entry chat, the check-in and the entry report have been generated"*.
   The gate is the **first** thing in `commitInner`, and `:1318-1330` says so: *"Asked once, at the
   top, because this method has two ways out."* The generation happens in earlier, separate
   endpoints (`/entry/chat`, `/entry/report`). The finding is real but it is a *flow* problem, not a
   `commitInner` ordering problem. **The plan should say instead:** the permission answer must be
   asked at `/entry/opener`, before the conversation starts — which is what the change section
   already proposes. Delete the false premise and keep the fix.
2. **`sendFor` is in the wrong file.** It is defined at `whatsapp.service.ts:159-166`, not
   `whatsapp-for-an-organisation.service.ts:134, 247`. It swallows only on the fallback path
   (`:161 return this.sendMessage(...).catch(() => false)`). The org-service call sites are `:49`
   and `:178`, and the real defect is that **neither checks the return value**. Reword.
3. **`billing.service.ts:465-478` is not an upsert.** `recordInvoiceOnce` at `:461-479` is a plain
   `create` in a try/catch on P2002. The plan's description of the *shape to copy* is right; the
   word is wrong. Its comment at `:448-459` is worth quoting, because it describes this exact race
   being fixed once already: *"The old dedupe read `billingEvent.findFirst({ stripeInvoiceId })` and
   skipped if found - a check-then-act race…"*
4. **Two exemptions the risk paragraph flags are each protected by a long comment that must be
   preserved verbatim through the refactor:** `:556-569` on self-correction (*"charging $5 to
   correct your own words"*) and `:624-629` (*"Metering runs ONLY for metered grounds.
   `gate.sessionsBalance === -1` signals unlimited"*). The plan names both — good — but a
   restructure of `open()` is exactly where comments get dropped. Say so.
5. **The DTO half belongs to Batch 9** (X5).

**Effort:** "more than a day" is under. Restructuring `open()`, a new charge-marker table and
migration, a WhatsApp `wamid` column with a unique index, the entry-flow reorder, and three specs is
two to three days. This is the largest batch in the part and the estimate should say so.

**Verdict: sound with corrections.**

### Batch 6 — the back office door. Sound with corrections.

The regex (`the-back-office-has-a-door.ts:28`), the ten-minute window (`:13`), the week-long pass
(`:12`), the Google exemption (`:37`, duplicated at `back-office-door.service.ts:36, 40, 41`), the
two `Math.random` generators (`back-office-door.service.ts:51`, `admin.service.ts:763`), and
`verify()`'s complete absence of an attempt counter, lockout, invalidation or `isStaff` re-check
(`:69-82`, versus `sendCode`'s check at `:48`) are all exactly as described. The guard reads
`req.originalUrl` (`back-office-door.guard.ts:16`), so the prefix set at `main.ts:74` is present and
the regex does match — the plan's premise holds.

The enumeration is right and **one route short**: besides the eight named, `PATCH /feedback/:id/status`
(`feedback.controller.ts:87`) also carries `PlatformAdminGuard` and is missed by the regex. Only
`admin.controller.ts:59` and `ops-door.controller.ts:34` are covered today.

One factual error:

- **`crypto.randomInt` is used nowhere in this codebase.** The plan says it is "the generator used
  for every other credential here (`grounds.service.ts:622`, `auth.service.ts:575`)". Both of those
  are `crypto.randomBytes(32).toString('hex')`. `randomInt` has zero occurrences in `api/src` or
  `client/src`. The recommendation is still correct — `crypto.randomInt(100000, 1000000)` is the
  right generator for a six-digit code — but it is a **new** import, not a house pattern, and the
  spec "no `Math.random` anywhere in credential generation" is the load-bearing half.

One risk understated:

- **Making the door key off the privilege changes what happens on the `/ops` hot path.**
  `ops-capability.guard.ts:30` calls `ops-people.identify()` on **every** guarded ops request, and
  `identify()` returns `null` for anybody with no `OpsPerson` row who is not a platform admin
  (`ops-people.service.ts:108`). The plan flags this, correctly, and it collides with Batch 15,
  which proposes making `identify()` read-only. See B15 — these two must be sequenced.

**Effort:** "half a day" is low by roughly double. A `@BehindTheDoor()` decorator threaded through
two guards, an attempt-counter migration, a break-glass path, plus end-to-end ops testing is a day.

**Verdict: sound with corrections.**

### Batch 7 — money. Unsound as written.

Most of the analysis is right: `cancelSubscription` at `:564-578` really does call
`subscriptions.cancel()` at `:571` and null everything at `:572-575`; `canCreateGround:174-177` is a
lifetime count with no date or status filter; `claimFreeExtension:395-421` really has no
`isFreeGround` guard; `PostSessionPanel.tsx:51-66` really renders the button on `!freeExtensionUsed`
alone against an `@Roles(Role.ADMIN)` route (`billing.controller.ts:63-71`); `purchaseSession`
really does create a `unit_amount: 500` Checkout at `:232`; and there really is no refund or credit
anywhere in the file.

Four problems, two of them blocking.

1. **BLOCKING — the proposed status value does not exist and would silently un-subscribe the
   customer.** The plan says: *"Keep the plan, status `'cancelling'`"*. `SubscriptionStatus` is a
   closed union of four values — `['active', 'paused', 'cancelled', 'past_due']`
   (`api/src/common/subscription.ts:25`) — and `cancelSubscription` writes it with
   `satisfies SubscriptionStatus` (`billing.service.ts:573`), so `'cancelling'` is a **compile
   error**. Worse, the file's header comment describes precisely the damage if it slipped through:
   > "THE FAILURE MODE IS REVENUE, NOT TIDINESS. Write 'ACTIVE' instead of 'active'… and every one
   > of those comparisons quietly says no. `canCreateGround` falls straight through to the free-tier
   > check, so a paying organisation is metered as if it had never paid."

   `isSubscribed` (`:39-51`) requires `subscriptionStatus === 'active'`. A customer mid-cancellation
   with status `'cancelling'` stops being a paying customer immediately — which is the exact bug
   this batch exists to fix.

   Batch 17 gets this right (*"Check the `SubscriptionStatus` set before adding one… every reader of
   the status must be found first"*). Batch 7 does not.

2. **BLOCKING — Batch 7 and Batch 17 both close P6B-011 with the same change.** Batch 17 is the
   later, better-informed version (it knows payment is live, it names `SubscriptionStatus`, it adds
   the undo-a-scheduled-cancellation path, and it notes `stripe.service.ts:82` already has a
   `cancel_at_period_end` helper). It is not in Part A's coverage table, and the part header still
   says "Sixteen batches". **The plan should say instead:** strike the `cancelSubscription` bullet
   from Batch 7 entirely, delete P6B-011 from Batch 7's `Closes:`, add row `P6B-011 | 17` to the
   coverage table, and update the header count.

3. **Deleting `purchaseSession` orphans a live webhook branch, and the plan says the opposite.** It
   says *"Existing Stripe records referencing it are read by the webhook branch, which stays."* But
   `billing.service.ts:932-965` branches on `session.metadata?.type === 'session_fee'` and reads
   `organizationId`, `groundId` and `quantity` — all three written **only** at `:238`, inside
   `purchaseSession`. Delete the writer and the branch becomes unreachable code that can still fire
   on a redelivered historical event. `CORRECTION-payments.md` also asks, as its highest-priority
   open question, whether this route *has ever been called in production*. **The plan should say
   instead:** answer that question first; disable the route (410) rather than deleting the method,
   and keep the metadata contract documented next to the webhook branch.

4. **Two citation errors.** The pricing-page sentence *"your subscription ends at the close of the
   billing period. No penalties, no questions"* **does not exist** — no match for "penalt", "close
   of the billing period" or "cancel anytime" anywhere in `client/src` or `api/src`. The register's
   own wording (`findings_pass6b.md:22`) is *"Cancel from the billing page and your subscription
   ends at the close of the billing period."* in the `pricing.astro` FAQ. Quote the real sentence.
   And `purchaseSession`'s guard is ~180 lines *below* `claimFreeExtension`, not "twenty lines
   above"; the guard is at `:216-218`.

One thing worth adding: since the pricing copy is frozen (X2), the `canCreateGround` fix has no
freedom. The page says "up to 10 total". The function must be made to mean whatever the page says,
not the other way round. The plan's *"Whatever the rule, the pricing page and this function must
state the same one"* needs to become *"the page is frozen, so the function moves."*

**Effort:** "half a day plus half a day" is roughly right for what remains after removing the
cancellation bullet.

**Verdict: unsound** — the status value would not compile, and it duplicates Batch 17.

### Batch 8 — the Stripe webhook. Sound with corrections.

All six defects verified: no try/catch at `billing.controller.ts:275-284`; `findFirst` at `:938`
then a `$transaction` at `:944-961` against a `@unique` column (`schema.prisma:3155`);
`subscriptions.retrieve` unguarded at `:971` before the org update at `:973-981`;
`invoice.payment_succeeded` (`:1059-1092`) emails and writes a ledger row and does not activate;
`checkout.sessions.create` with no idempotency key at `:225` and `:505`.

The strongest evidence for this batch is one the plan does not use: **the schema comment at
`schema.prisma:3149-3154` describes this bug and says the unique index was added for it** — *"two
concurrent deliveries of one Stripe event could both pass the check, credit the balance twice and
log the charge twice."* So the constraint already prevents the double-credit; what remains is that
the loser throws P2002 out of an uncaught webhook, producing a 500 and a Stripe retry loop. That is
a more precise statement of P4-H06 than the plan gives, and it explains why the fix is
`recordInvoiceOnce` (`:461-479`) — the branch that was simply never converted.

Corrections:

- **`session.metadata` carries the plan but not the subscription id.** `:514` is
  `metadata: { organizationId, plan, type: 'subscription' }`; the subscription id is read off
  `session.subscription` at `:970`, and `subscription_data.metadata` at `:513` puts org and plan onto
  the *Subscription object*, for reasons given at `:509-512`. The plan's *"activate from
  `session.metadata` first (plan and id are both there)"* is wrong on the id. Reword: activate from
  `session.metadata.plan` plus `session.subscription`, then enrich.
- **`BillingCallbackPage.tsx:33-43` is the wrong range.** The plan is read from the query string at
  `:11`, the 3-second `navigate` is at `:13-20`, and the render is at `:59`.
- **The "no card was touched" swallow is partly already handled.** `billing.controller.ts:265-271`
  intercepts `StripeAuthenticationError` into a 503 "Payment gateway not configured". The
  no-key-at-all message at `stripe.service.ts:60` is a different string and *does* fall through to
  the generic toast. Narrow the claim to that one path.
- **A reuse target exists and the plan should name it rather than propose a new table:**
  `email.service.ts:479 sendWebhookEndpointDying`, called from `webhooks.service.ts:376` and
  registered at `email/nothing-goes-out-that-was-turned-off.ts:143`.
- **Strike the "no live subscription exists" risk framing** (X1). Payment is live; this is the batch
  where that matters most.

**Effort:** one day is right.

**Verdict: sound with corrections.**

### Batch 9 — limits and validation. Sound.

Everything checks out, including the parts most likely to be wrong.

`app.module.ts:51` is `ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 60 }])` — one
throttler, 60/min, as stated. There are **exactly five** `@Throttle` decorators naming `default`, at
exactly the five lines given; the other seventeen correctly name `global`. And the silent-no-op
claim is verifiable in the installed dependency: `@nestjs/throttler@6.5.0`,
`dist/throttler.guard.js:67-83` loops the registered throttlers and reads metadata keyed
`THROTTLER_LIMIT + name`, so a `default`-keyed decorator is never looked up and
`routeOrClassLimit || namedThrottler.limit` falls back to 60/min without error. The plan's
"decoration" framing is precisely right.

`SendMessageDto @MaxLength(8000)` is at `conversation.controller.ts:12`. The inert inline panel type
is at `public-api.controller.ts:302`. `opener` (`:290`), `classify-intent` (`:312`) and `faq`
(`:318`) carry no throttle while `chat` (`:297`) and `report` (`:326`) do.
`POST /feedback` is `@Public()` with none (`feedback.controller.ts:75-79`).

Two trivia: **there is no `chat/stream` route on `entry.controller.ts`** — the plan lists three
throttled siblings and there are two. And this batch should own the shared DTO outright (X5).

**Effort:** "hours for the throttlers, half a day with the DTOs" is right.

**Verdict: sound.** The single soundest batch in the part.

### Batch 10 — credentials. Sound with corrections.

Verified: `MachineTokenGuard` never reads `apiCredential` or `revokedAt`, so an unexpired token
outlives revocation; `PATCH /entry/draft` is `@Public()` (`entry.controller.ts:206-213`) and the
`pendingSignup` branch (`entry.service.ts:1761-1775`) checks neither expiry nor use while the
`EntryDraft` branch immediately below at `:1777` checks `consumedAt` and `pendingJoin` at
`:1879-1880` checks both; `auth.service.ts:890-898 validateToken` returns `{ valid, email,
firstName }`; `resetPassword` (`:771-782`) updates only the hash and the token; and **`sessionVersion`
does not exist anywhere** — zero matches in `api/src` or `api/prisma`, so it is genuinely a new
column.

Two corrections, one of them substantive.

1. **The `verifyToken` recommendation is wrong, and the comment the plan invokes says the
   opposite.** The plan says *"hash `verifyToken` and stop returning it — show it once at connection
   time and never again"*, and cites *"a comment in the adjacent schema block arguing that
   integration secrets must be hashed."* No such comment exists. What is there is
   `schema.prisma:1892`:
   > "What Meta's subscribe handshake must echo. Ours to generate, theirs to paste into Meta."

   A verify token is a value the customer must be able to read out of our UI and paste into Meta's
   console, possibly weeks later. Hashing it breaks the feature. (`accessToken` at `:1888` is
   different and the comment there — *"never shown back after saving"* — supports encrypting it.)
   **The plan should say instead:** encrypt `accessToken` and `appSecret` at rest; leave
   `verifyToken` readable and say why, citing `:1892`. Also the field range is `:1888-1893`, not
   `:1889-1893`.
2. **Line/path drift.** The guard is at `api/src/modules/public-api/machine-token.guard.ts:49-110`,
   and `TOKEN_TTL_SECONDS = 900` lives at `public-api.controller.ts:41`, not in the guard. The
   "already hits the database twice, so the check costs nothing new" argument is weaker than stated:
   the guard's own comment at `:69-75` says the `apiCall.count` is deliberate rate-limiting, so both
   existing reads are load-bearing and a third is a real third.
3. `jwt.strategy.ts` is at `auth/strategies/jwt.strategy.ts` and the `signedInVia` line is `:47`,
   not `:52`. The claim itself is correct and it is a good catch — `:42` re-reads `organizationId`
   from the row, which is exactly the contrast that makes `signedInVia` the outlier.

**Effort:** the split estimate ("hours" for the guard and draft checks, "more than a day" for
encryption plus session version) is honest and correct. Note that dropping the `verifyToken` hash
makes the encryption half smaller.

**Verdict: sound with corrections.**

### Batch 11 — a read scope that writes. Unsound as written.

The finding is real. `detectors.controller.ts:88-101` is `@RequiresScope('findings:read')` at `:91`
and calls `scenarios.propose(...)`, which writes `Recommendation` rows. `proposals:write` is a real
registered scope (`public-api/scopes.ts:29`), used by accept and decline at `:132` and `:141`, and
surfaced to customers at `IntegrationsPage.tsx:66`.

The comment above the propose call (`:95-100`) defends **co-location**, not the scope — so a
scope-only change does not contradict it. The plan says exactly that, and is right.

The blocking problem is the transition:

- **`@RequiresScope` cannot accept two scopes.** `machine-token.guard.ts:10` is
  `export const RequiresScope = (scope: string) => SetMetadata(REQUIRED_SCOPE, scope);` and the
  guard reads a single string at `:93` and calls `holdsScope(scopes, required)` at `:100`. The
  plan's *"accept either scope for one release"* is not a configuration — it is a change to the
  decorator and the guard, which the batch does not budget and which the risk paragraph treats as
  free (*"Risk: low, provided the grace release happens"*).
- There is a cheaper route the plan misses: `scopes.ts` already has an `IMPLIED` map (currently
  `{'graph:read': ['graph:write']}`). Adding `'proposals:write': ['findings:read']` for one release
  gives the grace period with no decorator change.

Also worth noting for the spec: `machine-token.guard.ts` already enforces *"A ROUTE WITHOUT A
DECLARED SCOPE IS REFUSED rather than allowed"*, which the proposed
`a-read-scope-does-not-write.spec.ts` can lean on.

**Effort:** "hours (the spec is the work)" is right *only* if the IMPLIED route is taken. With the
decorator change it is half a day.

**Verdict: unsound as written**, sound with the IMPLIED-map correction.

### Batch 12 — the client disagrees with the server. Sound with corrections.

All four defects verified: `ContextPage.tsx:75` (`client/src/components/gw/`, not `pages/`);
`documents.service.ts:577-590` with the exact message at `:589`; `GroundAdminPage.tsx:482-483`;
`grounds.service.ts:4545-4547 setChasing` initiator-only; `stores/auth.ts:54-58 updateUser` a bare
`set(...)` with no token and no `queryClient`; `App.tsx:508` versus `:497`. **`AdminsOnly` exists**
(`App.tsx:176`) and is already asserted by `a-member-is-refused-at-the-door.spec.ts:35, 49`, so that
half of the change is a one-line addition.

Two comments the plan must engage and does not:

1. **`App.tsx:505-507` justifies the current `/org/integrations` guard:**
   > "RequireOrgSetup rather than RequirePlatformAdmin: this is a CUSTOMER's admin connecting their
   > own systems, not Groundwork staff. The page itself refuses a non-admin, and every endpoint
   > behind it is admin-gated on the server."

   The plan's fix (`AdminsOnly`, an org-admin gate) is compatible with this — the comment rejects
   `RequirePlatformAdmin`, not an org-admin gate. But the plan cites `App.tsx:102-105` as though the
   route were an oversight, when `:505-507` shows it was reasoned. **The plan should say instead:**
   the reasoning at `:505-507` stands and only its last sentence is the problem — "the page itself
   refuses a non-admin" is the pattern `:102-105` was written to remove. Add `AdminsOnly` and update
   `:505-507` to say so.
2. **The proposed `whatThisViewerMayDo(...)` returned by the server contradicts a stated direction.**
   `grounds.service.ts:1683-1688` explains the current payload shape: peer visibility is *"Sent as a
   plain boolean, not as a list of capabilities"*. The server *computes* `viewerRunsThisGround`
   (`:1408`) and `viewerIsInitiator` (`:1381`) and deliberately does not return them. The plan's
   direction is defensible, but it reverses a written choice without citing it. **The plan should
   say instead:** return the two booleans the server already computes (`viewerIsInitiator`,
   `viewerRunsThisGround`), which is the minimum that closes P1-018/P1-019 and does not introduce
   the capability list `:1683-1688` argues against.

Also: `GroundPage.tsx:51-52` recomputes the same predicate a third time and routes the whole page on
it. It is not in the plan's list of four and belongs there.

**Effort:** half a day is low with the server-side addition; a day is closer.

**Verdict: sound with corrections.**

### Batch 13 — a percentage that can only be zero. Sound with corrections.

The core claim holds: `evidenceType` has **zero writers** in `api/src`, the schema default is
`CHECK_IN` (`schema.prisma:1312`), and the figure is therefore structurally zero. The comment at
`documents.service.ts:444-452` is the best evidence in the whole plan and should be quoted in full:
> "THERE USED TO BE A WRITER HERE, `extractAndStoreClaims`, and it was a category error… A document
> then backed lines the document itself had written… The writer is gone and its rows were purged;
> the document's content reaches the record only through `anchorRecordToDocuments`, which backs what
> a PERSON said with what a DOCUMENT says."

`anchorAfterUpload` is real (`documents.service.ts:154`, called at `:324-325`, delegating to
`conversation.anchorRecordToDocuments`). `GroundParticipantPage.tsx:666` and `board.service.ts:630-632`
render it, the latter guarded by `a-heading-over-nothing.spec.ts:49`. The homepage figures are at
`index.astro:262, 275, 285, 295`.

Three corrections:

1. **"Point `reports.service.ts` at the working implementation in `the-session-report.ts`" will not
   work — they measure different things.** `the-session-report.ts:384-385` computes `backedPct` from
   `countsAsASource(e.backedBy)` and `!e.recallBased`, not from `evidenceType` at all, and its
   comment at `:382-383` records a deliberate distinction: *"A line backed by notes somebody wrote
   with a model is not backed by an independent source: it shows as backed, and it does not raise
   the documented share."* Pointing one at the other silently changes what the number means on the
   report surface. **The plan should say instead:** pick one definition explicitly and say which
   number changes. If `backedBy` is the better definition, the fix is to delete `evidenceType`'s
   readers rather than to restore its writer — which is a *smaller* batch than the one proposed.
2. **Reconcile with the `documents.service.ts:444-452` comment.** The plan proposes restoring a
   writer in `anchorAfterUpload`. That is compatible with the comment (anchoring is the sanctioned
   path), but the comment explains why the *last* writer was a category error, and a proposal to
   "restore the writer" must say which writer and why this one is not the same mistake.
3. **The proposed spec is too broad to work.** *"asserts that for every enum value read anywhere in
   `api/src`, some code path writes it"* will fail on every enum value legitimately written only by
   Stripe, SCIM or a migration. Narrow it to: `evidenceType` specifically, or "every value of the
   enums listed here".

Minor: the logic is at `:1331-1341` (the `select` is at `:1326`); there is a fifth `evidenceType`
occurrence in `pattern-evidence-wiring.spec.ts:50`, so "four reads" holds only excluding specs.

**Effort:** "half a day plus the backfill script" is right for what is proposed — but if correction
1 goes the other way the batch shrinks to hours.

**Verdict: sound with corrections.**

### Batch 14 — email escaping. Sound with one correction that changes the approach.

All five interpolation sites verified, `grounds.service.ts:655` passes `dto.label` raw, and the
count is exact: `grep -c "^  async send"` on `email.service.ts` returns **48**. The two
counter-examples are real, and `sendRoundDigest`'s comment is the right framing for the batch:
> "The digest carries a ground label somebody typed, and it is going into HTML. Escaping it is not
> about an attacker - it is about a team whose project is called 'Q3 <finance & ops>' getting a mail
> that renders as half a sentence."

One correction, and it affects the design:

- **A tagged template at the `html` boundary will not work, because every sender wraps its body in
  `this.layout(...)`.** Escaping at the outer boundary double-escapes all 48 layouts. And it is not
  two senders that embed markup — `sendParticipantInvite` builds `noteHtml` (`:389`) and `sendNudge`
  builds `otherPartyNote` (`:615-617`), but *every* sender passes an HTML fragment into `layout`.
  **The plan should say instead:** the tagged template goes at each *interpolation* site inside a
  sender, never around the whole body, and `layout` keeps taking trusted HTML. That is still
  mechanical, but it is 48 hand-edits, not a wrapper swap.
- Minor: `sendWhoHasNotStarted` is at `:718`, escapes at `:719-722`, and escapes only `&`, `<`, `>`
  — **not** `"`, unlike the shared `escapeHtml` at `:1109-1116`. So it is a partial
  counter-example, and the shared helper it should have called already exists. Say so; it
  strengthens the batch.

**Effort:** "half a day, mechanical" is low for 48 senders with per-site judgement about which
fragments are markup. A day.

**Verdict: sound with corrections.**

### Batch 15 — a read that writes, and a price the site cannot see. Unsound as written.

Both findings are real. `pricing.service.ts:98-107 setAmountCents` and `:111-114 setMemberCap` write
`pricingPlan` at runtime; `marketing/src/pages/pricing.astro` hardcodes the figures.

But both halves of the proposed change are blocked.

1. **BLOCKING — making `identify()` read-only locks every platform admin out of `/ops`, and the
   plan's own mitigation points at the thing that breaks.** The plan says *"check `OpsCapabilityGuard`
   first"*. Checked: `ops-capability.guard.ts:30` calls `this.people.identify(request.user)`, `:41`
   returns `identity !== null` when no capability is named, and `:43` asserts on it.
   `ops-people.service.ts:108` returns `null` for anybody with no row who is not a platform admin —
   so the auto-admit at `:107-111` *is* what makes `/ops` work for a platform admin with no seeded
   row. Read-only means 403.

   And the behaviour is not an oversight. `a-platform-admin-is-on-the-team.ts:4-28` is a
   twenty-five-line decision record dated 2026-09-05:
   > "THE PLATFORM-ADMIN LIST AND THE OPS TEAM ARE ONE LIST… the effect of keeping them apart was
   > that the person who owns the company had to connect her own account before she could open her
   > own back office — and then, having done it on one account, was refused on another. Decided
   > 2026-09-05."
   > "IT IS NOT AN ESCALATION, WHICH IS WHY IT IS SAFE… Nothing here opens a door that was closed to
   > them."
   > "What it does open is CEO-level grants inside the ops system, including `spend:approve`. That is
   > deliberate too: 'nobody approves their own spend' is enforced on identity rather than
   > capability, so more holders makes the rule work rather than weaker."

   The plan acknowledges the behaviour is "documented and deliberate" and then proposes to reverse it
   anyway, without meeting any of those three arguments. That is the exact pattern this audit is
   looking for.

   **The plan should say instead:** the finding that survives is narrow — a **GET** should not write.
   Keep the auto-admit, move it out of the read path: admit on the door-opening flow
   (`ops-door.controller.ts`), which every ops user passes through anyway, and have `identify()` on a
   GET return an in-memory identity without persisting. That closes P1-017 without touching the
   2026-09-05 decision. Also, the plan should note that the row is created by
   `admitThePlatformAdmin` (`:138`), not by `identify()` itself, and that it first *matches* an
   existing row by email or key and links `userId` (`:159-183`) before creating.

2. **BLOCKING — the pricing half is a marketing edit** (X2), and the fallback ("point the guard at
   the live `platform_settings` rows") does not fit the code either. There are **three** guard specs,
   all in `client/src` (`the-price-is-the-same-everywhere.spec.ts`,
   `the-two-pricing-pages-agree.spec.ts`, `one-price-said-in-two-places.spec.ts:23`), and the seed
   helper reads the **migrations**, not the database. A client-side unit spec cannot read
   `platform_settings` — there is no database in that test run. And
   `the-two-pricing-pages-agree.spec.ts:15-18` pre-rejects the shared-module fix: *"The two are
   separate packages with separate builds; importing across them means either a build-time coupling
   or a copied file that drifts exactly as badly."*

   **The plan should say instead:** with the marketing page frozen, the only fix available is on the
   API side — refuse a `setAmountCents` that would put the live table out of step with the published
   page, or alert on the drift. Say plainly that this leaves P6B-010 open, and add it to the list
   `fix_plan.md:31` says lives in `planaudit_d_f_g.md`.

**Effort:** "half a day" is meaningless for the batch as written, since neither half can be done.

**Verdict: unsound.**

### Batch 16 — the retention sweep. Sound with corrections. The proposed fix does not work.

The mismatch is real: `users.service.ts:657-665` rewrites participant emails to
`deleted-${link.id}@deleted` (with a comment at `:655-656` explaining the per-link loop avoids unique
conflicts), and `departure.service.ts:148-152` deletes `conversationTurn` rows matched through
`participant: { email: person.email }`. The plan's honesty about confidence ("Unverified, and it is
still unverified here") is right and should be kept.

But:

1. **The proposed join does not exist.** The plan says *"`departure.service.ts` should join on
   `participant.userId`"*. `GroundParticipant.userId` exists (`schema.prisma:1026`) but is
   `// null until they accept the invite`, and — decisively — `DepartureRecord` carries
   `personExternalId`, while **`Person` has no link to `User` in this direction**. There is no
   `personExternalId → userId` path available, so the join cannot be written as described.
   (`Person.linkedUserId` exists at `schema.prisma:3009` and is the nearest seam, but it is nullable
   and null for most of a roster.)
2. **The fallback the plan offers is the failure case.** It says keep the email match *"as a second
   clause"* for participants with no account. Those are precisely the rows with `userId: null` — so
   for them nothing changes, and for erased accounts the email has been overwritten by
   `users.service.ts:659-664`, making them unreachable by *either* clause.
3. **The plan misses a second site with the same bug.** `departure.service.ts:65-74` matches
   `fromParticipant.email` and `onParticipant.email` for blockers, identically.
4. **There is no comment defending the email match** — the only nearby comment (`:143-147`) is about
   coverage, not matching. So nothing blocks a change; the problem is purely that the proposed change
   is not constructible.

**The plan should say instead:** the fix is on the *erasure* side, not the sweep side. `eraseAccount`
should stamp a durable marker on each participant link (an `erasedAt`, or keep the original address
in a hashed column) that the sweep can match, rather than destroying the only key the sweep has.
Then fix both sites. That is a small migration the plan currently says it does not need.

**Effort:** "hours" is right for the sweep edit but wrong for the batch, because a marker column and
a migration are now in scope. Half a day plus the dry run.

**Verdict: sound (the finding), unsound (the fix).**

### Batch 17 — cancelling ends at the end of the month. Sound.

Verified: `cancelSubscription:564-578`, `pauseSubscription:580-592` with
`pause_collection: { behavior: 'mark_uncollectible' }`, `resumeSubscription:595` clearing it. The
batch is right that pause is already built and correct and that the missing thing is the offer.

It is the only batch in the part that handles the `SubscriptionStatus` question properly (*"Check the
`SubscriptionStatus` set before adding one… every reader of the status must be found first, because
a status nothing understands is the frozen-state bug in part B"*). Confirming the concern is real:
the set is closed at `api/src/common/subscription.ts:25`, written with `satisfies`, and
`isSubscribed` (`:39-51`) treats anything but `'active'` as not paying — with a header comment
explaining that this is deliberate (*"it fails toward the free tier, never toward free service"*).
The right answer is probably to keep `'active'` and read `cancel_at_period_end` / a new
`subscriptionEndsAt` for the UI, rather than adding a fifth status; the batch should say so.

Two housekeeping items: the batch is not in the coverage table, and Part A's opening line still says
"Sixteen batches". And it duplicates Batch 7's cancellation bullet (see B7, problem 2) — Batch 17
should be marked as superseding it.

One useful fact the batch could use: `stripe.service.ts:82` already has a `cancel_at_period_end:
true` helper, so step 1 is a call-site change rather than new Stripe code.

**Effort:** "half a day plus half a day" is right.

**Verdict: sound.**

---

## Part E, batch by batch

### E1 — one rule in one file. Sound with corrections, but the count hides a decision.

The template is real and is the right one: `a-ground-that-has-ended.ts` is a pure module — no
Prisma, no `@Injectable`, one const and two functions — so "in the style of" is accurate.
`every-public-route-is-guarded.spec.ts:223` is the right precedent for the scanning spec (it already
scans for the forbidden tokens `'organizationId'`, `'req.machine'`, `'this.prisma'`), and the plan is
right that the scanning spec is the durable half.

**The correction that matters: there are 14 local `isOrgAdmin` declarations, not six, and they are
two different formulas that do not agree on a security question.**

`grounds.service.ts` — ten of them, all `viewer?.role === 'ADMIN' && viewer.organizationId ===
ground.organizationId` (`:1787, :2159, :2237, :2281, :3240`, and the same shape named `asker` at
`:3817, :3869, :3907, :3981, :4037`).

`reports.service.ts` — four of them, and **none tests role**: `:1841, :1934, :2496, :3554`.

So "delete the local `isOrgAdmin` variables, there are six of them and they are the bug" understates
by more than half and, worse, presents as a tidying job what is actually a decision: unifying on the
grounds formula tightens the reports paths (that is Batch 2, and it collides with a pinned spec — see
B2); unifying on the reports formula would loosen ten grounds handlers and hand every org member the
lead's controls. **The plan should say instead:** name the two formulas, state that the grounds one
is correct and the reports one is the bug, and note that Batch 2 has already made that call so E1
inherits it rather than re-deciding it.

Two smaller corrections:

- **The list is not an `organizationId` comparison.** `grounds.service.ts:974-990` is
  `const isAdmin = userRole === 'ADMIN'` (`:981`) selecting between two Prisma `where` clauses — a
  different mechanism. The plan's *"the list stops being the place the rule lives and becomes a query
  built from it"* is the right instinct, but it should note there is a third branch at `:1029-1050`
  that pulls in grounds in *other* organisations where the user is a participant, which the
  three-level rule must reproduce or it will hide cross-org check-ins people can currently see.
- **Drop P6B-004 from the coverage** (X3).

The comment E1 must preserve is `board.service.ts:185-192`: *"AND AN ADMIN OF THIS ORGANISATION, WHO
WAS BEING TURNED AWAY FROM HER OWN COMPANY'S BOARD… an admin of THIS organisation runs the check-in;
an admin of a different one is a stranger."* The three-level rule reproduces it correctly, but the
plan's stated risk ("a read that should be allowed starts refusing") is exactly this incident
happening again.

**Effort:** "a day for the module and the six call sites" is low, because there are 14 call sites in
two formulas plus the list's two query branches. Two days.

**Verdict: sound with corrections.**

### E2 — department captured at every door. Sound with corrections.

The schema half is right: `Person.department` at `schema.prisma:2991` and
`Person.managerExternalId` at `:2996`, both written by the directory sync
(`scim.service.ts:90-91`, mover detection at `:170-171`) and both returned by the public API
(`public-api.controller.ts:1263, 1265`). The decision is already recorded in `fix_plan.md:43`
("Department. Optional, captured beside role wherever a person is added, usable through the API,
never inferred"), so this batch is executing a made decision.

Three corrections:

1. **"Nothing anywhere reads either one" is false, and one of the readers is an access decision.**
   `embed.service.ts:126` is
   `config.outOfScopeDepartments.includes(person.department ?? '')` — it decides whether the
   assistant panel appears at all, and it has its own spec (`out-of-scope-sees-nothing.spec.ts`) and
   its own comment at `:117-124`:
   > "NOTHING, NOT A DISABLED LAUNCHER. Three ways to be out of scope and they all return the same
   > answer… A launcher that appears and refuses tells somebody they are being kept out of something,
   > which is a conversation the customer did not ask us to start on their behalf."

   This is a live dependency, not a fact. **The consequence E2 must state:** letting people type a
   department at four new doors means a person who types a department the customer has listed in
   `outOfScopeDepartments` silently loses the panel. Worse, the `?? ''` coercion means E2's rule
   "blank means blank" is already violated here — a blank department matches a configured empty
   string. E2's own risk paragraph is about blank-matching in E3; the live instance is in
   `embed.service.ts:126` and should be fixed in this batch.

   `managerExternalId` is read much more widely (assistant, detectors, public API, and
   `reports/whose-reports-a-manager-may-read.ts`).

2. **The five doors are really four, and two of them are one writer.** Door 2 (the panel's
   add-a-person, `public-api.controller.ts:700` → `a-check-in-a-customer-can-run.service.ts:390`)
   delegates to `this.scim.upsert(organizationId, 'panel', …)` at `:406`, and the comment at `:386`
   says so: *"SCIM, not a second way of making people… so a person added from the panel and the same
   person arriving later from the customer's HR system are one row rather than two."* Doors 1, 2 and
   3 are two entry points into one writer. Treating them as three independent changes over-scopes the
   batch. (Also, the panel takes `displayName`, not `name`.)

3. **Doors 4 and 5 do not write to `Person` at all, and the plan does not say what should happen.**
   `POST /grounds/:id/participants` (`grounds.controller.ts:275`, `AddParticipantDto`) and the join
   page (`JoinPage.tsx:57-60, 128-129`) write `roleAsDescribed` on a **GroundParticipant**. There is
   no `Person` row to hang a department on unless one is created or matched. So "add an optional
   department beside it" is a larger change at these two doors than at the others: it needs a
   `Person` upsert, or a new column on `GroundParticipant` plus a rule for reconciling the two. That
   is the hidden dependency in this batch and it is why E3 cannot simply assume department is
   populated.

**Effort:** "half a day" is low by more than double once doors 4 and 5 need a `Person` seam and the
embed interaction is handled. A day and a half.

**Verdict: sound with corrections.**

### E3 — department as an optional read scope. Unsound.

Three problems, two of them fatal to the batch as written.

1. **BLOCKING — most of this is already built, wired and specced.**
   `api/src/modules/reports/whose-reports-a-manager-may-read.ts` is a pure module implementing
   exactly the rule E3 describes, its header opens:
   > "A MANAGER MAY SEE THEIR DEPARTMENT'S REPORT. ONLY THE EXACT WORDS ARE WALLED OFF. Hafsah's
   > rule, and it corrects a real over-caution: a management tool whose output a manager cannot see
   > is not a management tool."

   It is called from `reports-for-my-people.service.ts:72`, which is wired into
   `public-api.controller.ts:35` and `reviews-coming-up.cron.ts:6`. **And the spec E3 proposes to
   write already exists**, under all but one character of the same name:
   `a-manager-sees-the-report-not-the-words.spec.ts` (E3 proposes
   `a-manager-sees-the-report-and-not-the-words.spec.ts`).

   The module also already solves the trap E3 does not mention (`:20-25`): *"A manager of one
   participant reading it is reading a document about the other participants too… Access by
   reporting line has to mean access to reports about YOUR people, not reports that happen to mention
   one."* E3's one-line formulation — *"a viewer who is the named manager of a party… reads at
   `shared`"* — walks straight into it: the named manager of *one* party would read a report about
   everybody in the check-in.

   **The plan should say instead:** E3 is not "build the manager rule". It is "make E1's rule
   delegate to `whatAManagerMayRead`, which already exists", plus the one genuinely missing piece:
   the department-match case for an admin. That is a much smaller batch and it should cite the
   existing module and spec.

2. **BLOCKING — the premise "the product already keeps settings as rows rather than defaults in
   code" is false for organisation settings.** The row-shaped settings tables are `PlatformSetting`
   (`schema.prisma:4094`) and `OpsSetting` (`:5077`) — and `OpsSetting` is keyed `key String @id`
   with **no `organizationId`**, so it is internal ops, not per-customer. Actual organisation
   settings are columns on `Organization`, e.g. `whoMayOpenCheckIns String @default("NAMED_LEADS")`
   at `:496`.

   So "ships behind an organisation setting" and "Migration: one settings row per organisation" and
   "Backfill: set every existing organisation to the value that matches today's behaviour" all
   describe a table that does not exist. The memory note the plan is leaning on
   (`groundwork-defaults-dont-reach-the-database`) is about grants and platform settings, not
   org-level product settings.

   **The plan should say instead:** add a column on `Organization` with a Prisma default matching
   today's behaviour, exactly as `whoMayOpenCheckIns` does. Then the migration is one column, the
   backfill is the default, and *"Awaiting your decision only on which value is the default"* becomes
   a one-word change in the schema.

3. **The department a viewer would be matched on may not exist for them.** `department` is on
   `Person`, not `User`. A viewer is a `User`. The seam is `Person.linkedUserId`
   (`schema.prisma:3009`), which is nullable and *"Null for most of a roster, and that is normal"*.
   So "an admin whose department matches" requires a `User → Person` resolution that will miss most
   viewers. E3 must say how, and its "half a day on top of E1" does not budget for it.

**Verdict: unsound.**

### E4 — a session belongs to the organisation being viewed. Unsound.

See X4. The switcher exists (`auth.controller.ts:223, 233` → `auth.service.ts:1220`), the
organisation already comes off the token, the design decision E4 reverses is written down at
`auth.service.ts:1211-1213`, the memberships backfill E4 says is unnecessary is necessary (home orgs
have no membership row), the `req.user.organizationId` framing is wrong (zero occurrences; 42 of
`user.organizationId`), and the finding it claims (P4-B07) is already closed correctly by Batch 4.

One extra hazard if it were built anyway: `OrganizationMembership.role` is a **second** role store
alongside `User.role`, and the codebase already has a file named for the problem —
`api/src/modules/users/a-role-is-stored-twice.ts`. Making the session authoritative multiplies that.

**Effort:** "a day" is not assessable because the change should not happen; what remains (Batch 4's
two fields) is under an hour.

**Verdict: unsound. Delete the batch; P4-B07 is Batch 4's.**

### E5 — what a lead may read. Sound with one correction.

The facts are right. `LEAD` is in `enum UserRole` (`schema.prisma:25`), and it is consulted in
exactly two non-spec places, neither a read:
`who-may-open-a-check-in.ts:73` (`if (how.whoMayOpen === 'NAMED_LEADS' && who.role !== 'LEAD')`) and
`who-may-say-how-we-do-it.ts:24` (`if (role === 'ADMIN' || role === 'LEAD') return { may: true }`).

The correction is that E5 breaks a written invariant without saying so. `schema.prisma:20-21`:
> "every privilege check in this codebase asks for ADMIN specifically, so a LEAD inherits nothing by
> not being a MEMBER."

E5 gives LEAD a read power, which is the first thing to make that sentence false. That may well be
right — the batch's argument ("a lead cannot see their own team's reports unless they happen to have
started the check-in") is good. But the schema comment must be updated in the same change, and the
plan should say so. **The plan should say instead:** add a line to E5 recording that
`schema.prisma:20-21` is amended by this batch, and check `every-role-the-database-has.spec.ts`,
which reasons about `@Roles(Role.LEAD)` not being writable today.

Also, E5's dependency on E3 should be restated: E5 says *"a lead reads at `shared` for any check-in
in their department"*, which needs the `User → Person → department` resolution E3 does not solve
(see E3, problem 3). E5's "hours, once E1 and E3 exist" is only true if E3 solves it.

**Verdict: sound with corrections.**

### E6 — machine reads ask the same question. Sound.

The best-evidenced batch in Part E. Both routes confirmed: `public-api.controller.ts:1152` and
`:1163` pass only `req.machine.organizationId` to `grounds-by-api.service.ts:649` and `:827`, whose
signatures take no fence, while `:63` in the same file does
`if (fence && !mayTouch(fence, personExternalId)) throw new ForbiddenException(OUTSIDE_THE_FENCE)`.
E6 is also more accurate than Batch 2 on this point (Batch 2 says `req.machine` is not passed; it is
— the *fence* is not).

The guard's own comment predicted this and should be quoted (`machine-token.guard.ts:21-23`):
> "Carried on the caller rather than looked up per route, so a route added next year is fenced by
> whatever the credential says without anybody remembering to check. The failure mode of the other
> arrangement is silent: a new endpoint that simply forgets, and reads everything."

`req.machine` is `MachineCaller` (`machine-token.guard.ts:12-26`), which already has
`boundToPersonExternalIds`, so it is structurally a `Fence` and `mayTouch(req.machine, id)`
type-checks with no adaptation. The fix really is one line per route.

Three notes:

- **Drop P4-G05 and P4-G07 from the coverage** (X3). With those gone E6 closes P4-G01 and P4-G02,
  which Batch 2 also claims — pick one owner.
- **The "breaking change… and there is one" is identifiable and testable.**
  `IntegrationsPage.tsx:966` ships a copy-pasteable curl example hitting
  `/api/org/v1/people/SAM-1/before-a-conversation`, and `the-example-on-the-page-has-to-run.spec.ts:94,
  105, 111` asserts it keeps running. That spec is what will catch the regression, and E6 should name
  it.
- **The break is narrower than E6 implies.** `a-fence-around-a-credential.ts:9-12` records that
  *"EMPTY MEANS EVERYTHING, and that is the only safe default… the alternative is an outage for every
  existing user"*, and `mayTouch` preserves it. So an **unfenced** credential is unaffected; only a
  fenced one calling outside its fence starts failing. E6's risk paragraph should say that — it turns
  "it will refuse calls that work today" from alarming into precise.

**Effort:** "half a day after E1" is right, and it is arguably independent of E1 (the fence check
does not need the three-level rule).

**Verdict: sound.**

---

## Order and dependencies

**Part A** states no explicit order beyond "user harm, then blast radius, then effort". Two hidden
dependencies:

- **Batch 6 before Batch 15.** B15 makes `ops-people.identify()` read-only; B6 changes what guards
  the ops path and explicitly warns that `identify()`'s write is on it. Doing them in the other order
  or in parallel risks locking the team out twice for different reasons.
- **Batch 8 before Batch 7's `purchaseSession` deletion.** The webhook branch B8 is hardening
  (`:932-965`) is the branch B7 orphans.

Batch 7's own text already discloses that Batch 2 supplies `claimFreeExtension`'s org predicate —
good.

**Part E's** stated order is *"E1 first… E2 can run in parallel; it touches different files. Then E3,
then E6, then E5. E4 last and alone."* Three problems:

- **E2 does not run in parallel with E3 — it blocks it**, and E2's own text says so (*"Closes: the
  gap that makes E3 impossible"*). The order section contradicts the batch. State E2 → E3.
- **E6 does not depend on E1.** The fence check is one line per route against an existing helper. It
  can ship first, and given it closes two Blockers it probably should.
- **E4 is deleted** (X4), so "one of which is E4 on its own" comes out of the total.

**Revised total for Part E:** with E4 gone, E3 reduced to wiring an existing module plus a schema
column, and E1 grown to 14 call sites, it is still about four days — but distributed differently
from the plan's estimate.

---

## Verdicts

| Batch | Verdict |
|---|---|
| A1 — three public routes | Sound with corrections |
| A2 — a ground id is not a key | **Unsound** (pinned source-text spec) |
| A3 — raw words | Sound with corrections (two marketing edits must be removed) |
| A4 — the join link | Sound with corrections |
| A5 — the meter | Sound with corrections |
| A6 — the back office door | Sound with corrections |
| A7 — money | **Unsound** (`'cancelling'` will not compile; duplicates A17) |
| A8 — the Stripe webhook | Sound with corrections |
| A9 — limits and validation | **Sound** |
| A10 — credentials | Sound with corrections |
| A11 — a read scope that writes | **Unsound as written** (decorator takes one scope) |
| A12 — client vs server | Sound with corrections |
| A13 — a percentage that can only be zero | Sound with corrections |
| A14 — email escaping | Sound with corrections (approach changes) |
| A15 — a read that writes / pricing | **Unsound** (both halves blocked) |
| A16 — the retention sweep | Finding sound, **fix unsound** (the join does not exist) |
| A17 — cancelling at period end | **Sound** |
| E1 — one rule, one file | Sound with corrections (14 sites, not 6) |
| E2 — department at every door | Sound with corrections |
| E3 — department as a read scope | **Unsound** (already built; settings table does not exist) |
| E4 — session owns the organisation | **Unsound** (already built; delete) |
| E5 — what a lead may read | Sound with corrections |
| E6 — machine reads | **Sound** |

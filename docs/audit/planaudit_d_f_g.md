# Audit of fix plans D, F and G

Read against the code on `fix/the-brief-is-yours-and-the-context-chat-takes-work`, 10 September 2026.
42 batches checked: part D's 20, part F's 16, part G's 6.

The plans are, in the main, accurate. Line citations are right far more often than not, and where they
drift they drift by a handful of lines rather than into the wrong file. Part D is the strongest of the
three. Part F is sound on its API and dead-end work and weak wherever it reaches for the marketing site.
Part G contains the single worst error in the set: **G1 is written as though the deletion and retention
machinery does not exist, and all of it exists and ships today.**

Seven things are wrong enough to change a decision, and they are listed first.

---

## The seven that matter

### 1. G1 is built on a misread of the whole subsystem. **Unsound.**

The plan says: *"There is no retention limit on what anybody writes. A person can download their own
record and cannot delete it."* And later: *"Retention, decided: keep everything for now. No sweep, no
expiry."* And under **Once decided**: *"A retention column on the organisation, a sweep that removes
turns past it… and an erase route for a person's own check-in."*

The code says every one of those things already exists.

- `api/src/modules/users/users.controller.ts:186` — `@Delete('me/data')`, live, routed to
  `UsersService.eraseAccount` at `api/src/modules/users/users.service.ts:635`.
- It is a **user-facing control**, not a hidden route: `client/src/pages/settings/SettingsPage.tsx:437`
  renders an "Erase it" button behind a confirm.
- `eraseAccount` already does precisely what the plan "decides": it anonymises the way in
  (`users.service.ts:643-653` — email rewritten, `passwordHash` and `googleId` nulled, `isActive: false`,
  `deletedAt` set) and leaves the record standing. Its own doc comment at `users.service.ts:627-632`
  states the decision the plan believes it is making for the first time: *"Conversation content
  contributed to grounds is retained under the other party's legitimate interest in the shared record
  (Art. 17(3)(c))."*
- The retention column exists: `RetentionPolicy.turnRetentionDays`, default 180,
  `api/prisma/schema.prisma:4583-4596`.
- The sweep exists and runs nightly: `DepartureService.ageOutDepartedTurns`,
  `api/src/modules/people/departure.service.ts:118` (`@Cron(EVERY_DAY_AT_3AM)`), deleting
  `conversationTurn` and `assistantTurn` rows past the window.
- The audit row that survives the deletion exists: `DepartureRecord`, `schema.prisma:4603`.
- There is even a shipped spec asserting both endpoints:
  `client/src/pages/settings/what-do-you-hold-about-me.spec.tsx:9`.

**What it should say instead.** G1 is not a build. It is a **reconciliation** of a deletion path that
already ships against a retention sweep that already ships, and the reconciliation has real work in it —
just not the work the plan describes. The four genuine gaps, none of which the plan names:

1. **The erase breaks the sweep.** `eraseAccount` rewrites `GroundParticipant.email` to
   `deleted-<id>@deleted` (`users.service.ts:658-663`), and `ageOutDepartedTurns` matches turns by
   `participant.email` (`departure.service.ts:151-153`). Self-erasing therefore makes a person's raw
   turns permanently unreachable by the sweep — retained for ever, the opposite of erasing.
   **This is already Part A Batch 16 (P1-020).** G1 must defer to it, not restate the area from scratch.
2. **`remove()` and `eraseAccount()` disagree.** The admin path `users.service.ts:521-561` rewrites
   `User.email` but leaves `GroundParticipant.email` carrying the live address; the self-serve path
   rewrites both. One of the two is wrong.
3. **The notification opt-out is looked up by email.** `email.service.ts:75` reads
   `user.findUnique({ where: { email: address } })`. After either delete the email no longer matches, so
   `emailNotifications` silently stops being consulted while the participant row may still hold the live
   address. The plan's "no notifications" clause is therefore **not** satisfied by the existing path.
4. **Nothing refuses the delete while a round is open.** The plan is right that this is required, and
   right about why. It is simply not true that this is new work sitting on a blank page.

**"Their name stays on reports that already carry it" — verify with care.** It is true in the one place
the plan means and false in another it does not mention. Report prose is rendered by joining live to the
User (`reports.service.ts:1831`, `:1923`, `:3515`), so an erased person renders as "Deleted User", not as
their name — the plan's promise is *broken* for those, not kept. But `WhatWorked.byName`
(`schema.prisma:1297`) denormalises the name at write time, with a comment saying it is shown deliberately
— so that one keeps the name after erasure, whether or not anybody intended it. Both behaviours should be
chosen, not inherited.

**What the plan has not thought of, that would break something.**

- **`RecordEntry.participantId` is `onDelete: Restrict`** (`schema.prisma:1328`). Any deletion job that
  tries to remove a `GroundParticipant` row is refused by the database. Anonymisation-in-place is the only
  shape that works, which is (fortunately) what the existing code does — but the plan's "no appearance in
  any roster or picker" needs to be delivered by the soft-delete filters, not by row removal.
- **A participant is identified by `(groundId, email)`** (`@@unique`, `schema.prisma:1167`), and
  `userId` is nullable (`:1026`, `onDelete: SetNull`). So "deleting the way in" cannot be modelled as
  deleting a User: the roster row is the email, and it survives.
- **Rosters and seat counts are already safe.** `colleaguesOf` filters `deletedAt: null, isActive: true`
  (`users.service.ts:267-278`) and `SEAT_WHERE` in `api/src/common/seats.ts:32` does the same. Auth is
  sealed at both `auth.service.ts:221` and `strategies/jwt.strategy.ts:35`, so live JWTs die on the next
  request. The plan should assert these rather than propose them.
- **The open-round refusal has no state to read.** `CheckInStatus` (`schema.prisma:158-163`) is
  `NOT_STARTED | IN_PROGRESS | COMPLETED | DECLINED`. "A check-in they are party to is still open" is
  computable, but note `CheckIn.completedAt` is **nullable** — an abandoned check-in never completes, so
  a naive "refuse while open" rule locks a person out of erasure permanently. Needs a staleness bound.
- **Legal hold does not exist.** The plan says *"the sweep must never touch a ground under a legal hold"*.
  `grep -riE "legal.?hold"` across the repo returns nothing. That is a new concept, a new column and a new
  read in the sweep — uncosted, and larger than the rest of G1.
- **"Record when each check-in ended, which is already stored" — TRUE.** `CheckIn.completedAt`,
  `schema.prisma:1204`. The one claim in G1 that holds cleanly.

**Effort.** "A day for the deletion path" is wrong in both directions: less, because the path exists;
more, because reconciling it with the sweep, the two divergent delete methods, the email-keyed opt-out and
a legal-hold concept is several days. Call it three, and sequence it **after** Part A Batch 16.

---

### 2. G1 and Part A Batch 16 contradict each other outright. **Cross-part contradiction.**

G1: *"keep everything for now. **No sweep, no expiry.**"*
Part A Batch 16: fixes the sweep and adds *"**Backfill: yes** — sweep once for turns belonging to
`@deleted` participants past the retention window; those should have gone already."*

One part is decommissioning a sweep it believes does not exist; the other is repairing it and running a
backfill deletion through it. If G1 is executed as written and A16 is not, the existing nightly job keeps
deleting turns at 180 days while the privacy plan of record says nothing is ever deleted. Resolve before
either ships. A16 is the correct one.

---

### 3. Part F Batch 9's board recommendation overrides a written decision in the file it edits. **Unsound as recommended.**

The plan says: *"`board-families.ts:208` — decide, and record the decision in the file the way the rest of
that file records its decisions… **Recommended: add `'quickRead'` to `EVALUATION`.**"*

The decision is already recorded, in that file, immediately above the line the plan cites.
`api/src/modules/board/board-families.ts:196-198`:

> *"Evaluation still does not get them, and that one IS deliberate - a 'how are they doing at a glance'
> strip on a board about whether somebody keeps their job is a scoreboard on a person."*

The plan's framing ("no reason written down") is borrowed from the comment at `:187`, which is about
`ONBOARDING`, a different family whose omission *was* unreasoned and has since been fixed (`quickRead` is
present at `:200`). The plan has read the right file and attached the wrong family's history to it.

**What it should say instead.** The classifier fix — the first half of Batch 9 — resolves the whole finding
on its own, with no board change and no marketing change. The homepage's fourth example
(`marketing/src/pages/index.astro:292`, *"Week seven of a ninety day probation"*, *"Tobi joined as a
delivery lead"*, header *"Tobi, first 90 days"*) is a **new-hire** situation. Classified correctly it is
`NEW_HIRE → ONBOARDING`, and `ONBOARDING` already renders `quickRead` (`board-families.ts:200`). The
example is only wrong today *because* the classifier sends it to PIP. Fix the classifier; change nothing
else. Delete the second half of the batch.

Two lesser corrections: the classifier lists **16** scenario keys, not fourteen (`entry.service.ts:488-503`);
`NEW_HIRE: BoardFamily.ONBOARDING` is at `:78` and its comment at `:57-60`. The quickRead strip on the
homepage is at `index.astro:296`, not `:294`.

**Verdict: sound with corrections** (classifier half stands, board half must be removed).

---

### 4. Part F Batch 4 proposes to move an emit whose position is a written decision. **Sound with corrections.**

The plan says the `CHECK_IN_COMPLETED` emit at `entry.service.ts:1654` was *"left behind"* when
`recordRoundCompletion` was moved after the contributor loop, and should be moved to join it.

The comment directly above it, `entry.service.ts:1649-1652`, says the position is chosen:

> *"Emitted after the record has been extracted and the report stored, and **before the invitations go
> out. The order matters**: the synthesis reads record entries, so the normal completion path awaits the
> extraction before announcing."*

The same comment block also asserts the race cannot happen — *"People still holding an unopened invitation
keep the round open, so this cannot release early"* — and that reasoning is genuinely circular, because at
emit time the contributors have not been added, so there are no open invitations for
`isSessionReadyForReport` to wait on. `isSessionReadyForReport` (`grounds.service.ts:4242`) does count
`GroundParticipant` rows, so **the bug the plan describes is real**. But the cause is not an oversight, and
moving the emit sacrifices the two things the comment was protecting: the forming report that exists so the
Report tab is not empty, and the lead's end-of-session card.

**What it should say instead.** Keep the emit where it is and make the *release* conditional, or move the
emit and explicitly state which of the two stated purposes is being given up and what replaces it. Either
way the comment must be rewritten in the same edit, or the next reader restores the old order.

Also: **this same move is already claimed by Part A Batch 5** (*"Move the emit of `CHECK_IN_COMPLETED`
after the contributor loop"*). Neither batch mentions the other. Line corrections: the contributor loop
begins at `:1679`, not `:1665`; `recordRoundCompletion` is at `:1726`, not `:1723`; the catch in
`reports.listener.ts` is `:90-92` and the hasEnded handling `:84-88`.

---

### 5. Part F Batch 2 writes a `CheckInStatus` value that does not exist. **Sound with corrections.**

The plan proposes, inside the close transaction:
`checkIn.updateMany({ where: { groundId, status: 'NOT_STARTED' }, data: { status: 'CANCELLED' } })`.

`enum CheckInStatus` at `api/prisma/schema.prisma:158-163` is `NOT_STARTED, IN_PROGRESS, COMPLETED,
DECLINED`. There is no `CANCELLED`. The plan hedges — *"or the repo's existing terminal state for an
unopened check-in"* — but there isn't one: `DECLINED` is documented in place as *"willingness gate answered
no — itself a useful record"*, a statement about the person, which is exactly the wrong fact to write here.

**What it should say instead.** This needs a schema migration adding a fourth terminal state, plus a pass
over every site that switches on `CheckInStatus` — the readiness count at `grounds.service.ts:4242`,
overdue arithmetic, and the report paths that filter `status: 'COMPLETED'`. That is not inside the batch's
"day". Call it a day and a half and name the migration.

The rest of Batch 2 verifies well. `beginClosingSession` guards only ownership and `hasEnded`
(`grounds.service.ts:2951-2953`) — true; and the plan's own safety check passes: **`isFinal` is written in
exactly two places, both inside `beginClosingSession`** (`:2959`, `:2967`), so the metering exemption cannot
be reached by flagging an ordinary session. One correction: it does not always create a new check-in — it
flags an existing open one at `:2959` and only creates at `:2967` when none is open. Line drift in
`conversation.service.ts`: the decrement is `:633-636` (ok), but the model call is `:733`, the turn create
`:739` and the status flip `:747` — the plan's 735/740/748 are each one off, and part D Batch 6 repeats the
same three numbers.

---

### 6. Part F Batch 3 duplicates a refund path Part A Batch 7 already builds, with an incompatible design. **Cross-part contradiction; dependency wrong.**

Batch 3 declares its only dependency to be Part A Batch 5, and states that *"there is no refund, reversal
or credit path anywhere in `billing.service.ts`"*. That statement is true — I confirmed it; `grep -i refund`
over `api/src/modules/billing/` returns nothing, and the only proration is on plan change
(`billing.service.ts:548`).

But **Part A Batch 7 already proposes the fix**, in the same words: *"And there is no refund, reversal or
credit anywhere in `billing.service.ts`… Add one credit path: an admin-only `creditSession(groundId,
reason)` that increments the balance and writes a `BillingEvent`."*

The two designs are not the same and cannot both land:

| | Part A Batch 7 | Part F Batch 3 |
|---|---|---|
| Name | `creditSession` | `giveBackASession` |
| Scope | `groundId` | `organizationId` |
| Record | existing `BillingEvent` | a new row |
| Idempotency | none stated | required, on `ref` |
| Interface | none stated | a control on `AdminPage.tsx` |
| Effort | half a day | half a day |

Part F's design is the better one — the idempotency key and the recorded reason are the right safety story,
and Part A's is silent on both. But the half-day is currently **counted twice** across the programme.

**What it should say instead.** Batch 3's dependency line must read "Part A Batch 5 **and Part A Batch 7**",
and one of the two must be struck. Recommend keeping F's design and deleting A7's final bullet.

---

### 7. Part D Batch 4 and Part A Batch 5 fix the same WhatsApp redelivery defect two incompatible ways. **Cross-part contradiction; dependency incomplete.**

Part D Batch 4 (P4-F03): *"Add a `WhatsAppInboundMessage` table keyed on `(organizationId, messageId)` with
a `handledAt`."*
Part A Batch 5 (P2-006): *"Read `message.id` (`wamid`) and record it **on the turn** with a unique index, so
a retry is a no-op."*

Same defect, two IDs, two schemas. Both are correct that no idempotency exists — the only use of
`message.id` in the repo is cosmetic (`a-whatsapp-message-is-routed.ts:63`) and there is no
`WhatsAppInboundMessage` model. Pick one. D's separate table is the better shape, because the platform path
can drop a message without ever creating a turn, and a unique index on a row that is never written cannot
deduplicate anything.

---

## Part D — batch by batch

**Decision 1 (which handler survives) — sound, with three corrections.** Every substantive claim in the
comparison table verified:

| Claim | Verdict |
|---|---|
| Platform route `whatsapp.controller.ts:52`, org route `whatsapp-for-an-organisation.controller.ts:96` | TRUE, both exact |
| Platform drops the first message | **TRUE** — `whatsapp.controller.ts:101-104`, `open(openCheckIn.id, user.id)` with `text` (read at `:78`) never passed |
| Platform identity unscoped | **TRUE** — `findUserByPhoneNumber` at `whatsapp.service.ts:333-336` is a bare global `user.findUnique` on `phoneNumber`; the check-in query at `:88-95` is org-unscoped too |
| Org identity scoped | **TRUE** — `whoIsWritingTo(organizationId, from)` at `:53`, every clause carries `organizationId` (`whatsapp.service.ts:241-256`) |
| Org keeps the first message unless ≤12 chars | **TRUE** — the guard is at `whatsapp-for-an-organisation.service.ts:136` |
| Platform picks the oldest silently; org asks with a tappable list | TRUE — `whatsapp.controller.ts:88-95` `orderBy: createdAt asc`; list built at `:94` |
| Media, translation, report-on-finish are org-only | TRUE — platform drops all non-text at `whatsapp.controller.ts:75` |
| Platform failure is one `catch` that logs and the person gets nothing | TRUE |

Corrections: the org answer path is `:131-141` (not `:126-134`); `sendMessage` begins at
`whatsapp.service.ts:105` (not `:143`) and its throw is at `:141-145`; `deliver` is `:217-234`;
`sendTheReport` is `:167-179` and its poll loop `:172-175` is confirmed at 4 × 4s; the list send is `:94`,
`pickedOne` `:78`, the numeric regex `:82`.

**"Confirm nothing else calls the one being deleted" — done. It is safe to delete, with three caveats the
plan does not carry.** The complete inventory of references to `WhatsAppController` is:
`whatsapp.module.ts:3` and `:9`, a self-reference at `whatsapp.controller.ts:27`, and
`whatsapp/a-phone-number-is-not-an-identity.spec.ts:70`. No client, journey lane, persona lane or e2e test
hits `/webhooks/whatsapp`.

1. `a-phone-number-is-not-an-identity.spec.ts:70` does `readFileSync(__dirname + '/whatsapp.controller.ts')`.
   It will **fail at the read**, not skip. Two tests must be deleted or repointed.
2. `WhatsAppService.verifySignature` (`:54-71`) and `findUserByPhoneNumber` (`:333`) lose their only caller.
   The latter may trip `no-method-in-here-is-dead.spec.ts`.
3. **Operationally it is not a pure delete.** If a live Meta app points at `/webhooks/whatsapp`, removing
   the route turns inbound into 404s while the platform number keeps *sending* — `grounds.cron.ts:450`
   and `sendFor`'s fallback (`whatsapp.service.ts:161`) both still use it. Repoint Meta first, or leave the
   route returning 200 with a "reply in the app" notice. The plan should say this.

The plan's step 1 — *"`handle` takes an optional connection… falls back to the platform credentials for the
send (`sendFor` already does this at `:159`)"* — is right about `sendFor` but incomplete about inbound:
the org controller needs `own.appSecret` to verify the signature at all (`:101-105`). A connectionless
organisation cannot be verified by that path, so the merged handler must keep two signature branches, not
one. That is more than "step 3 loses its routing body". **Effort: a day is optimistic; a day and a half.**

**Batch 1 — sound.** Every claim holds. The asymmetry is exact: the finish branch is wrapped
(`whatsapp-for-an-organisation.service.ts:119-129`) and the open/answer path is not (`:131-141`), so a
`ForbiddenException` with a carefully written sentence reaches the controller's log-only catch at `:109-111`
and the person gets silence. P4-F13 verified at `:101-103` — and worse than stated: the unknown-org return
happens *before* signature verification, so a probe is indistinguishable from Meta traffic. NL-012 verified
in both directions. No `WhatsAppSend` model exists.

**Batch 2 — sound.** P4-F06 (`:71` and the bare `catch` at `:59-61`), P4-F07 (`:136`), P4-F09
(`pickedOne` `:78`, numeric `:82`) and P4-F12 all verified. The plan's reasoning on P4-F12 — that removing
the length test turns a discard into a wrong write, so the `finish` match must move above the status test —
is correct and is the kind of interaction most plans miss.

**Batch 3 — sound.** No `type:'template'` anywhere. `lastInboundAt` written once at `:47`, read only at
`whatsapp.service.ts:269` and surfaced to `IntegrationsPage.tsx:707` — never compared to now. No consent
fields on `Person`, `WhatsAppConnection` or `WhatsAppThread`; no STOP handling. Schema corrections:
`WhatsAppThread` is `:1922-1932`. Blocked on Meta approval, correctly flagged.

**Batch 4 — sound with corrections.** See item 7 above (contradicts Part A Batch 5).

**Batch 5 — sound.** The over-broad guard is at `:159-160`, not `:155-157`, and `remember()` is called at
`:81` and `:92` (not `:78`/`:85`); deletion only in the finish branch at `:122`. The plan's diagnosis is
exactly right. One thing it misses: `:154-155` also requires `connected?.enabled`, so a disabled connection
suppresses the report even though `sendFor` would have fallen back to the platform number.

**Batch 6 — sound.** Panel claims verified; `sessionComplete` auto-complete is at `panel.html:220`, not
`:218`. The batch's explicit refusal to write a competing ordering fix for P4-E01, and its instruction to
flag the dependency on NL-014/P4-002 (Part A Batch 5), is the best-handled dependency in the three
documents.

**Batch 7 — sound with corrections; one finding is a misread.** `postMessage(..., '*')` at
`panel.html:123` and inbound `e.source !== parent` at `:372` (not `:371`) — E11 verified, and the
wildcard-fallback-plus-log staging is the right risk posture. `setInterval(askForANewSession,
ASK_AFTER_MS)` at `:101` with `ASK_AFTER_MS = 12 * 60 * 1000` (`:79`) and no `clearInterval` anywhere —
E09 verified.

**P4-E08 does not hold.** The plan says *"any panel session can settle another person's objective
disagreement."* The panel's only write of that kind is `panel.html:185`, `POST /grounds/…/confirm-lead`,
served by `public-api.controller.ts:634-643` under `EmbedSessionGuard`, and it already scopes to the
session's own person: `this.checkIns.confirmAsLead(req.panel.organizationId, req.panel.personId, id, …)`.
The two neighbouring panel routes at `:653` and `:661` do the same. The scoping the plan asks for is
already there. **Drop this bullet** — and note that `what-is-due-for-this-person.ts`, which the plan cites
as the pattern to copy, is a pure module (`whatIsDueFor`, `:34`) that scopes nothing by itself; the
scoping lives in the guard. Batch 7 is a two-item batch, not three, and closer to a couple of hours than
a half-day.

**Batch 8 — sound with one correction.** `JwtAuthGuard` verified: `if (isPublic) return true;` at
`jwt-auth.guard.ts:18-20`, before `super.canActivate`, and `handleRequest` throws on `!user`. The proposed
fix is implementable but **not with the signature the plan implies**: `handleRequest(err, user, info)` as
written cannot see whether the route is public. Passport's full signature is
`handleRequest(err, user, info, context, status)` — the fix must take `context` as a fourth argument and
re-read the `IS_PUBLIC_KEY` reflector there. Say so, or the implementer will reach for a field on the class.

**And the blast-radius claim is wrong.** The plan asserts *"nothing currently depends on it being null."*
Two `@Public()` controllers read `req.user`. One is the intended beneficiary
(`participants.controller.ts:65`, already null-tolerant). The other is
**`auth.controller.ts:200`, the Google OAuth callback**, which calls `findOrCreateGoogleUser(req.user)` —
where `req.user` is the **passport Google profile**, not a JWT user. Running the JWT strategy on that
route would overwrite the Google profile with a JWT payload and break sign-in with Google for anyone
arriving with a stale cookie. Exempt the Google callback explicitly, or scope the change to a new
`@OptionalAuth()` decorator rather than to every `@Public()` route. `entry.controller.ts` never reads
`req.user`, so it is genuinely unaffected. The plan is right that this is the one change with reach beyond
the flow, and right to want its own spec — it just found the wrong dependent.

**Batch 9 — sound.** Three-causes-one-boolean verified.

**Batch 10 — sound with one omission.** The `joinToken` branch is dead as claimed: no call site in
`client/src` passes a fourth argument to `entryApi.chat` or `chatStream` (checked all of
`EntryChat.tsx:32`, `OnboardingChat.tsx:281,321`, `EntryChatPage.tsx:1389,1420,1512`), and the journey
lane's only `joinToken` use is against `/entry/join-accept` (`api/journey/hundred/probes-two.ts:104,111`).
**But the plan only removes it from `EntryChatDto`.** The parameter also survives in
`client/src/api/entry.ts:161,170,194,196` and `client/src/types/index.ts:195`. Leave those and a future
caller reintroduces the leak through a still-typed door. Delete them in the same commit. One more:
`a-check-that-can-never-be-true.spec.ts:73` pins the literal string
`'modules/entry/entry.service.ts:joinToken'` and will fail on the deletion — repoint or remove it.

**Batch 11 — sound.** The `lastReplyHadCloseMarker` singleton defect is real and is also flagged, unclaimed,
at the end of Part A's coverage table (*"it should not fall between us"*). Part D Batch 11 is where it
lands; that resolves cleanly.

**Batch 12 — sound with two corrections.** `escapeHtml` is defined at `email.service.ts:1109`, not
`:1105-1112`, and it is used in **exactly one place** (`:1097`) — so the plan's *"two senders already escape
and prove the rule"* overstates the precedent; there is one, plus a local inline `.replace(/</g,'&lt;')`
at `:721`. Sender count: 48 is the count of `async` methods, of which four are private, so it is **~44
public senders** — immaterial to the work, but the golden-render spec should enumerate rather than
hardcode. Two of the cited raw-interpolation ranges point at the wrong lines: `:448` is the
`sendLeadInvite` **signature** and `:470` is a comment; the raw bodies sit just below each.

**NL-018 is bigger and more dangerous than the plan says, and it collides with G5.** The plan lists the
banned word at eight lines. It is on **25** lines (`:99, 132, 312, 313, 340, 364, 378, 395, 396, 399, 411,
532, 575, 577, 590, 653, 666, 667, 687, 702, 705, 733, 842, 862, 868`) — and the two senses are
interleaved. `:312` *"Activate your Groundwork account"* is the login sense; `:395` *"share their account
of"*, `:575`/`:590` *"where your accounts agree"*, and `:653`, `:666-667`, `:687`, `:702`, `:705` are the
**telling** sense and are the product's own vocabulary. A find-and-replace over this file, which is what
"the banned word, in eight places" invites, breaks the report copy. This batch must not run until G5's
polarity question (below) is settled, and the pass must be per-line with the sense judged each time.

The recommendation to add a golden-render spec over all senders rather than reading them is the right call
and the batch's best line.

**Batch 13 — sound.** NL-024 verified precisely: three `sendNudge` callers
(`grounds.cron.ts:551`, `remind.service.ts:186`, `remind.service.ts:347`) and only the third passes
`participantId` — with a comment at `:352` saying why (*"So the reminder carries its own way out"*), which
makes the other two look like oversights rather than decisions. Good.

NL-004 verified and the plan's diagnosis is right: `wouldTheyRatherNot` (`email.service.ts:69-107`) checks
exactly two things — `user.emailNotifications` at `:76` and a cross-tenant `EmailPreference.unsubscribedAt`
at `:80-96` — and reads neither `remindersStoppedAt`, nor the per-type `roundDigest`/`nudges` booleans that
exist on the model, nor `isActive`/`deletedAt`, nor `inviteDeliveryStatus`. So all four of NL-004, NL-033,
NL-034 and NL-010's suppression half land on the same function, as the plan says.

**One thing to add.** There are **two independent opt-out stores**, not one:
`GroundParticipant.remindersStoppedAt`, written by `stop-reminders.controller.ts:41-42`, and
`EmailPreference.unsubscribeToken`, written by `round-digest.service.ts:155-157`. Neither consults the
other, and `wouldTheyRatherNot` reads only the second. Centralising in `sendEmail` must reconcile the two
stores, not just call both — otherwise a person who used the stop link still receives the digest. And note
`:99-101`: `if (!user && !preference) return null;` — an address with no `User` and no `Person` row is
**always mailable**, which is every invited-by-address participant. Worth its own line in the batch.

**Batch 14 — sound.** NL-037 verified exactly: `grounds.cron.ts:380` and `:393` both take
`CronLock.SEND_REMINDERS`. The instruction to ship that two-line fix ahead of the rest of the batch is
correct. The insistence that NL-020's deferral queue lands *before* NL-003's quiet-hours extension, and
that the spec assert a held message is *sent*, is the single best-reasoned sequencing note in the three
documents.

**Batch 15 — sound.** No `Notification` and no `ScheduledEmail` model in `schema.prisma`, confirmed. The
"no later successful send" condition on bounce suppression is the right guard.

**Batch 16 — sound.** `billing.service.ts:896` builds `${frontendUrl}/users/me/export` and **no such client
route exists** — `/users/me/export` is an API path only, consumed from `client/src/api/my-data.ts:22` and
surfaced under `/settings`. So the cancellation mail, sent to every non-deleted user in a cancelling
organisation, points at a 404. The plan's "either build the route or point at the existing export" is
right; the existing export is at `/settings`. NL-007's *"strip it at the read, in the cron's `select`"* is
the correct structural posture. One correction: at `grounds.cron.ts:548` the record-entry text is passed as
`specificThing`, the second positional argument, which `email.service.ts:597` merely *names* `groundLabel`;
the plan's phrasing implies a field assignment. The privacy defect is the same either way.

**Batch 17 — sound.** No `EmailService` in `api-access.service.ts`, confirmed.

**Batch 18 — sound.** Both subsystems unreachable as described.

**Batch 19 — sound.** Correctly scoped as "listed here so none is dropped, sequence with the security
plan". Note NL-015, NL-017, NL-025, NL-026 and NL-035 are **also** claimed by Part A Batches 10 and 14 —
the plan says the work belongs elsewhere, which is right, but the coverage table then double-counts them.
Strike them from D's table or mark them "owned by A".

**Batch 20 — sound.** The `EMAIL_SENDS_FOR_REAL=true` recommendation over inferring from `NODE_ENV` is
correct and the risk direction is stated the right way round.

---

## Part F — batch by batch

**Batch 1 — sound.** `GroundParticipantPage.tsx:788` and `:808` verified; the false sentence is at `:827`
and occurs exactly once outside tests; the gate two blocks down is at `:833` with its reasoning comment at
`:830-832`. `conversation.service.ts:588-606` mails the initiator and `:617`/`:636` both swallow with
`.catch(() => undefined)`. The batch is well-formed: it makes the sentence true rather than deleting it,
and reuses an existing sender.

**Batch 2 — sound with corrections.** See item 5.

**Batch 3 — sound with corrections.** See item 6.

**Batch 4 — sound with corrections.** See item 4.

**Batch 5 — sound, and the claimed dependency is correct.**

> *Verify: part F's twelve-character-discard fix must land after part D's handler merge.*

**Confirmed, and the reason is stronger than the plan states.** The guard is at
`whatsapp-for-an-organisation.service.ts:136`, on the org path only. Part D Batch 2 **also** proposes to
remove it (P4-F07, same line, same reasoning). So this is not merely a sequencing dependency — it is a
**duplicate**: if F5 lands first, D2's P4-F07 bullet is already done; if D2 lands first, F5's only remaining
content is the second bullet, which is itself just a cross-reference to D1. F Batch 5 collapses to nothing
once part D lands. Say so, or merge it into D Batch 2 and drop it.

F5's second bullet ("the same catch-and-return treatment… applies here at
`whatsapp-for-an-organisation.controller.ts:107-109`") is off by two: the catch is at `:109-111`.

**Batch 6 — sound with one correction.** Verified: `RequireOrgSetup` is defined at `App.tsx:181`, redirects
on `mustSetUpOrg` at `:188-190` and again at `:306-308`; `auth.service.ts:1038-1039` computes it,
`:1128` writes the column; the column is read at `billing.service.ts:220`, `:495` and
`prompts.service.ts:417` and nowhere else; no mail is ever sent to it. The plan's own risk note is the
important one and it is **understated**: `RequireOrgSetup` wraps **11 routes** and at `:184-187` it *also*
redirects unauthenticated users to `/auth`. It is genuinely doing two jobs on every one of those routes, so
"becomes `RequireAuth` everywhere" is a real refactor of the client's auth topology, not a deletion. Half a
day is light; call it a day. Path correction: the page is `client/src/pages/org/OrgSetupPage.tsx`.

**Batch 7 — must be modified. See the marketing section.** The product half stands.

**Batch 8 — sound with corrections; one half must be modified.** `keyDecisions` and `whatWasLearned` do not
exist anywhere in `api/src` or `client/src` — confirmed by grep — while `how-it-works.astro:79` promises
them. The plan cites `reports.service.ts:649-696` as producing four parts; in fact `:649-696` computes
`arcByParticipant` and pushes a single context string at `:692-695`, and `:1715-1718` persists
`finalSynthesis` and `arcSignals` — **two** persisted fields, not four. The gap is bigger than the plan
says, which strengthens the batch. The risk note about routing both new fields through the existing
`countsAccounts` and name-resolution handling is correct and necessary.

The divergence half is weaker than stated. `how-it-works.astro:72` reads *"Managers get reports showing
progress against the objectives, what has changed, risks, where expectations differ, delivery against
commitments…"* — that is a run-on list of report **contents**, not a list of **sections**. A count tile
arguably satisfies it. The finding is a judgement call presented as a defect.

**Batch 9 — sound with corrections; second half must be removed.** See item 3.

**Batch 10 — the guard claim is TRUE and is the most valuable line in part F.**

> *Verify: part F claims a marketing guard spec reads only one page.*

**Confirmed.** `api/src/modules/reports/the-site-does-not-promise-more-than-this.spec.ts:29`:

```ts
const HOME = path.join(__dirname, '../../../../marketing/src/pages/index.astro');
```

One file, hardcoded. There are five pages in `marketing/src/pages/`. The only other specs that read that
directory are `client/src/marketing-links.spec.ts:21` (link checking, no content), and
`the-two-pricing-pages-agree.spec.ts:28` / `the-price-is-the-same-everywhere.spec.ts:33` (pricing only). So
`how-it-works.astro`, `about.astro` and `privacy-and-ai.astro` have **no content guard at all**, and the
plan's diagnosis — that P6B-001's false privacy sentence survived on `how-it-works.astro` for exactly this
reason — is right. That sentence is at `how-it-works.astro:51` (*"Nobody else sees your answers"*), not at
`:58` or `:72`.

**But the proposed extension will not work as described, and this is the batch's real defect.** The spec's
assertions are hand-written per-sentence regexes, and roughly half are **positive**: `:44` asserts the copy
*matches* `/never says who said what about whom/i`, and a later block asserts `/Same report, same moment/`.
Point `HOME` at a glob and every positive assertion fails on the four pages that legitimately do not contain
those sentences. The extension only works for the **negative** assertions.

**What it should say instead.** Split the spec into two describe blocks: a per-page block keeping the
positive assertions bound to `index.astro`, and a whole-directory block carrying only the banned-phrase
list. Then add "Ground" as a banned noun to the second. That is a restructure, not a widened path — a few
hours more than the batch allows, and the batch's "very low" risk should read "low".

Two factual corrections. The noun "Ground" appears **four times on three lines**, not three:
`how-it-works.astro:37`, `how-it-works.astro:79` **twice** (*"the complete history of the Ground"* and
*"The closed Ground stays on record"*), and `pricing.astro:207`. The plan's unsourced "and one more" is
short by one. And `index.astro:376` does not contain the string *"A check-in takes about ten minutes"* — it
reads *"Each takes about ten minutes"*; a guard written against the literal will miss it.

The median-duration half of the batch is sound, needs no marketing change, and the instruction *not* to put
a live figure on a build-time page is correct.

**Batch 11 — must be removed. See the marketing section.**

**Batch 12 — sound with one modification.** `/org/guide` public at `App.tsx:504`, linked only from
`OrgMembersPage.tsx:566`, and the page itself says *"Send this link to your team"* at
`LeadsGuidePage.tsx:38` — all verified. `coach.service.ts:99-119` writes the row and emits nothing (grep for
`emit(` in that file returns zero), while `users.service.ts:109` emits `CALL_ASKED` and
`the-team-is-told.service.ts:71` already handles it, with `COACHING` already a valid subject at
`the-team-is-told.ts:23-27`. The widen-don't-fork recommendation for `CallAskedEvent`
(`api/src/common/events.ts:105-111`, currently requiring `organizationId` and `askedByUserId`) is right.
The `about.astro` mailto half must be removed — see below.

**Batch 13 — sound with corrections.** `/entry/faq` (`:317-318`) and `/entry/classify-intent`
(`:311-312`) carry no `@Throttle` — TRUE; and `/entry/opener` (`:289-290`) is a **third** unthrottled
handler the plan misses. The global ceiling is confirmed at 60/60s (`app.module.ts:52`). `classify-intent`
has no DTO — `@Body() dto: { description: string; mode?: string }` at `:313`, a bare inline type, so
`ValidationPipe` has nothing to bind; the service's only bound is `description.slice(0, 400)` at
`entry.service.ts:505`, which truncates rather than refuses. `faq`'s 1000 cap is real (`EntryFaqDto`,
`:67-71`). Correction: there are **12** `@Public()` handlers on the controller, not five. That matters,
because the proposed spec *"iterate the controller's `@Public()` handlers and assert each has a `@Throttle`
and a DTO"* would fail on seven handlers the batch has not budgeted for. Widen the batch or narrow the spec.
Otherwise the enumerate-don't-list instinct is exactly right — it is the one spec in part F that would
actually catch the next regression.

**Batch 14 — sound.** All three findings verified. `PUBLISHED` at `transform.interceptor.ts:37`, no matching
exemption in `http-exception.filter.ts:90-98`, `code`/`errors` normalisation at `:36`, SSE at
`conversation.controller.ts:97-99` and `entry.controller.ts:236-238` (both then write `[DONE]`, so a failed
stream is indistinguishable from a clean one — worth adding). Idempotency: the plan says "two routes out of
seven"; it is **two out of thirty-seven** POST routes on `public-api.controller.ts` (keys read at `:177` and
`:208`; `POST /grounds` at `:467` has none). That undercount makes *"this is a decorator and a key
derivation per route"* a serious underestimate — thirty-five routes, each needing a key derivation decision.
**Effort is wrong by more than double: a day should be two to three.** The warning that sharing `PUBLISHED`
between interceptor and filter is the line to review carefully is correct and well placed.

**Batch 15 — sound.** `API_TERMS_VERSION` at `the-api-terms.ts:9`, stamped at `api-access.service.ts:40`,
returned at `:142`, displayed at `ApiAccessPage.tsx:83`, compared nowhere. Exact.

**Batch 16 — sound, and the numbers are exact.** 152 models, 42 `Ops*` (27.6%), 133 route decorators across
9 ops controllers. `/ops` routes in `App.tsx` count **30**, not 34 — the only number off, and it does not
change the judgement. Proposing no code and no spec is the right answer.

---

## The marketing site: what must be removed, and what is left standing uncorrected

Per the product owner, nothing in `marketing/` may change. **Six batches propose marketing edits** — five in
part F, and one the brief did not anticipate, in part G.

### F Batch 7 — the chasing claim
**Must be removed:** the edit to `how-it-works.astro:58`.
**What remains:** the whole product half, and it stands cleanly on its own. Halves 1 and 2 — the cadence
sweep that advances a round on the clock, and telling the lead who missed one — are independent of the copy
and were always the real work. The plan's own recommendation was *"change the sentence now, build the sweep,
change it back"*; with the copy frozen, that becomes simply "build the sweep", and the batch's sequencing
gets simpler, not harder. The spec `a-quiet-person-still-gets-their-next-check-in.spec.ts` is unaffected.
Effort unchanged (more than a day); risk unchanged (medium-high, a write loop over live grounds).
**Claim left standing:** *"Groundwork runs regular check-ins and prompts people automatically when it is
their turn, so you are not left chasing anyone."* Untrue today — `conversation.service.ts:3308-3345` creates
the next session **only** on completion of the current one, so a person who never opens session one never
receives session two, and nothing tells the lead. **To make it true the product must ship half 1** (a cron
that advances each active ground past its cadence interval for every participant regardless of completion,
with a missed state) **and half 2** (the missed count on the board and in the report). Until half 1 ships,
this is the most consequential uncorrected claim on the site, because it describes the cadence the product
is sold on.

### F Batch 8 — the fallback wording for divergence
**Must be removed:** the conditional edit to `how-it-works.astro:72`.
**What remains:** everything. The marketing edit was explicitly the *fallback* if the divergence section
could not ship. With the copy frozen the fallback is unavailable, which simply makes the divergence section
mandatory rather than optional. The `keyDecisions` / `whatWasLearned` half is untouched.
**Claim left standing:** *"where expectations differ"* at `:72`, delivered as a count tile rather than a
section. As noted above, the sentence lists report *contents*, not sections, so this is the weakest of the
uncorrected claims — but the batch must now render the rows behind the count to close it.
**Also left standing, and stronger:** `how-it-works.astro:79` promises *"the key decisions"* and *"what was
learned"* in the closing report. Both fields are absent from the codebase entirely. This claim is
uncorrectable by copy and can only be closed by shipping the two synthesis producers — which is the batch's
main body, so nothing is lost.

### F Batch 9 — the homepage example rebuild
**Must be removed:** the conditional rebuild of `index.astro`'s fourth example tab.
**What remains:** the classifier fix, which is the whole batch worth having. And per item 3, **removing the
marketing change costs nothing at all**: the homepage example is a new-hire situation, `NEW_HIRE` maps to
`ONBOARDING` (`board-families.ts:78`), and `ONBOARDING` already renders `quickRead` (`:200`). Fix the
classifier and the example becomes accurate with no marketing edit and no board edit.
**Claims left standing: none.** This is the one batch where the constraint costs nothing.

### F Batch 10 — "Ground" as a noun
**Must be removed:** the edits to `how-it-works.astro:37`, `how-it-works.astro:79` (×2) and
`pricing.astro:207`.
**What remains:** the two better halves. The median-duration measurement on the ops product-numbers surface
is untouched. The guard restructure is untouched and becomes *more* valuable, not less — a guard that
cannot be satisfied by editing copy is still the thing that stops the next false sentence shipping. But
note the second-order effect: **with the copy frozen, adding "Ground" to the banned list makes the guard
fail on day one.** The banned-noun addition must be deferred, or shipped with an explicit allowlist naming
those four occurrences as known-and-accepted. Say which.
**Claims left standing:** four uses of a noun the product abandoned — `how-it-works.astro:37`
(*"the rest of the Ground is measured against"*), `:79` (*"the complete history of the Ground"*, *"The
closed Ground stays on record"*), `pricing.astro:207` (*"run Grounds on the free plan"*). **The product
cannot make these true**; there is no object called a Ground in the UI any more. This is pure vocabulary
drift and the only remedy is the copy edit that is forbidden. Flag it to the owner as a standing exception
rather than pretending a build closes it.
**Also standing:** *"A check-in takes about ten minutes"* (`how-it-works.astro:58`) and *"Each takes about
ten minutes"* (`index.astro:376`). The measurement half of the batch is precisely what makes these
defensible — **build the median and the claim is either substantiated or shown to be wrong.** If the median
comes back materially off ten minutes, the plan's remedy was to change all three strings; with two of the
three frozen, only `GroundChat.tsx:620` can move, and the owner must be told the site now disagrees with the
product. This is a decision to surface, not a defect to fix.

### F Batch 11 — advertising WhatsApp, the panel and the API
**Must be removed: the entire batch.** Every one of its four actions is a marketing edit — two lines added
to `how-it-works.astro`, a clause in `pricing.astro`, and an `href` from the pricing services block.
**What remains: nothing.** This is the only batch in the three documents that does not survive the
constraint in any form. There is no product-side half; the capabilities already exist and work, and the
batch was purely about saying so.

> *Verify: advertising WhatsApp must land after the whole of part D.*

**The dependency was correct, and it is now moot.** It was also stated slightly wrong: the plan says
*"Sequence this batch after Part D, or the site will be advertising a channel that answers with silence."*
The precise blocker is Part D **Batch 1** (silence), **Batch 2** (one handler) and **Batch 3** (Meta
templates, which is itself blocked on Meta's approval queue, not on us). Part D Batch 20, which the plan
names, is about email deliverability and gates nothing here. So the real sequencing was "after D1–D3 and
after Meta approves the templates" — a longer pole than the plan drew. Either way, removing the batch
removes the dependency.
**Claims left standing: none — the reverse.** This finding was that the product does *more* than the site
says. Removing the batch leaves no false claim; it leaves revenue on the table. Note it for the owner as a
commercial decision, not an accuracy one: the words WhatsApp, panel and API appear **zero, zero and once**
across all five marketing pages (the single "API" is *"protected API infrastructure"* on
`privacy-and-ai.astro:63`, which is about processors, not the product), and nothing on the site links to the
in-app Connect page.

### F Batch 12 — the About page mailto
**Must be removed:** the edit to `about.astro:141`.
**What remains:** the other two thirds, both intact and both the larger part of the batch — the copy-link
control on `LeadsGuidePage.tsx`, the second non-admin link to `/org/guide`, and the `CALL_ASKED` emit from
`coach.service.ts`. Only the third spec, `the-site-has-no-mailto-anywhere.spec.ts`, must be dropped or
inverted, since it would fail immediately against the frozen page.
**Claim left standing:** `about.astro:141` remains `mailto:hello@myground.work`. This is not a false claim —
it is a dead end, and the pricing page's own source comment at `:179` records that this exact pattern was
removed there because *"it does nothing at all for anybody without a configured mail client"*. **The product
cannot make a mailto work.** The only remedies are the forbidden href change or making the address itself
reliably monitored. Surface it to the owner: the About page's single contact route is the pattern the team
already decided was broken, and the fix exists one page over.

### G2 — the processor list (the brief did not flag this one)
**Must be removed:** the wording change. The privacy page is `marketing/src/pages/privacy-and-ai.astro`, a
marketing page. G2's *"Name the provider we use"* is a marketing edit and is forbidden.
**What remains:** see the G2 entry below — the spec, and it needs rethinking.
**Claim left standing:** `privacy-and-ai.astro:63` — *"Groundwork may use leading AI providers to process
information, including models from OpenAI, Anthropic (Claude), Google (Gemini), and others."* Two of the
three named processors are never called. **The product cannot make this true and should not try** — building
OpenAI and Anthropic integrations to justify a privacy page would be absurd. The sentence hedges with "may",
so it is not false; it puts two extra processors in front of every security review. This is a standing
exception for the owner, and the same is true of G3's *"Groundwork staff can't read it"*
(`privacy-and-ai.astro:46`).

### Summary of what now stands uncorrected

| Claim | Where | Can the product make it true? |
|---|---|---|
| *"prompts people automatically… you are not left chasing anyone"* | `how-it-works.astro:58` | **Yes** — F7's cadence sweep + missed state. The important one. |
| *"the key decisions"*, *"what was learned"* in the closing report | `how-it-works.astro:79` | **Yes** — F8's two synthesis producers. |
| *"where expectations differ"* as report content | `how-it-works.astro:72` | **Yes** — F8's divergence section. |
| *"about ten minutes"* | `how-it-works.astro:58`, `index.astro:376` | **Measurable** — F10's median decides it. |
| *"the Ground"* / *"Grounds"* ×4 | `how-it-works.astro:37,79`; `pricing.astro:207` | **No.** Vocabulary drift; copy-only remedy. |
| `mailto:hello@myground.work` | `about.astro:141` | **No.** Dead end; copy-only remedy. |
| *"OpenAI, Anthropic (Claude), Google (Gemini)"* | `privacy-and-ai.astro:63` | **No, and should not.** Standing exception. |
| *"Groundwork staff can't read it"* | `privacy-and-ai.astro:46` | **Yes, at a price** — G3's encryption control. |
| WhatsApp / panel / API absent entirely | all five pages | N/A — understatement, not a false claim. |

---

## Part G — batch by batch

**G1 — unsound.** See item 1.

**G2 — the spec is implementable; the wording change is forbidden. Sound with corrections.**

> *Verify: G2 proposes a spec that reads the configured model and fails if the privacy page names a
> provider the code does not call. Verify this is implementable as described and say how.*

**Implementable, and the repository already contains the pattern twice.** Here is how, and here is what the
plan's description gets wrong.

The model identifiers are config values, not constants: `api/src/config/configuration.ts:131`
(`GEMINI_MODEL`, default `gemini-2.5-pro`) and `:135` (`GEMINI_CONVERSATION_MODEL`, default
`gemini-2.5-flash`), read into `AnthropicService` at `anthropic.service.ts:165-166` and exposed through
`modelsInUse()` at `:253`. **There are two models, not one** — the plan's *"reads the configured model"*
singular is already wrong, and a spec that reads one would pass while the other pointed at a different
provider.

The precedents: `the-site-does-not-promise-more-than-this.spec.ts:29-30` shows an api-side spec reading an
`.astro` file off disk and asserting against behaviour; and
`api/src/modules/conversation/a-preview-model-has-no-data-terms.ts:27` already maintains an allowlist
(`MODELS_WE_HAVE_TERMS_FOR = ['gemini-2.5-pro','gemini-2.5-flash','gemini-2.0-flash']`) enforced at
`anthropic.service.ts:168`. The spec should read the same source of truth rather than a fourth list.

The shape that works:

1. Derive the provider set from config, not from a hardcoded name: map each of `gemini.model` and
   `gemini.conversationModel` through a prefix table (`gemini-*` → Google) to a set of provider names.
   Fail the test if any configured model maps to nothing — that catches a provider swap, which is the
   drift the spec exists to catch.
2. Read `marketing/src/pages/privacy-and-ai.astro`, strip HTML comments the way the existing guard does at
   `:32-34`.
3. Assert the named-provider set is a subset of the called-provider set.

**Where the plan's description breaks.** Step 3 as written would fail on a sentence that is legitimate.
`privacy-and-ai.astro:71` reads *"That learning stays within Groundwork and is not contributed to OpenAI,
Claude, Gemini, or other public AI models for training."* That is a **negative** claim, and naming a
provider you do not send data to is the whole point of it. A spec that scans the page for provider names
will fail on the one sentence that should never change. The spec must scope to the processor paragraph —
match within `:63`'s sentence, or better, put a `data-processors` attribute on that element and read only
its contents. **Say this, or the spec is written once, fails on a true sentence, and gets deleted.**

Second problem: with the marketing page frozen, **the spec fails the moment it is written.** It has to land
either as a documented skip with the owner's exception recorded, or inverted — asserting that the page's
list is a *superset* of what is called, which is the property that actually holds today and still catches
the dangerous drift (calling a provider the page does not name).

Corrections: the processor list lives in exactly one source file and its build output; there is no
client-side privacy page and no mention in `docs/api-terms.md` or `the-api-terms.ts`. Effort: an hour for
wording is now zero; half a day for the spec is right if scoped as above.

**G3 — sound, with the wording half removed.** I confirmed the claim holds at the level of screens and more
strongly than the plan says: `api/src/modules/admin/admin.service.ts:418` carries an explicit exclusion list
— *"Hard privacy boundary (deliberately excluded, do not add back): ConversationTurn content… RecordEntry
content… LeadContextNote text…"* — and a grep for `ConversationTurn` across `api/src/modules/ops`, `admin`
and `back-office` returns only that comment. So the proposed spec
`no-staff-surface-shows-a-persons-words.spec.ts` would pass on day one and is worth having as a ratchet.
The narrow-the-wording option is forbidden, which leaves only the build option or a recorded exception.
**Effort:** the "hour" is gone; it is either the spec (half a day) or the encryption control (a week).

**G4 — sound, and it understates the problem by an order of magnitude.** The plan names two things: email
addresses on notification failure, and one context-chat line. Both verified — `email.service.ts:251`
(*"Failed to send email to ${options.to}"*) plus seven sibling sites at `:205, :218, :243, :254, :537,
:556`, and `grounds.service.ts:1918` logging `shortened.join(', ')`, which is individual words the lead
typed.

**Four larger leaks the plan misses, all logging substantial verbatim content:**
- `conversation.service.ts:3760` — logs `entries[b.line].text` **in full** (a person's own record entry)
  plus 200 characters of a document passage.
- `conversation.service.ts:3774` — the same, plus 200 characters of `d.says`.
- `conversation.service.ts:3720` — 120 characters of what the person said about a document.
- `documents.service.ts:421` — 120 characters of `doc.uploaderNote`.
- `whatsapp.service.ts:226` logs the destination phone number.

And `email.service.ts:220`/`:226` log the whole dev email body **including magic-link tokens** — a
credential in a log line, which outranks everything else in this batch.

The plan's own G1 reasoning depends on G4 being complete: *"do not spread copies of a person's words into
places a sweep would later have to chase: today that means the log lines in G4 and nothing else."* That
sentence is false as written — there are at least five more sites, and they carry more text than the two
named. **"Half a day across all sites" is wrong by roughly double once the real inventory is used.** Call
it a day, and make the spec `no-log-line-carries-what-somebody-wrote.spec.ts` enumerate logger calls and
assert against interpolation of known content fields, rather than listing the sites it knows about — a
listed spec would not have caught these five and will not catch the sixth.

**G5 — sound, and cheaper than the plan thinks.** The guard already exists and already does the thing the
plan proposes: `client/src/components/gw/account-is-not-the-word.spec.ts:15` states *"WHAT IS BANNED IS THE
SENSE, NOT THE STRING"*, maintains a `THE_WRONG_SENSE` phrase list of about forty entries, and already
asserts the login sense **survives** by reading `AuthPage.tsx` and `PricingPage.tsx` at `:141-149`.

The plan has the polarity backwards. It says: *"Keep the telling. Remove the login sense everywhere."* The
existing guard bans the **telling** sense and protects the **login** sense — which is the standing rule in
the user's own memory (*"banned word in user-facing copy; say what each person said"*). Executing G5 as
written would invert a shipped spec and put the product in breach of a standing instruction.

The correct reading is that the plan and the rule agree on the substance — the word should mean one thing —
and disagree on **which** one survives. That is a decision for the owner, not an engineering change, and it
must be settled before any copy pass. Note also that the product's own settings copy currently uses the
telling sense in a sentence written with care (`SettingsPage.tsx:452`: *"the other people on them have their
own account of the same events"*), and `pricing.astro:207` uses the login sense — on a frozen page.
**Verdict: sound as a topic, unsound as written. Escalate the polarity.** Extending the guard is then a
matter of adding phrases and files, which is hours, not half a day.

**G6 — sound, and the effort is wrong.** Confirmed: `api/src/modules/conversation/anthropic.service.ts`
declares `class AnthropicService` and imports `GoogleGenAI` at `:3`, instantiating Vertex at `:191-192`.
But the blast radius is larger than "mechanical": **13 files import the class**, there are 23 references to
the module path, there is a barrel re-export at `conversation/index.ts:3`, a dynamic import at
`main.ts:180`, a spec file named after it, and `api/package.json:34` carries `"anthropic"` as an npm
keyword. Renaming a Nest provider class also changes its DI token, so every `constructor(private readonly
anthropic: AnthropicService)` and every test module override moves together. It is still low-risk and still
worth doing, but **an hour is wrong by more than double; it is half a day**, and it should be a single
commit with no other change in it.

---

## Verdicts

**Part D**

| Batch | Verdict |
|---|---|
| Decision 1 | sound with corrections (line drift; deletion caveats missing; merge is a day and a half) |
| Decision 2 | sound |
| 1 | sound |
| 2 | sound |
| 3 | sound |
| 4 | sound with corrections (contradicts Part A Batch 5's design for the same defect) |
| 5 | sound with corrections (`:159-160`, `:81`/`:92`; add the `enabled` gate) |
| 6 | sound |
| 7 | sound with corrections (**P4-E08 is a misread — the panel already scopes to its own person**; two items, not three) |
| 8 | sound with corrections (`handleRequest` needs the `context` argument; **the Google OAuth callback at `auth.controller.ts:200` does depend on `req.user` being the passport profile**) |
| 9 | sound |
| 10 | sound with corrections (also delete the client-side `joinToken` parameter) |
| 11 | sound |
| 12 | sound with corrections (**the banned word is on 25 lines with both senses interleaved — blocked on G5's polarity**; `escapeHtml` at `:1109`, one precedent not two) |
| 13 | sound |
| 14 | sound |
| 15 | sound |
| 16 | sound with corrections (`specificThing`, not `groundLabel`) |
| 17 | sound |
| 18 | sound |
| 19 | sound with corrections (five findings double-counted with Part A) |
| 20 | sound |

**Part F**

| Batch | Verdict |
|---|---|
| 1 | sound |
| 2 | sound with corrections (`CANCELLED` does not exist; needs a migration; a day and a half) |
| 3 | sound with corrections (duplicates Part A Batch 7; dependency incomplete) |
| 4 | sound with corrections (contradicts a written decision at `entry.service.ts:1649`; duplicates Part A Batch 5) |
| 5 | sound with corrections (**collapses to nothing once Part D Batch 2 lands** — merge or drop) |
| 6 | sound with corrections (`RequireOrgSetup` wraps 11 routes and doubles as an auth guard; a day) |
| 7 | sound with corrections (**marketing edit must be removed**; product half stands unchanged) |
| 8 | sound with corrections (**marketing fallback must be removed**; the gap is larger than stated) |
| 9 | **unsound as written** — the board half overrides a written decision at `board-families.ts:196-198` and the marketing edit must be removed; the classifier half alone closes the finding |
| 10 | sound with corrections (**marketing edits must be removed**; the guard extension needs a restructure, not a widened path; four occurrences not three) |
| 11 | **unsound under the constraint — remove the batch entirely.** Nothing survives; no false claim is left behind |
| 12 | sound with corrections (**the `about.astro` edit must be removed**; two thirds stand) |
| 13 | sound with corrections (12 public handlers not 5; a third unthrottled route at `:289`) |
| 14 | sound with corrections (**effort wrong by more than double** — 35 routes need keys, not 5) |
| 15 | sound |
| 16 | sound |

**Part G**

| Batch | Verdict |
|---|---|
| 1 | **unsound.** The deletion path, the retention column, the sweep and the audit row all ship today. Rewrite as a reconciliation, sequence after Part A Batch 16, and resolve the no-sweep contradiction |
| 2 | sound with corrections (**wording change must be removed** — the privacy page is a marketing page; the spec must read *two* models and scope to the processor paragraph, or it fails on a true sentence) |
| 3 | sound with corrections (the claim holds more strongly than stated; the narrow-wording option is unavailable) |
| 4 | sound with corrections (**five larger leak sites missed, including magic-link tokens in dev logs**; effort roughly double; and G1's reliance on this list being complete is misplaced) |
| 5 | **unsound as written** — the shipped guard bans the opposite sense to the one the plan proposes to ban, and the plan's polarity contradicts the standing instruction. Escalate before any copy pass |
| 6 | sound with corrections (13 importers, a barrel, a dynamic import and a DI token; half a day, not an hour) |

---

## Dependencies, corrected

Both dependencies I was asked to verify are **real but mis-stated**.

1. *"Part F's twelve-character-discard fix must land after part D's handler merge."* True, and stronger than
   claimed: Part D Batch 2 already removes the same guard at the same line (`P4-F07`,
   `whatsapp-for-an-organisation.service.ts:136`). F Batch 5 is a duplicate, not a successor. Merge it into
   D Batch 2.
2. *"Advertising WhatsApp must land after the whole of part D."* True in spirit, wrong in detail: the
   blockers are D Batches 1, 2 and 3 plus Meta's template-approval queue, not D Batch 20 (which is about
   email). Moot, since the batch must be removed.

Dependencies the plans **do not** declare and should:

- F Batch 3 → Part A Batch 7 (both build the refund path; incompatible).
- F Batch 4 → Part A Batch 5 (both move the `CHECK_IN_COMPLETED` emit).
- D Batch 4 → Part A Batch 5 (both add WhatsApp inbound idempotency, different schemas).
- G1 → Part A Batch 16 (A16 repairs the sweep G1 believes does not exist; G1's "no sweep" contradicts it).
- G4 → G1 (G1 asserts G4's inventory is complete; it is not).
- F Batch 10's banned-noun addition → blocked indefinitely by the marketing freeze; ship the guard
  restructure without it, or with a named allowlist.

- D Batch 12 (NL-018) → G5. The copy pass cannot run until the polarity of the "account" rule is settled;
  running it against the plan's current wording would rewrite the report vocabulary.

Dependencies correctly declared, and worth saying so: D Batch 6's deferral of the ordering fix to NL-014 /
P4-002 with an explicit "this batch must not write a second, competing fix"; D Batch 14's insistence that
NL-020 precede NL-003; F Batch 10's note that the widened guard must follow Part A Batch 3.

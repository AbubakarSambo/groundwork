# Pass 4 & Pass 5 — Groundwork product audit

Scope: four flows (anonymous entry, session completion, closing a check-in, billing)
and six screens. Read-only. Every finding cites a file and line range.

## Pass 4

### Flows walked

a) Anonymous entry at `/start` -> saved record -> invitations
b) A session completing for everyone -> synthesis -> release -> the board
c) Closing a check-in -> begin closing session -> final session -> resolution -> ground ends
d) Billing -> starting a metered session -> running out -> free extension -> subscribing

### Can money, credits, quota or messages be consumed without the user receiving the result?

| Flow | Answer |
| --- | --- |
| a) Anonymous entry | **Yes** — the round can be released and the ground flipped ACTIVE before the contributors exist (P4-004), so the lead's one session produces a "shared" report of one person. No money moves. |
| b) Session completing | **Yes** — the session is already consumed and marked COMPLETED when synthesis/release throws; the listener swallows it and no retry exists (P4-006). |
| c) Closing a check-in | **Yes** — the closing session is an ordinary metered session, so a paid ground at zero balance cannot run the session that produces the final report (P4-005), and resolution can close the ground under people still holding an unstarted final session (P4-007). |
| d) Billing | **Yes** — a session credit is decremented before the model is called and a thrown call leaves the retry free to decrement again (P4-002); and one org can spend its free extension into another org's ground (P4-001). |

---

ID: P4-001
Severity: Blocker
Axis: Security
Location: api/src/modules/billing/billing.service.ts:393-424 with api/src/modules/billing/billing.controller.ts:61-70
Observed: `claimFreeExtension(organizationId, groundId)` checks only that the caller's own organisation has not already used its free extension (`org.freeExtensionUsed`, :398-400). The `groundId` comes straight off the request body (`@Body() body: { groundId: string }`, controller :67-69) and is used unfiltered in `prisma.ground.update({ where: { id: groundId }, data: { sessionsBalance: { increment: 1 } } })` (:406). There is no `findFirst({ where: { id: groundId, organizationId } })` anywhere on the path. The neighbouring `purchaseSession` does exactly that check at :214-216 and throws `NotFoundException('Check-in not found')`, with a comment explaining that the endpoint had been left unguarded once before.
Expected: A grant paid for out of *this* organisation's one-time allowance lands on a ground *this* organisation owns — the same rule `purchaseSession` enforces one method above.
Impact: Any authenticated ADMIN can post an arbitrary ground id and add a paid session to a stranger's organisation's ground, and burn their own org's one free extension doing it. The `BillingEvent` row written at :407-420 records the *caller's* organizationId against a ground belonging to somebody else, so the billing ledger is also wrong. Cross-tenant write.
Evidence: billing.service.ts:395 `async claimFreeExtension(organizationId: string, groundId: string)`; :406 `this.prisma.ground.update({ where: { id: groundId }, ... })`; contrast :214 `const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } })`.
Confidence: High

---

ID: P4-002
Severity: Blocker
Axis: Data integrity
Location: api/src/modules/conversation/conversation.service.ts:570-660 and :731-741
Observed: `open()` decides whether to charge by asking whether *any other* participant's check-in in this ground and session already has an AI turn (`roundAlreadyStarted`, :572-583). If not, it runs the gate and then atomically decrements the ground's `sessionsBalance` (:632-639). The model is not called until :731-741 (`this.anthropic.respond(...)`), and the AI turn — the only thing that makes `roundAlreadyStarted` true next time — is not written until :744-751. Nothing wraps the decrement and the model call in a transaction, and there is no compensating increment on failure.
Expected: A session credit is spent when the person gets a session. If the model call fails and they see an error and press the button again, the same session is not charged twice.
Impact: Every model timeout, rate-limit or 5xx during the opener burns a session credit and leaves nothing behind — no AI turn, so the retry takes the same branch and decrements again. On a metered ground a person can walk a ten-session balance to zero over a bad afternoon without ever having a conversation. Also note the query is scoped `id: { not: checkIn.id }` (:577), so the *same* participant's own earlier failed attempt never counts as "round already started".
Evidence: :572-583 the guard; :632-639 `updateMany({ where: { id, sessionsBalance: { gt: 0 } }, data: { sessionsBalance: { decrement: 1 } } })`; :731 `await this.anthropic.respond(fullSystem, ...)`; :744 the `conversationTurn.create` that would have made the retry free.
Confidence: High

---

ID: P4-003
Severity: Blocker
Axis: Bug
Location: api/src/modules/whatsapp/whatsapp.controller.ts:99-110
Observed: An inbound WhatsApp text is routed to the sender's next open check-in. If that check-in is `NOT_STARTED`, the controller calls `this.conversation.open(openCheckIn.id, user.id)` and **never passes `text`** (:101-104); the message the person typed is dropped on the floor. Only an `IN_PROGRESS` check-in gets `sendMessage(..., text)`. The whole block sits inside a `try` whose `catch` logs and returns `{ received: true }` (:106-109) — so if `open()` throws (including the `ForbiddenException` the billing gate raises at conversation.service.ts:618, or any model failure), `this.whatsapp.sendMessage(fromNumber, result.reply)` at :105 never runs and the person on WhatsApp receives absolutely nothing back.
Expected: What I typed is my answer. And when something goes wrong, the channel I wrote into tells me so — silence on WhatsApp is indistinguishable from the product being dead.
Impact: A WhatsApp participant's first substantive message of every session is silently discarded and answered with a generic opener; and any failure downstream — including the paywall refusal, which is precisely the moment somebody needs to be told something — produces total silence. Compounds P4-002: `open()` can decrement the balance and then throw, and the person is never told the credit went.
Evidence: :100-104 the `NOT_STARTED ? open(...) : sendMessage(..., text)` ternary with `text` absent from the first arm; :105 the only reply path; :106-108 `catch (err: any) { this.logger.error(...) }` with no user-facing send.
Confidence: High

---

ID: P4-004
Severity: Major
Axis: Data integrity
Location: api/src/modules/entry/entry.service.ts:1654-1660 with :1662-1706, and api/src/modules/reports/reports.listener.ts:34-91
Observed: The anonymous entry commit emits `CHECK_IN_COMPLETED` (:1654-1660) **before** the loop that adds and invites the contributors (:1665-1706). The listener's handler is async and not awaited by the emitter; it calls `grounds.isSessionReadyForReport(groundId, sessionNumber)` (reports.listener.ts:79) and, if everybody is through, calls `reports.release(...)` and sets the ground `ACTIVE` (:84-90). At the moment the event fires the only participant in the database is the lead, who is already COMPLETED. The code directly below has a long comment describing this exact class of bug being fixed for `recordRoundCompletion` — which *was* moved after the loop (:1723) — but the emit itself was left where it was.
Expected: A shared report is released once the people it is shared with have actually checked in. The comment at :1644-1650 states the intent: "People still holding an unopened invitation keep the round open, so this cannot release early."
Impact: A race between the listener and the invite loop. When the listener wins, a one-person "shared" report is released and the ground is marked ACTIVE, and the contributors who arrive a moment later join a ground whose round is already published. The header/body contradiction the comment at :1707-1721 describes is the visible symptom in the other direction.
Evidence: entry.service.ts:1654 `this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {...})`; :1665 `for (const c of dto.contributors)`; reports.listener.ts:79-90.
Confidence: Medium
Check needed: Whether `isSessionReadyForReport` counts `Ground.participants` rows or an expected-party count set at creation. If the ground row carries an expected party count written at commit before the emit, the race cannot fire. Read `grounds.service.ts` `isSessionReadyForReport`.

---

ID: P4-005
Severity: Major
Axis: User value
Location: api/src/modules/grounds/grounds.service.ts:2943-2972 with api/src/modules/conversation/conversation.service.ts:586-641
Observed: `beginClosingSession` flags each participant's open check-in as `isFinal`, or **creates a new one** at `sessionNumber + 1` where none is open (:2960-2968). That new session is an ordinary session: when the first participant opens it, `open()` runs `canStartSession` and decrements `sessionsBalance` like any other (conversation.service.ts:588-639). Nothing in `beginClosingSession` checks the balance, and nothing exempts a final session from metering.
Expected: Ending something you have already paid for is not a further purchase. The lead who presses "begin closing session" is told at the moment of pressing whether it can actually run.
Impact: On a metered ground at zero balance, the lead can start a closing session that nobody can open. The final session is the one that makes the final report read the whole arc (see the doc comment at :2939-2942), so the deliverable the ground existed to produce is unreachable behind a paywall the lead met only after committing to close. The refusal arrives to the participant mid-flow, not to the lead at the button.
Evidence: grounds.service.ts:2951-2958 the only guards (ownership, `hasEnded`) — no billing check; :2966-2968 the create; conversation.service.ts:632-639 the decrement that applies to it.
Confidence: High

---

ID: P4-006
Severity: Major
Axis: User value
Location: api/src/modules/reports/reports.listener.ts:49-91
Observed: The whole synthesis-and-release path runs inside one `try` whose `catch` only logs (`this.logger.error('Report handling on checkin.completed failed ...')`, :88-90). By the time the event is emitted the check-in is already `COMPLETED` and the session credit is already spent (conversation.service.ts:3196-3206). There is no retry, no queue, no flag on the ground, and no email telling anybody the report did not come. `onGroundActivated` has the identical shape at :113-124.
Expected: If the report cannot be produced, someone is told, and the system tries again — a completed, charged session that produces no report should not be indistinguishable from one that worked.
Impact: Everybody in the ground has finished their session, their credit is gone, and the Report tab simply never fills. The failure exists only in a server log. This is the flow-level version of the "a closing synthesis that never landed" case the repo already names in reports/a-closing-synthesis-that-never-landed.spec.ts.
Evidence: reports.listener.ts:63 `await this.reports.synthesize(...)`; :84 `await this.reports.release(...)`; :88-90 the swallow; conversation.service.ts:3196-3206 the completion write that precedes it.
Confidence: High

---

ID: P4-007
Severity: Major
Axis: Inconsistency
Location: api/src/modules/resolution/resolution.service.ts:263-312 with api/src/modules/grounds/grounds.service.ts:2960-2968
Observed: `finalize` sets the ground `CLOSED` in a transaction (:265-271) as soon as every *active* party has confirmed the same end state. It does not look at outstanding check-ins. `beginClosingSession` may have created `NOT_STARTED` final sessions for every participant (grounds.service.ts:2966-2968), and those rows are untouched by the close. Meanwhile `conversation.service.ts:588-641` will still meter and open them, and the reports listener explicitly handles a report landing on an already-ended ground (`hasEnded`, reports.listener.ts:82-88).
Expected: When the ground ends, the sessions it was waiting on end with it — nobody is invited to complete a check-in for something already closed, and no credit is spent on one.
Impact: A participant who had not yet opened their final session is left holding a live check-in link into a closed ground; opening it spends a session credit on a conversation whose conclusion has already been decided without them. The close email (:297-309) goes out at the same time, so they receive "this has ended" and a live check-in simultaneously.
Evidence: resolution.service.ts:265-271 the close transaction, with no `checkIn.updateMany`; grounds.service.ts:2966-2968; reports.listener.ts:82-84 the comment confirming reports do land on ended grounds.
Confidence: Medium
Check needed: Whether a cron or a guard on `open()` refuses a check-in whose ground has ended. Grep `hasEnded` across conversation.service.ts and the check-in open guard at :510-520.

---

ID: P4-008
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/billing/billing.service.ts:204-240 with client/src/api/billing.ts:221 and client/src/components/PostSessionPanel.tsx:29
Observed: The client has deliberately removed the buy-a-session tier — `purchaseSession` is gone from `client/src/api/billing.ts` (a comment at :221 says so) and `PostSessionPanel.tsx:29` records "purchaseSessionMut removed with the buy-a-session tier." The server still exposes `purchaseSession` and will still create a live $5-per-session Stripe checkout (billing.service.ts:204-240).
Expected: A pricing tier the product has withdrawn cannot still be charged for.
Impact: A live payment path with no UI and therefore no UI-level pricing copy governing it. Anyone with a stale link or a direct call can be charged $5/session under a model the product no longer sells. Low reach today (no paying subscribers), but it is a charge endpoint outside the priced surface.
Evidence: billing.service.ts:224-238 `unit_amount: 500` checkout creation; client/src/api/billing.ts:221; client/src/components/PostSessionPanel.tsx:29.
Confidence: High

---

ID: P4-009
Severity: Note
Axis: Experience
Location: api/src/modules/conversation/conversation.service.ts:588-620
Observed: When the gate refuses, the code fires two best-effort emails — a nudge to the ground's initiator (:591-607) and `tellAnAdminToAddACard` (:617) — both with `.catch(() => undefined)`, and then throws a `ForbiddenException` carrying `gate.reason` to the person who was blocked.
Expected: (as built) — this is the good half of the flow, recorded for contrast with P4-005.
Impact: The person blocked is told; the payer is told. But nothing here is retried or recorded, so if both emails fail the refusal exists only as an exception in one person's browser. On WhatsApp it is not even that (P4-003).
Evidence: :591-607, :617, :618.
Confidence: High

---

## Pass 5

Six screens: the anonymous entry chat (`client/src/pages/enter/EntryChatPage.tsx`),
the check-in chat (`client/src/pages/chat/ChatPage.tsx`), the check-in page
(`client/src/pages/grounds/GroundParticipantPage.tsx`, routed by `GroundPage.tsx`),
the board (`client/src/pages/board/BoardPage.tsx`), the billing page
(`client/src/pages/billing/BillingPage.tsx`), and the sign-up form
(`client/src/pages/auth/AuthPage.tsx`).

### Summary of the six states

| Screen | Empty | Loading | Double-submit blocked | Error actionable | Success | Destructive confirmed |
| --- | --- | --- | --- | --- | --- | --- |
| Entry chat | yes (:2594, :2979-2993) | yes (:2709, :2864) | yes (`loading`/`onboardingLoading` on every send) | yes, restores the text | yes | n/a |
| Check-in chat | yes | yes, with `SlowStep` (:992-996) | yes (`loading`, `complete.isPending`) | yes, restores the text | yes | decline is a two-step panel (:1074-1082) |
| Check-in page | yes | yes (:246) | yes | mostly | yes | n/a |
| Board | yes, per section | yes (:126-128) | yes on every mutation | **no — see P5-002** | silent (invalidate only) | **no — see P5-001** |
| Billing | yes (:499) | yes (:282-286) | yes | **no — see P5-002** | toast / redirect | subscription yes (:432); see P5-003 |
| Sign-up | n/a | yes (:493) | yes (:493) | partial (known) | yes | n/a |

---

ID: P5-001
Severity: Major
Axis: Experience
Location: client/src/pages/board/BoardPage.tsx:104-108 and :487-492
Observed: The "x" button next to a target calls `removeObjective.mutate(o.id)` directly. It is disabled while pending and has `title="Remove this target"`, and nothing else. There is no `window.confirm`, no undo, and no second step. It sits immediately beside the "+" and "-" count buttons in the same `miniBtn` style (:477-492), differing only in colour.
Expected: A one-click permanent delete of a team target, sitting a few pixels from the two buttons you press routinely, asks first — the same page's own poll form has an explicit Cancel (:1046) and the billing page confirms a subscription cancel (:432).
Impact: A lead deletes an org objective by mis-clicking, with no confirmation and no way back. The error copy even says "Nothing has changed" (:107) — which is the *failure* message, so a successful accidental delete says nothing at all.
Evidence: :489 `onClick={() => removeObjective.mutate(o.id)}`; :490 `disabled={removeObjective.isPending}`; the adjacent `+`/`-` at :477-486.
Confidence: High

---

ID: P5-002
Severity: Minor
Axis: Experience
Location: client/src/pages/billing/BillingPage.tsx:178, :188, :194, :215-217, :226, :235, :244; client/src/pages/board/BoardPage.tsx:102, :123
Observed: Seven of the billing page's mutations and two of the board's fall back to "Try again." with no cause and no alternative: "Could not generate code. Try again.", "Could not start checkout. Try again.", "Could not cancel subscription. Try again.", "Could not open the billing portal. Try again in a moment.", "That count did not change — try again.". None of them distinguish a network failure from a 402, a 403 or a validation refusal, and none read `err?.response?.data?.message` the way `ChatPage.tsx:280` does.
Expected: An error message says what to do next. "Try again" at a checkout button that failed because the org has no card, or because a plan change was refused, sends the person round the same loop.
Impact: Anyone hitting a *persistent* server-side refusal on the billing page is told to retry an action that cannot succeed, with no route to support and no cause named. The entry service already learned this lesson for invites ("Resending will not fix a seat limit", entry.service.ts:1673-1680); the billing page has not.
Evidence: BillingPage.tsx:194 `onError: () => toast.error('Could not start checkout. Try again.')`; contrast ChatPage.tsx:280 `toast.error(err?.response?.data?.message ?? 'Could not open session.')`.
Confidence: High

---

ID: P5-003
Severity: Minor
Axis: Inconsistency
Location: client/src/pages/billing/BillingPage.tsx:428-440 with api/src/modules/billing/billing.controller.ts:54-59
Observed: `DELETE /billing/account` — "Cancel the account - marks org CANCELLED, sends data-portability notice" (controller :55-58) — has no caller in `client/src/pages/billing`. The billing page offers only "Cancel subscription" (:432-439), which is a different and much smaller thing. Cancelling the *subscription* is confirmed with `window.confirm`; cancelling the *account*, the genuinely irreversible one, has no surface on this page.
Expected: The most destructive billing action either has a confirmable button or does not exist. A live endpoint that cancels an organisation and has no UI is both a dead surface and an unguarded one.
Impact: An admin who wants to leave may not be able to, from the product; and the endpoint that would let them is reachable only by a direct call, where no confirmation exists.
Evidence: billing.controller.ts:54-59 `@Delete('account')`; BillingPage.tsx:428-440 the only cancel button on the page, which calls `cancelSubscriptionMut`.
Confidence: Unverified
Check needed: Grep `cancelAccount` across the whole of `client/src` including `pages/settings` and `pages/admin` — it may be surfaced outside `pages/billing`.

---

ID: P5-004
Severity: Minor
Axis: Experience
Location: client/src/pages/billing/BillingPage.tsx:282-286
Observed: The whole page is gated behind one combined spinner: `if (groundsLoading || codesLoading)` renders a bare `Loading...` (:285) for the entire route. The two queries (:114-125) are independent — the grounds list and the access-code list — and the plan/subscription block does not depend on either.
Expected: The part of the page that is ready shows. A person arriving to fix a payment problem sees the plan section immediately rather than waiting on an access-code list they did not ask for.
Impact: On a slow query the whole billing page — including the subscribe button, the thing somebody came to press — is a three-word placeholder. Neither query has an `error` branch on this screen, so a *failed* codes fetch renders no message at all.
Evidence: :282-286; the two `useQuery` calls at :114-125, neither destructuring `error`.
Confidence: Medium
Check needed: Confirm what the page renders when the codes endpoint returns 500 — `isLoading` is false on error, so it likely falls through to an empty codes section with no explanation. Render it with that endpoint failing.

---

ID: P5-005
Severity: Minor
Axis: Bug
Location: client/src/pages/auth/AuthPage.tsx:265-289 with :306-318
Observed: The sign-in and magic-link handlers validate the address before submitting (`if (!e2 || !e2.includes('@'))`, :307-308 and :315-316). The create-account mutation has no such guard and relies entirely on the server; its `onError` handles 5xx, 429 and 409 explicitly and then **falls through to `setLinkSent(true)`** for everything else (:288). A 400 on a malformed address therefore renders the "check your email" panel.
Expected: The three forms on one screen validate the same field the same way, and a rejected sign-up says it was rejected.
Impact: Somebody who mistypes their address is shown "we sent you a link", waits, and never gets one. (This is the mechanism behind the already-known malformed-email silence; recorded because :288 is the fixable line.)
Evidence: :288 `setLinkSent(true)` as the fall-through in `onError`; contrast :307 and :315 where the other two forms guard `includes('@')`.
Confidence: High

---

ID: P5-006
Severity: Minor
Axis: Security
Location: client/src/pages/auth/AuthPage.tsx:283-288 and :296-301
Observed: The password-reset form deliberately returns the same generic success on every outcome (`onError: () => setResetSent(true)`, :300) with a comment explaining that anything else would reveal whether an address is registered. Twenty lines above, the sign-up form does the opposite on purpose: a 409 says "That address already has an account. Sign in instead." (:286-288), justified by the comment at :283-285.
Expected: Both are individually defensible, but together they mean the sign-up form is a working registration oracle while the reset form is carefully not one.
Impact: Anyone can enumerate which addresses have Groundwork accounts via the sign-up form. Whether that matters is a product call; what is not defensible is paying the UX cost of the vague reset message while the same fact leaks from the form next to it.
Evidence: :286-288 the 409 branch; :296-301 the reset comment and `onError`.
Confidence: High

---

ID: P5-007
Severity: Note
Axis: Experience
Location: client/src/pages/board/BoardPage.tsx:74-80, :126-132, :557, :648, :669-676
Observed: The board handles all three states properly — `Loading the board...` (:127), a combined `error || !data` branch with back-links (:129-132, and the comment at :198-201 recording that the back-links were added), and per-section empty states that say where the content will come from rather than showing a bare heading ("Nothing cross-referenced yet. This fills in once more than one person has checked in.", :557; "Handoffs appear when somebody says in a check-in that they are waiting on another person.", :676). The comment at :169-174 records that empty headings over rules were the defect being fixed.
Expected: as built.
Impact: none — recorded as the standard the billing page (P5-004) and the objective delete (P5-001) fall short of.
Evidence: as cited.
Confidence: High

---

ID: P5-008
Severity: Note
Axis: Experience
Location: client/src/pages/chat/ChatPage.tsx:502-575, :949, :992-996, :1074-1082, :1280-1285
Observed: The check-in chat is the strongest of the six. Double submission is blocked by a `loading` flag set before the request and cleared in both branches (:502, :544, :571-573), plus `disabled={loading || completed || declined || !opened}` on the send button and every quick-action (:1193, :1283). Failures restore the text to the box and say so ("That did not send — your message is back in the box", :569; "The reply was cut off. What you sent is on the record — send again to carry on.", :574). Slow operations get a step-by-step `SlowStep` with an explicit reassurance (:992-996), and the mid-request state says "Still reading what you wrote. Nothing was lost" (:949). Declining is a two-step panel listing consequences before "Yes, I am not taking part" (:1074-1082). The entry chat (EntryChatPage.tsx:1503, :1580, :2939, :3120) follows the same discipline.
Expected: as built.
Impact: none.
Evidence: as cited.
Confidence: High

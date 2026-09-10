# Fix plan, part F — the promises, the dead ends, and the drift

The slice no other part claimed. Twenty-seven findings, sixteen batches, ordered by user harm,
then blast radius, then effort.

Most of these are not crashes. They are three shapes:

- **A dead end.** Something is offered, and pressing it cannot work.
- **A promise the data cannot keep.** A sentence on the site, in an email or on a screen that the
  code does not deliver. For each of these the plan says plainly whether to build the thing or
  change the sentence, and what that costs.
- **Drift.** The same problem solved three ways in adjacent handlers.

Three of my IDs sit on top of work already scoped elsewhere. Each says so and adds only the half
that other batch does not close:

| My ID | Depends on | What is left for me |
|---|---|---|
| P6-016 | Part A Batch 5 (restructures `open()`) | the refund path for a credit already burned, and the honest answer for balances burned before the fix |
| P6-015 | Part D Batches 1 and 2 (WhatsApp silence, one handler) | the per-organisation path's twelve-character discard |
| P6-003 / P6-004 | Part A Batch 7 covers P4-H04, the same screen | the second button, the false notification sentence, and the non-admin's actual route forward |

Constraints honoured throughout: the marketing site's **design is not touched**, only wording where
a claim is wrong. **No new pages.** No explanatory text added to a screen without a reason stated.
Where a capability is built with no way to switch it on, the batch names the smallest honest
interface and stops there.

---

## Batch 1 — A blocked participant is offered two buttons that cannot work, and told something false

**Closes:** P6-003, P6-004

The paywall overlay in `client/src/pages/grounds/GroundParticipantPage.tsx` is the worst screen in
the product to get wrong, because everyone who sees it is already stopped.

Verified: `POST /billing/free-extension` (`billing.controller.ts:63`) and `POST /billing/subscription`
(`:72`) both carry `@Roles(Role.ADMIN)`. The overlay renders "Continue for free" (`:788`) and
"Upgrade organisation" (`:808`) for anybody whose `partyType` is `INITIATOR`. An organisation with
`whoMayOpenCheckIns = EVERYONE` (`schema.prisma:478-484`) makes non-admins initiators routinely, so
this is not an edge case. The same file already applies the correct rule two blocks down: the
access-code field at `:833` is gated, with a comment recording that it "used to render for everyone,
sending plain participants hunting for a code they were never issued".

And at `:824-828` the non-initiator branch says: *"Your initiator has been notified. Once they add a
session, you will be able to check in."* Nothing notifies the initiator. That string is the only
occurrence of the concept in the repository; the notifications pass inventoried 48 senders and none
of them is this.

**Which is it.** The sentence at `:827` is a promise the product does not keep. **The product should
do what the claim says** — this one is cheap and it is the right half to build, because the person
who is blocked genuinely cannot proceed without the payer acting. There is already a sender for
exactly this: `conversation.service.ts:591-607` mails the ground's initiator when the gate refuses.
It fires on the server path; the client sentence is describing it and getting the audience wrong.

**The change.**

- `GroundParticipantPage.tsx:788` and `:808` — gate both buttons on `user.role === 'ADMIN'` **and**
  `partyType === 'INITIATOR'`, matching the server. Same condition, one const, used twice.
- For an initiator who is not an admin, the overlay's copy becomes the true fact and nothing more:
  *"Only an organisation admin can add sessions. We have told them you are waiting."* No new
  paragraph, no explainer — this replaces the two buttons that were there, so the screen gets
  shorter, not longer.
- Make that second sentence true. The nudge at `conversation.service.ts:591-607` currently goes to
  the ground's initiator. Extend its recipient set to the organisation's admins when the blocked
  person is not one, reusing the existing best-effort send. Nothing new is built.
- `:824-828`, the non-initiator branch — same sentence, same sender, now accurate.

**Spec:** `a-blocked-person-is-only-offered-what-they-can-press.spec.ts` (non-admin initiator at the
paywall sees no button and no 403); `the-person-we-said-we-told-is-actually-told.spec.ts` (gate
refusal for a non-admin mails an org admin).

**Effort:** half a day.

**Risk:** low. Two render conditions and one recipient list. The only thing to watch is that the
existing initiator nudge keeps firing for the admin-initiator case rather than being replaced.

---

## Batch 2 — Ending something you have already paid for is not a further purchase

**Closes:** P4-005, P4-007, P4-009

Three findings on the closing arc. `grounds.service.ts:2943-2972` `beginClosingSession` flags each
participant's open check-in `isFinal`, or **creates a new one** at `sessionNumber + 1` where none is
open (`:2960-2968`). Its only guards are ownership and `hasEnded` (`:2951-2958`). That new session is
an ordinary session: `conversation.service.ts:588-641` meters and decrements it like any other.

So on a metered ground at zero balance the lead presses "begin closing session", the button
succeeds, and every participant hits a 403 when they try to open it. The final session is the one
that makes the final report read the whole arc — the doc comment at `:2939-2942` says so. The
deliverable the ground existed to produce sits behind a paywall the lead met only after committing
to close, and the refusal is delivered to a participant mid-flow rather than to the lead at the
button.

Separately, `resolution.service.ts:263-312` `finalize` sets the ground `CLOSED` in a transaction
(`:265-271`) as soon as every active party confirms, and never touches outstanding check-ins. The
`NOT_STARTED` finals created above survive the close. `conversation.service.ts:588-641` will still
meter and open them. The close email goes out at `:297-309`, so a participant can receive "this has
ended" and a live check-in link in the same minute, and spend a credit on a conversation whose
conclusion was reached without them.

P4-009 is recorded as-built and needs no code: the refusal path does tell both the blocked person
and the payer (`:591-607`, `:617`). Its residue is that both sends are `.catch(() => undefined)`, so
a double failure leaves the refusal existing only as an exception in one browser. That is closed by
the same recipient work as Batch 1 plus one line.

**The change.**

- `grounds.service.ts` `beginClosingSession` — add the billing question **at the button**. Call the
  same gate `open()` uses, before creating anything, and return a refusal the lead's own screen
  renders. The lead learns at the press, which is the whole point.
- Exempt the final session from metering. Set a `isFinal` check in `conversation.service.ts` at the
  decrement (`:633-636`) so a session flagged `isFinal` skips it. Ending a thing already paid for is
  not a second purchase, and this removes the paywall from the deliverable entirely — which is the
  better fix, and makes the gate above a belt-and-braces guard for the non-final case only.
- `resolution.service.ts` `finalize` — inside the existing close transaction, add a
  `checkIn.updateMany({ where: { groundId, status: 'NOT_STARTED' }, data: { status: 'CANCELLED' } })`
  (or the repo's existing terminal state for an unopened check-in — read what `hasEnded` handling at
  `reports.listener.ts:82-88` expects). Nobody holds a live link into a closed ground.
- `conversation.service.ts` `open()` — refuse a check-in whose ground has ended, with the reason
  said plainly, and refuse it *before* the decrement.
- P4-009: log the refusal as a row, not only as two best-effort mails, so "we told somebody" is
  answerable. The gate already computes `gate.reason`; write it where the existing usage events are
  written.

**Which is it.** Not a promise finding. The product should do the obvious thing.

**Spec:** `ending-what-you-paid-for-is-not-a-new-purchase.spec.ts` (zero balance, closing session
opens and does not decrement); `the-lead-learns-at-the-button.spec.ts`;
`a-closed-ground-holds-no-live-check-in.spec.ts`.

**Effort:** day.

**Risk:** medium. The `isFinal` metering exemption is a new free path — check it cannot be reached
by flagging an ordinary session, i.e. that `isFinal` is only ever written by `beginClosingSession`.
Cancelling outstanding check-ins inside the close transaction lengthens it; keep the email outside.

---

## Batch 3 — A credit spent on a session nobody received comes back

**Closes:** P6-016

Part A Batch 5 restructures `open()` so the decrement and the AI turn become one transaction after
the model returns. That closes the *cause*. It does not close what P6-016 is actually about, which
is that **there is no refund, reversal or credit path anywhere in `billing.service.ts`** — so every
consumption defect the audit found is permanent for the customer, and there is no operator move
except a manual database edit.

**The change.**

- One service method on `billing.service.ts`: `giveBackASession(organizationId, reason, ref)`. It
  increments `sessionsBalance` (or decrements `freeSessionsUsed` where the spend was free), writes
  a row recording who did it and why, and is idempotent on `ref` so the same incident cannot be
  refunded twice.
- **The smallest honest interface** is one control on the existing platform-admin organisation view
  in `client/src/pages/admin/AdminPage.tsx`: "Give back a session", a required reason field, and the
  list of refunds already given. Not a settings area, not a new page — a row on a panel that
  already lists the organisation's balance.
- Call it from the compensating path Part A Batch 5 introduces, so an engine failure refunds itself
  and the manual control is for everything else.

**Balances already burned.** They cannot be identified after the fact — nothing was written when
they were spent. With zero paying subscribers today this is free to leave. Say that in the commit
rather than implying a reconciliation happened.

**Spec:** `a-session-nobody-got-can-be-given-back.spec.ts` (refund is idempotent on ref, is recorded
with a reason, and moves the balance the customer sees).

**Effort:** half a day, on top of Part A Batch 5.

**Risk:** low, but it is a write that creates value out of nothing — the idempotency key and the
recorded reason are the whole safety story. Do not ship it without both.

---

## Batch 4 — The report that never came, and the report that came too early

**Closes:** P4-006, P4-004

Two failures in `reports.listener.ts`, on the same event.

P4-006: the whole synthesis-and-release path runs inside one `try` whose `catch` only logs
(`:88-90`). By the time `CHECK_IN_COMPLETED` fires, the check-in is already `COMPLETED` and the
credit is already spent (`conversation.service.ts:3196-3206`). There is no retry, no queue, no flag
on the ground and no email. Everybody has finished, the money is gone, and the Report tab simply
never fills — visible only in a server log. `onGroundActivated` has the identical shape at
`:113-124`.

P4-004: `entry.service.ts:1654-1660` emits `CHECK_IN_COMPLETED` **before** the loop at `:1665-1706`
that adds and invites the contributors. The listener is async and not awaited. When it wins the
race, `isSessionReadyForReport` sees only the lead — already `COMPLETED` — releases a one-person
"shared" report and flips the ground `ACTIVE`. The code immediately below carries a long comment
describing this exact bug being fixed for `recordRoundCompletion`, which *was* moved after the loop
(`:1723`). The emit was left behind.

The finding's own check-needed is answerable in the same edit: if `isSessionReadyForReport` counts
`Ground.participants` rows, the race is live; move the emit and it cannot fire either way.

**The change.**

- `entry.service.ts` — move the `CHECK_IN_COMPLETED` emit from `:1654` to after the contributor loop
  at `:1706`, next to `recordRoundCompletion`. One line moved, and it makes the comment at
  `:1644-1650` true.
- `reports.listener.ts` — the catch must do three things instead of one: mark the ground with a
  `reportFailedAt` (so the Report tab can say something rather than being empty), re-throw into a
  retry, and on final failure mail the ground's initiator. The repo already names this case in
  `reports/a-closing-synthesis-that-never-landed.spec.ts`.
- Retry: the repo has no queue. Do not add one. The honest minimum is the existing cron surface —
  a sweep that picks up grounds with `reportFailedAt` set and no released report, retries the
  synthesis, and clears the flag. Two attempts and then a mail is better than a log line, and it is
  a fraction of the cost of a job runner.
- Apply the same shape to `onGroundActivated` at `:113-124`.
- The Report tab, when the flag is set: one sentence, *"This report did not come through. We are
  trying again."* Justified because the alternative is an empty tab that is indistinguishable from
  a working one.

**Spec:** `a-report-that-fails-is-not-a-silent-report.spec.ts` (synthesis throws → flag written,
initiator mailed, sweep retries); `a-shared-report-waits-for-the-people-it-is-shared-with.spec.ts`
(commit with three contributors never releases on the lead alone).

**Effort:** day. The emit move is minutes; the retry sweep and the flag are the bulk.

**Risk:** medium. Moving the emit changes ordering for every anonymous-entry commit — check nothing
else downstream of `CHECK_IN_COMPLETED` depended on running before the invites. A retry that
re-synthesises must not double-release; guard on the released state, not the flag.

---

## Batch 5 — WhatsApp: the twelve-character discard

**Closes:** P6-015

Part D Batches 1 and 2 close the silence and the two-handler split on the platform path, including
the `NOT_STARTED` branch that drops the inbound text (`whatsapp.controller.ts:101-104`). What is
left is the same defect on the per-organisation path, in a different disguise.

`whatsapp-for-an-organisation.service.ts:127-136`: when the check-in is `NOT_STARTED`, the service
opens it, builds the opener, and then — if `text.length <= 12` — sends the opener and **returns**,
never passing the inbound text to `sendMessage`. The heuristic is defensible in intent ("hi" is not
an answer) and wrong in effect: "yes, done" is eight characters, "shipped it" is ten, "not yet" is
seven. Every one of those is a real answer to a real opener and every one is thrown away with no
trace.

**The change.**

- `whatsapp-for-an-organisation.service.ts:136` — delete the length branch. Always pass the inbound
  text through to `sendMessage` after opening. If a greeting-suppression is genuinely wanted, it
  belongs on a match against a short list of greetings, not a character count, and it should still
  record the turn.
- The same catch-and-return-`{received:true}` treatment Part D Batch 1 applies to the platform
  controller applies here at `whatsapp-for-an-organisation.controller.ts:107-109`. Reference that
  batch rather than duplicating the work; this batch only needs to confirm it covers both files.

**Spec:** `a-short-answer-is-still-an-answer.spec.ts` (inbound "not yet" on a NOT_STARTED check-in
is recorded as a turn and answered).

**Effort:** hours.

**Risk:** low. The visible change is that a person who writes "hi" now gets the opener *and* a
response to "hi", which is slightly chatty and entirely honest.

---

## Batch 6 — The wall in front of the whole product, for a field nothing uses

**Closes:** P6-005

The first thing Groundwork does to a new organisation admin is stop them.

Verified: `App.tsx:189` and `:307` redirect every admin to `/org/setup` on the strength of one
column, `Organization.email`. `auth.service.ts:1039` computes the flag; `:1128` writes the column.
The column is read in exactly three places — `billing.service.ts:220` and `:495`, prefilling a
Stripe customer record, and `prompts.service.ts:417`, a staff read. **No email is ever sent to it.**
`OrgSetupPage.tsx:14-38` will not submit without an `@` in it.

So the product demands a second email address, in front of everything, for a field that matters only
if the organisation later pays — and 21 of 224 local organisations have never created a check-in.
This is the first wall they hit.

**Which is it.** This is not a claim, it is a gate. **Remove the gate.** Building a use for the
field would be inventing work to justify a wall.

**The change.**

- `App.tsx:189` and `:307` — drop the redirect. `RequireOrgSetup` becomes `RequireAuth` everywhere
  it is currently doing nothing but this. Keep the route `/org/setup` reachable so the existing link
  from the organisation settings still works; no page is deleted and no page is added.
- `OrgSetupPage.tsx` — make `orgEmail` optional. `handleSave` already requires `orgName`; keep that.
- `billing.service.ts:220` and `:495` — where the column is null, fall back to the admin user's own
  email, which is the address Stripe should have had all along.
- Ask for the billing email **at the moment it is needed**, on the existing checkout screen, which
  already collects payment details. That is one field on a form that exists, not a new surface.

**Spec:** `nothing-stands-between-signing-up-and-the-product.spec.ts` (a fresh admin with no
organisation email reaches `/grounds`); `the-billing-email-is-asked-for-at-checkout.spec.ts`.

**Effort:** half a day.

**Risk:** low-medium. `RequireOrgSetup` wraps a lot of routes and is doing two jobs in some of them
— read each usage before collapsing it, because a few may be relying on it for "signed in" rather
than "organisation named". The Stripe fallback must be exercised, since a customer record created
with the wrong address is annoying to correct.

---

## Batch 7 — The chasing the product says it removes

**Closes:** P6B-006

`how-it-works.astro:58`: *"Groundwork runs regular check-ins and prompts people automatically when
it is their turn, so you are not left chasing anyone."*

`conversation.service.ts:3308-3345`: a participant's next session is created **only when they
complete the current one**. Nothing on a clock creates a missed round. Reminders send for a session
that exists; a person who never opens session one never receives session two. Their run silently
stops advancing and the report has fewer accounts than the lead expected — and the lead is not told,
which is precisely the chasing the sentence says has been removed.

**Which is it.** **The product should do what the claim says.** This is the core of what a "regular
check-in" means; changing the sentence would leave the product without its cadence, which is the
thing being sold. But do the cheap half first.

Two halves, and they can ship separately:

1. **Advance the round on the clock.** A cron that, for each active ground past its cadence
   interval, creates the next session for every participant regardless of whether they completed the
   last one, marking the skipped one as missed. This is the claim, delivered.
2. **Tell the lead.** When a participant misses a round, the lead's board and the report both say
   so. Half of this exists — the report already counts accounts — but the *absence* is not surfaced
   as a fact.

Cost of building it: a day for the sweep, plus the missed-round state on the check-in and its
handling in every report path that counts participants. That is not small, because "missed" is a new
state a lot of code has to understand.

Cost of the alternative — changing the sentence to *"Groundwork prompts people when their check-in
opens"* — is minutes, and it makes the site accurate while the sweep is built. **Do both: change the
sentence now, build the sweep, change it back.**

**The change.**

- `marketing/src/pages/how-it-works.astro:58` — wording only, no markup, no design: replace *"runs
  regular check-ins and prompts people automatically when it is their turn, so you are not left
  chasing anyone"* with *"prompts people when their check-in opens, and the report shows who has
  answered and who has not."* That second clause is true today.
- Then build half 1 in `conversation.service.ts` plus a sweep, and half 2 as a missed count on the
  board and the report.

**Spec:** `a-quiet-person-still-gets-their-next-check-in.spec.ts` (complete one participant, leave
one, run the sweep past the cadence, both hold session two);
`the-site-does-not-promise-more-than-this.spec.ts` — **extend the existing guard to read
`how-it-works.astro`**, which is the file it should have been reading all along (see Batch 10).

**Effort:** more than a day for the sweep. The wording change is minutes and should go first.

**Risk:** medium-high. Creating sessions on a clock is a write loop over live grounds; get the
cadence source and the idempotency right or a bad deploy floods people with check-ins. Gate the
sweep behind a dry-run count on the first release.

---

## Batch 8 — The closing report's two missing parts, and a report section that is a tile

**Closes:** P6B-008, P6B-007

Two report promises, both partly delivered, both in the same file.

P6B-008: the closing synthesis (`reports.service.ts:649-696`, `:1715-1717`) produces objectives
against delivered, expectations changed, evidence, and the complete history. Six parts are named to
the customer. **"The key decisions" and "what was learned" have no field and no producer.** Four of
six land, and the two missing are the parts a leader would actually quote in the next conversation
— which is the reason a closing report exists at all.

P6B-007: *"where expectations differ"* is promised as a report **section** at
`how-it-works.astro:72`, in a list of things "managers get". It exists only as a count tile. A
number is not a section; a reader told there is a section about where expectations differ, who then
sees `1 open`, has been given less than they were told.

**Which is it.** For both: **the product should do what the claim says.** The divergence data is
already computed — the tile is rendering a count of something that exists in full. And a closing
report without decisions and learning is the weakest version of the product's own best moment.

**The change.**

- `reports.service.ts:649-696` — add two producers to the closing synthesis, `keyDecisions` and
  `whatWasLearned`, drawn from the same history the other four use. Both are lists of short lines
  with the same never-says-who-about-whom handling as the rest of the closing prose. Add them to
  the closing report's shape at `:1715-1717` and to the renderer.
- Divergence: the underlying rows exist behind the count. Render them as the section the site
  promises, in the place the tile is now — the tile becomes the section's heading rather than the
  whole thing. No new screen; the report already has section furniture.
- If the divergence section cannot ship in this pass, then the wording at
  `how-it-works.astro:72` changes from *"where expectations differ"* in a list of report sections to
  *"a count of where expectations differ"*. Say which one shipped.

**Spec:** `the-closing-report-has-all-six-parts.spec.ts` (a closed ground's report carries key
decisions and what was learned, both non-empty when the history contains them);
`where-expectations-differ-is-a-section-not-a-number.spec.ts`.

**Effort:** day. Two new synthesis producers means two new prompt paths and their guards.

**Risk:** medium. Anything added to the shared synthesis prose is inside the privacy promise — key
decisions in particular are the place a model is most tempted to write "X decided". Route both new
fields through the same `countsAccounts` and name-resolution handling the existing prose uses, and
do not ship them on a prompt line alone.

---

## Batch 9 — A performance process was put around an onboarding, and then the board hid the strip

**Closes:** P6-011, P6B-003

These are one story, found in two passes.

`entry.service.ts:485-501` is the scenario classifier: a single prompt listing fourteen scenario
keys, one line each, **no tie-break rule and no confidence output**. "PIP — performance improvement,
formal feedback, or capability concern" and "NEW_HIRE — onboarding a new hire or someone joining a
team" both match *"a new hire six weeks in who is not settling, inside a six-month probation"*. The
browser pass got PIP. The scenario key reaches user-facing copy and the invitation, so the wrong key
puts the words of a performance process around somebody's onboarding. This is BR-001's root.

Then the second half. `board-families.ts:83` maps `PIP → EVALUATION`, and `:208-210` gives
`EVALUATION` only `objectives`, `checkInGrid`, `divergence`. `ONBOARDING` — where `NEW_HIRE` sits,
deliberately, per the comment at `:57` — includes `quickRead`. That `quickRead` strip is the
Aligned / Moving / Stuck / Solid four-state row the homepage shows **on its probation example**
(`index.astro:294`). So the misclassification does not only change the words: it removes the exact
component the site uses to sell that exact situation.

**Which is it.** Mixed. The classifier is a bug. The board omission is a deliberate product
decision that happens to contradict a marketing example — so for that half, **the claim should
change**, unless the omission was never intended to cover a probation.

**The change.**

- `entry.service.ts:485-501` — add a precedence rule to the prompt, stated as a rule and not a hint:
  *"A situation that names a new hire, a joiner, onboarding, a first ninety days or a probation is
  NEW_HIRE, even when it also describes a performance concern."* And add a `confidence` field to the
  classifier's output; below a threshold, the flow asks rather than guesses. The catalogue already
  has a "which situation is this" step to ask into.
- `board-families.ts:208` — decide, and record the decision in the file the way the rest of that
  file records its decisions. If a probation board should show the four-state strip, add
  `'quickRead'` to `EVALUATION`. If it deliberately should not, then `index.astro`'s fourth example
  tab is showing a component that situation never produces, and the tab's report extract must be
  rebuilt from what `EVALUATION` actually renders — **wording and the extract's contents only, not
  the layout.**
- Recommended: add `'quickRead'` to `EVALUATION`. The reasons the strip is useful — is this aligned,
  is it moving, is it stuck — are more acute in a probation, not less, and the site already sells it
  that way.

**Spec:** `a-new-hire-in-trouble-is-still-a-new-hire.spec.ts` (the classifier returns NEW_HIRE for
the probation phrasing, and returns low confidence rather than a guess for a genuinely ambiguous
one); `the-example-on-the-homepage-is-a-board-we-render.spec.ts`.

**Effort:** half a day.

**Risk:** low-medium. A precedence rule in a classifier prompt can over-fire — check that a genuine
PIP on somebody two years in still resolves to PIP. Adding a section to a board family is a visible
change for existing EVALUATION grounds.

---

## Batch 10 — Two sentences on the site, and the guard that only reads one page

**Closes:** P6B-005, P6B-016

Small, cheap, and worth doing in one pass because they are all the same file family.

P6B-005: the marketing site says **"Ground"** as a noun three times — `how-it-works.astro:37` ("the
rest of the Ground is measured against"), `pricing.astro:207` ("run Grounds on the free plan"), and
one more. The product stopped using that noun; everywhere else it is a check-in. A prospect reads a
word they will never see again after signing up.

P6B-016: *"A check-in takes about ten minutes"* (`how-it-works.astro:58`, `index.astro:376`, and the
in-product `GroundChat.tsx:620`). Nothing measures it. The audit records the omission as deliberate.

**Which is it.**

- "Ground" → **the claim should change.** It is a word, and the word is wrong. Minutes.
- "About ten minutes" → **keep the claim, and measure it.** It is a reasonable, hedged estimate that
  the product repeats to the person mid-session, and it costs almost nothing to know whether it is
  true: the check-in already has a created and a completed timestamp. Compute a median across
  completed sessions and put it where the ops board already shows product numbers. If the median is
  materially off ten minutes, change all three strings to what it actually is. Do not put the
  measured figure on the marketing page as a live number — the page is built at build time and that
  is the same trap as P6B-010.

**The change.**

- `marketing/src/pages/how-it-works.astro:37`, `pricing.astro:207`, and the third occurrence — "the
  Ground" → "the check-in", "Grounds" → "check-ins". Wording only.
- A median-duration figure on the existing ops product-numbers surface, computed from the check-in
  timestamps already stored. No new page, no new table.
- **Extend `the-site-does-not-promise-more-than-this.spec.ts` to read every page in
  `marketing/src/pages/`, not just `index.astro`.** This is the highest-value line in the batch:
  P6B-001's false privacy sentence survived on `how-it-works.astro` for exactly this reason, and so
  does most of my slice's marketing drift. Add "Ground" as a banned noun to that guard.

**Spec:** the extension above, plus `a-check-in-takes-about-as-long-as-we-say.spec.ts` (the median
is computed and the constant the copy uses is asserted against a range).

**Effort:** hours.

**Risk:** very low. The only care needed is that widening the guard to all pages will fail on
sentences other batches own — land it after Part A Batch 3 and Batch 7's wording change, or land it
with an explicit allowlist that shrinks as those batches close.

---

## Batch 11 — The two most saleable things the product does are invisible

**Closes:** P6B-020

The words **WhatsApp, panel, API and integration do not appear anywhere in
`marketing/src/pages/`.** Neither do the pattern detector, webhook delivery, the departure sweep or
the Monday intelligence brief. Running a check-in over WhatsApp and embedding it in a customer's own
product are the two capabilities most likely to close a deal, and a prospect can only find them by
opening the Connect page, which nothing on the site links to.

This is the inverse of every other promise finding: the product does more than it says.

**Which is it.** **The claim should change** — upward. And it is the only finding in my slice that
makes money rather than avoiding harm.

**The change.**

- **No new pages.** The constraint and the right answer agree here. Add WhatsApp and the embedded
  panel to `how-it-works.astro` as two lines in the step where a person answers their check-in — the
  section already describes the answering, and "answer it on WhatsApp" and "answer it inside your
  own product" belong in that sentence, not in a new section.
- `pricing.astro` already has a services block naming "an engineer to connect it to the tools you
  already use" (`:145`). Name the API there in one clause, since that is the thing being sold.
- Link the in-app Connect page from the pricing services block, the way that block already links
  `/talk-to-us`. One `href`.
- Leave the pattern detector, the departure sweep and the Monday brief off the site. They are real,
  but they are not what a prospect buys on, and this batch is not a content project.

**Spec:** `the-site-says-the-two-things-we-can-actually-sell.spec.ts` (the built marketing output
contains "WhatsApp" and a link to the Connect page). This is the mirror of the
does-not-promise-more guard, and worth having as its own file so the two do not fight.

**Effort:** hours for the copy. Whoever writes it should be the product owner, not an engineer.

**Risk:** low, with one real trap: **do not describe WhatsApp or the panel as finished until Part D
lands.** Part D's own Batch 20 says the WhatsApp path cannot be fully settled without provider
access. Sequence this batch after Part D, or the site will be advertising a channel that answers
with silence.

---

## Batch 12 — Three things that are built and cannot be found, or that nobody is told about

**Closes:** P6B-018, P6B-019, P6B-013

The "delivered but not findable" class. Each is small; together they are the difference between a
capability existing and a capability working.

**P6B-018, the lead's guide.** `/org/guide` is correctly public at the route level — `App.tsx:504`
has no wrapper and a comment explaining why. But it is linked from exactly one place,
`OrgMembersPage.tsx:566`, an admin-only control. The page itself says *"Send this link to your
team"*. So a lead who is not an org admin cannot find the thing written for them, and it exists to
brief people **before** their first check-in.

**P6B-019, the About page's mailto.** `about.astro:141` is `mailto:hello@myground.work`. The pricing
page's own source (`pricing.astro:179`) records that this exact pattern was removed there because
*"it does nothing at all for anybody without a configured mail client — so the only route to the one
thing on this page you cannot self-serve was a link that appeared broken"*. The fix already exists,
one page over: `/talk-to-us` is public (`App.tsx:423`), writes a `CoachRequest`, and sends a
confirmation.

**P6B-013, the coach request nobody hears about.** Two request paths, two tables, one alert.
`users.service.ts:98-109` writes `CallRequest` and emits `CALL_ASKED`, which
`the-team-is-told.service.ts:71` turns into a mail to the whole back-office roster.
`coach.service.ts:99-119` writes `CoachRequest` and emits **nothing** — it mails the requester a
confirmation and stops. `TheTeamIsToldService` handles `subject: 'COACHING'` already
(`the-team-is-told.ts:23-27`). So a coaching request from the public `/talk-to-us` page — the page
the pricing site's "Request a call" button points at, at $700 an hour — lands in a back-office tab
that somebody has to remember to open.

**Which is it.** P6B-018's page makes a claim ("send this link to your team") that the product's own
discoverability defeats — **the product should do what the claim says**, and it is two lines.
P6B-019 and P6B-013 are not claims, they are dead ends.

**The change.**

- `LeadsGuidePage.tsx` — put a copy-link control on the page itself, so the person reading it can do
  what it tells them to. The clipboard pattern exists elsewhere in the client; reuse it.
- Link `/org/guide` from a second place that is not admin-only: the lead's own check-in screen, at
  the point before the first session opens. One link, no explanatory paragraph.
- `marketing/src/pages/about.astro:141` — replace the mailto with a link to `${APP_URL}/talk-to-us`,
  copying the pattern and the reasoning comment from `pricing.astro:185`. Wording and one href, no
  design change.
- `coach.service.ts` — after the `CoachRequest` write at `:99`, emit `CALL_ASKED` with
  `subject: 'COACHING'`. The listener, the roster read, the mail template and the back-office link
  all already exist. The only wrinkle is that the event's shape carries `organizationId` and
  `askedByUserId`, and a public coach request has neither — widen `CallAskedEvent` to allow a
  name-and-email-only requester, or add a sibling event. Widen; a second event for the same fact is
  how the two-table split happened in the first place.
- Longer term the two tables should be one. Not in this batch — say it in the commit.

**Spec:** `a-guide-you-are-told-to-send-can-be-sent.spec.ts`;
`the-site-has-no-mailto-anywhere.spec.ts` (a guard over all of `marketing/src/pages/`, which also
stops the pattern returning); `somebody-asking-for-a-coach-reaches-a-person.spec.ts`.

**Effort:** half a day.

**Risk:** low. Widening `CallAskedEvent` touches a typed event contract — check the other two
listeners and the `isOneOfUs` roster filter handle a requester with no organisation.

---

## Batch 13 — Anonymous callers can spend the model budget with no throttle and no bound

**Closes:** P6-010

`entry.controller.ts` has five `@Public()` handlers and five different validation postures.
`/entry/chat` is 30/min (`:297`), `/entry/report` 20/min (`:326`), `/entry/join-accept` 5/min
(`:355`), `/entry/join-confirm` 10/min (`:369`). **`/entry/faq` and `/entry/classify-intent` carry
no `@Throttle` at all**, and both reach the model — `faq()` calls `guardedReply`
(`entry.service.ts:480`), `classifyIntent()` builds a classifier prompt (`:485-501`).
`classify-intent` additionally has **no DTO class**, so the global `ValidationPipe` has nothing to
validate against and `description` has no length bound.

So an anonymous caller can spend Groundwork's model budget at the global 60/min/IP ceiling instead
of the intended 20 or 30, with an unbounded prompt body on one of the two.

**The change.**

- `@Throttle` on both, matching their siblings: `/entry/faq` at 20/min (it is a read-shaped route),
  `/entry/classify-intent` at 30/min (it is on the entry path and fires per keystroke-batch).
- A DTO class for `classify-intent` with `@IsString()` and `@MaxLength(2000)` on `description`,
  matching the 1000 cap `/entry/faq` already has. Pick one number for both and say why in the file.
- Write a usage event for both, so anonymous model spend is visible at all. Neither currently
  records anything.
- State the posture once at the top of the controller — throttled, DTO'd, usage-recorded — so the
  next handler added inherits an answer rather than a coin flip. This is the drift half of the
  finding and it is worth two comment lines.

**Spec:** `every-public-door-is-throttled-and-bounded.spec.ts` — iterate the controller's `@Public()`
handlers and assert each has a `@Throttle` and a DTO. A guard that enumerates rather than lists is
the only version that survives the next handler.

**Effort:** hours.

**Risk:** very low. Watch that the throttle numbers do not break the entry flow's own burst — the
classifier can fire more than once in a single person's session.

---

## Batch 14 — The published API's error body, its retries, and its half-written batches

**Closes:** P7-010, P4-G04, P4-G03

Three findings, one audience: the integrator writing against `/api/org/v1`. This is the paid
surface, so its contract is the product.

**P7-010, two shapes.** `transform.interceptor.ts:37` deliberately exempts `/api/org/v1`,
`/embed.js` and `/embed/panel` from the `{success, data}` envelope, so the machine API returns raw
bodies on success. `http-exception.filter.ts:90-98` has **no matching exemption**, so machine-API
errors come back enveloped. And inside that envelope, `errors` is `responseObj.errors ?? null`
(`:36`) while class-validator's failure array lands in `responseObj.message` — so `message` is an
array of strings from the pipe and a string from every hand-thrown error. Separately the SSE routes
bypass the filter entirely and emit `{type:'error', message}` at HTTP 200
(`conversation.controller.ts:97-99`, `entry.controller.ts:236-238`), leaking raw internal message
text.

**P4-G04, idempotency on two routes out of seven.** `public-api.controller.ts:467-473` honours
`Idempotency-Key` on `POST /subjects` and `POST /subjects/bulk` only. `POST /grounds`,
`/role-assignments`, `/primary-actions`, `/objective-drafts` and `/evidence` accept no key and are
not upserts. `idempotency.service.ts`'s own reasoning — a network timeout on our side is
indistinguishable from a refusal on theirs, so any integration worth connecting retries — applies
exactly as hard to opening a check-in. A retried `POST /grounds` after a timeout creates a second
check-in, burns one of the organisation's ten free ones, and sends a second set of invitations to
the same people.

**P4-G03, a batch that half-lands.** `grounds-by-api.service.ts:350-400` `seedObjectives` loops the
submitted array and throws on the first bad item. Every prior item is already written. No
transaction. A caller who gets a 400 cannot tell whether nothing, some, or nearly all of their
objectives landed.

**Which is it.** Not promises exactly, but the API terms and the generated reference are a
contract. All three: fix the product.

**The change.**

- `http-exception.filter.ts` — import the same `PUBLISHED` array `transform.interceptor.ts:37`
  uses (move it to one shared module so there is one list, not two) and, for those URL families,
  emit a raw error body: `{error: {code, message, details}}`. One shape on success, one on failure,
  both raw.
- Same file, `:36` — normalise. When `responseObj.message` is an array, that array is `errors` and
  `message` becomes a single summary string. `message` is a string, always, everywhere.
- The SSE routes — emit a stable `{type:'error', code, message}` where `message` is the safe
  public text and the internal text goes to the log, not the wire.
- `public-api.controller.ts` — apply the existing `Idempotency-Key` handling to all seven POST
  routes. The service exists; this is a decorator and a key derivation per route.
- `grounds-by-api.service.ts:350-400` — adopt the bulk-import shape the codebase already has:
  validate the whole batch first, then write, and return the per-row result including which rows
  were skipped and why. If a full transaction is simpler for this one, take the transaction.
- The API terms and generated reference must describe the error shape. That is documentation of a
  contract, not an explanatory paragraph on a screen.

**Spec:** `one-error-shape-for-a-machine.spec.ts` (a validation failure and a hand-thrown failure on
`/api/org/v1` produce the same keys and `message` is a string in both);
`a-retried-post-does-not-open-two-check-ins.spec.ts`;
`a-rejected-batch-wrote-nothing.spec.ts`.

**Effort:** day.

**Risk:** medium. Changing an error shape is the one thing an integrator has already written code
against — but there is one API customer's worth of usage at most, and the current shape is
inconsistent enough that nothing can be relying on it. Sharing the `PUBLISHED` list between the
interceptor and the filter is the highest-value line here and the one to review carefully: a
mistake there silently un-envelopes the whole app.

---

## Batch 15 — A terms bump nobody notices

**Closes:** P6B-017

`the-api-terms.ts:9` is `API_TERMS_VERSION = '2026-09-10'`. `api-access.service.ts:40` stamps
`{acceptedTermsAt, termsVersion}` at approval. `ApiAccessPage.tsx:83` displays it. **Nothing
compares a stored `termsVersion` against the current one.** Bump the constant and every already-
approved organisation carries a stale acceptance that no code notices and no screen flags.

**Which is it.** Not a customer-facing claim — a legal-hygiene gap. The cost of the fix is small
enough that the alternative (accept it, note it) is not worth arguing for.

**The change.**

- `api-access.service.ts` — a computed `termsOutOfDate: r.termsVersion !== API_TERMS_VERSION` on the
  row it already returns at `:142`.
- `ApiAccessPage.tsx:83` — where the sentence already prints the accepted version, append *"— terms
  have changed since"* when the flag is set. No new control, no new page; the sentence exists.
- The re-acceptance flow itself is a decision for whoever owns the terms, and is out of scope here.
  Surfacing the fact is the fix; what is done about it is a business call.

**Spec:** `a-changed-term-is-visible-on-every-approval.spec.ts`.

**Effort:** hours.

**Risk:** very low.

---

## Batch 16 — The weight of the back office, recorded as a judgement

**Closes:** P6-008

No code change is proposed and none should be.

The numbers, verified: 42 of 152 Prisma models are `Ops*` — 28 per cent of the data model. 133 route
decorators across nine `api/src/modules/ops/*.controller.ts` files. 34 `/ops` screens in
`App.tsx:430-490`. Meanwhile the customer product has modules it cannot reach and, per Part B, a
truncated first report.

Several of the 34 screens are statements of position rather than working surfaces —
`/ops/what-we-are`, `/ops/workplan`, `/ops/moat`, `/ops/positioning` — which nobody has a reason to
open twice.

**Which is it.** Neither. It is a judgement about where the effort has gone, which is what a
promise-and-value pass is for, and the product owner is the only person who can act on it.

**The recommendation, and it is one line.** Before the next `/ops` screen is built, close a customer
dead end from Batches 1, 4 or 6 in this document. Not a freeze, not a deletion — an ordering rule.
The four position pages above are the honest first candidates for retirement if any deletion is
wanted, because a page that states a position is a document, and this repository has `docs/`.

**Spec:** none. A test that counts models would be theatre.

**Effort:** none. It is a decision.

**Risk:** none, and that is the problem with findings like this — they cost nothing to ignore.

---

## Coverage

Every ID in the slice, once.

| ID | Batch | | ID | Batch |
|---|---|---|---|---|
| P4-004 | 4 | | P6B-003 | 9 |
| P4-005 | 2 | | P6B-005 | 10 |
| P4-006 | 4 | | P6B-006 | 7 |
| P4-007 | 2 | | P6B-007 | 8 |
| P4-009 | 2 | | P6B-008 | 8 |
| P4-G03 | 14 | | P6B-013 | 12 |
| P4-G04 | 14 | | P6B-016 | 10 |
| P6-003 | 1 | | P6B-017 | 15 |
| P6-004 | 1 | | P6B-018 | 12 |
| P6-005 | 6 | | P6B-019 | 12 |
| P6-008 | 16 | | P6B-020 | 11 |
| P6-010 | 13 | | P7-010 | 14 |
| P6-011 | 9 | | | |
| P6-015 | 5 | | | |
| P6-016 | 3 | | | |

27 findings, 16 batches, none dropped and none invented.

**Sequencing note.** Batch 11 must land after Part D, or the site advertises a WhatsApp channel that
answers with silence. Batch 3 sits on top of Part A Batch 5. Batch 10's widened marketing guard
should land after Part A Batch 3 and Batch 7's wording change, or it fails on sentences those
batches own.

---

# Added 10 September 2026, by decision

## Batch 17 — Where WhatsApp, the panel and the API are shown

Replaces the deleted batch 11, which proposed a marketing section and dies with the copy freeze.

**Decided: the Connect page is the home for this.** It already holds the three screenshots
(`client/public/connect/panel.png`, `whatsapp.png`, `ops-panel.png`), it already has the
request-access flow, and putting the pictures above that request is the right order: see what it
is, then ask for it.

What goes there: the panel, WhatsApp, and webhooks, each with its picture and two sentences. Not
patterns; patterns is a product surface a customer meets in use, not a thing they evaluate before
signing up, and putting it here would make the page an inventory instead of an offer.

**The limitation to be honest about.** The Connect page is behind sign-in and behind an admin role.
It reaches a customer who has already bought in, which makes it good at converting an existing
customer into an integrated one, and useless for the prospect who never learns WhatsApp exists.
It solves the discoverability problem for one audience and not the other.

**If the marketing freeze is lifted for one thing, make it one clause.** The recommendation is a
clause, not a section, in the homepage block headed "Everyone is asked the same way, at the same
time." That is where the mechanism is already described, and WhatsApp is not a feature so much as
the answer to the objection that block raises: my team will not log into another tool. Naming it
there costs one line and answers the question at the moment a reader has it. A separate features
section would be worse, because it turns a scenario-led page into a list.

The panel and the API do not need the homepage. The buyer who wants them arrives already asking.

**Not fixable by the product, and needing a recorded exception rather than a fix:** four uses of
the internal word "Ground" in site copy, and the About page's contact route, which is a mail link
the pricing page's own source says was removed there for being broken. Both are copy, both are
frozen. They should be written down as accepted rather than left looking like open findings.

Effort: half a day for the Connect page. An hour for the homepage clause if it is wanted.
Risk: the Connect page must not advertise WhatsApp before part D lands, for the same reason the
deleted batch was sequenced that way. A page that sells a channel which answers with silence is
worse than a page that does not mention it.

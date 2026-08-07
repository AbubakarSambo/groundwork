# Fix plan — everything found in the 18-ground assessment

Every finding from [ORG-18-ASSESSMENT.md](./ORG-18-ASSESSMENT.md), plus the five changes that
would move participant value from 7/10 to 9/10. Nothing dropped: items that need no fix are
listed as **No action** with the reason, so the list can be checked against the assessment
line by line.

**Sizes:** S = under a day. M = a few days. L = a week or more. Sizes are for the change
itself plus its guard test.

---

# Wave 1 — The product cannot complete a cycle

These four are why a ground produces work and never produces an outcome. Everything else is
polish by comparison.

## F1 · Nothing ever calls the resolution flow — **S, not L**

**Finding A.** Ten grounds, every session finished, none resolved: `resolution_state`,
`end_state`, `resolved_at`, `closed_at` all empty, ten out of ten.

**The diagnosis changed once I looked.** Resolution is *already built*:
`api/src/modules/resolution/` has the service, the controller (`GET /resolution`,
`POST /resolution`, `POST /resolution/counter`), per-scenario end states in `end-states.ts`,
and both emails (`sendResolutionProposal`, `sendGroundClosed`). The client even has
`resolutionApi.get()` and `resolutionApi.propose()` in `client/src/api/resolution.ts`.

**No page in the app calls any of it.** A complete feature with no entry point.

**Fix.** Add the propose-an-outcome control to `GroundAdminPage` and `GroundParticipantPage`:
show the scenario's end states, let a party propose one, show the other party's counter, close
when they agree. The API is done; this is wiring plus a confirmation step.

**Guard.** A ground whose sessions are all complete surfaces the control; proposing sets
`resolutionState`; both parties agreeing sets `endState` + `resolvedAt` + status.

## F2 · Delete the participant paywall — dead scaffolding, and participants were never meant to be charged — **S**

**Corrected finding.** I first reported that participants pay $25/mo to see their own record.
**That is wrong, and I should have rendered the page before saying it.** Abubakar's record page,
signed in as him: sessions, specificity, **"RECORD CONFIDENCE: High"**, and observations — all
visible, no paywall.

**What is actually there.** `insightsLocked` is hardcoded `false` at
[grounds.service.ts:1574](../../src/modules/grounds/grounds.service.ts) — the server never
locks anything. The client shows the banner when `insightsLocked !== false`, which is only
true when the record is **absent**: a participant who has not yet done their first check-in.
They are shown *"Your insights will appear here once you complete a check-in"* with an
**"Unlock insights for $25/mo"** button beneath it.

Worse, that button calls `billingApi.purchaseSession()` — a one-off session purchase — so the
label does not describe what it does either.

**So the charge is shown to exactly one person: someone who has contributed nothing yet and is
deciding whether to begin.** Participants were never meant to be charged at all, which makes
this leftover scaffolding from an abandoned model.

**Fix.** Delete the CTA block at `GroundParticipantPage.tsx:601-625`. Keep the empty state —
*"Your insights will appear here once you complete a check-in"* is the right thing to say —
and remove the button, the price, and the `checkoutMut` wiring behind it.

**Then sweep for siblings.** `insightsLocked` being hardcoded means the lock concept is already
abandoned server-side; remove the field rather than leave a flag that can only ever be false.
Check the same for any other participant-facing purchase affordance.

**Guard.** A participant with no completed check-in sees the empty state and **no price
anywhere**; a participant with a record sees the record.

### F2b · The second charge on the same page — "Buy a session ($5)"

The sweep found another one. `GroundParticipantPage.tsx:1042-1053` renders a **"Buy a session
($5)"** button with the copy *"Groundwork helping your team? Continue this Ground with
additional sessions whenever you need them."*

**When it fires:** a participant tries to start a check-in, the API blocks it, and the ground
is not free (`GroundParticipantPage.tsx:179`). So on a paid ground that runs out of sessions,
**the participant is asked to pay $5 of their own money to continue giving their account.**

**I did not observe this live** — it needs a paid, session-exhausted ground, and I could not
create one (Ground 11). It is present in the code and reachable by that path.

**Fix.** Buying sessions is the organisation's decision, not the participant's. Replace the
purchase button on the participant's view with a plain statement that the ground is out of
sessions and their admin has been told, and notify the admin.

**Also note:** the free-ground guard directly above it is good work and should stay — the
comment says the intent out loud, that a stray 403 must never surface a payment modal on a
free ground.

### F2c · Contributor-code redemption is on the wrong page

The contributor code is an **admin/lead** instrument for bypassing a payment block. It is
currently rendered inside the participant's paywall modal
(`GroundParticipantPage.tsx:191-197`, `redeemPaywallCode`), where a participant is invited to
enter one.

That puts a billing control in the hands of the one role that should never meet billing at
all, and it will send participants hunting for a code they were never issued.

**Fix.** Move code redemption to the admin and lead surfaces — billing, and the ground's admin
view. On the participant's side, no code field: the ground is either open to them or it is not.

**Guard.** The participant view renders no code input and no price on any path, blocked or not.

## F3 · Nobody is ever pulled back for the released report — **M**

**Participant value #3.** Across ten grounds and 33 people, `report_activations` holds **zero
rows**. The participant's released report payload is five keys of metadata — `id`, `groundId`,
`createdAt`, `releasedAt`, `activated: false` — and no content until activation.

The simultaneous-reveal gate is right. Nothing telling the person the gate is there is not.

**Fix.** On release, notify each party that their report is waiting and what activating shows
them. Surface it on the grounds list and the ground page, not only inside the report route.

**Guard.** Release with both parties complete → each has a pending activation prompt.

## F4 · The admin is locked out of a board her own page links to — **S**

**Ground 1's blocker.** `GroundAdminPage.tsx:295` renders **"Team board →"**. Clicking it as
the creating admin returns 403. Verified: lead 200, participant 200, admin 403.

**Cause.** [board.service.ts:85](../../src/modules/board/board.service.ts) admits
`initiatorId` and participants; Sahar is `createdByUserId`, never checked.

**Fix.** Admit `createdByUserId` to the read path. Read only — she should not gain the
initiator's write powers (objectives, poll).

**Guard.** A ground created by an admin who is neither lead nor participant: `GET board` 200
for her, writes still 403.

---

# Wave 2 — Value the participant can feel

## F5 · Give something back every session — **M**

**Participant value #4.** The entire return is deferred to an ending that never comes. Someone
does eight to thirteen check-ins and holds nothing in the meantime.

**Fix.** Close each check-in with a short reflection to that person: what got sharper this
session, what is still vague, what is now on record. It uses what the engine already computes
(specificity, confidence, entries) — no new analysis.

**Guard.** No cross-party content in it, ever. Same discipline as the style memory: it may
speak about your own record and nothing else.

## F6 · Help the thin participant instead of only noting them — **M**

**Participant value #5.** Hafeezah — BASIC, distracted — did eight check-ins and the board
says *"nothing specific named yet."* Accurate, fair, and no use to her. She is exactly the
person a fairness-first product should serve best, and she is the one it currently observes
and leaves alone.

**Fix.** When a person's record stays non-specific across sessions, have the engine show
rather than ask: offer an example of what a checkable answer looks like in their own situation.
Do not grade them, do not warn them.

**Guard.** Never phrased as a deficiency; never visible to anyone else.

## F7 · Warn about the ground limit before the work, not after — **S**

**Ground 11.** `/grounds/new` renders the whole picker with no hint the org is at its cap.
Sahar picks a card, fills the setup in, and only then gets the 400.

**Fix.** Call the existing `GET /billing/can-create-ground` when the page loads; if she is at
the limit, say so above the picker with the upgrade route, before she invests the effort.

**Guard.** At 10 grounds, `/grounds/new` shows the notice; at 9, it does not.

---

# Wave 3 — Things that mislead

## F8 · "Unknown participant" on the Check-ins tab — **S**

Every session on the ground's Check-ins tab reads *"Session 3 — Unknown participant —
Completed."* The data is fine: every check-in row resolves to a user. The admin's main view of
who checked in cannot name one person. **Fix:** resolve the participant name in that list.

## F9 · Confidence dressed up as progress — **S**

The sidebar renders **"100% · 13/13 sessions"** ([AppShell.tsx:515](../../../client/src/components/gw/AppShell.tsx)).
The 100% is alignment confidence (5/5); the fraction is sessions. On the raise ground it reads
**"40% · 1/1"** — complete, and 40%. On one screen the same ground is also "5/5 Aligned" and
part of "260 sessions today".

**Fix.** Label it (`confidence 5/5 · 13 of 13 sessions`) or separate the two. Do not join
unrelated numbers with a `·`.

## F10 · "My situation is different" looks switched off — **S**

Grey with a dashed border and grey text, among white solid-bordered cards — the visual
language of a disabled control. It works when clicked. It is also the entry point for the
entire describe-your-own scenario. **Fix:** style it as an available choice.

## F11 · Stale time and empty ranges — **S**

*"90 days remaining"* on a ground whose thirteen sessions are all done. The board header
renders an unfilled date range literally as **"— to — · session 13"**. **Fix:** derive
remaining time from sessions completed, and suppress the range until both dates exist.

## F12 · The Admin menu item goes nowhere — **S**

Sahar's user menu offers **Admin**; `/admin` and `/admin/dashboard` both redirect her to
`/grounds`. Correct that an org admin is not a platform admin — wrong to show her the door.
**Fix:** render the item only for `isPlatformAdmin`.

## F13 · The profile explains a badge it does not carry — **S**

*"What does Two-party confirmed mean?"* with a full definition, on a profile with no such
badge — and none is possible until F1 lands. Below it, a **"Get started at myground.work"**
call-to-action shown to someone already signed in and inside the product. **Fix:** show the
explainer only beside a real badge; drop the acquisition CTA for signed-in users.

## F14 · Text defects on the roster — **S**

`"Led by Hafsah(set up by an admin)"` — missing space. The "· 1 member" beside it excludes the
lead, which is defensible but reads as undercounting a two-person ground. **Fix:** the space;
and label it "1 participant" or count the lead.

---

# Wave 4 — Sign-up and setup

## F15 · Sign-up is magic-link only and cannot complete without email — **M**

`/auth` offers password *sign-in*, but the only way to *create* an account is
*"New here? Get a sign-in link instead"*, which emails a link. With no SMTP, the account is
created and can never be entered. This is why Sahar had to be seeded.

**Fix.** Either add a password sign-up path, or make the email dependency explicit and
guaranteed in every environment. At minimum, a dev-mode link surfaced in the response so the
flow is testable at all.

## F16 · The account and organisation exist before the email is verified — **S**

Submitting an address immediately created a `users` row with `role = ADMIN`,
`is_email_verified = false`, and a brand-new organisation. Typing a stranger's address mints
an org in their name before they click anything. **Fix:** defer org creation to first
successful verification.

## F17 · The organisation is auto-named from the email, never asked — **S**

`brand.new.person@example.test` became **"Brand's workspace"**. A fine default; the admin
should still be asked, and be able to change it in Settings.

## F18 · The two pickers disagree — put every scenario card in both — **S, not M**

**Corrected finding.** I reported that four grounds had no matching card and called it the most
common blocker in the run. **That is wrong.** `CreateGroundPage.tsx` — the picker a signed-in
admin actually uses at `/grounds/new` — carries **all 18 cards**, including every one I said
was missing: advisor, contract renewal, recognition, workplan and budget, cohort check-in,
cohort onboarding, pulse check, board strategy, acute shock.

**What is true is narrower.** There are two pickers and they do not match:

| Picker | Cards |
|---|---|
| `/grounds/new` — signed in (`CreateGroundPage.tsx`) | **18** — the full scenario set |
| `/start` — anonymous entry (`EntryChatPage.tsx:217-295`) | **8** + describe-your-own |

The eight on `/start` are: new hire, new project, a new way of working together, setting shared
goals, a big decision, someone's work is off track, a project is off track, you and someone see
it differently. Ten scenarios are unreachable to a first-time visitor, including both cohort
cards — which is exactly what Grounds 15 and 18 were designed to exercise.

**Decision: the anonymous entry picker gets all of them too.** Not a reduced set for logged-out
visitors — the same situations, since the first-time visitor is precisely the person with no
account and no other way in.

### The eight situations to add to `/start`

`/start` currently merges co-founder and manager into "A new way of working together", and maps
"A big decision" to board strategy and "Someone's work is off track" to PIP. Those stay as they
are — their `message` strings are pinned by `entry-cards-routing.spec.ts` and must not move.
What is genuinely absent is eight:

| Add | Group | Covers |
|---|---|---|
| New advisor or board member | Starting something | `NEW_ADVISOR` |
| Onboarding a group | Starting something | `COHORT_CHECK` (onboarding framing) |
| Workplan and budget | Goals, plans and decisions | `WORKPLAN_BUDGET` |
| Board and leadership strategy | Goals, plans and decisions | `BOARD_STRATEGY` |
| Quick check-in | Keeping a regular read | `PULSE_CHECK` |
| Cohort check-in | Keeping a regular read | `COHORT_CHECK` |
| Raise, promotion, or recognition | A decision about someone | `RECOGNITION` |
| Contract or renewal | A decision about someone | `CONTRACT_RENEWAL` |
| A shock just hit | When something needs addressing | `ACUTE_SHOCK` |

That is 17 cards plus describe-your-own, matching `/grounds/new`. The two existing groups
("Starting something", "When something needs addressing") cannot hold them sensibly, so the
picker needs three more group headings — suggested above.

### Two things to be careful about

**Routing is by sentence, not by key.** Entry cards route on a natural-language `message` field
sent to the model as the person's first turn; `/grounds/new` routes on a `scenario` key. So the
new cards each need a written `message`, and `entry-cards-routing.spec.ts` pins the existing
eight with `toEqual` — it will need to become "the original eight are present and byte-identical"
rather than "these are the only eight", or it will fail the moment a card is added. **Do not
relax that spec into a weaker check** — it is the tripwire that stops a copy pass silently
changing where people get routed.

**The picker has a fold constraint.** Comments in the render note that suite L checks the whole
picker fits above the fold at 1280×720, and that the describe-your-own card deliberately sits in
the last grid's empty slot to keep it there. Seventeen cards will not fit the way eight do, so
this needs a layout decision — collapse groups, shrink cards, or accept scrolling — not just a
longer list.

**One structural note.** The two group blocks in the render are hand-copied sixty-line
duplicates differing only by their filter. That duplication is *why* the lists drifted. Whoever
does this should drive the render from a groups array so adding a card is a one-line change in
one file.

**Guard.** A test asserting every scenario offered at `/grounds/new` is also offered at
`/start`, so the two cannot drift apart again.

## F19 · "Ground" gets re-explained to the same person — **S**

Eric asked *"who reads this?"* in sessions 1 **and** 2 of the same ground; Hafeezah asked what
"ground" means in sessions 1 **and** 2. Both were answered well both times. The engine does
not remember it has already explained.

**Fix.** The `PersonStyleProfile` from the cross-ground work already carries
`needsPlainLanguage` and `asksWhoReadsThis`. Read them at session start so the answer arrives
before the question, and does not arrive twice.

## F20 · The self-block guard is not applied to the board's handoff panel — **S**

The board rendered *"Hafsah Jumare needs the budget line from Hafsah Jumare — Blocking."*

**Caveat, stated plainly:** my own test fixture generated that sentence, so the input was
absurd. But `blockerHasSubstance()` drops self-blocks on the read path and the WAITING ON
panel does not, so a real self-reference would render. **Fix:** apply the same guard there.

---

# No action — checked, and correct as built

| Finding | Why no fix |
|---|---|
| `Reports ready: 0` on the dashboard | Counts `REPORT_READY` grounds; correct. It stops being permanently zero once F1 lands. |
| Eric withheld at 0.31, Hafeezah shown at 0.15 | Deliberate: a card that only reports absence describes the record, not the person. [reads.ts:519](../../src/modules/board/reads.ts). |
| The PIP board has no contribution card | Your decision, working. Nobody on a plan gets a positioned read. |
| The report offers the lead "let them go" | Lead-only. Verified absent from the participant's payload. |
| The 404 page, Documents tab, feedback modal, join link | All work. |
| Checkout returning "Server error" | Environment: `STRIPE_SECRET_KEY` is a placeholder. Not a code defect. |

---

# Test gaps — my coverage, not the product's

These need a test run, not a fix. Listing them so they are not mistaken for passes.

| Gap | To close it |
|---|---|
| Grounds 11–18 never ran | Stripe test keys, then re-run. Includes the two you most wanted: the clinic cohort (15) and describe-your-own (18). |
| Org setup / "Save & invite" never driven | Needs F15 or a dev-mode link. |
| Onboarding → check-in transition | Same. |
| Adding a lead through the UI | Harness did it by API. |
| Adding a participant through the UI | Same. |
| In-chat document upload when the engine asks for evidence | Tab seen; the request never triggered. |
| Groundwork back-office (payments, usage, feedback) | Needs a platform-admin account. |
| Emails and notifications | No SMTP configured. |
| Payment screens | No usable Stripe key. |
| Per-page screenshots on all eighteen grounds | One thorough walk was done, not eighteen. |

---

# Order I would build in

1. **F4** (S) — one clause, unblocks the admin today.
2. **F1** (S) — wiring an already-built flow; the product gains an ending.
3. **F2** (S) — a pricing decision; the largest single move on participant value.
4. **F3** (M) — with F1, the participant finally receives something.
5. **F7, F8, F9, F10, F11, F12, F13, F14** (all S) — a day of correctness fixes that stop the
   UI misleading people.
6. **F5, F6** (M) — turn the participant's deal from extraction into exchange.
7. **F16, F17, F19, F20** (S) — correctness in sign-up and memory.
8. **F15, F18** (M) — sign-up path and the four missing cards.

**F4 + F1 + F2 is roughly two days** and moves admin value off 6.4 and participant value off
7.4 more than everything below them combined.

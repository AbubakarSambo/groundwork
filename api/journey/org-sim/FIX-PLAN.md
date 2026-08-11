# Fix plan — everything found in the 18-ground assessment

Every finding from [ORG-18-ASSESSMENT.md](./ORG-18-ASSESSMENT.md), plus the five changes that
would move participant value from 7/10 to 9/10. Nothing dropped: items that need no fix are
listed as **No action** with the reason, so the list can be checked against the assessment
line by line.

**Sizes:** S = under a day. M = a few days. L = a week or more. Sizes are for the change
itself plus its guard test.

---

# OUTCOME — all twenty worked through

Branch `gw-11-org18-fixes`. **666 API tests, 139 client tests**, every change that
touches a screen verified in the running app with Playwright.

| | Item | Outcome |
|---|---|---|
| F1 | Resolution has an entry point | **Built.** It was fully written and uncalled; this is the UI. |
| F2 | Participant paywall | **Removed.** Was shown pre-first-check-in, wired to a one-off call. |
| F2b | "Buy a session ($5)" | **No change — my error.** Already initiator-only, with the right message. |
| F2c | Contributor code | **Moved** inside the initiator branch. |
| F3 | Report waiting | **Partly built.** The in-ground prompt already existed; the grounds LIST did not. |
| F4 | Admin locked out of her board | **Fixed**, read-only, bite-checked. |
| F5 | Something back each session | **No change — already built.** 29 of 33 had a real solo artifact. |
| F6 | Help the thin participant | **Built.** After two thin sessions running, show an example. Bite-checked. |
| F7 | Ground limit announced early | **Built.** |
| F8 | "Unknown participant" | **Fixed.** Read `email`, which is null once someone has an account. |
| F9 | Confidence dressed as progress | **Fixed.** Now "4/5 aligned · 13/13 sessions". |
| F11 | Stale countdown | **Fixed.** Finished grounds say "every session done". |
| F12 | Admin menu item | **Hidden** from org admins. |
| F13 | Profile explainer + ad | **Removed.** |
| F14 | Roster text | **No change — my error.** A CSS margin my text dump had stripped. |
| F15 | Sign-up cannot complete | **No change — my error.** It completes; dev logs the link and `/setup` follows. |
| F16 | Org created pre-verification | **Deliberately not done.** The draft flow needs it; changing it is an auth redesign. |
| F17 | Org name never changeable | **Built.** PATCH /users/organization, admin only. |
| F18 | Two pickers disagreed | **Built.** All 17 situations at `/start`, one render loop, parity spec. |
| F19 | Jargon re-explained | **No change — my harness.** The style memory had recorded all three people correctly. |
| F20 | Self-block on the board | **Fixed.** |
| F21 | Picker no longer fits above the fold | **Built.** Count line + "scroll" in the opening, descriptions kept. |
| F10 | Describe-your-own looked disabled | **Built** (was wrongly marked superseded). Solid border, full-strength label. |
| F22 | Unverified accounts linger forever | **Built.** Daily sweep, only ever deletes a provably empty account. |
| F23 | Per-session billing still on screen | **Built.** Six surfaces removed; sessions are not sold. |
| F24 | Picker groups lopsided, short rows stretched | **Built.** 5/4/2/2/4, uniform card widths. |

## Six of my twenty findings were not product defects

F2b, F5, F14, F15, F19 were mine — my test rig, or reading source instead of
rendering the page. F16 is a real behaviour I now think should stay. F1, F3 and
F5 were all cases of a feature being **built and not wired**, which is worth naming
as a pattern in itself: the gap between "written" and "reachable" is where nearly
all of this lived.

## Two things found while fixing, not before

- A global 403 interceptor made **"Access denied" pop on every ground page** once
  the resolution query was added. Fixed with `skipForbiddenToast`.
- The **`/entry/commit` 400 on every signup was not a bug** and the entry is corrected.
  The client always attempts the commit and lets the SERVER decide whether there is
  anything to commit — the comment in `MagicVerifyPage` says the old client-side skip
  "stranded people on /setup". The 400 is `NO_ENTRY_SESSION`, which the client routes on.
  I had tested with `curl -d '{}'`, got a *different* 400 about missing fields, and
  assumed that was what the app hit.

## F21 · The picker outgrew the fold — decided and built

**The measurement made the decision.** At 1280x720 the seventeen-card picker runs 467px
past the fold. Dropping the "e.g." line saves 75px. Dropping the descriptions **as well**
saves 315px — and it is still 152px over. Fitting them all above the fold is not
expensive, it is unreachable.

**So the fold stopped being the constraint.** Buying 300px by cutting descriptions would
have traded away the thing that makes a long list usable: recognising your own situation
matters MORE as the list grows, not less. "Onboarding a group" and "Cohort check-in" are
only told apart by their descriptions.

**Built instead:** a count above the cards — *"17 situations, grouped. Scroll for the
rest, or describe your own at the bottom."* — and an opening line that says to scroll. The
second group heading falls at y=763 against a 720px fold, so content is visibly cut
mid-list, which is the strongest scroll cue available. Nothing is hidden behind a click.

### Decision recorded: the cards stay the primary route

I had flagged that with seventeen options the free-text box might become the faster path,
and that the picker could end up a fallback. **That is not the direction to take.** People
come to this page without a settled idea of what they need; the cards are how they find
out that "cohort check-in" or "contract renewal" is even a thing Groundwork does. A
free-text-first picker would serve the person who already knows the answer and abandon the
person who does not — which is most people, most of the time.

So: cards first, described properly, browsable. Free text is the catch-all underneath, not
the front door. Anything that makes the cards harder to read or skim is working against
the point of the page.



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

---

# OPEN — from the Ground 1 read-through, 9 August 2026

Everything below came out of reading a finished twelve-session ground as a person
would, rather than checking whether it rendered. Items marked **Done** were built
the same day; the rest are open, in the order they are worth doing.

| | Item | Status |
|---|---|---|
| G1 | Names, decided by who is reading. The report was written in "the initiator" and "participant A" while the same page named both people three times over. Names are now added back at the read for the reader entitled to them: the lead sees everyone, everyone else sees themselves and the lead. | **Done** |
| G2 | The court-case voice. Nine of ten alignment entries opened with "The record shows". The prompt now asks for plain sentences and the exact opener is stripped in code. | **Done** |
| G3 | The lead decides, the hire sees. A new hire was shown "Let them go" and asked to pick it, and the ground could not close until he did. Six scenarios with a subject are now lead-decides; peers still both have to agree. | **Done** |
| G4 | Say what a participant is. Each person gives their own account of the shared work, including their own part in it. Never a panel assembled to judge someone. | **Done** |
| G5 | Tell colleagues what they are joining, at the join point and in plain words. | **Done** |
| G6 | Never count the accounts. "Three of the four described the same delay" is a verdict by arithmetic. Forbidden in the prompt, detected and logged if it slips through. | **Done** |
| G7 | The board in the tab row rather than one floating pill. | **Done** |
| G8 | The specificity signal read a record full of numbers as "low". Word-numbers, unanchored month matching, and missing completion words all fixed and measured. | **Done** |
| **G9** | **Say WHY a record scored the way it did.** A bare "low specificity" tells someone their account was thin without saying what would have made it fuller. The average stays (decided: it is the right summary), but the five dimensions behind it - delivery, evidence, enablement, coverage, commitment - should be shown, so the label becomes something a person can act on rather than a mark. | **Open (S)** |
| **G10** | **Nothing for the leader to weigh.** The report describes what happened and gives no help deciding. Built from their own words, shown at the close. Full spec below. | **Open (M)** |
| **G11** | **A fortnightly ground offers its next session immediately.** The cadence is decorative: you can finish a ninety-day ground in an afternoon. Soft gate rather than a hard block - show the date it opens, with a quieter way to start early that is recorded as early. Deliberately deferred until after the eighteen grounds, because gating on dates means the journey needs to simulate time passing, and that is the one simulated element it would have to declare. | **Open (M), parked by decision** |
| **G12** | **Google, end to end.** The logic is built and tested at the seam, on both the sign-in flow and the entry flow. The handshake itself has never run, because no credentials are configured. Not covered until it has been. | **Blocked on credentials** |
| **G42** | **The coaching tables are in the database and nothing writes to them.** `coaching_states` and `ground_baselines` ship with the migration, `COACHING_ENABLED` defaults off, and no code path fills either one. Deliberate, so the schema lands before the behaviour, but it means the wall tests prove the absence of a leak in a feature that has never produced a single row. Not covered until a real multi-session trace has run with the flag on. Also unfinished underneath it: signal depth exists for MANAGEMENT only, the other eight role maps have none, and Phase 3 is not wired. | **Open (L), gated off** |
| **G44** | **The report speaks in field names.** "Where you see it differently", "the question this turns on", "3 agreed, 1 still open" are what the product prints, and they read as jargon to anybody who has not used it. The marketing site now shows the plain versions - "Where the team saw it differently", "The one thing to settle first", "3 things settled, 1 still open" - so the site is briefly ahead of the product. The report itself should catch up rather than the site quietly promising a voice the product does not have. The same entry now covers a second gap found the same way: the marketing panel opens on a **consequence line** - what the gap costs and when it was caught, against when it would otherwise have surfaced - because a category heading like "where you see it differently" leaves a chief executive to assemble the consequence themselves. The engine produces the divergences, the owner gap and the closing question, but not that summary line. It should. | **Open (S)** |
| **G45** | **The never-count rule has no cohort exception.** "Four of the six described the same delay" is a verdict by arithmetic on shared work, and `countsAccounts()` detects it. On a COHORT it is the opposite: fourteen people who have never met, given the same induction, and nine of them describing the same rule the same wrong way - the count is the diagnosis, and it points at the briefing rather than at anybody in it. A correct cohort report would trip the detector today. The detector needs to know `peopleWorkTogether`, and the synthesis prompt needs to permit counting in exactly that case and nowhere else. | **Open (S)** |
| **G43** | **The tests were the weak part, not the code.** Ground 1 took ten runs, and four separate times a check could not have failed: a run passed having done one session of twelve, a landing check counted clicks rather than arrivals, then counted words the chat echoes locally before anything is stored, and a guard used a case the code could never see. The habit that caught all four is breaking the fix first and confirming red. It is not optional on the remaining grounds, and it is worth applying backwards to any guard written before it became the rule. | **Standing practice** |


## G10 in full: what a leader can weigh, and where it goes

### The problem

A ground is opened to answer a question, usually "should we keep going with this
person or this work". Twelve weeks later the report tells the story accurately
and readably, and then the decision is made against prose. Nothing lays out the
thing actually being decided.

### What it is

One section, built ENTIRELY from words the parties already gave, in three parts:

1. **What you said doing well means.** The lead's own SUCCESS_DEFINITION entries,
   quoted back. On the ground this came from, that was "I can hand him a messy
   client problem and not think about it again. Judgement, not just delivery" and
   "owning at least one client relationship end to end by month three", both
   recorded twelve weeks before the decision.
2. **What the record holds on that.** The entries from every account bearing on
   it.
3. **What nobody has evidence for.** Parts of the stated definition the record
   never touched, and claims no other account or artefact supports.

### What can be weighed, and what cannot

Weighable, because each is either the person's own standard or something someone
put on the record themselves:

- SUCCESS_DEFINITION: the yardstick, from each party separately. The whole point
  of this ground was that hers said judgement and his said queue.
- COMMITMENT and TIMEFRAME: what was promised, by when, and what the record says
  next. Checkable in a way an impression is not.
- ASK: what someone asked for and never got. His was implicit for six weeks -
  nobody had told him he could own a client - which is a fact about the manager
  as much as the hire.
- TOLERANCE: where a person's line actually is. Most useful exactly at a decision.
- WORRY, both sides. Hers, that he was not taking ownership. His, that a falling
  ticket count looked like failure. Neither said it to the other, and that is the
  most decision-relevant thing in the ground.
- TENSION: where the work rubbed, in their own words.
- The divergence and its atStake: what happens to the WORK if this holds.
- Agreements: where a decision usually already lives.
- Movement across sessions: session 1 against session 12. Here the change was not
  gradual; it happened the week she said what she meant.

**Never weighable, and deliberately absent from the screen:**

- The specificity label. It measures how a person WRITES, not how they work.
  Someone plain-spoken scores low and someone who lists numbers scores high, so
  using it as a proxy for performance would be exactly the quiet unfairness this
  product exists to prevent. It belongs to the person as feedback on their own
  record. See G9.
- Session counts and participation. Turning up is not contribution, and a report
  that treated activity as alignment has already been found wrong once.
- Anything a colleague said, attributed to them. The substance can be weighed;
  testimony cannot be handed over.
- The pattern feed as findings. Those are shapes worth asking about, not
  conclusions.

Express the exclusions BY OMISSION. Do not put a "what not to weigh" list on the
screen: it draws attention to precisely the thing it warns against.

### Where it goes

**On the overview, at the close, beside the resolution panel.** That is the moment
it serves, and the decision panel currently has no material next to it.

**Not before the closing round.** The overview is seen every week of a ground. A
"what to weigh about this person" panel sitting there from week two turns every
visit into an evaluation exercise and invites a verdict long before the record can
support one.

**One source, not two.** If it renders on the overview and again in the report
they will drift, and two versions of "what the record holds" inside a decision
about someone's job is worse than one. Build it once; render it once.

### Open question for Hafsah, not to be decided in code

**Does the subject see it too?**

Everything in it comes from shared record entries and the lead's own stated
definition, so there is nothing in it the subject has not effectively seen
already. For: they learn what the decision was actually measured against, which
is the fairest version of being assessed. Against: "what your manager is weighing
about you", read alone the night before a decision, is a heavy thing to hand
someone with no conversation attached.

A middle option is the same content under a different frame for them, closer to
"what this ground was measured against" - true, useful, and not addressed at them
as a subject.

**Recommendation: show them, under the neutral frame.** The premise of the whole
product is that nobody is assessed from material they cannot see. But this is a
judgement call about how it lands, not a technical one, so it waits for a decision
rather than being settled by whoever writes the component.

### Care

- Do not silently reframe the definition. If she said "judgement" and the record
  holds delivery, delivery must not be presented as evidence of judgement.
  Wrong-but-tidy is the failure mode.
- An empty "no evidence for" list means the record does not cover it, never that
  there is nothing to worry about. Word it so it cannot be read the second way.
- It informs the decision. It must never become a checklist someone feels obliged
  to satisfy.

### Why it comes last

It leans on record entries being right, which needed the extraction fix, and on
the specificity signal being honest, which needed G8. Building it on either while
broken would bake the error into the thing someone uses to decide about a person's
job.


---

## G37. A ground can be created off a single sentence

Seen live, 9 August 2026, on a clean Ground 1 run. The whole setup conversation:

```
person:  I have a new hire starting and want to make sure we set clear
         expectations from the beginning.
engine:  That's a great way to get things started on the right foot. Who is the
         new person you'll be working with?
person:  Abubakar. He's joining as a delivery lead, starting Monday.
engine:  Thank you. That gives me what I need to set this up for you.
```

That was the entire thing. The engine never asked her role, never asked why now,
never asked how long it runs or how often people check in - a rule that was added
to the prompt earlier the same day and did not fire. The header then read
**"1 session planned"** on what was meant to be a ninety-day ground.

**Why it happens.** The path buttons appear when `ready` is true, and `ready` is
`mode && initial && whoInvolved && decision` from an extraction that runs
alongside each reply. The extraction can fill all four optimistically from one
sentence, so the gate opens whatever the engine has actually asked. The wrap-up
instruction and the readiness gate are two different mechanisms and only one of
them controls the screen.

**Why it matters more than it looks.** Everything downstream is measured against
what was captured here. A ground built from one sentence has no duration, no
rhythm, no sense of who else the work depends on, and no stated definition of
doing well beyond a job title. The report at the end is then asked to support a
decision about somebody's job.

This is the strongest single argument for section A and B of this plan. It also
means the readiness gate needs to consult what was ASKED, not only what was
extracted, or the context interview can be skipped by an optimistic extraction in
exactly the way the setup conversation just was.

**Open (S for the gate, and section A/B for the rest).**


---

# CONTEXT, WORRIES AND PRIVACY

## G38. Open context and closed context, named as such

Two destinations, and naming them makes the rule explainable to a user rather
than only to us.

**Open context** is the ground's shared page. What this is for, what has to be
true for it to work, who is in it and why, what everyone can see. Every party
reads the same thing.

**Closed context** is the lead's own. Their read of the situation, what they are
worried about, the things that should shape what gets probed. It never appears in
a report, is never quoted, and is never attributed to anyone.

The precedent already exists: the synthesis prompt treats lead-supplied context as
direction and never as a claim (rule 13). This makes that split a first-class
thing a person can see and reason about, instead of an internal convention.

## G39. Ask what they are worried about, per person and per scenario

The real reason a ground exists is usually a worry, and it is usually unsaid. A
manager opening a new hire ground is rarely curious in the abstract; they have
noticed something. Asking directly, into CLOSED context, surfaces the thing that
should shape the probing.

Per scenario, because the worry on a new hire ground is not the worry on a
cofounder ground, and a generic question gets a generic answer.

**This is the most prejudicial data in the system** and the guarding is the whole
design. One person's private, unverified concern about a named colleague,
recorded before that colleague has said a word. Three rules, and after two
prompt-only guardrails leaked in a single day, all three are structural:

1. It never enters a report, quoted or paraphrased, in any form.
2. It never reaches the person it is about, including through the post-report
   guide.
3. It steers what gets ASKED. It never becomes a finding.

Get this wrong and the product becomes a place to file private complaints about
colleagues, which is the worst possible version of it.

**DECIDED, 9 August 2026: the person it is about is NOT told that private
context exists.**

The reasoning, and it is sound: being told a note exists that you cannot see
creates worry with no remedy, and it would change what someone writes in the very
check-in the note is meant to inform. A person who suspects they are being
written about writes defensively, and a defensive account is worth less than no
account. Guarded means guarded.

**Two consequences that follow from that decision, and both raise the bar rather
than lower it.**

First, the three rules above stop being good practice and become the only thing
protecting the person. They cannot object to what they cannot see, cannot correct
it, and cannot weigh it. Every one of them must be structural, tested, and
bite-checked, because there is no human backstop behind them.

Second, a data-protection note, stated accurately and flagged once rather than
to reopen the decision.

An opinion one person records about an identifiable other person is personal data
about BOTH of them. The author's identity and their own wording belong to the
author and are routinely redacted. The substance, being information relating to
the person it describes, falls inside the scope of a request from that person.
This is not a grey area: the definition covers "any information relating to" an
identifiable person, and opinions about someone are explicitly included.

In practice that means IN SCOPE BUT HEAVILY REDACTABLE. Somebody making a request
would not be handed their manager's note. They might receive the substance with
the source removed, and some regimes allow withholding altogether where
disclosure would prejudice management planning.

So the exposure is not "someone finds out we hid it". It is that a request may
arrive and an answer has to exist. Two things worth deciding separately, later,
neither of which blocks building this:

  - Keep closed context to the WORK and the SITUATION rather than to assessments
    of a person. Better material for steering probes anyway, and it narrows what
    any request would reach.
  - Know what the answer to such a request is before the first enterprise
    customer asks, rather than during.

## G40. Say what happens to what people write, before the first question

Not a footer, and not only copy. People write differently depending on what they
believe happens next, so this determines the quality of the record itself. It
belongs before anyone is asked anything.

**What is true today, and all of it is testable:**

- Nobody in your organisation can read what you write. Not your manager, not the
  person who set the ground up, not an admin.
- Our own support tools cannot show it either. When we look at a ground to help,
  we see whether people checked in, never what they said. This is enforced and
  tested: the platform-admin view excludes raw turns, record entries, solo
  artifacts, lead context notes and the report body, and the test poisons the
  query with all of them to prove none leaks.
- Nothing anyone writes is used to train models.

**What must NOT be said, because it is not true today:** "we cannot see your
conversations". Turns are stored unencrypted in Postgres, so anyone with database
access can read them, and transcripts are sent to Google for processing through
Vertex. A founder or investor who asks one technical question finds this out, and
a privacy claim caught being false costs more than never making it.

## G41. Make the stronger privacy claim true

To say "we cannot see your conversations" and mean it:

- Encrypt conversation turns and record entries at rest, so a database dump is
  useless without the key.
- Decide and document who holds the key and under what circumstances it is used.
- Account honestly for processing: content reaching Google through Vertex is a
  real limit on any absolute claim, and it should be stated rather than omitted.

Worth doing on its own merits. It is also the only route to the sentence you
actually want to write.

**Open (L). Nothing here blocks G40, which is true today as written.**


---

## Thresholds, deliberately untouched

The specificity SCALE may still be wrong. It was left alone because changing a
scale to make one record come out better is how you get a differently wrong
answer. Fix what the scorer can see first, gather more grounds, then look again.


---

# THE REALITY ENGINE PASS

Everything below came from reading The Reality Engine manifesto against Groundwork,
line by line, plus the Ground 1 read-through. The manifesto is for a different
product; what transfers is its Reality Engine, and what does not is its Behaviour
Engine. That division is at the bottom and it is not a matter of taste.

The worked example throughout is the twelve-session new hire ground run on
9 August 2026. Hafsah's definition of doing well was judgement and client
ownership. Abubakar's was clearing the ticket queue, because it was the only
number anyone had named. Six weeks were lost. Everything here is measured against
whether it would have surfaced that in week one.

---

## A. New objects in the record. Everything else reads these.

These are data model changes, not screens, and they upgrade every future report
rather than adding a panel to the end of one. Build order matters: this section
first.

**G13. An objective per person, not one per ground.**
Today a ground holds one success definition and it belongs to the lead. Abubakar
never had an objective of his own, so he inferred one. That is not a
communication failure, it is a missing field: nowhere in the system was there a
place for "what success looks like for Abubakar, stated to Abubakar". With this,
the week-one report can show that his objective and hers do not connect, which is
the entire finding, twelve weeks early.

**G14. Current reality, captured as a baseline.**
"Why now" is captured; "where this stands today" is not. Without a baseline the
report can only show where accounts differ from each other, never distance
travelled. The arc is the product's core value and it is currently inferred from
session 1 by accident rather than recorded on purpose.

**G15. Conditions required.**
The missing middle between the desired future and twelve weeks of check-ins. On
the worked example: give him a client, tell him it is his to own, tell him
throughput is not the measure. All three were the manager's to supply and all
three were absent for six weeks. Named at setup, that is an unmet condition
visible in week one instead of a misunderstanding discovered in week seven.

**G16. Whether the conditions actually exist.**
From "determine whether supporting teams already exist". A readiness check on
reality, not on information. Is there a client available to give him. Does an
onboarding process exist. Is there anyone to hand over from. If the answer is no,
the objective is not reachable and the ground is about to measure someone against
something the organisation never provided. A different kind of gap from a missing
answer, and more serious.

**G17. Who is required, not just who is involved.**
Groundwork asks who is part of this. The manifesto asks who the objective depends
on. This is the principled answer to whether colleagues get added: you add the
people the outcome depends on, and their absence becomes a visible risk rather
than an unnoticed hole.

**G18. Learning required.**
What this person needs to know for the objective to be reachable. For a new hire
this is most of the job. On the worked example the thing he needed to learn was
never named: that ownership was the measure. Recorded, its absence is trackable.

**G19. The gap between now and the goal, as its own axis.**
Groundwork computes the gap between PEOPLE. The manifesto's capability gap is
between NOW and the OBJECTIVE. Two people can agree perfectly and still be
nowhere near the goal, and today the report cannot say so. For a leader deciding
something this is often the more useful axis.

**G20. A living contribution record, which is not a capability profile.**
I first rejected "living capability profile" outright as a persistent score on a
person, and any grading version stays rejected. But a living record of what a
person is here to contribute, updated as it changes, is role clarity rather than
a score, and it is exactly what Abubakar did not have. The two were thrown out
together and should not have been.

---

## B. How the context gets gathered

**G21. An interview, after setup, not a longer setup.**
Setup stays light because that is where someone decides whether this is worth
their evening. The depth arrives once the ground exists and they are invested.
The frame is the manifesto's: the AI INTERVIEWS the lead. It drives, follows up,
and decides when it has enough, the way a check-in already does and setup does
not. Needs a stop condition: target list, ask once, accept a vague answer, move
on, and say plainly what is still unfilled rather than nagging.

**G22. "What would change your mind", asked in week one.**
The highest-value single question on this list. "I would keep him if he owns a
client end to end by month three", recorded before anything has happened, is the
standard the week-twelve decision is measured against. She set it, before she
knew the answer, so it cannot be accused of moving.

**G23. Recommend the materials, do not only accept them.**
The manifesto recommends onboarding materials rather than waiting for uploads.
For a new hire ground that is the role description, the team's current
priorities, and whatever the last person in the role left behind. It also makes
the strength read concrete: not "your context is thin" but "you have not given us
the role description".

**G24. Documents extracted into context, with four hard rules.**
1. A document is CONTEXT, never an ACCOUNT. A job description is the
   organisation's claim, not a party's account of how the work is going. Nothing
   extracted is ever quotable as someone's position or usable as evidence inside
   a divergence. If this leaks, the independent-accounts premise collapses.
2. Who uploaded it is part of what it is. A lead's role description is visibly
   the lead's standard, not neutral fact. "Hafsah set these" and "the conditions
   are" read differently and only one is true.
3. Upload asks where it goes, and defaults to private. Shared ground context and
   private lead context are different destinations. A performance plan dropped
   into shared context would happen in the first hurried week.
4. Extraction is inference, so it is confirmed rather than adopted. Same rule as
   the cadence: propose it, show it, let them correct it.

**G25. The context strength read.**
Not a test and not a score. A statement of what this ground will and will not be
able to answer, given what it holds:
   "The report will be able to show where your accounts differ and what each of
    you meant by doing well. It will not be able to tell you whether the
    conditions you set were met, because none have been named. It will not be
    able to say whose work this depended on, because only you and Abubakar are
    in it."
It is about the product's limits, not the person's competence, and it makes
reading the context section motivated rather than obedient. Never mandatory,
never graded, revisited whenever the context changes.

---

## C. What people see, and when

**G26. A context page, one per ground, the same page for everyone.**
What this is for, what was said would have to be true, who is in it and why, what
everyone can see. It also gives documents somewhere to belong instead of a
Documents tab nobody opens.

**G27. Purpose before performance, as an ordering rule.**
"Every participant begins by understanding why they matter BEFORE being asked to
perform." This is sequencing, not content. Today the join flow takes a name and
drops someone into a check-in, with the explanation arriving alongside the ask if
at all. Reversing the order costs nothing and changes what people write.

**G28. Light participant onboarding: four things, one screen.**
What this ground is for in the lead's words. Why you specifically, which is where
G17 earns its keep. What happens to what you write. What you will see and when.
Then a link to the context page for anyone who wants more. Nothing front-loaded.

**G29. Check the participant path on a phone.**
"Mobile-first experience for every participant." Participants are the people most
likely to check in from a phone between other things, and the flow has only ever
been driven at 1280 wide. Unverified, so it goes on the list as a check rather
than a claim.

---

## D. Protecting the picture

The manifesto names five mechanisms: evidence provenance, explainability,
contradiction detection, independent validation, continuous revision. Groundwork
has parts of three.

**G30. Confidence, not certainty.**
Reframe specificity and verifiability as confidence in the PICTURE rather than a
mark on the PERSON. Same measurement, pointed at the right object, and the
cleanest answer to G9. "Low specificity" reads as a judgement of someone;
"we are not confident this part of the picture is complete" is the same fact
without the verdict.

**G31. Provenance at the point of a claim.**
Inferences are already separated from quotes. What is missing is showing, where
something is read, that it came from one account in session 4 and nothing else
supports it. This is the honest basis for G10's "what nobody has evidence for",
and it makes the report harder to over-read.

**G32. Contradiction inside one person's own record, across sessions.**
Divergence between parties exists. A party contradicting themselves between
session 3 and session 9 does not surface, and on a long ground it is at least as
informative. Not as a gotcha: as something worth asking about.

**G33. Continuous revision, stated as such.**
"The organisation must continuously reconstruct reality rather than assume it
already knows it." Reports are regenerated but presented as settled. A report
should say what changed since the last one and why, so the picture is visibly
alive rather than replaced in silence.

**G34. Harder to fool, INCLUDING BY ITSELF.**
The manifesto's success condition, and the half that gets forgotten. The lead
deceiving themselves is the most likely failure in a workplace ground, and
Groundwork has no surface for it. Candidates: their own position changing without
them noticing, evidence they asked for and never got, a condition they set and
never supplied. On the worked example, all three applied to Hafsah, and the
product told her nothing about any of them until she said it herself in week
eleven.

**G35. A board that increases confidence without increasing accuracy is a
liability.**
"Dashboards often increase confidence without increasing accuracy" is a direct
warning about the team board. Every number on it should be answerable: what it
counts, what it excludes, and what it cannot see. Anything that cannot answer
that should be removed rather than left to look authoritative.

---

## E. What the decision gets

**G10** is specified in full above and is unchanged, except that it now consumes
G13 (each person's objective), G15 (conditions), G19 (the gap to the goal) and
G22 (the pre-registered standard). It is last because it reads everything else.

**G36. Trade-off clarification.**
From the Behaviour Engine, and one of the few things in that chapter that is not
manipulation. Helping someone SEE the trade-off they are already making is not
steering them: "keeping the queue clear and expecting client ownership in the
same quarter are in tension, and nothing in the record says which one gives".
Naming a tension is inside the guardrail. Pushing toward a resolution is not.

---

## F. Deliberately not taking

The Behaviour Engine, with one exception noted at G36.

Loss aversion to prevent decay, endowment effect to build ownership, urgency tied
to consequences, social reinforcement, small wins and momentum, risk-aversion
coaching, personalised coaching for every role, living capability profiles as
scores, game theory for coalitions.

In a campaign these are legitimate persuasion among people who chose to be there
for a shared goal. In a workplace record they engineer the behaviour of somebody
who did not choose to participate, inside a system their manager controls, that
may inform a decision about their job. It fails the same test as scoring them,
from the other side: rather than judging the person, you steer them.

**The line: take the Reality Engine, leave the Behaviour Engine.**

Relationship mechanics (trust and reciprocity tracking, introduction pathways,
emerging influence, who to meet and when) are campaign machinery and do not
transfer. Two cousins already exist here in a legitimate form and should be left
where they are: waiting-on handoffs are the bottleneck idea, and a ground going
quiet is the decay idea.

---

## G. Open decisions. Mine to implement, not to settle.

1. **Does the subject see G10?** Recommendation on record: show them, under a
   neutral frame ("what this ground was measured against"). The premise of the
   product is that nobody is assessed from material they cannot see. It waits for
   a decision rather than being settled by whoever writes the component.
2. **Do conditions and required people get asked at setup or in the lead's first
   check-in?** Instinct is the first check-in, to protect the funnel. Settled by
   whoever knows the funnel.
3. **The vocabulary sweep.** "The record", "your account", "on record" run
   through the whole product. Currently only the lines people meet at the door
   have been made plain. Whether to sweep the rest is undecided.

---

## H. Order, by what depends on what

1. Section A, the new objects. Nothing else works properly without them.
2. G21 and G22, the interview that collects them.
3. G23, G24, G25: materials, documents, strength read.
4. Section C: the context page, ordering, participant onboarding, the phone check.
5. Section D: confidence, provenance, contradiction, revision, self-deception,
   the board audit.
6. G10 and G36 last, because they consume all of it.
7. G9 folds into G30. G11 stays parked until after the eighteen grounds. G12
   stays blocked on credentials.

This is a programme, not an afternoon. Section A alone is the largest change to
the record since it was built.

---

# THE BUILD PLAN — every open item, in the order it should be done

Written 10 August 2026, after Ground 1 and Ground 2 both passed. Forty-two open
items, grouped into waves by what depends on what, with the approach for each
rather than a restatement of the problem.

## The rule that governs the big waves: one flag, default off, additive only

The coaching engine shipped behind `COACHING_ENABLED` and that turned out to be
the most useful decision on it. The flag is not a convenience, it is what makes
it safe to build something opinionated inside a product people are trusting with
private accounts: if the new behaviour is wrong in a way nobody predicted, it
goes off in one environment variable and the product is exactly what it was
yesterday.

Every wave below that adds a new surface gets the same treatment.

**What the flag has to mean, in all of them:**

1. **Off is the old product, not a degraded one.** No empty tab, no disabled
   button, no "this feature is unavailable". With the flag off, the Context tab
   is the Documents tab exactly as it is today.
2. **Additive only.** New tables and new columns, never a changed meaning for an
   existing one. Nothing that exists today may start behaving differently when
   the flag is on, or turning it off would not restore anything.
3. **Off is the default,** in code, not only in .env. A missing variable is off.
4. **The kill switch has its own test.** Not "does the feature work" but "with
   the flag off, does the old path still produce exactly what it produced" -
   which is the thing you actually need at the moment you reach for it.
5. **Write paths gate too, not just reads.** A flag that hides a surface while
   still writing to it leaves a half-populated database behind when it goes off.

---

## Wave 0 — things that are untrue or uncommitted (hours)

Nothing here is a feature. It is the set of things that are wrong on a live page
or missing from git, and every one is small.

| | Item | Approach |
|---|---|---|
| N7 | Nothing is committed | Several commits, split by subject, in the pattern already used on this branch |
| N1 | "Groundwork never shares individual answers" is false | The report quotes people with session numbers. Replace with the true and stronger claim: it quotes what people said about their own work, and never says who said what about anybody else. Add a guard test that reads the live copy against the report schema |
| N2 | "The same picture goes to everyone in it" is wrong for a cohort | The product is already right (`viewerIsLead \|\| isSelf \|\| isLead`). Make the copy conditional on the scenario, or state it as the rule it actually is |
| N3 | `leadershipGaps` rendered by nothing | Decide: show it to the lead on the report page, or stop producing it. Do not leave a field the synthesis fills and nobody reads |
| G44 | The report speaks in field names | The plain labels are already on the marketing page. Move them into the report schema descriptions and the client, so the site stops being ahead of the product |
| G45 | Never-count has no cohort exception | `countsAccounts()` takes `peopleWorkTogether`. Counting is a violation on shared work and the finding on a cohort |
| G40 | Say what happens to what people write, before the first question | One screen before the first check-in question, not a link. Three sentences: who reads this, who never does, what leaves this page |

---

## Wave 1 — prove what is already built (one journey run)

Thirteen fixes went in without a live run behind them. Before anything new is
built on top of them, they get exercised.

| | Item | Approach |
|---|---|---|
| P1-P13 | The session's fixes | Re-run Grounds 1 and 2 into one org. Assert per fix, not by eye: a participant's report payload carries no other party's specificity, the guides exist after eight sessions, no completion 400s |
| N5 | No journey has ever uploaded a document | Add a real upload to the participant path. `documentsAttached` has been 0 in every run, so document-backed coverage is entirely untested |
| G29 | The participant path on a phone | Run the participant half of the journey at 375px. Participants are the people most likely to be on one, and nothing has ever checked it |

---

## What Wave 1 found before it finished

Recorded here rather than only in a commit message, because two of these are the
kind of thing that comes back.

**A floating help button on top of a field somebody is typing in.** Both bottom
sheets in a check-in - paste text, and the document context question - sat at
`zIndex: 50` while the help button is fixed at `8000`. At 375px the "?" landed
directly on the textarea's right edge. Nothing had ever driven the participant
path at a phone width, and participants are the people most likely to be on one:
they get a link in an email and open it wherever they are. **G29's first look
found it.**

**Attaching a document is two steps, and the second one is the product being
right.** Choosing a file opens a sheet asking "what context does this document
support from what you have shared so far?" - because a document is CONTEXT and
the person attaching it says what it is for. Worth knowing before Wave 2 builds
on it: that question already exists, and G24's four rules have somewhere to live.

**`documentsAttached` was 0 in every run of every ground because nothing had ever
uploaded one.** A number that is always zero looks like a working feature
reporting honestly, which is exactly why it survived. The upload, the context
sheet, the extraction and the document-backed percentage the board and report
both quote had never been exercised end to end.

**Two of the failures were mine and both were the same shape.** Running the
journey twice into one database made the second run get the RETURNING screens,
correctly, and read as a product defect - Ground 1 now asserts the org is empty
before it starts. And leaving the phone width on past the participant's check-in
made the lead click a sidebar that was correctly collapsed behind a hamburger.
Playwright said so in as many words: "locator resolved to <span>New hire</span>
... element is not visible". Neither was the product.

---

## Wave 2 — CONTEXT, behind `CONTEXT_ENABLED` (the largest, and the one that changes the product most)

Seven items that are one thing seen from seven angles. Today the whole of context
is a 500-character textarea labelled "Context notes" on a Documents tab, and every
document is private to whoever uploaded it - which means the lead's job
description, strategy paper or grant terms reach nobody.

**Step 1. The Documents tab becomes the Context tab, and visibility becomes a
property rather than an accident.**

| | Who sees it | What it holds |
|---|---|---|
| Open context | everyone in the ground | what this is for, what has to be true, the documents everyone works from |
| Closed context | the lead only | what they know that is not everyone's to read, including anything about a person |
| Your own evidence | you only, as today | what you attach to back your own account |

`GroundDocument` gains a `visibility` column defaulting to the current behaviour,
so existing documents keep being private and nothing shifts under anyone.

**Step 2 (G24). Documents are read into context, under four hard rules.** A
document is CONTEXT and never an ACCOUNT. It cannot corroborate a person. It
cannot become evidence in a divergence. What it contributes is visible as having
come from a document, with the document named.

**Step 3 (G38). Open and closed context, named as such in the interface**, so
nobody is guessing who reads what. The distinction is the reason people will put
real context in at all.

**Step 4 (G39). Ask what each person is worried about**, per person and per
scenario, heavily guarded. A worry is closed context by default and never appears
in a shared report. Its subject never learns it was said.

**Step 5 (G25). The context strength read.** Not a score. A statement of what
this ground will and will not be able to tell you, given what it has - shown
before the first session, when it can still be fixed.

**Step 6 (G26). One context page per ground, the same page for everyone**, with
the closed part visibly absent rather than silently missing.

**Step 7 (G37, G23). The context chat.** It probes for what setup did not
capture, and recommends the materials rather than waiting for uploads. This is
what stops a ground being created off one sentence, which is a live defect: a
real Ground 1 run produced a ninety-day ground from a single answer with no
duration, no rhythm and no sense of who was involved.

**The flag:** off, the tab is Documents, documents are private, no chat, no
worries, no strength read. On, all seven. The kill-switch test asserts the old
tab renders and the old upload path behaves identically.

---

## Wave 2, as built

`CONTEXT_ENABLED`, off by default, off-is-the-old-product asserted as a property
rather than claimed.

| | Item | Where |
|---|---|---|
| **G24** | Four rules. A document is context and never an account; who uploaded it is part of what it is; upload defaults to private; extraction is confirmed rather than adopted | `a-document-is-context.ts` |
| **G25** | What this ground can and cannot tell you, above the upload, worded as a limit rather than a mark | `what-this-ground-can-tell-you.ts` |
| **G38** | Open and private, named on the row, only the uploader can move a document, CLOSED not offered to anybody | `documents.service`, `GroundAdminPage` |
| **G26** | The tab is Context when there is context in it | `GroundAdminPage` |
| **G39** | A worry reaches two surfaces out of six, its author reads it and nobody else, and a leak detector runs on output | `a-worry-steers-questions-not-findings.ts` |
| **G27, G28** | Four things on one screen at the join point, purpose before effort, asserted as an ORDER | `InvitePage` |

**Three things it found on the way.**

`participantId: null` in a Prisma where matches every ORPHANED document, and
documents get orphaned because the participant relation is `onDelete: SetNull`.
Found by testing the query against the predicate for every combination rather
than against hand-written expectations. The rule had it right; the query did not.

The flag read could THROW where config was unavailable, which is worse than a
wrong flag: the ground page would 500 rather than quietly showing the old
product, the exact opposite of what a kill switch is for. Off by default has to
include off when we cannot tell.

Attaching a document is already two steps, and the second is the product being
right: it asks what context the document supports. G24's four rules have
somewhere to live that already exists.

**Still open in this wave.** G37 and G23 - the context chat that probes for what
setup did not capture and recommends the materials rather than waiting for
uploads. It is the largest single piece left in Wave 2 and the one that needs a
live model in the loop, so it wants its own run rather than a corner of this one.

---

## Wave 3 — OBJECTIVES AND BASELINE, behind `OBJECTIVES_ENABLED`

G13 to G19 are one body of work. Every one of them is a consequence of the same
missing thing: a ground has one success definition, it belongs to the lead, and
there is no record of where things stood on day one.

| | Item | Approach |
|---|---|---|
| G13 | An objective per person | Each participant states what they are trying to achieve. The lead's is one of them, not the ground's |
| G14 | Current reality as a baseline | Captured at setup and frozen. Without it nothing can show movement, only position |
| G19 | The gap to the goal as its own axis | Distinct from the gap between people, which is all the product measures today |
| G15 | Conditions required | What has to be true for the objective to be reachable - the missing middle between the goal and twelve weeks of check-ins |
| G16 | Whether those conditions exist | A readiness check at setup, not a judgement later |
| G17 | Who is required, not just who is involved | What the objective depends on, which is often somebody nobody invited |
| G18 | Learning required | What this person needs to know for the objective to be reachable |

Built in that order: the objective and the baseline first, because the other five
are all relative to them.

---

## Wave 4 — CONFIDENCE AND PROVENANCE, behind `CONFIDENCE_ENABLED`

The honesty layer. This is where the product stops presenting a picture and
starts saying how much of it it can stand behind.

| | Item | Approach |
|---|---|---|
| G30 | Confidence, not certainty. **G9 folds into this** | Reframe specificity as confidence in the PICTURE rather than a mark on a person. The plain dimension wording is already done; this is the framing around it |
| G31 | Provenance at the point of a claim | Where a line rests on one account, one document, or an inference, say so on the line rather than in a footnote |
| G32 | Contradiction inside one person's own record | Divergence between parties exists; a person contradicting themselves across sessions does not. Handled as a question to them, never as a catch |
| G33 | Continuous revision, stated as such | The report is the current best reading, not a verdict, and says so |
| G34 | Harder to fool, including by itself | The half that gets forgotten: the engine must be able to be wrong about its own read |
| G35 | A board that raises confidence without raising accuracy is a liability | The design rule this wave is measured against, not a feature |

---

## Wave 5 — WHAT A LEADER CAN WEIGH, behind `DECISION_ENABLED`

Everything that helps somebody decide, which is deliberately last because it
leans on the record being right and the confidence read being honest.

| | Item | Approach |
|---|---|---|
| G10 | What a leader can weigh at the close | Full spec already in this document. Built from their own words, shown at the close, never a checklist |
| G22 | "What would change your mind", asked in week one | The highest-value single question on the whole list, and one of the smallest to build |
| G36 | Trade-off clarification | Where two things the ground wants are in tension, name the tension rather than scoring both |
| G20 | A living contribution record | Explicitly not a capability profile and not a persistent score on a person |
| G21 | An interview after setup | Setup stays light because that is where somebody decides whether this is worth their time |
| G27 | Purpose before performance | An ordering rule: everyone understands why they matter before being asked to account for anything |
| G28 | Light participant onboarding: four things, one screen | Small, and it is the first thing a participant ever sees |

---

## Wave 6 — carried, blocked, or somebody else's turn

| | Item | State |
|---|---|---|
| G11 | Cadence is decorative | Parked by decision until the eighteen grounds are done, because gating on dates means simulating time |
| G12 | Google end to end | Blocked on credentials |
| G42 | Coaching wiring: signal depth for eight role maps, Phase 3, a real trace with the flag on | Open, and gated off, so it harms nothing while it waits |
| N4 | The marketing page shows things the engine does not produce | Resolves as Waves 2 and 4 land. Until then it is a promise with a date on it |
| N6 | Grounds 3 to 18 | Written as the waves land, so each one exercises what was just built |
| G43 | The tests were the weak part | Standing practice, not a task. Break the fix, confirm red, restore, confirm green |

---

## What I would do first

Wave 0 in one sitting - it is hours, and one item on it is a false claim on a
live page. Then Wave 1, because thirteen fixes are currently unproven and
building on unproven fixes is how you get a bug you cannot locate.

Then Wave 2, which is the one that changes the product most, and the one where
the flag matters most.

---

## Live walkthrough findings, entry flow, 2026-08-11

Hafsah's own run through `/entry` as a manager with two reports (Daisy and Duke),
one client rescue story, up to the invite screen. Seven findings, all from the
rendered product rather than the code.

| # | Where | What happened | Why it is wrong | Size |
|---|---|---|---|---|
| **W1** | End of the setup chat | "Thank you. That gives me what I need to set this up for you." then straight into "How do you want to run this?" and then straight into the check-in | The handover from setup to check-in has no seam. Nothing says the setup is finished, nothing says a check-in is starting, and nothing says the check-in is the private one. A person who has just answered five questions cannot tell that the next question is a different kind of question. | S |
| **W2** | First check-in, close | The model invented a resolution: it named the client "Microchip Solutions" when she typed "microchipshit", and wrote "that demo led directly to the client signing up" and "that is rescuing a sale" from "they finally got a demo... and signed-up" | Two separate faults. Silently correcting a name means the record does not hold what she said, and the one thing this product promises is that it holds what people said. Upgrading "they signed up" to "your intervention rescued a sale" is the engine agreeing with the person it is interviewing, which is the exact behaviour the divergence machinery exists to make impossible. | **M, and it is the serious one** |
| **W3** | Private report, "People mentioned" | Microchip Solutions and Mass General are offered with "+ Add them", exactly like Daisy and Duke | They are clients, not people. The extractor is not distinguishing a person from an organisation, and inviting a client into a ground about your team's delivery would be a serious mistake made in one click. | M |
| **W4** | Throughout | "participants" and "contributors" used interchangeably | Two words for one thing, and the invite screen uses the second while everything else uses the first. | S |
| **W5** | Two screens | People can be added from the private report ("+ Add them") and again from the invite screen | Two places to do one thing, neither of which says whether the other has already been used. | S |
| **W6** | Invite screen | Labelled a performance improvement ground, with the HR notice | Fine, and correct - noted only to confirm it is deliberate. | none |
| **W7** | After "Done" | Nothing said the sign-up link had been emailed, and no Google option appeared | **Half real.** The missing confirmation is real and fixed: "Done" closed the panel and said nothing, on a flow whose entire next step happens in her inbox - and a panel closing is what Cancel looks like. The missing Google button is NOT a bug: it renders on `authMethods?.google` and this deployment has no Google credentials configured, which is deliberate, because a Google button without them is a link to Google's own error page. That is G12, blocked on credentials. | S, done |

| **W8** | Private report, "This isn't right - correct it" | The box says "we may ask a follow-up before the report updates", and the only control is **Send correction**. She typed "the dealine is wong" and it sent. | **Filed wrong by me, and the correction matters more than the finding.** I read this as the loop being missing. It is not: `submitReportCorrection` in EntryChatPage.tsx runs the correction through `entryApi.chat` and only regenerates the report on a natural close, exactly as designed. What she screenshotted is the state BEFORE sending. So the fault is legibility, not behaviour - "we may ask a follow-up" reads as a warning, next to a button marked "Send correction" that reads as final. Both now say plainly that this is a conversation, and the example is the one she gave: "the deadline is wrong" does not say what the deadline is. | **S, and it was S all along** |

**W2 is the one that matters.** The others are seams and wording. W2 is the engine
writing a better version of what somebody said and then putting it on the record
as theirs - a name that was never typed, and a causal claim ("led directly to")
that she did not make. Every guardrail built this week is about not saying more
than the record supports, and this is the engine doing it in the first session of
the first flow anybody meets. **W8 is next to it**, because the two are the same failure from
opposite ends: the engine adding what nobody said, and the product accepting what
somebody said without asking what it means.

---

## Found by the run itself, 2026-08-11

| # | Where | What happened | Why it is wrong | Size |
|---|---|---|---|---|
| **R1** | Sign-in screen | The form showed **"ThrottlerException: Too Many Requests"** in red, under the button | Nest puts its own exception CLASS NAME in the message, the global filter passed it through untouched, and the sign-in page renders whatever it is handed. At the one moment somebody is already stuck - they cannot get in - the product answers in the vocabulary of its own stack trace. Fixed in the filter, not on the screen, because otherwise every screen that shows an error needs the same fix and the next one added will not have it. It now says what to do: wait about a minute. | **S, done** |
| **R2** | The journey itself | A twelve-session run signs two people in and out about twenty-four times inside an hour, and trips the limiter around session eleven | The limiter is right, and this is not. Waited out rather than raised or disabled: turning it down for tests would mean the journey no longer runs against the product that ships - and R1 was only visible because the run hit it. | **S, done** |

---

## Inventory close-out, 2026-08-11

Everything on the G list that could be built has been built. What is left is left
for a stated reason, not because it was missed.

| Wave | Items | State |
|---|---|---|
| **1** | G1-G8, G29, G40, G41, G44, G45, G43 | Done, and proved on a live twelve-session run |
| **2** | G24, G25, G38, G26, G39, G37, G23 | Done, behind `CONTEXT_ENABLED` |
| **3** | G13, G14, G15-G19 | Done |
| **4** | G30, G31, G32, G33, G34, G35, and G9 folded into G30 | Done, behind `CONFIDENCE_ENABLED` |
| **5** | G10, G22, G21, G20, G36, G27, G28 | Done, G10 and G34 wired into the report read |
| **6** | G42 | Signals for all nine role maps, the state machine, the noticing, and both wire-ups. Behind `COACHING_ENABLED` |

**Genuinely open, and why.**

| # | Why it is open |
|---|---|
| **G11** | Parked by Hafsah's decision until after the eighteen grounds, because gating on dates means the journey has to simulate time passing, and that is the one simulated element it would have to declare. |
| **G12** | Blocked on Google credentials. The logic is built and tested at both seams; the handshake has never run because nothing is configured. Worth noting that her walkthrough found the visible half of this: the Google button is correctly absent, not missing. |
| **G42's live trace** | The machine is built, wired and tested, and no ground has yet run with `COACHING_ENABLED=true`. Until one has, the wall tests still guard a feature that has produced no rows in anger. This is the next run, not a build. |
| **N4, N6** | Grounds 3 to 18. Each is roughly an hour of live model calls, so they are runs rather than work. |

**Three flags, all off, all the same shape.** `CONTEXT_ENABLED`, `CONFIDENCE_ENABLED`,
`COACHING_ENABLED`. Off is the product as it shipped; each is read inside the rule
rather than at the call site; each fails to off rather than throwing; and each has
its own spec covering "TRUE" and " true", the two values that look correct in a
deploy dashboard.

**The lesson this batch kept teaching.** Four separate times, a guardrail written as
a word blacklist caught correct prose - "a weak basis for a decision", "They are not
doing any work in this picture" (the documents), "lives with how they are made" (the
decisions), and "a direct report not delivering on client setup" (Daisy, removed from
her own ground by the word describing her work). A blacklist cannot tell what a word
is about. Every one of those patterns now names the thing it is actually banning.

**And three times a change was proved against its own builder and reached nothing:**
the name restore with the call removed from the live path, three modules with no
consumer, and recordCoachingStep an hour after I wrote a commit about exactly that.
All three are now bite-checked at the call site, which is the only place the claim
is true or false.

---

## Why run 7 cannot prove G42, found while it was still running

Watched the all-flags run at seven sessions in and checked the coaching table: zero
rows. The reason is not a bug, and it is worth writing down because it changes what
the run can answer.

| | |
|---|---|
| **What I found** | Both participants had `detectedFunction` null at confidence 0 after seven completed sessions. `MIN_COACHING_CONFIDENCE` is 0.5, so `observeForCoaching` returns before it ever calls the model. Role-tuned probes are off for the same reason. |
| **Probed, not guessed** | Ran `detectFunction` over the participant's real fifteen-entry corpus. Zero hits on every function. With a stated role it falls back to 0.4, deliberately below the coaching threshold and held provisional. |
| **The detection is right** | Its signals were tightened after a real misclassification: an entire software team came out SALES at 0.78 and was read against "named buyers with budget and authority". The comment there is correct that a lens becomes a label the moment it is confidently wrong. Scoring zero on work no map covers is the honest answer. |
| **The gap** | The record is a new hire clearing a support queue and shadowing client accounts. **There is no support or customer-service function among the nine role maps.** That is a product decision - which functions Groundwork covers - and it is Hafsah's, not mine. Adding `ticket` and `queue` to OPS would classify a support hire as operations, which is a different claim rather than a fix. |
| **What was actually wrong** | It was invisible. A feature that quietly does nothing for a whole ground is indistinguishable from one that is broken, and it took a probe and a database query to tell which. Same shape as the closing synthesis that failed and said nothing. Now logged, per person, saying plainly that coaching is off, that this is correct, and which of the two causes it is. |

**So G42's live trace needs a ground whose work one of the nine maps covers** - a
sales or engineering person - not ground 1's support-queue new hire. That is
scheduling, not building. Run 7 still proves the three flags coexist, the closing
synthesis lands, and the confidence read reaches a real report.

**Open decision for Hafsah:** add a support or customer-service role map as a tenth
function, or accept that people doing that work get the untuned product. The second
is defensible and is what ships today; the first is a day's careful work and covers
what is probably the most common junior hire there is.

---

## Run 7: all three flags on, and what it proved

24 of 24 check-ins, 50 minutes, `CONTEXT_ENABLED` + `CONFIDENCE_ENABLED` +
`COACHING_ENABLED` together for the first time.

| | |
|---|---|
| **The closing synthesis landed** | `final_synthesis` is not null. Run 6 failed on exactly this - the model returned prose instead of calling the tool, nothing retried, and the report kept its mid-ground state permanently. Zero `did not call tool` in this run's log, so the retry was not even needed; the sweep is there for when it is. |
| **The private guides survived twelve sessions** | Both parties have one, with real content. That was P6 - guides destroyed by every re-synthesis, so a twelve-session ground ended with none. |
| **Coaching produced no rows, correctly** | Diagnosed mid-run: no function reached the confidence threshold, because the record is support-queue work and no map covers it. Now logged per person rather than silent. |
| **The one failure was my test, and the product was right** | The assertion demanded three fields on every guide. One party's `questionToCarry` was dropped because the model wrote a question containing a quotation - the no-quote rule firing exactly as designed, and logging why. An assertion cannot require a field a deliberate rule is allowed to remove. |

**Two fixes came out of that last one.** The e2e now asserts what the product
guarantees: a guide arrives with something in it, has an opening line, and no field is
a stub. And the product retries once when a field is stripped, naming the field and
the reason - which is a far better instruction than the original prompt could give,
because it says what went wrong. Once, not a loop: a model that quotes twice is
telling us the prompt needs work, and the log is what says so.

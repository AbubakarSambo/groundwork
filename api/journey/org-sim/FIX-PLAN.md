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

# WAVE 8 - INDEX. Every item, its size, and what it depends on.

Fifty-seven items across ten passes, in one table, because a fix list spread over ten sections is a
diary rather than a list. Statuses are honest: DONE means merged and bite-checked, OPEN means
nothing has been built, DECISION means it cannot start until Hafsah answers.

**Read the SUPERSEDED column before starting anything.** Four items were replaced by later findings,
including two of my own proposals that turned out to be wrong.

## SHIPPED, 2026-08-12 (branch gw-12-followups)

Everything below is merged on the branch, tested and bite-checked. The index rows above still
describe the problem; this is the record of the repair.

| # | What shipped |
|---|---|
| W8-39 | the payment button pointed at `/billing/payment`, which does not exist. Now `/billing/checkout` |
| W8-40 | `?next=` is honoured, same-origin only, so signing in to subscribe returns you to your tier |
| W8-41 | `hello@groundwork.so` corrected to `myground.work` |
| W8-26 | `/set-password` with no token says so instead of rendering a working form |
| W8-42 | the grounds list and the 404 no longer send signed-in people into the anonymous entry chat |
| W8-45, W8-60 | the dead AppShell and the dead FeedbackWidget deleted, 500 lines |
| W8-20 | **the real cause**: a ground made in the entry chat never scheduled session 2, because `ensureNextSession` runs on completion and the entry flow marks session 1 complete directly. It was never a missing button |
| W8-19 | "My check-ins →" in the ground header, so `/grounds/:id/p` is reachable |
| W8-21 | your own session rows open their transcript. Only your own: an admin opening a participant's would break the promise the product makes on every screen |
| W8-3 | the "we sent a link" confirmation scrolls itself into view |
| W8-6 | the Context tab is announced where somebody is reading about what to do next |
| W8-5 | "bringing this ground to an end" appears near the end, not as the first card on day one |
| W8-4 | the rail counts completed sessions and says "1/6 done", so it agrees with the header |
| W8-27 | the roster and members pages are named what the rail calls them |
| W8-55 | documents attached in the entry chat are kept as real records instead of only as chat text |

| W8-57 | grounds behave like channels: a dot and bold when it is your turn, red only once the window has closed, the rail ordered by what needs you, closed grounds fading out after about three months |
| W8-44 | the board's components lifted into `components/gw/kit`, values unchanged, so other pages can be rebuilt from them |
| W8-7 | a solo ground no longer says "the two of you", and the Context card leads with what the ground can do |
| W8-16 | the 35s closing report names the work it is doing instead of one unchanging sentence |
| W8-24 | three cards explaining absence on the participant page cut to one, shown only before the first session |
| W8-37 | `/welcome` removed (unreachable), Profile out of the rail until the page exists |
| W8-11 | setup asks who is responsible inside an organisation, once, never inventing a name |
| report | the shared report's empty state no longer tells somebody who has checked in that nobody has |

**New guards, all bite-checked:** every `navigate()` resolves to a real route (carrying the
catch-all trap that fooled the audit), the entry commit schedules session 2 **inside
`commitInner`**, and the exit panel stays gated.

**Withdrawn after measurement:** W8-25 (pricing was correct, my memory note was stale), W8-22
(the record was intact, I photographed a typewriter animation), W8-23 (exactly one tab carries
the active class).

**Two mistakes worth keeping.** The `ensureNextSession` fix first went into `joinCommit` and its
guard passed anyway, because the guard asked whether the call appeared anywhere in the file. And I
committed a batch before running the API suite, which was red on six mocks. Both are the same
lesson the plan keeps recording: prove the fix on the path it was meant to repair, before saying
it is done.

## W8-61 - The marketing nav went to stubs, so /about was unreachable - **FIXED**

Hafsah: "the about page doesn't have the profiles i gave you... it is not visible at all."

She was right and I was wrong to answer that it was live. It is live at `/about`; she had not
been to `/about`. The home page's nav was **buttons calling `lNav()`**, which hid the home page
and revealed a thinner inline copy of each section further down the same file:

| | The real page | The stub the nav showed |
|---|---|---|
| about | `about.astro`, 14.7KB, the team on it | `#lp-about`, 3.4KB, no team |
| pricing | `pricing.astro`, 17.8KB | `#lp-pricing`, 2.6KB |
| how it works | `how-it-works.astro`, 14.4KB | `#lp-how`, 6.2KB |
| use cases | `use-cases.astro`, 11.8KB | `#lp-usecases`, 8.0KB |

Her screenshot shows it exactly: URL `myground.work` with no path, tab title "Groundwork - A clear
picture" (the HOME title, not "About - Groundwork"), the About nav item boxed as active, and card
copy - "A private check-in for each person" - that appears **only** in `index.astro`. Four pages
were written, deployed, and reachable by nobody who used the site.

**Why nothing caught it.** Both versions were real HTML in one file, both looked finished, and
clicking About genuinely showed you something headed About with the same heading word for word.
The link-existence tripwire from July checks that hrefs resolve - these were not hrefs. My own
check was worse than useless: I fetched `/about`, found the bios, and told her they were live,
which was true and answered a question she had not asked.

**Fixed.** The nav and footer are real links to the real pages. The four stubs and `lNav` are
deleted - about 130 lines. The four pages already carry their own header and footer.

**Guarded.** `check-one-domain.mjs` runs after every build, including the deploy, and now fails
it if the home nav has fewer than four links, links to a page the build did not produce, still
carries an `id="lp-..."` copy of another page, or goes back to `lNav()` buttons. All three arms
bite-checked. It guards the shipped artefact rather than the source, which is the only place this
was ever visible.

## W8-63 - "Contributor" was not retired. I said it was - **fixed and guarded**

I wrote in a commit that renaming the access code "retires contributor as a competing word for a
person". I had changed two places. Seven more were on screen, including the line under the
**sign-in form** - "Your contributions stay private from other contributors" - which is the first
sentence about privacy anybody reads.

Fixed: the sign-in page, the org-code page's badge and footnote, "Invite a contributor" on the
save card, "a report for each contributor" in ground setup, "Contributors get their invite" in the
post-setup guide, and the REALIGN_TEAM warning. The word a person gets is **participant**, which
is what the schema, the ground page and the invite emails already say.

Still legal, and different things: **contribution** (what a person puts in - the product's own
phrase), and `hiddenContributors`, the report's name for somebody whose contribution is not
visible upward. That one is a finding, not a role, and never reaches the screen: the heading says
"People who may be missing".

**Guarded, and the guard was wrong first.** `one-word-for-a-person.spec.ts` scans for the word
with comments blanked out. Its first version allowed `contributors[:.]` so object keys and
property access would pass - which also allowed *"...private from other contributors."*, because
an English sentence ends in a full stop. I put the word back on the sign-in page and the spec
stayed green. The allow-list is structural now (`contributors:` a key, `contributors.` followed by
an identifier, argument and destructuring positions), and the same sabotage now fails it.

Worth keeping: **the bite-check is the only reason that hole was found.** A guard written for a
mistake I had just made, which did not catch the mistake I had just made.

## W8-62 - The same sweep, run on the app: one real gap - **guarded**

The marketing bug had a shape worth hunting for: something built, deployed, and reachable by
nobody. `every-destination-exists.spec.ts` already checks the forward direction - everything the
app navigates to is a real route. The reverse had never been checked.

Of 37 routes, 8 are linked from nowhere. Six are correct: `/verify-email`, `/set-password`,
`/reset-password` open from emails, `/auth/google/callback` and `/billing/callback` are redirect
targets, and `/join` is the broadcast link an admin copies off the ground page. `/demo/:persona`
is pasted by hand when showing the product, which is deliberate.

**One is a real gap: `/profile/:id?`.** The rail dropped it because the page admits the feature is
not built, and I wrote at the time that the route should stay because "links to a person's profile
keep working". There are no such links. Not one. It is a page that can only be opened by typing
its URL, kept for callers that do not exist - the same mistake as the marketing nav, found the same
way, by checking instead of assuming. Left in place rather than deleted because that is a call for
Hafsah, and the page is three sentences of true copy that would be worth linking the moment a
person's name becomes clickable.

**Guarded.** `every-page-can-be-reached.spec.ts` fails if a route is neither linked nor listed
with the thing that opens it, and fails if the list names a route that no longer exists. Both
bite-checked. The comment in `AppShell` that justified the route on a false premise now says what
is actually true.

## The persona gate failed on correct behaviour

`suite_a` A2 asks whether the engine repeats an unverified claim ("everyone agrees Sam is the
problem") back as established fact. It went red on this reply:

> That's a strong statement. Before that goes in the record, I need your version of it.
> When you say Sam is the problem, what ...

Which is the behaviour the check exists to protect. The engine handed the claim back to the
person who made it, attributed, and asked for what is behind it. The detector was a bare
`re.search` for the phrase, so it could not tell "the engine asserts this" from "the engine quotes
you saying this" - and quoting them back is the whole point.

The phrase now only counts when nothing attributes it to the speaker first. A bare assertion
("Sam is the problem, and I have noted it") still fails, which was checked against both shapes
before pushing. Nothing on this branch touched that prompt; the model simply phrased it this way
on this run, and would have tripped the same regex on main.

## W8-64 - One failure, two error surfaces - **OPEN, small**

Seen while photographing the chat view against a stale local API. The transcript
request 404s, and the person gets both:

- the component's own state, which is the useful one: "Your check-ins could not be loaded. Try
  again in a moment."
- and the global red toast, about 400px of it, covering the right half of the page and quoting the
  URL: "Not found - Cannot GET /api/v1/grounds/0874730e.../my-transcript".

The global toast is right for a call nobody is watching. It is wrong on top of a component that
has already said the same thing in plainer words, and quoting a path at somebody is the shape of
an error that was written for whoever built it. `apiClient` already supports `skipForbiddenToast`
for exactly this reason on 403; the same idea is needed for a read whose component owns its own
failure state.

Not urgent - it only shows when the API is broken - but it is two minutes and it is the difference
between a product that says "try again" and one that shows you a stack of plumbing.

## W8-65 - Who gets the admin view, and the Context page's missing half - **partly fixed**

Her questions: "there's confusion between how to go to admin view and participant view and back.
And who gets admin view, the leads or the org admin or both" and "I gave you a whole bunch of
things to do on the context page".

**Who gets the admin view: it was everyone in the organisation.** `/grounds/:id` is behind
`RequireAuth` only and `grounds.get` resolves any ground in your org, so somebody who is not in a
ground at all could open its setup, its participant list and its nudges - not by finding a hole,
just by opening the URL. The controls inside were gated on `isInitiator`; the page was not.

Her decision: **the lead of that ground, and org admins for any ground.** Done on the client, with
a refusal that says who the view is for and offers the participant page to anybody who is a party
to the ground - because the likeliest person to land there is a participant who followed a link.
The server read stays open to org members on purpose: the participant view and the grounds list
both need it, so the read is not the thing to close.

**The Context page, against the seven steps of Wave 2 rather than against memory:**

| Her step | State before today |
|---|---|
| Open / closed / own visibility (G24, G38) | built |
| Documents as context, four rules | built |
| People context - per-person worries (G39) | built, admin side |
| **Context summary, G25** | built, **admin page only** - zero occurrences on the participant page |
| **One page for everyone, closed part visibly absent (G26)** | **never done.** The participant Context was a different, thinner page |
| Notes | lead only, `addLeadContext` |
| **Context chat - targets, exploring more (G37, G23)** | **not built.** This plan already said it is "the largest single piece left in Wave 2 and the one that needs a live model in the loop" |

Fixed today: the context read is a shared `ContextStrength` component on both pages, and a
participant now sees an explicit line that the lead may hold context they cannot read - G26's
"visibly absent" rather than silently missing. The tab is called Context on both.

**Still open, and it is the piece she is actually missing: G37/G23, the context chat.** Setting
targets, probing for what setup did not capture, recommending materials rather than waiting for
uploads. It needs its own run.

## W8-66 - The card view retired, and the payment path that nearly went with it

Her call: "it seems like we have now made the 'more' obsolete which is fine", plus "the team board
belongs to the ground" and "participants shouldn't be able to write context notes, leads can".

**More is gone.** The Chat / More switch lasted one day; a switch with one side left is a control
that teaches people to look for something that is not there. `PastSession`,
`SessionConversation`, `SoloArtifactBlock`, `stores/view.ts` and about 220 lines of card markup
went with it.

**What nearly went with it, and this is the part worth remembering.** `probeSession` lived in the
card view. It POSTs `:id/open` and handles a 403 by offering the free extension, the access code or
a subscription. `ChatPage`'s own open handler shows "Could not open session" and stops. So a chat
button that navigated straight to `/checkin/:id` would have silently deleted the paid path for
anybody whose ground had run out of sessions - no test would have failed, because the code was
still there, just unreachable. The composer calls back into the page instead.

The per-session summary was the same shape of risk: "what we heard from you" and the correction
that starts from it existed only on the cards, and `conversationApi.artifact` is one of the 43
inventoried operations. It is folded into the conversation now, under the session it came from.
**`nothing-gets-lost-in-the-merge.spec.ts` went red the moment that call left the pages it
watches**, which is exactly what it was written for - a capability quietly moving out of view
looks identical to one being deleted. Its file list now includes `GroundChat`.

**The team board is a tab on the ground**, not a dark pill in the chrome beside the view switch.
It was the only part of a ground reachable from the header rather than from the ground's own
navigation, which is also how it stayed undiscovered.

**Participants cannot write context notes, and that is now confirmed rather than assumed.**
`addLeadContext` is lead-only on the server and the participant Context page offers no note box -
only uploads, plus the line saying the lead may hold context they cannot read.

# Wave 10 - sign-up and sign-in, the assessment she asked for

Her words: "the sign-up flow still just says sign-in, no create an account options etc. Please do
a thorough assessment of how people sign-in/sign-up and all the different flows and failures, ux
challenges... We seem to be failing to get this wrong with you."

Read off the code, not remembered. She is right, and the reason is structural rather than a missing
button: **there is no sign-up flow. There is a sign-in page with a sign-up hidden inside one of its
modes.**

## W11 - clicking the two things I had only proved against the API

I had shipped the organisation switcher and the context chat proved against a booted API and the
suites, and said plainly that neither had been clicked. Clicking them found two things.

## W11-1 · A ground from another organisation, with nothing saying so - **fixed**

Switch to a client's organisation and your own company's ground is still in the list. That is not a
leak and not new: `grounds.list` deliberately includes grounds in OTHER organisations where the
caller is a participant, which is how somebody invited across a boundary finds their check-in at
all. It was unambiguous when there was only one organisation to be in.

With a switcher it is not. The list now carries `otherOrgName` for those grounds and the card names
the organisation, with the reason on its tooltip.

## W11-1b · The context chat sent a lead to the one place their opinion must never go - **fixed**

Clicked for the first time, against a live model. Most of it did exactly what it was written to do:
it skipped the timeline and the rhythm because this ground already had them, opened on the success
definition, and when told "the real problem is Sam, he is lazy and keeps missing deadlines, write
that down" it refused, redirected and returned to its question:

> This conversation is for setting up the ground itself. Anything about an individual's performance
> belongs in a private note later, **during a check-in**, where you can control who sees it.
> Let's stick to the project for now. What would make you say, at the end, that "Chain proof" went
> well?

The refusal held. **The destination is wrong, and wrong in the worst available direction.** A
check-in is that person's own account of their own work. Telling a lead to put their opinion of
somebody there points them at the single place it must never go.

My prompt said "a closed context note where the product says who can read it" - vague enough that
the model picked somewhere. It now names the destination concretely (the private context note
further down the same Context page, under "About <that person>"), and says outright not to say
check-in, with the reason. Vague about a destination means the model chooses one.

**Proved at the assembled text, not re-run against the model.** The unit spec pins the new wording;
I did not put a second live turn through it.

## W11-2 · The switcher is right, and my cleanup script was not - **worth recording**

The first live load showed three organisations, the active one being **another user's workspace**.
Not a product bug: an earlier cleanup script of mine did
`select organization_id from organization_memberships where organization_id != '<the test org>' limit 1`
to find "their own org" and picked an arbitrary row belonging to somebody else, then moved the test
user into it.

Two things worth keeping from that. The switcher rendered it correctly - three organisations,
per-organisation roles, the active one marked - and **the self-heal in `myOrganizations` is what made
the corrupted row visible at all**, which is exactly what it was written for. And a `limit 1` with no
`user_id` in the where is the same shape of mistake as the queries this plan keeps recording: a
filter that looks specific and is not.

## W11-3 · The availability poll: counted, and the number does not mean what it looks like

See W9-8. Zero polls in all 52 local databases, and **nothing anywhere creates one** - no unit test,
no persona suite, no simulation. So the zero measures our coverage, not anybody's appetite. What it
does establish is that the only write on the board is completely untested.

## W11-4 · The dev proxy target is configurable now

`vite.config.ts` hardcoded `http://localhost:3000`, which is right almost always and impossible to
work around when it is not: verifying against a freshly built API meant killing the server already
on 3000 or editing the file and remembering to put it back. It reads `VITE_PROXY_TARGET` with the
same default. That is how both of the above were clicked at all - a second dev server on 5199
against a second API on 3101, with her own pair untouched.

## W10-1 · The shape of it today

`/auth` is one page with three views held in local state:

| View | What it is | How you reach it |
|---|---|---|
| `password` | email + password sign-in | the default |
| `link` | **this is also the sign-up** | "No password? Get a sign-in link instead" or "New here? Create an account" |
| `reset` | forgot password | "Forgot your password?" |

The heading changes with the view: "Sign in", or "Sign in or create account". There is no route, no
page and no heading that is only about creating an account - `?mode=signup` changes the same page's
default view and its wording, nothing more.

So a first-time visitor lands on a form asking for a password they do not have, under a heading that
says Sign in, and the way forward is the fourth line of small print.

## W10-2 · The failures, worst first

**1. Every failure is reported as success.** `sendLink` and `sendReset` both do
`onError: () => setLinkSent(true)`. A network failure, a 500, a rejected address - all of them show
"Check your email". For sign-in that is a deliberate and correct choice, because saying "no such
account" tells a stranger which addresses are registered. **For sign-up it is a trap**: somebody
whose account was never created is told to go and wait for an email that will never arrive, and the
product has told them everything is fine. This is the worst thing in the flow and it is four
characters of code.

**2. Sign-up asks for nothing but an email.** No name, no organisation. `entrySave` derives the
first name from the address (`sam.taylor@` becomes "Sam") and `verifyEmail` names the organisation
`${firstName}'s workspace`. That is a deliberate improvement on the old behaviour, which took the
company's name from the email domain before the address was proved (GW-001) - but the result is that
somebody signing up to run a team lands in an organisation called "Sam's workspace" and was never
asked. For the entry-chat path the org name is captured in conversation; for a straight sign-up
nothing asks.

**3. Two doors to the same view, worded as different things.** "No password? Get a sign-in link
instead" and "New here? Create an account" both call `setView('link')`. One reads as a workaround
for a forgotten password, the other as registration. They are the same form.

**4. Nothing distinguishes "you have no account" from "you have no password".** A participant who
was added to a ground has a user row and no password. `login` sees that, emails them a setup link,
and throws "We've emailed you a link to set your password" - which is right. But the form they were
typing into is the *password* form, so they had to guess that entering a password they never chose
was the way to be told they do not have one.

**5. The same "Sign in" button lands in two different places.** I first wrote here that nothing
links to `?mode=member`. **That was wrong** - the marketing HOME page's Sign in uses it, and the
Sign in on how-it-works, pricing and use-cases goes to plain `/auth`. So one label, two landing
views, depending which page you happened to click it from. Corrected after checking every marketing
page rather than one.

**6. The verification email is the whole product.** No account exists until the link is opened, and
`MagicSentPage` had no way back to the form until today (W9-3), so a mistyped address was a dead
end: resend went to the same wrong address.

## W10-3 · Done, 2026-08-12

All five, in the order below. What each one turned out to need:

1. **The four characters fixed.** A transport failure or a 500 now says "that did not send" - it
   gives away nothing about the address, and it is the difference between a person retrying and a
   person giving up. A 4xx about the address itself stays generic, because this form is also the
   sign-in door. Reset stays generic on everything, deliberately: it never creates anything, so the
   only thing an honest error could reveal is whether the address is registered.
2. **A create view of its own**, heading "Create your account", asking for the name and the
   organisation. Both were guessed before and not harmlessly: the name came from the address and
   `verifyEmail` named the organisation "<name>'s workspace", so somebody signing up to run a team
   landed in a company nobody named. The org is optional - a naming decision should not block
   signing up - and `entrySave` takes `firstName` on the draft payload the same way it always took
   `orgName`.
3. **One door each.** "No password? Get a link" is a sign-in aid; "New here? Create an account" goes
   to the create view. They used to open the same form.
4. **"You have no password" is no longer shown as "wrong password".** The server already says it;
   it arrived as red text under the password field, which invites another go at a password that has
   never existed. It is a "Check your email" panel now. **Deliberately not a lookup before they
   submit**: an endpoint answering "does this address have a password" is an account-enumeration
   oracle, and avoiding exactly that is why the rest of this page is generic.
5. **The marketing Sign in is consistent** - all five pages go to `/auth`.

**And a thing found on the way: the labels were not attached to their inputs.** No `htmlFor`, no
`id`, on any field on this page. Broken for a screen reader and for clicking the label, and it is
why the first version of the test could not find them. Fixed on all five fields.

## W10-3b · The original plan, for the record

1. **Stop reporting failure as success, for sign-up only.** Keep the generic answer for sign-in and
   reset. Sign-up should say "that did not send - try again" when it did not send. Smallest change,
   largest effect.
2. **A real create-account view**, with its own heading, that asks for **name and organisation**
   before the link goes out. Not a route necessarily - the same page is fine - but one clear door
   rather than two pieces of small print, and the org named by the person who owns it.
3. **One door, not two.** "No password? Get a link" becomes a sign-in aid; "Create an account" goes
   to the create view.
4. **Say which situation somebody is in.** If the address has an account with no password, the
   password form should say so rather than letting them submit and be told.
5. **Point `mode=member` at something**, or delete it.

## W10-4 · What is genuinely right, and should not be lost

- Nothing is created until the address is proved (GW-001). The whole signup waits in
  `pendingSignup`, so an unopened link leaves no trace - no organisation named after somebody's
  company, no admin account in their name.
- The generic answer on **sign-in** and **reset** is correct and should stay.
- A participant with no password is auto-sent a setup link rather than being stuck.
- The link view genuinely creates an account. The plumbing works; it is the door that is missing.

# Wave 9 - the audit she asked for after the chat view landed

Her list: "all the things that were there are gone e.g. session count, changing ground name if you
are the lead etc. The navigations are all broken, i have no way to get back to anywhere from the
board. Also we were meant to have people be able to switch orgs at the top somehow but we dont have
it there. We have deadend pages that trap you there. We have a page with all grounds that may be
redundant... Also org admin has to accept a create ground. Do we remove availability poling on the
board?"

Measured, not remembered. Everything below was checked against the code or the screen.

## W12 - the last of the small ones, and a live signup bug found by chasing an orphan

## W12-7 · One look, not five - **W8-29**

The board's pieces are in `components/gw/kit.tsx` and the grounds list, the ground page and now the
record tab use them. The record tab had four hand-rolled section labels - same job as the kit's
`Sec`, each with its own size, its own letter-spacing and a hardcoded grey.

**The tripwire matters more than the four replacements.** Hand-rolling a section label is four lines
and importing one is one, so the four lines keep winning - which is how five variants existed in the
first place. `one-look-not-five.spec.ts` fails when a page that imports the kit also reimplements
its components inline. It does not police colour or spacing generally: a page with a real reason to
look different should be able to. It catches the specific failure, and it is bite-checked.

## W12-5 · The org admin view differs by ADDITION, not subtraction - **W8-32**

Her note was "the org admin view should differ, today it is subtraction". The gate built earlier
decides who gets in - the lead of that ground, or an org admin - and for an admin who was not the
lead the view was still identical, including the two actions that cannot be undone.

**Hiding those controls would have been the subtraction she was describing**, and worse: it removes
the only oversight an admin has. An admin who cannot see that a report has sat unreleased for three
weeks cannot do anything about it.

So they see everything, and the view says what they are: "You are looking at this as an admin, not
as its lead", naming who runs it, that releasing the report and closing the ground are that person's
decisions, and that nothing the admin does here is hidden from them. The two irreversible controls
relabel themselves - "Release on the lead's behalf" - and closing says outright that it ends
something somebody else is running.

## W12-6 · Empty states, and how little of W8-24 was left

W8-24 said "no screen has a primary action; empty states explain absence instead of offering the
action". Checked page by page: the primary actions arrived across the intervening waves - the
grounds list opens a ground, the ground opens its conversation, People invites, Billing subscribes -
and most of the absence-copy went with the cards.

Two were left, and they need opposite treatment:

- **Documents on the Context tab** said "No documents uploaded yet" directly under an upload control
  that already lists the file types. It uses the one moment somebody is looking at an empty list to
  tell them it is empty. It now names what to add and why it matters: anything opened to the ground
  is read by every check-in before it asks a question.
- **Waiting on, on the board** said "Nobody has named a handoff yet." There is nothing to offer -
  handoffs are extracted from check-ins, and no button produces one - so it says where they come
  from instead. An empty state implying an action that does not exist sends people looking for it.

## W12-1 · A new admin's first screen asked for a code they have never had - **fixed**

Chasing `/setup` as an orphan found it was not one. `MagicVerifyPage` did
`isNew ? '/setup' : '/grounds'`, and `/setup` is "Set up your org" - a form asking for an **Org
code**, plus a name and an organisation name the account already holds. So the first screen a
brand-new admin saw after verifying their email asked them for a credential that does not exist in
this product any more.

They go to `/grounds`. `verifyEmail` creates the organisation, and the create-account view now asks
for its name (W10).

## W12-2 · The org-code model is gone

`/enter`, `/pin` and `/setup` deleted, with their pages. That model answered "which organisation are
you in", and the organisation switcher answers it properly now - from membership, not from a code
somebody has to be given.

`/profile/:id?` deleted too. W8-62 exempted it as "the one real gap": a page nobody could open,
whose own copy said the feature was not built, kept for callers that never existed. If a person's
name becomes clickable it comes back with the link that justifies it.

**Two guards went red on the deletions and both were right** - the reachability list still exempted
`/profile`, and `every-destination-exists` proved its optional-param handling through `/profile/:id?`
because it was the only route with a `?`. That property is asserted directly now: a property proved
through whichever route happens to have the shape is a property that stops being proved.

## W12-3 · "Both parties" was wrong, not just a second noun - **W8-47 finished**

24 places said "both parties" - "Both parties will see the report", "Release report to both
parties", "Both parties keep it forever". The product supports **any number** of participants, in as
many words: "All scenarios support any number of participants". So on a five-person ground that copy
is not a style choice, it is false, and it is false in the most reassuring possible direction - a
promise about who sees the report.

All 24 now say everybody, or everyone. "All parties" is left alone: it does not hardcode two, and it
reads naturally.

## W12-4 · The email confirmation is pinned, not just scrolled to - **W8-3 finished**

Scrolling it into view fixed the moment it appeared and not the next one: the panel sits about
1678px down a 720px viewport, so one flick of the wheel and the only sign anything happened is gone
with no way back. It is sticky now. Her report was "I didn't know where it went, I forgot I had put
my email", and forgetting you gave an address is how a ground was lost.

## W9-1b · Two more the card view took, both found by the persona gate - **fixed**

The audit in W9-1 diffed the card view against what replaced it and found four losses. It missed
two, and both were found by the gate rather than by me:

**1. Every ground from the entry chat was held pending.** My approval gate fails closed when no
role is passed, which is right, and `entry.service` calls `grounds.create` without one - so
`addParticipant` refused and no contributor was ever invited. The person leaving the entry chat is
the admin of the organisation created for them seconds earlier; there is nobody else to approve it.
The suite reported it as "expected both the confirmed contributor and the one left in the note box",
which reads as the vanish bug and says nothing about an approval.

**2. The self-correction went behind a disclosure, and changed its words.** Moving it into "what we
heard from you" meant somebody who believed the record had them wrong had to open a summary before
finding out they were allowed to fix it. And I had reworded it from "Something wrong here? Continue
this session to correct it" to "This is not right - add to it" - so the check looking for the
affordance found nothing. It is on the row now, unhidden, in the words the product has always used.

**What both have in common, and it is the same lesson as `activateMutation`:** my inventory checks
that a capability is present and now that it is invoked. It cannot check that a person can SEE it,
or that a code path is reachable given a status. The persona suite can, and does, five minutes
later - so each of these now also has a unit guard that says it in a second and names the right
thing.

## W9-1 · What the retired card view actually took with it - **S, and it is my regression**

The card view rendered eight things. Diffed against the commit that removed it:

| It held | Where it is now |
|---|---|
| Session open / Session complete | the composer at the bottom of the conversation |
| Carried over | superseded - the conversation shows the actual history |
| The report is ready + Reveal report | **safe.** There were two `activateMutation.mutate` calls; one was in the card view, one is on the Report tab and survives |
| Your record quality | **safe.** The record tab carries specificity, confidence and patterns |
| **Session count** | **LOST when nothing is due.** The only place a total renders now is the "Continue session 2 of 6" button, which appears only when a check-in is open. Between sessions there is nothing anywhere saying this ground has six |
| **About this ground** | **LOST.** The label, the scenario and the admin's brief, which is what oriented somebody before their first session |
| **Where things stand** | **LOST.** The alignment read |
| **Alignment feed** | **LOST.** The signal events - divergence and convergence as they were detected |

**And the guard I wrote for exactly this did not catch it.** `nothing-gets-lost-in-the-merge` asserts
each of the 43 operations still appears in the watched files. `activateMutation` is *declared* in
the page, so the spec was green - it cannot tell a declared mutation from a reachable button. It
caught `conversationApi.artifact` only because that call *moved out of the file*. The lesson is the
same one as `probeSession`: presence in a file is not reachability, and my inventory checks
presence.

## W9-2 · Nothing gets you back from the board - **S**

`BoardPage` has "Back to grounds" and "Back to the ground" in its **error** state and its
**no-board-here** state. The state a person actually reaches - a board that renders - has neither.
The rail is there, so you are not trapped in the app, but there is no way back to the ground you
came from, which is what she hit.

## W9-3 · Pages with no way out of them - **S**

Checked every page for any internal link, `navigate` or `<Link>`:

| Page | State |
|---|---|
| `MagicSentPage` | **zero** internal links. "We sent you a link" and nothing else - no way back to sign-in if the address was wrong |
| `OrgMembersPage` | **zero.** It has the rail, so not a trap, but no way to the thing you were doing |
| `AuthPage`, `JoinPage` | no internal links **by design** - a signed-out stranger has nowhere to go yet |
| `PaymentPage`, `ReportPage`, `DemoConversationPage` | have links; fine |

## W9-4 · Switching organisation, which was always meant to be at the top - **M, and it is the one that needs a migration**

`grep` for an org switcher across the shell and the auth client: **nothing**. It has never been
built. This is the multi-org membership work already flagged three times in this plan - a person
can belong to more than one organisation, the JWT carries a single `organizationId`, and the
switcher she is describing needs: a membership table, an active org on the session, a chooser after
sign-in, and the switcher in the header. It touches the token, so it wants its own branch and its
own migration.

## W9-5 · "All grounds" is redundant for the only person who can see it - **S**

`grounds.list` already returns **every** ground in the organisation when the caller's role is
ADMIN - no participant filter. `/org/roster` ("All grounds") returns the same set. The difference is
columns: the roster adds per-ground lead, member count, roles and alignment.

So there are not two audiences, there is one page with two levels of detail. Options, cheapest
first:

1. **Fold the roster's columns into `/grounds` for an admin** and delete `/org/roster`. One page,
   more detail if you are an admin. Removes a rail item and a route.
2. Keep both but make `/grounds` participant-scoped even for admins, so the two pages have
   genuinely different answers ("mine" vs "the organisation's").
3. Leave it. It is not broken, only duplicated.

Recommendation: 1. It is the only option that reduces anything, and the roster's extra columns are
the reason an admin opens a list at all.

## W9-6 · Other redundancy worth naming, now the card view is gone

- **`/feed`** - an org-wide activity stream. The rail now shows what needs you, and the ground shows
  its own history. Worth asking what the feed answers that neither does.
- **`/grounds/:id/report` and the Report tab** are the same content at two addresses (W8-49 already
  had this).
- **`/enter`, `/pin`, `/setup`** - the org-code model. Still orphaned, still hers to kill or revive.
- **`/profile/:id?`** - reachable by nothing (W8-62).

## W9-7 · An org admin has to accept a ground before it starts - **M, new requirement**

Not built. Today `POST /grounds` creates an ACTIVE ground immediately, and the lead invite goes out
in the same request. Her requirement puts an approval between those two: a ground is created
PENDING, an org admin approves it, and only then does anybody get invited.

What it needs: a status ahead of ACTIVE (`AWAITING_APPROVAL`), a decision endpoint gated to ADMIN,
the invite suppressed until approval, somewhere for an admin to see what is waiting, and a state on
the creator's own view that says what it is waiting for. The one to get right is the invite: if it
fires before approval the approval means nothing.

## W9-8 · The availability poll on the board - **her question**

It is the **only** thing anybody can add to the board; everything else is generated from check-ins
(`upsertPoll`, `togglePoll`, and the form behind them). So removing it makes the board purely a
read - which is arguably what a board should be, and it is one fewer thing to maintain and explain.

Against removing it: the poll is the one place a team coordinates *forward* rather than reporting
backward, and "when can we all meet" is a real question a board is a sensible place to ask.

**Counted, 2026-08-12: zero polls in all 52 local databases** - including the 18-ground org
simulation and the 10-ground org18 run, both of which exercise the board.

**And that number proves nothing about demand**, which is the point worth having. Nothing creates a
poll anywhere: no unit test, no persona suite, no simulation. `upsertPoll` and `togglePoll` appear
in `board.ts`, `BoardPage.tsx` and the merge inventory, and nowhere else. So the zero measures our
own coverage, not anybody's appetite.

What it does establish: **the only write on the board is completely untested.** That is the real
decision, and it is a smaller one than "cut it or keep it":

- If the poll stays, it needs a test. An untested write on a shared surface is the kind that breaks
  quietly and is discovered by somebody trying to use it.
- If it goes, the board becomes a pure read, which is defensible and one less thing to maintain.

Production numbers would still settle the product question, and only Hafsah can pull those. But
either way the current state - shipped, unexercised, unmeasured - is the one option that should not
persist.

## A note on verifying against the local API

Twice now a browser check has looked like a product bug and was not. The local API process was
started **11 August 12:23** and has been serving that build ever since; `npm run start:dev` was
not left in watch mode, so `dist/` being rebuilt changes nothing about what is running. Node does
not reload a module it has already loaded.

The most recent case: a ground on localhost showed session 1 complete and no session 2, which is
exactly the `ensureNextSession` failure this wave fixed. The database agreed - one check-in row,
nothing scheduled. But the ground was created at 04:00 today **by the pre-fix server**, so it is
evidence about a build from yesterday, not about the code on this branch.

**What this means in practice.** Client changes verify honestly in the browser: Vite hot-reloads,
and the stat rows, the renames and the captions in this wave were all read off the running page.
**API behaviour cannot be verified this way until the process is restarted** - only from the test
suite, or a throwaway environment booted for the purpose. Written down because the same trap has
now cost two investigations, and the second one nearly went into this document as a defect.

## Do these first

| # | Item | Size | Status | Note |
|---|---|---|---|---|
| W8-26 | `/set-password` blocks a participant, and renders with no token | S | DONE - lead lands on their ground, no-token state shipped, ordering half was not real | a person who cannot check in cannot use the product |
| W8-39 | the payment button 404s | S | DONE | the only destination in the product that 404s, and it takes money |
| W8-25 | pricing contradicts the $5-per-session rule, on two pages | S | WITHDRAWN - pricing was correct | same sitting as W8-39 and W8-40 |
| W8-40 | `?next=` passed and never read | S | DONE | same sitting |
| W8-41 | `hello@groundwork.so` is not our domain | S | DONE | same sitting |
| W8-3 | the "we sent a link" confirmation is 1678px down a 720px panel | S | DONE - scrolled to AND pinned | causes W8-2, which was data loss |
| W8-13 | no confirmation at all after setup | S | DONE - MagicVerifyPage has confirmed what was created since W8; the row was stale | with W8-3 |

## The structural pass, in dependency order

| # | Item | Size | Status | Depends on |
|---|---|---|---|---|
| W8-44 | extract the board's nine components into `components/gw/` | M | DONE - components/gw/kit.tsx | nothing. Do it first, everything else gets cheaper |
| W8-45 | one header, delete the dead AppShell (shell-on-stranger-pages half withdrawn) | S | DONE - the dead AppShell went in an earlier wave; the row was stale | W8-44 |
| W8-57 | grounds as channels in the rail, a ground opens to its own history | M | DONE | rail + the single scroll |
| W8-49 | the target page list, 38 routes to 14 pages | L | OPEN | W8-52 must pass first |
| W8-52 | the ground-merge inventory, now an executable test (43 distinct ops) | M | DONE | unblocks W8-49 |
| W8-47 | one noun per thing | S | DONE - and "both parties" was wrong, not just a second noun | nothing |

## Product defects, open

| # | Item | Size | Status |
|---|---|---|---|
| W8-4 | sessions: three places disagree (1, 6, "2 of 6") | S | DONE |
| W8-5 | "bringing this ground to an end" offered at session 2 of 6, top of the page | S | DONE |
| W8-6 | nothing tells you the Context tab exists | S | DONE - and an OPEN doc now reaches the session prompt |
| W8-7 | the Context tab is 1 line of what it can do against 7 of what it cannot, and contradicts itself | M | DONE - can leads, limits fold away, contradiction fixed |
| W8-11 | never asks who the people inside the organisations are | M | DONE - in ONBOARD_SYSTEM, proved at the prompt |
| W8-12 | two places to add participants, 550px apart | S | DONE - one queue, both ends say so |
| W8-16 | the 35s closing report has no honest progress | M | DONE - both paths; streaming still open |
| W8-22 | a truncated assistant reply ("You've nam") is saved into the record | M | WITHDRAWN |
| W8-23 | two tabs render active at once | S | WITHDRAWN |
| W8-27 | four names for two concepts | S | DONE |
| W8-36 | `/invite` and `/set-password` handle a missing token in opposite ways | S | DONE |
| W8-37 | `/welcome` and `/profile` exist for one line of content | S | DONE |
| W8-42 | controls that work but sit in the wrong place, including two sending signed-in people to `/start` | S | DONE |
| W8-55 | a document uploaded in the entry chat is never kept as a document | M | DONE |

## Design, open

| # | Item | Size | Status |
|---|---|---|---|
| W8-24 | no screen has a primary action; empty states explain absence | M | DONE - mostly done across earlier waves; two absence-states left, now fixed |
| W8-29 | the board is the design system; the rest has not caught up | M | DONE - kit on four surfaces, plus a tripwire against hand-rolling it |
| W8-32 | the org admin view should differ, today it is subtraction | M | DONE - the frame is added rather than controls removed |
| W8-50 | the two rules that keep the page count down | - | reference |
| W8-53 | the pages that must NOT merge | - | reference |

## DECISIONS TAKEN, 2026-08-12

| Question | Her answer |
|---|---|
| Can one person belong to several organisations? | **Yes.** |
| Where does a ground created by a participant land? | **In the organisation of whoever invited them.** So somebody in more than one org signs in and chooses which one they are working in. |
| Red in the rail | Built as bold-plus-dot for your turn and red only once the window has closed, which is a deliberate departure from "turn red when it is time" - the engine's own rules forbid surveillance signals, and red at "your turn" marks somebody for being on time. One line to change if she disagrees. |
| Closed grounds in the rail | About three months, then out. |
| Grouping the rail | Deferred. Flat, sorted by attention. |
| Sessions | Derived from timeline and cadence. The defect was three places disagreeing, not the arithmetic. |

**What the first two unlock, and what they cost.** W8-10, W8-34 and W8-51 are now one approved piece of work: a membership table (user, organisation, role), the active organisation moved from the user row into the session, an org chooser after sign-in shown only when there is more than one, and a switcher in the header. `/enter` becomes that chooser rather than being deleted, and `/setup` becomes the create-an-organisation path on the same page.

**It is a migration that touches auth.** The JWT carries `organizationId` as a scalar and every read that takes the org off the user or the token becomes a read of the active membership. That is the whole reason it is worth doing deliberately rather than alongside other work - it is the one change in this plan that can log everybody out if it goes wrong.

## W8-15 · The report tab - **PART FIXED**, with what is still unknown

Her account: "the reports tab shows multiple buttons and access, i dont know if its our
shared report or my report, I dont know what M is for the manager."

**Fixed: the page insisted it was the shared report on both settings.** The toggle switches the
body between two genuinely different documents, and the eyebrow ("SHARED REPORT"), the headline
("Where everyone's accounts agree or differ") and the summary underneath never changed with it.
So somebody reading their own private report was told, in three places at once, that they were
looking at the shared one. All three now say which report is on screen, and the private one says
plainly that only they can see it.

**Not found: the bare "M".** Every label path traced - `participantLabel` in the client,
`labelsForParties` on the server - falls back to a name, then a role, then "a teammate", and the
server's report labels are "the initiator" or "participant A", never a single letter. The avatar
circles do render one letter, from the first character of an email, but always with the name and
address beside them.

So there is a surface showing a lone letter that I have not located. **What would settle it in
one minute: which page, and a screenshot.** Guessing at a redesign of the wrong component is how
the last two withdrawn findings happened.

## Decisions before code. Hafsah's.

| # | Question | Size once decided |
|---|---|---|
| W8-10 + W8-34 + W8-51 | can one person belong to several organisations? The Slack-style workspace picker needs a membership table; the JWT carries one org as a scalar | L, a migration touching auth |
| W8-9 | does a participant who creates a ground get their own organisation, or does it land in the org of whoever invited them (today's behaviour)? | M |
| W8-33 | the reversed setup: the subject sets up the ground and needs to know how their manager will read it. No path exists; `flowPath` is `self` or `lead` and never both | L |
| W8-35 | are `/enter`, `/pin`, `/setup` rebuilt as the org picker (W8-51) or removed? | M |
| W8-15 | what specifically is confusing about the report tab? Ten minutes on the page would replace a guess | M |

## Superseded and corrected. Do not work from these.

| # | Was | Now |
|---|---|---|
| W8-31 | my proposal: a flat list of check-ins in the rail, ChatGPT style | **W8-57.** Wrong model. A ground is a channel, not a conversation |
| W8-54 | where grounds go once check-ins take the rail | **W8-57.** Grounds never leave the rail |
| W8-35 | `/enter`, `/pin`, `/setup` called an orphaned model to delete | **W8-51.** They are the unfinished org picker she has asked for twice |
| W8-18 | the dropped chat recorded as unreproducible, probably streaming | **W8-22.** The record holds "You've nam". It was real |
| W8-28, W8-38 | five chrome variants, implying five shells | **W8-45.** One shared shell; each page hand-rolls its header inside it |
| W8-20 | "nothing anywhere opens a check-in" | **W8-43.** `GroundAdminPage` does contain a `/chat/:checkInId` navigate. True of the state a fresh entry-chat ground is in, not universal |

## Done

| # | Item |
|---|---|
| W8-1 | sign-up had no door on it, and three text links were not keyboard-reachable |
| W8-2 | the entry-chat ground disappeared: `entrySave` blanked a stored session when called without a draft |

## Checked and NOT a defect. Recorded so nobody re-reports them.

- **Situation cards have accessible names.** `read_page` listed them unlabelled, which was a tool
  artifact. Measured on `/start`: 23 visible buttons, **0** with no accessible name.
- **The five-organisation conversation handles them correctly.** The chat calls them partners, the
  report calls them organisations, and "People mentioned" extracted only the one human named. The
  defect is narrower: it never asks who the people inside them are (W8-11).
- **The ground does appear after the magic link**, in `/api/v1/grounds` and on the page. W8-2's loss
  had a specific cause, not a general one. My "0 grounds" reading was my own wrong API path.
- **22 of 23 navigation destinations resolve** (W8-43).
- **Quality is measured, deliberately never rated** (W8-56).

## Still not captured

Eight routes: `/admin/dashboard`, `/prompts`, `/prompts/test` (need a platform-admin account),
`/billing/checkout` (needs a live Stripe session), `/auth/sent`, `/reset-password`,
`/auth/google/callback` (only exist mid-flow with a real token), `/demo/:persona` (needs a persona
slug). Also unreviewed: the floating **?** help modal and the **Feedback** widget, which appear on
every page and were never opened.

---

# Wave 8 - the live walkthrough of 2026-08-11, after the merge

Hafsah walked the product herself on `main` after PR #130 landed and reported eleven things,
then asked for a second pass on nine more. This wave is all of it. Everything below was
reproduced in a real browser against a booted stack unless the row says otherwise, and the
"evidence" lines are measurements, not impressions.

**Two are already fixed and are recorded here only so the wave is complete.** Everything else
is open.

**The regression framing is worth keeping.** The nightly was green on both targets when every
one of these was live. That is not a contradiction, it is the finding: the suites cover the
paths that were being repaired and not the paths a person actually walks. Wave 8 should end
with coverage for the flows below, or the next walkthrough finds the next eleven.

## Sizes

`S` under a day. `M` a day or two. `L` more, or needs a decision first. `D` is a decision,
not an implementation, and is Hafsah's to make.

---

## W8-1 · Sign-up had no door on it - **DONE**

`/auth` opened on a password-only "Sign in" screen. Creating an account has always worked from
the link view (one email, one link, account exists, no entry chat needed) but the only route to
that view read "No password? Get a sign-in link instead", which describes signing IN. Meanwhile
"Get started" on the marketing site pointed at `/start`, the entry chat, so the front page
offered the anonymous conversation and nothing else.

Fixed: `?mode=signup` opens the create-account view with its own title and copy, "New here?
Create an account" is on the sign-in screen, and the marketing header button points at sign-up.
The hero button still goes to the entry chat and says what it is.

**And the three text links were not controls.** `<span onClick>`, so not in the tab order and
not announced as actionable - on that screen a mouse was the only way to reach account creation.
All three are real buttons now.

**My error, recorded so it is not repeated.** I read the "no auth before session 1" constraint
as site-wide and told her the missing sign-up page was correct behaviour. It governs the ENTRY
CHAT only. Corrected in the memory note.

## W8-2 · The ground made in the entry chat disappeared - **DONE, and it was silent data loss**

`entrySave` holds the whole anonymous session in `pendingSignup` until the address is proved,
which is right (GW-001). But the upsert's update branch wrote `payload: draft?.payload ?? {}`
and `history: draft?.history ?? []` unconditionally, so a call with NO draft replaced a real
stored session with an empty object and an empty array. `/auth`'s "Send link" button calls
exactly that: `authApi.entrySave(email)`, no draft.

The sequence, reproduced:

1. Finish the entry chat, type your email. Transcript stored, no account yet.
2. Miss the confirmation (W8-3 - it is 1678px down a 720px panel).
3. Come back later, ask for a sign-in link with the same address. payload and history blanked.
4. Open that link. Account created from an empty record. No ground, no transcript.

Which is exactly "I sign in, my ground that I created via the entry chat was not there", and
W8-3 is what makes step 2 likely. Fixed: the session fields are written only when a session is
supplied. Bite-checked, 2 of 5 tests red on the old write.

**Not reproducible any other way.** Through the normal path the ground appears correctly in
both `/api/v1/grounds` and the grounds page. I also briefly read "0 grounds" and nearly
reported a second critical: that was my own wrong API path (`api/v1` is the prefix).

## W8-3 · You cannot see that the email was sent - **S, and it causes W8-2**

**Evidence.** After pressing "Save my ground", the "We sent a link to ..." confirmation renders
at **1678px** inside a panel whose viewport is **720px** tall, and nothing scrolls to it. The
top of the screen is unchanged. Her words: "I didn't know where it went, I forgot I had put my
email."

**Fix.** Scroll the confirmation into view on success, and put a short line where the button
was. The panel already knows the address; it just says so a thousand pixels away.

## W8-4 · Sessions: the number shown disagrees with the number used - **S** (decision settled)

**Decision (Hafsah, 2026-08-11): derived wins.** Sessions are computed from the timeline and
the rhythm and that is correct behaviour:

    sessions = timelineDays / perSession        90 days / 14 = about 6

**So the defect is not the arithmetic, it is that three places disagree.** Measured on one
ground: the entry chat header said "1 session planned", the created ground says "Session 2 of 6"
in its header and "1/6 sessions" in the sidebar, and only one session had happened.

**Fix.** One reading of a ground, computed once and shown everywhere: the entry header shows the
derived number as soon as the timeline and rhythm are known, and "Session N of M" and "N/M"
agree on what N is. Also settle whether N counts sessions completed or the session now open -
"Session 2 of 6" after one check-in reads as though a session was skipped.

**Done 2026-08-12, and the cause was two more copies of the arithmetic.** `GroundAdminPage`
derived the count with `plannedSessionsFor` for its header and separately read
`sessionCounts.total ?? totalSessions ?? 1` for the context panel, which is how the same page
could say "Session 2 of 6" above a panel planning for one. It now derives once at the top and
everything reads that. The entry chat was the fourth implementation and the only one that rounded
to nearest, so twenty days of weekly check-ins promised three and the server then made two; it
now calls `plannedSessionsFor` like everything else. A tripwire in `sessionCount.spec.ts` fails if
anybody writes a days-per-cadence table by hand again.

## W8-5 · Bringing this ground to an end, offered at session 2 of 6 - **S**

**Evidence.** It is the FIRST card on the Overview tab. At "Session 2 of 6", with one
participant, it offers Mark complete / Continue / Descope / Stop the project, says "Each person
picks the outcome they think the record supports. The ground closes only when everyone picks the
same one, and nobody closes it alone", and reports "0 of 1 person has answered".

Three things wrong at once: it is top of the page when it is the last thing that should happen,
it is offered five sessions early, and the copy describes a group agreement in a ground with one
person in it.

**Fix.** Show it when the ground is at or near its last session, or when somebody asks to close
early. Below the summary, not above it. Single-participant copy that does not talk about
everyone agreeing.

## W8-6 · The Context tab exists, nothing tells you it exists - **S**

She said the ground never told her there was a place for more context and documents. There is:
the Context tab has upload (PDF, DOCX, JPEG, PNG, CSV, XLSX) and context notes.

**Fix.** Say so at the end of setup and in the ground-ready email. This is the cheapest item in
the wave and it changes whether the feature is used at all.

**Done 2026-08-12, and saying it out loud found a worse bug underneath.** The lead invite now
names the Context tab and what it is for. Writing that sentence meant checking whether an
uploaded document actually reaches anybody, and it did not: `documents.list` had been moved onto
`documentWhereFor` so an OPEN document reaches everyone on the ground, but the query that builds
the **session prompt** was still `participantId: <mine>`. So a participant could open the Context
tab, read the brief the lead had shared with them, start their check-in, and be interviewed by
something that had never seen it - the one case OPEN exists for was the one case it did not
reach. Both now use the same function, flag and all, guarded by
`the-session-sees-what-the-person-sees.spec.ts`.

## W8-7 · What the Context tab promises against what it does - **M**

**Evidence.** Its main card, "What this ground can tell you", carries **one** line of what it
can do and **seven** of what it cannot. And it contradicts itself inside those seven: "only one
person is in this ground" and four lines later "only the two of you are in it".

Her wider point stands and is a design item, not a bug: it does not read as a place to hold a
conversation, put context in, or attach documents. She wants context sitting next to the
participant it belongs to, rather than as a page of caveats.

**Fix.** Lead with what the ground CAN tell you. Keep the limits, shorter, below. Fix the
one-person/two-of-you contradiction. Then the layout question: context per participant.

## W8-8 · Where the check-ins are, and what the tabs are for - **M**

Current order: Overview | Check-ins | Context | Report | Settings | Team board. Left menu lists
grounds. Her account, which I agree with:

- the check-in board should be the first tab, not the second, and not Overview
- the left menu should list her check-ins, since that is what she is here to do
- the top should carry the switch between admin view and check-in overview

**Fix.** Reorder, and move the admin/participant switch to the header. Worth doing with W8-9,
since "what an admin sees versus what a participant sees" is the same question.

## W8-9 · Participants, admins, and their own grounds - **D then M**

**Evidence.** Two roles exist, `ADMIN` and `MEMBER`. Three ground endpoints are admin-gated. The
grounds list narrows for non-admins to grounds they initiated or are a participant in.

**What is not settled, and needs a decision before code:**

- A MEMBER is not stopped from creating a ground. They already have an org - whoever invited
  them - so their ground lands inside that company's organisation. Almost certainly not intended.
- Does a participant who wants their own ground get their own organisation? If so, at what
  moment, and what happens to the membership they already had?
- Do participants see the same ground page as an admin, minus the gated bits, or a different
  page? Today it is the same page with pieces removed.

## W8-10 · One person cannot belong to two organisations - **L, structural**

**The biggest finding of the pass.** `User.organizationId` is a single column with a single
relation. There is no join table. So a person invited into a second company's ground cannot be
in both: they need a second account on a second address, or they collide.

**Why it matters now rather than later.** This is a migration, not a refactor. Every query that
reads `organizationId` off the user or the JWT assumes one org - the JWT itself carries
`organizationId` as a scalar. The longer it waits the more code assumes it.

**Decision needed before any work:** is one person in many orgs a real case for this product? If
it is, the shape is a membership table plus an active-org switch in the session, and the JWT
changes.

## W8-11 · It never asks who the people in the organisations are - **M**

**Reproduced.** Asked "Who else is on the team with you?" I answered with five organisations
(Afrimash, Bridge Merchant, Aquaresh, NABG, Bayer). It replied "That sounds like an important
group of partners", asked one more question, then said "Thank you. That gives me what I need"
and ended setup. It never asked who the people are.

**The parts that already work, so they are not touched:** the chat and the report treat them
correctly as organisations throughout, and "People mentioned" extracted only Kennedy, correctly,
because he was the only human named.

**Her instruction:** listing organisations is fine. It should then ask who is responsible within
each one, not stop at whichever person happened to be mentioned.

**Fix.** When the involved parties come back as organisations, ask for the person accountable in
each before setup can complete. Five orgs should produce five invitations, not one.

## W8-12 · Two places to add participants - **S**

**Evidence.** "+ Add them" in the report's People mentioned section, and an email field 550px
below it, with a note claiming they share one list. Both work; both are on screen at once.

**Fix.** One list, one place to type into. If the report's suggestions stay, they add to the list
below rather than being a second entrance.

**Done, and the second half is what shipped.** `queueSuggestedContributor` writes into
`inviteAdded`, which is the state the invite screen below renders, so the two entrances were
already one queue - verified at the state, not the copy. Both ends now say so. The suggestions
keep their own button on purpose: they are read in the report and asking somebody to scroll past
them to a separate field is the friction, not the cure.

## W8-13 · No confirmation after setup - **S**

No pop-up or panel at the end of the entry chat and setup confirming what was created and what
happens next. Related to W8-3 but distinct: W8-3 is the email being invisible, this is the whole
setup completing without acknowledgement.

## W8-14 · No way back to your own check-ins, and the report cannot be edited - **M**

She could not find her past chats and could not edit her report. Correction on the same session
is built (`startSelfCorrectionSession`, and the report's "This isn't right - correct it"), so the
gap is reaching it: nothing lists a person's own check-ins as a place to return to.

**Fix.** A list of your check-ins, with the correction route on each. Overlaps W8-8's left menu.

## W8-15 · The report tab is confusing - **M, needs her detail**

Recorded as reported. I have not yet reproduced what specifically misleads, and guessing at a
redesign would waste the finding. Worth ten minutes with her on the page.

## W8-16 · Response times, measured - **M**

Not the 20 seconds felt in the setup chat. Measured against the booted API:

| Call | Time |
|---|---|
| `entry/onboard`, one setup turn | 4.4s |
| `entry/chat`, one check-in turn | 5.3s to 6.6s |
| End session, report generation | about 35s |

One model call per turn plus a background classify, so the setup turns are 4 to 6 seconds and
the long wait is the closing report. **Fix in two parts:** make the 35s honest with progress that
names what is happening, and look at whether the closing synthesis can start earlier or stream.

**First part done, on both paths, 2026-08-12.** The entry flow already named the steps. The
signed-in finish - the path everybody is on from session two onwards - showed "Saving…" and then
nothing for half a minute, which reads as a hang; `complete()` awaits two model calls before it
answers, so the wait is real. Both now use `components/gw/SlowStep`, which never claims to be
nearly done and sits on the last honest step rather than running off the end. The second part,
starting or streaming the synthesis earlier, is still open.

## W8-17 · Participant check-in asked for a password - **NOT YET REPRODUCED**

She could not check in as a participant on a ground she was added to: it asked her to set up a
password. The invite email itself is right - subject "X invited you to check in on: Y", body
explains a short private check-in of about ten minutes, that nobody reads what you write, that
honesty is wanted rather than balance, and that declining is never held against you.

**Next step, not a fix:** walk a real invite end to end (add a participant, read the mail, open
the join link in a clean context) and find where the password gate appears. This is the highest
of the open items, since it stops a participant contributing at all.

## W8-18 · Things reported that I could not reproduce - recorded honestly

- **The chat dropping mid-conversation.** I saw a reply cut off mid-word and thought I had it;
  it was still streaming and completed correctly. Needs the conditions she hit.
- **"Describe the situation in a random box."** Not yet located.

## What I would do first

W8-17, because a blocked participant is the worst state in the list and it is still only her
report. Then W8-3 and W8-13, which are hours and remove the cause of W8-2. Then W8-11 and W8-6.
W8-9 and W8-10 need decisions before any code, and W8-10 should be decided soon whether or not
it is built soon.

---

# Wave 8, second pass - how a person gets to their own check-in

Added after Hafsah said "I have no way to come in and do my checkin & see my chats" and asked
for the best way to do it inside the existing UX. Everything here was found in a browser on a
booted stack, on a real ground created through the entry chat.

## W8-19 · There are two ground pages and the better one is unlinked - **S to link, M to finish**

The same ground renders at two routes, with different tabs:

| Route | Tabs | Linked from |
|---|---|---|
| `/grounds/:id` (`GroundAdminPage`) | Overview, Check-ins, Context, Report, Settings, Team board | the grounds list |
| `/grounds/:id/p` (`GroundParticipantPage`) | **Check-in, Session history, My record, Report, Documents**, Settings | nothing |

The second is very close to what she asked for unprompted: check-in first, session history, a
documents tab. It is built and it works. Nothing in the product links to it, so the only way in
is to type the URL.

**This is the cheapest large improvement available in the product right now.** The work is
routing and a switch, not new screens.

## W8-20 · Nothing opens a check-in, and nothing reopens the one you did - **S**

Three separate dead ends, all confirmed on the ground page:

- **The Session 1 card on the Check-ins tab is a plain `<div>`**, computed cursor `auto`. Not a
  link, not a button. Clicking it does nothing.
- **No control anywhere starts the next check-in.** Every button and link on the page was
  matched against start / next / continue / check in / open: zero hits. The header says
  "Session 2 of 6" and nothing acts on it.
- **`/chat/:checkInId` works by direct URL** and renders the whole transcript with the private
  report below it. Also unlinked.

So a person finishes the entry chat and the product has no route back in, while holding a page
that would serve them.

## W8-21 · Session history holds the summary, not the conversation - **S**

The participant view's Session history lists "Session 1, Completed 11 Aug 2026" with one link,
"What we heard from you", which opens the summary. The transcript is not reachable from the one
screen named after the history of the sessions.

## W8-22 · WITHDRAWN. The record was intact; I screenshotted an animation.

**This is the second time I have changed my mind about the dropped chat, and this time I checked
the database instead of the screen.**

The stored turn, read from `GET /check-ins/:id/transcript`:

    lastRole: AI    length: 264
    "...he agreement confirmed in writing. Is there anything written down that
     captures what was agreed, even an informal message or email exchange?"

Complete. The "You've nam" I reported was **ChatPage's typewriter effect mid-flight** - it
renders `full.slice(0, i)` on a 25ms interval, so any screenshot taken while it is running shows
a sentence cut off mid-word. The same animation exists in the entry chat.

**So W8-18 stands as originally written after all**: the dropped chat is not reproduced. My
correction of it was wrong, and the original entry was right.

**The lesson, since this cost two reversals.** Both the entry chat and ChatPage animate assistant
messages on arrival AND on load. A screenshot of either is not evidence about what is stored. For
anything about the record, read the transcript endpoint.

**One thing this does leave open, and it is a real question:** if a person ends a session while the
typewriter is still running, they have not read the last reply. Nothing waits for the animation.
That is worth looking at on its own terms, but it is a UX question about pacing, not a data-loss
bug, and the record is not affected.

## W8-22b · The original claim, kept for the record - **M**, superseded above

**W8-18 said the dropped chat could not be reproduced and was probably a reply still streaming.
That was wrong.** The stored transcript on the completed check-in ends with the assistant
message:

    You've nam

Ten characters. Ending the session while a reply was streaming persisted the partial message,
and it is what the record now shows. This is her "the chat dropped mid chat and I had to put ...
to get it started again": the visible conversation genuinely stops mid-word.

**Fix direction, not decided:** either finish or discard the in-flight turn when a session ends,
and never store a partial assistant message as a record entry. The record is the product; a
half-written sentence in it is worse than a missing one.

## W8-23 · WITHDRAWN. Exactly one tab carries the active class.

Measured on the live ground page after switching tabs: `.gw-tab.active` matched **one** element,
and the CSS has no hover or focus rule that could add the underline. The second underline in my
screenshot was a different row of the header, not a second active tab.

## W8-23b · The original claim, kept for the record - **S**, superseded above

On `/grounds/:id`, after switching tabs, Check-ins and Context were both underlined in the same
screenshot. The active-tab state is not exclusive.

## W8-24 · The interface has no hierarchy - **M, design**

Observed across every page captured. Not a defect list, a pattern:

- **No screen has a primary action.** Cards share one border, one background, one weight, so
  nothing reads as "do this next". On the Overview tab that puts "Bringing this ground to an
  end" and the ground summary at equal weight, and the destructive one is on top (W8-5).
- **Empty states explain absence instead of offering the action.** "No read yet", "No documents
  uploaded yet", "After your first session you will see how specific your contributions are" -
  three cards in a column, each describing something that has not happened.
- **The copy leads with caveats.** Clearest on the Context tab: one line of what the ground can
  tell you, seven of what it cannot (W8-7).

**Two of the concrete ones are done, 2026-08-12.** The roster's "0 members" on a ground that
plainly had a lead in it: `memberCount` counted only PARTICIPANT rows while `members` maps every
participant, so one object carried two counts of one list and they disagreed on screen. And the
purple: the subscribe buttons were the only purple in the product, a hardcoded hex in three files
with no token behind it, on the pages where somebody is deciding whether to trust us with money.
They are navy like every other primary action. The hierarchy items below remain.

**What is genuinely good and should not be lost in any redesign:** the writing. "Your
contribution to this ground is yours until the report releases", the private-record framing
throughout, and the invite email are plain, calm and trust-building. The hierarchy problem is
visual, not verbal.

## The recommendation, in order

1. **Make `/grounds/:id/p` the page you land on**, with a switch in the header between the
   participant view and the admin view. Both pages exist; this is routing plus a control, and it
   is also her "buttons at the top to take you to the admin view or checkin overview".
2. **One "Your check-ins" list in the left menu, above Grounds.** Grounds is an admin idea;
   check-ins are the job. Each row carries the ground, the session, and a single action: Start,
   Continue, or View.
3. **Every session row opens its chat.** The transcript page already renders, from both the
   participant Session history and the admin Check-ins tab.
4. **Put "Start session N" where the page already says a session is due.** The header computes
   "Session 2 of 6" and nothing offers to begin it.

Steps 1 and 3 are hours. Step 2 is the only new screen, and it is a list.

## Coverage note on this pass

Pages captured: grounds list, ground Overview, Check-ins, Context, the transcript at
`/chat/:id`, the participant view, Session history, sign-in, sign-up, the entry picker, the
entry report and save panel.

**Not captured yet:** Report tab, Team board, Feed, Settings, Roster, Members, Billing, Pricing,
Profile, `/enter`, `/pin`, `/join`, `/invite`, `/setup`, `/welcome`, `/demo/:persona`, the 404,
and the platform-admin pages, which need an account this session does not have. Recorded so this
pass is not mistaken for a full sweep.

---

# Wave 8, third pass - every page, how they link, and two gaps in the model

Twelve more pages captured in a browser, plus the structural review Hafsah asked for: how
things are linked, the hierarchy, the flow. Two findings at the end are not defects but missing
pieces of the model, and both need her decision.

## The pages, one line each

| Page | Finding |
|---|---|
| `/grounds/:id/report` | "Your report will appear here once at least one person has checked in" - one person HAS. The copy contradicts the state, on an otherwise empty screen |
| `/grounds/:id/board` | **The best page in the product.** Dark identity header, an explicit "how to read and use this board", four stat tiles, then detail. Two defects: `- to -` renders as an empty date range, and one tile reads "SOLID? unknown" |
| `/feed` | About 600px of empty grey between the welcome line and the composer. A fourth distinct header pattern (Feedback / +Invite / Team / Back) |
| `/settings` | Clean and honest: "If you signed up without being asked for it, we guessed it from your email address." The ground list in the sidebar is meaningless here |
| `/org/roster` | Titled **Teams**, sidebar calls it **Roster**, URL says roster. Reports "0 members" on a ground that has the initiator in it. Lists grounds, which the Grounds page already does |
| `/org/members` | Titled **Team members**, sidebar calls it **People**. Otherwise clean |
| `/billing` | Free plan claims "unlimited sessions and reports". Subscribe buttons are **purple** where every other primary action in the product is navy |
| `/pricing` | "Simple, honest pricing" above "Unlimited sessions and reports on every Ground" |
| `/grounds/new` | A six-step wizard of radio cards about 450px tall, two visible at a time |
| `/join` | Good. Names the inviter, explains that nobody reads your words, names optional. Fine print promises a password email |
| `/set-password` | Renders a complete working form **with no token in the URL** and no invalid-link state. Headed "One last step" when it is the first thing a participant meets |
| `/nothing-here` (404) | Good, and the best example of hierarchy in the product: one sentence, one button |

## W8-25 · Pricing contradicts the product's own pricing rule, on two pages - **S, and it is money**

`/pricing` and `/billing` both say the free tier includes unlimited sessions. The recorded
constraint is: **first session on each ground is free, each additional session is $5 per ground.**

Either both pages are wrong or the constraint is stale. One of them has to move, and until it
does the product is advertising something it may charge for, under a headline that says "Simple,
honest pricing".

## W8-26 · `/set-password` is the participant blocker, and it renders without a token - **S**

Her report was "I could not checkin as a participant to a ground i was added to, it asked me to
setup password etc". Located:

- `/join` promises it in fine print: "We'll email you a link to set a password for returning
  later."
- `/set-password` then greets a person who came to CHECK IN with "One last step - Set a password
  so you can sign back in", before they have contributed anything.
- The same page renders a full, usable form with **no token at all** in the URL. No expired-link
  state, no explanation.

**Two things to fix and they are different.** The ordering (check in first, secure the account
after, or at least say why the password comes first) and the missing token state.

**Measured 2026-08-12, and the ordering half is not the shape I described.** Nothing sends a
participant to `/set-password` on the way to a check-in. `sendParticipantInvite` sends them to
`/invite`, which routes straight to `/checkin/{id}` with no password at all. The three senders of
`/set-password` are the team invite, the add-a-password email, and the lead invite - none of them
has a check-in on the other side. So there is no ordering to fix.

What was real, and is now fixed: the **lead** invite says "review the ground I set up for you",
and setting the password dropped them on the whole grounds list. `next` was read by the page and
passed by nobody. `buildPasswordSetupUrl` now carries `next=/grounds/{id}`, and the page ignores
any `next` that is not a plain in-app path - `//evil.example` passes a naive `startsWith('/')`,
which is what the bite-check went red on.

## W8-27 · Four names for two concepts - **S**

| Sidebar says | Page says | What it lists |
|---|---|---|
| People | Team members | people with accounts |
| Roster | Teams | grounds |

Two of those four words are wrong for what the page holds, and "Teams" listing grounds collides
with the Grounds page doing the same.

**Done 2026-08-12.** The sidebar and the page already agreed on "People" from an earlier pass.
The remaining one was "Roster", which sits directly under "People" in the rail and lists grounds -
the opposite of what the word suggests in that position. It is "All grounds" now, at both ends.
That does not collide with Grounds: one is the grounds you are in, the other is every ground in
the organisation, which is what the page's own subtitle says.

## W8-28 · Chrome and colour are inconsistent across pages - **S**

- **Four header patterns** across the app: the ground page header, the participant page header,
  the feed's button row, and the bare "Groundwork / Back" bar.
- **The left sidebar shows the ground list on Settings, Billing, Pricing and the 404**, where it
  means nothing.
- **Primary actions are navy everywhere except Billing**, where Subscribe is purple.

## W8-29 · Hierarchy: the board is the design system, the rest has not caught up - **M, design**

One page gets it right and it is worth naming why, because it is the template for the others.
`/grounds/:id/board` uses: a dark header carrying identity, an explicit panel telling you how to
read the page, four stat tiles for the glance, then the detail underneath. The eye lands in the
right order without effort.

Everywhere else is a flat column of cards sharing one border, one background and one weight, so
nothing reads as "do this next" and the reader has to price every card themselves. On the ground
Overview that is actively harmful: "Bringing this ground to an end" sits above the summary at
equal weight (W8-5).

**The 404 is the second-best example in the product**: one sentence, one button. That is the
standard to hold every screen to.

## W8-30 · How things are linked - the map is the problem, not the pages - **M**

Drawn out, the navigation is not a hierarchy. It is several overlapping lists of the same thing:

- **Grounds** (sidebar) lists grounds.
- **Roster/Teams** lists grounds again, with different metadata.
- **Feed** is a chat about grounds.
- The ground itself has **two pages** with different tabs, one of them unlinked (W8-19).
- **Check-ins**, the thing a person actually comes to do, appears as a tab inside a ground, and
  the cards on it are not clickable (W8-20).

So the unit the product is organised around is the ground, which is an admin's unit. The unit a
person lives in is their own check-in, and it has no home.

## W8-31 · Check-ins should open from the left menu, the way chat products work - **M** (her model)

Hafsah's words: "I assumed the checkins will be the ones to open from the left menu in the way
that chatgpt or claude chats functions and you have things in other places."

That is the correct model for this product and it should be adopted rather than argued with. A
check-in is a conversation, it is the thing you return to, and every product shaped like this
puts conversations in a left rail.

**What that means concretely:**

- The left rail lists **check-ins**, newest first, each row naming its ground and session, the
  way a chat list names a conversation.
- Clicking a row opens the conversation itself (`/chat/:checkInId` already renders it).
- An open check-in is distinguished from a finished one, and the next one due is offered in the
  rail rather than found inside a ground.
- Grounds do not disappear; they move to being the container you open from a check-in or from an
  admin view, not the primary rail.

**This subsumes W8-19, W8-20 and W8-21.** They are three symptoms of the rail being wrong.

## W8-32 · The org admin view should differ, and today it barely does - **M**, needs W8-9

Her expectation: "I assume org admin view will differ slightly." Today the difference is
subtraction - the same ground page with gated pieces removed - and the participant page that
would genuinely differ is the unlinked one. With the rail changed to check-ins (W8-31), the two
views separate cleanly:

- **A person's view:** my check-ins, my record, my reports.
- **An org admin's view:** every ground, who has checked in, what is overdue, the boards.

The switch belongs in the header, which is also what she asked for.

## W8-33 · The reversed setup: the person being assessed sets up the ground - **L, and there is no path for it**

Her scenario, in her words: a staff member wants to give clarity to a manager who is too busy and
unhappy; he is delivering but it looks like box-ticking; the manager is probably unhappy about
quality; and **the staff member is the one setting up the situation and the context, so the
calibration is reversed and he needs to know how his manager will read it.**

**There is no path for this, and the reason is structural.** The entry flow offers exactly two:

| `flowPath` | Meaning | Does the setter check in? |
|---|---|---|
| `self` | This is my situation, I give my account now | yes |
| `lead` | I am setting this up for my team, someone else runs it | **no** (`skippedCheckin = flowPath === 'lead'`) |

And the lead invitation is only sent when the path is `lead` (`flowPath === 'lead' && leadEmail`).
So a person **cannot both give their own account and name their manager as the lead**. The moment
you name a lead, you step out of the ground.

Her case needs both at once: I am a party, I am the subject, and the other party is the person
whose standard defines whether my work is good.

**Why the calibration matters and is not just plumbing.** The lead is the source of the
standard - the target, the expected contribution, the "should". Every read that says whether
somebody is meeting the bar assumes the bar came from the lead. If the subject sets up the
ground, there is no bar in the record, so the product can describe what he did and cannot tell
him the one thing he came for: how his manager will see it.

**What it would take, sketched, not decided:**

1. A third path: *I am a party and the other party is my lead.* The setter checks in AND a lead
   is invited.
2. The lead's first contribution is asked for as the standard, not as an account of events - the
   target and what good looks like - so the record has a bar to read against.
3. Until the lead has answered, the subject's report says plainly that no standard is on record
   yet, rather than implying his account is the whole picture.
4. The anticipation he actually wants ("how will my manager read this") is only honest once the
   lead has answered. Before that the product should offer the gap, not a guess: here is what you
   have evidenced, here is what a manager in this role usually asks for, and these are the parts
   nobody has confirmed. This must not become the product predicting a person's opinion.

**This is the most interesting finding of the pass** because it is a real use of the product that
the model cannot express, and because getting it wrong in the other direction - guessing what a
manager thinks - would be exactly the thing this product exists not to do.

## W8-34 · Signing in with more than one organisation - **L**, and it depends on W8-10

Her question: "how do you login if you have multiple orgs, you may need that org option after
sign-in it tells you what org to go into coamana or NAVCDP etc."

**Today there is no answer, because the model cannot hold it.** `User.organizationId` is one
column with one relation and the JWT carries `organizationId` as a scalar (W8-10). One address
belongs to exactly one organisation, so the picker she is describing has nothing to pick from.

**The shape, if it is wanted:** a membership table (user, organisation, role), an active
organisation in the session rather than in the user row, an org chooser after sign-in when there
is more than one, and a switcher in the header afterwards. Every read that takes
`organizationId` off the user or the token becomes a read of the active membership.

**This is a migration, and it touches auth.** It should be decided before more code assumes one
org, which is the same argument as W8-10 and is now the second time it has come up from her own
use.

## Revised order, with the new items folded in

1. **W8-26** the participant blocker. Somebody who cannot check in cannot use the product.
2. **W8-25** the pricing contradiction. Hours, and it is money.
3. **W8-3** and **W8-13**, the invisible confirmation and the missing one, which together caused
   the lost ground.
4. **W8-31** the left rail of check-ins, taking W8-19, W8-20 and W8-21 with it. The largest
   improvement per hour in the product, because the pages already exist.
5. **W8-27**, **W8-28**, **W8-23**, the naming, the chrome and the double-active tab. Cheap.
6. **W8-11** asking who the people in the organisations are.
7. **W8-29** hierarchy, using the board as the template.
8. **Decisions before code:** W8-10 and W8-34 (many orgs), W8-9 (participants and their own
   grounds), W8-33 (the reversed setup). W8-33 is the one worth designing properly rather than
   quickly.

---

# Wave 8, fourth pass - the remaining pages, and an orphaned onboarding model

The pages left from the sweep. The individual findings are small; what they add up to is not.

## The pages

| Page | Finding |
|---|---|
| `/enter` | **Green** header, a fifth chrome variant. Titled "Check in" and asks for an **org code** |
| `/setup` | "Set up your org": name, organisation name, **org code**, role. Claims "Your team gets invited automatically" |
| `/welcome` | Two lines: "Welcome, Hafsah" and "Open Groundwork". A whole route for one button |
| `/profile` | Honest: "A profile that gathers them in one place is not built yet." Two empty-state lines saying the same thing ("No completed grounds yet", "Your record grows as grounds close") |
| `/admin` | Silently lands on the grounds list for a non-platform-admin. No refusal, no explanation |
| `/invite` | "Invalid invite. This invite link is missing its token." Correct, and the model the others should copy |
| `/pin` | "Enter your PIN" and a Continue button. No explanation of what a PIN is or where it came from |

## W8-35 · There are two onboarding models and one of them is orphaned - **M**

`/setup` issues an **org code**. `/enter` asks for an **org code**. `/pin` asks for a **PIN**.
Together they are a coherent onboarding: an admin sets up an org with a short code, people arrive
with the code, a PIN identifies them.

**The live product does none of that.** The entry chat creates the organisation automatically and
names it after the person ("Hafsah's workspace"), and participants arrive by tokenised link from
an invite email. Nothing in the live flow ever issues or asks for a code or a PIN.

So three routes serve a model the product moved off, and they are not marked as such. The cost is
not the dead code, it is that **the page most literally named "Check in" asks a participant for
something they were never given** - which is very close to what Hafsah hit when she went looking
for where to check in.

**Decision needed:** is the org-code model coming back (it is the natural answer for field teams
and shared devices), or do these three routes go? If it is coming back, `/enter` still must not
be the thing a person finds when they want their own check-in.

## W8-36 · Missing-token states are handled in opposite ways - **S**

Same problem, two behaviours, in one product:

| Page | With no token |
|---|---|
| `/invite` | "Invalid invite. This invite link is missing its token." |
| `/set-password` | Renders a complete, usable password form |

`/invite` is right. `/set-password` should say the same thing, and it is the more serious of the
two because it accepts input.

## W8-37 · Routes that exist for one line of content - **S**

`/welcome` is a route, a page and a heading in order to show one button that goes to the grounds
list. `/profile` is a nav item leading to a page that says the feature is not built. Neither is
wrong, both cost a person a click to learn nothing.

**Fix:** fold `/welcome` into wherever it is reached from. Either build `/profile` or take it out
of the rail until it exists - a menu item that admits it does nothing teaches people the menu is
unreliable.

**Done, checked 2026-08-12.** `/welcome` is gone - no route, no page, nothing links to it. The
profile item is out of the rail; the route stays so a link to a person still resolves, and the
page now says where the record actually lives rather than promising a feature that fetches
nothing.

## W8-38 · Five chrome variants, counted - **S**, extends W8-28

Now measured across the whole sweep:

1. the ground page header (title, status pill, tabs)
2. the participant page header (title, subtitle, different tabs)
3. the feed's button row (Feedback / +Invite / Team / Back)
4. the bare "Groundwork / Back" bar (settings, set-password, grounds/new)
5. the **green** bar on `/enter`

Plus the left sidebar rendering a ground list on Settings, Billing, Pricing, 404, `/enter`,
`/setup` and `/set-password`, where it is meaningless or actively wrong - on `/set-password` and
`/join` it shows a signed-in person's own grounds to a page meant for somebody arriving fresh.

## What the fourth pass changes about the order

Nothing moves above W8-26 (the participant blocker) or W8-25 (the pricing contradiction). But
W8-35 joins the decisions, and it bears on W8-31: if the left rail becomes check-ins, `/enter`
stops being the place people look for a check-in, which removes the worst symptom of the orphaned
model without deciding its future.

## Sweep coverage, final

**Captured:** grounds list, ground Overview, Check-ins, Context, Report tab, Team board,
`/chat/:id`, participant view, Session history, sign-in, sign-up, entry picker, entry report and
save panel, feed, settings, roster, members, billing, pricing, grounds/new, join, set-password,
404, enter, setup, welcome, profile, admin, invite, pin. **Thirty screens.**

**Not captured, and why:** `/admin/dashboard` and the platform-admin pages (need a platform-admin
account this session does not have), `/prompts` and `/prompts/test` (same), `/billing/checkout`
(needs a live Stripe session), `/auth/sent` and `/reset-password` and `/auth/google/callback`
(reachable only mid-flow with a real token), `/demo/:persona` (needs a persona slug I would be
guessing at).

---

# Wave 8, fifth pass - every control, where it goes, and whether it belongs there

Every `navigate()` and `href` in `client/src/pages` extracted and checked against the route table
in `App.tsx`, then the surprising ones opened in a browser. 38 routes defined, 23 distinct
in-app destinations.

**Method, and its one trap.** The first version of this check reported zero broken destinations,
which was wrong: `<Route path="*">` (the 404) matches everything, so including it made every
target look valid. Excluding the catch-all found the real one. Worth recording because any future
version of this audit will hit the same trap.

## W8-39 · The payment button lands on the 404 page - **S, and it is money**

`BillingPage.tsx:261` navigates to **`/billing/payment`**. That route does not exist. The billing
routes are `/billing`, `/billing/checkout` and `/billing/callback`.

Confirmed in a browser: `/billing/payment` renders "PAGE NOT FOUND - There is nothing at this
address."

So the control for buying a session on a ground is dead, and it fails into the one page that
tells the person they typed the address wrong. This is the only destination in the product that
404s, and it is the one that takes money.

## W8-40 · `?next=` is passed and never read - **S**

`PricingPage` sends people to **`/auth?next=/pricing`**. `AuthPage` reads only `mode`; the string
`next` does not appear in the file. On success it navigates to `/`.

So somebody who clicks Subscribe on the pricing page, signs in, and expects to land back at the
thing they were buying is put on the grounds list instead, with no explanation and no way back to
the tier they had chosen.

## W8-41 · Two contact addresses on two domains, one of them not ours - **S**

| Address | Where |
|---|---|
| `hello@myground.work` | GroundAdminPage, archive request |
| `support@myground.work` | BillingPage, enterprise enquiry |
| **`hello@groundwork.so`** | **PricingPage** |

`groundwork.so` is not the product's domain. Mail sent there by a customer asking about pricing
goes to somebody else or nowhere. Same class as the sitemap naming a domain that did not exist
(W8 wave 0), on the page where a buyer asks a question.

## W8-42 · Controls that go somewhere reasonable but belong elsewhere - **S**

Where a control works but is in the wrong place:

| Control | Goes to | Why it does not belong |
|---|---|---|
| ResetPasswordPage, footer link | `/enter` | After resetting a password you are offered the **org code** page, part of the onboarding model the product left behind (W8-35). It should go to sign-in |
| PinPage, "Back" | `/enter` | Correct within the orphaned model, meaningless outside it |
| Account menu, "Admin" | `/admin` | Silently lands on the grounds list for anyone who is not a platform admin (W8, fourth pass). Either hide it or refuse it out loud |
| GroundsListPage, "Start a ground" | `/start` | `/start` is the anonymous entry chat. A signed-in admin is sent through the flow designed for people with no account, rather than `/grounds/new` |
| 404 page, "Start a Ground" | `/start` | Same. Reasonable for a stranger, wrong for the signed-in person who mistyped a URL |

The last two are the same mistake and worth stating as a rule: **`/start` is for people with no
account. A signed-in person should never be sent there.**

**Done 2026-08-12.** Three of the five had already been fixed by earlier passes and the table had
not caught up: the 404 branches on `isAuthenticated`, "Start a ground" goes to `/grounds/new`, and
the Admin item is `platformAdminOnly` so it does not render for anyone else rather than landing
them somewhere silently. The two that were still live are fixed: `ResetPasswordPage`'s "Back to
sign in" said sign in and went to the org-code page, and `PinPage`'s Back did the same.

## W8-43 · Everything that is correctly wired, for the record - **no action**

Stated so this audit is not read as "the navigation is broken". Twenty-two of twenty-three
destinations resolve, and the important chains are right:

- `JoinPage` -> `/checkin/:id`, straight into the check-in. Correct.
- `InvitePage` -> `/checkin/:id` or `/grounds/:id/p`. Correct, and it is the only page that links
  to the participant view at all (W8-19).
- `MagicVerifyPage` -> `/grounds/:id` or `/start`, depending on whether a ground was committed.
- `WelcomePage` -> `/set-password?token=...&next=...`, the tokened path, which is the shape
  `/set-password` should require (W8-36).
- `GroundAdminPage` -> `/chat/:checkInId` **exists in the source**, which means the transcript is
  reachable from that page in some state, and W8-20's "no control opens a check-in" is specific
  to the state a fresh entry-chat ground is in rather than universal. Worth pinning down which
  state exposes it before building anything.

## Order

W8-39 goes to the top of the wave with W8-26 and W8-25: it is hours of work, it is on the paid
path, and a dead money button is worse than a missing one because the person believes they tried.
W8-40 and W8-41 belong in the same sitting - all three are the purchase journey, and none is
bigger than an hour.

---

# Wave 8, sixth pass - what merges, what clarifies, and the design system already written

Thirty screens and 38 routes reviewed together rather than one at a time. Three questions: what
can be merged, how the product gets clearer, and how to spread the board's design language.

## W8-44 · The design system exists and is trapped in one file - **M, and it is the unlock**

`BoardPage.tsx` defines its own component vocabulary, at the bottom of the file, used nowhere
else in the product:

    Zone   Sec   Card   Row   Pill   btn   miniBtn   btnGhost   td

That is why the board is the best page: **it is the only page built from components instead of
inline styles.** Its tokens, read off the source:

| Element | Spec |
|---|---|
| Section label | 12.5px, uppercase, `letterSpacing: .4px`, `--gw-muted`, weight 700 |
| Stat value | **Georgia serif**, 24px, `lineHeight: 1`, 5px under its label |
| Row value | Georgia serif, 17px, `--gw-navy` |
| Zone | titled band with a rule, grouping sections |

The serif numeral against the sans label is the whole reason the glance row reads instantly. No
other page in the product uses Georgia at all.

**The move:** lift those nine into `components/gw/` and rebuild the other pages from them. That is
not a redesign, it is extraction. Every page then inherits the hierarchy for free, and "make it
look like the board" becomes an import rather than a judgement call.

## W8-45 · There are two AppShells, one of them dead - **S**

- `components/gw/AppShell.tsx`, 689 lines, wraps **every route** in `App.tsx:101`.
- `components/layout/AppShell.tsx`, 311 lines, mounted nowhere. Its own comment says so.

**Half of this is WITHDRAWN, measured 2026-08-12.** `components/gw/AppShell.tsx` already reads
`const showSidebar = isAuthenticated` and returns bare `children` when false. A stranger following
an invite link sees no rail. I made the original observation while signed in and mistook my own
session for everyone's. What remains true: a person who IS signed in and opens `/join`,
`/set-password` or the 404 keeps their rail, which is their own grounds and is fine. The dead
`components/layout/AppShell.tsx` deletion stands, and so does the one-header work below.

Correcting my own earlier note (W8-28, W8-38): the shell IS shared. The five chrome variants come
from each page hand-rolling **its own header inside** the shared shell, not from five shells. The
fix is one header component with slots, and making the shell conditional on whether the person is
signed in.

## W8-46 · Pages that should merge - **38 routes to about 24**

### The ground: four routes into one page

| Today | Note |
|---|---|
| `/grounds/:id` | admin tabs, including a Report tab and a Team board tab |
| `/grounds/:id/p` | participant tabs, unlinked (W8-19) |
| `/grounds/:id/report` | the same content as the Report **tab** |
| `/grounds/:id/board` | the same content as the Team board **tab** |

The report and the board exist twice each, once as a tab and once as a route. One ground page, one
tab set, a person/admin switch in the header (W8-31, W8-32). The tab is the canonical place; the
routes become deep links to a tab.

### The same component on two routes

`/chat/:checkInId` and `/checkin/:checkInId` both render `ChatPage`. One of them should go, and
`/checkin/:id` is the one the invite and join flows use, so keep that name.

### Arriving by token

`/invite` and `/join` do the same job: resolve a token, put the person into their check-in. Two
pages, two token kinds, one purpose. One page that accepts either token, with one missing-token
state (W8-36).

### Passwords

`/set-password` and `/reset-password` are the same form with different reasons, and `/auth/sent`
is a **state** of `/auth`, not a place. Three routes into one auth page with modes, plus one
password page.

### People and grounds

`/org/members` (accounts) and `/org/roster` (grounds, titled "Teams") - the roster's ground list
duplicates `/grounds` outright. Keep one people page; the roster's per-ground metadata becomes a
column on the grounds list.

### Money

`/pricing` and `/billing` both render the tier cards. One component, shown publicly at `/pricing`
and inside the account at `/billing`, so the tiers can never disagree again (W8-25).

### Fold away entirely

- `/welcome` - a route for one button. Fold into where it is reached from.
- `/profile` - admits it is not built (W8, fourth pass). Fold into `/settings`, which already
  shows the profile block, and take it out of the rail until it is real.
- `/admin` and `/admin/dashboard` - two pages for one job.
- `/enter`, `/pin`, `/setup` - the orphaned org-code model, pending the decision in W8-35.

## W8-47 · How the product gets clearer - **the four moves that do most of it**

1. **One noun per thing, everywhere.** Today: People/Team members, Roster/Teams, contributors/
   participants, check-in/session. Pick one word for each and use it in the rail, the page title
   and the copy. This is the cheapest clarity in the product and it is currently costing the most.

   **Three of the four are done, 2026-08-12.** People says People at both ends; Roster is now All
   grounds at both ends (W8-27); and "contributor" is gone as a competing word for a person - the
   report card said "Contributor report" where the tab above it says your report, and the access
   code was called a contributor code in the product while the email that delivers it has always
   called it "your Groundwork access code". It is an access code everywhere now, in the app and in
   the two emails that mention it. **Check-in and session are deliberately still both here**: they
   are not synonyms. A session is the numbered slot the ground plans; a check-in is what a person
   does inside it. Collapsing them would lose the distinction "Session 3 of 6" depends on.
2. **The rail holds check-ins, not grounds** (W8-31). The unit a person lives in gets the home.
3. **Every screen answers three questions in order:** what is this, what is its state, what do I
   do next. The board does; most pages answer only the first. The stat row is the "state" answer
   and it belongs on the ground page and the grounds list, not only the board.

   **Done for both, 2026-08-12.** The grounds list had its own smaller stat tile and now uses the
   kit's, so the same number does not change shape depending on which page you opened it from. The
   ground page had no state answer at all - it named the ground and went straight to cards - and
   now opens with sessions done, how many have checked in this round, and what the report is doing.
   Nothing new is fetched; every number was already on screen further down.

   **And rendering it found two things reading the source would not have.** The first version of
   the row said "SESSIONS 1 of 6" and "THIS ROUND 0 of 1 - still to check in" under a header
   saying "Session 2 of 6" and a tab saying one person had checked in. All four numbers correct,
   read together as contradictions, because nothing said which session each was about. Both
   captions now name their session. The second was already live on the Check-ins tab: "THIS ROUND
   2 of 6" captioned "counting the session everyone has finished", when everyone had finished one -
   the value is the round now open and the caption was written for the other reading.
4. **One primary action per screen, and only one.** Most screens have none. Where there is nothing
   to do, say so in a line rather than filling the space with three cards about absence (W8-24).

## W8-48 · The order to do it in

Extraction first, because everything else gets cheaper afterwards:

1. **W8-44** lift the board's nine components into `components/gw/`. Nothing changes visually.
2. **W8-45** one header component, and stop wrapping stranger-facing pages in the signed-in shell.
   Delete the dead AppShell.
3. **W8-46** the ground merge (four routes to one) and `/chat` + `/checkin`. Highest confusion
   removed per hour, and it carries W8-19 to W8-21 with it.
4. **W8-47 point 1**, the naming. Hours, and it makes every later conversation about the product
   easier.
5. The rest of the merges, in any order.

**What must not happen in this pass:** rewriting the copy. The writing is the strongest thing in
the product (W8-24). This is a structural and visual pass; the words stay.

---

# Wave 8, seventh pass - the target page list

Hafsah's decisions, 2026-08-11:

- **The board stays**, as its own thing. It is the best page in the product and it keeps its
  identity rather than being absorbed.
- **Reports open from the board.** The report stops being a separate top-level tab and becomes
  something the board leads you to, which is the natural reading order anyway: the glance row
  says where things stand, and the report is the detail behind it.
- Everything else in W8-46 goes on the list.

## W8-49 · The target page list - 38 routes to 14 pages

Deep links are not lost. `/grounds/:id/report` and the rest survive as URLs that resolve to a tab
or a section; what goes away is the second implementation behind them.

### The app, signed in

| Page | Holds | Replaces |
|---|---|---|
| **1. Your check-ins** | the rail's home. Every check-in of yours, newest first, each row naming its ground and session, with one action: Start, Continue or View | new (W8-31) |
| **2. A check-in** | the conversation itself, and the private report under it | `/chat/:id` + `/checkin/:id` |
| **3. A ground** | one page, one tab set: **Check-ins, Context, Board, Settings**. Person/admin switch in the header. **The report opens from the Board** | `/grounds/:id` + `/grounds/:id/p` + `/grounds/:id/report` + `/grounds/:id/board` |
| **4. Grounds** | every ground in the org, for whoever runs them, with the roster's per-ground metadata as columns | `/grounds` + `/org/roster` |
| **5. Feed** | ask about your team, request a report, ask about a person | `/feed` |
| **6. People** | everyone with an account, and the invite box | `/org/members` |
| **7. Billing** | your plan, your grounds, the tiers | `/billing` + `/billing/checkout` + `/billing/callback` |
| **8. Settings** | profile, organisation, email, WhatsApp | `/settings` + `/profile` |
| **9. Platform admin** | internal only: the dashboard and the prompt tools as tabs | `/admin` + `/admin/dashboard` + `/prompts` + `/prompts/test` |

**Four tabs on a ground, not six.** Report leaves (it opens from the Board, per her decision) and
Overview leaves - it held the resolution card, which belongs at the end of a ground rather than at
the top of it (W8-5), and the ground summary, which belongs in the header.

### Arriving, not signed in

| Page | Holds | Replaces |
|---|---|---|
| **10. Start** | the anonymous entry chat. **Never shown to a signed-in person** (W8-42) | `/start` |
| **11. Auth** | sign in, create an account, link sent, set or reset a password - one page, modes | `/auth` + `/auth/sent` + `/set-password` + `/reset-password` + `/login` |
| **12. Arrive** | resolve any token - invite, join, email verification - and put the person where they belong, with one missing-token state | `/invite` + `/join` + `/verify-email` |
| **13. Pricing** | the same tier component as Billing, rendered publicly, so the two can never disagree | `/pricing` |

**Page 13 is already true inside the app, and there was a fourth copy nobody counted.** `/pricing`
and `/billing` both read `PLAN_PRICES`, `PLAN_MEMBER_CAPS` and `PLAN_FEATURES` from
`client/src/api/billing.ts`. The marketing site does not: `marketing/src/pages/pricing.astro`
writes the same five prices and five seat caps into hand-written HTML in a separate build, so a
price change in the app would leave myground.work advertising the old one to the people who have
not signed up yet. They agree today. `the-price-is-the-same-everywhere.spec.ts` now fails if they
stop, without coupling the two builds to each other.
| **14. Not found** | one sentence, one action. Already right | `*` |

Plus `/demo/:persona`, which is marketing rather than product, and `/auth/google/callback`, which
is a redirect target with no interface.

### What that removes

- **Both duplicate implementations** of the report and the board (tab and route).
- **The dead `components/layout/AppShell.tsx`**, 311 lines (W8-45).
- **`/welcome`**, a route for one button.
- **`/enter`, `/pin`, `/setup`** if the org-code model is not coming back (W8-35, still hers to
  decide). If it is, they become one page inside **Arrive**, not three.

## W8-50 · The two rules that keep the count down afterwards

Written as rules because the page count grew by nobody breaking one:

1. **A state is not a page.** "We sent you a link", "your report is not ready", "invalid token"
   are states of the page that caused them. `/auth/sent` and `/welcome` both exist because a state
   was given a route.
2. **One implementation per thing, reachable from many URLs.** The report and the board each exist
   twice because a deep link was built as a second page instead of pointing at the first. Routes
   are cheap; implementations are not.

## Order, revised with her decision

1. **W8-44** extract the board's components into `components/gw/`. Nothing changes visually and
   everything after gets cheaper.
2. **W8-45** one header, shell only for signed-in routes, delete the dead shell.
3. **W8-49 page 3**, the ground merge: four routes to one page, four tabs, report opening from the
   board. This is the largest single reduction in confusion and it carries W8-19 to W8-21.
4. **W8-49 pages 1 and 2**, the check-in rail and the check-in page.
5. **W8-47 point 1**, one noun per thing.
6. The remaining merges, cheapest first: `/chat` + `/checkin`, Auth, Arrive, Pricing + Billing,
   `/welcome`, `/profile`.

---

# Wave 8, eighth pass - the org picker, and nothing gets lost in the merge

## W8-51 · "Org code" reinterpreted: it is workspace selection, like Slack - **corrects W8-35**

Hafsah, 2026-08-11: "org code is that you get to select the org tied to your email like in slack."

**W8-35 called `/enter`, `/pin` and `/setup` an orphaned onboarding model and asked whether to
delete them. That framing was wrong.** They are the unfinished front of the thing she has asked
for twice: an organisation chooser tied to the address you sign in with.

So this is not a dead flow to remove. It is W8-34 (signing in with more than one organisation)
arriving from the other direction, and the two items are one:

| Piece | Today | Wanted |
|---|---|---|
| Which orgs is this address in? | unanswerable - `User.organizationId` is one column (W8-10) | a membership per organisation |
| Choosing between them | `/enter` asks you to type a code | a list of your workspaces after sign-in, chosen by clicking |
| Switching later | nothing | a switcher in the header |
| `/pin` | a PIN with no explanation | drop, unless it is for shared devices, which is a separate decision |

**What this changes about the plan:** `/enter` does not get deleted, it gets rebuilt as the
chooser and absorbed into **Auth** (page 11), shown only when the address has more than one
membership. `/setup` stays as the "create an organisation" path, folded into the same page. The
blocker is unchanged and is still hers: the membership migration in W8-10, which the JWT depends
on.

**One thing to get right that Slack gets right:** never make somebody choose when there is only
one answer. With a single membership the chooser must not appear at all.

## W8-52 · Nothing gets lost: the function inventory the merge must satisfy - **the safety net**

Her instruction: "make sure the ux change does not break or lose important functions and pages."

So here is what the four ground pages actually do, read off their API calls rather than from
memory. Any merge that cannot host all of these is not ready to start, and this list is the
acceptance test for W8-49 page 3.

**The inventory is now a test, 2026-08-12:** `client/src/pages/grounds/nothing-gets-lost-in-the-merge.spec.ts`.
An inventory in a document is a safety net nobody is standing under, and the way an operation
disappears in a four-page refactor is quietly, in a branch nobody re-read. Merge the pages however
the design wants; if a capability stops being wired to anything, that spec goes red and names it.
It proves a call is still wired, not that it is reachable or correctly gated - the floor, not the
ceiling, and a merge still has to be driven in a browser.

**And the count is 43, not the 45 written here.** The prose total added the four pages up
separately, so `reports.get` and `grounds.get` were each counted more than once. Distinct
capabilities is the number that matters for a merge, because that is what has to survive. Nothing
is missing; the number was.

### `/grounds/:id` (admin) - 23 operations

| Group | Must survive |
|---|---|
| Ground state | `get`, `update`, `confirmLead`, `beginClosingRound` |
| People | `addParticipant`, `getParticipantInviteUrl`, `participantsApi.updateEmail`, `participantsApi.updateRole` |
| Requests | `participantRequests.list`, `participantRequests.update` |
| Documents | `documents.list`, `upload`, `remove`, `setVisibility` |
| Context | `addLeadContext` |
| Privacy switches | `setExternalVisibility`, `setPeopleWorkTogether` |
| Reports | `reports.get`, `reports.release`, `reports.activationStatus` |
| Nudging | `conversation.remind` |
| Billing | `getContributorCodeShareCard` |

### `/grounds/:id/p` (participant) - 15 operations

| Group | Must survive |
|---|---|
| My record | `getMyRecord`, `getMySoloReport`, `getMySpecificity`, `setMySoloReportShared` |
| My session | `conversation.artifact`, `startSelfCorrection`, `signOff` |
| Documents | `documents.list`, `upload` |
| Reports | `reports.get`, `reports.activate` |
| Billing, as a participant | `claimFreeExtension`, `createSubscription`, `redeemContributorCode` |

### `/grounds/:id/report` - 9 operations

`reports.get`, `getMyCheckinStatus`, `startSelfCorrection`, `addParticipant`,
`participantRequests.create`, `outcomeFeedback.mine`, `outcomeFeedback.submit`,
`conversation.download`, `grounds.get`

**Two of these exist nowhere else and are the reason the report cannot simply be dropped into the
board:** `outcomeFeedback` (did the ground actually help) and `conversation.download`.

### `/grounds/:id/board` - 6 operations

`board.get`, `createObjective`, `updateObjective`, `deleteObjective`, `upsertPoll`, `togglePoll`

### The rules that fall out of the inventory

1. **The report is not only a document.** It carries outcome feedback and download. If it opens
   from the board, those two have to come with it, or the board becomes a report that cannot be
   downloaded or judged.
2. **Billing appears inside a participant's ground page**, three ways. A participant hits money
   at the point of use, not on `/billing`, and the merge must keep that - moving it to Billing
   would break the paid path for the person who is not the admin.
3. **Documents are on three of the four pages** with different capabilities - the admin can
   `remove` and `setVisibility`, the participant can only `list` and `upload`. The merged Context
   tab must keep that asymmetry rather than granting the participant the admin's controls.
4. **Two report-visibility concepts, not one.** `reports.release` (admin releases to everyone) and
   `reports.activate` plus `setMySoloReportShared` (a person shares their own). Collapsing them
   would either leak a private record or make release meaningless.
5. **`confirmLead` and `signOff` are one-time state transitions.** They must not become
   re-clickable in a merged page.

### How to prove nothing was lost

Before the merge lands, a spec that asserts the merged page issues every operation in this
inventory, from the right role. Cheaper than discovering a missing one in a live ground, and it is
the same shape as the two structural rules already in the suite (nothing-wired-to-nothing,
no-method-in-here-is-dead) which have caught nine real bugs between them.

## W8-53 · Pages that must not be merged, and why - **the other half of the safety net**

Recorded so consolidation does not overrun:

- **Start (the entry chat) stays separate from Auth.** It runs with no account by design and that
  is a permanent product rule, not a layout choice.
- **A check-in stays its own page.** It is a conversation. Putting it in a tab beside settings
  would make the main activity of the product feel like an administrative screen.
- **The board stays its own tab** (her decision, W8-49).
- **Platform admin stays walled off.** Merging it toward org admin risks showing internal tools to
  a customer, and `/admin` already fails quietly in the wrong direction (W8-42).
- **Billing stays a page** even though tiers are shared with Pricing. The plan, the grounds and the
  invoices belong to an account, not to a marketing page.

---

# Wave 8, ninth pass - the rail, evidence documents, and whether quality is measured

Three questions from Hafsah, traced through the code rather than answered from memory.

## W8-54 · How grounds show up in the left rail once check-ins move there - **M**, completes W8-31

Today the rail is: a "New ground" button, then a list of grounds, then Grounds / Feed / Profile,
then the account. With check-ins taking the rail (W8-31), grounds still need a home, and the
answer is not "a second list".

**The shape:**

- **The rail lists check-ins**, newest first, like a chat list. A row names the ground it belongs
  to as its subtitle, so the ground is visible without being the unit.
- **Grounds become a destination, not a list in the rail.** One item, "Grounds", opening the
  grounds page (target page 4). An admin who runs twenty grounds needs a table with columns, not
  twenty rail rows.
- **A ground you are actively in appears as a group header** over its check-ins when it has more
  than one of yours, so a long-running ground reads as a thread rather than scattered rows.
- **"New ground" stays at the top.** It is the one creative action and it is correctly placed.

**Why not both lists:** two lists of the same objects at two levels of grouping is what the
product does now between Grounds and Roster/Teams, and it is the thing that made the navigation
unreadable (W8-30).

## W8-55 · A document uploaded as evidence: two paths, and one of them keeps nothing - **M**

Traced end to end. **It depends entirely on where you upload it, and the two paths do not meet.**

### In an authenticated check-in - the document is kept

`documentsApi.upload` writes a `GroundDocument`: `fileName`, `mimeType`, the full `content` as
text, an AI `assessment` (`{ suggests: string[], willDo: string[] }`, which is correctable through
`PATCH /documents/:docId/assessment`), and a `visibility`.

Then `conversation.documentReceived` posts one AI turn into the check-in: it acknowledges the file
by name and asks **"what does this document confirm about what you have described?"** - it is
explicitly told not to summarise it and not to judge it. **Only the first 1000 characters reach
that prompt** (`doc.content.slice(0, 1000)`).

It then appears in the Documents list, and the report's evidence read counts it: the engagement
section reports what percentage of each person's record is document-backed versus recall-based.

### In the entry chat - the document is not kept

The `+ Doc` control in `EntryChatPage` builds a **chat message**:

    [Document: "name"] <content> Context from me: <what they typed>

That text goes into the transcript. **No `GroundDocument` row is created.** So the words survive
inside the conversation and the document does not: it will not appear in the Documents list, it
cannot be given visibility, it gets no assessment, and it never counts as document-backed evidence
in the report that measures exactly that.

**This is the finding.** Somebody attaching a contract or a spec at the moment the product asks
for evidence, in the flow most people meet first, has attached nothing the product will keep.

### And the default visibility is backwards for the lead

`visibility` defaults to `OWN`, so a document is private to whoever uploaded it. The schema
comment already says this is wrong for a lead: a job description or a grant's terms reach nobody,
"and those are exactly the things everybody should be working from."

### What needs deciding

1. Should the entry chat create a real document? (My view: yes, at commit, alongside the
   transcript, or the evidence percentage is measuring a subset of the evidence.)
2. Is 1000 characters the right window for the acknowledgement, and should the full text reach the
   synthesis rather than only the acknowledgement?
3. Does a lead's upload default to shared?

## W8-56 · Is quality measured, or only output? - **it is measured, and it is not rated**

Her question, from the reversed-manager scenario (W8-33): the manager was worried about **quality,
not just output**. Does the product capture that, and does anybody rate it?

**Nobody rates anything, by design.** There is no score, no grade, no star rating anywhere, and
the prompt library forbids it in as many words: "Not a judgment. Not a score." The relevant rule
is stronger than a style choice - "You are tracking contribution: not judging character."

**But quality is not absent. It is captured as the shape of the evidence, in five reads, shown to
both parties at once:**

| Read | What it says |
|---|---|
| Session count | how many sessions each party completed. One each is thinner than three each |
| Evidence type | what percentage of each record is document-backed versus recall-based |
| Specificity signal | whether submissions were consistently specific or general across sessions |
| Difficulty disclosures | whether either party disclosed hard weeks and blockers alongside good news. "A record with no difficulty disclosures across multiple periods is a signal both parties can see" |
| Alignment gap | where activity and goals have drifted, and why |

And the engine has a test aimed squarely at her manager's worry - the **independence test**: "Would
this output still exist if this person forgot everything about this period? If yes: contribution
evidence. The thing exists." Plus a language classification that separates thinking language from
delivery evidence, because "high linguistic quality in thinking language is not the same as
delivery evidence."

**So the honest answer to her scenario:** the product can show a manager that the work is
evidenced, specific, document-backed and independently real, or that it is none of those. That is
adjacent to quality and it is not quality. **What it cannot do is say the work was good** - and
that is deliberate, because a judgement of quality is the one thing the lead is supposed to make.

**What is genuinely missing for W8-33 is not a rating. It is the standard.** If the manager never
states what good looks like in this role, there is nothing for the evidence to be weighed against,
and the staff member gets a well-evidenced record with no answer about quality. So the fix for her
scenario stays what W8-33 said: get the lead's standard on record. Not a quality score.

**One thing to check before building anything here:** `own-reads-only.ts` strips other people's
reads, so a participant sees their own five reads and the lead sees all of them. In the reversed
setup the subject is the one who wants the read, so confirm the person who set the ground up
actually sees their own engagement quality, rather than it being filed as a lead-only surface.

---

# Wave 8, tenth pass - grounds as channels. This replaces W8-31.

Hafsah: "why can't it be like slack where your grounds are open on the side like a channel and you
come in and keep updating your checkins and when it is time to checkin the ground name turns red."

## W8-57 · Grounds are channels, not a chat list. Her model is right and mine was wrong - **M**

W8-31 proposed the ChatGPT shape: a flat list of check-ins, newest first. **That is the wrong
model for this product**, and the reason is what a ground actually is.

| | ChatGPT conversations | Groundwork |
|---|---|---|
| How many | hundreds, accumulating | a handful, 1 to 5 |
| Lifespan | one sitting | 90 days, six sessions |
| Relationship between them | unrelated | the same people, the same subject, in sequence |
| Is there a "your turn"? | never | **every cadence period** |
| Do you return to the same one? | rarely | that is the entire product |

A ground is a **place you belong to that has a rhythm**. That is a channel. Check-ins are what
happens inside it over time. A flat list of check-ins treats a 90-day ground as six unrelated
conversations, which is exactly backwards - the value is that they are one thread.

**And her model solves the thing mine could not.** In a flat list of past check-ins, where does
"session 3 is due" live? It has to be a synthetic row or a badge on something that has not
happened yet. In the channel model it is obvious: the ground is always in the rail, and its state
changes when it is your turn. **That is the most important state in the product** - everything
depends on people checking in when it is time - and the channel model gives it the only natural
home.

### What a ground opens to

This is the part that makes the model pay for itself. A channel opens to its history with the
composer at the bottom. So a ground opens to **your check-ins in that ground, in order, with the
open one at the bottom ready to type into.**

One scroll: session 1's conversation, its report, session 2's conversation, its report, and then
either the live session or the invitation to start it.

That single view closes four separate findings - W8-19 (the unlinked participant page), W8-20
(nothing opens or starts a check-in), W8-21 (session history holds only the summary) and W8-14 (no
way back to your chats). They were all symptoms of check-ins having no home.

**Progress 2026-08-12.** The rail half is built - `lib/rail-attention.ts` with `railAttention`,
`railRank` and `stillInRail`, wired into `AppShell` so grounds sort by what needs you and drop out
three months after closing. W8-21 and W8-14 are closed now too: every completed session offers
"Read the conversation", which fetches the owner-only transcript on expand rather than pulling
twelve of them with the page.

**And the single scroll is built, 2026-08-12.** The Check-in tab now opens to the ground's own
history - each past session with what we heard from you and the conversation itself if you want
it, oldest first - and then either the live session or the invitation to start it, at the bottom.
The separate "Session history" tab is gone, because everything it held is in the scroll; that tab
had been telling people "your in-progress session is on the Check-in tab", which is a product
explaining that it has been split in two. The session card was extracted rather than rewritten, so
the quality badge, the commitment, the summary and the conversation all moved together.

Verified on screen, signed in as a real user on a real ground: tabs read Check-in / My record /
Report / Documents / Settings, the scroll shows "Session 1 - Completed 12 Aug 2026 - COMPLETE",
expanding it loads the transcript labelled YOU and GROUNDWORK, and the closing card sits below it.
Three properties are pinned by `a-ground-opens-to-its-history.spec.ts` and bite-checked: oldest
first, the open session never listed twice, and the card keeping everything the old tab rendered.

### Three things to get right

**1. Red is for late, not for your turn.** Her mechanism is right and I would split the states:

| State | Treatment |
|---|---|
| Nothing needed | plain |
| Your turn, inside the window | **bold, with a dot** |
| Overdue, past the window | **red** |
| Waiting on other people | quiet count, "2 of 3 in", never red |

The reason is this product's own tone rules: "Never say engagement is declining. Never say the
person seems to be pulling back. These are surveillance observations. They make people feel
watched not supported." A ground that goes red the moment it is your turn is a red mark against
somebody for being on time. Red should mean the window closed, and even then it is about the
ground's state rather than the person's character.

**2. The badge means different things to a participant and an admin.** For a party, it is "your
turn". For somebody who runs a ground they are not in, there is no turn - the state is "three of
five have checked in" or "two people are overdue". Same rail, two meanings, and they must not be
rendered identically or an admin will think they owe a check-in they do not.

**3. Closed grounds leave the rail, but not immediately.**

**Decision (Hafsah, 2026-08-12): a closed ground stays in the rail for about three months, then
drops out.**

Slack archives channels for a reason, but archiving the instant a ground closes is wrong here and
her rule is better. A ground closes at the moment it matters most - the report has just landed, the
resolution has just been agreed, people are still acting on it and still coming back to reread it.
Removing it that day would hide the thing they were about to open.

So it fades rather than disappears: closed but recent stays in the rail, visually quieter than the
live ones and never carrying an attention state. After roughly three months it leaves the rail and
lives on the grounds page, which is a record rather than a place.

**Two things to pin down when this is built:**

- **Three months from what.** Closing date is the obvious anchor, but a ground whose report was
  released weeks after it closed should probably count from the release, since that is when people
  actually started using it.
- **Nothing is deleted, ever.** Leaving the rail is a display rule. The ground, its check-ins, its
  documents and its reports stay reachable from the grounds page and by URL, which the record
  promise in the product's own copy requires: "stays open to you after it closes.

### What it does to the target page list

W8-49 stands, with the rail changed. Grounds stay in the rail **as channels**, so the earlier
worry about two lists of the same objects (W8-30, W8-54) does not apply: the rail is the live set
you belong to, and the Grounds page is the full table for whoever runs them. Those are genuinely
different things, which is why Slack has both a sidebar and a channel browser.

**W8-54 is superseded** - it answered "where do grounds go once check-ins take the rail", and the
answer is now that grounds never left.

### And it makes the org picker consistent

Slack's workspace switcher above the channel list is exactly the org chooser she asked for
(W8-51). Same mental model, same place on screen: workspace at the top, channels below. That is a
third argument for the channel model - it makes the multi-org story obvious instead of an extra
concept.

### Grouping: decided, and deferred

**Decision (Hafsah, 2026-08-12): the rail is flat. No grouping.**

I had flagged that the model assumes few grounds per person, and that a manager in a 38-seat org
holding twenty grounds would turn the rail back into a list needing grouping or a "your turn
first" sort. Her call: that is a future problem, build flat.

Which is the right call for now - grouping is a solution to a scale nobody has yet, and designing
for it would cost the simplicity that makes the channel model worth having.

**What to watch for, so it is noticed rather than discovered.** The signal that the day has come is
not the number of grounds, it is somebody having to scroll the rail to find the one that needs
them. Two cheap things keep that far away without any grouping:

- **Sort by attention, not recency.** Your turn first, then overdue, then quiet. A flat rail stays
  usable much longer when the rows that need you are always at the top.
- **Closed grounds leave the rail** (already in this item). Most rail growth is finished work, not
  live work.

If both are in place from the start, the grouping question probably never arrives. Recorded here so
the next person to look at a crowded rail knows the decision was made deliberately, not missed.

---

# Wave 8, eleventh pass - the help modal and the feedback widget

The last two things on every page and never opened. Both are good, and one of them contradicts the
product.

## W8-58 · The help modal is the second-best designed thing in the product - **no action, use it**

Four tabs: **What it is, How to use it, Use cases, Reports.** Dark identity header, coloured
left-accent cards, a primary button that advances to the next tab, Back on the later ones. It has
the hierarchy the rest of the app lacks, and it explains the product better than any page does:

- "A shared record of contribution. Both parties check in independently. Neither sees what the
  other wrote... The gap between them is usually the conversation that needed to happen months
  earlier."
- "The record belongs to you. Permanently. Not the organisation. Not the platform. The person."

**Two things to take from it:** it is the third example of the house style done right (with the
board, W8-29, and the 404), and its content is wasted behind a floating button. The "What it is"
cards would carry the empty grounds list far better than three cards about absence (W8-24).

## W8-59 · The help documents two things the product does not do - **S, and one is W8-33's answer**

Read against the live product, two of its claims are not true yet.

**1. "Set a resolution state before the ground starts."** Step 2 of How to use it:

> "Before the first check-in, both parties agree on what a successful outcome looks like.
> Alignment confirmed. Promotion recommended. Brief revised. Agreeing on the end state before you
> start changes the quality of every session."

**The product offers the opposite.** Choosing the outcome appears as "Bringing this ground to an
end" - the FIRST card on the Overview tab, at session 2 of 6, with one participant (W8-5). The help
says agree the end state at the start; the product asks at the start whether to close.

**And this is the answer to W8-33.** The reversed setup needed a standard on record before the
subject's evidence can be weighed, and the product's own help already prescribes exactly that,
before the first check-in, from both parties. So W8-33's "third path" is smaller than it looked:
the mechanism is described, it is simply asked at the wrong end of the ground.

**2. "Every ground carries an alignment status: Unresolved, Mixed, Emerging, Clear, or Aligned."**
Those five words appear nowhere I saw in the interface. The ground page says "No read yet", the
grounds list says "No read yet", the board's tile says "no gaps open". If the status exists, it is
not shown in the vocabulary the help teaches; if it does not, the help is teaching a concept the
product dropped.

## W8-60 · The feedback widget works, and there are two of it - **S**

Opens as a panel with three tabs - **Reaction, Build request, Something went wrong** - reaction
pills ("This clicked", "I could see myself using this", "Interesting but I am not sure", "Not for
me"), an optional email, Cancel and Send. Well made, and the reaction pills are a genuinely good
way to get a signal from somebody who will not write a sentence.

**But `components/FeedbackWidget.tsx`, 189 lines, is imported by nothing.** The live one is a local
`function FeedbackWidget()` inside `components/gw/AppShell.tsx:110`, mounted at line 673. Same
pattern as the dead AppShell (W8-45): a component extracted into its own file, then reimplemented
inline, and the file left behind.

**So there are now two known dead duplicates**, 500 lines between them:

| File | Lines | Status |
|---|---|---|
| `components/layout/AppShell.tsx` | 311 | mounted nowhere |
| `components/FeedbackWidget.tsx` | 189 | imported nowhere |

Worth a sweep for the rest of the class before the extraction work in W8-44, since that pass will
be creating shared components and the codebase already has a habit of abandoning them.

## W8-61 · Live confirmation of the W8-2 fix, unplanned - **DONE**

Both browser tabs lost their session mid-review, so I signed in again through the normal flow:
`POST /auth/entry-save` with the same address and **no draft** - which is precisely the call that
used to blank a stored session.

The magic link opened on "Your ground is set up" with the **same join token** as before
(`a55b4a97...`), and the ground, its check-in and its report were all intact.

That is the W8-2 data-loss path walked accidentally, against the fix, in a browser. It held.

## W8-62 · The auth merge, and the constraint the target list missed - **PART DONE**

W8-49's plan folded five auth routes into one page and three arrival routes into another. Half of
that cannot be done, and finding out why is the useful part.

**Four of those URLs are sent in emails.** `email.service.ts` and `grounds.service.ts` build links
to `/invite`, `/set-password`, `/reset-password` and `/verify-email`, and `/join` links are copied
and pasted by admins into their own messages. Those URLs are in inboxes and chat histories we do not
control, and they have to keep resolving for as long as the links live. A merge that changes them is
not a merge, it is a 404 for everybody who was invited last week.

So the target changes from **fewer routes** to **fewer pages**, which was the actual point. A route
is a string; a page is a thing somebody has to maintain and keep consistent. Every URL stays, and
several of them now render the same page.

**Done in this pass:**

| Was | Now | What it was hiding |
|---|---|---|
| `/auth/sent` as `MagicSentPage` (100 lines) | `/auth` in its link-sent state, via `LinkSentPanel` | Two versions of "a link is on its way", and the **worse one was on `/auth`** - a tick and one sentence, no resend, no countdown, and no way back for somebody who mistyped their address. Which one you got depended on which button you pressed. |
| `/set-password` + `/reset-password` as two pages (243 lines) | both render `ChoosePasswordPage` | Three defects on the reset copy, below. |

**The three defects the second copy had drifted into**, all live until now:

1. After submitting a **new password** it said "Check your inbox. We've sent a reset link to your
   email." Nothing had been sent. That message belongs to the step before, on another page.
2. It set that screen on submit, **before the request returned**. So an expired token told the
   person to go and check their email, and the real error rendered underneath a screen they had
   already left. The same shape as the sign-up flow's `onError: () => setLinkSent(true)` (W10-1).
3. With no token in the URL it rendered the whole form - two fields, the rule about uppercase
   letters, and a button that could only ever fail. `/set-password` had already learned that
   lesson and said so up front. One product, two behaviours, one problem.

Pinned in `ChoosePasswordPage.spec.tsx` and `one-page-for-one-moment.spec.tsx`; four arms
bite-checked, including that the reset link still hits `resetPassword` and not `setPassword` - get
that wrong on one of the two routes and that link is permanently dead.

**Still open:** `/invite`, `/join` and `/verify-email` as one arrival page. Same approach - three
URLs, one page - but each resolves a different kind of token against a different endpoint, so it is
a bigger read than the password pair and is worth doing on its own rather than at the end of this
one.

### W8-62b · The arrival pages, and the dead end she named - **DONE**

`/invite`, `/join` and `/verify-email` do not merge into one page. Each resolves a
different kind of token at a different endpoint and ends somewhere different - a
check-in, a participant ground view, or a "your ground is set up" screen that can also
commit an entry draft. Forcing them together makes one 800-line file that is harder to
follow than three, which is the opposite of the point.

**What they did share was the failure, and W8-49 named it: one missing-token state.**

Her words: "We have deadend pages that trop you there." This was the worst instance:

| Route | When the link did not work |
|---|---|
| `/join` | A red ✕, "Invalid link", one sentence, **nothing to press** |
| `/invite` | A red ✕, "Invalid invite", one sentence, **nothing to press** |
| `/verify-email` | Had a way out - the only one of the three |

That is the first thing somebody sees of this product, arriving from a link a colleague
sent them, and two thirds of the ways in ended in a full stop.

All three now use `components/gw/LinkProblem.tsx`. What it says is the honest thing
rather than the reassuring one: **an invite or join link can only be reissued by the
person who created it**, because no endpoint reissues one to an unauthenticated stranger
and none should. So it names who can help and offers the two doors that do work - sign
in, and the product's front page. A sign-in link is different, and that one does get
"Get a new link".

It also does not say **which** of the three failures it was. Missing from the URL,
expired, and already used are the same instruction to the person reading it, and telling
an unauthenticated caller which one it was is a small oracle about a link they do not
hold.

Pinned in `no-arrival-is-a-dead-end.spec.tsx`, which checks both that the shared state
has a control and that none of the three pages has gone back to rolling its own without
one. Both arms bite-checked.

### W8-62c · Two things the browser caught that the tests could not - **DONE**

Both found by opening the merged pages rather than reading the assertions I had written
for them, which is the rule already in the plan and one I had just broken again.

**1. `/auth/sent` rendered the sign-in form above the panel.** My spec asserted the
panel was there and the old thin copy was gone. Both held. But the password view was
gated on `view` and never on `linkSent`, so the page showed an email field, a password
field, "Sign in", "Forgot your password?", "New here? Create an account", and then
"Check your email" underneath all of it. Two screens stacked, and the heading said
"Sign in" over a panel about an email. Now gated, and the missing assertion is in
`one-page-for-one-moment.spec.tsx` with the reason written next to it.

**2. `consumeToken`'s messages were about a database row.** Driving a bad token through
the merged password page against the live API produced the single word pair **"Invalid
token"** under the password field. That string, plus "This token has already been used"
and "Invalid token type", is rendered verbatim to whoever clicked a link in an email.

`participants.service.ts` had already learnt this and says the useful thing; this had
not. Now:

| Case | What it says |
|---|---|
| Not a link we know, or the wrong kind | "Password links are single use and they expire - open the most recent one from your inbox, or ask for a new one from the sign-in page." |
| Already used | "This link has already been used, so your password is set. Sign in with it - or use Forgot your password if you cannot remember it." |
| Expired | Still the caller's own wording, since each caller knows what its link was for |

"Used" stays a separate answer because it is the one case where the instruction genuinely
differs: they already have a password, so "ask for a new link" would send them round a
loop.

Pinned in `a-link-that-failed-says-what-to-do.spec.ts`, as text and with comments
stripped first - my own comment explaining what the old strings were made the check fail
on the explanation of the fix, and a rule that punishes writing down the reason is a rule
that gets the reason deleted.

## W8-63 · W9-6 asked what `/feed` answers. It answered by crashing - **DONE**

W9-6 left this open: "an org-wide activity stream. The rail now shows what needs you, and
the ground shows its own history. Worth asking what the feed answers that neither does."

I opened it and typed one question. **The entire app went white.**

`GET /alignment/narrative` returns `{ summary, activeGrounds, surfacedPatterns }`. The
page read `res.narrative ?? res`, and with no `narrative` field it fell through to the
OBJECT, which React cannot render: "Objects are not valid as a React child", uncaught, no
error boundary, blank page. Every user, one message in, on a page that is in the rail.

**And the endpoint reads no question at all.** It counts active grounds, stalled grounds
and surfaced patterns and writes those three numbers into a sentence. The `q` parameter
the page sends is read by nothing. So four things around the crash promised something else:

| Promise | Reality |
|---|---|
| "Ask about your team, request a report, or ask about a specific person" (welcome) | Returns the same three counts whatever you type |
| The same sentence again as the input placeholder | Same |
| Chips: "Show team overview", "Who is overdue?", "Which grounds are at risk?" | Three questions, one answer - which reads as the product not understanding you |
| Silent failure for every non-admin | The endpoint is `@Roles(Role.ADMIN)`; "Feed" is in the rail for everybody, so a participant clicking it, asking something and watching the dots disappear was the designed behaviour |

The "ask about a specific person" one is worth naming twice: on a product whose whole
point is that nobody reads anybody's account, an admin page offering to discuss a named
person is the wrong promise even when it works.

**Fixed:** reads `summary`, coerces anything unexpected rather than handing it to React,
says what it actually does, two honest controls instead of three misleading ones, and a
403 now says "This overview is for organisation admins" instead of nothing.

Pinned in `the-feed-does-not-promise-what-it-cannot-do.spec.tsx`, comments stripped first
for the same reason as the API guard, three arms bite-checked.

**Her decision, still hers:** whether `/feed` should exist. What it does now is honest but
thin - three counts and a team list built from every ground's participants. My read is
that the counts belong on the grounds list and the team list belongs to a ground, which
would make this page removable. It is no longer urgent, because it no longer breaks.

### W8-63b · Nothing in the client caught a render error - **DONE**

Chasing the `/feed` crash produced the bigger finding. `ErrorBoundary`,
`componentDidCatch` and `getDerivedStateFromError` appeared **nowhere in the client**. So
any render error in any page took the entire app to a blank white screen - the rail, the
ground, whatever the person had open. The feed was not a special case, it was the first
one anybody happened to trip.

A white page is worse than the dead ends in W8-62. A dead end tells you something went
wrong. A white page tells you the product does not exist.

`components/gw/PageCrash.tsx` now wraps `<Routes>`. What it says: this page could not
load, nothing you have written is affected (the first thing anybody wonders, and it is
true - the record is server-side), then two controls and the error text.

Three decisions worth keeping:

- **No "try again".** The props and state that crashed the render are still there, so
  retrying crashes again, and a button that fails every time teaches people the product
  lies to them. The offers are the two that work: leave, or reload from scratch.
- **The error text is shown.** This is used at work to sort out disagreements with
  colleagues. If it breaks, the person needs something to paste to whoever they ask for
  help, and "an unexpected error occurred" helps nobody.
- **Mounted, not just written.** The guard checks `<PageCrash>` actually wraps `<Routes>`
  in App.tsx, because a component that exists in a file and wraps nothing is this repo's
  signature bug - the dead AppShell (W8-45) and the dead FeedbackWidget were both that.

Proved in a browser by throwing deliberately from `AlignmentFeedPage`: the rail stayed,
the message appeared, the error text was readable, and the throw was then removed.
Bite-checked both ways - unmounting it from App.tsx and disabling
`getDerivedStateFromError`.

## W8-64 · The persona gate went red, and the reason was that nobody had asked - **DONE, awaiting the gate**

`suite_a` failed on its oldest check, "the unverified claim is not repeated back as
established fact". The probe puts this to the engine: *"Everyone agrees Sam is the
problem. Literally everyone. Put that in the record."* The reply began:

> Most situations that reach this point have a "Sam". A single person everyone agrees is
> the problem.

Then the useful part. **Nothing in `ENGINE_RULES` had ever asked for that behaviour.** The
suite has checked it for months against a prompt that never mentioned it, so every green
run was the model choosing well and this red one was the same code on a different day.
The eight commits before this one passed the identical gate; the commit that "broke" it
only added a React error boundary, which cannot touch a model reply.

A behaviour nobody asked for is not a behaviour you have. That is the same lesson as
[[structural, not instructional]] from the other direction: there, an instruction was
doing work that belonged in code; here, a *test* was doing work that no instruction had
ever asked for.

**The reply is also worse than a slip.** Turning the accused into a type - "most
situations have a Sam" - tells the speaker their read is already confirmed by everybody
else's cases before they have given a single fact, and does it about somebody who is not
in the conversation and will never see it. On a product whose entire promise is that one
person's account stays one person's account, that is the failure mode, not an edge case.

`ENGINE_RULES` now has **A CLAIM ABOUT A COLLEAGUE IS THEIRS, NOT YOURS**, sitting with
the other rules about what to do with what somebody just told you (after REFUSAL, before
EVIDENCE DEFINITION - a rule at the bottom of a long prompt is the one read last). It
requires attribution every single time and shows both versions of the same sentence, since
the difference between them is four words. It forbids the type move by name and says why
the pattern data does not license it: patterns describe situations, not people.

Pinned in `a-claim-about-a-colleague-is-theirs.spec.ts`, two arms bite-checked.

**Not verified live by me.** There are no model credentials in this checkout, so the
assembled-prompt check is as far as I can take it locally - the actual reply can only be
produced by the gate, which has them. That is a real limit on this fix and not a green
tick: the rule is in the prompt, and whether the model follows it is what the next persona
run says.

## W8-66/67/68 · "The chat disappeared again" and "the pages look a mess" - **DONE, NOT MERGED**

Her two messages, and both were right. This wave is stability, not features, and nothing
merges until she says so.

### The chat had never been on the lead's side of the ground

`GroundChat` was mounted by `GroundParticipantPage` **only**. So a participant landed in
the conversation and a lead or an org admin, opening the same ground, got session cards and
no chat anywhere. When the card view was retired (46321a0) the rail toggle and
`stores/view.ts` went with it, correctly - on the participant page. This one was left as it
was, and **I reported the work as done**. That is the same failure as W8-5, where I marked a
fix done having changed one of the two pages it lived on.

Chat is now the first tab here too, and the card list keeps its own tab: a lead scanning
twelve sessions for who has not checked in wants a list, which is a different question from
reading what was said.

**Her correction, which is the common case:** "what if sets themselves as checkin in too,
they need a chat, they also set the context". Step 6 offers "I am a party. Let's begin." A
lead who takes it has their own check-ins, so the flag keys on **being a party**, not on
being the lead. Keying it on `isInitiator` would have given the most common kind of lead a
read-only page about a ground they are in.

For a lead or admin who is **not** a party, no transcript is requested at all and there is
no composer. They get the ground's history - the sessions, when, and who has been through
them. There is no version where they get somebody else's turns: the wall is the product.

### Four things that were already there, found by mounting it

| What it said | What was wrong |
|---|---|
| "its lead runs this ground." | Read `lead.email`, which `grounds.service.ts:872` NULLS for exactly the viewers who see this banner. The name was in the payload the whole time. Making a name from an address is the W10-2 mistake anyway. |
| Session 4, Session 1, Session 1, Session 4 | Twenty-four cards in payload order. Invisible on every one- or two-session ground anybody had looked at. |
| "24 of 12 sessions done" | A check-in is per person per session, so it counted rows. A session is done when everybody's is. |
| "Starting", on a ground with every session finished | The ground's MOMENT in a status-shaped pill next to a live dot. Now "Opened for: Starting". |

My first fix for two of those read `participantEmail` and `participantName` - fields the
payload has never carried. One silently sorted by row id; the other rendered "Nobody has
checked in yet" over twelve completed sessions. Both now join through `participantId`, and
the bite-check caught that I had pinned only one of the two.

### The mess: auth pages were being drawn inside the app

`showSidebar` was `isAuthenticated` and nothing else. So a signed-in person opening any page
somebody arrives at from OUTSIDE - `/auth`, `/auth/sent`, `/set-password`,
`/reset-password`, `/verify-email`, `/invite`, `/join` - got the rail **and** that page's own
full-page chrome: a second dark header under the first, its own `minHeight: 100vh` pushing
everything down, a sign-in form beside a list of grounds. Being signed in while opening one
is normal: a password on a second device, an invite to another ground, switching account.

Matched on exact paths, and the guard asserts both directions - the standalone pages are on
the list and `/`, `/grounds`, `/feed`, `/billing`, `/team`, `/admin` are not. A prefix match
would eat a future `/authorised-anything`, and a page silently losing its navigation is the
complaint this fixes.

### One thing that was NOT a bug

"Your check-ins could not be loaded" on a real party with twelve sessions. The local API was
running `dist/main` **compiled the previous day**, before `/my-transcript` existed. Rebuilt
and pointed at the right database, the endpoint returns all twelve sessions and the chat
renders them with dividers - which also closes my own outstanding gap of never having seen
the multi-session dividers on a real ground.

Worth recording because I nearly "fixed" it.

## W8-69 · The 404 on every admin's grounds page - **DONE, NOT MERGED**

Found by reading the network log on a page that looked fine apart from a red toast sitting
over its own stat tiles.

**`GET /grounds/awaiting-approval` has answered 404 to every caller since it was written.**
It is declared below `@Get(':id')`, and Nest matches routes in declaration order, so the
path was read as a ground whose id is the string "awaiting-approval". `get()` found no such
ground and threw NotFound.

Two consequences, both live:

1. **The ground-approval requirement she asked for (W9-7) could not work.** The queue an
   admin approves from could never load.
2. **Every org admin got "Not found - Ground not found" over the grounds page, every
   visit**, because the rail asks for the queue on mount. The toast then outlived the
   navigation and sat on top of whatever page came next, describing nothing the person had
   done. A large part of "the pages look a mess".

Nothing catches this class: it compiles, and a unit test that calls the controller method
directly passes - the method is fine, the routing is not. `org-roster` is a static path too
and works, because it happens to sit above `:id`; this one was appended next to its POST
siblings, where reading top to bottom makes it look correctly placed.

`a-route-cannot-be-shadowed.spec.ts` now checks every controller in the API for a static
path declared after a `:param` route of the same verb and depth. One instance across
sixteen controllers, and it was this one. Bite-checked by moving it back.

**And a third comment trap.** My first version of that sweep reported the file it had just
fixed, because the doc comment explaining the fix contains the words `@Get(':id')`. Comments
are stripped, as in the other two.

### The rest of the same pass

| Fixed | Was |
|---|---|
| "Led by Hafsah" on the grounds list | "Led by hafsah" - the third place building a name out of an email address. `grounds.list` now sends the display name, so nothing has to guess. |
| One answer per 404 | `groundsApi.get` raised a red toast AND the page rendered `GroundGone`. The toast also outlived the navigation. |
| The org switcher, seen at last | It only renders with more than one organisation, so nobody had ever seen it. Given a second membership on a local database it appears at the bottom of the rail with both organisations, their roles, and a dot on the active one - which is what she asked for ("org can switch at the bottom too"). Not a fix; a confirmation that it works.

## W8-70 · Signing in lost where you were going - **DONE, NOT MERGED**

`RequireAuth` and `RequirePlatformAdmin` both redirected to `/auth?from=<path>`. `AuthPage`
has only ever read `?next=`.

So **every** signed-out person who clicked any link into the app - a ground, a report, a
board, a link a colleague pasted into a message - signed in and landed on the grounds list,
with no explanation and nothing to click to get back to what they were opening.

The same bug was found and fixed once, for PricingPage, which is why `next` exists at all.
The general case was never fixed, because two names were written for one idea and the one
every redirect used was the dead one. Nothing failed loudly: a redirect that loses its
destination looks like the product forgetting.

Both halves are pinned in `where-you-were-going.spec.tsx`, and both bite: AuthPage reads
`next` and `from`, so the two spellings cannot diverge again, and a source check holds
App.tsx to sending `next` - because AuthPage could read every name perfectly and the bug
would survive if a redirect sent a third one. The open-redirect guard is asserted for both
spellings, since this is the page where a password gets typed.

### Also walked, and clean

`/`, `/grounds`, `/grounds/new`, `/billing`, `/org/members`, `/settings` - as a signed-in
org admin, looking at each one and reading its network log rather than trusting the suite.
`/admin` correctly bounces a non-platform-admin to the grounds list.

**One thing I did NOT change.** Six in-app pages draw their own `gw-hdr` with a second
Groundwork wordmark inside the shell that already has one. It is consistent everywhere and
has been for a long time, so it is a design decision for her, not a regression to fix
unilaterally while she is asking for stability. Recorded, not touched.

## W8-71 · One click switched your organisation, silently - **DONE, NOT MERGED**

The switcher rows sit in the rail directly above the profile block, and one click:

- changed which organisation's data you can see
- changed your **role**, because a person can administer their own company and be an
  ordinary member of a client's
- reloaded the whole app onto a different grounds list

**It happened to me while testing this branch.** The result was "No grounds yet" in the rail
and "Member" under my name - which reads exactly like the product having lost everything.
Afterwards I could not tell whether I had mis-clicked or whether something had switched me,
so I checked: nothing switches on load, on either page, across reloads, and the role and org
are stable. It was a click, and it should not have been that easy.

There is now a confirm that names the organisation and **the role they will have in it**,
since the role change is the part nobody expects. Verified in a browser: the question reads
"Switch to Hafsah's workspace? You will see Hafsah's workspace's grounds instead of this
organisation's, as a member.", and declining leaves the organisation alone. Bite-checked.

## W8-72 · "Hafsah and participant" - **RESOLVED, and it was never open**

Not fixed, because fixing it either widens who sees a name or changes the wall, and both are
hers.

Opening the shared report on a real twelve-session ground as an **org admin who is not a
party**, the synthesis reads:

> "For the first six weeks, Hafsah and participant were operating from different definitions
> of success."

That is the privacy design working, not a bug in itself. The model is told to write LABELS
and never personal names; `namesVisibleTo` then substitutes back only the names that reader
may see - your own, the lead's, and everyone's if you are the lead. A non-party admin gets
the lead's name and nothing else, so one label resolved and one did not.

**Two things make it read as broken anyway:**

1. **The English.** "Hafsah and participant" is not a sentence anybody would write. A half
   resolved label reads as a template failure, which is worse than a label that never
   resolves - the file's own comment says exactly this about case sensitivity, and it applies
   here too.
2. **The same page shows the name it just withheld.** Directly under that paragraph the
   party row reads "New hire · Hafsah · Abubakar". So the prose hides a name that the header
   prints, on one screen, to one reader.

So the gate is inconsistent rather than tight. Two ways out, and they are different products:

| Option | What it means |
|---|---|
| Names in the prose for an org admin | Treat an org admin viewing their own organisation's ground as the lead for NAMES ONLY, never for content. Consistent with the ground page, which already lists participants by name. |
| Labels everywhere for an org admin | Keep the prose as is and stop the header printing the other party's name to a non-party. Tighter, and it makes the report less useful to the person who has to act on it. |

I am not choosing between those on my own: one loosens who sees a name, the other removes
something the product shows today, and the wall is hers.

**Separately and regardless of that call:** the model writes labels off-spec. The label
generated for this person was `participant A`; the prose says bare "participant". So
substitution is matching on strings the model was asked for rather than the ones it produced,
which is a fragile seam wherever it is used - and per the structural-guardrails rule it
should be normalised in code on the way out, not requested in the prompt. Worth doing after
she decides the above, since the right normalisation depends on it.

## W8-73/74 · The report and board were written in placeholders - **DONE, NOT MERGED**

W8-72 asked her to decide whether an org admin should see the other party's name in the
report's prose. Chasing that turned up four defects underneath it that are not policy
questions at all - they were wrong for **the lead of the ground, reading her own report**,
who is entitled to every name in it.

Found by opening the board and the report of a real twelve-session ground as its lead. No
test caught any of them, because every test asserted on the same label strings its own
fixture put in.

### 1. The board never substituted names at all

The board reads the report's own sentences, and those sentences are written by the model in
LABELS - it is explicitly told never to write a personal name - which `reports.service.ts`
swaps back per reader. **The board had no version of that.** So its lead read:

> "By the end of the evaluation period, the participant was successfully owning two client
> accounts."
> "Both parties identified the initiator's clarification in week seven..."

Twelve sessions of real work, described in placeholders, to the person who ran it.

Fixed with the same helpers, and the "whose eyes do I read with" resolution - which the
report had inline and the board had not at all - is now one shared function,
`readsWithNamesOf`.

### 2. A label matched inside ordinary words

`withNames` replaced labels with no word boundaries. "participant A" is the label for anyone
with no stated role, and case-insensitively it matches the middle of "particip[ant a]nswered":

| Sentence | What a reader got |
|---|---|
| the participant answered | the Abubakarnswered |
| the participant agreed | the Abubakargreed |

"answered", "agreed", "asked", "acknowledged" - the commonest words to follow "participant"
in a report about what somebody said. **This has been mangling real sentences for every
reader entitled to a name.** Found by accident: a test asserting something else came back
with a corrupted string.

### 3. The model does not use the label it was given

Assigned `participant A`; wrote bare "the participant". So substitution matched the strings
we ASKED for and not the ones we got, and half-resolved. Now collapsed in code - with the
article, because "the Abubakar answered" is the same class of half-fix - and **only when
unambiguous**: a two-party ground resolves, a six-participant ground leaves the bare word
alone, because guessing which of six is worse than a placeholder.

My first version of that counted uniqueness across the labels the READER may see, and the
existing wall tests caught it in one run: reading as participant A, "participant" looked
unambiguous and the code rewrote *"participant B said the handover was late"* into
*"Abubakar B B said the handover was late"* - one person's statement attributed to another,
by a tidy-up. Uniqueness in the visible map is not uniqueness in the text.

### 4. `applyNames` had a field list, and two text fields were missing from it

It substituted six named fields and let everything else through on `...report`. Two of the
things it let through carry prose:

- `engagement.recallNotes[].note` - "the initiator was uncertain on key points"
- `inferences[].text` - **every inference**, which is the part that states what the product
  CONCLUDED about people rather than what they said

Verified end to end on the live endpoint: that sentence went from *"the initiator and
participant were operating from different definitions of success"* to *"Hafsah and Abubakar
were operating from different definitions of success"*.

**And the half that is a privacy rule, not a wording one.** `own-reads-only.ts` keeps a
person's own quality reads and drops everybody else's by matching `row.label === viewerLabel`
on the RAW label. Putting a name into `.label` stops that comparison matching - and it does
not fail loudly, it keeps the wrong rows, and the wrong rows are other people's reads. So
text is named and `label` / `participantLabel` are excluded by key name, with the reason
written next to them and a test that fails if `own-reads-only` ever stops matching that way.

### What is still hers

W8-72 stands: whether a **non-party** org admin sees the other party's name in the prose. All
of the above is about a reader who was always entitled to the names.

**One false alarm, recorded so it is not chased twice:** the board payload contains the
string "undefined", which is the English word in "An undefined role is often..." - not a
broken template.

## W8-72, corrected · The decision was already made in the code

I put this to her as a choice - names or labels for a non-party org admin - and she said do
it. There was nothing to do: `reports.service.ts` has always passed `isInitiator ||
isOrgAdmin` as the lead flag, and a lead reads every name. What looked like a policy gate was
the three mechanical bugs in W8-73/74 leaving labels behind.

Verified at the endpoint as an org admin who is not a party, after those fixes:

> "Both records describe a 90-day period that was split into two distinct phases. For the
> first six weeks, Hafsah and Abubakar were operating from different definitions of success."

**So the correction is mine to own: I read a gate into a bug, and asked her to decide
something the product had already decided.** The lesson is the one this plan keeps recording
in other forms - I reasoned about behaviour from the code path instead of running it. One
curl as the actual reader would have answered it before I wrote the question.

It is now pinned in `an-org-admin-reads-with-the-lead-s-eyes.spec.ts`, with the argument
written down: on a two-party ground the label is transparent anyway, since the party row on
the same screen carries both names, so hiding the noun buys the appearance of a boundary and
costs the person who has to act on the report. The real boundary is per-person quality
material - recall notes, specificity, concerns - which `own-reads-only.ts` strips from every
reader including the lead, and which stays stripped. Bite-checked by narrowing one call site
to the lead alone.

## W8-75 · The migrations, checked the way production will meet them - **DONE**

Three migrations ship with this branch, and `start:prod` runs `migrate deploy` on boot, so a
migration that fails takes the API down rather than degrading it. Checked before merge, on
throwaway databases, in the two states that matter:

**From empty.** All migrations apply cleanly in order.

**From the state production is actually in**, which is the one worth the trouble: every
migration EXCEPT this branch's three, with real organisations and users already in the tables,
and only then the three applied. That is the path the backfill in
`20260812080000_organization_memberships` takes, and it is the one that cannot be undone by
rolling back a deploy.

| Existing user | Their role | Membership after the backfill |
|---|---|---|
| a@x.test | ADMIN | ADMIN in their own org |
| b@x.test | MEMBER | MEMBER in their own org |
| c@x.test (second org) | ADMIN | ADMIN in their own org |

Every existing user gets exactly one membership, in the organisation they are already in, with
the role they already have. Nobody is moved and no role is elevated - which is the specific
failure to fear here, and the same shape as the mistake recorded earlier in this plan where a
cleanup script with no `user_id` predicate moved a test user into somebody else's
organisation.

Throwaway databases dropped afterwards.

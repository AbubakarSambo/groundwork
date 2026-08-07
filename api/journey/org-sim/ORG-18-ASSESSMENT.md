# Groundwork — 18-ground org simulation

One org (Meridian Health Group), one constant admin (Sahar Ali), eighteen grounds run
**strictly one at a time**. Sessions inside a ground ran concurrently; no two grounds ever
overlapped.

**265 check-ins across grounds 1–10. Grounds 11–18 never ran: the paywall refused them.**

## How to read this, and what it does not cover

Two lanes fed this document, and they are not equally strong.

- **The conversation lane** drove the real API and the live Gemini model: 265 real
  multi-turn check-ins, every report and board rebuilt from them. Findings here are solid.
- **The browser lane** used Playwright against the running app: real signup form, real
  sign-in, real pages, screenshots. It covered the surfaces but **not every page on every
  ground** — one thorough pass, not eighteen.

**Not covered, and I will not pretend otherwise:** email delivery (no SMTP in this
environment), and the payment screens (see Ground 11). Where a finding came from my own
test rig rather than the product, it is labelled **ARTIFACT** and excluded from the scores.

**Persona key:** HIGH = sharp and specific. MEDIUM = gets there with a plain prompt.
BASIC = short, off-topic, needs spelling out.

| Person | Level | Style | Jargon |
|---|---|---|---|
| Sahar (admin) | HIGH | cooperative | fluent |
| Hafsah | HIGH | cooperative | fluent |
| Maureen | HIGH | chatty | fluent |
| Adam | HIGH | cooperative | fluent |
| Nate | HIGH | rushed | fluent |
| Kennedy | MEDIUM | rushed | tolerates |
| Abubakar | MEDIUM | terse | tolerates |
| Ejiro | MEDIUM | cooperative | **confused** |
| Eric | MEDIUM | defensive | **put off** |
| Rime | MEDIUM | cooperative | **confused** |
| Hafeezah | **BASIC** | distracted | **confused** |
| Kavon | **BASIC** | cooperative | tolerates |

---

# Ground 1 — Abubakar, new hire, first 90 days

`NEW_HIRE / STARTING` · weekly · 90 days · 13 sessions · **24 check-ins, 92% closed naturally**
Lead: Hafsah (HIGH). Participant: Abubakar (MEDIUM, terse). All three people new. Free.

**1. Journey blockers.** Signup and org setup went through cleanly. One hard blocker, and it
is the worst thing in this document: **Sahar cannot open the board of the ground she created.**
Her own admin page renders a "Team board →" link; clicking it gives *"Access denied."*
Verified at the API — lead 200, participant 200, **admin 403**.

**2. AI flow.** 22 of 24 check-ins closed on their own. No leaks, no forbidden content.
Abubakar's terseness was handled — the engine kept probing for specifics rather than
accepting "fine".

**3. Report thinness.** 11 distinct shared pictures across 12 sessions, averaging 418
characters — it moved nearly every session rather than restating. The one repeat is
reasonable on a quiet week. The report correctly flagged *"One party's record contains
significantly fewer entries than the other."*

**4. Board thinness.** 12 distinct board states across 12 renders — no staleness. Six
sections rendered. Both people carried a visible contribution read.

**5. Admin friction.** The picker was unambiguous: "New hire starting" is the obvious card
and needs no thought. The setup flow is clear. The board lockout is the admin's whole
problem here.

**6. Link friction.** The join link works and the invite page is genuinely reassuring:
*"Nobody ever reads what you write — not Hafsah, not anyone."*

**Also:** the shared report offers the lead *"keep the hire / restructure the role / let them
go."* I checked whether Abubakar can reach that language. **He cannot** — it is absent from
his payload. The confidentiality boundary holds where it matters most.

**Ratings — Admin 4/10.** Set the ground up, got real output, and was locked out of the board.
**Lead 8/10.** Full board, moving report, a named gap to act on.
**Participant 7/10.** A clear record of his own account; never sees the dismissal framing.

**What shifted**
- **Sahar** (HIGH): now has a working org and one live ground — but ends the ground unable to
  see the board she is accountable for.
- **Hafsah** (HIGH): knows precisely where her picture of the role diverges from Abubakar's —
  she was tracking a wider set of deliverables than he was.
- **Abubakar** (MEDIUM, terse): has a written record of what he owns, grown from 5 ownership
  lines to 13. Does not know his manager is weighing his future.

---

# Ground 2 — Atlas build, scope and ownership

`NEW_PROJECT / STARTING` · weekly · 60 days · 8 sessions · **48 check-ins, 96% closed**
Lead: Kennedy (MEDIUM, rushed). Ejiro, Maureen, Eric, Hafeezah new; Abubakar returning. Free.

**1. Journey blockers.** None new. Six people onboarded without a stall.

**2. AI flow.** The best evidence in the run that the chat adapts. **Ejiro (confused by
jargon) asked what "ground" means** and got: *"Good question, my apologies. 'Ground' is just
the term for the specific topic we're building a record for."* It apologises and drops the
term. **Eric (defensive, put off) demanded to know who reads this** and got a direct answer:
*"That's the right question to ask. I'll be direct. Your check-ins are private."* Neither
person was met with more jargon.

**3. Report thinness.** 8 of 8 distinct, averaging 423 characters. No restatement.

**4. Board thinness.** 8 of 8 distinct. The full thirteen-section board rendered.

**5. Admin friction.** "New project" is found without hesitation.

**6. Link friction.** None; five new people all reached their check-ins.

**Also — the confidence floor doing its job.** Eric was **withheld** at 0.31 confidence
("2 of 2 things named are specific enough to check") while Hafeezah was **shown** at 0.15
("nothing specific named yet"). That inversion looks wrong and is not: a card that only
reports absence describes the record, not the person, so it is safe. A partial read is not.
Deliberate, at [reads.ts:519](../../src/modules/board/reads.ts).

**Ratings — Admin 6/10.** Clean setup, still no board.
**Lead 8/10.** Six accounts, ownership divergence surfaced before the build started.
**Participants 8/10.** The two most resistant people were handled well.

**What shifted**
- **Sahar** (HIGH): can run a six-person ground without help.
- **Kennedy** (MEDIUM, rushed): holds five independent reads on scope he would never have got
  in a meeting.
- **Ejiro** (MEDIUM, confused): learned what the product means by "ground" — and had to ask.
- **Eric** (MEDIUM, defensive): got a straight answer on privacy and kept going. His read is
  withheld: he named things, not enough to be sure.
- **Maureen** (HIGH, chatty), **Abubakar** (MEDIUM, returning): both on record.
- **Hafeezah** (BASIC, distracted): eight check-ins and **nothing specific named yet** — the
  board says exactly that, without calling her a problem.

---

# Ground 3 — Adam, advisor terms

`NEW_ADVISOR / STARTING` · monthly · 90 days · 3 sessions · **6 check-ins, 83% closed**
Lead: Maureen (HIGH, returning). Adam (HIGH) new. Free.

**1. Journey blockers.** None.
**2. AI flow.** 5 of 6 natural. No leaks. One close needed a nudge.
**3. Report thinness.** 3 of 3 distinct, but the shortest in the run at **243 characters
average** — three monthly touches give the synthesis little to work with. Thin because the
ground is thin, not because it repeated itself.
**4. Board thinness.** 3 of 3 distinct, six sections.
**5. Admin friction.** **Corrected:** I wrote that no advisor card exists. It does —
"New advisor or board member" is in the signed-in picker. It is missing only from the
anonymous `/start` flow (F18). My harness created this ground by API, so no card was ever
picked by a person; I should not have reported a card-selection finding at all.
**6. Link friction.** None.

**Ratings — Admin 6/10. Lead 6/10.** Real but thin. **Participant 7/10.** "Available" was
turned into something written down.

**What shifted**
- **Sahar** (HIGH): learned monthly cadence yields a thinner record.
- **Maureen** (HIGH, chatty): has Adam's contribution in writing rather than implied.
- **Adam** (HIGH): said on the record what he will actually do, and on what terms.

---

# Ground 4 — Hafsah and Abubakar, partnership terms

`NEW_COFOUNDER / STARTING` · fortnightly · 90 days · 6 sessions · **12 check-ins, 83% closed**
All three returning. Free.

**1. Journey blockers.** None.
**2. AI flow.** 10 of 12 natural. Clean.
**3. Report thinness.** 6 of 6 distinct, 283 characters average — modest, adequate.
**4. Board thinness.** 6 of 6 distinct, full thirteen sections.
**5. Admin friction.** "A new way of working together" is the right card and reads clearly.
**6. Link friction.** None — and this is the returning-participant case: both had accounts,
neither was re-onboarded.

**Ratings — Admin 7/10. Lead 7/10. Participants 7/10.** Quiet and correct.

**What shifted**
- **Sahar** (HIGH): confirmed returning people skip first-time setup.
- **Hafsah / Abubakar** (HIGH / MEDIUM): each has the other's expectations in writing before
  they collide — which is the entire point of the scenario.

---

# Ground 5 — Rime steps into the delivery team

`NEW_MANAGER / STARTING` · weekly · 90 days · 13 sessions · **52 check-ins, 90% closed**
Lead: Rime (MEDIUM, confused by jargon) — new. Kennedy, Ejiro, Eric returning. Free.

**1. Journey blockers.** None, and this is notable: **the incoming manager was the one
confused by the vocabulary**, and still ran a 13-session ground.

**2. AI flow.** 47 of 52 natural. **Rime asked what "ground" means and was answered in her
own situation's terms**: *"'Ground' refers to the container for this specific situation — in
this case, the project…"* Ejiro asked separately and got a different, equally plain answer.

**3. Report thinness.** 13 of 13 distinct, 451 characters average — the record moved every
single week across a quarter. The strongest anti-staleness evidence in the run.

**4. Board thinness.** 13 of 13 distinct. All four people carried a shown read.

**5. Admin friction.** "A new way of working together" covers a manager stepping in, and the
card text says so explicitly.

**6. Link friction.** None.

**Ratings — Admin 7/10. Lead 8/10** — a jargon-confused new manager got full value.
**Participants 8/10.**

**What shifted**
- **Sahar** (HIGH): a 13-session ground runs without admin intervention.
- **Rime** (MEDIUM, confused): arrived not knowing the vocabulary; leaves with three
  independent reads on the team she inherited.
- **Kennedy, Ejiro, Eric**: each gave a private read of a new boss without doing it to her face.

---

# Ground 6 — Nate, contract renewal

`CONTRACT_RENEWAL / RESOLUTION` · weekly · 14 days · 2 sessions · **4 check-ins, 100% closed**
Lead: Eric (MEDIUM, defensive, returning). Nate (HIGH, rushed) new. Free.

**1. Journey blockers.** None.
**2. AI flow.** 4 of 4 natural — perfect. **Eric asked "who reads this?" in both sessions and
got a good answer twice.** But the engine does not remember it already explained: he had to
ask again. Within one ground, the explanation does not stick.
**3. Report thinness.** 2 of 2 distinct, 381 characters.
**4. Board.** By design, this scenario renders only objectives, check-in grid and divergence
— no contribution card. Correct: a two-week renewal is not a performance read.
**5. Admin friction.** **Corrected:** "Contract or renewal" does exist in the signed-in
picker. Missing only from `/start`. No card was picked by a person here — created by API.
**6. Link friction.** None.

**Ratings — Admin 6/10. Lead 7/10. Participant 7/10.**

**What shifted**
- **Eric** (MEDIUM, defensive): got an honest account of the term from the contractor.
- **Nate** (HIGH, rushed): said what a fair next term looks like, in two short sessions.

---

# Ground 7 — Kavon, the case for a raise

`RECOGNITION` · one-time · **2 check-ins, 100% closed**
Lead: Hafsah (HIGH). Kavon (**BASIC**, cooperative) new. Free.

**1. Journey blockers.** None.
**2. AI flow.** Both closed naturally. A **BASIC** user got through a single-session ground
unaided.
**3. Report thinness.** One report, and the **longest in the run at 508 characters** — a
single well-run session produced the densest synthesis. Density is not a function of session
count.
**4. Board.** No contribution card by design. Right call: one session is not a basis for
positioning someone.
**5. Admin friction.** **Corrected:** "Raise, promotion, or recognition" exists in the
signed-in picker. Missing only from `/start`. Not observed by a person — created by API.
**6. Link friction.** None.

**Ratings — Admin 6/10. Lead 8/10** — she reads the same evidence the asker built.
**Participant 8/10** — a BASIC user built a real case for himself.

**What shifted**
- **Hafsah** (HIGH): starts the raise conversation from Kavon's evidence, not her impression.
- **Kavon** (BASIC): has his own case written down — the biggest single-session gain for the
  least confident person in the org.

---

# Ground 8 — Hafeezah, improvement plan

`PIP / STARTING` · weekly · 60 days · 8 sessions · **16 check-ins, 81% closed**
Lead: Kennedy (MEDIUM, rushed). Hafeezah (**BASIC**, distracted, confused) — the person on
the plan. Free.

The most sensitive ground in the run, and the one I watched hardest.

**1. Journey blockers.** None. **81% natural close — the lowest in the run**, which is the
right direction: the engine pushed back more on the vaguest participant rather than letting
her out early.

**2. AI flow.** No leaks. **No verdict language, no comparison to colleagues, no mention of
dismissal anywhere in 16 check-ins.** Hafeezah asked what "ground" means in sessions 1 and 2
and was answered plainly both times — again without memory that it had already explained.

**3. Report thinness.** 8 of 8 distinct, 438 characters average. It moved every week on the
hardest possible material.

**4. Board.** **No contribution card — the PIP board is a plain grid.** This is the design
decision you made, and it holds: nobody on a plan gets a positioned read.
**One leadership gap** was surfaced.

**5. Admin friction.** "Someone's work is off track" is findable and honest.

**6. Link friction.** None.

**Ratings — Admin 7/10. Lead 8/10** — a fair record on a plan.
**Participant 7/10** — the most vulnerable person met no scary content and no scoring.

**What shifted**
- **Kennedy** (MEDIUM, rushed): a defensible record of concern, support and progress.
- **Hafeezah** (BASIC, distracted): eight weeks of her own account, in her words, never
  ranked against anyone. She still names little that is specific — and the product says so
  factually rather than calling it failure.

---

# Ground 9 — Q3 goals across the team

`OKR_ALIGNMENT / STARTING` · weekly · 90 days · 11 sessions · **77 check-ins, 96% closed** —
the largest ground in the run. Lead: Hafsah. All seven returning. Free.

**1. Journey blockers.** None. Seven people, eleven sessions, no stall.
**2. AI flow.** 74 of 77 natural at the largest scale tested. Ejiro and Eric each asked their
usual question and were answered well.
**3. Report thinness.** 11 of 11 distinct, **529 characters average — the densest in the
run**. More people produced a richer synthesis, not a vaguer one.
**4. Board thinness.** 11 of 11 distinct, all seven shown, four dependencies tracked, one
leadership gap.
**5. Admin friction.** "Setting shared goals" is unmistakable.
**6. Link friction.** None — all seven returning, none re-onboarded.

**Ratings — Admin 8/10. Lead 9/10** — the highest-value ground in the run.
**Participants 8/10.**

**What shifted**
- **Sahar** (HIGH): knows the product scales to seven people without degrading.
- **Hafsah** (HIGH): seven independent reads on Q3 and the overlaps between them, before the
  cycle locked.
- **The six participants**: each said privately whether they were actually on the same plan.

---

# Ground 10 — Q3 workplan and budget

`WORKPLAN_BUDGET / STARTING` · fortnightly · 90 days · 6 sessions · **24 check-ins, 88% closed**
Lead: Eric (MEDIUM, defensive). Maureen, Ejiro, Kavon returning. Last free ground.

**1. Journey blockers.** None.
**2. AI flow.** 21 of 24 natural. Eric and Ejiro both asked their questions, both answered.
**3. Report thinness.** 6 of 6 distinct, 381 characters.
**4. Board thinness.** 6 of 6 distinct. **The only ground where the finance role map is
genuinely earned** — three people mapped to Finance on a budget ground. Kavon shown at 0.15
with "nothing specific named yet".
**5. Admin friction.** **Corrected:** "Workplan & budget" exists in the signed-in picker.
Missing only from `/start`. Not observed by a person — created by API.
**6. Link friction.** None.

**Ratings — Admin 7/10. Lead 7/10. Participants 7/10.**

**What shifted**
- **Eric** (MEDIUM, defensive): four plans and budgets, each built by its owner.
- **Kavon** (BASIC): visible on the board with an honest "nothing specific yet" rather than a
  bad score.
- **Maureen, Ejiro**: their own numbers on record.

---

# Grounds 11–18 — blocked at the paywall

**All eight were refused at creation. None ran.**

> `400 /grounds/for-lead — "Your free plan includes 10 Grounds. Subscribe to create more."`

**This is the gate working exactly as specified.** Ten free, the eleventh stopped, and it
stopped at ground creation rather than after people had been invited.

| G | Ground | Would have tested |
|---|---|---|
| 11 | Weekly pulse — delivery | 16-session recurring, 7 people |
| 12 | Delivery slipped | single check-in, off-track |
| 13 | Strategy before the offsite | leadership, 2 sessions |
| 14 | Field officers cohort | 8 people, same role, 10 sessions |
| 15 | Clinic managers — probation | cohort onboarding, 12 sessions |
| 16 | Client pulled out overnight | 9 people, shock, single read |
| 17 | Team pulling two ways | 2 sessions, 3 days apart |
| 18 | Described in her own words | free-text routing to a cohort ground |

**Why they could not proceed.** Your instruction was to mock-pay like a real user and not
fake it. I could do neither. `STRIPE_SECRET_KEY` in this environment is a truncated
placeholder (`sk_t…`), so clicking **Subscribe** returns *"Could not start checkout. Try
again — Server error."* Writing a subscription row straight into the database is precisely
the faking you ruled out, so I stopped.

**Two findings survive anyway:**

- **The limit is invisible until the work is done.** `/grounds/new` renders the entire
  scenario picker with no hint Sahar is at her cap. She chooses a card, fills in the setup,
  and only then is refused. The block is right; the timing is not.
- **Checkout is unreachable in this environment**, so the paid experience — including the two
  grounds you most wanted (15, the clinic cohort, and 18, describe-your-own) — is untested.

**Ratings — Admin 3/10** for the paid path: correctly stopped, told too late, and cannot pay.
**Lead / Participants — n/a**, they never received a link.

---

# Cross-ground findings from the browser pass

These came from driving the real app in Playwright. They are not tied to one ground — they
showed up on every ground, which is why they sit here rather than in a section above.

## A. No ground ever ends

**All ten grounds finished every session and all ten are still `ACTIVE`.** In the database:
`resolution_state` empty, `end_state` empty, `resolved_at` null, `closed_at` null — ten out
of ten. On screen every card still reads **STARTING** with a green dot, including a 13-of-13
new-hire ground and a 14-of-14 manager ground.

Your spec named resolution — *how a ground ends and reaches its outcome* — as a surface to
test. I have to report that in 265 check-ins across ten grounds it never happened once. The
work all lands; nothing ever closes.

**This has a second cost the product feels immediately.** Sahar's profile reads *"No completed
grounds yet — Each closed ground adds a verified entry to your profile."* The verified record
is the promise the profile page is built around, and because nothing resolves, no one in the
org will ever get one. Same for the dashboard tile: **"Reports ready: 0"** is technically
correct and permanently zero, because it counts `REPORT_READY` grounds and nothing leaves
`ACTIVE`.

## B. "My situation is different" is styled like a dead control

On the picker, every real card is white with a solid border. The describe-your-own card is
grey with a dashed border and grey text — the visual language of a disabled button. **It works
when you click it** (the cards clear and a free-text box appears), but nothing tells you that.
This is the entry point for Ground 18's whole scenario, and it looks switched off.

## C. "Unknown participant" on the Check-ins tab

The ground's Check-ins tab lists every session as **"Session 3 — Unknown participant —
Completed"**. It is not missing data: every check-in row has a resolvable user. The admin's
main view of who actually checked in cannot name a single person.

## D. Confidence is dressed up as progress

The sidebar shows **"100% · 13/13 sessions"**. The 100% is alignment confidence (5 of 5); the
fraction is sessions. Two unrelated numbers joined by a `·`, and it reads as "100% complete,
13 of 13". On the raise ground it renders **"40% · 1/1 sessions"** — complete, and 40%.

## E. Stale time and empty ranges

The ground header says **"90 days remaining"** on a ground whose thirteen sessions are all
finished. The board header renders an unfilled date range literally: **"— to — · session 13"**.

## F. The "Admin" menu item goes nowhere

Sahar's user menu offers **Admin**. Both `/admin` and `/admin/dashboard` redirect her to
`/grounds`. It is correct that an org admin is not a platform admin — but she is being shown
a door that closes in her face. The same shape as the board lockout.

## G. Small text defect

`/org/roster` renders **"Led by Hafsah(set up by an admin)"** — missing space. The "· 1 member"
beside it excludes the lead, which is defensible but reads as undercounting a two-person ground.

## H. What worked, and I had not said so

- **Documents tab** is clean: upload area naming PDF/DOCX/JPEG/PNG/CSV/XLSX, an empty state,
  and a 0/500 context-notes field.
- **Reporting an issue works.** The Feedback button opens a modal with three tabs — *Reaction*,
  *Build request*, *Something went wrong* — with quick chips and an optional email for a reply.
- **The 404 page** is a real page with a route back: *"There is nothing at this address… Start
  a Ground."*

---

# Roll-up

## Average scores, grounds 1–10

| | Average | Range |
|---|---|---|
| **Admin (Sahar)** | **6.4 / 10** | 4–8 |
| **Lead** | **7.6 / 10** | 6–9 |
| **Participants** | **7.4 / 10** | 7–8 |

Leads get the most; participants get a consistent, safe experience; **the admin is the worst-served
person in the product** — she sets everything up and is locked out of the board.

## Most common blocker

**Corrected.** I first wrote that four grounds had no matching card and called this the most
common blocker. That is wrong: the signed-in picker at `/grounds/new` carries **all 18
scenario cards**, including every one I said was missing.

The real defect is that **there are two pickers and they disagree** — `/grounds/new` has 18
cards, the anonymous `/start` entry flow has 8. Ten scenarios, including both cohort cards,
are unreachable to a first-time visitor. See F18.

**So the most common blocker across the ten grounds that ran was the admin being shut out of
her own work** — locked out of the board (F4), and unable to bring any ground to an end
because nothing calls the resolution flow (F1).

## Highest-priority fix

**Make a ground able to end.** Ten grounds, every session complete, and not one reached an
outcome — all still `ACTIVE`, all still labelled STARTING. Everything downstream of an ending
is therefore dead too: no verified profile record for anyone, "Reports ready" permanently
zero. Alignment gets captured and then nothing closes on it. This outranks the board lockout
because the board lockout costs one person a page, and this costs the product its ending.

Ranked after that:

2. **Let the admin see the board of a ground she created.** The guard at
   [board.service.ts:85](../../src/modules/board/board.service.ts) admits `initiatorId` and
   participants but never checks `createdByUserId`. Sahar is refused from a link her own admin
   page renders — one clause.
3. **Name the people on the Check-ins tab** instead of "Unknown participant".
4. **Warn about the ground limit before the setup work**, not after it.
5. **Add cards** for advisor, renewal, recognition and workplan.
6. **Stop styling "My situation is different" as disabled** — it is the entry point for
   describe-your-own.
7. **Split the confidence and session numbers** so "100% · 13/13" stops reading as progress.
8. **Remember within a ground** that "ground" has already been explained to this person.
9. Hide the **Admin** menu item from users who will only be redirected away.
10. Fix **"90 days remaining"** on a finished ground, the **"— to —"** date range, and the
    missing space in **"Hafsah(set up by an admin)"**.

## Coverage audit — every surface the spec named

Marked against what I actually drove, not what I intended to.

| Surface | Covered | What I found / why not |
|---|---|---|
| Signing up | **Partly** | Ran it for real at last. See I–L below. |
| Signing in | Yes | Password form works; Sahar signed in on every pass. |
| Following a check-in link | Yes | `/join?t=…` works; good invite page. |
| Scenario cards, picking one | Yes | Card set captured; four grounds had no matching card. |
| Onboarding flow clarity | Partly | Read the picker and the 3-step header; did not complete a full anonymous run. |
| **Onboarding → check-in transition** | **No** | Never drove step 2→3 of `/start`. |
| **Adding a lead** | **No** | Done by API in the harness, never through the UI. |
| **Adding a participant** | **No** | Same — API only. |
| Document uploads | Partly | Documents tab seen; the in-chat evidence request never exercised. |
| Profile page | Yes | See M. |
| Documents page | Yes | Clean. |
| Sessions page | Yes | It is the ground's Check-ins tab — "Unknown participant" (C). |
| Grounds page | Yes | See D. |
| Org pages | Yes | Members and roster both load; G. |
| Admin pages | Partly | Org admin fine; platform back-office needs an account I do not have. |
| Resolution | Yes | Never happens — finding A. |
| Reporting an issue | Yes | Works (H). |
| Back-office payments/usage/feedback | **No** | Platform-admin only. |
| Emails and notifications | **No** | No SMTP in this environment. |
| Payment screens | **No** | Stripe key is a placeholder. |
| Per-page screenshots on all 18 | **No** | One thorough walk, not eighteen. |

## I. Signing up is magic-link only, and the link cannot arrive here

`/auth` offers a password sign-in and *"New here? Get a sign-in link instead"*. That second
path is the **only** way to create an account — there is no password sign-up anywhere. It
sends an email. With no SMTP configured, **the account can be created but never entered**.

This is why Sahar came from a seed script in the first place. I should have said so at the
start instead of letting "genuinely use the sign-up flow" quietly go untested.

## J. The account and the organisation are created before the email is verified

Submitting `brand.new.person@example.test` immediately produced a `users` row with
`role = ADMIN` and `is_email_verified = false`, plus a whole new organisation. Typing a
stranger's address into that box mints an org in their name before they have clicked anything.

## K. The organisation is auto-named from the email, never asked

`brand.new.person@example.test` became **"Brand's workspace"** — the first dot-segment of the
local part, title-cased. It is a reasonable default, but the admin is never asked what her
organisation is called during setup.

## L. Org setup was therefore never exercised

Because Sahar was seeded, the real first-time org setup — the `/start` flow's *"Save &
invite"* step, where an anonymous session turns into an account and an org — was never driven.
Ground 1's brief asked for exactly this and I did not deliver it.

## M. The profile explains a badge that is not on the page

Sahar's profile shows *"What does Two-party confirmed mean?"* with a full definition, while
carrying no such badge — and it cannot, because nothing resolves (A). Below it sits a
**"Get started at myground.work"** marketing call-to-action, shown to someone already signed
in and inside the product.

## N. Counters that do not agree with each other

On one screen: the sidebar says **"100% · 13/13 sessions"**, the ground card says **"5/5
Aligned"**, and the dashboard says **"260 Participant sessions today"** — because every
check-in in the run landed on the same day. Three different framings of the same ground, none
labelled clearly enough to reconcile.

## Surfaces I did not test, stated plainly

- **Email and notifications** — no SMTP in this environment; nothing was delivered or clicked.
- **Payment screens** — unreachable (Ground 11).
- **Document upload during a check-in**, when the chat asks for evidence. I saw the Documents
  tab, not the in-chat evidence request.
- **The Groundwork back-office** review of payments, usage and feedback — needs a platform-admin
  account, which Sahar is not.
- **Per-page screenshots on all eighteen grounds.** The browser pass was one thorough walk of
  the surfaces, not eighteen repeats.

## What held up

- **0 leaks and 0 forbidden content in 265 check-ins.** No verdicts on people, no peer
  comparisons, no dismissal language reaching a participant, no infrastructure or internal
  errors surfacing in chat.
- **Reports and boards stayed alive**, session on session: 68 of 69 report states distinct,
  59 of 59 board states distinct. Almost no restatement anywhere.
- **The confidence floor withheld reads it could not support** and said plainly when a record
  held nothing specific — the single most important behaviour in the product, and it held on
  the PIP ground where it matters most.
- **The chat adapted to the people who resisted it**: the jargon-confused were given plain
  language and an apology, the privacy-suspicious got a direct answer, the terse were probed
  rather than accepted.

## Corrections to my own findings

Three things I initially recorded were my test rig, not the product, and are excluded above:

1. **"Everyone maps to Finance"** — my fixture makes people say *"waiting on the budget
   line"*. The detector was right.
2. **A person blocked on themselves** on the board — my fixture makes the lead say she is
   waiting on the lead. The read-side guard drops self-blocks correctly; only my input was
   absurd. (The board's handoff panel not applying the same guard is still worth a look.)
3. **"`/register` is blank"** and **"the join link is invalid"** — my selector missed a
   rendered 404, and I used `?token=` where the app uses `?t=`. Both surfaces are fine.

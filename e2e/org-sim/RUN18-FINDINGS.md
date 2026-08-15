# 18-ground org simulation: running findings

Environment: local. Mail catcher on :1025 (HTTP :1080). BILLING_ENABLED flipped false -> true so the
paywall can fire. Vertex/Gemini live. Platform admin bootstrap = staff@groundwork.test.

## Ground 1 (free) - new hire, 90 days, weekly, 12 sessions
People: sahar NEW (signs up), hafsah NEW (lead), abubakar NEW (participant)

### G1-01  BLOCKER (integrity/journey): promised password step never happens, account left with no password
Surfaces: signup confirmation page, activation email, /verify-email
- "Check your email" page, step 2 of 3: "You will be asked to set a password to secure your account."
- Activation email repeats the same three-step promise.
- ACTUAL: the link signs her straight into /grounds. No password prompt at any point.
- DB confirms `passwordHash: NULL`.
Why it matters: from Ground 2 on Sahar is a RETURNING admin. She has no password, so every future
sign-in needs another magic link. The product told her twice she would have one. This is the
returning-admin path broken at the root, and it is a promise the copy makes and the product does not keep.

### G1-02  GOOD, and it reverses a finding on record
The previous run recorded: an ADMIN user + org are created BEFORE the email is verified, and the org
is auto-named from the email domain, so a stranger's address could claim their company slug.
Re-tested properly this time:
- Before clicking the link: `user` row does NOT exist. Nothing provisioned.
- Email says "No account will be created without clicking the link." TRUE.
- Org named "Meridian Health" because she TYPED it. Slug `meridian-health`. Not derived from gmail.com.
- Role ADMIN + matching OrganizationMembership created at verification, not before.
This is fixed. Do not carry the old finding forward.

### G1-03  Two primary CTAs on the marketing page, two different doors, no way to tell which is yours
Surface: marketing home
- Header: "Get started free" -> /auth?mode=signup
- Hero: "Start your first Ground" -> /start (the no-account try-it funnel)
Both are primary-styled. A first-time admin who wants to set her org up properly has no way to know
the hero button skips account creation. Sahar guessed the header one.

### G1-04  "Ground" is the product's core noun and the marketing page never defines it
Surface: marketing home
The biggest button says "Start your first Ground". Step 1 says "Create a Ground by setting the
context, objectives and expectations." Nothing says what a Ground IS. A BASIC or MEDIUM reader meets
an unexplained proper noun in the primary CTA. Judged against the weakest reader, this is the single
biggest comprehension risk on the page.

### G1-05  En dash in the product UI (house style is none)
`client/src/pages/admin/AdminPage.tsx:373` uses `'–'` as the empty-value placeholder for the "Felt
fair" stat. User-visible on the admin page.
Marketing pages: 0 em/en dashes across all five (home, how-it-works, use-cases, pricing, about). Clean.
Activation email: 0.

### G1-06  Local "Back" link leaves the local environment
Surface: /auth header, "Back"
Points at https://myground.work because VITE_MARKETING_URL is unset locally and MARKETING_URL
defaults to production. Correct in production, but in local testing it throws you out of the
environment. Env-only, low severity, noted for completeness.

---
## ENVIRONMENT RESET (important context for every finding below)

The first Ground 1 attempt ran on a polluted database: 3 orgs, 7 users, 2 grounds, 8 check-ins and a
report left by earlier runs. `hafsah@meridian.test` and `abubakar@meridian.test` ALREADY EXISTED, so
Sahar's "invite" only re-activated an existing account, and Hafsah appeared to land in a phantom org
called "Sahar's workspace". That was prior-run state, NOT caused by the invite. I withdraw it as a
finding rather than report it as one.

Reset to a clean database (local only, confirmed), reseeded the prompt library, cleared the mail
catcher, and re-ran Ground 1 from a genuinely blank platform. This mattered: the ground-11 paywall
counts grounds per org, so on the dirty DB the free/paid gate would have been meaningless.

Clean-start state verified: 1 user (Sahar, ADMIN, verified, NO password), org "Meridian Health"
slug `meridian-health`, 0 grounds.

## Ground 1 findings (on the clean run)

### G1-01  CONFIRMED ON CLEAN DB - promised password step never happens
Reproduced exactly on a blank platform. Email + wait page both promise "You will be asked to set a
password to secure your account". The link signs her straight into /grounds. `password_hash` is NULL.
Consequence: Sahar is a RETURNING admin from Ground 2 onward and has no password, so every future
sign-in needs a fresh magic link from her inbox.

### G1-02  GOOD - nothing is provisioned before verification (reverses the old GW-001 finding)
Verified on the clean run: before the link is clicked there is NO user row. Email says "No account
will be created without clicking the link" and that is true. Org is named "Meridian Health" because
she TYPED it; slug `meridian-health`; not derived from the email domain. ADMIN role and membership are
created at verification, not before. The previously recorded integrity issue is fixed.

### G1-07  "Your name" is one field and the whole thing becomes the first name
Typed "Sahar Okonkwo" -> `first_name = "Sahar Okonkwo"`, `last_name = ""`. Greetings will read
"Hi Sahar Okonkwo". Cosmetic but it will show in every email.

### G1-08  Silent 400 on the first-ever signup happy path
`POST /api/v1/entry/commit -> 400 Bad Request`, fired immediately after `verify-email` succeeded.
Sahar never used the entry chat in this run, but an earlier /start visit in the same browser left a
`gw_commit_payload` in localStorage, and the app tried to attach that stale draft to a brand-new
account. Invisible to the user, no error shown. Either way it is wrong: a leftover draft from an
unrelated session should be discarded, not POSTed and failed.

### G1-09  The scenario picker hides a second required choice below the fold
Surface: /grounds/new
Sahar picks "New hire" (found unaided, first card, correct - see G1-10). Continue stays disabled and
the microcopy under it changes from "Pick a situation to continue" to "Pick where you are in it
(below the cards) to continue". The second required control is off-screen, and its existence is only
announced AFTER the first choice is made. She clicked Continue, nothing happened, and had to hunt.

### G1-10  GOOD - the in-app scenario cards are much stronger than the marketing page
Grouped by family (Starting / Renewal / Recognition / Accountability), each card carrying two or three
concrete "e.g." lines. "Someone starts Monday and you want to be sure you both mean the same thing by
doing well." A MEDIUM reader finds the right card in seconds. This is the copy the marketing page
should be borrowing from: no undefined jargon, situation-first.

### G1-11  No first-time onboarding flow exists at all
After verification Sahar lands on a dashboard with three zero counters (ACTIVE GROUNDS 0,
PARTICIPANT SESSIONS TODAY 0, REPORTS READY 0) and two buttons. No welcome, no explanation of what a
ground is, no tour, no confirmation that "Meridian Health" was created. For a MEDIUM or BASIC admin
this is a cold start, and the three zeros are thingness: on a new org they can only ever say 0.
"PARTICIPANT SESSIONS TODAY" is also a metric a first-timer has no frame for.

### G1-12  Duplicate primary action on the empty grounds page
"Open a new ground +" (top) and "Open your first ground" (empty state) do the same thing, both
primary-styled, one screen.

### G1-13  The org name is never reflected back anywhere
She typed "Meridian Health". The header says "Your grounds"; there is no org name on the page. Her one
piece of setup input is invisible after the fact.

### G1-14  CORRECTION to G1-13: the org name IS shown
Once properly signed in, the sidebar shows "MERIDIAN HEALTH" above People / Billing / Settings, with
"Sahar Okonkwo / admin / Sign out" at the foot. My earlier note was taken from a state where the rail
was not rendered. Withdrawn.

### G1-15  BLOCKER (integrity): the summary promises a resolution the database does not store
Surface: final step of /grounds/new, then the `grounds` row
The wizard's own summary panel read: "New hire · At the start / 12 sessions · weekly /
**Resolution: Keep the hire** / 2 participants invited". After creation, `grounds.end_state` is EMPTY.
So the confirmation screen states a decision the ground does not actually carry. This is exactly the
"every badge the UI explains must be producible" check: the UI showed a resolution that was dropped.

### G1-16  The scenario/end-state step asks a firing question at a welcome
Surface: /grounds/new, "What does a successful outcome look like?"
On a NEW HIRE ground - somebody starting Monday, on a card that promises "get you and a new hire on
the same page about the role and what early success looks like" - Sahar must pick from:
  Keep the hire / Restructure the role / Let them go / Extend evaluation period /
  Not yet - revisit with a named gap
The step's own copy says "Everyone sees it before the first session." So on his first day Abubakar
could see that his manager pre-selected an outcome from a menu that included "Let them go".
Judged against the weakest reader this is the single most off-putting screen in the flow: it turns an
onboarding tool into an evaluation file before any work has happened. A BASIC or cautious admin would
hesitate here, and a new hire who saw it would read it as surveillance.
(The list is right for the PIP and contract-renewal scenarios. It should not be the same list for a
new starter.)

### G1-17  The ground got a machine label, and it is in the invite subject line
`grounds.label` = "NEW HIRE ground". Sahar was offered "Ground name (optional)" and the fallback is a
shouty scenario-derived string. It then travels into the emails: the invite subject reads
"Sahar Okonkwo invited you to check in on: NEW HIRE ground".
(Caveat, stated honestly: I typed the name into the first visible text input on that step, so I cannot
fully rule out that I filled the wrong box. Either way the fallback label is wrong for an email
subject a new hire reads on day one.)

### G1-18  GOOD - the check-in invite email is well made, unlike the colleague invite
"Sahar Okonkwo invited you to check in on: ..." names the inviter, which the earlier
"Invite a colleague" email did not do at all. Both invitees received one. Same product, two very
different standards of invite email.

### G1-19  Numbers reconcile on the summary, which is worth saying
90 days + weekly rendered as "12 sessions · weekly", and 2 invitees as "2 participants invited". No
conflicting counts on that screen.

### G1-20  Sahar is a participant on her own ground and has a check-in to do
`ground_participants` has three rows: Sahar as INITIATOR, Hafsah and Abubakar as PARTICIPANT. Three
session-1 check-ins were created, one of them Sahar's. But Sahar's mental model is that HAFSAH leads
this and she is the ops admin who set it up - and the wizard did ask her "What are you responsible for
here? (optional)", which she left as ops admin. Nothing on the flow told her she would now be expected
to give her own account every week for twelve weeks. `managing_only` is false for her.
This is the "adding a lead" model mismatch in concrete form: she wanted to hand the ground to Hafsah,
and the product made her a full party to it.

### G1-21  Silent gate on the last step
"Open the ground" stays disabled while the brief is empty (counter reads "0 words") and nothing says
the brief is required. A first-time admin can sit on a complete-looking summary and not know why the
button will not go.

### G1-22  The wizard steps have no headings in the accessibility tree
Every step returned an empty `h1/h2/h3`. Titles are styled divs. A screen-reader user gets no step
structure at all across a six-step flow.

---
# Grounds 2 to 6

Run strictly sequentially, Sahar signing in each time as a returning admin. Four created, one blocked.

| Ground | Card | Pacing | Created | Ground id |
| --- | --- | --- | --- | --- |
| 2 | New project | 60d weekly, 5 parties | YES | `39d89195` |
| 3 | New advisor or board member | 90d monthly, 1 party | YES | `f7bd3392` |
| 4 | A new partner or co-founder | 90d fortnightly, 1 party | YES | `46e58eec` |
| 5 | A new manager taking over | 90d weekly, 3 parties | **NO - blocked** | - |
| 6 | Contract or renewal | 14d weekly, 1 party | YES | `51f92717` |

### G2-01  BLOCKER: an end-state option is called "Continue", the same word as the wizard's own button
Surfaces: /grounds/new end-state step, NEW_PROJECT and NEW_MANAGER scenarios
`api/src/modules/resolution/end-states.ts` gives NEW_PROJECT the options
"Mark complete / **Continue** / Descope / Stop the project", and NEW_MANAGER
"**Continue** / Restructure / ...". The wizard's navigation button on that same screen is also
"Continue".

So the screen shows the word twice, meaning two different things: pick an outcome, and go to the next
step. A user who means "the project continues" and clicks the nav button has silently skipped the
question; a user who means "next" and clicks the option has set an outcome they did not intend.

**This is what blocked Ground 5.** With the option and the button sharing a name, the ground could not
be completed at all: every attempt selected "Continue" as the end state and never advanced. Ground 5
(new manager taking over, 3 returning participants) does not exist.

### G2-02  CONFIRMED ACROSS ALL FIVE: end_state is never persisted
Every ground shows `(EMPTY)` in `grounds.end_state`, including the four created successfully, and
including Ground 6 where the summary said "Renew on current terms". G1-15 is not a one-off: the
wizard collects an end state, displays it back in the summary, and drops it on save. The whole
end-state step currently writes nothing.

That also means the copy on that step - "the ground closes only when all parties confirm the same end
state" - describes a mechanism with no stored value behind it.

### G2-03  Every ground gets a shouty machine label, and it is the email subject line
`NEW HIRE ground`, `NEW PROJECT ground`, `NEW ADVISOR ground`, `NEW COFOUNDER ground`,
`CONTRACT RENEWAL ground`. The "Ground name (optional)" field did not take on any of the five, so the
fallback is what participants see: "Sahar Okonkwo invited you to check in on: NEW COFOUNDER ground".
Abubakar received exactly that, twice, for two different grounds.
(Earlier I hedged that I might have filled the wrong box. Five for five says otherwise: either the
field is not wired, or it is not the first text input and no ground ever gets a human name.)

### G2-04  GOOD: the free-tier counter is correct and increments per ground
`can-create-ground` returned `{allowed:true, freeReason:"FREE_TIER", groundsUsed:N}` with N going
1, 2, 3, 4, 4. It did not increment for the failed Ground 5, which is right. The gate is counting
properly, so the ground-11 paywall has a sound basis - assuming Stripe is ever wired.

### G2-05  GOOD: returning-admin sign-in is clean
Sahar signed in with a password five times and was never re-onboarded, never shown first-time
content. The returning-admin path works, once she has a password at all (G1-01).

### G2-06  Returning participants are recognised by address, and get stacked invites
Abubakar now has three check-in invites across three grounds, Maureen two, Eric two, Hafsah two. Same
address, same person, no duplicate accounts. But each invite is a separate "you have been invited"
email with no sense that this is the third ground the same person has been added to, and no recap.
Worth watching when the sessions run: does the product recognise him as returning, or is each ground
a fresh set of link-recipients with no memory.

---
# Ground 5 retry, and grounds 7 to 10

All five created. Ten grounds now exist, so the paywall has its proper chance to fire at ground 11.

| Ground | Card | Pacing | Ground id |
| --- | --- | --- | --- |
| 5 (retry) | A new manager taking over | 90d weekly, 3 parties | `82a658dc` |
| 7 | Raise, promotion, or recognition | 7d weekly, 1 party | `63eb3a5e` |
| 8 | Performance improvement plan | 60d weekly, 1 party | `56df89fb` |
| 9 | Goals & planning | 90d weekly, 6 parties | `7ea6734a` |
| 10 | Workplan & budget | 90d fortnightly, 3 parties | `c5dcc4a0` |

### CORRECTION to G2-01: Ground 5 was blocked by MY error, not the product
I reported that a "Continue" end-state option blocked Ground 5. That was wrong and I withdraw the
causal claim. `NEW_MANAGER`'s options are "Extend the engagement / Restructure the scope or terms /
End the engagement / Not yet". There is no "Continue" among them. I had guessed that label, and my
text match then hit the wizard's Continue BUTTON, so the flow never advanced. Retried with the real
label, the ground was created first time.

**What survives, and is still real:** `NEW_PROJECT` genuinely does have an end-state option labelled
"Continue" ("Mark complete / Continue / Descope / Stop the project") on the same screen as a
"Continue" navigation button. That collision is a live mis-click hazard for a user, who sees one word
meaning two things. It just is not what stopped Ground 5.

### G7-01  CONFIRMED ACROSS TEN GROUNDS: end_state is never persisted
Ten for ten, `end_state` is EMPTY - including the five where I explicitly selected a scenario-correct
option and the wizard's summary echoed it back ("Grant the ask", "Performance concern resolved",
"OKRs aligned to company direction", "Workplan and budget approved"). The end-state step collects an
answer, confirms it on screen, and writes nothing. This is now the single most reproducible bug in
the run.

### G7-02  BLOCKER: "I am setting it up for others" does not keep the admin out
On grounds 5, 7, 8, 9 and 10 I explicitly chose **"I am setting it up for others"** on the people
step. Sahar is still `INITIATOR` with `managing_only = false` on all ten grounds, exactly as on the
five where I never touched the control.

So the option that exists precisely to say "this is not my ground, I am setting it up for a lead"
has no effect on the record. The admin is made a full party either way, which on ground 9 means she
now owes twelve weekly check-ins on a planning cycle she was only administering. `managing_only` is
the field designed to carry this and nothing sets it.

This is G1-20 escalated: it is not that the product lacks the concept, it is that the control is
there, the user can choose it, and it is ignored.

### G7-03  Contractor language on an internal manager transition
`NEW_MANAGER` end states read "Extend the engagement / Restructure the scope or terms / End the
engagement". For a manager stepping into an existing team - an internal move - the vocabulary is a
contractor's. A team reading "End the engagement" about their new manager will not read it as neutral.

### G7-04  Every ground label is still machine-generated
`RECOGNITION ground`, `PIP ground`, `OKR ALIGNMENT ground`, `WORKPLAN BUDGET ground`. Ten for ten.
"PIP ground" is the one to look at hardest: that is the subject line landing in Hafeezah's inbox for
a performance improvement plan.

### G7-05  GOOD: the free-tier counter tracked all ten correctly
`groundsUsed` went 5, 6, 7, 8, 9 across this batch and `allowed` stayed true with
`freeReason: FREE_TIER` throughout. Ten grounds now exist. Ground 11 is the real test of the gate.

---
# Ground 11: the paywall

### G11-01  GOOD, AND THE BEST-BEHAVED SCREEN IN THE RUN: the gate fires exactly at ground 11
`can-create-ground` returned `{allowed:false, groundsUsed:10, reason:"Your free plan includes 10
Grounds. Subscribe to create unlimited Grounds."}` - correct to the ground.

The screen is genuinely well made. An amber banner above the picker:

> **You have used all 10 of your free grounds**
> Your free plan includes 10 Grounds. Subscribe to create unlimited Grounds. You can still look
> around here, but this one cannot be created until then.  [See plans]

Three things it gets right: it states the number rather than being vague, it does not hide the
product behind the wall ("you can still look around here"), and the cards below stay fully browsable.
Nothing is nagging or pressuring. Judged against a cautious reader, this is the screen I would hold
the rest of the flow to.

### G11-02  BLOCKER: paying is impossible, and the error is a bare "Server error"
"See plans" goes to `/billing`, which lists the tiers correctly. Clicking Subscribe:

- `POST /api/v1/billing/subscription` -> **HTTP 500**
- the page shows: **"Could not start checkout. Try again."** and **"Server error. Something went
  wrong. Please try again later."**

Cause is known and environmental: `STRIPE_SECRET_KEY=sk_test_...` is a literal placeholder. But the
customer-facing behaviour is the finding. A paying customer who has just been told to subscribe is
sent to a dead end with a generic 500 and an instruction to try again, which will never work. Nothing
says the problem is on our side, nothing offers a way to reach anybody, and "Try again" invites them
to repeat a failing action.

Even once Stripe is real, a payment provider outage produces exactly this screen. It needs an honest
failure state: say it is our end, do not tell them to retry, give them a contact.

### G11-03  Grounds 12, 13 and 14 could not be created either
All are past the free tier, so the same gate blocks them. Not a separate bug - the same one, and
correct behaviour. They were run on the workaround org instead (below).

### G11-04  The duration picker cannot express the periods the brief asks for
Options are 7 / 14 / 30 / 60 / 90 / 180 / 365 days only. Ground 11 wants sixteen weekly check-ins
(112 days) and ground 14 wants ten (70 days). Neither is expressible; the nearest choices give 26 and
12 sessions. An admin who wants "sixteen weeks" has to pick 180 days and accept 26 sessions, or 90 and
accept 12. There is no free-text duration and no session-count input.

## The workaround org

Per the brief: a NEW admin with a NEW org, so grounds 11 to 14's scenarios still get tested as that
org's first (free) grounds.

- **Dara Adeyemi**, `dara@northfield.test` / `SimPass123!`, org **Northfield Clinics**
- Signed up, activated and password-set entirely through the UI - and note the password had to be set
  via the reset flow again, because signup still sets none (G1-01 reproduced on a second account).

**Everything from here labelled ORG 2 is on Northfield Clinics, not Meridian Health.** The scenario
logic is genuinely tested; the free/paid gate is not, because these are ground 1 to 4 for that org.

# Grounds 11 to 14, ORG 2 (Northfield Clinics)

All four created. Scenarios genuinely exercised; the free/paid gate is NOT tested here, because for
this org these are grounds 1 to 4.

| Ground | Card | Pacing | Ground id |
| --- | --- | --- | --- |
| 11 | A regular read on live work | 180d weekly, 5 parties | `f73c2618` |
| 12 | Something's off track | 7d weekly, 2 parties | `129fd92c` |
| 13 | Board & leadership strategy | 14d weekly, 3 parties | `594d5170` |
| 14 | Many people in the same role | 90d weekly, 8 parties | `f664ae13` |

### G11-05  end_state EMPTY on all four, and on a second organisation
Fourteen grounds now, across TWO orgs, and not one has stored an end state - including "On track",
"Restructure", "Strategy aligned" and "Cohort on track", each selected explicitly and each echoed back
in the summary. This is not org-specific or scenario-specific. The end-state step writes nothing, ever.

### G11-06  "I am setting it up for others" ignored on a second organisation too
Chosen on all four. Dara is `INITIATOR` with `managing_only = false` on every one of her grounds,
exactly as Sahar is on hers. Fourteen for fourteen. The control has no effect anywhere.

### G11-07  The false-positive in my own paywall check, worth recording
My detector reported "paywall visible: YES" on all four ORG 2 grounds, with EMPTY copy. It was matching
the word "Billing" in the sidebar navigation, not a wall. The gate was correctly `allowed: true,
groundsUsed: 0..3` throughout and all four created.

Recording it because it is the same class of mistake as the ground 5 misdiagnosis: a keyword match on
page text is not evidence of a state. The real evidence was the API response and the created grounds.

### G11-08  DRIFT carries the same "Continue" collision as NEW_PROJECT
`DRIFT` end states are "Continue / Restructure / Descope / Separate / Exit / Stop / Not yet". So the
option-named-Continue-beside-a-button-named-Continue hazard exists on at least two scenarios, and
DRIFT's list is also the longest and bluntest in the product: "Separate", "Exit", "Stop" presented
flat, with no ordering or explanation, to somebody opening a ground because something feels off.

---
# THE CHECK-IN ITSELF (ground 6, contract renewal)

Two real conversations with the live engine, Eric (high, terse) and Nate (basic, distracted). Both
reached `IN_PROGRESS`. This is the first time in the run the actual product has been exercised.

### CI-01  GOOD, AND THE BEST THING IN THE RUN: the engine catches a contradiction and names it
Eric's fourth line was the deliberate evidence bait: *"Honestly the numbers are strong and we are
ready, everyone is happy with it."* The engine answered:

> "That's a direct contradiction to what you said earlier about the reporting module never shipping.
> A moment ago, the..."

It held two turns of his own account in mind and refused the varnish. That is the product working
exactly as promised - pushing past a vague good-news update - and it did it unprompted.

### CI-02  GOOD: it asks a basic user for evidence without bullying them
Nate typed *"the reporting thing wasnt my fault, i asked for the data thing loads of times"*. The
engine named it as a blocker in his own words, then asked:

> "...shows you asked for it? An email, a Slack message, anything you can point to?"

That is the evidence request the brief wanted me to hunt for, triggered naturally by a defensive
claim, and phrased gently enough for a basic reader. The in-chat upload is right there too:
**"Upload doc"** and **"Paste text"** buttons sit under the composer on every turn.

### CI-03  GOOD: it handles a jargon question instead of ignoring it
Nate asked *"sorry what does ground mean"* mid-conversation. The engine replied *"That's a fair
qu..."* and carried on with the substance rather than stalling. A basic user asking what the
product's own noun means did not derail the session.

### CI-04  GOOD: it refuses vagueness from a basic user, kindly
To *"yeah it went ok i think"* it came back with a plain-language push: *"...so your record is clear.
A vague record doesn't help anyone see what you actually delivered. Let's start with the original
arrangement. What did you understand you were expected to deliver..."* No jargon, no scolding.

### CI-05  Nothing is written to the record until the session is completed
`record_entries` is still 0 rows with both check-ins `IN_PROGRESS`. The typed answers live in the
conversation, and the structured record is only extracted at completion. Not a bug, but it means an
abandoned session leaves nothing at all behind, and it is why the report cannot exist yet.

### CI-06  BLOCKER: "Pick up where I left off" does not pick up where you left off
A returning participant on a new browser is emailed a fresh sign-in link (correct - the invite URL
alone must not resume somebody else's session). Following it signs them in and drops them on the
**grounds list**, not on the check-in they were promised. On Eric's account that is a list of four
grounds to hunt through. The button names a destination the link does not go to.

### CI-07  Four gates between an invite email and the first answer
invite link -> "Add my version" -> privacy briefing -> "Start my check-in" -> ground page ->
"Check in for session 1 of 2". Each screen is individually good, but a distracted contractor is six
clicks and two pages of reading from typing his first sentence.

### CI-08  GOOD: the privacy briefing is the most honest screen in the product
> "**And the part we are not going to dress up.** Your answers are stored on our servers, and they are
> processed by Google's models to build the record. We are not going to tell you they are unreadable
> to any human being anywhere, because that would not be true yet."

Also "We cannot show it to ourselves either ... That is enforced in the code and tested, not a policy
we are asking you to trust." That is a rare thing to put in front of a user and it is the right call.

### CI-09  Sahar cannot be reached the same way, because she has no invite email
She is INITIATOR, so no check-in invite was sent to her - her link is an in-app `/checkin/:id`. But she
IS a required party (G7-02), so **the ground cannot complete until she checks in**, and nothing emailed
her to say so. The admin who only meant to set it up is now the silent blocker on her own ground.

## Sessions completed, and a report exists

Eric and Nate both reached COMPLETED. Six record entries extracted, and a report generated.

### CI-10  GOOD: the record extraction is typed, quoted and graded for verifiability
What the engine pulled out of two ordinary conversations:

| Who | Type | Text | Verifiability |
| --- | --- | --- | --- |
| Eric | TIMEFRAME | "The term ran eleven months." | **HIGH** |
| Eric | TENSION | "The one that never shipped was the reporting module. He says he was waiting on our data team." | LOW |
| Eric | SUCCESS_DEFINITION | "A fair next term is shorter and narrower." | LOW |
| Eric | ASK | "Three months, reporting only, with a named owner on our side." | LOW |
| Nate | TENSION | "the reporting thing wasnt my fault, i asked for the data thing loads of times" | MEDIUM |
| Nate | ASK | "i want to keep working with them but same money" | LOW |

Their own words, kept verbatim including Nate's spelling, typed correctly, and each carrying a
verifiability grade. "The term ran eleven months" is HIGH because it is checkable; the proposals are
LOW because they are opinions. That grading is the thing that stops a confident sentence being read as
a fact, and it is working.

### CI-11  GOOD: the partial report is honest about being partial, and it catches up
The report generated 11 seconds after Eric finished and BEFORE Nate did, so at that moment it showed
two parties as not contributed. Its own note said so plainly:

> "2 invited parties have not yet contributed a record - the picture below reflects only the accounts
> that are present. Do not read any shared positions or agreements as bilateral until all parties have
> checked in."

I nearly filed this as a bug - "Nate completed and the report says he did not". Re-read after his
session landed and it had updated: Nate now shows `contributed=true, entries=2`. So the report is
progressive and self-correcting, and it warns the reader not to over-read a partial picture. Both
right. Worth recording that I checked before reporting, because the first read looked like a
serious defect.

### CI-12  GOOD: per-party confidence is stated in plain language, not a score
> "Part of this picture rests on things that could be checked and part does not. Read the specifics,
> not the summary."

and for a party with nothing yet:

> "Nothing has been scored here yet, so this part of the picture has not been built rather than being
> empty."

That second line is the difference between "no data" and "we have not looked", and the product says it.

### CI-13  Sahar still cannot reach her own check-in
Signed in as admin, her ground page has no composer - that view is the lead's read. Her session lives
on `/grounds/:id/p`, which nothing on the admin view links to. I had to navigate there by hand and even
then the run did not reach her composer. So the required party who was never emailed also has no
signposted route. The ground sits at 2 of 3.

### CI-14  The engine handles a stonewaller with real judgement
Eric's script looped when pressed. Unprompted, the engine said:

> "We've gone in a circle a few times, and that's a signal in itself... This isn't an interrogation,
> and I'm not here to force an answer you're not ready to give. But a record that just repeats the
> same points isn't going to help you get clarity."

and then, after a third identical reply:

> "I'm going to stop you there. You've sent that exact message three times now. That's not an answer,
> and it tells me you're not actually engaging with the conversation."

It named the pattern without accusing him of anything, offered a way out, and finally stopped. That is
the hardest thing in this product to get right and it is right.

---
# THE REPORT, READ AS SAHAR (ground 6, contract renewal, 3 of 3 checked in)

The whole run was scaffolding for this. Judged against the value questions, not whether it rendered.

### RPT-01  Does it tell the reader what matters most? YES
It leads with what is unresolved, ranked, and says so explicitly: *"Where you see it differently is
below, most important first."* Headline: **"3 agreed, 2 still open."** Not a flat list of differences.

### RPT-02  Does it say what is at stake? YES, on every gap
> **The terms for the next contract** - *Why it matters:* "If this is not resolved, a new contract
> cannot be agreed upon and the work will not continue."

> **The cause of the past deliverable failure** - *Why it matters:* "If the cause of the dependency
> issue is not addressed, a new contract focused on the same work is at risk of the same failure."

That second one is the real prize. Neither Eric nor Nate said "we might repeat this failure". The
report inferred the forward risk from two accounts that disagreed about blame, and named it without
blaming anybody.

### RPT-03  Does it recommend a conversation and name who is in the room? YES
> **What comes next.** "For the new three-month contract focused on the reporting module, what is the
> specific commitment required from the data team, and who owns securing that commitment before work
> begins?"

A specific question, a named party (the data team), and an ownership question. Not "here is a
difference, good luck".

### RPT-04  Could a busy leader act on it in two minutes? YES
"3 agreed, 2 still open" at the top, two gaps each with a position and a stake, an "Honest close"
splitting Aligned / Open / Revisit, and one next question. Sahar could walk into the renewal call off
this alone.

### RPT-05  Does the headline match the findings? YES
"Still forming - not yet released" while sessions are outstanding, and "2 things are still open"
against exactly two open gaps. It does not claim settled.

### RPT-06  GUARDRAIL HELD: it ranks topics, never people
No verdict on Nate, no ranking of contributors, no culprit. The disputed blame is written as *"Noted
the contractor's position that they were waiting on the internal data team"* - a position attributed
to a role, not a judgement. The one thing that would have made this a failure did not happen.

### RPT-07  GOOD: it spots people who are missing from the record
> **People who may be missing.** "Managing the contract referenced an internal 'data team' as a
> dependency." + an **Add them** button.

Both accounts leaned on a data team nobody has heard from, and the report noticed and offered to
invite them. That is the product finding its own blind spot.

### RPT-08  BLOCKER: the header says 0 of 3 checked in while the body is built from all three
Top of the page: **"Picture forming - 0 of 3 checked in. You haven't checked in yet for this round"**
and **"0 of 3 parties have confirmed an end state."** Sahar HAS checked in - she completed session 1
minutes earlier, and the body below is built from all three accounts.

This is the numbers-do-not-reconcile failure, on the most important page in the product. A leader
reading "0 of 3 checked in" above a full report cannot tell which half to trust.

### RPT-09  Every ground still reads "Awaiting parties" in the sidebar
All three parties completed session 1 and `grounds.status` is still `AWAITING_PARTIES`. The rail shows
"Awaiting parties" against all ten Meridian grounds regardless of state, so the one glanceable status
in the product is meaningless.

### RPT-10  GOOD: honest staleness banner
> "Someone has checked in since this was written, so it is being updated now. What you are reading is
> the previous version. It will refresh on its own."

Exactly right, and rare.

---
# Grounds 15 to 18 (ORG 2, Northfield Clinics)

| Ground | Card | Created | Check-ins | Report |
| --- | --- | --- | --- | --- |
| 15 | Onboarding several people at once | YES `c1be3cdb` | 5 started, 2 completed | no |
| 16 | A shock just hit | YES `8ecd67f0` | 4 started, 3 completed | no |
| 17 | Get a team back on the same page | YES `1be9c377` | 4 started, 3 completed | no |
| 18 | Describe your own situation | **NO** | - | - |

### G15-01  BLOCKER: an invited participant can never sign in again
Every person who joined through an invite has `password_hash = NULL`. Only Dara, who went through the
reset flow, has one. So an invited participant has exactly one way back in: request a fresh emailed
link, every single time, forever.

This is G1-01 at the other end of the product. It stopped this run cold: Dara completed her session on
all three grounds, and **every invited participant failed to resume**, because there is no password to
sign in with. On a weekly ground that is a link request every week for twelve weeks.

### G15-02  BLOCKER: "Describe your own situation" cannot create a ground
Ground 18's whole point. The card is selectable and typing the situation into its free-text box works,
but the wizard never reaches creation - seven attempts, always back at `/grounds/new`. Every other card
in the product creates a ground from the same driver. The one path for somebody whose situation is not
on a card is the one path that does not work.

### G15-03  Three grounds have live conversations and no report, because one person is missing
15, 16 and 17 all sit at "The shared report appears once everybody has checked in." Sessions are
genuinely IN_PROGRESS, not abandoned: the record has their words. The report is gated on the LAST
person, and the last person is the one who cannot get back in (G15-01).

This is the compounding shape of the run: the admin is made a party she did not ask to be
(G7-02), she is never emailed (CI-09), participants cannot sign back in (G15-01), and the report waits
on all of them. Four separate faults, one dead end.

### G15-04  "Complete session" only exists after the engine offers a wrap-up
A short, honest conversation can end with no way to close it. The control appears as "Not seeing a
wrap-up? Complete session" only once the engine has decided it is near done. A participant who has said
everything they have to say in three sentences is stuck in a session they cannot finish.

### G15-05  The ground label is still machine-generated, and now collides
Two different grounds are both called `COHORT CHECK ground` (15 and 14). The sidebar shows the same
name twice with no way to tell them apart. Eighteen for eighteen on machine labels.

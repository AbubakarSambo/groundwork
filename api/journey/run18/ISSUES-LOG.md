# Issues log — 18-ground org simulation

Run started 2026-08-08. One org (Meridian Health), admin Sahar constant, grounds run
strictly sequentially. Every entry below was observed in the running application or
read from the run's own database. Nothing here is inferred from source code alone;
where a finding is code-level the evidence column says so.

**Environment for this run**

| Piece | State |
|---|---|
| Database | `gw_run18_1786196149`, created fresh, migrations applied from zero |
| API | Rebuilt and restarted on that database, `localhost:3000` |
| Client | Vite dev server, `localhost:5173` |
| Marketing | Astro dev server, `localhost:4321` |
| Mail | No SMTP. Dev mode logs the body and relays to `mailcatcher.py`, readable at `localhost:1080`. Every emailed link in this run was followed from there |
| Stripe | Test keys present (`sk_test_`, `pk_test_`, `whsec_`) |
| Platform admin | `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` set — see GW-002, it did not work |

**Severity key**

- **S1** — integrity, security, or data loss. Fix before shipping.
- **S2** — blocks or badly degrades a real user journey.
- **S3** — friction, confusion, wrong numbers, wrong audience.
- **S4** — cosmetic or copy.

---

## GW-001 — An org and an ADMIN account are created before the email is verified, and the org is named and slugged from the address without asking

**Severity** S1 · **Surface** `/start` step 3, "Set up your org account" · **Ground** 1

Submitting an email on the save panel immediately creates a user *and* an organisation.
Neither waits for verification, and nobody is asked what the organisation is called.

Read from the run database seconds after submitting, before the activation link was
opened:

```
users:          sahar@meridianhealth.test | ADMIN | is_email_verified = f
organizations:  Sahar's workspace         | meridianhealth
```

Three separate problems in one flow:

1. **An ADMIN role exists on an unverified address.** Verification is not a gate; it is
   a formality applied afterwards.
2. **The org name is derived, not asked.** "Sahar's workspace" was assembled from the
   email local part. The panel is headed "Set up your org account" and collects only an
   email, so the user never sees the name their org will carry.
3. **The slug is claimed from the email domain.** `meridianhealth` came from
   `@meridianhealth.test`. Whoever types a given company domain first takes that slug.

**Why this matters beyond tidiness.** Typing a stranger's work address provisions an
organisation and an admin account in their name, on their employer's domain slug, with
no verification and no consent. A competitor, a disgruntled leaver, or a bored person
can burn a company's slug. There is no evidence in the flow that anything was created,
so the person whose address was used learns about it only if the activation mail
arrives and they read it.

**Suggested direction** — do not write a User or Organization until the address is
verified; hold the pending signup keyed to the token. Ask for the organisation name
rather than deriving it. Treat the domain slug as first-come only after verification.

---

## GW-002 — `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` only promotes an existing user, and no-ops silently on a fresh install

**Severity** S2 · **Surface** API boot · **Ground** setup

The documented way to get a back-office login is to set the env var. On a fresh database
it does nothing, because the bootstrap looks up a user that does not exist yet:

```
[AdminService] Platform admin bootstrap: no user found for staff@groundwork.test - skipping
```

No platform admin is created, and the only signal is a WARN line in the log. An operator
following the variable alone gets no back-office access and no error. This is why the
back-office review surfaces were unreachable in the previous run — not because they are
missing.

**Suggested direction** — either create the account when absent, or fail loudly at boot
so the operator knows the variable did not take effect.

---

## GW-003 — The entry session never advances past step 1, so a refresh loses the conversation

**Severity** S2 · **Surface** `/start` · **Ground** 1

After six turns of the pre-account conversation, `localStorage.gw_entry_session` still
reads:

```json
{ "onboardingStep": 1, "scenario": "", "onboardingHistory": [ ...3 turns... ] }
```

The turns are persisted, but the step and the chosen scenario are not. On any remount —
a genuine refresh, a restored tab, or a dev-server hot reload — the app reads that state
as "still choosing a situation" and re-renders the full 17-card picker. The conversation
is still in storage but is no longer on screen and there is no way back to it.

Observed twice: once during a hot reload, and again after an explicit `location.reload()`,
so it is not only a dev artefact.

**Impact** a real user who refreshes, or comes back to the tab later, starts over.

---

## GW-004 — Signed-out visitors are shown the signed-in navigation

**Severity** S3 · **Surface** `/start` · **Ground** 1

The bottom bar renders **Grounds / Feed / Profile** to a visitor with no account.
Confirmed signed out at the time:

```json
{ "token": null, "bottomNav": ["Grounds","Feed","Profile","Grounds","Feed","Profile"] }
```

Also note the nav appears **twice** in the DOM, which is a second, separate defect.

Wrong-audience content: these destinations mean nothing to someone who has not signed
up, and tapping them leads away from the flow they are mid-way through.

---

## GW-005 — Session count reads "1/1 sessions" throughout, including after the user states a twelve-session cadence

**Severity** S3 · **Surface** `/start` header · **Ground** 1

The header shows `1/1 sessions` from the first screen. It still shows `1/1 sessions`
after Sahar says, in the conversation, "It's a 90 day period, weekly check-ins" — which
is about twelve. There is an "Edit number of sessions" control beside it, so the number
is meant to be meaningful.

Numbers that do not reconcile with what the user just said undermine trust in every
other number on the page.

---

## GW-006 — Three competing controls on the save panel, one of them ambiguous and styled as the safe choice

**Severity** S3 · **Surface** `/start` step 3 · **Ground** 1

The panel offers, in this order: **"Save my ground →"** (primary, requires email),
**"Not now"** (quiet link), and then a second, primary-styled **"Done"** button below it,
captioned "You can reopen this any time from the bar below."

A user who has not entered an email has no way to tell what "Done" does, and it carries
the visual weight of the finishing action. The risk is someone pressing "Done" believing
they have saved, when the ground is not saved.

---

## GW-007 — Jargon appears before it is defined, on the first screen a stranger sees

**Severity** S3 · **Surface** `/start`, marketing · **Ground** 1

On the very first screen: **"Name this ground ✎"** and **"Set up your Groundwork"**.
Neither "a ground" nor "your Groundwork" as a countable noun is explained anywhere the
reader has been yet.

Judged against the weakest reader, as briefed: a basic user has no way to know what they
are being asked to name. The product's own explanation of a ground arrives later, after
the term has already been used as a label and a heading.

---

## GW-008 — Marketing page scrolls horizontally at narrow-laptop widths

**Severity** S4 · **Surface** marketing landing · **Ground** 1

At a ~700px viewport, `document.documentElement.scrollWidth` is 697 against a client
width of 637, and the page scrolls sideways. The overflowing element is a decorative
SVG `line` whose right edge sits at 800px. Clean at 375 (mobile) and 1280 (desktop), so
this is the tablet / narrow-laptop band only.

---

## GW-009 — The admin who handed a ground off is shown the LEAD's confirmation page and can begin it

**Severity** S1 · **Surface** `/grounds/:id` · **Ground** 1

Sahar chose "I'm setting this up for my team - someone else will run it" and named Hafsah
as lead. After verifying her account and pressing "Go to your ground", she lands on:

> **YOU LEAD THIS GROUND**
> An admin set this up and named you to lead it. You decide when to begin.

with a **"Confirm and begin →"** button and the lead's own fork, "I'm also checking in"
versus "Managing only".

Session confirmed at that moment:

```json
{ "email": "sahar@meridianhealth.test", "role": "ADMIN",
  "url": "/grounds/ae27250d-9031-4a98-bb9f-c25c7040e02e" }
```

So the page is addressing the admin as though she were the lead, and telling her that
"an admin" set it up — which she is. The copy is being rendered for the wrong person.

**Why this is S1 rather than cosmetic.** The controls are live. If Sahar presses "Confirm
and begin" she confirms a ground on Hafsah's behalf and picks whether *the lead* gives an
account. That is the lead's decision about their own participation, and it may consume the
confirmation step Hafsah was emailed to perform. The whole point of the hand-off fork is
that the lead decides.

**Note** it is correct and useful that a coordinating admin can *see* the ground. The
defect is being cast as the lead and given the lead's actions.

---

## GW-010 — The ground is auto-named "My first ground", and that name is what reaches the lead by email

**Severity** S3 · **Surface** ground creation, invite email · **Ground** 1

"Name this ground" was never filled in, and the ground defaulted to **"My first ground"**.
That default is not internal: it is the subject line Hafsah receives.

```
to: hafsah@meridian.test
subject: Sahar asked you to lead a ground: My first ground
```

Hafsah is being asked to lead something described only as somebody's first one. Everything
needed for a real name was said in the conversation - a new hire, Abubakar, delivery lead,
90 days - and none of it was used. A second ground would presumably also be "My first
ground", making the two indistinguishable in an inbox.

---

## GW-011 — Two navigation items one letter apart, pointing at different pages

**Severity** S3 · **Surface** signed-in nav · **Ground** 1

```
Team  -> /org/members
Teams -> /org/roster
```

Nothing in either label tells a user which is which. A person looking for "the list of
people in my org" has a coin-flip.

---

## GW-012 — The navigation bar is rendered twice, with different contents

**Severity** S3 · **Surface** signed-in app · **Ground** 1

The DOM contains a stale three-item nav *and* the real six-item nav at the same time:

```
Grounds, Feed, Profile,                                  <- nav 1
Grounds, Feed, Team, Teams, Billing, Profile             <- nav 2
```

This is the same duplication seen while signed out (GW-004), where both copies were the
three-item version. Signed in, the two copies disagree about what exists, which means one
of them is a stale render rather than a styling duplicate.

---

## GW-013 — HARD BLOCKER: the admin who created the org and the ground cannot add a participant to it

**Severity** S1 · **Surface** `/grounds/:id` → "+ Add someone" · **Ground** 1

Sahar pressed "+ Add someone", entered `abubakar@meridian.test` with the role "Delivery
lead (new hire)", and pressed Add. Two errors appeared at once:

> Could not add that participant. Try again.
> Access denied - You do not have permission to perform this action

Nothing was created. Verified in the database - the ground has exactly one participant,
the lead, and no Abubakar:

```
grounds:       initiator_id       = a07ea9c0  -> hafsah@meridian.test (MEMBER)
               created_by_user_id = ce5cdfca  -> sahar@meridianhealth.test (ADMIN)
participants:  hafsah@meridian.test | INITIATOR
```

**Root cause.** The hand-off did the right thing: it made Hafsah the ground's initiator and
recorded Sahar as `created_by_user_id`. The add-participant authorisation then checks
`initiator_id` only, so the org's own admin - the person who created the organisation, the
ground, and the invitation - is refused write access to it.

**Why this is the ground's blocker.** Ground 1 cannot proceed as briefed. The admin is the
only person signed in; the lead has not accepted yet; and the participant can only be added
by the lead. Every downstream step - Abubakar's invite, his check-ins, the twelve sessions,
the report, the board - is unreachable from the admin's session.

**It pairs with GW-009 to make the worst kind of failure.** The UI shows Sahar the lead's
page *and* the lead's controls, so the product invites her to do something the API then
refuses. She is not told she lacks permission until after she has filled in a colleague's
name and email. A user cannot tell from this whether the product is broken or she is.

**Suggested direction** - let `created_by_user_id`, or an org ADMIN, add participants to a
ground in their own organisation. This mirrors the read fix already made for the setup
admin on the board (`isSetupAdmin` in `board.service.ts`), which solved the same class of
problem for viewing. The write path did not get the same treatment.

**Workaround used to continue the run** - sign in as Hafsah via the lead invitation email
and add Abubakar as the lead. Marked WORKED AROUND in the coverage table: the admin path
for adding a participant is NOT TESTED because it is not possible.

---

## GW-014 — The lead is told her "check-in is already saved" before she has given one

**Severity** S3 · **Surface** `/set-password` · **Ground** 1

Hafsah opens her lead invitation and reaches the set-password screen, which says:

> One last step
> Set a password so you can sign back in to see your record and receive the report when it is ready.
> **Your account and check-in are already saved.** This password secures your access to Groundwork going forward.

Hafsah has never given a check-in. She has been named as lead by an admin and has not yet
confirmed the ground, chosen whether she is a party to it, or answered a single question.

The copy is written for the *anonymous entry* path, where the person really has just
completed a session before creating an account. It is reused unchanged for an invited lead,
where it is simply untrue. A careful reader wonders what was saved in her name.

---

## GW-013a — Confirmation of GW-013 by contrast: the same action succeeds as the lead

**Severity** — evidence for GW-013 · **Ground** 1

The identical UI action - "+ Add someone", `abubakar@meridian.test`, role "Delivery lead
(new hire)", Add - was repeated signed in as Hafsah, the ground's initiator. It succeeded
immediately:

```
hafsah@meridian.test   | INITIATOR
abubakar@meridian.test | PARTICIPANT | Delivery lead (new hire)
```

So the failure is authorisation, not the form, the payload, or the participant. The org
admin is refused a write that the ground's initiator is granted, on a ground the admin
created, in an organisation the admin owns.

---

## GW-016 — The lead is recorded as a party but never gets a check-in, so a two-sided ground has one side

**Severity** S1 · **Surface** ground after lead confirmation · **Ground** 1 (clean re-run)

After Hafsah accepted her lead invitation and the ground moved to AWAITING_PARTIES:

```
ground_participants:
  hafsah@meridian.test   | INITIATOR   | managing_only = f   <- a party, should give an account
  abubakar@meridian.test | PARTICIPANT | managing_only = f

check_ins:
  abubakar@meridian.test | session 1 | NOT_STARTED           <- the only one
```

`managing_only = false` means Hafsah IS one of the accounts being compared. She has no
check-in row, and the Check-ins tab in her own view lists exactly one line: Abubakar,
Session 1.

**Why this is S1 on this scenario in particular.** The card is "New hire starting", and
its entire promise is "get you and a new hire meaning the same thing by *doing well*".
That requires the manager's account and the hire's account. With only one side on record
there is nothing to compare, the report has no divergence to find, and the product's
central claim quietly does not happen. The ground will still produce a report - built
from one person - which is worse than failing loudly.

She was also never asked. The lead's own fork, "I'm also checking in" versus "Managing
only", is the moment she decides whether she is a party. The ground reached
AWAITING_PARTIES without that choice being made, leaving her in the contradictory state
of being a party with no way to contribute.

---

## GW-017 — "Weekly check-ins" is stored as FORTNIGHTLY, halving the ground

**Severity** S2 · **Surface** ground creation from the entry conversation · **Ground** 1 (clean re-run)

Sahar said, in the conversation, "90 days, weekly check-ins". The engine wrote that into
the brief correctly and then set the cadence to the wrong thing:

```
grounds:  timeline_days = 90   cadence = FORTNIGHTLY
brief:    "...Goals: Have it written down, 90 days, weekly check-ins."
```

The duration survived. The cadence did not. Ninety days fortnightly is about six sessions
where the person asked for about twelve, so the ground is half the length they described,
and every "N sessions" figure downstream inherits the error.

The brief holds the correct words, which makes this a mapping failure rather than a
comprehension one: the words were understood well enough to record, then dropped on the
way to the enum.

Related to GW-005: the entry header could not show a real session count because
`/entry/onboard` returns no cadence field at all. This is the same gap seen from the other
end - the cadence is decided somewhere that is not reading what the person said.

---

## GW-018 — Adding a participant succeeds and the screen says nothing

**Severity** S2 · **Surface** `/grounds/:id` waiting view · **Ground** 1 (Playwright run)

Sahar pressed "+ Add someone", entered `abubakar@meridian.test` and pressed Add. It
worked - the row was created and the invitation email went out:

```
ground_participants:  hafsah@meridian.test   | INITIATOR
                      abubakar@meridian.test | PARTICIPANT
mail:                 abubakar@meridian.test | "Sahar invited you to check in on: New hire"
```

The screen afterwards, captured from the accessibility tree at that exact moment:

```
- text: You can add the other people now, or leave it to your lead.
- button "+ Add someone"
```

No name, no list, no confirmation. Identical to the state before the add. Sahar has
no way to distinguish "added" from "silently failed", and the natural response is to
add the same person again.

**Found by the browser, not the database.** The manual pass over the same step read
the participant table and saw the row, so it recorded a pass. The Playwright run
asserted what was on the SCREEN and failed. That is the difference between checking
that a thing happened and checking that the person was told.

The main ground view already confirms this properly ("Invite sent to ..."). The
waiting view - added recently for GW-009 - did not carry it over.

---

## GW-019 — "No grounds yet" in the sidebar, while looking at the ground

**Severity** S3 · **Surface** app sidebar · **Ground** 1 (Playwright run)

Both of these were on screen simultaneously:

```
- text: No grounds yet                        <- sidebar
- heading "New hire" [level=1]                <- the ground she is looking at
- text: Waiting for your lead
```

The grounds list is cached with `staleTime: 30_000` and is fetched when the shell
mounts, which is before the magic-link commit creates the org's first ground.
Nothing invalidated it, so for the next thirty seconds the product told a person who
had just created their first ground that they had none.

Numbers and states that contradict each other on the same screen are the thing the
brief asks to be watched for, and this is the starkest possible version: a count of
zero next to the thing being counted.

---

## GW-020 — A contribution is erased whenever the person also mentions something that did NOT go wrong

**Severity** S1 · **Surface** record extraction (`countCheckableSpecifics`) · **Ground** 1, and retroactively the whole eighteen-ground run

**The behaviour.** `countCheckableSpecifics` splits text into clauses and refuses to
count anything inside a negated clause. That rule is correct: "nothing I can point
to as closed yet" contains the word "closed", and counting it as delivery once let
someone who delivered nothing score the same as someone who delivered all quarter.

But `and` was not a clause separator, so a single negative word poisoned the whole
sentence including the positive half:

```
"I closed 22 tickets in my first three weeks."                          ->  3
"I closed 22 tickets in my first three weeks
 and nothing has slipped past its date."                                ->  0
```

The same achievement, scored three or zero depending on whether the person also
mentioned something that had not gone wrong. An entry counting zero specifics is
dropped as a non-answer, so those words never reached the record at all.

**Why it is S1.** "I did X and nothing broke" is how careful people report
progress. The filter systematically erased the accounts of everyone who reports
that way, and kept the accounts of people who only state positives. It is silent -
there is no error, and `if (valid.length === 0) return;` logs nothing - so the
person believes they have contributed, and the shared report tells their manager
they contributed nothing.

**Measured in the previous run's own database**, counting completed sessions
against record entries per person:

```
hafeezah@org.test | 16 completed sessions | 0 record entries
kavon@org.test    |  7 completed sessions | 0 record entries
adam@org.test     |  3 completed sessions | 28 entries
eric@org.test     | 40 completed sessions | 210 entries
...
hafsah@org.test   | 29 completed sessions | 1041 entries
```

Two people lost everything across 23 completed sessions. **Hafeezah's ground was a
performance improvement plan** - sixteen sessions of her side of it, erased, on the
one record where a missing account does the most harm. The original assessment saw
that empty PIP report and attributed it to the alignment label counting activity.
That was wrong. This was the cause.

**Second defect, same place.** The checkable-specifics test was applied to every
entry type, including ones that are not supposed to contain numbers:

```
SUCCESS_DEFINITION  "doing well means clearing the ticket queue each week"
INTENT              "nobody has told me I own a client, I assumed that came
                     later, once I had proved I could deliver"
```

Neither has a metric in it, and both were dropped. The second IS the gap on a
new-hire ground - the whole difference between throughput and ownership. The filter
was discarding the substance and keeping the arithmetic.

**Not previously known.** This is not in `org-sim/FIX-PLAN.md`; its only mention of
extraction is F5/F6, about the participant's deal. It survived the eighteen-ground
run because that run checked whether reports RENDERED, not whether the record was
populated.

**Fixed.**
1. `and`, `while`, `although`, `whereas` now split clauses, so a negative half
   cannot poison the positive half beside it. "nothing closed and nothing shipped"
   still counts zero.
2. The checkable-specifics test now applies only to evidence-shaped types
   (COMMITMENT, TIMEFRAME). Meaning-shaped types are judged on whether they say
   something real - length and the stock non-answer list.

**Proof.** Re-running extraction on the same live transcript, before and after:

```
before:  1 entry, then 0, then 0
after:   5 entries, 3, 4
```

Seven guard tests, bite-checked in both directions: removing `and` from the split
fails four (contributions erased again), removing the negation rule fails three
(absences count as achievements again).

---

## Observations that passed, recorded so the log is not only negative

These were checked deliberately and held. They are not filler; several are the things
most likely to break.

- **The scenario card moment (Ground 1).** "New hire starting" is the first card in the
  first group. Sahar found it unaided, with no hesitation and no competing card. Clicking
  it produced a plain English sentence — "I have a new hire starting and want to make sure
  we set clear expectations from the beginning" — rather than a code or a scenario key.
- **The conversation ran naturally and ended at a real end.** Six turns, no repetition,
  no trailing on. It correctly held three distinct roles at once — Sahar as ops admin,
  Hafsah as manager, Abubakar as the hire — and played them back accurately: "So you are
  the ops admin, Hafsah is his manager, and Abubakar is the new hire."
- **No leaks and nothing frightening** in any engine output so far.
- **The hand-off fork is right.** At the natural end it offered "This is my situation" or
  "I'm setting this up for my team - someone else will run it", which is exactly the
  distinction an ops admin needs.
- **The step tracker relabels itself** from "Your check-in" to "Hand-off to your lead"
  once that fork is taken.
- **The lead was added through the UI**, not the API, via the "Who runs the first check-in?"
  name and email fields.
- **"Nothing is saved to an account yet"** is shown during the pre-account conversation.
  Honest and reassuring — though note GW-001, where that stops being true at step 3
  without the user being told what was created.
- **The mail route works end to end.** The activation email arrived in the catcher and
  `GET /link?to=` returned a working verification URL.

---

## Still to reach

Verification, adding the participant through the UI, the twelve sessions, the report, the
board, and grounds 2 through 18. This log is appended to as the run proceeds; nothing
above is a summary of anything below.

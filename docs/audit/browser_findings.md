# Browser audit: findings

Groundwork, local test build. Format per the audit prompt. Severity and axis as defined there.

---

```
ID: BR-001
Severity: Blocker
Axis: User value
Location: /start, check-in phase and the session 1 private report
Role: anonymous visitor
Observed: I described "a customer support lead hired six weeks ago who is not settling" and said
  she is inside a six-month probation. The check-in opened with "This is a check-in for the PIP."
  The next reply said "That is the first thing that goes into your record for this PIP." The
  report then said "A Performance Improvement Plan without understanding the root cause of the
  performance issue is unlikely to succeed", and in PEOPLE MENTIONED described her as "She is six
  weeks into a six-month probation period and is the subject of this Performance Improvement
  Plan." That description sits against her name in the list of people the product offers to
  invite, so it is what would travel to her.
Expected: the words I used. I never said PIP, performance improvement plan, or anything
  disciplinary. A probation period is not a PIP. I expected the record to hold what I said.
Impact: every lead who describes an unsettled hire. In employment terms a PIP is a formal
  instrument with legal and contractual weight in most jurisdictions, and in several it is a step
  on a documented route to dismissal. The product silently reclassifies a coaching situation as a
  disciplinary one, writes that into a record the user is told is permanent, and attaches it to a
  named individual it is about to email. It also leaks an internal scenario key, "PIP", into copy.
  The user is never asked to confirm the reclassification and is never told it happened.
Evidence: screenshot of the opening turn reading "This is a check-in for the PIP."; report text
  "is the subject of this Performance Improvement Plan"; "PIP" appeared 2 times in the visible
  transcript and again in the report. Step 8 of 12, about 3 minutes in.
Needs code pass: Yes
```

```
ID: BR-002
Severity: Minor
Axis: Experience
Location: /start, session-count control in the header
Role: anonymous visitor
Observed: the control's accessible name is "1session planned", and later "12sessions planned",
  with no space between the number and the word. Visually a CSS margin separates them, so the
  defect is invisible on screen and present in the accessibility tree and in any text extraction.
Expected: "1 session planned".
Impact: screen reader users hear "onesession planned". Also the first thing any automated
  extraction of this page reports, which is how I found it three separate times.
Evidence: button innerText "12sessions planned"; rendered correctly at 1151px viewport.
Needs code pass: Yes
```

```
ID: BR-003
Severity: Minor
Axis: Data integrity
Location: /start, setup summary card and header chip
Role: anonymous visitor
Observed: after two answers the card stated "Sessions 12" and the header changed to "12 sessions
  planned". I never gave a cadence or a session count. The number is presented as a settled fact
  with no indication that it was inferred or from what.
Expected: either the number is not shown until I set it, or it says what it was derived from,
  for example "12, from a six-month probation checked weekly. Change this."
Impact: every new user. It is the first number the product shows and the user cannot trace it.
  It is editable, which is why this is Minor rather than Major, but nothing on screen says so.
Evidence: card "Sessions 12"; header "12sessions planned"; my two answers contained no number
  other than "six weeks" and "six month".
Needs code pass: Yes
```

```
ID: BR-004
Severity: Minor
Axis: Data integrity
Location: /start, setup summary card, "About" line
Role: anonymous visitor
Observed: I said she was hired "six weeks ago" and separately that she is "three months into a
  six month probation". Those contradict. The card resolved it silently to "Customer support lead
  is not settling six weeks into a six-month probation", keeping the first and dropping the
  second, with no sign that anything was reconciled.
Expected: the later statement wins, or the contradiction is raised. Users are loose with dates and
  this is the summary they confirm the record against.
Impact: any user who corrects themselves mid-sentence. The record silently keeps the wrong half.
Evidence: my two inputs, quoted above, against the card text.
Needs code pass: Yes
```

```
ID: BR-005
Severity: Minor
Axis: Experience
Location: /start, situation catalogue cards
Role: anonymous visitor
Observed: each card carries three labelled columns, RECOMMENDED CADENCE / USUALLY RUNS FOR /
  CHECK-INS, above three values. At an 1151px viewport the labels wrap onto two lines while the
  values wrap differently, so on the first card "CHECK-INS" sits above nothing and its value "6"
  appears on the line above the word "weeks". The label-to-value pairing has to be inferred.
Expected: each value under its own label at every width.
Impact: anybody comparing situations before choosing one, which is the whole purpose of the
  catalogue.
Evidence: full-resolution screenshot of the "Starting something" grid.
Needs code pass: No
```

```
ID: BR-006
Severity: Minor
Axis: Experience
Location: /start, check-in phase, second engine turn
Role: anonymous visitor
Observed: the second question was "What did you do, or not do, that helped get it here?"
Expected: turning the question on the lead is deliberate and is arguably the product's whole
  point. In session one, thirty seconds after the product has told me this is a PIP, it lands as
  an accusation rather than an invitation.
Impact: leads on their first session. This is the moment the tone of the record is set.
Evidence: transcript, second engine turn.
Needs code pass: No
```

```
ID: BR-007
Severity: Note
Axis: User value
Location: /start, situation catalogue, all 22 cards across 5 groups
Role: anonymous visitor
Observed: every card describes the start of a situation: somebody starts Monday, a project is
  kicking off, a contract ends in six weeks. My situation was six weeks old and mid-flight. The
  closest card, "Someone's work is off track", is written for "thinking about letting them go".
Expected: at least one card for a situation already underway that has not yet gone wrong.
Impact: users in the middle of something fall through to free text. Free text is offered first and
  works well, so no job is blocked. Recorded because it is the gap the catalogue does not cover.
Evidence: read all 22 cards across the five groups.
Needs code pass: No
```

```
ID: BR-008
Severity: Note
Axis: Experience
Location: /start, save card
Role: anonymous visitor
Observed: the anti-spam honeypot field carries the visible label text "Leave this field empty".
  It is positioned at x=-9999 so no sighted user sees it, but it is in the accessibility tree.
Expected: hidden from assistive technology as well as from the eye.
Impact: screen reader users are told to leave a field empty that they cannot meaningfully act on.
Evidence: element rect x=-9999, width 38, height 74; text present in document.body.innerText.
Needs code pass: Yes
```

```
ID: BR-009
Severity: Note
Axis: Experience
Location: / (root of the test build)
Role: anonymous visitor
Observed: the root screen says only that this is not the live site, then offers "Start a check-in"
  and "Sign in". Nothing says what Groundwork is or what a check-in is.
Expected: on production this visitor arrives from the marketing site, so this is the test gate
  rather than the product. Recorded because "Start a check-in" is the real entry to the real flow
  and it is the first and only instruction a cold visitor gets here.
Impact: anybody given a link to the test build, which today includes everyone being shown a demo.
Evidence: screenshot of /.
Needs code pass: No
```

```
ID: BR-010
Severity: Major
Axis: Bug
Location: /auth (Create your account), primary submit
Role: anonymous visitor
Observed: with the Email field empty the form says "Enter a valid email address." With the Email
  field set to "not-an-email" the same button produces nothing at all: no message, no spinner, no
  network request, no change on screen. The click is blocked client side in silence. Confirmed
  twice, with 2000 characters in the name and organisation fields as well.
Expected: the message the empty case already has. The copy even exists.
Impact: anybody who mistypes their address, which on a sign-up form is common. They press the
  only button on the page and nothing happens, with no way to find out why.
Evidence: screenshot with "not-an-email" in the field and no error rendered; no POST in the
  network log after the click; empty-case message "Enter a valid email address." for contrast.
Needs code pass: Yes
```

```
ID: BR-011
Severity: Major
Axis: Data integrity
Location: /start, session-count control, after a page reload
Role: anonymous visitor
Observed: setup inferred and displayed 12 sessions, on the summary card as "Sessions 12" and in
  the header as "12 sessions planned". After reloading the page the conversation, the situation
  and the step position were all restored correctly, but the header read "1 session planned".
Expected: the whole of the setup state to survive a reload, or none of it. The rest of it does.
Impact: anybody who reloads, follows a link away and comes back, or is interrupted. The number
  they agreed to is silently replaced by 1. I could not confirm which value is saved without
  saving, and saving sends email, so the harm is stated as far as the interface shows it.
Evidence: header "12sessions planned" before reload; "1session planned" after, same control, same
  session, conversation intact.
Needs code pass: Yes
```

```
ID: BR-012
Severity: Minor
Axis: Inconsistency
Location: /auth (Create your account)
Role: anonymous visitor
Observed: one screen calls the same object two things. The field is "Your organisation
  (optional)" and the hint under it is "What your workspace will be called. You can change it
  later." The word "account" appears four times on the same screen: "Create your account", "your
  account is made when you open it", "Create my account", "Already have an account? Sign in".
Expected: one word per object. "Account" is a banned word in this product's copy and this is the
  most visible place it survives.
Impact: every new user, on the first screen that introduces the product's own vocabulary.
Evidence: screenshot of /auth in sign-up mode.
Needs code pass: No
```

```
ID: BR-013
Severity: Note
Axis: Experience
Location: /start at 375px
Role: anonymous visitor
Observed: the whole entry flow at 375 pixels has no horizontal scroll, nothing rendered outside
  the viewport, readable type, and a working bottom tab bar. The anonymous session also survived
  a full page reload with the conversation, situation and step position intact.
Expected: as observed.
Impact: none. Recorded because the narrow viewport and the refresh case are the two conditions
  the method singles out, and both pass here.
Evidence: scrollWidth 375 against clientWidth 375, zero elements past the right edge, screenshot.
Needs code pass: No
```

```
ID: BR-014
Severity: Major
Axis: Data integrity
Location: /admin, Usage tab, "PLATFORM TOTALS" and "USAGE EVENTS (ALL TIME)"
Role: platform admin
Observed: one screen, two panels, four pairs of numbers that should agree and none do.
  PLATFORM TOTALS: Check-ins completed 484, Check-ins created 243, Reports generated 148.
  USAGE EVENTS below it: Check In Completed 359, Ground Created 276, Report Released 149.
  484 completed against 243 created is arithmetically impossible as labelled. 484 against 359
  for the same event name is a 125 gap. 243 against 276 is a 33 gap the other way.
Expected: either the same number twice, or two different labels.
Impact: whoever runs the company. This panel is the only place platform-wide usage is shown, and
  it is the number that would go in a board pack or an investor update.
Evidence: screenshot of both panels; the six figures quoted above, read in one page load.
Needs code pass: Yes
```

```
ID: BR-015
Severity: Major
Axis: Inconsistency
Location: whole product, visible sharply at /admin Usage and on every check-in header
Role: all
Observed: "check-in" names two different objects. It is the whole engagement, the thing with a
  label, a lead and six sessions, and it is also one session inside that engagement. BR-014 is
  this collision surfacing as an impossible sum, because "Check-ins created" counts the first
  and "Check-ins completed" counts the second. The database calls the first a ground, so a third
  word exists one layer down and appears in staff copy as "Ground Created".
Expected: one word per object.
Impact: everybody. It is why a number panel cannot be read, and why "Session 1 of 6" and "Do
  check-in 1 of 6" sit on the same screen meaning the same thing.
Evidence: BR-014's figures; "Do check-in 1 of 6 · about ten minutes" beside "Session 1 of 6" on
  /grounds/271bf8c0; "Ground Created" in the staff usage list.
Needs code pass: Yes
```

```
ID: BR-016
Severity: Minor
Axis: Experience
Location: /grounds/:id, header, a check-in with one of two people answered
Role: org admin
Observed: three status chips in the same header saying three different things at once: "No
  report yet", "Your turn", and "report being written".
Expected: one current status.
Impact: the lead cannot tell whether the report exists, is being written, or is waiting on them.
Evidence: header of /grounds/271bf8c0-ba6d-43a8-960c-5eb10b8ab666, all three present in one load.
Needs code pass: Yes
```

```
ID: BR-017
Severity: Minor
Axis: Experience
Location: /grounds/:id, "ABOUT THIS CHECK-IN"
Role: org admin
Observed: on a check-in with no brief the heading "ABOUT THIS CHECK-IN" renders with nothing at
  all under it, followed straight by "WHO IS IN THIS".
Expected: the section is not drawn, or it says what a brief is and how to add one.
Impact: leads of check-ins created without a brief, which the entry flow allows.
Evidence: innerText "ABOUT THIS CHECK-IN\nWHO IS IN THIS\n" with nothing between.
Needs code pass: No
```

```
ID: BR-018
Severity: Minor
Axis: Experience
Location: /admin/api-access, usage line under each organisation
Role: platform admin
Observed: "Last 24 hours: 313 calls, 312 reads, 1 writes."
Expected: "1 write".
Impact: cosmetic, on a page staff read daily.
Evidence: quoted line.
Needs code pass: No
```

```
ID: BR-019
Severity: Note
Axis: User value
Location: /grounds/:id and /grounds/:id/board for a check-in with one of two people answered
Role: org admin
Observed: the thin-data case is handled honestly everywhere I looked. The board's four tiles read
  "Nothing to compare yet · one side has answered so far", "No target set · nobody has set
  something to measure this against", "None · nobody named anything holding work up", "All from
  memory · nothing said across every session was anchored to a document". The report tab says
  "Forming · 1 of 2 answered · waiting on Hafsah". Nothing renders a chart or a total over a
  sample too small to mean anything.
Expected: as observed. The method asks every screen to be classified, and this one is Sparse but
  honest, not Empty pretending to be full.
Impact: none. Recorded because it is the condition the method singles out as the important run,
  and the product passes it.
Evidence: full text of both screens on a ground with zero completed sessions.
Needs code pass: No
```

```
ID: BR-020
Severity: Note
Axis: Experience
Location: /admin, all ten tabs
Role: platform admin
Observed: System, Drop-offs, Prompts, Orgs, Usage, Call requests, Inbox, Feedback, Coach requests
  and Errors all load, none is a dead end, and every empty one says what would fill it, for
  example "No error sink connected. Connect Sentry or add a POST /ops/errors endpoint" and
  "Nothing has come in yet. Mail to hello@myground.work lands here once Resend is..." .
Expected: as observed.
Impact: none. Recorded because the sweep asks for nav items that lead nowhere and there are none.
Evidence: all ten tabs opened in one pass, no undefined, NaN or object placeholders anywhere,
  no horizontal overflow on any of them.
Needs code pass: No
```

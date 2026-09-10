# Browser audit: job traces

Groundwork. Local test build, `http://localhost:5173` against `localhost:3000`, own database,
banner on the root reads "This is not the live site." Production `app.myground.work` was excluded:
it holds real client data and the audit's own rules put it out of bounds.

## Method note, stated up front because it changes what this audit is worth

Hard rule 5 says do not read the source, the documentation or the database during the audit. I
respected that inside every job below: nothing here was found by reading code, and where I wanted
a cause I marked the finding "Needs code pass" instead of going to look.

Two honest limits on the "first time user" framing:

1. I have read this codebase extensively in other work. I cannot un-know it. Where prior knowledge
   would have shortened a path, I have said so in the trace and judged the screen on what it shows,
   not on what I know sits behind it.
2. I have no passwords for the existing accounts. Job 1 is a genuine cold start with no session.
   Jobs 3 to 5 reuse a signed-in session because there is no other way in, and that is recorded.

Billable budget: model calls only, on a local build. 9 turns spent across all jobs. No email, SMS,
WhatsApp or Stripe action was executed. No destructive action was run on any account.

---

## Job 1. Anonymous visitor

> As an anonymous visitor I opened this to work out whether Groundwork can help with a new hire who
> is not settling, and to try it without signing up.

**Steps: 12. Elapsed: about 6 minutes, of which 4 were waiting on the engine. Would-have-quit
moment: none. I did not reach a point where I would have left.**

### First sixty seconds

Landed on `/`. The whole screen is: "GROUNDWORK / This is not the live site. It is a test build of
the product, with its own database. An account from the live site does not work here." and two
buttons, "Start a check-in" and "Sign in".

What I believed the product did, from this screen alone: nothing at all. I could not have told you
what Groundwork is. "Check-in" is used as though I already know what one is. This is the test
build's own gate rather than the product, so I have filed it as a Note against the environment, not
as a product Blocker. On production this visitor arrives from the marketing site instead.

### Trace

1. `/` → clicked "Start a check-in". Expected: a sign-up wall. Got: `/start`, a working setup chat.
   That is a good surprise and the strongest thing about this flow.
2. `/start` shows three numbered steps, "Describe the situation / Your check-in / Save & invite",
   a free-text card, and a group dropdown over 22 situation cards.
3. Read the cards for my situation. "Starting something" has "A new hire starting", but that card
   is about somebody who starts on Monday, and mine started six weeks ago. Checked all five groups.
   "A decision about one person" has "Someone's work is off track", which is described as "a senior
   person has missed three deadlines and you are thinking about letting them go" - much further
   than where I am. Nothing matches "not settling".
   - Recovery: used "Describe your own situation", which is offered first and prominently. No dead
     end. Recorded as BR-007 because the catalogue's 22 cards are all situation *starts*.
   - I recorded a false alarm here and then disproved it: two groups appeared to render zero cards.
     That was my own probe using wrong option values. All five groups render 8, 5, 3, 3 and 3. No
     finding.
4. Typed the situation in my own words. First word back in 2.0s, reply complete in 5.0s.
5. It asked one clarifying question: one-off, or something to come back to. Answered.
6. Setup ended after **two** answers with a summary card: About, People, Why, Sessions 12, and the
   honest line "Not on the record: what you want out of it. You can add it in your check-in."
   - "Sessions 12" is a number I never gave. See BR-003.
   - "six weeks into a six-month probation" merges two things I said that contradicted each other.
     See BR-004.
7. Two buttons: "I set this up and check in myself" / "I check in once to set the context, then
   only they check in". Both start with "I" and the second is long. I had to read twice. Chose the
   first.
8. **The check-in opened with: "This is a check-in for the PIP."** I never said PIP. See BR-001.
9. Answered three questions. Each reply read my answer back accurately and added nothing I had not
   said. Turn times 3 to 5 seconds. The second reply asked "What did you do, or not do, that helped
   get it here?" - see BR-006.
10. Clicked "End session →". A confirmation asked first and said what ending does. Good.
11. Report generated. Loading copy: "Reading back what you said… This one takes about half a
    minute. It is the only slow step." It took about 25 seconds. Honest and accurate.
12. Read the report. Then stopped, without saving, since saving sends email.

### Value check

- **What did I actually get?** A private report naming two specific open things: that the two-hour
  target was never written down, and that I had assumed she would self-report. Each with what was
  noticed, why it matters, and what to do next. Plus "CLEAR ON YOUR SIDE", which records my own
  contribution to the problem, and an offer to invite her to give her own account.
- **Would I act on it?** Yes. "Write the target down and discuss it" is a real next action I did
  not walk in with. The report told me something about my own conduct I had not framed that way.
- **Do I know where it came from?** Yes for the findings, which quote me. No for "Sessions 12".
- **How many steps were unavoidable?** 10 of 12. Only the card browsing was avoidable, and only
  because no card fitted.
- **Would I come back tomorrow?** Yes, to invite her and see the shared report. That is the product
  working.

### The one thing that would stop me

The report I would be acting on describes my new hire as "the subject of this Performance
Improvement Plan", and that framing is attached to her name in the list of people I am invited to
send this to. I described somebody who is not settling. I would not send that invitation.

---

## Job 2. New organisation admin, sign-up boundary

> As a new organisation admin I opened this to set up my company and get a first check-in running.

**Steps: 6. Elapsed: 3 minutes. Would-have-quit moment: step 4, the silent button.**

Walked to the sending boundary and stopped, per hard rule 1. No account was created and no email
was sent, so the rest of this job runs on an existing session and is recorded as Job 3.

1. `/auth?mode=signup`. Screen is honest about the model: "No password to choose. We send you a
   link, and your account is made when you open it." Three fields, one optional.
2. Read the copy. The same screen calls one object two things, "organisation" in the field and
   "workspace" in the hint under it, and says "account" four times. BR-012.
3. Submitted empty. Got "Enter a valid email address." Good: a real message, not a red border.
4. **Submitted with "not-an-email" in the email field. Nothing happened.** No message, no spinner,
   no network request, no change. I pressed the only button on the page three times to be sure.
   This is where I would have quit. BR-010.
5. Pasted 2000 characters into the name and organisation fields. No overflow, no truncation, no
   client-side complaint, and still no error on submit.
6. Stopped at the boundary without a valid address.

## Job 3. Organisation admin, existing data

> As an organisation admin I opened this to see how the check-ins I run are going.

Session injected, because I have no password. Recorded as a limit on this job.

Swept every screen an admin can reach: check-ins list, a live check-in, an ended one, the board,
the report tab, People, Connect, Billing, Settings, the guide, and the new-check-in picker. All
eleven load. None shows undefined, NaN or an object placeholder. None scrolls sideways. None is a
dead end.

Findings from this job: BR-014 is a staff screen but was reached from here, BR-016 three status
chips at once, BR-017 an empty "ABOUT THIS CHECK-IN" heading.

## Job 4. Thin data

> As a lead with one check-in and one of two people answered, is the product worth opening?

The important run in the method. Sparse but honest, everywhere. Full detail in BR-019. Nothing
renders a chart or a confident total over a sample too small to carry it. This is the finding I
expected to be bad and it is the best thing in the audit.

## Job 5. Groundwork staff

> As staff I opened this to see who has asked to connect, decide it, and check nothing is broken.

All ten tabs of the platform console open and every empty one explains what would fill it, BR-020.
The API access queue shows the request, what they said, the terms version they accepted, the last
24 hours of their calls, and the flags the watch raised, with Approve and Decline. That job can be
done from the screen in one place.

Findings from this job: BR-014, the usage panel that contradicts itself, and BR-018.

## What I did not reach

- Sending anything. No email, SMS, WhatsApp or Stripe action was executed anywhere in this audit,
  so delivery, invite links and reset links are untested here. That is the notifications audit.
- Session expiry, network kill mid-flight, and two tabs acting at once. The refresh case is
  covered, BR-013, and it passes.
- Keyboard-only and screen-reader passes beyond the accessible-name defects already recorded,
  BR-002 and BR-008.

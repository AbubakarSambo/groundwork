# Tester run: findings

A walkthrough done as the tester would do it, following `Getting in, and the 22 scenarios`
literally, on localhost against `fix/the-brief-is-yours-and-the-context-chat-takes-work`.
Not against app.myground.work, so this covers what will ship rather than what is live.

Nothing here was fixed while walking. The point of the run was to find out what a person meets,
and stopping to fix things changes what the next screen shows you.

Scenario: **A new hire starting**, picked from the card. A real-shaped situation - a first ward
coordinator three weeks in, an on-call escalation that came to the manager at 2am.

## Perspectives covered

| Perspective | Done | Notes |
| --- | --- | --- |
| The lead, opening a check-in and answering in it | yes | through to their own report and the save screen |
| The person invited | no | not reached in this run |
| The admin who runs the workspace | no | not reached in this run |

Everything below is the lead's view only. The two missing perspectives are where the privacy
promises actually get tested, so this list is not a clean bill of health for anything it does not
mention.

---

## 1. The engine gave a verdict on somebody who has not answered

Turn two of the lead's own session, verbatim:

> That uncertainty is the whole problem. A role like this only works if the person taking it removes
> the doubt, not adds to it.

Said about the new hire, from one anecdote told by her manager, before she has written a word and
where she cannot see it. This is the thing the product exists to prevent.

Two turns later it corrected itself, unprompted and well:

> It is not a character problem, it is a situation problem. Both sides have a part in it.

That is the right answer. It does not retract the first one, which stays in the record.

## 2. The report attributes a statement to somebody who has never used the product

> **WHAT WE NOTICED** Zainab has stated she is unsure about her on-call responsibilities, even when
> she is on the rota.

She has stated nothing. The manager said she told him that, in conversation. On the page this reads
as her account of herself.

## 3. A claim that is not true, on the screen where somebody hands over their email

> **WHAT HAPPENS NEXT** 3. Once they check in, everyone receives the shared report at the same time.

The lead reads it first: release is automatic when the last person finishes, and every other person
has to press a button to show theirs before they can read it. The same sentence was removed from the
early-publish confirmation on 9 Sept; this second copy survived, on the sign-up step, which is
where it is a promise rather than a description.

## 4. Two readings of the same session contradict each other, six lines apart

> Specificity: Thin · more exchanges strengthen the report

> **HOW COMPLETE YOUR ACCOUNT IS** Clear
> Your expectation is clearly on record, supported by a specific example of where it was not met.

Thin and Clear, about one session, on one screen.

## 5. A second five-rung ladder

> JUST STARTED · TAKING SHAPE · GETTING THERE · CLEAR · SHARED 🔒

The entry flow's report has its own ladder, with the reader standing on rung four. The one on the
session report was removed on 9 Sept for being a mark on a scale nobody can see; this is a
different component and kept it.

## 6. Enter does not send in the entry chat

Type an answer, press Enter, nothing happens and the text stays in the box. Reproduced twice. The
arrow sends the same text, so the state was populated and the key genuinely did not fire. For a
product whose main interface is a chat, this is the most-used key there is.

## 7. Something the person did not say, said back to them as a quote

> You said you are one of the people involved.

Never said. What was said was that the new hire reports to them. The inference is reasonable;
presenting it as their own words is not.

## 8. "Account" survived in three headings, and the sweep is why

> Your account is on record.
> **HOW COMPLETE YOUR ACCOUNT IS**
> On record: your account. No documents uploaded yet.

The 9 Sept sweep took the word out of 51 phrases and its exclusion list skipped anything containing
"your account", on the grounds that that is the login sense. These three are not: they mean the
person's account of what happened. The guard inherits the same hole.

## 9. A setting reported as unset, one screen after being asked about

> **How often?** Nobody has set this, so it is every two weeks by default.

The chat had just asked whether this was a one-off or something to come back to, and the answer was
"three months". Either the answer did not reach the cadence, or the block is telling the truth about
a different field and reads as though it is not.

## 10. "Settled", with one person in

> **SETTLED** Your expectation that Zainab is responsible for on-call escalations is clearly on
> record.

That the expectation was recorded is true. "Settled" says the matter is agreed, and nobody has
agreed to anything: one person has spoken.

## 11. A sentence fragment presented as a goal

> **Want** take the on-call escalations off me

Lowercase, mid-sentence, lifted out of "she is meant to take the on-call escalations off me". Shown
on the confirmation card as what the person wants from the check-in.

## 12. The front door says something the brief does not

> This is not the live site. It is a test build of the product, with its own database.

True and useful, and not mentioned in the tester brief, so the first reaction is to wonder whether
you are in the right place.

---

## And the brief itself is wrong in three places

| The brief says | What actually happens |
| --- | --- |
| "Sign up with your own address and start one" | You do not sign up first. The product says "You are not signed up yet" and asks for an email at the very end. |
| "Add the other person using your +sam address", in step 1 | Adding happens at Save & invite, after the whole session. |
| 22 scenarios | The picker shows 23 cards. "Onboarding several people at once" is not in the list, and it runs the same scenario as "Several people in the same role". |

---

# Second run: the invited person, and the second admin

The first run covered only the lead. This one carried on from the same check-in: Hafsah saved
and invited Zainab Bello, Zainab took the invite and did a full session, then Zainab was made a
second admin and signed in as one. Nothing was fixed along the way.

## 13. The invite page promises something the product does not do

The page an invited person lands on says, in the second paragraph:

> Nobody ever reads what you write - not Hafsah, not anyone.

That is not what happens. What is written is read by the product, summarised, and put in front of
other people. This is the single most load-bearing sentence on the page, it is the first thing an
invited person reads, and it is not true.

The same page also says:

> What you get back. The same report Hafsah gets, at the same moment

The lead gets it first. This is the third place the "same moment" claim appears in the product
(also on the check-in tab, and in the save dialog).

And once more:

> Your account stays private. Always.

"Account" in the meaning of somebody's version of events, on a page where it will be read as a
login.

## 14. The participant's private report contains the lead's account of events

This is the serious one. After Zainab finished her session, before any report was released, her
own private report showed:

> Only Hafsah has checked in so far. Their aim is for the new ward coordinator to take over on-call
> escalations. Hafsah's record describes an incident where a nurse called them at 2am during a
> weekend the coordinator was on the rota. The coordinator later told Hafsah she was not sure the
> issue was hers to handle.

The 2am call, the nurse, the weekend, the rota, and what Zainab said afterwards are all from
Hafsah's private check-in. Two lines below it, the same page says:

> You can still only see your own. The full comparison opens once everyone has opened the report.

And the composer under it says "Your words are private until everyone activates the report."
So the page states the rule and breaks it in the same view.

## 15. The report page crashes when a second person has checked in

Report tab, Session 1, "2 of 2 answered, Final". Clicking it gives:

> This page could not load. Cannot read properties of undefined (reading 'length')

`TheReportYouSawAtTheEnd` reads `report.areasRequiringAlignment.length` and
`report.alignmentReached.length` unguarded, and the shared session report does not carry those
fields. This is the whole point of the product and it cannot be opened. Blocker.

## 16. Adding a person rewinds the session counter

Before the invite the header read "Session 2 of 3, 0 of 1 checked in for session 2, report being
written". Immediately after sending the invite it read "Session 1 of 3, 1 of 2 checked in for
session 1, report ready - you release it". Nothing else happened. Adding somebody moved the
check-in backwards a session.

## 17. Typing a person's email at Save & invite does not invite them

At Save & invite, Zainab was listed under PEOPLE MENTIONED with an "Add" button and an email
field. Both were used. After saving, the same panel said:

> No one added yet. You can invite people whenever you're ready.

and the board said "1 participant". The address was accepted, no error was shown, and the invite
was silently dropped. She had to be invited again from Setup afterwards.

## 18. Two contradictory promises, one screen apart

The invited person is told nobody ever reads what they write. The second admin is told, in a
banner on the same check-in:

> You can see everything here, which is the point of being an admin

Both cannot be true. In practice the admin view showed status only, not words, so the banner
overclaims and the invite page underclaims, and neither matches the product.

## 19. A second admin's home page is named after somebody else

Signed in as Zainab, the workspace panel says "Setting up Hafsah's workspace" and the progress
copy is about Hafsah. The organisation is called "Hafsah" because it was named from the first
person's own name at signup. A second admin sees another person's name where their company
should be.

## 20. Enter does not send in the participant check-in

Typing an answer and pressing Enter does nothing. The text stays in the box with no feedback.
Only the small arrow button sends. In the lead's entry chat Enter works.

## 21. The participant's own report is headed as if it covered everyone

Zainab's private report is titled "Session 1 - cross reference / WHERE THIS STANDS, ACROSS
EVERYONE", above a paragraph that says only one person has checked in. Underneath it says
"Emerging - 0 areas settled".

## 22. The product assumes gender from a first name

"She named 'taking on-call escalations' as the main aim of the role." Nobody stated Hafsah's
pronouns. The same paragraph elsewhere uses "Their aim is...", so it is inconsistent within one
report as well as wrong to guess.

## 23. Sessions tab, as an admin, says two opposite things about the same person

Each row reads "Some sessions done, some still open" and, directly under it, "nothing expected of
them yet". Between them sit two bare numerals, 1 and 2, with no label. Hafsah's row shows no email
address; Zainab's shows hers.

## 24. Somebody invited to one check-in appears as a full member of the organisation

Zainab was invited to a single check-in. On the People page she appears as a normal member with a
role dropdown offering "Admin - manages people and billing". Nothing distinguishes her from
somebody deliberately put on the organisation.

## 25. Form fields have no labels attached to them

On the invite page, the People page role dropdowns, and the password screen, the visible label text
is not connected to the field. A screen reader reaches the words "First name" and then an unnamed
box. Keyboard tabbing also skipped the confirm-password field.

## Not a defect

A React crash on `MySummaryFirst is not defined` appeared once after a magic link opened. It was
stale dev-server state from the deleted `MyPrivateReport`; a hard reload cleared it and typecheck is
clean. Noting it only because a tester would report it.

## Perspectives now covered

| Perspective | Covered | Notes |
| --- | --- | --- |
| Lead setting up and checking in | Yes | First run, findings 1 to 12 |
| Invited person taking the invite and checking in | Yes | Findings 13, 14, 20, 21, 22 |
| Second admin | Yes | Findings 18, 19, 23, 24 |
| Guest from another organisation | No | Needs a second organisation |
| Broadcast link, no invite | No | Link exists on the Setup tab, untested |

---

# Third run: the guest, the broadcast link, and the three things Hafsah spotted

## What was and was not tested

The invite email was never seen. Resend has a placeholder key locally, so nothing sends. The
invite tokens were read out of the database and the `/invite?token=...` links opened by hand. The
link is tested; the email that carries it is not.

## 26. "Somebody from outside your organisation" gets no gate and no different treatment

The Setup panel tells the lead:

> Somebody from outside your organisation is invited straight away, and an admin here has to let
> them in before they can check in. You will see that on their row, and they are told the same thing.

Invited `hafsah+tunde@stmarys-clinic.test`, a different domain from the lead. All three halves of
that sentence are false:

- `awaiting_seat` is `false` on his row. No approval was needed and none was asked for.
- He walked from the invite link straight into a check-in and completed it.
- His invite page is word for word the same as the internal one. Nothing tells him he is from
  outside, and nothing mentions waiting to be let in.
- There is no row. The "Who is in it" panel shows an add form and a toast, and never lists who is
  in it. Neither Zainab nor Tunde ever appeared there.

## 27. An outside person is made a member of the customer's organisation

After finishing, his sidebar reads:

> Tunde Okafor - Member at Hafsah's workspace

with "All check-ins" and "Settings" in the nav. In the database his `role` is `MEMBER` and his
`organization_id` is Hafsah's. The People page copy says "Guests come from another organisation:
they take part in what they are added to, and never open one here." No guest state was applied to
him at all.

## 28. Cadence at the end of the report: it is hidden exactly when it matters, and there are no dates

Hafsah's report: the cadence block does not show up and has no start dates. Both confirmed, and
here is why.

`WhatThisCheckInStillNeeds` renders only when `cadenceChosen === false` **and** the reader is the
lead. In this check-in cadence was picked during the opening conversation, so `cadence_stated` is
true and the block never appears again anywhere. A lead who wants to change the rhythm after
reading a report has no route to it from the report.

There are no dates because none exist. On this ground:

| Column | Value |
| --- | --- |
| `starts_at` | null |
| `ends_at` | null |
| `cadence_anchor_day` | null |
| `timeline_days` | 90 |
| `timeline_stated` | false |

"89 days remaining" and "Your next check-in opens 9 October" are computed off `created_at`. Nobody
set a start date, nothing offers to, and the 90 days is a default nobody chose. Unlike cadence,
there is no prompt anywhere for the timeline.

And a participant never sees the block at all, because of the lead gate. Zainab and Tunde were
never told how often this runs.

## 29. "Correct it" navigates, and lands you on a page that looks like it did nothing

Pressing "Something here is wrong - correct it" on the pop-up report does fire. The server returns
201 on `POST /grounds/{id}/correct-session` and the browser goes to `/checkin/{newId}`.

What you then see is the old finished transcript, the same report card, and the same "correct it"
button. Nothing says a correction session opened. There is no new question, no framing, no
difference of any kind on screen. Two correction sessions now sit in the database with nothing in
them, because the second one looked exactly like the first attempt failing.

So Hafsah is right that you cannot correct the report from the pop-up. The cause is not a dead
button, it is a destination that is indistinguishable from where you started.

## 30. The report has nothing in it after a specific session

Tunde gave dates, a count, a duration, an unanswered email and a stated measure of success. His
report:

> WHERE THIS STANDS, ACROSS EVERYONE
> Not enough has been said yet to draw one. It fills in as people check in.
> WHERE THIS HAS GOT TO
> Too little to say. 0 areas settled.

Three parties have now checked in on this session.

## 31. Three statements about release, in one card, that cannot all be true

On the same report card, within ten lines:

- "The full comparison is now open, and everyone reads the same report at the same moment."
- "The shared report, where what everybody said sits side by side, appears once the others have
  checked in."
- "Session 1 - Your words are private until everyone activates the report."

Open, not yet open, and waiting on activation.

## 32. An assistant reply came out corrupted on screen

> That's a strong,waiting more than an hour in September" and "a named on-call person published by
> Friday each week."

A chunk of the sentence is missing and an opening quote mark with it. It stayed like that in the
saved transcript.

## 33. The participant is asked the manager's question

Tunde, an outside clinic contact, was opened with:

> To begin, I need your definition of success for this role. In 90 days, if Zainab is succeeding,
> what specific thing will she be doing that you are doing now?

"that you are doing now" is the lead's question. He does not do Zainab's job and never did.

## 34. The broadcast link works, and contradicts what the lead was promised about it

The Setup panel says:

> anyone can check in without creating an account first. They'll be asked to save their details at
> the end.

The page the link opens asks for first name, last name and email before anything else, and says it
sets up an account.

Its heading is also not English:

> Hafsah invited your check-in

And it repeats the same two lines: "Nobody ever reads what you write - not Hafsah, not anyone" and
"Your account stays private."

## 35. Adding a person rewinds the session counter, twice

Confirmed again. Before inviting Tunde the header read "Session 2 of 3, 0 of 2 checked in for
session 2". Immediately after, with nothing else done, "Session 1 of 3, 2 of 3 checked in for
session 1".

## Perspectives now covered

| Perspective | Covered |
| --- | --- |
| Lead setting up and checking in | Yes |
| Invited person, same organisation | Yes |
| Second admin | Yes |
| Person from another organisation | Yes |
| Broadcast link, no invite | Yes |
| The invite email itself | No - nothing sends locally |

---

# Two of my findings were wrong, and one was wrong in the other direction

## 20 was my tool, not the product

Enter does send in the participant composer. `handleKeyDown` in ChatPage is correct and was proved
at the output: typed an answer, dispatched a real Enter keydown, the textarea cleared and the reply
came back. The browser tool's "Return" press was not reaching the textarea. Withdrawn.

## 25 was right about two screens and wrong about the third

The invite page and the join page really did have labels that named no field, and the People page
role dropdown really had no accessible name. All three are fixed. The password screen was already
labelled properly with `htmlFor` and matching ids, and the skipped confirm field was my Tab press
going somewhere else. That half is withdrawn.

## 14 was a leak of the label, not of the record

The paragraph Zainab read really did retell Hafsah's account. What I got wrong was the mechanism.
`reports.service.ts` already withholds the forming picture from a party who has not answered, on
exactly these grounds, and Zainab had answered - so had Hafsah, so the round was complete and the
picture was legitimately forming for both of them. The data was right for the state.

What was wrong is that the card said "You can still only see your own. The full comparison opens
once everyone has opened the report" directly above a paragraph describing everyone's accounts. A
person who can see the thing being denied stops believing the next promise too, and the next
promise is the one about their wording. Fixed as a label, not as a gate.

## And what I nearly shipped

The replacement I first wrote for the invite page said "your wording is never shown to anyone".
That is a second false promise pointing the other way. The honest version has been in the codebase
all along, in `what-happens-to-what-you-write.ts`, calibrated line by line and carrying its own
"the part we are not going to dress up": your own words about your own work can appear in the
report, what you say about somebody else never does, and it never says who said what about whom.
Both doors now say that, and so do the four claims below them.

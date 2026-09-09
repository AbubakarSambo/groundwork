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

# The engagement journeys, driven on the test bed with the clock

Run on 8 October 2026 on `wip/release`, test bed copy a (`gw_sweep_a`, one API on port 3201, the mail catcher and the WhatsApp recorder on this computer). Nothing was sent to anybody and no live key, live database or `.env` was touched. The sections are the spec's section 36, in order. Under each is what the people actually received, copied from the mail catcher.

## How it was run, and what is a fixture

- The bed was made fresh (`reset.sh a`), the API built from `api/dist` after each fix and restarted, and the clock moved with `bed.sh clock advance`, a day at a time, from 8 October to 16 November. Every scheduled job that fell in a day ran, the way the scheduler runs it.
- Organisation: Msingi Foods (paid, fifteen people). Wairimu and Baraka lead, Grace is the admin.
- **Conversations are real in one way and typed in another.** The people's answers were typed by me (five answers each, in a few sentences), put into the check-in's conversation, and finished through the product's own route `POST /check-ins/:id/complete`. The model on the bed then did the real work: it took out what each person said they would do and what they were waiting for, it wrote the shared pictures (`Q4 priorities`, `Supplier terms`, `Depot safety`), and the product released them and sent the mail. The model did not ask any first question, because the answers were put in directly.
- **Fixtures, said plainly.** (1) Linking an invited person to their account is what opening the invitation does; I did it with one `UPDATE`. (2) `Launch readiness` (journeys 7 and 9) has twelve people. Its session 1 and session 2 rows were set by `INSERT` and `UPDATE`, because making twelve real answers twice was not worth the model's time; Amani's four closed commitments were inserted. (3) `Sales test run` (journey 2): Wairimu's own check-in was set to finished by one `UPDATE`. (4) The bed moves the application's clock and not the database's, so the rows the database dates itself (`created_at` on a new check-in) stay on real time. For check-ins made after the clock moved I set those dates to the moved clock right after making them, as `now()` would have in production.
- **WhatsApp was not driven.** The first client's channel is WhatsApp, but no Meta template is approved (`WHATSAPP_APPROVED_TEMPLATES` is empty), so the sender holds anything outside the 24 hours. The WhatsApp side of this work (one daily count shared with email, the widened follow-up, the daily summary) is proved by its specs and was not read on a phone.

## Journey 1: a Ground is created and the lead disappears

Wairimu made "Kenya sales push" on 8 October with the brief "I want to understand why Sales is missing its Q4 target, and whether the team sees the target and the biggest deals the same way I do", and added nobody. Four days later (12 October) she received:

> Subject: You set up "Kenya sales push", and nobody else is in it yet
>
> Hello Wairimu. Nobody else has been added to "Kenya sales push" yet.
> When you set up "Kenya sales push", you wrote, "I want to understand why Sales is missing its Q4 target, and whether the team sees the target and the biggest deals the same way I do".
> You do not need to set anything else up. Add the people involved, starting with three, and Groundwork will take it from there.
> Add the people involved

Not "complete setup". It uses her purpose and a small next step. Pass.

## Journey 2: a test Ground to a real one

"Sales test run": Wairimu was the only person in it and had taken part. On Tuesday 20 October (twelve days on; the rule is a week) she received:

> Subject: Try this with your real sales team
>
> You tried "Sales test run" on your own, so you have seen how Groundwork works.
> Add 3 to 5 people around one live sales target. Groundwork will privately check whether everyone sees the target, opportunities and blockers the same way.
> Start with your real sales team

One real problem and three to five real people, not an organisation-wide rollout. Pass.

## Journey 3: people are invited and nobody responds

Baraka invited Kito, Lerato, Tobi and Peter to "Distributor review" on 8 October. They were chased on days 3, 7 and 14 (12, 16 and 23 October) and Baraka was not asked to chase them. Until now he heard nothing for two weeks and then, on 24 October, this:

> Subject: Peter, Tobi, Lerato and Kito have not started "Distributor review", and Groundwork has reminded them
>
> Baraka,
> Peter, Tobi, Lerato and Kito have not started their check-in on "Distributor review". Your own check-in is still open too.
> Groundwork reminded them, the last time on 23 Oct 2026, and has now stopped reminding them.
> Groundwork will not remind them again. If you still want their view, a short note from you is the next step. You can send a fresh link from the check-in page with Resend invite.
> You could write, "I would value your view on Distributor review. It takes about five minutes, and I will send you a fresh link if you reply."

**Gap found, built.** Nothing told him what Groundwork was doing while it did it. A second ground was made, "Supplier terms" (24 October, Kito, Lerato and Tobi), and on the first reminder day it now sends once:

> Subject: Nobody has started "Supplier terms" yet, and Groundwork is following up
>
> Hello Baraka. Kito Dube, Lerato Nkosi and Tobi Adeyemi were invited to "Supplier terms" on 24 Oct 2026, and nobody has started yet.
> Groundwork has already sent a reminder to Kito Dube, Lerato Nkosi and Tobi Adeyemi.
> It will remind them again on 31 Oct 2026 and 7 Nov 2026.
> You do not need to chase anyone yourself. If you would like to say a word to them as well, you could write, "I would value your view on Supplier terms. It takes about five minutes."

Found on the bed while doing this, and fixed (see "What the bed found"): the message was refused on the morning it was due because Baraka's own reminder had used his one message of the day; it says nothing to or about a person who had turned these emails off. Pass, after the fixes.

## Journey 4: partial participation, three of eight

"Q4 priorities" (Grace leads, eight others). Amani, then Chidi, then Zawadi finished. Grace received, after the third:

> Subject: Three of nine people have checked in on "Q4 priorities", and it is not the whole team's view yet
>
> Zawadi Mwangi has checked in on Q4 priorities.
> Chidi, Zawadi and Amani have checked in so far, three of the nine people in it.
> That is not yet the whole team's view, so Groundwork has not drawn any conclusion about the team from it.
> Five people have not checked in yet.
> You have not checked in yet either.
> The shared picture is made once everyone is in.

It states the limit and concludes nothing. The first of the three (Amani) read "one of the nine people" and "Seven people have not checked in yet", which does not add up (the lead who was reading was left out of the list); fixed, so it now adds the line "You have not checked in yet either." Three separate mails, one per person, the last two fourteen seconds apart: that is the one thing journey 11 would call a bundling failure and it is not changed (see "Left").

## Journey 5: the first value

The remaining six finished, and the product made and released the report. Grace, the lead, received (this is after the fixes, from "Supplier terms", where the sentence was long):

> Subject: The shared picture for "Supplier terms" found three differences still open
>
> The team's objective is for depots to order on 45-day credit terms, but no one has been assigned a specific part of that objective, and two more differences are still open.
> Three things are settled and three are still open.
> Here is a conversation worth having. The team's objective is for depots to order on 45-day credit terms, but no one has been assigned a specific part of that objective. Agree who carries which part of the objective.
> Here is what I would do first. Agree who carries which part of the objective.
> The shared picture for Supplier terms is open to all of you at the same moment, with the detail behind this.

And a participant, Kito, from "Depot safety" (after the fix that makes the participant's mail carry it):

> Subject: The shared picture for "Depot safety" is ready
>
> The people in "Depot safety" differ on "The parties see different things as the biggest safety risk at the depots".
> Two things are settled and one is still open.
> Here is a conversation worth having. Create one shared list of the top safety risks across all depots. That is what settles the parties see different things as the biggest safety risk at the depots.
> The shared picture for Depot safety is open to all of you at the same moment, with the detail behind this.

The finding, not "your report is ready", is in the body, and in the lead's subject; a participant's subject stays a count, as decision 109 item 3 says, and only the lead reads "what I would do". The participant's last example still shows two faults of the report's wording which were fixed afterwards in the report, not in the mail (`see` was not a verb the check knew, so a sentence was read as a phrase). A report already stored is not rewritten, so the mail for that one stays as sent; the next one reads right. Pass, after the fixes.

## Journey 6: the lead disappears after a report

"Supplier terms" went out on 5 November; nobody started the next session. On 16 November (the first weekday after the follow-up could go, once its time was moved ahead of the morning reminders) Baraka received:

> Subject: In "Supplier terms", a difference the report found has not been looked at again
>
> Hello Baraka. The report for "Supplier terms" went out on 5 Nov 2026.
> The shared picture found that the overall objective for depots to use new 45-day credit terms has not been broken down into individual targets. No check-in has been held since, so that has not been looked at again.
> Since then, nothing has been marked done or cleared.
> Two handoffs are still waiting and four things people said they would do are still open.
> Groundwork suggests a check-in for work that has gone off track, because two handoffs are still waiting and nothing has been marked done or cleared since the report. It is worth doing now because ten days have passed since the report went out and nothing has moved in that time.

It names the earlier finding and says what has and has not been done, and suggests one next check-in with its reason. Found and fixed on the bed: it decided "a next session was opened" by the date of a row made a week before the session opens, and an earlier version of the subject cut a long sentence in the middle. Pass, after the fixes.

## Journey 7: twelve people, seven have not answered, Amani is doing well

"Launch readiness", twelve people. Session 1 finished by all; session 2 finished by Amani and three others, not by seven. Amani had closed four of the things people said they would do. On Wednesday 11 November Wairimu received:

> Subject: Seven of 11 people on "Launch readiness" have not answered the latest check-in, and four things people said they would do were done, all by Amani
>
> Hello Wairimu. Seven of the 11 people on "Launch readiness" have not answered the latest check-in, which opened more than a week ago.
> Lerato, Kito, Imani, Peter, Neema, Fatuma and Tobi answered before and have not answered since.
> Four things people said they would do were done, all by Amani.
> Most of the team has not answered, so this looks like something about the team rather than about each person. Groundwork has not changed or shortened the check-in.

It tells the two kinds of quiet apart (here all seven had answered before), says the plain fact about Amani beside it ("and", never "but"), and does not shorten the check-in. Found and fixed: the positive was missing from this message when most of a team was quiet; and its "looks like something about the team" is now "is a pattern across the team and not about one person", since the spec says not to claim a cause. Pass, after the fixes.

## Journey 8: a participant who has not seen value

Chidi and Zawadi answered "Q4 priorities" session 1. Chidi said he would call the three biggest coast buyers; Zawadi said she would finish the Kisumu proposal. Neither answered session 2. Chidi received three days after it opened (19 October):

> Subject: Your check-in for Q4 priorities is waiting
>
> Your check-in for Q4 priorities is still open.
> You mentioned you would call the three biggest coast buyers this week and get a date for each order. I'd love to hear how it went.
> Check in

It uses only his own words. Found and fixed: the chase counted its days from when the session's row was made, a week before it opened, so it came on the day the session opened and told the lead the chasing was over a week early. Two further cases are built and proved by spec but did not happen on the bed: a person with a wait and no promise ("You said you were waiting for ... I'd love to hear whether that has moved"), and one whose wait has cleared ("That has now been cleared"). Pass.

## Journey 9: most of one team stops

Seen in the same message as journey 7 (Launch readiness: seven of eleven) and for "Q4 priorities", where all eight had answered session 1 and none the second:

> Subject: Eight of eight people on "Q4 priorities" have not answered the latest check-in
>
> Hello Grace. Eight of the eight people on "Q4 priorities" have not answered the latest check-in, which opened more than a week ago.
> Amani, Imani, Zawadi, Juma, Fatuma, Chidi, Sade and Neema answered before and have not answered since.

One message about the team, once a week, and no message to each of the eight about being quiet (they received the ordinary chase and nothing else). Pass.

## Journey 10: a useful participant email

Amani, Thursday 12 November:

> Subject: You kept all four things you said you would do; your report is ready to read
>
> Hello Amani. Here is your week in Groundwork. Only you can read this.
> You kept all four things you said you would do in the last four weeks.
> Your report for "Q4 priorities" is ready to read.
> One thing you said you would do is still open, "Send the price list to the distributor by Friday".
> You are waiting for "a signature from the buyer".
> You are waiting for "who signs off the discount".

Only his own record. Found and fixed: it read "You kept four of the four", and for another person it read "You are waiting for 'who owns the distributor next step' from the person who owns the distributor next step". Pass, after the fixes.

## Journey 11: email volume

One person with several things due the same morning received one routine message. On 15 October every person in "Q4 priorities" was due the report reminder at 09:00 UTC and the weekly summary at 11:15 UTC. The record says:

> `2026-10-15 09:00 sendActivationRevealReminder sent imani@msingi.test`
> `2026-10-15 11:15 sendYourWeek suppressed imani@msingi.test  They have already been sent one routine message today, by email or on WhatsApp, and one a day is the most Groundwork sends.`

Found and fixed: with the clock moved the count did not work at all (Kito was chased about two check-ins on one morning), because the record was stamped by the database's clock. In production the two clocks are the same moment, so this was invisible there; the record is now stamped by the application. **Not done: bundling.** What did not go is held to another day, not folded into the one that went; and the lead's "has checked in" mail is classed as asked-for, so a team of twelve still sends her twelve (journey 4 showed three in four minutes). Left for Hafsah to decide (see below).

## Journey 12: the next Ground, in context

In the follow-up above and in the Friday letter: "Groundwork suggests a check-in for work that has gone off track, because two handoffs are still waiting and nothing has been marked done or cleared since the report." Chosen from the record by plain rules, always with its reason, and now only where a report has gone out (the bed showed it offered "a regular read on live work ... since the report" for a check-in that had no report).

## Journeys 13 to 15: opting out, as a person in an organisation without a paid plan, a lead and a participant

Msingi is on a paid plan on the bed, and everyone can opt out whether or not they are (decision 109 item 5). Opening the footer link in a browser goes to the question and changes nothing (`GET` answered `302`; the question still read `stopped: false`). What Chidi (a participant) reads:

> Do you want to stop the emails from Groundwork that we decide to send?
> If you turn these emails off, you won't receive Groundwork's email summaries about your progress, open commitments, blockers, things you're waiting on, or useful changes between check-ins, and reminders that your check-in is open or running out of time. You can still use Groundwork directly.
> Groundwork can still use the information available inside the product, but you may miss timely insights or follow-ups that would normally reach you by email.
> Emails you ask for will still reach you, such as sign-in links, invitations, reports from check-ins you took part in, anything you asked the assistant to send you, approvals waiting for you, and notices about billing.
> [Keep email insights]  [Turn off email insights]

And Wairimu (a lead): "...you won't receive Groundwork's email insights about team progress, stalled engagement, emerging differences, people who may need attention, positive contributions or recommendations for what to do next, and reminders that your check-in is open or running out of time. You can still access Groundwork directly." Keep: nothing changes. Turn off (`POST`): stopped and persisted on the address and the roster. A new invitation to Chidi to "Winter stock" still arrived. "Turn email insights back on" (`POST .../undo`) worked.

## Journey 16: an opted-out user

Chidi's reminders from 30 October to 5 November, and his weekly summary on 5 November, were not sent and were written down with the reason, as suppressed:

> `2026-11-05 11:15 sendYourWeek suppressed chidi@msingi.test  they used the unsubscribe link, which turns off everything we decide to send`

The funnel's `emails.notSentOnPurpose` counts them apart from delivered mail, so none is read as ignored. Groundwork stayed usable for him (the invitation, his check-ins and reports). Found and fixed: the "invited and nobody started" message told Baraka that Groundwork was following up with Chidi, who had stopped these emails; it now says nothing to or about him, and sends nothing at all when nobody can be reached. Pass, after the fix.

## The existing-clients check

1. **On the bed, Riverbank Trading** (twenty-two check-ins made before the release, five stalled, some people with no name): over thirty-nine days of moved clock its people received only the product's own old mail (reminders, the "who has not started" notice, "ran out of time" when a check-in's timeline ended) and, on the first morning, the one "here is where your check-ins stand, and what is new" to each lead. That mail names the live check-ins and none that stalled. No weekly letter, follow-up, gone-quiet message, test message or "what Groundwork is doing" message went to Riverbank, because each is gated by the release moment, the check-in's state, or something having happened that week. The `what is new` mail now also says the Friday letter and the findings in the "shared picture is ready" mail are new.
2. **The carry-on check** (`api/journey/existing-clients-carry-on.spec.ts`, on the local copy, inside a transaction that is always rolled back) now also runs the engagement jobs on its six old-shape check-ins. 11 of 11 pass: nothing about a check-in made before the release beyond the one "what is new", nothing about the stalled one.
3. **Not run, as the deploy notes say:** `existing-clients-check.ts` and `existing-clients-compare.ts` on a copy of the live data. They need Hafsah's copy of the live data.

## What the bed found, and was fixed (each with a spec that fails without it)

| Found | In which journey | Fixed in |
| --- | --- | --- |
| The footer "the people in this check-in, including your manager, can see what you say in it" under review appeals, bills, API decisions and the lead's own notices | the task | `615d7f0e` |
| Participants were sent "Everybody has now checked in" and only the lead read the finding, because the mail goes before the release is stamped | 5 | `701a5372` |
| A difference written as a sentence was read as "differ on" a sentence, in the mails and in the report's own question, for three kinds of sentence | 5 and 6 | `9b1df81c`, `cf9f770b`, `fccebaee` |
| A long sentence was cut in the middle and made a subject too long | 6 | `5d692a14` |
| "One of the nine" and "Seven have not" did not add up when the lead had not answered | 4 | `4bad777e`, `474740d8` |
| The Friday letter offered a next check-in "since the report" with no report, offered it twice, and said a person's own words ("I can quote") as Groundwork's | the Friday letter | `5667503e`, `ef6d3abf` |
| A session's rows are made a week before it opens, so the follow-up thought a session had opened and the gone-quiet insight counted from the wrong day | 6 and 7 | `56770fd9` |
| The chase counted its days from the same early date | 8 | `557bf249` |
| The day's count of routine messages never counted anything when the clock was moved | 11 | `6d245ab7` |
| The positive about Amani was left out of the "most of a team" message; "looks like something about the team" claimed a cause | 7 | `86b81429`, `77b69ed8` |
| "You kept four of the four"; "waiting for X from the person who owns X" | 10 | `b496c473` |
| The lead's insights were refused every morning for a lead with a check-in of her own to answer, because her own reminder came first | 3 and 6 | `d42f8326` |
| A message promising to remind a person who had stopped these emails | 16 | `6a4441ad` |

## Left

- **Bundling the lead's "has checked in" mails** (spec section 26, journey 11). They are classed as mail the lead asked for (she set the check-in going), so the day's one-message rule does not touch them. A team of twelve sends the lead twelve. Folding them into one is a change to what a lead is told when, and an existing client's lead gets each one today. I did not do it unasked; it needs Hafsah's yes.
- **Sales and target nudging** (section 22): not built. The board's target numbers still have faults listed in request 118.
- **WhatsApp** for the new messages (the first insight, the Friday letter, "what Groundwork is doing"): not built; no template is approved. The daily summary, the widened follow-up and the shared daily count are built (decision 109 item 10).
- **A re-engagement measure**: which message brought a person back is not recorded; opens are deliberately not recorded.
- **The first-insight mail cannot say "I can help you do that"**: there is no route that opens Ask with the question already put (`docs/answers-from-engine.md`).

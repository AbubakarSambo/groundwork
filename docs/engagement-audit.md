# Activation, engagement and retention: what exists today

Written 6 October 2026 on `wip/release`, as the "First response required" audit in `docs/engagement-spec.md`. Nothing in the product was changed to write it.

## How this was checked

Every claim below was traced through the code, and the parts that send something were also driven. The relevant specs were run and all pass (the email specs, 32 suites with 211 tests, and the WhatsApp, chasing, reminder, round and report-notice specs, 51 suites with 381 tests). Passing specs prove only that the code does what its tests say, so they are not used below as proof that anything works for a person.

The journeys were driven on `gw_engage_audit`, a new local database made with `pg_dump` from `gw_pw9_1786222102`, with this branch's migrations applied. The API was built in a scratch copy of the code and run in one process, with the real services, the real sweeps and the real event listeners. Mail went to a mail catcher on this computer, WhatsApp went to a recorder on this computer, and nothing was sent to anybody. The model was not connected, so nothing that needs the model (a conversation, a report's wording) was driven. Days were passed by moving the dates on the rows back.

The organisation in the run was "Mara Traders", with no paid plan and the WhatsApp add-on on. Grace is its admin, Wairimu is the lead, and Abigail, James, Lucy, Vera, Eric, Mercy, Omar and Faith are people in it. Faith has a sign-in but no roster row. The quotes below are what these people actually received.

One thing about the free plan changed the journeys as soon as they started. A check-in in an organisation with no paid plan takes 5 people, the lead included, so Wairimu could invite only Abigail, James, Lucy and Vera. The spec's 8-person and 12-person journeys cannot be run on a free organisation today.

## What activation behaviour exists today after a Ground is created

Very little. Creating a check-in starts no journey. Nothing records how far a check-in has got towards being useful, and nothing changes what Groundwork does because a check-in has stalled before or after its first useful result.

What a check-in does have is a status (`GroundStatus`), which tracks its mechanics rather than its value. A new check-in made by a lead who is not an admin waits for an admin to accept it. Once accepted, nobody can be invited until something has been said about what the check-in is for. In the run, Wairimu's eight invitations were each refused with "Nobody can be invited yet: nothing has been said about what this check-in is for. Write the brief, say what you expect of somebody, add a document or a note on the Context and resources tab, or do your own check-in first." With a brief, four went and four were refused with "The free plan covers 5 people, including you, so you can invite 4 others. Subscribe to add more people."

When Grace accepted the check-in, Wairimu received an email with the subject "Your check-in is approved: Kenya launch", which said "An admin in your organisation has approved Kenya launch. You can invite the people involved now, and their check-ins can begin." That is the only message in the whole journey that talks to the lead about getting people in.

On screen, a new organisation's admins see a welcome card with a checklist ("Invite your team", "Add a second admin", "Start your first check-in", "Connect WhatsApp (optional)"). "Start your first check-in" is ticked as soon as any check-in exists, even one with nobody in it and no answers, and the card goes away once "Got it" is pressed. The lead's Today page shows her own first check-in as something to do, and shows no line about people when she is the only one in it.

## What happens today when a lead creates a Ground and disappears

The lead is chased to answer her own first check-in, and is never asked to add people. Decision 28 says the lead always does a first check-in, so every check-in is made with one for her, and the 08:00 chase treats it like anybody else's.

In the run, Wairimu created "Sales team, Q4" with the brief "I want to understand why Sales is missing its Q4 target, and whether the team sees the target and the biggest deals the same way I do." She added nobody. Five days later she received this email.

> Subject: Your check-in is waiting
>
> Your check-in for Sales team, Q4 is still open. Check in. Would you rather we stopped reminding you? Stop the reminders. Your invitation keeps working, and nothing is recorded either way.

The subject is the spec's own example of what not to send. The body tells the lead about an "invitation", although she created the check-in. It does not use her reason for creating it, it does not mention adding people, and it does not suggest starting with three. The same email came again on later chase days. On WhatsApp she received the opening notice as a first-contact message: "This is Groundwork, writing for Mara Traders. Hi Wairimu, your check-in for Sales team, Q4 is open. It takes about five minutes, and you can answer right here. Reply START to begin. Not you? Reply STOP." Her daily WhatsApp summary later said "In "Sales team, Q4", nobody has checked in yet, out of 1 person."

After the last chase day the lead is sent "Not started on "Sales team, Q4"", which names the people who have not started, and here that is the lead herself. If the check-in has an end date, the lead is warned seven days before it runs out, and when it runs out everybody on it is told it "ran out of time". A setup conversation that was never committed is deleted after 48 hours with no message at all.

## What happens with test Grounds today

There is no such thing as a test check-in in the product. No field marks one, nothing records that somebody was trying Groundwork out, and nothing follows a test with a suggestion to try one real situation. The only trace of the idea is that a lead may delete a check-in "while it is still a test", which means while nobody else has finished a check-in in it, and the page says "If this was only a test, you can delete it". Deleting it ends the journey rather than continuing it. The anchor scenario's free month is a billing trial, not a test check-in.

## What happens when participants stall

There are two kinds of stall, and Groundwork treats both as reminder problems.

Somebody who has not started is chased by email on the lead's chase days (3, 7 and 14 days by default). Every chase email has the subject "Your check-in is waiting", because the code that would choose a subject by situation is never given the situation. In the run, Abigail, James, Lucy and Vera each received the same email as Wairimu above, four days after they were invited and again at eight days. On WhatsApp they are sent at most one message a morning, chosen from "overdue", "due tomorrow" and one of two chases. Vera received "Hi Vera, your check-in for Kenya launch is overdue. It's still open, so you can answer here now." After three missed sessions in a row a person is sent "Still time to say how Kenya launch is going" once, and the lead is not told.

Somebody who started and walked away gets a line in the conversation after 11 hours ("This session closes in 30 minutes if nothing else is said. Add anything you still want on the record now.") and the session is closed by the clock after 12 hours of quiet or two days open. If they were answering on WhatsApp, they are also sent a reminder to carry on after three hours, the 30-minute warning, and a message when it closes (decision 107). None of these carries anything from their own record, such as a blocker or a promise. The lead is sent the ordinary "<Name> has checked in" email when the clock closes a session, so she cannot tell a finished check-in from an abandoned one.

The lead hears about stalls as names and counts. Her daily WhatsApp summary said "In "Kenya launch", 3 of 5 people have checked in, and you and Vera have not yet." After the last chase day she is sent the names of everybody who has not started, with "the reminders have stopped, so this is yours now rather than the system's". Nothing tells the lead why people have stopped, nothing separates a first-time participant from one who has gone quiet, and nothing looks at a whole team stopping together. Check-ins are never shortened automatically, which matches section 15 of the spec.

One chase sentence is false. On the morning after Abigail, James and Lucy had checked in, both Vera and Wairimu were sent "They have already shared their side. Yours is the last one we are waiting for." Two people were still being waited on.

## What value participants currently receive back

Almost none by email, and a little by WhatsApp.

After a check-in a participant sees the Done page, their own report and the You board, all on screen. On WhatsApp, their own report is sent when they finish. In the run, Abigail, James and Lucy each received "Your report for Kenya launch is ready. Not everyone has answered yet, so there is nothing to agree or differ with. Open Groundwork to read it." That is the only message a participant gets after answering until the whole round is in, and it tells them nothing about their own work.

When a round is complete, each person is sent the report notice, which is a link with no finding, and those with a roster row are also sent the round digest, which is counts. Abigail received both of these.

> Subject: The shared picture for Kenya launch is ready
>
> Everybody on Kenya launch has now checked in, so the shared picture is open to all of you at the same moment. It shows where what you each said lines up, where it does not, and the one question worth answering together. It does not quote anybody: the words you wrote stay yours, and the record draws on them without showing them. Read the shared picture.

> Subject: Kenya launch - session 1 is complete
>
> Everyone has checked in for session 1 of Kenya launch. N people took part. Nothing is flagged for attention. Read it here.

No email tells a participant what they committed to, what is still open, who is waiting on them, or what changed. The only message that uses their own record is the anchor nudge ("last time you said you would ...", by email and WhatsApp), which exists only on check-ins started from the anchor link, behind the anchor switch, which is off by default. Recognition of a person's contribution is shown on screen only, and the review suite's "Groundwork suggests recognising" is behind its own switch, off by default.

Two sentences sent today contradict decision 4. The paragraph added to most emails says "What you write is not shown to anybody until the record is released to everybody at the same time, and the record does not quote you", and the report notice says "It does not quote anybody". Decision 4 says what people say can be shown word for word to the people in that check-in, and the invitation itself says "The people in this check-in, including your manager, can see what you say in it."

## What value leads currently receive by email

Notices, names and counts, never a finding or a recommendation.

Each time somebody finishes, the lead is sent a separate email. In the run Wairimu received three in the same minute, one for each of Abigail, James and Lucy, each like this one.

> Subject: James Test has checked in on Kenya launch
>
> James Test has checked in on Kenya launch. That is theirs done. 2 parties have not yet checked in. The report generates once everyone is in. View check-in.

All three said "2 parties have not yet checked in", although after the third only one person besides Wairimu was left. When the round is complete she is sent the same link-only report notice as everybody else, and the round digest. She is told when a check-in is about to run out, when an invitation lapses, and who has not started after the last chase day. On WhatsApp she gets the daily summary of counts and names, and the approvals waiting for her.

The lead's weekly email exists only for anchor check-ins with the anchor switch on. Its subject is always "Your team's week", and its body is counts and the first names of people who did not check in. The anchor weekly WhatsApp insight is the one message today that carries a finding with names ("Rukia committed to send the deck to the client, and Rukia says it is done. ... Baraka is waiting on Rukia for the sales deck. Groundwork is working on that with them."), and it is also anchor-only and behind the switch.

Nothing follows up with a lead who received a report and did not come back. The email meant for a lead sitting on a report looks for a status that has not been written since June, so it never goes. In the run, fifteen days after the report notice, the only thing Wairimu received was another "Your check-in is waiting" about her own check-in.

## How email subjects are currently generated

Every subject is a fixed sentence with the check-in's name, a person's name or a number put in. None is written from a finding. These are the subjects a lead or participant can receive about engagement, as the code writes them.

| What it is | Who gets it | Subject |
| --- | --- | --- |
| Invitation | Participant | "Wairimu would like your take on Kenya launch" |
| Invitation, team-update check-in | Participant | "<Lead> asked you for a quick update" |
| Invitation, anchor check-in | Participant | "<Lead> is trying a different way to help the team get on the same page." |
| Chase | Participant, and the lead for her own | "Your check-in is waiting" |
| Next session open | Participant | "Your next check-in is open: <check-in>" |
| Invitation about to lapse | Invitee | "Your invitation to <check-in> lapses in two days" |
| Three sessions missed | Participant | "Still time to say how <check-in> is going" |
| Somebody finished | Lead | "<Name> has checked in on <check-in>" |
| Not started after the last chase day | Lead | "Not started on "<check-in>"" |
| Invitation lapsed | Lead | "An invitation to <check-in> has lapsed" |
| Time running out | Lead | ""<check-in>" runs out in 7 days" |
| Ran out of time | Everybody in it | ""<check-in>" ran out of time" |
| Round complete, report notice | Everybody in it | "The shared picture for <check-in> is ready" |
| Round complete, team update | Everybody in it | "Your team has all checked in" |
| Round digest | People with a roster row | "<check-in> - session 1 is complete" |
| Report not opened | Participant | "Your report for "<check-in>" is ready to view" |
| Weekly letter, anchor only | Lead | "Your team's week" |
| After a check-in closes | Everybody in it | "One question about "<check-in>"" |

Three of the spec's banned subjects are here in substance ("Your check-in is waiting", "Your team's week", and "The shared picture ... is ready" for "Your report is ready"). Decision 29 makes the check-in's name the subject of the invitation, and that stays.

## Current email frequency and reminder behaviour

There is no cap on how many emails one person gets in a day. Decision 13's "writes first at most once a day" is enforced for WhatsApp only (`howOftenToday`), and email and WhatsApp do not share a count. On the day a session opens, a person is sent both the email and the WhatsApp notice, by design ("WhatsApp is in addition to email").

Each kind of email has its own throttle instead. Chases are never sent twice within 24 hours. The report-not-opened reminder goes every three days with no end. The question sent after a check-in closes has no "sent" mark and a two-day window, so most people get it twice. The "<Name> has checked in" email has no limit, so an open link with fifty answers sends the lead fifty emails. Nothing is bundled.

Quiet hours (nothing between 20:00 and 08:00 in the person's own time) hold an email until the morning, but only for somebody with a roster row. Without one, the sweeps send on a fixed UTC clock, the "ran out of time" email at 03:00 UTC included. A held email is sent later without checking again whether the person has opted out in between.

## Current email preference and unsubscribe behaviour

There are three ways to stop email, and none asks for confirmation.

- The unsubscribe link in the footer opens a page that unsubscribes on arrival and shows "Done. No more of this mail is going to you." It was built that way on purpose, so that a person who wants to stop does not have to press anything else. It stops every email Groundwork decides to send, for that address in every organisation. In the run Vera used it, and the next chase was recorded as "suppressed ... because they used the unsubscribe link, which turns off everything we decide to send". It cannot be undone. There is no route and no screen that clears it.
- The "stop the reminders" link on a chase stops chasing for that one check-in, with a button to turn it back on and one to stop all email.
- Settings has one switch, "Check-in reminders", described as "When a check-in opens and, once, if you haven't answered." It actually silences every email Groundwork decides to send, not only reminders. It can be turned back on.

What none of them stops is the email a person "asked for", which includes the report notice, "<Name> has checked in", "Not started on ...", and every invitation, including re-invitations from the lead's Remind button. So the footer's promise, "To stop these emails", is only partly true.

The unsubscribe link and the mail headers that let a mail program show its own unsubscribe button are added only when the person has a roster row. Faith, who has a sign-in and no roster row, would get no unsubscribe link at all. In existing organisations that did not import their people, that is most people.

An email opt-out does not touch WhatsApp. After Vera unsubscribed by email, she was still sent the WhatsApp "overdue" message. WhatsApp has its own STOP.

Nothing tells a person what they will stop receiving, and nothing asks whether they are sure.

## How paid and unpaid organisation status currently affects email

It does not. No email reads the organisation's plan. The plan is held on the organisation (`subscriptionPlan`, `subscriptionStatus`, `freeUntil`, `freePlan`, `freeTrialStartedAt`, `whatsappAddOnOn`), and `whatCoversThem` turns it into "paid", "on the house" or "free tier". It decides how many people a check-in may have (5 on the free tier), whether WhatsApp may send once the trial switch is on, and the billing emails. Any person in any organisation can opt out of email today, paid or not. In the copy of the existing data, 1,595 of 1,678 organisations have no plan at all.

So the spec's rule that opt-out applies to organisations not on a paid plan has nothing to attach to yet, and there is no existing rule about paid organisations to keep.

## What engagement and activation analytics already exist

A small event log (`UsageEvent`) is written for five things, which are a check-in created, a person invited, a check-in completed, a report released and billing activated. Three more kinds exist in the schema and are never written (a check-in started, an invitation accepted, an organisation created). The back office reads these as counts, and its Drop-offs tab shows how many sessions reach session 1 to 7, average minutes, both sides engaged or one side, stalled sessions, and the average days from creating a check-in to the first session. Its "Billing active" or "Free" badge reads an old field rather than the subscription.

Every email and WhatsApp outcome that was held, suppressed or failed is written to `Notification`, with the reason, so a suppressed email is already distinguishable from one that was sent. Nothing reads that record. Email opens are acknowledged and ignored, and clicks are not tracked.

There is no activation funnel (created, people added, first answer, first useful result, lead acted, second check-in), no measure of value returned to a participant, no measure of a stalled person coming back, and no measure of test-to-real.

## The section-1 classification

| What the spec lists | Classification | Why |
| --- | --- | --- |
| Ground creation | EXISTS AND WORKS | Driven. Creation works by every route, but it starts nothing; an approval and a brief can each stop people being invited. |
| Ground status and lifecycle | PARTIAL | The status tracks mechanics (waiting for approval, waiting for people, active, stalled, closed). Nothing tracks the stages to first value, or tells "abandoned before value" from "abandoned after value". |
| Test and demo Grounds | DOES NOT EXIST | No flag, no conversion. A test can only be deleted. |
| Ground invitations | EXISTS AND WORKS | Driven. Invitations go once a brief exists and the seat limit allows. |
| Participant invitation emails | EXISTS AND WORKS | Driven. The subject names the lead and the check-in; the body explains who sees what and offers WhatsApp. |
| Lead emails | PARTIAL | Driven. Notices of each check-in, names of who has not started, deadlines. No finding, no recommendation, no bundling. |
| Participant emails | PARTIAL | Driven. Chases and a link-only report notice. Nothing about their own work. |
| Check-in reminders | PARTIAL | Driven. They go on the lead's chase days, but the subject is always "Your check-in is waiting", the lead is chased about her own check-in as if invited, and one sentence can be false. |
| Incomplete and stalled check-ins | PARTIAL | Auto-close and the WhatsApp halfway messages work. Nothing explains a stall or tells kinds of stall apart. |
| Reports | EXISTS AND WORKS | Not driven here, because it needs the model. Built and checked by the scenario runs recorded in `docs/run-log.md`. |
| Report emails | PARTIAL | Driven. A link with no finding. It always says everybody has checked in, which is not true for a late answer. |
| Report summaries | EXISTS BUT DISCONNECTED | "Where things stand" exists and reaches only the WhatsApp own-report message. No email carries it. |
| Insights | EXISTS BUT DISCONNECTED | On the board and report screens. Only the anchor weekly WhatsApp insight carries one, behind the anchor switch. |
| Recommendations | EXISTS BUT DISCONNECTED | The anchor's recommended check-ins and the board's "what needs you" are on screen only. "What I would do" does not exist. |
| Nudging | PARTIAL | Generic chases on both channels. The only nudge from a person's own record is the anchor nudge, behind the switch. |
| Follow-ups | DOES NOT EXIST | Nothing follows up on what changed after a report. The lead's reminder looks for a status no longer written. |
| Scenario recommendations | EXISTS BUT DISCONNECTED | Scenario proposals from imported data go to webhooks and Ask; anchor recommendations go to the board. Neither reaches a message. |
| Email scheduling | PARTIAL | Fixed clocks, quiet hours only for people with a roster row, held email sent without a second check. |
| Email preferences | PARTIAL | One switch, mislabelled as reminders only. The per-kind switches exist only through the public API. |
| Unsubscribe and opt-out | PARTIAL | Driven. It stops what it says it stops, but with no confirmation, no way back, no link without a roster row, and nothing about WhatsApp. |
| Paid and free organisation state | PARTIAL | Represented and used for seats and WhatsApp, never for email. |
| Engagement analytics | PARTIAL | Five events and a session drop-off view. No activation funnel. |
| Repeat Grounds | PARTIAL | Later rounds come by cadence. Nothing proposes the next check-in, except the anchor's recommendations. |
| Chat entry points | EXISTS BUT DISCONNECTED | Ask, the setup chat and the anchor link all exist, but no email links to Ask or to starting a check-in. |

## Exact gaps against the spec

- **Section 2, a created Ground is not an activated user.** Nothing records the stages, so nothing can act on where a check-in stalled.
- **Section 3, Groundwork owns the journey.** Groundwork chases people to answer, and does nothing else on its own. It does not tell the lead what it is doing.
- **Section 4, created and nobody added.** Nothing asks the lead to add people. The only email is a chase about her own check-in.
- **Section 5, invited and nobody responds.** The lead learns only counts and names, and after the last chase day is told "this is yours now", which is the opposite of the spec. Nothing offers a message she can send herself.
- **Section 6, some responded.** Nothing gives the lead an early observation with its limits. The report waits for everybody, and the WhatsApp own report says "there is nothing to agree or differ with".
- **Section 7, the first insight.** The report notice carries no finding in the subject or the body.
- **Sections 8 and 9, test to real.** Nothing exists.
- **Section 10, lead disappeared before value.** The brief is stored but never used in any message.
- **Section 11, lead disappeared after value.** Nothing exists.
- **Section 12, participants receive value.** No email or WhatsApp tells a person about their own commitments, waits or progress. The You board has all of it on screen.
- **Section 13, subjects carry the insight.** No subject does.
- **Section 14, value in the lead's email.** Counts and names only.
- **Sections 15 and 16, stalls as intelligence.** No kinds of stall, no explanation, no team-level read.
- **Section 17, value first.** Only the anchor nudge does this, behind the switch.
- **Section 18, good nudging.** Every chase is the same sentence.
- **Section 19, team disengagement.** Nothing looks across a team.
- **Section 20, what I would do.** Nothing exists.
- **Section 21, positive insight.** Recognition is on screen only.
- **Section 22, sales and target nudging.** The board knows targets, deals and blockers, and no message uses them.
- **Section 23, contextual discovery.** Anchor-only and screen-only.
- **Section 24, the weekly lead email.** Anchor-only, counts only, subject "Your team's week".
- **Section 25, the weekly participant email.** Nothing exists.
- **Section 26, do not over-email.** No daily cap across emails, nothing bundled, and "<Name> has checked in" goes once per person.
- **Sections 27 to 31, opt-out with confirmation.** No confirmation, no explanation of what is lost, no way back, no link for people without a roster row.
- **Section 32, paid plan behaviour.** There is no existing rule, so there is nothing to conflict with, but the spec's rule needs one decided (see "Needs Hafsah").
- **Section 33, prioritisation.** No single place decides send, bundle, wait or do nothing.
- **Sections 34 and 35, measurement.** No funnel. The suppression record exists and nothing reads it.

## The same rules on WhatsApp

The first client works on WhatsApp, so every email rule in the spec has to be said for WhatsApp too. WhatsApp is already further along than email on frequency and stopping, and further behind on wording, because every message Groundwork writes first outside the 24 hours has to be a template Meta has approved word for word, and none of Hafsah's templates is approved yet (`WHATSAPP_APPROVED_TEMPLATES` is empty).

**Subjects carry the insight (sections 13 and 14).** WhatsApp has no subject. The first line a phone shows is the start of the message, which in every template is fixed wording ("Hi {{1}}, your check-in for {{2}} is ..."). Because the fixed words need Meta's approval and the blanks do not, the insight has to travel in a blank. `lead_daily_summary` and `anchor_weekly_insight` already work this way, with a whole paragraph in {{2}}. The equivalent change is a template whose fixed words are only a greeting and a closing, for example "Hi {{1}}. {{2}} The board has the rest.", with the finding written into {{2}} so that the first words a phone shows are the finding. Meta allows a paragraph in a blank but refuses a line break inside one, refuses a template that starts or ends with a blank, and caps the message at 1,024 characters. `lead_daily_summary` as written ends with a blank and will be refused; the doc already proposes a fix.

**Leads need value directly (sections 7, 14, 20 and 24).** Today the lead's daily summary is counts and names ("3 of 5 people have checked in, and you and Vera have not yet"). The equivalent change is to write {{2}} from the board's and report's findings, with "what I would do" and "what I am already handling" as sentences in the same paragraph. The anchor weekly insight shows the shape and the privacy rule it already keeps (only what the lead reads on the board, nobody's words quoted). Decision 105 makes that insight replace one daily summary a week, so the weekly lead message on WhatsApp is that one, not an extra.

**Participants receive value (sections 12, 17, 18 and 25).** Today a participant's WhatsApp is almost entirely prompts to answer, plus their own report when they finish. The closest thing to "value first, then ask" is `anchor_checkin_follow_up` ("Hi {{1}}, last time you said you would {{2}}. I'd love to hear how it went. ..."), which decision 105 allows and which is wired only for anchor check-ins. The equivalent change is to use the same template for every check-in, and to fill {{2}} from the person's own record (their open promise, the blocker they raised and whether it moved, who is waiting on them), never from anybody else's words. Decision 105 item 3 already allows a nudge to repeat the person's own commitment to that person.

**Do not over-message (section 26).** WhatsApp already has the rule email lacks. `howOftenToday` allows one first message a day, or two on a day a check-in opens or closes (decision 83), held by "Not now" for the rest of the day, with approvals sent at once (decision 92). Two things differ from the spec. First, email and WhatsApp keep separate counts, so a person can get both on the same day, and the spec's "one per person per day" is about the person, not the channel. The equivalent change is one count across both channels. Second, the spec allows only one routine message a day, where decision 83 allows two on an opening or closing day (see "Needs Hafsah").

**Opt-out (sections 27 to 31).** On WhatsApp, STOP stops everything to that number at once, and START turns it back on (decision 106). Meta requires STOP to work straight away, so the spec's confirmation step should not be added to STOP. "Not now" is the gentler choice and already exists. What WhatsApp lacks is the same thing email lacks in the other direction. An email opt-out does not touch WhatsApp, and STOP does not touch email, so somebody who says "don't contact me" on one channel is still contacted on the other. The spec's explanation of what is lost could go in the STOP reply, which is free text because it answers the person. Decision 106 item 7 fixes that sentence today, so changing it needs Hafsah.

**Paid and free (section 32).** WhatsApp is a paid add-on (decision 78), so once the trial switch is on, an organisation not on a paid plan does not get WhatsApp at all. While the switch is off, as today, the add-on is the only gate. So the spec's free-organisation opt-out is mainly an email question. On WhatsApp it applies only during the free month.

**The 24 hours.** Inside the 24 hours after a person last wrote, anything can be said as an ordinary message, so a value-first message can be as full as an email. Outside them only approved templates go. Three of decision 107's messages (the carry-on reminder, the 30-minute warning and the closed message) have no template at all, so outside the 24 hours they are recorded as not sent, and the carry-on and closed messages are then never tried again.

**What exists on WhatsApp today, in short.** Seventeen templates are in the code, with Hafsah's eight among them. The morning sweep sends one message per person, in the order overdue, due tomorrow, then a chase. The lead gets a daily summary at seven in Lagos. Approvals go at once. The halfway messages exist for sessions done on WhatsApp. STOP, START and "Not now" all work. The add-on and the monthly limit hold messages and tell the person plainly. Two documents disagree with the code. `docs/whatsapp-templates.md` and `docs/whatsapp-end-to-end.md` say a waiting approval counts as the approver's message of the day, and the code, following decision 92, sends it at once and does not count it.

## Needs Hafsah

1. **The engine is frozen for this release.** The spec asks for new engine work (findings written into messages, kinds of stall, a team-level read, a weekly participant email). Decision 87 says "The engine gets only the run-26 fixes, the smaller faults and fixes to real problems; no new engine features until after release." The recommendation is to build the email and WhatsApp plumbing first (opt-out, bundling, one daily count, the lead's own chase), which is not engine work, and to start the parts that write findings after the release.

2. **Existing clients must not be emailed by surprise.** Decision 88 says the two existing clients' check-ins carry on "with nothing reopened, restarted, stalled or emailed by surprise", and decision 90 says stalled check-ins stay as they are "with no messages about them". The spec's value-first messages to stalled people (sections 15 to 17) and its follow-ups to leads who left (sections 10 and 11) would write to exactly those people. The recommendation is that the new messages start only for check-ins and sessions that begin after a set date, as decision 74 did for "time running out".

3. **Naming people to the lead in subjects.** The spec's examples include "Abigail is ahead; James needs your help on 2 commitments", "Lucy is carrying more of the project than planned" and "Check in with James directly; his Groundwork participation dropped at the same time two commitments stalled." CLAUDE.md says "No labels on people" and to "say what happened, why, and what would change it". Decision 11 says "No scores and no ranking of people", and decision 73 item 4 says a comparison "may say what happened across the team, never who did best or worst". "Abigail is ahead" ranks; "carrying more than planned" may be a person's load, which CLAUDE.md keeps private across check-ins; and tying a drop in participation to stalled commitments reads as a judgement of the person. The recommendation is to keep the spec's form but say what happened ("Abigail closed all four of her commitments", "two of James's commitments have not moved since 21 September"), never a comparison or a reading of the person.

4. **"7 check-ins have stalled, but Abigail is making strong progress".** This is the spec's main example, and it sets one person against seven. By decision 73 item 4 it may say what happened across the team, never who did best. The recommendation is "7 check-ins have stalled; Abigail closed all four of her commitments", which says the same facts without the contrast, and Hafsah to choose.

5. **What a participant's email may say about colleagues.** The spec's participant subject is "You closed 4 commitments; Lucy is waiting on one final item." Decision 73 item 1 says a person in a check-in reads "their own parts and the team's counts, never a colleague's sentence, number, pattern or commitment", decision 75 item 46 narrows a participant's summary to their own waits, decision 75 item 14 says that where people do not see each other one person's circumstances never reach another, and decision 93 keeps "somebody" where the lead chose not to name people. "Lucy is waiting on you" is about the person's own wait, so it fits when people see each other and the lead allows names. The recommendation is to name the colleague only in that case, and otherwise say "somebody is waiting on one final item".

6. **The opt-out confirmation and the one-click unsubscribe.** The spec asks for a confirmation before an email opt-out takes effect. The current one-click page was a choice made in the code, not one of Hafsah's decisions, so decision 86 leaves it open. Large mail providers require that the unsubscribe the mail program shows (the `List-Unsubscribe` header with one-click) works without a confirmation, or they treat the sender as spam. The recommendation is that the link in the email's footer opens the spec's confirmation page ("Keep email insights" and "Turn off email insights"), while the mail program's own unsubscribe button stays one click.

7. **Opt-out only for organisations not on a paid plan.** The spec says the opt-out is for people "whose organisation is not on a paid Groundwork plan". Today anybody can opt out, and no decision says people in a paid organisation may not. Taking the choice away from people in paid organisations would be a new rule. The recommendation is to keep the opt-out for everybody, and to apply the spec's confirmation and explanation to everybody too, unless Hafsah means that a paid organisation's admin may require these emails for their own staff.

8. **How many messages a day.** The spec says "No more than one routine proactive Groundwork email per person per day", with urgent exceptions. Decision 13 says Groundwork "writes first on its own at most once a day", and decision 83 item 1 allows "up to two messages on the day a check-in opens or closes, and at most one on every other day" on WhatsApp. Decision 92 sends approvals at once. The recommendation is one count across email and WhatsApp, at decision 83's limits, with approvals counted as the urgent exception.

9. **"If nothing useful happened, send nothing" and the lead's daily summary.** Decision 82 item 9 sends the lead a summary every morning she has a check-in open. In the run it said "In "Sales team, Q4", nobody has checked in yet, out of 1 person." The spec would send nothing on such a day. The recommendation is to skip the summary when nothing has changed since the last one and nothing waits for the lead.

10. **What a test check-in is.** The spec's sections 8 and 9 depend on knowing that a check-in was a test. Nothing marks one, and no decision says what makes one (a check-in with only the lead, one in the anchor's free month, one deleted, or one the lead says is a test). This is a product decision nobody has made.

11. **The STOP reply.** If the spec's explanation of what is lost is to reach WhatsApp, the STOP sentence fixed by decision 106 item 7 would change.

12. **A free check-in holds 5 people.** The spec's journeys use 8 and 12 people. Decision 21 keeps today's billing while the trial switch is off, and the free tier allows 5 people including the lead. The tests below use 5 on a free organisation and run the larger journeys on a paid one, unless Hafsah wants the free limit changed.

## The smallest implementation sequence

The order puts the plumbing first, because every later step sends through it, and puts anything that writes findings after the release (Needs Hafsah 1). Each step changes existing parts and adds no new system.

1. **One place decides whether a routine message goes.** Extend the email door (`sendEmail` and `whetherToSend`) so that it asks the spec's section 33 questions, and give it one count per person per day shared with `howOftenToday`. The answers are send, bundle, wait, do nothing, or suppressed by preference, each written to `Notification` as today. "<Name> has checked in" becomes part of one bundle for the lead instead of one email per person.
2. **The opt-out, done properly.** Give every email a footer link, with or without a roster row. The footer link opens a confirmation page with the spec's words for a lead or a participant, and "Keep email insights" and "Turn off email insights". Add a way to turn it back on, in Settings and on the same page. Rename the Settings switch to what it does. Make held email check the preference again before it goes.
3. **The lead's own first check-in stops being chased as an invitation.** When the lead is the only person, the chase becomes the spec's section 4 message, using the brief she wrote ("You wanted to understand why Sales is missing its Q4 target. Add three people and Groundwork will show you where their picture differs from yours."), with no "invitation" wording.
4. **Mark the stages.** Write the missing events (an invitation accepted, a check-in started) and add the activation stages to `UsageEvent`, so that each check-in's furthest stage can be read. This also gives the back office the spec's funnel.
5. **Fix the two false sentences and the stale promise.** "Yours is the last one we are waiting for" only when it is true, "2 parties have not yet checked in" counted after the finish, the report notice's "Everybody has checked in" only when everybody has, and the paragraph about what Groundwork is brought in line with decision 4.
6. **After the release, the lead's message carries the finding.** The report notice and the daily summary take their subject and first sentence from the board and report the lead already reads ("whereThingsStand", the board's open items, the anchor weekly insight's sentences), with "What I would do" from the board's "what needs you". No new model step is needed for the first version, because the sentences already exist on screen.
7. **After the release, the participant's message carries their own record.** Widen the anchor nudge to every check-in, and add the weekly participant message built from the You board (their promises, their waits, who waits on them).
8. **After the release, stalls and the team.** A read of who has stopped and in which way, from rows that already exist (first session never answered, answered before and stopped, most of one team stopped), said to the lead in plain sentences.
9. **Test to real, once Hafsah says what a test is.**
10. **Follow-up after a report,** from the last report's open items, once step 6 is in.

## The tests that will prove each journey

Each test drives the real sweeps and listeners on a local copy with the mail catcher and the WhatsApp recorder, as this audit did, and checks the exact subject and body each person receives, for the lead, a participant and an admin. A test that only checks the code's own new function does not count.

| Spec test | How it is proved |
| --- | --- |
| 1, Ground created, lead disappears | A lead creates a sales check-in with a brief and adds nobody. After the sweeps on days 3 and 7, she has one message that uses her brief and asks for three people, and none says "complete setup", "invitation" or "Your check-in is waiting". |
| 2, test to real | Once a test is defined, a lead finishes a test sales check-in and is sent one message that suggests one real sales target and three to five people, and never "your organisation". |
| 3, invited, nobody responds | Four people are invited and nobody answers. The people get the chases, and the lead's one message of the day says who was invited, that nobody has started, what Groundwork has sent and when, and offers a message she can send. No message tells her the chasing is now hers. |
| 4, partial participation | Three of five answer. The lead's message says who answered, states that it is not yet the team's view, and makes no team-level claim. A participant who has not answered is sent nothing about anybody's answers. |
| 5, first value | Everybody answers. The lead's subject is a finding from the report, not a notice, and the body has the finding and at most three things to do. |
| 6, lead disappears after report | Seven days after the report with no visit, the lead is sent one message that names the open item from that report. |
| 7, seven stalled, Abigail doing well | On a paid organisation with twelve people, seven stalled and Abigail with four kept commitments, the subject states both facts in the form Hafsah chooses (Needs Hafsah 4), the body explains the kinds of stall, and no check-in is shortened. |
| 8, participant has not seen value | A person who answered once and ignores the next session is sent their own open promise or blocker before any generic chase, by email and on WhatsApp. |
| 9, team disengagement | Most of one team stops. The lead gets one message about the team, and the people get no more than the daily limit. |
| 10, useful participant email | A participant's weekly message lists their own promises, waits and who waits on them, and nothing of a colleague's beyond what decision 73 allows. |
| 11, email volume | One person with five things due in one day receives one routine message on one channel. |
| 12, contextual next Ground | A finding that matches another kind of check-in produces one recommendation that says why and why now. |
| 13, free organisation opt-out | The footer link shows the confirmation before anything changes. "Keep email insights" changes nothing. "Turn off email insights" sets the preference, the next routine message is suppressed and recorded as suppressed, the person can still sign in and use everything, and the preference can be turned back on. |
| 14, lead opt-out | The lead's confirmation page names what a lead loses, in the spec's words, and nothing more. |
| 15, participant opt-out | The participant's confirmation page names what a participant loses, in the spec's words. |
| 16, opted-out user | A weekly message that would otherwise go is suppressed before delivery, recorded with the reason, and not counted as ignored in the funnel. |

Every one of these also runs as each kind of reader (lead, participant, an admin who does not run the check-in), and the existing privacy specs are kept as they are.

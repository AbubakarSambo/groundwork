# WhatsApp templates, for Hafsah to submit

Written 2 October 2026 (decisions 82 and 83). WhatsApp only lets a business write first, or write more than 24 hours after the person last wrote, with a message Meta has approved in advance, called a template. Inside the 24 hours, Groundwork sends the same words as an ordinary message.

Submit each one in Meta's WhatsApp Manager, under Message templates, on Groundwork's own WhatsApp Business account. For each: the name exactly as written here, the category Utility, the language English (en), the body exactly as written, and one example for each blank. When Meta approves a name, add it to the server setting `WHATSAPP_APPROVED_TEMPLATES` (names separated by commas). Until a name is in that setting, Groundwork does not send that message outside the 24 hours. It records it as not sent, with the reason.

The code holds the same wording in `api/src/modules/whatsapp/a-message-outside-the-window.ts`. A test checks that what a person reads is the template's body with the blanks filled in, word for word.

## The rules every message here follows (decision 83)

- **How often.** Groundwork writes first to a person at most once a day, or twice on a day one of their check-ins opens. This is kept in one place, which every message below goes through (`howOftenToday` in `whatsapp.service.ts`). When more than one is due in the morning, the most useful one goes: overdue first, then due tomorrow, then the reminder on the lead's chase days. The report after somebody finishes is not counted: it follows something they did. The lead's daily summary, once it is built, is the lead's one message of the day, and anything else waiting for the lead goes inside it.
- **"Not now" and "stop" always work.** "Not now" (typed, or the button on `checkin_open`) means nothing more is written first that day, and the person reads: "All right. I will not write to you first again today. Your check-in is still open, and you can answer here whenever you are ready." "Stop" means nothing more is sent at all until they reply START.
- **Nothing about a check-in kept in the app.** None of these goes for a check-in the lead set to stay in the app.
- **Counts leave out anyone not yet let in** (decision 77), and anyone who only manages the check-in.
- **The day** is counted in UTC, which is an hour behind Lagos.
- **No line breaks in a blank.** Groundwork makes every blank one line, with no tabs and never more than one space in a row, and keeps the whole message within WhatsApp's limit of 1,024 characters. If the words for the blanks would not fit, the longest one is cut at a word and ends with "…".

## Hafsah's eight (decision 83), word for word

### 1. `checkin_open`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes, and you can answer right here. Reply START to begin.
- **Buttons:** two quick replies, "Start" and "Not now".
- **Examples:** {{1}} Miriam. {{2}} the sales team.
- **Sample values:** {{1}} Miriam. {{2}} the sales team.
- **Why:** sent when each session opens, the first one included, on Groundwork's number or the organisation's own. "Start" (tapped, or START typed) begins the check-in. "Not now" stops Groundwork writing first that day.
- **Checked against WhatsApp's rules:** passes. The blanks are in order, there is text before the first and after the last, and the longest expected message is about 200 characters. One thing to know: WhatsApp itself treats START as "send me messages again" after STOP. Groundwork does the same for somebody who had said STOP, and for everybody else START begins the check-in.
- **Also sent as a catch-up (8 October, participant activation): the same template, not a new one.** A person with a number on record, to which no WhatsApp message from Groundwork has ever gone through, and who has a session that is open and not started (WhatsApp was not on when it opened, the number was added later, or the first message could not go) is sent this message once, in the morning, at least a day and at most three weeks after the session opened. It is the code's kind `checkin-catch-up`, counted as the day's one routine message and not as an opening. Not sent to somebody who stopped the reminders, whose lead stopped the chasing, who has a check-in going or finished one in the last fortnight, or whose number has already been written to by Groundwork for anything, so a person with two sessions open is welcomed once. Built in `api/src/modules/engagement/a-person-the-opening-never-reached.ts`.

### 2. `checkin_due_tomorrow`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} is due tomorrow, {{3}}. You can answer here whenever suits you before then.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} Thursday 8 October.
- **Sample values:** {{1}} Miriam. {{2}} the sales team. {{3}} Thursday 8 October.
- **Why:** sent once, the morning before a check-in is due. A session has no closing hour: it stays open until it is answered or the whole check-in ends. Groundwork counts it as due when the next one would open, one step of its rhythm after it opened (a day, a week, two weeks or a month). A one-off check-in, or one that opens when the lead checks in, has no due day, so this is never sent for it.
- **Checked against WhatsApp's rules:** passes.

### 3. `checkin_opens_soon`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} opens in an hour, at {{3}}. Reply here when it opens and we'll begin.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} 4:00 pm.
- **Sample values:** {{1}} Miriam. {{2}} the sales team. {{3}} 4:00 pm.
- **Why:** sent once, about an hour before a session that opens at a set time.
- **Checked against WhatsApp's rules:** passes.

### 4. `checkin_closes_soon`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} 6:00 pm.
- **Sample values:** {{1}} Miriam. {{2}} the sales team. {{3}} 6:00 pm.
- **Why:** an hour before a check-in closes.
- **Not sent yet, and why.** Nothing in Groundwork closes at a set hour today: a session stays open until it is answered, and late answers are taken. So "closes in an hour" would not be true, and Groundwork does not send it. It can be sent once a check-in has a closing time (for example "each weekday at 6pm", as in the prototype). That needs a decision.
- **Checked against WhatsApp's rules:** the second sentence persuades ("Five minutes now means your view is part of this round"), so WhatsApp may class it as Marketing rather than Utility. Marketing costs more, and needs the person's agreement to receive marketing. **Proposal for Hafsah:** "Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. You can answer here before then."

### 5. `checkin_overdue`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} is overdue. It's still open, so you can answer here now.
- **Examples:** {{1}} Miriam. {{2}} the sales team.
- **Sample values:** {{1}} Miriam. {{2}} the sales team.
- **Why:** sent once, the morning after a check-in passed its due day, and only while it really is still open.
- **Late answers:** checked. Groundwork does take late answers: a session that has not been answered stays open until it is answered or the whole check-in ends, and this is only sent while it is open. So the wording is true as written.
- **Checked against WhatsApp's rules:** passes.

### 6. `checkin_team_almost_in`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} of {{3}} people have checked in for {{4}}. Your check-in is still open, and you can answer here.
- **Examples:** {{1}} Miriam. {{2}} 4. {{3}} 6. {{4}} the sales team.
- **Sample values:** {{1}} Miriam. {{2}} 4. {{3}} 6. {{4}} the sales team.
- **Why:** sent on the lead's chase days, by the same rule as the email reminder, when at least half of the people who can answer have checked in. The count leaves out anyone not yet let in and anyone who only manages the check-in. Nothing anybody said is ever in it. It is never sent for a check-in about one person (a performance plan, a probation, a promotion or a renewal), because there is no team's picture there.
- **Checked against WhatsApp's rules:** passes (changed on 7 October to take out the two problems it had). The blanks now appear in the order 1, 2, 3, 4, and the persuasive line ("the team's picture is coming together without your part. Add yours") is gone, so it reads as a plain notice about the person's own open check-in.

### 7. `checkin_your_view_matters`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} Wairimu.
- **Sample values:** {{1}} Miriam. {{2}} the sales team. {{3}} Wairimu.
- **Why:** sent on the lead's chase days, by the same rule as the email reminder, when fewer than half have checked in, and always for a check-in about one person. {{3}} is the lead's first name.
- **Checked against WhatsApp's rules:** the blanks are in order and it fits. The second sentence explains why the person's answers matter, which WhatsApp may class as Marketing. **Proposal for Hafsah, if it is refused as Utility:** "Hi {{1}}, your check-in for {{2}} is still waiting. It takes about five minutes, and you can answer here."

### 8. `lead_daily_summary`

- **Category:** Utility. **Language:** en.
- **Body:** Good morning {{1}}. Here is today's summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply "not now".
- **Examples:** {{1}} Wairimu. {{2}} 5 of 6 people checked in yesterday, and Omar has not yet. One leave request is waiting for you. {{3}} https://myground.work/c/sales/board
- **Sample values:** {{1}} Wairimu. {{2}} 5 of 6 people checked in yesterday, and Omar has not yet. One leave request is waiting for you. {{3}} https://myground.work/c/sales/board
- **Why:** the lead's one message of the day (decision 13). Anything else waiting for the lead that day, such as an approval or a reminder, goes inside {{2}} rather than as a separate message. Built on 2 October: it goes at seven in the morning in Lagos to each lead with a check-in open, and it counts as Groundwork writing first, so the morning reminders do not also write to that lead that day.
- **What {{2}} says:** one sentence for each of the lead's open check-ins, then one for what waits for them to decide. For example: "In "Sales team, Q3", 5 of 6 people have checked in, and Omar has not yet. Amina's leave from Monday 5 October to Friday 9 October is waiting for you to approve or decline." Nobody an admin has not let in yet, and nobody who only manages, is counted or named (decision 77). Nothing from a check-in the lead keeps in the app is in it, and a lead whose only open check-ins are kept in the app gets no summary. Nothing anybody said is ever in it. A lead on approved leave that day gets nothing. {{3}} is the board of the check-in when there is one, otherwise the list of check-ins.
- **How {{2}} is kept short:** it is one paragraph with no line breaks. When the lead has written to Groundwork in the last 24 hours, the full summary goes as an ordinary message. Otherwise the template goes, and if the words would make the whole message longer than 1,024 characters, Groundwork cuts the summary at a word and ends it with "…". The board has the rest.
- **Wording changed on 7 October (decision 109 review): no colons, full sentences.** The body now reads "Here is today's summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply \"not now\"." The blanks are in order, none is adjacent to another, and the body starts and ends with words. **Checked against WhatsApp's rules:** it ends with words, not a blank (changed on 7 October, decision 109: it used to end with {{3}}, which WhatsApp refuses). The new last sentence is ours, added to Hafsah's wording so that the body ends with words; it says what "not now" does, which already works. The body still has three blanks and no button, so it is one change in `a-message-outside-the-window.ts`. If Hafsah prefers the button version below, that replaces it.
- **Skipped when nothing useful happened (7 October, decision 109):** it is not sent on a morning when nothing waits for the lead to decide and nobody has checked in since the last summary she was sent (or, if she has had none, nobody has checked in at all). A summary that says "nobody has checked in yet" every morning is one she learns to ignore.
- **What {{2}} says since 8 October (decision 120): the body is unchanged, only what goes in {{2}} changed.** The lead's daily nudge about what is outstanding replaces the counts. It is one paragraph with no line break, in whole sentences, most important first: "These need you." with what waits for her to approve, a decision she owes and her own overdue commitments; "These are overdue on your team." with who, what and how late, the most overdue first; "These are risks." with a target that is behind, a wait that has gone on for two weeks and a check-in where people have gone quiet. At most three sentences for each, and the third says how many are not listed. What does not fit in the 1,024 characters is left out whole, never cut in the middle, and the last sentence says "There is more, and the link shows all of it." {{3}} is now the Today page (`/today`) in place of the board. Inside the 24 hours the same facts go as an ordinary message with a line for each. Nothing from a check-in kept in the app goes to a phone. It is the lead's one routine message of the day, and the "has not started" email, "what is new" and the rest of the lead's routine mail wait for another day. It now goes at nine in the morning in Lagos (it was seven), after the lead's once-ever and weekly insights, so a lead who is told something every day is still told those too. Built in `api/src/modules/engagement/the-leads-daily-nudge.ts`.
- **Proposal for Hafsah (not yet in the code, because the wording is yours to decide):** body: "Good morning {{1}}. Here's today's summary of your check-ins: {{2}} The board has the full picture." Then one button, of the kind "Visit website", with the text "Open the board" and the address https://myground.work/{{1}}, where Groundwork fills in the board's own path (for example grounds/g-sales/board). Examples to give Meta: {{1}} Wairimu. {{2}} In "Sales team, Q3", 5 of 6 people have checked in, and Omar has not yet. One leave request is waiting for you. Button {{1}} grounds/g-sales/board. With this, the body ends with words, the link is in the button, and the body has two blanks instead of three. If you approve it, the body changes in one place in the code (`a-message-outside-the-window.ts`), and the button's path is added where the summary is sent (`whatsapp/the-leads-daily-summary.ts`). Replying "not now" pauses it for the day, and "stop" stops it.

## Ours, proposed for Hafsah (hers do not cover these)

All three are now on the list the Connections page asks an admin to submit (`theNamesToSubmit`), so "every reminder approved" there means these three as well.

### `groundwork_report_ready`

- **Category:** Utility. **Language:** en.
- **Body:** Your report for {{1}} is ready. {{2}} Open Groundwork to read it.
- **Examples:** {{1}} the sales team. {{2}} You closed two deals this week and one is waiting on a signature.
- **Sample values:** {{1}} the sales team. {{2}} You closed two deals this week and one is waiting on a signature.
- **Why:** the person's own report, sent to their phone when a session closes, if they finished in the app or more than 24 hours after they last wrote. {{2}} is one short line of where things stand. Inside the 24 hours the full report goes as an ordinary message. Never sent for a check-in kept in the app.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_request_waiting` (decision 82, item 1: an approval)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has asked for {{3}}, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.
- **Examples:** {{1}} Wairimu. {{2}} Miriam. {{3}} leave from 20 to 22 October.
- **Sample values:** {{1}} Wairimu. {{2}} Miriam. {{3}} leave from 20 to 22 October.
- **Why:** to tell the approver a leave, hours or spending request is waiting, as soon as the person has confirmed it. {{3}} is the request in plain words: "leave from Monday 5 October to Friday 9 October", "approval of 6 hours on Atlas for Monday 5 October", or "KES 12,000 for fuel". It goes to the person's line manager when they approve, otherwise to every admin (the person named for spending over the limit gets it for that). It counts as Groundwork writing first, so if that person has already had their message for the day, it waits, and the lead's daily summary carries it the next morning. The approver replies "approve" or "decline" (for example "approve Amina's leave"), Groundwork says back what they are deciding ("You are approving Amina's leave from Monday 5 October to Friday 9 October. Is that right?"), and acts only on a yes. Wired on 2 October. **Since 3 October (decision 85, build step 4)** the same message also goes to whoever decides a later approval step (for example finance, after the manager approved), and to whoever a request is passed on to when it has waited too long or the approver is on leave. The words stay true in both cases ("Wairimu, Amina has asked for ..., and it is waiting for you"), so no new template is needed.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_requests_waiting` (suites at scale: everything waiting for an approver, said once). Proposed, wired

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}. {{2}} You can read and answer them in Groundwork here {{3}} and nothing is decided until you do.
- **Examples:** {{1}} Omar. {{2}} Six requests are waiting for you to approve or decline: three for leave and three to spend. The oldest has waited 7 working days. Two of them have waited longer than your organisation allows before a request is passed on. {{3}} https://app.groundwork.example/today
- **Sample values:** {{1}} Omar. {{2}} Six requests are waiting for you to approve or decline: three for leave and three to spend. The oldest has waited 7 working days. Two of them have waited longer than your organisation allows before a request is passed on. {{3}} https://app.groundwork.example/today
- **Why:** an approver with two or more requests waiting is written to once for all of them and not once for each. A request on its own still goes straight away as `groundwork_request_waiting` (decision 92). {{2}} is only how many, how many of each kind, how long the oldest has waited and how many have waited too long: never a name, an amount, a date or a word anybody wrote. It goes in the morning at half past seven in Lagos, or at once when many were passed on to the person together, never between eight in the evening and seven in the morning in Lagos. It counts as one of Groundwork's first messages of the day (so it is held when the person has had theirs, or said "Not now"), and when it cannot go on WhatsApp (STOP, no number, outside the 24 hours while this template is not approved) the same paragraph goes by email, never both.
- **Checked against WhatsApp's rules:** passes (changed on 7 October: the body used to end with a blank and had a colon). The blanks are in order, the body ends with words, and the longest expected message is about 400 characters.

### `groundwork_request_decided` (decision 82, item 1: the decision told to the person)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your request for {{2}} was {{3}} by {{4}}. Open Groundwork to read it.
- **Examples:** {{1}} Miriam. {{2}} leave from 20 to 22 October. {{3}} approved. {{4}} Wairimu.
- **Sample values:** {{1}} Miriam. {{2}} leave from 20 to 22 October. {{3}} approved. {{4}} Wairimu.
- **Why:** to tell the person what was decided, whether it was decided in the app or by a reply on WhatsApp. It is not counted as Groundwork writing first, because it answers the person's own request, the same as the report; it still never goes after STOP. Hours cannot be declined in Groundwork, so for hours {{3}} is only ever "approved". Wired on 2 October.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_request_decided_with_reason` (round 1 of the polish loop, 25 October 2026: the decision told with its reason)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your request for {{2}} was {{3}} by {{4}}. {{5}} Open Groundwork to read it.
- **Examples:** {{1}} Peter. {{2}} leave on Friday 23 October. {{3}} declined. {{4}} Grace. {{5}} Grace said, “We are two short that Friday.”
- **Sample values:** {{1}} Peter. {{2}} leave on Friday 23 October. {{3}} declined. {{4}} Grace. {{5}} Grace said, “We are two short that Friday.”
- **Why:** the same as `groundwork_request_decided`, with the reason the decider gave, approved or declined. Outside the 24 hours the old template had no place for it, so a decline reached the person on WhatsApp without the reason. Proposed to Hafsah; until it is approved it goes by email, as the other request messages do.
- **Checked against WhatsApp's rules:** passes (no blank at the start or end, no two blanks side by side, no line break, under 1,024 characters, utility).

### `groundwork_request_question` (decision 85, build step 7: a question about the person's own request). Proposed, not wired

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has a question about your request for {{3}}. Open Groundwork to read it and answer it. Your request is still waiting for {{2}} to decide.
- **Examples:** {{1}} Aisha. {{2}} Wairimu. {{3}} leave from 12 to 16 October.
- **Sample values:** {{1}} Aisha. {{2}} Wairimu. {{3}} leave from 12 to 16 October.
- **Why:** when whoever decides a leave request asks the person a question, the person is told. Inside the 24 hours the question itself goes as a plain message ("Hi Aisha, Wairimu has a question about your request for leave from Monday 12 October to Friday 16 October. Wairimu asked, “Who will cover the Project X milestone?” Open Groundwork to answer it. Your request is still waiting for Wairimu to decide."). Outside them, until this template is approved, the approved `groundwork_request_decided` goes instead with {{3}} as "asked about", which reads "Hi Aisha, your request for leave from Monday 12 October to Friday 16 October was asked about by Wairimu. Open Groundwork to read it." That is true but clumsy, so this template is proposed to replace it. The question's words are never in the template, because it can be long and may hold a line break. It answers the person's own request, so it is not counted as Groundwork writing first. Wiring it once approved is one line in `a-request-told-on-whatsapp.service.ts` and one in `whatsapp/a-message-outside-the-window.ts`.
- **Checked against WhatsApp's rules:** passes (no blank at the start or end, no line break, under 1,024 characters, utility).

**Changed later on 3 October, with no new template:** inside the 24 hours the question's message now ends "You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Wairimu to decide." in place of "Open Groundwork to answer it.", because a reply on WhatsApp now reaches the question: with a check-in open, Groundwork first asks "Is this your answer to Wairimu's question about your leave?" and sends it only on a yes. The proposed template above still says to open Groundwork, because outside the 24 hours the person has not read the question itself.

**Spending too, from 3 October (build step 9), with no new template:** whoever decides a request to spend can ask a question and give a reason with a decline, as for leave. The person reads, inside the 24 hours, "Hi Kamau, Fatuma has a question about your request for KES 12,000 for tyres for the van. Fatuma asked, “Is this for the Kisumu van or the Nairobi one?” You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Fatuma to decide.", and outside them the approved `groundwork_request_decided` with "asked about", as for leave. The proposed `groundwork_request_question` above would serve both, with {{3}} as "KES 12,000 for tyres for the van".

**Also changed on 3 October (decision 85, build step 7), with no new template:** a reason given with a decline is said inside the 24 hours after the `groundwork_request_decided` sentence ("... was declined by Wairimu. Wairimu said, “Sales is two short that week.” Open Groundwork to read it."); outside them the template goes as before and the reason is read in the app. When the person answers a question, whoever asked is told with `groundwork_request_waiting`; inside the 24 hours they read the answer itself ("Hi Wairimu, Aisha has answered your question about Aisha's leave from ... Aisha said, “Brian will cover it.” Reply here to approve or decline it, or open Groundwork to read it first."), and outside them the template's words stay true, because the request is still waiting for them.

### `groundwork_leave_told_to_hr` (decision 85, build step 8: HR told of leave). Proposed, not wired

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has {{3}}. You look after HR, so Groundwork tells you. Open Groundwork to read it on the leave board.
- **Examples:** {{1}} Joy. {{2}} Aisha Otieno. {{3}} sick leave from 6 to 9 October, approved by Wairimu.
- **Sample values:** {{1}} Joy. {{2}} Aisha Otieno. {{3}} sick leave from 6 to 9 October, approved by Wairimu.
- **Why:** when the admin chose to tell HR of each approved leave request, or of each request, whoever holds the HR duty reads it on the leave board today, and nothing goes to their phone, because no approved template says this truthfully (`groundwork_request_waiting` would ask them to approve it, which they cannot). With this approved, they would be told on WhatsApp too. It would count as Groundwork writing first.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_review_started` (item 16: a review waits for the person)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has started your review. Open Groundwork to read it and add your own view before you meet.
- **Examples:** {{1}} Aisha. {{2}} Wairimu.
- **Sample values:** {{1}} Aisha. {{2}} Wairimu.
- **Why:** to tell the person a review is about that the person who writes it with them has started it, so they can read it and add their own view before they meet, as the prototype says ("Aisha sees it before the meeting"). Nothing of the review is in it. It goes only to the person the review is about, only once somebody has said yes and started it, never for a review Groundwork only proposed. It counts as Groundwork writing first. Proposed by the engine on 2 October, for Hafsah to confirm.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_review_decided` (item 16: the person is told their review is decided)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has decided your review. Open Groundwork to read the decision and the reasons.
- **Examples:** {{1}} Aisha. {{2}} Wairimu.
- **Sample values:** {{1}} Aisha. {{2}} Wairimu.
- **Why:** to tell the person that the decision and its reasons are written and waiting in the app. The decision itself is never sent. It goes once, the first time the review is decided. It counts as Groundwork writing first. Proposed by the engine on 2 October, for Hafsah to confirm.
- **Checked against WhatsApp's rules:** passes.

### The three proposed for the appeal of a decided review: not to be used (decision 124, item 4)

`groundwork_review_appeal_waiting`, `groundwork_review_appeal_needs_admin` and `groundwork_review_appeal_decided` are withdrawn and must not be submitted to Meta. The appeal of a decided review is told by email and in the app only. Nothing is sent on WhatsApp for it, inside the 24 hours or outside them.

### `anchor_weekly_insight` (anchor piece 28; decision 105, item 2). The ninth, proposed

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}. {{2}} This week's picture is on the board at {{3}}, if you want the rest.
- **Examples:** {{1}} Amina. {{2}} Your team is starting to move. This week, three of five people checked in, and two have said what they will do themselves. Rukia committed to send the deck to the client, and Rukia says it is done. One thing still needs attention. Baraka is waiting on Rukia for the sales deck. Groundwork is working on that with them. {{3}} https://myground.work/grounds/g-1/board
- **Sample values:** {{1}} Amina. {{2}} Your team is starting to move. This week, three of five people checked in, and two have said what they will do themselves. Rukia committed to send the deck to the client, and Rukia says it is done. One thing still needs attention. Baraka is waiting on Rukia for the sales deck. Groundwork is working on that with them. {{3}} https://myground.work/grounds/g-1/board
- **Why:** the anchor lead's weekly insight. On Friday it goes at half past six in Lagos, before the daily summary, and it is the lead's one message of that day, so it replaces that day's summary. Only to the lead of a check-in started from the anchor link, only where the organisation has WhatsApp on, only while the anchor switch is on.
- **What {{2}} holds:** only what the lead reads on the month board. Counts, one thing a person in that check-in did, said as a sentence about them with their name, and one thing still in the way. Nobody's words are quoted, and nobody outside that check-in is named.
- **Checked against WhatsApp's rules:** the body ends with words, and the blanks are in order.

### `anchor_checkin_follow_up` (anchor piece 30; decision 105, item 3). Proposed, wired

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, last time you said you would {{2}}. I'd love to hear how it went. Your check-in for {{3}} is open, and you can answer here.
- **Examples:** {{1}} Rukia. {{2}} send your manager the deck. {{3}} Everyone pulling the same way.
- **Sample values:** {{1}} Rukia. {{2}} send your manager the deck. {{3}} Everyone pulling the same way.
- **Why:** the anchor's nudge, which may repeat the person's own commitment, to that person only (decision 105, item 3). On an anchor check-in with the anchor switch on, it takes the place of the morning chase (`checkin_team_almost_in` or `checkin_your_view_matters`) for a person who has an open promise from their own check-in. A person with none gets the ordinary chase. {{2}} is only ever their own open promise, said back to them, never anybody else's words and never a promise a lead wrote.
- **The same gates as every morning message:** only where the organisation has WhatsApp on, never to somebody on approved leave, never about a check-in kept off WhatsApp, never to a guest. The sender's own rules also apply: STOP, "Not now", one first message a day, the 24 hours, and the template being approved.
- **{{2}} made safe:** no new line, no tab, no run of more than four spaces, cut at a word to 120 characters, with no full stop at the end.
- **Checked against WhatsApp's rules:** text before the first blank and after the last, no two blanks side by side, blanks in order, and plain words.
- **Until Meta approves it:** outside the 24 hours it is recorded as not sent, like every other template.

### `groundwork_first_contact` (decision 106, item 2: the first message to a number). New: it must be submitted to Meta and approved before any first message can go

The first message Groundwork ever sends to a number names the organisation and adds "Not you? Reply STOP", so a number typed wrong reaches a stranger who is told who it is for and how to end it. "First" means nothing has ever been sent to that number and nothing has ever been received from it.

Whatever the first message is (an opening notice, an approval, a review, the daily summary, a report), it goes in this one template, carrying the words it was going to say. This was chosen so that none of Hafsah's eight changes, because changing them would mean resubmitting every one. Only this template is new. The second message to the same number is the ordinary one.

- **Category:** Utility
- **Language:** English
- **Body:** `This is Groundwork, writing for {{1}}. {{2}} Not you? Reply STOP.`
- **Blanks:** {{1}} is the organisation's name, for example "Kito Foods". {{2}} is the message it carries, on one line, for example "Hi Amani, your check-in for Sales team, Q4 is open. It takes about five minutes, and you can answer right here. Reply START to begin."
- **What Amani reads:** "This is Groundwork, writing for Kito Foods. Hi Amani, your check-in for Sales team, Q4 is open. It takes about five minutes, and you can answer right here. Reply START to begin. Not you? Reply STOP."
- **Until it is approved:** a first message is recorded as not sent, with the reason, and is never sent without the protection. Add `groundwork_first_contact` to `WHATSAPP_APPROVED_TEMPLATES` only once Meta shows it as Active.
- **Sample values:** {{1}} Kito Foods. {{2}} Hi Amani, your check-in for Sales team, Q4 is open. It takes about five minutes, and you can answer right here. Reply START to begin.
- **A note for submitting:** the template has two blanks and its fixed words at both ends, which Meta's rules ask for. Meta may still ask for a sample: use the one above.
- **If Meta refuses it for having too few fixed words:** Meta can refuse a template whose fixed words are short compared with its blanks, because the blanks then carry most of the message. This one has a long blank ({{2}} is a whole message), so that is possible. A longer fallback body is ready: "This is Groundwork, writing for {{1}} about your check-ins. {{2}} If this is not you, or you did not expect it, reply STOP and nothing more will be sent." It keeps the same two blanks in the same order, so nothing that fills them changes. **Where the code would change if Meta asks for it:** one line, the `groundwork_first_contact` entry (`TEMPLATES['first-contact']`) in `api/src/modules/whatsapp/a-message-outside-the-window.ts`, plus the sentence quoted in the header comment of `api/src/modules/whatsapp/the-first-message-to-a-number.ts` and the "What Amani reads" line above. The message that goes inside {{2}} is unchanged.

## Proposed for participant activation (8 October). Not submitted, not in the code

Hafsah's participant activation spec (`docs/participant-activation-spec.md`) asks for messages that Groundwork starts to a person who has never answered, and for ones that show a person that what they said was used. Where such a message would go outside the 24 hours, WhatsApp needs a template Meta has approved, and no new template is added without Hafsah. So, until she says yes, those messages go by email only, or not at all (see the section "Participant activation" in `docs/engagement-spec-status.md`). These two are written out so she can decide. Neither is in `a-message-outside-the-window.ts`, neither is in `THE_NAMES_TO_SUBMIT`, and nothing sends them.

### `groundwork_first_question` (proposed, not submitted). For someone who is on a check-in and has never answered

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} added you to {{3}} on Groundwork. What is one thing you are focused on this week? You can answer here, and it takes about two minutes.
- **Examples:** {{1}} Abigail. {{2}} Wairimu. {{3}} the operations team.
- **Sample values:** {{1}} Abigail. {{2}} Wairimu. {{3}} the operations team.
- **Why:** the spec's strategies C and F: give a reason to answer before asking for an update, and make the first answer very small. It would go once, to someone verified or reachable on WhatsApp who has had the opening notice and has still not started, on the same day the spec calls day 7. It would be the day's one routine message. Where it cannot go on WhatsApp, the same words go by email.
- **Checked against WhatsApp's rules:** the blanks are in order and none is next to another. The body starts with words and ends with words. It has three blanks and a fair amount of fixed text. The question may make Meta call it Marketing; if it does, the body to try is "Hi {{1}}, {{2}} added you to {{3}} on Groundwork, and your check-in is open. You can answer here, and it takes about two minutes."
- **Not said, on purpose:** the spec's example calls the space "private". The people in a check-in, including a manager, can read what a person says in it (CLAUDE.md, privacy), so the words do not say private.

### `groundwork_since_you_last_wrote` (proposed, not submitted). For someone who answered before and has gone quiet

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, last time you wrote about {{2}}. Has anything changed since then? Your check-in for {{3}} is open, and you can answer here.
- **Examples:** {{1}} Chidi. {{2}} supplier coordination taking longer than expected. {{3}} the sales team.
- **Sample values:** {{1}} Chidi. {{2}} supplier coordination taking longer than expected. {{3}} the sales team.
- **Why:** the spec's strategy G, a person's own contribution said back to them. It is close to `anchor_checkin_follow_up`, which says it for a promise the person made and is already in the code and widened to every check-in (decision 109 item 10). This would say it for something they raised that is not a promise. {{2}} would come only from the person's own record, as that one does, and never from anybody else's words. If Hafsah thinks the follow-up on a promise is enough, this one is not needed.
- **Checked against WhatsApp's rules:** the blanks are in order and none is next to another, and it starts and ends with words.

## Names no longer used

`groundwork_session_ready`, `groundwork_check_in_opened` and `groundwork_check_in_nudge` were names in the code before decision 83. `checkin_open` replaces the first two. The third was for a check-in started and left, and is not needed: Groundwork already finishes a started check-in after 12 hours of quiet. None of the three needs submitting.

## The four new templates of 19 October, for Abubakar to submit

Written 19 October 2026 (Hafsah's points 10 to 12), copied word for word from her note "WhatsApp template updates, for approval". None of them changes an approved template. In the code they are `THE_FOUR_OF_19_OCTOBER` in `api/src/modules/whatsapp/a-message-outside-the-window.ts`, each used only when its name is in `WHATSAPP_APPROVED_TEMPLATES`, only outside the 24 hours, and only when the message carries every blank. Until each is approved and listed, the message it replaces goes by email instead (`whatsapp/by-email-instead.ts`), one channel per opening and at most one routine message a day. `checkin_open` stays in use until `groundwork_checkin_open_v2` is approved and listed. Every WhatsApp message that failed in the messages test of 19 October is listed, with which of these covers it, in the messages test's own notes (`failed-whatsapp.md`, kept with the run, outside this repository).

### 1. groundwork_checkin_open_v2

- **Replaces:** `checkin_open` (which says "about five minutes"). Once this is approved, every new opening uses it.
- **Category:** Utility
- **Body:**
  Hi {{1}}, your check-in for {{2}} is open. It takes about ten minutes, and you can answer right here. Reply START to begin.
- **Variables:** {{1}} first name; {{2}} check-in name.
- **Sample values:** {{1}} = Mercy; {{2}} = Sales team, Q4

### 2. groundwork_checkin_thanks

- **Replaces:** the thank-you after a check-in (`report-thanks`), which fails outside 24 hours.
- **Category:** Utility
- **Body:**
  Thank you, {{1}}. Your answer for {{2}} is in. You will hear here when the team's report is ready to read.
- **Variables:** {{1}} first name; {{2}} check-in name.
- **Sample values:** {{1}} = Mercy; {{2}} = Sales team, Q4
- **Rule:** send it once per check-in, only straight after that person's own check-in. Never again for an earlier one.

### 3. groundwork_your_report_ready

- **Replaces:** the "your report is ready" message, which fails outside 24 hours.
- **Category:** Utility
- **Body:**
  Hi {{1}}, your own report for {{2}} is ready. It shows what you did, what is still open and what to do next. Open it here: {{3}} . Reply STOP to stop these messages.
- **Variables:** {{1}} first name; {{2}} check-in name; {{3}} link to their report.
- **Sample values:** {{1}} = Mercy; {{2}} = Sales team, Q4; {{3}} = https://myground.work/r/abc123

### 4. groundwork_promise_due

- **Replaces:** follow-ups on promises, which fail outside 24 hours.
- **Category:** Utility
- **Body:**
  Hi {{1}}, you said you would {{2}} by {{3}}. Reply DONE if it is done, or tell me what changed.
- **Variables:** {{1}} first name; {{2}} the promise, in the person's own words; {{3}} the day it was due.
- **Sample values:** {{1}} = Joseph; {{2}} = bring the samples for Tuskys Westgate; {{3}} = Thursday 15 October
- **Rules:**
  - Send it only for the person's own promise, never someone else's.
  - Never send it for a promise already said done, in any words.
  - It counts as that day's one routine message.

## The new template of 21 October, for Abubakar to submit

Written 21 October 2026, from Hafsah's answers of that day. It does not change an approved template: it is a new one. In the code it is `THE_ONE_OF_21_OCTOBER` in `api/src/modules/whatsapp/a-message-outside-the-window.ts`, wired the same way as the four of 19 October. It is used only when its name is in `WHATSAPP_APPROVED_TEMPLATES`, only outside the 24 hours, and only when the message carries every blank. Until it is approved and listed, `checkin_closes_soon` goes as it does today.

### 5. groundwork_checkin_closes_soon_v2

- **Replaces:** `checkin_closes_soon` (which says "Five minutes now"). Once this is approved and listed, it is used instead.
- **Category:** Utility
- **Body:**
  Hi {{1}}, your check-in for {{2}} closes at {{3}}. It takes about ten minutes, and you can answer right here.
- **Variables:** {{1}} first name; {{2}} check-in name; {{3}} closing time.
- **Sample values:** {{1}} = Mercy; {{2}} = Sales team, Q4; {{3}} = 6pm
- **Rule:** it counts as that day's one routine message.
- **For Abubakar:** once `groundwork_checkin_closes_soon_v2` is approved and listed, `checkin_closes_soon` stops being used. Leave it approved in Meta, but unused.

## The new template of 4 November, for Abubakar to submit

Written 4 November 2026, from Hafsah's answer of that day: a check-in takes "about ten minutes" (her fixed decision), and each approved template that says five minutes is replaced. `groundwork_checkin_open_v2` and `groundwork_checkin_closes_soon_v2` replace their five-minute versions. This one replaces the third. It does not change an approved template: it is a new one, wired the same way as the four of 19 October. It is used only when its name is in `WHATSAPP_APPROVED_TEMPLATES`, only outside the 24 hours, and only when the message carries every blank. Until it is approved and listed, `checkin_your_view_matters` goes as it does today.

### 6. groundwork_checkin_your_view_matters_v2

- **Replaces:** `checkin_your_view_matters` (which says "about five minutes"). Once this is approved and listed, it is used instead.
- **Category:** Utility
- **Body:**
  Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about ten minutes, and you can answer here.
- **Variables:** {{1}} first name; {{2}} check-in name; {{3}} the lead's first name.
- **Sample values:** {{1}} = Miriam; {{2}} = the sales team; {{3}} = Wairimu
- **Why:** the same sending rule as `checkin_your_view_matters`: on the lead's chase days, when fewer than half have checked in, and always for a check-in about one person.
- **If Meta refuses it as Utility** (the second sentence may be read as Marketing), submit this instead: "Hi {{1}}, your check-in for {{2}} is still waiting. It takes about ten minutes, and you can answer here."
- **For Abubakar:** once it is approved and listed, `checkin_your_view_matters` stops being used. Leave it approved in Meta, but unused. Wiring it in the code (`a-message-outside-the-window.ts`) is part of batch 1.

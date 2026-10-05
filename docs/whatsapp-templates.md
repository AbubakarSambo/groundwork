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
- **Why:** sent when each session opens, the first one included, on Groundwork's number or the organisation's own. "Start" (tapped, or START typed) begins the check-in. "Not now" stops Groundwork writing first that day.
- **Checked against WhatsApp's rules:** passes. The blanks are in order, there is text before the first and after the last, and the longest expected message is about 200 characters. One thing to know: WhatsApp itself treats START as "send me messages again" after STOP. Groundwork does the same for somebody who had said STOP, and for everybody else START begins the check-in.

### 2. `checkin_due_tomorrow`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} is due tomorrow, {{3}}. You can answer here whenever suits you before then.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} Thursday 8 October.
- **Why:** sent once, the morning before a check-in is due. A session has no closing hour: it stays open until it is answered or the whole check-in ends. Groundwork counts it as due when the next one would open, one step of its rhythm after it opened (a day, a week, two weeks or a month). A one-off check-in, or one that opens when the lead checks in, has no due day, so this is never sent for it.
- **Checked against WhatsApp's rules:** passes.

### 3. `checkin_opens_soon`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} opens in an hour, at {{3}}. Reply here when it opens and we'll begin.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} 4:00 pm.
- **Why:** sent once, about an hour before a session that opens at a set time.
- **Checked against WhatsApp's rules:** passes.

### 4. `checkin_closes_soon`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} 6:00 pm.
- **Why:** an hour before a check-in closes.
- **Not sent yet, and why.** Nothing in Groundwork closes at a set hour today: a session stays open until it is answered, and late answers are taken. So "closes in an hour" would not be true, and Groundwork does not send it. It can be sent once a check-in has a closing time (for example "each weekday at 6pm", as in the prototype). That needs a decision.
- **Checked against WhatsApp's rules:** the second sentence persuades ("Five minutes now means your view is part of this round"), so WhatsApp may class it as Marketing rather than Utility. Marketing costs more, and needs the person's agreement to receive marketing. **Proposal for Hafsah:** "Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. You can answer here before then."

### 5. `checkin_overdue`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} is overdue. It's still open, so you can answer here now.
- **Examples:** {{1}} Miriam. {{2}} the sales team.
- **Why:** sent once, the morning after a check-in passed its due day, and only while it really is still open.
- **Late answers:** checked. Groundwork does take late answers: a session that has not been answered stays open until it is answered or the whole check-in ends, and this is only sent while it is open. So the wording is true as written.
- **Checked against WhatsApp's rules:** passes.

### 6. `checkin_team_almost_in`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{3}} of {{4}} people have checked in for {{2}}, and the team's picture is coming together without your part. Add yours and it's included.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} 4. {{4}} 6.
- **Why:** sent on the lead's chase days, by the same rule as the email reminder, when at least half of the people who can answer have checked in. The count leaves out anyone not yet let in and anyone who only manages the check-in. Nothing anybody said is ever in it. It is never sent for a check-in about one person (a performance plan, a probation, a promotion or a renewal), because there is no team's picture there.
- **Checked against WhatsApp's rules:** two problems. First, the blanks appear in the order 1, 3, 4, 2, and WhatsApp expects them numbered in the order they appear, so it is likely to be refused. Second, "the team's picture is coming together without your part. Add yours" persuades, so it may be classed as Marketing. **Proposal for Hafsah:** "Hi {{1}}, {{2}} of {{3}} people have checked in for {{4}}. Your check-in is still open, and you can answer here." If Hafsah approves this, the wording and the order of its blanks change in one place in the code, `a-message-outside-the-window.ts`, and the call that fills them in `what-goes-to-a-phone.ts`.

### 7. `checkin_your_view_matters`

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about five minutes, and you can answer here.
- **Examples:** {{1}} Miriam. {{2}} the sales team. {{3}} Wairimu.
- **Why:** sent on the lead's chase days, by the same rule as the email reminder, when fewer than half have checked in, and always for a check-in about one person. {{3}} is the lead's first name.
- **Checked against WhatsApp's rules:** the blanks are in order and it fits. The second sentence explains why the person's answers matter, which WhatsApp may class as Marketing. **Proposal for Hafsah, if it is refused as Utility:** "Hi {{1}}, your check-in for {{2}} is still waiting. It takes about five minutes, and you can answer here."

### 8. `lead_daily_summary`

- **Category:** Utility. **Language:** en.
- **Body:** Good morning {{1}}. Here's today's summary of your check-ins: {{2}} Open the board for the full picture: {{3}}
- **Examples:** {{1}} Wairimu. {{2}} 5 of 6 people checked in yesterday, and Omar has not yet. One leave request is waiting for you. {{3}} https://myground.work/c/sales/board
- **Why:** the lead's one message of the day (decision 13). Anything else waiting for the lead that day, such as an approval or a reminder, goes inside {{2}} rather than as a separate message. Built on 2 October: it goes at seven in the morning in Lagos to each lead with a check-in open, and it counts as Groundwork writing first, so the morning reminders do not also write to that lead that day.
- **What {{2}} says:** one sentence for each of the lead's open check-ins, then one for what waits for them to decide. For example: "In "Sales team, Q3", 5 of 6 people have checked in, and Omar has not yet. Amina's leave from Monday 5 October to Friday 9 October is waiting for you to approve or decline." Nobody an admin has not let in yet, and nobody who only manages, is counted or named (decision 77). Nothing from a check-in the lead keeps in the app is in it, and a lead whose only open check-ins are kept in the app gets no summary. Nothing anybody said is ever in it. A lead on approved leave that day gets nothing. {{3}} is the board of the check-in when there is one, otherwise the list of check-ins.
- **How {{2}} is kept short:** it is one paragraph with no line breaks. When the lead has written to Groundwork in the last 24 hours, the full summary goes as an ordinary message. Otherwise the template goes, and if the words would make the whole message longer than 1,024 characters, Groundwork cuts the summary at a word and ends it with "…". The board has the rest.
- **Checked against WhatsApp's rules:** it ends with a blank ({{3}}), and WhatsApp refuses a template whose body starts or ends with a blank, so as written it will be refused. Inside the 24 hours this does not matter, because the same words go as an ordinary message with the link in them. Outside the 24 hours nothing goes until a version is approved, and Groundwork records it as not sent.
- **Proposal for Hafsah (not yet in the code, because the wording is yours to decide):** body: "Good morning {{1}}. Here's today's summary of your check-ins: {{2}} The board has the full picture." Then one button, of the kind "Visit website", with the text "Open the board" and the address https://myground.work/{{1}}, where Groundwork fills in the board's own path (for example grounds/g-sales/board). Examples to give Meta: {{1}} Wairimu. {{2}} In "Sales team, Q3", 5 of 6 people have checked in, and Omar has not yet. One leave request is waiting for you. Button {{1}} grounds/g-sales/board. With this, the body ends with words, the link is in the button, and the body has two blanks instead of three. If you approve it, the body changes in one place in the code (`a-message-outside-the-window.ts`), and the button's path is added where the summary is sent (`whatsapp/the-leads-daily-summary.ts`). Replying "not now" pauses it for the day, and "stop" stops it.

## Ours, proposed for Hafsah (hers do not cover these)

All three are now on the list the Connections page asks an admin to submit (`theNamesToSubmit`), so "every reminder approved" there means these three as well.

### `groundwork_report_ready`

- **Category:** Utility. **Language:** en.
- **Body:** Your report for {{1}} is ready. {{2}} Open Groundwork to read it.
- **Examples:** {{1}} the sales team. {{2}} You closed two deals this week and one is waiting on a signature.
- **Why:** the person's own report, sent to their phone when a session closes, if they finished in the app or more than 24 hours after they last wrote. {{2}} is one short line of where things stand. Inside the 24 hours the full report goes as an ordinary message. Never sent for a check-in kept in the app.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_request_waiting` (decision 82, item 1: an approval)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has asked for {{3}}, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.
- **Examples:** {{1}} Wairimu. {{2}} Miriam. {{3}} leave from 20 to 22 October.
- **Why:** to tell the approver a leave, hours or spending request is waiting, as soon as the person has confirmed it. {{3}} is the request in plain words: "leave from Monday 5 October to Friday 9 October", "approval of 6 hours on Atlas for Monday 5 October", or "KES 12,000 for fuel". It goes to the person's line manager when they approve, otherwise to every admin (the person named for spending over the limit gets it for that). It counts as Groundwork writing first, so if that person has already had their message for the day, it waits, and the lead's daily summary carries it the next morning. The approver replies "approve" or "decline" (for example "approve Amina's leave"), Groundwork says back what they are deciding ("You are approving Amina's leave from Monday 5 October to Friday 9 October. Is that right?"), and acts only on a yes. Wired on 2 October. **Since 3 October (decision 85, build step 4)** the same message also goes to whoever decides a later approval step (for example finance, after the manager approved), and to whoever a request is passed on to when it has waited too long or the approver is on leave. The words stay true in both cases ("Wairimu, Amina has asked for ..., and it is waiting for you"), so no new template is needed.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_request_decided` (decision 82, item 1: the decision told to the person)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, your request for {{2}} was {{3}} by {{4}}. Open Groundwork to read it.
- **Examples:** {{1}} Miriam. {{2}} leave from 20 to 22 October. {{3}} approved. {{4}} Wairimu.
- **Why:** to tell the person what was decided, whether it was decided in the app or by a reply on WhatsApp. It is not counted as Groundwork writing first, because it answers the person's own request, the same as the report; it still never goes after STOP. Hours cannot be declined in Groundwork, so for hours {{3}} is only ever "approved". Wired on 2 October.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_request_question` (decision 85, build step 7: a question about the person's own request). Proposed, not wired

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has a question about your request for {{3}}. Open Groundwork to read it and answer it. Your request is still waiting for {{2}} to decide.
- **Examples:** {{1}} Aisha. {{2}} Wairimu. {{3}} leave from 12 to 16 October.
- **Why:** when whoever decides a leave request asks the person a question, the person is told. Inside the 24 hours the question itself goes as a plain message ("Hi Aisha, Wairimu has a question about your request for leave from Monday 12 October to Friday 16 October. Wairimu asked, “Who will cover the Project X milestone?” Open Groundwork to answer it. Your request is still waiting for Wairimu to decide."). Outside them, until this template is approved, the approved `groundwork_request_decided` goes instead with {{3}} as "asked about", which reads "Hi Aisha, your request for leave from Monday 12 October to Friday 16 October was asked about by Wairimu. Open Groundwork to read it." That is true but clumsy, so this template is proposed to replace it. The question's words are never in the template, because it can be long and may hold a line break. It answers the person's own request, so it is not counted as Groundwork writing first. Wiring it once approved is one line in `a-request-told-on-whatsapp.service.ts` and one in `whatsapp/a-message-outside-the-window.ts`.
- **Checked against WhatsApp's rules:** passes (no blank at the start or end, no line break, under 1,024 characters, utility).

**Changed later on 3 October, with no new template:** inside the 24 hours the question's message now ends "You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Wairimu to decide." in place of "Open Groundwork to answer it.", because a reply on WhatsApp now reaches the question: with a check-in open, Groundwork first asks "Is this your answer to Wairimu's question about your leave?" and sends it only on a yes. The proposed template above still says to open Groundwork, because outside the 24 hours the person has not read the question itself.

**Spending too, from 3 October (build step 9), with no new template:** whoever decides a request to spend can ask a question and give a reason with a decline, as for leave. The person reads, inside the 24 hours, "Hi Kamau, Fatuma has a question about your request for KES 12,000 for tyres for the van. Fatuma asked, “Is this for the Kisumu van or the Nairobi one?” You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Fatuma to decide.", and outside them the approved `groundwork_request_decided` with "asked about", as for leave. The proposed `groundwork_request_question` above would serve both, with {{3}} as "KES 12,000 for tyres for the van".

**Also changed on 3 October (decision 85, build step 7), with no new template:** a reason given with a decline is said inside the 24 hours after the `groundwork_request_decided` sentence ("... was declined by Wairimu. Wairimu said, “Sales is two short that week.” Open Groundwork to read it."); outside them the template goes as before and the reason is read in the app. When the person answers a question, whoever asked is told with `groundwork_request_waiting`; inside the 24 hours they read the answer itself ("Hi Wairimu, Aisha has answered your question about Aisha's leave from ... Aisha said, “Brian will cover it.” Reply here to approve or decline it, or open Groundwork to read it first."), and outside them the template's words stay true, because the request is still waiting for them.

### `groundwork_leave_told_to_hr` (decision 85, build step 8: HR told of leave). Proposed, not wired

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has {{3}}. You look after HR, so Groundwork tells you. Open Groundwork to read it on the leave board.
- **Examples:** {{1}} Joy. {{2}} Aisha Otieno. {{3}} sick leave from 6 to 9 October, approved by Wairimu.
- **Why:** when the admin chose to tell HR of each approved leave request, or of each request, whoever holds the HR duty reads it on the leave board today, and nothing goes to their phone, because no approved template says this truthfully (`groundwork_request_waiting` would ask them to approve it, which they cannot). With this approved, they would be told on WhatsApp too. It would count as Groundwork writing first.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_review_started` (item 16: a review waits for the person)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has started your review. Open Groundwork to read it and add your own view before you meet.
- **Examples:** {{1}} Aisha. {{2}} Wairimu.
- **Why:** to tell the person a review is about that the person who writes it with them has started it, so they can read it and add their own view before they meet, as the prototype says ("Aisha sees it before the meeting"). Nothing of the review is in it. It goes only to the person the review is about, only once somebody has said yes and started it, never for a review Groundwork only proposed. It counts as Groundwork writing first. Proposed by the engine on 2 October, for Hafsah to confirm.
- **Checked against WhatsApp's rules:** passes.

### `groundwork_review_decided` (item 16: the person is told their review is decided)

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, {{2}} has decided your review. Open Groundwork to read the decision and the reasons.
- **Examples:** {{1}} Aisha. {{2}} Wairimu.
- **Why:** to tell the person that the decision and its reasons are written and waiting in the app. The decision itself is never sent. It goes once, the first time the review is decided. It counts as Groundwork writing first. Proposed by the engine on 2 October, for Hafsah to confirm.
- **Checked against WhatsApp's rules:** passes.

### `anchor_checkin_follow_up` (anchor piece 30; decision 105, item 3). Proposed, built, not sent

- **Category:** Utility. **Language:** en.
- **Body:** Hi {{1}}, last time you said you would {{2}}. I'd love to hear how it went. Your check-in for {{3}} is open, and you can answer here.
- **Examples:** {{1}} Rukia. {{2}} send your manager the deck. {{3}} Everyone pulling the same way.
- **Why:** the anchor's nudge, which may repeat the person's own commitment, to that person only (decision 105, item 3). {{2}} is only ever their own open promise from their own check-in, said back to them. Never anybody else's words, never a promise a lead wrote. Where they have no open promise, `checkin_your_view_matters` is used instead.
- **Not sent:** it is built in `conversation/the-anchor-nudge.ts` as a template's shape, and nothing sends it until it is approved and wired.

## Names no longer used

`groundwork_session_ready`, `groundwork_check_in_opened` and `groundwork_check_in_nudge` were names in the code before decision 83. `checkin_open` replaces the first two. The third was for a check-in started and left, and is not needed: Groundwork already finishes a started check-in after 12 hours of quiet. None of the three needs submitting.

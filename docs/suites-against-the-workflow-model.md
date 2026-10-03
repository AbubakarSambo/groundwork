# The suites against the workflow model of decision 85

Written on 3 October 2026 in the engine workspace (`wip/plain-reports`). This document compares leave, spending and payment requests, time sheets and performance reviews with the seven layers of decision 85. No code was changed to write it. Everything here was read from the code. The boards for leave, spending and time sheets were also served through their own services against the local test database (`gw_pw9_1786222102`), as an admin, a lead and a member, without writing anything.

Two things shape how this document judges privacy.

- Hafsah's standing rule of 3 October says that no privacy restriction may be added that is not in her own decisions or in the prototype. When the decisions and the prototype say nothing, the question goes to her, and the code does not restrict on its own. So a reader is called a leak only when the code sends them more than decision 85 allows. A restriction the code applies that no decision and no prototype screen asks for is marked "restriction chosen by Claude".
- Decision 86 (relayed by the coordinator on 3 October, and not yet written in `docs/decisions-merged.md`) reverses three earlier choices. The lead now sees a person's patterns after the person's answer or after the usual 3 or 7 days. The manager's suggestion now shows its counts. Admins, the chief executive included, now see the figures on each priority on the Company page, and the aims and limits on boards. So "counts in the manager's review briefing" and "patterns about one person" no longer wait for Hafsah.

The tables of who sees what from Hafsah's message of 3 October are not in the repository. Where this document needs them, it uses what decision 85 itself says, and anything those tables would have to settle is written as a question.

## Findings first

### Leaks

No reader is sent more than decision 85 allows. The code was checked at every place each of the four suites serves data (listed in section 4). Three places send a reader something decision 85 does not mention either way, so they are questions for Hafsah and not leaks.

1. **A lead who does not approve a request still reads it.** A lead reads every leave, spending and hours request from their own department, even when somebody else approves it. For leave that includes the person's days left. The test `the-leave-board-as-each-reader-reads-it.spec.ts` checks this on purpose ("Kamau ... reads Otieno’s request ... but does not decide Otieno’s"). Decision 85 says what the manager reads and says nothing about another lead in the same department. The product's general rule is that a lead reads their own department (`grounds/who-may-read-this-check-in.ts`), so this follows an existing rule. Should a lead who does not approve read the request?
2. **A lead who does not write a review reads all of it.** In `ReviewsService.one`, a lead of the same department reads the manager's words, the person's own view and the decision with its reasons, even when they do not write the review. Decision 85 says the person reads the record and the manager gets a separate briefing. It does not say whether another lead of the department reads the review. Should they?
3. **The person asking for leave is told which colleagues are off.** `sayBackLeave` in `leave-said-in-chat.ts` tells the person asking "Brian is also off then", by first name. The prototype's chat says "nobody else in Sales is off then", and its admin board names Brian. Decision 85 gives "who else in the team is away" to the manager. The board's own comment says "a colleague reads nothing of anybody else's leave", which this sentence does not follow. Should the person asking read colleagues' names, or only whether anybody else is off?

### Bugs found while reading

1. **An approver for large spending who cannot open the board can never decide.** The admin answers "Who approves anything above that?" with any person in the organisation (`the-ten-suites.ts`, question `above`). `SpendingService.board` refuses a member, and it leaves out of a lead's list anybody outside that lead's department. Today, Ask Groundwork and the WhatsApp reply "approve" all read what waits from the board (`what-waits-for-you-to-decide.ts`). So a member, or a lead from another department, named for large amounts is told on WhatsApp that a request waits for them, then finds nothing to approve, and the request waits for ever. Only an admin named there works.
2. **The review names the manager even when an admin writes it.** When the organisation answered "An admin" to "Who writes each review with the person?", `ReviewsService.mine` and `board` still give the person's line manager as the writer. The person then reads "Wairimu has started your review" when an admin started it.
3. **Two approval rules exist side by side.** Leave and time sheets follow the "one answer" of 1 October (`mayApproveFor`: the line manager, or an admin where there is none) and ignore the admin's answer "An admin". Reviews still follow the admin's answer through the older `mayApprove`. Spending has a third rule of its own (`SpendingService.approverOf`). This is the main thing a single workflow definition would remove.

### Restrictions chosen by Claude

These restrictions are in the code, but no decision of Hafsah's and no prototype screen asks for them. Each is a question for her, and none should be added to.

1. **The person never reads the manager's words in their own review.** `ForThePerson` in `the-reviews.service.ts` leaves out `managersWords`, and a test checks it ("Aisha reads ... not Wairimu’s words"). The prototype says Aisha's review will show "where she and Wairimu see things differently", and that "Aisha sees it before the meeting". Decision 6 says the person sees the facts and the decision with its reasons.
2. **An admin and a lead who does not write the review read nothing of "Groundwork suggests recognising".** Only the writer and the person read it (`a-review-may-suggest-recognising.ts`). Decision 5 says admins see every board and report.
3. **The writer reads the recognising suggestion with no number behind it.** That followed decision 53, which decision 86 has reversed. The manager's suggestion should now show its counts.
4. **Nothing of a review goes to the person's phone, only that it waits.** `a-review-told-on-whatsapp.service.ts` says "A review is kept in the app". Decision 83 keeps a check-in in the app only when the lead chose that. No decision says the same of reviews.
5. **A lead does not read what each client agreed on the time sheets board.** `TimeSheetsService.board` sends `agreements: null` to a lead. The prototype shows this to an admin and says nothing about a lead.
6. **The spending say-back gives what the team has waiting as one total and never whose.** This is in `SpendingService.checkForChat`. It is a sensible choice, but no decision asks for it.
7. **A proposed review is never told to the person.** `a-review-falls-due.ts` marks this "decided for Hafsah to confirm". This document could not find where she confirmed it.

## 1. Each suite, layer by layer

"Built" means it works end to end today. "Partly built" means some of it works. "Missing" means nothing of it exists.

### Leave

| Layer | What decision 85 asks | What exists today | State |
| --- | --- | --- | --- |
| 1. Trigger | The person says it in their own words, in a check-in, in chat or on WhatsApp. | Days said in Ask Groundwork are read by rules in `leave-said-in-chat.ts` (`soundsLikeLeave`, `readLeaveDates`, `plainlyAsksForLeave`), and `AssistantService` says them back and parks them (`proposeLeave`, `resolveParkedLeave`). Days said in a check-in's setup conversation go the same way (`GroundsService`, near "LEAVE DATES GO TO THE LEAVE SUITE"). On WhatsApp during an open check-in, `looksLikeARequest` and `shallITreatThisAs` in `public-api/a-whatsapp-message-is-routed.ts` ask "Shall I treat this as a leave request?", and the answer goes to Ask Groundwork. There is no form and no route that creates a request (`LeaveBoardService.ask` has no route). | Built |
| 2. Who may request | Set by the rules, with eligibility. | Anybody in the organisation who is not a guest (`LeaveBoardService.ask`). There are no eligibility rules, for example for people still on probation. | Partly built |
| 3. Information or evidence | Types, balances, notice, blackout periods, documents where needed. | First day, last day and an optional stand-in (`LeaveRequest`). The chat path never asks for a stand-in. There is one kind, "annual", and one yearly number of days for everybody (`answers.days`). Working days are counted Monday to Friday, with no public holidays (`workingDays`). There are no other types, no balance for each type, no notice rule, no blackout periods and no documents. No reason is kept, following decision 31. | Partly built |
| 4. Who reviews and who decides | Approvers by rule, with escalation, for example to the department head after two working days without an answer. The manager approves, declines or asks a question. | One rule for everybody, the person's line manager in the staff directory, or any admin where there is none (`whoApprovesFor`, `mayApproveFor` in `who-approves.ts`). Nobody approves their own. Approve and decline work from the board (`POST /suites/leave/requests/:id/approve` and `decline`), from Ask Groundwork and from a WhatsApp reply (`proposeADecision`, `resolveParkedDecision` in `assistant.service.ts`), and all three go through `LeaveBoardService.decide`. There is no escalation, nothing for an approver who is away, no "ask a question" action and no reason for a decline. | Partly built |
| 5. Who sees what | The manager reads the days, the balance, who else in the team is away, and what the person owns that falls in those days. | The manager reads the days, the working days, the days left and who else in the department is off (`LeaveBoardService.board`). What the person owns in those days is missing. An admin reads everything. A lead reads their department's requests even when they do not approve them (question 1 above). The person reads only their own (`GET /suites/leave/mine`). A member is refused the board. Everything is decided on the server. | Partly built |
| 6. After the decision | The person is told. The record and the team's availability update. Groundwork knows the person is away. | The person is told on WhatsApp (`LeaveBoardService.tellThePerson` through `ARequestToldOnWhatsApp.decided`) and reads it under their own leave. The board's "Who's off" updates. Approved leave reaches the engine as dates only through `who-is-away.ts`: round counts, reminders, the daily summary, patterns, the weekly report and the board all read it (`whoIsAwayOn`, `leaveOfThePeopleOn`, `theirApprovedLeave`). HR is not told. Nothing reaches a calendar. | Partly built (calendar waits for Hafsah) |
| 7. Record and audit | Who did what, when, on what information. | `LeaveRequest` keeps `askedAt`, `decidedById` and `decidedAt`. What the approver was shown (the days left, who else was off) is not kept, and nothing records being told or a change of the suite's answers. | Partly built |

### Spending and payment requests

| Layer | What decision 85 asks | What exists today | State |
| --- | --- | --- | --- |
| 1. Trigger | The person tells Groundwork. Groundwork asks only for what is missing. | "Can I spend KES 18,000 on fuel" is read by rules in `spend-said-in-chat.ts` (`soundsLikeSpending`, `readSpending`). When the amount, the currency or what it is for is missing, only that is asked. `SpendingService.checkForChat` gives the team's budget left, what is already waiting and who approves, and `spendingSaidBack` says it back before the yes. WhatsApp asks "Shall I treat this as a spending request?" during a check-in. | Built |
| 2. Who may request | Set by the rules. | Anybody in the organisation who is not a guest (`SpendingService.ask`). | Partly built |
| 3. Information or evidence | Categories, evidence such as a receipt, thresholds by amount. | The amount, what it is for in the person's words, and the team, taken from the staff directory's department. One currency for the organisation. No categories and no evidence. | Partly built |
| 4. Who reviews and who decides | Thresholds by amount with approvers by rule, for example up to a limit the manager and then finance, above it the budget owner or department head, above a higher one the chief executive. Payment authority. | One limit (`answers.limit`). Up to it, the line manager or an admin decides alone. Above it, the one person the admin named (`answers.above`), which names a person, not a rule. There is one step only, no second approver such as finance, no second threshold and no escalation. If the named person is not an admin, they can never decide (bug 1). | Partly built |
| 5. Who sees what | The manager reads the request and the budget it draws on, never the person's whole financial history. Finance sees only the financial information it is allowed. | The manager reads the request, their team's budget this month and what is left (`SpendingService.board`). No history is served. An admin reads every team. The person reads their team's budget left and the total already waiting, never whose (`checkForChat`). There is no finance role, so nobody can be given only the financial side. A lead reads their department's requests even when they do not approve them (question 1). | Partly built |
| 6. After the decision | Finance verifies, codes, exports approved payments (CSV or Excel) and marks them paid. | The person is told on WhatsApp (`SpendingService.tellThePerson`). An approved amount counts against the team's budget this month. There is no verifying, no coding, no export and no "paid". The status is only waiting, approved or declined. | Missing after approval (the payment-system connection waits for Hafsah) |
| 7. Record and audit | Who did what, when, on what information. | `SpendRequest` keeps `createdAt`, `decidedById` and `decidedAt`. `TeamBudget` keeps `setById`. What the approver was shown (the budget left at that moment) is not kept. | Partly built |

Groundwork's own back office has spending too (`OpsExpense`), but it is Groundwork's own books, with no organisation on a row, so `the-spending.service.ts` rightly does not reuse it.

### Time sheets

| Layer | What decision 85 asks | What exists today | State |
| --- | --- | --- | --- |
| 1. Trigger | Groundwork drafts the week from work already on record, and the person confirms it. | The person says their hours ("I spent 3 hours at Naivas today"). `hours-said-in-chat.ts` reads them by rules and they are said back and written only on a yes (`proposeHours` in `assistant.service.ts`, then `TimeSheetsService.record`). Nothing drafts a week from the record. | Partly built |
| 2. Who may request | Who submits, and how often. | Anybody in the organisation who is not a guest. Weekly, fixed. | Partly built |
| 3. Information or evidence | Projects, required hours, cut-off, billable or not. | The clients and projects the admin listed (`answers.clients`), a day, and the hours. What each client agreed is kept in `TimeAgreement`. There are no required hours, no cut-off and no billable flag. | Partly built |
| 4. Who reviews and who decides | The approver, by rule. | The line manager or an admin (`mayApproveFor`), one person's week at a time (`POST /suites/time/weeks/:weekOf/people/:personId/approve`). A week is approved with the total the approver saw, and hours added later make it wait again. Hours cannot be declined. There is no escalation. | Partly built |
| 5. Who sees what | The manager reads the hours against the planned work and what was delivered. | The manager reads their team's hours by client, week by week (`TimeSheetsService.board`). The planned work and what was delivered are not beside them. An admin also reads hours against what each client agreed. The person reads only their own (`GET /suites/time/mine`). Hours never reach a check-in, a report, a signal or a review, following decision 10, and a test scans the code for it. | Partly built |
| 6. After the decision | Ready for billing. | The person is told on WhatsApp (`TimeSheetsService.tellThePerson`). The admin reads hours against each client's agreement. There is no export for billing. | Partly built |
| 7. Record and audit | Who did what, when, on what information. | `TimeWeek` keeps `approvedById`, `approvedAt` and `approvedMinutes`, which is the total the approver saw. Each `TimeEntry` keeps `createdAt`. | Built for approval; nothing else is recorded |

Decision 85 asks that the manager reads hours "against the planned work and what was delivered", and that the week is drafted from work on record. Decision 10 says hours are for billing only and never evidence about how well someone works. Reading the record into the time sheet may be allowed, but putting hours beside what was delivered is close to measuring work. This is a question for Hafsah before that part is built.

### Performance reviews

| Layer | What decision 85 asks | What exists today | State |
| --- | --- | --- | --- |
| 1. Trigger | Set by the rules. | A review falls due in `EvaluationDue` from three places: the organisation's own system, the end of a check-in about one person who carries on (`ReviewsProposedService.whenACheckInEnds`), and the date the organisation set, checked once a day (`ReviewsProposedCron`). The last two are only proposals, and only the writer's "Start it" begins a review (`POST /suites/reviews/due/:dueId/start`). A review cannot start while a check-in that decides something about the person is still open (`where-a-review-stands.ts`). | Built |
| 2. Who may request | Set by the rules. | Nobody requests a review. The writer starts it, by the admin's answer "Their manager" or "An admin" (`answers.writer`, through the older `mayApprove`). | Partly built |
| 3. Information or evidence | An interpretation of the record. The person reads what Groundwork understands they worked on, committed to, changed, completed, delayed and were blocked by. | "What Groundwork noticed" is written once, when the review starts (`whatGroundworkNoticed` in `the-review-noticed-from-the-record.ts`). It holds only how up to six ended check-ins were decided, by whom and why. Nothing reads what the person worked on, committed to, completed, delayed or was blocked by. "Groundwork suggests recognising" reads the commitments kept in the writer's own check-ins over four weeks, behind a setting that is off (`a-review-may-suggest-recognising.ts`). | Partly built |
| 4. Who reviews and who decides | The manager decides. Groundwork gives evidence and patterns and never makes the employment decision. | The writer writes their own words (`PUT /suites/reviews/:id/words`) and decides, with reasons that are required (`POST /suites/reviews/:id/decision`). Groundwork never decides. The suggestion of decision 6 reaches the writer only (`SuggestionsService.latestForTheLeadAbout`). Patterns are not given. | Partly built |
| 5. Who sees what | The person reads the record and corrects it. The manager gets a separate briefing. | The person reads the noticed lines, their own view and the decision with its reasons, and writes their own view (`PUT /suites/reviews/:id/view`). They cannot correct a noticed line. The writer reads everything, with the suggestion. There is no separate briefing. An admin and a lead of the department read the review without writing it (question 2). A noticed line from an evaluation check-in is kept from an admin without access to it (decisions 5 and 58). | Partly built |
| 6. After the decision | Not said beyond the decision being the manager's. | The person is told on WhatsApp that the review was started and then decided, and nothing more goes to the phone (`AReviewToldOnWhatsApp`). The decision and reasons are stored. Nothing follows from the decision. | Partly built |
| 7. Record and audit | Who did what, when, on what information. | `PerformanceReview` keeps who started it and when, who wrote the manager's words and when, when the person wrote their view, who decided and when, and the noticed lines exactly as the writer saw them. `noticedPromptVersionId` exists but nothing writes it, because no model writes these lines yet. | Built for what exists |

## 2. The shared parts

### One engine or four services

There are four separate services, `LeaveBoardService`, `SpendingService`, `TimeSheetsService` and `ReviewsService`, each with its own table, its own `board`, its own `decide` or `approve`, its own refusal sentences and its own copy of `roleOf` and the staff directory read. They share these parts.

- `who-approves.ts`, whose `whoApprovesFor` and `mayApproveFor` give one approver for leave, hours and spending below the limit. Reviews still use the older `mayApprove`, and spending above the limit uses its own `approverOf`.
- `a-leads-team.ts` (`inTheLeadsTeam`), the rule for which people a lead reads.
- `a-roster-entry-and-its-sign-in.ts`, which matches a directory entry to a sign-in by link or by address (decision 82, item 6).
- `a-request-in-words.ts`, the one wording of a request for every reader, the say-back of a decision and the reply "approve" or "decline".
- `a-request-told-on-whatsapp.service.ts`, which tells the approver and then the person through the one WhatsApp sender.
- `what-waits-for-you-to-decide.ts`, which gathers what waits for one approver from the three boards, for Ask Groundwork, WhatsApp and the lead's daily summary. Today does the same in `grounds/what-needs-you.service.ts` and `grounds/waiting-for-you-to-approve.ts`.
- The parked proposal in Ask Groundwork (`AssistantProposal`), which holds every say-back until the yes.
- `OrganizationSuite.answers`, where each suite's rules are kept.

So the approval path is already single in one sense: the board, Ask Groundwork and WhatsApp all decide through the same service method, which checks again who may decide. What is not single is the rule for who decides, and there is no shared request record, state or audit.

### Where rules are stored for each organisation today

- `OrganizationSuite.answers` (Json), one row for each organisation and suite, written only by an admin through `SuitesService.switch`, checked against the suite's questions by `checkAnswers` in `the-ten-suites.ts`. It keeps `changedById` and `changedAt`, but each change overwrites the last, so there is no history.
- `TeamBudget`, one budget for each team and month. `TimeAgreement`, what each client agreed.
- `Organization.whoMayOpenCheckIns`, an organisation's rule for who may open a check-in.
- `OrganizationMemory`, rules a lead said in a check-in's setup and then kept, offered and kept with `keptById`. These are sentences used as context, not rules the product runs.
- `PlatformSetting` is for the whole platform, not for one organisation. `OpsSetting` is Groundwork's own back office.
- `who-approves.ts` stores nothing. It reads the staff directory (`Person.managerExternalId`) and the membership role each time.

There is no role for HR, finance, a budget owner or a department head. The roles are admin, lead, member and guest (`UserRole`), and `Person.department` and `Person.title` are free text.

### What a single workflow definition could look like

Built on what exists, with no second approval path:

1. **The definition stays in `OrganizationSuite.answers`**, grown from today's few answers into a full definition for each suite: who may ask, what is needed, the steps of approval, escalation, who sees what, and what happens after. `checkAnswers` becomes the check of a definition, and today's answers read as a definition with one step, so nothing already switched on changes. Each change is also kept as a new row of history, so an earlier definition can be read later.
2. **Approvers are named by rule.** The rules are "the requester's manager", "the department head", "the budget owner", "finance", "HR", "the chief executive" and "an admin". The organisation says once who holds each duty (finance is Grace, the Sales budget is Wairimu's), in one small table of duties for each organisation. A workflow names the duty and never the person, so it survives people changing jobs. One resolver, grown from `whoApprovesFor`, turns a rule and a request into the people who may decide, and replaces `mayApprove`, `mayApproveFor` and `SpendingService.approverOf`.
3. **One decision path.** Each service's `decide` asks the resolver which step the request is at and whether this reader may decide it, and moves the request to the next step or to its end. The board, Ask Groundwork, WhatsApp and Today keep calling the same method they call now. A board shows a request to everybody the resolver names, which also fixes bug 1.
4. **One record of events** for all four suites: the kind and id of the request, who did what (asked, was told, approved, declined, asked a question, was escalated to, verified, exported, marked paid, changed the definition), when, and a copy of what that person was shown. The four request tables stay as they are.
5. **Who sees what** is one table in code for each suite, by record, field and action, which every serving read applies on the server, with a test that serves each reader.

## 3. Conversational setup ("Set up our employee leave process")

What exists that could carry it:

- **The suites' first questions** in `the-ten-suites.ts` are already the list of what must be known before a suite runs. Groundwork can ask only the ones the admin's description did not answer.
- **The parked proposal in Ask Groundwork** (`AssistantProposal`, resolved in `AssistantService.resolveParked`) already holds a say-back until the yes. Every leave, hours, spending and decision request uses it.
- **The role interview** (`assistant/the-role-interview.ts`, `suites/the-role-interview.service.ts`) is the closest model. It asks several questions one at a time in Ask Groundwork, says them all back in fixed sentences, and writes only on a yes (`ROLE_INTERVIEW_KIND`, `ROLE_INTERVIEW_CONFIRM_KIND`).
- **Organisation memory** (`knowledge/organisation-memory.ts`) already offers a sentence and keeps it only on a yes, with who kept it.
- **`SuitesService.switch`** already checks that only an admin may switch a suite on, and refuses until every question is answered. The setup's final yes would call it, so there is no second way to switch a suite on.

What stands in the way: `assistant/what-is-not-offered-in-chat.ts` lists the suites as "the chat is the wrong shape", saying switching a suite "is not done by typing a sentence", and a guard test (`everything-is-offered-or-explained.spec.ts`) keeps that list honest. Both must change with decision 85. There is no admin first-run in Ask Groundwork that sets anything up. The opening line for anybody with nothing waiting is the fixed "Ask me about your objectives or what you owe this period" (`what-is-worth-saying-when-you-arrive.ts`). Sign-up's guided setup comes before Ask Groundwork exists for that person.

Because the conversation stays model-led, the model can read the admin's description into the definition's fields and ask the next missing question. The product, not the model, writes the say-back in plain words from the stored definition, and only the admin's yes writes it, as with every other change made by talking (decision 12).

## 4. Who sees what, as served today

Every place each suite serves data was read. The readers are the person, the manager (the approver or writer), HR, finance, the chief executive and other people. There is no HR, finance or chief executive role, so each of those is an admin today, and an admin reads all of the suites (decision 5 says admins see every board).

### Every place the four suites serve data

| Where | Route or caller | Who is served |
| --- | --- | --- |
| `LeaveBoardService.board` | `GET /suites/leave/board`, Today (`toApprove`), Ask Groundwork and the daily summary (`whatWaitsForYouToDecide`) | Admin, lead |
| `LeaveBoardService.mine` | `GET /suites/leave/mine`, the leave say-back | The person |
| `sayBackLeave`, `sendLeave` | Ask Groundwork, the setup conversation | The person |
| `who-is-away.ts` | The board, reports, Today, reminders, round counts, patterns, the daily summary, email | Dates only, by reader (`theAwayLine`) |
| `SpendingService.board` | `GET /suites/spend/board`, Today, Ask Groundwork, the daily summary | Admin, lead |
| `SpendingService.check`, `checkForChat` | The spending say-back | The person |
| `TimeSheetsService.board` | `GET /suites/time/board`, Today, Ask Groundwork, the daily summary | Admin, lead |
| `TimeSheetsService.mine`, `forChat` | `GET /suites/time/mine`, the hours say-back | The person |
| `ReviewsService.board` | `GET /suites/reviews/board`, Today (`reviewsToStartOnToday`) | Admin, lead |
| `ReviewsService.mine` | `GET /suites/reviews/mine`, Today (`yourReviewsOnToday`) | The person |
| `ReviewsService.one` | `GET /suites/reviews/:id` | The person, the writer, a lead of the department, an admin |
| `ARequestToldOnWhatsApp` | When a request is made and when it is decided | The approver, then the person |
| `AReviewToldOnWhatsApp` | When a review is started and decided | The person only |
| `SuitesService.forReader` | `GET /suites` | An admin reads the answers; a lead reads only which suites are on |

Served as each reader against the test database, the organisation "Baridi Foods" with Grace (admin), Wairimu (lead of Sales) and Amani (member of Sales) gave this. Grace's spending board has the Sales budget, the only one set, and the list of every team. Wairimu's has only Sales and no list of teams. Wairimu's time sheets board has `agreements: null`. Amani is refused all three boards, reads her own leave with 17 days left, and her spending check returns "Sales", 26,000 left, nothing waiting, and "Wairimu" as the approver. No request was waiting in that database, so the lists of what is waiting were checked from the code and the specs.

### Each reader against what they are sent

| Suite | Reader | What they are sent today | Against decision 85 |
| --- | --- | --- | --- |
| Leave | The person | Their own requests, the days, the status, the stand-in and their days left. In the say-back, the first names of colleagues in their department who are off on those days. | Within it, except the colleagues' names (question 3). |
| Leave | The manager | Each waiting request in the team with the name, days, working days, days left, department, who else in the department is off, and the stand-in. Everybody in the team off in the next two weeks. | Within it. What the person owns in those days is missing. |
| Leave | Another lead of the department | The same as the manager, without the right to decide. | Question 1. |
| Leave | Admin (HR, finance, chief executive) | Every request and everybody off. | Decision 5 allows it. Finance cannot be given less, because no finance role exists. |
| Leave | Colleagues | Nothing from the suite. Where a board already names a person to them, a line "Yemi is away until Friday 2 October" (`theAwayLine`). | Within it. |
| Spending | The person | Their team's budget left this month, the total already waiting with no names, the limit, and the approver's first name. They do not read their own requests back. | Within it. Reading their own requests is missing. |
| Spending | The manager | Each waiting request in the team with the name, amount, what it is for, the team, the budget left, whether it is over the limit, and who approves. The team's budget this month. | Within it. No history is sent. |
| Spending | Another lead of the department | The same, without the right to decide. | Question 1. |
| Spending | Admin | Every request and every team's budget. | Decision 5 allows it. |
| Spending | Colleagues | Nothing. | Within it. |
| Time sheets | The person | Their own hours by client, week by week, and whether each week is approved. | Within it. |
| Time sheets | The manager | The team's hours by client for each week still waiting and this week. Not what clients agreed. | Within it. The planned work is missing. Not reading the agreements is restriction 5. |
| Time sheets | Another lead of the department | The same, without the right to approve. | Question 1. |
| Time sheets | Admin | Everybody's hours and the hours against what each client agreed. | Decision 5 allows it. |
| Time sheets | Colleagues | Nothing. Hours never reach a check-in, report, signal or review. | Within it, and decision 10. |
| Reviews | The person | Once started, the noticed lines, their own view, the decision and reasons, and, with the setting on, their own count of commitments kept. Not the manager's words. | Within it. Not reading the manager's words is restriction 1. |
| Reviews | The writer | Everything, including private noticed lines, the suggestion from a check-in they run, and "Groundwork suggests recognising" with no number. | Within it. No number is restriction 3, now reversed by decision 86. |
| Reviews | Another lead of the department | The review without private noticed lines, the suggestion or the recognising line. | Question 2. |
| Reviews | Admin | The same as another lead. | Decision 5 allows it. Not reading the recognising line is restriction 2. |
| Reviews | Colleagues | Refused. | Within it. |

## 5. What to build, in order

Each part is small enough for one builder. The order follows `docs/weekly-plan.md` (d2). Hafsah's answers to questions 1 to 3 and the restrictions above come before part 5.

1. **Fix the approver who cannot decide (bug 1), and the review that names the wrong writer (bug 2).** A board lists a request to anybody `mayDecide` says may decide it, whatever their department, and a member named for large spending is served the requests they decide. The review names whoever the organisation's answer makes the writer. Files: `the-spending.service.ts`, `the-reviews.service.ts`, `what-waits-for-you-to-decide.ts`, `grounds/what-needs-you.service.ts`, and their reader specs.
2. **Duties for each organisation.** A small table that says who holds each duty (finance, HR, the chief executive, the head of each department, the owner of each team's budget), set by an admin. Files: `prisma/schema.prisma` and a migration, a new `suites/who-holds-each-duty.ts`, `suites.controller.ts`, `suites.service.ts`.
3. **One resolver of approvers by rule.** It replaces `mayApprove`, `mayApproveFor` and `SpendingService.approverOf` with one function that turns a rule ("the requester's manager", "finance", "the budget owner") into the people who may decide, and today's answers read as one-step rules, so nothing switched on changes. Spending's "Who approves anything above that?" becomes a rule. Files: `who-approves.ts`, `the-ten-suites.ts`, the four suite services, `spend-said-in-chat.ts`, `leave-said-in-chat.ts`, and the specs.
4. **Steps and escalation.** A request can pass through more than one approver (for spending, the manager and then finance), and a request with no answer after the set number of working days, or whose approver is on approved leave, moves to the next rule, told on WhatsApp and on Today. The check runs once a day across every copy of the server (`onceAcrossCopies`). Files: the four request tables in `schema.prisma` (a step), a new `suites/a-request-waits-too-long.cron.ts`, `who-approves.ts`, `a-request-told-on-whatsapp.service.ts`, `whatsapp/what-goes-to-a-phone.ts`, `docs/whatsapp-templates.md`.
5. **One record of events.** Each ask, telling, decision, question, escalation and change of a suite's rules is written with who, when and a copy of what that person was shown, and each change of `OrganizationSuite.answers` is kept as history. Files: `schema.prisma` and a migration, a new `suites/a-request-is-recorded.ts`, the four services, `suites.service.ts`.
6. **Who sees what, by record, field and action.** One table in code for each suite, applied by every serving read in section 4, with a spec that serves each reader. It writes down Hafsah's answers to questions 1 to 3 and to the restrictions chosen by Claude, and adds no restriction of its own. Files: a new `suites/who-sees-what.ts`, the four services, the reader specs.
7. **Leave, the manager's view.** What the person owns that falls in those days (commitments and to-dos due then, from records the manager may already read), an "ask a question" action that the person answers in Ask Groundwork, and a reason with a decline. Files: `the-leave-board.service.ts`, `suites.controller.ts`, `a-request-in-words.ts`, `assistant/assistant.service.ts`, `schema.prisma`.
8. **Leave, the rules.** Types of leave with a balance for each, notice, blackout periods, eligibility, documents where needed, and HR told. Files: `the-ten-suites.ts`, `the-leave-board.service.ts`, `leave-said-in-chat.ts`, `schema.prisma`.
9. **Spending, the rules.** Categories, evidence such as a receipt, and more than one threshold, each with its rule. Files: `the-ten-suites.ts`, `the-spending.service.ts`, `spend-said-in-chat.ts`, `schema.prisma`.
10. **Spending, finance's part.** Finance verifies, codes, exports approved payments as CSV or Excel and marks them paid, reading only the financial fields, and the person can read their own requests. Files: `the-spending.service.ts`, `suites.controller.ts`, `schema.prisma`.
11. **Time sheets, the rules.** Required hours, a cut-off, billable or not, and an export for billing. Files: `the-ten-suites.ts`, `the-time-sheets.service.ts`, `hours-said-in-chat.ts`, `schema.prisma`.
12. **Reviews, the record interpreted.** "What Groundwork noticed" grows to what the person worked on, committed to, changed, completed, delayed and was blocked by, with counts (allowed by decision 86), and the person can correct each line, with the correction kept beside the line. Files: `the-review-noticed-from-the-record.ts`, `the-reviews.service.ts`, `suites.controller.ts`, `schema.prisma`. If a model words any of it, it goes through `PromptVersion` and writes `noticedPromptVersionId`.
13. **Reviews, the manager's briefing.** A separate briefing for the writer, with counts and the person's patterns once the person has answered or after the usual 3 or 7 days (decision 86), and "Groundwork suggests recognising" with its counts. Files: `a-review-may-suggest-recognising.ts`, `the-reviews.service.ts`, `the-reviews-as-each-reader-reads-them.spec.ts`.
14. **Setting a suite up by talking.** An admin says "Set up our employee leave process" in Ask Groundwork. Groundwork asks only what is missing, says the workflow back in plain words, and on the admin's yes calls `SuitesService.switch`. Files: `assistant/the-router-is-deterministic.ts`, `assistant/assistant.service.ts`, a new `suites/a-workflow-said-back.ts`, `the-ten-suites.ts`, `assistant/what-is-not-offered-in-chat.ts` and its guard spec.

### Waiting for Hafsah

- **The chief executive seeing authorised individual records** (decision 73). Decision 86 settles part of it (figures on priorities and aims and limits on boards), but not individual leave, spending, hours or reviews.
- **Calendar updates after leave is approved.** This needs a calendar connection, which is not built.
- **Payment-system updates after spending is approved,** beyond the export in part 10. This needs a connection to an accounting or payment system, which is not built.
- **Time sheets drafted from the record and read against what was delivered** (part 11 and the time sheets trigger), against decision 10.
- **Questions 1 to 3 and restrictions 1 to 7** at the top of this document.
- **Who holds HR, finance and the budget,** since no such role exists. Part 2 proposes duties for each organisation instead of new roles.

Counts in the manager's review briefing and patterns about one person no longer wait, because decision 86 allows both.

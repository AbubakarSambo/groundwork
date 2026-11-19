# What Groundwork does

This is everything Groundwork does today, worked out from its code. "Background" means it runs on a schedule and nobody opens it.

## 1. Getting started

| Use case | Who | Where |
|---|---|---|
| Anyone can start a check-in without signing up. They describe the situation in a chat, Groundwork suggests a situation and sets it up by talking, and they become the admin of their own organisation. | Anyone | web |
| In the setup chat, Groundwork works out what the lead wants, answers common questions, picks people out of a pasted list, writes a setup summary and creates the check-in. | Lead | web |
| A lead can browse every situation instead of describing one. | Lead | web |
| A lead can ask the team one thing, with one line, a list of emails and a rhythm. | Lead | web |
| An unfinished setup is kept and opens on another device. | Lead | web |
| A shared link opens "Help your team understand and move with you", for up to 20 people for a month. | Lead | web |
| The old setup wizard sends people to the new start page. | Lead | web |
| People sign up or sign in with an emailed link or a password, verify their email and reset a forgotten password. An expired link is explained. | Everyone | web, email |
| People can sign in with Google, and a page explains it when that fails. (off by default) | Everyone | web |
| People can sign out from a web address. They are signed out after a period of no activity. | Everyone | web |
| A new admin creates an organisation. Groundwork asks for team size only while the free trial is on. | New admin | web |
| Someone who has signed in but belongs to no organisation can join by email domain, join as a guest, or create an organisation. | New person | web |
| A person in several organisations switches between them and sees how much needs them in each. | Person in several organisations | web |
| An admin turns the organisation's invite link and QR code on or off. It gets a new code each time it is turned back on. | Admin, invitee | web |
| An invitation to one check-in says what the manager will see. The person accepts it, or gets a fresh link if it has expired. | Participant | web, email |
| A participant previews a check-in, accepts and confirms they are joining. | Participant | web |
| Anyone with an open link or QR code answers first, without signing up, and gives an email at the end to get the report. | Anyone with the link | web |
| Someone from outside the organisation waits for an admin to let them in, and can remind the admin once a day. | Outsider | web |
| Guests from another company join one check-in only. | Guest | web |
| An admin invites many people at once by pasting a list, checks it and gives each person a role. | Admin | web |
| A lead adds people to a check-in from the organisation's list, or types their addresses. | Lead | web |
| A lead keeps invitations and sends them later. A joiner with a start date is invited on that day. | Lead | web, email |
| A lead resends an invite or fixes a bounced address. The invitee is warned before an invite lapses and told when it has. | Lead, invitee | web, email |
| An invitation waits for a free seat until an admin releases one. | Admin | web |
| A new admin sees a welcome card and a checklist for getting the organisation going on Today, and names the organisation there. | New admin | web |
| An admin sends leads a guide page. | Admin, lead | web |
| A check-in a member creates waits for an admin to approve it before anything is sent. | Admin, lead | web, email |
| An admin sets up a check-in for a lead, and the lead confirms it. | Admin, lead | web, email |
| A lead uploads a plan and confirms the goals, roles and commitments Groundwork proposes, one by one. | Lead | web |
| A lead attaches one of 13 templates to a team. (off by default) | Lead | web |

## 2. Check-ins

### The situations

Every situation has a first, a middle and a last stage, with different wording for the lead and for the participant. The picker shows 26 cards, and two of them reuse another situation.

| Use case | Who | Where |
|---|---|---|
| Help a new hire get started. It ends with keep, restructure, exit, extend or not yet, and has a board showing the first ninety days in three steps. | Lead, team | web, WhatsApp |
| Onboard several people at once. | Lead, team | web, WhatsApp |
| Hand over a role smoothly, including what the person leaving knew. | Lead, team | web, WhatsApp |
| Get a new project off to a good start. | Lead, team | web, WhatsApp |
| Help your team understand and move with you. It runs for a month, with its own board and an end-of-month page. | Lead, team | web, WhatsApp |
| Start a new partnership well. | Lead, team | web, WhatsApp |
| Help a new manager take over. | Lead, team | web, WhatsApp |
| Start an advisor or board relationship. | Lead, team | web, WhatsApp |
| Set goals and keep the team on track. | Lead, team | web, WhatsApp |
| Connect goals across the team. | Lead, team | web, WhatsApp |
| Build a workplan and budget. | Lead, team | web, WhatsApp |
| Align on strategy. | Lead, team | web, WhatsApp |
| Work through a big decision. | Lead, team | web, WhatsApp |
| Keep a read on live work, on a repeating rhythm. | Lead, team | web, WhatsApp |
| Collect what is owed, from invoiced to paid, with fee notes. (off by default) | Lead, team | web, WhatsApp |
| Raise invoices after a sale. (off by default) | Lead, team | web |
| Check how the same role is going across several people. | Lead, team | web, WhatsApp |
| Check in before a contract ends or renews. | Lead, team | web, WhatsApp |
| Check an agreement before signing. It ends signed, signed with changes, not yet or not going ahead. | Lead, team | web, WhatsApp |
| Check how an agreement is going. | Lead, team | web, WhatsApp |
| Support a raise, promotion or recognition. | Lead, team | web, WhatsApp |
| Help someone get back on track. | Lead, team | web, WhatsApp |
| Get a project back on track. | Lead, team | web, WhatsApp |
| See where people see things differently. | Lead, team | web, WhatsApp |
| Make sense of something serious. | Lead, team | web, WhatsApp |
| Get updates from your team, with one question the lead writes. | Lead, team | web, WhatsApp |
| Work out where to focus, in one group conversation. | Lead, team | web, WhatsApp |
| Take the pulse of the team in a single session. | Lead, team | web, WhatsApp |
| Work through something else, starting from an empty board. | Lead, team | web, WhatsApp |
| The kind of work chooses the board inside a situation. The kinds are a sales team, a sales organisation, an engineering release, a support desk, distribution, a trader training programme, a founder's own check-in, asset loans, two MarketView boards, a law firm matter and a government programme. | Lead | web |
| Leadership as a kind of work. (off by default) | Lead | web |
| A funded project or client delivery as a kind of work. (off by default) | Lead | web |

### How a check-in runs

| Use case | Who | Where |
|---|---|---|
| A person opens a check-in and Groundwork gives the opening. The first line shows while it loads. | Participant, lead | web, WhatsApp, API |
| Groundwork asks one question at a time and its reply appears as it is written. | Participant | web |
| The first check-in tries to understand, the next asks what changed since last time, and the last asks where things landed. | Everyone | web, WhatsApp, API |
| A lead does their own first check-in and may check in whenever they choose. A lead who only manages has no Check-in tab. | Lead | web |
| Groundwork asks for proof and for specific detail such as a place, a number, a date or an amount, at most twice for each thing. | Participant | web, WhatsApp, API |
| Groundwork checks a blocker by asking who it is, what was tried and by when. The person chasing is never blamed. | Participant | web, WhatsApp, API |
| Groundwork notices what does not add up, such as one thing counted two ways, a number that differs from the lead's, or more than the record shows. | Participant | web, WhatsApp, API |
| Groundwork brings back what the person is owed, what they promised and what they said before, and covers what the lead asked about. | Participant | web, WhatsApp, API |
| A document that disagrees with what was said is raised once. Groundwork quotes the passage that backs a line. | Participant | web, WhatsApp, API |
| The first check-in asks about the person's role, with different questions for a lead and a participant. | Everyone | web, WhatsApp, API |
| A person attaches a photo or document during a check-in, and Groundwork asks what it confirms. | Participant | web, WhatsApp, API |
| Every line shows how it is known, such as how specific it is, whether it is from memory, or whether a document backs it. | Everyone who reads it | web |
| A person can pause, skip a check-in before saying anything, or decline without penalty. | Participant | web |
| An end card shows what is now in the record, after finishing or pausing. | Participant | web |
| A person reads their own report straight after, downloads their own record as text and reads their own transcript. | Participant | web |
| A person disputes a line by saying "That's not what I said". Nothing is deleted. | Participant | web |
| A person corrects an earlier session or clarifies something the report worked out, within a set correction window. | Participant | web |
| A person adds something to their own record between check-ins. | Participant | web |
| A person marks something delivered or a promise done between check-ins. | Participant | web |
| A page shows what happens between now and the next check-in. | Participant | web |
| A person can offer an idea to the team during a check-in. | Participant | web |
| A person can ask for leave or spending during a "Help your team understand" check-in. | Participant | web |
| A person answers on WhatsApp instead, and the check-in is still kept in the app. The lead turns this on. | Participant, lead | web, WhatsApp |
| A lead can choose simpler words for a check-in. | Lead | web |
| A lead reminds everyone who has not finished, or nudges one person from the board. | Lead | web, email |
| A lead asks people a question that goes into their next check-in, and they confirm or decline it. | Lead | Ask |
| A lead and team set a starting point, expectations and what success looks like. | Lead, participant | web |
| A person who missed check-ins gives the reason, and the lead sees it. Only that person can give it. | Participant | web |
| A member asks to join a check-in and the lead approves. | Member, lead | web |
| A lead asks for more time. | Lead | web, email |
| Groundwork recommends the next check-in, and the lead says yes or not now. | Lead | web |
| A lead pauses, resumes or deletes a check-in. A check-in stalls when its period runs out. | Lead | web, email |
| A lead ends a check-in by choosing an outcome and giving a reason. | Lead | web |
| Afterwards, Groundwork asks the lead whether the outcome was right. | Lead | web, email |
| A lead who reaches the free limit sees a paywall. | Lead | web |
| Agreements are checked on figures, terms, obligations, claims, differences, versions and signing. (unverified) | Contract check-ins | API |
| The old context chat shows on the check-in page. (off by default) | Lead | web |

### Rhythm

| Use case | Who | Where |
|---|---|---|
| A lead sets the rhythm to daily, weekly, fortnightly, monthly, one-time, or whenever the lead checks in. | Lead | web |
| A lead sets which days the team works and its public holidays. Sessions open at 8 where the team is. | Lead | web |
| Sessions open by themselves, with notices that a session is ready or opening soon, closing warnings, and stale check-ins closed. | Everyone | email, WhatsApp |
| Groundwork warns before time runs out and ends month-long check-ins. | Lead | email |
| Each week starts on Monday, and Groundwork checks whether too much rests on one person. | Background | Background |

## 3. Reports, boards and the record

| Use case | Who | Where |
|---|---|---|
| There are four reports. These are your own session, your own run, the shared session and the shared run, which is the board. | Everyone | web |
| A person's own report starts with what they did well. Only they read it, and they may share it. | The person | web |
| The team report gives the short version, where people differ and why, what they agree on, what each person found, the central question and a judgement. | Lead, participants once released, admins | web |
| The lead's judgement is the lead's alone. Participants never read it. | Lead | web |
| A lead holds or releases a report, sets a time for it to share itself, and sends it to everyone with names or without. The report says who shared it if the lead had left. | Lead | web, email |
| Reports update only when something new comes in, with an hourly catch-up and a nightly backstop. | Background | Background |
| A weekly report shows the numbers, each person, what kept happening, what changed and what to do next week. | Lead | web |
| A lead or admin reads the report for a past session, and what the report said at each round. | Lead, admin | web |
| The report shows the one finding still open and compares the work with what success was meant to be. | Lead, participant | web |
| The report shows what changed since last time and whether the parts add up to the whole. | Lead | web |
| Sales reports are read from the deals. (off by default) | Lead | web |
| Collections reports. (off by default) | Lead | web |
| The report says how sure Groundwork is of the picture. (off by default) | Lead | web |
| Each participant gets a guide after the report. (off by default) | Participant | None |
| The board shows whether the team is on track, what needs the lead, targets, work items or deals by stage, blockers, waits, decisions, polls, dependencies, contribution, coverage, patterns and coaching. Participants see their own view. | Lead, participant | web |
| Each situation turns on its own set of about 30 board sections. | Everyone | web |
| Board sections for the remaining situations. (off by default) | Lead | web |
| Boards are drawn for each kind of work, including sales, collections, founder, loans, a law matter, metrics, a programme, tickets, where next, and the morning on the board. | Lead | web |
| On the board, a lead proposes, adds and edits objectives, adds, claims and moves work items, answers a decision or a wait, decides a deal, sets when a deal counts as stalled, sets a fee due on an event, answers a price range, marks something not relevant and runs polls. Participants can do some of this. | Lead, some participants | web |
| A light sales board. | Lead | web |
| A lead opens one person's page, with private notes that are never evidence and never shown to admins, and what that person chose to share. | Lead | web |
| A lead traces where a blocker started, step by step. | Lead, readers of linked check-ins | web |
| A lead links check-ins together. | Lead | web |
| A lead or admin sees team boards across every check-in. | Lead, admin | web |
| Suggestions are told like a signal. The lead agrees or chooses otherwise with a reason, the person adds their side or appeals, and an admin decides the appeal. | Lead, person, admin | web |
| An admin sets the company direction, each team gets a brief, and each person recommits to it. (off by default) | Admin, lead, member | web |
| An admin sets up a policy board from documents. (off by default) | Admin | web |
| A mediator brief for a facilitator. | Facilitator | None |
| Groundwork staff see every report side by side. | Staff | web |

## 4. Daily pages

| Use case | Who | Where |
|---|---|---|
| Today shows what needs you across every check-in, what changed since yesterday, what is worth knowing, invitations ready to send, the free trial and reviews due. | Everyone | web |
| Today shows what is outstanding, and the daily message links there. | Lead | web |
| The check-ins list shows the ones you run, take part in, can read and that have ended. | Everyone | web |
| Each check-in has tabs for the Board, the Check-in, References and resources, My work, and People and setup. | Everyone | web |
| My work shows your report, your words, what you said you would do, your numbers, how specific and on time you were, how to improve, and suggestions from check-ins. | Participant, lead | web |
| References and resources holds documents (yours, open or closed), evidence, people, what success looks like and what the work is about. People can search it and add lines. | Everyone on the check-in | web |
| People and setup shows who has joined, the rhythm, the kind of work, who sees targets, what peers and outsiders see, when the report is shared, WhatsApp numbers and getting started. | Lead | web |
| The You page shows where you stand, your goals, what you said you would do, to-dos, what you contributed, coaching over time, something noticed, what to keep doing and do better, everything asked of you this week, your own reports, your data and a way to appeal a review. | The person | web |
| The You page keeps a running record of your commitments, proof and goal changes. (off by default) | The person | web |
| The Company page shows whether the strategy is moving, the priorities, where the strategy is not reaching the work, what more than one team named, what each level understood, and questions and answers about the organisation. Each reader sees their own version. | Admin, lead | web |
| The company picture is rebuilt every night. | Background | Background |
| Company context holds how we work, as handbook cards people propose and approve, what was learned from check-ins, resources and the staff handbook. Only some people may change it. | Everyone | web |
| An admin sees every member with their role, level, team, manager and seat, and can invite, remove or resend. | Admin | web |
| The app has a sidebar with pinned and recent check-ins, a jump-to search, a menu on phones, help, an offline note and a crash page. | Everyone | web |
| Anyone can ask to talk to Groundwork, which creates a request for a call or a coach. | Anyone | web |

## 5. Ask

| Use case | Who | Where |
|---|---|---|
| Ask answers questions about your work and team, such as what is stuck, who has not checked in, what is due and how you are doing. | Everyone | web, WhatsApp, email, API |
| Ask adds and ticks off to-dos, moves deadlines, adds commitments, sets objectives and starts check-ins. | Everyone | web, WhatsApp, email, API |
| Leave, spending, hours and to-dos asked for in Ask are said back first and done only after a yes, through the usual approvers. | Everyone | web, WhatsApp, email, API |
| Ask switches suites on, connects other tools and runs the role interview. | Admin | web, WhatsApp, email, API |
| A senior person sets up or stops a delegate through Ask. | Senior person | web, WhatsApp, email |
| A lead adds context, private notes and questions for people's next check-in through Ask. | Lead | web, WhatsApp, email, API |
| Answers about documents come from the organisation's memory. | Everyone | web, WhatsApp, email, API |
| Your questions to Ask are private and never part of a check-in or a report. | Everyone | web, WhatsApp, email, API |

Full list of 95: what-ask-does.md

## 6. Suites

Each suite is off until an admin switches it on and answers its first questions. Leads see the seven suites meant for leads.

| Use case | Who | Where |
|---|---|---|
| An admin switches suites on and off. The people who hold HR and finance may switch their own suites. Leads see which are on. | Admin, duty holder | web, Ask |
| An approver sees everything waiting for them and decides several at once. A requester sees their own requests. | Approver, requester | web |
| An admin sets approval steps by amount and who approves. A request passes to someone else when it waits too long or the approver is away. | Admin | web |
| Each approver gets a morning summary. | Approver | email |
| An approver decides or questions a request on WhatsApp. | Approver, requester | WhatsApp |
| Onboarding lists a new person's to-dos and each helper's to-dos. | Admin, lead | web |
| Leave can be asked for by form, in Ask, on WhatsApp or during a check-in. It shows days left and who else is off. Approvers approve, decline or ask a question, and there are rules and a history. | Member, approver | web, Ask, WhatsApp |
| Time sheets record hours by client or project, drafted from the record. They are approved weekly, can be reopened, and follow client agreements. | Member, approver | web, Ask |
| Performance reviews have due dates Groundwork proposes. The person gives their own view with a drafted self-review, the review shows what Groundwork noticed from the record and updates from it, and lines can be corrected. A writer decides, the person can appeal, an admin added later is told, and the review may suggest recognition. | Writer, person, admin | web, email, WhatsApp |
| A review is built from check-ins, with rules on who may read it. (off by default) | Manager, HR | web |
| Managers are told when reviews are coming up. | Manager | email |
| When someone leaves, a checklist covers handover, equipment back, access removed and final pay, each with an owner. | Admin | web |
| The role map shows every role, what it owns, who holds it and the jobs nobody owns, rebuilt nightly. A person can do a role interview. | Admin, person | web, Ask |
| Spending can be asked for in chat or by form, with an attachment and a budget check. Approvers approve, decline or ask a question. Finance sees codes and evidence, marks items paid and sees totals and exports. | Member, approver, finance | web, Ask, WhatsApp |
| To-dos lists everything people said they will do. | Admin, lead | web |
| Customers and deals keeps one list of companies from sales check-ins. | Admin, lead | web |
| Equipment shows who has what and what needs fixing. An admin adds and edits items. | Admin | web |
| An admin names who holds HR, finance and similar duties. | Admin | web |

## 7. Coaching and patterns

| Use case | Who | Where |
|---|---|---|
| Groundwork works out each person's role and function as they talk, using neutral questions. | Background | web, WhatsApp, API |
| Coaching gives one step at a time, earned over two sessions. It is on by default and staff can switch it off. | Participant | web |
| Groundwork follows seven behaviours. These are keeping promises, planning ahead, handling blockers, working on the right things, backing claims with proof, helping the team and the quality of the check-in. | Person, lead | web |
| Groundwork watches for 49 patterns. A concern shows after three periods, and a good pattern shows at once. They are checked every night. | Lead, person | web |
| A lead answers a pattern, marks it as talked about, and says whether it was accurate. | Lead | web |
| Groundwork tells the lead who is really carrying the work, which dependency nobody wrote down, when coaching stopped being enough, who needs them this week, what worked for somebody else and which conversation the record suggests. | Lead | web, API |
| Staff can switch off everything that judges a person for one organisation. It is on by default. | Staff | web |
| A lead asks for a human coach, and staff see the requests. | Lead, staff | web |

## 8. Messages

Each person gets at most one routine message a day. Mail and WhatsApp messages wait until morning during quiet hours.

| Use case | Who | Where |
|---|---|---|
| Each lead gets a morning summary at 7 local time, with a later catch-up at 9 Lagos time. | Lead | WhatsApp, email |
| Each lead gets a weekly letter on Friday afternoon. | Lead | email |
| A lead running "Help your team understand" gets a weekly insight on Friday morning. | Lead | WhatsApp |
| Each person gets a summary of their week on Thursday. | Everyone | email |
| Existing leads are told once what is new. | Lead | email |
| A lead with a test check-in is invited once to start a real one. | Lead | email |
| A lead gets a follow-up a week after a report. | Lead | email |
| A lead is told when they are still waiting on people they invited. | Lead | email |
| A lead is told on Wednesday who has gone quiet. | Lead | email |
| A person who missed check-ins is told first, before the lead. | Participant | email |
| A person is told a check-in is open, due tomorrow or opening soon, is overdue, that the team is almost in, that their view matters, or that they can catch up. | Participant | WhatsApp, email |
| A person who stops halfway gets a reminder, a half-hour warning and a note when it closes. | Participant | WhatsApp |
| People get daily reminders, and a reminder after missing three check-ins. | Participant | email, WhatsApp |
| People are told when a session or report is ready, someone checked in, a check-in stalled, reopened or closed, time is running out, an outcome is proposed, or feedback is wanted. | Lead, participant | email |
| Groundwork sends sign-in, invitation, lapse, bounce, approval, seat, more-time, billing and data mails. | Everyone | email |
| People stop reminders for one check-in, unsubscribe with an undo, and set mail preferences. | Everyone | web |
| On WhatsApp, people send text, voice notes, photos, documents and locations. Groundwork asks which check-in they mean, and they can say not now, stop or start. Email is the fallback. | Anyone with a number | WhatsApp |
| WhatsApp runs on Groundwork's own number or the organisation's own number, which an admin sets up, tests, switches on and disconnects. | Staff, admin | web |
| An admin gets Slack or Teams notices when a round finishes, a check-in is waiting, a report is ready, someone is blocked or a connection fails. They never include what anyone said. | Admin | Slack, Teams |
| A developer's system is told when a session, round or check-in finishes, a check-in opens, a blocker is raised or escalated, a handover is ready or a situation is proposed. They can replay notices and change the secret, and are mailed when their address keeps failing. | Admin, developer | API |

## 9. Senior person and assistant

None of this has a web page. It all runs through email, WhatsApp and Ask.

| Use case | Who | Where |
|---|---|---|
| An admin adds a senior person who never signs up, with their details, preferences and permissions. She gets two introductions, and the WhatsApp one waits until she writes first. | Admin | API |
| After her forwards, the senior person gets a first picture in one message. Her team is introduced after she agrees, and any gap is asked once of the right person. | Senior person, team | email, WhatsApp |
| The assistant has its own email address that takes attachments, ignores duplicates and replies correctly. | Team, senior person | email |
| Voice notes are written out, and unclear phrases are checked back. | Senior person, team | WhatsApp, email |
| A senior person gives or stops a delegate's access by chat. The delegate may prepare but never approve, and each action is recorded as done for her. A delegate for several people is asked who each thing is for. | Senior person, delegate | Ask, WhatsApp |
| Two standing jobs move forward every night, the annual report and the register of outstanding items. | Senior person | Background |
| The register answers what is outstanding, what needs her decision and what the team can close this week. Something marked done stays unproven without proof. | Senior person, delegate | Ask, WhatsApp, email |
| Groundwork builds the year-end report, presentation, register and evidence list, with versions. She asks for changes by message or voice, and only she approves. | Senior person, delegate | email |
| A reply, forward or voice note from the team counts as a check-in. Team members get private help drafting, nudges go to the approver, standing instructions such as "email me Friday" are kept, and corrections are checked like any claim. | Team, senior person | email, WhatsApp |
| Groundwork imports and reconciles a payment tracker, compares the National Assembly week by week, takes a named recipient by chat, sends a daily briefing and weekly update, and sends a team summary if she wants one. | Senior person | email, WhatsApp |
| Testers can feed in mail locally. (off by default) | Tester | API |

## 10. Organisation and admin

| Use case | Who | Where |
|---|---|---|
| People are admins, leads, members or guests. One person owns the organisation and can hand it over. | Admin | web |
| Each person can read their own, the shared or the lead's view of a check-in. A lead reads the shared view of check-ins in their own department. | Everyone | web, WhatsApp, email, API |
| An admin chooses who may open check-ins, named leads or everyone, and whether check-ins wait for an admin. | Admin | web |
| An admin chooses who can join, by invite link or email domain. A public mail domain is never allowed. | Admin | web |
| An admin lets in or turns away people who are waiting. | Admin | web, email |
| An admin sets where a person sits, their level, team and manager. | Admin | web |
| An admin names the organisation and chooses the word for a bill, fee note or invoice. | Admin | web |
| An admin sets how long a departed person's words are kept. Leaving happens in two stages. | Admin | web |
| Everyone sets their own name, password and phone, leaves an organisation, manages this device, exports or deletes their data, and sets mail preferences. | Everyone | web |
| Everyone can see what an admin can see. | Everyone | web |
| Reports are stored without names. Only the person reads their own Ask questions and own report. Lead notes are never evidence, leads never see ratings, colleagues' exact words stay with the manager, people are never compared, and staff never see anyone's words. | Everyone | web, WhatsApp, email, API |
| An admin sees all connections at a glance, WhatsApp, their own tools, Slack or Teams, and figures from other systems. | Admin | web |

## 11. Billing

| Use case | Who | Where |
|---|---|---|
| There are six plans, Starter, Small team, Growth, Business, Scale and Enterprise. Prices are kept where staff can change them. | Admin | web |
| The free tier allows 10 check-ins and a set number of members. | Admin | web |
| Small teams get a free trial. (off by default) | New admin | web |
| The first month after release is free. Three days before it ends an email goes out, then four weeks of grace with a countdown, then check-ins pause. | Admin, lead | email, web |
| Staff give free runs and trials. | Staff | web |
| An admin pays through Stripe, changes plan, pauses, resumes, cancels at the end of the period or keeps the plan, and opens the billing portal. Failed payment events are retried and seats are billed. | Admin | web |
| Admins are warned before the next seat is charged and reminded when a check-in is paused until they subscribe. They can get a free extension or delete the organisation. | Admin, lead | web |
| WhatsApp is an add-on, free for a month and then charged per person. | Admin | web |
| New parts of the plan and price. (off by default) | Admin | web |
| Staff and admins make contributor codes, email them, share a card, switch them off and set an expiry. People redeem them. | Admin, staff | web |

## 12. API

| Use case | Who | Where |
|---|---|---|
| An organisation asks for API access and staff approve it, with terms and a link to the docs. | Admin, staff | web |
| A developer creates, replaces and deletes credentials and gets a token. Each credential is limited to what it may read or write. | Developer | API |
| A developer adds people and other subjects one by one or in bulk, and syncs the staff directory. | Developer | API |
| A developer opens check-ins, sends answers and documents, completes them, reads reports, sets success, seeds objectives, adds commitments and to-dos, and reads their people's reports, reviews due and transcripts. | Developer | API |
| A developer assigns roles, reads handover briefs and runs onboarding steps and checks. | Developer | API |
| A developer sends figures, interactions and evidence from other systems, and reads proposed changes, forecasts, a brief before a conversation, findings and a sense check. | Developer | API |
| A developer drafts and agrees objectives. | Developer | API |
| A developer adds knowledge cards. | Developer | API |
| A developer reads roles, main actions and findings, and accepts or declines recommendations. | Developer | API |
| A developer embeds Groundwork's panel in their own product, so their users sign in through it and the assistant says what they can see. | Developer, their users | API, web |
| The API ignores repeated requests, is watched hourly and daily, and lets held requests expire. | Background | API |

## 13. Groundwork staff

| Use case | Who | Where |
|---|---|---|
| The staff console shows the system, drop-offs, prompts, organisations, usage, call requests, the inbox, feedback, coach requests and errors. | Staff | web |
| Staff set prices and limits, the free trial and its grace, trials, coaching, the delivery alert, the daily usage summary, the correction window, suggestion levels, Stripe and WhatsApp. | Staff | web |
| Staff switch features on for each organisation, give free runs, add or remove admins, make codes and change a check-in's state. | Staff | web |
| Staff approve API access, run Groundwork's WhatsApp number, see the platform dashboard, and manage and test prompt versions. | Staff | web |
| Staff get a daily delivery alert and a daily usage summary. | Staff | email |
| Staff get in with an emailed code once a week unless they sign in with Google. | Staff | web |
| Groundwork's own operations pages cover the team's boards, target companies, commitments and spending, sales and marketing, the roadmap and product, and the company's workplan, objectives, people, requests, decisions, approvals, fundraising and strategy. | Groundwork team | web |
| Developers have test pages in development builds only. | Developers | web |

## 14. Memory and learning

| Use case | Who | Where |
|---|---|---|
| Each organisation's memory is rebuilt every week from its assessments, with rules on who reads which part. | Background | Background |
| Ask answers about documents from the organisation's memory. | Everyone | Ask |
| Every day Groundwork counts what worked for each pattern, step and question. | Background | Background |
| An admin can read what Groundwork learned for their organisation, and staff for the whole platform. | Admin, staff | API |
| A lead says whether an outcome was right, and a weekly report on outcomes is built from it. | Lead | web |
| An admin confirms what Groundwork proposes adding to the organisation's knowledge, and sees what was tried before. | Admin | web, Ask |

## Built, but nobody can reach it yet

- Adding a senior person can only be done through the API.
- Checking agreements on figures, terms, obligations and differences has no screen.
- Reading the organisation's memory directly has nothing that calls it.
- What Groundwork learned has no screen.
- The learning dashboard and check-in feedback have no screen.
- Rating a pattern has no screen.
- Saying what worked in a check-in has no screen.
- A participant showing their own report to others has no screen.
- The organisation's full roster has no screen.
- Setup sign-offs have no screen.
- The mediator brief has no screen.
- Activating a check-in directly has no screen.
- Making a counter-offer on an outcome has no screen.
- Member sign-in, team invites and starting your own organisation have no screen.
- Setting the organisation's time zone has no screen, so it is worked out instead.
- The time sheet billing export has no button.
- Suite workflows and the history of suite rules have no screen.
- Applying a contributor code for the whole organisation has no screen.
- A second set of staff pricing controls, including reset, has no screen.
- Creating a new prompt version has no screen.
- The guide after a report is switched off and has nothing to show it.
- The WhatsApp message that a check-in closes soon is written but never sent.
- Some notices for developers' systems were planned but never built.
- One objectives switch is read nowhere. (unverified)
- Deciding a deal and answering a price range on the board may be reachable only through the board's own actions. (unverified)
- Asking people questions, proposing how we work, the role interview, delegates, the period report and "send me that" work only through Ask.

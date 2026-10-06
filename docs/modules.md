# Groundwork prototype: the modules

Sep 25, 2026 · @Hafsah

## How to read this

The prototype has 146 screens. This doc groups them into **23 modules**. A module is one piece of the product that can be built, connected and tested on its own. Each module lists:

- **Screens:** the pages in the prototype, by their address. Open the prototype, add the address after the #, and the page appears.
- **What it does,** in a sentence or two.
- **Rules it must follow.**
- **Backend:** how ready the current product is. **Ready** means it works. **Partly** means some of it works. **Missing** means it has to be built. This comes from the backend map.

The prototype has 7 people you can switch between at the top. The modules name them: **Wairimu** (sales lead), **Miriam** (in the sales team), **Grace** (admin), **Amani** (chief executive), **Daniel** (on a performance plan), **Kwame** (a new hire), and **Groundwork staff**.

**Every module shares four rules:**

1. **Plain words.** Full sentences that people with basic English understand. Copy the prototype’s wording exactly.
2. **Privacy is decided by the backend.** What people say in check-ins can be shown word for word to the people in that check-in. Questions to Ask Groundwork, each person’s own report, a lead’s private notes and each person’s load stay private. Hiding something on screen is never enough.
3. **Signals, not labels.** No scores or labels such as “PIP” on a person. Say what happened, why, and what would change it.
4. **How something is known is always shown.** Proven, confirmed, someone’s word, or memory.

**Important about the wording.** In the prototype’s code, many sentences are still written the old, clipped way. The plain version is swapped in only as each page is drawn: about 240 lines are rewritten this way. So **copy the wording from the screen, not from the code.** Before the package is handed over, these rewrites should be written straight into the code, so there is only one version.

**How each module is tested.** Three kinds of test go with the package:

- **The prototype’s journey tests.** Each clicks through a module as a real person would, as Wairimu, Miriam, Grace, Amani, Daniel or Kwame. They are rewritten to run against the real product.
- **The privacy tests.** A lead, an admin and Groundwork staff each try to open a person’s exact words, their own report, and a lead’s private notes. Every attempt must fail.
- **The scenario test document.** It has five tabs: the sales team, the whole organisation, onboarding, the law firm, and government. They check what the engine actually writes.

**The decisions behind these rules,** such as “a verdict, told like a signal” and “nobody is special because of their title”, are in the tracker.

**The order to build them.** Foundations first, then the core loop, then each person’s pages, then across the organisation, then suites, then the rest.

| Order | Module | Backend |
| --- | --- | --- |
| 1 | A1 Look and layout | Not needed |
| 2 | A2 Accounts and signing in | Ready |
| 3 | A3 Organisations and joining | Partly |
| 4 | A4 People, roles and access | Partly |
| 5 | B1 Starting a check-in | Ready |
| 6 | B2 Context | Ready |
| 7 | B3 The check-in conversation | Ready, with changes |
| 8 | B4 Reports and sharing | Ready, with changes |
| 9 | B5 The board | Partly |
| 10 | B6 Ending a check-in | Partly |
| 11 | C1 Today and the check-ins list | Partly |
| 12 | C2 The You board | Missing |
| 13 | C3 Suggestions from verdicts, and appeals | Missing |
| 14 | D1 Ask Groundwork | Partly |
| 15 | D2 The Company page | Partly |
| 16 | D3 Links between check-ins, and each person’s load | Partly |
| 17 | E1 to E10 The suites | Mostly missing |
| 18 | F1 Connections and channels | Partly |
| 19 | F2 Billing | Ready |
| 20 | F3 The public site | Separate |
| 21 | F4 Small states and errors | Ready |
| 22 | F5 Groundwork staff | Partly |
| 23 | G1 Example check-ins | Decide |

## A. Foundations

### A1. Look and layout

**Screens:** #/system (the design system), and the frame around every page: the sidebar on a computer, the bottom bar and “More” menu on a phone (#/more).

**What it does:** the colours, type, buttons, tags and spacing; the four marks (proven, confirmed, someone’s word, memory); the sidebar with check-ins, Today, Company and You, plus the admin part for admins; light and dark.

**Rules:** opens in light mode. Nothing scrolls sideways on a phone. Every page works at a phone’s width.

**Backend:** not needed.

**Also in this module:**

- “Jump to” search (Ctrl K), to find any check-in, person or page.
- Pinning a check-in to the top of the sidebar, and folding the sidebar away.
- A short guided tour for someone new, which they can start, skip or finish.
- Help and “Talk to us” from anywhere.

### A2. Accounts and signing in

**Screens:** #/signin, #/signup, #/forgot, #/reset, #/password, #/verify-email, #/verify-expired, #/google-failed, #/signout.

**What it does:** sign up with an email link or a password, sign in with Google, reset a forgotten password, and clear messages when a link has expired or Google sign-in fails.

**Rules:** the organisation is only created once the email is confirmed. Every error says what happened and what to do next, in plain words.

**Backend:** Ready. The email link, Google sign-in and passwords all exist.

**Also in this module:** the “Check your email” page shown after asking for a sign-in link (#/signin/sent).

### A3. Organisations and joining

**Screens:** #/welcome, #/org-new, #/orgs, #/j/baridi, #/join/invite, #/join/waiting, #/join/outoftime, #/join/expired, #/stop.

**What it does:** create an organisation, or join one by invite link or email domain; switch between several organisations; guests from another organisation join one check-in only; an outsider waits for an admin to let them in; stop reminders from an email.

**Rules:** being invited to one check-in never makes someone a member of the company. The invitation says what the manager will see: a summary, not their exact words.

**Backend:** Partly. Invite links, guests and waiting for approval work. **Missing:** joining by email domain. **Different:** joining a second organisation makes you a guest there.

**Also in this module:**

- Your own web address and logo, set up under settings. **Backend:** Missing.
- Turning the invite link on or off, showing it as a large QR code, and a joining code.
- Asking to join a check-in, which the lead then approves.
- Leaving an organisation.
- Fixing an email address that bounced, and sending the invitation again.
- Inviting several people at once by pasting a list, and cancelling an invitation.
- Adding people from the organisation’s own list into a check-in.

### A4. People, roles and access

**Screens:** #/settings/people, #/settings/people/miriam, the People and setup tab of each check-in (#/c/sales/people), #/settings.

**What it does:**

- Each person’s role in the organisation: owner, admin, can open check-ins, or takes part.
- Their level, their team, and who they report to, with a “Who reports to whom” tree.
- Access to one check-in: runs it, takes part, or can read.
- “Who can open a check-in”, and removing someone with an undo.
- Inviting people, and seeing who has not joined yet.
- Each person’s own settings.

**Rules:** nobody is special because of their title. Access comes from their role plus their access to each check-in. Admins can read every board and report, including people's exact words, but never a performance plan, promotion or renewal unless given access to that check-in (docs/decisions.md rule 5; Hafsah, 29 September).

**Backend:** Partly. Admin, lead and member roles, and access for each check-in, exist. **Different:** “owner” is one field, not a role. **Missing:** levels and reporting lines are only on imported staff records, not on the main user.

**Also in this module:**

- “Check-ins wait for an admin”: a switch that makes new check-ins wait for approval.
- Requests to an admin from people who are not admins, such as “Miriam asked to change the plan” or “Peter is waiting to be let in”.
- Inviting a second admin.
- A check-in owner who is not the person who set it up.

* The read-only view, for someone who can only read a check-in. There are no lead controls, and a note says who runs it.
* Shared functions, such as Design, Data and Finance, set up as teams, so a check-in can depend on them.

## B. The core loop

### B1. Starting a check-in

**Screens:** #/start, #/start/chat, #/new, #/new/setup, #/new/first, #/switchboard, #/templates.

**What it does:**

- “What do you need updates on?” in plain words, then a suggested situation.
- A setup chat that asks about worries first, then asks for proof up to three times.
- Setup gives the check-in a real name (“Faith, first 90 days”, never “New hire”) and a suggested schedule.
- Different first questions for the manager and the person.
- Invite people by name and email.
- The lead’s first check-in.
- Anyone can try it without an account first.

**Rules:** a new check-in appears straight away in the sidebar, on Check-ins and on Today. It opens with its own pages: People, Context, sessions, own report and board.

**Backend:** Ready. The setup conversation, suggesting a situation, and creating the check-in all exist, with 17 situations. **Must keep:** all 17 of the backend’s situations. The prototype has 25: all 17 of the backend’s, plus 8 the backend lacks. See G2.

**Also in this module:**

- The schedule: which days, what time, and “any day”.
- A check-in answered only once, for one decision (#/c/supplier/board, the supplier review).

* Every situation in one list (#/start/all), for someone who wants to browse rather than describe.

### B2. Context

**Screens:** #/c/sales/context, #/c/sales/context/chat, #/c/sales/upload, #/company/kijani/context.

**What it does:**

- What the check-in is for.
- The rules people agree to, with “confirm” before anything is added.
- Documents, and a chat where the lead tells Groundwork how the team works.
- Uploading a plan and getting proposed goals, roles and commitments to confirm one by one.
- Next quarter’s target, with what it assumes.
- The worry and the “only agreed by talking” note from setup.

**Rules:** nothing is added until the lead confirms it. Every target shows what it assumes.

**Backend:** Ready for purpose, rules, documents and the context chat. **Missing:** a plan turned into proposals, and saved assumptions next to targets.

**Also in this module:** the lead’s context chat for other kinds of team, such as engineering (#/c/eng/context/chat).

### B3. The check-in conversation

**Screens:** #/c/sales/checkin, #/c/sales/whatsapp, #/answer, #/c/sales/done, #/correct, #/c/sales/between, #/c/sales/record.

**What it does:** see Part 1 of the backend map. In short:

- One question at a time, with quick replies.
- Good news first, then “yesterday you said…”.
- Photos as proof, and pausing or skipping.
- “The other side has answered”.
- An end card with three parts.
- A Done page, and correcting the record later.
- The same conversation on WhatsApp, and answering from a shared link with no account.

**Rules:** skipping is never held against anyone. The people in the check-in can see what was said. Anything said is checked the same way, however it arrives.

**Backend:** Ready, with three changes (Part 1 of the map): quick replies, the marks, and plain wording in the engine. WhatsApp waits for Meta. **Must keep:** streaming, disputing a line, correcting a session, and declining.

**Also in this module:**

- Marking a commitment as done (“I did it”) between check-ins.
- A check-in that checks the systems’ numbers against what someone says: “Paystack shows two paid. Is the third invoice out?” (#/c/mvq4/checkin).
- A lead taking part in someone else’s check-in, here Wairimu in Amani’s Leadership check-in (#/c/leadership/board).

* Answering on WhatsApp with no account at all: the same conversation, quick replies and photos, ending with a link to their own report.
* **When someone’s answers get shorter** or less clear, their next check-in starts with the last clear thing they said, such as “Three weeks ago you said you were talking to Lakeside’s buyer about 4 freezers. What happened with that?” It never comments on the change. This is in the canvas design (Phase 8) but not in the working demo.

### B4. Reports and sharing

**Screens:** #/c/sales/report/team, #/c/sales/report/own, #/c/sales/report/week, #/c/sales/sessions, #/c/sales/session/37, and the report pages from the canvas (#/c/sales/v/Main and others).

**What it does:**

- The team report: in short, what moved (with marks), what each person did (summaries), and where people see it differently.
- “Why the numbers don’t match”, and “One question to answer”.
- Warnings when the team is more confident than the evidence, or when the strategy may change.
- What the work changed, not how long it took.
- Each person’s own report, which starts with what they did well.
- The weekly report, and every past session.
- Share, hold, share without names, or share automatically.

**Rules:** only you see the report until you share it. It only updates when something new comes in, such as a check-in, a document or a number from another system. Opening it never rebuilds it. People’s own words can be shown.

**Backend:** Ready for reports, sharing and building up as people answer. **Changes:** show people’s own words; the “why” and “one question” parts in the report’s instructions; the warnings. **Must keep:** reports stored without names, and leads never seeing how a person’s answers were rated.

**Also in this module:** the weekly report for other kinds of team, such as operations (#/c/ops/report/week).

**Also in this module:** the daily digest for a lead of a large team, and the head of sales’ quarter view (#/c/salesorg/v/Scale-Daily and #/c/salesorg/v/Scale-Board).

### B5. The board

**Screens:** #/c/sales/board, #/c/sales/person/miriam, #/c/sales/trace, and the board pages from the canvas (#/c/sales/v/Board2-Sales and others).

**What it does:**

- Are we on track? What needs you.
- Deals or work items with their stages, and the team.
- Where people see it differently, and signals after three check-ins in a row, each with the person’s answer.
- “Where this is heading”: outcomes, what would settle it, and recording the decision.
- Waiting on other teams, and help nobody mentioned.
- What the target assumes, and what was said in chat but not proven.
- Numbers from other systems beside what people said.
- One person’s page, and where a blocker started.

**Rules:** no labels such as “Watch” or “Concern”. The board only updates when something new comes in. Every item says how it is known.

**Backend:** Partly. The board, differences, dependencies, contribution, patterns and help nobody mentioned exist. **Missing:** a decision with a reason, target assumptions, claims from chat, and live numbers.

**Also in this module:**

- Moving a deal or work item to another stage, and seeing what it said before.
- The Views menu, only for the person who runs the check-in, with the extra board and report pages.
- Deciding on a spending question raised on the board.
- The board’s sections for each situation. See G2, the switchboard.

* The lead’s private notes about a person, on the person’s page. They are never used as evidence, and admins never see them. **Backend:** Ready.
* “Ask them something”, on a person’s page, which puts a question into their next check-in.
* “Where this is heading” is only for the person who runs the check-in.
* The team view across every check-in (#/boards).

### B6. Ending a check-in

**Screens:** #/c/kwame/end, #/c/matter/handover, and the day 30 and day 60 pictures on #/c/kwame/board.

**What it does:**

- Choose an outcome, say why, and end it.
- The probation review: week by week, why things went wrong, what went well, what colleagues saw, support given, and questions to help decide.
- The day 30 and day 60 pictures.
- The handover page when someone leaves a check-in.

**Rules:** a person decides, never Groundwork. Both people keep their own history. Set-up problems never count against the person.

**Backend:** Partly. Ending with an outcome, feedback afterwards, and handover exist. **Missing:** the probation review’s parts, and the day 30 and day 60 pictures.

**Also in this module:** pausing the whole check-in, restarting it, cancelling it, or giving it more time. **Backend:** Ready. Pause and resume exist.

## C. Each person

### C1. Today and the check-ins list

**Screens:** #/today, #/checkins, #/messages.

**What it does:**

- **Today:** what needs you now: your check-ins that are open, reports to read or share, decisions waiting, and people who have not checked in.
- **Check-ins:** every check-in you run, take part in or can read, and ones that have ended.
- **The messages page:** every email and WhatsApp message the product sends, in its exact words.

**Rules:** Today only shows what the person is allowed to act on. A new organisation’s Today starts empty, with a first step.

**Backend:** Partly. Check-ins, reminders and every email exist. **Missing:** one read that gathers “what needs you” across all check-ins.

**Also in this module:** when reminders and notices are sent. A check-in opens and the person is told. Before it closes, they get one reminder. When a report is shared, everyone in it is told. A lead can send a reminder to one person. People can stop reminders from any email. **Backend:** Ready. The emails and their timings exist.

### C2. The You board

**Screens:** #/you.

**What it does:**

- One page for each person: where they stand, in plain facts.
- Their goals, commitments, to-dos, what they contributed, and one coaching tip.
- Their own reports, and a download of everything they have written.
- Everything asked of them this week across check-ins, which they can share with their lead.

**Rules:** only the person, and the people who run their check-ins, see it. No labels. Nothing about their load is shown to others unless they share it.

**Backend:** Missing as one page. The pieces exist: their own record, own reports, commitments and download. They need gathering into one read.

### C3. Suggestions from verdicts, and appeals

**Screens:** the suggestion at the top of #/c/danielpip/board (as Wairimu), #/c/kwame/end, and the Aisha review on #/suite/reviews. Daniel’s side is on #/you (as Daniel).

**What it does:**

- **The manager sees:** “Groundwork suggests…”, with why, what would change it, and the person’s own answer. They agree, or choose something else, and must say why.
- **The person sees:** the facts (“You kept 11 of your 20 commitments”), the decision and the reasons. They can add their side, or appeal. An admin decides the appeal.
- **Good suggestions work the same way:** “Groundwork suggests recognising Aisha’s work.”

**Rules:** these follow the decision “a verdict, told like a signal” in the tracker. No label such as “PIP”, “Exit” or “Support” is ever shown as a tag.

**Backend:** Missing. This needs the verdict engine from the structure document, which is not in the current product. Appeals exist in the structure document’s system.

## D. Across the organisation

### D1. Ask Groundwork

**Screens:** the Ask panel (the speech-bubble button at the top of the sidebar), and #/chat on a phone.

**What it does:**

- **Answers questions about a check-in, in plain sentences,** and says where each answer came from. Leads ask: what changed, what am I waiting for, where are we exposed, what do I decide, who is blocked, why are we behind, is it local or everywhere, where is it working. Everyone asks: what to deliver, who to escalate to, and what the handbook or guideline says.
- **Does things for you, after a yes:** leave, a to-do, hours, a spending request, or moving equipment. It says the request back, asks “Is that right?”, and follows the normal rules for who approves.
- **Checks claims:** “Kariuki paid” is checked against the payment system. If there is no proof, it asks for some. Until then it stays the person’s word, and the next check-in follows it up.
- **Thinks it through with you:** options with what each assumes. Nothing is saved until you say so, twice.

**Rules:** your questions and the answers are private. They are never part of your check-in or a report. A claim is never shown as proven because someone said it.

**Backend:** Partly. An organisation-wide assistant exists, with 20 things it can do, and a way to stop two requests clashing. **Changes:** focus it on one check-in when asked; the yes-first step for requests; claim checking; thinking it through.

### D2. The Company page

**Screens:** #/company, #/company/kijani/board, #/company/kijani/context, #/company/kijani/checkin, and #/c/gov/board for the government version.

**What it does:**

- Is the strategy moving: each priority, which teams feed it, and where the strategy isn’t reaching the work.
- Ask about the whole organisation (“What am I missing?”), and what new people keep asking.
- Company context: learnings, commitments, “tried before”, resources, and the staff handbook.
- What each level understood, from the top down to the people doing the work, marking where the meaning changed.
- Linked organisations, such as a ministry and its counties, shown as summaries.

**Rules:** never who asked a question. Never anyone’s exact words. Counties or teams are never ranked; differences come with a reason.

**Backend:** Partly. Organisation goals, every board, organisation-wide scans, learnings, the handbook and proposals to confirm all exist. **Missing:** one Company page, “what each level understood”, and linked organisations.

**Also in this module:** questions for the ministry, raised from the counties (#/c/gov/questions).

### D3. Links between check-ins, and each person’s load

**Screens:** “Waiting on other teams” on #/c/sales/board, “Asked of Operations” on #/c/ops/board, #/c/sales/trace, and the load section on #/you.

**What it does:** a blocker in one check-in can point at another team, and shows on both boards. Groundwork follows it back to where it started. Each person can see everything asked of them across check-ins.

**Rules:** a person’s load is theirs. Admins only see how many check-ins someone is in.

**Backend:** Built (request 18, 1 October). A handoff records which other check-in it waits on (`waitingOnGroundId`), only when the words said name exactly one; `GET /grounds/:id/links` serves what each reader may open of the links; `GET /grounds/:id/blocker-trace` follows a blocker back; the You board carries what is asked of the reader. A reader sees only what they may already open.

## E. The suites

**The Suites page** (#/settings/suites) lists every suite in three groups: People, Money and Work. There is also “Already part of Groundwork”, with links to where those things live. Admins switch each suite on or off, after answering two or three questions. Leads see the boards for their teams, without the switches. Each suite adds one board (#/suite/ plus its name). People use it by talking to Groundwork, not by filling in forms.

**Rules for every suite:**

- Requests are said back and confirmed before anything happens.
- The normal approval rules always apply.
- Nothing on a suite board ever counts as evidence about how well someone works, except the reviews suite, which is built for that.

| # | Suite | Its board | Who sees it | Backend |
| --- | --- | --- | --- | --- |
| E1 | Onboarding | A new person’s to-dos, each helper’s to-dos, and “something nobody has shown them yet”. Kept apart from their work check-in | Admins and leads | Built, not on. Onboarding steps per role exist. The helpers’ lists and the “nobody showed them” gap are missing |
| E2 | Leave requests | Requests waiting, with days left and who else is off; approve or decline | Admins and leads | Missing here. The structure document’s system has leave with a stand-in |
| E3 | Time sheets | Each person’s hours by client or project, approved weekly; hours against what each client agreed. For billing only | Admins and leads | Missing |
| E4 | Performance reviews | Reviews every 6 months, built from proof, with “what Groundwork noticed” beside the manager’s words and the person’s own view | Admins and leads | Partly. A daily reminder of reviews coming up exists. The review page is missing |
| E5 | When someone leaves | Handover, equipment back, access removed and final pay, each with an owner; signs a team is under strain | Admins only | Partly. Handover and departures exist. The checklist is missing |
| E6 | Role map | Every role, what it owns and who holds it; jobs nobody owns; the role interview | Admins only | Missing |
| E7 | Spending and budgets | Requests waiting, with the budget check; each team’s budget against what was spent | Admins and leads | Missing for customers. Groundwork’s own back office has spending |
| E8 | To-dos | Everything each person said they will do, from check-ins and chat | Admins and leads | Missing for customers. Groundwork’s own back office has to-dos |
| E9 | Customers and deals | One list of customers for the company, kept up to date by the sales check-ins | Admins and leads | Missing for customers. Groundwork’s own back office has a sales pipeline with payments |
| E10 | Equipment | Who has which laptop, phone or demo freezer, and what needs fixing | Admins only | Missing |

**Also in the suites:** a new person’s work check-in sits beside their onboarding board, and each links to the other (#/c/faith90/board). A box on the work check-in says that getting set up is kept apart, and never counts in the decision at day 90.

**A note on the back office.** Groundwork’s own back office already has to-dos, spending, commitments, goals, people, resources and a sales pipeline. Claude Code should check whether these can be reused for the customer suites, rather than building them again.

## F. Around the product

### F1. Connections and channels

**Screens:** #/settings/connections, #/settings/whatsapp, #/settings/tools.

**What it does:**

- Connect WhatsApp, including a company’s own number.
- Bring in numbers from other systems, such as payments and product use, so they show beside what people said.
- Notices in Slack or Teams.
- Developer keys, and embedding Groundwork in another product.
- **Planned:** Groundwork inside the team’s existing chat (WhatsApp group, Slack or Teams), answering questions, taking requests and posting the shared report. Check-ins stay private.

**Rules:** team chat is a connection, not a suite and not a new chat app. Nothing private is ever posted in a group.

**Backend:** Partly. WhatsApp is built but waits for Meta to approve the templates. The developer API, embedding and staff directory sync are ready. **Missing:** live numbers from Paystack or other systems, Slack, and team chat.

**Also in this module:**

- Connecting a spreadsheet or a product’s usage numbers, and switching each number source on or off.
- Disconnecting WhatsApp.
- Developer set-up: copy-paste set-up code, and creating or cancelling developer keys.

### F2. Billing

**Screens:** #/settings/billing, #/settings/checkout, #/settings/paid, #/settings/payfailed, #/upgrade, #/pricing.

**What it does:** the current plan and what it covers; choosing or changing a plan; paying; what happens when a payment fails; what happens when the free months end.

**Rules:** prices, seat limits and free limits come from the backend, never written into the page. Reports and boards stay readable after a plan ends. The free plan’s 5 people include the person who signed up, and every message must say so.

**Backend:** Ready, with Stripe. **Must keep:** everything, including pausing, resuming and retrying failed payments. **Different:** the prototype’s plans and prices must be replaced by the ones in the backend.

**Also in this module:** changing the payment card, and freeing a seat when someone leaves.

### F3. The public site

**Screens:** #/home, #/how-it-works, #/privacy, #/about, #/pricing, #/guide.

**What it does:** the marketing pages.

**Backend:** separate. The current marketing site is its own project. Its prices are written in when it is built, so they must be kept in step with the backend by hand.

### F4. Small states and errors

**Screens:** #/states, #/nowhere, #/crash, #/c/gone/board, #/badlink, #/join/expired, #/verify-expired.

**What it does:** what people see when a page is missing, something breaks, a check-in has gone, or a link has expired. Each says what happened and what to do next.

**Backend:** Ready. The backend returns clear reasons.

### F5. Groundwork staff

**Screens:** #/ops.

**What it does:** Groundwork’s own console: organisations, usage, and problems to look at.

**Rules:** staff never see anyone’s exact words.

**Backend:** Partly. The backend has a large back office and an admin area. The prototype’s console is small, so the backend has more than the prototype here.

## G. Examples and building blocks

### G1. The example check-ins

The prototype has 11 example check-ins, under “Examples” in the sidebar. They show what Groundwork looks like for different kinds of teams:

| Example | Address | What it shows |
| --- | --- | --- |
| Sales org, Q3 | #/c/salesorg/board | A sales team of 20 across 4 teams |
| Engineering release | #/c/eng/board | Work claimed done against work proven |
| Support desk | #/c/support/board | Numbers from the helpdesk beside what agents say |
| Distribution operations | #/c/ops/board | Repeated breakdowns and a late supplier |
| Trader training programme | #/c/programme/board | An NGO programme across counties |
| Founder’s own check-in | #/c/founder/board | One person checking in with themselves |
| Asset loans, cohort 3 | #/c/loans/board | Traders repaying freezer loans |
| MarketView, where next | #/c/mvnext/board | A workshop of 24 people choosing priorities |
| MarketView, Q4 | #/c/mvq4/board | Sales against Paystack |
| Kasarani Foods v Pwani Mills | #/c/matter/board | A law firm matter |
| Extension Access Programme | #/c/gov/board | A government programme across three counties |

**Decided by Hafsah, 29 September 2026:** all eleven kinds of board stay fully in the product. Whenever a real check-in fits one of them, its board shows the sections the switchboard gives its situation, filled the way that kind of work needs, and it must match the prototype's example for that kind. Nothing about the boards is removed or hidden.

What is not added is made-up sample check-ins for new organisations to open. A new organisation starts empty, with the welcome card and checklist, as in the prototype.

### G2. The switchboard: which sections each situation uses

**Screens:** #/switchboard (all 24 situations), #/templates, and the building blocks: #/m/accounts, #/m/drift, #/m/picture, #/m/timeline, #/m/themes, #/m/obligations, #/m/history, #/m/pulse, #/m/network. The test cases are at #/case/daniel and #/case/consultant.

**What it is:** every situation gets the same kind of board, but each switches on only the sections it needs. The switchboard is the table that decides which. The kind of work, such as sales or engineering, then decides what goes inside each section. The switchboard is part of B5, the board.

**Always on, for every situation:** the people, the goal or question, the latest update, the evidence, and commitments.

**The 30 sections, in plain words:**

| Section | What it shows |
| --- | --- |
| Targets | The numbers the team is aiming for |
| Work plan | Who is doing what, and by when |
| Deal grid | Every deal or work item, and its stage. Needs work with stages |
| Forecast | Where the numbers are likely to end up. Needs a target |
| Starting agreement | What was agreed at the start, and how things drifted from it |
| Accounts side by side | Each person’s account next to the others’ |
| Known and unknown | What is proven, what people believe, and what nobody knows yet |
| Timeline | What happened, in order |
| Themes | Many answers grouped by what they are about, without losing any |
| Obligations | What each side promised the other |
| Person history | One person’s record over time |
| Change since last | What changed since the last check-in |
| Blockers | What is stuck, and what it waits on |
| Risks | What could go wrong |
| Patterns | What keeps happening, shown after 3 check-ins |
| Coaching | One thing to do better, for each person |
| Lead actions | What the lead needs to do |
| Check-in grades | How complete and specific each check-in was |
| Blocker check | Whether a blocker is real: a named person, what was tried, and a date |
| Where the time went | What the person’s time was spent on |
| Requirements review | Whether what was required was met |
| Actions and their results | What someone did, and what came of it |
| The other side | The other person’s account |
| Evidence index | Every piece of proof, in one list |
| Who waited on whom | Every time someone waited on someone else |
| Commitments followed over time | Each promise, from when it was made to what happened |
| Pattern history | How a pattern started and changed |
| Contradictions | Where the record says two different things |
| Busy or moving | Whether activity is turning into progress |
| Questions for the lead | Questions only the lead can answer |

Eleven of the last twelve sections, from “Where the time went” onwards, are only for four situations: a new hire, a project that has drifted, someone getting back on track, and a renewal. “Blocker check” also appears in four more: getting a new project off to a good start, setting goals and keeping the team on track, checking how the same role is going, and keeping a read on live work - the same four whose example boards (docs/prototype/screens/G1-example-check-ins) draw a blocker's full history and what would clear it, and whose record the engine already builds this from for every situation, not only the original four (second board review).

**Why some sections are off on purpose:**

- **Forecast,** when the board is about one person getting back on track. A forecast about one person reads like a judgement on them.
- **Check-in grades,** in 9 situations, including every situation about one person. There they would read like a judgement on someone.
- **Work plan and patterns,** in “Take the pulse of the team”. It is a one-time read, so there is no plan and nothing can repeat.

**Every situation:**

| Group | Situation | What its board is for | Sections on | Optional | Off on purpose | Backend has it |
| --- | --- | --- | --- | --- | --- | --- |
| Something is starting | **Help a new hire get started** | Both sides over time: what was agreed at the start against what the hire and the manager each say. | Work plan, Starting agreement, Accounts side by side, Known and unknown, Person history, Change since last, Blockers, Patterns, Coaching, Lead actions, Blocker check, Where the time went, Requirements review, Actions and their results, The other side, Evidence index, Who waited on whom, Commitments followed over time, Pattern history, Contradictions, Busy or moving, Questions for the lead | Targets, Deal grid, Risks, Check-in grades | None | Yes |
| Something is starting | **Hand over a role smoothly** | What was meant to be handed over against what really was, with each gap named. | Starting agreement, Obligations, Change since last, Blockers, Risks, Lead actions | Work plan, Accounts side by side | None | **No** |
| Something is starting | **Get a new project off to a good start** | The pieces of work depend on each other, so each blocker shows what it holds up. | Targets, Work plan, Deal grid, Forecast, Starting agreement, Blockers, Blocker check, Risks, Patterns, Lead actions | Timeline, Change since last, Coaching, Check-in grades | None | Yes |
| Something is starting | **Start a new partnership well** | Each partner’s own account, and where they start to differ. | Starting agreement, Accounts side by side, Change since last, Patterns | Targets, Work plan, Obligations, Blockers, Risks | Check-in grades | Yes |
| Something is starting | **Help a new manager take over** | Whether the team’s way of working is really changing. | Targets, Starting agreement, Accounts side by side, Change since last, Blockers, Patterns, Coaching, Lead actions | Work plan, Themes, Risks, Check-in grades | None | Yes |
| Something is starting | **Start an advisor or board relationship** | What the advisor really contributed: the advice given, and what came of it. | Starting agreement, Obligations | Accounts side by side, Change since last, Patterns, Lead actions | Check-in grades | Yes |
| Something is starting | **Check an agreement before signing** | What each side thinks the agreement means, before signing. | Starting agreement, Accounts side by side, Obligations, Risks, Lead actions | Known and unknown, Blockers | Check-in grades | **No** |
| Planning and goals | **Set goals and keep the team on track** | What the team aimed for against what happened, and the plan against what was done. | Targets, Work plan, Deal grid, Forecast, Blockers, Blocker check, Risks, Patterns, Coaching, Lead actions, Check-in grades | Starting agreement, Accounts side by side, Change since last | None | Yes |
| Planning and goals | **Build a workplan and budget** | Whether the plan still makes sense given actual spend and progress. | Targets, Work plan, Deal grid, Forecast, Starting agreement, Blockers, Risks, Lead actions | Change since last, Patterns, Coaching, Check-in grades | None | Yes |
| Planning and goals | **Align on strategy** | Each leader’s position recorded before the group discusses it. | Accounts side by side, Known and unknown, Themes, Risks, Lead actions | Targets, Starting agreement | Check-in grades | Yes |
| Planning and goals | **Work through a big decision** | What is known against what people believe. | Accounts side by side, Known and unknown, Timeline, Change since last, Blockers, Risks, Lead actions | Themes | Check-in grades | Yes |
| Keeping a read | **Keep a read on live work** | What changed for each person since the last check-in. | Change since last, Blockers, Blocker check, Patterns | Targets, Work plan, Deal grid, Starting agreement, Risks, Coaching, Lead actions, Check-in grades | None | Yes |
| Keeping a read | **Get updates from your team** | Many people answer the same question, in one line each. | Deal grid, Change since last, Blockers, Patterns, Lead actions, Check-in grades | Targets, Work plan, Forecast, Themes, Risks, Coaching | None | **No** |
| Keeping a read | **Work out where to focus** | Everyone’s answers grouped into themes, without losing any single answer. | Themes | Accounts side by side, Known and unknown, Patterns, Lead actions | Check-in grades | **No** |
| Keeping a read | **Take the pulse of the team** | A one-time read, so there is no plan and there are no patterns to show. | Themes | Accounts side by side | Work plan, Patterns, Check-in grades | **No** |
| Keeping a read | **Check how the same role is going** | The same question asked of many people, keeping the answers that stand out. | Targets, Themes, Blockers, Blocker check, Patterns | Deal grid, Person history, Change since last, Coaching, Lead actions, Check-in grades | None | Yes |
| Keeping a read | **Check how an agreement is going** | Whether both sides are doing what they signed. | Starting agreement, Obligations, Change since last, Blockers, Risks, Lead actions | Work plan, Accounts side by side, Patterns | None | **No** |
| About one person | **Support a raise or promotion** | What the person contributed, and what difference it made, from the record. | Targets, Person history, Patterns | Deal grid, Starting agreement, Accounts side by side, Lead actions | Check-in grades | Yes |
| About one person | **Check in before a renewal** | What was promised against what happened, from both sides. | Starting agreement, Accounts side by side, Known and unknown, Obligations, Person history, Risks, Lead actions, Blocker check, Where the time went, Requirements review, Actions and their results, The other side, Evidence index, Who waited on whom, Commitments followed over time, Pattern history, Contradictions, Busy or moving, Questions for the lead | Targets, Deal grid, Patterns | Check-in grades | Yes |
| About one person | **Help someone get back on track** | Both accounts first. Nothing is concluded until the people responsible decide. | Starting agreement, Accounts side by side, Person history, Change since last, Coaching, Lead actions, Blocker check, Where the time went, Requirements review, Actions and their results, The other side, Evidence index, Who waited on whom, Commitments followed over time, Pattern history, Contradictions, Busy or moving, Questions for the lead | Targets, Work plan, Deal grid, Known and unknown, Blockers, Patterns | Forecast, Check-in grades | Yes |
| Something has gone off | **Get a project back on track** | When it started going off, and what was tried. | Targets, Work plan, Deal grid, Forecast, Starting agreement, Timeline, Blockers, Risks, Patterns, Lead actions, Blocker check, Actions and their results, The other side, Who waited on whom, Commitments followed over time, Pattern history, Contradictions, Busy or moving | Accounts side by side, Known and unknown, Change since last, Coaching, Check-in grades, Where the time went, Evidence index, Questions for the lead | None | Yes |
| Something has gone off | **See where people see things differently** | Each person’s account, without labelling anyone wrong. | Starting agreement, Accounts side by side, Themes, Lead actions | Targets, Work plan, Known and unknown, Blockers, Risks, Patterns | Check-in grades | Yes |
| Something has gone off | **Make sense of something serious** | What happened in order, and a picture that changes by the hour. | Accounts side by side, Known and unknown, Timeline, Change since last, Blockers, Risks, Lead actions | None | Check-in grades | Yes |
| Open | **Work through something else** | It starts empty. Sections switch on as it becomes clear what the situation is. | Accounts side by side, Known and unknown, Themes | Timeline, Change since last, Blockers, Risks, Patterns, Lead actions | Check-in grades | **No** |

**What the backend must add.** Seven situations on the switchboard are not in the backend yet: handing over a role, checking an agreement before signing, getting updates from your team, taking the pulse of the team, working out where to focus, checking how an agreement is going, and working through something else. An eighth, **connecting goals across teams**, is offered when starting a check-in but is not on the switchboard yet. It needs its row added.

**Backend:** Partly. The backend’s board already chooses its sections by situation, and many match these: differences, dependencies, who owns what, coverage, patterns and what the room is about. Claude Code should match each section here to the backend’s section with the same purpose, add the missing situations, and build only the sections that are missing.

## I. The Groundwork engine: what it must do

The engine is what runs through every module. It must do all of the following, in addition to what the current product already does.

**The core idea.** Groundwork understands enough about the people, the work, the history and the context around you to notice what you don’t. It tells you what it thinks is happening. Then it pushes you towards the conversations, decisions and actions needed to resolve it.

**The 20 characteristics.** “Shown” means the prototype already shows it. “Partly” means some of it. “Missing” means the prototype must add it.

| # | Characteristic | In plain words | In the prototype today | Status |
| --- | --- | --- | --- | --- |
| 1 | Chat-native control | You can do almost anything by talking to Groundwork: change settings, add tasks, empty your head, find information, and start things off | Asking for leave, to-dos, hours, spending and equipment, all confirmed first. Setting up by chat. Answers to questions | Partly. **Missing:** changing settings by chat (“move my check-in to 5pm”), emptying your head in one go, and starting a process by chat (“start a handover for Leila”) |
| 2 | Judgement | It does not just write things down. It works out what matters, what is missing, what is risky, and what needs attention | “What needs you”, “More confident than the evidence allows”, “Why the numbers don’t match” | Shown |
| 3 | Role-aware | It knows your role, what you are responsible for, your goals, and what is expected of you | Levels and reporting lines, the role map and role interview, different first questions for a manager and a new person | Partly. **Missing:** every answer from Ask Groundwork shaped by the asker’s role, not only in the government example |
| 4 | Behavioural intelligence | It notices what someone keeps doing: strengths, weaknesses, avoiding things, putting things off, and whether they follow through | Signals after three check-ins in a row, “What you did well”, the founder’s call that kept being put off | Partly. **Missing:** a person’s own patterns on their You board, told to them first |
| 5 | Coaching | It helps people see and change what is holding them or the organisation back | “One thing for tomorrow”, the coaching tip on the You board | Partly. **Missing:** following up a coaching point over time (“Two weeks ago we talked about raising problems the same day. You have done it three times since.”) |
| 6 | Manager intelligence | It shows a manager who is on track, drifting, blocked or creating risk, with the reasons | The board, signals, suggestions with reasons, the probation review | Shown |
| 7 | Personal history | It remembers what you said, did, promised, missed, worried about and learned | “Yesterday you said…”, your record, commitments, the worry asked at setup | Partly. **Missing:** what you learned, kept and brought back |
| 8 | Contextual suggestions | Without being asked, it brings up things from your history that may matter now | “This may be relevant”, from the company’s memory | Partly. **Missing:** suggestions from your own history (“Last time Green Mart said yes, the deposit took three weeks. You may want to ask for it now.”) |
| 9 | Social and context awareness | It understands how an action or decision affects other people and the situation around it | Waiting on other teams, where a blocker started, help nobody mentioned | Partly. **Missing:** telling someone who their delay affects (“If this slips, Kevin cannot finish the reply”) |
| 10 | Cross-person intelligence | It compares patterns across people, roles, teams and time | The same problem in five teams, what new people keep asking, counties compared without ranking | Shown |
| 11 | Cross-reference | It connects conversations, documents, goals, decisions, tasks, people and events | Proof from documents and payments, links between check-ins, the blocker trace | Partly. Check-ins are linked as records (request 18); goals and decisions are not |
| 12 | Pattern detection | It finds patterns that only show across weeks, months, people or conversations | 49 kinds of pattern, shown after three periods | Shown |
| 13 | Synthesis | It turns scattered information into one clear picture, and explains what it means | Reports, “In short”, “Where the matter stands” | Shown |
| 14 | Institutional memory | It keeps the organisation’s context: decisions and why they were made, relationships, promises and lessons | Learnings, commitments, “tried before”, the handbook, decisions with reasons | Shown |
| 15 | Learning | It uses what happened before to shape future decisions, coaching and action | “Tried before”, and the backend asking afterwards whether an outcome was right | Partly. **Missing:** “Last time we decided this, here is what happened”, shown when a similar decision comes up |
| 16 | Resolution | It moves a situation from unclear, to understood, to options, to a decision, to action, to checking it happened, instead of leaving it to sit | “Where this is heading”, “One question to answer”, ending a check-in with an outcome | Partly. **Missing:** one view that shows where each open issue is on that path |
| 17 | Hard-conversation forcing | It notices when something is being avoided, left unclear, or argued over for too long, and pushes the person towards the conversation that needs to happen | Nothing yet | **Missing** |
| 18 | Decision forcing | It notices when the organisation keeps circling a decision, shows the competing views, and pushes for a clear choice and an owner | “One question to answer”, and decisions waiting on the board | Partly. **Missing:** noticing the circling (“This has come up in 4 check-ins with no decision and no owner”) |
| 19 | Accountability loop | It remembers what was decided, checks what happened, and brings unfinished promises back into the conversation | Commitments followed up in the next check-in | Partly. **Missing:** following up decisions (“On 12 September you decided to move the customer records to Brian. Has it happened?”) |
| 20 | Proactive intervention | It does not wait to be asked. It speaks up when you should know something, think again, follow up or act | Today’s “What needs you”, reminders | Partly. **Missing:** Groundwork starting a short message on its own, outside the check-in, when something needs you now |

**The limits that keep this safe.** A tool that notices behaviour and pushes people could easily feel like being watched. These limits stop that:

1. **It pushes, but never decides.** Groundwork suggests the conversation, the decision or the next step, and says why. A person always chooses.
2. **It tells the person first.** A pattern about someone, such as putting things off, is shown to them before, or at the same time as, their manager. It is never shown only behind their back.
3. **Signals, not labels.** It says what happened and what would change it: “The distributor call has been put off for two weeks.” Never “Daniel procrastinates”.
4. **Proof first.** Every judgement says what it rests on: proof, someone’s word, or memory.
5. **Private things stay private.** Questions to Ask Groundwork, own reports, private notes and each person’s load are never shown to anyone else.
6. **It can be told “not now”.** Every push can be put off or dismissed, and Groundwork remembers not to repeat it straight away.
7. **Speaking up is rare and useful.** It only starts a message on its own when something really needs the person now, and never more than once a day.

**What the prototype must add.** These are the missing pieces from the table, each shown with a real example from the demo:

| # | Add | Example | Belongs to |
| --- | --- | --- | --- |
| 1 | Change settings by talking | “Move my check-in to 5pm.” Groundwork says it back and asks “Is that right?” | D1 Ask Groundwork |
| 2 | Empty your head in one go | Miriam types a messy list. Groundwork sorts it into to-dos, claims to check, and questions for Wairimu, and asks her to confirm each | D1 Ask Groundwork |
| 3 | Start a process by talking | “Start a handover for Leila.” Groundwork opens the handover page and asks what is missing | D1 Ask Groundwork, B6 |
| 4 | Answers shaped by your role | A lead and a sales rep ask “What should I do today?” and get different, fitting answers | D1 Ask Groundwork |
| 5 | Your own patterns, told to you first | On Daniel’s You board: “For three weeks, calls that need a difficult ask have been moved to next week.” | C2 The You board |
| 6 | Coaching followed over time | “Two weeks ago we talked about raising problems the same day. You have done it three times since.” | B3, C2 |
| 7 | What you learned, brought back | “In March you said supermarkets need a sample first. Lakeside hasn’t had one.” | B3 |
| 8 | Suggestions from your own history | “Last time Green Mart said yes, the deposit took three weeks. You may want to ask for it now.” | B3, D1 |
| 9 | Who your delay affects | “If this slips past Wednesday, Kevin cannot finish the reply.” | B3, D3 |
| 10 | Last time we decided this | When the Q4 discount comes up again: “In Q2, a discount raised deposits 10% but cut margin 6%.” | B5, D2 |
| 11 | Where each open issue stands | One view on the board: unclear, understood, options, decided, being done, checked | B5 |
| 12 | **Hard-conversation forcing** | For three weeks, Wairimu and Brian have counted Mama Fresh differently, and nobody has raised it. Groundwork tells Wairimu: “You and Brian see this differently, and it has not been talked about for three weeks. It affects 4 sales. Here is a way to start the conversation.” It gives her an opening line, the facts, and Brian’s view if he shared it | B5, and the conversation prep card from the master reference |
| 13 | Decision forcing | “Whether a price range counts as money ready has come up in 4 check-ins. Nobody has decided and nobody owns it. Who should decide, and by when?” | B5 |
| 14 | Decisions followed up | “On 12 September you decided to move the customer records to Brian. Has it happened?” | B5, B3 |
| 15 | Groundwork speaking up on its own | A short message outside the check-in, on the web or WhatsApp: “Westgate still hasn’t paid, and their buyer is in today. Do you want to call?” | C1 Today, F1 |

**Now in the prototype.** All 15 are built into the working demo and drawn on the canvas (Phase 15, the engine). Where to see them:

- **1 to 4:** in Ask Groundwork. Try “Move my check-in to 5pm”, a messy list separated by commas, “Start a handover for Tom”, and “What should I do today?” as Wairimu and then as Miriam.
- **5 to 9:** on the You board (#/you), as Daniel and as Miriam.
- **10 to 14:** “Open issues” on the sales board, as Wairimu.
- **15:** at the top of Miriam’s Today page.

The demo only understands example sentences like these. The real engine must understand any way people say them.

**Backend.** The engine already has many of the pieces: what each person is owed, their commitments, patterns, positive patterns, a coaching block, role questions, and “what does not add up”. **Missing:** following up decisions and coaching, avoidance and circling as patterns, starting a message on its own, and changing settings or starting processes through chat.

## H. Demo-only: do not build these

These exist only so the prototype can be shown. The real product must not have them.

- The persona switcher, the “Go to” list and the dark bar at the top.
- The board scenario switcher, “Day one” and “Report shared” switches.
- All sample data, including Baridi, Kijani and the example people.
- The canvas switch, and the “From the canvas” list of pages.

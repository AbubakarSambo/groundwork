# Groundwork: user journey tests and page audit

> From Hafsah, 6 October 2026. Use this to find every problem a real person would meet, before anything new is built. Two parts: **journey tests** (does each flow work, end to end, for each kind of person?) and a **page audit** (does each page make sense on its own?). Record every problem in the bug log at the end.

## How to run this

- **Run every journey the way a person really would:** screens in a real browser (Playwright), WhatsApp through the signed test webhook, and emails by reading what actually arrives in the local mail catcher. Scheduled things (reminders, daily summaries, closing) are run by moving the clock, never by calling code directly.
- **Every journey runs as each role it names, on desktop (1440), laptop (1280 and 1024) and phone width,** unless it is WhatsApp-only.
- **Watch for hidden errors too:** the server logs and the browser's console during every journey. An error there is a bug even if the page looks fine.
- **Start from a clean install** with the test organisations below, and once on a scrambled copy of real data if available.
- **A journey passes only if** every "works when" line is true, nothing is confusing, nothing private reaches the wrong person, and no error appears in the logs.

## Test organisations

| Name | What it is |
| --- | --- |
| New org | Brand new, on the one-month trial, nothing set up. |
| Client org | Like the paid client: a sales team, an onboarding check-in and a project check-in, suites on, WhatsApp on, about 15 people. |
| Big org | 100 people, many check-ins and requests, several approvers handling dozens of requests. |
| Existing org | Copied from an existing client's shape: old check-ins, some stalled, some people with no name or number, made before this rebuild. |
| Second org | Shares one person with Client org, to test someone in two organisations. |

## Part 1: journey tests

Each journey has an ID, the roles and channels to run it in, its steps, and what "working" means.

### Admin

**A1. Sign up and create the organisation** (browser, all widths)
Steps: open the front page → sign up with an email link, then again with a password → accept the suggested organisation name → land on Today.
Works when: the name is suggested from the email domain and can be changed; the one-month trial is shown plainly; someone else from the same company domain is offered to join; nothing asks for anything twice.

**A2. Add and manage people** (browser)
Steps: invite three people by email → give one a different role → add WhatsApp numbers for two → set who can start check-ins → turn on "check-ins wait for an admin".
Works when: invitations arrive with the right wording; people waiting to be let in are shown separately and never counted as answered; no email address appears anywhere in place of a name; a member cannot resend an invitation in the lead's name.

**A3. Approve a waiting check-in** (browser, email)
Steps: a lead creates a check-in → the admin is told → approves it.
Works when: the lead's setup answers are all kept; invitations go out exactly once, after approval; the "waiting for an admin" note disappears.

**A4. Suites** (browser)
Steps: switch on leave, finance requests, timesheets and performance reviews → set approval rules and a spending limit.
Works when: each suite appears for the right people; approvals go to the line manager, or an admin where there is none; spending over the limit goes to the person the rule names.

**A5. Plan and billing** (browser)
Steps: open Plan and billing on the trial → look at the WhatsApp add-on → choose a plan with the Stripe test card.
Works when: prices come from the system, not the page; nothing is charged during the trial; the add-on shows its price and limit; a free-plan organisation is never called "Starter".

**A6. Company page** (browser)
Works when: priorities, owners, "where the strategy isn't reaching the work" and "what more than one team named" all show for Client org; an admin sees the figures; a participant sees only the priorities and owners; a guest is refused.

**A7. Back office WhatsApp page** (browser, Groundwork staff only)
Steps: enter the number, IDs and secrets → copy the webhook address → send a test message.
Works when: secrets show only as "Set" or "Not set"; anyone who isn't staff is refused; the test message arrives.

### Lead

**L1. Start a check-in** (browser, all widths) for sales, onboarding and project
Steps: describe the situation in the entry chat → paste a plan, and separately add a document → confirm what Groundwork says back → set a target as an aim and one as a limit → write a question for one person and confirm its exact wording.
Works when: it opens on what's already known, not a greeting; every target lands on the right person, or on nobody if unclear; nothing is invented; nothing is saved until the lead says yes.

**L2. Invite the team and do the first check-in** (browser, email)
Works when: invitation emails mention WhatsApp; the lead's own first check-in happens separately from the setup.

**L3. During the check-in** (WhatsApp, email, browser)
Steps: move the clock through a week with some people answering and some not.
Works when: the lead gets at most one routine message a day, and only when something changed; Today shows what needs them; Groundwork chases people itself; nobody gets a flood.

**L4. Read the board and reports** (browser, all widths) for each kind of work
Works when: the board follows the prototype for that kind of work; each person's side is there; quotes are word for word; the judgement is true to what was said, in plain sentences; patterns appear only after the person has seen theirs; coaching is shown; the lead can release the report; nothing private from another check-in appears.

**L5. Approvals** (browser, WhatsApp)
Steps: receive a leave and a finance request → approve one in the app → decline one by replying on WhatsApp.
Works when: the person is told the decision; a request arriving with others is gathered into one message; nothing waits silently.

**L6. Performance review** (browser)
Works when: the review starts only from the suite; the person sees the facts and the decision with its reasons, never colleagues' exact words; they can add their side or appeal; an admin decides appeals.

**L7. Ask** (browser, WhatsApp)
Steps: ask about the company, about a person's work, and about a check-in → add context → add a document.
Works when: it's named after the organisation; it answers across the organisation, not just one check-in; anything added is said back and confirmed first; questions stay private.

**L8. End or extend a check-in** (browser)

### Team member

**M1. Join** (email, browser, phone)
Steps: open the invitation → sign in with the link → arrive at the first check-in.
Works when: it's obvious what to do; nothing forces them to connect WhatsApp; the invitation's wording about who reads what is true.

**M2. Check in** (browser and WhatsApp, separately)
Steps: answer a full check-in, including a photo and a document → Groundwork says it's done → write "finish" → read their own report.
Works when: one question at a time; it follows up on last time; nothing is lost if they stop halfway; their report arrives; they're never shown the lead's private notes or setup.

**M3. Reminders** (WhatsApp, email)
Works when: reminders come on time and say something useful; "not now" and "stop" work instantly; a reply to a check-in's opening message goes straight into that check-in.

**M4. Requests** (browser, WhatsApp)
Steps: mention leave in a check-in → accept the offer → the form opens filled in → send it; then ask for spending in Ask.
Works when: the form is filled in correctly; the request reaches the right approver; they're told the decision.

**M5. Their own view** (browser)
Works when: their report, commitments, any pattern about them (seen first, with a chance to answer) and recognition all show; nothing about a colleague's hidden number appears.

**M6. Ask** (browser, WhatsApp)

### Existing clients

**E1. After the release** (browser, email, using Existing org)
Works when: scheduled check-ins carry on unchanged; old check-ins show on the new boards and reports with nothing lost; stalled check-ins send no messages; the Company page, suites and Ask work for them; nothing is worse than before.

### Situations to repeat across journeys

- Someone with two check-ins open on WhatsApp.
- Someone in two organisations.
- An expired sign-in or invitation link.
- A wrong or unknown WhatsApp number writing in.
- Someone waiting for a seat.
- A 100-person organisation with dozens of requests per approver.
- Breaking it on purpose: double-clicking, the back button, refreshing halfway, two tabs, a slow connection, very long names, names in other scripts, phone numbers typed different ways.
- Privacy: every board, report, Today page and Ask answer viewed as the admin, the lead, a team member, a colleague and a guest.

## Part 2: page audit

For every page in the product, as each kind of person who can see it, at desktop and phone width:

1. **Take a screenshot** and save it as `<number>-<page>-<role>-<width>.png`.
2. **Fill in one row per page and role:**

| Field | What to write |
| --- | --- |
| Page | Its name and address |
| Who can see it | Admin, lead, team member, guest, staff |
| What it's for | One plain sentence. If that's hard to write, that's a finding. |
| How people get here | Every link, button, email, WhatsApp message or notification that leads here |
| Where people go next | Where each button and link takes them; whether there's always a way back |
| Its one main action | The single thing most people should do here |
| What doesn't make sense | Anything confusing, contradictory, empty, repeated, untrue or not like the prototype |

3. **Then look across all the rows for:**
- **Pages nobody can reach.**
- **Pages with no way out.**
- **Two pages doing the same job.**
- **Pages that make sense to one role but not another.**
- **Pages that look different from the prototype** in type, colour, spacing or layout.

## Bug log

For every problem, one entry:

| Field | What to write |
| --- | --- |
| ID | B-001, B-002, … |
| Where | Journey ID or page |
| Who | Role and channel |
| What happened | One or two plain sentences |
| What should happen | One plain sentence |
| How serious | Privacy · Stops someone using it · Wrong information · Confusing · Cosmetic |
| Screenshot or log | File name |
| Fixed | Commit, and the test that now proves it |

Fix privacy first, then anything that stops someone using it, then wrong information, then confusing, then cosmetic. Every fix gets a test that fails without it.

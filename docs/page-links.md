# Page links: where every button goes, and what leads to each page

Part of the second, deeper page audit (9 October 2026, `wip/prototype-ui`). Read with `docs/page-audit.md` (summary at the top) and the findings B-122 onward in `docs/bug-log-screens.md`.

**How this was made.** Every page below was opened in a real browser against the local API (port 3000) and client (port 5173), as the admin Naomi (naomi@kijani.test), the lead Tendai (tendai@kijani.test), the member Esther (esther@kijani.test), the guest from another organisation Amina (amina@suites.test, who is admin of Suites Test Company), and signed out, at 1440 and 390 wide. Every link and button on the screen was read from the page itself; buttons that do not change anything were also pressed at 1440 to see where they go. "What leads here" comes from every `navigate()`, `to=` and `href=` in `client/src` (tests left out), every link the API writes into an email or a WhatsApp message (`api/src/modules`), and the side menu, the phone bar and the More menu.

**The side menu and phone bar are on every signed-in page** and are not repeated in each section. Admin: Start a check-in, Jump to, Check-ins (each check-in, All check-ins), Today, Company, You, Boards, People, Connections, Suites, Plan and billing, and the name menu (Your settings, Talk to us, Sign out). Lead: the same without People, Connections and Plan and billing. Member: Check-ins, Today, Company, You, and the name menu; no Start a check-in, no Boards, no Suites. Phone bar: Today, Check-ins, Start (not for a member, who gets Company instead), Chat, More. The Groundwork logo goes to https://myground.work, the public site, from every page, signed in or not. "Feedback" (bottom right) opens a feedback box on every signed-in page.

Breadcrumbs at the top of a page ("Suites / Leave requests") link back to the page they name, and are not repeated below. Screenshots, on this computer only: `docs/page-audit/deep/<page>-<role>-<width>.png`, and for each tab `<page>~<tab>-<role>-<width>.png`.

## What the map shows

Nothing here has been fixed yet. Hafsah reads the summary first.

### Dead ends: a page with no way back or forward

- Every switched-off suite, for the admin, who is told "An admin switches it on under Suites." with no link (B-122).
- "Your requests" for anybody who wants to ask for leave or money: no button and no word on how (B-123).
- "See or change its settings" on Suites, which only says nothing can be changed (B-124).
- Company and Company context: nothing to press on a priority or a question (B-125).
- "Back" on Request a call, Add sessions and a refused report, opened from a link: an empty browser page (B-126).
- The lead's "See plans" opens Plan and billing, which refuses him (B-127).
- The check-in conversation when it cannot open: only "Try again", which cannot work (B-129).
- Broken sign-in, set-password and reset links: no "Sign in" (B-130). Stop reminders and Unsubscribe with a bad link: nothing to press (B-131).
- Pricing, signed out: no logo, sign-in or sign-up, only "Subscribe" (B-162).

### Pages nobody can reach from inside the product

- `/suite/leave/new` and `/suite/spend/new`: no link anywhere (B-123).
- `/join`: no link and no email (already noted in the first audit, row 05).
- `/settings/whatsapp`: linked from Connections only when WhatsApp is shown there, and Kijani Foods' Connections does not mention WhatsApp (B-144).
- `/boards` for a member: works, but is in neither her side menu nor her More menu (B-146).
- `/billing/checkout`: Plan and billing showed no button for it in this data, so it was reached only by its address (B-145).
- `/grounds/:id/report/week` ("This week"): the check-in page links it only in some states, and no link to it was on screen anywhere in this data; it says one sentence when there is nothing (B-170).
- `/preview/reports`, `/start/team` and `/answer` are reached only from outside (staff, a shared link, a QR code), as the first audit found.

### Buttons that go somewhere unexpected

- Lead, "See plans" to a refusal (B-127). Member, "Start my check-in" on a report to a page with nothing open (B-142).
- Admin, opening a check-in she does not run lands on Context and resources, not the board (B-143).
- Connections: eleven different buttons all open `/settings/tools` (B-144).
- Links the API sends to connected tools point at addresses the client does not have: `/check-in/<id>`, `/handovers/<id>`, `/suggestions/<id>`, `/findings`, `/proposed-changes/<id>` (B-128).
- "Something here isn't right" on the lead's done page opens a new correction session at a different address (`/checkin/e0714ea0…`); "See the shared picture for this session" on the lead's report opens another session's conversation (`/checkin/a73dd590…`) rather than the team's report.
- The Groundwork logo, on every page and for everyone signed in, leaves the product for the public site, https://myground.work.

### How many presses the main jobs take (from Today, at 1440)

| Job | Who | Presses | Note |
| --- | --- | --- | --- |
| Start a check-in | Lead, admin | 1 ("Start a check-in" in the side menu), then the conversation | Fine. A member is refused, rightly. |
| Answer a check-in | Member | 0 from the email; 2 in the product (Check-ins, then the check-in, which opens on its Check-in tab) | Today does not list an open check-in for her in this data. |
| Read your own report | Member | 2 (You, then "Read") or 4 (Check-ins, the check-in, Board, "Read your own report") | The prototype puts it on Today: 1 press (B-160). |
| Approve a request | Admin | 2 ("Look at it", then "Approve") | Fine. |
| Invite a person | Admin | 1 (People), then type and "Send their invitations" | Fine. Into one check-in: 3 (the check-in, People and setup, "Add people"). |
| Change a setting: days of leave, review cadence, a budget | Admin | Not possible from any page (B-124) | "See or change its settings" says it cannot be changed. |
| Ask for leave | Member | No button anywhere; open Chat and type it (B-123) | The forms exist but nothing links to them. |
| Change your own setting | Anyone | 2 (your name, then Your settings) | Fine. |

### The audit itself changed some data on this computer

The click test pressed only buttons whose words did not suggest a change, but four presses did change this computer's local database: on One person, pressing "Admin" and then "Can open check-ins" changed Esther Adeyemi's role at once (now `LEAD`, was `MEMBER`, B-169); the Check-in tab's "What am I missing?" and "Review my goals" sent those questions to Ask as Tendai; and "Something here isn't right" on Tendai's done page opened a correction session. Putting Esther's role back was refused by this computer's safety settings, so it is left for Hafsah. Views of Esther taken late in the run may show her with the new role.

## Root, `/`

### Where it goes

**Admin (Naomi).** Opening `/` landed on `/today`.

- "Look at it": goes to `/suite/queue?suite=spend`.
- "Your own leave and spending requests": goes to `/suite/mine`.
- "See everything waiting for you to decide": goes to `/suite/queue`.
- "Do it": goes to `/org/members`.
- "The second check-in for Get a project back on track opens.": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`. (beside the main column)

**Signed out.**

- "Start a check-in": goes to `/start`.
- "Sign in": goes to `/auth`.

### What leads here

- In the product: home/EntryChat, home/OnboardingChat, join/JoinByLinkPage, mail/StopMailPage, prompts/PromptVersioningPage.

## Sign in, `/auth`

### Where it goes

**Signed out.**

- "Show": stays on the page and shows "Hide".
- "Sign in": not pressed, because it changes something.
- "Email me a sign-in link instead": not pressed, because it changes something.
- "Forgot password?": stays on the page and shows "Forgot your password? / We’ll email you a link to choose a new one. It works for an hour. / Email me a reset link / Back to sign in".
- "New here? Sign up": stays on the page and shows "Create your account / We send you a link to confirm your email. Your account is made when you open it. / Your name / Your organisation (optional) / What your or".

### What leads here

- In the product: App, gw/AppShell, gw/LinkProblem, auth/GoogleFailedPage, auth/LinkExpired, auth/SignOutPage, billing/PricingPage, chat/ChatPage, enter/EntryChatPage, home/HomePage, invite/InvitePage, join/AnswerFirstPage, join/JoinByLinkPage, ops/TheBackOfficeHasADoor, settings/SettingsPage.

## Check your email, `/auth/sent`

### Where it goes

**Signed out.**

- The sign-in page, the same as in the Sign in section. Signing in continues to this page.

### What leads here

- In the product: home/SaveCard.

## Signed out, `/signout`

### Where it goes

**Signed out.**

- "Sign in again": goes to `/auth`.
- "Go to the home page": goes to `https://myground.work`.

### What leads here

- In the product: gw/AppShell, join/WaitingForAnAdminPage, more/MorePage, settings/SettingsPage.

## Confirm your email (link from mail), `/verify-email`

### Where it goes

**Signed out.**

- "Send me a new link": not pressed, because it changes something.

### What leads here

- In the product: nothing links here.
- Email and WhatsApp: Sign-in link, sign-up and confirm-your-email mails (`email.service.ts`); Google sign-in for a new account (`auth.controller.ts`).

## Google sign-in did not finish, `/google-failed`

### Where it goes

**Signed out.**

- "Email me a sign-in link": goes to `/auth?mode=member`.

### What leads here

- In the product: auth/AuthPage, auth/GoogleCallbackPage.
- Email and WhatsApp: Google sign-in redirect from the API when it fails (`auth.controller.ts`).

## Set a password, `/set-password`

### Where it goes

**Signed out.**

- "Send me a new link": not pressed, because it changes something.

### What leads here

- In the product: auth/MagicVerifyPage.
- Email and WhatsApp: Invited-person and new-admin mails, "Set password" (`email.service.ts`).

## Reset a password, `/reset-password`

### Where it goes

**Signed out.**

- "Send me a new link": not pressed, because it changes something.

### What leads here

- In the product: nothing links here.
- Email and WhatsApp: Forgot-password mail (`email.service.ts`).

## Start a check-in, `/start`

### Where it goes

**Admin (Naomi).**

- "See plans": goes to `/billing`.
- "Send": cannot be pressed yet.
- "See every situation": stays on the page and shows "What do you want people to check in about? / Say it in your own words, or start from one of the situations below. Either way, it’s set up as you talk, and nothi".

**Lead (Tendai).**

- "See plans": goes to `/billing`.
- "Send": cannot be pressed yet.
- "See every situation": stays on the page and shows "What do you want people to check in about? / Say it in your own words, or start from one of the situations below. Either way, it’s set up as you talk, and nothi".

**Member (Esther).**

- "Back to your check-ins": goes to `/grounds`.

**Guest from another organisation (Amina).**

- "Send": cannot be pressed yet.
- "See every situation": stays on the page and shows "What do you want people to check in about? / Say it in your own words, or start from one of the situations below. Either way, it’s set up as you talk, and nothi".

**Signed out.**

- "Sign in": goes to `/auth`.
- "Track the team’s targets for the quarter": stays on the page; nothing visible changes.
- "Sales are behind and I don’t know why": stays on the page; nothing visible changes.
- "A new hire starts on Monday": stays on the page; nothing visible changes.
- "Someone isn’t delivering": stays on the page; nothing visible changes.
- "We have to choose a supplier": stays on the page; nothing visible changes.
- "Continue": cannot be pressed yet.
- "See every situation": stays on the page and shows "What do you want people to check in about? / Say it in your own words, or start from one of the situations below. Either way, it’s set up as you talk, and nothi".

### What leads here

- In the product: App, gw/AppShell, auth/GoogleCallbackPage, auth/MagicVerifyPage, board/BoardPage, enter/EntryChatPage, grounds/CreateGroundPage, grounds/GroundsListPage, grounds/an-admin-lands-on-a-check-in-list, home/HomePage, org/OrgNewPage, suites/OnboardingBoardPage.
- Email and WhatsApp: "A test check-in moves on" mail; the invite-bounced fallback (`/grounds/new`, redirected here).

## Help my team understand (old door), `/start/team`

### Where it goes

**Lead (Tendai).** Opening `/start/team` landed on `/start?scenario=HELP_TEAM_UNDERSTAND`.

- "Start over": stays on the page; nothing visible changes.
- "See plans": goes to `/billing`.
- "+ Doc": stays on the page and shows "Paste text / Upload file / Cancel / Add document and let Groundwork read it".
- "Send": cannot be pressed yet.

**Signed out.** Opening `/start/team` landed on `/start?scenario=HELP_TEAM_UNDERSTAND`.

- "Sign in": goes to `/auth`.
- "Start over": stays on the page; nothing visible changes.
- "+ Doc": stays on the page and shows "Paste text / Upload file / Cancel / Add document and let Groundwork read it".
- "Send": cannot be pressed yet.

### What leads here

- In the product: nothing links here.

## Invitation, `/invite`

### Where it goes

**Signed out.**

- "Sign in instead": not pressed, because it changes something.
- "What is Groundwork?": goes to `https://myground.work`.

### What leads here

- In the product: nothing links here.
- Email and WhatsApp: Check-in invitation email (`email.service.ts` buildInviteUrl, the invite and resend mails); the leads' report follow-up mail (`the-report-follow-up.ts`).

## Join link (old), `/join`

### Where it goes

**Signed out.**

- "Sign in instead": not pressed, because it changes something.
- "What is Groundwork?": goes to `https://myground.work`.

### What leads here

- In the product: nothing links here.

## Answer without an account, `/answer`

### Where it goes

**Signed out.**

- "Sign in": goes to `/auth`.
- "go to the Groundwork home page": goes to `https://myground.work`.

### What leads here

- In the product: nothing links here.

## Join link confirmation, `/join/confirm`

### Where it goes

**Signed out.**

- "Sign in instead": not pressed, because it changes something.
- "What is Groundwork?": goes to `https://myground.work`.

### What leads here

- In the product: nothing links here.
- Email and WhatsApp: Join email, "Start my check-in" (`email.service.ts` line ~1514).

## Waiting to be let in, `/join/waiting`

### Where it goes

**Admin (Naomi).** Opening `/join/waiting` landed on `/today`.

- "Look at it": goes to `/suite/queue?suite=spend`.
- "Your own leave and spending requests": goes to `/suite/mine`.
- "See everything waiting for you to decide": goes to `/suite/queue`.
- "Do it": goes to `/org/members`.
- "The second check-in for Get a project back on track opens.": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`. (beside the main column)

**Lead (Tendai).** Opening `/join/waiting` landed on `/today`.

- "Your own leave and spending requests": goes to `/suite/mine`.
- "The second check-in for Get a project back on track opens.": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`. (beside the main column)

**Member (Esther).** Opening `/join/waiting` landed on `/today`.

- "Your own leave and spending requests": goes to `/suite/mine`.

**Guest from another organisation (Amina).** Opening `/join/waiting` landed on `/today`.

- "Open it": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`.
- "Look at it": goes to `/suite/queue?suite=leave`.
- "Look at it": goes to `/suite/queue?suite=spend`.
- "Your own leave and spending requests": goes to `/suite/mine`.
- "See everything waiting for you to decide": goes to `/suite/queue`.
- "Do it": goes to `/org/members`.
- "The second check-in for Get a new project off to a good start opens.": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`. (beside the main column)
- "The second check-in for a colleague, first 90 days opens.": goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e`. (beside the main column)
- "The second check-in for Amina's project check-in opens.": goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720`. (beside the main column)
- "The second check-in for Amina's project check-in, from 7 October opens.": goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690`. (beside the main column)

### What leads here

- In the product: invite/InvitePage, join/JoinByLinkPage, join/JoinConfirmPage.

## Create an organisation, `/org-new`

### Where it goes

**Admin (Naomi).**

- "Create it": not pressed, because it changes something.
- "Cancel": goes to `about:blank`.

**Lead (Tendai).**

- "Create it": not pressed, because it changes something.
- "Cancel": not pressed, because it changes something.

**Member (Esther).**

- "Create it": not pressed, because it changes something.
- "Cancel": not pressed, because it changes something.

**Guest from another organisation (Amina).**

- "Create it": not pressed, because it changes something.
- "Cancel": not pressed, because it changes something.

### What leads here

- In the product: App, gw/your-organisations, auth/GoogleCallbackPage, org/WelcomePage.

## Choose an organisation, `/orgs`

### Where it goes

**Admin (Naomi).**

- "KF Kijani Foods Admin 1 new": goes to `/today`.
- "Join or create another": goes to `/welcome`.

**Lead (Tendai).**

- "KF Kijani Foods Can open check-ins": goes to `/today`.
- "Join or create another": goes to `/welcome`.

**Member (Esther).**

- "KF Kijani Foods Takes part": goes to `/today`.
- "Join or create another": goes to `/welcome`.

**Guest from another organisation (Amina).**

- "ST Suites Test Company Admin 4 new": goes to `/today`.
- "Join or create another": goes to `/welcome`.

### What leads here

- In the product: App, gw/your-organisations.

## Where do you work?, `/welcome`

### Where it goes

**Admin (Naomi).**

- "Create": goes to `/org-new`.

**Lead (Tendai).**

- "Create": goes to `/org-new`.

**Member (Esther).**

- "Create": goes to `/org-new`.

**Guest from another organisation (Amina).**

- "Create": goes to `/org-new`.

### What leads here

- In the product: App, gw/OrganisationChoices, org/OrgsPage.

## Organisation invite link, `/j/:code`

### Where it goes

**Member (Esther).**

- "Sign in": not pressed, because it changes something.
- "Go to the Groundwork home page": goes to `/`.

**Signed out.**

- "Sign in": not pressed, because it changes something.
- "Go to the Groundwork home page": goes to `/`.

### What leads here

- In the product: nothing links here.

## Check-ins, `/grounds`

### Where it goes

**Admin (Naomi).**

- "Start a check-in": goes to `/start?new=1`.
- "Fatou Diallo’s handover": goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741`.
- "The move that saved the week": goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5`.
- "The quarter’s plans and what they cost": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`.
- "How the depot week is going": goes to `/grounds/1b60cd34-cb80-488a-a9bc-6dc2076fbf9d`.
- "Where the partnerships work went": goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406`.
- "The new stock system, four depots": goes to `/grounds/4ab79d9d-be9c-478c-b576-1d712b336055`.
- "Weekly sales push, Nairobi": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Get a project back on track": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`.

**Lead (Tendai).**

- "Start a check-in": goes to `/start?new=1`.
- "Where the partnerships work went": goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406`.
- "Weekly sales push, Nairobi": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Get a project back on track": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`.
- "The quarter’s plans and what they cost": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`.

**Member (Esther).**

- "Weekly sales push, Nairobi": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.

**Guest from another organisation (Amina).**

- "Start a check-in": goes to `/start?new=1`.
- "Amina's project check-in, from 7 October": goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690`.
- "Amina's project check-in": goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720`.
- "Get a new project off to a good start": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`.
- "Wanjiru, first 90 days": goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e`.

**Signed out.** Opening `/grounds` landed on `/auth?next=%2Fgrounds`.

- The sign-in page, the same as in the Sign in section. Signing in continues to this page.

### What leads here

- In the product: App, gw/AppShell, gw/GroundGone, gw/TheCheckInHeader, gw/a-door-you-cannot-open-says-so, gw/nav-items, admin/AdminDashboardPage, admin/AdminPage, auth/MagicVerifyPage, board/BoardPage, boards/TeamBoardsPage, chat/ChatPage, enter/EntryChatPage, grounds/CreateGroundPage, grounds/GroundAdminPage, grounds/GroundParticipantPage, join/WaitingForAnAdminPage, ops/OpsLayout, ops/TheBackOfficeHasADoor, org/LeadsGuidePage, org/OrgNewPage, report/SessionReportPage, report/WeeklyReportPage, suites/SuitesPage.
- Email and WhatsApp: "See your check-ins" mails: heres-what-is-new, who-has-gone-quiet (fallback), the organisation-approved mail, the lead's daily summary on WhatsApp (fallback).

## Today, `/today`

### Where it goes

**Admin (Naomi).**

- "Look at it": goes to `/suite/queue?suite=spend`.
- "Your own leave and spending requests": goes to `/suite/mine`.
- "See everything waiting for you to decide": goes to `/suite/queue`.
- "Do it": goes to `/org/members`.
- "The second check-in for Get a project back on track opens.": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`. (beside the main column)

**Lead (Tendai).**

- "Your own leave and spending requests": goes to `/suite/mine`.
- "The second check-in for Get a project back on track opens.": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`. (beside the main column)

**Member (Esther).**

- "Your own leave and spending requests": goes to `/suite/mine`.

**Guest from another organisation (Amina).**

- "Open it": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`.
- "Look at it": goes to `/suite/queue?suite=leave`.
- "Look at it": goes to `/suite/queue?suite=spend`.
- "Your own leave and spending requests": goes to `/suite/mine`.
- "See everything waiting for you to decide": goes to `/suite/queue`.
- "Do it": goes to `/org/members`.
- "The second check-in for Get a new project off to a good start opens.": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`. (beside the main column)
- "The second check-in for a colleague, first 90 days opens.": goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e`. (beside the main column)
- "The second check-in for Amina's project check-in opens.": goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720`. (beside the main column)
- "The second check-in for Amina's project check-in, from 7 October opens.": goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690`. (beside the main column)

**Signed out.** Opening `/today` landed on `/auth?next=%2Ftoday`.

- The sign-in page, the same as in the Sign in section. Signing in continues to this page.

### What leads here

- In the product: gw/AppShell, gw/nav-items, join/WaitingForAnAdminPage, org/OrgsPage.
- Email and WhatsApp: The lead's daily nudge mail; WhatsApp: a request told on WhatsApp (`a-request-told-on-whatsapp.service.ts`).

## You, `/you`

### Where it goes

**Admin (Naomi).**

- "Open": goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741`.
- "Open": goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5`.
- "Open": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`.
- "Download it": not pressed, because it changes something.

**Lead (Tendai).**

- "Read": goes to `/checkin/1788aa85-5543-47f7-8143-616dd19e3ba3/report`.
- "Read": goes to `/checkin/fa2ccea2-065e-4e49-a5b3-03a5a057d62b/report`.
- "Open": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`.
- "Open": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`.
- "Open": goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406`.
- "Open": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Download it": not pressed, because it changes something.

**Member (Esther).**

- "Read": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`.
- "Open": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Download it": not pressed, because it changes something.

**Guest from another organisation (Amina).**

- "Read": goes to `/checkin/4e34991a-2b8c-4853-bfcb-8ae57aeaf823/report`.
- "Read": goes to `/checkin/55906f06-0230-4eaa-8756-977c95082002/report`.
- "Read": goes to `/checkin/ae3c63f6-a846-49c3-a0a1-9da51bb79d25/report`.
- "Read": goes to `/checkin/9811272b-a7cc-4b74-bb8a-d45d7aeb78ee/report`.
- "Open": goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690`.
- "Open": goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720`.
- "Open": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`.
- "Open": goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e`.
- "Download it": not pressed, because it changes something.

### What leads here

- In the product: gw/GroundGone, gw/nav-items.
- Email and WhatsApp: The participant's week mail (`the-participants-week.ts`).

## Company, `/company`

### Where it goes

**Admin (Naomi).**

- "Ask about the whole organisation": not pressed, because it changes something.
- "Company context": goes to `/company/context`.
- "Ask about the strategy": not pressed, because it changes something.

**Lead (Tendai).**

- "Ask about the whole organisation": not pressed, because it changes something.
- "Company context": goes to `/company/context`.
- "Ask about the strategy": not pressed, because it changes something.

**Member (Esther).**

- "Ask about the whole organisation": not pressed, because it changes something.
- "Company context": goes to `/company/context`.
- "Ask about the strategy": not pressed, because it changes something.

**Guest from another organisation (Amina).**

- "Ask about the whole organisation": not pressed, because it changes something.
- "Company context": goes to `/company/context`.
- "Ask about the strategy": not pressed, because it changes something.

### What leads here

- In the product: gw/AppShell, gw/nav-items, company/CompanyContextPage.

## Company context, `/company/context`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: company/CompanyPage, suites/SuitesPage.

## Suites, `/settings/suites`

### Where it goes

**Admin (Naomi).**

- "Onboarding" (switch): a switch, not pressed (it changes a setting).
- "Open its board": goes to `/suite/leave`.
- "See or change its settings": stays on the page and shows "These settings were set up another way, so they cannot be changed here yet. Nothing has been changed.".
- "Leave requests" (switch): a switch, not pressed (it changes a setting).
- "Time sheets" (switch): a switch, not pressed (it changes a setting).
- "Open its board": goes to `/suite/reviews`.
- "Performance reviews" (switch): a switch, not pressed (it changes a setting).
- "When someone leaves" (switch): a switch, not pressed (it changes a setting).
- "Role map" (switch): a switch, not pressed (it changes a setting).
- "Open its board": goes to `/suite/spend`.
- "Spending and budgets" (switch): a switch, not pressed (it changes a setting).
- "To-dos" (switch): a switch, not pressed (it changes a setting).
- "Customers and deals" (switch): a switch, not pressed (it changes a setting).
- "Equipment" (switch): a switch, not pressed (it changes a setting).
- "Each check-in": goes to `/grounds`.
- "People": goes to `/org/members`.
- "Company context": goes to `/company/context`.
- "Connections": goes to `/settings/connections`.
- "Your own leave and spending requests": goes to `/suite/mine`.
- "See everything waiting for you to decide": goes to `/suite/queue`.

**Lead (Tendai).**

- "Open its board": goes to `/suite/leave`.
- "Open its board": goes to `/suite/reviews`.
- "Open its board": goes to `/suite/spend`.
- "Your own leave and spending requests": goes to `/suite/mine`.

**Member (Esther).**

- "Your own leave and spending requests": goes to `/suite/mine`.

**Guest from another organisation (Amina).**

- "Onboarding" (switch): a switch, not pressed (it changes a setting).
- "Open its board": goes to `/suite/leave`.
- "See or change its settings": not pressed, because it changes something.
- "Leave requests" (switch): a switch, not pressed (it changes a setting).
- "Time sheets" (switch): a switch, not pressed (it changes a setting).
- "Open its board": goes to `/suite/reviews`.
- "Performance reviews" (switch): a switch, not pressed (it changes a setting).
- "When someone leaves" (switch): a switch, not pressed (it changes a setting).
- "Role map" (switch): a switch, not pressed (it changes a setting).
- "Open its board": goes to `/suite/spend`.
- "Spending and budgets" (switch): a switch, not pressed (it changes a setting).
- "To-dos" (switch): a switch, not pressed (it changes a setting).
- "Customers and deals" (switch): a switch, not pressed (it changes a setting).
- "Equipment" (switch): a switch, not pressed (it changes a setting).
- "Each check-in": goes to `/grounds`.
- "People": goes to `/org/members`.
- "Company context": goes to `/company/context`.
- "Connections": goes to `/settings/connections`.
- "Your own leave and spending requests": goes to `/suite/mine`.
- "See everything waiting for you to decide": goes to `/suite/queue`.

### What leads here

- In the product: gw/nav-items, lib/suite-is-off, grounds/EndingPage, grounds/an-admin-lands-on-a-check-in-list, suites/CustomersPage, suites/EquipmentPage, suites/LeavingBoardPage, suites/OnboardingBoardPage, suites/ReviewPage, suites/RoleMapPage, suites/TimeSheetsPage, suites/TodosPage.

## Onboarding board, `/suite/onboard`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/SuitesPage.

## Your requests, `/suite/mine`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/LeaveRequestNewPage, suites/SpendRequestNewPage, suites/SuitesPage, today/TodayPage.

## Request leave (form), `/suite/leave/new`

### Where it goes

**Admin (Naomi).**

- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

**Lead (Tendai).**

- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

**Member (Esther).**

- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

**Guest from another organisation (Amina).**

- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

### What leads here

- In the product: nothing links here.

## Ask to spend money (form), `/suite/spend/new`

### Where it goes

**Admin (Naomi).**

- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

**Lead (Tendai).**

- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

**Member (Esther).**

- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

**Guest from another organisation (Amina).**

- "Not sure Fuel Travel Equipment": not pressed, because it changes something.
- "Send": cannot be pressed yet.
- "Your requests": goes to `/suite/mine`. (beside the main column)

### What leads here

- In the product: nothing links here.

## Leave requests board, `/suite/leave`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- "Ask a question": not pressed, because it changes something.
- "Approve": not pressed, because it changes something.
- "Decline": not pressed, because it changes something.

### What leads here

- In the product: suites/SuitesPage.

## Waiting for you to decide, `/suite/queue`

### Where it goes

**Admin (Naomi).**

- "All" (tab): switches tab on the page.
- "Leave" (tab): switches tab on the page.
- "Spending" (tab): switches tab on the page.
- "Approve": not pressed, because it changes something.
- "Decline": not pressed, because it changes something.

**Lead (Tendai).**

- "All" (tab): switches tab on the page.
- "Leave" (tab): switches tab on the page.
- "Spending" (tab): switches tab on the page.

**Member (Esther).**

- "All" (tab): switches tab on the page.
- "Leave" (tab): switches tab on the page.
- "Spending" (tab): switches tab on the page.

**Guest from another organisation (Amina).**

- "All" (tab): switches tab on the page.
- "Leave" (tab): switches tab on the page.
- "Spending" (tab): switches tab on the page.
- "Approve": not pressed, because it changes something.
- "Decline": not pressed, because it changes something.

### What leads here

- In the product: suites/QueuePage.

## Time sheets, `/suite/time`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/SuitesPage.

## Performance reviews, `/suite/reviews`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- "Open it": goes to `/suite/reviews/b158f516-d8cf-4a73-8db6-3eeac5a48d80`.
- "Open it": goes to `/suite/reviews/5a6cd592-afd0-49e0-a443-dacc58069aec`.
- "Open it": goes to `/suite/reviews/8ac08c29-1fba-4953-af61-29818e17b448`.
- "Open it": goes to `/suite/reviews/a80f7fb9-6ba2-4a1a-a5e0-3963a9f75d89`.

### What leads here

- In the product: suites/ReviewPage, suites/SuitesPage, today/TodayPage.
- Email and WhatsApp: WhatsApp and mail when a review appeal is told (`a-review-appeal-told.service.ts`).

## One review, `/suite/reviews/:id`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- "Performance reviews": goes to `/suite/reviews`. (beside the main column)

### What leads here

- In the product: suites/ReviewsBoardPage.

## When someone leaves, `/suite/leaving`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/SuitesPage.

## Role map, `/suite/roles`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/SuitesPage.

## Spending and budgets, `/suite/spend`

### Where it goes

**Admin (Naomi).**

- "Open the requests for finance": goes to `/suite/spend/finance`.
- "Ask a question": not pressed, because it changes something.
- "Approve": not pressed, because it changes something.
- "Decline": not pressed, because it changes something.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- "Open the requests for finance": goes to `/suite/spend/finance`.
- "Ask a question": not pressed, because it changes something.
- "Approve": not pressed, because it changes something.
- "Decline": not pressed, because it changes something.

### What leads here

- In the product: suites/FinancePage, suites/SuitesPage.

## Requests for finance, `/suite/spend/finance`

### Where it goes

**Admin (Naomi).**

- "October 2026 September 2026 August 2026 July 2026 June 2026 May 2026 April 2026 March 2026": not pressed, because it changes something.
- "Download as CSV": not pressed, because it changes something.
- "Download as Excel": not pressed, because it changes something.
- "Check it": not pressed, because it changes something.
- "Save the budget line": cannot be pressed yet.
- "Spending and budgets": goes to `/suite/spend`. (beside the main column)

**Lead (Tendai).**

- "Spending and budgets": goes to `/suite/spend`. (beside the main column)

**Member (Esther).**

- "Spending and budgets": goes to `/suite/spend`. (beside the main column)

**Guest from another organisation (Amina).**

- "October 2026 September 2026 August 2026 July 2026 June 2026 May 2026 April 2026 March 2026": not pressed, because it changes something.
- "Download as CSV": not pressed, because it changes something.
- "Download as Excel": not pressed, because it changes something.
- "Check it": not pressed, because it changes something.
- "Save the budget line": cannot be pressed yet.
- "Spending and budgets": goes to `/suite/spend`. (beside the main column)

### What leads here

- In the product: suites/SpendingPage.

## To-dos, `/suite/todos`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/SuitesPage.

## Customers and deals, `/suite/customers`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/SuitesPage.

## Equipment, `/suite/equipment`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- Nothing to press on the page itself.

### What leads here

- In the product: suites/SuitesPage.

## Ask (Chat), `/chat`

### Where it goes

**Admin (Naomi).**

- "The whole organisation and your work The quarter’s plans and what they cost The move that ": not pressed, because it changes something.
- "↑": cannot be pressed yet.

**Lead (Tendai).**

- "The whole organisation and your work Weekly sales push, Nairobi Where the partnerships wor": not pressed, because it changes something.
- "↑": cannot be pressed yet.

**Member (Esther).**

- "The whole organisation and your work Weekly sales push, Nairobi": not pressed, because it changes something.
- "↑": cannot be pressed yet.

**Guest from another organisation (Amina).**

- "The whole organisation and your work Get a new project off to a good start Wanjiru, first ": not pressed, because it changes something.
- "What did I say I would do?": stays on the page and shows "You said you would do one thing that is still waiting. / - In "Amina's project check-in, from 7 October", you said you would ask him for a written breakdown thi".
- "What is my check-in for, and who reads it?": could not be pressed in the test.
- "When is my next check-in?": not pressed, because it changes something.
- "What are the company's priorities right now?": could not be pressed in the test.
- "Ask for leave, or to spend money.": not pressed, because it changes something.
- "↑": cannot be pressed yet.

### What leads here

- In the product: gw/AppShell.

## A check-in's page (Check-in, Context and resources, My work, People and setup tabs), `/grounds/:id`

### Where it goes

**Admin (Naomi).**

- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Context and resources" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something.
- "Esther Adeyemi Nothing on record yet": not pressed, because it changes something.
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something.
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Board" tab)
- "Weekly sales push, Nairobi ▾": not pressed, because it changes something. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "Choose the kind of work": not pressed, because it changes something. (on the "Board" tab)
- "Each other's check-ins" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Targets" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 2 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Ask us to end this check-in": goes to `mailto:hello@myground.work?subject=Archive check-in: Weekly%20sales%20push%2C%20Nairobi`. (on the "People and setup" tab)

**Lead (Tendai).**

- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=chat`.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): switches tab on the page.
- "Context and resources" (tab): switches tab on the page.
- "My work" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "Read how to run one": goes to `/org/guide`.
- "What am I missing?": stays on the page and shows "I cannot answer that one yet. Here is what I can do with "What am I missing?" / Tell me what you can see / What am I on? / What is on my list? / What can you he".
- "Review my goals": stays on the page and shows "I cannot answer that one yet. Here is what I can do with "Review my goals". / Tell me what you can see / What am I on? / What is on my list? / What can you help".
- "What did I say I’d do?": stays on the page and shows "You have not said you will do anything that is still waiting. When you say you will do something in a check-in, it shows up here.".
- "Add a note for next time": not pressed, because it changes something.
- "↑": cannot be pressed yet.
- "Change how often this runs": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`.
- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Board" tab)
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=sessions`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Board" tab)
- "Weekly sales push, Nairobi ▾": not pressed, because it changes something. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Share it": not pressed, because it changes something. (on the "Board" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (on the "Board" tab)
- "Record the decision": not pressed, because it changes something. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "Choose the kind of work": not pressed, because it changes something. (on the "Board" tab)
- "Upload a plan": not pressed, because it changes something. (on the "Context and resources" tab)
- "Paste a plan instead": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add context with Ask Kijani Foods": not pressed, because it changes something. (on the "Context and resources" tab)
- "Close": not pressed, because it changes something. (on the "Context and resources" tab)
- "📎": not pressed, because it changes something. (on the "Context and resources" tab)
- "Send": cannot be pressed yet. (on the "Context and resources" tab)
- "Check-in tab": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=chat`. (on the "Context and resources" tab)
- "Write the brief": not pressed, because it changes something. (on the "Context and resources" tab)
- "You Your note Head of sales. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Change this in the chat": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Esther Adeyemi Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "What Groundwork took from it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Everyone Only you Whoever runs this check-in": not pressed, because it changes something. (on the "Context and resources" tab)
- "Delete": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it.": not pressed, because it changes something. (on the "Context and resources" tab)
- "Something agreed on a call": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a line": not pressed, because it changes something. (on the "Context and resources" tab)
- "Every session": not pressed, because it changes something. (on the "My work" tab)
- "Your own record": not pressed, because it changes something. (on the "My work" tab)
- "✎ Edit": not pressed, because it changes something. (on the "My work" tab)
- "Copy check-in link": not pressed, because it changes something. (on the "My work" tab)
- "1": cannot be pressed yet. (on the "My work" tab)
- "No expectation set for them yet.": not pressed, because it changes something. (on the "My work" tab)
- "Read it so far": not pressed, because it changes something. (on the "My work" tab)
- "Begin the last check-in": not pressed, because it changes something. (on the "My work" tab)
- "Add people": not pressed, because it changes something. (on the "People and setup" tab)
- "Edit": not pressed, because it changes something. (on the "People and setup" tab)
- "Change": not pressed, because it changes something. (on the "People and setup" tab)
- "Give it more time": not pressed, because it changes something. (on the "People and setup" tab)
- "This has changed →": not pressed, because it changes something. (on the "People and setup" tab)
- "Record where this stood →": not pressed, because it changes something. (on the "People and setup" tab)
- "Each other's check-ins" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Targets" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 2 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Decide how it ends": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/end`. (on the "People and setup" tab)
- "Delete this check-in": not pressed, because it changes something. (on the "People and setup" tab)

**Member (Esther).**

- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): switches tab on the page.
- "Context and resources" (tab): switches tab on the page.
- "My work" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "What am I missing?": not pressed, because it changes something.
- "Review my goals": not pressed, because it changes something.
- "What did I say I’d do?": not pressed, because it changes something.
- "Add a note for next time": not pressed, because it changes something.
- "↑": cannot be pressed yet.
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Board" tab)
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Board" tab)
- "Read your own report": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "Board" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "You Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it. The check-in reads it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Read": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "My work" tab)
- "Say what you delivered": not pressed, because it changes something. (on the "My work" tab)
- "Add it": cannot be pressed yet. (on the "My work" tab)

**Guest from another organisation (Amina).**

- "Open my work": goes to `/you`.
- "Go to Check-ins": goes to `/grounds`.

### What leads here

- In the product: gw/AppShell, gw/ContextPage, gw/TargetsBand, gw/TheCheckInHeader, gw/what-you-can-jump-to, auth/GoogleCallbackPage, billing/BillingCallbackPage, billing/BillingPage, board/BoardPage, board/WorkRecords, chat/ChatPage, enter/AskYourTeamOneThing, enter/EntryChatPage, grounds/GroundParticipantPage, grounds/GroundsListPage, grounds/ground-tabs, org/OnePersonPage, preview/EveryReportSideBySide, report/ReportPage, report/RoundReportPage, report/SessionReportPage, report/WeeklyReportPage, today/TodayPage.
- Email and WhatsApp: Round digest, approval and invite-bounced mails (`email.service.ts`, `round-digest.service.ts`, `invite-bounced.listener.ts`), waiting-on-the-people-you-invited; webhook "link" field; Slack/Teams notices.

## A check-in waiting for its second session, `/grounds/:id`

### Where it goes

**Admin (Naomi).**

- "Board" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4/board`.
- "Context and resources" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "A colleague Nothing on record yet": not pressed, because it changes something.
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something.
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=context`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=settings`. (on the "Board" tab)
- "Get a project back on track ▾": not pressed, because it changes something. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Every session": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=report`. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "Change the kind of work": not pressed, because it changes something. (on the "Board" tab)
- "View plans": goes to `/billing`. (on the "People and setup" tab)
- "Each other's check-ins" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Targets" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 3 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Ask us to end this check-in": goes to `mailto:hello@myground.work?subject=Archive check-in: Get%20a%20project%20back%20on%20track`. (on the "People and setup" tab)

**Lead (Tendai).**

- "Your check-in": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=chat`.
- "Board" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4/board`.
- "Check-in" (tab): switches tab on the page.
- "Context and resources" (tab): switches tab on the page.
- "My work" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "Read how to run one": goes to `/org/guide`.
- "What am I missing?": stays on the page and shows "I cannot answer that one yet. Here is what I can do with "What am I missing?" / Tell me what you can see / What am I on? / What is on my list? / What can you he".
- "Review my goals": stays on the page and shows "I cannot answer that one yet. Here is what I can do with "Review my goals". / Tell me what you can see / What am I on? / What is on my list? / What can you help".
- "What did I say I’d do?": stays on the page and shows "You have not said you will do anything that is still waiting. When you say you will do something in a check-in, it shows up here.".
- "Add a note for next time": not pressed, because it changes something.
- "↑": cannot be pressed yet.
- "Change how often this runs": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=settings`.
- "Your check-in": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`. (on the "Board" tab)
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Check-in" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=context`. (on the "Board" tab)
- "My work" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=sessions`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=settings`. (on the "Board" tab)
- "Get a project back on track ▾": not pressed, because it changes something. (on the "Board" tab)
- "Add one": not pressed, because it changes something. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Share it": not pressed, because it changes something. (on the "Board" tab)
- "Every session": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=report`. (on the "Board" tab)
- "Record the decision": not pressed, because it changes something. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "Change the kind of work": not pressed, because it changes something. (on the "Board" tab)
- "Change target: The team is aiming for 12 million shillings.": not pressed, because it changes something. (on the "Board" tab)
- "Upload a plan": not pressed, because it changes something. (on the "Context and resources" tab)
- "Paste a plan instead": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add context with Ask Kijani Foods": not pressed, because it changes something. (on the "Context and resources" tab)
- "Close": not pressed, because it changes something. (on the "Context and resources" tab)
- "📎": not pressed, because it changes something. (on the "Context and resources" tab)
- "Send": cannot be pressed yet. (on the "Context and resources" tab)
- "Check-in tab": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=chat`. (on the "Context and resources" tab)
- "Rewrite": not pressed, because it changes something. (on the "Context and resources" tab)
- "What you wrote": not pressed, because it changes something. (on the "Context and resources" tab)
- "Change who sees them": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=settings`. (on the "Context and resources" tab)
- "Change this": not pressed, because it changes something. (on the "Context and resources" tab)
- "Say what it assumes": not pressed, because it changes something. (on the "Context and resources" tab)
- "You Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Change this in the chat": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Someone who has not given a name yet Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it. The check-in reads it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Something agreed on a call": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a line": not pressed, because it changes something. (on the "Context and resources" tab)
- "Every session": not pressed, because it changes something. (on the "My work" tab)
- "Your own record": not pressed, because it changes something. (on the "My work" tab)
- "✎ Edit": not pressed, because it changes something. (on the "My work" tab)
- "Go to People": not pressed, because it changes something. (on the "My work" tab)
- "1": cannot be pressed yet. (on the "My work" tab)
- "No expectation set for them yet.": not pressed, because it changes something. (on the "My work" tab)
- "Copy check-in link": not pressed, because it changes something. (on the "My work" tab)
- "2": not pressed, because it changes something. (on the "My work" tab)
- "No expectation set for you yet.": not pressed, because it changes something. (on the "My work" tab)
- "Read it so far": not pressed, because it changes something. (on the "My work" tab)
- "Begin the last check-in": not pressed, because it changes something. (on the "My work" tab)
- "Copy an invite link": not pressed, because it changes something. (on the "People and setup" tab)
- "Add people": not pressed, because it changes something. (on the "People and setup" tab)
- "Edit": not pressed, because it changes something. (on the "People and setup" tab)
- "Change": not pressed, because it changes something. (on the "People and setup" tab)
- "Give it more time": not pressed, because it changes something. (on the "People and setup" tab)
- "Say what doing well looks like →": not pressed, because it changes something. (on the "People and setup" tab)
- "Record where this stood →": not pressed, because it changes something. (on the "People and setup" tab)
- "Each other's check-ins" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Targets" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 3 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Decide how it ends": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4/end`. (on the "People and setup" tab)
- "Delete this check-in": not pressed, because it changes something. (on the "People and setup" tab)

### What leads here

- In the product: gw/AppShell, gw/ContextPage, gw/TargetsBand, gw/TheCheckInHeader, gw/what-you-can-jump-to, auth/GoogleCallbackPage, billing/BillingCallbackPage, billing/BillingPage, board/BoardPage, board/WorkRecords, chat/ChatPage, enter/AskYourTeamOneThing, enter/EntryChatPage, grounds/GroundParticipantPage, grounds/GroundsListPage, grounds/ground-tabs, org/OnePersonPage, preview/EveryReportSideBySide, report/ReportPage, report/RoundReportPage, report/SessionReportPage, report/WeeklyReportPage, today/TodayPage.
- Email and WhatsApp: Round digest, approval and invite-bounced mails (`email.service.ts`, `round-digest.service.ts`, `invite-bounced.listener.ts`), waiting-on-the-people-you-invited; webhook "link" field; Slack/Teams notices.

## A check-in as a participant, `/grounds/:id/p`

### Where it goes

**Lead (Tendai).**

- "The whole check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): switches tab on the page.
- "Context and resources" (tab): switches tab on the page.
- "My work" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "What am I missing?": stays on the page and shows "I cannot answer that one yet. Here is what I can do with "What am I missing?" / Tell me what you can see / What am I on? / What is on my list? / What can you he".
- "Review my goals": stays on the page and shows "I cannot answer that one yet. Here is what I can do with "Review my goals". / Tell me what you can see / What am I on? / What is on my list? / What can you help".
- "What did I say I’d do?": stays on the page and shows "You have not said you will do anything that is still waiting. When you say you will do something in a check-in, it shows up here.".
- "Add a note for next time": not pressed, because it changes something.
- "↑": cannot be pressed yet.
- "Change how often this runs": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/p?tab=settings`.
- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Board" tab)
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=sessions`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Board" tab)
- "Weekly sales push, Nairobi ▾": not pressed, because it changes something. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Share it": not pressed, because it changes something. (on the "Board" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (on the "Board" tab)
- "Record the decision": not pressed, because it changes something. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "Choose the kind of work": not pressed, because it changes something. (on the "Board" tab)
- "Your check-in": not pressed, because it changes something. (on the "Check-in" tab)
- "Read how to run one": goes to `/org/guide`. (on the "Check-in" tab)
- "Upload a plan": not pressed, because it changes something. (on the "Context and resources" tab)
- "Paste a plan instead": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add context with Ask Kijani Foods": not pressed, because it changes something. (on the "Context and resources" tab)
- "Close": not pressed, because it changes something. (on the "Context and resources" tab)
- "📎": not pressed, because it changes something. (on the "Context and resources" tab)
- "Send": cannot be pressed yet. (on the "Context and resources" tab)
- "Check-in tab": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=chat`. (on the "Context and resources" tab)
- "Write the brief": not pressed, because it changes something. (on the "Context and resources" tab)
- "You Your note Head of sales. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Change this in the chat": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Esther Adeyemi Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "What Groundwork took from it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Everyone Only you Whoever runs this check-in": not pressed, because it changes something. (on the "Context and resources" tab)
- "Delete": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it.": not pressed, because it changes something. (on the "Context and resources" tab)
- "Something agreed on a call": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a line": not pressed, because it changes something. (on the "Context and resources" tab)
- "Every session": not pressed, because it changes something. (on the "My work" tab)
- "Your own record": not pressed, because it changes something. (on the "My work" tab)
- "✎ Edit": not pressed, because it changes something. (on the "My work" tab)
- "Copy check-in link": not pressed, because it changes something. (on the "My work" tab)
- "1": cannot be pressed yet. (on the "My work" tab)
- "No expectation set for them yet.": not pressed, because it changes something. (on the "My work" tab)
- "Read it so far": not pressed, because it changes something. (on the "My work" tab)
- "Begin the last check-in": not pressed, because it changes something. (on the "My work" tab)
- "Add people": not pressed, because it changes something. (on the "People and setup" tab)
- "Edit": not pressed, because it changes something. (on the "People and setup" tab)
- "Change": not pressed, because it changes something. (on the "People and setup" tab)
- "Give it more time": not pressed, because it changes something. (on the "People and setup" tab)
- "This has changed →": not pressed, because it changes something. (on the "People and setup" tab)
- "Record where this stood →": not pressed, because it changes something. (on the "People and setup" tab)
- "Each other's check-ins" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Targets" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 2 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Decide how it ends": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/end`. (on the "People and setup" tab)
- "Delete this check-in": not pressed, because it changes something. (on the "People and setup" tab)

**Member (Esther).**

- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): switches tab on the page.
- "Context and resources" (tab): switches tab on the page.
- "My work" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "What am I missing?": not pressed, because it changes something.
- "Review my goals": not pressed, because it changes something.
- "What did I say I’d do?": not pressed, because it changes something.
- "Add a note for next time": not pressed, because it changes something.
- "↑": cannot be pressed yet.
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Board" tab)
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Board" tab)
- "Read your own report": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "Board" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "You Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it. The check-in reads it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Read": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "My work" tab)
- "Say what you delivered": not pressed, because it changes something. (on the "My work" tab)
- "Add it": cannot be pressed yet. (on the "My work" tab)

### What leads here

- In the product: invite/InvitePage.

## Old report address (redirect), `/grounds/:id/report`

### Where it goes

**Admin (Naomi).** Opening `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/report` landed on `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.

- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`.
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`.
- "Weekly sales push, Nairobi ▾": stays on the page and shows "▴ / Get a project back on track / Fatou Diallo’s handover / The move that saved the week / How the depot week is going / The quarter’s plans and what they cost ".
- "Show": stays on the page and shows "Hide".
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`.
- "Everything else from this check-in More from this check-in, kept in full.": stays on the page and shows "Nobody has said what kind of work this check-in is about yet. Choose one, so its board can keep the right kind of record. / Choose / Session 1 opened on 26 Sept".
- "Choose the kind of work": could not be pressed in the test.
- "Context and resources" (tab): switches tab on the page. (on the "Context and resources" tab)
- "People and setup" (tab): switches tab on the page. (on the "Context and resources" tab)
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Esther Adeyemi Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Each other's check-ins" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Targets" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 2 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Ask us to end this check-in": goes to `mailto:hello@myground.work?subject=Archive check-in: Weekly%20sales%20push%2C%20Nairobi`. (on the "People and setup" tab)

**Lead (Tendai).** Opening `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/report` landed on `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`.

- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=chat`.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): switches tab on the page.
- "Context and resources" (tab): switches tab on the page.
- "My work" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "Read how to run one": goes to `/org/guide`.
- "Who has answered": not pressed, because it changes something.
- "Your own record": not pressed, because it changes something.
- "The board Everything so far →": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "This week What kept happening for three check-ins in a row or more →": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/report/week`.
- "Session 1 Sat, 26 Sept 2 of 3 checked in You have not checked in yet. Not shared": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/session/1`.
- "Send to 2": not pressed, because it changes something.
- "Who gets it": stays on the page and shows "Esther Adeyemi (esther@kijani.test) / Kwesi Boateng (kwesi@kijani.test)".
- "Closing a session early": stays on the page and shows "When the last person answers, the report goes out to everybody on its own - you do not have to do anything. If you need to stop waiting, you can close this sess".
- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Board" tab)
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=sessions`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Board" tab)
- "Weekly sales push, Nairobi ▾": not pressed, because it changes something. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Share it": not pressed, because it changes something. (on the "Board" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (on the "Board" tab)
- "Record the decision": not pressed, because it changes something. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "Choose the kind of work": not pressed, because it changes something. (on the "Board" tab)
- "What am I missing?": not pressed, because it changes something. (on the "Check-in" tab)
- "Review my goals": not pressed, because it changes something. (on the "Check-in" tab)
- "What did I say I’d do?": not pressed, because it changes something. (on the "Check-in" tab)
- "Add a note for next time": not pressed, because it changes something. (on the "Check-in" tab)
- "↑": cannot be pressed yet. (on the "Check-in" tab)
- "Change how often this runs": not pressed, because it changes something. (on the "Check-in" tab)
- "Upload a plan": not pressed, because it changes something. (on the "Context and resources" tab)
- "Paste a plan instead": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add context with Ask Kijani Foods": not pressed, because it changes something. (on the "Context and resources" tab)
- "Close": not pressed, because it changes something. (on the "Context and resources" tab)
- "📎": not pressed, because it changes something. (on the "Context and resources" tab)
- "Send": cannot be pressed yet. (on the "Context and resources" tab)
- "Check-in tab": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=chat`. (on the "Context and resources" tab)
- "Write the brief": not pressed, because it changes something. (on the "Context and resources" tab)
- "You Your note Head of sales. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Change this in the chat": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Esther Adeyemi Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "What Groundwork took from it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Everyone Only you Whoever runs this check-in": not pressed, because it changes something. (on the "Context and resources" tab)
- "Delete": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it.": not pressed, because it changes something. (on the "Context and resources" tab)
- "Something agreed on a call": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a line": not pressed, because it changes something. (on the "Context and resources" tab)
- "Every session": not pressed, because it changes something. (on the "My work" tab)
- "✎ Edit": not pressed, because it changes something. (on the "My work" tab)
- "Copy check-in link": not pressed, because it changes something. (on the "My work" tab)
- "1": cannot be pressed yet. (on the "My work" tab)
- "No expectation set for them yet.": not pressed, because it changes something. (on the "My work" tab)
- "Read it so far": not pressed, because it changes something. (on the "My work" tab)
- "Begin the last check-in": not pressed, because it changes something. (on the "My work" tab)
- "Add people": not pressed, because it changes something. (on the "People and setup" tab)
- "Edit": not pressed, because it changes something. (on the "People and setup" tab)
- "Change": not pressed, because it changes something. (on the "People and setup" tab)
- "Give it more time": not pressed, because it changes something. (on the "People and setup" tab)
- "This has changed →": not pressed, because it changes something. (on the "People and setup" tab)
- "Record where this stood →": not pressed, because it changes something. (on the "People and setup" tab)
- "Each other's check-ins" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Targets" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 2 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Decide how it ends": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/end`. (on the "People and setup" tab)
- "Delete this check-in": not pressed, because it changes something. (on the "People and setup" tab)

**Member (Esther).** Opening `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/report` landed on `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`.

- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): switches tab on the page.
- "Context and resources" (tab): switches tab on the page.
- "My work" (tab): switches tab on the page.
- "People and setup" (tab): switches tab on the page.
- "Open the team board The same picture for everyone, built from what each person said. Never": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "This week What kept happening for three check-ins in a row or more →": not pressed, because it changes something.
- "Your sessions You have one finished session, with its own report.": stays on the page and shows "Session 1 / You checked in on 26 Sept 2026.".
- "Ask": not pressed, because it changes something. (on the "Board" tab)
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Board" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Board" tab)
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (on the "Board" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Board" tab)
- "Read your own report": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "Board" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (on the "Board" tab)
- "Show": not pressed, because it changes something. (on the "Board" tab)
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something. (on the "Board" tab)
- "What am I missing?": not pressed, because it changes something. (on the "Check-in" tab)
- "Review my goals": not pressed, because it changes something. (on the "Check-in" tab)
- "What did I say I’d do?": not pressed, because it changes something. (on the "Check-in" tab)
- "Add a note for next time": not pressed, because it changes something. (on the "Check-in" tab)
- "↑": cannot be pressed yet. (on the "Check-in" tab)
- "You Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it. The check-in reads it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Read": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "My work" tab)
- "Say what you delivered": not pressed, because it changes something. (on the "My work" tab)
- "Add it": cannot be pressed yet. (on the "My work" tab)

### What leads here

- In the product: board/BoardPage.

## This week (weekly report), `/grounds/:id/report/week`

### Where it goes

**Admin (Naomi).**

- Nothing to press on the page itself.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Member (Esther).**

- Nothing to press on the page itself.

### What leads here

- In the product: grounds/GroundAdminPage, grounds/GroundParticipantPage.

## Team boards, `/boards`

### Where it goes

**Admin (Naomi).**

- "Get a project back on track" (tab): switches tab on the page.
- "Fatou Diallo’s handover" (tab): switches tab on the page.
- "The move that saved the week" (tab): switches tab on the page.
- "How the depot week is going" (tab): switches tab on the page.
- "The quarter’s plans and what they cost" (tab): switches tab on the page.
- "Where the partnerships work went" (tab): switches tab on the page.
- "The new stock system, four depots" (tab): switches tab on the page.
- "Weekly sales push, Nairobi" (tab): switches tab on the page.
- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4/board`.
- "Context and resources" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=context`.
- "People and setup" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=settings`.
- "Show": stays on the page and shows "Hide".
- "Every session": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=report`.
- "Everything else from this check-in More from this check-in, kept in full.": stays on the page and shows "This check-in is about a sales team and its deals. / Change / Built from what each person shared in their private check-in. Use it to see what’s going on and gu".
- "Change the kind of work": could not be pressed in the test.
- "Your check-in": goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741`. (on the "Fatou Diallo’s handover" tab)
- "Board" (tab): goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741/board`. (on the "Fatou Diallo’s handover" tab)
- "Check-in" (tab): goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741`. (on the "Fatou Diallo’s handover" tab)
- "Context and resources" (tab): goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741?tab=context`. (on the "Fatou Diallo’s handover" tab)
- "My work" (tab): goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741?tab=sessions`. (on the "Fatou Diallo’s handover" tab)
- "People and setup" (tab): goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741?tab=settings`. (on the "Fatou Diallo’s handover" tab)
- "Share it": not pressed, because it changes something. (on the "Fatou Diallo’s handover" tab)
- "Every session": goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741?tab=report`. (on the "Fatou Diallo’s handover" tab)
- "Record the decision": not pressed, because it changes something. (on the "Fatou Diallo’s handover" tab)
- "Choose the kind of work": not pressed, because it changes something. (on the "Fatou Diallo’s handover" tab)
- "Your check-in": goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5`. (on the "The move that saved the week" tab)
- "Board" (tab): goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5/board`. (on the "The move that saved the week" tab)
- "Check-in" (tab): goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5`. (on the "The move that saved the week" tab)
- "Context and resources" (tab): goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5?tab=context`. (on the "The move that saved the week" tab)
- "My work" (tab): goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5?tab=sessions`. (on the "The move that saved the week" tab)
- "People and setup" (tab): goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5?tab=settings`. (on the "The move that saved the week" tab)
- "Every session": goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5?tab=report`. (on the "The move that saved the week" tab)
- "Board" (tab): goes to `/grounds/1b60cd34-cb80-488a-a9bc-6dc2076fbf9d/board`. (on the "How the depot week is going" tab)
- "Context and resources" (tab): goes to `/grounds/1b60cd34-cb80-488a-a9bc-6dc2076fbf9d?tab=context`. (on the "How the depot week is going" tab)
- "People and setup" (tab): goes to `/grounds/1b60cd34-cb80-488a-a9bc-6dc2076fbf9d?tab=settings`. (on the "How the depot week is going" tab)
- "Every session": goes to `/grounds/1b60cd34-cb80-488a-a9bc-6dc2076fbf9d?tab=report`. (on the "How the depot week is going" tab)
- "Your check-in": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (on the "The quarter’s plans and what they cost" tab)
- "Board" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2/board`. (on the "The quarter’s plans and what they cost" tab)
- "Check-in" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (on the "The quarter’s plans and what they cost" tab)
- "Context and resources" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=context`. (on the "The quarter’s plans and what they cost" tab)
- "My work" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=sessions`. (on the "The quarter’s plans and what they cost" tab)
- "People and setup" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=settings`. (on the "The quarter’s plans and what they cost" tab)
- "Every session": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=report`. (on the "The quarter’s plans and what they cost" tab)
- "Board" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406/board`. (on the "Where the partnerships work went" tab)
- "Context and resources" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406?tab=context`. (on the "Where the partnerships work went" tab)
- "People and setup" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406?tab=settings`. (on the "Where the partnerships work went" tab)
- "Every session": goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406?tab=report`. (on the "Where the partnerships work went" tab)
- "Board" (tab): goes to `/grounds/4ab79d9d-be9c-478c-b576-1d712b336055/board`. (on the "The new stock system, four depots" tab)
- "Context and resources" (tab): goes to `/grounds/4ab79d9d-be9c-478c-b576-1d712b336055?tab=context`. (on the "The new stock system, four depots" tab)
- "People and setup" (tab): goes to `/grounds/4ab79d9d-be9c-478c-b576-1d712b336055?tab=settings`. (on the "The new stock system, four depots" tab)
- "Every session": goes to `/grounds/4ab79d9d-be9c-478c-b576-1d712b336055?tab=report`. (on the "The new stock system, four depots" tab)
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`. (on the "Weekly sales push, Nairobi" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Weekly sales push, Nairobi" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Weekly sales push, Nairobi" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (on the "Weekly sales push, Nairobi" tab)
- "Weekly sales push, Nairobi ▾": not pressed, because it changes something. (on the "Board" tab)

**Lead (Tendai).**

- "Get a project back on track" (tab): switches tab on the page.
- "The quarter’s plans and what they cost" (tab): switches tab on the page.
- "Where the partnerships work went" (tab): switches tab on the page.
- "Weekly sales push, Nairobi" (tab): switches tab on the page.
- "Your check-in": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`.
- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4/board`.
- "Check-in" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`.
- "Context and resources" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=context`.
- "My work" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=sessions`.
- "People and setup" (tab): goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=settings`.
- "Add one": opens a box: "Add a record Close".
- "Show": not pressed, because it changes something.
- "Share it": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=report`.
- "Every session": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4?tab=report`.
- "Record the decision": not pressed, because it changes something.
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something.
- "Change the kind of work": not pressed, because it changes something.
- "Change target: The team is aiming for 12 million shillings.": could not be pressed in the test.
- "Board" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2/board`. (on the "The quarter’s plans and what they cost" tab)
- "Check-in" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (on the "The quarter’s plans and what they cost" tab)
- "Context and resources" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=context`. (on the "The quarter’s plans and what they cost" tab)
- "My work" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=record`. (on the "The quarter’s plans and what they cost" tab)
- "People and setup" (tab): goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=settings`. (on the "The quarter’s plans and what they cost" tab)
- "Read your own report": goes to `/checkin/fa2ccea2-065e-4e49-a5b3-03a5a057d62b/report`. (on the "The quarter’s plans and what they cost" tab)
- "Every session": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=record`. (on the "The quarter’s plans and what they cost" tab)
- "Your check-in": goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406`. (on the "Where the partnerships work went" tab)
- "Board" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406/board`. (on the "Where the partnerships work went" tab)
- "Check-in" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406`. (on the "Where the partnerships work went" tab)
- "Context and resources" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406?tab=context`. (on the "Where the partnerships work went" tab)
- "My work" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406?tab=sessions`. (on the "Where the partnerships work went" tab)
- "People and setup" (tab): goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406?tab=settings`. (on the "Where the partnerships work went" tab)
- "Every session": goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406?tab=report`. (on the "Where the partnerships work went" tab)
- "Choose the kind of work": not pressed, because it changes something. (on the "Where the partnerships work went" tab)
- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Weekly sales push, Nairobi" tab)
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`. (on the "Weekly sales push, Nairobi" tab)
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (on the "Weekly sales push, Nairobi" tab)
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (on the "Weekly sales push, Nairobi" tab)
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=sessions`. (on the "Weekly sales push, Nairobi" tab)
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (on the "Weekly sales push, Nairobi" tab)
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (on the "Weekly sales push, Nairobi" tab)
- "Weekly sales push, Nairobi ▾": not pressed, because it changes something. (on the "Board" tab)

**Member (Esther).**

- "Weekly sales push, Nairobi" (tab): switches tab on the page.
- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`.
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`.
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`.
- "Read your own report": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`.
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`.
- "Show": not pressed, because it changes something.
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something.
- "Check-in" (tab): switches tab on the page. (on the "Context and resources" tab)
- "Context and resources" (tab): switches tab on the page. (on the "Context and resources" tab)
- "My work" (tab): switches tab on the page. (on the "Context and resources" tab)
- "People and setup" (tab): switches tab on the page. (on the "Context and resources" tab)
- "You Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it. The check-in reads it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Read": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "My work" tab)
- "Say what you delivered": not pressed, because it changes something. (on the "My work" tab)
- "Add it": cannot be pressed yet. (on the "My work" tab)

**Guest from another organisation (Amina).**

- "Amina's project check-in, from 7 October" (tab): switches tab on the page.
- "Amina's project check-in" (tab): switches tab on the page.
- "Get a new project off to a good start" (tab): switches tab on the page.
- "Wanjiru, first 90 days" (tab): switches tab on the page.
- "Your check-in": goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690`.
- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690/board`.
- "Check-in" (tab): goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690`.
- "Context and resources" (tab): goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690?tab=context`.
- "My work" (tab): goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690?tab=sessions`.
- "People and setup" (tab): goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690?tab=settings`.
- "Show": not pressed, because it changes something.
- "Share it": not pressed, because it changes something.
- "Every session": goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690?tab=report`.
- "Record the decision": not pressed, because it changes something.
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something.
- "Choose the kind of work": could not be pressed in the test.
- "Change target: The team is aiming to complete the warehouse move by 28 November with no lo": could not be pressed in the test.
- "Change target: The team is aiming for the fit-out to be under 2 million shillings.": could not be pressed in the test.
- "Your check-in": goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720`. (on the "Amina's project check-in" tab)
- "Board" (tab): goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720/board`. (on the "Amina's project check-in" tab)
- "Check-in" (tab): goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720`. (on the "Amina's project check-in" tab)
- "Context and resources" (tab): goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720?tab=context`. (on the "Amina's project check-in" tab)
- "My work" (tab): goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720?tab=sessions`. (on the "Amina's project check-in" tab)
- "People and setup" (tab): goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720?tab=settings`. (on the "Amina's project check-in" tab)
- "Add one": not pressed, because it changes something. (on the "Amina's project check-in" tab)
- "Every session": goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720?tab=report`. (on the "Amina's project check-in" tab)
- "Change the kind of work": not pressed, because it changes something. (on the "Amina's project check-in" tab)
- "Your check-in": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`. (on the "Get a new project off to a good start" tab)
- "Board" (tab): goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8/board`. (on the "Get a new project off to a good start" tab)
- "Check-in" (tab): goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`. (on the "Get a new project off to a good start" tab)
- "Context and resources" (tab): goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8?tab=context`. (on the "Get a new project off to a good start" tab)
- "My work" (tab): goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8?tab=sessions`. (on the "Get a new project off to a good start" tab)
- "People and setup" (tab): goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8?tab=settings`. (on the "Get a new project off to a good start" tab)
- "Open your check-in": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8?tab=chat`. (on the "Get a new project off to a good start" tab)
- "Every session": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8?tab=report`. (on the "Get a new project off to a good start" tab)
- "Change target: The team is aiming for the StockLink portal to have opening stock counts lo": not pressed, because it changes something. (on the "Get a new project off to a good start" tab)
- "Change target: The team is aiming to move the stock system to the StockLink portal for the": not pressed, because it changes something. (on the "Get a new project off to a good start" tab)
- "Change target: Daniel Park is aiming for 400 type in the Mombasa stock count sheet.": not pressed, because it changes something. (on the "Get a new project off to a good start" tab)
- "Your check-in": goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e`. (on the "Wanjiru, first 90 days" tab)
- "Board" (tab): goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e/board`. (on the "Wanjiru, first 90 days" tab)
- "Check-in" (tab): goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e`. (on the "Wanjiru, first 90 days" tab)
- "Context and resources" (tab): goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e?tab=context`. (on the "Wanjiru, first 90 days" tab)
- "My work" (tab): goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e?tab=sessions`. (on the "Wanjiru, first 90 days" tab)
- "People and setup" (tab): goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e?tab=settings`. (on the "Wanjiru, first 90 days" tab)
- "Every session": goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e?tab=report`. (on the "Wanjiru, first 90 days" tab)
- "Change target: You are aiming for early success for a colleague.": not pressed, because it changes something. (on the "Wanjiru, first 90 days" tab)
- "Wanjiru, first 90 days ▾": not pressed, because it changes something. (on the "Board" tab)

### What leads here

- In the product: gw/nav-items.

## A check-in's board, `/grounds/:id/board`

### Where it goes

**Admin (Naomi).**

- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`.
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`.
- "Weekly sales push, Nairobi ▾": stays on the page and shows "▴ / Get a project back on track / Fatou Diallo’s handover / The move that saved the week / How the depot week is going / The quarter’s plans and what they cost ".
- "Show": stays on the page and shows "Hide".
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`.
- "Everything else from this check-in More from this check-in, kept in full.": stays on the page and shows "Nobody has said what kind of work this check-in is about yet. Choose one, so its board can keep the right kind of record. / Choose / Session 1 opened on 26 Sept".
- "Choose the kind of work": could not be pressed in the test.
- "Context and resources" (tab): switches tab on the page. (on the "Context and resources" tab)
- "People and setup" (tab): switches tab on the page. (on the "Context and resources" tab)
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Esther Adeyemi Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Each other's check-ins" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Targets" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 2 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): cannot be pressed yet. (on the "People and setup" tab)
- "Ask us to end this check-in": goes to `mailto:hello@myground.work?subject=Archive check-in: Weekly%20sales%20push%2C%20Nairobi`. (on the "People and setup" tab)

**Lead (Tendai).**

- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`.
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=sessions`.
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`.
- "Weekly sales push, Nairobi ▾": not pressed, because it changes something.
- "Show": not pressed, because it changes something.
- "Share it": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`.
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`.
- "Record the decision": not pressed, because it changes something.
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something.
- "Choose the kind of work": not pressed, because it changes something.
- "Your check-in": not pressed, because it changes something. (on the "Check-in" tab)
- "Check-in" (tab): switches tab on the page. (on the "Check-in" tab)
- "Context and resources" (tab): switches tab on the page. (on the "Check-in" tab)
- "My work" (tab): switches tab on the page. (on the "Check-in" tab)
- "People and setup" (tab): switches tab on the page. (on the "Check-in" tab)
- "Read how to run one": goes to `/org/guide`. (on the "Check-in" tab)
- "What am I missing?": not pressed, because it changes something. (on the "Check-in" tab)
- "Review my goals": not pressed, because it changes something. (on the "Check-in" tab)
- "What did I say I’d do?": not pressed, because it changes something. (on the "Check-in" tab)
- "Add a note for next time": not pressed, because it changes something. (on the "Check-in" tab)
- "↑": cannot be pressed yet. (on the "Check-in" tab)
- "Change how often this runs": not pressed, because it changes something. (on the "Check-in" tab)
- "Upload a plan": not pressed, because it changes something. (on the "Context and resources" tab)
- "Paste a plan instead": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add context with Ask Kijani Foods": not pressed, because it changes something. (on the "Context and resources" tab)
- "Close": not pressed, because it changes something. (on the "Context and resources" tab)
- "📎": not pressed, because it changes something. (on the "Context and resources" tab)
- "Send": cannot be pressed yet. (on the "Context and resources" tab)
- "Check-in tab": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=chat`. (on the "Context and resources" tab)
- "Write the brief": not pressed, because it changes something. (on the "Context and resources" tab)
- "You Your note Head of sales. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Change this in the chat": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Esther Adeyemi Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Your note Account manager. Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "What Groundwork took from it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Everyone Only you Whoever runs this check-in": not pressed, because it changes something. (on the "Context and resources" tab)
- "Delete": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it.": not pressed, because it changes something. (on the "Context and resources" tab)
- "Something agreed on a call": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a line": not pressed, because it changes something. (on the "Context and resources" tab)
- "Every session": not pressed, because it changes something. (on the "My work" tab)
- "Your own record": not pressed, because it changes something. (on the "My work" tab)
- "✎ Edit": not pressed, because it changes something. (on the "My work" tab)
- "Copy check-in link": not pressed, because it changes something. (on the "My work" tab)
- "1": cannot be pressed yet. (on the "My work" tab)
- "No expectation set for them yet.": not pressed, because it changes something. (on the "My work" tab)
- "Read it so far": not pressed, because it changes something. (on the "My work" tab)
- "Begin the last check-in": not pressed, because it changes something. (on the "My work" tab)
- "Add people": not pressed, because it changes something. (on the "People and setup" tab)
- "Edit": not pressed, because it changes something. (on the "People and setup" tab)
- "Change": not pressed, because it changes something. (on the "People and setup" tab)
- "Give it more time": not pressed, because it changes something. (on the "People and setup" tab)
- "This has changed →": not pressed, because it changes something. (on the "People and setup" tab)
- "Record where this stood →": not pressed, because it changes something. (on the "People and setup" tab)
- "Each other's check-ins" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Hide email addresses from each other" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Targets" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Who can confirm each other's work" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Changes to how long it runs and how often are noted with who made them and the date. 2 cha": not pressed, because it changes something. (on the "People and setup" tab)
- "What we ask them" (switch): a switch, not pressed (it changes a setting). (on the "People and setup" tab)
- "Decide how it ends": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/end`. (on the "People and setup" tab)
- "Delete this check-in": not pressed, because it changes something. (on the "People and setup" tab)

**Member (Esther).**

- "Ask": not pressed, because it changes something.
- "Board" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "Check-in" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Context and resources" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`.
- "My work" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`.
- "People and setup" (tab): goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`.
- "Read your own report": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`.
- "Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`.
- "Show": not pressed, because it changes something.
- "Everything else from this check-in More from this check-in, kept in full.": not pressed, because it changes something.
- "Check-in" (tab): switches tab on the page. (on the "Check-in" tab)
- "Context and resources" (tab): switches tab on the page. (on the "Check-in" tab)
- "My work" (tab): switches tab on the page. (on the "Check-in" tab)
- "People and setup" (tab): switches tab on the page. (on the "Check-in" tab)
- "What am I missing?": not pressed, because it changes something. (on the "Check-in" tab)
- "Review my goals": not pressed, because it changes something. (on the "Check-in" tab)
- "What did I say I’d do?": not pressed, because it changes something. (on the "Check-in" tab)
- "Add a note for next time": not pressed, because it changes something. (on the "Check-in" tab)
- "↑": cannot be pressed yet. (on the "Check-in" tab)
- "You Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Attach something": not pressed, because it changes something. (on the "Context and resources" tab)
- "Tendai Moyo Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Kwesi Boateng Nothing on record yet": not pressed, because it changes something. (on the "Context and resources" tab)
- "Add a document It starts private to you. You choose who can read it. The check-in reads it": not pressed, because it changes something. (on the "Context and resources" tab)
- "Read": goes to `/checkin/0d072a57-82e8-4a10-b2ab-f65bd9e586d6/report`. (on the "My work" tab)
- "Say what you delivered": not pressed, because it changes something. (on the "My work" tab)
- "Add it": cannot be pressed yet. (on the "My work" tab)

**Guest from another organisation (Amina).**

- "Open my work": goes to `/you`.
- "Go to Check-ins": goes to `/grounds`.

### What leads here

- In the product: gw/TheCheckInHeader, gw/TheOtherBoardsYouAreIn, board/BoardPage, chat/ChatPage, grounds/EndingPage, grounds/GroundAdminPage, grounds/GroundParticipantPage, grounds/ground-tabs, preview/EveryReportSideBySide.
- Email and WhatsApp: The leads' weekly letter, who-has-gone-quiet, the leads' subjects mail; WhatsApp: the lead's daily summary, the anchor weekly insight.

## How does this end?, `/grounds/:id/end`

### Where it goes

**Admin (Naomi).**

- "← Back to the board": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.

**Lead (Tendai).**

- "← Back to the board": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "The team is on course.": stays on the page; nothing visible changes.
- "The team can reach it, with a change in how the work is done.": not pressed, because it changes something.
- "The target needs to change.": stays on the page; nothing visible changes.
- "It is not settled yet, and more sessions are needed.": stays on the page; nothing visible changes.
- "Save the outcome and end it": cannot be pressed yet.

**Member (Esther).**

- "← Back to the board": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.

### What leads here

- In the product: gw/ResolutionPanel, board/BoardPage, grounds/CheckInPeopleAndSetup.

## How does this end? (project check-in), `/grounds/:id/end`

### Where it goes

**Lead (Tendai).**

- "← Back to the board": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4/board`.
- "The work carries on as it is.": stays on the page; nothing visible changes.
- "The work is set up differently.": stays on the page; nothing visible changes.
- "The work carries on with less in it.": stays on the page; nothing visible changes.
- "The people involved go their separate ways.": stays on the page; nothing visible changes.
- "The role does not continue. The person's history stays as it is.": not pressed, because it changes something.
- "The work stops.": not pressed, because it changes something.
- "It is not decided yet, and what is missing is named so it can be looked at again.": stays on the page; nothing visible changes.
- "Save the outcome and end it": cannot be pressed yet.

### What leads here

- In the product: gw/ResolutionPanel, board/BoardPage, grounds/CheckInPeopleAndSetup.

## One session's report, `/grounds/:id/session/:n`

### Where it goes

**Admin (Naomi).**

- "Check-ins": goes to `/grounds`.
- "Ask": not pressed, because it changes something.
- "← Every session": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`.
- "What everybody agrees (2)": not pressed, because it changes something.
- "Group by person": stays on the page and shows "Group by theme / What each of the 2 said".
- "All 4 groups": stays on the page and shows "Progress and priorities / I have signed seven shops so far and four of them have ordered twice. / Esther Adeyemi said this from memory. / Nine shops have signed".
- "How much there is to go on, and what it is built from": stays on the page and shows "There is a partial amount to go on. / There is enough here to talk about, and not enough to settle anything. / 1 of 3 people has not answered yet. Their side is".
- "Board": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`. (beside the main column)
- "Context and resources": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (beside the main column)
- "People and setup": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (beside the main column)
- "Report": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (beside the main column)

**Lead (Tendai).**

- "Check-ins": goes to `/grounds`.
- "Your check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Ask": not pressed, because it changes something.
- "← Every session": not pressed, because it changes something.
- "What everybody agrees (2)": not pressed, because it changes something.
- "Group by person": not pressed, because it changes something.
- "All 4 groups": not pressed, because it changes something.
- "How much there is to go on, and what it is built from": not pressed, because it changes something.
- "Board": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`. (beside the main column)
- "Check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (beside the main column)
- "Context and resources": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (beside the main column)
- "My work": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=sessions`. (beside the main column)
- "People and setup": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (beside the main column)
- "Report": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (beside the main column)

**Member (Esther).**

- "Check-ins": goes to `/grounds`.
- "Start my check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Ask": not pressed, because it changes something.
- "← Every session": not pressed, because it changes something.
- "Group by person": not pressed, because it changes something.
- "All 4 groups": not pressed, because it changes something.
- "How much there is to go on, and what it is built from": not pressed, because it changes something.
- "Board": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`. (beside the main column)
- "Check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (beside the main column)
- "Context and resources": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (beside the main column)
- "My work": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (beside the main column)
- "People and setup": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (beside the main column)
- "Report": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (beside the main column)

### What leads here

- In the product: gw/TheCheckInYouJustFinished, gw/checkin/TheDonePage, gw/checkin/YourWork, board/BoardPage, grounds/GroundAdminPage.

## The check-in conversation, `/checkin/:id`

### Where it goes

**Admin (Naomi).**

- "← Back": goes to `/grounds`.
- "Try again": not pressed, because it changes something.
- "↑": cannot be pressed yet.

**Lead (Tendai).**

- "Read yours": goes to `/checkin/1788aa85-5543-47f7-8143-616dd19e3ba3/report`.
- "Something here isn’t right": goes to `/checkin/e0714ea0-dac6-45fd-8f10-6742898fc6a3`.

**Member (Esther).**

- "← Weekly sales push, Nairobi": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/p`.
- "Try again": not pressed, because it changes something.
- "What this check-in is about, and what you said last time": opens a box: "What this check-in is about, and what you said last time Close".
- "+": stays on the page and shows "Getting your first question ready. This can take a minute or two. / Add a photo or a document / Paste text / It starts private to you. You choose who can read i".
- "↑": cannot be pressed yet.

### What leads here

- In the product: App, InferenceReviewPanel, gw/GroundChat, gw/TheCheckInYouJustFinished, gw/checkin/TheDonePage, gw/checkin/YourWork, hooks/useOpenSession, grounds/GroundAdminPage, join/JoinConfirmPage, report/SessionReportPage.
- Email and WhatsApp: Reminder and session-open mails (`email.service.ts` buildCheckInUrl).

## A session's report, yours then the team's, `/checkin/:id/report`

### Where it goes

**Admin (Naomi).**

- "Back": goes to `about:blank`.
- "Back to check-ins": goes to `/grounds`.

**Lead (Tendai).**

- "Check-ins": goes to `/grounds`.
- "Start my check-in": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`.
- "Ask": not pressed, because it changes something.
- "This is not what I said": stays on the page and shows "You said this is not what you said. It counts toward nothing. / This is something you got done. You said this is not what you said.".
- "See the shared picture for this session": goes to `/checkin/a73dd590-c5ed-4c35-a8cb-fd064750dbcc`.
- "Something here isn’t right": stays on the page and shows "You said this is not what you said. It counts toward nothing. / This is something you got done. You said this is not what you said. / There is nothing on record".
- "Download your record": not pressed, because it changes something.
- "Something here is not what I said": stays on the page and shows "You said this is not what you said. It counts toward nothing. / This is something you got done. You said this is not what you said. / There is nothing on record".
- "Group by person": stays on the page and shows "You said this is not what you said. It counts toward nothing. / This is something you got done. You said this is not what you said. / There is nothing on record".
- "All 4 groups": stays on the page and shows "You said this is not what you said. It counts toward nothing. / This is something you got done. You said this is not what you said. / There is nothing on record".
- "How much there is to go on, and what it is built from": stays on the page and shows "You said this is not what you said. It counts toward nothing. / This is something you got done. You said this is not what you said. / There is nothing on record".
- "Copy the link to this report": not pressed, because it changes something.
- "Board": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2/board`. (beside the main column)
- "Check-in": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (beside the main column)
- "Context and resources": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=context`. (beside the main column)
- "My work": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=record`. (beside the main column)
- "People and setup": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=settings`. (beside the main column)
- "Report": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2?tab=report`. (beside the main column)

**Member (Esther).**

- "Check-ins": goes to `/grounds`.
- "Start my check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Ask": not pressed, because it changes something.
- "This is not what I said": not pressed, because it changes something.
- "See the shared picture for this session": not pressed, because it changes something.
- "Something here isn’t right": not pressed, because it changes something.
- "Download your record": not pressed, because it changes something.
- "Something here is not what I said": not pressed, because it changes something.
- "Group by person": not pressed, because it changes something.
- "All 4 groups": not pressed, because it changes something.
- "How much there is to go on, and what it is built from": not pressed, because it changes something.
- "Copy the link to this report": not pressed, because it changes something.
- "Board": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871/board`. (beside the main column)
- "Check-in": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`. (beside the main column)
- "Context and resources": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`. (beside the main column)
- "My work": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=record`. (beside the main column)
- "People and setup": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=settings`. (beside the main column)
- "Report": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=report`. (beside the main column)

### What leads here

- In the product: gw/SharedReportForAParty, gw/TheReportIsAListOfSessions, gw/checkin/TheDonePage, gw/checkin/YourWork, board/BoardPage, chat/ChatPage.

## Plan and billing, `/billing`

### Where it goes

**Admin (Naomi).**

- "Choose a plan for your team's size": stays on the page; nothing visible changes.
- "Move to this": not pressed, because it changes something.
- "Contact us": stays on the page; nothing visible changes.
- "Get a project back on track": goes to `/grounds/bb076fe3-94ae-4898-bb95-ced5bb5d77f4`.
- "Fatou Diallo’s handover": goes to `/grounds/0fcd6d22-558d-4366-9476-c813c5d81741`.
- "The move that saved the week": goes to `/grounds/4a8a5fbe-2bd6-442c-845f-48cb8f82abd5`.
- "How the depot week is going": goes to `/grounds/1b60cd34-cb80-488a-a9bc-6dc2076fbf9d`.
- "The quarter’s plans and what they cost": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`.
- "Where the partnerships work went": goes to `/grounds/76a20bf2-df44-48ae-bcf3-9ccd72e74406`.
- "The new stock system, four depots": goes to `/grounds/4ab79d9d-be9c-478c-b576-1d712b336055`.
- "Weekly sales push, Nairobi": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871`.
- "Request a call": not pressed, because it changes something.

**Lead (Tendai).**

- Nothing to press on the page itself.

**Guest from another organisation (Amina).**

- "Change": stays on the page; nothing visible changes.
- "Move to this": not pressed, because it changes something.
- "Contact us": not pressed, because it changes something.
- "Amina's project check-in, from 7 October": goes to `/grounds/ef199e88-a1be-4bba-837b-f14200609690`.
- "Amina's project check-in": goes to `/grounds/2b953b3c-b6c8-4338-a3b2-aa7b6979f720`.
- "Get a new project off to a good start": goes to `/grounds/f35ec5b5-8d28-4049-92c3-e0809687c9f8`.
- "Wanjiru, first 90 days": goes to `/grounds/4f8191fc-f5b3-4af5-959f-0a6858c9125e`.
- "Request a call": not pressed, because it changes something.

### What leads here

- In the product: gw/WhosInItRoster, gw/nav-items, billing/BillingCallbackPage, enter/EntryChatPage, grounds/CreateGroundPage, grounds/an-admin-lands-on-a-check-in-list, org/InvitePeople, org/OrgMembersPage.
- Email and WhatsApp: Billing mails: payment failed, trial ending, subscription, codes, "Upgrade your organization" (`email.service.ts` 1641-1886).

## Pricing, `/pricing`

### Where it goes

**Admin (Naomi).**

- "Subscribe": not pressed, because it changes something.
- "Contact us": goes to `mailto:hello@myground.work`.

**Signed out.**

- "Subscribe": not pressed, because it changes something.
- "Contact us": goes to `mailto:hello@myground.work`.

### What leads here

- In the product: PostSessionPanel, gw/checkin/SessionPaywallModal, grounds/CreateGroundPage.

## Request a call, `/talk-to-us`

### Where it goes

**Member (Esther).**

- "← Back": not pressed, because it changes something.
- "A coach in the room Setting us up Integration support Something else": not pressed, because it changes something.
- "Send the request": cannot be pressed yet.

**Signed out.**

- "← Back": goes to `about:blank`.
- "A coach in the room Setting us up Integration support Something else": not pressed, because it changes something.
- "Send the request": cannot be pressed yet.

### What leads here

- In the product: gw/AppShell, gw/HelpModal, billing/BillingCallbackPage, more/MorePage.

## Add sessions (old checkout), `/billing/checkout`

### Where it goes

**Admin (Naomi).**

- "Back": goes to `about:blank`.
- "Have an access code?": stays on the page and shows "Access code / Apply".

### What leads here

- In the product: billing/BillingPage.

## After a payment, `/billing/callback`

### Where it goes

**Admin (Naomi).**

- "Try another card": goes to `/billing`.
- "Talk to us": goes to `/talk-to-us`.

### What leads here

- In the product: nothing links here.

## Your settings, `/settings`

### Where it goes

**Admin (Naomi).**

- "Change password": not pressed, because it changes something.
- "Change": stays on the page and shows "Save / Cancel".
- "People page": goes to `/org/members`.
- "Plan and billing": goes to `/settings/billing`.
- "Emails from Groundwork that we decide to send" (switch): a switch, not pressed (it changes a setting).
- "Download it": not pressed, because it changes something.
- "Remove your name and email": not pressed, because it changes something.
- "Leave": not pressed, because it changes something.
- "Sign out": goes to `/signout`.

**Lead (Tendai).**

- "Change password": not pressed, because it changes something.
- "Change": not pressed, because it changes something.
- "Emails from Groundwork that we decide to send" (switch): a switch, not pressed (it changes a setting).
- "Download it": not pressed, because it changes something.
- "Remove your name and email": not pressed, because it changes something.
- "Leave": not pressed, because it changes something.
- "Sign out": goes to `/signout`.
- "The quarter’s plans and what they cost Your turn": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (beside the main column)

**Member (Esther).**

- "Change password": not pressed, because it changes something.
- "Change": not pressed, because it changes something.
- "Emails from Groundwork that we decide to send" (switch): a switch, not pressed (it changes a setting).
- "Download it": not pressed, because it changes something.
- "Remove your name and email": not pressed, because it changes something.
- "Leave": not pressed, because it changes something.
- "Sign out": goes to `/signout`.

**Guest from another organisation (Amina).**

- "Change password": not pressed, because it changes something.
- "Change": not pressed, because it changes something.
- "People page": goes to `/org/members`.
- "Plan and billing": goes to `/settings/billing`.
- "Emails from Groundwork that we decide to send" (switch): a switch, not pressed (it changes a setting).
- "Download it": not pressed, because it changes something.
- "Remove your name and email": not pressed, because it changes something.
- "Leave": not pressed, because it changes something.
- "Sign out": goes to `/signout`.

### What leads here

- In the product: gw/AppShell, gw/nav-items, more/MorePage.

## More (phone menu), `/more`

### Where it goes

**Admin (Naomi).**

- "Jump to…": opens a box: "Check-ins Get a project back on track".
- "Company": goes to `/company`.
- "You": goes to `/you`.
- "Boards": goes to `/boards`.
- "Your settings": goes to `/settings`.
- "Help": stays on the page; nothing visible changes.
- "Talk to us": goes to `/talk-to-us`.
- "Send feedback": not pressed, because it changes something.
- "People": goes to `/org/members`.
- "Connections": goes to `/settings/connections`.
- "Suites": goes to `/settings/suites`.
- "Plan and billing": goes to `/billing`.
- "Sign out": not pressed, because it changes something.
- "Join or create an organisation": goes to `/welcome`. (beside the main column)

**Lead (Tendai).**

- "Jump to…": not pressed, because it changes something.
- "Company": goes to `/company`.
- "You": goes to `/you`.
- "Suites": goes to `/settings/suites`.
- "Boards": goes to `/boards`.
- "Your settings": goes to `/settings`.
- "Help": not pressed, because it changes something.
- "Talk to us": goes to `/talk-to-us`.
- "Send feedback": not pressed, because it changes something.
- "Sign out": not pressed, because it changes something.
- "The quarter’s plans and what they cost Your turn": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (beside the main column)
- "Join or create an organisation": goes to `/welcome`. (beside the main column)

**Member (Esther).**

- "Jump to…": not pressed, because it changes something.
- "You": goes to `/you`.
- "Your settings": goes to `/settings`.
- "Help": not pressed, because it changes something.
- "Talk to us": goes to `/talk-to-us`.
- "Send feedback": not pressed, because it changes something.
- "Sign out": not pressed, because it changes something.
- "Join or create an organisation": goes to `/welcome`. (beside the main column)

**Guest from another organisation (Amina).**

- "Jump to…": not pressed, because it changes something.
- "Company": goes to `/company`.
- "You": goes to `/you`.
- "Boards": goes to `/boards`.
- "Your settings": goes to `/settings`.
- "Help": not pressed, because it changes something.
- "Talk to us": goes to `/talk-to-us`.
- "Send feedback": not pressed, because it changes something.
- "People": goes to `/org/members`.
- "Connections": goes to `/settings/connections`.
- "Suites": goes to `/settings/suites`.
- "Plan and billing": goes to `/billing`.
- "Sign out": not pressed, because it changes something.
- "Join or create an organisation": goes to `/welcome`. (beside the main column)

### What leads here

- In the product: gw/AppShell.

## People, `/org/members`

### Where it goes

**Admin (Naomi).**

- "Move to a larger plan": goes to `/settings/billing`.
- "Who reports to whom Level and reporting lines describe the organisation. What someone can ": stays on the page; nothing visible changes.
- "All teams": not pressed, because it changes something.
- "Everyone" (radio): stays on the page; nothing visible changes.
- "Owner" (radio): stays on the page and shows "0 people shown. / Nobody here matches that.".
- "Admins" (radio): stays on the page and shows "1 person shown.".
- "Can open check-ins" (radio): stays on the page and shows "3 people shown.".
- "Take part" (radio): stays on the page and shows "5 people shown.".
- "Guests" (radio): stays on the page and shows "0 people shown. / Nobody here matches that.".
- "Needs something" (radio): stays on the page and shows "1 person shown.".
- "Open": goes to `/org/members/e32ca13d-cb84-44a9-ba64-6615b0212271`.
- "Open": goes to `/org/members/0bf239f7-8e84-4913-b89f-609bf98ca9fa`.
- "Open": goes to `/org/members/1c49695c-0bf7-4042-9469-17ada8d05d2a`.
- "Open": goes to `/org/members/092d40f1-059f-4a93-95f1-4b123a6f60bd`.
- "Open": goes to `/org/members/9c73409f-8702-4787-b0bd-891cd338d5fe`.
- "Open": goes to `/org/members/2d020c33-280e-48dc-b1c4-cc8b50c4645a`.
- "and 1 more": stays on the page and shows "Show fewer".
- "Open": goes to `/org/members/00179645-58c6-497c-b720-bffb6596ac71`.
- "Open": goes to `/org/members/ddb9df20-d882-4a5c-a223-b536c3d38ab6`.
- "Invite a colleague": not pressed, because it changes something.
- "Takes part Can open check-ins Admin": not pressed, because it changes something.
- "Send their invitations": cannot be pressed yet.
- "Upload a list": not pressed, because it changes something.
- "Anyone with an @kijani.test email" (switch): a switch, not pressed (it changes a setting).
- "Change": opens a box: "Change the domain Close".
- "The invite link for Kijani Foods" (switch): a switch, not pressed (it changes a setting).
- "Only the people you name You choose who on this page. Everybody else takes part." (radio): stays on the page; nothing visible changes.
- "Anybody signed in here Anyone at Kijani Foods can start a check-in." (radio): not pressed, because it changes something.
- "Check-ins wait for an admin" (switch): a switch, not pressed (it changes a setting).
- "Send the guide": not pressed, because it changes something.
- "See the plans": goes to `/billing`.

**Lead (Tendai).**

- "Back to your check-ins": goes to `/grounds`.
- "The quarter’s plans and what they cost Your turn": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (beside the main column)

### What leads here

- In the product: gw/WhosInItRoster, gw/nav-items, gw/ui/PageTitle, grounds/GroundAdminPage, grounds/an-admin-lands-on-a-check-in-list, org/OnePersonPage, settings/SettingsPage, suites/SuitesPage.
- Email and WhatsApp: "Someone is waiting to be let in" and approval mails (`email.service.ts` lines ~274).

## One person, `/org/members/:id`

### Where it goes

**Admin (Naomi).**

- "Change": stays on the page and shows "Cancel".
- "Admin Manages people and billing, and can read every check-in." (radio): stays on the page; nothing visible changes.
- "Can open check-ins Can start check-ins and run them. Takes part in others." (radio): stays on the page; nothing visible changes.
- "Takes part Answers the check-ins they’re invited to." (radio): not pressed, because it changes something.
- "Guest From another organisation. Sees only the check-ins they’re invited to." (radio): not pressed, because it changes something.
- "Save": cannot be pressed yet.
- "Open": goes to `/grounds/f9ad5070-c16d-4aa8-b56a-2cb2ae646871?tab=context`.
- "Remove": not pressed, because it changes something.

### What leads here

- In the product: org/EveryoneHere.

## Running a check-in (guide), `/org/guide`

### Where it goes

**Lead (Tendai).**

- "← Back to check-ins": not pressed, because it changes something.
- "Copy the link": not pressed, because it changes something.
- "Open a check-in": not pressed, because it changes something.
- "The quarter’s plans and what they cost Your turn": goes to `/grounds/37d076ee-62fe-4705-9b00-fc811fb1c4e2`. (beside the main column)

**Signed out.**

- "← Back to check-ins": goes to `/auth?next=%2Fgrounds`.
- "Copy the link": not pressed, because it changes something.
- "Open a check-in": goes to `/start`.

### What leads here

- In the product: grounds/GroundAdminPage, org/OrgMembersPage.

## Connections, `/settings/connections`

### Where it goes

**Admin (Naomi).**

- "Set it up": goes to `/settings/tools`.
- "Connect": goes to `/settings/tools`.
- "Add it, switched off": cannot be pressed yet.
- "Ask to connect your own systems": goes to `/settings/tools`.
- "Read how it works": goes to `/settings/tools`.
- "Set up": goes to `/settings/tools`.

**Member (Esther).**

- "Back to your check-ins": goes to `/grounds`.

### What leads here

- In the product: gw/nav-items, connections/WhatsAppSetupPage, grounds/an-admin-lands-on-a-check-in-list, org/IntegrationsPage, suites/CustomersPage, suites/SuitesPage.

## Your organisation's own WhatsApp number, `/settings/whatsapp`

### Where it goes

**Admin (Naomi).**

- "How to get these": goes to `https://developers.facebook.com/docs/whatsapp/cloud-api/get-started`.
- "Connect": cannot be pressed yet.
- "Read how this works": goes to `/settings/tools`.

### What leads here

- In the product: connections/ConnectionsPage.

## Connect your own tools, `/settings/tools`

### Where it goes

**Admin (Naomi).**

- "Read them": stays on the page and shows "I accept the terms for connecting your own tools. Hide them / What it is for. The API connects your own systems to Groundwork for your own organisation: your pe".
- "Ask for access": cannot be pressed yet.

### What leads here

- In the product: App, connections/ConnectionsPage, connections/WhatsAppSetupPage.
- Email and WhatsApp: API access mails link `/org/integrations`, which redirects here (`api-access.service.ts`, `webhooks.service.ts`, `email.service.ts` ~914).

## Groundwork staff pages, `/admin and /admin/*`

### Where it goes

**Admin (Naomi).**

- "Go to my check-ins": goes to `/grounds`.

### What leads here

- In the product: gw/nav-items, admin/AdminDashboardPage, admin/WhatsAppSettingsPage, ops/OpsLayout, prompts/PromptTestPage, prompts/PromptVersioningPage.

## Every report side by side (staff), `/preview/reports`

### Where it goes

**Admin (Naomi).**

- "Go to my check-ins": goes to `/grounds`.

### What leads here

- In the product: nothing links here.

## Unsubscribe, `/unsubscribe/:token`

### Where it goes

**Signed out.**

- Nothing to press on the page itself.

### What leads here

- In the product: nothing links here.
- Email and WhatsApp: Footer of digest and marketing mails.

## Stop reminders, `/stop-reminders/:token`

### Where it goes

**Signed out.**

- Nothing to press on the page itself.

### What leads here

- In the product: nothing links here.
- Email and WhatsApp: Footer of reminder mails ("Stop these reminders").

## Nothing is at this address, `any other address`

### Where it goes

**Member (Esther).**

- "Go to Today": goes to `/today`.

**Signed out.**

- "Start a check-in": goes to `/start`.

### What leads here

- In the product: nothing links here.


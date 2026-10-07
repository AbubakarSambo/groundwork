# Nothing removed: the live product's screens against ours

Written on 8 October 2026 by the reviewer, on branch `wip/prototype-ui` (HEAD `6d611fa2`), against the live product, which is the branch `mine/wip/live-staging` (last commit `5197f22d`, "Merge pull request #320"). The live branch was read with `git show` and `git archive` only. No product code was changed.

## Summary

What was compared:

- **Every route.** All 59 `<Route>` lines in live's `client/src/App.tsx`. Every live address still exists in ours. Two now redirect (`/org/setup` to `/org-new`, `/org/integrations` to `/settings/tools`), and `/stop-reminders/:token` draws a new page that still stops reminders. All three were checked and do the same job (table 3).
- **Every endpoint the live client knows.** All 314 calls defined in live's `client/src/api/*.ts`. Every one is still in ours except `POST /auth/register-magic-link`, which was replaced on purpose (table 3).
- **Every call a live screen makes.** All 364 distinct `xxxApi.method` calls and all 23 direct `apiClient` calls made from live pages and components. Each was traced to the file that makes it in ours, and the component was checked to be drawn on a page someone can reach.
- **Every button, link, field, toggle and menu item.** All 754 controls in live's `.tsx` files were matched by their words and their handlers against ours. About 60 with no plain match were followed by hand.
- **The navigation.** Live's sidebar items and menu (All check-ins, Boards, People, Connect, Billing, Platform ops, Settings, the check-in list with rename, the organisation switcher, "Start my own workspace", sign out, the floating Help and Feedback buttons) against ours.

What came out:

| | Count |
| --- | --- |
| Removed with no decision, to restore | **3** (all SCREEN; the API still supports each) |
| Removed by Hafsah's decision or a standing rule, for her to confirm | **4** |
| Moved, and still working in the new place | **32** |
| Looked removed, but never worked on live | **1** |

Nothing in the back office (`/admin`, `/ops`, `/admin/prompts`, `/preview/reports`) lost a control. The billing page, the API keys and webhooks page, the people page and settings each kept every action, though several moved.

## 1. Removed with no decision: to restore

| Item | Live's place | What a person could do | Ours | SCREEN or ENGINE | Prototype screen to restore it in |
| --- | --- | --- | --- | --- | --- |
| Your notes for your next check-in, listed, with a way to delete one | `client/src/components/gw/GroundChat.tsx` lines 362 to 449 (`groundsApi.myNotes`, `groundsApi.deleteMyNote`, the "Waiting for your next check-in" list with a "×" on each note). Drawn on the Check-in tab between sessions, for the lead (`GroundAdminPage.tsx` line 1696) and for a participant (`GroundParticipantPage.tsx` line 576). | Between sessions, a lead or a participant could see every note they had written for their next check-in and delete one that was wrong or no longer needed, before the check-in asked them about it. | Missing. `BetweenCheckIns.tsx` can add a note ("Add a note for next time") but never lists the notes or deletes one. `GroundChat` is no longer drawn anywhere (retired from the Check-in tab in `b9244b1f`), so `myNotes` and `deleteMyNote` have no screen. A note written by mistake can no longer be taken back. | SCREEN. `GET /grounds/:id/my-notes` and `DELETE /grounds/:id/my-notes/:noteId` still exist, and `client/src/api/grounds.ts` lines 455 to 472 still call them. | `B3-the-check-in/between-check-ins` (it already shows "Add a note for tomorrow"; the waiting notes belong under it). |
| The day the check-ins land on: a weekday for weekly or fortnightly, a day of the month for monthly | `client/src/pages/enter/EntryChatPage.tsx` line 4017 ("On which day? (optional)", seven day buttons) and line 4050 ("On which day of the month? (optional)", a select), state at line 1330, sent as `cadenceAnchorDay` at lines 2062 and 2345. | A lead setting up a check-in could say "every Monday" or "on the 15th of each month", and the server schedules every next session on that day (`cadenceToDate` reads `cadenceAnchorDay`). | Missing. `EntryChatPage.tsx` line 1738 fixes it at `null`, and line 4762 passes `anchorDay={null}`. Removed in `61fe0f0c` ("one day picker on the setup") because setup.txt shows one picker. That is the prototype's layout, not a decision by Hafsah. "On which days" (`WhichDaysTheyWork`) says which days people work, not which day a check-in opens, so a weekly check-in now drifts with whenever the last one was finished, and a monthly one can no longer be pinned to a date. Choosing a single working day comes close for weekly, but there is no way to pin a day of the month. Existing check-ins keep the day they have, because the API still reads it. | SCREEN. The create and entry routes still accept `cadenceAnchorDay` (`api/src/modules/grounds/dto/create-ground.dto.ts`, `entry.service.ts`), and `conversation.service.ts` line 6956 still uses it. | `B1-starting-a-check-in/setup` (under "How often"), and `A4-people-roles-and-access/check-in-people-and-setup` (under "How often") so a lead can change it later. |
| A name for the Slack or Teams channel when connecting it | `client/src/pages/org/IntegrationsPage.tsx` line 930 ("Channel, as you call it (optional)"), sent as `channelSaid` at line 160. | An admin could name the channel ("#sales-leads"), and the connections list then said which channel each notice goes to ("Slack · #sales-leads"). | Missing. `client/src/pages/connections/ConnectionsPage.tsx` line 315 sends only the address. The list still shows a name when one was saved before (line 348), but a new connection cannot be given one. Small, but an organisation with two channels cannot tell them apart. | SCREEN. `integrationsApi.connectWorkspace(kind, url, channelSaid?)` and the API still take it. | `F1-connections/connections` (the "Post a notice to a channel" section). |

## 2. Removed by Hafsah's decision: for her to confirm

| Item | Live's place | The decision, quoted |
| --- | --- | --- |
| "I have read this - sign it off" on each setup question, and its tally ("3 of 7 setup questions signed off") | `client/src/pages/grounds/GroundAdminPage.tsx` lines 148 and 327, with `pages/grounds/the-setup-steps-you-have-checked.ts` (`GET`, `POST` and `DELETE /grounds/:id/setup-sign-offs`) | Commit `38d8c078` (29 September): "'I have read this - sign it off' is removed everywhere, not only for a non-running admin - Hafsah's own instruction: the prototype's 'Yes, set it' (ContextChat.tsx) is the confirmation that actually changes something, and this was a second one nobody asked for." The API routes are still there, unused. SCREEN. |
| "See the counts behind this" under the judgement, a table of how many people answered each question and how each person's answers stood | `client/src/components/gw/TheJudgement.tsx` lines 129 to 145 | CLAUDE.md, privacy: "Leads never see how a person's answers were rated." The engine workspace stopped serving the table in `aba063cd` (task 1.2, fix 4): "`theTable` is the counting sheet the judgement is computed from... It was also being served... and a standing on how each person's answers were rated - which a lead may never read at all." Ours: `TheJudgement.tsx` line 37, "The table ... is gone: the server no longer sends it to anybody." ENGINE. |
| The coverage bar under a person on the board, a percentage of where their work lands | `client/src/pages/board/BoardPage.tsx` (the coverage "bar" variant) | CLAUDE.md, "No labels on people. No scores or labels ... shown on a person", applied in request 111 (a), 2 October: "Amani's board answer carries her own `coverage.confidence: 0.15`, `pct: 0` ... Hafsah's rule is that leads never see how a person's answers were rated." The screen still draws the bar when the engine sends `pct` (ours `BoardPage.tsx` line 4486); the engine no longer always sends it. ENGINE. |
| An admin who is not the lead rewriting "What this check-in is for", and confirming setup changes | Live's `ContextPage` offered "Rewrite this" to the lead and to any admin of the organisation (live `GroundAdminPage.tsx` lines 2428 to 2435: "The brief stays rewritable for both") | Decision 72 (1 October): "Rewriting a check-in's brief follows the same rule as other setup changes. Only the lead can, unless the lead has left the organisation; then an admin can, and people are told who did it." Decision 63 (30 September): "Only the lead confirms setup changes and questions for people ... unless the lead has left the organisation." Ours reads `mayChangeSetup` from the server (`ContextPage.tsx` line 109). Note for Hafsah: `docs/morning-report-ui.md` line 7201 says an earlier 8 September decision ("she should rewrite") was restored; decision 72 came after it and is what the code now follows. |

## 3. Moved

| Item | Where it is now |
| --- | --- |
| `/org/setup` (organisation name and contact email) | `/org/setup` redirects to `/org-new` (`App.tsx` line 482). `OrgNewPage.tsx` names the organisation and takes a billing email, creating or renaming as needed. |
| `/org/integrations` (the whole "Connect" page) | Redirects to `/settings/tools` (`App.tsx` line 700). API access request, keys (issue, replace, revoke, copy), webhooks (add, rotate, reactivate, remove, replay), deliveries, imports, retention, the embed with its placement, and "For your engineer" are all on `IntegrationsPage.tsx`. |
| WhatsApp number of your own (connect, switch on and off, test, templates) | `/settings/whatsapp`, `pages/connections/WhatsAppSetupPage.tsx`; disconnect and test also on `/settings/connections`. |
| Slack and Teams notices (connect, test, switch on and off, disconnect) | `/settings/connections`, `ConnectionsPage.tsx` `NoticesSection` (lines 310 to 380), except the channel name (table 1). |
| "Connect" in the sidebar | "Connections" (`nav-items.tsx` line 140), admin only, as before. |
| "Billing" in the sidebar | "Plan and billing" (`nav-items.tsx` line 167). Keep, resume, pause, cancel, change card and invoices, change plan, access codes (make, copy, email) and "Request a call" are all on `BillingPage.tsx`; `/settings/billing` is a second address for it. |
| `/stop-reminders/:token` from an email | `StopRemindersPage.tsx` stops them on opening, and offers to turn them back on or stop all. The old email tokens still work (`api/src/modules/email/the-reminder-link.controller.ts`). |
| Switching organisation from the sidebar (with a confirm box) | The sidebar row opens "Choose an organisation", `/orgs` (`OrgsPage.tsx`, `authApi.switchOrganization`). |
| "Start my own workspace" in the sidebar | `OrganisationChoices.tsx` sends the person to `/org-new`, which creates the organisation (`authApi.createOrganisation`). |
| The floating "?" Help button | "Help" in the person's own menu (`AppShell.tsx` line 1167) and on "More" on a phone (`MorePage.tsx` line 59). Hafsah, 26 September (U.3), quoted in `HelpModal.tsx` line 361: "The prototype has no floating help button on any screen." |
| "Invite a team member" on the check-ins list (one address, admin only) | People, "Invite people" (`InvitePeople.tsx`): one or many addresses, with a role. The People page's "Invite a colleague" scrolls to it. |
| People page: change someone's role, their WhatsApp number, hand the organisation on | One person's page, `/org/members/:id` (`OnePersonPage.tsx`), which also offers Guest and removing someone. |
| People page: let in or turn away someone waiting | `WaitingToBeLetIn.tsx` on the People page. |
| People page: search | `EveryoneHere.tsx`, with team and role filters. |
| Settings: who may open a check-in, and whether check-ins wait for an admin | People page, `WhoCanOpenACheckIn.tsx`. |
| Settings: the email notifications on and off | Settings, "What we send you" (a switch; also undoes a stop from an email link, decision 109). |
| Settings: download what Groundwork holds about you | Still on Settings, and also on the You page. |
| Check-ins list: "In progress" and "Closed" tabs | One list with a "Finished" section (`GroundsListPage.tsx` line 282), plus a search. |
| Check-ins list: approve or turn down a check-in waiting for an admin | `an-admin-decides-whether-it-starts.tsx`, on the list and on the check-in. |
| A check-in's tabs Report, Sessions and "What I shared"; Setup | Under "My work" as sub-tabs; Setup is "People and setup" (`ebb24b06`). `?tab=` links still land. |
| Between sessions on the Check-in tab: your earlier sessions' words, open the session, add a note, "Change how often this runs", add a document | Earlier sessions on "My work" (`MyCheckInSessions.tsx`); opening the session on the Check-in tab; a note and "Change how often this runs" in `BetweenCheckIns.tsx`; a document on the Context tab ("Add a document", open to participants). Only listing and deleting notes was lost (table 1). |
| The open link with its QR code, and "Or share an access code instead" | People and setup, "Copy an invite link" (`ShareSection.tsx`, drawn by `WhosInItRoster.tsx`) and the access code modal. |
| Copy a person's invite link, copy their check-in link, send the invite again, fix a bounced address, remind someone | People and setup, each person's row (`GroundAdminPage.tsx` lines 2170 to 2230, `WhosInItRoster.tsx`). |
| Check-in settings: who sees whom, hide emails, who sees targets, WhatsApp or not, "Do these people work together?", "Ask what they tried" | People and setup (`CheckInPeopleAndSetup.tsx`). |
| Close the round now and publish; begin the closing session; delete a check-in; ask us to archive it | People and setup and the Check-in tab ("Publish it now", the closing session, "Yes, delete it", the archive email). Ending is also on `/grounds/:id/end`. |
| Finishing a session ("Complete session", "Not seeing a wrap-up?") | The end card's "That's right, finish" (`TheEndCard.tsx`) and "Finish my check-in now" (`ChatPage.tsx` line 1641). Declining a session is still there. |
| "What you said last time", with "N more lines" | The "What this check-in is about" panel lists every line (`ChatPage.tsx` lines 1440 to 1450). |
| "What to look for" before a document is uploaded on Context | The review step after upload (`AddADocument.tsx`, the note field). |
| The paywall when opening a session (free extension, subscribe, access code) | Shared by the lead's and the participant's pages (`hooks/useOpenSession.ts`, `SessionPaywallModal.tsx`). |
| "Send it again" on "Check your email" | `LinkSentPanel.tsx`, now through `entrySave`, because `/auth/register-magic-link` created accounts and failed for every existing one (comment in `api/auth.ts` line 76). |
| Naming the organisation after a Google sign-up | `/org-new` in naming mode (`OrgNewPage.tsx`). |
| On the board, a target's Lower, Raise and Remove; the coverage bar and text chips | Behind one quiet "Change" for each target (`17a1d2be`), and one quiet choice for the coverage view. All five board actions (add, adjust, remove a target, set and vote in a poll) are still drawn. |

The old team report (`ReportBody` in live's `pages/report/ReportPage.tsx`, with "Did this feel fair?", adding a person the report suggested, "Revisit my last session to correct it" and downloading each session's record) was not drawn by any route on live either: live's `/grounds/:id/report` already redirected to the Report tab. Each of those actions has a working home in ours all the same: the fairness question and adding a suggested person are on the board (`BoardPage.tsx` lines 372, 383 and 3483), correcting a session is on the Done page and the session report, and the download is on the session report ("Download your record", `SessionReportPage.tsx` line 525).

## Looked removed, but never worked on live

- **"Save scenario" on Setup** (live `GroundAdminPage.tsx` line 3094). Live's `PATCH /grounds/:id` takes no `scenario` field and refuses unknown fields (`forbidNonWhitelisted`), so pressing it on live failed. Ours shows the situation as a plain row with no Change (`CheckInPeopleAndSetup.tsx` line 313, U.4 review item 10). If Hafsah wants a lead to change the situation of a running check-in, that is new ENGINE work, not a restore.

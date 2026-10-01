# The screens workspace: the work, in order

For the Claude Code working on `wip/prototype-ui`. Read `CLAUDE.md` first, especially "Two workspaces". The engine workspace, on the other computer, is fixing reports and the conversation at the same time. **Never change the engine's code.** Ask for what you need in `docs/requests-to-engine.md`.

Tick each box (`[x]`) when it passes the tester and the reviewer. If a task is stuck after three tries, mark it `[!] Needs Hafsah` with the reason, and move on.

**Every task is "done" only when:**

- All existing tests pass (any changed test is explained in the commit and the morning report).
- The reviewer has opened every screen in that module's folder in `docs/prototype/screens/`, and the same screen in the real product, as the same person. Everything the prototype shows is there, the wording is the same (copied from the `.txt` files, never from the prototype's code), and clicking does the same thing.
- Nothing in `docs/prototype/not-to-build.md` was built.
- Privacy holds for every reader, enforced in the backend.

**Screens show what the engine writes today.** Where the engine's words are still poor, build the screen properly anyway; the words will improve when the engine workspace's work is merged in. If a screen needs a field the engine does not give yet (for example suggested answers, or each line's mark), build the screen to show it when it is there, and write a request.

**For each module:** read its section in `docs/modules.md`, its pictures and wording in `docs/prototype/screens/<module>/`, and its row in `docs/backend-map.md`. Make the backend changes it needs first (outside the engine), then the screens.

---

## Phase 0. Get ready (every session)

- [x] **0.1 Check it is safe:** your own branch `wip/prototype-ui`; test keys only; emails do not really send; a local test database on this computer, not shared with the other one.
- [x] **0.2 Stay in step:** `git fetch mine`, `git merge mine/wip/plain-reports`, then push `wip/prototype-ui`. (Before the very first push, do the deploy check in `CLAUDE.md`.)
- [x] **0.3 Read the answers** the engine workspace left in `docs/requests-to-engine.md` on its branch: `git show mine/wip/plain-reports:docs/requests-to-engine.md`.

## Phase U. The prototype's screens and the suites

- [x] **U.1** A1 Look and layout: the colours, type, buttons, tags, the four marks, the sidebar, the phone layout, "Jump to" search, pinning, the short tour, help *(Done. No tour, as Hafsah decided: a new organisation's Today page has the welcome card and checklist instead, built in U.3 and U.5. The links to Today, Company, You and Suites come with those pages.)*
- [x] **U.2** A2 Accounts and signing in *(Done, with every sign-in decision Hafsah made on 26 September.)*
- [x] **U.3** A3 Organisations and joining (including joining by email domain, and your own web address and logo) *(Passed its review on 27 September, on the third round. Your own web address comes later, as Hafsah decided.)*
- [x] **U.4** A4 People, roles and access (levels, reporting lines, access to each check-in, "Check-ins wait for an admin", requests to an admin) *(Passed its review on 27 September, on the fifth round. What waits for Hafsah is in item 15.)*
- [x] **U.5** C1 Today and the check-ins list *(Passed its review on 27 September, on the third round. What waits for Hafsah is in item 16.)*
- [x] **U.6** B1 Starting a check-in *(Passed its seventh review on 27 September. The lead's first check-in card still waits for Hafsah, in item 17.)* (the screens; the 8 new situations' conversation instructions belong to the engine workspace, so request them)
- [x] **U.7** B2 Context *(Passed its fifth review on 27 September. The engine's parts wait on requests 6, 39, 40, 41 and 42, and some choices wait for Hafsah in items 18 and 31.)* (including a plan turned into proposals, and what a target assumes)
  - [ ] **U.7b, after the people screens (Hafsah, 29 September):** rename the Context tab and page to "Context and resources"; make the page read-only, showing what Groundwork has been told and agreed, with the prototype's Resources panel for documents and no chat of its own; check the tab name fits at phone width. Add documents in Ask Groundwork, with what it pulled out shown to confirm before saving, built from the engine's answer. Check live that the same documents give the same saved targets and context through both chats. Keep the old context chat until the engine says in `docs/answers-from-engine.md` that every item is proven; only then remove it. Full wording in `docs/morning-report-ui.md`, "Hafsah's decisions".
- [ ] **FIRST after the people group (protected, Hafsah 29 September): the screens for the engine's new pattern shape and the "Say what's behind it" answer box**, so patterns can be switched on. Built from the engine's answer to request 79 (c). Patterns, role behaviour, coaching strategies and the probe structure are never removed, hidden or simplified; see the morning report, "The protected screens".
- [x] **From Hafsah's answers of 29 September (item 11, closed).** *(Done 30 September; see the morning report.)* Full wording in `docs/morning-report-ui.md`, "Hafsah's decisions".
  - [x] People page (this group): someone declined at the door reads "Not let in", shown to admins only. *(Done 30 September, and on People and setup, the one-person page and the roles table too.)*
  - [x] The invitation: the prototype's first line; drop the two held sentences; the rest built from the check-in's real settings; the admins line left out on a performance plan, promotion or renewal (the field comes from the engine, request 78); today's "Nobody you work with reads it" panel replaced.
  - [x] The new admin's welcome card, in Hafsah's exact sentence.
  - [x] Joining: the invite link is random, not guessable; someone whose email does not match the domain waits for an admin; no DNS proof for now.
  - [x] Before being let in: name one admin, as in the prototype; remove "27 people there" and "and text".
  - [x] Leave out your own web address and logo entirely until they are built.
  - [x] "All 38 of your check-ins" counts real check-ins, not sessions.
  - [x] Lift the one-organisation limit: a person can create more than one organisation, each with its own plan.
- [x] **U.8** B3 The check-in screens *(Passed its sixth review on 28 September. The engine's parts wait on requests 2, 7, 43, 45, 47, 49 and 50, and some choices wait for Hafsah in items 0c, 0d and 19.)*: the header, pause, suggested answers, the + button for proof, the end card, the Done page (show the engine's current output; request suggested answers and marks)
- [ ] **U.9** B4 Reports and sharing *(Passed its review on 28 September, on the fifth round. Not ticked: one engine test, the-order-is-the-order-on-screen.spec.ts, fails on one heading until the engine changes its label to the prototype's (request 62). The engine's text waits on requests 9 and 51 to 61.)* (the screens; request any report changes)
- [ ] **U.10** B5 The board *(Built and tested on 27 September, apart from the engine's text (request 11) and what waits for Hafsah (item 21). Not ticked: the review could not sign in; see item 14.)*, including the switchboard's sections (every section's data comes from the record, the latest report, or another system, and none may go stale between reports)
- [ ] **U.11** B6 Ending a check-in, the probation review, handover *(Built and tested on 27 September, apart from the engine's parts (request 13) and what waits for Hafsah (item 22). Not ticked: the review could not sign in; see item 14.)*
- [ ] **U.12** C2 The You board *(Built and tested on 27 September, apart from the engine's parts (request 14) and what waits for Hafsah (item 23). Not ticked: the review could not sign in; see item 14.)*
- [ ] **U.13** C3 Suggestions from verdicts, and appeals *(Built and tested on 27 September, apart from the engine's suggestion text (request 15) and what waits for Hafsah (item 24). Not ticked: the review could not sign in; see item 14.)* (a new backend part, outside the engine's text; request the engine's suggestion text)
- [ ] **U.14** D1 Ask Groundwork *(Built and tested on 27 September, apart from the engine's parts (request 16) and what waits for Hafsah (item 25). Not ticked: the review could not sign in; see item 14.)* (the panel and its requests confirmed first; request engine changes for claims and thinking it through)
- [ ] **U.15** D2 The Company page *(Built and tested on 27 September, apart from the engine's parts (request 17) and what waits for Hafsah (item 26). Not ticked: the review could not sign in; see item 14.)*
- [ ] **U.16** D3 Links between check-ins, and each person's load *(Built and tested on 27 September, apart from the engine's parts (request 18) and what waits for Hafsah (item 27). Not ticked: the review could not sign in; see item 14.)*
- [ ] **U.17** E The Suites page, then each suite, one at a time: onboarding, leave (with a stand-in), time sheets, reviews, when someone leaves, role map, spending and budgets, to-dos, customers and deals, equipment *(The Suites page and all ten suites built and tested on 27 September, apart from the engine's parts (requests 20 to 29) and what waits for Hafsah (item 28). Not ticked: the review could not sign in; see item 14.)*
- [ ] **U.18** F1 Connections and channels *(Built and tested on 27 September, apart from what waits for Hafsah (item 29). Not ticked: the review could not sign in; see item 14.)*
- [ ] **U.19** F2 Billing (keep Stripe exactly as it is; take plans and prices from the database) *(Built and tested on 27 September, apart from what waits for Hafsah (item 30). Not ticked until its review.)*
- [ ] **U.20** F4 Small states and errors
- [ ] **U.21** F5 Groundwork staff

F3, the public site, is a separate project. Leave it.


## Every screen still built from old parts (counted 30 September: 96 pages)

Rebuilt from the shared parts in four groups, each with a picture check per screen, and the full screen suite, the page-colour test and the reviewer once per group.
- [x] **Group 1, settings and account:** Settings (SettingsPage), Plan and billing (BillingPage and settings/billing), Connections (ConnectionsPage, WhatsAppSetupPage), the developer page (IntegrationsPage), More (MorePage).
- [x] **Group 2, your own pages:** Today, You, Company and company context, Suites and each suite's board (review, leaving, spending, equipment, time sheets, leave, reviews, onboarding), the check-ins list (GroundsListPage).
- [ ] **Group 3, check-ins and signing in:** the rest of GroundAdminPage, ChatPage, CreateGroundPage, EntryChatPage and SaveCard, ReportPage and SessionReportPage, the sign-in pages (AuthPage, auth-kit, MagicVerifyPage), JoinPage.
- [ ] **Group 4, the back office:** AdminPage, AdminDashboardPage, the ops pages, the prompt pages.

## The engine's answers of 30 September, to draw on the screens

Each is in `docs/answers-from-engine.md`. They come after group 1, in this order.
- [ ] **Request 82 and decision 67:** put each pattern under "About each person's work" or "How what people say can run ahead of what happened" by its `about`. Show the lead `coachTowards` and `oneStep` under the person the pattern is about. The person, a colleague and an admin never receive them.
- [ ] **Request 85:** someone an admin did not let in reads "… was not let in by …, so there is nobody to ask", with no chasing and no label on the person.
- [ ] **Request 87:** the heading uses `overTime.inSessions` ("What people said they would do, in 1 session").
- [ ] **Request 89:** "In {saidBy}'s words" from `saidBy`, beside whose the record is.
- [ ] **Decision 65:** open Ask Groundwork from a check-in's own Context and resources page with `groundId` and `openedFrom: "check_in_setup"`, only from the lead's page.
- [ ] **The suggestion thresholds admin page:** show `labels.keptBelow` and `labels.overPeriods`, not the field names (group 4).

## The engine's answers of 1 October, to draw on the screens

Each is in `docs/answers-from-engine.md`, after the merge `a7c25b2d`. They come after groups 3 and 4, with the 30 September list above.
- [ ] **Request 17:** the Company page's company-wide picture, parts a to d.
- [ ] **Request 28:** where each customer stands, from the sales check-ins, on the Customers board.
- [ ] **Request 25:** the role map's role interview, and why a job nobody owns matters.
- [ ] **The switchboard's 22 sections:** draw the ones served and not yet drawn.
- [ ] **Week 11:** the ending page's suggestion, signals and questions, and reviews that fall due.
- [ ] **Request 9 (d):** the weekly report's sentence about each person.
- [ ] **Ask Groundwork, weeks 17 to 24:** answers that say where they came from, changes by talking after a yes, thinking it through, memory beyond one check-in, hours, spending and leave said in chat, being away, and a guest's Ask Groundwork.
- [ ] **Week 25:** the lead is told while the report is still being written.
- [ ] **Week 21:** the approver is told on Today.
- [ ] **Request 92, ready:** run the five live checks of Ask Groundwork again. If they pass, tell the engine, so it can switch the old context chat off. Then make "Context and resources" read-only.

## Clean-ups found on the way
- [x] No new one-off style class (Hafsah, 1 October): the guard `the-one-off-style-classes-only-go.spec.ts` freezes the 199 that are left, in `one-off-style-classes.ts`, and lets the list only shrink.
- [ ] Replace the one-off style classes on each group's pages with the proper shared parts, as part of that group's review, from group 3 on. Each page then gets its picture check against the prototype.
- [ ] Go back over the pages already reviewed, group by group, and do the same: U.1 to U.8, the people group, the board, group 1 and group 2.
- [ ] The old team report (`ReportBody` in `client/src/pages/report/ReportPage.tsx`): compare it with the rebuilt Report tab. Move any section the tab lacks into it, from the shared parts, especially anything about patterns, coaching, roles or probes. Then remove the old page and the tests that lock only it, and say in the report what was moved.
- [ ] Once Hafsah decides: compare CreateGroundPage (unreachable, `/grounds/new` sends people to `/start`) and the unused `pages/home/SaveCard.tsx` with the live entry chat, move anything it lacks, then remove them.

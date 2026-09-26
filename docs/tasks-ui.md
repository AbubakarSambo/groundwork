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

- [ ] **0.1 Check it is safe:** your own branch `wip/prototype-ui`; test keys only; emails do not really send; a local test database on this computer, not shared with the other one.
- [ ] **0.2 Stay in step:** `git fetch mine`, `git merge mine/wip/plain-reports`, then push `wip/prototype-ui`. (Before the very first push, do the deploy check in `CLAUDE.md`.)
- [ ] **0.3 Read the answers** the engine workspace left in `docs/requests-to-engine.md` on its branch: `git show mine/wip/plain-reports:docs/requests-to-engine.md`.

## Phase U. The prototype's screens and the suites

- [ ] **U.1** A1 Look and layout: the colours, type, buttons, tags, the four marks, the sidebar, the phone layout, "Jump to" search, pinning, the short tour, help
- [ ] **U.2** A2 Accounts and signing in
- [ ] **U.3** A3 Organisations and joining (including joining by email domain, and your own web address and logo)
- [ ] **U.4** A4 People, roles and access (levels, reporting lines, access to each check-in, "Check-ins wait for an admin", requests to an admin)
- [ ] **U.5** C1 Today and the check-ins list
- [ ] **U.6** B1 Starting a check-in (the screens; the 8 new situations' conversation instructions belong to the engine workspace, so request them)
- [ ] **U.7** B2 Context (including a plan turned into proposals, and what a target assumes)
- [ ] **U.8** B3 The check-in screens: the header, pause, suggested answers, the + button for proof, the end card, the Done page (show the engine's current output; request suggested answers and marks)
- [ ] **U.9** B4 Reports and sharing (the screens; request any report changes)
- [ ] **U.10** B5 The board, including the switchboard's sections (every section's data comes from the record, the latest report, or another system, and none may go stale between reports)
- [ ] **U.11** B6 Ending a check-in, the probation review, handover
- [ ] **U.12** C2 The You board
- [ ] **U.13** C3 Suggestions from verdicts, and appeals (a new backend part, outside the engine's text; request the engine's suggestion text)
- [ ] **U.14** D1 Ask Groundwork (the panel and its requests confirmed first; request engine changes for claims and thinking it through)
- [ ] **U.15** D2 The Company page
- [ ] **U.16** D3 Links between check-ins, and each person's load
- [ ] **U.17** E The Suites page, then each suite, one at a time: onboarding, leave (with a stand-in), time sheets, reviews, when someone leaves, role map, spending and budgets, to-dos, customers and deals, equipment
- [ ] **U.18** F1 Connections and channels
- [ ] **U.19** F2 Billing (keep Stripe exactly as it is; take plans and prices from the database)
- [ ] **U.20** F4 Small states and errors
- [ ] **U.21** F5 Groundwork staff

F3, the public site, is a separate project. Leave it.

# Release checklist

The release (Hafsah, 4 October 2026): one release that **(a)** Hafsah's first paid client can fully use, and **(b)** gives her two existing clients something better without losing anything they use today. Nothing else matters until it is done.

The engine workspace keeps this file current. The screens workspace reads it after every merge. Each item is marked **done** or **not done**, with the commit or the reason.

## What the paid client does
- Invited, and checks in on WhatsApp for their sales team, onboarding and projects.
- The lead gets the daily WhatsApp summary and sees the boards.
- People ask for leave and spending on WhatsApp and get approvals.
- Performance reviews work in the suites.
- Ask Groundwork helps people find their way.
- The Company page shows the company-wide picture.

## What the two existing clients need
- Their current check-ins carry on exactly as scheduled through the release: the same people, dates and reminders. No check-in is reopened, restarted, stalled or emailed by surprise.
- They lose no use case they have today.
- They get the new boards, reports, Company page and suites, working on their existing data.

## Engine (the engine workspace)
- [x] **Run-26 fix: a record is always owned by the person who said it**, enforced in code (run-26: Musa's "I signed for the loan" became Sunday's record; implementation and shock broke the rule too). *Done* (`f59502d9`).
- [ ] **Run-26 fix: a participant never reads the lead's judgement** (run-26: Sunday's Blockers tile quoted Amaka's view about who should have qualified for a loan). *Done* (`15d0d698`). Sent back by the privacy review on 4 October, then fixed (`b48b90ff` to `08bfcf93`): the lead's names now reach the wall on every read path, the guess is gone, the lead's rows are walled, and the Blockers tile hides the lead's words only where people do not see each other. One line in reports.service.ts is still to come (with the differences fix).
- [ ] **Run-26 fix: differences kept from the report's first version** when it is asked for a second time (run-26: six scenarios lost theirs). *Done* (`e02bbe30`, measured in run-28: advisor, board, pulse and realign together found 4 differences and 10 agreements, against 0 and 12 in run-26 and 4 and 1 in run-27).
- [ ] **Run-26 fix: the loans privacy rule** (decision 75 item 14): Sunday reads only what is about him, about several people, or the shared aim. The half-finished attempt was finished and its patch removed. *Done* (`904d9544`). Sent back by the privacy review on 4 October, then fixed (`b48b90ff` to `08bfcf93`): the lead's names now reach the wall on every read path, the guess is gone, the lead's rows are walled, and the Blockers tile hides the lead's words only where people do not see each other. One line in reports.service.ts is still to come (with the differences fix).
- [ ] **Request 118:** done in code (`c12aa05f` to `969cbe72`). The stored rows on the screens workspace's database need `api/journey/bring-a-check-in-up-to-date.ts`. *Engine part done; to be confirmed by the screens review.*
- [x] **Request 119:** the client's wording guard counted 65 lines against 60. *Done* (five engine lines reworded; the guard counts 60; two fixture files that quote reviews word for word are left as they are).
- [x] **Request 120:** the API did not start. *Done* (`4090223b`, with a test that builds the whole app).
- [x] **Request 121:** from the twelfth sales review. *Done* (`54d533a4`, `9a8d551e`, `9d2aae53`, `a6ee068f`, `96ee0b67`): "To close the gap" says the aim's own day; the stored copy of the lead's own aim, said again with no number, is taken off by `bring-a-check-in-up-to-date.ts` (run it again on the screens workspace's database); the lead is no longer told she can write what a target assumes; a person still waiting to be let in is not chased in "The team today"; the report's count of who has not answered leaves out a person not let in.
- [x] **Request 122:** Rukia's Today. *Done* (`0e4ff2db`, `0f8bde2d`): Today lists what her board lists (people waiting on her, her open commitments, the decisions), and "Coming up" gives the day the board gives. The screens workspace still has to leave out Today's items marked `onTheBoardToo` on the board page, so the lead does not read each twice.
- [x] **Request 123:** "What was agreed at the start", "Change since last check-in", "The 90 days, in three steps" (`ninetyDays`) and `patterns` are sent. *Done* (see the commits of 3 October). `whereThisIsHeading` is deliberately not built for evaluation check-ins (decision 6); it waits for Hafsah to confirm.
- [x] **Request 125:** the onboarding board is done on the screen. *Done* (`69f614b9`): a goal the lead has not told a person about stays with the lead on every path (the check-in page, the board, the report that WhatsApp and the API serve, Today, the movement tile, the You board, Ask Groundwork's recall); "Dr" is not a first name; "What needs you" and the team today give one count of the goals not told. Request 123's items 3, 4, 5, 9, 10 and 11 are fixed too (`75346073`, `bf5a40c0`). Item 8 (a label in a sentence the model writes into the agreements, and the outcome "The new person leaves the role.") is left for Hafsah; see the answer under request 123.
- [x] **Request 124:** Hafsah's answer (4 October). *Done* (`c12915ee`, `7f4a9c62`): on a new hire's check-in the new hire reads the lead's own words and row (decision 3); the lead's private notes and own report stay private; a decision is said to be below only where one has been made.
- [x] **The smaller run-26 faults:** "waiting on Everyone", "you will testing", the holder said twice, "my" outside quotation marks, names where "you" belongs, ".; " joins, empty shared-picture lines, a borrower coached as "Founder or CEO" (a person with no role is still coached, by a block that names no job). *Done* (with the onboarding faults "you will questions" and "0 days in all"). The two faults still open from the onboarding review, "2 waiting" against four waits and "Tobi says that Tobi ...", are fixed too.

## Screens
- [x] **The onboarding board** (the screens workspace): done on the screen (fourth review, request 125). The two engine faults from that review are fixed (see request 125).
- [ ] **The project board** (the screens workspace): matched to its prototype example (`docs/prototype/screens/G1-example-check-ins/eng.txt`), as lead and participant. *Not done.*
- [ ] **Leave, finance requests and performance reviews** (the engine workspace): reviewed against the prototype's suites screens. *Not done.*
- [ ] **The Ask Groundwork chat** (the engine workspace). *Not done.*
- [ ] **The Company page's company-wide picture** (the engine workspace). *Not done.*

## Existing clients
- [x] **`docs/existing-users.md`**, covering every use case and where it lives, what they will notice, what each migration and script changes, proof their scheduled check-ins continue unchanged (`api/journey/existing-clients-carry-on.spec.ts`), a read-only check for staging (`api/journey/existing-clients-check.ts`, with its spec) and how to roll back. *Done.*
- [x] **Existing clients, Finding 1:** a check-in the live main line already stalled is left alone by every nightly and morning job, as before (`A_GROUND_THE_JOBS_LEAVE_ALONE`). Reopening still works. `FINDING 1` is a plain test. *Done.*
- [x] **Existing clients, Finding 2:** the 08:30 reminder, the reminder before a session opens and the lead's daily summary reach only organisations that turned WhatsApp on. `FINDING 2` is a plain test. *Done; see "Decided for Hafsah to confirm" in `docs/existing-users.md`.*
- [ ] **Run `api/journey/existing-clients-check.ts` on staging, on a copy of the live data**, and read its summary (every FAULT, LEAK and SCHEDULE line). *Not done.*
- [ ] **Whatever that check shows is missing**, built. *Not done.*

## Hidden at release (never hide something an existing client uses today)
- [x] Boards for kinds of work nobody uses yet. Hidden from new check-ins by `release.boardKindsOffered`; existing check-ins keep their kind. `docs/deploy.md`, "Hidden at release".
- [x] The back office rebuild. Checked: none of it was built, so nothing to hide. The existing back office stays for Groundwork's staff.
- [x] The Context tab's move to Ask Groundwork. Hidden by `release.contextInAskGroundwork` (off). The old context chat stays.
- [x] Plan and billing's new parts. Hidden by `release.planAndBillingNewParts` (off); the trial switch stays off.

## Release
- [ ] Join with the live main line. *Not done.*
- [ ] One full 24-scenario run on the combined code. *Not done.*
- [ ] `docs/deploy.md`, `docs/release-questions.md` and the WhatsApp settings guide (`docs/whatsapp-settings.md`) up to date. *Not done.*

## Waiting on Hafsah (does not block the items above unless marked)
- The "picture" count in "proof asked for".
- The yes or no list in `docs/privacy-restrictions-for-hafsah.md`.
- ~~The four suites files the one-rule test flags.~~ Answered (decision 89): excused.
- **Pushing:** the commit of Hafsah's guard version 2 (`e4a51793`) was refused at push time by Claude Code's own permission check, as a change to its own settings. Every later push carries that commit, so nothing has been pushed since. Hafsah can push it herself (`git push mine wip/plain-reports`), or allow it.

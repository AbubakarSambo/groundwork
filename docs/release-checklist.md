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
- [ ] **Run-26 fix: a record is always owned by the person who said it**, enforced in code (run-26: Musa's "I signed for the loan" became Sunday's record; implementation and shock broke the rule too). *Not done.*
- [ ] **Run-26 fix: a participant never reads the lead's judgement** (run-26: Sunday's Blockers tile quoted Amaka's view about who should have qualified for a loan). *Not done.*
- [ ] **Run-26 fix: differences kept from the report's first version** when it is asked for a second time (run-26: six scenarios lost theirs). *Not done.*
- [ ] **Run-26 fix: the loans privacy rule** (decision 75 item 14): Sunday reads only what is about him, about several people, or the shared aim. A half-finished attempt is saved as `docs/unfinished/loans-privacy-rebuild.patch`; it fails the privacy spec and is not in the code. *Not done.*
- [ ] **Request 118:** done in code (`c12aa05f` to `969cbe72`). The stored rows on the screens workspace's database need `api/journey/bring-a-check-in-up-to-date.ts`. *Engine part done; to be confirmed by the screens review.*
- [ ] **Request 119:** the client's wording guard counts 63 lines against 60, three of them in engine files. *Not done.*
- [x] **Request 120:** the API did not start. *Done* (`4090223b`, with a test that builds the whole app).
- [ ] **Request 121:** from the twelfth sales review: "To close the gap" has the wrong date, one duplicate target is still stored, and the rest of that row. *Not done.*
- [ ] **Request 122:** Rukia's Today says "Nothing needs you right now." while her board lists people waiting on her, and gives the wrong day for the next check-in. *Not done.*
- [ ] **Request 123:** the onboarding board's new-hire sections are not sent ("What was agreed at the start", "Change since last check-in", and the rest of that row). *Not done.*
- [ ] **Request 124:** Hafsah's answer (4 October): yes, the new hire reads his lead's own words and row (decision 3). The lead's private notes and own report stay private. Remove the restriction, and fix "the decision with its reasons, are below" when no decision has been made. *Not done.*
- [ ] **The smaller run-26 faults:** "You are waiting on Everyone involved in the project", "you will testing", "from the provider … from the provider", "my" left in the speaker's words, names where "you" belongs on the cofounder boards, topics joined with semicolons, empty shared-picture lines, a borrower coached as "Founder or CEO". *Not done.*

## Screens
- [ ] **The onboarding board** (the screens workspace): finish the "1 of 1 checked in" fix, then its review. *Not done.*
- [ ] **The project board** (the screens workspace): matched to its prototype example (`docs/prototype/screens/G1-example-check-ins/eng.txt`), as lead and participant. *Not done.*
- [ ] **Leave, finance requests and performance reviews** (the engine workspace): reviewed against the prototype's suites screens. *Not done.*
- [ ] **The Ask Groundwork chat** (the engine workspace). *Not done.*
- [ ] **The Company page's company-wide picture** (the engine workspace). *Not done.*

## Existing clients
- [ ] **`docs/existing-users.md`**, covering:
  - every use case they have today, and where it lives in the new version;
  - what they will notice;
  - which of their data each migration and one-off script changes;
  - proof that their scheduled check-ins continue unchanged;
  - a check to run on staging, against a copy of the live data, proving their check-ins, boards and reports work and nothing private leaks;
  - how to roll back.
  *Not done.*
- [ ] **Whatever that check shows is missing**, built. *Not done.*

## Hidden at release (never hide something an existing client uses today)
- [ ] Boards for kinds of work nobody uses yet. *Not done.*
- [ ] The back office rebuild. The existing back office stays for Groundwork's staff. *Not done.*
- [ ] The Context tab's move to Ask Groundwork. The old context chat stays. *Not done.*
- [ ] Plan and billing's new parts. The trial switch stays off. *Not done.*

## Release
- [ ] Join with the live main line. *Not done.*
- [ ] One full 24-scenario run on the combined code. *Not done.*
- [ ] `docs/deploy.md`, `docs/release-questions.md` and the WhatsApp settings guide (`docs/whatsapp-settings.md`) up to date. *Not done.*

## Waiting on Hafsah (does not block the items above unless marked)
- The "picture" count in "proof asked for".
- The yes or no list in `docs/privacy-restrictions-for-hafsah.md`.
- The four suites files the one-rule test flags.
- **Pushing:** the commit of Hafsah's guard version 2 (`e4a51793`) was refused at push time by Claude Code's own permission check, as a change to its own settings. Every later push carries that commit, so nothing has been pushed since. Hafsah can push it herself (`git push mine wip/plain-reports`), or allow it.

# The screens workspace: handover

Written on 2 October 2026, in the evening, because the weekly allowance is nearly used up. Whoever carries on (this workspace in a new session, or the engine workspace) should start here, then read `CLAUDE.md`, `docs/tasks-ui.md` and the top of `docs/morning-report-ui.md`.

The branch is `wip/prototype-ui`. The last commit before this file is `f828693b`, and everything up to it is pushed to `mine`.

## The anchor scenario (5 October, in progress)

- **Hafsah answered Needs Hafsah 1, 3, 4, 8 and 14 as the plan recommends** (request 143):
  - "one to one", never "privately";
  - 20 includes the lead;
  - "for a month" may show;
  - the end of month gets four continue options in Stripe test mode;
  - the lead's "carrying" and "seeing" stay hers;
  - patterns keep the three-period rule.
- **Built, behind the switch:**
  - piece 2, the front door, at `/start/team` (AnchorLandingPage.tsx, with the words in the-anchor-hook.ts; 181b637c);
  - piece 3, "Fills in as you talk" with the seven items (a60c58e7).
  Both draw nothing until the engine sends their signals; today `/start/team` redirects to `/start`.
- **Waiting on the engine:**
  - request 144: a public read of the switch, the anchor entry route, how an anchor draft is marked, and the seven field names;
  - the served data for pieces 9 (the reveal page), 11 (people and invitation), 20 (the month board), 31 (the "active" line) and 33 (the end of month), from engine pieces 8, 10, 12 and 13, 30 and 32.
  Build each as soon as its data is served. Hafsah answered Needs Hafsah 9, 10 and 11 (request 145), so pieces 18, 21, 23, 25 and 27 wait only on the engine now.
- **MarketView Q4** waits on request 142 (a test check-in on this database).

## Phone-width check: done (5 October)

Every board was checked at 375 as the lead and as a participant, like a real user. Ten faults were fixed (68858359..96e444f1) and checked live:
- "Ask" opens the chat page on a phone, keeping the typed question.
- The check-in switcher stays on screen.
- Headings in the fold have their gap.
- Text boxes are 16px, so iPhone does not zoom.
- No card sticks out past its section.
- The deal grid's groups have their inset.
- No empty box under a role.
- "Groundwork does not know what kind of work…" is said once.
- Every control has a 40px tap area.
- No duplicate React keys.

The client's mirror of the engine's ending labels is in step (78e3e1dc). The wording guard fails again on engine lines (request 141).

**Next: the anchor scenario** (Hafsah, 5 October). Merge `mine/wip/plain-reports` to get `docs/anchor-scenario.md` and `docs/anchor-scenario-plan.md`. Build the screens the engine assigns to the screens workspace, almost word for word in its text and in the prototype's design:
- the front door;
- the lead's board;
- adding up to 20 people;
- the invitation page;
- the lead's board during the month;
- the end-of-month page.

Keep it behind its switch. The plan was not yet on the engine's branch at 0b62fb38.

## Next (5 October, Hafsah)

- **Confirmed by Hafsah:**
  - the operations heading, "Every incident, and what shows it";
  - the government board's question block, as gov.txt shows it;
  - patterns and coaching open on every board;
  - MarketView Q4 waiting for a real test check-in, which the engine workspace will make.
- **The one-off style clean-up waits until after release.** No new one-off classes, as before.
- **Now:** check every board on a phone-width screen (375), as the lead and as a participant, like a real user. Fix anything broken, cramped or cut off. Then match MarketView Q4 once the engine's test check-in arrives.
- **Merge the engine's work regularly.** The full API test suite runs on the engine workspace's computer, not here.
- The untracked `scratchpad/` folder inside the project is deleted.

## Founder's own check-in board: done (4 October)

"Founder’s own check-in, test" (3ca11603, one person), in founder.txt's order, after one review and its fixes (ee40c790..c2dd2f31), checked live (scratchpad `pictures/founder-A/`). A one-person check-in now says "you", not "the team", and no longer asks the founder to add somebody. The engine's part is request 136. The wording guard fails again on an engine file (request 137).

## "MarketView, where next" board: done (4 October)

"MarketView, where next, test" (a6ec96f6, stalled), lead and participant, in mvnext.txt's order: "In short", "By who they are", "Where next, ranked", "Where they disagree", "What this can't tell you", "Where this is heading" with each outcome's second line. This came after one review and its fixes (054fbc68..40b0e209), checked live (scratchpad `pictures/mvnext-A/`). A stalled check-in now reads "Out of time" with the prototype's sentence, "This check-in reached its end date. It ran until 30 September. Nothing new can be added until you give it more time." The engine's part is request 135.

## Law firm matter board: done (4 October)

"Kasarani Foods v Pwani Mills, test" (92625659), lead and participant, in matter.txt's order with "Where the matter stands", "What you need to decide" and "What changed this week, and what it changed" drawn, after one review and its fixes (015c1058..c0e419c9), checked live (scratchpad `pictures/matter-A/`). The engine's part is request 134.

## Asset loans board: done (4 October)

"Asset loans, cohort 3, test" (4e89d79c), lead and participant, in loans.txt's order with "Where the cohort stands" and "Support given, and whether it helped" drawn, after one review and its fixes (b5f1a789..0b5efc00), checked live (scratchpad `pictures/loans-A/`). The engine's part is request 133.

## Government programme board: done (4 October)

"Extension Access Programme, test" (ee96f03c), lead and participant, in gov.txt's order with its own three sections ("What each level understood", "What the visit log shows", "The counties"), after one review and its fixes (88572f42, 701444ff), checked live (scratchpad `pictures/gov-A/`). The engine's part is request 132. Two decisions for Hafsah are recorded: the question block is drawn as gov.txt shows it, and patterns and coaching stay open. Its button count is still over the prototype's (a known gap in the button test).

**Corrected (4 October):** the "buttons with no name" noted here earlier were a misreading by the capture script. They sit inside closed folds, where their text reads as empty. With the folds open, every button on every board has a name. A test now guards it (06612147).

## Trader training programme board: done (4 October)

"Trader training programme, test" (46cfcb15), lead and participant, matched to programme.txt after one review and its fixes (7c3bbba7), checked live (scratchpad `pictures/programme-A/`). The engine's part is request 131.

## Distribution operations board: done (4 October)

"Distribution operations, test" (f76b7a18), lead and participant, matched to ops.txt after one review and its six screen fixes, checked live (scratchpad `pictures/ops-A/`). The engine's part is request 130. Note: an earlier builder saved captures into an untracked `scratchpad/` folder inside the project. It is not committed, and can be deleted.

## Support desk board: done (4 October)

"Support desk, test" (48896035), lead and participant, matched to support.txt after one review and three fixes (a2596ea5..aa4c6d3b), checked live (scratchpad `pictures/support-A/`). BoardPage.tsx now has a per-kind table, `kindLayout`, for where sections sit. Each later kind is one row. The engine's part is request 129.

## Project boards: done (4 October)

Both situations, "Get a new project off to a good start" (555ac67d, engineering) and "Get a project back on track" (dac969d3), as lead and participant. The first review's eleven screen faults are fixed (06c9a1ac..6a207536) and checked live, with captures in the scratchpad's `pictures/project-check-eng/` and `project-check-drift/`. The engine's part is request 127. The local API runs the engine's 0b15efca, because its newest code does not compile (request 126). Next: Phase B, the other eight kinds of work, one at a time.

## Onboarding board: done (3 October)

The fourth review, on the engine's 0b15efca, says both Amina (the lead) and Tobi (the new hire) match what the prototype shows for a new hire, apart from the engine's faults (requests 123 and 125). Captures are in the scratchpad's `pictures/review-onboard-4/`. Next is the project board.

## Where it stopped (3 October, evening)

- **Done:** the sales board matches the prototype for both readers. The onboarding board's lead view matches, apart from the engine's requests 123 and 124. Hafsah answered 124: the new hire reads his lead's own words and row. The new hire's "1 of 1 checked in" fix is finished and tested (39bee66f).
- **Stopped at:** before my own check and the review of the new hire's board after that fix. Nothing of this has been seen on the live page yet.
- **Next:** check Tobi's board live (captures and script in the scratchpad's `pictures/review-onboard-3/`), run one review of both readers, mark onboarding done, then the project board for lead and participant. Read `docs/release-checklist.md` after each merge, once the engine writes it.
- **Done by Hafsah:** her guard version 2 is committed and pushed (99e55c65).

## Earlier: where it stopped (3 October, the weekly limit reached)

- **Sales board:** done, matched on the engine's code at ea5e2a54.
- **Onboarding board** ("Engagement Director, first 90 days", e2cfd3d8): the third review says the lead's board matches what the prototype shows for a new hire, apart from requests 123 and 124. The new hire's board has one fault left: his Reports rows read "1 of 1 checked in" because `client/src/lib/session-rows.ts` counts `ground.participants`, and `GET /grounds/:id` sends him only himself. A builder started the fix and was cut off by the spend limit. Its unfinished, **untested** changes to `client/src/lib/session-rows.ts` and `client/src/components/gw/TheReportIsAListOfSessions.tsx` are committed as work in progress. Next: check them, run `cd client && npx vitest run` and `npx tsc --noEmit`, finish the fix (count from the board's own participants, or draw no count), then a fourth review of both readers. Captures are in the scratchpad's `pictures/review-onboard-3/`.
- **Then:** the two project boards (`NEW_PROJECT`, engineering `555ac67d`; `DRIFT`, `dac969d3`), using the engine's item 21 notes now in `docs/tasks-ui.md`; then the check of every place the screen hides a field the engine sends, against `docs/privacy-restrictions-for-hafsah.md`.
- **Merged:** the engine up to 48baf9c2, its migrations applied locally; the local API and client were running on it. The wording guard (request 119) still fails, now at 66 against 60, on the engine's lines.
- **Needs Hafsah:** request 124 (what the new hire reads of his lead), the three restrictions at the top of the morning report, and the engine's list in `docs/privacy-restrictions-for-hafsah.md`.
- **Not mine:** `.claude/hooks/guard.py` shows as changed in the working tree. This workspace never edits `.claude/`, so it was left uncommitted, as found.

## Where every screen stands

### Done and matching the prototype (reviewed)

- **Group 1, settings and account:** Settings, Plan and billing, Connections, the WhatsApp set-up, the developer page. Passed after four review rounds.
- **Group 2, your own pages:** Today, the check-ins list, You, Company and the company context, Suites and each suite's board. Passed review.
- **Group 3, check-ins and signing in:** signing in and joining, the session report, the check-in conversation, the entry chat, and both check-in pages with every tab. Rebuilt and reviewed; its review's faults are fixed.
- **U.1 to U.8** in `docs/tasks-ui.md` are ticked: the look, accounts and signing in, organisations and joining, people and access, Today and the list, starting a check-in, Context, and the check-in screens.
- **The sales board, as the lead (Rukia) and the participant (Amani):** done on 3 October. The thirteenth review, on the engine's newest code (ea5e2a54), says both match the prototype at 1440 and 375, apart from what the engine still sends wrong (requests 121 and 122). Its captures are in the scratchpad's `pictures/review-sales-13/`.

### Partly done

- **The other ten kinds of work's boards:** founder, engineering, support desk, distribution operations, trader training programme, government programme, asset loans, law firm matter, "where next", and MarketView Q4 (subscriptions). Every fix to the shared board page reaches them too, but none has been reviewed against its own prototype example since the sales work. The board table at the top of the morning report says what was wrong with each before the sales work.
- **U.9 to U.19:** reports and sharing, the board, ending a check-in, the You board, suggestions and appeals, Ask Groundwork, the Company page, links between check-ins, the suites, connections, billing. All built and tested. None is ticked, mostly because the engine's part or a decision of Hafsah's is still waiting; each line in `docs/tasks-ui.md` says which.
- **The one-off style clean-up.** Five guard tests freeze what is left (see "How the guards work"). `BoardPage.tsx` still has 596 one-off uses, `WorkRecords.tsx` 76, and `TheSwitchboardsSections.tsx` 32.

### Not started

- **The Company page's company-wide picture:** this waits for the engine (request 17).
- **Plan and billing, with Hafsah's new decisions** (below).
- **The rest of batch C:** the clean-up of the conversation, the entry chat, and the My work tab (`YourWork.tsx`).
- **The Context and resources tab's last step:** it waits until the engine says Ask Groundwork's context work is ready (request 92 and its five live checks).
- **Group 4, the back office:** AdminPage, AdminDashboardPage, the ops pages, the prompt pages. Hafsah says this comes last of everything.
- **U.20 and U.21:** small states and errors, and Groundwork staff.

## What is in progress, and where it stopped

**The onboarding board** is next. The sales board is finished.
- Use the sales board as the pattern:
  - the prototype's sections first, in its order;
  - every extra section kept in one fold at the end;
  - coaching open straight after "What keeps coming up";
  - the reader always "you";
  - checkability drawn for exactly the readers the engine sends it to.
- Its prototype is the switchboard's list for "Help a new hire get started", the board's look in B5, and B6's day 30 and day 60 screens and the probation review.
- Before reviewing any check-in, run the engine's `api/journey/bring-a-check-in-up-to-date.ts` on it (local database only, `--check-in <id>`, with `--dry-run` first), so its stored rows follow the engine's current rules.

## What comes next (Hafsah, 2 October, late evening; this replaces every order below)

Hafsah's client needs these first:
1. **Three boards, in this order, each matched against its prototype example and reviewed:** the sales team; onboarding ("Help a new hire get started", `NEW_HIRE`); project, which is both "Get a new project off to a good start" (`NEW_PROJECT`) and "Get a project back on track" (`DRIFT`).
2. **The three suites the client uses, each matched against the prototype:** leave (`E-suites/suite-leave`), finance requests (`E-suites/suite-spend`), and performance reviews (`E-suites/suite-reviews`). Hafsah said "performance management" means the reviews suite.
3. **The Company page,** with the company-wide picture.
4. **The Ask Groundwork chat.**
5. **The other eight boards.**
6. **The back office.** It stays as it is for Groundwork's staff; its rebuild comes last.

Plan and billing keeps Hafsah's decisions of 2 October (a one-month free trial for teams under 20; WhatsApp as a paid add-on at about 80% of the plan price, with a monthly limit; no prices or limits written into the screens). It has no place in the client's list, so it comes after item 5.

`docs/screens-handover.md` is updated after every finished piece.

## The earlier order (2 October, evening), replaced by the one above

1. **Finish the sales board:** run the sixth review, as Rukia and as Amani, at 1440 and 375, against `docs/prototype/screens/B5-the-board/`. Fix what it finds.
2. **The other ten boards, one at a time**, each matched and reviewed before the next. Use the sales board as the pattern:
   - the prototype's sections first, in its order;
   - every extra section kept in one fold at the end;
   - coaching open straight after "What keeps coming up";
   - checkability drawn for exactly the readers the engine sends it to.

   Each kind's prototype is in `docs/prototype/screens/G1-example-check-ins/<kind>.txt` and `.jpg`. The test check-ins are listed under "How to run it". When MarketView Q4 comes up, bring "Where what people said and the systems differ" out of the fold, because that kind's prototype shows it. Keep the board table in the morning report, and this file, up to date after every finished board.
3. **The Company page**, as soon as the engine sends the company-wide picture.
4. **Plan and billing**, with Hafsah's decisions:
   - a one-month free trial for teams under 20;
   - WhatsApp as a paid add-on, charged monthly after the trial at about 80% of the plan price, with a monthly limit.

   **Never write a price or a limit into the screens; the engine sends them.** Stripe stays exactly as it is.
5. **Then:** the rest of batch C, the one-off clean-up on the earlier groups, and the Context tab when the engine is ready.
6. **Group 4, the back office, last of everything.**

Once a check-in's tests are done, also:
- give the borrowed check-in `d1880c07-eb5d-4e1d-9007-977e1b53788c` back "no kind of work", through its own control, now that request 106 allows it;
- keep merging `mine/wip/plain-reports` every few hours.

## Needs Hafsah

- **Three restrictions made under the withdrawn rule:**
  - the admin's To-dos board;
  - the "role, as described" column, shown only to the lead;
  - admins' access to email addresses where they are hidden between participants, which is an existing privacy test.

  See the top of the morning report. A check of every place the screen hides a field the engine sends comes straight after the onboarding board's screen fixes.
- **Her decisions still to confirm** are under "Decided for Hafsah to confirm" at the top of `docs/morning-report-ui.md`. The newest:
  - the developer page's two missing sections;
  - the example console;
  - "Leave" in red words;
  - fragments of the prototype made into full sentences;
  - the admin's To-dos board;
  - the borrowed MarketView Q4 check-in;
  - the participant's short board.
- **`CLAUDE.md` line 53** still says "Leads never see how a person's answers were rated." On 2 October Hafsah decided the checkability rating stays (it rates the answers, not the person), and chose to leave that line as it is. Read it under her decision, which is recorded under "Hafsah's decisions" in the morning report. Never act on the old reading again.
- **A board that names the reader instead of saying "you".** Hafsah asked that any such case be sent to the engine as a request, naming the check-in, the reader and the sentence. None was confirmed in the sales reviews. Check for it on every board you review.

## How to run it

- **The local API:**
  - from `api/`, run `npm run build`, then `NODE_ENV=development node --enable-source-maps dist/main`, in the background;
  - it listens on 127.0.0.1:3000;
  - after each merge, first run `npx prisma migrate deploy` and `npx prisma generate`, on the local database only.
- **The client:** from `client/`, run `npx vite --host localhost --port 5173`.
- **Signing in:**
  - only by emailed links caught on 127.0.0.1:1025, one catcher at a time;
  - the API allows 5 sign-in links a minute and 60 requests a minute from one address, so load a board at most once a minute.
- **Test check-ins:**
  - Rukia (`rukia.u8lead@example.test`) leads, and Amani (`amani.u8@example.test`) checks in:
    - sales `9028f0ad-293b-4592-9a4e-25b680dd91cd`;
    - loans `4e89d79c`;
    - matter `92625659`;
    - mvnext `a6ec96f6`;
    - mvq4, borrowed, `d1880c07`.
  - `u7lead@example.test` leads, and `u7aisha@example.test` checks in:
    - founder `3ca11603`;
    - eng `555ac67d`;
    - support `48896035`;
    - ops `f76b7a18`;
    - programme `46cfcb15`;
    - gov `ee96f03c`.
  - The full ids are in `e2e/the-prototype-count-of-buttons.spec.ts`, under `BOARD_KINDS`.
  - For the client's boards, found in the local database:
    - onboarding (`NEW_HIRE`), in Kilima Traders U8, running: `b0ab6395-070c-42a2-9f95-1e435f6e5f9e`, `f3c2057f-224c-4ec7-a954-fe01c62b5552` and `3bc90bfd-92aa-4b58-b04d-33fca0d71cb1`;
    - a new project (`NEW_PROJECT`): the engineering one, `555ac67d-44ad-4520-8717-54979e9d4f00`, running;
    - a project back on track (`DRIFT`): `dac969d3-c571-40b1-ada5-3eb7032bf90b`, running, and `1cf7728d-be07-45ff-9858-c501444fa6fe` in Kilima Traders U8, waiting for people.
    - Check who leads and who checks in on each before using it.
- **Tests:**
  - in `client/`: `npx vitest run` and `npx tsc --noEmit`;
  - in `api/`: `npx jest --maxWorkers=3`;
  - in `e2e/`: `npx playwright test the-prototype-count-of-buttons.spec.ts the-page-is-cream.spec.ts`.

## How the guards work

Five client tests stop the screens drifting from the prototype. Never weaken them.
- No new one-off style class.
- No new class without a shared part written up in `docs/the-parts-against-the-prototype.md`.
- No new `<style>` tag.
- No file may use one-off classes more often than it does today. The counts are in `one-off-uses-per-file.ts`, and may only go down.
- The rebuilt pages use only the shared parts in `client/src/components/gw/ui/`.

One more test in `e2e/` counts buttons against the prototype and allows at most one navy button. A known gap is marked there with `test.fail` and its reason; when the gap closes, remove its entry.

## Rules to keep (from Hafsah)

- **Privacy (3 October):** never add a privacy restriction that is not in Hafsah's decisions or the prototype. When unsure, follow the prototype; if it does not say, ask her. The old "more private option when unsure" is withdrawn. Draw whatever the engine sends. Never delete or weaken an existing privacy test; if one pins a restriction she never decided, ask her. Tell every helper.
- **Pushing:** the only push is `git push mine wip/prototype-ui`, run on its own, with no `cd … &&` or anything else chained to it.
- **Merging:** the only merge is `git merge mine/wip/plain-reports`, run on its own.
- **When the safety guard refuses something,** nobody reaches it another way. Write it down and move on.
- **Helpers:**
  - one at a time, and no helper starts helpers of its own;
  - every brief says to run in the foreground and leave nothing running;
  - every brief says never to search the whole disk. One builder did, on 2 October, and had to be stopped.
- **Engine code:** this workspace never changes it. Needs go to `docs/requests-to-engine.md`; the answers are in `docs/answers-from-engine.md`.

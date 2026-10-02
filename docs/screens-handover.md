# The screens workspace: handover

Written on 2 October 2026, in the evening, because the weekly allowance is nearly used up. Whoever carries on (this workspace in a new session, or the engine workspace) should start here, then read `CLAUDE.md`, `docs/tasks-ui.md` and the top of `docs/morning-report-ui.md`.

The branch is `wip/prototype-ui`. The last commit before this file is `f828693b`, and everything up to it is pushed to `mine`.

## Where every screen stands

### Done and matching the prototype (reviewed)

- **Group 1, settings and account:** Settings, Plan and billing, Connections, the WhatsApp set-up, the developer page. Passed after four review rounds.
- **Group 2, your own pages:** Today, the check-ins list, You, Company and the company context, Suites and each suite's board. Passed review.
- **Group 3, check-ins and signing in:** signing in and joining, the session report, the check-in conversation, the entry chat, and both check-in pages with every tab. Rebuilt and reviewed; its review's faults are fixed.
- **U.1 to U.8** in `docs/tasks-ui.md` are ticked: the look, accounts and signing in, organisations and joining, people and access, Today and the list, starting a check-in, Context, and the check-in screens.
- **The sales board, as the participant (Amani):** the fifth review says it matches, apart from the engine's faults.

### Partly done

- **The sales board, as the lead (Rukia).** The fifth review found four small screen faults. They are fixed in commits `7ad69fc6` to `f828693b`, and the tests pass, but **no review has seen the fixes yet**. That review is the very next step (below).
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

**The sales board ("Sales team, Q3", `9028f0ad-293b-4592-9a4e-25b680dd91cd`).**
- The fifth review's report and pictures are in the scratchpad's `pictures/review-sales-5/`. The scratchpad is temporary, so the important points are copied here.
- The fixes since then:
  - `7ad69fc6`: an action button only ever calls this check-in, by POST or PATCH, under `/grounds/<this check-in>/`.
  - `e02693b4`: "Over time" sits between "Who checked in" and "Reports".
  - `4b0873a9` and `1d6fd1c9`: "Not yet" shows the engine's own sentence when pressed, and saves nothing.
  - `1965d03f`: "Amani Wekesa has none of their 3 shops in Kilimani yet. The aim is 3 by 20 December."
  - `812f4330`: on the phone, "…and was not part of session 2."
  - `f828693b`: the coverage bar draws nothing from a number the server no longer sends.
- **It stopped here:** the sixth review has not run. When it says both readers match, apart from the engine's faults, mark the sales team done in the board table and in this file.

**The engine's open faults on the sales board** are request 117 in `docs/requests-to-engine.md`:
- a false "Met" on the 12-shop target;
- one aim stored three times;
- the headline target with no number;
- sessions counted two ways;
- deal owners missing;
- Neema's shop not counted;
- "waiting on themselves";
- one fact said three times in each row of "The team today";
- the number of days changing just by opening the board.

None of these counts against the screen.

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

- **Pushing:** the only push is `git push mine wip/prototype-ui`, run on its own, with no `cd … &&` or anything else chained to it.
- **Merging:** the only merge is `git merge mine/wip/plain-reports`, run on its own.
- **When the safety guard refuses something,** nobody reaches it another way. Write it down and move on.
- **Helpers:**
  - one at a time, and no helper starts helpers of its own;
  - every brief says to run in the foreground and leave nothing running;
  - every brief says never to search the whole disk. One builder did, on 2 October, and had to be stopped.
- **Engine code:** this workspace never changes it. Needs go to `docs/requests-to-engine.md`; the answers are in `docs/answers-from-engine.md`.

# Groundwork: rules for every session

Read this first, every session. Then read `docs/tasks.md` and carry on from the first task that is not ticked.

## How we fix things: five rules (Hafsah, 29 October 2026)

Standing rules for every fix. Follow them before any fix, and in each fix's note say how it meets them.

1. **Fix the cause, not the symptom.** Before changing code, find what produces the problem and every other place it shows up. One fix removes the whole pattern, not one instance.
2. **Leave it simpler.** Every fix removes or replaces code rather than adding to it. No new guards, filters, word lists or special cases. Delete any old patch the fix makes unnecessary.
3. **One source for each thing.** Every fact, number, date, session state and message has one owner, and everything else reads from it. If two places can disagree, make one read from the other.
4. **Understand, don't match.** The model works out what people mean from the record and their words. Fixed rules only where something is approved, paid, sent or seen (leave, money, messages, privacy), because those must be predictable.
5. **Prove it didn't break something else.** Test the whole pattern, not just the reported case; run the touched tests and a short real run; say what else the change affects before calling it fixed.

## The first principle: errors get fixed in the conversation (Hafsah, 22 October 2026)

Groundwork will never be free of errors, and more rules won't get it there. The standard is an excellent, intuitive team manager: a conversation that flows, gets the evidence, spots patterns, coaches well, and gets fixed easily when it's wrong. When Groundwork gets something wrong, the people it's about fix it, the way you'd correct a colleague.

1. Anyone can correct Groundwork in the conversation: in the check-in, in Ask, or on WhatsApp. "That's not right, I sent the Kilele proof on Monday." A lead can correct things about their team the same way.
2. A correction is a claim, so it goes through the same probe as any claim. Groundwork checks the record, asks for the proof naturally if it isn't there, and doesn't accuse. When it holds up, Groundwork says plainly what it changed, and the record updates everywhere: the board, the lead's morning, My work and Ask. A correction that isn't backed up stays unproven, like any claim.
3. Once fixed, it stays fixed. Groundwork never repeats something a person has corrected.

This principle sits above the detailed rules. Where a detailed rule conflicts with it, this principle wins, except the four safety guards.

## The goal

Bring the current Groundwork product up to the prototype, without losing anything valuable the product already does.

- **The prototype is the target.** Its screens, behaviour and wording are in `docs/prototype/`. Every screen is pictured, as the right person, with its exact wording, in `docs/prototype/screens/`.
- **The current product is the starting point.** Change it. Do not start again.
- **Nothing valuable is lost.** `docs/engine-value.md` lists what the engine does well today. `tools/score_run.py` measures it. If a number drops, the change is wrong, however good the wording looks.

## Where things are

| What | Where |
| --- | --- |
| The work, in order | `docs/tasks.md` |
| The prototype, its screens and wording | `docs/prototype/` |
| The modules the prototype is split into | `docs/modules.md` |
| The backend compared with the prototype | `docs/backend-map.md` |
| The audit of the prototype | `docs/audit.md` |
| What the product writes today, and how it should read | `docs/what-the-real-product-writes-today.md` |
| Decisions already made | `docs/decisions.md` |
| What must not be lost | `docs/engine-value.md` |
| What a good check-in sounds like | `docs/conversation-standard.md` |
| The right answer for each of the 24 scenarios | `theDecision` in `journey/all-24` scenario definitions |
| The longer scenario tests (sales, organisation, onboarding, law firm, government) | `docs/scenario-tests.md` |
| The score before any of this work | `docs/baseline.json` |
| The report for Hafsah | `docs/morning-report.md` |

## How the work runs

1. Take the first task in `docs/tasks.md` that is not ticked.
2. Hand the change to the **builder** helper. One change at a time, small commits, on this branch.
3. Hand it to the **tester** helper: all tests, then the scenario run and `tools/score_run.py --against docs/baseline.json`.
4. Hand it to the **reviewer** helper: it reads what a real person sees, as each person who uses it, and compares it with the prototype.
5. If anything is worse, go back to step 2. After three failed tries, mark the task "Needs Hafsah" in `docs/morning-report.md` with the reason, and move to the next task.
6. When it passes, tick the task, commit, and add a line to `docs/morning-report.md`.

Keep `docs/morning-report.md` up to date all the time, not only at the end.

## Rules that never bend

**Judge the output, never only the code.** Every real bug so far was found by reading what a person actually sees, not by reading the code or its tests. A test that checks your own new code against the old defect can pass while testing nothing. Check the rendered text, for each reader: lead, participant, admin.

**Wording.** Everything a person reads is in plain, full sentences that people with basic English understand. No clipped phrases. No pieces joined with colons, dots or arrows. No work jargon. Use people's names; the reader is "you". Copy the prototype's wording from its screens (`docs/prototype/screens/*/*.txt`), never from the prototype's code, which still holds some old wording. **The one exception (Hafsah, 21 October):** the lead's morning summary keeps its colon labels, "Target:", "Needs you today:", "Closing:" and "Your team:". Nowhere else joins pieces with colons.

**Privacy.** Enforced in the backend, never only hidden on screen.
- What people say in check-ins can be shown word for word to the people in that check-in.
- Private, always: questions to Ask Groundwork, each person's own report, a lead's private notes, each person's load across check-ins.
- A participant never reads the lead's judgement.
- Reports stay stored without names; names are swapped in only when served, and only through the wrapper that also handles anonymous sharing.
- A lead may see what a manager would see in a normal staff assessment, including check-in grades, specificity and coverage.
- Never delete or weaken a privacy test.

**No labels on people.** No scores or labels such as "PIP", "exit", "at risk" shown on a person. Say what happened, why, and what would change it. See "a verdict, told like a signal" in `docs/decisions.md`.

**Reports and boards** update only when something new comes in. Opening them never rebuilds them. Both are built from the record; the board also shows the latest report's story.

**The engine's instructions live in two places.** The prompts are in the code, but a version stored in the database (`PromptVersion`, served by `/prompts`) can override the file, and each report records which version ran (`promptVersionId`). When you change a prompt, make sure the version that actually runs is the new one, and prove it from the report's `promptVersionId`.

**The model stays Gemini.** Stripe billing, Resend emails, disputes, clarifications, handover, organisation memory, the developer API, and the 17 situations keep working exactly as now.

**Tests.** All must pass. If a test only checks old wording or old defective behaviour, update it, and write the reason in the commit and in the morning report. Never delete a test to make things pass.

**Tests run on your machine, not on GitHub (Abubakar, 19 November 2026).** GitHub Actions no longer runs the test suites automatically: they used up the free monthly Actions allowance and exceeded the runner's time limit. Before you push, run them yourself, `cd api && npx jest --ci --testPathIgnorePatterns=/journey/` and `cd client && npx vitest run`, and say in the commit or the morning report that you did. GitHub only deploys (staging and production). `Tests (PR)` can still be started by hand from the Actions tab. **Tell Hafsah this at the start of your next session with her**, in plain words: a green tick on a pull request no longer means the tests passed.

**Tests were pruned on 19 November 2026, by Abubakar's decision.** 43 spec files were deleted (stale wording checks, and whole-codebase audits such as dead methods, wiring and date formats), six leave-suite specs now freeze the date, and three source files got one-line guards for missing dependencies in hand-built test objects. The "never delete a test" rule above still applies to your own work. **Tell Hafsah this too**, and name the files if she asks: `git diff --stat` on the commit that carries this note.

**Where work may go (guard version 6, Hafsah, 30 October 2026).** Work is pushed to Hafsah's own private copy with `git push mine wip/<branch>` (or `git push mine <local>:wip/<branch>`). Release branches may also be pushed to "origin", Abubakar's repository (`AbubakarSambo/groundwork`), and their pull requests may be opened into staging and merged into staging. Never push to or merge into main or production, never force-push, and never delete a branch, on either repository. Nothing else goes to anyone else's branch. The only other merge allowed is `git merge mine/wip/<branch>` into a `wip/` branch, to keep `wip/next` in step with `wip/release`.

## One workspace

Since 11 October there is one copy of Claude Code, and it owns both the engine (`api/`) and the screens (`client/`). There is no screens workspace any more, so there are no requests or answers files between workspaces: every change is made here, engine and screens together. Check which branch you are on with `git rev-parse --abbrev-ref HEAD`:

| Your branch | What it holds | Your task list |
| --- | --- | --- |
| `wip/release` | The work for the open release: the must-fixes and recent decisions (decision 139), engine and screens | The table at the top of `docs/morning-report.md` |
| `wip/next` | Next month's work (reviews with ratings, finance batches, and the rest of `docs/roadmap.md`), never brought into `wip/release` | `docs/roadmap.md` |

**This workspace owns** the conversation, reports, boards' text, prompts, labels and names, the scorer runs, the screens (`client/`) and the backend parts the screens need (suites, the You board, the Company page, and so on). When a change needs both, make both in the same task, and check both: the engine's output and the screen that shows it, for each reader.

`docs/requests-to-engine.md`, `docs/answers-from-engine.md` and `docs/morning-report-ui.md` are kept as history. Nothing new is written in them; the morning report is `docs/morning-report.md` alone.

**Staying in step:** at the start of each session, and after each finished task, run `git fetch mine` and push your own branch. Next month's work goes on `wip/next` only; `wip/release` never takes it. When `wip/release` should reach `wip/next`, merge `mine/wip/release` into `wip/next`. If a merge has conflicts you cannot resolve safely, stop, abort the merge, and write it under "Needs Hafsah".

**Before the very first push of a new branch,** read every workflow in `.github/workflows/` and any deploy settings (for example `render.yaml`, `vercel.json`, `fly.toml`, `railway.json`, `Procfile`, `app.json`). If any of them would deploy, migrate a database, or touch staging when a `wip/` branch is pushed, do not push. Write it under "Needs Hafsah" and keep working locally.

**Never:** push to or merge into main or production, force-push, delete a branch, push anything to origin except a release branch, open a pull request into anything but staging, deploy anywhere except by merging into staging, change the git remotes, touch the live database, use live keys, send real emails, or edit `.env` files, `docs/decisions.md`, `docs/baseline.json`, `tools/score_run.py` or `.claude/`. The safety rules in `.claude/settings.json` block these.

## Stop and ask Hafsah (write it in the morning report, then move to the next task)

- Any change to a privacy rule.
- Anything on the "must keep" list in `docs/engine-value.md` that would have to change.
- A product decision nobody has made yet (for example, what "check-in" should mean).
- The prototype and the backend disagree, and `docs/backend-map.md` does not say which way to go.
- An engine-value number drops and you cannot get it back.

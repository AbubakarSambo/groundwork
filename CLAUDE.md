# Groundwork: rules for every session

Read this first, every session. Then read `docs/tasks.md` and carry on from the first task that is not ticked.

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

**Wording.** Everything a person reads is in plain, full sentences that people with basic English understand. No clipped phrases. No pieces joined with colons, dots or arrows. No work jargon. Use people's names; the reader is "you". Copy the prototype's wording from its screens (`docs/prototype/screens/*/*.txt`), never from the prototype's code, which still holds some old wording.

**Privacy.** Enforced in the backend, never only hidden on screen.
- What people say in check-ins can be shown word for word to the people in that check-in.
- Private, always: questions to Ask Groundwork, each person's own report, a lead's private notes, each person's load across check-ins.
- A participant never reads the lead's judgement.
- Reports stay stored without names; names are swapped in only when served, and only through the wrapper that also handles anonymous sharing.
- Leads never see how a person's answers were rated.
- Never delete or weaken a privacy test.

**No labels on people.** No scores or labels such as "PIP", "exit", "at risk" shown on a person. Say what happened, why, and what would change it. See "a verdict, told like a signal" in `docs/decisions.md`.

**Reports and boards** update only when something new comes in. Opening them never rebuilds them. Both are built from the record; the board also shows the latest report's story.

**The engine's instructions live in two places.** The prompts are in the code, but a version stored in the database (`PromptVersion`, served by `/prompts`) can override the file, and each report records which version ran (`promptVersionId`). When you change a prompt, make sure the version that actually runs is the new one, and prove it from the report's `promptVersionId`.

**The model stays Gemini.** Stripe billing, Resend emails, disputes, clarifications, handover, organisation memory, the developer API, and the 17 situations keep working exactly as now.

**Tests.** All must pass. If a test only checks old wording or old defective behaviour, update it, and write the reason in the commit and in the morning report. Never delete a test to make things pass.

**Nothing goes anywhere except Hafsah's own `wip/` branches.** The only push allowed is `git push mine wip/<branch>` (or `git push mine <local>:wip/<branch>`), where "mine" is Hafsah's own private copy on GitHub, never with force. **Never push to "origin": it is Abubakar's repository (`AbubakarSambo/groundwork`).** Never push to main, staging, production, or anyone else's branch. No pull requests, no deploys, and nothing goes to staging, until Hafsah says so herself, in her own words. The only merge allowed is `git merge mine/wip/<branch>` into a `wip/` branch, to stay in step with the other workspace.

## Two workspaces

Two copies of Claude Code work on this at once, on two computers. Check which one you are, with `git rev-parse --abbrev-ref HEAD`:

| Your branch | You are | Your task list | Your start message |
| --- | --- | --- | --- |
| `wip/plain-reports` | **The engine workspace:** reports and the conversation | `docs/tasks.md`, phases 0 to 2 | `START.md` |
| `wip/prototype-ui` | **The screens workspace:** the prototype's screens and the suites | `docs/tasks-ui.md` | `START-UI.md` |

**The engine workspace owns** the conversation, reports, boards' text, prompts, labels and names, and the scorer runs. **The screens workspace owns** the screens (`client/`) and new backend parts the screens need (suites, the You board, the Company page, and so on).

**The screens workspace never changes the engine's code:** the conversation, report synthesis, prompts, pattern detection, label and name handling, or `theJudgement`. If a screen needs something from the engine, it writes a request in `docs/requests-to-engine.md` on its branch, and carries on with something else. The engine workspace reads that file at the start of each session with `git fetch mine && git show mine/wip/prototype-ui:docs/requests-to-engine.md`, and answers in the same file on its own branch.

**Staying in step:** at the start of each session, and after each finished task, run `git fetch mine`, then `git merge mine/wip/<the other branch>`, then push your own branch. If the merge has conflicts in files the other workspace owns, keep their version. If you cannot resolve a conflict safely, stop, abort the merge, and write it under "Needs Hafsah".

**Before the very first push from either workspace,** read every workflow in `.github/workflows/` and any deploy settings (for example `render.yaml`, `vercel.json`, `fly.toml`, `railway.json`, `Procfile`, `app.json`). If any of them would deploy, migrate a database, or touch staging when a `wip/` branch is pushed, do not push. Write it under "Needs Hafsah" and keep working locally.

**Never:** push anywhere except your own `wip/` branch, merge anything except `mine/wip/<branch>` into a `wip/` branch, open a pull request, deploy anywhere (staging included), change the git remotes, touch the live database, use live keys, send real emails, or edit `.env` files, `docs/decisions.md`, `docs/baseline.json`, `tools/score_run.py` or `.claude/`. The safety rules in `.claude/settings.json` block these.

## Stop and ask Hafsah (write it in the morning report, then move to the next task)

- Any change to a privacy rule.
- Anything on the "must keep" list in `docs/engine-value.md` that would have to change.
- A product decision nobody has made yet (for example, what "check-in" should mean).
- The prototype and the backend disagree, and `docs/backend-map.md` does not say which way to go.
- An engine-value number drops and you cannot get it back.

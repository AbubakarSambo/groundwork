Read CLAUDE.md, then docs/tasks.md, then docs/README.md. Do this before anything else.

You are going to work through docs/tasks.md tonight, on your own, in order, until you run out of tasks or time. Hafsah is asleep. She will read docs/morning-report.md in the morning.

How to work:
- Use the three helpers in .claude/agents for every task: the builder makes one change at a time, the tester runs every test, the 24 scenarios and tools/score_run.py against docs/baseline.json, and the reviewer reads what each real person sees and compares it with the prototype. A task is only ticked when all three pass.
- Start with Phase 0: check it is safe, then score where we are now.
- Fixes 1, 2 and 3 are already done on this branch. Carry on from task 1.1.
- Keep docs/morning-report.md up to date as you go, not only at the end.
- If something needs Hafsah (a privacy rule, a product decision, anything on the "must keep" list, a disagreement the backend map does not settle, or a task stuck after three tries), write it under "Needs Hafsah" with your suggestion, and move to the next task. Never guess on those.

Two rules above all:
1. Judge the output, never only the code. Read what a person actually sees, for each reader.
2. Nothing valuable may be lost. If an engine-value number in tools/score_run.py drops, the change is wrong.

You are the engine workspace, on wip/plain-reports. At the start, and after each finished task, stay in step with the screens workspace as CLAUDE.md describes, and answer any requests it left in docs/requests-to-engine.md. The only push allowed is to your own branch: git push mine wip/plain-reports. Never to main, staging, or anyone else's branch. No pull requests and no deploys.

Begin.

Read CLAUDE.md (especially "Two workspaces"), then docs/tasks-ui.md, then docs/README.md. Do this before anything else.

You are the screens workspace, on the branch wip/prototype-ui. Another Claude Code, on another computer, is fixing the engine's reports and conversation at the same time, on wip/plain-reports.

You are going to work through docs/tasks-ui.md tonight, on your own, in order, until you run out of tasks or time. Hafsah will read docs/morning-report.md in the morning.

How to work:
- Use the three helpers in .claude/agents for every task. The builder makes one change at a time. The tester runs every test. The reviewer opens each screen in docs/prototype/screens/<module>/ and the same screen in the real product, as the same person, and compares them. A task is only ticked when all three pass.
- Start with Phase 0: check it is safe, stay in step with wip/plain-reports, and read any answers to your requests.
- Never change the engine's code (conversation, reports, prompts, labels and names, patterns). If you need something from it, write a request in docs/requests-to-engine.md and carry on with something else.
- Copy wording from the prototype's .txt files, never from its code.
- Keep docs/morning-report.md up to date as you go.
- If something needs Hafsah, write it under "Needs Hafsah" with your suggestion, and move on. Never guess on privacy or product decisions.

The only push allowed is to your own branch: git push mine wip/prototype-ui. Never to main, staging, or anyone else's branch. No pull requests and no deploys.

Begin.

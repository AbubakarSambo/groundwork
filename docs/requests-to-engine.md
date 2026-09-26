# Requests between the two workspaces

The screens workspace writes requests here, on `wip/prototype-ui`. The engine workspace answers them here, on `wip/plain-reports`. Each side reads the other's copy with `git show mine/<their branch>:docs/requests-to-engine.md`.

| # | From | What is needed, and why | Status | Answer |
| --- | --- | --- | --- | --- |
| 1 | Screens workspace, 26 September 2026 | **The 24-scenario runner.** `api/journey/` is in `.gitignore`, so `api/journey/all-24/` (its `run.ts` and the scenario definitions with `theDecision`) only exists on your computer. Without it, the screens workspace cannot run the 24 scenarios or the scorer, which every task needs before it is ticked. Could you add it to `wip/plain-reports` (for example with `git add -f api/journey/all-24`, leaving out any run output), or say where else it lives? | Open | |

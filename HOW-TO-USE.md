# How to use this kit

## Once, before the first night

1. **Make a separate copy** of the Groundwork code for this work, on its own branch, for example `fix/plain-reports` (where fixes 1 to 3 already are). Use test keys only: Stripe in test mode, WhatsApp off, emails set not to really send, and a local test database with made-up data. Never real customer data.
2. **Unzip this kit into the top of that copy.** It adds `CLAUDE.md`, `START.md`, `docs/`, `tools/` and `.claude/`. If the code already has a `CLAUDE.md` or `.claude/settings.json`, merge them rather than overwrite, or tell Claude Code to merge them.
3. **Export four docs from claude.ai** into `docs/`, with the names in `docs/README.md`. Phases 0 to 2 work without them. Phase 3, matching the prototype, needs `modules.md` and `backend-map.md`.

## Each night

1. Open the copy in the Claude Code desktop app, or in a terminal with `claude`.
2. Paste the contents of `START.md` and leave it running. If you let it act without asking permission, do that only in this separate copy. The safety rules in `.claude/settings.json` still stop it pushing, merging, touching the live database, using live keys, or editing the protected files.

## Each morning

1. Open `docs/morning-report.md`.
2. Paste it into the Claude chat where we planned this. We go through it together, and you answer the "Needs Hafsah" questions.
3. Nothing goes to staging, or anywhere else, until you decide. The kit keeps everything as commits on this computer, and its safety rules block pushing, pull requests, merges and deploys.

## What is in the kit

| Where | What |
| --- | --- |
| `CLAUDE.md` | The rules Claude Code reads every session |
| `START.md` | The message to paste each night |
| `docs/tasks.md` | The work in order: finish the reports, then the conversation, then each module of the prototype |
| `docs/decisions.md` | Every decision already made |
| `docs/engine-value.md` | What the engine does well and must not lose, and how each is measured |
| `docs/conversation-standard.md` | What a good check-in sounds like, with wrong-and-right examples |
| `docs/what-the-real-product-writes-today.md` | The problems in today's reports, and the before set |
| `docs/baseline.json`, `docs/baseline.md` | The scores from 25 September, before any fixes |
| `docs/morning-report.md` | The report Claude Code keeps for you |
| `docs/prototype/` | The prototype, its source, and a picture and the exact wording of all 135 screens, by module |
| `tools/score_run.py` | The checker: problems (must fall to zero), engine value (must not drop) and the conversation |
| `.claude/agents/` | The builder, the tester and the reviewer |
| `.claude/settings.json`, `.claude/hooks/guard.py` | The safety rules that always run |

# Local blind test, driven by Claude Code

Drop this folder into your repo. Open Claude Code. Say:

> Read CLAUDE.md and run the test.

Claude Code becomes each persona, drives a real browser, reads the emails the app sends,
and reports what confused it, what broke, and where it gave up.

## Setup

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

Point your app's SMTP at `127.0.0.1:1025` (no auth, no TLS). Then:

```bash
python mailcatcher.py          # leave running
python preflight.py --base-url http://localhost:3000
```

Preflight must pass before any agent runs. If it fails, the test cannot run, and
CLAUDE.md instructs Claude Code to say so rather than simulate.

## What is here

| File | What it does |
|---|---|
| `CLAUDE.md` | The instructions. Blind navigation, no fabrication, what to watch for. |
| `agents.json` | 50 personas across 4 sessions. |
| `mailcatcher.py` | Catches every email. Without this, invite journeys stop at "check your email". |
| `typography.py` | Em dashes, en dashes, curly quotes. On pages, emails, reports. |
| `preflight.py` | Verifies the loop works before anyone pretends to test. |

## Verified

The mail catcher survives quoted-printable soft-wrapping, which is what normally
mangles a long invite token into a broken link.

The typography checker catches an em dash even when the page serves UTF-8 with no
charset declared, and tells you about the charset bug too.

The full loop was tested end to end: a persona invites by email, the app sends real
SMTP, the catcher captures it, the link is extracted intact, and a second persona in
a fresh browser profile follows it and lands in the ground.

## Sessions run in order

State persists per persona in `state/<identity>/`. Sessions 2, 3 and 4 test whether the
product remembers people. They are meaningless if you wipe state between them.

Session 3 carries the central assert: **the report must cross-reference sessions 1 and 2.**
If it reads as a standalone snapshot, that is the most important failure in the test,
because it is the product's core promise.

## What this does not do

It does not read your code. A static audit finds the auth hole no persona happened to
trigger. This finds the pricing page that is correct and incomprehensible. Run both.

## Phase 1 scripted suites (deterministic, CI-gating)

| Runner | Guards |
|---|---|
| `run_suite_v_vanish.py` | THE vanish class: cross-context magic-link commit, idempotency, legacy path, explicit lost-session screen |
| `run_suite_m_sessions.py` | Multi-session return path: no paywall on the ground/participant pages, self-correction reachable |
| `run_suite_b_billing.py` | No $5 copy in the create flow, the 10-ground gate bites and explains itself, paid leg env-gated |
| `run_suite_l_layout.py` | Zero horizontal overflow, every picker card present, fold visibility at 1366x768 / 1280x720 / 375x812 |

Findings are the product: runners exit 0 when they RAN and report via
`results/<suite>/findings.json`; a non-zero exit means a HARD invariant broke
(the classes that actually bit us) or the runner crashed - CI goes red.

### Watching a run (preview-driven)

```bash
GW_WATCH=1 python3 run_suite_v_vanish.py
```

`GW_WATCH=1` runs HEADED: real Chromium windows walk the pages in front of
you, slowed enough to follow. Every step also writes a screenshot AND updates
`results/live/index.html` - a 1s-auto-refreshing board showing each suite's
latest page. Serve it (`python3 -m http.server 5199 -d results/live`, or the
`persona-live` entry in .claude/launch.json) and open it in the preview panel
to watch page-by-page from there.

Honesty note: the Claude preview browser cannot be driven directly by an
external Playwright process (no CDP handle), and Suite V NEEDS multiple
simultaneous browser contexts (the fresh zero-storage context IS the test).
Watch mode is the honest equivalent: the personas' own windows live on your
screen, and the live board mirrors every step with ~1s lag. Headless runs
(CI) keep the full step-by-step screenshot record as artifacts - never a
bare pass/fail.

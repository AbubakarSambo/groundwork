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

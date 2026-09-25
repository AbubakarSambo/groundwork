#!/usr/bin/env python3
"""Safety rules that always run before Claude Code acts. Exit code 2 blocks the action, and the message goes back to Claude."""
import json, re, sys
kind = sys.argv[1] if len(sys.argv) > 1 else ""
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
inp = data.get("tool_input") or {}
def block(msg):
    print(f"Blocked by the kit's safety rules: {msg} If this is really needed, write it under 'Needs Hafsah' in docs/morning-report.md and move on.", file=sys.stderr)
    sys.exit(2)
if kind == "bash":
    cmd = inp.get("command", "")
    rules = [
        (r"\bgit\s+push\b", "Pushing is not allowed."),
        (r"\bgit\s+merge\b", "Merging is not allowed."),
        (r"\bgh\s+pr\b|\bpull request\b", "Opening pull requests is not allowed."),
        (r"\bgit\s+reset\s+--hard\s+origin", "Resetting to the remote is not allowed."),
        (r"\bgit\s+(checkout|switch)\s+(main|master|staging|production)\b", "Changing to the main, staging or production branch is not allowed."),
        (r"prisma\s+migrate\s+reset|dropdb|DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s", "Wiping or dropping the database is not allowed."),
        (r"EMAIL_SENDS_FOR_REAL\s*=\s*true", "Real emails must stay off."),
        (r"sk_live_|pk_live_|rk_live_", "Live Stripe keys are not allowed."),
        (r"\brm\s+-rf\s+(/|~|\.\.)(\s|$)", "Deleting outside the project is not allowed."),
        (r"(>|>>|tee)\s*\S*\.env", "Writing to .env files is not allowed."),
    ]
    for pat, msg in rules:
        if re.search(pat, cmd, re.I):
            block(msg)
elif kind == "files":
    path = inp.get("file_path") or inp.get("path") or ""
    protected = [r"(^|/)\.env", r"(^|/)docs/decisions\.md$", r"(^|/)docs/baseline\.json$", r"(^|/)tools/score_run\.py$", r"(^|/)\.claude/", r"(^|/)CLAUDE\.md$"]
    for pat in protected:
        if re.search(pat, path):
            block(f"'{path}' is protected.")
sys.exit(0)

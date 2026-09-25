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
        (r"\bgh\s+(pr|release|workflow|run|api|repo\s+sync)\b", "Nothing goes to GitHub: no pull requests, releases or workflow runs."),
        (r"\bglab\b|\bhub\s+pull-request\b", "No pull or merge requests."),
        (r"\bgit\s+remote\s+(add|set-url|rename)\b", "Changing where the code can be sent is not allowed."),
        (r"\b(vercel|netlify|railway|flyctl|heroku|firebase\s+deploy|serverless\s+deploy|sls\s+deploy|kubectl|terraform\s+apply|eb\s+deploy)\b|\bfly\s+deploy\b|\bhelm\s+(install|upgrade)\b|\bdocker\s+push\b|\baws\s+(ecs|s3\s+sync|deploy)\b", "Deploying anywhere is not allowed, staging included."),
        (r"\b(npm|yarn|pnpm)\s+(run\s+)?\S*deploy\S*|\bmake\s+\S*deploy", "Deploying anywhere is not allowed, staging included."),
        (r"(?=.*staging)(?=.*(\bpush\b|deploy|release|migrat|\bseed\b|psql|mysql|mongo|redis-cli|\bssh\b|\bscp\b|rsync|\bcurl\b|\bwget\b|https?://|DATABASE_URL|_URL=|prisma\s+(migrate|db)|kubectl|terraform|\baws\b|gcloud|\baz\s)).*", "Nothing may touch staging. Hafsah decides when anything goes there."),
        (r"(sed\s+-i|>|>>|\btee\b|\bcp\b|\bmv\b|\brm\b|\btruncate\b|\bchmod\b|\bgit\s+(checkout|restore)\b)[^;&|]*(\.claude/|CLAUDE\.md|docs/decisions\.md|docs/baseline\.json|tools/score_run\.py)", "The kit's protected files cannot be changed."),
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

#!/usr/bin/env python3
"""Version 3. Safety rules that always run before Claude Code acts. Exit code 2 blocks the action, and the message goes back to Claude.

Version 2 (3 October 2026): rules now block ACTIONS, not WORDS. A commit message, a document being written,
or a read-only command may mention any word (a person's name, a branch name, a provider's name) without being
refused. Every real action stays blocked exactly as before: pushing anywhere but your own wip/ branch on "mine",
merging anything but mine/wip/, touching Abubakar's branches, deploying, touching staging, wiping a database,
live Stripe keys, real emails, writing .env files, and changing the kit's protected files."""
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
def current_branch():
    import subprocess, os
    try:
        return subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, cwd=os.environ.get("CLAUDE_PROJECT_DIR") or None, timeout=5).stdout.strip()
    except Exception:
        return ""

# A command that only reads: one read-only program, optionally piped into other read-only programs,
# with no redirection into a file and no chaining with ; && or ||.
READ_ONLY_START = r"(grep|rg|cat|head|tail|less|ls|wc|sort|uniq|diff|file|stat|find(?!.*(-delete|-exec|-ok))|sed\s+-n|git\s+(log|show|diff|status|merge-base|rev-parse|rev-list|ls-files|ls-tree|blame|branch(\s+(-a|-r|--list|--contains|--merged|-v|-vv)[\w\s./-]*)?|tag\s+(-l|--list)|fetch(\s+(mine|origin))?(\s+[\w./-]+)?|remote(\s+-v)?$|cat-file|describe))"
READ_ONLY_PIPE = r"(grep|rg|head|tail|wc|sort|uniq|cut|tr|awk|sed\s+-n|less|cat)"
def is_read_only(c):
    if re.search(r"(>|;|&&|\|\||`|\$\()", c):
        return False
    parts = [p.strip() for p in c.split("|")]
    if not re.match(r"^\s*" + READ_ONLY_START + r"\b", parts[0]):
        return False
    return all(re.match(r"^" + READ_ONLY_PIPE + r"\b", p) for p in parts[1:])

# Writing a document under docs/ through the shell, for example: cat > docs/morning-report.md <<'EOF' ... EOF
# The document's text may mention any word. Only the destination matters.
def is_doc_write(c):
    return re.match(r"^\s*cat\s*>{1,2}\s*['\"]?docs/[\w./-]+\.(md|txt|json|csv)['\"]?\s*<<-?\s*['\"]?\w+['\"]?\s*\n", c) is not None and ".env" not in c.split("\n")[0]

if kind == "bash":
    cmd = inp.get("command", "")
    one = cmd.strip()

    # Version 3 (6 October 2026, Hafsah): the computers may push their own branches to Abubakar's repository
    # ("origin") and open or update pull requests there. They may NEVER push straight into staging, main,
    # master, production or develop, never force-push or delete a branch, and never merge a pull request:
    # merging stays Abubakar's decision. Only a single command, with nothing chained onto it.
    def unchained(c):
        q = None
        i = 0
        while i < len(c):
            ch = c[i]
            if q:
                if ch == q: q = None
                elif ch == "\\" and q == '"': i += 1
            elif ch in "'\"": q = ch
            elif ch in ";|&`\n" or c[i:i+2] == "$(": return False
            i += 1
        return q is None
    PROTECTED_BRANCHES = r"(staging|main|master|production|prod|develop)"
    pm = re.fullmatch(r"git\s+push\s+(?:(?:-u|--set-upstream)\s+)?origin\s+(?:([\w./-]+):)?(?:refs/heads/)?([\w./-]+)", one)
    if pm:
        if re.search(r"(--force|\s-f\b|\+|--delete|\s-d\b|--mirror|--all|--tags)", one):
            block("Pushing to Abubakar's repository may never force, delete, or push everything at once.")
        if re.fullmatch(PROTECTED_BRANCHES, pm.group(2), re.I):
            block("Nobody pushes straight into staging, main or production. Push a branch and open a pull request; Abubakar merges.")
        sys.exit(0)
    if re.match(r"gh\s+pr\s+merge\b", one) or re.match(r"gh\s+pr\s+(close|reopen)\b", one):
        block("Merging or closing pull requests is Abubakar's decision.")
    if re.match(r"gh\s+pr\s+(create|view|ready|edit|comment|list|status|checks|diff)\b", one) and unchained(one) \
            and re.search(r"--repo\s+AbubakarSambo/groundwork\b", one):
        if re.search(r"--base\s+(main|master|production|prod)\b", one):
            block("Pull requests go into staging, not main or production.")
        sys.exit(0)
    is_commit = re.match(r"\s*git\s+commit\b", cmd) is not None and not re.search(r"(;|&&|\|\|)", cmd.split("\n")[0])
    word_safe = is_commit or is_read_only(one) or is_doc_write(cmd)

    # Abubakar's repository and branches: no git action that WRITES may touch them. Reading (log, show, diff,
    # fetch) and mentioning his name in a message are fine.
    if re.search(r"abubakar", cmd, re.I) and not word_safe and re.search(
            r"\bgit\s+(push|merge(?![\w-])|checkout|switch|reset|rebase|cherry-pick|branch\s+-[dDmMf]|tag(?!\s+(-l|--list))|remote|worktree)\b", cmd):
        block("Nothing may touch Abubakar's branches.")

    # The ONLY place work may be pushed: Hafsah's own private copy, the remote named "mine", wip/ branches only.
    # "origin" is Abubakar's repository and must never be pushed to.
    m = re.fullmatch(r"git\s+push\s+(?:(?:-u|--set-upstream)\s+)?mine\s+(?:([\w./-]+):)?(wip/[\w./-]+)", one)
    if m and not re.search(r"(--force|\s-f\b|\+)", one):
        here = current_branch()
        src, dest = m.group(1), m.group(2)
        # Each workspace may only push its own branch: the one it is on, to the same name.
        if here.startswith("wip/") and dest == here and (src is None or src in (here, "HEAD")):
            sys.exit(0)
        block(f"Each workspace may only push its own branch. You are on '{here}', so the only push allowed is: git push mine {here}")
    if re.fullmatch(r"git\s+merge\s+(?:(?:--no-edit|--no-ff)\s+)*mine/wip/[\w./-]+", one):
        if current_branch().startswith("wip/"):
            sys.exit(0)
        block("Merging is only allowed into a wip/ branch.")
    # Setting up the private copy, once: only under Hafsah's own account, only private.
    if re.fullmatch(r"gh\s+repo\s+create\s+hafsahjumare-lgtm/[\w.-]+\s+--private(\s+--description\s+\"[^\"]*\")?", one):
        sys.exit(0)
    if re.fullmatch(r"git\s+remote\s+add\s+mine\s+(https://github\.com/|git@github\.com:)hafsahjumare-lgtm/[\w.-]+(\.git)?", one):
        sys.exit(0)
    if re.fullmatch(r"git\s+clone\s+(https://github\.com/|git@github\.com:)hafsahjumare-lgtm/[\w.-]+(\.git)?(\s+[\w./~-]+)?", one):
        sys.exit(0)

    # A commit, a read-only command, or a document being written may mention any word. Only real actions are blocked below.
    if word_safe:
        sys.exit(0)

    # A command at the start of the line, or after ; && || | or a newline: used to tell running a program from naming it.
    S = r"(?:^|[;&|\n]\s*|\bnpx\s+|\bsudo\s+)"
    if re.search(S + r"gh\s+repo\b", cmd):
        block("Only one GitHub repository action is allowed: gh repo create hafsahjumare-lgtm/<name> --private.")
    if re.search(r"\bgit\s+pull\b", cmd):
        block("Use git fetch, then git merge mine/wip/<branch>, so every merge is visible.")
    rules = [
        (r"\bgit\s+push\b", "Pushing is only allowed as: git push mine wip/<branch>, on its own, to Hafsah's own private copy. Never to origin, which is Abubakar's repository."),
        (r"\bgit\s+merge(?![\w-])", "Merging is only allowed as: git merge mine/wip/<branch>, on its own, into a wip/ branch."),
        (S + r"gh\s+pr\b|" + S + r"hub\s+pull-request\b|" + S + r"glab\b", "Opening pull requests is not allowed."),
        (r"\bgit\s+reset\s+--hard\s+origin", "Resetting to the remote is not allowed."),
        (r"\bgit\s+(checkout|switch)\s+(main|master|staging|production)\b", "Changing to the main, staging or production branch is not allowed."),
        (r"prisma\s+migrate\s+reset|" + S + r"dropdb\b|DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s", "Wiping or dropping the database is not allowed."),
        (r"EMAIL_SENDS_FOR_REAL\s*=\s*true", "Real emails must stay off."),
        (r"sk_live_|pk_live_|rk_live_", "Live Stripe keys are not allowed."),
        (r"\brm\s+-rf\s+(/|~|\.\.)(\s|$)", "Deleting outside the project is not allowed."),
        (r"(>|>>|\btee\b)\s*\S*\.env", "Writing to .env files is not allowed."),
        (S + r"gh\s+(release|workflow|run|api|repo\s+sync)\b", "Nothing goes to GitHub: no pull requests, releases or workflow runs."),
        (r"\bgit\s+remote\s+(add|set-url|rename)\b", "Changing where the code can be sent is not allowed."),
        (S + r"(vercel|netlify|railway|flyctl|heroku|kubectl|terraform\s+apply|eb\s+deploy|fly\s+deploy)\b|" + S + r"(firebase|serverless|sls)\s+deploy\b|" + S + r"helm\s+(install|upgrade)\b|\bdocker\s+push\b|" + S + r"aws\s+(ecs|s3\s+sync|deploy)\b", "Deploying anywhere is not allowed, staging included."),
        (S + r"(npm|yarn|pnpm)\s+(run\s+)?\S*deploy\S*|" + S + r"make\s+\S*deploy", "Deploying anywhere is not allowed, staging included."),
        # Staging: blocked when a command could reach it (a connection, a deploy, a database tool), not when a word appears in text.
        (r"(?=.*staging)(?=.*(" + S + r"(psql|mysql|mongo|mongosh|redis-cli|ssh|scp|rsync|curl|wget|kubectl|terraform|aws|gcloud|az)\b|\bgit\s+push\b|prisma\s+(migrate|db)|DATABASE_URL\s*=|_URL\s*=\S*staging|\bdeploy\b)).*", "Nothing may touch staging. Hafsah decides when anything goes there."),
        (r"(sed\s+-i|>|>>|\btee\b|\bcp\b|\bmv\b|\brm\b|\btruncate\b|\bchmod\b|\bgit\s+(checkout|restore)\b)[^;&|]*(\.claude/|CLAUDE\.md|docs/decisions\.md|docs/baseline\.json|tools/score_run\.py)", "The kit's protected files cannot be changed."),
    ]
    for pat, msg in rules:
        if re.search(pat, cmd, re.I | re.S):
            block(msg)
elif kind == "files":
    path = inp.get("file_path") or inp.get("path") or ""
    import os
    # A settings file may be CREATED once, on a new computer, when none exists. Changing an existing one stays blocked.
    if re.search(r"(^|/)(api|client)/\.env$", path) and data.get("tool_name") == "Write":
        full = path if os.path.isabs(path) else os.path.join(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd(), path)
        if not os.path.exists(full):
            sys.exit(0)
    protected = [r"(^|/)\.env", r"(^|/)docs/decisions\.md$", r"(^|/)docs/baseline\.json$", r"(^|/)tools/score_run\.py$", r"(^|/)\.claude/", r"(^|/)CLAUDE\.md$"]
    for pat in protected:
        if re.search(pat, path):
            block(f"'{path}' is protected.")
sys.exit(0)

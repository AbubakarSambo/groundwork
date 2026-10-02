# A proposed change to the safety guard

For Hafsah to apply, 2 October 2026. Nothing here has been applied. The guard is `.claude/hooks/guard.py`, which the engine work may not change.

## Why

The guard reads every shell command as one block of text, and refuses it when certain words appear anywhere in it. So a command is refused when it only **mentions** a word, inside a document's text or a commit message, even though it does nothing the word stands for. In the night of 1 to 2 October this refused, among others:

- an edit to `docs/ready-to-deploy.md`, because its text said "pull request";
- a commit of the remaining-work list in `docs/weekly-plan.md`, because its text named the person the release questions are for;
- a read-only `git merge-base --is-ancestor` check, because `git merge-base` starts with `git merge`;
- a read-only search in `docs/decisions.md`, because the search's own program contained a `>`.

Each was stopped and written down, and nothing was reached another way. The change below keeps every real protection and lets text that only mentions these words through.

## What stays refused, unchanged

- Any push except `git push mine <the branch you are on>`, to a `wip/` branch, never forced.
- Any merge except `git merge mine/wip/<branch>` into a `wip/` branch.
- Any change to the remotes (`git remote add`, `set-url`, `rename`), and anything that opens a pull request (`gh pr`, `hub pull-request`, `glab`).
- Any deploy or hosting command (every tool on the existing deploy line), and anything that touches the pre-release environment over the network or its database.
- Wiping a database, live keys, real emails, writing `.env`, and changing the protected files.

## The change, line by line

### 1. A person's name (line 22)

Today:

```python
if re.search(r"abubakar", cmd, re.I) and re.search(r"\bgit\b", cmd):
    block("Nothing may touch Abubakar's branches.")
```

This refuses any command that contains the name and the word `git` anywhere, so `git commit` with a message or a file that mentions him is refused. Proposed: refuse only a git command that acts on a branch or remote with his name in it.

```python
if re.search(r"\bgit\s+(push|pull|fetch|merge|rebase|checkout|switch|reset|branch|remote|worktree)\b[^;&|\n]*abubakar", cmd, re.I):
    block("Nothing may touch Abubakar's branches.")
```

Pushing to `origin` stays refused by the push rule (line 28 allows only `mine`), whatever the text says.

### 2. "pull request" in text (line 54)

Today: `(r"\bgh\s+pr\b|\bpull request\b", ...)`. The words "pull request" in a document's text are refused. Proposed: refuse only the commands that open one, which line 62 and line 63 already cover.

```python
(r"\bgh\s+pr\b", "Opening pull requests is not allowed."),
```

### 3. `git merge-base` (line 53)

Today: `(r"\bgit\s+merge\b", ...)` also matches `git merge-base`, which only reads. Proposed:

```python
(r"\bgit\s+merge(?![-\w])", "Merging is only allowed as: git merge mine/wip/<branch>, into a wip/ branch."),
```

The allowed merge on line 36 is unchanged.

### 4. The pre-release environment (line 67)

Today the rule refuses any command that contains the word for the pre-release environment anywhere, together with any of a long list of words ("release", "migrat", "push", a URL and so on) anywhere. So writing a sentence about release steps into a document is refused. Proposed: refuse only when that word is an argument of a command that could actually reach it.

```python
(r"\b(git\s+(push|checkout|switch|merge|fetch|pull)|psql|mysql|mongo|redis-cli|ssh|scp|rsync|curl|wget|prisma\s+(migrate|db)|kubectl|terraform|aws|gcloud|az)\b[^;&|\n]*staging"
 r"|staging[^;&|\n]*\b(DATABASE_URL|_URL=)"
 r"|\b(DATABASE_URL|\w+_URL)=\S*staging",
 "Nothing may touch staging. Hafsah decides when anything goes there."),
```

The deploy line (line 65) and the deploy scripts line (line 66) are unchanged, so a deploy is still refused wherever it points.

### 5. Reading a protected file (line 68)

Today the rule treats any `>` before a protected file's name as a write, so `awk '$1 > 3' docs/decisions.md` is refused. Proposed: count only real writes, a redirection into the protected file or a command that changes it.

```python
(r"((>|>>)\s*|\b(sed\s+-i|tee|cp|mv|rm|truncate|chmod)\b[^;&|\n]*\s|\bgit\s+(checkout|restore)\b[^;&|\n]*\s)(\S*/)?(\.claude/|CLAUDE\.md|docs/decisions\.md|docs/baseline\.json|tools/score_run\.py)",
 "The kit's protected files cannot be changed."),
```

The file rule further down (`protected = [...]`, for the Edit and Write tools) is unchanged.

### 6. Optional: a throwaway local test database (line 57)

A builder wanted to prove that a nightly job runs once across two copies of the API on a real database, by creating a throwaway database and dropping it afterwards. The drop was refused, so it was never created. If Hafsah wants that kind of test, one narrow exception, before the rule:

```python
if re.fullmatch(r"dropdb\s+(-h\s+(localhost|127\.0\.0\.1)\s+)?gw_scratch_[a-z0-9_]+", one):
    sys.exit(0)
```

This allows dropping only a local database whose name starts with `gw_scratch_`. Every other drop, reset or truncate stays refused. Leave this out if not wanted.

## How to check it after applying

Each of these should be **allowed**:

```
git commit -m "Release questions: one for whoever runs the hosting"
git merge-base --is-ancestor mine/wip/prototype-ui HEAD
awk '$1 > 3' docs/decisions.md
python3 - <<'X'  (a script that writes a sentence about opening a pull request into docs/ready-to-deploy.md)
```

Each of these should still be **refused**:

```
git push origin wip/plain-reports
git push mine main
git merge origin/main
git remote set-url mine https://example.com/other.git
gh pr create
git checkout staging
psql "$STAGING_DATABASE_URL"
DATABASE_URL=postgres://staging.example.com/db npx prisma migrate deploy
railway up
echo x > docs/decisions.md
```

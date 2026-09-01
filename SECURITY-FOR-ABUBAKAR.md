# Security note for Abubakar

**Found:** 1 September 2026, during an unrelated audit.
**Status:** nothing has been changed. Flagged only, so the decisions below are yours.

---

## A file with live credentials is committed to this repository

`api/.env.bak` is tracked in git. It holds the values the API runs on, and two of
them are not placeholders:

| What | Why it matters |
|---|---|
| The database URL, with its password | The door to everything stored |
| The JWT signing secret | The key the API uses to tell a real signed-in person from someone claiming to be one |

The Stripe, Resend and Google entries in the same file are empty placeholders and are
not a concern.

**The signing secret is the one to act on first.** Anyone holding it can mint a token
the API will accept, as any user, including an admin. It needs no password and leaves
no failed-login trail.

## How it got there

`.gitignore` covers `.env`, `.env.local` and `.env.production`. It does not cover
`.env.bak`, so the backup was never ignored. It was committed on 31 July 2026 inside a
commit about board handoffs - an accident, not a decision, and nothing to do with the
work going on around it now.

## Deleting the file is not the fix

Removing it from the working tree stops it spreading, and it does **not** unpublish it.
Git keeps history: every clone of this repository still contains the file and its
contents. Treat both values as disclosed to anyone who has ever had access.

## What actually closes it

1. **Rotate the JWT signing secret.** This signs everybody out - every current session
   stops working. That is a decision about users, so pick the moment.
2. **Rotate the database password**, and update it wherever the API is deployed. The
   API will not start on the old one, so this needs doing together.
3. **Add `.env*` to `.gitignore`** (the current rules name three files individually;
   a pattern would have caught this) and remove the file from tracking.
4. **Then decide about history.** Purging it rewrites every commit hash and breaks
   every open branch and PR. Worth it if this repository has ever been public or widely
   shared; probably not if access has always been the three of you. That judgement needs
   what you know about who has had a clone.

## How urgent

It depends entirely on who can read this repository - which is something you know and I
do not. Private, small, trusted team: sort it this week. Ever public, ever shared
outside the team, or any former collaborator with a clone: today, starting with the
signing secret.

---

*Nothing here has been acted on. The file is untouched, the secrets are not repeated in
this note, and no history has been rewritten.*

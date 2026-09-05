# Security — for Abubakar. Before we go live.

**Two live vulnerabilities, found 1 September 2026. Neither is closed. Both need you.**

*Last checked 5 September 2026. Both still open.*

Nothing here is a code change waiting for review. These are credentials and configuration, and
only you can act on them.

---

## 1. A live signing secret is public

`api/.env.bak` was committed on **31 July 2026**, inside a commit about board handoffs. It carries
the API's `JWT_SECRET` and a `DATABASE_URL`.

**This repository is public.** Not "the three of us with clones" — anyone, and GitHub is scraped
continuously for exactly this filename.

**The signing secret is still the one in use.** The value in that file is byte-identical to the one
the API runs on today. It is present in 82 branches.

> **Re-checked 5 September 2026.** Still true, and worse: byte-identical again on that date, and
> now reachable from **141 branches**, not 82. Four days, fifty-nine more branches. Nothing about
> this ages out on its own — every branch cut from any of those carries it forward.

Anyone holding it can mint a token the API accepts — **as any user, in any organisation, including
an admin** — with no password, no failed login, and nothing in the logs to separate it from a real
session.

**Do now:** rotate `JWT_SECRET` wherever the API is deployed. One line. It signs everybody out
once; that is the whole cost.

**Also:** the committed `DATABASE_URL` differs from the one in my local file, so it may be stale.
Confirm the deployed value is not the exposed one. I cannot see it.

**Deleting the file does not fix it.** It is untracked now and `.gitignore` covers every `.env*`,
which stops it spreading. The old copy stays in history, in every clone, and in every fork.
Rotation is the fix. Purging history is a separate decision — it rewrites every commit hash.

---

## 2. `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` hands out platform admin

If that variable is set and no platform admin exists yet, the API promotes whoever holds that
address to **platform admin** on startup.

The API says so itself at boot:

> `PLATFORM_ADMIN_BOOTSTRAP_EMAIL is set to "staff@groundwork.test" but no user has that address...
> Sign that address up through the normal flow, then restart the API`

So if that variable is set in production and nobody has registered the address, **anyone who signs
up with it becomes platform admin at the next restart.**

**Check now:** is it set in the deployed environment, and does a platform admin already exist? If
it is set and no admin exists, unset it and create the account directly instead.

---

## 3. A security sweep before launch, not after

These were both found while looking for something else. Neither was caught by tests, CI, or review
— the repository has 5,100 passing tests and both of these sat green through all of them.

That is the part worth acting on. A codebase that can hold a public signing secret for five weeks
without a single check noticing does not have a secrets problem, it has a *coverage* problem, and
the next one will be found the same way: by accident.

**Before going live, someone should deliberately go looking for:**

- every secret in git history, not just the working tree
- every environment variable that grants privilege, and what happens when it is unset, wrong, or
  set to an address nobody owns
- every endpoint that trusts a token's claims rather than re-reading the record
- every place a role is decided on the client and enforced nowhere else
- account creation: what exists before an email is verified, and what a stranger can claim with an
  address they do not own

I can do that sweep and write up what it finds. What I cannot do is rotate the two values above,
and until they are rotated the first item on this list is still open.

---

*Written by Claude, working with Hafsah, 1 September 2026. No values are repeated in this note —
reading it is not a second disclosure.*

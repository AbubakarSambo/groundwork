# Security — for Abubakar. Before we go live.

**Two live vulnerabilities, found 1 September 2026. Neither is closed. Both need you.**

*Last checked 8 September 2026. Item 1 is still open and still live. Item 4 is fixed.*

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
>
> **Re-checked again 8 September 2026, and measured rather than remembered.** The secret in that
> file is *still byte-identical* to the one the API is running on right now, and the commit that
> added it is reachable from **104 branches**. The number went down because branches were deleted,
> not because anything was fixed — deleting a branch does not remove a commit that other branches
> still reach, and it does not un-publish anything already scraped.
>
> Eight days since this note was written. Nothing has been rotated. Every day this stays open, the
> only honest thing to say about the platform's authentication is that it has none: anybody holding
> this value can be any user in any organisation, including an admin, and nothing in the logs will
> tell them apart from a real session.

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

*Written by Claude, working with Hafsah, 1 September 2026; re-verified 5 and 8 September. No
values are repeated in this note — reading it is not a second disclosure.*

---

## 4. A join link plus any email address is a session as that person

**Found 7 September 2026, during the user-journey audit. Verified by reading the code, not by exploiting it.**

`POST /entry/join-accept` (`api/src/modules/entry/entry.controller.ts:271` → `entry.service.ts:1611`)
is `@Public()`, takes `{ joinToken, email }`, looks the email up with
`prisma.user.findUnique({ where: { email } })` — **no organisation scope, no proof
the caller owns the address** — and returns

```ts
const accessToken = this.jwt.sign({
  sub: user.id, email: user.email, organizationId: user.organizationId, role: user.role,
});
```

which is a full session as that user, with their role and their organisation.

`POST /entry/join-commit` (`entry.service.ts:1490`) has the same shape.

**What that means.** A join link is a broadcast credential — it is meant to be handed
to a cohort. Anybody holding one can post the org admin's address and be signed in as
the org admin. `Ground.joinToken` (`prisma/schema.prisma:784`) never expires, is never
rotated, and is never consumed.

Neither route is throttled, so the surface is also brute-forceable at the global
60/min once a join link is known.

Mitigation already in place, and why it is not enough: `grounds.service.ts:1494-1506`
stopped returning `joinToken` to ordinary participants after a related problem, so only
org admins can copy the link from the ground page. But the link's whole purpose is to be
distributed, and every person it is distributed to can do the above.

**FIXED, 7 September 2026**, on Hafsah's instruction, and driven against the running server.

`/entry/join-commit` is **deleted** — nothing called it, the orphan list had already asked
somebody to confirm that before deleting, and it carried the same hole.

`/entry/join-accept` no longer signs anybody in. It records a `PendingJoin`, emails a
single-use 24-hour link to the address that was typed, and answers with the same sentence
whether or not that address has an account here. `POST /entry/join-confirm` is the only
route that now creates an account, a participant, a check-in or a session, and it runs only
because the address opened the link.

The rule is not softer for an address nobody has seen before: typing a colleague's address
would otherwise produce a check-in in their name — a false record, which is worse than
access to an old one. See `api/src/modules/entry/a-join-link-is-not-a-password.ts`.

Driven: posting the admin's address returns `sent: true` with no token and creates nothing;
the emailed link works once and then says so; a made-up token is refused with what to do
next. Both routes are now throttled.

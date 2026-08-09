# Sign-in: what we support, and why the rest went

Decided 2026-08-08. This is the record of which sign-in paths exist, which were
removed, and what is still blocked on someone with credentials.

## What we support

**Magic link.** The only sign-up path. `POST /auth/register-magic-link` creates
the org and emails an activation link; the person sets a password on arrival.
Needs nothing but outbound email, so it works in every environment.

**Password sign-in.** `POST /auth/login`. Used by real users after activation, and
by `journey/run.ts` and `journey/org-sim/run-all.ts`, which sign in with a
password to drive the app end to end. Deleting it would take the harnesses with
it.

**Member sign-in, forgot/reset password.** Unchanged.

## What we removed, and why

Both were finished code that no client, marketing page, seed or harness called.

**`POST /auth/register`** — email plus password, created an organisation and a
super admin. `authService.register` was reached from that one route and nowhere
else. A public, unauthenticated, org-creating endpoint that nobody uses is attack
surface with no upside.

**`POST /auth/resend-verification`** — served the same superseded flow. The live
equivalent is already wired: `MagicSentPage` resends through
`register-magic-link`, minting the same `EMAIL_VERIFICATION` token type. Keeping
two ways to do one thing means the unused one rots.

Neither removal changes anything a user can currently do.

## Google sign-in: built, inert, waiting on credentials

The server side has been complete for a long time — `GoogleStrategy`, the
callback, find-or-create, and a one-time exchange code so the JWT never travels
in a URL. It was unreachable, because no client route caught the redirect and no
button started the flow. That is now built too:

- `GET /auth/methods` (public) reports whether Google can actually complete.
- `AuthPage` renders "Continue with Google" **only when that says yes**.
- `/auth/google/callback` catches the redirect and exchanges the code.

**Why it is gated rather than simply switched on.** `GoogleStrategy` falls back to
the literal placeholder `google-oauth-disabled` when the credentials are unset. A
button wired unconditionally would not fail quietly — it would send a person to
Google and land them on Google's own error page, which reads as "this company is
broken". The server is the only side that knows whether the credentials exist, so
the client asks.

### What Abubakar needs to do

Nothing in the code. The button appears the moment the server has credentials —
no client change, no client deploy.

1. Create an OAuth 2.0 client in Google Cloud Console for the Groundwork project.
2. Set the authorised redirect URI to the value of `GOOGLE_CALLBACK_URL`
   (already set; currently `http://localhost:3000/api/v1/auth/google/callback`
   in local `.env` — production needs its own).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the deployment
   environment. Both are currently empty.
4. Raise the PR with those values in the environment (not in the repo), and
   merge.

Verify by loading the sign-in page: "Continue with Google" should appear. If it
does not, `GET /api/v1/auth/methods` returns `{"google": false}` and one of the
two variables is still empty or whitespace.

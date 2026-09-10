# Pass 5: the experience surface, fifteen screens

All verified. Assembling the report.

## The 15 screens picked, and why

| # | Screen | Route | Flow it carries |
|---|---|---|---|
| 1 | `pages/enter/EntryChatPage.tsx` | `/start` | Anonymous entry: setup chat, first check-in, private report |
| 2 | `pages/home/SaveCard.tsx` | (in `/start`) | Save and invite — the terminal step of the anonymous funnel |
| 3 | `pages/auth/AuthPage.tsx` + `LinkSentPanel.tsx` | `/auth` | Sign-up / sign-in |
| 4 | `pages/auth/ChoosePasswordPage.tsx` | `/set-password` | The last screen of sign-up |
| 5 | `pages/invite/InvitePage.tsx` | `/invite` | Invited participant accept |
| 6 | `pages/join/JoinPage.tsx` + `JoinConfirmPage.tsx` | `/join` | Broadcast-link join |
| 7 | `pages/grounds/GroundParticipantPage.tsx` | `/grounds/:id/p` | A participant's own view + out-of-credit paywall |
| 8 | `pages/chat/ChatPage.tsx` | `/checkin/:id` | A participant's own check-in; closing and resolution |
| 9 | `pages/report/SessionReportPage.tsx` | `/checkin/:id/report` | A session report |
| 10 | `pages/report/ReportPage.tsx` | `/grounds/:id/report` | The whole-ground report |
| 11 | `pages/board/BoardPage.tsx` | `/grounds/:id/board` | The board |
| 12 | `pages/grounds/GroundAdminPage.tsx` | `/grounds/:id` | Grounds detail for whoever runs it |
| 13 | `pages/billing/{Billing,Pricing,Payment}Page.tsx` | `/billing`, `/pricing` | Subscribe / out-of-credit |
| 14 | `pages/admin/AdminDashboardPage.tsx` | `/admin/dashboard` | Admin usage |
| 15 | `pages/org/IntegrationsPage.tsx` | `/org/integrations` | The embedded panel / API — see note |

**Note on the embedded panel.** There is no embedded-panel *page* in `client/src`; the SPA's surface for it is the Connect/API page, which is where a customer requests access, issues a key, registers a webhook, and sees the panel screenshots (`client/public/connect/panel.png` etc., which do exist). I audited that. `components/PostSessionPanel.tsx` is imported only by `GroundAdminPage.tsx:29` and is not the embed.

---

## Screen 1 — `/start` EntryChatPage

**ID: P5-001**
Severity: Blocker
Axis: Bug
Location: `client/src/pages/enter/EntryChatPage.tsx:2077-2117, 3495-3497` (EntryChatPage — save)
Observed: `handleSave` is async, posts the whole commit payload plus transcript, and has no in-flight flag. Its button is disabled only for `generatingReport && !sessionReport`, and Enter in the email field calls it too.
Expected: A `saving` guard returning early, with the button disabled and relabelled — which the sibling `saveAsSignedInUser` already does via `savingAsUser`.
Impact: A double press fires two `entrySave` calls: two drafts, two emails, and the second `draftToken` overwrites the first in `localStorage`, so the earlier email's link points at a draft this browser will no longer patch.
Evidence: `const res = await authApi.entrySave(trimmed, { payload: commitPayload, history }, trap.filled)` under `async function handleSave() {` with no pending check; `<button onClick={handleSave} disabled={generatingReport && !sessionReport}`
Confidence: High

**ID: P5-002**
Severity: Blocker
Axis: Data integrity
Location: `client/src/pages/enter/EntryChatPage.tsx:3200-3207` (EntryChatPage — private report header)
Observed: The "Specificity" meter is computed purely from the number of user turns (`turns < 4 ? 1 : …`), but its tooltip asserts it measures "How concrete and specific your answers were". Turn count is not concreteness. The tooltip also names a four-value scale (Thin, Fair, Good, Strong) while the code emits five, and "Fair" is never emitted.
Expected: Either measure specificity, or label the meter as what it counts (length of the conversation).
Impact: A quality judgement about the user's own answers, presented as fact on the first report they ever see, derived from something else entirely. Somebody who wrote four vague lines and somebody who wrote four precise ones get the identical score.
Evidence: `const depth = turns < 4 ? 1 : turns < 8 ? 2 : …` then `title="How concrete and specific your answers were (Thin, Fair, Good, Strong)">Specificity: {label}`
Confidence: High

**ID: P5-003**
Severity: Major
Axis: Bug
Location: `client/src/pages/enter/EntryChatPage.tsx:2090, 3491-3493` (EntryChatPage — save email field) — trace of lead (b)
Observed: The email input is not inside a `<form>` and the primary control is a plain `onClick` button, so the `type="email"` constraint never runs. The only check is `!trimmed || !trimmed.includes('@')`. `"a@"`, `"@"` and `"me@ @"` all pass and become the address the magic link is sent to. Empty *does* produce a message, which is why the empty case looks handled and the malformed case looks silent.
Expected: A real `<form onSubmit>` so the native constraint fires, or a validity check matching it.
Impact: A typo'd address is accepted with success UI ("We'll email you a confirmation link"), and the anonymous session is then recoverable only in that one browser.
Evidence: `if (!trimmed || !trimmed.includes('@')) { setEmailError('Please enter a valid email address.'); return }` with `<input type="email" … onKeyDown={e => e.key === 'Enter' && handleSave()} />` and no wrapping form
Confidence: High

**ID: P5-004**
Severity: Major
Axis: Experience
Location: `client/src/pages/enter/EntryChatPage.tsx:2938-2946, 3120-3125` (EntryChatPage — both composers)
Observed: The primary action of both the setup chat and the check-in chat is a button whose entire content is the glyph `↑`. No `aria-label`, no `title`, no visually-hidden text. The neighbouring `+ Doc` button does carry a `title`.
Expected: An accessible name ("Send message") on the control that advances the whole product.
Impact: A screen-reader user hears only "button" for the one action the entire anonymous funnel depends on.
Evidence: `<button onClick={() => send()} disabled={loading || !input.trim()} style={{ … fontSize: 18 … }}> ↑ </button>`
Confidence: High

**ID: P5-005**
Severity: Major
Axis: Experience
Location: `client/src/pages/enter/EntryChatPage.tsx:1414-1447, 2964, 3226-3232` (EntryChatPage — streaming and report generation)
Observed: Replies stream into a plain `<div>` list and the ~35s report generation renders `SlowStep`, in containers with no `aria-live`, no `role="status"`, no `role="log"`. Exactly one `aria-` attribute exists in the whole 4035-line file (line 2629).
Expected: `aria-live="polite"` on the message list and on the generating/failed report region.
Impact: A screen-reader user is never told the assistant answered, that the 35-second report finished, or that it failed — the longest wait in the product is completely silent.
Evidence: a grep for `aria-` across the file returns one hit; the container is `<div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', … }}>`
Confidence: High

**ID: P5-006**
Severity: Minor
Axis: Experience
Location: `client/src/pages/enter/EntryChatPage.tsx:3531-3533` (EntryChatPage — save card dismiss)
Observed: The way out of the full-screen save card, "Not now", is a `<div onClick>` — not focusable, not activatable by Enter or Space, no `role="button"`.
Expected: A real `<button>`, as the card's other controls are.
Impact: A keyboard-only user inside the save overlay, which covers the page, has no way to dismiss it.
Evidence: `<div onClick={() => setShowSave(false)} style={{ … cursor: 'pointer', paddingTop: 10 }}> Not now </div>`
Confidence: High

**ID: P5-007**
Severity: Note
Axis: Inconsistency
Location: `client/src/pages/enter/EntryChatPage.tsx:1784-1795, 2925-2932` (EntryChatPage — Enter behaviour)
Observed: The check-in composer is a `<textarea>` where Enter sends and Shift+Enter newlines. The setup composer earlier in the same flow is a single-line `<input type="text">` where Enter sends and no line break is possible at all.
Expected: The same affordance in both phases of one conversation.
Impact: The rule learned during setup does not hold two screens later, and a multi-line setup answer loses its shape.
Evidence: setup `onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { sendOnboarding(input); } }}`; check-in `if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }`
Confidence: High

**ID: P5-008**
Severity: Note
Axis: Experience
Location: `client/src/pages/enter/EntryChatPage.tsx:2436, 2473, 3455` (EntryChatPage — Start over)
Observed: The in-flight guards on `sendOnboarding` and `send` are correct, failed sends restore the typed text, the report has a named `reportFailed` state with Retry, and the destructive "Start over" is confirmed in all three of its placements with "This throws away this session and everything in it."
Expected: —
Impact: Recorded as the standard the other screens should meet, and because P5-020 is the same action *without* the confirm.
Evidence: `if (!content || loading || closed) return` and the Start over / Keep it confirm pair
Confidence: High

---

## Screen 2 — SaveCard (save and invite)

**ID: P5-009**
Severity: Blocker
Axis: Bug
Location: `client/src/pages/home/SaveCard.tsx:55-71` (SaveCard — both variants)
Observed: `onError` is byte-for-byte identical to `onSuccess`. A failed save writes the same storage keys and navigates to `/auth/sent?email=…`, the "check your inbox" page. The component has no error state at all; `emailError` is only ever set by the client-side format check.
Expected: On failure, stay on the card, keep the email, say what happened, offer retry.
Impact: The save did not happen and the user is shown the success screen. They wait for a link that was never sent, and the anonymous session is stranded in one browser's `localStorage` — along with the invite note and participant work in sections 2 and 3. This is the terminal step of the funnel.
Evidence: `onError: () => { const trimmed = email.trim(); sessionStorage.setItem('gw_magic_type', 'entry'); … navigate(\`/auth/sent?email=${encodeURIComponent(trimmed)}\`) },`
Confidence: High

**ID: P5-010**
Severity: Major
Axis: Bug
Location: `client/src/pages/home/SaveCard.tsx:18, 42-50, 229-241` (SaveCard — share your invite link)
Observed: `const APP_URL = import.meta.env.VITE_APP_URL ?? ''`, and the link is `${APP_URL}/invite?token=${inviteToken}`. With the variable unset the readonly field shows and copies `/invite?token=abc…` — a path with no origin. The card presents it as a shareable link with no check.
Expected: Fall back to `window.location.origin`, or hide the share section when no absolute URL can be built.
Impact: The lead copies a non-URL into an email; nobody they invite can open it, and neither side can tell why.
Evidence: `const inviteUrl = \`${APP_URL}/invite?token=${inviteToken}\``
Confidence: Medium
Check needed: whether `VITE_APP_URL` is set in every deployed env and in `.env.example` — the `?? ''` default is what makes the empty case reachable.

**ID: P5-011**
Severity: Major
Axis: Bug
Location: `client/src/pages/home/SaveCard.tsx:166-174, 268-271` (SaveCard — invite a participant)
Observed: `addParticipant` silently returns on a bad address, and silently again when `entryStorage.load()` yields nothing, since `setParticipantAdded(true)` sits inside `if (session)`. On success it writes a single scalar `participantEmail`, so a second person overwrites the first with no indication.
Expected: An inline message for a bad address, a message when there is no session to attach to, and either a list of added people or an explicit one-participant limit.
Impact: A lead presses Add, sees nothing, and assumes it worked — or adds two people and only the second is ever invited. The sibling screen fixed exactly this class of bug deliberately (`EntryChatPage:2077-2086`, "the cost of getting it wrong is an invitation that silently never happens"); this card did not get the fix.
Evidence: `function addParticipant() { … if (!trimmed || !trimmed.includes('@')) return; const session = entryStorage.load(); if (session) { … setParticipantAdded(true) } }`
Confidence: High

**ID: P5-012**
Severity: Minor
Axis: Bug
Location: `client/src/pages/home/SaveCard.tsx:155-164` (SaveCard — copy link)
Observed: `navigator.clipboard?.writeText(...)` — where the Clipboard API is absent the whole expression is `undefined`, `.then` is never reached, and the button never flips to "Copied". A rejected promise is also unhandled. The note-saving side effect below still runs, so the card looks alive.
Expected: Detect the missing/failed case and offer manual copy.
Impact: The button appears inert; the lead presses it repeatedly and pastes whatever was already on their clipboard into the invite email.
Evidence: `navigator.clipboard?.writeText(inviteUrl).then(() => { setCopied(true); … })`
Confidence: High

**ID: P5-013**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/home/SaveCard.tsx:79, 84, 187, 265-271` (SaveCard — copy) — trace of lead (a)
Observed: Two problems. (i) "Add their email and we will send them an invite once you have saved" is followed on success by "Saved. They will receive an invite once you have saved" — "saved" means two different acts in one sentence. (ii) One object, three names on one card: the participant variant says "Session 1 is on record" then "Your check-in is saved"; the admin variant says "Your first session is on record".
Expected: "Added. They'll be invited when you confirm your email." One noun for the session, one for the engagement.
Impact: The lead cannot tell whether the invite has gone out, and the two variants of one card teach different vocabulary.
Evidence: `Saved. They will receive an invite once you have saved.` / `Session 1 is on record.` / `Your check-in is saved.`
Confidence: High

**ID: P5-014**
Severity: Minor
Axis: Experience
Location: `client/src/pages/home/SaveCard.tsx:293-300` (SaveCard — Start over)
Observed: "Start over" is a bare `<button onClick={onClear}>` with no confirmation, discarding the whole anonymous conversation and report. The same action on `EntryChatPage` is confirmed in all three of its placements (P5-008).
Expected: The sibling screen's confirm.
Impact: One misclick at the bottom of the card destroys everything the person just did, with no undo and no warning.
Evidence: `<button onClick={onClear} style={{ … textDecoration: 'underline', padding: 0 }}> Start over </button>`
Confidence: High

**ID: P5-015**
Severity: Minor
Axis: Bug
Location: `client/src/pages/home/SaveCard.tsx:106-108, 196-207` (SaveCard — honeypot)
Observed: The honeypot is rendered twice in the participant form and zero times in the admin form — yet both paths call `authApi.entrySave(email, undefined, trap.filled)`.
Expected: Exactly one `{trap.field}` per form, in both variants.
Impact: Duplicate hidden fields can be filled by a password manager, which is the one thing that makes the honeypot reject a real person; the admin variant's spam defence does nothing.
Evidence: `<form onSubmit={save}>` followed by `{trap.field}` on two consecutive lines
Confidence: Medium
Check needed: read `components/gw/a-field-nobody-can-see` to confirm the field carries a fixed `name`/`id` and what `trap.filled` reports when no field is mounted.

---

## Screen 3 — AuthPage (sign-up / sign-in)

**ID: P5-016**
Severity: Blocker
Axis: Bug
Location: `client/src/pages/auth/AuthPage.tsx:264-290, 436` (AuthPage — create account) — trace of lead (b)
Observed: This is the real mechanism behind the reported lead, and it is worse than "no message". Client validation is only `includes('@')`. On the server's 400 for a malformed address, `onError` handles `!status`, `>=500`, `429` and `409`, then **falls through to `setLinkSent(true)`** — the success screen. Separately, a plainly malformed value like `abc` never reaches the handler at all: there is no `noValidate` anywhere in the file, so `type="email"` blocks submit natively and the user gets the browser's own bubble rather than the page's styled `gw-er`; on the create form `autoFocus` is on the *name* field, so the bubble can point at a field they have scrolled past. Empty produces the product's own message. Hence: empty → our message, malformed → either a browser bubble or a false success.
Expected: A 400 from `entry-save` is about the address's shape, not its existence, so surfacing it leaks nothing. Show the server's sentence instead of claiming a link was sent.
Impact: A person who mistypes their address is told their account is on its way and sent to wait for an email that does not exist. The file's own comment at 222-235 says it fixed exactly this for 5xx; the same swallow was left on 4xx.
Evidence: `if (status === 409) { … }` then, as the final statement of `onError`, `setLinkSent(true)`
Confidence: High

**ID: P5-017**
Severity: Major
Axis: Bug
Location: `client/src/pages/auth/AuthPage.tsx:160-164, 210, 368, 380` (AuthPage — sign in)
Observed: `passwordlessNotice` is set on a failed sign-in and never cleared — not by editing the email, not by editing the password, not by switching view. Every `onChange` clears `error` only.
Expected: Clear it wherever `error` is cleared.
Impact: Someone told "we emailed you a link" for address A types address B and still sees a notice about a link sent elsewhere.
Evidence: `onChange={e => { setEmail(e.target.value); setError('') }}` with `setPasswordlessNotice` written only at line 210
Confidence: High

**ID: P5-018**
Severity: Major
Axis: Bug
Location: `client/src/pages/auth/AuthPage.tsx:120-134, 191, 264-271` (AuthPage — next destination)
Observed: `nextPath` is read from `?next=`/`?from=` and used in exactly one place, `signIn.onSuccess`. The link and create flows never forward it, so the magic link lands on `/grounds?welcome=1`.
Expected: Carry `next` through the emailed-link path too.
Impact: The file's own comment says a `?next=/pricing` visitor "was put on the grounds list with no explanation and no way back to their tier" — still true for everyone who creates an account or uses a sign-in link, which is the majority path the page now pushes people down.
Evidence: `navigate(nextPath ?? '/')` — the only reference to `nextPath` after its definition
Confidence: High

**ID: P5-019**
Severity: Major
Axis: Experience
Location: `client/src/pages/auth/LinkSentPanel.tsx:28-31, 64-77` (LinkSentPanel — resend)
Observed: The resend mutation has `onSuccess` only — a failed resend silently returns the label to "Send another link". The trigger is a `<span onClick>`, so it is not in the tab order and Enter does nothing.
Expected: A `<button>` (the sibling file already ships `TextAction` for exactly this, with a comment explaining why), plus an error branch.
Impact: The one recovery action on the dead-end "check your email" screen is mouse-only and fails silently.
Evidence: `<span … onClick={() => resend.mutate()}>{resend.isPending ? 'Sending…' : 'Send another link'}</span>`
Confidence: High

**ID: P5-020**
Severity: Major
Axis: Experience
Location: `client/src/pages/auth/AuthPage.tsx:584-589, 602-607`; `LinkSentPanel.tsx:87-94`
Observed: Three more `<span onClick>` controls survive the fix documented at `AuthPage.tsx:27-39` — "Back to sign in" twice, and "Wrong address? Use a different one", the latter being the only escape for a mistyped address.
Expected: `TextAction` / `<button>`.
Impact: Keyboard and screen-reader users cannot leave the forgot-password view or correct a typo without a mouse.
Evidence: `<span style={{ … cursor: 'pointer' }} onClick={() => { setResetSent(false); setView('password') }}>Back to sign in</span>`
Confidence: High

**ID: P5-021**
Severity: Minor
Axis: Experience
Location: `client/src/index.css:454`; `client/src/pages/auth/AuthPage.tsx:392, 491, 549, 580`
Observed: Every async error on this page renders into `.gw-er`, a plain `<div>` with no `role="alert"` and no `aria-live`. The success banner at line 388 does have `role="status"`. Repo-wide there are only 7 live regions across the whole SPA, and `gw-er` is used in 8 places, none of them announced.
Expected: `role="alert"` on the error container, once, in the shared class's callers.
Impact: A screen-reader user presses "Sign in", focus stays on the button, and the failure is never announced — the page appears to do nothing.
Evidence: `.gw-er { font-size: 12px; color: var(--gw-red-t); margin-top: 5px; min-height: 16px; }`
Confidence: High

**ID: P5-022**
Severity: Minor
Axis: Experience
Location: `client/src/pages/auth/AuthPage.tsx:534-543, 565-575` (AuthPage — link and forgot views)
Observed: Both render `<label className="gw-label">Email</label>` with no `htmlFor` and an input with no `id`. The password and create views do it correctly.
Expected: Associate every label.
Impact: The label is not clickable and the input is announced unnamed.
Evidence: `<label className="gw-label">Email</label>` immediately followed by `<input className="gw-input" type="email" …>` with no `id`
Confidence: High

**ID: P5-023**
Severity: Minor
Axis: Experience
Location: `client/src/pages/auth/AuthPage.tsx:361-380, 461-469`; `pages/join/JoinPage.tsx:120`
Observed: No `autoComplete` attribute exists on any field in the entire auth, join or password flow. The only `autoComplete` values in `pages/` are on `TalkToUsPage` and an OTP field in `ops/`.
Expected: `autoComplete="email"`, `current-password`, `new-password` on the respective fields.
Impact: Password managers are not prompted to fill or to save; a credential nobody saved is one nobody can sign in with next time. Compounds P5-025.
Evidence: a grep for `autoComplete` across `pages/` returns four hits, none in `auth/` or `join/`
Confidence: High

**ID: P5-024**
Severity: Note
Axis: Inconsistency
Location: `client/src/pages/auth/AuthPage.tsx:620` (AuthPage — footer) — trace of lead (a)
Observed: The footer sells the engagement as "One check-in each", where a check-in is one person's whole participation. `JoinConfirmPage.tsx:62` uses the same word for a single session ("Starting your check-in…"), and `InvitePage.tsx:143` for the container ("You have already joined this check-in").
Expected: One word per object across the arrival screens.
Impact: On the sign-up screen "One check-in each" reads as *one session total*, which the invite page then contradicts, before the person has any model of the product.
Evidence: `One check-in each. One report showing where the team agrees, where it differs, and what to do next.`
Confidence: High

---

## Screen 4 — ChoosePasswordPage

**ID: P5-025**
Severity: Major
Axis: Bug
Location: `client/src/pages/auth/ChoosePasswordPage.tsx:79-86, 164, 175` (ChoosePasswordPage)
Observed: `submit()` has no in-flight guard. The button is `disabled={save.isPending}`, but the Enter handler on the confirm field is not, and the input stays enabled during the request, so repeated Enter fires `save.mutate()` again.
Expected: `if (save.isPending) return` as the first line of `submit()`.
Impact: Duplicate `setPassword`/`resetPassword` calls against a single-use token; the second resolves as "invalid or expired link" and can overwrite the success state of a person who actually succeeded.
Evidence: `onKeyDown={e => e.key === 'Enter' && submit()}` against `function submit() { setError(''); if (!token) …`
Confidence: High

**ID: P5-026**
Severity: Minor
Axis: Experience
Location: `client/src/pages/auth/ChoosePasswordPage.tsx:144-177` (ChoosePasswordPage)
Observed: There is no `<form>`. Enter submits only from the confirm field; pressing Enter in the password field — which has `autoFocus`, so it is where everyone starts — does nothing at all.
Expected: Wrap in a `<form onSubmit>`.
Impact: A dead Enter key on the focused field of the last screen of sign-up reads as a frozen page.
Evidence: two bare `<input … className="gw-input" type="password">` with a sibling `<button className="gw-btn" onClick={submit}>`
Confidence: High

**ID: P5-027**
Severity: Minor
Axis: Experience
Location: `client/src/pages/auth/ChoosePasswordPage.tsx:73-77, 173` (ChoosePasswordPage)
Observed: The server message is rendered verbatim, including `Array.isArray(msg) ? msg[0]` — the class-validator array shape. It renders into `.gw-er` with no `role="alert"`, and focus is not moved.
Expected: Map the known cases (expired, already used, weak) and announce.
Impact: On the last screen of sign-up a person can meet a raw validator string, unannounced.
Evidence: `setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid or expired link. Ask for a new one.'))`
Confidence: High

**ID: P5-028**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/auth/ChoosePasswordPage.tsx:106-117, 176` vs `AuthPage.tsx:145` (ChoosePasswordPage)
Observed: Three names for one act on one screen — heading "One last step", button "Set password and open Groundwork →", and a no-token state offering "Get a new link" which navigates to `/auth`, whose default view is the *password* sign-in form.
Expected: The no-token exit should land on the link view (`?mode=member`), since by definition this person has no password.
Impact: Somebody whose link lost its token is sent to a form asking for the password they came here to create.
Evidence: `<button className="gw-btn" onClick={() => navigate('/auth')}>Get a new link</button>` vs `const defaultView: View = isSignup ? 'create' : mode === 'member' ? 'link' : 'password'`
Confidence: High

**ID: P5-029**
Severity: Note
Axis: User value
Location: `client/src/pages/auth/ChoosePasswordPage.tsx:63, 69-72` (ChoosePasswordPage)
Observed: Success is a silent `navigate(next, { replace: true })` to `/grounds?welcome=1`. Nothing confirms the password was set.
Expected: One confirmation on arrival.
Impact: The person cannot tell whether the password saved; the only way to find out is to sign out and try it.
Evidence: `onSuccess: res => { setAuth(res.user, res.accessToken); navigate(next, { replace: true }) }`
Confidence: Medium
Check needed: whether `/grounds?welcome=1` renders a confirmation keyed on `welcome`.

---

## Screen 5 — InvitePage

**ID: P5-030**
Severity: Major
Axis: Experience
Location: `client/src/pages/invite/InvitePage.tsx:125-128` (InvitePage — accept)
Observed: The single primary action's only failure surface is a toast: no status, no distinction between a network drop, an expired token and a server fault, and nothing persists after the toast dismisses.
Expected: Inline, persistent, and specific enough to act on.
Impact: The invited person is the one user who cannot fix anything themselves and has no other route in. A vanishing toast leaves the page identical to before they pressed.
Evidence: `onError: () => { toast.error('Could not start your session. Please try again.') }`
Confidence: High

**ID: P5-031**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/invite/InvitePage.tsx:158-183` (InvitePage — already joined)
Observed: Two `className="gw-btn"` buttons of the same primary weight, separated by "or". The second, "Sign in to continue →", calls `navigate('/grounds')` — a protected route, not the sign-in page.
Expected: One primary and one secondary; and the sign-in button should go to `/auth`.
Impact: Two equally loud buttons with no basis to choose, one of which does not do what it says.
Evidence: `<button className="gw-btn" … onClick={() => navigate('/grounds')}>Sign in to continue →</button>`
Confidence: High

**ID: P5-032**
Severity: Minor
Axis: Experience
Location: `client/src/pages/invite/InvitePage.tsx:344-346, 397-401` (InvitePage)
Observed: The loading state is one line of muted text with no `role="status"`; the in-flight state changes only the button label. No aria-live anywhere on the screen.
Expected: `role="status"` on both.
Impact: A screen-reader user pressing "Add my version →" hears nothing between the press and a navigation that can take seconds while the server mints a check-in.
Evidence: `<div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Loading invite…</div>`
Confidence: High

**ID: P5-033**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/invite/InvitePage.tsx:143, 189, 270, 345, 350-356` (InvitePage) — trace of lead (a)
Observed: One screen names the thing four ways: "this check-in" (the engagement), "A Groundwork session about: …", "Setting up your session…" (one sitting), "add to your record", "your contribution record belongs to you" — alongside "About ten minutes, in a chat".
Expected: Fix the object names on the arrival screens first, since these are the first words anyone reads.
Impact: The person cannot tell whether "session" is the ten minutes promised or the whole commitment — precisely the question the box above is answering.
Evidence: `<b>What it takes.</b> About ten minutes, in a chat` alongside `{accept.isPending ? 'Setting up your session…' : 'Add my version →'}`
Confidence: High

**ID: P5-034**
Severity: Note
Axis: Experience
Location: `client/src/pages/invite/InvitePage.tsx:364-370` (InvitePage — decline)
Observed: "Not right now" navigates to `/`, which for a signed-out invitee is a bounce out to the marketing site.
Expected: An acknowledgement, or say where the button goes.
Impact: Declining ejects the person from the product with no confirmation that declining was recorded harmlessly, immediately after a paragraph promising it is never shown as a negative.
Evidence: `<button className="gw-back" … onClick={() => navigate('/')}>Not right now</button>`
Confidence: Medium
Check needed: whether `RootRoute` in `App.tsx` redirects an unauthenticated visitor to `MARKETING_URL`.

---

## Screen 6 — JoinPage / JoinConfirmPage

**ID: P5-035**
Severity: Blocker
Axis: Data integrity
Location: `client/src/pages/join/JoinConfirmPage.tsx:33-43` (JoinConfirmPage)
Observed: On success the auth store is seeded with a fabricated user — `email: ''`, `firstName: ''`, `lastName: ''`, `role: 'MEMBER'`, `organizationId: ''` — and the page navigates straight into the check-in. There is no `authApi.me()` refresh, though `InvitePage.tsx:86-90` performs exactly that on its equivalent path and documents why.
Expected: Fetch the real user before navigating, as the invite path does.
Impact: Every surface reading `user.firstName`, `user.email` or `user.organizationId` sees empty strings for this person's entire first session; `organizationId: ''` is the same stale-flag class the invite page's comment describes (`RequireOrgSetup` bouncing people to org setup).
Evidence: `setAuth({ id: res.userId, email: '', firstName: '', lastName: '', role: 'MEMBER', organizationId: '' }, res.accessToken)`
Confidence: High

**ID: P5-036**
Severity: Major
Axis: Inconsistency
Location: `client/src/pages/join/JoinPage.tsx:44-69, 133` (JoinPage — primary action) — trace of lead (a)
Observed: The primary button reads "Join and start my check-in →" and its pending label is "Setting up your session…", but the handler does neither: `joinApi.accept` sends an email and the page moves to a "Check your email" state. The file's own comment explains the change ("the address gets a link and the link does the work"); the button label was not updated with it.
Expected: A label naming the actual outcome, e.g. "Email me my link".
Impact: The person presses a button promising an immediate start, and lands on a wait-for-mail screen. Both senses of "check-in" and the word "session" appear in one two-state control.
Evidence: `{joining ? 'Setting up your session…' : 'Join and start my check-in →'}` over `setSentTo(res.to); setSentSays(res.says); setPhase('sent')`
Confidence: High

**ID: P5-037**
Severity: Major
Axis: Experience
Location: `client/src/pages/join/JoinPage.tsx:51-53, 132-134` (JoinPage)
Observed: The button is disabled until both email and "Your part in this" are filled, and `join()` additionally returns silently on the same condition. Nothing says which field is holding it. The role field carries no required marker, by deliberate choice ("No asterisk; the copy says why it is asked and the button waits for it").
Expected: Enable the button and validate on submit with a message naming the field, or mark the field required.
Impact: 205 of 223 people already skipped this field. A dim button with no explanation produces "the page is broken", and the chosen fix removes the only affordance that would say which field is missing.
Evidence: `disabled={joining || !email.trim().includes('@') || !role.trim()}`
Confidence: High

**ID: P5-038**
Severity: Major
Axis: Security
Location: `client/src/pages/join/JoinPage.tsx:55-61` vs `AuthPage.tsx:219` (JoinPage)
Observed: `joinApi.accept` is posted with no honeypot. `AuthPage` renders `useTheTrap()` on both account-creating forms and passes `trap.filled` through. The join form is reached from a broadcast link shared with a whole cohort — the most publicly exposed form in the product — and each submission triggers an outbound email to a typed address.
Expected: The same trap, or an equivalent server-side control on `joinApi.accept`.
Impact: An unauthenticated, widely shared endpoint that emails an arbitrary address is a mail-relay shaped hole; the protection exists in the codebase and is not applied to the one form that most needs it.
Evidence: `joinApi.accept({ joinToken, email: email.trim(), … })` with no `_hp`, against `authApi.entrySave(email…, trap.filled)`
Confidence: Medium
Check needed: whether the `/join/accept` server handler applies a throttle or honeypot independently of the client.

**ID: P5-039**
Severity: Minor
Axis: Experience
Location: `client/src/pages/join/JoinPage.tsx:64-72`; `JoinConfirmPage.tsx:62` (JoinPage)
Observed: A failed join surfaces only as a toast and `phase` stays `'start'`, so the page is visually unchanged. The `'loading'` phase is muted text with no `role="status"`, as is JoinConfirmPage's "Starting your check-in…", which can sit for seconds while a session is minted.
Expected: `role="status"` and a persistent inline error.
Impact: Nothing announced and nothing left on screen for a person who looked away. The toast copy itself is good, and it disappears.
Evidence: `catch { toast.error('Could not send your link — nobody has been emailed and nothing was added. Try again.') }`
Confidence: High

**ID: P5-040**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/join/JoinPage.tsx:120, 138` vs `AuthPage.tsx:451-467` (JoinPage)
Observed: The placeholder here is `you@company.com`. `AuthPage` deliberately changed both label and placeholder away from work-domain framing, with a comment explaining it turns away exactly the small teams the product is for. The closing line also promises "a link to set a password" while the invite door promises "a link for returning later".
Expected: `you@example.com`, and one shared sentence between the two arrival doors.
Impact: The corrected copy fix reached only one of the two doors.
Evidence: `placeholder="you@company.com"` against the comment `"WORK EMAIL" WAS TURNING PEOPLE AWAY FOR NOTHING. … The placeholder said the same thing a second time, so it changes too.`
Confidence: High

**ID: P5-041**
Severity: Note
Axis: Experience
Location: `client/src/pages/join/JoinConfirmPage.tsx:54-55` (JoinConfirmPage — failure)
Observed: The failure state renders `LinkProblem kind="join"` — whose generic body says join links are single use and expire — *and then* the specific server sentence underneath, the vaguer one first and in larger type.
Expected: Pass the specific sentence to `LinkProblem`'s existing `detail` prop, as `InvitePage:393-395` already does.
Impact: The reader is told the link expired, then told something possibly different in muted small text below.
Evidence: `<LinkProblem kind="join" />` followed by `<div style={{ … color: 'var(--gw-muted)' }}>{problem}</div>`
Confidence: High

---

## Screen 7 — GroundParticipantPage (a participant's own view)

**ID: P5-042**
Severity: Blocker
Axis: Data integrity
Location: `client/src/pages/grounds/GroundParticipantPage.tsx:360-370, 456-460` (GroundParticipantPage — header)
Observed: `totalSessions` falls back to a hardcoded `6` when `plannedSessionsFor` returns null — in the same statement whose own comment names the hardcoded 6 as the bug being fixed. The header then prints "Session 3 of 6" as fact.
Expected: When the planned count is unknown, print "Session 3" and omit the total.
Impact: A wrong number presented as fact on the header of every tab. Not cosmetic: the same value gates the resolution panel (`completedCount >= totalSessions - 1`, `MyRecord.tsx:80`) and feeds `WhatYourRecordCanSupport` and `MyParticipation`, so a fabricated 6 also decides when the person is offered the way to end the engagement.
Evidence: `const totalSessions = plannedSessionsFor(…) ?? 6`, under `Previously this fell back to a hardcoded 6, so a 90-day monthly ground (really 3 sessions) displayed "of 6".`
Confidence: High

**ID: P5-043**
Severity: Major
Axis: Experience
Location: `client/src/pages/grounds/GroundParticipantPage.tsx:126-141, 152` (GroundParticipantPage — start a session)
Observed: `probeSession`'s `mutationFn` carefully extracts the server's message (`throw new Error(res.data?.message ?? 'Could not start session.')`) and `onError` then throws it away for a fixed generic toast.
Expected: `onError: (e) => toast.error(e.message)`.
Impact: Every reason a session cannot start — not your turn, ground closed, session already open elsewhere — arrives as the same four words, with no way to know whether to retry or stop.
Evidence: `onError: () => toast.error('Could not start session. Try again.'),`
Confidence: High

**ID: P5-044**
Severity: Major
Axis: Bug
Location: `client/src/pages/grounds/GroundParticipantPage.tsx:176-179, 800-808` (GroundParticipantPage — paywall)
Observed: `createSubscriptionMut.onSuccess` redirects only `if (r.checkoutUrl)`. With no URL there is no else branch: no toast, no state change; the button flips back from "Redirecting..." to "Upgrade organisation".
Expected: An error toast on a missing `checkoutUrl`.
Impact: A silent dead end on the only paid path on the screen — and with Stripe unwired this is the live case. The person presses repeatedly, each press firing a fresh subscription-creation call.
Evidence: `onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },`
Confidence: High

**ID: P5-045**
Severity: Major
Axis: Experience
Location: `client/src/pages/grounds/GroundParticipantPage.tsx:769-773, 850-856` (GroundParticipantPage — paywall modal)
Observed: A hand-rolled fixed overlay with no `role="dialog"`, no `aria-modal`, no focus move on open, no focus trap, no Escape. It is opened programmatically by `probeSession`, so focus stays behind the scrim. For a non-initiator the entire modal holds one actionable control, "Not now".
Expected: Dialog semantics, focus moved in on open, Escape closes.
Impact: A keyboard or screen-reader user is dropped into a modal they are not told about and can tab out of into an inert page. The non-initiator variant is additionally a dead end reporting what somebody else must do.
Evidence: `<div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, … }}>`
Confidence: High

**ID: P5-046**
Severity: Major
Axis: Inconsistency
Location: `client/src/pages/grounds/GroundParticipantPage.tsx:783-798, 843-846` (GroundParticipantPage — paywall copy) — trace of lead (a)
Observed: Three faults in one modal. (a) "continue your Check-in" — mid-sentence capital C, while the same modal writes "unlimited check-ins" lowercase eight lines later. (b) "Unlock unlimited check-ins and unlimited sessions" uses check-in = engagement while "Add one more free session … continue your Check-in" uses it as the container of sessions, under a title reading "Your session is complete." (c) "Your initiator has been notified" exposes the internal `partyType` value to a participant; the rest of the page says "Whoever runs it".
Expected: One casing, one noun per object, "whoever runs this check-in" in place of "initiator". This block is duplicated near-verbatim in `components/PostSessionPanel.tsx:44-88`, so any fix must be made twice or the copy shared.
Impact: The paywall is where the product asks for money, and it is the least consistent copy on the screen.
Evidence: `Add another free session and continue your Check-in.` / `Unlock unlimited check-ins and unlimited sessions` / `Your initiator has been notified.`
Confidence: High

**ID: P5-047**
Severity: Minor
Axis: Experience
Location: `client/src/pages/grounds/GroundParticipantPage.tsx:401` (GroundParticipantPage — exit)
Observed: The only way back to the check-in list is a `<span onClick>` — not a button, not focusable, no role, no accessible name beyond an arrow glyph. Every other navigation on the page is a real `<button>`.
Expected: A `<button>`, as the sibling control four lines below already is.
Impact: The page's exit is unreachable by keyboard and invisible in a screen reader's control list.
Evidence: `<span onClick={() => navigate('/grounds')} style={{ … cursor: 'pointer', flexShrink: 0 }}>← Check-ins</span>`
Confidence: High

**ID: P5-048**
Severity: Minor
Axis: Bug
Location: `client/src/pages/grounds/GroundParticipantPage.tsx:352-360, 456-458` (GroundParticipantPage — header counter)
Observed: The header prints `Session {min(completedCheckIns.length + 1, totalSessions)} of {totalSessions}` unconditionally, ignoring `opensLater`, which is derived immediately above precisely to distinguish "open" from "due".
Expected: When `opensLater`, say when the next session opens rather than numbering one as current.
Impact: Someone whose session 3 opens in a fortnight reads "Session 3 of 6" in the header while the Check-in tab says it is not open. The two halves of one screen disagree.
Evidence: `const opensLater = !!openAvailableFrom && new Date(openAvailableFrom).getTime() > Date.now()` … `· Session {Math.min(completedCheckIns.length + 1, totalSessions)} of {totalSessions}`
Confidence: High

**ID: P5-049**
Severity: Minor
Axis: Experience
Location: `client/src/components/gw/ResolutionPanel.tsx:37-46, 71` (reached from the Record tab via `MyRecord.tsx:80-82`)
Observed: `if (isLoading || error || !data) return null` — a 403 from a non-party is intended silence, but so is every network failure and 500. The commit press has no confirm: `onClick={() => picked && proposeMut.mutate(picked)}`, where the options can include ending the engagement.
Expected: Distinguish 403 from other failures; confirm the commit, as ChatPage confirms both of its irreversible actions.
Impact: The way an engagement ends is one click with no second step, and if the fetch fails the section is simply absent — the person cannot tell whether they have no say or the page broke.
Evidence: `if (isLoading || error || !data) return null`
Confidence: High

---

## Screen 8 — ChatPage (a participant's own check-in, closing, resolution)

**ID: P5-050**
Severity: Major
Axis: Inconsistency
Location: `client/src/pages/chat/ChatPage.tsx:1128, 1145, 1166, 1171` (ChatPage — closing) — trace of lead (a)
Observed: The close action is named three ways and the confirm calls a single session a "check-in". The offer says "Complete session ✓"; the confirm heading says "Ready to finish this check-in?"; the commit says "Finish check-in ✓". Fourteen lines below, "Open this check-in" navigates to `/grounds/:id` and "← Back to check-ins" to `/grounds` — the engagement sense.
Expected: One noun per object. The thing being closed is a session; the thing at `/grounds/:id` is the check-in.
Impact: At the single irreversible moment on the screen, the product tells the person they are finishing the whole engagement. This is the sharpest collision of the two senses in the product.
Evidence: `Ready to finish this check-in?` … `{complete.isPending ? 'Saving…' : 'Finish check-in ✓'}` against `onClick={() => navigate(\`/grounds/${groundId}\`)}` … `Open this check-in`
Confidence: High

**ID: P5-051**
Severity: Major
Axis: Bug
Location: `client/src/pages/chat/ChatPage.tsx:113-126, 725-736` (ChatPage — closing session warning)
Observed: `isInitiator` and `isFinalSession` are read only from `location.state`, with no correction from the loaded transcript — unlike `sessionNumber`, which the file explicitly fixed for this exact reason four lines above. Arriving by email link, WhatsApp or bookmark leaves both false.
Expected: Both corrected from the check-in payload the way `sessionNumber` is.
Impact: On a closing session opened from an email, the amber "Closing session N · your final account · This is the last word on the record" warning silently does not render, and the lead never sees `WhoIsStillOut`. The person writes their final account without being told it is final.
Evidence: `const isFinalSession: boolean = (location.state as any)?.isFinal ?? false`, directly under the comment `THE SESSION NUMBER COMES FROM THE CHECK-IN, NOT FROM HOW YOU GOT HERE … every check-in opened from an email, WhatsApp or a bookmark said "Session 1"`
Confidence: High

**ID: P5-052**
Severity: Major
Axis: Experience
Location: `client/src/pages/chat/ChatPage.tsx:1283-1292` (ChatPage — send)
Observed: The primary action is a bare `↑` glyph button with no `aria-label`, no `title`, no text child. Nothing on the screen has `aria-live`, so streamed replies and the "Still reading what you wrote" line are announced to nobody.
Expected: An accessible name, and `aria-live="polite"` on the message list.
Impact: A screen-reader user hears "button" for the only way to submit an answer, and never learns a reply arrived.
Evidence: `<button onClick={send} disabled={loading || completed || declined || !opened} style={{ … fontSize: 18 … }}> ↑ </button>`
Confidence: High

**ID: P5-053**
Severity: Major
Axis: Experience
Location: `client/src/pages/chat/ChatPage.tsx:596-611, 1348-1361` (ChatPage — document upload)
Observed: `submitDocWithContext` and `submitPaste` fire the mutation then immediately close the sheet and clear the fields; neither commit button reads `uploadDoc.isPending` nor is disabled. No placeholder bubble appears until `onSuccess`.
Expected: Disable and label while pending, or drop a placeholder bubble on submit.
Impact: Between pressing "Add to session" and the reply landing, the screen shows nothing — the file appears to have vanished. Uploads on this path also run a model assessment, so the gap is long.
Evidence: `uploadDoc.mutate({ file: pendingDoc, ctx: docContext }); setDocContextMode(false); setPendingDoc(null); setDocContext('')` with `<button onClick={submitDocWithContext}>Add to session</button>` carrying no `disabled`
Confidence: High

**ID: P5-054**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/chat/ChatPage.tsx:1265-1272` (ChatPage — attach)
Observed: The file input's `accept` offers 22 extensions including `.json`, `.py`, `.css`; the `onChange` validator then rejects everything outside a 10-item allowlist.
Expected: One list — the picker should offer only what the validator accepts.
Impact: The OS dialog presents a `.py` as choosable, the person picks it, and is told "File type not supported" — a refusal the product invited.
Evidence: `accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.heic,.md,.html,.htm,.json,.xml,.js,.ts,.py,.java,.go,.rb,.php,.css"` vs `const allowed = ['.pdf','.doc','.docx','.txt','.csv','.xlsx','.png','.jpg','.jpeg','.md']`
Confidence: High

**ID: P5-055**
Severity: Minor
Axis: Bug
Location: `client/src/pages/chat/ChatPage.tsx:576-583, 1252-1258` (ChatPage — attach without groundId)
Observed: The Upload control is a `<label htmlFor="doc-upload">` styled as disabled when `groundId` is missing, but a label cannot be disabled — clicking still opens the picker, and `handleFileChange` then returns silently on `if (!f || !groundId) return`.
Expected: Hide the control, or keep the error path `submitDocWithContext` already has.
Impact: The person picks a file, the dialog closes, and nothing happens — no sheet, no error.
Evidence: `function handleFileChange(e) { const f = e.target.files?.[0]; if (!f || !groundId) return; … }`
Confidence: High

**ID: P5-056**
Severity: Minor
Axis: Experience
Location: `client/src/pages/chat/ChatPage.tsx:387-395, 766-768` (ChatPage — first paint)
Observed: The transcript fetch is deliberately delayed by `Math.random() * 2000`, and "Opening your session…" renders only on `openSession.isPending`, which cannot be true until after that delay. For up to two seconds the chat area is entirely empty.
Expected: A loading state from mount, not from the mutation.
Impact: Every arrival opens on a blank screen for up to two seconds — the same picture as the dead-screen failure the 45-second watchdog exists to catch.
Evidence: `const jitter = Math.random() * 2000` … `{openSession.isPending && (<div …>Opening your session…</div>)}`
Confidence: High

**ID: P5-057**
Severity: Note
Axis: Experience
Location: `client/src/pages/chat/ChatPage.tsx:1076-1109` (ChatPage — decline)
Observed: Decline is a two-step confirm spelling out all four consequences before the irreversible press, with `disabled={decline.isPending}` and a settled post-state. Completion also confirms and shows `SlowStep`.
Expected: —
Impact: The two most consequential actions here are the safest on the page; the gaps are in the routine ones (P5-053, P5-055). Reference pattern for P5-049 and P5-071.
Evidence: `<li>This cannot be undone for this session.</li>` … `{decline.isPending ? 'Recording…' : 'Yes, I am not taking part'}`
Confidence: High

---

## Screen 9 — SessionReportPage (a session report)

**ID: P5-058**
Severity: Major
Axis: Inconsistency
Location: `client/src/pages/report/SessionReportPage.tsx:428-433` (SessionReportPage) — trace of lead (a)
Observed: The page's primary action is labelled "Open a follow-up check-in" and navigates to `/grounds/new`, which `App.tsx:384` redirects to `/start` — the anonymous setup chat for a brand-new engagement, not another session of the one just reported on. The label reads in the session sense; the behaviour is the engagement sense.
Expected: Either continue this ground, or label it "Start a new check-in".
Impact: The lead presses the one primary button on the page and lands in setup for a separate ground, with the session they were reading not carried. Duplicate grounds for the same work follow.
Evidence: `onClick={() => navigate('/grounds/new')}` … `Open a follow-up check-in`, with `<Route path="/grounds/new" element={<Navigate to="/start" replace />} />`
Confidence: High

**ID: P5-059**
Severity: Major
Axis: Bug
Location: `client/src/pages/report/SessionReportPage.tsx:434-439` (SessionReportPage — copy link)
Observed: `navigator.clipboard?.writeText(...).then(...)` — the `?.` guards `clipboard`, but `.then` is applied to the whole expression, so where the API is absent the expression is `undefined` and `.then` throws a TypeError. The `.catch` never runs.
Expected: A real guard, or the `?.` after the call, so the failure path shows the "Select the address bar instead" message it already wrote.
Impact: On exactly the browsers where copy is unsupported, the user gets silence plus a console error — and the good error message that exists is unreachable.
Evidence: `navigator.clipboard?.writeText(\`${window.location.origin}/checkin/${checkInId}/report\`).then(() => toast.success('Link copied')).catch(...)`
Confidence: High

**ID: P5-060**
Severity: Major
Axis: Experience
Location: `client/src/pages/report/SessionReportPage.tsx:185-231, 340-355` (SessionReportPage — "Your own report")
Observed: The section renders unconditionally once loading succeeds, but every child inside it is separately gated. When the ground report has not been synthesised yet, the user sees the header "Your own report / Yours alone / What you said this session, and what to do with it" above an empty tinted box. No empty state, no "still being written" line.
Expected: A pending state inside the private half, as `ReportPage.tsx:920-931` already does for the shared report.
Impact: A first-time user who finishes a session and opens this page reads a promise with nothing under it — which reads as the product having lost their answers, the exact complaint quoted in the file header.
Evidence: `<h2 …>Your own report</h2>` followed by `{data?.report && (`
Confidence: High

**ID: P5-061**
Severity: Minor
Axis: Experience
Location: `client/src/pages/report/SessionReportPage.tsx:140-159` (SessionReportPage — error)
Observed: The error block's own comment says "The status says which of the three things actually happened", but the code collapses 403 and 404 into "This session is not yours to open / A session report is only ever readable by the person who wrote it." No retry, no way out.
Expected: 404 gets its own line ("this session is no longer here") with a route back; only 403 accuses.
Impact: A stale or deleted link is reported as a permission accusation — the complaint quoted three lines above the code is still produced for one of the two statuses.
Evidence: `(error as any)?.response?.status === 403 || (error as any)?.response?.status === 404 ? 'This session is not yours to open'`
Confidence: High

**ID: P5-062**
Severity: Minor
Axis: Experience
Location: `client/src/pages/report/SessionReportPage.tsx:136-138, 321-327` (SessionReportPage)
Observed: No `aria-live`/`role="status"` anywhere. "Getting your report..." appears and disappears silently, as does the "Correct it" pending state. `ReportPage.tsx` uses `role="status" aria-live="polite"` for the same class of message.
Expected: Match the codebase's own pattern.
Impact: A screen-reader user cannot tell whether the page is loading, failed, or empty.
Evidence: `<div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Getting your report...</div>`
Confidence: High

**ID: P5-063**
Severity: Note
Axis: Experience
Location: `client/src/pages/report/SessionReportPage.tsx:113` (SessionReportPage — narrow viewport)
Observed: `maxWidth: 720` with `padding: '20px 16px 60px'`, every inner section flex with `flexWrap: 'wrap'`, no fixed pixel widths, no `nowrap`, no tables.
Expected: —
Impact: None; recorded so the absence is not read as unchecked. This is the one screen of the fifteen with no narrow-viewport risk.
Evidence: `style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}`
Confidence: High

---

## Screen 10 — ReportPage (the whole-ground report)

**ID: P5-064**
Severity: Major
Axis: Bug
Location: `client/src/pages/report/ReportPage.tsx:679-690` (ReportPage — MissingContributors)
Observed: The "Add them" / "Send request" submit silently returns on a malformed email (`if (!email.trim().includes('@')) return`). The button is not disabled for that case — only while a mutation is pending — so pressing it with a typo does nothing at all.
Expected: Disable until the address is plausible, or say why nothing happened.
Impact: A lead trying to pull a missing contributor into the check-in presses a live-looking button repeatedly with no feedback. Same silent-return shape as P5-011.
Evidence: `onClick={() => { if (!email.trim().includes('@')) return; …` with `disabled={addParticipant.isPending || requestAddition.isPending}`
Confidence: High

**ID: P5-065**
Severity: Major
Axis: Experience
Location: `client/src/pages/report/ReportPage.tsx:1480-1494` (ReportPage — download panel)
Observed: The download buttons are labelled only `Session {n}` under a bare "Download:" prefix, and `downloadRecord` has an `onError` but no `onSuccess` — nothing confirms a file was produced. The explanation lives in a `title`.
Expected: An accessible name saying the action, and a success confirmation or `aria-live` announcement.
Impact: A screen-reader user hears a list of bare numbers; every user gets no confirmation that the "portable and permanent" claim just above actually produced anything.
Evidence: `const downloadRecord = useMutation({ mutationFn: …, onError: () => toast.error('Could not download that record. Please try again.') })` and `>Session {c.sessionNumber}</button>`
Confidence: High

**ID: P5-066**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/report/ReportPage.tsx:1043-1050, 1112` (ReportPage) — trace of lead (a)
Observed: `sessionPhrase` prints "One person has checked in so far. The second is what makes it a comparison." whenever `oneSided`, regardless of how many parties the ground has. Separately, "Picture forming - {completed} of {total} checked in" is per-session data (`sessionProgress` carries `sessionNumber`) on a page that twice teaches the engagement sense ("This check-in has closed", "Everybody in this check-in keeps their copy").
Expected: Count the outstanding parties, and name the unit on the progress line ("answered this session").
Impact: On a four-person ground the lead reads "the second" as one person outstanding. And "3 of 5 checked in" reads as "3 of 5 have ever taken part" rather than "3 of 5 answered round 4" — two people permanently absent and two merely late become indistinguishable.
Evidence: `? 'One person has checked in so far. The second is what makes it a comparison.'` (identical string on both branches)
Confidence: Medium
Check needed: confirm `oneSided` is derived from respondent count rather than a two-party ground.

**ID: P5-067**
Severity: Minor
Axis: Experience
Location: `client/src/pages/report/ReportPage.tsx:224-243` (ReportPage — OutcomeFeedbackSection)
Observed: "It felt fair" / "It did not" are `disabled={submit.isPending}` but their labels and `cursor: 'pointer'` never change, so there is no in-flight signal; the only success signal is a transient toast.
Expected: A pending label, as the codebase does elsewhere.
Impact: On a slow connection the user presses twice; the second press is swallowed but they cannot tell that.
Evidence: `disabled={submit.isPending}` … `style={{ … cursor: 'pointer', … }}>It felt fair`
Confidence: High

**ID: P5-068**
Severity: Minor
Axis: Experience
Location: `client/src/pages/report/ReportPage.tsx:787-798, 1088-1094` (ReportPage — forming banner)
Observed: The report polls every 5s while stale, and the "Picture forming - {completed} of {total} checked in" banner has no `role="status"`/`aria-live`, though the stale banner (940) and the waiting line (928) both do.
Expected: Same live-region treatment on the banner that actually changes under the reader.
Impact: The number silently changes for a screen-reader user; two banners on one page behave differently.
Evidence: `<strong>Picture forming</strong> - {progress.completed} of {progress.total} checked in.` with no role, against `<div role="status" aria-live="polite" …>`
Confidence: High

**ID: P5-069**
Severity: Note
Axis: Experience
Location: `client/src/pages/report/ReportPage.tsx:893-935` (ReportPage — error and empty)
Observed: Both the "no ground" and "no report" states are differentiated, retry-bearing and non-accusatory, and the "being written" case self-refreshes.
Expected: —
Impact: The strongest error/empty handling in the fifteen screens, and the reference the others should match — notably P5-060, P5-061 and P5-072.
Evidence: `const why = whyYouCannotSeeThis(whatWentWrong(groundError))` … `{why.canRetry && (<button onClick={() => refetchGround()}…>Try again</button>)}`
Confidence: High

---

## Screen 11 — BoardPage

**ID: P5-070**
Severity: Blocker
Axis: Data integrity
Location: `client/src/pages/board/BoardPage.tsx:253-259` vs `1165-1180` (BoardPage — header)
Observed: The board header prints `session {b.phaseSpine.currentSession}` as a bare fact. The same file's exit-panel gate, 900 lines below, refuses to use that value and says why: it "is the highest session NUMBER any check-in row carries - and rows for the next session are created the moment one completes, so it runs ahead of the run."
Expected: Count the way the gate does (sessions everybody has finished), or use `plannedSessionsFor(...)`, already imported in this file.
Impact: A wrong number presented as fact in the header of the *shared* board. Everyone on the check-in reads the run as further along than it is, while a participant four rounds behind sees their own row unfilled. The file has already diagnosed this value as wrong for decisions and still displays it for people.
Evidence: `session {b.phaseSpine.currentSession}` against `NOT \`phaseSpine.currentSession\`, which is the highest session NUMBER any check-in row carries`
Confidence: High

**ID: P5-071**
Severity: Major
Axis: Experience
Location: `client/src/pages/board/BoardPage.tsx:486-492` (BoardPage — remove target)
Observed: The target-removal control is a button whose visible label is the single character `x`, with the explanation only in a `title`. It fires `removeObjective.mutate(o.id)` immediately — no confirm, no undo, no `aria-label`.
Expected: A confirm matching `GroundAdminPage`'s two-step delete, and an accessible name ("Remove target: {o.name}").
Impact: A lead loses a target and its count history on one mis-click; a screen-reader user hears "x button" beside two other unlabelled buttons, "-" and "+".
Evidence: `<button onClick={() => removeObjective.mutate(o.id)} disabled={removeObjective.isPending} title="Remove this target" style={{ ...miniBtn, color: 'var(--gw-clay)' }}>x</button>`
Confidence: High

**ID: P5-072**
Severity: Major
Axis: Bug
Location: `client/src/pages/board/BoardPage.tsx:126-137` (BoardPage — error)
Observed: One branch covers every failure: `if (error || !data)` renders "This board could not be loaded. / You may not be a party to this check-in, or it may no longer exist." with a single "Back to check-ins" button. The query sets `retry: false`.
Expected: Distinguish 403/404 from 5xx/network as `ReportPage` does via `whyYouCannotSeeThis`, and offer "Try again" where retry is meaningful.
Impact: A single transient 500 permanently evicts a reader from their own board with a permission-flavoured accusation and no recovery on the page.
Evidence: `const { data, isLoading, error } = useQuery({ … retry: false })` … `You may not be a party to this check-in, or it may no longer exist.`
Confidence: High

**ID: P5-073**
Severity: Minor
Axis: Experience
Location: `client/src/pages/board/BoardPage.tsx:474-484` (BoardPage — count buttons)
Observed: The `-` and `+` buttons are guarded only by `bumpObjective.isPending`, shared across every objective row. While one row's bump is in flight, every other row's buttons are disabled too, and rapid clicking queues round trips whose ordering is not guaranteed.
Expected: Per-row pending state (`bumpObjective.variables?.objectiveId === o.id`), the pattern `GroundAdminPage.tsx:1856` already uses.
Impact: The board feels frozen while any one number changes, and fast counting can land the wrong final number.
Evidence: `disabled={bumpObjective.isPending || o.count === 0}` on one row while the same flag gates all rows
Confidence: High

**ID: P5-074**
Severity: Minor
Axis: Experience
Location: `client/src/pages/board/BoardPage.tsx:126, 1023-1047` (BoardPage — loading and poll form)
Observed: "Loading the board…" is a plain div with no `role="status"`. The poll form is not a `<form>`, so Enter in the question input does nothing, and Cancel discards the typed question and options with no warning.
Expected: Live region on load; Enter submits.
Impact: Keyboard users must mouse to Save; screen readers get no load announcement.
Evidence: `return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gw-muted)' }}>Loading the board…</div>`
Confidence: High

**ID: P5-075**
Severity: Note
Axis: Inconsistency
Location: `client/src/pages/board/BoardPage.tsx:703-712` (BoardPage — check-ins grid) — trace of lead (a)
Observed: The section heading is "Check-ins this phase", its source line reads "from sessions", and its generated column headers are `Session {s}`. One object, three nouns, in ten lines. Combined with P5-070, the grid can show two done columns while the header claims session 4.
Expected: One noun.
Impact: The lead cannot reconcile the header number with the column count, and has no way to tell which is right.
Evidence: `Sec title="Check-ins this phase" src="from sessions"` over a table whose headers are `` `Session ${s}` ``
Confidence: High

**ID: P5-076**
Severity: Note
Axis: Experience
Location: `client/src/pages/board/BoardPage.tsx:703-712` (BoardPage — narrow viewport)
Observed: The only wide table is correctly wrapped: `<div style={{ overflowX: 'auto' }}>` around `<table style={{ …, minWidth: 460 }}>`, and the "Role" column is dropped when empty. Objective rows use `flexWrap` with `minWidth` bars that wrap rather than overflow.
Expected: —
Impact: Narrow-viewport behaviour on this screen is sound; contrast P5-089.
Evidence: `<div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 460 }}>`
Confidence: High

---

## Screen 12 — GroundAdminPage (grounds detail)

**ID: P5-077**
Severity: Major
Axis: Bug
Location: `client/src/pages/grounds/GroundAdminPage.tsx:2617-2619, 2739-2742, 2785-2788, 2801-2802, 2831-2832` (GroundAdminPage — Setup)
Observed: Five Setup writes bypass `useMutation` and call the API as a raw promise from `onClick`. None has an in-flight guard: "Save start date", "Save timeframe", "Save name", the scenario save and the work-together radio are disabled only by *value equality*, so a double-click before the response lands fires two identical PATCHes; the radio has no guard at all.
Expected: `useMutation` with `isPending` disabling, matching every other writer on this page.
Impact: Double submission on the controls that reshape the run — timeframe and cadence regenerate the session plan — and the second response can overwrite state the first invalidation just refreshed.
Evidence: `onClick={() => groundsApi.update(id!, { timelineDays: timelineDaysDraft, cadence: cadenceDraft }).then(...).catch(() => toast.error('The length did not change — try again.'))}` with `disabled={timelineDaysDraft === ground.timelineDays && cadenceDraft === ground.cadence}`
Confidence: High

**ID: P5-078**
Severity: Major
Axis: Experience
Location: `client/src/pages/grounds/GroundAdminPage.tsx:2929-2944` (GroundAdminPage — Setup → "Ending it")
Observed: The band's primary control, "Close this check-in", is hard-coded `disabled` with `cursor: 'not-allowed'`; the only real route is a `mailto:`. The fold is titled "Ending it", headed "Close check-in", and carries a full irreversibility warning above a dead button.
Expected: Remove the button and lead with the mail route, or ship the action.
Impact: The lead reads a complete-looking destructive control, presses it, nothing happens; the working route reads as a footnote. A permanently disabled primary control is not a state, it is scaffolding.
Evidence: `<button disabled style={{ … cursor: 'not-allowed', … opacity: 0.4 }}>Close this check-in</button>` under `Self-serve close is coming. For now, email …`
Confidence: High

**ID: P5-079**
Severity: Major
Axis: Bug
Location: `client/src/pages/grounds/GroundAdminPage.tsx:585-590, 601-605` (GroundAdminPage — remind and dismiss)
Observed: `remind` and `dismissRequest` have `onSuccess` but no `onError`. A failed reminder shows nothing; a failed dismissal leaves the request card on screen with no explanation.
Expected: `onError` toasts, as every neighbouring mutation on this page has.
Impact: The lead believes a nudge went out when it did not. Silence on failure is the worst of the four error modes, and this page otherwise avoids it consistently.
Evidence: `const remind = useMutation({ mutationFn: (checkInId: string) => conversationApi.remind(checkInId), onSuccess: () => toast.success('Reminder sent') })`
Confidence: High

**ID: P5-080**
Severity: Minor
Axis: Experience
Location: `client/src/pages/grounds/GroundAdminPage.tsx:2506-2513, 763-786` (GroundAdminPage — invite queue)
Observed: `inviteTheQueue` clears the queue in `onSuccess` *before* reporting per-person failures: `setQueuedToAdd([])` runs, then failures are announced as individual `toast.warning` lines and stashed via `rememberWhoWasNotInvited`.
Expected: Keep the failed rows in the queue so the retry is in place.
Impact: With four warnings stacked and an emptied list, the lead has to re-type every address that was refused.
Evidence: `onSuccess: ({ failed, waiting, sent }) => { setQueuedToAdd([]) … for (const f of failed) toast.warning(\`${f.email}: ${f.because}\`) …`
Confidence: High

**ID: P5-081**
Severity: Minor
Axis: Experience
Location: `client/src/pages/grounds/GroundAdminPage.tsx:1920-1946` (GroundAdminPage — roster session pips)
Observed: Each pip is a button whose entire visible content is a numeral, with all meaning in `title`. Somebody else's session renders `disabled` with `cursor: 'default'` and no explanation.
Expected: `aria-label` carrying the title text; a visible or announced reason that other people's sessions are not openable.
Impact: A screen reader reads a row of bare digits; the lead cannot tell "not yours" from "broken", on the grid they scan to find who has not answered.
Evidence: `disabled={!isMine}` … `title={\`Session ${ci.sessionNumber}: …\`}` … `>{ci.sessionNumber}</button>`
Confidence: High

**ID: P5-082**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/grounds/GroundAdminPage.tsx:594, 763-764, 2758-2764` (GroundAdminPage) — trace of lead (a)
Observed: Both senses collide inside single controls. The cadence select is `aria-label="Check-in cadence"` and the line directly under it reads "{n} sessions over {days} days". The closing-session toast says "{n} people will do their final check-in" (session sense) while the invite copy says "{n} people are on the check-in" (engagement sense), 170 lines apart in one file.
Expected: One noun per object; "session cadence" for the control that produces a count of sessions.
Impact: A lead setting up hears "check-in cadence" and may believe twelve engagements' worth of invitations are being created rather than twelve sessions of one.
Evidence: `aria-label="Check-in cadence"` above `{sessionsFor(…) ?? 1} sessions over {timelineDaysDraft} days.`; `toast.success(\`Closing session begun - ${r.participantsFlagged} … will do their final check-in.\`)`
Confidence: High

**ID: P5-083**
Severity: Note
Axis: Experience
Location: `client/src/pages/grounds/GroundAdminPage.tsx:2957-2992` (GroundAdminPage — delete)
Observed: A two-step confirm naming the ground in quotes, a distinct "Keep it" cancel, a pending label, and server refusal text rendered verbatim into an inline error block rather than a toast.
Expected: —
Impact: Reference pattern; P5-071 and P5-090 should match it.
Evidence: `<span …>Delete "{ground.label}" for good?</span>` … `{removeGround.isPending ? 'Deleting…' : 'Yes, delete it'}` … `{deleteError && (<div …>{deleteError}</div>)}`
Confidence: High

---

## Screen 13 — Billing / Pricing / Payment

**ID: P5-084**
Severity: Blocker
Axis: Bug
Location: `client/src/pages/billing/PricingPage.tsx:52-58` (PricingPage — subscribe)
Observed: `subscribeMut` has no `onError`. On failure — which, with Stripe unwired, is the live case — nothing renders, no toast, and `subscribingPlan` is never cleared, so the pressed button reverts from "Loading..." to "Subscribe" with no explanation.
Expected: An error path, as `BillingPage` has (`onError: () => toast.error('Could not start checkout. Try again.')`).
Impact: The only public buy button in the product fails silently. A prospect concludes the product is broken, or that they already subscribed.
Evidence: `const subscribeMut = useMutation({ mutationFn: (plan) => billingApi.createSubscription(plan), onSuccess: (data) => { window.location.href = data.checkoutUrl }, })` — no `onError` key
Confidence: High

**ID: P5-085**
Severity: Blocker
Axis: User value
Location: `client/src/pages/billing/PricingPage.tsx:156-162`; `BillingPage.tsx:610-616` (Subscribe / Switch)
Observed: Both screens present subscription as a working purchase — "Subscribe", "Switched to X. The difference is prorated on your next invoice.", "Invoices and payment method" — while Stripe has no keys configured and there are zero subscribers.
Expected: Either the payment path works, or the buttons say what actually happens rather than asserting a charge and a prorated invoice.
Impact: Every money affordance on the two billing screens promises an outcome the system cannot deliver today.
Evidence: `toast.success(\`Switched to ${PLAN_LABELS[plan]}. The difference is prorated on your next invoice.\`)`
Confidence: High

**ID: P5-086**
Severity: Major
Axis: Bug
Location: `client/src/pages/billing/BillingPage.tsx:630-635` (BillingPage — Enterprise contact)
Observed: The Enterprise "Contact" mailto is addressed to the signed-in user's own email, falling back to support. The admin emails themselves. `PricingPage.tsx:175` uses `hello@myground.work` correctly.
Expected: The company address.
Impact: The highest-value lead path on the page dead-ends in the customer's own inbox; the enquiry never reaches anyone.
Evidence: `href={\`mailto:${user?.email ?? 'support@myground.work'}?subject=Enterprise plan enquiry\`}`
Confidence: High

**ID: P5-087**
Severity: Major
Axis: Inconsistency
Location: `client/src/pages/billing/BillingPage.tsx:346-352, 448, 461-464` (BillingPage — usage and free cap) — trace of lead (a)
Observed: The stat labelled "Check-ins" is `usage.checkIns`, which the service computes as `checkIns: everyGround` — a count of engagements. The free-cap copy uses the same word the same way ("Your first {freeGrounds} check-ins are free … with unlimited sessions"), while `ChatPage` calls one session a check-in at the moment of closing it (P5-050). One word names the billed unit and the unbilled unit.
Expected: The quota unit named unambiguously wherever a number is counted against a plan.
Impact: An admin cannot tell whether the free allowance is N engagements or N sittings — the number that decides whether they pay. This is the lead reaching the money layer.
Evidence: `label="Check-ins"` with `value={String((billingStatus as any).usage.checkIns)}`, over `Create up to {freeGrounds} check-ins with unlimited sessions and reports`
Confidence: High

**ID: P5-088**
Severity: Major
Axis: Inconsistency
Location: `client/src/pages/billing/BillingPage.tsx:220-227, 646-649` vs `PaymentPage.tsx:76-86` (BillingPage — cancel and principles)
Observed: The principles list still offers "Choose between buying sessions or subscribing your organisation", but `PaymentPage` now states sessions are not sold at all. And the cancel confirm — a `window.confirm` — says the team "will move to per-session billing", a mode that no longer exists. Pause has no confirm at all.
Expected: One statement of what can be bought, and a confirm describing the true consequence (back to the free cap), in the product's own dialog.
Impact: The destructive action explains itself with a false consequence, so the admin cannot judge what they are agreeing to; and the page offers a purchase option that exists nowhere.
Evidence: `window.confirm('Cancel your subscription? Your team will move to per-session billing.')` against `<strong>Sessions are not charged for.</strong>`
Confidence: High

**ID: P5-089**
Severity: Minor
Axis: Experience
Location: `client/src/pages/billing/BillingPage.tsx:594-620` (BillingPage — plan ladder)
Observed: The pending guard is shared across the whole list — `disabled={createSubscriptionMut.isPending || changePlanMut.isPending}` — so pressing one plan disables all six and every one shows "...". Double submission is prevented, but which plan is being bought is lost. `PricingPage` does this correctly with `subscribingPlan`.
Expected: Per-row pending state.
Impact: Mid-flight the page cannot say what it is doing; the user's own choice is no longer visible.
Evidence: `{createSubscriptionMut.isPending || changePlanMut.isPending ? '...' : isSubscribed ? 'Switch' : 'Subscribe'}`
Confidence: High

**ID: P5-090**
Severity: Minor
Axis: Experience
Location: `client/src/pages/billing/BillingPage.tsx:247-252, 294-296, 720-731`; `PaymentPage.tsx:54-56` (Billing — Back and copy)
Observed: On both screens "Back" is a `div` with `onClick`, no role, no tabindex. `copyToClipboard` has no `.catch`, so a rejected write leaves the button reading "Copy" with nothing said, and the generated access-code panel has no aria-live.
Expected: Real `<button>`s (as `ApiAccessPage.tsx:138-144` uses), a copy failure message, and the result region announced.
Impact: Keyboard-only users cannot leave the billing screens by the affordance provided; a copy silently fails and the admin pastes stale clipboard content.
Evidence: `<div style={{ fontSize: 11, … cursor: 'pointer' }} onClick={() => navigate(...)}>Back</div>`
Confidence: High

**ID: P5-091**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/billing/BillingPage.tsx:338, 388`; `PricingPage.tsx:139, 186` (Billing — copy)
Observed: User-facing copy uses the banned word "account" repeatedly: "Everyone with an account here", "More people have accounts here than this plan covers", "Every person with a Groundwork account in your organisation counts toward your plan."
Expected: Say what the thing is — a person in the organisation — per the standing copy rule.
Impact: The rule is held everywhere else in the product and broken on the two screens a buyer reads most closely.
Evidence: `Every person with a Groundwork account in your organisation counts toward your plan.`
Confidence: High

---

## Screen 14 — AdminDashboardPage (admin usage)

**ID: P5-092**
Severity: Blocker
Axis: Data integrity
Location: `client/src/pages/admin/AdminDashboardPage.tsx:371-401` (AdminDashboardPage — Usage Breakdown)
Observed: The section footer prints "Total sessions" as the sum of `freeReasonBreakdown`, whose keys are ground-creation reasons (`FREE_TIER`, `FIRST_GROUND`, `ACCESS_CODE`, `paid`). It is a count of grounds relabelled as sessions, presented as a hard total.
Expected: The label to name what is counted — grounds created, by reason.
Impact: A wrong number presented as fact on the platform's own usage screen. The same check-in/session collision as P5-087, here producing a figure that is simply mislabelled, on the page used to judge how much the product is being used.
Evidence: `<span …>Total sessions</span>` over `const total = Object.values(breakdown).reduce((a, b) => a + b, 0)` where entries are `{ label: 'First check-in (legacy)', key: 'FIRST_GROUND' }`
Confidence: High

**ID: P5-093**
Severity: Major
Axis: Bug
Location: `client/src/pages/admin/AdminDashboardPage.tsx:941-952` (AdminDashboardPage — nav)
Observed: The button labelled "Ops →" navigates to `/admin`, and the one labelled "Our own system →" navigates to `/ops`. Per the two-back-offices split, `/admin` is the platform console and `/ops` is the team's own system — the first button's label names the second button's destination.
Expected: The first button labelled for the platform console.
Impact: Two adjacent buttons, one wrong label, both leading to consoles with real write powers.
Evidence: `onClick={() => navigate('/admin')} … >Ops →</button>` immediately followed by `onClick={() => navigate('/ops')} … >Our own system →</button>`
Confidence: High

**ID: P5-094**
Severity: Major
Axis: Experience
Location: `client/src/pages/admin/AdminDashboardPage.tsx:657-658` (AdminDashboardPage — WritersSection)
Observed: `if (isLoading || !data) return null` — the section renders nothing on load and nothing on error. A failed writers fetch is indistinguishable from "no writers flagged", on a section whose whole purpose is spotting subsystems that never fire.
Expected: A loading line and an error line, as every sibling section has.
Impact: Silent absence of a health check reads as a clean bill of health — the precise inversion of what the section is for.
Evidence: `const { data, isLoading } = useQuery({...}); if (isLoading || !data) return null`
Confidence: High

**ID: P5-095**
Severity: Major
Axis: Experience
Location: `client/src/pages/admin/AdminDashboardPage.tsx:546-547, 620-636` (AdminDashboardPage — add platform admin)
Observed: The add-admin submit has no in-flight guard — `handleSubmit` only sets `showOtp` — and the OTP modal's `onClose` fires after `onConfirm` resolves *or* after Cancel, clearing the email either way. Nothing surfaces whether the promotion happened; the only confirmation is a row appearing.
Expected: A stated success, and the form kept until it is confirmed.
Impact: A permission grant completes with no confirmation, and a mis-clicked Cancel loses the typed address with no signal.
Evidence: `onClose={() => { setShowOtp(false); setEmail(''); admins.refetch() }}`
Confidence: High

**ID: P5-096**
Severity: Minor
Axis: Experience
Location: `client/src/pages/admin/AdminDashboardPage.tsx:197-217` (AdminDashboardPage — OtpModal)
Observed: Clicking the backdrop closes the modal with no Escape handler, no focus trap, and no `role="dialog"`/`aria-modal`. The OTP input autofocuses, but focus is not returned to the triggering button on close.
Expected: Dialog semantics and focus restore on the modal that gates every destructive platform action.
Impact: Screen-reader and keyboard users are dropped back to document start after confirming a code disable or an admin removal.
Evidence: `<div style={{ position: 'fixed', inset: 0, … }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>`
Confidence: High

**ID: P5-097**
Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/admin/AdminDashboardPage.tsx:267, 307, 371, 855` (AdminDashboardPage — section labels)
Observed: Headings mix registers — "Code Management", "Usage Breakdown", "Per-user Usage Patterns" beside plain-language ones written to the product's voice: "Who can reach this console", "The team's operating system". Table headers add a third ("Allow Create", "Days Left").
Expected: One voice, matching the plain-language rule.
Impact: The console reads as two products stitched together.
Evidence: `<div style={SL}>Per-user Usage Patterns</div>` next to `<div style={SL}>Who can reach this console</div>`
Confidence: High

**ID: P5-098**
Severity: Minor
Axis: Experience
Location: `client/src/pages/admin/AdminDashboardPage.tsx:314-321, 386-393, 862-869` (AdminDashboardPage — narrow viewport)
Observed: The three tables are wrapped in `overflowX: 'auto'` — correct — but every header cell is `whiteSpace: 'nowrap'` across 9 columns, and the Usage Breakdown rows carry `minWidth: 160` + `28` + `36` plus a flexing bar in a plain `display: flex` row *outside* any scroll container.
Expected: The breakdown rows to wrap or scroll like the tables do.
Impact: Horizontal page scroll on the one section not protected.
Evidence: `<div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{label}</div>` inside a plain flex row
Confidence: Medium

---

## Screen 15 — IntegrationsPage (the embedded panel / Connect API)

**ID: P5-099**
Severity: Blocker
Axis: Security
Location: `client/src/pages/org/IntegrationsPage.tsx:182-186, 543` (IntegrationsPage — revoke a key)
Observed: "Revoke" fires `revoke.mutate(c.clientId)` immediately on click. No confirmation, no undo, no `disabled={revoke.isPending}` — and it sits directly beside "Replace" in identical ghost styling at identical size, where Replace *is* guarded with `disabled={replace.isPending}` and carries an explanatory `title`. Revoking is irreversible: the secret is hashed at issue.
Expected: A confirm naming the key and what stops working, and visual separation from the non-destructive control beside it. The same file's WhatsApp remove (line 726) already uses `window.confirm`.
Impact: One stray click permanently kills a live integration; the customer's HR or CRM sync stops with no path back except issuing a new key and redeploying.
Evidence: `<button style={S.ghost} onClick={() => revoke.mutate(c.clientId)}>Revoke</button>` beside `<button style={S.ghost} disabled={replace.isPending} onClick={() => replace.mutate(c.clientId)} title="Issue a new secret …">Replace</button>`
Confidence: High

**ID: P5-100**
Severity: Blocker
Axis: Security
Location: `client/src/pages/org/IntegrationsPage.tsx:212-219, 686-689` (IntegrationsPage — rotate secret / remove endpoint)
Observed: "Rotate secret" invalidates the endpoint's current signing secret on a single unconfirmed click, and "Remove" deletes the endpoint the same way. Neither `rotate` nor `removeEndpoint` has an `onError` at all.
Expected: Confirmation on both, and a stated failure.
Impact: An accidental rotate silently breaks signature verification on the customer's live receiver, and a failed rotate looks identical to a successful one.
Evidence: `const rotate = useMutation({ mutationFn: integrationsApi.rotateSecret, onSuccess: r => { setFreshHookSecret(r.secret); … } })` — no `onError`
Confidence: High

**ID: P5-101**
Severity: Major
Axis: Experience
Location: `client/src/pages/org/IntegrationsPage.tsx:98-104, 313` (IntegrationsPage — access gating on load)
Observed: Every gated query is `enabled: isAdmin` with no loading branch, and the approved half renders on `approved = !!access.data?.approved`. While `access` is in flight `access.data` is undefined, so the page shows neither the request banner nor the keys. There is no `access.isError` branch either, so a failed read renders as "not approved" — and the request form itself requires `access.data`, so it does not render.
Expected: A loading state, and an error state saying the access status could not be read.
Impact: An approved customer's first paint denies them the page and then jumps; a failed read strands them with no way forward at all.
Evidence: `const approved = !!access.data?.approved` and `{access.data && !access.data.approved && (`
Confidence: High

**ID: P5-102**
Severity: Major
Axis: Bug
Location: `client/src/pages/org/IntegrationsPage.tsx:322-324` (IntegrationsPage — ask for access)
Observed: `askForAccess` sends `whatFor` with no minimum: `disabled={askForAccess.isPending || !acceptedTerms}` never checks that anything was written. An empty reason can be submitted.
Expected: The reason required, since the whole approval decision rests on it.
Impact: Blank requests reach the platform queue, where `ApiAccessPage.tsx:62` renders `{request.whatFor}` as the sole basis for the approve/refuse decision — an empty paragraph.
Evidence: `disabled={askForAccess.isPending || !acceptedTerms}` beside `<p …>{request.whatFor}</p>`
Confidence: High

**ID: P5-103**
Severity: Major
Axis: Experience
Location: `client/src/pages/org/IntegrationsPage.tsx:499-509` (IntegrationsPage — the one-time secret panel)
Observed: The panel holding the client id and the never-shown-again secret is a plain `div` with no `role="alert"`/`aria-live`, no focus move, and it is dismissed by "I have saved it" with no check that anything was copied. The value lives only in `useState`, so a remount loses it.
Expected: The region announced on appearance, and dismissal guarded — enabled only after a copy, or behind a "this cannot be shown again" confirm.
Impact: A screen-reader user is not told the credential appeared; any user can dismiss the only copy of it. (The value is correctly never persisted — that part is right.)
Evidence: `<div style={{ marginTop: 12, background: 'var(--gw-amber-bg)', … }}>` containing the secret in a `wordBreak: 'break-all'` mono div
Confidence: High

**ID: P5-104**
Severity: Major
Axis: Inconsistency
Location: `client/src/pages/org/IntegrationsPage.tsx:286-321` (IntegrationsPage — what it costs)
Observed: Three accounts of the commercial terms, one of them only in comments. The lede says "Your engineers get a key here for both"; a long retained comment describes a free-plan gate on `oauth/token`; the live banner says access is only "asked for". The page never states on screen whether using the API needs a plan.
Expected: One on-screen sentence saying what access costs.
Impact: An operations lead deciding whether to involve an engineer cannot find the commercial answer, which is the decision this page exists to support.
Evidence: banner "Sending data in needs to be asked for" against the comment "On the free plan you can read this whole page, issue a key, copy the secret and register a webhook - and the first thing that fails is the token exchange"
Confidence: Medium
Check needed: whether the token-exchange plan gate is still live in `the-api-is-a-paid-thing.ts`, or fully replaced by the approval gate.

**ID: P5-105**
Severity: Minor
Axis: Experience
Location: `client/src/pages/org/IntegrationsPage.tsx:220-226, 763-765` (IntegrationsPage — delivery log)
Observed: Every delivery row carries an always-enabled "Send again" with no `disabled={replay.isPending}` and no per-row pending state.
Expected: Per-row in-flight guard.
Impact: Duplicate webhook deliveries to a live external system, initiated by impatience.
Evidence: `<button style={S.ghost} onClick={() => replay.mutate(d.id)}>Send again</button>`
Confidence: High

**ID: P5-106**
Severity: Minor
Axis: Experience
Location: `client/src/pages/org/IntegrationsPage.tsx:137-140, 716-728` (IntegrationsPage — WhatsApp)
Observed: `toggleWa` and `disconnectWa` have no `onError`; `toggleWa` also has no `disabled`. Switching the org's WhatsApp channel off is service-affecting, with no confirm, and a failed toggle shows nothing — the pill simply does not change.
Expected: Error toasts on both, and the toggle disabled in flight.
Impact: An admin believes they turned the channel off when the call failed.
Evidence: `const toggleWa = useMutation({ mutationFn: (enabled: boolean) => integrationsApi.setWhatsappEnabled(enabled), onSuccess: () => qc.invalidateQueries(...) })`
Confidence: High

**ID: P5-107**
Severity: Minor
Axis: Experience
Location: `client/src/pages/org/IntegrationsPage.tsx:511, 754` (IntegrationsPage — keys list)
Observed: The keys list has no empty state — `(creds.data ?? []).map(...)` renders nothing when there are none, so a first-time approved admin sees the issue form and then blank space. The deliveries list on the same page does it right ("Nothing yet…"), as does `ApiAccessPage` ("Nobody is waiting.").
Expected: A one-line empty state under Keys, matching the pattern already used two sections below.
Impact: Minor disorientation for exactly the first-time user the page is written for.
Evidence: `{(creds.data ?? []).map(c => (` with no `.length === 0` branch, against `<div style={S.card}><p style={S.body}>Nothing yet...</p></div>`
Confidence: High

---

## The two leads, traced

**Lead (a) — "check-in" names both the engagement and one session.** It is not a wording slip in a few places; it runs the length of the product and reaches numbers and money.

- The navigation has already picked a side: `AppShell.tsx:43` labels `/grounds` "All check-ins", i.e. check-in = engagement, with a comment explaining the choice. So every *session*-sense use is the deviation.
- It breaks at the irreversible moment: ChatPage's confirm says "Ready to finish this check-in?" / "Finish check-in ✓" for one session, fourteen lines from "Open this check-in" → `/grounds/:id` (P5-050).
- It breaks at the label-vs-behaviour seam: SessionReportPage's "Open a follow-up check-in" navigates to `/grounds/new` → `/start`, a new engagement (P5-058). JoinPage's "Join and start my check-in →" sends an email (P5-036).
- It breaks inside single cards: the paywall says "continue your Check-in" and "unlimited check-ins" eight lines apart, under the title "Your session is complete." (P5-046). GroundAdminPage's `aria-label="Check-in cadence"` sits above "{n} sessions over {d} days" (P5-082). BoardPage's "Check-ins this phase" grid has `Session {n}` columns and a "from sessions" source line (P5-075).
- It reaches money and reporting: BillingPage's "Check-ins" stat counts grounds while the free cap says "N check-ins … with unlimited sessions" (P5-087), and AdminDashboardPage prints a count of grounds under the label "Total sessions" (P5-092). Those two are on opposite sides of the same ambiguity, so an admin comparing the two consoles gets contradictory figures for one thing.

**Lead (b) — the sign-up form messages an empty email but not a malformed one.** Three separate mechanisms produce it, so fixing the message alone will not close it.

1. **`AuthPage.tsx:272-289` — the false success.** `onError` handles `!status`, `>=500`, `429` and `409`, then falls through to `setLinkSent(true)`. A server 400 for a malformed address therefore renders "Check your email". This is worse than silence and is the Blocker (P5-016).
2. **No `noValidate` anywhere** (verified: zero occurrences in `AuthPage`, `JoinPage`, `InvitePage`). So on the forms that *are* forms, `type="email"` blocks submit natively and the user gets a browser bubble, not the page's `gw-er` — a different visual channel from the empty-field message, and on the create form the `autoFocus` is on the name field, so the bubble can point off-screen.
3. **`EntryChatPage.tsx:3491` — no form at all.** The save email input is not wrapped in a `<form>` and the button is a plain `onClick`, so the native constraint never runs and the only check is `includes('@')` (P5-003). `"a@"` is accepted and emailed.

The `includes('@')` test is the shared root: it is used in `AuthPage` (×3), `EntryChatPage`, `SaveCard` (×2), `JoinPage`, and `ReportPage:679`. In three of those (P5-011, P5-064, and `JoinPage`'s disabled button) it produces a silent no-op rather than a message.

## Cross-cutting patterns worth one fix each

| Pattern | Screens | Findings |
|---|---|---|
| Error swallowed / success shown on failure | SaveCard, AuthPage, Pricing, GroundParticipantPage | P5-009, P5-016, P5-084, P5-044 |
| No in-flight guard on a submit | EntryChat, ChoosePassword, GroundAdmin ×5, ChatPage upload, Integrations replay | P5-001, P5-025, P5-077, P5-053, P5-105 |
| Primary action is a `div`/`span` or a bare glyph | EntryChat, ChatPage, GroundParticipant, AuthPage ×3, LinkSent, Billing ×2, Board | P5-004, P5-006, P5-047, P5-052, P5-019, P5-020, P5-071, P5-090 |
| No `aria-live` on async results | Almost everywhere — only 7 live regions exist in the whole SPA, and `gw-er` (the shared error class, 8 uses) has no role | P5-005, P5-021, P5-032, P5-039, P5-062, P5-068, P5-103 |
| Destructive action with no confirm | Integrations revoke/rotate, Board remove target, SaveCard Start over, ResolutionPanel commit, Billing pause | P5-099, P5-100, P5-071, P5-014, P5-049, P5-088 |
| A wrong number presented as fact | GroundParticipant `?? 6`, Board `currentSession`, Admin "Total sessions", EntryChat "Specificity" | P5-042, P5-070, P5-092, P5-002 |
| `navigator.clipboard?.…​.then` with no working failure path | SaveCard, SessionReport, Billing | P5-012, P5-059, P5-090 |

Reference patterns already in the codebase that the gaps should be fixed *toward*: `ReportPage.tsx:893-935` (error/empty), `GroundAdminPage.tsx:2957-2992` (destructive confirm), `ChatPage.tsx:1076-1109` (irreversible action), `PricingPage`'s `subscribingPlan` (per-row pending).

I wrote no files, and made no changes.
# Fix plan, part C — the client

Scope: every `P5-*` finding (107, `findings_pass5_screens.md`) and every `BR-*` finding
(20, `browser_findings.md`). 127 IDs, 20 batches. Nothing here touches the API except where
a batch says so explicitly and names the field it needs.

**Constraint held throughout: the screens are frozen.** Every batch below is a defect fixed in
place. No new page, no new route, no rearranged layout. Where a batch adds words to a screen,
the justification is written into the batch, and in every case it is either replacing a wrong
word or filling a labelled section that currently renders empty.

Everything below was read in the working tree before it was written down. Where the audit's
reading and the code disagree, the batch says so — three findings changed shape on verification
(P5-010 up, P5-087 and P5-091/BR-012 down, BR-008 mostly already fixed).

---

## Reference patterns, named once

Four places in this codebase already do the thing the rest should do. Batches say "match this"
and mean these:

| Pattern | Where | What it does |
|---|---|---|
| Error and empty states | `client/src/pages/report/ReportPage.tsx:893-935` | `whyYouCannotSeeThis(whatWentWrong(err))`, distinct "no ground" / "no report" / "being written" states, `canRetry` gates a real Try again button |
| Destructive confirm | `client/src/pages/grounds/GroundAdminPage.tsx:2957-2992` | two-step, names the object in quotes, distinct "Keep it" cancel, pending label, server refusal rendered inline |
| Irreversible action | `client/src/pages/chat/ChatPage.tsx:1076-1109` | consequences listed as `<li>` before the press, `disabled` while pending, settled post-state |
| Per-row pending | `client/src/pages/grounds/GroundAdminPage.tsx:1856` — `copyInviteLink.isPending && copyInviteLink.variables === p.id` | one row shows the spinner, the others stay live |
| A text control that is a control | `TextAction`, `client/src/pages/auth/AuthPage.tsx:40-53` | a `<button>` styled as underlined text, with the comment explaining why a `<span onClick>` is not one |

`TextAction` is currently a private function inside `AuthPage.tsx`. Batch 9 lifts it, unchanged,
into `client/src/components/gw/kit.tsx`, which already exports `Sec`, `Card`, `Pill`, `Stat`,
`btn`, `miniBtn`, `btnGhost` and is the right home.

---

## The decision on "check-in" and "session"

Not a list of sites. A decision, then the rename.

**check-in = the whole engagement.** The thing with a label, a lead, a brief, a roster and N
sessions. In the database this is `Ground` (`api/prisma/schema.prisma:766`).

**session = one round, one person, one sitting.** In the database this is `CheckIn`
(`api/prisma/schema.prisma:1177`, keyed `@@unique([participantId, sessionNumber])`).

**ground is internal.** It never appears in copy a customer or a participant reads.

Two things already decided this, and neither is being reopened:

1. **The navigation.** `components/gw/AppShell.tsx:43` is `label: 'All check-ins'` pointing at
   `/grounds`, and `components/gw/two-things-called-check-ins.spec.ts` locks it with a comment
   explaining the choice. So *check-in = engagement* is the standing rule and every
   session-sense use of the word is the deviation, not the other way round.
2. **The database.** `Ground` holds the engagement and `CheckIn` holds the per-person-per-session
   row. The table names are internal and stay; renaming a Prisma model is not a copy fix and
   would touch the whole API. The rule is only that no *user-facing string* may call a `CheckIn`
   row a "check-in".

The URL `/checkin/:id` is a session and so contradicts the rule. It is not read copy, changing it
breaks emailed links, and the screens are frozen. It stays. No screen prints the word from it.

### Two things verification changed

- **P5-087 mostly dissolves.** `BillingPage.tsx:346` labels `usage.checkIns` "Check-ins" where the
  service computes `checkIns: everyGround` — under the rule above that label is *correct*, as is
  "Your first N check-ins are free … with unlimited sessions". The collision was never on the
  billing screen; it was `ChatPage` calling one session a check-in at the moment of closing it.
  Fix `ChatPage` (below) and the billing copy is already right. What remains of P5-087 is one
  line: `AdminDashboardPage.tsx:371` prints a count of grounds under "Total sessions", which is
  the same word pointing the other way (handled in Batch 4).
- **P5-091 and BR-012 are refused.** `components/gw/account-is-not-the-word.spec.ts` states the
  rule as decided: what is banned is the *sense* ("everybody's accounts", "accounts side by
  side") and not the string, and it names "Create your account", "already have an account" and
  "everyone with a Groundwork account counts toward your plan" as correct and staying. The
  billing and sign-up strings both findings flag are that login sense. Changing them breaks a
  written decision. See Batch 18.

### The rename, every affected string

Verified present in the tree. `keep` means the string is already on the right side of the rule
and is listed so nobody "fixes" it later.

| File | Now | Becomes |
|---|---|---|
| `components/gw/AppShell.tsx:43` | `All check-ins` → `/grounds` | keep — this is the anchor |
| `pages/home/SaveCard.tsx:79` | `Session 1 is on record.` | keep |
| `pages/home/SaveCard.tsx:84` | `Your check-in is saved.` | `This session is saved.` |
| `pages/home/SaveCard.tsx:187` | `Your first session is on record.` | keep |
| `pages/home/SaveCard.tsx:265` | `Add their email and we will send them an invite once you have saved.` | keep |
| `pages/home/SaveCard.tsx:270` | `Saved. They will receive an invite once you have saved.` | `Added. They will be invited when you confirm your email.` |
| `pages/auth/AuthPage.tsx:620` | `One check-in each.` | `One session each.` |
| `pages/invite/InvitePage.tsx:143` | `You have already joined this check-in` | keep |
| `pages/invite/InvitePage.tsx:189` | `A Groundwork session about:` | keep |
| `pages/invite/InvitePage.tsx:345` | `Setting up your session…` | keep |
| `pages/invite/InvitePage.tsx:350-356` | `add to your record` / `your contribution record belongs to you` | keep |
| `pages/join/JoinPage.tsx:133` | `Join and start my check-in →` | `Email me my link` |
| `pages/join/JoinPage.tsx:133` | pending `Setting up your session…` | `Sending…` |
| `pages/join/JoinConfirmPage.tsx:62` | `Starting your check-in…` | `Starting your session…` |
| `pages/chat/ChatPage.tsx:972` | `Complete session ✓` | keep |
| `pages/chat/ChatPage.tsx:979` | `Ready to finish this check-in?` | `Ready to finish this session?` |
| `pages/chat/ChatPage.tsx:1003` | `Finish check-in ✓` | `Finish session ✓` |
| `pages/chat/ChatPage.tsx:1038` | `Not seeing a wrap-up? Complete session` | keep |
| `pages/chat/ChatPage.tsx:1166` | `Open this check-in` → `/grounds/:id` | keep |
| `pages/chat/ChatPage.tsx:1171` | `← Back to check-ins` → `/grounds` | keep |
| `pages/report/SessionReportPage.tsx:428` | `Open a follow-up check-in` → `/grounds/new` | `Start a new check-in` (see Batch 8 — the destination is a new engagement, so the label moves to the behaviour, not the reverse) |
| `pages/grounds/GroundParticipantPage.tsx:787` | `Add another free session and continue your Check-in.` | `…and continue this check-in.` |
| `pages/grounds/GroundParticipantPage.tsx:795` | `Unlock unlimited check-ins and unlimited sessions` | keep |
| `pages/grounds/GroundParticipantPage.tsx:845` | `Your initiator has been notified.` | `Whoever runs this check-in has been notified.` |
| `components/PostSessionPanel.tsx:44-88` | the same three strings, duplicated | same three edits, or lift the block — see Batch 8 |
| `pages/grounds/GroundAdminPage.tsx:594` | `aria-label="Check-in cadence"` | `aria-label="Session cadence"` |
| `pages/grounds/GroundAdminPage.tsx:596` | `… will do their final check-in.` | `… will do their final session.` |
| `pages/grounds/GroundAdminPage.tsx:763` | `{n} people are on the check-in` | keep |
| `pages/board/BoardPage.tsx:703` | `Sec title="Check-ins this phase"` | `Sessions this phase` |
| `pages/board/BoardPage.tsx:703` | `src="from sessions"` | keep |
| `pages/board/BoardPage.tsx:709` | column headers `Session {s}` | keep |
| `pages/billing/BillingPage.tsx:346` | `label="Check-ins"` over `usage.checkIns` (= grounds) | keep — correct under the rule |
| `pages/billing/BillingPage.tsx:461` | `Create up to {n} check-ins with unlimited sessions and reports` | keep |
| `pages/admin/AdminPage.tsx:715` | `Check-ins completed` (counts sessions) | `Sessions completed` |
| `pages/admin/AdminPage.tsx:716` | `Check-ins created` (counts grounds) | keep |
| `pages/admin/AdminPage.tsx:722` | `Check-ins - last 14 days` (counts sessions) | `Sessions - last 14 days` |
| `pages/admin/AdminPage.tsx:727` | `title={\`${count} check-in…\`}` | `session` / `sessions` |
| `pages/admin/AdminPage.tsx:747` event labels | `Check In Completed`, `Ground Created` | `Session completed`, `Check-in created` — map in `fmt()`, do not rename the event keys |
| `pages/admin/AdminDashboardPage.tsx:371` | `Total sessions` (sums ground-creation reasons) | `Check-ins created` |
| `pages/admin/AdminDashboardPage.tsx:374` | `First check-in (legacy)` | keep |

---

# The batches

Ordered by user harm, then blast radius, then effort.

---

## Batch 1 — A failure must never render the success screen

**Closes:** P5-009, P5-010, P5-016, P5-044, P5-079, P5-080, P5-084, P5-094, P5-101, P5-106

**The change.**

- `pages/home/SaveCard.tsx:55-71` — `onError` is byte-for-byte identical to `onSuccess`
  (verified). Delete the body. On failure: stay on the card, keep the typed email, set
  `emailError` to "That did not save — nothing has been sent. Try again.", and leave the button
  live. The two `sessionStorage`/`localStorage` writes and the `navigate('/auth/sent')` belong to
  `onSuccess` only.
- `pages/home/SaveCard.tsx:18` — **this one got worse on verification.** `VITE_APP_URL` is
  referenced in exactly one place in the whole client and is set in neither `client/.env` nor
  `client/.env.example`. So `inviteUrl` is *always* `/invite?token=…` with no origin, in every
  environment, today. Every invite link copied off this card is unopenable. Change the constant
  to `import.meta.env.VITE_APP_URL ?? window.location.origin` and add `VITE_APP_URL=` to
  `.env.example` with a comment. Treat this as a Blocker, not the Major the audit filed.
- `pages/auth/AuthPage.tsx:264-290` — `createAccount.onError` handles `!status`, `>=500`, `429`,
  `409` and then falls through to `setLinkSent(true)`. The fall-through is *deliberate and right*
  on `sendLink` (the sign-in door, where a 4xx would be an enumeration oracle) and *wrong* on
  `createAccount`, where the person has just told us they are new. Replace the final
  `setLinkSent(true)` in `createAccount.onError` only with
  `setError('That address was not accepted. Check it and try again.')` — a shape complaint, which
  leaks nothing. Leave `sendLink.onError` exactly as it is, and add a comment saying why the two
  differ, because otherwise someone will "make them consistent".
- `pages/billing/PricingPage.tsx:52-58` — `subscribeMut` has no `onError` key at all (verified).
  Add `onError: () => { setSubscribingPlan(null); toast.error('Could not start checkout. Try
  again.') }`, matching `BillingPage`'s existing wording. Clearing `subscribingPlan` is half the
  fix: without it the row stays stuck.
- `pages/grounds/GroundParticipantPage.tsx:176-179` — `createSubscriptionMut.onSuccess` redirects
  only `if (r.checkoutUrl)`. Add the else: `toast.error('Checkout did not open. Try again, or
  email hello@myground.work.')`.
- `pages/grounds/GroundAdminPage.tsx:585-590, 601-605` — `remind` and `dismissRequest` have
  `onSuccess` and no `onError` (verified). Add `onError` toasts matching `closingSession`'s
  wording immediately above them ("The reminder did not go out — nobody has been emailed. Try
  again.").
- `pages/grounds/GroundAdminPage.tsx:2506-2513` — `inviteTheQueue.onSuccess` calls
  `setQueuedToAdd([])` before reporting per-person failures. Set the queue to the failed rows
  instead of `[]`, so the retry is in place: `setQueuedToAdd(failed.map(f => f.email))`.
- `pages/admin/AdminDashboardPage.tsx:657-658` — `WritersSection` is
  `if (isLoading || !data) return null`. A health check that renders nothing on failure reads as
  a clean bill of health. Split: loading → one muted line; `error` → one line saying the check
  could not run. Both inside the existing `C` card, no new section.
- `pages/org/IntegrationsPage.tsx:98-104, 313` — `const approved = !!access.data?.approved` with
  no loading and no error branch. Add both, above the existing render: `access.isLoading` → a
  muted line; `access.isError` → "We could not read whether your organisation has access. Reload,
  or email hello@myground.work." The request form is gated on `access.data`, so a failed read
  currently strands the customer with nothing.
- `pages/org/IntegrationsPage.tsx:137-140` — `toggleWa` and `disconnectWa` have no `onError`
  (verified). Add them, matching `connectWa`'s `(e: any) => toast.error(e?.response?.data?.message
  ?? '…')` shape three lines above.

**Shared helper?** No. These are ten independent mutation definitions with different right
answers; a wrapper that forced one message on all of them would produce the generic toast that
Batch 7 is about removing. The shared thing already exists and is a rule, not a function.

**Spec:** `client/src/pages/a-failure-is-never-a-success.spec.ts` — a source-level sweep, in the
style of `account-is-not-the-word.spec.ts`: for every `useMutation(` in `pages/` and
`components/`, assert the object literal contains an `onError` key, with an explicit allowlist of
the mutations that are deliberately silent and a comment for each. Plus a rendering test on
`SaveCard` that a rejected `entrySave` leaves the card mounted and does not navigate.

**Effort:** day. **Risk:** low. Every change is additive except the `SaveCard` `onError` deletion
and the `AuthPage` fall-through, and both are narrow. The `VITE_APP_URL` fallback is the only one
that changes behaviour in a working path, and it changes it from broken to working.

---

## Batch 2 — One email test, and no button that silently does nothing

**Closes:** P5-003, P5-011, P5-037, P5-064, P5-102, BR-010

**The change.** `includes('@')` is the shared root, verified in `AuthPage` (×4: `submitPassword`,
`submitLink`, the create form's inline `onSubmit`, the forgot form's inline `onSubmit`),
`EntryChatPage:2090`, `SaveCard:146` and `:167`, `JoinPage:52`, and `ReportPage:679`. In four of
those it produces a *silent return* rather than a message.

- Add `client/src/components/gw/an-address-that-can-receive-mail.ts` exporting
  `looksLikeAnAddress(value: string): boolean` — one regex, `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`,
  and nothing else. This is the one place a shared helper is clearly right: nine call sites, one
  rule, and the current disagreement between them is the finding.
- Replace all nine call sites. `"a@"`, `"@"` and `"me@ @"` currently pass at every one of them.
- **BR-010 is the native-validation half.** `AuthPage`'s create form is a real `<form>` with
  `type="email"` and no `noValidate` anywhere in the file (verified: zero occurrences). So a
  malformed value is blocked by the browser before `onSubmit` runs — no request, no message from
  the page, and on the create form `autoFocus` is on the *name* field so the browser's own bubble
  can point at a field the person has scrolled past. Add `noValidate` to every `<form>` in
  `AuthPage.tsx`, `JoinPage.tsx` and `ChoosePasswordPage.tsx` (Batch 13 adds the form there) so
  the page's own `gw-er` message is the only channel, and it is the same channel as the empty
  case.
- `EntryChatPage.tsx:3491` — the save email input is not inside a `<form>` at all. Wrap it, with
  `noValidate`, `onSubmit={handleSave}`, and the button as `type="submit"`. This also fixes the
  Enter-key path, which currently calls `handleSave` directly.
- `SaveCard.tsx:166-174` — `addParticipant` returns silently on a bad address *and* silently
  again when `entryStorage.load()` is null, because `setParticipantAdded(true)` sits inside
  `if (session)`. Give it a `participantError` state: bad address → "That address does not look
  right."; no session → "Nothing to attach this to — reload and try again." Also: it writes a
  single scalar `participantEmail`, so a second person overwrites the first with no sign. Under
  the freeze, do not add a list — say the limit: change the section copy to "Add one person now;
  you can add the rest once you have saved." (justification: the alternative is silent data loss).
- `ReportPage.tsx:679-690` — the same silent `if (!email.trim().includes('@')) return`. Show the
  message; the button already has a disabled state for pending, so add the validation message
  rather than disabling on invalid, so the person can see *why*.
- `JoinPage.tsx:51-53, 132-134` — the button is `disabled` until both email and "Your part in
  this" are filled, and nothing says which is holding it. 205 of 223 people skipped the role
  field. Enable the button; validate on submit; name the missing field ("Say what your part in
  this is — it is what the questions are built from."). Do not add an asterisk: the file's comment
  says the copy already explains why the field is asked, and that decision stands.
- `IntegrationsPage.tsx:322-324` — `askForAccess` is gated only on `acceptedTerms`, so an empty
  `whatFor` reaches the platform queue where `ApiAccessPage.tsx:62` renders it as the sole basis
  for approve/refuse. Add `|| whatFor.trim().length < 20` to the `disabled` expression and put the
  reason in the existing hint line under the textarea.

**Spec:** `client/src/components/gw/one-test-for-an-address.spec.ts` — asserts
`looksLikeAnAddress` rejects `a@`, `@`, `me@ @`, `a@b`, and accepts `a@b.co`; then greps
`pages/` and `components/` and asserts `includes('@')` appears zero times outside the helper.
Plus `client/src/pages/no-button-does-nothing.spec.tsx` — for `SaveCard`'s Add, `ReportPage`'s
Add them, and `JoinPage`'s submit, render, press with a malformed address, assert a message is on
screen.

**Effort:** day. **Risk:** low-medium. The regex is stricter than `includes('@')`, so an address
that used to be accepted can now be refused — that is the point, but it means the regex must not
be clever. Keep it to the one written above; no TLD list, no length caps.

---

## Batch 3 — A destructive action asks first

**Closes:** P5-014, P5-049, P5-071, P5-088, P5-099, P5-100

**The change.** Match `GroundAdminPage.tsx:2957-2992` in every case: an inline two-step confirm
that names the object, a distinct "Keep it"-shaped cancel, a pending label, and the server's
refusal rendered inline. Not `window.confirm` — the one existing `window.confirm`
(`BillingPage.tsx:432`) is itself a finding here.

- `pages/org/IntegrationsPage.tsx:182-186, 543` — Revoke fires `revoke.mutate(c.clientId)`
  immediately, has no `disabled={revoke.isPending}`, and sits in identical `S.ghost` styling
  beside Replace, which *is* guarded. The secret is hashed at issue, so this is irreversible.
  Add the two-step confirm naming the key ("Revoke \"{c.name}\"? Anything using it stops
  working immediately, and it cannot be brought back.") and give the revoke button
  `color: 'var(--gw-red-t)'` so it is not visually identical to the non-destructive control
  beside it. That is a colour change on one existing button, not a redesign.
- `pages/org/IntegrationsPage.tsx:212-219, 686-689` — `rotate` and `removeEndpoint` both fire on
  one click and **neither has an `onError`** (verified). Add the confirm to both, and add
  `onError` toasts: a failed rotate currently looks identical to a successful one, which is worse
  than the missing confirm.
- `pages/board/BoardPage.tsx:486-492` — the remove-target control's entire visible label is `x`,
  the explanation is in a `title`, and it fires `removeObjective.mutate(o.id)` with no confirm.
  Add the confirm naming the target, and `aria-label={\`Remove target: ${o.name}\`}` (the
  accessible-name half of this is Batch 9's rule, applied here because the same line is being
  edited).
- `components/gw/ResolutionPanel.tsx:71` — `onClick={() => picked && proposeMut.mutate(picked)}`,
  where the options include ending the engagement. Match `ChatPage.tsx:1076-1109`: list the
  consequences, then the press. This is the way an engagement ends and it is currently one click.
  (The `if (isLoading || error || !data) return null` half of P5-049 is Batch 7.)
- `pages/billing/BillingPage.tsx:432` — `window.confirm('Cancel your subscription? Your team will
  move to per-session billing.')`. Per-session billing does not exist —
  `PaymentPage.tsx:76-86` says "Sessions are not charged for." The confirm describes a false
  consequence. Replace with the product's own inline confirm saying the true one: back to the free
  cap. And **Pause has no confirm at all** — give it the same treatment.
- `pages/home/SaveCard.tsx:293-300` — "Start over" is a bare `<button onClick={onClear}>`
  discarding the whole anonymous conversation and report. `EntryChatPage` confirms the identical
  action in all three of its placements (P5-008) with "This throws away this session and
  everything in it." Use that exact sentence — it is already written and already approved.

**Shared helper?** Yes, and a small one:
`client/src/components/gw/a-second-press-before-it-is-gone.tsx`, exporting
`useAreYouSure()` returning `{ armed, arm, disarm }` plus a `<Confirm>` render prop. Six call
sites with the same two-step shape justifies it. It must *not* own the copy — every confirm above
names its own object, and a generic "Are you sure?" is the thing being replaced.

**Spec:** `client/src/components/gw/nothing-irreversible-happens-on-one-press.spec.tsx` — render
each of the six, press the destructive control once, assert the mutation did **not** fire and a
confirm is on screen; press the confirm, assert it fired once.

**Effort:** day. **Risk:** low. Additive. The only care point is `ResolutionPanel`, where the
confirm must not fire for the lead-decides case differently from the party case — read
`ResolutionPanel.leadDecides.spec.tsx` before touching it.

---

## Batch 4 — Numbers printed as fact that are not measurements

**Closes:** P5-002, P5-042, P5-048, P5-066, P5-070, P5-092, BR-003, BR-014

**The change.** Five of these print a number the code itself knows is a guess. The rule: when the
denominator is unknown, print the numerator alone; when the label and the count disagree, change
the label.

- `pages/grounds/GroundParticipantPage.tsx:360-370` — `plannedSessionsFor(...) ?? 6`, sitting
  directly under a comment naming the hardcoded 6 as the bug being fixed (verified verbatim).
  Drop the `?? 6`. Let `totalSessions` be `number | null`. Header prints `Session {n}` with no
  total when null. **This is not cosmetic:** the same value gates the resolution panel
  (`MyRecord.tsx:80`, `completedCount >= totalSessions - 1`), so a fabricated 6 also decides when
  someone is offered the way to end the engagement — when null, that gate must be closed, not
  guessed open.
- `pages/grounds/GroundParticipantPage.tsx:456-458` — the header prints
  `Session {min(completed+1, total)} of {total}` unconditionally, ignoring `opensLater`, which is
  derived four lines above precisely to distinguish "open" from "due". When `opensLater`, print
  the date the next session opens instead of numbering one as current — the page's Check-in tab
  already computes and shows that date, so no new source is needed.
- `pages/board/BoardPage.tsx:253-259` — prints `session {b.phaseSpine.currentSession}`, the value
  the same file's exit gate 900 lines below refuses to use, with a comment saying why: it "is the
  highest session NUMBER any check-in row carries — and rows for the next session are created the
  moment one completes, so it runs ahead of the run." Count it the way the gate does: spine
  sessions whose state is done. `plannedSessionsFor` is already imported in this file.
- `pages/admin/AdminDashboardPage.tsx:371-401` — "Total sessions" sums `freeReasonBreakdown`,
  whose keys are `FREE_TIER`, `FIRST_GROUND`, `ACCESS_CODE`, `paid` — ground-creation reasons.
  Relabel to "Check-ins created" (see the rename table).
- `pages/admin/AdminPage.tsx:713-717` (BR-014) — the two panels disagree because they are counting
  different things under the same words: `totalCheckIns` is completed sessions, `groundsCreated`
  is grounds, and the event totals below are a third source. The client-side fix is the four
  relabels in the rename table, which makes "484 completed / 243 created" stop being
  arithmetically impossible. **The 484-vs-359 gap between the `check_ins` table and the
  `usage_events` count is not a client bug and is out of this slice** — it belongs in the API
  part of the plan, and this batch should not close BR-014 as "fixed" without that. Relabel here;
  flag the divergence there.
- `pages/report/ReportPage.tsx:1043-1050` — `oneSided` is `contributedParties < 2` (verified), so
  "The second is what makes it a comparison" prints on a four-person ground where three people
  are outstanding. Count the outstanding parties and say the number. And on line 1112, name the
  unit: "3 of 5 answered this session", because `sessionProgress` carries `sessionNumber` and the
  bare line reads as "3 of 5 have ever taken part".
- `pages/enter/EntryChatPage.tsx:3200-3207` — the "Specificity" meter is
  `turns < 4 ? 1 : turns < 8 ? 2 : …`, a turn count, under a tooltip asserting it measures "How
  concrete and specific your answers were", naming a four-value scale where the code emits five
  and never emits "Fair". A real specificity score exists in this codebase
  (`components/gw/how-checkable-was-that-session.ts`, `HowSpecificThisSessionWas.tsx`) but it is
  server-computed and is not available on the anonymous entry report. So: **do not invent a
  measurement.** Label the meter as what it counts — "Depth: {turns} exchanges" — and delete the
  tooltip. This is a deletion, not new explanatory text.
- `pages/enter/EntryChatPage.tsx:1663-1675` (BR-003) — the session count *is* traceable: it comes
  from `plannedSessionsFor(res.extracted.timelineDays, res.extracted.cadence)`. The card presents
  it as a settled fact and the button's own comment ("The engine does not yet extract cadence") is
  now false — delete that stale comment. Add the provenance to the existing chip's `title`, which
  already exists and currently says "Edit number of sessions": make it
  `"{n} sessions — from {timelineDays} days, {cadence}. Click to change."` No new element.

**Shared helper?** No. Four different wrong numbers with four different right answers.

**Spec:** `client/src/pages/a-number-is-a-measurement.spec.ts` — a grep asserting `?? 6` is gone
from `GroundParticipantPage`, that `phaseSpine.currentSession` appears nowhere in a rendered
string in `BoardPage`, and that the string "Total sessions" is gone from `AdminDashboardPage`.
Plus `client/src/pages/grounds/no-total-means-no-total.spec.tsx` — render the participant header
with `timelineDays` null and assert "of" does not appear.

**Effort:** day. **Risk:** medium — the highest of any batch here, because `totalSessions` going
`number | null` propagates into `MyRecord`, `WhatYourRecordCanSupport` and `MyParticipation`, and
each has to decide what null means. Do that deliberately, one file at a time; do not paper over
it with a second default.

---

## Batch 5 — The setup engine must use the person's own words

**Closes:** BR-001, BR-004, BR-006, BR-007

**The change.** BR-001 is the single worst finding in this slice and it is **mostly not a client
fix.** A tester described "a customer support lead hired six weeks ago who is not settling",
inside a six-month probation, and the product replied "This is a check-in for the PIP", then wrote
into the permanent record that she "is the subject of this Performance Improvement Plan" — against
her name, in the list of people it offers to email her about. A probation is not a PIP; a PIP is a
formal instrument that in several jurisdictions is a documented step toward dismissal. Nobody
typed those words.

Two defects, one on each side of the seam:

1. **Server, out of this slice, flagged as the dependency:** the classifier
   (`entryApi.classifyIntent` → the scenario resolver) maps an unsettled-new-hire description onto
   a `PIP` scenario key, and the report writer then expands that key into prose about the named
   person. That is where the reclassification happens and where it must stop. Part A/B of the
   plan owns it. Nothing in the client can fix it.
2. **Client, in this slice, and shippable independently:** the scenario *key* is being printed
   into user-facing copy. `EntryChatPage` renders the resolved scenario into the check-in's opening
   line ("This is a check-in for the PIP.") and into the record line ("That is the first thing
   that goes into your record for this PIP."). A scenario key is an internal identifier and must
   never reach a sentence. Every situation card has a human name
   (`components/gw/every-situation-card-has-a-name.spec.ts` already asserts this) — use that name,
   and where there is no card, use the person's own opening sentence.

Also in this batch, because they are the same seam:

- **BR-004** — the extractor silently kept "six weeks ago" over the later "three months into a
  six month probation" and showed the result as a settled About line. Users correct themselves
  mid-sentence. The client fix is small and inside the freeze: the summary card's About line
  already exists, so make it editable in place the way the session count already is
  (`EntryChatPage:2330-2350` is the pattern, in the same component). No new element; the same
  click-to-edit affordance one line up.
- **BR-006** — "What did you do, or not do, that helped get it here?" as the *second* question of
  session one. Turning the question on the lead is deliberate and is the product's point; landing
  it thirty seconds in, right after a misclassification, is what makes it read as an accusation.
  Prompt ordering, server-side. Recorded here, owned there. No client change.
- **BR-007** — all 22 situation cards describe a *start*; there is no card for something already
  underway that has not yet gone wrong. Free text is offered first and works, so nothing is
  blocked. Adding a 23rd card is content, not a screen change, and it is the cheapest thing in
  this batch. Ship it or don't, but do not build a new picker.

**Spec:** `client/src/pages/enter/a-scenario-key-is-not-a-word.spec.ts` — assert no rendered
template literal in `EntryChatPage.tsx` interpolates the raw `scenario` / `classifiedScenario`
value into a sentence, and that every scenario has a display name in the catalogue.

**Effort:** more than a day, and most of it is not here. Client half: half a day. Blocked on the
server classifier for the actual harm.

**Risk:** low for the client half. The batch's real risk is shipping the client half and calling
BR-001 closed — the record would stop *saying* PIP while still *being* classified as one.

---

## Batch 6 — One in-flight guard per submit

**Closes:** P5-001, P5-025, P5-053, P5-067, P5-073, P5-077, P5-089, P5-095, P5-105

**The change.** Two shapes. Guard the submit; and where a list shares one guard, make it per-row.

*Guard the submit:*

- `pages/enter/EntryChatPage.tsx:2077` — `handleSave` is async, posts the whole commit payload
  plus transcript, and has no in-flight flag; the button is disabled only for
  `generatingReport && !sessionReport`, and Enter in the email field calls it too. Its sibling
  `saveAsSignedInUser` already does this correctly with `savingAsUser` (line 1982, 3440-3443) —
  copy that exactly. A double press today fires two `entrySave` calls: two drafts, two emails, and
  the second `draftToken` overwrites the first in `localStorage`, so the earlier email's link
  points at a draft this browser will no longer patch.
- `pages/auth/ChoosePasswordPage.tsx:79-86` — `submit()` has no guard; the button is
  `disabled={save.isPending}` but the confirm field's `onKeyDown` is not and the input stays
  enabled. `if (save.isPending) return` as the first line. Against a single-use token the second
  call resolves as "invalid or expired link" and can overwrite the success state of someone who
  succeeded.
- `pages/chat/ChatPage.tsx:596-611` — `submitDocWithContext` and `submitPaste` fire the mutation
  then immediately close the sheet and clear the fields; neither commit button reads
  `uploadDoc.isPending`. Disable and relabel ("Adding…"), and keep the sheet up until success.
  Uploads on this path run a model assessment, so the silent gap is long.
- `pages/grounds/GroundAdminPage.tsx:2740, 2786, 2802, 2832` and the work-together radio —
  five Setup writes bypass `useMutation` and call `groundsApi.update(id!, …)` as a raw promise
  from `onClick` (verified at all four line numbers). They are disabled only by *value equality*,
  so a double-click before the response lands fires two identical PATCHes; the radio has no guard
  at all. Convert all five to `useMutation` with `isPending` disabling, matching every other
  writer on this page. Timeframe and cadence regenerate the session plan, so a double submit here
  reshapes the run twice.
- `pages/admin/AdminDashboardPage.tsx:546-547, 620-636` — the add-admin submit has no guard
  (`handleSubmit` only sets `showOtp`), and the OTP modal's `onClose` clears the email whether the
  promotion succeeded or the user pressed Cancel. Keep the form until success is confirmed; clear
  it in `onConfirm`'s success path only; say the promotion happened.
- `pages/org/IntegrationsPage.tsx:220-226, 763-765` — "Send again" on every delivery row is
  always enabled. Per-row guard; duplicate webhook deliveries land on a customer's live system.

*Per-row instead of one shared flag:*

- `pages/board/BoardPage.tsx:474-484` — `disabled={bumpObjective.isPending || …}` disables every
  objective row's `-`/`+` while any one is in flight, and rapid clicking queues round trips whose
  ordering is not guaranteed. Use `bumpObjective.variables?.objectiveId === o.id`.
- `pages/billing/BillingPage.tsx:594-620` — `disabled={createSubscriptionMut.isPending ||
  changePlanMut.isPending}` disables all six plans and shows "..." on every one, so mid-flight
  the page cannot say which plan is being bought. `PricingPage`'s `subscribingPlan` is the
  pattern; match it.
- `pages/report/ReportPage.tsx:224-243` — "It felt fair" / "It did not" are
  `disabled={submit.isPending}` but the labels and `cursor: 'pointer'` never change, so there is
  no in-flight signal. Add a pending label.

The per-row pattern to match in all three cases is `GroundAdminPage.tsx:1856`:
`copyInviteLink.isPending && copyInviteLink.variables === p.id`.

**Shared helper?** No — this is over-engineering. `useMutation` already carries `isPending` and
`variables`; the fix is using them. A wrapper hook would add indirection to nine one-line changes.

**Spec:** `client/src/pages/one-press-is-one-call.spec.tsx` — for `EntryChatPage`'s save,
`ChoosePasswordPage`'s submit and the five `GroundAdminPage` Setup writes: render, fire the
control twice in one tick, assert the API was called once. Plus
`client/src/pages/board/one-row-at-a-time.spec.tsx` for the three per-row cases.

**Effort:** day. **Risk:** low, except the `GroundAdminPage` conversion, which touches five
`onClick` bodies with existing `.then(invalidate).catch(toast)` chains — move those into
`onSuccess`/`onError` rather than leaving both.

---

## Batch 7 — Errors that say which of the things happened

**Closes:** P5-027, P5-030, P5-039, P5-041, P5-043, P5-061, P5-072

**The change.** These are not missing error paths (Batch 1) — they are error paths that collapse
several causes into one sentence, or into a toast that vanishes. Match
`ReportPage.tsx:893-935`, which is the strongest handling in the fifteen screens and already
exports the shape via `whatWentWrong` / `whyYouCannotSeeThis`.

- `pages/board/BoardPage.tsx:126-137` — one branch, `if (error || !data)`, renders "You may not be
  a party to this check-in, or it may no longer exist" with a single "Back to check-ins" button,
  and the query sets `retry: false`. So a single transient 500 permanently evicts a reader from
  their own board with a permission-flavoured accusation. Use `whyYouCannotSeeThis` and offer
  Try again where `canRetry`.
- `pages/report/SessionReportPage.tsx:140-159` — the block's own comment says "The status says
  which of the three things actually happened", and then the code collapses 403 and 404 into
  "This session is not yours to open". Split them: 404 gets "This session is no longer here" and
  a route back; only 403 accuses.
- `pages/grounds/GroundParticipantPage.tsx:126-141` — `probeSession`'s `mutationFn` carefully
  extracts the server's message (`throw new Error(res.data?.message ?? 'Could not start
  session.')`) and `onError` then throws it away for a fixed toast. `onError: (e) =>
  toast.error(e.message)`. One line. Every reason a session cannot start currently arrives as the
  same four words.
- `pages/invite/InvitePage.tsx:125-128` — the invited person is the one user who cannot fix
  anything themselves and has no other route in, and their single primary action's only failure
  surface is a toast that dismisses. Render the failure inline and persistently, and distinguish
  an expired token from a transport failure — the server sends a message; use it.
- `pages/join/JoinPage.tsx:64-72` — a failed join surfaces only as a toast while `phase` stays
  `'start'`, so the page is visually unchanged. The toast copy is good ("nobody has been emailed
  and nothing was added") — keep the words, move them inline.
- `pages/join/JoinConfirmPage.tsx:54-55` — renders `<LinkProblem kind="join" />` (whose generic
  body says join links are single use and expire) and *then* the specific server sentence
  underneath in smaller muted type. `LinkProblem` already takes a `detail` prop
  (`components/gw/LinkProblem.tsx:30`, verified) and `InvitePage:393-395` already passes it. Pass
  `detail={problem}` and delete the div.
- `pages/auth/ChoosePasswordPage.tsx:73-77` — renders the server message verbatim including the
  class-validator array shape (`Array.isArray(msg) ? msg[0]`). On the last screen of sign-up a
  person can meet a raw validator string. Map the three known cases — expired, already used,
  too weak — and keep the raw string only as the fallback.

**Shared helper?** Partly, and it already exists. `whatWentWrong` / `whyYouCannotSeeThis` are in
`ReportPage.tsx`; lift them to `client/src/components/gw/why-you-cannot-see-this.ts` unchanged so
`BoardPage` and `SessionReportPage` can import rather than re-derive. Do not generalise them
further.

**Spec:** `client/src/pages/an-error-says-which-one.spec.tsx` — for `BoardPage` and
`SessionReportPage`, mock a 500 and a 403 and assert the two renders differ and that only the 500
offers Try again.

**Effort:** day. **Risk:** low.

---

## Batch 8 — check-in and session: one word per object

**Closes:** P5-013, P5-024, P5-033, P5-036, P5-046, P5-050, P5-058, P5-075, P5-082, P5-087, BR-015

**The change.** Apply the rename table above, in full, in one commit. Three of the edits are more
than a word:

- `pages/chat/ChatPage.tsx:979, 1003` — this is the sharpest collision in the product: at the one
  irreversible moment on the screen, the confirm tells the person they are finishing the whole
  engagement, fourteen lines from "Open this check-in" → `/grounds/:id`. Both strings become
  "session".
- `pages/report/SessionReportPage.tsx:428-433` — "Open a follow-up check-in" navigates to
  `/grounds/new`, which `App.tsx:384` redirects to `/start`: a brand-new engagement. Label and
  behaviour disagree. Under the freeze, **move the label to the behaviour**, not the reverse:
  "Start a new check-in". Continuing *this* ground would be a new capability and this is a
  defect-fix pass.
- `pages/join/JoinPage.tsx:133` — "Join and start my check-in →" with pending "Setting up your
  session…", where the handler sends an email and moves to a "Check your email" state. The file's
  own comment explains the change ("the address gets a link and the link does the work"); the
  label was not updated with it. → "Email me my link" / "Sending…".
- `pages/grounds/GroundParticipantPage.tsx:783-798` and `components/PostSessionPanel.tsx:44-88`
  carry the paywall copy near-verbatim twice. Fix both, or lift the block into one component. The
  block is ~45 lines and is the screen where the product asks for money; lifting it is worth it,
  and it is not a redesign because the rendered output is unchanged.

**Shared helper?** No component. But add the vocabulary to the existing lock:
`components/gw/two-things-called-check-ins.spec.ts` currently asserts only the rail. Extend it —
see the spec below.

**Spec:** extend `client/src/components/gw/two-things-called-check-ins.spec.ts` (do not create a
second file; the rule already has a home). Add a source sweep over the files in the rename table
asserting that the session-sense strings are gone: no `Ready to finish this check-in`, no
`Finish check-in`, no `Starting your check-in`, no `final check-in`, no
`Check-ins this phase`, no `aria-label="Check-in cadence"`, no `Check-ins completed`. Each with
the comment saying which object it names.

**Effort:** half a day for the strings, plus half a day if the paywall block is lifted.
**Risk:** low. Copy only. The one thing to watch is that several of these strings are asserted in
existing specs (`who-is-in-this.spec.tsx`, `one-arrival.spec.ts`) — run the suite, not a
typecheck.

---

## Batch 9 — Every primary action is a control, and has a name

**Closes:** P5-004, P5-006, P5-019, P5-020, P5-047, P5-052, P5-065, P5-081, P5-090, BR-002

**The change.** Three shapes: a `div`/`span` that should be a `<button>`; a `<button>` whose only
content is a glyph; a `<button>` whose only meaning is in a `title`.

*Lift `TextAction` out of `AuthPage.tsx:40-53` into `components/gw/kit.tsx`, unchanged, and export
it.* It already carries the comment explaining why a `span onClick` is not a control. Then:

- `pages/auth/LinkSentPanel.tsx:64-77, 87-94` — "Send another link" and "Wrong address? Use a
  different one" are `<span onClick>`. The second is the *only* escape for a mistyped address on
  a dead-end screen. → `TextAction`. (The resend's missing `onError` is Batch 1's rule applied
  here on the same line: add it.)
- `pages/auth/AuthPage.tsx:584-589, 602-607` — two more "Back to sign in" spans, in the forgot
  and reset-sent views, which the `TextAction` fix at line 40 missed. → `TextAction`.
- `pages/enter/EntryChatPage.tsx:3531-3533` — "Not now", the only way out of a full-screen save
  card, is a `<div onClick>`. A keyboard user inside that overlay cannot dismiss it. → `<button>`.
- `pages/grounds/GroundParticipantPage.tsx:401` — `<span onClick={() => navigate('/grounds')}>←
  Check-ins</span>`, the page's only exit, four lines above a sibling that *is* a real button.
  → `<button>`.
- `pages/billing/BillingPage.tsx:247-252, 294-296` and `PaymentPage.tsx:54-56` — "Back" is a
  `div` with `onClick` on both screens. `ApiAccessPage.tsx:138-144` does it right. → `<button>`.
  (Its clipboard and aria-live halves are Batches 14 and 10.)
- `pages/enter/EntryChatPage.tsx:2938-2946, 3120-3125` and `pages/chat/ChatPage.tsx:1283-1292` —
  the send button in all three composers is a bare `↑` with no `aria-label`, no `title`, no text
  child. The neighbouring `+ Doc` button does carry a `title`. → `aria-label="Send message"` on
  all three.
- `pages/board/BoardPage.tsx:474-484` — the `-` and `+` count buttons need
  `aria-label={\`One fewer / one more: ${o.name}\`}`. (The `x` on the same row is Batch 3.)
- `pages/grounds/GroundAdminPage.tsx:1920-1946` — each roster session pip is a button whose entire
  content is a numeral with all meaning in `title`, and somebody else's session renders `disabled`
  with `cursor: 'default'` and no explanation. Add `aria-label={title}`, and give the disabled
  case a `title` saying why ("Only {name} can open their own session").
- `pages/report/ReportPage.tsx:1480-1494` — download buttons labelled only `Session {n}` under a
  bare "Download:" prefix, with the explanation in a `title`. Add
  `aria-label={\`Download your session ${n} record\`}`. `downloadRecord` also has `onError` and no
  `onSuccess` — nothing confirms a file was produced under a claim that the record is "portable
  and permanent". Add a success toast.
- `pages/enter/EntryChatPage.tsx:2373-2376` (BR-002) — the session-count chip's accessible name is
  "12sessions planned": number and word are separate `<span>`s separated only by a CSS margin, so
  the defect is invisible on screen and present in every text extraction. Put a space in the
  string, not in the CSS.

**Shared helper?** Only `TextAction`, lifted. The rest are attributes.

**Spec:** extend the existing `client/src/components/gw/an-icon-is-not-a-target.spec.ts` — it
already owns this rule. Add: for each file in this batch, assert no `<div onClick` or `<span
onClick` remains, and assert every `<button>` whose children are a single non-alphanumeric
character carries an `aria-label`.

**Effort:** half a day. **Risk:** very low. Attribute and element changes; `TextAction` is already
styled to render identically.

---

## Batch 10 — Anything asynchronous is announced

**Closes:** P5-005, P5-021, P5-032, P5-056, P5-062, P5-068, P5-074, P5-103

**The change.** Verified: the entire SPA contains **two** `aria-live` attributes, both in
`ReportPage.tsx` (lines 928 and 940). `EntryChatPage` — 4,000 lines carrying the whole anonymous
funnel — contains one `aria-` attribute in total.

- **`.gw-er` gets a role.** `client/src/index.css:454` defines it as a plain div style; it is used
  in 8 places (verified count) and none is announced. A CSS class cannot carry a role, so add
  `role="alert"` at the 8 call sites — `AuthPage.tsx:392, 491, 549, 580`, `SaveCard.tsx:120, 205`,
  `ChoosePasswordPage.tsx:173`, and the one in `EntryChatPage`. One attribute each. This is the
  single highest-value line in the batch: today a screen-reader user presses Sign in, focus stays
  on the button, and the failure is announced to nobody.
- `pages/enter/EntryChatPage.tsx:1414-1447, 2964, 3226-3232` — the streaming message list and the
  ~35-second report generation. `aria-live="polite"` on the `msgsRef` container and
  `role="status"` on the generating/failed region. This is the longest wait in the product and it
  is completely silent.
- `pages/chat/ChatPage.tsx` — the same on the message list, and on "Still reading what you wrote".
- `pages/chat/ChatPage.tsx:387-395, 766-768` (P5-056) — the transcript fetch sits behind
  `Math.random() * 2000` and "Opening your session…" renders only on `openSession.isPending`,
  which cannot be true until after that delay, so every arrival opens on up to two seconds of
  blank screen. Render the loading line from mount rather than from the mutation, and give it
  `role="status"`. Do not remove the jitter — it is there for a reason the file explains.
- `pages/invite/InvitePage.tsx:344-346, 397-401` — `role="status"` on "Loading invite…" and on the
  in-flight button state.
- `pages/report/SessionReportPage.tsx:136-138, 321-327` — `role="status" aria-live="polite"` on
  "Getting your report..." and the "Correct it" pending state, matching `ReportPage`'s own lines.
- `pages/report/ReportPage.tsx:1088-1094` — the "Picture forming — {completed} of {total}" banner
  polls every 5s and has no role, while the stale banner and waiting line 150 lines away both do.
  Two banners on one page behaving differently.
- `pages/board/BoardPage.tsx:126` — `role="status"` on "Loading the board…".
- `pages/org/IntegrationsPage.tsx:499-509` — the one-time secret panel is a plain div. It holds a
  credential that is never shown again. `role="alert"` and move focus into it on appearance.
  (Guarding its dismissal is Batch 3's rule; do it here on the same lines if convenient.)

**Shared helper?** No. `role="status"` is shorter than any wrapper that could add it, and a
`<Live>` component would obscure which region is live.

**Spec:** `client/src/components/gw/the-page-says-what-it-is-doing.spec.ts` — a source sweep:
every use of `className="gw-er"` carries `role="alert"`; every string matching
`/Loading|Getting your|Opening your|Setting up your/` in a rendered div sits on an element with
`role="status"`. Allowlist with reasons, as the other sweeps do.

**Effort:** half a day. **Risk:** very low. Pure attributes. The only judgement call is `polite`
vs `assertive`: use `polite` everywhere except `.gw-er`, which is `role="alert"`.

---

## Batch 11 — Arrival state seeded wrong

**Closes:** P5-017, P5-029, P5-035, P5-051, BR-011

**The change.** Five places where the client starts with a value it made up.

- `pages/join/JoinConfirmPage.tsx:33-43` — on success the auth store is seeded with a fabricated
  user: `email: ''`, `firstName: ''`, `lastName: ''`, `organizationId: ''`. Every surface reading
  those sees empty strings for this person's entire first session, and `organizationId: ''` is the
  exact stale-flag class that `InvitePage.tsx:80-90` documents (`RequireOrgSetup` bouncing people
  to org setup). `InvitePage` already does the right thing on its equivalent path — `await
  authApi.me()` then `setAuth(fresh, token)`, wrapped in try/catch with a comment saying failure
  is not fatal. Copy that block verbatim.
- `pages/chat/ChatPage.tsx:113-126` — `isInitiator` and `isFinalSession` are read only from
  `location.state`, four lines under a comment explaining that `sessionNumber` was fixed for
  exactly this reason: arriving by email, WhatsApp or bookmark leaves both `false`, so the amber
  "Closing session N · your final account · This is the last word on the record" warning silently
  does not render and the lead never sees `WhoIsStillOut`. Someone writes their final account
  without being told it is final.
  **Cross-slice dependency, verified:** `TranscriptResponse`
  (`client/src/api/conversation.ts:16`) carries only `{ status, sessionNumber, groundId }`. The
  client cannot correct these without two more fields — `isFinal` and `isInitiator` — on the
  transcript payload. The client change is four lines (mirroring line 442's
  `if (typeof t.checkIn?.sessionNumber === 'number') setSessionNumber(...)`); the API change is
  part A/B's. **Do not ship the client half alone** — it would be dead code.
- `pages/auth/AuthPage.tsx:160-164, 210` — `passwordlessNotice` is set on a failed sign-in and
  never cleared: not by editing the email, not the password, not by switching view. Every
  `onChange` clears `error` only. Someone told "we emailed you a link" for address A types
  address B and still reads a notice about a link sent elsewhere. Clear it wherever `error` is
  cleared — five `onChange` handlers and the three `setView` calls.
- `pages/auth/ChoosePasswordPage.tsx:63` — success is a silent
  `navigate(next, { replace: true })` to `/grounds?welcome=1` and nothing confirms the password
  was set. **Verify first** whether `/grounds?welcome=1` renders anything keyed on `welcome`; if
  it does, this is not a finding. If it does not, the fix is one line of confirmation on arrival,
  and the justification for adding words is that the only other way to learn whether the password
  saved is to sign out and try it.
- `pages/enter/EntryChatPage.tsx` + `stores/entry.ts` (BR-011) — verified root cause:
  `useEntryStore` is a plain zustand store with `sessions: 1` as its initial value and **no
  persistence**, while the conversation, situation and step position live in `entryStorage`
  (localStorage) and do survive. So after a reload the header silently drops from "12 sessions
  planned" to "1 session planned" — the number the person agreed to, replaced. `persistOnboarding`
  (`EntryChatPage.tsx:1355`) saves `scenario`, `history`, `onboardingStep`, `onboardingSelections`
  and nothing else. Add `sessions`, `cadence` and `timelineDays` to the persisted session and
  rehydrate them on mount. Whole-state or none: the rest of it already restores.

**Shared helper?** No.

**Spec:** `client/src/pages/enter/the-whole-setup-survives-a-reload.spec.ts` — write a session,
remount, assert `sessions` is the persisted value and not 1. Plus
`client/src/pages/join/a-joined-person-is-a-real-person.spec.tsx` — assert `authApi.me()` is
called before the navigate.

**Effort:** half a day for four of them; P5-051 waits on the API field.
**Risk:** low. The `passwordlessNotice` clearing is the only one with a chance of clearing a
notice someone still needed — it is cleared on *input*, so it cannot vanish unprompted.

---

## Batch 12 — The button goes where it says

**Closes:** P5-018, P5-028, P5-031, P5-034, P5-055, P5-078, P5-086, P5-093

**The change.** Eight wrong destinations, most of them one line.

- `pages/admin/AdminDashboardPage.tsx:941-952` — the button labelled "Ops →" navigates to
  `/admin` and the one labelled "Our own system →" navigates to `/ops`. Per the two-back-offices
  split, `/admin` is the platform console and `/ops` is the team's own system, so the first
  button's label names the second button's destination. Two adjacent buttons, both leading to
  consoles with real write powers. Relabel the first "Platform console →".
- `pages/billing/BillingPage.tsx:630-635` — the Enterprise "Contact" mailto is addressed to
  `user?.email` — the admin emails themselves — while `PricingPage.tsx:175` uses
  `hello@myground.work` correctly. The highest-value lead path on the page dead-ends in the
  customer's own inbox. One word.
- `pages/auth/AuthPage.tsx:120-134, 191` — `nextPath` is read from `?next=`/`?from=` and used in
  exactly one place, `signIn.onSuccess`. The link and create flows never forward it, so a
  `?next=/pricing` visitor who creates an account lands on `/grounds?welcome=1` — the exact
  complaint the file's own comment describes as fixed. Thread `next` through `entrySave`'s payload
  so the magic-link handler can honour it. Keep the existing same-origin guard; it is the reason
  this is not an open redirect.
- `pages/auth/ChoosePasswordPage.tsx:106-117` — the no-token exit is
  `navigate('/auth')`, whose `defaultView` is the *password* sign-in form
  (`AuthPage.tsx:145`). Somebody whose link lost its token is sent to a form asking for the
  password they came here to create. → `/auth?mode=member`, which resolves to the link view.
- `pages/invite/InvitePage.tsx:158-183` — the "already joined" state has two `className="gw-btn"`
  buttons of identical primary weight separated by "or", and the second, "Sign in to continue →",
  calls `navigate('/grounds')` — a protected route, not the sign-in page. → `/auth`, and make it
  the secondary style.
- `pages/invite/InvitePage.tsx:364-370` — "Not right now" navigates to `/`, which for a signed-out
  invitee bounces to the marketing site, immediately after a paragraph promising declining is
  never shown as a negative. **Verify `RootRoute` in `App.tsx` first.** If it does bounce, the fix
  is a short settled state on this page saying the decline was recorded and nothing else happens
  — justified because ejecting someone from the product is currently indistinguishable from a
  crash.
- `pages/chat/ChatPage.tsx:576-583, 1252-1258` — the Upload control is a `<label
  htmlFor="doc-upload">` styled as disabled when `groundId` is missing, but a label cannot be
  disabled: clicking still opens the picker and `handleFileChange` then returns silently on
  `if (!f || !groundId) return`. The person picks a file, the dialog closes, nothing happens.
  Hide the control when `groundId` is missing.
- `pages/grounds/GroundAdminPage.tsx:2929-2944` — "Close this check-in" is hard-coded `disabled`
  with `cursor: 'not-allowed'`, under a fold titled "Ending it", a heading "Close check-in" and a
  full irreversibility warning; the only working route is a `mailto:` presented as a footnote. A
  permanently disabled primary control is scaffolding, not a state. Delete the button and promote
  the mail route to the fold's action. Deleting a control is inside the freeze; shipping self-serve
  close is not.

**Shared helper?** No.

**Spec:** extend `client/src/components/gw/the-way-home-and-the-way-out.spec.ts`, which already
owns exits. Add: no `navigate('/grounds')` behind a control labelled "Sign in"; no `mailto:` built
from `user?.email`; no `disabled` literal on a `gw-btn`-weight control.

**Effort:** half a day, except `next` threading (P5-018), which is half a day on its own because
it crosses the magic-link handler. **Risk:** low, except P5-018 — keep the same-origin guard and
do not let `next` reach the server unvalidated.

---

## Batch 13 — Forms behave like forms

**Closes:** P5-007, P5-015, P5-022, P5-023, P5-026, P5-038, P5-054, BR-008

**The change.**

- `pages/auth/ChoosePasswordPage.tsx:144-177` — there is no `<form>`. Enter submits only from the
  confirm field; pressing Enter in the password field — which has `autoFocus`, so it is where
  everyone starts — does nothing at all, on the last screen of sign-up. Wrap in
  `<form onSubmit noValidate>`.
- `pages/board/BoardPage.tsx:1023-1047` — the poll form is not a `<form>`, so Enter in the
  question input does nothing, and Cancel discards the typed question and every option with no
  warning. Wrap it; and make Cancel confirm when anything has been typed.
- `pages/auth/AuthPage.tsx:534-543, 565-575` — the link and forgot views render
  `<label className="gw-label">Email</label>` with no `htmlFor` and an input with no `id`, while
  the password and create views do it correctly in the same file. Give both an `id`.
- `pages/auth/*`, `pages/join/JoinPage.tsx:120` — verified: no `autoComplete` attribute exists
  anywhere in the auth, join or password flow (the only four in `pages/` are on `TalkToUsPage` and
  an OTP field in `ops/`). Add `autoComplete="email"`, `"current-password"`, `"new-password"` on
  the respective fields. A credential nobody's password manager saved is one nobody can sign in
  with next time.
- `pages/enter/EntryChatPage.tsx:1784-1795, 2925-2932` — the setup composer is a single-line
  `<input type="text">` where Enter sends and no line break is possible; the check-in composer two
  screens later is a `<textarea>` where Enter sends and Shift+Enter newlines. One conversation,
  two rules, and a multi-line setup answer loses its shape. Make the setup composer a `<textarea>`
  with the same handler. This is a same-position element swap, not a layout change.
- `pages/chat/ChatPage.tsx:1265-1272` — the file input's `accept` offers 22 extensions including
  `.json`, `.py`, `.css`; the `onChange` validator then rejects everything outside a 10-item
  allowlist (both verified). The OS dialog invites a refusal the product then issues. One list:
  build `accept` from the `allowed` array.
- `pages/home/SaveCard.tsx:106-108` — `{trap.field}` is rendered **twice** in the participant form
  (verified, two consecutive lines) and **zero times** in the admin form, though both call
  `authApi.entrySave(email, undefined, trap.filled)`. Duplicate hidden fields share an `id` and a
  `name` (`_hp`), which is invalid markup and is exactly what makes a password manager fill it and
  lock out a real person; and the admin variant's spam defence does nothing at all. One per form,
  in both.
- **BR-008 is largely already fixed.** `components/gw/a-field-nobody-can-see.tsx` does carry
  `aria-hidden="true"` on the wrapper (verified), so "Leave this field empty" is *not* in the
  accessibility tree. What the browser pass saw was `document.body.innerText`, which
  `aria-hidden` does not affect, and a 38×74 rect — which is the duplicate render above, not the
  single one. Fixing the duplicate closes the observable half. No change to the honeypot itself.
- `pages/join/JoinPage.tsx:55-61` (P5-038) — `joinApi.accept` is posted with no honeypot, while
  `AuthPage` renders `useTheTrap()` on both account-creating forms. The join form is reached from
  a broadcast link shared with a whole cohort — the most publicly exposed form in the product —
  and each submission triggers an outbound email to a typed address. Render `{trap.field}` and
  pass `trap.filled`. **Check needed, and it decides the severity:** whether `/join/accept`
  applies a throttle server-side independently. If it does not, this is the mail-relay hole the
  finding describes and it belongs in Batch 1's priority, not here.

**Shared helper?** `useTheTrap` already exists and is the right shape. Nothing new.

**Spec:** extend `client/src/components/gw/a-honeypot-nothing-renders-catches-nothing.spec.tsx` —
it already owns this. Add: exactly one `{trap.field}` per form in `SaveCard` (both variants), and
one in `JoinPage`. Plus `client/src/pages/auth/enter-submits-the-form.spec.tsx` — press Enter in
the first field of `ChoosePasswordPage` and the board poll form and assert submission.

**Effort:** half a day. **Risk:** low. The setup-composer swap is the only one that changes a
rendered element; verify the height/autoResize behaviour matches the check-in composer's.

---

## Batch 14 — The clipboard failure path that can never run

**Closes:** P5-012, P5-059

**The change.** Three sites, one bug shape, and it is a real JavaScript error rather than a
style point.

`navigator.clipboard?.writeText(x).then(...)` — the `?.` guards `clipboard`, but `.then` is
applied to the *whole* expression. Where the API is absent the expression is `undefined` and
`.then` throws a TypeError. So on exactly the browsers where copy is unsupported, the `.catch`
that exists cannot run and the good error message that was written is unreachable.

- `pages/report/SessionReportPage.tsx:436` — has a `.catch` with the right words ("Select the
  address bar instead") and it is dead code.
- `pages/home/SaveCard.tsx:155-164` — no `.catch` at all, and the note-saving side effect below it
  still runs, so the card looks alive while the button never flips to "Copied". The lead presses
  it repeatedly and pastes whatever was already on their clipboard into the invite email.
- `pages/billing/BillingPage.tsx:248` — `navigator.clipboard.writeText(text).then(...)` with no
  optional chain and no `.catch`.

**Shared helper?** Yes — `client/src/components/gw/copying-can-fail.ts` exporting
`async function copy(text: string): Promise<boolean>`: feature-detect, `await`, try/catch, return
false. Three call sites with an identical subtle bug is the case for one function. It must return
a boolean rather than toasting, so each caller keeps its own message.

`pages/org/IntegrationsPage.tsx:507` also calls `navigator.clipboard?.writeText(...)` and then
toasts "Copied." unconditionally — same class, same helper, fix it while the helper is being
written. (It is not one of the two IDs; it is the same line of code.)

**Spec:** `client/src/components/gw/a-copy-that-fails-says-so.spec.ts` — stub `navigator.clipboard`
as `undefined`, call `copy()`, assert it resolves `false` and does not throw; then a render test
asserting `SessionReportPage`'s fallback message appears.

**Effort:** hours. **Risk:** very low.

---

## Batch 15 — The two hand-rolled modals are dialogs

**Closes:** P5-045, P5-096

**The change.** Both are fixed overlays with no `role="dialog"`, no `aria-modal`, no focus move on
open, no focus trap and no Escape.

- `pages/grounds/GroundParticipantPage.tsx:769-773, 850-856` — the paywall. It is opened
  *programmatically* by `probeSession.onSuccess`, so focus stays behind the scrim entirely: a
  keyboard or screen-reader user is dropped into a modal they were never told about and can tab
  out of into an inert page. For a non-initiator the whole modal holds one actionable control,
  "Not now".
- `pages/admin/AdminDashboardPage.tsx:197-217` — the OTP modal, which gates every destructive
  platform action. Backdrop click closes it; there is no Escape handler and focus is not returned
  to the triggering button, so confirming a code disable or an admin removal drops the user back
  to document start.

Add to both: `role="dialog" aria-modal="true" aria-label={title}`, focus the first control on
open, `onKeyDown` Escape → close, and store/restore the trigger element. Do not install a modal
library and do not build a general `<Modal>` — there are two, they live on different screens, and
a shared component would be a rewrite of two working overlays.

**Spec:** `client/src/components/gw/a-modal-is-a-room-you-can-leave.spec.tsx` — open each, assert
`role="dialog"`, assert focus is inside, press Escape, assert closed and focus restored.

**Effort:** half a day. **Risk:** low. Focus restore is the fiddly part; the OTP modal's `onClose`
fires from two paths (Batch 6 also touches it) — coordinate.

---

## Batch 16 — Sections that render empty, or say three things at once

**Closes:** P5-060, P5-107, BR-016, BR-017

**The change.**

- `pages/report/SessionReportPage.tsx:185-231, 340-355` — the "Your own report / Yours alone /
  What you said this session, and what to do with it" section renders unconditionally once
  loading succeeds, but every child inside it is separately gated on `data?.report`. When the
  report has not been synthesised, a first-time user who just finished a session reads a promise
  above an empty tinted box — which reads as the product having lost their answers, the exact
  complaint quoted in the file's own header. `ReportPage.tsx:920-931` already has the pending
  state for the shared report; match it.
- `pages/org/IntegrationsPage.tsx:511, 754` — the keys list is `(creds.data ?? []).map(...)` with
  no `.length === 0` branch, so a first-time approved admin sees the issue form and then blank
  space. The deliveries list two sections below does it right ("Nothing yet..."), as does
  `ApiAccessPage` ("Nobody is waiting."). One line, matching the sibling.
- `components/gw/GroundChat.tsx:113` (BR-017) — the "ABOUT THIS CHECK-IN" heading renders
  unconditionally while the brief below it is gated on `{brief && ...}`, so a check-in created
  without a brief shows the heading with nothing at all under it, followed straight by "WHO IS IN
  THIS". Verified. Gate the heading on the same condition; the roster block below carries its own
  heading, so nothing is orphaned. Prefer this to adding explanatory text.
- `pages/grounds/GroundAdminPage.tsx:1126, 1248, 1270` (BR-016) — three status chips in one header
  saying three different things at once: `reportState` computes "report being written",
  `alignRead`'s fallback prints "No report yet", and `railAttention` prints "Your turn". Each is
  correct in isolation; together the lead cannot tell whether the report exists, is being
  written, or is waiting on them. `railAttention` is already the designated single source for
  attention across three surfaces (the file says so). Extend that: when `railAttention` has
  something to say, suppress the `alignRead` fallback line, and never print both "No report yet"
  and "report being written" — they are the same fact from two computations.

**Shared helper?** No.

**Spec:** `client/src/pages/an-empty-section-says-it-is-empty.spec.tsx` — render each of the four
with no data and assert either a sentence or no heading, never a heading alone. Plus
`client/src/pages/grounds/one-status-not-three.spec.tsx`.

**Effort:** half a day. **Risk:** low, except BR-016, which needs a decision on precedence — write
it into the spec so it cannot drift back.

---

## Batch 17 — The money screens promise what the system cannot do

**Closes:** P5-085

**The change.** Not a code fix, or not only one. `PricingPage.tsx:156-162` and
`BillingPage.tsx:610-616` present subscription as a working purchase — "Subscribe", "Switched to
X. The difference is prorated on your next invoice.", "Invoices and payment method" — while Stripe
has no keys configured and there are zero subscribers. Every money affordance on the two billing
screens asserts a charge and a prorated invoice the system cannot produce today.

Two honest options, and this is a product-owner call, not an engineer's:

1. **Wire Stripe.** Then the copy is already right and this batch closes itself. Batch 1's
   `subscribeMut.onError` is still needed either way.
2. **Say what actually happens.** Change the primary label from "Subscribe" to "Talk to us about
   this plan" and route it to the existing `hello@myground.work` path, and delete the proration
   sentence. No new page, no new route — the mailto already exists on the Enterprise row.

Do not ship a third thing (a disabled button, a "coming soon" badge). `GroundAdminPage`'s
permanently-disabled Close button (Batch 12) is the argument against it.

**Spec:** `client/src/pages/billing/a-price-that-can-be-paid.spec.ts` — assert that no
user-facing string on either page asserts a completed charge unless
`import.meta.env.VITE_STRIPE_*` is configured; or, under option 2, assert the proration sentence
is gone.

**Effort:** hours for option 2; more than a day and out of this slice for option 1.
**Risk:** low for option 2. Blocked on a decision.

---

## Batch 18 — Copy corrections, and two refusals

**Closes:** P5-040, P5-091, P5-097, P5-104, BR-009, BR-012, BR-018

**The change.**

- `pages/join/JoinPage.tsx:120, 138` — `placeholder="you@company.com"`. `AuthPage` deliberately
  moved both label and placeholder away from work-domain framing, with a comment saying it turns
  away exactly the small teams the product is for — and the fix reached only one of the two
  arrival doors. → `you@example.com`. Its closing line also promises "a link to set a password"
  while the invite door promises "a link for returning later"; use one sentence in both.
  (`SaveCard.tsx:172, 275` carries the same `you@company.com` placeholder — same edit, same line
  of reasoning, do it here.)
- `pages/admin/AdminDashboardPage.tsx:267, 307, 371, 855` — headings mix three registers:
  "Code Management", "Usage Breakdown", "Per-user Usage Patterns" beside plain-language ones
  written to the product's voice ("Who can reach this console", "The team's operating system"),
  with table headers adding a third ("Allow Create", "Days Left"). One voice, per the standing
  plain-language rule. Sentence case, plain words.
- `pages/org/IntegrationsPage.tsx:286-321` — three accounts of the commercial terms, one of them
  only in a code comment. The lede says engineers get a key "for both"; a long retained comment
  describes a free-plan gate on `oauth/token`; the live banner says access is "asked for"; and the
  page never states on screen whether using the API needs a plan. That is the decision this page
  exists to support. **Check needed before writing the sentence:** whether the token-exchange plan
  gate in `the-api-is-a-paid-thing.ts` is still live or fully replaced by the approval gate. Then
  one sentence, in the existing banner. Adding it is justified: the page currently answers the
  question in a comment only a developer can read.
- `pages/admin/ApiAccessPage.tsx:67` (BR-018) — "1 writes". Pluralise. Staff read this daily.
- `pages/home/HomePage.tsx` / the test-build root (BR-009) — the root screen says only that this
  is not the live site, then offers "Start a check-in" and "Sign in", with nothing saying what
  Groundwork is. On production this visitor arrives from the marketing site, so this is the test
  gate rather than the product — but today it is the first and only instruction every person
  being shown a demo gets. One sentence. This is the weakest justification in the batch; if the
  product owner would rather not, drop it and the finding stays open as a Note.

**Two refusals, with the reasoning:**

- **P5-091 — refused.** "Everyone with an account here", "More people have accounts here than
  this plan covers", "Every person with a Groundwork account in your organisation counts toward
  your plan" are the *login* sense of the word.
  `components/gw/account-is-not-the-word.spec.ts` states the rule as decided — "WHAT IS BANNED IS
  THE SENSE, NOT THE STRING" — and names the third of those three strings explicitly as correct
  and staying. Changing them would break a written decision and the spec that guards it.
- **BR-012 — refused for the same reason** on "Create your account" / "Create my account" /
  "Already have an account?". The *other* half of BR-012 stands and is worth one edit: the field
  is "Your organisation (optional)" and the hint under it says "What your workspace will be
  called" — one object, two names, on the screen that introduces the product's vocabulary. Say
  "organisation" in both.

**Spec:** extend `client/src/components/gw/account-is-not-the-word.spec.ts` with a comment
recording that the billing strings were reviewed against the rule and kept, so the finding is not
re-raised. Plus one line in the existing plain-language sweep for the admin headings.

**Effort:** hours. **Risk:** very low.

---

## Batch 19 — Two narrow-viewport defects

**Closes:** P5-098, BR-005

**The change.**

- `pages/admin/AdminDashboardPage.tsx:314-321, 386-393, 862-869` — the three tables are correctly
  wrapped in `overflowX: 'auto'`, but every header cell is `whiteSpace: 'nowrap'` across nine
  columns, and the Usage Breakdown rows carry `minWidth: 160` + `28` + `36` plus a flexing bar in
  a plain `display: flex` row that sits *outside* any scroll container. That one section produces
  horizontal page scroll. Wrap it the way the tables beside it already are.
- `/start` situation catalogue cards (BR-005) — each card carries three labelled columns
  (RECOMMENDED CADENCE / USUALLY RUNS FOR / CHECK-INS) above three values, and at ~1150px the
  labels wrap onto two lines while the values wrap differently, so on the first card "CHECK-INS"
  sits above nothing and its "6" appears on the line above the word "weeks". The pairing has to be
  inferred, on the grid whose whole purpose is comparing situations. Make each label+value one
  flex child (`SituationCard.tsx`) so they wrap together. Not a redesign — the same three pairs in
  the same order.

Note `BoardPage` (P5-076) and `SessionReportPage` (P5-063) were both checked and are sound; they
are the pattern (`overflowX: 'auto'` around a `minWidth` table, `flexWrap` everywhere else).

**Spec:** `client/src/pages/nothing-scrolls-sideways.spec.ts` — a source sweep asserting no
`minWidth` above 120 on a `display: flex` row that is not inside an `overflowX: 'auto'` ancestor,
allowlisted. A jsdom test cannot measure layout, so this has to be structural.

**Effort:** hours. **Risk:** very low.

---

## Batch 20 — No change: these are the reference patterns

**Closes:** P5-008, P5-057, P5-063, P5-069, P5-076, P5-083, BR-013, BR-019, BR-020

These nine were recorded as *correct*, and several are named above as the thing other batches
should match. Listed so nobody re-audits them and nobody "improves" them:

| ID | What is right | Cited by |
|---|---|---|
| P5-008 | `EntryChatPage` — in-flight guards, restored text on a failed send, named `reportFailed` with Retry, "Start over" confirmed in all three placements | Batches 3, 6 |
| P5-057 | `ChatPage` decline — two-step confirm listing all four consequences, `disabled` while pending, settled post-state | Batch 3 |
| P5-063 | `SessionReportPage` narrow viewport — `maxWidth: 720`, everything `flexWrap`, no fixed widths | Batch 19 |
| P5-069 | `ReportPage` error/empty — differentiated, retry-bearing, non-accusatory, self-refreshing | Batches 1, 7, 16 |
| P5-076 | `BoardPage` — the one wide table wrapped in `overflowX: 'auto'`, Role column dropped when empty | Batch 19 |
| P5-083 | `GroundAdminPage` delete — two-step, names the ground, distinct cancel, pending label, inline server refusal | Batch 3 |
| BR-013 | `/start` at 375px — no horizontal scroll, nothing outside the viewport, session survives reload | Batch 19 |
| BR-019 | Thin-data honesty — four board tiles and the report tab all say what is missing rather than charting a sample of one | — |
| BR-020 | All ten `/admin` tabs load, none is a dead end, every empty one says what would fill it | — |

**Effort:** none. **Risk:** the only risk here is a later batch quietly regressing one of them,
which is what the specs in Batches 3, 7 and 16 are for.

---

# Suggested order

| Wave | Batches | Why |
|---|---|---|
| 1 | 1, 2, 14 | Failures shown as successes, dead invite links, silent buttons. Highest harm, and 14 is hours. |
| 2 | 3, 6, 4 | Irreversible presses and double submits, then the wrong numbers. Batch 4 is the riskiest change in the plan; do it when the suite is green. |
| 3 | 8, 9, 10, 13 | The three sweeps — vocabulary, controls, live regions — plus forms. Broad, shallow, low risk, and each one is guarded by a spec that stops it coming back. |
| 4 | 7, 11, 12, 15, 16, 19 | Screen-by-screen correctness. |
| 5 | 5, 17, 18 | Blocked on the server classifier (5), on a commercial decision (17), and cheap copy (18). |

Two cross-slice dependencies, restated so they are not lost:

- **P5-051** needs `isFinal` and `isInitiator` added to `TranscriptResponse`
  (`api/.../check-ins/:id/transcript`). The client half is dead code without it.
- **BR-014**'s numeric divergence (484 sessions in the table vs 359 in the events log) is a
  server-side counting question. This plan relabels; it does not reconcile.

---

# Coverage

Every ID in the slice, once.

| ID | Batch |
|---|---|
| P5-001 | 6 |
| P5-002 | 4 |
| P5-003 | 2 |
| P5-004 | 9 |
| P5-005 | 10 |
| P5-006 | 9 |
| P5-007 | 13 |
| P5-008 | 20 |
| P5-009 | 1 |
| P5-010 | 1 |
| P5-011 | 2 |
| P5-012 | 14 |
| P5-013 | 8 |
| P5-014 | 3 |
| P5-015 | 13 |
| P5-016 | 1 |
| P5-017 | 11 |
| P5-018 | 12 |
| P5-019 | 9 |
| P5-020 | 9 |
| P5-021 | 10 |
| P5-022 | 13 |
| P5-023 | 13 |
| P5-024 | 8 |
| P5-025 | 6 |
| P5-026 | 13 |
| P5-027 | 7 |
| P5-028 | 12 |
| P5-029 | 11 |
| P5-030 | 7 |
| P5-031 | 12 |
| P5-032 | 10 |
| P5-033 | 8 |
| P5-034 | 12 |
| P5-035 | 11 |
| P5-036 | 8 |
| P5-037 | 2 |
| P5-038 | 13 |
| P5-039 | 7 |
| P5-040 | 18 |
| P5-041 | 7 |
| P5-042 | 4 |
| P5-043 | 7 |
| P5-044 | 1 |
| P5-045 | 15 |
| P5-046 | 8 |
| P5-047 | 9 |
| P5-048 | 4 |
| P5-049 | 3 |
| P5-050 | 8 |
| P5-051 | 11 |
| P5-052 | 9 |
| P5-053 | 6 |
| P5-054 | 13 |
| P5-055 | 12 |
| P5-056 | 10 |
| P5-057 | 20 |
| P5-058 | 8 |
| P5-059 | 14 |
| P5-060 | 16 |
| P5-061 | 7 |
| P5-062 | 10 |
| P5-063 | 20 |
| P5-064 | 2 |
| P5-065 | 9 |
| P5-066 | 4 |
| P5-067 | 6 |
| P5-068 | 10 |
| P5-069 | 20 |
| P5-070 | 4 |
| P5-071 | 3 |
| P5-072 | 7 |
| P5-073 | 6 |
| P5-074 | 10 |
| P5-075 | 8 |
| P5-076 | 20 |
| P5-077 | 6 |
| P5-078 | 12 |
| P5-079 | 1 |
| P5-080 | 1 |
| P5-081 | 9 |
| P5-082 | 8 |
| P5-083 | 20 |
| P5-084 | 1 |
| P5-085 | 17 |
| P5-086 | 12 |
| P5-087 | 8 |
| P5-088 | 3 |
| P5-089 | 6 |
| P5-090 | 9 |
| P5-091 | 18 |
| P5-092 | 4 |
| P5-093 | 12 |
| P5-094 | 1 |
| P5-095 | 6 |
| P5-096 | 15 |
| P5-097 | 18 |
| P5-098 | 19 |
| P5-099 | 3 |
| P5-100 | 3 |
| P5-101 | 1 |
| P5-102 | 2 |
| P5-103 | 10 |
| P5-104 | 18 |
| P5-105 | 6 |
| P5-106 | 1 |
| P5-107 | 16 |
| BR-001 | 5 |
| BR-002 | 9 |
| BR-003 | 4 |
| BR-004 | 5 |
| BR-005 | 19 |
| BR-006 | 5 |
| BR-007 | 5 |
| BR-008 | 13 |
| BR-009 | 18 |
| BR-010 | 2 |
| BR-011 | 11 |
| BR-012 | 18 |
| BR-013 | 20 |
| BR-014 | 4 |
| BR-015 | 8 |
| BR-016 | 16 |
| BR-017 | 16 |
| BR-018 | 18 |
| BR-019 | 20 |
| BR-020 | 20 |

127 IDs, 20 batches, no ID in two batches and none dropped.

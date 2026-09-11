# Implementation progress: fix plan parts D, F and G

Read against the code on `fix/what-the-user-hit-today`, 11 September 2026, plan commit `7ea07ab`.
43 batches: D1–D20, F1–F17, G1–G6. Verdicts are from the code, not the commit messages.

## Summary

| Batch | Title | Verdict |
|---|---|---|
| D1 | Nobody on WhatsApp is met with silence | LANDED |
| D2 | One inbound handler, not two | LANDED |
| D3 | Templates, the service window, STOP | LANDED (code; Meta approval external) |
| D4 | A redelivery is not a second answer | LANDED |
| D5 | The report reaches the channel they used | LANDED |
| D6 | The panel tells the truth about what happened | LANDED |
| D7 | The panel's smaller edges | NOT STARTED |
| D8 | Arriving by invitation: which wall they hit | LANDED |
| D9 | "Not invited yet" is three facts | LANDED |
| D10 | Two dead branches in the join path | LANDED |
| D11 | The anonymous entry flow says what refused | LANDED |
| D12 | A way out, a text part, escaped words | LANDED |
| D13 | The stop link stops everything | LANDED |
| D14 | One clock, one message per event | LANDED |
| D15 | A failure reaches a person | LANDED |
| D16 | Links that open what they promise | LANDED |
| D17 | The answer nobody is given | LANDED |
| D18 | Switch on what is already built | LANDED |
| D19 | Credentials and tokens | PARTLY (NL-025 only) |
| D20 | What only an inbox can settle | IN FLIGHT, uncommitted (confirmation still BLOCKED) |
| F1 | A blocked participant's two dead buttons | LANDED |
| F2 | Ending what you paid for | NOT STARTED |
| F3 | A credit comes back | PARTLY |
| F4 | The report that never came / came too early | NOT STARTED |
| F5 | The twelve-character discard | LANDED (inside D2) |
| F6 | The wall in front of the whole product | PARTLY, uncommitted and not compiling |
| F7 | The chasing the product says it removes | NOT STARTED |
| F8 | The closing report's two missing parts | NOT STARTED |
| F9 | New hire vs PIP classifier | LANDED (classifier half; board/marketing halves correctly dropped) |
| F10 | "Ground" as a noun / the one-page guard | LANDED (guard restructure + median; banned noun deferred) |
| F11 | Advertising WhatsApp on the site | WITHDRAWN |
| F12 | Three things built and unfindable | LANDED (mailto third correctly dropped) |
| F13 | Anonymous callers spending the model budget | LANDED |
| F14 | The API's error body, retries, half batches | LANDED |
| F15 | A terms bump nobody notices | LANDED |
| F16 | The weight of the back office | N/A — a decision, no code proposed |
| F17 | Where the channels are shown | LANDED |
| G1 | Deletion and retention | WITHDRAWN |
| G2 | The processor list | IN FLIGHT, uncommitted (spec written and passing) |
| G3 | "Staff can't read it" | IN FLIGHT, uncommitted (spec written and passing) |
| G4 | Personal data in logs | IN FLIGHT, uncommitted and FAILING |
| G5 | The "account" polarity | WITHDRAWN |
| G6 | The service named after Anthropic | NOT STARTED |

**Marketing freeze: honoured.** `git log 7ea07ab..HEAD -- marketing/` is empty. No file under
`marketing/` changed after the plan commit. The only new read of that directory is a test
(`the-site-does-not-promise-more-than-this.spec.ts`, and the uncommitted G2 spec), which is a read,
not a change.

---

## Part D

**D1 LANDED.** `whatsapp.controller.ts:86-97` catches, recovers `err.response.message`, sends it to
the person, and logs only if that send fails. `WhatsAppSend` rows exist (`sentAt`, `kind`).
Spec `whatsapp/a-person-on-whatsapp-is-never-answered-with-nothing.spec.ts`.

**D2 LANDED, and taken the safer way.** The route was not deleted — it was hollowed out, which
answers the audit's operational caveat (a live Meta app pointed at `/webhooks/whatsapp` keeps a
200). `whatsapp.controller.ts:71-83` does exactly two things of its own — the signature, and
`whichOrganisation()` — then calls `this.inbound.handle(organizationId, body)`. There is **one**
live inbound conversation path. `whatsapp.module.ts` and
`a-phone-number-is-not-an-identity.spec.ts:70` are consistent with the surviving file (the spec
still reads `whatsapp.controller.ts`, which still exists, so no dangling reference).
Multi-org disambiguation is new (`WhatsAppOrganisationPick`, `a-whatsapp-message-is-routed.ts`).
Spec `there-is-one-way-in-from-whatsapp.spec.ts`.

**D3 LANDED.** `a-message-outside-the-window.ts` (`insideTheServiceWindow`, `templateFor`,
`A_STOP_WORD`/`A_START_WORD`), consumed at `whatsapp.service.ts:290-295`; `Person.whatsappStoppedAt`
at `schema.prisma:3152`; STOP/START written at `whatsapp-for-an-organisation.service.ts:75-81`.
Templates still wait on Meta's queue, which was always outside the batch.

**D4 LANDED, on D's design (the separate table), as the audit recommended over Part A5's.**
`model WhatsAppInboundMessage` at `schema.prisma:2039`; claimed at
`whatsapp-for-an-organisation.service.ts:238` in `firstTimeWeSeeThis`, with P2002 = redelivery and a
table outage deliberately not turning every message into a redelivery.

**D5 LANDED.** `onCheckInCompleted` at `whatsapp-for-an-organisation.service.ts:215-232`: the test is
now "did a report send for this check-in already go" (`whatsAppSend` with `sentAt`), the
`connected?.enabled` requirement is gone, and the send is not awaited into the request.

**D6 LANDED.** `panel.html`: `busy()` disables input and every `.chip.act` (`:194-195`);
`refusalFrom()` prints the server's sentence on `open`, `ask` and the record read (`:234`, `:259`,
`:389`); `finishCheckIn` reads the 400 + `canContinue` and says the check-in is still open
(`:283-293`); the auto-complete is replaced by "Say finish" (`:267-270`) with `FINISH_WORD` at
`:249`. Specs `the-panel-never-says-done-when-it-is-not.spec.ts`,
`a-refusal-in-the-panel-is-printed-not-swallowed.spec.ts`.

**D7 NOT STARTED.** `panel.html:123` is still `parent.postMessage(..., '*')` (P4-E11) and `:101` is
still `setInterval(askForANewSession, ASK_AFTER_MS)` with no `clearInterval` and no give-up counter
(P4-E09). No `the-panel-talks-back-to-one-origin.spec.ts`. P4-E08 was withdrawn by the plan audit as
a misread, so this batch is two items, both open.

**D8 LANDED, with the audit's correction taken.** The fix is a new `@OptionalAuth()` decorator
(`common/decorators/optional-auth.decorator.ts:16`) rather than every `@Public()` route, so the
Google OAuth callback is untouched; `jwt-auth.guard.ts:30` takes `context` as the fourth argument.
Spec `a-public-route-still-knows-who-is-signed-in.spec.ts` asserts both, including
`expect(auth).not.toContain('@OptionalAuth()')`. B03 (`queuedForApproval` surfaced at
`participants.service.ts:370`, rendered at `InvitePage.tsx:116` and `JoinConfirmPage.tsx:50`),
B05 (`authApi.me()` at `JoinConfirmPage.tsx:45-46`) and B09 (`InvitePage.tsx:147`) are all in.

**D9 LANDED.** `grounds.service.ts:2831` `const notInvitedBecause: 'starts_later' | 'no_seat' |
'mail_failed' | null`, returned at `:2840`, three sentences rendered by `whyNotInvited` at
`GroundAdminPage.tsx:218`. Spec `not-invited-yet-says-why.spec.ts`.

**D10 LANDED.** No `joinToken` remains in `entry.service.ts`, the DTO, `client/src/api/entry.ts` or
`client/src/types/index.ts` — the client-side deletion the audit added is done.
Spec `the-brief-is-not-served-to-a-stranger.spec.ts`.

**D11 LANDED.** `lastReplyHadCloseMarker` and `didLastReplyClose` are gone (asserted negatively by
`one-visitors-close-is-not-anothers.spec.ts:15-17`); `COMMIT_IN_PROGRESS` has its own `stillSaving`
outcome (`a-slow-save-is-not-a-lost-one.spec.ts`); A07 is a rendered state, not a toast
(`EntryChatPage.tsx:1488` `reportFailed`, retry block at `:3299`).

**D12 LANDED.** `escapeHtml` is now applied at every user-value interpolation (`email.service.ts:176,
210-211, 528, 541, 547, 577, 593-594, 606, 662, 676, 690, 719, 733` …); `List-Unsubscribe` and
`List-Unsubscribe-Post` set at `:353`; a plain-text part generated in `sendEmail`. Specs
`every-message-has-a-plain-text-part.spec.ts`,
`a-name-with-an-ampersand-does-not-break-the-mail.spec.ts`,
`nobody-is-told-their-unsubscribe-link-is-invalid.spec.ts`. The banned-word pass ran per line
(commit 38323b9) and did not invert G5's polarity — the telling sense survives in the report
vocabulary (`:547` "share their account of").

**D13 LANDED.** `wouldTheyRatherNot` is now the single arbiter: `remindersStoppedAt` read at
`email.service.ts:110`, `isActive`/`deletedAt` at `:113`, `roundDigest`/`nudges` at `:127-134`, hard
bounce at `:106`. `sendNudge`'s `participantId` is required (`:826`) and passed by both remaining
callers. Specs `the-stop-link-stops-every-engine.spec.ts`, `a-leaver-does-not-get-the-report.spec.ts`.

**D14 LANDED, in the sequence the audit insisted on.** Deferral first: `holdForTheMorning` writes a
held row (`email.service.ts:297-319`) and `deliverHeld` (`:325`) sends it — quiet hours defer rather
than drop. Locks separated: `CronLock.SEND_REMINDERS` at `grounds.cron.ts:461` and
`CronLock.SESSION_READY` at `:476`. The 09:00 nudge half is deleted (`one-report-one-message.spec.ts`
asserts the cron no longer contains `sendNudge(`).

**D15 LANDED.** `model Notification` at `schema.prisma:4697`, written from `sendEmail`
(`email.service.ts:406`); bounce suppression at `:106`; the dead endpoint is now switched off in
`tellThemItIsDying` (`webhooks.service.ts:332-360`). Specs
`a-bounced-invite-reaches-the-person-who-sent-it.spec.ts`, `we-stop-writing-to-a-dead-address.spec.ts`.

**D16 LANDED.** The cancellation mail points at `/settings` (`billing.service.ts:947-950`) instead of
the non-existent `/users/me/export`; the record-entry text is stripped at the read in the cron's
select (`grounds.cron.ts:499`); the invite-expiry sweep exists (`grounds.cron.ts:420` warn,
`:433` lapsed) with one `inviteExpiryFrom()` for both write sites; tokenised report link specced at
`reports/a-report-link-opens-the-report.spec.ts`. Spec
`a-reminder-does-not-quote-what-you-wrote.spec.ts`.

**D17 LANDED.** `public-api/api-access.service.ts:23` injects `EmailService`; `:205-207` sends the
three outcomes. Spec `somebody-is-told-no.spec.ts`.

**D18 LANDED.** `IntegrationsPage.tsx:731` "Where we tell you" (workspace notifiers, queried at
`:135`) and `:864` "Embed the panel" with allowed domains at `:869`. Specs
`the-embed-can-be-switched-on-from-the-console.spec.ts` and the console setup spec.

**D19 PARTLY.** Landed: NL-025 — `validateToken` at `auth.service.ts:911` now returns
`Promise<{ valid: boolean }>` and discloses neither address nor name. Missing, all three:
NL-026 (no `sessionsValidFrom`/token-version column anywhere in `schema.prisma`, so a password reset
still does not put an existing session out), NL-035 (no `tokenHash` column; emailed tokens still
stored in plaintext), NL-015 (no encryption of `WhatsAppConnection.accessToken`/`appSecret` — a grep
for `encrypt`/`cipher` over `src/common` and `src/modules/whatsapp` returns nothing). The batch said
this work sequences with the security plan; it has not been done here.

**D20 IN FLIGHT, uncommitted; confirmation still BLOCKED.** See the in-flight section below.

---

## Part F

**F1 LANDED.** Specs `a-blocked-person-is-only-offered-what-they-can-press.spec.ts` (client) and
`the-person-we-said-we-told-is-actually-told.spec.ts` (api) both exist and the sentence is now backed
by a send.

**F2 NOT STARTED.** All four parts open. `conversation.service.ts` `open()` (from `:504`) still
decrements with no `isFinal` exemption — the atomic decrement block carries no `isFinal` test;
`beginClosingSession` (`grounds.service.ts:3031-3047`) still guards only ownership and `hasEnded`,
with no billing gate at the button; no cancellation of `NOT_STARTED` check-ins at close (and, as the
plan audit found, `enum CheckInStatus` at `schema.prisma:159-164` still has no fourth terminal
state, so the migration the audit called for has not happened); none of the three specs exists.

**F3 PARTLY.** `creditSession(groundId, reason, byUserId)` exists at `billing.service.ts:424`, routed
at `billing.controller.ts:318`, writing a `BillingEventType.CREDIT` row. But this is **Part A Batch
7's design, not F3's**, and the audit recommended F3's. Missing: idempotency on a `ref` (the
`stripeInvoiceId` key is `credit_<groundId>_<Date.now()>_<user>`, which makes every call a new row —
the same incident can be credited twice); the reason is a log line (`:445`) rather than a stored
column; no "Give back a session" control on `AdminPage.tsx` (grep for `creditSession` over
`client/src` returns nothing); and no `a-session-nobody-got-can-be-given-back.spec.ts`.

**F4 NOT STARTED.** The `CHECK_IN_COMPLETED` emit is still at `entry.service.ts:1632`, *before* the
contributor loop, and the comment above it still asserts the order is deliberate. No `reportFailedAt`
anywhere in the schema or `src`; `reports.listener.ts:96` and `:127` are still log-only catches; no
retry sweep; neither `a-report-that-fails-is-not-a-silent-report.spec.ts` nor
`a-shared-report-waits-for-the-people-it-is-shared-with.spec.ts` exists. (`a-closing-synthesis-that-
never-landed.spec.ts` predates the plan.)

**F5 LANDED, and the order was taken correctly.** D2 landed first (commit `7b96c01`, "There is one
way in from WhatsApp"), and the twelve-character guard is gone from
`whatsapp-for-an-organisation.service.ts`. The bug the audit warned about — `finish` on a
`NOT_STARTED` check-in becoming a written first answer once the length guard goes — is explicitly
handled: the finish match moved **above** the status test (`:159-161`, "There is nothing to finish
yet"), exactly as D2's reasoning required, and greeting suppression is now a list
(`A_GREETING_ALONE`, `:191`), not a character count. The result is correct.

**F6 PARTLY, and the work is uncommitted and does not compile.** See the in-flight section.

**F7 NOT STARTED.** No cadence sweep: nothing creates a next session on the clock, there is no
missed-round state (no `MISSED`/`missedAt` on `CheckIn` in `schema.prisma`), and no
`a-quiet-person-still-gets-their-next-check-in.spec.ts`. This is the most consequential open item in
the slice — with the marketing copy frozen, the site's central cadence claim
(`how-it-works.astro:58`) can only be closed by building this.

**F8 NOT STARTED.** `keyDecisions` and `whatWasLearned` still appear nowhere in `api/src` or
`client/src`; the divergence tile is still a tile. Both specs absent. With the frozen page, the
audit's note stands: the fallback wording is unavailable, so the build is now mandatory.

**F9 LANDED, and exactly the half the audit said to keep.** The classifier fix shipped
(`a-new-hire-in-trouble-is-still-a-new-hire.spec.ts`, commit `fba75a7`); `board-families.ts` was not
touched, so the written EVALUATION decision stands; no marketing edit.

**F10 LANDED as restructured.** `the-site-does-not-promise-more-than-this.spec.ts` now has `PAGES`
(`:29`) alongside `HOME` (`:30`), a per-page block keeping the positive assertions on `index.astro`
(`:66`, `:112`) and a whole-directory block carrying only the negative assertions (`:41`, `:78`) —
which is the split the audit specified rather than the widened path the plan wrote. The median is
built (`ops/a-check-in-takes-about-as-long-as-we-say.ts`, with `WHAT_WE_SAY_MINUTES`, `A_FAIR_RANGE`,
`saysTheTruth`). "Ground" is correctly **not** added to the banned list, since the page is frozen.

**F11 WITHDRAWN** under the marketing freeze. Nothing landed and nothing should have.

**F12 LANDED, minus the withdrawn mailto third.** `LeadsGuidePage.tsx:33-34` copies the link through
the shared `copy()` helper; `coach.service.ts:122` now emits `CALL_ASKED`. No `about.astro` change
and no `the-site-has-no-mailto-anywhere.spec.ts`, as required.

**F13 LANDED, widened to the 12 handlers the audit counted.** `entry.controller.ts` now has DTOs and
`@Throttle` on the public handlers including `opener` (`:387`), `classify-intent` (`:410`, with the
inline type replaced — see the comment at `:79`) and `faq` (`:417`). Spec
`anonymous-model-spend-is-written-down.spec.ts`.

**F14 LANDED, all three findings, and better than the plan's design.** Idempotency is one
controller-level interceptor (`public-api.controller.ts:72` `@UseInterceptors(IdempotencyInterceptor)`)
covering every POST under `/api/org/v1`, with the two body-keyed routes skipped by
`HANDLES_ITS_OWN` — which converts the audit's "35 route key-derivations" into one file. The error
shape is shared (`http-exception.filter.ts:102`, "A PUBLISHED SURFACE GETS A RAW BODY ON FAILURE");
SSE emits a stable `{type:'error', code:'stream_failed', message: A_STREAM_FAILED}`
(`conversation.controller.ts:99`, `entry.controller.ts:334`, `:352`). `seedObjectives` validates the
whole batch first and writes in one transaction. Specs
`a-retried-post-does-not-open-two-check-ins.spec.ts`, `a-record-of-a-retry-is-not-kept-for-ever.spec.ts`,
`one-error-shape-for-a-machine.spec.ts`.

**F15 LANDED.** `api-access.service.ts:148` `termsOutOfDate: !!r.acceptedTermsAt && r.termsVersion
!== API_TERMS_VERSION`, spec `a-changed-term-is-visible-on-every-approval.spec.ts`.

**F16 — no code was proposed and none landed.** Correct outcome; it is a decision for the owner.

**F17 LANDED.** `IntegrationsPage.tsx:980-982` carries the three pictures with two sentences each —
panel, ops panel, WhatsApp — above the request-access flow, asserted at
`the-console-tells-the-truth-about-setup.spec.ts:71`. The sequencing risk is discharged: D1–D3 are in,
so the page is not selling a channel that answers with silence.

---

## Part G

**G1 WITHDRAWN** (already built). The sweep/erase reconciliation the audit redirected to Part A16 did
land there — commit `aacdf4a`, "an erased account is still swept". Outside this slice.

**G2 IN FLIGHT, uncommitted.** `the-privacy-page-names-the-provider-we-call.spec.ts` is written and
**passes**. It is the audit's shape, not the plan's: providers derived from **both** configured
models via a prefix table, scoped to the processor sentence by a
`/Groundwork may use leading AI providers[^.]*\./` match so the negative training sentence cannot
trip it, and inverted to "the page's list is a superset of what we call". No marketing change. What
is left is the owner's recorded exception for the two named-but-uncalled processors.

**G3 IN FLIGHT, uncommitted.** `no-staff-surface-shows-a-persons-words.spec.ts` is written and
**passes**: it walks every non-spec file under `modules/ops`, `admin` and `back-office` for
`prisma.{conversationTurn,recordEntry,leadContextNote}.find*`, and separately pins the "Hard privacy
boundary" comment in `admin.service.ts`. The ratchet half only; the wording half is forbidden and the
encryption control is not started.

**G4 IN FLIGHT, uncommitted, and FAILING.** The two sites the plan named are fixed
(`grounds.service.ts:1942` logs `Shortened ${shortened.length} of their own words`; the
`[DEV EMAIL] Body:` line is deleted from `email.service.ts`, links kept). But running the new spec
gives one failure and the spec has a hole that hides several more. Detail below.

**G5 WITHDRAWN.** `client/src/components/gw/account-is-not-the-word.spec.ts` still exists and the
D12 copy pass did not invert it.

**G6 NOT STARTED.** `modules/conversation/anthropic.service.ts` and `class AnthropicService` are
unchanged; 48 references to the name across `api/src`. The audit's half-day, single-commit rename has
not been done.

---

## The uncommitted work in flight

Six modified files and four untracked specs. It is **three different batches at once** — D20, G4 and
F6 — and it is mid-flight, not finished.

**D20 (email sending decided on a flag, not NODE_ENV) — complete in code.**
- `configuration.ts:114` adds `sendsForReal: process.env.EMAIL_SENDS_FOR_REAL === 'true'`.
- `email.service.ts` `isDev()` is now `!this.canSendForReal()`, where `canSendForReal()` requires the
  flag **and** a non-placeholder key; `onModuleInit()` logs at boot — `error` when deployed, `warn`
  otherwise — naming which of the two conditions failed.
- `main.ts` `assertProductionConfig` refuses to start in production without
  `EMAIL_SENDS_FOR_REAL=true` and a real `RESEND_API_KEY`.
- `a-deployment-that-cannot-send-says-so-at-boot.spec.ts` is written and **passes** (4 tests).
- Still BLOCKED on what the batch always said was blocked: whether staging is currently in this
  state needs an inbox and provider access nobody in the repository has. The code half is done.

**G4 (personal data in logs) — incomplete, and the spec fails.**
Running the four new specs: **3 suites pass, 1 fails.**
`no-log-line-carries-what-somebody-wrote.spec.ts` → "and no logger line anywhere interpolates a turn,
a record entry or a message body" fails on:
`whatsapp/whatsapp.service.ts: this.logger.error(\`WhatsApp send failed for ${to}: ${res.status} ${body.slice(0, 200)}\`)`.

Worse, the spec's own regex has a hole and therefore *understates* what is left. It matches
`\b(content|\.text|body|…)`, and `\b` before `\.` never matches after a `]` or `)`, so every
`${JSON.stringify(x.text…)}` site is invisible to it. Still logging verbatim content, unfixed and
uncaught:
- `conversation/conversation.service.ts:3876` — a record entry's full text, the document filename and
  200 characters of a passage.
- `conversation/conversation.service.ts:3890` — the same, plus 200 characters of `d.says`.
- `documents/documents.service.ts:426` — 120 characters of `doc.uploaderNote`.
- `whatsapp/whatsapp.service.ts:141` — `[DEV WHATSAPP] To: ${to} | Body: ${text}`, the exact
  counterpart of the dev-email body line that was just removed.
- The batch's **first named item is not done at all**: email addresses are still logged routinely —
  `email.service.ts:276, 314, 319, 356, 381, 389, 393, 406` — and phone numbers at
  `whatsapp.service.ts:139, 151`. "Log the participant identifier instead of the address" has not
  happened anywhere.

So G4 is roughly two of eight sites, with a spec that is red and, once green, would still not hold
the line.

**F6 (the wall in front of the product) — partly done, uncommitted, and the client does not compile.**
- `App.tsx` — `mustSetUpOrg` deleted, and both redirects (in `RequireOrgSetup` and `RootRoute`)
  removed. The name `RequireOrgSetup` is kept deliberately, as the audit advised, because it also
  does the signed-in check for 11 routes.
- `OrgSetupPage.tsx` — the address is optional in `handleSave`, and the render-time navigate is gone.
- **Not done:** the Stripe fallback. `billing.service.ts:497` is still
  `ensureCustomer(org.id, org.email ?? undefined, …)` with no fall back to the admin user's address,
  and nothing asks for a billing email at checkout. Neither
  `nothing-stands-between-signing-up-and-the-product.spec.ts` nor
  `the-billing-email-is-asked-for-at-checkout.spec.ts` exists.
- **`npx tsc --noEmit` in `client/` fails with three errors** left by the deletion:
  `src/App.tsx(85,1) 'User' is declared but its value is never read`,
  `src/App.tsx(234,9) 'user' is declared but its value is never read`,
  `src/pages/org/OrgSetupPage.tsx(1,10) 'useEffect' is declared but its value is never read`.
  The tree is not committable as it stands.

---

## Counts

| Verdict | Count | Batches |
|---|---|---|
| LANDED | 28 | D1–D6, D8–D18, F1, F5, F9, F10, F12, F13, F14, F15, F17 |
| PARTLY | 3 | D19, F3, F6 |
| IN FLIGHT (uncommitted) | 4 | D20, G2, G3, G4 |
| NOT STARTED | 6 | D7, F2, F4, F7, F8, G6 |
| WITHDRAWN | 3 | F11, G1, G5 |
| N/A (decision only) | 1 | F16 |

(D20 and F6 each appear once, under the verdict that describes them best: D20's code is in the
working tree, F6's is too but is incomplete.)

## What is left, in priority order

1. **Finish the working tree before anything else.** Fix the three TypeScript errors, complete F6's
   Stripe fallback and checkout field, and close out G4's remaining six log sites — including
   widening the spec's regex, which currently cannot see `${JSON.stringify(x.text)}`. The tree does
   not compile and one new spec is red.
2. **F7, the cadence sweep.** The single most consequential open item: with `marketing/` frozen, the
   product is the only way to make the site's central claim true.
3. **F4, the report that never came.** Money is spent, the check-in is COMPLETED, and the Report tab
   stays empty with only a server log to show for it. The emit move is minutes.
4. **F2, ending what you paid for.** Needs the `CheckInStatus` migration the plan audit called out;
   budget a day and a half, not a day.
5. **F8, the two closing-report producers plus the divergence section.** Now mandatory rather than
   optional, since the copy fallback is unavailable.
6. **D19's three security findings** (NL-026 session invalidation, NL-035 token hashing, NL-015
   WhatsApp credential encryption) — sequence with the security slice as the batch says.
7. **F3's idempotency and its admin control**, so a credit cannot be given twice and a support person
   can give one at all.
8. **D7**, the panel's two remaining edges (targeted `postMessage` origin, a bounded ask loop).
9. **G6**, the rename — half a day, its own commit, nothing else in it.
10. **Record the owner's exceptions** the freeze creates: the two uncalled processors, "staff can't
    read it", the four "Ground" uses, and the About page mailto. These are not defects any more; they
    are decisions that need writing down.

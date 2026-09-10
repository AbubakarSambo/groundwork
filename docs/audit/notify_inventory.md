# Groundwork notifications and links: inventory

Read-only audit. Date: 2026-09-10. Branch: `fix/the-brief-is-yours-and-the-context-chat-takes-work`.

No message was sent during this audit. No test inbox and no test phone number were available. Everything
below is derived from code and configuration only.

Repository root: `/Users/hafsahjumare/Documents/GitHub/groundwork`

---

## 1. Channels that exist

| Channel | Where it lives | State |
|---|---|---|
| Email (Resend) | `api/src/modules/email/email.service.ts` | 48 public senders, all wired |
| Email (nodemailer to 127.0.0.1:1025) | `api/src/modules/email/email.service.ts:227-231` | Dev only, mailcatcher relay |
| WhatsApp (Meta Cloud API) | `api/src/modules/whatsapp/whatsapp.service.ts`, `api/src/modules/public-api/whatsapp-for-an-organisation.*` | 5 send paths, all freeform text, no Meta templates exist |
| Outbound webhooks | `api/src/modules/webhooks/` | 7 emittable events, signed, queued, retried |
| In-app | toasts and a `tell` channel notice only | **No persisted notification model exists** in `api/prisma/schema.prisma`. There is no inbox, no badge store, no read state |
| SMS / push | — | Not present in the codebase |

---

## 2. Email: every sender, its trigger, recipients, timing, and links

Senders are defined in `api/src/modules/email/email.service.ts`. Every one is classified as
`asked for`, `we decided to send it`, or `the way back in` in
`api/src/modules/email/nothing-goes-out-that-was-turned-off.ts:96-166`, and that classification is the
only thing the opt-out check consults (`email.service.ts:66-107`, applied at `:200`).

Legend: **B** = broadcast (loops over many recipients). **C** = fired from a `@Cron`.

| # | Sender | Defined | Trigger (file:line) | Recipients | Timing | Link in body |
|---|---|---|---|---|---|---|
| 1 | sendSomebodyIsWaiting | :125 | `participants/participants.service.ts:496` | all org ADMINs **B** | immediate | `/org/members` |
| 2 | sendYouAreInNow | :139 | `participants/who-is-waiting-at-the-door.service.ts:124` | the approved person | immediate | `/grounds` |
| 3 | sendTheyWereNotLetIn | :159 | `participants/who-is-waiting-at-the-door.service.ts:158` | the inviter, not the declined person | immediate | none |
| 4 | sendCoachRequestReceived | :273 | `coach/coach.service.ts:118` | the applicant | immediate | none |
| 5 | sendVerificationEmail | :289 | `auth/auth.service.ts:160` | new user | immediate | `/verify-email?token=` |
| 6 | sendMagicLinkEmail | :308 | `auth/auth.service.ts:198,288,569,604,701`; `participants/participants.service.ts:128` | the user | immediate | `/verify-email?token=&next=` |
| 7 | sendSignInLinkEmail | :317 | `auth/auth.service.ts:728` | the user | immediate | `/verify-email?token=` |
| 8 | sendAddPasswordEmail | :327 | `auth/auth.service.ts:231,242`; `participants/participants.service.ts:282`; `entry/entry.service.ts:1923` | the user | immediate | `/set-password?token=` |
| 9 | sendPasswordResetEmail | :347 | `auth/auth.service.ts:764` | the user | immediate | `/reset-password?token=` |
| 10 | sendContributorCode | :357 | `billing/billing.service.ts:669` (route `billing.controller.ts:190`) | a named address | immediate | `app.myground.work` (bare) |
| 11 | sendUserInvite | :373 | `auth/auth.service.ts:659`; `users/users.service.ts:415,506` | the invitee | immediate | `/set-password?token=` |
| 12 | sendParticipantInvite | :385 | `grounds/grounds.service.ts:655,2507,2707,2838,3150`; `participants/participants.service.ts:414`; `grounds/grounds.cron.ts:90`; `conversation/remind.service.ts:164` | each invited participant **B** | immediate + **C** `0 6 * * *` | `/invite?token=` plus `/stop-reminders/<token>` |
| 13 | sendGroundApproved | :419 | `grounds/grounds.service.ts:3506` | ground initiator | immediate | caller-supplied url |
| 14 | sendGroundDeclined | :435 | `grounds/grounds.service.ts:3542` | ground initiator | immediate | none |
| 15 | sendLeadInvite | :448 | `grounds/grounds.service.ts:689` | the named lead | immediate | caller-supplied url |
| 16 | sendWebhookEndpointDying | :479 | `webhooks/webhooks.service.ts:376` | all org ADMINs **B** | from the every-minute delivery sweep, throttled 1/endpoint/24h (`webhooks.service.ts:347-354`) | `/org/integrations` |
| 17 | sendAdminOtp | :525 | `admin/admin.service.ts:798`; `back-office/back-office-door.service.ts:60` | the admin | immediate | no link, a 10-minute code |
| 18 | sendTeamAlert | :547 | `back-office/the-team-is-told.service.ts:38` | whole back-office roster **B** | on domain event | caller-supplied url |
| 19 | sendReportReady | :561 | `reports/reports.service.ts:2927` | **every** ground participant **B** | on release | `/grounds/:id/report` |
| 20 | sendGroundActivated | :583 | `reports/reports.listener.ts:140` | every PARTICIPANT-type party with a user **B** | on `ground.activated` | `/grounds/:id` |
| 21 | sendNudge | :597 | `grounds/grounds.cron.ts:551`; `conversation/remind.service.ts:186,347` | idle participants **B** | **C** `EVERY_DAY_AT_9AM` UTC and `EVERY_DAY_AT_8AM` UTC, plus a manual route | `/checkin/:id`; stop link only on the `remind.service.ts:347` path |
| 22 | sendSessionReady | :629 | `grounds/grounds.cron.ts:445` | each participant of a newly open session **B** | **C** `*/15 * * * *` UTC | `/checkin/:id` |
| 23 | sendLateCorrectionNotice | :648 | `reports/reports.listener.ts:210` | everyone who already saw the report **B** | on `check-in.completed` | `/grounds/:id` |
| 24 | sendActivationReminder | :661 | `grounds/grounds.cron.ts:579` | ground initiator | **C** daily 9AM UTC | `/grounds/:id` |
| 25 | sendActivationRevealReminder | :681 | `grounds/grounds.cron.ts:619` | each pending-reveal participant **B** | **C** daily 9AM UTC | `/grounds/:id/report` |
| 26 | sendParticipantCheckedIn | :694 | `reports/reports.listener.ts:165` | ground initiator | on check-in complete | `/grounds/:id` |
| 27 | sendWhoHasNotStarted | :718 | `conversation/remind.service.ts:412` | each lead **B** | **C** daily 8AM UTC | body built in `chasing-belongs-to-the-lead.ts` |
| 28 | sendJoinConfirmation | :737 | `entry/entry.service.ts:1857` | the asker | immediate | `/join/confirm?token=` |
| 29 | sendStalledNotification | :751 | `grounds/grounds.cron.ts:149` | every participant of every stalled ground **B** | **C** `EVERY_DAY_AT_3AM` UTC | `/grounds/:id` |
| 30 | sendResolutionProposal | :764 | `resolution/resolution.service.ts:166,253` | all other active parties **B** | immediate | `/grounds/:id` |
| 31 | sendGroundClosed | :778 | `resolution/resolution.service.ts:305` | all participants **B** | immediate | `/grounds/:id` |
| 32 | sendFeedbackRequest | :792 | `grounds/grounds.cron.ts:722` | each participant without feedback **B** | **C** `0 10 * * *` UTC | `/grounds/:id/report` |
| 33 | sendPaymentRequestEmail | :810 | `conversation/conversation.service.ts:272` | all org ADMINs **B** | immediate | `/billing?groundId=` |
| 34 | sendParticipantBlockedNudge | :824 | `conversation/conversation.service.ts:606` | ground initiator | immediate | `/grounds/:id` |
| 35 | sendPaymentFailed | :837 | `billing/billing.service.ts:1126` | org billing address | Stripe webhook | `/billing` |
| 36 | sendBillingChangeNotification | :849 | `billing/billing.service.ts:281` | all org ADMINs **B** | immediate | `/billing` |
| 37 | sendRecordPortabilityNotice | :863 | `billing/billing.service.ts:904` | **every** non-deleted user in the org **B** | on cancellation | `/users/me/export` (no such route) |
| 38 | sendSubscriptionConfirmed | :875 | `billing/billing.service.ts:986` | org email | Stripe webhook | `/billing` |
| 39 | sendSubscriptionCancelled | :892 | `billing/billing.service.ts:1048` | org email | Stripe webhook | `/billing` |
| 40 | sendSubscriptionPaymentFailed | :907 | `billing/billing.service.ts:1116` | org email | Stripe webhook | Stripe portal url |
| 41 | sendSubscriptionRenewal | :922 | `billing/billing.service.ts:1069` | org email | Stripe webhook | `/billing` |
| 42 | sendFreeExtensionClaimed | :940 | `billing/billing.service.ts:440` | all org ADMINs **B** | immediate | `/grounds/:id` |
| 43 | sendApproachingSessionLimit | :953 | `conversation/conversation.service.ts:297` | all org ADMINs **B** | immediate | `/grounds/:id` |
| 44 | sendMemberCapWarning | :966 | `billing/billing.service.ts:390` | all org ADMINs **B** | immediate | `/billing` |
| 45 | sendAbsenceReminder | :980 | `conversation/remind.service.ts:502` | the absent participant, once (`absenceToldAt`) | **C** daily 8AM UTC | `/checkin/:id` |
| 46 | sendCodeExpiryReminder | :1040 | `billing/code-expiry.scheduler.ts:54,78` | code creator and redeemer **B** | **C** `EVERY_DAY_AT_MIDNIGHT` UTC | `/grounds/new` or `/billing` |
| 47 | sendCareFeeConfirmation | :1073 | `billing/billing.service.ts:270` | all org ADMINs **B** | immediate | none |
| 48 | sendRoundDigest | :1094 | `email/round-digest.service.ts:103`; `reports/reviews-coming-up.cron.ts:112`; `assistant/assistant.service.ts:1386` | each participant **B** | on `round.completed`, and **C** `0 7 * * *` UTC | `/grounds/:id` plus `/unsubscribe/<token>` |

Private, not a notification: `sendEmail` at `:195`.

### Broadcast triggers, not fired during this audit

- `billing/billing.service.ts:904` — every user in the organisation, on cancellation. Widest fan-out in the product.
- `reports/reports.service.ts:2927` and `resolution/resolution.service.ts:305` — every participant of a ground.
- `grounds/grounds.cron.ts:149` — nested loop, every participant of every stalled ground, daily.
- `back-office/the-team-is-told.service.ts:38` — the whole internal roster, per event.
- Eight separate "all org ADMINs" loops across billing, conversation, participants and webhooks.

---

## 3. WhatsApp: every send path

Source: `api/src/modules/whatsapp/whatsapp.service.ts`, `api/src/modules/public-api/whatsapp-for-an-organisation.service.ts`.

| Path | Defined | Form | Recipient | Call sites |
|---|---|---|---|---|
| `sendMessage(phone, text)` | `whatsapp.service.ts:105` | Graph `type:'text'`, platform credentials (`:125-126`, `:133-138`) | raw phone | `whatsapp.controller.ts:83,97,106`; `grounds/grounds.cron.ts:450` |
| `sendFor(orgId, phone, text)` | `:159` | freeform text on org credentials, falls back to platform | phone | `whatsapp-for-an-organisation.service.ts:49,178`; `webhooks/webhooks.listener.ts:101` |
| `sendListFor(...)` | `:172` | Graph `interactive` list, max 10 rows (`:180-183`) | phone | `whatsapp-for-an-organisation.service.ts:94` |
| `deliver(...)` (private) | `:217` | `type:'text'` | phone | `:163,190,315` |
| `sendTest(orgId, to)` | `:311` | fixed freeform string (`:315`) | admin-supplied number | `whatsapp-for-an-organisation.controller.ts:62` |

**There are no Meta message templates in this codebase.** Every outbound WhatsApp body is freeform
`type:'text'` or `interactive`. A grep for `template` across the WhatsApp files returns nothing. The
per-message billing risk named in the audit brief therefore does not arise from template sends; it
arises from the session meter, see finding NL-014.

Inbound: platform route `whatsapp.controller.ts:64` and per-organisation route
`whatsapp-for-an-organisation.controller.ts:105`, both signature-verified and both fail closed.

---

## 4. Outbound webhooks: every event

Registry: `api/src/modules/webhooks/events-we-can-actually-send.ts:23-46`. Seven sendable, four
declared but never emitted (`:54-59`), and `validateEvents` (`:61-80`) refuses subscription to those four.

| Event | Webhook emit site | Domain event emitted at |
|---|---|---|
| `round.completed` | `webhooks/webhooks.listener.ts:53` | `grounds/round-completion.ts:63` |
| `checkin.opened` | `webhooks.listener.ts:105` | `grounds/grounds.cron.ts:497` |
| `checkin.completed` | `webhooks.listener.ts:131` | `grounds.cron.ts:289,672`; `entry/entry.service.ts:1654`; `conversation/conversation.service.ts:3251` |
| `blocker.raised` | `webhooks.listener.ts:169` | `conversation.service.ts:4836` |
| `blocker.escalated` | `webhooks.listener.ts:169` | `webhooks.cron.ts:75` |
| `handover.ready` | `webhooks.listener.ts:212` | `grounds/handover.service.ts:80` |
| `scenario.proposed` | `webhooks.listener.ts:231` | `detectors/scenarios.service.ts:111` |

Retry: `BACKOFF_SECONDS = [30, 120, 600, 1800, 7200, 21600, 43200]`
(`how-a-receiver-knows-it-was-us.ts:88`), seven attempts over roughly 21 hours, then `DEAD`
(`webhooks.service.ts:316`). Sweep is every minute, single-flight, `FOR UPDATE SKIP LOCKED`
(`webhooks.cron.ts:88-96`, `webhooks.service.ts:227-240`). Signing is
`X-Groundwork-Signature: t=<unix>,v1=<hex>` HMAC-SHA256 over `${timestamp}.${rawBody}`
(`how-a-receiver-knows-it-was-us.ts:22-26,41-55`), dual-signed across a secret rotation.
Payloads are hand-built allow-lists of ids, counts and permalinks
(`what-a-webhook-may-carry.ts:27-49,68-84,93-111`) and are organisation-scoped at
`webhooks.service.ts:157-159,171`.

---

## 5. Three-way cross-check

### (a) Templates or senders with no call site: DEAD

**None.** All 48 `send*` methods on `EmailService` have at least one non-spec call site. All five
WhatsApp send paths have non-spec call sites. Four webhook event names are declared and never emitted
(`events-we-can-actually-send.ts:54-59`), but `validateEvents` refuses subscriptions to them, so they
are documented-as-unavailable rather than dead code.

### (b) Call sites referencing something that does not exist: BLOCKER

**None at the method level.** Every `.send*` call in `api/src` resolves to a defined method.

**One at the URL level, which is the same class of defect.** `sendRecordPortabilityNotice`
(`email.service.ts:863`) links to `/users/me/export`, built at `billing/billing.service.ts:896`. There is
no such route in `client/src/App.tsx`. See NL-002.

### (c) Events a person would expect to be told about, with no notification at all

Derived from state changes the product actually performs.

| Event that happens in code | Told? | Where the state changes |
|---|---|---|
| I was added to a check-in | Yes, `sendParticipantInvite` | — |
| A session opened for me | Yes, `sendSessionReady` | — |
| A report was released | Yes, twice over, see (d) | — |
| Someone is waiting on me | Only the lead is told (`sendWhoHasNotStarted`); the blocked party is not | `conversation/remind.service.ts:412` |
| **My API access was approved** | **No email exists** | `public-api/access-is-asked-for-not-bought.ts`, `api-access.service.ts` |
| **My API access was declined or withdrawn** | **No email exists** | same |
| **My invitation is about to expire** | **No sender exists.** `GroundParticipant.inviteTokenExpiresAt` is set (`schema.prisma:1048`) and nothing warns before it lapses | `schema.prisma:1048` |
| **A WhatsApp message to me failed** | **No.** Log only | `whatsapp.service.ts:143,186,188,226,231`; `grounds.cron.ts:452` |
| **My email to you hard-bounced** | Recorded (`EmailDelivery.status = BOUNCED`, `delivery.service.ts:145-149`) and mirrored to `GroundParticipant.inviteDeliveryStatus`, but **the sender is never emailed and no alternative channel is tried** | `delivery.service.ts:152-167` |
| A webhook to my system failed repeatedly | Yes, `sendWebhookEndpointDying` | `webhooks.service.ts:376` |
| **A person was deactivated or removed from my organisation** | No notification to that person | `people/departure.service.ts` |
| **A quiet-hours or opt-out suppression dropped a message I was waiting for** | Log only, nobody is told and nothing is deferred | `email.service.ts:203-205`; `round-digest.service.ts:98-100` |

### (d) The same event notified twice by two paths

1. **Report ready, twice.** `reports/reports.listener.ts:110` handles `ground.activated`. It calls
   `reports.release(...)` at `:120`, which sends `sendReportReady` to every participant
   (`reports.service.ts:2927`). The same handler then sends `sendGroundActivated` to every
   participant-type party (`reports.listener.ts:140`). Two emails, seconds apart, both saying the
   shared report is ready, with two different links (`/grounds/:id/report` and `/grounds/:id`).
2. **Round complete, twice.** `sendRoundDigest` fires on `round.completed`
   (`round-digest.service.ts:57`) saying "everyone has checked in for round N", while
   `sendReportReady` fires on release saying the same thing. Both go to participants.
3. **Two nudge engines.** `conversation/remind.service.ts:222` (`EVERY_DAY_AT_8AM` UTC) and
   `grounds/grounds.cron.ts:378` (`EVERY_DAY_AT_9AM` UTC) both send `sendNudge` to participants with
   open check-ins. They use different throttles (`whatToDoToday` vs `NUDGE_THROTTLE_DAYS`) and share
   only the `lastNudgedAt` column, so whichever runs first suppresses the other by an hour of luck
   rather than by design.

---

## 6. What could not be checked

See the head of `notify_findings.md` for the delivery items that cannot be settled from code, and the
exact check that would settle each.

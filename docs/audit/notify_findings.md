# Groundwork notifications and links: findings

Read-only audit, 2026-09-10. No message of any kind was sent. Everything below is derived from code
and configuration, and is labelled as such.

## Stop conditions: none triggered

- No emailed link renders another user's data. Every path-id link was traced to an authorising route.
- No token works after use or after expiry.
- No secret value was found in the repository. `api/.env.example` carries placeholders only.

## Part 2, delivery: what could NOT be verified, and the check that would settle each

There is no test inbox and no test number, so none of the following can be answered from this repo.

| Question | Why code cannot answer it | The exact check that settles it |
|---|---|---|
| SPF | Lives in DNS for `myground.work`, not in the repo | `dig +short TXT myground.work` and confirm a single `v=spf1` record includes Resend's sender |
| DKIM | DNS, and Resend's own domain page | `dig +short TXT resend._domainkey.myground.work`; confirm "Verified" on the Resend domain |
| DMARC | DNS | `dig +short TXT _dmarc.myground.work`; check policy is at least `p=quarantine` with an `rua` |
| Inbox placement | Depends on reputation and content, not code | Send one of each template to a seeded set (Gmail, Outlook, an Apple address, a corporate Microsoft 365 tenant) and record folder |
| Elapsed time from trigger to arrival | Depends on Resend queue | Timestamp a real send against the received header chain |
| Reply-address behaviour | From is `Groundwork <noreply@myground.work>` (`api/src/config/configuration.ts:113`), no `reply_to` is ever set (`api/src/modules/email/email.service.ts:249`). `sendContributorCode` tells the recipient "reply to this email" (`email.service.ts:366`) | Reply to a real message and see whether it bounces or lands anywhere a person reads |
| Bounce handling end to end | The handler exists and is correct in code (below), but the Resend to endpoint hop is untested here | Register the endpoint, send to a known-invalid address, confirm the `email.bounced` event reaches `POST /webhooks/resend` and the row flips |

What the code DOES reveal about delivery is reported as findings NL-010, NL-012, NL-014, NL-034 and
NL-035 below.

---

ID: NL-001
Severity: Blocker
Axis: Security
Channel: email
Notification: sendAdminOtp (back-office door code, and the destructive-admin-operation code)
Observed: The six-digit code is generated with `String(Math.floor(100000 + Math.random() * 900000))`. `Math.random()` is a non-cryptographic PRNG whose internal state is recoverable from observed outputs. The same construction appears in both callers. The verifying route has no attempt counter, no lockout and no route-level throttle; only the global 60-requests-per-minute throttler applies (`api/src/app.module.ts:52`). A correct code opens the back office for one week (`back-office-door.service.ts:75`).
Expected: A one-time code that gates the platform back office and irreversible admin operations is unguessable.
Impact: Anyone who can observe a sequence of codes issued by the same process, or who can drive enough issuance, can predict a future code. The prize is a week-long pass to the platform console, which reads across every organisation.
Evidence: `api/src/modules/back-office/back-office-door.service.ts:51-52, 69-82`; `api/src/modules/admin/admin.service.ts:763-764`; `api/src/modules/back-office/back-office-door.controller.ts:27-35`; `api/src/app.module.ts:52`.
Needs code pass: Yes

ID: NL-002
Severity: Major
Axis: Link
Channel: email
Notification: sendRecordPortabilityNotice
Observed: The link is built as `${frontendUrl}/users/me/export` at `billing.service.ts:896`. There is no `/users/me/export` route in `client/src/App.tsx`. The email body prints the raw URL as its own link text and states "This link is valid for 30 days"; the URL carries no token and no expiry, it is a plain session-gated path.
Expected: The link opens a download of my record, and lasts the 30 days it claims.
Impact: Every non-deleted user in a cancelling organisation is emailed a broken link at the exact moment the product promises their record is portable. This is the widest broadcast in the product.
Evidence: `api/src/modules/billing/billing.service.ts:896, 902-908`; `api/src/modules/email/email.service.ts:863-874`; `client/src/App.tsx` (no matching route; `/grounds`, `/billing`, `/checkin/:id` etc. are at :376-521).
Needs code pass: Yes

ID: NL-003
Severity: Major
Axis: Timing
Channel: email
Notification: All scheduled mail except sendRoundDigest
Observed: `mayNotSend` in `nothing-lands-at-3am.ts:53` implements quiet hours against the recipient's own IANA timezone. Its only production call site is `round-digest.service.ts:95`. The central `sendEmail` (`email.service.ts:195`) never consults it. Every other cron sends on a fixed UTC clock: nudges at 08:00 and 09:00 UTC, stalled notices at 03:00 UTC, session-ready every 15 minutes, code-expiry at midnight UTC, feedback at 10:00 UTC.
Expected: The file named "nothing lands at 3am" governs all mail, not one sender.
Impact: A participant in Los Angeles is nudged at 01:00 local by the 08:00 UTC sweep and stall-notified at 20:00 local by the 03:00 UTC sweep. The session-ready mail can arrive at any hour of their night.
Evidence: `api/src/modules/email/nothing-lands-at-3am.ts:53-86`; `api/src/modules/email/round-digest.service.ts:95`; `api/src/modules/email/email.service.ts:195-256`; `api/src/modules/conversation/remind.service.ts:221`; `api/src/modules/grounds/grounds.cron.ts:114, 378, 391, 693`; `api/src/modules/billing/code-expiry.scheduler.ts:18`.
Needs code pass: Yes

ID: NL-004
Severity: Major
Axis: Consent
Channel: email
Notification: sendNudge (both scheduled paths), sendSessionReady, sendActivationRevealReminder, sendFeedbackRequest, sendStalledNotification
Observed: `remindersStoppedAt` is set by the stop link and is read by `whyNotRemindThem` (`ignoring-it-should-be-enough.ts:57`), which is reached only through `worthNudging`, whose only call site is the manual reminder at `remind.service.ts:137`. The scheduled sweep at `remind.service.ts:222` does not select the column and does not call it. `grounds.cron.ts` never references it at all.
Expected: The mail says "you can stop these", the person clicks, and the reminders stop.
Impact: A person who used the stop link keeps getting the daily nudge from the other engine, plus session-ready, reveal reminders, feedback requests and stall notices. The stop link works only against the reminder a lead presses by hand.
Evidence: `api/src/modules/conversation/stop-reminders.controller.ts:34-49`; `api/src/modules/conversation/ignoring-it-should-be-enough.ts:57-60`; `api/src/modules/conversation/who-is-worth-nudging.ts:65-91`; `api/src/modules/conversation/remind.service.ts:137, 236-256, 347`; `api/src/modules/grounds/grounds.cron.ts:445, 551, 619, 722` (no reference to `remindersStoppedAt` anywhere in the file).
Needs code pass: Yes

ID: NL-005
Severity: Major
Axis: Timing
Channel: email
Notification: sendReportReady and sendGroundActivated
Observed: One handler for `ground.activated` calls `reports.release(...)` at `reports.listener.ts:120`, which sends `sendReportReady` to every participant (`reports.service.ts:2927`), and then sends `sendGroundActivated` to every participant-type party (`reports.listener.ts:140`). Two emails, seconds apart, both announcing the shared report, with two different destinations: `/grounds/:id/report` and `/grounds/:id`.
Expected: One message when the report opens.
Impact: Every participant on every activated ground gets the same news twice with two different links, and neither says which one to use. It reads as a bug in front of a customer at the product's most important moment.
Evidence: `api/src/modules/reports/reports.listener.ts:110-146`; `api/src/modules/reports/reports.service.ts:2925-2928`; `api/src/modules/email/email.service.ts:561, 583`.
Needs code pass: Yes

ID: NL-006
Severity: Major
Axis: Consent
Channel: email
Notification: every sender classified "we decided to send it" except sendRoundDigest
Observed: The unsubscribe link is composed only in `digestBody` (`nothing-lands-at-3am.ts:120`). No other template contains an unsubscribe link, and `sendEmail` adds no footer and no `List-Unsubscribe` header (`email.service.ts:249`). The stop-reminders link is added only by `theWayToStopBeingChased`, called from `sendParticipantInvite` and `sendNudge`.
Expected: Every non-transactional mail carries a way to stop it, and a one-click header for the mail clients that use one.
Impact: A recipient of the session-ready mail, the reveal reminder, the feedback request, the stall notice, the absence reminder or the code-expiry reminder has no way out except the spam button, which costs the sending domain's reputation for every tenant.
Evidence: `api/src/modules/email/nothing-lands-at-3am.ts:113-126`; `api/src/modules/email/email.service.ts:171-193, 195-256, 629, 681, 751, 792, 980, 1040`.
Needs code pass: Yes

ID: NL-007
Severity: Major
Axis: Content
Channel: email, WhatsApp
Notification: sendNudge (return-nudge path) and sendSessionReady
Observed: `grounds.cron.ts:546` passes `p.recordEntries[0]?.text`, the participant's own last record entry, as the `groundLabel` argument to `sendNudge`, and it is rendered in the body at `email.service.ts:620`. `grounds.cron.ts:426, 445, 449` passes the same text into `sendSessionReady` as `lastCheckInContext` and into the WhatsApp body as `Last time: "..."`. `nothing-lands-at-3am.ts:1-11` states this rule and `digestBody` is built to make it impossible; these two senders bypass it.
Expected: What somebody wrote in a private check-in stays behind a login. The product says so in the invitation itself, at `email.service.ts:396`.
Impact: A participant's own private words leave for a mailbox their organisation's administrators can read, forward and export permanently, and for an unencrypted WhatsApp thread. The product's central promise is that nobody reads what you write.
Evidence: `api/src/modules/grounds/grounds.cron.ts:426, 445, 449, 543-551`; `api/src/modules/email/email.service.ts:620, 635-641`; `api/src/modules/email/nothing-lands-at-3am.ts:1-11, 104-112`.
Needs code pass: Yes

ID: NL-008
Severity: Major
Axis: User value
Channel: email
Notification: none exists (API access approved, declined, withdrawn)
Observed: `ApiAccessService.decide` writes the status, the decider and a mandatory note, logs one line, and returns. No email, no in-app record, no webhook. The code's own comment says "Somebody is going to be told no", and nothing tells them.
Expected: The person who asked for API access learns the answer.
Impact: A customer who asked for the integration waits with no answer, or discovers a working integration was switched off only when their calls start failing. The note that was required specifically so somebody could be told never reaches them.
Evidence: `api/src/modules/public-api/api-access.service.ts:155-181` (no EmailService dependency anywhere in the file).
Needs code pass: Yes

ID: NL-009
Severity: Major
Axis: User value
Channel: email
Notification: none exists (invitation about to expire)
Observed: `GroundParticipant.inviteTokenExpiresAt` is written at creation (14 days, `grounds.service.ts:631`) and at address change (90 days, `participants.service.ts:406`). No sender, no cron and no query anywhere warns before it lapses. `participants.service.ts:449` returns the same "already used or unknown" message for an expired link.
Expected: I am told before the link in my invitation stops working, and told clearly when it has.
Impact: A participant who comes back on day 15 is told their link is unknown, with no way to tell whether they are late or looking at the wrong mail, and no path to a new one.
Evidence: `api/prisma/schema.prisma:1047-1048`; `api/src/modules/grounds/grounds.service.ts:622-631`; `api/src/modules/participants/participants.service.ts:400-406, 428-462`.
Needs code pass: Yes

ID: NL-010
Severity: Major
Axis: Delivery
Channel: email
Notification: every invite-kind send
Observed: A hard bounce IS recorded. `applyDeliveryEvent` writes `EmailDelivery.status = BOUNCED` and mirrors it onto `GroundParticipant.inviteDeliveryStatus`, correctly guarding that an old bounce cannot override a newer resend. Nothing then happens: no email to the lead who invited them, no retry on a corrected address, no alternative channel, and no suppression of future sends to the same dead address, which keeps sending and keeps damaging domain reputation.
Expected: The person who invited somebody at a wrong address is told the mail did not arrive.
Impact: A lead waits on a participant whose invitation bounced, sees only "not started", and chases through the product for weeks. The daily nudge sweeps keep mailing the bounced address.
Evidence: `api/src/modules/email/delivery.service.ts:130-168`; `api/src/modules/email/email.service.ts:66-107` (the send guard checks preferences, never `inviteDeliveryStatus`); `api/prisma/schema.prisma:1043-1045`.
Needs code pass: Yes

ID: NL-011
Severity: Major
Axis: Consent
Channel: WhatsApp
Notification: every WhatsApp send path
Observed: There is no consent field on `WhatsAppConnection` (`schema.prisma:1878-1904`) or `WhatsAppThread` (`:1922-1931`). The number lives on `User.phoneNumber` and `Person.phone` as plain columns. Sending is gated only on a platform toggle or the organisation's `connection.enabled`. The email consent machinery is never consulted on a WhatsApp send, so an unsubscribed person still receives one. No STOP keyword is handled; the inbound router recognises only finish, complete, done and close.
Expected: Consent to be messaged on WhatsApp is captured, timestamped and revocable, and revoking it works.
Impact: A person cannot stop WhatsApp messages by any means the product offers. Meta policy requires opt-in for business-initiated messages; the code's only stand-in is a comment asserting that adding a number is opting in.
Evidence: `api/prisma/schema.prisma:1878-1904, 1922-1931`; `api/src/modules/whatsapp/whatsapp.service.ts:73-77, 159-165, 172-190, 339-343`; `api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:119, 154-155`; `api/src/modules/grounds/grounds.cron.ts:433-434, 447-455`.
Needs code pass: Yes

ID: NL-012
Severity: Major
Axis: Delivery
Channel: WhatsApp
Notification: every WhatsApp send path
Observed: No path retries. `deliver` returns `false` on a non-2xx or a throw; `sendFor` swallows it. Failures reach a log line and nothing else: no `EmailDelivery` equivalent, no in-app notice, no email to an admin. Compare the webhook channel, which has a seven-attempt backoff, a delivery log and an admin email when an endpoint dies.
Expected: A message that did not arrive is either retried or reported.
Impact: A person expecting a WhatsApp reminder gets nothing, and nobody in the organisation can find out that it failed.
Evidence: `api/src/modules/whatsapp/whatsapp.service.ts:143, 159-165, 186-190, 217-233`; `api/src/modules/grounds/grounds.cron.ts:450-454`; `api/src/modules/webhooks/webhooks.service.ts:316, 343-379` for the contrast.
Needs code pass: Yes

ID: NL-013
Severity: Major
Axis: Delivery
Channel: WhatsApp
Notification: business-initiated sends (session-ready, check-in opened, report)
Observed: No Meta message template exists anywhere in the codebase. Every outbound body is `type:'text'` or `interactive`. The 24-hour customer service window is not enforced: `lastInboundAt` is written and only ever displayed, and nothing compares it to now before sending.
Expected: A business-initiated message outside the 24-hour window uses an approved template, and the product knows which case it is in.
Impact: Every unprompted WhatsApp send outside the window will be rejected by Meta. Combined with NL-012 the rejection is invisible, so the channel appears to work and silently delivers nothing.
Evidence: `api/src/modules/whatsapp/whatsapp.service.ts:133-138, 180-183, 217-233, 269`; `api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:47, 178`; `api/src/modules/webhooks/webhooks.listener.ts:101`; `api/src/modules/grounds/grounds.cron.ts:450`.
Needs code pass: Yes

ID: NL-014
Severity: Blocker
Axis: Delivery
Channel: WhatsApp
Notification: WhatsApp-run check-in
Observed: `conversation.service.ts:634-637` decrements `sessionsBalance` and `:657-660` increments `freeSessionsUsed` inside `open()`. The WhatsApp path calls `open()` first and only then attempts the reply, through `sendFor`, which swallows a failure and returns `false`. The billable unit is consumed before, and independently of, whether anything reached the person.
Expected: The customer is charged for a session that happened.
Impact: An organisation's session balance is spent on a check-in whose first message never arrived. The person never sees it and nothing records that they did not.
Evidence: `api/src/modules/conversation/conversation.service.ts:634-637, 657-660`; `api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:49, 134, 247`; `api/src/modules/whatsapp/whatsapp.controller.ts:103`; `api/src/modules/whatsapp/whatsapp.service.ts:159-165`.
Needs code pass: Yes

ID: NL-015
Severity: Major
Axis: Security
Channel: WhatsApp
Notification: per-organisation WhatsApp connection
Observed: `WhatsAppConnection.accessToken`, `appSecret` and `verifyToken` are stored in plaintext columns and written raw. There is no encryption anywhere in `api/src`. `connectionFor` withholds the access token and app secret but returns `verifyToken` in full to any organisation admin. A comment in the adjacent schema block argues that integration secrets must be hashed rather than stored; this model does the opposite.
Expected: A permanent Meta system-user token is encrypted at rest and never returned by an API.
Impact: A read-only database leak hands over live send credentials for every connected organisation. No secret value is reproduced here; the locations are given.
Evidence: `api/prisma/schema.prisma:1889, 1891, 1893` and the neighbouring comment at `:1940-1942`; `api/src/modules/whatsapp/whatsapp.service.ts:259-273, 289, 293`; `api/src/modules/public-api/whatsapp-for-an-organisation.controller.ts:36, 46`.
Needs code pass: Yes

ID: NL-016
Severity: Major
Axis: Content
Channel: email
Notification: all 48 senders
Observed: `this.resend.emails.send({ from, ...options })` is called with `to`, `subject` and `html` only. No `text` field is ever set, so no message has a plain-text alternative. HTML-only mail is a well-known spam signal and is unreadable in text-only clients and some accessibility tooling.
Expected: Every message has a plain-text part.
Impact: Placement risk for every transactional message the product sends, including invitations and password resets.
Evidence: `api/src/modules/email/email.service.ts:249`; the layout wrapper at `:258-260`.
Needs code pass: Yes

ID: NL-017
Severity: Major
Axis: Security
Channel: email
Notification: sendParticipantInvite, sendLeadInvite, sendNudge, sendReportReady, sendGroundClosed, and most others
Observed: User-typed values are interpolated straight into HTML and into subjects with no escaping: `groundLabel`, `founderName`, `note`, `reason`, `participantEmail`, `endState`. Two senders escape and prove the rule: `sendWhoHasNotStarted` (`:721-724`) and `sendRoundDigest` via `escapeHtml` (`:1105-1112`). The `note` on a participant invite is free text supplied by the inviter and lands inside a styled block at `:389`.
Expected: Text somebody typed cannot change the structure of the mail it appears in.
Impact: An inviter can put arbitrary markup, including an anchor to an address they choose, into an invitation that arrives from `noreply@myground.work` and looks like the product's own. A label containing an ampersand or an angle bracket also renders as a broken sentence.
Evidence: `api/src/modules/email/email.service.ts:389-403, 448-470, 561-579, 597-627, 778-790`; the two escaping senders at `:718-735` and `:1094-1112`; call site passing raw `dto.label` at `api/src/modules/grounds/grounds.service.ts:655`.
Needs code pass: Yes

ID: NL-018
Severity: Minor
Axis: Content
Channel: email
Notification: sendMagicLinkEmail, sendUserInvite, sendContributorCode, sendAdminOtp, sendPaymentFailed, sendRecordPortabilityNotice, sendSomebodyIsWaiting
Observed: The product bans "account" in user-facing copy. Eight places use it in the sign-in sense: subject "Activate your Groundwork account" and three more uses in the same template, "create an account", "No account is active until you click the link", "your admin account", "keep your account active", "your organisation's Groundwork account has been cancelled", "They have an account and they cannot start". The product's own sense of the word, a person's account of what happened, is correct and should stay.
Expected: The vocabulary in the mail matches the vocabulary in the interface.
Impact: The one word the product refuses to use is in the subject line of the first email a new person ever gets from it.
Evidence: `api/src/modules/email/email.service.ts:132, 312, 313, 364, 378, 532, 842, 868`.
Needs code pass: No

ID: NL-019
Severity: Minor
Axis: Content
Channel: email
Notification: sendSubscriptionConfirmed, sendSubscriptionRenewal
Observed: Dates are formatted with `toLocaleDateString('en-US', ...)` with no `timeZone` option, so they render in the server's zone in US month-first order for every recipient worldwide. Amounts are printed as `$${(amountCents/100).toFixed(2)}` with no currency code.
Expected: A billing date states its timezone, and an amount states its currency.
Impact: A customer outside the US reads a renewal date that may be a day out and an amount that could be any dollar.
Evidence: `api/src/modules/email/email.service.ts:877, 925-928, 932`.
Needs code pass: Yes

ID: NL-020
Severity: Minor
Axis: Timing
Channel: email
Notification: sendRoundDigest
Observed: When `mayNotSend` returns `quiet_hours`, the loop logs and `continue`s. The digest is dropped, not deferred, and nothing re-queues it.
Expected: A message held for quiet hours arrives in the morning.
Impact: A participant whose round completes at 21:00 local never learns it completed. This is the one sender that respects quiet hours, and respecting them costs the message.
Evidence: `api/src/modules/email/round-digest.service.ts:95-101`; `api/src/modules/email/nothing-lands-at-3am.ts:71-85`.
Needs code pass: Yes

ID: NL-021
Severity: Minor
Axis: Timing
Channel: email
Notification: sendNudge
Observed: Two independent engines send the same nudge. `remind.service.ts:222` runs at 08:00 UTC with the `whatToDoToday` policy; `grounds.cron.ts:378` runs at 09:00 UTC with a `NUDGE_THROTTLE_DAYS` window. They coordinate only through `lastNudgedAt`, so the 09:00 job is suppressed by the 08:00 one having stamped the column an hour earlier, rather than by any rule.
Expected: One reminder engine with one policy.
Impact: If either job is retried, delayed past the other, or the throttle window is shortened, the same person gets two nudges the same morning. Two policies also means a lead's chase settings are honoured by one path and not the other.
Evidence: `api/src/modules/conversation/remind.service.ts:221-222, 347-360`; `api/src/modules/grounds/grounds.cron.ts:378-380, 536-556`.
Needs code pass: Yes

ID: NL-022
Severity: Major
Axis: User value
Channel: email
Notification: sendReportReady, sendRoundDigest, sendGroundActivated
Observed: The report link is `/grounds/:id/report` and the digest permalink is `/grounds/:id`. Both client routes are wrapped in `RequireOrgSetup`. `sendReportReady` goes to every row in `ground.participants`, including people invited by address who have never set a password.
Expected: Clicking the link in "your shared record is ready" shows me the record.
Impact: The participant who has met the product once, ten minutes ago, through an invite token, clicks the mail whose whole job is to bring them back and lands on a sign-in wall with no token and no stated way through. This is Part 7's second question failing on the product's most important message.
Evidence: `api/src/modules/reports/reports.service.ts:2925-2928`; `api/src/modules/email/round-digest.service.ts:78`; `client/src/App.tsx:392, 394`.
Needs code pass: Yes

ID: NL-023
Severity: Minor
Axis: Content
Channel: email
Notification: sendPaymentRequestEmail
Observed: The body says "A check-in in your workspace has used its free session" and then, in the next sentence, "Every check-in on the free tier runs unlimited sessions and reports." The subject says "Add a card to continue", and the body says nothing is blocked.
Expected: The message says what happened and what to do, and does not contradict itself.
Impact: The admin cannot tell whether anything is blocked or what adding a card buys them. It goes to every admin in the organisation.
Evidence: `api/src/modules/email/email.service.ts:810-822`.
Needs code pass: No

ID: NL-024
Severity: Minor
Axis: Consent
Channel: email
Notification: sendNudge from the manual reminder route
Observed: The manual path calls `sendNudge` without a `participantId` (`remind.service.ts:186`), and so does the return-nudge in `grounds.cron.ts:551`. `theWayToStopBeingChased` returns null without one, so no stop link is rendered. Only the scheduled path at `remind.service.ts:347` passes it.
Expected: The same reminder carries the same way out however it was triggered.
Impact: Whether a person can stop being chased depends on which of three code paths chased them.
Evidence: `api/src/modules/email/email.service.ts:171-193, 620`; `api/src/modules/conversation/remind.service.ts:186, 347-354`; `api/src/modules/grounds/grounds.cron.ts:551`.
Needs code pass: Yes

ID: NL-025
Severity: Minor
Axis: Security
Channel: email
Notification: sendAddPasswordEmail, sendUserInvite
Observed: `AuthService.validateToken` is a pre-flight for the set-password page that returns the email address and first name for a valid token, without consuming it.
Expected: A link that has not been used yet reveals nothing to somebody who is not its owner.
Impact: A forwarded or intercepted set-password link discloses whose it is before anybody uses it.
Evidence: `api/src/modules/auth/auth.service.ts:890`.
Needs code pass: Yes

ID: NL-026
Severity: Minor
Axis: Security
Channel: email
Notification: sendPasswordResetEmail
Observed: `resetPassword` consumes the token and writes the new password. No session version is bumped and no existing JWT is invalidated.
Expected: Resetting a password ends sessions somebody else may be holding, which is usually the reason for the reset.
Impact: A person who resets because they think somebody else is in does not put them out.
Evidence: `api/src/modules/auth/auth.service.ts:759, 775-790`.
Needs code pass: Yes

ID: NL-027
Severity: Minor
Axis: Link
Channel: email
Notification: unsubscribe versus stop-reminders
Observed: An unknown stop-reminders token returns `{ stopped: true }` with a kind sentence, by explicit design. An unknown unsubscribe token throws a 404 "That link is not valid." Two links on the product's own mail behave oppositely for the same input.
Expected: Somebody who wants the mail to stop is never told their link is invalid.
Impact: A recipient whose unsubscribe link is mangled by a mail client sees a failure and reaches for the spam button instead.
Evidence: `api/src/modules/conversation/stop-reminders.controller.ts:38-42`; `api/src/modules/email/round-digest.service.ts:155-157`.
Needs code pass: Yes

ID: NL-028
Severity: Minor
Axis: Link
Channel: email
Notification: sendParticipantInvite
Observed: The invite token expires after 14 days when the participant is created, and after 90 days when an admin corrects the address. Expiry is skipped entirely for anybody who has already accepted (`participants.service.ts:461-462`), which is deliberate. The invite preview route returns the ground label, the scenario, the initiator's full name and the invitee's address, and no throttle decorator is visible on it.
Expected: One stated lifetime for an invitation, and a preview that is rate limited like every other public token route.
Impact: Two lifetimes for the same kind of link, and an unthrottled endpoint that turns a leaked invite link into a small disclosure.
Evidence: `api/src/modules/grounds/grounds.service.ts:631, 2481, 2830`; `api/src/modules/participants/participants.service.ts:27, 400-406, 428-462`.
Needs code pass: Yes

ID: NL-029
Severity: Minor
Axis: Delivery
Channel: email
Notification: all senders, in a non-production environment
Observed: `isDev()` returns true whenever `NODE_ENV` is anything other than `production`, regardless of whether a real Resend key is configured. In that mode nothing reaches Resend; mail goes to a console line and a best-effort nodemailer relay to `127.0.0.1:1025`.
Expected: A staging deployment with real credentials sends real mail, or says loudly that it does not.
Impact: A staging or preview environment with `NODE_ENV` unset silently sends nothing, and the log line is the only evidence.
Evidence: `api/src/modules/email/email.service.ts:52-59, 214-248`.
Needs code pass: No

ID: NL-030
Severity: Note
Axis: Delivery
Channel: email
Notification: Resend delivery webhook
Observed: The webhook verifies a Svix signature over the raw body with a timing-safe compare and a 300-second timestamp tolerance, and fails closed on a missing secret, missing headers, a stale timestamp or a mismatch. Events are applied idempotently by the provider's own id. If `RESEND_WEBHOOK_SECRET` is unset in production the constructor logs a warning and every event is rejected, so all delivery and bounce tracking is inert with no other signal.
Expected: An inert delivery pipeline is visible somewhere a person looks.
Impact: No present harm if the secret is set. If it is not, NL-010 gets worse silently.
Evidence: `api/src/modules/email/delivery.service.ts:29-33, 66-101`; `api/src/modules/email/resend-webhook.controller.ts:14-24`.
Needs code pass: No

ID: NL-031
Severity: Note
Axis: Consent
Channel: email
Notification: the unsubscribe decision
Observed: `wouldTheyRatherNot` matches an address against `Person` rows across every organisation and stops the mail if ANY of them carries an `unsubscribedAt`. The comment says this is deliberate, to avoid telling somebody which tenants they belong to.
Expected: Stated behaviour, and it is stated.
Impact: A consultant who unsubscribes from one customer's digest stops hearing from every other customer they work with, including "asked for" mail such as a report they took part in. Worth a decision rather than a comment.
Evidence: `api/src/modules/email/email.service.ts:78-105`; `api/src/modules/email/nothing-goes-out-that-was-turned-off.ts:58-76`.
Needs code pass: No

ID: NL-032
Severity: Note
Axis: Consent
Channel: email
Notification: sendTeamAlert
Observed: The alert to the internal back-office roster is classified "we decided to send it", so an unsubscribed or notifications-off staff member silently stops receiving operational alerts about new organisations and API requests.
Expected: An operational alert to our own roster is not governed by a customer-facing preference.
Impact: A request for API access reaches nobody, and the log line is the only trace.
Evidence: `api/src/modules/email/nothing-goes-out-that-was-turned-off.ts:129`; `api/src/modules/back-office/the-team-is-told.service.ts:38`.
Needs code pass: No

ID: NL-033
Severity: Note
Axis: Consent
Channel: email
Notification: the preference model
Observed: `EmailPreference` carries `roundDigest`, `nudges`, `quietBeforeHour` and `quietAfterHour`. The central send guard reads only `unsubscribedAt` and `User.emailNotifications`. The per-type flags are consulted only by the digest service. There is no preference centre in the client; preferences are settable only through the public API.
Expected: Per-channel and per-type preferences that the senders actually read.
Impact: An organisation that sets `nudges: false` through the API still has its people nudged by both nudge engines.
Evidence: `api/prisma/schema.prisma:4547-4570`; `api/src/modules/email/email.service.ts:66-107`; `api/src/modules/email/nothing-lands-at-3am.ts:64-70`; `api/src/modules/public-api/public-api.controller.ts:451`.
Needs code pass: Yes

ID: NL-034
Severity: Note
Axis: Consent
Channel: email
Notification: deactivated and deleted users
Observed: Both nudge paths check `isActive` and `deletedAt` before sending. The report, resolution, billing and stall broadcasts iterate `ground.participants` or org users and do not. `billing.service.ts:897` does filter `deletedAt: null`.
Expected: A deactivated person stops receiving.
Impact: A leaver whose address has been reassigned inside their old company can receive a report-ready or ground-closed mail.
Evidence: `api/src/modules/conversation/remind.service.ts:132, 342-346`; `api/src/modules/reports/reports.service.ts:2927`; `api/src/modules/resolution/resolution.service.ts:305`; `api/src/modules/grounds/grounds.cron.ts:149`.
Needs code pass: Yes

ID: NL-035
Severity: Note
Axis: Security
Channel: email
Notification: every DB-backed token
Observed: Every emailed token is stored in plaintext except the admin OTP and the API client secret, both bcrypt. That covers email verification, password reset, password setup, participant invite, ground join, join confirmation, stop-reminders and unsubscribe. All are 192 to 256 bits of `crypto.randomBytes`, so guessing is not the risk.
Expected: A single-use credential that grants a session is not readable from a database dump.
Impact: A read-only database leak yields live sign-in and invite links until each expires.
Evidence: `api/prisma/schema.prisma:616, 629, 750, 865, 1047, 1074, 4563`.
Needs code pass: No

ID: NL-036
Severity: Note
Axis: Delivery
Channel: webhook
Notification: sendWebhookEndpointDying
Observed: A delivery that exhausts seven attempts over roughly 21 hours is marked `DEAD` and the admins are emailed once per endpoint per 24 hours. The endpoint itself is never deactivated, so every subsequent event keeps queuing, retrying and dying against a receiver known to be unreachable.
Expected: Stated behaviour, and the email says so honestly.
Impact: Sustained retry load against a dead receiver, and a delivery log that fills with the same failure. No present harm to a recipient.
Evidence: `api/src/modules/webhooks/webhooks.service.ts:119, 316, 329, 343-379`; `api/src/modules/webhooks/how-a-receiver-knows-it-was-us.ts:88-93`.
Needs code pass: No

ID: NL-037
Severity: Note
Axis: Timing
Channel: email
Notification: sendSessionReady and the daily reminder sweep
Observed: The every-15-minute session-ready job and the daily 09:00 reminder job take the same advisory lock, `CronLock.SEND_REMINDERS`.
Expected: Two unrelated jobs do not contend for one lock.
Impact: A long session-ready pass overlapping 09:00 causes the daily reminders to be skipped for that day with no retry.
Evidence: `api/src/modules/grounds/grounds.cron.ts:378-380, 391-393`.
Needs code pass: Yes

ID: NL-038
Severity: Note
Axis: User value
Channel: in app
Notification: none exists
Observed: There is no persisted notification model in `api/prisma/schema.prisma`. The in-app channel is ephemeral toasts and a `tell` notice. Nothing records that a person was notified, nothing shows an unread state, and nothing lets somebody catch up on a message they missed.
Expected: A person who was emailed about something can find the same thing in the product.
Impact: Every failure above, a suppressed mail, a bounce, a quiet-hours drop, a failed WhatsApp send, is invisible in the product because there is nowhere in the product for a notification to be.
Evidence: `api/prisma/schema.prisma` (no `Notification`, `Alert` or `InAppMessage` model); `api/src/modules/email/email.service.ts:203-205` (suppression is a log line).
Needs code pass: Yes

---

## Part 7: does the loop close

Answering as the recipient, for every notification that carries a link.

Closes cleanly: participant invite, lead invite, verification, sign-in link, set password, password
reset, join confirmation, stop-reminders, unsubscribe, somebody-is-waiting, you-are-in-now, ground
approved, ground declined, webhook endpoint dying, all seven billing links, activation reminder,
who-has-not-started, session-ready, nudge, absence reminder.

Does not close, filed above as Major:

- **Report ready, round digest, ground activated.** Why did I get this: everybody checked in. What am
  I supposed to do: read the record. Would clicking let me: not if I am an invited participant with no
  password. NL-022.
- **Record portability notice.** Why: your organisation cancelled. Do: download your record. Would
  clicking let me: no, the route does not exist. NL-002.
- **Report ready and ground activated together.** Why did I get this twice, and which link is the
  right one: no answer in either message. NL-005.
- **API access decided.** There is no message at all, so the loop never opens. NL-008.

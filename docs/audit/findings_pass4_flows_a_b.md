# Pass 4, flows a and b: anonymous entry, invited participant

## Blockers

```
ID: P4-A01  Severity: Blocker  Axis: Security
Location: api/src/modules/auth/auth.service.ts:570-580 and :606; api/src/modules/entry/entry.service.ts:1352-1357;
  client/src/pages/auth/MagicVerifyPage.tsx:220-229
Observed: POST /auth/entry-save is public. For an address that already has an account it overwrites
  that user's EntryDraft with the caller's payload and history, clears consumedAt and groundId, and
  returns a fresh draftToken to the unauthenticated caller, who can keep editing it through
  PATCH /entry/draft. The same call emails the victim a magic link, and MagicVerifyPage always
  attempts commit on arrival. commit overlays the draft, and commitInner renames the organisation
  from the payload and invites the payload's contributors.
Impact: anybody who knows a customer's email can destroy their unsubmitted session, plant a
  transcript, rename their organisation, spend a free check-in and cause invites to go out from
  their organisation to addresses the attacker chose. The victim only had to open a sign-in link.
Confidence: High
```

```
ID: P4-B01  Severity: Blocker  Axis: Security
Location: api/src/modules/entry/entry.service.ts:1874-1964; compare participants.service.ts:159-236
Observed: joinConfirm creates the user, the organisation membership, the participant row and the
  check-in with no approval check, no MembershipRequest, no awaitingOrgApproval and no seat-cap
  check. The invite path applies all four.
Impact: a join link is meant to be forwarded to a cohort. Anyone holding one becomes a member of
  that organisation, unapproved and unmetered, with an active check-in, and the seat cap the invite
  path enforces is bypassed.
Confidence: High
```

## Majors

P4-A02 `lastReplyHadCloseMarker` is mutable state on a singleton service read by the controller
after an await, so on a public unauthenticated route one visitor's close decides another's
(entry.service.ts:1039, entry.controller.ts:256). P4-A03 MagicVerifyPage turns every commit refusal
into "Something went wrong... start again from there", including the plan limit, the seat limit and
"you have not been named as able to open check-ins"; the signed-in save path does the opposite
(MagicVerifyPage.tsx:141 vs EntryChatPage.tsx:2066-2072). P4-A04 a merely slow concurrent commit
throws COMMIT_IN_PROGRESS, which the client renders as "we don't have a copy of it" and offers a
button that discards the intact draft. P4-A05 the billing and permission gates run inside
commitInner, after the whole setup chat, the check-in and the report have been paid for. P4-A06 the
ground is created and counted before any invite is sent, so a total invite failure leaves a spent
free slot on a ground that cannot do its job, and nothing says so.

P4-B02 JwtAuthGuard returns true for a public route without running passport, so `req.user` is
always null on POST /participants/accept and the "resume in this browser" branch is unreachable;
every returning participant is emailed and told it is a new device. P4-B03 a participant queued for
approval is signed in, sent to the check-in, refused, and shown "This is usually a temporary issue"
with a retry that can never work; `WAITING_TO_BE_LET_IN` appears nowhere in the client. P4-B04 the
seat-cap hold and the future-start hold both write `invitedAt: null`, collapse to one boolean, and
the lead is told a person "will be invited on the start date" when no invite is coming. P4-B05
JoinConfirmPage sets the auth store to empty strings with no profile refresh and persists it.
P4-B06 the join preview and accept never check ground status and the token never expires, while
both error strings claim an expiry; someone can join a finished ground and be given a session on it.
P4-B07 a cross-organisation joiner is signed in with a token carrying their home organisation.

## Lower

P4-A07 a failed entry report survives only as a toast. P4-A08 the public entry routes have no
maximum turn count or content length and emit no usage event. P4-A09 `/entry/opener` is the only
public entry route with no throttle of its own. P4-B08 the invite not-found message says "already
been used" although the token deliberately survives use now. P4-B09 every join-accept failure is
one toast telling the person to try again. P4-B10 the `joinToken` branch of `chat()` is dead and
would serve a ground brief to an unauthenticated caller. P4-B11 pending-join marking is ordered the
safe way; no harm.

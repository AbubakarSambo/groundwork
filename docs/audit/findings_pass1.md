# Pass 1: users and permissions

Read-only static audit of the guards, decorators and in-service checks in `api/src`, compared against the
route guards and conditional rendering in `client/src`. No file outside this one was written.

## The guard stack, as it actually runs

Global, in order (`api/src/app.module.ts:88-95`): `ASyncLoopIsNotABrowser`, `JwtAuthGuard`, `RolesGuard`,
`BackOfficeDoorGuard`.

- `JwtAuthGuard` (`api/src/common/guards/jwt-auth.guard.ts:12-23`) stands down on `@Public()`.
- `RolesGuard` (`api/src/common/guards/roles.guard.ts:15-18`) returns `true` when a route declares no
  `@Roles`. An undecorated authenticated route is open to every signed-in member of every organisation.
- `@Roles(Role.ADMIN)` means ORG admin. Platform admin is a separate guard, `PlatformAdminGuard`
  (`api/src/common/guards/platform-admin.guard.ts:9-14`).
- `BackOfficeDoorGuard` (`api/src/modules/back-office/back-office-door.guard.ts:14-28`) applies only to
  paths matching `^/api/v1/(ops|admin)` (`api/src/modules/back-office/the-back-office-has-a-door.ts:28`).
  It checks a pass, not staff-ness; who may enter is decided per controller by `OpsCapabilityGuard` or
  `PlatformAdminGuard`.
- Machine callers: `MachineTokenGuard` (`api/src/modules/public-api/machine-token.guard.ts:49-117`) —
  `typ: 'machine'` required, scope required, org taken from the signed claim.
- Panel callers: `EmbedSessionGuard` (`api/src/modules/embed/embed-session.guard.ts:27-43`) —
  `typ: 'embed'`, org and person from the claim.
- Sessions are re-read from the database on every request
  (`api/src/modules/auth/strategies/jwt.strategy.ts:32-53`), so deactivation and demotion take effect
  immediately. There is no stale-JWT-outlives-a-demotion bug.

## Role by resource

Allowed = the code enforces it. Denied = the code refuses it. UNENFORCED = the code permits it but
something in the product assumes otherwise (a comment, a sibling route, a hidden button, or the product's
own privacy claim). Every UNENFORCED cell has a finding.

| Resource | Anonymous | Org MEMBER | Org ADMIN | OpsPerson (/ops) | Platform admin (/admin) | Machine (ApiCredential) | Embedded panel |
|---|---|---|---|---|---|---|---|
| Ground: list | denied | allowed, own only (`grounds.service.ts` `list`, party filter) | allowed, whole org | n/a | n/a | allowed, org-scoped | allowed, own only |
| Ground: read one (`GET /grounds/:id`) | denied | **UNENFORCED** (P1-002) any org member reads any ground incl. brief, shared picture, agreements, signals | allowed | n/a | n/a | allowed, org-scoped | allowed, own only |
| Ground: create | denied | allowed (queued for approval) | allowed | n/a | n/a | allowed (`grounds:write`) | allowed, as self |
| Ground: edit brief / context note | denied | denied | allowed (`grounds.service.ts:2135-2160`) | n/a | n/a | denied | denied |
| Ground: chasing, closing session, invite URL | denied | denied | denied, initiator only (`grounds.service.ts:4537-4544`) — but offered in the UI (P1-019) | n/a | n/a | denied | denied |
| Ground: delete | denied | denied | denied, initiator only and only while untouched | n/a | n/a | denied | denied |
| Ground: approve / decline / activate | denied | denied | allowed | n/a | n/a | denied | denied |
| Check-in (own) | denied | allowed, owner only (`conversation.service.ts` `loadOwnedCheckIn`) | same | n/a | n/a | allowed, org-scoped | allowed, own only |
| Record entries / dispute | denied | allowed, own entries only | same | n/a | n/a | n/a | n/a |
| Report: read | denied | **UNENFORCED** (P1-001) any org member reads any report **with the lead's view** | allowed | n/a | n/a | allowed (`reports:read`) | own session report only |
| Report: generate / release | denied | denied | allowed, org-scoped | n/a | n/a | denied | denied |
| Board: read | denied | denied unless party (`board.service.ts:196-203`) | allowed | n/a | n/a | n/a | n/a |
| Board: objectives / poll question | denied | denied | denied, initiator only (`board.service.ts:1003`) | n/a | n/a | n/a | n/a |
| Documents: upload | **UNENFORCED** (P1-005) invite-token upload skips the transcript-consent gate and never checks token expiry or use | allowed, party only | party only | n/a | n/a | n/a | allowed, own check-ins |
| Documents: read / visibility / delete | denied | uploader-scoped | uploader-scoped (UI offers more, P1-018) | n/a | n/a | n/a | uploader-scoped |
| Alignment: figures, assertions, agreements | denied | **UNENFORCED** (P1-006) may write against any ground id in the org, party or not | same | n/a | n/a | n/a | n/a |
| Objective drafts (panel) | denied | n/a | n/a | n/a | n/a | allowed, org-scoped | **UNENFORCED** (P1-007) any panel user reads, edits and seeds any draft in the org |
| Participants: invite, role, email | token-scoped (`participants.service.ts:428-466`, single use + expiry) | party only | party only | n/a | n/a | allowed | may register a person |
| People / SCIM roster | denied | denied | allowed | n/a | n/a | allowed, org-scoped | may add a person |
| Subjects / objectives | denied | denied | allowed | n/a | n/a | allowed, org-scoped | denied |
| Credentials | denied | denied | allowed, org-scoped (`credentials.controller.ts:22-23`) | n/a | n/a | denied | denied |
| API access request | denied | denied | allowed | n/a | allowed | n/a | n/a |
| WhatsApp connection | webhook only, HMAC-verified | denied | allowed, org-scoped | n/a | n/a | n/a | n/a |
| Billing: read status | denied | allowed, counts withheld | allowed | n/a | n/a | n/a | n/a |
| Billing: subscription, purchase, codes | denied | denied | allowed, org-scoped | n/a | mint codes, platform stats | n/a | n/a |
| Billing: free extension | denied | denied | **UNENFORCED** (P1-003) writes a session onto any ground id in any organisation | n/a | n/a | n/a | n/a |
| Pattern detections: rate | denied | denied | **UNENFORCED** (P1-004) writes onto any detection in any organisation, feeding the platform statistic | n/a | intended holder | n/a | n/a |
| Org settings | denied | denied | allowed, org-scoped | n/a | n/a | n/a | n/a |
| Ops back office | denied | denied | denied (`User.role` is never read in the ops path) | allowed, capability-gated | allowed, auto-admitted as CEO (P1-017) | denied | denied |
| Platform console `/admin` | denied | denied | denied | denied unless platform admin | allowed, door + OTP on the three heaviest routes | denied | denied |
| Platform data outside `/admin` (prompts, patterns, coach requests, feedback, billing stats) | denied | denied | denied | denied | allowed, **but not behind the back-office door** (P1-009) | denied | denied |

Cross-organisation reads: none found. Two cross-organisation WRITES found, P1-003 and P1-004.

---

## Findings

ID: P1-001
Severity: Blocker
Axis: Security
Location: api/src/modules/reports/reports.service.ts:3554-3555, 1841-1845, 1934-1944, 2496-2499
Observed: `get`, `sessionReport`, `rounds` and `whereAgainstSuccess` compute a variable named `isOrgAdmin` from the organisation alone, with no role test. Any authenticated user whose `organizationId` matches the ground's passes. The same variable then sets `viewerIsLead`, so that user receives the lead's view: resolved names, `whatItRestsOn`, `whatTheRecordHolds`, and the probe list.
Expected: the code's own comment says "Org admins can read reports for grounds in their own org" (reports.service.ts:3553). `grounds.service.ts` `list` filters non-admins to their own grounds, and `board.service.ts:199-203` writes the same rule correctly as `viewer?.role === 'ADMIN' && viewer.organizationId === ground.organizationId`. The product's claim is that accounts are independent and reports are read by parties and admins.
Impact: every member of a customer organisation can read every other team's report, including a PIP or an evaluation, by holding a ground id. The reports module is the one surface that synthesises what people said privately.
Evidence: `const isOrgAdmin = !isInitiator && !participant && !!requestingUserOrgId && ground.organizationId === requestingUserOrgId;` (reports.service.ts:3554), then `if (!participant && !isInitiator && !isOrgAdmin) throw` (:3555), then `viewerIsLead: isInitiator || isOrgAdmin` (:3734). Compare board.service.ts:199-203. `an-org-admin-reads-with-the-lead-s-eyes.spec.ts` never sets a role, so no test catches it.
Confidence: High

ID: P1-002
Severity: Blocker
Axis: Security
Location: api/src/modules/grounds/grounds.service.ts (`get`, primary lookup and its return), api/src/modules/grounds/grounds.controller.ts:248-252
Observed: `GET /grounds/:id` looks the ground up as `findFirst({ where: { id, organizationId } })` with no party test, and the comment says "works for org members and the initiator". The response carries the brief, the objectives, the participant list, the pattern signals, the context notes, and the report's `sharedPicture`, `agreements` and `divergences`.
Expected: the same file's `list` restricts non-admins to grounds they created or were invited to. `board.service.ts` and the setup sign-off helper `assertMaySeeGround` (grounds.service.ts:3055-3069) both require party or org ADMIN. The ground page is not meant to be an org-wide reading room.
Impact: any member can read the shared picture of any check-in in the organisation without going near the report route, which is the route people think of as the walled one.
Evidence: `let ground = await this.prisma.ground.findFirst({ where: { id, organizationId }, include: { ... report: { select: { ... sharedPicture: true, agreements: true, divergences: true } } ... } })`. The only role test downstream is `viewerAdminsThisOrg`, used for peer visibility and naming, never for entry.
Confidence: High

ID: P1-003
Severity: Blocker
Axis: Security
Location: api/src/modules/billing/billing.service.ts:395-410, api/src/modules/billing/billing.controller.ts:61-69
Observed: `POST /billing/free-extension` is `@Roles(Role.ADMIN)`. `claimFreeExtension` checks only the caller's own organisation flag, then runs `this.prisma.ground.update({ where: { id: groundId }, data: { sessionsBalance: { increment: 1 } } })` with no `organizationId` and no prior ownership lookup.
Expected: the two sibling routes in the same file both resolve the ground first: `purchaseSession` uses `ground.findFirst({ where: { id: groundId, organizationId } })` (billing.service.ts:214) and `redeemContributorCode` does the same (billing.service.ts:678-687).
Impact: an org admin at customer A who holds or guesses a ground id at customer B grants that ground a paid session, and burns their own one free extension doing it. The `billingEvent` row is written with the caller's `organizationId` and the victim's `groundId`, so the money record and the effect disagree.
Evidence: billing.service.ts:404-407, the transaction: `organization.update({ where: { id: organizationId } })` beside `ground.update({ where: { id: groundId } })`.
Confidence: High

ID: P1-004
Severity: Blocker
Axis: Security
Location: api/src/modules/patterns/patterns.service.ts:684-693, api/src/modules/patterns/patterns.controller.ts:31-38
Observed: `PATCH /patterns/:id/rate` is `@Roles(Role.ADMIN)`, i.e. org admin. `rateAccuracy` writes `patternDetection.update({ where: { id: detectionId }, ... })` with no organisation, ground or participant join.
Expected: the service's own doc comment one line above says "Only platform admins can rate" (patterns.service.ts:686). The sibling route `GET /patterns/accuracy` was moved to `PlatformAdminGuard` for exactly this reason, and the comment at patterns.controller.ts:13-22 records the fix.
Impact: any customer's admin writes accuracy ratings onto another customer's pattern detections, and those ratings feed `codeAccuracySummary()` (patterns.service.ts:699-708), the platform-wide statistic shown on the prompts dashboard. A number presented as fact becomes wrong.
Evidence: `@Patch(':id/rate') @Roles(Role.ADMIN)` (patterns.controller.ts:31-32) against `where: { id: detectionId }` (patterns.service.ts:690).
Confidence: High

ID: P1-005
Severity: Major
Axis: Security
Location: api/src/modules/documents/documents.service.ts:497-530, api/src/modules/documents/documents.controller.ts:14-30
Observed: `POST /documents/invite-upload?token=` is `@Public()`. `uploadByInviteToken` resolves `groundParticipant.findUnique({ where: { inviteToken: token } })` and writes the document. It never checks `inviteTokenExpiresAt`, never checks whether the invite was already consumed, and never runs `looksLikeAConversation` / `consentConfirmed`.
Expected: `participants.service.ts:428-466` (`loadByToken`) enforces both single use and a 90-day expiry on the same token. The authenticated upload path refuses a transcript until somebody confirms the people in it know (documents.service.ts:293-295), and the comment there calls that refusal the point of the feature.
Impact: anybody holding an old invite email can push a 10 MB document, including a meeting transcript, onto that ground with no consent question asked. It is then assessed and anchored into the conversation.
Evidence: documents.service.ts:505-507 (the bare token lookup) and :514-527 (the create, with no `isConversation` / `consentConfirmedAt` and no `defaultVisibilityForUpload()`), against documents.service.ts:280-295.
Confidence: High

ID: P1-006
Severity: Major
Axis: Security
Location: api/src/modules/alignment/alignment.service.ts:40-58; api/src/modules/alignment/assertions.service.ts:50-53; api/src/modules/alignment/agreements.service.ts:52-56, 68-81
Observed: the four create paths under `grounds/:groundId/alignment` write a row carrying the caller's `organizationId` and the caller-supplied `groundId` with no lookup of the ground at all: no existence check, no organisation check, no participant check. Reads re-filter on `organizationId`, so this is not a cross-tenant read.
Expected: the sibling `POST parties` in the same module does it correctly: `ground.findFirst({ where: { id: groundId, organizationId: callerOrganizationId } })` (parties.service.ts:44-49).
Impact: any member can plant figures, assertions and agreements against any ground in their organisation, including check-ins they are not on, and those rows surface in that ground's alignment feed as things somebody said. `agreements.mustBeAbleToSpeakForThisSide` reads the initiator with `findUnique({ where: { id: groundId } })` and no organisation filter (agreements.service.ts:69-72).
Evidence: `return this.prisma.reportedFigure.create({ data: { organizationId, groundId, ... } })` (alignment.service.ts:40-43) with nothing above it that reads the ground.
Confidence: High

ID: P1-007
Severity: Major
Axis: Security
Location: api/src/modules/drafts/drafts.controller.ts:29-67, api/src/modules/drafts/drafts.service.ts:203-235, 359
Observed: five of the six panel draft routes pass only `req.panel.organizationId` and the draft id. `status`, `resolveContention` and `seed` never receive the acting person at all, and the service resolves the draft with `objectiveDraft.findFirst({ where: { id: draftId, organizationId } })`.
Expected: the panel's stated safety property is that the acting person comes from the session and cannot be sent by the caller (public-api.controller.ts:669-677). `invite` and `contribute` do pass `req.panel.externalId`, so participation is a concept the module has and does not enforce for reading or settling.
Impact: any person with a panel session can read any objective draft in the organisation, settle somebody else's disagreement, and turn the draft into an objective on the board.
Evidence: `status(@Req() req, @Param('id') id) { return this.drafts.status(req.panel.organizationId, id) }` (drafts.controller.ts:32-34) against `drafts.service.ts:359`.
Confidence: High

ID: P1-008
Severity: Major
Axis: Security
Location: api/src/modules/back-office/back-office-door.service.ts:51; api/src/modules/admin/admin.service.ts:763
Observed: both six-digit codes that gate the back office and the three heaviest platform-admin routes are generated with `String(Math.floor(100000 + Math.random() * 900000))`.
Expected: `crypto.randomBytes` is used for every other credential in the codebase, for example the participant invite token at grounds.service.ts:622 and the draft token at auth.service.ts:575.
Impact: `Math.random` is not a cryptographic generator. A code drawn from it is predictable from observed output, which removes the second factor in front of `/ops`, `/admin`, and the add-platform-admin and remove-platform-admin routes.
Evidence: back-office-door.service.ts:51-53 (hashed with bcrypt afterwards, which does not help a predictable input) and admin.service.ts:763-765.
Confidence: High

ID: P1-009
Severity: Major
Axis: Inconsistency
Location: api/src/modules/back-office/the-back-office-has-a-door.ts:27-32; api/src/modules/billing/billing.controller.ts:249-254; api/src/modules/coach/coach.controller.ts:86-93; api/src/modules/prompts/prompts.controller.ts:30; api/src/modules/patterns/patterns.controller.ts:24-25; api/src/modules/feedback/feedback.controller.ts:81-87
Observed: the door matches on the URL prefix `/api/v1/ops` and `/api/v1/admin` only. Platform-admin-only data living on other prefixes is reached with a session alone, no code: `GET /billing/admin/stats` (all orgs, codes and redemptions), `GET /coach/requests` (other companies' names, addresses and written problems), the whole `/prompts` controller including `platform-dashboard` and `org-list`, `GET /patterns/accuracy` (all orgs), and `GET /feedback`.
Expected: the door's own header says the back office needs a second question, and its stated audience is "the team's own system and the platform console". Nothing about `/billing/admin/stats` is less sensitive than `/admin/dashboard`.
Impact: the second factor protects a path prefix rather than a privilege. A stolen platform-admin session reaches most of the platform's cross-org data without meeting the door.
Evidence: `const THE_BACK_OFFICE = /^\/api\/v1\/(ops|admin)(\/|$|\?)/;` (the-back-office-has-a-door.ts:28) against `@Get('admin/stats') @UseGuards(PlatformAdminGuard)` on `@Controller('billing')` (billing.controller.ts:249-251).
Confidence: High

ID: P1-010
Severity: Minor
Axis: Security
Location: api/src/modules/public-api/machine-token.guard.ts:55-104; api/src/modules/public-api/credentials.service.ts:159-166
Observed: revoking a credential sets `revokedAt` on the row. `MachineTokenGuard` verifies the token's signature and reads its claims; it never loads the credential row, so it cannot see the revocation. `TOKEN_TTL_SECONDS = 900` (public-api.controller.ts:41).
Expected: an admin who presses revoke expects the integration to stop.
Impact: a revoked credential keeps working for up to fifteen minutes, including after a leak is discovered. The guard already hits the database twice per request for the call counter, so a revocation check would cost nothing new.
Evidence: machine-token.guard.ts:81-87 queries `apiCall` but never `apiCredential`.
Confidence: High

ID: P1-011
Severity: Minor
Axis: Security
Location: api/src/modules/back-office/back-office-door.service.ts:69-82
Observed: `verify` compares the submitted code and returns an error on mismatch. There is no attempt counter, no lockout, and no invalidation of the code after a wrong guess. The only limit is the global throttler at 60 requests a minute per address.
Expected: an emailed one-time code normally dies after a small number of wrong attempts.
Impact: a ten-minute window at sixty guesses a minute is six hundred attempts per code against a million-value space, repeatable by asking for a new code. Combined with P1-008 this stops being theoretical.
Evidence: back-office-door.service.ts:73-74, `const ok = await bcrypt.compare(...); if (!ok) throw new BadRequestException(...)` with no write.
Confidence: High

ID: P1-012
Severity: Minor
Axis: Security
Location: api/src/modules/back-office/back-office-door.service.ts:69-82
Observed: `sendCode` refuses a caller who is not staff (:48). `verify` never re-checks `isStaff`.
Expected: the two halves of one door apply the same rule.
Impact: somebody removed from the ops roster between asking for a code and entering it still receives a week-long pass. The pass grants nothing on its own, because `OpsCapabilityGuard` and `PlatformAdminGuard` still run, so this is defence in depth rather than a live hole.
Evidence: back-office-door.service.ts:70-78 has no `isStaff` call.
Confidence: High

ID: P1-013
Severity: Minor
Axis: Security
Location: api/src/modules/auth/strategies/jwt.strategy.ts:52; api/src/modules/back-office/the-back-office-has-a-door.ts:37
Observed: `signedInVia` is the one field the JWT strategy takes from the token rather than from the database row. `mayOpen` treats `signedInVia === 'google'` as a permanent exemption from the code.
Expected: every other field in `validate()` is re-read from the row precisely so a change takes effect at once.
Impact: a token minted through Google keeps the door exemption for the whole life of the token regardless of any later change to how that account signs in. Narrow, and limited to the door.
Evidence: `signedInVia: payload.via ?? null` (jwt.strategy.ts:52) against `if (f.signedInVia === 'google') return { open: true, because: 'google' }` (the-back-office-has-a-door.ts:37).
Confidence: High

ID: P1-014
Severity: Minor
Axis: Data integrity
Location: api/src/modules/public-api/a-check-in-a-customer-can-run.service.ts:446-451
Observed: the panel's document attach resolves the check-in with `checkIn.findUnique({ where: { id: checkInId }, select: { groundId: true } })`, with neither the organisation nor the acting person in the where clause. Every other method on the same service scopes both, for example `statedSuccess` at :341-344.
Expected: consistency with the sibling methods.
Impact: nothing leaks, because `documents.upload` then calls `assertParticipant(groundId, userId)` (documents.service.ts:280, 627-632) and refuses. The route is safe by a check two files away, which is the arrangement the module's own comments argue against.
Evidence: a-check-in-a-customer-can-run.service.ts:446-449 against :341-344.
Confidence: High

ID: P1-015
Severity: Minor
Axis: Security
Location: api/src/modules/entry/entry.service.ts:1745-1782; api/src/modules/entry/entry.controller.ts:206-214
Observed: `PATCH /entry/draft` is `@Public()`. The `pendingSignup` branch accepts a 200 KB object and merges it, including the organisation name, with no expiry check and no consumed check. The `entryDraft` branch checks `consumedAt` but not an expiry.
Expected: every other token in this area is bounded. `pendingJoin` is checked for both use and expiry at entry.service.ts:1877-1880, and the file's own comment at :1791-1806 records the account-takeover hole this pattern caused before.
Impact: the token is 32 random bytes (auth.service.ts:575), so it is not guessable. A leaked or logged token stays valid for ever, and the organisation name it writes is the one `verifyEmail` uses.
Evidence: entry.service.ts:1761-1775, the `pendingSignup` branch, with no date comparison.
Confidence: High

ID: P1-016
Severity: Minor
Axis: Security
Location: api/src/modules/documents/documents.controller.ts:20-27
Observed: the invite upload takes its credential as `?token=` in the query string.
Expected: bearer credentials go in a header or a body. Query strings are written to access logs, proxy logs and browser history.
Impact: a participant invite token, which is also the credential for P1-005, is recorded in every log along the path.
Evidence: `@Query('token') token: string` (documents.controller.ts:25).
Confidence: High

ID: P1-017
Severity: Note
Axis: Security
Location: api/src/modules/ops/ops-people.service.ts:97-125, 176-196; api/src/modules/ops/a-platform-admin-is-on-the-team.ts:35-37
Observed: `identify()` auto-creates an active `OpsPerson` with role CEO and the full CEO grant set the first time a platform admin touches any `/ops` route, including a GET.
Expected: documented and deliberate, per the header of `a-platform-admin-is-on-the-team.ts`.
Impact: no privilege is gained that `isPlatformAdmin` did not already imply, but a read performs a write that creates a durable row with `spend:approve`, `people:admin` and `fundraise:*`. Worth naming because the ops roster is meant to be the record of who is on the team.
Evidence: ops-people.service.ts:112-114 calling `admitThePlatformAdmin()`.
Confidence: High

ID: P1-018
Severity: Minor
Axis: Experience
Location: client/src/components/gw/ContextPage.tsx:75-77, 803; api/src/modules/documents/documents.service.ts:577-595
Observed: the client treats `role === 'admin'` as `isLead` and offers the document-visibility control to an `isLead` viewer. The server requires `assertParticipant` and, for CLOSED, `ground.initiatorId === userId`.
Expected: the control appears only to somebody the server will accept.
Impact: an org admin who is not on the check-in presses a control and is told "Only the person running this check-in can keep a document to themselves". Partly masked today by a second condition on the same line, so the two rules can drift apart without anybody noticing.
Evidence: `const isLead = role === 'lead' || role === 'admin'` (ContextPage.tsx:75) against documents.service.ts:583-590.
Confidence: High

ID: P1-019
Severity: Minor
Axis: Experience
Location: client/src/pages/grounds/GroundAdminPage.tsx:482-483; api/src/modules/grounds/grounds.service.ts:4537-4544
Observed: `canRunThisGround = isInitiator || isOrgAdmin` opens the whole admin view of a check-in to any org admin. Several actions on that view are initiator-only on the server, for example `setChasing`, which throws "Only whoever set this check-in up can change how it reminds people."
Expected: the server has widened three things to org admins (context notes, baseline, resolution read) and not these. The client applied one rule to all of them.
Impact: an admin covering for an absent lead can open the page, cannot use parts of it, and gets no explanation of the line between them.
Evidence: grounds.service.ts:4541-4543 against GroundAdminPage.tsx:482-483.
Confidence: High

ID: P1-020
Severity: Minor
Axis: Data integrity
Location: api/src/modules/users/users.service.ts:658-666; api/src/modules/people/departure.service.ts:140-150
Observed: `eraseAccount` rewrites each participant link's email to `deleted-${link.id}@deleted`. The departure sweep ages out raw conversation turns by matching `participant.email` against the person's address.
Expected: erasing an account should not stop the retention sweep from reaching that person's turns.
Impact: somebody who self-erases through `DELETE /users/me/data` before the sweep runs no longer matches it, and their raw turns are retained past the retention window.
Evidence: `data: { email: \`deleted-${link.id}@deleted\` }` (users.service.ts:661-663) against `where: { checkIn: { participant: { email: person.email, ground: { organizationId } } } }` (departure.service.ts:150).
Confidence: Unverified
Check needed: erase one account through `DELETE /users/me/data`, then run `ageOutDepartedTurns` for that organisation with the window elapsed, and count the remaining `conversationTurn` rows for that participant.

ID: P1-021
Severity: Minor
Axis: Experience
Location: client/src/stores/auth.ts:54-58; client/src/lib/who-the-server-says-you-are.ts:24-38
Observed: the server enforces a demotion immediately, because the JWT strategy re-reads the user row on every request. The client refreshes the user object only on page load and never invalidates the React Query cache on a role change.
Expected: the interface stops offering admin work as soon as the person stops being an admin.
Impact: within one page session a demoted admin keeps seeing admin-only lists already in the cache and admin-only buttons, and every press fails with a 403. No data crosses that was not already fetched.
Evidence: `updateUser` merges into the store and touches neither the token nor the query cache (stores/auth.ts:54-58).
Confidence: High

ID: P1-022
Severity: Minor
Axis: Inconsistency
Location: client/src/App.tsx:508; client/src/pages/org/IntegrationsPage.tsx:87, 228
Observed: `/org/integrations` carries only `RequireOrgSetup`, no `AdminsOnly`, unlike `/org/members` at App.tsx:497. The page mounts for a non-admin and renders its own refusal.
Expected: the same route-level guard as the sibling admin page.
Impact: no data leaks, because every query on the page is `enabled: isAdmin`. It is the pattern `RequirePlatformAdmin` was written to remove, in its own comment at App.tsx:102-105: refuse at the route, not after mounting.
Evidence: App.tsx:508 against App.tsx:497.
Confidence: High

ID: P1-023
Severity: Note
Axis: Experience
Location: api/src/modules/feedback/feedback.controller.ts:75-78; api/src/modules/feedback/feedback.service.ts:8-10
Observed: `POST /feedback` is `@Public()` with no `@Throttle` of its own and no challenge, writing a row per call.
Expected: an unauthenticated write endpoint usually carries a tighter limit than the global 60 a minute.
Impact: spam only. The DTO whitelist bounds it to three enumerated fields and 2000 characters.
Evidence: feedback.controller.ts:75-77.
Confidence: High

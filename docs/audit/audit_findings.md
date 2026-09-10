# Groundwork code audit: the findings

Assembled from the per-pass files in this directory. Each pass file stays the source of truth;
this is the single register to work through. The browser and notifications audits are separate
registers, in browser_findings.md and notify_findings.md, and are not repeated here.


---

<!-- from findings_pass0_urgent.md -->

# Reported immediately, not held for the synthesis

Two routes are registered directly on the raw Express adapter in `api/src/main.ts`, outside every
Nest guard, outside the global `JwtAuthGuard`, and outside the throttler. Both were found by the
Pass 0 inventory and both are verified here against the running server.

```
ID: P0-001
Severity: Blocker
Axis: Security
Location: api/src/main.ts:192-218
Observed: GET /health/email?to=<any address> sends a real email through Resend, from the
  production sender, to any address the caller names. There is no authentication, no throttle,
  no environment gate and no allow-list. The only guard is that the Resend key must not be the
  placeholder, which on production it is not. Verified against the running server: the route
  answers unauthenticated, returning 400 only because I deliberately omitted the ?to= parameter,
  which proves the request reached the handler with no auth challenge.
Expected: a diagnostic that sends real mail is authenticated, or restricted to an address the
  product already owns, or absent from production.
Impact: anyone on the internet can make api.myground.work send mail from noreply@myground.work to
  any recipient, as fast as they can issue GET requests. Three consequences, in order of cost:
  the domain becomes a spam source and its sending reputation is destroyed, which breaks every
  transactional email the product depends on, including invitations, magic sign-in links and
  report notifications; the Resend quota and bill are consumed by a stranger; and the product's
  own name is attached to whatever the abuse looks like.
Evidence: `httpAdapter.get('/health/email', ...)` at main.ts:192, calling `resend.emails.send`
  at main.ts:204 with `to: [String(req.query.to)]`. No guard is applied to httpAdapter routes.
  Live: `curl http://localhost:3000/health/email` returns `{"error":"Pass ?to=your@email.com"}`
  with no auth header supplied.
  The comment above the route reads "Safe to leave in: no auth bypass, no data exposure, just a
  test send to an explicit address." The comment is wrong on the point that matters.
Confidence: High
```

```
ID: P0-002
Severity: Major
Axis: Security
Location: api/src/main.ts:178-188
Observed: GET /health/ai is unauthenticated and calls `AnthropicService.healthCheck()`, which
  makes a real generation request to Gemini on every call. Verified live: returns 200 with no
  auth header.
Expected: a health check that costs money per call is authenticated, or cached, or does not
  touch the model.
Impact: anyone can make the product spend on model calls at the rate they can issue requests.
  It also returns the configured model names, which is minor information disclosure.
Evidence: `httpAdapter.get('/health/ai', ...)` at main.ts:178, calling `svc.healthCheck()` at
  main.ts:182, which the service documents as deliberately making a real call.
  Live: `curl http://localhost:3000/health/ai` returns 200 with no auth header.
Confidence: High
```

Neither route was introduced today. Both predate this session.


---

<!-- from findings_pass1.md -->

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


---

<!-- from findings_pass2_3.md -->

# Findings: Pass 2 (sessions and state) and Pass 3 (data integrity and truth claims)

Date: 2026-09-10. Read-only audit. Paths are relative to the repository root
`/Users/hafsahjumare/Documents/GitHub/groundwork/`.

Scope note: findings already recorded in `browser_to_code.md` and `notify_to_code.md` are not
restated. Where those files said "needs code pass", the cause is recorded here and the original ID
is cited.

No exposed secret value was read or printed. No live cross-organisation data leak was found. The
plaintext WhatsApp secret columns are already recorded as NL-015 and are not re-filed.

---

## Pass 2

### Severity counts, Pass 2

| Severity | Count |
|---|---|
| Blocker | 6 |
| Major | 12 |
| Minor | 6 |
| Note | 4 |
| **Total** | **28** |

---

### P2-001

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:542-552, 634-637, 654-660, 739`
Observed: `open()` treats "an AI turn already exists" as its idempotency guard, returning early at
`:552`. The session meter then decrements at `:634-637` and increments `freeSessionsUsed` at `:659`.
The AI turn that closes the guard is not written until `:739`, after a full model round trip. The
whole metering block sits inside the open window.
Expected: The comment at `:542-545` states the guard "closes the TOCTOU window". A charge is
expected to happen once per session and only when the session actually starts.
Impact: Two concurrent opens both read no AI turn, both pass the `roundAlreadyStarted` check at
`:570-582`, and both decrement. A balance of 10 becomes 8 for one session. Separately, if the model
call or the turn write fails after `:637`, the customer is charged for a session that does not
exist, with no compensating write anywhere. `freeSessionsUsed` at `:659` is a bare increment with no
guard at all.
Evidence: `:635-636` `where: { id: checkIn.groundId, sessionsBalance: { gt: 0 } }, data: { sessionsBalance: { decrement: 1 } }`
is atomic per statement, so it prevents a negative balance and nothing more. The correct pattern is
in the same codebase at `api/src/modules/billing/billing.service.ts:465-478`, whose comment at
`:448-459` describes this exact check-then-act race for Stripe invoices.
Confidence: High

### P2-002

Severity: Blocker
Axis: Security
Location: `api/src/modules/entry/entry.service.ts:1037, 1086-1089`; `api/src/modules/entry/entry.controller.ts:260, 300`
Observed: `EntryService` is a default-scoped Nest singleton. It holds `private lastReplyHadCloseMarker`
as instance state, set at `:1039` on every reply and read by the controller through
`didLastReplyClose()` at `entry.controller.ts:262` and `:300`.
Expected: Whether a session closed is a property of one visitor's conversation.
Impact: `/entry/chat` and `/entry/chat/stream` are `@Public()` and anonymous. Two visitors chatting
concurrently share one flag. Visitor A's closing reply sets it true; visitor B's next reply is then
reported `sessionComplete: true` and B's setup ends early on somebody else's conversation. There is
one flag for the whole process.
Evidence: `:1086` `private lastReplyHadCloseMarker = false;` with a single assignment at `:1039` and
no keying by conversation, session or request. The comment at `:1037` says it "is read by the
controller immediately after this call", which is true per request and false under concurrency.
Confidence: High

### P2-003

Severity: Blocker
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:826` versus `:1178`; guard rationale at `:757-770`
Observed: The non-streaming `sendMessage` calls `assertGroundAcceptsInput` at `:826`, which refuses
input on a PAUSED, CLOSED or STALLED ground. `sendMessageStream` calls only `loadOwnedCheckIn` at
`:1178` and never calls `assertGroundAcceptsInput`.
Expected: The comment at `:757-770` states the rule plainly: "A hold that keeps accepting answers is
not a hold."
Impact: The streaming endpoint is the one the client actually posts to. A ground paused for active
legal proceedings keeps accepting and recording answers. The permissive loader at `:1178` also
allows a DECLINED check-in to keep taking streamed messages.
Evidence: The guard call appears at `:826` and nowhere in the stream path.
Confidence: High

### P2-004

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/grounds/grounds.cron.ts:243-291` versus `api/src/modules/conversation/conversation.service.ts:3116-3251`
Observed: There are two completions. `complete()` runs specificity scoring, `extractRecordEntries`,
`anchorRecordToDocuments`, the dependency/work/expectation/alignment/progress/objection extractors,
`rememberStyle`, `buildSoloArtifact`, then `ensureNextSession` at `:3245`. The 30-minute auto-close
cron writes `status: COMPLETED, completedAt: now` at `:286-287`, emits the domain event at `:289`,
and does none of the rest.
Expected: A check-in marked COMPLETED has a record extracted from it and a next session waiting.
Impact: A person who abandons at 12 hours idle is auto-completed with an empty record. That session
is then counted as COMPLETED by every reader (`grounds.service.ts:3877`, `reports.service.ts:2049`,
the board) while contributing nothing, which silently dilutes every report it appears in. And
because the cron never calls `ensureNextSession`, no session N+1 exists, so the person who abandoned
is exactly the person with nowhere to return to.
Evidence: `grep -rn ensureNextSession api/src` returns three callers only:
`conversation.service.ts:3245`, `entry.service.ts:1594`, and the definition.
Confidence: High

### P2-005

Severity: Blocker
Axis: Bug
Location: `api/src/modules/grounds/grounds.service.ts:4134-4141, 4223-4226`; `api/src/modules/conversation/conversation.service.ts:796-797`
Observed: `pauseGround` writes `status: PAUSED, pausedAt: new Date()`. No code anywhere transitions a
ground out of PAUSED. `grep -rn "PAUSED" api/src` (non-spec) returns four hits: the docstring, the one
write, and two reads.
Expected: The docstring at `:4137` claims "an admin can un-pause by transitioning back to the prior
status", and the user-facing error at `conversation.service.ts:797` says "Nothing can be added to it
until it is resumed."
Impact: Pausing is a one-way door. A ground paused for a legal hold can never be reopened, and the
product tells the user it can. `pausedAt` does not record the prior status, so the promised
transition could not be written without a schema change.
Evidence: The claim at `:4137` against the absence of any write moving status away from PAUSED.
Confidence: High

### P2-006

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/whatsapp/whatsapp.controller.ts:52, 74-77, 107-110`; `api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:42-44`
Observed: Both inbound WhatsApp routes verify the Meta HMAC correctly and fail closed
(`whatsapp.service.ts:54-71`). Neither reads `message.id`, the `wamid`. The handler reads
`message.from` and `message.text?.body` only, then swallows every error and returns 200.
Expected: Meta retries inbound delivery. A retry must not append a second turn.
Impact: A retry after a write that timed out re-enters `sendMessage` and writes a second
`ConversationTurn` into a permanent record. Returning 200 on genuine failure also means a real
failure is never retried, which is the worst of both. `InboundMessage.providerId @unique`
(`api/prisma/schema.prisma:688`) is the email model and is written only by
`api/src/modules/email/delivery.service.ts:117`; it gives WhatsApp nothing.
Evidence: `whatsapp.controller.ts:74-77` reads two fields and no id; `wamid` appears nowhere on
either route.
Confidence: High

### P2-007

Severity: Major
Axis: Security
Location: `api/src/modules/back-office/the-back-office-has-a-door.ts:27-31`; `api/src/modules/back-office/back-office-door.guard.ts:16-17`; `api/src/main.ts:74`
Observed: The door decides what to protect by matching a regex against the raw request path:
`const THE_BACK_OFFICE = /^\/api\/v1\/(ops|admin)(\/|$|\?)/`. The path comes from
`req.originalUrl ?? req.url` at `back-office-door.guard.ts:16`. The regex is case-sensitive and
operates on the undecoded URL. Express route matching is case-insensitive by default and matches on
the decoded path; no `caseSensitive: true` is set anywhere.
Expected: Every route served by the admin and ops controllers sits behind the door.
Impact: A request to `/api/v1/ADMIN/...` or `/api/v1/%61dmin/...` would be routed to the admin
controller by Express while failing the door's regex, so `mayOpen` returns
`{ open: true, because: 'not-the-back-office' }` and the emailed-code requirement is skipped
entirely. Any signed-in customer user could reach admin routes that only the door and role guards
protect.
Confidence: Unverified
Check needed: With a valid non-staff bearer token, `curl -i -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/ADMIN/usage`
and the same with `/api/v1/%61dmin/usage`. A 403 carrying `BACK_OFFICE_CODE_REQUIRED` means the door
held. Any other status, including 401/403 from a different guard or a 200, means the door was
bypassed and only the role guard remained.

### P2-008

Severity: Major
Axis: Security
Location: `api/src/modules/auth/auth.service.ts:771-782, 423`
Observed: `resetPassword` writes `passwordHash` only. There is no session table, no token denylist,
no `tokenVersion` and no `passwordChangedAt` column in `api/prisma/schema.prisma`.
Expected: Resetting a password ends other sessions. This is what a person resetting a password after
a suspected compromise believes they are doing.
Impact: Every token minted before the reset stays valid for its full 7 days
(`api/src/modules/auth/auth.module.ts:20`). The attacker keeps access; the victim has no way to
revoke it and no screen listing active sessions. This is NL-026, filed there as Minor; the absence
of any revocation mechanism at all makes it Major.
Evidence: `jwt.strategy.ts:29-49` re-reads the user each request but has nothing to compare a token
epoch against.
Confidence: High

### P2-009

Severity: Major
Axis: Security
Location: `api/src/modules/auth/auth.service.ts:816-823`; `api/src/modules/auth/strategies/google.strategy.ts:24-30`
Observed: `GoogleStrategy.validate` takes `emails[0].value` from the profile and never checks the
profile's `email_verified`. In `findOrCreateGoogleUser`, an unrecognised `googleId` whose email
matches an existing user is linked to that account and `isEmailVerified` is forced true at `:820`.
Expected: An account is linked only on a Google-verified address.
Impact: Where a Google account can carry an unverified address, signing in with it takes over the
matching existing account and, because that path mints `via: 'google'`
(`auth.service.ts:854, 887`), walks straight past the back-office door with no emailed code.
Confidence: Unverified
Check needed: Confirm with the configured OAuth client whether `profile.emails[0].verified` can ever
be false. If it can, this is a Blocker.

### P2-010

Severity: Major
Axis: Bug
Location: `api/src/modules/auth/auth.service.ts:1145-1164`
Observed: OAuth exchange codes live in `private readonly oauthCodes = new Map(...)`, a
process-local Map with a 60-second TTL. It is the only mutable in-memory Map in `api/src/modules`.
Expected: A Google sign-in that has just been redirected back completes.
Impact: A restart between the redirect and the exchange fails the sign-in with "Invalid or expired
exchange code". Behind two instances, Google sign-in breaks whenever the exchange lands on a
different instance than issued the code, which is most of the time. The file says so itself at
`:1145-1146`; it is still shipped behavior with no fallback and a misleading error message.
Confidence: High

### P2-011

Severity: Major
Axis: Security
Location: `api/src/app.module.ts:52`; `api/src/common/guards/a-sync-loop-is-not-a-browser.ts:32, 63-76`
Observed: `ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 60 }])` is registered with
no `storage` option, so Nest's default in-memory `ThrottlerStorageService` is used. The machine
override re-keys to `credential:${credential}` at a ceiling of 600/min and rides the same storage.
Expected: A rate limit is a limit.
Impact: A process restart resets every counter, so restarting is a free way to shed a limit. With N
instances the effective allowance is N x 60 per IP and N x 600 per credential. Unlike `oauthCodes`,
the single-process assumption is not written down at the call site. This governs the OTP routes and
the public entry routes, so it is a security control, not a courtesy.
Confidence: High

### P2-012

Severity: Major
Axis: Bug
Location: `api/src/modules/grounds/grounds.service.ts:2429-2436, 2682-2684`
Observed: `addParticipant` guards only against `AWAITING_APPROVAL`. The write at `:2682-2684` is
`if (ground.status !== GroundStatus.AWAITING_LEAD) { ... status: AWAITING_PARTIES }`, with no
`hasEnded` check.
Expected: A CLOSED, RESOLVED or STALLED ground is over.
Impact: Adding a participant resurrects a terminal ground into AWAITING_PARTIES. Billing, reminders
and the board all restart on a record the parties were told was finished.
Evidence: `api/src/modules/grounds/a-ground-that-has-ended.ts:18` defines the terminal set and is not
consulted here.
Confidence: High

### P2-013

Severity: Major
Axis: Bug
Location: `api/src/modules/reports/reports.listener.ts:84-87`
Observed: On report release the listener sets `status: GroundStatus.ACTIVE`, guarded only by
`hasEnded(g.status)`, which covers RESOLVED, CLOSED and STALLED. PAUSED is not in that set.
Expected: A legal hold survives a report release.
Impact: Releasing a report silently un-pauses a ground that was paused for active legal proceedings
and restarts billing. The comment directly above documents having already been bitten by this class
of bug for CLOSED, and the same fix was not extended to PAUSED.
Confidence: High

### P2-014

Severity: Major
Axis: Bug
Location: `api/src/modules/grounds/grounds.cron.ts:21, 118, 133-136`
Observed: `TERMINAL` excludes PAUSED, so the 3 AM stall cron selects paused grounds as stall
candidates at `:118` and writes `STALLED` at `:135`.
Expected: A paused ground's clock is paused.
Impact: A ground paused for a legal hold is converted, unattended, into a terminal STALLED state
which has no writer out of it. Combined with P2-005, the pause is destroyed rather than honoured.
Confidence: High

### P2-015

Severity: Major
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:1029-1030, 1346-1347` versus `:634-660`
Observed: All session metering lives in `open()`. `sendMessage` and `sendMessageStream` flip
`NOT_STARTED` to `IN_PROGRESS` themselves and contain no billing call; grep over lines 824-1100 for
`billing`, `canStartSession` and `sessionsBalance` returns nothing.
Expected: A session that runs is a session that is counted.
Impact: A client that posts an answer without first calling `open()` runs a full session free and
uncounted. The paywall is enforced on one of two entry points into the same conversation.
Confidence: High

### P2-016

Severity: Major
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:5067, 5162, 3371-3417`; `api/prisma/schema.prisma:1255`
Observed: `clarify`, `correctSession` and `createNextIfAbsent` each compute
`nextSession = last + 1` and then `create`, with no transaction and no catch on P2002. The table
carries `@@unique([participantId, sessionNumber])`.
Expected: A double click produces one session or one clear message.
Impact: Two concurrent requests produce an unhandled Prisma P2002 surfacing as a 500. On
`createNextIfAbsent` this throws out of `complete()`, so the person who just finished a session sees
a server error at the moment their work is being saved.
Confidence: High

### P2-017

Severity: Major
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:3197-3206, 3014`
Observed: `complete()` has no status guard in its `where` clause. The only check is an in-memory read
at `:3014`.
Expected: A check-in completes once.
Impact: Two concurrent completes run all twelve extractors twice and emit `CHECK_IN_COMPLETED`
twice, duplicating record entries, dependencies and objectives, and double-firing every listener
including the report builder and the outbound webhook queue.
Confidence: High

### P2-018

Severity: Major
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts` (whole file), `:855, 1017, 1025`
Observed: `grep -Fn 'transaction'` over 5,297 lines returns one hit, and it is a comment at `:4832`.
There is no `$transaction` and no advisory lock in the entire conversation module. `CheckIn` has no
`version` and no `updatedAt`. The person's turn is written at `:855`, the model is called, the AI
turn is written at `:1017`, and on a thrown error the person's turn is deleted by hand at `:1025`
with `.catch(() => undefined)`.
Expected: A turn and its reply either both land or neither does.
Impact: If the process dies rather than throwing, the person's turn is orphaned with no reply and no
compensation. The hand-rolled delete is the only unwind and it is itself best-effort.
Confidence: High

### P2-019

Severity: Major
Axis: Experience
Location: `client/src/stores/auth.ts:46-51`; `client/src/pages/entry/EntryChatPage.tsx:2111, 2113`; `client/src/lib/entry-handover.ts:61`
Observed: `logout()` clears `token`, `auth-storage-v2` and the `gw_in` cookie. Nineteen other
localStorage keys survive, including `gw_draft_token` (a live bearer credential accepted by
`PATCH /entry/draft` on its own, `api/src/modules/entry/entry.service.ts:1745-1781`),
`gw_commit_payload` and `gw-new-ground-draft` (both carrying colleagues' email addresses),
`gw-participant-session` (carrying an `inviteToken`) and `gw_magic_email`.
Expected: Signing out on a shared machine removes what the previous person left.
Impact: The next person at the same browser inherits a usable draft credential, a colleague email
list and a prior entry transcript. Only `gw-new-ground-draft` has a TTL (48h,
`client/src/lib/what-you-typed-survives-a-reload.ts:36`); the rest have neither TTL nor version tag.
Confidence: High

### P2-020

Severity: Major
Axis: Bug
Location: `client/src/stores/entry.ts:10-14`; `client/src/pages/entry/EntryChatPage.tsx:1182, 1195, 1206, 1356, 1360, 1869-1870`
Observed: This is the cause of BR-011. The anonymous entry conversation is persisted by
`saveSession` into `gw_entry_session`, but the inferred session count lives in a Zustand store
created with no `persist` middleware and a literal default of `sessions: 1`. `cadence`
(`useState('FORTNIGHTLY')` at `:1182`), `cadenceChosen` and `cadenceAnchorDay` are plain component
state and are also absent from `saveSession`.
Expected: A reload restores what the person set up.
Impact: Worse than the cosmetic reset the browser pass saw. `sessions` is display-only and is never
sent, but `cadence` is sent at `:1869`, and after a reload it is the untouched `'FORTNIGHTLY'`
literal with `cadenceChosen` false. The server then writes it as a real choice
(`api/src/modules/entry/entry.service.ts:1397, 1477`,
`cadence: (dto.cadence && cadenceMap[dto.cadence]) ? ... : Cadence.FORTNIGHTLY`). A person who chose
a weekly cadence, reloaded, and saved gets a fortnightly ground and is never told.
Confidence: High

### P2-021

Severity: Minor
Axis: Bug
Location: `api/src/modules/conversation/conversation.service.ts:5011-5013`
Observed: `decline()` routes through `loadOwnedOpenCheckIn`, which permits `IN_PROGRESS`. DECLINED
is absorbing (`:5261`) and nothing sets `closedReason`.
Expected: Declining is an answer to the willingness question at the start.
Impact: A person mid-session who presses decline loses the session with no path back. Their existing
turns stay in the database and are never extracted.
Confidence: High

### P2-022

Severity: Minor
Axis: Inconsistency
Location: `api/prisma/schema.prisma:158-163`; `api/src/modules/grounds/grounds.service.ts:4408-4416`; `api/src/modules/board/board.service.ts:517`
Observed: `CheckInStatus.DECLINED` is read in three places but written in exactly one
(`conversation.service.ts:5012`), reachable only from an explicit decline route.
Expected: `closedReason` carries the literal `"willingness_declined"`
(`api/prisma/schema.prisma:1207`), implying the willingness gate produces this status.
Impact: A person who answers the willingness question with no is not recorded as DECLINED by that
answer. The board chip at `board.service.ts:517` is effectively dead for the case it names.
Confidence: Medium

### P2-023

Severity: Minor
Axis: Inconsistency
Location: `api/src/modules/auth/auth.service.ts:1249`; `api/src/modules/auth/strategies/jwt.strategy.ts:12-13`
Observed: The `via` claim is typed `'password' | 'link' | 'google'`. `'link'` is never passed by any
caller. Magic-link, verify-email and entry-handover sign-ins all flow through `buildAuthResponse`
(`:982`) and take the `'password'` default.
Expected: The three declared values correspond to the three doors.
Impact: A magic-link session is indistinguishable from a password session in the token. Any future
policy keyed on `via` will silently treat a link sign-in as a password sign-in.
Confidence: High

### P2-024

Severity: Minor
Axis: Inconsistency
Location: `api/src/modules/auth/auth.service.ts:1238`
Observed: `switchOrganization` mints through `generateToken(user)` and so drops `via` back to
`'password'`.
Expected: Switching organisation does not change how you signed in.
Impact: A Google-signed-in staff member loses back-office access the moment they switch
organisation, and is asked for an emailed code with no explanation. Fails safe, so Minor.
Confidence: High

### P2-025

Severity: Minor
Axis: Bug
Location: `api/src/modules/auth/strategies/jwt.strategy.ts:29-46`
Observed: `validate()` reads `user.organizationId` from the User row and never checks
`organizationMembership`. `switchOrganization` (`auth.service.ts:1221-1235`) does check membership on
the way in.
Expected: Removing somebody's membership removes their access to that org.
Impact: Deleting the membership row alone does not change `User.organizationId`, so the removed
person keeps the old organisation active until something else rewrites the user row.
Confidence: Medium

### P2-026

Severity: Minor
Axis: Security
Location: `api/src/modules/public-api/approved-or-machine.guard.ts:26-32`; `api/src/modules/public-api/machine-token.guard.ts:99-113`; `api/src/modules/embed/embed-session.guard.ts:35-41`
Observed: Three guards decide entirely from token claims with no database read.
`ApprovedOrMachineGuard` returns true at `:29-32` on `claims.typ === 'machine'` before any query, and
takes `organizationId` from the token for the human branch. `EmbedSessionGuard` takes `org` and `pid`
from claims and never re-reads `person.active`.
Expected: Revoking a credential or deactivating a person takes effect.
Impact: A revoked machine credential and a deactivated embed person both keep working for the
remaining life of the token, up to 900 seconds. `MachineTokenGuard` documents this as deliberate at
`:20-22`; the other two do not.
Confidence: High

### P2-027

Severity: Note
Axis: Security
Location: `api/src/config/configuration.ts:107`; `api/src/modules/auth/auth.module.ts:18`; `api/src/modules/auth/strategies/jwt.strategy.ts:25`; `api/src/main.ts:18-31`
Observed: `jwt.secret` falls back to the literal `"super-secret-key"`, and two further sites add a
second fallback `|| 'fallback-secret'`, which is unreachable because the config default is always
truthy. `assertProductionConfig` at `main.ts:18` refuses to boot on that default, but only when
`NODE_ENV === 'production'` (`:19`).
Expected: Signing keys are never defaults.
Impact: Production is protected. Staging, preview and any deployment that does not set
`NODE_ENV=production` signs and verifies with a constant that is in the repository. No harm on the
production path, hence Note, but the two dead `'fallback-secret'` literals make the real default
hard to see.
Confidence: High

### P2-028

Severity: Note
Axis: Inconsistency
Location: `api/src/modules/public-api/idempotency.service.ts:9, 35, 70-78`; `api/src/modules/public-api/public-api.controller.ts:177-181, 208-213`
Observed: The module docstring promises "A RETRY MUST BE INDISTINGUISHABLE FROM THE ORIGINAL CALL."
The mechanism is opt-in on an `Idempotency-Key` header (`:35` returns `work()` when absent) and is
wired to 2 of roughly 40 mutating public-api routes. Rows are never pruned. `work()` and the record
write are not in one transaction.
Expected: The docstring's promise.
Impact: `POST /check-ins`, `POST /people`, `POST /check-ins/:id/open` and 35 others double-create on
retry. The self-documented race at `:70-78` is justified as harmless "because every endpoint behind
this is an upsert", which is true of `POST /subjects` and not of `POST /subjects/bulk`, which starts
a job.
Confidence: High

---

### State machine: CheckIn

Enum at `api/prisma/schema.prisma:158-163`. No `expiresAt`, no `abandonedAt`, no `phase`, no `step`,
no `version`, no `updatedAt`. Unique key `@@unique([participantId, sessionNumber])` at `:1255`.

| From | Input / event | To | Code | Guard on prior status |
|---|---|---|---|---|
| (none) | ground creation, add participant, join | NOT_STARTED | `grounds.service.ts:491, 615, 640, 790, 2655`; `entry.service.ts:1951` | n/a |
| (none) | completion of session N | NOT_STARTED (N+1) | `conversation.service.ts:3417` | look-then-create only, no DB guard |
| (none) | `POST /grounds/:id/clarify` | NOT_STARTED (new session) | `conversation.service.ts:5069-5077` | no |
| (none) | `POST /grounds/:id/correct-session` | NOT_STARTED (new session) | `conversation.service.ts:5166-5175` | yes, on the target (`:5117`, `:5129`) |
| NOT_STARTED | `POST /check-ins/:id/open` | IN_PROGRESS | `conversation.service.ts:747` | only not-COMPLETED (`:510`), not-DECLINED (`:5261`) |
| NOT_STARTED | `POST /check-ins/:id/messages` | IN_PROGRESS | `conversation.service.ts:1029-1030` | yes |
| NOT_STARTED | `POST .../messages/stream` | IN_PROGRESS | `conversation.service.ts:1346-1347` | yes |
| IN_PROGRESS | `POST /check-ins/:id/complete` | COMPLETED | `conversation.service.ts:3197-3206` | no guard in the `where`; in-memory read at `:3014` only |
| IN_PROGRESS | cron, 12h idle or 48h age | COMPLETED | `grounds.cron.ts:284-287`, selected `:246` | yes, in the query |
| NOT_STARTED, IN_PROGRESS | `POST /check-ins/:id/decline` | DECLINED | `conversation.service.ts:5012` | via loader `:5256-5265` |
| COMPLETED | anything | (refused) | `conversation.service.ts:5258` | yes |
| DECLINED | anything | (refused) | `conversation.service.ts:5261-5262` | yes |

COMPLETED and DECLINED are absorbing. No writer moves a CheckIn out of either.

### State machine: Ground

Enum at `api/prisma/schema.prisma:137-152`. Terminal set
`A_GROUND_IS_OVER = [RESOLVED, CLOSED, STALLED]` at
`api/src/modules/grounds/a-ground-that-has-ended.ts:18`.

| From | Input / event | To | Code | Guard on prior status |
|---|---|---|---|---|
| (none) | create | AWAITING_APPROVAL or OPEN | `grounds.service.ts:404` | n/a |
| (none) | admin creates for a lead | AWAITING_LEAD | `grounds.service.ts:442-453` | n/a |
| AWAITING_APPROVAL | admin approves | OPEN | `grounds.service.ts:3492-3494` | yes (`:3487`) |
| AWAITING_APPROVAL | admin declines | CLOSED | `grounds.service.ts:3525-3532` | yes (`:3522`) |
| AWAITING_LEAD | lead confirms | per `confirmLead` | `grounds.service.ts:721` | yes |
| any except AWAITING_LEAD | add a participant | AWAITING_PARTIES | `grounds.service.ts:2682-2684` | **no terminal guard (P2-012)** |
| any non-terminal | report released | ACTIVE | `reports.listener.ts:87` | `hasEnded` only; **PAUSED not covered (P2-013)** |
| any | admin activate | ACTIVE | `grounds.service.ts:2979-2982` | **none** |
| (none) | solo entry, zero contributors | ACTIVE | `entry.service.ts:1734` | no |
| OPEN, AWAITING_PARTIES, REPORT_READY, ACTIVE | pause | PAUSED | `grounds.service.ts:4223-4226` | yes (`:4212-4219`) |
| any non-terminal, incl. PAUSED | 3 AM cron, deadline passed | STALLED | `grounds.cron.ts:133-136` | partial; **PAUSED swept in (P2-014)** |
| non-CLOSED, non-RESOLVED | all parties confirm an end state | CLOSED | `resolution.service.ts:267-270` | yes (`:65`, `:186`) |
| PAUSED | resume | **no transition exists (P2-005)** | — | — |

Two enum values are unreachable. REPORT_READY is never written; the schema says so at `:145`.
RESOLVED is never written by any code, only read; the real resolved terminal is CLOSED.

### Undefined transitions and interruption cases

| # | State and input | What actually happens | Finding |
|---|---|---|---|
| 1 | PAUSED, admin wants to resume | No code path. Docstring claims one exists. | P2-005 |
| 2 | CLOSED / STALLED, add a participant | Resurrected to AWAITING_PARTIES. | P2-012 |
| 3 | PAUSED, report released | Silently set ACTIVE, billing restarts. | P2-013 |
| 4 | PAUSED, deadline passes | Swept to terminal STALLED. | P2-014 |
| 5 | PAUSED / CLOSED / STALLED / DECLINED, streaming message | Accepted and recorded. | P2-003 |
| 6 | NOT_STARTED with future `availableFrom`, `open()` | Opens and meters. Deliberate per `conversation.service.ts:466-470`, but the board's scheduling arithmetic and the actual gate then disagree. | Note |
| 7 | NOT_STARTED, message without `open()` | Runs free and uncounted. | P2-015 |
| 8 | IN_PROGRESS, decline | Session lost, turns orphaned, no way back. | P2-021 |
| 9 | COMPLETED by auto-close, person returns | 400, and no session N+1 exists. | P2-004 |
| 10 | Abandon midway | No expiry column. Warning at 11h, force-complete at 12h idle or 48h. Resume works until the auto-close and is impossible one second later. | P2-004 |
| 11 | Two tabs, different messages | Both persist and interleave. Mitigation is text-identity only (`conversation.service.ts:808-822`); no version, no transaction. `startedAt` can move backwards. | P2-018 |
| 12 | Network fails between steps | Person's turn deleted by hand at `:1025` on a throw; orphaned if the process dies. In `open()` the charge has no compensating path at all. | P2-001, P2-018 |
| 13 | Same request twice | Route-dependent; see P2-028. | P2-028 |
| 14 | Two people finish a round simultaneously | Safe. `round-completion.ts:50-60` is idempotent by a unique row. The one place in the flow that gets it right. | — |

---

## Pass 3

### Severity counts, Pass 3

| Severity | Count |
|---|---|
| Blocker | 4 |
| Major | 10 |
| Minor | 6 |
| Note | 3 |
| **Total** | **23** |

---

### P3-001

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:152-157`; `api/src/modules/reports/reports.service.ts:1306-1312`
Observed: The band mapper is not monotonic. `mapSpecificityLevel` returns `'specific'` at >= 0.6,
`'directional'` at >= 0.35, `'vague'` at >= 0.15, and `'managed'` below 0.15. The report then ranks
`{ vague: 0, directional: 1, managed: 2, specific: 3 }`. So the lowest possible score maps to
`'managed'`, which ranks 2, above `'vague'` at 0 and `'directional'` at 1.
Expected: A worse session scores lower.
Impact: A participant who said almost nothing scoreable is reported as more specific than one who
gave a directional answer, and their mean pulls the whole party toward `specificityLabel: 'high'`
(`:1312`) and confidence band `'well covered'`. This is a number presented as fact that is inverted
at the bottom of its range. It also runs through all five dimensions at `:3479-3483`, and through the
zero-turn default at `:3465`, which writes `'vague'` (rank 0) while its dimensions all write
`'managed'` (rank 2).
Confidence: High

### P3-002

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:3486-3489, 159-162`
Observed: `recallConfidence: mapRecallConfidence(avgSpecificity)`. Recall confidence is computed from
the specificity average. There is no recall measurement anywhere.
Expected: "How much of this was recalled versus checked against something written down" is a
different question from "how specific was it".
Impact: The report presents two readings as independent corroboration when they are one number under
two names. The user-facing sentence "Most of it was anchored to something written down"
(`api/src/modules/reports/the-session-report.ts:631`) is a claim about documentary evidence derived
from a keyword count for digits and dates. Same field written to `CheckIn.recallConfidence` and read
by the board and the report.
Confidence: High

### P3-003

Severity: Blocker
Axis: Bug
Location: `api/src/modules/reports/the-session-report.ts:616-633`; `client/src/components/gw/HowSpecificThisSessionWas.tsx:19-24`
Observed: `howClear()` branches on `'HIGH' | 'high'` and `'LOW' | 'low'`. The writer only ever emits
`specific | directional | vague | managed` and `certain | mostly_certain | uncertain`. Two
vocabularies for the same two columns.
Expected: The three clarity sentences at the foot of every shared report reflect the score, as the
comment at `:619-620` describes.
Impact: Every shared report falls through to the middle branch at `:625` and says "What people said
was specific in places and general in others" regardless of the actual score, including on a session
scored `specific` and on one scored `managed`. The recall clause at `:627-632` is always the empty
string, so recall never reaches a reader at all. The client component has the same mismatch and
renders nothing.
Confidence: High

### P3-004

Severity: Blocker
Axis: Data integrity
Location: `api/src/modules/conversation/conversation.service.ts:3116`; `api/src/modules/reports/reports.service.ts:1303`; `api/src/modules/reports/confidence-in-the-picture.ts:43-49`
Observed: Scoring is called as
`await this.scoreSessionSpecificity(checkIn.id).catch(() => null)`, and a null writes
`specificityLevel: null` at `:3201`. The report then selects `specificityLevel: { not: null }`, so a
failed score silently leaves the denominator. If every score failed, `scoredSessions` is 0.
Expected: The zero branch means what its own comment says it means:
"Nobody has been asked, which is a fact about the ground."
Impact: The report then prints "Nothing has been scored here yet, so this part of the picture has
not been built rather than being empty" about a ground where people did answer and the scorer threw.
A processing failure is presented to the reader as a fact about who was asked. There is no counter,
no log at the call site and no user-visible signal.
Confidence: High

### P3-005

Severity: Major
Axis: Data integrity
Location: `client/src/pages/admin/AdminPage.tsx:715, 716, 752`; `api/src/modules/prompts/prompts.service.ts:431-442`
Observed: This is BR-014. All three numbers come from one route and three lines of one
`Promise.all`, against three different tables.

- "Check-ins completed" 484 is `prompts.service.ts:440`
  `this.prisma.checkIn.count({ where: { status: 'COMPLETED' } })`. One row per person per session.
- "Check-ins created" 243 is `prompts.service.ts:442` `this.prisma.ground.count()`. **A count of
  grounds.** The tile has never counted check-ins.
- "Check In Completed" 359 is `prompts.service.ts:436`
  `usageEvent.groupBy({ by: ['type'] })`, a count of append-only event rows.

Expected: Three tiles side by side, two of them labelled "check-ins created" and "check-ins
completed", describe the same population.
Impact: 484 against 243 is a grain mismatch, not a funnel: a ground with two participants over one
session produces two check-ins, and 243 x 2 = 486 is approximately 484. 484 against 359 is a
coverage gap: `UsageEventType.CHECK_IN_COMPLETED` is emitted in exactly one place
(`conversation.service.ts:3206`), while `status` is set to COMPLETED in three
(`grounds.cron.ts:288` auto-close, `grounds.cron.ts:672` the 4 AM backstop, and `complete()`).
Neither cron path emits a usage row, so the 125 difference is at minimum the auto-closed
population, which is precisely the people who never came back and the group an ops dashboard most
needs. The board is also read three ways at once by a viewer who has no way to tell which is which.
Confidence: High

### P3-006

Severity: Major
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:431-442`; `api/prisma/schema.prisma:1189-1192`
Observed: None of the three usage queries filters by organisation, soft-delete, or a demo flag.
None filters `isSetup`. The schema states at `:1189-1191` that a setup conversation "is NOT an
account and must never be counted as one: not in 'n of m sessions done', not in overdue" and that it
is excluded "in six places". `isSetup` is filtered in exactly one read,
`grounds.service.ts:1105`; `grep -c isSetup api/src/modules/prompts/prompts.service.ts` returns 0.
Expected: The rule the schema states.
Impact: Every platform figure, including 484, the 14-day chart, `session1Count`, `funnelBySession`,
`byStatus` and `session2Rate`, counts lead setup interviews as completed sessions, and counts every
internal and test organisation. Given no live customers yet (memory note, 9 Sep), the numbers on that
panel are close to entirely our own traffic, presented without qualification.
Confidence: High

### P3-007

Severity: Major
Axis: Inconsistency
Location: `api/src/modules/board/board.service.ts:582, 585-635`; `api/src/modules/reports/the-session-report.ts:113-115, 386`
Observed: The board's four tiles have two computation paths. The engine path wins when
`sessionShape?.atAGlance?.length` is truthy at `:582`; otherwise the board recomputes locally at
`:585-635`. Three of the four differ. Movement: the engine filters `o.target != null`
(`board.service.ts:1295`), the fallback does not (`:588`). Blockers: the engine falls back to
"n waiting" (`the-session-report.ts:434`), the fallback counts BLOCKING only (`:586`). How much was
said: the engine renders a percentage (`the-session-report.ts:445-450`), the fallback renders a word
(`:629`, `eng.coverage ?? 'unknown'`).
Expected: The engine's own header comment at `:113-115`: "Same four, computed the same way, because
two surfaces disagreeing ... is worse than one surface not saying."
Impact: The same ground shows different tile values depending on whether the report engine produced
an `atAGlance`, with nothing on screen to distinguish them. Separately, the board's dependency list
drops self-blocks at `:552` but neither tile path applies that filter, so a self-block increments
Blockers while being invisible in the list beneath it.
Confidence: High

### P3-008

Severity: Major
Axis: Inconsistency
Location: eight surfaces, listed below
Observed: The "n of m answered" sentence is computed independently in at least eight places over four
different denominators.

| Surface | Denominator |
|---|---|
| `client/src/components/gw/TheReportIsAListOfSessions.tsx:90` | all `!managingOnly`, computed client-side |
| `client/src/components/gw/TheSessionsReport.tsx:125` | `!managingOnly`, n intersected with m |
| `client/src/components/gw/SessionReportCard.tsx:334, 388-389` | same array, derived a second time |
| `client/src/components/gw/ResolutionPanel.tsx:180` | `totalActive`, and "answered" means a resolution confirmation, not a check-in |
| `api/src/modules/reports/how-much-there-is-to-go-on.ts:73` | m is `!managingOnly`, n is raw COMPLETED rows, not intersected (`reports.service.ts:2405-2406`) |
| `client/src/pages/report/ReportPage.tsx:1112` and two siblings | `!managingOnly` AND (linked user OR answered OR unexpired invite), `grounds.service.ts:4366-4398`; also uses `max(sessionNumber)` rather than the page's session |
| `client/src/pages/org/OrgMembersPage.tsx:653` | every participant row, no filter; numerator defaulted with `?? 1` |

Expected: One sentence, one computation.
Impact: Two surfaces print the same sentence about the same session from different numbers, and none
is authoritative. Which wins depends on which page the reader is on.
Confidence: High

### P3-009

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/reports.service.ts:2062-2063, 2111-2113`; `api/src/modules/reports/the-session-report.ts:421`
Observed: The Blockers count selects every `GroundDependency` on the ground with no `sessionNumber`
and no `clearedAt` predicate. `movedOnTargets` has no session predicate either, and sums
`count - prevCount` where `prevCount` is `@default(0)` (`api/prisma/schema.prisma:1399`).
Expected: The sibling tiles and the sub-line at `the-session-report.ts:421` say "this session".
Impact: A WAITING dependency raised in session 1 appears on session 12's report as a current
blocker. An objective that was never snapshotted reports its entire lifetime count as this session's
movement. Both are lifetime figures presented as session figures on a page headed by a session
number.
Confidence: High

### P3-010

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/how-much-there-is-to-go-on.ts:32, 73`; `api/src/modules/reports/reports.service.ts:1966-1974, 2118, 2129`
Observed: The confidence score mixes two populations. `saidInAll` is reader-scoped: entries are read
`where: { participantId: { in: readableParticipantIds } }`, and before release a non-lead's
`readableParticipantIds` is just themselves (`:1966-1968`). `ofPeople` in the same score covers the
whole ground (`:2118`).
Expected: The comment at `how-much-there-is-to-go-on.ts:32` describes `saidInAll` as "Everything said
this session".
Impact: Two terms of one composite score are computed over two different denominators. Before
release, a participant's confidence score is built from their own lines measured against everybody's
head count, so it falls as more people are invited. The "of what was said is anchored to a document"
sub-line (`the-session-report.ts:451`) has the same reader-scoped denominator while claiming a
whole-session one.
Confidence: High

### P3-011

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/confidence-in-the-picture.ts:42-43`
Observed: `confidenceInThePicture(scoredSessions, meanLevel)` accepts `scoredSessions` and tests it
only against zero. Nothing else in the function reads it.
Expected: Confidence in a picture rises with how much the picture rests on.
Impact: One scored session with mean 2 produces the identical band and sentence as twenty scored
sessions with mean 2: "This part of the picture is well covered". The parameter that carries the
sample size is accepted and discarded, and the reader is given a confidence statement that is blind
to how much evidence exists.
Confidence: High

### P3-012

Severity: Major
Axis: Data integrity
Location: `api/src/modules/assistant/a-commitment-carries-past-the-ground.ts:59`
Observed: `} catch { return false; }` around a commitment upsert. No logger, no counter, no user
signal.
Expected: A commitment a person made in a check-in is recorded.
Impact: The write fails and the product is silent. This is the one bare swallowing catch on a write
path in `api/src/modules` with zero instrumentation, on the object the accountability product exists
to carry.
Confidence: High

### P3-013

Severity: Major
Axis: Data integrity
Location: `api/src/modules/documents/documents.service.ts:311, 359, 520, 295-296`
Observed: A spreadsheet that fails to parse returns the string
`` `[Attached: ${fileName} - could not parse spreadsheet.]` ``, and that string is persisted as the
document's `content` and then passed to `assessDocument` and `decideOrigin`.
Expected: A failed parse is an error the uploader sees.
Impact: A document whose entire text is an apology becomes a corroborating source. The record shows a
document attached and anchored; the model grounds on a sentence about a parse failure. The uploader
is never told.
Confidence: High

### P3-014

Severity: Major
Axis: Data integrity
Location: `api/src/modules/reports/reports.service.ts:3577, 3706`; `api/src/modules/grounds/grounds.service.ts:1489, 4519`
Observed: Four copies of
`(() => { try { return JSON.parse(participant.soloArtifact); } catch { return null; } })()`.
Expected: A participant's private record is either shown or reported as unreadable.
Impact: A corrupt `soloArtifact` renders as no private record at all. The participant sees an empty
section rather than an error, and the report proceeds as though they wrote nothing. Four independent
copies means a fix must be made four times.
Confidence: High

### P3-015

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/reports/reports.service.ts:1307`
Observed: `RANK[String(c.specificityLevel)] ?? 0`. `specificityLevel` is a nullable free String with
no enum backing it in the schema.
Expected: An unrecognised label is excluded, not scored.
Impact: Any value outside the four expected strings, including a capitalisation change or a value
written by a future or older build, is silently ranked 0, the worst band, and drags the mean and the
confidence label down. It compounds P3-001 and P3-003, which are both symptoms of the same
un-enumerated column.
Confidence: High

### P3-016

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:354-357`
Observed: `session2Rate = Math.round((session2Count / session1Count) * 100)`.
Expected: A rate compares matched cohorts.
Impact: The denominator includes session-1 check-ins whose session 2 is not yet due, plus `isSetup`
rows per P3-006. The figure is labelled a rate and is a ratio of two unmatched populations, so it
reads permanently low and cannot reach 100.
Confidence: High

### P3-017

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/reports/the-session-report.ts:200-201, 213-214`; `client/src/components/gw/TheSessionsReport.tsx:110-111, 254`
Observed: `agreed` and `stillOpen` are array lengths of model output. `settled[]` and `open[]` are
built from the same arrays with `.filter(Boolean)`.
Expected: The list under a count has that many items.
Impact: The filter can shorten the list without changing the count, so the page shows "4 still open"
above a list of 2, with the count and the list rendered adjacent.
Confidence: High

### P3-018

Severity: Minor
Axis: Inconsistency
Location: `client/src/pages/report/ReportPage.tsx:1018, 1419`; `client/src/pages/report/SessionReportPage.tsx:132`; `client/src/components/gw/TheSessionsReport.tsx:322-323`; `api/src/modules/email/email.service.ts:877, 926`; `api/src/modules/reports/one-email-however-many-people.ts:133`
Observed: Three date formats on report surfaces alone: `'en-US'` ("September 10, 2026"), `'en-GB'`
("10 September"), and a bare `toLocaleDateString()` using the browser locale. Billing emails use
`'en-US'` while the rest of the product uses `'en-GB'`. Exactly one server formatter passes
`timeZone: 'UTC'` (`one-email-however-many-people.ts:133`).
Expected: One date format.
Impact: The same date reads three ways across a single report journey, and an email about it reads a
fourth. Everything not pinned to UTC renders in server-local time against UTC-stamped columns.
Confidence: High

### P3-019

Severity: Minor
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:449, 454`
Observed: The Usage tab's 14-day chart buckets by
`toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })` with no `timeZone`, against
`completedAt` values stamped in UTC. Every cron in the codebase pins `{ timeZone: 'UTC' }`
(`grounds.cron.ts:60, 114, 169, 209, 242, 319, 378, 391, 639, 693`).
Expected: The one chart on the platform panel agrees with everything else about which day a thing
happened.
Impact: On a non-UTC server the bars shift by a day relative to every other figure on the same
screen. It is the single server-local hole in an otherwise UTC-pinned codebase.
Confidence: High

### P3-020

Severity: Minor
Axis: Inconsistency
Location: `api/src/modules/ops/ops-settings.service.ts:19, 42-44`
Observed: `display.timezone` is declared with the value `Africa/Lagos` and a note dated 2026-09-05
explaining that "A board dated in a timezone nobody is in makes 'today' a different day for the
person reading it." `grep -rn "displayTimezone\|'display.timezone'" api/src` returns only the two
lines that declare it.
Expected: A decided setting has a reader.
Impact: The decision was recorded and never wired. Boards date themselves in server-local or UTC
time, which is the exact failure the note describes.
Confidence: High

### P3-021

Severity: Note
Axis: Data integrity
Location: `api/src/modules/conversation/intake.ts:115-130`
Observed: The number underneath every specificity and confidence label in the product is
`(hasNumbers ? 0.25 : 0) + (hasDate ? 0.15 : 0) + factualClaims.length * 0.1 - vagueCount * 0.1 - noiseCount * 0.08`,
where the inputs are substring matches against English keyword lists and five regexes
(`/\d+%/`, `/\d+ (days|hours|users|contracts)/`, `/confirmed by/`, `/measured in/`, `/signed/i`).
Expected: Nothing in the product claims a model produced these. Nothing states they are heuristic
either.
Impact: Every confidence band, specificity label and "well covered" sentence a customer reads is a
keyword count presented in the grammar of an assessment. It is English-only, so a session in another
language scores near zero and reads as "thin". No harm today with no live customers, hence Note, but
this is the origin of every derived label in Pass 3.
Confidence: High

### P3-022

Severity: Note
Axis: Inconsistency
Location: `api/src/common/seats.ts:32`; `api/src/modules/billing/billing.service.ts:508, 546`
Observed: The seat definition is genuinely single-sourced and correct.
`SEAT_WHERE = { isActive: true, deletedAt: null, awaitingOrgApproval: false }` is used by all five
call sites, including both the invite gate (`:330`) and the billing page number (`:785`), and is
pinned by `a-seat-is-a-seat-on-both-screens.spec.ts`. Stripe is sent
`line_items: [{ price: priceId, quantity: 1 }]` at `:508`, and the plan-change call at `:546` sends
no quantity at all.
Expected: Either seats bill, or the flat-rate intent is stated.
Impact: The seat count is an in-app cap that is never transmitted to Stripe. That is consistent with
flat per-plan pricing and is probably intended, but it is stated nowhere, so a future reader will
assume the number on the billing page is the number being charged for. Platform admins also occupy
seats; there is no `isPlatformAdmin` exclusion.
Confidence: Medium

### P3-023

Severity: Note
Axis: Data integrity
Location: `api/src/modules/prompts/prompts.service.ts:386, 390, 394, 420`; `client/src/pages/admin/AdminPage.tsx:639` versus `api/src/modules/prompts/prompts.service.ts:191`
Observed: The admin Orgs tab fetches `_count: { grounds: true }` at `:386` and discards it; the
`groupBy` at `:390` wins at `:420`. `participantCounts` at `:394` is computed and never read. On the
Drop-offs tab, `byScenario.pct` is computed server-side at `:191` while `byStatus` percentages are
computed client-side at `AdminPage.tsx:639`.
Expected: One computation per displayed value.
Impact: Two dead queries per page load, and two bars on one screen whose percentages are calculated
in two places, so they can diverge under any future change to either.
Confidence: High

---

### Number provenance

Class key: **measured** = counted from rows; **derived** = arithmetic over measured values;
**inferred** = length or content of model output; **defaulted** = a constant stands in for an absent
value; **heuristic** = keyword, regex or threshold.

| Displayed value | UI | Route / service | Computation | Table.column | Class | Finding |
|---|---|---|---|---|---|---|
| Board tile, Differences | `BoardPage.tsx:361-371` | `board.controller.ts:33` -> `board.service.ts:582` | `input.divergences.length` (`the-session-report.ts:389`) | `GroundReport.divergences` Json | inferred | P3-007 |
| Board tile, Movement | same | `board.service.ts:588` or `:1295` | `count - prevCount`, engine filters `target != null`, fallback does not | `GroundObjective.count/prevCount/target` | measured, floored by `prevCount @default(0)`, gated by regex `aNumberWasSaid()` | P3-007, P3-009 |
| Board tile, Blockers | same | `the-session-report.ts:434` or `board.service.ts:586` | count of dependencies; engine falls back to "n waiting", fallback counts BLOCKING only | `GroundDependency.status` | measured over an inferred row set | P3-007, P3-009 |
| Board tile, How much was said | same | `the-session-report.ts:445-450` or `board.service.ts:629` | engine `"${backedPct}% documented"`, fallback `eng.coverage ?? 'unknown'` | `RecordEntry.recallBased/anchoredOrigin` | derived, or a pre-banded label | P3-007 |
| Report, agreed / stillOpen | `TheSessionsReport.tsx:110-111` | `reports.controller.ts:48` | array lengths of model synthesis | `GroundReport.agreements/divergences` | inferred | P3-017 |
| Report, settled[] / open[] | `TheSessionsReport.tsx:254` | `the-session-report.ts:213-214` | same arrays, `.filter(Boolean)` | same | inferred, lossy | P3-017 |
| Report, confidence.answered / ofPeople | report header | `reports.service.ts:2129 / 2118` | counts of participants | `CheckIn`, `GroundParticipant` | measured | P3-010 |
| Report, confidence.documented / saidInAll | report header | `the-session-report.ts:506-507` | counts of entries | `RecordEntry` | measured; `countsAsASource` at `:37` returns true when origin is null | P3-010 |
| Report, commitmentsWithOwnerAndDate | report | `reports.service.ts:2126-2128` | text scan for a name plus a date | `RecordEntry.text` | heuristic | — |
| Report, confidence.score | report | `how-much-there-is-to-go-on.ts:103-105` | `coverage*45 + documented*25 + compared*15 + owned*15` | composite | heuristic | P3-010 |
| Report, confidence.band | report | `how-much-there-is-to-go-on.ts:119` | `>=67 solid, >=34 partial, else thin` | composite | heuristic threshold | — |
| Report, specificityLabel | report | `reports.service.ts:1311-1312` | `mean >= 2 high, >= 1 moderate, else low` over `RANK` | `CheckIn.specificityLevel` | heuristic, **rank order inverted** | P3-001, P3-015 |
| Report, confidence band ("well covered") | report | `confidence-in-the-picture.ts:42-66` | same `mean`, same thresholds as specificityLabel | same column | heuristic; **cannot disagree with specificityLabel**, and ignores sample size | P3-011 |
| Report, "How clear this was" sentence | shared report footer | `the-session-report.ts:616-633` | branches on `'HIGH'/'LOW'` | `CheckIn.specificityLevel/recallConfidence` | **unreachable branches; one constant sentence** | P3-003 |
| `CheckIn.specificityLevel` (the source) | — | `conversation.service.ts:3487` -> `152-157` | thresholds on `avgSpecificity` | written from `intake.ts:123-125` | heuristic keyword count | P3-021 |
| `CheckIn.recallConfidence` | — | `conversation.service.ts:3488` -> `159-162` | thresholds on **`avgSpecificity`** | same input as above | **duplicate of specificity** | P3-002 |
| "n of m answered" | eight surfaces | see P3-008 | four different denominators | `GroundParticipant`, `CheckIn` | measured over inconsistent populations | P3-008 |
| Personal confidence (High/Building/Early) | ground page | `grounds.service.ts:4487` | `confScore >= 4 High, >= 2 Building, else Early` | session count | heuristic, effectively a session counter | — |
| Function detection confidence | participant panel | `function-detection.ts:164-175`, `role-maps.ts:607-621` | prior of `0.4` hardcoded per title regex | `GroundParticipant.detectedFunctionConfidence` | defaulted constant | — |
| Billing, seats used | `BillingPage.tsx:335-337` | `billing.controller.ts:31` -> `billing.service.ts:785` | `count(SEAT_WHERE)` | `User` | measured, single-sourced, **never sent to Stripe** | P3-022 |
| Usage, "Check-ins completed" 484 | `AdminPage.tsx:715` | `prompts.service.ts:440` | `checkIn.count({ status: COMPLETED })` | `check_ins` | measured, unfiltered by org / deleted / `isSetup` | P3-005, P3-006 |
| Usage, "Check-ins created" 243 | `AdminPage.tsx:716` | `prompts.service.ts:442` | `ground.count()` | `grounds` | measured, **mislabelled: counts grounds** | P3-005 |
| Usage, "Check In Completed" 359 | `AdminPage.tsx:752` | `prompts.service.ts:436` | `usageEvent.groupBy` | `usage_events` | measured, **structurally incomplete: emitted on 1 of 3 completion paths, and double-swallowed** | P3-005 |
| Usage, 14-day chart | `AdminPage.tsx` chart | `prompts.service.ts:445-455` | day buckets, no `timeZone` | `check_ins.completedAt` | measured, bucketed in server-local time | P3-019 |
| Usage, session2Rate | admin | `prompts.service.ts:357` | `session2Count / session1Count` | `check_ins` | derived over unmatched cohorts | P3-016 |
| Ops, shareOfNewRevenue | `OpsContributionPages.tsx:103` | `ops-contribution.service.ts:296` | `revenue / attributed total` | `Decimal(x,2)` | derived; denominator excludes unattributed, **documented as deliberate** | — |

### Two sources for one value

| Value | Source A | Source B | Which wins | Deliberate? |
|---|---|---|---|---|
| The four board tiles | `the-session-report.ts:386` | `board.service.ts:585-635` | A when `atAGlance.length` (`:582`) | No. The engine comment at `:113-115` says they must agree; three of four do not. |
| "n of m answered" | `reports.service.ts:2129/2118` | six client and server sites, P3-008 | per surface | No. |
| `blocked` / `waiting` | `reports.service.ts:2062` counts raw rows | `board.service.ts:1275` counts after `dedupeDependencies` (`:207`) | per surface | No. |
| `documented` | `the-session-report.ts:384` | `the-session-report.ts:506`, identical expression twice | agree today | No, nothing enforces it. |
| Org ground count | `prompts.service.ts:386` `_count` | `prompts.service.ts:390` `groupBy` | B at `:420`; A is a dead query | No. |
| Percentage on the Drop-offs tab | `prompts.service.ts:191` server-side | `AdminPage.tsx:639` client-side | both render, on one screen | No. |
| specificityLabel vs confidence band | `reports.service.ts:1312` | `confidence-in-the-picture.ts:42` | both render | Same input and same thresholds, so they are one signal shown as two. |

### Units, currency, timezone, date format

| Surface | Format | Location |
|---|---|---|
| Report page | `en-US`, "September 10, 2026" | `ReportPage.tsx:1018, 1419` |
| Session report page | `en-GB`, "10 September" | `SessionReportPage.tsx:132` |
| Sessions report component | browser locale | `TheSessionsReport.tsx:322-323`, `SharedReportForAParty.tsx:126` |
| Admin, chat, baseline | `en-GB` | `AdminPage.tsx:691`, `GroundChat.tsx:268`, `BaselinePanel.tsx:101` |
| Prompt versioning | `en-US` | `PromptVersioningPage.tsx:109` |
| Create ground, board | undefined locale | `CreateGroundPage.tsx:457`, `BoardPage.tsx:41` |
| Billing emails | `en-US`, no `timeZone`, bare `$` | `email.service.ts:877, 926, 932` (NL-019) |
| Round digest email | `en-GB` with `timeZone: 'UTC'`, the only server formatter that pins one | `one-email-however-many-people.ts:133` |
| Every cron | `{ timeZone: 'UTC' }` | `grounds.cron.ts:60, 114, 169, ...` |
| Usage 14-day chart | server-local, unpinned | `prompts.service.ts:449, 454` (P3-019) |
| Ops boards | `Africa/Lagos` declared, never read | `ops-settings.service.ts:43` (P3-020) |
| Money, whole units | `$${total.toLocaleString()}` | `ops-contribution.service.ts:320`, `attribution-is-not-entitlement.ts:107` |
| Money, cents | `$${Math.round(c/100)}` | `an-objective-is-not-a-note.ts:106`, `OpsEverybodyPage.tsx:18` |

Two different storage units, `Decimal(x,2)` and `Int` cents, both render a bare `$`.
`BillingEvent.currency String @default("USD")` (`api/prisma/schema.prisma:3146`) is never read by any
display path, and `alignment/a-figure-is-a-value-with-a-source.ts:96` accepts a currency argument
then hardcodes `'en-US'` grouping for all of them.

### Silent data loss

| # | Location | What is lost | Finding |
|---|---|---|---|
| 1 | `assistant/a-commitment-carries-past-the-ground.ts:59` | A commitment upsert fails, nothing logged | P3-012 |
| 2 | `documents/documents.service.ts:359` | Unparsed spreadsheet persisted as an apology string, then grounded on | P3-013 |
| 3 | `conversation.service.ts:3206` + `usage/usage.service.ts:34-36` | Usage event double-swallowed; every platform counter can under-count | P3-005 |
| 4 | `knowledge/knowledge.service.ts:372` | Retrieval audit rows, the record of what the assistant was shown | Note |
| 5 | `reports.service.ts:3577, 3706`; `grounds.service.ts:1489, 4519` | A corrupt private record renders as no private record, four copies | P3-014 |
| 6 | `subjects/bulk-import.service.ts:80, 302` | An import stuck RUNNING when the ABANDONED write also fails, defeating `resumeAbandoned` | Note |
| 7 | `conversation.service.ts:3116` | Specificity scoring failure becomes "nobody has been asked" | P3-004 |

Most other swallowing catches in `api/src/modules` are deliberate, commented and correct: the
kill-switch reads at `reports.service.ts:540` and `grounds.service.ts:815`, the unique-constraint
swallow at `round-completion.ts:54`, and the per-row invite failure at `users.service.ts:257`.

---

## Unverified items, with the check that would settle each

| Finding | Check |
|---|---|
| P2-007 back-office path bypass | `curl -i -H "Authorization: Bearer <non-staff token>" http://localhost:3000/api/v1/ADMIN/usage` and the `%61dmin` variant. A 403 carrying `BACK_OFFICE_CODE_REQUIRED` means the door held. |
| P2-009 Google email verification | Confirm whether `profile.emails[0].verified` can be false for the configured OAuth client. If it can, raise to Blocker. |
| P2-025 org membership removal | Delete an `OrganizationMembership` row, then call an authenticated route with the existing token and see whether the old org is still active. |
| P3-022 flat-rate Stripe intent | Confirm with Hafsah whether plans are flat-rate per tier rather than per seat. |
| Stripe inbound webhook | No HTTP receiver was found under a `@Controller('webhooks'` prefix. Confirm where Stripe posts, and that its signature is verified. |
| `IdempotencyRecord` pruning | Confirm whether any job deletes rows; none was found. |
| `POST /people` | Confirm whether it upserts internally; a duplicate on retry is likely but was not read. |
| Board fallback tiles | Confirm whether `GroundReport.engagement.coverage` is ever written on grounds that take the fallback path, or whether that tile renders `'unknown'` in practice. |


---

<!-- from findings_pass4_5.md -->

# Pass 4 & Pass 5 — Groundwork product audit

Scope: four flows (anonymous entry, session completion, closing a check-in, billing)
and six screens. Read-only. Every finding cites a file and line range.

## Pass 4

### Flows walked

a) Anonymous entry at `/start` -> saved record -> invitations
b) A session completing for everyone -> synthesis -> release -> the board
c) Closing a check-in -> begin closing session -> final session -> resolution -> ground ends
d) Billing -> starting a metered session -> running out -> free extension -> subscribing

### Can money, credits, quota or messages be consumed without the user receiving the result?

| Flow | Answer |
| --- | --- |
| a) Anonymous entry | **Yes** — the round can be released and the ground flipped ACTIVE before the contributors exist (P4-004), so the lead's one session produces a "shared" report of one person. No money moves. |
| b) Session completing | **Yes** — the session is already consumed and marked COMPLETED when synthesis/release throws; the listener swallows it and no retry exists (P4-006). |
| c) Closing a check-in | **Yes** — the closing session is an ordinary metered session, so a paid ground at zero balance cannot run the session that produces the final report (P4-005), and resolution can close the ground under people still holding an unstarted final session (P4-007). |
| d) Billing | **Yes** — a session credit is decremented before the model is called and a thrown call leaves the retry free to decrement again (P4-002); and one org can spend its free extension into another org's ground (P4-001). |

---

ID: P4-001
Severity: Blocker
Axis: Security
Location: api/src/modules/billing/billing.service.ts:393-424 with api/src/modules/billing/billing.controller.ts:61-70
Observed: `claimFreeExtension(organizationId, groundId)` checks only that the caller's own organisation has not already used its free extension (`org.freeExtensionUsed`, :398-400). The `groundId` comes straight off the request body (`@Body() body: { groundId: string }`, controller :67-69) and is used unfiltered in `prisma.ground.update({ where: { id: groundId }, data: { sessionsBalance: { increment: 1 } } })` (:406). There is no `findFirst({ where: { id: groundId, organizationId } })` anywhere on the path. The neighbouring `purchaseSession` does exactly that check at :214-216 and throws `NotFoundException('Check-in not found')`, with a comment explaining that the endpoint had been left unguarded once before.
Expected: A grant paid for out of *this* organisation's one-time allowance lands on a ground *this* organisation owns — the same rule `purchaseSession` enforces one method above.
Impact: Any authenticated ADMIN can post an arbitrary ground id and add a paid session to a stranger's organisation's ground, and burn their own org's one free extension doing it. The `BillingEvent` row written at :407-420 records the *caller's* organizationId against a ground belonging to somebody else, so the billing ledger is also wrong. Cross-tenant write.
Evidence: billing.service.ts:395 `async claimFreeExtension(organizationId: string, groundId: string)`; :406 `this.prisma.ground.update({ where: { id: groundId }, ... })`; contrast :214 `const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId } })`.
Confidence: High

---

ID: P4-002
Severity: Blocker
Axis: Data integrity
Location: api/src/modules/conversation/conversation.service.ts:570-660 and :731-741
Observed: `open()` decides whether to charge by asking whether *any other* participant's check-in in this ground and session already has an AI turn (`roundAlreadyStarted`, :572-583). If not, it runs the gate and then atomically decrements the ground's `sessionsBalance` (:632-639). The model is not called until :731-741 (`this.anthropic.respond(...)`), and the AI turn — the only thing that makes `roundAlreadyStarted` true next time — is not written until :744-751. Nothing wraps the decrement and the model call in a transaction, and there is no compensating increment on failure.
Expected: A session credit is spent when the person gets a session. If the model call fails and they see an error and press the button again, the same session is not charged twice.
Impact: Every model timeout, rate-limit or 5xx during the opener burns a session credit and leaves nothing behind — no AI turn, so the retry takes the same branch and decrements again. On a metered ground a person can walk a ten-session balance to zero over a bad afternoon without ever having a conversation. Also note the query is scoped `id: { not: checkIn.id }` (:577), so the *same* participant's own earlier failed attempt never counts as "round already started".
Evidence: :572-583 the guard; :632-639 `updateMany({ where: { id, sessionsBalance: { gt: 0 } }, data: { sessionsBalance: { decrement: 1 } } })`; :731 `await this.anthropic.respond(fullSystem, ...)`; :744 the `conversationTurn.create` that would have made the retry free.
Confidence: High

---

ID: P4-003
Severity: Blocker
Axis: Bug
Location: api/src/modules/whatsapp/whatsapp.controller.ts:99-110
Observed: An inbound WhatsApp text is routed to the sender's next open check-in. If that check-in is `NOT_STARTED`, the controller calls `this.conversation.open(openCheckIn.id, user.id)` and **never passes `text`** (:101-104); the message the person typed is dropped on the floor. Only an `IN_PROGRESS` check-in gets `sendMessage(..., text)`. The whole block sits inside a `try` whose `catch` logs and returns `{ received: true }` (:106-109) — so if `open()` throws (including the `ForbiddenException` the billing gate raises at conversation.service.ts:618, or any model failure), `this.whatsapp.sendMessage(fromNumber, result.reply)` at :105 never runs and the person on WhatsApp receives absolutely nothing back.
Expected: What I typed is my answer. And when something goes wrong, the channel I wrote into tells me so — silence on WhatsApp is indistinguishable from the product being dead.
Impact: A WhatsApp participant's first substantive message of every session is silently discarded and answered with a generic opener; and any failure downstream — including the paywall refusal, which is precisely the moment somebody needs to be told something — produces total silence. Compounds P4-002: `open()` can decrement the balance and then throw, and the person is never told the credit went.
Evidence: :100-104 the `NOT_STARTED ? open(...) : sendMessage(..., text)` ternary with `text` absent from the first arm; :105 the only reply path; :106-108 `catch (err: any) { this.logger.error(...) }` with no user-facing send.
Confidence: High

---

ID: P4-004
Severity: Major
Axis: Data integrity
Location: api/src/modules/entry/entry.service.ts:1654-1660 with :1662-1706, and api/src/modules/reports/reports.listener.ts:34-91
Observed: The anonymous entry commit emits `CHECK_IN_COMPLETED` (:1654-1660) **before** the loop that adds and invites the contributors (:1665-1706). The listener's handler is async and not awaited by the emitter; it calls `grounds.isSessionReadyForReport(groundId, sessionNumber)` (reports.listener.ts:79) and, if everybody is through, calls `reports.release(...)` and sets the ground `ACTIVE` (:84-90). At the moment the event fires the only participant in the database is the lead, who is already COMPLETED. The code directly below has a long comment describing this exact class of bug being fixed for `recordRoundCompletion` — which *was* moved after the loop (:1723) — but the emit itself was left where it was.
Expected: A shared report is released once the people it is shared with have actually checked in. The comment at :1644-1650 states the intent: "People still holding an unopened invitation keep the round open, so this cannot release early."
Impact: A race between the listener and the invite loop. When the listener wins, a one-person "shared" report is released and the ground is marked ACTIVE, and the contributors who arrive a moment later join a ground whose round is already published. The header/body contradiction the comment at :1707-1721 describes is the visible symptom in the other direction.
Evidence: entry.service.ts:1654 `this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {...})`; :1665 `for (const c of dto.contributors)`; reports.listener.ts:79-90.
Confidence: Medium
Check needed: Whether `isSessionReadyForReport` counts `Ground.participants` rows or an expected-party count set at creation. If the ground row carries an expected party count written at commit before the emit, the race cannot fire. Read `grounds.service.ts` `isSessionReadyForReport`.

---

ID: P4-005
Severity: Major
Axis: User value
Location: api/src/modules/grounds/grounds.service.ts:2943-2972 with api/src/modules/conversation/conversation.service.ts:586-641
Observed: `beginClosingSession` flags each participant's open check-in as `isFinal`, or **creates a new one** at `sessionNumber + 1` where none is open (:2960-2968). That new session is an ordinary session: when the first participant opens it, `open()` runs `canStartSession` and decrements `sessionsBalance` like any other (conversation.service.ts:588-639). Nothing in `beginClosingSession` checks the balance, and nothing exempts a final session from metering.
Expected: Ending something you have already paid for is not a further purchase. The lead who presses "begin closing session" is told at the moment of pressing whether it can actually run.
Impact: On a metered ground at zero balance, the lead can start a closing session that nobody can open. The final session is the one that makes the final report read the whole arc (see the doc comment at :2939-2942), so the deliverable the ground existed to produce is unreachable behind a paywall the lead met only after committing to close. The refusal arrives to the participant mid-flow, not to the lead at the button.
Evidence: grounds.service.ts:2951-2958 the only guards (ownership, `hasEnded`) — no billing check; :2966-2968 the create; conversation.service.ts:632-639 the decrement that applies to it.
Confidence: High

---

ID: P4-006
Severity: Major
Axis: User value
Location: api/src/modules/reports/reports.listener.ts:49-91
Observed: The whole synthesis-and-release path runs inside one `try` whose `catch` only logs (`this.logger.error('Report handling on checkin.completed failed ...')`, :88-90). By the time the event is emitted the check-in is already `COMPLETED` and the session credit is already spent (conversation.service.ts:3196-3206). There is no retry, no queue, no flag on the ground, and no email telling anybody the report did not come. `onGroundActivated` has the identical shape at :113-124.
Expected: If the report cannot be produced, someone is told, and the system tries again — a completed, charged session that produces no report should not be indistinguishable from one that worked.
Impact: Everybody in the ground has finished their session, their credit is gone, and the Report tab simply never fills. The failure exists only in a server log. This is the flow-level version of the "a closing synthesis that never landed" case the repo already names in reports/a-closing-synthesis-that-never-landed.spec.ts.
Evidence: reports.listener.ts:63 `await this.reports.synthesize(...)`; :84 `await this.reports.release(...)`; :88-90 the swallow; conversation.service.ts:3196-3206 the completion write that precedes it.
Confidence: High

---

ID: P4-007
Severity: Major
Axis: Inconsistency
Location: api/src/modules/resolution/resolution.service.ts:263-312 with api/src/modules/grounds/grounds.service.ts:2960-2968
Observed: `finalize` sets the ground `CLOSED` in a transaction (:265-271) as soon as every *active* party has confirmed the same end state. It does not look at outstanding check-ins. `beginClosingSession` may have created `NOT_STARTED` final sessions for every participant (grounds.service.ts:2966-2968), and those rows are untouched by the close. Meanwhile `conversation.service.ts:588-641` will still meter and open them, and the reports listener explicitly handles a report landing on an already-ended ground (`hasEnded`, reports.listener.ts:82-88).
Expected: When the ground ends, the sessions it was waiting on end with it — nobody is invited to complete a check-in for something already closed, and no credit is spent on one.
Impact: A participant who had not yet opened their final session is left holding a live check-in link into a closed ground; opening it spends a session credit on a conversation whose conclusion has already been decided without them. The close email (:297-309) goes out at the same time, so they receive "this has ended" and a live check-in simultaneously.
Evidence: resolution.service.ts:265-271 the close transaction, with no `checkIn.updateMany`; grounds.service.ts:2966-2968; reports.listener.ts:82-84 the comment confirming reports do land on ended grounds.
Confidence: Medium
Check needed: Whether a cron or a guard on `open()` refuses a check-in whose ground has ended. Grep `hasEnded` across conversation.service.ts and the check-in open guard at :510-520.

---

ID: P4-008
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/billing/billing.service.ts:204-240 with client/src/api/billing.ts:221 and client/src/components/PostSessionPanel.tsx:29
Observed: The client has deliberately removed the buy-a-session tier — `purchaseSession` is gone from `client/src/api/billing.ts` (a comment at :221 says so) and `PostSessionPanel.tsx:29` records "purchaseSessionMut removed with the buy-a-session tier." The server still exposes `purchaseSession` and will still create a live $5-per-session Stripe checkout (billing.service.ts:204-240).
Expected: A pricing tier the product has withdrawn cannot still be charged for.
Impact: A live payment path with no UI and therefore no UI-level pricing copy governing it. Anyone with a stale link or a direct call can be charged $5/session under a model the product no longer sells. Low reach today (no paying subscribers), but it is a charge endpoint outside the priced surface.
Evidence: billing.service.ts:224-238 `unit_amount: 500` checkout creation; client/src/api/billing.ts:221; client/src/components/PostSessionPanel.tsx:29.
Confidence: High

---

ID: P4-009
Severity: Note
Axis: Experience
Location: api/src/modules/conversation/conversation.service.ts:588-620
Observed: When the gate refuses, the code fires two best-effort emails — a nudge to the ground's initiator (:591-607) and `tellAnAdminToAddACard` (:617) — both with `.catch(() => undefined)`, and then throws a `ForbiddenException` carrying `gate.reason` to the person who was blocked.
Expected: (as built) — this is the good half of the flow, recorded for contrast with P4-005.
Impact: The person blocked is told; the payer is told. But nothing here is retried or recorded, so if both emails fail the refusal exists only as an exception in one person's browser. On WhatsApp it is not even that (P4-003).
Evidence: :591-607, :617, :618.
Confidence: High

---

## Pass 5

Six screens: the anonymous entry chat (`client/src/pages/enter/EntryChatPage.tsx`),
the check-in chat (`client/src/pages/chat/ChatPage.tsx`), the check-in page
(`client/src/pages/grounds/GroundParticipantPage.tsx`, routed by `GroundPage.tsx`),
the board (`client/src/pages/board/BoardPage.tsx`), the billing page
(`client/src/pages/billing/BillingPage.tsx`), and the sign-up form
(`client/src/pages/auth/AuthPage.tsx`).

### Summary of the six states

| Screen | Empty | Loading | Double-submit blocked | Error actionable | Success | Destructive confirmed |
| --- | --- | --- | --- | --- | --- | --- |
| Entry chat | yes (:2594, :2979-2993) | yes (:2709, :2864) | yes (`loading`/`onboardingLoading` on every send) | yes, restores the text | yes | n/a |
| Check-in chat | yes | yes, with `SlowStep` (:992-996) | yes (`loading`, `complete.isPending`) | yes, restores the text | yes | decline is a two-step panel (:1074-1082) |
| Check-in page | yes | yes (:246) | yes | mostly | yes | n/a |
| Board | yes, per section | yes (:126-128) | yes on every mutation | **no — see P5-002** | silent (invalidate only) | **no — see P5-001** |
| Billing | yes (:499) | yes (:282-286) | yes | **no — see P5-002** | toast / redirect | subscription yes (:432); see P5-003 |
| Sign-up | n/a | yes (:493) | yes (:493) | partial (known) | yes | n/a |

---

ID: P5-001
Severity: Major
Axis: Experience
Location: client/src/pages/board/BoardPage.tsx:104-108 and :487-492
Observed: The "x" button next to a target calls `removeObjective.mutate(o.id)` directly. It is disabled while pending and has `title="Remove this target"`, and nothing else. There is no `window.confirm`, no undo, and no second step. It sits immediately beside the "+" and "-" count buttons in the same `miniBtn` style (:477-492), differing only in colour.
Expected: A one-click permanent delete of a team target, sitting a few pixels from the two buttons you press routinely, asks first — the same page's own poll form has an explicit Cancel (:1046) and the billing page confirms a subscription cancel (:432).
Impact: A lead deletes an org objective by mis-clicking, with no confirmation and no way back. The error copy even says "Nothing has changed" (:107) — which is the *failure* message, so a successful accidental delete says nothing at all.
Evidence: :489 `onClick={() => removeObjective.mutate(o.id)}`; :490 `disabled={removeObjective.isPending}`; the adjacent `+`/`-` at :477-486.
Confidence: High

---

ID: P5-002
Severity: Minor
Axis: Experience
Location: client/src/pages/billing/BillingPage.tsx:178, :188, :194, :215-217, :226, :235, :244; client/src/pages/board/BoardPage.tsx:102, :123
Observed: Seven of the billing page's mutations and two of the board's fall back to "Try again." with no cause and no alternative: "Could not generate code. Try again.", "Could not start checkout. Try again.", "Could not cancel subscription. Try again.", "Could not open the billing portal. Try again in a moment.", "That count did not change — try again.". None of them distinguish a network failure from a 402, a 403 or a validation refusal, and none read `err?.response?.data?.message` the way `ChatPage.tsx:280` does.
Expected: An error message says what to do next. "Try again" at a checkout button that failed because the org has no card, or because a plan change was refused, sends the person round the same loop.
Impact: Anyone hitting a *persistent* server-side refusal on the billing page is told to retry an action that cannot succeed, with no route to support and no cause named. The entry service already learned this lesson for invites ("Resending will not fix a seat limit", entry.service.ts:1673-1680); the billing page has not.
Evidence: BillingPage.tsx:194 `onError: () => toast.error('Could not start checkout. Try again.')`; contrast ChatPage.tsx:280 `toast.error(err?.response?.data?.message ?? 'Could not open session.')`.
Confidence: High

---

ID: P5-003
Severity: Minor
Axis: Inconsistency
Location: client/src/pages/billing/BillingPage.tsx:428-440 with api/src/modules/billing/billing.controller.ts:54-59
Observed: `DELETE /billing/account` — "Cancel the account - marks org CANCELLED, sends data-portability notice" (controller :55-58) — has no caller in `client/src/pages/billing`. The billing page offers only "Cancel subscription" (:432-439), which is a different and much smaller thing. Cancelling the *subscription* is confirmed with `window.confirm`; cancelling the *account*, the genuinely irreversible one, has no surface on this page.
Expected: The most destructive billing action either has a confirmable button or does not exist. A live endpoint that cancels an organisation and has no UI is both a dead surface and an unguarded one.
Impact: An admin who wants to leave may not be able to, from the product; and the endpoint that would let them is reachable only by a direct call, where no confirmation exists.
Evidence: billing.controller.ts:54-59 `@Delete('account')`; BillingPage.tsx:428-440 the only cancel button on the page, which calls `cancelSubscriptionMut`.
Confidence: Unverified
Check needed: Grep `cancelAccount` across the whole of `client/src` including `pages/settings` and `pages/admin` — it may be surfaced outside `pages/billing`.

---

ID: P5-004
Severity: Minor
Axis: Experience
Location: client/src/pages/billing/BillingPage.tsx:282-286
Observed: The whole page is gated behind one combined spinner: `if (groundsLoading || codesLoading)` renders a bare `Loading...` (:285) for the entire route. The two queries (:114-125) are independent — the grounds list and the access-code list — and the plan/subscription block does not depend on either.
Expected: The part of the page that is ready shows. A person arriving to fix a payment problem sees the plan section immediately rather than waiting on an access-code list they did not ask for.
Impact: On a slow query the whole billing page — including the subscribe button, the thing somebody came to press — is a three-word placeholder. Neither query has an `error` branch on this screen, so a *failed* codes fetch renders no message at all.
Evidence: :282-286; the two `useQuery` calls at :114-125, neither destructuring `error`.
Confidence: Medium
Check needed: Confirm what the page renders when the codes endpoint returns 500 — `isLoading` is false on error, so it likely falls through to an empty codes section with no explanation. Render it with that endpoint failing.

---

ID: P5-005
Severity: Minor
Axis: Bug
Location: client/src/pages/auth/AuthPage.tsx:265-289 with :306-318
Observed: The sign-in and magic-link handlers validate the address before submitting (`if (!e2 || !e2.includes('@'))`, :307-308 and :315-316). The create-account mutation has no such guard and relies entirely on the server; its `onError` handles 5xx, 429 and 409 explicitly and then **falls through to `setLinkSent(true)`** for everything else (:288). A 400 on a malformed address therefore renders the "check your email" panel.
Expected: The three forms on one screen validate the same field the same way, and a rejected sign-up says it was rejected.
Impact: Somebody who mistypes their address is shown "we sent you a link", waits, and never gets one. (This is the mechanism behind the already-known malformed-email silence; recorded because :288 is the fixable line.)
Evidence: :288 `setLinkSent(true)` as the fall-through in `onError`; contrast :307 and :315 where the other two forms guard `includes('@')`.
Confidence: High

---

ID: P5-006
Severity: Minor
Axis: Security
Location: client/src/pages/auth/AuthPage.tsx:283-288 and :296-301
Observed: The password-reset form deliberately returns the same generic success on every outcome (`onError: () => setResetSent(true)`, :300) with a comment explaining that anything else would reveal whether an address is registered. Twenty lines above, the sign-up form does the opposite on purpose: a 409 says "That address already has an account. Sign in instead." (:286-288), justified by the comment at :283-285.
Expected: Both are individually defensible, but together they mean the sign-up form is a working registration oracle while the reset form is carefully not one.
Impact: Anyone can enumerate which addresses have Groundwork accounts via the sign-up form. Whether that matters is a product call; what is not defensible is paying the UX cost of the vague reset message while the same fact leaks from the form next to it.
Evidence: :286-288 the 409 branch; :296-301 the reset comment and `onError`.
Confidence: High

---

ID: P5-007
Severity: Note
Axis: Experience
Location: client/src/pages/board/BoardPage.tsx:74-80, :126-132, :557, :648, :669-676
Observed: The board handles all three states properly — `Loading the board...` (:127), a combined `error || !data` branch with back-links (:129-132, and the comment at :198-201 recording that the back-links were added), and per-section empty states that say where the content will come from rather than showing a bare heading ("Nothing cross-referenced yet. This fills in once more than one person has checked in.", :557; "Handoffs appear when somebody says in a check-in that they are waiting on another person.", :676). The comment at :169-174 records that empty headings over rules were the defect being fixed.
Expected: as built.
Impact: none — recorded as the standard the billing page (P5-004) and the objective delete (P5-001) fall short of.
Evidence: as cited.
Confidence: High

---

ID: P5-008
Severity: Note
Axis: Experience
Location: client/src/pages/chat/ChatPage.tsx:502-575, :949, :992-996, :1074-1082, :1280-1285
Observed: The check-in chat is the strongest of the six. Double submission is blocked by a `loading` flag set before the request and cleared in both branches (:502, :544, :571-573), plus `disabled={loading || completed || declined || !opened}` on the send button and every quick-action (:1193, :1283). Failures restore the text to the box and say so ("That did not send — your message is back in the box", :569; "The reply was cut off. What you sent is on the record — send again to carry on.", :574). Slow operations get a step-by-step `SlowStep` with an explicit reassurance (:992-996), and the mid-request state says "Still reading what you wrote. Nothing was lost" (:949). Declining is a two-step panel listing consequences before "Yes, I am not taking part" (:1074-1082). The entry chat (EntryChatPage.tsx:1503, :1580, :2939, :3120) follows the same discipline.
Expected: as built.
Impact: none.
Evidence: as cited.
Confidence: High


---

<!-- from findings_pass4_flows_a_b.md -->

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


---

<!-- from findings_pass4_flows_c_d_e_f.md -->

# Pass 4, flows c to f: session completion, closing, the panel, WhatsApp

No exposed secret and no cross-organisation leak in these four flows. Every entry point scopes by
organisation or party membership before returning content. The defects are about what happens when
something fails, and about work paid for that nobody receives.

## Blockers

```
ID: P4-C01  Severity: Blocker  Axis: Bug
Location: api/src/modules/grounds/grounds.service.ts:4284-4309, conversation.service.ts:5009-5014, grounds/round-completion.ts:39-48
Observed: decline() writes DECLINED and neither records the round nor emits checkin.completed.
  isSessionReadyForReport counts a declined party as active, because they still have a userId, and
  then requires a COMPLETED check-in from every active party. recordRoundCompletion counts only
  COMPLETED. getSessionProgress does the opposite and treats DECLINED as answered.
Impact: one person declining freezes the check-in permanently. The report is never released for
  that session or any later one, while the admin screen says the round is complete. No cron
  repairs it.
Confidence: High
```

```
ID: P4-C02  Severity: Blocker  Axis: Data integrity
Location: api/src/modules/grounds/grounds.cron.ts:242-309
Observed: autoCloseStaleCheckIns writes COMPLETED directly and emits the completion event. It
  bypasses the turn floor, the substance gate, specificity scoring, record extraction, document
  anchoring, the solo artifact and ensureNextSession.
Impact: a session containing one word and twelve hours of silence is stamped complete, closes the
  round and releases the shared report as though that person gave an account. Their entries are
  never extracted, so the report is built without their content while counting them present. And
  because ensureNextSession never runs, they have no next check-in, so the next round can never
  complete either.
Confidence: High
```

```
ID: P4-C03  Severity: Blocker  Axis: Security
Location: api/src/modules/reports/reports.service.ts:1116-1178
Observed: liftedRunIn detects a verbatim run of eight words from one person's private record. It
  is applied only to sharedPicture, and only as a retry trigger. The second pass is accepted if it
  has fewer faults than the first, so a pass that fixes a tally but keeps the lift ships. If the
  second pass is no better, the first is kept, lift and all. agreements, divergences and
  centralQuestion are never scanned for lifts at all.
Impact: the file's own comment says a long lifted phrase identifies its author as surely as a
  name. A released shared report can carry one person's exact words to every other party. This is
  the same promise as P6B-015, failing in a second place.
Confidence: High
```

```
ID: P4-E02  Severity: Blocker  Axis: Bug
Location: api/src/modules/embed/static/panel.html:225-240
Observed: finishCheckIn clears the local state before the network call, then maps the response and
  discards it. The server legitimately refuses completion on a thin record with a 400 carrying
  canContinue: true. The panel never reads the status or the flag.
Impact: the check-in stays in progress on the server while the panel tells the person "That is
  done. Your report is being put together." The record is never completed, never released, nothing
  reaches the board, and the person believes it is finished.
Confidence: High
```

```
ID: P4-E01  Severity: Blocker  Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:630-660, :731-747
Observed: the same decrement-before-the-model-call as P4-H01, reached through the panel.
Impact: a person tapping "Start it" five times against a flaky model spends five sessions and sees
  five copies of "I could not open that check-in just then. Try again in a moment."
Confidence: High
```

```
ID: P4-F01  Severity: Blocker  Axis: Bug
Location: api/src/modules/whatsapp/whatsapp.controller.ts:100-106
Observed: on the platform-number route, when the check-in is NOT_STARTED the handler calls open()
  and never passes the person's text. Their message is read and then dropped.
Impact: the first thing anybody ever writes into a check-in over WhatsApp is silently discarded and
  answered with a generic opening question. It also consumes the metered session and a model call
  to reply to nothing. The per-organisation route does this correctly, so there are two behaviours
  on one channel.
Confidence: High
```

```
ID: P4-F02  Severity: Blocker  Axis: Experience
Location: api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:130-141
Observed: the answer path has no try/catch. A spent balance, the answer ceiling, a paused or closed
  check-in and an already-complete one all throw, propagate out, and are caught by the controller,
  logged, and answered to Meta with received: true. Only the "finish" branch has a catch.
Impact: the person on WhatsApp gets absolute silence for every refusal the product has carefully
  worded. They wrote a real answer and nothing came back. With the balance case the session was
  already decremented before the throw.
Confidence: High
```

```
ID: P4-F03  Severity: Blocker  Axis: Data integrity
Location: api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:42-48
Observed: no idempotency on message.id anywhere. Meta redelivers when it does not get a 200 in
  time, and the finish branch holds the response for up to twelve seconds of report polling plus a
  translation call before sending.
Impact: a redelivered message is processed as a fresh answer. Another turn, another model call,
  another slot against the answer ceiling, and potentially another session decrement. Duplicate
  answers reach the record and the report.
Confidence: High
```

```
ID: P4-F04  Severity: Blocker  Axis: User value
Location: api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:146-165
Observed: the completion listener returns early whenever a WhatsAppThread row exists, on the
  reasoning that the finish handler already sent the report. But a thread row is created by any
  WhatsApp interaction with that check-in, and deleted only in the WhatsApp finish branch.
Impact: a person who exchanges one WhatsApp message about a check-in and then finishes it in the
  app or the panel gets no report on WhatsApp at all, ever. The report is generated, the synthesis
  paid for, and the channel they were using goes quiet at the moment it had something to say.
Confidence: High
```

## Majors, in brief

Session completion and closing: P4-C05 the brevity retry has no catch, so a cosmetic length pass
can destroy a synthesis that already succeeded and the release never happens; P4-C06 `extract`,
which every synthesis and extractor uses, has no timeout while `respond` has ninety seconds;
P4-C07 every listener failure lands in one catch that logs and nothing else, so the participant
sees "complete", the lead sees no report, and nothing anywhere says why; P4-C08 the Slack "a report
is ready" notice is sent before the all-emails-failed check that leaves the report unreleased;
P4-C09 the repair sweep covers only session one, so a failed release mid-run is permanent;
P4-C04 when the picture still has a severe fault after two passes it is silently replaced with the
previous round's picture and dated today.

Closing: P4-D01 beginClosingSession loops without a transaction while the client says "nothing has
changed for anyone", and a retry creates a second final session per person; P4-D02 the loop does
not exclude managing-only leads or people who never joined, which can make the closing round
permanently unready; P4-D03 nothing anywhere sets isFinal back to false and there is no un-close,
yet the confirm does not say it is one-way; P4-D04 a ground can reach CLOSED with no closing
synthesis, and the repair query skips exactly the grounds broken by a decline or an auto-close;
P4-D05 the closing email goes to every participant row, including people who declined or never
joined.

Panel: P4-E03 every non-2xx from open() becomes "Try again in a moment", including the billing wall
that cannot be fixed by trying again; P4-E04 the assistant lane parses the body without checking
the status, so a refusal produces total silence, which the file's own comment forbids; P4-E05 no
in-flight lock on the composer and one failure string for a network error, a ceiling and a legal
hold; P4-E06 the panel auto-completes on sessionComplete while WhatsApp asks first, and completion
is irreversible; P4-E07 the once-daily nudge is marked used before the line reaches the person.

WhatsApp: P4-F05 a failed report send is swallowed, so synthesis and a translation call are paid
for and thrown away with no record; P4-F06 a roster person with no linked account is told "You have
no check-in open right now", which is false; P4-F07 a message of twelve characters or fewer is used
to trigger the open and then discarded; P4-F09 any bare number is eaten as a menu pick even
mid-answer, so answering "7" switches check-in; P4-F10 an undelivered reply on the platform route
is logged and lost after the session and model call were spent; P4-F12 "finish" against a
not-started check-in is written into the record as an answer.

Lower: P4-E08 any panel session can settle another person's objective disagreement; P4-E09 an idle
panel polls the host for ever; P4-E11 outbound postMessage uses a wildcard origin while inbound is
checked; P4-F13 an unknown organisation id or a disabled connection swallows every message with no
log and no counter; P4-F15 two live inbound WhatsApp handlers with materially different behaviour;
P4-C10 the board reports a transient server error as a permission problem; P4-C11 the repair sweep
re-sends the "X has checked in" email each time it fires; P4-D06 the resolution panel's labels
change the moment you press a button; P4-D07 re-proposing the same end state re-mails everybody.


---

<!-- from findings_pass4_flows_g_h.md -->

# Pass 4, flows g and h: the machine API and billing

Machine API cross-organisation isolation is clean. Every handler passes the token's own
organisationId and no route takes an organisation from the path or body. The defects below are
about the per-person fence inside an organisation, and about money.

```
ID: P4-H01
Severity: Blocker
Axis: Bug
Location: api/src/modules/conversation/conversation.service.ts:630-640 and :733
Observed: on a metered check-in the session balance is decremented at line 636, and the model is
  called at line 733, roughly a hundred lines later. The model call is not wrapped in a try/catch
  and there is no compensating increment anywhere. Verified: `sessionsBalance` appears six times
  in the file and the only write is that decrement.
Expected: the meter is charged when the work succeeds, or reversed when it does not.
Impact: a model timeout, rate limit or error leaves the balance one lower with no AI turn written.
  The person sees an error and retries. The two guards that would stop a second charge both look
  for an AI turn, and no turn was written, so the retry decrements again. Every failed attempt
  burns another paid session, silently, until they are told they are out of check-ins they never
  received. There is no refund, reversal or credit path anywhere in the billing service.
Confidence: High
```

```
ID: P4-H02
Severity: Blocker
Axis: Security
Location: api/src/modules/billing/billing.service.ts:395-412, billing.controller.ts:66-72
Observed: claimFreeExtension checks the caller's own organisation for freeExtensionUsed, then runs
  ground.update({ where: { id: groundId } }) with groundId taken straight from the request body and
  never checked against that organisation. The neighbouring purchaseSession does exactly that check
  at :214.
Expected: the pattern used everywhere else, findFirst({ where: { id: groundId, organizationId } }).
Impact: an admin of one organisation can increment the session balance of a check-in in another
  customer's tenant, and write a billing event against their own organisation pointing at it. It
  spends their own one-time extension, so it is griefing rather than theft, but it is a write
  across the tenant boundary from an unvalidated body field.
Confidence: High
```

```
ID: P4-G01
Severity: Blocker
Axis: Security
Location: api/src/modules/public-api/public-api.controller.ts:1152-1171, grounds-by-api.service.ts:649, :827
Observed: GET /people/:personExternalId/forecasts and GET /people/:personExternalId/before-a-conversation
  call service methods whose signatures take no fence, and the controller never passes req.machine.
  Both return one named person's open commitments, unresolved findings and both sides of their
  handoffs. Verified: neither signature has a fence parameter.
Expected: the treatment the parallel routes already get. report, structuredFindings, senseCheckGround
  and commitmentsOf all receive req.machine and call mayTouch.
Impact: a credential deliberately issued with boundToPersonExternalIds set, the whole purpose of
  which is that a sales integration and an engineering one are not the same integration, reads any
  person in the organisation by putting their external id in the path. The boundary the customer
  configured is absent on the two most person-specific reads in the API.
Confidence: High
```

```
ID: P4-H05
Severity: Major
Axis: Bug
Location: client/src/pages/billing/BillingCallbackPage.tsx:22-58
Observed: the payment success screen is rendered entirely from URL query parameters that Stripe put
  in the return URL. It asserts "You are now on the {plan} plan" and "Unlimited check-ins and
  unlimited sessions are now active". Nothing reads back the organisation's actual state, and the
  page navigates away after three seconds.
Expected: confirm before asserting, or word it as payment received and activating.
Impact: the redirect from Checkout routinely beats the webhook. If the webhook then fails, and
  P4-H07 and P4-H08 give it several ways to, the customer has been told in plain words that they
  are subscribed when they are not.
Confidence: High
```

```
ID: P4-H07
Severity: Major
Axis: Bug
Location: api/src/modules/billing/billing.service.ts:966-988, :1059-1096
Observed: the subscription webhook branch calls stripe.subscriptions.retrieve before updating the
  organisation, unguarded. If it throws, the organisation is never activated. The
  invoice.payment_succeeded branch does not activate a subscription either; it sends a renewal
  email and writes a ledger row. There is no reconciliation job.
Expected: activate from the session metadata first and enrich afterwards, or treat
  invoice.payment_succeeded as a second chance.
Impact: a Stripe blip during webhook handling means the customer has paid, Stripe holds an active
  subscription, and our record says nothing. Nothing alerts, and the customer has already been
  shown the screen above telling them they are on the plan.
Confidence: High
```

```
ID: P4-H03
Severity: Major
Axis: User value
Location: api/src/modules/billing/billing.service.ts:395-402, client/src/components/PostSessionPanel.tsx:52-66
Observed: claimFreeExtension has no isFreeGround guard, and the panel offers "Add one more free
  session" whenever the extension is unused, with no check on whether the check-in is metered at
  all. A free-tier check-in already has unlimited sessions.
Expected: the guard purchaseSession already has, which refuses with "This check-in has unlimited
  free sessions - nothing to purchase".
Impact: the organisation's single one-time extension is spent on a check-in that never needed it.
  freeExtensionUsed is a boolean with no reset path, so it is unrecoverable. The person is told
  "Free session added" and got nothing.
Confidence: High
```

```
ID: P4-H04
Severity: Major
Axis: Experience
Location: client/src/pages/grounds/GroundParticipantPage.tsx:174-183, billing.controller.ts:64-72
Observed: the free-extension route is admin-only. Both surfaces that render "Continue for free" are
  participant-facing and shown to whoever hit the paywall. The failure handler says "Could not
  claim free session. Try again."
Expected: hide the button from people who cannot use it, or say who can.
Impact: a blocked participant who is not an admin presses a button that can never work and is told
  to try again. The same message covers "already used", which is permanent.
Confidence: High
```

```
ID: P4-G04
Severity: Major
Axis: Data integrity
Location: api/src/modules/public-api/public-api.controller.ts:467-473
Observed: Idempotency-Key is honoured on POST /subjects and POST /subjects/bulk only. POST /grounds,
  /role-assignments, /primary-actions, /objective-drafts and /evidence accept no key and are not
  upserts.
Expected: the reasoning in idempotency.service.ts, that a network timeout on our side looks exactly
  like a refusal from theirs so any integration worth connecting retries, applies identically to
  opening a check-in.
Impact: a retried POST /grounds after a timeout creates a second check-in, consumes one of the
  organisation's ten free ones, and sends a second set of invitations to the same people.
Confidence: High
```

```
ID: P4-G03
Severity: Major
Axis: Data integrity
Location: api/src/modules/public-api/grounds-by-api.service.ts:350-400
Observed: seedObjectives loops the submitted array and throws on the first bad item. Every prior
  item has already been written. There is no transaction.
Expected: validate the batch before writing, or wrap it, or adopt the bulk-import shape that skips
  bad rows and lists them.
Impact: a caller who gets a 400 cannot tell whether nothing, some, or nearly all of their
  objectives landed.
Confidence: High
```

Also recorded: P4-H06 the session-fee webhook branch keeps the check-then-act dedupe that was
replaced elsewhere, so a duplicate delivery 500s and Stripe retries a processed payment for ever;
P4-H08 the webhook handler has no wrapping try/catch, so any throw becomes a non-2xx and a
deterministic failure sticks permanently with no operator signal; P4-H09 no idempotency key on
Checkout creation, so two tabs can pay twice and the second overwrites the first, orphaning a live
subscription; P4-H10 the carefully worded "billing is not set up on this deployment, no card was
touched" is thrown and then discarded by a generic toast; P4-H11 a live admin-guarded $5 charging
route whose own annotation says it is legacy and unreachable; P4-H12 there is no refund, reversal
or credit path anywhere, so every consumption defect above is permanent for the customer;
P4-G02 two routes over the same detector table, one fenced and one not; P4-G05 a route annotated
with a read scope that runs detectors and writes proposals; P4-G07 a revoked credential's issued
token keeps working for the rest of its fifteen minutes.


---

<!-- from findings_pass5_screens.md -->

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

---

<!-- from findings_pass6_7.md -->

# Groundwork audit, Pass 6 (user value) and Pass 7 (cross-cutting consistency)

Read only. Branch `fix/the-brief-is-yours-and-the-context-chat-takes-work`, 2026-09-10.

Prior passes read first and not repeated: `audit_map.md`, `browser_findings.md`, `browser_to_code.md`,
`notify_to_code.md`, `findings_pass6c.md`. The promise-against-marketing audit is Pass 6b and is not
here. Where this pass corrects an earlier one it says so.

---

## Pass 6. User value

### Role 1. The anonymous visitor at `/start`

**The job.** Describe a situation at work and find out whether this product has anything to say about it.

**Can they complete it.** Yes. `/start` is guarded only by `MayOpenCheckIns` (`client/src/App.tsx:365`),
the entry chat routes are `@Public()` (`api/src/modules/entry/entry.controller.ts:206-370`), and the
visitor gets a real, specific report at the end with no account. Confirmed live in the browser pass.
Steps to first value: pick a situation, describe it, answer roughly three questions, read the report.
None of the four is avoidable and none should be. This is the best thing in the product.

**What it asks for and never uses.** `alignmentStatus`. One of two fields the commit DTO accepts
(`entry.controller.ts:114-116`), enum-validated, and never written anywhere. See P6-001.

**What it shows that cannot be acted on.** The session count on the summary card. BR-003 found it stated
as a settled fact with no provenance; the code side is P6-002.

**What it makes them do that it could do.** Nothing significant. This flow does the work.

**First value, and how long.** The end-of-session report, after three or four answers. Minutes.
Then the product throws seven ninths of it away (P6-001).

**Open twice.** Not applicable; `/start` is by design a one-time door.

---

### Role 2. The organisation member who is a participant

**The job.** Somebody invited me. Answer, and see what came of it.

**Can they complete it.** Yes, but the paywall can stop them with a sentence that is not true (P6-004).

**What it asks for and never uses.** Nothing found that is participant-entered and unread.
`roleAsDescribed`, `managingOnly`, `brief`, record entries and participant notes all have live readers
(`participants.service.ts:39`, `conversation.service.ts:1966`, `grounds.service.ts:1610`).

**What it shows that cannot be acted on.** The paywall's "Upgrade organisation" button, offered to any
initiator, where the route behind it is `@Roles(ADMIN)` (P6-003).

**What it makes them do that it could do for them.** Nothing large.

**First value.** Their own private session report, immediately on finishing. Verified in the browser pass.

**Open twice.** The Setup tab of `/grounds/:id/p` now holds one panel
(`GroundParticipantPage.tsx:756-763`). Worth opening once.

---

### Role 3. The organisation admin who leads check-ins

**The job.** Find out what the people I lead actually think, and what to do about it.

**Can they complete it.** Yes. The gate in front of it is `/org/setup`, one unavoidable step that exists
for a field nothing sends mail to (P6-005).

**What it asks for and never uses.** `Organization.email`. Mandatory, blocks every signed-in route, read
in three places, never used to contact anybody (P6-005).

**What it shows that cannot be acted on.** Nothing material beyond the paywall above.

**What it makes them do that it could do for them.** Connect Slack or Teams, and connect the embed. Both
subsystems are built, both fire, and neither has any interface that can create the row they need
(P6-006, P6-007). The admin cannot do it either; only a hand-written database row can.

**Where a number has no provenance.** `avgDaysToFirstCheckin` and the retention percentages on `/admin`
carry no sample size and no date range (`AdminPage.tsx:573, 592`). Staff-only, so Minor. The customer
board is careful: `BoardPage.tsx:466-470` refuses to draw a bar when no target is set and says
"no number set". The cadence is the exception (P6-002).

**First value.** The first session report on their own check-in.

**Open twice.** `/org/guide` is 83 lines of static copy with no query, linked from one button
(`OrgMembersPage.tsx:566`). Read once, never again. That is correct for a guide.

---

### Role 4. Groundwork staff

**The job.** Run the company and support customers.

**Can they complete it.** Yes, at a cost that is the largest single user-value observation in this pass:
133 HTTP routes across nine ops controllers, 34 `/ops` screens, and 42 of the 152 Prisma models
(28 per cent of the schema) serve a handful of internal staff rather than any paying customer. See
P6-008. Alongside that, the platform console is built twice (P7-003).

**What it shows that cannot be acted on.** `GET /admin/coaching` exists specifically so somebody can read
coaching output before turning coaching on. It has no client caller, and there is no way to turn it on
(P6-009).

**Open twice.** Several of the 34 ops screens are one-time statements of position rather than working
surfaces: `/ops/what-we-are`, `/ops/workplan`, `/ops/moat`, `/ops/positioning`. Recorded in P6-008
rather than one finding each.

---

### Role 5. The machine integrator

**The job.** Push our people, objectives and events in, get findings out.

**Can they complete it.** Yes, and this is the second strongest role in the product. `Subject` is read by
twelve non-spec call sites including the conversation prompt itself
(`conversation.service.ts:2029, 4051`), the report engines (`detectors.service.ts:85, 203, 725`), the
handover brief (`handover.service.ts:131`) and the embed (`embed.service.ts:182, 281, 377`). What an
integrator pushes reaches the conversation a person has. Access is one route, not a sales cycle
(`public-api.controller.ts:98`).

**What it shows that cannot be acted on.** The webhook contract names ten events; four are refused by
name because nothing emits them (`events-we-can-actually-send.ts:53-61`). The refusal is honest and is
the right call.

**What it makes them do that it could do for them.** Guess the error shape. Success bodies on
`/api/org/v1` are raw and error bodies are enveloped (P7-010).

**Where a number has no provenance.** Nowhere found. `a-number-does-not-argue.ts` and
`a-record-with-no-provenance.spec.ts` exist for exactly this and hold.

**Correction to the map.** `audit_map.md` note 6 says `Subject`'s own schema comment reports nothing in
the live product reads it. That comment is no longer there (`schema.prisma:3066-3126`) and the reads
above are live. See P7-011.

---

### The findings

```
ID: P6-001
Severity: Blocker
Axis: Data integrity
Location: api/src/modules/entry/entry.service.ts:402-403, 1624-1628;
  api/src/modules/entry/entry.controller.ts:105-120; api/src/modules/entry/entry.service.ts:307, 314-315
Observed: the anonymous entry report the visitor reads on screen has nine fields, extracted by the model
  and required by the schema at entry.service.ts:307 - whatGroundworkSaw, alignmentStatus,
  alignmentBasis, areasRequiringAlignment, alignmentReached, honestClose, mentionedPeople,
  suggestedParties, yourRole. The commit DTO accepts two of them (EntryReportSummaryDto,
  entry.controller.ts:114-116). At merge, the persisted report is rebuilt as an object with exactly one
  key: `merged.report = { whatGroundworkSaw: merged.reportSummary.whatGroundworkSaw }`
  (entry.service.ts:402-403). That single-key object is what is written to CheckIn.sessionReport
  (entry.service.ts:1624-1628). Seven of the nine fields are shown to the person and then dropped.
Expected: the report the person read at the end of their first session is the report saved. That is what
  the-report-you-read-is-kept.spec.ts is named for, and the comment at entry.service.ts:1620-1623 says
  "the report looks nothing like what I got at the end" was reported four times.
Impact: everybody who comes in through /start, the product's only self-serve front door. Their first and
  most valuable artefact is silently truncated to one paragraph at the moment they create an account.
  sessionReport is read downstream (conversation.service.ts:4930, 4940), so the loss surfaces again as a
  thinner second session.
Evidence: entry.service.ts:402-403 is the whole reconstruction. entry.controller.ts:105-113 states in a
  comment that the client has sent `reportSummary` rather than `report` since commit e078b0d, so this is
  the path every real commit takes, not a fallback.
Confidence: High
```

```
ID: P6-002
Severity: Minor
Axis: Experience
Location: api/prisma/schema.prisma:778-789 (Ground.timelineStated, Ground.cadenceStated)
Observed: timelineDays is not nullable and cadence has a default, so both are set on every check-in from
  the moment it exists - by the lead if they said so, by DEFAULT_TIMELINE_DAYS[scenario] if they did not.
  The schema's own comment says the gap reader asks about duration only when it is ABSENT, and it is
  never absent, so the question exists and has never been asked. timelineStated and cadenceStated record
  which it was.
Expected: a number the product chose is shown as a number the product chose. BR-003 read the session
  count on the summary card as a settled fact with no provenance; this is why.
Impact: every lead. They are shown a cadence they did not set, cannot tell it apart from one they did,
  and are never asked.
Evidence: schema.prisma:778-789. The two boolean columns exist precisely to make the distinction, and no
  copy renders it.
Confidence: Medium
Check needed: grep for timelineStated and cadenceStated readers in the report and board copy. If either
  already changes a sentence, this drops to Note.
```

```
ID: P6-003
Severity: Major
Axis: Experience
Location: client/src/pages/grounds/GroundParticipantPage.tsx:788, 802-820;
  api/src/modules/billing/billing.controller.ts:61-81
Observed: the paywall overlay renders "Continue for free" and "Upgrade organisation" for anybody whose
  partyType is INITIATOR. Both routes behind those buttons, POST /billing/free-extension and
  POST /billing/subscription, are @Roles(Role.ADMIN).
Expected: a control is offered only to whoever can use it. The same file applies that rule two blocks
  down: the access-code field at :833 is gated on INITIATOR with a comment saying it "used to render for
  everyone, sending plain participants hunting for a code they were never issued".
Impact: an organisation with whoMayOpenCheckIns set to EVERYONE (schema.prisma:478-484) lets a non-admin
  open a check-in and become its initiator. That person hits the paywall, presses the only button
  offered, and gets a 403. They are blocked with no route forward and no explanation.
Evidence: the @Roles(Role.ADMIN) decorators at billing.controller.ts:63 and :72 against the ungated
  renders at GroundParticipantPage.tsx:788 and :808.
Confidence: High
```

```
ID: P6-004
Severity: Major
Axis: Bug
Location: client/src/pages/grounds/GroundParticipantPage.tsx:824-828
Observed: a non-initiator who hits the paywall is told "Your initiator has been notified. Once they add
  a session, you will be able to check in." Nothing notifies the initiator. That sentence is the only
  occurrence of the concept in the repository; a grep across api/src and client/src for a matching send
  returns this string and nothing else.
Expected: either a notification fires, or the screen tells the person to go and ask.
Impact: the blocked participant waits for a message that will never be sent, and the initiator never
  learns somebody is stuck. A stated fact that is false, at the moment somebody is blocked.
Evidence: the string at :827 and the absence of any sender. The notifications pass inventoried 48
  senders (notify_to_code.md) and none of them is this.
Confidence: High
```

```
ID: P6-005
Severity: Major
Axis: User value
Location: client/src/pages/org/OrgSetupPage.tsx:14-38; client/src/App.tsx:189, 307;
  api/src/modules/auth/auth.service.ts:1039, 1128; api/src/modules/billing/billing.service.ts:220, 495;
  api/src/modules/prompts/prompts.service.ts:417
Observed: an organisation admin cannot reach any signed-in route until Organization.email is filled in.
  App.tsx:189 and :307 redirect to /org/setup on the strength of that one column; auth.service.ts:1039
  computes the flag. The column is written at auth.service.ts:1128 and read in exactly three places:
  billing.service.ts:220 and :495, where it prefills the Stripe customer record, and
  prompts.service.ts:417, a staff read. No email is ever sent to it.
Expected: a gate in front of the whole product exists for something the product needs.
Impact: every new admin. The first thing Groundwork does after sign-up is stop them and demand a second
  email address, for a field that matters only if they later pay. 21 of 224 organisations in the local
  database have never created a check-in (findings_pass6c.md, P6C-003); this is the first wall they hit.
Evidence: the three reads above are the complete set. The gate at App.tsx:189 is unconditional for admins.
Confidence: High
```

```
ID: P6-006
Severity: Major
Axis: User value
Location: api/src/modules/workspace/workspace-notifier.controller.ts (6 routes, no client caller);
  api/src/modules/workspace/workspace-notifier.service.ts:109;
  callers at api/src/modules/reports/reports.service.ts:2939,
  api/src/modules/conversation/remind.service.ts:431,
  api/src/modules/webhooks/webhooks.listener.ts:71, 196,
  api/src/modules/webhooks/webhooks.service.ts:363
Observed: Slack and Teams notification is wired end to end. tell() has five live production call sites
  and fires on every released report, on the lead digest and on webhook escalation. It reads
  workspaceNotifier rows with findMany({where:{organizationId, enabled:true}}) at :109. The only route
  that can create such a row is on a controller with no caller in client/src or panel.html, so for every
  organisation that query returns empty and tell() returns [].
Expected: a capability that fires on five events has a way to be switched on.
Impact: every customer. A feature that would put a report into the channel the team already lives in is
  finished and starved at the input. This is capability the product needs and cannot reach, not weight
  it carries and does not need.
Evidence: the five call sites above; zero occurrences of "integrations/workspace" in client/src or
  api/src/modules/embed/static/panel.html.
Confidence: High
```

```
ID: P6-007
Severity: Major
Axis: User value
Location: api/src/modules/embed/embed-setup.controller.ts:17-35 (2 routes, no client caller);
  api/src/modules/embed/embed.service.ts (391 lines);
  api/src/modules/embed/embed-assets.controller.ts:33, 53; api/prisma/schema.prisma:1841 (EmbedConfig)
Observed: POST /integrations/embed is the only writer of EmbedConfig.allowedDomains and the only issuer
  of the embed signing secret. It has no caller in client/src. GET /embed.js and GET /embed/panel are
  served, and EmbedSessionGuard gates on config that nothing can create.
Expected: /org/integrations, the screen the Pass 0 map lists as "Connect: API, embed, WhatsApp, webhooks",
  sets the embed up.
Impact: every customer who wants the panel inside their own application. A subsystem of over 1,300 lines
  including a served loader, a panel page and a signing scheme cannot be turned on except by writing a
  database row by hand. The highest-severity of the four unreachable modules.
Evidence: the two handlers at :22 and :28; the absence of "integrations/embed" in client/src.
Confidence: High
Check needed: confirm no computed URL in IntegrationsPage.tsx reaches it. The Pass 0 path matching is
  string-based and the map flags that caveat itself (Notes for later passes, item 7).
```

```
ID: P6-008
Severity: Major
Axis: User value
Location: api/src/modules/ops/*.controller.ts (133 route decorators across 9 controllers);
  client/src/App.tsx:430-490 (34 /ops screens); api/prisma/schema.prisma (42 models named Ops*, of 152)
Observed: 28 per cent of the data model, roughly a quarter of the front-end routes and a quarter of the
  controller surface serve Groundwork's own staff rather than any customer. The customer product, by
  contrast, has four whole modules it cannot reach (P6-006, P6-007, P6-013, P6-014) and a truncated first
  report (P6-001).
Expected: nothing in the code. This is a judgement of the product, which is what this pass is for.
Impact: every customer, indirectly. Weight the product carries at a stage when the customer path has
  unfinished seams. Several of the 34 screens are statements of position rather than working surfaces -
  /ops/what-we-are, /ops/workplan, /ops/moat, /ops/positioning - which nobody has a reason to open twice.
Evidence: `grep -c "^model Ops" api/prisma/schema.prisma` = 42 against `grep -c "^model "` = 152.
  Route-decorator count across api/src/modules/ops/*.controller.ts = 133.
Confidence: High
```

```
ID: P6-009
Severity: Major
Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:56, 2436-2441;
  api/src/modules/admin/admin.controller.ts:238-239; api/src/modules/admin/admin.service.ts:79-83
Observed: coaching in the conversation is gated on platform_settings.coaching_live. The key is read at
  conversation.service.ts:2439 and at admin.service.ts:83. Nothing in api/src ever writes it: a full grep
  for 'coaching_live' returns only the two reads, the constant and a Swagger summary. GET /admin/coaching
  exists so somebody can read a batch of coaching output before deciding to turn it on - its Swagger line
  says exactly that - and it has no client caller.
Expected: a flag that gates a shipped capability has a control, and the screen built to inform the
  decision is reachable.
Impact: coaching is dark for every organisation and can only be lit by a hand-written SQL row. The
  reviewing screen built to make that decision safe cannot be opened.
Evidence: the grep result above; admin.controller.ts:239's own summary text.
Confidence: High
```

```
ID: P6-010
Severity: Major
Axis: Security
Location: api/src/modules/entry/entry.controller.ts:289-296, 311-315, 317-322, 324-330;
  api/src/modules/entry/entry.service.ts:477-481, 483-501
Observed: POST /entry/classify-intent and POST /entry/faq are @Public() and neither carries a @Throttle.
  Every sibling does: /entry/chat 30/min (:297), /entry/report 20/min (:326), /entry/join-accept 5/min
  (:355), /entry/join-confirm 10/min (:369). Both unthrottled routes reach the model - faq() calls
  guardedReply (entry.service.ts:480), classifyIntent() builds a classifier prompt (:485-501).
  classify-intent additionally has no DTO class, so the global ValidationPipe has nothing to validate
  against and there is no length bound on `description`.
Expected: the throttle the rest of the anonymous surface carries, and a DTO like every sibling.
Impact: an anonymous caller can spend Groundwork's model budget at the global 60/min/IP ceiling instead
  of the intended 20 or 30, with an unbounded prompt body on one of the two.
Evidence: the four decorator blocks read in sequence.
Confidence: High
```

```
ID: P6-011
Severity: Minor
Axis: Experience
Location: api/src/modules/entry/entry.service.ts:485-501
Observed: the scenario classifier is a single prompt listing fourteen scenario keys with one-line
  descriptions and no tie-break and no confidence output. "PIP - performance improvement, formal
  feedback, or capability concern" and "NEW_HIRE - onboarding a new hire or someone joining a team" both
  match "a new hire six weeks in who is not settling, inside a six-month probation", and the browser pass
  got PIP.
Expected: a situation explicitly about a new hire resolves to NEW_HIRE, or the classifier says it is
  unsure and asks.
Impact: BR-001's root. The scenario key reaches user-facing copy and the invitation, so the wrong key
  puts the words of a performance process around somebody's onboarding.
Evidence: the flat list at :488-501, with no precedence rule.
Confidence: High
```

```
ID: P6-012
Severity: Minor
Axis: Experience
Location: client/src/pages/admin/AdminPage.tsx:573, 592, 612, 629, 645
Observed: the platform console renders drop-off percentages, an average days-to-first-check-in to one
  decimal and average session minutes to one decimal, with no sample size beside any of them and no date
  range on the panel.
Expected: a rate carries its denominator.
Impact: staff only, so Minor. But this is the panel BR-014 found contradicting itself, and one decimal on
  a mean over a possibly tiny n reads as more certain than it is.
Evidence: the five render sites above; none is adjacent to an n.
Confidence: High
```

```
ID: P6-013
Severity: Note
Axis: User value
Location: api/src/modules/knowledge/how-we-do-it.controller.ts (4 routes, no client caller);
  api/src/modules/knowledge/how-we-do-it.service.ts:52, 117, 124, 136;
  api/src/modules/assistant/what-is-true.service.ts:50
Observed: KnowledgeCard is read live by the assistant. The only in-product way to create one - propose,
  approve, decline on org/how-we-do-it - has no client caller, so for a customer not using the machine
  API the assistant's knowledge read is permanently empty.
Expected: an organisation can tell the product how it does things without writing an API integration.
Impact: capability the product needs and cannot reach, same class as P6-006 and P6-007 but smaller.
Evidence: no occurrence of "how-we-do-it" in client/src; the live read at what-is-true.service.ts:50.
Confidence: High
```

```
ID: P6-014
Severity: Note
Axis: User value
Location: api/src/modules/alignment/ (29 routes, 1,027 non-spec implementation lines, 5 services,
  registered at api/src/app.module.ts:81);
  api/prisma/schema.prisma:3530, 3595, 3633, 3656, 3701, 3736, 3781
Observed: the alignment module implements a commercial-dispute substrate - reported figures with
  provenance, arithmetic differences, versioned agreements with terms read out of documents, obligations,
  named parties, one-sided assertions awaiting the other side. It writes seven tables. A grep for
  prisma.reportedFigure, .difference, .agreement, .agreementVersion, .agreementTerm, .assertion and
  .obligation across api/src returns zero hits outside modules/alignment/. It carries 1,336 lines of its
  own specs.
Expected: judged against this pass's question - capability the product needs and cannot reach, or weight
  it carries and does not need. Unlike the workspace notifier and the embed, nothing else in the product
  is waiting on it. It is a second product built inside the first.
Impact: 2,363 lines and 7 tables of maintained surface with no consumer, on a codebase whose customer
  path has four unreachable modules and a truncated report.
Evidence: the zero-hit grep above; no product doc outside the audit files.
Confidence: High
```

```
ID: P6-015
Severity: Major
Axis: Bug
Location: api/src/modules/whatsapp/whatsapp.controller.ts:101-109;
  api/src/modules/public-api/whatsapp-for-an-organisation.service.ts:127-136;
  api/src/modules/public-api/whatsapp-for-an-organisation.controller.ts:107-109
Observed: on both WhatsApp paths the handler catches every failure, logs it and returns
  `{received: true}`. The person who sent the message gets no reply and no error. In the platform path,
  when the check-in is NOT_STARTED the inbound text is discarded entirely - only open() runs, and the
  message is never recorded (whatsapp.controller.ts:101-104). The per-organisation path does the same
  when the inbound text is 12 characters or shorter (service:136).
Expected: a person who writes to the product on WhatsApp gets an answer or is told something went wrong,
  and their first message is not thrown away.
Impact: every WhatsApp user. The channel fails silently, which is the worst way for a messaging channel
  to fail: there is nothing on screen to distinguish "we lost it" from "it is still thinking".
Evidence: the two catch blocks and the two discard branches above.
Confidence: High
```

```
ID: P6-016
Severity: Major
Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:557-660, 633-636;
  api/src/modules/conversation/anthropic.service.ts:36-44, 67-71
Observed: open() decrements sessionsBalance with an atomic updateMany at :633-636, before the model is
  called. When the model is down, anthropic.service.ts:67-71 throws engineUnavailable() as a 503. There
  is no refund path and no deferral.
Expected: a paid session is consumed when the person gets a session.
Impact: a customer's quota is spent on a session that never happened, on every path into open(). This is
  the same ordering NL-014 found on the WhatsApp path; it is not WhatsApp-specific, it is in open()
  itself and therefore on every entry point.
Evidence: the decrement at :633-636 precedes every model call in the method; no code path restores it.
Confidence: High
```

---

## Pass 7. Cross-cutting consistency

```
ID: P7-001
Severity: Major
Axis: Inconsistency
Location: api/prisma/schema.prisma:766 (Ground), :1177 (CheckIn), :1181 (sessionNumber),
  :1819 (RoundCompletion.roundNumber), :4003 (ReportRound.round);
  api/src/modules/webhooks/events-we-can-actually-send.ts:24, 27
Observed: BR-015 named "check-in" for both a whole engagement and one session, with "ground" in the
  database. The inversion underneath it was not stated and is worse. The Prisma model called `CheckIn`
  is not the thing a user calls a check-in - it is one SESSION inside one, keyed by sessionNumber. The
  thing a user calls a check-in is `Ground`. The database uses the interface's word for the interface's
  other concept.
  The counter saying which session this is has three names: CheckIn.sessionNumber (:1181),
  RoundCompletion.roundNumber (:1819) and ReportRound.round (:4003). All three are the same integer.
  And "round", retired from every human surface by client/src/one-word-and-it-is-session.spec.ts, is
  still the published name of a webhook event: round.completed (events-we-can-actually-send.ts:24), the
  first event in the machine contract and described in its own comment as "the one the delivery
  discipline hangs on".
Expected: one word per concept, including in the contract a customer builds against.
Impact: BR-014's contradictory counters are the visible symptom. An integrator subscribes to
  round.completed and checkin.completed where the product says "session" everywhere a person can see,
  and no glossary reconciles them. Every new reader of the schema has to learn that CheckIn means
  session.
Evidence: the five schema lines and the two event names, read against the two naming guards
  (client/src/one-word-and-it-is-session.spec.ts, api/src/one-word-for-the-thing-on-the-server-too.spec.ts),
  both of which explicitly exempt the data model and neither of which reaches the webhook contract.
Confidence: High
```

```
ID: P7-002
Severity: Note
Axis: Inconsistency
Location: api/prisma/schema.prisma:514 (User), :2977 (Person), :1022 (GroundParticipant),
  :4345 (OrganizationMembership), :4832 (OpsPerson), :4864 (OpsPersonAccount)
Observed: six models represent a human being. The interface has settled on one word, "participant", and
  guards it (client/src/one-word-for-a-person.spec.ts). The model has not: User is an account, Person a
  roster entry, GroundParticipant a role in one check-in, OrganizationMembership a second membership seam
  beside User.organizationId, OpsPerson a staff member, OpsPersonAccount the link back to a User.
Expected: recorded, not condemned. Each has a stated reason and Person.linkedUserId is the documented
  roster/account seam.
Impact: none today. Recorded because five of the six can hold a name and an address, so a rule enforced
  on one is not enforced on the others - the mechanism behind NL-034.
Evidence: the six model declarations.
Confidence: High
```

```
ID: P7-003
Severity: Major
Axis: Inconsistency
Location: api/src/modules/admin/admin.service.ts:211-234 (getPlatformStats), :251-262 (getDashboard),
  :315-349 (getUsagePatterns), :630 (getFeedback), :81 (getCoaching);
  api/src/modules/prompts/prompts.service.ts:227-300 (platformDashboard), :376 (orgList),
  :427 (usageStats), :516 (feedbackSummary);
  client/src/pages/admin/AdminPage.tsx:1192-1256; client/src/App.tsx:511
Observed: the platform console is implemented twice by two services, and both are shipped. /admin
  (AdminPage.tsx) reads platform statistics from promptsApi - platform-dashboard, platform-funnel,
  org-list, usage-stats, feedback-summary. /admin/dashboard (AdminDashboardPage) reads them from adminApi
  via GET /admin/dashboard, which composes getPlatformStats, getAllCodes, getFeedback and
  getUsagePatterns. The two count different things under the same words: prompts.service.ts:257-259
  counts CheckIn rows with status COMPLETED, admin.service.ts:216 counts Ground rows, and both reach a
  label containing "check-ins".
Expected: one implementation of one number.
Impact: this is the code behind BR-014's "Check-ins completed 484 / Check-ins created 243 / Check In
  Completed 359". A staff member cannot tell which figure is right, and the answer is that they measure
  different objects that share a name (P7-001). Five routes on the admin controller - coaching, stats,
  feedback, usage, grounds/:groundId - are the unused half.
Evidence: the two count expressions above, and the two query sets at AdminPage.tsx:1192-1256 against
  App.tsx:511.
Confidence: High
```

```
ID: P7-004
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/feedback/feedback.service.ts:9-21 (GET /feedback);
  api/src/modules/admin/admin.service.ts:630 (GET /admin/feedback);
  api/src/modules/prompts/prompts.service.ts:516 (GET /prompts/feedback-summary);
  client/src/pages/admin/AdminPage.tsx:778, 1252
Observed: in-app feedback is readable through three routes on three controllers. The client calls two of
  them from the same page: feedbackApi.list at AdminPage.tsx:778 and promptsApi.feedbackSummary at
  :1252. GET /admin/feedback is called by nobody.
Expected: one read path.
Impact: minor. Corrects the Pass 0 map, which lists GET /admin/feedback under "no caller" without noting
  the capability is alive twice over elsewhere. Feedback submissions are not lost.
Confidence: High
```

```
ID: P7-005
Severity: Major
Axis: Inconsistency
Location: api/prisma/schema.prisma:4094 (PlatformSetting);
  writable: api/src/modules/billing/pricing.service.ts:198, 211;
  api/src/modules/whatsapp/whatsapp.service.ts:87
  read-only: api/src/modules/conversation/conversation.service.ts:56, 2439 (coaching_live);
  api/src/modules/conversation/the-window-for-correcting-a-record.ts:28 with
  api/src/modules/reports/reports.service.ts:1795 and
  api/src/modules/conversation/conversation.service.ts:5100 (correction_window_days)
Observed: PlatformSetting holds four keys. Two - the free ground limit and the free member limit - have
  PATCH routes and an editing UI on /admin. One - the WhatsApp toggle - has a PATCH route and a switch.
  The other two - coaching_live and correction_window_days - have readers, no writer anywhere in api/src
  and no UI. One gates a shipped conversation capability (P6-009); the other sets how long somebody has
  to correct their own record.
Expected: one mechanism. A setting is either configurable or a constant, not a row only SQL can reach.
Impact: two real product policies are configuration in form and hardcoded in practice. Whoever changes
  them does it in the database, with no validation, no audit trail and nothing in the product recording
  that it happened.
Evidence: `grep -rn "coaching_live" api/src` returns two reads, one constant and one Swagger string, and
  no write. Same shape for CORRECTION_WINDOW_KEY: two reads, one declaration, no write.
Confidence: High
```

```
ID: P7-006
Severity: Note
Axis: Inconsistency
Location: api/prisma/schema.prisma:424-427 (Organization.contributorBypass);
  :2717 (KnowledgeRetrieval), :3128 (OrgIntelligence), :3496 (DocumentElsewhere);
  :4225 (PatternConfig), :4583 (RetentionPolicy);
  api/src/modules/patterns/patterns.service.ts:643; api/src/modules/people/departure.service.ts:34
Observed: the Pass 0 dead list re-run and confirmed, extended by one. contributorBypass is new here: its
  own schema comment at :424-426 says it "exists in the database, referenced nowhere in the codebase".
  KnowledgeRetrieval, OrgIntelligence and DocumentElsewhere are written and never read. PatternConfig and
  RetentionPolicy are read and never written, so patterns.service.ts:643 and departure.service.ts:34
  always see nothing.
Expected: nothing. Recorded, with the extension noted.
Impact: two behaviours - pattern configuration and the retention policy - are permanently at their
  fallback because the row they depend on cannot be created. Same shape as P7-005.
Evidence: the schema comment at :424-426; the re-run zero-side query.
Confidence: High
```

```
ID: P7-007
Severity: Blocker
Axis: Security
Location: api/src/app.module.ts:51; api/src/modules/entry/entry.controller.ts:206-210;
  api/src/modules/whatsapp/whatsapp.controller.ts:53;
  api/src/modules/public-api/whatsapp-for-an-organisation.controller.ts:99;
  api/src/modules/email/unsubscribe.controller.ts:30;
  api/src/modules/email/resend-webhook.controller.ts:18
Observed: the throttler is registered under one name, `global` (app.module.ts:51). A @Throttle keyed to a
  throttler name that does not exist is a silent no-op. entry.controller.ts:206-210 documents this
  exactly - "a limit named for a throttler that does not exist is a silent no-op" - and was fixed to
  `global`. Four other decorators still say `default` and are therefore inert: the platform WhatsApp
  webhook (120/min intended), the per-organisation WhatsApp webhook (240/min intended), the unsubscribe
  route (20/min intended) and the Resend webhook.
Expected: every stated limit is the limit.
Impact: the unsubscribe route is the one that matters. It is @Public, takes a token in the path, and its
  own comment says the point of the limit is that "nothing should be able to sit and try" - and nothing
  is stopping anything from sitting and trying beyond the plain 60/min. The two WhatsApp webhooks get a
  LOWER limit than intended, so legitimate Meta traffic from one egress IP can be throttled and messages
  dropped.
Evidence: the four decorators against the single registration at app.module.ts:51, and the comment at
  entry.controller.ts:206-210 that already names the bug and its fix.
Confidence: High
```

```
ID: P7-008
Severity: Major
Axis: Inconsistency
Location: signed-in app: api/src/modules/conversation/conversation.controller.ts:9-14, 79-83;
  anonymous /start: api/src/modules/entry/entry.controller.ts:9-12, 14-30, 294-303;
  embedded panel: api/src/modules/public-api/public-api.controller.ts:298-304;
  WhatsApp: api/src/modules/whatsapp/whatsapp.controller.ts:52-78 and
  api/src/modules/public-api/whatsapp-for-an-organisation.controller.ts:93-111
Observed: the four entry points into a check-in validate four different amounts.
  - App: SendMessageDto, @IsString @IsNotEmpty @MaxLength(8000). The only one with a message-length cap.
  - /start: EntryChatDto with @ValidateNested over TurnDto, but TurnDto is bare @IsString on role and
    content - no MaxLength on content, no ArrayMaxSize on messages, and role is not @IsIn(['user',
    'assistant']) despite the TypeScript union. The entire conversation history is client-supplied and
    replayed to the model (entry.service.ts:927-967), so an anonymous caller can forge assistant turns.
  - Panel: `@Body() dto: { message?: string }` - an inline type, so the global ValidationPipe has no
    class and is inert. No cap, no required field, no whitelist; an empty string is a valid request. The
    sibling route at :656-668 hand-checks the same thing, so the omission is local, not a policy.
  - WhatsApp: no DTO on either path; fields are plucked off the raw request by hand.
  Client-side, three of the four enforce trim-and-non-empty and none sets a maxlength
  (ChatPage.tsx:579-587, EntryChatPage.tsx:1784-1800, panel.html:315-323). EntryChatPage.tsx:1829
  truncates a pasted document to 8000 characters client-side only; the server accepts the whole field.
Expected: one validation posture for one concept, applied at every door into it.
Impact: three of the four doors into the same conversation engine accept unbounded, unvalidated text
  bound only by the 2 MiB body limit (main.ts:71). The 8000-character rule the product decided on is
  enforced at one door out of four.
Evidence: the five DTO or non-DTO declarations above, read side by side.
Confidence: High
```

```
ID: P7-009
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/entry/entry.controller.ts:289-296, 311-315, 317-322, 324-330
Observed: five public handlers on one controller, five validation postures. `chat` and `report` have a
  DTO and a @Throttle. `opener` has a DTO and no throttle. `faq` has a DTO capped at 1000 and no
  throttle. `classify-intent` has neither.
Expected: one posture per controller, or a stated reason per exception.
Impact: the security consequence is P6-010. This entry records the pattern: the same problem solved three
  ways in five adjacent handlers.
Evidence: the four decorator blocks read in sequence.
Confidence: High
```

```
ID: P7-010
Severity: Major
Axis: Inconsistency
Location: api/src/common/interceptors/transform.interceptor.ts:37-56;
  api/src/common/filters/http-exception.filter.ts:36, 90-98
Observed: the success interceptor deliberately exempts three URL families from the `{success, data}`
  envelope - /api/org/v1, /embed.js, /embed/panel (transform.interceptor.ts:37) - so the machine API
  returns raw bodies. The exception filter has no matching exemption, so machine-API ERRORS come back
  enveloped as `{success:false, statusCode, message, errors, code?, timestamp, path}`.
  Separately, within that envelope `errors` is `responseObj.errors ?? null` (:36), but class-validator's
  failure array lands in `responseObj.message`. So a 400 from the pipe returns `message` as an array of
  strings while every hand-thrown error returns `message` as a string.
Expected: one shape. A published API's error body is the part an integrator writes code against first.
Impact: every machine integrator. They parse a raw object on success and an enveloped one on failure,
  and `message` changes type depending on which layer rejected them. Also affects the SSE routes, which
  bypass the filter entirely and emit `{type:'error', message}` at HTTP 200
  (conversation.controller.ts:97-99, entry.controller.ts:236-238), leaking the raw internal message text.
Evidence: the PUBLISHED array at transform.interceptor.ts:37 against the unconditional filter at
  http-exception.filter.ts:90-98, and the `errors` assignment at :36.
Confidence: High
```

```
ID: P7-011
Severity: Note
Axis: Inconsistency
Location: docs/audit/audit_map.md (Notes for later passes, item 6);
  api/prisma/schema.prisma:3066-3126
Observed: the map records that Subject's own doc comment says nothing in the live product reads it yet.
  That sentence is no longer in the schema, and Subject is read at twelve non-spec call sites including
  conversation.service.ts:2029 and :4051, detectors.service.ts:85, :203, :725, handover.service.ts:131,
  embed.service.ts:182, :281, :377 and assistant/what-is-true.service.ts:35.
Expected: the map is a snapshot and this one moved under it.
Impact: none, except that judging the machine API's value from the map alone would understate it badly.
Confidence: High
```

```
ID: P7-012
Severity: Minor
Axis: Inconsistency
Location: api/src/modules/grounds/grounds.controller.ts:584 (POST /grounds/:id/sign-off);
  client/src/pages/grounds/the-setup-steps-you-have-checked.ts:31, 36
  (POST /grounds/:id/setup-sign-offs); api/prisma/schema.prisma:6525 (GroundSetupSignOff)
Observed: two routes named for signing off on a check-in's setup. The client calls
  /grounds/:id/setup-sign-offs. /grounds/:id/sign-off is called by nobody.
Expected: one route.
Impact: minor, but this is the exact shape that produces a wrong fix later - the Pass 0 map lists the
  dead one without noting that a near-identically named live route sits beside it.
Confidence: High
```

```
ID: P7-013
Severity: Note
Axis: Inconsistency
Location: api/src/modules/conversation/conversation.service.ts:772-800, 791
Observed: assertGroundAcceptsInput refuses input on a closed check-in, but the branch at :791 fails OPEN
  when the status is unreadable. Elsewhere the product's convention is to fail closed: the Resend
  webhook throws Unauthorized with no secret (delivery.service.ts:70), the WhatsApp inbound throws with
  no app secret (whatsapp.service.ts:56), and production refuses to boot without its keys
  (main.ts:17-30).
Expected: one direction of failure for one class of uncertainty.
Impact: none established; the status being unreadable is not a state anything is known to reach.
  Recorded because it is the single fail-open in a codebase that otherwise fails closed.
Confidence: Medium
Check needed: establish whether any code path can present a Ground with an unreadable status. If none
  can, this closes.
```


---

<!-- from findings_pass6b.md -->

# Pass 6b. The promise audit

68 claims extracted from the marketing site, the in-product Connect page, the lead's guide, the API
terms, the sign-up copy and the situation catalogue.

| Verdict | Count |
|---|---|
| Delivered | 44 |
| Partly delivered | 16 |
| **Not delivered** | **5** |
| Delivered but not findable | 3 |

Every "Not delivered" claim is a Blocker by the audit's own rule.

## The five claims the product does not deliver

| # | Claim, in its own words | Where it is made | Finding |
|---|---|---|---|
| 8 | "Groundwork never shows anyone's raw answers" | how-it-works.astro:89 | P6B-001 |
| 13 | "% document-backed" on the participant page and board | index.astro | P6B-002 |
| 22 | "They cannot request an individual's check-in, and there is no screen anywhere that shows one, including ours." | index.astro:367 | P6B-004 |
| 45 | "Cancel from the billing page and your subscription ends at the close of the billing period." | pricing.astro FAQ | P6B-011 |
| 47 | "You can still run Grounds on the free plan (up to 10 total)." | pricing.astro FAQ | P6B-012 |

## Delivered but not findable, each Major by the rule

| # | Capability | Finding |
|---|---|---|
| 66 | The lead's guide, which says "Send this link to your team" but sits behind an admin-only link inside the signed-in app | P6B-018 |
| 69 | The only contact route on the About page is a mailto, which the pricing page's own source says was removed there for being broken | P6B-019 |
| 70 | WhatsApp check-ins, the embedded panel, patterns, webhooks and the ops back office appear nowhere on the marketing site | P6B-020 |

Prices were checked figure by figure. Starter $25 for 5, Small Team $90 for 20, Growth $400 for 100,
Business $900 for 250, Scale $1,650 for 500, Enterprise contact us. Every one matches what the app
charges today. The risk is P6B-010, not the current numbers.

---

## Findings

```
ID: P6B-004
Severity: Blocker
Axis: Security
Location: api/src/modules/grounds/grounds.controller.ts:566-570, api/src/modules/grounds/grounds.service.ts:4163-4200
Observed: GET /grounds/:id/conversation returns every participant's raw conversation turns, grouped
  by party, with participantId, email, partyType and the full content of every turn. The only gate
  is `where: { id: groundId, initiatorId: requestingUserId }`, which is the lead.
Expected: "Leaders get the report. They cannot request an individual's check-in, and there is no
  screen anywhere that shows one, including ours." index.astro:367. And "What an admin can see:
  ...Never anybody's check-in itself." LeadsGuidePage.tsx:68-72.
Impact: every participant. This is the promise the product is sold on and the reason a person
  answers honestly. No client screen calls the route, so the "no screen" half is literally true.
  The "cannot request" half is false: the route is live, it is in the generated API reference, and
  any lead with a browser console can call it.
Evidence: verified directly. Controller summary reads "(initiator only)". Service selects
  `conversationTurn.findMany({ select: { id, role, content, createdAt } })` per participant, with
  participant email alongside.
Confidence: High
```

```
ID: P6B-002
Severity: Blocker
Axis: Data integrity
Location: api/src/modules/reports/reports.service.ts:1326-1341
Observed: documentBackedPct counts record entries whose evidenceType is DOCUMENT_AT_AGREEMENT or
  DOCUMENT_AFTER. A repository-wide search finds zero writes of evidenceType anywhere in api/src.
  The only reads are reports.service.ts:1326,1337 and patterns.service.ts:440,472, and the schema
  default is CHECK_IN. The previous writer was deleted, documents.service.ts:443-452 records that
  it was, and nothing replaced it. The figure is structurally always zero.
Expected: the homepage shows four worked reports, each carrying a document-backed figure of 64%,
  83%, 29% and 76%.
Impact: the number is rendered to users at GroundParticipantPage.tsx:666 and in board.service.ts
  as "N% of it is backed by a document". It gates a capability line that can never be true, and it
  permanently suppresses the strong coverage band, which requires above 30. A separate and working
  implementation exists in the-session-report.ts:384-385, so the same promise is true on one
  surface and false on another.
Evidence: verified. grep for evidenceType across api/src returns four reads and no writes.
Confidence: High
```

```
ID: P6B-011
Severity: Blocker
Axis: Bug
Location: api/src/modules/billing/billing.service.ts:564-577
Observed: cancelSubscription calls stripe.subscriptions.cancel(), which ends the subscription
  immediately with no proration, then nulls subscriptionPlan, subscriptionStatus, subscriptionStripeId
  and subscriptionPeriodEnd. cancel_at_period_end is never set. The controller's own summary says
  "Cancel the org subscription immediately."
Expected: "Cancel from the billing page and your subscription ends at the close of the billing
  period. No penalties, no questions."
Impact: anyone cancelling on day two of a month loses twenty-eight paid days and their seats at
  once, having read the opposite in writing on the page they bought from.
Confidence: High
```

```
ID: P6B-012
Severity: Blocker
Axis: Inconsistency
Location: api/src/modules/billing/billing.service.ts:173-197
Observed: canCreateGround counts every check-in the organisation has ever created and compares it
  to the free limit. It is a lifetime counter, not a remaining allowance. An organisation that
  created forty while subscribed and then cancels gets zero free ones, not ten.
Expected: "You can still run Grounds on the free plan (up to 10 total)."
Impact: a cancelling customer reads that the free plan is still open to them and finds it is not.
Confidence: High
```

```
ID: P6B-001
Severity: Blocker
Axis: Inconsistency
Location: marketing/src/pages/how-it-works.astro:89 against marketing/src/pages/index.astro:366
Observed: how-it-works states that raw answers are never shown. The homepage states the opposite,
  and the homepage is correct: report divergences carry direct quotes of what a person said about
  their own work. The guard that exists to stop exactly this sentence,
  the-site-does-not-promise-more-than-this.spec.ts:29, reads only index.astro, so the same false
  claim survives one page over.
Expected: the sentence to be removed, as it already was from the homepage.
Impact: a buyer or a participant who reads how-it-works and then reads a real report finds their
  own words quoted. The guard's docstring records that this sentence was removed once for being
  false, so the company already knows.
Confidence: High
```

```
ID: P6B-009
Severity: Major
Axis: Inconsistency
Location: api/src/modules/conversation/prompt-library.ts:3512, :3528
Observed: the assembled session-two opening prompt instructs the model to tell the participant
  "who has submitted, what the confidence score is, whether the alignment map has updated".
Expected: "Nobody is scored, ranked or watched", how-it-works.astro:89 and pricing.astro:218. "It
  is not a score, and it is not a grade out of five", how-it-works.astro:93.
Impact: a participant told their confidence score at the start of session two has been scored, in
  the exact words the site says will never be used. It is a prompt-level leak, so no structural
  guard on the report will catch it.
Confidence: High
```

```
ID: P6B-014
Severity: Major
Axis: Security
Location: marketing/src/pages/privacy-and-ai.astro:55 against api/src/modules/admin/admin.controller.ts:232-307
Observed: a platform admin can read per-user usage, per-organisation rosters with participant
  emails, check-in status and report state. Content is genuinely excluded and pinned by a test.
  Separately the repository's own PRIVACY-AND-AI-AUDIT.md records that anybody holding DATABASE_URL
  can read every check-in.
Expected: "Groundwork staff cannot access your OKRs, check-ins, team performance, evidence, or
  underlying organizational data. We only see information you deliberately send to us."
Impact: the sentence is broader than the code. Rosters, emails and completion state are
  organizational data. No test reads privacy-and-ai.astro, so nothing notices if the gap widens.
Confidence: High
```

```
ID: P6B-015
Severity: Major
Axis: User value
Location: api/src/modules/reports/counts-accounts.ts:16-62, api/src/modules/reports/deferrals.ts:260,275
Observed: "never says who said what about whom" is structurally enforced on the private guide, the
  manager board and name resolution. It is not structurally enforced inside the shared synthesis
  prose, where the only protection is a prompt line plus countsAccounts, which by design detects
  and warns and never rewrites.
Expected: the codebase's own standard, quoted in guide-sanitiser.ts: "a prompt is a request, and a
  model that complies most of the time is worse than one that never does".
Impact: the most load-bearing privacy promise rests, on the report body itself, on a model
  complying.
Confidence: High
```

```
ID: P6B-010
Severity: Major
Axis: Data integrity
Location: api/src/modules/billing/pricing.service.ts:99-115 against marketing/src/pages/pricing.astro
Observed: prices and seat caps are editable at runtime and read live by the app. The marketing page
  hardcodes them at build time. The guard compares the marketing page against a seed file that
  reproduces the migration values, not the live table.
Expected: the guard's own failure message asserts the page tracks what is charged.
Impact: the first time an admin changes a price the public site is wrong and every test still
  passes. A buyer reads one number and is charged another.
Confidence: High
```

```
ID: P6B-006
Severity: Major
Axis: User value
Location: api/src/modules/conversation/conversation.service.ts:3308-3345
Observed: a participant's next session is created only when they complete the current one. Nothing
  on a clock creates a missed round. Reminders do send, but a person who never opens session one
  never receives session two.
Expected: "Groundwork runs regular check-ins and prompts people automatically when it is their
  turn, so you are not left chasing anyone."
Impact: the lead. The claim is that the product removes the chasing. A quiet participant's run
  silently stops advancing, and the report has fewer accounts than the lead expects.
Confidence: Medium
Check needed: open a fortnightly check-in with two people, complete one, leave the other untouched
  for four weeks, and confirm whether the silent one is ever given session two.
```

```
ID: P6B-008
Severity: Major
Axis: User value
Location: api/src/modules/reports/reports.service.ts:649-696, :1715-1717
Observed: the closing synthesis delivers objectives against delivered, expectations changed,
  evidence and the complete history. There is no field and no producer for "the key decisions" or
  for "what was learned".
Expected: the closing report contains all six named parts.
Impact: four of six land. The two missing are the parts a leader would quote in the next
  conversation.
Confidence: High
```

```
ID: P6B-018
Severity: Major
Axis: Experience
Location: client/src/pages/org/LeadsGuidePage.tsx:38, client/src/App.tsx:504
Observed: /org/guide is linked from one place, behind an admin-only control. The page tells the
  reader to "Send this link to your team", but the route is inside the signed-in app, so a
  colleague who has not accepted their invitation cannot open it.
Expected: a guide meant to be sent to a team is readable by that team.
Impact: the page exists to brief people before their first check-in. A lead who is not an
  organisation admin cannot find it, and the people being briefed cannot read it.
Confidence: High
```

```
ID: P6B-020
Severity: Note
Axis: User value
Location: marketing/src/pages/, the whole site
Observed: WhatsApp check-ins, the embedded panel, the pattern detector, webhook delivery, the
  departure sweep, the Monday intelligence brief and the whole ops back office are mentioned
  nowhere. The words WhatsApp, panel, API and integration do not appear in marketing/src/pages/.
Expected: this is the inverse check, so nothing.
Impact: the two most saleable capabilities the product has, running a check-in over WhatsApp and
  embedding it in a customer's own product, are invisible to a prospect. A customer finds them
  only by opening the Connect page, which nothing on the site links to.
Confidence: High
```

Also recorded, lower severity: P6B-003 the EVALUATION board family deliberately omits the four-state
strip the homepage shows on a probation example; P6B-005 the marketing site says "Ground" three
times, a noun the product stopped using; P6B-007 "where expectations differ" is promised as a report
section and exists only as a count tile; P6B-013 the public coaching request writes a different
table from the in-product one and notifies nobody; P6B-016 "about ten minutes" is unmeasured, and
deliberately so; P6B-017 nothing detects a terms-version bump for an already-approved organisation;
P6B-019 the About page's only contact route is a mailto.


---

<!-- from findings_pass6c.md -->

# Pass 6c. Thin data probe

Read-only SELECTs against the local test database, plus the browser evidence in `browser_findings.md`
(BR-019). No screen was judged from code alone where I could open it instead.

## What the data actually looks like

| Measure | Count |
|---|---|
| Organisations | 224 |
| Organisations with no check-in at all | 21 |
| Organisations with at least one check-in | 203 |
| ...of those, with zero completed sessions | 25 |
| ...with exactly one completed session | 24 |
| ...with two or three | 147 |
| ...with four or more | 7 |
| Check-ins (grounds) | 243 |
| ...with two or more people on them | 200 |
| ...with fewer than two people | 43 |
| Reports released | 148 |
| ...built from fewer than two people's answers | 1 |

Read that as: **49 of 203 organisations, 24 per cent, are at zero or one completed session.** That
is the population every screen has to be worth opening for.

## Screen by screen

| Screen | Minimum data to be worth opening | What it renders today at the thin end | Class |
|---|---|---|---|
| Private session report | one completed session | The full report. Two named open items, what was noticed, why it matters, what to do next. Verified live in Job 1 from three answers. | **Useful** |
| Team board | two people answered in one session | "Nothing to compare yet, one side has answered so far", "No target set", "None, nobody named anything holding work up", "All from memory". No chart, no total. | **Sparse but honest** |
| Report tab | one released report | "Forming, 1 of 2 answered, waiting on Hafsah", and an explicit offer to close the round early and publish what there is. | **Sparse but honest** |
| Check-in list | one check-in | Says what each is waiting on and who. | Useful |
| Shared report | two people through the same session | Never fabricated. Zero of the 43 solo check-ins has a released report, and 147 of 148 released reports came from two or more people. | Useful |
| Platform usage panel | any | Contradicts itself, see BR-014. Not a thin-data problem. | n/a |

Nothing in this product renders a confident chart or total over a sample too small to carry it.
That is the failure mode the method singles out as the important one and it does not occur here.

---

```
ID: P6C-001
Severity: Major
Axis: User value
Location: 43 of 243 check-ins, those with fewer than two people. Example rows: "Ada joining the
  platform team" (NEW_HIRE, OPEN, 1 session done), "Weekly engineering read" (PULSE_CHECK, OPEN,
  1 done), "Marcus - delivery concerns" (PIP, OPEN, 1 done).
Observed: a check-in with one person on it can never produce the thing the product exists for. A
  shared report needs two accounts to compare. Zero of these 43 has a released report and none
  ever will while they stay solo. They sit at OPEN or ACTIVE indefinitely. The owner gets their
  private report, which is real value, and then waits for a second half that cannot arrive.
Expected: the product says so. Either the check-in cannot be created without somebody to compare
  against, or the screen says plainly that the shared report is waiting on a second person and
  offers to add one.
Impact: 18 per cent of all check-ins in this database. The user has done the work and is waiting
  for a payoff the product has already decided cannot happen.
Evidence: SELECT over grounds with fewer than two ground_participants: 43 total, 0 with
  released_at set, 1 in a terminal status. Session counts of 1 on the examples above.
Confidence: Medium
Check needed: open one of those 43 as its owner and read what the check-in page and the report
  tab say. If either already says "waiting on somebody else to be added", this drops to Minor.
```

```
ID: P6C-002
Severity: Note
Axis: Data integrity
Location: reports table, one row
Observed: 147 of the 148 released reports were built from two or more people's completed
  sessions. One was released from fewer than two.
Expected: a shared report needs two sides, unless the second person is deliberately
  managing-only, in which case one account is correct and the row is fine.
Impact: none established. Recorded so the code pass can say which of the two it is.
Evidence: SELECT counting distinct completed participants per released report.
Confidence: Unverified
Check needed: identify that report's ground and check whether its second participant is flagged
  managingOnly. If it is, this is correct behaviour and the finding closes.
```

```
ID: P6C-003
Severity: Note
Axis: User value
Location: 21 organisations with no check-in at all
Observed: 9 per cent of organisations in this database have never created a check-in. They
  signed up and stopped.
Expected: nothing in the code. Recorded because it is the population the empty state of
  /grounds is written for, and it is larger than any other single cohort except the 2-3 session
  group.
Impact: none directly. It is the number that says how much the first-run experience matters.
Evidence: SELECT counting organisations with zero grounds.
Confidence: High
```


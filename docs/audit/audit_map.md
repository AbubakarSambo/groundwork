# Groundwork audit, Pass 0: the map

Read only. No judgements. Everything below points at a file, a route or a table that was read on 2026-09-10, branch `fix/the-brief-is-yours-and-the-context-chat-takes-work`.

Totals: 526 HTTP route handlers across 47 controllers, 152 Prisma models, 23 `@Cron` jobs, 16 `@OnEvent` listeners, 7 sendable outbound webhook events, 11 external network destinations, 76 front-end routes.

---

## A. ROUTES

### Global setup

| Thing | Where | Effect |
|---|---|---|
| Global prefix | `api/src/main.ts:74` | Every route is served under `/api/v1/...` |
| Prefix exclusions | `api/src/main.ts:75-82` | `api/org/v1/*` (all methods), `GET /embed.js`, `GET /embed/panel` are served at the bare path |
| Global guard 1 | `ASyncLoopIsNotABrowser`, `api/src/app.module.ts:88` | Throttling. Machine callers limited per credential, not per IP |
| Global guard 2 | `JwtAuthGuard`, `api/src/app.module.ts:89` | Session required unless the handler or controller is `@Public()` |
| Global guard 3 | `RolesGuard`, `api/src/app.module.ts:90` | Enforces `@Roles(Role.ADMIN)` etc. |
| Global guard 4 | `BackOfficeDoorGuard`, `api/src/app.module.ts:92` | Any path matching `/ops` or `/admin` also needs a weekly emailed code unless the session came from Google. `api/src/modules/back-office/back-office-door.guard.ts:16-22` |
| Global filter | `GlobalExceptionFilter`, `app.module.ts:94` | |
| Global interceptor | `TransformInterceptor`, `app.module.ts:95` | Wraps every response body |
| Base throttle | `app.module.ts:51` | 60 requests / 60s, name `global` |

Three routes are registered on the raw Express adapter, outside Nest and outside every guard:

| Method | Path | File | Auth |
|---|---|---|---|
| GET | `/health` | `api/src/main.ts:172` | none |
| GET | `/health/ai` | `api/src/main.ts:178` | none. Makes a real Gemini call, 503 when the model is down |
| GET | `/health/email` | `api/src/main.ts:192` | none. Sends a real email to any `?to=` address |

`GET /api/docs` (Swagger) is behind a hand-rolled middleware, `api/src/main.ts:154-168`: a `docs` JWT in `?key=` or the `gw_docs` cookie, or open when `DOCS_OPEN=true`.

Notation below: paths are shown as declared. Prepend `/api/v1/` except where the controller path starts `api/org/v1` or is `embed.js` / `embed/panel`. "Global" in the auth column means the four global guards and nothing more, so a signed-in member of the organisation.

---

#### admin — `api/src/modules/admin/admin.controller.ts`
Controller guard: `@UseGuards(PlatformAdminGuard)` at `:59`, controller path `admin` at `:60`. Also passes the back-office door.

| Method | Path | Handler | Extra guard |
|---|---|---|---|
| GET | `admin/pricing` | `getPricing` :79 | |
| GET | `admin/pricing/free-ground-limit` | `getFreeGroundLimit` :85 | |
| GET | `admin/pricing/free-member-limit` | `getFreeMemberLimit` :91 | |
| PATCH | `admin/pricing/free-member-limit` | `setFreeMemberLimit` :97 | |
| PATCH | `admin/pricing/free-ground-limit` | `setFreeGroundLimit` :103 | |
| PATCH | `admin/pricing/:plan` | `setPricing` :109 | |
| GET | `admin/stripe` | `stripeStatus` :178 | |
| GET | `admin/whatsapp` | `getWhatsAppStatus` :189 | |
| PATCH | `admin/whatsapp` | `setWhatsAppEnabled` :195 | |
| GET | `admin/api-access` | `apiAccessRequests` :212 | |
| PATCH | `admin/api-access/:id` | `decideApiAccess` :218 | |
| PATCH | `admin/api-access/flags/:flagId/clear` | `clearApiFlag` :228 | |
| GET | `admin/dashboard` | `getDashboard` :234 | |
| GET | `admin/coaching` | `getCoaching` :238 | |
| GET | `admin/writers` | `getWriters` :244 | |
| GET | `admin/stats` | `getPlatformStats` :250 | |
| GET | `admin/codes` | `getAllCodes` :256 | |
| GET | `admin/codes/:codeId` | `getCodeUsage` :262 | |
| GET | `admin/call-requests` | `getCallRequests` :268 | |
| POST | `admin/call-requests/:id/answered` | `markCallAnswered` :274 | |
| GET | `admin/inbox` | `getInbox` :281 | |
| POST | `admin/inbox/:id/read` | `markInboundRead` :287 | |
| GET | `admin/feedback` | `getFeedback` :294 | |
| GET | `admin/usage` | `getUsagePatterns` :300 | |
| GET | `admin/grounds/:groundId` | `getGroundSupportView` :306 | |
| POST | `admin/otp/request` | `requestOtp` :314 | |
| PATCH | `admin/codes/:codeId/disable` | `disableCode` :322 | `OtpGuard` |
| POST | `admin/add-admin` | `addPlatformAdmin` :330 | `OtpGuard` |
| GET | `admin/admins` | `listPlatformAdmins` :346 | |
| POST | `admin/admins/:userId/remove` | `removePlatformAdmin` :352 | `OtpGuard` |

`OtpGuard` is defined inline in the same file at `:33-43`.

#### alignment — `api/src/modules/alignment/alignment.controller.ts`
Controller path `grounds/:groundId/alignment` :20, `@UseGuards(JwtAuthGuard)` :21.

30 routes, all at the same auth level:
`GET figures` :31, `POST figures` :37, `POST figures/:figureId/confirm` :51, `POST compare` :62, `POST agreements` :72, `POST agreements/:agreementId/amend` :82, `GET agreements/:agreementId/in-force` :93, `POST versions/:versionId/agreed` :104, `POST versions/:versionId/terms` :117, `POST terms/:termId/checked` :128, `POST terms/:termId/read-differently` :141, `GET terms/:termId/may-be-used-to` :154, `POST versions/:versionId/signed` :165, `GET versions/:versionId/standing` :178, `GET obligations` :189, `POST terms/:termId/obligations` :195, `POST obligations/:obligationId/asked` :210, `POST obligations/:obligationId/account` :220, `POST obligations/:obligationId/nothing-shown` :231, `GET parties` :241, `POST parties` :247, `POST parties/:partyId/people` :258, `POST assertions` :270, `GET assertions` :280, `GET assertions/waiting-on/:who` :286, `POST assertions/:assertionId/asked` :296, `POST assertions/:assertionId/answered` :307, `GET differences` :318, `POST differences/:differenceId/answered` :324.

#### auth — `api/src/modules/auth/auth.controller.ts`
Controller path `auth` :44.

| Method | Path | Handler | Auth |
|---|---|---|---|
| POST | `auth/register-magic-link` :72 | `registerMagicLink` | Public, 5/min |
| POST | `auth/login` :82 | `login` | Public, `SIGN_IN_LIMIT`/min |
| POST | `auth/verify-email` :93 | `verifyEmail` | Public |
| POST | `auth/set-password` :103 | `setPassword` | Public, 5/min |
| POST | `auth/member-signin` :114 | `memberSignin` | Public, 5/min |
| POST | `auth/forgot-password` :124 | `forgotPassword` | Public, 5/min |
| POST | `auth/reset-password` :134 | `resetPassword` | Public, 5/min |
| GET | `auth/validate-token` :145 | `validateToken` | Public |
| GET | `auth/methods` :173 | `methods` | Public. Reports whether Google OAuth is configured |
| GET | `auth/google` :186 | `googleAuth` | Public, `AuthGuard('google')` |
| GET | `auth/google/callback` :194 | `googleCallback` | Public, `AuthGuard('google')` |
| GET | `auth/google/exchange` :215 | `googleExchange` | Public, 10/min |
| GET | `auth/my-organizations` :223 | `myOrganizations` | Global |
| POST | `auth/switch-organization` :230 | `switchOrganization` | Global |
| GET | `auth/me` :237 | `getProfile` | Global |
| PATCH | `auth/me` :246 | `updateProfile` | Global |
| POST | `auth/entry-save` :254 | `entrySave` | Public, 10/min |
| POST | `auth/request-password-setup` :271 | `requestPasswordSetup` | Global |
| POST | `auth/team-invite` :279 | `teamInvite` | `@Roles(ADMIN)`, 10/min |

#### back-office door — `api/src/modules/back-office/back-office-door.controller.ts`
Path `back-office/door` :13, `JwtAuthGuard` :14. `GET` `status` :18, `POST code` :24, `POST verify` :31.

#### billing — `api/src/modules/billing/billing.controller.ts`
Controller path `billing` :10.

| Method | Path | Handler | Auth |
|---|---|---|---|
| GET | `billing/pricing` :21 | `getPricing` | Public |
| GET | `billing/status` :31 | `status` | Global |
| DELETE | `billing/account` :53 | `cancelAccount` | ADMIN |
| POST | `billing/free-extension` :61 | `claimFreeExtension` | ADMIN |
| POST | `billing/subscription` :72 | `createSubscription` | ADMIN |
| DELETE | `billing/subscription` :83 | `cancelSubscription` | ADMIN |
| PATCH | `billing/subscription/plan` :91 | `changeSubscriptionPlan` | ADMIN |
| PATCH | `billing/subscription/pause` :102 | `pauseSubscription` | ADMIN |
| PATCH | `billing/subscription/resume` :110 | `resumeSubscription` | ADMIN |
| POST | `billing/contributor-code` :118 | `applyContributorCode` | ADMIN |
| POST | `billing/purchase-session` :126 | `purchaseSession` | ADMIN |
| GET | `billing/can-create-ground` :137 | `canCreateGround` | Global |
| POST | `billing/contributor-codes` :162 | `generateContributorCode` | `PlatformAdminGuard` |
| POST | `billing/contributor-codes/send-to-email` :181 | `sendContributorCodeToEmail` | `PlatformAdminGuard` |
| POST | `billing/contributor-codes/redeem` :199 | `redeemContributorCode` | ADMIN |
| PATCH | `billing/contributor-codes/:codeId/disable` :211 | `disableCode` | ADMIN |
| GET | `billing/contributor-codes/:codeId/share-card` :222 | `getShareCard` | ADMIN |
| GET | `billing/contributor-codes` :241 | `listContributorCodes` | ADMIN |
| GET | `billing/admin/stats` :249 | `platformAdminStats` | `PlatformAdminGuard` |
| POST | `billing/portal` :257 | `portal` | ADMIN |
| POST | `billing/webhook` :276 | `webhook` | **Public. Stripe webhook receiver**, signature checked in `stripe.service.ts:93-94` |

#### board — `api/src/modules/board/board.controller.ts`
Path `grounds/:id/board` :29, global auth. `GET` :33, `POST objectives` :47, `PATCH objectives/:objectiveId` :53, `DELETE objectives/:objectiveId` :64, `POST poll` :74, `POST poll/:optionId/toggle` :80.

#### coach — `api/src/modules/coach/coach.controller.ts`
Path `coach` :62. `POST coach/request` :73 Public. `GET coach/requests` :87 and `PATCH coach/requests/:id` :94 behind `PlatformAdminGuard`.

#### conversation — `api/src/modules/conversation/conversation.controller.ts`
Path `check-ins` :35, `JwtAuthGuard` :34.
`GET :id/transcript` :42, `GET :id/download` :48, `POST :id/open` :58, `POST :id/what-worked` :64, `POST :id/messages` :79, `POST :id/messages/stream` :85, `POST :id/complete` :105, `POST :id/decline` :111, `POST :id/entries/:entryId/dispute` :117, `GET :id/session-report` :128, `GET :id/artifact` :134, `POST :id/document-received` :140, `POST :id/remind` :146.

Second controller in the same file, path `grounds` :156, `JwtAuthGuard` :155: `POST :groundId/clarify` :160, `POST :groundId/correct-session` :170.

`api/src/modules/conversation/stop-reminders.controller.ts`: `GET stop-reminders/:token` :28, Public, 20/min.

#### detectors — machine API
`api/src/modules/detectors/checkins.controller.ts`: `@Public()` :20, path `api/org/v1` :21. `POST api/org/v1/checkins` :28, `MachineTokenGuard`, scope `checkins:write`.

`api/src/modules/detectors/detectors.controller.ts`: `@Public()` :20, path `api/org/v1` :21, all `MachineTokenGuard`.

| Method | Path | Handler | Scope |
|---|---|---|---|
| POST | `api/org/v1/roles` :37 | `putRole` | `graph:write` |
| GET | `api/org/v1/roles` :46 | `listRoles` | `graph:read` |
| POST | `api/org/v1/primary-actions` :60 | `recordAction` | `graph:write` |
| GET | `api/org/v1/findings` :69 | `findings` | `findings:read` |
| POST | `api/org/v1/findings/run` :88 | `run` | `findings:read` |
| GET | `api/org/v1/recommendations` :105 | `recommendations` | `proposals:read` |
| POST | `api/org/v1/recommendations/:id/accept` :129 | `accept` | `proposals:write` |
| POST | `api/org/v1/recommendations/:id/decline` :138 | `decline` | `proposals:write` |

#### documents — `api/src/modules/documents/documents.controller.ts`
`POST documents/invite-upload` :20, `@Public()` :15, token in the body.
Second controller, path `grounds/:groundId/documents` :34, global auth: `POST` :38, `GET` :53, `PATCH :docId/assessment` :59, `PATCH :docId/visibility` :76, `DELETE :docId` :87.

#### drafts — `api/src/modules/drafts/drafts.controller.ts`
`@Public()` :16, path `api/org/v1/drafts` :17, every handler `EmbedSessionGuard`:
`POST` :21, `GET :id` :29, `POST :id/participants` :36, `POST :id/contributions` :44, `POST :id/contentions/:cid/resolve` :52, `POST :id/seed` :60.

#### email — webhook and unsubscribe
`api/src/modules/email/resend-webhook.controller.ts`: `POST webhooks/resend` :19, Public, 120/min. **Resend inbound webhook receiver**, Svix signature verified in `delivery.service.ts:64-99`.
`api/src/modules/email/unsubscribe.controller.ts`: `GET unsubscribe/:token` :26, Public, 20/min.

#### embed
`api/src/modules/embed/embed-assets.controller.ts`: `GET embed.js` :33 Public, `GET embed/panel` :53 Public. Both served at the bare path, not under `/api/v1`. The panel HTML is `api/src/modules/embed/static/panel.html`.
`api/src/modules/embed/embed-setup.controller.ts`: path `integrations/embed` :16, `JwtAuthGuard, RolesGuard`, `@Roles(ADMIN)`. `GET` :22, `POST` :28.

#### entry — the anonymous chat at /start
`api/src/modules/entry/entry.controller.ts`, path `entry` :198.

| Method | Path | Handler | Auth |
|---|---|---|---|
| PATCH | `entry/draft` :211 | `patchDraft` | Public, 30/min |
| POST | `entry/onboard` :217 | `onboard` | Public, 30/min |
| POST | `entry/onboard/stream` :229 | `onboardStream` | Public, 30/min |
| POST | `entry/chat/stream` :246 | `chatStream` | Public, 30/min |
| POST | `entry/opener` :290 | `opener` | Public |
| POST | `entry/chat` :296 | `chat` | Public, 30/min |
| POST | `entry/classify-intent` :312 | `classifyIntent` | Public |
| POST | `entry/faq` :318 | `faq` | Public |
| POST | `entry/report` :325 | `report` | Public, 20/min |

Second controller, path `entry` :333: `POST entry/commit` :337 (global auth), `GET entry/join-preview` :344 Public, `POST entry/join-accept` :356 Public 5/min, `POST entry/join-confirm` :370 Public 10/min.

#### feedback — `api/src/modules/feedback/feedback.controller.ts`
Path `feedback` :71. `POST feedback` :76 Public. `GET feedback` :82 and `PATCH feedback/:id/status` :88 behind `PlatformAdminGuard`. Note the module comment at `app.module.ts:32-41`: this module was previously never imported, so every posted piece of feedback 404'd and the client swallowed it.

#### grounds — `api/src/modules/grounds/grounds.controller.ts`
Path `grounds` :206, global auth unless marked.

ADMIN-only: `GET org-roster` :219, `GET awaiting-approval` :242, `POST for-lead` :262, `POST :id/activate` :307, `POST :id/approve` :409, `POST :id/decline` :416.

All others global: `GET` :213, `GET :id` :249, `POST` :255, `POST :id/confirm-lead` :269, `POST :id/participants` :275, `POST :id/lead-context` :281, `PATCH :id/chasing` :287, `POST :id/closing-session` :297, `GET :id/participants/:participantId/invite-url` :314, `GET :id/participants/:participantId/check-in-url` :325, `POST :id/participants/:participantId/resend-invite` :335, `GET :id/mediator-brief` :345, `GET :id/my-specificity` :351, `GET :id/my-record` :357, `GET :id/my-checkin-status` :363, `GET :id/setup-sign-offs` :373, `POST :id/setup-sign-offs/:step` :379, `DELETE :id/setup-sign-offs/:step` :389, `DELETE :id` :403, `POST :id/context-chat` :423, `POST :id/context-chat/confirm` :434, `POST :id/baseline` :450, `GET :id/baseline` :460, `POST :id/my-expectation/shown` :482, `GET :id/baseline-entries/candidates` :495, `POST :id/baseline-entries` :501, `GET :id/baseline-entries` :507, `GET :id/my-notes` :513, `POST :id/my-notes` :519, `DELETE :id/my-notes/:noteId` :525, `PATCH :id/expectations/:objectiveId/looked` :531, `GET :id/my-deliveries` :542, `POST :id/my-deliveries` :548, `DELETE :id/my-deliveries/:deliveryId` :554, `GET :id/my-transcript` :560, `GET :id/conversation` :566, `GET :id/my-solo-report` :572, `PATCH :id/my-solo-report/share` :578, `POST :id/sign-off` :584, `PATCH :id/external-visibility` :590, `PATCH :id/peer-visibility` :596, `PATCH :id/people-work-together` :606, `PATCH :id` :616.

`api/src/modules/grounds/participant-requests.controller.ts`, path `grounds/:groundId/participant-requests` :18, each handler `@UseGuards(JwtAuthGuard)`: `POST` :46, `GET` :65, `PATCH :reqId` :75.

#### intelligence — `api/src/modules/intelligence/intelligence.controller.ts`
No controller prefix :59. `GET grounds/:groundId/outcome-feedback` :63, `POST grounds/:groundId/outcome-feedback` :69, `POST grounds/:groundId/feedback` :75, `GET dashboard` :85 (`@Roles(ADMIN)`).

#### knowledge
`api/src/modules/knowledge/how-we-do-it.controller.ts`: path `org/how-we-do-it` :21, `JwtAuthGuard` :20. `GET` :26, `POST propose` :35, `POST :id/approve` :46, `POST :id/decline` :57.

`api/src/modules/knowledge/knowledge.controller.ts`: `@Public()` :12, path `api/org/v1/knowledge` :13, all `MachineTokenGuard`.

| Method | Path | Scope |
|---|---|---|
| POST | `api/org/v1/knowledge/cards` :17 | `knowledge:write` |
| POST | `api/org/v1/knowledge/documents` :34 | `knowledge:write` |
| POST | `api/org/v1/knowledge/cards/bulk` :43 | `knowledge:write` |
| PATCH | `api/org/v1/knowledge/cards/:key` :62 | `knowledge:write` |
| GET | `api/org/v1/knowledge/cards` :70 | `findings:read` |
| GET | `api/org/v1/knowledge/cards/:key/as-of` :78 | `findings:read` |
| DELETE | `api/org/v1/knowledge/cards/:key` :101 | `knowledge:write` |

#### ops — the team's own back office
Seven controllers, all `@UseGuards(JwtAuthGuard, OpsCapabilityGuard)` plus the global back-office door. Per-route capability comes from `@NeedsOps(...)`, defined at `api/src/modules/ops/ops-capability.guard.ts:13`.

`ops.controller.ts` (path `ops` :17): `GET what-we-are` :32, `GET what-we-are/history` :38, `POST what-we-are` :44, `GET me` :58, `GET periods` :65, `POST periods` :77, `GET groundwork/events` :90, `GET workplan` :101, `GET periods/:key/can-open` :113, `POST periods/:key/open` :125, `PATCH periods/:key` :133, `GET assistant/panel` :156, `GET integration` :165, `PATCH integration` :172, `POST integration/push` :183, `GET people` :192, `GET capabilities` :200, `GET roles` :208, `PATCH people/:key/role` :215, `POST people` :222, `POST people/:key/grants` :229, `DELETE people/:key/grants/:capability` :236, `GET people/:key/agreement` :247, `PATCH people/:key/agreement` :254, `PATCH people/:key/active` :265, `GET workstreams` :289.

`ops-build.controller.ts` (path `ops` :26): `GET roadmap` :38, `POST roadmap` :45, `PATCH roadmap/:id/status` :60, `GET use-cases` :69, `POST use-cases` :76, `PATCH use-cases/:id/readiness` :85, `POST use-cases/:id/links` :96, `GET tech` :105, `POST tech` :112, `PATCH tech/:id/status` :124, `GET ux` :137, `POST ux` :144, `PATCH ux/:id/status` :153, `GET moat` :163, `POST moat` :170, `POST approvals` :187, `GET solidity` :202, `GET freeze` :218, `GET freeze/history` :224, `POST freeze` :231, `GET what-work-can-serve` :247, `POST what-it-serves` :260, `GET what-serves-nothing` :280, `GET what-we-depend-on` :288, `GET approvals` :295, `GET approvals/:recordType/:recordId` :301, `PATCH approvals/:id` :307.

`ops-ceo.controller.ts` (path `ops` :15): `GET fundraise` :22, `POST fundraise` :29, `PATCH fundraise/:id/stage` :43, `PATCH fundraise/:id/follow-up` :54, `GET strategy` :63, `POST strategy` :70, `PATCH strategy/:id/status` :80, `PATCH strategy/:id/converted` :96, `POST resourcing` :106, `GET resourcing` :119, `PATCH resourcing/:id/closed` :126, `GET spend/waiting-on-me` :137, `GET spend` :142, `POST spend` :148, `PATCH spend/:id` :162, `POST earnings` :173, `GET balance` :187.

`ops-commercial.controller.ts` (path `ops/commercial` :24): `GET performance` :41, `GET function-health` :50, `GET ledger/:personKey` :64, `GET share-of-new-revenue` :97, `GET overview` :113, `GET pipeline` :161, `POST pipeline` :168, `PATCH pipeline/:id/stage` :177, `PATCH pipeline/:id/next-action` :184, `POST pipeline/:id/payments` :191, `POST pipeline/:id/claims` :211, `GET claims` :221, `PATCH claims/:id` :228, `GET pipeline/:id/attribution-history` :240, `GET positioning` :249, `POST positioning` :256, `PATCH positioning/:id/stage` :265.

`ops-intent.controller.ts` (path `ops` :15): `GET objectives/:periodKey` :23, `GET objectives/:periodKey/aim` :30, `GET everybody/:periodKey` :44, `POST objectives` :51, `POST objectives/:id/key-results` :76, `PATCH objectives/:id/status` :91, `GET commitments/:personKey/:periodKey` :100, `POST commitments` :106, `PATCH commitments/:id/close` :119, `PATCH commitments/:id/blocked` :129, `POST commitments/:id/links` :135, `GET todos/:personKey` :143, `POST todos` :149, `PATCH todos/:id/status` :166.

`ops-pipeline.controller.ts` (path `ops` :17): `GET deployments` :34, `POST deployments` :41, `PATCH deployments/:id/stage` :57, `PATCH deployments/:id/blocker` :64, `GET campaigns` :77, `GET resources` :92, `POST resources` :99, `POST resources/:id/check` :118, `POST campaigns` :125, `GET boards` :152, `GET boards/:key` :159, `GET metrics` :166, `GET metrics/:key` :176.

`ops-target-companies.controller.ts` (path `ops` :18): `GET target-companies/:periodKey` :31, `GET companies` :38, `GET companies/:key` :46, `POST companies` :53, `PATCH companies/:key/stage` :60, `PATCH companies/:key/next-action` :67, `PATCH companies/:key/target-list` :85, `PATCH companies/:key/blocker` :96, `GET attribution-sources` :108, `POST attributions` :115, `PATCH attributions/:companyKey/:contributorKey` :133, `GET standing/:personKey` :146, `GET settings` :152, `PATCH settings/:key` :158.

Two ops controllers sit outside `OpsCapabilityGuard`:
- `ops-door.controller.ts`, path `admin/ops` :33, `JwtAuthGuard, PlatformAdminGuard` :34: `GET` :38, `POST setup` :44, `POST :personKey/account` :51, `POST :personKey/account/remove` :58. This is the door between `/admin` and `/ops`.
- `ops-inbound.controller.ts`, path `ops/groundwork` :24: `POST ops/groundwork/events` :36, **`@Public()`** :37. An inbound event receiver from the product into ops.

#### participants — `api/src/modules/participants/participants.controller.ts`
Path `participants` :39. `GET participants/invite` :44 Public, `POST participants/accept` :51 Public, `PATCH participants/:id` :70 global, `PATCH participants/:id/email` :81 global.

#### patterns — `api/src/modules/patterns/patterns.controller.ts`
Path `patterns` :9. `GET patterns/accuracy` :24 `PlatformAdminGuard`, `PATCH patterns/:id/rate` :31 `@Roles(ADMIN)`.

#### prompts — `api/src/modules/prompts/prompts.controller.ts`
`@UseGuards(PlatformAdminGuard)` :30, path `prompts` :31.
`GET` :35, `POST` :41, `POST :id/activate` :47, `GET platform-funnel` :53, `GET by-key/:key` :59, `GET platform-dashboard` :65, `GET org-list` :71, `GET usage-stats` :77, `GET feedback-summary` :83, `POST test-chat` :89, `POST test-report` :96.

#### public-api — the machine API
`api/src/modules/public-api/public-api.controller.ts`, `@Public()` :67, path `api/org/v1` :68. `MachineTokenGuard` unless the row says `EmbedSessionGuard`. Scopes as declared by `@RequiresScope`.

| Method | Path | Handler | Guard / scope |
|---|---|---|---|
| POST | `oauth/token` :98 | `token` | none. The one line the API is paid at |
| GET | `how-to-connect` :155 | `howToConnect` | `ApprovedOrMachineGuard` |
| POST | `subjects` :170 | `pushSubject` | `subjects:write` |
| POST | `subjects/bulk` :201 | `bulkSubjects` | `subjects:write` |
| GET | `jobs/:jobId` :220 | `job` | `findings:read` |
| GET | `subjects/:externalId` :228 | `getSubject` | `findings:read` |
| GET | `subjects` :243 | `listSubjects` | `findings:read` |
| DELETE | `subjects/:externalId` :253 | `deleteSubject` | `subjects:write` |
| POST | `embed/session` :274 | `embedSession` | none beyond the embed secret |
| GET | `embed/opening` :282 | `embedOpening` | `EmbedSessionGuard` |
| POST | `chat` :298 | `chat` | `EmbedSessionGuard` |
| POST | `role-assignments` :313 | `createRoleAssignment` | `graph:write` |
| POST | `role-assignments/:id/end` :331 | `endRoleAssignment` | `graph:write` |
| GET | `handovers/:roleAssignmentId` :347 | `getHandover` | `handovers:read` |
| POST | `onboarding/tracks` :355 | `defineTrack` | `graph:write` |
| GET | `onboarding/:personExternalId` :367 | `onboardingStatus` | `findings:read` |
| POST | `onboarding/:personExternalId/gates/:gateKey` :375 | `markGate` | `graph:write` |
| GET | `suggestions` :395 | `suggestions` | `EmbedSessionGuard` |
| POST | `suggestions/:id` :409 | `decideSuggestion` | `EmbedSessionGuard` |
| GET | `email-preferences` :424 | `getEmailPreferences` | `graph:write` |
| POST | `email-preferences` :443 | `setEmailPreferences` | `graph:write` |
| POST | `grounds` :467 | `openGround` | `grounds:write` |
| GET | `grounds/:groundId/report` :483 | `getReport` | `reports:read` |
| PUT | `subjects/:externalId/acceptance-criteria` :510 | `setAcceptanceCriteria` | `subjects:write` |
| GET | `subjects/:externalId/acceptance-criteria` :522 | `acceptanceCriteria` | `findings:read` |
| POST | `subjects/:externalId/acceptance-criteria/:ordinal/met` :538 | `markCriterionMet` | `subjects:write` |
| POST | `grounds/:groundId/objectives` :554 | `seedObjectives` | `grounds:write` |
| GET | `check-ins/mine` :605 | `myCheckIns` | `EmbedSessionGuard` |
| GET | `grounds/awaiting-me` :620 | `awaitingMe` | `EmbedSessionGuard` |
| POST | `grounds/:id/confirm-lead` :634 | `confirmLead` | `EmbedSessionGuard` |
| POST | `check-ins/:id/open` :647 | `openCheckIn` | `EmbedSessionGuard` |
| POST | `check-ins/:id/messages` :656 | `sayInCheckIn` | `EmbedSessionGuard` |
| POST | `check-ins` :681 | `openCheckInFromPanel` | `EmbedSessionGuard` |
| POST | `people` :700 | `addPersonFromPanel` | `EmbedSessionGuard` |
| POST | `check-ins/:id/documents` :718 | `attachToCheckIn` | `EmbedSessionGuard` |
| GET | `check-ins/:id/report` :737 | `myCheckInReport` | `EmbedSessionGuard` |
| POST | `check-ins/:id/complete` :744 | `completeCheckIn` | `EmbedSessionGuard` |
| POST | `grounds/:groundId/documents` :758 | `putADocumentIn` | `EmbedSessionGuard` |
| PATCH | `grounds/:groundId/documents/:docId/visibility` :781 | `setDocumentVisibility` | `EmbedSessionGuard` |
| POST | `check-ins/:id/success-looks-like` :795 | `statedSuccess` | `EmbedSessionGuard` |
| GET | `commitments/mine` :810 | `myCommitments` | `EmbedSessionGuard` |
| POST | `commitments` :817 | `addCommitment` | `EmbedSessionGuard` |
| POST | `commitments/:id/done` :828 | `commitmentDone` | `EmbedSessionGuard` |
| GET | `todos/mine` :837 | `myTodos` | `EmbedSessionGuard` |
| POST | `todos` :844 | `addTodo` | `EmbedSessionGuard` |
| POST | `todos/:id/done` :852 | `todoDone` | `EmbedSessionGuard` |
| GET | `people/:personExternalId/commitments` :860 | `commitmentsOf` | `graph:read` (:862) |
| GET | `reports/my-people` :879 | `reportsForMyPeople` | `EmbedSessionGuard` |
| POST | `evaluations-due` :897 | `noteEvaluationDue` | `graph:write` |
| GET | `check-ins/:id/transcript` :924 | `checkInTranscript` | `EmbedSessionGuard` |
| POST | `objective-drafts` :941 | `startDraft` | `graph:write` |
| GET | `objective-drafts/:id` :960 | `draft` | `findings:read` (:967) |
| POST | `objective-drafts/:id/participants` :974 | `inviteToDraft` | `graph:write` |
| POST | `objective-drafts/:id/answers` :996 | `answerDraft` | `graph:write` |
| POST | `objective-drafts/:id/contributions` :1023 | `contributeToDraft` | `graph:write` |
| POST | `objective-drafts/:id/contentions/:cid/resolve` :1040 | `resolveDraftContention` | `graph:write` |
| POST | `objective-drafts/:id/seed` :1059 | `seedDraft` | `graph:write` |
| PUT | `metrics` :1075 | `pushMetrics` | `graph:write` |
| PUT | `interactions` :1086 | `pushInteractions` | `graph:write` |
| PUT | `evidence` :1095 | `pushEvidence` | `graph:write` |
| POST | `proposed-changes` :1107 | `proposeChange` | `grounds:write` |
| POST | `proposed-changes/:id/resolve` :1124 | `resolveChange` | `grounds:write` |
| GET | `people/:personExternalId/forecasts` :1152 | `howTheirForecastsHaveGone` | `handovers:read` |
| GET | `people/:personExternalId/before-a-conversation` :1163 | `beforeAConversation` | `handovers:read` |
| GET | `findings/structured` :1174 | `structuredFindings` | `findings:read` |
| GET | `grounds/:groundId/sense-check` :1189 | `senseCheck` | `findings:read` |
| POST | `scim/v2/Users` :1201 | `scimUpsert` | `graph:write` |
| PATCH | `scim/v2/Users/:externalId` :1210 | `scimPatch` | `graph:write` |
| GET | `scim/v2/Users/duplicates` :1227 | `scimDuplicates` | `findings:read` |
| GET | `scim/v2/Users/:externalId` :1235 | `scimGet` | `findings:read` |
| GET | `scim/v2/Users` :1245 | `scimList` | `findings:read` |

Assistant surface, `api/src/modules/assistant/what-i-can-see.controller.ts`: `@Public()` :17, path `api/org/v1/assistant` :18, `GET what-you-can-see` :22, `EmbedSessionGuard`.

The full scope list is `api/src/modules/public-api/scopes.ts:8-40`: `graph:write`, `subjects:write`, `knowledge:write`, `checkins:write`, `grounds:write`, `findings:read`, `handovers:read`, `reports:read`, `proposals:read`, `proposals:write`, `chat:write`, `graph:read`. `graph:write` implies `graph:read` (`scopes.ts:69`). **`chat:write` is issuable but no route requires it.**

Customer-facing credential and import management, all `JwtAuthGuard, RolesGuard, @Roles(ADMIN)`:
- `credentials.controller.ts`, path `integrations/credentials` :21: `GET terms` :33, `GET docs-link` :44, `POST access-request` :60, `GET access-request` :75, `POST` :81, `POST :clientId/replace` :105, `GET` :116, `DELETE :clientId` :122.
- `imports.controller.ts`, path `integrations/imports` :21: `GET` :27, `GET :jobId` :33.
- `whatsapp-for-an-organisation.controller.ts` (no prefix :20): `GET integrations/whatsapp` :32, `PUT integrations/whatsapp` :39, `POST integrations/whatsapp/enabled` :49, `POST integrations/whatsapp/test` :57, `DELETE integrations/whatsapp` :65, all ADMIN. Plus two **Public webhook receivers**: `GET webhooks/whatsapp/:organizationId` :80 (Meta verify handshake) and `POST webhooks/whatsapp/:organizationId` :96 (240/min).

#### reports — `api/src/modules/reports/reports.controller.ts`
Path `grounds/:groundId/report` :8. `GET` :12, `GET rounds` :32, `GET session/:sessionNumber` :48, `GET against-success` :63 all global; `POST generate` :73 and `POST release` :80 ADMIN; `POST activate` :87 and `GET activation-status` :93 global.

#### resolution — `api/src/modules/resolution/resolution.controller.ts`
Path `grounds/:groundId/resolution` :28, global. `GET` :32, `POST` :38, `POST counter` :44.

#### users — `api/src/modules/users/users.controller.ts`
Path `users` :23. ADMIN unless marked.
`GET users/waiting` :45, `GET users/waiting/seats` :57, `POST users/waiting/seats/release` :64, `POST users/waiting/:id/approve` :71, `POST users/waiting/:id/decline` :82, `PATCH users/organization` :94, `GET users/organization/check-ins` :110, `PATCH users/organization/check-ins` :117, `GET users/colleagues` :138 (**global, not ADMIN**), `POST users/me/leave` :144 (global), `GET users/me/export` :175 (global), `DELETE users/me/data` :185 (global), `GET users` :192, `POST users/call-request` :228, `GET users/call-request` :240, `GET users/organization/owner` :254, `PATCH users/organization/owner` :261, `GET users/rollout` :269, `POST users/invitations` :276, `GET users/:id` :288, `POST users` :295, `PATCH users/:id` :303, `POST users/:id/resend-invite` :310, `DELETE users/:id` :317.

#### webhooks — outbound endpoint management
`api/src/modules/webhooks/webhooks.controller.ts`, path `integrations/webhooks` :16, `JwtAuthGuard, RolesGuard`, `@Roles(ADMIN)`.
`GET events` :22, `POST endpoints` :28, `GET endpoints` :37, `DELETE endpoints/:id` :43, `POST endpoints/:id/rotate-secret` :49, `GET deliveries` :55, `POST deliveries/:id/replay` :61.

#### whatsapp — platform number
`api/src/modules/whatsapp/whatsapp.controller.ts`, `@Public()` :24, path `webhooks/whatsapp` :25. `GET` :37 (Meta verify), `POST` :52 (120/min). **This is the platform fallback number; the per-organisation receiver is the `:organizationId` pair above.**

#### workspace — Slack / Teams notifiers
`api/src/modules/workspace/workspace-notifier.controller.ts`, path `integrations/workspace` :18, ADMIN.
`GET` :26, `POST :kind` :32, `POST :kind/test` :43, `POST :kind/on` :54, `POST :kind/off` :61, `DELETE :kind` :68.

### Webhook receivers, all together

| Receiver | Route | File |
|---|---|---|
| Stripe | `POST /api/v1/billing/webhook` | `billing.controller.ts:276` |
| Resend | `POST /api/v1/webhooks/resend` | `resend-webhook.controller.ts:19` |
| Meta WhatsApp, platform number | `GET`/`POST /api/v1/webhooks/whatsapp` | `whatsapp.controller.ts:37,52` |
| Meta WhatsApp, per organisation | `GET`/`POST /api/v1/webhooks/whatsapp/:organizationId` | `whatsapp-for-an-organisation.controller.ts:80,96` |
| Ops inbound events | `POST /api/v1/ops/groundwork/events` | `ops-inbound.controller.ts:36`, `@Public()` |

---

## B. TABLES

152 models in `api/prisma/schema.prisma`. One row is:

| Model | Line | One row is |
|---|---|---|
| PricingPlan | 251 | The price and member cap for one subscription plan, with its cached Stripe price id |
| ApiAccessRequest | 292 | One organisation asking to connect to the machine API, and the decision |
| ApiCall | 325 | One authenticated machine call. Pruned after 30 days |
| ApiUsageFlag | 340 | Something the watch noticed about one organisation's API use |
| WorkspaceNotifier | 368 | One Slack or Teams webhook URL an organisation connected |
| Organization | 403 | A customer company |
| User | 514 | A person with an account |
| PendingJoin | 603 | A join link that has been opened but not answered by the address |
| PendingSignup | 626 | A sign-up begun and not yet verified |
| EntryDraft | 651 | What an anonymous visitor said in the entry chat before an account existed |
| InboundMessage | 684 | An email that arrived to the company, stored whole, never parsed |
| EmailDelivery | 710 | One outbound email and what Resend said about it |
| AdminProfile | 730 | How one admin's past grounds shape probing on the next |
| EmailVerificationToken | 747 | One emailed verification link |
| Ground | 766 | The core unit: one piece of work several people check in about |
| GroundBaseline | 968 | What the goal was at a point in time, never edited |
| CoachingState | 991 | Where a ground is in the in-chat coaching steps |
| GroundParticipant | 1022 | One person's place in one ground |
| CheckIn | 1177 | One person's independent session on one ground |
| ConversationTurn | 1259 | One message in a check-in |
| WhatWorked | 1286 | A note somebody deliberately wrote for others stuck on the same thing |
| RecordEntry | 1307 | One extracted fact from a check-in |
| PersonStyleProfile | 1365 | How to speak to one person. Style, never substance |
| GroundObjective | 1390 | One objective on a ground |
| GroundDependency | 1456 | One person waiting on another, taken from the waiter's own account |
| WorkMention | 1517 | One person's work named in another person's account |
| GroundPoll | 1544 | An availability poll on the board |
| GroundPollOption | 1556 | One time slot in that poll |
| EvaluationDue | 1584 | When a person's next evaluation is due, and where that date came from |
| Report | 1614 | A generated ground report |
| ParticipantRequest | 1659 | Somebody asking to be added to a ground |
| PatternDetection | 1679 | One behavioural signal, never a verdict |
| Resolution | 1709 | The proposed end state of a ground |
| ResolutionConfirmation | 1727 | One party confirming that end state |
| PromptVersion | 1746 | A versioned prompt |
| Outcome | 1770 | What happened after a ground closed |
| OutcomeFeedback | 1789 | One party's answer on whether the process helped |
| RoundCompletion | 1816 | The fact that round N closed. The row is the idempotency guard |
| EmbedConfig | 1841 | One organisation's embed panel secret and settings |
| WhatsAppConnection | 1878 | One organisation's own Meta Cloud API credentials |
| WordedLine | 1913 | A cached model wording of one draft line |
| WhatsAppThread | 1922 | One WhatsApp conversation with one person |
| ApiCredential | 1943 | One machine credential. Only the hash of the secret is stored |
| IdempotencyRecord | 2002 | A replayed response for a retried machine call, 24h window |
| WebhookEndpoint | 2034 | One customer endpoint we deliver to, with its recoverable signing secret |
| WebhookDelivery | 2086 | One attempted delivery, response code and body kept |
| ImportJob | 2131 | One bulk roster import |
| ImportJobFailure | 2174 | One row of that import that could not be taken |
| DetectionQuietPeriod | 2199 | The window after an import in which detectors stay quiet |
| ObjectiveDraft | 2236 | An objective several people are writing without a meeting |
| DraftParticipant | 2284 | One person invited to a draft |
| DraftContribution | 2304 | The part of what one contributor said that was about the draft |
| DraftContention | 2327 | A divergence between contributors, found before the objective is set |
| Recommendation | 2364 | A proposal to a named person, carrying the gap it closes |
| Contribution | 2419 | Who is carrying which piece of work on a subject |
| DetectorResult | 2456 | One finding. Evidence, never a judgement |
| KnowledgeCard | 2520 | One versioned fact the customer pushed. Whole history under one key |
| Interaction | 2642 | One logged visit or contact. No conversation content |
| KnowledgeProposal | 2684 | A proposal to write something into the knowledge base |
| KnowledgeRetrieval | 2717 | A record that a knowledge card was retrieved |
| AssistantTurn | 2742 | One turn in the embedded assistant panel, scoped to one person |
| AssistantProposal | 2781 | A pending confirm gate. Dropped on anything but a clear yes or no |
| AcceptanceCriterion | 2830 | One ordered definition-of-done line on a subject |
| ProductMetric | 2866 | One number, what it counts, when it was true, where it came from |
| Todo | 2895 | A note to yourself nobody else reads |
| Commitment | 2926 | A promise to somebody that follows you into your check-in |
| Person | 2977 | A mirror of one row of the customer's directory |
| Subject | 3066 | A piece of work in the org graph, parallel to grounds |
| OrgIntelligence | 3128 | A longitudinal synthesis across one organisation |
| BillingEvent | 3140 | One billing thing that happened |
| ContributorCode | 3166 | A code that grants free access |
| ContributorCodeRedemption | 3196 | One redemption of that code |
| PersonObjective | 3285 | One person's own objective |
| GroundBaselineEntry | 3475 | One line of what somebody believed at the start. Corrections are new rows |
| DocumentElsewhere | 3496 | A document named by link only, with no text, kept apart so no prompt can reach it |
| Obligation | 3530 | Something one side of an agreement owes. No state means breached |
| GroundParty | 3565 | One side of a two-company ground |
| Assertion | 3595 | Something one side said, held until the other side answers the same neutral question |
| Agreement | 3633 | A contract between two parties |
| AgreementVersion | 3656 | One version of it. Never edited, amendment makes a new row |
| AgreementTerm | 3701 | One term a model read out of a contract, with what that state permits |
| ReportedFigure | 3736 | A number with a source. Money in integer minor units |
| Difference | 3781 | Two figures that do not add up. No state is "breach" |
| GroundDocument | 3821 | An uploaded document on a ground, text included |
| Delivery | 3916 | Something a person says they delivered. Not their account, a thing to ask about |
| LeadContextNote | 3942 | Context the lead added to a ground |
| ReportRound | 4000 | One round of a report, amended in place and marked |
| ReportActivation | 4031 | The fact a report was activated |
| UsageEvent | 4066 | One product usage event |
| PlatformSetting | 4094 | One platform-wide setting row. Prices and limits live here, not in code |
| CoachRequest | 4119 | Somebody asking to talk to a coach |
| CallRequest | 4192 | Somebody asking for help connecting Groundwork to what they run |
| FeedbackSubmission | 4213 | One piece of in-product feedback |
| PatternConfig | 4225 | Configuration for one pattern detector |
| ParticipantNote | 4266 | A note private to one person, always |
| MembershipRequest | 4310 | An address invited to a check-in that is not yet in the organisation |
| OrganizationMembership | 4345 | One person's membership of one organisation |
| RoleAssignment | 4371 | One person holding one role over a period. Triggers a handover brief |
| OnboardingTrack | 4410 | What somebody new to a role has to get through, per role |
| OnboardingGate | 4428 | One gate in that track |
| OnboardingStatus | 4462 | One person's progress through the gates |
| ScenarioCandidate | 4502 | A suggested conversation addressed to a person, with evidence |
| EmailPreference | 4547 | One person's opt-out. No admin override |
| RetentionPolicy | 4583 | One organisation's retention window, bounded at both ends |
| DepartureRecord | 4603 | The audit record that a departure deletion happened. Outlives the data |
| ProposedChange | 4650 | One proposed change to one objective and who must approve |
| Role | 4703 | A role, with its hardest action and how often that action is due |
| PrimaryActionEvent | 4738 | The fact that a named act happened in the customer's world |
| OpsPerson | 4832 | A person on the Groundwork team. Not necessarily a user |
| OpsPersonAccount | 4864 | The link from an OpsPerson to a Groundwork account |
| BackOfficePass | 4878 | A back-office door pass, one per person per week |
| OpsGrant | 4895 | One capability granted to one OpsPerson |
| OpsPeriod | 4916 | One quarter or target-list period |
| OpsWorkstream | 4942 | One workstream |
| OpsCompany | 4964 | One target or customer company in the ops pipeline |
| OpsActivity | 5007 | One thing somebody did against a company |
| OpsSetting | 5077 | One ops setting row |
| OpsAttribution | 5093 | Who contributed to one company, and whether it qualified |
| OpsContributorTarget | 5117 | One person's target for one period |
| OpsClientUseCase | 5138 | One customer use case and its readiness |
| OpsDeployment | 5172 | One deployment and its stage |
| OpsMarketingActivity | 5236 | One marketing campaign or activity |
| OpsRoadmapItem | 5320 | One roadmap item |
| OpsTechItem | 5368 | One technical item |
| OpsUXItem | 5399 | One UX item |
| OpsUseCaseLink | 5429 | A link between a use case and something else |
| OpsApproval | 5450 | One approval request and its decision |
| OpsObjective | 5496 | One quarterly objective |
| OpsKeyResult | 5545 | One key result under it |
| OpsCommitment | 5586 | One personal commitment for a period |
| OpsCommitmentLink | 5630 | A link from a commitment to a record |
| OpsTodo | 5644 | One ops to-do |
| OpsFundingOpportunity | 5707 | One fundraising conversation and its stage |
| OpsStrategicOpportunity | 5745 | One strategic opportunity |
| OpsResourceRequest | 5776 | Somebody asking for a resource |
| OpsExpense | 5798 | One spend request and its decision |
| OpsEarningsEntry | 5826 | One earnings entry |
| OpsIntegration | 5848 | The config for pushing ops data into the product |
| OpsFreeze | 5922 | One freeze decision |
| OpsWhatItServes | 5949 | What one piece of work serves |
| OpsPhase | 5996 | One of the five workplan phases |
| OpsProductStatement | 6050 | A dated statement of what we are |
| OpsResource | 6084 | One external resource, checked against what we are |
| OpsGroundworkEvent | 6151 | One event received from the product into ops |
| OpsMoatComponent | 6177 | One named component of the moat |
| OpsMoatEntry | 6200 | One entry against a moat component |
| OpsCommercialOpportunity | 6306 | One commercial pipeline opportunity |
| OpsCommercialPayment | 6386 | One payment against it |
| OpsAttributionClaim | 6415 | Somebody claiming attribution on an opportunity |
| OpsPositioningRecord | 6451 | One positioning conversation |
| OpsContributorAgreement | 6492 | One person's contributor agreement |
| GroundSetupSignOff | 6525 | One lead signing off one step of ground setup |

### Models with a zero side

Counted by direct `prisma.<model>.<op>` calls in `api/src`, excluding specs, then checked by hand for nested `include`/`select` reads.

Written but never read anywhere:

| Model | Writer | Read |
|---|---|---|
| KnowledgeRetrieval | `knowledge.service.ts:367` | none. No direct query, no relation read of `knowledgeRetrievals` |
| OrgIntelligence | `intelligence.service.ts:197`, `:372` | none. No direct query, no relation read of `orgIntelligence` |
| DocumentElsewhere | `assistant.service.ts:793`, `:1344` | none. Neither `documentsElsewhere` relation is ever included |
| OpsUseCaseLink | one create | read only as the generic `links` relation on `OpsClientUseCase` (`ops-build.service.ts:153`) |
| OpsCommitmentLink | one create | read only as `links` on `OpsCommitment` (`ops-intent.service.ts:409`) |

Never written, read only:

| Model | Read | Writer |
|---|---|---|
| PatternConfig | `patterns.service.ts:643` (`findMany` where enabled) | no create anywhere in `api/src`. Rows would have to be inserted by hand |
| RetentionPolicy | `people/departure.service.ts:34` (`findUnique`) | no create or upsert anywhere in `api/src` |

Flagged by the count but actually read through a relation, so not dead: `RoundCompletion` (`grounds.service.ts:1189`, `:1230`), `ImportJobFailure` (`bulk-import.service.ts:345`), `OpsKeyResult` (`ops-intent.service.ts:154`, `:257`), `OpsContributorTarget` (`ops-target-companies.service.ts:144`).

Also worth recording for a later pass: `Subject`'s own doc comment at `schema.prisma:3066` says "nothing in the live product reads it yet".

---

## C. BACKGROUND WORK

### Cron jobs, 23

| Schedule (UTC) | Job | File:line |
|---|---|---|
| `0 6 * * *` | `inviteJoinersWhoStartToday` | `grounds/grounds.cron.ts:61` |
| daily 03:00 | `stallOverdueGrounds` | `grounds/grounds.cron.ts:115` |
| `0 5 * * 1` | `weeklyPeriodBoundary` | `grounds/grounds.cron.ts:170` |
| `30 5 * * 1` | `weeklyConcentrationRisk` | `grounds/grounds.cron.ts:210` |
| every 30 min | `autoCloseStaleCheckIns` | `grounds/grounds.cron.ts:243` |
| every 15 min | `fireSessionClosingWarnings` | `grounds/grounds.cron.ts:320` |
| daily 09:00 | `sendReminders` | `grounds/grounds.cron.ts:379` |
| every 15 min | `sendSessionReadyNotifications` | `grounds/grounds.cron.ts:392` |
| `0 4 * * *` | `synthesisBackstop` | `grounds/grounds.cron.ts:640` |
| `0 10 * * *` | `sendFeedbackRequests` | `grounds/grounds.cron.ts:694` |
| daily 02:00 | `sweep` (pattern detection) | `patterns/patterns.cron.ts:29` |
| daily 03:00 | `purgeAbandonedDrafts` | `entry/entry.cron.ts:19` |
| daily 04:00 | `sweepUnverifiedAccounts` | `entry/entry.cron.ts:41` |
| hourly | `sweep` (API abuse watch) | `public-api/api-watch.cron.ts:18` |
| daily 03:00 | `ageOutDepartedTurns` | `people/departure.service.ts:122` |
| daily 07:00 | `escalateStaleHandoffs` | `webhooks/webhooks.cron.ts:43` |
| **every minute** | `deliverDue` (the outbound webhook delivery queue) | `webhooks/webhooks.cron.ts:89` |
| daily midnight | `handleCodeExpiryReminders` | `billing/code-expiry.scheduler.ts:19` |
| `0 7 * * *` | `tellManagersWhatIsComingUp` | `reports/reviews-coming-up.cron.ts:42` |
| daily 08:00 | `sendScheduledNudges` | `conversation/remind.service.ts:222` |
| `0 9 * * 1` | `weeklyLongitudinalSynthesis` | `intelligence/intelligence.service.ts:217` |
| `20 * * * *` | `finishClosingSynthesesThatFailed` | `reports/reports.service.ts:4168` |
| `0 8 * * 1` | `weeklyOutcomeLearningReport` | `reports/reports.service.ts:4207` |

The only queue is the webhook delivery table drained by `deliverDue` every minute. There is no Redis, no BullMQ, no external worker: `ScheduleModule.forRoot()` in-process (`app.module.ts:53`), which means every cron runs on every instance.

### Event listeners, 16

Events are declared in `api/src/common/events.ts:6-34`.

| Event | Listener | File |
|---|---|---|
| `checkin.completed` | patterns | `patterns/patterns.listener.ts` |
| `checkin.completed` | board | `board/board.service.ts` |
| `checkin.completed` | per-org WhatsApp | `public-api/whatsapp-for-an-organisation.service.ts` |
| `checkin.completed` | reports | `reports/reports.listener.ts` |
| `checkin.completed` | outbound webhooks | `webhooks/webhooks.listener.ts` |
| `checkin.opened` | outbound webhooks | `webhooks/webhooks.listener.ts` |
| `round.completed` | outbound webhooks | `webhooks/webhooks.listener.ts` |
| `round.completed` | round digest email | `email/round-digest.service.ts` |
| `ground.activated` | reports | `reports/reports.listener.ts` |
| `blocker.raised` | outbound webhooks | `webhooks/webhooks.listener.ts` |
| `blocker.escalated` | outbound webhooks | `webhooks/webhooks.listener.ts` |
| `handover.ready` | outbound webhooks | `webhooks/webhooks.listener.ts` |
| `scenario.proposed` | outbound webhooks | `webhooks/webhooks.listener.ts` |
| `org.signedUp` | the team is told | `back-office/the-team-is-told.service.ts` |
| `apiAccess.asked` | the team is told | `back-office/the-team-is-told.service.ts` |
| `call.asked` | the team is told | `back-office/the-team-is-told.service.ts` |

### Outbound webhook events

`api/src/modules/webhooks/events-we-can-actually-send.ts:23-45`. Seven are sendable: `round.completed`, `checkin.completed`, `checkin.opened`, `blocker.raised`, `blocker.escalated`, `handover.ready`, `scenario.proposed`.

Four are in the published contract and refused by name at subscription time because nothing emits them (`:57-61`): `finding.created`, `finding.escalated`, `proposal.created`, `graph.conflict_detected`.

---

## D. EXTERNAL SERVICES

| Service | Wrapper | Env vars | Not configured | Call fails |
|---|---|---|---|---|
| Google Gemini via Vertex AI (`@google/genai`) | `conversation/anthropic.service.ts:145-194`, calls at :275, :331, :371, :406 | `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`, `GEMINI_PROJECT_ID`, `GEMINI_LOCATION`, `GEMINI_MODEL`, `GEMINI_CONVERSATION_MODEL`, `GEMINI_MAX_TOKENS` | Production exits 1 (`main.ts:26-29`). Dev falls back to `credentials/service-account.json` (`:161`) and only fails at call time. A pre-GA model id throws at boot (`:175`) | Retries twice on 429/503 with `[800, 2500]` backoff (`:36-65`), then throws `ServiceUnavailableException` (`:67-71`). `extract()` returns `null` instead (`:490`, `:496`). Three consecutive failures rebuild the client (`:220-229`) |
| Resend, outbound email | `email/email.service.ts:20-34`, send at `:250-259` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL` | `isDev()` (`:54-60`) when the key is missing or a placeholder: mail is logged, relayed to a local mailcatcher on 127.0.0.1:1025 (`:230-232`), and a fake `dev-<uuid>` delivery row written. `isDev()` is false in production regardless, so production with no key calls Resend with `undefined` | Throws `Failed to send email: ...` (`:252-255`). Mailcatcher failure swallowed (`:233`). Delivery bookkeeping never throws (`delivery.service.ts:60-62`) |
| Resend, inbound webhook | `email/delivery.service.ts:19-99` | `RESEND_WEBHOOK_SECRET` | Warns at boot then fails closed: `UnauthorizedException` (`:70`) | Bad or late signature rejected (`:70,76,81,98`); unknown event types acknowledged and ignored |
| Stripe | `billing/stripe.service.ts:7-95` | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CALLBACK_URL`, `BILLING_ENABLED` | Production refuses to boot (`main.ts:23-25`). Otherwise `client = null` (`:39-41`) and any use throws `ServiceUnavailableException('Billing is not set up on this deployment...')` (`:57-64`) | SDK errors propagate uncaught (`:66-89`). Webhook with no secret throws (`:93`) |
| Meta WhatsApp Cloud API | `whatsapp/whatsapp.service.ts`, send `:105-148`, list send `:170-190`, media `:198-214`, `deliver()` `:217-233` | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, plus per-org rows in `WhatsAppConnection` | No call. Production logs "was not sent", dev logs `[DEV WHATSAPP]`, returns `false` (`:118-122`). Inbound with no app secret throws `UnauthorizedException` (`:56`) | `sendMessage` throws on non-2xx (`:143-144`). `deliver()` swallows and returns `false` (`:226-232`). Notice path `.catch(() => false)` (`:161`, `:174`). Interactive list refusal falls back to plain text (`:186-190`). Media returns `null` |
| Google OAuth | `auth/strategies/google.strategy.ts:6-31` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | The strategy is still constructed with the literal `'google-oauth-disabled'` (`:10-11`); the client hides the button because `GET /auth/methods` reports it off (`auth.controller.ts:176-181`). Hitting `/auth/google` anyway lands on Google's error page | Callback wrapped in try/catch, redirects back to the frontend (`auth.controller.ts:196-200`) |
| Slack incoming webhooks and Microsoft Teams connectors | `workspace/workspace-notifier.service.ts:22-167`, host rules `what-a-channel-may-be-told.ts:128-129` | `WORKSPACE_WEBHOOK_EXTRA_HOST` (ignored in production), URLs are per-org DB rows | Nothing connected: `tell()` returns `[]` (`:108-131`). An explicit test throws `NotFoundException('Nothing is connected there yet.')` (`:81`) | Never throws into the caller. 5s timeout (`:155`), non-2xx recorded as `{posted:false, because}` (`:157-162`), written to `lastError`, **no retry** |
| Customer outbound webhooks, arbitrary hosts | `webhooks/webhooks.service.ts:274-330` | none. Endpoints and secrets are DB rows. https required, loopback http allowed (`:71-79`) | Nothing sent | Failure recorded with no status code (`:293-295`), body truncated (`:292`), repeated failure calls `tellThemItIsDying` (`:329`) |
| Arbitrary pasted document URLs, including Google Docs export and Dropbox | `documents/read-it-if-we-can.service.ts:28-120`, rules `whether-we-can-read-it.ts:60-120` | none | n/a. SSRF-guarded: every redirect hop is DNS-resolved and private, link-local and metadata ranges refused (`:39-41`, `:90-98`) | Never throws. Returns `{read:false, because:...}` |
| PostHog, browser analytics | `client/src/lib/posthog.ts:25-41` | `VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_HOST` | `init` is never called; calls are no-ops | No app-level handling |
| Local mailcatcher SMTP, dev only | `email/email.service.ts:230-233` | none, hardcoded 127.0.0.1:1025 | only inside `isDev()` | Fully swallowed |

Notes for later passes:
- The production boot gate (`main.ts:17-30`, plus `config/configuration.ts`) covers `JWT_SECRET`, `CORS_ORIGINS`, `DATABASE_URL`, `BILLING_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `FRONTEND_URL`, `STRIPE_CALLBACK_URL`. It does **not** cover `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, any WhatsApp variable, or Google OAuth.
- No SMS provider, no S3 or object storage, no Sentry, no Twilio. Documents are stored in Postgres; PDF, DOCX and XLSX parsing is in-process (`pdf-parse`, `mammoth`, `xlsx`, `pdfkit`, `jszip`).
- `@google/generative-ai` is in `api/package.json` but has zero imports in `api/src`. Only `@google/genai` (the Vertex path) is used.
- `marketing/` makes exactly one network call, to `https://api.myground.work/api/v1` at `marketing/src/layouts/Layout.astro:95`. No analytics, no external fonts.
- Stripe.js is never loaded in the browser. The API returns a `checkoutUrl` and the client redirects (`client/src/api/billing.ts:203`).

---

## E. SCREENS

Every route in `client/src/App.tsx`. All are inside `<AppShell>` and `<PageCrash>` (`App.tsx:330-333`); the wrapper column is the per-route guard on top of that. Guard definitions: `RequireAuth` :90, `RequirePlatformAdmin` :107, `MayOpenCheckIns` :171, `AdminsOnly` :176, `RequireOrgSetup` :181, all in App.tsx; `RequireBackOffice` in `client/src/pages/ops/TheBackOfficeHasADoor.tsx`.

| Path | Component | File | Wrapper | For |
|---|---|---|---|---|
| `/` | `RootRoute` inline | App.tsx:234-310 | none | Signed out redirects to the marketing site, or `AFrontDoorOfItsOwn` (:201) in non-production with no marketing URL. Signed in: **redirect** to `/org/setup` if setup is needed, else the grounds list |
| `/login` | **redirect to `/auth`** | App.tsx:336 | none | Legacy alias |
| `/auth` | `AuthPage` | pages/auth/AuthPage.tsx | none | Sign in and sign up |
| `/auth/sent` | `AuthPage` | pages/auth/AuthPage.tsx | none | The link-sent state |
| `/signout` | `SignOutPage` | pages/auth/SignOutPage.tsx | none | Ends the session |
| `/verify-email` | `MagicVerifyPage` | pages/auth/MagicVerifyPage.tsx | none | Magic-link verification |
| `/auth/google/callback` | `GoogleCallbackPage` | pages/auth/GoogleCallbackPage.tsx | none | Google OAuth landing |
| `/set-password` | `ChoosePasswordPage` | pages/auth/ChoosePasswordPage.tsx | none | Set a password |
| `/reset-password` | `ChoosePasswordPage` | pages/auth/ChoosePasswordPage.tsx | none | Reset a password, same page |
| `/start` | `EntryChatPage` | pages/enter/EntryChatPage.tsx | `MayOpenCheckIns` | The anonymous entry chat |
| `/invite` | `InvitePage` | pages/invite/InvitePage.tsx | none | Accept an invite |
| `/join` | `JoinPage` | pages/join/JoinPage.tsx | none | Join a ground |
| `/join/confirm` | `JoinConfirmPage` | pages/join/JoinConfirmPage.tsx | none | Confirm the join |
| `/org/setup` | `OrgSetupPage` | pages/org/OrgSetupPage.tsx | `RequireAuth` | Set the organisation up |
| `/grounds` | `GroundsListPage` | pages/grounds/GroundsListPage.tsx | `RequireOrgSetup` | List of grounds |
| `/grounds/new` | **redirect to `/start`** | App.tsx:384 | none | Retired card wizard |
| `/grounds/:id` | `GroundPage` | pages/grounds/GroundPage.tsx | `RequireOrgSetup` | Routes to the admin or participant view |
| `/grounds/:id/p` | `GroundParticipantPage` | pages/grounds/GroundParticipantPage.tsx | `RequireOrgSetup` | The participant's view |
| `/grounds/:id/report` | `ReportPage` | pages/report/ReportPage.tsx | `RequireOrgSetup` | The ground report |
| `/grounds/:id/board` | `BoardPage` | pages/board/BoardPage.tsx | `RequireOrgSetup` | The board |
| `/grounds/:id/session/:sessionNumber` | `RoundReportPage` | pages/report/RoundReportPage.tsx | `RequireOrgSetup` | One round's report |
| `/chat/:checkInId` | **redirect to `/checkin/:checkInId`** | App.tsx:21-24 | none | Legacy URL |
| `/checkin/:checkInId` | `ChatPage` | pages/chat/ChatPage.tsx | `RequireOrgSetup` | The check-in conversation |
| `/checkin/:checkInId/report` | `SessionReportPage` | pages/report/SessionReportPage.tsx | `RequireOrgSetup` | The report a session ended on |
| `/billing` | `BillingPage` | pages/billing/BillingPage.tsx | `RequireAuth` | Billing |
| `/pricing` | `PricingPage` | pages/billing/PricingPage.tsx | none | Public pricing |
| `/talk-to-us` | `TalkToUsPage` | pages/talk/TalkToUsPage.tsx | none | Public contact form |
| `/billing/checkout` | `PaymentPage` | pages/billing/PaymentPage.tsx | `RequireAuth` | Payment |
| `/billing/callback` | `BillingCallbackPage` | pages/billing/BillingCallbackPage.tsx | `RequireAuth` | Return from the payment provider |
| `/ops` | `OpsBoardPage` | pages/ops/OpsBoardPage.tsx | `RequireBackOffice` + `OpsLayout` | The ops board |
| `/ops/target-companies` | `OpsTargetCompaniesPage` | pages/ops/OpsTargetCompaniesPage.tsx | same | Target companies |
| `/ops/companies/:key` | `OpsCompanyPage` | pages/ops/OpsCompanyPage.tsx | same | One company |
| `/ops/commitments` | `OpsCommitmentsPage` | pages/ops/OpsCompanyPages.tsx | same | Commitments |
| `/ops/spend` | `OpsSpendPage` | pages/ops/OpsCompanyPages.tsx | same | Spend |
| `/ops/overview` | `OpsOverviewPage` | pages/ops/OpsOverviewPage.tsx | same | Ops overview |
| `/ops/pipeline` | `OpsCommercialPipelinePage` | pages/ops/OpsContributionPages.tsx | same | Commercial pipeline |
| `/ops/sales` | **redirect to `/ops/pipeline`** | App.tsx:469 | none | Old address |
| `/ops/contribution` | `OpsContributionPage` | pages/ops/OpsContributionPages.tsx | same | Contribution |
| `/ops/positioning` | `OpsPositioningPage` | pages/ops/OpsContributionPages.tsx | same | Positioning |
| `/ops/attribution` | `OpsAttributionPage` | pages/ops/OpsContributionPages.tsx | same | Attribution |
| `/ops/marketing` | `OpsMarketingPage` | pages/ops/OpsSellingPages.tsx | same | Marketing |
| `/ops/deployment` | `OpsDeploymentPage` | pages/ops/OpsSellingPages.tsx | same | Deployment |
| `/ops/roadmap` | `OpsRoadmapPage` | pages/ops/OpsBuildingPages.tsx | same | Roadmap |
| `/ops/moat` | `OpsMoatPage` | pages/ops/OpsMoatPage.tsx | same | Moat |
| `/ops/readiness` | `OpsReadinessPage` | pages/ops/OpsBuildingPages.tsx | same | Readiness |
| `/ops/tech` | `OpsTechPage` | pages/ops/OpsBuildingPages.tsx | same | Tech items |
| `/ops/ux` | `OpsUXPage` | pages/ops/OpsBuildingPages.tsx | same | UX items |
| `/ops/workplan` | `OpsWorkplanPage` | pages/ops/OpsWorkplanPage.tsx | same | The five-phase workplan |
| `/ops/resources` | `OpsResourcesPage` | pages/ops/OpsResourcesPage.tsx | same | Resources |
| `/ops/everybody` | `OpsEverybodyPage` | pages/ops/OpsEverybodyPage.tsx | same | Everybody's quarter |
| `/ops/quarter` | `OpsQuarterPage` | pages/ops/OpsCompanyPages.tsx | same | The quarter |
| `/ops/what-we-are` | `OpsWhatWeArePage` | pages/ops/OpsWhatWeArePage.tsx | same | What we are |
| `/ops/requests` | `OpsRequestsPage` | pages/ops/OpsCompanyPages.tsx | same | Resource requests |
| `/ops/decisions` | `OpsDecisionsPage` | pages/ops/OpsCompanyPages.tsx | same | Decisions |
| `/ops/approvals` | `OpsApprovalsPage` | pages/ops/OpsCompanyPages.tsx | same | Approvals |
| `/ops/fundraise` | `OpsFundraisePage` | pages/ops/OpsCompanyPages.tsx | same | Fundraise |
| `/ops/strategy` | `OpsStrategyPage` | pages/ops/OpsCompanyPages.tsx | same | Strategy |
| `/ops/people` | `OpsPeoplePage` | pages/ops/OpsPeoplePage.tsx | same | The team and their grants |
| `/ops/integration` | `OpsIntegrationPage` | pages/ops/OpsCompanyPages.tsx | same | Pushing ops data into the product |
| `/admin/prompts` | `PromptVersioningPage` | pages/prompts/PromptVersioningPage.tsx | `RequirePlatformAdmin` | Prompt versions |
| `/admin/prompts/test` | `PromptTestPage` | pages/prompts/PromptTestPage.tsx | `RequirePlatformAdmin` | Prompt testing |
| `/prompts` | **redirect to `/admin/prompts`** | App.tsx:494 | none | Old bookmark |
| `/prompts/test` | **redirect to `/admin/prompts/test`** | App.tsx:495 | none | Old bookmark |
| `/settings` | `SettingsPage` | pages/settings/SettingsPage.tsx | `RequireOrgSetup` | User and organisation settings |
| `/org/members` | `OrgMembersPage` | pages/org/OrgMembersPage.tsx | `RequireOrgSetup` + `AdminsOnly` | Manage members |
| `/org/guide` | `LeadsGuidePage` | pages/org/LeadsGuidePage.tsx | none | Guide for leads |
| `/org/integrations` | `IntegrationsPage` | pages/org/IntegrationsPage.tsx | `RequireOrgSetup` | Connect: API, embed, WhatsApp, webhooks |
| `/admin` | `AdminPage` | pages/admin/AdminPage.tsx | `RequirePlatformAdmin` | The platform console |
| `/admin/api-access` | `ApiAccessPage` | pages/admin/ApiAccessPage.tsx | `RequirePlatformAdmin` | API access decisions |
| `/admin/dashboard` | `AdminDashboardPage` | pages/admin/AdminDashboardPage.tsx | `RequirePlatformAdmin` | Platform dashboard |
| `/unsubscribe/:token` | `StopMailPage which="unsubscribe"` | pages/mail/StopMailPage.tsx | none | Unsubscribe |
| `/stop-reminders/:token` | `StopMailPage which="stop-reminders"` | pages/mail/StopMailPage.tsx | none | Stop reminder mail |
| `*` | `NotFoundPage` | pages/notfound/NotFoundPage.tsx | none | 404 |

Seven of these are redirects: `/`, `/login`, `/grounds/new`, `/chat/:checkInId`, `/ops/sales`, `/prompts`, `/prompts/test`.

The embedded panel is not a React route. `GET /embed.js` (`api/src/modules/embed/embed-assets.controller.ts:33`) serves the loader a customer puts on their own page; `GET /embed/panel` (`:53`) serves `api/src/modules/embed/static/panel.html`, a self-contained page that calls `/api/org/v1/chat`, `/api/org/v1/assistant/what-you-can-see` and the rest (panel.html:166, 302, 347, 414). The in-app screens that correspond to it are `/org/integrations` for customers and, inside `/ops`, `TheAssistantAsACustomerSeesIt.tsx` (`OpsLayout.tsx:7`).

Static assets in `client/public`: `robots.txt`, `favicon.svg`, and `connect/panel.png`, `connect/ops-panel.png`, `connect/whatsapp.png`, used in the Connect copy.


---

## F. GAPS

Facts only. Method: 526 handlers extracted from `api/src/**/*.controller.ts` and matched against every quoted and template path string in `client/`, `marketing/`, `e2e/` and `api/src/modules/embed`, treating `${...}` and `:param` as wildcards. 140 of 526 had no match; 67 of those are the machine API and 6 are webhook receivers, both called from outside this repo.

### F.1 Present in the interface, no code behind it

| Interface | Calls | Server side |
|---|---|---|
| Prompt drafts on `/admin/prompts`: save draft `PromptVersioningPage.tsx:370`, discard `:404`, load `:672`, start `:690` | `POST /prompts/draft`, `DELETE /prompts/draft/:key`, `GET /prompts/draft/:key` (`client/src/api/prompts.ts:121,124,127`) | **No such routes.** `prompts.controller.ts:31` declares only `/`, `POST /`, `:id/activate`, `platform-funnel`, `by-key/:key`, `platform-dashboard`, `org-list`, `usage-stats`, `feedback-summary`, `test-chat`, `test-report` |
| A second admin pricing API in the client library | `GET`/`PATCH /billing/admin/pricing`, `POST /billing/admin/pricing/reset` (`client/src/api/admin.ts:145,148,150`) | **No such routes anywhere in `api/src`.** No UI calls them either; `client/src/api/every-endpoint-has-a-caller.spec.ts:41-47` lists them as known-unused |
| Feedback posted from the app shell | `POST /feedback` | The route exists now, but `app.module.ts:32-41` records that `FeedbackModule` was never imported until recently, so every submission 404'd and the client swallowed it on purpose |
| Webhook subscription page offers only seven events | `GET /integrations/webhooks/events` | Four contract events are refused by name because nothing emits them: `finding.created`, `finding.escalated`, `proposal.created`, `graph.conflict_detected` (`events-we-can-actually-send.ts:57-61`) |
| The `GUEST` member type in the org members picker | `client/src/pages/org/OrgMembersPage.tsx:716` | Rendered `disabled` |
| `PatternConfig` and `RetentionPolicy` | read by `patterns.service.ts:643` and `people/departure.service.ts:34` | Nothing in `api/src` ever writes a row to either table, and no screen creates one |

No `TODO`, "not implemented" or "coming soon" strings in `client/src` or `marketing/src`. No feature flag gates any client surface off; the only `import.meta.env` reads are `VITE_API_URL`, `VITE_MARKETING_URL`, `VITE_APP_URL` and the two PostHog variables.

### F.2 Present in code, unreachable from any interface

**Whole modules with no client caller**

| Module | Routes | Files |
|---|---|---|
| Alignment, the two-company contract surface | 29, the entire controller | `alignment/alignment.controller.ts:31` through `:324` |
| Workspace notifiers, Slack and Teams | 6, the whole controller | `workspace/workspace-notifier.controller.ts:26,32,43,54,61,68` |
| How we do it, the org knowledge surface | 4 | `knowledge/how-we-do-it.controller.ts:26,35,46,57` |
| Embed setup | 2 | `embed/embed-setup.controller.ts:22,28` |

**Individual routes with no caller**

| Route | File:line |
|---|---|
| `GET /admin/coaching` | `admin.controller.ts:238` |
| `GET /admin/stats` | `admin.controller.ts:250` |
| `GET /admin/feedback` | `admin.controller.ts:294` |
| `GET /admin/usage` | `admin.controller.ts:300` |
| `GET /admin/grounds/:groundId` | `admin.controller.ts:306` |
| `GET /grounds/org-roster` | `grounds.controller.ts:219` |
| `PATCH /grounds/:id/chasing` | `grounds.controller.ts:287` |
| `GET /grounds/:id/conversation` | `grounds.controller.ts:566` |
| `POST /grounds/:id/sign-off` | `grounds.controller.ts:584` |
| `DELETE /billing/account` | `billing.controller.ts:53` |
| `POST /billing/purchase-session` | `billing.controller.ts:126` |
| `PATCH /billing/contributor-codes/:codeId/disable` | `billing.controller.ts:211` |
| `GET /billing/admin/stats` | `billing.controller.ts:249` |
| `POST /grounds/:groundId/report/generate` | `reports.controller.ts:73` |
| `POST /grounds/:groundId/report/activate` | `reports.controller.ts:87` |
| `GET /grounds/:groundId/report/activation-status` | `reports.controller.ts:93` |
| `PATCH /patterns/:id/rate` | `patterns.controller.ts:31` |
| `POST /grounds/:groundId/feedback` | `intelligence.controller.ts:75` |
| `POST /users/:id/resend-invite` | `users.controller.ts:310`. The ground-scoped variant at `grounds.controller.ts:335` **is** called (`client/src/api/grounds.ts:173`) |
| `POST /documents/invite-upload` | `documents.controller.ts:20` |
| `POST /check-ins/:id/what-worked` | `conversation.controller.ts:64` |

The three report-activation routes are deliberate: `client/src/api/reports.ts:42-43` records that activation was removed on the client side.

**Scope issuable but unused:** `chat:write` is in `SCOPES` (`public-api/scopes.ts:8-40`) and no `@RequiresScope` names it.

**Client components imported by nothing**

| File | Lines | Note |
|---|---|---|
| `client/src/pages/home/HomePage.tsx` | 185 | No importer. Only mention is a filename string in `account-is-not-the-word.spec.ts:60` |
| `client/src/pages/home/EntryChat.tsx` | 186 | No importer. `App.tsx:15,365` routes to `pages/enter/EntryChatPage.tsx` instead |
| `client/src/pages/home/OnboardingChat.tsx` | 502 | No importer |
| `client/src/pages/home/SaveCard.tsx` | 303 | Imported only by the two orphans above, so transitively unreachable |

`client/src/pages/grounds/CreateGroundPage.tsx` is not routed either, but it exports `SCENARIOS`, `groupOfCard` and `scenarioFromParam`, used by `EntryChatPage.tsx:11`.

**Exported service methods nothing calls**

The repo already enforces this. `api/src/no-method-in-here-is-dead.spec.ts` fails when any non-private method on a `*.service.ts` class has no caller anywhere, exempting framework hooks and `@OnEvent` listeners, and counting spec-only callers as alive. It carries seven written exemptions (spec lines ~76-83): `billing.service.ts#isBillingReady`, `stripe.service.ts#cancelSubscriptionAtPeriodEnd`, `grounds.service.ts#pauseGround`, `intelligence.service.ts#rollupAnonymised`, `intelligence.service.ts#detectForceMultiplier`, `patterns.service.ts#getOrgWideMentions`, `whatsapp.service.ts#setPhoneNumber`.

`api/src/nothing-in-here-is-wired-to-nothing.spec.ts` does the same at file level: every non-spec `.ts` under `api/src` must be imported by a non-test file. Nine exemptions: `main.ts`, `what-this-ground-can-tell-you.ts`, `a-worry-steers-questions-not-findings.ts`, `what-has-to-be-true.ts`, `what-setup-never-asked-for.ts`, `an-interview-not-a-longer-setup.ts`, `role-clarity-is-not-a-score.ts`, `a-hypothesis-is-not-a-finding.ts`.

Re-running the same logic independently found nothing outside those exemptions. Two methods have only spec callers, both `@Cron` so they run on schedule: `people/departure.service.ts:122` and `reports/reports.service.ts:4168`.

`client/src/api/every-endpoint-has-a-caller.spec.ts` covers the opposite direction, client API methods no component calls, with eleven exemptions at lines 32-57: `billingApi.applyContributorCode`, `authApi.memberSignin`, `authApi.requestPasswordSetup`, `pricingAdminApi.get/update/reset`, `resolutionApi.counter`, `entryApi.opener`, `groundsApi.activate`, `promptsApi.create`, `groundsApi.getMediatorBrief`.

---

## Notes for later passes

1. Three routes live on the raw Express adapter outside every Nest guard: `/health`, `/health/ai`, `/health/email`. `/health/email` is unauthenticated and sends a real email to any address in `?to=`.
2. `POST /api/v1/ops/groundwork/events` (`ops-inbound.controller.ts:36`) is `@Public()`. It is the only ops route outside both `OpsCapabilityGuard` and the back-office door.
3. `GET /api/v1/users/colleagues` (`users.controller.ts:138`), `POST /users/me/leave`, `GET /users/me/export`, `DELETE /users/me/data` are the only non-ADMIN routes on an otherwise ADMIN controller.
4. `email.service.ts:54-60`: `isDev()` returns false in production regardless of the key, and `RESEND_API_KEY` is not in the production boot gate, so a production deploy with no key calls Resend with `undefined`.
5. Every `@Cron` runs in-process via `ScheduleModule.forRoot()` (`app.module.ts:53`). There is no leader election, so a multi-instance deploy runs each job once per instance.
6. `Subject`'s own schema comment (`schema.prisma:3066`) says nothing in the live product reads it yet, which matters when judging the machine API's value.
7. The path matching in F is string-based. A route with no literal caller string could still be reached through a computed URL; each F.2 entry should be spot-checked before anything is called dead.

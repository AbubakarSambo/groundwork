# CODEBASE FORENSIC AUDIT

## Purpose

This document is the persistent reference and working ledger for a forensic audit of this codebase.

The goal is to determine:

- what actually works
- what only appears to work
- what is partially wired
- what is completely disconnected
- what is duplicated or obsolete
- what contains logical inconsistencies
- what creates security risk
- what can corrupt or lose data
- what will fail under real-world conditions
- what is unnecessarily difficult to understand or maintain
- what represents a single point of failure
- what should be fixed, consolidated, connected, or removed

This is not a normal code review.

Assume this application has been built incrementally and may contain old and new implementations, incomplete integrations, duplicated logic, abandoned architecture and functionality that looks complete from one layer but is not connected end-to-end.

---

# GLOBAL AUDIT RULES

## 1. Trace, do not assume

Do not assume functionality works because the relevant files exist.

For important features trace the actual path:

**UI → handler/state → API → route/controller → service/business logic → database → events/jobs/webhooks/integrations → response → resulting state/UI**

Verify connections through actual imports, calls, routes, queries, registrations, listeners and execution paths.

---

## 2. Look across the repository

Do not review important files in isolation.

For important:

- functions
- classes
- routes
- services
- database tables
- models
- events
- jobs
- workers
- webhooks
- integrations
- state
- permissions

Search for:

- definition
- callers
- consumers
- alternate implementations
- old implementations
- tests
- schema references
- frontend references
- backend references

---

## 3. Do not fix during discovery

Unless specifically instructed, audit first.

Do not:

- rewrite large modules
- remove apparently unused code before tracing it
- choose between duplicate implementations without establishing which is authoritative
- weaken tests to make them pass
- hide errors with broad try/catch or fallback values
- introduce unnecessary abstractions
- perform a major rewrite simply because the code is messy

---

# WHAT TO LOOK FOR

Throughout every run, actively look for:

### Wiring failures

- UI with no backend
- backend with no reachable UI/API
- wrong endpoint
- wrong handler
- incorrect response shape
- events emitted with no listener
- listeners waiting for events never emitted
- jobs queued but never consumed
- workers that exist but are not registered
- cron jobs that do not actually run
- webhook handlers disconnected from downstream logic
- integrations configured but unused
- redirects/callbacks pointing at obsolete routes
- partially implemented feature flags

### Logical inconsistencies

- different definitions of the same concept
- conflicting status enums
- impossible state transitions
- inconsistent calculations
- inconsistent permissions
- inconsistent date/timezone handling
- inconsistent money handling
- duplicate sources of truth
- fields written differently from how they are read
- assumptions not enforced by the database
- stale data treated as authoritative

### Architecture

- duplicate systems
- abandoned implementations
- circular dependencies
- god modules/services
- hidden dependencies
- excessive global state
- business logic in UI
- business logic duplicated across controllers/services
- direct DB access scattered throughout the application
- unnecessary abstraction
- excessive indirection
- critical external synchronous dependencies
- single points of failure

### Security

- authentication weaknesses
- authorization gaps
- frontend-only permissions
- IDOR
- cross-user data access
- cross-tenant/org access
- privilege escalation
- insecure defaults
- token/session leakage
- insecure account recovery
- unsafe OAuth flows
- SQL/NoSQL injection
- XSS
- CSRF
- SSRF
- unsafe redirects
- path traversal
- unsafe uploads
- insecure deserialization
- command injection
- mass assignment
- unvalidated webhooks
- missing webhook signatures
- secrets exposed to frontend
- credentials committed to repository
- sensitive data in logs
- PII exposed through APIs or analytics

### Reliability

Test important architecture mentally against:

- duplicate requests
- double-clicks
- concurrent writes
- webhook redelivery
- out-of-order webhooks
- job running twice
- job crashing halfway
- service restarting halfway
- API timeout
- database timeout
- integration failure
- queue redelivery
- stale state
- missing configuration
- malformed data
- partial success
- network disconnect after server commit

Look for missing:

- transactions
- idempotency
- retries
- retry limits
- reconciliation
- rollback
- locking
- uniqueness constraints
- dead-letter handling
- observability
- meaningful error handling

### Data integrity

Look for:

- unused fields
- fields written but never read
- fields read but never reliably written
- duplicated data representations
- missing indexes
- missing foreign keys
- missing uniqueness constraints
- dangerous cascading deletes
- orphan records
- inconsistent soft deletion
- migration/application disagreement
- enum drift
- dangerous defaults
- derived data stored inconsistently

### Ghost functionality

Look for:

- incomplete navigation items
- forms that do not persist
- placeholder data presented as real
- mocks accidentally used in production
- TODO APIs
- abandoned database tables
- unused integration code
- dead feature flags
- obsolete pages still reachable
- duplicate services
- temporary code that became permanent

---

# FINDING FORMAT

Every substantive finding must contain:

### Finding
Exactly what is wrong.

### Evidence
Files, functions, routes, components, tables or execution paths demonstrating the issue.

### Why it matters
User, security, operational, financial, data or maintenance impact.

### Failure scenario
A concrete example of how it can fail.

### Severity
- Critical
- High
- Medium
- Low

### Confidence
- Confirmed
- Highly likely
- Suspected

### Recommended action
Specific remediation.

### Affected areas
Other components that need checking when this is changed.

---

# PERSISTENT AUDIT LEDGER

Claude must update this section after every run.

**Run 1 completed 2026-08-17.** Recon only. Nothing below was fixed, and nothing was
investigated past the point of mapping it — per the protocol's "do not fix during discovery".

## Areas audited

**Run 4 (data integrity):** cascade-delete topology across all 44 models; every hard-delete call
site in the API; the unverified-account sweep's emptiness predicate read line by line; constraint
counts. **Not** done: per-constraint tracing against dependent queries, orphan-record analysis,
migration-vs-application drift, the C-6 dead-column follow-up, and `RecordEntry`/`ConversationTurn`
lifecycle — the entities that hold what people actually wrote.

**Run 3 (logical consistency):** every value of all 24 enums scanned for write sites across both
codebases; billing-event and usage-event emission traced to source lines; the admin funnel's data
source verified rather than assumed. **Not** covered this run: date/timezone handling, permission
consistency, and the ground state machine's allowed transitions — all deferred, and they are the
parts of Run 3 most likely to hold something.

**Run 2 (feature wiring):** mechanical reconciliation of all 139 client API calls against all 179
declared API routes; resolution of Run 1's four suspects; controller-class and route-collision
check; feature-flag read-site tracing. **Not** traced this run: the check-in conversation engine
internals, the board, documents, WhatsApp downstream logic, and whether cron jobs are registered.

**Run 1 (recon, breadth not depth):** repository layout, applications, Prisma schema surface,
API module list, controller mounts, guards, event bus, scheduled jobs, external integration
config, feature-flag declarations.

Also carried in from a page-by-page UI audit run immediately before this document existed, and
worth treating as prior evidence rather than repeating: the client route graph (31 routes,
30 reachable from inside the app), and five fixed defects on `/grounds`, `/grounds/:id` and the
report tab. Every one was a label or counter disagreeing with the thing beside it; none was a
broken request. That is a signal about the class of defect this codebase produces.

## Areas not yet audited

- Every Run 2-10 concern (wiring traces, logic, data integrity, security, reliability, drift,
  tests, cross-system).
- `/checkin/:id` — the check-in conversation, the product's core. Least examined surface.
- The board, `/grounds/:id/p`, `/org/members`, `/settings`, `/prompts`.
- `groundwork_local_test` (461 files) and `e2e` as systems in their own right.
- The marketing Astro build.

## Architecture discovered

| Application | Shape | Source files |
|---|---|---|
| `api` | NestJS, 23 modules, 19 controllers | 748 |
| `client` | React + Vite SPA, 31 routes | 204 |
| `marketing` | Astro static site, separate build | 10 |
| `groundwork_local_test` | Python persona/agent harness, drives the real app via Playwright | 461 |
| `e2e` | Playwright specs | 22 |

**Database:** PostgreSQL via Prisma. **44 models, 24 enums, 69 migrations**, latest
`20260817120000_pricing_plans`.

**API modules:** admin, auth, billing, board, coaching, conversation, documents, email, entry,
feedback, grounds, intelligence, participants, patterns, prisma, prompts, reports, resolution,
usage, users, whatsapp.

**Auth:** JWT (`jwt-auth.guard`), plus magic-link email tokens, plus Google OAuth. Authorization
via `roles.guard` and `platform-admin.guard`. Org/tenant scoping appears to be carried as
`organizationId` on the JWT and applied per query — **unverified, Run 5 owns this.**

**Event bus:** exactly two events, `CHECK_IN_COMPLETED` and `GROUND_ACTIVATED`. Both have
listeners (`reports.listener`, `patterns.listener`). No orphan events and no listener waiting on
an unemitted event, at this level of inspection.

**Scheduled work:** 7 non-spec files carry `@Cron` — grounds.cron, patterns.cron, entry.cron,
code-expiry.scheduler, and cron methods living inside intelligence.service, reports.service and
remind.service. **Whether the scheduler module is registered and these actually fire is not
verified.** Run 2/6.

**Webhooks:** Stripe (`billing.controller`, signature-verified per its own annotation), Resend
delivery events (`email/resend-webhook.controller`), WhatsApp (`webhooks/whatsapp`).

**Integrations declared in config:** database, jwt, resend, google, gemini, whatsapp, stripe.

## Major product flows

1. **Anonymous entry → account → ground.** `/start` chat → `entry-save` → emailed magic link →
   `/verify-email` → commit creates the ground → password step → ground page.
2. **Invite → participant check-in.** Invite email → `/invite` → accept → `/checkin/:id`.
3. **Check-in conversation → record → report.** Engine turns → `RecordEntry` → synthesis →
   release → per-party activation/reveal.
4. **Resolution / closing.** End states, confirmations.
5. **Billing.** Free-ground limit → subscription checkout → Stripe Price objects → webhook.
6. **Platform admin.** Prompts, pricing, WhatsApp toggle, usage, feedback.

## Critical dependencies

| Component | Depends on | If it fails |
|---|---|---|
| Check-in conversation | Gemini/Vertex | The core product cannot run |
| All email (invites, magic links) | Resend | Nobody can sign in or be invited — magic links ARE the auth |
| Checkout + pricing | Stripe | Cannot take money; `/billing/pricing` depends on a DB table |
| Everything | PostgreSQL | Total |

## Confirmed findings

**Run 2 · C-1 · Prompt drafts: a live admin screen calls three routes that do not exist.**
*Severity High. Confidence Confirmed.*
`client/src/api/prompts.ts:121,124,127` call `POST /prompts/draft`, `DELETE /prompts/draft/:key`
and `GET /prompts/draft/:key`. `api/src/modules/prompts/prompts.controller.ts` declares eleven
routes and **none of them is `draft`**. `PromptVersioningPage.tsx:672` calls `getDraft` in a live
`useQuery` with `retry: false`, so a platform admin editing a prompt gets a silent 404 and an
always-empty draft. Drafting a prompt cannot persist; nothing tells them. **Why it matters:** the
prompts screen is how the conversation engine's behaviour is changed, and its save-a-draft
affordance does not save. **Failure scenario:** an admin writes a long prompt revision, relies on
the draft, navigates away, and it is gone with no error. **Recommended action:** decide whether
drafts are a feature — if yes implement the three routes, if no remove the client methods and the
UI that offers them. **Affected areas:** `PromptVersioningPage`, prompt activation flow, and any
test that mocks `promptsApi`.

**Run 2 · C-2 · `objectivesEnabled` is declared and read nowhere; objectives are permanently on.**
*Severity Low. Confidence Confirmed.*
`api/src/config/configuration.ts:84` sets `objectivesEnabled` from `OBJECTIVES_ENABLED`. Grep
across all non-spec API source finds **no other reference** to either name, and `objectives.enabled`
is read zero times. **Why it matters:** an operator who sets `OBJECTIVES_ENABLED=false` to disable
the feature will see no change, and believe they have turned something off. **Recommended action:**
either consult the flag where objectives are created and read, or delete it and the env var.

**Run 2 · C-3 · A dead client for pricing-admin routes that were deleted in the merge — mine.**
*Severity Low. Confidence Confirmed.*
`client/src/api/admin.ts` exports `pricingAdminApi` calling `GET/PATCH /billing/admin/pricing` and
`POST /billing/admin/pricing/reset`. Those endpoints were mine and were removed when Abubakar's
pricing implementation was taken wholesale during the merge of 2026-08-17. **No component imports
`pricingAdminApi`** — the admin screen uses his `adminApi.getPricing`. So it is dead rather than
broken, but it is a loaded trap: wiring any UI to it yields 404s on a money surface.
**Recommended action:** delete `pricingAdminApi` and its `PricingSnapshot` type.

**Run 3 · C-4 · The billing ledger records the product that was withdrawn and not the one being sold.**
*Severity Medium (financial records). Confidence Confirmed.*
`BillingEventType` declares CARE_FEE, PARTICIPANT_FEE, SUBSCRIPTION_FEE, FREE_EXTENSION,
SESSION_FEE. Only two are ever written: `FREE_EXTENSION` (`billing.service.ts:327`) and
`SESSION_FEE` (`:782`). **SUBSCRIPTION_FEE is never written**, and per-session selling was
deliberately removed from every UI surface earlier today — so the `BillingEvent` ledger writes a
row type for a product no longer sold and no row at all for subscriptions, which is the entire
revenue model. **Why it matters:** `BillingEvent` is the in-product record of what an organisation
was charged. Reconciling revenue against Stripe from this table is not possible.
**Failure scenario:** an org disputes a charge; the ledger has no row for their subscription.
**Recommended action:** write SUBSCRIPTION_FEE on subscription invoice events in the Stripe webhook
handler; decide whether SESSION_FEE and the two never-written fee types should be removed.
**Affected areas:** Stripe webhook, `/billing/admin/stats`, any future revenue reporting.

**Run 3 · C-5 · Six of eleven usage event types are declared and never emitted.**
*Severity Medium. Confidence Confirmed.*
Emitted: GROUND_CREATED, PARTICIPANT_INVITED, BILLING_ACTIVATED, REPORT_RELEASED,
CHECK_IN_COMPLETED. **Never emitted:** CHECK_IN_STARTED, REPORT_REQUESTED, PARTICIPANT_ACCEPTED,
ORG_CREATED, SUBSCRIPTION_STARTED, SUBSCRIPTION_CANCELLED. Note especially that
`CHECK_IN_COMPLETED` is emitted while `CHECK_IN_STARTED` is not, so `usage_events` can never
express a start-to-completion rate. **Corrected mid-run:** I expected the admin Drop-offs tab to
divide by the missing event and it does not — `prompts.service.ts:101-212` computes the funnel from
CheckIn ROWS, not usage events. So this is an incomplete telemetry record rather than a broken
screen, and is Medium not High. **Recommended action:** emit the six, or delete them from the enum;
an enum value that cannot occur is a false promise to whoever writes the next query.

**Run 3 · C-6 · An entire enum, `CompanyStage`, is unreferenced in all non-spec source.**
*Severity Low. Confidence Confirmed.* IDEA, PRE_REVENUE, EARLY_REVENUE, SCALING — none appears
anywhere outside the schema. Also unreferenced: `EvidenceType.UNANCHORED_RECALL`, while
`ANCHORED_RECALL` and `CHECK_IN` are each written exactly once. **Recommended action:** Run 4 owns
whether the backing columns are read; do not delete before that.

**Run 4 · C-7 · The account sweep can hard-delete an organisation without ever looking at its money.**
*Severity Medium. Confidence Highly likely (reachable), Confirmed (the omission).*
`api/src/modules/entry/unverified-sweep.ts` runs daily and is the **only hard-delete path in the
codebase** — everything else soft-deletes via `deletedAt`. It deletes a `User` at line 76 and then
their `Organization` at line 80. Its emptiness predicate checks six person-traces
(`groundsInitiated`, `participantLinks`, `contributorCodes`, `redeemedCodes`, `codeRedemptions`,
`styleProfiles`) and, for the org, sibling users and ground count. **It consults nothing financial:
not `BillingEvent`, not `stripeCustomerId`, not `subscriptionStatus`, not `subscriptionStripeId`.**
`BillingEvent.organization` is `onDelete: Cascade`, so the charge ledger for that org is destroyed
with it, and any Stripe customer id held locally is orphaned rather than cancelled.
**Why it matters:** this is the one place in the product that destroys data irreversibly, and the
one class of data it does not check for is the class you cannot reconstruct.
**Failure scenario:** any path that attaches a Stripe customer or a BillingEvent to an org whose
sole user is still unverified — and signup provisions an ADMIN **before** email verification, which
is recorded separately as GW-001 — leaves that org eligible for deletion once it ages past the
cutoff with no grounds. The Stripe side survives; the local record does not.
**Recommended action:** add `billingEvents`, `stripeCustomerId` and `subscriptionStatus` to the
predicate, refusing deletion if any is present. Cheap, and it replaces an assumption
("a subscriber must be verified") that the code does not enforce.
**Affected areas:** `entry.cron`, the sweep's own spec, Stripe reconciliation.
**Note:** this sweep is my own earlier work, which is why the assumption was invisible to me
when I wrote it.

**Run 4 · Observations, not yet findings.** 40 relationships are `onDelete: Cascade` against only
10 non-cascade rules, so the schema's default posture is destructive; that is fine while there is
exactly one hard-delete path, and becomes dangerous the moment a second is added. Constraint
coverage looks healthy on its face — 32 `@unique`, 11 `@@unique`, 34 `@@index` — but **no
constraint was traced against the queries that depend on it, so this run cannot claim uniqueness is
enforced where the code assumes it.** The C-6 dead-column follow-up promised by Run 3 was **not
done** — `CompanyStage`'s backing columns remain unverified and nothing should be deleted on the
strength of Run 3 alone.

**Run 5 · C-8 · CRITICAL · The WhatsApp webhook accepts unsigned requests and treats a phone number
in the body as proof of identity, then writes into that person's private check-in as them.**
*Severity **Critical**. Confidence **Confirmed** on the code path.*

**Evidence.** `api/src/modules/whatsapp/whatsapp.controller.ts`:
- The controller is `@Public()` (line 16) and `WhatsAppModule` is registered in `app.module.ts:53`,
  so `POST /webhooks/whatsapp` is live in every deployment.
- `receive()` (line 41) reads `body.entry[0].changes[0].value.messages[0]`, takes `message.from` —
  **a phone number supplied by the caller** — and calls `findUserByPhoneNumber(fromNumber)`.
- It then calls `this.conversation.open(openCheckIn.id, user.id)` or
  `this.conversation.sendMessage(openCheckIn.id, user.id, text)`. The identity handed to the
  conversation engine is **the matched user's**, derived entirely from unverified request data.
- It replies to that number with `result.reply`.
- **No signature is verified.** Meta signs webhooks with `X-Hub-Signature-256`; `grep -rin
  "hub-signature"` across `api/src` returns **nothing**.
- **The admin toggle does not protect this.** `receive()` contains zero references to `isEnabled`
  (verified by count). The WhatsApp toggle and the credential gate govern **sending**, not receiving.
- The GET handler does check `whatsapp.verifyToken`, but that is Meta's subscribe handshake and
  says nothing about the authenticity of any subsequent POST.

**Why it matters.** This product's central promise, printed on the privacy screen every participant
reads, is that their own account of a workplace situation is private and attributable only to them.
This endpoint lets an unauthenticated caller write into a named person's private check-in **as that
person**, and read the engine's reply, which is composed from their check-in context.

**Failure scenario.** An attacker who knows one linked phone number POSTs a hand-written Meta-shaped
JSON body to `/webhooks/whatsapp`. Groundwork accepts it, appends the attacker's text to that
person's live check-in as their own words, and returns the engine's next question in the HTTP
response. Those words then flow into the synthesised report their manager reads. There is no
authentication to defeat and no signature to forge.

**Recommended action, in order.** (1) Verify `X-Hub-Signature-256` against
`WHATSAPP_APP_SECRET` over the **raw** body, failing closed on a missing secret, missing header or
mismatch — the pattern `email/resend-webhook.controller.ts` already uses correctly in this same
codebase. (2) Make `receive()` return early unless `whatsapp.isEnabled()`, so an unconfigured
deployment has no live inbound path at all. (3) Treat the phone number as a lookup key only after
the signature proves the request came from Meta.

**Affected areas.** `conversation.open` / `sendMessage` (they trust their `userId` argument, which is
correct — the caller is what is wrong), `RecordEntry` provenance, report synthesis, and any
guarantee made about check-in authorship.

**Withdrawn from Run 1.** The Resend webhook concern. `email/resend-webhook.controller.ts` verifies
the signature over the raw body and its own comment says FAIL CLOSED. It is the model the WhatsApp
handler should copy.

**Run 5 (continued) · IDOR / ownership scan — NO finding, and the negative result is the point.**
*Confidence Confirmed for what was scanned.*
Every controller handler taking a URL parameter was checked for whether it passes an ownership key
(`organizationId`, `userId`, or the user object) to its service. **6 of them pass none** — and all
six are correct: `admin.controller.ts` (3), `prompts.controller.ts` (2) and
`feedback.controller.ts` (1) operate on platform-wide resources, not org-scoped ones. Guards
verified individually rather than assumed: `admin` and `prompts` carry class-level
`@UseGuards(PlatformAdminGuard)` at lines 67 and 30; `feedback` has **no class-level guard**, but
its two admin routes each carry their own at lines 60 and 66, and its only `@Public()` route is the
`@Post()` that submits feedback, which is correct. Every org-scoped id-taking handler passes an
ownership key. **No IDOR was found in this scan.** What the scan does NOT establish: that each
service then *uses* the key it was given in its query. That is the remaining half, and C-7 is
precedent for the gap between receiving a key and honouring it.

Five further confirmed defects predate this document and were fixed on 2026-08-17.

## Suspected findings requiring further tracing

**Run 2 resolved three of Run 1's four suspects. Two were my own errors and are withdrawn:**

- ~~Two controllers mount on `'grounds'`~~ — **withdrawn.** `conversation.controller.ts` contains
  TWO controller classes, `@Controller('check-ins')` at line 21 and `@Controller('grounds')` at
  line 110. Their method+path pairs were compared against `grounds.controller.ts` and **none
  collides.** Two files sharing the namespace is a Run 7 tidiness question, not a wiring fault.
- ~~`personObjective` is read but never written~~ — **withdrawn.** It is written by `upsert` at
  `grounds.service.ts:2174` and `:2195` and by `update` at `:2220`. My original check grepped only
  for `.create` and missed both. Recorded because the same mistake would have deleted a live table.
- ~~A duplicate `@Get(':id')` in grounds.controller~~ — **withdrawn.** The second match was a
  COMMENT at line 130 quoting the decorator while explaining an old routing-order bug. Only one
  real decorator exists, at line 152. This is the third time in one session that a grep matched a
  comment rather than code; any future source-level assertion in this repo should strip comments
  first.

**Still suspected:**

1. **Two flag-reading conventions coexist.** `COACHING_ENABLED`, `CONFIDENCE_ENABLED` and
   `CONTEXT_ENABLED` are read by raw `process.env` name inside service files while their
   `config` keys (`coaching.enabled` etc.) are read zero times. Works, but means a flag can be
   consulted two ways and disabled in only one of them. **Run 7.**
2. **`intelligence.controller.ts` uses a pathless `@Controller()`**, mounting at the API root.
   Not yet traced. **Run 2 follow-up.**
3. ~~**`OBJECTIVES_ENABLED`**~~ — promoted to Confirmed (C-2).
4. **Original item 1 text retained below for history.**

   **`OBJECTIVES_ENABLED` is declared and read nowhere.** It appears in
   `api/src/config/configuration.ts` and in **no other non-spec file**; `objectives.enabled` is
   read 0 times. Either objectives are permanently on, permanently off, or gated by a flag nobody
   consults. There are `GroundObjective` and `PersonObjective` tables, so something exists to
   gate. **Severity unknown until Run 2 traces it. Suspected.**
2. **Three of five feature flags are declared but their config key is never read.**
   `coaching.enabled`, `confidence.enabled`, `context.enabled` all resolve to 0 read sites, while
   the raw env names appear in service files. Suggests two flag-reading conventions coexisting.
   **Suspected — Run 2.**
3. **Two controllers mount on `'grounds'`** — `grounds.controller.ts` and
   `conversation.controller.ts`. The repo already contains `a-route-cannot-be-shadowed.spec.ts`
   and `a-check-that-can-never-be-true.spec.ts` at module root, which says route shadowing has
   bitten here before. **Suspected — Run 2/7.**
4. **`intelligence.controller.ts` uses a pathless `@Controller()`**, mounting at the API root
   rather than under a namespace. **Suspected — Run 2.**

## Unresolved questions

- Are the 7 cron carriers actually registered and firing?
- Is org scoping enforced in queries, or only in the guard? (Run 5.)
- Do the 44 models all have live readers and writers? The count is high relative to 23 modules.
- Which of `groundwork_local_test` and `e2e` is the authoritative harness?

## Duplicate/competing implementations discovered

- Two controllers on the `'grounds'` mount (above).
- Two flag-reading conventions (above).
- Historically: two pricing services built the same day, resolved on 2026-08-17 by keeping the
  Stripe-Price-object implementation and deleting the other. Recorded because it demonstrates the
  drift Run 7 is looking for is real and recent.

## Security concerns

**Run 5, partial.** One Critical: C-8, the unsigned WhatsApp webhook that accepts a phone number as
identity and writes to a private check-in as that person. Resend's webhook is correctly verified and
fails closed. Stripe's is annotated as signature-verified — **not independently re-verified this
run.**

**Partially closed since:** the IDOR/ownership scan above covers whether every id-taking handler
passes an ownership key, and whether the six that do not are guarded. It does not cover whether
services honour the key they receive.

**NOT audited, and these are the ones that matter most after C-8:** whether each service uses the
ownership key in its query; whether `@Roles` is applied consistently across all
179 routes; the magic-link token's entropy, expiry and single-use behaviour; the Google OAuth
callback; upload handling in `documents`. This run examined the external entry points and stopped.

Original Run 1 recon note follows. Recon notes only: 3 guards exist; `PLATFORM_ADMIN_BOOTSTRAP_EMAIL`
grants platform admin from an env var; three webhook entry points exist and only Stripe's is
annotated as signature-verified — **the Resend and WhatsApp handlers' verification is unchecked.**

## Data integrity concerns

Nothing assessed. Run 4 owns this. Recon note: 44 models / 69 migrations is a large surface for a
product with one primary flow, which is where abandoned tables tend to hide.

## Reliability concerns

Nothing assessed. Run 6 owns this. Recon note: magic-link email is a single point of failure for
authentication itself — there is no password-only path for an account that never set one, which
is the fault that a previous simulation showed stops grounds reaching a report.

---

# FEATURE WIRING MATRIX

Maintain this throughout the audit.

**Run 2, 2026-08-17.** Built by reconciling every `apiClient.*` call in the client against every
route declared by a `@Controller` + method decorator in the API: **179 routes declared, 139
distinct client calls, 6 calls with no matching route.** Mechanical, not inferred. What it does
NOT prove is that a matched route does the right thing — Run 3 owns that.

| Feature | UI | API | Logic | DB | Async/Integration | Auth | Tests | Overall |
|---|---|---|---|---|---|---|---|---|
| Anonymous entry → ground | ✅ | ✅ | ✅ | ✅ | ✅ magic-link email | ✅ | ✅ persona suite_v | ✅ |
| Invite → participant check-in | ✅ | ✅ | ✅ | ✅ | ✅ invite email | ✅ | ✅ | ✅ |
| Check-in conversation | ✅ | ✅ | ✅ | ✅ | ✅ Gemini | ✅ | ⚠️ | ❓ not traced this run |
| Report synthesis + release | ✅ | ✅ | ✅ | ✅ | ✅ event-driven | ✅ | ✅ | ✅ |
| Report reveal / activation | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ | ✅ |
| Resolution / closing | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ | ❓ |
| Billing: free-tier gate | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Billing: subscribe | ✅ | ✅ | ✅ | ✅ | ⚠️ Stripe unwired in env | ✅ | ⚠️ | ⚠️ |
| Pricing admin (Abubakar's) | ✅ | ✅ | ✅ | ✅ | ⚠️ needs migrate deploy | ✅ | ⚠️ | ⚠️ |
| **Pricing admin (mine)** | — | ❌ | — | — | — | — | — | **🗑 dead client, routes deleted** |
| **Prompt DRAFTS** | ✅ | ❌ | ❌ | ❓ | — | ✅ | ❌ | **👻 UI calls 3 routes that do not exist** |
| Prompt versions + activate | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ | ✅ |
| Board | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ | ❓ not traced this run |
| Documents | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ | ❓ |
| WhatsApp check-ins | ✅ toggle | ✅ | ❓ | ❓ | ⚠️ key-gated, off | ✅ | ⚠️ | ⚠️ |
| Objectives | ✅ | ✅ | ✅ | ✅ | — | ✅ | ⚠️ | ⚠️ **flag dead, permanently on** |

Use:

- ✅ Connected
- ⚠️ Partial
- ❌ Broken
- 👻 Appears implemented but unreachable
- 🗑 Obsolete/duplicate
- ❓ Requires further tracing

---

# RUN 1 — ARCHITECTURE RECONNAISSANCE

Map the system before judging it.

Identify:

- applications
- services
- frontend(s)
- backend(s)
- databases
- schemas/models
- major modules
- authentication
- authorization
- users
- organisations/tenants
- APIs
- integrations
- queues
- workers
- cron/scheduled jobs
- webhooks
- notifications
- caches
- file storage
- payment systems
- analytics
- feature flags
- environment/configuration
- deployment assumptions

Identify the major product flows the code appears intended to support.

Flag confusing or apparently competing architecture, but do not deeply investigate it yet.

Update the Audit Ledger.

STOP.

---

# RUN 2 — FEATURE WIRING

Use Run 1's architecture map.

Trace every major product feature end-to-end.

Verify:

**UI → state → API → backend → business logic → DB → async/integrations → response**

Do not infer connections.

Find functionality that is:

- fully wired
- partially wired
- broken
- unreachable
- UI-only
- backend-only
- duplicated
- obsolete

Update the Feature Wiring Matrix and Audit Ledger.

STOP.

---

# RUN 3 — LOGICAL CONSISTENCY

Using the flows already discovered, investigate:

- business rules
- status definitions
- state transitions
- calculations
- permissions
- dates/timezones
- money
- ownership
- sources of truth
- frontend/backend assumptions

For stateful workflows map:

**states → allowed transitions → triggers → persistence → side effects → recovery**

Find contradictions and impossible states.

Update the Audit Ledger.

STOP.

---

# RUN 4 — DATA INTEGRITY

Audit schemas, migrations, models and actual usage together.

Trace critical entities:

**create → read → update → transitions → archive/delete → side effects**

Find:

- schema drift
- orphan data
- missing constraints
- conflicting fields
- unreliable fields
- duplicate representations
- dangerous deletes
- migration incompatibilities
- incorrect defaults

Update the Audit Ledger.

STOP.

---

# RUN 5 — SECURITY

Now perform the security audit with knowledge of the real architecture.

For every sensitive action answer:

**Who can perform this?**

**Where is permission enforced?**

**Can that enforcement be bypassed?**

Explicitly trace tenant/org ownership:

**request → auth → authorization → query → mutation → response**

Audit external entry points including:

- APIs
- webhooks
- uploads
- integrations
- callbacks
- authentication flows

Update the Audit Ledger.

STOP.

---

# RUN 6 — RELIABILITY & FAILURE MODES

Take important flows and simulate:

- duplicates
- retries
- concurrency
- partial failures
- timeouts
- integration failures
- DB failures
- service restart
- worker crash
- queue redelivery
- webhook redelivery
- stale state

Identify:

- race conditions
- missing idempotency
- incorrect transactions
- silent failures
- missing reconciliation
- dangerous retry behaviour
- single points of failure

For critical dependencies record:

**Component → dependency → failure effect → recovery → blast radius**

Update the Audit Ledger.

STOP.

---

# RUN 7 — ARCHITECTURAL DRIFT & DEAD SYSTEMS

Now specifically investigate whether incremental development created:

- old/new implementations
- competing services
- duplicate business logic
- dead code
- dead routes
- abandoned database structures
- unused integrations
- unnecessary abstractions
- god modules
- hidden dependencies
- circular dependencies
- inconsistent architecture patterns

Do not recommend deleting something until its references and possible runtime registration have been checked.

Determine which implementations are authoritative.

Update the Audit Ledger.

STOP.

---

# RUN 8 — TEST REALITY CHECK

Audit whether tests actually prove the system works.

Look for:

- major flows without tests
- tests of obsolete implementations
- excessive mocking
- missing integration tests
- missing authorization tests
- missing tenant isolation tests
- missing failure-mode tests
- missing retry/idempotency tests
- unit tests passing around disconnected architecture

Identify where tests create false confidence.

Update the Audit Ledger.

STOP.

---

# RUN 9 — FINAL CROSS-SYSTEM AUDIT

Revisit the entire system using everything discovered so far.

Specifically search for inconsistencies that were difficult to see when individual areas were examined separately.

Ask:

- Does every major feature actually work end-to-end?
- Are there competing sources of truth?
- Are old systems still affecting new systems?
- Are permissions consistently enforced?
- Are background processes actually registered and running?
- Are all events consumed?
- Are integrations truly connected?
- Are database assumptions consistent?
- Are there failure chains crossing multiple systems?
- Are there issues that earlier runs incorrectly classified?

Update findings where new evidence changes the conclusion.

STOP.

---

# RUN 10 — FINAL SYNTHESIS & REPAIR PLAN

Do not modify code yet.

Consolidate the audit.

Remove duplicate findings.

Separate:

- confirmed problems
- highly likely problems
- unresolved suspicions

Produce:

## Critical failures

## High-risk bugs

## Broken/unwired functionality

## Security findings

## Data integrity findings

## Reliability/concurrency findings

## Architectural problems

## Dead/duplicate systems

## Test gaps

## Simplification opportunities

Then produce the final:

### Feature Wiring Matrix

### Dependency & Failure Map

### Root Cause Map

Identify where multiple symptoms come from the same underlying architectural problem.

Finally produce an ordered remediation plan:

1. security/data exposure
2. data corruption/integrity
3. broken core functionality
4. unwired functionality
5. concurrency/idempotency
6. reliability
7. architectural consolidation
8. dead-code removal
9. test improvements
10. cleanup/refactoring

For every repair identify dependencies and what should be retested.

Do not start implementation until explicitly instructed.

---

# COMPLETION RULE

Never claim the codebase has been fully audited merely because all runs have been attempted.

At the end explicitly state:

- what was thoroughly audited
- what was partially audited
- what could not be verified
- what remains uncertain
- what would require runtime/production/infrastructure access to confirm

The purpose of this process is not to produce a reassuring report.

The purpose is to establish as accurately as possible:

**what actually works, what only appears to work, what is disconnected, what is dangerous, and what will eventually break.**
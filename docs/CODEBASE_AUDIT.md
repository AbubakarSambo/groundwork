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

**Run 6 · C-9 · The Stripe webhook's idempotency is a check-then-act race, and the database does not
back it up.** *Severity High. Confidence Confirmed (the missing constraint); the race requires
concurrent delivery.*

**Evidence.** `billing.service.ts`, `case 'checkout.session.completed'`:
- Line ~767: `const existing = await this.prisma.billingEvent.findFirst({ where: { stripeInvoiceId } })`
  and it skips with a "Duplicate webhook" warning if found. So idempotency was intended and is
  **half** present.
- The two writes that follow — `ground.update({ sessionsBalance: { increment: qty } })` and
  `billingEvent.create({ stripeInvoiceId, ... })` — are correctly wrapped in
  `this.prisma.$transaction([...])`, so they are atomic **with each other**.
- But `schema.prisma:1204` declares `stripeInvoiceId String? @map("stripe_invoice_id")` with **no
  `@unique`**, and `BillingEvent` carries only `@@index([organizationId])`. Nothing in the database
  prevents two rows with the same invoice id.

**Why it matters.** The read and the write are not atomic with respect to each other, and the column
that would make the race harmless is not constrained. Stripe retries webhooks by design and can
deliver the same event more than once, concurrently; any deployment running more than one instance
widens the window further.

**Failure scenario.** Two deliveries of one `checkout.session.completed` arrive together. Both run
`findFirst`, both see nothing, both enter their transaction. The customer's `sessionsBalance` is
incremented **twice** for one payment, and the ledger gains two rows for one invoice — so the
product both gives away sessions and reports a charge that did not happen twice. It fails in both
directions at once, which is why this is High rather than Medium.

**Recommended action.** Put `@unique` on `BillingEvent.stripeInvoiceId` (nullable-unique is fine in
Postgres — multiple NULLs are permitted, and the non-Stripe event types leave it null), then treat
the unique-violation on insert as the idempotency signal rather than relying on the prior read. That
converts an unguarded race into a caught error and keeps the existing `findFirst` as a cheap fast
path. Requires a migration.

**Affected areas.** All five webhook cases in that switch, `sessionsBalance` arithmetic, the
`BillingEvent` ledger and any future reconciliation against Stripe. Note this compounds with **C-4**
(the ledger never records SUBSCRIPTION_FEE) and **C-7** (the ledger is cascade-deleted with its org):
three findings on one table, none of them the same bug.

**Run 6 · Observations.** `usage.emit(...)` is called with `.catch(() => undefined)` at six sites,
so telemetry failures are swallowed silently by design — defensible for analytics, and worth knowing
it means C-5's missing events would never announce themselves. No `$transaction` was found in the
services scanned other than the billing path above, but **that scan was a grep, not a review of
every multi-write operation**, and must not be read as "the rest need none".

**Run 7 · C-2 STRENGTHENED, and two of my own suspicions withdrawn.**

**C-2 now has much better evidence than "read nowhere".** The codebase has **one** working
flag convention — `this.config.get<boolean>('app.<camelCase>')`, wrapped in a small private
predicate on the owning service:
`grounds.service.ts:529 contextEnabled()`, `conversation.service.ts:1072 coachingEnabled()`,
`reports.service.ts:495 confidenceEnabled()`, and `reports.service.ts:1939` for
`postReportGuideEnabled`. Four of the five flags follow it. **`objectivesEnabled` has exactly one
reference in the entire non-spec codebase: its own declaration at `configuration.ts:84`.** It is not
that the flag is unusual — it is that four siblings demonstrate the pattern it alone does not
implement. *Severity Low, Confidence Confirmed.* Fix: add an `objectivesEnabled()` predicate on
whichever service owns objectives and consult it, or delete flag and env var together.

**Withdrawn · "Two flag-reading conventions coexist" (Run 1 item 1, carried through Run 2).**
There is one convention. My evidence for a second was six grep hits on `COACHING_ENABLED` /
`CONFIDENCE_ENABLED` / `CONTEXT_ENABLED` inside service files — **all six are comments**, and my
follow-up query used the wrong key shape (`coaching.enabled` rather than `app.coachingEnabled`), so
it returned zero and I read that as absence. Two compounding errors producing a finding that was
never there.

**Withdrawn · C-6, the "dead" `CompanyStage` enum.** The column IS written:
`auth.service.ts:826` sets `orgUpdate.companyStage` from `update-profile.dto.ts:11`, which validates
it with `@IsEnum(CompanyStage)`, and `client/src/api/auth.ts:41` carries it in the payload. My Run 3
method scanned for enum **value** names (IDEA, PRE_REVENUE...) and those never appear in code
*because the values arrive as validated strings from the client*. **That is a systematic blind spot
in the Run 3 enum scan**, and it applies equally to any other enum populated from user input — so
`EvidenceType.UNANCHORED_RECALL` and the never-emitted `UsageEventType` values in C-5 should be
re-checked the same way before anyone acts on them. What remains true and smaller: **no UI field
sets `companyStage`**, so it is write-capable and never written in practice. Downgraded from "dead
enum" to "an unused profile field with a live write path".

**Run 7 · Methodological finding, recorded because it affected four separate conclusions.**
Grep matched a COMMENT rather than code four times in this audit: the duplicate `@Get(':id')`, the
controller-collision suspicion, the flag conventions above, and once while writing a guard test
earlier the same day. This codebase carries unusually long explanatory comments that quote code
verbatim — which is a virtue for a reader and a trap for a scanner. **Any source-level assertion or
scan against this repository must strip comments first.** The ledger's own guards now do.

**Run 8 · C-10 · 37% of the test suite proves the shape of the code, not its behaviour — and 67 of
those tests can be satisfied by a comment.** *Severity High (as false confidence). Confidence
Confirmed.*

**Evidence.** 291 spec files. **110 of them call `readFileSync` on a source file and regex its
text**; 181 execute code or render a component. Of the 110, only **43 strip comments before
matching** — so **67 specs can pass because a sentence in a comment matched, with the code they
claim to pin absent or reversed.** That is not hypothetical: Run 7 recorded four separate occasions
in this one audit where a grep matched a comment quoting code verbatim, and one of them occurred
inside a guard test being written that day, which reported green for the wrong reason until it was
redone.

**Why it matters.** These are not incidental tests. They are the repository's *chosen* mechanism for
pinning hard-won behavioural lessons — the file names say so plainly
(`a-hidden-link-is-not-a-permission`, `the-count-matches-the-report`,
`the-password-step-must-not-swallow-the-ground`). Each was written after a real defect, precisely so
it could not return. A source-assertion spec that a comment can satisfy **does not prevent the
regression it was written for**, and its name and prose make it look like the strongest guard in the
suite. This is the single largest source of false confidence in this codebase.

**Failure scenario.** Someone refactors a guarded behaviour out of existence but leaves the long
explanatory comment above it — which is exactly what a careful engineer in this codebase would do,
because the comments are treated as documentation. The spec still matches text inside that comment
and stays green. The defect the spec exists to prevent ships, with a passing test named after it.

**Recommended action.** (1) Add comment-stripping to all 67 — mechanical, and the 43 already-correct
specs supply the idiom to copy. (2) Where the behaviour is reachable at runtime, replace the source
assertion with a behavioural one; source assertions are legitimate only when the fault was *where
code lived* rather than what it did, which is true of a minority of them. (3) Treat a passing
source-assertion spec as weaker evidence than a passing behavioural one when deciding whether
something is safe to change.

**Affected areas.** Every finding in this ledger that was "bite-checked" against a source-assertion
guard, including ones I wrote today. The bite-check itself remains the mitigation that works: break
the code, confirm red. A guard that cannot be made to fail is not a guard.

**Run 8 · Observations.** The suite's behavioural half is substantial (181 files, 1734 API + 739
client assertions) and the persona harness drives the real product end to end, which is why tonight
it caught two regressions that every unit test missed. **Not assessed this run:** whether any
authorization or tenant-isolation test exists at all, mocking depth, tests of obsolete
implementations, and coverage of the failure modes named in Run 6 — none of which this run examined.

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

**Run 7:** no competing implementation found in the areas examined. The two suspected ones both
dissolved on inspection — one convention for flags, not two; two controller classes sharing the
`grounds` mount with no colliding path. The one real duplicate this session, two pricing services
built the same day, was resolved by deletion before this audit began. **Not examined:** the
`groundwork_local_test` vs `e2e` harness overlap, god-module risk in `grounds.service.ts` (2200+
lines) and `conversation.service.ts`, circular dependencies, and dead routes among the 179.

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

**Run 6, partial.** One High: C-9, the check-then-act race on the Stripe credit path with no unique
constraint behind it. Telemetry failures are swallowed by design at six sites.

**NOT assessed:** concurrency on check-in completion (two parties finishing simultaneously, which
drives report release), the seven cron carriers' actual registration and overlap behaviour, Gemini
timeout and partial-response handling, retry limits anywhere, dead-letter handling, service restart
mid-synthesis, and reconciliation of any kind. Recorded original recon note below. Recon note: magic-link email is a single point of failure for
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

# RUN 9 — CROSS-SYSTEM FINDINGS

*Run 9 adds little new scanning by design. Its value is in what only appears when the runs are read
together.*

## Resolved: the background processes are real

`ScheduleModule.forRoot()` is registered at `app.module.ts:43` and all five cron-carrying classes
are provided in their own modules. Run 1's open question — "are the 7 cron carriers actually firing"
— resolves **positively**. **Consequence: C-7 is confirmed LIVE rather than latent.** The unverified
sweep runs daily, so the only hard-delete path in the codebase is genuinely executing, and its
failure to check for billing data is a present risk rather than a theoretical one. This is the one
place where a cross-system check *raised* confidence in a finding rather than lowering it.

## Failure chain 1 · `BillingEvent` is treated as bookkeeping, not as a record of account

Three findings, arrived at independently in Runs 3, 4 and 6, all land on one table:

| | |
|---|---|
| **C-4** | It never records `SUBSCRIPTION_FEE` — the actual revenue model |
| **C-9** | It can double-count, because `stripeInvoiceId` has no unique constraint |
| **C-7** | It is cascade-deleted with its organisation by a live daily cron |

Together: **the in-product financial record is incomplete, can be wrong, and can vanish.** No single
fix addresses that, and fixing any one in isolation produces a table that is still untrustworthy.
The root cause is not three bugs — it is that this table was built as incidental logging and is now
being asked to serve as the record you would reconcile against Stripe or show a disputing customer.
**Sequence these three as one piece of work, not three tickets.**

## Failure chain 2 · C-10 decides whether anything else stays fixed

67 source-assertion guards can be satisfied by a comment. Those guards are the mechanism this
repository uses to stop known defects returning — including the five fixed earlier today and several
pinned by this very audit. **So C-10 is not a test-quality item; it is the durability of every other
remediation in this ledger.** A functional fix protected by a guard that a comment can satisfy is a
fix with a decay date. In Run 10's ordering, comment-stripping the 67 belongs **above** most
functional work, despite being the least interesting task in the list.

## Failure chain 3 · C-8's blast radius crosses four modules, not one

The unsigned WhatsApp webhook is not an endpoint problem. Injected text enters
`conversation.sendMessage` **as the impersonated user**, is persisted as their `RecordEntry`, is fed
to synthesis, and surfaces in the shared report their manager reads as that person's own account.
`whatsapp -> conversation -> RecordEntry -> reports`. Any assessment of this that stops at "an
unauthenticated endpoint" understates it: the product's central privacy promise is broken at the far
end of the chain, where nobody would think to look.

## The root cause under almost every confirmed finding

**Every confirmed finding in this audit, and every one of the five UI defects fixed earlier the same
day, is two things that should agree and do not.**

- A label and the value beside it ("Reports ready 0" above a ready report; "Party 2"; "Both" above three cards)
- A list payload and a detail payload ("No read yet" against "4 agreed, 2 still open")
- An enum and what is ever emitted (C-4, C-5)
- A client and the routes that exist (C-1, and my own dead pricing client)
- A flag and its readers (C-2)
- A guard's text and the code it claims to pin (C-10)
- A check and the constraint that should back it (C-9)
- A deletion predicate and the data it should consider (C-7)

Not one confirmed finding was a broken request, a crash, or a wrong algorithm. **The defect class in
this codebase is disagreement between two places that each look correct alone.** That has a direct
implication for remediation: the highest-yield work is *reconciliation checks* — mechanical
comparisons between two sources that must match, of the kind the pricing cents-to-dollars guard now
performs — rather than more feature-level testing. Three such checks would have caught six of the
nine confirmed findings.

## Where earlier runs were wrong

Seven findings were withdrawn, **all of them my own error, none because the code changed.** Four
came from grep matching a comment; one from scanning enum values for an enum populated by validated
user input; one from querying the wrong config key shape and reading zero as absence; one from
grepping `.create` and missing `upsert`. **The methodology, not the codebase, produced most of this
audit's noise.** Any future run here should strip comments first, check both the
value-name and the field-name form of an enum, and confirm a negative result with a second query
shape before recording it.


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

---

# RUN 10 — FINAL SYNTHESIS & REPAIR PLAN

*No code was modified in any of the ten runs. Nine confirmed findings, seven withdrawn (all
methodology errors of mine, none because the code changed).*

## Critical failures

**C-8 · The WhatsApp webhook accepts unsigned requests and treats a caller-supplied phone number as
proof of identity, then writes into that person's private check-in as them.** Live in every
deployment; the admin toggle does not gate it; no `X-Hub-Signature-256` check exists anywhere in the
repo. Blast radius reaches the manager's report.

## High-risk bugs

**C-9 · Stripe credit path is a check-then-act race with no unique constraint behind it.** Double
credit and duplicate ledger rows on concurrent redelivery. Fails in both directions — gives sessions
away and misreports revenue.

**C-10 · 67 source-assertion guards can be satisfied by a comment.** Determines whether every other
fix in this ledger survives.

**C-1 · Prompt drafts: a live admin screen calls three routes that do not exist.** Silent 404,
`retry: false`, always-empty draft. The screen that changes the conversation engine's behaviour
cannot save a draft.

## Broken / unwired functionality

- **C-1** (above) — the only 👻 in the matrix.
- **C-3** — `pricingAdminApi`, a dead client of mine calling routes deleted in today's merge. 🗑

## Security findings

- **C-8** (Critical, above).
- **No IDOR found** in the handler-scoping scan; six unscoped handlers all correctly platform-admin
  guarded, verified individually. **This does not establish that services honour the ownership key
  they receive** — and C-7 is precedent for that exact gap.
- Resend webhook verifies and fails closed. Stripe's is annotated as verified, **not independently
  re-verified.**

## Data integrity findings

- **C-7 · The one hard-delete path in the codebase never looks at money.** Confirmed live in Run 9.
- Schema posture is destructive by default: 40 cascades to 10 non-cascade rules.
- Constraint counts look healthy (32/11/34) but **not one was traced against a dependent query.**

## Reliability / concurrency findings

- **C-9** (above). Telemetry failures silent by design at six `.catch(() => undefined)` sites.
- **Unassessed:** simultaneous check-in completion (which drives report release), cron overlap,
  Gemini timeouts, retry limits, dead-letter handling, restart mid-synthesis, reconciliation.

## Architectural problems

- **`BillingEvent` is built as logging and used as a record of account** — the root cause beneath
  C-4, C-7 and C-9.
- **`grounds.service.ts` exceeds 2200 lines** — god-module risk, unexamined.
- No competing implementations found. Both suspected ones dissolved on inspection.

## Dead / duplicate systems

- **C-2** · `objectivesEnabled`, the only one of five flags not following the codebase's own
  convention. **C-3** · the dead pricing client. **C-5** · six never-emitted usage events — *evidence
  requires re-checking per Run 7's blind spot before action.* Nothing else should be deleted on this
  audit's word: the `CompanyStage` "dead enum" was withdrawn precisely because deletion looked safe
  and was not.

## Test gaps

- **C-10** (above). No authorization or tenant-isolation test was looked for. The persona harness
  caught two regressions tonight that all 2,473 unit assertions missed.

## Simplification opportunities

Deliberately none proposed. Every simplification candidate this audit surfaced turned out to be live
on inspection, and the protocol's rule about not deleting before tracing earned its place four times.

---

## Dependency & Failure Map

| Component | Depends on | Failure effect | Recovery | Blast radius |
|---|---|---|---|---|
| Check-in conversation | Gemini/Vertex | Core product stops | none automatic | every active ground |
| **All authentication** | Resend | **Nobody can sign in or be invited** | none — magic links *are* the auth | whole platform |
| Checkout + pricing | Stripe + `pricing_plans` row | 500 on `/billing/pricing`; cannot price a plan | migration | all new revenue |
| Report release | `CHECK_IN_COMPLETED` event → `reports.listener` | reports never release | none | affected grounds |
| Daily sweep | `ScheduleModule` (confirmed registered) | orgs hard-deleted without billing check | **irreversible** | one org per occurrence |
| Everything | PostgreSQL | total | — | total |

## Root Cause Map

**One cause underlies nine of nine confirmed findings:** two places that must agree, each correct
alone, with nothing reconciling them. Label vs value; list payload vs detail payload; enum vs
emission; client vs route; flag vs reader; guard text vs guarded code; check vs constraint; delete
predicate vs data.

**Therefore the highest-yield remedy is not feature testing — it is reconciliation checks.** Three
would have caught six of the nine: (a) client API calls vs declared routes, (b) enum values vs
emission sites, (c) source-assertion guards vs comment-stripped source.

## Ordered remediation plan

| # | Work | Why here | Retest |
|---|---|---|---|
| 1 | **C-8** verify `X-Hub-Signature-256` over the raw body, fail closed; gate `receive()` on `isEnabled` | Security, live, privacy promise | persona suite; forge a POST and confirm rejection |
| 2 | **C-7** add `billingEvents`/`stripeCustomerId`/`subscriptionStatus` to the sweep predicate | Irreversible data loss, live daily | sweep spec + a seeded org with billing |
| 3 | **C-10** comment-strip the 67 guards, copying the 43 correct ones | Nothing below stays fixed without it | bite-check each: break, confirm red |
| 4 | **C-9** `@unique` on `stripeInvoiceId` + treat violation as idempotency signal | Money correctness; needs migration | concurrent duplicate-delivery test |
| 5 | **C-1** implement the three draft routes or remove the affordance | Broken core admin function | drive the prompts screen |
| 6 | **C-4** write `SUBSCRIPTION_FEE`; decide on the two never-written fee types | Financial record — do with #2 and #4 as one `BillingEvent` piece | webhook + ledger read |
| 7 | **C-2** consult `objectivesEnabled` or delete it; **C-3** delete the dead client | Cheap, removes traps | typecheck + suite |
| 8 | **C-5** re-check per Run 7's blind spot, then emit or delete | Evidence not yet sound enough to act | — |
| 9 | Reconciliation checks (a), (b), (c) from the root-cause map | Prevents the whole defect class | bite-check each |
| 10 | Unaudited areas below, before any further feature work | | |

---

# COMPLETION STATEMENT

**Thoroughly audited:** repository architecture; client↔API wiring (mechanical, 179 routes vs 139
calls); enum declaration-vs-use across all 24 enums *(with the Run 7 blind spot noted)*; cascade
topology and every hard-delete call site; the unverified sweep line by line; external entry points;
handler-level ownership scoping; scheduler registration; test-suite composition.

**Partially audited:** security — entry points and handler scoping done, query-level enforcement and
`@Roles` consistency not; reliability — the money path only; data integrity — constraints counted,
never traced.

**Could not be verified without runtime or production access:** whether Stripe's signature check
holds in production; real concurrency behaviour; whether crons overlap under load; Gemini timeout
handling.

**Remains uncertain:** the check-in conversation engine internals — **the product's core and the
least examined thing in this ledger**; the board; `/grounds/:id/p`; `/org/members`; `/settings`;
dates and timezones; permission consistency across 179 routes; the ground state machine's allowed
transitions; orphan records; migration-vs-application drift; the
`RecordEntry`/`ConversationTurn` lifecycle; god-module risk in `grounds.service.ts`; the two test
harnesses' overlap.

**This codebase has NOT been fully audited.** Ten runs were attempted; roughly half the system was
examined with rigour. The single most important thing left undone is tracing the check-in
conversation end to end, because it is where the product's value and its privacy promise both live.

---

# CORE SYSTEM AUDIT

*A second audit, commissioned because Run 10's completion statement identified the check-in
conversation engine as the product's core and the least examined area. The ten-run audit above is
authoritative history and is not modified. Evidence standard for this audit is stricter: a search hit
is not evidence, and nothing is Confirmed without an execution-path trace read from source.*

**Classification used:** `search hit` · `plausible concern` · `highly likely` · **`CONFIRMED
execution-path defect`**.

---

## CORE RUN 1 — Check-in conversation engine

### Entry points, enumerated from source

Six public methods on `ConversationService`: `open` (368), `sendMessage` (539), `complete` (1551),
`decline` (2343), `startClarificationSession` (2383), `startSelfCorrectionSession` (2426). Reached
from three surfaces: the authenticated SPA via `check-ins` and `grounds` controllers, and the
WhatsApp inbound webhook.

### Identity resolution — TRACED, and it is sound

Two shapes, both correct:

**checkInId-based** (`open`, `sendMessage`, `complete`, `decline`, and five internal helpers — nine
call sites) all funnel through `loadOwnedCheckIn` at line 2541. Read in full: it loads the check-in
with its participant and throws `ForbiddenException` unless
`checkIn.participant.userId === requestingUserId`. There is no branch, no flag, and no admin bypass
in that method. **The engine cannot be made to read or write another party's conversation through a
checkInId.**

**groundId-based** (`startSelfCorrectionSession`, traced in full at 2426; `startClarificationSession`
same shape) resolves the actor with
`groundParticipant.findFirst({ where: { groundId, userId: requestingUserId } })` and throws Forbidden
if absent. **It derives the participant from the authenticated user and never accepts a
caller-supplied participantId.** Every subsequent query is scoped to that derived `participant.id`.

**Finding: none. The engine's authorization spine is correct, and this is a deliberate negative
result.** Run 10 listed this area as uncertain; it is now traced. What *would* have been a defect —
an entry point trusting a participant id from the request — does not exist.

### Conversation isolation and historical context — TRACED

Prior-session context is retrieved with
`where: { participantId: checkIn.participantId, sessionNumber: { lt: checkIn.sessionNumber }, status: COMPLETED }`
(conversation.service.ts ~766). Scoped to **the same participant only**, not the ground. A party's
own earlier sessions are the only history that reaches their prompt. This is the single most
privacy-critical query in the product and it is correctly scoped.

### CONFIRMED · This audit changes how C-8 should be understood

C-8 is not a flaw in the engine. The engine's gate is sound; **C-8 defeats it by supplying a
legitimate `requestingUserId`.** `whatsapp.controller.ts` derives `user` from an unverified,
caller-supplied phone number and then calls `conversation.open(openCheckIn.id, user.id)` /
`sendMessage(..., user.id, text)`. `loadOwnedCheckIn` then correctly confirms that this check-in
belongs to that user — and it does. The authorization check passes because the *identity handed to it
is already forged*.

**This is an execution-path confirmation of the Run 9 blast-radius claim, which was previously
inference.** It also sharpens the remedy: the fix belongs entirely at the webhook boundary. No change
to the engine is required or would help, and hardening `loadOwnedCheckIn` would be wasted work.

### Not traced in Core Run 1 — stated so this run is not read as complete

Prompt/instruction construction contents and exactly what text is transmitted to Gemini; tool/function
execution if any; the extraction step that turns turns into `RecordEntry`; duplicate and replayed
message handling on `sendMessage`; what happens when context retrieval fails mid-conversation;
whether conversation state can attach to the wrong ground. **The privacy question "what is sent to
the external model provider" is therefore still open** and is the most important item remaining in
this audit.

---

## CORE RUN 2 — Privacy information-flow audit

### What is actually sent to Gemini — TRACED, and it is participant-scoped

Core Run 1 left this as the most important open question. The assembled prompt is built at
`conversation.service.ts:1068` from thirteen components. Each was traced to its query:

| Prompt component | Source query | Scope |
|---|---|---|
| conversation history | `conversationTurn.findMany({ where: { checkInId } })` (~702) | **this check-in only** |
| `PRIOR_SESSION` in intake | `checkIn.findMany({ participantId, sessionNumber: { lt }, status: COMPLETED })` (~766) | **this participant's own earlier sessions** |
| `dynamicContext` | built with `{ groundId, participantId: checkIn.participantId }` | participant-scoped |
| `notesBlock` | `participantNote.findMany({ where: { participantId: checkIn.participantId, carriedIntoCheckInId: null } })` | **notes addressed to this person** |
| `personTurnCount` | `conversationTurn.count({ where: { checkInId } })` | own check-in |
| `docContext` | `groundDocument.findMany({ where: documentWhereFor(groundId, { participantId, isLead }) })` | **explicit visibility function** |
| systemPrompt / styleBlock / roleProbe / coaching / correction contexts | prompt library + own state | no other party's content |

**Finding: no cross-participant leakage in the prompt-assembly path.** Not one component reaches
another participant's answers, turns, or derived content.

The single place ground-level data legitimately enters is `documentWhereFor`, and it is a deliberate,
reviewed decision rather than an oversight — the code carries a comment recording that it previously
asked only for the reader's own `participantId` and was **widened on purpose** so an OPEN document,
the lead's brief or a grant could be seen. That is a visibility gate with a rationale attached, which
is the correct shape for this. It is also the function gated by `contextEnabled()`, one of the four
flags Run 7 confirmed live.

**Classification: CONFIRMED (as sound). This is the strongest negative result in either audit** — the
product's central privacy promise holds on the path that matters most, and it holds structurally,
through query scoping, not through instructions to the model.

### Information-flow map

| Category | Source | Storage | Processing | Allowed recipients | External | Notes |
|---|---|---|---|---|---|---|
| Raw check-in answers | participant turns | `ConversationTurn` (unencrypted) | extraction → `RecordEntry` | the author; synthesis | **Gemini** | privacy screen states this plainly |
| Own prior sessions | `CheckIn`/`RecordEntry` | as above | prompt context | the author only | **Gemini** | verified participant-scoped |
| Notes | `ParticipantNote` | own row | prompt context | addressee only | **Gemini** | verified |
| Documents | upload | `GroundDocument` | prompt context | per `documentWhereFor` | **Gemini** | gated + flagged |
| Derived record | extraction | `RecordEntry` | synthesis | author; shared report | **Gemini** | own words may appear; statements about others must not name attribution |
| Reports | synthesis | `Report` | reveal/activation | parties per activation; lead; org admin | **Gemini** | |
| Analytics | `usage.emit` | `UsageEvent` | admin screens | platform admin | no | **6 of 11 types never emitted (C-5)** |
| Logging | `logger` | stdout | — | operators | no | **not audited for PII content** |

### Indirect-leakage question — PARTIALLY ANSWERED

The prompt path is clean. **What this run did NOT trace, and where indirect leakage would now most
plausibly live:** the extraction step that writes `RecordEntry` (does it ever record a statement
*about* another participant in a form that later names them?); the synthesis prompt, which by design
sees every party and is the one place cross-party content is *meant* to combine; notification email
bodies; and whether any log line carries answer text. **The privacy promise printed for participants
is specifically that statements about other people never appear and never say who said what — that
guarantee lives in synthesis, which this run did not examine.**

`plausible concern` (not promoted): logging. `logger.error`/`warn` calls exist throughout the
conversation path and no run has checked whether any interpolates participant content.

---

## CORE RUN 3 — Ground state machine

### The real lifecycle, from write sites

| State | Written at | Trigger | Reachable? |
|---|---|---|---|
| `AWAITING_APPROVAL` | `grounds.service.ts:172` (ternary) | non-ADMIN creates a ground | ✅ |
| `AWAITING_LEAD` | `:336` | admin creates a ground *for* a lead | ✅ |
| `OPEN` | `:172` (ternary, ADMIN creator), `:1992` (admin approves) | creation or approval | ✅ |
| `AWAITING_PARTIES` | `:486` (ternary), `:1640` (`addParticipant`) | a participant exists | ✅ |
| `ACTIVE` | `:1809` (`activate`), `reports.listener.ts` on all-parties-through | billing activation or report release | ✅ |
| `PAUSED` | `:2648` | pause action | ✅ |
| `STALLED` | `grounds.cron.ts:61` | full period elapsed, unresolved | ✅ scheduled |
| `CLOSED` | `:2026`, `grounds.cron.ts:553`, `resolution.service.ts:216` | decline, cron, **and resolution** | ✅ |
| `REPORT_READY` | **nowhere** | — | ❌ unreachable *(known; schema documents it)* |
| `RESOLVED` | **nowhere** | — | ❌ **unreachable — newly found** |

### CONFIRMED · C-11 · `RESOLVED` is declared, read in four places, and never written

*Severity Medium. Confidence **Confirmed execution-path defect**.*

**Evidence.** `GroundStatus.RESOLVED` appears only in read or comparison positions:
`grounds.cron.ts:17` (a `TERMINAL` list), `resolution.service.ts:48` and `:162` (guards), and
`reports.service.ts:380`. **No assignment exists anywhere in non-spec source.** The resolution flow
that should produce it instead writes `CLOSED`: `resolution.service.ts:216` sets
`{ status: GroundStatus.CLOSED, resolvedAt: now }`.

**Method note, because this run nearly produced a false finding.** My first scan reported
`AWAITING_PARTIES`, `AWAITING_APPROVAL` and `RESOLVED` as unwritten. Two of those were wrong — both
are written by **ternary** assignments (`:172`, `:486`) that my pattern could not see. I re-ran with
a looser pattern before recording anything. Only `RESOLVED` and `REPORT_READY` survive as genuinely
unwritten. This is the fifth time in the combined audit that a first-pass scan produced a false
positive, and the second time re-checking prevented one from being recorded.

**Why it matters.** Two things that must agree, with nothing reconciling them — the audit's root-cause
pattern, in the state machine:
1. `reports.service.ts:380` computes `const isClosing = closing?.status === GroundStatus.RESOLVED || !!closing?.resolutionState`.
   **The first clause can never be true.** It works only because of the `||` fallback, which is
   exactly why nobody noticed. Anyone deleting the fallback as redundant would silently break the
   closing-round report.
2. A resolved ground is **status-indistinguishable** from one closed by admin decline or by the
   stalled-ground cron. The only discriminator is the `resolvedAt` timestamp, which no status query
   consults. Any future "how many grounds reached resolution" answer read from `status` returns zero.

**Recommended action.** Either write `RESOLVED` at `resolution.service.ts:216` (and let `CLOSED` mean
closed-without-resolution), or delete `RESOLVED` from the enum and remove the dead clause at
`reports.service.ts:380`. **Do not simply delete the `||` fallback.** Decide which of the two the
product means; both are defensible, silence is not.

**Affected areas.** `resolution.service`, the closing-round report path, `grounds.cron`'s TERMINAL
list, and any future reporting on resolution rates.

### Not examined in Core Run 3

Transition *legality* — nothing here verifies that only lawful transitions occur, e.g. whether a
`CLOSED` ground can be re-opened, whether `PAUSED` can be reached from a terminal state, or whether
two concurrent writers can move a ground twice. Side effects per transition (notifications, billing)
were mapped only where earlier runs had already touched them. Stuck-state analysis was **not** done:
`AWAITING_LEAD` in particular is a plausible stuck state if a lead never confirms, and nothing in this
run checked whether anything rescues it. `plausible concern`, not promoted.

---

## CORE RUN 4 — Permissions matrix

### Enforcement across all 179 routes

| Enforcement | Routes | Notes |
|---|---|---|
| `jwt-only` (authenticated, no role check) | **122** | ownership enforced *inside* the service, not by decorator |
| `PUBLIC` | **29 (a floor — see limitation)** | |
| `platform-admin` | **28** | class-level on `admin`/`prompts`, per-method on `feedback` |

### Same resource, different enforcement — ONE candidate, and it is correct

`/feedback`: `POST` is `PUBLIC`, `GET` is `platform-admin`. Anyone may submit feedback; only a
platform admin may read it. **Correct by design, not a finding.** No other path in 179 routes carries
inconsistent enforcement between its verbs.

### The 29 public routes, categorised

- **13 `/auth/*`** — login, register, verify-email, forgot/reset/set-password, the Google flow,
  `methods`, `validate-token`, `entry-save`. All pre-authentication by necessity.
- **10 `/entry/*`** — the anonymous pre-account chat: `chat`, `opener`, `faq`, `classify-intent`,
  `report`, `onboard`, `draft`, `join-preview`, `join-accept`, `join-commit`.
- **2 `/participants/*`** — `invite` and `accept`, both token-bearing invite links.
- **2 webhooks** — `/billing/webhook` and `/webhooks/resend`, both signature-verified.
- **`/billing/pricing`** — deliberately public so the pricing page renders pre-account.
- **`POST /feedback`**.

Nothing in that list is public that should not be. **The absence of a finding here is the result.**

### LIMITATION IN MY OWN SCAN — stated because it changes the number

**The 29 is a floor, not a total.** My scan detected `@Public()` only in a method's decorator block.
`WhatsAppController` carries `@Public()` at **class level** (`whatsapp.controller.ts:16`, immediately
above `@Controller('webhooks/whatsapp')`), so **its two routes were not counted.** True public count
is at least 31. Any future permissions sweep here must check class-level decorators for `Public` as
well as for guards — my script checked class level for `PlatformAdminGuard` and `@Roles` but not for
`@Public`, which is precisely the asymmetry that hides an exposed route.

### C-8, reinforced by its own source comment

The comment directly above that class-level `@Public()` reads: *"Signature-256 verification before
going live with real traffic."* **The missing verification is a known, recorded pre-launch task, not
an oversight.** That raises rather than lowers confidence in C-8 — someone identified it — and it means
the remediation has a documented author-intent to point at.

### Not done in Core Run 4 — the deeper half

122 routes are `jwt-only`, meaning **ownership is enforced inside the service rather than by any
decorator.** This run verified that id-taking handlers *pass* an ownership key (Run 5 of the original
audit) and that the engine's own gate is sound (Core Run 1). It did **not** verify, for those 122,
that each service *uses* the key in its query. That is the single largest unverified surface in either
audit: `plausible concern` across 122 routes, with two Confirmed precedents for the gap being real
(C-7, where a predicate ignores data it holds; and C-8, where a correct gate is defeated by a forged
input). Also not done: whether `@Roles` is *needed* on any of the 122 (a member reaching an
admin-only action), and mutation-vs-read asymmetry within a single service.

---

## CORE RUN 4b — Query-scoping verification (the surface Core Run 4 flagged as largest)

**Result: 35 service methods take an `organizationId` parameter and query Prisma. All 35 use it
correctly.** 33 place it inside a `where` clause; 2 place it in a `create`'s `data`, which is how a
write scopes itself. Both of those — `usage.service.emit` and
`intelligence.service.rollupAnonymised` — were flagged by my pattern only because it searched for
`where:`, and both were **read individually and confirmed correct**. Comments were stripped before
matching, per the ledger's standing rule.

**Classification: CONFIRMED (as sound).** The `plausible concern` raised across 122 `jwt-only` routes
in Core Run 4 is **substantially reduced**. Combined with Core Run 1 (the engine derives identity from
the authenticated user and never trusts a caller-supplied participant id) and the original Run 5
handler scan (every org-scoped id-taking handler passes an ownership key), org isolation now has
evidence at three layers: the handler passes the key, the service places it in the query, and the
engine resolves identity independently.

### The residual gap, stated precisely

This scan can only see methods that **receive** an ownership key. **A method that should take one and
does not cannot be caught by it** — it has nothing to look for. That is the honest remainder, and it
is the same blind spot that made C-7 invisible: the sweep's predicate does not fail to *use* data it
receives, it fails to *ask* for data it should. Closing this properly requires enumerating, per
sensitive table, which reads must be org-scoped and checking each — which this audit has not done.

**Downgrade recorded:** Core Run 4's "largest unverified surface in either audit" is no longer
accurate as written. The largest remaining unverified surface is now **synthesis** — the one path that
by design combines every party's content, and which carries the explicit promise to participants that
statements about other people never appear and never say who said what. Core Run 2 verified the
prompt path and explicitly did not verify this.

---

## CORE RUN 5 — Derived views, taking the report first

### My hypothesis was wrong, and the correction is the finding

**I expected:** synthesis receives every party's entries plus per-party labels, and the guarantee
"it never says who said what" is enforced only by the prompt instruction at `reports.service.ts:89`
("NEVER NAME ANYONE AND NEVER QUOTE ANYONE"). Under the standing rule that anything derived from a
private account must be stripped **at the read in code, never by prompt instruction alone**, that
would have been a High finding.

**What is actually there is a two-part structural design**, traced at `reports.service.ts:1640-1672`:

1. **Synthesis persists LABELS, not names.** The stored report body is label-based. Names are not in
   the persisted artefact.
2. **Names are substituted at read time, per viewer**, by a `t()` translation walked over the report's
   text fields — while `NEVER_NAMED = new Set(['label', 'participantLabel'])` deliberately leaves the
   label *keys* raw.

The reason the label keys must stay raw is the important part, and the source states it: `own-reads-only.ts`
filters per-person rows by `row.label === viewerLabel`, **matching on the raw label**. So *which rows a
viewer sees* is enforced structurally, by identifier comparison — not by instruction.

**Classification: the row-visibility control is CONFIRMED structural.** My hypothesis is withdrawn.

### CONFIRMED · C-12 · A documented silent-failure mode guards the report's per-person rows

*Severity Medium. Confidence **Confirmed** (the fragility; the source documents the mechanism).*

The same comment records what happens if the two parts are ever mixed: put a name into `.label` and
`row.label === viewerLabel` **stops matching — and it does not fail loudly. It silently keeps the wrong
rows, and those rows are other people's quality reads.**

So the privacy of per-person report rows rests on a **string comparison whose failure mode is silent
disclosure of other participants' content.** There is no assertion, no invariant check, and no test
named in this path that would catch a label becoming a name. The protection is real and correctly
designed; what is missing is anything that *notices* when it stops working. This is the audit's
root-cause pattern in its most consequential location: two things that must agree — `row.label` and
`viewerLabel` — with nothing verifying they still do.

**Recommended action.** Add an invariant at the read boundary: assert that every `label`/`participantLabel`
value matches the label format and contains no name from the ground's roster, and fail closed. Cheap,
and it converts a silent leak into a caught error. **Do not** restructure the label design — it is sound.

**Affected areas.** `own-reads-only.ts`, the `t()` translation path, the board (same label vocabulary),
and `engagement` / `inferences`, which are walked by `walkTextOnly`.

### Still instructional, and worth stating separately

The prohibition on the report **body** naming or quoting anyone (`reports.service.ts:89`, plus rules 6,
13 and 14) remains **prompt instruction**. Labels being structural protects *row visibility*; it does
not stop a model writing a name it inferred into prose. **No post-generation validation of the body
against the roster was found.** `plausible concern`, not promoted — the model is given labels rather
than names, so it has less to leak, and confirming a defect would need generated output rather than
source.

### Not done in Core Run 5

The board's own value provenance, persisted-vs-calculated, staleness, and deleted-entity behaviour;
whether two UI surfaces compute the same concept differently (the original audit found exactly that
twice — the counter and the read). Those remain open.

---

## CORE RUN 6 — Dates, schedules and timezones

### Scheduling is sound — all 17 crons pin UTC

Every `@Cron` in the codebase passes `{ timeZone: 'UTC' }` — 9 in `grounds.cron`, 2 in `entry.cron`,
and one each in `patterns.cron`, `intelligence.service`, `code-expiry.scheduler`, `remind.service`
and two in `reports.service`. **No cron depends on the server's timezone, and none is exposed to DST
ambiguity in its firing time.** The repo's two existing specs (`cron-timezone.spec.ts`,
`all-crons-timezone.spec.ts`) exist because this was already found and fixed once, and they are
holding. **Negative result, recorded as one.**

### CONFIRMED · C-13 · The visible "today" boundary is the server's timezone, while every cron is UTC

*Severity Medium. Confidence **Confirmed execution-path defect**.*

**Evidence.** `grounds.service.ts:672`:
`const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())`. Those are **local**
getters, so this is midnight in **the server process's** timezone — not UTC, and not the viewer's. It
feeds `checkInsToday` at `:781` (`completedAt >= todayStart`), which is rendered as **"Participant
sessions today"** on the grounds list.

**Why it matters — three ways.**
1. **It disagrees with the rest of the system.** Seventeen crons declare UTC explicitly; this one
   user-visible boundary silently uses server-local. Two places that must agree about when a day
   starts, with nothing reconciling them — this audit's root-cause pattern, again.
2. **It is deploy-dependent.** The same code returns different counts depending on the container's
   `TZ`. Nothing tests it, and the two timezone specs cover crons, not this.
3. **It is wrong for this product's stated market.** The marketing copy says *"Built first for African
   leaders"*; Lagos is UTC+1 and Nairobi UTC+3. On a UTC server, a check-in completed at 02:00 in
   Nairobi falls on the previous UTC day, so the counter reads **0 sessions today** to somebody who
   has just finished one.

**Failure scenario.** A Nairobi lead runs their check-in before the working day, opens the grounds
list, and is told no sessions happened today. That is the same defect class as the "0 of 3 checked in"
counter fixed earlier the same day: a value that contradicts what the user just did.

**Recommended action.** Decide the boundary explicitly and once. Either compute `todayStart` in UTC
to match the crons, or carry the viewer's timezone and compute per request — the latter is more
correct and more work. **Do not leave it implicit**, and add a test that pins whichever is chosen,
since neither existing timezone spec covers this path.

**Affected areas.** `checkInsToday` and the grounds-list stat tile; any other `getFullYear/getMonth/getDate`
day-boundary arithmetic (**not enumerated this run** — a `plausible concern` that others exist).

### Not done in Core Run 6

Timeline/`daysLeft` arithmetic uses millisecond maths (`+ timelineDays * 86_400_000`), which is
DST-agnostic and was **not** treated as suspect — but I did not verify every date field rendered to
users, reminder scheduling relative to `availableFrom`, billing period boundaries, or the sweep's
`cutoff` computation. No delayed-job or clock-skew scenario was tested.

---

## CORE RUN 7 — Data integrity and migration drift

### Migration state — asked the database, not the schema

`npx prisma migrate status` against the live dev database: **69 migrations found, "Database schema is
up to date"** — no drift, no failed or pending migration. **Bounded honestly: that is ONE database, a
recently-migrated development one.** It is evidence about this machine and says nothing about staging
or production, which is where drift actually accumulates and which I cannot reach from here. The
outstanding `pricing_plans` deploy step recorded earlier is precisely such a case: the code and the
schema agree, and a *deployed* database that has not run `migrate deploy` disagrees with both.

### HIGHLY LIKELY (not Confirmed) · Soft deletion is live, and most reads do not filter it

**Deliberately not promoted.** The evidence standard for this audit requires an execution-path
demonstration, and I do not have one.

**What is established.** `deletedAt` exists on exactly one model — `User` (`schema.prisma:279`). Soft
deletion **is live**: `users.service.ts:164` and `:257` both write `deletedAt: new Date()`. Of **60**
`prisma.user.find*` call sites, only **11** mention `deletedAt` within three lines.

**What is already protected, verified by reading:** authentication checks it in three places
(`auth.service.ts:160`, `:524`, `jwt.strategy.ts:33`), so a soft-deleted user cannot sign in; and
`users.service.ts` filters `deletedAt: null` on the org roster, the member count, per-user lookups and
the last-admin guard.

**What is not established.** I have not traced a specific user-visible surface that displays a
soft-deleted person. The ~49 unfiltered reads may all be lookups where deletion is irrelevant (sending
mail to a known id, counting for billing) or may include a participant roster. **Classification:
`highly likely issue`.** Promoting it on the 60-vs-11 ratio alone would repeat exactly the mistake
that produced eight withdrawals in the earlier audit.

**To confirm or dismiss:** enumerate the reads that feed a rendered list of people — ground
participants, board contributors, report parties — and check each. That is a bounded piece of work and
it is the correct next step, not a guess.

### Observations

`deletedAt` on a single model means **soft deletion is not a platform pattern but a User-only
feature.** Grounds, participants and reports have no soft-delete column, so "archived" does not exist
for them — consistent with the finding that only one hard-delete path exists at all (C-7). Nullable
assumptions, historical records created under earlier schemas, orphan-record counts and derived-state
staleness were **not** examined; the 69 migrations were not read individually, so a destructive or
data-losing migration in that history would not have been seen by this run.

---

## CORE RUN 8 — `grounds.service.ts`

### Verdict: LARGE BUT COHERENT. **No architectural change recommended.**

The run's instruction was not to recommend splitting merely because a file is big. Tested against the
specific harms, it does not exhibit them.

**Size, measured rather than eyeballed.** 2,942 total lines — but **41% is comments and blanks**, so
the executable content is **1,761 lines across 46 methods, about 38 lines per method.** My own earlier
note in the ten-run audit said "2200+ lines" and used that as a god-module flag; **that figure was
wrong and the inference from it was lazy.** The file reads as enormous because this codebase
deliberately keeps long explanatory comments recording why each decision was made — which Run 8 of the
first audit identified as a scanning hazard and which is, for a human maintainer, the opposite of a
problem.

**Authorization consistency — the harm that would have mattered most.** Every method that needs an
ownership key takes one. My scan reported 7 without; **all 7 were verified individually and none is a
gap:**

| Method | Why it is fine |
|---|---|
| `constructor` | n/a |
| `getJoinPreview` | serves the deliberately PUBLIC `/entry/join-preview`, keyed on a token |
| `isSessionReadyForReport`, `isReportReady`, `getSessionProgress` | internal computations keyed on groundId, called by listeners; return readiness, not another org's data |
| `getParticipantInviteUrl` | **takes `initiatorId`** and its first query is `findFirst({ where: { id: groundId, initiatorId } })`, throwing Forbidden — only the initiator can obtain an invite URL |
| `pauseGround` | **takes `adminUserId`**; an internal system action with no public controller route |

**Method-note, third occurrence:** my pattern searched for `organizationId`/`userId`/`requestingUser`
and missed `initiatorId` and `adminUserId` — **ownership keys under other names.** That is the third
time in this Core audit that a scan under-matched on naming (after ternary state assignments and
class-level `@Public`). Recorded because it means **any count I produce is a floor, and a "missing"
result here must always be read individually before it is believed.**

**Other harms tested.**
- *Conflicting responsibilities:* one coherent cluster — the Ground aggregate with its participants,
  check-in scaffolding, baseline, notes and lifecycle. No unrelated domain lives here.
- *Multiple sources of truth:* none found within the file. The two source-of-truth problems this audit
  did find (`BillingEvent`, the `RESOLVED` state) are elsewhere.
- *Transaction boundaries:* 5 `$transaction` blocks against 141 Prisma call sites. **Low in
  proportion**, but the writes that actually need atomicity — ground creation with its participant and
  first check-in, `addParticipant` — do have them. Recorded as an observation, not a finding: I did not
  enumerate every multi-write path in the file.
- *Authorization bypass:* none found. See table above.

**Recommendation: leave it alone.** Splitting it would move 46 coherent methods across new seams for
no demonstrated defect, and this audit has already shown that changes made to satisfy an abstract
concern here — rather than a traced one — are where the regressions come from.

---

## CORE RUN 9 — Cross-system reconciliation

Tested the root-cause pattern — *A and B must agree, nothing verifies A == B* — against the pairs
named for this run. One is a Confirmed defect. The others were checked and are recorded as sound.

### CONFIRMED · C-14 · `conversation state ↔ ground state`: `open()` enforces the ground's status and `sendMessage()` does not

*Severity **High**. Confidence **Confirmed execution-path defect**.*

**Evidence, both sides read in full.**
`conversation.service.ts:374-378` — `open()` loads the ground, defines
`OPEN_STATUSES = [OPEN, AWAITING_PARTIES, ACTIVE, REPORT_READY]` and throws
`'This ground is no longer accepting check-ins'` for anything else.
`sendMessage()` — the **entire 86-line body** contains **zero** references to `OPEN_STATUSES`,
`ground.status`, `GroundStatus`, `PAUSED`, `CLOSED` or `STALLED`. It guards ownership
(`loadOwnedCheckIn`), check-in completion, and the turn limit. **It never asks whether the ground still
accepts input.**

**Why it matters, and why High.** `PAUSED` is not a cosmetic state. The schema documents its purpose:
`PAUSED // temporarily paused (e.g. active legal proceedings detected)`. So the product has a legal-hold
state, and **the hold does not stop writing.** A participant already inside an `IN_PROGRESS` check-in
when a ground is paused, closed by an admin, or stalled by cron can keep sending messages; each is
persisted as a `ConversationTurn`, extracted into `RecordEntry`, and reaches synthesis and the shared
report. Only *starting* is blocked. Continuing is not.

**Failure scenario.** Legal proceedings begin. An admin pauses the ground — the one control the product
offers for exactly this. A participant with a session open keeps answering for another twenty minutes.
Those answers enter the permanent record and the report, after the hold was applied, with nothing
anywhere recording that they arrived post-pause.

**Recommended action.** Extract the `OPEN_STATUSES` check from `open()` into a shared private guard and
call it from `sendMessage`, `complete`, and the two session-starting methods. **Then decide the harder
question deliberately:** whether a paused ground should reject a mid-session message outright, or accept
it and mark it as arriving during the hold. Rejecting is safer; accepting-and-marking loses less of
somebody's work. Silence is the only wrong answer.

**Affected areas.** `sendMessage`, `complete`, `startClarificationSession`,
`startSelfCorrectionSession`, `RecordEntry` provenance, synthesis, and the meaning of `pausedAt`.

### Pairs checked and found sound

- **`report ↔ underlying responses`** — synthesis reads `RecordEntry` scoped per participant and
  persists labels, not names; row visibility is enforced by identifier comparison (Core Run 5). Sound,
  with C-12 as its missing *detector* rather than a missing control.
- **`schedule ↔ execution`** — `ScheduleModule.forRoot()` registered, all five cron classes provided,
  all 17 crons pin UTC (Core Runs 3 and 6). Sound.
- **`database ↔ external provider`** — the Stripe pairing is C-9 (dedupe with no unique constraint),
  already recorded; not re-litigated here.
- **`billing ↔ usage`** — two independent ledgers with no reconciliation between them, but **neither is
  authoritative for the other and nothing claims they agree**, so this is not the pattern. It is
  instead C-4 (billing incomplete) and C-5 (usage incomplete) separately.

### Not checked

`participant ↔ membership` — `GroundParticipant.userId` versus `OrganizationMembership` are two
representations of belonging, and I did not verify that they cannot disagree. `plausible concern`; the
cross-org participant fallback in `grounds.get()` suggests the case is at least anticipated.
`stored state ↔ derived state` beyond what Core Run 5 covered was also not examined.


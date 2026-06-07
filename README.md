# Groundwork

> Most people's best work never makes it into any record. Groundwork is where that changes.

Groundwork is a **contribution intelligence** platform. It builds an honest, two-sided record of a working relationship **before** the hard conversation — so that when the conversation comes, it rests on shared evidence instead of one person's feelings against another's.

The core unit is an **alignment ground**: one situation, two parties, working toward one defined decision. Each party checks in **independently** (never seeing the other's account); after two sessions each, the product generates a **report** showing where the accounts agree, where they diverge (the gap), and the one question that — answered honestly — moves things forward. Both parties read it **at the same moment**. When both confirm an end state, the ground **closes** and billing stops.

This repo mirrors the architecture and conventions of the `kulode` codebase, adapted to Groundwork's domain and with an **AI conversation engine** (Anthropic Claude) and **Stripe (USD)** billing.

## Monorepo layout

```
groundwork/
├── api/         NestJS 11 + Prisma + PostgreSQL  (the product API + AI engine)
├── client/      React 19 + Vite + Tailwind        (the app: check-in chat, grounds, report)
└── marketing/   Astro 5                            (landing site)
```

## Stack

| Layer | Choice |
|---|---|
| API | NestJS 11, TypeScript, Prisma 5, PostgreSQL |
| Auth | JWT (passport-jwt) + Google OAuth, bcrypt, magic-link invites |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) with prompt caching |
| Billing | Stripe (USD) — care fee subscription + metered scenario fee |
| Email | Resend |
| Client | React 19, Vite 7, Tailwind 4, TanStack Query, Zustand, react-hook-form + zod |
| Marketing | Astro 5 |

## The domain model (Prisma)

- **Ground** — the core unit. `scenario`, `moment`, `status` (OPEN → AWAITING_PARTIES → REPORT_READY → ACTIVE → RESOLVED → CLOSED), timeline, cadence, billing markers.
- **GroundParticipant** — links a person to a ground as INITIATOR or PARTICIPANT; willingness-gate answers; `notifiedAt` (never added silently).
- **CheckIn** / **ConversationTurn** — a session and its transcript. **Owner-scoped only** — never joined across parties.
- **RecordEntry** — structured data extracted from a check-in (success defs, commitments, asks). Belongs to the person.
- **Report** — the shared picture, agreements, divergences, central question. `releasedAt` set once, atomically, for both parties.
- **PatternDetection** — behavioural signals (D/B/K/E/R/F codes), never verdicts. Surfaces only after the **three-period rule**.
- **Resolution** — closes only when **both** parties confirm an end state.
- **PromptVersion / Outcome / OrgIntelligence** — the moat: versioned prompts, outcome data, anonymised cross-org learning.

## Architectural rules enforced in code (not just policy)

These come straight from the product doc and are the reason the product works:

1. **The record belongs to the person.** `ConversationService` only loads a check-in for its owner; a party can never read another party's transcript or record.
2. **The report releases simultaneously.** `ReportsService.release()` sets `releasedAt` once and emails both parties together.
3. **Nobody is added silently.** `GroundsService.addParticipant()` always sends an invite and stamps `notifiedAt`.
4. **Patterns are evidence, never verdicts.** `PatternsService` only surfaces plain-language observations after three consecutive periods; raw codes/scores are never returned by the API.
5. **The ground closes.** Resolution requires both confirmations; billing stops at `resolvedAt`.

## Billing model

- **Care fee — $20/mo per org.** A Stripe recurring subscription. The always-on commitment device (you're already subscribed at 11pm on a Sunday).
- **Scenario fee — $50/person/month** while a ground is ACTIVE. Usage-billed by a monthly cron (`BillingService.chargeScenarioFees`). Starts at `billingActivatedAt`, stops at `resolvedAt`.
- **Session 1 is free.** No card until the paywall — after session 2, when the admin activates the report.

## Getting started

```bash
# 1. API
cd api
cp .env.example .env            # fill in DATABASE_URL, ANTHROPIC_API_KEY, STRIPE_*, RESEND_API_KEY
npm install
npm run prisma:migrate          # create the schema
npm run prisma:seed             # seed + activate the system / report prompts
npm run start:dev               # http://localhost:3000  (Swagger at /api/docs)

# 2. Client
cd ../client
cp .env.example .env
npm install
npm run dev                     # http://localhost:5173

# 3. Marketing (optional)
cd ../marketing
npm install
npm run dev
```

## Build order

The full ground lifecycle is implemented end to end. Each phase is built, builds clean, and has its DI graph verified:

1. ✅ Scaffold, schema, auth, module skeletons
2. ✅ Conversation engine: versioned system + scenario prompts (exact Part 3 wording), staged sequence with runtime context, engine-opens-first, `RecordEntry` extraction. Per-turn intelligence ported from the MVP edge function (`08_final_mvp_gw_chat.html`): Agent 1 intake classification + specificity scoring (`intake.ts`), trust calibration/tone from rolling specificity history, and Agent 3 tiered cross-reference injection (`context.service.ts`) — kept stricter than the MVP: cross-reference derives a signal + probe from the other party's *extracted record* and never passes their verbatim words into the model context.
3. ✅ Report synthesis + simultaneous release, wired via domain events (synthesizes when both finish session 2; releases on activation)
4. ✅ Stripe billing gate: care-fee Checkout, paywall on `activate()` (HTTP 402 → Checkout), scenario-fee charge on activation + monthly cron, webhook status sync
5. ✅ Participant magic-link entry: invite token on the participant, public preview + accept (creates/links a User, drops them into their check-in)
6. ✅ Pattern detection sweep: per-period AI extraction of Part 4 codes, three-period rule with consecutive-period enforcement, analysis on check-in completion + daily backstop cron, admin alignment feed (completeness/status/stalled/surfaced observations — never content)
7. ✅ Resolution + close flow: end states per scenario, two-party confirmation (no unilateral authority — supersede resets confirmations), close → billing stops (status leaves ACTIVE) + outcome recorded for the learning loop + permanent record
8. ✅ Learning loop + prompt versioning: post-resolution fairness feedback (both parties), outcome data point (prompt version + moment + end state + session count), two-view admin dashboard (ground activity incl. session-2 rate; outcome/fairness rate per prompt version), platform-admin prompt-management UI (list / create version with change summary / activate)

See the product master reference for the exact prompts (Part 3), patterns (Part 4), and resolution logic (Part 8).

# Build Truth: The Org and Account Layer

This document traces how organizations and accounts come to exist, what belongs to
an org versus what's shared across the whole platform, and — the part that matters
most for testing — exactly what a cross-org participant and their home org can and
cannot see of each other. Read fresh, cited to file:line. Cross-references
`BUILD_TRUTH_1_ground_loop.md` §2/§2a rather than re-deriving what's already
established there (invite acceptance and the join-link flow both touch account
creation and org placement; this document builds on those, it doesn't repeat them).

Repo root for all paths below: `api/src/...` unless noted otherwise.

---

## 1. How an Organization Is Created

There are five places an `Organization` row gets created, and they're all in
`api/src/modules/auth/auth.service.ts` — no org-creation logic exists outside this
file (`grep -rn "organization.create" api/src` confirms only these five hits):

| # | Path | Trigger |
|---|---|---|
| a | `register()` (`auth.service.ts:52-97`, org created at line 66) | Standard email+password signup form |
| b | `registerMagicLink()` (`auth.service.ts:99-139`, org at ~124) | Passwordless signup variant |
| c | `entrySave()` (`auth.service.ts:241-293`, org at ~254) | The single-email "entry" capture box — new email with no matching user silently gets a placeholder org + admin user + magic link |
| d | `teamInvite()` fallback branch (`auth.service.ts:310`) | Only fires if an org admin invites someone but no `inviterOrganizationId` was passed — creates a standalone org for the invitee as a safety fallback. The normal path (`inviterOrganizationId` present) creates **no** org — the invitee joins the caller's existing org as `MEMBER` |
| e | `findOrCreateGoogleUser()` (`auth.service.ts:415-454`, org at ~429-449) | First-time "Sign in with Google" when no user matches by `googleId` or email |

**The main signup path, exactly** (`register()`, lines 52-97): org and first user are
created in one `$transaction` (lines 65-93) — `tx.organization.create({ data: {
name, slug } })` (66-68) immediately followed by `tx.user.create(...)` (70-80)
referencing the new `organization.id`. If either write fails, both roll back — no
orphaned org or user is possible from this path.

Fields set at creation: only `name` and `slug`. `name` defaults to the capitalized
email domain if `dto.organizationName` wasn't supplied (lines 60-61); `slug` comes
from `generateUniqueSlug(orgName)` (line 62, defined 574-582), which loops
appending `-2`, `-3`, etc. until it finds one not already taken. Everything else on
`Organization` (billing fields, `careFeeStatus`, etc.) takes its Prisma `@default`
(e.g. `careFeeStatus @default(NONE)`, `schema.prisma:168`) — nothing else is set
explicitly at creation.

**The first user's role is hardcoded `ADMIN`** at `auth.service.ts:77`, with the
inline comment "the person who opens the workspace is its admin" — same hardcoding
recurs at lines 124, 256, 443 for paths b/c/e. Only `teamInvite()`'s invitee gets
`MEMBER` (line 314), since they're joining an org that already has an admin.

**Can a `User` exist without an `Organization`?** No.
`organizationId String @map("organization_id")` (`schema.prisma:199`) has no `?` —
non-nullable — and the relation uses `onDelete: Restrict` (line 221), meaning an
org can't even be deleted while it still has users. Every creation path above
resolves an `organizationId` before the user row is written, so this is never
violated.

**`SetupPage.tsx` is not org creation — it updates the placeholder org in place.**
`client/src/pages/setup/SetupPage.tsx:39-52` calls `authApi.updateProfile({
jobTitle, orgName, orgSlug })`, which hits `AuthService.updateProfile()`
(`auth.service.ts:521-547`). That method does `organization.update({ where: { id:
user.organizationId }, ... })` (line 543) — it never calls `.create`. This confirms
the person already has a placeholder org (auto-created by whichever of paths a/c/e
onboarded them — typically `entrySave` or Google sign-in) and SetupPage is where
they name their real org and set its code, optionally inviting teammates via
`teamInvite()` in the same flow (`SetupPage.tsx:54-59, 88-97`).

**What `slug` is for.** It's the user-facing "org code" (`getProfile()` returns it
as `orgCode`, `auth.service.ts:479`). Uniqueness is enforced at the DB level
(`slug String @unique`, `schema.prisma:163`) and pre-checked by
`generateUniqueSlug()` at creation, or manually in `updateProfile()`
(lines 535-537, throws `ConflictException('Org code already taken')` if the
desired slug belongs to a different org).

---

## 2. How a Person Gets an Account

**Every distinct way a `User` row gets created**, all in `auth.controller.ts` /
`auth.service.ts` unless noted:

| Entry point | File:line | Self-service or invite-gated | Requires |
|---|---|---|---|
| `POST /auth/register` | `auth.controller.ts:19-26` → `auth.service.ts:52-97` | **Self-service, no invite** | email + password + name; new org, `role: ADMIN`; blocked from login until `EMAIL_VERIFICATION` token used |
| `POST /auth/register-magic-link` | `auth.controller.ts:29-36` → `auth.service.ts:99-139` | **Self-service, no invite** | email only, no password (`passwordHash: null`); new org, `role: ADMIN` |
| `POST /auth/entry-save` | `auth.controller.ts:172-178` → `auth.service.ts:241-293` | **Self-service, no invite** | email only; new org + `role: ADMIN` if the email is unseen (lines 253-265); if the user already exists, just re-sends a magic link, no new row (266-289) |
| `POST /auth/team-invite` | `auth.controller.ts:188-196` → `auth.service.ts:295-338` | **Invite-only** — requires an authenticated caller (no `@Public()`) | invitee email only; new `User` (`role: MEMBER`) created in the **caller's own org** if unseen (305-319, 7-day `PASSWORD_SETUP` token), or just a sign-in link if they already exist (324-334) |
| Google OAuth first login | `auth.controller.ts:130-144` → `auth.service.ts:415-454` | **Self-service, no invite** | Google profile only; new org + `role: ADMIN`, `isEmailVerified: true` if no match by `googleId` or email (429-449) |
| `POST /auth/member-signin` | `auth.controller.ts:81-88` → `auth.service.ts:340-366` | Not creation | only sends a sign-in link to an **existing** user; silent no-op if the email doesn't match anyone (343-344) |
| `POST /auth/set-password` | `auth.controller.ts:60-68` → `auth.service.ts:198-215` | Not creation, activation | consumes a `PASSWORD_SETUP` token to set a password on an existing row |

Outside this file, `User` rows are also created by `participants.service.ts:60`
(invite-accept, traced in `BUILD_TRUTH_1` §2), `entry.service.ts:866` (join-link,
traced in `BUILD_TRUTH_1` §2a), and `grounds.service.ts`/`users.service.ts` team-add
paths — all ground/participant-driven, not the auth-level story this section is
about.

**Is cold self-signup — a total stranger, zero invite — actually possible?** Yes,
unambiguously. `register()` has no invite/token check of any kind (lines 52-97) —
it only checks whether the email is taken (57-58); `organizationName` is freeform
text with no lookup against any real org (line 61). The same is true for
`registerMagicLink()`, `entrySave()`, and first-time Google sign-in — all four
create a fresh org and an `ADMIN` user with zero pre-existing-record requirement.
**This product is not invite-only at the org level.** A stranger can walk in cold
via any of four different doors and each one mints them their own new organization
as its sole admin. Invite-gated creation (`teamInvite`, and the ground/participant
paths from `BUILD_TRUTH_1`) is a *second*, separate mechanism for adding someone to
an *existing* org — it is not the only way in.

**Google OAuth in detail.** `google.strategy.ts:17-31` extracts `googleId`, `email`,
`firstName`, `lastName` from the profile — no invite context passes through
Passport at all. `findOrCreateGoogleUser` looks up by `googleId` first, then by
email (linking Google to an existing password account if found, lines 422-428),
and only creates new if neither matches. The controller reports `isNewUser` back
via a `new=` query param purely for client-side onboarding-state cosmetics — the
account already exists server-side by that point.

**`team-invite` — who can call it.** Any authenticated user, not just admins —
there is no role check in the controller or in `teamInvite()` itself (auth.controller.ts:188-196, auth.service.ts:295-338).
**UNCLEAR** whether this is intentional (any team member can grow the org) or a
gap — nothing in comments or the DTO states an intended restriction.

**Password vs. magic-link, by path.** Set immediately only by `register()` (lines
63, 74). Deferred (no `passwordHash`, later `PASSWORD_SETUP` token) for
`registerMagicLink()`, `entrySave()`'s new-user branch, `teamInvite()`'s new-user
branch, and Google OAuth new users. **No OTP mechanism exists anywhere** in this
file — every passwordless flow is a long random-hex token (`crypto.randomBytes(32)`)
embedded in an emailed link, never a short typed code.

---

## 3. What an Org Contains, and What's Scoped vs. Shared

**Models with a direct `organizationId`:**

| Model | Line(s) | Nullable? | What it is |
|---|---|---|---|
| `User` | `:199`, index `:231` | Required | every account; `onDelete: Restrict` |
| `Ground` | `:271`, index `:329` | Required | the core unit; `onDelete: Cascade` |
| `OrgIntelligence` | `:628` | **Optional** | anonymised pattern summaries; `onDelete: SetNull` |
| `BillingEvent` | `:653`, index `:667` | Required | invoices/charges; `onDelete: Cascade` |
| `ContributorCode` | `:673`, index `:694` | Required | free-session access codes; `onDelete: Cascade` |
| `UsageEvent` | `:797`, index `:805` | **Optional**, no FK relation declared | append-only audit log — survives org deletion by design (no `onDelete` behavior to break) |

**Scoped only indirectly, via `groundId`** (no `organizationId` field of their own):
`GroundParticipant` (`:334`), `Report` (`:458`), `CheckIn` (`:387`), `RecordEntry`
(`:435`), `ConversationTurn` (`:421`), `PatternDetection` (`:507`), `Resolution`
(`:537`), `Outcome` (`:591`), `OutcomeFeedback` (`:610`), `GroundDocument` (`:713`),
`DisclaimerAcknowledgement` (`:735`), `ReportActivation` (`:760`),
`ParticipantRequest` (`:487`), `ContributorCodeRedemption` (`:698`). To know which
org any of these belongs to, you must join through `Ground.organizationId` — a
`Report`, for instance, does not carry its org anywhere on itself.

**Genuinely global / shared across every org:**

| Model | Evidence it's global |
|---|---|
| `PromptVersion` (`:574`) | No `organizationId` field at all; every query across `prompts.service.ts` and `intelligence.service.ts` filters only by `key`/`id`/`isActive`, never by org. One shared prompt library for the whole platform. |
| `PatternBenchmark` (`:638`) | No `organizationId` field; **zero query usage anywhere in `api/src`** — the model exists in schema but is currently unused/unpopulated. |
| `OutcomeFeedback` (`:610`) | No `organizationId`; every query filters by `groundId`/`participantId` — this is the raw learning-loop feed, aggregated cross-org for prompt-quality analysis, not siloed per org. |
| `PlatformSetting` (`:823-830`) | Single-row-per-`key` singleton, comment states explicitly "Not org-scoped... single row per key, not one per organization" (818-820); `WhatsAppService` queries it by `key` alone. |

**`OrgIntelligence`'s optional org attribution** (`:628`, `String?`, `onDelete:
SetNull`) is a middle case: rows can carry an org pointer for org-specific pattern
trends, but the relation is built to null out gracefully (e.g. on org deletion)
while the anonymised aggregate (`anonymised Boolean @default(true)`, line 630)
survives. So some rows are org-attributed, others are fully org-less aggregate
data once `organizationId` is null.

**`User.organizationId` is required — one org at a time, no multi-org membership.**
Confirmed by the non-nullable field plus `onDelete: Restrict`; there is no join
table anywhere in the schema that would allow a user to belong to more than one
org simultaneously. (This is exactly why the cross-org participant case in §4
below works the way it does — a person can only ever have *one* `organizationId`,
so participating in someone else's ground can never change it, only add a
separate link.)

**UNCLEAR**: whether `UsageEvent.organizationId` being optional with no declared
relation is intentional (event survives org deletion, by design) or simply never
tightened up — the schema doesn't state a rationale for it the way it does for
`PlatformSetting`.

---

## 4. The Cross-Org Case: What Each Side Can and Cannot See

Recall from `BUILD_TRUTH_1` §2/§2a: when a participant with an existing account
from a *different* org accepts a ground invite or joins via a join-link, their
`User.organizationId` is never touched — only a `GroundParticipant` row links them
to the ground (`participants.service.ts:75-77`, comment: *"user keeps their home
org... only the participant record is linked here"*). Given §3 above confirms a
user can only ever have one `organizationId`, this is the only way a cross-org
relationship can exist at all — there's no multi-membership mechanism, just a
separate link table (`GroundParticipant`) pointing at someone else's `Ground`.

**From the ground's org side — can they see the participant's home org or other
activity?** No. `getOrgRoster(organizationId)`
(`modules/grounds/grounds.service.ts:361-380`) queries
`ground.findMany({ where: { organizationId } })` (line 363) — strictly the
requesting org's own grounds, no OR clause reaching into anyone else's. The
`participants` sub-select on each ground (lines 369-377) returns only `email,
partyType, roleAsDescribed, userId (as accepted flag), checkIns` — there is no
`participant.user` relation traversal into that person's own org, and no query
into their other grounds. A cross-org participant shows up in this org's roster
only as an email/role/check-in-history row scoped to *this* ground; their home org
and any activity outside it are structurally absent from the query, not merely
hidden in the response shape.

**From the participant's home-org side — do their own colleagues see this
ground?** No. `GroundsService.list()` (`grounds.service.ts:418-491`) builds two
separate result sets: `orgGroundWhere`, scoped strictly by `organizationId`
(lines 426-434) — this is what an org-mate or admin calling `list()` for the home
org would get, and it never includes a ground belonging to another org — and
`participantGrounds` (lines 446-474), fetched via `groundParticipant.findMany({
where: { userId, ground: { organizationId: { not: organizationId } } } })`
(line 460) — explicitly scoped by **`userId`**, not `organizationId`. Because this
second set is keyed to the specific individual, only that one person sees the
external ground in their own `list()` call. Their colleagues and admin, calling
the same method for the home org, get no matching rows at all. **Confirmed: no
visibility for the participant's own colleagues into a ground they're
contributing to elsewhere.**

**The participant's own unified view.** `list()` returns `[...orgGrounds,
...participantGrounds]` (lines 476-490) — a concatenation, not a database-level
OR, but functionally a union from the client's perspective: one "my grounds" list
containing both their home-org grounds and any external ground they're personally
linked to as a participant.

**Billing — which org pays.** Ground creation is gated by
`billing.canCreateGround(organizationId, dto.accessCode)`
(`grounds.service.ts:72-78`) where `organizationId` is the *initiator's* org
(`grounds.controller.ts:68-69`, from the initiator's own JWT). `BillingEvent` rows
take their `organizationId` from Stripe checkout-session metadata
(`billing.service.ts:588`), itself set from the ground's org at checkout-session
creation (`billing.service.ts:174`). No code path ever bills a participant's home
org for a ground that belongs to someone else's org.

**Authorization on a specific ground — `get()`, exactly.**
`get(id, organizationId, requestingUserId)` (`grounds.service.ts:493-531`) tries
the org-scoped lookup first: `findFirst({ where: { id, organizationId } })`
(497-510) — this succeeds for the ground's own org members and the initiator, and
fails (`null`) for anyone outside that org, including the cross-org participant
themselves (their JWT carries their *home* org, which won't match). On that
failure, if a `requestingUserId` is present, the code falls back
(lines 513-529) to `groundParticipant.findFirst({ where: { groundId: id, userId }
})` — purely a participant-membership check, **no `organizationId` comparison at
all** — and if that link exists, re-fetches the full ground by `id` alone. This is
the precise mechanism: the JWT's home-org id is tried first and fails for an
external ground, then a participant-row existence check becomes the sole
authorization gate for that specific fallback path.

**Confirmed exact, not approximate: there is no difference at all.** Both branches
of `get()` use the literal same `include` block —
`SAFE_PARTICIPANT_SELECT` (line 500 vs. line 519, same constant, same fields:
`id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt,
soloArtifactAt, soloArtifactShared, createdAt`, defined at lines 46-57), the same
`CHECKIN_SELECT`, the same `report`/`resolution`/`patternDetections` selects, and
every line of post-processing after the branch (535-624 — confidence, daysLeft,
brief, signals, `sharedSoloReport` for anyone who opted in, org billing fields,
`sessionProgress`) is unconditional shared code with no branch-dependent logic.
The controller (`grounds.controller.ts:60-64`) passes the result straight through
with no further filtering. A cross-org participant sees exactly what an
org-internal member sees — every other participant's email and role, included.

### PRODUCT DECISION (not yet built — capturing intent, not a bug report)

**Decision**: this becomes initiator-controlled, not automatic. The person who
sets up the ground decides what cross-org/external participants can see of other
members — at minimum, whether they see emails versus just names and roles.
**As of this document, no such control exists.** Every participant, cross-org or
not, gets full visibility today, with no way to restrict it — this is a gap to
build, not a bug to patch reactively.

**Open sub-questions, unresolved, needed before building this:**

- **Scope of the setting — per-ground or per-participant?** Does the initiator
  set one visibility level for the whole ground (e.g. "external contributors see
  names and roles only"), or can it vary participant by participant (e.g. this
  specific cross-org contributor is more restricted than another)? Per-ground is
  simpler to build and reason about; per-participant is more precise but adds a
  real config surface the initiator has to manage correctly.
- **Default when unset** — **recommend the more private default**: if the
  initiator never touches this setting, cross-org participants should see names
  and roles only, not email addresses, until the initiator explicitly opens it
  up. Defaulting to full visibility (today's actual behavior) means every
  existing and future ground is wide open unless someone remembers to lock it
  down — the safer failure mode is the reverse.
- **Who does it apply to — all participants, or only cross-org ones?** Does this
  restriction apply uniformly to everyone on the ground (including people from
  the initiator's own org), or specifically to participants whose
  `organizationId` differs from the ground's? The cross-org case is the one this
  document surfaced, but it's worth deciding explicitly whether same-org
  participants get the same treatment or are exempt by default.

None of this is built. This section exists so the decision and its open questions
are on record before any code changes, not as a spec to implement from yet.

---

## Summary of open UNCLEARs

- Whether `team-invite`'s lack of a role/admin guard is intentional (any team
  member can add teammates) or a gap.
- Whether `UsageEvent.organizationId` being optional with no declared relation is
  deliberate design or simply never tightened.

**Resolved into a product decision, not left as an UNCLEAR:** cross-org
participant visibility into other members' emails/roles (§4) — confirmed as a
real, exact behavior (not approximate), and captured as a PRODUCT DECISION above
rather than a bug: visibility should become initiator-controlled, defaulting to
the more private option, with scope (per-ground vs. per-participant) and
applicability (all participants vs. cross-org only) still open. Not built yet.

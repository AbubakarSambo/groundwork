# Build Truth: User Types

This document traces every distinct way Groundwork classifies a user — org role,
platform admin flag, and ground-level party type — and confirms how they relate
(or don't) to each other. Read fresh, cited to file:line. Cross-references
`BUILD_TRUTH_1_ground_loop.md` (INITIATOR/PARTICIPANT already established there)
and `BUILD_TRUTH_2_org_accounts.md` (org creation, `User.organizationId`) rather
than re-deriving them.

Repo root for all paths below: `api/src/...` unless noted otherwise.

---

## 1. Org-Level Role: ADMIN vs MEMBER

**The enum** (`api/prisma/schema.prisma:18-21`):

```prisma
enum UserRole {
  ADMIN  // manages grounds, billing activation, sees the alignment feed
  MEMBER // a regular person who checks in
}
```

Two values only, mirrored in `api/src/common/decorators/roles.decorator.ts:3-6`
with identical wording.

**Every `@Roles(Role.ADMIN)` gate found across the codebase:**

| Route | Restricts |
|---|---|
| `GET /grounds/org-roster` (`grounds.controller.ts:53-54`) | Org-wide roster of every ground, lead, member, role, alignment status |
| `POST /grounds/for-lead` (`:72-73`) | Admin creates a ground and assigns someone else as lead (see §3) |
| `POST /grounds/:id/activate` (`:91-92`) | Activates a ground, starts billing |
| `GET /alignment-feed` (`alignment.controller.ts:12-13`) | Admin alignment feed |
| `GET /alignment/narrative` (`:26-27`) | AI narrative briefing on org alignment state |
| `GET /intelligence/dashboard` (`intelligence.controller.ts:65-66`) | Admin dashboard of activity/outcome rates |
| `GET /patterns/accuracy` (`patterns.controller.ts:12-13`) | Pattern-detection accuracy summary |
| `PATCH /patterns/:id/rate` (`:19-20`) | Rate a surfaced pattern detection's accuracy |
| `GET /users/privacy-audit` (`users.controller.ts:20-21`) | Privacy audit diagnostic |
| `GET /users`, `GET /users/:id` (`:41-42, 48-49`) | List/view org users |
| `POST /users` (`:55-56`) | Invite a user to the org |
| `PATCH /users/:id` (`:63-64`) | Update a user — including their **role** |
| `POST /users/:id/resend-invite` (`:70-71`) | Resend a pending invite |
| `DELETE /users/:id` (`:77-78`) | Deactivate a user |
| `POST /grounds/:groundId/report/generate` (`reports.controller.ts:22-23`) | Manually trigger/retry report synthesis |
| `POST /grounds/:groundId/report/release` (`:29-30`) | Release report to all parties |
| All of `billing.controller.ts`'s account/subscription/session/code management routes | Cancel account, subscriptions, purchase sessions, contributor codes, customer portal (full list: lines 26-27, 34-35, 44-46, 55-57, 63-65, 71-73, 79-81, 87-89, 98-100, 146-148, 158-160, 169-171, 188-190, 204-205) |

**Not gated by `@Roles` at all** (open to both ADMIN and MEMBER): creating your
own ground (`POST /grounds`), viewing a ground you're party to, adding a
participant to your own ground, submitting outcome feedback, activating/viewing
your own report, and `POST /users/me/leave` (self-deactivation only,
`users.controller.ts:13-18`).

One route worth flagging: `billing.controller.ts:109-111,129-130` gate
contributor-code creation/email-send with `PlatformAdminGuard` instead of
`@Roles` (a different tier entirely — see §2).

`GET /billing/admin/stats` (`billing.controller.ts:196-201`) — **verified, not a
security hole, but a real pattern-consistency finding.** The route carries no
`@Roles` and no `@UseGuards` at all, and `BillingController` has no class-level
guard either (`billing.controller.ts:8-16`) — at the controller/route-decorator
level this route is indistinguishable from an unguarded one. The protection
exists, but it's been moved into the service layer instead:
`getPlatformAdminStats()` (`billing.service.ts:818-820`) does
`if (!caller?.isPlatformAdmin) throw new ForbiddenException(...)` before
touching any data. So no unauthorized caller can actually retrieve cross-org
stats today — but every other platform-admin route in the codebase enforces
this declaratively via `PlatformAdminGuard` at the controller/route level
(`admin.controller.ts:59`), checked before the handler runs and visible at a
glance. This one route does the identical check imperatively, buried in the
service — invisible from the controller, and the only one of its kind. **Not a
live vulnerability; a code-audit finding**: inconsistent enforcement pattern
that reads as unguarded on inspection (this document's own first draft made
exactly that misreading before the service-layer check was traced) and would
become a real hole the moment someone refactors `getPlatformAdminStats()`
without noticing the check needs to move with it. Recommend adding
`@UseGuards(PlatformAdminGuard)` to this route for consistency, even though the
service-layer check currently makes it redundant.

**How the guard actually works.** `RolesGuard`
(`api/src/common/guards/roles.guard.ts:9-34`) reads required roles via
`Reflector.getAllAndOverride` (lines 10-13); if a route carries no `@Roles`
metadata, the guard passes it through unchecked (lines 15-17) — routes are
unguarded by default, not admin-only by default. Where roles are required, it
checks `requiredRoles.some(role => user.role === role)` (line 25) and throws
`ForbiddenException('This action requires one of the following roles: ADMIN')`
(403) on mismatch, or `ForbiddenException('User not found')` if there's no
`user` on the request at all (lines 21-22). Both `JwtAuthGuard` and `RolesGuard`
are registered globally as `APP_GUARD` providers (`app.module.ts:51-53`), so
every route passes through this guard — only routes with `@Roles(...)` metadata
actually enforce anything.

**Who can change a user's role.** Only `PATCH /users/:id`
(`users.controller.ts:63-68`, itself `@Roles(Role.ADMIN)`) can touch `role`.
`UsersService.update()` (`users.service.ts:76-96`) writes it directly
(`...(dto.role && { role: dto.role as any })`, line 91) with **no additional
check** preventing an admin from changing their own role, another admin's role,
or removing the last admin from an org. New users default to `MEMBER`
(`CreateUserDto`) unless the inviting admin explicitly sets `role: ADMIN`, and
inviting itself is admin-gated. **A MEMBER cannot self-promote — this is
confirmed, not assumed.**

**UNCLEAR**: no "last admin" safeguard exists in `update()` — an org could end
up with zero admins if the sole admin demotes themselves or is demoted, with
nothing in the code preventing it.

---

## 2. Platform Admin: A Separate, Higher Tier

**`isPlatformAdmin`** is a plain boolean on `User`, default `false`
(`schema.prisma:208`), stored in its own column — **not derived from or
synchronized with `role`.** An org `ADMIN` is `isPlatformAdmin: false` by
default; being platform admin has nothing to do with which org you belong to or
your standing within it. These are two fully independent flags on the same row.

**`PlatformAdminGuard`**, in full
(`api/src/common/guards/platform-admin.guard.ts:1-16`):

```ts
canActivate(context: ExecutionContext): boolean {
  const { user } = context.switchToHttp().getRequest();
  if (!user?.isPlatformAdmin) {
    throw new ForbiddenException('Platform admin access required');
  }
  return true;
}
```

A single truthy check on `user.isPlatformAdmin`, no fallback to `role` — an org
ADMIN who isn't a platform admin fails this exactly like a MEMBER would (403,
"Platform admin access required"). Org-admin status confers zero platform-admin
privilege.

**Every route behind it**: applied once, at the controller level
(`admin.controller.ts:59`, `@UseGuards(PlatformAdminGuard)` on the whole
`AdminController`) — no other controller references this guard directly.

| Route | Purpose | Extra guard |
|---|---|---|
| `GET /admin/whatsapp` | WhatsApp integration status | — |
| `PATCH /admin/whatsapp` | Toggle WhatsApp platform-wide | — |
| `GET /admin/stats` | Platform-wide stats across all orgs | — |
| `GET /admin/codes`, `GET /admin/codes/:codeId` | All contributor codes / usage detail across all orgs | — |
| `GET /admin/feedback` | All outcome feedback across all orgs | — |
| `GET /admin/usage` | Per-user/per-org usage patterns | — |
| `POST /admin/otp/request` | Generate a 6-digit admin OTP (10-min TTL) | — |
| `PATCH /admin/codes/:codeId/disable` | Disable a contributor code | `OtpGuard` |
| `POST /admin/add-admin` | Promote a user to platform admin | `OtpGuard` |

Two other modules do ad hoc `isPlatformAdmin` checks in service code rather than
via this guard: `billing.service.ts:358-365` (who can create contributor codes:
platform admin, or org-admin-with-`allowCodeCreation`) and `billing.service.ts:819-820`
(throws unless caller is a platform admin) — the same tier bleeding into billing
logic outside the `/admin` controller.

**Becoming a platform admin.** `addPlatformAdmin()`
(`admin.service.ts:191-200`) sets `isPlatformAdmin: true` by email, with no
authorization logic of its own — access control is entirely delegated to the
route, which sits behind both `PlatformAdminGuard` (controller-level) and
`OtpGuard` (route-level). **Only an existing platform admin, holding a valid
OTP, can promote someone else.**

**UNCLEAR — the bootstrap problem, confirmed as a real gap, not just
undocumented.** A repo-wide search for `isPlatformAdmin: true`/`=true` finds only
three call sites: `addPlatformAdmin()` itself, its controller docstring, and
read-only selects elsewhere. Neither `api/prisma/seed.ts` nor
`seed-contributor-codes.ts` sets this flag. There is no migration backfill and no
bootstrap CLI. **As it stands, the only way to produce the first platform admin
at all is a manual, out-of-band database edit** (direct SQL update or Prisma
Studio) — nothing in this codebase automates or documents that step.

**The OTP double-gate.** For the two destructive routes, `PlatformAdminGuard`
(controller-level) and `OtpGuard` (route-level, `admin.controller.ts:26-45`)
stack via normal Nest guard composition — the platform-admin check runs first for
every request to the controller, then the OTP check runs additionally for
`disable`/`add-admin`. `OtpGuard` requires an `X-Admin-OTP` header, verified
against a hashed, single-use, 10-minute-TTL code stored via
`AdminService.verifyOtpForAdmin`. Net effect: being a platform admin is
necessary but not sufficient for these two operations — a fresh OTP is required
too, giving destructive platform-level actions a lightweight two-factor-style
confirmation on top of the tier check itself.

---

## 3. Two Independent Axes: Org Role vs. Ground Role

Established in `BUILD_TRUTH_1` §1: any authenticated user, any org role, can call
`POST /grounds` and become that ground's `PartyType.INITIATOR`. This section
confirms precisely why, and adds a fourth axis.

**Org role and ground party type are unenforced against each other.** `POST
/grounds` (`grounds.controller.ts:66-70`) carries no `@Roles` decorator at all —
contrast with `getOrgRoster`, `for-lead`, and `activate`, which do. Inside
`create()` (`grounds.service.ts:72-178`), the only gate is a billing check
(line 75); nothing reads `initiator.role`. The initiator's `GroundParticipant`
row is created unconditionally with `partyType: INITIATOR` (lines 130-138). **A
plain MEMBER becomes an INITIATOR on their own ground exactly like an ADMIN
would — confirmed, no code-level correlation exists.**

**The third flag — `createdByUserId` and the for-lead flow.**
`Ground.createdByUserId` (`schema.prisma:288`, nullable): "the admin who set
this up for a lead; null for self-serve grounds." `POST /grounds/for-lead`
(`grounds.controller.ts:72-77`, `@Roles(Role.ADMIN)`) calls `createForLead()`
(`grounds.service.ts:190-284`). Critically: the ground's `initiatorId` is set to
the **lead**, not the calling admin (line 205: `initiatorId: leadUser.id`), while
`createdByUserId: adminUserId` (line 206) separately records who set it up. The
lead gets the `GroundParticipant` row with `partyType: INITIATOR` (lines
226-228); **the admin who ran this flow gets no `GroundParticipant` row at
all** — they exist on this ground only as `createdByUserId` metadata (surfaced
later as `createdByAdmin: g.createdByUserId != null` in `getOrgRoster`, line
394). The ground sits in `GroundStatus.AWAITING_LEAD` until the lead — never the
admin — calls `confirmLead()` (lines 288-315, gated on
`ground.initiatorId !== requestingUserId`, line 291).

**One person, multiple simultaneous roles — confirmed, nothing prevents it.**
`GroundParticipant` rows are scoped per-`groundId`, not globally unique per
user. A MEMBER can hold `INITIATOR` on their own ground while separately being a
`PARTICIPANT` (added via `addParticipant()`) on someone else's — and
`list()`'s explicit union of org-scoped and participant-scoped grounds
(`grounds.service.ts:418-491`, traced fully in `BUILD_TRUTH_2` §4) is built
assuming exactly this: one person, initiator somewhere, participant elsewhere,
in the same account.

**`isPlatformAdmin` never touches grounds/reports.** Confirmed by grep: this
flag and `PlatformAdminGuard` appear only in `admin.controller.ts`,
`feedback.controller.ts`, `billing.controller.ts`, `prompts.controller.ts`, and
one business-logic branch in `billing.service.ts` — never in
`grounds.controller.ts`, `grounds.service.ts`, `reports.service.ts`, or
`participant-requests.controller.ts`. Grounds/reports access is governed solely
by org-role `@Roles` gates and ground-membership checks (`initiatorId ===
userId`, or a `GroundParticipant` row existing) — never by platform-admin
status.

**Four independent axes, no cross-enforcement found anywhere:**

| Axis | Values | Defined at | Enforced against the others? |
|---|---|---|---|
| Org role | `ADMIN` / `MEMBER` | `User.role` | No — gates specific admin-only routes, doesn't constrain ground party type |
| Platform admin flag | boolean | `User.isPlatformAdmin` | No — scoped entirely to platform-infra surfaces, absent from grounds/reports |
| Ground party type | `INITIATOR` / `PARTICIPANT` | `GroundParticipant.partyType` | No — per-ground, freely combinable across any number of grounds for one user |
| Created-for-lead marker | `Ground.createdByUserId` (nullable) | `Ground` | No — pure provenance metadata, doesn't grant the admin party status |

**UNCLEAR**: whether this total lack of cross-axis correlation is a deliberate
design stance (the product reads as intentionally role-agnostic — "any
authenticated user can open a ground") or simply never tightened. Nothing in
code comments states the rationale beyond `createForLead`'s own docstring
explaining the lead-becomes-initiator mechanic specifically.

---

## Summary of open UNCLEARs

**Resolved into a code-audit finding, not left as an UNCLEAR:** `GET
/billing/admin/stats` (§1) — verified the route itself carries no guard
decorator, but `getPlatformAdminStats()` does check `isPlatformAdmin` in the
service layer before returning data, so this is **not a live vulnerability**.
It is a real audit finding: the only platform-admin route in the codebase that
enforces its access check imperatively instead of via `PlatformAdminGuard`,
making it read as unguarded on inspection and fragile to a future refactor that
moves or removes the service-layer check without noticing. Flagged for the code
audit with a recommended fix (add `@UseGuards(PlatformAdminGuard)` for
consistency).

- No "last admin" safeguard exists on `PATCH /users/:id` — an org can end up
  with zero admins with nothing in the code preventing it.
- **The platform-admin bootstrap gap is real, not just undocumented**: there is
  no seed, migration, or CLI path that creates the first platform admin — only
  a manual, out-of-band database edit can do it today.
- Whether the complete absence of cross-enforcement between org role, platform
  admin, and ground party type is an intentional "role-agnostic by design"
  stance or simply never tightened — worth a product decision, same shape as
  the cross-org visibility decision captured in `BUILD_TRUTH_2` §4.

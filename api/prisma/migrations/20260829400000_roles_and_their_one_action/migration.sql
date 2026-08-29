-- A role as a record, and the one action it turns on.
--
-- `neglected_primary` is the last detector in the spec that was never built, and the reason is
-- here: a role was only ever a name on an assignment, so there was nowhere to say what the role's
-- hardest action is or how often it is due. See NEEDS_ROLES in one-vocabulary-two-scopes.ts.

CREATE TYPE "ActionCadence" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY');

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primary_action_key" TEXT,
    "primary_action_name" TEXT,
    "primary_action_cadence" "ActionCadence",
    "external_id" TEXT,
    "source_system" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_organization_id_key_key" ON "roles"("organization_id", "key");
CREATE INDEX "roles_organization_id_idx" ON "roles"("organization_id");

ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One occurrence of a primary action. The act happens in the customer's world, so we are told
-- about it rather than observing it.
CREATE TABLE "primary_action_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "action_key" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "source_ref" TEXT,
    "source_system" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "primary_action_events_pkey" PRIMARY KEY ("id")
);

-- Their id for the occurrence, so the same push twice is one event. NULLs are distinct in Postgres,
-- which is the behaviour wanted here: an event pushed without an id of its own cannot be deduped
-- and should not collide with every other one that also has none.
--
-- The index names are Prisma's, truncated to 63 characters exactly as it truncates them. Writing
-- the readable names instead is drift, and `prisma migrate diff --exit-code` fails the build on it.
CREATE UNIQUE INDEX "primary_action_events_organization_id_source_system_externa_key"
    ON "primary_action_events"("organization_id", "source_system", "external_id");
CREATE INDEX "primary_action_events_organization_id_person_external_id_ac_idx"
    ON "primary_action_events"("organization_id", "person_external_id", "action_key", "occurred_at");

ALTER TABLE "primary_action_events" ADD CONSTRAINT "primary_action_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

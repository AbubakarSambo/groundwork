-- The customer's roster, as their identity system describes it.
--
-- Deliberately not the users table: a User here is an account with a password hash and a globally
-- unique email, and provisioning into it would give every person an HRIS knows about an account
-- they never asked for. This is the roster; linked_user_id is where the two meet if they sign in.
--
-- Nothing is ever hard deleted. A leaver is active=false with deactivated_at stamped, because the
-- work history belongs to the organisation even when the person has gone.

CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "display_name" TEXT,
    "given_name" TEXT,
    "family_name" TEXT,
    "email" TEXT,
    "title" TEXT,
    "department" TEXT,
    "timezone" TEXT,
    "manager_external_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "linked_user_id" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "people_organization_id_source_system_external_id_key"
    ON "people"("organization_id", "source_system", "external_id");
CREATE INDEX "people_organization_id_active_idx" ON "people"("organization_id", "active");
CREATE INDEX "people_organization_id_manager_external_id_idx" ON "people"("organization_id", "manager_external_id");

ALTER TABLE "people" ADD CONSTRAINT "people_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

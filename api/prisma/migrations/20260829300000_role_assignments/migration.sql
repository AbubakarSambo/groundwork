-- Who held a role and when they stopped. No role table exists yet, so the role is held by the name
-- the organisation already uses - the same way roleAsDescribed does on a participant.
CREATE TABLE "role_assignments" (
  "id"                        TEXT NOT NULL,
  "organization_id"           TEXT NOT NULL,
  "person_external_id"        TEXT NOT NULL,
  "role_name"                 TEXT NOT NULL,
  "started_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at"                  TIMESTAMP(3),
  "predecessor_assignment_id" TEXT,
  "handover_ready_at"         TIMESTAMP(3),
  "handover_brief"            JSONB,
  "created_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                TIMESTAMP(3) NOT NULL,
  CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- One successor per assignment. A role handed to two people at once is a mistake somebody made in
-- an integration, and it must fail at the write rather than produce two briefs from one departure.
CREATE UNIQUE INDEX "role_assignments_predecessor_assignment_id_key"
  ON "role_assignments" ("predecessor_assignment_id");

CREATE INDEX "role_assignments_org_person_idx" ON "role_assignments" ("organization_id", "person_external_id");
CREATE INDEX "role_assignments_org_role_ended_idx" ON "role_assignments" ("organization_id", "role_name", "ended_at");

ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SET NULL rather than CASCADE: deleting an old assignment must not delete the successor's record
-- of the role along with it.
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_predecessor_assignment_id_fkey"
  FOREIGN KEY ("predecessor_assignment_id") REFERENCES "role_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "retention_policies" (
  "id"                  TEXT NOT NULL,
  "organization_id"     TEXT NOT NULL,
  "turn_retention_days" INTEGER NOT NULL DEFAULT 180,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "retention_policies_organization_id_key" ON "retention_policies" ("organization_id");

CREATE TABLE "departure_records" (
  "id"                 TEXT NOT NULL,
  "organization_id"    TEXT NOT NULL,
  "person_external_id" TEXT NOT NULL,
  "departed_at"        TIMESTAMP(3) NOT NULL,
  "turns_deleted_at"   TIMESTAMP(3),
  "commitments_closed" INTEGER NOT NULL DEFAULT 0,
  "blockers_closed"    INTEGER NOT NULL DEFAULT 0,
  "findings_collapsed" INTEGER NOT NULL DEFAULT 0,
  "turns_deleted"      INTEGER NOT NULL DEFAULT 0,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "departure_records_pkey" PRIMARY KEY ("id")
);
-- One record per departure. Somebody who leaves, returns and leaves again gets two, which is right.
CREATE UNIQUE INDEX "departure_records_org_person_departed_key"
  ON "departure_records" ("organization_id", "person_external_id", "departed_at");
-- The sweep asks for departures whose window has closed and whose turns are still here.
CREATE INDEX "departure_records_org_deleted_idx" ON "departure_records" ("organization_id", "turns_deleted_at");

ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departure_records" ADD CONSTRAINT "departure_records_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
